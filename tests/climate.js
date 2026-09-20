// Climate (Divergence): scripted warmth by age, Smoke-driven later, small bordered shifts with a warning, classic untouched.
require('./load.js'); const G = AU.G, CL = AU.Climate;
function fresh(v2) { return G.newGame({ playerCiv: 'rome', playerLeader: 'caesar', mapSize: 'small', mapType: 'continents', numCivs: 3, numStates: 0, seed: 7, difficulty: 'prince', v2 }); }
function assert(c, m) { if (!c) throw new Error('FAIL: ' + m); console.log('ok:', m); }
function counts(g) { const c = {}; g.tiles.forEach(t => { c[t.terrain] = (c[t.terrain] || 0) + 1; }); return c; }
{
  const g = fresh(true); const before = counts(g), landN = g.tiles.filter(t => !AU.TERRAIN[t.terrain].water && t.terrain !== 'mountain').length;
  assert(CL.target(g) === 0, 'the Pebble Age is mild');
  g.civs.forEach(c => { if (!c.minor) c.era = 2; }); // the Turret Age: warm
  assert(CL.target(g) === 1, 'the Turret Age is warm');
  CL.turn(g); const st = CL.state(g);
  assert(st.pending && st.pending.at === g.turn + 5 && st.pending.tiles.length > 0 && st.pending.tiles.length <= Math.max(4, Math.round(landN * 0.03)), 'a warming is announced five turns ahead for at most 3% of the land (' + st.pending.tiles.length + ' tiles)');
  assert(st.pending.tiles.every(p => ['grassland', 'plains', 'tundra'].indexOf(p.to) >= 0 && g.tiles[p.i].settlement == null), 'warming only thaws tundra and snow, never a settlement');
  const v = G.serialize(g); const g2 = G.deserialize(v); assert(g2.climate && g2.climate.pending.tiles.length === st.pending.tiles.length, 'the pending shift survives a save');
  for (let i = 0; i < 5; i++) { g.turn++; CL.turn(g); }
  const after = counts(g);
  assert(!st.pending && st.warmth === 1 && (after.tundra || 0) + (after.snow || 0) < (before.tundra || 0) + (before.snow || 0) && (g.mapVersion || 0) === 1, 'the shift applied: less tundra and snow, map version bumped');
  assert(g.tiles.every(t => !(t.terrain === 'snow' && t.feature) && !(t.terrain === 'desert' && t.feature === 'forest')), 'features stay valid');
  g.civs.forEach(c => { if (!c.minor) c.era = 3; }); // the Easel Age: cold
  CL.turn(g); assert(st.pending && st.pending.warmth === -1 && st.pending.tiles.every(p => p.to === 'tundra' || p.to === 'snow'), 'the Little Ice Age freezes border tiles');
  for (let i = 0; i < 5; i++) { g.turn++; CL.turn(g); }
  // the Smoke age: a hot world dries and drowns
  g.civs.forEach(c => { if (!c.minor) c.era = 4; });
  const pl = G.player(g); const s = AU.U.foundCity(g, G.civUnits(g, pl.idx).filter(u => u.type === 'settler')[0]);
  for (let i = 0; i < 9; i++) s.buildings.push('power_plant'); s.buildings.push('factory', 'factory'); g.fxGen = (g.fxGen || 0) + 1; // a grotesque smokestack row, just for the test
  assert(AU.Smoke.world(g) >= 30 && CL.target(g) === 2, 'heavy world Smoke makes the world hot (' + AU.Smoke.world(g) + ')');
  CL.turn(g); assert(st.pending && st.pending.warmth === 2 && st.pending.tiles.some(p => p.to === 'coast' || p.to === 'desert'), 'a hot world drowns shores or dries plains');
  const coastTiles = st.pending.tiles.filter(p => p.to === 'coast');
  assert(coastTiles.every(p => g.tiles[p.i].owner < 0 && !g.tiles[p.i].hills), 'only flat unowned shores drown');
  for (let i = 0; i < 5; i++) { g.turn++; CL.turn(g); }
  assert(coastTiles.every(p => g.tiles[p.i].terrain === 'coast' && !g.tiles[p.i].feature), 'drowned shores are coast now');
}
{
  const gc = fresh(false); const before = counts(gc); gc.civs.forEach(c => { if (!c.minor) c.era = 2; }); for (let i = 0; i < 12; i++) { gc.turn++; CL.turn(gc); }
  assert(!gc.climate && JSON.stringify(counts(gc)) === JSON.stringify(before), 'classic games never shift');
}
console.log('climate tests OK');
