"use strict";
// Hand-painted cartoon props built in code (no art assets): round trees, soft pines, palms, bushes, grass tufts, rocks and reeds.
// Each returns a batch { p, n, c } in local space (y up, base at y = 0) with smooth normals for soft toon shading and
// bottom-to-top colour gradients; Godot instances them with MultiMesh (per-instance tint) and sways them in the wind.

function batch() { return { p: [], n: [], c: [] }; }
function vert(b, p, n, c, uv) { b.p.push(p[0], p[1], p[2]); b.n.push(n[0], n[1], n[2]); b.c.push(c[0], c[1], c[2], 1); if (uv) (b.uv = b.uv || []).push(uv[0], uv[1]); }
function norm(v) { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
function hash1(i) { let h = (i * 2654435761) >>> 0; h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13; return (h >>> 0) / 4294967296; }
function rgb(hex) { const v = parseInt(hex.slice(1), 16); return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255]; }
function lerp3(a, b, k) { k = Math.max(0, Math.min(1, k)); return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]; }

// unit icosphere, subdivided once (80 faces): smooth enough for soft shading, cheap enough to instance by the thousand
const ICO = (() => {
  const t = (1 + Math.sqrt(5)) / 2;
  const v = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map(norm);
  const f = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  const mid = {}, m = (a, b) => { const k = a < b ? a + '_' + b : b + '_' + a; if (mid[k] === undefined) { mid[k] = v.length; v.push(norm([(v[a][0] + v[b][0]) / 2, (v[a][1] + v[b][1]) / 2, (v[a][2] + v[b][2]) / 2])); } return mid[k]; };
  const nf = []; f.forEach(([a, b, c]) => { const ab = m(a, b), bc = m(b, c), ca = m(c, a); nf.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]); });
  return { v, f: nf };
})();
// a soft lumpy blob: ellipsoid with gentle per-vertex bumps; colour runs from c0 (underside) to c1 (sunlit top)
function blob(b, cx, cy, cz, rx, ry, rz, c0, c1, seed, lump) {
  const P = ICO.v.map((d, i) => { const k = 1 + (hash1(seed * 131 + i) - 0.5) * (lump === undefined ? 0.18 : lump); return [cx + d[0] * rx * k, cy + d[1] * ry * k, cz + d[2] * rz * k]; });
  const N = ICO.v.map(d => norm([d[0] / rx, d[1] / ry, d[2] / rz]));
  const C = ICO.v.map(d => lerp3(c0, c1, d[1] * 0.5 + 0.55));
  ICO.f.forEach(face => face.forEach(i => vert(b, P[i], N[i], C[i])));
}
// cone or frustum around a vertical axis with smooth sides; colour from c0 at the bottom to c1 at the top
function cone(b, x, z, y0, r0, y1, r1, sides, c0, c1) {
  const slope = (r0 - r1) / Math.max(1e-6, y1 - y0);
  for (let s = 0; s < sides; s++) {
    const a0 = 2 * Math.PI * s / sides, a1 = 2 * Math.PI * (s + 1) / sides;
    const n0 = norm([Math.cos(a0), slope, Math.sin(a0)]), n1 = norm([Math.cos(a1), slope, Math.sin(a1)]);
    const P0 = [x + Math.cos(a0) * r0, y0, z + Math.sin(a0) * r0], P1 = [x + Math.cos(a1) * r0, y0, z + Math.sin(a1) * r0];
    const Q0 = [x + Math.cos(a0) * r1, y1, z + Math.sin(a0) * r1], Q1 = [x + Math.cos(a1) * r1, y1, z + Math.sin(a1) * r1];
    vert(b, P0, n0, c0); vert(b, P1, n1, c0); vert(b, Q1, n1, c1);
    if (r1 > 1e-4) { vert(b, P0, n0, c0); vert(b, Q1, n1, c1); vert(b, Q0, n0, c1); }
    vert(b, [x, y0, z], [0, -1, 0], c0); vert(b, P1, [0, -1, 0], c0); vert(b, P0, [0, -1, 0], c0); // underside, so tiers read solid from any angle
  }
}

const BARK = rgb('#7a4a2c'), BARK_LIGHT = rgb('#9a6238');

