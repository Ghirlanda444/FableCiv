"use strict";
// Tiny Empires: Godot vertical slice. Runs the web game's rules engine (engine/au_bundle.js, built by tools/godot/bundle.js)
// and draws it in 3D: a sculpted, shader-textured landscape with animated water, forests, borders, settlements and units.
// Every empire is AI-run; End Turn (or Auto) advances the game.
// User args (after "--"): --smoke plays 40 turns headless and quits; --shot saves screenshots to user://shot*.png and quits.

const godot = require('godot');
const { Node3D, MeshInstance3D, MultiMeshInstance3D, MultiMesh, ArrayMesh, SurfaceTool, StandardMaterial3D, ShaderMaterial, Shader, Color, Vector2, Vector3,
  Transform3D, Camera3D, CameraAttributesPractical, DirectionalLight3D, WorldEnvironment, Environment, Sky, ProceduralSkyMaterial, PlaneMesh,
  CanvasLayer, PanelContainer, VBoxContainer, HBoxContainer, Button, RichTextLabel, Label, Label3D,
  Callable, OS, Input, Time, ProjectSettings } = godot;
const AU = require('res://engine/au_bundle.js'); // absolute ids: GodotJS 1.1 beta turns relative ids from res:// into res:/
const geo = require('res://geo.js');
const terrain = require('res://terrain.js');
const props = require('res://props.js');
const shaders = require('res://shaders.js');
const kaykit = require('res://kaykit.js');
const { Art } = require('res://art.js');
const G = AU.G;

const PRIMITIVE_TRIANGLES = 3, CULL_DISABLED = 2, TRANSPARENCY_ALPHA = 1, SHADING_UNSHADED = 0, BILLBOARD_ENABLED = 1;
const BG_SKY = 2, AMBIENT_SKY = 3, TONEMAP_FILMIC = 2, SHADOWS_OFF = 0, DEVICE_EMULATION = -1, TRANSFORM_3D = 1;
const MOUSE_LEFT = 1, MOUSE_RIGHT = 2, MOUSE_MIDDLE = 3, WHEEL_UP = 4, WHEEL_DOWN = 5, KEY_SPACE = 32;
const PAN_KEYS = [[87, 0, -1], [83, 0, 1], [65, -1, 0], [68, 1, 0], [4194320, 0, -1], [4194322, 0, 1], [4194319, -1, 0], [4194321, 1, 0]];
const PITCH = 55 * Math.PI / 180;

function userArgs() {
  const a = OS.get_cmdline_user_args(), out = [];
  if (!a) return out;
  if (Array.isArray(a)) return a.slice();
  const n = typeof a.size === 'function' ? a.size() : (a.length || 0);
  for (let i = 0; i < n; i++) out.push(typeof a.get_indexed === 'function' ? a.get_indexed(i) : (typeof a.get === 'function' ? a.get(i) : a[i]));
  return out;
}

function material(opts) {
  const m = new StandardMaterial3D();
  m.vertex_color_use_as_albedo = true;
  m.vertex_color_is_srgb = true;
  m.cull_mode = CULL_DISABLED;
  m.roughness = opts.roughness === undefined ? 0.92 : opts.roughness;
  if (opts.alpha) m.transparency = TRANSPARENCY_ALPHA;
  if (opts.unshaded) m.shading_mode = SHADING_UNSHADED;
  return m;
}

// geo batch → ArrayMesh, setting normal and colour only when they change (most runs of vertices share both)
function toMesh(b) {
  const st = new SurfaceTool();
  st.begin(PRIMITIVE_TRIANGLES);
  const n = b.p.length / 3;
  let ln = '', lc = '';
  for (let i = 0; i < n; i++) {
    const nk = b.n[i * 3] + ',' + b.n[i * 3 + 1] + ',' + b.n[i * 3 + 2];
    if (nk !== ln) { st.set_normal(new Vector3(b.n[i * 3], b.n[i * 3 + 1], b.n[i * 3 + 2])); ln = nk; }
    const ck = b.c[i * 4] + ',' + b.c[i * 4 + 1] + ',' + b.c[i * 4 + 2] + ',' + b.c[i * 4 + 3];
    if (ck !== lc) { st.set_color(new Color(b.c[i * 4], b.c[i * 4 + 1], b.c[i * 4 + 2], b.c[i * 4 + 3])); lc = ck; }
    st.add_vertex(new Vector3(b.p[i * 3], b.p[i * 3 + 1], b.p[i * 3 + 2]));
  }
  return n ? st.commit() : null;
}

