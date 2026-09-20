// Warbands (Divergence rules): stacking, one combined exchange, weakest dies first, Commander bonus, zone of control.
require('./load.js'); const G = AU.G, U = AU.U, WB = AU.Warbands;
function fresh(v2) { return G.newGame({ playerCiv: 'rome', playerLeader: 'caesar', mapSize: 'small', mapType: 'continents', numCivs: 3, numStates: 0, seed: 7, difficulty: 'prince', v2: v2 }); }
function clear(g) { for (const id in Object.assign({}, g.units)) G.removeUnit(g, g.units[id]); g.camps = []; }
// three flat, unowned land tiles in a line: a touches b, b touches c, a and c are two apart
function flatPair(g) {
  const flat = t => !G.isWater(t) && !t.hills && !t.feature && !AU.TERRAIN[t.terrain].impassable && t.settlement == null && t.owner < 0;
  for (const t of g.tiles) {
    if (!flat(t)) continue;
    for (const bi of G.neighbors(g, t)) { const b = g.tiles[bi]; if (!flat(b)) continue;
      for (const ci of G.neighbors(g, b)) { const c = g.tiles[ci]; if (flat(c) && G.dist(t, c) === 2) return [t.i, b.i, c.i]; } }
  }
  throw new Error('no flat line');
}
function assert(c, m) { if (!c) throw new Error('FAIL: ' + m); console.log('ok:', m); }

// ---- classic: one unit per tile still holds
{
  const g = fresh(false); clear(g); const [a, b] = flatPair(g);
  const w1 = G.spawnUnit(g, 0, 'warrior', a), w2 = G.spawnUnit(g, 0, 'warrior', b);
  assert(U.tileBlocked(g, w2, a, true), 'classic: a second Militia may not end on a friendly Militia');
}

// ---- v2: stack up to three fighters plus one Commander
{
  const g = fresh(true); clear(g); const [a, b, c] = flatPair(g);
  const w1 = G.spawnUnit(g, 0, 'warrior', a), w2 = G.spawnUnit(g, 0, 'warrior', a), w3 = G.spawnUnit(g, 0, 'warrior', a);
  const w4 = G.spawnUnit(g, 0, 'warrior', b), cmd = G.spawnUnit(g, 0, 'commander', b), cmd2 = G.spawnUnit(g, 0, 'commander', c);
  assert(!U.tileBlocked(g, w4, c, true), 'v2: a Militia may join an empty tile');
  assert(U.tileBlocked(g, w4, a, true), 'v2: a fourth fighter may not join a full Warband');
  assert(!U.tileBlocked(g, cmd, a, true), 'v2: a Commander may join a full Warband');
  assert(U.tileBlocked(g, cmd2, b, true), 'v2: a second Commander may not join');
  assert(WB.fighters(g, a, 0).length === 3 && WB.members(g, b, 0).length === 2, 'fighters exclude the Commander, members include it');
  assert(!U.canAttackTile(g, cmd, a), 'a Commander never attacks');
}

// ---- v2: combined strength, weakest dies first, Commander bonus
{
  const g = fresh(true); clear(g); const [a, b] = flatPair(g);
  // Rome (0) at war with civ 1
  g.civs[0].rel[1].war = true; g.civs[1].rel[0].war = true;
  const w1 = G.spawnUnit(g, 0, 'warrior', a), w2 = G.spawnUnit(g, 0, 'warrior', a), w3 = G.spawnUnit(g, 0, 'warrior', a);
  const e1 = G.spawnUnit(g, 1, 'warrior', b), e2 = G.spawnUnit(g, 1, 'slinger', b); e2.hp = 30;
  [w1, w2, w3, e1, e2].forEach(u => { u.moves = 2; u.attacksLeft = 1; });
  const single = U.strength(g, w1, { attacking: true, vs: e1 });
  const pv = WB.preview(g, w1, b);
  assert(pv.attackers === 3 && pv.a > single, 'three Militia strike as one with more strength than one (' + pv.a + ' vs ' + single + ')');
  assert(pv.defenders === 2, 'the defending Warband counts both fighters');
  const res = U.attack(g, w1, b);
  assert(res && res.warband && res.attackers.length === 3, 'the attack is a Warband exchange');
  assert(!g.units[e2.id] && g.units[e1.id], 'the wounded Rock Chucker (weakest) died first, the Militia lives');
  assert(w1.moves === 0 && w2.moves === 0 && w3.moves === 0, 'every attacker spent its attack');
  assert(g.units[e1.id].hp < 100, 'spill-over damage reached the next weakest');
  // Commander multiplies the group
  const g2 = fresh(true); clear(g2); const [a2, b2] = flatPair(g2);
  g2.civs[0].rel[1].war = true; g2.civs[1].rel[0].war = true;
  const x1 = G.spawnUnit(g2, 0, 'warrior', a2), x2 = G.spawnUnit(g2, 0, 'warrior', a2), y1 = G.spawnUnit(g2, 1, 'warrior', b2);
  [x1, x2, y1].forEach(u => { u.moves = 2; u.attacksLeft = 1; });
  const before = WB.preview(g2, x1, b2).a;
  const cmd = G.spawnUnit(g2, 0, 'commander', a2);
  const after = WB.preview(g2, x1, b2).a;
  assert(after > before && Math.abs(after - Math.round(before * 1.15)) <= 1, 'a Commander adds 15% (' + before + ' → ' + after + ')');
  x1.moves = 0; x2.moves = 0; U.newTurn(g2, x1); U.newTurn(g2, x2); U.newTurn(g2, cmd);
  assert(x1.moves === G.maxMoves(g2, 0, 'warrior', x1) + 1 && cmd.moves === G.maxMoves(g2, 0, 'commander', cmd), 'fighters with a Commander get +1 move, the Commander itself does not');
}

