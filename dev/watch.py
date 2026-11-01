"""Prints each new coach question once, and keeps a heartbeat so the app knows someone is answering."""
import json, os, time

QUEUE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.coach-queue')
os.makedirs(QUEUE, exist_ok=True)
seen = set(f for f in os.listdir(QUEUE) if f.endswith('.json') and not f.endswith('.reply.json')
           and os.path.exists(os.path.join(QUEUE, f[:-5] + '.reply.json')))

while True:
    open(os.path.join(QUEUE, '.alive'), 'w').write(str(time.time()))
    for name in sorted(os.listdir(QUEUE)):
        if not name.endswith('.json') or name.endswith('.reply.json') or name in seen:
            continue
        seen.add(name)
        with open(os.path.join(QUEUE, name)) as f:
            p = json.load(f)
        lines = [f"NEW COACH QUESTION id={name[:-5]}", f"Coach: {p['coach']['name']} | style: {p['coach']['persona']}", p['context'], 'Chat so far:']
        lines += [f"  {m['from']}: {m['text']}" for m in p.get('history', [])]
        lines.append(f"LAST STUDENT MESSAGE{' (first reply to a new request)' if p.get('isFirst') else ''}: {p['last']}")
        print('\n'.join(lines).replace('\n', ' // '), flush=True)
    time.sleep(0.7)
