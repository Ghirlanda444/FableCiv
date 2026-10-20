"use strict";
// Settlements on the map, Civilization III style: every settlement is one small 3D town that looks the same for every settlement
// of its size and culture, and grows in steps as its population grows (town, small city, city, large city, metropolis).
// Houses and the central landmark follow the culture's architecture (AU.PALACE_STYLES: wall, roof and trim colours, roof shape),
// a flag flies the owner's colour (a bigger one with a gold finial on capitals), and walls or a castle add a ring of ramparts.
// Individual buildings are not drawn here: they appear in the "Show city" view (sprites.cityViewSprites).
// The houses, landmarks and ramparts are Blender models (tools/blender/buildings.py, godot/models) when opts.models provides
// them, merged into the batch in the culture's colours; the code-built ones below stay as the fallback.
// Plain JS geometry batches, so Node can test it (tools/godot/test-geo.js).
const geo = typeof process !== 'undefined' && process.versions && process.versions.node ? require('./geo.js') : require('res://geo.js');
const { rgb, mix, shade, hash, vert, tri, quad, box, prism, center } = geo;

const TIER_NAMES = ['Town', 'Small city', 'City', 'Large city', 'Metropolis'];
function tierOf(s) { if (!s.isCity) return 0; const p = s.pop || 1; return p < 8 ? 1 : p < 16 ? 2 : p < 30 ? 3 : 4; }
const RADIUS = [0.36, 0.46, 0.56, 0.66, 0.74];    // footprint of each tier
const HOUSES = [3, 6, 10, 15, 22];              // houses around the landmark

// fixed house spots on three rings, the same for every settlement (so a tier always looks the same); spots where the first two
// units of a garrison stand (in front of the gate, geo.unitOffset) stay free
const UNIT_SPOTS = [geo.unitOffset(0, 1, true), geo.unitOffset(0, 2, true), geo.unitOffset(1, 2, true)];
const SLOTS = (() => {
  const out = [];
  [[6, 0.28, 0.35], [9, 0.47, 0.05], [12, 0.65, 0.3]].forEach(([n, r, off], ring) => {
    for (let k = 0; k < n; k++) {
      const a = off + 2 * Math.PI * k / n, i = out.length;
      const x = Math.cos(a) * r + (hash(i * 7 + 1) - 0.5) * 0.05, z = Math.sin(a) * r * 0.92 + (hash(i * 7 + 2) - 0.5) * 0.05;
      if (UNIT_SPOTS.some(p => Math.hypot(p[0] - x, p[1] - z) < 0.2)) continue;
      out.push({ x, z, ring, j: hash(i * 7 + 3), k: hash(i * 7 + 4), along: hash(i * 7 + 5) < 0.35, v: Math.floor(hash(i * 7 + 6) * 3) });
    }
  });
  return out;
})();

// how each culture builds its houses (the landmark follows the style's roof shape)
const HOUSE = {
  mediterranean: { roof: 'gable', pitch: 0.5 }, european: { roof: 'gable', pitch: 1.0 }, new_world: { roof: 'gable', pitch: 0.6 },
  east_asian: { roof: 'pagoda', pitch: 0.55, col: '#5f6e80' }, southeast_asian: { roof: 'hip', pitch: 0.75, col: '#8a4f34' }, south_asian: { roof: 'flat' },
  middle_eastern: { roof: 'flat' }, african: { roof: 'hut', col: '#a7864e' }, mesoamerican: { roof: 'hip', pitch: 0.85, col: '#c4a35a' },
  native_american: { roof: 'barrel' }, polynesian: { roof: 'gable', pitch: 1.15 }
};
const DEFAULT_STYLE = { wall: '#efe7d6', roof: '#b0432f', trim: '#d9c27a', roofShape: 'gable' };

