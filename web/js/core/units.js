// Unit movement, pathfinding and combat.
(function (AU) {
  var G = AU.G, Hex = AU.Hex;
  var U = AU.U = {};

  // Effective definition: base type + unique-unit modifiers + promotions (cached per unit).
  U.def = function (g, u) {
    var base = u.civ >= 0 ? G.unitType(g, g.civs[u.civ], u.type) : AU.UNITS[u.type];
    if (!u.promos || !u.promos.length) return base;
    var key = u.type + '|' + u.civ + '|' + u.promos.join(',');
    if (u._defKey === key && u._def) return u._def;
    var d = Object.assign({}, base);
    u.promos.forEach(function (pid) { var p = AU.PROMO_BY_ID[pid]; if (p) AU.applyUnitMods(d, p.mods); });
    u._def = d; u._defKey = key; return d;
  };
  U.promoMods = function (u) { var m = {}; (u.promos || []).forEach(function (pid) { var p = AU.PROMO_BY_ID[pid]; if (p) AU.applyUnitMods(m, p.mods); }); return m; };
  U.xpForLevel = function (lv) { return [0, 5, 12, 24, 40][Math.min(4, lv)]; };
  U.level = function (u) { return u.xp >= 40 ? 4 : u.xp >= 24 ? 3 : u.xp >= 12 ? 2 : u.xp >= 5 ? 1 : 0; };
  U.promosAvailable = function (u) { return G.isMilitary(u) ? Math.max(0, U.level(u) - (u.promos || []).length) : 0; };
  U.promoChoices = function (g, u) {
    var fam = AU.promoFamily(AU.UNITS[u.type].cls), have = u.promos || [], lv = U.level(u);
    return AU.PROMOTIONS.filter(function (p) { return p.fam === fam && have.indexOf(p.id) < 0 && p.tier <= Math.max(1, lv); });
  };
  U.promote = function (g, u, promoId) {
    if (!U.promosAvailable(u)) return false;
    var p = AU.PROMO_BY_ID[promoId]; if (!p || U.promoChoices(g, u).indexOf(p) < 0) return false;
    u.promos = (u.promos || []).concat([promoId]); u._def = null;
    u.hp = Math.min(100, u.hp + 50); u.moves = 0;
    var civ = U.civ(g, u); if (civ) civ.flags['ev:promote'] = g.turn;
    return true;
  };
  U.isNaval = function (u) { var c = AU.UNITS[u.type].cls; return c === 'naval' || c === 'navalRanged'; };
  U.isRanged = function (u) { var c = AU.UNITS[u.type].cls; return c === 'ranged' || c === 'siege' || c === 'navalRanged' || c === 'air'; };
  U.isAir = function (u) { return !!AU.UNITS[u.type].flying; };
  U.isEmbarked = function (g, u) { return !U.isNaval(u) && !U.isAir(u) && G.isWater(g.tiles[u.tile]); };
  U.canCapture = function (u) { if (u.civ < 0) return false; var c = AU.UNITS[u.type].cls; return c === 'melee' || c === 'antcav' || c === 'cavalry' || c === 'recon'; };
  U.civ = function (g, u) { return u.civ >= 0 ? g.civs[u.civ] : null; };

  // Movement cost to enter tile `to` for unit u; Infinity if not allowed.
  U.enterCost = function (g, u, to, from) {
    var T = AU.TERRAIN[to.terrain];
    var civ = U.civ(g, u), fx = civ ? G.civFx(g, civ) : {};
    if (AU.UNITS[u.type].flying) { var ownerA = G.tileOwnerCiv(g, to); if (ownerA >= 0 && ownerA !== u.civ && !G.atWar(g, u.civ, ownerA) && !(AU.Diplo && AU.Diplo.hasOpenBorders(g, u.civ, ownerA))) return Infinity; return 1; }
    if (T.impassable && !fx.mountainsPassable) return Infinity;
    var naval = U.isNaval(u);
    if (naval) {
      if (!T.water) { if (to.navigable) return 1; var s = G.settlementAt(g, to.i); if (!s || s.civ !== u.civ) return Infinity; return 1; }
      if (to.terrain === 'ocean' && !(AU.UNITS[u.type].ocean || (civ && (civ.techs.cartography || fx.earlyOcean)))) return Infinity;
      return 1;
    }
    if (T.water) {
      if (!civ || !(civ.techs.sailing || fx.earlyEmbark)) return Infinity;
      if (to.terrain === 'ocean' && !(civ.techs.cartography || fx.earlyOcean)) return Infinity;
      return 1;
    }
    if (T.impassable) { if (fx.mountainsPassable && !naval) { var ownerM = G.tileOwnerCiv(g, to); if (ownerM >= 0 && ownerM !== u.civ && G.isMilitary(u) && !G.atWar(g, u.civ, ownerM)) return Infinity; return 3; } return Infinity; }
    var cost = 1, ud = U.def(g, u);
    if (ud.ignoreTerrain) { if (from && G.isWater(from) && !fx.freeDisembark && !ud.amphibious) return 99; return 1; }
    var fm = fx.forestMoveCost || (ud.forestMove ? 1 : 0);
    if (to.hills) cost = ud.ignoreHills ? 1 : (fx.hillsMoveCost || 2);
    if (to.feature && AU.FEATURES[to.feature].move > cost) cost = fm && (to.feature === 'forest' || to.feature === 'jungle') ? Math.max(cost, fm) : AU.FEATURES[to.feature].move;
    if (to.hills && to.feature && (to.feature === 'forest' || to.feature === 'jungle') && !fm) cost = Math.max(cost, (fx.hillsMoveCost || 2) + 1);
    if (from && G.isWater(from) && !fx.freeDisembark && !ud.amphibious) cost = 99; // disembarking ends the move
    // territory rules: military units may not enter foreign territory at peace
    var ownerCiv = G.tileOwnerCiv(g, to);
    if (ownerCiv >= 0 && ownerCiv !== u.civ && G.isMilitary(u) && AU.UNITS[u.type].cls !== 'recon' && !G.atWar(g, u.civ, ownerCiv) && !(AU.Diplo && AU.Diplo.hasOpenBorders(g, u.civ, ownerCiv))) return Infinity;
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
      if (asDestination && G.isMilitary(o) === G.isMilitary(u) && o.id !== u.id && !AU.UNITS[o.type].great && !AU.UNITS[u.type].great) { if (g.v2 && AU.Warbands && G.isMilitary(u)) { if (!AU.Warbands.roomFor(g, u, tileIdx)) return true; } else return true; } // great people may share a tile with anyone of their side; v2: up to three fighters and a Commander form a Warband
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
    var zoc = g.v2 && AU.Warbands && AU.Warbands.zocApplies(g, u), zocCost = zoc ? Math.max(1, G.maxMoves(g, u.civ, u.type, u)) : 0;
    while (open.a.length) {
      var cur = open.pop(), d = cur[0], idx = cur[1];
      if (d > dist[idx]) continue;
      if (d >= maxCost) continue;
      var t = g.tiles[idx], nb = G.neighbors(g, t);
      var held = zoc && idx !== u.tile && AU.Warbands.zocAt(g, u.civ, idx); // zone of control: a stop here ends the turn, the walk goes on next turn
      for (var k = 0; k < nb.length; k++) {
        var n = nb[k], nt = g.tiles[n];
        var c = U.enterCost(g, u, nt, t);
        if (c === Infinity) continue;
        if (held) c += zocCost;
        if (U.tileBlocked(g, u, n, false)) continue;
        var nd = d + c;
        if (dist[n] === undefined || nd < dist[n]) { dist[n] = nd; prev[n] = idx; open.push(nd, n); }
      }
    }
    return { dist: dist, prev: prev };
  };
  // Plain movement cost of a tile for an ordinary land unit (what the tile card shows).
  U.terrainCost = function (t) { var T = AU.TERRAIN[t.terrain]; if (T.impassable) return Infinity; if (T.water) return 1; var c = t.hills ? 2 : 1; if (t.feature && AU.FEATURES[t.feature].move > c) c = AU.FEATURES[t.feature].move; if (t.hills && (t.feature === 'forest' || t.feature === 'jungle')) c = 3; return c; };
  // How many turns a unit needs to walk a path (this turn counts if it still has movement).
  U.pathTurns = function (g, u, path) {
    if (!path || !path.length) return 0;
    var def = U.def(g, u), max = def.moves || 1, moves = u.moves, turns = moves > 0 ? 1 : 0, from = g.tiles[u.tile];
    for (var i = 0; i < path.length; i++) { var to = g.tiles[path[i]]; if (moves <= 0) { turns++; moves = max; } var c = U.enterCost(g, u, to, from); if (c === Infinity) break; moves = Math.max(0, moves - c); from = to; }
    return Math.max(1, turns);
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
    var out = {}; if (!G.canOrder(g, u)) return out; var res = U.dijkstra(g, u, u.moves);
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
    if (!G.spendOrder(g, u)) return false; // no Command left this turn
    G.setUnitTile(g, u, tileIdx); u.moves = Math.max(0, u.moves - cost); u.fortify = 0; u.sleep = false; u.movedTurn = g.turn;
    if (g.v2 && AU.Warbands && u.moves > 0 && AU.Warbands.zocApplies(g, u) && AU.Warbands.zocAt(g, u.civ, tileIdx)) { u.moves = 0; u.zocStopped = g.turn; } // zone of control: stepping next to an enemy Warband ends the move
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
    civ.flags['ev:camp'] = g.turn;
    var gold = Math.round((40 + G.rngInt(g, 40) + Object.keys(civ.techs).length * 2) * (G.civFx(g, civ).campGoldMult || 1));
    civ.gold += gold;
    // remove the Inchibil units on the camp
    G.unitsAt(g, t.i).forEach(function (o) { if (o.civ < 0) G.removeUnit(g, o); });
    g.undo = null;
    G.notify(g, civ, { big: true, kind: 'camp', text: '🏕️ ' + u.name + ' ' + _('dispersed an Inchibil camp') + ': +' + gold + ' Gold.', tile: t.i });
    if (civ.isPlayer) { g.quoteQueue = g.quoteQueue || []; g.quoteQueue.push({ kicker: _('Inchibil camp dispersed'), title: u.name + ' ' + _('scatters the Inchibils'), text: _('We found their camp and drove them off. The loot is ours') + ': +' + gold + ' Gold.', by: u.name, tile: t.i, cat: 'camp' }); }
    G.log(g, G.civData(civ).name + ' ' + _('dispersed a camp.'), civ.idx);
    var cfx0 = G.civFx(g, civ); if (cfx0.campFaith) civ.bonusFaith = (civ.bonusFaith || 0) + cfx0.campFaith;
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
    var civ0 = U.civ(g, u); if (civ0 && civ0.isPlayer) g.undo = { unit: u.id, tile: u.tile, moves: u.moves, fortify: u.fortify, sleep: u.sleep, movedTurn: u.movedTurn, turn: g.turn };
    u.path = path; u.sleep = false; u.fortify = 0;
    U.followPath(g, u);
    return true;
  };
  // Undo the last move order of this turn: only while nothing else happened since (no attack, capture, camp, founding, end of turn).
  U.canUndo = function (g, u) { var d = g.undo; return !!(d && d.unit === u.id && d.turn === g.turn && g.units[u.id] && u.tile !== d.tile && !U.tileBlocked(g, u, d.tile, true)); };
  U.undoMove = function (g, u) {
    if (!U.canUndo(g, u)) return false;
    var d = g.undo; G.setUnitTile(g, u, d.tile); u.moves = d.moves; G.refundOrder(g, u); u.fortify = d.fortify; u.sleep = d.sleep; u.movedTurn = d.movedTurn; u.path = null; g.undo = null;
    var civ = U.civ(g, u); if (civ && civ.isPlayer) G.refreshVisibility(g, civ);
    return true;
  };
  U.newTurn = function (g, u) {
    var def = U.def(g, u);
    var civ = U.civ(g, u);
    var moved = u.movedTurn === g.turn || u.attackedTurn === g.turn;
    if (u.hp < 100 && (!moved || def.healAlways)) {
      var t = g.tiles[u.tile], heal = 5, cfx = civ ? G.civFx(g, civ) : {};
      var ownerCiv = G.tileOwnerCiv(g, t);
      if (civ && ownerCiv === u.civ) { heal = 10 + (cfx.healBonusHome || 0); var s = G.settlementAt(g, u.tile); if (s) { heal += 10; if (s.specialization === 'fort') heal += cfx.fortFullHeal ? 100 : 15; var utH = G.civData(civ).ut; if (utH && s.specialization === utH.id && utH.fx && utH.fx.heal) heal += utH.fx.heal; } }
      else if (civ && ownerCiv >= 0 && ownerCiv !== u.civ) heal = 5;
      if (u.fortify > 0) heal += 5;
      heal += (cfx.healBonusAll || 0) + (def.healBonus || 0);
      u.hp = Math.min(100, u.hp + heal);
    }
    if (u.fortify > 0 && u.fortify < 2 && !moved) u.fortify++;
    u.moves = G.maxMoves(g, u.civ, u.type, u);
    if (def.religious && civ) u.moves += G.civFx(g, civ).religiousMoves || 0;
    u.attacksLeft = def.extraAttack ? 2 : 1;
    if (civ) { var hfx = G.civFx(g, civ); if (hfx.homeMoves && G.tileOwnerCiv(g, g.tiles[u.tile]) === u.civ) u.moves += hfx.homeMoves; }
    if (g.v2 && AU.Warbands && G.isMilitary(u) && !AU.Warbands.isCommander(u) && AU.Warbands.commanderAt(g, u.tile, u.civ)) u.moves += 1; // a Commander moves its Warband one tile farther
    if (U.isEmbarked(g, u)) u.moves = Math.max(u.moves, 2 + (civ ? (G.civFx(g, civ).embarkMoves || 0) : 0));
  };
  U.fortify = function (g, u) { if (!G.isMilitary(u)) return; u.fortify = Math.max(u.fortify, 1); u.path = null; u.moves = 0; };
  U.skip = function (g, u) { u.moves = 0; };
  U.sleep = function (g, u) { u.sleep = true; u.path = null; u.moves = 0; };
  U.disband = function (g, u) { G.removeUnit(g, u); };
  U.needsOrders = function (g, u) { return u.moves > 0 && !u.sleep && !u.fortify && !(u.path && u.path.length) && G.canOrder(g, u); };

  // ---------- Combat ----------
  U.strength = function (g, u, ctx) {
    // ctx: {attacking:bool, ranged:bool, vs: unit|settlement|null}
    var def = U.def(g, u), civ = U.civ(g, u), fx = civ ? G.civFx(g, civ) : {};
    var t = g.tiles[u.tile];
    var str = ctx && ctx.ranged && ctx.attacking ? (def.ranged || 0) : def.strength;
    if (U.isEmbarked(g, u)) return fx.embarkedStrength || 8;
    if (str === 0) return 0;
    str += u.bonusStr + U.level(u) * 2;
    var cls = def.cls;
    var vsU0 = ctx && ctx.vs && ctx.vs.type ? ctx.vs : null;
    if (def.terrainBonus) { if (t.hills && def.terrainBonus.hills) str += def.terrainBonus.hills; if (def.terrainBonus[t.terrain]) str += def.terrainBonus[t.terrain]; if (t.feature && def.terrainBonus[t.feature]) str += def.terrainBonus[t.feature]; }
    var rough = t.hills || t.feature === 'forest' || t.feature === 'jungle';
    if (def.roughBonus && rough) str += def.roughBonus;
    if (def.openBonus && !rough && !G.isWater(t)) str += def.openBonus;
    if (def.homeBonus && civ && G.tileOwnerCiv(g, t) === u.civ) str += def.homeBonus;
    if ((def.abroadBonus || def.homeContinentBonus) && civ) { var cc0 = G.capitalContinent(g, civ); if (cc0 !== -2 && t.continent >= 0) { if (def.abroadBonus && t.continent !== cc0) str += def.abroadBonus; if (def.homeContinentBonus && t.continent === cc0) str += def.homeContinentBonus; } }
    if (def.garrisonBonus && G.settlementAt(g, u.tile)) str += def.garrisonBonus;
    if (vsU0 && def.vsCls && def.vsCls[AU.UNITS[vsU0.type].cls]) str += def.vsCls[AU.UNITS[vsU0.type].cls];
    // class counters: spears beat horses, horses run down archers and siege engines
    if (vsU0) { var vcls = AU.UNITS[vsU0.type].cls; if (cls === 'antcav' && vcls === 'cavalry') str += 10; if (cls === 'cavalry' && (vcls === 'ranged' || vcls === 'siege')) str += 5; }
    if (vsU0 && vsU0.civ < 0 && def.vsIndependents) str += def.vsIndependents;
    {
      var nb = G.neighbors(g, t), adjF = 0, adjS = 0, intim = 0;
      for (var ni = 0; ni < nb.length; ni++) { var nus = G.unitsAt(g, nb[ni]); for (var nj = 0; nj < nus.length; nj++) { var o = nus[nj]; if (!G.isMilitary(o)) continue; if (o.civ === u.civ) { adjF++; if (o.type === u.type) adjS++; } else if (G.atWar(g, u.civ, o.civ)) { var od = U.def(g, o); if (od.intimidate) intim = Math.max(intim, od.intimidate); } } }
      // flanking (+2 per adjacent friendly military unit when attacking) and support (+2 each when defending), max 3 units
      if (!(ctx && ctx.ranged)) str += Math.min(3, adjF) * 2;
      if (def.flank) str += Math.min(3, adjF) * def.flank;
      if (def.flankSame) str += Math.min(3, adjS) * def.flankSame;
      str -= intim;
    }
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
    if (AU.Great && G.isMilitary(u)) str += AU.Great.aura(g, u, !land);
    if (!land && fx.navalBonus) str += fx.navalBonus;
    if (cls === 'cavalry' && fx.cavalryBonus) str += fx.cavalryBonus;
    if ((cls === 'melee' || cls === 'antcav' || cls === 'cavalry') && fx.meleeBonus) str += fx.meleeBonus;
    if (fx.combatBonus) str += fx.combatBonus;
    if (civ && AU.Religion && (fx.combatBonusOwnReligion || fx.combatBonusVsOtherReligion || fx.combatBonusVsFollowerSettlements)) {
      var relId = civ.religion;
      if (fx.combatBonusOwnReligion && relId) { var nearRel = G.settlementAt(g, u.tile); var okRel = nearRel && nearRel.religion === relId; if (!okRel) okRel = G.neighbors(g, t).some(function (n) { var ns = G.settlementAt(g, n); return ns && ns.religion === relId; }); if (okRel) str += fx.combatBonusOwnReligion; }
      if (fx.combatBonusVsOtherReligion && vsUnit && vsUnit.civ >= 0 && g.civs[vsUnit.civ].religion !== relId) str += fx.combatBonusVsOtherReligion;
      if (fx.combatBonusVsFollowerSettlements && ctx && ctx.attacking && vsSet && vsSet.religion === relId && vsSet.civ !== u.civ) str += fx.combatBonusVsFollowerSettlements;
    }
    if (fx.strPerLuxury && civ) str += Math.min(5, G.luxuryCount(g, civ).luxuries.length * fx.strPerLuxury);
    var ownerCiv = G.tileOwnerCiv(g, t);
    if (civ && ownerCiv === u.civ && fx.combatBonusHome) str += fx.combatBonusHome;
    if (fx.combatBonusCoast && t.terrain === 'coast') str += fx.combatBonusCoast;
    if (fx.combatBonusForest && (t.feature === 'forest' || t.feature === 'jungle')) str += fx.combatBonusForest;
    if (ctx && ctx.attacking) {
      if (vsSet && fx.vsSettlements) str += fx.vsSettlements;
      if (vsSet && def.vsSettlements) str += def.vsSettlements;
      if (def.attack) str += def.attack;
      if (vsU0 && def.vsStronger && U.def(g, vsU0).strength > def.strength) str += def.vsStronger;
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
      if (u.fortify) str += 3 * u.fortify * (def.fortifyMult ? 2 : 1);
      if (def.defense) str += def.defense;
      if (def.defVsRanged && ctx && ctx.vs && ctx.vs.type && U.isRanged(ctx.vs)) str += def.defVsRanged;
      var s = G.settlementAt(g, u.tile); if (s && G.hasBuilding(s, 'walls')) str += 3;
      if (ctx && ctx.vs && ctx.vs.type && cls === 'antcav' && AU.UNITS[ctx.vs.type].cls === 'cavalry') str += 10;
    }
    if (!def.noDamagePenalty && !fx.noDamagePenalty) str -= Math.floor((100 - u.hp) / 10);
    if (u.baited && u.baited.until > g.turn) str -= u.baited.str; // shaken by a Scarecrow Crew's ambush
    return Math.max(1, str);
  };
  U.damage = function (g, diff) {
    var r = 0.8 + G.rng(g) * 0.4;
    return Math.max(1, Math.round(30 * Math.exp(0.04 * diff) * r));
  };
  U.canAttackTile = function (g, u, tileIdx, ignoreOrder) {
    if (u.moves <= 0 || !G.isMilitary(u) || U.isEmbarked(g, u)) return false;
    if (u.attacksLeft === 0 || AU.UNITS[u.type].noAttack) return false;
    if (!ignoreOrder && !G.canOrder(g, u)) return false; // no Command left this turn
    var def = U.def(g, u), from = g.tiles[u.tile], to = g.tiles[tileIdx];
    var d = G.dist(from, to);
    var target = U.targetAt(g, u, tileIdx);
    if (!target) return false;
    if (U.isRanged(u)) return d <= (def.range || 1);
    if (d !== 1) return false;
    // melee: must be able to enter target terrain
    if (U.isNaval(u) && !G.isWater(to) && !to.navigable) return false;
    if (!U.isNaval(u) && !U.isAir(u) && G.isWater(to)) return false;
    if (AU.TERRAIN[to.terrain].impassable) return false;
    return true;
  };
  U.targetAt = function (g, u, tileIdx) {
    var s = G.settlementAt(g, tileIdx);
    if (s && G.atWar(g, u.civ, s.civ)) {
      var garrison = G.unitsAt(g, tileIdx).filter(function (o) { return G.isMilitary(o) && !AU.UNITS[o.type].decoy; })[0];
      return { settlement: s, unit: garrison || null };
    }
    var us = G.unitsAt(g, tileIdx).filter(function (o) { return o.civ !== u.civ && G.atWar(g, u.civ, o.civ); });
    if (!us.length) return null;
    var mil = us.filter(function (o) { return G.isMilitary(o) && !AU.UNITS[o.type].decoy; })[0] || us.filter(G.isMilitary)[0]; // a Scarecrow Crew is the target only when it stands alone
    return { unit: mil || us[0], settlement: null };
  };
  U.attack = function (g, u, tileIdx) {
    g.undo = null;
    if (!U.canAttackTile(g, u, tileIdx)) return null;
    if (!G.spendOrder(g, u)) return null;
    if (g.v2 && AU.Warbands) return AU.Warbands.attack(g, u, tileIdx); // Divergence: the whole Warband fights as one
    var target = U.targetAt(g, u, tileIdx), ranged = U.isRanged(u), def = U.def(g, u);
    var civ = U.civ(g, u), result = { attacker: u.id, ranged: ranged, tile: tileIdx };
    u.attackedTurn = g.turn; u.fortify = 0; u.sleep = false; u.path = null;
    if (civ) civ.flags['ev:combat'] = g.turn; if (target.unit) { var tciv = U.civ(g, target.unit); if (tciv) tciv.flags['ev:combat'] = g.turn; } else if (target.settlement && g.civs[target.settlement.civ]) g.civs[target.settlement.civ].flags['ev:combat'] = g.turn;
    var attackStr = U.strength(g, u, { attacking: true, ranged: ranged, vs: target.unit || target.settlement });
    if (target.settlement && (!target.unit || ranged)) {
      // hit the settlement itself (garrison shares walls; ranged always hits the settlement first)
      var s = target.settlement, sStr = G.settlementStrength(g, s);
      var dmg = U.damage(g, attackStr - sStr);
      if (ranged && def.cls !== 'siege' && def.cls !== 'navalRanged') dmg = Math.round(dmg * 0.5);
      s.hp = Math.max(0, s.hp - dmg); s.attackedTurn = g.turn;
      result.settlementDamage = dmg; result.settlement = s.id;
      if (!ranged) {
        var back = U.damage(g, sStr - attackStr) * (def.noRetaliation ? 0 : def.halfRetaliation ? 0.5 : 1);
        u.hp -= Math.round(back * 0.7); result.attackerDamage = Math.round(back * 0.7);
      }
      if (target.unit && ranged) { /* garrison untouched by ranged */ }
      if (s.hp <= 0 && !ranged && U.canCapture(u) && u.hp > 0) {
        if (target.unit) { G.removeUnit(g, target.unit); G.unitsAt(g, tileIdx).forEach(function (o) { if (o.civ !== u.civ) G.removeUnit(g, o); }); }
        U.captureSettlement(g, s, u.civ, def);
        u.moves = 0; G.setUnitTile(g, u, tileIdx); result.captured = true;
        if (civ && civ.isPlayer) G.refreshVisibility(g, civ);
        return result;
      }
      G.notify(g, g.civs[s.civ], { kind: 'attack', text: s.name + ' ' + _('is under attack!'), tile: s.tile, settlement: s.id });
    } else if (target.unit) {
      var v = target.unit;
      var defStr = U.strength(g, v, { attacking: false, vs: u });
      if (target.settlement) defStr = Math.max(defStr, G.settlementStrength(g, target.settlement) - 5);
      var dmg2 = U.damage(g, attackStr - defStr);
      if (!G.isMilitary(v) || U.isEmbarked(g, v)) dmg2 = 100;
      v.hp -= dmg2; result.defenderDamage = dmg2; result.defender = v.id;
      if (!ranged) { var back2 = U.damage(g, defStr - attackStr); if (!G.isMilitary(v)) back2 = 0; if (def.noRetaliation) back2 = 0; else if (def.halfRetaliation) back2 = Math.round(back2 / 2); u.hp -= back2; result.attackerDamage = back2; }
      if (v.hp <= 0) {
        result.killed = v.id; u.xp += 3 * (civ ? (G.civFx(g, civ).xpMult || 1) : 1) * (1 + (def.xpMult || 0));
        U.killRewards(g, u, def, v);
        if (civ) { var kf = G.civFx(g, civ); if (kf.faithFromKills) civ.bonusFaith = (civ.bonusFaith || 0) + kf.faithFromKills; }
        if (civ) { civ.flags['ev:combat'] = g.turn; civ.stats.kills++; if (u.type === 'slinger') civ.flags['ev:killSlinger'] = g.turn; if (AU.UNITS[u.type].cls === 'antcav') civ.flags['ev:killSpear'] = g.turn; if (U.isNaval(u)) civ.flags['ev:killNaval'] = g.turn; if (U.isRanged(u)) civ.flags['ev:killRanged'] = g.turn; var kfx = G.civFx(g, civ); if (kfx.goldPerKill) civ.gold += kfx.goldPerKill; if (kfx.culturePerKill) civ.bonusCulture = (civ.bonusCulture || 0) + kfx.culturePerKill; if (kfx.sciencePerKill) civ.bonusScience = (civ.bonusScience || 0) + kfx.sciencePerKill; if (kfx.navalKillGold && U.isNaval(u)) civ.gold += kfx.navalKillGold; }
        var vciv = U.civ(g, v);
        if (vciv) { vciv.flags['ev:combat'] = g.turn; vciv.flags['ev:unitLost'] = g.turn; if (U.isNaval(v)) vciv.flags['ev:boatLost'] = g.turn; }
        if (vciv) G.notify(g, vciv, { kind: 'loss', text: _('Your') + ' ' + v.name + ' was killed near ' + U.nearestName(g, v.tile) + '.', tile: v.tile });
        if (!G.isMilitary(v) && !ranged && U.canCapture(u) && !AU.UNITS[v.type].religious) { // capture civilian: convert
          v.civ = u.civ; v.hp = 100; v.moves = 0; result.capturedUnit = v.id; G.notify(g, civ, { kind: 'capture', text: _('Captured an enemy') + ' ' + v.name + '!', tile: v.tile });
        } else {
          G.removeUnit(g, v);
          if (!ranged && !U.tileBlocked(g, u, tileIdx, true) && U.enterCost(g, u, g.tiles[tileIdx], g.tiles[u.tile]) !== Infinity) { G.setUnitTile(g, u, tileIdx); result.advanced = true; }
        }
      } else u.xp += 1 * (civ ? (G.civFx(g, civ).xpMult || 1) : 1) * (1 + (def.xpMult || 0));
      if (target.settlement) target.settlement.attackedTurn = g.turn;
    }
    u.attacksLeft = Math.max(0, (u.attacksLeft === undefined ? 1 : u.attacksLeft) - 1);
    if (u.attacksLeft > 0 && u.moves > 0) u.moves = Math.max(1, u.moves - 1);
    else if (def.movesAfterAttack) u.moves = Math.max(0, u.moves - 1);
    else u.moves = 0;
    if (u.hp <= 0) { result.attackerKilled = true; if (civ) G.notify(g, civ, { kind: 'loss', text: _('Your') + ' ' + u.name + ' ' + _('died attacking.'), tile: u.tile }); G.removeUnit(g, u); if (target.unit && target.unit.hp > 0) target.unit.xp += 3; }
    if (civ && civ.isPlayer) G.refreshVisibility(g, civ);
    return result;
  };
  U.killRewards = function (g, u, def, v) {
    var civ = U.civ(g, u); if (!civ) return;
    if (def.healOnKill) u.hp = Math.min(100, u.hp + def.healOnKill);
    if (def.goldOnKill) civ.gold += def.goldOnKill;
    if (def.cultureOnKill) civ.bonusCulture = (civ.bonusCulture || 0) + def.cultureOnKill;
    if (def.scienceOnKill) civ.bonusScience = (civ.bonusScience || 0) + def.scienceOnKill;
    if (def.productionOnKill) { var best = null, bd = 1e9, t = g.tiles[u.tile]; G.civSettlements(g, civ.idx).forEach(function (s) { var d = G.dist(t, g.tiles[s.tile]); if (d < bd) { bd = d; best = s; } }); if (best) best.bonusProduction = (best.bonusProduction || 0) + def.productionOnKill; }
  };
  U.nearestName = function (g, tileIdx) {
    var best = null, bd = 1e9, t = g.tiles[tileIdx];
    for (var id in g.settlements) { var d = G.dist(t, g.tiles[g.settlements[id].tile]); if (d < bd) { bd = d; best = g.settlements[id]; } }
    return best ? best.name : 'the wilds';
  };
  U.captureSettlement = function (g, s, newCivIdx, captor) {
    var oldCiv = g.civs[s.civ], newCiv = g.civs[newCivIdx];
    var oldIdx = s.civ;
    var fx = Object.assign({}, G.civFx(g, newCiv)); if (captor && captor.captureBonus) { fx.captureNoPopLoss = true; fx.captureKeepBuildings = true; }
    s.civ = newCivIdx; s.hp = Math.round(G.settlementMaxHp(g, s) * 0.3); s.queue = []; s.progress = {}; s.pendingGrowth = 0; s.specialization = null; s.captured = true;
    if (!fx.captureNoPopLoss) { s.pop = Math.max(1, s.pop - 1); G.unworkWorstTile(g, s); }
    if (!fx.captureKeepBuildings) s.buildings = s.buildings.filter(function (b) { return AU.WONDERS[b] || G.rng(g) < 0.7; });
    var wasCapital = s.isCapital; s.isCapital = false;
    oldCiv.lostSettlements = (oldCiv.lostSettlements || 0) + 1;
    newCiv.stats.captures++; newCiv.flags['ev:capture'] = g.turn;
    if (newCiv.rel[oldIdx]) newCiv.rel[oldIdx].capturedThisWar = (newCiv.rel[oldIdx].capturedThisWar || 0) + 1; if (oldCiv.rel[newCivIdx]) oldCiv.rel[newCivIdx].lostThisWar = (oldCiv.rel[newCivIdx].lostThisWar || 0) + 1;
    var nCap = (newCiv.rel[oldIdx] && newCiv.rel[oldIdx].capturedThisWar) || 1; s.unrest = fx.noUnrest ? g.turn : g.turn + Math.round((10 + 3 * (nCap - 1)) * (fx.unrestMult || 1)); if (s.origCiv === undefined || s.origCiv === newCivIdx) s.origCiv = oldIdx; if (s.origCiv === newCivIdx) s.origCiv = undefined; newCiv.warWeariness = (newCiv.warWeariness || 0) + 6; // conquest fatigue: unrest grows with every capture of the war, weariness at home
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
    g.civs.forEach(function (c) { G.notify(g, c, { kind: 'capture', text: (c.idx === newCivIdx ? _('You') : G.civData(newCiv).name) + ' captured ' + s.name + (c.idx === oldIdx ? ' ' + _('from you!') : '.'), tile: s.tile, settlement: s.id }); });
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
    if (v.hp <= 0) { var vc = U.civ(g, v); if (vc) G.notify(g, vc, { kind: 'loss', text: _('Your') + ' ' + v.name + ' was killed by the walls of ' + s.name + '.', tile: v.tile }); G.removeUnit(g, v); }
  };
  // ---------- Founding & upgrades ----------
  U.foundCity = function (g, u) {
    g.undo = null;
    if (u.type !== 'settler' || u.moves <= 0 && false) return false;
    if (!G.canFoundAt(g, u.civ, u.tile)) return false;
    var s = G.foundSettlement(g, u.civ, u.tile);
    G.removeUnit(g, u);
    var civ = g.civs[u.civ];
    G.notify(g, civ, { kind: 'found', text: _('Founded') + ' ' + s.name + (s.isCapital ? ' (capital)' : ' ' + _('as a Town')) + '.', tile: s.tile, settlement: s.id });
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
