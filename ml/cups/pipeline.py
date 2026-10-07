"""Recording -> sampled frames -> reviewed instances -> grouped COCO -> training -> ONNX.

Training images, annotations, credentials and checkpoints stay outside the repository.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import random
import shutil
import subprocess
import time


def write_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(json.dumps(value, indent=2) + '\n')
    temporary.replace(path)


def digest(path):
    with open(path, 'rb') as file:
        return hashlib.file_digest(file, 'sha256').hexdigest()


def collect(args):
    """Only completed footage is collected, through read-only SSH/database/storage calls."""
    import boto3
    root = Path(args.output).resolve()
    root.mkdir(parents=True, exist_ok=True)
    if not args.group.isalnum() or not 1 <= args.limit <= 500 or args.per_session < 1:
        raise ValueError('Invalid group code or limit')
    limit = '' if args.all else f' LIMIT {args.limit}'
    query = ("BEGIN READ ONLY; SELECT row_to_json(r) FROM (SELECT c.* FROM camera_recordings c "
             "JOIN groups g ON g.id=c.group_id WHERE c.uploaded_at IS NOT NULL "
             f"AND g.invite_code='{args.group}' ORDER BY c.started_at DESC{limit}) r; ROLLBACK;")
    result = subprocess.run(['ssh', '-o', 'BatchMode=yes', args.host,
                             'docker exec -i beerpong-db-staging psql -X -qAt -U beerpong_user -d beerpong'],
                            input=query, text=True, capture_output=True, check=True)
    rows = [json.loads(line) for line in result.stdout.splitlines() if line.startswith('{')]
    if not rows:
        raise ValueError('No completed recordings for this group')
    # Credentials move directly into this process, never into an artifact or a log.
    raw = subprocess.check_output(['ssh', '-o', 'BatchMode=yes', args.host,
                                   'docker inspect --format "{{json .Config.Env}}" beerpong-api-go-staging'], text=True)
    env = dict(item.split('=', 1) for item in json.loads(raw) if item.startswith('AWS_'))
    client = boto3.client('s3', endpoint_url='https://' + env['AWS_ENDPOINT'], region_name=env['AWS_REGION'],
                          aws_access_key_id=env['AWS_ACCESS_KEY'], aws_secret_access_key=env['AWS_SECRET_KEY'])
    rng = random.Random(args.seed)
    sessions = sorted({row['session_id'] for row in rows})
    # Cover sessions before taking more clips of the same almost-identical table.
    chosen = rows if args.all else []
    if not args.all:
        for session in sessions:
            candidates = [row for row in rows if row['session_id'] == session]
            chosen += rng.sample(candidates, min(args.per_session, len(candidates)))
    manifest = []
    for row in chosen:
        path = root / 'videos' / row['session_id'] / (row['id'] + Path(row['object_key']).suffix)
        path.parent.mkdir(parents=True, exist_ok=True)
        if not path.exists():
            temporary = path.with_suffix('.download')
            client.download_file(env['AWS_BUCKET_NAME'], row['object_key'], str(temporary))
            if temporary.stat().st_size != row['size_bytes']:
                temporary.unlink()
                raise ValueError('Recording size mismatch: ' + row['id'])
            temporary.replace(path)
        if path.stat().st_size != row['size_bytes']:
            raise ValueError('Cached recording size mismatch: ' + row['id'])
        manifest.append({**row, 'path': str(path.relative_to(root)), 'sha256': digest(path)})
    write_json(root / 'recordings.json', manifest)
    print(json.dumps({'recordings': len(manifest), 'sessions': len(sessions), 'output': str(root)}))


def extract(args):
    import cv2
    root = Path(args.dataset).resolve()
    records = json.loads((root / 'recordings.json').read_text())
    frames = []
    previous = {}
    for record in sorted(records, key=lambda r: (r['session_id'], r['started_at'])):
        video = cv2.VideoCapture(str(root / record['path']))
        if not video.isOpened():
            raise ValueError('Cannot decode recording ' + record['id'])
        duration = video.get(cv2.CAP_PROP_FRAME_COUNT) / max(video.get(cv2.CAP_PROP_FPS), 1)
        for offset in range(1, int(duration), args.every):
            video.set(cv2.CAP_PROP_POS_MSEC, offset * 1000)
            ok, image = video.read()
            if not ok:
                continue
            gray = cv2.cvtColor(cv2.resize(image, (9, 8)), cv2.COLOR_BGR2GRAY)
            signature = gray[:, 1:] > gray[:, :-1]
            old = previous.get(record['session_id'])
            if old is not None and (old != signature).sum() < args.min_change:
                continue
            previous[record['session_id']] = signature
            name = f"{record['id']}-{offset:04d}"
            path = root / 'frames' / (name + '.jpg')
            path.parent.mkdir(parents=True, exist_ok=True)
            cv2.imwrite(str(path), image, [cv2.IMWRITE_JPEG_QUALITY, 95])
            frames.append({'id': name, 'image': str(path.relative_to(root)), 'session': record['session_id'],
                           'recording': record['id'], 'offset': offset, 'width': image.shape[1],
                           'height': image.shape[0], 'sha256': digest(path)})
        video.release()
    if not frames:
        raise ValueError('No decodable frames')
    write_json(root / 'frames.json', frames)
    print(json.dumps({'frames': len(frames), 'sessions': len({f['session'] for f in frames})}))


def search_areas(areas):
    """Match the camera's padded search without overlapping the two source regions."""
    result = []
    for side, a in enumerate(areas):
        b = areas[1-side]
        left, right = max(0, a['x']-.4*a['width']), min(1, a['x']+1.4*a['width'])
        top, bottom = max(0, a['y']-.4*a['height']), min(1, a['y']+1.4*a['height'])
        if a['x']+a['width'] <= b['x']:
            right = min(right, (a['x']+a['width']+b['x'])/2)
        elif b['x']+b['width'] <= a['x']:
            left = max(left, (b['x']+b['width']+a['x'])/2)
        elif a['y']+a['height'] <= b['y']:
            bottom = min(bottom, (a['y']+a['height']+b['y'])/2)
        else:
            top = max(top, (b['y']+b['height']+a['y'])/2)
        result.append(dict(x=left, y=top, width=right-left, height=bottom-top))
    return result


