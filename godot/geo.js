"use strict";
// Map geometry for the Godot build, in plain JS so Node can test it (tools/godot/test-geo.js).
// Builds triangle batches { p: [x,y,z...], n: [x,y,z...], c: [r,g,b,a...] } that main.js turns into meshes.
// Layout matches the web game: pointy-top hexes, "odd-r" offset (odd rows shifted right), hex radius 1.

const SQRT3 = Math.sqrt(3);
const EDGE_BASE = -0.6; // map-edge walls drop to here

function center(col, row) { return [SQRT3 * (col + 0.5 * (row & 1)), 1.5 * row]; }

// world (x, z) → tile index, or -1 off the map
function pick(x, z, W, H) {
  const q = (SQRT3 / 3 * x - z / 3), r = 2 / 3 * z, s = -q - r;
  let rq = Math.round(q), rr = Math.round(r); const rs = Math.round(s);
  const dq = Math.abs(rq - q), dr = Math.abs(rr - r), ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs; else if (dr > ds) rr = -rq - rs;
  const row = rr, col = rq + ((rr - (rr & 1)) >> 1);
  return col >= 0 && col < W && row >= 0 && row < H ? row * W + col : -1;
}

function rgb(hex, a) {
  const v = parseInt(String(hex).replace('#', ''), 16);
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255, a === undefined ? 1 : a];
}
function mix(a, b, k) { return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k, a[3] + (b[3] - a[3]) * k]; }
function shade(c, k) { return [c[0] * k, c[1] * k, c[2] * k, c[3]]; }
function hash(i) { let h = (i * 2654435761) >>> 0; h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13; return (h >>> 0) / 4294967296; }

function batch() { return { p: [], n: [], c: [] }; }
function vert(b, p, n, c) { b.p.push(p[0], p[1], p[2]); b.n.push(n[0], n[1], n[2]); b.c.push(c[0], c[1], c[2], c[3]); }
function faceNormal(a, b, c) {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
  return ny < 0 ? [-nx, -ny, -nz] : [nx, ny, nz]; // every face here looks up or sideways, never down
}
// a triangle with a flat face normal (pointing up/outward); materials draw both sides, so winding doesn't matter
function tri(b, a, p, q, c) { const n = faceNormal(a, p, q); vert(b, a, n, c); vert(b, p, n, c); vert(b, q, n, c); }
function quad(b, a, p, q, r, c, n) { n = n || faceNormal(a, p, q); vert(b, a, n, c); vert(b, p, n, c); vert(b, q, n, c); vert(b, a, n, c); vert(b, q, n, c); vert(b, r, n, c); }

// corner k of a pointy-top hex (k=0 at 30°, then every 60°; +z is "down" the map)
function corner(cx, cz, k, s) { const a = Math.PI / 180 * (30 + 60 * k); return [cx + s * Math.cos(a), cz + s * Math.sin(a)]; }
// tile across the edge between corners k and k+1 (that edge faces 60° + 60k)
function across(col, row, k, W, H) {
  const a = Math.PI / 180 * (60 + 60 * k), c = center(col, row);
  return pick(c[0] + SQRT3 * Math.cos(a), c[1] + SQRT3 * Math.sin(a), W, H);
}

function tileTop(t) {
  if (t.terrain === 'ocean') return -0.22;
  if (t.terrain === 'coast') return -0.14;
  if (t.terrain === 'lake') return -0.1;
  return 0.12 + (t.hills || t.terrain === 'mountain' ? 0.26 : 0) + (t.elev || 0) * 0.06;
}

function tileColor(AU, t) {
  const T = AU.TERRAIN[t.terrain] || { color: '#888888' };
  let c = rgb(T.color);
  if (t.hills) c = shade(c, 0.9);
  if (t.feature === 'marsh') c = mix(c, rgb('#4f7d6a'), 0.45);
  if (t.feature === 'oasis') c = mix(c, rgb('#5aa04a'), 0.5);
  const v = 0.94 + hash(t.i) * 0.12; // a little per-tile variation so the land doesn't look flat-shaded
  return shade(c, v);
}

