#!/usr/bin/env python3
"""Generate missing artwork from web/assets/manifest.json with the free Pollinations image API,
remove the background (rembg, with a chroma-key fallback) and save PNGs with transparency.

Usage: python3 tools/gen-art.py [--limit N] [--kinds units,leaders] [--seed 7]
Exits 0 even when some images fail; a later run retries whatever is still missing.
"""
import argparse, io, json, os, sys, time, urllib.parse, urllib.request

ROOT = os.path.join(os.path.dirname(__file__), '..', 'web', 'assets')
BG_HINT = ''

def fetch(url, timeout=120):
    req = urllib.request.Request(url, headers={'User-Agent': 'FableCiv-art/1.0'})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read(), r.headers.get('Content-Type', '')

_SESSION = {}
_BG_LOCK = None
def remove_bg(data, keep_bg=False):
    from PIL import Image
    import threading
    global _BG_LOCK
    if _BG_LOCK is None: _BG_LOCK = threading.Lock()
    img = Image.open(io.BytesIO(data)).convert('RGBA')
    # the free service stamps a small logo in the bottom-right corner: drop the bottom strip
    w, h = img.size
    img = img.crop((0, 0, w, int(h * 0.93)))
    if keep_bg:  # textures: keep the picture, restore the square size
        return img.resize((w, h), Image.LANCZOS)
    try:
        from rembg import remove, new_session
        with _BG_LOCK:  # one shared model session; the small u2net model keeps memory low on CI runners
            if 'u2net' not in _SESSION: _SESSION['u2net'] = new_session('u2net')
            out = remove(img, session=_SESSION['u2net'])
        return out
    except Exception as e:  # rembg unavailable: chroma-key the green background
        print('  rembg unavailable (%s), using chroma key' % e)
        px = img.load(); w, h = img.size
        for y in range(h):
            for x in range(w):
                r, g, b, a = px[x, y]
                if r > 235 and g > 235 and b > 235:
                    px[x, y] = (r, g, b, 0)
        return img

def coverage(img):
    """Fraction of visibly opaque pixels; a cut-out that lost its subject is nearly empty."""
    try:
        a = img.split()[3]
        hist = a.histogram()
        return sum(hist[40:]) / float(img.width * img.height)
    except Exception:
        return 1.0

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--limit', type=int, default=0)
    ap.add_argument('--kinds', default='')
    ap.add_argument('--seed', type=int, default=7)
    ap.add_argument('--delay', type=float, default=4.0)
    args = ap.parse_args()
    items = json.load(open(os.path.join(ROOT, 'manifest.json')))
    prompts = {}
    # prompts live in PROMPTS.md; rebuild them from the same generator logic for robustness
    md = open(os.path.join(ROOT, 'PROMPTS.md'), encoding='utf-8').read().split('\n')
    cur = None
    for line in md:
        if line.startswith('- **'):
            cur = line.split('**')[1].replace('.png', '')
        elif line.startswith('  > ') and cur:
            prompts[cur] = line[4:].strip()
    kinds = [k for k in args.kinds.split(',') if k]
    order = ['terrain', 'features', 'units', 'leaders', 'buildings', 'wonders', 'national', 'natural', 'resources', 'civs']
    items.sort(key=lambda i: order.index(i['kind']) if i['kind'] in order else 99)
    todo = []
    for it in items:
        if kinds and it['kind'] not in kinds: continue
        if os.path.exists(os.path.join(ROOT, it['file'])): continue
        todo.append(it)
        if args.limit and len(todo) >= args.limit: break
    from concurrent.futures import ThreadPoolExecutor
    import threading
    lock = threading.Lock(); stats = {'done': 0, 'failed': 0}
    def work(it):
        path = os.path.join(ROOT, it['file'])
        prompt = prompts.get(it['file'].replace('.png', ''), it['name'])
        w, h = it['size'].split('x')
        best = None
        for attempt in range(3):
            try:
                seed = args.seed + attempt * 101  # a fresh seed each attempt so a hollow cut-out gets a different picture
                url = 'https://image.pollinations.ai/prompt/' + urllib.parse.quote(prompt) + '?width=%s&height=%s&nologo=true&seed=%d&model=flux' % (w, h, seed)
                print('%s (%s) seed %d' % (it['file'], it['name'], seed), flush=True)
                data, ctype = fetch(url)
                if len(data) < 5000 or 'image' not in ctype:
                    raise RuntimeError('bad response %s %d bytes' % (ctype, len(data)))
                img = remove_bg(data, keep_bg=bool(it.get('nobg')))
                cov = coverage(img) if not it.get('nobg') else 1.0
                if cov < 0.08:
                    if best is None or cov > best[0]: best = (cov, img)
                    if attempt < 2:
                        print('  %s came out hollow (%.1f%% visible), retrying with another seed' % (it['file'], cov * 100), flush=True)
                        time.sleep(args.delay)
                        continue
                    img = best[1]
                os.makedirs(os.path.dirname(path), exist_ok=True)
                img.save(path, 'PNG', optimize=True)
                with lock: stats['done'] += 1
                time.sleep(args.delay)
                return
            except Exception as e:
                print('  %s attempt %d failed: %s' % (it['file'], attempt + 1, e), flush=True)
                time.sleep(8 * (attempt + 1))
        with lock: stats['failed'] += 1
    with ThreadPoolExecutor(max_workers=2) as ex:
        list(ex.map(work, todo))
    print('generated %d, failed %d' % (stats['done'], stats['failed']))

if __name__ == '__main__':
    main()
