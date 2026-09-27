// The loading screen: while the world is generated (or a save is read) the chosen leader greets the player, with the
// empire's motto, a short narration and every bonus of the civ and the leader. The Begin button appears when the world is ready.
(function (AU) {
  var G = AU.G, LD = AU.Loading = {};
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function feature(icon, title, kind, text) {
    return '<div class="ld-feat">' + (icon ? '<div class="ld-ficon">' + icon + '</div>' : '') + '<div><div class="ld-fname">' + esc(title) + (kind ? ' <span class="ld-kind">' + esc(kind) + '</span>' : '') + '</div><div class="ld-ftext">' + esc(text) + '</div></div></div>';
  }
  function img(kind, id, cls) { return AU.Assets ? '<img class="' + cls + '" src="' + AU.Assets.url(kind, id) + '" alt="" onerror="this.remove()">' : ''; }
  // opts: { mode: 'new' | 'continue', turn }
  LD.show = function (civId, leaderId, opts) {
    opts = opts || {};
    var c = AU.CIV_BY_ID[civId], l = AU.LEADER_BY_ID[leaderId] || (c && c.leaders[0]); if (!c || !l) return false;
    var I = AU.INTROS || { civs: {}, leaders: {} }, ci = I.civs[c.id] || {}, li = I.leaders[l.id] || {};
    var el = $('loading'); el.style.setProperty('--civ1', c.color || '#1f3f8f'); el.style.setProperty('--civ2', c.color2 || '#f5d76e');
    var html = '<div class="ld-card">' +
      '<div class="ld-head"><div class="ld-emblem">' + img('civs', c.id, 'ld-emblem-img') + '</div><div><h1>' + esc(c.name) + ' · ' + esc(l.name) + '</h1><div class="ld-sub">' + esc(_(l.title || '')) + (ci.motto ? ' — <i>' + esc(ci.motto) + '</i>' : '') + '</div></div></div>' +
      '<div class="ld-story">' + (li.scene ? '<p>' + esc(li.scene) + '</p>' : '') + (li.call ? '<p>' + esc(li.call) + '</p>' : '') + '</div>' +
      '<h2>' + esc(_('Features & Abilities')) + '</h2><div class="ld-feats">' +
        feature('', c.ability.name, c.name, G.abilityDesc(c.ability)) +
        feature('', l.ability.name, l.name, G.abilityDesc(l.ability)) +
        (c.uu ? feature(img('units', c.uu.replaces, 'ld-ico'), c.uu.name, _('Unique unit'), _('Replaces') + ' ' + AU.UNITS[c.uu.replaces].name + ': ' + c.uu.desc) : '') +
        (c.ub ? feature(img('buildings', c.ub.replaces, 'ld-ico'), c.ub.name, _('Unique building'), _('Replaces') + ' ' + AU.BUILDINGS[c.ub.replaces].name + ': ' + c.ub.desc) : '') +
        (c.ui ? feature('<span class="ld-emoji">' + (c.ui.icon || '') + '</span>', c.ui.name, _('Unique improvement'), c.ui.desc) : '') +
        (c.ut ? feature('<span class="ld-emoji">' + (c.ut.icon || '') + '</span>', c.ut.name, _('Unique town'), c.ut.desc) : '') +
      '</div></div>' +
      '<div class="ld-side"><div class="ld-status" id="ld-status">' + esc(opts.mode === 'continue' ? _('Loading your empire') : _('Loading, please wait')) + '<span class="ld-dots"><i>.</i><i>.</i><i>.</i></span></div>' +
        '<div class="ld-portrait">' + img('leaders', l.id, 'ld-leader') + '</div>' +
        '<button id="ld-go" class="big primary ld-go" hidden></button></div>';
    el.innerHTML = html;
    ['title', 'setup', 'game'].forEach(function (s) { $(s).hidden = true; }); el.hidden = false; el.scrollTop = 0;
    LD.mode = opts.mode; LD.turn = opts.turn;
    return true;
  };
  // the world is ready: turn the status line into the Begin button
  LD.ready = function (go) {
    var el = $('loading'); if (el.hidden) { go(); return; }
    var st = $('ld-status'), b = $('ld-go'); if (st) st.hidden = true;
    b.textContent = LD.mode === 'continue' ? '▶ ' + _('Continue') + (LD.turn ? ' · ' + _('Turn') + ' ' + LD.turn : '') : '▶ ' + _('Begin your reign');
    b.hidden = false; try { b.focus({ preventScroll: true }); } catch (e) {}
    b.onclick = function () { el.hidden = true; el.innerHTML = ''; go(); };
  };
  LD.hide = function () { var el = $('loading'); if (el) { el.hidden = true; el.innerHTML = ''; } };
})(globalThis.AU = globalThis.AU || {});
