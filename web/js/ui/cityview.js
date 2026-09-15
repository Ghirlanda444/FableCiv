// City view: a live 3D scene of one settlement built from its actual buildings .
(function (AU) {
  var G = AU.G, P = AU.Panels, R = AU.HEX_R;
  var $ = function (id) { return document.getElementById(id); };
  var CV = AU.CityView = { active: null, helper: null };
  function helper() { if (!CV.helper) CV.helper = new AU.Renderer3D(document.createElement('canvas')); return CV.helper; }
  var PAL = { ocean: 0x16427a, coast: 0x2f86c2, lake: 0x3f96d8, grassland: 0x5f9a3c, plains: 0xb1a052, desert: 0xdec88b, tundra: 0x8b9278, snow: 0xe8eef2, mountain: 0x7a746e };

  P.render_cityview = function (app, g, data) {
    var s = g.settlements[data.id]; if (!s) return { title: _('City'), html: '<p>Gone.</p>' };
    var civ = g.civs[s.civ];
    var html = '<div class="cityview-wrap"><canvas id="cityview-canvas"></canvas><div class="cityview-hint">' + _('Drag to look around') + ' · pinch or scroll to zoom</div></div>';
    html += '<div class="section"><h3>' + (s.isCity ? _('City') : _('Town')) + ' of ' + s.name + ' · population ' + s.pop + '</h3><div class="yields">' + s.buildings.map(function (b) { var d = G.buildingDef(g, civ, b); return '<span>' + (AU.WONDERS[b] ? '🏛️ ' : AU.NATIONAL[b] ? '🏯 ' : '') + (d ? d.name : b) + '</span>'; }).join('') + (s.buildings.length ? '' : '<span class="stat">' + _('No buildings yet.') + '</span>') + '</div></div>';
    html += '<div class="section"><button class="small" data-action="city" data-id="' + s.id + '">← ' + _('Manage') + ' ' + s.name + '</button></div>';
    setTimeout(function () { CV.open(app, s); }, 0);
    return { title: s.name, html: html };
  };

  CV.open = function (app, s) {
    CV.close();
    var T = window.THREE, cv = $('cityview-canvas'); if (!cv || !app.webglOk()) return;
    var g = app.g, h = helper(), t = g.tiles[s.tile], civ = g.civs[s.civ];
    var W = cv.clientWidth || 360, H = Math.round(W * 0.7); cv.width = W; cv.height = H; cv.style.height = H + 'px';
    var three = new T.WebGLRenderer({ canvas: cv, antialias: true }); three.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); three.setSize(W, H, false); three.shadowMap.enabled = true;
    var scene = new T.Scene(); scene.background = new T.Color(0x9fc7ea); scene.fog = new T.Fog(0x9fc7ea, R * 9, R * 22);
    scene.add(new T.HemisphereLight(0xdde9ff, 0x4a6a2a, 1.1));
    var sun = new T.DirectionalLight(0xfff1d6, 1.7); sun.position.set(R * 4, R * 8, R * 3); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    var sc = sun.shadow.camera; sc.left = -R * 6; sc.right = R * 6; sc.top = R * 6; sc.bottom = -R * 6; sc.far = R * 30; scene.add(sun);
    var camera = new T.PerspectiveCamera(40, W / H, 1, R * 60);
    // stage: the settlement tile enlarged, surrounded by its real neighbours
    var S = 3.2; // stage scale
    function prism(col, radius, height, x, z) { var m = new T.Mesh(new T.CylinderGeometry(radius, radius * 1.02, height, 6), new T.MeshLambertMaterial({ color: col })); m.position.set(x, -height / 2, z); m.receiveShadow = true; scene.add(m); return m; }
    prism(PAL[t.terrain] || 0x5f9a3c, R * S * 0.99, 6, 0, 0);
    var nb = G.neighbors(g, t);
    nb.forEach(function (n) { var nt = g.tiles[n]; var dx = (nt.col + 0.5 * (nt.row & 1)) - (t.col + 0.5 * (t.row & 1)), dz = nt.row - t.row; var x = dx * R * Math.sqrt(3) * S, z = dz * R * 1.5 * S; var water = G.isWater(nt); var m = prism(PAL[nt.terrain] || 0x5f9a3c, R * S * 0.99, water ? 2 : 6 + (nt.hills ? 4 : 0), x, z); if (water) m.position.y = -3; if (nt.feature === 'forest' || nt.feature === 'jungle') { for (var k = 0; k < 12; k++) { var a = Math.random() * Math.PI * 2, d = Math.random() * R * S * 0.8; var tree = new T.Mesh(h.geo.tree, h.mat.tree); var sz = S * (0.9 + Math.random()); tree.scale.set(sz, sz, sz); tree.position.set(x + Math.cos(a) * d, R * 0.21 * sz + (nt.hills ? 4 : 0), z + Math.sin(a) * d); tree.castShadow = true; scene.add(tree); } } if (nt.terrain === 'mountain') { var mt = new T.Mesh(h.geo.cone, h.mat.mountain); mt.scale.set(S * 1.6, S * 1.6, S * 1.6); mt.position.set(x, R * 0.55 * S * 1.6, z); mt.castShadow = true; scene.add(mt); } });
    // buildings, spaced out on three rings
    var slots = [];
    [[6, 1.05], [10, 1.85], [14, 2.5]].forEach(function (ring) { for (var k = 0; k < ring[0]; k++) { var a = k * Math.PI * 2 / ring[0] + ring[1]; slots.push([Math.cos(a) * R * ring[1], Math.sin(a) * R * ring[1], a]); } });
    var slot = 0, wonders = [], BS = 3.4;
    function put(mesh, x, z, rotY, scale) { if (mesh.userData.isSprite) scale = scale * 0.62; mesh.position.set(x, 0, z); mesh.rotation.y = rotY; mesh.scale.set(scale, scale, scale); scene.add(mesh); }
    var cul = AU.cultureOf(g.civs[s.civ]);
    if (s.isCapital) put(h.buildingMesh('palace', false, cul), 0, 0, 0, BS * 1.2);
    else if (s.isCity) { var hall = h.buildingMesh('keep', false, cul); put(hall, 0, 0, 0, BS); }
    else { var hut = new T.Mesh(h.geo.roof, h.mat.roofBrown); hut.scale.set(R * 0.7, R * 0.6, R * 0.7); hut.position.y = R * 0.3; hut.castShadow = true; scene.add(hut); }
    var plaza = new T.Mesh(h.geo.disc, s.isCity ? h.mat.stone : h.mat.wood); plaza.scale.set(2.4, 1, 2.4); plaza.position.y = 0.5; plaza.receiveShadow = true; scene.add(plaza);
    s.buildings.forEach(function (b) { if (b === 'palace' || b === 'walls' || b === 'castle') return; if (AU.WONDERS[b] || AU.NATIONAL[b]) { wonders.push(b); return; } if (slot >= slots.length) return; var sl = slots[slot++]; put(h.buildingMesh(b, false), sl[0], sl[1], -sl[2] + Math.PI / 2, BS); });
    var houses = Math.min(slots.length - slot, Math.max(1, Math.floor(s.pop / 1.5)));
    for (var i = 0; i < houses; i++) { var sl2 = slots[slot++]; var hs = R * (0.4 + Math.random() * 0.14); var hb = new T.Mesh(h.geo.box, i % 2 ? h.mat.stone : h.mat.wood); hb.scale.set(hs, hs * 0.8, hs); hb.position.set(sl2[0], hs * 0.4, sl2[1]); hb.castShadow = true; scene.add(hb); var hr = new T.Mesh(h.geo.roof, i % 3 ? h.mat.roofRed : h.mat.roofBrown); hr.scale.set(hs * 0.95, hs * 0.55, hs * 0.95); hr.position.set(sl2[0], hs * 0.8 + hs * 0.27, sl2[1]); hr.rotation.y = Math.random() * Math.PI; scene.add(hr); }
    wonders.forEach(function (wid, i) { var a = Math.PI * 1.5 + (i - (wonders.length - 1) / 2) * 0.7; put(h.buildingMesh(wid, true), Math.cos(a) * R * 2.1, Math.sin(a) * R * 2.1, -a + Math.PI / 2, BS * 1.2); });
    if (G.hasBuilding(s, 'walls') || G.hasBuilding(s, 'castle')) { for (var e = 0; e < 6; e++) { var wa = e * Math.PI / 3, seg = new T.Mesh(h.geo.box, h.mat.wall); seg.position.set(Math.cos(wa + Math.PI / 6) * R * 2.95, R * 0.2, Math.sin(wa + Math.PI / 6) * R * 2.95); seg.scale.set(R * 2.95, R * 0.55, 6); seg.rotation.y = -(wa + Math.PI / 6) + Math.PI / 2; seg.castShadow = true; scene.add(seg); var tw = new T.Mesh(h.geo.cyl, h.mat.wall); tw.position.set(Math.cos(wa) * R * 2.95, R * 0.3, Math.sin(wa) * R * 2.95); tw.scale.set(R * 0.28, R * (G.hasBuilding(s, 'castle') ? 1.0 : 0.8), R * 0.28); tw.castShadow = true; scene.add(tw); } }
    // camera orbit
    var yaw = 0.6, pitch = 0.55, dist = R * 7, dragging = false, lastX = 0, lastY = 0, pinch = 0;
    function frame() {
      if (CV.active !== state) return;
      if (!dragging) yaw += 0.0025;
      camera.position.set(Math.sin(yaw) * Math.cos(pitch) * dist, Math.sin(pitch) * dist, Math.cos(yaw) * Math.cos(pitch) * dist);
      camera.lookAt(0, R * 0.2, 0);
      three.render(scene, camera);
      state.raf = requestAnimationFrame(frame);
    }
    var state = { three: three, raf: 0, canvas: cv };
    CV.active = state;
    cv.addEventListener('pointerdown', function (e) { dragging = true; lastX = e.clientX; lastY = e.clientY; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', function (e) { if (!dragging) return; yaw -= (e.clientX - lastX) * 0.01; pitch = Math.max(0.25, Math.min(1.3, pitch + (e.clientY - lastY) * 0.006)); lastX = e.clientX; lastY = e.clientY; });
    cv.addEventListener('pointerup', function () { dragging = false; }); cv.addEventListener('pointercancel', function () { dragging = false; });
    cv.addEventListener('wheel', function (e) { e.preventDefault(); dist = Math.max(R * 3, Math.min(R * 16, dist * (e.deltaY > 0 ? 1.1 : 0.9))); }, { passive: false });
    cv.addEventListener('touchmove', function (e) { if (e.touches.length === 2) { var d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); if (pinch) dist = Math.max(R * 3, Math.min(R * 16, dist * pinch / d)); pinch = d; dragging = false; } }, { passive: true });
    cv.addEventListener('touchend', function () { pinch = 0; });
    frame();
  };
  CV.close = function () { var st = CV.active; if (!st) return; CV.active = null; cancelAnimationFrame(st.raf); try { st.three.dispose(); } catch (e) {} };
})(globalThis.AU = globalThis.AU || {});
