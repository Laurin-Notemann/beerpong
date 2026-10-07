#!/usr/bin/env python3
"""Reviewed hit feedback -> frozen session splits -> incremental candidate classifier.

Binary hit feedback trains this event classifier, never cup masks or ball centres.
Keep exports, footage, and models outside git. Unanswered and uncertain cases
are review work. Independent AI reviews can opt into TRAIN, never held-out truth.
Promotion remains a separate step.
"""
import argparse
import fcntl
import hashlib
import json
import math
import os
from pathlib import Path
import random
import urllib.parse
import urllib.error
import urllib.request
from datetime import datetime, timezone


VERSION = 'ball-to-rim-evidence-v1'
FEATURES = ('approachDistance', 'rimDistance', 'speed', 'observations', 'occluded', 'exitObserved')
SCALES = (0.1, 0.05, 1.0, 10.0, 1.0, 1.0)
CLIP = [-10, 10]
DEFAULT_STATE = Path(os.environ.get('XDG_STATE_HOME', str(Path.home() / '.local/state'))) / 'versus/vision-hits'


def digest(path):
    h = hashlib.sha256()
    with Path(path).open('rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def write(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, allow_nan=False) + '\n')


def final_uses(state):
    path = Path(state) / 'final-use.json'
    return json.loads(path.read_text()) if path.exists() else {}


def consume_final(state, sessions, identity):
    # A registry shared by every export/cycle prevents reusing FINAL after a
    # failed candidate merely by creating a new dataset directory.
    state = Path(state)
    state.mkdir(parents=True, exist_ok=True)
    with (state / 'final-use.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        uses = final_uses(state)
        if any(session in uses and uses[session] != identity for session in sessions):
            raise ValueError('Final session already consumed; collect fresh sessions for a new candidate')
        uses.update({session: identity for session in sessions})
        temporary = state / 'final-use.part'
        write(temporary, uses)
        temporary.replace(state / 'final-use.json')


def request(args, path):
    token = os.environ.get('VERSUS_VISION_TOKEN')
    if not token:
        raise ValueError('Set VERSUS_VISION_TOKEN privately; do not pass credentials on the command line')
    req = urllib.request.Request(args.api.rstrip('/') + path, headers={'Authorization': 'Bearer ' + token})
    with urllib.request.urlopen(req, timeout=30) as response:
        data = json.load(response)
    if data.get('status') != 'OK' or 'data' not in data:
        raise ValueError('API returned no successful data envelope')
    return data['data']


def features(row):
    evidence = row['evidence']
    values = [float(evidence[key]) / scale for key, scale in zip(FEATURES, SCALES)]
    if not all(math.isfinite(v) for v in values):
        raise ValueError('Non-finite event evidence: ' + row['id'])
    # Same fixed transform is declared in every candidate for the camera worker.
    return [max(-10.0, min(10.0, value)) for value in values] + [1.0]


def split_for(session):
    # Stable across repeated exports. No adjacent frame/session can change sides
    # when new labels arrive; don't search seeds for a more flattering score.
    bucket = int(hashlib.sha256(('vision-hit-split-v1:' + session).encode()).hexdigest()[:8], 16) % 10
    return 'test' if bucket == 0 else 'valid' if bucket == 1 else 'train'


def supervision_digest(data):
    # Excluded cases and reserved FINAL footage cannot cause another fit or
    # threshold selection when the reviewed TRAIN/VALID evidence is unchanged.
    rows = sorted((r for r in data['rows'] if r['split'] in ('train', 'valid')),
                  key=lambda r: r['hit']['id'])
    return hashlib.sha256(json.dumps(rows, sort_keys=True, allow_nan=False).encode()).hexdigest()


def supervised(hit, include_ai=False):
    if hit.get('label') not in ('accepted', 'declined'):
        return False
    source = hit.get('feedbackSource')
    if source in ('player', 'human-review'):
        return True
    # AI judgment remains distinct and must come from an identified independent
    # reviewer with a reason. It cannot label its own predictions into truth.
    return (include_ai and source == 'ai-review' and bool(hit.get('reason'))
            and bool(hit.get('reviewerModel')) and hit['reviewerModel'] != hit['model'])


def collect(args):
    out = Path(args.output)
    if (out / 'dataset.json').exists():
        raise ValueError('Use a new export directory; frozen exports are never overwritten')
    out.mkdir(parents=True, exist_ok=True)
    state = Path(args.state).resolve()
    consumed = final_uses(state)
    collected, excluded, seen = [], [], set()
    cursor = None
    while True:
        query = {'training': 'true', 'limit': '200'}
        if cursor:
            query['before'] = cursor
        rows = request(args, '/groups/' + urllib.parse.quote(args.group, safe='') + '/vision-hits?' + urllib.parse.urlencode(query))
        if not isinstance(rows, list):
            raise ValueError('Expected vision hit list')
        if not rows:
            break
        for row in rows:
            if row['id'] in seen:
                raise ValueError('API pagination repeated a case; export aborted')
            seen.add(row['id'])
            if not supervised(row, getattr(args, 'include_ai_review', False)):
                excluded.append({'id': row['id'], 'reason': 'not-independently-resolved'})
                continue
            if row['sessionId'] in consumed:
                excluded.append({'id': row['id'], 'reason': 'final-session-already-consumed'})
                continue
            try:
                replay = request(args, '/groups/' + urllib.parse.quote(args.group, safe='') + '/vision-hits/' + row['id'] + '/replay')
                if not replay.get('complete') or not replay.get('segments'):
                    excluded.append({'id': row['id'], 'reason': 'replay-incomplete-or-deleted'})
                    continue
                segments = []
                for segment in replay['segments']:
                    name = hashlib.sha256(segment['id'].encode()).hexdigest() + '.video'
                    destination = out / 'video' / name
                    destination.parent.mkdir(exist_ok=True)
                    if not destination.exists():
                        temporary = destination.with_suffix('.part')
                        try:
                            with urllib.request.urlopen(segment['url'], timeout=60) as response, temporary.open('wb') as f:
                                size = 0
                                for chunk in iter(lambda: response.read(1 << 20), b''):
                                    size += len(chunk)
                                    if size > 32 << 20:
                                        raise ValueError('Recording exceeds the API segment limit')
                                    f.write(chunk)
                            if size == 0:
                                raise ValueError('Empty replay recording')
                            temporary.replace(destination)
                        finally:
                            temporary.unlink(missing_ok=True)
                    segments.append({**{k: v for k, v in segment.items() if k != 'url'}, 'path': str(destination.relative_to(out)), 'sha256': digest(destination)})
                # A changed label during download must not bind old feedback to new evidence.
                current = request(args, '/groups/' + urllib.parse.quote(args.group, safe='') + '/vision-hits/' + row['id'])
                if current['revision'] != row['revision'] or current['label'] != row['label']:
                    excluded.append({'id': row['id'], 'reason': 'feedback-changed-during-export'})
                    continue
                features(row)
                partition = split_for(row['sessionId'])
                if row.get('feedbackSource') == 'ai-review' and partition != 'train':
                    excluded.append({'id': row['id'], 'reason': 'AI-label-cannot-establish-heldout-truth'})
                    continue
                collected.append({'hit': row, 'split': partition, 'replay': {**replay, 'segments': segments}})
            except urllib.error.HTTPError as error:
                if error.code not in (404, 410):
                    raise
                excluded.append({'id': row['id'], 'reason': 'replay-or-case-deleted'})
        # Stable API cursor is createdAt|id; ids break equal timestamp ties.
        next_cursor = rows[-1]['createdAt'] + '|' + rows[-1]['id']
        if next_cursor == cursor:
            raise ValueError('API cursor did not advance')
        cursor = next_cursor
    write(out / 'dataset.json', {'version': 1, 'features': VERSION, 'rows': collected, 'excluded': excluded, 'includeAIReviewForTrainOnly': getattr(args, 'include_ai_review', False), 'splitPolicy': 'sha256-session-v1', 'evaluationState': str(state), 'source': 'reviewed-feedback-with-provenance', 'scope': 'proposed-hit-classification-not-unproposed-hit-recall'})
    write(out / 'freeze.json', {'datasetSha256': digest(out / 'dataset.json'), 'pipelineSha256': digest(__file__), 'rows': len(collected), 'labels': {label: sum(r['hit']['label'] == label for r in collected) for label in ('accepted', 'declined')}})
    print(json.dumps({'output': str(out), 'reviewed': len(collected), 'excluded': len(excluded)}))


def load_dataset(path):
    root = Path(path)
    freeze = json.loads((root / 'freeze.json').read_text())
    if digest(root / 'dataset.json') != freeze['datasetSha256']:
        raise ValueError('Frozen dataset changed')
    data = json.loads((root / 'dataset.json').read_text())
    if data['features'] != VERSION:
        raise ValueError('Unsupported event feature version')
    ids = set()
    sessions = {}
    for row in data['rows']:
        hit = row['hit']
        if hit['id'] in ids or not supervised(hit, data.get('includeAIReviewForTrainOnly', False)):
            raise ValueError('Duplicate, unresolved, or AI-only supervision')
        ids.add(hit['id'])
        expected = split_for(hit['sessionId'])
        if row['split'] != expected or sessions.setdefault(hit['sessionId'], expected) != expected:
            raise ValueError('Session split leakage')
        if hit.get('feedbackSource') == 'ai-review' and expected != 'train':
            raise ValueError('AI-only label in held-out truth')
        if not row['replay']['complete'] or not row['replay']['segments']:
            raise ValueError('Training example lacks complete replay evidence')
        for segment in row['replay']['segments']:
            p = (root / segment['path']).resolve()
            if not p.is_relative_to(root.resolve()) or digest(p) != segment['sha256']:
                raise ValueError('Replay evidence changed')
        features(hit)
    return data, freeze


def sigmoid(z):
    return 1.0 / (1.0 + math.exp(-max(-60.0, min(60.0, z))))


def score(weights, rows, threshold):
    tp = fp = fn = tn = 0
    for row in rows:
        predicted = sigmoid(sum(w * x for w, x in zip(weights, features(row['hit'])))) >= threshold
        correct = row['hit']['label'] == 'accepted'
        tp += predicted and correct
        fp += predicted and not correct
        fn += not predicted and correct
        tn += not predicted and not correct
    return {'tp': tp, 'fp': fp, 'fn': fn, 'tn': tn, 'precision': tp / max(tp + fp, 1), 'recall': tp / max(tp + fn, 1), 'positive': tp + fn, 'negative': fp + tn, 'sessions': len({r['hit']['sessionId'] for r in rows})}


def train(args):
    data, freeze = load_dataset(args.dataset)
    train_rows = [r for r in data['rows'] if r['split'] == 'train']
    valid_rows = [r for r in data['rows'] if r['split'] == 'valid']
    for name, rows in [('train', train_rows), ('valid', valid_rows)]:
        if {r['hit']['label'] for r in rows} != {'accepted', 'declined'}:
            raise ValueError(name + ' needs independently reviewed positive and negative examples; collect/review more sessions')
    weights = [0.0] * (len(FEATURES) + 1)
    parent_sha = None
    training_sessions = {r['hit']['sessionId'] for r in train_rows}
    heldout_sessions = {r['hit']['sessionId'] for r in data['rows'] if r['split'] != 'train'}
    if args.parent:
        parent = json.loads(Path(args.parent).read_text())
        if (parent['features'] != VERSION or parent['featureNames'] != list(FEATURES)
                or parent['scales'] != list(SCALES) or parent['clip'] != CLIP):
            raise ValueError('Incompatible parent model')
        # A held-out source used by the parent cannot become incremental TRAIN.
        parent_heldout = set(parent.get('heldOutSessions', []))
        if parent_heldout & training_sessions:
            raise ValueError('Parent held-out session in new TRAIN')
        if set(parent['trainingSessions']) & heldout_sessions:
            raise ValueError('Ancestral TRAIN session in held-out evaluation')
        # Weight exposure survives label resets, footage deletion and new exports.
        training_sessions.update(parent['trainingSessions'])
        heldout_sessions.update(parent_heldout)
        weights = list(parent['weights'])
        parent_sha = digest(args.parent)
    if len(weights) != len(FEATURES) + 1 or not all(math.isfinite(w) for w in weights):
        raise ValueError('Invalid model weights')
    parent_weights = list(weights) if args.parent else None
    randomizer = random.Random(17)
    positives = sum(r['hit']['label'] == 'accepted' for r in train_rows)
    negatives = len(train_rows) - positives
    history = []
    # Retain every reviewed historical TRAIN row, not only the newest correction.
    for epoch in range(args.epochs):
        rows = list(train_rows)
        randomizer.shuffle(rows)
        loss = 0.0
        for row in rows:
            x = features(row['hit'])
            y = int(row['hit']['label'] == 'accepted')
            z = sum(w * v for w, v in zip(weights, x))
            probability = sigmoid(z)
            balance = len(rows) / (2 * (positives if y else negatives))
            if row['hit'].get('feedbackSource') == 'ai-review':
                balance *= 0.25
            loss += balance * (max(z, 0) - z * y + math.log1p(math.exp(-abs(z))))
            weights = [w - args.learning_rate * ((probability - y) * balance * v + 0.001 * w) for w, v in zip(weights, x)]
        history.append({'epoch': epoch + 1, 'loss': loss / len(rows)})
    ranked = [(min(m['precision'], m['recall']), m['precision'] + m['recall'], -abs(t - 0.7), t, m) for t in (0.5, 0.6, 0.7, 0.8, 0.9) for m in [score(weights, valid_rows, t)]]
    _, _, _, threshold, validation = max(ranked)
    parent_validation = score(parent_weights, valid_rows, parent['threshold']) if parent_weights else None
    retained = not parent_validation or (validation['precision'] >= parent_validation['precision'] and validation['recall'] >= parent_validation['recall'])
    qualified = retained and validation['precision'] >= 0.98 and validation['recall'] >= 0.98 and validation['positive'] >= 50 and validation['negative'] >= 50 and validation['sessions'] >= 2
    if Path(args.output).exists():
        raise ValueError('Candidate already exists; use a new version output')
    write(args.output, {'version': 1, 'id': args.id, 'features': VERSION, 'featureNames': list(FEATURES), 'scales': list(SCALES), 'clip': CLIP, 'weights': weights, 'threshold': threshold, 'parentSha256': parent_sha, 'parentValidation': parent_validation, 'retentionGatePassed': retained, 'datasetSha256': freeze['datasetSha256'], 'supervisionSha256': supervision_digest(data), 'evaluationState': data['evaluationState'], 'heldOutSessions': sorted(heldout_sessions), 'trainingRows': len(train_rows), 'trainingSessions': sorted(training_sessions), 'history': history, 'validation': validation, 'validationGatePassed': qualified, 'privateCandidate': True, 'scope': 'proposed-hit-classification-not-unproposed-hit-recall'})
    print(json.dumps({'model': args.id, 'validation': validation, 'candidateOnly': True, 'validationGatePassed': qualified}))


def evaluate(args):
    data, freeze = load_dataset(args.dataset)
    model = json.loads(Path(args.model).read_text())
    if model['features'] != VERSION or model['datasetSha256'] != freeze['datasetSha256']:
        raise ValueError('Model/dataset provenance mismatch')
    rows = [r for r in data['rows'] if r['split'] == args.split]
    if {r['hit']['sessionId'] for r in rows} & set(model['trainingSessions']):
        raise ValueError('Training session in held-out evaluation')
    if args.split == 'test':
        if Path(args.output).exists():
            raise ValueError('Final report already exists; keep it immutable')
        consume_final(data['evaluationState'], {r['hit']['sessionId'] for r in rows},
                      {'modelSha256': digest(args.model), 'datasetSha256': freeze['datasetSha256']})
    metrics = score(model['weights'], rows, model['threshold'])
    passed = model['validationGatePassed'] and metrics['precision'] >= 0.98 and metrics['recall'] >= 0.98 and metrics['positive'] >= 50 and metrics['negative'] >= 50 and metrics['sessions'] >= 2
    report = {'modelSha256': digest(args.model), 'datasetSha256': freeze['datasetSha256'], 'split': args.split, 'metrics': metrics, 'candidateClassificationGatePassed': passed, 'fullHitDetectionRecallQualified': False, 'scope': model['scope'], 'runtimePromotion': 'requires independent continuous-video hit recall and browser verification'}
    write(args.output, report)
    print(json.dumps(report))


def export_model(args):
    model = json.loads(Path(args.model).read_text())
    report = json.loads(Path(args.report).read_text())
    continuous = json.loads(Path(args.continuous_report).read_text())
    identity = digest(args.model)
    if (report.get('modelSha256') != identity or report.get('datasetSha256') != model['datasetSha256']
            or report.get('split') != 'test' or not report.get('candidateClassificationGatePassed')):
        raise ValueError('Need exact model held-out classifier qualification')
    if (continuous.get('modelSha256') != identity or continuous.get('scope') != 'full-visible-hit-events'
            or not continuous.get('browserParityVerified') or len(set(continuous.get('freshSessions', []))) < 2
            or set(continuous.get('freshSessions', [])) & (set(model['trainingSessions']) | set(model['heldOutSessions']))
            or continuous.get('uncertainEvents') != 0):
        raise ValueError('Need independent complete continuous-video hit/runtime qualification')
    consume_final(model['evaluationState'], set(continuous['freshSessions']),
                  {'modelSha256': identity, 'datasetSha256': model['datasetSha256'], 'purpose': 'continuous'})
    tp, fp, fn = (continuous.get(k) for k in ('tp', 'fp', 'fn'))
    if not all(isinstance(v, int) and not isinstance(v, bool) and v >= 0 for v in (tp, fp, fn)):
        raise ValueError('Invalid complete hit counts')
    if tp + fn < 50 or tp / max(tp + fp, 1) < 0.98 or tp / max(tp + fn, 1) < 0.98:
        raise ValueError('Complete hit precision and recall must both reach 98 percent')
    published = {k: model[k] for k in ('version', 'id', 'features', 'featureNames', 'scales', 'clip', 'weights', 'threshold')}
    published['qualification'] = {'modelSha256': identity, 'reportSha256': digest(args.report), 'continuousReportSha256': digest(args.continuous_report)}
    write(args.output, published)
    print('Qualified event classifier saved; deploy through the normal reviewed web workflow')


def cycle(args):
    """One bounded incremental job; suitable for an external scheduled runner."""
    state_root = Path(args.output)
    state_root.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    exported = state_root / stamp
    previous = state_root / 'latest-candidate.json'
    collect_args = argparse.Namespace(**vars(args))
    collect_args.output = str(exported)
    collect(collect_args)
    if previous.exists():
        old = json.loads(previous.read_text())
        if old.get('supervisionSha256') == supervision_digest(json.loads((exported / 'dataset.json').read_text())):
            write(exported / 'cycle.json', {'state': 'no-new-reviewed-feedback', 'promoted': False})
            print('No new reviewed evidence; retained candidate unchanged')
            return
    model_path = exported / 'candidate.json'
    fit_args = argparse.Namespace(dataset=str(exported), parent=str(previous) if previous.exists() else None,
                                  id='hit-' + stamp, output=str(model_path), epochs=args.epochs, learning_rate=args.learning_rate)
    try:
        train(fit_args)
    except ValueError as error:
        write(exported / 'cycle.json', {'state': 'needs-reviewed-sessions', 'reason': str(error), 'promoted': False})
        print('Reviewed evidence saved; waiting for positive and negative human-reviewed sessions in TRAIN and VALID')
        return
    model = json.loads(model_path.read_text())
    # A failed candidate is preserved for diagnosis, never becomes the warm-start default.
    if model['retentionGatePassed']:
        write(previous, model)
    write(exported / 'cycle.json', {'state': 'candidate-trained', 'modelSha256': digest(model_path), 'promoted': False,
                                  'retentionGatePassed': model['retentionGatePassed'], 'validation': model['validation']})
    print('Incremental candidate archived; final and continuous-video qualification remain separate')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    p = commands.add_parser('collect'); p.add_argument('--api', required=True); p.add_argument('--group', required=True); p.add_argument('--output', required=True); p.add_argument('--include-ai-review', action='store_true'); p.add_argument('--state', default=str(DEFAULT_STATE)); p.set_defaults(run=collect)
    p = commands.add_parser('train'); p.add_argument('--dataset', required=True); p.add_argument('--parent'); p.add_argument('--id', required=True); p.add_argument('--output', required=True); p.add_argument('--epochs', type=int, default=100); p.add_argument('--learning-rate', type=float, default=0.01); p.set_defaults(run=train)
    p = commands.add_parser('evaluate'); p.add_argument('--dataset', required=True); p.add_argument('--model', required=True); p.add_argument('--split', choices=['valid', 'test'], required=True); p.add_argument('--output', required=True); p.set_defaults(run=evaluate)
    p = commands.add_parser('export'); p.add_argument('--model', required=True); p.add_argument('--report', required=True); p.add_argument('--continuous-report', required=True); p.add_argument('--output', required=True); p.set_defaults(run=export_model)
    p = commands.add_parser('cycle'); p.add_argument('--api', required=True); p.add_argument('--group', required=True); p.add_argument('--output', required=True); p.add_argument('--include-ai-review', action='store_true'); p.add_argument('--state', default=str(DEFAULT_STATE)); p.add_argument('--epochs', type=int, default=100); p.add_argument('--learning-rate', type=float, default=0.01); p.set_defaults(run=cycle)
    args = parser.parse_args()
    if getattr(args, 'epochs', 1) < 1 or not 0 < getattr(args, 'learning_rate', 0.01) <= 1:
        parser.error('Epochs must be positive and learning rate in (0,1]')
    args.run(args)


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, KeyError) as error:
        # Never include a HTTP request, token or signed media URL in operator output.
        raise SystemExit('Hit pipeline stopped: ' + (str(error) if isinstance(error, ValueError) else type(error).__name__))
