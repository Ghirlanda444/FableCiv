// Application controller: screens, input, selection, turn flow, persistence.
(function (AU) {
  var G = AU.G, U = AU.U, Hex = AU.Hex;
  var SAVE_KEY = 'ages_unbroken_save_v1', SETTINGS_KEY = 'ages_unbroken_settings';
  var $ = function (id) { return document.getElementById(id); };

  var App = {
    g: null, renderer: null, sel: { unit: null, settlement: null, tile: -1 }, mode: 'normal', panel: null, dirty: true, pendingAttack: null,
    setup: { civ: 'rome' }, busy: false,

    settings: { graphics: '2d', yields: false }, pediaState: { cat: 'concepts' },
    loadSettings: function () { try { var s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); if (!s.v || s.v < 2) { s.graphics = '2d'; s.v = 2; } Object.assign(this.settings, s); } catch (e) {} },
    saveSettings: function () { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings)); } catch (e) {} },
    webglOk: function () { try { var c = document.createElement('canvas'); return !!(window.THREE && (c.getContext('webgl2') || c.getContext('webgl'))); } catch (e) { return false; } },
    makeRenderer: function () {
      var old = this.renderer, cam = old ? old.cam : null;
      if (old && old.dispose) old.dispose();
      // a fresh canvas: a context type cannot be changed on an existing canvas
      var oldCanvas = $('map'), cv = document.createElement('canvas'); cv.id = 'map'; oldCanvas.parentNode.replaceChild(cv, oldCanvas);
      var use3d = this.settings.graphics === '3d' && this.webglOk();
      try { this.renderer = use3d ? new AU.Renderer3D(cv) : new AU.Renderer(cv); }
      catch (e) { console.warn('3D renderer failed, falling back to 2D', e); this.settings.graphics = '2d'; this.renderer = new AU.Renderer(cv); }
      if (cam) this.renderer.cam = cam;
      this.renderer.showYields = !!this.settings.yields;
      this.renderer.resize(); this.bindInput(); this.invalidate();
    },
    init: function () {
      this.loadSettings();
      this.makeRenderer();
      this.bindTitle(); this.bindGame();
      window.addEventListener('resize', function () { App.renderer.resize(); App.invalidate(); });
      window.__androidBack = function () { return App.back() ? 'true' : 'false'; };
      this.showTitle();
      this.loop();
    },
    loop: function () { if (App.dirty && App.g && !$('game').hidden) { App.dirty = false; App.renderer.draw(App.g, App); } requestAnimationFrame(App.loop); },
    invalidate: function () { this.dirty = true; },
    hasSave: function () { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } },
    save: function (silent) { try { localStorage.setItem(SAVE_KEY, G.serialize(this.g)); if (!silent) this.toast('Game saved.'); return true; } catch (e) { if (!silent) this.toast('Could not save: ' + e.message); return false; } },
    load: function () { try { var j = localStorage.getItem(SAVE_KEY); if (!j) return false; this.startGameState(G.deserialize(j)); return true; } catch (e) { this.toast('Could not load save: ' + e.message); return false; } },
    back: function () {
      if (!$('quote').hidden) { $('quote-ok').click(); return true; }
      if (!$('confirm').hidden) { $('confirm').hidden = true; return true; }
      if (this.panel) { this.closePanel(); return true; }
      if (!$('game').hidden && (this.sel.unit || this.sel.settlement || this.mode !== 'normal')) { this.deselect(); return true; }
      if (!$('setup').hidden) { this.showTitle(); return true; }
      if (!$('game').hidden) { this.openPanel('menu'); return true; }
      return false;
    },

    // ---------- Screens ----------
    showScreen: function (id) { ['title', 'setup', 'game'].forEach(function (s) { $(s).hidden = s !== id; }); },
    showTitle: function () { $('btn-continue').hidden = !this.hasSave(); this.showScreen('title'); this.paintTitle(); },
    paintTitle: function () {
      try {
        var cv = $('title-bg'); if (!cv) return;
        cv.width = cv.clientWidth; cv.height = cv.clientHeight;
        var r = new AU.Renderer(cv); r.resize();
        var g = G.newGame({ playerCiv: 'greece', mapSize: 'small', mapType: ['continents', 'archipelago', 'fractal', 'pangaea'][Math.floor(Math.random() * 4)], numCivs: 1, seed: (Date.now() & 0xffff) + 1 });
        var p = G.player(g); p.explored.fill(1); p.visible = null;
        r.cam.zoom = Math.max(cv.width / (AU.HEX_R * 1.732 * g.W), cv.height / (AU.HEX_R * 1.5 * g.H)) * 1.05;
        r.cam.x = AU.HEX_R * 1.732 * g.W / 2; r.cam.y = AU.HEX_R * 1.5 * g.H / 2;
        r.draw(g, null);
      } catch (e) { console.warn('title background failed', e); }
    },
    bindTitle: function () {
      $('btn-new').onclick = function () { App.showSetup(); };
      $('btn-continue').onclick = function () { if (!App.load()) App.toast('No saved game found.'); };
      $('btn-help').onclick = function () { App.showScreen('game'); App.openPanel('help'); };
      $('btn-pedia').onclick = function () { App.showScreen('game'); App.openPanel('pedia', { cat: 'concepts' }); };
      $('btn-back').onclick = function () { App.showTitle(); };
      $('btn-start').onclick = function () { App.startNewGame(); };
    },
    showSetup: function () {
      var grid = $('civ-grid'); grid.innerHTML = '';
      AU.CIVS.forEach(function (c) {
        var d = document.createElement('div'); d.className = 'civ-card' + (c.id === App.setup.civ ? ' selected' : ''); d.dataset.civ = c.id;
        d.innerHTML = '<div class="swatch" style="background:' + c.color + ';border-bottom:3px solid ' + c.color2 + '"></div><b>' + c.name + '</b><span>' + c.leaders.length + ' leaders</span>';
        d.onclick = function () { App.setup.civ = c.id; App.setup.leader = c.leaders[0].id; App.showSetupDetail(); grid.querySelectorAll('.civ-card').forEach(function (x) { x.classList.toggle('selected', x.dataset.civ === c.id); }); };
        grid.appendChild(d);
      });
      function fill(sel, obj, def) { sel.innerHTML = ''; for (var k in obj) { var o = document.createElement('option'); o.value = k; o.textContent = obj[k].name; if (k === def) o.selected = true; sel.appendChild(o); } }
      fill($('opt-size'), AU.MAP_SIZES, 'small'); fill($('opt-diff'), AU.DIFFICULTIES, 'prince');
      fill($('opt-type'), AU.MAP_TYPES, 'continents'); fill($('opt-speed'), AU.SPEEDS, 'standard');
      var civSel = $('opt-civs'); civSel.innerHTML = '';
      for (var n = 1; n <= 19; n++) { var o = document.createElement('option'); o.value = n; o.textContent = n; if (n === 5) o.selected = true; civSel.appendChild(o); }
      $('opt-size').onchange = function () { var s = AU.MAP_SIZES[this.value]; civSel.value = String(s.civs - 1); };
      if (!this.setup.leader || AU.LEADER_BY_ID[this.setup.leader].civId !== this.setup.civ) this.setup.leader = AU.CIV_BY_ID[this.setup.civ].leaders[0].id;
      this.showSetupDetail();
      this.showScreen('setup');
    },
    showSetupDetail: function () {
      var c = AU.CIV_BY_ID[this.setup.civ], self = this;
      var html = '<h3>' + c.name + '</h3>' +
        '<div><b>' + c.ability.name + ':</b> ' + c.ability.desc + '</div>' +
        '<div><b>Unique unit – ' + c.uu.name + ':</b> replaces ' + AU.UNITS[c.uu.replaces].name + ' (' + c.uu.desc + ').</div>' +
        '<div><b>Unique building – ' + c.ub.name + ':</b> replaces ' + AU.BUILDINGS[c.ub.replaces].name + ' (' + c.ub.desc + ').</div>' +
        '<h3 style="margin-top:10px">Choose a leader</h3><div class="leader-list">';
      c.leaders.forEach(function (l) {
        var portrait = AU.Assets.get('leaders', l.id);
        html += '<div class="leader-card' + (l.id === self.setup.leader ? ' selected' : '') + '" data-leader="' + l.id + '">' + (portrait ? '<img class="portrait" src="' + AU.Assets.url('leaders', l.id) + '" alt="">' : '') + '<b>' + l.name + '</b> <span class="pill">' + l.title + '</span><div><b>' + l.ability.name + ':</b> ' + l.ability.desc + '</div></div>';
      });
      html += '</div>';
      $('civ-detail').innerHTML = html;
      $('civ-detail').querySelectorAll('.leader-card').forEach(function (el) { el.onclick = function () { self.setup.leader = el.dataset.leader; self.showSetupDetail(); }; });
    },
    startNewGame: function () {
      var seed = parseInt($('opt-seed').value, 10);
      var opts = { playerCiv: this.setup.civ, playerLeader: this.setup.leader, mapSize: $('opt-size').value, mapType: $('opt-type').value, speed: $('opt-speed').value, difficulty: $('opt-diff').value, numCivs: parseInt($('opt-civs').value, 10) + 1, seed: isNaN(seed) ? undefined : seed };
      this.toast('Generating the world…');
      var self = this;
      setTimeout(function () { try { self.startGameState(G.newGame(opts)); } catch (e) { console.error(e); self.toast('Failed to create the game: ' + e.message); } }, 30);
    },
    startGameState: function (g) {
      this.g = g; this.sel = { unit: null, settlement: null, tile: -1 }; this.mode = 'normal'; this.panel = null; $('panel').hidden = true;
      G.autosaveHook = function () { App.save(true); };
      this.showScreen('game');
      this.renderer.resize();
      var p = G.player(g), focus = null;
      var us = G.civUnits(g, p.idx); var settler = us.filter(function (u) { return u.type === 'settler'; })[0];
      if (settler) focus = settler.tile; else if (p.capital) focus = g.settlements[p.capital].tile; else if (us.length) focus = us[0].tile;
      if (focus != null) this.renderer.centerOn(g, focus);
      this.renderer.cam.zoom = 1.1;
      this.refreshHud(); this.invalidate();
      if (g.victory) this.openPanel('victory');
      if (settler && g.turn === 1) { this.selectUnit(settler); this.toast('Tap "Found Capital" to settle, or tap a tile to move first.'); }
      var self2 = this; setTimeout(function () { self2.showQuotes(); }, 400);
    },

    // ---------- HUD ----------
    bindGame: function () {
      $('btn-menu').onclick = function () { App.openPanel('menu'); };
      $('btn-pedia-top').onclick = function () { App.openPanel('pedia', { cat: App.pediaState.cat }); };
      $('btn-end').onclick = function () { if (App._todo && App._todo.length) App.doTodo(0); else App.endTurn(); };
      $('btn-next').onclick = function () { App.nextUnit(); };
      $('panel-close').onclick = function () { App.closePanel(); };
      $('top-yields').onclick = function (e) { var y = e.target.closest('.y'); if (y) App.openPanel(y.dataset.panel); };
      $('context').addEventListener('click', function (e) { var b = e.target.closest('[data-action]'); if (b) App.action(b.dataset.action, b.dataset); });
      $('notifs').addEventListener('click', function (e) { var x = e.target.closest('.nx'); if (x) { App.action('dismiss', x.dataset); return; } var n = e.target.closest('.notif'); if (!n) return; if (n.dataset.clear) App.action('clearnotifs', {}); else App.onNotif(+n.dataset.i); });
      $('btn-pass').onclick = function () { App.endTurn(true); };
      $('panel-body').addEventListener('click', function (e) { var b = e.target.closest('[data-action]'); if (b) App.action(b.dataset.action, b.dataset); });
      $('panel-body').addEventListener('input', function (e) { if (e.target.id === 'pedia-search') { App.pediaState.q = e.target.value; AU.Panels.renderPediaList(App); } });
    },
    refreshHud: function () {
      var g = this.g, p = G.player(g); if (!g) return;
      var y = G.civYields(g, p);
      var techT = p.currentTech ? AU.TECH_BY_ID[p.currentTech] : null, civT = p.currentCivic ? AU.CIVIC_BY_ID[p.currentCivic] : null;
      function turnsLeft(prog, cost, rate) { return rate > 0 ? Math.max(1, Math.ceil((cost - prog) / rate)) : '∞'; }
      var techTxt = techT ? techT.name + ' (' + turnsLeft(p.techProgress[techT.id] || 0, G.techCost(g, p, techT), y.science) + ')' : 'choose';
      var civTxt = civT ? civT.name + ' (' + turnsLeft(p.civicProgress[civT.id] || 0, G.civicCost(g, p, civT), y.culture) + ')' : 'choose';
      var sets = G.civSettlements(g, p.idx), unhappy = sets.filter(function (s) { return G.settlementYields(g, s).happiness < 0; }).length;
      $('top-yields').innerHTML =
        '<span class="y" data-panel="empire">💰 <b>' + Math.floor(p.gold) + '</b><small>' + (y.gold >= 0 ? '+' : '') + y.gold.toFixed(1) + '</small></span>' +
        '<span class="y" data-panel="tech">🔬 <b>' + y.science.toFixed(1) + '</b><small>' + techTxt + '</small></span>' +
        '<span class="y" data-panel="civics">🎭 <b>' + y.culture.toFixed(1) + '</b><small>' + civTxt + '</small></span>' +
        '<span class="y" data-panel="religion">🕊️ <b>' + Math.floor(p.faith || 0) + '</b><small>+' + (y.faith || 0) + (p.religion && g.religions[p.religion] ? ' ' + g.religions[p.religion].icon : '') + '</small></span>' +
        '<span class="y" data-panel="empire">' + (unhappy ? '😠 <b>' + unhappy + '</b><small>unhappy</small>' : '😊 <small>' + sets.length + ' settlements</small>') + '</span>';
      $('top-turn').innerHTML = '<b>Turn ' + g.turn + '</b><br>' + AU.ERAS[p.era] + ' Era';
      this.refreshNotifs();
      this.refreshContext();
      var need = this.unitsNeedingOrders().length;
      $('btn-next').textContent = need ? 'Next Unit (' + need + ')' : 'Next Unit';
      $('btn-next').classList.toggle('attention', need > 0);
      $('btn-next').disabled = need === 0;
      var todo = this.todo(); this._todo = todo;
      var be = $('btn-end');
      if (todo.length) { be.innerHTML = todo[0].icon + ' ' + todo[0].text + (todo.length > 1 ? ' <small>+' + (todo.length - 1) + ' more</small>' : ''); be.classList.add('todo'); $('btn-pass').hidden = false; }
      else { be.textContent = 'End Turn'; be.classList.remove('todo'); $('btn-pass').hidden = true; }
    },
    // Everything that still needs a decision before the turn can end, most important first (Civ 6 style).
    todo: function () {
      var g = this.g, p = G.player(g), list = [], self = this;
      if (!g) return list;
      g.civs.forEach(function (o) { if (o.peaceOffer && g.turn - o.peaceOffer < 5 && G.atWar(g, p.idx, o.idx)) list.push({ icon: '🕊️', text: G.leaderName(o) + ' offers peace', go: function () { self.openPanel('diplomacy'); } }); });
      G.civSettlements(g, p.idx).forEach(function (s) {
        if (s.isCity && !s.queue.length) list.push({ icon: '⚙️', text: 'Production: ' + s.name, go: function () { self.selectSettlement(s); self.renderer.centerOn(g, s.tile); self.openPanel('city', { id: s.id }); } });
        if (s.pendingGrowth > 0) list.push({ icon: '🌱', text: 'Choose tile: ' + s.name, go: function () { self.selectSettlement(s); self.renderer.centerOn(g, s.tile); self.startExpand(s); } });
      });
      if (AU.Religion) {
        if (AU.Religion.canChoosePantheon(g, p)) list.push({ icon: '🕊️', text: 'Choose a pantheon', go: function () { self.openPanel('religion'); } });
        if (AU.Religion.canFound(g, p)) list.push({ icon: '🕊️', text: 'Found a religion', go: function () { self.openPanel('religion'); } });
        if (AU.Religion.canEnhance(g, p)) list.push({ icon: '🕊️', text: 'Enhance your religion', go: function () { self.openPanel('religion'); } });
      }
      if (!p.currentTech && G.availableTechs(p).length) list.push({ icon: '🔬', text: 'Choose research', go: function () { self.openPanel('tech'); } });
      if (!p.currentCivic && G.availableCivics(p).length) list.push({ icon: '🎭', text: 'Choose civic', go: function () { self.openPanel('civics'); } });
      var fsl = G.freeSlots(p), fsn = 0; for (var fk in fsl) fsn += fsl[fk]; if (fsn > 0 && G.availablePolicies(p).length > (p.policies || []).length) list.push({ icon: '🃏', text: 'Empty policy slot', go: function () { self.openPanel('civics'); } });
      var promo = G.civUnits(g, p.idx).filter(function (u) { return U.promosAvailable(u) > 0; });
      if (promo.length) list.push({ icon: '⭐', text: 'Promote ' + promo[0].name + (promo.length > 1 ? ' (+' + (promo.length - 1) + ')' : ''), go: function () { self.selectUnit(promo[0]); self.renderer.centerOn(g, promo[0].tile); } });
      var need = this.unitsNeedingOrders();
      if (need.length) list.push({ icon: '🪖', text: need.length === 1 ? need[0].name + ' needs orders' : need.length + ' units need orders', go: function () { self.nextUnit(); } });
      return list;
    },
    doTodo: function (i) { var it = (this._todo || [])[i]; if (it) { it.go(); this.refreshHud(); this.invalidate(); } },
    refreshNotifs: function () {
      var g = this.g, box = $('notifs'); box.innerHTML = '';
      var ICON = { faith: '🕊️', growth: '🌱', war: '⚔️', attack: '🔥', loss: '💀', capture: '🏴', tech: '🔬', civic: '🎭', build: '🏛️', idle: '⚙️', wonder: '✨', disband: '💸', diplomacy: '🤝', peace: '🕊️', meet: '👋', promote: '⭐' };
      var list = g.notifications.slice(-14).reverse();
      list.forEach(function (n) {
        var d = document.createElement('div'); d.className = 'notif ' + n.kind; d.dataset.i = g.notifications.indexOf(n);
        d.innerHTML = '<span class="ni">' + (ICON[n.kind] || '📣') + '</span><span class="nt"></span><span class="nx" data-action="dismiss" data-i="' + d.dataset.i + '">×</span>';
        d.querySelector('.nt').textContent = n.text; box.appendChild(d);
      });
      if (list.length > 2) { var cl = document.createElement('div'); cl.className = 'notif clear'; cl.textContent = 'Clear all'; cl.dataset.clear = '1'; box.appendChild(cl); }
    },
    onNotif: function (i) {
      var n = this.g.notifications[i]; if (!n) return;
      this.g.notifications.splice(i, 1);
      if (n.panel) this.openPanel(n.panel);
      else if (n.settlement && this.g.settlements[n.settlement]) { this.selectSettlement(this.g.settlements[n.settlement]); this.renderer.centerOn(this.g, n.tile); if (n.kind === 'growth') this.startExpand(this.g.settlements[n.settlement]); else if (n.kind === 'idle' || n.kind === 'build') this.openPanel('city', { id: n.settlement }); }
      else if (n.unit && this.g.units[n.unit]) { this.selectUnit(this.g.units[n.unit]); this.renderer.centerOn(this.g, n.tile); }
      else if (n.tile != null) { this.renderer.centerOn(this.g, n.tile); this.sel.tile = n.tile; }
      this.refreshHud(); this.invalidate();
    },
    showQuotes: function () {
      var g = this.g; if (!g || !g.quoteQueue || !g.quoteQueue.length) return;
      var q = g.quoteQueue.shift(), box = $('quote'), self = this;
      $('quote-kicker').textContent = q.kicker || ''; $('quote-title').textContent = q.title; $('quote-text').textContent = '“' + q.text + '”'; $('quote-by').textContent = '— ' + q.by;
      var art = $('quote-art'), kind = q.cat === 'natural' ? 'natural' : q.cat === 'wonder' ? 'wonders' : q.cat === 'national' ? 'national' : null;
      art.hidden = true; art.removeAttribute('src');
      if (kind && q.id) { art.src = AU.Assets.url(kind, q.id); art.hidden = false; art.onerror = function () { art.hidden = true; }; }
      var bx = box.querySelector('.quote-box'); bx.classList.remove('reveal', 'natural'); void bx.offsetWidth; bx.classList.add('reveal'); if (q.cat === 'natural') bx.classList.add('natural');
      if (q.tile != null && this.renderer) { this.renderer.centerOn(g, q.tile); this.renderer.highlights.selTile = q.tile; this.invalidate(); }
      box.hidden = false;
      $('quote-ok').onclick = function () { box.hidden = true; setTimeout(function () { self.showQuotes(); }, 120); };
    },
    confirm: function (msg, onYes) {
      var box = $('confirm'); $('confirm-text').textContent = msg; box.hidden = false;
      $('confirm-yes').onclick = function () { box.hidden = true; onYes(); };
      $('confirm-no').onclick = function () { box.hidden = true; };
    },
    toast: function (msg, ms) { var t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(this._toastT); this._toastT = setTimeout(function () { t.hidden = true; }, ms || 2200); },

    // ---------- Selection & context ----------
    deselect: function () { this.sel.unit = null; this.sel.settlement = null; this.sel.tile = -1; this.mode = 'normal'; this.pendingAttack = null; this.renderer.highlights = { reach: null, attack: null, expand: null, path: null, selTile: -1 }; this.refreshContext(); this.invalidate(); },
    selectUnit: function (u) {
      this.sel.unit = u.id; this.sel.settlement = null; this.mode = 'normal'; this.pendingAttack = null; this.sel.tile = u.tile;
      this.updateUnitHighlights(); this.refreshContext(); this.invalidate();
    },
    updateUnitHighlights: function () {
      var g = this.g, u = g.units[this.sel.unit]; var h = this.renderer.highlights;
      h.expand = null; h.selTile = -1;
      if (!u) { h.reach = null; h.attack = null; h.path = null; return; }
      h.reach = u.moves > 0 ? U.reachableNow(g, u) : null;
      h.path = u.path;
      var atk = {};
      if (G.isMilitary(u) && u.moves > 0) {
        var t = g.tiles[u.tile], range = U.isRanged(u) ? (U.def(g, u).range || 1) : 1;
        Hex.spiral(t.col, t.row, range, g.W, g.H).forEach(function (i) { if (i !== u.tile && G.player(g).visible[i] && U.canAttackTile(g, u, i)) atk[i] = true; });
      }
      h.attack = Object.keys(atk).length ? atk : null;
    },
    selectSettlement: function (s) {
      this.sel.settlement = s.id; this.sel.unit = null; this.sel.tile = s.tile; this.mode = 'normal'; this.pendingAttack = null;
      this.renderer.highlights = { reach: null, attack: null, expand: null, path: null, selTile: s.tile };
      this.refreshContext(); this.invalidate();
    },
    startExpand: function (s) {
      if (s.pendingGrowth <= 0) { this.toast(s.name + ' has no pending expansion.'); return; }
      this.sel.settlement = s.id; this.sel.unit = null; this.mode = 'expand';
      var set = {}; G.expansionCandidates(this.g, s).forEach(function (i) { set[i] = true; });
      this.renderer.highlights = { reach: null, attack: null, expand: set, path: null, selTile: s.tile };
      this.toast('Choose a tile for ' + s.name + ' to grow into (' + s.pendingGrowth + ' left).');
      this.refreshContext(); this.invalidate();
    },
    refreshContext: function () {
      var g = this.g, box = $('context'); if (!g) return;
      var p = G.player(g), html = '';
      if (this.sel.unit && g.units[this.sel.unit]) {
        var u = g.units[this.sel.unit], def = U.def(g, u), own = u.civ === p.idx;
        var t = g.tiles[u.tile];
        html += '<div class="card"><h3>' + AU.UNITS[u.type].icon + ' ' + u.name + (u.civ >= 0 && !own ? ' <span class="pill">' + G.civData(g.civs[u.civ]).name + '</span>' : u.civ < 0 ? ' <span class="pill war">Independent</span>' : '') + (U.level(u) ? ' <span class="pill">Lv ' + U.level(u) + '</span>' : '') + '</h3>';
        html += '<div class="hpbar"><i style="width:' + u.hp + '%;background:' + (u.hp > 50 ? '#4caf50' : '#e05252') + '"></i></div>';
        html += '<div class="meta">HP ' + u.hp + ' · ' + (def.strength ? 'Str ' + U.strength(g, u, { attacking: false }) : 'Civilian') + (def.ranged ? ' · Ranged ' + U.strength(g, u, { attacking: true, ranged: true }) + ' (range ' + def.range + ')' : '') + ' · Moves ' + u.moves + '/' + G.maxMoves(g, u.civ, u.type) + (u.fortify ? ' · Fortified' : '') + (U.isEmbarked(g, u) ? ' · Embarked' : '') + '</div>';
        if (u.promos && u.promos.length) html += '<div class="meta">⭐ ' + u.promos.map(function (pid) { return AU.PROMO_BY_ID[pid] ? AU.PROMO_BY_ID[pid].name : pid; }).join(', ') + '</div>';
        if (def.unique && def.uuDesc) html += '<div class="meta stat">' + def.uuDesc + '</div>';
        if (own && U.promosAvailable(u)) {
          html += '<div class="promo"><b>⭐ Promotion available</b> (heals 50 HP, ends the turn)<div class="actions">' + U.promoChoices(g, u).map(function (pr) { return '<button class="small gold" data-action="dopromote" data-id="' + pr.id + '" title="' + AU.modsText(pr.mods) + '">' + pr.name + '<small>' + AU.modsText(pr.mods) + '</small></button>'; }).join('') + '</div></div>';
        }
        if (own) {
          html += '<div class="actions">';
          if (this.pendingAttack != null) { var pa = this.previewAttack(u, this.pendingAttack); html += '<button class="small danger" data-action="attack" data-tile="' + this.pendingAttack + '">⚔️ Attack: ' + pa + '</button>'; }
          if (AU.UNITS[u.type].religious) {
            var Rl = AU.Religion, sHere = G.settlementAt(g, u.tile);
            html += '<small class="stat">' + AU.UNITS[u.type].icon + ' ' + u.charges + ' charge' + (u.charges === 1 ? '' : 's') + (u.religion ? ' · ' + Rl.icon(g, u.religion) + ' ' + Rl.name(g, u.religion) : '') + '</small>';
            if (u.type !== 'inquisitor') html += '<button class="small primary" data-action="spread" ' + (Rl.canSpread(g, u) ? '' : 'disabled') + '>Spread religion' + (sHere ? ' in ' + sHere.name : '') + '</button>';
            else html += '<button class="small primary" data-action="inquisition" ' + (Rl.canInquisition(g, u) ? '' : 'disabled') + '>Remove heresy' + (sHere ? ' in ' + sHere.name : '') + '</button>';
            Rl.debateTargets(g, u).forEach(function (tg) { html += '<button class="small danger" data-action="debate" data-id="' + tg.id + '">Debate ' + tg.name + ' (' + Math.round(Rl.debateStrength(g, u) / (Rl.debateStrength(g, u) + Rl.debateStrength(g, tg)) * 100) + '%)</button>'; });
          }
          if (u.type === 'settler') { var can = G.canFoundAt(g, p.idx, u.tile); html += '<button class="small primary" data-action="found" ' + (can ? '' : 'disabled') + '>' + (p.capital ? 'Found Town' : 'Found Capital') + '</button>' + (!can ? '<small class="stat">Too close to another settlement or invalid terrain.</small>' : ''); }
          if (G.isMilitary(u)) html += '<button class="small" data-action="fortify">Fortify</button>';
          if (AU.UNITS[u.type].cls === 'recon') html += '<button class="small" data-action="explore">' + (u.auto ? 'Stop exploring' : 'Auto-explore') + '</button>';
          html += '<button class="small" data-action="skip">Skip</button><button class="small" data-action="sleep">Sleep</button>';
          if (u.path && u.path.length) html += '<button class="small" data-action="cancelpath">Cancel move</button>';
          var upc = U.upgradeCost(g, u); if (upc !== null) html += '<button class="small" data-action="upgrade" ' + (U.canUpgrade(g, u) ? '' : 'disabled') + '>Upgrade → ' + G.unitType(g, p, AU.UNITS[u.type].upgradesTo).name + ' (' + upc + '💰)</button>';
          html += '<button class="small ghost" data-action="disband">Disband</button></div>';
        }
        html += '</div>';
      } else if (this.sel.settlement && g.settlements[this.sel.settlement]) {
        var s = g.settlements[this.sel.settlement], own2 = s.civ === p.idx, y = G.settlementYields(g, s);
        html += '<div class="card"><h3>' + (s.isCapital ? '★ ' : '') + s.name + ' <span class="pill">' + (s.isCity ? 'City' : 'Town') + (s.specialization ? ' · ' + AU.SPECIALIZATIONS[s.specialization].name : '') + '</span>' + (!own2 ? ' <span class="pill">' + G.civData(g.civs[s.civ]).name + '</span>' : '') + '</h3>';
        html += '<div class="meta">Pop ' + s.pop + ' · HP ' + s.hp + '/' + G.settlementMaxHp(g, s) + ' · Def ' + G.settlementStrength(g, s) + (own2 ? ' · <span class="food">🌾' + y.food + '</span> <span class="prod">⚙️' + (s.isCity ? y.production : y.rawProduction + '→💰') + '</span> <span class="goldc">💰' + y.gold + '</span> <span class="sci">🔬' + y.science + '</span> <span class="cult">🎭' + y.culture + '</span> ' + (y.happiness < 0 ? '😠' : '😊') + y.happiness : '') + '</div>';
        if (own2) {
          html += '<div class="actions"><button class="small primary" data-action="city" data-id="' + s.id + '">Manage</button>';
          if (s.pendingGrowth > 0) html += '<button class="small" data-action="expand" data-id="' + s.id + '">🌱 Choose tile (' + s.pendingGrowth + ')</button><button class="small" data-action="autoexpand" data-id="' + s.id + '">Auto</button>';
          if (this.mode === 'expand') html += '<span class="stat">Tap a green tile.</span>';
          html += '</div>';
        }
        html += '</div>';
      } else if (this.sel.tile >= 0) {
        var tt = g.tiles[this.sel.tile];
        if (p.explored[this.sel.tile]) {
          var yy = AU.baseTileYields(tt, p), owner = tt.owner >= 0 && g.settlements[tt.owner] ? g.settlements[tt.owner] : null;
          html += '<div class="card"><h3>' + AU.TERRAIN[tt.terrain].name + (tt.hills ? ' Hills' : '') + (tt.feature ? ', ' + AU.FEATURES[tt.feature].name : '') + (tt.river ? ' (River)' : '') + '</h3><div class="meta">' +
            (tt.resource && (!AU.RESOURCES[tt.resource].revealTech || p.techs[AU.RESOURCES[tt.resource].revealTech]) ? AU.RESOURCES[tt.resource].icon + ' ' + AU.RESOURCES[tt.resource].name + ' · ' : '') +
            '🌾' + yy.food + ' ⚙️' + yy.production + ' 💰' + yy.gold + (yy.culture ? ' 🎭' + yy.culture : '') +
            (owner ? ' · ' + owner.name + (tt.worked ? ' (worked' + (G.improvementFor(g, tt, g.civs[owner.civ]) ? ', ' + AU.IMPROVEMENTS[G.improvementFor(g, tt, g.civs[owner.civ])].name : '') + ')' : ' (unworked)') : '') + (tt.camp ? ' · Independent camp' : '') + '</div></div>';
        }
      }
      box.innerHTML = html;
    },
    previewAttack: function (u, tileIdx) {
      var g = this.g, target = U.targetAt(g, u, tileIdx); if (!target) return '';
      var ranged = U.isRanged(u), a = U.strength(g, u, { attacking: true, ranged: ranged, vs: target.unit || target.settlement });
      var d = target.settlement && (!target.unit || ranged) ? G.settlementStrength(g, target.settlement) : U.strength(g, target.unit, { attacking: false, vs: u });
      var est = Math.round(30 * Math.exp(0.04 * (a - d)));
      var back = ranged ? 0 : Math.round(30 * Math.exp(0.04 * (d - a)) * (target.settlement && !target.unit ? 0.7 : 1));
      return a + ' vs ' + d + ' → ~' + est + ' dmg' + (back ? ', take ~' + back : '');
    },
    unitsNeedingOrders: function () { var g = this.g, p = G.player(g); return G.civUnits(g, p.idx).filter(function (u) { return U.needsOrders(g, u) && !u.auto; }); },
    nextUnit: function () {
      var list = this.unitsNeedingOrders(); if (!list.length) return;
      var cur = list.findIndex(function (u) { return u.id === App.sel.unit; });
      var u = list[(cur + 1) % list.length];
      this.selectUnit(u); this.renderer.centerOn(this.g, u.tile); this.invalidate();
    },

    // ---------- Actions ----------
    action: function (name, d) {
      var g = this.g;
      if (!g) { if (name === 'pedia' || name === 'help' || name === 'togglegraphics' || name === 'toggleyields') AU.Panels.action(this, name, d); return; }
      var p = G.player(g), u = this.sel.unit ? g.units[this.sel.unit] : null, s;
      switch (name) {
        case 'spread': if (u && AU.Religion.spread(g, u)) { this.toast('Religion spread.'); if (g.units[u.id]) this.afterUnitAction(u, true); else this.deselect(); this.refreshHud(); this.invalidate(); } break;
        case 'inquisition': if (u && AU.Religion.inquisition(g, u)) { this.toast('Heresy removed.'); if (g.units[u.id]) this.afterUnitAction(u, true); else this.deselect(); this.refreshHud(); this.invalidate(); } break;
        case 'debate': if (u) { var tgt = g.units[+d.id]; var res = tgt && AU.Religion.debate(g, u, tgt); if (res) { this.toast(res.win ? 'Debate won!' : 'Debate lost…'); if (g.units[u.id]) this.selectUnit(u); else this.deselect(); this.refreshHud(); this.invalidate(); } } break;
        case 'dopromote': if (u && U.promote(g, u, d.id)) { this.toast(u.name + ' promoted: ' + AU.PROMO_BY_ID[d.id].name + '.'); this.afterUnitAction(u, true); } break;
        case 'todo': this.doTodo(+d.i); break;
        case 'dismiss': this.g.notifications.splice(+d.i, 1); this.refreshHud(); break;
        case 'clearnotifs': this.g.notifications.length = 0; this.refreshHud(); break;
        case 'found': if (u) { var st = U.foundCity(g, u); if (st) { this.selectSettlement(st); this.toast('Founded ' + st.name + '.'); } } break;
        case 'fortify': if (u) { U.fortify(g, u); this.afterUnitAction(u); } break;
        case 'skip': if (u) { U.skip(g, u); this.afterUnitAction(u, true); } break;
        case 'sleep': if (u) { U.sleep(g, u); this.afterUnitAction(u, true); } break;
        case 'explore': if (u) { u.auto = !u.auto; if (u.auto) { AU.AI.explore(g, p, u); this.afterUnitAction(u, true); } else this.refreshContext(); } break;
        case 'cancelpath': if (u) { u.path = null; this.updateUnitHighlights(); this.refreshContext(); this.invalidate(); } break;
        case 'upgrade': if (u && U.upgrade(g, u)) { this.toast('Upgraded to ' + u.name + '.'); this.selectUnit(u); } break;
        case 'disband': if (u) { var self = this; this.confirm('Disband ' + u.name + '?', function () { U.disband(g, u); self.deselect(); self.refreshHud(); self.invalidate(); }); } break;
        case 'attack': if (u && d.tile != null) this.doAttack(u, +d.tile); break;
        case 'city': this.openPanel('city', { id: +d.id }); break;
        case 'expand': s = g.settlements[+d.id]; if (s) { this.closePanel(); this.renderer.centerOn(g, s.tile); this.startExpand(s); } break;
        case 'autoexpand': s = g.settlements[+d.id]; if (s) { G.autoExpand(g, s); this.deselect(); this.selectSettlement(s); this.toast(s.name + ' expanded automatically.'); if (this.panel === 'city') this.openPanel('city', { id: s.id }); } break;
        case 'center': this.closePanel(); if (d.tile != null) { this.renderer.centerOn(g, +d.tile); s = G.settlementAt(g, +d.tile); if (s) this.selectSettlement(s); } break;
        default: AU.Panels.action(this, name, d);
      }
      this.refreshHud(); this.invalidate();
    },
    afterUnitAction: function (u, advance) {
      if (advance) { var list = this.unitsNeedingOrders(); if (list.length) { this.selectUnit(list[0]); this.renderer.centerOn(this.g, list[0].tile); } else this.deselect(); }
      else this.selectUnit(u);
      this.refreshHud();
    },
    doAttack: function (u, tileIdx) {
      var g = this.g, res = U.attack(g, u, tileIdx);
      this.pendingAttack = null;
      if (!res) { this.toast('Cannot attack that target.'); return; }
      var msg = [];
      if (res.captured) msg.push('Captured ' + g.settlements[res.settlement].name + '!');
      else if (res.settlementDamage != null) msg.push('Hit ' + g.settlements[res.settlement].name + ' for ' + res.settlementDamage);
      if (res.defenderDamage != null) msg.push((res.killed ? 'Destroyed the enemy' : 'Dealt ' + res.defenderDamage) + (res.capturedUnit ? ' (captured!)' : ''));
      if (res.attackerDamage) msg.push('took ' + res.attackerDamage);
      if (res.attackerKilled) msg.push('your unit was lost');
      this.toast(msg.join(', ') + '.');
      if (g.units[u.id]) this.selectUnit(u); else this.deselect();
      this.refreshHud(); this.invalidate();
    },
    onTap: function (tileIdx) {
      var g = this.g, p = G.player(g);
      if (tileIdx < 0) { this.deselect(); return; }
      var u = this.sel.unit ? g.units[this.sel.unit] : null;
      var h = this.renderer.highlights;
      if (this.mode === 'expand' && this.sel.settlement) {
        var s = g.settlements[this.sel.settlement];
        if (h.expand && h.expand[tileIdx]) { G.expandTo(g, s, tileIdx); if (s.pendingGrowth > 0) this.startExpand(s); else { this.mode = 'normal'; this.selectSettlement(s); this.toast(s.name + ' claimed a new tile.'); } this.refreshHud(); return; }
        this.mode = 'normal';
      }
      if (u && u.civ === p.idx) {
        if (tileIdx === u.tile) { this.cycleAtTile(tileIdx); return; }
        if (h.attack && h.attack[tileIdx]) {
          if (this.pendingAttack === tileIdx) { this.doAttack(u, tileIdx); return; }
          this.pendingAttack = tileIdx; this.refreshContext(); this.toast('Attack: ' + this.previewAttack(u, tileIdx) + '. Tap again to confirm.'); return;
        }
        this.pendingAttack = null;
        if (!p.explored[tileIdx]) { this.toast('Unexplored territory.'); return; }
        // move (this turn or multi-turn)
        var ownUnitsThere = G.unitsAt(g, tileIdx).filter(function (o) { return o.civ === p.idx && G.isMilitary(o) === G.isMilitary(u); });
        if (ownUnitsThere.length) { this.selectUnit(ownUnitsThere[0]); return; }
        var sHere = G.settlementAt(g, tileIdx);
        if (sHere && sHere.civ === p.idx && !(h.reach && h.reach[tileIdx])) { var path0 = U.findPath(g, u, tileIdx); if (!path0) { this.selectSettlement(sHere); return; } }
        if (U.orderMove(g, u, tileIdx)) { if (u.moves > 0 && !(u.path && u.path.length)) this.selectUnit(u); else this.afterUnitAction(u, true); this.refreshHud(); return; }
        this.toast('No route there.');
        return;
      }
      this.cycleAtTile(tileIdx);
    },
    cycleAtTile: function (tileIdx) {
      var g = this.g, p = G.player(g);
      var units = p.visible[tileIdx] ? G.unitsAt(g, tileIdx) : [];
      var s = G.settlementAt(g, tileIdx);
      var items = [];
      units.filter(function (o) { return o.civ === p.idx; }).forEach(function (o) { items.push({ unit: o }); });
      if (s) items.push({ settlement: s });
      units.filter(function (o) { return o.civ !== p.idx; }).forEach(function (o) { items.push({ unit: o }); });
      items.push({ tile: tileIdx });
      var curIdx = items.findIndex(function (it) { return (it.unit && it.unit.id === App.sel.unit) || (it.settlement && it.settlement.id === App.sel.settlement && !App.sel.unit) || (it.tile !== undefined && App.sel.tile === tileIdx && !App.sel.unit && !App.sel.settlement); });
      var next = items[(curIdx + 1) % items.length];
      if (next.unit) this.selectUnit(next.unit);
      else if (next.settlement) { if (this.sel.settlement === next.settlement.id && next.settlement.civ === p.idx && curIdx >= 0 && items.length === 2) this.openPanel('city', { id: next.settlement.id }); else this.selectSettlement(next.settlement); }
      else { this.sel.unit = null; this.sel.settlement = null; this.sel.tile = tileIdx; this.mode = 'normal'; this.renderer.highlights = { reach: null, attack: null, expand: null, path: null, selTile: tileIdx }; this.refreshContext(); this.invalidate(); }
    },
    endTurn: function (force) {
      if (this.busy || !this.g) return;
      if (!force && this._todo && this._todo.length && this.settings.strictTurn) { this.doTodo(0); return; }
      var g = this.g, p = G.player(g), self = this;
      if (g.victory) { this.openPanel('victory'); return; }
      this.busy = true; $('btn-end').disabled = true; $('btn-end').textContent = 'Processing…';
      setTimeout(function () {
        try {
          G.civUnits(g, p.idx).forEach(function (u) { if (u.auto && u.moves > 0) AU.AI.explore(g, p, u); });
          G.endTurn(g);
          G.civUnits(g, p.idx).forEach(function (u) { if (u.auto && u.moves > 0) AU.AI.explore(g, p, u); });
        } catch (e) { console.error(e); self.toast('Error during turn: ' + e.message, 4000); }
        self.busy = false; $('btn-end').disabled = false;
        self.pendingAttack = null;
        if (self.sel.unit && !g.units[self.sel.unit]) self.deselect(); else if (self.sel.unit) self.updateUnitHighlights();
        self.refreshHud(); self.invalidate();
        self.showQuotes();
        if (g.victory) self.openPanel('victory');
        else { var list = self.unitsNeedingOrders(); if (list.length && !self.sel.unit) { self.selectUnit(list[0]); self.renderer.centerOn(g, list[0].tile); } }
        if (!p.alive) self.openPanel('victory');
      }, 20);
    },

    // ---------- Panels ----------
    openPanel: function (name, data) {
      this.panel = name; this.panelData = data || {};
      $('panel').hidden = false; $('toast').hidden = true;
      AU.Panels.render(this, name, this.panelData);
      $('panel-body').scrollTop = 0;
    },
    closePanel: function () { if (AU.CityView) AU.CityView.close(); this.panel = null; $('panel').hidden = true; if (this.g) { this.refreshHud(); this.invalidate(); } else this.showTitle(); },
    refreshPanel: function () { if (this.panel) AU.Panels.render(this, this.panel, this.panelData); },

    // ---------- Input ----------
    bindInput: function () {
      var cv = $('map'), r = this.renderer, self = this;
      var pointers = {}, dragging = false, moved = false, lastDist = 0, startX = 0, startY = 0, lastX = 0, lastY = 0, dragUnit = null, dragTarget = -1;
      cv.addEventListener('pointerdown', function (e) {
        cv.setPointerCapture(e.pointerId);
        pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
        var keys = Object.keys(pointers);
        if (keys.length === 1) {
          dragging = true; moved = false; startX = lastX = e.clientX; startY = lastY = e.clientY; dragUnit = null;
          if (self.g && self.mode !== 'expand') { var rect0 = cv.getBoundingClientRect(); var idx0 = r.tileAtScreen(self.g, e.clientX - rect0.left, e.clientY - rect0.top); var pl = G.player(self.g); if (idx0 >= 0) { var own = G.unitsAt(self.g, idx0).filter(function (o) { return o.civ === pl.idx && o.moves > 0; }); var cur = self.sel.unit && self.g.units[self.sel.unit]; if (cur && cur.tile === idx0 && cur.moves > 0) dragUnit = cur; else if (own.length) dragUnit = own[0]; } }
        }
        else if (keys.length === 2) { var a = pointers[keys[0]], b = pointers[keys[1]]; lastDist = Math.hypot(a.x - b.x, a.y - b.y); }
      });
      cv.addEventListener('pointermove', function (e) {
        if (!pointers[e.pointerId]) return;
        pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
        var keys = Object.keys(pointers);
        if (keys.length === 2) {
          var a = pointers[keys[0]], b = pointers[keys[1]], dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (lastDist > 0) { var f = dist / lastDist; var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2; self.zoomAt(mx, my, f); }
          lastDist = dist; moved = true;
        } else if (dragging) {
          var dx = e.clientX - lastX, dy = e.clientY - lastY; lastX = e.clientX; lastY = e.clientY;
          if (Math.hypot(e.clientX - startX, e.clientY - startY) > 6) moved = true;
          if (moved && dragUnit && self.g.units[dragUnit.id]) {
            if (self.sel.unit !== dragUnit.id) self.selectUnit(dragUnit);
            var rect1 = cv.getBoundingClientRect(); var idx1 = r.tileAtScreen(self.g, e.clientX - rect1.left, e.clientY - rect1.top);
            if (idx1 !== dragTarget) { dragTarget = idx1; var path = idx1 >= 0 && idx1 !== dragUnit.tile && G.player(self.g).explored[idx1] ? U.findPath(self.g, dragUnit, idx1) : null; r.highlights.path = path || null; r.highlights.dragTile = idx1; self.invalidate(); }
          } else if (moved) { r.cam.x -= dx / r.cam.zoom; r.cam.y -= dy / r.cam.zoom; r.clampCamera(self.g); self.invalidate(); }
        }
      });
      function up(e) {
        var was = pointers[e.pointerId]; delete pointers[e.pointerId];
        if (!was) return;
        if (Object.keys(pointers).length === 0) {
          if (dragging && !moved && self.g) { var rect = cv.getBoundingClientRect(); var idx = r.tileAtScreen(self.g, e.clientX - rect.left, e.clientY - rect.top); self.onTap(idx); self.refreshHud(); self.invalidate(); }
          else if (dragging && moved && dragUnit && self.g && self.g.units[dragUnit.id]) { r.highlights.dragTile = -1; if (dragTarget >= 0 && dragTarget !== dragUnit.tile) { self.sel.unit = dragUnit.id; self.onTap(dragTarget); } else self.selectUnit(dragUnit); self.refreshHud(); self.invalidate(); }
          dragging = false; lastDist = 0; dragUnit = null; dragTarget = -1;
        } else lastDist = 0;
      }
      cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
      cv.addEventListener('wheel', function (e) { e.preventDefault(); self.zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.15 : 1 / 1.15); }, { passive: false });
      window.addEventListener('keydown', function (e) {
        if (!self.g || $('game').hidden) return;
        if (e.key === 'Enter' && !self.panel) self.endTurn();
        else if (e.key === 'Escape') self.back();
        else if (e.key === 'n' || e.key === 'N') self.nextUnit();
        else if (e.key === 'y' || e.key === 'Y') self.action('toggleyields', {});
        else if (e.key === 'f' || e.key === 'F') self.action('fortify', {});
        else if (e.key === ' ') { e.preventDefault(); self.action('skip', {}); }
      });
    },
    zoomAt: function (sx, sy, f) {
      var r = this.renderer, rect = $('map').getBoundingClientRect(); sx -= rect.left; sy -= rect.top;
      var before = r.screenToWorld(sx, sy);
      r.cam.zoom = Math.max(0.3, Math.min(r.maxZoom || 2.8, r.cam.zoom * f));
      var after = r.screenToWorld(sx, sy);
      r.cam.x += before[0] - after[0]; r.cam.y += before[1] - after[1];
      r.clampCamera(this.g); this.invalidate();
    }
  };
  AU.App = App;
  window.addEventListener('DOMContentLoaded', function () { App.init(); });
})(globalThis.AU = globalThis.AU || {});
