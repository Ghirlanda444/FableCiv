"use strict";
// Tiny Empires: Godot vertical slice. Runs the web game's rules engine (engine/au_bundle.js, built by tools/godot/bundle.js)
// and draws it in 3D: a sculpted, shader-textured landscape with animated water, forests, borders, settlements and units.
// Every empire is AI-run; End Turn (or Auto) advances the game.
// User args (after "--"): --smoke plays 40 turns headless and quits; --shot saves screenshots to user://shot*.png and quits.

const godot = require('godot');
const { Node3D, MeshInstance3D, MultiMeshInstance3D, MultiMesh, ArrayMesh, SurfaceTool, StandardMaterial3D, ShaderMaterial, Shader, Color, Vector2, Vector3,
  Transform3D, QuadMesh, ResourceLoader, Camera3D, CameraAttributesPractical, DirectionalLight3D, WorldEnvironment, Environment, Sky, ProceduralSkyMaterial, PlaneMesh,
  CanvasLayer, PanelContainer, VBoxContainer, HBoxContainer, Button, RichTextLabel, Label, Label3D,
  Callable, OS, Input, Time, ProjectSettings } = godot;
const AU = require('res://engine/au_bundle.js'); // absolute ids: GodotJS 1.1 beta turns relative ids from res:// into res:/
const geo = require('res://geo.js');
const terrain = require('res://terrain.js');
const props = require('res://props.js');
const shaders = require('res://shaders.js');
const sprites = require('res://sprites.js');
const city = require('res://city.js');
const dressing = require('res://dressing.js');
const G = AU.G;

const PRIMITIVE_TRIANGLES = 3, CULL_DISABLED = 2, TRANSPARENCY_ALPHA = 1, SHADING_UNSHADED = 0, BILLBOARD_ENABLED = 1;
const BG_SKY = 2, AMBIENT_SKY = 3, TONEMAP_FILMIC = 2, TONEMAP_AGX = 4, SHADOWS_OFF = 0, DEVICE_EMULATION = -1, TRANSFORM_3D = 1;
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
    if (b.uv) st.set_uv(new Vector2(b.uv[i * 2], b.uv[i * 2 + 1]));
    st.add_vertex(new Vector3(b.p[i * 3], b.p[i * 3 + 1], b.p[i * 3 + 2]));
  }
  return n ? st.commit() : null;
}

