// Full technology and civic trees (Civ style): one column band per era, prerequisite arrows, tap a node for details.
// Works with or without a running game (from the Chibipedia on the title screen the tree is simply uncoloured).
(function (AU) {
  var G = AU.G, P = AU.Panels;
  var $ = function (id) { return document.getElementById(id); };
  var NW = 150, NH = 62, CG = 46, RG = 12; // node size, column gap, row gap (CSS pixels before zoom)
  var T = AU.Tree = {};

  // Layout: column = longest prerequisite chain, forced to stay inside the era's band; rows ordered by the
  // average row of the prerequisites so the arrows stay short. Pure data, testable headless.
  T.layout = function (list, byId) {
    var col = {}, eraStart = [], eraEnd = [], guard = {};
    function colOf(t) {
      if (col[t.id] != null) return col[t.id];
      if (guard[t.id]) return eraStart[t.era] || 0; guard[t.id] = true;
      var c = eraStart[t.era] || 0;
      t.pre.forEach(function (pid) { var p = byId[pid]; if (p) c = Math.max(c, colOf(p) + 1); });
      col[t.id] = c; return c;
    }
    AU.ERAS.forEach(function (_, e) {
      eraStart[e] = e === 0 ? 0 : eraEnd[e - 1] + 1; eraEnd[e] = eraStart[e];
      list.forEach(function (t) { if (t.era === e) eraEnd[e] = Math.max(eraEnd[e], colOf(t)); });
      if (!list.some(function (t) { return t.era === e; })) eraEnd[e] = eraStart[e] - 1;
    });
    var ncol = eraEnd[eraEnd.length - 1] + 1, cols = []; for (var i = 0; i < ncol; i++) cols.push([]);
    list.forEach(function (t) { cols[col[t.id]].push(t); });
    var row = {}, order = {}; list.forEach(function (t, i) { order[t.id] = i; });
    cols.forEach(function (c) {
      c.sort(function (a, b) {
        var ka = bary(a), kb = bary(b); return ka - kb || order[a.id] - order[b.id];
      });
      c.forEach(function (t, r) { row[t.id] = r; });
    });
    function bary(t) { var rs = t.pre.map(function (p) { return row[p]; }).filter(function (r) { return r != null; }); return rs.length ? rs.reduce(function (a, b) { return a + b; }, 0) / rs.length : 1e3 + order[t.id] / 1e3; }
    var maxRows = cols.reduce(function (m, c) { return Math.max(m, c.length); }, 1);
    var pos = {};
    cols.forEach(function (c, ci) { var off = (maxRows - c.length) * (NH + RG) / 2; c.forEach(function (t, r) { pos[t.id] = { x: ci * (NW + CG), y: off + r * (NH + RG), col: ci, row: r }; }); });
    var eras = AU.ERAS.map(function (name, e) { return { name: name, from: eraStart[e], to: eraEnd[e] }; }).filter(function (b) { return b.to >= b.from; });
    return { cols: cols, pos: pos, eras: eras, W: ncol * (NW + CG) - CG, H: maxRows * (NH + RG) - RG };
  };

  function kindData(kind) {
    return kind === 'civic'
      ? { list: AU.CIVICS, byId: AU.CIVIC_BY_ID, art: 'civics', boostKey: function (id) { return 'c:' + id; }, boostWord: 'Insight', done: function (p, id) { return !!p.civics[id]; }, cur: function (p) { return p.currentCivic; }, prog: function (p, id) { return p.civicProgress[id] || 0; }, cost: function (g, p, t) { return G.civicCost(g, p, t); }, avail: function (p) { return G.availableCivics(p); }, unlocks: function (t) { return [AU.civicFxText(t)].concat(AU.unlocksOfCivic(t.id)).filter(Boolean); }, hint: function (t) { return t.inspiration; }, action: 'civic', rate: 'culture', icon: '🎭', title: 'Civics tree' }
      : { list: AU.TECHS, byId: AU.TECH_BY_ID, art: 'techs', boostKey: function (id) { return id; }, boostWord: 'Spark', done: function (p, id) { return !!p.techs[id]; }, cur: function (p) { return p.currentTech; }, prog: function (p, id) { return p.techProgress[id] || 0; }, cost: function (g, p, t) { return G.techCost(g, p, t); }, avail: function (p) { return G.availableTechs(p); }, unlocks: function (t) { return AU.unlocksOfTech(t.id); }, hint: function (t) { return t.eureka; }, action: 'research', rate: 'science', icon: '🔬', title: 'Technology tree' };
  }
  function ancestors(byId, id, out) { out = out || {}; var t = byId[id]; if (!t) return out; t.pre.forEach(function (p) { if (!out[p]) { out[p] = true; ancestors(byId, p, out); } }); return out; }

  P.render_tree = function (app, g, data) {
    var kind = data.kind === 'civic' ? 'civic' : 'tech', K = kindData(kind), p = g ? G.player(g) : null;
    var L = T.layout(K.list, K.byId), zoom = data.zoom || (window.innerWidth < 700 ? 0.8 : 1);
    if (!data.sel && p) data.sel = K.cur(p);
    var sel = data.sel && K.byId[data.sel] ? K.byId[data.sel] : null, path = sel ? ancestors(K.byId, sel.id) : {};
    var availIds = {}; if (p) K.avail(p).forEach(function (t) { availIds[t.id] = true; });
    var html = '<div class="tree-top"><div class="tabs"><button class="small ' + (kind === 'tech' ? 'on' : '') + '" data-action="tree" data-kind="tech">🔬 Technologies</button><button class="small ' + (kind === 'civic' ? 'on' : '') + '" data-action="tree" data-kind="civic">🎭 Civics</button>' +
      '<span class="grow"></span><button class="small" data-action="treezoom" data-d="-1">−</button><button class="small" data-action="treezoom" data-d="1">+</button></div>';
    html += '<div class="tabs era-jump">' + L.eras.map(function (b, i) { return '<button class="small ghost" data-action="treejump" data-col="' + b.from + '">' + b.name + '</button>'; }).join('') + '</div>';
    // details of the selected node
    if (sel) {
      var done = p && K.done(p, sel.id), cur = p && K.cur(p) === sel.id, can = p && availIds[sel.id], boosted = p && p.boosts && p.boosts[K.boostKey(sel.id)] !== undefined, boostTurn = boosted ? p.boosts[K.boostKey(sel.id)] : 0, hint = K.hint(sel);
      var cost = p ? K.cost(g, p, sel) : sel.cost, prog = p ? K.prog(p, sel.id) : 0;
      html += '<div class="tree-detail">' + (AU.Assets.get(K.art, sel.id) ? '<img class="techpic" src="' + AU.Assets.url(K.art, sel.id) + '" alt="">' : '') +
        '<div class="grow"><b>' + sel.name + ' <span class="pill">' + AU.ERAS[sel.era] + '</span> <span class="pill">' + K.icon + ' ' + cost + '</span>' + (done ? ' <span class="pill peace">✓ known</span>' : '') + (cur ? ' <span class="pill" style="background:#2b5db8;color:#fff">in progress ' + Math.floor(prog) + '/' + cost + '</span>' : '') + (boosted && !done ? ' <span class="pill" style="background:#2a4a1e;color:#b6f0c4">' + K.boostWord + ' ✓</span>' : '') + '</b>' +
        '<small>' + (K.unlocks(sel).join(' · ') || 'Leads to further ' + (kind === 'tech' ? 'technologies' : 'civics')) + '</small>' +
        (sel.pre.length ? '<small>Requires: ' + sel.pre.map(function (x) { return K.byId[x].name; }).join(', ') + '</small>' : '') +
        (hint ? '<small>💡 ' + K.boostWord + ': ' + hint.desc + (boosted ? ' <b class="strong">✓ triggered on turn ' + boostTurn + '</b>' : '') + '</small>' : '') + (p && AU.masteryLine ? AU.masteryLine(p, sel.id, kind === 'civic') : (G.masteryOf(sel.id, kind === 'civic') ? '<small>⭐ Mastery: ' + G.masteryOf(sel.id, kind === 'civic').desc + '</small>' : '')) + '</div>' +
        '<div class="tree-detail-btns">' + (can && !cur ? '<button class="small primary" data-action="' + K.action + '" data-id="' + sel.id + '">' + (kind === 'tech' ? 'Research' : 'Adopt') + '</button>' : '') +
        '<button class="small ghost" data-action="pedia" data-cat="' + K.art + '" data-id="' + sel.id + '">📖</button></div></div>';
    }
    html += '</div>';
    // the tree itself: era bands, arrows (SVG) and nodes, in a scroll box scaled by the zoom factor
    var pad = 12, hh = 30, W = L.W + pad * 2, H = L.H + pad * 2 + hh;
    html += '<div id="tree-scroll" class="tree-scroll"><div class="tree-zoom" style="width:' + Math.round(W * zoom) + 'px;height:' + Math.round(H * zoom) + 'px"><div class="tree-inner" style="width:' + W + 'px;height:' + H + 'px;transform:scale(' + zoom + ')">';
    L.eras.forEach(function (b, i) { var x = b.from * (NW + CG), w = (b.to - b.from + 1) * (NW + CG) - CG; html += '<div class="era-band e' + (i % 2) + '" style="left:' + (x + pad - CG / 2) + 'px;width:' + (w + CG) + 'px"><span>' + b.name + '</span></div>'; });
    html += '<svg class="tree-edges" width="' + W + '" height="' + H + '">';
    K.list.forEach(function (t) {
      var b = L.pos[t.id]; t.pre.forEach(function (pid) {
        var a = L.pos[pid]; if (!a) return;
        var x1 = a.x + NW + pad, y1 = a.y + NH / 2 + pad + hh, x2 = b.x + pad, y2 = b.y + NH / 2 + pad + hh, m = (x1 + x2) / 2;
        var hl = sel && (t.id === sel.id || (path[t.id] && path[pid]));
        var known = p && K.done(p, t.id);
        html += '<path class="te' + (hl ? ' hl' : known ? ' known' : '') + '" d="M' + x1 + ' ' + y1 + ' C' + m + ' ' + y1 + ' ' + m + ' ' + y2 + ' ' + x2 + ' ' + y2 + '"/>';
      });
    });
    html += '</svg>';
    K.list.forEach(function (t) {
      var ps = L.pos[t.id], st = '';
      if (p) { if (K.done(p, t.id)) st = 'done'; else if (K.cur(p) === t.id) st = 'cur'; else if (availIds[t.id]) st = 'avail'; else st = 'locked'; }
      var boosted = p && p.boosts && p.boosts[K.boostKey(t.id)] && st !== 'done';
      var pct = p && st === 'cur' ? Math.min(100, K.prog(p, t.id) / K.cost(g, p, t) * 100) : 0;
      html += '<div class="tn ' + st + (sel && sel.id === t.id ? ' sel' : path[t.id] ? ' path' : '') + '" style="left:' + (ps.x + pad) + 'px;top:' + (ps.y + pad + hh) + 'px" data-action="treepick" data-id="' + t.id + '" data-col="' + ps.col + '">' +
        (AU.Assets.get(K.art, t.id) ? '<img class="tn-pic" loading="lazy" src="' + AU.Assets.url(K.art, t.id) + '" alt="">' : '<span class="tn-pic tn-ico">' + K.icon + '</span>') +
        '<div class="tn-txt"><b>' + t.name + '</b><small>' + (p ? K.cost(g, p, t) : t.cost) + ' ' + K.icon + (boosted ? ' · 💡' : '') + (st === 'done' ? ' · ✓' : '') + '</small>' + (pct ? '<i class="tn-bar" style="width:' + pct + '%"></i>' : '') + '</div></div>';
    });
    html += '</div></div></div>';
    html += '<p class="stat">Tap a node for details; its prerequisites light up. Columns are grouped by era, arrows show what each one needs.</p>';
    // scroll to the selected (or current) node once the panel is in the page
    setTimeout(function () { var sc = $('tree-scroll'); if (!sc) return; if (data.keepScroll) { sc.scrollLeft = data.keepScroll.l; sc.scrollTop = data.keepScroll.t; data.keepScroll = null; return; } var target = sel ? L.pos[sel.id] : null; if (data.scrollCol != null) target = { x: data.scrollCol * (NW + CG), y: 0 }; if (target) { sc.scrollLeft = Math.max(0, (target.x + pad) * zoom - (data.scrollCol != null ? 8 : sc.clientWidth / 2 - NW * zoom / 2)); if (data.scrollCol == null) sc.scrollTop = Math.max(0, (target.y + pad + hh) * zoom - sc.clientHeight / 2); } data.scrollCol = null; }, 0);
    data.zoom = zoom;
    return { title: K.title, html: html };
  };
  // actions used by the tree panel (called from AU.Panels.action)
  T.action = function (app, name, d) {
    var pd = app.panelData || {};
    switch (name) {
      case 'tree': app.openPanel('tree', { kind: d.kind || (pd.kind) || 'tech', zoom: pd.zoom }); return true;
      case 'treepick': { var sc = $('tree-scroll'); if (sc) pd.keepScroll = { l: sc.scrollLeft, t: sc.scrollTop }; pd.sel = d.id; app.refreshPanel(); return true; }
      case 'treezoom': pd.zoom = Math.max(0.5, Math.min(1.6, (pd.zoom || 1) + 0.15 * (+d.d))); app.refreshPanel(); return true;
      case 'treejump': pd.scrollCol = +d.col; app.refreshPanel(); return true;
    }
    return false;
  };
})(globalThis.AU = globalThis.AU || {});
