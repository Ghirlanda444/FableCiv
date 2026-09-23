// Fair starts: every empire's first ring holds three 2-Food tiles and a food resource lies within two tiles, on many maps.
require('./load.js'); const G = AU.G;
function assert(c, m) { if (!c) throw new Error(m); }
const FOOD = ['wheat', 'rice', 'cattle', 'sheep', 'deer', 'bananas', 'fish', 'crabs'];
let checked = 0;
for (const seed of [1, 5, 11, 21, 32, 44, 57]) for (const v2 of [true, false]) {
  const g = G.newGame({ playerCiv: 'korea', playerLeader: 'sejong', mapSize: 'small', mapType: 'continents', numCivs: 5, numStates: 3, seed, difficulty: 'prince', v2 });
  g.civs.filter(c => !c.minor).forEach(c => { const st = G.civUnits(g, c.idx).filter(u => u.type === 'settler')[0]; if (!st) return; const t = g.tiles[st.tile];
    const ring = G.neighbors(g, t).map(i => g.tiles[i]); const rich = ring.filter(x => !G.isWater(x) && x.terrain !== 'mountain' && AU.baseTileYields(x).food >= 2).length;
    const near = []; g.tiles.forEach(x => { if (G.dist(x, t) <= 2 && x.resource && FOOD.indexOf(x.resource) >= 0) near.push(x.resource); });
    assert(rich >= 3 || ring.filter(x => !G.isWater(x) && x.terrain !== 'mountain').length < 3, c.civId + ' seed ' + seed + ': only ' + rich + ' rich tiles in the first ring');
    assert(near.length >= 1, c.civId + ' seed ' + seed + ': no food resource within two tiles'); checked++; });
}
console.log('starts checked', checked, 'OK');
