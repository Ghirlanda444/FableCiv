// Divergence: Knowledge studies any Spark, Heritage feeds Influence and pays for one Reform per age, rivers help young settlements.
require('./load.js'); const G = AU.G, MW = AU.MasteryWeb;
function assert(c, m) { if (!c) throw new Error(m); }
const g = G.newGame({ playerCiv: 'rome', playerLeader: 'caesar', mapSize: 'small', mapType: 'continents', numCivs: 4, numStates: 2, seed: 21, difficulty: 'prince', v2: true });
const pl = G.player(g), st = MW.state(pl);
// --- study any Spark ---
const open = MW.openNodes(0), found = open.filter(n => n.pool === 'foundation' && !n.cheap)[0], branch = open.filter(n => n.pool === 'branched' && n.pair)[0], cheap = open.filter(n => n.cheap)[0];
assert(found && branch && cheap, 'need a foundation, a paired and a cheap Spark');
const cF = MW.studyCost(g, pl, found), cB = MW.studyCost(g, pl, branch), cC = MW.studyCost(g, pl, cheap);
console.log('study costs', 'cheap', cC, 'foundation', cF, 'branch', cB);
assert(cC < cF && cF < cB, 'study cost tiers');
st.study = cF - 1; assert(!MW.study(g, pl, found.id), 'study blocked when short');
st.study = cF; assert(MW.study(g, pl, found.id), 'foundation Spark studied'); assert(st.unlocked[found.id] && st.study === 0, 'cost taken');
assert(MW.studyCost(g, pl, branch) > cB, 'each study makes the next dearer'); st.study = MW.studyCost(g, pl, branch); assert(MW.study(g, pl, branch.id), 'branch Spark studied'); assert(st.locked[branch.pair], 'twin locked by study');
assert(!MW.canStudy(g, pl, branch.pair), 'locked twin cannot be studied');
const nextEra = AU.V2.NODES.filter(n => n.era === 1)[0]; if (nextEra) { st.study = 9999; assert(!MW.canStudy(g, pl, nextEra.id), 'a Spark of a later age cannot be studied'); st.study = 0; }
// AI prefers foundation Sparks of its age
const ai = g.civs.filter(c => !c.minor && !c.isPlayer)[0], as = MW.state(ai); as.study = 1000; const pick = MW.aiStudyPick(g, ai); assert(pick && pick.pool === 'foundation', 'AI studies foundation first'); as.study = 0;
// --- Heritage -> Influence, Reform ---
const y = G.civYields(g, pl); const base = 2 + G.civSettlements(g, pl.idx).length + (G.civFx(g, pl).influencePerTurn || 0);
assert(G.influenceIncome(g, pl) === base + Math.floor((y.culture || 0) / 8), 'Heritage adds to Influence');
pl._fx = null; const hub = AU.V2.HUBS.filter(h => h.turning === undefined && h.branches.length >= 2)[0]; assert(hub, 'a reformable hub');
st.hubsFired[hub.id] = 1; MW.choose(g, pl, hub.id, hub.branches[0].id);
st.heritage = MW.reformCost(g, pl) - 1; assert(!MW.canReform(g, pl, hub.id), 'reform blocked when short of Heritage');
st.heritage = MW.reformCost(g, pl); assert(MW.reform(g, pl, hub.id, hub.branches[1].id), 'reform switches the branch'); assert(st.traits[hub.id] === hub.branches[1].id && st.heritage === 0, 'branch switched, cost taken');
st.heritage = 9999; assert(!MW.canReform(g, pl, hub.id), 'only one Reform per age');
const turning = AU.V2.HUBS.filter(h => h.turning !== undefined)[0]; if (turning) { st.traits[turning.id] = turning.branches[0].id; st.reformUsed = {}; assert(!MW.canReform(g, pl, turning.id), 'Turning Points cannot be reformed'); }
// --- rivers: growth, claims, Smoke, Command ---
G.endTurn(g); // found settlements
let river = null, dry = null; for (const id in g.settlements) { const s = g.settlements[id]; if (g.civs[s.civ].minor) continue; if (G.hasRiver(g, s)) river = river || s; else dry = dry || s; }
if (!river) { // make one: put a river next to the first settlement
  const s0 = Object.values(g.settlements).filter(s => !g.civs[s.civ].minor)[0]; G.neighbors(g, g.tiles[s0.tile]).forEach(i => { g.tiles[i].river = true; }); river = s0; dry = Object.values(g.settlements).filter(s => s !== s0 && !G.hasRiver(g, s))[0];
}
assert(river, 'a river settlement');
river.pop = 3; assert(G.growthCostFor(g, river) === Math.floor(G.growthCost(3, g) * 0.8), 'river growth 20% cheaper');
river.pop = 8; assert(G.growthCostFor(g, river) === G.growthCost(8, g), 'no river discount from 8 population');
if (dry) { dry.pop = 3; assert(G.growthCostFor(g, dry) === G.growthCost(3, g), 'dry settlement pays full'); }
river.pop = 3;
assert(AU.Smoke.detail(g, river).sink.some(x => x[0] === 'river'), 'river soaks up Smoke');
// claims: after three claims a river tile is still free and needs no Boundary Marker
const civ = g.civs[river.civ]; civ.influence = 0; river.buildings = river.buildings.filter(b => b !== 'boundary_marker' && b !== 'growth_hall');
while (G.claimedCount(g, river) < 3) { const c = G.expansionCandidates(g, river).filter(i => !g.tiles[i].river)[0] || G.expansionCandidates(g, river)[0]; assert(c != null, 'candidate'); G.claimTile(g, river, c); }
const riv = G.expansionCandidates(g, river).filter(i => g.tiles[i].river)[0], land = G.expansionCandidates(g, river).filter(i => !g.tiles[i].river)[0];
if (!riv) { const any = G.expansionCandidates(g, river)[0]; g.tiles[any].river = true; }
const rivT = G.expansionCandidates(g, river).filter(i => g.tiles[i].river)[0];
assert(G.claimBlocker(g, river) === 'building', 'fourth claim needs a Boundary Marker');
assert(G.claimBlocker(g, river, rivT) === null, 'river tile claim is free of the Marker');
assert(G.claimableTiles(g, river).indexOf(rivT) >= 0 && (land == null || G.claimableTiles(g, river).indexOf(land) < 0), 'only river tiles claimable while blocked');
river.pendingGrowth = 1; if (land != null) assert(!G.expandTo(g, river, land), 'land tile refused');
assert(G.expandTo(g, river, rivT), 'river tile claimed'); assert(civ.influence === 0, 'no Influence charged for a river tile');
river.pendingGrowth = 1; G.autoExpand(g, river); assert(river.pendingGrowth === 1 || G.claimedCount(g, river) === 5, 'autoExpand only takes free river tiles when blocked');
// Command: a unit on an own river tile costs 1 order wherever it stands
const u = G.spawnUnit(g, river.civ, 'warrior', river.tile); const far = g.tiles.filter(t => !AU.TERRAIN[t.terrain].water && t.terrain !== 'mountain' && t.settlement == null && G.civSettlements(g, river.civ).every(x => G.dist(t, g.tiles[x.tile]) > 10))[0];
if (far) { G.setUnitTile(g, u, far.i); assert(G.orderCost(g, u) === 3, 'far unit costs 3'); far.river = true; far.owner = river.id; assert(G.orderCost(g, u) === 1, 'own river tile costs 1'); far.owner = -1; }
console.log('rivers OK');
