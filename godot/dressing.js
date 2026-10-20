"use strict";
// Resource scenery, Civ 6 style: besides its icon (main.js shows the painted resource picture on a round badge), a resource
// tile is dressed with the thing itself spread over the tile: grazing horses, cattle, sheep and deer, wheat fields and rice
// paddies, vineyards and plantations, ore outcrops with coloured veins, gem crystals, quarried stone, salt piles, oil pools,
// fish shoals, crabs, whales and pearl shells. All built in code (no art assets), in the props' painted style: each model is a
// batch { p, n, c } in local space (y up, base at y = 0), instanced per model with MultiMesh like the trees.
const props = typeof process !== 'undefined' && process.versions && process.versions.node ? require('./props.js') : require('res://props.js');
const { batch, blob, cone, rgb, hash1 } = props;

const shade = (c, k) => [c[0] * k, c[1] * k, c[2] * k];

// ---- animals: a body, a head on a neck, four legs and a tail; all face +x (the instance yaw turns them) ----
function animal(o) {
  const b = batch(), L = o.size, body = o.body, dark = o.dark || shade(body, 0.7), legH = L * (o.legs || 0.45), bk = o.bulk || 1, th = o.thick || 1;
  const by = legH + L * 0.18;                                                                     // body centre height
  [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([sx, sz]) => cone(b, sx * L * 0.3, sz * L * 0.13 * bk, 0, L * 0.075 * th, by, L * 0.09 * th, 6, dark, shade(body, 0.85)));
  blob(b, 0, by, 0, L * 0.52, L * 0.25 * bk, L * 0.26 * bk, shade(body, 0.8), body, o.seed, 0.06);
  if (o.spots) for (let k = 0; k < 3; k++) blob(b, (k - 1) * L * 0.28, by + L * 0.08, (k % 2 ? 1 : -1) * L * 0.14 * bk, L * 0.14, L * 0.12, L * 0.14, o.spots, o.spots, o.seed + k, 0.1);
  // neck: a chain of blobs from the shoulders up to the head (down to the grass when grazing)
  const hx = L * (o.reach || 0.66), hy = o.headDown ? legH * 0.45 : by + L * (o.neckUp === undefined ? 0.36 : o.neckUp);
  const sx0 = L * 0.36, sy0 = by + L * 0.06;
  for (let k = 0; k <= 3; k++) { const f = k / 3, r = L * (0.15 - 0.03 * f) * (o.neckW || 1); blob(b, sx0 + (hx - sx0) * f * 0.85, sy0 + (hy - sy0) * f * 0.85, 0, r, r, r * 0.9, shade(body, 0.85), body, o.seed + 30 + k, 0.04); }
  if (o.mane) for (let k = 0; k <= 3; k++) { const f = k / 3; blob(b, sx0 + (hx - sx0) * f * 0.8 - L * 0.05, sy0 + (hy - sy0) * f * 0.8 + L * 0.1, 0, L * 0.07, L * 0.07, L * 0.04, o.mane, o.mane, o.seed + 40 + k, 0.1); }
  blob(b, hx, hy, 0, L * 0.17, L * 0.13, L * 0.12, shade(body, 0.85), body, o.seed + 9, 0.05);               // head
  blob(b, hx + L * 0.14, hy - L * 0.04, 0, L * 0.11 * (o.snout || 1), L * 0.08, L * 0.085, dark, shade(dark, 1.3), o.seed + 10, 0.05); // muzzle
  if (!o.ears) [-1, 1].forEach(s => cone(b, hx - L * 0.06, s * L * 0.07, hy + L * 0.08, L * 0.035, hy + L * 0.19, L * 0.005, 4, dark, body)); // pointed ears
  cone(b, -L * 0.5, 0, by - L * 0.25, L * 0.035 * (o.tail || 1), by + L * 0.05, L * 0.06 * (o.tail || 1), 5, o.tailCol || dark, o.tailCol || dark);
  if (o.antlers) [-1, 1].forEach(s => { cone(b, hx - L * 0.04, s * L * 0.06, hy + L * 0.1, L * 0.02, hy + L * 0.42, L * 0.006, 4, rgb('#e8dcc0'), rgb('#f2ead6')); cone(b, hx - L * 0.02, s * L * 0.12, hy + L * 0.22, L * 0.012, hy + L * 0.36, L * 0.004, 4, rgb('#e8dcc0'), rgb('#f2ead6')); });
  if (o.horns) [-1, 1].forEach(s => cone(b, hx - L * 0.04, s * L * 0.1, hy + L * 0.08, L * 0.03, hy + L * 0.2, L * 0.006, 4, rgb('#efe6cf'), rgb('#fbf6e6')));
  if (o.tusks) [-1, 1].forEach(s => cone(b, hx + L * 0.16, s * L * 0.07, hy - L * 0.28, L * 0.03, hy - L * 0.04, L * 0.006, 5, rgb('#fbf6e6'), rgb('#fbf6e6')));
  if (o.trunk) for (let k = 0; k < 4; k++) blob(b, hx + L * (0.18 + 0.03 * k), hy - L * (0.1 + 0.1 * k), 0, L * (0.07 - 0.01 * k), L * 0.07, L * (0.07 - 0.01 * k), dark, body, o.seed + 50 + k, 0.03);
  if (o.ears) [-1, 1].forEach(s => blob(b, hx - L * 0.08, hy + L * 0.02, s * L * 0.15, L * 0.05, L * 0.15, L * 0.12, dark, body, o.seed + 20 + s, 0.05));
  return b;
}
const ANIMALS = {
  horse: () => animal({ size: 0.16, body: rgb('#9a5a2e'), dark: rgb('#4a2a16'), mane: rgb('#2e1a0e'), legs: 0.62, neckUp: 0.42, reach: 0.72, snout: 1.3, tailCol: rgb('#2e1a0e'), tail: 1.4, seed: 1 }),
  horse2: () => animal({ size: 0.16, body: rgb('#ece6da'), dark: rgb('#8a8070'), mane: rgb('#cfc6b4'), legs: 0.62, headDown: true, reach: 0.7, snout: 1.3, tailCol: rgb('#cfc6b4'), tail: 1.4, seed: 2 }),
  cattle: () => animal({ size: 0.16, body: rgb('#f4efe6'), dark: rgb('#3a3230'), spots: rgb('#2c2624'), legs: 0.4, neckUp: 0.1, reach: 0.6, neckW: 1.3, bulk: 1.2, thick: 1.3, horns: true, seed: 3 }),
  cattle2: () => animal({ size: 0.16, body: rgb('#8a4a28'), dark: rgb('#3e2416'), legs: 0.4, headDown: true, reach: 0.6, neckW: 1.3, bulk: 1.2, thick: 1.3, horns: true, seed: 4 }),
  sheep: () => { const b = animal({ size: 0.12, body: rgb('#f6f2ea'), dark: rgb('#3a3634'), legs: 0.35, neckUp: 0.12, reach: 0.58, bulk: 1.3, thick: 0.9, seed: 5 });
    for (let k = 0; k < 5; k++) blob(b, (k - 2) * 0.022, 0.085 + (k % 2) * 0.012, (k % 2 ? 0.022 : -0.022), 0.04, 0.04, 0.04, rgb('#e2ddd2'), rgb('#ffffff'), 50 + k, 0.2); return b; }, // fleece
  deer: () => animal({ size: 0.14, body: rgb('#b9783e'), dark: rgb('#6a4022'), legs: 0.75, neckUp: 0.5, reach: 0.68, antlers: true, tail: 0.6, tailCol: rgb('#f2e8d8'), seed: 6 }),
  elephant: () => animal({ size: 0.24, body: rgb('#8c8a88'), dark: rgb('#6a6866'), legs: 0.5, neckUp: 0.15, reach: 0.55, neckW: 1.5, bulk: 1.35, thick: 1.9, snout: 0.6, tusks: true, trunk: true, ears: true, tail: 0.5, seed: 7 }),
  fox: () => animal({ size: 0.11, body: rgb('#d8742a'), dark: rgb('#3a2418'), legs: 0.4, neckUp: 0.25, reach: 0.62, snout: 1.2, tail: 2.2, tailCol: rgb('#f2ece0'), seed: 8 })
};

