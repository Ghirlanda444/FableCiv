// 3D map renderer (Three.js): low-poly hex world, procedural props, cities that show their buildings.
// Exposes the same interface as the 2D Renderer so the app controller does not care which one is active.
(function (AU) {
  var Hex = AU.Hex, G = AU.G, U = AU.U;
  var R = AU.HEX_R, SQ3 = Math.sqrt(3);
  var LAND_H = 7, HILL_H = 8, WATER_TOP = -2;
  var DUMMY = null, COLOR = null, VEC = null;

  function Renderer3D(canvas) {
    var T = window.THREE; DUMMY = new T.Object3D(); COLOR = new T.Color(); VEC = new T.Vector3();
    this.canvas = canvas;
    this.cam = { x: 0, y: 0, zoom: 1 };
    this.highlights = { reach: null, attack: null, expand: null, path: null, selTile: -1 };
    this.showGrid = true; this.is3D = true; this.maxZoom = 6; this.showYields = false; this.yieldNodes = {};
    this.three = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.three.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.three.shadowMap.enabled = true; this.three.shadowMap.type = T.PCFShadowMap;
    this.scene = new T.Scene(); this.scene.background = new T.Color(0x0a1424); this.scene.fog = new T.Fog(0x0a1424, 2600, 5200);
    this.camera = new T.PerspectiveCamera(42, 1, 5, 12000);
    this.hemi = new T.HemisphereLight(0xdbe8ff, 0x5a4a2a, 0.95); this.scene.add(this.hemi);
    this.sun = new T.DirectionalLight(0xffe9c4, 1.9); this.sun.position.set(300, 700, 250); this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024); this.sun.shadow.camera.near = 50; this.sun.shadow.camera.far = 3000; this.sun.shadow.bias = -0.0015;
    this.scene.add(this.sun); this.scene.add(this.sun.target);
    this.ground = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ visible: false })); this.ground.rotation.x = -Math.PI / 2; this.ground.position.y = LAND_H; this.scene.add(this.ground);
    this.raycaster = new T.Raycaster(); this.groundPlane = new T.Plane(new T.Vector3(0, 1, 0), -LAND_H);
    this.world = null; this.settlementNodes = {}; this.unitNodes = {}; this.textures = {}; this.hlGroup = new T.Group(); this.scene.add(this.hlGroup);
    this.geo = this.makeGeometries();
    this.mat = this.makeMaterials();
    this.w = 1; this.h = 1; this.dpr = 1;
  }
  var P = Renderer3D.prototype;
  P.makeGeometries = function () {
    var T = window.THREE, g = {};
    g.hex = new T.CylinderGeometry(R * 0.985, R * 0.985, 1, 6, 1, false); // unit height, scaled per instance
    g.hexTop = new T.CylinderGeometry(R * 0.985, R * 0.985, 1, 6, 1, false);
    g.dome = new T.SphereGeometry(R * 0.36, 12, 7, 0, Math.PI * 2, 0, Math.PI / 2);
    g.cone = new T.ConeGeometry(R * 0.55, R * 1.1, 6);
    g.snow = new T.ConeGeometry(R * 0.22, R * 0.42, 6);
    g.tree = new T.ConeGeometry(R * 0.16, R * 0.42, 5);
    g.trunk = new T.CylinderGeometry(R * 0.03, R * 0.04, R * 0.16, 4);
    g.bush = new T.IcosahedronGeometry(R * 0.17, 0);
    g.reed = new T.CylinderGeometry(R * 0.015, R * 0.02, R * 0.3, 3);
    g.disc = new T.CylinderGeometry(R * 0.3, R * 0.3, 1.2, 12);
    g.ring = new T.RingGeometry(R * 0.78, R * 0.94, 6); g.ring.rotateX(-Math.PI / 2); g.ring.rotateY(Math.PI / 6);
    g.border = new T.BoxGeometry(R, 2.2, 3.2);
    g.box = new T.BoxGeometry(1, 1, 1);
    g.roof = new T.ConeGeometry(0.8, 0.7, 4); g.roof.rotateY(Math.PI / 4);
    g.cyl = new T.CylinderGeometry(0.5, 0.5, 1, 10);
    g.sphere = new T.SphereGeometry(0.5, 10, 8);
    g.pyramid = new T.ConeGeometry(0.75, 1, 4); g.pyramid.rotateY(Math.PI / 4);
    g.pathDot = new T.SphereGeometry(R * 0.11, 8, 6);
    g.figure = new T.CapsuleGeometry(R * 0.11, R * 0.22, 3, 8);
    g.head = new T.SphereGeometry(R * 0.09, 8, 6);
    return g;
  };
  P.makeMaterials = function () {
    var T = window.THREE, m = {};
    m.land = new T.MeshLambertMaterial({ vertexColors: false });
    m.water = new T.MeshPhongMaterial({ transparent: true, opacity: 0.92, shininess: 60, specular: 0x8ac4ff });
    m.mountain = new T.MeshLambertMaterial({ color: 0x77716b });
    m.snow = new T.MeshLambertMaterial({ color: 0xf4f7fa });
    m.tree = new T.MeshLambertMaterial({ color: 0x2f7a36 });
    m.trunk = new T.MeshLambertMaterial({ color: 0x5a3b1e });
    m.bush = new T.MeshLambertMaterial({ color: 0x2e8b3d });
    m.reed = new T.MeshLambertMaterial({ color: 0x4e7d2a });
    m.river = new T.MeshLambertMaterial({ color: 0x48b0f0, emissive: 0x0b2d4d });
    m.reef = new T.MeshLambertMaterial({ color: 0xff8a5b }); m.rock = new T.MeshLambertMaterial({ color: 0x8a8378 }); m.mangrove = new T.MeshLambertMaterial({ color: 0x2f6a3a });
    m.border = new T.MeshBasicMaterial({});
    m.stone = new T.MeshLambertMaterial({ color: 0xd9d2c3 });
    m.wall = new T.MeshLambertMaterial({ color: 0x8f877a });
    m.roofRed = new T.MeshLambertMaterial({ color: 0x9c3b2e });
    m.roofBrown = new T.MeshLambertMaterial({ color: 0x6c4a2f });
    m.wood = new T.MeshLambertMaterial({ color: 0xb8926a });
    m.gold = new T.MeshLambertMaterial({ color: 0xe3b84a, emissive: 0x3a2a05 });
    m.marble = new T.MeshLambertMaterial({ color: 0xf1ede4 });
    m.dark = new T.MeshLambertMaterial({ color: 0x4a4a52 });
    m.camp = new T.MeshLambertMaterial({ color: 0x7a5a3a });
    m.hlReach = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, side: T.DoubleSide, depthWrite: false });
    m.hlAttack = new T.MeshBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.8, side: T.DoubleSide, depthWrite: false });
    m.hlExpand = new T.MeshBasicMaterial({ color: 0x7ed957, transparent: true, opacity: 0.8, side: T.DoubleSide, depthWrite: false });
    m.hlSel = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, side: T.DoubleSide, depthWrite: false });
    m.pathDot = new T.MeshBasicMaterial({ color: 0xffffff });
    return m;
  };

  // ---------- camera / coordinates (same contract as the 2D renderer) ----------
  P.resize = function () {
    var w = this.canvas.clientWidth || 1, h = this.canvas.clientHeight || 1;
    this.w = w; this.h = h; this.three.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  };
  P.updateCamera = function () {
    var z = this.cam.zoom, dist = (1.15 * this.h) / z;
    var pitch = z >= 1.2 ? 62 : z <= 0.5 ? 75 : 62 + (1.2 - z) * 18; // steeper when zoomed out, more oblique up close
    if (z > 1.6) pitch = Math.max(34, 62 - (z - 1.6) * 9);
    var pr = pitch * Math.PI / 180;
    this.camera.position.set(this.cam.x, dist * Math.sin(pr), this.cam.y + dist * Math.cos(pr));
    this.camera.lookAt(this.cam.x, LAND_H, this.cam.y);
    this.sun.target.position.set(this.cam.x, LAND_H, this.cam.y);
    this.sun.position.set(this.cam.x + 420, 520, this.cam.y + 300);
    var s = Math.max(500, dist * 1.2); var sc = this.sun.shadow.camera; sc.left = -s; sc.right = s; sc.top = s; sc.bottom = -s; sc.updateProjectionMatrix();
    this.ground.position.set(this.cam.x, LAND_H, this.cam.y); this.ground.scale.set(dist * 6, dist * 6, 1);
  };
  P.screenToWorld = function (sx, sy) {
    this.updateCamera(); this.camera.updateMatrixWorld();
    var ndc = new THREE.Vector2((sx / this.w) * 2 - 1, -(sy / this.h) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    var hit = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(this.groundPlane, hit)) { var far = this.raycaster.ray.at(3000, new THREE.Vector3()); return [far.x, far.z]; }
    return [hit.x, hit.z];
  };
  P.worldToScreen = function (wx, wy) {
    this.updateCamera(); this.camera.updateMatrixWorld();
    VEC.set(wx, LAND_H, wy).project(this.camera);
    return [(VEC.x + 1) / 2 * this.w, (1 - VEC.y) / 2 * this.h];
  };
  P.tileAtScreen = function (g, sx, sy) {
    var w = this.screenToWorld(sx, sy), o = Hex.fromPixel(w[0], w[1], R);
    if (o[0] < 0 || o[0] >= g.W || o[1] < 0 || o[1] >= g.H) return -1;
    return o[1] * g.W + o[0];
  };
  P.tileCenter = function (t) { return Hex.center(t.col, t.row, R); };
  P.centerOn = function (g, tileIdx) { var t = g.tiles[tileIdx], c = this.tileCenter(t); this.cam.x = c[0]; this.cam.y = c[1]; this.clampCamera(g); };
  P.clampCamera = function (g) {
    var maxX = R * SQ3 * (g.W + 0.5), maxY = R * 1.5 * g.H;
    this.cam.x = Math.max(0, Math.min(maxX, this.cam.x)); this.cam.y = Math.max(0, Math.min(maxY, this.cam.y));
    this.cam.zoom = Math.max(0.3, Math.min(this.maxZoom, this.cam.zoom));
  };

  // ---------- world construction: a continuous textured height field (no hex blocks) ----------
  function tileXZ(t) { return [R * SQ3 * (t.col + 0.5 * (t.row & 1)), R * 1.5 * t.row]; }
  function lcg(seed) { var s = (seed * 2654435761) >>> 0 || 1; return function () { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
  var PAL = { ocean: [0.10, 0.22, 0.34], coast: [0.42, 0.58, 0.52], lake: [0.36, 0.56, 0.55], grassland: [0.30, 0.60, 0.20], plains: [0.72, 0.62, 0.28], desert: [0.92, 0.80, 0.50], tundra: [0.50, 0.55, 0.40], snow: [0.92, 0.95, 0.97], mountain: [0.46, 0.43, 0.40] };
  var BASE_H = { ocean: -12, coast: -4.5, lake: -3.5, land: 6, hills: 16, mountain: 36 };
  var SAMPLE = 11; // height field spacing in world units (hex radius is 30)

  // Value noise for terrain detail
  function makeNoise(seed) {
    var size = 128, grid = new Float32Array(size * size), rnd = lcg(seed);
    for (var i = 0; i < grid.length; i++) grid[i] = rnd();
    function at(x, y) { var x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); function v(ix, iy) { return grid[((iy % size + size) % size) * size + ((ix % size + size) % size)]; } var a = v(x0, y0), b = v(x0 + 1, y0), c = v(x0, y0 + 1), d = v(x0 + 1, y0 + 1); return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy; }
    return function (x, y) { return (at(x, y) * 0.55 + at(x * 2.1, y * 2.1) * 0.28 + at(x * 4.3, y * 4.3) * 0.17) - 0.5; };
  }
  P.tileTop = function (t) { var p = tileXZ(t); return this.heightAt(p[0], p[1]); };
  // Blend of the nearest hexes: heights, colours and fog all use the same weights.
  P.hexWeights = function (g, x, z) {
    var o = Hex.fromPixel(x, z, R), col = Math.max(0, Math.min(g.W - 1, o[0])), row = Math.max(0, Math.min(g.H - 1, o[1]));
    var t = g.tiles[row * g.W + col], cands = [t.i].concat(Hex.neighborsOf(col, row, g.W, g.H)), list = [];
    for (var k = 0; k < cands.length; k++) { var tt = g.tiles[cands[k]], p = tileXZ(tt), d = Math.hypot(p[0] - x, p[1] - z); list.push([cands[k], d]); }
    list.sort(function (a, b) { return a[1] - b[1]; });
    var out = [], sum = 0;
    for (var m = 0; m < 3 && m < list.length; m++) { var w = 1 / Math.pow(list[m][1] + 6, 2.6); out.push([list[m][0], w]); sum += w; }
    for (var q = 0; q < out.length; q++) out[q][1] /= sum;
    return out;
  };
  P.baseHeight = function (t) { if (G.isWater(t)) return BASE_H[t.terrain]; if (t.navigable) return -3.4; if (t.terrain === 'mountain') return BASE_H.mountain; return t.hills ? BASE_H.hills : BASE_H.land; };
  P.heightAt = function (x, z) {
    var g = this.world && this.world.g; if (!g) return LAND_H;
    var ws = this.hexWeights(g, x, z), h = 0, amp = 0;
    for (var k = 0; k < ws.length; k++) { var t = g.tiles[ws[k][0]], w = ws[k][1]; h += this.baseHeight(t) * w; amp += (t.terrain === 'mountain' ? 14 : t.hills ? 4.5 : G.isWater(t) ? 0.8 : 1.4) * w; }
    var n = this.noise(x / 38, z / 38);
    if (h > 12) h += n * amp * 1.4 + Math.abs(this.noise(x / 9, z / 9)) * amp * 0.8; else h += n * amp;
    return h;
  };
  P.buildWorld = function (g) {
    var T = window.THREE, self = this;
    if (this.world) { this.scene.remove(this.world.group); this.world.group.traverse(function (o) { if (o.geometry && !self.isSharedGeo(o.geometry)) o.geometry.dispose(); }); }
    for (var sid in this.settlementNodes) this.scene.remove(this.settlementNodes[sid].group); this.settlementNodes = {};
    for (var uid in this.unitNodes) this.scene.remove(this.unitNodes[uid].group); this.unitNodes = {};
    this.noise = makeNoise(g.seed || 7);
    var group = new T.Group(); this.scene.add(group);
    this.world = { g: g, group: group, fogSig: '', borderSig: '', riverSig: -1, rivers: null, borders: null, camps: null, campSig: -1 };
    // --- height field
    var width = R * SQ3 * (g.W + 1), depth = R * 1.5 * (g.H + 1), nx = Math.ceil(width / SAMPLE) + 1, nz = Math.ceil(depth / SAMPLE) + 1;
    var geo = new T.PlaneGeometry(width, depth, nx - 1, nz - 1); geo.rotateX(-Math.PI / 2); geo.translate(width / 2 - R * SQ3 * 0.5, 0, depth / 2 - R * 0.75);
    var pos = geo.attributes.position, count = pos.count;
    var vHex = new Int32Array(count * 3), vW = new Float32Array(count * 3), vBase = new Float32Array(count * 3), colors = new Float32Array(count * 3);
    var heights = new Float32Array(count);
    for (var i = 0; i < count; i++) {
      var x = pos.getX(i), z = pos.getZ(i);
      var ws = this.hexWeights(g, x, z), h = 0, amp = 0, r = 0, gg = 0, b = 0;
      for (var k = 0; k < 3; k++) { var e = ws[k] || ws[0]; var t = g.tiles[e[0]], w = e[1]; vHex[i * 3 + k] = e[0]; vW[i * 3 + k] = w; h += this.baseHeight(t) * w; amp += (t.terrain === 'mountain' ? 14 : t.hills ? 4.5 : G.isWater(t) ? 0.8 : 1.4) * w; var c = PAL[t.terrain], v = 0.9 + (lcg(e[0] + 3)() * 0.2); r += c[0] * v * w; gg += c[1] * v * w; b += c[2] * v * w; }
      var n = this.noise(x / 38, z / 38);
      if (h > 12) h += n * amp * 1.4 + Math.abs(this.noise(x / 9, z / 9)) * amp * 0.8; else h += n * amp;
      heights[i] = h; pos.setY(i, h);
      // colour: seabed sand near the shore, dark deep water, rock and snow on peaks, a little grain everywhere
      var grain = 0.92 + (this.noise(x / 5, z / 5) + 0.5) * 0.16;
      if (h < 0) { var depthF = Math.min(1, -h / 12); r = (0.74 * (1 - depthF) + 0.10 * depthF) * grain; gg = (0.70 * (1 - depthF) + 0.22 * depthF) * grain; b = (0.52 * (1 - depthF) + 0.36 * depthF) * grain; if (h > -1.6) { var foam = 1 - (-h / 1.6); r = r * (1 - foam * 0.5) + 0.95 * foam * 0.5; gg = gg * (1 - foam * 0.5) + 0.97 * foam * 0.5; b = b * (1 - foam * 0.5) + 0.95 * foam * 0.5; } }
      else if (h < 3.2) { var sandF = Math.pow(1 - h / 3.2, 0.7) * 0.9, sr = 0.86, sg = 0.79, sb = 0.56; if (h < 0.9) { var wet = 1 - h / 0.9; sr -= 0.1 * wet; sg -= 0.08 * wet; sb -= 0.06 * wet; } r = (r * (1 - sandF) + sr * sandF) * grain; gg = (gg * (1 - sandF) + sg * sandF) * grain; b = (b * (1 - sandF) + sb * sandF) * grain; }
      else { if (h > 22) { var rock = Math.min(1, (h - 22) / 12); r = r * (1 - rock) + 0.46 * rock; gg = gg * (1 - rock) + 0.44 * rock; b = b * (1 - rock) + 0.42 * rock; } if (h > 36) { var snow = Math.min(1, (h - 36) / 8); r = r * (1 - snow) + 0.94 * snow; gg = gg * (1 - snow) + 0.95 * snow; b = b * (1 - snow) + 0.97 * snow; } r *= grain; gg *= grain; b *= grain; }
      vBase[i * 3] = r; vBase[i * 3 + 1] = gg; vBase[i * 3 + 2] = b;
    }
    geo.setAttribute('color', new T.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    var detail = this.detailTexture();
    var terrain = new T.Mesh(geo, new T.MeshLambertMaterial({ vertexColors: true, map: detail })); terrain.receiveShadow = true; terrain.castShadow = false;
    group.add(terrain);
    this.world.terrain = terrain; this.world.vHex = vHex; this.world.vW = vW; this.world.vBase = vBase; this.world.heights = heights;
    // --- water surface
    var water = new T.Mesh(new T.PlaneGeometry(width * 1.4, depth * 1.4), new T.MeshPhongMaterial({ color: 0x2f7fc4, transparent: true, opacity: 0.66, shininess: 90, specular: 0x9ad0ff }));
    water.rotation.x = -Math.PI / 2; water.position.set(width / 2 - R * SQ3 * 0.5, 0, depth / 2 - R * 0.75); water.receiveShadow = true; group.add(water); this.world.water = water;
    // --- hex grid overlay following the terrain
    var lines = [], corners, ci, a, bpt;
    for (var ti = 0; ti < g.tiles.length; ti++) {
      var tt2 = g.tiles[ti], p2 = tileXZ(tt2); corners = Hex.corners(p2[0], p2[1], R);
      for (ci = 0; ci < 3; ci++) { a = corners[ci]; bpt = corners[ci + 1]; for (var seg = 0; seg < 2; seg++) { var x1 = a[0] + (bpt[0] - a[0]) * seg / 2, z1 = a[1] + (bpt[1] - a[1]) * seg / 2, x2 = a[0] + (bpt[0] - a[0]) * (seg + 1) / 2, z2 = a[1] + (bpt[1] - a[1]) * (seg + 1) / 2; lines.push(x1, Math.max(0.3, this.heightAt(x1, z1)) + 0.35, z1, x2, Math.max(0.3, this.heightAt(x2, z2)) + 0.35, z2); } }
    }
    var lgeo = new T.BufferGeometry(); lgeo.setAttribute('position', new T.BufferAttribute(new Float32Array(lines), 3));
    var grid = new T.LineSegments(lgeo, new T.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.13 })); grid.visible = this.showGrid; group.add(grid); this.world.grid = grid; this.world.gridLines = lines;
    // --- forests and jungles as many small trees on the height field
    var treeList = [], bushList = [], reedList = [], palmList = [];
    for (var i2 = 0; i2 < g.tiles.length; i2++) {
      var t3 = g.tiles[i2]; if (!t3.feature) continue;
      var rnd = lcg(i2 + 3), p3 = tileXZ(t3), k2;
      if (t3.feature === 'forest') for (k2 = 0; k2 < 11; k2++) { var fx = p3[0] + (rnd() - 0.5) * R * 1.5, fz = p3[1] + (rnd() - 0.5) * R * 1.55; treeList.push([i2, fx, this.heightAt(fx, fz), fz, 0.7 + rnd() * 0.7]); }
      if (t3.feature === 'jungle') for (k2 = 0; k2 < 9; k2++) { var jx = p3[0] + (rnd() - 0.5) * R * 1.5, jz = p3[1] + (rnd() - 0.5) * R * 1.55; bushList.push([i2, jx, this.heightAt(jx, jz), jz, 0.9 + rnd() * 0.9]); }
      if (t3.feature === 'marsh') for (k2 = 0; k2 < 14; k2++) { var mx = p3[0] + (rnd() - 0.5) * R * 1.5, mz = p3[1] + (rnd() - 0.5) * R * 1.5; reedList.push([i2, mx, this.heightAt(mx, mz), mz, 1]); }
      if (t3.feature === 'oasis') for (k2 = 0; k2 < 4; k2++) { var ox = p3[0] + (rnd() - 0.5) * R * 0.9, oz = p3[1] + (rnd() - 0.5) * R * 0.9; palmList.push([i2, ox, this.heightAt(ox, oz), oz, 1 + rnd() * 0.4]); }
    }
    function inst(geoK, matK, list, fn) { var m = new T.InstancedMesh(self.geo[geoK], self.mat[matK], Math.max(1, list.length)); m.castShadow = true; list.forEach(function (e, k) { fn(e, k, m); }); if (!list.length) m.count = 0; m.instanceMatrix.needsUpdate = true; m.userData.base = m.instanceMatrix.array.slice(); group.add(m); return m; }
    function place(mesh, idx, x, y, z, sx, sy, sz, ry) { DUMMY.position.set(x, y, z); DUMMY.scale.set(sx, sy, sz); DUMMY.rotation.set(0, ry || 0, 0); DUMMY.updateMatrix(); mesh.setMatrixAt(idx, DUMMY.matrix); }
    this.world.trees = inst('tree', 'tree', treeList, function (e, k, m) { place(m, k, e[1], e[2] + R * 0.12 + R * 0.21 * e[4], e[3], e[4], e[4], e[4], k); });
    this.world.trunks = inst('trunk', 'trunk', treeList, function (e, k, m) { place(m, k, e[1], e[2] + R * 0.07, e[3], 1, 1, 1); });
    this.world.bushes = inst('bush', 'bush', bushList, function (e, k, m) { place(m, k, e[1], e[2] + R * 0.13 * e[4], e[3], e[4], e[4] * 0.8, e[4], k); });
    this.world.reeds = inst('reed', 'reed', reedList, function (e, k, m) { place(m, k, e[1], e[2] + R * 0.14, e[3], 1, 1, 1); });
    this.world.palms = inst('tree', 'bush', palmList, function (e, k, m) { place(m, k, e[1], e[2] + R * 0.25 * e[4], e[3], e[4] * 1.2, e[4] * 0.5, e[4] * 1.2, k); });
    this.world.treeList = treeList; this.world.bushList = bushList; this.world.reedList = reedList; this.world.palmList = palmList;
    // shorelines: coral reefs just under the surface, rocks and mangroves at the water's edge
    var reefList = [], rockList = [], mangList = [], EDGE_ANG3 = [0, -Math.PI / 3, -2 * Math.PI / 3, Math.PI, 2 * Math.PI / 3, Math.PI / 3];
    var DIRS_E3 = [[1, 0], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1]], DIRS_O3 = [[1, 0], [1, -1], [0, -1], [-1, 0], [0, 1], [1, 1]];
    for (var i4 = 0; i4 < g.tiles.length; i4++) {
      var t4 = g.tiles[i4]; if (!t4.shore) continue;
      var rnd4 = lcg(i4 + 41), p4 = tileXZ(t4), k4;
      if (t4.shore === 'reef') { for (k4 = 0; k4 < 8; k4++) { var rx = p4[0] + (rnd4() - 0.5) * R * 1.1, rz2 = p4[1] + (rnd4() - 0.5) * R * 1.1; reefList.push([i4, rx, -1.4 + rnd4() * 1.2, rz2, 0.35 + rnd4() * 0.45, k4]); } continue; }
      if (t4.shore !== 'rocks' && t4.shore !== 'cliff' && t4.shore !== 'mangrove') continue;
      for (var e4 = 0; e4 < 6; e4++) {
        var d4 = (t4.row & 1) ? DIRS_O3[e4] : DIRS_E3[e4], nc4 = t4.col + d4[0], nr4 = t4.row + d4[1]; if (nc4 < 0 || nc4 >= g.W || nr4 < 0 || nr4 >= g.H) continue;
        if (!G.isWater(g.tiles[nr4 * g.W + nc4])) continue;
        for (k4 = 0; k4 < 3; k4++) { var a4 = EDGE_ANG3[e4] + (rnd4() - 0.5) * 0.7, dd4 = R * (0.62 + rnd4() * 0.3), sx4 = p4[0] + Math.cos(a4) * dd4, sz4 = p4[1] + Math.sin(a4) * dd4; var hy = this.heightAt(sx4, sz4); if (t4.shore === 'mangrove') mangList.push([i4, sx4, Math.max(-0.5, hy), sz4, 0.7 + rnd4() * 0.6]); else rockList.push([i4, sx4, Math.max(-0.6, hy) - 0.5, sz4, (t4.shore === 'cliff' ? 0.9 : 0.5) + rnd4() * 0.5]); }
      }
    }
    this.world.reefs = inst('bush', 'reef', reefList, function (e, k, m) { place(m, k, e[1], e[2], e[3], e[4], e[4] * 0.6, e[4], k); });
    this.world.rocks = inst('bush', 'rock', rockList, function (e, k, m) { place(m, k, e[1], e[2] + R * 0.06 * e[4], e[3], e[4] * 1.3, e[4] * 0.8, e[4], k * 0.7); });
    this.world.mangroves = inst('bush', 'mangrove', mangList, function (e, k, m) { place(m, k, e[1], e[2] + R * 0.12 * e[4], e[3], e[4], e[4] * 0.7, e[4], k); });
    this.world.reefList = reefList; this.world.rockList = rockList; this.world.mangList = mangList;
    // natural wonders: one landmark mesh + a label, per style
    var natGroup = new T.Group(); group.add(natGroup); var self2 = this;
    g.tiles.forEach(function (t) {
      if (!t.natural) return;
      var NW = AU.NATURAL_WONDERS[t.natural], p = tileXZ(t), top = self2.tileTop(t), grp2 = new T.Group(); grp2.position.set(p[0], Math.max(0, top), p[1]);
      function add(geo2, mat, x, y, z, sx, sy, sz) { var m = new T.Mesh(geo2, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = true; grp2.add(m); return m; }
      switch (NW.style) {
        case 'peak': add(self2.geo.cone, self2.mat.mountain, 0, R * 0.6, 0, 1.3, 1.6, 1.3); add(self2.geo.snow, self2.mat.snow, 0, R * 1.15, 0, 1.4, 1.4, 1.4); break;
        case 'volcano': add(self2.geo.cone, new T.MeshLambertMaterial({ color: 0x4a3a34 }), 0, R * 0.5, 0, 1.3, 1.4, 1.3); add(self2.geo.snow, new T.MeshLambertMaterial({ color: 0xff5a2a, emissive: 0x7a1a00 }), 0, R * 1.0, 0, 1.0, 0.8, 1.0); break;
        case 'monolith': add(self2.geo.box, new T.MeshLambertMaterial({ color: 0xb5452b }), 0, R * 0.22, 0, R * 1.1, R * 0.44, R * 0.55); break;
        case 'lake': add(self2.geo.disc, new T.MeshPhongMaterial({ color: 0x2f9be0, shininess: 90 }), 0, 1.2, 0, 2.6, 1, 2.6); add(self2.geo.dome, self2.mat.mountain, R * 0.6, 0, R * 0.3, 1.2, 1.4, 1.2); add(self2.geo.dome, self2.mat.mountain, -R * 0.6, 0, -R * 0.2, 1.1, 1.2, 1.1); break;
        case 'cliffs': for (var k = 0; k < 4; k++) add(self2.geo.box, new T.MeshLambertMaterial({ color: k % 2 ? 0xe9e2d0 : 0xd6c9a8 }), (k - 1.5) * R * 0.4, R * (0.2 + k * 0.08), 0, R * 0.38, R * (0.4 + k * 0.16), R * 0.6); break;
        case 'reef': for (var q = 0; q < 6; q++) { var a2 = q * Math.PI / 3; add(self2.geo.bush, new T.MeshLambertMaterial({ color: q % 2 ? 0x2ee6c8 : 0xff8a5b }), Math.cos(a2) * R * 0.5, 2, Math.sin(a2) * R * 0.5, 0.9, 0.5, 0.9); } break;
        case 'wetland': for (var w2 = 0; w2 < 5; w2++) add(self2.geo.disc, new T.MeshPhongMaterial({ color: 0x3b8fd0 }), (w2 % 3 - 1) * R * 0.45, 1.2, (w2 % 2 - 0.5) * R * 0.6, 1.1, 1, 1.1); for (var r2 = 0; r2 < 10; r2++) add(self2.geo.reed, self2.mat.reed, (Math.random() - 0.5) * R * 1.3, R * 0.15, (Math.random() - 0.5) * R * 1.3, 1, 1, 1); break;
      }
      var label = self2.textSprite(NW.icon + ' ' + NW.name, '#e3b84a', null); label.position.set(0, R * 1.9, 0); grp2.add(label); grp2.userData.label = label;
      natGroup.add(grp2); grp2.userData.tile = t.i;
    });
    this.applyFog(g, true);
  };
  P.isSharedGeo = function (geo) { for (var k in this.geo) if (this.geo[k] === geo) return true; return false; };
  P.detailTexture = function () {
    if (this._detail) return this._detail;
    var T = window.THREE, cv = document.createElement('canvas'), n = 256; cv.width = cv.height = n;
    var ctx = cv.getContext('2d'), img = ctx.createImageData(n, n), noise = makeNoise(99);
    for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) { var v = 222 + (noise(x / 9, y / 9) * 70) + (noise(x / 3, y / 3) * 34); var i = (y * n + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.max(140, Math.min(255, v)); img.data[i + 3] = 255; }
    ctx.putImageData(img, 0, 0);
    var tex = new T.CanvasTexture(cv); tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.repeat.set(70, 45); tex.colorSpace = T.SRGBColorSpace;
    this._detail = tex; return tex;
  };
  // Fog of war: unexplored terrain fades to the sky colour, remembered terrain is dimmed. Vertex colours carry it.
  P.applyFog = function (g, force) {
    var w = this.world, player = G.player(g), explored = player.explored, visible = player.visible || explored;
    var sig = 0; for (var i = 0; i < explored.length; i++) sig += explored[i] + (visible[i] ? 2 : 0) * (i % 7 + 1);
    if (!force && sig === w.fogSig) return; w.fogSig = sig;
    var col = w.terrain.geometry.attributes.color, arr = col.array, vHex = w.vHex, vW = w.vW, vBase = w.vBase, n = col.count;
    var bg = [0.04, 0.06, 0.1];
    for (var v = 0; v < n; v++) {
      var fog = 0;
      for (var k = 0; k < 3; k++) { var ti = vHex[v * 3 + k]; fog += (explored[ti] ? (visible[ti] ? 1 : 0.52) : 0) * vW[v * 3 + k]; }
      arr[v * 3] = vBase[v * 3] * fog + bg[0] * (1 - fog); arr[v * 3 + 1] = vBase[v * 3 + 1] * fog + bg[1] * (1 - fog); arr[v * 3 + 2] = vBase[v * 3 + 2] * fog + bg[2] * (1 - fog);
    }
    col.needsUpdate = true;
    function tintInst(mesh, list, base, alt) {
      if (!mesh || !list.length) return;
      var m = mesh.instanceMatrix.array, baseArr = mesh.userData.base;
      list.forEach(function (e, idx) { var ti = e[0], ex = explored[ti], vis = visible[ti]; COLOR.setHex(idx % 3 === 0 ? alt : base); if (!vis) COLOR.multiplyScalar(0.55); mesh.setColorAt(idx, COLOR); var o = idx * 16; if (!ex) { for (var q = 0; q < 16; q++) m[o + q] = 0; } else { for (var q2 = 0; q2 < 16; q2++) m[o + q2] = baseArr[o + q2]; } });
      mesh.instanceColor.needsUpdate = true; mesh.instanceMatrix.needsUpdate = true;
    }
    tintInst(w.trees, w.treeList, 0x2f7a36, 0x1f5e2c); tintInst(w.trunks, w.treeList, 0x5a3b1e, 0x4a2e14); tintInst(w.bushes, w.bushList, 0x3aa04a, 0x1f6b2e); tintInst(w.reeds, w.reedList, 0x4e7d2a, 0x6a9a3a); tintInst(w.palms, w.palmList, 0x2e8b3d, 0x2e8b3d);
    tintInst(w.reefs, w.reefList, 0xff8a5b, 0x2ee6c8); tintInst(w.rocks, w.rockList, 0x8a8378, 0x6e6860); tintInst(w.mangroves, w.mangList, 0x2f6a3a, 0x3d8a4a);
    this.rebuildRivers(g);
  };
  P.rebuildRivers = function (g) {
    var T = window.THREE, w = this.world, explored = G.player(g).explored, self = this;
    var cnt = 0; for (var i = 0; i < explored.length; i++) cnt += explored[i];
    if (w.riverSig === cnt) return; w.riverSig = cnt;
    if (w.rivers) { w.rivers.children.forEach(function (c) { c.geometry.dispose(); }); w.group.remove(w.rivers); }
    var grp = new T.Group(); w.rivers = grp; w.group.add(grp);
    (g.rivers || []).forEach(function (path) {
      var pts = [];
      for (var k = 0; k < path.length; k++) {
        var t = g.tiles[path[k]]; if (!t) break;
        if (!explored[t.i] || (t.navigable && k > 0)) { if (pts.length >= 2 + (t.navigable ? -1 : 0)) { if (t.navigable && explored[t.i]) { var pn = tileXZ(t); pts.push(new T.Vector3(pn[0], 0.6, pn[1])); } if (pts.length >= 2) addTube(pts); } pts = []; if (t.navigable) break; continue; }
        var p = tileXZ(t);
        if (pts.length) { var prev = pts[pts.length - 1]; var mx = (prev.x + p[0]) / 2, mz = (prev.z + p[1]) / 2; pts.push(new T.Vector3(mx, Math.max(-1, self.heightAt(mx, mz)) + 0.9, mz)); }
        pts.push(new T.Vector3(p[0], Math.max(-1, self.heightAt(p[0], p[1])) + 0.9, p[1]));
      }
      if (pts.length >= 2) addTube(pts);
    });
    function addTube(pts) { var curve = new T.CatmullRomCurve3(pts, false, 'catmullrom', 0.5); var geo = new T.TubeGeometry(curve, Math.max(10, pts.length * 6), R * 0.075, 5, false); grp.add(new T.Mesh(geo, self.mat.river)); }
  };
  P.rebuildBorders = function (g) {
    var T = window.THREE, w = this.world, sig = 0, explored = G.player(g).explored, self = this;
    for (var i = 0; i < g.tiles.length; i++) { var o = g.tiles[i].owner; if (o >= 0) sig = (sig * 31 + o + (g.settlements[o] ? g.settlements[o].civ * 7 : 0) + (g.tiles[i].worked ? 3 : 0)) % 1000000007; }
    sig = sig * 13 + w.riverSig;
    if (sig === w.borderSig) return; w.borderSig = sig;
    if (w.borders) { w.borders.geometry.dispose(); w.group.remove(w.borders); }
    var dirs = { even: [[1, 0], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1]], odd: [[1, 0], [1, -1], [0, -1], [-1, 0], [0, 1], [1, 1]] };
    var dirCorner = [[0, 1], [5, 0], [4, 5], [3, 4], [2, 3], [1, 2]];
    var positions = [], colors = [];
    for (var ti = 0; ti < g.tiles.length; ti++) {
      var t = g.tiles[ti]; if (t.owner < 0 || !explored[ti]) continue;
      var s = g.settlements[t.owner]; if (!s) continue;
      var civ = g.civs[s.civ], p = tileXZ(t), corners = Hex.corners(p[0], p[1], R * 0.9), dd = (t.row & 1) ? dirs.odd : dirs.even, cc = new T.Color(G.civColor(civ));
      for (var e = 0; e < 6; e++) {
        var nc = t.col + dd[e][0], nr = t.row + dd[e][1], same = false;
        if (nc >= 0 && nc < g.W && nr >= 0 && nr < g.H) { var nt = g.tiles[nr * g.W + nc]; same = nt.owner >= 0 && g.settlements[nt.owner] && g.settlements[nt.owner].civ === s.civ; }
        if (same) continue;
        var a = corners[dirCorner[e][0]], b = corners[dirCorner[e][1]];
        // a ribbon: a thin quad along the edge, 2.4 units wide, lifted over the terrain
        var dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz), nxv = -dz / len * 1.6, nzv = dx / len * 1.6;
        var steps = 3;
        for (var st = 0; st < steps; st++) {
          var x1 = a[0] + dx * st / steps, z1 = a[1] + dz * st / steps, x2 = a[0] + dx * (st + 1) / steps, z2 = a[1] + dz * (st + 1) / steps;
          var y1 = Math.max(0.2, self.heightAt(x1, z1)) + 0.9, y2 = Math.max(0.2, self.heightAt(x2, z2)) + 0.9;
          positions.push(x1 - nxv, y1, z1 - nzv, x1 + nxv, y1, z1 + nzv, x2 + nxv, y2, z2 + nzv, x1 - nxv, y1, z1 - nzv, x2 + nxv, y2, z2 + nzv, x2 - nxv, y2, z2 - nzv);
          for (var q = 0; q < 6; q++) colors.push(cc.r, cc.g, cc.b);
        }
      }
    }
    var bgeo = new T.BufferGeometry(); bgeo.setAttribute('position', new T.BufferAttribute(new Float32Array(positions), 3)); bgeo.setAttribute('color', new T.BufferAttribute(new Float32Array(colors), 3));
    var mesh = new T.Mesh(bgeo, new T.MeshBasicMaterial({ vertexColors: true, side: T.DoubleSide, transparent: true, opacity: 0.9 }));
    w.borders = mesh; w.group.add(mesh);
  };
  P.rebuildCamps = function (g) {
    var T = window.THREE, w = this.world, sig = g.camps.length * 1000 + w.riverSig;
    if (sig === w.campSig) return; w.campSig = sig;
    if (w.camps) w.group.remove(w.camps);
    var grp = new T.Group(), self = this, explored = G.player(g).explored;
    g.camps.forEach(function (c) {
      var t = g.tiles[c.tile]; if (!explored[t.i]) return; var p = tileXZ(t), top = self.tileTop(t);
      for (var k = 0; k < 3; k++) { var m = new T.Mesh(self.geo.pyramid, self.mat.camp); m.position.set(p[0] + (k - 1) * R * 0.35, top + R * 0.16, p[1] + (k % 2) * R * 0.25); m.scale.set(R * 0.34, R * 0.32, R * 0.34); m.castShadow = true; grp.add(m); }
      var fire = new T.Mesh(self.geo.sphere, self.mat.gold); fire.position.set(p[0], top + R * 0.06, p[1] - R * 0.25); fire.scale.set(R * 0.14, R * 0.12, R * 0.14); grp.add(fire);
    });
    w.camps = grp; w.group.add(grp);
  };

  // ---------- settlements: every building is a model in a slot ----------
  var SHAPES = {
    monument: ['obelisk', 'marble'], granary: ['barn', 'wood'], shrine: ['dome', 'marble'], walls: ['ring', 'wall'], library: ['columns', 'marble'], barracks: ['tower', 'wall'],
    water_mill: ['wheel', 'wood'], market: ['stalls', 'wood'], lighthouse: ['tower', 'marble'], amphitheater: ['arena', 'stone'], aqueduct: ['arches', 'stone'], university: ['columns', 'stone'],
    workshop: ['factory', 'wood'], harbor: ['stalls', 'wood'], castle: ['keep', 'wall'], bank: ['columns', 'marble'], museum: ['dome', 'stone'], printing_house: ['barn', 'stone'],
    factory: ['factory', 'dark'], hospital: ['barn', 'marble'], stock_exchange: ['tower', 'marble'], military_academy: ['keep', 'stone'], research_lab: ['dome', 'dark'], power_plant: ['factory', 'dark'],
    broadcast_tower: ['spire', 'dark'], stadium: ['arena', 'marble'], airport: ['barn', 'dark'], computer_center: ['tower', 'dark'], palace: ['palace', 'gold']
  };
  P.buildingMesh = function (id, isWonder, culture) {
    var T = window.THREE, geo = this.geo, mat = this.mat, grp = new T.Group();
    var art = isWonder ? AU.Assets.texture(AU.NATIONAL[id] ? 'national' : 'wonders', id) : AU.Assets.textureFor('buildings', id, culture);
    if (art) { var img = art.image, aspect = img.width / img.height, bh = R * (isWonder ? 0.8 : 0.55); var pic = new T.Sprite(new T.SpriteMaterial({ map: art, transparent: true, alphaTest: 0.1 })); pic.scale.set(bh * aspect, bh, 1); pic.position.y = bh / 2; grp.add(pic); grp.userData.isSprite = true; return grp; }
    var def = SHAPES[id] || (isWonder ? ['wonder', 'gold'] : ['barn', 'stone']);
    var shape = def[0], m = mat[def[1]] || mat.stone, s = R * (isWonder ? 0.42 : 0.26);
    function add(g2, mm, x, y, z, sx, sy, sz) { var mesh = new T.Mesh(g2, mm); mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz); mesh.castShadow = true; mesh.receiveShadow = true; grp.add(mesh); return mesh; }
    switch (shape) {
      case 'obelisk': add(geo.box, m, 0, s * 0.9, 0, s * 0.25, s * 1.8, s * 0.25); add(geo.pyramid, mat.gold, 0, s * 1.95, 0, s * 0.25, s * 0.3, s * 0.25); break;
      case 'barn': add(geo.box, m, 0, s * 0.35, 0, s, s * 0.7, s * 0.8); add(geo.roof, mat.roofRed, 0, s * 0.95, 0, s * 0.85, s * 0.6, s * 0.7); break;
      case 'dome': add(geo.box, m, 0, s * 0.3, 0, s * 0.9, s * 0.6, s * 0.9); add(geo.sphere, mat.gold, 0, s * 0.75, 0, s * 0.8, s * 0.7, s * 0.8); break;
      case 'columns': add(geo.box, m, 0, s * 0.08, 0, s * 1.1, s * 0.16, s * 0.9); for (var i = 0; i < 4; i++) add(geo.cyl, m, -s * 0.4 + i * s * 0.27, s * 0.5, s * 0.3, s * 0.12, s * 0.7, s * 0.12); add(geo.box, m, 0, s * 0.92, 0, s * 1.1, s * 0.14, s * 0.9); add(geo.roof, mat.roofBrown, 0, s * 1.2, 0, s * 0.9, s * 0.45, s * 0.75); break;
      case 'tower': add(geo.cyl, m, 0, s * 0.8, 0, s * 0.5, s * 1.6, s * 0.5); add(geo.roof, mat.roofRed, 0, s * 1.85, 0, s * 0.55, s * 0.5, s * 0.55); break;
      case 'spire': add(geo.cyl, m, 0, s * 1.0, 0, s * 0.18, s * 2.0, s * 0.18); add(geo.sphere, mat.gold, 0, s * 2.05, 0, s * 0.18, s * 0.18, s * 0.18); break;
      case 'stalls': for (var k = 0; k < 3; k++) { add(geo.box, m, (k - 1) * s * 0.42, s * 0.2, 0, s * 0.35, s * 0.4, s * 0.5); add(geo.box, k % 2 ? mat.roofRed : mat.gold, (k - 1) * s * 0.42, s * 0.45, 0, s * 0.42, s * 0.08, s * 0.6); } break;
      case 'arena': add(geo.cyl, m, 0, s * 0.3, 0, s * 1.1, s * 0.6, s * 0.9); add(geo.cyl, mat.dark, 0, s * 0.62, 0, s * 0.75, s * 0.1, s * 0.6); break;
      case 'arches': for (var a = 0; a < 3; a++) add(geo.box, m, (a - 1) * s * 0.4, s * 0.45, 0, s * 0.14, s * 0.9, s * 0.3); add(geo.box, m, 0, s * 0.95, 0, s * 1.3, s * 0.14, s * 0.3); break;
      case 'wheel': add(geo.box, m, 0, s * 0.3, 0, s * 0.8, s * 0.6, s * 0.7); add(geo.cyl, mat.dark, s * 0.5, s * 0.35, 0, s * 0.45, s * 0.1, s * 0.45).rotation.z = Math.PI / 2; break;
      case 'factory': add(geo.box, m, 0, s * 0.35, 0, s * 1.1, s * 0.7, s * 0.8); add(geo.cyl, mat.dark, s * 0.35, s * 1.0, -s * 0.2, s * 0.14, s * 1.2, s * 0.14); break;
      case 'keep': add(geo.box, m, 0, s * 0.5, 0, s * 0.9, s * 1.0, s * 0.9); for (var c2 = 0; c2 < 4; c2++) add(geo.cyl, m, (c2 % 2 ? 1 : -1) * s * 0.45, s * 0.7, (c2 < 2 ? 1 : -1) * s * 0.45, s * 0.22, s * 1.4, s * 0.22); break;
      case 'palace': add(geo.box, mat.marble, 0, s * 0.4, 0, s * 1.3, s * 0.8, s * 1.0); add(geo.roof, mat.gold, 0, s * 1.05, 0, s * 1.1, s * 0.5, s * 0.9); add(geo.cyl, mat.marble, 0, s * 1.45, 0, s * 0.2, s * 0.5, s * 0.2); add(geo.sphere, mat.gold, 0, s * 1.75, 0, s * 0.22, s * 0.22, s * 0.22); break;
      case 'ring': break;
      default: // wonder: a grand stepped monument
        add(geo.box, mat.marble, 0, s * 0.2, 0, s * 1.4, s * 0.4, s * 1.4); add(geo.box, mat.marble, 0, s * 0.55, 0, s * 1.0, s * 0.3, s * 1.0); add(geo.pyramid, mat.gold, 0, s * 1.15, 0, s * 0.9, s * 0.9, s * 0.9);
    }
    return grp;
  };
  P.settlementSig = function (s, g) { var artN = 0; s.buildings.forEach(function (b) { if (AU.Assets.usable3D(AU.WONDERS[b] ? 'wonders' : AU.NATIONAL[b] ? 'national' : 'buildings', b)) artN++; }); return artN + '|' + s.pop + '|' + (s.isCity ? 1 : 0) + '|' + (s.isCapital ? 1 : 0) + '|' + s.civ + '|' + s.buildings.join(',') + '|' + (s.hp < G.settlementMaxHp(g, s) ? Math.round(s.hp / 10) : 'f') + '|' + s.name; };
  P.buildSettlement = function (g, s) {
    var T = window.THREE, geo = this.geo, mat = this.mat, self = this;
    var t = g.tiles[s.tile], p = tileXZ(t), top = t.navigable ? Math.max(this.tileTop(t), 1.2) : this.tileTop(t), civ = g.civs[s.civ], color = G.civColor(civ);
    var grp = new T.Group(); grp.position.set(p[0], top, p[1]);
    var civMat = new T.MeshLambertMaterial({ color: color });
    // plaza
    var plaza = new T.Mesh(geo.disc, s.isCity ? mat.stone : mat.wood); plaza.scale.set(2.9, 1, 2.9); plaza.position.y = 0.6; plaza.receiveShadow = true; grp.add(plaza);
    // buildings in slots: ring 1 (6) then ring 2 (12)
    var slots = [];
    for (var k = 0; k < 6; k++) { var a = k * Math.PI / 3 + Math.PI / 6; slots.push([Math.cos(a) * R * 0.42, Math.sin(a) * R * 0.42, a]); }
    for (var k2 = 0; k2 < 12; k2++) { var a2 = k2 * Math.PI / 6; slots.push([Math.cos(a2) * R * 0.74, Math.sin(a2) * R * 0.74, a2]); }
    var slot = 0, wonders = [];
    // town hall / palace at the centre
    var cul = AU.cultureOf(g.civs[s.civ]);
    if (s.isCapital) { var pal = this.buildingMesh('palace', false, cul); pal.position.y = 1; grp.add(pal); }
    else if (s.isCity) { var hall = new T.Group(); var hb = new T.Mesh(geo.box, mat.marble); hb.scale.set(R * 0.36, R * 0.24, R * 0.3); hb.position.y = R * 0.12 + 1; hb.castShadow = true; hall.add(hb); var hr = new T.Mesh(geo.roof, civMat); hr.scale.set(R * 0.34, R * 0.16, R * 0.28); hr.position.y = R * 0.32 + 1; hall.add(hr); grp.add(hall); }
    else { var hut = new T.Mesh(geo.roof, mat.roofBrown); hut.scale.set(R * 0.22, R * 0.2, R * 0.22); hut.position.y = R * 0.1 + 1; hut.castShadow = true; grp.add(hut); }
    s.buildings.forEach(function (b) {
      if (b === 'palace') return;
      if (AU.WONDERS[b]) { wonders.push(b); return; }
      if (b === 'walls' || b === 'castle') return;
      if (slot >= slots.length) return;
      var mesh = self.buildingMesh(b, false, cul), sl = slots[slot++];
      mesh.position.set(sl[0], 1, sl[1]); mesh.rotation.y = -sl[2] + Math.PI / 2; grp.add(mesh);
    });
    // population houses fill the remaining slots
    var houses = Math.min(slots.length - slot, Math.max(0, Math.floor(s.pop / 2)));
    var rnd = lcg(s.id + 17);
    for (var h = 0; h < houses; h++) { var sl2 = slots[slot++]; var hs = R * (0.14 + rnd() * 0.06); var hb2 = new T.Mesh(geo.box, h % 2 ? mat.stone : mat.wood); hb2.scale.set(hs, hs * 0.8, hs); hb2.position.set(sl2[0], hs * 0.4 + 1, sl2[1]); hb2.castShadow = true; grp.add(hb2); var hr2 = new T.Mesh(geo.roof, h % 3 ? mat.roofRed : mat.roofBrown); hr2.scale.set(hs * 0.95, hs * 0.55, hs * 0.95); hr2.position.set(sl2[0], hs * 0.8 + hs * 0.27 + 1, sl2[1]); hr2.rotation.y = rnd() * Math.PI; grp.add(hr2); }
    // wonders get the outer arc
    wonders.forEach(function (wid, i) { var wm = self.buildingMesh(wid, true); var a3 = Math.PI * 1.5 + (i - (wonders.length - 1) / 2) * 0.9; wm.position.set(Math.cos(a3) * R * 0.62, 1, Math.sin(a3) * R * 0.62); wm.rotation.y = -a3 + Math.PI / 2; grp.add(wm); });
    // walls ring
    if (G.hasBuilding(s, 'walls') || G.hasBuilding(s, 'castle')) {
      for (var e = 0; e < 6; e++) { var wa = e * Math.PI / 3, wm2 = new T.Mesh(geo.box, mat.wall); wm2.position.set(Math.cos(wa + Math.PI / 6) * R * 0.86, R * 0.07 + 1, Math.sin(wa + Math.PI / 6) * R * 0.86); wm2.scale.set(R * 0.86, R * 0.14, 2.5); wm2.rotation.y = -(wa + Math.PI / 6) + Math.PI / 2; wm2.castShadow = true; grp.add(wm2); var tw = new T.Mesh(geo.cyl, mat.wall); tw.position.set(Math.cos(wa) * R * 0.86, R * 0.11 + 1, Math.sin(wa) * R * 0.86); tw.scale.set(R * 0.09, R * (G.hasBuilding(s, 'castle') ? 0.3 : 0.22), R * 0.09); grp.add(tw); }
    }
    // banner
    var banner = this.textSprite((s.isCapital ? '★ ' : '') + s.name + '  ' + s.pop, color, s.hp < G.settlementMaxHp(g, s) ? s.hp / G.settlementMaxHp(g, s) : null);
    banner.position.set(0, R * 0.95, R * 0.35); grp.add(banner);
    this.scene.add(grp);
    return { group: grp, sig: this.settlementSig(s, g), banner: banner };
  };
  P.textSprite = function (text, color, hpFrac) {
    var T = window.THREE, cv = document.createElement('canvas'), fs = 30;
    var ctx = cv.getContext('2d'); ctx.font = 'bold ' + fs + 'px system-ui, sans-serif';
    var tw = Math.ceil(ctx.measureText(text).width) + fs * 1.8, th = fs * 1.5 + (hpFrac !== null && hpFrac !== undefined ? 10 : 0);
    cv.width = tw; cv.height = th; ctx = cv.getContext('2d');
    ctx.fillStyle = 'rgba(10,12,18,0.85)'; roundRect(ctx, 0, 0, tw, fs * 1.4, fs * 0.7); ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 3; roundRect(ctx, 1.5, 1.5, tw - 3, fs * 1.4 - 3, fs * 0.65); ctx.stroke();
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(fs * 0.75, fs * 0.7, fs * 0.38, 0, Math.PI * 2); ctx.fill();
    ctx.font = 'bold ' + fs + 'px system-ui, sans-serif'; ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillText(text, fs * 1.35, fs * 0.72);
    if (hpFrac !== null && hpFrac !== undefined) { ctx.fillStyle = '#222'; ctx.fillRect(4, fs * 1.45, tw - 8, 7); ctx.fillStyle = '#e05252'; ctx.fillRect(4, fs * 1.45, (tw - 8) * hpFrac, 7); }
    var tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace; tex.minFilter = T.LinearFilter;
    var sp = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    var scale = R * 0.75 / fs; sp.userData.baseScale = [tw * scale * 0.55, th * scale * 0.55]; sp.scale.set(sp.userData.baseScale[0], sp.userData.baseScale[1], 1); sp.renderOrder = 10;
    return sp;
  };
  function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r); ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r); ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r); ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath(); }

  // ---------- units ----------
  P.unitBadge = function (icon, color, color2, hp, level) {
    var T = window.THREE, key = icon + '|' + color + '|' + Math.round(hp / 10) + '|' + level;
    if (this.textures[key]) return this.textures[key];
    var cv = document.createElement('canvas'); cv.width = 96; cv.height = 112; var ctx = cv.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.arc(50, 52, 42, 0, Math.PI * 2); ctx.fill();
    var g = ctx.createRadialGradient(36, 34, 6, 48, 48, 42); var c = new T.Color(color); g.addColorStop(0, '#' + c.clone().multiplyScalar(1.3).getHexString()); g.addColorStop(1, '#' + c.clone().multiplyScalar(0.7).getHexString());
    ctx.fillStyle = g; ctx.strokeStyle = color2; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(48, 48, 40, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.font = '44px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(icon, 48, 50);
    if (hp < 100) { ctx.fillStyle = '#222'; ctx.fillRect(8, 96, 80, 10); ctx.fillStyle = hp > 50 ? '#4caf50' : hp > 25 ? '#e6b422' : '#e05252'; ctx.fillRect(8, 96, 80 * hp / 100, 10); }
    for (var k = 0; k < level; k++) { ctx.fillStyle = '#f5d76e'; ctx.beginPath(); ctx.arc(20 + k * 14, 8, 5, 0, Math.PI * 2); ctx.fill(); }
    var tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace; tex.minFilter = T.LinearFilter;
    this.textures[key] = tex; return tex;
  };
  P.syncUnits = function (g, app) {
    var T = window.THREE, self = this, player = G.player(g), visible = player.visible || player.explored, seen = {};
    for (var id in g.units) {
      var u = g.units[id], t = g.tiles[u.tile];
      if (!visible[t.i]) continue;
      seen[id] = true;
      var mil = G.isMilitary(u), p = tileXZ(t), top = this.tileTop(t);
      var ox = mil ? -R * 0.18 : R * 0.3, oz = mil ? R * 0.05 : R * 0.3;
      if (t.settlement != null) { ox = mil ? -R * 0.6 : R * 0.6; oz = -R * 0.45; }
      var color = u.civ >= 0 ? G.civColor(g.civs[u.civ]) : '#2b2b2b', color2 = u.civ >= 0 ? G.civData(g.civs[u.civ]).color2 : '#e33';
      var sig = u.type + '|' + u.civ + '|' + Math.round(u.hp / 10) + '|' + U.level(u) + '|' + (u.fortify ? 1 : 0) + '|' + (app && app.sel.unit === u.id ? 1 : 0) + '|' + (AU.Assets.usable3D('units', u.type) ? 'a' : 'p');
      var node = this.unitNodes[id];
      if (node && node.sig !== sig) { this.scene.remove(node.group); node = null; }
      if (!node) {
        var grp = new T.Group();
        var base = new T.Mesh(this.geo.disc, new T.MeshLambertMaterial({ color: color })); base.scale.set(0.75, 1, 0.75); base.position.y = 0.6; base.receiveShadow = true; grp.add(base);
        var art = AU.Assets.textureFor('units', u.type, u.civ >= 0 ? AU.cultureOf(g.civs[u.civ]) : null);
        if (art) { // painted unit as a billboard standing on its base
          var img = art.image, aspect = img.width / img.height, uh = R * (mil ? 0.82 : 0.68);
          var pic = new T.Sprite(new T.SpriteMaterial({ map: art, transparent: true, alphaTest: 0.1 })); pic.scale.set(uh * aspect, uh, 1); pic.position.y = uh / 2 + 1; pic.center.set(0.5, 0.5); grp.add(pic);
        } else {
          var body = new T.Mesh(this.geo.figure, new T.MeshLambertMaterial({ color: color2 })); body.position.y = R * 0.24; body.castShadow = true; grp.add(body);
          var head = new T.Mesh(this.geo.head, this.mat.wood); head.position.y = R * 0.47; grp.add(head);
          if (!mil) { body.scale.set(0.8, 0.8, 0.8); body.position.y = R * 0.2; head.position.y = R * 0.4; }
        }
        var badge = new T.Sprite(new T.SpriteMaterial({ map: this.unitBadge(AU.UNITS[u.type].icon, color, color2, u.hp, U.level(u)), transparent: true, depthTest: false }));
        var bs = art ? 0.42 : 0.62; badge.userData.baseScale = [R * bs, R * bs * 1.16]; badge.scale.set(R * bs, R * bs * 1.16, 1); badge.position.y = art ? R * 1.0 : R * 0.95; badge.renderOrder = 11; grp.add(badge);
        if (u.fortify && mil) { var f = new T.Mesh(this.geo.ring, this.mat.hlReach); f.scale.set(0.45, 0.45, 0.45); f.position.y = 1.2; grp.add(f); }
        if (app && app.sel.unit === u.id) { var selr = new T.Mesh(this.geo.ring, this.mat.hlSel); selr.position.y = 1.5; selr.position.x = -ox; selr.position.z = -oz; grp.add(selr); }
        this.scene.add(grp);
        node = this.unitNodes[id] = { group: grp, sig: sig };
      }
      node.group.position.set(p[0] + ox, (G.isWater(t) || t.navigable) ? Math.max(top, 0.4) : top, p[1] + oz);
    }
    for (var uid in this.unitNodes) if (!seen[uid]) { this.scene.remove(this.unitNodes[uid].group); delete this.unitNodes[uid]; }
  };
  P.syncSettlements = function (g) {
    var explored = G.player(g).explored, seen = {};
    for (var sid in g.settlements) {
      var s = g.settlements[sid]; if (!explored[s.tile]) continue;
      seen[sid] = true;
      var node = this.settlementNodes[sid], sig = this.settlementSig(s, g);
      if (node && node.sig !== sig) { this.scene.remove(node.group); node = null; }
      if (!node) this.settlementNodes[sid] = this.buildSettlement(g, s);
    }
    for (var k in this.settlementNodes) if (!seen[k]) { this.scene.remove(this.settlementNodes[k].group); delete this.settlementNodes[k]; }
  };
  P.syncHighlights = function (g, app) {
    var T = window.THREE, self = this, hl = this.highlights;
    while (this.hlGroup.children.length) this.hlGroup.remove(this.hlGroup.children[0]);
    function rings(set, mat) { if (!set) return; for (var key in set) { var t = g.tiles[+key]; if (!t) continue; var p = tileXZ(t); var m = new T.Mesh(self.geo.ring, mat); m.position.set(p[0], Math.max(0.5, self.tileTop(t)) + 2.2, p[1]); self.hlGroup.add(m); } }
    rings(hl.reach, this.mat.hlReach); rings(hl.expand, this.mat.hlExpand); rings(hl.attack, this.mat.hlAttack);
    if (hl.dragTile >= 0 && g.tiles[hl.dragTile]) { var dtt = g.tiles[hl.dragTile], dtp = tileXZ(dtt); var dm = new T.Mesh(this.geo.ring, this.mat.hlSel); dm.position.set(dtp[0], this.tileTop(dtt) + 2.4, dtp[1]); this.hlGroup.add(dm); }
    if (hl.path) hl.path.forEach(function (pi) { var t = g.tiles[pi], p = tileXZ(t); var d = new T.Mesh(self.geo.pathDot, self.mat.pathDot); d.position.set(p[0], self.tileTop(t) + R * 0.15, p[1]); self.hlGroup.add(d); });
    if (hl.selTile >= 0 && (!app || !app.sel.unit)) { var st = g.tiles[hl.selTile], sp = tileXZ(st); var sm = new T.Mesh(this.geo.ring, this.mat.hlSel); sm.position.set(sp[0], this.tileTop(st) + 1.6, sp[1]); this.hlGroup.add(sm); }
  };

  P.draw = function (g, app) {
    if (!this.world || this.world.g !== g) this.buildWorld(g);
    this.applyFog(g, false);
    this.rebuildBorders(g);
    this.rebuildCamps(g);
    this.syncSettlements(g);
    this.syncUnits(g, app);
    this.syncHighlights(g, app);
    if (this.world.grid) this.world.grid.visible = this.showGrid;
    this.syncYields(g);
    this.updateCamera();
    // labels and badges keep a readable, roughly constant screen size
    var f = 1 / Math.max(1, this.cam.zoom * 0.8), k, n, explored2 = G.player(g).explored;
    this.world.group.children.forEach(function (grp) { if (grp.isGroup) grp.children.forEach(function (c) { if (c.userData.tile !== undefined) { c.visible = !!explored2[c.userData.tile]; var lb = c.userData.label; if (lb) lb.scale.set(lb.userData.baseScale[0] * f, lb.userData.baseScale[1] * f, 1); } }); });
    for (k in this.settlementNodes) { var b = this.settlementNodes[k].banner; b.scale.set(b.userData.baseScale[0] * f, b.userData.baseScale[1] * f, 1); }
    for (n in this.unitNodes) this.unitNodes[n].group.children.forEach(function (c) { if (c.userData.baseScale) c.scale.set(c.userData.baseScale[0] * f, c.userData.baseScale[1] * f, 1); });
    this.three.render(this.scene, this.camera);
  };
  // Yield labels: one small sprite per explored tile near the camera (option, key Y).
  P.yieldSprite = function (groups) {
    var T = window.THREE, YC = { food: ['#5ec45e', '#1f5a1f'], production: ['#e8923a', '#6b3a0a'], gold: ['#f0d040', '#7a5a00'], science: ['#4aa8ff', '#0b3d75'], culture: ['#c27bff', '#4a1a7a'], faith: ['#f4f0ff', '#6a5a9a'] };
    var dot = 9, gap = dot * 2.3, rows = groups.length > 3 ? 2 : 1, perRow = Math.ceil(groups.length / rows);
    function gw(gr) { return Math.min(gr[1], 3) * dot * 2.1 + (gr[1] > 3 ? dot * 2.4 : 0); }
    var width = 0; for (var r = 0; r < rows; r++) { var w0 = 0; groups.slice(r * perRow, r * perRow + perRow).forEach(function (gr) { w0 += gw(gr) + gap * 0.6; }); width = Math.max(width, w0); }
    var cv = document.createElement('canvas'); cv.width = Math.ceil(width) + 8; cv.height = Math.ceil(rows * gap * 1.15 + dot); var ctx = cv.getContext('2d');
    for (var ri = 0; ri < rows; ri++) {
      var rowG = groups.slice(ri * perRow, ri * perRow + perRow), rw = 0; rowG.forEach(function (gr) { rw += gw(gr) + gap * 0.6; });
      var x = (cv.width - rw) / 2 + gap * 0.3, y = dot + 2 + ri * gap * 1.15;
      rowG.forEach(function (gr) {
        var n = gr[1], shown = Math.min(n, 3), col = YC[gr[0]];
        for (var k = 0; k < shown; k++) { var dx = x + k * dot * 2.1 + dot; ctx.fillStyle = col[1]; ctx.beginPath(); ctx.arc(dx, y, dot + 1, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = col[0]; ctx.beginPath(); ctx.arc(dx, y, dot, 0, Math.PI * 2); ctx.fill(); }
        if (n > 3) { ctx.font = 'bold ' + Math.round(dot * 2.2) + 'px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.strokeText(String(n), x + shown * dot * 2.1 + dot * 0.3, y); ctx.fillStyle = col[0]; ctx.fillText(String(n), x + shown * dot * 2.1 + dot * 0.3, y); }
        x += gw(gr) + gap * 0.6;
      });
    }
    var tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace; tex.minFilter = T.LinearFilter;
    var sp = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    var sc = R * 0.011; sp.userData.baseScale = [cv.width * sc, cv.height * sc]; sp.scale.set(sp.userData.baseScale[0], sp.userData.baseScale[1], 1); sp.renderOrder = 9;
    return sp;
  };
  P.syncYields = function (g) {
    var self = this, keep = {}, player = G.player(g);
    if (this.showYields) {
      var YI = { food: 1, production: 1, gold: 1, science: 1, culture: 1, faith: 1 };
      var cx = this.cam.x, cz = this.cam.y, rad = R * 22;
      var c0 = Math.max(0, Math.floor((cx - rad) / (R * 1.732))), c1 = Math.min(g.W - 1, Math.ceil((cx + rad) / (R * 1.732)));
      var r0 = Math.max(0, Math.floor((cz - rad) / (R * 1.5))), r1 = Math.min(g.H - 1, Math.ceil((cz + rad) / (R * 1.5)));
      for (var rr = r0; rr <= r1; rr++) for (var cc = c0; cc <= c1; cc++) {
        var i = rr * g.W + cc, t = g.tiles[i];
        if (!player.explored[i] || (AU.TERRAIN[t.terrain].impassable && !t.natural) || t.settlement != null) continue;
        var so = t.owner >= 0 ? g.settlements[t.owner] : null, yy = so ? G.tileYields(g, t, so) : AU.baseTileYields(t, player);
        var groups = [], txt = ''; for (var yk in YI) { var nv = Math.floor(yy[yk] || 0); if (nv >= 1) { groups.push([yk, nv]); txt += yk + nv + ','; } }
        if (!groups.length) continue;
        keep[i] = txt;
        var node = this.yieldNodes[i];
        if (!node || node.userData.txt !== txt) {
          if (node) this.scene.remove(node);
          node = this.yieldSprite(groups); node.userData.txt = txt;
          var p = Hex.center(t.col, t.row, R); node.position.set(p[0], this.heightAt(p[0], p[1]) + R * 0.35, p[1] + R * 0.45);
          this.scene.add(node); this.yieldNodes[i] = node;
        }
      }
    }
    for (var k in this.yieldNodes) if (!keep[k]) { this.scene.remove(this.yieldNodes[k]); delete this.yieldNodes[k]; }
  };
  P.dispose = function () { this.three.dispose(); };
  AU.Renderer3D = Renderer3D;
})(globalThis.AU = globalThis.AU || {});
