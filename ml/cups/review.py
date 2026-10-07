"""Small loopback-only polygon review UI; no footage is uploaded to a labeling service."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json
from datetime import datetime, timezone


def serve(args):
    root = Path(args.dataset).resolve()
    frames = json.loads((root / 'frames.json').read_text())
    by_id = {frame['id']: frame for frame in frames}

    class Handler(BaseHTTPRequestHandler):
        def reply(self, value, kind='application/json', code=200):
            data = value.encode() if isinstance(value, str) else value
            self.send_response(code)
            self.send_header('Content-Type', kind)
            self.send_header('Content-Length', str(len(data)))
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(data)

        def do_GET(self):
            if self.path == '/':
                return self.reply(Path(__file__).with_name('review.html').read_text(), 'text/html')
            if self.path == '/frames':
                return self.reply(json.dumps(frames))
            parts = self.path.split('/')
            if len(parts) != 3 or parts[2] not in by_id:
                return self.reply('{}', code=404)
            frame = by_id[parts[2]]
            if parts[1] == 'image':
                return self.reply((root / frame['image']).read_bytes(),
                                  'image/png' if Path(frame['image']).suffix.lower() == '.png' else 'image/jpeg')
            if parts[1] == 'label':
                path = root / 'annotations' / (frame['id'] + '.json')
                return self.reply(path.read_text() if path.exists() else '{"polygons": [], "reviewed": false}')
            self.reply('{}', code=404)

        def do_POST(self):
            # Reject cross-origin requests even though this is developer tooling on loopback.
            origin = self.headers.get('Origin')
            if origin and origin not in (f'http://localhost:{args.port}', f'http://127.0.0.1:{args.port}'):
                return self.reply('{}', code=403)
            name = self.path.removeprefix('/label/')
            if name not in by_id:
                return self.reply('{}', code=404)
            size = int(self.headers.get('Content-Length', '0'))
            if not 1 <= size <= 100000:
                return self.reply('{}', code=400)
            try:
                label = json.loads(self.rfile.read(size))
                polygons = label['polygons']
                if not label.get('reviewer'):
                    raise ValueError()
                from pipeline import annotation_instances
                annotation_instances(label, name)
                roles = label.get('roles', ['unknown'] * len(polygons))
                parts = label.get('parts', [[] for _ in polygons])
                from pipeline import write_json
                write_json(root / 'annotations' / (name + '.json'), {
                    'polygons': polygons, 'parts': parts, 'roles': roles, 'reviewed': True, 'reviewer': str(label['reviewer'])[:100],
                    'reviewedAt': datetime.now(timezone.utc).isoformat(), 'imageSha256': by_id[name]['sha256'],
                })
            except (ValueError, KeyError, TypeError):
                return self.reply('{}', code=400)
            self.reply('{"saved":true}')

        def log_message(self, *args):
            pass

    print(f'Review: http://localhost:{args.port}', flush=True)
    ThreadingHTTPServer(('127.0.0.1', args.port), Handler).serve_forever()
