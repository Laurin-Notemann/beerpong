"""Reviewable ball examples from delayed live entries; private footage stays local."""
import argparse
from datetime import datetime
import hashlib
import json
from pathlib import Path
import subprocess
import random
import math


def read(path):
    return json.loads(Path(path).read_text())


def write(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2) + '\n')


def stamp(value):
    return datetime.fromisoformat(value.replace('Z', '+00:00')).timestamp()


def collect(args):
    if not args.group.isalnum():
        raise ValueError('Invalid group code')
    # No camera access tokens or S3 credentials are written into event artifacts.
    query = ("BEGIN READ ONLY; SELECT row_to_json(t) FROM (SELECT o.id,o.live_match_id,o.seq,"
             "o.created_at,o.type,o.payload FROM live_match_ops o JOIN live_matches m ON "
             "m.id=o.live_match_id JOIN groups g ON g.id=m.group_id WHERE "
             f"g.invite_code='{args.group}' AND o.type IN ('RECORD_CUP_HIT','RECORD_MISS',"
             "'UNDO_CUP_HIT') ORDER BY o.created_at DESC LIMIT 5000) t; ROLLBACK;")
    result = subprocess.run(['ssh', '-o', 'BatchMode=yes', args.host,
                             'docker exec -i beerpong-db-staging psql -X -qAt -U beerpong_user -d beerpong'],
                            input=query, text=True, capture_output=True, check=True)
    events = [json.loads(line) for line in result.stdout.splitlines() if line.startswith('{')]
    for event in events:
        event['payload'] = json.loads(event['payload'])
    write(Path(args.output) / 'events.json', events)
    print(json.dumps({'events': len(events)}))


def windows(args):
    if not 0 < args.before <= 30 or not 0 <= args.after <= 5:
        raise ValueError('Invalid lookback duration')
    root = Path(args.dataset)
    recordings = read(root / 'recordings.json')
    events = read(args.events)
    cases = []
    for event in events:
        if event['type'] not in ('RECORD_CUP_HIT', 'RECORD_MISS'):
            continue
        entered = stamp(event['created_at'])
        overlapping = [r for r in recordings if stamp(r['ended_at']) > entered - args.before
                       and stamp(r['started_at']) < entered + args.after]
        # Distinct camera sessions/views are independent review cases, never stitched together.
        for session in sorted({r['session_id'] for r in overlapping}):
            clips = sorted((r for r in overlapping if r['session_id'] == session),
                           key=lambda r: r['started_at'])
            intervals = [(max(entered - args.before, stamp(r['started_at'])),
                          min(entered + args.after, stamp(r['ended_at']))) for r in clips]
            covered, gaps, cursor = 0., 0., entered - args.before
            for begin, end in intervals:
                if end <= cursor:
                    continue
                gaps += max(0, begin-cursor)
                covered += max(0, end-max(begin,cursor))
                cursor = max(cursor,end)
            gaps += max(0,entered+args.after-cursor)
            cases.append({'id': event['id'] + ':' + session, 'event': event,
                          'session_id': session, 'start_at': entered - args.before,
                          'end_at': entered + args.after, 'clips': clips,
                          'covered_seconds': covered, 'gap_seconds': gaps,
                          'full_window': covered >= args.before + args.after - .25 and gaps < .1,
                          'reviewed': False, 'physical_hit_at': None, 'hit_cup': None, 'cup_roles': [],
                          'note': 'Server entry is weak supervision, not a physical hit or ball label.'})
    write(Path(args.output) / 'windows.json', cases)
    print(json.dumps({'cases': len(cases), 'full_windows': sum(c['full_window'] for c in cases),
                      'sessions': len({c['session_id'] for c in cases})}))


