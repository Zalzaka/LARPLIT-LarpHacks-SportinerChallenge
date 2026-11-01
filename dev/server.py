"""Local dev server: serves the site and a tiny queue so coach replies can be written by a person (or by Claude Code).

Run:  python3 dev/server.py        then open http://localhost:8000
Only binds to 127.0.0.1. Not used on Render (the deployed site is plain static files).
"""
import http.server, json, os, time, urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QUEUE = os.path.join(ROOT, '.coach-queue')
os.makedirs(QUEUE, exist_ok=True)


def safe_id(raw):
    return ''.join(ch for ch in raw if ch.isalnum() or ch in '-_')[:80]


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def send_json(self, code, body=None):
        self.send_response(code)
        if body is not None:
            data = json.dumps(body).encode()
            self.send_header('content-type', 'application/json')
            self.send_header('content-length', str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        else:
            self.end_headers()

    def do_GET(self):
        url = urllib.parse.urlparse(self.path)
        if url.path == '/api/bridge-status':
            alive = os.path.join(QUEUE, '.alive')
            ok = os.path.exists(alive) and time.time() - os.path.getmtime(alive) < 8
            return self.send_json(200, {'listening': ok})
        if url.path == '/api/coach-reply':
            rid = safe_id(urllib.parse.parse_qs(url.query).get('id', [''])[0])
            path = os.path.join(QUEUE, rid + '.reply.json')
            if rid and os.path.exists(path):
                with open(path) as f:
                    return self.send_json(200, json.load(f))
            return self.send_json(204)
        return super().do_GET()

    def do_POST(self):
        if self.path != '/api/coach-request':
            return self.send_json(404, {'error': 'not found'})
        size = int(self.headers.get('content-length', 0))
        payload = json.loads(self.rfile.read(size) or b'{}')
        rid = safe_id(str(payload.get('id', '')))
        if not rid:
            return self.send_json(400, {'error': 'missing id'})
        with open(os.path.join(QUEUE, rid + '.json'), 'w') as f:
            json.dump(payload, f, indent=2)
        return self.send_json(200, {'ok': True})

    def log_message(self, fmt, *args):
        pass


if __name__ == '__main__':
    http.server.ThreadingHTTPServer(('127.0.0.1', 8000), Handler).serve_forever()