// ---- plants and fields ----
function patch(b, w, d, col, edge) { // a low planted bed
  blob(b, 0, 0.0, 0, w / 2, 0.025, d / 2, edge || shade(col, 0.8), col, 60, 0.05);
}
function wheatField() {
  const b = batch(), gold = rgb('#e8c25a'), dark = rgb('#b8892e');
  patch(b, 0.36, 0.26, rgb('#c9a548'));
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) cone(b, -0.13 + i * 0.087, -0.08 + j * 0.08, 0, 0.03, 0.09 + 0.02 * hash1(i * 3 + j), 0.012, 5, dark, gold); // sheaves of ripe wheat
  return b;
}
function ricePaddy() {
  const b = batch(), water = rgb('#7fc6c0'), green = rgb('#6fbf4a'), dark = rgb('#3e8a2e');
  patch(b, 0.36, 0.26, water, rgb('#8a7a52'));
  for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) cone(b, -0.14 + i * 0.07, -0.08 + j * 0.08, 0.01, 0.018, 0.08, 0.004, 4, dark, green);
  return b;
}
function bush(c0, c1, dots, seed, size) { // a round shrub, optionally dotted with flowers, fruit or bolls
  const b = batch(), s = size || 1;
  blob(b, 0, 0.06 * s, 0, 0.08 * s, 0.065 * s, 0.08 * s, c0, c1, seed, 0.15);
  if (dots) for (let k = 0; k < 7; k++) { const a = k * 2.4 + seed, r = 0.06 * s; blob(b, Math.cos(a) * r, (0.06 + 0.04 * Math.sin(k * 1.7)) * s, Math.sin(a) * r, 0.018 * s, 0.018 * s, 0.018 * s, dots, dots, seed + k, 0.1); }
  return b;
}
function smallTree(trunk, c0, c1, dots, seed) {
  const b = batch();
  cone(b, 0, 0, 0, 0.02, 0.12, 0.014, 6, trunk, trunk);
  blob(b, 0, 0.15, 0, 0.08, 0.07, 0.08, c0, c1, seed, 0.15);
  if (dots) for (let k = 0; k < 6; k++) { const a = k * 2.1 + seed; blob(b, Math.cos(a) * 0.065, 0.15 + 0.03 * Math.sin(k), Math.sin(a) * 0.065, 0.016, 0.02, 0.016, dots, dots, seed + k, 0.1); }
  return b;
}
function bananaPlant() {
  const b = batch(), leaf = rgb('#5fae3a'), leafD = rgb('#2f7a2a');
  cone(b, 0, 0, 0, 0.025, 0.16, 0.02, 6, rgb('#7a8a3a'), rgb('#9aae4a'));
  for (let k = 0; k < 5; k++) { const a = k * 1.26; blob(b, Math.cos(a) * 0.07, 0.17, Math.sin(a) * 0.07, 0.08, 0.012, 0.03, leafD, leaf, 70 + k, 0.05); }
  blob(b, 0.03, 0.12, 0, 0.025, 0.035, 0.025, rgb('#d8b830'), rgb('#f2dc4a'), 77, 0.15); // a bunch of bananas
  return b;
}
function vineRow() {
  const b = batch(), post = rgb('#6a4a2c');
  [-0.12, 0, 0.12].forEach(x => cone(b, x, 0, 0, 0.008, 0.11, 0.008, 4, post, post));
  for (let k = 0; k < 4; k++) blob(b, -0.12 + k * 0.08, 0.08, 0, 0.045, 0.04, 0.035, rgb('#3e7a2e'), rgb('#6ea844'), 80 + k, 0.15);
  for (let k = 0; k < 4; k++) blob(b, -0.1 + k * 0.07, 0.05, 0.03, 0.016, 0.022, 0.016, rgb('#4a1e4a'), rgb('#7a3a7a'), 85 + k, 0.1); // grapes
  return b;
}

