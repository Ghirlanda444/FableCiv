# Adds the game's black ink outline around the opaque shape of transparent PNG pictures (leader portraits), so they match
# the outlined 3D units and map. Marks each picture it outlines (a PNG text chunk), so running it again changes nothing.
# Usage: python tools/art/ink-outline.py web/assets/leaders [--width 5]   (needs Pillow: pip install pillow)
import sys, os
from PIL import Image, ImageFilter, PngImagePlugin

def outline(path, width):
    im = Image.open(path)
    if im.info.get('ink-outline'): return False
    im0_mode = im.mode; im = im.convert('RGBA')
    solid = im.split()[3].point(lambda v: 255 if v > 110 else 0)
    ring = solid.filter(ImageFilter.MaxFilter(2 * width + 1)).filter(ImageFilter.GaussianBlur(0.7))  # soft-edged, like the in-game line
    out = Image.new('RGBA', im.size, (0, 0, 0, 0)); out.paste(Image.new('RGBA', im.size, (8, 6, 10, 255)), (0, 0), ring)
    out.alpha_composite(im)
    meta = PngImagePlugin.PngInfo(); meta.add_text('ink-outline', str(width))
    if im0_mode == 'P': out = out.quantize(256, method=Image.Quantize.FASTOCTREE)  # keep palette pictures small, as they came
    out.save(path, pnginfo=meta, optimize=True)
    return True

if __name__ == '__main__':
    args = sys.argv[1:]; width = int(args[args.index('--width') + 1]) if '--width' in args else 5
    folder = args[0]; done = 0
    for f in sorted(os.listdir(folder)):
        if f.endswith('.png') and outline(os.path.join(folder, f), width): done += 1
    print('outlined %d pictures in %s' % (done, folder))