// indexed terrain mesh: bulk upload through packed arrays when this Godot build allows it, else SurfaceTool (slower, always works)
function arrayMesh(M) {
  try {
    const PF = godot.PackedFloat32Array, PI = godot.PackedInt32Array, GA = godot.GArray;
    const bytes = a => new PF(Array.from(a)).to_byte_array();
    const v = bytes(M.pos).to_vector3_array(), n = bytes(M.nrm).to_vector3_array(), c = bytes(M.col).to_color_array(), uv = bytes(M.uv).to_vector2_array();
    if (v.size() !== M.vertices) throw new Error('vertex count ' + v.size());
    const arrs = GA ? new GA() : [];
    if (GA) { arrs.resize(13); arrs.set_indexed(0, v); arrs.set_indexed(1, n); arrs.set_indexed(3, c); arrs.set_indexed(4, uv); arrs.set_indexed(12, new PI(Array.from(M.idx))); }
    else { for (let i = 0; i < 13; i++) arrs.push(null); arrs[0] = v; arrs[1] = n; arrs[3] = c; arrs[4] = uv; arrs[12] = new PI(Array.from(M.idx)); }
    const mesh = new ArrayMesh(); mesh.add_surface_from_arrays(PRIMITIVE_TRIANGLES, arrs);
    if (mesh.get_surface_count() !== 1) throw new Error('no surface');
    return { mesh, path: 'packed arrays' };
  } catch (e) {
    console.log('[tiny-empires] packed-array upload unavailable (' + (e && e.message) + '), using SurfaceTool');
  }
  const st = new SurfaceTool(); st.begin(PRIMITIVE_TRIANGLES);
  for (let i = 0; i < M.vertices; i++) {
    st.set_normal(new Vector3(M.nrm[i * 3], M.nrm[i * 3 + 1], M.nrm[i * 3 + 2]));
    st.set_color(new Color(M.col[i * 4], M.col[i * 4 + 1], M.col[i * 4 + 2], 1));
    st.set_uv(new Vector2(M.uv[i * 2], M.uv[i * 2 + 1]));
    st.add_vertex(new Vector3(M.pos[i * 3], M.pos[i * 3 + 1], M.pos[i * 3 + 2]));
  }
  for (let i = 0; i < M.idx.length; i++) st.add_index(M.idx[i]);
  return { mesh: st.commit(), path: 'SurfaceTool' };
}

function shaderMaterial(code) { const sh = new Shader(); sh.code = code; const m = new ShaderMaterial(); m.shader = sh; return m; }

// instanced props: one MultiMesh per model, each instance [x, y, z, yaw, scale, r, g, b]
function scatterNode(mesh, list, mat) {
  const mm = new MultiMesh(); mm.transform_format = TRANSFORM_3D; mm.use_colors = true; mm.mesh = mesh; mm.instance_count = list.length;
  list.forEach((e, i) => {
    const c = Math.cos(e[3]) * e[4], s = Math.sin(e[3]) * e[4];
    mm.set_instance_transform(i, new Transform3D(new Vector3(c, 0, -s), new Vector3(0, e[4], 0), new Vector3(s, 0, c), new Vector3(e[0], e[1] - 0.02, e[2])));
    mm.set_instance_color(i, new Color(e[5], e[6], e[7], 1));
  });
  const node = new MultiMeshInstance3D(); node.multimesh = mm; node.material_override = mat;
  return node;
}

function pickLeaderSeats(rng) {
  const all = [];
  AU.CIVS.forEach(c => (c.leaders || []).forEach(l => all.push([c.id, l.id])));
  return all[Math.floor(rng() * all.length)];
}

