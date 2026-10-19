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

const TERRAIN = `
shader_type spatial;
render_mode cull_disabled;
uniform float grid_strength = 0.4;
uniform float bump_strength = 0.9;
varying vec3 wpos;
varying vec2 mats; // x: rockiness, y: sand
${NOISE}
void vertex() { wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz; mats = UV; }
void fragment() {
  vec3 base = pow(COLOR.rgb, vec3(2.2));
  float macro = fbm(wpos.xz * 0.3), mid = fbm(wpos.xz * 2.4), fine = fbm(wpos.xz * 10.0);
  vec3 wn = normalize((INV_VIEW_MATRIX * vec4(NORMAL, 0.0)).xyz);
  float slope = 1.0 - wn.y;
  vec3 col = base * (0.8 + 0.4 * mid) * (0.9 + 0.2 * fine);
  col *= mix(vec3(0.9, 0.97, 1.02), vec3(1.1, 1.03, 0.86), macro);           // warm and cool patches
  float rip = sin(wpos.x * 9.0 + wpos.z * 4.0 + mid * 9.0) * 0.5 + 0.5;       // dune ripples on sand
  col *= 1.0 + mats.y * (rip - 0.5) * 0.16 * step(0.05, wpos.y);
  float rock_m = smoothstep(0.3, 0.55, slope + (mid - 0.5) * 0.3);
  rock_m = max(rock_m, mats.x * smoothstep(0.3, 0.62, mid + (fine - 0.5) * 0.4));
  vec3 rock = vec3(0.29, 0.27, 0.25) * (0.6 + 0.8 * fine) * (0.8 + 0.4 * mid);
  col = mix(col, rock, clamp(rock_m, 0.0, 1.0) * step(-0.05, wpos.y));
  float snow = smoothstep(1.2, 1.45, wpos.y + (mid - 0.5) * 0.4) * (1.0 - smoothstep(0.5, 0.8, slope));
  col = mix(col, vec3(0.88, 0.91, 0.96), snow);
  float beach = smoothstep(-0.14, -0.03, wpos.y) * (1.0 - smoothstep(0.04, 0.12, wpos.y + (fine - 0.5) * 0.06));
  col = mix(col, vec3(0.76, 0.66, 0.46) * (0.85 + 0.3 * fine), beach * (1.0 - mats.x) * 0.9);
  col *= mix(1.0, 0.62, smoothstep(0.0, -0.35, wpos.y));                       // wet, darker ground under water
  float e = hex_edge(wpos.xz), aa = fwidth(e) * 1.5 + 0.002;
  float line = 1.0 - smoothstep(0.01, 0.01 + aa, e);
  col = mix(col, col * 0.5, line * grid_strength * step(0.0, wpos.y));
  ALBEDO = col;
  ROUGHNESS = mix(0.93, 0.5, snow);
  NORMAL = bump(NORMAL, VERTEX, (mid * 0.5 + fine * 0.5) * (0.35 + rock_m), bump_strength * 0.12);
}
`;

// KayKit models share one colour atlas; per instance (MultiMesh custom data) we recolour the grass to the terrain (mode 0),
// tint foliage (mode 1) or paint the blue team parts of buildings in the owner's colour (mode 2), keeping the atlas shading.
const KAYKIT = `
shader_type spatial;
uniform sampler2D atlas : source_color, filter_linear_mipmap;
uniform int mode = 0;
varying vec4 tint;
void vertex() { tint = INSTANCE_CUSTOM; }
void fragment() {
  vec3 c = texture(atlas, UV).rgb;
  if (mode == 0) {
    float grass = smoothstep(0.12, 0.2, min(c.r, c.g) - c.b) * (1.0 - smoothstep(0.06, 0.14, abs(c.r - c.g)));
    c = mix(c, tint.rgb * (c.g / 0.56), grass * tint.a);
  } else if (mode == 1) {
    float leaf = smoothstep(0.06, 0.1, c.g - max(c.r, c.b));
    c = mix(c, tint.rgb * (c.g / 0.18), leaf * tint.a);
  } else {
    float blue = smoothstep(0.08, 0.16, c.b - max(c.r, c.g));
    c = mix(c, tint.rgb * (c.b / 0.5), blue * tint.a);
  }
  ALBEDO = c;
  ROUGHNESS = 0.82;
}
`;

// character capes in the owner's colour (per-node instance uniform), keeping the cloth shading from the texture
const CAPE = `
shader_type spatial;
uniform sampler2D tex : source_color, filter_linear_mipmap;
instance uniform vec4 team : source_color = vec4(1.0);
void fragment() {
  vec3 c = texture(tex, UV).rgb;
  float lum = dot(c, vec3(0.3, 0.59, 0.11));
  ALBEDO = team.rgb * clamp(0.35 + lum * 2.2, 0.0, 1.4);
  ROUGHNESS = 0.8;
}
`;

