"use strict";
// Sculpted terrain for the Godot build, in plain JS so Node can test it (tools/godot/test-geo.js).
// The map becomes one continuous landscape: every tile has a target height, colour and material weights, and points between
// tile centres blend smoothly toward the values shared at hex corners and edge midpoints, so neighbouring tiles always meet
// without cracks. Noise adds rolling ground, hills and mountain ridges. Water level is y = 0.
// Layout matches the web game: pointy-top hexes, "odd-r" offset (odd rows shifted right), hex radius 1.

const SQRT3 = Math.sqrt(3), HALF_SQRT3 = SQRT3 / 2, DEG = Math.PI / 180;
const RINGS = 4; // subdivision rings per hex: 1 + 3·R·(R+1) vertices, 6·R² triangles

function center(col, row) { return [SQRT3 * (col + 0.5 * (row & 1)), 1.5 * row]; }
function pick(x, z, W, H) {
  const q = (SQRT3 / 3 * x - z / 3), r = 2 / 3 * z, s = -q - r;
  let rq = Math.round(q), rr = Math.round(r); const rs = Math.round(s);
  const dq = Math.abs(rq - q), dr = Math.abs(rr - r), ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs; else if (dr > ds) rr = -rq - rs;
  const row = rr, col = rq + ((rr - (rr & 1)) >> 1);
  return col >= 0 && col < W && row >= 0 && row < H ? row * W + col : -1;
}
// corner k of a hex (k=0 at 30°, then every 60°; +z is "down" the map); edge k runs from corner k to k+1 and faces 60° + 60k
function corner(cx, cz, k, s) { const a = DEG * (30 + 60 * k); return [cx + s * Math.cos(a), cz + s * Math.sin(a)]; }
function across(W, H, col, row, k) {
  const a = DEG * (60 + 60 * k), c = center(col, row);
  return pick(c[0] + SQRT3 * Math.cos(a), c[1] + SQRT3 * Math.sin(a), W, H);
}
function rgb(hex) { const v = parseInt(String(hex).replace('#', ''), 16); return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255]; }
function mix3(a, b, k) { return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]; }
function hash1(i) { let h = (i * 2654435761) >>> 0; h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13; return (h >>> 0) / 4294967296; }

// value noise + fBm (deterministic, seeded per map)
function makeNoise(seed) {
  const P = new Uint8Array(512); let s = (seed >>> 0) || 1;
  const p = []; for (let i = 0; i < 256; i++) p.push(i);
  for (let i = 255; i > 0; i--) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; const j = s % (i + 1); const t = p[i]; p[i] = p[j]; p[j] = t; }
  for (let i = 0; i < 512; i++) P[i] = p[i & 255];
  const V = new Float32Array(256); for (let i = 0; i < 256; i++) V[i] = hash1(i * 7919 + (seed | 0));
  function lattice(ix, iz) { return V[P[(P[ix & 255] + iz) & 511]]; }
  function value(x, z) {
    const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz;
    const ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz);
    const a = lattice(ix, iz), b = lattice(ix + 1, iz), c = lattice(ix, iz + 1), d = lattice(ix + 1, iz + 1);
    return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz; // 0..1
  }
  function fbm(x, z, oct) { let sum = 0, amp = 0.5, f = 1, norm = 0; for (let o = 0; o < oct; o++) { sum += amp * value(x * f, z * f); norm += amp; amp *= 0.5; f *= 2.03; } return sum / norm; }
  function ridge(x, z) { let sum = 0, amp = 0.55, f = 1; for (let o = 0; o < 3; o++) { const n = 1 - Math.abs(2 * value(x * f + 17.3 * o, z * f - 9.1 * o) - 1); sum += amp * n * n; amp *= 0.5; f *= 2.1; } return sum; }
  return { value, fbm, ridge };
}

