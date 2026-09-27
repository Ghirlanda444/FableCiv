// Roads link an empire's settlements; rivers slow armies unless bridged by a road; attacking out of a river is weaker.
const AU = require('./load.js'); const G = AU.G, U = AU.U, RD = AU.Roads;
let fails = 0; function ok(c, m) { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok', m); }
const g = G.newGame({ playerCiv: 'rome', playerLeader: 'caesar', mapSize: 'small', numCivs: 3, numStates: 1, seed: 33, difficulty: 'prince', v2: true });
const p = G.player(g); const set = G.civUnits(g, p.idx).find(u => u.type === 'settler'); U.foundCity(g, set);
const cap = g.settlements[p.capital], ct = g.tiles[cap.tile];
// a second settlement 5-7 tiles away on the same continent
const far = g.tiles.map((t, i) => i).find(i => G.canFoundAt(g, p.idx, i) && G.dist(g.tiles[i], ct) >= 5 && G.dist(g.tiles[i], ct) <= 7 && g.tiles[i].continent === ct.continent);
const s2 = G.foundSettlement(g, p.idx, far);
ok(RD.links(g, p).length === 1, 'two settlements make one road link');
for (let t = 0; t < 12; t++) RD.turn(g, p);
const path = p.roadPlan.paths[0]; ok(path && path.every(i => g.tiles[i].road), 'after 12 turns the link is a full road (' + (path ? path.length : 0) + ' tiles)');
ok(RD.count(g, p) >= 2, 'road tiles counted in the empire (' + RD.count(g, p) + ')');
// movement: road to road costs half a move
const w = G.civUnits(g, p.idx).find(u => G.isMilitary(u) && AU.UNITS[u.type].cls !== 'recon');
const a = g.tiles[path[1]], b = g.tiles[path[2]];
if (a && b && !a.river && !b.river) ok(U.enterCost(g, w, b, a) === 0.5, 'road to road costs half a move');
// river crossing: find a navigable river tile with a land neighbour that is not a river
const nav = g.tiles.find(t => t.navigable && !G.settlementAt(g, t.i) && G.neighbors(g, t).some(n => !g.tiles[n].river && !G.isWater(g.tiles[n]) && !AU.TERRAIN[g.tiles[n].terrain].impassable));
if (nav) {
  const bank = g.tiles[G.neighbors(g, nav).find(n => !g.tiles[n].river && !G.isWater(g.tiles[n]) && !AU.TERRAIN[g.tiles[n].terrain].impassable)];
  const u = { civ: p.idx, type: 'warrior', tile: bank.i, hp: 100, bonusStr: 0, promos: [] }; nav.owner = -1; bank.owner = -1;
  ok(U.enterCost(g, u, nav, bank) === 99, 'wading into a navigable river ends the move');
  nav.road = true; ok(U.enterCost(g, u, nav, bank) < 99, 'a road over the river is a bridge'); nav.road = false;
  const ab = G.civData(p).ability; ab.fx.riverCrossing = true; p._fx = null; p._fxKey = null; ok(U.enterCost(g, u, nav, bank) < 99, 'riverCrossing ignores the penalty'); delete ab.fx.riverCrossing; p._fx = null; p._fxKey = null;
  const minor = g.tiles.find(t => t.river && !t.navigable && !G.settlementAt(g, t.i) && !t.hills && !t.feature && G.neighbors(g, t).some(n => { const x = g.tiles[n]; return !x.river && !x.hills && !x.feature && !G.isWater(x) && !AU.TERRAIN[x.terrain].impassable; }));
  if (minor) { const mb = g.tiles[G.neighbors(g, minor).find(n => { const x = g.tiles[n]; return !x.river && !x.hills && !x.feature && !G.isWater(x) && !AU.TERRAIN[x.terrain].impassable; })]; minor.owner = -1; ok(U.enterCost(g, u, minor, mb) === 2, 'a stream costs 1 more movement'); }
  // wading attack
  G.setUnitTile(g, w, nav.i); const inRiver = U.strength(g, w, { attacking: true }); nav.road = true; const bridged = U.strength(g, w, { attacking: true }); nav.road = false;
  ok(inRiver < bridged, 'attacking out of an unbridged river is weaker (' + inRiver + ' vs ' + bridged + ')');
} else console.log('skip: no navigable river on this map');
// a whole game: roads appear and the AI still plays
const g2 = G.newGame({ playerCiv: 'egypt', mapSize: 'small', numCivs: 4, numStates: 2, seed: 7, difficulty: 'prince', v2: true }); const p2 = G.player(g2); p2.isPlayer = false; p2.ai = Object.assign({}, AU.LEADER_BY_ID[p2.leaderId].ai);
for (let t = 0; t < 80; t++) G.endTurn(g2);
const roads = g2.tiles.filter(t => t.road).length; ok(roads > 10, 'AI empires build roads in 80 turns (' + roads + ' road tiles)');
console.log(fails ? fails + ' FAILED' : 'roads OK'); process.exit(fails ? 1 : 0);
