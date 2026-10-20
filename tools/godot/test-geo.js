// Node check for the Godot build's geometry (godot/terrain.js, godot/geo.js, godot/props.js): picking round-trips every tile centre,
// edge neighbours match the engine's, neighbouring tiles meet without cracks, and every mesh is well formed.
const assert = require('assert');
const AU = require('../../godot/engine/au_bundle.js'), T = require('../../godot/terrain.js'), geo = require('../../godot/geo.js'), props = require('../../godot/props.js'), G = AU.G;
const g = G.newGame({ playerCiv: 'rome', mapSize: 'small', mapType: 'continents', numCivs: 5, numStates: 3, seed: 7, difficulty: 'prince', v2: true });
const pl = G.player(g); pl.isPlayer = false; pl.ai = Object.assign({}, AU.LEADER_BY_ID[pl.leaderId].ai);
g.tiles.forEach(t => { const c = T.center(t.col, t.row); assert.strictEqual(T.pick(c[0], c[1], g.W, g.H), t.i); assert.strictEqual(T.pick(c[0] + 0.5, c[1] - 0.4, g.W, g.H), t.i); });
g.tiles.forEach(t => { const mine = new Set(G.neighbors(g, t)); for (let k = 0; k < 6; k++) { const n = T.across(g.W, g.H, t.col, t.row, k); if (n >= 0) assert(mine.has(n), 'edge ' + k + ' of tile ' + t.i + ' is not a neighbour'); } });
let t0 = Date.now();
const F = T.makeField(AU, g), M = T.buildTerrainMesh(F), S = T.buildScatter(F, g), R = T.buildRivers(F, g);
console.log('terrain ', M.vertices + ' verts, ' + M.triangles + ' triangles, ' + (Date.now() - t0) + ' ms; props ' + Object.keys(S).map(k => k + ' ' + S[k].length).join(', '));
assert(M.idx.every(i => i >= 0 && i < M.vertices) && M.pos.every(Number.isFinite) && M.nrm.every(Number.isFinite), 'terrain mesh malformed');
let worst = 0; const a = new Float32Array(8);
g.tiles.forEach(t => { const c = T.center(t.col, t.row); for (let k = 0; k < 6; k++) { const n = F.nb[t.i][k]; if (n < 0) continue;
  const p = T.corner(c[0], c[1], k, 1), q = T.corner(c[0], c[1], k + 1, 1);
  for (let s = 0; s <= T.RINGS; s++) { const x = p[0] + (q[0] - p[0]) * s / T.RINGS, z = p[1] + (q[1] - p[1]) * s / T.RINGS;
    worst = Math.max(worst, Math.abs(F.heightIn(t.i, x, z, a) - F.heightIn(n, x, z, a))); } } });
