"use strict";
// Shader sources for the Godot build (Godot shading language). Everything is procedural: no textures or paid art.

const NOISE = `
float h2(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p) {
  vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h2(i), h2(i + vec2(1.0, 0.0)), u.x), mix(h2(i + vec2(0.0, 1.0)), h2(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * vn(p); p = p * 2.07 + vec2(13.1, 7.7); a *= 0.5; } return s / 0.9375; }
// distance from a world point to the nearest hex edge (pointy-top hexes of radius 1, same layout as the map)
float hex_edge(vec2 p) {
  float q = 0.57735027 * p.x - p.y / 3.0, r = 2.0 / 3.0 * p.y;
  vec3 c = vec3(q, r, -q - r), rc = round(c), d = abs(rc - c);
  if (d.x > d.y && d.x > d.z) rc.x = -rc.y - rc.z; else if (d.y > d.z) rc.y = -rc.x - rc.z;
  vec2 l = p - vec2(1.7320508 * (rc.x + rc.y * 0.5), 1.5 * rc.y);
  return 0.8660254 - max(abs(l.x), max(abs(0.5 * l.x + 0.8660254 * l.y), abs(-0.5 * l.x + 0.8660254 * l.y)));
}
// bump the (view-space) normal by a scalar height field, from screen-space derivatives
vec3 bump(vec3 n, vec3 pos, float h, float k) {
  vec3 dpdx = dFdx(pos), dpdy = dFdy(pos); float dhx = dFdx(h), dhy = dFdy(h);
  vec3 r1 = cross(dpdy, n), r2 = cross(n, dpdx); float det = dot(dpdx, r1);
  vec3 grad = sign(det) * (dhx * r1 + dhy * r2);
  return normalize(abs(det) * n - grad * k);
}
`;

// soft cel lighting shared by the painted look: a soft terminator with a hint of banding, luminous shadows and a warm rim
const TOON_LIGHT = `
void light() {
  float d = smoothstep(-0.1, 0.45, dot(NORMAL, LIGHT));
  d = mix(d, floor(d * 3.0 + 0.5) / 3.0, 0.15);
  float lit = d * mix(0.5, 1.0, ATTENUATION);
  float rim = pow(1.0 - clamp(dot(NORMAL, VIEW), 0.0, 1.0), 4.0) * 0.12 * d;
  DIFFUSE_LIGHT += (lit + rim) * LIGHT_COLOR / PI;
}
`;