// Static terrain: hex tops, cliff walls down to lower neighbours, mountains, trees and rivers.
function buildTerrain(AU, g) {
  const b = batch(), W = g.W, H = g.H, up = [0, 1, 0];
  const tops = g.tiles.map(tileTop);
  g.tiles.forEach(t => {
    const c = center(t.col, t.row), y = tops[t.i], col = tileColor(AU, t);
    const water = !!(AU.TERRAIN[t.terrain] || {}).water;
    for (let k = 0; k < 6; k++) { // top: a fan of six triangles
      const p = corner(c[0], c[1], k, 1), q = corner(c[0], c[1], k + 1, 1);
      vert(b, [c[0], y, c[1]], up, col); vert(b, [p[0], y, p[1]], up, col); vert(b, [q[0], y, q[1]], up, col);
    }
    const wall = water ? shade(col, 0.7) : mix(shade(col, 0.62), rgb('#6b5a45'), 0.4);
    for (let k = 0; k < 6; k++) { // walls only where this tile stands above the one across the edge
      const n = across(t.col, t.row, k, W, H), low = n < 0 ? EDGE_BASE : tops[n];
      if (low >= y - 1e-4) continue;
      const p = corner(c[0], c[1], k, 1), q = corner(c[0], c[1], k + 1, 1), a = Math.PI / 180 * (60 + 60 * k);
      quad(b, [p[0], y, p[1]], [p[0], low, p[1]], [q[0], low, q[1]], [q[0], y, q[1]], wall, [Math.cos(a), 0, Math.sin(a)]);
    }
    if (t.terrain === 'mountain') mountain(b, c, y, t.i, AU);
    if (t.feature === 'forest' || t.feature === 'jungle') trees(b, c, y, t);
  });
  (g.rivers || []).forEach(path => {
    for (let k = 0; k + 1 < path.length; k++) {
      const A = g.tiles[path[k]], B = g.tiles[path[k + 1]]; if (!A || !B) continue;
      const a = center(A.col, A.row), z = center(B.col, B.row);
      const dx = z[0] - a[0], dz = z[1] - a[1], l = Math.hypot(dx, dz) || 1, w = 0.09, ox = -dz / l * w, oz = dx / l * w;
      const ya = tops[A.i] + 0.015, yb = tops[B.i] + 0.015, col = rgb('#3f8fd6');
      quad(b, [a[0] + ox, ya, a[1] + oz], [a[0] - ox, ya, a[1] - oz], [z[0] - ox, yb, z[1] - oz], [z[0] + ox, yb, z[1] + oz], col);
    }
  });
  return b;
}

function mountain(b, c, y, seed, AU) {
  const h = 0.75 + hash(seed + 7) * 0.35, rock = rgb('#7d7a76'), snow = rgb('#eef2f4'), mid = 0.62;
  const apex = [c[0] + (hash(seed) - 0.5) * 0.2, y + h, c[1] + (hash(seed + 3) - 0.5) * 0.2];
  for (let k = 0; k < 6; k++) {
    const p = corner(c[0], c[1], k, 0.88), q = corner(c[0], c[1], k + 1, 0.88);
    const P = [p[0], y, p[1]], Q = [q[0], y, q[1]];
    const Pm = [P[0] + (apex[0] - P[0]) * mid, y + h * mid, P[2] + (apex[2] - P[2]) * mid], Qm = [Q[0] + (apex[0] - Q[0]) * mid, y + h * mid, Q[2] + (apex[2] - Q[2]) * mid];
    const rk = shade(rock, 0.85 + 0.15 * hash(seed * 6 + k));
    tri(b, P, Q, Qm, rk); tri(b, P, Qm, Pm, rk); tri(b, Pm, Qm, apex, snow);
  }
}

