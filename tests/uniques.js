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
// Second wave of kits: generic tile conditions for improvements and unique towns.
{
  const g3 = G.newGame({ playerCiv: 'russia', mapSize: 'small', difficulty: 'prince', seed: 13, mapType: 'continents', speed: 'standard', numCivs: 3 });
  const p3 = G.player(g3);
  const tun = g3.tiles.find(x => x.terrain === 'grassland' && !x.hills && !x.feature && !x.resource && !x.natural && x.owner < 0); tun.terrain = 'tundra';
  check(G.tileMatches(g3, tun, 'tundra'), 'tundra matches by terrain id'); check(!G.tileMatches(g3, tun, 'desert'), 'terrain mismatch');
  const jun = g3.tiles.find(x => x.terrain === 'grassland' && !x.hills && !x.resource && !x.natural && x.owner < 0 && x !== tun); jun.feature = 'jungle';
  check(G.tileMatches(g3, jun, 'jungle') && G.tileMatches(g3, jun, 'forest') && G.tileMatches(g3, jun, 'woodcutter', 'woodcutter'), 'feature and improvement conditions');
  const maya = g3.civs.find(c => c.civId === 'maya') || Object.assign({}, p3, { civId: 'maya' });
  check(G.uniqueImprovement(g3, jun, maya, 'woodcutter') && G.uniqueImprovement(g3, jun, maya, 'woodcutter').id === 'milpa', 'maya milpa on jungle woodcutter');
  check(!G.uniqueImprovement(g3, tun, maya, 'woodcutter'), 'no milpa without jungle');
  check(AU.whenLabel('water') === 'lakeside or coastal' && AU.whenLabel('woodcutter') === 'Woodcutter', 'condition labels');
  const kinds = {}; AU.CIVS.forEach(c => { const k = ['uu', 'ub', 'ui', 'ut'].filter(x => c[x]); check(k.length === 2, c.id + ' has two uniques'); kinds[k.join('+')] = 1; });
  check(Object.keys(kinds).length >= 5, 'at least five kit shapes: ' + Object.keys(kinds).join(' '));
  AU.CIVS.forEach(c => { if (c.ui) check(AU.IMPROVEMENTS[c.ui.replaces], c.id + ' ui replaces a real improvement'); if (c.ut) check(c.ut.minPop && c.ut.fx && c.ut.desc && c.ut.icon, c.id + ' ut is complete'); });
}
if (fails) { console.log(fails, 'failures'); process.exit(1); } console.log('uniques tests OK');
