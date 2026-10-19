// Node check for godot/geo.js: picking round-trips every tile centre, neighbours across edges match the engine's, and every batch is well formed.
const path = require('path'), assert = require('assert');
const AU = require('../../godot/engine/au_bundle.js'), geo = require('../../godot/geo.js'), G = AU.G;
const g = G.newGame({ playerCiv: 'rome', mapSize: 'small', mapType: 'continents', numCivs: 5, numStates: 3, seed: 7, difficulty: 'prince', v2: true });
const pl = G.player(g); pl.isPlayer = false; pl.ai = Object.assign({}, AU.LEADER_BY_ID[pl.leaderId].ai);
g.tiles.forEach(t => { const c = geo.center(t.col, t.row); assert.strictEqual(geo.pick(c[0], c[1], g.W, g.H), t.i); assert.strictEqual(geo.pick(c[0] + 0.5, c[1] - 0.4, g.W, g.H), t.i); });
g.tiles.forEach(t => { const c = geo.center(t.col, t.row), mine = new Set(G.neighbors(g, t));
  for (let k = 0; k < 6; k++) { const a = Math.PI / 180 * (60 + 60 * k), n = geo.pick(c[0] + geo.SQRT3 * Math.cos(a), c[1] + geo.SQRT3 * Math.sin(a), g.W, g.H); if (n >= 0) assert(mine.has(n), 'edge ' + k + ' of tile ' + t.i + ' is not a neighbour'); } });
for (let k = 0; k < 40; k++) G.endTurn(g);
function check(name, b) {
  const v = b.p.length / 3; assert(v % 3 === 0 && b.n.length === b.p.length && b.c.length === v * 4, name + ' malformed');
  assert(b.p.every(Number.isFinite) && b.n.every(Number.isFinite) && b.c.every(x => Number.isFinite(x) && x >= 0 && x <= 1.5), name + ' has bad numbers');
  console.log(name.padEnd(8), (v / 3) + ' triangles');
}
const t0 = Date.now();
check('terrain', geo.buildTerrain(AU, g)); check('borders', geo.buildBorders(AU, g)); check('pieces', geo.buildPieces(AU, g));
console.log('geo ok (' + (Date.now() - t0) + ' ms), turn ' + g.turn + ', ' + Object.keys(g.settlements).length + ' settlements, ' + Object.keys(g.units).length + ' units');
