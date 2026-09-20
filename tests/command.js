// Command: the per-turn order budget, distance costs, refusal when spent, refunds, AI holding, Warband strikes on one order.
require('./load.js'); const G = AU.G, U = AU.U;
function fresh(v2) { return G.newGame({ playerCiv: 'rome', playerLeader: 'caesar', mapSize: 'small', mapType: 'continents', numCivs: 3, numStates: 0, seed: 7, difficulty: 'prince', v2 }); }
function assert(c, m) { if (!c) throw new Error('FAIL: ' + m); console.log('ok:', m); }
{
  const g = fresh(false); const p = G.player(g);
  const s = U.foundCity(g, G.civUnits(g, p.idx).filter(u => u.type === 'settler')[0]);
  G.resetCommand(g, p);
  assert(G.commandMax(g, p) === 5 + 1 + 3, 'one settlement with a Palace gives 9 Command (' + G.commandMax(g, p) + ')');
  G.addBuilding(g, s, 'barracks'); assert(G.commandMax(g, p) === 10, 'a Barracks adds 1');
  const scout = G.civUnits(g, p.idx).filter(u => u.type === 'scout')[0]; const near = G.neighbors(g, g.tiles[scout.tile]).filter(i => !G.isWater(g.tiles[i]) && !AU.TERRAIN[g.tiles[i].terrain].impassable && !G.unitsAt(g, i).length)[0];
  assert(G.orderCost(g, scout) === 1, 'a unit near home costs 1');
  const before = G.commandLeft(g, p); assert(U.moveTo(g, scout, near), 'the move goes through');
  assert(G.commandLeft(g, p) === before - 1 && scout.orderedTurn === g.turn, 'the first move spends 1 Command');
  const near2 = G.neighbors(g, g.tiles[scout.tile]).filter(i => !G.isWater(g.tiles[i]) && !AU.TERRAIN[g.tiles[i].terrain].impassable && !G.unitsAt(g, i).length)[0];
  if (scout.moves > 0 && near2 != null) { U.moveTo(g, scout, near2); assert(G.commandLeft(g, p) === before - 1, 'a second move of the same unit is free'); }
  // far away costs more
  const far = g.tiles.filter(t => !G.isWater(t) && !AU.TERRAIN[t.terrain].impassable && G.dist(t, g.tiles[s.tile]) === 8 && !G.unitsAt(g, t.i).length)[0];
  const w = G.spawnUnit(g, p.idx, 'warrior', far.i); assert(G.orderCost(g, w) === 2, 'a unit 8 tiles from home costs 2');
  const veryFar = g.tiles.filter(t => !G.isWater(t) && !AU.TERRAIN[t.terrain].impassable && G.dist(t, g.tiles[s.tile]) >= 12 && !G.unitsAt(g, t.i).length)[0];
  if (veryFar) { const w2 = G.spawnUnit(g, p.idx, 'warrior', veryFar.i); assert(G.orderCost(g, w2) === 3, 'a unit 12+ tiles from home costs 3'); }
  // spend it all: the next unit cannot move, but can fortify; undo refunds
  p.command = 1; const w3 = G.spawnUnit(g, p.idx, 'warrior', s.tile); w3.moves = 2; const n3 = G.neighbors(g, g.tiles[s.tile]).filter(i => !G.isWater(g.tiles[i]) && !AU.TERRAIN[g.tiles[i].terrain].impassable && !G.unitsAt(g, i).length)[0];
  assert(U.moveTo(g, w3, n3) && p.command === 0, 'the last order is spent');
  const w4 = G.spawnUnit(g, p.idx, 'warrior', s.tile); w4.moves = 2; const n4 = G.neighbors(g, g.tiles[s.tile]).filter(i => !G.isWater(g.tiles[i]) && !AU.TERRAIN[g.tiles[i].terrain].impassable && !G.unitsAt(g, i).length)[0];
  assert(!U.moveTo(g, w4, n4) && w4.tile === s.tile && !G.canOrder(g, w4) && Object.keys(U.reachableNow(g, w4)).length === 0, 'with no Command left a unit cannot move and shows no reach');
  assert(!U.needsOrders(g, w4), 'it no longer blocks the end of the turn');
  U.fortify(g, w4); assert(w4.fortify > 0, 'it can still fortify');
  G.refundOrder(g, w3); assert(p.command === 1 && w3.orderedTurn !== g.turn, 'an undone move refunds its order');
  // bureaucracy and unrest
  const sets = G.civSettlements(g, p.idx); const base = G.commandMax(g, p);
  for (let i = 0; i < 11; i++) { const t = g.tiles.filter(t => !G.isWater(t) && !AU.TERRAIN[t.terrain].impassable && t.settlement == null && t.owner < 0 && G.dist(t, g.tiles[s.tile]) > 4)[0]; if (t) G.foundSettlement(g, p.idx, t.i); }
  const n = G.civSettlements(g, p.idx).length; assert(G.commandMax(g, p) === base + (n - 1) - Math.floor((n - 8) / 3), 'bureaucracy: ' + n + ' settlements give ' + G.commandMax(g, p));
  G.civSettlements(g, p.idx)[1].unrest = g.turn + 5; assert(G.commandMax(g, p) === base + (n - 1) - Math.floor((n - 8) / 3) - 1, 'a settlement in unrest costs 1');
}
{
  // a Warband strike is one order
  const g = fresh(true); const WB = AU.Warbands; for (const id in Object.assign({}, g.units)) G.removeUnit(g, g.units[id]); g.camps = [];
  const p = G.player(g); g.civs[0].rel[1].war = true; g.civs[1].rel[0].war = true;
  const flat = g.tiles.filter(t => !G.isWater(t) && !t.hills && !t.feature && !AU.TERRAIN[t.terrain].impassable && t.settlement == null);
  const a = flat[0]; const b = g.tiles[G.neighbors(g, a).filter(i => flat.some(f => f.i === i))[0]];
  const w1 = G.spawnUnit(g, 0, 'warrior', a.i), w2 = G.spawnUnit(g, 0, 'warrior', a.i), e = G.spawnUnit(g, 1, 'warrior', b.i); [w1, w2, e].forEach(u => { u.moves = 2; u.attacksLeft = 1; });
  p.command = 3; const cost = G.orderCost(g, w1); const res = U.attack(g, w1, b.i);
  assert(res && res.attackers.length === 2 && p.command === 3 - cost && w2.orderedTurn === g.turn, 'two fighters strike on one order (cost ' + cost + ')');
}
{
  // the AI keeps functioning and holds units when out of Command
  const g = fresh(false); for (let t = 0; t < 40; t++) G.endTurn(g);
  const ai = g.civs.filter(c => !c.isPlayer && !c.minor && c.alive)[0];
  assert(ai && G.commandLeft(g, ai) >= 0 && G.civUnits(g, ai.idx).length > 0, 'AI empires play 40 turns under Command (' + ai.civId + ' has ' + G.commandLeft(g, ai) + ' left, ' + G.civUnits(g, ai.idx).length + ' units)');
}
console.log('command tests OK');