// ---- minerals: outcrops of rock with coloured veins or crystals ----
function outcrop(rock, vein, seed, crystals) {
  const b = batch();
  blob(b, 0, 0.04, 0, 0.1, 0.07, 0.085, shade(rock, 0.7), rock, seed, 0.3);
  blob(b, 0.08, 0.025, 0.05, 0.06, 0.045, 0.05, shade(rock, 0.7), rock, seed + 1, 0.3);
  if (vein) for (let k = 0; k < 4; k++) { const a = k * 1.7 + seed; blob(b, Math.cos(a) * 0.06, 0.06 + 0.02 * (k % 2), Math.sin(a) * 0.05, 0.026, 0.02, 0.022, shade(vein, 0.8), vein, seed + 10 + k, 0.2); }
  if (crystals) for (let k = 0; k < 5; k++) { const a = k * 1.3 + seed, x = Math.cos(a) * 0.05, z = Math.sin(a) * 0.045; cone(b, x, z, 0.03, 0.022, 0.12 + 0.04 * hash1(seed + k), 0.002, 5, shade(crystals, 0.75), crystals); }
  return b;
}
function stoneBlocks() {
  const b = batch(), c = rgb('#bdb6aa');
  const add = (x, y, z, s) => blob(b, x, y + s * 0.5, z, s * 0.7, s * 0.5, s * 0.6, shade(c, 0.78), c, 91 + x * 100, 0.02);
  add(0, 0, 0, 0.09); add(0.09, 0, 0.03, 0.07); add(0.04, 0.07, 0.01, 0.06); add(-0.08, 0, 0.05, 0.06);
  return b;
}
function saltPiles() {
  const b = batch(), w = rgb('#f6f4ee'), s = rgb('#cfc8bc');
  [[0, 0, 0.07], [0.1, 0.04, 0.05], [-0.08, 0.05, 0.05]].forEach(([x, z, r]) => cone(b, x, z, 0, r, r * 1.1, 0.004, 9, s, w));
  return b;
}
function oilPool() {
  const b = batch();
  blob(b, 0, 0.0, 0, 0.13, 0.012, 0.09, rgb('#0e0c10'), rgb('#2a2638'), 95, 0.05);
  blob(b, 0.03, 0.01, -0.02, 0.04, 0.006, 0.025, rgb('#3a3a5a'), rgb('#6a5a8a'), 96, 0.05); // a sheen
  return b;
}

