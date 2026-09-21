// Smoke (Divergence): industry pollutes, sinks clean, happiness and food react, classic games ignore it.
require('./load.js'); const G = AU.G, U = AU.U, SM = AU.Smoke;
function fresh(v2) { return G.newGame({ playerCiv: 'rome', playerLeader: 'caesar', mapSize: 'small', mapType: 'continents', numCivs: 3, numStates: 0, seed: 7, difficulty: 'prince', v2 }); }
function assert(c, m) { if (!c) throw new Error('FAIL: ' + m); console.log('ok:', m); }
{
  const g = fresh(true); const p = G.player(g); const s = U.foundCity(g, G.civUnits(g, p.idx).filter(u => u.type === 'settler')[0]);
  const h0 = G.settlementYields(g, s).happiness, f0 = G.settlementYields(g, s).food;
  assert(SM.smoke(g, s) === 0 || SM.smoke(g, s) < 3, 'a fresh capital makes little Smoke (' + SM.smoke(g, s) + ')');
  G.addBuilding(g, s, 'factory'); G.addBuilding(g, s, 'power_plant'); g.fxGen = (g.fxGen || 0) + 1;
  const sm = SM.smoke(g, s); assert(sm >= 7, 'a Factory and a Power Plant make heavy Smoke (' + sm + ')');
  const y = G.settlementYields(g, s);
  assert(y.happiness === h0 + SM.happiness(sm), 'Smoke costs Happiness (' + h0 + ' → ' + y.happiness + ')');
  assert(SM.heavy(sm), 'heavy Smoke flag');
  G.addBuilding(g, s, 'sewer'); G.addBuilding(g, s, 'national_park'); g.fxGen++;
  const sm2 = SM.smoke(g, s); assert(sm2 <= sm - 5, 'a Sewer and a Park soak up 5 Smoke (' + sm + ' → ' + sm2 + ')');
  AU.MasteryWeb.state(p).unlocked.p_greenbelt = 1; p._fx = null; g.fxGen++;
  const d = SM.detail(g, s); const woods = d.sink.filter(x => x[0] === 'woods')[0];
  assert(!woods || woods[1] === 2 * 0.5 * s.tiles.filter(i => i !== s.tile && (g.tiles[i].feature === 'forest' || g.tiles[i].feature === 'jungle')).length, 'Green Belt doubles what woods soak up');
  p.ai = Object.assign({}, AU.LEADER_BY_ID[p.leaderId].ai); const score = AU.AI.buildingScore(g, p, s, 'sewer'); s.buildings = s.buildings.filter(b => b !== 'sewer'); g.fxGen++; const score2 = AU.AI.buildingScore(g, p, s, 'sewer');
  assert(score2 >= score, 'the AI rates a Sewer higher when the town is smoky');
  assert(SM.total(g, p) === SM.smoke(g, s) && SM.world(g) >= SM.total(g, p), 'empire and world totals');
}
{
  const gc = fresh(false); const pc = G.player(gc); const sc = U.foundCity(gc, G.civUnits(gc, pc.idx).filter(u => u.type === 'settler')[0]);
  const h = G.settlementYields(gc, sc).happiness; G.addBuilding(gc, sc, 'factory'); G.addBuilding(gc, sc, 'power_plant'); gc.fxGen = (gc.fxGen || 0) + 1;
  assert(G.settlementYields(gc, sc).happiness === h && SM.smoke(gc, sc) === 0, 'classic games have no Smoke');
}
console.log('smoke tests OK');
