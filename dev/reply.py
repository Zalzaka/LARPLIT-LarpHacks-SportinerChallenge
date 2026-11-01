"""Usage: python3 dev/reply.py <id>   (reply text on stdin)"""
import json, os, sys

QUEUE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.coach-queue')
rid = ''.join(c for c in sys.argv[1] if c.isalnum() or c in '-_')
with open(os.path.join(QUEUE, rid + '.reply.json'), 'w') as f:
    json.dump({'text': sys.stdin.read().strip()}, f)
