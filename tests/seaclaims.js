// Ports claim the sea cheaply: a Lighthouse halves the Influence a water tile costs, a Harbor makes it free.
const AU = require('./load.js'); const G = AU.G, U = AU.U;
let fails = 0; function ok(c, m) { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok', m); }
let g, p, s;
for (let seed = 1507; seed < 1600 && !s; seed++) { g = G.newGame({ playerCiv: 'england', mapSize: 'small', numCivs: 2, numStates: 0, seed, difficulty: 'prince', v2: true }); p = G.player(g);
  const st = U.foundCity(g, G.civUnits(g, p.idx).find(u => u.type === 'settler')); if (st && G.isCoastal(g, st) && G.expansionCandidates(g, st).some(i => G.isWater(g.tiles[i]))) s = st; }
ok(!!s, 'a coastal capital');
for (let k = 0; k < 12 && G.claimedCount(g, s) < G.freeClaims(g, s); k++) { const c = G.expansionCandidates(g, s).find(i => !G.isWater(g.tiles[i]) && !g.tiles[i].river && !g.tiles[i].worked); if (c == null) break; G.claimTile(g, s, c); g.tiles[c].worked = true; }
G.addBuilding(g, s, 'boundary_marker');
const water = G.expansionCandidates(g, s).find(i => G.isWater(g.tiles[i])), land = G.expansionCandidates(g, s).find(i => !G.isWater(g.tiles[i]) && !g.tiles[i].river);
const full = G.claimCost(g, s); ok(full > 0, 'claims cost Influence now (' + full + ')');
ok(G.tileClaimCost(g, s, water) === full, 'without a port the sea costs full price');
G.addBuilding(g, s, 'lighthouse'); ok(G.tileClaimCost(g, s, water) === Math.ceil(full / 2) && (land == null || G.tileClaimCost(g, s, land) === full), 'a Lighthouse halves the price of the sea, not of the land');
G.addBuilding(g, s, 'harbor'); ok(G.tileClaimCost(g, s, water) === 0 && G.freeClaimTile(g, water, s), 'a Harbor makes the sea free');
p.influence = 0; ok(G.claimableTiles(g, s).indexOf(water) >= 0 && (land == null || G.claimableTiles(g, s).indexOf(land) < 0), 'with no Influence left a port still claims the sea');
s.pendingGrowth = 1; G.autoExpand(g, s); ok(s.tiles.some(i => G.isWater(g.tiles[i])) && p.influence === 0, 'the city claims a water tile for free');
console.log(fails ? fails + ' FAILED' : 'seaclaims OK'); process.exit(fails ? 1 : 0);
