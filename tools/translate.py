#!/usr/bin/env python3
"""Translates web/i18n/keys.json into web/i18n/<lang>.json (and the <lang>.js the game loads) with xAI Grok.
Only strings missing from a language file are sent, so re-runs are cheap. Usage: python3 tools/translate.py [--langs it,es] [--limit N]
Needs XAI_API_KEY. The chat model is XAI_TEXT_MODEL or the first usable grok-4-fast / grok-3 model of the account."""
import argparse, json, os, sys, time, urllib.request, urllib.error
ROOT = os.path.join(os.path.dirname(__file__), '..', 'web', 'i18n')
LANGS = {'it': 'Italian', 'es': 'Spanish', 'de': 'German', 'fr': 'French', 'nl': 'Dutch', 'zh': 'Simplified Chinese', 'ru': 'Russian', 'bg': 'Bulgarian'}
GLOSSARY = ('Game terms to keep consistent (translate them the same way every time): Knowledge (the science yield), Heritage (the culture yield), Devotion (faith), Fame (tourism), '
            'Ties (standing with a free city), Spark (a boost condition for a technology), Insight (the same for a civic), Mastery (permanent bonus), Free city / Free cities (independent city), '
            'Inchibils (an invented name for wild raiders: keep the word Inchibils untranslated), Town and City (two kinds of settlement), Pioneers (settler unit), Militia, Pathfinder, empire / empires (a playable people), Chibipedia (keep untranslated), Tiny Empires (the game name, keep untranslated). '
            'Keep emoji, numbers, percentages, HTML tags such as <b>, <br>, <small>, and the characters · and — exactly as they are. Keep proper names of leaders, cities, wonders and historical peoples in their usual form in the target language. '
            'Short fragments are pieces of longer sentences assembled at runtime: translate them literally and keep them short; keep abbreviations short. Never add explanations.')

def request(path, body=None, method='POST'):
    key = os.environ.get('XAI_API_KEY')
    if not key: raise RuntimeError('XAI_API_KEY is not set')
    data = json.dumps(body).encode('utf-8') if body is not None else None
    req = urllib.request.Request('https://api.x.ai/v1/' + path, data=data, method=method, headers={'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=300) as r: return json.loads(r.read().decode('utf-8'))

_model = None
CANDIDATES = ('grok-4-1-fast-non-reasoning', 'grok-4-fast-non-reasoning', 'grok-4-1-fast', 'grok-4-fast', 'grok-4-1', 'grok-4', 'grok-4-0709', 'grok-3', 'grok-3-fast', 'grok-3-mini', 'grok-3-mini-fast')
def list_models():
    ids = []
    for path, key in (('models', 'data'), ('language-models', 'models')):
        try:
            out = request(path, None, 'GET'); ids += [m.get('id') for m in out.get(key, []) if m.get('id')]
        except Exception as e: print('  could not list %s: %s' % (path, e), flush=True)
    return ids
def model():
    global _model
    if _model: return _model
    forced = os.environ.get('XAI_TEXT_MODEL')
    if forced: _model = forced; return forced
    ids = list_models(); print('  xAI models available:', ', '.join(ids) or '(none listed)', flush=True)
    for pref in CANDIDATES:
        if pref in ids: _model = pref; return pref
    chat = [i for i in ids if 'grok' in i and 'image' not in i and 'video' not in i and 'embed' not in i]
    _model = chat[0] if chat else CANDIDATES[0]; return _model

def translate_batch(lang, items):
    prompt = ('Translate the following user-interface strings of a cute turn-based strategy game from English to %s. %s\n'
              'Answer with a JSON object only, whose keys are the exact English strings and whose values are the translations.\n\n%s') % (LANGS[lang], GLOSSARY, json.dumps(items, ensure_ascii=False))
    body = {'model': model(), 'messages': [{'role': 'system', 'content': 'You are a professional game localizer. Output strictly valid JSON.'}, {'role': 'user', 'content': prompt}], 'temperature': 0.2, 'response_format': {'type': 'json_object'}}
    for attempt in range(4):
        try:
            out = request('chat/completions', body)
            txt = out['choices'][0]['message']['content'].strip()
            if txt.startswith('```'): txt = txt.strip('`'); txt = txt[txt.find('{'):]
            obj = json.loads(txt[txt.find('{'):txt.rfind('}') + 1])
            return {k: v for k, v in obj.items() if isinstance(v, str) and k in items}
        except urllib.error.HTTPError as e:
            detail = ''
            try: detail = e.read().decode('utf-8', 'replace')[:300]
            except Exception: pass
            print('  HTTP', e.code, detail, flush=True)
            if e.code == 400 and 'response_format' in body: body.pop('response_format')
            elif e.code == 404:
                global _model
                nxt = [c for c in CANDIDATES if c != body['model']]; i = CANDIDATES.index(body['model']) if body['model'] in CANDIDATES else -1
                body['model'] = CANDIDATES[i + 1] if i + 1 < len(CANDIDATES) else nxt[0]; _model = body['model']; print('  trying model', _model, flush=True)
            time.sleep(3 * (attempt + 1))
        except Exception as e:
            print('  retry after error:', e, flush=True); time.sleep(3 * (attempt + 1))
    return {}

def write_js(lang, d):
    with open(os.path.join(ROOT, lang + '.js'), 'w', encoding='utf-8') as f:
        f.write('// generated by tools/translate.py from ' + lang + '.json: English → ' + LANGS[lang] + '\n')
        f.write('window.AU = window.AU || {}; AU.I18N_DICT = ' + json.dumps(d, ensure_ascii=False, separators=(',', ':')) + ';\n')

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--langs', default=','.join(LANGS)); ap.add_argument('--limit', type=int, default=0); ap.add_argument('--batch', type=int, default=50)
    a = ap.parse_args()
    keys = json.load(open(os.path.join(ROOT, 'keys.json'), encoding='utf-8'))
    for lang in [l.strip() for l in a.langs.split(',') if l.strip()]:
        path = os.path.join(ROOT, lang + '.json')
        d = json.load(open(path, encoding='utf-8')) if os.path.exists(path) else {}
        missing = [k for k in keys if k not in d]
        if a.limit: missing = missing[:a.limit]
        print(lang, ': have', len(d), 'missing', len(missing), flush=True)
        done = 0
        for i in range(0, len(missing), a.batch):
            batch = missing[i:i + a.batch]
            got = translate_batch(lang, batch); d.update(got); done += len(got)
            json.dump(d, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=0, sort_keys=True); write_js(lang, d)
            print('  %s: %d/%d' % (lang, min(i + a.batch, len(missing)), len(missing)), flush=True)
        # drop keys that no longer exist
        stale = [k for k in d if k not in keys]
        if stale:
            for k in stale: d.pop(k)
            json.dump(d, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=0, sort_keys=True); write_js(lang, d)
        print(lang, 'done: translated', done, 'now', len(d), '/', len(keys), flush=True)

if __name__ == '__main__': main()
