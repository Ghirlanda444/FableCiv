# Image-to-3D: sends painted unit pictures (web/assets/units/<unit>.png and <culture>/<unit>.png) to an image-to-3D app
# and saves the textured models it returns, for conversion into game units. The app is either a public Hugging Face demo
# (CI, .github/workflows/ai3d.yml; small free GPU quota) or Hunyuan3D-2 running on your own PC (tools/ai3d/LOCAL.md;
# no quota, so it can do every unit). Each app's API is saved too (<key>_api.json), since demos change their endpoints.
# Usage:
#   python tools/ai3d/generate.py warrior,spearman out_dir                     # both public demos
#   python tools/ai3d/generate.py all out_dir --url http://127.0.0.1:8080      # every unit, on your PC
#   options: --only hunyuan|trellis, --shape-only (no texture), --steps 30, --seed 1234
#   HF_TOKEN (optional): a Hugging Face token raises the free GPU quota of the public demos.
# Finished models are skipped on a re-run, so an interrupted batch picks up where it stopped.
import argparse, glob, json, os, shutil, time, traceback
from gradio_client import Client, handle_file

ART = 'web/assets/units'  # the painted art (godot/art is a build-time copy)
SPACES = {'hunyuan': ['tencent/Hunyuan3D-2'], 'trellis': ['JeffreyXiang/TRELLIS', 'trellis-community/TRELLIS']}  # first one that answers

def files_in(result):
    """every file path in a gradio result (nested tuples, lists, dicts)"""
    out = []
    def walk(r):
        if isinstance(r, (list, tuple)): [walk(x) for x in r]
        elif isinstance(r, dict): [walk(x) for x in r.values()]
        elif isinstance(r, str) and os.path.isfile(r): out.append(r)
    walk(result); return out

def keep(paths, out, stem):
    kept = []
    for p in paths:
        ext = os.path.splitext(p)[1].lower()
        if ext in ('.glb', '.obj', '.ply', '.mp4', '.png'):
            dst = os.path.join(out, '%s%s' % (stem, ext)) if ext == '.glb' else os.path.join(out, '%s_%d%s' % (stem, len(kept), ext))
            shutil.copy(p, dst); kept.append(dst)
    return kept

def done(out, stem): return os.path.exists(os.path.join(out, stem + '.glb'))

def hunyuan(c, names, img, out, u, a):
    eps = ['/shape_generation'] if a.shape_only else ['/generation_all', '/shape_generation']  # textured first, then shape only
    for ep in eps:
        if ep not in names: continue
        stem = 'hunyuan_' + u + ('' if ep == '/generation_all' else '_shape')
        if done(out, stem): print('hunyuan', u, 'already done'); return
        try:
            t = time.time()
            want = dict(image=handle_file(img), steps=a.steps, guidance_scale=5.0, seed=a.seed, octree_resolution=256,
                        check_box_rembg=True, num_chunks=8000, randomize_seed=False)
            # only the settings this app takes (local builds such as the Windows portable one differ a little)
            r = c.predict(api_name=ep, **{k: v for k, v in want.items() if k in names[ep] or not names[ep]})
            k = keep(files_in(r), out, stem)
            print('hunyuan', u, ep, '%.0fs' % (time.time() - t), k)
            if any(p.endswith('.glb') for p in k): return
        except Exception as e: print('hunyuan', u, ep, 'failed:', e)

def trellis(c, names, img, out, u, a):
    stem = 'trellis_' + u
    if done(out, stem): print('trellis', u, 'already done'); return
    try:
        if '/start_session' in names: c.predict(api_name='/start_session')
        t = time.time()
        r = c.predict(image=handle_file(img), multiimages=[], seed=a.seed, ss_guidance_strength=7.5, ss_sampling_steps=12,
                      slat_guidance_strength=3.0, slat_sampling_steps=12, multiimage_algo='stochastic', mesh_simplify=0.95,
                      texture_size=1024, api_name='/generate_and_extract_glb')
        print('trellis', u, '%.0fs' % (time.time() - t), keep(files_in(r), out, stem))
    except Exception as e: print('trellis', u, 'failed:', e)

def unit_images(spec):
    """[(name, path)]: 'all' is every painted unit, culture versions named <culture>_<unit>"""
    if spec != 'all': return [(u.replace('/', '_'), os.path.join(ART, u + '.png')) for u in spec.split(',')]
    paths = sorted(glob.glob(os.path.join(ART, '*.png')) + glob.glob(os.path.join(ART, '*', '*.png')))
    return [(os.path.relpath(p, ART)[:-4].replace(os.sep, '_'), p) for p in paths]

def connect(key, a, token):
    for where in ([a.url] if a.url else SPACES[key]):
        try:
            try: c = Client(where, token=token, verbose=False)        # gradio_client 1.x
            except TypeError: c = Client(where, hf_token=token, verbose=False)
            print(key, 'using', where); return c
        except Exception as e: print(key, where, 'unavailable:', e)

if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('units', help="comma list (warrior,european/knight) or 'all'"); ap.add_argument('out')
    ap.add_argument('which', nargs='?', help='old form of --only: hunyuan,trellis')
    ap.add_argument('--only'); ap.add_argument('--url', help='a local app, e.g. http://127.0.0.1:8080')
    ap.add_argument('--shape-only', action='store_true'); ap.add_argument('--steps', type=int, default=30)
    ap.add_argument('--seed', type=int, default=1234)
    a = ap.parse_args()
    which = (a.only or a.which or ('hunyuan' if a.url else ','.join(SPACES))).split(',')
    os.makedirs(a.out, exist_ok=True); token = os.environ.get('HF_TOKEN') or None
    todo = unit_images(a.units); print(len(todo), 'pictures')
    for key in which:
        c = connect(key, a, token)
        if c is None: continue
        try:
            api = c.view_api(return_format='dict', print_info=False)
            json.dump(api, open(os.path.join(a.out, key + '_api.json'), 'w'), indent=1, default=str)
            names = {ep: [p.get('parameter_name') for p in e.get('parameters', [])] for ep, e in api.get('named_endpoints', {}).items()}
            print(key, 'endpoints:', list(names))
        except Exception:
            print(key, 'unavailable:'); traceback.print_exc(); continue
        for n, (u, img) in enumerate(todo):
            print('[%d/%d]' % (n + 1, len(todo)), end=' ')
            (hunyuan if key == 'hunyuan' else trellis)(c, names, img, a.out, u, a)
    print('files:', sorted(os.listdir(a.out)))