def proposals(args):
    import cv2
    import numpy as np
    if not 1 <= args.fps <= 30 or not 1 <= args.limit <= 200:
        raise ValueError('Sampling bounds exceeded')
    root, out = Path(args.dataset), Path(args.output)
    out.mkdir(parents=True, exist_ok=True)
    examples = []
    cases = read(args.windows)
    area_config = read(root / 'areas.json') if (root / 'areas.json').exists() else {}
    for case in cases[:args.limit]:
        for clip in case['clips']:
            source = root / clip['path']
            if hashlib.file_digest(source.open('rb'), 'sha256').hexdigest() != clip['sha256']:
                raise ValueError('Video checksum changed')
            cap = cv2.VideoCapture(str(source))
            begin = max(0, case['start_at'] - stamp(clip['started_at']))
            end = min(case['end_at'] - stamp(clip['started_at']), stamp(clip['ended_at']) - stamp(clip['started_at']))
            previous = None
            fps = cap.get(cv2.CAP_PROP_FPS) or 30
            cap.set(cv2.CAP_PROP_POS_MSEC, begin * 1000)
            keys = [k for k in area_config if k.startswith(clip['id'])]
            areas = area_config.get(clip['session_id'], area_config.get(keys[0]) if keys else area_config.get('default'))
            if not areas:
                cap.release()
                continue
            next_sample = begin
            for frame_index in range(int((end-begin)*fps)):
                ok, image = cap.read()
                time = begin + frame_index / fps
                if time < next_sample:
                    continue
                next_sample += 1 / args.fps
                if not ok:
                    previous = None
                    continue
                h, w = image.shape[:2]
                frame = cv2.resize(image, (640, round(640 * h / w)))
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB).astype(np.int16)
                if previous is None:
                    previous = rgb
                    continue
                motion = np.abs(rgb - previous).sum(axis=2) > 70
                r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
                orange = (r > 110) & (g > 55) & (r > g * 1.13) & (g > b * 1.3) & (r - b > 45)
                white = (rgb.min(axis=2) > 155) & (rgb.max(axis=2) - rgb.min(axis=2) < 45)
                search = np.zeros(motion.shape, dtype=bool)
                left = max(0, min(a['x'] for a in areas)-.05)
                right = min(1, max(a['x']+a['width'] for a in areas)+.05)
                top = max(0, min(a['y'] for a in areas)-.1)
                bottom = min(1, max(a['y']+a['height'] for a in areas)+.1)
                search[round(top*frame.shape[0]):round(bottom*frame.shape[0]), round(left*640):round(right*640)] = True
                previous = rgb
                if motion.mean() > .12:
                    continue
                count, labels, stats, centers = cv2.connectedComponentsWithStats((motion & (orange | white) & search).astype(np.uint8), connectivity=4)
                for index in sorted(range(1, count), key=lambda i: -stats[i][4])[:24]:
                    x, y, bw, bh, size = stats[index]
                    if not 4 <= size <= 180 or max(bw, bh) > 25 or max(bw, bh) / min(bw, bh) > 3 or size / (bw * bh) < .25:
                        continue
                    cx, cy = centers[index]
                    padding = max(12, max(bw, bh) * 1.5)
                    left, top = max(0, math.floor(cx-padding+.5)), max(0, math.floor(cy-padding+.5))
                    right, bottom = min(frame.shape[1], math.floor(cx+padding+.5)), min(frame.shape[0], math.floor(cy+padding+.5))
                    patch = cv2.resize(frame[top:bottom, left:right], (96, 96))
                    identifier = f'{len(examples):06d}'
                    path = out / 'patches' / (identifier + '.jpg')
                    path.parent.mkdir(exist_ok=True)
                    cv2.imwrite(str(path), patch)
                    examples.append({'id': identifier, 'path': str(path.relative_to(out)),
                                     'session_id': case['session_id'], 'case_id': case['id'],
                                     'recording_id': clip['id'], 'seconds': float(time),
                                     'center': [cx/frame.shape[1], cy/frame.shape[0]],
                                     'reviewPoint': [(cx-left)/(right-left), (cy-top)/(bottom-top)],
                                     'features': raw_features(frame, cx, cy, max(bw, bh)/2, args.features),
                                     'featureVersion': args.features,
                                     'radius': max(bw, bh)/640/2,
                                     'color': 'orange' if orange[labels == index].mean() > .5 else 'white',
                                     'label': None, 'reviewer': None, 'cupRole': 'unknown',
                                     'sha256': hashlib.file_digest(path.open('rb'), 'sha256').hexdigest()})
            cap.release()
    write(out / 'examples.json', examples)
    # Contact sheets aid inspection; unlabeled proposals are never training positives.
    for offset in range(0, len(examples), 120):
        tiles = []
        for example in examples[offset:offset+120]:
            image = cv2.imread(str(out / example['path']))
            cv2.putText(image, example['id'], (2, 12), cv2.FONT_HERSHEY_SIMPLEX, .35, (0, 255, 0), 1)
            tiles.append(image)
        while len(tiles) % 12:
            tiles.append(np.zeros((96, 96, 3), dtype=np.uint8))
        cv2.imwrite(str(out / f'sheet-{offset//120:03d}.jpg'), np.vstack([np.hstack(tiles[i:i+12]) for i in range(0, len(tiles), 12)]))
    print(json.dumps({'unreviewed_proposals': len(examples)}))