// per-tile targets: [height, noise amplitude, r, g, b, rock, sand, mountain, meadow] in a hand-painted cartoon palette
const NA = 9;
function tileAttrs(AU, t) {
  const e = t.elev || 0, v = hash1(t.i * 31 + 7);
  let h, amp, col, rock = 0, sand = 0, mtn = 0, meadow = 0;
  if (t.terrain === 'ocean') { h = -0.85; amp = 0.1; col = rgb('#4f9fb0'); }
  else if (t.terrain === 'coast') { h = -0.24; amp = 0.06; col = rgb('#e6d6a2'); sand = 0.6; }
  else if (t.terrain === 'lake') { h = -0.26; amp = 0.05; col = rgb('#b8c48a'); }
  else {
    h = 0.26 + e * 0.1; amp = 0.05;
    col = rgb({ grassland: '#5ea845', plains: '#9fb852', desert: '#ecd08c', tundra: '#a3b48e', snow: '#f2f6fb', mountain: '#8d93a3' }[t.terrain] || '#6fae4c');
    if (t.terrain === 'grassland') meadow = 1;
    if (t.terrain === 'plains') meadow = 0.6;
    if (t.terrain === 'desert') sand = 1;
    if (t.hills) { h += 0.1; amp = 0.08; rock = 0.12; col = mix3(col, [col[0] * 0.9, col[1] * 0.92, col[2] * 0.85], 1); }
    if (t.terrain === 'mountain') { h = 0.5 + e * 0.1; amp = 0.12; rock = 1; mtn = 1; meadow = 0; }
    if (t.feature === 'forest') { col = mix3(col, rgb('#4f9a3a'), 0.5); meadow = 0.3; }
    if (t.feature === 'jungle') { col = mix3(col, rgb('#3f8f3a'), 0.6); meadow = 0.2; }
    if (t.feature === 'marsh') { col = mix3(col, rgb('#6aa37a'), 0.55); h -= 0.08; amp = 0.03; meadow = 0; }
    if (t.feature === 'oasis') { col = mix3(col, rgb('#6cbf45'), 0.5); meadow = 0.8; }
    col = mix3(col, [col[0] * 1.06, col[1] * 1.05, col[2] * 0.92], v - 0.5); // a touch of per-tile variety
  }
  return [h, amp, col[0], col[1], col[2], rock, sand, mtn, meadow];
}

function smooth(t) { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); }