assert(worst < 1e-4, 'tiles do not meet: gap ' + worst);
console.log('seams    largest gap between neighbouring tiles ' + worst.toExponential(1));
for (let k = 0; k < 40; k++) G.endTurn(g);
function check(name, b) {
  const v = b.p.length / 3; assert(v % 3 === 0 && b.n.length === b.p.length && b.c.length === v * 4, name + ' malformed');
  assert(b.p.every(Number.isFinite) && b.n.every(Number.isFinite) && b.c.every(x => Number.isFinite(x) && x >= 0 && x <= 1.5), name + ' has bad numbers');
  console.log(name.padEnd(8), (v / 3) + ' triangles');
}
check('rivers', R); check('borders', geo.buildBorders(AU, g, F)); check('pieces', geo.buildPieces(AU, g, F));
['pineTree', 'roundTree', 'palmTree', 'bush', 'tuft', 'rock', 'reed'].forEach(k => check(k, props[k]()));
['fluffyTree', 'fluffyBush'].forEach(k => { const f = props[k](); check(k + '.solid', f.solid); check(k + '.leaf', f.leaves); assert(f.leaves.uv && f.leaves.uv.length === f.leaves.p.length / 3 * 2, k + ' leaf cards need UVs'); });
// painted pictures: every unit and building chain resolves to a picture in web/assets (except the few with no art yet)
const SP = require('../../godot/sprites.js'), fs = require('fs'), path = require('path');
const exists = p => fs.existsSync(path.join(__dirname, '../../web/assets', p));
const units = SP.unitSpots(AU, g, () => 0), towns = [].concat(...Object.keys(g.settlements).map(id => SP.cityViewSprites(AU, g, g.settlements[id], () => 0)));
const NO_ART = new Set();
units.forEach(s => assert(s.chain.some(exists) || NO_ART.has(s.unit.type), 'no picture for unit ' + s.unit.type + ': ' + s.chain.join(' | ')));
const townMissing = towns.filter(s => !s.chain.some(exists)).map(s => s.chain[s.chain.length - 1]);
assert(townMissing.every(p => /growth_hall/.test(p)), 'buildings without pictures: ' + townMissing.join(' '));
const res = SP.resourceSpots(AU, g, () => 0);
res.forEach(s => assert(s.chain.some(exists), 'no picture for resource ' + s.resource));
check('marks', geo.buildUnitMarks(AU, g, F, () => true));
for (let n = 1; n <= 4; n++) { let sx = 0; for (let k = 0; k < n; k++) sx += geo.unitOffset(k, n, false)[0]; assert(Math.abs(sx) < 1e-9, n + ' units are not centred'); }
const DR = require('../../godot/dressing.js');
assert(Object.keys(AU.RESOURCES).every(r => DR.DRESS[r] && DR.DRESS[r].every(([m]) => DR.MODELS[m])), 'a resource has no scenery');
Object.keys(DR.MODELS).forEach(k => check('dress ' + k, DR.MODELS[k][0]()));
const dressed = DR.buildDressing(F, g, t => geo.showsResource(AU, g, t));
console.log('resources', res.length + ' resource icons, scenery ' + Object.keys(dressed).map(k => k + ' ' + dressed[k].length).join(', '));
console.log('pictures', units.length + ' unit standees, ' + towns.length + ' city-view pictures (' + townMissing.length + ' without art yet)');
// settlement models: every culture and size tier builds a well-formed model, with and without walls, and in the Show city view
const CT = require('../../godot/city.js'), sample = g.settlements[Object.keys(g.settlements)[0]];
let cityTris = 0;
Object.keys(AU.PALACE_STYLES).forEach(cu => [0, 1, 2, 3, 4].forEach(tier => [false, true].forEach(walls => {
  const AX = Object.assign({}, AU, { cultureOf: () => cu }), s = Object.assign({}, sample, { isCity: tier > 0, pop: [3, 5, 10, 20, 40][tier], isCapital: tier === 4, buildings: walls ? ['walls'] : [] });
  assert.strictEqual(CT.tierOf(s), tier);
  const r = CT.buildCity(AX, g, s, (x, z) => F.heightAt(x, z), {}), v = r.batch.p.length / 3;
  assert(v > 0 && v % 3 === 0 && r.batch.c.length === v * 4 && r.batch.p.every(Number.isFinite) && r.batch.n.every(Number.isFinite) && Number.isFinite(r.top), cu + ' tier ' + tier + ' malformed');
  cityTris += v / 3;
})));
// the same with the Blender buildings (godot/models): every culture has its houses and landmarks, walls and castles merge cleanly
const MD = {};
const models = n => (n in MD ? MD[n] : (MD[n] = fs.existsSync(path.join(__dirname, '../../godot/models', n + '.json')) ? JSON.parse(fs.readFileSync(path.join(__dirname, '../../godot/models', n + '.json'), 'utf8')) : null));
let modelTris = 0;
Object.keys(AU.PALACE_STYLES).forEach(cu => {
  [0, 1, 2].forEach(v => assert(models('house_' + cu + '_' + v), 'no Blender house ' + cu + ' ' + v));
  [0, 1, 2, 3, 4].forEach(tier => {
    assert(models('landmark_' + cu + '_' + tier), 'no Blender landmark ' + cu + ' ' + tier);
    const AX = Object.assign({}, AU, { cultureOf: () => cu }), s = Object.assign({}, sample, { isCity: tier > 0, pop: [3, 5, 10, 20, 40][tier], isCapital: tier === 4, buildings: tier > 2 ? ['castle'] : ['walls'] });
    const r = CT.buildCity(AX, g, s, (x, z) => F.heightAt(x, z), { models }), v = r.batch.p.length / 3;
    assert(v > 0 && v % 3 === 0 && r.batch.c.length === v * 4 && r.batch.p.every(Number.isFinite) && r.batch.n.every(Number.isFinite) && r.batch.c.every(Number.isFinite) && Number.isFinite(r.top), cu + ' tier ' + tier + ' (models) malformed');
    modelTris = Math.max(modelTris, v / 3);
  });
});
const noModel = Object.keys(AU.UNITS).filter(t => !models('unit_' + t));
assert(!noModel.length, 'units without a 3D model: ' + noModel.join(', '));
console.log('units   ', Object.keys(AU.UNITS).length + ' unit types, every one with a 3D model');
console.log('cities  ', 'Blender buildings for every culture; the biggest walled metropolis ' + modelTris + ' triangles');
Object.keys(g.settlements).forEach(id => check('city ' + id, CT.buildCity(AU, g, g.settlements[id], (x, z) => F.heightAt(x, z), { view: id === Object.keys(g.settlements)[0] }).batch));
console.log('cities  ', Object.keys(AU.PALACE_STYLES).length + ' styles x 5 tiers x walls: ' + cityTris + ' triangles');
console.log('geo ok, turn ' + g.turn + ', ' + Object.keys(g.settlements).length + ' settlements, ' + Object.keys(g.units).length + ' units');
