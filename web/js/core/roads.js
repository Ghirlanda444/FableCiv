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
  function roadPath(g, civ, a, b) {
    var dist = {}, prev = {}, open = [[0, a]], goal = b, own = function (t) { if (t.owner < 0) return true; return G.tileOwnerCiv(g, t) === civ.idx; };
    dist[a] = 0;
    var ta = g.tiles[a], tb = g.tiles[b], limit = G.dist(ta, tb) * 3 + 6, guard = 0;
    while (open.length && guard++ < 4000) {
      var bi = 0; for (var k = 1; k < open.length; k++) if (open[k][0] < open[bi][0]) bi = k;
      var cur = open.splice(bi, 1)[0], ci = cur[1]; if (ci === goal) break; if (cur[0] > dist[ci]) continue;
      var nb = G.neighbors(g, g.tiles[ci]);
      for (var n = 0; n < nb.length; n++) {
        var ni = nb[n], t = g.tiles[ni]; if (G.isWater(t) || AU.TERRAIN[t.terrain].impassable || !own(t)) continue;
        if (G.dist(t, ta) + G.dist(t, tb) > limit) continue;
        var step = t.road ? 0.2 : (t.hills ? 2 : 1) + (t.feature === 'forest' || t.feature === 'jungle' || t.feature === 'marsh' ? 1 : 0) + (t.river ? 0.5 : 0);
        var nd = dist[ci] + step; if (dist[ni] === undefined || nd < dist[ni]) { dist[ni] = nd; prev[ni] = ci; open.push([nd, ni]); }
      }
    }
    if (dist[goal] === undefined) return null;
    var path = [goal]; while (path[0] !== a) path.unshift(prev[path[0]]);
    return path;
  }
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
  RD.count = function (g, civ) { var n = 0; for (var i = 0; i < g.tiles.length; i++) { var t = g.tiles[i]; if (t.road && t.owner >= 0 && G.tileOwnerCiv(g, t) === civ.idx) n++; } return n; };
})(globalThis.AU = globalThis.AU || {});