// Hand-painted cartoon terrain: palette colours from the tiles, brush strokes along slowly turning directions, warm and cool
// patches, painted rock with strata on slopes, snow caps, bright beaches, flowers in meadows and a crisp hex grid.
const PAINTED_TERRAIN = `
shader_type spatial;
render_mode cull_disabled;
uniform float grid_strength = 0.6; // 0 hides the grid (HUD toggle)
// detailed look: real ground textures (Poly Haven, CC0, fetched at build time) for grass, dry grass, sand, rock and snow,
// with their normal maps; has_* is 1 for each texture that was found (a missing one keeps the painted colour there)
uniform float detailed = 0.0;
uniform float relief = 0.0;         // painted+ look: the painted colours with the textures' bumps and light-and-dark detail
uniform sampler2D grass_d : source_color, filter_linear_mipmap_anisotropic, repeat_enable;
uniform sampler2D dry_d : source_color, filter_linear_mipmap_anisotropic, repeat_enable;
uniform sampler2D sand_d : source_color, filter_linear_mipmap_anisotropic, repeat_enable;
uniform sampler2D rock_d : source_color, filter_linear_mipmap_anisotropic, repeat_enable;
uniform sampler2D snow_d : source_color, filter_linear_mipmap_anisotropic, repeat_enable;
uniform sampler2D grass_n : hint_normal, filter_linear_mipmap_anisotropic, repeat_enable;
uniform sampler2D dry_n : hint_normal, filter_linear_mipmap_anisotropic, repeat_enable;
uniform sampler2D sand_n : hint_normal, filter_linear_mipmap_anisotropic, repeat_enable;
uniform sampler2D rock_n : hint_normal, filter_linear_mipmap_anisotropic, repeat_enable;
uniform sampler2D snow_n : hint_normal, filter_linear_mipmap_anisotropic, repeat_enable;
uniform vec4 has_tex = vec4(0.0);   // grass, dry grass, sand, rock
uniform float has_snow = 0.0;
uniform float tex_scale = 0.55;     // texture repeats per world unit (a tile is about 1.7 units across)
varying vec3 wpos;
varying vec2 mats;   // x: rockiness, y: sand
varying vec2 mats2;  // x: dry grass, y: snow
varying float meadow;
${NOISE}
vec3 srgb(vec3 c) { return pow(c, vec3(2.2)); }
// a ground texture at two scales, blended by a slow noise, so the repeat does not show from above
vec3 ground(sampler2D s, vec2 p, float k) { return mix(texture(s, p).rgb, texture(s, p * 0.37 + vec2(0.37, 0.71)).rgb, k); }
// a ground texture's light-and-dark detail around 1.0 (its colour divided by its average colour, the last mip level)
float detail(vec3 c, sampler2D s) { return dot(c, vec3(0.3, 0.59, 0.11)) / max(dot(textureLod(s, vec2(0.5), 14.0).rgb, vec3(0.3, 0.59, 0.11)), 0.02); }
vec3 nmap(sampler2D s, vec2 p) { vec3 n = texture(s, p).rgb * 2.0 - 1.0; return vec3(n.x, 0.0, -n.y); } // tangent-space bump as a world xz tilt
void vertex() { wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz; mats = UV; mats2 = UV2; meadow = COLOR.a; }
void fragment() {
  vec3 base = srgb(COLOR.rgb);
  float macro = fbm(wpos.xz * 0.22), ang = fbm(wpos.xz * 0.15 + 7.0) * 6.2832;
  vec2 dir = vec2(cos(ang), sin(ang)), q = vec2(dot(wpos.xz, dir), dot(wpos.xz, vec2(-dir.y, dir.x)));
  float stroke = fbm(vec2(q.x * 1.3, q.y * 7.5)), fine = fbm(wpos.xz * 9.0);
  float warp = fbm(wpos.xz * 0.35 + 3.0);                                               // painted blotches: warped noise in crisp tones
  float blot = fbm(wpos.xz * 0.75 + warp * 1.6);
  float tone = smoothstep(0.44, 0.47, blot) * 0.5 + smoothstep(0.6, 0.63, blot) * 0.5;
  vec3 col = base * mix(vec3(0.74, 0.8, 0.82), vec3(1.12, 1.1, 0.95), tone) * (0.93 + 0.14 * stroke);
  col = mix(col, col * vec3(1.08, 1.06, 0.8), smoothstep(0.6, 0.63, blot) * 0.5 * meadow);   // sunny yellow-green highlights
  col = mix(col, col * vec3(0.9, 0.98, 1.06), smoothstep(0.5, 0.25, macro) * 0.4);
  vec3 wn = normalize((INV_VIEW_MATRIX * vec4(NORMAL, 0.0)).xyz);
  float slope = 1.0 - wn.y;
  col *= mix(1.0, 0.78, smoothstep(0.08, 0.38, slope) * step(0.0, wpos.y));                 // painted shading on slopes, so hills read from above
  float rock_m = max(smoothstep(0.45, 0.62, slope + (stroke - 0.5) * 0.15), mats.x * smoothstep(0.35, 0.6, stroke + fine * 0.3)); // rock only where it is mountain-steep
  vec3 rock = srgb(vec3(0.56, 0.58, 0.65)) * (0.8 + 0.35 * stroke) * mix(0.84, 1.06, smoothstep(0.4, 0.6, sin(wpos.y * 14.0 + stroke * 3.0) * 0.5 + 0.5));
  col = mix(col, rock, clamp(rock_m, 0.0, 1.0) * step(-0.05, wpos.y));
  float snow = smoothstep(1.45, 1.6, wpos.y + (stroke - 0.5) * 0.25) * (1.0 - smoothstep(0.7, 0.95, slope));
  col = mix(col, srgb(vec3(0.95, 0.97, 1.0)), snow);
  float edge = wpos.y + (fbm(wpos.xz * 1.4 + 11.0) - 0.5) * 0.1;                         // wavy, irregular grass-to-sand edge
  float beach = smoothstep(-0.15, -0.04, wpos.y) * (1.0 - smoothstep(0.07, 0.1, edge));
  vec3 sand = srgb(vec3(0.97, 0.89, 0.68)) * (0.94 + 0.1 * fine);
  sand = mix(sand, srgb(vec3(0.84, 0.72, 0.5)), (1.0 - smoothstep(0.0, 0.035, wpos.y)) * 0.7);   // wet sand at the waterline
  col = mix(col, sand, beach * (1.0 - mats.x));
  col = mix(col, srgb(vec3(0.9, 0.84, 0.62)), smoothstep(-0.01, -0.25, wpos.y) * 0.55);  // sandy sea floor, seen through clear water
  vec2 cell = floor(wpos.xz * 7.0), f = fract(wpos.xz * 7.0) - 0.5;                       // flowers in meadows
  float hh = h2(cell); vec2 off = vec2(h2(cell + 3.1), h2(cell + 7.7)) - 0.5;
  float near = 1.0 - smoothstep(0.08, 0.16, fwidth(wpos.x) * 7.0);                         // flowers only when they are several pixels wide
  float flower = (1.0 - smoothstep(0.07, 0.11, length(f - off * 0.6))) * step(0.88, hh) * meadow * step(0.06, wpos.y) * (1.0 - rock_m) * near;
  vec3 fc = hh > 0.95 ? vec3(0.95, 0.9, 0.82) : (hh > 0.92 ? vec3(0.98, 0.82, 0.3) : vec3(0.92, 0.5, 0.62));
  float rbank = max(-mats2.y, 0.0), snowf = max(mats2.y, 0.0);                             // river banks (negative) or snowfield
  col = mix(col, srgb(vec3(0.58, 0.5, 0.36)) * (0.85 + 0.2 * fine), smoothstep(0.15, 0.7, rbank + (stroke - 0.5) * 0.3)); // damp earth on the banks and bed
  col = mix(col, srgb(fc), flower * (1.0 - detailed) * (1.0 - rbank));
  if (detailed > 0.0 || relief > 0.0) {
    vec2 p = wpos.xz * tex_scale; float k = smoothstep(0.3, 0.7, fbm(wpos.xz * 0.12 + 5.0));
    float brk = (fbm(wpos.xz * 1.7 + 21.0) - 0.5) * 0.5;                                    // ragged borders between grounds
    vec3 tg = ground(grass_d, p, k), ts = ground(sand_d, p * 1.3, k), tw = ground(snow_d, p, k), tdr = ground(dry_d, p, k);
    float dl = detail(tg, grass_d);
    float lum = dot(tg, vec3(0.3, 0.59, 0.11));
    vec3 td = mix(mix(tg, vec3(lum) * vec3(1.3, 1.18, 0.75), 0.4), mix(tg, tdr, 0.55), has_tex.y); // plains and tundra: green and dry grass mixed (or the grass, sun-dried)
    tg *= mix(vec3(1.0), clamp(base / max(srgb(vec3(0.37, 0.66, 0.27)), vec3(0.01)), vec3(0.5), vec3(1.4)), 0.2); // the texture's own colours, a touch of the tile's (forests darker)
    vec3 an = abs(wn); an /= (an.x + an.y + an.z);                                           // rock: projected from three sides
    vec3 tr = texture(rock_d, wpos.zy * tex_scale).rgb * an.x + texture(rock_d, wpos.xz * tex_scale).rgb * an.y + texture(rock_d, wpos.xy * tex_scale).rgb * an.z;
    float w_dry = smoothstep(0.25, 0.6, mats2.x + brk);
    float w_sand = clamp(max(beach * (1.0 - mats.x), smoothstep(0.3, 0.7, mats.y + brk)) + smoothstep(-0.01, -0.2, wpos.y), 0.0, 1.0) * has_tex.z;
    float w_rock = clamp(max(rock_m, smoothstep(0.45, 0.85, mats.x + brk * 0.5)), 0.0, 1.0) * has_tex.w; // mountain tiles are rock all over
    float w_snow = clamp(max(snow, smoothstep(0.4, 0.75, snowf + brk)), 0.0, 1.0) * has_snow;
    float w_bank = smoothstep(0.15, 0.7, rbank + brk * 0.6);
    vec3 dc = mix(col, tg, has_tex.x);
    dc = mix(dc, td, w_dry); dc = mix(dc, ts, w_sand); dc = mix(dc, tr, w_rock); dc = mix(dc, tw, w_snow);
    dc = mix(dc, mix(ts, tr, 0.35) * vec3(0.62, 0.58, 0.5), w_bank * has_tex.z);              // wet sand and pebbles along rivers
    vec3 bn = nmap(grass_n, p) * has_tex.x;
    bn = mix(bn, nmap(dry_n, p), w_dry * has_tex.y);
    bn = mix(bn, nmap(sand_n, p * 1.3), max(w_sand, w_bank)); bn = mix(bn, nmap(rock_n, wpos.xz * tex_scale), w_rock); bn = mix(bn, nmap(snow_n, p), w_snow);
    vec3 wn2 = normalize(wn + bn * mix(0.45, 0.6, detailed) * max(detailed, relief));
    NORMAL = normalize((VIEW_MATRIX * vec4(wn2, 0.0)).xyz);
    col = mix(col, dc, detailed);
    // painted+: the same grounds' light and dark, laid over the painted colours (no realistic colour)
    dl = mix(dl, detail(tdr, dry_d), w_dry * has_tex.y); dl = mix(dl, detail(ts, sand_d), max(w_sand, w_bank * has_tex.z));
    dl = mix(dl, detail(tr, rock_d), w_rock); dl = mix(dl, detail(tw, snow_d), w_snow);
    col *= mix(1.0, clamp(dl, 0.6, 1.4), 0.45 * relief * (1.0 - detailed) * (1.0 - flower));
  }
  // hex grid: an ink line like the outlines on units and scenery, but lighter: about 1.5 pixels at any zoom (never thinner
  // than 0.008 world units up close) and a little see-through
  float e = hex_edge(wpos.xz), px = length(fwidth(wpos.xz)) * 0.71, lw = max(px * 0.75, 0.008);
  col = mix(col, vec3(0.012, 0.01, 0.014), (1.0 - smoothstep(lw, lw + px * 1.0, e)) * clamp(grid_strength * 1.3, 0.0, 0.8) * step(0.0, wpos.y));
  ALBEDO = col;
  ROUGHNESS = 1.0;
  SPECULAR = 0.0;
}
// painted look: soft cel light; detailed look: plain natural light (cel bands and wrap wash real textures out)
void light() {
  float ndl = dot(NORMAL, LIGHT);
  float d = smoothstep(-0.1, 0.45, ndl);
  d = mix(d, floor(d * 3.0 + 0.5) / 3.0, 0.15);
  float toon = d * mix(0.5, 1.0, ATTENUATION) + pow(1.0 - clamp(dot(NORMAL, VIEW), 0.0, 1.0), 4.0) * 0.12 * d;
  float real = max(ndl, 0.0) * ATTENUATION;
  DIFFUSE_LIGHT += mix(toon, real, detailed) * LIGHT_COLOR / PI;
}
`;