// ---- water ----
function fishShoal() {
  const b = batch(), c = rgb('#3c6a8a'), l = rgb('#8ac0d8');
  for (let k = 0; k < 4; k++) { const a = k * 1.6; blob(b, Math.cos(a) * 0.07, 0.01, Math.sin(a) * 0.05, 0.035, 0.012, 0.014, c, l, 100 + k, 0.05); }
  blob(b, 0.02, 0.05, 0, 0.03, 0.014, 0.012, rgb('#b8c8d0'), rgb('#e8f0f4'), 105, 0.05); // one leaping
  return b;
}
function crab() {
  const b = batch(), c = rgb('#d8542a'), d = rgb('#8a2a14');
  blob(b, 0, 0.02, 0, 0.04, 0.018, 0.032, d, c, 110, 0.05);
  [-1, 1].forEach(s => blob(b, 0.045, 0.025, s * 0.03, 0.016, 0.012, 0.012, d, c, 111 + s, 0.05));
  return b;
}
function whale() {
  const b = batch(), c = rgb('#3a4a5e'), l = rgb('#6a7e94');
  blob(b, 0, 0.0, 0, 0.16, 0.035, 0.06, c, l, 120, 0.05);
  cone(b, -0.17, 0, 0.0, 0.015, 0.06, 0.005, 4, c, c);
  blob(b, -0.18, 0.07, 0, 0.012, 0.012, 0.05, c, l, 121, 0.05); // tail flukes
  cone(b, 0.08, 0, 0.03, 0.012, 0.12, 0.03, 6, rgb('#d8eef6'), rgb('#ffffff')); // spout
  return b;
}
function pearlShell() {
  const b = batch(), s = rgb('#d8ccc0'), i = rgb('#f2e8ee');
  blob(b, 0, 0.012, 0, 0.05, 0.012, 0.045, shade(s, 0.8), s, 130, 0.08);
  blob(b, -0.02, 0.04, 0, 0.012, 0.045, 0.042, shade(i, 0.85), i, 131, 0.05); // the open upper half
  blob(b, 0.01, 0.028, 0, 0.014, 0.014, 0.014, rgb('#e6e0ea'), rgb('#ffffff'), 132, 0.02); // the pearl
  return b;
}

