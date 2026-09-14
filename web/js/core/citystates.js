// City-states: creation, envoys, suzerainty, per-turn behaviour.
(function (AU) {
  var G = AU.G;
  var CS = AU.CityStates = {};

  CS.isMinor = function (civ) { return !!civ.minor; };
  CS.majors = function (g) { return g.civs.filter(function (c) { return !c.minor; }); };
  CS.minors = function (g) { return g.civs.filter(function (c) { return c.minor; }); };
  // Called from G.newGame once the major civilizations and their starts exist. `starts` = unused start tiles.
  CS.setup = function (g, rng, starts, count) {
    var pool = AU.CITY_STATES.slice(); rng.shuffle(pool);
    var n = Math.min(count, starts.length, pool.length);
    for (var i = 0; i < n; i++) {
      var d = pool[i], idx = g.civs.length;
      var civ = { idx: idx, civId: d.id, leaderId: d.leaders[0].id, isPlayer: false, minor: true, stateType: d.type, alive: true, gold: 30, techs: {}, civics: {}, currentTech: null, currentCivic: null,
        techProgress: {}, civicProgress: {}, government: 'chiefdom', explored: new Array(g.W * g.H).fill(0), visible: null, rel: {},
        capital: null, originalCapital: null, cityNameIdx: 0, era: 0, score: 0, met: {}, unitsBuilt: 0, stats: { kills: 0, captures: 0 },
        ai: Object.assign({}, d.leaders[0].ai), flags: {}, bonusScience: 0, bonusCulture: 0, faith: 0, faithTotal: 0, pantheon: null, religion: null, envoysFrom: {} };
      g.civs.push(civ);
      g.civs.forEach(function (o) { if (o !== civ) { civ.rel[o.idx] = { war: false, attitude: 0, warSince: -1, peaceUntil: -1 }; o.rel[civ.idx] = { war: false, attitude: 0, warSince: -1, peaceUntil: -1 }; } });
      var t = starts[i];
      var s = G.foundSettlement(g, idx, t, true);
      s.pop = 2; s.buildings.push('monument'); if (!G.hasBuilding(s, 'walls')) s.buildings.push('walls');
      G.spawnUnit(g, idx, 'warrior', t); G.spawnUnit(g, idx, 'slinger', t);
    }
    g.civs.forEach(function (c) { if (!c.minor) c.envoys = c.envoys || 0; });
    G.assignColors(g);
  };
  CS.envoysOf = function (g, civ, minor) { return (minor.envoysFrom && minor.envoysFrom[civ.idx]) || 0; };
  CS.suzerain = function (g, minor) {
    var best = -1, bn = 2, tie = false;
    for (var k in minor.envoysFrom) { var n = minor.envoysFrom[k]; if (n > bn) { bn = n; best = +k; tie = false; } else if (n === bn && best >= 0) tie = true; }
    if (best < 0 || tie || !g.civs[best] || !g.civs[best].alive) return -1;
    return best;
  };
  CS.sendEnvoy = function (g, civ, minor) {
    if (civ.minor || !minor.minor || !minor.alive || !civ.met[minor.idx] || (civ.envoys || 0) <= 0 || G.atWar(g, civ.idx, minor.idx)) return false;
    civ.envoys--; minor.envoysFrom[civ.idx] = (minor.envoysFrom[civ.idx] || 0) + 1;
    g.civs.forEach(function (c) { c._fx = null; }); g.fxGen = (g.fxGen || 0) + 1;
    var suz = CS.suzerain(g, minor);
    if (civ.isPlayer) G.notify(g, civ, { kind: 'diplomacy', text: 'Envoy sent to ' + G.civData(minor).name + ' (' + minor.envoysFrom[civ.idx] + ')' + (suz === civ.idx ? ' – you are its Suzerain.' : '.'), panel: 'diplomacy' });
    return true;
  };
  CS.grantEnvoy = function (g, civ, n, why) {
    if (civ.minor) return;
    civ.envoys = (civ.envoys || 0) + (n || 1);
    if (civ.isPlayer) G.notify(g, civ, { kind: 'diplomacy', text: '+' + (n || 1) + ' envoy' + ((n || 1) > 1 ? 's' : '') + (why ? ' (' + why + ')' : '') + '. Send them from the Diplomacy panel.', panel: 'diplomacy' });
  };
  // Effects a major civilization gets from its envoys and suzerainties.
  CS.civFx = function (g, civ) {
    var out = [];
    if (civ.minor) return out;
    CS.minors(g).forEach(function (m) {
      if (!m.alive) return;
      var n = CS.envoysOf(g, civ, m); if (!n) return;
      AU.ENVOY_TIERS(m.stateType).forEach(function (t) { if (n >= t.n) out.push(t.fx); });
      if (CS.suzerain(g, m) === civ.idx) out.push(G.civData(m).ability.fx);
    });
    return out;
  };
  CS.fxKey = function (g, civ) { if (civ.minor) return 'm'; var k = ''; CS.minors(g).forEach(function (m) { k += (m.envoysFrom[civ.idx] || 0) + (CS.suzerain(g, m) === civ.idx ? 's' : '') + ','; }); return k; };
  CS.suzerainOf = function (g, civ) { return CS.minors(g).filter(function (m) { return m.alive && CS.suzerain(g, m) === civ.idx; }); };
  // Per-turn: city-states keep a garrison, pay for walls, and slowly gain influence-free gold.
  CS.turn = function (g, minor) {
    if (!minor.alive) return;
    var sets = G.civSettlements(g, minor.idx); if (!sets.length) { minor.alive = false; return; }
    var s = sets[0];
    var mil = G.civUnits(g, minor.idx).filter(G.isMilitary).length;
    var era = 0; g.civs.forEach(function (c) { if (!c.minor && c.alive) era = Math.max(era, c.era); });
    if (mil < 2 + Math.floor(g.turn / 60)) {
      var roster = AU.BARBARIAN_UNITS[Math.min(era, AU.BARBARIAN_UNITS.length - 1)], pick = null;
      roster.forEach(function (id) { if (G.canBuildUnit(g, s, id) || !AU.UNITS[id].tech) pick = pick || id; });
      if (pick) { var cost = G.purchaseCost(g, minor, 'unit', pick, s); if (minor.gold >= cost) { minor.gold -= cost; G.spawnUnit(g, minor.idx, pick, s.tile); } }
    }
    minor.gold += 3;
    // a suzerain's wars are the city-state's wars
    var suz = CS.suzerain(g, minor);
    if (suz >= 0) g.civs.forEach(function (o) { if (!o.minor && o.alive && o.idx !== suz && G.atWar(g, suz, o.idx) && !G.atWar(g, minor.idx, o.idx) && G.rng(g) < 0.3) { minor.rel[o.idx].war = true; minor.rel[o.idx].warSince = g.turn; o.rel[minor.idx].war = true; o.rel[minor.idx].warSince = g.turn; if (o.isPlayer) G.notify(g, o, { kind: 'war', text: G.civData(minor).name + ' joined the war on the side of its Suzerain.', panel: 'diplomacy' }); } });
  };
})(globalThis.AU = globalThis.AU || {});