// Fluffy foliage: many small leaf-cluster cards spread over a canopy ellipsoid. Every card takes the canopy's spherical normal,
// so the light shades the whole crown like one soft ball while the leaf shapes (drawn by the leaf shader) give leafy edges.
// Returns a card batch with UVs; c0/c1 colour the underside and the sunlit top.
function canopy(b, cx, cy, cz, rx, ry, rz, cards, size, c0, c1, seed) {
  for (let k = 0; k < cards; k++) {
    const u = hash1(seed * 977 + k * 13), v = hash1(seed * 541 + k * 29), th = Math.acos(1 - 2 * u * 0.92), ph = 2 * Math.PI * v; // skip the very bottom
    const d = [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)], r = 0.82 + 0.25 * hash1(seed * 31 + k);
    const P = [cx + d[0] * rx * r, cy + d[1] * ry * r, cz + d[2] * rz * r], n = norm([d[0] / rx, d[1] / ry, d[2] / rz]);
    const a = norm([hash1(k * 7 + seed) - 0.5, hash1(k * 11 + seed) - 0.5, hash1(k * 17 + seed) - 0.5]); // a random card plane
    const t1 = norm([a[1] * n[2] - a[2] * n[1], a[2] * n[0] - a[0] * n[2], a[0] * n[1] - a[1] * n[0]]);
    const t2 = [n[1] * t1[2] - n[2] * t1[1], n[2] * t1[0] - n[0] * t1[2], n[0] * t1[1] - n[1] * t1[0]];
    const sz = size * (0.8 + 0.45 * hash1(seed * 3 + k)), col = lerp3(c0, c1, d[1] * 0.55 + 0.5 + (hash1(k + seed * 5) - 0.5) * 0.2);
    const q = (s1, s2) => [P[0] + (t1[0] * s1 + t2[0] * s2) * sz, P[1] + (t1[1] * s1 + t2[1] * s2) * sz, P[2] + (t1[2] * s1 + t2[2] * s2) * sz];
    const A = q(-1, -1), B = q(1, -1), C = q(1, 1), D = q(-1, 1);
    vert(b, A, n, col, [0, 0]); vert(b, B, n, col, [1, 0]); vert(b, C, n, col, [1, 1]);
    vert(b, A, n, col, [0, 0]); vert(b, C, n, col, [1, 1]); vert(b, D, n, col, [0, 1]);
  }
}
// fluffy deciduous tree in two parts: a solid trunk with a dark inner crown (no see-through holes) and the leaf cards
function fluffyTree() {
  const solid = batch(), leaves = batch(), dark = rgb('#2f7a34'), light = rgb('#a8dc66'), core = rgb('#2a6a2e');
  cone(solid, 0, 0, 0, 0.05, 0.26, 0.032, 7, BARK, BARK_LIGHT);
  cone(solid, 0.02, 0.01, 0.16, 0.022, 0.3, 0.012, 5, BARK, BARK_LIGHT);
  blob(solid, 0, 0.42, 0, 0.19, 0.16, 0.19, core, core, 21, 0.1);
  blob(solid, 0.1, 0.36, 0.06, 0.12, 0.1, 0.12, core, core, 22, 0.1);
  canopy(leaves, 0, 0.43, 0, 0.24, 0.2, 0.24, 46, 0.085, dark, light, 1);
  canopy(leaves, 0.13, 0.36, 0.08, 0.15, 0.13, 0.15, 20, 0.07, dark, light, 2);
  canopy(leaves, -0.1, 0.37, -0.07, 0.14, 0.12, 0.14, 18, 0.07, dark, light, 3);
  return { solid, leaves };
}
function fluffyBush() {
  const solid = batch(), leaves = batch(), dark = rgb('#3a8a3a'), light = rgb('#b4e070'), core = rgb('#2f7432');
  blob(solid, 0, 0.07, 0, 0.11, 0.07, 0.11, core, core, 31, 0.1);
  canopy(leaves, 0, 0.08, 0, 0.14, 0.1, 0.14, 22, 0.06, dark, light, 4);
  return { solid, leaves };
}

