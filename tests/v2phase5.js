// Divergence phase 5: resource richness tiers, Kinfolk persuasion and Bonds, moods and Migration Pull.
require('./load.js'); const G = AU.G, U = AU.U, SO = AU.Society, CS = AU.CityStates;
function fresh(v2, seed) { return G.newGame({ playerCiv: 'rome', playerLeader: 'caesar', mapSize: 'small', mapType: 'continents', numCivs: 3, numStates: 3, seed: seed || 7, difficulty: 'prince', v2: v2 }); }
function assert(c, m) { if (!c) throw new Error('FAIL: ' + m); console.log('ok:', m); }

// ---- richness tiers exist only on Divergence maps, with fewer resource tiles
{
  const gc = fresh(false), gv = fresh(true);
  const rc = gc.tiles.filter(t => t.resource).length, rv = gv.tiles.filter(t => t.resource).length;
  assert(!gc.tiles.some(t => t.rich != null), 'classic map has no richness tiers');
  const tiers = [0, 0, 0]; gv.tiles.forEach(t => { if (t.resource) tiers[t.rich]++; });
  assert(gv.tiles.filter(t => t.resource).every(t => t.rich != null) && tiers[1] > tiers[0] && tiers[1] > tiers[2], 'every Divergence resource tile has a tier, mostly Normal (' + tiers.join('/') + ')');
  assert(rv < rc * 0.85 && rv > rc * 0.5, 'Divergence maps hold fewer resource tiles (' + rv + ' vs ' + rc + ')');
  const t = gv.tiles.filter(t => t.resource === 'wheat' || t.resource === 'cattle')[0];
  const base = AU.RESOURCES[t.resource].yields.food; const saved = t.rich;
  t.rich = 0; const y0 = AU.baseTileYields(t).food; t.rich = 1; const y1 = AU.baseTileYields(t).food; t.rich = 2; const y2 = AU.baseTileYields(t).food; t.rich = saved;
  assert(y1 === y0 + 1 && y2 === y1 + 1, 'Normal and Rich tiles yield +1 and +2 food over Poor (' + y0 + '/' + y1 + '/' + y2 + ')');
}

// ---- a strategic tile supports 1, 2 or 3 units
{
  const g = fresh(true); const p = G.player(g);
  const s = U.foundCity(g, G.civUnits(g, p.idx).filter(u => u.type === 'settler')[0]);
  const tile = g.tiles[s.tiles.filter(i => i !== s.tile)[0]]; tile.resource = 'horses'; tile.rich = 0; tile.worked = true; p.techs.animal_husbandry = true; p._lux = null;
  assert(SO.resourceSupply(g, p, 'horses') === 1, 'a Poor horse tile supplies 1');
  assert(SO.canSupply(g, p, 'horses'), 'first horse unit can be supplied');
  G.spawnUnit(g, p.idx, 'horseman', s.tile);
  assert(!SO.canSupply(g, p, 'horses'), 'a second horse unit cannot');
  tile.rich = 2; p._lux = null;
  assert(SO.resourceSupply(g, p, 'horses') === 3 && SO.canSupply(g, p, 'horses'), 'a Rich tile supplies 3');
  const gc = fresh(false); const pc = G.player(gc); const sc = U.foundCity(gc, G.civUnits(gc, pc.idx).filter(u => u.type === 'settler')[0]);
  const tc = gc.tiles[sc.tiles.filter(i => i !== sc.tile)[0]]; tc.resource = 'horses'; tc.worked = true; pc.techs.animal_husbandry = true; pc.techs.horseback_riding = true; pc._lux = null;
  G.spawnUnit(gc, pc.idx, 'horseman', sc.tile); G.spawnUnit(gc, pc.idx, 'horseman', sc.tile);
  assert(G.canBuildUnit(gc, sc, 'horseman'), 'classic: one horse tile still supplies any number of units');
}

// ---- persuasion: the matching source counts double
{
  const g = fresh(true); const p = G.player(g);
  const minors = CS.minors(g); assert(minors.length >= 2, 'free cities exist');
  const trade = minors.filter(m => m.stateType === 'trade')[0] || minors[0]; const other = minors.filter(m => SO.persuasionOf(m) !== 'gifts')[0];
  assert(other, 'a non-gift city exists');
  p.met[trade.idx] = true; p.met[other.idx] = true;
  const a = CS.addTies(g, p, trade, 10, 'gift'), b = CS.addTies(g, p, other, 10, 'gift');
  assert((SO.persuasionOf(trade) === 'gifts' ? a === 20 : a === 10) && b === 10, 'a gift to a ' + SO.persuasionOf(trade) + ' city gives ' + a + ', to a ' + SO.persuasionOf(other) + ' city ' + b);
  const gc = fresh(false); const pc = G.player(gc); const mc = CS.minors(gc)[0]; pc.met[mc.idx] = true;
  assert(CS.addTies(gc, pc, mc, 10, 'gift') === 10, 'classic: no persuasion multiplier');
}

