// Climate (Divergence rules): the world's warmth drifts with the ages and, from the Puffstack Age on, with the world's Smoke.
// A shift converts a small band of border tiles (tundra to grassland, snow to tundra, or the reverse); a hot world also dries
// plains next to deserts and drowns a few flat unowned shores. Every shift is announced five turns ahead.
(function (AU) {
  var G = AU.G, CL = AU.Climate = {};
  CL.on = function (g) { return !!(g && g.v2); };
  CL.WARN = 5; CL.EVERY = 25; CL.SHARE = 0.03; CL.SMOKE_AGE = 4;
  CL.BY_AGE = { 0: 0, 1: 0, 2: 1, 3: -1 }; // mild, mild, the warm Turret Age, the Little Ice Age of the Easel Age
  CL.NAMES = { '-1': 'cold', '0': 'mild', '1': 'warm', '2': 'hot' };
  CL.state = function (g) { return g.climate || (g.climate = { warmth: 0, lastAge: 0, lastTick: 0, pending: null, log: [] }); };
  CL.worldAge = function (g) { var a = 0; g.civs.forEach(function (c) { if (c.alive && !c.minor) a = Math.max(a, c.era || 0); }); return a; };
  // Where the world is heading: the ages script the early moves, Smoke drives the rest.
  CL.target = function (g) {
    var age = CL.worldAge(g);
    if (age < CL.SMOKE_AGE) return CL.BY_AGE[age] || 0;
    var smoke = AU.Smoke ? AU.Smoke.world(g) : 0;
    return smoke < 12 ? 0 : smoke < 30 ? 1 : 2;
  };
  function land(t) { return !AU.TERRAIN[t.terrain].water && t.terrain !== 'mountain'; }
  function nearTerrain(g, t, ids) { return G.neighbors(g, t).some(function (n) { return ids.indexOf(g.tiles[n].terrain) >= 0; }); }
  // The tiles a shift would change, capped at a small share of the land and never a settlement, a wonder or a unit's tile.
  CL.plan = function (g, target) {
    var st = CL.state(g), dir = target - st.warmth, out = [], landN = 0;
    g.tiles.forEach(function (t) { if (land(t)) landN++; });
    var cap = Math.max(4, Math.round(landN * CL.SHARE));
    g.tiles.forEach(function (t) {
      if (!land(t) || t.settlement != null || t.natural) return;
      if (G.unitsAt(g, t.i).length) return;
      var to = null;
      if (dir > 0 || target === 2) {
        if (t.terrain === 'tundra' && nearTerrain(g, t, ['grassland', 'plains'])) to = nearTerrain(g, t, ['grassland']) ? 'grassland' : 'plains';
        else if (t.terrain === 'snow' && nearTerrain(g, t, ['tundra', 'grassland', 'plains'])) to = 'tundra';
        else if (target === 2 && t.terrain === 'plains' && nearTerrain(g, t, ['desert'])) to = 'desert';
        else if (target === 2 && !t.hills && t.owner < 0 && !t.resource && nearTerrain(g, t, ['coast', 'ocean'])) to = 'coast';
      } else if (dir < 0) {
        if ((t.terrain === 'grassland' || t.terrain === 'plains') && nearTerrain(g, t, ['tundra', 'snow'])) to = 'tundra';
        else if (t.terrain === 'tundra' && nearTerrain(g, t, ['snow'])) to = 'snow';
      }
      if (to && to !== t.terrain) out.push({ i: t.i, from: t.terrain, to: to });
    });
    // shuffle with the game's own dice so a save replays the same shift, then cap
    for (var k = out.length - 1; k > 0; k--) { var j = G.rngInt(g, k + 1); var tmp = out[k]; out[k] = out[j]; out[j] = tmp; }
    var coast = 0; out = out.filter(function (c) { if (c.to !== 'coast') return true; coast++; return coast <= Math.max(2, Math.round(cap / 3)); });
    return out.slice(0, cap);
  };
  CL.apply = function (g, plan) {
    var changed = {};
    plan.forEach(function (c) {
      var t = g.tiles[c.i]; if (t.settlement != null || t.natural) return;
      t.terrain = c.to;
      if (c.to === 'coast') { t.feature = null; t.hills = false; t.resource = null; t.rich = undefined; t.river = false; t.worked = false; }
      if (c.to === 'snow' || c.to === 'desert') { if (t.feature === 'forest' || t.feature === 'jungle' || t.feature === 'marsh') t.feature = null; }
      if (c.to === 'tundra' && t.feature === 'jungle') t.feature = 'forest';
      if (c.to !== 'grassland' && t.feature === 'marsh') t.feature = null;
      if (c.to !== 'desert' && t.feature === 'oasis') t.feature = null;
      var o = G.tileOwnerCiv(g, t); if (o >= 0) changed[o] = (changed[o] || 0) + 1;
    });
    g.mapVersion = (g.mapVersion || 0) + 1;
    g.civs.forEach(function (c) { if (c._lux) c._lux = null; });
    return changed;
  };
  CL.describe = function (warmth) { return _(CL.NAMES[String(warmth)] || 'mild'); };
  CL.turn = function (g) {
    if (!CL.on(g)) return;
    var st = CL.state(g), age = CL.worldAge(g);
    if (st.pending) {
      if (g.turn >= st.pending.at) {
        var changed = CL.apply(g, st.pending.tiles); var w = st.pending.warmth; st.warmth = w; st.log.push({ turn: g.turn, warmth: w, tiles: st.pending.tiles.length }); st.pending = null;
        g.civs.forEach(function (c) { if (!c.isPlayer) return; var n = changed[c.idx] || 0; G.notify(g, c, { big: true, kind: 'wonder', text: '🌡️ ' + _('The climate has shifted:') + ' ' + _('the world is now') + ' ' + CL.describe(w) + '. ' + (n ? n + ' ' + _('of your tiles changed.') : _('Your lands were spared.')), panel: 'empire' }); });
      }
      return;
    }
    var due = age !== st.lastAge || (age >= CL.SMOKE_AGE && g.turn - st.lastTick >= CL.EVERY);
    if (!due) return;
    st.lastAge = age; st.lastTick = g.turn;
    var target = CL.target(g); if (target === st.warmth && target < 2) return;
    var plan = CL.plan(g, target); if (!plan.length) { st.warmth = target; return; }
    st.pending = { at: g.turn + CL.WARN, warmth: target, tiles: plan };
    g.civs.forEach(function (c) {
      if (!c.isPlayer) return;
      var mine = plan.filter(function (p) { return G.tileOwnerCiv(g, g.tiles[p.i]) === c.idx; }).length;
      var why = age >= CL.SMOKE_AGE ? _('the world\'s Smoke') + ' (' + (AU.Smoke ? AU.Smoke.world(g) : 0) + ')' : _('the turning of the age');
      G.notify(g, c, { big: true, kind: 'wonder', text: '🌡️ ' + (target > st.warmth ? _('The world is warming') : _('The world is cooling')) + ' (' + why + '): ' + _('in') + ' ' + CL.WARN + ' ' + _('turns') + ' ' + plan.length + ' ' + _('tiles shift') + (mine ? ', ' + mine + ' ' + _('of them yours') : '') + '.', tile: mine ? plan.filter(function (p) { return G.tileOwnerCiv(g, g.tiles[p.i]) === c.idx; })[0].i : plan[0].i, panel: 'empire' });
    });
  };
})(globalThis.AU = globalThis.AU || {});