function makeField(AU, g) {
  const W = g.W, H = g.H, N = makeNoise((g.seed || 1) * 977 + 13);
  const A = new Float32Array(g.tiles.length * NA);
  g.tiles.forEach(t => { const a = tileAttrs(AU, t); for (let k = 0; k < NA; k++) A[t.i * NA + k] = a[k]; });
  const nb = g.tiles.map(t => { const o = []; for (let k = 0; k < 6; k++) o.push(across(W, H, t.col, t.row, k)); return o; });
  // shared values: hex corner k = mean of the (up to) three tiles that meet there; edge midpoint k = mean of the two tiles on that edge
  const cornerV = new Float32Array(g.tiles.length * 6 * NA), edgeV = new Float32Array(g.tiles.length * 6 * NA);
  const avg = (out, off, list) => { for (let k = 0; k < NA; k++) { let s = 0; for (let j = 0; j < list.length; j++) s += A[list[j] * NA + k]; out[off + k] = s / list.length; } };
  g.tiles.forEach(t => {
    for (let k = 0; k < 6; k++) {
      const set = [t.i, nb[t.i][(k + 5) % 6], nb[t.i][k]].filter(i => i >= 0).sort((a, b) => a - b); // sorted, so all three tiles sum in the same order
      avg(cornerV, (t.i * 6 + k) * NA, set);
      const pair = [t.i, nb[t.i][k]].filter(i => i >= 0).sort((a, b) => a - b);
      avg(edgeV, (t.i * 6 + k) * NA, pair);
    }
  });
  // Distinct per-tile landforms that fade to nothing before the hex edge (so tiles still meet without cracks):
  // hills get two or three rounded mounds, mountains a tall peak with sub-peaks (neighbouring mountains read as a range).
  const shapes = g.tiles.map(t => {
    const r = k => hash1(t.i * 7919 + k * 104729), out = [];
    if (t.terrain === 'mountain') {
      out.push([(r(1) - 0.5) * 0.25, (r(2) - 0.5) * 0.25, 0.95, 1.55 + r(3) * 0.35, 1]);                 // main peak
      for (let k = 0; k < 2; k++) { const a = r(10 + k) * 6.283; out.push([Math.cos(a) * 0.42, Math.sin(a) * 0.42, 0.55, 0.75 + r(20 + k) * 0.35, 1]); }
    } else if (t.hills) {
      const n = 2 + (r(4) < 0.6 ? 1 : 0), a0 = r(5) * 6.283;
      for (let k = 0; k < n; k++) { const a = a0 + k * 6.283 / n, d = n === 2 ? 0.27 : 0.32; out.push([Math.cos(a) * d, Math.sin(a) * d, 0.46 + r(30 + k) * 0.08, 0.46 + r(40 + k) * 0.14, 0]); }
    }
    return out;
  });
  function local(ti, x, z) {
    const sh = shapes[ti]; if (!sh.length) return 0;
    const t = g.tiles[ti], c = center(t.col, t.row), dx = x - c[0], dz = z - c[1];
    const rho = Math.max(Math.abs(dx), Math.abs(0.5 * dx + HALF_SQRT3 * dz), Math.abs(-0.5 * dx + HALF_SQRT3 * dz)) / HALF_SQRT3;
    if (rho >= 0.97) return 0;
    let h = 0;
    for (const s of sh) {
      const d = Math.hypot(dx - s[0], dz - s[1]) / s[2];
      if (s[4]) { if (d < 1) { const cone = Math.pow(1 - d, 1.35), rid = N.ridge(x * 1.6 + 9, z * 1.6 - 4); h = Math.max(h, s[3] * cone * (0.8 + 0.45 * rid)); } } // rocky peak: cone with ridged faces
      else h += s[3] * Math.exp(-d * d * 2.2);                                                                                   // soft round mound
    }
    return h * smooth((0.97 - rho) / 0.3);
  }
  const tmp = new Float32Array(NA);
  // blended attributes at world (x, z) inside tile ti: quadratic along the edge (corner, midpoint, corner), then eased toward the centre
  function attrs(ti, x, z, out) {
    const t = g.tiles[ti], c = center(t.col, t.row), dx = x - c[0], dz = z - c[1];
    const rho = Math.max(Math.abs(dx), Math.abs(0.5 * dx + HALF_SQRT3 * dz), Math.abs(-0.5 * dx + HALF_SQRT3 * dz)) / HALF_SQRT3;
    let ang = Math.atan2(dz, dx) / DEG - 30; ang = ((ang % 360) + 360) % 360;
    const k = Math.min(5, Math.floor(ang / 60)), k1 = (k + 1) % 6;
    let s = 0;
    if (rho > 1e-6) { const bx = dx / rho, bz = dz / rho, ck = corner(0, 0, k, 1); s = Math.min(1, Math.max(0, Math.hypot(bx - ck[0], bz - ck[1]))); }
    const wa = (1 - s) * (1 - 2 * s), wm = 4 * s * (1 - s), wb = s * (2 * s - 1), wc = smooth((1 - Math.min(1, rho)) / 0.8);
    const ca = (ti * 6 + k) * NA, cb = (ti * 6 + k1) * NA, em = (ti * 6 + k) * NA, cc = ti * NA;
    for (let j = 0; j < NA; j++) {
      const edge = cornerV[ca + j] * wa + edgeV[em + j] * wm + cornerV[cb + j] * wb;
      out[j] = edge + (A[cc + j] - edge) * wc;
    }
    return out;
  }
  function heightFrom(a, x, z) {
    const n = N.fbm(x * 0.55, z * 0.55, 4) * 2 - 1, fine = N.fbm(x * 2.3 + 40, z * 2.3 - 11, 2) * 2 - 1;
    return a[0] + a[1] * (n + 0.35 * fine) + a[7] * (N.ridge(x * 0.7 + 5, z * 0.7 + 3) * 0.35); // foothill ridges spill a little into neighbours
  }
  // full height inside tile ti: blended ground plus that tile's own landform
  function heightIn(ti, x, z, a) { return heightFrom(attrs(ti, x, z, a || tmp), x, z) + local(ti, x, z); }
  function tileAt(x, z, hint) { const i = pick(x, z, W, H); return i >= 0 ? i : hint; }
  function heightAt(x, z, hint) {
    const ti = tileAt(x, z, hint === undefined ? clampTile(x, z) : hint);
    return heightIn(ti, x, z, tmp);
  }
  function clampTile(x, z) {
    const row = Math.max(0, Math.min(H - 1, Math.round(z / 1.5))), col = Math.max(0, Math.min(W - 1, Math.round(x / SQRT3 - 0.5 * (row & 1))));
    return row * W + col;
  }
  return { W, H, noise: N, attrs, heightFrom, heightIn, heightAt, tileAt, nb, tiles: g.tiles };
}