function roundTree() { // a chunky deciduous tree: short trunk, a cloud of leafy blobs
  const b = batch(), dark = rgb('#2f7d32'), light = rgb('#9ad65a');
  cone(b, 0, 0, 0, 0.045, 0.22, 0.03, 7, BARK, BARK_LIGHT);
  blob(b, 0, 0.38, 0, 0.21, 0.19, 0.21, dark, light, 1);
  blob(b, 0.13, 0.31, 0.06, 0.14, 0.13, 0.14, dark, light, 2);
  blob(b, -0.12, 0.32, -0.05, 0.14, 0.12, 0.13, dark, light, 3);
  blob(b, 0.02, 0.5, -0.07, 0.12, 0.11, 0.12, dark, light, 4);
  return b;
}
function pineTree() { // a soft stacked pine with a round tip
  const b = batch(), dark = rgb('#1f6646'), light = rgb('#5fb874');
  cone(b, 0, 0, 0, 0.035, 0.14, 0.03, 6, BARK, BARK_LIGHT);
  cone(b, 0, 0, 0.1, 0.2, 0.32, 0.05, 10, dark, light);
  cone(b, 0, 0, 0.24, 0.16, 0.45, 0.04, 10, dark, light);
  cone(b, 0, 0, 0.37, 0.11, 0.57, 0.02, 10, dark, light);
  blob(b, 0, 0.58, 0, 0.035, 0.035, 0.035, light, light, 9, 0);
  return b;
}
function palmTree() { // jungle palm: a leaning ringed trunk and drooping fronds
  const b = batch(), green0 = rgb('#2c7a2e'), green1 = rgb('#8fd04c'), top = [0.09, 0.55];
  for (let s = 0; s < 6; s++) {
    const f0 = s / 6, f1 = (s + 1) / 6, sub = batch();
    cone(sub, 0, 0, top[1] * f0, 0.04 - 0.012 * f0, top[1] * f1, 0.04 - 0.012 * f1, 6, s % 2 ? BARK : BARK_LIGHT, s % 2 ? BARK_LIGHT : BARK);
    for (let i = 0; i < sub.p.length; i += 3) { const f = sub.p[i + 1] / top[1]; sub.p[i] += top[0] * f * f; } // lean, more toward the top
    b.p.push(...sub.p); b.n.push(...sub.n); b.c.push(...sub.c);
  }
  for (let k = 0; k < 7; k++) { // fronds: bent strips, light near the crown and darker at the tips
    const a = 2 * Math.PI * k / 7 + 0.3, dx = Math.cos(a), dz = Math.sin(a), px = -dz, pz = dx, L = 0.3;
    let prev = null;
    for (let s = 0; s <= 4; s++) {
      const f = s / 4, w = 0.06 * Math.sin(Math.PI * Math.min(0.95, f + 0.1)), x = top[0] + dx * L * f, z = dz * L * f, y = top[1] + 0.06 * f - 0.22 * f * f;
      const cur = [[x + px * w, y, z + pz * w], [x - px * w, y, z - pz * w]], col = lerp3(green1, green0, f), n = [0, 1, 0];
      if (prev) { vert(b, prev[0], n, prev[2]); vert(b, prev[1], n, prev[2]); vert(b, cur[1], n, col); vert(b, prev[0], n, prev[2]); vert(b, cur[1], n, col); vert(b, cur[0], n, col); }
      prev = [cur[0], cur[1], col];
    }
  }
  blob(b, top[0], top[1] - 0.02, 0, 0.05, 0.04, 0.05, rgb('#6b4a2a'), rgb('#8a6238'), 7, 0.1); // crown
  return b;
}
function bush() { const b = batch(), d = rgb('#3a8a3a'), l = rgb('#a6dc62'); blob(b, 0, 0.08, 0, 0.12, 0.09, 0.12, d, l, 11); blob(b, 0.08, 0.06, 0.05, 0.08, 0.07, 0.08, d, l, 12); return b; }
function rock() { const b = batch(); blob(b, 0, 0.05, 0, 0.16, 0.11, 0.14, rgb('#8d939c'), rgb('#e2e4e6'), 5, 0.16); return b; } // big smooth pale boulder
function tuft() { // a few bright grass blades
  const b = batch(), base = rgb('#4f9a3a'), tip = rgb('#c3e872');
  for (let k = 0; k < 5; k++) {
    const a = 2 * Math.PI * k / 5 + hash1(k) * 0.8, ox = Math.cos(a) * 0.025, oz = Math.sin(a) * 0.025, h = 0.09 + hash1(k + 9) * 0.06, w = 0.012;
    const n = norm([Math.cos(a), 0.6, Math.sin(a)]);
    vert(b, [ox - Math.sin(a) * w, 0, oz + Math.cos(a) * w], n, base); vert(b, [ox + Math.sin(a) * w, 0, oz - Math.cos(a) * w], n, base); vert(b, [ox + Math.cos(a) * 0.04, h, oz + Math.sin(a) * 0.04], n, tip);
  }
  return b;
}
function reed() {
  const b = batch(), base = rgb('#4f7a3a'), tip = rgb('#d8c070');
  [[0, 0], [0.04, 0.02], [-0.03, 0.03], [0.01, -0.04]].forEach((o, k) => cone(b, o[0], o[1], 0, 0.012, 0.2 + k * 0.03, 0.0, 4, base, tip));
  return b;
}

module.exports = { roundTree, pineTree, palmTree, bush, rock, tuft, reed, fluffyTree, fluffyBush };
