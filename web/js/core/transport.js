// Airports and highways: the transport of the Glowbit and Pixel Ages, added on top of roads and railways (which keep their full value).
//
// AIRPORTS (AU.Air). An Airport is an ordinary building. Two or more Airports in your empire fly routes between each other on their
// own, across seas too. Every Airport has gates for 3 routes per level: a level-1 Airport serves 3 routes, level 2 serves 6, level 3
// serves 9, and there is no top level. A route takes a gate at BOTH ends, so a big hub can serve many small Airports while each small
// one still has only its own 3 gates. Routes go to the biggest hubs first, then to the biggest settlements.
// Each route pays its Airport Gold and Knowledge by the size of the other end, and brings visitors (Fame), but every extra route counts
// for less than the one before (the 2nd half, the 3rd a third...): a hub keeps gaining, ever more slowly.
// Upgrading an Airport costs Gold up front and takes turns (level 3 and up also need Aluminum for the new jets); the Airport keeps
// flying while the works go on. Each Airport level costs 1 Gold a turn. Soldiers can fly between two linked Airports.
//
// HIGHWAYS (AU.Hwy). A Highway Interchange is a building. From the turn it opens, it paves the land around its settlement (3 tiles
// out: first the tiles your people work, then the roads) one tile a turn, and it paves an interstate toward every other Interchange
// settlement within 10 tiles on the same continent, one tile a turn. Nobody draws the lines: the network spreads by itself.
// An Interchange gives: suburbs (+15% growth), trucking (+1 Gold for every worked tile on a highway), and +2 Production and +1 Gold
// for every other Interchange settlement joined to it by highway (at most 4). Units move along highways for 0.2 movement.
// Each Interchange costs 2 Gold a turn and 1 Smoke.
//
// FUEL. Planes and cars burn Oil. Every Oil you own fuels 6 points of demand (1 per Airport level, 2 per Interchange). Any demand
// beyond that runs on imported fuel for 2 Gold a point per turn.
(function (AU) {
  var G = AU.G;
  function sparked(g, civ, id, tech) { return g.v2 && AU.MasteryWeb ? !!AU.MasteryWeb.state(civ).unlocked[id] : !!(civ.techs && civ.techs[tech]); }
  function supply(g, civ, res) { return AU.Society ? AU.Society.resourceSupply(g, civ, res) : (G.hasResource(g, civ, res) ? 1 : 0); }

  // ================= Airports =================
  var AR = AU.Air = {};
  AR.CFG = { spark: 'g_runway', gates: 3, gold: 2, popPerGold: 4, science: 1, popPerScience: 6, fame: 1, upgradeGold: 300, upgradeTurns: 6, turnsPerLevel: 2, alumAt: 3, upkeep: 1 };
  AR.unlocked = function (g, civ) { return sparked(g, civ, AR.CFG.spark, 'flight'); };
  AR.level = function (s) { return G.hasBuilding(s, 'airport') ? (s.airLevel || 1) : 0; };
  AR.gates = function (s) { return AR.level(s) * AR.CFG.gates; };
  AR.airports = function (g, civ) { return G.civSettlements(g, civ.idx).filter(function (s) { return G.hasBuilding(s, 'airport'); }); };
  // the route map: hubs pair up first, then the biggest settlements, while both ends have a free gate
  AR.routes = function (g, civ) {
    var list = AR.airports(g, civ), key = g.turn + ':' + list.map(function (s) { return s.id + '.' + AR.level(s) + '.' + s.pop; }).join(',');
    if (civ._air && civ._air.key === key) return civ._air.routes;
    var pairs = [];
    for (var i = 0; i < list.length; i++) for (var j = i + 1; j < list.length; j++) pairs.push([list[i], list[j]]);
    pairs.sort(function (p, q) { return (AR.level(q[0]) + AR.level(q[1])) - (AR.level(p[0]) + AR.level(p[1])) || (q[0].pop + q[1].pop) - (p[0].pop + p[1].pop) || (p[0].id + p[1].id) - (q[0].id + q[1].id); });
    var used = {}, routes = [];
    pairs.forEach(function (p) { var a = p[0], b = p[1]; if ((used[a.id] || 0) >= AR.gates(a) || (used[b.id] || 0) >= AR.gates(b)) return; used[a.id] = (used[a.id] || 0) + 1; used[b.id] = (used[b.id] || 0) + 1; routes.push([a.id, b.id]); });
    civ._air = { key: key, routes: routes };
    return routes;
  };
  AR.partners = function (g, civ, s) {
    return AR.routes(g, civ).filter(function (r) { return r[0] === s.id || r[1] === s.id; }).map(function (r) { return g.settlements[r[0] === s.id ? r[1] : r[0]]; }).filter(Boolean)
      .sort(function (a, b) { return b.pop - a.pop || a.id - b.id; });
  };
  // Gold, Knowledge and Fame of one Airport: the k-th route counts 1/k
  AR.yields = function (g, s, civ) {
    var out = { gold: 0, science: 0, fame: 0, routes: 0 }; if (!civ || !G.hasBuilding(s, 'airport')) return out;
    var C = AR.CFG;
    AR.partners(g, civ, s).forEach(function (o, k) { var w = 1 / (k + 1); out.gold += w * (C.gold + Math.floor(o.pop / C.popPerGold)); out.science += w * (C.science + Math.floor(o.pop / C.popPerScience)); out.fame += w * C.fame; out.routes++; });
    out.gold = Math.round(out.gold); out.science = Math.round(out.science); out.fame = Math.round(out.fame * 10) / 10;
    return out;
  };
  AR.upgradeCost = function (g, s) { return Math.round(AR.CFG.upgradeGold * AR.level(s) * G.speed(g)); };
  AR.upgradeTurns = function (s) { return AR.CFG.upgradeTurns + AR.CFG.turnsPerLevel * AR.level(s); };
  AR.upgradeWhy = function (g, civ, s) {
    if (!G.hasBuilding(s, 'airport')) return _('Needs an Airport.');
    if (s.airWork) return _('The new terminal is already being built.');
    if (AR.level(s) + 1 >= AR.CFG.alumAt && supply(g, civ, 'aluminum') < 1) return _('Needs Aluminum for the new jets.');
    if (civ.gold < AR.upgradeCost(g, s)) return _('Not enough Gold.');
    return '';
  };
  AR.upgrade = function (g, civ, s) {
    if (AR.upgradeWhy(g, civ, s)) return false;
    civ.gold -= AR.upgradeCost(g, s); s.airWork = { to: AR.level(s) + 1, done: g.turn + AR.upgradeTurns(s) };
    G.log(g, G.civData(civ).name + ' began enlarging the Airport of ' + s.name + '.', civ.idx);
    return true;
  };
  AR.turn = function (g, civ) {
    AR.airports(g, civ).forEach(function (s) {
      if (s.airWork && g.turn >= s.airWork.done) { s.airLevel = s.airWork.to; s.airWork = null;
        if (civ.isPlayer) G.notify(g, civ, { kind: 'build', text: '✈️ ' + s.name + ': ' + _('the Airport reached level') + ' ' + s.airLevel + ' (' + AR.gates(s) + ' ' + _('routes') + ').', settlement: s.id, tile: s.tile }); }
      civ.gold -= AR.level(s) * AR.CFG.upkeep;
    });
  };
  // Airlift: a land unit that has not moved this turn flies from an Airport to one linked to it. Each Airport launches one flight per level a turn.
  AR.canFlyUnit = function (g, u) { var d = AU.UNITS[u.type]; return !!d && ['naval', 'navalRanged', 'air'].indexOf(d.cls) < 0 && !d.great; };
  AR.flights = function (g, u) {
    var civ = u.civ >= 0 ? g.civs[u.civ] : null, s = G.settlementAt(g, u.tile); if (!civ || !s || s.civ !== civ.idx || !G.hasBuilding(s, 'airport') || !AR.canFlyUnit(g, u)) return [];
    return AR.partners(g, civ, s).filter(function (o) { return !AU.U.tileBlocked(g, u, o.tile, true); });
  };
  AR.flyWhy = function (g, u) {
    var s = G.settlementAt(g, u.tile), def = AU.U.def(g, u);
    if (u.movedTurn === g.turn || u.attackedTurn === g.turn || u.moves < (def.moves || 1)) return _('Only a unit that has not moved this turn can board.');
    if (s && (s.airLifts || {})[g.turn] >= AR.level(s)) return _('No more flights from here this turn.');
    return '';
  };
  AR.fly = function (g, u, sid) {
    var o = g.settlements[sid], s = G.settlementAt(g, u.tile); if (!o || !s || AR.flyWhy(g, u) || AR.flights(g, u).indexOf(o) < 0) return false;
    if (!G.spendOrder(g, u)) return false;
    var n = (s.airLifts && s.airLifts[g.turn]) || 0; s.airLifts = {}; s.airLifts[g.turn] = n + 1;
    G.setUnitTile(g, u, o.tile); u.moves = 0; u.movedTurn = g.turn; u.fortify = 0; u.sleep = false; u.path = null; g.undo = null;
    var civ = g.civs[u.civ]; var to = g.tiles[o.tile]; G.revealAround(g, civ, to.col, to.row, G.sight(g, u)); if (civ.isPlayer) G.refreshVisibility(g, civ);
    return true;
  };

  // ================= Highways =================
  var HW = AU.Hwy = {};
  HW.CFG = { spark: 'g_assemblyroad', building: 'interchange', radius: 3, reach: 10, growth: 0.15, truckGold: 1, joinProd: 2, joinGold: 1, joinCap: 4, upkeep: 2, move: 0.2, replan: 10 };
  HW.unlocked = function (g, civ) { return sparked(g, civ, HW.CFG.spark, 'combustion'); };
  HW.inter = function (s) { return G.hasBuilding(s, HW.CFG.building); };
  HW.interchanges = function (g, civ) { return G.civSettlements(g, civ.idx).filter(HW.inter); };
  function pavable(g, civ, t) { if (G.isWater(t)) return false; if (AU.TERRAIN[t.terrain].impassable && !(t.terrain === 'mountain' && G.civFx(g, civ).mountainRoads)) return false; return t.owner < 0 || G.tileOwnerCiv(g, t) === civ.idx; }
  function pave(g, civ, t) { t.highway = true; t.road = true; civ.hwPaved = (civ.hwPaved || 0) + 1; }
  // the next local tile: next to the highway already laid, worked tiles first, then roads, nearest first
  HW.nextLocal = function (g, civ, s) {
    var c = g.tiles[s.tile], best = null, bs = -1e9;
    s.tiles.forEach(function (i) {
      var t = g.tiles[i]; if (t.highway || !pavable(g, civ, t) || G.dist(t, c) > HW.CFG.radius) return;
      if (!(t.worked || t.road)) return;
      if (!G.neighbors(g, t).some(function (n) { return g.tiles[n].highway; })) return;
      var sc = (t.worked ? 10 : 0) + (t.road ? 3 : 0) - G.dist(t, c) * 2 - i * 1e-6; if (sc > bs) { bs = sc; best = t; }
    });
    return best;
  };
  HW.plan = function (g, civ) {
    var list = HW.interchanges(g, civ), key = list.map(function (s) { return s.id; }).join(',');
    if (civ.hwPlan && civ.hwPlan.key === key && g.turn - civ.hwPlan.turn < HW.CFG.replan) return civ.hwPlan.paths;
    var paths = [];
    for (var i = 0; i < list.length; i++) for (var j = i + 1; j < list.length; j++) {
      var a = g.tiles[list[i].tile], b = g.tiles[list[j].tile]; if (a.continent !== b.continent || G.dist(a, b) > HW.CFG.reach) continue;
      var p = AU.Roads && AU.Roads.roadPath(g, civ, a.i, b.i); if (p) paths.push(p);
    }
    civ.hwPlan = { key: key, turn: g.turn, paths: paths };
    return paths;
  };
  HW.turn = function (g, civ) {
    var list = HW.interchanges(g, civ); if (!list.length) return;
    list.forEach(function (s) { var c = g.tiles[s.tile]; if (!c.highway) pave(g, civ, c); var t = HW.nextLocal(g, civ, s); if (t) pave(g, civ, t); });
    HW.plan(g, civ).forEach(function (path) { // one tile a turn from each end of every interstate
      [path, path.slice().reverse()].forEach(function (p) { for (var k = 0; k < p.length; k++) { var t = g.tiles[p[k]]; if (t.highway) continue; if (!pavable(g, civ, t)) break; pave(g, civ, t); break; } });
    });
    civ.gold -= list.length * HW.CFG.upkeep;
  };
  // which Interchange settlements are joined by highway: flood over paved tiles from each one
  HW.joined = function (g, civ, s) {
    var list = HW.interchanges(g, civ), key = g.turn + ':' + (civ.hwPaved || 0) + ':' + list.map(function (o) { return o.id; }).join(',');
    if (!civ._hw || civ._hw.key !== key) {
      var comp = {}, n = 0;
      list.forEach(function (o) { if (comp[o.tile] != null || !g.tiles[o.tile].highway) return; var q = [o.tile]; comp[o.tile] = n;
        while (q.length) { var i = q.pop(); G.neighbors(g, g.tiles[i]).forEach(function (m) { if (comp[m] == null && g.tiles[m].highway) { comp[m] = n; q.push(m); } }); }
        n++; });
      civ._hw = { key: key, comp: comp };
    }
    var cm = civ._hw.comp, mine = cm[s.tile]; if (mine == null) return [];
    return list.filter(function (o) { return o !== s && cm[o.tile] === mine; });
  };
  HW.yields = function (g, s, civ) {
    var out = { gold: 0, production: 0, trucks: 0, joined: 0 }; if (!civ || !HW.inter(s)) return out;
    s.tiles.forEach(function (i) { var t = g.tiles[i]; if (t.worked && t.highway && i !== s.tile) out.trucks++; });
    out.joined = Math.min(HW.CFG.joinCap, HW.joined(g, civ, s).length);
    out.gold = out.trucks * HW.CFG.truckGold + out.joined * HW.CFG.joinGold; out.production = out.joined * HW.CFG.joinProd;
    return out;
  };
  HW.growthMult = function (g, s) { return HW.inter(s) ? 1 + HW.CFG.growth : 1; };

  // ================= Fuel =================
  var TR = AU.Transport = {};
  TR.FUEL = { perOil: 6, airport: 1, interchange: 2, importGold: 2 };
  TR.fuel = function (g, civ) {
    var need = 0; AR.airports(g, civ).forEach(function (s) { need += AR.level(s) * TR.FUEL.airport; }); need += HW.interchanges(g, civ).length * TR.FUEL.interchange;
    var have = supply(g, civ, 'oil') * TR.FUEL.perOil, short = Math.max(0, need - have);
    return { need: need, have: have, short: short, cost: short * TR.FUEL.importGold };
  };
  TR.turn = function (g, civ) {
    if (!civ.alive || civ.minor) return;
    AR.turn(g, civ); HW.turn(g, civ);
    civ.gold -= TR.fuel(g, civ).cost;
  };
})(globalThis.AU = globalThis.AU || {});
