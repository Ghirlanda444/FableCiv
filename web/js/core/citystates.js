// Free Cities: independent single-city powers. No tokens: Ties grow from what you do on the map (caravans, garrisons,
// shared religion, quests, gifts) and decay when ignored. Tiers: Acquaintance, Partner, Patron (the closest empire),
// Kin. A Kin free city can join your empire peacefully through a Union.
(function (AU) {
  var G = AU.G;
  var CS = AU.CityStates = {};
  CS.TIERS = [{ n: 10, name: _('Acquaintance') }, { n: 30, name: _('Partner') }, { n: 60, name: _('Patron') }, { n: 90, name: _('Kin') }];
  CS.UNION_TURNS = 20; CS.HOSTILE_TURNS = 30; CS.GIFT_COST = 120; CS.GIFT_TIES = 10; CS.QUEST_TIES = 15; CS.MEET_TIES = 5; CS.PASSIVE_CAP = 75; // gifts, quests and reputation cannot carry you past 75: only caravans, garrisons and faith can

  CS.isMinor = function (civ) { return !!civ.minor; };
  CS.majors = function (g) { return g.civs.filter(function (c) { return !c.minor; }); };
  CS.minors = function (g) { return g.civs.filter(function (c) { return c.minor; }); };
  // Called from G.newGame once the major empires and their starts exist. `starts` = unused start tiles.
  CS.setup = function (g, rng, starts, count) {
    var pool = AU.CITY_STATES.slice(); rng.shuffle(pool);
    var n = Math.min(count, starts.length, pool.length);
    for (var i = 0; i < n; i++) {
      var d = pool[i], idx = g.civs.length;
      var civ = { idx: idx, civId: d.id, leaderId: d.leaders[0].id, isPlayer: false, minor: true, stateType: d.type, alive: true, gold: 30, techs: {}, civics: {}, currentTech: null, currentCivic: null,
        techProgress: {}, civicProgress: {}, government: 'chiefdom', explored: new Array(g.W * g.H).fill(0), visible: null, rel: {},
        capital: null, originalCapital: null, cityNameIdx: 0, era: 0, score: 0, met: {}, unitsBuilt: 0, stats: { kills: 0, captures: 0 },
        ai: Object.assign({}, d.leaders[0].ai), flags: {}, bonusScience: 0, bonusCulture: 0, faith: 0, faithTotal: 0, pantheon: null, religion: null, ties: {}, tieTurn: {}, kinSince: {}, hostileUntil: {} };
      g.civs.push(civ);
      g.civs.forEach(function (o) { if (o !== civ) { civ.rel[o.idx] = { war: false, attitude: 0, warSince: -1, peaceUntil: -1 }; o.rel[civ.idx] = { war: false, attitude: 0, warSince: -1, peaceUntil: -1 }; } });
      var t = starts[i];
      var s = G.foundSettlement(g, idx, t, true);
      s.pop = 2; s.buildings.push('monument'); if (!G.hasBuilding(s, 'walls')) s.buildings.push('walls');
      G.spawnUnit(g, idx, 'warrior', t); G.spawnUnit(g, idx, 'slinger', t);
    }
    G.assignColors(g);
  };
  // ---------- ties ----------
  CS.tiesOf = function (g, civ, minor) { return (minor.ties && minor.ties[civ.idx]) || 0; };
  CS.tierOf = function (n) { var t = 0; CS.TIERS.forEach(function (T, i) { if (n >= T.n) t = i + 1; }); return t; };
  CS.tierName = function (n) { var t = CS.tierOf(n); return t ? CS.TIERS[t - 1].name : _('Stranger'); };
  // The Patron: the empire with the highest Ties, at least 60, and no tie for first place.
  CS.patron = function (g, minor) {
    var best = -1, bn = CS.TIERS[2].n - 1, tie = false;
    for (var k in minor.ties || {}) { var n = minor.ties[k]; if (n > bn) { bn = n; best = +k; tie = false; } else if (n === bn && best >= 0) tie = true; }
    if (tie && minor.patronIdx != null && (minor.ties[minor.patronIdx] || 0) === bn) { best = minor.patronIdx; tie = false; } // a standing Patron keeps the seat on equal Ties
    if (best < 0 || tie || !g.civs[best] || !g.civs[best].alive) return -1;
    return best;
  };
  CS.suzerain = CS.patron; // older code calls it the suzerain
  CS.isHostile = function (g, civ, minor) { return !!(minor.hostileUntil && minor.hostileUntil[civ.idx] > g.turn); };
  CS.addTies = function (g, civ, minor, n, why, active) {
    if (civ.minor || !minor.minor || !minor.alive || civ.idx === minor.idx) return 0;
    if (n > 0 && (G.atWar(g, civ.idx, minor.idx) || CS.isHostile(g, civ, minor))) return 0;
    minor.ties = minor.ties || {}; minor.tieTurn = minor.tieTurn || {};
    var before = minor.ties[civ.idx] || 0, after = Math.max(0, Math.min(100, before + n));
    if (n > 0 && !active && after > CS.PASSIVE_CAP) after = Math.max(before, CS.PASSIVE_CAP);
    minor.ties[civ.idx] = after; if (n > 0) minor.tieTurn[civ.idx] = g.turn;
    if (CS.tierOf(after) !== CS.tierOf(before) || (n > 0 && CS.patron(g, minor) === civ.idx && before < CS.TIERS[2].n)) { g.civs.forEach(function (c) { c._fx = null; }); g.fxGen = (g.fxGen || 0) + 1; }
    if (civ.isPlayer && why && CS.tierOf(after) > CS.tierOf(before)) G.notify(g, civ, { kind: 'diplomacy', text: G.civData(minor).name + ' ' + _('now counts you as') + ' ' + CS.tierName(after) + (CS.patron(g, minor) === civ.idx ? ' ' + _('and its Patron') : '') + ' (' + why + ').', panel: 'diplomacy' });
    return after - before;
  };
  // Reputation with every free city you have met (civics, Great Merchants...). n = ties per city.
  CS.goodwill = function (g, civ, n, why) {
    if (civ.minor) return;
    var hit = 0; CS.minors(g).forEach(function (m) { if (m.alive && civ.met[m.idx]) hit += CS.addTies(g, civ, m, n, why) > 0 ? 1 : 0; });
    if (civ.isPlayer && hit) G.notify(g, civ, { kind: 'diplomacy', text: '+' + n + ' ' + _('Ties with every free city you know') + (why ? ' (' + why + ')' : '') + '.', panel: 'diplomacy' });
  };
  CS.grantEnvoy = function (g, civ, n, why) { CS.goodwill(g, civ, (n || 1), why); };
  // Attacking a free city: every free city turns cold for a while.
  CS.onWarDeclared = function (g, attackerIdx, defenderIdx) {
    var a = g.civs[attackerIdx], d = g.civs[defenderIdx]; if (!a || a.minor || !d || !d.minor) return;
    CS.minors(g).forEach(function (m) { m.hostileUntil = m.hostileUntil || {}; m.hostileUntil[a.idx] = g.turn + CS.HOSTILE_TURNS; if (m.ties) m.ties[a.idx] = 0; if (m.kinSince) delete m.kinSince[a.idx]; });
    g.civs.forEach(function (c) { c._fx = null; }); g.fxGen = (g.fxGen || 0) + 1;
    if (a.isPlayer) G.notify(g, a, { kind: 'war', text: _('Every free city has heard of your attack on') + ' ' + G.civData(d).name + ': ' + _('all your Ties are lost for') + ' ' + CS.HOSTILE_TURNS + ' turns.', panel: 'diplomacy' });
  };
  // What builds Ties this turn for one empire with one free city.
  CS.sources = function (g, civ, minor) {
    var out = [], sets = G.civSettlements(g, minor.idx), s = sets[0]; if (!s) return out;
    var owned = {}; s.tiles.forEach(function (i) { owned[i] = true; });
    var caravan = false, garrison = false;
    G.civUnits(g, civ.idx).forEach(function (u) { if (!owned[u.tile]) return; if (u.route === minor.idx && AU.UNITS[u.type].caravan) caravan = true; else if (G.isMilitary(u)) garrison = true; });
    if (caravan) out.push({ id: 'caravan', n: 3, text: 'trade route' });
    if (garrison) out.push({ id: 'garrison', n: 1, text: _('your soldiers protect them') });
    var fx = G.civFx(g, civ);
    if (civ.religion && s.religion === civ.religion) out.push({ id: 'religion', n: 1 + (fx.tiesFollowerCity || 0), text: 'shared religion' });
    if (fx.tiesPerTurn) out.push({ id: 'ability', n: fx.tiesPerTurn, text: _("your people's way with free cities") });
    return out;
  };
  // Effects a major empire gets from its Ties: Partner, Patron (with the free city's special bonus), Kin.
  CS.civFx = function (g, civ) {
    var out = [];
    if (civ.minor) return out;
    CS.minors(g).forEach(function (m) {
      if (!m.alive) return;
      var n = CS.tiesOf(g, civ, m), tier = CS.tierOf(n); if (tier < 2) return;
      var tiers = AU.ENVOY_TIERS(m.stateType), patron = CS.patron(g, m) === civ.idx;
      out.push(tiers[0].fx);
      if (patron) { out.push(tiers[1].fx); out.push(G.civData(m).ability.fx); }
      if (tier >= 4 && patron) out.push(tiers[2].fx);
    });
    (civ.unions || []).forEach(function (id) { var d = AU.CITY_STATE_BY_ID[id]; if (d) out.push(d.ability.fx); });
    return out;
  };
  CS.fxKey = function (g, civ) { if (civ.minor) return 'm'; var k = ''; CS.minors(g).forEach(function (m) { k += CS.tierOf(CS.tiesOf(g, civ, m)) + (CS.patron(g, m) === civ.idx ? 's' : '') + ','; }); return k + (civ.unions || []).length; };
  CS.suzerainOf = function (g, civ) { return CS.minors(g).filter(function (m) { return m.alive && CS.patron(g, m) === civ.idx; }); };
  // ---------- union ----------
  CS.unionState = function (g, civ, minor) {
    if (civ.minor || !minor.alive || G.atWar(g, civ.idx, minor.idx)) return { ok: false, why: 'not possible' };
    if (CS.patron(g, minor) !== civ.idx || CS.tierOf(CS.tiesOf(g, civ, minor)) < 4) return { ok: false, why: _('you must be its Patron with Kin ties (90)') };
    var since = minor.kinSince && minor.kinSince[civ.idx], left = since == null ? CS.UNION_TURNS : Math.max(0, CS.UNION_TURNS - (g.turn - since));
    if (left > 0) return { ok: false, why: left + ' ' + _('more turn') + (left > 1 ? 's' : '') + ' ' + _('as Kin') };
    var s = G.civSettlements(g, minor.idx)[0], touching = false;
    s.tiles.forEach(function (i) { G.neighbors(g, g.tiles[i]).forEach(function (n) { if (G.tileOwnerCiv(g, g.tiles[n]) === civ.idx) touching = true; }); });
    if (!touching) return { ok: false, why: _('your borders must touch theirs') };
    return { ok: true, why: '' };
  };
  CS.union = function (g, civ, minor) {
    if (!CS.unionState(g, civ, minor).ok) return false;
    var s = G.civSettlements(g, minor.idx)[0], name = G.civData(minor).name;
    s.civ = civ.idx; s.isCity = false; s.isCapital = false; s.captured = false; s.specialization = null; s.union = minor.civId; s.pendingGrowth = 0;
    G.civUnits(g, minor.idx).forEach(function (u) { if (G.isMilitary(u)) u.civ = civ.idx; else G.removeUnit(g, u); });
    minor.alive = false; minor.capital = null;
    civ.unions = (civ.unions || []).concat([minor.civId]);
    g.civs.forEach(function (c) { c._fx = null; }); g.fxGen = (g.fxGen || 0) + 1;
    G.log(g, name + ' joined ' + G.civData(civ).name + ' ' + _('in a Union.'), civ.idx);
    g.civs.forEach(function (c) { if (c.alive && !c.minor && (c.idx === civ.idx || c.met[civ.idx])) G.notify(g, c, { kind: 'diplomacy', text: name + ' joined ' + (c.idx === civ.idx ? 'your empire' : G.civData(civ).name) + ' ' + _('in a Union: it is now a Town') + (c.idx === civ.idx ? ' ' + _('and keeps its bonus') + ' (' + G.civData(minor).ability.name + ') forever.' : '.'), tile: s.tile, settlement: s.id }); });
    G.revealAround(g, civ, g.tiles[s.tile].col, g.tiles[s.tile].row, 3);
    return true;
  };
  // ---------- per turn ----------
  CS.turn = function (g, minor) {
    if (!minor.alive) return;
    var sets = G.civSettlements(g, minor.idx); if (!sets.length) { minor.alive = false; return; }
    var s = sets[0];
    // ties: grow from sources, decay when ignored for 10 turns
    minor.ties = minor.ties || {}; minor.tieTurn = minor.tieTurn || {}; minor.kinSince = minor.kinSince || {};
    CS.majors(g).forEach(function (c) {
      if (!c.alive || !c.met[minor.idx]) return;
      var war = G.atWar(g, c.idx, minor.idx), gain = 0;
      if (!war && !CS.isHostile(g, c, minor)) CS.sources(g, c, minor).forEach(function (src) { gain += src.n; });
      if (gain > 0) CS.addTies(g, c, minor, gain, 'ties grow', true);
      else if ((minor.ties[c.idx] || 0) > CS.TIERS[2].n) CS.addTies(g, c, minor, -1); // a Patron who stops showing up slips back
      else if ((minor.ties[c.idx] || 0) > 0 && g.turn - (minor.tieTurn[c.idx] || 0) > 10) CS.addTies(g, c, minor, -1);
      var kin = CS.patron(g, minor) === c.idx && CS.tierOf(minor.ties[c.idx] || 0) >= 4;
      if (kin) { if (minor.kinSince[c.idx] == null) minor.kinSince[c.idx] = g.turn; } else delete minor.kinSince[c.idx];
    });
    minor.patronIdx = CS.patron(g, minor); if (minor.patronIdx < 0) delete minor.patronIdx;
    var mil = G.civUnits(g, minor.idx).filter(G.isMilitary).length;
    var era = 0; g.civs.forEach(function (c) { if (!c.minor && c.alive) era = Math.max(era, c.era); });
    if (mil < 2 + Math.floor(g.turn / 60)) {
      var roster = AU.BARBARIAN_UNITS[Math.min(era, AU.BARBARIAN_UNITS.length - 1)], pick = null;
      roster.forEach(function (id) { if (G.canBuildUnit(g, s, id) || !AU.UNITS[id].tech) pick = pick || id; });
      if (pick) { var cost = G.purchaseCost(g, minor, 'unit', pick, s); if (minor.gold >= cost) { minor.gold -= cost; G.spawnUnit(g, minor.idx, pick, s.tile); } }
    }
    minor.gold += 3;
    // a Patron's wars are the free city's wars (Kin always, Patron sometimes)
    var pat = CS.patron(g, minor);
    if (pat >= 0) { var kinNow = CS.tierOf(minor.ties[pat] || 0) >= 4; g.civs.forEach(function (o) { if (!o.minor && o.alive && o.idx !== pat && G.atWar(g, pat, o.idx) && !G.atWar(g, minor.idx, o.idx) && (kinNow || G.rng(g) < 0.3)) { minor.rel[o.idx].war = true; minor.rel[o.idx].warSince = g.turn; o.rel[minor.idx].war = true; o.rel[minor.idx].warSince = g.turn; if (o.isPlayer) G.notify(g, o, { kind: 'war', text: G.civData(minor).name + ' ' + _('joined the war on the side of its Patron.'), panel: 'diplomacy' }); } }); }
  };
  // ---------- caravans (trade routes) ----------
  CS.caravanLimit = function (g, civ) { var n = 1; G.civSettlements(g, civ.idx).forEach(function (s) { if (G.hasBuilding(s, 'market')) n++; if (G.hasBuilding(s, 'harbor')) n++; }); return n + (G.civFx(g, civ).extraCaravans || 0); };
  CS.caravans = function (g, civ) { return G.civUnits(g, civ.idx).filter(function (u) { return AU.UNITS[u.type].caravan; }); };
  CS.routeTarget = function (g, u) { var o = G.tileOwnerCiv(g, g.tiles[u.tile]); if (o < 0 || !g.civs[o] || !g.civs[o].minor || !g.civs[o].alive || G.atWar(g, u.civ, o)) return null; return g.civs[o]; };
  CS.routeIncome = function (g, u) { var civ = g.civs[u.civ], cap = civ.capital && g.settlements[civ.capital], extra = G.civFx(g, civ).caravanGold || 0; if (!cap) return 3 + extra; return Math.min(8, 3 + Math.floor(G.dist(g.tiles[cap.tile], g.tiles[u.tile]) / 3)) + extra; };
  CS.openRoute = function (g, u) {
    var m = CS.routeTarget(g, u); if (!m || u.route === m.idx) return false;
    if (CS.caravans(g, g.civs[u.civ]).some(function (o) { return o.id !== u.id && o.route === m.idx; })) return false; // one route per free city
    u.route = m.idx; u.sleep = true; u.moves = 0; u.name = _('Caravan to') + ' ' + G.civData(m).name;
    if (g.civs[u.civ].isPlayer) G.notify(g, g.civs[u.civ], { kind: 'diplomacy', text: _('Trade route open with') + ' ' + G.civData(m).name + ': +' + CS.routeIncome(g, u) + ' ' + _('Gold and') + ' +3 ' + _('Ties every turn while the caravan stays.'), tile: u.tile });
    return true;
  };
  // Called each turn for an empire: route gold, and routes that no longer hold end.
  CS.routesTurn = function (g, civ) {
    var gold = 0;
    CS.caravans(g, civ).forEach(function (u) {
      if (u.route == null) return;
      var m = g.civs[u.route], ok = m && m.alive && G.tileOwnerCiv(g, g.tiles[u.tile]) === u.route && !G.atWar(g, civ.idx, u.route);
      if (!ok) { u.route = null; u.sleep = false; u.name = AU.UNITS[u.type].name; if (civ.isPlayer) G.notify(g, civ, { kind: 'diplomacy', text: _('A trade route ended: the caravan is free again.'), tile: u.tile }); return; }
      gold += CS.routeIncome(g, u);
    });
    if (gold) civ.gold += gold;
    return gold;
  };
})(globalThis.AU = globalThis.AU || {});