class Main extends Node3D {
  _ready() {
    console.log('[tiny-empires] script started, engine ' + (AU && AU.G ? 'loaded' : 'MISSING'));
    try { this.setup(); } catch (e) {
      console.error('[tiny-empires] SETUP FAILED ' + (e && e.stack || e));
      if (this.smoke || this.shot) this.get_tree().quit(1);
    }
  }

  setup() {
    this.args = userArgs();
    console.log('[tiny-empires] args ' + JSON.stringify(this.args));
    this.smoke = this.args.indexOf('--smoke') >= 0;
    this.shot = this.args.indexOf('--shot') >= 0;
    this.auto = false; this.acc = 0; this.frames = 0;
    this.camTarget = [0, 0]; this.camDist = 16; this.touches = {}; this.dragged = 0; this.selected = -1;
    this.labels = {};
    this.hiFx = OS.get_name() !== 'Android'; // ambient occlusion: on for desktop, off for phones (toggle in the HUD)
    // looks: 'painted' (default: hand-painted cartoon terrain and nature drawn in code) or 'tiles' (KayKit hex tiles, --look=tiles).
    // Buildings and units are KayKit chibi models in both when they load (--no-models forces the code-built placeholders).
    this.look = this.args.indexOf('--look=tiles') >= 0 ? 'tiles' : 'painted';
    this.density = OS.get_name() === 'Android' ? 0.5 : 1; // phones get half the trees and grass
    this.matTerrain = shaderMaterial(shaders.PAINTED_TERRAIN);
    this.matWater = shaderMaterial(this.look === 'tiles' ? shaders.WATER : shaders.TOON_WATER);
    this.matPieces = material({ roughness: 0.7 });
    this.matProps = shaderMaterial(shaders.PAINTED_PROP);
    this.matBorders = material({ alpha: true, unshaded: true });
    this.matRivers = material({ alpha: true, roughness: 0.08 });
    this.propMeshes = { pine: toMesh(props.pineTree()), round: toMesh(props.roundTree()), palm: toMesh(props.palmTree()), bush: toMesh(props.bush()), tuft: toMesh(props.tuft()), rock: toMesh(props.rock()), reed: toMesh(props.reed()) };
    this.buildWorld();
    this.art = new Art(this);
    this.useArt = this.args.indexOf('--no-models') < 0 && this.art.load(); // KayKit models when they load, else the code-built placeholders
    if (!this.useArt) this.look = 'painted';
    console.log('[tiny-empires] art: ' + (this.useArt ? 'KayKit models' : 'placeholders') + ', look: ' + this.look);
    this.buildHud();
    this.newGame(this.smoke || this.shot ? 7 : (Time.get_ticks_usec() % 100000) + 1);
    if (this.smoke) this.runSmoke();
    if (this.shot) { for (let k = 0; k < 70 && !this.g.victory; k++) G.endTurn(this.g); this.refresh(); this.focusPlayer(); this.camDist = 13; this.updateCamera(); }
  }

