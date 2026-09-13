// Full-screen panels: city management, research, civics & government, diplomacy, empire, menu, help, victory.
(function (AU) {
  var G = AU.G, U = AU.U;
  var P = AU.Panels = {};
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function yieldsHtml(y, opts) {
    var parts = [];
    var map = { food: ['🌾', 'food'], production: ['⚙️', 'prod'], gold: ['💰', 'goldc'], science: ['🔬', 'sci'], culture: ['🎭', 'cult'], happiness: ['😊', ''] };
    AU.YIELD_KEYS.forEach(function (k) { if (y[k] && (!opts || !opts.skip || opts.skip.indexOf(k) < 0)) parts.push('<span class="' + map[k][1] + '">' + map[k][0] + (y[k] > 0 && opts && opts.plus ? '+' : '') + (Math.round(y[k] * 10) / 10) + '</span>'); });
    return parts.join(' ');
  }
  function turns(cost, prog, rate) { return rate > 0 ? Math.max(1, Math.ceil((cost - prog) / rate)) + 't' : '∞'; }
  function unlocksOfTech(id) {
    var out = [];
    for (var u in AU.UNITS) if (AU.UNITS[u].tech === id) out.push(AU.UNITS[u].name);
    for (var b in AU.BUILDINGS) if (AU.BUILDINGS[b].tech === id) out.push(AU.BUILDINGS[b].name);
    for (var w in AU.WONDERS) if (AU.WONDERS[w].tech === id) out.push(AU.WONDERS[w].name + ' (wonder)');
    for (var p in AU.PROJECTS) if (AU.PROJECTS[p].tech === id) out.push(AU.PROJECTS[p].name);
    for (var r in AU.RESOURCES) if (AU.RESOURCES[r].revealTech === id) out.push('reveals ' + AU.RESOURCES[r].name);
    var t = AU.TECH_BY_ID[id]; if (t.embark) out.push('units can embark on Coast'); if (t.ocean) out.push('Ocean travel');
    return out;
  }
  function civicFxText(c) {
    var out = [];
    if (c.unlocks) out.push('Government: ' + c.unlocks);
    var fx = c.fx || {};
    if (fx.yieldMult) for (var k in fx.yieldMult) out.push('+' + Math.round((fx.yieldMult[k] - 1) * 100) + '% ' + k);
    if (fx.goldPerSettlement) out.push('+' + fx.goldPerSettlement + ' Gold per settlement');
    if (fx.culturePerSettlement) out.push('+' + fx.culturePerSettlement + ' Culture per settlement');
    if (fx.happinessBonus) out.push('+' + fx.happinessBonus + ' Happiness per settlement');
    if (fx.unitCostMult) out.push('units ' + Math.round((1 - fx.unitCostMult) * 100) + '% cheaper');
    if (fx.buildingCostMult) out.push('buildings ' + Math.round((1 - fx.buildingCostMult) * 100) + '% cheaper');
    if (fx.settlerCostMult) out.push('settlers ' + Math.round((1 - fx.settlerCostMult) * 100) + '% cheaper');
    if (fx.growthMult) out.push('+' + Math.round((fx.growthMult - 1) * 100) + '% growth');
    if (fx.townGoldMult) out.push('towns convert production to gold at ' + Math.round(fx.townGoldMult * 100) + '%');
    if (fx.purchaseMult) out.push('purchases ' + Math.round((1 - fx.purchaseMult) * 100) + '% cheaper');
    if (fx.cityDefense) out.push('+' + fx.cityDefense + ' settlement defense');
    if (fx.tileBonus) out.push('farms +1 Food');
    if (fx.navalMoves) out.push('naval units +1 movement');
    if (fx.landBonus) out.push('land units +' + fx.landBonus + ' strength');
    if (fx.culturePerWonder) out.push('+' + fx.culturePerWonder + ' Culture per wonder');
    if (fx.cityUpgradeCostMult) out.push('town upgrades ' + Math.round((1 - fx.cityUpgradeCostMult) * 100) + '% cheaper');
    if (fx.projectCostMult) out.push('space projects ' + Math.round((1 - fx.projectCostMult) * 100) + '% cheaper');
    if (fx.warWeariness) out.push('less war weariness');
    return out.join(', ');
  }

  P.render = function (app, name, data) {
    var g = app.g, body = $('panel-body'), title = $('panel-title');
    var fn = P['render_' + name];
    if (!fn) { title.textContent = name; body.innerHTML = ''; return; }
    var r = fn(app, g, data);
    title.textContent = r.title; body.innerHTML = r.html;
  };

  // ---------- City / Town ----------
  P.render_city = function (app, g, data) {
    var s = g.settlements[data.id]; if (!s) return { title: 'Settlement', html: '<p>This settlement no longer exists.</p>' };
    var civ = g.civs[s.civ], p = G.player(g), y = G.settlementYields(g, s), fx = G.civFx(g, civ);
    var html = '';
    var growthCost = G.growthCost(s.pop), surplus = y.food - s.pop * 2;
    html += '<div class="section"><div class="yields">' + yieldsHtml(y, { skip: ['happiness'] }) + '<span>' + (y.happiness < 0 ? '😠 ' : '😊 ') + y.happiness + '</span></div>';
    html += '<p class="stat">Population ' + s.pop + (s.specialists ? ' (' + s.specialists + ' specialists)' : '') + ' · Food ' + Math.floor(s.food) + '/' + growthCost + ' (' + (s.specialization && !s.isCity ? 'sends surplus to ' + (G.nearestCity(g, s) ? G.nearestCity(g, s).name : 'no city') : surplus > 0 ? 'grows in ' + turns(growthCost, s.food, surplus * (fx.growthMult || 1)) : surplus < 0 ? 'starving!' : 'stagnant') + ')' +
      ' · Defense ' + G.settlementStrength(g, s) + ' · HP ' + s.hp + '/' + G.settlementMaxHp(g, s) + (y.happiness < 0 ? ' · <b style="color:#e05252">Unhappy: yields reduced</b>' : '') + '</p>';
    html += '<div class="progress"><i style="width:' + Math.min(100, s.food / growthCost * 100) + '%;background:var(--food)"></i></div></div>';
    if (s.pendingGrowth > 0) html += '<div class="row" style="border-color:var(--food)"><div class="grow"><b>🌱 ' + s.name + ' can expand (' + s.pendingGrowth + ')</b><small>Each new citizen claims and works one more tile.</small></div><button class="small primary" data-action="expand" data-id="' + s.id + '">Choose tile</button><button class="small" data-action="autoexpand" data-id="' + s.id + '">Auto</button></div>';

    if (!s.isCity) {
      var upCost = G.cityUpgradeCost(g, civ);
      html += '<div class="section"><h3>Town</h3><div class="row"><div class="grow"><b>Upgrade to City</b><small>Cities get a production queue, can build wonders and keep their production. Towns turn production into gold and buy what they need.</small></div><button class="small primary" data-action="upgradecity" data-id="' + s.id + '" ' + (civ.gold >= upCost ? '' : 'disabled') + '>' + upCost + ' 💰</button></div>';
      html += '<h3>Specialization' + (s.specialization ? ': ' + AU.SPECIALIZATIONS[s.specialization].name : '') + '</h3>';
      for (var sp in AU.SPECIALIZATIONS) {
        var sd = AU.SPECIALIZATIONS[sp], can = G.canSpecialize(g, s, sp);
        html += '<div class="row ' + (s.specialization === sp ? 'active' : can ? '' : 'locked') + '"><div class="grow"><b>' + sd.icon + ' ' + sd.name + '</b><small>' + sd.desc + ' Requires pop ' + sd.minPop + '. A specialized town stops growing.</small></div>' + (s.specialization === sp ? '<span class="pill">current</span>' : '<button class="small" data-action="specialize" data-id="' + s.id + '" data-spec="' + sp + '" ' + (can && (!s.specialization || civ.gold >= 60) ? '' : 'disabled') + '>' + (s.specialization ? '60 💰' : 'Choose') + '</button>') + '</div>';
      }
      html += '</div>';
    } else {
      // production queue
      html += '<div class="section"><h3>Production (' + y.production + ' ⚙️ per turn)</h3>';
      if (!s.queue.length) html += '<p class="stat">Nothing queued. Unused production is converted to gold at 50%.</p>';
      s.queue.forEach(function (q, i) {
        var cost = G.itemCost(g, civ, q.kind, q.id, s), prog = s.progress[q.kind + ':' + q.id] || 0, nm = P.itemName(g, civ, q);
        html += '<div class="row ' + (i === 0 ? 'active' : '') + '"><div class="grow"><b>' + (i + 1) + '. ' + nm + '</b><small>' + Math.floor(prog) + '/' + cost + ' ⚙️ · ' + (i === 0 ? turns(cost, prog, y.production * (q.kind === 'unit' ? 1 + y.unitProductionPct / 100 : 1)) : '') + '</small><div class="progress"><i style="width:' + Math.min(100, prog / cost * 100) + '%"></i></div></div>' +
          (q.kind !== 'wonder' && q.kind !== 'project' ? '<button class="small" data-action="buy" data-id="' + s.id + '" data-kind="' + q.kind + '" data-item="' + q.id + '" ' + (civ.gold >= G.purchaseCost(g, civ, q.kind, q.id, s) ? '' : 'disabled') + '>' + G.purchaseCost(g, civ, q.kind, q.id, s) + ' 💰</button>' : '') +
          '<button class="small ghost" data-action="dequeue" data-id="' + s.id + '" data-index="' + i + '">✕</button></div>';
      });
      html += '</div>';
    }
    // build / buy options
    var opts = G.buildOptions(g, s), tab = data.tab || 'units';
    html += '<div class="section"><h3>' + (s.isCity ? 'Build or buy' : 'Purchase with gold') + '</h3><div class="tabs">';
    [['units', 'Units'], ['buildings', 'Buildings'], ['wonders', 'Wonders'], ['projects', 'Projects']].forEach(function (t) { if (!s.isCity && (t[0] === 'wonders' || t[0] === 'projects')) return; html += '<button class="small ' + (tab === t[0] ? 'on' : '') + '" data-action="citytab" data-id="' + s.id + '" data-tab="' + t[0] + '">' + t[1] + ' (' + opts[t[0]].length + ')</button>'; });
    html += '</div>';
    var kind = { units: 'unit', buildings: 'building', wonders: 'wonder', projects: 'project' }[tab];
    if (!opts[tab].length) html += '<p class="stat">Nothing available yet. Research new technologies.</p>';
    opts[tab].forEach(function (id) {
      var cost = G.itemCost(g, civ, kind, id, s), buyCost = G.purchaseCost(g, civ, kind, id, s), name, desc;
      if (kind === 'unit') { var d = G.unitType(g, civ, id); name = AU.UNITS[id].icon + ' ' + d.name + (d.unique ? ' ★' : ''); desc = (d.cls === 'civilian' ? 'Founds a new Town.' : 'Str ' + d.strength + (d.ranged ? ' · Ranged ' + d.ranged + ' (range ' + d.range + ')' : '') + ' · Moves ' + G.maxMoves(g, civ.idx, id)) + (d.resource ? ' · needs ' + AU.RESOURCES[d.resource].name : ''); }
      else if (kind === 'building') { var b = G.buildingDef(g, civ, id); name = b.name + (b.unique ? ' ★' : ''); desc = yieldsHtml(b.yields, { plus: true }) + (b.desc ? ' · ' + b.desc : '') + (b.perPop ? ' · +' + b.perPop.science + ' 🔬 per pop' : '') + (b.pct ? ' · +' + (b.pct.production || b.pct.science || b.pct.unitProduction) + '% ' + Object.keys(b.pct)[0] : ''); }
      else if (kind === 'wonder') { var w = AU.WONDERS[id]; name = '🏛️ ' + w.name; desc = yieldsHtml(w.yields, { plus: true }) + ' · ' + w.desc; }
      else { var pr = AU.PROJECTS[id]; name = '🚀 ' + pr.name; desc = pr.desc; }
      var inQ = G.inQueue(s, kind, id);
      html += '<div class="row"><div class="grow"><b>' + name + '</b><small>' + desc + '</small><small>' + cost + ' ⚙️' + (s.isCity ? ' (' + turns(cost, s.progress[kind + ':' + id] || 0, y.production) + ')' : '') + '</small></div>' +
        (s.isCity ? '<button class="small primary" data-action="enqueue" data-id="' + s.id + '" data-kind="' + kind + '" data-item="' + id + '" ' + (inQ && kind !== 'unit' ? 'disabled' : '') + '>' + (inQ && kind !== 'unit' ? 'Queued' : 'Build') + '</button>' : '') +
        (kind !== 'wonder' && kind !== 'project' ? '<button class="small" data-action="buy" data-id="' + s.id + '" data-kind="' + kind + '" data-item="' + id + '" ' + (civ.gold >= buyCost ? '' : 'disabled') + '>' + buyCost + ' 💰</button>' : '') + '</div>';
    });
    html += '</div>';
    // buildings owned
    html += '<div class="section"><h3>Buildings (' + s.buildings.length + ')</h3><div class="yields">' + (s.buildings.map(function (b) { var d = G.buildingDef(g, civ, b); return '<span>' + (AU.WONDERS[b] ? '🏛️ ' : '') + d.name + '</span>'; }).join(' ') || '<span class="stat">none</span>') + '</div></div>';
    // tiles
    var worked = s.tiles.filter(function (i) { return g.tiles[i].worked && i !== s.tile; }).length;
    html += '<div class="section"><h3>Territory</h3><p class="stat">' + s.tiles.length + ' tiles owned, ' + worked + ' worked by citizens. Founded turn ' + s.founded + '.</p>';
    html += '<button class="small" data-action="center" data-tile="' + s.tile + '">Show on map</button></div>';
    return { title: (s.isCapital ? '★ ' : '') + s.name + ' — ' + (s.isCity ? 'City' : 'Town'), html: html };
  };
  P.itemName = function (g, civ, q) {
    if (q.kind === 'unit') return G.unitType(g, civ, q.id).name;
    if (q.kind === 'building') return G.buildingDef(g, civ, q.id).name;
    if (q.kind === 'wonder') return AU.WONDERS[q.id].name;
    return AU.PROJECTS[q.id].name;
  };

  // ---------- Research ----------
  P.render_tech = function (app, g) {
    var p = G.player(g), y = G.civYields(g, p), html = '';
    var avail = G.availableTechs(p);
    html += '<p class="stat">' + y.science.toFixed(1) + ' 🔬 per turn · ' + Object.keys(p.techs).length + '/' + AU.TECHS.length + ' technologies. One continuous tree: nothing resets between eras.</p>';
    html += '<div class="section"><h3>Available</h3>';
    avail.forEach(function (t) {
      var cost = G.techCost(g, p, t), prog = p.techProgress[t.id] || 0, cur = p.currentTech === t.id;
      html += '<div class="row clickable ' + (cur ? 'active' : '') + '" data-action="research" data-id="' + t.id + '"><div class="grow"><b>' + t.name + ' <span class="pill">' + AU.ERAS[t.era] + '</span></b><small>' + (unlocksOfTech(t.id).join(', ') || 'Leads to further technologies') + '</small><small>' + Math.floor(prog) + '/' + cost + ' · ' + turns(cost, prog, y.science) + '</small>' + (cur ? '<div class="progress"><i style="width:' + (prog / cost * 100) + '%"></i></div>' : '') + '</div>' + (cur ? '<span class="pill">researching</span>' : '') + '</div>';
    });
    html += '</div>';
    AU.ERAS.forEach(function (era, ei) {
      var list = AU.TECHS.filter(function (t) { return t.era === ei && avail.indexOf(t) < 0; });
      if (!list.length) return;
      html += '<div class="section"><h3>' + era + ' Era</h3>';
      list.forEach(function (t) {
        var done = !!p.techs[t.id];
        html += '<div class="row ' + (done ? 'done' : 'locked') + '"><div class="grow"><b>' + t.name + '</b><small>' + (unlocksOfTech(t.id).join(', ') || '—') + '</small>' + (!done && t.pre.length ? '<small>Requires: ' + t.pre.map(function (x) { return AU.TECH_BY_ID[x].name; }).join(', ') + '</small>' : '') + '</div>' + (done ? '<span class="pill">✓</span>' : '<span class="pill">' + t.cost + '</span>') + '</div>';
      });
      html += '</div>';
    });
    return { title: 'Research', html: html };
  };
  P.render_civics = function (app, g) {
    var p = G.player(g), y = G.civYields(g, p), html = '';
    var avail = G.availableCivics(p);
    html += '<div class="section"><h3>Government: ' + AU.GOVERNMENTS[p.government].name + '</h3>';
    var govs = G.availableGovernments(p);
    for (var id in AU.GOVERNMENTS) {
      var gv = AU.GOVERNMENTS[id], ok = govs.indexOf(id) >= 0, cur = p.government === id;
      html += '<div class="row ' + (cur ? 'active' : ok ? '' : 'locked') + '"><div class="grow"><b>' + gv.name + '</b><small>' + gv.desc + '</small>' + (!ok ? '<small>Requires civic: ' + AU.CIVIC_BY_ID[gv.civic].name + '</small>' : '') + '</div>' + (cur ? '<span class="pill">current</span>' : ok ? '<button class="small" data-action="government" data-id="' + id + '">Adopt</button>' : '') + '</div>';
    }
    html += '</div>';
    html += '<p class="stat">' + y.culture.toFixed(1) + ' 🎭 per turn · ' + Object.keys(p.civics).length + '/' + AU.CIVICS.length + ' civics.</p>';
    html += '<div class="section"><h3>Available civics</h3>';
    avail.forEach(function (c) {
      var cost = G.civicCost(g, p, c), prog = p.civicProgress[c.id] || 0, cur = p.currentCivic === c.id;
      html += '<div class="row clickable ' + (cur ? 'active' : '') + '" data-action="civic" data-id="' + c.id + '"><div class="grow"><b>' + c.name + ' <span class="pill">' + AU.ERAS[c.era] + '</span></b><small>' + (civicFxText(c) || 'Leads to further civics') + '</small><small>' + Math.floor(prog) + '/' + cost + ' · ' + turns(cost, prog, y.culture) + '</small>' + (cur ? '<div class="progress"><i style="width:' + (prog / cost * 100) + '%;background:var(--cult)"></i></div>' : '') + '</div>' + (cur ? '<span class="pill">adopting</span>' : '') + '</div>';
    });
    html += '</div>';
    AU.ERAS.forEach(function (era, ei) {
      var list = AU.CIVICS.filter(function (t) { return t.era === ei && avail.indexOf(t) < 0; });
      if (!list.length) return;
      html += '<div class="section"><h3>' + era + ' Era</h3>';
      list.forEach(function (c) { var done = !!p.civics[c.id]; html += '<div class="row ' + (done ? 'done' : 'locked') + '"><div class="grow"><b>' + c.name + '</b><small>' + (civicFxText(c) || '—') + '</small>' + (!done && c.pre.length ? '<small>Requires: ' + c.pre.map(function (x) { return AU.CIVIC_BY_ID[x].name; }).join(', ') + '</small>' : '') + '</div>' + (done ? '<span class="pill">✓</span>' : '<span class="pill">' + c.cost + '</span>') + '</div>'; });
      html += '</div>';
    });
    return { title: 'Civics & Government', html: html };
  };

  // ---------- Diplomacy ----------
  P.render_diplomacy = function (app, g) {
    var p = G.player(g), html = '';
    var others = g.civs.filter(function (c) { return c.idx !== p.idx; });
    if (!others.some(function (c) { return p.met[c.idx]; })) html += '<p class="stat">You have not met any other civilization yet. Explore!</p>';
    others.forEach(function (c) {
      var d = G.civData(c), rel = p.rel[c.idx], met = p.met[c.idx];
      var att = c.alive ? c.rel[p.idx].attitude : 0;
      var mood = att > 15 ? 'Friendly' : att > -10 ? 'Neutral' : att > -30 ? 'Unfriendly' : 'Hostile';
      html += '<div class="row"><div class="swatch" style="width:14px;height:40px;border-radius:4px;background:' + G.civColor(c) + ';border-right:4px solid ' + d.color2 + '"></div><div class="grow"><b>' + d.leader + ' <span class="pill">' + d.name + '</span>' + (!c.alive ? ' <span class="pill">destroyed</span>' : '') + '</b>' +
        (met && c.alive ? '<small>' + (rel.war ? '<span class="pill war">At war</span> since turn ' + rel.warSince : '<span class="pill peace">Peace</span> · ' + mood) + ' · ' + G.civSettlements(g, c.idx).length + ' settlements · military ' + Math.round(G.militaryStrength(g, c.idx)) + ' · score ' + G.score(g, c) + '</small><small>' + d.ability.name + ': ' + d.ability.desc + '</small>' : '<small>' + (c.alive ? 'Not met yet' : '') + '</small>') + '</div>';
      if (met && c.alive) {
        if (rel.war) html += '<button class="small" data-action="peace" data-id="' + c.idx + '">' + (c.peaceOffer && g.turn - c.peaceOffer < 5 ? 'Accept peace' : 'Propose peace') + '</button>';
        else html += '<button class="small danger" data-action="war" data-id="' + c.idx + '" ' + (rel.peaceUntil > g.turn ? 'disabled title="Peace treaty until turn ' + rel.peaceUntil + '"' : '') + '>Declare war</button>';
      }
      html += '</div>';
    });
    return { title: 'Diplomacy', html: html };
  };

  // ---------- Empire ----------
  P.render_empire = function (app, g) {
    var p = G.player(g), d = G.civData(p), y = G.civYields(g, p), html = '';
    html += '<div class="section"><h3>' + G.leaderName(p) + ' of ' + d.name + '</h3><div class="yields">' + yieldsHtml(y, { skip: ['food', 'happiness'], plus: true }) + '<span>💰 ' + Math.floor(p.gold) + ' treasury</span><span>unit upkeep ' + y.upkeep + '</span></div><p class="stat">' + d.ability.name + ': ' + d.ability.desc + '</p></div>';
    var lux = G.luxuryCount(g, p);
    html += '<div class="section"><h3>Resources</h3><div class="yields">' + (lux.luxuries.map(function (r) { return '<span>' + AU.RESOURCES[r].icon + ' ' + AU.RESOURCES[r].name + '</span>'; }).join('') || '<span class="stat">no luxuries yet (work tiles with luxury resources for happiness)</span>') +
      Object.keys(lux.strategic).map(function (r) { return '<span>' + AU.RESOURCES[r].icon + ' ' + AU.RESOURCES[r].name + ' ×' + lux.strategic[r] + '</span>'; }).join('') + '</div></div>';
    html += '<div class="section"><h3>Settlements</h3>';
    G.civSettlements(g, p.idx).forEach(function (s) {
      var sy = G.settlementYields(g, s);
      html += '<div class="row clickable" data-action="city" data-id="' + s.id + '"><div class="grow"><b>' + (s.isCapital ? '★ ' : '') + s.name + ' <span class="pill">' + (s.isCity ? 'City' : 'Town') + (s.specialization ? ' · ' + AU.SPECIALIZATIONS[s.specialization].name : '') + '</span>' + (s.pendingGrowth ? ' 🌱' : '') + '</b><small>Pop ' + s.pop + ' · ' + yieldsHtml(sy, { skip: ['happiness'] }) + ' · ' + (sy.happiness < 0 ? '😠' : '😊') + sy.happiness + (s.isCity ? ' · ' + (s.queue.length ? 'building ' + P.itemName(g, p, s.queue[0]) : '<b style="color:#e6b422">idle</b>') : '') + '</small></div></div>';
    });
    html += '</div><div class="section"><h3>Units (' + G.civUnits(g, p.idx).length + ')</h3>';
    G.civUnits(g, p.idx).forEach(function (u) { html += '<div class="row clickable" data-action="gotounit" data-id="' + u.id + '"><div class="grow"><b>' + AU.UNITS[u.type].icon + ' ' + u.name + '</b><small>HP ' + u.hp + ' · near ' + U.nearestName(g, u.tile) + (u.fortify ? ' · fortified' : '') + (u.auto ? ' · exploring' : '') + '</small></div></div>'; });
    html += '</div><div class="section"><h3>Rankings</h3>';
    var ranked = g.civs.slice().sort(function (a, b) { return G.score(g, b) - G.score(g, a); }), top = G.score(g, ranked[0]) || 1;
    ranked.forEach(function (c) { var cd = G.civData(c); html += '<div class="row"><div class="grow"><b>' + cd.name + (c.isPlayer ? ' (you)' : '') + (!c.alive ? ' — destroyed' : '') + '</b><div class="scorebar"><i style="width:' + Math.max(4, G.score(g, c) / top * 60) + '%;background:' + G.civColor(c) + '"></i><small class="stat">' + G.score(g, c) + ' pts · ' + (p.met[c.idx] || c.isPlayer ? Object.keys(c.techs).length + ' techs · ' + G.civSettlements(g, c.idx).length + ' settlements' : 'unknown') + '</small></div></div></div>'; });
    html += '</div><div class="section"><h3>Victory conditions</h3><p class="stat">Domination: hold every rival\'s original capital. Science: research Spaceflight and complete the three space projects in your capital. Score: highest score at turn ' + g.maxTurns + '.</p></div>';
    return { title: 'Empire', html: html };
  };

  P.render_log = function (app, g) {
    var html = '<div class="section">';
    g.log.slice().reverse().forEach(function (l) { html += '<div class="row"><small class="stat">T' + l.turn + '</small><div class="grow">' + esc(l.msg) + '</div></div>'; });
    return { title: 'History', html: html + '</div>' };
  };

  // ---------- Menu ----------
  P.render_menu = function (app, g) {
    var html = '<div class="section">';
    if (g) html += '<button class="big" data-action="save">Save game</button><br><br>';
    html += '<button class="big" data-action="loadgame" ' + (app.hasSave() ? '' : 'disabled') + '>Load saved game</button><br><br>';
    html += '<button class="big" data-action="newgame">New game</button><br><br>';
    html += '<button class="big ghost" data-action="togglegraphics">Graphics: ' + (app.settings.graphics === '3d' ? '3D world' : '2D classic') + ' (switch)</button><br><br>';
    if (g) html += '<button class="big ghost" data-action="log">History log</button><br><br>' + (app.renderer.is3D ? '' : '<button class="big ghost" data-action="togglegrid">' + (app.renderer.showGrid ? 'Hide' : 'Show') + ' hex grid</button><br><br>');
    html += '<button class="big ghost" data-action="help">How to play</button><br><br>';
    if (g) html += '<button class="big ghost" data-action="quit">Quit to title</button>';
    html += '</div><p class="stat">Ages Unbroken v0.2. Autosaves at the end of every turn.</p>';
    return { title: 'Menu', html: html };
  };
  P.render_help = function () {
    var html = '<div class="help">' +
      '<h3>The idea</h3><p>Ages Unbroken blends the classic Civilization formula with the settlement system of the newest generation: you found <b>Towns</b>, upgrade the important ones into <b>Cities</b>, and your civilization stays the same from the first turn to the last. There are no era resets, no crises and no changing civilizations: each leader rules only their own people, and every tech and civic you unlock stays with you.</p>' +
      '<h3>Towns and Cities</h3><p>Your capital is a City. New settlements are Towns. Towns have no production queue: their production becomes gold, and you buy buildings and units in them with gold. Towns grow by themselves. Once a Town reaches pop 5 you can <b>specialize</b> it (Farming, Mining, Trade, Fort, Urban Center): it stops growing and sends surplus food to your nearest City. Pay gold to <b>upgrade</b> a Town into a City whenever you want a real production hub.</p>' +
      '<h3>Growth and tiles</h3><p>There are no builders. Every time a settlement grows you pick a tile within three rings; the new citizen claims and improves it automatically (farm, mine, fishing boats, pasture, plantation…). Tiles with luxury resources give happiness, strategic resources unlock units such as Swordsmen (Iron) or Knights (Horses).</p>' +
      '<h3>Units</h3><p>Tap a unit to select it, tap a highlighted tile to move (far tiles create multi-turn routes). Tap a red tile to attack: the estimated damage is shown, tap again to confirm. Ranged units attack from a distance without taking damage. Melee units capture settlements when their HP reaches 0. Units heal when they do not move; Fortify to defend and heal faster. One military and one civilian unit per tile.</p>' +
      '<h3>Research and civics</h3><p>Science drives the technology tree, culture drives civics. Civics unlock governments (Autocracy, Republic, Monarchy, Democracy…) which you can switch between at any time from the Civics panel.</p>' +
      '<h3>Diplomacy</h3><p>Other leaders remember your wars. Declare war from the Diplomacy panel; AI leaders will offer or accept peace when a war goes badly for them. Independent camps (🏕️) spawn raiders: disperse them for gold.</p>' +
      '<h3>Winning</h3><p><b>Domination</b>: hold every rival\'s original capital. <b>Science</b>: research Spaceflight and complete the three space projects in your capital. <b>Score</b>: highest score when the turn limit is reached.</p>' +
      '<h3>Controls</h3><p>Drag to pan, pinch or scroll to zoom. Tap the yields at the top to open panels. Enter = end turn, N = next unit, F = fortify, Space = skip. The game autosaves every turn.</p></div>';
    return { title: 'How to play', html: html };
  };
  P.render_victory = function (app, g) {
    var p = G.player(g), v = g.victory, html = '<div class="victory">';
    if (!p.alive) html += '<h1>Defeat</h1><p>Your civilization has been destroyed on turn ' + g.turn + '.</p>';
    else if (v) { var w = g.civs[v.civ], wd = G.civData(w); html += '<h1>' + (w.isPlayer ? 'Victory!' : 'Defeat') + '</h1><p>' + G.leaderName(w) + ' of ' + wd.name + ' achieved a <b>' + v.type + '</b> victory on turn ' + v.turn + '.</p>'; }
    html += '<p class="stat">Final score: ' + G.score(g, p) + '</p><br><button class="big" data-action="continueplaying">Keep playing</button><br><br><button class="big primary" data-action="newgame">New game</button></div>';
    return { title: 'Game over', html: html };
  };

  // ---------- Panel actions ----------
  P.action = function (app, name, d) {
    var g = app.g, p = g ? G.player(g) : null, s;
    switch (name) {
      case 'citytab': app.panelData.tab = d.tab; app.refreshPanel(); break;
      case 'enqueue': s = g.settlements[+d.id]; if (s && G.enqueue(g, s, d.kind, d.item)) app.refreshPanel(); break;
      case 'dequeue': s = g.settlements[+d.id]; if (s) { G.dequeue(g, s, +d.index); app.refreshPanel(); } break;
      case 'buy': s = g.settlements[+d.id]; if (s) { if (G.purchase(g, s, d.kind, d.item)) { app.toast('Purchased.'); var qi = s.queue.findIndex(function (q) { return q.kind === d.kind && q.id === d.item; }); if (qi >= 0 && d.kind !== 'unit') s.queue.splice(qi, 1); } else app.toast('Not enough gold.'); app.refreshPanel(); } break;
      case 'upgradecity': s = g.settlements[+d.id]; if (s && G.upgradeToCity(g, s)) { app.toast(s.name + ' is now a City!'); app.refreshPanel(); } break;
      case 'specialize': s = g.settlements[+d.id]; if (s && G.specialize(g, s, d.spec)) { app.toast(s.name + ' is now a ' + AU.SPECIALIZATIONS[d.spec].name + '.'); app.refreshPanel(); } break;
      case 'research': p.currentTech = d.id; app.refreshPanel(); break;
      case 'civic': p.currentCivic = d.id; app.refreshPanel(); break;
      case 'government': if (G.setGovernment(g, p, d.id)) { app.toast('Government changed to ' + AU.GOVERNMENTS[d.id].name + '.'); app.refreshPanel(); } break;
      case 'war': app.confirm('Declare war on ' + G.civData(g.civs[+d.id]).name + '? Other leaders will remember this.', function () { G.declareWar(g, p.idx, +d.id); app.refreshPanel(); app.refreshHud(); }); break;
      case 'peace': { var o = g.civs[+d.id]; if (AU.AI.respondToPeaceProposal(g, o, p.idx) || (o.peaceOffer && g.turn - o.peaceOffer < 5)) { G.makePeace(g, p.idx, o.idx); o.peaceOffer = null; app.toast(G.leaderName(o) + ' accepts peace.'); } else { app.toast(G.leaderName(o) + ' refuses to make peace for now.'); o.rel[p.idx].attitude += 1; } app.refreshPanel(); break; }
      case 'gotounit': { var u = g.units[+d.id]; if (u) { app.closePanel(); app.selectUnit(u); app.renderer.centerOn(g, u.tile); } break; }
      case 'save': app.save(); break;
      case 'loadgame': if (app.load()) app.closePanel(); break;
      case 'newgame': app.closePanel(); app.g = null; app.showSetup(); break;
      case 'quit': app.confirm('Quit to the title screen? Your game is saved.', function () { app.save(true); app.panel = null; $('panel').hidden = true; app.g = null; app.showTitle(); }); break;
      case 'help': app.openPanel('help'); break;
      case 'log': app.openPanel('log'); break;
      case 'togglegrid': app.renderer.showGrid = !app.renderer.showGrid; app.invalidate(); app.refreshPanel(); break;
      case 'togglegraphics': app.settings.graphics = app.settings.graphics === '3d' ? '2d' : '3d'; app.saveSettings(); app.makeRenderer(); app.refreshPanel(); break;
      case 'continueplaying': app.closePanel(); break;
    }
  };
})(globalThis.AU = globalThis.AU || {});
