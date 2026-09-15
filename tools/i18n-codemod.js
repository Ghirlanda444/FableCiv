// Wraps player-facing string fragments in _() so they can be translated. Idempotent: run it again after adding text.
// Heuristics: HTML tags, CSS classes, identifiers, paths, keys used in comparisons and object keys are left alone;
// fragments with real words (an uppercase letter, several words, or common lowercase phrases) are wrapped.
const fs = require('fs'), path = require('path');
const FILES = ['ui/app.js', 'ui/panels.js', 'ui/tree.js', 'ui/pedia.js', 'ui/diplo.js', 'ui/palace.js', 'ui/citymap.js', 'ui/cityview.js', 'ui/halloffame.js', 'ui/tutorial.js', 'ui/audio.js',
  'core/game.js', 'core/units.js', 'core/citystates.js', 'core/diplomacy.js', 'core/religion.js', 'core/greatpeople.js', 'core/palace.js', 'core/ai.js'];
const CSS = new Set(('row clickable active locked done pill small primary ghost big grow stat section card notif tabs on war peace selected hidden portrait techpic yields meta actions progress plink ' +
  'div span class id style src alt href img button data action br hr p h1 h2 h3 h4 table td tr th ul li input select option label title disabled checked value type width height background color border display margin padding font size px em rem flex grid none block inline left right top bottom center auto solid dashed rgba rgb var calc ' +
  'tree node tn txt pic ico bar detail btns zoom scroll inner edges era band slot slots filled stype empty chip cards cardrow rank hall medal won lost victory icon sub stats tut step text tip quote box art kicker by ok confirm leader head sheet foot pick civ sheet grid list item icon ' +
  'strong faith food prod gold sci cult goldc happy swatch emblem dtag easy medium hard diff kind military economic diplomatic wildcard clear nx nt ni scorebar todo attention pass turn undo next end music has art logo has logo reveal natural fullpage art grid pedia link pedia pic ' +
  'true false null undefined px auto bold italic normal center middle alphabetic sans serif system ui').split(/\s+/));