// trees, bushes, grass and rocks: vertex colours times the instance tint, a gentle wind sway that grows with height, toon light
const PAINTED_PROP = `
shader_type spatial;
render_mode cull_disabled;
uniform float wind = 1.0;
varying vec3 vnorm; // the mesh's own normal in view space: double-sided faces seen from behind keep it instead of a flipped one
void vertex() {
  vec3 o = (MODEL_MATRIX * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float h = max(VERTEX.y, 0.0), sway = (sin(TIME * 1.6 + o.x * 0.7 + o.z * 0.5) * 0.04 + sin(TIME * 2.7 + o.z * 1.3) * 0.015) * wind * h * h * 4.0;
  VERTEX.x += sway; VERTEX.z += sway * 0.6; // Godot multiplies the instance tint into COLOR by itself
  vnorm = (MODELVIEW_MATRIX * vec4(NORMAL, 0.0)).xyz;
}
void fragment() {
  NORMAL = normalize(vnorm);
  ALBEDO = pow(COLOR.rgb, vec3(2.2));
  ROUGHNESS = 1.0;
  SPECULAR = 0.0;
}
${TOON_LIGHT}
`;

// cartoon water: four-step depth colours from turquoise shallows to deep blue, slow painted wave streaks, a soft sun glint and
// horizon brightening, and a broken foam band at the shore. Every detail is broad (several pixels at least), so nothing twinkles.
const TOON_WATER = `
shader_type spatial;
render_mode blend_mix, cull_disabled, depth_draw_opaque, unshaded;
uniform sampler2D depth_tex : hint_depth_texture, filter_linear_mipmap;
uniform vec3 sun_dir = vec3(-0.447, 0.719, 0.532); // toward the sun, world space (main.js sets it from the light)
uniform float grid_strength = 0.6;
uniform vec4 map_rect = vec4(-1.0, -1.0, 1000.0, 1000.0); // x0, z0, x1, z1: the grid covers the map's sea tiles, not the open sea
varying vec3 wpos;
${NOISE}
vec3 srgb(vec3 c) { return pow(c, vec3(2.2)); }
void vertex() { wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz; VERTEX.y += (sin(wpos.x * 1.1 + TIME * 0.9) + sin(wpos.z * 1.7 - TIME * 1.2)) * 0.005; }
void fragment() {
  float d = texture(depth_tex, SCREEN_UV).r;
  vec4 g = INV_PROJECTION_MATRIX * vec4(SCREEN_UV * 2.0 - 1.0, d, 1.0); g.xyz /= g.w;
  float depth = max(0.0, VERTEX.z - g.z) * 0.8, t = 1.0 - exp(-depth * 2.8);
  vec3 c0 = srgb(vec3(0.6, 0.94, 0.86)), c1 = srgb(vec3(0.2, 0.8, 0.84)), c2 = srgb(vec3(0.07, 0.55, 0.78)), c3 = srgb(vec3(0.05, 0.33, 0.62));
  vec3 col = t < 0.33 ? mix(c0, c1, t / 0.33) : (t < 0.7 ? mix(c1, c2, (t - 0.33) / 0.37) : mix(c2, c3, (t - 0.7) / 0.3));
  vec2 p = wpos.xz;
  float px = fwidth(p.x), detail = 1.0 - smoothstep(0.03, 0.07, px);
  // slow painted wave streaks: stretched, domain-warped noise in two soft tones
  vec2 warp = vec2(fbm(p * 0.25 + TIME * 0.02), fbm(p * 0.25 + 5.0 - TIME * 0.015));
  float streak = fbm(vec2(p.x * 0.45, p.y * 1.4) + warp * 2.5 + vec2(TIME * 0.05, 0.0));
  col *= 1.0 + smoothstep(0.55, 0.62, streak) * 0.05 * smoothstep(0.1, 0.4, t) * detail; // light streaks only, and only when close enough to read
  // gentle wave normal for the glint and the horizon tint
  float waves = fbm(p * 0.8 + vec2(TIME * 0.06, TIME * 0.04)) * 0.6 + fbm(p * 1.7 - vec2(TIME * 0.05, -TIME * 0.07)) * 0.4;
  float near = 1.0 - smoothstep(0.04, 0.1, px);                                               // glint and ripples only up close
  vec3 n = bump(NORMAL, VERTEX, waves, 0.04 * near);
  vec3 sunv = normalize((VIEW_MATRIX * vec4(sun_dir, 0.0)).xyz);
  float glint = pow(max(dot(reflect(-VIEW, n), sunv), 0.0), 24.0) * 0.18 * smoothstep(0.2, 0.6, t) * near;
  float fres = pow(1.0 - clamp(dot(n, VIEW), 0.0, 1.0), 3.0);
  col = mix(col, srgb(vec3(0.72, 0.88, 0.96)), fres * 0.35) + glint;
  // shore foam: a white band broken by noise, kept steady at the silhouettes of objects in front of the water
  float dd = fwidth(depth), steady = 1.0 - smoothstep(0.015, 0.04, dd), aa = min(dd, 0.01) * 1.5 + 0.002;
  float brk = fbm(p * 3.0 + vec2(TIME * 0.12, -TIME * 0.08));
  float band = 1.0 - smoothstep(0.012 + brk * 0.02, 0.012 + brk * 0.02 + aa + 0.004, depth);
  float edge = (1.0 - smoothstep(0.004, 0.004 + aa, depth));
  float l1 = depth - (0.055 + 0.012 * sin(TIME * 0.7)) + (brk - 0.5) * 0.02;
  float ring = (1.0 - smoothstep(0.0, 0.007 + aa, abs(l1))) * 0.55 * detail;
  float foam = clamp(max(band * (0.65 + 0.35 * brk), edge) + ring, 0.0, 1.0) * steady;
  float e = hex_edge(p), pg = length(fwidth(p)) * 0.71, lw = max(pg * 0.75, 0.008), inside = step(map_rect.x, p.x) * step(map_rect.y, p.y) * step(p.x, map_rect.z) * step(p.y, map_rect.w);
  col = mix(col, srgb(vec3(0.03, 0.08, 0.14)), (1.0 - smoothstep(lw, lw + pg * 1.0, e)) * grid_strength * 0.6 * inside); // the ink grid on sea tiles, softer than on land
  ALBEDO = mix(col, vec3(0.97, 0.99, 1.0), foam);
  ALPHA = clamp(mix(0.38, 0.93, t) + foam * 0.8, 0.0, 1.0);
}
`;