// a surface of revolution: profile [[radius, height], ...] from the bottom up, smooth around, flat along the profile
function lathe(b, x, y, z, prof, sides, col) {
  for (let i = 0; i < prof.length - 1; i++) {
    const r0 = prof[i][0], y0 = prof[i][1], r1 = prof[i + 1][0], y1 = prof[i + 1][1];
    let nr = y1 - y0, ny = r0 - r1; const l = Math.hypot(nr, ny) || 1; nr /= l; ny /= l;
    for (let s = 0; s < sides; s++) {
      const a0 = 2 * Math.PI * s / sides, a1 = 2 * Math.PI * (s + 1) / sides, c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
      const A = [x + c0 * r0, y + y0, z + s0 * r0], B = [x + c1 * r0, y + y0, z + s1 * r0], C = [x + c1 * r1, y + y1, z + s1 * r1], D = [x + c0 * r1, y + y1, z + s0 * r1];
      const nA = [c0 * nr, ny, s0 * nr], nB = [c1 * nr, ny, s1 * nr];
      vert(b, A, nA, col); vert(b, B, nB, col); vert(b, C, nB, col); vert(b, A, nA, col); vert(b, C, nB, col); vert(b, D, nA, col);
    }
  }
}
const PROFILE = {
  dome: (r, h) => [[r, 0], [r * 0.97, h * 0.3], [r * 0.87, h * 0.58], [r * 0.66, h * 0.82], [r * 0.36, h * 0.96], [0, h]],
  onion: (r, h) => [[r * 0.8, 0], [r * 1.08, h * 0.22], [r * 1.04, h * 0.42], [r * 0.72, h * 0.64], [r * 0.3, h * 0.82], [r * 0.06, h * 0.92], [0, h]],
  cone: (r, h) => [[r, 0], [0, h]],
  spire: (r, h) => [[r, 0], [r * 0.8, h * 0.28], [r * 0.5, h * 0.58], [r * 0.2, h * 0.86], [0, h]]
};

// roofs over a w×d block whose walls end at height y; "along" turns the ridge from x to z
function frame(x, z, along) { return along ? (u, yy, v) => [x + v, yy, z + u] : (u, yy, v) => [x + u, yy, z + v]; }
function gable(b, x, y, z, w, d, rh, col, end, along) {
  const P = frame(x, z, along), hu = (along ? d : w) / 2 + 0.025, hv = (along ? w : d) / 2 + 0.03;
  quad(b, P(-hu, y, hv), P(hu, y, hv), P(hu, y + rh, 0), P(-hu, y + rh, 0), col);
  quad(b, P(-hu, y, -hv), P(hu, y, -hv), P(hu, y + rh, 0), P(-hu, y + rh, 0), shade(col, 0.92));
  const iu = hu - 0.025, iv = hv - 0.03, ih = rh * iv / hv;
  tri(b, P(-iu, y, -iv), P(-iu, y, iv), P(-iu, y + ih, 0), end); tri(b, P(iu, y, -iv), P(iu, y, iv), P(iu, y + ih, 0), end);
}
function hip(b, x, y, z, w, d, rh, col, o) {
  o = o === undefined ? 0.03 : o;
  const x0 = x - w / 2 - o, x1 = x + w / 2 + o, z0 = z - d / 2 - o, z1 = z + d / 2 + o, ridge = Math.max(0, (w - d) / 2);
  const r0 = [x - ridge, y + rh, z], r1 = [x + ridge, y + rh, z];
  quad(b, [x0, y, z1], [x1, y, z1], r1, r0, col); quad(b, [x0, y, z0], [x1, y, z0], r1, r0, shade(col, 0.92));
  tri(b, [x0, y, z0], [x0, y, z1], r0, shade(col, 0.96)); tri(b, [x1, y, z0], [x1, y, z1], r1, shade(col, 0.96));
}
function pagodaRoof(b, x, y, z, w, d, rh, col) { // a wide flared skirt, then a small hip on top
  const o = 0.035, lift = rh * 0.3, sx = w / 2 + o, sz = d / 2 + o, ix = w * 0.32, iz = d * 0.32;
  const c = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  for (let k = 0; k < 4; k++) {
    const a = c[k], p = c[(k + 1) % 4];
    quad(b, [x + a[0] * sx, y + 0.02, z + a[1] * sz], [x + p[0] * sx, y + 0.02, z + p[1] * sz], [x + p[0] * ix, y + lift, z + p[1] * iz], [x + a[0] * ix, y + lift, z + a[1] * iz], k === 2 ? col : shade(col, 0.93));
  }
  hip(b, x, y + lift, z, w * 0.64, d * 0.64, rh * 0.7, col, 0.01);
}
function barrel(b, x, y, z, w, d, col, along) { // a rounded bark roof (longhouse), the ridge along the long side
  const P = frame(x, z, along), hu = (along ? d : w) / 2 + 0.02, hv = (along ? w : d) / 2 + 0.02, n = 6;
  for (let i = 0; i < n; i++) {
    const a0 = Math.PI * i / n, a1 = Math.PI * (i + 1) / n;
    const v0 = Math.cos(a0) * hv, y0 = y + Math.sin(a0) * hv * 0.9, v1 = Math.cos(a1) * hv, y1 = y + Math.sin(a1) * hv * 0.9;
    quad(b, P(-hu, y0, v0), P(hu, y0, v0), P(hu, y1, v1), P(-hu, y1, v1), shade(col, 0.9 + 0.1 * Math.sin((a0 + a1) / 2)));
    tri(b, P(-hu + 0.02, y, 0), P(-hu + 0.02, y0, v0), P(-hu + 0.02, y1, v1), shade(col, 0.85)); tri(b, P(hu - 0.02, y, 0), P(hu - 0.02, y0, v0), P(hu - 0.02, y1, v1), shade(col, 0.85));
  }
}