const KEEP_LOWER = new Set(['turns', 'turn', 'per turn', 'more', 'settlements', 'settlement', 'and', 'or', 'of', 'with', 'from', 'to', 'in', 'at', 'on', 'for', 'per', 'needs', 'costs', 'replaces', 'points', 'point', 'units', 'unit', 'left', 'more turns', 'more turn', 'so far', 'you', 'trained a', 'per turn from', 'known', 'researching', 'current', 'researching', 'empty', 'unlocks', 'requires', 'tiles', 'tile', 'each', 'every', 'none', 'yes', 'no', 'free', 'cheaper', 'less', 'now', 'ready']);
const SEP = /[·|/\[\]+=<>"{}\\]/;
function isSep(ch) { return SEP.test(ch); }
function decode(raw) { return raw.replace(/\\(['"\\nt])/g, (m, c) => c === 'n' ? '\n' : c === 't' ? '\t' : c); }
function enc(s, q) { return s.replace(/\\/g, '\\\\').replace(new RegExp(q, 'g'), '\\' + q).replace(/\n/g, '\\n').replace(/\t/g, '\\t'); }
function lit(s, q) { return s === '' ? null : q + enc(s, q) + q; }
function callT(p) { return p.indexOf("'") >= 0 ? '_("' + enc(p, '"') + '")' : "_('" + enc(p, "'") + "')"; }
function translatable(p) {
  const letters = (p.match(/[A-Za-z]/g) || []).length; if (letters < 3) return false;
  const words = p.split(/\s+/);
  if (words.length === 1) { if (p === p.toLowerCase()) return false; if (/[_\/#@.]/.test(p)) return false; return true; }
  const lower = p === p.toLowerCase();
  if (lower) { if (KEEP_LOWER.has(p)) return true; if (words.some(w => CSS.has(w.replace(/[.,!?'’%:()]/g, '')) || /[-_\/#]/.test(w))) return false; return words.length >= 4 || /[.!?]$/.test(p); }
  if (words.some(w => /[_\/#]/.test(w))) return false;
  if (words.every(w => CSS.has(w.toLowerCase().replace(/[:()]/g, '')) || /^\d/.test(w))) return false;
  return true;
}
// Splits decoded text into [{t:'x', s:'..'}] pieces where t is 'p' (phrase) or 's' (static).
function segment(text) {
  const out = []; let i = 0;
  // tags and entities stay static
  const re = /<[^<>]*>|&[a-z]+;/g; let last = 0, m;
  const chunks = [];
  while ((m = re.exec(text))) { if (m.index > last) chunks.push({ text: text.slice(last, m.index) }); chunks.push({ tag: m[0] }); last = m.index + m[0].length; }
  if (last < text.length) chunks.push({ text: text.slice(last) });
  chunks.forEach(c => {
    if (c.tag) { out.push({ t: 's', s: c.tag }); return; }
    let s = c.text, pos = 0;
    while (pos < s.length) {
      // find next run start (letter) and its end (separator)
      let start = pos; while (start < s.length && (isSep(s[start]) || /[\s\d]/.test(s[start]) || /[^A-Za-z]/.test(s[start]) && !/[.,!?'’%-]/.test(s[start]))) start++;
      if (start >= s.length) { out.push({ t: 's', s: s.slice(pos) }); break; }
      let end = start; while (end < s.length && !isSep(s[end]) && s[end] !== '\n') end++;
      // trim trailing spaces from the run
      let run = s.slice(start, end); let trail = run.length - run.replace(/\s+$/, '').length; run = run.trimEnd();
      // strip leading punctuation that is not a letter/digit
      let lead = 0; while (lead < run.length && !/[A-Za-z0-9]/.test(run[lead])) lead++;
      let core = run.slice(lead), tailN = 0; while (core.length && !/[A-Za-z0-9.!?%'’)»…]/.test(core[core.length - 1])) { core = core.slice(0, -1); tailN++; }
      const phrase = core, tailStatic = run.slice(lead + core.length);
      if (start > pos || lead) out.push({ t: 's', s: s.slice(pos, start) + run.slice(0, lead) });
      if (phrase && translatable(phrase)) out.push({ t: 'p', s: phrase }); else if (phrase) out.push({ t: 's', s: phrase });
      out.push({ t: 's', s: tailStatic + s.slice(start + run.length, end) });
      pos = end;
    }
  });
  // merge adjacent statics
  const merged = []; out.forEach(x => { if (!x.s) return; const l = merged[merged.length - 1]; if (l && l.t === 's' && x.t === 's') l.s += x.s; else merged.push(Object.assign({}, x)); });
  return merged;
}
function skipContext(src, start, end) {
  const before = src.slice(Math.max(0, start - 40), start).replace(/\s+$/, '');
  if (/(===|!==|==|!=|\bcase|\btypeof|\bin|_\(|\[)$/.test(before)) return true;
  if (/(className\s*=|className\s*\+=|classList\.\w+\(|querySelector(All)?\(|getElementById\(|\$\(|getAttribute\(|setAttribute\(|createElement\(|addEventListener\(|removeEventListener\(|getItem\(|setItem\(|removeItem\(|indexOf\(|split\(|new RegExp\(|test\(|\.font\s*=|fillStyle\s*=|strokeStyle\s*=|textAlign\s*=|textBaseline\s*=|font-family)$/.test(before)) return true;
  const after = src.slice(end, end + 6);
  if (/^\s*:/.test(after) && /[{,]$/.test(before)) return true; // object key
  if (/^\s*\]/.test(after) && /\[$/.test(before)) return true;
  return false;
}
function transform(src) {
  let out = '', i = 0, n = src.length, phrases = new Set();
  function prevSignificant(pos) { let j = pos - 1; while (j >= 0 && /\s/.test(src[j])) j--; return j >= 0 ? src[j] : ''; }
  while (i < n) {
    const ch = src[i], nx = src[i + 1];
    if (ch === '/' && nx === '/') { const e = src.indexOf('\n', i); const j = e < 0 ? n : e; out += src.slice(i, j); i = j; continue; }
    if (ch === '/' && nx === '*') { const e = src.indexOf('*/', i + 2); const j = e < 0 ? n : e + 2; out += src.slice(i, j); i = j; continue; }
    if (ch === '`') { let j = i + 1; while (j < n && src[j] !== '`') { if (src[j] === '\\') j++; j++; } out += src.slice(i, j + 1); i = j + 1; continue; }
    if (ch === '/') { const p = prevSignificant(i); if (p === '' || /[(,=:\[!&|?{};+\-*%<>~^]/.test(p) || /return$|typeof$/.test(src.slice(Math.max(0, i - 6), i))) { let j = i + 1, cls = false; while (j < n) { const c = src[j]; if (c === '\\') { j += 2; continue; } if (c === '[') cls = true; else if (c === ']') cls = false; else if (c === '/' && !cls) break; else if (c === '\n') break; j++; } out += src.slice(i, j + 1); i = j + 1; continue; } }
    if (ch === "'" || ch === '"') {
      let j = i + 1; while (j < n && src[j] !== ch) { if (src[j] === '\\') j++; j++; }
      const raw = src.slice(i + 1, j), end = j + 1;
      if (!/[A-Za-z]{3}/.test(raw) || skipContext(src, i, end)) { out += src.slice(i, end); i = end; continue; }
      const segs = segment(decode(raw));
      if (!segs.some(s => s.t === 'p')) { out += src.slice(i, end); i = end; continue; }
      const parts = segs.map(s => s.t === 'p' ? (phrases.add(s.s), callT(s.s)) : lit(s.s, ch)).filter(Boolean);
      out += parts.join(' + '); i = end; continue;
    }
    out += ch; i++;
  }
  return { out, phrases };
}
const root = path.join(__dirname, '..', 'web', 'js');
let total = 0, all = new Set();
FILES.forEach(f => { const p = path.join(root, f); if (!fs.existsSync(p)) return; const src = fs.readFileSync(p, 'utf8'); const r = transform(src); if (r.out !== src) { fs.writeFileSync(p, r.out); } r.phrases.forEach(x => all.add(x)); total += r.phrases.size; console.log(f, r.phrases.size, 'phrases'); });
console.log('unique phrases in code:', all.size);
module.exports = { transform, segment, translatable };
