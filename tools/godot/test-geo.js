// Node check for the Godot build's geometry (godot/terrain.js, godot/geo.js, godot/props.js): picking round-trips every tile centre,
// edge neighbours match the engine's, neighbouring tiles meet without cracks, and every mesh is well formed.
const assert = require('assert');
const AU = require('../../godot/engine/au_bundle.js'), T = require('../../godot/terrain.js'), geo = require('../../godot/geo.js'), props = require('../../godot/props.js'), G = AU.G;
const g = G.newGame({ playerCiv: 'rome', mapSize: 'small', mapType: 'continents', numCivs: 5, numStates: 3, seed: 7, difficulty: 'prince', v2: true });
const pl = G.player(g); pl.isPlayer = false; pl.ai = Object.assign({}, AU.LEADER_BY_ID[pl.leaderId].ai);
g.tiles.forEach(t => { const c = T.center(t.col, t.row); assert.strictEqual(T.pick(c[0], c[1], g.W, g.H), t.i); assert.strictEqual(T.pick(c[0] + 0.5, c[1] - 0.4, g.W, g.H), t.i); });
g.tiles.forEach(t => { const mine = new Set(G.neighbors(g, t)); for (let k = 0; k < 6; k++) { const n = T.across(g.W, g.H, t.col, t.row, k); if (n >= 0) assert(mine.has(n), 'edge ' + k + ' of tile ' + t.i + ' is not a neighbour'); } });
let t0 = Date.now();
const F = T.makeField(AU, g), M = T.buildTerrainMesh(F), S = T.buildScatter(F), R = T.buildRivers(F, g);
console.log('terrain ', M.vertices + ' verts, ' + M.triangles + ' triangles, ' + (Date.now() - t0) + ' ms; props ' + Object.keys(S).map(k => k + ' ' + S[k].length).join(', '));
assert(M.idx.every(i => i >= 0 && i < M.vertices) && M.pos.every(Number.isFinite) && M.nrm.every(Number.isFinite), 'terrain mesh malformed');
let worst = 0; const a = new Float32Array(8);
g.tiles.forEach(t => { const c = T.center(t.col, t.row); for (let k = 0; k < 6; k++) { const n = F.nb[t.i][k]; if (n < 0) continue;
  const p = T.corner(c[0], c[1], k, 1), q = T.corner(c[0], c[1], k + 1, 1);
  for (let s = 0; s <= T.RINGS; s++) { const x = p[0] + (q[0] - p[0]) * s / T.RINGS, z = p[1] + (q[1] - p[1]) * s / T.RINGS;
    worst = Math.max(worst, Math.abs(F.heightFrom(F.attrs(t.i, x, z, a), x, z) - F.heightFrom(F.attrs(n, x, z, a), x, z))); } } });
assert(worst < 1e-4, 'tiles do not meet: gap ' + worst);
console.log('seams    largest gap between neighbouring tiles ' + worst.toExponential(1));
for (let k = 0; k < 40; k++) G.endTurn(g);
function check(name, b) {
  const v = b.p.length / 3; assert(v % 3 === 0 && b.n.length === b.p.length && b.c.length === v * 4, name + ' malformed');
  assert(b.p.every(Number.isFinite) && b.n.every(Number.isFinite) && b.c.every(x => Number.isFinite(x) && x >= 0 && x <= 1.5), name + ' has bad numbers');
  console.log(name.padEnd(8), (v / 3) + ' triangles');
}
check('rivers', R); check('borders', geo.buildBorders(AU, g, F)); check('pieces', geo.buildPieces(AU, g, F));
['pine', 'broadleaf', 'rock', 'reed'].forEach(k => check(k, props[k]()));
// KayKit layout: every model it asks for is in assets/kaykit, and every river tile finds a river piece
const K = require('../../godot/kaykit.js'), fs = require('fs'), path = require('path');
const lists = Object.assign({}, K.buildStatic(AU, g), K.buildTowns(AU, g));
const missing = Object.keys(lists).filter(m => !fs.existsSync(path.join(__dirname, '../../godot/assets/kaykit/hex', m + '.gltf')));
assert.deepStrictEqual(missing, [], 'models missing from godot/assets/kaykit/hex');
const rd = K.riverDirs(AU, g); Object.keys(rd).forEach(i => { const d = Array.from(rd[i]); assert(K.riverFor(d.length === 1 ? [d[0], (d[0] + 3) % 6] : d), 'no river piece for tile ' + i + ' edges ' + d); });
Object.values(K.LOADOUT).forEach(l => { assert(fs.existsSync(path.join(__dirname, '../../godot/assets/kaykit/chars', l.model + '.glb')), 'missing character ' + l.model); l.gear.forEach(x => assert(K.GEAR[l.model].includes(x), x + ' is not gear of ' + l.model)); });
console.log('kaykit  ', Object.keys(lists).length + ' models, ' + Object.keys(rd).length + ' river tiles, ' + K.unitSpots(AU, g).filter(s => s.load).length + ' character units');
console.log('geo ok, turn ' + g.turn + ', ' + Object.keys(g.settlements).length + ' settlements, ' + Object.keys(g.units).length + ' units');