def review(args):
    from http.server import BaseHTTPRequestHandler, HTTPServer
    from urllib.parse import unquote
    root = Path(args.dataset).resolve()
    examples = read(root / 'examples.json')
    if not args.reviewer.strip():
        raise ValueError('Reviewer identity required')
    page = """<!doctype html><html><body style="font:18px sans-serif;background:#152824;color:white">
    <h1>Review ball proposals</h1><p>Label the object at the green crosshair. A ball elsewhere in the patch does not make this candidate a ball. Entries are search windows, not ground truth.</p>
    <canvas width="384" height="384" id="view"></canvas><p id="info"></p>
    <button onclick="label('orange-ball')">Orange ball</button><button onclick="label('white-ball')">White ball</button>
    <button onclick="label('negative')">Other object</button><button onclick="label(null)">Uncertain / skip</button>
    <label>Cup context <select id="role"><option value="unknown">Unknown / no cup</option><option value="playing">Playing cup</option><option value="removed">Removed cup</option></select></label><button onclick="i=Math.max(0,i-1);show()">Previous</button>
    <script>let xs=[],i=0;async function show(){const x=xs[i];role.value=x?.cupRole||'unknown';if(!x){info.textContent='Review complete';return;}const image=new Image();image.src='/'+x.path;image.onload=()=>{const c=view.getContext('2d');c.drawImage(image,0,0,384,384);const [px,py]=x.reviewPoint||[.5,.5],cx=px*384,cy=py*384;c.strokeStyle='#00ff99';c.beginPath();c.moveTo(cx-12,cy);c.lineTo(cx+12,cy);c.moveTo(cx,cy-12);c.lineTo(cx,cy+12);c.stroke()};info.textContent=JSON.stringify({index:i,total:xs.length,id:x.id,session:x.session_id,seconds:x.seconds,label:x.label})}
    async function label(value){await fetch('/label',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:xs[i].id,label:value,cupRole:role.value})});i++;show()}
    fetch('/examples').then(r=>r.json()).then(v=>{xs=v;show()})</script></body></html>"""
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_):
            pass
        def do_GET(self):
            if self.path == '/':
                body, kind = page.encode(), 'text/html'
            elif self.path == '/examples':
                body, kind = json.dumps(examples).encode(), 'application/json'
            else:
                path = (root / unquote(self.path).lstrip('/')).resolve()
                if not path.is_relative_to(root / 'patches') or not path.is_file():
                    self.send_error(404)
                    return
                body, kind = path.read_bytes(), 'image/jpeg'
            self.send_response(200); self.send_header('Content-Type', kind); self.send_header('Cache-Control','no-store'); self.end_headers(); self.wfile.write(body)
        def do_POST(self):
            if self.path != '/label':
                self.send_error(404); return
            size = int(self.headers.get('Content-Length','0'))
            if not 0 < size < 4096:
                self.send_error(400); return
            value = json.loads(self.rfile.read(size))
            match = next((e for e in examples if e['id'] == value.get('id')), None)
            if match is None or value.get('label') not in ('orange-ball','white-ball','negative',None) or value.get('cupRole','unknown') not in ('playing','removed','unknown'):
                self.send_error(400); return
            match['cupRole'] = value.get('cupRole','unknown')
            match['label'] = value['label']; match['reviewer'] = args.reviewer if value['label'] else None
            write(root / 'examples.json',examples)
            self.send_response(204); self.end_headers()
    print(f'Review at http://127.0.0.1:{args.port}',flush=True)
    HTTPServer(('127.0.0.1',args.port),Handler).serve_forever()


