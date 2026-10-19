"use strict";
// Per-turn geometry for the Godot build (borders, settlements, units), in plain JS so Node can test it (tools/godot/test-geo.js).
// Builds triangle batches { p: [x,y,z...], n: [x,y,z...], c: [r,g,b,a...] } that main.js turns into meshes.
// Everything sits on the sculpted terrain: F is the height field from terrain.js (F.heightAt(x, z)).
// Layout matches the web game: pointy-top hexes, "odd-r" offset (odd rows shifted right), hex radius 1.

const SQRT3 = Math.sqrt(3);

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

// Per-turn borders, Civ-style: along every edge where the owner changes, a band in the owner's colour that is solid at the
// edge and fades toward the tile centre, draped over the ground.
// tile.owner is the owning settlement's id
function ownerCiv(g, t) { const s = t && t.owner >= 0 ? g.settlements[t.owner] : null; return s ? s.civ : -1; }
function buildBorders(AU, g, F) {
  const b = batch(), W = g.W, H = g.H, up = [0, 1, 0], SEG = 5, lift = 0.045;
  const yAt = (x, z) => Math.max(F.heightAt(x, z), 0) + lift;
  g.tiles.forEach(t => {
    const civ = ownerCiv(g, t); if (civ < 0 || !g.civs[civ]) return;
    const c = center(t.col, t.row), col = rgb(g.civs[civ].color || '#ffffff');
    for (let k = 0; k < 6; k++) {
      const n = across(t.col, t.row, k, W, H);
      if (n >= 0 && ownerCiv(g, g.tiles[n]) === civ) continue;
      const p = corner(c[0], c[1], k, 1), q = corner(c[0], c[1], k + 1, 1);
      const rows = [[0.98, 0.95], [0.9, 0.85], [0.68, 0]]; // [scale toward the centre, alpha]: a crisp line, then a soft fade inward
      for (let r = 0; r + 1 < rows.length; r++) for (let s = 0; s < SEG; s++) {
        const pt = (sc, f) => { const x = c[0] + (p[0] + (q[0] - p[0]) * f - c[0]) * sc, z = c[1] + (p[1] + (q[1] - p[1]) * f - c[1]) * sc; return [x, yAt(x, z), z]; };
        const f0 = s / SEG, f1 = (s + 1) / SEG, A = rows[r], B = rows[r + 1];
        const ca = [col[0], col[1], col[2], A[1]], cb = [col[0], col[1], col[2], B[1]];
        const a0 = pt(A[0], f0), a1 = pt(A[0], f1), b0 = pt(B[0], f0), b1 = pt(B[0], f1);
        vert(b, a0, up, ca); vert(b, a1, up, ca); vert(b, b1, up, cb);
        vert(b, a0, up, ca); vert(b, b1, up, cb); vert(b, b0, up, cb);
      }
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
// opts.art: settlements and most units are drawn by the KayKit art, so only draw a disc in the owner's colour under each unit,
// plus placeholders for units without art (opts.hasArt(u) false).
function buildPieces(AU, g, F, opts) {
  const b = batch(), walls = rgb('#d9cfbf'), art = opts && opts.art;
  if (!art) Object.keys(g.settlements).forEach(id => {
    const s = g.settlements[id], t = g.tiles[s.tile], civ = g.civs[s.civ]; if (!t || !civ) return;
    const c = center(t.col, t.row), roof = rgb(civ.color || '#cccccc'), n = Math.min(8, 3 + Math.floor((s.pop || 1) / 2));
    for (let k = 0; k < n; k++) {
      const a = 2 * Math.PI * k / n + hash(s.id) * 2, d = k === 0 ? 0 : 0.36 + hash(s.id * 3 + k) * 0.12, sz = 0.17 + hash(s.id * 9 + k) * 0.08;
      const x = c[0] + Math.cos(a) * d, z = c[1] + Math.sin(a) * d, y = F.heightAt(x, z);
      box(b, x, y - 0.12, z, sz, 0.26 + hash(s.id * 5 + k) * 0.12, sz, walls, roof); // sunk a little so slopes never show a gap
    }
    const y = F.heightAt(c[0], c[1]);
    if (s.isCapital) { prism(b, c[0], y - 0.1, c[1], 0.1, 0.78, 6, walls); prism(b, c[0], y + 0.68, c[1], 0.14, 0.12, 6, roof); }
    if (s.isCity) for (let k = 0; k < 12; k++) { // a ring of wall segments
      const a = 2 * Math.PI * k / 12, x = c[0] + Math.cos(a) * 0.68, z = c[1] + Math.sin(a) * 0.68;
      prism(b, x, F.heightAt(x, z) - 0.08, z, 0.09, 0.2, 6, shade(walls, 0.85), shade(walls, 0.95));
    }
  });
  const byTile = {};
  Object.keys(g.units).forEach(id => { const u = g.units[id]; (byTile[u.tile] = byTile[u.tile] || []).push(u); });
  Object.keys(byTile).forEach(ti => {
    const t = g.tiles[ti], list = byTile[ti]; if (!t) return;
    const c = center(t.col, t.row), hasTown = t.settlement !== undefined && t.settlement !== null && !!g.settlements[t.settlement];
    list.slice(0, 4).forEach((u, k) => {
      const civ = g.civs[u.civ], col = rgb((civ && civ.color) || '#999999'), U = AU.UNITS[u.type] || {}, cls = U.cls || 'melee';
      const a = Math.PI * (0.25 + 0.5 * k), d = hasTown || list.length > 1 ? 0.5 : 0, x = c[0] + Math.cos(a) * d, z = c[1] + Math.sin(a) * d + (hasTown ? 0.1 : 0);
      const y = Math.max(F.heightAt(x, z), 0) + 0.02;
      if (art && opts.hasArt(u)) { prism(b, x, y - 0.04, z, 0.2, 0.06, 10, col, shade(col, 1.15)); return; } // team disc under the character
      prism(b, x, y - 0.06, z, 0.27, 0.12, 8, rgb('#f2efe6')); // base disc
      if (cls === 'civilian') prism(b, x, y + 0.06, z, 0.13, 0.3, 6, rgb('#e8d9a8'), col);
      else if (cls === 'naval') { box(b, x, y + 0.06, z, 0.56, 0.13, 0.24, shade(col, 0.8), col); prism(b, x, y + 0.19, z, 0.04, 0.4, 4, rgb('#f2efe6')); }
      else if (cls === 'cavalry') { box(b, x, y + 0.06, z, 0.4, 0.2, 0.16, col); prism(b, x + 0.11, y + 0.26, z, 0.08, 0.22, 6, col); }
      else if (cls === 'ranged' || cls === 'siege') prism(b, x, y + 0.06, z, 0.15, 0.46, 4, col, shade(col, 1.2));
      else prism(b, x, y + 0.06, z, 0.16, 0.46, 6, col, shade(col, 1.2));
    });
  });
  return b;
}

module.exports = { SQRT3, center, pick, rgb, ownerCiv, buildBorders, buildPieces };
