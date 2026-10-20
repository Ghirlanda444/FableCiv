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
  if (detailed > 0.0) {
    vec2 p = wpos.xz * tex_scale; float k = smoothstep(0.3, 0.7, fbm(wpos.xz * 0.12 + 5.0));
    float brk = (fbm(wpos.xz * 1.7 + 21.0) - 0.5) * 0.5;                                    // ragged borders between grounds
    vec3 tg = ground(grass_d, p, k), ts = ground(sand_d, p * 1.3, k), tw = ground(snow_d, p, k);
    float lum = dot(tg, vec3(0.3, 0.59, 0.11));
    vec3 td = mix(mix(tg, vec3(lum) * vec3(1.3, 1.18, 0.75), 0.4), ground(dry_d, p, k), has_tex.y); // plains and tundra: dry grass (or the grass, sun-dried)
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
    vec3 wn2 = normalize(wn + bn * 0.6 * detailed);
    NORMAL = normalize((VIEW_MATRIX * vec4(wn2, 0.0)).xyz);
    col = mix(col, dc, detailed);
  }
  // hex grid: a dark line about two pixels wide at any zoom (never thinner than 0.012 world units up close)
  float e = hex_edge(wpos.xz), px = length(fwidth(wpos.xz)) * 0.71, lw = max(px * 1.1, 0.012);
  col = mix(col, col * 0.42, (1.0 - smoothstep(lw, lw + px * 1.2, e)) * grid_strength * step(0.0, wpos.y));
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
  float e = hex_edge(p), pg = length(fwidth(p)) * 0.71, lw = max(pg * 1.1, 0.012), inside = step(map_rect.x, p.x) * step(map_rect.y, p.y) * step(p.x, map_rect.z) * step(p.y, map_rect.w);
  col = mix(col, srgb(vec3(0.85, 0.95, 1.0)), (1.0 - smoothstep(lw, lw + pg * 1.2, e)) * grid_strength * 0.25 * inside * (1.0 - 0.5 * smoothstep(0.02, 0.06, pg))); // light grid lines on sea tiles, fainter zoomed out
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
uniform float badge = 0.0; // 1: draw the picture as an icon on a round dark badge with a cream rim (resource icons)
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
    float rim = smoothstep(0.405, 0.42, d);
    vec3 col = mix(mix(bg, vec3(0.92, 0.82, 0.56), rim), ic.rgb, ic.a * (1.0 - rim));
    ALPHA = 1.0 - smoothstep(0.47, 0.48, d);
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

module.exports = { PAINTED_TERRAIN, PAINTED_PROP, PAINTED_LEAF, TOON_WATER, RIVER_WATER, STANDEE };