def prepare(args):
    """Make the same two-area montage as the browser; boxes are selected from source footage."""
    import cv2
    import numpy as np
    root = Path(args.dataset).resolve()
    source = root / 'raw-frames.json'
    if not source.exists():
        shutil.copy2(root / 'frames.json', source)
    selections = json.loads(Path(args.areas).read_text())
    frames = []
    for frame in json.loads(source.read_text()):
        areas = selections.get(frame['id'], selections.get(frame['session'], selections.get('default')))
        if not areas:
            continue
        if len(areas) != 2:
            raise ValueError('Select two playing areas for ' + frame['id'])
        for a in areas:
            x, y, w, h = [a[k] for k in ('x','y','width','height')]
            if not all(np.isfinite([x,y,w,h])) or min(x,y) < 0 or min(w,h) < .02 or x+w > 1 or y+h > 1:
                raise ValueError('Invalid playing area')
        a,b=areas
        if not (a['x']+a['width'] <= b['x'] or b['x']+b['width'] <= a['x'] or a['y']+a['height'] <= b['y'] or b['y']+b['height'] <= a['y']):
            raise ValueError('Playing areas overlap')
        if args.search_padding:
            areas = search_areas(areas)
        image = cv2.imread(str(root / frame['image']))
        parts = []
        for a in areas:
            x, y, w, h = [a[k] for k in ('x','y','width','height')]
            if not all(np.isfinite([x,y,w,h])) or min(x,y) < 0 or min(w,h) < .02 or x+w > 1 or y+h > 1:
                raise ValueError('Invalid playing area')
            left, top = round(x*frame['width']), round(y*frame['height'])
            right, bottom = round((x+w)*frame['width']), round((y+h)*frame['height'])
            parts.append(cv2.resize(image[top:bottom,left:right], (156,312), interpolation=cv2.INTER_LINEAR))
        a,b=areas
        if not (a['x']+a['width'] <= b['x'] or b['x']+b['width'] <= a['x'] or a['y']+a['height'] <= b['y'] or b['y']+b['height'] <= a['y']):
            raise ValueError('Playing areas overlap')
        name = frame['id'] + '-formations'
        path = root / 'montages' / (name + '.jpg'); path.parent.mkdir(exist_ok=True)
        cv2.imwrite(str(path), np.concatenate(parts,axis=1), [cv2.IMWRITE_JPEG_QUALITY,95])
        frames.append({**frame, 'id':name, 'image':str(path.relative_to(root)), 'width':312, 'height':312,
                       'sourceImage':frame['image'], 'sourceSha256':frame['sha256'], 'areas':areas, 'sha256':digest(path)})
    if not frames:
        raise ValueError('No source frames have playing areas')
    write_json(root / 'frames.json', frames)
    print(json.dumps({'formationMontages':len(frames)}))


