// Religion: Faith, pantheons, founding and enhancing a religion, pressure-based spread, religious units, religious victory.
(function (AU) {
  var G = AU.G;
  var R = AU.Religion = {};

  R.PANTHEON_COST = 25;
  R.foundCost = function (g) { return Math.round(180 * G.speed(g)); };
  R.enhanceCost = function (g) { return Math.round(420 * G.speed(g)); };
  R.maxReligions = function (g) { return Math.max(2, Math.min(8, Math.ceil(g.civs.filter(function (c) { return !c.minor; }).length / 2))); };
  R.religionsFounded = function (g) { return Object.keys(g.religions || {}).length; };
  R.rel = function (g, id) { return id && g.religions ? g.religions[id] : null; };
  R.icon = function (g, id) { var r = R.rel(g, id); return r ? r.icon : '🕊️'; };
  R.name = function (g, id) { var r = R.rel(g, id); return r ? r.name : 'no religion'; };

  // ---------- civ-level effects ----------
  // Pantheon + (founder & enhancer beliefs, for the founder) merged into G.civFx.
  R.civFx = function (g, civ) {
    var list = [];
    if (civ.pantheon && AU.BELIEF_BY_ID[civ.pantheon]) list.push(AU.BELIEF_BY_ID[civ.pantheon].fx);
    var rel = R.rel(g, civ.religion);
    if (rel && rel.founder === civ.idx) { (rel.beliefs || []).forEach(function (bid) { var b = AU.BELIEF_BY_ID[bid]; if (b && b.type !== 'follower') list.push(b.fx); }); }
    return list;
  };
  R.fxKey = function (g, civ) { var rel = R.rel(g, civ.religion); return (civ.pantheon || '') + '|' + (civ.religion || '') + '|' + (rel ? rel.beliefs.length : 0); };
  // Follower belief effects for a settlement (from the religion it follows, whoever founded it).
  R.settlementFx = function (g, s) {
    var rel = R.rel(g, s.religion); if (!rel) return null;
    var fx = {};
    rel.beliefs.forEach(function (bid) { var b = AU.BELIEF_BY_ID[bid]; if (b && (b.type === 'follower' || b.type === 'enhancer')) G.mergeFx(fx, b.fx); });
    return fx;
  };
  R.followerCount = function (g, relId, civIdx) { var n = 0; for (var id in g.settlements) { var s = g.settlements[id]; if (s.religion === relId && (civIdx === undefined || s.civ === civIdx)) n++; } return n; };
  R.foreignFollowerCount = function (g, relId, founderIdx) { var n = 0; for (var id in g.settlements) { var s = g.settlements[id]; if (s.religion === relId && s.civ !== founderIdx) n++; } return n; };

  // ---------- pantheon / founding ----------
  R.canChoosePantheon = function (g, civ) { return !civ.pantheon && civ.alive && (civ.faith >= R.PANTHEON_COST || G.civFx(g, civ).freePantheon); };
  R.availablePantheons = function (g) { var taken = {}; g.civs.forEach(function (c) { if (c.pantheon) taken[c.pantheon] = 1; }); return AU.PANTHEONS.filter(function (p) { return !taken[p.id]; }); };
  R.choosePantheon = function (g, civ, id) {
    if (!R.canChoosePantheon(g, civ) || !AU.BELIEF_BY_ID[id] || R.availablePantheons(g).indexOf(AU.BELIEF_BY_ID[id]) < 0) return false;
    if (!G.civFx(g, civ).freePantheon || civ.faith >= R.PANTHEON_COST) civ.faith -= R.PANTHEON_COST; else civ.faith = Math.max(0, civ.faith);
    civ.pantheon = id; civ._fx = null; g.fxGen = (g.fxGen || 0) + 1;
    G.notify(g, civ, { kind: 'faith', text: 'Pantheon founded: ' + AU.BELIEF_BY_ID[id].name + '.', panel: 'religion' });
    G.log(g, G.civData(civ).name + ' founded the pantheon ' + AU.BELIEF_BY_ID[id].name + '.', civ.idx);
    return true;
  };
  // The Great Prophet of a civilization standing inside one of its settlements (religions are founded by prophets, not bought).
  R.prophetFor = function (g, civ) { var out = null; G.civUnits(g, civ.idx).forEach(function (u) { if (out) return; if (AU.UNITS[u.type].great === 'prophet') { var s = G.settlementAt(g, u.tile); if (s && s.civ === civ.idx) out = u; } }); return out; };
  R.canFound = function (g, civ) { return civ.alive && !civ.religion && !!civ.pantheon && !!R.prophetFor(g, civ) && R.religionsFounded(g) < R.maxReligions(g); };
  R.availableNames = function (g) { var taken = {}; for (var id in g.religions) taken[g.religions[id].nameId] = 1; return AU.RELIGION_NAMES.filter(function (n) { return !taken[n.id]; }); };
  R.availableBeliefs = function (g, type) {
    var taken = {}; for (var id in g.religions) g.religions[id].beliefs.forEach(function (b) { taken[b] = 1; });
    var list = type === 'follower' ? AU.FOLLOWER_BELIEFS : type === 'founder' ? AU.FOUNDER_BELIEFS : AU.ENHANCER_BELIEFS;
    return list.filter(function (b) { return !taken[b.id]; });
  };
  R.found = function (g, civ, nameId, followerId, founderId, customName) {
    if (!R.canFound(g, civ)) return false;
    var nm = AU.RELIGION_NAMES.filter(function (n) { return n.id === nameId; })[0]; if (!nm || R.availableNames(g).indexOf(nm) < 0) return false;
    var fb = AU.BELIEF_BY_ID[followerId], ob = AU.BELIEF_BY_ID[founderId];
    if (!fb || fb.type !== 'follower' || R.availableBeliefs(g, 'follower').indexOf(fb) < 0) return false;
    if (!ob || ob.type !== 'founder' || R.availableBeliefs(g, 'founder').indexOf(ob) < 0) return false;
    var prophet = R.prophetFor(g, civ), cap = G.settlementAt(g, prophet.tile);
    G.removeUnit(g, prophet);
    g.religions = g.religions || {};
    var rel = { id: nameId, nameId: nameId, name: customName || nm.name, icon: nm.icon, founder: civ.idx, holyCity: cap.id, beliefs: [followerId, founderId], enhanced: false, turn: g.turn, prophet: prophet.name };
    g.religions[nameId] = rel; civ.religion = nameId; civ._fx = null; g.fxGen = (g.fxGen || 0) + 1;
    cap.religion = nameId; cap.pressure = cap.pressure || {}; cap.pressure[nameId] = Math.max(cap.pressure[nameId] || 0, 200);
    G.notify(g, civ, { kind: 'faith', text: 'You founded ' + rel.name + ' in ' + cap.name + '!', panel: 'religion' });
    g.civs.forEach(function (o) { if (o.isPlayer && o.idx !== civ.idx && o.met[civ.idx]) G.notify(g, o, { kind: 'faith', text: G.civData(civ).name + ' founded ' + rel.name + '.', panel: 'religion' }); });
    G.log(g, G.civData(civ).name + ' founded ' + rel.name + ' in ' + cap.name + '.', civ.idx);
    if (civ.isPlayer) { G.quote(g, civ, 'religion', 'founded', rel.name + ' founded', 'A new religion'); }
    civ.flags['ev:religion'] = g.turn;
    return true;
  };
  R.canEnhance = function (g, civ) { var rel = R.rel(g, civ.religion); return !!rel && rel.founder === civ.idx && !rel.enhanced && civ.faith >= R.enhanceCost(g); };
  R.enhance = function (g, civ, enhancerId, followerId) {
    if (!R.canEnhance(g, civ)) return false;
    var rel = R.rel(g, civ.religion);
    var eb = AU.BELIEF_BY_ID[enhancerId]; if (!eb || eb.type !== 'enhancer' || R.availableBeliefs(g, 'enhancer').indexOf(eb) < 0) return false;
    var fb = AU.BELIEF_BY_ID[followerId]; if (!fb || fb.type !== 'follower' || R.availableBeliefs(g, 'follower').indexOf(fb) < 0) return false;
    civ.faith -= R.enhanceCost(g); rel.beliefs.push(enhancerId, followerId); rel.enhanced = true; civ._fx = null; g.fxGen = (g.fxGen || 0) + 1;
    G.notify(g, civ, { kind: 'faith', text: rel.name + ' enhanced: ' + eb.name + ' and ' + fb.name + '.', panel: 'religion' });
    G.log(g, G.civData(civ).name + ' enhanced ' + rel.name + '.', civ.idx);
    return true;
  };

  // ---------- spread ----------
  // Every settlement carries pressure per religion; the majority religion is the strongest one above a threshold.
  R.majority = function (s) {
    var best = null, bv = 0, p = s.pressure || {};
    for (var id in p) if (p[id] > bv) { bv = p[id]; best = id; }
    return best && bv >= 30 ? best : null;
  };
  R.addPressure = function (g, s, relId, amount) {
    s.pressure = s.pressure || {}; s.pressure[relId] = (s.pressure[relId] || 0) + amount;
    R.updateMajority(g, s);
  };
  R.updateMajority = function (g, s) {
    var before = s.religion || null, after = R.majority(s);
    if (before !== after) {
      s.religion = after;
      var civ = g.civs[s.civ];
      if (civ && civ.isPlayer) G.notify(g, civ, { kind: 'faith', text: s.name + (after ? ' now follows ' + R.name(g, after) + '.' : ' lost its religion.'), tile: s.tile, settlement: s.id });
      if (after) { var rel = R.rel(g, after); if (rel && g.civs[rel.founder] && g.civs[rel.founder].isPlayer && rel.founder !== s.civ) G.notify(g, g.civs[rel.founder], { kind: 'faith', text: rel.name + ' spread to ' + s.name + '.', tile: s.tile }); }
      if (civ) civ._fx = null;
      g.fxGen = (g.fxGen || 0) + 1;
    }
  };
  R.spreadTurn = function (g) {
    if (!g.religions) return;
    var sets = Object.keys(g.settlements).map(function (k) { return g.settlements[k]; });
    var sources = sets.filter(function (s) { return s.religion; });
    if (!sources.length) return;
    sources.forEach(function (src) {
      var rel = R.rel(g, src.religion); if (!rel) return;
      var founder = g.civs[rel.founder], pm = 1 + ((founder && G.civFx(g, founder).pressureMult) || 0);
      var range = Math.round(9 * pm), base = (src.id === rel.holyCity ? 1.5 : 0.7) * (1 + src.pop / 12) * pm;
      var st = g.tiles[src.tile];
      sets.forEach(function (dst) {
        if (dst === src) return;
        var d = G.dist(st, g.tiles[dst.tile]); if (d > range) return;
        dst.pressure = dst.pressure || {}; dst.pressure[src.religion] = (dst.pressure[src.religion] || 0) + base;
      });
    });
    // own settlements resist slowly: pressure decays a little so a single missionary does not lock a city forever
    sets.forEach(function (s) {
      if (!s.pressure) return;
      for (var id in s.pressure) { if (id !== s.religion) s.pressure[id] = Math.max(0, s.pressure[id] - 0.2); }
      R.updateMajority(g, s);
    });
  };

  // ---------- religious units ----------
  R.unitDef = function (id) { return AU.UNITS[id] && AU.UNITS[id].religious ? AU.UNITS[id] : null; };
  R.unitCost = function (g, civ, id) { var d = R.unitDef(id); return d ? Math.round(d.faithCost * G.speed(g) * (G.civFx(g, civ).religiousUnitCostMult || 1)) : 0; };
  R.canBuyUnit = function (g, s, id) {
    var d = R.unitDef(id), civ = g.civs[s.civ]; if (!d) return false;
    if (!civ.religion && (id === 'apostle' || id === 'inquisitor')) return false;
    if (!civ.pantheon && !civ.religion) return false;
    if (id === 'missionary' && !civ.religion) return false;
    if (id === 'missionary' && !G.hasBuilding(s, 'shrine') && !G.hasBuilding(s, 'temple')) return false;
    if ((id === 'apostle' || id === 'inquisitor') && !G.hasBuilding(s, 'temple')) return false;
    return civ.faith >= R.unitCost(g, civ, id);
  };
  R.buyUnit = function (g, s, id) {
    if (!R.canBuyUnit(g, s, id)) return null;
    var civ = g.civs[s.civ], d = R.unitDef(id), fx = G.civFx(g, civ);
    civ.faith -= R.unitCost(g, civ, id);
    var u = G.spawnUnit(g, civ.idx, id, s.tile, { charges: d.charges + (fx.missionaryCharges || 0), religion: civ.religion });
    return u;
  };
  R.spreadStrength = function (g, u) { return u.type === 'apostle' ? 150 : 100; };
  // Spread: the unit's religion gains pressure in the settlement it stands in.
  R.canSpread = function (g, u) { var d = R.unitDef(u.type); if (!d || u.charges <= 0 || u.moves <= 0 || u.type === 'inquisitor' || !u.religion) return false; var s = G.settlementAt(g, u.tile); if (!s) return false; if (s.civ !== u.civ && G.atWar(g, u.civ, s.civ)) return false; return true; };
  R.spread = function (g, u) {
    if (!R.canSpread(g, u)) return false;
    var s = G.settlementAt(g, u.tile), civ = G.player(g);
    R.addPressure(g, s, u.religion, R.spreadStrength(g, u));
    u.charges--; u.moves = 0;
    if (u.charges <= 0) G.removeUnit(g, u);
    var owner = g.civs[u.civ]; if (owner) owner.flags['ev:spread'] = g.turn;
    return true;
  };
  R.canInquisition = function (g, u) { if (u.type !== 'inquisitor' || u.charges <= 0 || u.moves <= 0) return false; var s = G.settlementAt(g, u.tile); return !!s && s.civ === u.civ && !!s.pressure && Object.keys(s.pressure).some(function (id) { return id !== u.religion && s.pressure[id] > 0; }); };
  R.inquisition = function (g, u) {
    if (!R.canInquisition(g, u)) return false;
    var s = G.settlementAt(g, u.tile);
    for (var id in s.pressure) if (id !== u.religion) s.pressure[id] = 0;
    if (u.religion) s.pressure[u.religion] = Math.max(s.pressure[u.religion] || 0, 60);
    R.updateMajority(g, s);
    u.charges--; u.moves = 0; if (u.charges <= 0) G.removeUnit(g, u);
    return true;
  };
  // Theological combat: apostles (and inquisitors, defensively) remove foreign religious units next to them.
  R.debateTargets = function (g, u) {
    if ((u.type !== 'apostle' && u.type !== 'inquisitor') || u.moves <= 0 || u.charges <= 0) return [];
    var t = g.tiles[u.tile], out = [];
    G.neighbors(g, t).forEach(function (n) { G.unitsAt(g, n).forEach(function (o) { if (o.civ !== u.civ && R.unitDef(o.type) && o.religion !== u.religion && (u.civ >= 0 && G.civFx(g, g.civs[u.civ]) !== null)) out.push(o); }); });
    return out;
  };
  R.debateStrength = function (g, u) { var civ = g.civs[u.civ], fx = civ ? G.civFx(g, civ) : {}; return (u.type === 'apostle' ? 110 : u.type === 'inquisitor' ? 100 : 60) + (fx.religiousStrength || 0) + u.charges * 5; };
  R.debate = function (g, u, target) {
    if (R.debateTargets(g, u).indexOf(target) < 0) return null;
    var a = R.debateStrength(g, u), d = R.debateStrength(g, target), roll = G.rng(g);
    var pA = a / (a + d), win = roll < pA;
    var loser = win ? target : u, winner = win ? u : target;
    G.removeUnit(g, loser); winner.moves = 0; if (win) u.charges = Math.max(1, u.charges); 
    var lc = g.civs[loser.civ], wc = g.civs[winner.civ];
    if (lc) G.notify(g, lc, { kind: 'faith', text: 'Your ' + loser.name + ' lost a theological debate near ' + AU.U.nearestName(g, loser.tile) + '.', tile: loser.tile });
    if (wc) G.notify(g, wc, { kind: 'faith', text: 'Your ' + winner.name + ' won a theological debate!', tile: winner.tile, unit: winner.id });
    return { win: win, chance: pA };
  };

  // ---------- per-turn & victory ----------
  R.turn = function (g, civ) {
    if (!civ.alive) return;
    var y = civ._turnFaith || 0, fx = G.civFx(g, civ);
    var rel = R.rel(g, civ.religion);
    if (rel && rel.founder === civ.idx) {
      var ff = R.foreignFollowerCount(g, rel.id, civ.idx), all = R.followerCount(g, rel.id);
      y += (fx.faithPerFollowerSettlement || 0) * all + (fx.faithPerForeignFollower || 0) * ff;
      civ.bonusCulture = (civ.bonusCulture || 0) + (fx.culturePerFollowerSettlement || 0) * all;
      civ.bonusScience = (civ.bonusScience || 0) + (fx.sciencePerFollowerSettlement || 0) * all;
      civ.gold += (fx.goldPerFollowerSettlement || 0) * all;
      civ.tourismTotal = (civ.tourismTotal || 0) + (fx.tourismPerForeignFollower || 0) * ff;
    }
    civ.faith = (civ.faith || 0) + y; civ.faithTotal = (civ.faithTotal || 0) + y;
    if (civ.isPlayer) {
      if (R.canChoosePantheon(g, civ) && !civ.flags['n:pantheon']) { civ.flags['n:pantheon'] = g.turn; G.notify(g, civ, { kind: 'faith', text: 'You have enough Faith to found a pantheon.', panel: 'religion' }); }
      if (R.canFound(g, civ) && !civ.flags['n:found']) { civ.flags['n:found'] = g.turn; G.notify(g, civ, { kind: 'faith', text: 'You can found a religion (' + R.foundCost(g) + ' Faith).', panel: 'religion' }); }
    }
  };
  R.checkVictory = function (g) {
    if (!g.religions) return null;
    for (var id in g.religions) {
      var rel = g.religions[id], founder = g.civs[rel.founder]; if (!founder || !founder.alive) continue;
      var ok = true;
      for (var i = 0; i < g.civs.length; i++) {
        var c = g.civs[i]; if (!c.alive || c.minor) continue;
        var sets = G.civSettlements(g, c.idx); if (!sets.length) continue;
        var fol = sets.filter(function (s) { return s.religion === id; }).length;
        if (fol * 2 < sets.length) { ok = false; break; }
      }
      if (ok && g.civs.filter(function (c) { return c.alive && !c.minor; }).length > 1) return { type: 'religion', civ: rel.founder, turn: g.turn };
    }
    return null;
  };
  R.victoryProgress = function (g, civ) {
    var rel = R.rel(g, civ.religion); if (!rel || rel.founder !== civ.idx) return null;
    var rows = [];
    g.civs.forEach(function (c) { if (!c.alive || c.minor) return; var sets = G.civSettlements(g, c.idx); if (!sets.length) return; var fol = sets.filter(function (s) { return s.religion === rel.id; }).length; rows.push({ civ: c, followers: fol, total: sets.length, ok: fol * 2 >= sets.length }); });
    return rows;
  };
})(globalThis.AU = globalThis.AU || {});
