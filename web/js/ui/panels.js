// Full-screen panels: city management, research, civics & government, diplomacy, empire, menu, help, victory.
(function (AU) {
  var G = AU.G, U = AU.U;
  var P = AU.Panels = {};
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function yieldsHtml(y, opts) {
    var parts = [];
    var map = { food: ['🌾', 'food'], production: ['⚙️', 'prod'], gold: ['💰', 'goldc'], science: ['🔬', 'sci'], culture: ['🎭', 'cult'], faith: ['🕊️', 'faith'], happiness: ['😊', ''] };
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
    for (var nw in AU.NATIONAL) if (AU.NATIONAL[nw].tech === id) out.push(AU.NATIONAL[nw].name + ' (national)');
    var t = AU.TECH_BY_ID[id]; if (t.embark) out.push('units can embark on Coast'); if (t.ocean) out.push('Ocean travel'); if (t.desc) out.push(t.desc);
    return out;
  }
  function unlocksOfCivic(id) {
    var out = [], c = AU.CIVIC_BY_ID[id];
    for (var b in AU.BUILDINGS) if (AU.BUILDINGS[b].civic === id) out.push(AU.BUILDINGS[b].name);
    for (var w in AU.WONDERS) if (AU.WONDERS[w].civic === id) out.push(AU.WONDERS[w].name + ' (wonder)');
    for (var n in AU.NATIONAL) if (AU.NATIONAL[n].civic === id) out.push(AU.NATIONAL[n].name + ' (national)');
    (c.cards || []).forEach(function (k) { out.push('policy: ' + AU.POLICIES[k].name); });
    return out;
  }
  AU.unlocksOfTech = unlocksOfTech; AU.unlocksOfCivic = unlocksOfCivic; AU.civicFxText = civicFxText;
  // "⭐ Mastery: ..." line for a technology or civic row: what it gives and whether it is earned, still possible or missed
  function masteryLine(civ, id, isCivic) {
    var m = G.masteryOf(id, isCivic); if (!m) return '';
    var done = isCivic ? !!civ.civics[id] : !!civ.techs[id], boosted = civ.boosts && civ.boosts[isCivic ? 'c:' + id : id], has = G.hasMastery(civ, id, isCivic);
    var state = has ? '<span class="pill" style="background:#4a3a10;color:#ffe9a8">earned</span>' : done ? '<span class="pill">missed</span>' : boosted ? '<span class="pill" style="background:#2a4a1e;color:#b6f0c4">ready: finish it to earn</span>' : '<span class="pill">needs the ' + (isCivic ? 'Inspiration' : 'Eureka') + ' first</span>';
    return '<small>⭐ Mastery: ' + m.desc + ' ' + state + '</small>';
  }
  AU.masteryLine = masteryLine;
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
    html += '<div class="progress"><i style="width:' + Math.min(100, s.food / growthCost * 100) + '%;background:var(--food)"></i></div>';
    if (AU.Religion) {
      var Rl = AU.Religion, pr = s.pressure || {}, rows = Object.keys(pr).filter(function (k) { return pr[k] > 0 && g.religions[k]; }).sort(function (a2, b2) { return pr[b2] - pr[a2]; });
      html += '<p class="stat">' + (s.religion ? Rl.icon(g, s.religion) + ' Follows <b>' + Rl.name(g, s.religion) + '</b>' + (g.religions[s.religion] && g.religions[s.religion].holyCity === s.id ? ' (Holy City)' : '') : '🕊️ No majority religion') + (rows.length ? ' · pressure: ' + rows.map(function (k) { return Rl.icon(g, k) + ' ' + Math.round(pr[k]); }).join(', ') : '') + '</p>';
      if (s.civ === p.idx && (p.religion || p.pantheon)) {
        var fu = ['missionary', 'apostle', 'inquisitor'].filter(function (id) { var d0 = AU.UNITS[id]; return (id === 'missionary' ? (G.hasBuilding(s, 'shrine') || G.hasBuilding(s, 'temple')) && p.religion : G.hasBuilding(s, 'temple') && p.religion); });
        if (fu.length) html += '<div class="actions">' + fu.map(function (id) { var c0 = Rl.unitCost(g, p, id); return '<button class="small" data-action="buyfaith" data-id="' + s.id + '" data-item="' + id + '" ' + (Rl.canBuyUnit(g, s, id) ? '' : 'disabled') + '>' + AU.UNITS[id].icon + ' ' + AU.UNITS[id].name + ' ' + c0 + ' 🕊️</button>'; }).join('') + '</div>';
        else if (!p.religion) html += '<p class="stat">Found a religion to buy Missionaries here (needs a Shrine).</p>';
      }
    }
    html += '</div>';
    if (AU.CityMap) html += AU.CityMap.html(app, g, s, data);
    else if (s.pendingGrowth > 0) html += '<div class="row" style="border-color:var(--food)"><div class="grow"><b>🌱 ' + s.name + ' can expand (' + s.pendingGrowth + ')</b><small>Each new citizen claims and works one more tile.</small></div><button class="small primary" data-action="expand" data-id="' + s.id + '">Choose tile</button><button class="small" data-action="autoexpand" data-id="' + s.id + '">Auto</button></div>';

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
    [['units', 'Units'], ['buildings', 'Buildings'], ['wonders', 'Wonders'], ['national', 'National'], ['projects', 'Projects']].forEach(function (t) { if (!s.isCity && (t[0] === 'wonders' || t[0] === 'projects' || t[0] === 'national')) return; html += '<button class="small ' + (tab === t[0] ? 'on' : '') + '" data-action="citytab" data-id="' + s.id + '" data-tab="' + t[0] + '">' + t[1] + ' (' + opts[t[0]].length + ')</button>'; });
    html += '</div>';
    var kind = { units: 'unit', buildings: 'building', wonders: 'wonder', national: 'national', projects: 'project' }[tab];
    if (tab === 'national' && !opts.national.length) html += '<p class="stat">National wonders need several copies of a building across your settlements (for example three Libraries for the Royal Library). Each can be built once per civilization.</p>';
    if (!opts[tab].length) html += '<p class="stat">Nothing available yet. Research new technologies.</p>';
    opts[tab].forEach(function (id) {
      var cost = G.itemCost(g, civ, kind, id, s), buyCost = G.purchaseCost(g, civ, kind, id, s), name, desc;
      if (kind === 'unit') { var d = G.unitType(g, civ, id); name = AU.UNITS[id].icon + ' ' + d.name + (d.unique ? ' ★' : ''); desc = (d.cls === 'civilian' ? (d.desc || 'Founds a new Town.') : 'Str ' + d.strength + (d.ranged ? ' · Ranged ' + d.ranged + ' (range ' + d.range + ')' : '') + ' · Moves ' + G.maxMoves(g, civ.idx, id)) + (d.resource ? ' · needs ' + AU.RESOURCES[d.resource].name : ''); }
      else if (kind === 'building') { var b = G.buildingDef(g, civ, id); name = b.name + (b.unique ? ' ★' : ''); desc = yieldsHtml(b.yields, { plus: true }) + (b.desc ? ' · ' + b.desc : '') + (b.perPop ? ' · +' + b.perPop.science + ' 🔬 per pop' : '') + (b.pct ? ' · +' + (b.pct.production || b.pct.science || b.pct.unitProduction) + '% ' + Object.keys(b.pct)[0] : ''); }
      else if (kind === 'wonder') { var w = AU.WONDERS[id]; name = '🏛️ ' + w.name; desc = yieldsHtml(w.yields, { plus: true }) + ' · ' + w.desc; }
      else if (kind === 'national') { var nw = AU.NATIONAL[id]; name = '🏯 ' + nw.name; desc = yieldsHtml(nw.yields, { plus: true }) + ' · ' + nw.desc; }
      else { var pr = AU.PROJECTS[id]; name = '🚀 ' + pr.name; desc = pr.desc; }
      var inQ = G.inQueue(s, kind, id);
      html += '<div class="row"><div class="grow"><b>' + name + '</b><small>' + desc + '</small><small>' + cost + ' ⚙️' + (s.isCity ? ' (' + turns(cost, s.progress[kind + ':' + id] || 0, y.production) + ')' : '') + '</small></div>' +
        (s.isCity ? '<button class="small primary" data-action="enqueue" data-id="' + s.id + '" data-kind="' + kind + '" data-item="' + id + '" ' + (inQ && kind !== 'unit' ? 'disabled' : '') + '>' + (inQ && kind !== 'unit' ? 'Queued' : 'Build') + '</button>' : '') +
        (kind !== 'wonder' && kind !== 'project' && kind !== 'national' ? '<button class="small" data-action="buy" data-id="' + s.id + '" data-kind="' + kind + '" data-item="' + id + '" ' + (civ.gold >= buyCost ? '' : 'disabled') + '>' + buyCost + ' 💰</button>' : '') + '</div>';
    });
    html += '</div>';
    // buildings owned
    html += '<div class="section"><h3>Buildings (' + s.buildings.length + ')</h3><div class="yields">' + (s.buildings.map(function (b) { var d = G.buildingDef(g, civ, b); return '<span>' + (AU.WONDERS[b] ? '🏛️ ' : '') + d.name + '</span>'; }).join(' ') || '<span class="stat">none</span>') + '</div></div>';
    // tiles
    var worked = s.tiles.filter(function (i) { return g.tiles[i].worked && i !== s.tile; }).length;
    var nats = s.tiles.filter(function (i) { return g.tiles[i].natural; }).map(function (i) { return AU.NATURAL_WONDERS[g.tiles[i].natural].name; });
    if (nats.length) html += '<div class="section"><h3>Natural wonders</h3><p class="stat">' + nats.join(', ') + '</p></div>';
    html += '<div class="section"><h3>Territory</h3><p class="stat">' + s.tiles.length + ' tiles owned, ' + worked + ' worked by citizens. Founded turn ' + s.founded + '.</p>';
    html += '<div class="yields">' + s.tiles.filter(function (i) { return i !== s.tile; }).map(function (i) { var t = g.tiles[i], imp = G.improvementFor(g, t, civ), ty = G.tileYields(g, t, s, civ); return '<span class="' + (t.worked ? '' : 'stat') + '" data-action="citytile" data-tile="' + i + '" style="cursor:pointer">' + (t.worked ? '👤 ' : '· ') + (t.resource ? AU.RESOURCES[t.resource].icon + ' ' : '') + (t.hills ? 'Hills ' : '') + AU.TERRAIN[t.terrain].name + (t.feature ? ' ' + AU.FEATURES[t.feature].icon : '') + (imp ? ' ' + AU.IMPROVEMENTS[imp].icon : '') + ' <small>' + AU.YIELD_KEYS.filter(function (k) { return ty[k]; }).map(function (k) { return ty[k] + { food: '🌾', production: '⚙️', gold: '💰', science: '🔬', culture: '🎭', faith: '🕊️' }[k]; }).join(' ') + '</small></span>'; }).join('') + '</div>';
    html += '<button class="small" data-action="center" data-tile="' + s.tile + '">Show on map</button> <button class="small primary" data-action="cityview" data-id="' + s.id + '">🏙️ View city</button></div>';
    return { title: (s.isCapital ? '★ ' : '') + s.name + ' — ' + (s.isCity ? 'City' : 'Town'), html: html };
  };
  P.itemName = function (g, civ, q) {
    if (q.kind === 'unit') return G.unitType(g, civ, q.id).name;
    if (q.kind === 'building') return G.buildingDef(g, civ, q.id).name;
    if (q.kind === 'wonder') return AU.WONDERS[q.id].name;
    if (q.kind === 'national') return AU.NATIONAL[q.id].name;
    return AU.PROJECTS[q.id].name;
  };

  // ---------- Research ----------
  P.render_tech = function (app, g) {
    var p = G.player(g), y = G.civYields(g, p), html = '';
    var avail = G.availableTechs(p);
    var nMast = Object.keys(p.mastery || {}).filter(function (k) { return k.indexOf('c:') !== 0; }).length;
    html += '<p class="stat">' + y.science.toFixed(1) + ' 🔬 per turn · ' + Object.keys(p.techs).length + '/' + AU.TECHS.length + ' technologies · ⭐ ' + nMast + ' masteries. One continuous tree: nothing resets between eras.</p><p class="stat">💡 <b>Eureka</b>: an in-game condition for each technology. ⭐ <b>Mastery</b>: finish a technology after its Eureka fired and you keep its permanent bonus. Finish it without the Eureka and the mastery is lost. (Some leaders, like Meiji, also gain Science from Eurekas.)</p>';
    html += '<button class="big gold" data-action="tree" data-kind="tech">🌳 View the full technology tree</button><br><br>';
    html += '<div class="section"><h3>Available</h3>';
    avail.forEach(function (t) {
      var cost = G.techCost(g, p, t), prog = p.techProgress[t.id] || 0, cur = p.currentTech === t.id;
      var boosted = p.boosts && p.boosts[t.id];
      html += '<div class="row clickable ' + (cur ? 'active' : '') + '" data-action="research" data-id="' + t.id + '">' + (AU.Assets.get('techs', t.id) ? '<img class="techpic" src="' + AU.Assets.url('techs', t.id) + '" alt="">' : '') + '<div class="grow"><b>' + t.name + ' <span class="pill">' + AU.ERAS[t.era] + '</span>' + (boosted ? ' <span class="pill" style="background:#2a4a1e;color:#b6f0c4">Eureka ✓</span>' : '') + '</b><small>' + (unlocksOfTech(t.id).join(', ') || 'Leads to further technologies') + '</small>' + (t.eureka && !boosted ? '<small>💡 Eureka: ' + t.eureka.desc + '</small>' : '') + masteryLine(p, t.id, false) + '<small>' + Math.floor(prog) + '/' + cost + ' · ' + turns(cost, prog, y.science) + '</small>' + (cur ? '<div class="progress"><i style="width:' + (prog / cost * 100) + '%"></i></div>' : '') + '</div>' + (cur ? '<span class="pill">researching</span>' : '') + '</div>';
    });
    html += '</div>';
    AU.ERAS.forEach(function (era, ei) {
      var list = AU.TECHS.filter(function (t) { return t.era === ei && avail.indexOf(t) < 0; });
      if (!list.length) return;
      html += '<div class="section"><h3>' + era + ' Era</h3>';
      list.forEach(function (t) {
        var done = !!p.techs[t.id];
        html += '<div class="row ' + (done ? 'done' : 'locked') + '"><div class="grow"><b>' + t.name + (p.boosts && p.boosts[t.id] && !done ? ' 💡' : '') + '</b><small>' + (unlocksOfTech(t.id).join(', ') || '—') + '</small>' + (!done && t.pre.length ? '<small>Requires: ' + t.pre.map(function (x) { return AU.TECH_BY_ID[x].name; }).join(', ') + '</small>' : '') + (!done && t.eureka ? '<small>💡 ' + t.eureka.desc + '</small>' : '') + masteryLine(p, t.id, false) + '</div>' + (done ? '<span class="pill">✓</span>' : '<span class="pill">' + G.techCost(g, p, t) + '</span>') + '</div>';
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
      html += '<div class="row ' + (cur ? 'active' : ok ? '' : 'locked') + '"><div class="grow"><b>' + gv.name + '</b><small>' + gv.desc + '</small><small>Slots: ' + Object.keys(gv.slots).filter(function (k) { return gv.slots[k]; }).map(function (k) { return gv.slots[k] + ' ' + k; }).join(', ') + '</small>' + (!ok ? '<small>Requires civic: ' + AU.CIVIC_BY_ID[gv.civic].name + '</small>' : '') + '</div>' + (cur ? '<span class="pill">current</span>' : ok ? '<button class="small" data-action="government" data-id="' + id + '">Adopt</button>' : '') + '</div>';
    }
    html += '</div>';
    // policy cards
    var slots = G.policySlots(p), free = G.freeSlots(p), availCards = G.availablePolicies(p), active = p.policies || [];
    html += '<div class="section"><h3>Policy cards</h3><p class="stat">Slots: ' + ['military', 'economic', 'diplomatic', 'wildcard'].map(function (k) { return k + ' ' + (slots[k] - free[k]) + '/' + slots[k]; }).join(' · ') + '. Cards come from civics; wildcard slots accept any card.</p>';
    if (!active.length) html += '<p class="stat">No cards slotted.</p>';
    active.forEach(function (id) { var pc = AU.POLICIES[id]; html += '<div class="row active"><div class="grow"><b>' + pc.name + ' <span class="pill">' + pc.type + '</span></b><small>' + pc.desc + '</small></div><button class="small" data-action="policyremove" data-id="' + id + '">Remove</button></div>'; });
    var others = availCards.filter(function (id) { return active.indexOf(id) < 0; });
    if (others.length) { html += '<h3 style="margin-top:10px">Available cards</h3>'; others.forEach(function (id) { var pc = AU.POLICIES[id], fits = free[pc.type] > 0 || free.wildcard > 0; html += '<div class="row ' + (fits ? '' : 'locked') + '"><div class="grow"><b>' + pc.name + ' <span class="pill">' + pc.type + '</span></b><small>' + pc.desc + '</small></div><button class="small primary" data-action="policyadd" data-id="' + id + '" ' + (fits ? '' : 'disabled') + '>Slot</button></div>'; }); }
    html += '</div>';
    var nMastC = Object.keys(p.mastery || {}).filter(function (k) { return k.indexOf('c:') === 0; }).length;
    html += '<p class="stat">' + y.culture.toFixed(1) + ' 🎭 per turn · ' + Object.keys(p.civics).length + '/' + AU.CIVICS.length + ' civics · ⭐ ' + nMastC + ' masteries.</p><p class="stat">💡 <b>Inspiration</b>: an in-game condition for each civic. ⭐ <b>Mastery</b>: finish a civic after its Inspiration fired and you keep its permanent bonus. (Some leaders, like Pericles, also gain Culture from Inspirations.)</p>';
    html += '<button class="big gold" data-action="tree" data-kind="civic">🌳 View the full civics tree</button><br><br>';
    html += '<div class="section"><h3>Available civics</h3>';
    avail.forEach(function (c) {
      var cost = G.civicCost(g, p, c), prog = p.civicProgress[c.id] || 0, cur = p.currentCivic === c.id, boosted = p.boosts && p.boosts['c:' + c.id];
      html += '<div class="row clickable ' + (cur ? 'active' : '') + '" data-action="civic" data-id="' + c.id + '">' + (AU.Assets.get('civics', c.id) ? '<img class="techpic" src="' + AU.Assets.url('civics', c.id) + '" alt="">' : '') + '<div class="grow"><b>' + c.name + ' <span class="pill">' + AU.ERAS[c.era] + '</span>' + (boosted ? ' <span class="pill" style="background:#3a2a4a;color:#e6c8ff">Inspired ✓</span>' : '') + '</b><small>' + ([civicFxText(c)].concat(unlocksOfCivic(c.id)).filter(Boolean).join(' · ') || 'Leads to further civics') + '</small>' + (c.inspiration && !boosted ? '<small>💡 Inspiration: ' + c.inspiration.desc + '</small>' : '') + masteryLine(p, c.id, true) + '<small>' + Math.floor(prog) + '/' + cost + ' · ' + turns(cost, prog, y.culture) + '</small>' + (cur ? '<div class="progress"><i style="width:' + (prog / cost * 100) + '%;background:var(--cult)"></i></div>' : '') + '</div>' + (cur ? '<span class="pill">adopting</span>' : '') + '</div>';
    });
    html += '</div>';
    AU.ERAS.forEach(function (era, ei) {
      var list = AU.CIVICS.filter(function (t) { return t.era === ei && avail.indexOf(t) < 0; });
      if (!list.length) return;
      html += '<div class="section"><h3>' + era + ' Era</h3>';
      list.forEach(function (c) { var done = !!p.civics[c.id]; html += '<div class="row ' + (done ? 'done' : 'locked') + '"><div class="grow"><b>' + c.name + '</b><small>' + ([civicFxText(c)].concat(unlocksOfCivic(c.id)).filter(Boolean).join(' · ') || '—') + '</small>' + (!done && c.pre.length ? '<small>Requires: ' + c.pre.map(function (x) { return AU.CIVIC_BY_ID[x].name; }).join(', ') + '</small>' : '') + (!done && c.inspiration ? '<small>💡 ' + c.inspiration.desc + '</small>' : '') + masteryLine(p, c.id, true) + '</div>' + (done ? '<span class="pill">✓</span>' : '<span class="pill">' + G.civicCost(g, p, c) + '</span>') + '</div>'; });
      html += '</div>';
    });
    return { title: 'Civics & Government', html: html };
  };

  // ---------- Diplomacy ----------
  P.render_diplomacy = function (app, g) {
    var p = G.player(g), html = '';
    var others = g.civs.filter(function (c) { return c.idx !== p.idx && !c.minor; });
    if (!others.some(function (c) { return p.met[c.idx]; })) html += '<p class="stat">You have not met any other civilization yet. Explore!</p>';
    var CS = AU.CityStates, minors = g.civs.filter(function (c) { return c.minor && p.met[c.idx]; });
    if (CS) {
      html += '<div class="section"><h3>City-states</h3><p class="stat">Envoys: <b>' + (p.envoys || 0) + '</b> to send (you earn one with every civic). 1 envoy: bonus in your capital · 3: in every settlement and you can become Suzerain (most envoys) · 6: bonus doubled. The Suzerain gets the city-state\'s special bonus and its help in war.</p>';
      if (!minors.length) html += '<p class="stat">No city-state met yet.</p>';
      minors.forEach(function (m) {
        var d = G.civData(m), T = AU.CITY_STATE_TYPES[m.stateType], mine = CS.envoysOf(g, p, m), suz = CS.suzerain(g, m), tiers = AU.ENVOY_TIERS(m.stateType), war = G.atWar(g, p.idx, m.idx);
        html += '<div class="row"><div class="swatch" style="width:14px;height:40px;border-radius:4px;background:' + G.civColor(m) + '"></div><div class="grow"><b>' + T.icon + ' ' + d.name + '</b> <span class="pill">' + T.name + '</span>' + (!m.alive ? ' <span class="pill war">destroyed</span>' : war ? ' <span class="pill war">At war</span>' : '') +
          '<small>Your envoys: ' + mine + ' · Suzerain: ' + (suz < 0 ? 'none' : suz === p.idx ? '<b>you</b>' : G.civData(g.civs[suz]).name) + (m.religion ? ' · ' + AU.Religion.icon(g, m.religion) + ' ' + AU.Religion.name(g, m.religion) : '') + '</small>' +
          '<small>' + tiers.map(function (t) { return (mine >= t.n ? '✅ ' : '⬜ ') + t.n + ': ' + t.desc; }).join(' · ') + '</small><small><b>' + d.ability.name + ':</b> ' + d.ability.desc + '</small></div>' +
          (m.alive ? '<div><button class="small primary" data-action="talk" data-id="' + m.idx + '">Audience</button><button class="small" data-action="envoy" data-id="' + m.idx + '" ' + ((p.envoys || 0) > 0 && !war ? '' : 'disabled') + '>Send envoy</button></div>' : '') + '</div>';
      });
      html += '</div>';
    }
    others.forEach(function (c) {
      var d = G.civData(c), rel = p.rel[c.idx], met = p.met[c.idx];
      var att = c.alive ? c.rel[p.idx].attitude : 0, Dp = AU.Diplo;
      var mood = Dp ? Dp.mood(att) : (att > 15 ? 'Friendly' : att > -10 ? 'Neutral' : att > -30 ? 'Unfriendly' : 'Hostile');
      var tags = Dp && met && c.alive ? (Dp.isAlly(g, p.idx, c.idx) ? ' <span class="pill peace">Allied</span>' : Dp.isFriend(g, p.idx, c.idx) ? ' <span class="pill peace">Friends</span>' : '') + (Dp.isDenounced(g, c.idx, p.idx) ? ' <span class="pill war">Denounced you</span>' : '') : '';
      var portrait = AU.Assets.get('leaders', c.leaderId);
      html += '<div class="row">' + '<img class="portrait-sm" src="' + AU.Assets.url('leaders', c.leaderId) + '" alt="" onerror="this.remove()">' + '<div class="swatch" style="width:14px;height:40px;border-radius:4px;background:' + G.civColor(c) + ';border-right:4px solid ' + d.color2 + '"></div><div class="grow"><b>' + G.leaderName(c) + ' <span class="pill">' + d.name + '</span>' + (!c.alive ? ' <span class="pill">destroyed</span>' : '') + '</b>' +
        (met && c.alive ? '<small>' + (rel.war ? '<span class="pill war">At war</span> since turn ' + rel.warSince : '<span class="pill peace">Peace</span> · ' + mood) + tags + ' · ' + G.civSettlements(g, c.idx).length + ' settlements · military ' + Math.round(G.militaryStrength(g, c.idx)) + ' · score ' + G.score(g, c) + '</small><small>' + d.ability.name + ': ' + d.ability.desc + '</small>' : '<small>' + (c.alive ? 'Not met yet' : '') + '</small>') + '</div>';
      if (met && c.alive) {
        html += '<div><button class="small primary" data-action="talk" data-id="' + c.idx + '">Talk</button>';
        if (rel.war) html += '<button class="small" data-action="peace" data-id="' + c.idx + '">' + (c.peaceOffer && g.turn - c.peaceOffer < 5 ? 'Accept peace' : 'Propose peace') + '</button>';
        else html += '<button class="small danger" data-action="war" data-id="' + c.idx + '" ' + (Dp && !Dp.canDeclareWar(g, p.idx, c.idx) ? 'disabled title="A treaty forbids it"' : rel.peaceUntil > g.turn ? 'disabled title="Peace treaty until turn ' + rel.peaceUntil + '"' : '') + '>Declare war</button>';
        html += '</div>';
      }
      html += '</div>';
    });
    return { title: 'Diplomacy', html: html };
  };

  // ---------- Empire ----------
  P.render_empire = function (app, g) {
    var p = G.player(g), d = G.civData(p), y = G.civYields(g, p), html = '';
    html += '<div class="section"><h3>' + G.leaderName(p) + ' of ' + d.name + '</h3><div class="yields">' + yieldsHtml(y, { skip: ['food', 'happiness'], plus: true }) + '<span>💰 ' + Math.floor(p.gold) + ' treasury</span><span>unit upkeep ' + y.upkeep + '</span></div><p class="stat">' + d.ability.name + ': ' + d.ability.desc + '</p></div>';
    if (AU.Palace) html += '<div class="section"><button class="big" data-action="palace">🏰 Your palace (' + AU.Palace.count(p) + '/' + AU.PALACE_PIECES.length + ' pieces' + (p.palace && p.palace.pending > 0 ? ', a piece is offered!' : '') + ')</button></div>';
    if (AU.Great) {
      var GP = AU.Great, gst = GP.state(p), ppt = GP.pointsPerTurn(g, p);
      html += '<div class="section"><h3>Great People</h3><p class="stat">Buildings and wonders earn points every turn (Shrines → Prophets, Libraries → Scientists, Workshops → Engineers, Markets → Merchants, Amphitheaters → Artists, Barracks → Generals, Harbors → Admirals). When a bar fills, that Great Person appears in your capital. From half way you can recruit early with Faith or Gold.</p>';
      AU.GREAT_ORDER.forEach(function (t) {
        var T = AU.GREAT_TYPES[t], cost = GP.cost(g, p, t), pts = gst.pts[t] || 0, avail = GP.available(g, p, t), n = gst.count[t] || 0;
        var eta = ppt[t] > 0 ? Math.ceil((cost - pts) / ppt[t]) + ' turns' : (avail ? 'no points yet' : (t === 'prophet' && p.religion ? 'you have a religion' : t === 'prophet' && !p.pantheon ? 'choose a pantheon first' : t === 'prophet' && G.civUnits(g, p.idx).some(function (u) { return AU.UNITS[u.type].great === 'prophet'; }) ? 'your prophet is waiting for orders' : 'no religion left to found'));
        html += '<div class="row"><div class="grow"><b>' + T.icon + ' ' + T.name + (n ? ' <span class="pill">' + n + ' so far</span>' : '') + '</b><small>' + T.desc + '</small><small>' + Math.floor(pts) + '/' + cost + ' points · +' + ppt[t] + '/turn · ' + eta + '</small><div class="progress"><i style="width:' + Math.min(100, pts / cost * 100) + '%;background:var(--gold)"></i></div></div>' +
          (avail && pts >= cost * 0.5 ? '<div class="tree-detail-btns"><button class="small" data-action="patron" data-type="' + t + '" data-cur="faith" ' + (GP.canPatronize(g, p, t, 'faith') ? '' : 'disabled') + '>' + GP.patronCost(g, p, t, 'faith') + ' 🕊️</button><button class="small" data-action="patron" data-type="' + t + '" data-cur="gold" ' + (GP.canPatronize(g, p, t, 'gold') ? '' : 'disabled') + '>' + GP.patronCost(g, p, t, 'gold') + ' 💰</button></div>' : '') + '</div>';
      });
      var greats = G.civUnits(g, p.idx).filter(function (u) { return AU.UNITS[u.type].great; });
      if (greats.length) html += '<p class="stat">Waiting for orders: ' + greats.map(function (u) { return '<a class="plink" data-action="gotounit" data-id="' + u.id + '">' + AU.UNITS[u.type].icon + ' ' + u.name + '</a>'; }).join(', ') + '</p>';
      html += '</div>';
    }
    var cp = G.cultureProgress(g, p);
    html += '<div class="section"><h3>Tourism &amp; culture victory</h3><div class="yields"><span>🧳 +' + G.tourism(g, p) + ' tourism/turn</span><span>✈️ ' + cp.visitors + ' foreign visitors</span><span>🏠 need ' + cp.need + '</span></div><p class="stat">Win by culture when your foreign visitors exceed the domestic tourists of every rival (Industrial era or later). Tourism comes from wonders, museums, amphitheaters, broadcast towers, stadiums and natural wonders inside your borders, and grows with each era.</p>' +
      g.civs.filter(function (o) { return o.alive && o.idx !== p.idx && p.met && p.met[o.idx]; }).map(function (o) { var dom = G.domesticTourists(g, o); return '<div class="row"><div class="grow">' + G.civData(o).name + '</div><small>' + Math.min(100, Math.round(cp.visitors / (dom + 1) * 100)) + '% (' + cp.visitors + '/' + (dom + 1) + ')</small></div>'; }).join('') + '</div>';
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
    var pl = G.player(g), known = g.log.filter(function (l) { return l.civ === undefined || l.civ === null || l.civ === pl.idx || pl.met[l.civ]; });
    html += '<p class="stat">Only events involving you and the civilizations you have met are recorded.</p>';
    known.slice().reverse().forEach(function (l) { html += '<div class="row"><small class="stat">T' + l.turn + '</small><div class="grow">' + esc(l.msg) + '</div></div>'; });
    return { title: 'History', html: html + '</div>' };
  };

  // ---------- Menu ----------
  P.render_menu = function (app, g) {
    var html = '<div class="section">';
    if (g) html += '<button class="big" data-action="save">Save game</button><br><br>';
    html += '<button class="big" data-action="loadgame" ' + (app.hasSave() ? '' : 'disabled') + '>Load saved game</button><br><br>';
    html += '<button class="big" data-action="newgame">New game</button><br><br>';
    html += '<button class="big ghost" data-action="togglegraphics">Graphics: ' + (app.settings.graphics === '3d' ? '3D world' : '2D painted map') + ' (switch)</button><br><br>';
    if (app.settings.graphics !== '3d') html += '<button class="big ghost" data-action="toggleiso">View: ' + (app.settings.iso !== false ? 'Isometric (Civ 3 style)' : 'Top-down') + ' (switch)</button><br><br>';
    html += '<p class="stat">Chibilization ' + (AU.VERSION && AU.VERSION !== '__VERSION__' ? 'build ' + AU.VERSION.slice(0, 7) : 'local build') + (app.updateReady ? ' · <b>update ready</b>' : '') + '</p>';
    if (app.updateReady) html += '<button class="big primary" data-action="applyupdate">Restart with the new version</button><br><br>';
    var Au = AU.Audio; if (Au) html += '<div class="row"><div class="grow"><b>🎵 Music: ' + (Au.enabled ? 'on' : 'off') + '</b><small>' + (Au.enabled ? 'Now: ' + Au.status() + ' · volume ' + Math.round(Au.volume * 100) + '%' : 'Silent') + '</small></div><button class="small" data-action="musicvol" data-d="-1" ' + (Au.enabled ? '' : 'disabled') + '>−</button><button class="small" data-action="musicvol" data-d="1" ' + (Au.enabled ? '' : 'disabled') + '>+</button><button class="small ' + (Au.enabled ? '' : 'primary') + '" data-action="togglemusic">' + (Au.enabled ? 'Mute' : 'Turn on') + '</button></div>';
    html += '<button class="big ghost" data-action="tree" data-kind="tech">🌳 Technology & civics trees</button><br><br>';
    html += '<button class="big ghost" data-action="toggleyields">' + (app.settings.yields ? 'Hide' : 'Show') + ' tile yields on the map (Y)</button><br><br>';
    html += '<button class="big ghost" data-action="togglestrict">End Turn button: ' + (app.settings.strictTurn ? 'must clear the to-do list first' : 'to-do first, Pass anytime') + '</button><br><br>';
    if (g) html += '<button class="big ghost" data-action="log">History log</button><br><br><button class="big ghost" data-action="togglegrid">' + (app.renderer.showGrid ? 'Hide' : 'Show') + ' hex grid</button><br><br>';
    html += '<button class="big ghost" data-action="pedia">📖 Civilopedia</button><br><br><button class="big ghost" data-action="help">How to play</button><br><br>';
    if (g) html += '<button class="big ghost" data-action="quit">Quit to title</button>';
    html += '</div><p class="stat">Chibilization. Autosaves at the end of every turn.</p>';
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
  // ---------- Religion ----------
  P.render_religion = function (app, g, data) {
    var Rl = AU.Religion, p = G.player(g), y = G.civYields(g, p), html = '', sel = app.panelData;
    html += '<div class="section"><div class="yields"><span class="faith">🕊️ ' + Math.floor(p.faith) + ' Faith</span><span>+' + (y.faith || 0) + ' per turn</span></div>';
    html += '<p class="stat">Faith comes from Shrines, Temples, pantheon beliefs, holy cities and some wonders. Spend it on a pantheon (' + Rl.PANTHEON_COST + '), enhancing your religion (' + Rl.enhanceCost(g) + '), recruiting Great People early, and religious units bought in settlements with a Shrine or Temple.</p></div>';
    // pantheon
    if (!p.pantheon) {
      html += '<div class="section"><h3>Pantheon</h3>' + (Rl.canChoosePantheon(g, p) ? '<p class="stat">Choose one belief. It is yours for the whole game.</p>' : '<p class="stat">Needs ' + Rl.PANTHEON_COST + ' Faith.</p>');
      Rl.availablePantheons(g).forEach(function (b) { html += '<div class="row"><div class="grow"><b>' + b.name + '</b><small>' + b.desc + '</small></div><button class="small primary" data-action="pantheon" data-id="' + b.id + '" ' + (Rl.canChoosePantheon(g, p) ? '' : 'disabled') + '>Choose</button></div>'; });
      html += '</div>';
    } else html += '<div class="section"><h3>Pantheon: ' + AU.BELIEF_BY_ID[p.pantheon].name + '</h3><p class="stat">' + AU.BELIEF_BY_ID[p.pantheon].desc + '</p></div>';
    var rel = Rl.rel(g, p.religion);
    if (!rel && p.pantheon) {
      var slotsLeft = Rl.maxReligions(g) - Rl.religionsFounded(g);
      html += '<div class="section"><h3>Found a religion</h3><p class="stat">' + (slotsLeft > 0 ? slotsLeft + ' religion' + (slotsLeft > 1 ? 's' : '') + ' can still be founded in this world. Religions are founded by a <b>Great Prophet</b> (earned with Great Prophet points from Shrines, Temples and Faith; see the Empire panel). Move the prophet into the settlement that should become the Holy City, pick a name, one Follower belief and one Founder belief, then found it.' : 'Every religion of this world has already been founded.') + (Rl.prophetFor(g, p) ? '<br><b style="color:var(--gold)">' + Rl.prophetFor(g, p).name + ' is ready in ' + G.settlementAt(g, Rl.prophetFor(g, p).tile).name + '.</b>' : (p.religion ? '' : '<br>No Great Prophet in a settlement yet.')) + '</p>';
      if (slotsLeft > 0) {
        html += '<p><b>Name</b></p><div class="actions">' + Rl.availableNames(g).map(function (n) { return '<button class="small' + (sel.relName === n.id ? ' primary' : '') + '" data-action="relpick" data-what="relName" data-id="' + n.id + '">' + n.icon + ' ' + n.name + '</button>'; }).join('') + '</div>';
        html += '<p><b>Follower belief</b> (every settlement of the religion)</p>' + Rl.availableBeliefs(g, 'follower').map(function (b) { return '<div class="row' + (sel.relFollower === b.id ? ' selected' : '') + '"><div class="grow"><b>' + b.name + '</b><small>' + b.desc + '</small></div><button class="small' + (sel.relFollower === b.id ? ' primary' : '') + '" data-action="relpick" data-what="relFollower" data-id="' + b.id + '">' + (sel.relFollower === b.id ? 'Chosen' : 'Pick') + '</button></div>'; }).join('');
        html += '<p><b>Founder belief</b> (only for you)</p>' + Rl.availableBeliefs(g, 'founder').map(function (b) { return '<div class="row' + (sel.relFounder === b.id ? ' selected' : '') + '"><div class="grow"><b>' + b.name + '</b><small>' + b.desc + '</small></div><button class="small' + (sel.relFounder === b.id ? ' primary' : '') + '" data-action="relpick" data-what="relFounder" data-id="' + b.id + '">' + (sel.relFounder === b.id ? 'Chosen' : 'Pick') + '</button></div>'; }).join('');
        html += '<br><button class="big primary" data-action="foundrel" ' + (Rl.canFound(g, p) && sel.relName && sel.relFollower && sel.relFounder ? '' : 'disabled') + '>Found religion' + (Rl.prophetFor(g, p) ? ' in ' + G.settlementAt(g, Rl.prophetFor(g, p).tile).name : '') + '</button>';
      }
      html += '</div>';
    }
    if (rel) {
      html += '<div class="section"><h3>' + rel.icon + ' ' + rel.name + (rel.founder === p.idx ? ' (founded by you)' : ' (founded by ' + G.civData(g.civs[rel.founder]).name + ')') + '</h3>';
      html += '<p class="stat">Holy city: ' + (g.settlements[rel.holyCity] ? g.settlements[rel.holyCity].name : '—') + ' · followers: ' + Rl.followerCount(g, rel.id) + ' settlements.</p>';
      rel.beliefs.forEach(function (bid) { var b = AU.BELIEF_BY_ID[bid]; if (b) html += '<div class="row"><div class="grow"><b>' + b.name + '</b> <span class="pill">' + b.type + '</span><small>' + b.desc + '</small></div></div>'; });
      if (rel.founder === p.idx && !rel.enhanced) {
        html += '<h3>Enhance (' + Rl.enhanceCost(g) + ' 🕊️)</h3><p><b>Enhancer belief</b></p>' + Rl.availableBeliefs(g, 'enhancer').map(function (b) { return '<div class="row"><div class="grow"><b>' + b.name + '</b><small>' + b.desc + '</small></div><button class="small' + (sel.relEnh === b.id ? ' primary' : '') + '" data-action="relpick" data-what="relEnh" data-id="' + b.id + '">' + (sel.relEnh === b.id ? 'Chosen' : 'Pick') + '</button></div>'; }).join('');
        html += '<p><b>Second follower belief</b></p>' + Rl.availableBeliefs(g, 'follower').map(function (b) { return '<div class="row"><div class="grow"><b>' + b.name + '</b><small>' + b.desc + '</small></div><button class="small' + (sel.relFollower2 === b.id ? ' primary' : '') + '" data-action="relpick" data-what="relFollower2" data-id="' + b.id + '">' + (sel.relFollower2 === b.id ? 'Chosen' : 'Pick') + '</button></div>'; }).join('');
        html += '<br><button class="big primary" data-action="enhancerel" ' + (Rl.canEnhance(g, p) && sel.relEnh && sel.relFollower2 ? '' : 'disabled') + '>Enhance ' + rel.name + '</button>';
      }
      var vp = Rl.victoryProgress(g, p);
      if (vp) html += '<h3>Religious victory</h3><p class="stat">Win, from the Renaissance era on, when your religion is the majority in at least half of the settlements of every civilization.</p>' + vp.map(function (r) { return '<div class="row"><div class="grow">' + (r.ok ? '✅ ' : '⬜ ') + G.civData(r.civ).name + '</div><small>' + r.followers + '/' + r.total + '</small></div>'; }).join('');
      html += '</div>';
    }
    // world religions
    var ids = Object.keys(g.religions || {});
    html += '<div class="section"><h3>Religions of the world</h3>' + (ids.length ? ids.map(function (id) { var r = g.religions[id]; return '<div class="row"><div class="grow"><b>' + r.icon + ' ' + r.name + '</b><small>' + G.civData(g.civs[r.founder]).name + ' · ' + Rl.followerCount(g, id) + ' settlements · ' + r.beliefs.map(function (b) { return AU.BELIEF_BY_ID[b] ? AU.BELIEF_BY_ID[b].name : b; }).join(', ') + '</small></div></div>'; }).join('') : '<p class="stat">No religion has been founded yet. ' + Rl.maxReligions(g) + ' can exist in this world.</p>') + '</div>';
    html += '<div class="section"><h3>Your settlements</h3>' + G.civSettlements(g, p.idx).map(function (s) { return '<div class="row clickable" data-action="city" data-id="' + s.id + '"><div class="grow">' + s.name + '</div><small>' + (s.religion ? Rl.icon(g, s.religion) + ' ' + Rl.name(g, s.religion) : '—') + '</small></div>'; }).join('') + '</div>';
    return { title: 'Religion', html: html };
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
    if (AU.Tree && AU.Tree.action(app, name, d)) return;
    switch (name) {
      case 'citytab': app.panelData.tab = d.tab; app.refreshPanel(); break;
      case 'citygrow': s = g.settlements[+d.id]; if (s && G.expandTo(g, s, +d.tile)) { app.toast('A citizen now works that tile.'); app.panelData.tile = +d.tile; app.refreshPanel(); app.refreshHud(); app.invalidate(); } break;
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
      case 'patron': { var gu = AU.Great.patronize(g, p, d.type, d.cur); if (gu) { app.toast(gu.name + ' joins you!'); app.refreshPanel(); app.refreshHud(); } break; }
      case 'togglemusic': app.settings.music = !(app.settings.music !== false); app.saveSettings(); AU.Audio.setEnabled(app.settings.music); app.refreshPanel(); break;
      case 'musicvol': app.settings.musicVolume = Math.round(Math.max(0, Math.min(1, (AU.Audio.volume || 0) + 0.1 * (+d.d))) * 10) / 10; app.saveSettings(); AU.Audio.setVolume(app.settings.musicVolume); app.refreshPanel(); break;
      case 'pedia': app.openPanel('pedia', { cat: d.cat || app.pediaState.cat, id: d.id || null }); break;
      case 'envoy': if (AU.CityStates.sendEnvoy(g, p, g.civs[+d.id])) { app.refreshPanel(); app.refreshHud(); } break;
      case 'talk': if (AU.DiploUI && g.civs[+d.id]) AU.DiploUI.open(app, +d.id, { kind: 'talk' }); break;
      case 'palace': app.openPanel('palace'); break;
      case 'palacepick': app.panelData = { piece: d.piece, style: d.style }; app.refreshPanel(); break;
      case 'palacebuild': if (AU.Palace.build(g, p, d.piece, d.style)) { app.toast('The ' + AU.PALACE_PIECE_BY_ID[d.piece].name + ' is built.'); app.panelData = {}; app.refreshPanel(); app.refreshHud(); } break;
      case 'relpick': app.panelData[d.what] = d.id; app.refreshPanel(); break;
      case 'pantheon': if (AU.Religion.choosePantheon(g, p, d.id)) { app.toast('Pantheon: ' + AU.BELIEF_BY_ID[d.id].name + '.'); app.refreshPanel(); app.refreshHud(); } break;
      case 'foundrel': { var pdx = app.panelData; if (AU.Religion.found(g, p, pdx.relName, pdx.relFollower, pdx.relFounder)) { app.toast('Religion founded!'); app.refreshPanel(); app.refreshHud(); app.showQuotes(); } break; }
      case 'enhancerel': { var pd2 = app.panelData; if (AU.Religion.enhance(g, p, pd2.relEnh, pd2.relFollower2)) { app.toast('Religion enhanced.'); app.refreshPanel(); app.refreshHud(); } break; }
      case 'buyfaith': s = g.settlements[+d.id]; if (s) { var ru = AU.Religion.buyUnit(g, s, d.item); if (ru) { app.toast(ru.name + ' purchased with Faith.'); app.refreshPanel(); app.refreshHud(); } } break;
      case 'pediasearch': break;
      case 'policyadd': G.setPolicies(g, p, (p.policies || []).concat([d.id])); app.refreshPanel(); app.refreshHud(); break;
      case 'policyremove': G.setPolicies(g, p, (p.policies || []).filter(function (x) { return x !== d.id; })); app.refreshPanel(); app.refreshHud(); break;
      case 'cityview': app.openPanel('cityview', { id: +d.id }); break;
      case 'citytile': app.panelData.tile = +d.tile; app.refreshPanel(); setTimeout(function () { var cm = $('citymap'); if (cm) cm.scrollIntoView({ block: 'center' }); }, 0); break;
      case 'log': app.openPanel('log'); break;
      case 'togglegrid': app.renderer.showGrid = !app.renderer.showGrid; app.invalidate(); app.refreshPanel(); break;
      case 'toggleyields': app.settings.yields = !app.settings.yields; app.saveSettings(); if (app.renderer) app.renderer.showYields = app.settings.yields; app.invalidate(); if (app.panel === 'menu') app.refreshPanel(); if (g) app.toast('Tile yields ' + (app.settings.yields ? 'shown' : 'hidden') + '.'); break;
      case 'toggleiso': app.settings.iso = app.settings.iso === false; app.saveSettings(); if (app.renderer) { app.renderer.iso = app.settings.iso; app.renderer.sprites = {}; app.renderer.spriteCount = 0; } app.invalidate(); app.refreshPanel(); break;
      case 'applyupdate': app.save(true); location.reload(); break;
      case 'togglestrict': app.settings.strictTurn = !app.settings.strictTurn; app.saveSettings(); app.refreshPanel(); break;
      case 'togglegraphics': app.settings.graphics = app.settings.graphics === '3d' ? '2d' : '3d'; app.saveSettings(); app.makeRenderer(); app.refreshPanel(); break;
      case 'continueplaying': app.closePanel(); break;
    }
  };
})(globalThis.AU = globalThis.AU || {});
