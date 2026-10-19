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

const WATER = `
shader_type spatial;
render_mode blend_mix, cull_disabled, depth_draw_opaque, specular_schlick_ggx;
uniform sampler2D depth_tex : hint_depth_texture, filter_linear_mipmap;
uniform vec3 shallow_col : source_color = vec3(0.18, 0.68, 0.70);
uniform vec3 deep_col : source_color = vec3(0.02, 0.14, 0.32);
uniform float grid_strength = 0.12;
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
  float t = 1.0 - exp(-depth * 2.4);
  vec3 col = mix(shallow_col, deep_col, t);
  vec2 p = wpos.xz;
  float waves = fbm(p * 1.4 + vec2(TIME * 0.11, TIME * 0.06)) * 0.6 + fbm(p * 3.3 - vec2(TIME * 0.08, -TIME * 0.1)) * 0.4;
  float band = 1.0 - smoothstep(0.0, 0.09, depth);
  float foam = band * (0.5 + 0.5 * sin(depth * 70.0 - TIME * 2.2 + waves * 4.0)) + band * smoothstep(0.5, 0.8, fbm(p * 7.0 + TIME * 0.25));
  foam = clamp(foam, 0.0, 1.0) * step(0.0005, depth);
  float e = hex_edge(p), aa = fwidth(e) * 1.5 + 0.002;
  col = mix(col, col * 0.7, (1.0 - smoothstep(0.01, 0.01 + aa, e)) * grid_strength);
  ALBEDO = mix(col, vec3(0.93, 0.96, 1.0), foam * 0.85);
  ALPHA = clamp(mix(0.5, 0.94, t) + foam * 0.5, 0.0, 1.0);
  ROUGHNESS = mix(0.03, 0.45, foam);
  SPECULAR = 0.55;
  NORMAL = bump(NORMAL, VERTEX, waves, 0.05);
}
`;

module.exports = { TERRAIN, WATER };