// leaf-cluster cards: five leaves drawn per card (no texture), cut out with alpha scissor, shaded as one soft crown by the
// spherical normals from props.js, swaying with the tree
const PAINTED_LEAF = `
shader_type spatial;
render_mode cull_disabled;
uniform float wind = 1.0;
varying float vary;
varying vec3 vnorm; // the crown's spherical normal in view space, kept even for cards seen from behind
void vertex() {
  vec3 o = (MODEL_MATRIX * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float h = max(VERTEX.y, 0.0), sway = (sin(TIME * 1.6 + o.x * 0.7 + o.z * 0.5) * 0.04 + sin(TIME * 2.7 + o.z * 1.3) * 0.015) * wind * h * h * 4.0;
  VERTEX.x += sway + sin(TIME * 3.1 + VERTEX.y * 20.0 + o.x) * 0.004; VERTEX.z += sway * 0.6; // instance tint is already in COLOR
  vary = fract(sin(dot(VERTEX.xz, vec2(12.9898, 78.233))) * 43758.5453);
  vnorm = (MODELVIEW_MATRIX * vec4(NORMAL, 0.0)).xyz;
}
float leaf(vec2 p, vec2 c, float a, vec2 r) {
  vec2 d = p - c; float ca = cos(a), sa = sin(a);
  d = vec2(ca * d.x + sa * d.y, -sa * d.x + ca * d.y) / r;
  return 1.0 - length(d);
}
void fragment() {
  vec2 p = UV * 2.0 - 1.0;
  float m = 1.0 - length(p) / 0.42, shade = 0.5;
  for (int i = 0; i < 5; i++) {
    float a = float(i) * 1.2566 + 0.35, v = leaf(p, vec2(cos(a), sin(a)) * 0.46, a, vec2(0.5, 0.27));
    if (v > m) { m = v; shade = float(i) / 4.0; }
  }
  ALPHA = step(0.0, m);
  ALPHA_SCISSOR_THRESHOLD = 0.5;
  NORMAL = normalize(vnorm);
  vec3 base = pow(COLOR.rgb, vec3(2.2));
  ALBEDO = base * (0.86 + 0.22 * shade + 0.08 * vary) * (0.88 + 0.2 * smoothstep(0.0, 0.6, m));
  ROUGHNESS = 1.0;
  SPECULAR = 0.0;
}
${TOON_LIGHT}
`;

