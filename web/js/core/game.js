// Core rules: state, settlements (towns & cities), yields, research, diplomacy, turn processing, victory.
(function (AU) {
  var Hex = AU.Hex;
  var G = AU.G = {};
  var YIELD_KEYS = ['food', 'production', 'gold', 'science', 'culture', 'faith', 'happiness'];
  AU.YIELD_KEYS = YIELD_KEYS;

  function zeroYields() { return { food: 0, production: 0, gold: 0, science: 0, culture: 0, happiness: 0 }; }
  function add(a, b) { return AU.addYields(a, b); }
  var MULT_OBJ = { yieldMult: 1, capitalMult: 1, cityYieldMult: 1, classCostMult: 1, buildingDiscount: 1 };
  var CONCAT = { tileBonus: 1, settlementSiteBonus: 1 };
  var NESTED = { buildingBonus: 1, specializationYields: 1 };
  var ADD_OBJ = { classBonus: 1, classMoves: 1, classBonusVsSettlements: 1, specializedTownYields: 1, townYields: 1, citySiteYields: 1, coastalSettlementYields: 1 };
  function mergeFx(into, fx) {
    if (!fx) return into;
    for (var k in fx) {
      var v = fx[k];
      if (MULT_OBJ[k]) { into[k] = into[k] || {}; for (var y in v) into[k][y] = (into[k][y] || 1) + (v[y] - 1); } // percentages add up instead of compounding (+15% and +10% give +25%, not +26.5%)
      else if (CONCAT[k]) into[k] = (into[k] || []).concat(v);
      else if (NESTED[k]) { into[k] = into[k] || {}; for (var b in v) into[k][b] = add(into[k][b] || {}, v[b]); }
      else if (ADD_OBJ[k]) into[k] = add(into[k] || {}, v);
      else if (/Mult$/.test(k)) into[k] = (into[k] || 1) * v;
      else if (typeof v === 'number') into[k] = (into[k] || 0) + v;
      else if (typeof v === 'boolean') into[k] = into[k] || v;
      else if (typeof v === 'object') into[k] = Object.assign(into[k] || {}, v);
      else into[k] = v;
    }
    return into;
  }
  G.zeroYields = zeroYields;

  // ---------- Game creation ----------
  AU.SPEEDS = {
    quick:    { name: _('Quick'),    mult: 0.67, turns: 330 },
    standard: { name: _('Standard'), mult: 1.0,  turns: 500 },
    epic:     { name: _('Epic'),     mult: 1.5,  turns: 750 },
    marathon: { name: _('Marathon'), mult: 3.0,  turns: 1500 }
  };
  G.speed = function (g) { return (AU.SPEEDS[g.speed] || AU.SPEEDS.standard).mult; };
  G.newGame = function (opts) {
    var sc = opts.scenario && AU.SCENARIOS ? AU.SCENARIOS[opts.scenario] : null, tpl = sc ? AU.scenarioTemplate(sc) : null;
    var size = sc ? { w: tpl.w, h: tpl.h, camps: sc.camps || 12 } : AU.MAP_SIZES[opts.mapSize || 'small'];
    var numCivs = sc ? sc.civs.length : Math.min(AU.CIVS.length, opts.numCivs || size.civs);
    var seed = opts.seed || (Date.now() & 0x7fffffff);
    var rng = new AU.RNG(seed ^ 0x5bd1e995);
    var speed = AU.SPEEDS[opts.speed] ? opts.speed : (sc && sc.speed) || 'standard';
    var map = AU.generateMap({ v2: !!opts.v2, seed: seed, width: size.w, height: size.h, numCivs: numCivs, numCamps: size.camps, mapType: opts.mapType || 'continents', extraStarts: 3 + (opts.numStates !== undefined ? opts.numStates : Math.round(numCivs * 0.6)), template: tpl });
    numCivs = Math.min(numCivs, map.starts.length);
    var g = {
      version: 1, seed: seed, turn: 1, W: map.width, H: map.height, tiles: map.tiles, rivers: map.rivers,
      civs: [], units: {}, settlements: {}, nextId: 1, camps: map.camps.map(function (i) { return { tile: i, counter: 4 + rng.int(4) }; }),
      wonders: {}, religions: {}, naturalFound: {}, difficulty: opts.difficulty || 'prince', maxTurns: opts.maxTurns || AU.SPEEDS[speed].turns, victory: null, log: [], notifications: [],
      playerIdx: 0, rngState: rng.s, speed: speed, mapType: sc ? sc.map : (opts.mapType || 'continents'), scenario: sc ? sc.id : null, v2: !!opts.v2
    };
    // pick civs: player's chosen one first, then random others (a scenario fixes the cast and their leaders)
    var ids, scStart = {};
    if (sc) {
      var playerCiv = sc.civs.some(function (cv) { return cv.civ === opts.playerCiv; }) ? opts.playerCiv : sc.civs[0].civ;
      sc.civs.forEach(function (cv, k) { scStart[cv.civ] = map.starts[k]; });
      ids = [playerCiv].concat(sc.civs.map(function (cv) { return cv.civ; }).filter(function (id) { return id !== playerCiv; }));
      map.starts = ids.map(function (id) { return scStart[id]; }).concat(map.starts.slice(sc.civs.length));
    } else {
      var pool = AU.CIVS.map(function (c) { return c.id; }).filter(function (id) { return id !== opts.playerCiv; });
      rng.shuffle(pool);
      ids = [opts.playerCiv].concat(pool.slice(0, Math.max(0, numCivs - 1)));
    }
    ids.forEach(function (id, idx) {
      var data = AU.CIV_BY_ID[id], scCiv = sc ? sc.civs.filter(function (cv) { return cv.civ === id; })[0] : null;
      var leader = idx === 0 && opts.playerLeader && AU.LEADER_BY_ID[opts.playerLeader] && AU.LEADER_BY_ID[opts.playerLeader].civId === id ? opts.playerLeader : scCiv && AU.LEADER_BY_ID[scCiv.leader] ? scCiv.leader : rng.pick(data.leaders).id;
      var civ = { idx: idx, civId: id, leaderId: leader, isPlayer: idx === 0, alive: true, gold: 0, techs: {}, civics: {}, currentTech: null, currentCivic: null,
        techProgress: {}, civicProgress: {}, government: 'chiefdom', explored: new Array(g.W * g.H).fill(0), visible: null, rel: {},
        capital: null, originalCapital: null, cityNameIdx: 0, era: 0, score: 0, met: {}, unitsBuilt: 0, stats: { kills: 0, captures: 0 },
        ai: idx === 0 ? null : Object.assign({}, AU.LEADER_BY_ID[leader].ai), flags: {}, bonusScience: 0, bonusCulture: 0, faith: 0, faithTotal: 0, pantheon: null, religion: null };
      g.civs.push(civ);
    });
    g.civs.forEach(function (a) { g.civs.forEach(function (b) { if (a !== b) a.rel[b.idx] = { war: false, attitude: (G.civFx(g, b).attitudeBonus || 0), warSince: -1, peaceUntil: -1 }; }); });
    G.assignColors(g);
    // Start biases: each empire (player first) takes the free start that suits it best (scenarios fix every start).
    var pool = map.starts.slice(), picked = [];
    if (sc) { picked = pool.splice(0, g.civs.length); }
    else g.civs.forEach(function (civ) {
      var data = AU.CIV_BY_ID[civ.civId], bias = data.bias || [], best = 0, bs = -1e9;
      pool.forEach(function (tileIdx, k) { var sc2 = G.biasScore(g, g.tiles[tileIdx], bias) - k * 0.15; if (sc2 > bs) { bs = sc2; best = k; } });
      picked.push(pool.splice(best, 1)[0]);
    });
    map.starts = picked;
    var diff = AU.DIFFICULTIES[g.difficulty];
    var nStates = sc ? pool.length : opts.numStates !== undefined ? opts.numStates : Math.round(numCivs * 0.6);
    // starting units
    g.civs.forEach(function (civ, idx) {
      var start = map.starts[idx];
      var t = g.tiles[start];
      var nb = Hex.neighborsOf(t.col, t.row, g.W, g.H).filter(function (n) { return G.passable(g, g.tiles[n]); });
      if (sc && sc.foundCapitals) { // the capital already stands, with its historical name
        var cap = G.foundSettlement(g, civ.idx, start, true); if (sc.capitalNames && sc.capitalNames[civ.civId]) cap.name = sc.capitalNames[civ.civId];
        cap.pop = 2; if (!G.hasBuilding(cap, 'monument')) cap.buildings.push('monument');
        G.spawnUnit(g, civ.idx, 'settler', start); G.spawnUnit(g, civ.idx, 'warrior', start);
        for (var w2 = 0; w2 < (sc.extraWarriors || 0) && w2 < nb.length; w2++) G.spawnUnit(g, civ.idx, 'warrior', nb[w2]);
      } else { G.spawnUnit(g, civ.idx, 'settler', start); G.spawnUnit(g, civ.idx, 'warrior', start); }
      if (nb.length) G.spawnUnit(g, civ.idx, 'scout', nb[0]);
      if (!civ.isPlayer) {
        for (var k = 0; k < diff.aiUnits && k < nb.length; k++) G.spawnUnit(g, civ.idx, 'warrior', nb[k]);
        for (var s = 0; s < diff.aiSettlers; s++) G.spawnUnit(g, civ.idx, 'settler', start);
      } else civ.gold += diff.playerBonusGold;
      G.revealAround(g, civ, t.col, t.row, 3);
    });
    g.camps.forEach(function (c) { G.spawnUnit(g, -1, 'warrior', c.tile); });
    G.refreshVisibility(g, g.civs[0]);
    G.log(g, _('The world of Ages Unbroken begins. Turn 1.'));
    if (AU.CityStates && nStates > 0) { AU.CityStates.setup(g, rng, pool, nStates, map.stateIds); G.refreshVisibility(g, G.player(g)); }
    return g;
  };

  G.rng = function (g) { var r = new AU.RNG(g.rngState); var v = r.next(); g.rngState = r.s; return v; };
  G.rngInt = function (g, n) { return Math.floor(G.rng(g) * n); };
  G.log = function (g, msg, civIdx) { g.log.push({ turn: g.turn, msg: msg, civ: civIdx }); if (g.log.length > 300) g.log.shift(); };
  G.notify = function (g, civ, n) { if (!civ.isPlayer) return; n.turn = g.turn; g.notifications.push(n); };
  G.quote = function (g, civ, cat, id, title, kicker, tile) { if (!civ.isPlayer) return; var q = AU.QUOTES && AU.QUOTES[cat] && AU.QUOTES[cat][id]; if (!q) return; g.quoteQueue = g.quoteQueue || []; g.quoteQueue.push({ kicker: kicker, title: title, text: q.text, by: q.by, cat: cat, id: id, tile: tile }); };
  G.civData = function (civ) { return AU.CIV_BY_ID[civ.civId] || AU.CITY_STATE_BY_ID[civ.civId]; };
  G.civColor = function (civ) { return civ.color || G.civData(civ).color; };
  // Make sure no two empires in the same game share a near-identical banner colour.
  G.assignColors = function (g) {
    function toRgb(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
    function toHex(c) { return '#' + c.map(function (v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? '0' : '') + v.toString(16); }).join(''); }
    function dist(a, b) { return Math.sqrt((a[0] - b[0]) * (a[0] - b[0]) + (a[1] - b[1]) * (a[1] - b[1]) + (a[2] - b[2]) * (a[2] - b[2])); }
    var used = [];
    g.civs.forEach(function (civ) {
      var c = toRgb(G.civData(civ).color), tries = 0;
      while (tries < 6 && used.some(function (u) { return dist(u, c) < 70; })) {
        var f = tries % 2 === 0 ? 1.45 + tries * 0.1 : 0.55 - tries * 0.05;
        var base = toRgb(G.civData(civ).color);
        c = [base[0] * f, base[1] * f, base[2] * f];
        if (tries >= 2) { c = [c[2], c[0], c[1]]; } // rotate hue channels as a last resort
        tries++;
      }
      used.push(c); civ.color = toHex(c);
    });
  };
  G.leaderData = function (civ) { return AU.LEADER_BY_ID[civ.leaderId] || G.civData(civ).leaders[0]; };
  G.leaderName = function (civ) { return G.leaderData(civ).name; };
  G.capitalContinent = function (g, civ) { var c = civ.capital && g.settlements[civ.capital]; return c ? g.tiles[c.tile].continent : -2; };
  G.player = function (g) { return g.civs[g.playerIdx]; };
  G.tileAt = function (g, col, row) { return g.tiles[row * g.W + col]; };
  G.neighbors = function (g, t) { return Hex.neighborsOf(t.col, t.row, g.W, g.H); };
  G.dist = function (a, b) { return Hex.distance(a.col, a.row, b.col, b.row); };
  G.meet = function (g, a, b) { if (AU.Diplo) return AU.Diplo.onMeet(g, a, b); var ca = g.civs[a], cb = g.civs[b]; if (!ca || !cb) return false; var n = !ca.met[b]; ca.met[b] = true; cb.met[a] = true; return n; };
  G.isWater = function (t) { return !!AU.TERRAIN[t.terrain].water; };
  G.passable = function (g, t) { return !AU.TERRAIN[t.terrain].impassable && !G.isWater(t); };
  G.settlementAt = function (g, tileIdx) { var t = g.tiles[tileIdx]; return t.settlement != null ? g.settlements[t.settlement] : null; };
  var EMPTY = [];
  G.unitIndex = function (g) {
    if (g._ubt) return g._ubt;
    var idx = {}; for (var id in g.units) { var u = g.units[id]; (idx[u.tile] = idx[u.tile] || []).push(u); }
    g._ubt = idx; return idx;
  };
  G.unitsAt = function (g, tileIdx) { var arr = G.unitIndex(g)[tileIdx]; return arr ? arr.slice() : EMPTY; };
  G.unitMoved = function (g, u, from, to) {
    var idx = G.unitIndex(g);
    if (idx[from]) { idx[from] = idx[from].filter(function (o) { return o.id !== u.id; }); if (!idx[from].length) delete idx[from]; }
    (idx[to] = idx[to] || []).push(u);
  };
  G.civUnits = function (g, civIdx) { var out = []; for (var id in g.units) if (g.units[id].civ === civIdx) out.push(g.units[id]); return out; };
  G.civSettlements = function (g, civIdx) { var out = []; for (var id in g.settlements) if (g.settlements[id].civ === civIdx) out.push(g.settlements[id]); return out; };
  G.tileOwnerCiv = function (g, t) { if (t.owner < 0) return -1; var s = g.settlements[t.owner]; return s ? s.civ : -1; };
  G.atWar = function (g, a, b) { if (a === b) return false; if (a === -1 || b === -1) return true; var ca = g.civs[a]; return !!(ca.rel[b] && ca.rel[b].war); };

  // ---------- Effects (civ ability + government + civics + wonders) ----------
  G.civFx = function (g, civ) {
    if (civ._fx && civ._fxTurn === g.turn && civ._fxKey === G.fxKey(g, civ)) return civ._fx;
    g.fxGen = g.fxGen || 0;
    var fx = {};
    mergeFx(fx, G.civData(civ).ability.fx);
    mergeFx(fx, G.leaderData(civ).ability.fx);
    mergeFx(fx, AU.GOVERNMENTS[civ.government].fx);
    if (fx.governmentHappiness && (g.v2 || civ.government !== 'chiefdom')) fx.happinessBonus = (fx.happinessBonus || 0) + fx.governmentHappiness;
    if (fx.monarchHappiness && (g.v2 ? true : (civ.government === 'monarchy' || civ.government === 'theocracy'))) fx.happinessBonus = (fx.happinessBonus || 0) + (g.v2 ? Math.ceil(fx.monarchHappiness / 2) : fx.monarchHappiness); // no governments under v2: half of it, always
    if (AU.Palace && !civ.minor) { var ph = AU.Palace.fx(civ).happiness; if (ph) fx.happinessBonus = (fx.happinessBonus || 0) + ph; }
    if (fx.despotCombat && (g.v2 ? true : (civ.government === 'oligarchy' || civ.government === 'autocracy'))) fx.combatBonus = (fx.combatBonus || 0) + (g.v2 ? Math.ceil(fx.despotCombat / 2) : fx.despotCombat);
    for (var cid in civ.civics) { var c = AU.CIVIC_BY_ID[cid]; if (c && c.fx) mergeFx(fx, c.fx); }
    for (var tid in civ.techs) { var tt = AU.TECH_BY_ID[tid]; if (tt && tt.fx) mergeFx(fx, tt.fx); }
    if (AU.MASTERY) for (var mid in civ.mastery || {}) { var mm = mid.indexOf('c:') === 0 ? AU.MASTERY.civics[mid.slice(2)] : AU.MASTERY.techs[mid]; if (mm && mm.fx) mergeFx(fx, mm.fx); }
    (civ.policies || []).forEach(function (pid) { var pc = AU.POLICIES[pid]; if (pc) mergeFx(fx, pc.fx); });
    if (g.v2 && AU.MasteryWeb) AU.MasteryWeb.fx(civ, mergeFx, fx);
    if (AU.Religion) AU.Religion.civFx(g, civ).forEach(function (rf) { mergeFx(fx, rf); });
    if (AU.CityStates) AU.CityStates.civFx(g, civ).forEach(function (cf) { mergeFx(fx, cf); });
    if (fx.peaceScienceMult && !g.civs.some(function (o) { return !o.minor && o.alive && o.idx !== civ.idx && G.atWar(g, civ.idx, o.idx); })) fx.yieldMult = mergeFx({}, { yieldMult: Object.assign({}, fx.yieldMult || {}, { science: (fx.yieldMult && fx.yieldMult.science || 1) * fx.peaceScienceMult }) }).yieldMult;
    G.civSettlements(g, civ.idx).forEach(function (st) { st.buildings.forEach(function (b) { var nw = AU.NATIONAL[b]; if (!nw || !nw.fx) return; var nf = {}; for (var k in nw.fx) if (k === 'yieldMult' || k === 'empireHappiness' || k === 'freeUpkeep' || k === 'culturePerWonder' || k === 'purchaseMult' || k === 'projectCostMult') nf[k] = nw.fx[k]; if (nw.fx.empireLandBonus) nf.landBonus = nw.fx.empireLandBonus; mergeFx(fx, nf); }); });
    for (var wid in g.wonders) { var s = g.settlements[g.wonders[wid]]; if (s && s.civ === civ.idx) { var w = AU.WONDERS[wid]; var wf = {}; for (var k in w.fx) if (k === 'yieldMult' || k === 'empireHappiness' || k === 'empireCulture' || k === 'empireGold' || k === 'growthMult' || k === 'navalMoves' || k === 'landBonus' || k === 'freeExpansion') wf[k] = w.fx[k]; mergeFx(fx, wf); } }
    civ._fx = fx; civ._fxTurn = g.turn; civ._fxKey = G.fxKey(g, civ);
    return fx;
  };
  G.mergeFx = mergeFx;
  G.fxKey = function (g, civ) { return (g.fxGen || 0) + '|' + civ.government + '|' + Object.keys(civ.civics).length + '|' + Object.keys(civ.techs).length + '|' + Object.keys(g.wonders).length + '|' + (civ.policies || []).join(',') + '|' + (civ.nationalCount || 0); };

  // ---------- Units (creation; movement/combat live in units.js) ----------
  // Picture id of a unit: the empire's unique unit id when it replaces this type, else the base type.
  G.unitArtId = function (g, civ, typeId) { var d = civ ? G.civData(civ) : null; return d && d.uu && d.uu.replaces === typeId ? d.uu.id : typeId; };
  G.unitType = function (g, civ, typeId) {
    // returns the effective unit definition for this civ (unique unit replacement applied)
    var base = AU.UNITS[typeId];
    var data = G.civData(civ);
    if (data.uu && data.uu.replaces === typeId) {
      var u = Object.assign({}, base, { name: data.uu.name, unique: true, baseId: typeId, uuDesc: data.uu.desc });
      AU.applyUnitMods(u, data.uu);
      if (u.moves < 1) u.moves = 1;
      return u;
    }
    return base;
  };
  // How well a start site matches an empire's terrain bias (counts within two rings, strongest bias first).
  G.biasScore = function (g, t, bias) {
    if (!bias || !bias.length) return 0;
    var ring = Hex.spiral(t.col, t.row, 2, g.W, g.H), score = 0;
    bias.forEach(function (b, bi) {
      var w = bi === 0 ? 1 : 0.5, n = 0;
      ring.forEach(function (i) { var x = g.tiles[i];
        if (b === 'coast') n += x.terrain === 'coast' ? 1 : 0; else if (b === 'river') n += x.river && !G.isWater(x) ? 1 : 0; else if (b === 'hills') n += x.hills ? 1 : 0;
        else if (b === 'mountain') n += x.terrain === 'mountain' ? 1 : 0; else if (b === 'lake') n += x.terrain === 'lake' ? 1 : 0;
        else if (b === 'forest' || b === 'jungle' || b === 'marsh') n += x.feature === b ? 1 : 0; else n += x.terrain === b ? 1 : 0; });
      if (b === 'coast') n = Math.min(n, 6) + (Hex.spiral(t.col, t.row, 1, g.W, g.H).some(function (i) { return g.tiles[i].terrain === 'coast'; }) ? 4 : 0);
      score += w * n;
    });
    return score;
  };
  G.spawnUnit = function (g, civIdx, typeId, tileIdx, extra) {
    var civ = civIdx >= 0 ? g.civs[civIdx] : null;
    var def = civ ? G.unitType(g, civ, typeId) : AU.UNITS[typeId];
    var u = { id: g.nextId++, civ: civIdx, type: typeId, tile: tileIdx, hp: 100, moves: G.maxMoves(g, civIdx, typeId), fortify: 0, sleep: false, path: null, xp: 0, bonusStr: 0, name: def.name };
    if (civ && def.cls !== 'civilian') u.xp = G.civFx(g, civ).unitsStartXp || 0;
    u.promos = [];
    if (def.freeLevel) u.xp = Math.max(u.xp, AU.U.xpForLevel(def.freeLevel));
    if (extra) Object.assign(u, extra);
    g.units[u.id] = u;
    var ix = G.unitIndex(g); (ix[u.tile] = ix[u.tile] || []).push(u);
    if (civ) { civ.unitsBuilt++; G.revealAround(g, civ, g.tiles[tileIdx].col, g.tiles[tileIdx].row, G.sight(g, u)); }
    return u;
  };
  G.maxMoves = function (g, civIdx, typeId, unit) {
    var pm = unit && unit.promos ? AU.U.promoMods(unit).moves || 0 : 0;
    if (civIdx < 0) return AU.UNITS[typeId].moves + pm;
    var civ = g.civs[civIdx], def = G.unitType(g, civ, typeId), fx = G.civFx(g, civ), m = def.moves + pm;
    if (def.cls === 'cavalry' && fx.cavalryMoves) m += fx.cavalryMoves;
    if ((def.cls === 'naval' || def.cls === 'navalRanged') && fx.navalMoves) m += fx.navalMoves;
    if ((def.cls === 'naval' || def.cls === 'navalRanged') && unit && AU.Great && AU.Great.hasAdmiralNear(g, unit)) m += 1;
    if (def.cls === 'civilian' && fx.civilianMoves) m += fx.civilianMoves;
    if (fx.classMoves && fx.classMoves[def.cls]) m += fx.classMoves[def.cls];
    return m;
  };
  G.sight = function (g, u) { var def = AU.U.def(g, u); var s = (def.sight || 2) + (AU.UNITS[u.type].sight ? 0 : 0); if (g.tiles[u.tile].hills) s += 1; if (u.civ >= 0 && (def.cls === 'recon' || def.cls === 'naval' || def.cls === 'navalRanged')) s += G.civFx(g, g.civs[u.civ]).reconSight || 0; return s; };
  G.removeUnit = function (g, u) { delete g.units[u.id]; var ix = G.unitIndex(g); if (ix[u.tile]) { ix[u.tile] = ix[u.tile].filter(function (o) { return o.id !== u.id; }); if (!ix[u.tile].length) delete ix[u.tile]; } };
  G.setUnitTile = function (g, u, tileIdx) { var from = u.tile; u.tile = tileIdx; G.unitMoved(g, u, from, tileIdx); };
  G.isMilitary = function (u) { return AU.UNITS[u.type].cls !== 'civilian'; };

  // ---------- Visibility ----------
  G.revealAround = function (g, civ, col, row, radius) {
    var idxs = Hex.spiral(col, row, radius, g.W, g.H);
    for (var i = 0; i < idxs.length; i++) { civ.explored[idxs[i]] = 1; if (g.tiles[idxs[i]].natural) G.discoverNatural(g, civ, g.tiles[idxs[i]]); }
  };
  G.discoverNatural = function (g, civ, t) {
    var key = 'nat:' + t.natural; if (civ.flags[key]) return; civ.flags[key] = g.turn;
    var NW = AU.NATURAL_WONDERS[t.natural], first = !g.naturalFound[t.natural];
    if (first) g.naturalFound[t.natural] = civ.idx;
    // The reward is a share of what you are currently researching, so it is worth the same at every stage of the game
    // and never completes a technology or civic on its own (a flat +40 used to finish the first ones on turn 2).
    var share = first ? 0.3 : 0.15;
    function refCost(cur, avail, costFn) { var list = cur ? [cur] : avail; if (!list.length) return 0; return Math.min.apply(null, list.map(function (x) { return costFn(g, civ, x); })); }
    var tRef = refCost(civ.currentTech ? AU.TECH_BY_ID[civ.currentTech] : null, G.availableTechs(civ), G.techCost), cRef = refCost(civ.currentCivic ? AU.CIVIC_BY_ID[civ.currentCivic] : null, G.availableCivics(civ), G.civicCost);
    var sci = Math.max(5, Math.round(tRef * share)), cul = Math.max(5, Math.round(cRef * share));
    civ.bonusCulture = (civ.bonusCulture || 0) + cul; civ.bonusScience = (civ.bonusScience || 0) + sci;
    G.notify(g, civ, { kind: 'wonder', text: (first ? _('You discovered') + ' ' : _('Your explorers found') + ' ') + NW.name + '! +' + sci + ' ' + _('Knowledge') + ', +' + cul + ' ' + _('Heritage') + '.', tile: t.i });
    G.quote(g, civ, 'natural', t.natural, NW.name, _('Natural wonder discovered'), t.i);
    G.log(g, G.civData(civ).name + ' discovered ' + NW.name + '.', civ.idx);
  };
  G.refreshVisibility = function (g, civ) {
    var vis = new Uint8Array(g.W * g.H);
    function mark(col, row, r) { var idxs = Hex.spiral(col, row, r, g.W, g.H); for (var i = 0; i < idxs.length; i++) { vis[idxs[i]] = 1; if (!civ.explored[idxs[i]]) { civ.explored[idxs[i]] = 1; if (g.tiles[idxs[i]].natural) G.discoverNatural(g, civ, g.tiles[idxs[i]]); } } }
    G.civUnits(g, civ.idx).forEach(function (u) { var t = g.tiles[u.tile]; mark(t.col, t.row, G.sight(g, u)); });
    G.civSettlements(g, civ.idx).forEach(function (s) { var t = g.tiles[s.tile]; mark(t.col, t.row, 3); G.territory(g, s).forEach(function (ti) { var tt = g.tiles[ti]; mark(tt.col, tt.row, 1); }); });
    civ.visible = vis;
    // meet civs
    for (var id in g.units) { var u = g.units[id]; if (u.civ >= 0 && u.civ !== civ.idx && vis[u.tile] && !civ.met[u.civ]) G.meet(g, civ.idx, u.civ); }
    for (var sid in g.settlements) { var s2 = g.settlements[sid]; if (s2.civ !== civ.idx && vis[s2.tile] && !civ.met[s2.civ]) G.meet(g, civ.idx, s2.civ); }
    // allies share their map knowledge
    if (AU.Diplo) g.civs.forEach(function (o) { if (o.alive && o.idx !== civ.idx && AU.Diplo.isAlly(g, civ.idx, o.idx)) { var oe = o.explored; for (var k = 0; k < oe.length; k++) if (oe[k] && !civ.explored[k]) civ.explored[k] = 1; } });
    return vis;
  };
  G.canSee = function (g, civ, tileIdx) { return !civ.visible || civ.visible[tileIdx] === 1; };

  // ---------- Settlements ----------
  G.territory = function (g, s) { return s.tiles.slice(); };
  G.nextCityName = function (g, civ) {
    var names = G.civData(civ).cities;
    var used = {}; for (var id in g.settlements) used[g.settlements[id].name] = true;
    for (var i = 0; i < names.length; i++) { if (!used[names[i]]) return names[i]; }
    return _('New') + ' ' + names[civ.cityNameIdx++ % names.length];
  };
  G.canFoundAt = function (g, civIdx, tileIdx) {
    var t = g.tiles[tileIdx];
    if (!G.passable(g, t) || t.owner >= 0 || t.camp) return false;
    for (var id in g.settlements) { var s = g.settlements[id]; if (G.dist(g.tiles[s.tile], t) < 4) return false; }
    return true;
  };
  G.foundSettlement = function (g, civIdx, tileIdx, forceCity) {
    var civ = g.civs[civIdx], t = g.tiles[tileIdx];
    var isCapital = !civ.capital;
    var s = { id: g.nextId++, civ: civIdx, name: G.nextCityName(g, civ), tile: tileIdx, isCity: isCapital || !!forceCity, isCapital: isCapital,
      pop: 1, food: 0, hp: 100, buildings: [], queue: [], progress: {}, specialization: null, founded: g.turn, pendingGrowth: 0, specialists: 0,
      tiles: [], attackedTurn: -1, projects: {}, purchasedTurn: -1 };
    if (t.feature === 'forest' || t.feature === 'jungle' || t.feature === 'marsh') t.feature = null;
    t.settlement = s.id;
    g.settlements[s.id] = s;
    G.claimTile(g, s, tileIdx, true);
    if (!g.v2) G.neighbors(g, t).forEach(function (n) { var nt = g.tiles[n]; if (nt.owner < 0) { nt.owner = s.id; s.tiles.push(n); } }); // v2: the centre tile only, every tile after is earned by growth
    if (isCapital) { civ.capital = s.id; civ.originalCapital = s.id; G.addBuilding(g, s, 'palace'); }
    var fx = G.civFx(g, civ);
    s.pendingGrowth += 1; G.autoExpand(g, s); // the first citizen works the best adjacent tile (v2: this is the first of the three free claims)
    if (fx.freeBuilding) G.addBuilding(g, s, fx.freeBuilding);
    if (fx.freeBuildingWithTech) for (var fb in fx.freeBuildingWithTech) if (g.v2 ? G.gateOk(g, civ, 'building', fb, AU.BUILDINGS[fb] || {}) : civ.techs[fx.freeBuildingWithTech[fb]]) G.addBuilding(g, s, fb);
    if (fx.freeExpansion) s.pendingGrowth += fx.freeExpansion;
    if (fx.foundGold) civ.gold += fx.foundGold;
    if (!isCapital && t.continent !== G.capitalContinent(g, civ)) {
      if (fx.abroadFoundPop) { s.pop += fx.abroadFoundPop; s.pendingGrowth += fx.abroadFoundPop; G.autoExpand(g, s); }
      if (fx.abroadFreeBuilding) G.addBuilding(g, s, fx.abroadFreeBuilding);
    }
    if (fx.freeUnitOnFound) { G.spawnUnit(g, civIdx, fx.freeUnitOnFound, tileIdx); }
    G.revealAround(g, civ, t.col, t.row, 3);
    G.log(g, G.civData(civ).name + ' founded ' + s.name + '.', civIdx);
    return s;
  };
  G.claimTile = function (g, s, tileIdx, isCenter) {
    var t = g.tiles[tileIdx];
    t.owner = s.id; t.worked = true;
    if (s.tiles.indexOf(tileIdx) < 0) s.tiles.push(tileIdx);
    if (isCenter) t.worked = true;
  };
  G.expansionCandidates = function (g, s) {
    var center = g.tiles[s.tile], out = [], maxR = 3 + (G.civFx(g, g.civs[s.civ]).expansionRadius || 0);
    var owned = {}; s.tiles.forEach(function (i) { owned[i] = true; });
    var seen = {};
    s.tiles.forEach(function (i) {
      var t = g.tiles[i];
      if (!t.worked && (!AU.TERRAIN[t.terrain].impassable || t.natural) && t.terrain !== 'ocean') out.push(i);
      G.neighbors(g, t).forEach(function (n) {
        var nt = g.tiles[n];
        if (seen[n] || owned[n] || nt.owner >= 0 || nt.camp) return;
        if ((AU.TERRAIN[nt.terrain].impassable && !nt.natural) || nt.terrain === 'ocean') return;
        if (G.dist(center, nt) > maxR) return;
        seen[n] = true; out.push(n);
      });
    });
    return out;
  };
  G.improvementFor = function (g, t, civ) {
    if (t.natural) return null;
    if (t.resource) {
      var R = AU.RESOURCES[t.resource];
      if (civ ? G.resourceKnown(g, civ, R) : !R.revealTech) return R.improvement;
    }
    if (G.isWater(t)) return t.resource ? 'fishing' : null;
    if (t.terrain === 'mountain') return null;
    if (t.hills) return 'mine';
    if (t.feature === 'forest' || t.feature === 'jungle') return 'woodcutter';
    if (t.feature === 'marsh') return 'clearing';
    if (t.terrain === 'snow') return null;
    return 'farm';
  };
  G.tileYields = function (g, t, s, civ) {
    civ = civ || g.civs[s.civ];
    var y = AU.baseTileYields(t, civ);
    var isCenter = t.settlement === s.id;
    var imp = G.improvementFor(g, t, civ);
    var fx = G.civFx(g, civ);
    if (isCenter) {
      if (y.food < 2) y.food = 2; if (y.production < 1) y.production = 1;
      return y;
    }
    if (imp) { add(y, AU.IMPROVEMENTS[imp].yields); var uimp = G.uniqueImprovement(g, t, civ, imp); if (uimp) add(y, uimp.yields); }
    var water = G.isWater(t);
    G.neighbors(g, t).forEach(function (n) { var nt = g.tiles[n]; if (nt.natural) add(y, AU.NATURAL_WONDERS[nt.natural].adjacent); });
    (fx.tileBonus || []).forEach(function (b) {
      var ok = (b.when === 'water' && water) || (b.when === 'river' && t.river && !water) || (b.when === 'forest' && t.feature === 'forest') ||
        (b.when === 'camp' && imp === 'camp') || (b.when === 'fishing' && imp === 'fishing') || (b.when === 'plantation' && imp === 'plantation') || (b.when === 'mine' && imp === 'mine') || (b.when === 'pasture' && imp === 'pasture') ||
        (b.when === 'jungle' && (t.feature === 'jungle' || t.feature === 'marsh')) || (b.when === 'desert' && t.terrain === 'desert') ||
        (b.when === 'cold' && (t.terrain === 'tundra' || t.terrain === 'snow')) ||
        (b.when === 'hills' && t.hills) || (b.when === 'farm' && imp === 'farm') || (b.when === 'quarry' && imp === 'quarry') || (b.when === 'woodcutter' && imp === 'woodcutter') || (b.when === 'well' && imp === 'well') ||
        (b.when === 'wet' && (t.feature === 'marsh' || t.feature === 'oasis')) || (b.when === 'coast' && t.terrain === 'coast') || (b.when === 'lake' && t.terrain === 'lake') ||
        (b.when === 'plains' && t.terrain === 'plains') || (b.when === 'grassland' && t.terrain === 'grassland') || (b.when === 'tundra' && t.terrain === 'tundra') || (b.when === 'snow' && t.terrain === 'snow') ||
        (b.when === 'sacred' && G.neighbors(g, t).some(function (n) { var nt = g.tiles[n]; return nt.natural || nt.terrain === 'mountain'; })) || (b.when === 'strategic' && t.resource && AU.RESOURCES[t.resource].kind === 'strategic') || (b.when === 'luxury' && t.resource && AU.RESOURCES[t.resource].kind === 'luxury');
      if (ok) add(y, b.yields);
    });
    // wonders located in this settlement affecting its tiles
    s.buildings.forEach(function (b) {
      var w = AU.WONDERS[b]; if (!w) return;
      if (w.fx.desertBonus && t.terrain === 'desert') add(y, w.fx.desertBonus);
      if (w.fx.hillsBonus && t.hills) add(y, w.fx.hillsBonus);
      if (w.fx.jungleBonus && t.feature === 'jungle') add(y, w.fx.jungleBonus);
    });
    if (s.specialization === 'farming' && (imp === 'farm' || imp === 'pasture' || imp === 'fishing')) y.food += 1;
    if (s.specialization === 'mining' && (imp === 'mine' || imp === 'quarry' || imp === 'woodcutter')) y.production += 1;
    if (s.specialization === 'trade' && t.resource) y.gold += 1;
    var utT = G.civData(civ).ut; if (utT && s.specialization === utT.id && utT.fx && utT.fx.tileYields) { if (G.tileMatches(g, t, utT.fx.tileYields.when, imp)) add(y, utT.fx.tileYields.yields); }
    if (water && G.hasBuilding(s, 'lighthouse')) y.food += 1;
    return y;
  };
  G.hasBuilding = function (s, id) { return s.buildings.indexOf(id) >= 0; };
  G.buildingDef = function (g, civ, id) {
    var base = AU.BUILDINGS[id]; if (!base) return AU.WONDERS[id] || AU.NATIONAL[id];
    var data = G.civData(civ);
    if (data.ub && data.ub.replaces === id) {
      var b = Object.assign({}, base, { name: data.ub.name, unique: true, yields: add(add({}, base.yields), data.ub.yields) });
      if (data.ub.unitStrength) b.unitStrength = (b.unitStrength || 0) + data.ub.unitStrength;
      return b;
    }
    return base;
  };
  G.addBuilding = function (g, s, id) { if (s.buildings.indexOf(id) < 0) s.buildings.push(id); };
  G.luxuryCount = function (g, civ) {
    if (civ._lux && civ._luxTurn === g.turn) return civ._lux;
    var set = {}, strat = {}, bonus = {};
    G.civSettlements(g, civ.idx).forEach(function (s) {
      s.tiles.forEach(function (i) { var t = g.tiles[i]; if (!t.worked || !t.resource) return; var R = AU.RESOURCES[t.resource];
        if (!G.resourceKnown(g, civ, R)) return;
        if (R.kind === 'luxury') set[t.resource] = true; if (R.kind === 'strategic') strat[t.resource] = (strat[t.resource] || 0) + (g.v2 && AU.Society ? AU.Society.supplyOf(t) : 1); if (R.kind === 'bonus') bonus[t.resource] = true; });
    });
    if (civ.imports) for (var ir in civ.imports) if (civ.imports[ir] > g.turn && AU.RESOURCES[ir]) { if (AU.RESOURCES[ir].kind === 'luxury') set[ir] = true; else if (AU.RESOURCES[ir].kind === 'strategic') strat[ir] = (strat[ir] || 0) + 1; }
    if (g.v2 && civ.synth) for (var sr in civ.synth) if (AU.RESOURCES[sr]) strat[sr] = (strat[sr] || 0) + civ.synth[sr]; // synthesised supply lasts
    civ._lux = { luxuries: Object.keys(set), strategic: strat, bonus: Object.keys(bonus) }; civ._luxTurn = g.turn;
    return civ._lux;
  };
  G.hasResource = function (g, civ, res) { return !res || (G.luxuryCount(g, civ).strategic[res] || 0) > 0; };
  // Is this resource visible and usable to the empire? Classic: its technology. Divergence: the age of that technology.
  G.resourceRevealEra = function (R) { if (R.revealEra !== undefined) return R.revealEra; var t = R.revealTech && AU.TECH_BY_ID[R.revealTech]; return t ? t.era : 0; };
  G.resourceKnown = function (g, civ, res) { var R = typeof res === 'string' ? AU.RESOURCES[res] : res; if (!R || !R.revealTech) return true; if (!civ) return false; if ((g && g.v2) || civ.v2) return (civ.era || 0) >= G.resourceRevealEra(R); return !!civ.techs[R.revealTech]; };
  // What still hides the resource from this empire, for the tile tips.
  G.resourceRevealName = function (g, R) { if (g && g.v2) { var e = AU.V2 && AU.V2.ERAS[G.resourceRevealEra(R)]; return e ? e.name : _('a later age'); } var t = AU.TECH_BY_ID[R.revealTech]; return t ? t.name : _('a technology'); };
  G.isCoastal = function (g, s) { var t = g.tiles[s.tile]; if (t.navigable) return true; return G.neighbors(g, t).some(function (n) { var nt = g.tiles[n]; return nt.terrain === 'coast' || nt.terrain === 'lake' || nt.navigable; }); };
  G.hasRiver = function (g, s) { var t = g.tiles[s.tile]; if (t.river) return true; return G.neighbors(g, t).some(function (n) { return g.tiles[n].river; }); };
  G.settlementHas = function (g, s, need) {
    if (!need) return true;
    if (need === 'coast') return G.isCoastal(g, s);
    if (need === 'river') return G.hasRiver(g, s);
    if (need === 'desert') return s.tiles.some(function (i) { return g.tiles[i].terrain === 'desert'; });
    if (need === 'hills') return s.tiles.some(function (i) { return g.tiles[i].hills; });
    return true;
  };

  G.settlementYields = function (g, s) {
    var civ = g.civs[s.civ], fx = G.civFx(g, civ);
    var y = zeroYields(), pct = { production: 0, science: 0, culture: 0, gold: 0, food: 0, unitProduction: 0 };
    var center = g.tiles[s.tile];
    add(y, G.tileYields(g, center, s, civ));
    s.tiles.forEach(function (i) { var t = g.tiles[i]; if (t.worked && i !== s.tile) add(y, G.tileYields(g, t, s, civ)); });
    if (s.greatWorks) y.culture += s.greatWorks * 3;
    var bY = zeroYields(), wondersHere = 0;
    s.buildings.forEach(function (id) {
      var d = G.buildingDef(g, civ, id); if (!d) return;
      add(bY, d.yields);
      if (d.perPop) for (var k in d.perPop) bY[k] += d.perPop[k] * s.pop;
      if (d.pct) for (var p in d.pct) pct[p] += d.pct[p];
      if (fx.buildingBonus && fx.buildingBonus[id]) add(bY, fx.buildingBonus[id]);
      if (AU.WONDERS[id]) { wondersHere++; if (AU.WONDERS[id].fx.pctProduction) pct.production += AU.WONDERS[id].fx.pctProduction; }
      else if (s.isCity && fx.cityBuildingScience && id !== 'palace') bY.science += fx.cityBuildingScience;
    });
    s.buildings.forEach(function (id) {
      var nw = AU.NATIONAL[id]; if (!nw || !nw.fx) return;
      if (nw.fx.pctUnitProduction) pct.unitProduction += nw.fx.pctUnitProduction;
      if (nw.fx.sciencePerBuilding) { var cnt = 0; G.civSettlements(g, civ.idx).forEach(function (o) { if (G.hasBuilding(o, nw.fx.sciencePerBuilding)) cnt++; }); bY.science += cnt; }
      if (nw.fx.productionPerMine) { var mines = 0; s.tiles.forEach(function (i) { var tt = g.tiles[i]; if (tt.worked && G.improvementFor(g, tt, civ) === 'mine') mines++; }); bY.production += mines * nw.fx.productionPerMine; }
    });
    if (fx.happinessPerShrine && G.hasBuilding(s, 'shrine')) bY.happiness += fx.happinessPerShrine;
    if (fx.scienceNearMountains && G.neighbors(g, center).some(function (n) { return g.tiles[n].terrain === 'mountain' || g.tiles[n].natural; })) bY.science += fx.scienceNearMountains;
    if (s.specialization === 'urban') { bY.science = bY.science * 1.5 + 2; bY.culture = bY.culture * 1.5 + 2; }
    add(y, bY);
    y.science += (0.5 + (fx.sciencePerPop || 0)) * s.pop; y.culture += 0.3 * s.pop;
    y.science += 2 * s.specialists; y.culture += 2 * s.specialists;
    if (s.specialization === 'trade') y.gold += 4;
    var utS = G.civData(civ).ut; if (utS && s.specialization === utS.id && utS.fx && utS.fx.flat) add(y, utS.fx.flat);
    y.gold += fx.goldPerSettlement || 0; y.culture += fx.culturePerSettlement || 0; y.science += fx.sciencePerSettlement || 0;
    if (fx.sciencePerStrategic && s.id === civ.capital) y.science += fx.sciencePerStrategic * Object.keys(G.luxuryCount(g, civ).strategic).length;
    y.faith += (fx.faithPerSettlement || 0) + (fx.faithPerWonder || 0) * wondersHere;
    if (fx.faithPerNaturalWonder) { var nat = 0; s.tiles.forEach(function (i) { if (g.tiles[i].natural) nat++; }); y.faith += fx.faithPerNaturalWonder * nat; }
    var rfx = AU.Religion ? AU.Religion.settlementFx(g, s) : null;
    if (rfx) {
      y.gold += rfx.goldPerSettlement || 0; y.culture += rfx.culturePerSettlement || 0; y.happiness += rfx.happinessBonus || 0;
      y.faith += (rfx.faithPerWonder || 0) * wondersHere;
      if (rfx.productionPerPop) y.production += rfx.productionPerPop * s.pop;
      if (rfx.buildingBonus) s.buildings.forEach(function (b) { if (rfx.buildingBonus[b]) add(y, rfx.buildingBonus[b]); });
      if (rfx.yieldMult) for (var rk0 in rfx.yieldMult) if (y[rk0] !== undefined) y[rk0] *= rfx.yieldMult[rk0];
    }
    if (s.religion && AU.Religion && g.religions[s.religion] && g.religions[s.religion].holyCity === s.id) y.faith += 2;
    y.culture += fx.empireCulture || 0; y.gold += fx.empireGold || 0;
    if (fx.happinessPerWonder) y.happiness += fx.happinessPerWonder * wondersHere;
    var coastal = G.isCoastal(g, s);
    if (coastal && fx.coastalSettlementYields) add(y, fx.coastalSettlementYields);
    (fx.settlementSiteBonus || []).forEach(function (b) {
      var ok = (b.when === 'river' && G.hasRiver(g, s)) || (b.when === 'hills' && center.hills) || (b.when === 'coast' && coastal) || (b.when === 'desert' && center.terrain === 'desert');
      if (ok) add(y, b.yields);
    });
    if (s.isCity && fx.citySiteYields) add(y, fx.citySiteYields);
    if (!s.isCity && fx.townYields) add(y, fx.townYields);
    if (!s.isCity && s.specialization) { if (fx.specializedTownYields) add(y, fx.specializedTownYields); if (fx.specializationYields && fx.specializationYields[s.specialization]) add(y, fx.specializationYields[s.specialization]); }
    var luxList = G.luxuryCount(g, civ).luxuries, lux = luxList.length;
    if (s.isCapital) {
      var wonders = 0; for (var w in g.wonders) if (g.settlements[g.wonders[w]] && g.settlements[g.wonders[w]].civ === civ.idx) wonders++;
      y.culture += (fx.culturePerWonder || 0) * wonders; y.science += (fx.sciencePerWonder || 0) * wonders;
      if (AU.Palace && !civ.minor) y.culture += AU.Palace.fx(civ).capitalCulture;
      y.culture += (fx.luxuryCulture || 0) * lux; y.gold += (fx.luxuryGold || 0) * lux;
      y.gold += (fx.goldPerWonder || 0) * wonders;
      if (fx.capitalYields) add(y, fx.capitalYields);
    }
    if (g.v2 && s.isCapital && AU.Society) add(y, AU.Society.bondYields(g, civ)); // bonded free cities send half their yields
    // happiness
    var happy = 3 + bY.happiness + (y.happiness || 0) + Math.min(lux, 4) + lux * (fx.luxuryHappinessBonus || 0) + (fx.happinessBonus || 0) + (fx.empireHappiness || 0) - Math.floor(s.pop / 2);
    if (s.captured && fx.capturedHappiness) happy += fx.capturedHappiness;
    if (civ.warWeariness) happy -= Math.floor(civ.warWeariness / 4);
    if (g.v2 && civ.bondShame > g.turn) happy -= 2; // a broken bond
    if (s.unrest > g.turn) happy -= 3; // a freshly conquered settlement
    var smk = g.v2 && AU.Smoke ? AU.Smoke.smoke(g, s) : 0; if (smk) { happy += AU.Smoke.happiness(smk); if (AU.Smoke.heavy(smk)) y.food = Math.max(0, y.food - AU.Smoke.farmTiles(g, s)); if (fx.smokeGold) y.gold += smk * fx.smokeGold; } // Smoke
    y.happiness = happy;
    // percents & multipliers
    y.production *= 1 + pct.production / 100; y.science *= 1 + pct.science / 100;
    var ym = {}; for (var ymk in (fx.yieldMult || {})) ym[ymk] = Math.min(2, Math.max(0.25, fx.yieldMult[ymk])); // all the percentage bonuses together cap at +100%
    for (var yk in ym) if (y[yk] !== undefined && yk !== 'happiness') y[yk] *= ym[yk];
    if (s.isCity && fx.cityYieldMult) for (var cy in fx.cityYieldMult) if (y[cy] !== undefined) y[cy] *= fx.cityYieldMult[cy];
    if (s.isCapital && fx.capitalMult) for (var ck in fx.capitalMult) y[ck] *= fx.capitalMult[ck];
    if (fx.capitalRadiusBonus && civ.capital && g.settlements[civ.capital] && G.dist(g.tiles[g.settlements[civ.capital].tile], center) <= fx.capitalRadiusBonus.radius) {
      ['food', 'production', 'gold', 'science', 'culture'].forEach(function (k) { y[k] *= fx.capitalRadiusBonus.mult; });
    }
    var diff = AU.DIFFICULTIES[g.difficulty], dm = civ.isPlayer ? diff.playerYield : diff.aiYield;
    ['production', 'gold', 'science', 'culture'].forEach(function (k) { y[k] *= dm; });
    if (s.unrest > g.turn) ['production', 'gold', 'science', 'culture'].forEach(function (k) { y[k] *= 0.5; }); // unrest: half yields until the people settle
    if (g.v2 && AU.Society) { var tm = AU.Society.tierOf(happy).mult; if (tm < 1 && fx.noUnhappinessPenalty) tm = 1; if (tm !== 1) ['production', 'gold', 'science', 'culture'].forEach(function (k) { y[k] *= tm; }); } // Divergence: five moods from Miserable ×0.6 to Joyful ×1.2
    else if (happy < 0 && !fx.noUnhappinessPenalty) { var pen = happy <= -5 ? 0.7 : 0.85; ['production', 'gold', 'science', 'culture'].forEach(function (k) { y[k] *= pen; }); }
    y.unitProductionPct = pct.unitProduction;
    // towns turn production into gold
    y.rawProduction = y.production;
    if (!s.isCity) { y.gold += y.production * (fx.townGoldMult || 1); y.production = 0; }
    for (var rk in y) y[rk] = Math.round(y[rk] * 10) / 10;
    return y;
  };
  G.civYields = function (g, civ) {
    var tot = zeroYields();
    G.civSettlements(g, civ.idx).forEach(function (s) { var y = G.settlementYields(g, s); add(tot, { gold: y.gold, science: y.science, culture: y.culture, production: y.production, food: y.food, faith: y.faith || 0 }); });
    tot.upkeep = G.unitUpkeep(g, civ);
    tot.gold -= tot.upkeep;
    tot.gold = Math.round(tot.gold * 10) / 10;
    return tot;
  };
  G.unitUpkeep = function (g, civ) {
    var n = 0; G.civUnits(g, civ.idx).forEach(function (u) { if (G.isMilitary(u)) n++; });
    var free = 4 + Object.keys(civ.techs).length / 8 + (G.civFx(g, civ).freeUpkeep || 0);
    return Math.max(0, Math.floor(n - free));
  };
  // Big settlements grow slower: from pop 8 each extra citizen adds 12% to the food needed, so mega-cities stop at a sane size.
  G.growthCost = function (pop, g) { return Math.floor((15 + 8 * (pop - 1) + Math.pow(pop - 1, 1.5)) * (1 + Math.max(0, pop - 8) * 0.12) * (g ? G.speed(g) : 1)); };
  // Rivers (Divergence): a young river settlement grows 20% cheaper until it reaches 8 population.
  G.RIVER_GROWTH_POP = 8;
  G.growthCostFor = function (g, s) { var c = G.growthCost(s.pop, g); if (g.v2 && s.pop < G.RIVER_GROWTH_POP && G.hasRiver(g, s)) c = Math.floor(c * 0.8); return c; };
  G.era = function (civ) { if (civ.v2) return civ.v2.era || 0; var e = 0; for (var t in civ.techs) e = Math.max(e, AU.TECH_BY_ID[t].era); return e; };
  // v2 rules: the Mastery Web decides what can be built; v1 rules: the technology or civic does.
  G.gateOk = function (g, civ, kind, id, d) { if (g.v2 && AU.MasteryWeb) return AU.MasteryWeb.allows(g, civ, kind, id, d); if (d.tech && !civ.techs[d.tech]) return false; if (d.civic && !civ.civics[d.civic]) return false; return true; };

  // ---------- Production / purchasing ----------
  G.itemCost = function (g, civ, kind, id, s) {
    var fx = G.civFx(g, civ), cost;
    if (kind === 'unit') {
      var d = G.unitType(g, civ, id); cost = d.cost;
      if (id === 'settler') { cost = (80 + 30 * (G.civSettlements(g, civ.idx).length - 1)) * (fx.settlerCostMult || 1); }
      else if (d.cls !== 'civilian') cost *= fx.unitCostMult || 1;
      if (fx.classCostMult && fx.classCostMult[d.cls]) cost *= fx.classCostMult[d.cls];
      if ((d.cls === 'naval' || d.cls === 'navalRanged') && fx.navalCostMult) cost *= fx.navalCostMult;
      if ((d.cls === 'naval' || d.cls === 'navalRanged') && s && G.hasBuilding(s, 'colossus')) cost *= 0.8;
    } else if (kind === 'building') { cost = AU.BUILDINGS[id].cost * (fx.buildingCostMult || 1) * (fx.buildingDiscount && fx.buildingDiscount[id] || 1); }
    else if (kind === 'wonder') { cost = AU.WONDERS[id].cost * (fx.wonderCostMult || 1); }
    else if (kind === 'national') { cost = AU.NATIONAL[id].cost * (fx.buildingCostMult || 1); }
    else if (kind === 'project') { cost = AU.PROJECTS[id].cost * (fx.projectCostMult || 1); }
    return Math.round(cost * G.speed(g));
  };
  G.purchaseCost = function (g, civ, kind, id, s) {
    var fx = G.civFx(g, civ);
    var prog = s ? (s.progress[kind + ':' + id] || 0) : 0;
    var m = (fx.purchaseMult || 1) * (s && !s.isCity && fx.townPurchaseMult ? fx.townPurchaseMult : 1);
    var utP = G.civData(civ).ut; if (utP && s && s.specialization === utP.id && utP.fx && utP.fx.unitPurchaseMult && kind === 'unit') m *= utP.fx.unitPurchaseMult;
    if (kind === 'unit') { var ud = G.unitType(g, civ, id); if (ud.purchaseMult) m *= ud.purchaseMult; }
    return Math.max(10, Math.round((G.itemCost(g, civ, kind, id, s) - prog) * 2 * m));
  };
  G.canBuildUnit = function (g, s, id) {
    var civ = g.civs[s.civ], d = G.unitType(g, civ, id);
    if (d.religious || d.great) return false; // great people are earned, never built; missionaries, apostles and inquisitors are bought with Devotion only (see Religion)
    if (d.v2 && !g.v2) return false;
    if (!G.gateOk(g, civ, 'unit', id, d)) return false;
    if (d.popCost && s.pop <= d.popCost) return false; // a settler takes people with it: the settlement needs pop 2
    if (d.caravan && AU.CityStates && AU.CityStates.caravans(g, civ).length >= AU.CityStates.caravanLimit(g, civ)) return false; // one route per Market or Harbor, plus one
    if (d.resource && (g.v2 && AU.Society ? !AU.Society.canSupply(g, civ, d.resource) : !G.hasResource(g, civ, d.resource))) return false; // Divergence: a resource tile supports 1–3 units by richness
    if ((d.cls === 'naval' || d.cls === 'navalRanged') && !G.isCoastal(g, s)) return false;
    // obsolete? if the upgrade target is buildable, hide the old one (except settler/scout)
    if (d.upgradesTo) { var up = G.unitType(g, civ, d.upgradesTo); if ((g.v2 ? G.gateOk(g, civ, 'unit', d.upgradesTo, up) : (up.tech && civ.techs[up.tech])) && (!up.resource || G.hasResource(g, civ, up.resource))) return false; }
    return true;
  };
  G.canBuildBuilding = function (g, s, id) {
    var civ = g.civs[s.civ], d = AU.BUILDINGS[id];
    if (!d || d.noBuild || G.hasBuilding(s, id)) return false;
    if (d.v2 && !g.v2) return false;
    if (!G.gateOk(g, civ, 'building', id, d)) return false;
    if (d.popCost && s.pop <= d.popCost) return false; // a settler takes people with it: the settlement needs pop 2
    if (d.requires && !G.hasBuilding(s, d.requires)) return false;
    if (d.needs && !G.settlementHas(g, s, d.needs)) return false;
    if (d.resource && (g.v2 && AU.Society ? !AU.Society.canSupply(g, civ, d.resource) : !G.hasResource(g, civ, d.resource))) return false; // Divergence: a resource tile supports 1–3 units by richness
    return true;
  };
  G.canBuildWonder = function (g, s, id) {
    var civ = g.civs[s.civ], d = AU.WONDERS[id];
    if (!s.isCity || g.wonders[id] !== undefined) return false;
    if (!G.gateOk(g, civ, 'wonder', id, d)) return false;
    if (d.popCost && s.pop <= d.popCost) return false; // a settler takes people with it: the settlement needs pop 2
    if (d.needs && !G.settlementHas(g, s, d.needs)) return false;
    return true;
  };
  G.canBuildProject = function (g, s, id) {
    var civ = g.civs[s.civ], d = AU.PROJECTS[id];
    if (!s.isCity || !s.isCapital) return false;
    if (!G.gateOk(g, civ, 'project', id, d)) return false;
    if (d.requiresBuilding && !G.hasBuilding(s, d.requiresBuilding)) return false;
    if (civ.projects && civ.projects[id]) return false;
    if (d.requiresProject && !(civ.projects && civ.projects[d.requiresProject])) return false;
    return true;
  };
  G.canBuildNational = function (g, s, id) {
    var civ = g.civs[s.civ], d = AU.NATIONAL[id];
    if (!s.isCity || G.hasBuilding(s, id)) return false;
    if (!G.gateOk(g, civ, 'national', id, d)) return false;
    if (d.popCost && s.pop <= d.popCost) return false; // a settler takes people with it: the settlement needs pop 2
    var sets = G.civSettlements(g, civ.idx);
    if (sets.some(function (o) { return G.hasBuilding(o, id); })) return false;
    if (d.requiresCount) { var n = 0; sets.forEach(function (o) { if (G.hasBuilding(o, d.requiresCount[0])) n++; }); if (n < d.requiresCount[1]) return false; }
    return true;
  };
  G.buildOptions = function (g, s) {
    var out = { units: [], buildings: [], wonders: [], national: [], projects: [] };
    for (var u in AU.UNITS) if (G.canBuildUnit(g, s, u)) out.units.push(u);
    for (var b in AU.BUILDINGS) if (G.canBuildBuilding(g, s, b)) out.buildings.push(b);
    for (var w in AU.WONDERS) if (G.canBuildWonder(g, s, w)) out.wonders.push(w);
    for (var n in AU.NATIONAL) if (G.canBuildNational(g, s, n)) out.national.push(n);
    for (var p in AU.PROJECTS) if (G.canBuildProject(g, s, p)) out.projects.push(p);
    return out;
  };
  G.inQueue = function (s, kind, id) { return s.queue.some(function (q) { return q.kind === kind && q.id === id; }); };
  G.enqueue = function (g, s, kind, id) {
    if (!s.isCity) return false;
    if (kind !== 'unit' && G.inQueue(s, kind, id)) return false;
    s.queue.push({ kind: kind, id: id });
    return true;
  };
  G.dequeue = function (g, s, index) { s.queue.splice(index, 1); };
  G.purchase = function (g, s, kind, id) {
    var civ = g.civs[s.civ];
    var cost = G.purchaseCost(g, civ, kind, id, s);
    if (civ.gold < cost) return false;
    if (kind === 'unit' && !G.canBuildUnit(g, s, id)) return false;
    if (kind === 'building' && !G.canBuildBuilding(g, s, id)) return false;
    if (kind === 'wonder' || kind === 'national' || kind === 'project') return false;
    civ.gold -= cost;
    delete s.progress[kind + ':' + id];
    G.completeItem(g, s, kind, id);
    return true;
  };
  G.completeItem = function (g, s, kind, id) {
    var civ = g.civs[s.civ];
    if (kind === 'unit') {
      var tileIdx = G.findSpawnTile(g, s, id);
      if (tileIdx == null) return false;
      var u = G.spawnUnit(g, civ.idx, id, tileIdx);
      var bonus = 0, hasBarracks = false; s.buildings.forEach(function (b) { var d = G.buildingDef(g, civ, b); if (d && d.unitStrength) { bonus += d.unitStrength; hasBarracks = true; } if (AU.NATIONAL[b] && AU.NATIONAL[b].fx && AU.NATIONAL[b].fx.unitStrength) bonus += AU.NATIONAL[b].fx.unitStrength; });
      if (hasBarracks) bonus += G.civFx(g, civ).unitStrengthFromBarracks || 0;
      u.bonusStr = bonus;
      var pc = AU.UNITS[id].popCost || 0; if (pc) s.pop = Math.max(1, s.pop - pc);
      G.notify(g, civ, { kind: 'unit', text: s.name + ' ' + _('trained a') + ' ' + u.name + (pc ? ' (-' + pc + ' ' + _('Population)') : '') + '.', tile: tileIdx, unit: u.id });
    } else if (kind === 'building') {
      G.addBuilding(g, s, id);
      var bfx = G.civFx(g, civ);
      if (bfx.freeTechOnBuilding === id && !civ.flags['ft:' + id]) { civ.flags['ft:' + id] = 1; if (g.v2) AU.MasteryWeb.grantFreeSpark(g, civ); else G.grantFreeTech(g, civ); }
      if (bfx.freeCivicOnBuilding === id && !civ.flags['fc:' + id]) { civ.flags['fc:' + id] = 1; if (g.v2) AU.MasteryWeb.grantFreeSpark(g, civ); else G.grantFreeCivic(g, civ); }
      G.notify(g, civ, { kind: 'build', text: s.name + ' completed ' + G.buildingDef(g, civ, id).name + '.', tile: s.tile, settlement: s.id });
    } else if (kind === 'wonder') {
      if (g.wonders[id] !== undefined) { G.notify(g, civ, { kind: 'build', text: AU.WONDERS[id].name + ' was completed elsewhere; production refunded as gold.', tile: s.tile }); civ.gold += Math.round((s.progress['wonder:' + id] || 0)); return false; }
      G.addBuilding(g, s, id); g.wonders[id] = s.id;
      var w = AU.WONDERS[id];
      if (AU.Palace) AU.Palace.onWonder(g, civ);
      if (w.fx.freeTech) G.grantFreeTech(g, civ);
      if (w.fx.freeCivic) G.grantFreeCivic(g, civ);
      if (w.fx.instantGold) civ.gold += w.fx.instantGold;
      if (id === 'terracotta_army') G.civUnits(g, civ.idx).forEach(function (u) { var c = AU.UNITS[u.type].cls; if (c !== 'naval' && c !== 'navalRanged' && c !== 'civilian') u.bonusStr += 3; });
      G.log(g, G.civData(civ).name + ' completed the ' + w.name + ' in ' + s.name + '.', civ.idx);
      G.quote(g, civ, 'wonder', id, w.name, _('Wonder completed in') + ' ' + s.name);
      g.civs.forEach(function (c) { G.notify(g, c, { kind: 'wonder', text: (c === civ ? _('You') : G.civData(civ).name) + ' completed the ' + w.name + (c === civ ? ' in ' + s.name : '') + '.', tile: s.tile, settlement: s.id }); });
    } else if (kind === 'national') {
      if (!G.canBuildNational(g, s, id)) { civ.gold += Math.round(s.progress['national:' + id] || 0); return false; }
      G.addBuilding(g, s, id); civ.nationalCount = (civ.nationalCount || 0) + 1; civ._fx = null;
      var nw = AU.NATIONAL[id];
      if (nw.fx && nw.fx.freeTech) G.grantFreeTech(g, civ);
      G.notify(g, civ, { kind: 'wonder', text: s.name + ' completed the ' + nw.name + '.', tile: s.tile, settlement: s.id });
      G.quote(g, civ, 'national', id, nw.name, _('National wonder completed in') + ' ' + s.name);
      G.log(g, G.civData(civ).name + ' completed the ' + nw.name + '.', civ.idx);
    } else if (kind === 'project') {
      civ.projects = civ.projects || {}; civ.projects[id] = g.turn;
      G.log(g, G.civData(civ).name + ' completed ' + AU.PROJECTS[id].name + '.', civ.idx);
      g.civs.forEach(function (c) { G.notify(g, c, { kind: 'project', text: (c === civ ? _('You') : G.civData(civ).name) + ' completed ' + AU.PROJECTS[id].name + '!', tile: s.tile }); });
      if (id === 'launch_satellite') { for (var i = 0; i < civ.explored.length; i++) civ.explored[i] = 1; }
      if (id === 'colony_ship') g.victory = { type: 'science', civ: civ.idx, turn: g.turn };
    }
    return true;
  };
  G.findSpawnTile = function (g, s, unitId) {
    var def = AU.UNITS[unitId], naval = def.cls === 'naval' || def.cls === 'navalRanged';
    var center = g.tiles[s.tile];
    var civilian = def.cls === 'civilian';
    function free(i) { return !G.unitsAt(g, i).some(function (o) { return o.civ !== s.civ || G.isMilitary(o) === !civilian; }); }
    if ((!naval || center.navigable) && free(s.tile)) return s.tile;
    var ring = Hex.spiral(center.col, center.row, 2, g.W, g.H);
    for (var i = 1; i < ring.length; i++) {
      var t = g.tiles[ring[i]];
      if (naval ? !(G.isWater(t) || t.navigable) : !G.passable(g, t)) continue;
      if (t.camp) continue;
      if (free(ring[i])) return ring[i];
    }
    return null;
  };

  // ---------- Town / city management ----------
  G.cityUpgradeCost = function (g, civ) {
    var fx = G.civFx(g, civ), cities = G.civSettlements(g, civ.idx).filter(function (s) { return s.isCity; }).length;
    return Math.round((150 + 120 * cities) * (fx.cityUpgradeCostMult || 1) * G.speed(g));
  };
  G.upgradeToCity = function (g, s) {
    var civ = g.civs[s.civ], cost = G.cityUpgradeCost(g, civ);
    if (s.isCity || civ.gold < cost) return false;
    civ.gold -= cost; s.isCity = true; s.specialization = null;
    G.log(g, s.name + ' ' + _('has become a City.'), civ.idx);
    return true;
  };
  // Town specializations: the five shared ones plus an empire's own (data.ut).
  G.specializationDef = function (civ, spec) { var d = AU.SPECIALIZATIONS[spec]; if (d) return d; var ut = civ && G.civData(civ).ut; return ut && ut.id === spec ? ut : null; };
  G.specializationsFor = function (civ) { var out = {}; for (var k in AU.SPECIALIZATIONS) out[k] = AU.SPECIALIZATIONS[k]; var ut = civ && G.civData(civ).ut; if (ut) out[ut.id] = ut; return out; };
  // An empire's unique improvement applies where the base improvement would be built, on matching tiles.
  // Tile conditions shared by unique improvements (ui.when) and unique town tile bonuses (ut.fx.tileYields.when):
  // hills, flat, river, coast/water (next to any water), forest (forest or jungle), resource, any terrain id, any feature id, any improvement id.
  G.tileMatches = function (g, t, w, imp) {
    if (!w || w === 'all') return true;
    if (w === 'hills') return !!t.hills; if (w === 'flat') return !t.hills; if (w === 'river') return !!t.river; if (w === 'resource') return !!t.resource;
    if (w === 'coast' || w === 'water') return G.isWater(t) || G.neighbors(g, t).some(function (n) { return G.isWater(g.tiles[n]); });
    if (w === 'forest') return t.feature === 'forest' || t.feature === 'jungle';
    return t.terrain === w || t.feature === w || (imp && imp === w);
  };
  G.uniqueImprovement = function (g, t, civ, imp) { var ui = civ && G.civData(civ).ui; if (!ui || !imp || ui.replaces !== imp) return null; return G.tileMatches(g, t, ui.when, imp) ? ui : null; };
  G.improvementName = function (g, t, civ, imp) { var ui = G.uniqueImprovement(g, t, civ, imp); return ui ? ui.name : AU.IMPROVEMENTS[imp].name; };
  G.canSpecialize = function (g, s, spec) { var d = G.specializationDef(g.civs[s.civ], spec); if (!d) return false; return !s.isCity && s.pop >= d.minPop && s.specialization !== spec; };
  G.specialize = function (g, s, spec) {
    if (!G.canSpecialize(g, s, spec)) return false;
    var civ = g.civs[s.civ];
    if (s.specialization) { if (civ.gold < 60) return false; civ.gold -= 60; }
    s.specialization = spec;
    if (spec === 'fort') G.addBuilding(g, s, 'walls'); var utW = G.civData(g.civs[s.civ]).ut; if (utW && spec === utW.id && utW.fx && utW.fx.freeWalls) G.addBuilding(g, s, 'walls');
    return true;
  };
  G.nearestCity = function (g, s) {
    var best = null, bd = 1e9, t = g.tiles[s.tile];
    G.civSettlements(g, s.civ).forEach(function (o) { if (!o.isCity || o === s) return; var d = G.dist(t, g.tiles[o.tile]); if (d < bd) { bd = d; best = o; } });
    return best;
  };

  // ---------- Research ----------
  G.availableTechs = function (civ) { return AU.TECHS.filter(function (t) { return !civ.techs[t.id] && t.pre.every(function (p) { return civ.techs[p]; }); }); };
  G.availableCivics = function (civ) { return AU.CIVICS.filter(function (t) { return !civ.civics[t.id] && t.pre.every(function (p) { return civ.civics[p]; }); }); };
  // Later eras cost more per point of Knowledge and Heritage (+20% per era) so a game lasts the eight eras.
  G.techCost = function (g, civ, t) { return Math.round(t.cost * (1 + 0.2 * (t.era || 0)) * (G.civFx(g, civ).techCostMult || 1) * G.speed(g)); };
  G.civicCost = function (g, civ, t) { return Math.round(t.cost * (1 + 0.2 * (t.era || 0)) * (G.civFx(g, civ).civicCostMult || 1) * G.speed(g)); };
  // Mastery: a technology or civic finished after its Spark / Insight fired keeps a permanent bonus.
  G.masteryOf = function (id, isCivic) { return AU.MASTERY ? (isCivic ? AU.MASTERY.civics[id] : AU.MASTERY.techs[id]) : null; };
  G.hasMastery = function (civ, id, isCivic) { return !!(civ.mastery && civ.mastery[isCivic ? 'c:' + id : id]); };
  G.grantMastery = function (g, civ, id, isCivic) {
    var key = isCivic ? 'c:' + id : id, m = G.masteryOf(id, isCivic), def = isCivic ? AU.CIVIC_BY_ID[id] : AU.TECH_BY_ID[id], cond = def && (isCivic ? def.inspiration : def.eureka);
    if (!m || (cond && !(civ.boosts && civ.boosts[key]))) return false; // no Spark or Insight at all: the mastery comes with the discovery
    civ.mastery = civ.mastery || {}; civ.mastery[key] = g.turn; civ._fx = null; g.fxGen = (g.fxGen || 0) + 1;
    var name = isCivic ? AU.CIVIC_BY_ID[id].name : AU.TECH_BY_ID[id].name;
    G.notify(g, civ, { kind: isCivic ? 'civic' : 'tech', text: '⭐ ' + _('Mastery of') + ' ' + name + ': ' + m.desc + '.', panel: isCivic ? 'civics' : 'tech' });
    return true;
  };
  G.learnTech = function (g, civ, id) {
    civ.techs[id] = g.turn; delete civ.techProgress[id];
    G.grantMastery(g, civ, id, false);
    if (civ.currentTech === id) civ.currentTech = null;
    civ.era = G.era(civ);
    var fx = G.civFx(g, civ);
    if (fx.techGold) civ.gold += fx.techGold;
    if (fx.techCulture) civ.bonusCulture = (civ.bonusCulture || 0) + fx.techCulture;
    if (fx.freeBuildingWithTech) for (var fb in fx.freeBuildingWithTech) if (fx.freeBuildingWithTech[fb] === id) G.civSettlements(g, civ.idx).forEach(function (s) { G.addBuilding(g, s, fb); });
    G.notify(g, civ, { kind: 'tech', text: _('Research complete') + ': ' + AU.TECH_BY_ID[id].name + '.', panel: 'tech' });
    G.quote(g, civ, 'tech', id, AU.TECH_BY_ID[id].name, _('Technology discovered'));
  };
  G.learnCivic = function (g, civ, id) {
    civ.civics[id] = g.turn; delete civ.civicProgress[id];
    G.grantMastery(g, civ, id, true);
    if (AU.CityStates && !civ.minor) AU.CityStates.grantEnvoy(g, civ, 1, AU.CIVIC_BY_ID[id].name);
    if (civ.currentCivic === id) civ.currentCivic = null;
    var cfx = G.civFx(g, civ); if (cfx.civicScience) civ.bonusScience = (civ.bonusScience || 0) + cfx.civicScience;
    civ._fx = null;
    var c = AU.CIVIC_BY_ID[id];
    G.notify(g, civ, { kind: 'civic', text: _('Civic adopted') + ': ' + c.name + (c.unlocks ? ' (unlocks ' + c.unlocks + ')' : '') + '.', panel: 'civics' });
    if (c.cards && c.cards.length) G.notify(g, civ, { big: true, kind: 'civic', text: '🃏 ' + _('New policy card') + (c.cards.length > 1 ? 's' : '') + ': ' + c.cards.map(function (k) { return AU.POLICIES[k] ? AU.POLICIES[k].name : k; }).join(', ') + '. ' + _('Slot') + ' ' + (c.cards.length > 1 ? 'them' : 'it') + ' ' + _('in Government & policies.'), panel: 'civics', tab: 'policies' });
    for (var gid in AU.GOVERNMENTS) if (AU.GOVERNMENTS[gid].civic === id) G.notify(g, civ, { big: true, kind: 'civic', text: '🏛️ ' + _('New government available') + ': ' + AU.GOVERNMENTS[gid].name + '.', panel: 'civics', tab: 'policies' });
    G.quote(g, civ, 'civic', id, c.name, _('Civic adopted'));
  };
  G.abilityDesc = function (ab) { var g = AU.App && AU.App.g; return ab && g && g.v2 && ab.descV2 ? ab.descV2 : (ab ? ab.desc : ''); }; // the Divergence wording of an ability, when it has one
  G.grantFreeTech = function (g, civ) { if (g.v2 && AU.MasteryWeb) return AU.MasteryWeb.grantFreeSpark(g, civ); var av = G.availableTechs(civ); if (!av.length) return; av.sort(function (a, b) { return a.cost - b.cost; }); G.learnTech(g, civ, av[0].id); };
  G.grantFreeCivic = function (g, civ) { if (g.v2 && AU.MasteryWeb) return AU.MasteryWeb.grantFreeSpark(g, civ); var av = G.availableCivics(civ); if (!av.length) return; av.sort(function (a, b) { return a.cost - b.cost; }); G.learnCivic(g, civ, av[0].id); };
  G.availableGovernments = function (civ) { var out = []; for (var id in AU.GOVERNMENTS) { var gv = AU.GOVERNMENTS[id]; if (!gv.civic || civ.civics[gv.civic]) out.push(id); } return out; };
  G.setGovernment = function (g, civ, id) { if (G.availableGovernments(civ).indexOf(id) < 0) return false; civ.government = id; civ._fx = null; G.setPolicies(g, civ, civ.policies || []); return true; };
  G.policySlots = function (civ) { return AU.GOVERNMENTS[civ.government].slots; };
  G.availablePolicies = function (civ) { var out = []; for (var cid in civ.civics) { var c = AU.CIVIC_BY_ID[cid]; if (c && c.cards) c.cards.forEach(function (k) { if (AU.POLICIES[k] && out.indexOf(k) < 0) out.push(k); }); } return out; };
  // Validate a card list against the government's slots (wildcard slots accept any type). Returns the accepted list.
  G.setPolicies = function (g, civ, ids) {
    var slots = Object.assign({}, G.policySlots(civ)), avail = G.availablePolicies(civ), accepted = [], seen = {};
    ids.forEach(function (id) {
      var pc = AU.POLICIES[id]; if (!pc || avail.indexOf(id) < 0 || seen[id]) return;
      if (slots[pc.type] > 0) { slots[pc.type]--; accepted.push(id); seen[id] = 1; }
      else if (slots.wildcard > 0) { slots.wildcard--; accepted.push(id); seen[id] = 1; }
    });
    civ.policies = accepted; civ._fx = null;
    return accepted;
  };
  G.freeSlots = function (civ) { var slots = Object.assign({}, G.policySlots(civ)); (civ.policies || []).forEach(function (id) { var t = AU.POLICIES[id].type; if (slots[t] > 0) slots[t]--; else slots.wildcard--; }); return slots; };

  // ---------- Sparks & insights ----------
  G.condMet = function (g, civ, cond) {
    var type = cond[0], a = cond[1], n = cond[2] || 1, sets = G.civSettlements(g, civ.idx), units = G.civUnits(g, civ.idx);
    function anyOf(v) { return String(a).split('|').indexOf(v) >= 0; }
    function countBuilding(id) { var c = 0; sets.forEach(function (s) { if (G.hasBuilding(s, id)) c++; }); return c; }
    switch (type) {
      case 'pop': return sets.some(function (s) { return s.pop >= a; });
      case 'totalPop': return sets.reduce(function (t, s) { return t + s.pop; }, 0) >= a;
      case 'improvement': { var c = 0; sets.forEach(function (s) { s.tiles.forEach(function (i) { var t = g.tiles[i]; if (t.worked && i !== s.tile && anyOf(G.improvementFor(g, t, civ) || '')) c++; }); }); return c >= n; }
      case 'improvedTiles': { var c2 = 0; sets.forEach(function (s) { s.tiles.forEach(function (i) { if (g.tiles[i].worked && i !== s.tile) c2++; }); }); return c2 >= a; }
      case 'coastal': return sets.filter(function (s) { return G.isCoastal(g, s); }).length >= a;
      case 'river': return sets.some(function (s) { return G.hasRiver(g, s); });
      case 'adjacent': return sets.some(function (s) { return G.neighbors(g, g.tiles[s.tile]).some(function (i) { return g.tiles[i].terrain === a; }); });
      case 'building': return countBuilding(a) >= n;
      case 'event': return !!civ.flags['ev:' + a];
      case 'met': return Object.keys(civ.met).length >= a;
      case 'metAll': return g.civs.filter(function (c) { return c.alive && c.idx !== civ.idx; }).every(function (c) { return civ.met[c.idx]; });
      case 'tiles': { var c3 = 0; sets.forEach(function (s) { s.tiles.forEach(function (i) { var t = g.tiles[i]; if ((a === 'hills' && t.hills) || t.terrain === a) c3++; }); }); return c3 >= n; }
      case 'feature': { var c4 = 0; sets.forEach(function (s) { s.tiles.forEach(function (i) { if (anyOf(g.tiles[i].feature || '')) c4++; }); }); return c4 >= n; }
      case 'kills': return (civ.stats.kills || 0) >= a;
      case 'captures': return (civ.stats.captures || 0) >= a;
      case 'resource': { var lc = G.luxuryCount(g, civ); return String(a).split('|').some(function (r) { return (lc.strategic[r] || 0) > 0 || lc.luxuries.indexOf(r) >= 0 || lc.bonus.indexOf(r) >= 0; }); }
      case 'resourcekind': { var lc2 = G.luxuryCount(g, civ); return (a === 'luxury' ? lc2.luxuries.length : Object.keys(lc2.strategic).length) >= n; }
      case 'gold': return civ.gold >= a;
      case 'unit': return units.filter(function (u) { return u.type === a || (AU.UNITS[u.type].upgradesTo === a && false); }).length >= n;
      case 'unitcls': return units.filter(function (u) { return anyOf(AU.UNITS[u.type].cls); }).length >= n;
      case 'military': return units.filter(G.isMilitary).length >= a;
      case 'settlements': return sets.length >= a;
      case 'cities': return sets.filter(function (s) { return s.isCity; }).length >= a;
      case 'civics': return Object.keys(civ.civics).length >= a;
      case 'tech': return !!civ.techs[a];
      case 'civicera': { for (var cid in civ.civics) if (AU.CIVIC_BY_ID[cid].era >= a) return true; return false; }
      case 'level': return units.some(function (u) { return AU.U.level(u) >= a; });
      case 'wonders': { var w = 0; for (var wid in g.wonders) if (g.settlements[g.wonders[wid]] && g.settlements[g.wonders[wid]].civ === civ.idx) w++; return w >= a; }
      case 'project': return !!(civ.projects && civ.projects[a]);
      case 'peaceWith': return g.civs.filter(function (c) { return c.alive && c.idx !== civ.idx && civ.met[c.idx] && !civ.rel[c.idx].war; }).length >= a;
      case 'abroad': { var cc = G.capitalContinent(g, civ); return sets.some(function (s) { return g.tiles[s.tile].continent !== cc; }); }
      case 'government': return anyOf(civ.government);
      case 'warTurns': return (civ.stats.warTurns || 0) >= a;
      default: return false;
    }
  };
  G.checkBoosts = function (g, civ) {
    if (g.v2) { if (AU.MasteryWeb) AU.MasteryWeb.evaluate && AU.MasteryWeb.evaluate(g, civ); return; } // Divergence: the Mastery Web fires Sparks, the classic boosts never do
    civ.boosts = civ.boosts || {};
    AU.TECHS.forEach(function (t) {
      if (civ.techs[t.id] || civ.boosts[t.id] || !t.eureka) return;
      if (!G.condMet(g, civ, t.eureka.cond)) return;
      civ.boosts[t.id] = g.turn;
      var disc = G.civFx(g, civ).eurekaDiscount || 0, gain = disc ? Math.round(G.techCost(g, civ, t) * disc) : 0; // only some leaders get Knowledge from a Spark
      if (gain) civ.techProgress[t.id] = Math.min(G.techCost(g, civ, t) - 1, (civ.techProgress[t.id] || 0) + gain);
      var mt = G.masteryOf(t.id, false);
      G.notify(g, civ, { big: true, kind: 'tech', text: '💡 ' + _('Spark!') + ' ' + t.name + (mt ? ': ' + _('finish it to earn its mastery') + ' (' + mt.desc + ')' : '') + (gain ? ' · +' + gain + ' ' + _('Knowledge') : '') + '.', panel: 'tech' });
    });
    AU.CIVICS.forEach(function (c) {
      if (civ.civics[c.id] || civ.boosts['c:' + c.id] || !c.inspiration) return;
      if (!G.condMet(g, civ, c.inspiration.cond)) return;
      civ.boosts['c:' + c.id] = g.turn;
      var disc2 = G.civFx(g, civ).inspirationDiscount || 0, gain2 = disc2 ? Math.round(G.civicCost(g, civ, c) * disc2) : 0;
      if (gain2) civ.civicProgress[c.id] = Math.min(G.civicCost(g, civ, c) - 1, (civ.civicProgress[c.id] || 0) + gain2);
      var mc = G.masteryOf(c.id, true);
      G.notify(g, civ, { big: true, kind: 'civic', text: '💡 ' + _('Insight!') + ' ' + c.name + (mc ? ': ' + _('finish it to earn its mastery') + ' (' + mc.desc + ')' : '') + (gain2 ? ' · +' + gain2 + ' ' + _('Heritage') : '') + '.', panel: 'civics' });
    });
  };

  // ---------- Diplomacy ----------
  // Command: how many units an empire can order in a turn. Old World's orders, reshaped: a base plus settlements and
  // command buildings, minus bureaucracy beyond eight settlements. A unit's first action of the turn spends 1 Command,
  // 2 when it stands more than 5 tiles from any of the empire's settlements, 3 beyond 10: far campaigns are slow to direct.
  G.COMMAND_BASE = 5; G.COMMAND_BUILDINGS = { palace: 3, barracks: 1, castle: 1, military_academy: 2, telegraph_office: 2, railway_station: 1, airport: 2, broadcast_tower: 1, computer_center: 1, grand_arsenal: 2 };
  G.commandMax = function (g, civ) {
    if (civ.minor || civ.idx < 0) return 999;
    var sets = G.civSettlements(g, civ.idx), n = G.COMMAND_BASE + sets.length, fx = G.civFx(g, civ);
    sets.forEach(function (s) { if (s.unrest > g.turn) { n -= 1; return; } s.buildings.forEach(function (b) { n += G.COMMAND_BUILDINGS[b] || 0; }); });
    if (sets.length > 8) n -= Math.floor((sets.length - 8) / 3); // bureaucracy
    n += fx.commandBonus || 0;
    return Math.max(3, Math.round(n));
  };
  G.commandLeft = function (g, civ) { return civ.command === undefined ? G.commandMax(g, civ) : civ.command; };
  G.resetCommand = function (g, civ) { civ.command = G.commandMax(g, civ); };
  G.orderCost = function (g, u) {
    if (u.civ < 0 || g.civs[u.civ].minor) return 0;
    var t = g.tiles[u.tile], best = 99, sets = G.civSettlements(g, u.civ); if (!sets.length) return 1; // a people still on the move: every order is near
    sets.forEach(function (s) { var d = G.dist(t, g.tiles[s.tile]); if (d < best) best = d; });
    var ofx = G.civFx(g, g.civs[u.civ]), own = t.owner >= 0 && G.tileOwnerCiv(g, t) === u.civ;
    if (g.v2 && t.river && own) return 1; // Divergence: word travels fast along your own rivers
    if (ofx.roadOrders && t.road && own) return 1; // an empire of roads: every order reaches its own roads at once
    var cost = best <= 5 ? 1 : best <= 10 ? 2 : 3; if (ofx.farOrderDiscount) cost = Math.max(1, cost - ofx.farOrderDiscount);
    return cost;
  };
  G.canOrder = function (g, u) { if (u.civ < 0 || g.civs[u.civ].minor) return true; if (u.orderedTurn === g.turn) return true; return G.commandLeft(g, g.civs[u.civ]) >= G.orderCost(g, u); };
  // A unit's first action of the turn spends its order; later actions of the same turn are free.
  G.spendOrder = function (g, u) {
    if (u.civ < 0 || g.civs[u.civ].minor || u.orderedTurn === g.turn) return true;
    var civ = g.civs[u.civ], cost = G.orderCost(g, u); if (civ.command === undefined) civ.command = G.commandMax(g, civ);
    if (civ.command < cost) return false;
    civ.command -= cost; u.orderedTurn = g.turn; u.orderCost = cost; return true;
  };
  G.refundOrder = function (g, u) { if (u.orderedTurn !== g.turn) return; var civ = g.civs[u.civ]; if (civ) civ.command = (civ.command || 0) + (u.orderCost || 1); u.orderedTurn = -1; };
  // Balance of power: an empire holding 40% of the majors' settlements, or twice the next one, is a runaway the world turns against.
  G.dominance = function (g, civIdx) { var majors = g.civs.filter(function (c) { return c.alive && !c.minor; }); if (majors.length < 3) return 0; var counts = majors.map(function (c) { return G.civSettlements(g, c.idx).length; }), total = counts.reduce(function (a, b) { return a + b; }, 0), mine = G.civSettlements(g, civIdx).length; if (!total || !mine) return 0; var second = Math.max.apply(null, majors.filter(function (c) { return c.idx !== civIdx; }).map(function (c) { return G.civSettlements(g, c.idx).length; })); return Math.max(mine / total, second ? mine / (2 * second) : 0); };
  // Loyalty: while unrest lasts, an unhappy conquered settlement more than 8 tiles from its new capital may return to its old owner (if alive).
  G.revoltsTurn = function (g) {
    for (var id in g.settlements) {
      var s = g.settlements[id]; if (!(s.unrest > g.turn) || s.origCiv === undefined) continue;
      var owner = g.civs[s.civ], old = g.civs[s.origCiv]; if (!old || !old.alive || old.minor || old.idx === s.civ) continue;
      var cap = owner.capital && g.settlements[owner.capital]; var far = !cap || G.dist(g.tiles[cap.tile], g.tiles[s.tile]) > (G.isRunaway(g, owner) ? 5 : 8); // a runaway holds its conquests less firmly
      if (!far || G.settlementYields(g, s).happiness >= 0) continue;
      var garrison = G.unitsAt(g, s.tile).some(function (u) { return u.civ === s.civ && G.isMilitary(u); });
      if (G.rng(g) < (garrison ? 0.05 : 0.15)) {
        var name = s.name; s.civ = old.idx; s.unrest = g.turn + 5; s.captured = false; s.origCiv = undefined; s.queue = []; s.progress = {}; s.hp = Math.round(G.settlementMaxHp(g, s) * 0.5);
        G.unitsAt(g, s.tile).forEach(function (u) { if (u.civ === owner.idx) { var away = G.neighbors(g, g.tiles[s.tile]).filter(function (n) { return G.passable(g, g.tiles[n]) && !G.unitsAt(g, n).length && !G.isWater(g.tiles[n]); })[0]; if (away != null) G.setUnitTile(g, u, away); else G.removeUnit(g, u); } });
        if (!old.capital || !g.settlements[old.capital] || g.settlements[old.capital].civ !== old.idx) { old.capital = s.id; s.isCapital = true; s.isCity = true; G.addBuilding(g, s, 'palace'); }
        owner._fx = null; old._fx = null; g.fxGen = (g.fxGen || 0) + 1;
        G.log(g, name + ' rose up and returned to ' + G.civData(old).name + '.', old.idx);
        g.civs.forEach(function (c) { if (c.isPlayer && (c.idx === owner.idx || c.idx === old.idx)) G.notify(g, c, { kind: c.idx === old.idx ? 'capture' : 'loss', text: '✊ ' + name + ' ' + (c.idx === old.idx ? _('rose up and returned to you!') : _('rose up and returned to') + ' ' + G.civData(old).name + '.'), tile: s.tile, settlement: s.id }); });
      }
    }
  };
  G.isRunaway = function (g, civ) { return civ && civ.alive && !civ.minor && G.dominance(g, civ.idx) >= 0.4; };
  G.declareWar = function (g, a, b) {
    var ca = g.civs[a], cb = g.civs[b];
    ca.rel[b].war = true; cb.rel[a].war = true; ca.rel[b].warSince = g.turn; cb.rel[a].warSince = g.turn; ca.rel[b].warBy = a; cb.rel[a].warBy = a; ca.rel[b].capturedThisWar = 0; cb.rel[a].capturedThisWar = 0;
    cb.flags['ev:warDeclaredOnUs'] = g.turn; ca.flags['ev:war'] = g.turn;
    if (AU.CityStates) AU.CityStates.onWarDeclared(g, a, b);
    cb.rel[a].attitude -= 30;
    g.civs.forEach(function (c) { if (c.idx !== a && c.idx !== b && c.alive) c.rel[a].attitude -= 5; });
    if (AU.Diplo) AU.Diplo.onWarDeclared(g, a, b);
    G.log(g, G.civData(ca).name + ' declared war on ' + G.civData(cb).name + '!', a);
    g.civs.forEach(function (c) { if (c.isPlayer) G.notify(g, c, { kind: 'war', text: (c.idx === a ? _('You declared war on') + ' ' + G.civData(cb).name : G.civData(ca).name + ' declared war on ' + (c.idx === b ? 'you' : G.civData(cb).name)) + '!', panel: 'diplomacy' }); });
  };
  G.makePeace = function (g, a, b) {
    var ca = g.civs[a], cb = g.civs[b];
    var bled = (ca.rel[b].capturedThisWar || 0) + (cb.rel[a].capturedThisWar || 0), truce = 25 + (bled ? 15 : 0); // a peace holds 25 turns, 40 after a war that took settlements
    ca.rel[b].war = false; cb.rel[a].war = false; ca.rel[b].peaceUntil = g.turn + truce; cb.rel[a].peaceUntil = g.turn + truce;
    ca.rel[b].attitude += 10; cb.rel[a].attitude += 10;
    G.log(g, G.civData(ca).name + ' and ' + G.civData(cb).name + ' made peace.', a);
    g.civs.forEach(function (c) { if (c.isPlayer && (c.idx === a || c.idx === b)) G.notify(g, c, { kind: 'peace', text: _('Peace with') + ' ' + G.civData(c.idx === a ? cb : ca).name + '.', panel: 'diplomacy' }); });
  };
  G.militaryStrength = function (g, civIdx) { var s = 0; G.civUnits(g, civIdx).forEach(function (u) { var d = AU.UNITS[u.type]; s += Math.max(d.strength, d.ranged || 0) * u.hp / 100; }); return s; };
  G.aiAcceptsPeace = function (g, ai, other) {
    var rel = ai.rel[other];
    if (!rel.war) return false;
    if (ai.minor && g.turn - rel.warSince >= 5) return true;
    if (g.turn - rel.warSince < 8) return false;
    var mine = G.militaryStrength(g, ai.idx), theirs = G.militaryStrength(g, other);
    var losing = theirs > mine * 1.2 || (rel.lostThisWar || 0) > 0;
    if ((rel.capturedThisWar || 0) >= 2) return true; // satiated: two settlements taken is a war won
    return losing || rel.attitude > -10 || g.turn - rel.warSince > 30;
  };

  // ---------- Fame & culture ----------
  // Fame per turn: wonders, cultural buildings and natural wonders inside the borders, scaled by era.
  G.tourism = function (g, civ) {
    var fx = G.civFx(g, civ), t = 0, sets = G.civSettlements(g, civ.idx);
    sets.forEach(function (s) {
      var t0 = t, heavy = g.v2 && AU.Smoke && AU.Smoke.heavy(AU.Smoke.smoke(g, s));
      if (s.greatWorks) t += s.greatWorks * 3;
      s.buildings.forEach(function (b) {
        if (AU.WONDERS[b]) t += 3;
        else if (AU.NATIONAL[b]) t += 2;
        else if (AU.BUILDINGS[b]) { var bd = AU.BUILDINGS[b]; t += bd.tourism !== undefined ? bd.tourism : (bd.yields && bd.yields.culture ? bd.yields.culture * 0.5 : 0); }
      });
      s.tiles.forEach(function (i) { if (g.tiles[i].natural) t += 2; });
      if (heavy) t = t0 + (t - t0) * 0.5; // nobody visits a smoky town
    });
    if (AU.Palace && !civ.minor) t += AU.Palace.fx(civ).tourism;
    t *= (1 + civ.era * 0.25) * (1 + (fx.tourismMult || 0));
    return Math.round(t * 10) / 10;
  };
  G.visitors = function (g, civ) { return Math.floor((civ.tourismTotal || 0) / 150); };
  G.domesticTourists = function (g, civ) { return 5 + Math.floor((civ.cultureTotal || 0) / 100); };
  // Heritage victory: your foreign visitors exceed the domestic tourists of every other living empire (Modern era or later).
  G.cultureProgress = function (g, civ) {
    var v = G.visitors(g, civ), need = 0;
    g.civs.forEach(function (o) { if (o.alive && !o.minor && o.idx !== civ.idx) need = Math.max(need, G.domesticTourists(g, o)); });
    return { visitors: v, need: need + 1, ready: civ.era >= 5 && v > need }; // from the Modern era on
  };

  // ---------- Score & victory ----------
  G.score = function (g, civ) {
    var s = 0;
    G.civSettlements(g, civ.idx).forEach(function (st) { s += st.pop * 2 + 5 + (st.isCity ? 3 : 0) + st.buildings.length; });
    s += Object.keys(civ.techs).length * 3 + Object.keys(civ.civics).length * 3;
    for (var w in g.wonders) if (g.settlements[g.wonders[w]] && g.settlements[g.wonders[w]].civ === civ.idx) s += 20;
    s += (civ.nationalCount || 0) * 8;
    s += (civ.stats.captures || 0) * 10;
    return s;
  };
  G.checkVictory = function (g) {
    if (g.victory) return g.victory;
    var alive = g.civs.filter(function (c) { return c.alive && !c.minor; });
    if (alive.length === 1) { g.victory = { type: 'domination', civ: alive[0].idx, turn: g.turn }; return g.victory; }
    // domination: hold every original capital
    for (var i = 0; i < alive.length; i++) {
      var c = alive[i], all = true;
      for (var j = 0; j < g.civs.length; j++) { if (g.civs[j].minor) continue; var oc = g.settlements[g.civs[j].originalCapital]; if (!oc || oc.civ !== c.idx) { all = false; break; } }
      if (all) { g.victory = { type: 'domination', civ: c.idx, turn: g.turn }; return g.victory; }
    }
    if (AU.Religion) { var rv = AU.Religion.checkVictory(g); if (rv) { g.victory = rv; return rv; } }
    for (var k = 0; k < alive.length; k++) { if (alive.length > 1 && G.cultureProgress(g, alive[k]).ready) { g.victory = { type: 'culture', civ: alive[k].idx, turn: g.turn }; return g.victory; } }
    if (g.turn >= g.maxTurns) {
      var best = alive.slice().sort(function (a, b) { return G.score(g, b) - G.score(g, a); })[0];
      g.victory = { type: 'score', civ: best.idx, turn: g.turn };
    }
    return g.victory;
  };

  // ---------- Turn processing ----------
  G.processSettlement = function (g, s, foodBonus) {
    var civ = g.civs[s.civ], fx = G.civFx(g, civ), y = G.settlementYields(g, s);
    // food
    var surplus = y.food - s.pop * 2 + (foodBonus || 0);
    if (surplus > 0) surplus *= (fx.growthMult || 1) * (s.isCity ? (fx.cityGrowthMult || 1) : (fx.townGrowthMult || 1));
    if (g.v2 && AU.Society) { if (surplus > 0) { var gm = AU.Society.tierOf(y.happiness).growth; if (gm < 1 && fx.noUnhappinessPenalty) gm = 1; surplus *= gm; } }
    else if (y.happiness < 0 && surplus > 0 && !fx.noUnhappinessPenalty) surplus *= 0.5;
    var sends = 0;
    if (s.specialization && !s.isCity && surplus > 0) { sends = Math.min(surplus, 6) * (fx.townFoodMult || 1); } // a town feeds its City with at most 6 Food per turn
    else {
      s.food += surplus;
      var cost = G.growthCostFor(g, s);
      if (s.food >= cost) {
        s.food -= cost; s.pop += 1; s.pendingGrowth += 1;
        G.notify(g, civ, { kind: 'growth', text: s.name + ' has grown to ' + s.pop + '. ' + _('Choose a tile to expand.'), tile: s.tile, settlement: s.id });
      } else if (s.food < 0) {
        if (s.pop > 1) { s.pop -= 1; G.unworkWorstTile(g, s); G.notify(g, civ, { kind: 'starve', text: s.name + ' ' + _('is starving and shrank to') + ' ' + s.pop + '.', tile: s.tile, settlement: s.id }); }
        s.food = 0;
      }
    }
    // production
    if (s.isCity) {
      var prod = y.production + (s.bonusProduction || 0); if (s.bonusProduction) { if (!s.isCity) civ.gold += s.bonusProduction; s.bonusProduction = 0; }
      if (s.queue.length) {
        var item = s.queue[0], key = item.kind + ':' + item.id;
        if (item.kind === 'unit' && y.unitProductionPct) prod *= 1 + y.unitProductionPct / 100;
        if (item.kind === 'unit' && fx.pctUnitProductionEarly) { var ut0 = AU.UNITS[item.id], ue = ut0 && ut0.tech && AU.TECH_BY_ID[ut0.tech] ? AU.TECH_BY_ID[ut0.tech].era : 0; if (ue <= 1 && ut0.cls !== 'civilian') prod *= 1 + fx.pctUnitProductionEarly / 100; }
        s.progress[key] = (s.progress[key] || 0) + prod;
        var cost2 = G.itemCost(g, civ, item.kind, item.id, s);
        if (s.progress[key] >= cost2) {
          var overflow = s.progress[key] - cost2;
          delete s.progress[key];
          s.queue.shift();
          var ok = G.completeItem(g, s, item.kind, item.id);
          if (!ok && item.kind === 'unit') { s.queue.unshift(item); s.progress[key] = cost2; }
          else if (s.queue.length) { var k2 = s.queue[0].kind + ':' + s.queue[0].id; s.progress[k2] = (s.progress[k2] || 0) + overflow; }
          else civ.gold += overflow * 0.5;
        }
      } else {
        civ.gold += prod * 0.5;
        G.notify(g, civ, { kind: 'idle', text: s.name + ' has nothing to produce.', tile: s.tile, settlement: s.id });
      }
    }
    civ.gold += y.gold;
    civ._turnScience = (civ._turnScience || 0) + y.science; civ._turnFaith = (civ._turnFaith || 0) + (y.faith || 0);
    civ._turnCulture = (civ._turnCulture || 0) + y.culture;
    // heal settlement
    if (s.attackedTurn !== g.turn) s.hp = Math.min(G.settlementMaxHp(g, s), s.hp + 15);
    return sends;
  };
  G.unworkWorstTile = function (g, s) {
    var worst = null, wv = 1e9;
    s.tiles.forEach(function (i) { var t = g.tiles[i]; if (!t.worked || i === s.tile) return; var y = G.tileYields(g, t, s); var v = y.food * 2 + y.production + y.gold; if (v < wv) { wv = v; worst = t; } });
    if (worst) worst.worked = false;
  };
  // v2 city growth: every population point may claim one tile. The centre and the first two are free; from the fourth
  // a claim also costs Influence (15 per tile beyond the third, rising) and needs an Expansion building in the settlement.
  G.claimedCount = function (g, s) { var n = 0; s.tiles.forEach(function (i) { if (g.tiles[i].worked) n++; }); return n; };
  G.freeClaims = function (g, s) { return 3 + (G.civFx(g, g.civs[s.civ]).freeClaims || 0); };
  G.claimCost = function (g, s) { var n = G.claimedCount(g, s), free = G.freeClaims(g, s); return n < free ? 0 : Math.round(10 * (n - free + 1) * (G.civFx(g, g.civs[s.civ]).claimCostMult || 1)); };
  // Influence: 2 a turn plus 1 per settlement (a wider empire claims faster) plus 1 per 8 Heritage a turn plus ability bonuses.
  G.influenceFromHeritage = function (g, civ) { if (!g.v2) return 0; var y = G.civYields(g, civ); return Math.floor((y.culture || 0) / 8); };
  G.influenceIncome = function (g, civ) { return 2 + G.civSettlements(g, civ.idx).length + G.influenceFromHeritage(g, civ) + (G.civFx(g, civ).influencePerTurn || 0); };
  // Rivers (Divergence): a river tile is claimed free of Influence and needs no Boundary Marker; the river is the border everyone agrees on.
  G.freeClaimTile = function (g, tileIdx) { return !!(g.v2 && tileIdx != null && g.tiles[tileIdx] && g.tiles[tileIdx].river); };
  G.claimBlocker = function (g, s, tileIdx) { // null when the next claim may happen, else why not
    if (!g.v2) return null;
    var n = G.claimedCount(g, s); if (n < G.freeClaims(g, s)) return null;
    if (G.freeClaimTile(g, tileIdx)) return null;
    if (!G.hasBuilding(s, 'boundary_marker') && !G.hasBuilding(s, 'growth_hall')) return 'building';
    var civ = g.civs[s.civ]; if ((civ.influence || 0) < G.claimCost(g, s)) return 'influence';
    return null;
  };
  // The tiles a settlement may claim right now: all candidates when nothing blocks, else only the free river tiles.
  G.claimableTiles = function (g, s) { var c = G.expansionCandidates(g, s); if (!G.claimBlocker(g, s)) return c; return c.filter(function (i) { return G.freeClaimTile(g, i); }); };
  G.payClaim = function (g, s, tileIdx) { if (!g.v2) return; var civ = g.civs[s.civ]; if (G.freeClaimTile(g, tileIdx)) { var rfx = G.civFx(g, civ); if (rfx.riverClaimInfluence) civ.influence = (civ.influence || 0) + rfx.riverClaimInfluence; return; } var cost = G.claimCost(g, s); if (cost > 0) civ.influence = (civ.influence || 0) - cost; };
  G.autoExpand = function (g, s) {
    if (g.v2 && !G.hasBuilding(s, 'growth_hall') && s.pendingGrowth > 1) { s.specialists += s.pendingGrowth - 1; s.pendingGrowth = 1; } // without a Growth Hall only one claim waits; the rest become specialists
    while (s.pendingGrowth > 0) {
      var all = G.expansionCandidates(g, s);
      if (!all.length) { s.specialists += s.pendingGrowth; s.pendingGrowth = 0; break; }
      var cands = G.claimableTiles(g, s);
      if (!cands.length) break;
      var best = null, bv = -1e9;
      cands.forEach(function (i) { var t = g.tiles[i]; var y = G.tileYields(g, t, s); var v = y.food * 1.5 + y.production * 1.3 + y.gold * 0.7 + y.science + y.culture + (t.resource ? 2 : 0) + (G.freeClaimTile(g, i) && G.claimCost(g, s) > 0 ? 1.5 : 0); if (v > bv) { bv = v; best = i; } });
      G.payClaim(g, s, best); G.claimTile(g, s, best); s.pendingGrowth--;
    }
  };
  G.expandTo = function (g, s, tileIdx) {
    if (s.pendingGrowth <= 0) return false;
    if (G.expansionCandidates(g, s).indexOf(tileIdx) < 0) return false;
    if (G.claimBlocker(g, s, tileIdx)) return false;
    G.payClaim(g, s, tileIdx); G.claimTile(g, s, tileIdx); s.pendingGrowth--;
    return true;
  };
  // A settlement with Walls (or a Castle) bombards the strongest enemy military unit within 2 tiles once per turn.
  G.settlementStrike = function (g, s) {
    if (!G.hasBuilding(s, 'walls') && !G.hasBuilding(s, 'castle')) return null;
    var U = AU.U, civ = g.civs[s.civ], center = g.tiles[s.tile], best = null, bs = -1;
    for (var id in g.units) { var v = g.units[id]; if (v.civ === s.civ || !G.isMilitary(v) || !G.atWar(g, s.civ, v.civ)) continue; if (G.dist(center, g.tiles[v.tile]) > 2) continue; var st = U.strength(g, v, { attacking: false }); if (st > bs) { bs = st; best = v; } }
    if (!best) return null;
    var dmg = Math.round(U.damage(g, G.settlementStrength(g, s) - bs) * 0.6);
    best.hp -= dmg; var vciv = best.civ >= 0 ? g.civs[best.civ] : null;
    if (best.hp <= 0) { G.removeUnit(g, best); if (vciv) G.notify(g, vciv, { kind: 'loss', text: _('Your') + ' ' + best.name + ' was destroyed by the walls of ' + s.name + '.', tile: best.tile }); G.log(g, _('The walls of') + ' ' + s.name + ' destroyed a ' + best.name + '.', s.civ); }
    else if (vciv && vciv.isPlayer) G.notify(g, vciv, { kind: 'attack', text: _('The walls of') + ' ' + s.name + ' hit your ' + best.name + ' for ' + dmg + '.', tile: best.tile });
    if (civ.isPlayer) G.notify(g, civ, { kind: 'attack', text: s.name + '\'' + _('s walls hit an enemy') + ' ' + best.name + ' for ' + dmg + '.', tile: best.tile });
    return dmg;
  };
  G.settlementMaxHp = function (g, s) { var hp = 100; if (G.hasBuilding(s, 'walls')) hp += 100; if (G.hasBuilding(s, 'castle')) hp += 100; return hp; };
  G.settlementStrength = function (g, s) {
    var civ = g.civs[s.civ], fx = G.civFx(g, civ);
    var best = 10;
    for (var u in AU.UNITS) { var d = G.unitType(g, civ, u); if (d.cls === 'civilian' || d.cls === 'naval' || d.cls === 'navalRanged') continue; if (!G.gateOk(g, civ, 'unit', u, d)) continue; best = Math.max(best, d.strength); }
    var str = best + (s.isCity ? 3 : 0) + (fx.cityDefense || 0);
    var wallsMult = fx.wallsMult || 1;
    if (G.hasBuilding(s, 'walls')) str += 6 * wallsMult;
    if (G.hasBuilding(s, 'castle')) str += 8 * wallsMult;
    if (G.hasBuilding(s, 'alhambra')) str += 8;
    if (g.tiles[s.tile].hills) str += 3 + (fx.hillsDefense || 0);
    if (fx.coastalDefense && G.isCoastal(g, s)) str += fx.coastalDefense;
    if (s.specialization === 'fort') str += 5;
    var utD = G.civData(civ).ut; if (utD && s.specialization === utD.id && utD.fx && utD.fx.defense) str += utD.fx.defense;
    var garrison = G.unitsAt(g, s.tile).filter(function (u) { return G.isMilitary(u); })[0];
    if (garrison) str += 4;
    return str;
  };

  G.processCiv = function (g, civ) {
    if (!civ.alive) return;
    if (AU.Palace) AU.Palace.turn(g, civ);
    if (AU.Great) AU.Great.turn(g, civ);
    if (AU.CityStates && !civ.minor) AU.CityStates.routesTurn(g, civ);
    civ._turnScience = 0; civ._turnCulture = 0; civ._turnFaith = 0;
    var sets = G.civSettlements(g, civ.idx);
    var foodFor = {};
    // specialized towns first, so their food reaches cities this turn
    sets.filter(function (s) { return !s.isCity && s.specialization; }).forEach(function (s) {
      var sent = G.processSettlement(g, s, 0);
      if (sent > 0) { var c = G.nearestCity(g, s); if (c) foodFor[c.id] = (foodFor[c.id] || 0) + sent; }
    });
    sets.filter(function (s) { return s.isCity || !s.specialization; }).forEach(function (s) { G.processSettlement(g, s, foodFor[s.id] || 0); });
    sets.forEach(function (s) { G.settlementStrike(g, s); });
    // upkeep
    civ.gold -= G.unitUpkeep(g, civ);
    if (civ.gold < 0) {
      var mil = G.civUnits(g, civ.idx).filter(G.isMilitary);
      if (mil.length) { var victim = mil[0]; G.removeUnit(g, victim); G.notify(g, civ, { kind: 'disband', text: _('Your treasury is empty') + ': ' + victim.name + ' disbanded.' }); }
      civ.gold = 0;
    }
    // research
    civ._turnScience += civ.bonusScience || 0; civ._turnCulture += civ.bonusCulture || 0; civ.bonusScience = 0; civ.bonusCulture = 0;
    civ.cultureTotal = (civ.cultureTotal || 0) + civ._turnCulture; civ.tourismTotal = (civ.tourismTotal || 0) + G.tourism(g, civ);
    if (AU.Religion) { civ._turnFaith = (civ._turnFaith || 0) + (civ.bonusFaith || 0); civ.bonusFaith = 0; AU.Religion.turn(g, civ); }
    if (g.v2 && AU.MasteryWeb) { AU.MasteryWeb.turn(g, civ); civ.currentTech = null; civ.currentCivic = null; civ.influence = (civ.influence || 0) + G.influenceIncome(g, civ); if (AU.Synthesis) AU.Synthesis.aiTurn(g, civ); }
    else G.checkBoosts(g, civ);
    if (!g.v2 && !civ.currentTech) { var av = G.availableTechs(civ); if (av.length) { av.sort(function (a, b) { return a.cost - b.cost; }); civ.currentTech = av[0].id; } }
    if (!g.v2 && civ.currentTech) {
      civ.techProgress[civ.currentTech] = (civ.techProgress[civ.currentTech] || 0) + civ._turnScience;
      var t = AU.TECH_BY_ID[civ.currentTech];
      if (civ.techProgress[civ.currentTech] >= G.techCost(g, civ, t)) { var over = civ.techProgress[civ.currentTech] - G.techCost(g, civ, t); G.learnTech(g, civ, t.id); civ.techOverflow = over; }
    }
    if (civ.techOverflow && civ.currentTech === null) { var av2 = G.availableTechs(civ); if (av2.length) { av2.sort(function (a, b) { return a.cost - b.cost; }); civ.techProgress[av2[0].id] = (civ.techProgress[av2[0].id] || 0) + civ.techOverflow; } civ.techOverflow = 0; }
    if (!g.v2 && !civ.currentCivic) { var ac = G.availableCivics(civ); if (ac.length) { ac.sort(function (a, b) { return a.cost - b.cost; }); civ.currentCivic = ac[0].id; } }
    if (!g.v2 && civ.currentCivic) {
      civ.civicProgress[civ.currentCivic] = (civ.civicProgress[civ.currentCivic] || 0) + civ._turnCulture;
      var c2 = AU.CIVIC_BY_ID[civ.currentCivic];
      if (civ.civicProgress[civ.currentCivic] >= G.civicCost(g, civ, c2)) G.learnCivic(g, civ, c2.id);
    }
    // war weariness
    var atWar = g.civs.some(function (o) { return o.alive && o.idx !== civ.idx && civ.rel[o.idx].war; });
    if (atWar) civ.stats.warTurns = (civ.stats.warTurns || 0) + 1;
    var wwm = G.civFx(g, civ).warWearinessMult; if (wwm === undefined) wwm = 1;
    civ.warWeariness = Math.max(0, (civ.warWeariness || 0) + (atWar ? 1 * wwm : -2));
    civ.score = G.score(g, civ);
    civ._fx = null;
  };

  G.endTurn = function (g) {
    var player = G.player(g);
    g.notifications = [];
    G.civSettlements(g, player.idx).forEach(function (s) { if (s.pendingGrowth > 0) G.autoExpand(g, s); });
    // AI empires meet whoever comes within sight of their units (2 tiles) or settlements (3 tiles)
    g.undo = null;
    if (g.turn % 2 === 0) g.civs.forEach(function (a) {
      if (a.isPlayer || !a.alive) return;
      var near = function (tile, r) { var t0 = g.tiles[tile]; Hex.spiral(t0.col, t0.row, r, g.W, g.H).forEach(function (i) { var s0 = G.settlementAt(g, i); if (s0 && s0.civ !== a.idx && !a.met[s0.civ]) G.meet(g, a.idx, s0.civ); G.unitsAt(g, i).forEach(function (o) { if (o.civ >= 0 && o.civ !== a.idx && !a.met[o.civ]) G.meet(g, a.idx, o.civ); }); }); };
      G.civUnits(g, a.idx).forEach(function (u) { near(u.tile, 2); });
      G.civSettlements(g, a.idx).forEach(function (s) { near(s.tile, 3); });
    });
    // AI turns
    g.civs.forEach(function (civ) { if (!civ.isPlayer && civ.alive) { G.resetCommand(g, civ); AU.AI.takeTurn(g, civ); } });
    AU.AI.barbarianTurn(g);
    // city ranged attacks
    for (var sid in g.settlements) AU.U.settlementAttack(g, g.settlements[sid]);
    // economy
    g.civs.forEach(function (civ) { G.processCiv(g, civ); });
    if (AU.Religion) AU.Religion.spreadTurn(g);
    if (AU.CityStates) g.civs.forEach(function (civ) { if (civ.minor) { AU.CityStates.turn(g, civ); if (AU.Diplo) AU.Diplo.questTurn(g, civ); } });
    if (g.v2 && AU.Society) { g.civs.forEach(function (civ) { AU.Society.bondsTurn(g, civ); }); AU.Society.migrationTurn(g); }
    if (g.v2 && AU.Climate) AU.Climate.turn(g);
    G.revoltsTurn(g);
    g.civs.forEach(function (civ) { if (!civ.isPlayer || !civ.alive) return; var run = G.isRunaway(g, civ); if (run && !civ.flags['runawayWarned']) { civ.flags['runawayWarned'] = g.turn; G.notify(g, civ, { big: true, kind: 'war', text: '⚖️ ' + _('The world grows wary of your size: other leaders trust you less, and a wide realm is slow to command.'), panel: 'diplomacy' }); } else if (!run && civ.flags['runawayWarned']) delete civ.flags['runawayWarned']; });
    g.civs.forEach(function (civ) { if (!civ.isPlayer && civ.alive) G.civSettlements(g, civ.idx).forEach(function (s) { if (s.pendingGrowth > 0) G.autoExpand(g, s); }); });
    // units: heal and reset
    for (var id in g.units) AU.U.newTurn(g, g.units[id]);
    g.turn++;
    G.resetCommand(g, player);
    // player start of turn: continue paths, visibility
    G.civUnits(g, player.idx).forEach(function (u) { if (u.path && u.path.length) AU.U.followPath(g, u); });
    G.refreshVisibility(g, player);
    G.checkVictory(g);
    if (AU.Hall && (g.victory || !player.alive)) AU.Hall.record(g);
    G.autosaveHook && G.autosaveHook(g);
    return g;
  };

  // ---------- Save / load ----------
  // explored maps are stored run-length encoded ("0x120,1x35,...") to keep huge-map saves small
  function rleEncode(arr) { var out = [], cur = arr[0] ? 1 : 0, n = 0; for (var i = 0; i < arr.length; i++) { var v = arr[i] ? 1 : 0; if (v === cur) n++; else { out.push(cur + 'x' + n); cur = v; n = 1; } } out.push(cur + 'x' + n); return out.join(','); }
  function rleDecode(str, len) { var out = new Array(len).fill(0), pos = 0; str.split(',').forEach(function (p) { var v = +p.charAt(0), n = +p.slice(2); if (v) for (var i = 0; i < n; i++) out[pos + i] = 1; pos += n; }); return out; }
  G.serialize = function (g) {
    return JSON.stringify(g, function (k, v) {
      if (k.charAt(0) === '_') return undefined;
      if (k === 'visible') return undefined;
      if (k === 'explored') return { rle: rleEncode(v) };
      if (v instanceof Uint8Array) return Array.from(v);
      return v;
    });
  };
  G.deserialize = function (json) {
    var g = JSON.parse(json);
    g.civs.forEach(function (c) { c.visible = null; if (c.explored && c.explored.rle !== undefined) c.explored = rleDecode(c.explored.rle, g.W * g.H); });
    G.refreshVisibility(g, G.player(g));
    return g;
  };
})(globalThis.AU = globalThis.AU || {});