// indexed terrain mesh: bulk upload through packed arrays when this Godot build allows it, else SurfaceTool (slower, always works)
function arrayMesh(M) {
  try {
    const PF = godot.PackedFloat32Array, PI = godot.PackedInt32Array, GA = godot.GArray;
    const bytes = a => new PF(Array.from(a)).to_byte_array();
    const v = bytes(M.pos).to_vector3_array(), n = bytes(M.nrm).to_vector3_array(), c = bytes(M.col).to_color_array(), uv = bytes(M.uv).to_vector2_array(), uv2 = bytes(M.uv2).to_vector2_array();
    if (v.size() !== M.vertices) throw new Error('vertex count ' + v.size());
    const arrs = GA ? new GA() : [];
    if (GA) { arrs.resize(13); arrs.set_indexed(0, v); arrs.set_indexed(1, n); arrs.set_indexed(3, c); arrs.set_indexed(4, uv); arrs.set_indexed(5, uv2); arrs.set_indexed(12, new PI(Array.from(M.idx))); }
    else { for (let i = 0; i < 13; i++) arrs.push(null); arrs[0] = v; arrs[1] = n; arrs[3] = c; arrs[4] = uv; arrs[5] = uv2; arrs[12] = new PI(Array.from(M.idx)); }
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
    st.set_uv2(new Vector2(M.uv2[i * 2], M.uv2[i * 2 + 1]));
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
    this.density = OS.get_name() === 'Android' ? 0.5 : 1; // phones get half the trees and grass
    this.matTerrain = shaderMaterial(shaders.PAINTED_TERRAIN);
    this.matWater = shaderMaterial(shaders.TOON_WATER);
    this.matPieces = material({ roughness: 0.7 });
    this.matProps = shaderMaterial(shaders.PAINTED_PROP);
    this.matLeaves = shaderMaterial(shaders.PAINTED_LEAF);
    this.matCity = shaderMaterial(shaders.PAINTED_PROP); this.matCity.set_shader_parameter('wind', 0.0); // settlements: toon-lit, no sway
    this.matBorders = material({ alpha: true, unshaded: true });
    this.matRivers = shaderMaterial(shaders.RIVER_WATER); // flowing water in a carved channel (terrain.js, shaders.RIVER_WATER)
    // each nature kind is one or more instanced parts sharing the same placements: fluffy trees and bushes are a solid trunk
    // and core plus a leaf-card crown drawn by the leaf shader
    const solid = b => [{ mesh: toMesh(b), mat: this.matProps }], fluffy = f => [{ mesh: toMesh(f.solid), mat: this.matProps }, { mesh: toMesh(f.leaves), mat: this.matLeaves }];
    this.propMeshes = { pine: solid(props.pineTree()), round: fluffy(props.fluffyTree()), palm: solid(props.palmTree()), bush: fluffy(props.fluffyBush()),
      tuft: solid(props.tuft()), rock: solid(props.rock()), reed: solid(props.reed()) };
    this.dressMeshes = {}; // resource scenery models (dressing.js): animals, rocks and water things stand still, plants sway
    Object.keys(dressing.MODELS).forEach(k => { const m = dressing.MODELS[k]; this.dressMeshes[k] = { mesh: toMesh(m[0]()), still: m[1] === 'still' }; });
    this.loadGroundTextures();
    this.buildWorld();
    // the web game's painted pictures (copied to res://art by tools/godot/bundle.js) for units and buildings; without them the
    // code-built placeholder pieces stand in (the game never waits on art)
    this.textures = {}; this.unitNodes = {}; this.townNodes = {}; this.resNodes = {}; this.cityNodes = {}; this.standeeMats = {}; this.crops = {};
    this.cityRoot = new Node3D(); this.add_child(this.cityRoot);
    this.grid = true; this.viewCity = null;
    this.spriteRoot = new Node3D(); this.add_child(this.spriteRoot);
    this.useArt = this.args.indexOf('--no-art') < 0 && !!this.texture(['units/warrior.png']);
    console.log('[tiny-empires] art: ' + (this.useArt ? 'painted pictures' : 'placeholders'));
    this.buildHud();
    this.newGame(this.smoke || this.shot ? 7 : (Time.get_ticks_usec() % 100000) + 1);
    if (this.smoke) this.runSmoke();
    if (this.shot) { for (let k = 0; k < 70 && !this.g.victory; k++) G.endTurn(this.g); this.refresh(); this.focusPlayer(); this.camDist = 10; this.updateCamera(); }
  }

  // detailed look: the CC0 ground textures fetched at build time (tools/godot/fetch-textures.js); without them only the
  // painted look exists
  loadGroundTextures() {
    const has = {}, slots = ['grass', 'sand', 'rock', 'snow']; // plains are the grass, sun-dried in the shader
    slots.forEach(s => {
      ['diff', 'nor'].forEach(m => { const p = 'res://textures/' + s + '_' + m + '.jpg'; if (ResourceLoader.exists(p)) { this.matTerrain.set_shader_parameter(s + (m === 'diff' ? '_d' : '_n'), ResourceLoader.load(p)); if (m === 'diff') has[s] = 1; } });
    });
    this.matTerrain.set_shader_parameter('has_tex', new godot.Vector4(has.grass ? 1 : 0, 0, has.sand ? 1 : 0, has.rock ? 1 : 0));
    this.matTerrain.set_shader_parameter('has_snow', has.snow ? 1.0 : 0.0);
    this.hasGroundTex = !!has.grass;
    this.detailed = this.hasGroundTex && this.args.indexOf('--painted') < 0;
    this.matTerrain.set_shader_parameter('detailed', this.detailed ? 1.0 : 0.0); this.matRivers.set_shader_parameter('detailed', this.detailed ? 1.0 : 0.0);
    console.log('[tiny-empires] ground textures: ' + (Object.keys(has).join(', ') || 'none') + '; look ' + (this.detailed ? 'detailed' : 'painted'));
  }
  onLook() {
    if (!this.hasGroundTex) return;
    this.detailed = !this.detailed; this.lookBtn.text = this.detailed ? 'Look: Detailed' : 'Look: Painted';
    this.matTerrain.set_shader_parameter('detailed', this.detailed ? 1.0 : 0.0); this.matRivers.set_shader_parameter('detailed', this.detailed ? 1.0 : 0.0);
    this.applyLookLight();
  }
  // the camera and sky settings of each look: the painted look wants a bright, saturated filmic curve and a strong sky fill;
  // real textures want a neutral curve (AgX), less fill (so relief and shadows read) and lighter haze
  applyLookLight() {
    const env = this.env; if (!env) return;
    if (this.detailed) { env.tonemap_mode = TONEMAP_AGX; env.tonemap_exposure = 1.0; env.ambient_light_energy = 0.42; env.adjustment_saturation = 1.08; env.adjustment_contrast = 1.06; env.fog_aerial_perspective = 0.15; this.sun.light_energy = 1.35; }
    else { env.tonemap_mode = TONEMAP_FILMIC; env.tonemap_exposure = 0.9; env.ambient_light_energy = 0.6; env.adjustment_saturation = 1.04; env.adjustment_contrast = 1.03; env.fog_aerial_perspective = 0.35; this.sun.light_energy = 1.15; }
  }

  buildWorld() {
    const env = new Environment(), sky = new Sky(), sm = new ProceduralSkyMaterial();
    sm.sky_top_color = new Color(0.36, 0.6, 0.9, 1); sm.sky_horizon_color = new Color(0.8, 0.88, 0.95, 1);
    sm.ground_horizon_color = new Color(0.1, 0.28, 0.5, 1); sm.ground_bottom_color = new Color(0.04, 0.16, 0.34, 1); // open sea past the map edge
    sky.sky_material = sm;
    env.background_mode = BG_SKY; env.sky = sky;
    env.ambient_light_source = AMBIENT_SKY; env.ambient_light_energy = 0.6; // soft fill: shadows stay light and bluish
    env.tonemap_mode = TONEMAP_FILMIC; env.tonemap_exposure = 0.9; // filmic keeps the painted palette saturated
    env.adjustment_enabled = true; env.adjustment_saturation = 1.04; env.adjustment_contrast = 1.03;
    env.ssao_enabled = this.hiFx; env.ssao_radius = 0.8; env.ssao_intensity = 1.6; // Forward+ only
    env.glow_enabled = false; // the painted look needs no bloom, and bloom made small bright details flare into sparks
    env.fog_enabled = true; env.fog_light_color = new Color(0.72, 0.8, 0.9, 1); env.fog_density = 0.004; env.fog_aerial_perspective = 0.35; env.fog_sky_affect = 0.2;
    this.env = env;
    const we = new WorldEnvironment(); we.environment = env; this.add_child(we);

    const sun = new DirectionalLight3D(); // a warm, fairly low sun for long, readable shadows
    sun.rotation_degrees = new Vector3(-46, -40, 0);
    sun.light_energy = 1.15; sun.light_color = new Color(1, 0.95, 0.84, 1);
    sun.shadow_enabled = true; sun.shadow_blur = 1.5; sun.directional_shadow_max_distance = 60;
    this.sun = sun; this.add_child(sun);
    this.applyLookLight();
    // the same angles as a direction toward the sun (Godot rotates Y then X), for the water's sun glint
    const ax = -46 * Math.PI / 180, ay = -40 * Math.PI / 180, fx = Math.sin(ay) * -Math.cos(ax), fy = Math.sin(ax), fz = Math.cos(ay) * -Math.cos(ax);
    this.matWater.set_shader_parameter('sun_dir', new Vector3(-fx, -fy, -fz)); this.matRivers.set_shader_parameter('sun_dir', new Vector3(-fx, -fy, -fz));

    this.cam = new Camera3D(); this.cam.fov = 45; this.cam.far = 500; this.add_child(this.cam); this.cam.make_current();
    this.camAttr = new CameraAttributesPractical(); this.cam.attributes = this.camAttr;
    this.terrain = new MeshInstance3D(); this.terrain.material_override = this.matTerrain; this.add_child(this.terrain);
    this.rivers = new MeshInstance3D(); this.rivers.material_override = this.matRivers; this.rivers.cast_shadow = SHADOWS_OFF; this.add_child(this.rivers);
    this.propRoot = new Node3D(); this.add_child(this.propRoot);
    this.borders = new MeshInstance3D(); this.borders.material_override = this.matBorders; this.borders.cast_shadow = SHADOWS_OFF; this.add_child(this.borders);
    this.pieces = new MeshInstance3D(); this.pieces.material_override = this.matPieces; this.add_child(this.pieces);
    this.unitMarks = new MeshInstance3D(); this.unitMarks.material_override = this.matBorders; this.unitMarks.cast_shadow = SHADOWS_OFF; this.add_child(this.unitMarks);
    this.labelRoot = new Node3D(); this.add_child(this.labelRoot);
    const water = new MeshInstance3D(), plane = new PlaneMesh(); // one animated water surface at sea level, map and open sea alike
    plane.size = new Vector2(420, 420); plane.subdivide_width = 160; plane.subdivide_depth = 160;
    water.mesh = plane; water.material_override = this.matWater; water.cast_shadow = SHADOWS_OFF;
    this.water = water; this.add_child(water);
    const bed = new MeshInstance3D(), bedPlane = new PlaneMesh(), bedMat = new StandardMaterial3D(); // sea floor beyond the map
    bedPlane.size = new Vector2(420, 420); bedMat.albedo_color = new Color(0.36, 0.55, 0.55, 1); bedMat.roughness = 1;
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
    this.gridBtn = mk('Grid: On', this.onGrid);
    if (this.hasGroundTex) this.lookBtn = mk(this.detailed ? 'Look: Detailed' : 'Look: Painted', this.onLook);
    this.scores = new RichTextLabel(); this.scores.bbcode_enabled = true; this.scores.fit_content = true; this.scores.scroll_active = false;
    this.scores.custom_minimum_size = new Vector2(380, 0); this.scores.add_theme_font_size_override('normal_font_size', 16); box.add_child(this.scores);
    this.info = new Label(); this.info.add_theme_font_size_override('font_size', 15); this.info.custom_minimum_size = new Vector2(380, 0);
    this.info.autowrap_mode = 3; box.add_child(this.info);
    // city menu: shown when a settlement is selected; "Show city" opens the close-up with its buildings
    this.cityBox = new VBoxContainer(); box.add_child(this.cityBox);
    this.cityTitle = new Label(); this.cityTitle.add_theme_font_size_override('font_size', 18); this.cityBox.add_child(this.cityTitle);
    this.cityText = new Label(); this.cityText.add_theme_font_size_override('font_size', 14); this.cityText.custom_minimum_size = new Vector2(380, 0);
    this.cityText.autowrap_mode = 3; this.cityBox.add_child(this.cityText);
    this.showBtn = new Button(); this.showBtn.text = 'Show city'; this.showBtn.custom_minimum_size = new Vector2(160, 44); this.showBtn.add_theme_font_size_override('font_size', 18);
    this.showBtn.pressed.connect(Callable.create(this, this.onShowCity), 0); this.cityBox.add_child(this.showBtn);
    this.cityBox.visible = false;
  }

  newGame(seed) {
    let s = seed >>> 0; const rng = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
    const seat = pickLeaderSeats(rng);
    this.g = G.newGame({ playerCiv: seat[0], playerLeader: seat[1], mapSize: 'small', mapType: 'continents', numCivs: 5, numStates: 3, seed: seed, difficulty: 'prince', v2: true });
    const pl = G.player(this.g); pl.isPlayer = false; pl.ai = Object.assign({}, AU.LEADER_BY_ID[pl.leaderId].ai); // spectator: every empire is AI-run
    this.seed = seed; this.selected = -1; this.viewCity = null;
    this.buildLand();
    Object.keys(this.labels).forEach(id => this.labels[id].queue_free()); this.labels = {};
    const capOf = c => (c && c.capital !== undefined && c.capital !== null && this.g.settlements[c.capital]) ? c.capital : undefined;
    const cap = capOf(G.player(this.g)) !== undefined ? capOf(G.player(this.g)) : this.g.civs.filter(c => !c.minor).map(capOf).find(id => id !== undefined);
    const u = Object.keys(this.g.units).map(id => this.g.units[id]).find(x => x.civ === this.g.playerIdx);
    const focus = this.g.tiles[cap !== undefined ? this.g.settlements[cap].tile : (u ? u.tile : Math.floor(this.g.tiles.length / 2))];
    this.camTarget = geo.center(focus.col, focus.row); this.camDist = 16;
    const mid = new Vector3(geo.SQRT3 * this.g.W / 2, 0, 0.75 * this.g.H);
    this.matWater.set_shader_parameter('map_rect', new godot.Vector4(-geo.SQRT3 / 2, -1, geo.SQRT3 * (this.g.W + 0.5), 1.5 * (this.g.H - 1) + 1));
    this.water.position = new Vector3(mid.x, this.waterY, mid.z); this.seabed.position = new Vector3(mid.x, -0.86, mid.z); // level with the ocean floor, so the map's edge does not show
    this.updateCamera();
    this.refresh();
  }

  // the static landscape for a new map: the painted terrain with rivers and nature
  buildLand() {
    const t0 = Time.get_ticks_msec();
    this.clearSprites(); this.clearCities();
    this.field = terrain.makeField(AU, this.g);
    const M = terrain.buildTerrainMesh(this.field), t1 = Time.get_ticks_msec();
    const up = arrayMesh(M); this.terrain.mesh = up.mesh;
    const t2 = Time.get_ticks_msec();
    this.rivers.mesh = toMesh(terrain.buildRivers(this.field));
    const S = this.buildNature(); this.dressKey = null;
    this.waterY = 0;
    console.log('[tiny-empires] map ' + this.g.W + 'x' + this.g.H + ' seed ' + this.seed + ': terrain ' + M.vertices + ' verts / ' + M.triangles + ' tris, built in ' + (t1 - t0) +
      ' ms, uploaded via ' + up.path + ' in ' + (t2 - t1) + ' ms; nature ' + Object.keys(S).map(k => k + ' ' + S[k].length).join(', ') + '; total ' + (Time.get_ticks_msec() - t0) + ' ms');
  }

  clearProps() { (this.propNodes || []).forEach(n => n.queue_free()); this.propNodes = []; } // our own list: get_children() returns a Godot array, not a JS one

  // trees, bushes, grass, rocks and reeds; rebuilt when a new settlement needs its site cleared
  buildNature() {
    this.clearProps();
    const S = terrain.buildScatter(this.field, this.g, this.density);
    this.propNodes = [];
    Object.keys(S).filter(k => S[k].length && this.propMeshes[k]).forEach(k => this.propMeshes[k].forEach(part => {
      const n = scatterNode(part.mesh, S[k], part.mat); this.propRoot.add_child(n); this.propNodes.push(n);
    }));
    this.natureKey = terrain.scatterKey(this.g);
    return S;
  }

  // resource scenery (dressing.js): rebuilt when the set of shown resources changes (a new era reveals strategic ones)
  buildDressing() {
    (this.dressNodes || []).forEach(n => n.queue_free()); this.dressNodes = [];
    const shows = t => geo.showsResource(AU, this.g, t), D = dressing.buildDressing(this.field, this.g, shows);
    Object.keys(D).forEach(k => { const m = this.dressMeshes[k]; if (!m || !D[k].length) return;
      const n = scatterNode(m.mesh, D[k], m.still ? this.matCity : this.matProps); this.propRoot.add_child(n); this.dressNodes.push(n); });
    this.dressKey = dressing.dressingKey(this.g, shows);
  }

  // first picture of a preference chain that exists (cached; null when none does)
  texture(chain) {
    for (const p of chain) {
      if (!(p in this.textures)) { const path = 'res://art/' + p; this.textures[p] = ResourceLoader.exists(path) ? ResourceLoader.load(path) : null; }
      if (this.textures[p]) return this.textures[p];
    }
    return null;
  }
  // the painted part of a picture as [u, v, width, height] in 0..1: the generated pictures have wide empty margins (a fifth of
  // a warrior picture is blank under the feet), which left units floating and off-centre
  crop(tex) {
    const k = tex.resource_path;
    if (!this.crops[k]) {
      let r = [0, 0, 1, 1];
      try {
        const img = tex.get_image(); if (img.is_compressed()) img.decompress();
        const u = img.get_used_rect(), W = img.get_width(), H = img.get_height();
        if (u.size.x > 4 && u.size.y > 4) r = [u.position.x / W, u.position.y / H, u.size.x / W, u.size.y / H];
      } catch (e) { console.log('[tiny-empires] no crop for ' + k + ': ' + (e && e.message)); }
      this.crops[k] = r;
    }
    return this.crops[k];
  }
  // a painted picture as a 2.5D standee: a card pivoting at its base, lit by the scene (shaders.STANDEE). height is the painted
  // figure's height; very wide pictures (horsemen, ships) are held to maxWidth.
  // badge: a square icon on a round plate (resources), height is then its diameter
  standee(tex, x, y, z, height, isUnit, maxWidth, badge) {
    const r = this.crop(tex), aspect = badge ? 1 : (r[2] * tex.get_width()) / (r[3] * tex.get_height()), key = tex.resource_path + (badge ? ':badge' : isUnit ? ':u' : ':b');
    let w = height * aspect; if (maxWidth && w > maxWidth) { w = maxWidth; height = w / aspect; }
    let mat = this.standeeMats[key];
    if (!mat) {
      mat = this.standeeMats[key] = shaderMaterial(shaders.STANDEE); mat.set_shader_parameter('tex', tex); mat.set_shader_parameter('anim', isUnit ? 1.0 : 0.0);
      const side = Math.max(r[2] * tex.get_width(), r[3] * tex.get_height()), sq = badge ? [r[0] + r[2] / 2 - side / tex.get_width() / 2, r[1] + r[3] / 2 - side / tex.get_height() / 2, side / tex.get_width(), side / tex.get_height()] : r;
      mat.set_shader_parameter('uv_rect', new godot.Vector4(sq[0], sq[1], sq[2], sq[3])); mat.set_shader_parameter('badge', badge ? 1.0 : 0.0);
    }
    const quad = new QuadMesh(); quad.size = new Vector2(w, height); quad.center_offset = new Vector3(0, height * 0.5, 0);
    const mi = new MeshInstance3D(); mi.mesh = quad; mi.material_override = mat;
    mi.position = new Vector3(x, y, z);
    this.spriteRoot.add_child(mi);
    return mi;
  }
  // units and town buildings as painted standees, reused while they stay the same
  syncSprites(ground) {
    const g = this.g, keepU = {}, keepT = {};
    sprites.unitSpots(AU, g, ground).forEach(s => {
      const tex = this.texture(s.chain); if (!tex) return;
      let n = this.unitNodes[s.id];
      if (n && n.tex !== tex) { n.node.queue_free(); n = null; }
      if (!n) n = this.unitNodes[s.id] = { tex, node: this.standee(tex, s.x, s.y, s.z, s.height, true, 0.72) };
      n.node.position = new Vector3(s.x, s.y + 0.01, s.z); // feet on the ground, in the owner's ring
      keepU[s.id] = true;
    });
    Object.keys(this.unitNodes).forEach(id => { if (!keepU[id]) { this.unitNodes[id].node.queue_free(); delete this.unitNodes[id]; } });
    const vs = this.viewCity !== null && g.settlements[this.viewCity];
    (vs ? sprites.cityViewSprites(AU, g, vs, ground) : []).forEach(s => { // the "Show city" close-up: the settlement's buildings as pictures
      const tex = this.texture(s.chain); if (!tex) return;
      let n = this.townNodes[s.key];
      if (n && n.tex !== tex) { n.node.queue_free(); n = null; }
      if (!n) n = this.townNodes[s.key] = { tex, node: this.standee(tex, s.x, s.y, s.z, s.height, false) };
      n.node.position = new Vector3(s.x, s.y + 0.02, s.z);
      keepT[s.key] = true;
    });
    Object.keys(this.townNodes).forEach(k => { if (!keepT[k]) { this.townNodes[k].node.queue_free(); delete this.townNodes[k]; } });
    const keepR = {};
    sprites.resourceSpots(AU, g, ground).forEach(s => { // resource icons: painted pictures on round badges over the tile centre
      const tex = this.texture(s.chain); if (!tex) return;
      if (!this.resNodes[s.key] || this.resNodes[s.key].tex !== tex) {
        if (this.resNodes[s.key]) this.resNodes[s.key].node.queue_free();
        this.resNodes[s.key] = { tex, node: this.standee(tex, s.x, s.y, s.z, s.height, false, 0, true) };
        this.resNodes[s.key].node.cast_shadow = SHADOWS_OFF;
      }
      keepR[s.key] = true;
    });
    Object.keys(this.resNodes).forEach(k => { if (!keepR[k]) { this.resNodes[k].node.queue_free(); delete this.resNodes[k]; } });
  }
  // settlements as Civ3-style town models (city.js), rebuilt only when their size tier, walls, capital or owner change
  syncCities(ground) {
    const g = this.g, keep = {};
    Object.keys(g.settlements).forEach(id => {
      const s = g.settlements[id], view = String(this.viewCity) === String(id), key = city.cityKey(AU, g, s, view);
      let n = this.cityNodes[id];
      if (!n || n.key !== key) {
        const built = city.buildCity(AU, g, s, ground, { view, river: this.field.river });
        if (!n) { n = this.cityNodes[id] = { node: new MeshInstance3D() }; n.node.material_override = this.matCity; this.cityRoot.add_child(n.node); }
        n.node.mesh = toMesh(built.batch); n.key = key; n.top = built.top;
      }
      keep[id] = true;
    });
    Object.keys(this.cityNodes).forEach(id => { if (!keep[id]) { this.cityNodes[id].node.queue_free(); delete this.cityNodes[id]; } });
  }
  clearCities() { Object.keys(this.cityNodes || {}).forEach(id => this.cityNodes[id].node.queue_free()); this.cityNodes = {}; }
  clearSprites() {
    Object.keys(this.unitNodes || {}).forEach(id => this.unitNodes[id].node.queue_free());
    Object.keys(this.townNodes || {}).forEach(k => this.townNodes[k].node.queue_free());
    Object.keys(this.resNodes || {}).forEach(k => this.resNodes[k].node.queue_free());
    this.unitNodes = {}; this.townNodes = {}; this.resNodes = {};
  }

  // centre the camera on the land with the most mountains and hills around it (for the relief screenshot)
  frameMountains() {
    const g = this.g; let best = null, bestScore = -1;
    g.tiles.forEach(t => {
      if (t.terrain !== 'mountain') return;
      const c = geo.center(t.col, t.row);
      const score = g.tiles.reduce((s, u) => { const d = Math.hypot(geo.center(u.col, u.row)[0] - c[0], geo.center(u.col, u.row)[1] - c[1]); return s + (d < 5 ? (u.terrain === 'mountain' ? 2 : u.hills ? 1 : 0) : 0); }, 0);
      if (score > bestScore) { bestScore = score; best = c; }
    });
    if (best) { this.camTarget = best.slice(); this.camDist = 12; this.updateCamera(); }
  }

  focusPlayer() { // centre on the followed empire's capital (it moves when a capital falls)
    const p = G.player(this.g), s = p && this.g.settlements[p.capital], t = s && this.g.tiles[s.tile];
    if (t) { this.camTarget = geo.center(t.col, t.row); this.updateCamera(); }
  }

  refresh() {
    const g = this.g;
    this.borders.mesh = toMesh(geo.buildBorders(AU, g, this.field));
    if (terrain.scatterKey(g) !== this.natureKey) this.buildNature();
    if (dressing.dressingKey(g, t => geo.showsResource(AU, g, t)) !== this.dressKey) this.buildDressing();
    const ground = (x, z) => this.field.heightAt(x, z);
    if (this.viewCity !== null && !g.settlements[this.viewCity]) this.closeCity(); // razed or gone
    this.syncCities(ground);
    if (this.useArt) this.syncSprites(ground);
    const hasArt = u => !!this.texture(sprites.unitChain(AU, g, u));
    this.pieces.mesh = toMesh(geo.buildPieces(AU, g, this.field, this.useArt ? { art: true, hasArt } : null));
    this.unitMarks.mesh = this.useArt ? toMesh(geo.buildUnitMarks(AU, g, this.field, hasArt)) : null;
    const seen = {};
    Object.keys(g.settlements).forEach(id => {
      const st = g.settlements[id], t = g.tiles[st.tile], civ = g.civs[st.civ]; if (!t || !civ) return;
      let lb = this.labels[id];
      if (!lb) {
        lb = new Label3D(); lb.billboard = BILLBOARD_ENABLED; lb.no_depth_test = true; lb.font_size = 56; lb.outline_size = 14; lb.pixel_size = 0.0072;
        this.labelRoot.add_child(lb); this.labels[id] = lb;
      }
      const c = geo.center(t.col, t.row), col = geo.rgb(civ.color || '#ffffff');
      lb.text = (st.isCapital ? '★ ' : '') + st.name + '  ' + st.pop;
      lb.modulate = new Color(Math.min(1, col[0] * 0.5 + 0.55), Math.min(1, col[1] * 0.5 + 0.55), Math.min(1, col[2] * 0.5 + 0.55), 1);
      const cn = this.cityNodes[id];
      lb.position = new Vector3(c[0], (cn ? cn.top : Math.max(0, this.field.heightAt(c[0], c[1])) + 0.8) + 0.2, c[1] - 0.2);
      lb.visible = String(this.viewCity) !== String(id); // the Show city view names the city in the menu instead
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
    this.updateCityMenu();
  }

  // the city menu for the selected settlement (or the one being shown)
  updateCityMenu() {
    const g = this.g, t = this.selected >= 0 ? g.tiles[this.selected] : null;
    let s = this.viewCity !== null ? g.settlements[this.viewCity] : null;
    if (!s && t && t.settlement !== undefined && t.settlement !== null) s = g.settlements[t.settlement];
    this.cityBox.visible = !!s;
    if (!s) return;
    const civ = g.civs[s.civ], cname = (AU.CIV_BY_ID[civ.civId] || AU.CITY_STATE_BY_ID && AU.CITY_STATE_BY_ID[civ.civId] || { name: civ.civId }).name;
    this.cityTitle.text = (s.isCapital ? '★ ' : '') + s.name + '  ·  ' + city.TIER_NAMES[city.tierOf(s)] + ', population ' + s.pop + '  ·  ' + cname;
    const names = (s.buildings || []).map(b => { const d = G.buildingDef ? G.buildingDef(g, civ, b) : null; return (AU.WONDERS && AU.WONDERS[b] ? '✦ ' : '') + (d && d.name || b); });
    this.cityText.text = names.length ? 'Buildings: ' + names.join(', ') : 'No buildings yet.';
    this.showBtn.text = String(this.viewCity) === String(s.id) ? 'Back to map' : 'Show city';
  }

  describe(i) {
    const g = this.g, t = g.tiles[i], T = AU.TERRAIN[t.terrain] || { name: t.terrain };
    const parts = [(t.hills ? 'Hills, ' : '') + T.name + (t.feature && AU.FEATURES && AU.FEATURES[t.feature] ? ', ' + AU.FEATURES[t.feature].name : '') + (t.river ? ', river' : '')];
    const R = t.resource && AU.RESOURCES[t.resource];
    if (R && (!G.resourceKnown || G.resourceKnown(g, G.player(g), R))) parts.push('resource: ' + (R.name || t.resource));
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
  onGrid() {
    this.grid = !this.grid; this.gridBtn.text = this.grid ? 'Grid: On' : 'Grid: Off';
    this.matTerrain.set_shader_parameter('grid_strength', this.grid ? 0.6 : 0.0); this.matWater.set_shader_parameter('grid_strength', this.grid ? 0.6 : 0.0);
  }
  onShowCity() {
    const g = this.g, t = this.selected >= 0 ? g.tiles[this.selected] : null;
    if (this.viewCity !== null) { this.closeCity(); this.refresh(); return; }
    if (t && t.settlement !== undefined && t.settlement !== null && g.settlements[t.settlement]) this.openCity(t.settlement);
  }
  // "Show city": zoom in on the settlement, hide its houses and show its buildings as pictures
  openCity(id) {
    const s = this.g.settlements[id], t = this.g.tiles[s.tile];
    this.viewCity = id; this.savedDist = this.camDist;
    this.camTarget = geo.center(t.col, t.row); this.camTarget[1] += 0.25; this.camDist = 4.2; this.updateCamera();
    this.refresh();
  }
  showBiggestCity() { // for the screenshot: the followed empire's largest settlement (else any)
    const all = Object.keys(this.g.settlements).map(id => this.g.settlements[id]), mine = all.filter(s => s.civ === this.g.playerIdx);
    const best = (mine.length ? mine : all).sort((a, b) => (b.buildings || []).length - (a.buildings || []).length)[0];
    if (best) { this.selected = best.tile; this.openCity(best.id); }
  }
  closeCity() { if (this.viewCity === null) return; this.viewCity = null; if (this.savedDist) { this.camDist = this.savedDist; this.updateCamera(); } }
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
  zoom(f) { this.camDist = Math.max(this.viewCity !== null ? 3 : 5, Math.min(60, this.camDist * f)); this.clampCamera(); }
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
    const SHOTS = { 40: 'shot.png', 80: 'shot_close.png', 120: 'shot_wide.png', 160: 'shot_low.png', 200: 'shot_city.png', 240: 'shot_relief.png', 280: 'shot_relief_painted.png' }; // default zoom, close-up, wide, low settings, Show city, then hills and mountains on another map (detailed, then painted)
    if (this.shot && SHOTS[this.frames]) {
      const path = ProjectSettings.globalize_path('user://' + SHOTS[this.frames]);
      this.get_viewport().get_texture().get_image().save_png(path);
      console.log('[tiny-empires] screenshot saved to ' + path);
      if (this.frames === 40) { this.camDist = 5.5; this.updateCamera(); }
      else if (this.frames === 80) { this.camDist = 30; this.updateCamera(); }
      else if (this.frames === 120) { this.camDist = 16; this.onFx(); }
      else if (this.frames === 160) { this.onFx(); this.showBiggestCity(); }
      else if (this.frames === 200) { this.closeCity(); this.newGame(6); this.frameMountains(); }
      else if (this.frames === 240 && this.hasGroundTex) this.onLook();
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