// soft cel lighting shared by the painted look: a soft terminator with a hint of banding, luminous shadows and a warm rim
const TOON_LIGHT = `
void light() {
  float d = smoothstep(-0.1, 0.45, dot(NORMAL, LIGHT));
  d = mix(d, floor(d * 3.0 + 0.5) / 3.0, 0.15);
  float lit = d * mix(0.5, 1.0, ATTENUATION);
  float rim = pow(1.0 - clamp(dot(NORMAL, VIEW), 0.0, 1.0), 4.0) * 0.3 * d;
  DIFFUSE_LIGHT += (lit + rim) * LIGHT_COLOR / PI;
}
`;

// Hand-painted cartoon terrain: palette colours from the tiles, brush strokes along slowly turning directions, warm and cool
// patches, painted rock with strata on slopes, snow caps, bright beaches, flowers in meadows and a soft hex grid.
const PAINTED_TERRAIN = `
shader_type spatial;
render_mode cull_disabled;
uniform float grid_strength = 0.22;
varying vec3 wpos;
varying vec2 mats;   // x: rockiness, y: sand
varying float meadow;
${NOISE}
vec3 srgb(vec3 c) { return pow(c, vec3(2.2)); }
void vertex() { wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz; mats = UV; meadow = COLOR.a; }
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
  float rock_m = max(smoothstep(0.28, 0.46, slope + (stroke - 0.5) * 0.15), mats.x * smoothstep(0.35, 0.6, stroke + fine * 0.3));
  vec3 rock = srgb(vec3(0.56, 0.58, 0.65)) * (0.8 + 0.35 * stroke) * mix(0.84, 1.06, smoothstep(0.4, 0.6, sin(wpos.y * 14.0 + stroke * 3.0) * 0.5 + 0.5));
  col = mix(col, rock, clamp(rock_m, 0.0, 1.0) * step(-0.05, wpos.y));
  float snow = smoothstep(1.2, 1.4, wpos.y + (stroke - 0.5) * 0.3) * (1.0 - smoothstep(0.55, 0.85, slope));
  col = mix(col, srgb(vec3(0.95, 0.97, 1.0)), snow);
  float edge = wpos.y + (fbm(wpos.xz * 1.4 + 11.0) - 0.5) * 0.1;                         // wavy, irregular grass-to-sand edge
  float beach = smoothstep(-0.15, -0.04, wpos.y) * (1.0 - smoothstep(0.07, 0.1, edge));
  vec3 sand = srgb(vec3(0.97, 0.89, 0.68)) * (0.94 + 0.1 * fine);
  sand = mix(sand, srgb(vec3(0.84, 0.72, 0.5)), (1.0 - smoothstep(0.0, 0.035, wpos.y)) * 0.7);   // wet sand at the waterline
  col = mix(col, sand, beach * (1.0 - mats.x));
  col = mix(col, srgb(vec3(0.9, 0.84, 0.62)), smoothstep(-0.01, -0.25, wpos.y) * 0.55);  // sandy sea floor, seen through clear water
  vec2 cell = floor(wpos.xz * 7.0), f = fract(wpos.xz * 7.0) - 0.5;                       // flowers in meadows
  float hh = h2(cell); vec2 off = vec2(h2(cell + 3.1), h2(cell + 7.7)) - 0.5;
  float flower = (1.0 - smoothstep(0.07, 0.11, length(f - off * 0.6))) * step(0.88, hh) * meadow * step(0.06, wpos.y) * (1.0 - rock_m);
  vec3 fc = hh > 0.96 ? vec3(1.0, 0.96, 0.95) : (hh > 0.92 ? vec3(1.0, 0.84, 0.25) : vec3(0.96, 0.46, 0.62));
  col = mix(col, srgb(fc), flower);
  float e = hex_edge(wpos.xz), aa = fwidth(e) * 1.5 + 0.002;
  col = mix(col, col * 0.72, (1.0 - smoothstep(0.012, 0.012 + aa, e)) * grid_strength * step(0.0, wpos.y));
  ALBEDO = col;
  ROUGHNESS = 0.95;
  SPECULAR = 0.15;
}
${TOON_LIGHT}
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
  ROUGHNESS = 0.9;
  SPECULAR = 0.2;
}
${TOON_LIGHT}
`;

