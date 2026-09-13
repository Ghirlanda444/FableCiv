// Computer opponents and independent (barbarian) peoples.
(function (AU) {
  var G = AU.G, U = AU.U, Hex = AU.Hex;
  var AI = AU.AI = {};

  AI.takeTurn = function (g, civ) {
    try {
      AI.diplomacy(g, civ);
      AI.chooseResearch(g, civ);
      AI.chooseGovernment(g, civ);
      AI.choosePolicies(g, civ);
      AI.manageSettlements(g, civ);
      AI.moveUnits(g, civ);
    } catch (e) { G.log(g, 'AI error for ' + civ.civId + ': ' + (e && e.message)); if (typeof console !== 'undefined') console.error(e); }
  };

  // ---------- Diplomacy ----------
  AI.diplomacy = function (g, civ) {
    var tr = civ.ai;
    g.civs.forEach(function (o) {
      if (o === civ || !o.alive || !civ.met[o.idx]) return;
      var rel = civ.rel[o.idx];
      if (rel.war) {
        if (G.aiAcceptsPeace(g, civ, o.idx) && G.rng(g) < 0.12) {
          if (o.isPlayer) { civ.peaceOffer = g.turn; G.notify(g, o, { kind: 'peace_offer', text: G.leaderName(civ) + ' of ' + G.civData(civ).name + ' proposes peace.', panel: 'diplomacy' }); }
          else if (G.aiAcceptsPeace(g, o, civ.idx)) G.makePeace(g, civ.idx, o.idx);
        }
        return;
      }
      // attitude drift
      if (rel.attitude < 0) rel.attitude += 0.5; else if (rel.attitude > 0) rel.attitude -= 0.2;
      var drift = G.civFx(g, o).attitudeDrift || 0; if (drift && rel.attitude < 30) rel.attitude += drift * 0.3;
      var myS = G.militaryStrength(g, civ.idx), theirS = G.militaryStrength(g, o.idx);
      var nearby = AI.borderTension(g, civ, o);
      if (nearby) rel.attitude -= 0.4;
      if (g.turn < 25 || rel.peaceUntil > g.turn) return;
      var p = tr.aggression * tr.aggression * 0.03 + (nearby ? 0.01 : 0) + (rel.attitude < -15 ? 0.02 : 0);
      if (myS > theirS * (1.6 - tr.aggression * 0.5) && G.rng(g) < p) G.declareWar(g, civ.idx, o.idx);
    });
  };
  AI.borderTension = function (g, a, b) {
    var as = G.civSettlements(g, a.idx), bs = G.civSettlements(g, b.idx);
    for (var i = 0; i < as.length; i++) for (var j = 0; j < bs.length; j++) if (G.dist(g.tiles[as[i].tile], g.tiles[bs[j].tile]) <= 6) return true;
    return false;
  };
  AI.respondToPeaceProposal = function (g, civ, fromIdx) { return G.aiAcceptsPeace(g, civ, fromIdx); };

  // ---------- Research ----------
  AI.chooseResearch = function (g, civ) {
    var tr = civ.ai;
    if (!civ.currentTech) {
      var av = G.availableTechs(civ);
      if (av.length) {
        av.forEach(function (t) {
          var sc = -t.cost / 10;
          for (var u in AU.UNITS) if (AU.UNITS[u].tech === t.id) sc += 30 * tr.aggression;
          for (var b in AU.BUILDINGS) if (AU.BUILDINGS[b].tech === t.id) sc += 20 * (tr.science + tr.culture) / 2 + 10;
          if (t.fx) sc += 12;
          if (civ.boosts && civ.boosts[t.id]) sc += 25;
          for (var r in AU.RESOURCES) if (AU.RESOURCES[r].revealTech === t.id) sc += 15;
          if (t.id === 'sailing' || t.id === 'pottery' || t.id === 'writing' || t.id === 'currency') sc += 15;
          t._sc = sc + G.rng(g) * 10;
        });
        av.sort(function (a, b) { return b._sc - a._sc; });
        civ.currentTech = av[0].id;
      }
    }
    if (!civ.currentCivic) {
      var ac = G.availableCivics(civ);
      if (ac.length) { ac.sort(function (a, b) { return (a.cost - (civ.boosts && civ.boosts['c:' + a.id] ? a.cost * 0.4 : 0)) - (b.cost - (civ.boosts && civ.boosts['c:' + b.id] ? b.cost * 0.4 : 0)) + (G.rng(g) - 0.5) * 30; }); civ.currentCivic = ac[0].id; }
    }
  };
  AI.choosePolicies = function (g, civ) {
    var tr = civ.ai, avail = G.availablePolicies(civ), free = G.freeSlots(civ);
    var total = 0; for (var k in free) total += free[k];
    if (!avail.length || (total === 0 && g.turn % 25 !== 0)) return;
    function score(id) {
      var pc = AU.POLICIES[id], sc = 1;
      if (pc.type === 'military') sc += tr.aggression * 3 + (AI.threatened(g, civ) ? 2 : 0);
      if (pc.type === 'economic') sc += 2 + tr.expansion;
      if (pc.type === 'diplomatic') sc += 1 + tr.culture;
      if (pc.type === 'wildcard') sc += tr.science + tr.culture;
      if (pc.fx.yieldMult) for (var y in pc.fx.yieldMult) sc += (pc.fx.yieldMult[y] - 1) * 10 * (y === 'science' ? tr.science + 0.5 : y === 'culture' ? tr.culture + 0.5 : 1);
      if (pc.fx.happinessBonus) sc += pc.fx.happinessBonus * 1.5;
      if (pc.fx.wonderCostMult) sc += tr.culture * 2;
      return sc + G.rng(g) * 0.5;
    }
    var ranked = avail.slice().sort(function (a, b) { return score(b) - score(a); });
    G.setPolicies(g, civ, ranked);
  };
  AI.chooseGovernment = function (g, civ) {
    var tr = civ.ai, avail = G.availableGovernments(civ);
    var pref = tr.aggression > 0.65 ? ['fascism', 'oligarchy', 'autocracy', 'monarchy'] : tr.science > 0.65 ? ['democracy', 'merchant_republic', 'classical_republic', 'autocracy'] : ['communism', 'monarchy', 'theocracy', 'classical_republic', 'oligarchy'];
    for (var i = 0; i < pref.length; i++) if (avail.indexOf(pref[i]) >= 0) { if (civ.government !== pref[i]) G.setGovernment(g, civ, pref[i]); return; }
    if (avail.indexOf('autocracy') >= 0 && civ.government === 'chiefdom') G.setGovernment(g, civ, 'autocracy');
  };

  // ---------- Settlements ----------
  AI.wantsSettler = function (g, civ) {
    var tr = civ.ai, sets = G.civSettlements(g, civ.idx);
    var target = 4 + Math.round(tr.expansion * 7) + Math.floor(g.turn / 60);
    if (sets.length >= target) return false;
    var settlers = G.civUnits(g, civ.idx).filter(function (u) { return u.type === 'settler'; }).length;
    var queued = 0; sets.forEach(function (s) { s.queue.forEach(function (q) { if (q.id === 'settler') queued++; }); });
    return settlers + queued < 1 && !!AI.findSite(g, civ, null);
  };
  AI.wantsMilitary = function (g, civ) {
    var sets = G.civSettlements(g, civ.idx), tr = civ.ai;
    var mil = G.civUnits(g, civ.idx).filter(G.isMilitary).length;
    var atWar = g.civs.some(function (o) { return o.alive && o.idx !== civ.idx && civ.rel[o.idx].war; });
    var want = sets.length * (1 + tr.aggression) + (atWar ? sets.length * 1.5 + 2 : 0) + g.turn / 50;
    return mil < want;
  };
  AI.bestUnitToBuild = function (g, s, wantRanged) {
    var civ = g.civs[s.civ], opts = G.buildOptions(g, s).units.filter(function (u) { var d = AU.UNITS[u]; return d.cls !== 'civilian' && d.cls !== 'recon' && d.cls !== 'naval' && d.cls !== 'navalRanged'; });
    if (!opts.length) return null;
    opts.sort(function (a, b) { var da = G.unitType(g, civ, a), db = G.unitType(g, civ, b); return Math.max(db.strength, db.ranged || 0) - Math.max(da.strength, da.ranged || 0); });
    if (wantRanged) { var r = opts.filter(function (u) { return U.isRanged({ type: u }); }); if (r.length) return r[0]; }
    var m = opts.filter(function (u) { return !U.isRanged({ type: u }); });
    return m.length ? m[0] : opts[0];
  };
  AI.buildingScore = function (g, civ, s, id) {
    var d = G.buildingDef(g, civ, id), tr = civ.ai, y = d.yields || {};
    var sc = (y.food || 0) * 1.4 + (y.production || 0) * 1.5 + (y.gold || 0) * 0.8 + (y.science || 0) * (1 + tr.science) + (y.culture || 0) * (0.8 + tr.culture) + (y.happiness || 0) * 1.5;
    if (d.defense) sc += 2 + tr.aggression * 2 + (AI.threatened(g, civ) ? 4 : 0);
    if (d.perPop) sc += s.pop * 0.3;
    if (d.pct) sc += 3;
    if (!s.isCity) sc -= (y.production || 0) * 0.5; // production is just gold in towns
    return sc / Math.max(40, d.cost) * 100;
  };
  AI.threatened = function (g, civ) { return g.civs.some(function (o) { return o.alive && o.idx !== civ.idx && civ.rel[o.idx].war; }); };
  AI.manageSettlements = function (g, civ) {
    var sets = G.civSettlements(g, civ.idx), tr = civ.ai;
    var reserve = 30 + sets.length * 10;
    sets.forEach(function (s) {
      if (s.pendingGrowth > 0) G.autoExpand(g, s);
      var opts = G.buildOptions(g, s);
      if (s.isCity) {
        if (!s.queue.length) {
          var pick = null;
          if (opts.projects.length) pick = { kind: 'project', id: opts.projects[0] };
          else if (s.isCapital && AI.wantsSettler(g, civ) && s.pop >= 2) pick = { kind: 'unit', id: 'settler' };
          else if (AI.wantsMilitary(g, civ)) { var wantRanged = G.civUnits(g, civ.idx).filter(function (u) { return U.isRanged(u); }).length < G.civUnits(g, civ.idx).filter(G.isMilitary).length / 3; var bu = AI.bestUnitToBuild(g, s, wantRanged); if (bu) pick = { kind: 'unit', id: bu }; }
          if (!pick && !s.isCapital && AI.wantsSettler(g, civ) && s.pop >= 3) pick = { kind: 'unit', id: 'settler' };
          if (!pick && opts.national.length && s.pop >= 4 && G.rng(g) < 0.5) pick = { kind: 'national', id: opts.national[0] };
          if (!pick && opts.wonders.length && G.rng(g) < 0.25 + tr.culture * 0.3 && s.pop >= 4) { var w = opts.wonders.slice().sort(function (a, b) { return AU.WONDERS[a].cost - AU.WONDERS[b].cost; })[0]; pick = { kind: 'wonder', id: w }; }
          if (!pick && opts.buildings.length) { var bs = opts.buildings.slice().sort(function (a, b) { return AI.buildingScore(g, civ, s, b) - AI.buildingScore(g, civ, s, a); }); pick = { kind: 'building', id: bs[0] }; }
          if (!pick) { var bu2 = AI.bestUnitToBuild(g, s, false); if (bu2 && G.civUnits(g, civ.idx).length < sets.length * 4) pick = { kind: 'unit', id: bu2 }; }
          if (pick) G.enqueue(g, s, pick.kind, pick.id);
        }
        if (civ.gold > 350 + reserve && opts.buildings.length) {
          var bsC = opts.buildings.slice().sort(function (a, b) { return AI.buildingScore(g, civ, s, b) - AI.buildingScore(g, civ, s, a); });
          var costC = G.purchaseCost(g, civ, 'building', bsC[0], s);
          if (civ.gold >= costC + reserve && !G.inQueue(s, 'building', bsC[0])) G.purchase(g, s, 'building', bsC[0]);
        }
        if (civ.gold > 300 + reserve && AI.wantsMilitary(g, civ)) { var buC = AI.bestUnitToBuild(g, s, false); if (buC) { var cC = G.purchaseCost(g, civ, 'unit', buC, s); if (civ.gold >= cC + reserve) G.purchase(g, s, 'unit', buC); } }
      } else {
        // Towns: specialize, buy buildings, upgrade to city
        var citiesNow = sets.filter(function (x) { return x.isCity; }).length, upCostNow = G.cityUpgradeCost(g, civ);
        var wantsCity = s.pop >= 4 && citiesNow < Math.ceil(sets.length / 2) && (s === sets.filter(function (x) { return !x.isCity; }).sort(function (a, b) { return b.pop - a.pop; })[0]);
        if (wantsCity && civ.gold >= upCostNow + reserve) { G.upgradeToCity(g, s); return; }
        if (!s.specialization && s.pop >= 5 && !(wantsCity && civ.gold > upCostNow * 0.5)) {
          var farms = 0, mines = 0, res = 0;
          s.tiles.forEach(function (i) { var t = g.tiles[i]; if (!t.worked) return; var imp = G.improvementFor(g, t, civ); if (imp === 'farm' || imp === 'pasture' || imp === 'fishing') farms++; if (imp === 'mine' || imp === 'quarry' || imp === 'woodcutter') mines++; if (t.resource) res++; });
          var spec = farms >= mines && farms >= res ? 'farming' : mines >= res ? 'mining' : 'trade';
          if (AI.threatened(g, civ) && G.rng(g) < 0.3) spec = 'fort';
          if (G.nearestCity(g, s) || spec !== 'farming') G.specialize(g, s, spec);
        }
        if (opts.buildings.length) {
          var bs2 = opts.buildings.slice().sort(function (a, b) { return AI.buildingScore(g, civ, s, b) - AI.buildingScore(g, civ, s, a); });
          var cost = G.purchaseCost(g, civ, 'building', bs2[0], s);
          if (civ.gold >= cost + reserve) G.purchase(g, s, 'building', bs2[0]);
        }
        if (AI.wantsMilitary(g, civ) && AI.threatened(g, civ)) { var bu3 = AI.bestUnitToBuild(g, s, false); if (bu3) { var c3 = G.purchaseCost(g, civ, 'unit', bu3, s); if (civ.gold >= c3 + reserve) G.purchase(g, s, 'unit', bu3); } }
      }
    });
    // unit upgrades with spare gold
    if (civ.gold > 250) G.civUnits(g, civ.idx).forEach(function (u) { if (civ.gold > 200 && U.canUpgrade(g, u)) U.upgrade(g, u); });
  };

  // ---------- Settling ----------
  AI.siteScore = function (g, civ, t) {
    var sc = 0, area = Hex.spiral(t.col, t.row, 2, g.W, g.H), water = 0;
    area.forEach(function (i) {
      var a = g.tiles[i]; if (a.owner >= 0) { sc -= 1.5; return; }
      var y = AU.baseTileYields(a, civ); sc += y.food * 1.3 + y.production * 1.1 + y.gold * 0.5;
      if (a.resource) sc += 1.5; if (a.river) sc += 0.5; if (G.isWater(a)) water++;
    });
    if (water > 9) sc -= (water - 9) * 1.5; else if (water > 0) sc += 2;
    if (t.hills) sc += 2; if (t.river) sc += 2;
    if (t.terrain === 'tundra' || t.terrain === 'desert') sc -= 5;
    return sc;
  };
  AI.findSite = function (g, civ, settler) {
    var sets = G.civSettlements(g, civ.idx);
    var origin = settler ? g.tiles[settler.tile] : (sets.length ? g.tiles[sets[0].tile] : null);
    if (!origin) return null;
    var best = null, bv = -1e9;
    var area = Hex.spiral(origin.col, origin.row, 9, g.W, g.H);
    area.forEach(function (i) {
      var t = g.tiles[i];
      if (!G.canFoundAt(g, civ.idx, i)) return;
      if (t.continent !== origin.continent && settler && !civ.techs.sailing) return;
      var d = G.dist(origin, t);
      var near = 1e9; sets.forEach(function (s) { near = Math.min(near, G.dist(g.tiles[s.tile], t)); });
      if (sets.length && near > 8) return;
      var sc = AI.siteScore(g, civ, t) - d * 0.8 - (near < 5 ? (5 - near) * 2 : 0);
      if (G.unitsAt(g, i).some(function (u) { return u.civ < 0; })) sc -= 20;
      if (sc > bv) { bv = sc; best = i; }
    });
    return best;
  };

  // ---------- Units ----------
  AI.enemyList = function (g, civ) {
    if (civ._enemies && civ._enemiesTurn === g.turn) return civ._enemies;
    var units = [], sets = [];
    for (var id in g.units) { var u = g.units[id]; if (u.civ !== civ.idx && G.atWar(g, civ.idx, u.civ)) units.push(u); }
    for (var sid in g.settlements) { var s = g.settlements[sid]; if (G.atWar(g, civ.idx, s.civ)) sets.push(s); }
    civ._enemies = { units: units, sets: sets }; civ._enemiesTurn = g.turn;
    return civ._enemies;
  };
  AI.enemiesNear = function (g, civ, t, radius) {
    var out = [], e = AI.enemyList(g, civ);
    for (var i = 0; i < e.units.length; i++) { var u = e.units[i]; if (!g.units[u.id]) continue; var d = G.dist(t, g.tiles[u.tile]); if (d <= radius) out.push({ tile: u.tile, d: d, unit: u }); }
    for (var j = 0; j < e.sets.length; j++) { var s = e.sets[j]; if (!G.atWar(g, civ.idx, s.civ)) continue; var d2 = G.dist(t, g.tiles[s.tile]); if (d2 <= radius) out.push({ tile: s.tile, d: d2, settlement: s }); }
    return out;
  };
  AI.warTarget = function (g, civ) {
    if (civ._warTarget && civ._warTargetTurn === g.turn) return civ._warTarget;
    var enemies = g.civs.filter(function (o) { return o.alive && o.idx !== civ.idx && civ.rel[o.idx].war; });
    var best = null, bd = 1e9, cap = civ.capital ? g.tiles[g.settlements[civ.capital].tile] : null;
    enemies.forEach(function (o) { G.civSettlements(g, o.idx).forEach(function (s) { var d = cap ? G.dist(cap, g.tiles[s.tile]) : 0; d -= (s.hp < 50 ? 5 : 0); if (d < bd) { bd = d; best = s; } }); });
    civ._warTarget = best; civ._warTargetTurn = g.turn;
    return best;
  };
  // Promote whenever a level is available: prefer offensive picks for aggressive leaders, defensive otherwise.
  AI.autoPromote = function (g, u) {
    var U = AU.U; if (!U.promosAvailable(u)) return;
    var ch = U.promoChoices(g, u); if (!ch.length) return;
    var civ = u.civ >= 0 ? g.civs[u.civ] : null, aggr = civ ? (G.leaderData(civ).ai || {}).aggression || 0.5 : 0.7;
    ch.sort(function (x, y) { var sx = (x.mods.attack || 0) + (x.mods.vsSettlements || 0) + (x.mods.moves || 0) * 5, sy = (y.mods.attack || 0) + (y.mods.vsSettlements || 0) + (y.mods.moves || 0) * 5; return (sy - sx) * (aggr - 0.5) + (G.rng(g) - 0.5) * 6; });
    if (u.hp < 60 || G.rng(g) < 0.7) U.promote(g, u, ch[0].id);
  };
  AI.moveUnits = function (g, civ) {
    var units = G.civUnits(g, civ.idx);
    units.forEach(function (u) { AI.autoPromote(g, u); });
    var sets = G.civSettlements(g, civ.idx);
    var garrisoned = {};
    units.forEach(function (u) { var s = G.settlementAt(g, u.tile); if (s && G.isMilitary(u) && s.civ === civ.idx) garrisoned[s.id] = (garrisoned[s.id] || 0) + 1; });
    units.forEach(function (u) {
      if (!g.units[u.id]) return;
      if (u.type === 'settler') return AI.moveSettler(g, civ, u);
      if (!G.isMilitary(u)) return;
      if (AU.UNITS[u.type].cls === 'recon' && g.turn < 80) return AI.explore(g, civ, u);
      if (U.isNaval(u)) return AI.moveNaval(g, civ, u);
      AI.moveMilitary(g, civ, u, garrisoned, sets);
    });
  };
  AI.moveSettler = function (g, civ, u) {
    var t = g.tiles[u.tile];
    var danger = AI.enemiesNear(g, civ, t, 2).filter(function (e) { return e.unit; });
    if (danger.length) { var home = AI.nearestOwnSettlement(g, civ, t); if (home && home.tile !== u.tile) { U.orderMove(g, u, home.tile); return; } }
    if (!civ.capital) { if (G.canFoundAt(g, civ.idx, u.tile)) { U.foundCity(g, u); return; } }
    var site = u.aiTarget != null && G.canFoundAt(g, civ.idx, u.aiTarget) ? u.aiTarget : AI.findSite(g, civ, u);
    if (site == null) { if (G.canFoundAt(g, civ.idx, u.tile)) U.foundCity(g, u); return; }
    u.aiTarget = site;
    if (site === u.tile) { U.foundCity(g, u); return; }
    if (!U.orderMove(g, u, site)) { u.aiTarget = null; if (G.canFoundAt(g, civ.idx, u.tile)) U.foundCity(g, u); }
    else if (u.tile === site && g.units[u.id]) U.foundCity(g, u);
  };
  AI.nearestOwnSettlement = function (g, civ, t) {
    var best = null, bd = 1e9;
    G.civSettlements(g, civ.idx).forEach(function (s) { var d = G.dist(t, g.tiles[s.tile]); if (d < bd) { bd = d; best = s; } });
    return best;
  };
  AI.explore = function (g, civ, u) {
    var t = g.tiles[u.tile];
    // move to the nearest unexplored passable tile
    var res = U.dijkstra(g, u, 12), best = null, bv = -1e9;
    for (var idx in res.dist) {
      var i = +idx, tt = g.tiles[i];
      if (U.tileBlocked(g, u, i, true)) continue;
      var unexplored = 0; G.neighbors(g, tt).forEach(function (n) { if (!civ.explored[n]) unexplored++; });
      var v = unexplored * 3 - res.dist[i] + (tt.hills ? 1 : 0);
      if (v > bv) { bv = v; best = i; }
    }
    if (best != null && bv > 0) U.orderMove(g, u, best);
    else { var e = AI.enemiesNear(g, civ, t, 1); if (e.length && U.canAttackTile(g, u, e[0].tile)) U.attack(g, u, e[0].tile); else U.fortify(g, u); }
  };
  AI.tryAttack = function (g, civ, u) {
    var def = U.def(g, u), t = g.tiles[u.tile], range = U.isRanged(u) ? (def.range || 1) : 1;
    var targets = AI.enemiesNear(g, civ, t, range).filter(function (e) { return U.canAttackTile(g, u, e.tile); });
    if (!targets.length) return false;
    targets.sort(function (a, b) {
      function val(e) { if (e.settlement) return (e.settlement.hp <= 0 && U.canCapture(u) && !U.isRanged(u)) ? 1000 : (U.isRanged(u) ? 50 : (e.settlement.hp < 60 ? 40 : 5)); var v = e.unit; return 100 - v.hp + (G.isMilitary(v) ? 0 : 30); }
      return val(b) - val(a);
    });
    var tgt = targets[0];
    if (!U.isRanged(u) && tgt.unit) {
      // avoid suicidal melee attacks
      var my = U.strength(g, u, { attacking: true, vs: tgt.unit }), their = U.strength(g, tgt.unit, { attacking: false, vs: u });
      if (their - my > 12 && u.hp < 60) return false;
    }
    U.attack(g, u, tgt.tile);
    return true;
  };
  AI.moveMilitary = function (g, civ, u, garrisoned, sets) {
    var t = g.tiles[u.tile];
    if (AI.tryAttack(g, civ, u)) return;
    var near = AI.enemiesNear(g, civ, t, 4);
    if (u.hp < 45) {
      var home = AI.nearestOwnSettlement(g, civ, t);
      if (near.length && home && home.tile !== u.tile) { U.orderMove(g, u, home.tile); return; }
      U.fortify(g, u); return;
    }
    // threats near home: intercept
    if (near.length) {
      near.sort(function (a, b) { return a.d - b.d; });
      var e = near[0];
      var dest = AI.approachTile(g, u, e.tile);
      if (dest != null && U.orderMove(g, u, dest)) { if (g.units[u.id] && u.moves > 0) AI.tryAttack(g, civ, u); return; }
    }
    // war: march on target
    var target = AI.warTarget(g, civ);
    if (target) {
      var d = G.dist(t, g.tiles[target.tile]);
      if (d > 1) { var ap = AI.approachTile(g, u, target.tile); if (ap != null && U.orderMove(g, u, ap)) { if (g.units[u.id] && u.moves > 0) AI.tryAttack(g, civ, u); return; } }
    }
    // barbarian camps nearby (clear them)
    var camp = null, cd = 1e9;
    g.camps.forEach(function (c) { var dd = G.dist(t, g.tiles[c.tile]); if (dd < cd && dd <= 6) { cd = dd; camp = c; } });
    if (camp && u.hp > 60 && G.rng(g) < 0.7) { if (U.orderMove(g, u, camp.tile)) return; }
    // garrison duty
    var s = G.settlementAt(g, u.tile);
    if (s && s.civ === civ.idx && garrisoned[s.id] <= 1) { U.fortify(g, u); return; }
    var ung = sets.filter(function (x) { return !garrisoned[x.id]; });
    if (ung.length) { ung.sort(function (a, b) { return G.dist(t, g.tiles[a.tile]) - G.dist(t, g.tiles[b.tile]); }); garrisoned[ung[0].id] = 1; if (U.orderMove(g, u, ung[0].tile)) return; }
    U.fortify(g, u);
  };
  AI.approachTile = function (g, u, targetTile) {
    // nearest enterable tile adjacent to target (or the target for ranged standoff)
    var tt = g.tiles[targetTile], best = null, bd = 1e9, res = U.dijkstra(g, u);
    var ring = U.isRanged(u) ? Hex.ring(tt.col, tt.row, U.def(g, u).range || 1, g.W, g.H).concat(Hex.ring(tt.col, tt.row, 1, g.W, g.H)) : Hex.ring(tt.col, tt.row, 1, g.W, g.H);
    ring.forEach(function (i) { if (res.dist[i] === undefined || U.tileBlocked(g, u, i, true)) return; if (res.dist[i] < bd) { bd = res.dist[i]; best = i; } });
    if (best == null) {
      // move as close as possible
      for (var idx in res.dist) { var i2 = +idx; if (U.tileBlocked(g, u, i2, true)) continue; var d = G.dist(g.tiles[i2], tt) * 3 + res.dist[i2] * 0.5; if (d < bd) { bd = d; best = i2; } }
    }
    return best;
  };
  AI.moveNaval = function (g, civ, u) {
    if (AI.tryAttack(g, civ, u)) return;
    var t = g.tiles[u.tile];
    var near = AI.enemiesNear(g, civ, t, 5).filter(function (e) { return G.isWater(g.tiles[e.tile]) || e.settlement; });
    if (near.length) { near.sort(function (a, b) { return a.d - b.d; }); var ap = AI.approachTile(g, u, near[0].tile); if (ap != null && U.orderMove(g, u, ap)) { AI.tryAttack(g, civ, u); return; } }
    // patrol: random reachable water tile
    var reach = Object.keys(U.reachableNow(g, u)); if (reach.length && G.rng(g) < 0.5) U.orderMove(g, u, +reach[G.rngInt(g, reach.length)]);
    else U.fortify(g, u);
  };

  // ---------- Independent peoples (barbarians) ----------
  AI.barbarianTurn = function (g) {
    for (var bid in g.units) if (g.units[bid].civ < 0) AI.autoPromote(g, g.units[bid]);
    var avgEra = 0, n = 0; g.civs.forEach(function (c) { if (c.alive) { avgEra += c.era; n++; } }); avgEra = n ? Math.round(avgEra / n) : 0;
    g.camps.forEach(function (c) {
      c.counter--;
      if (c.counter > 0) return;
      c.counter = 7 + G.rngInt(g, 6);
      var here = G.unitsAt(g, c.tile).filter(function (u) { return u.civ < 0; });
      var roster = AU.BARBARIAN_UNITS[Math.min(avgEra, AU.BARBARIAN_UNITS.length - 1)];
      var type = roster[G.rngInt(g, roster.length)];
      var all = 0; for (var id in g.units) if (g.units[id].civ < 0) all++;
      if (all > g.camps.length * 3 + 4) return;
      var t = g.tiles[c.tile];
      var spot = here.length ? G.neighbors(g, t).filter(function (i) { return G.passable(g, g.tiles[i]) && !G.unitsAt(g, i).length; })[0] : c.tile;
      if (spot != null) G.spawnUnit(g, -1, type, spot);
    });
    for (var uid in g.units) {
      var u = g.units[uid]; if (u.civ >= 0) continue;
      var t = g.tiles[u.tile];
      // attack anything adjacent / in range
      var def = AU.UNITS[u.type], range = U.isRanged(u) ? def.range : 1, best = null, bd = 1e9;
      Hex.spiral(t.col, t.row, 6, g.W, g.H).forEach(function (i) {
        var d = G.dist(t, g.tiles[i]);
        var s = G.settlementAt(g, i); var us = G.unitsAt(g, i).filter(function (o) { return o.civ >= 0; });
        if (!s && !us.length) return;
        var v = d + (s ? 2 : 0) - (us.some(function (o) { return !G.isMilitary(o); }) ? 2 : 0);
        if (v < bd) { bd = v; best = i; }
      });
      if (best != null) {
        var d0 = G.dist(t, g.tiles[best]);
        if (d0 <= range && U.canAttackTile(g, u, best)) { U.attack(g, u, best); continue; }
        var camp = g.camps.filter(function (c) { return c.tile === u.tile; })[0];
        if (camp && G.unitsAt(g, u.tile).length === 1 && G.rng(g) < 0.6) { U.fortify(g, u); continue; }
        var ap = AI.approachTile(g, u, best);
        if (ap != null && U.orderMove(g, u, ap)) { if (g.units[u.id] && u.moves > 0 && U.canAttackTile(g, u, best)) U.attack(g, u, best); continue; }
      }
      if (G.rng(g) < 0.5) { var reach = Object.keys(U.reachableNow(g, u)); if (reach.length) U.orderMove(g, u, +reach[G.rngInt(g, reach.length)]); }
      else U.fortify(g, u);
    }
  };
})(globalThis.AU = globalThis.AU || {});