// The terrain mesh: per tile a ring-subdivided hex (shared edge vertices are recomputed identically, so tiles meet without cracks).
// Returns flat arrays: pos (xyz), nrm (xyz), col (rgb + meadow in alpha), uv (rock, sand), idx (triangles).
function buildTerrainMesh(F) {
  const R = RINGS, perTile = 1 + 3 * R * (R + 1), nT = F.tiles.length;
  const pos = new Float32Array(nT * perTile * 3), nrm = new Float32Array(nT * perTile * 3), col = new Float32Array(nT * perTile * 4), uv = new Float32Array(nT * perTile * 2);
  const idx = new Int32Array(nT * 6 * R * R * 3), a = new Float32Array(NA), e = 0.04;
  let v = 0, ii = 0;
  const ringStart = r => r === 0 ? 0 : 1 + 3 * r * (r - 1);
  F.tiles.forEach(t => {
    const c = center(t.col, t.row), base = v;
    const put = (x, z) => {
      const y = F.heightIn(t.i, x, z, a); // also fills a with the blended attributes
      const hx = F.heightAt(x + e, z, t.i) - F.heightAt(x - e, z, t.i), hz = F.heightAt(x, z + e, t.i) - F.heightAt(x, z - e, t.i);
      let nx = -hx / (2 * e), ny = 1, nz = -hz / (2 * e); const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
      pos[v * 3] = x; pos[v * 3 + 1] = y; pos[v * 3 + 2] = z; nrm[v * 3] = nx; nrm[v * 3 + 1] = ny; nrm[v * 3 + 2] = nz;
      col[v * 4] = a[2]; col[v * 4 + 1] = a[3]; col[v * 4 + 2] = a[4]; col[v * 4 + 3] = a[8]; uv[v * 2] = a[5]; uv[v * 2 + 1] = a[6];
      v++;
    };
    put(c[0], c[1]);
    for (let r = 1; r <= R; r++) for (let k = 0; k < 6; k++) {
      const p = corner(c[0], c[1], k, r / R), q = corner(c[0], c[1], k + 1, r / R);
      for (let j = 0; j < r; j++) put(p[0] + (q[0] - p[0]) * j / r, p[1] + (q[1] - p[1]) * j / r);
    }
    for (let r = 1; r <= R; r++) for (let k = 0; k < 6; k++) {
      const outer = j => base + ringStart(r) + ((k * r + j) % (6 * r));
      const inner = j => r === 1 ? base : base + ringStart(r - 1) + ((k * (r - 1) + j) % (6 * (r - 1)));
      for (let j = 0; j < r; j++) { idx[ii++] = outer(j); idx[ii++] = outer(j + 1); idx[ii++] = inner(j); }
      for (let j = 0; j < r - 1; j++) { idx[ii++] = inner(j); idx[ii++] = outer(j + 1); idx[ii++] = inner(j + 1); }
    }
  });
  return { pos, nrm, col, uv, idx, vertices: v, triangles: ii / 3 };
}