// one house standing on the ground at height y (its base sinks a little so slopes never show a gap)
function house(b, x, y, z, w, d, h, kind, wall, roof, trim, along) {
  const dark = rgb('#4a3424');
  if (kind.roof === 'hut') { // round mud house with a thatched cone
    lathe(b, x, y - 0.08, z, [[w * 0.5, 0], [w * 0.5, h + 0.08]], 9, wall);
    lathe(b, x, y + h - 0.01, z, PROFILE.cone(w * 0.66, w * 0.85), 9, roof);
    box(b, x, y, z + w * 0.5 - 0.01, w * 0.26, h * 0.6, 0.03, dark);
    return;
  }
  box(b, x, y - 0.08, z, w, h + 0.08, d, wall, wall);
  if (kind.roof === 'gable') gable(b, x, y + h, z, w, d, (along ? w : d) * 0.5 * kind.pitch + 0.03, roof, wall, along);
  else if (kind.roof === 'hip') hip(b, x, y + h, z, w, d, Math.min(w, d) * 0.5 * kind.pitch + 0.03, roof);
  else if (kind.roof === 'pagoda') pagodaRoof(b, x, y + h, z, w, d, Math.min(w, d) * 0.5 * kind.pitch + 0.04, roof);
  else if (kind.roof === 'barrel') barrel(b, x, y + h, z, w, d, roof, along);
  else box(b, x, y + h, z, w + 0.025, 0.035, d + 0.025, trim, shade(wall, 0.93)); // flat roof with a parapet
  box(b, x, y, z + d / 2, w * 0.26, h * 0.6, 0.012, dark);                        // door, facing the camera
  if (w > 0.15 && h > 0.13) [-1, 1].forEach(sd => box(b, x + sd * w * 0.3, y + h * 0.55, z + d / 2, w * 0.13, h * 0.22, 0.01, shade(dark, 1.3)));
}

function flag(b, x, y, z, col, big) {
  const s = big ? 1.5 : 1;
  prism(b, x, y - 0.02, z, 0.008 * s, 0.2 * s, 5, rgb('#5a4632'));
  box(b, x + 0.06 * s, y + 0.2 * s - 0.075 * s, z, 0.12 * s, 0.07 * s, 0.006, col);
  if (big) lathe(b, x, y + 0.2 * s - 0.01, z, PROFILE.dome(0.016, 0.03), 6, rgb('#f2c94c'));
}

