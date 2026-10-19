"use strict";
// Tiny Empires: Godot vertical slice. Runs the web game's rules engine (engine/au_bundle.js, built by tools/godot/bundle.js)
// and draws it in 3D: hex terrain, borders, settlements and units. Every empire is AI-run; End Turn (or Auto) advances the game.
// User args (after "--"): --smoke plays 40 turns headless and quits; --shot saves a screenshot to user://shot.png and quits.

const godot = require('godot');
const { Node3D, MeshInstance3D, SurfaceTool, StandardMaterial3D, Color, Vector2, Vector3, Camera3D, DirectionalLight3D, WorldEnvironment,
  Environment, Sky, ProceduralSkyMaterial, CanvasLayer, PanelContainer, VBoxContainer, HBoxContainer, Button, RichTextLabel, Label, Label3D,
  Callable, OS, Input, Time, ProjectSettings } = godot;
const AU = require('res://engine/au_bundle.js'); // absolute ids: GodotJS 1.1 beta turns relative ids from res:// into res:/
const geo = require('res://geo.js');
const G = AU.G;

const PRIMITIVE_TRIANGLES = 3, CULL_DISABLED = 2, TRANSPARENCY_ALPHA = 1, SHADING_UNSHADED = 0, BILLBOARD_ENABLED = 1;
const BG_SKY = 2, AMBIENT_SKY = 3, TONEMAP_ACES = 3, SHADOWS_OFF = 0, DEVICE_EMULATION = -1;
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
    this.matTerrain = material({});
    this.matPieces = material({ roughness: 0.7 });
    this.matBorders = material({ alpha: true, unshaded: true });
    this.buildWorld();
    this.buildHud();
    this.newGame(this.smoke || this.shot ? 7 : (Time.get_ticks_usec() % 100000) + 1);
    if (this.smoke) this.runSmoke();
    if (this.shot) { for (let k = 0; k < 70 && !this.g.victory; k++) G.endTurn(this.g); this.refresh(); this.camDist = 22; this.updateCamera(); }
  }

  buildWorld() {
    const env = new Environment(), sky = new Sky(), sm = new ProceduralSkyMaterial();
    sm.sky_top_color = new Color(0.32, 0.52, 0.82, 1); sm.sky_horizon_color = new Color(0.72, 0.8, 0.9, 1);
    sm.ground_horizon_color = new Color(0.62, 0.66, 0.7, 1); sm.ground_bottom_color = new Color(0.2, 0.22, 0.26, 1);
    sky.sky_material = sm;
    env.background_mode = BG_SKY; env.sky = sky;
    env.ambient_light_source = AMBIENT_SKY; env.ambient_light_energy = 0.75;
    env.tonemap_mode = TONEMAP_ACES;
    env.ssao_enabled = true; // Forward+ only; the mobile renderer ignores it
    env.glow_enabled = true; env.glow_intensity = 0.25;
    const we = new WorldEnvironment(); we.environment = env; this.add_child(we);

    const sun = new DirectionalLight3D();
    sun.rotation_degrees = new Vector3(-52, -38, 0);
    sun.light_energy = 1.25; sun.light_color = new Color(1, 0.96, 0.88, 1);
    sun.shadow_enabled = true; sun.directional_shadow_max_distance = 70;
    this.add_child(sun);

    this.cam = new Camera3D(); this.cam.fov = 50; this.cam.far = 500; this.add_child(this.cam); this.cam.make_current();
    this.terrain = new MeshInstance3D(); this.terrain.material_override = this.matTerrain; this.add_child(this.terrain);
    this.borders = new MeshInstance3D(); this.borders.material_override = this.matBorders; this.borders.cast_shadow = SHADOWS_OFF; this.add_child(this.borders);
    this.pieces = new MeshInstance3D(); this.pieces.material_override = this.matPieces; this.add_child(this.pieces);
    this.labelRoot = new Node3D(); this.add_child(this.labelRoot);
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
    const t0 = Time.get_ticks_msec();
    this.terrain.mesh = toMesh(geo.buildTerrain(AU, this.g));
    console.log('[tiny-empires] map ' + this.g.W + 'x' + this.g.H + ' seed ' + seed + ', terrain mesh in ' + (Time.get_ticks_msec() - t0) + ' ms');
    Object.keys(this.labels).forEach(id => this.labels[id].queue_free()); this.labels = {};
    const cap = this.g.civs.map(c => c.capital).find(id => id !== undefined && id !== null && this.g.settlements[id]);
    const u = Object.keys(this.g.units).map(id => this.g.units[id]).find(x => x.civ === this.g.playerIdx);
    const focus = this.g.tiles[cap !== undefined ? this.g.settlements[cap].tile : (u ? u.tile : Math.floor(this.g.tiles.length / 2))];
    this.camTarget = geo.center(focus.col, focus.row); this.camDist = 16;
    this.updateCamera();
    this.refresh();
  }

  refresh() {
    const g = this.g;
    this.borders.mesh = toMesh(geo.buildBorders(AU, g));
    this.pieces.mesh = toMesh(geo.buildPieces(AU, g));
    const seen = {};
    Object.keys(g.settlements).forEach(id => {
      const st = g.settlements[id], t = g.tiles[st.tile], civ = g.civs[st.civ]; if (!t || !civ) return;
      let lb = this.labels[id];
      if (!lb) {
        lb = new Label3D(); lb.billboard = BILLBOARD_ENABLED; lb.no_depth_test = true; lb.font_size = 44; lb.outline_size = 12; lb.pixel_size = 0.007;
        this.labelRoot.add_child(lb); this.labels[id] = lb;
      }
      const c = geo.center(t.col, t.row), col = geo.rgb(civ.color || '#ffffff');
      lb.text = st.name + '  ' + st.pop + (st.isCapital ? '  (capital)' : '');
      lb.modulate = new Color(Math.min(1, col[0] * 0.5 + 0.55), Math.min(1, col[1] * 0.5 + 0.55), Math.min(1, col[2] * 0.5 + 0.55), 1);
      lb.position = new Vector3(c[0], geo.tileTop(t) + 1.0, c[1]);
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
  }
  pan(dxPixels, dyPixels) { // screen drag → move the map with the finger
    const k = this.camDist * 0.0016;
    this.camTarget = [this.camTarget[0] - dxPixels * k, this.camTarget[1] - dyPixels * k / Math.sin(PITCH)];
    this.clampCamera();
  }
  zoom(f) { this.camDist = Math.max(5, Math.min(70, this.camDist * f)); this.clampCamera(); }
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
    if (this.shot && this.frames === 30) {
      const path = ProjectSettings.globalize_path('user://shot.png');
      this.get_viewport().get_texture().get_image().save_png(path);
      console.log('[tiny-empires] screenshot saved to ' + path);
      this.get_tree().quit(0);
      return;
    }
    let mx = 0, mz = 0;
    PAN_KEYS.forEach(k => { if (Input.is_key_pressed(k[0])) { mx += k[1]; mz += k[2]; } });
    if (mx || mz) { const s = this.camDist * 0.9 * dt; this.camTarget = [this.camTarget[0] + mx * s, this.camTarget[1] + mz * s]; this.clampCamera(); }
    if (this.auto) { this.acc += dt; if (this.acc > 0.35) { this.acc = 0; this.endTurn(); } }
  }
}

exports.default = Main;