// Scattered nature (instanced in Godot): dense forests of pines and round trees, jungle palms, grass tufts on open land,
// rocks on hills and mountains, reeds in marshes. Settled tiles keep their centre clear for buildings.
// Each entry: [x, y, z, yaw, scale, r, g, b] (r,g,b tints the instance). density < 1 thins everything (phones).
function buildScatter(F, g, density) {
  const out = { pine: [], round: [], palm: [], bush: [], tuft: [], rock: [], reed: [] }, D = density || 1;
  F.tiles.forEach(t => {
    const c = center(t.col, t.row), rnd = k => hash1(t.i * 977 + k * 131);
    const settled = g && t.settlement !== undefined && t.settlement !== null && g.settlements[t.settlement];
    let seq = 0;
    const place = (list, n, rMin, rMax, sMin, sMax, tint, var_) => {
      n = Math.round(n * D); if (settled) rMin = Math.max(rMin, 0.97); // the town fills its hex
      else if (t.resource && list !== out.tuft) rMin = Math.max(rMin, 0.45); // keep the middle clear for the resource picture
      for (let k = 0; k < n; k++, seq++) {
        const ang = 2 * Math.PI * (k / n + rnd(seq) * 0.4), d = rMin + (rMax - rMin) * Math.sqrt(rnd(seq + 50));
        const x = c[0] + Math.cos(ang) * d, z = c[1] + Math.sin(ang) * d * 0.92, y = F.heightAt(x, z, t.i);
        if (y < 0.03) continue; // nothing grows in the sea
        const sc = sMin + (sMax - sMin) * rnd(seq + 90), j = 1 - var_ + 2 * var_ * rnd(seq + 70);
        list.push([x, y, z, rnd(seq + 30) * Math.PI * 2, sc, tint[0] * j, tint[1] * j, tint[2] * (1 - var_ + 2 * var_ * rnd(seq + 80))]);
      }
    };
    const open = !t.feature && t.terrain !== 'mountain';
    if (t.feature === 'forest') {
      if (t.terrain === 'tundra' || t.terrain === 'snow' || t.hills) place(out.pine, 13, 0.1, 0.9, 0.8, 1.3, [1, 1, 1], 0.1);
      else { place(out.pine, 7, 0.1, 0.9, 0.8, 1.25, [1, 1, 1], 0.1); place(out.round, 6, 0.15, 0.9, 0.8, 1.2, [1, 1, 1], 0.12); }
      place(out.bush, 3, 0.3, 0.9, 0.8, 1.2, [1, 1, 1], 0.1);
    }
    if (t.feature === 'jungle') { place(out.round, 7, 0.1, 0.9, 0.9, 1.35, [1.0, 1.15, 0.92], 0.12); place(out.palm, 5, 0.15, 0.9, 0.85, 1.25, [1, 1, 1], 0.1); place(out.bush, 4, 0.2, 0.9, 0.9, 1.3, [1.0, 1.12, 0.92], 0.1); }
    if (t.feature === 'marsh') { place(out.reed, 12, 0.1, 0.85, 0.7, 1.2, [1, 1, 1], 0.1); place(out.tuft, 4, 0.2, 0.85, 0.8, 1.2, [0.9, 0.95, 0.85], 0.1); }
    if (t.feature === 'oasis') { place(out.palm, 4, 0.2, 0.7, 0.9, 1.2, [1, 1, 1], 0.1); place(out.bush, 3, 0.2, 0.8, 0.8, 1.1, [1, 1, 1], 0.1); }
    if (t.terrain === 'mountain') place(out.rock, 2, 0.6, 0.92, 0.7, 1.1, [1, 1, 1], 0.08);
    // open land carries no trees or bushes, so a tree always means a forest or jungle tile: only grass, and a stone on hills
    if (t.hills && open && rnd(405) < 0.5) place(out.rock, 1, 0.3, 0.85, 0.6, 1.0, [1, 1, 1], 0.1);
    if (open && (t.terrain === 'grassland' || t.terrain === 'plains')) place(out.tuft, 7, 0.1, 0.92, 0.8, 1.3, t.terrain === 'plains' ? [1.1, 1.05, 0.75] : [1, 1, 1], 0.12);
    if (open && t.terrain === 'tundra') place(out.tuft, 4, 0.1, 0.9, 0.7, 1.0, [0.95, 0.92, 0.75], 0.1);
    if (open && t.terrain === 'desert' && rnd(404) < 0.4) place(out.rock, 1, 0.2, 0.85, 0.6, 1.0, [1.15, 1.05, 0.85], 0.1);
  });
  return out;
}
// a key that changes when settlements change, so the scatter can clear new town sites
function scatterKey(g) { return Object.keys(g.settlements).map(id => g.settlements[id].tile).sort((a, b) => a - b).join(','); }