  buildWorld() {
    const env = new Environment(), sky = new Sky(), sm = new ProceduralSkyMaterial();
    sm.sky_top_color = new Color(0.36, 0.6, 0.9, 1); sm.sky_horizon_color = new Color(0.8, 0.88, 0.95, 1);
    sm.ground_horizon_color = new Color(0.1, 0.28, 0.5, 1); sm.ground_bottom_color = new Color(0.04, 0.16, 0.34, 1); // open sea past the map edge
    sky.sky_material = sm;
    env.background_mode = BG_SKY; env.sky = sky;
    env.ambient_light_source = AMBIENT_SKY; env.ambient_light_energy = 0.55;
    env.tonemap_mode = TONEMAP_FILMIC; env.tonemap_exposure = 1.05; // filmic keeps the painted palette saturated
    env.adjustment_enabled = true; env.adjustment_saturation = 1.12; env.adjustment_contrast = 1.04;
    env.ssao_enabled = this.hiFx; env.ssao_radius = 0.8; env.ssao_intensity = 1.6; // Forward+ only
    env.glow_enabled = true; env.glow_intensity = 0.35; env.glow_bloom = 0.04;
    env.fog_enabled = true; env.fog_light_color = new Color(0.72, 0.8, 0.9, 1); env.fog_density = 0.004; env.fog_aerial_perspective = 0.35; env.fog_sky_affect = 0.2;
    this.env = env;
    const we = new WorldEnvironment(); we.environment = env; this.add_child(we);

    const sun = new DirectionalLight3D(); // a warm, fairly low sun for long, readable shadows
    sun.rotation_degrees = new Vector3(-46, -40, 0);
    sun.light_energy = 1.35; sun.light_color = new Color(1, 0.95, 0.84, 1);
    sun.shadow_enabled = true; sun.shadow_blur = 1.5; sun.directional_shadow_max_distance = 60;
    this.sun = sun; this.add_child(sun);

    this.cam = new Camera3D(); this.cam.fov = 45; this.cam.far = 500; this.add_child(this.cam); this.cam.make_current();
    this.camAttr = new CameraAttributesPractical(); this.cam.attributes = this.camAttr;
    this.terrain = new MeshInstance3D(); this.terrain.material_override = this.matTerrain; this.add_child(this.terrain);
    this.rivers = new MeshInstance3D(); this.rivers.material_override = this.matRivers; this.rivers.cast_shadow = SHADOWS_OFF; this.add_child(this.rivers);
    this.propRoot = new Node3D(); this.add_child(this.propRoot);
    this.borders = new MeshInstance3D(); this.borders.material_override = this.matBorders; this.borders.cast_shadow = SHADOWS_OFF; this.add_child(this.borders);
    this.pieces = new MeshInstance3D(); this.pieces.material_override = this.matPieces; this.add_child(this.pieces);
    this.labelRoot = new Node3D(); this.add_child(this.labelRoot);
    const water = new MeshInstance3D(), plane = new PlaneMesh(); // one animated water surface at sea level, map and open sea alike
    plane.size = new Vector2(420, 420); plane.subdivide_width = 160; plane.subdivide_depth = 160;
    water.mesh = plane; water.material_override = this.matWater; water.cast_shadow = SHADOWS_OFF;
    this.water = water; this.add_child(water);
    const bed = new MeshInstance3D(), bedPlane = new PlaneMesh(), bedMat = new StandardMaterial3D(); // sea floor beyond the map
    bedPlane.size = new Vector2(420, 420); bedMat.albedo_color = new Color(0.12, 0.3, 0.42, 1); bedMat.roughness = 1;
    bed.mesh = bedPlane; bed.material_override = bedMat; bed.cast_shadow = SHADOWS_OFF;
    this.seabed = bed; this.add_child(bed);
  }

  buildHud() {
    const layer = new CanvasLayer(); this.add_child(layer);
    const panel = new PanelContainer(); panel.position = new Vector2(12, 12); layer.add_child(panel);
    const box = new VBoxContainer(); panel.add_child(box);
    const title = new Label(); title.text = 'Tiny Empires: Godot test build'; title.add_theme_font_size_override('font_size', 20); box.add_child(title);
    this.turnLabel = new Label(); this.turnLabel.add_theme_font_size_override('font_size', 18); box.add_child(this.turnLabel);
    const row = new HBoxContainer(); box.add_child(row);
    const mk = (text, fn) => { const b = new Button(); b.text = text; b.custom_minimum_size = new Vector2(120, 44); b.add_theme_font_size_override('font_size', 18); b.pressed.connect(Callable.create(this, fn), 0); row.add_child(b); return b; };
    this.endBtn = mk('End Turn', this.onEndTurn);
    this.autoBtn = mk('Auto', this.onAuto);
    mk('New Map', this.onNewMap);
    this.fxBtn = mk(this.hiFx ? 'FX: High' : 'FX: Low', this.onFx);
    this.scores = new RichTextLabel(); this.scores.bbcode_enabled = true; this.scores.fit_content = true; this.scores.scroll_active = false;
    this.scores.custom_minimum_size = new Vector2(380, 0); this.scores.add_theme_font_size_override('normal_font_size', 16); box.add_child(this.scores);
    this.info = new Label(); this.info.add_theme_font_size_override('font_size', 15); this.info.custom_minimum_size = new Vector2(380, 0);
    this.info.autowrap_mode = 3; box.add_child(this.info);
  }