// 2.5D standees: the painted unit and building pictures as camera-facing cards that the scene lights like rounded objects.
// The card pivots at its base (feet stay on the ground) and faces whatever is rendering it: the camera, or the sun in the
// shadow pass, so each picture casts its own silhouette shadow. A "pillow" normal from the blurred silhouette rounds the
// edges toward the light, the painted shading in the picture stays, and units breathe gently.
const STANDEE = `
shader_type spatial;
render_mode skip_vertex_transform, cull_disabled;
uniform sampler2D tex : source_color, filter_linear_mipmap, repeat_disable;
uniform float anim = 0.0;      // 1 for units: a gentle breathing sway
uniform float roundness = 3.6; // how strongly the edges bend toward or away from the light
uniform vec4 uv_rect = vec4(0.0, 0.0, 1.0, 1.0); // the part of the picture with paint in it (main.js crops the empty margins)
uniform float badge = 0.0; // 1: draw the picture as an icon on a round dark badge with a cream rim and a black ring (resource icons)
varying float glow;
void vertex() {
  if (badge < 0.5) UV = uv_rect.xy + UV * uv_rect.zw;
  vec3 origin = (MODEL_MATRIX * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float sc = length(MODEL_MATRIX[1].xyz), phase = origin.x * 1.7 + origin.z * 2.3;
  vec3 v = VERTEX;
  v.y *= 1.0 + anim * 0.018 * sin(TIME * 2.2 + phase);
  v.x += anim * 0.012 * sin(TIME * 1.3 + phase) * (v.y / 0.8);
  vec3 right = normalize(INV_VIEW_MATRIX[0].xyz), up = normalize(INV_VIEW_MATRIX[1].xyz);
  vec3 world = origin + (right * v.x + up * v.y) * sc;
  VERTEX = (VIEW_MATRIX * vec4(world, 1.0)).xyz;
  NORMAL = vec3(0.0, 0.0, 1.0); TANGENT = vec3(1.0, 0.0, 0.0); BINORMAL = vec3(0.0, 1.0, 0.0);
}
void fragment() {
  ALPHA_SCISSOR_THRESHOLD = 0.5;
  if (badge > 0.5) {
    vec2 p = UV - 0.5; float d = length(p);
    vec2 iu = p / 0.7 + 0.5;
    vec4 ic = (iu.x >= 0.0 && iu.x <= 1.0 && iu.y >= 0.0 && iu.y <= 1.0) ? texture(tex, uv_rect.xy + iu * uv_rect.zw) : vec4(0.0);
    vec3 bg = mix(vec3(0.03, 0.035, 0.07), vec3(0.08, 0.1, 0.18), smoothstep(0.45, 0.0, d));
    float rim = smoothstep(0.385, 0.4, d), inkr = smoothstep(0.435, 0.445, d); // cream rim, then a black ink ring like the 3D outlines
    vec3 col = mix(mix(mix(bg, vec3(0.92, 0.82, 0.56), rim), vec3(0.02), inkr), ic.rgb, ic.a * (1.0 - rim));
    ALPHA = 1.0 - smoothstep(0.49, 0.5, d);
    ALBEDO = col * 0.75; EMISSION = col * 0.35; // mostly self-lit, so icons read the same in sun and shade
    NORMAL = vec3(0.0, 0.0, 1.0);
    ROUGHNESS = 1.0; SPECULAR = 0.0;
  } else {
  vec4 c = texture(tex, UV);
  ALPHA = c.a;
  // pillow normal: gradient of the silhouette blurred at two radii (edges lean outward, the middle faces the viewer)
  vec2 px = vec2(0.045, 0.034);
  float ax = 0.0, ay = 0.0;
  for (int i = 1; i <= 2; i++) {
    vec2 o = px * float(i);
    ax += texture(tex, UV + vec2(o.x, 0.0)).a - texture(tex, UV - vec2(o.x, 0.0)).a;
    ay += texture(tex, UV + vec2(0.0, o.y)).a - texture(tex, UV - vec2(0.0, o.y)).a;
  }
  NORMAL = normalize(vec3(-ax * roundness * 0.5, ay * roundness * 0.5, 1.0));
  ALBEDO = c.rgb;
  ROUGHNESS = 1.0;
  SPECULAR = 0.0;
  }
}
void light() {
  // the picture already carries painted shading, so the scene light only nudges it: a soft lit side, a soft shade side,
  // and the scene's shadows (a unit under a tree or behind a mountain darkens)
  float ndl = dot(NORMAL, LIGHT);
  float wrap = smoothstep(-0.45, 0.75, ndl);
  DIFFUSE_LIGHT += LIGHT_COLOR / PI * mix(0.5, 1.2, wrap) * mix(0.5, 1.0, ATTENUATION);
}
`;