// River ribbons draped over the terrain, following the engine's river paths (tile centre to tile centre).
function buildRivers(F, g) {
  const pos = [], nrm = [], col = [], STEPS = 8, w = 0.09;
  (g.rivers || []).forEach(path => {
    const pts = [];
    for (let k = 0; k + 1 < path.length; k++) {
      const A = g.tiles[path[k]], B = g.tiles[path[k + 1]]; if (!A || !B) continue;
      const a = center(A.col, A.row), b = center(B.col, B.row);
      for (let s = 0; s < STEPS; s++) { const f = s / STEPS, wob = Math.sin(f * Math.PI) * (hash1(path[k] * 13 + s) - 0.5) * 0.25; pts.push([a[0] + (b[0] - a[0]) * f - (b[1] - a[1]) * wob * 0.3, a[1] + (b[1] - a[1]) * f + (b[0] - a[0]) * wob * 0.3]); }
      if (k + 2 === path.length) pts.push(b);
    }
    for (let i = 0; i + 1 < pts.length; i++) {
      const p = pts[i], q = pts[i + 1], dx = q[0] - p[0], dz = q[1] - p[1], l = Math.hypot(dx, dz) || 1, ox = -dz / l * w, oz = dx / l * w;
      const yp = Math.max(F.heightAt(p[0], p[1]), -0.02) + 0.035, yq = Math.max(F.heightAt(q[0], q[1]), -0.02) + 0.035;
      const strip = (a, b, c) => { // a band across the river from offset a to b (in units of the half-width), coloured c
        const P = (k, y, q) => [q[0] + ox * k, y, q[1] + oz * k];
        [[P(a, yp, p), P(b, yp, p), P(b, yq, q)], [P(a, yp, p), P(b, yq, q), P(a, yq, q)]].forEach(tri => tri.forEach(v => { pos.push(v[0], v[1], v[2]); nrm.push(0, 1, 0); col.push(c[0], c[1], c[2], c[3]); }));
      };
      strip(-0.8, 0.8, [0.3, 0.74, 0.84, 0.92]);
      strip(0.8, 1.15, [1, 1, 1, 0.95]); strip(-1.15, -0.8, [1, 1, 1, 0.95]); // white banks, like the coast
    }
  });
  return { p: pos, n: nrm, c: col };
}

module.exports = { SQRT3, RINGS, center, pick, corner, across, makeField, buildTerrainMesh, buildScatter, scatterKey, buildRivers };
