# Image-to-3D pilot: sends painted unit pictures (web/assets/units/<unit>.png) to public Hugging Face demos of image-to-3D
# models and saves the textured models they return, for comparison with the code-built units. Runs in CI
# (.github/workflows/ai3d.yml), which can reach Hugging Face. Each demo's API is saved too (<space>_api.json), since these
# demos change their endpoints from time to time.
# Usage: python tools/ai3d/generate.py warrior,spearman out_dir [hunyuan,trellis]
#   HF_TOKEN (optional): a Hugging Face token raises the free GPU quota of the demos.
import json, os, shutil, sys, time, traceback
from gradio_client import Client, handle_file

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

def hunyuan(c, names, img, out, u):
    for ep in ('/generation_all', '/shape_generation'):  # textured first, then shape only
        if ep not in names: continue
        try:
            t = time.time(); r = c.predict(image=handle_file(img), api_name=ep)
            k = keep(files_in(r), out, 'hunyuan_' + u + ('' if ep == '/generation_all' else '_shape'))
            print('hunyuan', u, ep, '%.0fs' % (time.time() - t), k)
            if any(p.endswith('.glb') for p in k): return
        except Exception as e: print('hunyuan', u, ep, 'failed:', e)

def trellis(c, names, img, out, u):
    try:
        if '/start_session' in names: c.predict(api_name='/start_session')
        t = time.time()
        if '/preprocess_image' in names: pre = c.predict(image=handle_file(img), api_name='/preprocess_image')
        else: pre = img
        r = c.predict(image=handle_file(pre if isinstance(pre, str) else img), api_name='/image_to_3d')
        keep(files_in(r), out, 'trellis_' + u + '_preview')
        g = c.predict(mesh_simplify=0.9, texture_size=1024, api_name='/extract_glb')
        print('trellis', u, '%.0fs' % (time.time() - t), keep(files_in(g), out, 'trellis_' + u))
    except Exception as e: print('trellis', u, 'failed:', e)

if __name__ == '__main__':
    units, out = sys.argv[1].split(','), sys.argv[2]
    which = sys.argv[3].split(',') if len(sys.argv) > 3 else list(SPACES)
    os.makedirs(out, exist_ok=True); token = os.environ.get('HF_TOKEN') or None
    for key in which:
        c = None
        for space in SPACES[key]:
            try:
                try: c = Client(space, token=token, verbose=False)        # gradio_client 1.x
                except TypeError: c = Client(space, hf_token=token, verbose=False)
                print(key, 'using', space); break
            except Exception as e: print(key, space, 'unavailable:', e)
        if c is None: continue
        try:
            api = c.view_api(return_format='dict', print_info=False)
            json.dump(api, open(os.path.join(out, key + '_api.json'), 'w'), indent=1, default=str)
            names = list(api.get('named_endpoints', {}))
            print(key, 'endpoints:', names)
        except Exception:
            print(key, 'unavailable:'); traceback.print_exc(); continue
        for u in units:
            img = os.path.join('web/assets/units', u + '.png')  # the painted art (godot/art is a build-time copy)
            (hunyuan if key == 'hunyuan' else trellis)(c, names, img, out, u)
    print('files:', sorted(os.listdir(out)))
