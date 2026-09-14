#!/usr/bin/env python3
"""Shrink the artwork so the apps stay small: max 512 px on the long side, palette PNGs for cut-outs,
JPEG for full-frame pictures (terrain textures, technology and civic cards)."""
import os, sys
from PIL import Image
ROOT = os.path.join(os.path.dirname(__file__), '..', 'web', 'assets')
JPEG_KINDS = ('terrain', 'techs', 'civics')
MAX = 512

def shrink(path):
    kind = os.path.relpath(path, ROOT).split(os.sep)[0]
    img = Image.open(path)
    changed = False
    if max(img.size) > MAX:
        s = MAX / float(max(img.size)); img = img.resize((max(1, round(img.width * s)), max(1, round(img.height * s))), Image.LANCZOS); changed = True
    if kind in JPEG_KINDS:
        out = os.path.splitext(path)[0] + '.jpg'
        img.convert('RGB').save(out, 'JPEG', quality=86, optimize=True, progressive=True)
        if out != path: os.remove(path)
        return out
    img = img.convert('RGBA')
    q = img.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.FLOYDSTEINBERG)
    q.save(path, 'PNG', optimize=True)
    return path

if __name__ == '__main__':
    n = 0
    for dirpath, _, files in os.walk(ROOT):
        for f in files:
            if f.lower().endswith('.png'): shrink(os.path.join(dirpath, f)); n += 1
    print('processed', n)