// the landmark at the centre: a hall for a village, a keep that grows taller with the city, crowned in the culture's style.
// Returns the height of its top.
function landmark(b, x, y, z, tier, S, wall, roof, trim, kind) {
  const shape = S.roofShape;
  if (tier === 0) { // a village hall: a bigger house
    house(b, x, y, z - 0.02, 0.26, 0.2, 0.16, kind, mix(wall, trim, 0.15), roof, trim, false);
    return y + 0.16 + 0.15;
  }
  const w = 0.18 + 0.035 * tier, h = 0.2 + 0.075 * tier, r = w * 0.55;
  if (shape === 'step') { // stepped pyramid with a temple on top
    let yy = y - 0.08, sz = w * 1.5; const steps = 2 + tier;
    for (let i = 0; i < steps; i++) { const sh = (h + 0.08) / steps; box(b, x, yy, z, sz, sh, sz, i % 2 ? wall : shade(wall, 0.92), shade(wall, 1.05)); yy += sh; sz *= 0.78; }
    box(b, x, yy, z, sz * 0.9, 0.08, sz * 0.9, trim); hip(b, x, yy + 0.08, z, sz * 0.9, sz * 0.9, 0.06, roof, 0.02);
    return yy + 0.14;
  }
  if (shape === 'cone') { // round tower with a conical roof
    lathe(b, x, y - 0.08, z, [[r * 1.05, 0], [r * 0.92, h + 0.08]], 10, wall);
    lathe(b, x, y + h, z, [[r * 1.05, 0], [r * 1.05, 0.03]], 10, trim);
    lathe(b, x, y + h + 0.03, z, PROFILE.cone(r * 1.15, r * 1.6), 10, roof);
    for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; prism(b, x + Math.cos(a) * r * 0.95, y + h * 0.3, z + Math.sin(a) * r * 0.95, 0.008, 0.04, 4, rgb('#5c3d1e')); } // beam ends
    return y + h + 0.03 + r * 1.6;
  }
  if (shape === 'round') { // a great lodge with a totem pole
    lathe(b, x, y - 0.08, z, [[r * 1.2, 0], [r * 1.2, h * 0.5 + 0.08]], 12, wall);
    lathe(b, x, y + h * 0.5, z, PROFILE.dome(r * 1.3, r * 1.1), 12, roof);
    const tx = x + r * 1.5, tz = z + r * 0.6;
    for (let k = 0; k < 3 + tier; k++) box(b, tx, y - 0.04 + k * 0.07, tz, 0.06, 0.07, 0.06, k % 2 ? trim : shade(roof, 1.2));
    box(b, tx, y - 0.04 + (3 + tier) * 0.07, tz, 0.16, 0.025, 0.04, trim);
    return y + h * 0.5 + r * 1.1;
  }
  box(b, x, y - 0.08, z, w, h + 0.08, w * 0.9, wall, wall);
  box(b, x, y + h - 0.02, z, w + 0.02, 0.03, w * 0.9 + 0.02, trim);                  // cornice
  box(b, x, y, z + w * 0.45, w * 0.3, h * 0.35, 0.012, rgb('#4a3424'));             // great door
  let top = y + h + 0.01;
  if (shape === 'dome') {
    lathe(b, x, top, z, [[r * 0.8, 0], [r * 0.8, 0.05]], 12, trim);
    lathe(b, x, top + 0.05, z, PROFILE.dome(r * 0.8, r * 0.75), 12, roof);
    top += 0.05 + r * 0.75; lathe(b, x, top - 0.01, z, [[0.02, 0], [0.02, 0.04], [0, 0.07]], 6, trim); top += 0.06;
  } else if (shape === 'onion') {
    lathe(b, x, top, z, [[r * 0.7, 0], [r * 0.7, 0.04]], 12, trim);
    lathe(b, x, top + 0.04, z, PROFILE.onion(r * 0.75, r * 1.5), 12, roof);
    if (tier >= 2) [-1, 1].forEach(sd => { const mx = x + sd * (w * 0.5 + 0.05), mz = z + 0.02; // minarets
      lathe(b, mx, y - 0.08, mz, [[0.035, 0], [0.03, h + 0.18 + tier * 0.03]], 8, wall);
      lathe(b, mx, y + h + 0.1 + tier * 0.03, mz, PROFILE.onion(0.04, 0.09), 8, roof); });
    top += 0.04 + r * 1.5;
  } else if (shape === 'pagoda') {
    const tiers = 1 + Math.min(3, tier); let ww = w;
    for (let i = 0; i < tiers; i++) {
      pagodaRoof(b, x, top - 0.01, z, ww, ww * 0.9, 0.06, roof);
      if (i < tiers - 1) { box(b, x, top + 0.03, z, ww * 0.7, 0.08, ww * 0.63, wall, wall); top += 0.11; ww *= 0.72; }
    }
    top += 0.08; lathe(b, x, top - 0.02, z, [[0.012, 0], [0.006, 0.08]], 5, trim); top += 0.06;
  } else if (shape === 'spire') {
    lathe(b, x, top, z, PROFILE.spire(r * 0.85, r * 2.4), 10, roof);
    if (tier >= 3) [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(c => lathe(b, x + c[0] * w * 0.38, top, z + c[1] * w * 0.34, PROFILE.spire(r * 0.3, r * 1.1), 8, roof));
    top += r * 2.4;
  } else { // gable and steep: a hipped roof, steep ones with a spire tower beside the keep
    const steep = shape === 'steep', rh = w * (steep ? 0.85 : 0.45);
    hip(b, x, top, z, w, w * 0.9, rh, roof, 0.035);
    if (steep && tier >= 2) { const tx = x + w * 0.62, tz = z + 0.04;
      lathe(b, tx, y - 0.08, tz, [[0.05, 0], [0.05, h + 0.2]], 8, wall);
      lathe(b, tx, y + h + 0.12, tz, PROFILE.cone(0.065, 0.22), 8, roof); }
    if (!steep && tier >= 3) { lathe(b, x, top + rh * 0.45, z, [[r * 0.45, 0], [r * 0.45, 0.05]], 10, trim); lathe(b, x, top + rh * 0.45 + 0.05, z, PROFILE.dome(r * 0.45, r * 0.45), 10, roof); }
    top += rh + (!steep && tier >= 3 ? 0.05 + r * 0.45 - rh * 0.55 : 0);
  }
  return top;
}