function trees(b, c, y, t) {
  const jungle = t.feature === 'jungle', n = jungle ? 4 : 3, green = rgb(jungle ? '#1f6b3a' : '#2f6b2a');
  for (let k = 0; k < n; k++) {
    const a = 2 * Math.PI * (k / n + hash(t.i * 5 + k) * 0.2), d = 0.42 + hash(t.i + k * 11) * 0.12;
    const x = c[0] + Math.cos(a) * d, z = c[1] + Math.sin(a) * d, r = 0.16 + hash(t.i * 3 + k) * 0.05, h = (jungle ? 0.55 : 0.45) + hash(t.i * 7 + k) * 0.1;
    const col = shade(green, 0.85 + hash(t.i * 13 + k) * 0.3), top = [x, y + 0.06 + h, z];
    for (let s = 0; s < 5; s++) {
      const a0 = 2 * Math.PI * s / 5, a1 = 2 * Math.PI * (s + 1) / 5;
      tri(b, [x + Math.cos(a0) * r, y + 0.06, z + Math.sin(a0) * r], [x + Math.cos(a1) * r, y + 0.06, z + Math.sin(a1) * r], top, col);
    }
  }
}

// Per-turn borders: a light wash over owned tiles plus a solid band along each border edge.
// tile.owner is the owning settlement's id
function ownerCiv(g, t) { const s = t && t.owner >= 0 ? g.settlements[t.owner] : null; return s ? s.civ : -1; }
function buildBorders(AU, g) {
  const b = batch(), W = g.W, H = g.H, up = [0, 1, 0];
  g.tiles.forEach(t => {
    const civ = ownerCiv(g, t); if (civ < 0 || !g.civs[civ]) return;
    const c = center(t.col, t.row), y = Math.max(tileTop(t), -0.1) + 0.03, col = rgb(g.civs[civ].color || '#ffffff');
    const wash = [col[0], col[1], col[2], 0.22];
    for (let k = 0; k < 6; k++) {
      const p = corner(c[0], c[1], k, 1), q = corner(c[0], c[1], k + 1, 1);
      vert(b, [c[0], y, c[1]], up, wash); vert(b, [p[0], y, p[1]], up, wash); vert(b, [q[0], y, q[1]], up, wash);
      const n = across(t.col, t.row, k, W, H);
      if (n >= 0 && ownerCiv(g, g.tiles[n]) === civ) continue;
      const pi = corner(c[0], c[1], k, 0.84), qi = corner(c[0], c[1], k + 1, 0.84), band = [col[0], col[1], col[2], 0.9], y2 = y + 0.005;
      vert(b, [p[0], y2, p[1]], up, band); vert(b, [q[0], y2, q[1]], up, band); vert(b, [qi[0], y2, qi[1]], up, band);
      vert(b, [p[0], y2, p[1]], up, band); vert(b, [qi[0], y2, qi[1]], up, band); vert(b, [pi[0], y2, pi[1]], up, band);
    }
  });
  return b;
}

function box(b, x, y, z, sx, sy, sz, col, roof) {
  const x0 = x - sx / 2, x1 = x + sx / 2, z0 = z - sz / 2, z1 = z + sz / 2, y1 = y + sy;
  const side = (a, p, q, r, n, c) => quad(b, a, p, q, r, c, n);
  side([x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1], [0, 1, 0], roof || col);
  side([x0, y, z1], [x1, y, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], col);
  side([x0, y, z0], [x0, y1, z0], [x1, y1, z0], [x1, y, z0], [0, 0, -1], col);
  side([x1, y, z0], [x1, y1, z0], [x1, y1, z1], [x1, y, z1], [1, 0, 0], col);
  side([x0, y, z0], [x0, y, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], col);
}
function prism(b, x, y, z, r, h, sides, col, capCol) {
  for (let s = 0; s < sides; s++) {
    const a0 = 2 * Math.PI * s / sides, a1 = 2 * Math.PI * (s + 1) / sides, am = (a0 + a1) / 2;
    const P = [x + Math.cos(a0) * r, y, z + Math.sin(a0) * r], Q = [x + Math.cos(a1) * r, y, z + Math.sin(a1) * r];
    quad(b, P, [P[0], y + h, P[2]], [Q[0], y + h, Q[2]], Q, col, [Math.cos(am), 0, Math.sin(am)]);
    tri(b, [x, y + h, z], [P[0], y + h, P[2]], [Q[0], y + h, Q[2]], capCol || col);
  }
}

