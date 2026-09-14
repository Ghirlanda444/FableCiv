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
    var id = terrain === 'mountain' ? 'tundra' : terrain; if (id === 'ocean' || id === 'coast' || id === 'lake') return null; if (!AU.TERRAIN[id] && ['forest', 'jungle', 'marsh', 'hills'].indexOf(id) < 0) return null; var img = AU.Assets.get('terrain', id);
    if (!img && id === 'plains') { var gcv = this.terrainTexture('grassland'); if (!gcv) return null; this.texCanvases = this.texCanvases || {}; if (!this.texCanvases.plains) { var pc = document.createElement('canvas'); pc.width = gcv.width; pc.height = gcv.height; var pcx = pc.getContext('2d'); pcx.drawImage(gcv, 0, 0); pcx.fillStyle = 'rgba(214,176,70,0.5)'; pcx.fillRect(0, 0, pc.width, pc.height); this.texCanvases.plains = pc; } return this.texCanvases.plains; }
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
    var key = t.terrain + '|' + (groundOnly ? 'g' : (t.hills ? 1 : 0) + '|' + (t.feature || '')) + '|' + (t.hills ? 'h' : '') + (t.feature || '') + '|' + (t.i % 4) + '|' + rz + '|' + (tex ? 1 : 0) + (feat ? 1 : 0) + (hillsArt ? 1 : 0) + (mtn ? 1 : 0) + (ftex ? 1 : 0) + (htex ? 1 : 0) + '|' + (this._wsh ? Math.max(0, this._wsh[t.i]) : 0);
    var sp = this.sprites[key];
    if (sp) return sp;
    if (this.spriteCount > 2400) { this.sprites = {}; this.spriteCount = 0; }
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
    if (this.spriteCount > 2400) { this.sprites = {}; this.spriteCount = 0; }
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
  // Organic tile outline: a hexagon whose radius wobbles with the angle (deterministic per variant), so land
  // edges are never straight and neighbouring tiles overlap and blend like a painted map.
  var WOB_PH = [[0.3, 1.9], [2.1, 0.4], [4.0, 3.3], [5.2, 1.1]];
  function wob(variant, a) { var ph = WOB_PH[variant & 3]; return 1 + 0.085 * Math.sin(3 * a + ph[0]) + 0.05 * Math.sin(7 * a + ph[1]) + 0.03 * Math.sin(11 * a + ph[0] * 2); }
  function wobblyPath(ctx, cx, cy, r, variant, sy) {
    sy = sy || 1; ctx.beginPath();
    for (var k = 0; k < 24; k++) { var a = Math.PI * 2 * k / 24 - Math.PI / 6, rr = r * wob(variant, a); var x = cx + rr * Math.cos(a), y = cy + rr * Math.sin(a) * sy; if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.closePath();
  }
  var LAND_OVER = 1.14; // land sprites reach this far beyond the hex radius (they overlap and blend)
  var SAND = [222, 204, 150], SAND_WET = [196, 178, 122], ROCK = [118, 112, 104], MANGROVE = [52, 96, 56], SHALLOW = [86, 196, 214], DEEP = [14, 44, 88], COASTC = [26, 86, 148], LAKEC = [56, 150, 210], RIVERC = [64, 160, 222];
  Renderer.prototype.paintTile = function (t, rz, groundOnly) {
    var water = AU.TERRAIN[t.terrain].water;
    if (water) return this.paintWater(t, rz);
    var Rw = rz * LAND_OVER, w = Math.ceil(Rw * 2.3) + 2, h = w;
    var cv = document.createElement('canvas'); cv.width = w; cv.height = h; cv.hexW = w; cv.hexH = h;
    var ctx = cv.getContext('2d'), cx = w / 2, cy = h / 2, variant = t.i % 4, rnd = lcg(t.i % 4 + 11 + (t.hills ? 5 : 0) + (t.feature ? 17 : 0));
    var base = PAL[t.terrain], detail = rz >= 14;
    ctx.save(); wobblyPath(ctx, cx, cy, Rw * 1.02, variant); ctx.clip();
    var tex = this.terrainTexture(t.terrain), painted = !!tex;
    if (painted) {
      var pat = ctx.createPattern(tex, 'repeat'), sc = rz / R * 0.36, v = t.i % 4;
      if (pat.setTransform && typeof DOMMatrix !== 'undefined') pat.setTransform(new DOMMatrix().translate(cx - (137 * v + 40) * sc, cy - (89 * v + 30) * sc).scale(sc));
      ctx.fillStyle = pat; ctx.fillRect(0, 0, w, h);
      var lt = ctx.createRadialGradient(cx - rz * 0.3, cy - rz * 0.35, rz * 0.2, cx, cy, rz * 1.35); lt.addColorStop(0, 'rgba(255,255,255,0.07)'); lt.addColorStop(1, 'rgba(0,0,0,0.07)'); ctx.fillStyle = lt; ctx.fillRect(0, 0, w, h);
    } else {
      var grad = ctx.createRadialGradient(cx - rz * 0.3, cy - rz * 0.35, rz * 0.2, cx, cy, rz * 1.3);
      grad.addColorStop(0, rgb(base, 1.08)); grad.addColorStop(1, rgb(base, 0.9));
      ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
    }
    var self0 = this;
    function overlayTex(id, alphaMax, scaleK) {
      var tx = self0.terrainTexture(id); if (!tx) return false;
      var pt = ctx.createPattern(tx, 'repeat'), sc2 = rz / R * (scaleK || 0.3), v2 = (t.i * 7) % 4;
      if (pt.setTransform && typeof DOMMatrix !== 'undefined') pt.setTransform(new DOMMatrix().translate(cx - (151 * v2 + 60) * sc2, cy - (97 * v2 + 20) * sc2).scale(sc2));
      ctx.save(); ctx.globalAlpha = alphaMax; ctx.fillStyle = pt; ctx.fillRect(0, 0, w, h); ctx.restore();
      var edge = ctx.createRadialGradient(cx, cy, rz * 0.55, cx, cy, rz * 1.15); edge.addColorStop(0, 'rgba(0,0,0,0)'); edge.addColorStop(1, 'rgba(0,0,0,0.2)'); ctx.fillStyle = edge; ctx.fillRect(0, 0, w, h);
      return true;
    }
    t._texFeat = false; t._texHills = false;
    if (t.hills && t.terrain !== 'mountain' && overlayTex('hills', 0.85, 0.34)) t._texHills = true;
    if (t.feature && (t.feature === 'forest' || t.feature === 'jungle' || t.feature === 'marsh') && overlayTex(t.feature, 0.95, 0.3)) t._texFeat = true;
    if (detail && !painted) {
      var n = Math.round(rz * 1.2);
      for (var k = 0; k < n; k++) { var px = cx + (rnd() - 0.5) * rz * 1.9, py = cy + (rnd() - 0.5) * rz * 2.0; ctx.fillStyle = rgb(base, 0.8 + rnd() * 0.45, 0.35); ctx.fillRect(px, py, 1 + rnd() * 2, 1 + rnd() * 1.5); }
      if (t.terrain === 'grassland' || t.terrain === 'plains' || t.terrain === 'tundra') {
        ctx.strokeStyle = rgb(base, 0.72, 0.5); ctx.lineWidth = Math.max(1, rz * 0.045);
        for (var gt = 0; gt < 7; gt++) { var gx = cx + (rnd() - 0.5) * rz * 1.6, gy = cy + (rnd() - 0.5) * rz * 1.6; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx - rz * 0.06, gy - rz * 0.14); ctx.moveTo(gx, gy); ctx.lineTo(gx + rz * 0.07, gy - rz * 0.12); ctx.stroke(); }
      } else if (t.terrain === 'desert') {
        ctx.strokeStyle = rgb(base, 0.85, 0.7); ctx.lineWidth = Math.max(1, rz * 0.05);
        for (var dn = 0; dn < 3; dn++) { var dx = cx + (rnd() - 0.5) * rz, dy = cy + (rnd() - 0.5) * rz * 1.3; ctx.beginPath(); ctx.moveTo(dx - rz * 0.35, dy); ctx.quadraticCurveTo(dx, dy - rz * 0.15, dx + rz * 0.35, dy); ctx.stroke(); }
      } else if (t.terrain === 'snow') {
        ctx.fillStyle = 'rgba(160,190,230,0.25)'; for (var sn = 0; sn < 4; sn++) { ctx.beginPath(); ctx.ellipse(cx + (rnd() - 0.5) * rz, cy + (rnd() - 0.5) * rz, rz * 0.3, rz * 0.12, 0, 0, Math.PI * 2); ctx.fill(); }
      }
    }
    ctx.restore();
    // soft, irregular edge: fade the rim out so neighbouring tiles blend into each other
    ctx.save(); ctx.globalCompositeOperation = 'destination-in';
    var mask = ctx.createRadialGradient(cx, cy, Rw * 0.78, cx, cy, Rw * 1.1); mask.addColorStop(0, 'rgba(0,0,0,1)'); mask.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = mask; wobblyPath(ctx, cx, cy, Rw * 1.02, variant); ctx.fill(); ctx.restore();
    var hillsArt = t.hills && t.terrain !== 'mountain' ? this.featureArt('hills') : null, mtnArt = t.terrain === 'mountain' ? this.featureArt('mountain') : null, featArt = t.feature ? this.featureArt(t.feature) : null;
    if (!groundOnly) this.paintFeatures(ctx, t, cx, cy, rz, base, rnd, detail, hillsArt, mtnArt, featArt, false);
    return cv;
  };
  // Water is painted procedurally (no photo textures): deep ocean, lighter coast, bright shallows next to land,
  // with a few wave crests. Overlaps its neighbours slightly so no hex seams show.
  // Water caches (per game): number of land neighbours and the blended colour of every water tile.
  Renderer.prototype.waterCache = function (g) { if (this._wg !== g) { this._wg = g; this._wsh = new Int8Array(g.tiles.length).fill(-1); this._wcol = new Array(g.tiles.length); } };
  Renderer.prototype.shallowOf = function (g, t) {
    var v = this._wsh[t.i]; if (v >= 0) return v;
    var ln = 0, nbs = Hex.neighborsOf(t.col, t.row, g.W, g.H); for (var k = 0; k < nbs.length; k++) if (!G.isWater(g.tiles[nbs[k]])) ln++;
    this._wsh[t.i] = ln; return ln;
  };
  Renderer.prototype.waterColor = function (g, t) { var c = this._wcol[t.i]; if (c) return c; var base = t.terrain === 'ocean' ? DEEP : t.terrain === 'lake' ? LAKEC : COASTC; c = mix(base, SHALLOW, Math.min(0.55, this.shallowOf(g, t) * 0.16)); this._wcol[t.i] = c; return c; };
  Renderer.prototype.paintWater = function (t, rz) {
    var Rw = rz * 1.08, w = Math.ceil(Rw * 2.3) + 2, h = w, cv = document.createElement('canvas'); cv.width = w; cv.height = h; cv.hexW = w; cv.hexH = h;
    var ctx = cv.getContext('2d'), cx = w / 2, cy = h / 2, rnd = lcg(t.i % 4 + 31), variant = t.i % 4;
    var shallow = this._wsh ? Math.max(0, this._wsh[t.i]) : 0, col = this._wcol && this._wcol[t.i] ? this._wcol[t.i] : COASTC; // shallow = number of land neighbours
    ctx.fillStyle = rgb(col, 1, 0.35); ctx.fillRect(0, 0, w, h); // mostly transparent: the blended flat fill below carries the colour
    if (rz >= 12) { // wave crests
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.14 + shallow * 0.03) + ')'; ctx.lineWidth = Math.max(1, rz * 0.045); ctx.lineCap = 'round';
      for (var wv = 0; wv < 4; wv++) { var wx = cx + (rnd() - 0.5) * rz * 1.4, wy = cy + (rnd() - 0.5) * rz * 1.5, wl = rz * (0.3 + rnd() * 0.35); ctx.beginPath(); ctx.moveTo(wx - wl / 2, wy); ctx.quadraticCurveTo(wx - wl * 0.25, wy - rz * 0.07, wx, wy); ctx.quadraticCurveTo(wx + wl * 0.25, wy + rz * 0.07, wx + wl / 2, wy); ctx.stroke(); }
      if (t.terrain === 'ocean' && shallow === 0) { ctx.fillStyle = 'rgba(0,0,30,0.08)'; for (var dk = 0; dk < 3; dk++) { ctx.beginPath(); ctx.ellipse(cx + (rnd() - 0.5) * rz, cy + (rnd() - 0.5) * rz, rz * 0.5, rz * 0.25, rnd() * 3, 0, Math.PI * 2); ctx.fill(); } }
    }
    ctx.save(); ctx.globalCompositeOperation = 'destination-in';
    var mask = ctx.createRadialGradient(cx, cy, Rw * 0.6, cx, cy, Rw * 1.08); mask.addColorStop(0, 'rgba(0,0,0,1)'); mask.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = mask; wobblyPath(ctx, cx, cy, Rw * 1.02, variant); ctx.fill(); ctx.restore();
    return cv;
  };
  // Soft round blobs placed on the water-facing edges of a land tile (beach sand, rocks, mangroves) or on the
  // land-facing edges of a water tile (bright shallows). One cached sprite per kind and zoom.
  Renderer.prototype.haloSprite = function (kind, rz) {
    var key = 'H|' + kind + '|' + rz, sp = this.sprites[key]; if (sp) return sp;
    var r = rz * (kind === 'shallow' ? 0.95 : 0.78), w = Math.ceil(r * 2) + 2, cv = document.createElement('canvas'); cv.width = w; cv.height = w;
    var ctx = cv.getContext('2d'), c = w / 2, col = kind === 'shallow' ? SHALLOW : kind === 'rocks' || kind === 'cliff' ? ROCK : kind === 'mangrove' ? MANGROVE : SAND, rnd = lcg(kind.length * 13 + rz);
    var g = ctx.createRadialGradient(c, c, 0, c, c, r); g.addColorStop(0, rgb(col, 1, kind === 'shallow' ? 0.75 : 1)); g.addColorStop(kind === 'shallow' ? 0.35 : 0.55, rgb(col, 1, kind === 'shallow' ? 0.55 : 1)); g.addColorStop(1, rgb(col, 1, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c, c, r, 0, Math.PI * 2); ctx.fill();
    if (rz >= 12 && (kind === 'rocks' || kind === 'cliff')) { for (var k = 0; k < 6; k++) { var rx = c + (rnd() - 0.5) * r * 1.1, ry = c + (rnd() - 0.5) * r * 1.1, rs = r * (0.08 + rnd() * 0.1); ctx.fillStyle = rgb(ROCK, 0.55 + rnd() * 0.3); ctx.beginPath(); ctx.ellipse(rx, ry, rs * 1.3, rs, rnd() * 3, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = rgb(ROCK, 1.35, 0.7); ctx.beginPath(); ctx.ellipse(rx - rs * 0.3, ry - rs * 0.3, rs * 0.6, rs * 0.4, 0, 0, Math.PI * 2); ctx.fill(); } }
    if (rz >= 12 && kind === 'mangrove') { ctx.fillStyle = 'rgba(70,130,60,0.9)'; for (var m = 0; m < 7; m++) { ctx.beginPath(); ctx.arc(c + (rnd() - 0.5) * r * 1.2, c + (rnd() - 0.5) * r * 1.2, r * (0.1 + rnd() * 0.1), 0, Math.PI * 2); ctx.fill(); } }
    if (rz >= 12 && kind === 'beach') { ctx.fillStyle = rgb(SAND_WET, 1, 0.45); for (var b = 0; b < 5; b++) { ctx.beginPath(); ctx.ellipse(c + (rnd() - 0.5) * r * 1.2, c + (rnd() - 0.5) * r * 1.2, r * 0.18, r * 0.07, rnd() * 3, 0, Math.PI * 2); ctx.fill(); } }
    this.sprites[key] = cv; this.spriteCount++; return cv;
  };
  // A coral reef inside a coast tile: pale sand patch with coral clumps and a foam ring.
  Renderer.prototype.reefSprite = function (rz, variant) {
    var key = 'RF|' + rz + '|' + variant, sp = this.sprites[key]; if (sp) return sp;
    var w = Math.ceil(rz * 2) + 2, cv = document.createElement('canvas'); cv.width = w; cv.height = w; var ctx = cv.getContext('2d'), c = w / 2, rnd = lcg(variant * 7 + 5);
    var g = ctx.createRadialGradient(c, c, 0, c, c, rz * 0.8); g.addColorStop(0, 'rgba(150,225,215,0.85)'); g.addColorStop(0.6, 'rgba(120,205,205,0.55)'); g.addColorStop(1, 'rgba(120,205,205,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c, c, rz * 0.8, 0, Math.PI * 2); ctx.fill();
    var cols = ['#e9805a', '#f2b64f', '#6ad0b0', '#d85f8a', '#f0e39a'];
    for (var k = 0; k < 9; k++) { var a = rnd() * Math.PI * 2, d = rz * (0.12 + rnd() * 0.42), x = c + Math.cos(a) * d, y = c + Math.sin(a) * d * 0.8, rr = rz * (0.05 + rnd() * 0.07); ctx.fillStyle = cols[k % cols.length]; ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(x - rr * 0.3, y - rr * 0.3, rr * 0.4, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = Math.max(1, rz * 0.05); ctx.setLineDash([rz * 0.15, rz * 0.12]); ctx.beginPath(); ctx.ellipse(c, c, rz * 0.62, rz * 0.5, rnd(), 0, Math.PI * 2); ctx.stroke();
    this.sprites[key] = cv; this.spriteCount++; return cv;
  };
  // Unexplored tiles: a soft dark blob so the edge of the known world fades out instead of ending in hexagons.
  Renderer.prototype.fogSprite = function (rz) {
    var key = 'FOG|' + rz, sp = this.sprites[key]; if (sp) return sp;
    var r = rz * 1.35, w = Math.ceil(r * 2) + 2, cv = document.createElement('canvas'); cv.width = w; cv.height = w; var ctx = cv.getContext('2d'), c = w / 2;
    var g = ctx.createRadialGradient(c, c, 0, c, c, r); g.addColorStop(0, 'rgba(6,12,22,1)'); g.addColorStop(0.72, 'rgba(6,12,22,1)'); g.addColorStop(1, 'rgba(6,12,22,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c, c, r, 0, Math.PI * 2); ctx.fill();
    this.sprites[key] = cv; this.spriteCount++; return cv;
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
    // neighbour directions (odd-r offset) and the hex corners each edge joins
    var DIRS_E = [[1, 0], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1]], DIRS_O = [[1, 0], [1, -1], [0, -1], [-1, 0], [0, 1], [1, 1]];
    var EDGE_ANG = [0, -Math.PI / 3, -2 * Math.PI / 3, Math.PI, 2 * Math.PI / 3, Math.PI / 3]; // direction of each edge's midpoint
    function nbAt(c, r, e) { var d = (r & 1) ? DIRS_O[e] : DIRS_E[e], nc = c + d[0], nr = r + d[1]; if (nc < 0 || nc >= g.W || nr < 0 || nr >= g.H) return null; return g.tiles[nr * g.W + nc]; }
    function drawSprite(sp, p, scale) { scale = scale || 1; var sw = sp.width * scale, sh = sp.height * scale; if (iso) ctx.drawImage(sp, Math.round(p[0] - sw / 2), Math.round(p[1] - sh * isoY / 2), sw, Math.round(sh * isoY) + 1); else ctx.drawImage(sp, Math.round(p[0] - sw / 2), Math.round(p[1] - sh / 2), sw, sh); }
    this.waterCache(g);
    // pass 1: water, flat fills first (the number of land neighbours drives the shallow tint)
    var landTiles = [], coastLand = [], reefs = [], waterTiles = [];
    for (r = r0; r <= r1; r++) for (c = c0; c <= c1; c++) {
      i = r * g.W + c; t = g.tiles[i];
      if (!explored[i]) continue;
      if (!G.isWater(t)) { landTiles.push(t); continue; }
      var pw = S(t); ctx.fillStyle = rgb(this.waterColor(g, t)); hexPath(ctx, pw[0], pw[1], rzs * 1.04); ctx.fill();
      waterTiles.push(t); if (t.shore === 'reef') reefs.push(t);
    }
    // pass 1w: smooth colour transitions between water tiles (deep ocean -> coast -> shallows) and the wave sprites
    for (var wi = 0; wi < waterTiles.length; wi++) {
      t = waterTiles[wi]; var pw2 = S(t), cA = this.waterColor(g, t);
      for (var we = 0; we < 6; we++) {
        var wn = nbAt(t.col, t.row, we); if (!wn || !G.isWater(wn) || wn.i < t.i || !explored[wn.i]) continue;
        var cB = this.waterColor(g, wn); if (Math.abs(cA[0] - cB[0]) + Math.abs(cA[1] - cB[1]) + Math.abs(cA[2] - cB[2]) < 6) continue;
        var ang2 = EDGE_ANG[we], dxu = Math.cos(ang2), dyu = Math.sin(ang2) * isoY, mx2 = pw2[0] + dxu * rzs * SQ3 / 2, my2 = pw2[1] + dyu * rzs * SQ3 / 2;
        var half = rzs * 0.42, gr2 = ctx.createLinearGradient(mx2 - dxu * half, my2 - dyu * half, mx2 + dxu * half, my2 + dyu * half); gr2.addColorStop(0, rgb(cA)); gr2.addColorStop(1, rgb(cB));
        var px2 = -Math.sin(ang2) * rzs * 0.52, py2 = Math.cos(ang2) * rzs * 0.52 * isoY;
        ctx.fillStyle = gr2; ctx.beginPath(); ctx.moveTo(mx2 - dxu * half + px2, my2 - dyu * half + py2); ctx.lineTo(mx2 + dxu * half + px2, my2 + dyu * half + py2); ctx.lineTo(mx2 + dxu * half - px2, my2 + dyu * half - py2); ctx.lineTo(mx2 - dxu * half - px2, my2 - dyu * half - py2); ctx.closePath(); ctx.fill();
      }
    }
    for (var wj = 0; wj < waterTiles.length; wj++) drawSprite(this.tileSprite(waterTiles[wj], Math.round(rzs), iso), S(waterTiles[wj]));
    // pass 1a: shallows and the shore (beach sand, rocks, mangroves) as bands hugging the wobbly coastline
    var self1 = this;
    function coastPath(t, edges, radius, extraWob) { // one path along the given edges of the tile's wobbly outline
      var p = S(t), v = t.i % 4; ctx.beginPath();
      for (var q = 0; q < edges.length; q++) {
        var e = edges[q], a0 = EDGE_ANG[e] - Math.PI / 6, a1 = EDGE_ANG[e] + Math.PI / 6, cont = q > 0 && ((edges[q - 1] + 1) % 6 === e || (e + 1) % 6 === edges[q - 1]);
        for (var sm = 0; sm <= 6; sm++) { var aa = a0 + (a1 - a0) * sm / 6, wr = radius * rzs * wob(v, aa) + (extraWob ? Math.sin(aa * 9 + v) * rzs * extraWob : 0); var fx = p[0] + Math.cos(aa) * wr, fy = p[1] + Math.sin(aa) * wr * isoY; if (sm === 0 && !cont) ctx.moveTo(fx, fy); else ctx.lineTo(fx, fy); }
      }
    }
    if (!lowDetail) {
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (var li = 0; li < landTiles.length; li++) {
        t = landTiles[li]; if (!t.shore) continue;
        var edges = []; for (var e1 = 0; e1 < 6; e1++) { var nb1 = nbAt(t.col, t.row, e1); if (nb1 && G.isWater(nb1)) edges.push(e1); }
        if (!edges.length) continue;
        // edge order: start after a gap so contiguous runs join into one stroke
        var startE = 0; for (var q0 = 0; q0 < 6; q0++) if (edges.indexOf(q0) >= 0 && edges.indexOf((q0 + 5) % 6) < 0) { startE = q0; break; }
        edges.sort(function (a, b) { return ((a - startE + 6) % 6) - ((b - startE + 6) % 6); });
        coastPath(t, edges, 1.26, 0); ctx.strokeStyle = rgb(SHALLOW, 1, 0.5); ctx.lineWidth = Math.max(2, rzs * 0.55); ctx.stroke();
        var shoreCol = t.shore === 'beach' ? SAND : t.shore === 'mangrove' ? MANGROVE : ROCK;
        coastPath(t, edges, 1.1, 0.02); ctx.strokeStyle = rgb(shoreCol, 1, 0.95); ctx.lineWidth = Math.max(1.5, rzs * (t.shore === 'cliff' ? 0.2 : 0.28)); ctx.stroke();
        if (t.shore === 'beach') { coastPath(t, edges, 1.17, 0.015); ctx.strokeStyle = rgb(SAND_WET, 1, 0.55); ctx.lineWidth = Math.max(1, rzs * 0.1); ctx.stroke(); }
        if (t.shore !== 'beach') { var pl = S(t), halo = this.haloSprite(t.shore, Math.round(rzs)); for (var q1 = 0; q1 < edges.length; q1++) { var ang = EDGE_ANG[edges[q1]]; drawSprite(halo, [pl[0] + Math.cos(ang) * rzs * 0.98, pl[1] + Math.sin(ang) * rzs * 0.98 * isoY], 0.55); } }
        for (var q2 = 0; q2 < edges.length; q2++) coastLand.push([t, edges[q2]]);
      }
    }
    // pass 1b: land tiles with soft irregular edges (rows back to front so the overlaps read as a painted map)
    for (var lj = 0; lj < landTiles.length; lj++) { t = landTiles[lj]; drawSprite(this.tileSprite(t, Math.round(rzs), iso), S(t)); }
    // pass 1c: reefs and foam lines hugging the wobbly coast
    if (!lowDetail) {
      for (var ri = 0; ri < reefs.length; ri++) drawSprite(this.reefSprite(Math.round(rzs), reefs[ri].i % 4), S(reefs[ri]));
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (var fi = 0; fi < coastLand.length; fi++) {
        var ft = coastLand[fi][0], fe = coastLand[fi][1], fp = S(ft), fv = ft.i % 4, a0 = EDGE_ANG[fe] - Math.PI / 6, a1 = EDGE_ANG[fe] + Math.PI / 6;
        for (var ring = 0; ring < 2; ring++) {
          var rr = rzs * (ring ? 1.36 : 1.17); ctx.strokeStyle = ring ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.5)'; ctx.lineWidth = Math.max(1, rzs * (ring ? 0.05 : 0.07));
          ctx.beginPath();
          for (var sm = 0; sm <= 6; sm++) { var aa = a0 + (a1 - a0) * sm / 6, wr = rr * wob(fv, aa) + (ring ? Math.sin(aa * 9 + fv) * rzs * 0.04 : 0); var fx = fp[0] + Math.cos(aa) * wr, fy = fp[1] + Math.sin(aa) * wr * isoY; if (sm === 0) ctx.moveTo(fx, fy); else ctx.lineTo(fx, fy); }
          ctx.stroke();
        }
      }
    }
    // pass 1d: upright features (isometric view), back to front
    if (iso) for (r = r0; r <= r1; r++) for (c = c0; c <= c1; c++) {
      i = r * g.W + c; t = g.tiles[i];
      if (!explored[i]) continue;
      var fsp = this.featureSprite(t, Math.round(rzs)); if (!fsp) continue;
      var pf = S(t); ctx.drawImage(fsp, Math.round(pf[0] - fsp.width / 2), Math.round(pf[1] - fsp.anchorY));
    }
    // pass 2: rivers. Thin streams for ordinary rivers; navigable reaches are wide, with sandy banks.
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    var riverRuns = [];
    (g.rivers || []).forEach(function (path) {
      var pts = [], anyVisible = false;
      for (var k = 0; k < path.length; k++) { var pt = g.tiles[path[k]]; if (!pt) return; if (explored[pt.i] && pt.row >= r0 - 1 && pt.row <= r1 + 1 && pt.col >= c0 - 1 && pt.col <= c1 + 1) anyVisible = true; var sp0 = S(pt); pts.push([sp0[0] + Math.sin(pt.i * 1.7) * rzs * 0.12, sp0[1] + Math.cos(pt.i * 2.3) * rzs * 0.1 * isoY, !!pt.navigable]); }
      if (!anyVisible || pts.length < 2) return;
      // split into runs: the wide navigable part starts one point before the first navigable tile so the join is smooth
      var firstNav = -1; for (var q = 0; q < pts.length; q++) if (pts[q][2]) { firstNav = q; break; }
      if (firstNav < 0) riverRuns.push([pts, false]); else { riverRuns.push([pts.slice(0, firstNav + 1), false]); riverRuns.push([pts.slice(Math.max(0, firstNav - 1)), true]); }
    });
    function strokePath(ctx, pts) {
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
      for (var m = 1; m < pts.length - 1; m++) { var mx = (pts[m][0] + pts[m + 1][0]) / 2, my = (pts[m][1] + pts[m + 1][1]) / 2; ctx.quadraticCurveTo(pts[m][0], pts[m][1], mx, my); }
      ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]); ctx.stroke();
    }
    riverRuns.forEach(function (run) { if (run[1] || run[0].length < 2) return; var pts = run[0];
      ctx.strokeStyle = 'rgba(20,60,110,0.45)'; ctx.lineWidth = Math.max(2, rzs * 0.2); strokePath(ctx, pts);
      ctx.strokeStyle = rgb(RIVERC); ctx.lineWidth = Math.max(1.2, rzs * 0.12); strokePath(ctx, pts);
      if (!lowDetail) { ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = Math.max(0.8, rzs * 0.035); strokePath(ctx, pts); }
    });
    riverRuns.forEach(function (run) { if (!run[1] || run[0].length < 2) return; var pts = run[0];
      ctx.strokeStyle = rgb(SAND); ctx.lineWidth = Math.max(4, rzs * 0.62); strokePath(ctx, pts);
      ctx.strokeStyle = rgb(SAND_WET, 1, 0.6); ctx.lineWidth = Math.max(3, rzs * 0.5); strokePath(ctx, pts);
      ctx.strokeStyle = rgb(mix(COASTC, SHALLOW, 0.35)); ctx.lineWidth = Math.max(2.5, rzs * 0.42); strokePath(ctx, pts);
      if (!lowDetail) { ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = Math.max(1, rzs * 0.06); ctx.setLineDash([rzs * 0.5, rzs * 0.7]); strokePath(ctx, pts); ctx.setLineDash([]); }
    });
    // cover unexplored tiles again (rivers and blended edges may reach into them): soft dark fog
    var fogSp = this.fogSprite(Math.round(rzs));
    for (r = r0; r <= r1; r++) for (c = c0; c <= c1; c++) { i = r * g.W + c; if (explored[i]) continue; drawSprite(fogSp, S(g.tiles[i])); }
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
            var rart = AU.Assets.get('resources', t.resource), rx0 = cc[0] + rzs * 0.34, ry0 = cc[1] + rzs * 0.05 * isoY;
            if (rart) { ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(rx0, ry0 + rzs * 0.3, rzs * 0.36, rzs * 0.13, 0, 0, Math.PI * 2); ctx.fill(); this.drawArt(ctx, rart, rx0, ry0 + rzs * 0.3, rzs * 0.86, 0.92); }
            else { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.arc(cc[0] + rzs * 0.42, cc[1] + rzs * 0.38, rzs * 0.3, 0, Math.PI * 2); ctx.fill(); this.drawGlyph(ctx, Rs.icon, cc[0] + rzs * 0.42, cc[1] + rzs * 0.38, rzs * 0.44); }
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
    // pass 4b: tile yields (option): Civ 6 style, small icons clustered in the tile, one icon per point (a number above 3)
    if (this.showYields && rz >= 11) {
      var YC = { food: ['#5ec45e', '#1f5a1f'], production: ['#e8923a', '#6b3a0a'], gold: ['#f0d040', '#7a5a00'], science: ['#4aa8ff', '#0b3d75'], culture: ['#c27bff', '#4a1a7a'], faith: ['#f4f0ff', '#6a5a9a'] };
      var dot = Math.max(2.2, rz * 0.11), gap = dot * 2.35;
      for (r = r0; r <= r1; r++) for (c = c0; c <= c1; c++) {
        i = r * g.W + c; t = g.tiles[i];
        if (!explored[i] || (AU.TERRAIN[t.terrain].impassable && !t.natural) || t.settlement != null) continue;
        var so = t.owner >= 0 ? g.settlements[t.owner] : null;
        var yy = so ? G.tileYields(g, t, so) : AU.baseTileYields(t, player);
        var groups = []; for (var yk in YC) { var nv = Math.floor(yy[yk] || 0); if (nv >= 1) groups.push([yk, nv]); }
        if (!groups.length) continue;
        cc = S(t);
        var rows = groups.length > 3 ? 2 : 1, perRow = Math.ceil(groups.length / rows), gy = cc[1] + rz * 0.42 * isoY - (rows - 1) * gap * 0.55;
        function groupW(gr) { return Math.min(gr[1], 3) * dot * 2.1 + (gr[1] > 3 ? dot * 2.2 : 0); }
        for (var rowI = 0; rowI < rows; rowI++) {
          var rowGroups = groups.slice(rowI * perRow, rowI * perRow + perRow), gw = 0;
          rowGroups.forEach(function (gr) { gw += groupW(gr) + gap * 0.6; });
          var gx = cc[0] - gw / 2 + gap * 0.3, yPos = gy + rowI * gap * 1.1;
          rowGroups.forEach(function (gr) {
            var n = gr[1], shown = Math.min(n, 3), col2 = YC[gr[0]];
            for (var k2 = 0; k2 < shown; k2++) { var dx = gx + k2 * dot * 2.1 + dot; ctx.fillStyle = col2[1]; ctx.beginPath(); ctx.arc(dx, yPos, dot + 0.8, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = col2[0]; ctx.beginPath(); ctx.arc(dx, yPos, dot, 0, Math.PI * 2); ctx.fill(); }
            if (n > 3) { ctx.font = 'bold ' + Math.round(dot * 2.2) + 'px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.strokeText(String(n), gx + shown * dot * 2.1 + dot * 0.3, yPos); ctx.fillStyle = col2[0]; ctx.fillText(String(n), gx + shown * dot * 2.1 + dot * 0.3, yPos); }
            gx += groupW(gr) + gap * 0.6;
          });
        }
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
    var art = AU.Assets.getFor('units', u.type, u.civ >= 0 ? AU.cultureOf(g.civs[u.civ]) : null);
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