  newGame(seed) {
    let s = seed >>> 0; const rng = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
    const seat = pickLeaderSeats(rng);
    this.g = G.newGame({ playerCiv: seat[0], playerLeader: seat[1], mapSize: 'small', mapType: 'continents', numCivs: 5, numStates: 3, seed: seed, difficulty: 'prince', v2: true });
    const pl = G.player(this.g); pl.isPlayer = false; pl.ai = Object.assign({}, AU.LEADER_BY_ID[pl.leaderId].ai); // spectator: every empire is AI-run
    this.seed = seed; this.selected = -1;
    this.buildLand();
    Object.keys(this.labels).forEach(id => this.labels[id].queue_free()); this.labels = {};
    const capOf = c => (c && c.capital !== undefined && c.capital !== null && this.g.settlements[c.capital]) ? c.capital : undefined;
    const cap = capOf(G.player(this.g)) !== undefined ? capOf(G.player(this.g)) : this.g.civs.filter(c => !c.minor).map(capOf).find(id => id !== undefined);
    const u = Object.keys(this.g.units).map(id => this.g.units[id]).find(x => x.civ === this.g.playerIdx);
    const focus = this.g.tiles[cap !== undefined ? this.g.settlements[cap].tile : (u ? u.tile : Math.floor(this.g.tiles.length / 2))];
    this.camTarget = geo.center(focus.col, focus.row); this.camDist = 16;
    const mid = new Vector3(geo.SQRT3 * this.g.W / 2, 0, 0.75 * this.g.H);
    this.water.position = new Vector3(mid.x, this.waterY, mid.z); this.seabed.position = new Vector3(mid.x, -1.3, mid.z);
    this.updateCamera();
    this.refresh();
  }

  // the static landscape for a new map: the painted terrain with rivers and nature, or (tile look) KayKit hex tiles
  buildLand() {
    const t0 = Time.get_ticks_msec();
    if (this.look === 'tiles') {
      this.field = kaykit.flatField(AU, this.g);
      this.terrain.mesh = null; this.rivers.mesh = null; this.clearProps();
      this.art.clear();
      const n = this.art.buildStatic(AU, this.g);
      this.waterY = kaykit.WATER_Y;
      const W = this.matWater; // brighter, clearer water to match the KayKit palette
      W.set_shader_parameter('depth_k', 5.0); W.set_shader_parameter('foam_band', 0.03); W.set_shader_parameter('alpha_range', new Vector2(0.3, 0.78));
      W.set_shader_parameter('shallow_col', new Color(0.32, 0.8, 0.86, 1)); W.set_shader_parameter('deep_col', new Color(0.1, 0.42, 0.74, 1));
      console.log('[tiny-empires] map ' + this.g.W + 'x' + this.g.H + ' seed ' + this.seed + ': ' + n + ' KayKit tiles and props in ' + (Time.get_ticks_msec() - t0) + ' ms');
      return;
    }
    if (this.useArt) this.art.clear();
    this.field = terrain.makeField(AU, this.g);
    const M = terrain.buildTerrainMesh(this.field), t1 = Time.get_ticks_msec();
    const up = arrayMesh(M); this.terrain.mesh = up.mesh;
    const t2 = Time.get_ticks_msec();
    this.rivers.mesh = toMesh(terrain.buildRivers(this.field, this.g));
    const S = this.buildNature();
    this.waterY = 0;
    console.log('[tiny-empires] map ' + this.g.W + 'x' + this.g.H + ' seed ' + this.seed + ': terrain ' + M.vertices + ' verts / ' + M.triangles + ' tris, built in ' + (t1 - t0) +
      ' ms, uploaded via ' + up.path + ' in ' + (t2 - t1) + ' ms; nature ' + Object.keys(S).map(k => k + ' ' + S[k].length).join(', ') + '; total ' + (Time.get_ticks_msec() - t0) + ' ms');
  }

