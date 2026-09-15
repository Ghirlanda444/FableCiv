// Unique improvements and unique towns: yields apply for the owning empire only.
const AU = require('./load.js'); const G = AU.G;
let fails = 0; const check = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } };
const g = G.newGame({ playerCiv: 'egypt', mapSize: 'small', difficulty: 'prince', seed: 11, mapType: 'continents', speed: 'standard', numCivs: 3 });
const p = G.player(g); const s = AU.U.foundCity(g, G.civUnits(g, p.idx).find(u => u.type === 'settler'));
const t = g.tiles.find(x => (x.terrain === 'grassland' || x.terrain === 'plains' || x.terrain === 'desert') && !x.hills && !x.feature && !x.resource && !x.natural && x.owner < 0); t.terrain = 'desert'; // make sure a flat desert tile exists
t.owner = s.id; t.worked = true; s.tiles.push(g.tiles.indexOf(t));
const y = G.tileYields(g, t, s, p); check(y.culture >= 2, 'sphinx culture on desert farm: ' + JSON.stringify(y));
const other = g.civs.find(c => !c.minor && c.civId !== 'egypt'); const y2 = G.tileYields(g, t, s, other); check(!(y2.culture >= 2), 'no sphinx for others');
check(G.improvementName(g, t, p, 'farm') === 'Sphinx', 'improvement name');
const g2 = G.newGame({ playerCiv: 'zulu', mapSize: 'small', difficulty: 'prince', seed: 12, mapType: 'continents', speed: 'standard', numCivs: 3 });
const p2 = G.player(g2); const sets = G.civSettlements(g2, p2.idx); const cap = AU.U.foundCity(g2, G.civUnits(g2, p2.idx).find(u => u.type === 'settler'));
const town = G.foundSettlement(g2, p2.idx, g2.tiles.indexOf(g2.tiles.find(x => !AU.TERRAIN[x.terrain].impassable && !AU.TERRAIN[x.terrain].water && x.owner < 0 && G.dist(x, g2.tiles[cap.tile]) === 4)), false);
town.pop = 3; check(G.canSpecialize(g2, town, 'ikhanda'), 'zulu can pick ikhanda'); G.specialize(g2, town, 'ikhanda');
check(town.specialization === 'ikhanda' && G.hasBuilding(town, 'walls'), 'ikhanda gives walls');
const c1 = G.purchaseCost(g2, p2, 'unit', 'warrior', town), c0 = G.purchaseCost(g2, p2, 'unit', 'warrior', cap); check(c1 < c0, 'cheaper units in ikhanda ' + c0 + ' -> ' + c1);
check(!G.canSpecialize(g2, town, 'satrapy'), 'other civs cannot pick satrapy');
if (fails) { console.log(fails, 'failures'); process.exit(1); } console.log('uniques tests OK');