// ---- v2: zone of control stops a move next to an enemy Warband
{
  const g = fresh(true); clear(g); const [a, b, c] = flatPair(g);
  g.civs[0].rel[1].war = true; g.civs[1].rel[0].war = true;
  const w = G.spawnUnit(g, 0, 'warrior', a), e = G.spawnUnit(g, 1, 'warrior', c);
  w.moves = 2;
  // b is adjacent to both a and c
  assert(G.dist(g.tiles[b], g.tiles[c]) === 1, 'test tiles: b touches c');
  assert(WB.zocAt(g, 0, b), 'b lies in the enemy zone of control');
  assert(U.moveTo(g, w, b), 'the Militia can step into the zone');
  assert(w.moves === 0 && w.zocStopped === g.turn, 'stepping next to an enemy ends the move');
  const reach = U.reachableNow(g, G.spawnUnit(g, 0, 'warrior', a, { moves: 2 }));
  // every tile two steps away must be reachable through a first step that is outside the zone
  const ta = g.tiles[a];
  const throughZone = Object.keys(reach).filter(i => G.dist(ta, g.tiles[+i]) === 2).some(i => !G.neighbors(g, g.tiles[+i]).some(y => G.dist(ta, g.tiles[y]) === 1 && reach[y] && !WB.zocAt(g, 0, y)));
  assert(reach[b] && !throughZone, 'reachable tiles do not pass through the zone this turn');
  const s = G.spawnUnit(g, 0, 'scout', a, { moves: 3 });
  assert(U.moveTo(g, s, b) && s.moves > 0, 'a Pathfinder ignores zones of control');
  // a classic game has no zone of control
  const gc = fresh(false); clear(gc); const [ac, bc, cc] = flatPair(gc);
  gc.civs[0].rel[1].war = true; gc.civs[1].rel[0].war = true;
  const wc = G.spawnUnit(gc, 0, 'warrior', ac); G.spawnUnit(gc, 1, 'warrior', cc); wc.moves = 2;
  assert(U.moveTo(gc, wc, bc) && wc.moves === 1, 'classic: no zone of control');
}