// walls (or a castle): ramparts on an octagon around the town with round corner towers and a gate facing the camera
function ramparts(b, cx, cz, R, heightAt, castle, wall, roof) {
  const n = 8, hw = castle ? 0.17 : 0.12, t = castle ? 0.06 : 0.045;
  wall = mix(wall, rgb('#b9b2a6'), 0.6); const stone = shade(wall, 0.85), top = shade(wall, 0.97);
  const P = [];
  for (let k = 0; k < n; k++) { const a = Math.PI / n + 2 * Math.PI * k / n, x = cx + Math.cos(a) * R, z = cz + Math.sin(a) * R * 0.92; P.push([x, Math.max(0, heightAt(x, z)), z]); }
  for (let k = 0; k < n; k++) {
    const A = P[k], B = P[(k + 1) % n], dx = B[0] - A[0], dz = B[2] - A[2], l = Math.hypot(dx, dz), ox = -dz / l * t / 2, oz = dx / l * t / 2;
    const a0 = [A[0] - ox, A[1] - 0.1, A[2] - oz], a1 = [A[0] + ox, A[1] - 0.1, A[2] + oz], b0 = [B[0] - ox, B[1] - 0.1, B[2] - oz], b1 = [B[0] + ox, B[1] - 0.1, B[2] + oz];
    const up = (p, yy) => [p[0], yy, p[2]];
    quad(b, a0, b0, up(b0, B[1] + hw), up(a0, A[1] + hw), stone); quad(b, a1, b1, up(b1, B[1] + hw), up(a1, A[1] + hw), stone);
    quad(b, up(a0, A[1] + hw), up(b0, B[1] + hw), up(b1, B[1] + hw), up(a1, A[1] + hw), top, [0, 1, 0]);
    const m = Math.max(2, Math.round(l / 0.07));
    for (let i = 1; i < m; i += 2) { const f = i / m, x = A[0] + dx * f, z = A[2] + dz * f, yy = A[1] + (B[1] - A[1]) * f; box(b, x, yy + hw - 0.005, z, 0.035, 0.035, t + 0.01, top); } // merlons
    if (k === 1) { const f = 0.5, x = A[0] + dx * f, z = A[2] + dz * f, yy = A[1] + (B[1] - A[1]) * f; box(b, x, yy, z + t / 2 + 0.002, 0.08, hw * 0.75, 0.012, rgb('#3a2a1c')); } // gate
  }
  P.forEach(p => {
    const tr = castle ? 0.07 : 0.055, th = hw + (castle ? 0.11 : 0.07);
    lathe(b, p[0], p[1] - 0.1, p[2], [[tr, 0], [tr, th + 0.1]], 8, wall);
    lathe(b, p[0], p[1] + th, p[2], PROFILE.cone(tr * 1.25, tr * 1.7), 8, roof);
  });
}

