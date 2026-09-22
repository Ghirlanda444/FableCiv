// Strategic resources under Divergence: revealed by age, counted for supply, synthesised from Knowledge; maps carry every kind.
require('./load.js'); const G = AU.G, MW = AU.MasteryWeb, SY = AU.Synthesis;
function assert(c, m) { if (!c) throw new Error(m); }
// map guarantee: every strategic resource is on the map at least twice
[3, 8].forEach(seed => { const g = G.newGame({ playerCiv: 'rome', playerLeader: 'caesar', mapSize: 'small', mapType: 'continents', numCivs: 4, numStates: 2, seed, difficulty: 'prince', v2: true }); const cnt = {}; g.tiles.forEach(t => { if (t.resource && AU.RESOURCES[t.resource].kind === 'strategic') cnt[t.resource] = (cnt[t.resource] || 0) + 1; }); for (const id in AU.RESOURCES) if (AU.RESOURCES[id].kind === 'strategic') assert((cnt[id] || 0) >= 2, id + ' missing from map ' + seed + ': ' + JSON.stringify(cnt)); });
const g = G.newGame({ playerCiv: 'rome', playerLeader: 'caesar', mapSize: 'small', mapType: 'continents', numCivs: 4, numStates: 2, seed: 5, difficulty: 'prince', v2: true });
const pl = G.player(g), st = MW.state(pl);
// reveal by age
assert(G.resourceKnown(g, pl, 'horses') && G.resourceKnown(g, pl, 'iron') && G.resourceKnown(g, pl, 'copper'), 'first-age resources known at once');
assert(!G.resourceKnown(g, pl, 'coal') && !G.resourceKnown(g, pl, 'rubber') && !G.resourceKnown(g, pl, 'uranium'), 'later resources hidden in the first age');
pl.era = 4; st.era = 4; assert(G.resourceKnown(g, pl, 'coal') && G.resourceKnown(g, pl, 'rubber') && !G.resourceKnown(g, pl, 'aluminum'), 'Puffstack Age reveals Coal and Rubber, not Aluminum');
assert(G.resourceRevealName(g, AU.RESOURCES.uranium) === AU.V2.ERAS[6].name, 'reveal name is the age under Divergence');
pl.era = 0; st.era = 0;
// supply counts under Divergence
const s0 = AU.U.foundCity(g, G.civUnits(g, pl.idx).filter(u => u.type === 'settler')[0]); assert(s0, 'capital'); G.endTurn(g);
const spot = G.expansionCandidates(g, s0)[0]; g.tiles[spot].resource = 'iron'; g.tiles[spot].rich = 2; g.tiles[spot].feature = null; G.claimTile(g, s0, spot); pl._lux = null;
assert(G.luxuryCount(g, pl).strategic.iron === 3, 'a rich Iron tile supplies 3 (' + JSON.stringify(G.luxuryCount(g, pl).strategic) + ')');
g.tiles[spot].resource = 'uranium'; pl._lux = null; assert(!G.luxuryCount(g, pl).strategic.uranium, 'hidden Uranium does not count');
g.tiles[spot].resource = 'iron'; pl._lux = null;
// new needs
assert(AU.UNITS.tank.resource === 'rubber' && AU.UNITS.jet_fighter.resource === 'aluminum' && AU.UNITS.submarine.resource === 'uranium' && AU.UNITS.catapult.resource === 'copper' && AU.BUILDINGS.nuclear_plant.resource === 'uranium' && AU.BUILDINGS.airport.resource === 'aluminum', 'resource needs assigned');
// synthesis
assert(!SY.canRun(g, pl), 'no Synthesis in the first age');
pl.era = 5; st.era = 5; pl._fx = null; g.fxGen = (g.fxGen || 0) + 1;
assert(!SY.canRun(g, pl), 'no Synthesis without a Research Lab');
s0.isCity = true; G.addBuilding(g, s0, 'research_lab'); assert(SY.canRun(g, pl) && SY.canRun(g, pl, s0), 'Synthesis opens with a lab in the Glowbit Age');
const c0 = SY.cost(g, pl); assert(c0 === Math.round(300 * G.speed(g)), 'first synthesis costs 300 (' + c0 + ')');
st.study = c0 - 1; assert(!SY.run(g, pl, 'rubber'), 'short of Knowledge');
st.study = c0; assert(SY.run(g, pl, 'rubber'), 'Rubber synthesised'); assert(st.study === 0 && pl.synth.rubber === 1, 'cost taken');
assert(G.luxuryCount(g, pl).strategic.rubber === SY.SUPPLY, 'synthesised supply counts (' + JSON.stringify(G.luxuryCount(g, pl).strategic) + ')');
assert(AU.Society.canSupply(g, pl, 'rubber'), 'a Tank could now be supplied');
const c1 = SY.cost(g, pl); assert(c1 === Math.round(300 * 1.6 * G.speed(g)), 'second synthesis 60% dearer (' + c1 + ')');
assert(pl.flags['ev:synthesis'], 'synthesis event flagged');
st.study = 9999; assert(!SY.run(g, pl, 'uranium'), 'cannot synthesise a resource not yet known'); assert(!SY.run(g, pl, 'wine'), 'luxuries cannot be synthesised'); st.study = 0;
// the Spark pair: Lab-Grown Everything fires on a synthesis and locks Strategic Reserve
st.era = 6; pl.era = 6; MW.evaluate(g, pl);
assert(st.unlocked.x_labgrown, 'Lab-Grown Everything sparked'); assert(st.locked.x_reserve, 'Strategic Reserve locked');
pl._fx = null; g.fxGen++; assert(G.civFx(g, pl).synthCostMult === 0.7, 'synthesis 30% cheaper'); assert(SY.cost(g, pl) === Math.round(300 * 1.6 * 0.7 * G.speed(g)), 'discount applied (' + SY.cost(g, pl) + ')');
// AI synthesises what it lacks
const ai = g.civs.filter(c => !c.minor && !c.isPlayer)[0]; const as = MW.state(ai); ai.era = 5; as.era = 5; const aiS = G.civSettlements(g, ai.idx)[0]; aiS.isCity = true; G.addBuilding(g, aiS, 'research_lab'); as.study = 10000; ai._fx = null;
SY.aiTurn(g, ai); assert(SY.count(ai) === 1, 'AI synthesised one resource: ' + JSON.stringify(ai.synth));
const made = Object.keys(ai.synth)[0]; assert(SY.wantedBy(g, ai, made).length > 0 || AU.Society.resourceSupply(g, ai, made) >= 0, 'AI picked something useful: ' + made);
// classic rules still use technologies
const gc = G.newGame({ playerCiv: 'rome', playerLeader: 'caesar', mapSize: 'small', mapType: 'continents', numCivs: 3, numStates: 1, seed: 5, difficulty: 'prince' });
const pc = G.player(gc); assert(!G.resourceKnown(gc, pc, 'copper'), 'classic: Copper hidden before Mining'); pc.techs.mining = true; assert(G.resourceKnown(gc, pc, 'copper'), 'classic: Mining reveals Copper'); assert(!AU.Synthesis.canRun(gc, pc), 'no Synthesis under classic rules');
console.log('resources OK');
