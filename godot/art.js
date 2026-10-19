"use strict";
// KayKit art in Godot: loads the CC0 models (assets/kaykit), draws the map as instanced hex tiles and nature, settlements as
// buildings in the owner's colour, and units as animated chibi characters. kaykit.js decides what goes where.
// If the assets are missing or fail to load, main.js keeps the code-generated look instead (the game never waits on art).

const godot = require('godot');
const { Node3D, MultiMesh, MultiMeshInstance3D, ShaderMaterial, Shader, ResourceLoader, Color, Vector3, Transform3D } = godot;
const K = require('res://kaykit.js');
const shaders = require('res://shaders.js');

const HEX = 'res://assets/kaykit/hex/', CHARS = 'res://assets/kaykit/chars/';
const TRANSFORM_3D = 1, LOOP_LINEAR = 1, CHAR_SCALE = 0.32;
const MODE = { tile: 0, foliage: 1, team: 2 };
const FOLIAGE = /^trees_|^tree_single/, TEAM = /_blue$/;

function walk(n, fn) { fn(n); const k = n.get_child_count(); for (let i = 0; i < k; i++) walk(n.get_child(i), fn); }
function nameOf(n) { return String(n.name); }
function shaderMat(code) { const sh = new Shader(); sh.code = code; const m = new ShaderMaterial(); m.shader = sh; return m; }

class Art {
  constructor(root) {
    this.root = root; this.meshes = {}; this.scenes = {}; this.capeMats = {}; this.units = {}; this.staticNodes = []; this.townNodes = [];
    this.staticRoot = new Node3D(); this.townRoot = new Node3D(); this.unitRoot = new Node3D();
    root.add_child(this.staticRoot); root.add_child(this.townRoot); root.add_child(this.unitRoot);
  }

  // true when the core models and the atlas load
  load() {
    try {
      this.atlas = ResourceLoader.load(HEX + 'hexagons_medieval.png');
      this.mats = {};
      Object.keys(MODE).forEach(k => { const m = shaderMat(shaders.KAYKIT); m.set_shader_parameter('atlas', this.atlas); m.set_shader_parameter('mode', MODE[k]); this.mats[k] = m; });
      ['hex_grass', 'hex_water', 'hex_river_A', 'building_castle_blue'].forEach(m => { if (!this.mesh(m)) throw new Error('cannot load ' + m); });
      // a character that fails to load leaves its units as placeholders
      ['Knight', 'Rogue', 'Rogue_Hooded', 'Barbarian', 'Mage'].forEach(c => { this.scenes[c] = ResourceLoader.load(CHARS + c + '.gltf') || null; });
      return !!this.atlas;
    } catch (e) { console.log('[tiny-empires] KayKit art unavailable: ' + (e && e.message)); return false; }
  }

  mesh(name) {
    if (name in this.meshes) return this.meshes[name];
    let mesh = null;
    const ps = ResourceLoader.load(HEX + name + '.gltf');
    if (ps) { const inst = ps.instantiate(); walk(inst, n => { if (!mesh && n.is_class('MeshInstance3D')) mesh = n.mesh; }); inst.free(); }
    if (!mesh) console.log('[tiny-empires] missing model ' + name);
    return (this.meshes[name] = mesh);
  }

  // one MultiMesh per model; entries [x, y, z, yaw, scale, r, g, b, a]
  instanced(parent, lists) {
    const nodes = [];
    Object.keys(lists).forEach(name => {
      const list = lists[name], mesh = this.mesh(name); if (!mesh || !list.length) return;
      const mm = new MultiMesh(); mm.transform_format = TRANSFORM_3D; mm.use_custom_data = true; mm.mesh = mesh; mm.instance_count = list.length;
      list.forEach((e, i) => {
        const c = Math.cos(e[3]) * e[4], s = Math.sin(e[3]) * e[4];
        mm.set_instance_transform(i, new Transform3D(new Vector3(c, 0, -s), new Vector3(0, e[4], 0), new Vector3(s, 0, c), new Vector3(e[0], e[1], e[2])));
        mm.set_instance_custom_data(i, new Color(e[5], e[6], e[7], e[8]));
      });
      const node = new MultiMeshInstance3D(); node.multimesh = mm;
      node.material_override = TEAM.test(name) ? this.mats.team : FOLIAGE.test(name) ? this.mats.foliage : this.mats.tile;
      parent.add_child(node); nodes.push(node);
    });
    return nodes;
  }

