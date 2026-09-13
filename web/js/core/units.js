// Unit movement, pathfinding and combat.
(function (AU) {
  var G = AU.G, Hex = AU.Hex;
  var U = AU.U = {};

  U.def = function (g, u) { return u.civ >= 0 ? G.unitType(g, g.civs[u.civ], u.type) : AU.UNITS[u.type]; };
  U.isNaval = function (u) { var c = AU.UNITS[u.type].cls; return c === 'naval' || c === 'navalRanged'; };
  U.isRanged = function (u) { var c = AU.UNITS[u.type].cls; return c === 'ranged' || c === 'siege' || c === 'navalRanged'; };
  U.isEmbarked = function (g, u) { return !U.isNaval(u) && G.isWater(g.tiles[u.tile]); };
  U.canCapture = function (u) { if (u.civ < 0) return false; var c = AU.UNITS[u.type].cls; return c === 'melee' || c === 'antcav' || c === 'cavalry' || c === 'recon'; };
  U.civ = function (g, u) { return u.civ >= 0 ? g.civs[u.civ] : null; };

  // Movement cost to enter tile `to` for unit u; Infinity if not allowed.
  U.enterCost = function (g, u, to, from) {
    var T = AU.TERRAIN[to.terrain];
    var civ = U.civ(g, u), fx = civ ? G.civFx(g, civ) : {};
    if (T.impassable && !fx.mountainsPassable) return Infinity;
    var naval = U.isNaval(u);
    if (naval) {
      if (!T.water) { var s = G.settlementAt(g, to.i); if (!s || s.civ !== u.civ) return Infinity; return 1; }
      if (to.terrain === 'ocean' && !(AU.UNITS[u.type].ocean || (civ && (civ.techs.cartography || fx.earlyOcean)))) return Infinity;
      return 1;
    }
    if (T.water) {
      if (!civ || !(civ.techs.sailing || fx.earlyEmbark)) return Infinity;
      if (to.terrain === 'ocean' && !(civ.techs.cartography || fx.earlyOcean)) return Infinity;
      return 1;
    }
    if (T.impassable) { if (fx.mountainsPassable && !naval) { var ownerM = G.tileOwnerCiv(g, to); if (ownerM >= 0 && ownerM !== u.civ && G.isMilitary(u) && !G.atWar(g, u.civ, ownerM)) return Infinity; return 3; } return Infinity; }
    var cost = 1;
    var fm = fx.forestMoveCost || (U.def(g, u).forestMove ? 1 : 0);
    if (to.hills) cost = fx.hillsMoveCost || 2;
    if (to.feature && AU.FEATURES[to.feature].move > cost) cost = fm && (to.feature === 'forest' || to.feature === 'jungle') ? Math.max(cost, fm) : AU.FEATURES[to.feature].move;
    if (to.hills && to.feature && (to.feature === 'forest' || to.feature === 'jungle') && !fm) cost = Math.max(cost, (fx.hillsMoveCost || 2) + 1);
    if (from && G.isWater(from) && !fx.freeDisembark) cost = 99; // disembarking ends the move
    // territory rules: military units may not enter foreign territory at peace
    var ownerCiv = G.tileOwnerCiv(g, to);
    if (ownerCiv >= 0 && ownerCiv !== u.civ && G.isMilitary(u) && AU.UNITS[u.type].cls !== 'recon' && !G.atWar(g, u.civ, ownerCiv)) return Infinity;
    return cost;
  };
  // Can the unit end its move / pass through this tile given other units?
  U.tileBlocked = function (g, u, tileIdx, asDestination) {
    var t = g.tiles[tileIdx];
    if (t.camp && u.civ >= 0) return false; // camps are captured by entering
    var us = G.unitsAt(g, tileIdx);
    for (var i = 0; i < us.length; i++) {
      var o = us[i];
      if (o.civ !== u.civ) return true;
      if (asDestination && G.isMilitary(o) === G.isMilitary(u) && o.id !== u.id) return true;
    }
    var s = G.settlementAt(g, tileIdx);
    if (s && s.civ !== u.civ) return true;
    return false;
  };
  // Dijkstra from the unit's tile. Returns {dist:{idx:cost}, prev:{idx:idx}}
  function Heap() { this.a = []; }
  Heap.prototype.push = function (d, v) { var a = this.a; a.push([d, v]); var i = a.length - 1; while (i > 0) { var p = (i - 1) >> 1; if (a[p][0] <= a[i][0]) break; var t = a[p]; a[p] = a[i]; a[i] = t; i = p; } };
  Heap.prototype.pop = function () { var a = this.a, top = a[0], last = a.pop(); if (a.length) { a[0] = last; var i = 0, n = a.length; for (;;) { var l = 2 * i + 1, r = l + 1, m = i; if (l < n && a[l][0] < a[m][0]) m = l; if (r < n && a[r][0] < a[m][0]) m = r; if (m === i) break; var t = a[m]; a[m] = a[i]; a[i] = t; i = m; } } return top; };
  U.dijkstra = function (g, u, maxCost) {
    var dist = {}, prev = {}, open = new Heap();
    open.push(0, u.tile); dist[u.tile] = 0;
    if (maxCost === undefined) maxCost = 40;
    while (open.a.length) {
      var cur = open.pop(), d = cur[0], idx = cur[1];
      if (d > dist[idx]) continue;
      if (d >= maxCost) continue;
      var t = g.tiles[idx], nb = G.neighbors(g, t);
      for (var k = 0; k < nb.length; k++) {
        var n = nb[k], nt = g.tiles[n];
        var c = U.enterCost(g, u, nt, t);
        if (c === Infinity) continue;
        if (U.tileBlocked(g, u, n, false)) continue;
        var nd = d + c;
        if (dist[n] === undefined || nd < dist[n]) { dist[n] = nd; prev[n] = idx; open.push(nd, n); }
      }
    }
    return { dist: dist, prev: prev };
  };
  U.findPath = function (g, u, target) {
    if (target === u.tile) return [];
    var res = U.dijkstra(g, u);
    if (res.dist[target] === undefined) return null;
    var path = [], cur = target;
    while (cur !== u.tile) { path.push(cur); cur = res.prev[cur]; }
    return path.reverse();
  };
  // Tiles reachable this turn (moves > 0 rule: can always enter a tile if any movement left)
  U.reachableNow = function (g, u) {
    var out = {}, res = U.dijkstra(g, u, u.moves);
    for (var idx in res.dist) {
      var i = +idx; if (i === u.tile) continue;
      var p = res.prev[i];
      if (res.dist[p] < u.moves && !U.tileBlocked(g, u, i, true)) out[i] = true;
    }
    return out;
  };
  U.moveTo = function (g, u, tileIdx) {
    // single-step move into an adjacent tile
    var from = g.tiles[u.tile], to = g.tiles[tileIdx];
    var cost = U.enterCost(g, u, to, from);
    if (cost === Infinity || u.moves <= 0 || U.tileBlocked(g, u, tileIdx, true)) return false;
    G.setUnitTile(g, u, tileIdx); u.moves = Math.max(0, u.moves - cost); u.fortify = 0; u.sleep = false; u.movedTurn = g.turn;
    var civ = U.civ(g, u);
    if (civ) {
      G.revealAround(g, civ, to.col, to.row, G.sight(g, u));
      if (to.camp) U.clearCamp(g, u, to);
      if (civ.isPlayer) G.refreshVisibility(g, civ);
    }
    return true;
  };
  U.clearCamp = function (g, u, t) {
    t.camp = false; g.camps = g.camps.filter(function (c) { return c.tile !== t.i; });
    var civ = U.civ(g, u); if (!civ) return;
    var gold = Math.round((40 + G.rngInt(g, 40) + Object.keys(civ.techs).length * 2) * (G.civFx(g, civ).campGoldMult || 1));
    civ.gold += gold;
    // remove barbarian units on the camp
    G.unitsAt(g, t.i).forEach(function (o) { if (o.civ < 0) G.removeUnit(g, o); });
    G.notify(g, civ, { kind: 'camp', text: u.name + ' dispersed an independent camp: +' + gold + ' Gold.', tile: t.i });
    G.log(g, G.civData(civ).name + ' dispersed a camp.', civ.idx);
  };
  U.followPath = function (g, u) {
    while (u.path && u.path.length && u.moves > 0) {
      var next = u.path[0];
      if (!U.moveTo(g, u, next)) { u.path = null; return false; }
      u.path.shift();
    }
    if (u.path && !u.path.length) u.path = null;
    return true;
  };
  U.orderMove = function (g, u, target) {
    var path = U.findPath(g, u, target);
    if (!path) return false;
    u.path = path; u.sleep = false; u.fortify = 0;
    U.followPath(g, u);
    return true;
  };
  U.newTurn = function (g, u) {
    var def = U.def(g, u);
    var civ = U.civ(g, u);
    var moved = u.movedTurn === g.turn || u.attackedTurn === g.turn;
    if (u.hp < 100 && (!moved || def.healAlways)) {
      var t = g.tiles[u.tile], heal = 5, cfx = civ ? G.civFx(g, civ) : {};
      var ownerCiv = G.tileOwnerCiv(g, t);
      if (civ && ownerCiv === u.civ) { heal = 10 + (cfx.healBonusHome || 0); var s = G.settlementAt(g, u.tile); if (s) { heal += 10; if (s.specialization === 'fort') heal += cfx.fortFullHeal ? 100 : 15; } }
      else if (civ && ownerCiv >= 0 && ownerCiv !== u.civ) heal = 5;
      if (u.fortify > 0) heal += 5;
      heal += cfx.healBonusAll || 0;
      u.hp = Math.min(100, u.hp + heal);
    }
    if (u.fortify > 0 && u.fortify < 2 && !moved) u.fortify++;
    u.moves = G.maxMoves(g, u.civ, u.type);
    if (civ) { var hfx = G.civFx(g, civ); if (hfx.homeMoves && G.tileOwnerCiv(g, g.tiles[u.tile]) === u.civ) u.moves += hfx.homeMoves; }
    if (U.isEmbarked(g, u)) u.moves = Math.max(u.moves, 2 + (civ ? (G.civFx(g, civ).embarkMoves || 0) : 0));
  };
  U.fortify = function (g, u) { if (!G.isMilitary(u)) return; u.fortify = Math.max(u.fortify, 1); u.path = null; u.moves = 0; };
  U.skip = function (g, u) { u.moves = 0; };
  U.sleep = function (g, u) { u.sleep = true; u.path = null; u.moves = 0; };
  U.disband = function (g, u) { G.removeUnit(g, u); };
  U.needsOrders = function (g, u) { return u.moves > 0 && !u.sleep && !u.fortify && !(u.path && u.path.length); };
  U.level = function (u) { return u.xp >= 24 ? 3 : u.xp >= 12 ? 2 : u.xp >= 5 ? 1 : 0; };

  // ---------- Combat ----------
  U.strength = function (g, u, ctx) {
    // ctx: {attacking:bool, ranged:bool, vs: unit|settlement|null}
    var def = U.def(g, u), civ = U.civ(g, u), fx = civ ? G.civFx(g, civ) : {};
    var t = g.tiles[u.tile];
    var str = ctx && ctx.ranged && ctx.attacking ? (def.ranged || 0) : def.strength;
    if (U.isEmbarked(g, u)) return fx.embarkedStrength || 8;
    if (str === 0) return 0;
    str += u.bonusStr + U.level(u) * 3;
    var cls = def.cls;
    var land = cls !== 'naval' && cls !== 'navalRanged';
    var vs = ctx && ctx.vs, vsUnit = vs && vs.type ? vs : null, vsSet = vs && vs.tiles ? vs : null;
    if (fx.classBonus && fx.classBonus[cls]) str += fx.classBonus[cls];
    if (vsUnit && vsUnit.civ < 0 && fx.vsIndependents) str += fx.vsIndependents;
    if (fx.combatBonusJungle && (t.feature === 'jungle' || t.feature === 'marsh')) str += fx.combatBonusJungle;
    var capCont = civ ? G.capitalContinent(g, civ) : -2;
    if (fx.combatBonusAbroad && capCont !== -2 && t.continent >= 0 && t.continent !== capCont) str += fx.combatBonusAbroad;
    if (fx.combatBonusHomeContinent && capCont !== -2 && t.continent === capCont) str += fx.combatBonusHomeContinent;
    if (fx.combatBonusVsInvaders && vsUnit && vsUnit.civ >= 0 && t.continent >= 0 && G.capitalContinent(g, g.civs[vsUnit.civ]) !== t.continent) str += fx.combatBonusVsInvaders;
    if (fx.nearHomeBonus && civ) { var nearS = G.civSettlements(g, civ.idx).some(function (st) { return G.dist(g.tiles[st.tile], t) <= 3; }); if (nearS) str += fx.nearHomeBonus; }
    if (fx.capitalRadiusCombat && civ && civ.capital && g.settlements[civ.capital] && G.dist(g.tiles[g.settlements[civ.capital].tile], t) <= fx.capitalRadiusCombat.radius) str += fx.capitalRadiusCombat.bonus;
    if (land && fx.landBonus) str += fx.landBonus;
    if (!land && fx.navalBonus) str += fx.navalBonus;
    if (cls === 'cavalry' && fx.cavalryBonus) str += fx.cavalryBonus;
    if ((cls === 'melee' || cls === 'antcav' || cls === 'cavalry') && fx.meleeBonus) str += fx.meleeBonus;
    if (fx.combatBonus) str += fx.combatBonus;
    if (fx.strPerLuxury && civ) str += Math.min(5, G.luxuryCount(g, civ).luxuries.length * fx.strPerLuxury);
    var ownerCiv = G.tileOwnerCiv(g, t);
    if (civ && ownerCiv === u.civ && fx.combatBonusHome) str += fx.combatBonusHome;
    if (fx.combatBonusCoast && t.terrain === 'coast') str += fx.combatBonusCoast;
    if (fx.combatBonusForest && (t.feature === 'forest' || t.feature === 'jungle')) str += fx.combatBonusForest;
    if (ctx && ctx.attacking) {
      if (vsSet && fx.vsSettlements) str += fx.vsSettlements;
      if (vsSet && fx.classBonusVsSettlements && fx.classBonusVsSettlements[cls]) str += fx.classBonusVsSettlements[cls];
      if ((cls === 'melee' || cls === 'antcav') && fx.meleeAttackBonus) str += fx.meleeAttackBonus;
      if (ctx.vs && ctx.vs.hp !== undefined && def.bonusVsDamaged && ctx.vs.hp < 100) str += def.bonusVsDamaged;
      if (ctx.vs && ctx.vs.type && cls === 'antcav' && AU.UNITS[ctx.vs.type].cls === 'cavalry') str += 10;
      if (ctx.vs && ctx.vs.type && cls === 'cavalry' && AU.UNITS[ctx.vs.type].cls === 'antcav') str -= 10;
    } else {
      if (fx.defenseBonus) str += fx.defenseBonus;
      if (fx.homeDefenseBonus && ownerCiv === u.civ) str += fx.homeDefenseBonus;
      if (t.hills) str += 3 + (fx.hillsDefenseBonus || 0);
      if (!land && fx.navalDefenseBonus) str += fx.navalDefenseBonus;
      if (t.feature && AU.FEATURES[t.feature].defense) str += AU.FEATURES[t.feature].defense;
      if (u.fortify) str += 3 * u.fortify;
      if (def.defense) str += def.defense;
      var s = G.settlementAt(g, u.tile); if (s && G.hasBuilding(s, 'walls')) str += 3;
      if (ctx && ctx.vs && ctx.vs.type && cls === 'antcav' && AU.UNITS[ctx.vs.type].cls === 'cavalry') str += 10;
    }
    if (!def.noDamagePenalty && !fx.noDamagePenalty) str -= Math.floor((100 - u.hp) / 10);
    return Math.max(1, str);
  };
  U.damage = function (g, diff) {
    var r = 0.8 + G.rng(g) * 0.4;
    return Math.max(1, Math.round(30 * Math.exp(0.04 * diff) * r));
  };
  U.canAttackTile = function (g, u, tileIdx) {
    if (u.moves <= 0 || !G.isMilitary(u) || U.isEmbarked(g, u)) return false;
    var def = U.def(g, u), from = g.tiles[u.tile], to = g.tiles[tileIdx];
    var d = G.dist(from, to);
    var target = U.targetAt(g, u, tileIdx);
    if (!target) return false;
    if (U.isRanged(u)) return d <= (def.range || 1);
    if (d !== 1) return false;
    // melee: must be able to enter target terrain
    if (U.isNaval(u) && !G.isWater(to)) return !!target.settlement && false;
    if (!U.isNaval(u) && G.isWater(to)) return false;
    if (AU.TERRAIN[to.terrain].impassable) return false;
    return true;
  };
  U.targetAt = function (g, u, tileIdx) {
    var s = G.settlementAt(g, tileIdx);
    if (s && G.atWar(g, u.civ, s.civ)) {
      var garrison = G.unitsAt(g, tileIdx).filter(function (o) { return G.isMilitary(o); })[0];
      return { settlement: s, unit: garrison || null };
    }
    var us = G.unitsAt(g, tileIdx).filter(function (o) { return o.civ !== u.civ && G.atWar(g, u.civ, o.civ); });
    if (!us.length) return null;
    var mil = us.filter(G.isMilitary)[0];
    return { unit: mil || us[0], settlement: null };
  };
  U.attack = function (g, u, tileIdx) {
    if (!U.canAttackTile(g, u, tileIdx)) return null;
    var target = U.targetAt(g, u, tileIdx), ranged = U.isRanged(u), def = U.def(g, u);
    var civ = U.civ(g, u), result = { attacker: u.id, ranged: ranged, tile: tileIdx };
    u.attackedTurn = g.turn; u.fortify = 0; u.sleep = false; u.path = null;
    var attackStr = U.strength(g, u, { attacking: true, ranged: ranged, vs: target.unit || target.settlement });
    if (target.settlement && (!target.unit || ranged)) {
      // hit the settlement itself (garrison shares walls; ranged always hits the settlement first)
      var s = target.settlement, sStr = G.settlementStrength(g, s);
      var dmg = U.damage(g, attackStr - sStr);
      if (ranged && def.cls !== 'siege' && def.cls !== 'navalRanged') dmg = Math.round(dmg * 0.5);
      s.hp = Math.max(0, s.hp - dmg); s.attackedTurn = g.turn;
      result.settlementDamage = dmg; result.settlement = s.id;
      if (!ranged) {
        var back = U.damage(g, sStr - attackStr);
        u.hp -= Math.round(back * 0.7); result.attackerDamage = Math.round(back * 0.7);
      }
      if (target.unit && ranged) { /* garrison untouched by ranged */ }
      if (s.hp <= 0 && !ranged && U.canCapture(u) && u.hp > 0) {
        if (target.unit) { G.removeUnit(g, target.unit); G.unitsAt(g, tileIdx).forEach(function (o) { if (o.civ !== u.civ) G.removeUnit(g, o); }); }
        U.captureSettlement(g, s, u.civ);
        u.moves = 0; G.setUnitTile(g, u, tileIdx); result.captured = true;
        if (civ && civ.isPlayer) G.refreshVisibility(g, civ);
        return result;
      }
      G.notify(g, g.civs[s.civ], { kind: 'attack', text: s.name + ' is under attack!', tile: s.tile, settlement: s.id });
    } else if (target.unit) {
      var v = target.unit;
      var defStr = U.strength(g, v, { attacking: false, vs: u });
      if (target.settlement) defStr = Math.max(defStr, G.settlementStrength(g, target.settlement) - 5);
      var dmg2 = U.damage(g, attackStr - defStr);
      if (!G.isMilitary(v) || U.isEmbarked(g, v)) dmg2 = 100;
      v.hp -= dmg2; result.defenderDamage = dmg2; result.defender = v.id;
      if (!ranged) { var back2 = U.damage(g, defStr - attackStr); if (!G.isMilitary(v)) back2 = 0; u.hp -= back2; result.attackerDamage = back2; }
      if (v.hp <= 0) {
        result.killed = v.id; u.xp += 3 * (civ ? (G.civFx(g, civ).xpMult || 1) : 1);
        if (civ) { civ.stats.kills++; var kfx = G.civFx(g, civ); if (kfx.goldPerKill) civ.gold += kfx.goldPerKill; if (kfx.culturePerKill) civ.bonusCulture = (civ.bonusCulture || 0) + kfx.culturePerKill; if (kfx.sciencePerKill) civ.bonusScience = (civ.bonusScience || 0) + kfx.sciencePerKill; if (kfx.navalKillGold && U.isNaval(u)) civ.gold += kfx.navalKillGold; }
        var vciv = U.civ(g, v);
        if (vciv) G.notify(g, vciv, { kind: 'loss', text: 'Your ' + v.name + ' was killed near ' + U.nearestName(g, v.tile) + '.', tile: v.tile });
        if (!G.isMilitary(v) && !ranged && U.canCapture(u)) { // capture civilian: convert
          v.civ = u.civ; v.hp = 100; v.moves = 0; result.capturedUnit = v.id; G.notify(g, civ, { kind: 'capture', text: 'Captured an enemy ' + v.name + '!', tile: v.tile });
        } else {
          G.removeUnit(g, v);
          if (!ranged && !U.tileBlocked(g, u, tileIdx, true) && U.enterCost(g, u, g.tiles[tileIdx], g.tiles[u.tile]) !== Infinity) { G.setUnitTile(g, u, tileIdx); result.advanced = true; }
        }
      } else u.xp += 1 * (civ ? (G.civFx(g, civ).xpMult || 1) : 1);
      if (target.settlement) target.settlement.attackedTurn = g.turn;
    }
    u.moves = 0;
    if (u.hp <= 0) { result.attackerKilled = true; if (civ) G.notify(g, civ, { kind: 'loss', text: 'Your ' + u.name + ' died attacking.', tile: u.tile }); G.removeUnit(g, u); if (target.unit && target.unit.hp > 0) target.unit.xp += 3; }
    if (civ && civ.isPlayer) G.refreshVisibility(g, civ);
    return result;
  };
  U.nearestName = function (g, tileIdx) {
    var best = null, bd = 1e9, t = g.tiles[tileIdx];
    for (var id in g.settlements) { var d = G.dist(t, g.tiles[g.settlements[id].tile]); if (d < bd) { bd = d; best = g.settlements[id]; } }
    return best ? best.name : 'the wilds';
  };
  U.captureSettlement = function (g, s, newCivIdx) {
    var oldCiv = g.civs[s.civ], newCiv = g.civs[newCivIdx];
    var oldIdx = s.civ;
    var fx = G.civFx(g, newCiv);
    s.civ = newCivIdx; s.hp = Math.round(G.settlementMaxHp(g, s) * 0.3); s.queue = []; s.progress = {}; s.pendingGrowth = 0; s.specialization = null; s.captured = true;
    if (!fx.captureNoPopLoss) { s.pop = Math.max(1, s.pop - 1); G.unworkWorstTile(g, s); }
    if (!fx.captureKeepBuildings) s.buildings = s.buildings.filter(function (b) { return AU.WONDERS[b] || G.rng(g) < 0.7; });
    var wasCapital = s.isCapital; s.isCapital = false;
    oldCiv.lostSettlements = (oldCiv.lostSettlements || 0) + 1;
    newCiv.stats.captures++;
    if (fx.captureGold) newCiv.gold += fx.captureGold;
    if (fx.captureCapitalGold && wasCapital) newCiv.gold += fx.captureCapitalGold;
    if (fx.captureCulture) newCiv.bonusCulture = (newCiv.bonusCulture || 0) + fx.captureCulture;
    if (fx.captureScience) newCiv.bonusScience = (newCiv.bonusScience || 0) + fx.captureScience;
    if (fx.captureHeal) { var ct = g.tiles[s.tile]; G.civUnits(g, newCivIdx).forEach(function (cu) { if (G.dist(g.tiles[cu.tile], ct) <= 3) cu.hp = Math.min(100, cu.hp + 50); }); }
    s.buildings = s.buildings.filter(function (b) { return b !== 'palace'; });
    if (!newCiv.capital || !g.settlements[newCiv.capital] || g.settlements[newCiv.capital].civ !== newCivIdx) { newCiv.capital = s.id; s.isCapital = true; s.isCity = true; G.addBuilding(g, s, 'palace'); }
    // old civ: new capital
    var rest = G.civSettlements(g, oldIdx);
    if (wasCapital) { if (rest.length) { rest.sort(function (a, b) { return b.pop - a.pop; }); rest[0].isCapital = true; rest[0].isCity = true; oldCiv.capital = rest[0].id; G.addBuilding(g, rest[0], 'palace'); } else oldCiv.capital = null; }
    G.log(g, G.civData(newCiv).name + ' captured ' + s.name + ' from ' + G.civData(oldCiv).name + '!', newCivIdx);
    g.civs.forEach(function (c) { G.notify(g, c, { kind: 'capture', text: (c.idx === newCivIdx ? 'You' : G.civData(newCiv).name) + ' captured ' + s.name + (c.idx === oldIdx ? ' from you!' : '.'), tile: s.tile, settlement: s.id }); });
    G.revealAround(g, newCiv, g.tiles[s.tile].col, g.tiles[s.tile].row, 3);
    if (!rest.length) U.eliminate(g, oldCiv);
    newCiv.rel[oldIdx].attitude -= 20;
  };
  U.eliminate = function (g, civ) {
    if (!civ.alive) return;
    civ.alive = false;
    G.civUnits(g, civ.idx).forEach(function (u) { G.removeUnit(g, u); });
    g.civs.forEach(function (o) { if (o.idx !== civ.idx && o.rel[civ.idx]) o.rel[civ.idx].war = false; });
    G.log(g, G.civData(civ).name + ' has been destroyed.', civ.idx);
    g.civs.forEach(function (c) { G.notify(g, c, { kind: 'eliminated', text: G.civData(civ).name + ' has been eliminated from the game.' }); });
  };
  U.settlementAttack = function (g, s) {
    if ((!G.hasBuilding(s, 'walls') && !G.civFx(g, g.civs[s.civ]).cityAttackNoWalls) || s.hp <= 0) return;
    var t = g.tiles[s.tile], targets = [];
    Hex.spiral(t.col, t.row, 1, g.W, g.H).forEach(function (i) { if (i === s.tile) return; G.unitsAt(g, i).forEach(function (u) { if (G.atWar(g, s.civ, u.civ) && G.isMilitary(u)) targets.push(u); }); });
    if (!targets.length) return;
    var v = targets[G.rngInt(g, targets.length)];
    var dmg = U.damage(g, G.settlementStrength(g, s) - U.strength(g, v, { attacking: false }));
    v.hp -= Math.round(dmg * 0.6);
    if (v.hp <= 0) { var vc = U.civ(g, v); if (vc) G.notify(g, vc, { kind: 'loss', text: 'Your ' + v.name + ' was killed by the walls of ' + s.name + '.', tile: v.tile }); G.removeUnit(g, v); }
  };
  // ---------- Founding & upgrades ----------
  U.foundCity = function (g, u) {
    if (u.type !== 'settler' || u.moves <= 0 && false) return false;
    if (!G.canFoundAt(g, u.civ, u.tile)) return false;
    var s = G.foundSettlement(g, u.civ, u.tile);
    G.removeUnit(g, u);
    var civ = g.civs[u.civ];
    G.notify(g, civ, { kind: 'found', text: 'Founded ' + s.name + (s.isCapital ? ' (capital)' : ' as a Town') + '.', tile: s.tile, settlement: s.id });
    if (civ.isPlayer) G.refreshVisibility(g, civ);
    return s;
  };
  U.upgradeCost = function (g, u) {
    var def = AU.UNITS[u.type]; if (!def.upgradesTo) return null;
    var civ = U.civ(g, u), nd = G.unitType(g, civ, def.upgradesTo);
    if (nd.tech && !civ.techs[nd.tech]) return null;
    if (nd.resource && !G.hasResource(g, civ, nd.resource)) return null;
    return Math.round((nd.cost - def.cost) * 1.5 + 20);
  };
  U.canUpgrade = function (g, u) { var c = U.upgradeCost(g, u); if (c === null) return false; var civ = U.civ(g, u); return civ.gold >= c && G.tileOwnerCiv(g, g.tiles[u.tile]) === u.civ; };
  U.upgrade = function (g, u) {
    if (!U.canUpgrade(g, u)) return false;
    var civ = U.civ(g, u); civ.gold -= U.upgradeCost(g, u);
    u.type = AU.UNITS[u.type].upgradesTo; u.name = G.unitType(g, civ, u.type).name; u.moves = 0; u.hp = Math.min(100, u.hp + 20);
    return true;
  };
})(globalThis.AU = globalThis.AU || {});
