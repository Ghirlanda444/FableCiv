// Localization. `_('English text')` returns the translation for the chosen language (English when missing).
// Dictionaries live in i18n/<lang>.js (generated from i18n/<lang>.json by tools/translate.py) and map English → translation.
// Data objects (techs, units, empires…) are translated in place once at start-up by applyData(), so the rest of the
// game keeps reading .name / .desc as before.
(function (AU) {
  var I = AU.I18n = {};
  I.LANGS = { en: 'English', it: 'Italiano', es: 'Español', de: 'Deutsch', fr: 'Français', nl: 'Nederlands', zh: '中文', ru: 'Русский', bg: 'Български' };
  I.dict = null; I.lang = 'en';
  var hasWindow = typeof window !== 'undefined' && typeof document !== 'undefined';
  function stored() { try { return localStorage.getItem('te_lang'); } catch (e) { return null; } }
  I.detect = function () {
    var s = stored(); if (s && I.LANGS[s]) return s;
    var nav = hasWindow && navigator.language ? navigator.language.slice(0, 2).toLowerCase() : 'en';
    return I.LANGS[nav] ? nav : 'en';
  };
  I.t = function (s) { var d = I.dict; if (!d) return s; var v = d[s]; return v === undefined || v === '' ? s : v; };
  globalThis._ = I.t;
  I.setLang = function (lang) { try { localStorage.setItem('te_lang', lang); } catch (e) {} };
  // ---------- data ----------
  var KEYS = { name: 1, desc: 1, descV2: 1, joke: 1, adj: 1, title: 1, line: 1, unlocks: 1, hint: 1, label: 1, kicker: 1, text: 1, look: 0 };
  var SKIP = { needs: 1, feature: 1, requiresCount: 1, requires: 1, unit: 1, cities: 1, id: 1, replaces: 1, cards: 1, pre: 1, fx: 1, ai: 1, bias: 1, color: 1, color2: 1, icon: 1, slots: 1, yields: 1, cond: 1, when: 1, terrain: 1, civ: 1, civId: 1, leaders: 0 };
  function walk(o, fn, depth) {
    if (!o || typeof o !== 'object' || depth > 5) return;
    if (Array.isArray(o)) { for (var i = 0; i < o.length; i++) if (o[i] && typeof o[i] === 'object') walk(o[i], fn, depth + 1); return; } // arrays of plain strings are ids (needs, feature, requiresCount…), never text
    for (var k in o) {
      if (!Object.prototype.hasOwnProperty.call(o, k) || SKIP[k]) continue;
      var v = o[k];
      if (typeof v === 'string') { if (KEYS[k] && v) { var r2 = fn(v); if (r2 !== undefined) o[k] = r2; } }
      else if (v && typeof v === 'object') walk(v, fn, depth + 1);
    }
  }
  I.REGISTRIES = ['TECHS', 'CIVICS', 'UNITS', 'BUILDINGS', 'WONDERS', 'NATIONAL', 'NATURAL_WONDERS', 'RESOURCES', 'TERRAIN', 'FEATURES', 'IMPROVEMENTS', 'CIVS', 'CITY_STATES', 'CITY_STATE_TYPES', 'PANTHEONS', 'FOLLOWER_BELIEFS', 'FOUNDER_BELIEFS', 'ENHANCER_BELIEFS', 'RELIGION_NAMES', 'GOVERNMENTS', 'POLICIES', 'PROJECTS', 'PROMOTIONS', 'SPECIALIZATIONS', 'MASTERY', 'GREAT_TYPES', 'VICTORIES', 'LEANINGS', 'DIFFICULTIES', 'MAP_SIZES', 'MAP_TYPES', 'SPEEDS', 'CULTURES', 'SCENARIOS', 'PALACE_PIECES', 'ERAS', 'ENVOY_TIERS', 'WHEN_LABEL'];
  // Visits every translatable string of the data; fn(str) may return a replacement.
  I.walkData = function (fn) {
    I.REGISTRIES.forEach(function (r) { if (!AU[r] || r === 'ERAS') return; if (r === 'NATURAL_WONDERS') { for (var nk in AU[r]) { var nw = AU[r][nk], keep = nw.name; delete nw.name; walk(nw, fn, 1); nw.name = keep; } return; } walk(AU[r], fn, 0); }); // natural wonders keep their real names in every language
    if (AU.ERAS) for (var e = 0; e < AU.ERAS.length; e++) { var re = fn(AU.ERAS[e]); if (re !== undefined) AU.ERAS[e] = re; }
    if (AU.Diplo && AU.Diplo.AGENDAS) walk(AU.Diplo.AGENDAS, fn, 0);
    if (AU.QUOTES) for (var qc in AU.QUOTES) for (var qi in AU.QUOTES[qc]) { var q = AU.QUOTES[qc][qi]; if (q && q.text) { var rq = fn(q.text); if (rq !== undefined) q.text = rq; } }
    if (AU.WHEN_LABEL) for (var k in AU.WHEN_LABEL) { var r2 = fn(AU.WHEN_LABEL[k]); if (r2 !== undefined) AU.WHEN_LABEL[k] = r2; }
    if (AU.V2) { // Divergence data: Sparks, hubs, ages, unit joke names
      function tx(o, key) { if (o && typeof o[key] === 'string' && o[key]) { var r = fn(o[key]); if (r !== undefined) o[key] = r; } }
      (AU.V2.NODES || []).forEach(function (n) { tx(n, 'name'); tx(n, 'joke'); if (n.trigger) tx(n.trigger, 'desc'); });
      (AU.V2.HUBS || []).forEach(function (h) { tx(h, 'name'); (h.branches || []).forEach(function (b) { tx(b, 'name'); }); });
      (AU.V2.ERAS || []).forEach(function (e) { tx(e, 'name'); tx(e, 'joke'); });
      if (AU.V2.LANES) for (var lk in AU.V2.LANES.rewards) AU.V2.LANES.rewards[lk].forEach(function (r) { tx(r, 'name'); tx(r, 'joke'); });
      for (var uk in (AU.V2.UNITS || {})) tx(AU.V2.UNITS[uk], 'joke');
    }
    if (AU.Society) { (AU.Society.TIERS || []).forEach(function (t) { tx2(t, 'name'); }); (AU.Society.RICH || []).forEach(function (t) { tx2(t, 'name'); }); for (var pk in (AU.Society.PERSUASION || {})) { tx2(AU.Society.PERSUASION[pk], 'name'); tx2(AU.Society.PERSUASION[pk], 'desc'); } }
    function tx2(o, key) { if (o && typeof o[key] === 'string' && o[key]) { var r = fn(o[key]); if (r !== undefined) o[key] = r; } }
  };
  I.applyData = function () { if (!I.dict) return; I.walkData(function (s) { var v = I.dict[s]; return v ? v : undefined; }); };
  // ---------- static DOM (index.html) ----------
  I.translateDom = function (root) {
    if (!I.dict || !hasWindow) return;
    var w = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT), n;
    while ((n = w.nextNode())) { var s = n.nodeValue, t = s.trim(); if (!t) continue; var v = I.dict[t]; if (v) n.nodeValue = s.replace(t, v); }
    (root || document.body).querySelectorAll('[title],[placeholder]').forEach(function (el) { ['title', 'placeholder'].forEach(function (a) { var v0 = el.getAttribute(a); if (v0 && I.dict[v0]) el.setAttribute(a, I.dict[v0]); }); });
  };
  // ---------- loading ----------
  if (hasWindow) {
    I.lang = I.detect();
    if (I.lang !== 'en') {
      if (AU.I18N_DICTS && AU.I18N_DICTS[I.lang]) I.dict = AU.I18N_DICTS[I.lang]; // single-file build carries every language
      else document.write('<script src="i18n/' + I.lang + '.js"><\/script>'); // sets AU.I18N_DICT
    }
    document.addEventListener('DOMContentLoaded', function () { if (!I.dict && AU.I18N_DICT) I.dict = AU.I18N_DICT; I.translateDom(document.body); });
    document.write('<script>if (AU.I18N_DICT && !AU.I18n.dict) AU.I18n.dict = AU.I18N_DICT;<\/script>');
  }
})(globalThis.AU = globalThis.AU || {});
