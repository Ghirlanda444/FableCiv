// Great People rules: points per turn, recruiting, patronage with Faith or Gold, and what each one does.
(function (AU) {
  var G = AU.G;
  var GP = AU.Great = {};
  GP.state = function (civ) { if (!civ.great) civ.great = { pts: {}, count: {}, used: {} }; return civ.great; };
  GP.available = function (g, civ, type) { // prophets stop being earned once you have a religion or none can be founded
    if (type !== 'prophet') return true;
    var R = AU.Religion; if (!R) return false;
    if (!civ.pantheon || civ.religion || R.religionsFounded(g) >= R.maxReligions(g)) return false;
    return !G.civUnits(g, civ.idx).some(function (u) { return AU.UNITS[u.type].great === 'prophet'; }); // one prophet at a time
  };
  GP.pointsPerTurn = function (g, civ) {
    var out = {}; AU.GREAT_ORDER.forEach(function (t) { out[t] = 0; });
    G.civSettlements(g, civ.idx).forEach(function (s) { s.buildings.forEach(function (b) { var p = AU.GREAT_POINTS[b]; if (p) for (var t in p) out[t] += p[t]; }); });
    var y = G.civYields(g, civ); out.prophet += Math.floor((y.faith || 0) / 3);
    var fx = G.civFx(g, civ); if (fx.greatPeopleMult) for (var k in out) out[k] = Math.round(out[k] * fx.greatPeopleMult);
    AU.GREAT_ORDER.forEach(function (t) { if (!GP.available(g, civ, t)) out[t] = 0; });
    return out;
  };
  GP.cost = function (g, civ, type) { var n = GP.state(civ).count[type] || 0; return Math.round((type === 'prophet' ? 60 : 80) * (1 + n * 0.6) * G.speed(g)); };
  GP.pickName = function (g, civ, type) {
    var st = GP.state(civ), used = st.used[type] = st.used[type] || {}, taken = {};
    g.civs.forEach(function (c) { if (c.great && c.great.used && c.great.used[type]) for (var n in c.great.used[type]) taken[n] = 1; });
    var list = AU.GREAT_NAMES[type] || [], era = civ.era || 0, pick = null;
    for (var i = 0; i < list.length && !pick; i++) if (!taken[list[i][1]] && list[i][0] <= era + 1) pick = list[i][1];
    for (var j = 0; j < list.length && !pick; j++) if (!taken[list[j][1]]) pick = list[j][1];
    if (!pick) pick = AU.GREAT_TYPES[type].name;
    used[pick] = 1; return pick;
  };
  GP.recruit = function (g, civ, type, how) {
    var st = GP.state(civ), T = AU.GREAT_TYPES[type];
    var home = civ.capital && g.settlements[civ.capital] ? g.settlements[civ.capital] : G.civSettlements(g, civ.idx)[0]; if (!home) return null;
    var tile = AU.U.tileBlocked(g, { civ: civ.idx, type: T.unit }, home.tile, true) ? G.findSpawnTile(g, home, T.unit) : home.tile; if (tile == null) tile = home.tile;
    var name = GP.pickName(g, civ, type);
    var u = G.spawnUnit(g, civ.idx, T.unit, tile, { name: name, greatType: type });
    st.count[type] = (st.count[type] || 0) + 1;
    G.notify(g, civ, { kind: 'great', text: T.icon + ' ' + name + ', a ' + T.name + ', has joined you in ' + home.name + (how ? ' (' + how + ')' : '') + '.', tile: tile });
    G.log(g, G.civData(civ).name + ' recruited the ' + T.name + ' ' + name + '.', civ.idx);
    if (civ.isPlayer && G.quote) G.quote(g, civ, 'great', type, name, T.name);
    return u;
  };
  GP.turn = function (g, civ) {
    if (civ.minor || !civ.alive || !civ.capital) return;
    var st = GP.state(civ), ppt = GP.pointsPerTurn(g, civ);
    AU.GREAT_ORDER.forEach(function (t) {
      if (!ppt[t]) return;
      st.pts[t] = (st.pts[t] || 0) + ppt[t];
      var cost = GP.cost(g, civ, t);
      if (st.pts[t] >= cost) { st.pts[t] -= cost; GP.recruit(g, civ, t); }
    });
  };
  // Patronage: pay the missing points with Faith (×3) or Gold (×6), allowed from half way.
  GP.patronCost = function (g, civ, type, currency) { var st = GP.state(civ), missing = Math.max(0, GP.cost(g, civ, type) - (st.pts[type] || 0)); return Math.max(1, Math.round(missing * (currency === 'gold' ? 6 : 3))); };
  GP.canPatronize = function (g, civ, type, currency) {
    if (!GP.available(g, civ, type)) return false;
    var st = GP.state(civ), cost = GP.cost(g, civ, type); if ((st.pts[type] || 0) < cost * 0.5) return false;
    var price = GP.patronCost(g, civ, type, currency); return currency === 'gold' ? civ.gold >= price : civ.faith >= price;
  };
  GP.patronize = function (g, civ, type, currency) {
    if (!GP.canPatronize(g, civ, type, currency)) return null;
    var price = GP.patronCost(g, civ, type, currency); if (currency === 'gold') civ.gold -= price; else civ.faith -= price;
    GP.state(civ).pts[type] = 0; return GP.recruit(g, civ, type, 'with ' + (currency === 'gold' ? 'Gold' : 'Faith'));
  };
  // ---------- using a Great Person ----------
  GP.typeOf = function (u) { return u.greatType || (AU.UNITS[u.type] && AU.UNITS[u.type].great) || null; };
  GP.burst = function (g, civ, base) { return Math.round(base * (1 + (civ.era || 0) * 0.6) * G.speed(g)); };
  // What the unit can do where it stands: {action, label, ok, why}
  GP.options = function (g, u) {
    var type = GP.typeOf(u); if (!type) return [];
    var civ = g.civs[u.civ], s = G.settlementAt(g, u.tile), own = s && s.civ === u.civ, t = g.tiles[u.tile], inside = G.tileOwnerCiv(g, t) === u.civ, R = AU.Religion, out = [];
    switch (type) {
      case 'prophet':
        if (R && !civ.religion && R.religionsFounded(g) < R.maxReligions(g)) out.push({ action: 'greatfound', label: '🕊️ Found a religion here', ok: !!own && !!civ.pantheon, why: !own ? 'Move into one of your settlements.' : !civ.pantheon ? 'Choose a pantheon first (Religion panel).' : '' });
        else if (civ.religion) out.push({ action: 'greatuse', label: '🕊️ Convert ' + (s ? s.name : 'this settlement') + ' to ' + R.name(g, civ.religion), ok: !!s, why: 'Move into a settlement.' });
        else out.push({ action: 'greatuse', label: '🕊️ Retire for ' + GP.burst(g, civ, 120) + ' Faith', ok: true, why: '' });
        break;
      case 'scientist': { var cur = civ.currentTech ? AU.TECH_BY_ID[civ.currentTech] : null, cheapest = G.availableTechs(civ).sort(function (a, b) { return a.cost - b.cost; })[0]; var tech = cur || cheapest;
        out.push({ action: 'greatuse', label: '🔬 Discover ' + (tech ? tech.name : 'a technology') + ' now', ok: inside && !!tech, why: !inside ? 'Move inside your borders.' : !tech ? 'Nothing left to research.' : '' }); break; }
      case 'engineer': out.push({ action: 'greatuse', label: '⚙️ ' + (own && s.isCity && s.queue.length ? 'Add ' + GP.burst(g, civ, 150) + ' Production to ' + (AU.Panels ? AU.Panels.itemName(g, civ, s.queue[0]) : 'the build') : 'Turn skill into ' + GP.burst(g, civ, 150) + ' Gold' + (own && s.isCity ? ' (queue a wonder here first to get Production instead)' : '')), ok: !!own, why: 'Move into one of your settlements.' }); break;
      case 'merchant': out.push({ action: 'greatuse', label: '💰 Trade mission: +' + GP.burst(g, civ, 200) + ' Gold and +15 Ties with every free city', ok: !!own, why: 'Move into one of your settlements.' }); break;
      case 'artist': out.push({ action: 'greatuse', label: '🎨 Create a Great Work here (+3 🎭 +3 🧳 per turn)', ok: !!own, why: 'Move into one of your settlements.' }); break;
      case 'general': case 'admiral': out.push({ action: 'greatuse', label: (type === 'general' ? '⚔️' : '⚓') + ' Retire: heal every friendly unit within 2 tiles', ok: true, why: '' }); break;
    }
    return out;
  };
  GP.use = function (g, u) {
    var type = GP.typeOf(u); if (!type) return false;
    var civ = g.civs[u.civ], s = G.settlementAt(g, u.tile), opt = GP.options(g, u).filter(function (o) { return o.action === 'greatuse'; })[0];
    if (!opt || !opt.ok) return false;
    var R = AU.Religion, msg = '';
    switch (type) {
      case 'prophet':
        if (civ.religion && s) { s.pressure = s.pressure || {}; s.pressure[civ.religion] = (s.pressure[civ.religion] || 0) + 300; s.religion = civ.religion; msg = s.name + ' now follows ' + R.name(g, civ.religion) + '.'; }
        else { civ.faith += GP.burst(g, civ, 120); msg = u.name + ' retires; +' + GP.burst(g, civ, 120) + ' Faith.'; }
        break;
      case 'scientist': { var tech = (civ.currentTech ? AU.TECH_BY_ID[civ.currentTech] : null) || G.availableTechs(civ).sort(function (a, b) { return a.cost - b.cost; })[0]; if (!tech) return false; G.learnTech(g, civ, tech.id); msg = u.name + ' discovers ' + tech.name + '!'; break; }
      case 'engineer': { var amt = GP.burst(g, civ, 150); if (s.isCity && s.queue.length) { var q = s.queue[0], key = q.kind + ':' + q.id; s.progress[key] = (s.progress[key] || 0) + amt; msg = u.name + ' adds ' + amt + ' Production in ' + s.name + '.'; } else { civ.gold += amt; msg = u.name + ' brings ' + amt + ' Gold.'; } break; }
      case 'merchant': { var gold = GP.burst(g, civ, 200); civ.gold += gold; if (AU.CityStates) AU.CityStates.goodwill(g, civ, 15, u.name); msg = u.name + ' brings ' + gold + ' Gold and goodwill among the free cities.'; break; }
      case 'artist': s.greatWorks = (s.greatWorks || 0) + 1; s.greatWorkNames = (s.greatWorkNames || []).concat([u.name]); civ._fx = null; msg = u.name + ' creates a Great Work in ' + s.name + '.'; break;
      case 'general': case 'admiral': { var n = 0; G.civUnits(g, civ.idx).forEach(function (o) { if (o.id !== u.id && G.dist(g.tiles[o.tile], g.tiles[u.tile]) <= 2 && o.hp < 100) { o.hp = 100; n++; } }); msg = u.name + ' retires; ' + n + ' unit' + (n === 1 ? '' : 's') + ' healed.'; break; }
    }
    G.log(g, msg, civ.idx); if (civ.isPlayer) G.notify(g, civ, { kind: 'great', text: msg, tile: u.tile });
    G.removeUnit(g, u);
    return true;
  };
  // Combat aura of Generals (land) and Admirals (naval): +5 strength within 2 tiles of a friendly one.
  GP.aura = function (g, u, naval) {
    var want = naval ? 'admiral' : 'general', t = g.tiles[u.tile], bonus = 0;
    G.civUnits(g, u.civ).forEach(function (o) { if (GP.typeOf(o) === want && G.dist(g.tiles[o.tile], t) <= 2) bonus = 5; });
    return bonus;
  };
  GP.hasAdmiralNear = function (g, u) { return GP.aura(g, u, true) > 0; };
})(globalThis.AU = globalThis.AU || {});
