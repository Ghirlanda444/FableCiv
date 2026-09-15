// Palace painter: composes the palace on a canvas from chibi piece pictures (assets/palace/<style>/<piece>.png)
// with a procedural fallback per architectural style, plus the palace panel.
(function (AU) {
  var G = AU.G, Pal = AU.Palace;
  var Art = AU.PalaceArt = {};
  function lcg(seed) { var s = (seed * 2654435761) >>> 0 || 1; return function () { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }

  // how wide each generated piece is drawn relative to its layout width (cropped pictures need less room)
  var PIECE_SCALE = { hall: 1.15, left_wing: 1.0, right_wing: 1.0, dome: 0.55, tower_left: 0.8, tower_right: 0.8, gate: 0.9, walls: 1.0, gardens: 0.9, fountain: 0.8, statue: 0.8, banners: 1.0 };
  Art.paint = function (cv, g, civ, preview) {
    var ctx = cv.getContext('2d'), W = cv.width, H = cv.height, st = Pal.state(civ), color = G.civColor(civ), color2 = G.civData(civ).color2;
    // sky, hills, lawn
    var sky = ctx.createLinearGradient(0, 0, 0, H * 0.7); sky.addColorStop(0, '#7fc4f5'); sky.addColorStop(1, '#dff1ff'); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff'; [[90, 70, 38], [230, 50, 30], [430, 80, 42], [560, 45, 26]].forEach(function (c) { ctx.beginPath(); ctx.ellipse(c[0], c[1], c[2], c[2] * 0.45, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(c[0] + c[2] * 0.6, c[1] + 4, c[2] * 0.6, c[2] * 0.32, 0, 0, Math.PI * 2); ctx.fill(); });
    ctx.fillStyle = '#8fc96a'; ctx.beginPath(); ctx.ellipse(120, 300, 260, 70, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#7fbb5c'; ctx.beginPath(); ctx.ellipse(540, 305, 260, 75, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#6fae4f'; ctx.fillRect(0, 300, W, H - 300);
    ctx.fillStyle = '#d9c78f'; ctx.beginPath(); ctx.moveTo(280, 400); ctx.lineTo(360, 400); ctx.lineTo(345, 350); ctx.lineTo(295, 350); ctx.closePath(); ctx.fill();
    var pieces = AU.PALACE_PIECES.filter(function (pc) { return st.pieces[pc.id] || (preview && preview.id === pc.id); }).slice().sort(function (a, b) { return a.z - b.z; });
    var drawnTop = {};
    pieces.forEach(function (pc) {
      var style = preview && preview.id === pc.id ? preview.style : st.pieces[pc.id];
      // the crown sits on the hall's roof and the banners fly just above it, wherever the hall picture ends
      var baseY = pc.y; if (pc.id === 'dome' && drawnTop.hall !== undefined) baseY = drawnTop.hall + 22; if (pc.id === 'banners' && drawnTop.hall !== undefined) baseY = (drawnTop.dome !== undefined ? drawnTop.dome : drawnTop.hall) + 6;
      var img = AU.Assets.getFor('palace', pc.id, style);
      if (preview && preview.id === pc.id) ctx.globalAlpha = 0.85;
      if (img) { // crop the transparent margin of the generated picture so pieces sit on the ground at a useful size
        var bb = img._bbox; if (!bb) { try { var tc = document.createElement('canvas'); tc.width = tc.height = 64; var tx = tc.getContext('2d'); tx.drawImage(img, 0, 0, 64, 64); var d = tx.getImageData(0, 0, 64, 64).data, x0 = 64, y0 = 64, x1 = 0, y1 = 0; for (var yy = 0; yy < 64; yy++) for (var xx = 0; xx < 64; xx++) if (d[(yy * 64 + xx) * 4 + 3] > 30) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy; } bb = x1 >= x0 ? [x0 / 64, y0 / 64, (x1 + 1) / 64, (y1 + 1) / 64] : [0, 0, 1, 1]; } catch (e) { bb = [0, 0, 1, 1]; } img._bbox = bb; }
        var sx = bb[0] * img.width, sy = bb[1] * img.height, sw = (bb[2] - bb[0]) * img.width, sh = (bb[3] - bb[1]) * img.height;
        var dw = pc.w * PIECE_SCALE[pc.id] || pc.w, dh = dw * sh / sw; if (dh > pc.maxH) { dh = pc.maxH; dw = dh * sw / sh; }
        ctx.drawImage(img, sx, sy, sw, sh, pc.x - dw / 2, baseY - dh, dw, dh); drawnTop[pc.id] = baseY - dh;
      }
      else { Art.drawPiece(ctx, pc, AU.PALACE_STYLES[style], color, color2, lcg(pc.id.length * 31 + style.length)); if (pc.id === 'hall') drawnTop.hall = pc.y - 135; }
      ctx.globalAlpha = 1;
    });
    if (!pieces.length) { ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.font = 'bold 18px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('An empty hilltop awaits your palace', W / 2, 250); }
  };
  // ---- fallback shapes (chunky, rounded, bright: readable at any size) ----
  function roof(ctx, S, x, y, w, h, shape) {
    ctx.fillStyle = S.roof; ctx.beginPath();
    switch (shape) {
      case 'pagoda': ctx.moveTo(x - w * 0.62, y); ctx.quadraticCurveTo(x - w * 0.3, y - h * 0.15, x, y - h); ctx.quadraticCurveTo(x + w * 0.3, y - h * 0.15, x + w * 0.62, y); ctx.quadraticCurveTo(x, y - h * 0.25, x - w * 0.62, y); break;
      case 'steep': ctx.moveTo(x - w * 0.55, y); ctx.lineTo(x, y - h * 1.5); ctx.lineTo(x + w * 0.55, y); break;
      case 'dome': case 'onion': ctx.moveTo(x - w * 0.5, y); ctx.bezierCurveTo(x - w * 0.55, y - h * 1.1, x - w * 0.12, y - h * 1.15, x, y - h * (shape === 'onion' ? 1.7 : 1.2)); ctx.bezierCurveTo(x + w * 0.12, y - h * 1.15, x + w * 0.55, y - h * 1.1, x + w * 0.5, y); break;
      case 'spire': ctx.moveTo(x - w * 0.5, y); ctx.lineTo(x - w * 0.3, y - h * 0.8); ctx.lineTo(x - w * 0.15, y - h * 1.3); ctx.lineTo(x, y - h * 2); ctx.lineTo(x + w * 0.15, y - h * 1.3); ctx.lineTo(x + w * 0.3, y - h * 0.8); ctx.lineTo(x + w * 0.5, y); break;
      case 'cone': ctx.moveTo(x - w * 0.6, y); ctx.lineTo(x, y - h * 1.3); ctx.lineTo(x + w * 0.6, y); break;
      case 'step': ctx.rect(x - w * 0.45, y - h * 0.5, w * 0.9, h * 0.5); ctx.rect(x - w * 0.3, y - h, w * 0.6, h * 0.5); break;
      case 'round': ctx.moveTo(x - w * 0.55, y); ctx.quadraticCurveTo(x, y - h * 1.6, x + w * 0.55, y); break;
      default: ctx.moveTo(x - w * 0.58, y); ctx.lineTo(x, y - h); ctx.lineTo(x + w * 0.58, y);
    }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2; ctx.stroke();
    if (shape === 'onion' || shape === 'dome' || shape === 'spire' || shape === 'pagoda') { ctx.fillStyle = S.trim; ctx.beginPath(); ctx.arc(x, y - h * (shape === 'onion' ? 1.7 : shape === 'spire' ? 2 : shape === 'pagoda' ? 1 : 1.2) - 4, 5, 0, Math.PI * 2); ctx.fill(); }
  }
  function block(ctx, S, x, y, w, h, windows, rnd) {
    ctx.fillStyle = S.wall; ctx.fillRect(x - w / 2, y - h, w, h); ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2; ctx.strokeRect(x - w / 2, y - h, w, h);
    ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(x + w * 0.3, y - h, w * 0.2, h);
    ctx.fillStyle = S.trim; ctx.fillRect(x - w / 2, y - h, w, 4);
    for (var k = 0; k < windows; k++) { var wx = x - w / 2 + w * (k + 0.5) / windows; ctx.fillStyle = '#2b3a55'; ctx.beginPath(); ctx.moveTo(wx - 5, y - h * 0.35); ctx.lineTo(wx - 5, y - h * 0.65); ctx.quadraticCurveTo(wx, y - h * 0.85, wx + 5, y - h * 0.65); ctx.lineTo(wx + 5, y - h * 0.35); ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(wx - 3, y - h * 0.62, 3, 6); }
  }
  Art.drawPiece = function (ctx, pc, S, color, color2, rnd) {
    var x = pc.x, y = pc.y, w = pc.w;
    switch (pc.id) {
      case 'hall': block(ctx, S, x, y, w, 95, 5, rnd); roof(ctx, S, x, y - 95, w, 40, S.roofShape === 'onion' || S.roofShape === 'dome' ? 'gable' : S.roofShape); break;
      case 'left_wing': case 'right_wing': block(ctx, S, x, y, w, 70, 4, rnd); roof(ctx, S, x, y - 70, w, 30, S.roofShape === 'onion' || S.roofShape === 'dome' ? 'gable' : S.roofShape); break;
      case 'tower_left': case 'tower_right': block(ctx, S, x, y, w * 0.6, 130, 1, rnd); roof(ctx, S, x, y - 130, w * 0.6, 34, S.roofShape === 'gable' ? 'steep' : S.roofShape); break;
      case 'dome': roof(ctx, S, x, y, w * 0.75, 42, S.roofShape === 'gable' || S.roofShape === 'steep' ? 'dome' : S.roofShape); break;
      case 'gate': ctx.fillStyle = S.wall; ctx.fillRect(x - w / 2, y - 60, w, 60); ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.strokeRect(x - w / 2, y - 60, w, 60); ctx.fillStyle = '#3a2a1a'; ctx.beginPath(); ctx.moveTo(x - 22, y); ctx.lineTo(x - 22, y - 30); ctx.quadraticCurveTo(x, y - 55, x + 22, y - 30); ctx.lineTo(x + 22, y); ctx.closePath(); ctx.fill(); ctx.fillStyle = S.trim; for (var c = 0; c < 6; c++) ctx.fillRect(x - w / 2 + c * w / 6 + 3, y - 68, w / 6 - 6, 8); break;
      case 'walls': ctx.fillStyle = S.wall; ctx.fillRect(x - w / 2, y - 36, w, 36); ctx.fillStyle = 'rgba(0,0,0,0.1)'; ctx.fillRect(x - w / 2, y - 12, w, 12); ctx.fillStyle = S.trim; for (var m = 0; m < 24; m++) ctx.fillRect(x - w / 2 + m * w / 24 + 4, y - 44, w / 24 - 8, 8); ctx.clearRect(x - 62, y - 36, 124, 36); ctx.fillStyle = '#6fae4f'; ctx.fillRect(x - 62, y - 36, 124, 36); break;
      case 'gardens': for (var t = 0; t < 6; t++) { var tx = x - w / 2 + (t + 0.5) * w / 6, ty = y - 6 - (t % 2) * 10, r = 14 + (t % 3) * 4; ctx.fillStyle = '#5a3b1e'; ctx.fillRect(tx - 3, ty - 10, 6, 14); ctx.fillStyle = t % 2 ? '#3f9a48' : '#2f7a36'; ctx.beginPath(); ctx.arc(tx, ty - 16, r, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.arc(tx - r * 0.3, ty - 16 - r * 0.3, r * 0.4, 0, Math.PI * 2); ctx.fill(); } ctx.fillStyle = '#e85a8a'; for (var f = 0; f < 12; f++) { ctx.beginPath(); ctx.arc(x - w / 2 + rnd() * w, y - rnd() * 8, 2.5, 0, Math.PI * 2); ctx.fill(); } break;
      case 'fountain': ctx.fillStyle = S.wall; ctx.beginPath(); ctx.ellipse(x, y - 8, w * 0.42, 16, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.stroke(); ctx.fillStyle = '#4fb3e8'; ctx.beginPath(); ctx.ellipse(x, y - 10, w * 0.34, 11, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = S.trim; ctx.fillRect(x - 5, y - 46, 10, 36); ctx.strokeStyle = '#bfe8ff'; ctx.lineWidth = 3; for (var j = -1; j <= 1; j++) { ctx.beginPath(); ctx.moveTo(x, y - 46); ctx.quadraticCurveTo(x + j * 22, y - 60, x + j * 30, y - 14); ctx.stroke(); } break;
      case 'statue': ctx.fillStyle = S.wall; ctx.fillRect(x - 16, y - 22, 32, 22); ctx.fillStyle = S.trim; ctx.fillRect(x - 20, y - 26, 40, 5); ctx.fillStyle = '#c9b25a'; ctx.beginPath(); ctx.arc(x, y - 52, 8, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(x - 9, y - 46, 18, 22); ctx.fillRect(x + 9, y - 60, 3, 34); break;
      case 'banners': for (var b = -2; b <= 2; b++) { var bx = x + b * w / 4; ctx.fillStyle = '#5a3b1e'; ctx.fillRect(bx - 1.5, y - 60, 3, 60); ctx.fillStyle = b % 2 ? color2 : color; ctx.beginPath(); ctx.moveTo(bx + 1, y - 60); ctx.lineTo(bx + 30, y - 52); ctx.lineTo(bx + 1, y - 42); ctx.closePath(); ctx.fill(); } break;
    }
  };

  // ---------- panel ----------
  AU.Panels.render_palace = function (app, g) {
    var p = G.player(g), st = Pal.state(p), av = Pal.available(p), styles = Pal.styles(g, p), fx = Pal.fx(p), html = '';
    var sel = app.panelData && app.panelData.piece ? app.panelData.piece : (av[0] ? av[0].id : null), selStyle = app.panelData && app.panelData.style ? app.panelData.style : styles[0];
    html += '<div class="section"><canvas id="palace-cv" width="640" height="400" style="width:100%;max-width:640px;border-radius:12px;border:1px solid var(--line);display:block;margin:0 auto"></canvas>';
    html += '<p class="stat">' + Pal.count(p) + ' of ' + AU.PALACE_PIECES.length + ' pieces built · +' + fx.capitalCulture + ' 🎭 Heritage in the capital, +' + fx.happiness + ' 😊 empire-wide (one per 4 pieces), +' + fx.tourism + ' 🧳 tourism. Your people offer a new piece when a new era begins, when you complete a wonder, and every 20 turns of contentment.</p></div>';
    if (st.pending > 0 && av.length) {
      html += '<div class="section"><h3>🏰 Your people offer to improve the palace' + (st.pending > 1 ? ' (' + st.pending + ' pieces)' : '') + '</h3><p class="stat">Pick a piece and an architectural style. Styles can be mixed freely.</p><div class="tabs">';
      av.forEach(function (pc) { html += '<button class="small ' + (pc.id === sel ? 'on' : '') + '" data-action="palacepick" data-piece="' + pc.id + '" data-style="' + selStyle + '">' + pc.name + '</button>'; });
      html += '</div>';
      var pcSel = AU.PALACE_PIECE_BY_ID[sel]; if (pcSel) html += '<p class="stat">' + pcSel.desc + '</p>';
      html += '<div class="tabs">';
      styles.forEach(function (sid) { var S = AU.PALACE_STYLES[sid]; html += '<button class="small ' + (sid === selStyle ? 'on' : '') + '" data-action="palacepick" data-piece="' + sel + '" data-style="' + sid + '" title="' + S.look + '">' + S.name + (sid === (AU.cultureOf(p) || 'mediterranean') ? ' (yours)' : '') + '</button>'; });
      html += '</div><p class="stat">' + AU.PALACE_STYLES[selStyle].look + '</p>';
      html += '<button class="big primary" data-action="palacebuild" data-piece="' + sel + '" data-style="' + selStyle + '">Build the ' + (pcSel ? pcSel.name : 'piece') + ' in the ' + AU.PALACE_STYLES[selStyle].name + ' style</button></div>';
    } else if (st.pending > 0) html += '<div class="section"><p class="stat">Every piece is built. A magnificent palace!</p></div>';
    else html += '<div class="section"><p class="stat">No piece is offered right now. Keep your people content, enter new eras and build wonders.</p></div>';
    var built = AU.PALACE_PIECES.filter(function (pc) { return st.pieces[pc.id]; });
    if (built.length) html += '<div class="section"><h3>Built</h3><p class="stat">' + built.map(function (pc) { return pc.name + ' (' + AU.PALACE_STYLES[st.pieces[pc.id]].name + ')'; }).join(' · ') + '</p></div>';
    setTimeout(function () { var cv = document.getElementById('palace-cv'); if (cv && app.g) Art.paint(cv, app.g, G.player(app.g), st.pending > 0 && sel && av.length ? { id: sel, style: selStyle } : null); }, 0);
    return { title: 'Your Palace', html: html };
  };
})(globalThis.AU = globalThis.AU || {});