def load_model(checkpoint=None, freeze=False):
    import torch
    from rfdetr import RFDETRSegNano
    torch.set_num_threads(2)
    if checkpoint:
        return RFDETRSegNano.from_checkpoint(checkpoint, device='cpu', freeze_encoder=freeze)
    return RFDETRSegNano(device='cpu', freeze_encoder=freeze)


def prelabel(args):
    import cv2
    import numpy as np
    root = Path(args.dataset).resolve()
    model = load_model(args.checkpoint)
    for frame in json.loads((root / 'frames.json').read_text()):
        path = root / 'annotations' / (frame['id'] + '.json')
        if path.exists():
            continue  # Never overwrite someone's corrections.
        prediction = model.predict(str(root / frame['image']), threshold=args.threshold)
        polygons, masks = [], []
        for mask, cls in zip(prediction.mask, prediction.class_id):
            if cls != (0 if args.checkpoint else 47):
                continue
            if any(np.logical_and(mask, old).sum() / max(np.logical_or(mask, old).sum(), 1) > .8 for old in masks):
                continue
            masks.append(mask)
            contours, _ = cv2.findContours(mask.astype('uint8'), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            if not contours:
                continue
            contour = max(contours, key=cv2.contourArea)
            contour = cv2.approxPolyDP(contour, 0.003 * cv2.arcLength(contour, True), True)
            if len(contour) >= 3:
                polygons.append([[round(float(x) / frame['width'], 5), round(float(y) / frame['height'], 5)] for [[x, y]] in contour])
        write_json(path, {'imageSha256': frame['sha256'], 'reviewed': False, 'polygons': polygons,
                          'source': 'prelabel', 'model': 'custom' if args.checkpoint else 'rf-detr-seg-nano-coco'})
    print('Prelabels created. Every image needs visible inspection and corrections before training.')


def split(args):
    import cv2
    import numpy as np
    root = Path(args.dataset).resolve()
    frames = json.loads((root / 'frames.json').read_text())
    approved = []
    for frame in frames:
        path = root / 'annotations' / (frame['id'] + '.json')
        if not path.exists():
            continue
        label = json.loads(path.read_text())
        if not label.get('reviewed'):
            continue
        if label.get('imageSha256') != frame['sha256'] or digest(root / frame['image']) != frame['sha256']:
            raise ValueError('Reviewed image has changed: ' + frame['id'])
        if not label.get('reviewer') or not label.get('reviewedAt'):
            raise ValueError('Missing review provenance: ' + frame['id'])
        approved.append((frame, label))
    sessions = sorted({frame['session'] for frame, _ in approved})
    if len(sessions) < 3:
        raise ValueError('At least three reviewed recording sessions are needed for disjoint train/valid/test sets')
    random.Random(args.seed).shuffle(sessions)
    holdout = max(1, round(len(sessions) * .2))
    assignments = {s: ('test' if i < holdout else 'valid' if i < 2*holdout else 'train') for i, s in enumerate(sessions)}
    if args.session_splits:
        assignments = json.loads(Path(args.session_splits).read_text())
        if set(assignments) != set(sessions) or set(assignments.values()) != {'train', 'valid', 'test'}:
            raise ValueError('Session assignments must cover every reviewed session with train/valid/test')
    destination = root / 'coco'
    for name in ('train', 'valid', 'test'):
        images, annotations = [], []
        for frame, label in approved:
            if assignments[frame['session']] != name:
                continue
            target = destination / name / Path(frame['image']).name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(root / frame['image'], target)
            image_id = len(images) + 1
            images.append({'id': image_id, 'file_name': target.name, 'width': frame['width'], 'height': frame['height']})
            roles = label.get('roles', ['unknown'] * len(label['polygons']))
            if len(roles) != len(label['polygons']) or any(role not in ('playing', 'removed', 'unknown') for role in roles):
                raise ValueError('Invalid cup roles ' + frame['id'])
            for polygon, role in zip(label['polygons'], roles):
                points = np.asarray(polygon, dtype=np.float64)
                if points.ndim != 2 or points.shape[1] != 2 or len(points) < 3 or not np.isfinite(points).all() or (points < 0).any() or (points > 1).any():
                    raise ValueError('Invalid polygon ' + frame['id'])
                points *= [frame['width'], frame['height']]
                x, y = points.min(axis=0); xmax, ymax = points.max(axis=0)
                annotations.append({'id': len(annotations) + 1, 'image_id': image_id, 'category_id': 1,
                                    'segmentation': [points.reshape(-1).tolist()], 'bbox': [x, y, xmax - x, ymax - y],
                                    'area': float(cv2.contourArea(points.astype('float32'))), 'iscrowd': 0,
                                    'cup_role': role})
        if not images:
            raise ValueError('Empty split: ' + name)
        write_json(destination / name / '_annotations.coco.json', {'images': images, 'annotations': annotations,
                                                                  'categories': [{'id': 1, 'name': 'pong_cup', 'supercategory': 'object'}]})
    provenance = {'seed': args.seed, 'sessions': assignments, 'frames': {frame['id']: frame['sha256'] for frame, _ in approved},
                  'labels': {frame['id']: digest(root / 'annotations' / (frame['id'] + '.json')) for frame, _ in approved},
                  'reviewedFrames': len(approved), 'splitBy': 'recording-session',
                  'limitation': 'Sessions at the same setup are not evidence of generalization to new tables or nights.'}
    write_json(destination / 'provenance.json', provenance)
    print(json.dumps({'reviewedFrames': len(approved), 'sessionAssignments': assignments}))


def train(args):
    root = Path(args.dataset).resolve()
    provenance = json.loads((root / 'coco/provenance.json').read_text())
    model = load_model(args.checkpoint, freeze=args.freeze_encoder)
    kwargs = dict(dataset_dir=str(root / 'coco'), output_dir=args.output, epochs=args.epochs,
                  batch_size=1 if args.device == 'cpu' else 4, grad_accum_steps=4,
                  num_workers=0 if args.device == 'cpu' else 2, device=args.device, seed=args.seed,
                  multi_scale=False, use_ema=True, eval_base_model=True, checkpoint_interval=5, run_test=False,
                  amp_dtype=None if args.device == 'cpu' else 'auto', early_stopping=True,
                  early_stopping_patience=10, tensorboard=False, wandb=False)
    if args.learning_rate is not None:
        kwargs['lr'] = args.learning_rate
    if args.encoder_learning_rate is not None:
        kwargs['lr_encoder'] = args.encoder_learning_rate
    if not 0 <= args.augmentation_hue <= .5:
        raise ValueError('Augmentation hue must be between zero and .5')
    if args.augment:
        kwargs.update(augmentation_backend='albumentations', scale_jitter=False, aug_config={
            'HorizontalFlip': {'p': .5},
            'ColorJitter': {'brightness': .25, 'contrast': .25, 'saturation': .5, 'hue': args.augmentation_hue, 'p': .7},
            'ToGray': {'p': .15},
            'GaussianBlur': {'blur_limit': [3, 3], 'sigma_limit': [.1, .8], 'p': .15},
        })
    # The parent weights may already have seen earlier sessions. Explicit assignments keep
    # those sessions in train; new held-out sessions must remain unseen by both models.
    provenance['parentCheckpointSha256'] = digest(args.checkpoint) if args.checkpoint else 'official-coco'
    provenance['colorAugmentation'] = bool(args.augment)
    provenance['augmentationHue'] = args.augmentation_hue if args.augment else None
    provenance['learningRate'] = args.learning_rate
    provenance['encoderLearningRate'] = args.encoder_learning_rate
    write_json(Path(args.output) / 'dataset-provenance.json', provenance)
    model.train(**kwargs)
    print('Training complete. Evaluate on the held-out test split before promotion.')


def evaluate(args):
    import cv2
    import numpy as np
    root = Path(args.dataset).resolve()
    annotations = json.loads((root / 'coco' / args.split / '_annotations.coco.json').read_text())
    model = load_model(args.checkpoint)
    tp = fp = fn = 0
    ious, latencies, counts, details = [], [], [], []
    role_counts = {role: {'expected': 0, 'matched': 0} for role in ('playing', 'removed', 'unknown')}
    for image in annotations['images']:
        start = time.perf_counter()
        predictions = model.predict(str(root / 'coco' / args.split / image['file_name']), threshold=args.threshold)
        latencies.append((time.perf_counter() - start) * 1000)
        masks, scores = [], []
        for mask, cls, score in zip(predictions.mask, predictions.class_id, predictions.confidence):
            if cls != (0 if args.checkpoint else 47):
                continue
            if not any(np.logical_and(mask, old).sum() / max(np.logical_or(mask, old).sum(), 1) > .8 for old in masks):
                masks.append(mask)
                scores.append(float(score))
        targets, target_annotations = [], []
        for annotation in annotations['annotations']:
            if annotation['image_id'] != image['id']:
                continue
            target = np.zeros((image['height'], image['width']), dtype='uint8')
            cv2.fillPoly(target, [np.array(poly).reshape(-1, 2).astype('int32') for poly in annotation['segmentation']], 1)
            targets.append(target.astype(bool))
            target_annotations.append(annotation)
        pairs = []
        for i, mask in enumerate(masks):
            for j, target in enumerate(targets):
                union = np.logical_or(mask, target).sum()
                pairs.append((float(np.logical_and(mask, target).sum() / max(union, 1)), i, j))
        matched_predictions, matched_targets, matches = set(), set(), {}
        for iou, i, j in sorted(pairs, reverse=True):
            if iou < 0.5 or i in matched_predictions or j in matched_targets:
                continue
            matched_predictions.add(i); matched_targets.add(j); ious.append(iou)
            matches[j] = {'prediction': i, 'maskIoU': iou, 'confidence': scores[i]}
        tp += len(matched_targets); fp += len(masks) - len(matched_predictions); fn += len(targets) - len(matched_targets)
        counts.append({'image': image['file_name'], 'expected': len(targets), 'detected': len(masks), 'matched': len(matched_targets)})
        for j, annotation in enumerate(target_annotations):
            role = annotation.get('cup_role', 'unknown')
            role_counts[role]['expected'] += 1
            role_counts[role]['matched'] += int(j in matched_targets)
        if args.details:
            details.append({'image': image['file_name'], 'targets': [
                {'annotation': annotation['id'], 'role': annotation.get('cup_role', 'unknown'),
                 'bbox': annotation['bbox'], 'match': matches.get(j),
                 'bestMaskIoU': max((pair[0] for pair in pairs if pair[2] == j), default=0)}
                for j, annotation in enumerate(target_annotations)],
                'falsePredictions': [{'prediction': i, 'confidence': scores[i]} for i in range(len(masks)) if i not in matched_predictions]})
    report = {'checkpointSha256': digest(args.checkpoint) if args.checkpoint else 'pretrained-coco',
              'datasetSha256': digest(root / 'coco/provenance.json'),
              'annotationSha256': digest(root / 'coco' / args.split / '_annotations.coco.json'), 'split': args.split, 'threshold': args.threshold,
              'precisionIoU50': tp / max(tp + fp, 1), 'recallIoU50': tp / max(tp + fn, 1),
              'meanMatchedMaskIoU': float(np.mean(ious)) if ious else 0,
              'inferenceP95Ms': float(np.percentile(latencies, 95)), 'counts': counts,
              'truePositives': tp, 'falsePositives': fp, 'falseNegatives': fn, 'roleCounts': role_counts}
    write_json(args.output, report)
    if args.details:
        write_json(args.details, details)
    print(json.dumps(report, indent=2))


def export(args):
    import torch
    import onnx
    root = Path(args.output).resolve()
    root.mkdir(parents=True, exist_ok=True)
    model = load_model(args.checkpoint)
    if args.checkpoint:
        if not args.report:
            raise ValueError('A held-out evaluation report is required for a custom model')
        report = json.loads(Path(args.report).read_text())
        if report['split'] != 'test' or report['checkpointSha256'] != digest(args.checkpoint) or report['threshold'] != args.threshold:
            raise ValueError('Evaluation does not cover this checkpoint on the held-out test set')
        if report['precisionIoU50'] < args.min_precision or report['recallIoU50'] < args.min_recall:
            raise ValueError('Model has not passed the precision/recall promotion gate')
    # Keep the official output contract; the camera reads only the cup class and masks.
    path = model.export(output_dir=str(root / 'raw'), verbose=False)
    target = root / 'cups.onnx'
    shutil.copy2(path, target)
    graph = onnx.load(str(target))
    onnx.checker.check_model(graph)
    sha = digest(target)
    named = root / ('cups-' + sha[:16] + '.onnx'); target.replace(named); target = named
    manifest = {'version': 1, 'id': args.id, 'url': target.name, 'sha256': digest(target), 'size': target.stat().st_size,
                'cupClass': 0 if args.checkpoint else 47, 'threshold': args.threshold, 'inputSize': 312,
                'source': 'reviewed-finetune' if args.checkpoint else 'coco-baseline', 'license': 'Apache-2.0',
                'rfdetrVersion': '1.11.2', 'inputLayout': 'two-formations-side-by-side', 'checkpointSha256': digest(args.checkpoint) if args.checkpoint else 'official-coco',
                'evaluation': json.loads(Path(args.report).read_text()) if args.report else None}
    write_json(root / 'model.json', manifest)
    license_path = Path(__file__).with_name('MODEL-LICENSE.txt')
    shutil.copy2(license_path, root / 'MODEL-LICENSE.txt')
    shutil.rmtree(root / 'raw')
    print(json.dumps({'model': args.id, 'bytes': manifest['size'], 'sha256': manifest['sha256']}))


def publish(args):
    """Publish weights/licence only. Footage, checkpoint and per-image reports stay private."""
    import tarfile
    root = Path(args.model).resolve()
    manifest = json.loads((root / 'model.json').read_text())
    model = root / manifest['url']
    if digest(model) != manifest['sha256'] or model.stat().st_size != manifest['size']:
        raise ValueError('Model checksum mismatch')
    # Release metadata contains aggregate metrics, never private image identifiers.
    if manifest.get('evaluation'):
        manifest['evaluation'].pop('counts', None)
    write_json(root / 'model.json', manifest)
    archive = root / 'cup-model.tar.gz'
    with tarfile.open(archive, 'w:gz') as tar:
        for name in ('model.json','MODEL-LICENSE.txt',manifest['url']):
            tar.add(root / name, arcname=name)
    command = ['gh','release','create',args.tag,str(archive),'--repo','Laurin-Notemann/beerpong',
                    '--title','Cup model ' + manifest['id'],'--notes',
                    'Versioned cup segmentation weights (Apache-2.0). ' + manifest['source'] +
                    '. Preliminary single-setup evaluation; new-camera live validation is required.']
    if args.target:
        command += ['--target', args.target]
    if not args.prepare_only:
        subprocess.run(command, check=True)
    release = {'url':'https://github.com/Laurin-Notemann/beerpong/releases/download/' + args.tag + '/cup-model.tar.gz',
               'sha256':digest(archive),'model':manifest['id']}
    write_json(args.output, release)
    print(json.dumps(release))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    p = sub.add_parser('collect'); p.add_argument('--output', required=True); p.add_argument('--group', default='SBRIL5OJ5'); p.add_argument('--host', default='privaten'); p.add_argument('--limit', type=int, default=200); p.add_argument('--per-session', type=int, default=2); p.add_argument('--all', action='store_true', help='Collect every completed recording instead of sampling sessions'); p.add_argument('--seed', type=int, default=42); p.set_defaults(fn=collect)
    p = sub.add_parser('extract'); p.add_argument('--dataset', required=True); p.add_argument('--every', type=int, default=10); p.add_argument('--min-change', type=int, default=3); p.set_defaults(fn=extract)
    p = sub.add_parser('prepare'); p.add_argument('--dataset', required=True); p.add_argument('--areas', required=True); p.add_argument('--search-padding', action='store_true'); p.set_defaults(fn=prepare)
    p = sub.add_parser('prelabel'); p.add_argument('--dataset', required=True); p.add_argument('--checkpoint'); p.add_argument('--threshold', type=float, default=.2); p.set_defaults(fn=prelabel)
    p = sub.add_parser('review'); p.add_argument('--dataset', required=True); p.add_argument('--port', type=int, default=3198); p.set_defaults(fn=lambda args: __import__('review').serve(args))
    p = sub.add_parser('split'); p.add_argument('--dataset', required=True); p.add_argument('--seed', type=int, default=42); p.add_argument('--session-splits'); p.set_defaults(fn=split)
    p = sub.add_parser('train'); p.add_argument('--dataset', required=True); p.add_argument('--output', required=True); p.add_argument('--epochs', type=int, default=50); p.add_argument('--device', default='cpu', choices=['cpu','cuda','mps']); p.add_argument('--seed', type=int, default=42); p.add_argument('--freeze-encoder', action='store_true'); p.add_argument('--checkpoint'); p.add_argument('--augment', action='store_true'); p.add_argument('--augmentation-hue', type=float, default=.5); p.add_argument('--learning-rate', type=float); p.add_argument('--encoder-learning-rate', type=float); p.set_defaults(fn=train)
    p = sub.add_parser('evaluate'); p.add_argument('--dataset', required=True); p.add_argument('--checkpoint'); p.add_argument('--split', default='test', choices=['valid','test']); p.add_argument('--threshold', type=float, default=.3); p.add_argument('--output', required=True); p.add_argument('--details'); p.set_defaults(fn=evaluate)
    p = sub.add_parser('publish'); p.add_argument('--model', required=True); p.add_argument('--tag', required=True); p.add_argument('--output', required=True); p.add_argument('--target'); p.add_argument('--prepare-only', action='store_true'); p.set_defaults(fn=publish)
    p = sub.add_parser('export'); p.add_argument('--checkpoint'); p.add_argument('--report'); p.add_argument('--output', required=True); p.add_argument('--id', required=True); p.add_argument('--threshold', type=float, default=.3); p.add_argument('--min-precision', type=float, default=.85); p.add_argument('--min-recall', type=float, default=.8); p.set_defaults(fn=export)
    args = parser.parse_args(); args.fn(args)


if __name__ == '__main__':
    main()