// River water: flows downstream (uv.y is the distance along the river), shallow and clear at the banks where the bed shows
// through, deeper in the middle, with slow drifting streaks, small ripples that catch the sun and a thin foam line where the
// water meets the bank (from the depth buffer, like the sea). The detailed look uses deeper, more natural colours.
const RIVER_WATER = `
shader_type spatial;
render_mode blend_mix, cull_disabled, depth_draw_opaque, unshaded;
uniform sampler2D depth_tex : hint_depth_texture, filter_linear_mipmap;
uniform vec3 sun_dir = vec3(-0.447, 0.719, 0.532);
uniform float detailed = 0.0;
varying vec3 wpos;
varying vec2 fuv;
${NOISE}
vec3 srgb(vec3 c) { return pow(c, vec3(2.2)); }
void vertex() { wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz; fuv = UV; }
void fragment() {
  float d = texture(depth_tex, SCREEN_UV).r;
  vec4 g = INV_PROJECTION_MATRIX * vec4(SCREEN_UV * 2.0 - 1.0, d, 1.0); g.xyz /= g.w;
  float depth = max(0.0, VERTEX.z - g.z), t = 1.0 - exp(-depth * 22.0);
  vec3 shallow = mix(srgb(vec3(0.5, 0.86, 0.82)), srgb(vec3(0.42, 0.72, 0.66)), detailed);
  vec3 mid = mix(srgb(vec3(0.18, 0.66, 0.78)), srgb(vec3(0.13, 0.5, 0.6)), detailed);
  vec3 deep = mix(srgb(vec3(0.08, 0.42, 0.62)), srgb(vec3(0.05, 0.3, 0.45)), detailed);
  vec3 col = t < 0.5 ? mix(shallow, mid, t / 0.5) : mix(mid, deep, (t - 0.5) / 0.5);
  float px = length(fwidth(wpos.xz)), near = 1.0 - smoothstep(0.03, 0.08, px);
  vec2 f = vec2(fuv.x * 1.2, fuv.y * 1.6 - TIME * 0.35);                                  // flowing downstream
  float streak = fbm(vec2(f.x * 2.5, f.y * 0.9) + fbm(f * 0.7) * 1.5);
  col *= 1.0 + smoothstep(0.55, 0.68, streak) * 0.12 * (1.0 - min(1.0, abs(fuv.x))) * near;
  float waves = fbm(vec2(fuv.x * 3.0, fuv.y * 4.0 - TIME * 0.9)) * 0.6 + fbm(vec2(fuv.x * 6.0 + 3.0, fuv.y * 7.0 - TIME * 1.4)) * 0.4;
  vec3 n = bump(NORMAL, VERTEX, waves, 0.035 * near);
  vec3 sunv = normalize((VIEW_MATRIX * vec4(sun_dir, 0.0)).xyz);
  float glint = pow(max(dot(reflect(-VIEW, n), sunv), 0.0), 30.0) * 0.22 * near;
  float fres = pow(1.0 - clamp(dot(n, VIEW), 0.0, 1.0), 3.0);
  col = mix(col, srgb(vec3(0.75, 0.88, 0.95)), fres * 0.3) + glint;
  float dd = fwidth(depth), steady = 1.0 - smoothstep(0.015, 0.04, dd), aa = min(dd, 0.01) * 1.5 + 0.002;
  float brk = fbm(vec2(fuv.x * 4.0, fuv.y * 5.0 - TIME * 0.6));
  float foam = (1.0 - smoothstep(0.004 + brk * 0.012, 0.01 + brk * 0.02 + aa, depth)) * steady * (0.55 + 0.45 * brk);
  ALBEDO = mix(col, vec3(0.94, 0.97, 0.98), foam * mix(0.85, 0.6, detailed));
  float shore = 1.0 - smoothstep(0.9, 1.3, abs(fuv.x) + (fbm(vec2(fuv.y * 2.3, fuv.x * 3.0)) - 0.5) * 0.35); // ragged edges, not a ribbon
  ALPHA = clamp(mix(0.5, 0.92, t) + foam * 0.6, 0.0, 1.0) * shore;
}
`;

// 3D units (models from tools/blender/models.py): vertex colours with baked shading; parts with vertex alpha 0 take the
// owner's colour (their rgb holds only the shading), soft toon light like the props
const UNIT_3D = `
shader_type spatial;
render_mode cull_disabled;
uniform vec3 team : source_color = vec3(0.8, 0.2, 0.2);
varying vec3 vnorm;
void vertex() { vnorm = (MODELVIEW_MATRIX * vec4(NORMAL, 0.0)).xyz; }
void fragment() {
  NORMAL = normalize(vnorm);
  vec3 c = pow(COLOR.rgb, vec3(2.2));
  ALBEDO = mix(team * COLOR.rgb, c, step(0.5, COLOR.a));
  ROUGHNESS = 1.0;
  SPECULAR = 0.0;
}
${TOON_LIGHT}
`;