def split(args):
    examples = read(Path(args.dataset) / 'examples.json')
    approved = [e for e in examples if e['label'] in ('orange-ball', 'white-ball', 'negative') and e.get('reviewer')]
    sessions = sorted({e['session_id'] for e in approved})
    if len(sessions) < 3:
        raise ValueError('Need reviewed examples from at least three recording sessions')
    random.Random(args.seed).shuffle(sessions)
    count = max(1, len(sessions) // 5)
    assignment = {s: ('test' if i < count else 'valid' if i < count * 2 else 'train') for i, s in enumerate(sessions)}
    for e in approved:
        path = Path(args.dataset) / e['path']
        if hashlib.file_digest(path.open('rb'), 'sha256').hexdigest() != e['sha256']:
            raise ValueError('Reviewed patch changed')
        e['split'] = assignment[e['session_id']]
    write(Path(args.dataset) / 'reviewed.json', approved)
    print(json.dumps({s: sum(e['split'] == s for e in approved) for s in ('train', 'valid', 'test')}))


def raw_features(bgr, center_x, center_y, radius, version='radial-rgb-color-v1'):
    """Exact source-pixel sampler from ballClassifier.ts; preview JPEGs do not train the model."""
    import numpy as np
    height, width = bgr.shape[:2]
    padding = max(12*width/640, radius*3)
    left, top = max(0, math.floor(center_x-padding+.5)), max(0, math.floor(center_y-padding+.5))
    right, bottom = min(width, math.floor(center_x+padding+.5)), min(height, math.floor(center_y+padding+.5))
    yy, xx = np.mgrid[0:8, 0:8]
    sx = left+(xx+.5)*(right-left)/8-.5
    sy = top+(yy+.5)*(bottom-top)/8-.5
    x0 = np.clip(np.floor(sx).astype(int),0,width-1); x1 = np.minimum(width-1,x0+1)
    y0 = np.clip(np.floor(sy).astype(int),0,height-1); y1 = np.minimum(height-1,y0+1)
    dx = (sx-np.floor(sx))[...,None]; dy = (sy-np.floor(sy))[...,None]
    rgb = bgr[...,::-1].astype(float)
    patch = ((rgb[y0,x0]*(1-dx)+rgb[y0,x1]*dx)*(1-dy)+(rgb[y1,x0]*(1-dx)+rgb[y1,x1]*dx)*dy)/255
    r,g,b = patch[:,:,0],patch[:,:,1],patch[:,:,2]
    distance = np.hypot(xx-3.5,yy-3.5); values=[]
    for low,high in ((0,1.5),(1.5,3),(3,6)):
        mask=(distance>=low)&(distance<high)
        values.extend([r[mask].mean(),g[mask].mean(),b[mask].mean(),
                       ((r>.45)&(g>.2)&(r>g*1.13)&(g>b*1.3)&(r-b>.17))[mask].mean(),
                       ((patch.min(axis=2)>.6)&(patch.max(axis=2)-patch.min(axis=2)<.18))[mask].mean(),
                       (patch.max(axis=2)-patch.min(axis=2))[mask].mean()])
    if version == 'radial-rgb-color-v1':
        return [float(v) for v in values]
    if version != 'radial-rgb-local-v2':
        raise ValueError('Unsupported ball appearance features')
    def sample(x,y):
        x=max(0,min(width-1,x)); y=max(0,min(height-1,y))
        x0,y0=math.floor(x),math.floor(y); x1,y1=min(width-1,x0+1),min(height-1,y0+1)
        dx,dy=x-x0,y-y0
        return ((rgb[y0,x0]*(1-dx)+rgb[y0,x1]*dx)*(1-dy)+(rgb[y1,x0]*(1-dx)+rgb[y1,x1]*dx)*dy)/255
    def orange(c):
        r,g,b=c
        return r>.45 and g>.2 and r>g*1.13 and g>b*1.3 and r-b>.17
    def saturation(c):return max(c)-min(c)
    def white(c):return min(c)>.6 and saturation(c)<.18
    center=sample(center_x,center_y); scale=width/640
    inner_radius=max(2*scale,min(6*scale,radius*.75)); outer_radius=max(5*scale,min(14*scale,radius*2))
    inner=[]; positions=[]
    for y in range(-3,4):
        for x in range(-3,4):
            if math.hypot(x,y)>2.5:continue
            c=sample(center_x+x*inner_radius/2.5,center_y+y*inner_radius/2.5)
            inner.append(c)
            if orange(c):positions.append((x,y))
    outer=[sample(center_x+math.cos(i*math.pi/8)*outer_radius,center_y+math.sin(i*math.pi/8)*outer_radius) for i in range(16)]
    inside=np.mean(inner,axis=0); outside=np.mean(outer,axis=0)
    box_width=max(p[0] for p in positions)-min(p[0] for p in positions)+1 if positions else 0
    box_height=max(p[1] for p in positions)-min(p[1] for p in positions)+1 if positions else 0
    gradient=sum(abs(sum(c-center)/3) for c in inner)/len(inner)
    values.extend([*center,saturation(center),*inside,sum(orange(c) for c in inner)/len(inner),sum(white(c) for c in inner)/len(inner),sum(saturation(c) for c in inner)/len(inner),*outside,*((inside-outside+1)/2),len(positions)/(box_width*box_height) if positions else 0,min(box_width,box_height)/max(box_width,box_height) if positions else 0,gradient])
    return [float(v) for v in values]


def features(dataset, split_name, color='orange', version='radial-rgb-color-v1'):
    import cv2
    import numpy as np
    if version not in ('radial-rgb-color-v1','radial-rgb-local-v2'):raise ValueError('Unsupported ball appearance features')
    expected_count = 18 if version == 'radial-rgb-color-v1' else 37
    root = Path(dataset)
    examples = [e for e in read(root / 'reviewed.json') if e['split'] == split_name and (color == 'both' or e['color'] == color)]
    x, y = [], []
    for e in examples:
        path = root / e['path']
        if hashlib.file_digest(path.open('rb'), 'sha256').hexdigest() != e['sha256']:
            raise ValueError('Reviewed patch changed')
        if 'features' in e:
            values = e['features']
            declared = e.get('featureVersion',e.get('featuresVersion'))
            if declared is not None and declared != version:
                raise ValueError('Reviewed feature version does not match model')
            if len(values) != expected_count or not all(isinstance(v,(int,float)) and math.isfinite(v) and 0 <= v <= 1 for v in values):
                raise ValueError('Invalid source-pixel features')
            x.append(values); y.append(e['label'] != 'negative')
            continue
        if version != 'radial-rgb-color-v1':
            raise ValueError('Local features require exact source-pixel samples')
        image = cv2.cvtColor(cv2.imread(str(path)), cv2.COLOR_BGR2RGB)
        patch = cv2.resize(image, (8, 8), interpolation=cv2.INTER_LINEAR).astype(float) / 255
        rgb = patch.reshape(-1, 3)
        r, g, b = rgb[:, 0], rgb[:, 1], rgb[:, 2]
        yy, xx = np.mgrid[0:8, 0:8]
        radius = np.hypot(xx.ravel()-3.5, yy.ravel()-3.5)
        values = []
        for low, high in ((0, 1.5), (1.5, 3), (3, 6)):
            mask = (radius >= low) & (radius < high)
            values.extend([r[mask].mean(), g[mask].mean(), b[mask].mean(),
                           ((r > .45) & (g > .2) & (r > g*1.13) & (g > b*1.3) & (r-b > .17))[mask].mean(),
                           ((rgb.min(axis=1) > .6) & (rgb.max(axis=1)-rgb.min(axis=1) < .18))[mask].mean(),
                           (rgb.max(axis=1)-rgb.min(axis=1))[mask].mean()])
        x.append(values)
        y.append(e['label'] != 'negative')
    return np.asarray(x), np.asarray(y, dtype=float), examples


def metrics(y, scores, threshold):
    import numpy as np
    positive = scores >= threshold
    tp = int(np.sum(positive & (y == 1)))
    fp = int(np.sum(positive & (y == 0)))
    fn = int(np.sum(~positive & (y == 1)))
    return {'tp': tp, 'fp': fp, 'fn': fn, 'negatives': int(np.sum(y == 0)),
            'precision': tp / max(1, tp + fp), 'recall': tp / max(1, tp + fn)}


def predict(model, x):
    import numpy as np
    probabilities = []
    for row in x:
        votes = []
        for tree in model['trees']:
            index = 0
            while tree[index][0] >= 0:
                feature, threshold, left, right, _ = tree[index]
                index = left if row[feature] <= threshold else right
            votes.append(tree[index][4])
        probabilities.append(sum(votes)/len(votes))
    return np.asarray(probabilities)


def train(args):
    from sklearn.ensemble import RandomForestClassifier
    x, y, examples = features(args.dataset, 'train', args.color, args.features)
    vx, vy, validation = features(args.dataset, 'valid', args.color, args.features)
    if min(sum(y), len(y)-sum(y)) < 30 or min(sum(vy), len(vy)-sum(vy)) < 15:
        raise ValueError('Need sufficient reviewed positive and negative training/validation examples')
    supported = sorted({e['label'].split('-')[0] for e in examples if e['label'] != 'negative'})
    best = None
    for depth in (3,5,7):
        forest = RandomForestClassifier(n_estimators=32,max_depth=depth,min_samples_leaf=3,
                                        class_weight='balanced',random_state=17,n_jobs=1).fit(x,y)
        scores = forest.predict_proba(vx)[:,1]
        for threshold in (.6,.7,.8,.85,.9,.95):
            result = metrics(vy,scores,threshold)
            objective = result['recall'] if result['precision'] >= .95 else -1
            if best is None or objective > best[0]:
                best = (objective,forest,threshold,result)
    trees = []
    for estimator in best[1].estimators_:
        tree = estimator.tree_
        trees.append([[int(tree.feature[i]),float(tree.threshold[i]),int(tree.children_left[i]),
                       int(tree.children_right[i]),float(tree.value[i][0][1]/tree.value[i][0].sum())]
                      for i in range(tree.node_count)])
    artifact = {'version':1,'id':args.id,'supportedColors':supported,'size':8,
                'features':args.features,'featureCount':18 if args.features == 'radial-rgb-color-v1' else 37,'trees':trees,'threshold':best[2],'proposalColors':args.color,
                'validation':best[3],'validationPass':best[0] >= .7,
                'trainingExamples':len(examples),'validationExamples':len(validation),
                'review':'AI visual review; experimental, one camera/table/night',
                'datasetSha256':hashlib.file_digest((Path(args.dataset)/'reviewed.json').open('rb'),'sha256').hexdigest()}
    write(args.output,artifact)
    print(json.dumps({'supportedColors':supported,'validation':best[3],'threshold':best[2],
                      'validationPass':artifact['validationPass']}))


def evaluate(args):
    model = read(args.model)
    dataset_sha = hashlib.file_digest((Path(args.dataset)/'reviewed.json').open('rb'),'sha256').hexdigest()
    if dataset_sha != model['datasetSha256']:
        raise ValueError('Reviewed dataset changed after training')
    x, y, examples = features(args.dataset, args.split, model['proposalColors'], model.get('features','radial-rgb-color-v1'))
    if not len(y):
        raise ValueError('Empty evaluation split')
    report = {'split':args.split,'modelSha256':hashlib.file_digest(Path(args.model).open('rb'),'sha256').hexdigest(),
              'datasetSha256':dataset_sha,'examples':len(y),'sessions':len({e['session_id'] for e in examples}),
              'metrics':metrics(y,predict(model,x),model['threshold']),
              'review':model['review']}
    write(args.output,report)
    print(json.dumps(report))


def export(args):
    model, report = read(args.model), read(args.report)
    expected = hashlib.file_digest(Path(args.model).open('rb'),'sha256').hexdigest()
    quality = report['metrics']
    if not model.get('validationPass') or report['split'] != 'test' or report['modelSha256'] != expected or quality['precision'] < .9 or quality['recall'] < .8 or quality['tp']+quality['fn'] < 30 or quality['negatives'] < 30:
        raise ValueError('Exact model must pass a reviewed held-out report before promotion')
    model['heldout'] = report
    # Weights/aggregate counts only; private footage and per-example labels never enter the repo.
    write(args.output,model)
    print(json.dumps({'exported':args.output,'supportedColors':model['supportedColors']}))


def main():
    parser = argparse.ArgumentParser()
    commands = parser.add_subparsers(dest='command', required=True)
    p = commands.add_parser('collect'); p.add_argument('--output', required=True); p.add_argument('--group', default='SBRIL5OJ5'); p.add_argument('--host', default='privaten'); p.set_defaults(run=collect)
    p = commands.add_parser('windows'); p.add_argument('--dataset', required=True); p.add_argument('--events', required=True); p.add_argument('--output', required=True); p.add_argument('--before', type=float, default=12); p.add_argument('--after', type=float, default=2); p.set_defaults(run=windows)
    p = commands.add_parser('proposals'); p.add_argument('--dataset', required=True); p.add_argument('--windows', required=True); p.add_argument('--output', required=True); p.add_argument('--fps', type=float, default=15); p.add_argument('--limit', type=int, default=20); p.add_argument('--features',choices=['radial-rgb-color-v1','radial-rgb-local-v2'],default='radial-rgb-color-v1'); p.set_defaults(run=proposals)
    p = commands.add_parser('review'); p.add_argument('--dataset', required=True); p.add_argument('--reviewer', required=True); p.add_argument('--port', type=int, default=3131); p.set_defaults(run=review)
    p = commands.add_parser('split'); p.add_argument('--dataset', required=True); p.add_argument('--seed', type=int, default=17); p.set_defaults(run=split)
    p = commands.add_parser('train'); p.add_argument('--dataset', required=True); p.add_argument('--output', required=True); p.add_argument('--id', required=True); p.add_argument('--color', choices=['orange','white','both'], default='orange'); p.add_argument('--features',choices=['radial-rgb-color-v1','radial-rgb-local-v2'],default='radial-rgb-color-v1'); p.set_defaults(run=train)
    p = commands.add_parser('evaluate'); p.add_argument('--dataset', required=True); p.add_argument('--model', required=True); p.add_argument('--split', choices=['valid','test'], required=True); p.add_argument('--output', required=True); p.set_defaults(run=evaluate)
    p = commands.add_parser('export'); p.add_argument('--model', required=True); p.add_argument('--report', required=True); p.add_argument('--output', required=True); p.set_defaults(run=export)
    args = parser.parse_args(); args.run(args)


if __name__ == '__main__':
    main()