// ---- v2: a Scarecrow Crew springs its ambush
{
  const g = fresh(true); clear(g); const [a, b, c] = flatPair(g);
  g.civs[0].rel[1].war = true; g.civs[1].rel[0].war = true;
  const crew = G.spawnUnit(g, 0, 'scarecrow', b), e1 = G.spawnUnit(g, 1, 'warrior', c), e2 = G.spawnUnit(g, 1, 'slinger', c);
  [e1, e2].forEach(u => { u.moves = 2; u.attacksLeft = 1; });
  assert(!U.canAttackTile(g, crew, c), 'a Scarecrow Crew never attacks');
  const pv = WB.preview(g, e1, b);
  assert(pv.defenders === 3 && pv.d >= 30, 'to the enemy the crew looks like a full Warband (' + pv.d + ')');
  const before = U.strength(g, e1, { attacking: true });
  const res = U.attack(g, e1, b);
  assert(res && res.baited && res.attackers.length === 1, 'attacking the crew springs the bait (melee only joins the melee strike)');
  assert(!g.units[crew.id], 'the crew is spent');
  assert(e1.moves === 0 && e1.attacksLeft === 0, 'the attacker loses the rest of its turn');
  assert(WB.baited(g, e1) && WB.baited(g, e1).until === g.turn + 10 && U.strength(g, e1, { attacking: true }) === before - 4, 'level 1 bait: -4 Strength for 10 turns (' + before + ' → ' + U.strength(g, e1, { attacking: true }) + ')');
  g.turn += 10; assert(!WB.baited(g, e1) && U.strength(g, e1, { attacking: true }) === before, 'the penalty wears off');
  // a Bait Spark raises the level
  const g2 = fresh(true); clear(g2); const [a2, b2, c2] = flatPair(g2);
  g2.civs[0].rel[1].war = true; g2.civs[1].rel[0].war = true;
  AU.MasteryWeb.state(g2.civs[0]).unlocked.t_tannery = 1; g2.civs[0]._fx = null;
  assert(WB.baitLevel(g2, g2.civs[0]) === 2, 'a Bait Spark makes level 2');
  const crew2 = G.spawnUnit(g2, 0, 'scarecrow', b2), w = G.spawnUnit(g2, 1, 'warrior', c2), w2 = G.spawnUnit(g2, 1, 'warrior', c2); [w, w2].forEach(u => { u.moves = 2; u.attacksLeft = 1; });
  const r2 = U.attack(g2, w, b2);
  assert(r2.baited && r2.attackers.length === 2 && WB.baited(g2, w).str === 6 && WB.baited(g2, w2).until === g2.turn + 15, 'level 2: both attackers shaken, -6 for 15 turns');
  // with real fighters on the tile the crew is not the target
  const g3 = fresh(true); clear(g3); const [a3, b3, c3] = flatPair(g3);
  g3.civs[0].rel[1].war = true; g3.civs[1].rel[0].war = true;
  G.spawnUnit(g3, 0, 'scarecrow', b3); const real = G.spawnUnit(g3, 0, 'warrior', b3); const att = G.spawnUnit(g3, 1, 'warrior', c3); att.moves = 2; att.attacksLeft = 1;
  assert(U.targetAt(g3, att, b3).unit.id === real.id, 'a real fighter on the tile is the target, not the crew');
}

// ---- v2: Uprooters join a settlement; classic games cannot build v2 units
{
  const g = fresh(true); const p = G.player(g);
  const settler = G.civUnits(g, p.idx).filter(u => u.type === 'settler')[0];
  const s = U.foundCity(g, settler);
  const m = G.spawnUnit(g, p.idx, 'migrant', s.tile); m.moves = 2;
  const pop = s.pop; assert(WB.join(g, m) && s.pop === pop + 1 && !g.units[m.id], 'Uprooters join for +1 population');
  const gc = fresh(false); const pc = G.player(gc); const sc = U.foundCity(gc, G.civUnits(gc, pc.idx).filter(u => u.type === 'settler')[0]);
  assert(!G.canBuildUnit(gc, sc, 'commander') && !G.canBuildUnit(gc, sc, 'migrant') && !G.canBuildUnit(gc, sc, 'scarecrow'), 'classic games never offer Bandleader, Uprooters or Scarecrow Crew');
}

// ---- v2: a 60-turn AI game with wars stays consistent
{
  const g = fresh(true); const p = G.player(g); p.isPlayer = false; p.ai = Object.assign({}, AU.LEADER_BY_ID[p.leaderId].ai, { aggression: 1 });
  g.civs.forEach(c => { if (!c.minor && c.ai) c.ai.aggression = 1; });
  for (let t = 0; t < 60; t++) G.endTurn(g);
  let over = 0, stacks = 0; const seen = {};
  for (const id in g.units) { const u = g.units[id]; if (u.civ < 0 || !G.isMilitary(u)) continue; const k = u.tile + '|' + u.civ; if (seen[k]) continue; seen[k] = 1; const n = WB.fighters(g, u.tile, u.civ).length; if (n > 3) over++; if (n > 1) stacks++; }
  assert(over === 0, 'no tile ever holds more than three fighters of one side (Warbands seen: ' + stacks + ')');
  const json = JSON.stringify(g); assert(json.length > 1000, 'the game still serialises');
}
console.log('warbands tests OK');