// every model by name, and which material animates it: 'still' for animals, rocks and water things, 'sway' for plants
const MODELS = {
  horse: [ANIMALS.horse, 'still'], horse2: [ANIMALS.horse2, 'still'], cattle: [ANIMALS.cattle, 'still'], cattle2: [ANIMALS.cattle2, 'still'],
  sheep: [ANIMALS.sheep, 'still'], deer: [ANIMALS.deer, 'still'], elephant: [ANIMALS.elephant, 'still'], fox: [ANIMALS.fox, 'still'],
  wheat: [wheatField, 'sway'], rice: [ricePaddy, 'sway'], banana: [bananaPlant, 'sway'], vines: [vineRow, 'sway'],
  cotton: [() => bush(rgb('#3e7a32'), rgb('#6aa44a'), rgb('#ffffff'), 140), 'sway'],
  spices: [() => bush(rgb('#3a6a2a'), rgb('#5e9a3a'), rgb('#d83a1e'), 141), 'sway'],
  dyes: [() => bush(rgb('#3a6a34'), rgb('#62a046'), rgb('#7a3ac8'), 142), 'sway'],
  silk: [() => smallTree(rgb('#6a4a2c'), rgb('#3e7a32'), rgb('#72ae4a'), rgb('#f6f2e2'), 143), 'sway'],
  incense: [() => smallTree(rgb('#8a6a4a'), rgb('#7a8a5a'), rgb('#a8b47a'), rgb('#e8d8a8'), 144), 'sway'],
  rubber: [() => smallTree(rgb('#7a6a5a'), rgb('#2a6a2e'), rgb('#4e9a3e'), null, 145), 'sway'],
  iron: [() => outcrop(rgb('#7a6e66'), rgb('#a8442a'), 150), 'still'], copper: [() => outcrop(rgb('#857a6e'), rgb('#3aa88a'), 151), 'still'],
  coal: [() => outcrop(rgb('#5a5650'), rgb('#1a1a1e'), 152), 'still'], niter: [() => outcrop(rgb('#8a8278'), rgb('#f2eee2'), 153), 'still'],
  aluminum: [() => outcrop(rgb('#8a8a90'), rgb('#d8dce4'), 154), 'still'], uranium: [() => outcrop(rgb('#6a6a64'), null, 155, rgb('#7af04a')), 'still'],
  gems: [() => outcrop(rgb('#8a847a'), null, 156, rgb('#d83a9a')), 'still'], gems2: [() => outcrop(rgb('#8a847a'), null, 157, rgb('#3a8ae8')), 'still'],
  stone: [stoneBlocks, 'still'], salt: [saltPiles, 'still'], oil: [oilPool, 'still'],
  fish: [fishShoal, 'still'], crab: [crab, 'still'], whale: [whale, 'still'], pearl: [pearlShell, 'still']
};
// what dresses each resource's tile: [model, count, scale]
const DRESS = {
  horses: [['horse', 2, 1.5], ['horse2', 2, 1.5]], cattle: [['cattle', 2, 1.5], ['cattle2', 2, 1.5]], sheep: [['sheep', 4, 1.6]], deer: [['deer', 3, 1.6]],
  ivory: [['elephant', 2, 1.4]], furs: [['fox', 4, 1.7]], wheat: [['wheat', 4, 1.4]], rice: [['rice', 4, 1.4]], bananas: [['banana', 5, 1.5]],
  wine: [['vines', 4, 1.5]], cotton: [['cotton', 6, 1.5]], spices: [['spices', 6, 1.5]], dyes: [['dyes', 6, 1.5]], silk: [['silk', 5, 1.5]],
  incense: [['incense', 5, 1.5]], rubber: [['rubber', 5, 1.5]], iron: [['iron', 4, 1.4]], copper: [['copper', 4, 1.4]], coal: [['coal', 4, 1.4]],
  niter: [['niter', 4, 1.4]], aluminum: [['aluminum', 4, 1.4]], uranium: [['uranium', 4, 1.4]], gems: [['gems', 2, 1.4], ['gems2', 2, 1.4]],
  stone: [['stone', 4, 1.4]], salt: [['salt', 4, 1.4]], oil: [['oil', 3, 1.4]], fish: [['fish', 4, 1.6]], crabs: [['crab', 5, 1.7]],
  whales: [['whale', 2, 1.4]], pearls: [['pearl', 4, 1.7]]
};
const WATER = { fish: 1, crabs: 1, whales: 1, pearls: 1 };

// Placements for every shown resource tile: { model: [[x, y, z, yaw, scale, 1, 1, 1], ...] } (the scatter format). Spread over
// the tile in a ring around the centre (the centre holds the icon), facing every which way. shows(t) says which tiles count.
function buildDressing(F, g, shows) {
  const out = {};
  g.tiles.forEach(t => {
    if (!t.resource || !DRESS[t.resource] || !shows(t)) return;
    const c = [Math.sqrt(3) * (t.col + 0.5 * (t.row & 1)), 1.5 * t.row], rnd = k => hash1(t.i * 613 + k * 97);
    let seq = 0;
    DRESS[t.resource].forEach(([m, n, sc]) => {
      for (let k = 0; k < n; k++, seq++) {
        const a = 2 * Math.PI * (seq / 7 + rnd(seq) * 0.12) + t.i, d = 0.34 + 0.44 * rnd(seq + 40);
        const x = c[0] + Math.cos(a) * d, z = c[1] + Math.sin(a) * d * 0.92;
        const rv = !WATER[t.resource] && F.river && F.river(x, z); if (rv && rv.d < rv.hw + 0.1) continue; // keep out of the riverbed
        const y = WATER[t.resource] ? 0.0 : Math.max(0, F.heightAt(x, z, t.i));
        (out[m] = out[m] || []).push([x, y, z, rnd(seq + 70) * Math.PI * 2, sc * (0.85 + 0.3 * rnd(seq + 90)), 1, 1, 1]);
      }
    });
  });
  return out;
}
function dressingKey(g, shows) { return g.tiles.filter(t => t.resource && shows(t)).map(t => t.i).join(','); }

module.exports = { MODELS, DRESS, buildDressing, dressingKey };