// unit health bars, Civ style: a small bar over each unit facing the camera, framed in the owner's colour, filling green,
// then yellow, then red; drawn over everything so it always reads. Per-unit values come in as instance uniforms.
const HEALTH_BAR = `
shader_type spatial;
render_mode unshaded, skip_vertex_transform, cull_disabled, depth_test_disabled, shadows_disabled;
instance uniform vec4 team : source_color = vec4(1.0); // rgb: the owner's colour, a: health 0..1
void vertex() {
  vec3 o = (MODEL_MATRIX * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  vec3 right = normalize(INV_VIEW_MATRIX[0].xyz), up = normalize(INV_VIEW_MATRIX[1].xyz);
  VERTEX = (VIEW_MATRIX * vec4(o + right * VERTEX.x + up * VERTEX.y, 1.0)).xyz;
}
void fragment() {
  // a thick black outline, then a frame in the owner's colour, then the health fill (the quad is 4:1, so x thicknesses are /4)
  vec2 uv = UV; float hp = team.a;
  vec2 e = min(uv, 1.0 - uv) * vec2(4.0, 1.0);   // distance to the nearest edge, in bar heights
  float edge = min(e.x, e.y);
  float f = (uv.x - 0.08) / 0.84;                   // position along the fill
  vec3 fill = hp > 0.5 ? vec3(0.2, 0.85, 0.2) : (hp > 0.25 ? vec3(1.0, 0.75, 0.1) : vec3(0.95, 0.2, 0.15));
  vec3 col = edge < 0.18 ? vec3(0.0) : edge < 0.32 ? team.rgb : (f < hp ? fill : vec3(0.05, 0.05, 0.06));
  ALBEDO = col;
}
`;

// ink outline for the 3D units (a second pass, Material.next_pass): the back faces pushed out along the normals, drawn black.
// The push grows with the distance, so the line keeps about the same width on screen (0.005 ≈ 4 px on a 720 px tall view
// at the 45° field of view) whatever the zoom. Separate shells (helmets, shields, eyes) get their own line where they
// cross the body, which is what makes them read as separate things.
// Culling: Godot takes clockwise triangles as front faces and the Blender meshes are counter-clockwise, so the faces Godot
// calls "back" are the models' real front faces; culling those leaves the real back faces, the inverted hull.
const UNIT_OUTLINE = `
shader_type spatial;
render_mode unshaded, cull_back, shadows_disabled;
uniform float width = 0.005;
uniform vec3 ink : source_color = vec3(0.03, 0.025, 0.035);
void vertex() {
  vec4 v = MODELVIEW_MATRIX * vec4(VERTEX, 1.0);
  vec3 n = normalize(mat3(MODELVIEW_MATRIX) * NORMAL);
  v.xyz += n * width * max(-v.z, 0.1);
  POSITION = PROJECTION_MATRIX * v;
}
void fragment() { ALBEDO = ink; }
`;

// ink outline for scenery (cities, trees, resource models; Material.next_pass): pushed out along the smooth normal in UV2
// (main.js toMesh / loadModel), then back away from the camera by more than that, so it hides behind the model and shows
// only around it. That works whichever way the triangles wind, which the code-built geometry does not keep consistent.
// Sways like PAINTED_PROP (wind 0 for the still ones).
const INK = `
shader_type spatial;
render_mode unshaded, cull_disabled, shadows_disabled;
uniform float width = 0.0035;
uniform float wind = 1.0;
uniform vec3 ink : source_color = vec3(0.03, 0.025, 0.035);
void vertex() {
  vec3 o = (MODEL_MATRIX * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float h = max(VERTEX.y, 0.0), sway = (sin(TIME * 1.6 + o.x * 0.7 + o.z * 0.5) * 0.04 + sin(TIME * 2.7 + o.z * 1.3) * 0.015) * wind * h * h * 4.0;
  VERTEX.x += sway; VERTEX.z += sway * 0.6;
  float on = step(UV2.x, 1.5);                                   // UV2 = (2, 2): no outline here
  vec3 n = vec3(UV2.x, 1.0 - abs(UV2.x) - abs(UV2.y), UV2.y);   // octahedron-decoded smooth normal
  if (n.y < 0.0) n.xz = (1.0 - abs(n.zx)) * vec2(n.x >= 0.0 ? 1.0 : -1.0, n.z >= 0.0 ? 1.0 : -1.0);
  vec4 v = MODELVIEW_MATRIX * vec4(VERTEX, 1.0);
  float d = max(-v.z, 0.1);
  v.xyz += normalize(mat3(MODELVIEW_MATRIX) * normalize(n)) * width * d * on;
  v.xyz += normalize(v.xyz) * width * d * 1.6;
  POSITION = PROJECTION_MATRIX * v;
}
void fragment() { ALBEDO = ink; }
`;

