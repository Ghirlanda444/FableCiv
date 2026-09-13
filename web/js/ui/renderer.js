// Canvas map renderer with pan/zoom camera and fog of war.
(function (AU) {
  var Hex = AU.Hex, G = AU.G, U = AU.U;
  var R = 30; // base hex radius in world units

  function Renderer(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.cam = { x: 0, y: 0, zoom: 1 };
    this.dpr = 1; this.w = 0; this.h = 0;
    this.highlights = { reach: null, attack: null, expand: null, path: null, selTile: -1 };
    this.showGrid = false;
  }
  Renderer.prototype.resize = function () {
    var dpr = window.devicePixelRatio || 1;
    var w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    this.canvas.width = Math.round(w * dpr); this.canvas.height = Math.round(h * dpr);
    this.dpr = dpr; this.w = w; this.h = h;
  };
  Renderer.prototype.worldToScreen = function (wx, wy) { return [(wx - this.cam.x) * this.cam.zoom + this.w / 2, (wy - this.cam.y) * this.cam.zoom + this.h / 2]; };
  Renderer.prototype.screenToWorld = function (sx, sy) { return [(sx - this.w / 2) / this.cam.zoom + this.cam.x, (sy - this.h / 2) / this.cam.zoom + this.cam.y]; };
  Renderer.prototype.tileAtScreen = function (g, sx, sy) {
    var w = this.screenToWorld(sx, sy), o = Hex.fromPixel(w[0], w[1], R);
    if (o[0] < 0 || o[0] >= g.W || o[1] < 0 || o[1] >= g.H) return -1;
    return o[1] * g.W + o[0];
  };
  Renderer.prototype.tileCenter = function (t) { return Hex.center(t.col, t.row, R); };
  Renderer.prototype.centerOn = function (g, tileIdx, animate) {
    var t = g.tiles[tileIdx], c = this.tileCenter(t);
    this.cam.x = c[0]; this.cam.y = c[1];
    this.clampCamera(g);
  };
  Renderer.prototype.clampCamera = function (g) {
    var maxX = R * Hex.SQRT3 * (g.W + 0.5), maxY = R * 1.5 * g.H;
    this.cam.x = Math.max(0, Math.min(maxX, this.cam.x));
    this.cam.y = Math.max(0, Math.min(maxY, this.cam.y));
    this.cam.zoom = Math.max(0.35, Math.min(2.6, this.cam.zoom));
  };

  function shade(hex, f) {
    var n = parseInt(hex.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    r = Math.max(0, Math.min(255, Math.round(r * f))); g = Math.max(0, Math.min(255, Math.round(g * f))); b = Math.max(0, Math.min(255, Math.round(b * f)));
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }
  function hexPath(ctx, cx, cy, r) {
    ctx.beginPath();
    for (var i = 0; i < 6; i++) { var a = Math.PI / 180 * (60 * i - 30); var x = cx + r * Math.cos(a), y = cy + r * Math.sin(a); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.closePath();
  }

  Renderer.prototype.draw = function (g, app) {
    var ctx = this.ctx, z = this.cam.zoom, dpr = this.dpr;
    var player = G.player(g);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#08131f'; ctx.fillRect(0, 0, this.w, this.h);
    ctx.translate(this.w / 2, this.h / 2); ctx.scale(z, z); ctx.translate(-this.cam.x, -this.cam.y);
    // visible range of rows/cols
    var tl = this.screenToWorld(0, 0), br = this.screenToWorld(this.w, this.h);
    var r0 = Math.max(0, Math.floor(tl[1] / (R * 1.5)) - 1), r1 = Math.min(g.H - 1, Math.ceil(br[1] / (R * 1.5)) + 1);
    var c0 = Math.max(0, Math.floor(tl[0] / (R * Hex.SQRT3)) - 1), c1 = Math.min(g.W - 1, Math.ceil(br[0] / (R * Hex.SQRT3)) + 1);
    var explored = player.explored, visible = player.visible || explored;
    var lowDetail = z < 0.6;
    var fontEmoji = Math.round(R * 0.7) + 'px sans-serif';
    var hl = this.highlights;
    var r, c, i, t, cc;
    // pass 1: terrain
    for (r = r0; r <= r1; r++) for (c = c0; c <= c1; c++) {
      i = r * g.W + c; t = g.tiles[i];
      if (!explored[i]) continue;
      cc = Hex.center(c, r, R);
      var col = AU.TERRAIN[t.terrain].color;
      if (t.hills) col = shade(col, 0.85);
      ctx.fillStyle = col; hexPath(ctx, cc[0], cc[1], R + 0.6); ctx.fill();
      if (t.hills && !lowDetail) { ctx.fillStyle = shade(AU.TERRAIN[t.terrain].color, 0.7); ctx.beginPath(); ctx.moveTo(cc[0] - R * 0.5, cc[1] + R * 0.3); ctx.quadraticCurveTo(cc[0] - R * 0.2, cc[1] - R * 0.25, cc[0], cc[1] + R * 0.25); ctx.quadraticCurveTo(cc[0] + R * 0.25, cc[1] - R * 0.3, cc[0] + R * 0.55, cc[1] + R * 0.3); ctx.closePath(); ctx.fill(); }
      if (t.terrain === 'mountain') { ctx.fillStyle = '#5b5955'; ctx.beginPath(); ctx.moveTo(cc[0] - R * 0.65, cc[1] + R * 0.5); ctx.lineTo(cc[0] - R * 0.1, cc[1] - R * 0.6); ctx.lineTo(cc[0] + R * 0.6, cc[1] + R * 0.5); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#e9ecef'; ctx.beginPath(); ctx.moveTo(cc[0] - R * 0.28, cc[1] - R * 0.25); ctx.lineTo(cc[0] - R * 0.1, cc[1] - R * 0.6); ctx.lineTo(cc[0] + R * 0.12, cc[1] - R * 0.2); ctx.closePath(); ctx.fill(); }
    }
    // pass 2: rivers as smooth polylines through tile centers
    ctx.strokeStyle = '#3aa0e6'; ctx.lineWidth = R * 0.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    (g.rivers || []).forEach(function (path) {
      var pts = [], anyVisible = false;
      for (var k = 0; k < path.length; k++) { var pt = g.tiles[path[k]]; if (!pt) return; if (explored[pt.i] && pt.row >= r0 - 1 && pt.row <= r1 + 1 && pt.col >= c0 - 1 && pt.col <= c1 + 1) anyVisible = true; pts.push(Hex.center(pt.col, pt.row, R)); }
      if (!anyVisible || pts.length < 2) return;
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
      for (var m = 1; m < pts.length - 1; m++) { var mx = (pts[m][0] + pts[m + 1][0]) / 2, my = (pts[m][1] + pts[m + 1][1]) / 2; ctx.quadraticCurveTo(pts[m][0], pts[m][1], mx, my); }
      ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
      ctx.stroke();
    });
    // hide river segments that run through unexplored tiles
    for (r = r0; r <= r1; r++) for (c = c0; c <= c1; c++) { i = r * g.W + c; if (explored[i]) continue; cc = Hex.center(c, r, R); ctx.fillStyle = '#08131f'; hexPath(ctx, cc[0], cc[1], R + 1); ctx.fill(); }
    // pass 3: features, resources, improvements, borders, grid
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (r = r0; r <= r1; r++) for (c = c0; c <= c1; c++) {
      i = r * g.W + c; t = g.tiles[i];
      if (!explored[i]) continue;
      cc = Hex.center(c, r, R);
      if (!lowDetail) {
        if (t.feature) { ctx.font = fontEmoji; ctx.fillText(AU.FEATURES[t.feature].icon, cc[0] - R * 0.22, cc[1] - R * 0.2); }
        if (t.resource) {
          var Rs = AU.RESOURCES[t.resource];
          if (!Rs.revealTech || player.techs[Rs.revealTech]) { ctx.font = Math.round(R * 0.55) + 'px sans-serif'; ctx.fillText(Rs.icon, cc[0] + R * 0.3, cc[1] + R * 0.3); }
        }
        if (t.worked && t.owner >= 0 && t.settlement == null) {
          var s0 = g.settlements[t.owner]; var imp = s0 ? G.improvementFor(g, t, g.civs[s0.civ]) : null;
          if (imp) { ctx.font = Math.round(R * 0.42) + 'px sans-serif'; ctx.fillText(AU.IMPROVEMENTS[imp].icon, cc[0] - R * 0.35, cc[1] + R * 0.4); }
        }
        if (t.camp) { ctx.font = fontEmoji; ctx.fillText('🏕️', cc[0], cc[1] - R * 0.1); }
      }
      if (this.showGrid) { ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 1; hexPath(ctx, cc[0], cc[1], R); ctx.stroke(); }
      // borders
      if (t.owner >= 0) {
        var s = g.settlements[t.owner];
        if (s) {
          var civ = g.civs[s.civ], data = G.civData(civ);
          var corners = Hex.corners(cc[0], cc[1], R - 1.5);
          var nbs = Hex.neighborsOf(c, r, g.W, g.H);
          var d = (r & 1) ? [[1, 0], [1, -1], [0, -1], [-1, 0], [0, 1], [1, 1]] : [[1, 0], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1]];
          ctx.strokeStyle = data.color; ctx.lineWidth = R * 0.14;
          // edge k of pointy hex: between corner k and k+1 lies toward neighbor direction; map directions to corner pairs
          var dirCorner = [[0, 1], [5, 0], [4, 5], [3, 4], [2, 3], [1, 2]];
          for (var e = 0; e < 6; e++) {
            var nc2 = c + d[e][0], nr2 = r + d[e][1];
            var same = false;
            if (nc2 >= 0 && nc2 < g.W && nr2 >= 0 && nr2 < g.H) { var nt = g.tiles[nr2 * g.W + nc2]; same = nt.owner >= 0 && g.settlements[nt.owner] && g.settlements[nt.owner].civ === s.civ; }
            if (same) continue;
            var a = corners[dirCorner[e][0]], b = corners[dirCorner[e][1]];
            ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
          }
          if (t.worked && t.settlement == null) { ctx.fillStyle = 'rgba(255,255,255,0.06)'; hexPath(ctx, cc[0], cc[1], R); ctx.fill(); }
        }
      }
    }
    // pass 4: highlights
    function overlay(set, color) { if (!set) return; ctx.fillStyle = color; for (var key in set) { var tt = g.tiles[+key]; if (!tt) continue; var p = Hex.center(tt.col, tt.row, R); hexPath(ctx, p[0], p[1], R - 1); ctx.fill(); } }
    overlay(hl.reach, 'rgba(255,255,255,0.22)');
    overlay(hl.expand, 'rgba(120,255,120,0.35)');
    overlay(hl.attack, 'rgba(255,60,60,0.45)');
    if (hl.path && hl.path.length) { ctx.fillStyle = 'rgba(255,255,255,0.8)'; hl.path.forEach(function (pi) { var tt = g.tiles[pi]; var p = Hex.center(tt.col, tt.row, R); ctx.beginPath(); ctx.arc(p[0], p[1], R * 0.12, 0, Math.PI * 2); ctx.fill(); }); }
    // pass 5: settlements
    for (var sid in g.settlements) {
      var st = g.settlements[sid]; t = g.tiles[st.tile];
      if (!explored[t.i] || t.row < r0 || t.row > r1 || t.col < c0 || t.col > c1) continue;
      cc = Hex.center(t.col, t.row, R);
      var civ2 = g.civs[st.civ], data2 = G.civData(civ2);
      ctx.fillStyle = data2.color; ctx.strokeStyle = data2.color2; ctx.lineWidth = 2;
      var size = R * (st.isCity ? 0.62 : 0.48);
      if (st.isCity) { ctx.fillRect(cc[0] - size, cc[1] - size * 0.8, size * 2, size * 1.6); ctx.strokeRect(cc[0] - size, cc[1] - size * 0.8, size * 2, size * 1.6); }
      else { ctx.beginPath(); ctx.arc(cc[0], cc[1], size, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle = data2.color2; ctx.font = 'bold ' + Math.round(R * 0.5) + 'px sans-serif';
      ctx.fillText(st.isCapital ? '★' : (st.isCity ? '▮' : '●'), cc[0], cc[1] - R * 0.02);
      // label
      var label = st.name + ' ' + st.pop;
      ctx.font = 'bold ' + Math.round(R * 0.38) + 'px sans-serif';
      var tw = ctx.measureText(label).width + R * 0.4;
      ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(cc[0] - tw / 2, cc[1] + R * 0.55, tw, R * 0.5);
      ctx.fillStyle = '#fff'; ctx.fillText(label, cc[0], cc[1] + R * 0.8);
      if (st.pendingGrowth > 0 && st.civ === player.idx) { ctx.fillStyle = '#7ed957'; ctx.beginPath(); ctx.arc(cc[0] + R * 0.6, cc[1] - R * 0.6, R * 0.16, 0, Math.PI * 2); ctx.fill(); }
      var maxHp = G.settlementMaxHp(g, st);
      if (st.hp < maxHp) { ctx.fillStyle = '#222'; ctx.fillRect(cc[0] - R * 0.6, cc[1] - R * 0.75, R * 1.2, R * 0.12); ctx.fillStyle = '#e05252'; ctx.fillRect(cc[0] - R * 0.6, cc[1] - R * 0.75, R * 1.2 * st.hp / maxHp, R * 0.12); }
    }
    // pass 6: units
    for (var uid in g.units) {
      var u = g.units[uid]; t = g.tiles[u.tile];
      if (!visible[t.i] || t.row < r0 || t.row > r1 || t.col < c0 || t.col > c1) continue;
      cc = Hex.center(t.col, t.row, R);
      var isSel = app && app.sel.unit === u.id;
      var mil = G.isMilitary(u);
      var ux = cc[0] + (mil ? 0 : R * 0.3), uy = cc[1] + (mil ? R * 0.05 : R * 0.25), ur = R * (mil ? 0.4 : 0.3);
      var same = G.unitsAt(g, u.tile).length > 1;
      if (same && mil) { ux = cc[0] - R * 0.2; }
      if (t.settlement != null) { ur *= 0.75; ux = cc[0] + (mil ? -R * 0.55 : R * 0.55); uy = cc[1] - R * 0.35; }
      var ucol = u.civ >= 0 ? G.civData(g.civs[u.civ]).color : '#222', ucol2 = u.civ >= 0 ? G.civData(g.civs[u.civ]).color2 : '#e33';
      ctx.fillStyle = ucol; ctx.strokeStyle = isSel ? '#fff' : ucol2; ctx.lineWidth = isSel ? 3 : 1.5;
      ctx.beginPath(); ctx.arc(ux, uy, ur, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.font = Math.round(ur * 1.1) + 'px sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText(AU.UNITS[u.type].icon, ux, uy + 1);
      if (u.hp < 100) { ctx.fillStyle = '#222'; ctx.fillRect(ux - ur, uy + ur + 1, ur * 2, 3); ctx.fillStyle = u.hp > 50 ? '#4caf50' : u.hp > 25 ? '#e6b422' : '#e05252'; ctx.fillRect(ux - ur, uy + ur + 1, ur * 2 * u.hp / 100, 3); }
      if (u.fortify && mil) { ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1; ctx.strokeRect(ux - ur - 2, uy - ur - 2, ur * 2 + 4, ur * 2 + 4); }
      if (isSel) { ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2; hexPath(ctx, cc[0], cc[1], R - 1); ctx.stroke(); }
    }
    // pass 7: fog
    for (r = r0; r <= r1; r++) for (c = c0; c <= c1; c++) {
      i = r * g.W + c;
      if (!explored[i]) continue;
      if (visible[i]) continue;
      cc = Hex.center(c, r, R);
      ctx.fillStyle = 'rgba(5,10,20,0.45)'; hexPath(ctx, cc[0], cc[1], R + 0.6); ctx.fill();
    }
    if (hl.selTile >= 0 && (!app || !app.sel.unit)) { var stt = g.tiles[hl.selTile]; var sp = Hex.center(stt.col, stt.row, R); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; hexPath(ctx, sp[0], sp[1], R - 1); ctx.stroke(); }
  };
  AU.Renderer = Renderer;
  AU.HEX_R = R;
})(globalThis.AU = globalThis.AU || {});