// Per-turn pieces: settlements (houses in the owner's colours, a tower for capitals) and units (a token per unit).
function buildPieces(AU, g) {
  const b = batch(), walls = rgb('#d9cfbf');
  Object.keys(g.settlements).forEach(id => {
    const s = g.settlements[id], t = g.tiles[s.tile], civ = g.civs[s.civ]; if (!t || !civ) return;
    const c = center(t.col, t.row), y = tileTop(t), roof = rgb(civ.color || '#cccccc'), n = Math.min(7, 2 + Math.floor((s.pop || 1) / 2));
    for (let k = 0; k < n; k++) {
      const a = 2 * Math.PI * k / n + hash(s.id) * 2, d = k === 0 ? 0 : 0.42, sz = 0.2 + hash(s.id * 9 + k) * 0.08;
      box(b, c[0] + Math.cos(a) * d, y, c[1] + Math.sin(a) * d, sz, 0.16 + hash(s.id * 5 + k) * 0.12, sz, walls, roof);
    }
    if (s.isCapital) { prism(b, c[0], y, c[1], 0.11, 0.62, 6, walls); prism(b, c[0], y + 0.62, c[1], 0.15, 0.12, 6, roof); }
    if (s.isCity) prism(b, c[0], y, c[1], 0.78, 0.07, 6, shade(walls, 0.8), shade(walls, 0.9));
  });
  const byTile = {};
  Object.keys(g.units).forEach(id => { const u = g.units[id]; (byTile[u.tile] = byTile[u.tile] || []).push(u); });
  Object.keys(byTile).forEach(ti => {
    const t = g.tiles[ti], list = byTile[ti]; if (!t) return;
    const c = center(t.col, t.row), y = Math.max(tileTop(t), -0.12), hasTown = t.settlement !== undefined && t.settlement !== null && !!g.settlements[t.settlement];
    list.slice(0, 4).forEach((u, k) => {
      const civ = g.civs[u.civ], col = rgb((civ && civ.color) || '#999999'), U = AU.UNITS[u.type] || {}, cls = U.cls || 'melee';
      const a = Math.PI * (0.25 + 0.5 * k), d = hasTown || list.length > 1 ? 0.5 : 0, x = c[0] + Math.cos(a) * d, z = c[1] + Math.sin(a) * d + (hasTown ? 0.1 : 0);
      prism(b, x, y, z, 0.27, 0.06, 8, rgb('#f2efe6')); // base disc
      if (cls === 'civilian') prism(b, x, y + 0.06, z, 0.13, 0.3, 6, rgb('#e8d9a8'), col);
      else if (cls === 'naval') { box(b, x, y + 0.06, z, 0.56, 0.13, 0.24, shade(col, 0.8), col); prism(b, x, y + 0.19, z, 0.04, 0.4, 4, rgb('#f2efe6')); }
      else if (cls === 'cavalry') { box(b, x, y + 0.06, z, 0.4, 0.2, 0.16, col); prism(b, x + 0.11, y + 0.26, z, 0.08, 0.22, 6, col); }
      else if (cls === 'ranged' || cls === 'siege') prism(b, x, y + 0.06, z, 0.15, 0.46, 4, col, shade(col, 1.2));
      else prism(b, x, y + 0.06, z, 0.16, 0.46, 6, col, shade(col, 1.2));
    });
  });
  return b;
}

module.exports = { SQRT3, center, pick, rgb, tileTop, ownerCiv, buildTerrain, buildBorders, buildPieces };