// Append a Blender model ({ v: [x,y,z, nx,ny,nz, r,g,b,a ...], i: [...] }) to the batch. Vertex alpha gives the part's colour:
// 0 the owner's, 0.2 / 0.4 / 0.6 the wall, roof and trim of `pal` (rgb then holds the baked shading), 1 the model's own.
// P(x, y, z) and N(nx, ny, nz) carry model space to the map.
function merge(b, M, pal, P, N) {
  const v = M.v, idx = M.i, cache = new Array(v.length / 10);
  const at = k => {
    if (cache[k]) return cache[k];
    const o = k * 10, a = v[o + 9], base = a < 0.1 ? pal.own : a < 0.3 ? pal.wall : a < 0.5 ? pal.roof : a < 0.7 ? pal.trim : null;
    const c = base ? [base[0] * v[o + 6], base[1] * v[o + 7], base[2] * v[o + 8], 1] : [v[o + 6], v[o + 7], v[o + 8], 1];
    return (cache[k] = [P(v[o], v[o + 1], v[o + 2]), N(v[o + 3], v[o + 4], v[o + 5]), c]);
  };
  for (let t = 0; t < idx.length; t++) { const q = at(idx[t]); vert(b, q[0], q[1], q[2]); }
}
// a model stood at (x, y, z), turned by yaw (its front, +z, toward (sin yaw, cos yaw)) and scaled (sx across, sy up)
function place(b, M, pal, x, y, z, yaw, sx, sy) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  merge(b, M, pal, (px, py, pz) => { px *= sx; pz *= sx; return [x + px * c + pz * s, y + py * sy, z - px * s + pz * c]; },
    (nx, ny, nz) => { nx /= sx; nz /= sx; ny /= sy; const l = Math.hypot(nx, ny, nz) || 1; return [(nx * c + nz * s) / l, ny / l, (-nx * s + nz * c) / l]; });
}
function modelTop(M) { if (M.top === undefined) { let t = 0; for (let k = 1; k < M.v.length; k += 10) t = Math.max(t, M.v[k]); M.top = t; } return M.top; }