  clearProps() { (this.propNodes || []).forEach(n => n.queue_free()); this.propNodes = []; } // our own list: get_children() returns a Godot array, not a JS one

  // trees, bushes, grass, rocks and reeds; rebuilt when a new settlement needs its site cleared
  buildNature() {
    this.clearProps();
    const S = terrain.buildScatter(this.field, this.g, this.density);
    this.propNodes = Object.keys(S).filter(k => S[k].length && this.propMeshes[k]).map(k => { const n = scatterNode(this.propMeshes[k], S[k], this.matProps); this.propRoot.add_child(n); return n; });
    this.natureKey = terrain.scatterKey(this.g);
    return S;
  }

  focusPlayer() { // centre on the followed empire's capital (it moves when a capital falls)
    const p = G.player(this.g), s = p && this.g.settlements[p.capital], t = s && this.g.tiles[s.tile];
    if (t) { this.camTarget = geo.center(t.col, t.row); this.updateCamera(); }
  }

  refresh() {
    const g = this.g;
    this.borders.mesh = toMesh(geo.buildBorders(AU, g, this.field));
    const painted = this.look === 'painted';
    if (painted && terrain.scatterKey(g) !== this.natureKey) this.buildNature();
    if (this.useArt) this.art.refresh(AU, g, painted ? (x, z) => this.field.heightAt(x, z) : undefined);
    const hasArt = u => { const l = kaykit.loadoutFor(AU, u); return !!(l && this.art.scenes[l.model]); };
    this.pieces.mesh = toMesh(geo.buildPieces(AU, g, this.field, this.useArt ? { art: true, hasArt } : null));
    const seen = {};
    Object.keys(g.settlements).forEach(id => {
      const st = g.settlements[id], t = g.tiles[st.tile], civ = g.civs[st.civ]; if (!t || !civ) return;
      let lb = this.labels[id];
      if (!lb) {
        lb = new Label3D(); lb.billboard = BILLBOARD_ENABLED; lb.no_depth_test = true; lb.font_size = 56; lb.outline_size = 14; lb.pixel_size = 0.009;
        this.labelRoot.add_child(lb); this.labels[id] = lb;
      }
      const c = geo.center(t.col, t.row), col = geo.rgb(civ.color || '#ffffff');
      lb.text = st.name + '  ' + st.pop;
      lb.modulate = new Color(Math.min(1, col[0] * 0.5 + 0.55), Math.min(1, col[1] * 0.5 + 0.55), Math.min(1, col[2] * 0.5 + 0.55), 1);
      lb.position = new Vector3(c[0], Math.max(0, this.field.heightAt(c[0], c[1])) + (this.useArt ? (st.isCapital ? 2.0 : 1.3) : 1.15), c[1]);
      seen[id] = true;
    });
    Object.keys(this.labels).forEach(id => { if (!seen[id]) { this.labels[id].queue_free(); delete this.labels[id]; } });
    this.updateHud();
  }

  updateHud() {
    const g = this.g;
    this.turnLabel.text = 'Turn ' + g.turn + (g.victory ? '  ·  game over' : '') + '  ·  seed ' + this.seed;
    const majors = g.civs.filter(c => !c.minor && c.alive).map(c => ({ c, score: G.score(g, c), sets: G.civSettlements(g, c.idx).length })).sort((a, b) => b.score - a.score);
    const lines = majors.map(m => {
      const civ = AU.CIV_BY_ID[m.c.civId] || { name: m.c.civId }, ld = AU.LEADER_BY_ID[m.c.leaderId] || { name: '' };
      return '[color=' + (m.c.color || '#ffffff') + '][b]' + civ.name + '[/b][/color] (' + ld.name + ')  ' + m.score + ' pts  · ' + m.sets + ' settlements';
    });
    if (g.victory && g.civs[g.victory.civ]) { const w = g.civs[g.victory.civ]; lines.unshift('[b]' + ((AU.CIV_BY_ID[w.civId] || {}).name || w.civId) + ' wins a ' + g.victory.type + ' victory on turn ' + g.victory.turn + '[/b]'); }
    this.scores.text = lines.join('\n');
    this.info.text = this.selected >= 0 ? this.describe(this.selected) : 'Drag to pan, wheel or pinch to zoom, tap a tile for details. Space = End Turn.';
  }

