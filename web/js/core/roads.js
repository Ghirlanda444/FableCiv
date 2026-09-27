// Roads and river crossings.
// An empire links its settlements by road on its own: every turn each link of its road network (a spanning tree over its settlements
// on one continent, links up to 10 tiles long) gains one more road tile, two from the Turret Age on. Roads never cross foreign land.
// A road over a river is a bridge. Rivers slow armies down: entering a navigable river tile without a bridge ends the move, entering a
// minor river tile costs 1 more movement, and a unit attacking out of an unbridged navigable river fights at -25%.
(function (AU) {
  var G = AU.G;
  var RD = AU.Roads = {};
  RD.MAX_LINK = 10; RD.REPLAN = 10;
  RD.bridged = function (g, t) { return !!(t.road || G.settlementAt(g, t.i)); };
  // Is this tile a river the unit has to wade? (navigable: stops the move; minor: +1 movement)
  RD.crossing = function (g, u, to, from) {
    if (!to.river || RD.bridged(g, to)) return 0;
    if (from && from.river) return 0; // walking along the river valley is not crossing it
    var civ = u.civ >= 0 ? g.civs[u.civ] : null, fx = civ ? G.civFx(g, civ) : {};
    if (fx.riverCrossing) return 0;
    return to.navigable ? 2 : 1;
  };
  // A unit standing in an unbridged navigable river fights at a disadvantage when it attacks out of it.
  RD.wading = function (g, u) { var t = g.tiles[u.tile]; if (!t || !t.navigable || RD.bridged(g, t)) return false; var civ = u.civ >= 0 ? g.civs[u.civ] : null; return !(civ && G.civFx(g, civ).riverCrossing); };
  // cheapest land path between two tiles for a road, through own or unowned land only
  function roadPath(g, civ, a, b, rail) {
    var andes = !!G.civFx(g, civ).mountainRoads; // the Inca lay roads through mountains and over hills at plains cost
    var dist = {}, prev = {}, open = [[0, a]], goal = b, own = function (t) { if (t.owner < 0) return true; return G.tileOwnerCiv(g, t) === civ.idx; };
    dist[a] = 0;
    var ta = g.tiles[a], tb = g.tiles[b], limit = G.dist(ta, tb) * 3 + 6, guard = 0;
    while (open.length && guard++ < 4000) {
      var bi = 0; for (var k = 1; k < open.length; k++) if (open[k][0] < open[bi][0]) bi = k;
      var cur = open.splice(bi, 1)[0], ci = cur[1]; if (ci === goal) break; if (cur[0] > dist[ci]) continue;
      var nb = G.neighbors(g, g.tiles[ci]);
      for (var n = 0; n < nb.length; n++) {
        var ni = nb[n], t = g.tiles[ni]; if (G.isWater(t) || (AU.TERRAIN[t.terrain].impassable && !(andes && t.terrain === 'mountain')) || !own(t)) continue;
        if (G.dist(t, ta) + G.dist(t, tb) > limit) continue;
        var step = rail && t.rail ? 0.1 : t.road ? 0.2 : (t.hills && !andes ? 2 : 1) + (andes && t.terrain === 'mountain' ? 0.5 : 0) + (t.feature === 'forest' || t.feature === 'jungle' || t.feature === 'marsh' ? 1 : 0) + (t.river ? 0.5 : 0);
        var nd = dist[ci] + step; if (dist[ni] === undefined || nd < dist[ni]) { dist[ni] = nd; prev[ni] = ci; open.push([nd, ni]); }
      }
    }
    if (dist[goal] === undefined) return null;
    var path = [goal]; while (path[0] !== a) path.unshift(prev[path[0]]);
    return path;
  }
  RD.roadPath = roadPath;
  // links: each settlement joins the nearest settlement already in the network (the capital first), same continent, up to MAX_LINK tiles
  RD.links = function (g, civ) {
    var sets = G.civSettlements(g, civ.idx); if (sets.length < 2) return [];
    var cap = civ.capital && g.settlements[civ.capital], inNet = [cap || sets[0]], rest = sets.filter(function (s) { return s !== inNet[0]; }), out = [];
    while (rest.length) {
      var best = null, bd = 1e9, bi = -1;
      rest.forEach(function (s, i) { inNet.forEach(function (o) { var t1 = g.tiles[s.tile], t2 = g.tiles[o.tile]; if (t1.continent !== t2.continent) return; var d = G.dist(t1, t2); if (d < bd) { bd = d; best = [o, s]; bi = i; } }); });
      if (!best || bd > RD.MAX_LINK) break;
      out.push(best); inNet.push(best[1]); rest.splice(bi, 1);
    }
    return out;
  };
  RD.turn = function (g, civ) {
    if (!civ.alive || civ.minor) return;
    RD.railTurn(g, civ);
    var sets = G.civSettlements(g, civ.idx);
    sets.forEach(function (s) { g.tiles[s.tile].road = true; });
    if (sets.length < 2) return;
    civ.roadPlan = civ.roadPlan || { turn: -99, paths: [] };
    if (g.turn - civ.roadPlan.turn >= RD.REPLAN || civ.roadPlan.n !== sets.length) {
      civ.roadPlan = { turn: g.turn, n: sets.length, paths: RD.links(g, civ).map(function (l) { return roadPath(g, civ, l[0].tile, l[1].tile); }).filter(Boolean) };
    }
    var era = g.v2 && AU.MasteryWeb ? AU.MasteryWeb.state(civ).era : (civ.era || 0), rate = (era >= 2 ? 2 : 1) + (G.civFx(g, civ).royalRoad ? 1 : 0); // Darius builds the Royal Road
    civ.roadPlan.paths.forEach(function (path) {
      var laid = 0;
      for (var k = 0; k < path.length && laid < rate; k++) { var t = g.tiles[path[k]]; if (t.road) continue; if (t.owner >= 0 && G.tileOwnerCiv(g, t) !== civ.idx) break; t.road = true; laid++; }
    });
  };
  // ---------- railways ----------
  // A railway is a national investment the ruler decides, never automatic: pick two of your settlements (same continent, up to 12
  // tiles apart) and the crews lay the line tile by tile. Every tile costs Gold (paid up front) and turns: flat land 2 turns and 50
  // Gold, hills, woods and marsh 3 turns and 75, a river bridge 1 more turn and 50 more. Both ends lose 20% Production while the
  // crews work, every line holds 1 Iron for good, the trains burn Coal (1 Coal for every 3 lines; lines beyond it stand idle) and
  // every line costs 2 Gold a turn. Lines share track, so a network grows over time and a new line only pays for new tiles.
  // A running line pays back: Gold from the trade between its ends, +15% Production at each end (at most +30%), trains that cross
  // the empire in a turn. The benefits never fade: later, Airports and the Interstate System simply add transport of their own.
  RD.SMOKE_LABEL = 'trains'; // _('trains'): the Smoke source name, see SM.NAMES
  RD.RAIL = { goldPerTile: 50, turnsPerTile: 2, maxDist: 12, drain: 20, upkeep: 2, linesPerCoal: 3, prodPct: 15, prodCap: 30, baseGold: 2, popPerGold: 4, smoke: 0.5, spark: 'p_ironrail' };
  RD.railUnlocked = function (g, civ) { return g.v2 && AU.MasteryWeb ? !!AU.MasteryWeb.state(civ).unlocked[RD.RAIL.spark] : !!(civ.techs && civ.techs.railroad); };
  RD.lines = function (civ) { return civ.rails || (civ.rails = []); };
  RD.lineKey = function (a, b) { return Math.min(a, b) + '-' + Math.max(a, b); };
  RD.ironFree = function (g, civ) { var SO = AU.Society; if (!SO) return 0; return SO.resourceSupply(g, civ, 'iron') - SO.resourceUse(g, civ, 'iron'); };
  RD.coal = function (g, civ) { return AU.Society ? AU.Society.resourceSupply(g, civ, 'coal') : 0; };
  RD.rough = function (t) { return !!(t.hills || t.terrain === 'mountain' || t.feature === 'forest' || t.feature === 'jungle' || t.feature === 'marsh'); };
  RD.tileTurns = function (t) { return t.rail ? 0 : RD.RAIL.turnsPerTile + (RD.rough(t) ? 1 : 0) + (t.river ? 1 : 0); };
  RD.tileGold = function (g, t) { return t.rail ? 0 : Math.round((RD.RAIL.goldPerTile * (RD.rough(t) ? 1.5 : 1) + (t.river ? 50 : 0)) * G.speed(g)); };
  // is this line whole: both ends still yours
  RD.lineIntact = function (g, civ, L) { var a = g.settlements[L.a], b = g.settlements[L.b]; return !!(a && b && a.civ === civ.idx && b.civ === civ.idx); };
  // finished lines that have Coal to run, first come first served
  RD.running = function (g, civ) { var cap = RD.coal(g, civ) * RD.RAIL.linesPerCoal; return RD.lines(civ).filter(function (L) { return L.done && RD.lineIntact(g, civ, L); }).slice(0, cap); };
  // the lines a settlement could start: any other settlement of yours on its continent within reach, by the cheapest land route
  RD.railOptions = function (g, civ, s) {
    var out = [], have = {}, t0 = g.tiles[s.tile]; RD.lines(civ).forEach(function (L) { have[RD.lineKey(L.a, L.b)] = 1; });
    G.civSettlements(g, civ.idx).forEach(function (o) {
      if (o === s || have[RD.lineKey(s.id, o.id)]) return; var t1 = g.tiles[o.tile]; if (t1.continent !== t0.continent || G.dist(t0, t1) > RD.RAIL.maxDist) return;
      var path = roadPath(g, civ, s.tile, o.tile, true); if (!path) return;
      var cost = 0, turns = 0; path.forEach(function (i) { var t = g.tiles[i]; cost += RD.tileGold(g, t); turns += RD.tileTurns(t); });
      out.push({ other: o, path: path, cost: cost, turns: turns, fresh: path.filter(function (i) { return !g.tiles[i].rail; }).length });
    });
    return out.sort(function (a, b) { return a.cost - b.cost; });
  };
  RD.railWhy = function (g, civ, s, opt) {
    if (!RD.railUnlocked(g, civ)) return _('Needs the Iron Rail Spark.');
    if (!G.hasBuilding(s, 'railway_station') && !G.hasBuilding(opt.other, 'railway_station')) return _('Needs a Railway Station at one end.');
    if (RD.lines(civ).some(function (L) { return !L.done && RD.lineIntact(g, civ, L) && (L.a === s.id || L.b === s.id || L.a === opt.other.id || L.b === opt.other.id); })) return _('A line is already being built here.');
    if (RD.ironFree(g, civ) < 1) return _('Needs 1 free Iron.');
    if (RD.coal(g, civ) < 1) return _('Needs Coal to run the trains.');
    if (civ.gold < opt.cost) return _('Not enough Gold.');
    return '';
  };
  RD.startRail = function (g, civ, s, otherId) {
    var opt = RD.railOptions(g, civ, s).filter(function (o) { return o.other.id === otherId; })[0]; if (!opt || RD.railWhy(g, civ, s, opt)) return null;
    civ.gold -= opt.cost;
    var L = { a: s.id, b: opt.other.id, path: opt.path, laid: 0, next: g.turn, done: false, started: g.turn, cost: opt.cost, turns: opt.turns };
    RD.lines(civ).push(L);
    G.log(g, G.civData(civ).name + ' began a railway from ' + s.name + ' to ' + opt.other.name + '.', civ.idx);
    return L;
  };
  RD.lineProgress = function (g, L) { var laid = 0; L.path.forEach(function (i) { if (g.tiles[i].rail) laid++; }); return { laid: laid, total: L.path.length }; };
  RD.railTurn = function (g, civ) {
    var lines = RD.lines(civ); if (!lines.length) return;
    lines.forEach(function (L) {
      if (L.done || !RD.lineIntact(g, civ, L)) return;
      while (L.laid < L.path.length && g.tiles[L.path[L.laid]].rail) L.laid++; // track another line already laid
      if (L.laid < L.path.length && g.turn >= L.next) {
        var t = g.tiles[L.path[L.laid]];
        if (L.working === t.i) { t.rail = true; L.laid++; L.working = null; } // this tile's turns are over: the track is down
        else { L.working = t.i; L.next = g.turn + RD.tileTurns(t) - 1; if (RD.tileTurns(t) <= 1) { t.rail = true; L.laid++; L.working = null; } }
      }
      while (L.laid < L.path.length && g.tiles[L.path[L.laid]].rail) L.laid++;
      if (L.laid >= L.path.length) { L.done = true; L.doneTurn = g.turn; var a = g.settlements[L.a], b = g.settlements[L.b];
        if (civ.isPlayer) G.notify(g, civ, { kind: 'build', text: '🚂 ' + _('The railway is open') + ': ' + a.name + ' — ' + b.name + '.', settlement: a.id, tile: a.tile });
        G.log(g, G.civData(civ).name + ' opened the railway ' + a.name + ' — ' + b.name + '.', civ.idx); }
    });
    civ.gold -= lines.filter(function (L) { return RD.lineIntact(g, civ, L); }).length * RD.RAIL.upkeep;
  };
  // what the railways give (or take from) one settlement: Gold, a Production percentage, Smoke
  RD.railYields = function (g, s, civ) {
    var out = { gold: 0, pct: 0, smoke: 0, running: 0, building: 0 }; if (!civ || !civ.rails || !civ.rails.length) return out;
    var run = RD.running(g, civ), bonus = 0;
    run.forEach(function (L) { if (L.a !== s.id && L.b !== s.id) return; var other = g.settlements[L.a === s.id ? L.b : L.a]; out.gold += RD.RAIL.baseGold + Math.floor(other.pop / RD.RAIL.popPerGold); bonus += RD.RAIL.prodPct; out.smoke += RD.RAIL.smoke; out.running++; });
    civ.rails.forEach(function (L) { if (!L.done && RD.lineIntact(g, civ, L) && (L.a === s.id || L.b === s.id)) { out.pct -= RD.RAIL.drain; out.building++; } });
    out.pct += Math.min(RD.RAIL.prodCap, bonus);
    return out;
  };
  RD.count = function (g, civ) { var n = 0; for (var i = 0; i < g.tiles.length; i++) { var t = g.tiles[i]; if (t.road && t.owner >= 0 && G.tileOwnerCiv(g, t) === civ.idx) n++; } return n; };
})(globalThis.AU = globalThis.AU || {});