// ramparts from the Blender models: a wall stretched between round corner towers (following the ground), a gatehouse facing
// the camera; a castle's are taller and thicker
function modelRamparts(b, cx, cz, R, heightAt, castle, pal, mdl) {
  const n = 8, P = [], k = castle ? 1.3 : 1, seg = mdl('wall_seg');
  for (let i = 0; i < n; i++) { const a = Math.PI / n + 2 * Math.PI * i / n, x = cx + Math.cos(a) * R, z = cz + Math.sin(a) * R * 0.92; P.push([x, Math.max(0, heightAt(x, z)), z]); }
  for (let i = 0; i < n; i++) {
    let A = P[i], B = P[(i + 1) % n];
    const mx = (A[0] + B[0]) / 2 - cx, mz = (A[2] + B[2]) / 2 - cz;
    if (-(B[2] - A[2]) * mx + (B[0] - A[0]) * mz < 0) { const t = A; A = B; B = t; } // run so that the model's front faces outward
    const dx = B[0] - A[0], dz = B[2] - A[2], l = Math.hypot(dx, dz), ux = dx / l, uz = dz / l, ox = -uz, oz = ux;
    merge(b, seg, pal, (px, py, pz) => { const t = px + 0.5; pz *= k; return [A[0] + dx * t + ox * pz, A[1] + (B[1] - A[1]) * t + py * k, A[2] + dz * t + oz * pz]; },
      (nx, ny, nz) => [ux * nx + ox * nz, ny, uz * nx + oz * nz]);
    if (i === 1) { const gx = (A[0] + B[0]) / 2, gz = (A[2] + B[2]) / 2; place(b, mdl('wall_gate'), pal, gx, Math.min(A[1], B[1]), gz, Math.atan2(ox, oz), k, k); }
  }
  P.forEach(p => place(b, mdl('wall_tower'), pal, p[0], p[1], p[2], 0, castle ? 1.25 : 1, castle ? 1.25 : 1));
}

// One settlement's icon. opts.view: the "Show city" stage, with only the ground and the walls (the buildings are pictures then).
// Returns { batch, top } (top: height of the landmark, for the name label).
function buildCity(AU, g, s, heightAt, opts) {
  const b = geo.batch(), t = g.tiles[s.tile], civ = g.civs[s.civ]; if (!t || !civ) return { batch: b, top: 0 };
  const c = center(t.col, t.row), culture = civ && AU.cultureOf ? AU.cultureOf(civ) : null;
  const S = (AU.PALACE_STYLES && AU.PALACE_STYLES[culture]) || DEFAULT_STYLE, kind = HOUSE[culture] || HOUSE.mediterranean;
  const tier = tierOf(s), R = opts && opts.view ? 0.86 : RADIUS[tier], gy = (x, z) => Math.max(0, heightAt(x, z));
  const tame = col => { const l = 0.3 * col[0] + 0.59 * col[1] + 0.11 * col[2]; return l > 0.75 ? shade(col, 0.75 / l) : col; }; // pale walls glare in full sun
  const wall = tame(rgb(S.wall)), roof = rgb(S.roof), trim = tame(rgb(S.trim)), hroof = kind.col ? rgb(kind.col) : roof, own = rgb(civ.color || '#cccccc');
  const y0 = gy(c[0], c[1]);
  plaza(b, c[0], c[1], R * 0.95, gy, rgb(s.isCity ? '#a8987c' : '#9c8460'));
  const blds = s.buildings || [], castle = blds.indexOf('castle') >= 0;
  const mdl = name => (opts && opts.models && opts.models(name)) || null;
  if (castle || blds.indexOf('walls') >= 0) {
    if (mdl('wall_seg') && mdl('wall_tower') && mdl('wall_gate')) modelRamparts(b, c[0], c[1], Math.min(0.9, R + 0.1), heightAt, castle, { wall: mix(wall, rgb('#b9b2a6'), 0.6), roof, trim, own }, mdl);
    else ramparts(b, c[0], c[1], Math.min(0.9, R + 0.1), heightAt, castle, wall, roof);
  }
  if (opts && opts.view) return { batch: b, top: y0 + 0.8 };
  SLOTS.slice(0, HOUSES[tier]).forEach((p, i) => {
    const x = c[0] + p.x, z = c[1] + p.z, inner = p.ring === 0 && tier >= 3;
    const w = 0.15 + 0.05 * p.j + (inner ? 0.03 : 0), d = 0.13 + 0.04 * p.k + (inner ? 0.02 : 0);
    const h = 0.11 + 0.025 * tier + 0.04 * p.k + (inner ? 0.07 : 0) + (tier === 4 && p.ring === 1 ? 0.05 : 0);
    const wc = i % 3 === 0 ? mix(wall, [1, 1, 1, 1], 0.12) : i % 3 === 1 ? shade(wall, 0.9) : wall, rc = shade(hroof, 0.86 + 0.24 * p.j);
    const rv = opts && opts.river && opts.river(x, z); if (rv && rv.d < rv.hw + 0.12) return; // the river runs through town: no house in it
    const from = b.p.length / 3, hy = gy(x, z), M = mdl('house_' + (culture || 'mediterranean') + '_' + p.v);
    if (M) { // a little bigger and taller as the city grows; turned a little, doors still toward the camera
      const sx = 0.9 + 0.25 * p.j + (inner ? 0.1 : 0), sy = 0.85 + 0.05 * tier + 0.2 * p.k + (p.ring === 0 ? -0.1 : p.ring === 1 && tier === 4 ? 0.15 : 0); // the landmark stays the tallest
      place(b, M, { wall: wc, roof: rc, trim, own }, x, hy, z, (p.k - 0.5) * 0.7, sx, sy);
      return;
    }
    house(b, x, hy, z, w, d, h, kind, wc, rc, trim, p.along); stretch(b, from, hy, TALL);
  });
  const LM = mdl('landmark_' + (culture || 'mediterranean') + '_' + tier);
  let top;
  if (LM) { place(b, LM, { wall, roof, trim, own }, c[0], y0, c[1] - 0.03, 0, 1, 1); top = y0 + modelTop(LM); }
  else { const from = b.p.length / 3; top = y0 + (landmark(b, c[0], y0, c[1] - 0.03, tier, S, wall, roof, trim, kind) - y0) * TALL; stretch(b, from, y0, TALL); }
  flag(b, c[0] + 0.01, top, c[1] - 0.03, own, !!s.isCapital);
  return { batch: b, top: top + (s.isCapital ? 0.3 : 0.2) };
}

