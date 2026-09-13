#!/usr/bin/env python3
"""Generate missing artwork from web/assets/manifest.json with the free Pollinations image API,
remove the background (rembg, with a chroma-key fallback) and save PNGs with transparency.

Usage: python3 tools/gen-art.py [--limit N] [--kinds units,leaders] [--seed 7]
Exits 0 even when some images fail; a later run retries whatever is still missing.
"""
import argparse, io, json, os, sys, time, urllib.parse, urllib.request

ROOT = os.path.join(os.path.dirname(__file__), '..', 'web', 'assets')
BG_HINT = ', on a plain solid uniform bright green background (#00FF00), nothing else in the background'

def fetch(url, timeout=120):
    req = urllib.request.Request(url, headers={'User-Agent': 'FableCiv-art/1.0'})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read(), r.headers.get('Content-Type', '')

def remove_bg(data):
    from PIL import Image
    img = Image.open(io.BytesIO(data)).convert('RGBA')
    try:
        from rembg import remove
        out = remove(img)
        return out
    except Exception as e:  # rembg unavailable: chroma-key the green background
        print('  rembg unavailable (%s), using chroma key' % e)
        px = img.load(); w, h = img.size
        for y in range(h):
            for x in range(w):
                r, g, b, a = px[x, y]
                if g > 120 and g > r * 1.6 and g > b * 1.6:
                    px[x, y] = (r, g, b, 0)
                elif g > 90 and g > r * 1.25 and g > b * 1.25:
                    px[x, y] = (r, g, b, 110)
        return img

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
    order = ['units', 'leaders', 'buildings', 'wonders', 'national', 'natural', 'resources', 'civs']
    items.sort(key=lambda i: order.index(i['kind']) if i['kind'] in order else 99)
    done = 0; failed = 0
    for it in items:
        if kinds and it['kind'] not in kinds: continue
        path = os.path.join(ROOT, it['file'])
        if os.path.exists(path): continue
        if args.limit and done >= args.limit: break
        prompt = prompts.get(it['file'].replace('.png', ''), it['name'])
        if it['kind'] == 'leaders':
            prompt = prompt + ', plain solid uniform bright green background (#00FF00)'
        else:
            prompt = prompt.replace('isolated on a plain transparent (alpha) background', 'isolated' + BG_HINT)
        w, h = it['size'].split('x')
        url = 'https://image.pollinations.ai/prompt/' + urllib.parse.quote(prompt) + '?width=%s&height=%s&nologo=true&seed=%d&model=flux' % (w, h, args.seed)
        ok = False
        for attempt in range(3):
            try:
                print('[%d] %s (%s)' % (done + 1, it['file'], it['name']), flush=True)
                data, ctype = fetch(url)
                if len(data) < 5000 or 'image' not in ctype:
                    raise RuntimeError('bad response %s %d bytes' % (ctype, len(data)))
                img = remove_bg(data)
                os.makedirs(os.path.dirname(path), exist_ok=True)
                img.save(path, 'PNG', optimize=True)
                ok = True; break
            except Exception as e:
                print('  attempt %d failed: %s' % (attempt + 1, e), flush=True)
                time.sleep(8 * (attempt + 1))
        if ok: done += 1
        else: failed += 1
        time.sleep(args.delay)
    print('generated %d, failed %d' % (done, failed))

if __name__ == '__main__':
    main()
