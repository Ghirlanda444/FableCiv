// Canvas map renderer: procedurally painted tile sprites (cached per zoom level), rivers, coast foam,
// territory borders, settlements drawn as growing towns, unit badges and fog of war.
(function (AU) {
  var Hex = AU.Hex, G = AU.G, U = AU.U;
  var R = 30; // base hex radius in world units
  var SQ3 = Math.sqrt(3);

  function Renderer(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.cam = { x: 0, y: 0, zoom: 1 };
    this.dpr = 1; this.w = 0; this.h = 0;
    this.highlights = { reach: null, attack: null, expand: null, path: null, selTile: -1 };
    this.showGrid = false; this.showYields = false; this.iso = true;
    this.sprites = {}; this.spriteCount = 0; this.glyphs = {}; this.maxZoom = 2.8;
  }
  Renderer.prototype.resize = function () {
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    this.canvas.width = Math.round(w * dpr); this.canvas.height = Math.round(h * dpr);
    this.dpr = dpr; this.w = w; this.h = h;
  };
  Renderer.prototype.isoY = function () { return this.iso ? ISO : 1; };
  Renderer.prototype.worldToScreen = function (wx, wy) { return [(wx - this.cam.x) * this.cam.zoom + this.w / 2, (wy - this.cam.y) * this.cam.zoom * this.isoY() + this.h / 2]; };
  Renderer.prototype.screenToWorld = function (sx, sy) { return [(sx - this.w / 2) / this.cam.zoom + this.cam.x, (sy - this.h / 2) / (this.cam.zoom * this.isoY()) + this.cam.y]; };
  Renderer.prototype.tileAtScreen = function (g, sx, sy) {
    var w = this.screenToWorld(sx, sy), o = Hex.fromPixel(w[0], w[1], R);
    if (o[0] < 0 || o[0] >= g.W || o[1] < 0 || o[1] >= g.H) return -1;
    return o[1] * g.W + o[0];
  };
  Renderer.prototype.tileCenter = function (t) { return Hex.center(t.col, t.row, R); };
  Renderer.prototype.centerOn = function (g, tileIdx) { var t = g.tiles[tileIdx], c = this.tileCenter(t); this.cam.x = c[0]; this.cam.y = c[1]; this.clampCamera(g); };
  Renderer.prototype.clampCamera = function (g) {
    var maxX = R * SQ3 * (g.W + 0.5), maxY = R * 1.5 * g.H;
    this.cam.x = Math.max(0, Math.min(maxX, this.cam.x)); this.cam.y = Math.max(0, Math.min(maxY, this.cam.y));
    this.cam.zoom = Math.max(0.3, Math.min(2.8, this.cam.zoom));
  };

  // ---------- colour helpers ----------
  function hexToRgb(hex) { var n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function rgb(c, f, a) { f = f === undefined ? 1 : f; var r = Math.max(0, Math.min(255, Math.round(c[0] * f))), g = Math.max(0, Math.min(255, Math.round(c[1] * f))), b = Math.max(0, Math.min(255, Math.round(c[2] * f))); return a === undefined ? 'rgb(' + r + ',' + g + ',' + b + ')' : 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')'; }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  var PAL = {
    ocean: [22, 66, 120], coast: [46, 132, 190], lake: [64, 150, 214],
    grassland: [98, 156, 66], plains: [176, 160, 82], desert: [222, 200, 140], tundra: [140, 146, 120], snow: [230, 236, 240], mountain: [120, 116, 110]
  };
  var ISO = 0.62; // vertical squash of the isometric (Civ 3 style) view
  function hexPath(ctx, cx, cy, r, sy) {
    sy = sy || 1; ctx.beginPath();
    for (var i = 0; i < 6; i++) { var a = Math.PI / 180 * (60 * i - 30); var x = cx + r * Math.cos(a), y = cy + r * Math.sin(a) * sy; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.closePath();
  }
  function lcg(seed) { var s = (seed * 2654435761) >>> 0 || 1; return function () { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }

  // ---------- tile sprites ----------
  // Painted mode: generated terrain textures and feature sprites (web/assets/terrain, web/assets/features) when they exist.
  Renderer.prototype.terrainTexture = function (terrain) {
    var id = terrain === 'mountain' ? 'tundra' : terrain; if (!AU.TERRAIN[id] && ['forest', 'jungle', 'marsh', 'hills'].indexOf(id) < 0) return null; var img = AU.Assets.get('terrain', id);
    if (!img) return null;
    this.texCanvases = this.texCanvases || {};
    var cv = this.texCanvases[id];
    if (!cv) { // mirrored 2x2 copy: always seamless whatever the generator produced
      var w = img.width, h = img.height; cv = document.createElement('canvas'); cv.width = w * 2; cv.height = h * 2; var c = cv.getContext('2d');
      // flatten the generator's lighting (vignettes make the mirrored seams visible): divide by a heavily blurred copy
      var flat = document.createElement('canvas'); flat.width = w; flat.height = h; var fc = flat.getContext('2d');
      try {
        fc.drawImage(img, 0, 0, w, h); var src = fc.getImageData(0, 0, w, h), sd = src.data;
        var lo = document.createElement('canvas'); lo.width = 8; lo.height = 8; var lc = lo.getContext('2d'); lc.drawImage(img, 0, 0, 8, 8);
        var blur = document.createElement('canvas'); blur.width = w; blur.height = h; var bc = blur.getContext('2d'); bc.imageSmoothingEnabled = true; bc.drawImage(lo, 0, 0, w, h);
        var bd = bc.getImageData(0, 0, w, h).data, sum = 0, n = w * h;
        for (var k = 0; k < n; k++) sum += bd[k * 4] * 0.3 + bd[k * 4 + 1] * 0.59 + bd[k * 4 + 2] * 0.11;
        var mean = sum / n;
        for (var q = 0; q < n; q++) { var lum = bd[q * 4] * 0.3 + bd[q * 4 + 1] * 0.59 + bd[q * 4 + 2] * 0.11, f = Math.max(0.6, Math.min(1.6, mean / Math.max(20, lum))); sd[q * 4] = Math.min(255, sd[q * 4] * f); sd[q * 4 + 1] = Math.min(255, sd[q * 4 + 1] * f); sd[q * 4 + 2] = Math.min(255, sd[q * 4 + 2] * f); }
        fc.putImageData(src, 0, 0); img = flat;
      } catch (e) { /* tainted image (file://): use it as is */ }
      c.drawImage(img, 0, 0); c.save(); c.translate(w * 2, 0); c.scale(-1, 1); c.drawImage(img, 0, 0); c.restore();
      c.save(); c.translate(0, h * 2); c.scale(1, -1); c.drawImage(img, 0, 0); c.restore(); c.save(); c.translate(w * 2, h * 2); c.scale(-1, -1); c.drawImage(img, 0, 0); c.restore();
      this.texCanvases[id] = cv;
    }
    return cv;
  };
  Renderer.prototype.featureArt = function (id) { return AU.Assets.get('features', id); };
  Renderer.prototype.drawArt = function (ctx, img, x, y, w, anchorY) { var h = w * img.height / img.width; ctx.drawImage(img, x - w / 2, y - h * (anchorY === undefined ? 0.5 : anchorY), w, h); };
  Renderer.prototype.tileSprite = function (t, rz, groundOnly) {
    var tex = this.terrainTexture(t.terrain), feat = t.feature ? this.featureArt(t.feature) : null, hillsArt = t.hills && t.terrain !== 'mountain' ? this.featureArt('hills') : null, mtn = t.terrain === 'mountain' ? this.featureArt('mountain') : null;
    var ftex = t.feature ? this.terrainTexture(t.feature) : null, htex = t.hills ? this.terrainTexture('hills') : null;
    var key = t.terrain + '|' + (groundOnly ? 'g' : (t.hills ? 1 : 0) + '|' + (t.feature || '')) + '|' + (t.hills ? 'h' : '') + (t.feature || '') + '|' + (t.i % 4) + '|' + rz + '|' + (tex ? 1 : 0) + (feat ? 1 : 0) + (hillsArt ? 1 : 0) + (mtn ? 1 : 0) + (ftex ? 1 : 0) + (htex ? 1 : 0);
    var sp = this.sprites[key];
    if (sp) return sp;
    if (this.spriteCount > 900) { this.sprites = {}; this.spriteCount = 0; }
    sp = this.paintTile(t, rz, groundOnly); this.sprites[key] = sp; this.spriteCount++;
    return sp;
  };
  // Upright feature sprite (hills, mountains, trees...) for the isometric view, drawn after the squashed ground.
  Renderer.prototype.featureSprite = function (t, rz) {
    if (!t.hills && !t.feature && t.terrain !== 'mountain') return null;
    var needHills = t.hills && t.terrain !== 'mountain' && !this.terrainTexture('hills'), needFeat = t.feature && !this.terrainTexture(t.feature);
    if (!needHills && !needFeat && t.terrain !== 'mountain') return null;
    var feat = t.feature ? this.featureArt(t.feature) : null, hillsArt = t.hills && t.terrain !== 'mountain' ? this.featureArt('hills') : null, mtn = t.terrain === 'mountain' ? this.featureArt('mountain') : null;
    var key = 'F|' + t.terrain + '|' + (t.hills ? 1 : 0) + '|' + (t.feature || '') + '|' + (t.i % 4) + '|' + rz + '|' + (feat ? 1 : 0) + (hillsArt ? 1 : 0) + (mtn ? 1 : 0);
    var sp = this.sprites[key]; if (sp) return sp;
    if (this.spriteCount > 900) { this.sprites = {}; this.spriteCount = 0; }
    var w = Math.ceil(rz * SQ3) + 2, h = Math.ceil(rz * 2.6) + 2, cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    var ctx = cv.getContext('2d'), cx = w / 2, cy = h - rz - 1, rnd = lcg(t.i % 4 + 11 + (t.hills ? 5 : 0) + (t.feature ? 17 : 0)), base = PAL[t.terrain], detail = rz >= 14;
    this.paintFeatures(ctx, t, cx, cy, rz, base, rnd, detail, hillsArt, mtn, feat, true);
    cv.anchorY = cy; this.sprites[key] = cv; this.spriteCount++;
    return cv;
  };
  Renderer.prototype.paintFeatures = function (ctx, t, cx, cy, rz, base, rnd, detail, hillsArt, mtnArt, featArt, noClip) {
    function clipped(fn) { if (noClip) { fn(); return; } ctx.save(); hexPath(ctx, cx, cy, rz + 0.8); ctx.clip(); fn(); ctx.restore(); }
    var self = this;
    var texHills = !!this.terrainTexture('hills'), texFeat = t.feature && !!this.terrainTexture(t.feature);
    if (t.hills && t.terrain !== 'mountain' && !texHills) { if (hillsArt) this.drawArt(ctx, hillsArt, cx, cy + rz * 0.05, rz * 1.95); else clipped(function () { self.paintHills(ctx, cx, cy, rz, base, rnd, detail); }); }
    if (t.terrain === 'mountain') { if (mtnArt) this.drawArt(ctx, mtnArt, cx, cy, rz * 2.05, 0.55); else clipped(function () { self.paintMountain(ctx, cx, cy, rz, rnd, detail); }); }
    if (t.feature && !texFeat) {
      if (featArt) this.drawArt(ctx, featArt, cx, cy - (t.hills ? rz * 0.12 : 0), rz * (t.feature === 'oasis' ? 1.5 : 1.85), 0.55);
      else clipped(function () {
        if (t.feature === 'forest') self.paintTrees(ctx, cx, cy, rz, rnd, detail, false, t.hills);
        if (t.feature === 'jungle') self.paintTrees(ctx, cx, cy, rz, rnd, detail, true, t.hills);
        if (t.feature === 'marsh') self.paintMarsh(ctx, cx, cy, rz, rnd, detail);
        if (t.feature === 'oasis') self.paintOasis(ctx, cx, cy, rz, rnd, detail);
      });
    }
  };
  Renderer.prototype.paintTile = function (t, rz, groundOnly) {
    var w = Math.ceil(rz * SQ3) + 2, h = Math.ceil(rz * 2) + 2;
    var cv = document.createElement('canvas'); cv.width = w; cv.height = h; cv.hexW = w; cv.hexH = h;
    var ctx = cv.getContext('2d'), cx = w / 2, cy = h / 2, rnd = lcg(t.i % 4 + 11 + (t.hills ? 5 : 0) + (t.feature ? 17 : 0));
    var base = PAL[t.terrain], water = AU.TERRAIN[t.terrain].water, detail = rz >= 14;
    hexPath(ctx, cx, cy, rz + 0.8); ctx.save(); ctx.clip();
    // base fill with a soft radial light
    var tex = this.terrainTexture(t.terrain), painted = !!tex;
    if (painted) {
      var pat = ctx.createPattern(tex, 'repeat'), sc = rz / R * 0.36, v = t.i % 4;
      if (pat.setTransform && typeof DOMMatrix !== 'undefined') pat.setTransform(new DOMMatrix().translate(cx - (137 * v + 40) * sc, cy - (89 * v + 30) * sc).scale(sc));
      ctx.fillStyle = pat; ctx.fillRect(0, 0, w, h);
      var lt = ctx.createRadialGradient(cx - rz * 0.3, cy - rz * 0.35, rz * 0.2, cx, cy, rz * 1.25); lt.addColorStop(0, 'rgba(255,255,255,0.08)'); lt.addColorStop(1, 'rgba(0,0,0,0.10)'); ctx.fillStyle = lt; ctx.fillRect(0, 0, w, h);
    } else {
      var grad = ctx.createRadialGradient(cx - rz * 0.3, cy - rz * 0.35, rz * 0.2, cx, cy, rz * 1.2);
      grad.addColorStop(0, rgb(base, water ? 1.12 : 1.08)); grad.addColorStop(1, rgb(base, water ? 0.88 : 0.9));
      ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
    }
    var self0 = this;
    function overlayTex(id, alphaMax, scaleK) {
      var tx = self0.terrainTexture(id); if (!tx) return false;
      var pt = ctx.createPattern(tx, 'repeat'), sc2 = rz / R * (scaleK || 0.3), v2 = (t.i * 7) % 4;
      if (pt.setTransform && typeof DOMMatrix !== 'undefined') pt.setTransform(new DOMMatrix().translate(cx - (151 * v2 + 60) * sc2, cy - (97 * v2 + 20) * sc2).scale(sc2));
      ctx.save(); ctx.globalAlpha = alphaMax; ctx.fillStyle = pt; ctx.fillRect(0, 0, w, h); ctx.restore();
      var edge = ctx.createRadialGradient(cx, cy, rz * 0.55, cx, cy, rz * 1.05); edge.addColorStop(0, 'rgba(0,0,0,0)'); edge.addColorStop(1, 'rgba(0,0,0,0.22)'); ctx.fillStyle = edge; ctx.fillRect(0, 0, w, h);
      return true;
    }
    t._texFeat = false; t._texHills = false;
    if (t.hills && t.terrain !== 'mountain' && overlayTex('hills', 0.85, 0.34)) t._texHills = true;
    if (t.feature && (t.feature === 'forest' || t.feature === 'jungle' || t.feature === 'marsh') && overlayTex(t.feature, 0.95, 0.3)) t._texFeat = true;
    if (detail && !painted) {
      // texture: speckles
      var n = Math.round(rz * 1.2);
      for (var k = 0; k < n; k++) {
        var px = cx + (rnd() - 0.5) * rz * 1.7, py = cy + (rnd() - 0.5) * rz * 1.9;
        ctx.fillStyle = rgb(base, 0.8 + rnd() * 0.45, 0.35);
        ctx.fillRect(px, py, 1 + rnd() * 2, 1 + rnd() * 1.5);
      }
      if (water) {
        ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = Math.max(1, rz * 0.05);
        for (var wv = 0; wv < 3; wv++) { var wx = cx + (rnd() - 0.5) * rz, wy = cy + (rnd() - 0.5) * rz * 1.4, wl = rz * (0.25 + rnd() * 0.3); ctx.beginPath(); ctx.moveTo(wx - wl / 2, wy); ctx.quadraticCurveTo(wx, wy - rz * 0.08, wx + wl / 2, wy); ctx.stroke(); }
      } else if (t.terrain === 'grassland' || t.terrain === 'plains' || t.terrain === 'tundra') {
        ctx.strokeStyle = rgb(base, 0.72, 0.5); ctx.lineWidth = Math.max(1, rz * 0.045);
        for (var gt = 0; gt < 7; gt++) { var gx = cx + (rnd() - 0.5) * rz * 1.5, gy = cy + (rnd() - 0.5) * rz * 1.5; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx - rz * 0.06, gy - rz * 0.14); ctx.moveTo(gx, gy); ctx.lineTo(gx + rz * 0.07, gy - rz * 0.12); ctx.stroke(); }
      } else if (t.terrain === 'desert') {
        ctx.strokeStyle = rgb(base, 0.85, 0.7); ctx.lineWidth = Math.max(1, rz * 0.05);
        for (var dn = 0; dn < 3; dn++) { var dx = cx + (rnd() - 0.5) * rz, dy = cy + (rnd() - 0.5) * rz * 1.3; ctx.beginPath(); ctx.moveTo(dx - rz * 0.35, dy); ctx.quadraticCurveTo(dx, dy - rz * 0.15, dx + rz * 0.35, dy); ctx.stroke(); }
      } else if (t.terrain === 'snow') {
        ctx.fillStyle = 'rgba(160,190,230,0.25)'; for (var sn = 0; sn < 4; sn++) { ctx.beginPath(); ctx.ellipse(cx + (rnd() - 0.5) * rz, cy + (rnd() - 0.5) * rz, rz * 0.3, rz * 0.12, 0, 0, Math.PI * 2); ctx.fill(); }
      }
    }
    var hillsArt = t.hills && t.terrain !== 'mountain' ? this.featureArt('hills') : null, mtnArt = t.terrain === 'mountain' ? this.featureArt('mountain') : null, featArt = t.feature ? this.featureArt(t.feature) : null;
    ctx.restore(); // sprites may overhang the hex a little
    if (!groundOnly) this.paintFeatures(ctx, t, cx, cy, rz, base, rnd, detail, hillsArt, mtnArt, featArt, false);
    // subtle edge shading for a tiled look
    ctx.strokeStyle = water ? 'rgba(0,20,60,0.18)' : 'rgba(0,0,0,0.16)'; ctx.lineWidth = 1; hexPath(ctx, cx, cy, rz - 0.5); ctx.stroke();
    return cv;
  };
  Renderer.prototype.paintHills = function (ctx, cx, cy, rz, base, rnd, detail) {
    var n = 3;
    for (var k = 0; k < n; k++) {
      var hx = cx + (k - 1) * rz * 0.42 + (rnd() - 0.5) * rz * 0.15, hy = cy + rz * (0.15 + (k % 2) * 0.22), hr = rz * (0.34 + rnd() * 0.1);
      var g1 = ctx.createLinearGradient(hx - hr, hy, hx + hr, hy);
      g1.addColorStop(0, rgb(base, 1.15)); g1.addColorStop(1, rgb(base, 0.62));
      ctx.fillStyle = g1; ctx.beginPath(); ctx.moveTo(hx - hr, hy); ctx.quadraticCurveTo(hx - hr * 0.3, hy - hr * 1.15, hx + hr * 0.15, hy - hr * 0.7); ctx.quadraticCurveTo(hx + hr * 0.6, hy - hr * 0.35, hx + hr, hy); ctx.closePath(); ctx.fill();
      if (detail) { ctx.fillStyle = 'rgba(0,0,0,0.14)'; ctx.beginPath(); ctx.ellipse(hx, hy + 1, hr, hr * 0.14, 0, 0, Math.PI); ctx.fill(); }
    }
  };
  Renderer.prototype.paintMountain = function (ctx, cx, cy, rz, rnd, detail) {
    var peaks = [[cx - rz * 0.35, cy + rz * 0.5, rz * 0.55, rz * 0.9], [cx + rz * 0.25, cy + rz * 0.55, rz * 0.62, rz * 1.15], [cx + rz * 0.65, cy + rz * 0.5, rz * 0.4, rz * 0.6]];
    peaks.forEach(function (p) {
      var px = p[0], py = p[1], pw = p[2], ph = p[3];
      ctx.fillStyle = '#6b6560'; ctx.beginPath(); ctx.moveTo(px - pw, py); ctx.lineTo(px, py - ph); ctx.lineTo(px + pw, py); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#8d8781'; ctx.beginPath(); ctx.moveTo(px - pw, py); ctx.lineTo(px, py - ph); ctx.lineTo(px - pw * 0.05, py); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#f2f5f7'; ctx.beginPath(); ctx.moveTo(px - pw * 0.28, py - ph * 0.62); ctx.lineTo(px, py - ph); ctx.lineTo(px + pw * 0.3, py - ph * 0.6); ctx.lineTo(px + pw * 0.12, py - ph * 0.55); ctx.lineTo(px - pw * 0.05, py - ph * 0.66); ctx.lineTo(px - pw * 0.18, py - ph * 0.52); ctx.closePath(); ctx.fill();
    });
    if (detail) { ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(cx + rz * 0.1, cy + rz * 0.62, rz * 0.9, rz * 0.16, 0, 0, Math.PI * 2); ctx.fill(); }
  };
  Renderer.prototype.paintTrees = function (ctx, cx, cy, rz, rnd, detail, jungle, hills) {
    var n = detail ? (jungle ? 6 : 7) : 4;
    var pts = [];
    for (var k = 0; k < n; k++) pts.push([cx + (rnd() - 0.5) * rz * 1.35, cy + (rnd() - 0.5) * rz * 1.4 - (hills ? rz * 0.15 : 0)]);
    pts.sort(function (a, b) { return a[1] - b[1]; });
    pts.forEach(function (p, idx) {
      var s = rz * (0.22 + rnd() * 0.1), x = p[0], y = p[1];
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(x + s * 0.2, y + s * 0.9, s * 0.8, s * 0.25, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#5a3b1e'; ctx.fillRect(x - s * 0.08, y + s * 0.3, s * 0.16, s * 0.6);
      if (jungle) {
        var jc = idx % 2 ? '#1f6b2e' : '#2e8b3d';
        ctx.fillStyle = jc; ctx.beginPath(); ctx.arc(x, y + s * 0.05, s * 0.75, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = idx % 2 ? '#3aa04a' : '#4fb85f'; ctx.beginPath(); ctx.arc(x - s * 0.25, y - s * 0.2, s * 0.45, 0, Math.PI * 2); ctx.fill();
      } else {
        var dark = idx % 3 === 0;
        ctx.fillStyle = dark ? '#1e5a2a' : '#2f7a36'; ctx.beginPath(); ctx.moveTo(x - s * 0.7, y + s * 0.4); ctx.lineTo(x, y - s * 0.9); ctx.lineTo(x + s * 0.7, y + s * 0.4); ctx.closePath(); ctx.fill();
        ctx.fillStyle = dark ? '#2b7a3a' : '#3f9a48'; ctx.beginPath(); ctx.moveTo(x - s * 0.5, y - s * 0.05); ctx.lineTo(x, y - s * 0.95); ctx.lineTo(x + s * 0.5, y - s * 0.05); ctx.closePath(); ctx.fill();
      }
    });
  };
  Renderer.prototype.paintMarsh = function (ctx, cx, cy, rz, rnd, detail) {
    ctx.fillStyle = 'rgba(60,120,150,0.45)';
    for (var k = 0; k < 3; k++) { ctx.beginPath(); ctx.ellipse(cx + (rnd() - 0.5) * rz, cy + (rnd() - 0.5) * rz, rz * 0.32, rz * 0.16, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = '#4e7d2a'; ctx.lineWidth = Math.max(1, rz * 0.05);
    for (var r2 = 0; r2 < 8; r2++) { var x = cx + (rnd() - 0.5) * rz * 1.3, y = cy + (rnd() - 0.5) * rz * 1.3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + rz * 0.04, y - rz * 0.3); ctx.stroke(); }
  };
  Renderer.prototype.paintOasis = function (ctx, cx, cy, rz, rnd, detail) {
    ctx.fillStyle = '#3a9ad9'; ctx.beginPath(); ctx.ellipse(cx, cy + rz * 0.15, rz * 0.45, rz * 0.28, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2e7d32'; ctx.lineWidth = Math.max(1, rz * 0.07);
    for (var k = 0; k < 4; k++) { var a = k * 1.6 + 0.4, x = cx + Math.cos(a) * rz * 0.45, y = cy - rz * 0.1 + Math.sin(a) * rz * 0.25; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - rz * 0.35); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x - rz * 0.2, y - rz * 0.3); ctx.quadraticCurveTo(x, y - rz * 0.5, x + rz * 0.2, y - rz * 0.3); ctx.stroke(); }
  };
  // Emoji glyphs are cached as small canvases (text rendering is the slow part on phones).
  Renderer.prototype.glyph = function (ch, size) {
    var key = ch + '|' + size, gph = this.glyphs[key];
    if (gph) return gph;
    var cv = document.createElement('canvas'); cv.width = cv.height = Math.ceil(size * 1.4);
    var ctx = cv.getContext('2d'); ctx.font = size + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(ch, cv.width / 2, cv.height / 2 + size * 0.05);
    this.glyphs[key] = cv; return cv;
  };
  Renderer.prototype.drawGlyph = function (ctx, ch, x, y, size) { var gp = this.glyph(ch, Math.max(6, Math.round(size))); ctx.drawImage(gp, x - gp.width / 2, y - gp.height / 2); };

  var hexPathBase = hexPath;
  // ---------- main draw ----------
  Renderer.prototype.draw = function (g, app) {
    var ctx = this.ctx, z = this.cam.zoom, dpr = this.dpr, self = this;
    var player = G.player(g);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#060c16'; ctx.fillRect(0, 0, this.w, this.h);
    var rz = Math.max(4, Math.round(R * z * dpr) / dpr); // sprite radius in CSS px
    var tl = this.screenToWorld(0, 0), br = this.screenToWorld(this.w, this.h);
    var r0 = Math.max(0, Math.floor(tl[1] / (R * 1.5)) - 1), r1 = Math.min(g.H - 1, Math.ceil(br[1] / (R * 1.5)) + 1);
    var c0 = Math.max(0, Math.floor(tl[0] / (R * SQ3)) - 1), c1 = Math.min(g.W - 1, Math.ceil(br[0] / (R * SQ3)) + 1);
    var explored = player.explored, visible = player.visible || explored;
    var lowDetail = rz < 12, midDetail = rz < 20;
    var hl = this.highlights;
    var r, c, i, t, cc, sx, sy;
    function S(t) { var p = Hex.center(t.col, t.row, R); return self.worldToScreen(p[0], p[1]); }
    var rzs = rz; // screen radius
    var isoY = this.isoY(), iso = this.iso;
    var hexPath = function (ctx, cx, cy, rr) { hexPathBase(ctx, cx, cy, rr, isoY); };
    var cornersI = function (cx, cy, rr) { return Hex.corners(cx, cy, rr).map(function (pt) { return [pt[0], cy + (pt[1] - cy) * isoY]; }); };
    // pass 1: terrain sprites
    for (r = r0; r <= r1; r++) for (c = c0; c <= c1; c++) {
      i = r * g.W + c; t = g.tiles[i];
      if (!explored[i]) continue;
      var p = this.worldToScreen(R * SQ3 * (c + 0.5 * (r & 1)), R * 1.5 * r);
      var sp = this.tileSprite(t, Math.round(rzs), iso);
      if (iso) ctx.drawImage(sp, Math.round(p[0] - sp.width / 2), Math.round(p[1] - sp.height * isoY / 2), sp.width, Math.round(sp.height * isoY) + 1);
      else ctx.drawImage(sp, Math.round(p[0] - sp.width / 2), Math.round(p[1] - sp.height / 2));
    }
    // pass 1a: upright features (isometric view), back to front
    if (iso) for (r = r0; r <= r1; r++) for (c = c0; c <= c1; c++) {
      i = r * g.W + c; t = g.tiles[i];
      if (!explored[i]) continue;
      var fsp = this.featureSprite(t, Math.round(rzs)); if (!fsp) continue;
      var pf = S(t); ctx.drawImage(fsp, Math.round(pf[0] - fsp.width / 2), Math.round(pf[1] - fsp.anchorY));
    }
    // pass 1b: coast foam where water meets land
    if (!lowDetail) {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = Math.max(1, rzs * 0.08); ctx.lineCap = 'round';
      for (r = r0; r <= r1; r++) for (c = c0; c <= c1; c++) {
        i = r * g.W + c; t = g.tiles[i];
        if (!explored[i] || !G.isWater(t)) continue;
        var pc = S(t), corners = cornersI(pc[0], pc[1], rzs * 0.86);
        var d = (r & 1) ? [[1, 0], [1, -1], [0, -1], [-1, 0], [0, 1], [1, 1]] : [[1, 0], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1]];
        var dirCorner = [[0, 1], [5, 0], [4, 5], [3, 4], [2, 3], [1, 2]];
        for (var e = 0; e < 6; e++) {
          var nc2 = c + d[e][0], nr2 = r + d[e][1];
          if (nc2 < 0 || nc2 >= g.W || nr2 < 0 || nr2 >= g.H) continue;
          var nt = g.tiles[nr2 * g.W + nc2]; if (G.isWater(nt)) continue;
          var a = corners[dirCorner[e][0]], b = corners[dirCorner[e][1]];
          ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
        }
      }
    }
    // pass 2: rivers
    ctx.strokeStyle = '#3aa0e6'; ctx.lineWidth = Math.max(1.2, rzs * 0.2); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    (g.rivers || []).forEach(function (path) {
      var pts = [], anyVisible = false;
      for (var k = 0; k < path.length; k++) { var pt = g.tiles[path[k]]; if (!pt) return; if (explored[pt.i] && pt.row >= r0 - 1 && pt.row <= r1 + 1 && pt.col >= c0 - 1 && pt.col <= c1 + 1) anyVisible = true; pts.push(S(pt)); }
      if (!anyVisible || pts.length < 2) return;
      ctx.strokeStyle = 'rgba(20,60,110,0.5)'; ctx.lineWidth = Math.max(2, rzs * 0.28);
      strokePath(ctx, pts);
      ctx.strokeStyle = '#48b0f0'; ctx.lineWidth = Math.max(1.2, rzs * 0.17);
      strokePath(ctx, pts);
    });
    function strokePath(ctx, pts) {
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
      for (var m = 1; m < pts.length - 1; m++) { var mx = (pts[m][0] + pts[m + 1][0]) / 2, my = (pts[m][1] + pts[m + 1][1]) / 2; ctx.quadraticCurveTo(pts[m][0], pts[m][1], mx, my); }
      ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]); ctx.stroke();
    }
    // cover unexplored tiles again (rivers may cross them)
    for (r = r0; r <= r1; r++) for (c = c0; c <= c1; c++) { i = r * g.W + c; if (explored[i]) continue; t = g.tiles[i]; cc = S(t); ctx.fillStyle = '#060c16'; hexPath(ctx, cc[0], cc[1], rzs + 1); ctx.fill(); }
    // pass 3: territory
    var dirs = { even: [[1, 0], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1]], odd: [[1, 0], [1, -1], [0, -1], [-1, 0], [0, 1], [1, 1]] };
    var dirCorner2 = [[0, 1], [5, 0], [4, 5], [3, 4], [2, 3], [1, 2]];
    for (r = r0; r <= r1; r++) for (c = c0; c <= c1; c++) {
      i = r * g.W + c; t = g.tiles[i];
      if (!explored[i] || t.owner < 0) continue;
      var s = g.settlements[t.owner]; if (!s) continue;
      var civ = g.civs[s.civ], data = G.civData(civ), col = hexToRgb(G.civColor(civ));
      cc = S(t);
      ctx.fillStyle = rgb(col, 1, t.worked && t.settlement == null ? 0.16 : 0.07); hexPath(ctx, cc[0], cc[1], rzs); ctx.fill();
      var corners2 = cornersI(cc[0], cc[1], rzs - Math.max(1, rzs * 0.08));
      var dd = (r & 1) ? dirs.odd : dirs.even;
      for (var e2 = 0; e2 < 6; e2++) {
        var nc3 = c + dd[e2][0], nr3 = r + dd[e2][1], same = false;
        if (nc3 >= 0 && nc3 < g.W && nr3 >= 0 && nr3 < g.H) { var nt3 = g.tiles[nr3 * g.W + nc3]; same = nt3.owner >= 0 && g.settlements[nt3.owner] && g.settlements[nt3.owner].civ === s.civ; }
        if (same) continue;
        var a2 = corners2[dirCorner2[e2][0]], b2 = corners2[dirCorner2[e2][1]];
        ctx.strokeStyle = rgb(col, 1, 0.45); ctx.lineWidth = Math.max(2, rzs * 0.22); ctx.beginPath(); ctx.moveTo(a2[0], a2[1]); ctx.lineTo(b2[0], b2[1]); ctx.stroke();
        ctx.strokeStyle = G.civColor(civ); ctx.lineWidth = Math.max(1, rzs * 0.07); ctx.beginPath(); ctx.moveTo(a2[0], a2[1]); ctx.lineTo(b2[0], b2[1]); ctx.stroke();
      }
    }
    if (this.showGrid) { ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1; for (r = r0; r <= r1; r++) for (c = c0; c <= c1; c++) { i = r * g.W + c; if (!explored[i]) continue; cc = S(g.tiles[i]); hexPath(ctx, cc[0], cc[1], rzs); ctx.stroke(); } }
    // pass 4: resources, improvements, camps
    if (!lowDetail) {
      for (r = r0; r <= r1; r++) for (c = c0; c <= c1; c++) {
        i = r * g.W + c; t = g.tiles[i];
        if (!explored[i]) continue;
        cc = S(t);
        if (t.resource) {
          var Rs = AU.RESOURCES[t.resource];
          if (!Rs.revealTech || player.techs[Rs.revealTech]) {
            var rart = AU.Assets.get('resources', t.resource);
            ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.arc(cc[0] + rzs * 0.42, cc[1] + rzs * 0.38, rzs * 0.3, 0, Math.PI * 2); ctx.fill();
            if (rart) this.drawArt(ctx, rart, cc[0] + rzs * 0.42, cc[1] + rzs * 0.38, rzs * 0.52); else this.drawGlyph(ctx, Rs.icon, cc[0] + rzs * 0.42, cc[1] + rzs * 0.38, rzs * 0.44);
          }
        }
        if (t.worked && t.owner >= 0 && t.settlement == null && !midDetail) {
          var s0 = g.settlements[t.owner]; var imp = s0 ? G.improvementFor(g, t, g.civs[s0.civ]) : null;
          if (imp) { var iart = this.featureArt(imp); if (iart) this.drawArt(ctx, iart, cc[0] - rzs * 0.15, cc[1] + rzs * 0.2, rzs * 1.1, 0.6); else this.drawGlyph(ctx, AU.IMPROVEMENTS[imp].icon, cc[0] - rzs * 0.42, cc[1] + rzs * 0.42, rzs * 0.36); }
        }
        if (t.camp) { var cart = this.featureArt('raider_camp'); if (cart) this.drawArt(ctx, cart, cc[0], cc[1], rzs * 1.7, 0.6); else this.drawGlyph(ctx, '🏕️', cc[0], cc[1] - rzs * 0.1, rzs * 0.8); }
        if (t.natural) {
          var NW = AU.NATURAL_WONDERS[t.natural];
          var nart = AU.Assets.get('natural', t.natural);
          if (nart) this.drawArt(ctx, nart, cc[0], cc[1], rzs * 2.4, 0.6);
          else { ctx.fillStyle = 'rgba(255,215,90,0.35)'; hexPath(ctx, cc[0], cc[1], rzs - 1); ctx.fill(); this.drawGlyph(ctx, NW.icon, cc[0], cc[1] - rzs * 0.15, rzs * 1.1); }
          var fs2 = Math.max(7, Math.round(rzs * 0.3)); ctx.font = 'bold ' + fs2 + 'px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          var tw2 = ctx.measureText(NW.name).width + 8; ctx.fillStyle = 'rgba(40,30,0,0.75)'; ctx.fillRect(cc[0] - tw2 / 2, cc[1] + rzs * 0.45, tw2, fs2 * 1.3); ctx.fillStyle = '#ffe08a'; ctx.fillText(NW.name, cc[0], cc[1] + rzs * 0.45 + fs2 * 0.65);
        }
      }
    }
    // pass 4b: tile yields (option)
    if (this.showYields && rz >= 14) {
      var ys = Math.max(7, rz * 0.26), YI = { food: '🌾', production: '⚙️', gold: '💰', science: '🔬', culture: '🎭' };
      for (r = r0; r <= r1; r++) for (c = c0; c <= c1; c++) {
        i = r * g.W + c; t = g.tiles[i];
        if (!explored[i] || AU.TERRAIN[t.terrain].impassable && !t.natural) continue;
        var so = t.owner >= 0 ? g.settlements[t.owner] : null;
        var yy = so ? G.tileYields(g, t, so) : AU.baseTileYields(t, player);
        var parts = []; for (var yk in YI) if (yy[yk] >= 1) parts.push([YI[yk], Math.floor(yy[yk])]);
        if (!parts.length) continue;
        cc = S(t); var totalW = parts.length * ys * 1.55, x0 = cc[0] - totalW / 2 + ys * 0.75, yy0 = cc[1] + rz * 0.62 * isoY;
        ctx.fillStyle = 'rgba(0,0,0,0.42)'; ctx.fillRect(cc[0] - totalW / 2 - 2, yy0 - ys * 0.6, totalW + 4, ys * 1.2);
        ctx.font = 'bold ' + Math.round(ys * 0.9) + 'px system-ui, sans-serif'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillStyle = '#fff';
        for (var pi2 = 0; pi2 < parts.length; pi2++) { this.drawGlyph(ctx, parts[pi2][0], x0 + pi2 * ys * 1.55 - ys * 0.3, yy0, ys * 0.85); ctx.fillText(parts[pi2][1], x0 + pi2 * ys * 1.55 + ys * 0.15, yy0 + 0.5); }
      }
    }
    // pass 5: highlights
    function overlay(set, color) { if (!set) return; ctx.fillStyle = color; for (var key in set) { var tt = g.tiles[+key]; if (!tt) continue; var p2 = S(tt); hexPath(ctx, p2[0], p2[1], rzs - 1); ctx.fill(); } }
    overlay(hl.reach, 'rgba(255,255,255,0.25)');
    overlay(hl.expand, 'rgba(120,255,120,0.4)');
    overlay(hl.attack, 'rgba(255,60,60,0.5)');
    if (hl.dragTile >= 0 && g.tiles[hl.dragTile]) { var dtp = S(g.tiles[hl.dragTile]); ctx.strokeStyle = '#ffe680'; ctx.lineWidth = Math.max(2, rzs * 0.12); hexPath(ctx, dtp[0], dtp[1], rzs - 2); ctx.stroke(); }
    if (hl.path && hl.path.length) { ctx.fillStyle = 'rgba(255,255,255,0.85)'; hl.path.forEach(function (pi) { var p3 = S(g.tiles[pi]); ctx.beginPath(); ctx.arc(p3[0], p3[1], Math.max(2, rzs * 0.12), 0, Math.PI * 2); ctx.fill(); }); }
    // pass 6: settlements
    for (var sid in g.settlements) {
      var st = g.settlements[sid]; t = g.tiles[st.tile];
      if (!explored[t.i] || t.row < r0 || t.row > r1 || t.col < c0 || t.col > c1) continue;
      this.drawSettlement(ctx, g, st, S(t), rzs, player, lowDetail);
    }
    // pass 7: units
    for (var uid in g.units) {
      var u = g.units[uid]; t = g.tiles[u.tile];
      if (!visible[t.i] || t.row < r0 || t.row > r1 || t.col < c0 || t.col > c1) continue;
      this.drawUnit(ctx, g, u, S(t), rzs, app);
    }
    // pass 8: fog for explored-but-not-visible
    ctx.fillStyle = 'rgba(8,14,26,0.42)';
    for (r = r0; r <= r1; r++) for (c = c0; c <= c1; c++) {
      i = r * g.W + c;
      if (!explored[i] || visible[i]) continue;
      cc = S(g.tiles[i]); hexPath(ctx, cc[0], cc[1], rzs + 0.6); ctx.fill();
    }
    if (hl.selTile >= 0 && (!app || !app.sel.unit)) { var stt = g.tiles[hl.selTile]; var sp2 = S(stt); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; hexPath(ctx, sp2[0], sp2[1], rzs - 1); ctx.stroke(); }
  };

  Renderer.prototype.drawSettlement = function (ctx, g, st, cc, rz, player, lowDetail) {
    var civ = g.civs[st.civ], data = G.civData(civ), col = hexToRgb(G.civColor(civ)), ccol = G.civColor(civ);
    var x = cc[0], y = cc[1];
    // buildings cluster: count grows with population
    var n = Math.min(9, 2 + Math.floor(st.pop / 2)) + (st.isCity ? 2 : 0);
    var rnd = lcg(st.id * 7 + 3);
    if (!lowDetail) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(x, y + rz * 0.25, rz * 0.75, rz * 0.35, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = st.isCity ? '#c9c2b4' : '#b59f7a'; ctx.beginPath(); ctx.ellipse(x, y + rz * 0.18, rz * 0.7, rz * 0.32, 0, 0, Math.PI * 2); ctx.fill();
      if (G.hasBuilding(st, 'walls') || G.hasBuilding(st, 'castle')) { ctx.strokeStyle = '#7d7566'; ctx.lineWidth = Math.max(1.5, rz * 0.1); ctx.beginPath(); ctx.ellipse(x, y + rz * 0.18, rz * 0.72, rz * 0.34, 0, 0, Math.PI * 2); ctx.stroke(); }
      var houses = [];
      for (var k = 0; k < n; k++) houses.push([x + (rnd() - 0.5) * rz * 1.1, y + rz * 0.05 + (rnd() - 0.5) * rz * 0.5, rz * (0.16 + rnd() * 0.12)]);
      houses.sort(function (a, b) { return a[1] - b[1]; });
      houses.forEach(function (h, idx) {
        var hx = h[0], hy = h[1], hs = h[2];
        ctx.fillStyle = idx % 2 ? '#e9dcc2' : '#d8c8a8'; ctx.fillRect(hx - hs / 2, hy - hs * 0.5, hs, hs * 0.8);
        ctx.fillStyle = idx % 3 ? '#9c3b2e' : '#6c4a2f'; ctx.beginPath(); ctx.moveTo(hx - hs * 0.6, hy - hs * 0.5); ctx.lineTo(hx, hy - hs * 1.05); ctx.lineTo(hx + hs * 0.6, hy - hs * 0.5); ctx.closePath(); ctx.fill();
      });
      if (st.isCity) { // central tower
        var ts = rz * 0.34;
        ctx.fillStyle = '#efe6d2'; ctx.fillRect(x - ts * 0.35, y - ts * 1.1, ts * 0.7, ts * 1.3);
        ctx.fillStyle = ccol; ctx.beginPath(); ctx.moveTo(x - ts * 0.45, y - ts * 1.1); ctx.lineTo(x, y - ts * 1.7); ctx.lineTo(x + ts * 0.45, y - ts * 1.1); ctx.closePath(); ctx.fill();
      }
    } else { ctx.fillStyle = ccol; ctx.beginPath(); ctx.arc(x, y, rz * 0.5, 0, Math.PI * 2); ctx.fill(); }
    // banner
    var label = st.name + ' ' + st.pop;
    var fs = Math.max(8, Math.round(rz * 0.36));
    ctx.font = 'bold ' + fs + 'px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    var tw = ctx.measureText(label).width + fs * 1.6, bh = fs * 1.35, by = y + rz * 0.55;
    ctx.fillStyle = 'rgba(10,12,18,0.82)'; roundRect(ctx, x - tw / 2, by, tw, bh, bh / 2); ctx.fill();
    ctx.strokeStyle = ccol; ctx.lineWidth = 1.5; roundRect(ctx, x - tw / 2, by, tw, bh, bh / 2); ctx.stroke();
    ctx.fillStyle = ccol; ctx.beginPath(); ctx.arc(x - tw / 2 + bh / 2, by + bh / 2, bh * 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillText(label, x + bh * 0.3, by + bh / 2 + 0.5);
    if (st.isCapital) { ctx.fillStyle = '#f5d76e'; ctx.font = 'bold ' + fs + 'px sans-serif'; ctx.fillText('★', x - tw / 2 + bh / 2, by + bh / 2 + 0.5); }
    else if (st.isCity) { ctx.fillStyle = data.color2; ctx.font = 'bold ' + Math.round(fs * 0.8) + 'px sans-serif'; ctx.fillText('▮', x - tw / 2 + bh / 2, by + bh / 2 + 0.5); }
    if (st.pendingGrowth > 0 && st.civ === player.idx) { ctx.fillStyle = '#7ed957'; ctx.beginPath(); ctx.arc(x + tw / 2, by, bh * 0.28, 0, Math.PI * 2); ctx.fill(); }
    var maxHp = G.settlementMaxHp(g, st);
    if (st.hp < maxHp) { ctx.fillStyle = '#222'; ctx.fillRect(x - rz * 0.6, y - rz * 0.8, rz * 1.2, Math.max(2, rz * 0.12)); ctx.fillStyle = '#e05252'; ctx.fillRect(x - rz * 0.6, y - rz * 0.8, rz * 1.2 * st.hp / maxHp, Math.max(2, rz * 0.12)); }
  };
  function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r); ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r); ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r); ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath(); }

  Renderer.prototype.drawUnit = function (ctx, g, u, cc, rz, app) {
    var t = g.tiles[u.tile], isSel = app && app.sel.unit === u.id, mil = G.isMilitary(u);
    var ux = cc[0] + (mil ? 0 : rz * 0.3), uy = cc[1] + (mil ? rz * 0.05 : rz * 0.25), ur = rz * (mil ? 0.4 : 0.3);
    if (G.unitsAt(g, u.tile).length > 1 && mil) ux = cc[0] - rz * 0.2;
    if (t.settlement != null) { ur *= 0.75; ux = cc[0] + (mil ? -rz * 0.58 : rz * 0.58); uy = cc[1] - rz * 0.3; }
    var ucol = u.civ >= 0 ? G.civColor(g.civs[u.civ]) : '#2b2b2b', ucol2 = u.civ >= 0 ? G.civData(g.civs[u.civ]).color2 : '#e33';
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(ux, uy + ur * 0.95, ur * 0.9, ur * 0.35, 0, 0, Math.PI * 2); ctx.fill();
    var grd = ctx.createRadialGradient(ux - ur * 0.3, uy - ur * 0.3, ur * 0.1, ux, uy, ur);
    var rc = hexToRgb(ucol); grd.addColorStop(0, rgb(rc, 1.25)); grd.addColorStop(1, rgb(rc, 0.75));
    ctx.fillStyle = grd; ctx.strokeStyle = isSel ? '#fff' : ucol2; ctx.lineWidth = isSel ? 3 : 1.5;
    ctx.beginPath(); ctx.arc(ux, uy, ur, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    var art = AU.Assets.get('units', u.type);
    if (art) { var ah = ur * 2.6, aw = ah * art.width / art.height; ctx.drawImage(art, ux - aw / 2, uy - ah + ur * 0.6, aw, ah); }
    else this.drawGlyph(ctx, AU.UNITS[u.type].icon, ux, uy, ur * 1.1);
    if (u.hp < 100) { ctx.fillStyle = '#222'; ctx.fillRect(ux - ur, uy + ur + 1, ur * 2, 3); ctx.fillStyle = u.hp > 50 ? '#4caf50' : u.hp > 25 ? '#e6b422' : '#e05252'; ctx.fillRect(ux - ur, uy + ur + 1, ur * 2 * u.hp / 100, 3); }
    if (u.fortify && mil) { ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1; ctx.strokeRect(ux - ur - 2, uy - ur - 2, ur * 2 + 4, ur * 2 + 4); }
    if (U.level(u) > 0) { ctx.fillStyle = '#f5d76e'; for (var k = 0; k < U.level(u); k++) { ctx.beginPath(); ctx.arc(ux - ur * 0.6 + k * ur * 0.6, uy - ur - 3, Math.max(1.5, ur * 0.12), 0, Math.PI * 2); ctx.fill(); } }
    if (isSel) { ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2; hexPath(ctx, cc[0], cc[1], rz - 1, this.isoY()); ctx.stroke(); }
  };
  AU.Renderer = Renderer;
  AU.HEX_R = R;
})(globalThis.AU = globalThis.AU || {});