  describe(i) {
    const g = this.g, t = g.tiles[i], T = AU.TERRAIN[t.terrain] || { name: t.terrain };
    const parts = [(t.hills ? 'Hills, ' : '') + T.name + (t.feature && AU.FEATURES && AU.FEATURES[t.feature] ? ', ' + AU.FEATURES[t.feature].name : '') + (t.river ? ', river' : '')];
    const oc = geo.ownerCiv(g, t); if (oc >= 0) parts.push('owned by ' + ((AU.CIV_BY_ID[g.civs[oc].civId] || {}).name || '?') + ' (' + g.settlements[t.owner].name + ')');
    const us = Object.keys(g.units).map(id => g.units[id]).filter(u => u.tile === i);
    if (us.length) parts.push('units: ' + us.map(u => (u.name || (AU.UNITS[u.type] || {}).name || u.type) + ' (' + ((AU.CIV_BY_ID[g.civs[u.civ].civId] || {}).name || '?') + ')').join(', '));
    return parts.join(' · ');
  }

  endTurn() {
    if (this.g.victory) { this.auto = false; this.autoBtn.text = 'Auto'; return; }
    G.endTurn(this.g);
    this.refresh();
  }
  onEndTurn() { this.endTurn(); }
  onAuto() { this.auto = !this.auto; this.autoBtn.text = this.auto ? 'Pause' : 'Auto'; }
  onFx() { this.hiFx = !this.hiFx; this.fxBtn.text = this.hiFx ? 'FX: High' : 'FX: Low'; this.env.ssao_enabled = this.hiFx; this.updateCamera(); }
  onNewMap() { this.auto = false; this.autoBtn.text = 'Auto'; this.newGame((Time.get_ticks_usec() % 100000) + 1); }

