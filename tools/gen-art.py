#!/usr/bin/env python3
"""Generate missing artwork from web/assets/manifest.json with the free Pollinations image API,
remove the background (rembg, with a chroma-key fallback) and save PNGs with transparency.

Usage: python3 tools/gen-art.py [--limit N] [--kinds units,leaders] [--seed 7]
Exits 0 even when some images fail; a later run retries whatever is still missing.
"""
import argparse, io, json, os, sys, time, urllib.error, urllib.parse, urllib.request

ROOT = os.path.join(os.path.dirname(__file__), '..', 'web', 'assets')
BG_HINT = ''

def fetch(url, timeout=120):
    req = urllib.request.Request(url, headers={'User-Agent': 'FableCiv-art/1.0'})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read(), r.headers.get('Content-Type', '')

_SESSION = {}
_BG_LOCK = None
def remove_bg(data, keep_bg=False, crop=True):
    from PIL import Image
    import threading
    global _BG_LOCK
    if _BG_LOCK is None: _BG_LOCK = threading.Lock()
    img = Image.open(io.BytesIO(data)).convert('RGBA')
    # the free service stamps a small logo in the bottom-right corner: drop the bottom strip
    w, h = img.size
    if crop: img = img.crop((0, 0, w, int(h * 0.93)))
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

_XAI = {}
def xai_request(path, body=None):
    key = os.environ.get('XAI_API_KEY')
    if not key: raise RuntimeError('XAI_API_KEY is not set')
    data = json.dumps(body).encode('utf-8') if body is not None else None
    req = urllib.request.Request('https://api.x.ai/v1/' + path, data=data, headers={'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json', 'User-Agent': 'Chibilization-art/1.0'})
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            return json.loads(r.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        detail = ''
        try: detail = e.read().decode('utf-8', 'replace')[:400]
        except Exception: pass
        raise RuntimeError('xAI HTTP %s on %s: %s' % (e.code, path, detail))

def xai_model():
    """Pick the image model: the XAI_IMAGE_MODEL variable if set, else the first image model the account can use."""
    if 'model' in _XAI: return _XAI['model']
    forced = os.environ.get('XAI_IMAGE_MODEL')
    if forced: _XAI['model'] = forced; return forced
    ids = []
    try:
        out = xai_request('image-generation-models')
        ids = [m.get('id') for m in out.get('models', []) if m.get('id')]
        print('  xAI image models available: %s' % ', '.join(ids), flush=True)
    except Exception as e:
        print('  could not list xAI image models (%s)' % e, flush=True)
    pref = [i for i in ids if 'imagine' in i] + [i for i in ids if 'image' in i] + ids
    _XAI['model'] = pref[0] if pref else 'grok-2-image-1212'
    return _XAI['model']

def fetch_xai(prompt, w, h):
    """xAI image generation (Grok Imagine): OpenAI-compatible endpoint, returns the image bytes."""
    import base64
    model = xai_model()
    body = {'model': model, 'prompt': prompt, 'n': 1, 'response_format': 'b64_json'}
    try:
        out = xai_request('images/generations', body)
    except RuntimeError as e:
        if 'response_format' in str(e) or 'HTTP 400' in str(e):
            body.pop('response_format', None)
            out = xai_request('images/generations', body)
        else: raise
    d = out['data'][0]
    if d.get('b64_json'): return base64.b64decode(d['b64_json']), 'image/jpeg'
    return fetch(d['url'])

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
    ap.add_argument('--skip', default=os.environ.get('SKIP_KINDS') or '', help='comma-separated kind prefixes to leave out, e.g. units/,buildings/ (the per-culture variants)')
    ap.add_argument('--provider', default=os.environ.get('ART_PROVIDER') or 'pollinations', help='pollinations (free) or xai (Grok Imagine, needs XAI_API_KEY)')
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
    skips = [k for k in args.skip.split(',') if k and k.lower() != 'none']  # 'none' = generate everything, cultural variants included
    order = ['terrain', 'features', 'units', 'leaders', 'buildings', 'wonders', 'national', 'natural', 'resources', 'civs', 'techs', 'civics']
    items.sort(key=lambda i: order.index(i['kind']) if i['kind'] in order else 99)
    todo = []
    for it in items:
        if kinds and it['kind'] not in kinds: continue
        if any(it['kind'].startswith(sk) for sk in skips) and it['kind'] not in kinds: continue
        if os.path.exists(os.path.join(ROOT, it['file'])) or os.path.exists(os.path.join(ROOT, os.path.splitext(it['file'])[0] + '.png')): continue
        todo.append(it)
        if args.limit and len(todo) >= args.limit: break
    from concurrent.futures import ThreadPoolExecutor
    import threading
    lock = threading.Lock(); stats = {'done': 0, 'failed': 0}
    def texture_focus(img):
        # a tileable texture looks the same at the centre, in every ring around it and in every quadrant;
        # an island, a pond or a vignette gives concentric rings of different colour (score well above 40)
        import math
        im = img.convert('RGB').resize((64, 64)); px = im.load()
        rings = [[0, 0, 0, 0] for _ in range(5)]
        for y in range(64):
            for x in range(64):
                k = min(4, int(math.hypot(x - 31.5, y - 31.5) / 8)); c = px[x, y]
                for j in range(3): rings[k][j] += c[j]
                rings[k][3] += 1
        means = [[r[j] / r[3] for j in range(3)] for r in rings]
        rd = max(math.sqrt(sum((a[k] - b[k]) ** 2 for k in range(3))) for a in means for b in means)
        from PIL import ImageStat
        quad = [ImageStat.Stat(im.crop(b)).mean for b in ((0, 0, 32, 32), (32, 0, 64, 32), (0, 32, 32, 64), (32, 32, 64, 64))]
        qd = max(math.sqrt(sum((a[k] - b[k]) ** 2 for k in range(3))) for a in quad for b in quad)
        return max(rd, qd * 0.9)
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
                if args.provider == 'xai':
                    data, ctype = fetch_xai(prompt, w, h)
                else:
                    data, ctype = fetch(url)
                if len(data) < 5000 or 'image' not in ctype:
                    raise RuntimeError('bad response %s %d bytes' % (ctype, len(data)))
                img = remove_bg(data, keep_bg=bool(it.get('nobg')), crop=(args.provider != 'xai'))
                cov = coverage(img) if not it.get('nobg') else 1.0
                if it.get('nobg'):  # a texture: reject a picture with a focal point in the middle (an island, a pond...)
                    focus = texture_focus(img)
                    if focus > 40:
                        if best is None or -focus > best[0]: best = (-focus, img)
                        if attempt < 2:
                            print('  %s is a scene, not a repeating texture (focus %.0f), retrying' % (it['file'], focus), flush=True)
                            time.sleep(args.delay)
                            continue
                        img = best[1]
                if cov < 0.08:
                    if best is None or cov > best[0]: best = (cov, img)
                    if attempt < 2:
                        print('  %s came out hollow (%.1f%% visible), retrying with another seed' % (it['file'], cov * 100), flush=True)
                        time.sleep(args.delay)
                        continue
                    img = best[1]
                os.makedirs(os.path.dirname(path), exist_ok=True)
                tmp = os.path.splitext(path)[0] + '.png'
                img.save(tmp, 'PNG')
                import importlib.util
                spec = importlib.util.spec_from_file_location('shrink_assets', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'shrink-assets.py')); mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
                mod.shrink(tmp)  # 512 px max, palette PNG or JPEG depending on the kind
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
