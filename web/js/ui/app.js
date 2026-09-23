// Application controller: screens, input, selection, turn flow, persistence.
(function (AU) {
  var G = AU.G, U = AU.U, Hex = AU.Hex;
  var SAVE_KEY = 'ages_unbroken_save_v1', SETTINGS_KEY = 'ages_unbroken_settings';
  var $ = function (id) { return document.getElementById(id); };

  var App = {
    g: null, renderer: null, sel: { unit: null, settlement: null, tile: -1 }, mode: 'normal', panel: null, dirty: true, pendingAttack: null,
    setup: { civ: 'rome' }, busy: false,

    settings: { graphics: '2d', yields: false, iso: true, music: true, musicVolume: 0.7 }, pediaState: { cat: 'concepts' },
    loadSettings: function () { try { var s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); if (!s.v || s.v < 2) { s.graphics = '2d'; s.v = 2; } Object.assign(this.settings, s); } catch (e) {} if (this.settings.tips === undefined) this.settings.tips = true; if (!this.settings.resourceStyle) this.settings.resourceStyle = 'plain'; },
    saveSettings: function () { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings)); } catch (e) {} },
    webglOk: function () { try { var c = document.createElement('canvas'); return !!(window.THREE && (c.getContext('webgl2') || c.getContext('webgl'))); } catch (e) { return false; } },
    makeRenderer: function () {
      var old = this.renderer, cam = old ? old.cam : null;
      if (old && old.dispose) old.dispose();
      // a fresh canvas: a context type cannot be changed on an existing canvas
      var oldCanvas = $('map'), cv = document.createElement('canvas'); cv.id = 'map'; oldCanvas.parentNode.replaceChild(cv, oldCanvas);
      var use3d = this.settings.graphics === '3d' && this.webglOk();
      try { this.renderer = use3d ? new AU.Renderer3D(cv) : new AU.Renderer(cv); }
      catch (e) { console.warn('3' + _('D renderer failed, falling back to 2D'), e); this.settings.graphics = '2d'; this.renderer = new AU.Renderer(cv); }
      if (cam) this.renderer.cam = cam;
      this.renderer.showYields = !!this.settings.yields; this.renderer.resourceBadge = this.settings.resourceStyle === 'badge'; this.renderer.iso = this.settings.iso !== false;
      this.renderer.resize(); this.bindInput(); this.invalidate();
    },
    init: function () {
      this.loadSettings();
      if (AU.Audio) AU.Audio.init(this.settings);
      this.makeRenderer();
      this.bindTitle(); this.bindGame();
      window.addEventListener('resize', function () { App.renderer.resize(); App.invalidate(); });
      window.__androidBack = function () { return App.back() ? 'true' : 'false'; };
      this.showTitle();
      this.setupUpdates();
      this.loop();
    },
    loop: function () { if (App.dirty && App.g && !$('game').hidden) { App.dirty = false; App.renderer.draw(App.g, App); } requestAnimationFrame(App.loop); },
    invalidate: function () { this.dirty = true; },
    // Ask the browser to keep our storage even under storage pressure (Chrome grants it to installed apps and engaged sites).
    persistStorage: function () { try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {}); } catch (e) {} },
    // Save files: a plain JSON file the player can keep anywhere and load on any device.
    exportSave: function () { if (!this.g) return; try { var blob = new Blob([G.serialize(this.g)], { type: 'application/json' }), a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'tiny-empires-' + G.civData(G.player(this.g)).name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-turn' + this.g.turn + '.json'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000); this.toast(_('Save file downloaded.')); } catch (e) { this.toast(_('Could not export the save: ') + e.message); } },
    importSave: function () { var self = this, inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json'; inp.onchange = function () { var f = inp.files && inp.files[0]; if (!f) return; var r = new FileReader(); r.onload = function () { try { var g = G.deserialize(String(r.result)); self.startGameState(g); self.save(true); self.toast(_('Save file loaded.')); } catch (e) { self.toast(_('That file is not a Tiny Empires save: ') + e.message); } }; r.readAsText(f); }; inp.click(); },
    hasSave: function () { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } },
    save: function (silent) { try { localStorage.setItem(SAVE_KEY, G.serialize(this.g)); if (!silent) this.toast(_('Game saved.')); return true; } catch (e) { if (!silent) this.toast(_('Could not save') + ': ' + e.message); return false; } },
    load: function () { try { var j = localStorage.getItem(SAVE_KEY); if (!j) return false; this.startGameState(G.deserialize(j)); return true; } catch (e) { this.toast(_('Could not load save') + ': ' + e.message); return false; } },
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
    renderLangBar: function () {
      var bar = $('lang-bar'); if (!bar || !AU.I18n) return; var I = AU.I18n, html = '';
      for (var k in I.LANGS) html += '<button class="small ' + (k === I.lang ? 'on' : 'ghost') + '" data-lang="' + k + '">' + I.LANGS[k] + '</button>';
      bar.innerHTML = html;
      bar.querySelectorAll('button').forEach(function (b) { b.onclick = function () { App.setLanguage(b.dataset.lang); }; });
    },
    setLanguage: function (lang) { if (!AU.I18n || lang === AU.I18n.lang) return; AU.I18n.setLang(lang); if (this.g) this.save(true); location.reload(); },
    showTitle: function () { $('btn-continue').hidden = !this.hasSave(); var vl = $('version-line'); if (vl) vl.textContent = 'v0.3 · ' + AU.CIVS.length + ' empires · ' + AU.CIVS.reduce(function (n, c) { return n + c.leaders.length; }, 0) + ' leaders · single-player'; this.showScreen('title'); this.paintTitle(); this.showKeyArt(); if (AU.Audio) AU.Audio.play('menu'); this.refreshMusicBtn(); },
    refreshMusicBtn: function () { var b = $('btn-music'); if (b && AU.Audio) { b.textContent = AU.Audio.enabled ? '🎵' : '🔇'; b.title = AU.Audio.enabled ? _('Music on (tap to mute)') : _('Music off'); } },
    showKeyArt: function () { // the painted key art behind the title when it exists; the generated map stays as fallback
      var img = $('title-art'), logo = $('logo-img'); if (!img) return;
      var id = window.innerWidth >= window.innerHeight ? 'title_landscape' : 'title_portrait';
      var list = AU.ASSET_LIST || [];
      if (list.indexOf('assets/keyart/' + id + '.jpg') >= 0) { img.hidden = false; img.onload = function () { $('title').classList.add('has-art'); }; img.onerror = function () { img.hidden = true; $('title').classList.remove('has-art'); }; if (img.dataset.id !== id) { img.dataset.id = id; img.src = AU.Assets.url('keyart', id); } }
      if (logo && list.indexOf('assets/logo/tiny_empires.png') >= 0) { logo.hidden = false; logo.onerror = function () { logo.hidden = true; $('title').classList.remove('has-logo'); }; logo.onload = function () { $('title').classList.add('has-logo'); }; if (!logo.src) logo.src = AU.Assets.url('logo', 'tiny_empires'); }
    },
    paintTitle: function () {
      try {
        var cv = $('title-bg'); if (!cv) return;
        cv.width = cv.clientWidth; cv.height = cv.clientHeight;
        var r = new AU.Renderer(cv); r.resize();
        var g = G.newGame({ playerCiv: 'greece', mapSize: 'small', mapType: ['continents', 'archipelago', 'fractal', 'pangaea'][Math.floor(Math.random() * 4)], numCivs: 1, numStates: 0, seed: (Date.now() & 0xffff) + 1 });
        var p = G.player(g); p.explored.fill(1); p.visible = null;
        r.cam.zoom = Math.max(cv.width / (AU.HEX_R * 1.732 * g.W), cv.height / (AU.HEX_R * 1.5 * g.H)) * 1.05;
        r.cam.x = AU.HEX_R * 1.732 * g.W / 2; r.cam.y = AU.HEX_R * 1.5 * g.H / 2;
        r.draw(g, null);
      } catch (e) { console.warn('title background failed', e); }
    },
    bindTitle: function () {
      $('btn-new').onclick = function () { App.showSetup(); };
      $('btn-music').onclick = function () { App.settings.music = !(App.settings.music !== false); App.saveSettings(); AU.Audio.setEnabled(App.settings.music); App.refreshMusicBtn(); };
      window.addEventListener('resize', function () { if (!$('title').hidden) App.showKeyArt(); });
      $('btn-continue').onclick = function () { if (!App.load()) App.toast(_('No saved game found.')); };
      $('btn-help').onclick = function () { App.showScreen('game'); App.openPanel('help'); };
      $('btn-hall').onclick = function () { App.showScreen('game'); App.openPanel('hall'); };
      $('btn-tutorial').onclick = function () { AU.Tutorial.start(App); };
      $('btn-scenarios').onclick = function () { App.showScenarios(); };
      App.renderLangBar(); App.persistStorage();
      $('tut-skip').onclick = function () { AU.Tutorial.skip(App); };
      $('tut-next').onclick = function () { AU.Tutorial.next(App); };
      $('tut-go').onclick = function () { AU.Tutorial.go(App); };
      $('tip-ok').onclick = function () { AU.Tips.close(App); };
      $('tip-off').onclick = function () { AU.Tips.disable(App); };
      $('btn-pedia').onclick = function () { App.showScreen('game'); App.openPanel('pedia', { cat: 'concepts' }); };
      $('btn-back').onclick = function () { App.showTitle(); };
      $('btn-start').onclick = function () { App.startNewGame(); };
      $('btn-sheet-start').onclick = function () { App.startNewGame(); };
      $('btn-sheet-back').onclick = function () { App.closeSheet(); };
      $('btn-sheet-ok').onclick = function () { App.closeSheet(); };
    },
    // Scenario picker: a list of scenarios, then the normal setup restricted to the scenario's empires.
    showScenarios: function () {
      var self = this, list = Object.keys(AU.SCENARIOS || {});
      if (list.length === 1) { this.showSetup(list[0]); return; }
      var html = '<div class="lang-list">'; list.forEach(function (id) { var sc = AU.SCENARIOS[id]; html += '<button class="big ghost" data-scenario="' + id + '">' + (sc.icon || '📜') + ' ' + sc.name + '</button>'; }); html += '</div>';
      this.confirm(html, function () {}); // reuse the dialog frame
      document.querySelectorAll('#confirm [data-scenario]').forEach(function (b) { b.onclick = function () { $('confirm').hidden = true; self.showSetup(b.dataset.scenario); }; });
    },
    showSetup: function (scenarioId) {
      var grid = $('civ-grid'); grid.innerHTML = '';
      var sc = scenarioId && AU.SCENARIOS ? AU.SCENARIOS[scenarioId] : null; this.setup.scenario = sc ? sc.id : null;
      var ORDER = { easy: 0, medium: 1, hard: 2 }, DLABEL = { easy: '● ' + _('Easy'), medium: '●● ' + _('Medium'), hard: '●●● ' + _('Hard') };
      var bar = $('scenario-bar'), title = $('setup-title');
      if (sc) {
        var mp = AU.SCENARIO_MAPS && AU.SCENARIO_MAPS[sc.map];
        bar.hidden = false; bar.innerHTML = '<div class="sc-head"><span class="sc-icon">' + (sc.icon || '📜') + '</span><div class="grow"><b>' + sc.name + '</b><small>' + (mp ? mp.w + '×' + mp.h + ' ' + _('tiles') + ' · ' : '') + sc.civs.length + ' ' + _('empires') + ' · ' + (mp ? mp.states.length + ' ' + _('free cities') : '') + '</small></div></div><p>' + sc.desc + '</p><div class="sc-cast">' + sc.civs.map(function (cv) { var c = AU.CIV_BY_ID[cv.civ], l = AU.LEADER_BY_ID[cv.leader]; return '<span class="pill"><img src="' + AU.Assets.url('civs', cv.civ) + '" alt="" onerror="this.remove()">' + (cv.name || c.name) + (l ? ' · ' + l.name : '') + '</span>'; }).join('') + '</div>';
        title.textContent = _('Choose your empire'); document.querySelectorAll('.setup-options label').forEach(function (lb) { var sel = lb.querySelector('select,input'); lb.hidden = !!(sel && (sel.id === 'opt-size' || sel.id === 'opt-type' || sel.id === 'opt-civs' || sel.id === 'opt-states')); });
        var mine = sc.civs.filter(function (cv) { return cv.civ === App.setup.civ; })[0] || sc.civs[0]; App.setup.civ = mine.civ; App.setup.leader = AU.LEADER_BY_ID[mine.leader] ? mine.leader : AU.CIV_BY_ID[mine.civ].leaders[0].id;
      } else { bar.hidden = true; document.querySelectorAll('.setup-options label').forEach(function (lb) { lb.hidden = false; }); }
      var civList = sc ? sc.civs.map(function (cv) { return AU.CIV_BY_ID[cv.civ]; }) : AU.CIVS.slice().sort(function (x, y) { var ox = x.difficulty in ORDER ? ORDER[x.difficulty] : 1, oy = y.difficulty in ORDER ? ORDER[y.difficulty] : 1; return ox - oy || x.name.localeCompare(y.name); });
      civList.forEach(function (c) {
        var d = document.createElement('div'); d.className = 'civ-card diff-' + (c.difficulty || 'medium') + (c.id === App.setup.civ ? ' selected' : ''); d.dataset.civ = c.id;
        var em = AU.Assets.get('civs', c.id);
        d.innerHTML = '<div class="swatch" style="background:' + c.color + ';border-bottom:3px solid ' + c.color2 + '"></div>' + '<img class="emblem" src="' + AU.Assets.url('civs', c.id) + '" alt="" onerror="this.remove()">' + '<b>' + c.name + '</b><span class="dtag ' + (c.difficulty || 'medium') + '">' + (DLABEL[c.difficulty] || DLABEL.medium) + '</span><span>' + c.leaders.length + ' leaders</span>';
        d.onclick = function () { App.setup.civ = c.id; App.setup.leader = c.leaders[0].id; App.showSetupDetail(); grid.querySelectorAll('.civ-card').forEach(function (x) { x.classList.toggle('selected', x.dataset.civ === c.id); }); App.openSheet(); };
        grid.appendChild(d);
      });
      function fill(sel, obj, def) { sel.innerHTML = ''; for (var k in obj) { var o = document.createElement('option'); o.value = k; o.textContent = obj[k].name; if (k === def) o.selected = true; sel.appendChild(o); } }
      fill($('opt-size'), AU.MAP_SIZES, 'small'); fill($('opt-diff'), AU.DIFFICULTIES, 'prince');
      fill($('opt-type'), AU.MAP_TYPES, 'continents'); fill($('opt-speed'), AU.SPEEDS, 'standard');
      var civSel = $('opt-civs'); civSel.innerHTML = '';
      for (var n = 1; n <= 19; n++) { var o = document.createElement('option'); o.value = n; o.textContent = n; if (n === 5) o.selected = true; civSel.appendChild(o); }
      var stSel = $('opt-states'); stSel.innerHTML = '';
      for (var ns = 0; ns <= 16; ns++) { var os = document.createElement('option'); os.value = ns; os.textContent = ns; if (ns === 4) os.selected = true; stSel.appendChild(os); }
      $('opt-size').onchange = function () { var s = AU.MAP_SIZES[this.value]; civSel.value = String(s.civs - 1); stSel.value = String(Math.min(16, Math.round(s.civs * 0.6))); };
      if (!this.setup.leader || AU.LEADER_BY_ID[this.setup.leader].civId !== this.setup.civ) this.setup.leader = AU.CIV_BY_ID[this.setup.civ].leaders[0].id;
      this.showSetupDetail(); $('civ-sheet').hidden = true;
      this.showScreen('setup');
    },
    openSheet: function () { var sh = $('civ-sheet'); sh.hidden = false; $('civ-detail').scrollTop = 0; },
    closeSheet: function () { $('civ-sheet').hidden = true; this.showPickBar(); },
    showPickBar: function () {
      var c = AU.CIV_BY_ID[this.setup.civ], l = AU.LEADER_BY_ID[this.setup.leader], bar = $('pick-bar'); if (!bar) return;
      bar.innerHTML = '<img src="' + AU.Assets.url('leaders', l.id) + '" alt="" onerror="this.remove()"><div class="grow"><small class="stat">' + _('Playing as') + '</small><b>' + c.name + ' · ' + l.name + '</b><small class="stat">' + (AU.leaningText ? AU.leaningText(l) : '') + '</small></div><button class="small" id="btn-pick-change">' + _('Change') + '</button><button class="small primary" id="btn-pick-start">▶ ' + _('Start') + '</button>';
      var self = this; $('btn-pick-change').onclick = function () { self.showSetupDetail(); self.openSheet(); }; $('btn-pick-start').onclick = function () { self.startNewGame(); };
    },
    showSetupDetail: function () {
      var c = AU.CIV_BY_ID[this.setup.civ], self = this; var st = $('sheet-title'); if (st) st.textContent = c.name;
      var BIAS = { coast: 'the coast', river: 'rivers', hills: 'hills', mountain: 'mountains', desert: 'deserts', forest: 'forests', jungle: 'jungles', tundra: 'the tundra', snow: 'the snow', grassland: 'grasslands', plains: 'plains', marsh: 'marshes', lake: 'lakes' };
      var html = '<h3>' + c.name + ' <span class="dtag ' + (c.difficulty || 'medium') + '">' + ({ easy: _('Easy to play'), medium: _('Medium'), hard: _('Specialised') }[c.difficulty] || _('Medium')) + '</span></h3>' +
        (AU.CULTURES[c.culture] ? '<div class="stat">' + AU.CULTURES[c.culture].name + ' ' + _('cultural group.') + '</div>' : '') + (c.bias && c.bias.length ? '<div class="stat">' + _('Starts near') + ' ' + c.bias.map(function (b) { return BIAS[b] || b; }).join(' and ') + '.</div>' : '') +
        '<div><b>' + c.ability.name + ':</b> ' + G.abilityDesc(c.ability) + '</div>' +
        (c.uu ? '<div><b>' + _('Unique unit') + ' – ' + c.uu.name + ':</b> replaces ' + AU.UNITS[c.uu.replaces].name + ' (' + c.uu.desc + ').</div>' : '') +
        (c.ub ? '<div><b>' + _('Unique building') + ' – ' + c.ub.name + ':</b> replaces ' + AU.BUILDINGS[c.ub.replaces].name + ' (' + c.ub.desc + ').</div>' : '') +
        (c.ui ? '<div><b>' + _('Unique improvement') + ' – ' + c.ui.icon + ' ' + c.ui.name + ':</b> instead of the ' + AU.IMPROVEMENTS[c.ui.replaces].name + (c.ui.when ? ' on ' + AU.whenLabel(c.ui.when) + ' tiles' : '') + ' (' + c.ui.desc + ').</div>' : '') +
        (c.ut ? '<div><b>' + _('Unique town') + ' – ' + c.ut.icon + ' ' + c.ut.name + ':</b> a town specialization only you can pick (' + c.ut.desc + ').</div>' : '') +
        '<h3 style="margin-top:10px">' + _('Choose a leader') + '</h3><div class="leader-list">';
      c.leaders.forEach(function (l) {
        var portrait = AU.Assets.get('leaders', l.id);
        html += '<div class="leader-card' + (l.id === self.setup.leader ? ' selected' : '') + '" data-leader="' + l.id + '">' + '<img class="portrait" src="' + AU.Assets.url('leaders', l.id) + '" alt="" onerror="this.remove()">' + '<b>' + l.name + '</b> <span class="pill">' + l.title + '</span> <span class="pill" title="Victory this leader leans towards">' + AU.leaningText(l) + '</span><div><b>' + l.ability.name + ':</b> ' + G.abilityDesc(l.ability) + '</div></div>';
      });
      html += '</div>';
      $('civ-detail').innerHTML = html;
      $('civ-detail').querySelectorAll('.leader-card').forEach(function (el) { el.onclick = function () { self.setup.leader = el.dataset.leader; self.showSetupDetail(); }; });
      var fs = $('btn-sheet-start'); if (fs) fs.textContent = '▶ ' + _('Start Game');
      this.showPickBar();
    },
    startNewGame: function () {
      var seed = parseInt($('opt-seed').value, 10);
      var opts = { playerCiv: this.setup.civ, playerLeader: this.setup.leader, mapSize: $('opt-size').value, mapType: $('opt-type').value, speed: $('opt-speed').value, difficulty: $('opt-diff').value, numCivs: parseInt($('opt-civs').value, 10) + 1, numStates: parseInt($('opt-states').value, 10), seed: isNaN(seed) ? undefined : seed, scenario: this.setup.scenario || undefined, v2: true };
      this.toast(_('Generating the world…'));
      var self = this;
      setTimeout(function () { try { self.startGameState(G.newGame(opts)); } catch (e) { console.error(e); self.toast(_('Failed to create the game') + ': ' + e.message); } }, 30);
    },
    startGameState: function (g) {
      this.g = g; this.sel = { unit: null, settlement: null, tile: -1 }; this.mode = 'normal'; this.panel = null; $('panel').hidden = true;
      if (AU.Audio) AU.Audio.forEra(G.player(g).era || 0);
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
      if (settler && g.turn === 1) { this.selectUnit(settler); this.toast(_('Tap') + ' "' + _('Found Capital') + '" ' + _('to settle, or tap a tile to move first.')); }
      var self2 = this; setTimeout(function () { self2.showQuotes(); }, 400);
    },

    // ---------- HUD ----------
    bindGame: function () {
      $('btn-menu').onclick = function () { App.openPanel('menu'); };
      $('btn-pedia-top').onclick = function () { App.openPanel('pedia', { cat: App.pediaState.cat }); };
      $('btn-rank').onclick = function () { App.openPanel('rankings'); };
      $('btn-end').onclick = function () { if (App._todo && App._todo.length) App.doTodo(0); else App.endTurn(); };
      $('btn-next').onclick = function () { App.nextUnit(); };
      $('btn-undo').onclick = function () { var g = App.g, d = g && g.undo, u = d && g.units[d.unit]; if (u && AU.U.canUndo(g, u)) { App.sel.unit = u.id; App.action('undomove', {}); } else { $('btn-undo').hidden = true; } };
      $('panel-close').onclick = function () { App.closePanel(); };
      $('top-yields').onclick = function (e) { var y = e.target.closest('.y'); if (y) App.openPanel(y.dataset.panel); };
      $('context').addEventListener('click', function (e) { var b = e.target.closest('[data-action]'); if (b) App.action(b.dataset.action, b.dataset); });
      $('notifs').addEventListener('click', function (e) { var x = e.target.closest('.nx'); if (x) { App.action('dismiss', x.dataset); return; } var n = e.target.closest('.notif'); if (!n) return; if (n.dataset.clear) App.action('clearnotifs', {}); else App.onNotif(+n.dataset.i); });
      $('btn-pass').onclick = function () { App.endTurn(true); };
      $('panel-body').addEventListener('click', function (e) { var b = e.target.closest('[data-action]'); if (b) App.action(b.dataset.action, b.dataset); });
      $('panel-body').addEventListener('input', function (e) { if (e.target.id === 'pedia-search') { App.pediaState.q = e.target.value; AU.Panels.renderPediaList(App); } });
    },
    refreshHud: function () {
      var tb = $('topbar'); if (tb && tb.offsetHeight) document.documentElement.style.setProperty('--topbar-h', tb.offsetHeight + 'px'); // the notification strip sits under the bar whatever its height
      if (this.g) G.checkBoosts(this.g, G.player(this.g)); // sparks fire the moment their condition is met, not at the end of the turn
      if (AU.Tutorial) AU.Tutorial.update(this);
      if (AU.Tips) AU.Tips.update(this);
      var g = this.g, p = G.player(g); if (!g) return;
      if (AU.Audio) AU.Audio.forEra(p.era || 0);
      var y = G.civYields(g, p);
      var techT = p.currentTech ? AU.TECH_BY_ID[p.currentTech] : null, civT = p.currentCivic ? AU.CIVIC_BY_ID[p.currentCivic] : null;
      function turnsLeft(prog, cost, rate) { return rate > 0 ? Math.max(1, Math.ceil((cost - prog) / rate)) : '∞'; }
      var techTxt = techT ? techT.name + ' (' + turnsLeft(p.techProgress[techT.id] || 0, G.techCost(g, p, techT), y.science) + ')' : 'choose';
      var civTxt = civT ? civT.name + ' (' + turnsLeft(p.civicProgress[civT.id] || 0, G.civicCost(g, p, civT), y.culture) + ')' : 'choose';
      if (g.v2 && AU.MasteryWeb) { var vs = AU.MasteryWeb.state(p), ve = AU.V2.ERAS[vs.era] || {}; techTxt = AU.MasteryWeb.foundationCount(p, vs.era) + '/' + (ve.foundationSize || 32) + ' 💡 ' + Math.floor(vs.study || 0) + ' 📚'; civTxt = vs.pendingHubs.length ? '🔮 ' + _('decide') : (Object.keys(vs.traits).length + ' 🔮 ' + Math.floor(vs.heritage || 0) + ' 🎭'); }
      var sets = G.civSettlements(g, p.idx), unhappy = sets.filter(function (s) { return G.settlementYields(g, s).happiness < 0; }).length;
      $('top-yields').innerHTML =
        '<span class="y" data-panel="empire">💰 <b>' + Math.floor(p.gold) + '</b><small>' + (y.gold >= 0 ? '+' : '') + y.gold.toFixed(1) + '</small></span>' +
        '<span class="y" data-panel="tech">🔬 <b>' + y.science.toFixed(1) + '</b><small>' + techTxt + '</small></span>' +
        '<span class="y" data-panel="civics">🎭 <b>' + y.culture.toFixed(1) + '</b><small>' + civTxt + '</small></span>' +
        '<span class="y" data-panel="religion">🕊️ <b>' + Math.floor(p.faith || 0) + '</b><small>+' + (y.faith || 0) + (p.religion && g.religions[p.religion] ? ' ' + g.religions[p.religion].icon : '') + '</small></span>' +
        '<span class="y" data-panel="empire" title="' + _('Command: unit orders left this turn') + '">🎖️ <b>' + G.commandLeft(g, p) + '</b><small>/' + G.commandMax(g, p) + '</small></span>' +
        (g.v2 ? '<span class="y" data-panel="empire">🎯 <b>' + Math.floor(p.influence || 0) + '</b><small>+' + G.influenceIncome(g, p) + '</small></span>' : '') +
        (g.v2 && AU.Society ? (function () { var md = AU.Society.mood(g, p); return '<span class="y" data-panel="empire">' + md.tier.icon + ' <small>' + _(md.tier.name) + (unhappy ? ' · ' + unhappy + ' 😠' : '') + '</small></span>'; })() : '<span class="y" data-panel="empire">' + (unhappy ? '😠 <b>' + unhappy + '</b><small>unhappy</small>' : '😊 <small>' + sets.length + ' settlements</small>') + '</span>');
      $('top-turn').innerHTML = '<b>' + _('Turn') + ' ' + g.turn + '</b><br>' + AU.ERAS[p.era] + ' ' + _('Era');
      this.refreshNotifs();
      this.refreshContext();
      var need = this.unitsNeedingOrders().length;
      var ud = g.undo, uu = ud && g.units[ud.unit]; $('btn-undo').hidden = !(uu && AU.U.canUndo(g, uu));
      $('btn-next').textContent = need ? _('Next Unit') + ' (' + need + ')' : _('Next Unit');
      $('btn-next').classList.toggle('attention', need > 0);
      $('btn-next').disabled = need === 0;
      var todo = this.todo(); this._todo = todo;
      var be = $('btn-end');
      if (todo.length) { be.innerHTML = todo[0].icon + ' ' + todo[0].text + (todo.length > 1 ? ' <small>+' + (todo.length - 1) + ' more</small>' : ''); be.classList.add('todo'); $('btn-pass').hidden = false; }
      else { be.textContent = 'End Turn'; be.classList.remove('todo'); $('btn-pass').hidden = true; }
    },
    // Everything that still needs a decision before the turn can end, most important first.
    todo: function () {
      var g = this.g, p = G.player(g), list = [], self = this;
      if (!g) return list;
      if (AU.Palace && p.palace && p.palace.pending > 0 && AU.Palace.available(p).length) list.push({ icon: '🏰', text: _('Improve your palace'), go: function () { self.openPanel('palace'); } });
      if (g.diploQueue && g.diploQueue.length) list.push({ icon: '👑', text: _('Audience') + ': ' + G.civData(g.civs[g.diploQueue[0].civ]).name, go: function () { self.showDiploQueue(); } });
      g.civs.forEach(function (o) { if (o.peaceOffer && g.turn - o.peaceOffer < 5 && G.atWar(g, p.idx, o.idx)) list.push({ icon: '🕊️', text: G.leaderName(o) + ' offers peace', go: function () { self.openPanel('diplomacy'); } }); });
      G.civSettlements(g, p.idx).forEach(function (s) {
        if (s.isCity && !s.queue.length) list.push({ icon: '⚙️', text: _('Production') + ': ' + s.name, go: function () { self.selectSettlement(s); self.renderer.centerOn(g, s.tile); self.openPanel('city', { id: s.id }); } });
        if (s.pendingGrowth > 0 && G.claimableTiles(g, s).length) list.push({ icon: '🌱', text: _('Choose tile') + ': ' + s.name, go: function () { self.selectSettlement(s); self.renderer.centerOn(g, s.tile); self.startExpand(s); } });
      });
      if (AU.Religion) {
        if (AU.Religion.canChoosePantheon(g, p)) list.push({ icon: '🕊️', text: _('Choose a pantheon'), go: function () { self.openPanel('religion'); } });
        if (AU.Religion.canFound(g, p)) list.push({ icon: '🕊️', text: _('Found a religion'), go: function () { self.openPanel('religion'); } });
        if (AU.Religion.canEnhance(g, p)) list.push({ icon: '🕊️', text: _('Enhance your religion'), go: function () { self.openPanel('religion'); } });
      }
      if (AU.CityStates) G.civUnits(g, p.idx).forEach(function (u) { if (AU.UNITS[u.type].caravan && u.route == null && U.needsOrders(g, u)) list.push({ icon: '🐪', text: _('Send the caravan to a free city'), go: function () { self.selectUnit(u); self.renderer.centerOn(g, u.tile); } }); });
      if (g.v2 && AU.MasteryWeb) { var vst = AU.MasteryWeb.state(p); if (vst.pendingHubs.length) list.push({ icon: '🔮', text: _('An Insight awaits your decision'), go: function () { self.openPanel('hub'); } }); }
      if (!g.v2 && !p.currentTech && G.availableTechs(p).length) list.push({ icon: '🔬', text: _('Choose research'), go: function () { self.openPanel('tech'); } });
      if (!g.v2 && !p.currentCivic && G.availableCivics(p).length) list.push({ icon: '🎭', text: _('Choose civic'), go: function () { self.openPanel('civics'); } });
      var fsl = G.freeSlots(p), fsn = 0; for (var fk in fsl) fsn += fsl[fk]; if (!g.v2 && fsn > 0 && G.availablePolicies(p).length > (p.policies || []).length) list.push({ icon: '🃏', text: _('Empty policy slot'), go: function () { self.openPanel('civics', { tab: 'policies' }); } });
      var promo = G.civUnits(g, p.idx).filter(function (u) { return U.promosAvailable(u) > 0; });
      if (promo.length) list.push({ icon: '⭐', text: _('Promote') + ' ' + promo[0].name + (promo.length > 1 ? ' (+' + (promo.length - 1) + ')' : ''), go: function () { self.selectUnit(promo[0]); self.renderer.centerOn(g, promo[0].tile); } });
      var need = this.unitsNeedingOrders();
      if (need.length) list.push({ icon: '🪖', text: need.length === 1 ? need[0].name + ' needs orders' : need.length + ' units need orders', go: function () { self.nextUnit(); } });
      return list;
    },
    doTodo: function (i) { var it = (this._todo || [])[i]; if (it) { it.go(); this.refreshHud(); this.invalidate(); } },
    refreshNotifs: function () {
      var g = this.g, box = $('notifs'); box.innerHTML = '';
      var ICON = { camp: '🏕️', faith: '🕊️', growth: '🌱', war: '⚔️', attack: '🔥', loss: '💀', capture: '🏴', tech: '🔬', civic: '🎭', build: '🏛️', idle: '⚙️', wonder: '✨', disband: '💸', diplomacy: '🤝', peace: '🕊️', meet: '👋', promote: '⭐', palace: '🏰', great: '🌟' };
      var list = g.notifications.slice(-14).reverse(), self = this, fresh = g.notifications.filter(function (n) { return n.big && !n.seen; });
      fresh.forEach(function (n) { n.seen = 1; }); if (fresh.length) this.toast(fresh.map(function (n) { return n.text; }).join('  ·  '), 3200 + 800 * fresh.length);
      list.forEach(function (n) {
        var d = document.createElement('div'); d.className = 'notif ' + n.kind; d.dataset.i = g.notifications.indexOf(n);
        d.innerHTML = '<span class="ni">' + (ICON[n.kind] || '📣') + '</span><span class="nt"></span><span class="nx" data-action="dismiss" data-i="' + d.dataset.i + '">×</span>';
        d.querySelector('.nt').textContent = n.text; box.appendChild(d);
      });
      if (list.length > 2) { var cl = document.createElement('div'); cl.className = 'notif clear'; cl.textContent = _('Clear all'); cl.dataset.clear = '1'; box.appendChild(cl); }
    },
    onNotif: function (i) {
      var n = this.g.notifications[i]; if (!n) return;
      this.g.notifications.splice(i, 1);
      if (n.panel) this.openPanel(n.panel, n.tab ? { tab: n.tab } : undefined);
      else if (n.settlement && this.g.settlements[n.settlement]) { this.selectSettlement(this.g.settlements[n.settlement]); this.renderer.centerOn(this.g, n.tile); if (n.kind === 'growth') this.startExpand(this.g.settlements[n.settlement]); else if (n.kind === 'idle' || n.kind === 'build') this.openPanel('city', { id: n.settlement }); }
      else if (n.unit && this.g.units[n.unit]) { this.selectUnit(this.g.units[n.unit]); this.renderer.centerOn(this.g, n.tile); }
      else if (n.tile != null) { this.renderer.centerOn(this.g, n.tile); this.sel.tile = n.tile; }
      this.refreshHud(); this.invalidate();
    },
    // Hosted version: service worker for offline play and automatic updates (only over http/https).
    setupUpdates: function () {
      if (!('serviceWorker' in navigator) || !/^https?:/.test(location.protocol)) return;
      var self = this;
      navigator.serviceWorker.register('sw.js').then(function (reg) {
        // artwork warm-up so the game also works offline later
        if (reg.active && AU.ASSET_LIST) reg.active.postMessage({ type: 'precache', urls: AU.ASSET_LIST });
        reg.addEventListener('updatefound', function () {
          var nw = reg.installing; if (!nw) return;
          nw.addEventListener('statechange', function () {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) { self.updateReady = true; self.showUpdateBar(); if (self.panel === 'menu') self.refreshPanel(); }
          });
        });
      }).catch(function () {});
      var refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', function () { if (refreshing) return; refreshing = true; if (!self.g) location.reload(); });
    },
    // A banner that stays until the player restarts: an update must never go unnoticed mid-game.
    showUpdateBar: function () {
      var bar = $('update-bar'), self = this; if (!bar) return; bar.hidden = false;
      $('update-go').onclick = function () { if (self.g) self.save(true); location.reload(); };
    },
    // Long-press tooltip: what is on this tile (terrain, feature, resource, yields, owner).
    showTileTip: function (tileIdx, x, y) {
      var g = this.g, p = G.player(g), t = g.tiles[tileIdx], tip = $('tip');
      if (!p.explored[tileIdx]) { tip.hidden = true; return; }
      var owner = t.owner >= 0 && g.settlements[t.owner] ? g.settlements[t.owner] : null;
      var yy = owner ? G.tileYields(g, t, owner) : AU.baseTileYields(t, p);
      var res = t.resource ? AU.RESOURCES[t.resource] : null, resKnown = res && G.resourceKnown(g, p, res);
      var imp = owner && t.worked && t.settlement == null ? G.improvementFor(g, t, g.civs[owner.civ]) : null;
      var html = '<b>' + AU.TERRAIN[t.terrain].name + (t.hills ? ' ' + _('Hills') : '') + (t.feature ? ' · ' + AU.FEATURES[t.feature].name : '') + (t.navigable ? ' · ' + _('Navigable River') : t.river ? ' · ' + _('River') : '') + (t.shore ? ' · ' + ({ beach: _('Beach'), cliff: _('Cliffs'), rocks: _('Rocky shore'), mangrove: _('Mangroves'), reef: _('Reef') })[t.shore] : '') + '</b>' + (function () { var mc = U.terrainCost(t); return '<div class="stat">🥾 ' + _('Move cost') + ' ' + (mc === Infinity ? 'impassable' : mc + (mc === 1 ? ' point' : ' points')) + '</div>'; })();
      if (t.natural) { var NWt = AU.NATURAL_WONDERS[t.natural]; html += '<div class="tip-nat">' + NWt.icon + ' ' + NWt.name + '</div><div class="stat">' + NWt.desc + '</div>'; }
      if (resKnown) html += '<div class="tip-res">' + res.icon + ' <b>' + res.name + '</b>' + (AU.Society && AU.Society.richOf(t) ? ' <span class="pill">' + ['🟤', '🟡', '🟢'][t.rich] + ' ' + _(AU.Society.richOf(t).name) + (res.kind === 'strategic' ? ' · ' + _('supports') + ' ' + AU.Society.supplyOf(t) : '') + '</span>' : '') + ' <small>(' + res.kind + (res.improvement ? ', ' + AU.IMPROVEMENTS[res.improvement].name : '') + ')</small></div>';
      else if (res) html += '<div class="tip-res stat">' + _('Something may be hidden here (needs') + ' ' + G.resourceRevealName(g, res) + ')</div>';
      html += '<div>' + ['food', 'production', 'gold', 'science', 'culture', 'faith'].filter(function (k) { return yy[k]; }).map(function (k) { return ({ food: '🌾', production: '⚙️', gold: '💰', science: '🔬', culture: '🎭', faith: '🕊️' })[k] + Math.round(yy[k] * 10) / 10; }).join(' ') + '</div>';
      if (owner) html += '<div class="stat">' + owner.name + (t.worked ? ' · worked' + (imp ? ' (' + AU.IMPROVEMENTS[imp].name + ')' : '') : ' · unworked') + '</div>';
      if (t.camp) html += '<div class="stat">🏕️ ' + _('Inchibil camp: move a military unit onto it to disperse it for Gold.') + '</div>';
      var us = p.visible[tileIdx] ? G.unitsAt(g, tileIdx) : []; if (us.length) html += '<div class="stat">' + us.map(function (u) { return AU.UNITS[u.type].icon + ' ' + u.name; }).join(', ') + '</div>';
      tip.innerHTML = html; tip.hidden = false;
      var rect = $('map').getBoundingClientRect(), tw = tip.offsetWidth, th = tip.offsetHeight;
      tip.style.left = Math.max(6, Math.min(rect.width - tw - 6, x - rect.left - tw / 2)) + 'px'; tip.style.top = Math.max(6, y - rect.top - th - 24) + 'px';
      clearTimeout(this._tipT); var self = this; this._tipT = setTimeout(function () { tip.hidden = true; }, 3500);
      this.sel.tile = tileIdx; this.renderer.highlights.selTile = tileIdx; this.invalidate();
    },
    showQuotes: function () {
      var g = this.g; if (!g || !g.quoteQueue || !g.quoteQueue.length) { this.showDiploQueue(); return; }
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
    // Leader screens queued by the rules (first contact, proposals, denouncements): shown after the quotes.
    showDiploQueue: function () {
      var g = this.g; if (!g || !g.diploQueue || !g.diploQueue.length || !AU.DiploUI) return;
      if (!$('quote').hidden || !$('leader').hidden || !$('confirm').hidden) return;
      var ev = g.diploQueue.shift(); if (!g.civs[ev.civ]) return this.showDiploQueue();
      AU.DiploUI.open(this, ev.civ, ev);
    },
    confirm: function (msg, onYes) {
      var box = $('confirm'); $('confirm-text').textContent = msg; box.hidden = false;
      $('confirm-yes').onclick = function () { box.hidden = true; onYes(); };
      $('confirm-no').onclick = function () { box.hidden = true; };
    },
    // A short explanation card (reuses the quote card without a quote).
    info: function (kicker, title, text) { var box = $('quote'); $('quote-kicker').textContent = kicker || ''; $('quote-title').textContent = title; $('quote-text').textContent = text; $('quote-by').textContent = ''; var art = $('quote-art'); art.hidden = true; art.removeAttribute('src'); var bx = box.querySelector('.quote-box'); bx.classList.remove('reveal', 'natural'); void bx.offsetWidth; bx.classList.add('reveal'); box.hidden = false; var self = this; $('quote-ok').onclick = function () { box.hidden = true; setTimeout(function () { self.showQuotes(); }, 120); }; },
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
      if (!u) { h.reach = null; h.attack = null; h.path = null; h.pathLabel = null; return; }
      h.reach = u.moves > 0 ? U.reachableNow(g, u) : null;
      h.path = u.path; h.pathLabel = u.path && u.path.length ? U.pathTurns(g, u, u.path) + ' turns' : null;
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
      var set = {}, blocked = G.claimBlocker(this.g, s); G.claimableTiles(this.g, s).forEach(function (i) { set[i] = true; });
      this.renderer.highlights = { reach: null, attack: null, expand: set, path: null, selTile: s.tile };
      this.toast(_('Choose a tile for') + ' ' + s.name + ' to grow into (' + s.pendingGrowth + ' left).' + (blocked ? ' ' + _('Only river tiles can be claimed for free right now.') : ''));
      this.refreshContext(); this.invalidate();
    },
    refreshContext: function () {
      var g = this.g, box = $('context'); if (!g) return;
      var p = G.player(g), html = '';
      if (this.sel.unit && g.units[this.sel.unit]) {
        var u = g.units[this.sel.unit], def = U.def(g, u), own = u.civ === p.idx;
        var t = g.tiles[u.tile];
        if (!own && AU.UNITS[u.type].decoy) { var dz = G.unitType(g, g.civs[u.civ], AU.UNITS[u.type].disguise); html += '<div class="card"><h3>' + AU.UNITS[AU.UNITS[u.type].disguise].icon + ' ' + dz.name + ' <span class="pill">' + G.civData(g.civs[u.civ]).name + '</span></h3><div class="hpbar"><i style="width:100%;background:#4caf50"></i></div><div class="meta">HP 100 · ' + _('Str') + ' ' + dz.strength + ' · 🛡️ ' + _('Warband') + ' (3/3)</div></div>'; box.innerHTML = html; return; }
        html += '<div class="card"><h3>' + AU.UNITS[u.type].icon + ' ' + u.name + (u.civ >= 0 && !own ? ' <span class="pill">' + G.civData(g.civs[u.civ]).name + '</span>' : u.civ < 0 ? ' <span class="pill war">' + _('Inchibils') + '</span>' : '') + (U.level(u) ? ' <span class="pill">Lv ' + U.level(u) + '</span>' : '') + '</h3>';
        html += '<div class="hpbar"><i style="width:' + u.hp + '%;background:' + (u.hp > 50 ? '#4caf50' : '#e05252') + '"></i></div>';
        if (own && !this.isTouch()) html += '<div class="meta stat">🖱️ ' + _('Right-click a tile to move or attack. Left-click only selects and reads.') + '</div>';
        if (own) { var ocost = G.orderCost(g, u), ordered = u.orderedTurn === g.turn, canO = G.canOrder(g, u); html += '<div class="meta' + (canO ? '' : ' stat') + '">🎖️ ' + (ordered ? _('Ordered this turn') : canO ? _('Command') + ' ' + ocost + (ocost > 1 ? ' (' + _('far from your settlements') + ')' : '') : '<b style="color:#e05252">' + _('No Command left this turn') + '</b> (' + _('needs') + ' ' + ocost + ')') + '</div>'; }
        html += '<div class="meta">HP ' + u.hp + ' · ' + (def.strength ? _('Str') + ' ' + U.strength(g, u, { attacking: false }) : _('Civilian')) + (def.ranged ? ' · ' + _('Ranged') + ' ' + U.strength(g, u, { attacking: true, ranged: true }) + ' (range ' + def.range + ')' : '') + ' · ' + _('Moves') + ' ' + u.moves + '/' + G.maxMoves(g, u.civ, u.type) + (u.fortify ? ' · ' + _('Fortified') : '') + (U.isEmbarked(g, u) ? ' · ' + _('Embarked') : '') + '</div>';
        if (u.promos && u.promos.length) html += '<div class="meta">⭐ ' + u.promos.map(function (pid) { return AU.PROMO_BY_ID[pid] ? AU.PROMO_BY_ID[pid].name : pid; }).join(', ') + '</div>';
        if (g.v2 && AU.Warbands && AU.Warbands.baited(g, u)) { var bt = AU.Warbands.baited(g, u); html += '<div class="meta stat">🎃 ' + _('Shaken by an ambush') + ': -' + bt.str + ' ' + _('Strength') + ', ' + (bt.until - g.turn) + ' ' + _('turns left') + '</div>'; }
        if (g.v2 && AU.Warbands && AU.UNITS[u.type].decoy && own) { var bl = AU.Warbands.baitLevel(g, p); html += '<div class="meta stat">🎃 ' + _('Bait level') + ' ' + bl + ': ' + _('attackers lose their turn and') + ' -' + AU.Warbands.baitPenalty(bl) + ' ' + _('Strength for') + ' ' + AU.Warbands.baitTurns(bl) + ' ' + _('turns.') + ' ' + _('Others see a full Warband.') + '</div>'; }
        if (g.v2 && AU.Warbands && G.isMilitary(u) && !AU.UNITS[u.type].decoy) { var wb = AU.Warbands.describe(g, u); if (wb) html += '<div class="meta stat">🛡️ ' + _('Warband') + ' (' + wb.fighters.length + '/' + AU.Warbands.MAX + (wb.commander ? ' + 🪶' : '') + '): ' + wb.members.map(function (m) { return AU.UNITS[m.type].icon + ' ' + m.name + (AU.UNITS[m.type].commander ? '' : ' ' + U.strength(g, m, { attacking: false })); }).join(' · ') + ' → ' + _('fights as') + ' <b>' + wb.strength + '</b>' + (own ? ' <button class="small ghost" data-action="warband">' + (this.warbandTogether !== false ? _('Moving together') : _('Moving alone')) + '</button>' : '') + '</div>'; else if (AU.UNITS[u.type].commander) html += '<div class="meta stat">' + _('Alone. Move it onto your fighters to lead them.') + '</div>'; }
        if (def.unique && def.uuDesc) html += '<div class="meta stat">' + def.uuDesc + '</div>';
        if (own && U.promosAvailable(u)) {
          html += '<div class="promo"><b>⭐ ' + _('Promotion available') + '</b> (' + _('heals 50 HP, ends the turn)') + '<div class="actions">' + U.promoChoices(g, u).map(function (pr) { return '<button class="small gold" data-action="dopromote" data-id="' + pr.id + '" title="' + AU.modsText(pr.mods) + '">' + pr.name + '<small>' + AU.modsText(pr.mods) + '</small></button>'; }).join('') + '</div></div>';
        }
        if (own) {
          html += '<div class="actions">';
          if (this.pendingAttack != null) { var pa = this.previewAttack(u, this.pendingAttack); html += '<button class="small danger" data-action="attack" data-tile="' + this.pendingAttack + '">⚔️ ' + _('Attack') + ': ' + pa + '</button>'; }
          if (AU.UNITS[u.type].religious) {
            var Rl = AU.Religion, sHere = G.settlementAt(g, u.tile);
            html += '<small class="stat">' + AU.UNITS[u.type].icon + ' ' + u.charges + ' charge' + (u.charges === 1 ? '' : 's') + (u.religion ? ' · ' + Rl.icon(g, u.religion) + ' ' + Rl.name(g, u.religion) : '') + '</small>';
            if (u.type !== 'inquisitor') html += '<button class="small primary" data-action="spread" ' + (Rl.canSpread(g, u) ? '' : 'disabled') + '>' + _('Spread religion') + (sHere ? ' in ' + sHere.name : '') + '</button>';
            else html += '<button class="small primary" data-action="inquisition" ' + (Rl.canInquisition(g, u) ? '' : 'disabled') + '>' + _('Remove heresy') + (sHere ? ' in ' + sHere.name : '') + '</button>';
            Rl.debateTargets(g, u).forEach(function (tg) { html += '<button class="small danger" data-action="debate" data-id="' + tg.id + '">' + _('Debate') + ' ' + tg.name + ' (' + Math.round(Rl.debateStrength(g, u) / (Rl.debateStrength(g, u) + Rl.debateStrength(g, tg)) * 100) + '%)</button>'; });
          }
          if (AU.UNITS[u.type].great && AU.Great) {
            var gt = AU.GREAT_TYPES[AU.Great.typeOf(u)]; html += '<div class="meta stat">' + G.abilityDesc(gt) + '</div>';
            AU.Great.options(g, u).forEach(function (o) { html += '<button class="small primary" data-action="' + o.action + '" ' + (o.ok ? '' : 'disabled') + '>' + o.label + '</button>' + (!o.ok && o.why ? '<small class="stat">' + o.why + '</small>' : ''); });
          }
          if (AU.UNITS[u.type].caravan && AU.CityStates) { var CSm = AU.CityStates, tgt = CSm.routeTarget(g, u); if (u.route != null && g.civs[u.route]) html += '<small class="stat">' + _('Route with') + ' ' + G.civData(g.civs[u.route]).name + ': +' + CSm.routeIncome(g, u) + ' 💰 and +3 ' + _('Ties per turn. Move it to end the route.') + '</small>'; else html += '<button class="small primary" data-action="caravanroute" ' + (tgt ? '' : 'disabled') + '>🐪 ' + _('Open trade route') + (tgt ? ' with ' + G.civData(tgt).name : '') + '</button>' + (!tgt ? '<small class="stat">' + _('Walk into the land of a free city you are not at war with.') + '</small>' : ''); }
          if (AU.UNITS[u.type].migrant && AU.Warbands) { var sJ = G.settlementAt(g, u.tile), canJ = AU.Warbands.canJoin(g, u); html += '<button class="small primary" data-action="join" ' + (canJ ? '' : 'disabled') + '>' + _('Join') + (sJ ? ' ' + sJ.name : '') + ' (+1 ' + _('Pop') + ')</button>' + (!canJ ? '<small class="stat">' + _('Walk it into one of your settlements.') + '</small>' : ''); }
          if (u.type === 'settler') { var can = G.canFoundAt(g, p.idx, u.tile); html += '<button class="small primary" data-action="found" ' + (can ? '' : 'disabled') + '>' + (p.capital ? _('Found Town') : _('Found Capital')) + '</button>' + (!can ? '<small class="stat">' + _('Too close to another settlement or invalid terrain.') + '</small>' : ''); }
          if (G.isMilitary(u)) html += '<button class="small" data-action="fortify">' + _('Fortify') + '</button>';
          if (AU.UNITS[u.type].cls === 'recon') html += '<button class="small" data-action="explore">' + (u.auto ? _('Stop exploring') : _('Auto-explore')) + '</button>';
          html += '<button class="small" data-action="skip">' + _('Skip') + '</button><button class="small" data-action="sleep">' + _('Sleep') + '</button>';
          if (u.path && u.path.length) { var dstS = G.settlementAt(g, u.path[u.path.length - 1]), dstT = g.tiles[u.path[u.path.length - 1]]; html += '<small class="stat">🥾 ' + _('On the way to') + ' ' + (dstS ? dstS.name : AU.TERRAIN[dstT.terrain].name + (dstT.hills ? ' ' + _('Hills') : '')) + ': ' + U.pathTurns(g, u, u.path) + ' ' + _('more turn') + (U.pathTurns(g, u, u.path) > 1 ? 's' : '') + '.</small><button class="small" data-action="cancelpath">' + _('Cancel route') + '</button>'; }
          if (U.canUndo(g, u)) html += '<button class="small" data-action="undomove">↩ ' + _('Undo move') + '</button>';
          var upc = U.upgradeCost(g, u); if (upc !== null) html += '<button class="small" data-action="upgrade" ' + (U.canUpgrade(g, u) ? '' : 'disabled') + '>' + _('Upgrade') + ' → ' + G.unitType(g, p, AU.UNITS[u.type].upgradesTo).name + ' (' + upc + '💰)</button>';
          html += '<button class="small ghost" data-action="disband">' + _('Disband') + '</button></div>';
        }
        html += '</div>';
      } else if (this.sel.settlement && g.settlements[this.sel.settlement]) {
        var s = g.settlements[this.sel.settlement], own2 = s.civ === p.idx, y = G.settlementYields(g, s);
        html += '<div class="card"><h3>' + (s.isCapital ? '★ ' : '') + s.name + ' <span class="pill">' + (s.isCity ? _('City') : _('Town')) + (s.specialization ? ' · ' + (G.specializationDef(g.civs[s.civ], s.specialization) || { name: s.specialization }).name : '') + '</span>' + (!own2 ? ' <span class="pill">' + G.civData(g.civs[s.civ]).name + '</span>' : '') + '</h3>';
        html += '<div class="meta">' + _('Pop') + ' ' + s.pop + ' · HP ' + s.hp + '/' + G.settlementMaxHp(g, s) + ' · ' + _('Def') + ' ' + G.settlementStrength(g, s) + (own2 ? ' · <span class="food">🌾' + y.food + '</span> <span class="prod">⚙️' + (s.isCity ? y.production : y.rawProduction + '→💰') + '</span> <span class="goldc">💰' + y.gold + '</span> <span class="sci">🔬' + y.science + '</span> <span class="cult">🎭' + y.culture + '</span> ' + (y.happiness < 0 ? '😠' : '😊') + y.happiness : '') + '</div>';
        if (own2) {
          html += '<div class="actions"><button class="small primary" data-action="city" data-id="' + s.id + '">' + _('Manage') + '</button>';
          if (s.pendingGrowth > 0) html += '<button class="small" data-action="expand" data-id="' + s.id + '">🌱 ' + _('Choose tile') + ' (' + s.pendingGrowth + ')</button><button class="small" data-action="autoexpand" data-id="' + s.id + '">' + _('Auto') + '</button>';
          if (this.mode === 'expand') html += '<span class="stat">' + _('Tap a green tile.') + '</span>';
          html += '</div>';
        }
        html += '</div>';
      } else if (this.sel.tile >= 0) {
        var tt = g.tiles[this.sel.tile];
        if (p.explored[this.sel.tile]) {
          var yy = AU.baseTileYields(tt, p), owner = tt.owner >= 0 && g.settlements[tt.owner] ? g.settlements[tt.owner] : null;
          var NWc = tt.natural ? AU.NATURAL_WONDERS[tt.natural] : null;
          html += '<div class="card"><h3>' + (NWc ? NWc.icon + ' ' + NWc.name + ' <span class="pill">' + _('Natural Wonder') + '</span>' : AU.TERRAIN[tt.terrain].name + (tt.hills ? ' ' + _('Hills') : '') + (tt.feature ? ', ' + AU.FEATURES[tt.feature].name : '') + (tt.river ? ' (' + _('River)') : '')) + (function () { var mc = U.terrainCost(tt); return ' <span class="pill" title="Movement points needed to enter">🥾 ' + (mc === Infinity ? 'impassable' : mc) + '</span>'; })() + '</h3>' + (NWc ? '<div class="meta">' + NWc.desc + (NWc.adjacent ? ' ' + _('Adjacent worked tiles') + ': ' + Object.keys(NWc.adjacent).map(function (k) { return ({ food: '🌾', production: '⚙️', gold: '💰', science: '🔬', culture: '🎭', faith: '🕊️', happiness: '😊' })[k] + '+' + NWc.adjacent[k]; }).join(' ') : '') + '</div>' : '') + '<div class="meta">' +
            (tt.resource && G.resourceKnown(g, p, tt.resource) ? AU.RESOURCES[tt.resource].icon + ' ' + AU.RESOURCES[tt.resource].name + ' · ' : '') +
            '🌾' + yy.food + ' ⚙️' + yy.production + ' 💰' + yy.gold + (yy.culture ? ' 🎭' + yy.culture : '') +
            (owner ? ' · ' + owner.name + (tt.worked ? ' (worked' + (G.improvementFor(g, tt, g.civs[owner.civ]) ? ', ' + AU.IMPROVEMENTS[G.improvementFor(g, tt, g.civs[owner.civ])].name : '') + ')' : ' (unworked)') : '') + (tt.camp ? ' · ' + _('Independent camp') : '') + '</div></div>';
        }
      }
      box.innerHTML = html;
    },
    previewAttack: function (u, tileIdx) {
      var g = this.g, target = U.targetAt(g, u, tileIdx); if (!target) return '';
      if (g.v2 && AU.Warbands) { var pv = AU.Warbands.preview(g, u, tileIdx); if (!pv) return ''; return (pv.attackers > 1 ? pv.attackers + '× ' : '') + pv.a + ' vs ' + pv.d + (pv.defenders > 1 ? ' (' + pv.defenders + ')' : '') + ' → ~' + pv.est + ' dmg' + (pv.back ? ', take ~' + pv.back : ''); }
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
        case 'spread': if (u && AU.Religion.spread(g, u)) { this.toast(_('Religion spread.')); if (g.units[u.id]) this.afterUnitAction(u, true); else this.deselect(); this.refreshHud(); this.invalidate(); } break;
        case 'inquisition': if (u && AU.Religion.inquisition(g, u)) { this.toast(_('Heresy removed.')); if (g.units[u.id]) this.afterUnitAction(u, true); else this.deselect(); this.refreshHud(); this.invalidate(); } break;
        case 'debate': if (u) { var tgt = g.units[+d.id]; var res = tgt && AU.Religion.debate(g, u, tgt); if (res) { this.toast(res.win ? _('Debate won!') : _('Debate lost…')); if (g.units[u.id]) this.selectUnit(u); else this.deselect(); this.refreshHud(); this.invalidate(); } } break;
        case 'dopromote': if (u && U.promote(g, u, d.id)) { this.toast(u.name + ' promoted: ' + AU.PROMO_BY_ID[d.id].name + '.'); this.afterUnitAction(u, true); } break;
        case 'todo': this.doTodo(+d.i); break;
        case 'dismiss': this.g.notifications.splice(+d.i, 1); this.refreshHud(); break;
        case 'clearnotifs': this.g.notifications.length = 0; this.refreshHud(); break;
        case 'caravanroute': if (u && AU.CityStates.openRoute(g, u)) { this.afterUnitAction(u, true); this.refreshHud(); this.invalidate(); } break;
        case 'greatuse': if (u && AU.Great.use(g, u)) { this.deselect(); this.refreshHud(); this.invalidate(); this.showQuotes(); } break;
        case 'greatfound': if (u) { this.openPanel('religion', { found: true }); } break;
        case 'found': if (u) { var st = U.foundCity(g, u); if (st) { this.selectSettlement(st); this.toast(_('Founded') + ' ' + st.name + '.'); } } break;
        case 'fortify': if (u) { U.fortify(g, u); this.afterUnitAction(u); } break;
        case 'join': if (u && AU.Warbands) { var sJ2 = AU.Warbands.join(g, u); if (sJ2) { this.toast(sJ2.name + ' ' + _('grew to') + ' ' + sJ2.pop + '.'); this.deselect(); this.refreshHud(); this.invalidate(); } } break;
        case 'warband': this.warbandTogether = this.warbandTogether === false; this.refreshContext(); break;
        case 'skip': if (u) { U.skip(g, u); this.afterUnitAction(u, true); } break;
        case 'sleep': if (u) { U.sleep(g, u); this.afterUnitAction(u, true); } break;
        case 'explore': if (u) { u.auto = !u.auto; if (u.auto) { AU.AI.explore(g, p, u); this.afterUnitAction(u, true); } else this.refreshContext(); } break;
        case 'cancelpath': if (u) { u.path = null; this.updateUnitHighlights(); this.refreshContext(); this.invalidate(); } break;
        case 'undomove': if (u && U.undoMove(g, u)) { this.toast(_('Move undone.')); this.selectUnit(u); this.renderer.centerOn(g, u.tile); this.refreshHud(); this.invalidate(); } break;
        case 'upgrade': if (u && U.upgrade(g, u)) { this.toast(_('Upgraded to') + ' ' + u.name + '.'); this.selectUnit(u); } break;
        case 'disband': if (u) { var self = this; this.confirm(_('Disband') + ' ' + u.name + '?', function () { U.disband(g, u); self.deselect(); self.refreshHud(); self.invalidate(); }); } break;
        case 'attack': if (u && d.tile != null) this.doAttack(u, +d.tile); break;
        case 'city': this.openPanel('city', { id: +d.id }); break;
        case 'expand': s = g.settlements[+d.id]; if (s) { this.closePanel(); this.renderer.centerOn(g, s.tile); this.startExpand(s); } break;
        case 'autoexpand': s = g.settlements[+d.id]; if (s) { G.autoExpand(g, s); this.deselect(); this.selectSettlement(s); this.toast(s.name + ' ' + _('expanded automatically.')); if (this.panel === 'city') this.openPanel('city', { id: s.id }); } break;
        case 'center': this.closePanel(); if (d.tile != null) { this.renderer.centerOn(g, +d.tile); s = G.settlementAt(g, +d.tile); if (s) this.selectSettlement(s); } break;
        default: AU.Panels.action(this, name, d);
      }
      this.refreshHud(); this.invalidate();
    },
    afterUnitAction: function (u, advance) {
      if (advance) { var list = this.unitsNeedingOrders(); if (list.length) { this.selectUnit(list[0]); this.renderer.centerOn(this.g, list[0].tile); } else this.deselect(); }
      else this.selectUnit(u);
      this.refreshHud();
      if (this.g && ((this.g.quoteQueue && this.g.quoteQueue.length) || (this.g.diploQueue && this.g.diploQueue.length)) && $('quote').hidden) { var self3 = this; setTimeout(function () { self3.showQuotes(); }, 150); }
    },
    doAttack: function (u, tileIdx) {
      var g = this.g, res = U.attack(g, u, tileIdx);
      this.pendingAttack = null;
      if (!res) { this.toast(_('Cannot attack that target.')); return; }
      var msg = [];
      if (res.captured) msg.push(_('Captured') + ' ' + g.settlements[res.settlement].name + '!');
      else if (res.settlementDamage != null) msg.push(_('Hit') + ' ' + g.settlements[res.settlement].name + ' for ' + res.settlementDamage);
      if (res.defenderDamage != null) msg.push((res.killed ? _('Destroyed the enemy') + (res.killedCount > 1 ? ' ×' + res.killedCount : '') : _('Dealt') + ' ' + res.defenderDamage) + (res.capturedUnit ? ' (captured!)' : ''));
      if (res.attackersLost > 1 || (res.attackersLost && !res.attackerKilled)) msg.push(res.attackersLost + ' ' + _('of yours fell'));
      if (res.attackerDamage) msg.push('took ' + res.attackerDamage);
      if (res.attackerKilled) msg.push('your unit was lost');
      this.toast(msg.join(', ') + '.');
      if (g.units[u.id]) this.selectUnit(u); else this.deselect();
      this.refreshHud(); this.invalidate();
    },
    isTouch: function () { return !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches); },
    // inspectOnly: a mouse's left button selects and reads, it never moves a unit (that is the right button's job)
    onTap: function (tileIdx, inspectOnly) {
      var g = this.g, p = G.player(g);
      if (tileIdx < 0) { this.deselect(); return; }
      var u = this.sel.unit ? g.units[this.sel.unit] : null;
      if (inspectOnly && u && u.civ === p.idx && tileIdx !== u.tile && this.mode !== 'expand') { this.pendingAttack = null; this.cycleAtTile(tileIdx); return; }
      var h = this.renderer.highlights;
      if (this.mode === 'expand' && this.sel.settlement) {
        var s = g.settlements[this.sel.settlement];
        if (h.expand && h.expand[tileIdx]) { G.expandTo(g, s, tileIdx); if (s.pendingGrowth > 0 && G.claimableTiles(g, s).length) this.startExpand(s); else { this.mode = 'normal'; this.selectSettlement(s); this.toast(s.name + ' ' + _('claimed a new tile.')); } this.refreshHud(); return; }
        this.mode = 'normal';
      }
      if (u && u.civ === p.idx) {
        if (tileIdx === u.tile) { this.cycleAtTile(tileIdx); return; }
        if (h.attack && h.attack[tileIdx]) {
          if (this.pendingAttack === tileIdx) { this.doAttack(u, tileIdx); return; }
          this.pendingAttack = tileIdx; this.refreshContext(); this.toast(_('Attack') + ': ' + this.previewAttack(u, tileIdx) + '. ' + _('Tap again to confirm.')); return;
        }
        this.pendingAttack = null;
        if (!p.explored[tileIdx]) { this.toast(_('Unexplored territory.')); return; }
        // move (this turn or multi-turn)
        var ownUnitsThere = G.unitsAt(g, tileIdx).filter(function (o) { return o.civ === p.idx && G.isMilitary(o) === G.isMilitary(u); });
        if (ownUnitsThere.length) { this.selectUnit(ownUnitsThere[0]); return; }
        var sHere = G.settlementAt(g, tileIdx);
        if (sHere && sHere.civ === p.idx && !(h.reach && h.reach[tileIdx])) { var path0 = U.findPath(g, u, tileIdx); if (!path0) { this.selectSettlement(sHere); return; } }
        var estPath = U.findPath(g, u, tileIdx), estTurns = estPath ? U.pathTurns(g, u, estPath) : 0, origin = u.tile;
        if (U.orderMove(g, u, tileIdx)) { if (g.v2 && AU.Warbands && this.warbandTogether !== false && G.isMilitary(u)) { var nT = AU.Warbands.moveTogether(g, u, origin, tileIdx); if (nT) this.toast(_('The Warband moves together') + ' (' + (nT + 1) + ').', 1500); } if (estTurns > 1) this.toast(u.name + ' is on the way: arrives in ' + estTurns + ' ' + _('turns. It keeps walking by itself each turn.'), 3000); if (u.moves > 0 && !(u.path && u.path.length)) this.selectUnit(u); else this.afterUnitAction(u, true); this.refreshHud(); return; }
        this.toast(_('No route there.'));
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
      this.busy = true; $('btn-end').disabled = true; $('btn-end').textContent = _('Processing…');
      setTimeout(function () {
        try {
          G.civUnits(g, p.idx).forEach(function (u) { if (u.auto && u.moves > 0) AU.AI.explore(g, p, u); });
          G.endTurn(g);
          G.civUnits(g, p.idx).forEach(function (u) { if (u.auto && u.moves > 0) AU.AI.explore(g, p, u); });
        } catch (e) { console.error(e); self.toast(_('Error during turn') + ': ' + e.message, 4000); }
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
      if (this.g && this.g.v2 && (name === 'tree' || name === 'tech')) { name = 'web'; data = data && data.tab ? data : { tab: 'foundation' }; }
      this.panel = name; this.panelData = data || {}; var tipEl = $('tip'); if (tipEl) tipEl.hidden = true;
      $('panel').hidden = false; $('toast').hidden = true;
      AU.Panels.render(this, name, this.panelData);
      $('panel-body').scrollTop = 0;
    },
    closePanel: function () { if (AU.CityView) AU.CityView.close(); this.panel = null; $('panel').hidden = true; if (this.g) { this.refreshHud(); this.invalidate(); } else this.showTitle(); },
    refreshPanel: function () { if (this.panel) AU.Panels.render(this, this.panel, this.panelData); },

    // ---------- Input ----------
    bindInput: function () {
      var cv = $('map'), r = this.renderer, self = this;
      var pointers = {}, dragging = false, moved = false, lastDist = 0, startX = 0, startY = 0, lastX = 0, lastY = 0, dragUnit = null, dragTarget = -1, pressTimer = null, longPressed = false, mouseBtn = -1;
      cv.addEventListener('contextmenu', function (e) { e.preventDefault(); }); // the right button gives orders
      cv.addEventListener('pointerdown', function (e) {
        cv.setPointerCapture(e.pointerId);
        pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
        var keys = Object.keys(pointers);
        mouseBtn = e.pointerType === 'mouse' ? e.button : -1;
        if (keys.length === 1 && mouseBtn === 2) { // right button: order the selected unit (hold to see the route, release on the target)
          dragging = true; moved = false; startX = lastX = e.clientX; startY = lastY = e.clientY; longPressed = false; dragUnit = null;
          if (self.g) { var cur2 = self.sel.unit && self.g.units[self.sel.unit]; if (cur2 && cur2.civ === G.player(self.g).idx) dragUnit = cur2; }
          return;
        }
        if (keys.length === 1) {
          dragging = true; moved = false; startX = lastX = e.clientX; startY = lastY = e.clientY; dragUnit = null; longPressed = false;
          clearTimeout(pressTimer); pressTimer = setTimeout(function () { if (!moved && Object.keys(pointers).length === 1 && self.g) { var rc = cv.getBoundingClientRect(); var ti = r.tileAtScreen(self.g, e.clientX - rc.left, e.clientY - rc.top); if (ti >= 0) { longPressed = true; dragUnit = null; self.showTileTip(ti, e.clientX, e.clientY); } } }, 420);
          if (self.g && self.mode !== 'expand' && mouseBtn !== 0) { var rect0 = cv.getBoundingClientRect(); var idx0 = r.tileAtScreen(self.g, e.clientX - rect0.left, e.clientY - rect0.top); var pl = G.player(self.g); if (idx0 >= 0) { var own = G.unitsAt(self.g, idx0).filter(function (o) { return o.civ === pl.idx && o.moves > 0; }); var cur = self.sel.unit && self.g.units[self.sel.unit]; if (cur && cur.tile === idx0 && cur.moves > 0) dragUnit = cur; else if (own.length) dragUnit = own[0]; } } // touch: dragging a unit moves it; a mouse's left button only pans
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
          if (Math.hypot(e.clientX - startX, e.clientY - startY) > 6) { moved = true; clearTimeout(pressTimer); }
          if (moved && dragUnit && self.g.units[dragUnit.id]) {
            if (self.sel.unit !== dragUnit.id) self.selectUnit(dragUnit);
            var rect1 = cv.getBoundingClientRect(); var idx1 = r.tileAtScreen(self.g, e.clientX - rect1.left, e.clientY - rect1.top);
            if (idx1 !== dragTarget) { dragTarget = idx1; var path = idx1 >= 0 && idx1 !== dragUnit.tile && G.player(self.g).explored[idx1] ? U.findPath(self.g, dragUnit, idx1) : null; r.highlights.pathLabel = path && path.length ? U.pathTurns(self.g, dragUnit, path) + (U.pathTurns(self.g, dragUnit, path) > 1 ? ' turns' : ' turn') : null; r.highlights.path = path || null; r.highlights.dragTile = idx1; self.invalidate(); }
          } else if (moved) { r.cam.x -= dx / r.cam.zoom; r.cam.y -= dy / r.cam.zoom; r.clampCamera(self.g); self.invalidate(); }
        }
      });
      function up(e) {
        var was = pointers[e.pointerId]; delete pointers[e.pointerId]; clearTimeout(pressTimer);
        if (!was) return;
        if (longPressed) { longPressed = false; dragging = false; dragUnit = null; return; }
        if (Object.keys(pointers).length === 0) {
          if (mouseBtn === 2 && dragging && self.g) { // right button released: move or attack with the selected unit
            r.highlights.dragTile = -1; var rectR = cv.getBoundingClientRect(); var idxR = r.tileAtScreen(self.g, e.clientX - rectR.left, e.clientY - rectR.top);
            var uR = self.sel.unit && self.g.units[self.sel.unit];
            if (uR && uR.civ === G.player(self.g).idx && idxR >= 0 && idxR !== uR.tile) self.onTap(idxR, false); else if (!uR) self.toast(_('Select a unit first, then right-click where it should go.'));
            self.refreshHud(); self.invalidate();
          }
          else if (dragging && !moved && self.g) { var rect = cv.getBoundingClientRect(); var idx = r.tileAtScreen(self.g, e.clientX - rect.left, e.clientY - rect.top); self.onTap(idx, mouseBtn === 0); self.refreshHud(); self.invalidate(); }
          else if (dragging && moved && dragUnit && self.g && self.g.units[dragUnit.id]) { r.highlights.dragTile = -1; if (dragTarget >= 0 && dragTarget !== dragUnit.tile) { self.sel.unit = dragUnit.id; self.onTap(dragTarget); } else self.selectUnit(dragUnit); self.refreshHud(); self.invalidate(); }
          dragging = false; lastDist = 0; dragUnit = null; dragTarget = -1; mouseBtn = -1;
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