  runSmoke() {
    try {
      const t0 = Time.get_ticks_msec();
      for (let k = 0; k < 40 && !this.g.victory; k++) this.endTurn();
      const g = this.g, n = Object.keys(g.settlements).length;
      console.log('[tiny-empires] SMOKE OK turn ' + g.turn + ', ' + n + ' settlements, ' + Object.keys(g.units).length + ' units, ' + (Time.get_ticks_msec() - t0) + ' ms for 40 turns');
      console.log('[tiny-empires] ' + this.scores.text.replace(/\[[^\]]*\]/g, '').split('\n').join(' | '));
      this.get_tree().quit(n > 0 ? 0 : 1);
    } catch (e) {
      console.error('[tiny-empires] SMOKE FAILED ' + (e && e.stack || e));
      this.get_tree().quit(1);
    }
  }

  updateCamera() {
    const d = this.camDist, x = this.camTarget[0], z = this.camTarget[1];
    this.cam.look_at_from_position(new Vector3(x, d * Math.sin(PITCH), z + d * Math.cos(PITCH)), new Vector3(x, 0, z), new Vector3(0, 1, 0));
    const a = this.camAttr; // tilt-shift focus, tuned but disabled (see below)
    a.dof_blur_far_enabled = false; a.dof_blur_near_enabled = false; // off for now: in Godot 4.6.1 it softened the whole frame, and sharp footage matters more
    a.dof_blur_far_distance = d * 1.55; a.dof_blur_far_transition = d * 1.2;
    a.dof_blur_near_distance = d * 0.5; a.dof_blur_near_transition = d * 0.25; a.dof_blur_amount = 0.025;
    this.sun.directional_shadow_max_distance = d * 2.6 + 12;
  }
  pan(dxPixels, dyPixels) { // screen drag → move the map with the finger
    const k = this.camDist * 0.0016;
    this.camTarget = [this.camTarget[0] - dxPixels * k, this.camTarget[1] - dyPixels * k / Math.sin(PITCH)];
    this.clampCamera();
  }
  zoom(f) { this.camDist = Math.max(5, Math.min(60, this.camDist * f)); this.clampCamera(); }
  clampCamera() {
    const g = this.g; if (!g) return;
    this.camTarget = [Math.max(0, Math.min(geo.SQRT3 * g.W, this.camTarget[0])), Math.max(0, Math.min(1.5 * g.H, this.camTarget[1]))];
    this.updateCamera();
  }
  select(screenPos) {
    const o = this.cam.project_ray_origin(screenPos), d = this.cam.project_ray_normal(screenPos);
    if (Math.abs(d.y) < 1e-4) return;
    const k = (0.15 - o.y) / d.y, i = geo.pick(o.x + d.x * k, o.z + d.z * k, this.g.W, this.g.H);
    this.selected = i; this.updateHud();
  }

  _unhandled_input(ev) {
    if (ev.is_class('InputEventKey')) { if (ev.pressed && !ev.echo && ev.keycode === KEY_SPACE) this.endTurn(); return; }
    if (ev.is_class('InputEventMouseButton')) {
      if (ev.device === DEVICE_EMULATION) return; // touch is handled below; ignore the mouse events Godot synthesises from it
      if (ev.pressed && ev.button_index === WHEEL_UP) this.zoom(0.9);
      else if (ev.pressed && ev.button_index === WHEEL_DOWN) this.zoom(1.1);
      else if (ev.button_index === MOUSE_LEFT) { if (ev.pressed) this.dragged = 0; else if (this.dragged < 8) this.select(ev.position); }
      return;
    }
    if (ev.is_class('InputEventMouseMotion')) {
      if (ev.device === DEVICE_EMULATION) return;
      if (ev.button_mask & (1 | 2 | 4)) { this.pan(ev.relative.x, ev.relative.y); this.dragged += Math.abs(ev.relative.x) + Math.abs(ev.relative.y); }
      return;
    }
    if (ev.is_class('InputEventScreenTouch')) {
      if (ev.pressed) { this.touches[ev.index] = [ev.position.x, ev.position.y]; if (Object.keys(this.touches).length === 1) this.dragged = 0; }
      else { if (Object.keys(this.touches).length === 1 && this.dragged < 12) this.select(ev.position); delete this.touches[ev.index]; this.pinch = 0; }
      return;
    }
    if (ev.is_class('InputEventScreenDrag')) {
      this.touches[ev.index] = [ev.position.x, ev.position.y];
      const ids = Object.keys(this.touches);
      if (ids.length >= 2) { // pinch: zoom by the change in finger distance
        const a = this.touches[ids[0]], b = this.touches[ids[1]], dist = Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (this.pinch) this.zoom(this.pinch / Math.max(1, dist));
        this.pinch = dist; this.dragged += 100;
      } else { this.pan(ev.relative.x, ev.relative.y); this.dragged += Math.abs(ev.relative.x) + Math.abs(ev.relative.y); }
      return;
    }
    if (ev.is_class('InputEventMagnifyGesture')) this.zoom(1 / ev.factor);
  }

  _process(dt) {
    this.frames++;
    if (this.shot && (this.frames === 40 || this.frames === 80 || this.frames === 120)) { // close-up, wide view, then a pass with the low settings
      const name = this.frames === 40 ? 'shot.png' : this.frames === 80 ? 'shot_wide.png' : 'shot_low.png', path = ProjectSettings.globalize_path('user://' + name);
      this.get_viewport().get_texture().get_image().save_png(path);
      console.log('[tiny-empires] screenshot saved to ' + path);
      if (this.frames === 40) { this.camDist = 30; this.updateCamera(); }
      else if (this.frames === 80) { this.camDist = 16; this.onFx(); }
      else this.get_tree().quit(0);
      return;
    }
    let mx = 0, mz = 0;
    PAN_KEYS.forEach(k => { if (Input.is_key_pressed(k[0])) { mx += k[1]; mz += k[2]; } });
    if (mx || mz) { const s = this.camDist * 0.9 * dt; this.camTarget = [this.camTarget[0] + mx * s, this.camTarget[1] + mz * s]; this.clampCamera(); }
    if (this.auto) { this.acc += dt; if (this.acc > 0.35) { this.acc = 0; this.endTurn(); } }
  }
}

exports.default = Main;