// stretch what was drawn since vertex `from` upward from its ground: the models read as chibi buildings next to the units
const TALL = 1.4;
function stretch(b, from, ground, k) { for (let i = from * 3 + 1; i < b.p.length; i += 3) b.p[i] = ground + (b.p[i] - ground) * k; }
// a paved square draped over the ground (a flat drum would stand out of slopes)
function plaza(b, cx, cz, R, gy, col) {
  const from = b.p.length / 3;
  const n = 20, rings = [0, 0.4, 0.75, 1], P = rings.map(f => { const row = []; for (let k = 0; k < n; k++) { const a = 2 * Math.PI * k / n, x = cx + Math.cos(a) * R * f, z = cz + Math.sin(a) * R * f * 0.95; row.push([x, gy(x, z) + 0.015, z]); } return row; });
  for (let r = 0; r < rings.length - 1; r++) for (let k = 0; k < n; k++) {
    const a = P[r][k], b2 = P[r][(k + 1) % n], c = P[r + 1][(k + 1) % n], d = P[r + 1][k], cc = shade(col, 1 - 0.06 * r);
    if (r === 0) tri(b, a, c, d, cc); else quad(b, a, b2, c, d, cc);
  }
  (b.noInk = b.noInk || []).push([from, b.p.length / 3]); // no ink outline on the paving
}

// what decides how an icon looks: it is rebuilt only when this changes
function cityKey(AU, g, s, view) {
  const blds = s.buildings || [];
  return [s.tile, s.civ, tierOf(s), !!s.isCapital, blds.indexOf('walls') >= 0, blds.indexOf('castle') >= 0, !!view].join(':');
}

module.exports = { TIER_NAMES, tierOf, buildCity, cityKey, SLOTS, merge, place };