  buildStatic(AU, g) {
    this.staticNodes.forEach(n => n.queue_free());
    const lists = K.buildStatic(AU, g);
    this.staticNodes = this.instanced(this.staticRoot, lists);
    this.staticKey = K.staticKey(g);
    return Object.keys(lists).reduce((s, k) => s + lists[k].length, 0);
  }

  // per turn: rebuild the map only when settlements or worked tiles changed, then towns and units
  refresh(AU, g) {
    if (K.staticKey(g) !== this.staticKey) this.buildStatic(AU, g);
    this.townNodes.forEach(n => n.queue_free());
    this.townNodes = this.instanced(this.townRoot, K.buildTowns(AU, g));
    this.syncUnits(AU, g);
  }

  capeMat(model, mi) {
    if (this.capeMats[model]) return this.capeMats[model];
    const src = mi.mesh && mi.mesh.surface_get_material(0), m = shaderMat(shaders.CAPE);
    if (src && src.albedo_texture) m.set_shader_parameter('tex', src.albedo_texture);
    return (this.capeMats[model] = m);
  }

  // one animated character per unit (reused while the unit lives); naval and air units stay placeholders
  syncUnits(AU, g) {
    const seen = {};
    K.unitSpots(AU, g).forEach(s => {
      if (!s.load || !this.scenes[s.load.model]) return;
      const key = s.load.model + ':' + s.load.gear.join(',');
      let u = this.units[s.id];
      if (u && u.key !== key) { u.node.queue_free(); u = null; }
      if (!u) u = this.units[s.id] = { key, node: this.character(s) };
      u.node.position = new Vector3(s.x, s.y, s.z);
      u.node.rotation = new Vector3(0, s.yaw, 0);
      const c = K.lin(s.color);
      walk(u.node, n => { if (n.is_class('MeshInstance3D') && /_Cape$/.test(nameOf(n))) n.set_instance_shader_parameter('team', new Color(c[0], c[1], c[2], 1)); });
      seen[s.id] = true;
    });
    Object.keys(this.units).forEach(id => { if (!seen[id]) { this.units[id].node.queue_free(); delete this.units[id]; } });
  }

  character(s) {
    const node = this.scenes[s.load.model].instantiate(), keep = new Set(s.load.gear), optional = new Set(K.GEAR[s.load.model] || []);
    node.scale = new Vector3(CHAR_SCALE, CHAR_SCALE, CHAR_SCALE);
    walk(node, n => {
      if (n.is_class('MeshInstance3D')) {
        const name = nameOf(n);
        if (optional.has(name) && !keep.has(name)) n.visible = false;
        if (/_Cape$/.test(name)) n.material_override = this.capeMat(s.load.model, n);
      }
      if (n.is_class('AnimationPlayer')) {
        const anim = n.has_animation(s.load.anim) ? s.load.anim : 'Idle';
        if (n.has_animation(anim)) { n.get_animation(anim).loop_mode = LOOP_LINEAR; n.play(anim); n.seek((s.id % 17) / 17 * 1.5, true); }
      }
    });
    this.unitRoot.add_child(node);
    return node;
  }

  clear() {
    this.staticNodes.concat(this.townNodes).forEach(n => n.queue_free()); this.staticNodes = []; this.townNodes = [];
    Object.keys(this.units).forEach(id => this.units[id].node.queue_free()); this.units = {}; this.staticKey = null;
  }
}

module.exports = { Art };