// cartoon water: turquoise shallows to deep blue, a crisp white shoreline with animated foam rings, gentle wave tones, sparkles
const TOON_WATER = `
shader_type spatial;
render_mode blend_mix, cull_disabled, depth_draw_opaque, unshaded;
uniform sampler2D depth_tex : hint_depth_texture, filter_linear_mipmap;
varying vec3 wpos;
${NOISE}
vec3 srgb(vec3 c) { return pow(c, vec3(2.2)); }
void vertex() { wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz; VERTEX.y += (sin(wpos.x * 1.1 + TIME * 0.9) + sin(wpos.z * 1.7 - TIME * 1.2)) * 0.005; }
void fragment() {
  float d = texture(depth_tex, SCREEN_UV).r;
  vec4 g = INV_PROJECTION_MATRIX * vec4(SCREEN_UV * 2.0 - 1.0, d, 1.0); g.xyz /= g.w;
  float depth = max(0.0, VERTEX.z - g.z) * 0.8, t = 1.0 - exp(-depth * 3.5);
  vec3 sh = srgb(vec3(0.56, 0.93, 0.88)), md = srgb(vec3(0.2, 0.76, 0.82)), dp = srgb(vec3(0.08, 0.46, 0.72));
  vec3 col = t < 0.5 ? mix(sh, md, t * 2.0) : mix(md, dp, t * 2.0 - 1.0);
  vec2 p = wpos.xz;
  float w = fbm(p * 0.9 + vec2(TIME * 0.05, TIME * 0.03)), wob = (fbm(p * 2.2 + TIME * 0.1) - 0.5) * 0.012;
  col *= 0.95 + 0.1 * w;
  float aa = fwidth(depth) * 1.2 + 0.0015;
  float shore = 1.0 - smoothstep(0.006, 0.006 + aa, depth + wob);                               // thin white line where water meets land
  float l1 = depth - (0.035 + 0.01 * sin(TIME * 0.8)) + wob, l2 = depth - (0.075 + 0.015 * sin(TIME * 0.6 + 1.7)) + wob;
  float lines = (1.0 - smoothstep(0.0, 0.004 + aa, abs(l1))) * 0.9 + (1.0 - smoothstep(0.0, 0.004 + aa, abs(l2))) * 0.55;  // wavy contour lines offshore
  float caust = pow(1.0 - abs(sin(fbm(p * 3.0 + TIME * 0.12) * 12.0)), 6.0) * (1.0 - smoothstep(0.05, 0.25, depth)) * 0.25; // soft caustics in the shallows
  float sparkle = step(0.988, vn(p * 6.0 + TIME * vec2(0.3, 0.2))) * smoothstep(0.15, 0.45, t);
  float foam = clamp(shore + lines + sparkle * 0.7, 0.0, 1.0);
  ALBEDO = mix(col + caust, vec3(1.0), foam);
  ALPHA = clamp(mix(0.35, 0.92, t) + shore + lines * 0.6, 0.0, 1.0);
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
  ROUGHNESS = 0.9;
  SPECULAR = 0.15;
}
${TOON_LIGHT}
`;

const WATER = `
shader_type spatial;
render_mode blend_mix, cull_disabled, depth_draw_opaque, specular_schlick_ggx;
uniform sampler2D depth_tex : hint_depth_texture, filter_linear_mipmap;
uniform vec3 shallow_col : source_color = vec3(0.18, 0.68, 0.70);
uniform vec3 deep_col : source_color = vec3(0.02, 0.14, 0.32);
uniform float grid_strength = 0.12;
uniform float depth_k = 2.4;   // how fast water darkens with depth
uniform float foam_band = 0.09; // shoreline foam width
uniform vec2 alpha_range = vec2(0.5, 0.94); // opacity in the shallows and in deep water
varying vec3 wpos;
${NOISE}
void vertex() {
  wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
  VERTEX.y += (sin(wpos.x * 1.1 + TIME * 0.9) + sin(wpos.z * 1.7 - TIME * 1.2)) * 0.006;
}
void fragment() {
  float d = texture(depth_tex, SCREEN_UV).r;
  vec4 g = INV_PROJECTION_MATRIX * vec4(SCREEN_UV * 2.0 - 1.0, d, 1.0); g.xyz /= g.w;
  float depth = max(0.0, VERTEX.z - g.z) * 0.8;                                 // water thickness in front of the ground
  float t = 1.0 - exp(-depth * depth_k);
  vec3 col = mix(shallow_col, deep_col, t);
  vec2 p = wpos.xz;
  float waves = fbm(p * 1.4 + vec2(TIME * 0.11, TIME * 0.06)) * 0.6 + fbm(p * 3.3 - vec2(TIME * 0.08, -TIME * 0.1)) * 0.4;
  float band = 1.0 - smoothstep(0.0, foam_band, depth);
  float foam = band * (0.5 + 0.5 * sin(depth * 70.0 - TIME * 2.2 + waves * 4.0)) + band * smoothstep(0.5, 0.8, fbm(p * 7.0 + TIME * 0.25));
  foam = clamp(foam, 0.0, 1.0) * step(0.0005, depth);
  float e = hex_edge(p), aa = fwidth(e) * 1.5 + 0.002;
  col = mix(col, col * 0.7, (1.0 - smoothstep(0.01, 0.01 + aa, e)) * grid_strength);
  ALBEDO = mix(col, vec3(0.93, 0.96, 1.0), foam * 0.85);
  ALPHA = clamp(mix(alpha_range.x, alpha_range.y, t) + foam * 0.5, 0.0, 1.0);
  ROUGHNESS = mix(0.03, 0.45, foam);
  SPECULAR = 0.55;
  NORMAL = bump(NORMAL, VERTEX, waves, 0.05);
}
`;

module.exports = { TERRAIN, WATER, KAYKIT, CAPE, PAINTED_TERRAIN, PAINTED_PROP, PAINTED_LEAF, TOON_WATER };