// ---- Bonds: sealed at Patron, paid in Influence, yields flow, break when the purse is empty
{
  const g = fresh(true); const p = G.player(g);
  const s = U.foundCity(g, G.civUnits(g, p.idx).filter(u => u.type === 'settler')[0]);
  const m = CS.minors(g)[0]; p.met[m.idx] = true;
  assert(!SO.bondState(g, p, m).ok, 'no bond as a stranger');
  m.ties = m.ties || {}; m.ties[p.idx] = 70; m.patronIdx = p.idx; p.influence = 100;
  assert(CS.patron(g, m) === p.idx && SO.bondState(g, p, m).ok, 'a Patron with Influence may bond');
  assert(!CS.unionState(g, p, m).ok, 'unions are off under Divergence');
  const yBefore = G.settlementYields(g, s).gold; p._fx = null;
  assert(SO.bond(g, p, m) && SO.hasBond(p, m), 'bond sealed');
  const by = SO.bondYields(g, p); const yAfter = G.settlementYields(g, s).gold;
  assert(by.gold > 0 && Math.abs(yAfter - yBefore - by.gold) < 0.6, 'half of its gold flows to the capital (+' + by.gold + ')');
  const inf = p.influence; SO.bondsTurn(g, p);
  assert(p.influence === inf - SO.bondUpkeep(g, p) && SO.bondUpkeep(g, p) === 3, 'upkeep of 3 Influence paid per turn');
  p.influence = 0; SO.bondsTurn(g, p);
  assert(!SO.hasBond(p, m) && p.bondShame > g.turn, 'an empty purse breaks the bond and shames the empire');
  const h1 = G.settlementYields(g, s).happiness; p.bondShame = 0; p._fx = null; const h0 = G.settlementYields(g, s).happiness;
  assert(h0 - h1 === 2, 'a broken bond costs 2 Happiness (' + h1 + ' vs ' + h0 + ')');
}

// ---- moods scale yields and growth
{
  assert(SO.tierOf(-6).id === 'miserable' && SO.tierOf(-1).id === 'unhappy' && SO.tierOf(0).id === 'content' && SO.tierOf(4).id === 'happy' && SO.tierOf(8).id === 'joyful', 'five moods by happiness');
  const g = fresh(true); const p = G.player(g);
  const s = U.foundCity(g, G.civUnits(g, p.idx).filter(u => u.type === 'settler')[0]);
  const y = G.settlementYields(g, s); const base = y.production;
  s.pop = 22; s.tiles.forEach(i => { g.tiles[i].worked = true; }); // a huge city with no luxuries is miserable
  const ym = G.settlementYields(g, s);
  assert(ym.happiness <= -5 && ym.production < base * 1.1, 'a miserable settlement makes less (' + ym.happiness + ' mood, ' + Math.round(ym.production) + ' vs ' + Math.round(base) + ' prod with 1 pop)');
  const food = ym.food; s.food = 0; G.processSettlement(g, s);
  assert(s.food <= 0 + 1e-9 || food - s.pop * 2 <= 0, 'a miserable settlement does not grow');
}

// ---- Migration Pull moves a family across a shared border
{
  const g = fresh(true); const p = G.player(g), other = g.civs.filter(c => !c.minor && c.idx !== p.idx)[0];
  const s = U.foundCity(g, G.civUnits(g, p.idx).filter(u => u.type === 'settler')[0]);
  // give the neighbour a settlement right next to ours and make it miserable
  const near = G.neighbors(g, g.tiles[s.tile]).map(i => g.tiles[i]).filter(t => !G.isWater(t) && !AU.TERRAIN[t.terrain].impassable)[0];
  const far = G.neighbors(g, near).map(i => g.tiles[i]).filter(t => !G.isWater(t) && !AU.TERRAIN[t.terrain].impassable && t.settlement == null && G.dist(t, g.tiles[s.tile]) === 2)[0];
  far.owner = -1; G.civUnits(g, other.idx).forEach(u => G.removeUnit(g, u));
  const so = G.foundSettlement(g, other.idx, far.i); so.pop = 22; so.tiles.forEach(i => { g.tiles[i].worked = true; });
  assert(SO.sharesBorder(g, p.idx, other.idx), 'the two empires share a border');
  p.imports = { silk: 999, gems: 999, wine: 999, furs: 999 }; p._lux = null; // four luxuries: a joyful capital
  const moodP = SO.mood(g, p).tier.id, moodO = SO.mood(g, other).tier.id;
  g.turn = 20; const before = s.pop, beforeO = so.pop;
  const moves = SO.migrationTurn(g);
  assert(moodO === 'miserable' && moodP === 'joyful' && moves.length === 1 && s.pop === before + 1 && so.pop === beforeO - 1, 'Migration Pull (' + moodP + ' ← ' + moodO + '): ' + moves.length + ' family moved');
  g.turn = 21; assert(SO.migrationTurn(g).length === 0, 'migration only every 10 turns');
}

// ---- a 60-turn AI game with all of it on stays consistent
{
  const g = fresh(true, 3); const p = G.player(g); p.isPlayer = false; p.ai = Object.assign({}, AU.LEADER_BY_ID[p.leaderId].ai);
  for (let t = 0; t < 60; t++) G.endTurn(g);
  const bonds = g.civs.reduce((n, c) => n + (c.bonds || []).length, 0);
  console.log('bonds sealed by turn 60:', bonds, '· moods:', g.civs.filter(c => !c.minor).map(c => c.civId + ':' + SO.mood(g, c).tier.id).join(' '));
  const json = G.serialize(g); const g2 = G.deserialize(json);
  assert(g2.tiles.filter(t => t.rich != null).length === g.tiles.filter(t => t.rich != null).length, 'richness survives a save');
}
console.log('v2 phase 5 tests OK');