// yields lens icons (yields.js; one MultiMesh, instance custom data = (kind, count)): a round badge with an ink rim and a white
// glyph — wheat (food), hammer (production), coin (gold), flask (knowledge), star (heritage) — and a count bubble from 2 up.
// Billboarded and drawn over the scene like the health bars.
const YIELD_ICON = `
shader_type spatial;
render_mode unshaded, skip_vertex_transform, cull_disabled, depth_test_disabled, shadows_disabled;
varying vec2 kc;
void vertex() {
  vec3 o = (MODEL_MATRIX * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  vec3 right = normalize(INV_VIEW_MATRIX[0].xyz), up = normalize(INV_VIEW_MATRIX[1].xyz);
  float grow = clamp(length(o - CAMERA_POSITION_WORLD) / 10.0, 1.0, 1.3); // a little bigger zoomed out, so they stay readable
  VERTEX = (VIEW_MATRIX * vec4(o + (right * VERTEX.x + up * VERTEX.y) * grow, 1.0)).xyz;
  kc = INSTANCE_CUSTOM.xy;
}
mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(vec2(c, s), vec2(-s, c)); }
float box(vec2 p, vec2 b) { vec2 d = abs(p) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
float seg(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }
float ell(vec2 p, vec2 c, vec2 r, float a) { return (length(rot(a) * (p - c) / r) - 1.0) * min(r.x, r.y); }
float star5(vec2 p, float r, float rf) {
  const vec2 k1 = vec2(0.809016994375, -0.587785252292); const vec2 k2 = vec2(-k1.x, k1.y);
  p.x = abs(p.x); p -= 2.0 * max(dot(k1, p), 0.0) * k1; p -= 2.0 * max(dot(k2, p), 0.0) * k2; p.x = abs(p.x); p.y -= r;
  vec2 ba = rf * vec2(-k1.y, k1.x) - vec2(0.0, 1.0); float h = clamp(dot(p, ba) / dot(ba, ba), 0.0, r);
  return length(p - ba * h) * sign(p.y * ba.x - p.x * ba.y);
}
float glyph(vec2 p, int k) {
  if (k == 0) { // a wheat ear
    float d = seg(p, vec2(0.0, -0.6), vec2(0.0, 0.45)) - 0.055;
    for (int i = 0; i < 3; i++) { float y = -0.22 + float(i) * 0.24; d = min(d, ell(p, vec2(-0.14, y), vec2(0.09, 0.17), 0.6)); d = min(d, ell(p, vec2(0.14, y), vec2(0.09, 0.17), -0.6)); }
    return min(d, ell(p, vec2(0.0, 0.55), vec2(0.08, 0.16), 0.0));
  }
  if (k == 1) { vec2 q = rot(0.65) * p; return min(box(q - vec2(0.0, -0.16), vec2(0.075, 0.48)), box(q - vec2(0.0, 0.38), vec2(0.34, 0.13)) - 0.02); } // a hammer
  if (k == 2) return min(abs(length(p) - 0.45) - 0.075, box(p, vec2(0.075, 0.24))); // a coin
  if (k == 3) return min(min(length(p - vec2(0.0, -0.22)) - 0.36, box(p - vec2(0.0, 0.25), vec2(0.11, 0.28))), box(p - vec2(0.0, 0.55), vec2(0.21, 0.05))); // a flask
  return star5(p - vec2(0.0, -0.04), 0.62, 0.45); // a star
}
float digit(vec2 p, int n) { // seven segments
  const int SEG[10] = int[](63, 6, 91, 79, 102, 109, 125, 7, 127, 111);
  int m = SEG[clamp(n, 0, 9)]; float d = 9.0;
  if ((m & 1) != 0) d = min(d, box(p - vec2(0.0, 0.5), vec2(0.22, 0.07)));
  if ((m & 2) != 0) d = min(d, box(p - vec2(0.27, 0.25), vec2(0.07, 0.22)));
  if ((m & 4) != 0) d = min(d, box(p - vec2(0.27, -0.25), vec2(0.07, 0.22)));
  if ((m & 8) != 0) d = min(d, box(p - vec2(0.0, -0.5), vec2(0.22, 0.07)));
  if ((m & 16) != 0) d = min(d, box(p - vec2(-0.27, -0.25), vec2(0.07, 0.22)));
  if ((m & 32) != 0) d = min(d, box(p - vec2(-0.27, 0.25), vec2(0.07, 0.22)));
  if ((m & 64) != 0) d = min(d, box(p, vec2(0.22, 0.07)));
  return d;
}
void fragment() {
  vec2 p = (UV - 0.5) * vec2(2.0, -2.0) * 1.25; // y up; the badge fills most of the quad, the count bubble pokes out
  int k = int(kc.x + 0.5), n = int(kc.y + 0.5);
  vec3 cols[5] = vec3[](vec3(0.3, 0.72, 0.28), vec3(0.88, 0.5, 0.14), vec3(0.95, 0.75, 0.15), vec3(0.2, 0.52, 0.9), vec3(0.62, 0.3, 0.8));
  float aa = fwidth(p.x) * 1.2, r = length(p);
  float badge = 1.0 - smoothstep(0.8 - aa, 0.8, r), ink = 1.0 - smoothstep(0.95 - aa, 0.95, r);
  vec3 col = mix(vec3(0.02), cols[clamp(k, 0, 4)], badge);
  col = mix(col, vec3(1.0), (1.0 - smoothstep(-aa, 0.0, glyph(p / 0.72, k) * 0.72 - 0.05)) * badge); // (thickened to read at icon size)
  float a = ink;
  if (n >= 2) { // the count bubble at the lower right
    vec2 q = p - vec2(0.6, -0.6); float rb = length(q);
    float bub = 1.0 - smoothstep(0.42 - aa, 0.42, rb), bubInk = 1.0 - smoothstep(0.52 - aa, 0.52, rb);
    col = mix(col, vec3(0.02), bubInk); col = mix(col, vec3(0.98), bub);
    col = mix(col, vec3(0.05), (1.0 - smoothstep(-aa, 0.0, digit(q / 0.36, n) * 0.36 - 0.025)) * bub);
    a = max(a, bubInk);
  }
  if (a < 0.5) discard;
  ALBEDO = pow(col, vec3(2.2)); // the colours above are sRGB, like the vertex colours elsewhere
}
`;

module.exports = { PAINTED_TERRAIN, PAINTED_PROP, PAINTED_LEAF, TOON_WATER, RIVER_WATER, STANDEE, UNIT_3D, UNIT_OUTLINE, INK, HEALTH_BAR, YIELD_ICON };
