// City manager map: the tiles around a settlement, which citizen works what, and where a new citizen can go.
// Drawn on a small canvas inside the city panel; tapping a tile shows its yields and the improvement a citizen builds.
(function (AU) {
  var G = AU.G, P = AU.Panels, Hex = AU.Hex;
  var $ = function (id) { return document.getElementById(id); };
  var CM = AU.CityMap = { radius: 3 };
  var YI = { food: '🌾', production: '⚙️', gold: '💰', science: '🔬', culture: '🎭', faith: '🕊️' };
  function yTxt(y) { return AU.YIELD_KEYS.filter(function (k) { return y[k]; }).map(function (k) { return y[k] + YI[k]; }).join(' ') || '—'; }
  // Plain-language explanation of how a tile gets improved (no Empire knowledge assumed).
  CM.improvementWhy = function (g, t, civ) {
    if (t.natural) return 'A natural wonder: it cannot be improved, but it already gives great yields.';
    if (t.resource) { var R = AU.RESOURCES[t.resource]; if (R.revealTech && !civ.techs[R.revealTech]) return R.name + ' is here but your people cannot use it until you research ' + AU.TECH_BY_ID[R.revealTech].name + '.'; return 'A citizen here builds a ' + G.improvementName(g, t, civ, R.improvement) + ' to harvest the ' + R.name + '.'; }
    if (G.isWater(t)) return 'Open water: nothing to build, but fish and other sea resources can be worked with Fishing Boats.';
    if (t.terrain === 'mountain') return 'Mountains cannot be worked.';
    if (t.hills) return 'Hills: a citizen here builds a ' + G.improvementName(g, t, civ, 'mine') + (G.uniqueImprovement(g, t, civ, 'mine') ? ' (your unique improvement)' : ' (+1 Production)') + '.';
    if (t.feature === 'forest' || t.feature === 'jungle') return (t.feature === 'forest' ? 'Forest' : 'Rainforest') + ': a citizen here sets up a Woodcutter (+1 Production).';
    if (t.feature === 'marsh') return 'Marsh: a citizen here drains a Clearing (+1 Food).';
    if (t.terrain === 'snow') return 'Snow: too cold to improve.';
    return 'Flat land: a citizen here builds a ' + G.improvementName(g, t, civ, 'farm') + (G.uniqueImprovement(g, t, civ, 'farm') ? ' (your unique improvement)' : ' (+1 Food)') + '.';
  };
  CM.html = function (app, g, s, data) {
    var civ = g.civs[s.civ], p = G.player(g), own = s.civ === p.idx;
    var worked = s.tiles.filter(function (i) { return g.tiles[i].worked && i !== s.tile; }).length;
    var cands = s.pendingGrowth > 0 && own ? G.expansionCandidates(g, s) : [];
    var html = '<div class="section"><h3>Citizens and tiles</h3>';
    html += '<p class="stat"><b>' + s.pop + ' citizens</b>: ' + worked + ' working tiles' + (s.specialists ? ', ' + s.specialists + ' specialist' + (s.specialists > 1 ? 's' : '') + ' (no free tile, they give +2 🔬 each)' : '') + '. The city centre is always worked for free. Every yield below comes from these tiles plus your buildings.</p>';
    if (cands.length) html += '<div class="row" style="border-color:var(--food)"><div class="grow"><b>🌱 A new citizen is waiting (' + s.pendingGrowth + ')</b><small>Tap a green tile on the map to send them there, or let the game pick the best one.</small></div><button class="small" data-action="autoexpand" data-id="' + s.id + '">Auto</button></div>';
    html += '<div class="citymap-wrap"><canvas id="citymap" class="citymap"></canvas></div>';
    html += '<div class="citymap-legend"><span><i class="lg lg-worked"></i> worked by a citizen</span><span><i class="lg lg-owned"></i> yours, not worked</span>' + (cands.length ? '<span><i class="lg lg-cand"></i> new citizen can go here</span>' : '') + '<span><i class="lg lg-foreign"></i> someone else\'s</span></div>';
    // tile detail
    var ti = data.tile != null ? data.tile : s.tile, t = g.tiles[ti];
    if (t) {
      var y = G.tileYields(g, t, s, civ), imp = G.improvementFor(g, t, civ), isCenter = ti === s.tile, ownedHere = t.owner === s.id, ownerS = t.owner >= 0 ? g.settlements[t.owner] : null;
      var name = (t.hills ? 'Hills · ' : '') + AU.TERRAIN[t.terrain].name + (t.feature ? ' · ' + AU.FEATURES[t.feature].name : '') + (t.natural ? ' · ' + AU.NATURAL_WONDERS[t.natural].name : '') + (t.river ? ' · river' : '');
      html += '<div class="tree-detail"><div class="grow"><b>' + (isCenter ? '🏛️ ' + s.name + ' (city centre)' : name) + (t.resource ? ' · ' + AU.RESOURCES[t.resource].icon + ' ' + AU.RESOURCES[t.resource].name : '') + '</b>' +
        '<small>Yields if worked: <b>' + yTxt(y) + '</b>' + (imp && !isCenter ? ' · improvement: ' + (G.uniqueImprovement(g, t, civ, imp) || AU.IMPROVEMENTS[imp]).icon + ' ' + G.improvementName(g, t, civ, imp) : '') + '</small>' +
        '<small>' + (isCenter ? 'The centre tile is always worked and never starves.' : t.worked && ownedHere ? '👤 A citizen works this tile now.' : ownedHere ? 'Yours, but no citizen works it: it gives nothing until the city grows.' : ownerS && ownerS.civ !== s.civ ? 'Belongs to ' + ownerS.name + ' (' + G.civData(g.civs[ownerS.civ]).name + ').' : ownerS ? 'Belongs to your settlement ' + ownerS.name + '.' : 'Unclaimed.') + '</small>' +
        (!isCenter ? '<small>' + CM.improvementWhy(g, t, civ) + '</small>' : '') + '</div>' +
        (cands.indexOf(ti) >= 0 ? '<div class="tree-detail-btns"><button class="small primary" data-action="citygrow" data-id="' + s.id + '" data-tile="' + ti + '">🌱 Send citizen here</button></div>' : '') + '</div>';
    }
    html += '<details class="rules"><summary>How do citizens, tiles and improvements work?</summary><div class="help">' +
      '<p><b>One citizen, one tile.</b> Each point of population is a citizen who works exactly one tile of the settlement\'s land. The food, production, gold, science and culture of that tile go to the settlement every turn. Tiles nobody works give nothing.</p>' +
      '<p><b>No builders: citizens improve tiles by themselves.</b> When the settlement grows, you choose a tile within three rings of the centre; the new citizen moves there, claims it and immediately builds the right improvement: a <b>Farm</b> on flat land, a <b>Mine</b> on hills, a <b>Woodcutter</b> in forests and rainforest, a <b>Clearing</b> in marsh, and the special improvement of a resource (Pasture for cattle and horses, Plantation for bananas or silk, Camp for furs, Quarry for stone, Fishing Boats at sea…).</p>' +
      '<p><b>Resources need knowledge.</b> A resource with a hidden technology (Iron needs Iron Working, Horses need Animal Husbandry, Coal, Oil…) only counts once you have researched it. Until then the tile is worked like plain land. Luxury resources make your people happy; strategic ones unlock units.</p>' +
      '<p><b>Growth.</b> Each citizen eats 2 food per turn. Surplus food fills the growth bar; when it is full a new citizen is born and the map asks you where to put them (or press Auto). If food is short the settlement starves and the weakest tile is abandoned.</p>' +
      '<p><b>Specialists.</b> If there is no free tile left, a new citizen becomes a specialist and gives +2 science instead.</p>' +
      '<p><b>Towns and Cities.</b> Towns have no build queue: their production is turned into gold and you buy things there. Cities build units, buildings and wonders with their production. Buildings add to the yields of the whole settlement; the Territory list at the bottom shows every tile you own.</p></div></details>';
    html += '</div>';
    setTimeout(function () { CM.draw(app, g, s, data); }, 0);
    return html;
  };
  CM.draw = function (app, g, s, data) {
    var cv = $('citymap'); if (!cv) return;
    var civ = g.civs[s.civ], p = G.player(g), own = s.civ === p.idx, c0 = g.tiles[s.tile];
    var RAD = CM.radius, cols = RAD * 2 + 2, W = cv.parentNode.clientWidth || 360, r = Math.floor(W / (cols * Hex.SQRT3)), H = Math.round((RAD * 2 + 1) * 1.5 * r + r * 0.5 + 8);
    var dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = W * dpr; cv.height = H * dpr; cv.style.height = H + 'px';
    var ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
    ctx.fillStyle = '#0c1020'; ctx.fillRect(0, 0, W, H);
    var cands = {}; if (s.pendingGrowth > 0 && own) G.expansionCandidates(g, s).forEach(function (i) { cands[i] = true; });
    var sel = data.tile != null ? data.tile : s.tile, hit = [];
    var x0 = W / 2 - (c0.col + 0.5 * (c0.row & 1)) * Hex.SQRT3 * r, y0 = H / 2 - c0.row * 1.5 * r;
    function centerOf(t) { return [x0 + (t.col + 0.5 * (t.row & 1)) * Hex.SQRT3 * r, y0 + t.row * 1.5 * r]; }
    var tiles = [];
    for (var ring = 0; ring <= RAD; ring++) (ring === 0 ? [s.tile] : Hex.ring(c0.col, c0.row, ring, g.W, g.H)).forEach(function (i) { tiles.push(i); });
    var pulse = 0.5 + 0.5 * Math.sin(Date.now() / 350);
    tiles.forEach(function (i) {
      var t = g.tiles[i], c = centerOf(t), cx = c[0], cy = c[1], known = p.explored ? p.explored[i] : true;
      var pts = Hex.corners(cx, cy, r - 1);
      ctx.beginPath(); pts.forEach(function (q, k) { if (k) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); }); ctx.closePath();
      var col = known ? (AU.TERRAIN[t.terrain].color || '#5f9a3c') : '#1a1f2e';
      ctx.fillStyle = col; ctx.fill();
      if (known && t.hills) { ctx.fillStyle = 'rgba(0,0,0,.14)'; ctx.fill(); }
      var ownerCiv = G.tileOwnerCiv(g, t);
      if (known && ownerCiv >= 0 && ownerCiv !== s.civ) { ctx.fillStyle = 'rgba(20,20,30,.55)'; ctx.fill(); }
      // ring: worked / owned / candidate / foreign
      var mine = t.owner === s.id;
      ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(0,0,0,.35)';
      if (mine && (t.worked || i === s.tile)) { ctx.lineWidth = 3; ctx.strokeStyle = '#f2c14e'; }
      else if (mine) { ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(242,193,78,.45)'; }
      if (cands[i]) { ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(126,217,87,' + (0.55 + 0.45 * pulse) + ')'; }
      ctx.stroke();
      if (known) {
        ctx.font = Math.round(r * 0.62) + 'px system-ui, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffffff'; ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 3;
        var icon = i === s.tile ? (s.isCity ? '🏛️' : '🏘️') : t.natural ? '✨' : t.resource && (!AU.RESOURCES[t.resource].revealTech || civ.techs[AU.RESOURCES[t.resource].revealTech]) ? AU.RESOURCES[t.resource].icon : t.feature ? AU.FEATURES[t.feature].icon : t.terrain === 'mountain' ? '🏔️' : t.hills ? '⛰️' : '';
        if (icon) ctx.fillText(icon, cx, cy - (mine && t.worked && i !== s.tile ? r * 0.12 : 0));
        if (mine && t.worked && i !== s.tile) { var imp = G.improvementFor(g, t, civ); ctx.font = Math.round(r * 0.42) + 'px system-ui, sans-serif'; ctx.fillText('👤' + (imp ? AU.IMPROVEMENTS[imp].icon : ''), cx, cy + r * 0.45); }
        ctx.shadowBlur = 0;
        if (t.river && !G.isWater(t)) { ctx.strokeStyle = 'rgba(80,160,255,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - r * 0.5, cy + r * 0.7); ctx.quadraticCurveTo(cx, cy + r * 0.3, cx + r * 0.5, cy + r * 0.7); ctx.stroke(); }
      }
      if (i === sel) { ctx.beginPath(); pts.forEach(function (q, k) { if (k) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); }); ctx.closePath(); ctx.lineWidth = 3; ctx.strokeStyle = '#ffffff'; ctx.stroke(); }
      hit.push([i, cx, cy]);
    });
    cv.onclick = function (e) {
      var rect = cv.getBoundingClientRect(), x = e.clientX - rect.left, y = e.clientY - rect.top, best = null, bd = 1e9;
      hit.forEach(function (h) { var d = (h[1] - x) * (h[1] - x) + (h[2] - y) * (h[2] - y); if (d < bd) { bd = d; best = h[0]; } });
      if (best == null || bd > r * r) return;
      if (cands[best] && data.tile === best) { app.action('citygrow', { id: String(s.id), tile: String(best) }); return; }
      data.tile = best; app.refreshPanel();
    };
  };
})(globalThis.AU = globalThis.AU || {});
