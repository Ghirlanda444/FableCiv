"use strict";
// Low-poly prop models built in code (no art assets): pine, broadleaf tree, rock and reeds.
// Each returns a batch { p, n, c } in local space (y up, base at y = 0); Godot instances them with MultiMesh.

function batch() { return { p: [], n: [], c: [] }; }
function vert(b, p, n, c) { b.p.push(p[0], p[1], p[2]); b.n.push(n[0], n[1], n[2]); b.c.push(c[0], c[1], c[2], 1); }
function norm(v) { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
function hash1(i) { let h = (i * 2654435761) >>> 0; h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13; return (h >>> 0) / 4294967296; }

// cone or frustum around the y axis, smooth-shaded sides; colour can differ at the bottom and the top
function cone(b, y0, r0, y1, r1, sides, c0, c1, cap) {
  const slope = (r0 - r1) / Math.max(1e-6, y1 - y0);
  for (let s = 0; s < sides; s++) {
    const a0 = 2 * Math.PI * s / sides, a1 = 2 * Math.PI * (s + 1) / sides;
    const n0 = norm([Math.cos(a0), slope, Math.sin(a0)]), n1 = norm([Math.cos(a1), slope, Math.sin(a1)]);
    const P0 = [Math.cos(a0) * r0, y0, Math.sin(a0) * r0], P1 = [Math.cos(a1) * r0, y0, Math.sin(a1) * r0];
    const Q0 = [Math.cos(a0) * r1, y1, Math.sin(a0) * r1], Q1 = [Math.cos(a1) * r1, y1, Math.sin(a1) * r1];
    vert(b, P0, n0, c0); vert(b, P1, n1, c0); vert(b, Q1, n1, c1);
    if (r1 > 1e-4) { vert(b, P0, n0, c0); vert(b, Q1, n1, c1); vert(b, Q0, n0, c1); }
    if (cap) { vert(b, [0, y0, 0], [0, -1, 0], c0); vert(b, P1, [0, -1, 0], c0); vert(b, P0, [0, -1, 0], c0); }
  }
}
// lumpy low-poly blob (canopies, rocks): a UV sphere with per-vertex jitter
function blob(b, cx, cy, cz, rx, ry, rz, lat, lon, c, seed, jit, cTop) {
  const P = (i, j) => {
    const th = Math.PI * i / lat, ph = 2 * Math.PI * (j % lon) / lon, k = 1 + (i === 0 || i === lat ? 0 : (hash1(seed * 97 + i * 31 + (j % lon)) - 0.5) * jit);
    const d = [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)];
    return { p: [cx + d[0] * rx * k, cy + d[1] * ry * k, cz + d[2] * rz * k], n: norm([d[0] / rx, d[1] / ry, d[2] / rz]), up: d[1] };
  };
  for (let i = 0; i < lat; i++) for (let j = 0; j < lon; j++) {
    const a = P(i, j), q = P(i + 1, j), r = P(i + 1, j + 1), s = P(i, j + 1);
    const col = v => cTop ? [c[0] + (cTop[0] - c[0]) * (v.up * 0.5 + 0.5), c[1] + (cTop[1] - c[1]) * (v.up * 0.5 + 0.5), c[2] + (cTop[2] - c[2]) * (v.up * 0.5 + 0.5)] : c;
    vert(b, a.p, a.n, col(a)); vert(b, q.p, q.n, col(q)); vert(b, r.p, r.n, col(r));
    vert(b, a.p, a.n, col(a)); vert(b, r.p, r.n, col(r)); vert(b, s.p, s.n, col(s));
  }
}

const BARK = [0.36, 0.25, 0.16];
function pine() {
  const b = batch(), dark = [0.13, 0.3, 0.14], light = [0.24, 0.46, 0.2];
  cone(b, 0, 0.028, 0.12, 0.022, 6, BARK, BARK, false);
  cone(b, 0.07, 0.19, 0.27, 0.0, 9, dark, light, true);
  cone(b, 0.19, 0.15, 0.39, 0.0, 9, dark, light, true);
  cone(b, 0.3, 0.1, 0.5, 0.0, 9, dark, light, true);
  return b;
}
function broadleaf() {
  const b = batch(), dark = [0.16, 0.36, 0.13], light = [0.34, 0.58, 0.22];
  cone(b, 0, 0.032, 0.18, 0.024, 6, BARK, BARK, false);
  blob(b, 0, 0.3, 0, 0.19, 0.16, 0.19, 5, 9, dark, 1, 0.25, light);
  blob(b, 0.09, 0.37, 0.05, 0.12, 0.11, 0.12, 4, 8, dark, 2, 0.25, light);
  blob(b, -0.08, 0.35, -0.06, 0.11, 0.1, 0.11, 4, 8, dark, 3, 0.25, light);
  return b;
}
function rock() { const b = batch(); blob(b, 0, 0.03, 0, 0.14, 0.09, 0.12, 4, 7, [0.47, 0.45, 0.42], 5, 0.5, [0.6, 0.58, 0.55]); return b; }
function reed() {
  const b = batch(), base = [0.36, 0.45, 0.2], tip = [0.72, 0.68, 0.38];
  [[0, 0], [0.04, 0.02], [-0.03, 0.03], [0.01, -0.04]].forEach((o, k) => {
    const s = batch(); cone(s, 0, 0.012, 0.2 + k * 0.03, 0.0, 4, base, tip, false);
    for (let i = 0; i < s.p.length; i += 3) { s.p[i] += o[0]; s.p[i + 2] += o[1]; }
    b.p.push(...s.p); b.n.push(...s.n); b.c.push(...s.c);
  });
  return b;
}

module.exports = { pine, broadleaf, rock, reed };
