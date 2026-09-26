// Full-screen panels: city management, research, civics & government, diplomacy, empire, menu, help, victory.
(function (AU) {
  var G = AU.G, U = AU.U;
  var P = AU.Panels = {};
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  // What each yield does, in plain words (tap a yield in the city panel).
  var YIELD_INFO = {
    food: ['🌾', _('Food'), _('Feeds the citizens: each one eats 2 Food. The surplus fills the growth bar and a new citizen appears when it is full; a deficit starves the settlement. A specialized Town sends its surplus Food to your nearest City instead of growing.')],
    production: ['⚙️', _('Production'), _('Builds what is in the queue: units, buildings, wonders and projects. In a Town, Production is turned into Gold instead. It comes from worked mines, quarries, woodcutters, hills and buildings such as the Workshop.')],
    gold: ['💰', _('Gold'), _('The treasury pays unit upkeep every turn; what is left buys units and buildings in any settlement, upgrades Towns into Cities, gifts Free cities and patronizes Great People. Markets, trade tiles, caravans and Towns make Gold.')],
    science: ['🔬', _('Knowledge'), _('Fills the technology you are researching. Every citizen gives a little, Libraries and Universities give more, specialists give') + ' +2 ' + _('each. Technologies unlock units, buildings and eras.')],
    culture: ['🎭', _('Heritage'), _('Fills the civic you are adopting and expands your borders. Monuments, Amphitheaters and wonders make Heritage. Civics unlock governments and policy cards.')],
    faith: ['🕊️', _('Devotion'), _('Comes from Shrines and Temples. Spend it on a pantheon, on enhancing your religion, on religious units and on recruiting Great People early.')],
    happiness: ['😊', _('Happiness'), _('Citizens want luxuries and entertainment. Above zero the settlement is content. Below zero it grows at half speed and its yields drop by 15% (30% at -5 or worse). Luxury resources, Amphitheaters, Markets and some policy cards raise it.')]
  };
  AU.YIELD_INFO = YIELD_INFO;
  function yieldsHtml(y, opts) {
    var parts = [];
    var map = { food: ['🌾', 'food'], production: ['⚙️', 'prod'], gold: ['💰', 'goldc'], science: ['🔬', 'sci'], culture: ['🎭', 'cult'], faith: ['🕊️', 'faith'], happiness: ['😊', ''] };
    var info = opts && opts.info;
    AU.YIELD_KEYS.forEach(function (k) { if (y[k] && (!opts || !opts.skip || opts.skip.indexOf(k) < 0)) parts.push('<span class="' + map[k][1] + (info ? ' clickable' : '') + '"' + (info ? ' data-action="yieldinfo" data-id="' + k + '" title="' + _('Tap for an explanation') + '"' : '') + '>' + map[k][0] + (y[k] > 0 && opts && opts.plus ? '+' : '') + (Math.round(y[k] * 10) / 10) + '</span>'); });
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
    var t = AU.TECH_BY_ID[id]; if (t.embark) out.push(_('units can embark on Coast')); if (t.ocean) out.push(_('Ocean travel')); if (t.desc) out.push(t.desc);
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
    var defM = isCivic ? AU.CIVIC_BY_ID[id] : AU.TECH_BY_ID[id]; if (defM && !(isCivic ? defM.inspiration : defM.eureka) && !has) return '<small>⭐ ' + _('Mastery') + ': ' + m.desc + ' <span class="pill">' + _('earned on completion') + '</span></small>';
    var state = has ? '<span class="pill" style="background:#4a3a10;color:#ffe9a8">earned</span>' : done ? '<span class="pill">missed</span>' : boosted ? '<span class="pill" style="background:#2a4a1e;color:#b6f0c4">' + _('ready: finish it to earn') + '</span>' : '<span class="pill">needs the ' + (isCivic ? _('Insight') : _('Spark')) + ' first</span>';
    return '<small>⭐ ' + _('Mastery') + ': ' + m.desc + ' ' + state + '</small>';
  }
  AU.masteryLine = masteryLine;
  function civicFxText(c) {
    var out = [];
    if (c.unlocks) out.push(_('Government') + ': ' + c.unlocks);
    var fx = c.fx || {};
    if (fx.yieldMult) for (var k in fx.yieldMult) out.push('+' + Math.round((fx.yieldMult[k] - 1) * 100) + '% ' + k);
    if (fx.goldPerSettlement) out.push('+' + fx.goldPerSettlement + ' ' + _('Gold per settlement'));
    if (fx.culturePerSettlement) out.push('+' + fx.culturePerSettlement + ' ' + _('Heritage per settlement'));
    if (fx.happinessBonus) out.push('+' + fx.happinessBonus + ' ' + _('Happiness per settlement'));
    if (fx.unitCostMult) out.push('units ' + Math.round((1 - fx.unitCostMult) * 100) + '% cheaper');
    if (fx.buildingCostMult) out.push('buildings ' + Math.round((1 - fx.buildingCostMult) * 100) + '% cheaper');
    if (fx.settlerCostMult) out.push('settlers ' + Math.round((1 - fx.settlerCostMult) * 100) + '% cheaper');
    if (fx.growthMult) out.push('+' + Math.round((fx.growthMult - 1) * 100) + '% growth');
    if (fx.townGoldMult) out.push('towns convert production to gold at ' + Math.round(fx.townGoldMult * 100) + '%');
    if (fx.purchaseMult) out.push('purchases ' + Math.round((1 - fx.purchaseMult) * 100) + '% cheaper');
    if (fx.cityDefense) out.push('+' + fx.cityDefense + ' settlement defense');
    if (fx.tileBonus) out.push('farms +1 ' + _('Food'));
    if (fx.navalMoves) out.push('naval units +1 movement');
    if (fx.landBonus) out.push('land units +' + fx.landBonus + ' strength');
    if (fx.culturePerWonder) out.push('+' + fx.culturePerWonder + ' ' + _('Heritage per wonder'));
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
    var focus = body.querySelector('.row.focus'); if (focus && focus.scrollIntoView) setTimeout(function () { focus.scrollIntoView({ block: 'center' }); }, 30);
  };

  // ---------- City / Town ----------
  P.render_city = function (app, g, data) {
    var s = g.settlements[data.id]; if (!s) return { title: _('Settlement'), html: '<p>' + _('This settlement no longer exists.') + '</p>' };
    var civ = g.civs[s.civ], p = G.player(g), y = G.settlementYields(g, s), fx = G.civFx(g, civ);
    var html = '';
    var growthCost = G.growthCostFor(g, s), surplus = y.food - s.pop * 2;
    html += '<div class="section"><div class="yields">' + yieldsHtml(y, { skip: ['happiness'], info: true }) + '<span class="clickable" data-action="yieldinfo" data-id="happiness">' + (y.happiness < 0 ? '😠 ' : '😊 ') + y.happiness + '</span></div><p class="stat">' + _('Tap a yield to learn what it does.') + '</p>';
    if (g.v2 && AU.Smoke && (AU.Smoke.smoke(g, s) > 0 || (g.civs[s.civ].era || 0) >= AU.Smoke.POP_ERA)) { var smd = AU.Smoke.describe(g, s); html += '<p class="stat">🏭 ' + _('Smoke') + ' <b>' + smd.net + '</b>' + (smd.from ? ' · ' + _('from') + ' ' + smd.from : '') + (smd.soaked ? ' · ' + _('soaked up by') + ' ' + smd.soaked : '') + (smd.happiness ? ' · <b style="color:#e05252">' + smd.happiness + ' ' + _('Happiness') + '</b>' : '') + (smd.heavy ? ' · <b style="color:#e05252">' + _('heavy: farms and pastures -1 Food, Fame halved') + '</b>' : '') + '</p>'; }
    html += '<p class="stat">' + _('Population') + ' ' + s.pop + (s.specialists ? ' (' + s.specialists + ' specialists)' : '') + ' · ' + _('Food') + ' ' + Math.floor(s.food) + '/' + growthCost + ' (' + (s.specialization && !s.isCity ? 'sends surplus to ' + (G.nearestCity(g, s) ? G.nearestCity(g, s).name : 'no city') : surplus > 0 ? 'grows in ' + turns(growthCost, s.food, surplus * (fx.growthMult || 1)) : surplus < 0 ? 'starving!' : 'stagnant') + ')' +
      ' · ' + _('Defense') + ' ' + G.settlementStrength(g, s) + ' · HP ' + s.hp + '/' + G.settlementMaxHp(g, s) + (s.unrest > g.turn ? ' · <b style="color:#e05252">⚠️ ' + _('Unrest') + ' (' + (s.unrest - g.turn) + ' ' + _('turns') + ': ' + _('half yields, -3 Happiness') + ')</b>' : '') + (g.v2 && AU.Society ? (function () { var tr = AU.Society.tierOf(y.happiness); return ' · ' + tr.icon + ' <b' + (tr.mult < 1 ? ' style="color:#e05252"' : '') + '>' + _(tr.name) + '</b> (' + _('yields') + ' ×' + tr.mult + ', ' + _('growth') + ' ×' + tr.growth + ')'; })() : (y.happiness < 0 ? ' · <b style="color:#e05252">' + _('Unhappy: yields reduced') + '</b>' : '')) + '</p>';
    html += '<div class="progress"><i style="width:' + Math.min(100, s.food / growthCost * 100) + '%;background:var(--food)"></i></div>';
    if (AU.Religion) {
      var Rl = AU.Religion, pr = s.pressure || {}, rows = Object.keys(pr).filter(function (k) { return pr[k] > 0 && g.religions[k]; }).sort(function (a2, b2) { return pr[b2] - pr[a2]; });
      html += '<p class="stat">' + (s.religion ? Rl.icon(g, s.religion) + ' ' + _('Follows') + ' <b>' + Rl.name(g, s.religion) + '</b>' + (g.religions[s.religion] && g.religions[s.religion].holyCity === s.id ? ' (' + _('Holy City)') : '') : '🕊️ ' + _('No majority religion')) + (rows.length ? ' · pressure: ' + rows.map(function (k) { return Rl.icon(g, k) + ' ' + Math.round(pr[k]); }).join(', ') : '') + '</p>';
      if (s.civ === p.idx && (p.religion || p.pantheon)) {
        var fu = ['missionary', 'apostle', 'inquisitor'].filter(function (id) { var d0 = AU.UNITS[id]; return (id === 'missionary' ? (G.hasBuilding(s, 'shrine') || G.hasBuilding(s, 'temple')) && p.religion : G.hasBuilding(s, 'temple') && p.religion); });
        if (fu.length) html += '<div class="actions">' + fu.map(function (id) { var c0 = Rl.unitCost(g, p, id); return '<button class="small" data-action="buyfaith" data-id="' + s.id + '" data-item="' + id + '" ' + (Rl.canBuyUnit(g, s, id) ? '' : 'disabled') + '>' + AU.UNITS[id].icon + ' ' + AU.UNITS[id].name + ' ' + c0 + ' 🕊️</button>'; }).join('') + '</div>';
        else if (!p.religion) html += '<p class="stat">' + _('Found a religion to buy Preachers here (needs a Shrine).') + '</p>';
      }
    }
    html += '</div>';
    if (AU.CityMap) html += AU.CityMap.html(app, g, s, data);
    else if (s.pendingGrowth > 0) html += '<div class="row" style="border-color:var(--food)"><div class="grow"><b>🌱 ' + s.name + ' can expand (' + s.pendingGrowth + ')</b><small>' + _('Each new citizen claims and works one more tile.') + '</small></div><button class="small primary" data-action="expand" data-id="' + s.id + '">' + _('Choose tile') + '</button><button class="small" data-action="autoexpand" data-id="' + s.id + '">' + _('Auto') + '</button></div>';

    if (!s.isCity) {
      var upCost = G.cityUpgradeCost(g, civ);
      html += '<div class="section"><h3>' + _('Town') + '</h3><div class="row"><div class="grow"><b>' + _('Upgrade to City') + '</b><small>' + _('Cities get a production queue, can build wonders and keep their production. Towns turn production into gold and buy what they need.') + '</small></div><button class="small primary" data-action="upgradecity" data-id="' + s.id + '" ' + (civ.gold >= upCost ? '' : 'disabled') + '>' + upCost + ' 💰</button></div>';
      var specs = G.specializationsFor(civ);
      html += '<h3>' + _('Specialization') + (s.specialization && specs[s.specialization] ? ': ' + specs[s.specialization].name : '') + '</h3>';
      for (var sp in specs) {
        var sd = specs[sp], can = G.canSpecialize(g, s, sp);
        html += '<div class="row ' + (s.specialization === sp ? 'active' : can ? '' : 'locked') + '"><div class="grow"><b>' + sd.icon + ' ' + sd.name + '</b><small>' + sd.desc + ' ' + _('Requires pop') + ' ' + sd.minPop + '. ' + _('A specialized town stops growing.') + '</small></div>' + (s.specialization === sp ? '<span class="pill">current</span>' : '<button class="small" data-action="specialize" data-id="' + s.id + '" data-spec="' + sp + '" ' + (can && (!s.specialization || civ.gold >= 60) ? '' : 'disabled') + '>' + (s.specialization ? '60 💰' : _('Choose')) + '</button>') + '</div>';
      }
      html += '</div>';
    }
    if (s.isCity || s.queue.length) {
      // production queue (a Town shows it only while it raises a Great work)
      html += '<div class="section"><h3>' + _('Production') + ' (' + y.production + ' ⚙️ per turn)</h3>';
      if (!s.isCity) html += '<p class="stat">' + _('While this Town raises a Great work, its Production builds it instead of turning into Gold.') + '</p>';
      if (!s.queue.length) html += '<p class="stat">' + _('Nothing queued. Unused production is converted to gold at 50%.') + '</p>';
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
    if (g.v2 && AU.Synthesis && s.isCity && (civ.era || 0) >= AU.Synthesis.MIN_ERA) {
      var SY = AU.Synthesis, syCost = SY.cost(g, civ), syStudy = Math.floor((civ.v2 && civ.v2.study) || 0);
      html += '<div class="section"><h3>🧪 ' + _('Synthesis') + '</h3>';
      if (!SY.hasLab(s)) html += '<p class="stat">' + _('A Research Lab here would let this City turn Knowledge into a lasting supply of any strategic resource.') + '</p>';
      else {
        html += '<p class="stat">' + _('Turn Knowledge into a lasting supply of a strategic resource') + ': ' + syCost + ' 📚 ' + _('for') + ' +' + SY.supplyFor(g, civ) + ' ' + _('supply') + ' (' + _('you have') + ' ' + syStudy + ' 📚 · ' + _('every synthesis makes the next dearer') + ')</p>';
        SY.options(g, civ).forEach(function (o) { var R = AU.RESOURCES[o.id], can = syStudy >= syCost && civ.isPlayer; html += '<div class="row ' + (can ? 'active clickable' : 'locked') + '" data-action="synth" data-id="' + s.id + '" data-res="' + o.id + '"><span class="hall-medal">' + R.icon + '</span><div class="grow"><b>' + R.name + '</b><small>' + _('supply') + ' ' + o.supply + ' · ' + _('in use') + ' ' + o.use + (o.made ? ' · ' + _('synthesised') + ' +' + o.made : '') + '</small></div><span class="pill">' + syCost + ' 📚</span></div>'; });
      }
      html += '</div>';
    }
    html += '<div class="section"><h3>' + (s.isCity ? _('Build or buy') : _('Purchase with gold')) + '</h3><div class="tabs">';
    [['units', _('Units')], ['buildings', _('Buildings')], ['wonders', _('Wonders')], ['national', _('National')], ['projects', _('Projects')]].forEach(function (t) { if (!s.isCity && (t[0] === 'projects' || ((t[0] === 'wonders' || t[0] === 'national') && !opts[t[0]].length))) return; html += '<button class="small ' + (tab === t[0] ? 'on' : '') + '" data-action="citytab" data-id="' + s.id + '" data-tab="' + t[0] + '">' + t[1] + ' (' + opts[t[0]].length + ')</button>'; });
    html += '</div>';
    var kind = { units: 'unit', buildings: 'building', wonders: 'wonder', national: 'national', projects: 'project' }[tab];
    if (tab === 'national' && !opts.national.length) html += '<p class="stat">' + _('National wonders need several copies of a building across your settlements (for example three Libraries for the Royal Library). Each can be built once per empire, and some only in a Town of a given trade.') + '</p>';
    if (tab === 'wonders' && s.isCity && !s.isCapital) html += '<p class="stat">' + _('Great Wonders 👑 rise only in the capital or in a Town of the matching trade (Mining, Farming, Trade, Fort, Urban Center). Generic Wonders 🏛️ rise in any City.') + '</p>';
    if (tab === 'wonders' && s.isCapital && opts.wonders.some(function (id) { return AU.WONDERS[id].tier === 'great'; })) html += '<p class="stat">' + _('Great Wonders 👑 cost 50% more here than in a Town of their trade.') + '</p>';
    if (!s.isCity && (tab === 'wonders' || tab === 'national')) html += '<p class="stat">' + (s.specialization ? G.homeName(s.specialization) + ': ' : '') + _('this Town may raise one Great work at a time; its Production builds it instead of turning into Gold.') + '</p>';
    if (!opts[tab].length) html += '<p class="stat">' + _('Nothing available yet. Research new technologies.') + '</p>';
    opts[tab].forEach(function (id) {
      var cost = G.itemCost(g, civ, kind, id, s), buyCost = G.purchaseCost(g, civ, kind, id, s), name, desc;
      if (kind === 'unit') { var d = G.unitType(g, civ, id); name = AU.UNITS[id].icon + ' ' + d.name + (d.unique ? ' ★' : ''); desc = (d.cls === 'civilian' ? (d.desc || _('Founds a new Town.')) : _('Str') + ' ' + d.strength + (d.ranged ? ' · ' + _('Ranged') + ' ' + d.ranged + ' (range ' + d.range + ')' : '') + ' · ' + _('Moves') + ' ' + G.maxMoves(g, civ.idx, id)) + (d.resource ? ' · needs ' + AU.RESOURCES[d.resource].name : ''); }
      else if (kind === 'building') { var b = G.buildingDef(g, civ, id); name = b.name + (b.unique ? ' ★' : ''); desc = yieldsHtml(b.yields, { plus: true }) + (b.waterYields ? ' · ' + _('worked water tiles') + ' ' + yieldList(b.waterYields) : '') + (b.desc ? ' · ' + b.desc : '') + (b.perPop ? ' · +' + b.perPop.science + ' 🔬 per pop' : '') + (b.pct ? ' · +' + (b.pct.production || b.pct.science || b.pct.unitProduction) + '% ' + Object.keys(b.pct)[0] : ''); }
      else if (kind === 'wonder') { var w = AU.WONDERS[id]; name = (w.tier === 'great' ? '👑 ' : '🏛️ ') + w.name; desc = yieldsHtml(w.yields, { plus: true }) + ' · ' + G.abilityDesc(w) + (w.home ? ' · ' + _('Great Wonder') + ': ' + G.homeName(w.home) + ' ' + _('or the capital') : ''); }
      else if (kind === 'national') { var nw = AU.NATIONAL[id]; name = '🏯 ' + nw.name; desc = yieldsHtml(nw.yields, { plus: true }) + ' · ' + G.abilityDesc(nw) + (nw.home ? ' · ' + _('only in a') + ' ' + G.homeName(nw.home) : ''); }
      else { var pr = AU.PROJECTS[id]; name = '🚀 ' + pr.name; desc = pr.desc; }
      var inQ = G.inQueue(s, kind, id);
      var canQ = s.isCity || kind === 'wonder' || kind === 'national', prodHere = y.production || y.townProduction || 0;
      html += '<div class="row"><div class="grow"><b>' + name + '</b><small>' + desc + '</small><small>' + cost + ' ⚙️' + (canQ ? ' (' + turns(cost, s.progress[kind + ':' + id] || 0, prodHere) + ')' : '') + '</small></div>' +
        (canQ ? '<button class="small primary" data-action="enqueue" data-id="' + s.id + '" data-kind="' + kind + '" data-item="' + id + '" ' + (inQ && kind !== 'unit' ? 'disabled' : (!s.isCity && s.queue.length ? 'disabled' : '')) + '>' + (inQ && kind !== 'unit' ? _('Queued') : s.queue.length ? (s.isCity ? _('Add to queue') : _('Busy')) : _('Build')) + '</button>' : '') +
        (kind !== 'wonder' && kind !== 'project' && kind !== 'national' ? '<button class="small" data-action="buy" data-id="' + s.id + '" data-kind="' + kind + '" data-item="' + id + '" ' + (civ.gold >= buyCost ? '' : 'disabled') + '>' + buyCost + ' 💰</button>' : '') + '</div>';
    });
    html += '</div>';
    // buildings owned
    html += '<div class="section"><h3>' + _('Buildings') + ' (' + s.buildings.length + ')</h3><div class="yields">' + (s.buildings.map(function (b) { var d = G.buildingDef(g, civ, b); return '<span>' + (AU.WONDERS[b] ? (AU.WONDERS[b].tier === 'great' ? '👑 ' : '🏛️ ') : AU.NATIONAL[b] ? '🏯 ' : '') + d.name + '</span>'; }).join(' ') || '<span class="stat">none</span>') + '</div></div>';
    // tiles
    var worked = s.tiles.filter(function (i) { return g.tiles[i].worked && i !== s.tile; }).length;
    var nats = s.tiles.filter(function (i) { return g.tiles[i].natural; }).map(function (i) { return AU.NATURAL_WONDERS[g.tiles[i].natural].name; });
    if (nats.length) html += '<div class="section"><h3>' + _('Natural wonders') + '</h3><p class="stat">' + nats.join(', ') + '</p></div>';
    html += '<div class="section"><h3>' + _('Territory') + '</h3><p class="stat">' + s.tiles.length + ' tiles owned, ' + worked + ' ' + _('worked by citizens. Founded turn') + ' ' + s.founded + '.</p>';
    if (g.v2) { var cb = G.claimBlocker(g, s), cc = G.claimCost(g, s); html += '<p class="stat">🎯 ' + _('Claims') + ': ' + G.claimedCount(g, s) + ' ' + _('tiles claimed') + (s.pendingGrowth > 0 ? ' · <b>' + s.pendingGrowth + ' ' + _('waiting') + '</b>' : '') + ' · ' + _('next claim') + ': ' + (cc ? cc + ' ' + _('Influence') : _('free')) + (cb === 'building' ? ' · <b>' + _('needs a Boundary Marker') + '</b>' : cb === 'influence' ? ' · <b>' + _('not enough Influence') + '</b> (' + Math.floor(p.influence || 0) + ')' : '') + (G.hasRiver(g, s) ? ' · 🏞️ ' + _('river: its tiles are claimed free, growth 20% cheaper until 8 population, -1 Smoke, orders cost 1 on your river tiles') : '') + '</p>'; }
    html += '<div class="yields">' + s.tiles.filter(function (i) { return i !== s.tile; }).map(function (i) { var t = g.tiles[i], imp = G.improvementFor(g, t, civ), ty = G.tileYields(g, t, s, civ); return '<span class="' + (t.worked ? '' : 'stat') + '" data-action="citytile" data-tile="' + i + '" style="cursor:pointer">' + (t.worked ? '👤 ' : '· ') + (t.resource ? AU.RESOURCES[t.resource].icon + ' ' : '') + (t.hills ? _('Hills') + ' ' : '') + AU.TERRAIN[t.terrain].name + (t.feature ? ' ' + AU.FEATURES[t.feature].icon : '') + (imp ? ' ' + (G.uniqueImprovement(g, t, civ, imp) ? G.uniqueImprovement(g, t, civ, imp).icon : AU.IMPROVEMENTS[imp].icon) : '') + ' <small>' + AU.YIELD_KEYS.filter(function (k) { return ty[k]; }).map(function (k) { return ty[k] + { food: '🌾', production: '⚙️', gold: '💰', science: '🔬', culture: '🎭', faith: '🕊️' }[k]; }).join(' ') + '</small></span>'; }).join('') + '</div>';
    html += '<button class="small" data-action="center" data-tile="' + s.tile + '">' + _('Show on map') + '</button> <button class="small primary" data-action="cityview" data-id="' + s.id + '">🏙️ ' + _('View city') + '</button></div>';
    return { title: (s.isCapital ? '★ ' : '') + s.name + ' — ' + (s.isCity ? _('City') : _('Town')), html: html };
  };
  P.itemName = function (g, civ, q) {
    if (q.kind === 'unit') return G.unitType(g, civ, q.id).name;
    if (q.kind === 'building') return G.buildingDef(g, civ, q.id).name;
    if (q.kind === 'wonder') return AU.WONDERS[q.id].name;
    if (q.kind === 'national') return AU.NATIONAL[q.id].name;
    return AU.PROJECTS[q.id].name;
  };

  // ---------- Research ----------
  // ---------- v2: the Mastery Web ----------
  var CAT_NAMES = [_('Sustenance'), _('Shelter'), _('Kinship'), _('Craft'), _('Wayfinding')]; // the five Spark pools, listed so the translation tools find them
  // What a Spark means, in words: the trigger card explains itself, the hint says what the game actually counts
  var N_ = function (s) { return s; }; // marks a string for translation without translating it yet
  var TRIGGER_HINT = {
    improvedTiles: N_('counts worked tiles that carry an improvement; the settlement centre does not count'),
    improvement: N_('counts worked tiles carrying that improvement; the settlement centre does not count'),
    riverTiles: N_('counts worked tiles with a river on them'),
    tiles: N_('counts every tile inside your borders, worked or not'),
    feature: N_('counts every tile inside your borders, worked or not'),
    pop: N_('your biggest settlement counts'),
    totalPop: N_('all settlements added together'),
    coastal: N_('a settlement whose centre touches the sea or a navigable river'),
    adjacent: N_('a settlement whose centre touches that terrain'),
    met: N_('empires and Free cities you have met, friend or foe'),
    peaceWith: N_('empires you have met and are not at war with'),
    military: N_('fighting units alive right now, ships included'),
    unitsBuilt: N_('units trained or bought since the start, alive or not'),
    kills: N_('enemy units your units destroyed'),
    explored: N_('tiles you have seen at least once'),
    exploredContinent: N_('share of your home continent you have seen'),
    farSettlement: N_('distance in tiles from your capital'),
    gold: N_('Gold in the treasury at the end of a turn'),
    level: N_('unit levels come from experience in combat'),
    wonders: N_('wonders standing in your settlements'),
    resource: N_('the resource must be inside your borders; it need not be worked'),
    resourcekind: N_('different kinds of resource inside your borders'),
    building: N_('settlements that have that building'),
    'event:foodSurplus': N_('total Food of the empire above zero at the end of the turn'),
    'event:cultureSurplus': N_('total Heritage of the empire above zero at the end of the turn'),
    'event:scienceSurplus': N_('total Knowledge of the empire above zero at the end of the turn'),
    'event:content': N_('every settlement at Happiness zero or better'),
    'event:undamaged': N_('no settlement of yours hit by an enemy'),
    'event:peace': N_('not at war with anyone'),
    'event:combat': N_('any fight your units were in, won or lost'),
    'event:caravan': N_('a trade route of yours running'),
    'event:noTrade': N_('no trade route of yours running'),
    'event:natural': N_('a natural wonder you have seen'),
    'event:meetCS': N_('a Free city you have met'),
    'event:kinfolkFriend': N_('a Free city you have met, not at war, with ties of 10 or more'),
    'event:settlementAttacked': N_('one of your settlements was attacked and still stands'),
    'event:roadLink': N_('two settlements with a road next to their centre')
  };
  function triggerHint(n) { var c = n.trigger.cond, k = c[0] === 'event' ? 'event:' + c[1] : c[0]; return TRIGGER_HINT[k] ? _(TRIGGER_HINT[k]) : ''; }
  function unlockNames(n) { var unl = []; if (n.unlocks) { if (n.unlocks.unit) unl.push(AU.UNITS[n.unlocks.unit] ? AU.UNITS[n.unlocks.unit].name : n.unlocks.unit); if (n.unlocks.building) unl.push(AU.BUILDINGS[n.unlocks.building] ? AU.BUILDINGS[n.unlocks.building].name : n.unlocks.building); if (n.unlocks.wonder) unl.push(AU.WONDERS[n.unlocks.wonder] ? AU.WONDERS[n.unlocks.wonder].name : n.unlocks.wonder); if (n.unlocks.national) unl.push(AU.NATIONAL[n.unlocks.national] ? AU.NATIONAL[n.unlocks.national].name : n.unlocks.national); if (n.unlocks.improvement && AU.IMPROVEMENTS && AU.IMPROVEMENTS[n.unlocks.improvement]) unl.push(AU.IMPROVEMENTS[n.unlocks.improvement].name); } return unl; }
  // One Spark card: badge, name, joke, what it gives, what it unlocks, how it lights, progress, Study button
  function sparkCard(g, p, n, opts) {
    var MW = AU.MasteryWeb, st = MW.state(p), status = MW.status(p, n.id), can = status === 'locked_unmet' && MW.canStudy(g, p, n.id), cls = status === 'unlocked' ? 'done' : status === 'locked_permanent' ? 'locked' : (can ? 'active' : ''), badge = status === 'unlocked' ? '✅' : status === 'locked_permanent' ? '🔒' : can ? '📚' : '💡';
    var unl = unlockNames(n), pr = status === 'locked_unmet' ? MW.progress(g, p, n) : null, gives = (n.fx && Object.keys(n.fx).length ? describeFx(n.fx) : '') || '', hint = triggerHint(n);
    var how = status === 'locked_permanent' ? '🔒 ' + _('Locked for good: you chose') + ' ' + (AU.V2.NODE_BY_ID[n.pair] ? AU.V2.NODE_BY_ID[n.pair].name : '')
      : status === 'unlocked' ? '✅ ' + _('Lit on turn') + ' ' + st.unlocked[n.id] + (opts && opts.lit ? ' · ' + n.trigger.desc + (n.pair && AU.V2.NODE_BY_ID[n.pair] ? ' · 🔒 ' + _('its twin is now locked') + ': ' + AU.V2.NODE_BY_ID[n.pair].name : '') : '')
      : '<b>' + _('How') + ':</b> ' + n.trigger.desc + (n.trigger.turns ? ' ⏳' : '') + (hint ? ' <span class="hint">(' + hint + ')</span>' : '');
    var bar = pr && !pr.done ? '<div class="progress spark"><i style="width:' + Math.round(pr.ratio * 100) + '%"></i></div><small class="stat">' + pr.have + '/' + pr.need + (pr.turns ? ' ' + _('turns in a row') : '') + '</small>' : '';
    var study = status === 'locked_unmet' ? '<button class="small ' + (can ? 'primary' : '') + '" data-action="study" data-id="' + n.id + '" ' + (can ? '' : 'disabled') + '>📚 ' + _('Study') + ' ' + MW.studyCost(g, p, n) + '</button>' : '';
    return '<div class="row spark-card ' + cls + (opts && opts.focus === n.id ? ' focus' : '') + '"><span class="hall-medal">' + badge + '</span><div class="grow"><b>' + n.name + (n.pair ? ' <span class="kind-pill wildcard">' + _('paired') + '</span>' : '') + (opts && opts.cat && n.cat ? ' <span class="kind-pill">' + (CAT_ICON[n.cat] || '') + ' ' + _(n.cat) + '</span>' : '') + '</b><small><i>“' + n.joke + '”</i></small>' + (gives ? '<small><b>' + _('Gives') + ':</b> ' + gives + '</small>' : '') + (unl.length ? '<small><b>' + _('Unlocks') + ':</b> ' + unl.join(', ') + '</small>' : '') + (!gives && !unl.length ? '<small><b>' + _('Gives') + ':</b> ' + _('nothing by itself; it counts toward the next age') + '</small>' : '') + '<small>' + how + '</small>' + bar + '</div>' + study + '</div>';
  }
  // The card shown when your Sparks light: what each one does, and a way into the Mastery Web
  P.render_sparks = function (app, g, data) {
    var p = G.player(g), ids = (data && data.ids) || [], html = '';
    html += '<p class="stat">' + _('Your empire did something new, and a Spark lit up by itself. Here is what it gives you.') + '</p>';
    ids.forEach(function (id) {
      if (id.indexOf('lane:') === 0) { var lp = id.split(':'), lr = AU.MasteryWeb.laneReward(+lp[1], lp[2]); html += '<div class="row spark-card lane"><span class="hall-medal">🏅</span><div class="grow"><b>' + _('Lane mastered') + ': ' + (AU.V2.LANES.icon[lp[2]] || '') + ' ' + _(lp[2]) + ' — ' + (lr ? lr.name : '') + '</b>' + (lr ? '<small><i>“' + lr.joke + '”</i></small><small><b>' + _('Gives') + ':</b> ' + describeFx(lr.fx) + ' · ' + _('for the rest of the game') + '</small>' : '') + '<small>' + _('Every foundation Spark of this lane is lit in its age.') + '</small></div></div>'; return; }
      var n = AU.V2.NODE_BY_ID[id]; if (n) html += sparkCard(g, p, n, { lit: true, cat: n.pool === 'foundation' }); });
    var st = AU.MasteryWeb.state(p), era = AU.V2.ERAS[st.era] || AU.V2.ERAS[0];
    html += '<p class="stat">💡 ' + AU.MasteryWeb.foundationCount(p, st.era) + '/' + (era.foundationSize || 32) + ' ' + _('foundation Sparks') + (era.advance ? ' · ' + era.advance + ' ' + _('to reach the next age') : '') + '</p>';
    html += '<div class="tabs"><button class="small primary" data-action="webfocus" data-id="' + (ids.filter(function (i) { return i.indexOf('lane:') !== 0; })[0] || '') + '">💡 ' + _('Open the Mastery Web') + '</button><button class="small" data-action="close">' + _('Back to the map') + '</button></div>';
    var lanesN = ids.filter(function (i) { return i.indexOf('lane:') === 0; }).length, sparksN = ids.length - lanesN;
    return { title: lanesN && !sparksN ? '🏅 ' + _('Lane mastered!') : '💡 ' + (sparksN > 1 ? sparksN + ' ' + _('Sparks lit!') : _('Spark lit!')) + (lanesN ? ' · 🏅' : ''), html: html };
  };
  var CAT_ICON = { Sustenance: '🌾', Shelter: '🏠', Kinship: '🤝', Craft: '🔨', Wayfinding: '🧭' };
  // ---------- Mastery Web board: lanes for the foundation, forks for paired Sparks, doors for Insights ----------
  function laneHeader(g, p, era, cat) {
    var MW = AU.MasteryWeb, c = MW.laneCount(p, era, cat), done = MW.laneMastered(p, era, cat), r = MW.laneReward(era, cat), st = MW.state(p);
    return '<div class="wlane-h">' + (AU.V2.LANES.icon[cat] || '') + ' ' + _(cat) + '<small>' + (done ? '🏅 ' : '') + c.lit + ' / ' + c.total + '</small></div>' +
      (r ? '<div class="wlane-r' + (done ? ' done' : '') + '">' + (done ? '🏅 ' + _('Mastered on turn') + ' ' + st.lanes[era + ':' + cat] + ': ' : '🏅 ' + _('Light all') + ' ' + c.total + ' → ') + '<b>' + r.name + '</b> · ' + describeFx(r.fx) + '</div>' : '');
  }
  function tile(g, p, n, opts) {
    var MW = AU.MasteryWeb, st = MW.state(p), status = MW.status(p, n.id), can = status === 'locked_unmet' && MW.canStudy(g, p, n.id), pr = status === 'locked_unmet' ? MW.progress(g, p, n) : null;
    var cls = status === 'unlocked' ? 'lit' : status === 'locked_permanent' ? 'closed' : can ? 'ready' : (n.trigger.turns ? 'wait' : ''), badge = status === 'unlocked' ? '✓' : status === 'locked_permanent' ? '🔒' : can ? '📚' : n.trigger.turns ? '⏳' : '·';
    var how = status === 'unlocked' ? _('Lit on turn') + ' ' + st.unlocked[n.id] : status === 'locked_permanent' ? _('Closed by') + ' ' + (AU.V2.NODE_BY_ID[n.pair] ? AU.V2.NODE_BY_ID[n.pair].name : '') : n.trigger.desc;
    var bar = pr && !pr.done && pr.need ? '<div class="pb"><i style="width:' + Math.round(pr.ratio * 100) + '%"></i></div><small>' + pr.have + '/' + pr.need + (pr.turns ? ' ' + _('turns in a row') : '') + '</small>' : '';
    return '<button class="wtile ' + cls + (opts && opts.focus === n.id ? ' focus' : '') + '" data-action="webdetail" data-id="' + n.id + '"><span class="st">' + badge + '</span><b>' + n.name + '</b><small>' + how + '</small>' + bar + (can ? '<span class="study">📚 ' + MW.studyCost(g, p, n) + '</span>' : '') + '</button>';
  }
  function half(g, p, n, opts) {
    var MW = AU.MasteryWeb, st = MW.state(p), status = MW.status(p, n.id), can = status === 'locked_unmet' && MW.canStudy(g, p, n.id), pr = status === 'locked_unmet' ? MW.progress(g, p, n) : null;
    var cls = status === 'unlocked' ? 'lit' : status === 'locked_permanent' ? 'closed' : can ? 'ready' : '', twin = AU.V2.NODE_BY_ID[n.pair];
    var foot = status === 'unlocked' ? '<span>✓ ' + _('lit turn') + ' ' + st.unlocked[n.id] + '</span><span>' + _('chosen') + '</span>' : status === 'locked_permanent' ? '<span>🔒 ' + _('closed') + '</span><span>' + _('by') + ' ' + (twin ? twin.name : '') + '</span>' : '<span>' + (pr && pr.need ? pr.have + '/' + pr.need + (pr.turns ? ' ' + _('turns') : '') : '') + '</span><span>' + (can ? '📚 ' + _('Study') + ' ' + MW.studyCost(g, p, n) : (n.trigger.turns ? '⏳' : '')) + '</span>';
    return '<button class="whalf ' + cls + (opts && opts.focus === n.id ? ' focus' : '') + '" data-action="webdetail" data-id="' + n.id + '"><b>' + n.name + '</b><small class="gives">' + (n.fx && Object.keys(n.fx).length ? describeFx(n.fx) : (unlockNames(n).length ? _('Unlocks') + ': ' + unlockNames(n).join(', ') : '')) + '</small><small>' + _('How') + ': ' + n.trigger.desc + '</small><div class="foot">' + foot + '</div></button>';
  }
  var FORK_SVG = function (decided) { var c = decided ? '#3f9a48' : '#a67c4e'; return '<svg viewBox="0 0 48 78" aria-hidden="true"><path d="M4 8 C 24 8, 24 39, 24 39 C 24 39, 24 70, 4 70" fill="none" stroke="' + c + '" stroke-width="3" stroke-linecap="round"/><path d="M44 8 C 24 8, 24 39, 24 39 C 24 39, 24 70, 44 70" fill="none" stroke="' + c + '" stroke-width="3" stroke-linecap="round"/><circle cx="24" cy="39" r="6" fill="' + (decided ? '#3f9a48' : '#f4e7c9') + '" stroke="' + (decided ? '#2c7a35' : '#a67c4e') + '" stroke-width="3"/></svg>'; };
  P.render_web = function (app, g, data) {
    var MW = AU.MasteryWeb, p = G.player(g), st = MW.state(p), era = AU.V2.ERAS[st.era] || AU.V2.ERAS[0], y = G.civYields(g, p), html = '';
    var viewEra = data && data.era !== undefined ? Math.min(st.era, +data.era) : st.era, eraV = AU.V2.ERAS[viewEra] || era;
    var tab = (data && data.tab) || 'foundation', focusId = data && data.focus, focusNode = focusId && AU.V2.NODE_BY_ID[focusId], detailId = (data && data.detail) || focusId, detail = detailId && AU.V2.NODE_BY_ID[detailId];
    if (focusNode) { tab = focusNode.pool === 'foundation' ? 'foundation' : 'branched'; if (focusNode.era <= st.era) { viewEra = focusNode.era; eraV = AU.V2.ERAS[viewEra] || era; } }
    var nodes = MW.nodesOfEra(viewEra), found = MW.foundationCount(p, viewEra), size = eraV.foundationSize || 32, need = eraV.advance || 20;
    // the age ribbon
    html += '<div class="wages">'; AU.V2.ERAS.forEach(function (e, i) { var lit = i <= st.era ? MW.foundationCount(p, i) : 0, cls = i < st.era ? 'done' : i === st.era ? 'now' : 'next'; html += '<button class="wage ' + cls + (i === viewEra ? ' view' : '') + '" ' + (i <= st.era ? 'data-action="webera" data-era="' + i + '" data-tab="' + tab + '"' : 'disabled') + '><b>' + e.name + '</b><span>' + (i < st.era ? lit + ' ' + _('lit') : i === st.era ? lit + ' / ' + (e.foundationSize || 32) + ' ' + _('lit') : (e.advance ? _('opens at') + ' ' + e.advance + ' ' + _('lit') : _('later'))) + '</span></button>'; }); html += '</div>';
    // the summary: ring, the sentence that matters, the closest Sparks, Knowledge
    var closest = nodes.filter(function (n) { return n.pool === 'foundation' && MW.status(p, n.id) === 'locked_unmet'; }).map(function (n) { return { n: n, pr: MW.progress(g, p, n) }; }).filter(function (x) { return x.pr && x.pr.ratio > 0 && x.pr.ratio < 1; }).sort(function (a, b) { return b.pr.ratio - a.pr.ratio; }).slice(0, 3);
    var studyable = nodes.filter(function (n) { return MW.status(p, n.id) === 'locked_unmet' && MW.canStudy(g, p, n.id); }).length;
    var headline = viewEra < st.era ? _('An age you have left. Its Sparks still light and still count for lanes.') : !eraV.advance ? _('The last age. Every Spark is a bonus now.') : found >= need ? (st.pendingHubs.length ? _('The Turning Point waits for your decision.') : _('Enough Sparks for the next age: it opens once this age has run its course.')) : (need - found) + ' ' + _('more foundation Sparks to reach the next age');
    html += '<div class="wsummary"><div class="wring" style="--p:' + Math.round(found / size * 100) + '"><div>' + found + '<small>' + _('of') + ' ' + size + ' ' + _('lit') + '</small></div></div><div><h2>' + headline + '</h2><p>' + (closest.length ? _('Closest') + ': ' + closest.map(function (x) { return '<a href="#" data-action="webdetail" data-id="' + x.n.id + '"><b>' + x.n.name + '</b></a> (' + x.pr.have + '/' + x.pr.need + (x.pr.turns ? ' ' + _('turns') : '') + ')'; }).join(', ') + '. ' : '') + (studyable ? studyable + ' ' + _('Sparks can be studied right now.') : '') + '</p><div class="wlegend"><span class="l-lit">' + _('lit') + '</span><span class="l-ready">' + _('ready to study') + '</span><span class="l-wait">' + _('turns in a row') + '</span><span>' + _('not lit yet') + '</span><span class="l-lock">' + _('closed by its twin') + '</span></div></div><div class="wknow">' + _('Knowledge to study') + '<b>' + Math.floor(st.study) + ' 📚</b>+' + y.science.toFixed(1) + ' ' + _('a turn') + '</div></div>';
    html += '<p class="stat">' + _('There is nothing to research. Every Spark lights up by itself when your empire does what its card says. Light') + ' ' + need + ' ' + _('of the') + ' ' + size + ' ' + _('foundation Sparks to reach the next age. Cannot wait for one? Study it with Knowledge 📚.') + ' ' + _('Light every Spark of a lane in its age and the lane is mastered: a permanent reward.') + '</p>';
    if (st.pendingHubs.length) html += '<button class="big primary" data-action="hub">🔮 ' + _('A decision awaits') + '</button><br><br>';
    var pairs = 0, seenP = {}; nodes.forEach(function (n) { if (n.pool === 'branched' && n.pair && !seenP[n.id]) { seenP[n.id] = seenP[n.pair] = true; pairs++; } });
    html += '<div class="tabs wtabs"><button class="small ' + (tab === 'foundation' ? 'on' : '') + '" data-action="webtab" data-tab="foundation" data-era="' + viewEra + '">🧱 ' + _('Foundation') + '<small>' + size + ' ' + _('Sparks · count toward the next age') + '</small></button><button class="small ' + (tab === 'branched' ? 'on' : '') + '" data-action="webtab" data-tab="branched" data-era="' + viewEra + '">🌿 ' + _('Branches') + '<small>' + pairs + ' ' + _('forks') + ' + ' + nodes.filter(function (n) { return n.pool === 'branched' && !n.pair; }).length + ' ' + _('free Sparks · bonuses only') + '</small></button><button class="small ' + (tab === 'traits' ? 'on' : '') + '" data-action="webtab" data-tab="traits">🔮 ' + _('Insights') + '<small>' + _('decisions · permanent traits') + '</small></button></div>';
    // the detail drawer: one Spark in full
    if (detail) html += '<div class="wdrawer"><button class="x" data-action="webdetail" data-id="" aria-label="' + _('Close') + '">×</button>' + sparkCard(g, p, detail, { focus: null, cat: true }) + '</div>';
    if (tab === 'foundation') {
      html += '<p class="lead">' + _('Five lanes, one per way of life. Each tile says what lights it and how far you are. Tap a tile for the full card.') + '</p><div class="wlanes">';
      AU.V2.LANES.order.forEach(function (cat) { var list = nodes.filter(function (n) { return n.pool === 'foundation' && n.cat === cat; }); if (!list.length) return; html += '<div class="wlane" data-c="' + cat + '">' + laneHeader(g, p, viewEra, cat) + '<div class="wlane-b">' + list.map(function (n) { return tile(g, p, n, { focus: focusId }); }).join('') + '</div></div>'; });
      html += '</div>';
    } else if (tab === 'branched') {
      html += '<p class="lead">' + _('A fork is a choice you make by playing: whichever twin lights first stays, the other one closes for good. Free Sparks have no twin and no lock.') + '</p>';
      var seen = {}, decided = 0, forks = '';
      nodes.forEach(function (n) { if (n.pool !== 'branched' || !n.pair || seen[n.id]) return; seen[n.id] = seen[n.pair] = true; var twin = AU.V2.NODE_BY_ID[n.pair]; if (!twin) return; var d = !!(st.unlocked[n.id] || st.unlocked[n.pair]); if (d) decided++; forks += '<div class="wfork' + (d ? ' decided' : '') + '">' + half(g, p, n, { focus: focusId }) + '<div class="mid">' + FORK_SVG(d) + '<span class="or">' + (d ? _('DONE') : _('OR')) + '</span></div>' + half(g, p, twin, { focus: focusId }) + '</div>'; });
      html += '<div class="wsec"><h3>⑂ ' + _('Forks') + '</h3><div class="rule"></div><small>' + decided + ' ' + _('of') + ' ' + pairs + ' ' + _('decided') + '</small></div><div class="wforks">' + forks + '</div>';
      html += '<div class="wsec"><h3>✦ ' + _('Free Sparks') + '</h3><div class="rule"></div><small>' + _('no twin, no lock') + '</small></div><div class="wfree">' + nodes.filter(function (n) { return n.pool === 'branched' && !n.pair; }).map(function (n) { return tile(g, p, n, { focus: focusId }); }).join('') + '</div>';
    } else {
      html += '<p class="lead">' + _('An Insight is a one-time decision that becomes a permanent trait. Once per age, Heritage pays for a Reform: take one back and walk through the other door.') + '</p>';
      var rc = MW.reformCost(g, p), left = MW.reformsLeft(g, p);
      html += '<p class="stat">🎭 ' + Math.floor(st.heritage || 0) + ' ' + _('Heritage') + ' (+' + y.culture.toFixed(1) + ') · ' + _('Reform') + ': ' + (left <= 0 ? _('already used this age') : rc + ' ' + _('Heritage, once per age: take back one Insight and choose its other branch') + (MW.reformsPerAge(g, p) > 1 ? ' (' + left + ' ' + _('left this age') + ')' : '')) + '</p>';
      var any = false, doors = '';
      AU.V2.HUBS.forEach(function (h) { var b = st.traits[h.id], pend = st.pendingHubs.indexOf(h.id) >= 0; if (!b && !pend) return; any = true; var canR = b && MW.canReform(g, p, h.id);
        doors += '<div class="whub"><h4>🔮 ' + h.name + '</h4><div class="opts">' + h.branches.map(function (x) { var chosen = x.id === b; return '<div class="wdoor' + (chosen ? ' chosen' : b ? ' other' : '') + '"><b>' + (chosen ? '✓ ' : '') + x.name + '</b>' + describeFx(x.fx) + (x.greatPerson ? ' · ' + _('a Great Person joins you') : '') + (canR && !chosen ? '<br><button class="small" data-action="reform" data-hub="' + h.id + '" data-branch="' + x.id + '">🎭 ' + _('Reform to') + ' ' + x.name + ' (' + rc + ')</button>' : '') + '</div>'; }).join('') + '</div><div class="foot">' + (pend ? '<span>' + _('Waiting for you.') + '</span><button class="small primary" data-action="hub">🔮 ' + _('Decide now') + '</button>' : '<span>' + _('Decided.') + (canR ? ' ' + _('A Reform is open this age.') : '') + '</span>') + '</div></div>'; });
      if (!any) doors = '<p class="stat">' + _('No Insight decided yet. Insights arrive when your empire does something for the first time.') + '</p>';
      html += '<div class="wdoors">' + doors + '</div>';
    }
    return { title: '💡 ' + _('Mastery Web'), html: html };
  };
  var FX_LABEL = { commandBonus: function (v) { return '+' + v + ' ' + _('Command'); }, smokeSink: function (v) { return '-' + v + ' ' + _('Smoke in every settlement'); }, forestSinkMult: function (v) { return _('woods you own soak up') + ' ×' + v + ' ' + _('Smoke'); }, smokeGold: function (v) { return '+' + v + ' ' + _('Gold per Smoke'); }, scarecrowLevel: function (v) { return _('Scarecrow Crew bait') + ' +' + v + ' ' + _('level'); }, navalBonus: function (v) { return _('naval units') + ' +' + v + ' ' + _('Strength'); }, cavalryBonus: function (v) { return _('cavalry') + ' +' + v + ' ' + _('Strength'); }, landBonus: function (v) { return _('land units') + ' +' + v + ' ' + _('Strength'); }, defenseBonus: function (v) { return '+' + v + ' ' + _('Strength when defending'); }, healBonusAll: function (v) { return _('units heal') + ' +' + v; }, navalMoves: function (v) { return _('naval units') + ' +' + v + ' ' + _('Movement'); }, luxuryHappinessBonus: function (v) { return '+' + v + ' ' + _('Happiness per luxury'); }, luxuryGold: function (v) { return '+' + v + ' ' + _('Gold per luxury'); }, civicCostMult: function (v) { return _('studying Sparks') + ' ' + Math.round((1 - v) * 100) + '% ' + _('cheaper'); }, techCostMult: function (v) { return _('studying Sparks') + ' ' + Math.round((1 - v) * 100) + '% ' + _('cheaper'); }, synthCostMult: function (v) { return _('Synthesis') + ' ' + Math.round((1 - v) * 100) + '% ' + _('cheaper'); }, warbandMoves: function (v) { return _('fighters in a Warband move') + ' +' + v; }, seaOrders: function () { return _('orders to ships and embarked units cost 1 Command'); }, navalRaidBonus: function (v) { return _('ships striking the shore') + ' +' + v + ' ' + _('Strength'); }, navalVsSettlements: function (v) { return _('ships') + ' +' + v + ' ' + _('Strength against settlements'); }, abroadFreeClaims: function (v) { return '+' + v + ' ' + _('free claims in settlements on another continent'); }, coastalFoundPop: function (v) { return _('coastal settlements founded with') + ' +' + v + ' ' + _('population'); }, coastalFoundWater: function (v) { return _('coastal settlements start with') + ' ' + v + ' ' + _('coast tiles claimed'); }, unitPurchaseMult: function (v) { return _('units bought with Gold cost') + ' ' + Math.round((1 - v) * 100) + '% ' + _('less'); }, commanderMult: function (v) { return _('Bandleaders add') + ' +' + Math.round(v * 100) + '%'; }, warbandHeal: function (v) { return _('fighters in a Warband heal') + ' +' + v; }, synthSupplyBonus: function (v) { return _('each Synthesis grants') + ' +' + v + ' ' + _('more supply'); }, freeClaims: function (v) { return '+' + v + ' ' + _('free claims per settlement'); }, claimCostMult: function (v) { return _('claims cost') + ' ' + Math.round((1 - v) * 100) + '% ' + _('less Influence'); }, riverClaimInfluence: function (v) { return '+' + v + ' ' + _('Influence per river tile claimed'); }, roadOrders: function () { return _('orders to units on your roads cost 1 Command'); }, farOrderDiscount: function (v) { return _('far units cost') + ' ' + v + ' ' + _('less Command'); }, warbandSize: function (v) { return _('Warbands hold') + ' ' + (3 + v) + ' ' + _('fighters'); }, warbandWeights: function (v) { return _('Warband strikes at') + ' ' + v.map(function (x) { return Math.round(x * 100); }).join('/') + '%'; }, climateImmune: function () { return _('your tiles never shift with the climate'); }, smokeSourceMult: function (v) { return _('buildings make') + ' ' + Math.round((1 - v) * 100) + '% ' + _('less Smoke'); }, reformsPerAge: function (v) { return '+' + v + ' ' + _('Reform per age'); }, insightInfluence: function (v) { return '+' + v + ' ' + _('Influence per Insight decided'); }, studyRefund: function (v) { return _('studying a foundation Spark refunds') + ' ' + Math.round(v * 100) + '%'; }, bondUpkeepMult: function (v) { return _('Bonds cost') + ' ' + Math.round((1 - v) * 100) + '% ' + _('less upkeep'); }, noUnrest: function () { return _('captured settlements suffer no unrest'); }, unrestMult: function (v) { return _('unrest in captured settlements') + ' ' + Math.round((1 - v) * 100) + '% ' + _('shorter'); }, sciencePerStrategic: function (v) { return '+' + v + ' ' + _('Knowledge in the capital per kind of strategic resource'); }, cityGrowthMult: function (v) { return _('City growth') + ' +' + Math.round((v - 1) * 100) + '%'; }, goldPerKill: function (v) { return '+' + v + ' ' + _('Gold per kill'); }, tourismMult: function (v) { return '+' + Math.round((v - 1) * 100) + '% ' + _('Fame'); }, pctUnitProduction: function (v) { return '+' + v + '% ' + _('Production toward units'); }, goldPerWonder: function (v) { return '+' + v + ' ' + _('Gold per wonder'); }, purchaseMult: function (v) { return _('purchases') + ' ' + Math.round((1 - v) * 100) + '% ' + _('cheaper'); }, wonderCostMult: function (v) { return _('wonders') + ' ' + Math.round((1 - v) * 100) + '% ' + _('cheaper'); }, yieldPerPop: function (v) { var o = []; for (var k in v) o.push('+' + v[k] + ' ' + yieldName(k) + ' ' + _('per citizen')); return o.join(', '); }, hubsEnabled: function () { return _('Insights may fire'); }, diplomacyBasic: function () { return _('opens diplomacy'); }, kinfolkBasic: function () { return _('opens dealings with free cities'); }, revealContinent: function () { return _('reveals your continent'); }, era2: function () { return _('a head start on riders next age'); }, combatBonus: function (v) { return _('units') + ' +' + v + ' ' + _('Strength'); }, meleeBonus: function (v) { return _('melee units') + ' +' + v + ' ' + _('Strength'); }, homeDefenseBonus: function (v) { return '+' + v + ' ' + _('Strength defending at home'); }, cityDefense: function (v) { return _('settlements') + ' +' + v + ' ' + _('defense'); }, hillsDefense: function (v) { return '+' + v + ' ' + _('defense on Hills'); },
    happinessBonus: function (v) { return '+' + v + ' ' + _('Happiness everywhere'); }, growthMult: function (v) { return _('growth') + ' +' + Math.round((v - 1) * 100) + '%'; }, unitCostMult: function (v) { return _('units cost') + ' ' + Math.round((1 - v) * 100) + '% ' + _('less'); }, buildingCostMult: function (v) { return _('buildings cost') + ' ' + Math.round((1 - v) * 100) + '% ' + _('less'); }, settlerCostMult: function (v) { return _('Pioneers cost') + ' ' + Math.round((1 - v) * 100) + '% ' + _('less'); },
    goldPerSettlement: function (v) { return '+' + v + ' ' + _('Gold per settlement'); }, sciencePerSettlement: function (v) { return '+' + v + ' ' + _('Knowledge per settlement'); }, culturePerSettlement: function (v) { return '+' + v + ' ' + _('Heritage per settlement'); }, faithPerSettlement: function (v) { return '+' + v + ' ' + _('Devotion per settlement'); }, culturePerKill: function (v) { return '+' + v + ' ' + _('Heritage per kill'); },
    attitudeBonus: function (v) { return _('other leaders start friendlier') + ' (+' + v + ')'; }, warWearinessMult: function (v) { return _('war weariness') + ' ' + Math.round((1 - v) * 100) + '% ' + _('less'); }, xpMult: function (v) { return _('experience') + ' +' + Math.round((v - 1) * 100) + '%'; }, unitsStartXp: function (v) { return _('new units start with') + ' ' + v + ' XP'; }, freeUpkeep: function (v) { return v + ' ' + _('more units free of upkeep'); },
    reconSight: function (v) { return _('scouts see') + ' +' + v; }, reconMoves: function (v) { return _('scouts move') + ' +' + v; }, homeMoves: function (v) { return '+' + v + ' ' + _('Movement inside your borders'); }, roadMoves: function (v) { return _('faster on roads'); }, housingBonus: function (v) { return '+' + v + ' ' + _('Housing') + ' (' + _('growth') + ' +' + (v * 5) + '%)'; }, unitStrengthFromBarracks: function (v) { return _('units from Barracks') + ' +' + v; },
    greatSlot: function (v) { return _('Great Person slot') + ': ' + v; }, influencePerTurn: function (v) { return '+' + v + ' ' + _('Influence per turn'); }, influenceOnce: function (v) { return '+' + v + ' ' + _('Influence'); }, settlementSight: function (v) { return _('settlements see') + ' +' + v; }, distantProduction: function (v) { return _('distant settlements') + ' +' + v + ' ' + _('Production'); }, caravanRange: function (v) { return _('trade routes pay as if') + ' ' + v + ' ' + _('tiles longer'); }, laneMasteryKnowledge: function (v) { return '+' + v + ' ' + _('Knowledge per lane mastered'); }, laneMasteryHeritage: function (v) { return '+' + v + ' ' + _('Heritage per lane mastered'); }, laneMasteryGold: function (v) { return '+' + v + ' ' + _('Gold per lane mastered'); }, laneMasteryInfluence: function (v) { return '+' + v + ' ' + _('Influence per lane mastered'); }, laneMasterySpark: function () { return _('a mastered lane lights one more Spark'); }, laneMasteryYield: function (v) { return _('capital') + ' ' + yieldList(v) + ' ' + _('per lane mastered'); }, laneMasteryStudyMult: function (v) { return _('studying') + ' ' + Math.round((1 - v) * 100) + '% ' + _('cheaper per lane mastered'); },
    diplomacyBasic: function () { return _('diplomacy'); }, kinfolkBasic: function () { return _('Free city dealings'); }, hubsEnabled: function () { return _('Insights begin'); }, revealContinent: function () { return _('your continent is mapped'); }, era2: function () { return _('prepares a later Spark'); } };
  function describeFx(fx) {
    var out = []; for (var k in fx) { var v = fx[k];
      if (FX_LABEL[k]) out.push(FX_LABEL[k](v));
      else if (k === 'yieldMult') for (var y in v) out.push('+' + Math.round((v[y] - 1) * 100) + '% ' + yieldName(y));
      else if (k === 'capitalYields' || k === 'citySiteYields' || k === 'coastalSettlementYields' || k === 'townYields') out.push((k === 'capitalYields' ? _('capital') : k === 'coastalSettlementYields' ? _('coastal settlements') : k === 'townYields' ? _('Towns') : _('Cities')) + ' ' + yieldList(v));
      else if (k === 'capitalMult') { var m = []; for (var ym in v) m.push('+' + Math.round((v[ym] - 1) * 100) + '% ' + yieldName(ym)); out.push(_('capital') + ' ' + m.join(', ')); }
      else if (k === 'tileBonus' || k === 'settlementSiteBonus') v.forEach(function (tb) { out.push(tb.when + ' ' + _('tiles') + ' ' + yieldList(tb.yields)); });
      else if (k === 'yieldPerPop') for (var yp in v) out.push('+' + v[yp] + ' ' + yieldName(yp) + ' ' + _('per citizen'));
      else out.push(k + (v === true ? '' : ' ' + JSON.stringify(v))); }
    return out.join(' · ');
  }
  AU.MasteryWeb.describeFx = function (fx) { return describeFx(fx); };
  AU.MasteryWeb.describeNode = function (node) { var parts = []; if (node.fx && Object.keys(node.fx).length) parts.push(_('gives') + ' ' + describeFx(node.fx)); var unl = []; if (node.unlocks) { if (node.unlocks.unit) unl.push(AU.UNITS[node.unlocks.unit] ? AU.UNITS[node.unlocks.unit].name : node.unlocks.unit); if (node.unlocks.building) unl.push(AU.BUILDINGS[node.unlocks.building] ? AU.BUILDINGS[node.unlocks.building].name : node.unlocks.building); if (node.unlocks.wonder) unl.push(AU.WONDERS[node.unlocks.wonder] ? AU.WONDERS[node.unlocks.wonder].name : node.unlocks.wonder); if (node.unlocks.national) unl.push(AU.NATIONAL[node.unlocks.national] ? AU.NATIONAL[node.unlocks.national].name : node.unlocks.national); if (node.unlocks.improvement && AU.IMPROVEMENTS && AU.IMPROVEMENTS[node.unlocks.improvement]) unl.push(AU.IMPROVEMENTS[node.unlocks.improvement].name); } if (unl.length) parts.push(_('unlocks') + ' ' + unl.join(', ')); return parts.join(' · '); };
  function yieldName(y) { return { food: _('Food'), production: _('Production'), gold: _('Gold'), science: _('Knowledge'), culture: _('Heritage'), faith: _('Devotion'), happiness: _('Happiness') }[y] || y; }
  function yieldList(o) { var a = []; for (var k in o) a.push('+' + o[k] + ' ' + yieldName(k)); return a.join(', '); }
  P.render_hub = function (app, g) {
    var MW = AU.MasteryWeb, p = G.player(g), st = MW.state(p), id = st.pendingHubs[0], html = '';
    if (!id) return { title: '🔮 ' + _('Insight'), html: '<p>' + _('Nothing to decide right now.') + '</p>' };
    var hub = AU.V2.HUB_BY_ID[id];
    html += '<div class="quote-box" style="max-width:none;box-shadow:none"><div class="quote-kicker">' + _('Insight') + '</div><h2>' + hub.name + '</h2><p>' + _('Choose once. This shapes your empire for the rest of the game.') + '</p></div><br>';
    hub.branches.forEach(function (b) { html += '<div class="row clickable" data-action="hubpick" data-hub="' + id + '" data-branch="' + b.id + '"><span class="hall-medal">▶</span><div class="grow"><b>' + b.name + '</b><small>' + describeFx(b.fx) + (b.greatPerson ? ' · ' + _('a Great Person joins you') : '') + '</small></div></div>'; });
    if (st.pendingHubs.length > 1) html += '<p class="stat">' + (st.pendingHubs.length - 1) + ' ' + _('more decisions waiting') + '</p>';
    return { title: '🔮 ' + _('Insight'), html: html };
  };
  P.render_tech = function (app, g) {
    if (g.v2) return P.render_web(app, g, app.panelData);
    var p = G.player(g), y = G.civYields(g, p), html = '';
    var avail = G.availableTechs(p);
    var nMast = Object.keys(p.mastery || {}).filter(function (k) { return k.indexOf('c:') !== 0; }).length;
    html += '<p class="stat">' + y.science.toFixed(1) + ' 🔬 ' + _('per turn') + ' · ' + Object.keys(p.techs).length + '/' + AU.TECHS.length + ' technologies · ⭐ ' + nMast + ' ' + _('masteries. One continuous tree: nothing resets between eras.') + '</p><p class="stat">💡 <b>' + _('Spark') + '</b>: an in-game condition for each technology. ⭐ <b>' + _('Mastery') + '</b>: ' + _('finish a technology after its Spark fired and you keep its permanent bonus. Finish it without the Spark and the mastery is lost. (Some leaders, like Meiji, also gain Knowledge from Sparks.)') + '</p>';
    html += '<button class="big gold" data-action="tree" data-kind="tech">🌳 ' + _('View the full technology tree') + '</button><br><br>';
    html += '<div class="section"><h3>' + _('Available') + '</h3>';
    avail.forEach(function (t) {
      var cost = G.techCost(g, p, t), prog = p.techProgress[t.id] || 0, cur = p.currentTech === t.id;
      var boosted = p.boosts && p.boosts[t.id];
      html += '<div class="row clickable ' + (cur ? 'active' : '') + '" data-action="research" data-id="' + t.id + '">' + (AU.Assets.get('techs', t.id) ? '<img class="techpic" src="' + AU.Assets.url('techs', t.id) + '" alt="">' : '') + '<div class="grow"><b>' + t.name + ' <span class="pill">' + AU.ERAS[t.era] + '</span>' + (boosted ? ' <span class="pill" style="background:#2a4a1e;color:#b6f0c4">' + _('Spark') + ' ✓</span>' : '') + '</b><small>' + (unlocksOfTech(t.id).join(', ') || _('Leads to further technologies')) + '</small>' + (t.eureka ? '<small>💡 ' + _('Spark') + ': ' + t.eureka.desc + (boosted ? ' ✓' : '') + '</small>' : '') + masteryLine(p, t.id, false) + '<small>' + Math.floor(prog) + '/' + cost + ' · ' + turns(cost, prog, y.science) + '</small>' + (cur ? '<div class="progress"><i style="width:' + (prog / cost * 100) + '%"></i></div>' : '') + '</div>' + (cur ? '<span class="pill">researching</span>' : '') + '</div>';
    });
    html += '</div>';
    AU.ERAS.forEach(function (era, ei) {
      var list = AU.TECHS.filter(function (t) { return t.era === ei && avail.indexOf(t) < 0; });
      if (!list.length) return;
      html += '<div class="section"><h3>' + era + ' ' + _('Era') + '</h3>';
      list.forEach(function (t) {
        var done = !!p.techs[t.id];
        html += '<div class="row ' + (done ? 'done' : 'locked') + '"><div class="grow"><b>' + t.name + (p.boosts && p.boosts[t.id] && !done ? ' 💡' : '') + '</b><small>' + (unlocksOfTech(t.id).join(', ') || '—') + '</small>' + (!done && t.pre.length ? '<small>' + _('Requires') + ': ' + t.pre.map(function (x) { return AU.TECH_BY_ID[x].name; }).join(', ') + '</small>' : '') + (!done && t.eureka ? '<small>💡 ' + t.eureka.desc + '</small>' : '') + masteryLine(p, t.id, false) + '</div>' + (done ? '<span class="pill">✓</span>' : '<span class="pill">' + G.techCost(g, p, t) + '</span>') + '</div>';
      });
      html += '</div>';
    });
    return { title: _('Research'), html: html };
  };
  var SLOT_TYPES = ['military', 'economic', 'diplomatic', 'wildcard'], SLOT_ICON = { military: '⚔️', economic: '💰', diplomatic: '🤝', wildcard: '🃏' };
  // Which card sits in which slot: a card takes a slot of its own type first, else a wildcard slot (same rule as G.setPolicies).
  function slotLayout(p) {
    var slots = G.policySlots(p), out = [];
    SLOT_TYPES.forEach(function (t) { for (var i = 0; i < (slots[t] || 0); i++) out.push({ type: t, card: null }); });
    (p.policies || []).forEach(function (id) { var pc = AU.POLICIES[id]; if (!pc) return; var free = out.filter(function (x) { return !x.card && x.type === pc.type; })[0] || out.filter(function (x) { return !x.card && x.type === 'wildcard'; })[0]; if (free) free.card = id; });
    return out;
  }
  P.render_civics = function (app, g, data) {
    if (g.v2) return P.render_web(app, g, { tab: 'traits' });
    var p = G.player(g), y = G.civYields(g, p), html = '', tab = (data && data.tab) || 'civics';
    var avail = G.availableCivics(p);
    html += '<div class="tabs"><button class="small ' + (tab === 'civics' ? 'on' : '') + '" data-action="civtab" data-tab="civics">🎭 ' + _('Civics') + '</button><button class="small ' + (tab === 'policies' ? 'on' : '') + '" data-action="civtab" data-tab="policies">🏛️ ' + _('Government') + ' &amp; policies</button></div>';
    if (tab === 'policies') {
      // ----- government -----
      var govs = G.availableGovernments(p), cur = AU.GOVERNMENTS[p.government];
      function slotChips(gv) { return SLOT_TYPES.filter(function (k) { return gv.slots[k]; }).map(function (k) { return '<span class="chip ' + k + '">' + gv.slots[k] + ' ' + SLOT_ICON[k] + ' ' + k + '</span>'; }).join(' '); }
      html += '<div class="section"><h3>' + _('Your government') + '</h3><div class="row active"><div class="grow"><b>' + cur.name + '</b><small>' + cur.desc + '</small><small>' + slotChips(cur) + '</small></div></div>';
      var alts = govs.filter(function (id) { return id !== p.government; });
      if (alts.length) { html += '<p class="stat">' + _('You can switch to') + ':</p>'; alts.forEach(function (id) { var gv = AU.GOVERNMENTS[id]; html += '<div class="row"><div class="grow"><b>' + gv.name + '</b><small>' + gv.desc + '</small><small>' + slotChips(gv) + '</small></div><button class="small primary" data-action="government" data-id="' + id + '">' + _('Adopt') + '</button></div>'; }); }
      var locked = Object.keys(AU.GOVERNMENTS).filter(function (id) { return govs.indexOf(id) < 0; });
      if (locked.length) { html += '<details class="rules"><summary>' + _('Future governments') + ' (' + locked.length + ')</summary>'; locked.forEach(function (id) { var gv = AU.GOVERNMENTS[id]; html += '<div class="row locked"><div class="grow"><b>' + gv.name + '</b><small>' + gv.desc + '</small><small>' + slotChips(gv) + ' · needs the civic ' + AU.CIVIC_BY_ID[gv.civic].name + '</small></div></div>'; }); html += '</details>'; }
      html += '</div>';
      // ----- slots -----
      var layout = slotLayout(p), free = G.freeSlots(p), availCards = G.availablePolicies(p), active = p.policies || [], empty = layout.filter(function (x) { return !x.card; }).length;
      var others = availCards.filter(function (id) { return active.indexOf(id) < 0; }), fitting = others.filter(function (id) { var t = AU.POLICIES[id].type; return free[t] > 0 || free.wildcard > 0; });
      html += '<div class="section"><h3>' + _('Policy slots') + '</h3><p class="stat">' + _('Your government gives you slots; each holds one card. A card fits a slot of its own colour, and a wildcard slot takes any card. Tap a slotted card to take it out, tap a card below to slot it. You can change cards whenever you like, for free.') + '</p>';
      if (!layout.length) html += '<p class="stat">' + _('No slots yet.') + '</p>';
      html += '<div class="slots">';
      layout.forEach(function (sl, i) {
        var pc = sl.card ? AU.POLICIES[sl.card] : null;
        html += '<div class="slot ' + sl.type + (pc ? ' filled clickable' : '') + '"' + (pc ? ' data-action="policyremove" data-id="' + sl.card + '"' : '') + '><div class="stype">' + SLOT_ICON[sl.type] + ' ' + sl.type + ' slot</div>' + (pc ? '<b>' + pc.name + '</b><small>' + pc.desc + '</small><span class="slot-x">✕</span>' : '<small class="empty">' + _('Empty: pick a card below') + '</small>') + '</div>';
      });
      html += '</div>';
      if (empty && fitting.length) html += '<button class="small gold" data-action="policyauto">✨ ' + _('Fill the') + ' ' + empty + ' empty slot' + (empty > 1 ? 's' : '') + ' for me</button>';
      else if (empty && !fitting.length && others.length) html += '<p class="stat">' + _('The remaining cards do not fit your empty slots (wrong colour). Another government or a new civic will help.') + '</p>';
      html += '</div>';
      // ----- cards -----
      html += '<div class="section"><h3>' + _('Your cards') + ' (' + availCards.length + ')</h3>';
      if (!availCards.length) html += '<p class="stat">' + _('Civics give you policy cards. Adopt') + ' <b>' + _('First Laws') + '</b> ' + _('to get the first ones.') + '</p>';
      SLOT_TYPES.forEach(function (t) {
        var list = availCards.filter(function (id) { return AU.POLICIES[id].type === t; }); if (!list.length) return;
        html += '<h4 class="cards-h ' + t + '">' + SLOT_ICON[t] + ' ' + t.charAt(0).toUpperCase() + t.slice(1) + ' cards</h4>';
        list.forEach(function (id) {
          var pc = AU.POLICIES[id], on = active.indexOf(id) >= 0, fits = free[t] > 0 || free.wildcard > 0;
          html += '<div class="row card-row ' + t + (on ? ' active' : fits ? '' : ' locked') + '"><div class="grow"><b>' + pc.name + '</b><small>' + pc.desc + '</small></div>' + (on ? '<button class="small" data-action="policyremove" data-id="' + id + '">' + _('Slotted') + ' ✓</button>' : '<button class="small primary" data-action="policyadd" data-id="' + id + '" ' + (fits ? '' : 'disabled title="' + _('No free slot of this colour') + '"') + '>' + (fits ? _('Slot') : _('No slot')) + '</button>') + '</div>';
        });
      });
      html += '</div>';
      return { title: _('Government & Policies'), html: html };
    }
    var nMastC = Object.keys(p.mastery || {}).filter(function (k) { return k.indexOf('c:') === 0; }).length;
    html += '<p class="stat">' + y.culture.toFixed(1) + ' 🎭 ' + _('per turn') + ' · ' + Object.keys(p.civics).length + '/' + AU.CIVICS.length + ' civics · ⭐ ' + nMastC + ' masteries.</p><p class="stat">💡 <b>' + _('Insight') + '</b>: an in-game condition for each civic. ⭐ <b>' + _('Mastery') + '</b>: ' + _('finish a civic after its Insight fired and you keep its permanent bonus. (Some leaders, like Pericles, also gain Heritage from Insights.)') + '</p>';
    html += '<button class="big gold" data-action="tree" data-kind="civic">🌳 ' + _('View the full civics tree') + '</button><br><br>';
    html += '<div class="section"><h3>' + _('Available civics') + '</h3>';
    avail.forEach(function (c) {
      var cost = G.civicCost(g, p, c), prog = p.civicProgress[c.id] || 0, cur = p.currentCivic === c.id, boosted = p.boosts && p.boosts['c:' + c.id];
      var ck = AU.civicKind(c); html += '<div class="row clickable ' + (cur ? 'active' : '') + (ck ? ' kind-' + ck : '') + '" data-action="civic" data-id="' + c.id + '">' + (AU.Assets.get('civics', c.id) ? '<img class="techpic" src="' + AU.Assets.url('civics', c.id) + '" alt="">' : '') + '<div class="grow"><b>' + c.name + ' <span class="pill">' + AU.ERAS[c.era] + '</span>' + (ck ? '<span class="kind-pill ' + ck + '">' + ck + '</span>' : '') + (boosted ? ' <span class="pill" style="background:#3a2a4a;color:#e6c8ff">' + _('Inspired') + ' ✓</span>' : '') + '</b><small>' + ([civicFxText(c)].concat(unlocksOfCivic(c.id)).filter(Boolean).join(' · ') || _('Leads to further civics')) + '</small>' + (c.inspiration ? '<small>💡 ' + _('Insight') + ': ' + c.inspiration.desc + (boosted ? ' ✓' : '') + '</small>' : '') + masteryLine(p, c.id, true) + '<small>' + Math.floor(prog) + '/' + cost + ' · ' + turns(cost, prog, y.culture) + '</small>' + (cur ? '<div class="progress"><i style="width:' + (prog / cost * 100) + '%;background:var(--cult)"></i></div>' : '') + '</div>' + (cur ? '<span class="pill">adopting</span>' : '') + '</div>';
    });
    html += '</div>';
    AU.ERAS.forEach(function (era, ei) {
      var list = AU.CIVICS.filter(function (t) { return t.era === ei && avail.indexOf(t) < 0; });
      if (!list.length) return;
      html += '<div class="section"><h3>' + era + ' ' + _('Era') + '</h3>';
      list.forEach(function (c) { var done = !!p.civics[c.id], ck2 = AU.civicKind(c); html += '<div class="row ' + (done ? 'done' : 'locked') + (ck2 ? ' kind-' + ck2 : '') + '"><div class="grow"><b>' + c.name + (ck2 ? '<span class="kind-pill ' + ck2 + '">' + ck2 + '</span>' : '') + '</b><small>' + ([civicFxText(c)].concat(unlocksOfCivic(c.id)).filter(Boolean).join(' · ') || '—') + '</small>' + (!done && c.pre.length ? '<small>' + _('Requires') + ': ' + c.pre.map(function (x) { return AU.CIVIC_BY_ID[x].name; }).join(', ') + '</small>' : '') + (!done && c.inspiration ? '<small>💡 ' + c.inspiration.desc + '</small>' : '') + masteryLine(p, c.id, true) + '</div>' + (done ? '<span class="pill">✓</span>' : '<span class="pill">' + G.civicCost(g, p, c) + '</span>') + '</div>'; });
      html += '</div>';
    });
    return { title: _('Civics & Government'), html: html };
  };

  // ---------- Rankings: everyone you have met, side by side, plus the race for each victory ----------
  P.render_rankings = function (app, g) {
    var p = G.player(g), html = '';
    var civs = g.civs.filter(function (c) { return !c.minor && c.alive && (c.isPlayer || (p.met && p.met[c.idx])); });
    civs.sort(function (a, b) { return G.score(g, b) - G.score(g, a); });
    var stats = civs.map(function (c) { var y = G.civYields(g, c); return { c: c, y: y, score: G.score(g, c), mil: G.militaryStrength(g, c.idx), sets: G.civSettlements(g, c.idx).length, techs: Object.keys(c.techs).length, civics: Object.keys(c.civics).length }; });
    function maxOf(k) { return Math.max(1, Math.max.apply(null, stats.map(function (r) { return +r[k] || 0; }))); }
    function yMax(k) { return Math.max(1, Math.max.apply(null, stats.map(function (r) { return +r.y[k] || 0; }))); }
    function bar(v, m, color) { return '<div class="scorebar"><i style="width:' + Math.max(3, Math.min(100, v / m * 100)) + '%;background:' + color + '"></i></div>'; }
    html += '<div class="section"><h3>' + _('Empires you have met') + ' (' + civs.length + ')</h3><p class="stat">' + _('Sorted by score. Bars compare with the best of the empires you know.') + '</p>';
    var mS = maxOf('score'), mM = maxOf('mil'), mSci = yMax('science'), mCul = yMax('culture');
    stats.forEach(function (r, i) {
      var c = r.c, cd = G.civData(c), col = G.civColor(c);
      html += '<div class="row rank-row' + (c.isPlayer ? ' active' : '') + '"><div class="grow"><b>' + (i + 1) + '. ' + cd.name + (c.isPlayer ? ' (you)' : '') + ' <span class="pill">' + G.leaderName(c) + '</span> <span class="pill">' + AU.ERAS[c.era || 0] + '</span></b>' +
        '<div class="rank-grid">' +
        '<span>🏆 ' + r.score + bar(r.score, mS, col) + '</span>' +
        '<span>⚔️ ' + Math.round(r.mil) + bar(r.mil, mM, '#3fa65a') + '</span>' +
        '<span>🔬 ' + (+r.y.science).toFixed(1) + '/t' + bar(r.y.science, mSci, 'var(--sci)') + '</span>' +
        '<span>🎭 ' + (+r.y.culture).toFixed(1) + '/t' + bar(r.y.culture, mCul, 'var(--cult)') + '</span>' +
        '</div><small>💰 ' + Math.floor(c.gold) + ' (' + (r.y.gold >= 0 ? '+' : '') + (+r.y.gold).toFixed(1) + '/t) · 🏘️ ' + r.sets + ' settlements · ' + r.techs + ' techs · ' + r.civics + ' civics' + (c.isPlayer ? '' : ' · ' + (G.atWar(g, p.idx, c.idx) ? '<span class="pill war">at war</span>' : '<span class="pill peace">peace</span>')) + '</small></div></div>';
    });
    html += '</div>';
    // the race for each victory
    html += '<div class="section"><h3>' + _('Victory race') + '</h3>';
    var all = g.civs.filter(function (c) { return !c.minor; });
    function name(c) { return G.civData(c).name + (c.isPlayer ? ' (you)' : ''); }
    var V = AU.VICTORIES;
    // conquest: original capitals held
    var caps = civs.map(function (c) { var n = 0; all.forEach(function (o) { var oc = g.settlements[o.originalCapital]; if (oc && oc.civ === c.idx) n++; }); return { c: c, n: n }; }).sort(function (a, b) { return b.n - a.n; });
    html += '<div class="row"><div class="grow"><b>' + V.domination.icon + ' ' + V.domination.name + '</b><small>' + V.domination.desc + '</small><small>' + caps.slice(0, 3).map(function (r) { return name(r.c) + ': ' + r.n + '/' + all.length + ' capitals'; }).join(' · ') + '</small></div></div>';
    // star voyage: projects done
    var PR = Object.keys(AU.PROJECTS), sp = civs.map(function (c) { var n = PR.filter(function (k) { return c.projects && c.projects[k]; }).length; return { c: c, n: n, t: c.techs.spaceflight ? 1 : 0 }; }).sort(function (a, b) { return b.n - a.n || b.t - a.t; });
    html += '<div class="row"><div class="grow"><b>' + V.science.icon + ' ' + V.science.name + '</b><small>' + V.science.desc + '</small><small>' + sp.slice(0, 3).map(function (r) { return name(r.c) + ': ' + r.n + '/' + PR.length + ' projects' + (r.t ? ' (' + _('Space Travel known)') : ''); }).join(' · ') + '</small></div></div>';
    // renown: visitors vs need
    var cu = civs.map(function (c) { var cp = G.cultureProgress(g, c); return { c: c, v: cp.visitors, need: cp.need, pct: cp.need > 0 ? Math.round(cp.visitors / cp.need * 100) : 0 }; }).sort(function (a, b) { return b.pct - a.pct; });
    html += '<div class="row"><div class="grow"><b>' + V.culture.icon + ' ' + V.culture.name + '</b><small>' + V.culture.desc + '</small><small>' + cu.slice(0, 3).map(function (r) { return name(r.c) + ': ' + r.v + '/' + r.need + ' visitors (' + Math.min(100, r.pct) + '%)'; }).join(' · ') + '</small></div></div>';
    // devotion: empires converted
    if (AU.Religion) { var rl = civs.map(function (c) { var rows = AU.Religion.victoryProgress(g, c); if (!rows) return null; return { c: c, ok: rows.filter(function (x) { return x.ok; }).length, total: rows.length }; }).filter(Boolean).sort(function (a, b) { return b.ok - a.ok; });
      html += '<div class="row"><div class="grow"><b>' + V.religion.icon + ' ' + V.religion.name + '</b><small>' + V.religion.desc + '</small><small>' + (rl.length ? rl.slice(0, 3).map(function (r) { return name(r.c) + ' (' + AU.Religion.name(g, r.c.religion) + '): ' + r.ok + '/' + r.total + ' empires converted'; }).join(' · ') : _('No religion founded yet.')) + '</small></div></div>'; }
    html += '<div class="row"><div class="grow"><b>' + V.score.icon + ' ' + V.score.name + '</b><small>' + V.score.desc + ' ' + _('Turn') + ' ' + g.turn + ' of ' + g.maxTurns + '.</small><small>' + stats.slice(0, 3).map(function (r) { return name(r.c) + ': ' + r.score; }).join(' · ') + '</small></div></div>';
    html += '<p class="stat">' + G.leaderName(p) + ' leans towards ' + (AU.leaningText ? AU.leaningText(AU.LEADER_BY_ID[p.leaderId]) : 'a victory of their own') + '. ' + _('Empires you have not met yet are hidden.') + '</p></div>';
    return { title: _('Rankings'), html: html };
  };
  P.render_government = function (app, g, data) { return P.render_civics(app, g, Object.assign({ tab: 'policies' }, data || {})); };

  // ---------- Diplomacy ----------
  P.render_diplomacy = function (app, g) {
    var p = G.player(g), html = '';
    var others = g.civs.filter(function (c) { return c.idx !== p.idx && !c.minor; });
    if (!others.some(function (c) { return p.met[c.idx]; })) html += '<p class="stat">' + _('You have not met any other empire yet. Explore!') + '</p>';
    var CS = AU.CityStates, minors = g.civs.filter(function (c) { return c.minor && p.met[c.idx]; });
    if (CS) {
      if (g.v2 && AU.Society) html += '<div class="section"><h3>' + _('Kinfolk') + '</h3><p class="stat"><b>' + _('Ties') + '</b> ' + _('grow from caravans, garrisons, shared religion, quests and gifts, and each free city listens to one persuasion that counts double.') + ' ' + _('At 60 Ties you are its Patron and may seal a') + ' <b>' + _('Bond') + '</b>: ' + _('half its yields flow to your capital and its bonus stays yours while you pay Influence every turn (2 + 1 per bond). A bond broken by choice, war or an empty Influence purse costs -2 Happiness everywhere for 20 turns.') + '</p>';
      else html += '<div class="section"><h3>' + _('Free cities') + '</h3><p class="stat"><b>' + _('Ties') + '</b> ' + _('grow from what you do: a Caravan parked in their land') + ' (+3/' + _('turn and Gold), a soldier guarding their borders') + ' (+1), a shared religion (+1), their quest (+15) and gifts (+10). ' + _('Ignore them and Ties fade. Tiers: Acquaintance 10') + ' · ' + _('Partner 30 (their yield in your capital)') + ' · ' + _('Patron 60, if nobody is closer (their special bonus, their help in war)') + ' · ' + _('Kin 90 (more yields; after 20 turns as Kin with touching borders they can join you in a') + ' <b>' + _('Union') + '</b>).</p>';
      if (!minors.length) html += '<p class="stat">' + _('No free city met yet.') + '</p>';
      var caravans = CS.caravans(g, p); html += '<p class="stat">🐪 ' + _('Caravans') + ': ' + caravans.length + '/' + CS.caravanLimit(g, p) + (caravans.filter(function (u) { return u.route != null; }).length ? ' · routes: ' + caravans.filter(function (u) { return u.route != null; }).map(function (u) { return G.civData(g.civs[u.route]).name + ' (+' + CS.routeIncome(g, u) + '💰)'; }).join(', ') : '') + (g.v2 ? (G.gateOk(g, p, 'unit', 'caravan', AU.UNITS.caravan) ? '' : ' · ' + _('needs the') + ' ' + (AU.V2.NODE_BY_ID[AU.MasteryWeb.nodeFor('unit', 'caravan')] || { name: '?' }).name + ' ' + _('Spark')) : (p.civics.foreign_trade ? '' : ' · ' + _('needs the Caravans civic'))) + '</p>';
      minors.forEach(function (m) {
        var d = G.civData(m), T = AU.CITY_STATE_TYPES[m.stateType], mine = CS.tiesOf(g, p, m), pat = CS.patron(g, m), tier = CS.tierOf(mine), war = G.atWar(g, p.idx, m.idx), src = m.alive && !war ? CS.sources(g, p, m) : [], us = CS.unionState(g, p, m), hostile = CS.isHostile(g, p, m);
        html += '<div class="row"><div class="swatch" style="width:14px;height:40px;border-radius:4px;background:' + G.civColor(m) + '"></div><div class="grow"><b>' + T.icon + ' ' + d.name + '</b> <span class="pill">' + T.name + '</span> ' + (!m.alive ? '<span class="pill war">gone</span>' : war ? '<span class="pill war">' + _('At war') + '</span>' : '<span class="pill' + (tier >= 3 && pat === p.idx ? ' peace' : '') + '">' + CS.tierName(mine) + (pat === p.idx ? ' · ' + _('Patron') : '') + '</span>') +
          '<small>' + _('Ties') + ' <span class="strong">' + mine + '</span>/100 · ' + _('Patron') + ': ' + (pat < 0 ? 'none' : pat === p.idx ? '<span class="strong">you</span>' : G.civData(g.civs[pat]).name) + (m.religion ? ' · ' + AU.Religion.icon(g, m.religion) + ' ' + AU.Religion.name(g, m.religion) : '') + '</small>' +
          '<div class="progress"><i style="width:' + mine + '%;background:' + (pat === p.idx ? 'var(--gold)' : 'var(--accent)') + '"></i></div>' +
          '<small>' + (hostile ? '❄️ ' + _('Cold after your attack on a free city') + ' (' + (m.hostileUntil[p.idx] - g.turn) + ' turns)' : src.length ? _('This turn') + ': ' + src.map(function (x) { return '+' + x.n + ' ' + x.text; }).join(', ') : _('Nothing builds Ties right now') + (mine > 0 ? ': they fade slowly' : '')) + '</small>' +
          '<small><span class="strong">' + d.ability.name + ':</span> ' + G.abilityDesc(d.ability) + (g.v2 && /technolog|civic|Oligarchy|Monarchy|Theocracy|Autocracy/i.test(G.abilityDesc(d.ability)) ? ' <i>(' + _('Divergence: technology = Spark, civic = Insight, no governments') + ')</i>' : '') + '</small>' + (g.v2 && AU.Society && m.alive && !war ? (function () { var PER = AU.Society.PERSUASION[AU.Society.persuasionOf(m)], bs = AU.Society.bondState(g, p, m); return '<small>' + PER.icon + ' ' + _('Listens to') + ' <span class="strong">' + _(PER.name) + '</span>: ' + _(PER.desc) + ' · 🤝 ' + _('Bond') + ': ' + (bs.bonded ? '<span class="strong">' + _('sealed') + '</span> (' + AU.Society.bondUpkeep(g, p) + ' 🎯/' + _('turn') + ')' : bs.ok ? '<span class="strong">' + _('possible now') + '</span> (' + bs.upkeep + ' 🎯/' + _('turn') + ')' : bs.why) + '</small>'; })() : '') + (!g.v2 && m.alive && !war && tier >= 4 && pat === p.idx ? '<small>🤝 ' + _('Union') + ': ' + (us.ok ? '<span class="strong">possible now</span>' : us.why) + '</small>' : '') + '</div>' +
          (m.alive ? '<div class="tree-detail-btns"><button class="small primary" data-action="talk" data-id="' + m.idx + '">' + _('Audience') + '</button><button class="small" data-action="csgift" data-id="' + m.idx + '" ' + (AU.Diplo.canGiftCS(g, p.idx, m) ? '' : 'disabled') + '>' + _('Gift') + ' ' + AU.Diplo.giftCost(g, p.idx, m) + '💰</button>' + (us.ok ? '<button class="small gold" data-action="csunion" data-id="' + m.idx + '">' + _('Union') + '</button>' : '') + (g.v2 && AU.Society ? (AU.Society.hasBond(p, m) ? '<button class="small ghost" data-action="csbreak" data-id="' + m.idx + '">💔 ' + _('Break bond') + '</button>' : AU.Society.bondState(g, p, m).ok ? '<button class="small gold" data-action="csbond" data-id="' + m.idx + '">🤝 ' + _('Bond') + '</button>' : '') : '') + '</div>' : '') + '</div>';
      });
      html += '</div>';
    }
    others.forEach(function (c) {
      var d = G.civData(c), rel = p.rel[c.idx], met = p.met[c.idx];
      var att = c.alive ? c.rel[p.idx].attitude : 0, Dp = AU.Diplo;
      var mood = Dp ? Dp.mood(att) : (att > 15 ? _('Friendly') : att > -10 ? _('Neutral') : att > -30 ? _('Unfriendly') : _('Hostile'));
      var tags = Dp && met && c.alive ? (Dp.isAlly(g, p.idx, c.idx) ? ' <span class="pill peace">' + _('Allied') + '</span>' : Dp.isFriend(g, p.idx, c.idx) ? ' <span class="pill peace">' + _('Friends') + '</span>' : '') + (Dp.isDenounced(g, c.idx, p.idx) ? ' <span class="pill war">' + _('Denounced you') + '</span>' : '') : '';
      var portrait = AU.Assets.get('leaders', c.leaderId);
      html += '<div class="row">' + '<img class="portrait-sm" src="' + AU.Assets.url('leaders', c.leaderId) + '" alt="" onerror="this.remove()">' + '<div class="swatch" style="width:14px;height:40px;border-radius:4px;background:' + G.civColor(c) + ';border-right:4px solid ' + d.color2 + '"></div><div class="grow"><b>' + G.leaderName(c) + ' <span class="pill">' + d.name + '</span>' + (!c.alive ? ' <span class="pill">destroyed</span>' : '') + '</b>' +
        (met && c.alive ? '<small>' + (rel.war ? '<span class="pill war">' + _('At war') + '</span> since turn ' + rel.warSince : '<span class="pill peace">' + _('Peace') + '</span> · ' + mood) + tags + ' · ' + G.civSettlements(g, c.idx).length + ' settlements · military ' + Math.round(G.militaryStrength(g, c.idx)) + ' · score ' + G.score(g, c) + '</small><small>' + d.ability.name + ': ' + G.abilityDesc(d.ability) + '</small>' : '<small>' + (c.alive ? _('Not met yet') : '') + '</small>') + '</div>';
      if (met && c.alive) {
        html += '<div><button class="small primary" data-action="talk" data-id="' + c.idx + '">' + _('Talk') + '</button>';
        if (rel.war) html += '<button class="small" data-action="peace" data-id="' + c.idx + '">' + (c.peaceOffer && g.turn - c.peaceOffer < 5 ? _('Accept peace') : _('Propose peace')) + '</button>';
        else html += '<button class="small danger" data-action="war" data-id="' + c.idx + '" ' + (Dp && !Dp.canDeclareWar(g, p.idx, c.idx) ? 'disabled title="' + _('A treaty forbids it') + '"' : rel.peaceUntil > g.turn ? 'disabled title="' + _('Peace treaty until turn') + ' ' + rel.peaceUntil + '"' : '') + '>' + _('Declare war') + '</button>';
        html += '</div>';
      }
      html += '</div>';
    });
    return { title: _('Diplomacy'), html: html };
  };

  // ---------- Empire ----------
  P.render_empire = function (app, g) {
    var p = G.player(g), d = G.civData(p), y = G.civYields(g, p), html = '';
    html += '<div class="section"><h3>' + G.leaderName(p) + ' of ' + d.name + '</h3><div class="yields">' + yieldsHtml(y, { skip: ['food', 'happiness'], plus: true }) + '<span>💰 ' + Math.floor(p.gold) + ' treasury</span><span>🎖️ ' + G.commandLeft(g, p) + '/' + G.commandMax(g, p) + ' ' + _('Command') + ' · ' + _('orders a turn: 5, +1 per settlement, + command buildings, - bureaucracy beyond 8 settlements; a far unit costs 2 or 3') + '</span>' + (g.v2 ? '<span>🎯 ' + Math.floor(p.influence || 0) + ' ' + _('Influence') + ' (+' + G.influenceIncome(g, p) + (G.influenceFromHeritage(g, p) ? ', ' + G.influenceFromHeritage(g, p) + ' ' + _('of it from Heritage') : '') + ') · ' + _('pays for tile claims beyond the first three (river tiles are free)') + '</span>' + (AU.Smoke ? '<span>🏭 ' + AU.Smoke.total(g, p) + ' ' + _('Smoke') + ' · ' + _('world') + ' ' + AU.Smoke.world(g) + '</span>' : '') + (AU.Climate ? (function () { var cs = AU.Climate.state(g); return '<span>🌡️ ' + _('Climate') + ': ' + AU.Climate.describe(cs.warmth) + (cs.pending ? ' · ' + _('shift in') + ' ' + (cs.pending.at - g.turn) + ' ' + _('turns') + ' (' + cs.pending.tiles.length + ' ' + _('tiles') + ')' : '') + '</span>'; })() : '') : '') + '<span>unit upkeep ' + y.upkeep + '</span></div><p class="stat">' + d.ability.name + ': ' + G.abilityDesc(d.ability) + '</p></div>';
    if (AU.Palace) html += '<div class="section"><button class="big" data-action="palace">🏰 ' + _('Your palace') + ' (' + AU.Palace.count(p) + '/' + AU.PALACE_PIECES.length + ' pieces' + (p.palace && p.palace.pending > 0 ? ', ' + _('a piece is offered!') : '') + ')</button></div>';
    if (AU.Great) {
      var GP = AU.Great, gst = GP.state(p), ppt = GP.pointsPerTurn(g, p);
      html += '<div class="section"><h3>' + _('Great People') + '</h3><p class="stat">' + _('Buildings and wonders earn points every turn (Shrines → Prophets, Libraries → Scientists, Workshops → Engineers, Markets → Merchants, Amphitheaters → Artists, Barracks → Generals, Harbors → Admirals). When a bar fills, that Great Person appears in your capital. From half way you can recruit early with Devotion or Gold.') + '</p>';
      AU.GREAT_ORDER.forEach(function (t) {
        var T = AU.GREAT_TYPES[t], cost = GP.cost(g, p, t), pts = gst.pts[t] || 0, avail = GP.available(g, p, t), n = gst.count[t] || 0;
        var eta = ppt[t] > 0 ? Math.ceil((cost - pts) / ppt[t]) + ' turns' : (avail ? 'no points yet' : (t === 'prophet' && p.religion ? _('you have a religion') : t === 'prophet' && !p.pantheon ? _('choose a pantheon first') : t === 'prophet' && G.civUnits(g, p.idx).some(function (u) { return AU.UNITS[u.type].great === 'prophet'; }) ? _('your prophet is waiting for orders') : 'no religion left to found'));
        html += '<div class="row"><div class="grow"><b>' + T.icon + ' ' + T.name + (n ? ' <span class="pill">' + n + ' ' + _('so far') + '</span>' : '') + '</b><small>' + G.abilityDesc(T) + '</small><small>' + Math.floor(pts) + '/' + cost + ' points · +' + ppt[t] + '/turn · ' + eta + '</small><div class="progress"><i style="width:' + Math.min(100, pts / cost * 100) + '%;background:var(--gold)"></i></div></div>' +
          (avail && pts >= cost * 0.5 ? '<div class="tree-detail-btns"><button class="small" data-action="patron" data-type="' + t + '" data-cur="faith" ' + (GP.canPatronize(g, p, t, 'faith') ? '' : 'disabled') + '>' + GP.patronCost(g, p, t, 'faith') + ' 🕊️</button><button class="small" data-action="patron" data-type="' + t + '" data-cur="gold" ' + (GP.canPatronize(g, p, t, 'gold') ? '' : 'disabled') + '>' + GP.patronCost(g, p, t, 'gold') + ' 💰</button></div>' : '') + '</div>';
      });
      var greats = G.civUnits(g, p.idx).filter(function (u) { return AU.UNITS[u.type].great; });
      if (greats.length) html += '<p class="stat">' + _('Waiting for orders') + ': ' + greats.map(function (u) { return '<a class="plink" data-action="gotounit" data-id="' + u.id + '">' + AU.UNITS[u.type].icon + ' ' + u.name + '</a>'; }).join(', ') + '</p>';
      html += '</div>';
    }
    var cp = G.cultureProgress(g, p);
    html += '<div class="section"><h3>' + _('Fame') + ' &amp; ' + _('Renown victory') + '</h3><div class="yields"><span>🧳 +' + G.tourism(g, p) + ' ' + _('Fame') + '/turn</span><span>✈️ ' + cp.visitors + ' foreign visitors</span><span>🏠 need ' + cp.need + '</span></div><p class="stat">' + _('Win by Renown when your foreign visitors exceed the domestic tourists of every rival (Modern era or later). Fame comes from wonders, museums, amphitheaters, broadcast towers, stadiums and natural wonders inside your borders, and grows with each era.') + '</p>' +
      g.civs.filter(function (o) { return o.alive && o.idx !== p.idx && p.met && p.met[o.idx]; }).map(function (o) { var dom = G.domesticTourists(g, o); return '<div class="row"><div class="grow">' + G.civData(o).name + '</div><small>' + Math.min(100, Math.round(cp.visitors / (dom + 1) * 100)) + '% (' + cp.visitors + '/' + (dom + 1) + ')</small></div>'; }).join('') + '</div>';
    var lux = G.luxuryCount(g, p);
    html += '<div class="section"><h3>' + _('Resources') + '</h3><div class="yields">' + (lux.luxuries.map(function (r) { return '<span>' + AU.RESOURCES[r].icon + ' ' + AU.RESOURCES[r].name + '</span>'; }).join('') || '<span class="stat">' + _('no luxuries yet (work tiles with luxury resources for happiness)') + '</span>') +
      Object.keys(lux.strategic).map(function (r) { return '<span>' + AU.RESOURCES[r].icon + ' ' + AU.RESOURCES[r].name + ' ×' + lux.strategic[r] + (p.synth && p.synth[r] ? ' 🧪' : '') + (g.v2 && AU.Society ? ' (' + AU.Society.resourceUse(g, p, r) + ' ' + _('in use') + ')' : '') + '</span>'; }).join('') + '</div></div>';
    html += '<div class="section"><h3>' + _('Settlements') + '</h3>';
    G.civSettlements(g, p.idx).forEach(function (s) {
      var sy = G.settlementYields(g, s);
      html += '<div class="row clickable" data-action="city" data-id="' + s.id + '"><div class="grow"><b>' + (s.isCapital ? '★ ' : '') + s.name + ' <span class="pill">' + (s.isCity ? _('City') : _('Town')) + (s.specialization ? ' · ' + (G.specializationDef(p, s.specialization) || { name: s.specialization }).name : '') + '</span>' + (s.pendingGrowth ? ' 🌱' : '') + '</b><small>' + _('Pop') + ' ' + s.pop + ' · ' + yieldsHtml(sy, { skip: ['happiness'] }) + ' · ' + (sy.happiness < 0 ? '😠' : '😊') + sy.happiness + (s.isCity ? ' · ' + (s.queue.length ? 'building ' + P.itemName(g, p, s.queue[0]) : '<b style="color:#e6b422">idle</b>') : '') + '</small></div></div>';
    });
    html += '</div><div class="section"><h3>' + _('Units') + ' (' + G.civUnits(g, p.idx).length + ')</h3>';
    G.civUnits(g, p.idx).forEach(function (u) { html += '<div class="row clickable" data-action="gotounit" data-id="' + u.id + '"><div class="grow"><b>' + AU.UNITS[u.type].icon + ' ' + u.name + '</b><small>HP ' + u.hp + ' · near ' + U.nearestName(g, u.tile) + (u.fortify ? ' · fortified' : '') + (u.auto ? ' · exploring' : '') + '</small></div></div>'; });
    html += '</div><div class="section"><h3>' + _('Rankings') + '</h3>';
    var ranked = g.civs.slice().sort(function (a, b) { return G.score(g, b) - G.score(g, a); }), top = G.score(g, ranked[0]) || 1;
    ranked.forEach(function (c) { var cd = G.civData(c); html += '<div class="row"><div class="grow"><b>' + cd.name + (c.isPlayer ? ' (you)' : '') + (!c.alive ? ' — destroyed' : '') + '</b><div class="scorebar"><i style="width:' + Math.max(4, G.score(g, c) / top * 60) + '%;background:' + G.civColor(c) + '"></i><small class="stat">' + G.score(g, c) + ' pts · ' + (p.met[c.idx] || c.isPlayer ? Object.keys(c.techs).length + ' techs · ' + G.civSettlements(g, c.idx).length + ' settlements' : 'unknown') + '</small></div></div></div>'; });
    html += '</div><div class="section"><h3>' + _('Victory conditions') + '</h3>' + Object.keys(AU.VICTORIES).map(function (k) { var v = AU.VICTORIES[k]; return '<p class="stat"><b>' + v.icon + ' ' + v.name + '</b>: ' + v.desc + '</p>'; }).join('') + '<p class="stat">' + G.leaderName(p) + ' leans towards ' + AU.leaningText(G.leaderData(p)) + '.</p></div>';
    return { title: _('Empire'), html: html };
  };

  P.render_log = function (app, g) {
    var html = '<div class="section">';
    var pl = G.player(g), known = g.log.filter(function (l) { return l.civ === undefined || l.civ === null || l.civ === pl.idx || pl.met[l.civ]; });
    html += '<p class="stat">' + _('Only events involving you and the empires you have met are recorded.') + '</p>';
    known.slice().reverse().forEach(function (l) { html += '<div class="row"><small class="stat">T' + l.turn + '</small><div class="grow">' + esc(l.msg) + '</div></div>'; });
    return { title: _('History'), html: html + '</div>' };
  };

  // ---------- Menu ----------
  P.render_menu = function (app, g) {
    var html = '<div class="section">';
    if (AU.I18n) { html += '<div class="row"><div class="grow"><b>🌐 ' + _('Language') + ': ' + AU.I18n.LANGS[AU.I18n.lang] + '</b><small>' + _('Changing the language reloads the game; your progress is saved first.') + '</small></div></div><div class="actions lang-list">'; for (var lk in AU.I18n.LANGS) html += '<button class="small ' + (lk === AU.I18n.lang ? 'on' : '') + '" data-action="lang" data-id="' + lk + '">' + AU.I18n.LANGS[lk] + '</button>'; html += '</div><br>'; }
    html += '<button class="big ghost" data-action="hall">🏅 ' + _('Hall of Fame') + '</button><br><br>';
    if (g) html += '<button class="big" data-action="rankings">🏆 ' + _('Rankings') + ' &amp; victory race</button><br><br>' + (g.v2 ? '<button class="big" data-action="web">💡 ' + _('Mastery Web') + ' &amp; ' + _('Insights') + '</button><br><br>' : '<button class="big" data-action="policies">🏛️ ' + _('Government') + ' &amp; policies</button><br><br>');
    if (g) html += '<button class="big" data-action="save">' + _('Save game') + '</button><br><br>';
    if (g) html += '<button class="big ghost" data-action="exportsave">📤 ' + _('Export save to a file') + '</button><br><br>';
    html += '<button class="big ghost" data-action="importsave">📥 ' + _('Load a save file') + '</button><br><br>';
    html += '<button class="big" data-action="loadgame" ' + (app.hasSave() ? '' : 'disabled') + '>' + _('Load saved game') + '</button><br><br>';
    html += '<button class="big" data-action="newgame">' + _('New game') + '</button><br><br>';
    html += '<button class="big ghost" data-action="togglegraphics">' + _('Graphics') + ': ' + (app.settings.graphics === '3d' ? '3' + _('D world') : '2' + _('D painted map')) + ' (switch)</button><br><br>';
    if (app.settings.graphics !== '3d') html += '<button class="big ghost" data-action="toggleiso">' + _('View') + ': ' + (app.settings.iso !== false ? _('Isometric') : _('Top-down')) + ' (switch)</button><br><br>';
    html += '<p class="stat">' + _('Tiny Empires') + ' ' + (AU.VERSION && AU.VERSION !== '__VERSION__' ? 'build ' + AU.VERSION.slice(0, 7) : 'local build') + (app.updateReady ? ' · <b>update ready</b>' : '') + '</p>';
    if (app.updateReady) html += '<button class="big primary" data-action="applyupdate">' + _('Restart with the new version') + '</button><br><br>';
    var Au = AU.Audio; if (Au) html += '<div class="row"><div class="grow"><b>🎵 ' + _('Music') + ': ' + (Au.enabled ? 'on' : 'off') + '</b><small>' + (Au.enabled ? _('Now') + ': ' + Au.status() + ' · volume ' + Math.round(Au.volume * 100) + '%' : _('Silent')) + '</small></div><button class="small" data-action="musicvol" data-d="-1" ' + (Au.enabled ? '' : 'disabled') + '>−</button><button class="small" data-action="musicvol" data-d="1" ' + (Au.enabled ? '' : 'disabled') + '>+</button><button class="small ' + (Au.enabled ? '' : 'primary') + '" data-action="togglemusic">' + (Au.enabled ? _('Mute') : 'Turn on') + '</button></div>';
    html += '<button class="big ghost" data-action="tree" data-kind="tech">🌳 ' + _('Technology & civics trees') + '</button><br><br>';
    html += '<button class="big ghost" data-action="toggleyields">' + (app.settings.yields ? _('Hide') : _('Show')) + ' ' + _('tile yields on the map (Y)') + '</button><br><br>';
    html += '<button class="big ghost" data-action="toggletips">💡 ' + _('Newbie tips') + ': ' + (app.settings.tips === false ? _('off') : _('on')) + '</button><br><br>';
    html += '<button class="big ghost" data-action="toggleresbadge">' + _('Resource icons') + ': ' + (app.settings.resourceStyle === 'badge' ? _('in a circle') : _('on the terrain')) + ' (' + _('switch') + ')</button><br><br>';
    html += '<button class="big ghost" data-action="togglestrict">End Turn button: ' + (app.settings.strictTurn ? 'must clear the to-do list first' : _('to-do first, Pass anytime')) + '</button><br><br>';
    if (g) html += '<button class="big ghost" data-action="log">' + _('History log') + '</button><br><br><button class="big ghost" data-action="togglegrid">' + (app.renderer.showGrid ? _('Hide') : _('Show')) + ' hex grid</button><br><br>';
    html += '<button class="big ghost" data-action="pedia">📖 ' + _('Chibipedia') + '</button><br><br><button class="big ghost" data-action="help">' + _('How to play') + '</button><br><br>';
    if (g) html += '<button class="big ghost" data-action="quit">' + _('Quit to title') + '</button>';
    html += '</div><p class="stat">' + _('Tiny Empires. Autosaves at the end of every turn.') + '</p>';
    return { title: _('Menu'), html: html };
  };
  P.render_help = function () {
    var html = '<div class="help">' +
      '<h3>' + _('The idea') + '</h3><p>' + _('Tiny Empires is a turn-based strategy game where one empire grows from a single camp to the stars. You found') + ' <b>' + _('Towns') + '</b>, ' + _('upgrade the important ones into') + ' <b>' + _('Cities') + '</b>, ' + _('and your empire stays the same from the first turn to the last: no era resets, no crises, no switching peoples. Each leader rules only their own people, and every technology and civic you unlock stays with you.') + '</p>' +
      '<h3>' + _('Towns and Cities') + '</h3><p>' + _('Your capital is a City. New settlements are Towns. Towns have no production queue: their production becomes gold, and you buy buildings and units in them with gold. Towns grow by themselves. Once a Town reaches pop 5 you can') + ' <b>specialize</b> ' + _('it (Farming, Mining, Trade, Fort, Urban Center): it stops growing and sends surplus food to your nearest City. Pay gold to') + ' <b>upgrade</b> ' + _('a Town into a City whenever you want a real production hub.') + '</p>' +
      '<h3>' + _('Growth and tiles') + '</h3><p>' + _('There are no builders. Every time a settlement grows you pick a tile within three rings; the new citizen claims and improves it automatically (farm, mine, fishing boats, pasture, plantation…). Tiles with luxury resources give happiness, strategic resources unlock units such as Swordbearers (Iron) or Chevaliers (Horses).') + '</p>' +
      '<h3>' + _('Units') + '</h3><p>' + _('Tap a unit to select it, tap a highlighted tile to move (far tiles create multi-turn routes). Tap a red tile to attack: the estimated damage is shown, tap again to confirm. Ranged units attack from a distance without taking damage. Melee units capture settlements when their HP reaches 0. Units heal when they do not move; Fortify to defend and heal faster. One military and one civilian unit per tile.') + '</p>' +
      '<h3>' + _('Research and civics') + '</h3><p>' + _('Knowledge drives the technology tree, culture drives civics. Civics unlock governments (Autocracy, Republic, Monarchy, Democracy…) which you can switch between at any time from the Civics panel.') + '</p>' +
      '<h3>' + _('Diplomacy') + '</h3><p>' + _('Other leaders remember your wars. Declare war from the Diplomacy panel; AI leaders will offer or accept peace when a war goes badly for them. The') + ' <b>' + _('Inchibils') + '</b> ' + _('are the wild people of the map, not an empire and not a Free city: their camps (🏕️) spawn raiders. Move a military unit onto a camp to disperse it for Gold.') + '</p>' +
      '<h3>' + _('Winning') + '</h3><p><b>' + _('Domination') + '</b>: ' + _("hold every rival's original capital.") + ' <b>' + _('Knowledge') + '</b>: ' + _('research Spaceflight and complete the three space projects in your capital.') + ' <b>' + _('Score') + '</b>: highest score when the turn limit is reached.</p>' +
      '<h3>' + _('Controls') + '</h3><p>' + _('Drag to pan, pinch or scroll to zoom. Tap the yields at the top to open panels. Enter') + ' = ' + _('end turn, N') + ' = ' + _('next unit, F') + ' = ' + _('fortify, Space') + ' = ' + _('skip. The game autosaves every turn.') + '</p></div>';
    return { title: _('How to play'), html: html };
  };
  // ---------- Religion ----------
  P.render_religion = function (app, g, data) {
    var Rl = AU.Religion, p = G.player(g), y = G.civYields(g, p), html = '', sel = app.panelData;
    html += '<div class="section"><div class="yields"><span class="faith">🕊️ ' + Math.floor(p.faith) + ' ' + _('Devotion') + '</span><span>+' + (y.faith || 0) + ' ' + _('per turn') + '</span></div>';
    html += '<p class="stat">' + _('Devotion comes from Shrines, Temples, pantheon beliefs, holy cities and some wonders. Spend it on a pantheon') + ' (' + Rl.PANTHEON_COST + '), enhancing your religion (' + Rl.enhanceCost(g) + '), ' + _('recruiting Great People early, and religious units bought in settlements with a Shrine or Temple.') + '</p></div>';
    // pantheon
    if (!p.pantheon) {
      html += '<div class="section"><h3>' + _('Pantheon') + '</h3>' + (Rl.canChoosePantheon(g, p) ? '<p class="stat">' + _('Choose one belief. It is yours for the whole game.') + '</p>' : '<p class="stat">' + _('Needs') + ' ' + Rl.PANTHEON_COST + ' Devotion.</p>');
      Rl.availablePantheons(g).forEach(function (b) { html += '<div class="row"><div class="grow"><b>' + b.name + '</b><small>' + b.desc + '</small></div><button class="small primary" data-action="pantheon" data-id="' + b.id + '" ' + (Rl.canChoosePantheon(g, p) ? '' : 'disabled') + '>' + _('Choose') + '</button></div>'; });
      html += '</div>';
    } else html += '<div class="section"><h3>' + _('Pantheon') + ': ' + AU.BELIEF_BY_ID[p.pantheon].name + '</h3><p class="stat">' + AU.BELIEF_BY_ID[p.pantheon].desc + '</p></div>';
    var rel = Rl.rel(g, p.religion);
    if (!rel && p.pantheon) {
      var slotsLeft = Rl.maxReligions(g) - Rl.religionsFounded(g);
      html += '<div class="section"><h3>' + _('Found a religion') + '</h3><p class="stat">' + (slotsLeft > 0 ? slotsLeft + ' religion' + (slotsLeft > 1 ? 's' : '') + ' ' + _('can still be founded in this world. Religions are founded by a') + ' <b>' + _('Great Prophet') + '</b> (' + _('earned with Great Prophet points from Shrines, Temples and Devotion; see the Empire panel). Move the prophet into the settlement that should become the Holy City, pick a name, one Follower belief and one Founder belief, then found it.') : _('Every religion of this world has already been founded.')) + (Rl.prophetFor(g, p) ? '<br><b style="color:var(--gold)">' + Rl.prophetFor(g, p).name + ' is ready in ' + G.settlementAt(g, Rl.prophetFor(g, p).tile).name + '.</b>' : (p.religion ? '' : '<br>' + _('No Great Prophet in a settlement yet.'))) + '</p>';
      if (slotsLeft > 0) {
        html += '<p><b>' + _('Name') + '</b></p><div class="actions">' + Rl.availableNames(g).map(function (n) { return '<button class="small' + (sel.relName === n.id ? ' primary' : '') + '" data-action="relpick" data-what="' + 'relName' + '" data-id="' + n.id + '">' + n.icon + ' ' + n.name + '</button>'; }).join('') + '</div>';
        html += '<p><b>' + _('Follower belief') + '</b> (' + _('every settlement of the religion)') + '</p>' + Rl.availableBeliefs(g, 'follower').map(function (b) { return '<div class="row' + (sel.relFollower === b.id ? ' selected' : '') + '"><div class="grow"><b>' + b.name + '</b><small>' + b.desc + '</small></div><button class="small' + (sel.relFollower === b.id ? ' primary' : '') + '" data-action="relpick" data-what="' + 'relFollower' + '" data-id="' + b.id + '">' + (sel.relFollower === b.id ? _('Chosen') : _('Pick')) + '</button></div>'; }).join('');
        html += '<p><b>' + _('Founder belief') + '</b> (only for you)</p>' + Rl.availableBeliefs(g, 'founder').map(function (b) { return '<div class="row' + (sel.relFounder === b.id ? ' selected' : '') + '"><div class="grow"><b>' + b.name + '</b><small>' + b.desc + '</small></div><button class="small' + (sel.relFounder === b.id ? ' primary' : '') + '" data-action="relpick" data-what="' + 'relFounder' + '" data-id="' + b.id + '">' + (sel.relFounder === b.id ? _('Chosen') : _('Pick')) + '</button></div>'; }).join('');
        html += '<br><button class="big primary" data-action="foundrel" ' + (Rl.canFound(g, p) && sel.relName && sel.relFollower && sel.relFounder ? '' : 'disabled') + '>' + _('Found religion') + (Rl.prophetFor(g, p) ? ' in ' + G.settlementAt(g, Rl.prophetFor(g, p).tile).name : '') + '</button>';
      }
      html += '</div>';
    }
    if (rel) {
      html += '<div class="section"><h3>' + rel.icon + ' ' + rel.name + (rel.founder === p.idx ? ' (founded by you)' : ' (founded by ' + G.civData(g.civs[rel.founder]).name + ')') + '</h3>';
      html += '<p class="stat">' + _('Holy city') + ': ' + (g.settlements[rel.holyCity] ? g.settlements[rel.holyCity].name : '—') + ' · followers: ' + Rl.followerCount(g, rel.id) + ' settlements.</p>';
      rel.beliefs.forEach(function (bid) { var b = AU.BELIEF_BY_ID[bid]; if (b) html += '<div class="row"><div class="grow"><b>' + b.name + '</b> <span class="pill">' + b.type + '</span><small>' + b.desc + '</small></div></div>'; });
      if (rel.founder === p.idx && !rel.enhanced) {
        html += '<h3>' + _('Enhance') + ' (' + Rl.enhanceCost(g) + ' 🕊️)</h3><p><b>' + _('Enhancer belief') + '</b></p>' + Rl.availableBeliefs(g, 'enhancer').map(function (b) { return '<div class="row"><div class="grow"><b>' + b.name + '</b><small>' + b.desc + '</small></div><button class="small' + (sel.relEnh === b.id ? ' primary' : '') + '" data-action="relpick" data-what="' + 'relEnh' + '" data-id="' + b.id + '">' + (sel.relEnh === b.id ? _('Chosen') : _('Pick')) + '</button></div>'; }).join('');
        html += '<p><b>' + _('Second follower belief') + '</b></p>' + Rl.availableBeliefs(g, 'follower').map(function (b) { return '<div class="row"><div class="grow"><b>' + b.name + '</b><small>' + b.desc + '</small></div><button class="small' + (sel.relFollower2 === b.id ? ' primary' : '') + '" data-action="relpick" data-what="' + 'relFollower2' + '" data-id="' + b.id + '">' + (sel.relFollower2 === b.id ? _('Chosen') : _('Pick')) + '</button></div>'; }).join('');
        html += '<br><button class="big primary" data-action="enhancerel" ' + (Rl.canEnhance(g, p) && sel.relEnh && sel.relFollower2 ? '' : 'disabled') + '>' + _('Enhance') + ' ' + rel.name + '</button>';
      }
      var vp = Rl.victoryProgress(g, p);
      if (vp) html += '<h3>' + _('Devout victory') + '</h3><p class="stat">' + _('Win, from the Industrial era on, when your religion is the majority in at least half of the settlements of every empire.') + '</p>' + vp.map(function (r) { return '<div class="row"><div class="grow">' + (r.ok ? '✅ ' : '⬜ ') + G.civData(r.civ).name + '</div><small>' + r.followers + '/' + r.total + '</small></div>'; }).join('');
      html += '</div>';
    }
    // world religions
    var ids = Object.keys(g.religions || {});
    html += '<div class="section"><h3>' + _('Religions of the world') + '</h3>' + (ids.length ? ids.map(function (id) { var r = g.religions[id]; return '<div class="row"><div class="grow"><b>' + r.icon + ' ' + r.name + '</b><small>' + G.civData(g.civs[r.founder]).name + ' · ' + Rl.followerCount(g, id) + ' settlements · ' + r.beliefs.map(function (b) { return AU.BELIEF_BY_ID[b] ? AU.BELIEF_BY_ID[b].name : b; }).join(', ') + '</small></div></div>'; }).join('') : '<p class="stat">' + _('No religion has been founded yet.') + ' ' + Rl.maxReligions(g) + ' ' + _('can exist in this world.') + '</p>') + '</div>';
    html += '<div class="section"><h3>' + _('Your settlements') + '</h3>' + G.civSettlements(g, p.idx).map(function (s) { return '<div class="row clickable" data-action="city" data-id="' + s.id + '"><div class="grow">' + s.name + '</div><small>' + (s.religion ? Rl.icon(g, s.religion) + ' ' + Rl.name(g, s.religion) : '—') + '</small></div>'; }).join('') + '</div>';
    return { title: _('Religion'), html: html };
  };
  P.render_victory = function (app, g) {
    var p = G.player(g), v = g.victory, d = G.civData(p), won = !!(v && g.civs[v.civ] && g.civs[v.civ].isPlayer);
    var entry = (AU.Hall && (AU.Hall.record(g) || AU.Hall.entryFor(g))) || null;
    var kind = !p.alive ? 'defeat' : v ? v.type : 'defeat', VT = kind === 'defeat' ? { icon: '💀', name: _('Defeat') } : AU.VICTORIES[kind] || { icon: '🏁', name: kind };
    var html = '<div class="victory ' + (won ? 'won' : 'lost') + ' v-' + kind + '">';
    html += '<div class="v-icon">' + VT.icon + '</div>';
    if (!p.alive) html += '<h1>' + _('Your empire has fallen') + '</h1><p class="v-sub">' + d.name + ' was destroyed on turn ' + g.turn + '. ' + _('Every empire has its dusk; the next one starts with a New game.') + '</p>';
    else if (won) html += '<h1>' + VT.name + ' ' + _('Victory!') + '</h1><p class="v-sub">' + G.leaderName(p) + ' leads ' + d.name + ' to glory on turn ' + v.turn + '. ' + (AU.VICTORIES[kind] ? AU.VICTORIES[kind].desc : '') + '</p>';
    else { var w = g.civs[v.civ], wd = G.civData(w); html += '<h1>' + wd.name + ' wins</h1><p class="v-sub">' + G.leaderName(w) + ' of ' + wd.name + ' achieved a ' + VT.icon + ' ' + VT.name + ' victory on turn ' + v.turn + '. ' + _('Your empire lives on, but the age belongs to them.') + '</p>'; }
    html += '<img class="v-portrait" src="' + AU.Assets.url('leaders', p.leaderId) + '" alt="" onerror="this.remove()">';
    if (entry) html += '<div class="v-stats"><div><b>' + entry.score + '</b><small>score</small></div><div><b>' + entry.turn + '</b><small>turns</small></div><div><b>' + entry.settlements + '</b><small>settlements</small></div><div><b>' + entry.techs + '</b><small>technologies</small></div><div><b>' + entry.civics + '</b><small>civics</small></div><div><b>' + entry.wonders + '</b><small>wonders</small></div><div><b>' + entry.greats + '</b><small>' + _('Great People') + '</small></div><div><b>' + (AU.DIFFICULTIES[entry.difficulty] ? AU.DIFFICULTIES[entry.difficulty].name : entry.difficulty) + '</b><small>difficulty</small></div></div>';
    var rank = AU.Hall ? AU.Hall.list().findIndex(function (e) { return e.date === g.hallRecorded; }) : -1;
    html += '<p class="stat">' + (rank >= 0 ? _('Recorded in your Hall of Fame') + (rank < 3 ? ' as ' + AU.Hall.medal(rank) + ' best game' : ' (#' + (rank + 1) + ')') + '.' : '') + '</p>';
    html += '<div class="v-btns"><button class="big primary" data-action="hall">🏆 ' + _('Hall of Fame') + '</button><button class="big" data-action="continueplaying">' + _('Keep playing') + '</button><button class="big ghost" data-action="newgame">' + _('New game') + '</button></div></div>';
    return { title: won ? _('Victory') : _('Game over'), html: html };
  };
  // ---------- Hall of Fame ----------
  P.render_hall = function (app, g) {
    var list = AU.Hall ? AU.Hall.list() : [], html = '<div class="section"><h3>' + _('Hall of Fame') + '</h3><p class="stat">' + _('Every finished game on this device, best score first. Score counts settlements, population, technologies, civics, wonders and more.') + '</p>';
    if (!list.length) html += '<p class="stat">' + _('No finished game yet. Win one, or fall gloriously, and it appears here.') + '</p>';
    list.forEach(function (e, i) {
      var T = AU.Hall.typeLabel(e.type), dt = new Date(e.date);
      html += '<div class="row hall-row ' + (e.won ? 'won' : 'lost') + '"><div class="hall-medal">' + AU.Hall.medal(i) + '</div>' + (e.leaderId ? '<img class="portrait small" src="' + AU.Assets.url('leaders', e.leaderId) + '" alt="" onerror="this.remove()">' : '') + '<div class="grow"><b>' + e.leader + ' of ' + e.civ + ' <span class="pill ' + (e.won ? 'peace' : 'war') + '">' + T.icon + ' ' + (e.won ? T.name + ' victory' : e.type === 'defeat' ? _('Defeat') : _('Lost to') + ' ' + (e.winner || 'another empire') + ' (' + T.name + ')') + '</span></b>' +
        '<small>' + _('Score') + ' <b>' + e.score + '</b> · turn ' + e.turn + ' · ' + (AU.DIFFICULTIES[e.difficulty] ? AU.DIFFICULTIES[e.difficulty].name : e.difficulty) + ' · ' + e.size + ' ' + (AU.MAP_TYPES[e.mapType] ? AU.MAP_TYPES[e.mapType].name : e.mapType || '') + ' · ' + (AU.SPEEDS[e.speed] ? AU.SPEEDS[e.speed].name : e.speed) + ' · ' + e.empires + ' empires</small>' +
        '<small>' + e.settlements + ' settlements · ' + e.techs + ' techs · ' + e.civics + ' civics · ' + e.wonders + ' wonders · ' + e.greats + ' ' + _('Great People') + ' · ' + dt.toLocaleDateString() + '</small></div></div>';
    });
    if (list.length) html += '<br><button class="small ghost" data-action="hallclear">' + _('Clear the Hall of Fame') + '</button>';
    html += '</div>';
    return { title: _('Hall of Fame'), html: html };
  };

  // ---------- Panel actions ----------
  P.action = function (app, name, d) {
    var g = app.g, p = g ? G.player(g) : null, s;
    if (AU.Tree && AU.Tree.action(app, name, d)) return;
    switch (name) {
      case 'webtab': app.panelData.tab = d.tab; app.refreshPanel(); break;
      case 'webdetail': app.panelData.detail = d.id || null; app.panelData.focus = null; app.refreshPanel(); if (d.id) { var dr = document.querySelector('#panel-body .wdrawer'); if (dr && dr.scrollIntoView) dr.scrollIntoView({ block: 'nearest' }); } break;
      case 'webera': app.panelData.era = +d.era; app.panelData.tab = d.tab || app.panelData.tab; app.refreshPanel(); break;
      case 'web': app.openPanel('web'); break;
      case 'webfocus': app.openPanel('web', d.id ? { focus: d.id } : { tab: 'foundation' }); break;
      case 'close': app.closePanel(); break;
      case 'study': { var sn = AU.V2.NODE_BY_ID[d.id]; if (!sn || !AU.MasteryWeb.canStudy(g, p, d.id)) { if (sn && !AU.MasteryWeb.state(p).unlocked[d.id]) app.toast(_('Not enough Knowledge yet') + ' (' + Math.floor(AU.MasteryWeb.state(p).study) + '/' + AU.MasteryWeb.studyCost(g, p, sn) + ' 📚)'); break; } var doStudy = function () { if (AU.MasteryWeb.study(g, p, d.id)) { app.toast('💡 ' + _('Spark!') + ' ' + sn.name); app.refreshPanel(); app.refreshHud(); } }; if (sn.pair && AU.V2.NODE_BY_ID[sn.pair]) app.confirm(_('Study') + ' ' + sn.name + ' ' + _('for') + ' ' + AU.MasteryWeb.studyCost(g, p, sn) + ' 📚? ' + _('This locks') + ' ' + AU.V2.NODE_BY_ID[sn.pair].name + ' ' + _('for the whole game.'), doStudy); else doStudy(); break; }
      case 'reform': { var rh = AU.V2.HUB_BY_ID[d.hub]; if (!rh) break; var rb = rh.branches.filter(function (x) { return x.id === d.branch; })[0], rbn = rb ? rb.name : d.branch; app.confirm(_('Reform') + ' ' + rh.name + ' → ' + rbn + ' ' + _('for') + ' ' + AU.MasteryWeb.reformCost(g, p) + ' 🎭? ' + _('Only one Reform is allowed each age.'), function () { if (AU.MasteryWeb.reform(g, p, d.hub, d.branch)) { app.toast('🎭 ' + _('Reform') + ': ' + rh.name + ' → ' + rbn); app.refreshPanel(); app.refreshHud(); } }); break; }
      case 'hub': app.openPanel('hub'); break;
      case 'hubpick': if (AU.MasteryWeb.choose(g, p, d.hub, d.branch)) { app.toast('🔮 ' + AU.V2.HUB_BY_ID[d.hub].name + ' → ' + d.branch); if (AU.MasteryWeb.state(p).pendingHubs.length) app.refreshPanel(); else app.openPanel('web', { tab: 'traits' }); app.refreshHud(); } break;
      case 'citytab': app.panelData.tab = d.tab; app.refreshPanel(); break;
      case 'synth': { s = g.settlements[+d.id]; var SYr = AU.RESOURCES[d.res]; if (!s || !SYr || !AU.Synthesis.canRun(g, p, s) || !AU.Synthesis.canAfford(g, p)) break; app.confirm(_('Synthesise') + ' ' + SYr.icon + ' ' + SYr.name + ' ' + _('for') + ' ' + AU.Synthesis.cost(g, p) + ' 📚? ' + _('Supply') + ' +' + AU.Synthesis.supplyFor(g, p) + ', ' + _('for the whole game.'), function () { if (AU.Synthesis.run(g, p, d.res)) { app.toast('🧪 ' + SYr.name + ' ' + _('synthesised.')); app.refreshPanel(); app.refreshHud(); } }); break; }
      case 'citygrow': s = g.settlements[+d.id]; if (s && G.expandTo(g, s, +d.tile)) { app.toast(_('A citizen now works that tile.')); app.panelData.tile = +d.tile; app.refreshPanel(); app.refreshHud(); app.invalidate(); } break;
      case 'enqueue': s = g.settlements[+d.id]; if (s && G.enqueue(g, s, d.kind, d.item)) { if (s.queue.length > 1) app.toast(_('Added to the queue (position') + ' ' + s.queue.length + ').'); app.refreshPanel(); } break;
      case 'yieldinfo': { var yi = AU.YIELD_INFO[d.id]; if (yi) app.info(_('Yield'), yi[0] + ' ' + _(yi[1]), _(yi[2])); break; }
      case 'toggletips': app.settings.tips = app.settings.tips === false; app.saveSettings(); app.refreshPanel(); break;
      case 'toggleresbadge': app.settings.resourceStyle = app.settings.resourceStyle === 'badge' ? 'plain' : 'badge'; app.saveSettings(); if (app.renderer) app.renderer.resourceBadge = app.settings.resourceStyle === 'badge'; app.invalidate(); app.refreshPanel(); break;
      case 'dequeue': s = g.settlements[+d.id]; if (s) { G.dequeue(g, s, +d.index); app.refreshPanel(); } break;
      case 'buy': s = g.settlements[+d.id]; if (s) { if (G.purchase(g, s, d.kind, d.item)) { app.toast('Purchased.'); var qi = s.queue.findIndex(function (q) { return q.kind === d.kind && q.id === d.item; }); if (qi >= 0 && d.kind !== 'unit') s.queue.splice(qi, 1); } else app.toast(_('Not enough gold.')); app.refreshPanel(); } break;
      case 'upgradecity': s = g.settlements[+d.id]; if (s && G.upgradeToCity(g, s)) { app.toast(s.name + ' ' + _('is now a City!')); app.refreshPanel(); } break;
      case 'specialize': s = g.settlements[+d.id]; if (s && G.specialize(g, s, d.spec)) { app.toast(s.name + ' is now a ' + G.specializationDef(G.player(g), d.spec).name + '.'); app.refreshPanel(); } break;
      case 'research': p.currentTech = d.id; app.refreshPanel(); break;
      case 'civic': p.currentCivic = d.id; app.refreshPanel(); break;
      case 'government': if (G.setGovernment(g, p, d.id)) { app.toast(_('Government changed to') + ' ' + AU.GOVERNMENTS[d.id].name + '.'); app.refreshPanel(); app.refreshHud(); } break;
      case 'war': app.confirm(_('Declare war on') + ' ' + G.civData(g.civs[+d.id]).name + '? ' + _('Other leaders will remember this.'), function () { G.declareWar(g, p.idx, +d.id); app.refreshPanel(); app.refreshHud(); }); break;
      case 'peace': { var o = g.civs[+d.id]; if (AU.AI.respondToPeaceProposal(g, o, p.idx) || (o.peaceOffer && g.turn - o.peaceOffer < 5)) { G.makePeace(g, p.idx, o.idx); o.peaceOffer = null; app.toast(G.leaderName(o) + ' accepts peace.'); } else { app.toast(G.leaderName(o) + ' refuses to make peace for now.'); o.rel[p.idx].attitude += 1; } app.refreshPanel(); break; }
      case 'gotounit': { var u = g.units[+d.id]; if (u) { app.closePanel(); app.selectUnit(u); app.renderer.centerOn(g, u.tile); } break; }
      case 'save': app.save(); break;
      case 'loadgame': if (app.load()) app.closePanel(); break;
      case 'newgame': app.closePanel(); app.g = null; app.showSetup(); break;
      case 'quit': app.confirm(_('Quit to the title screen? Your game is saved.'), function () { app.save(true); app.panel = null; $('panel').hidden = true; app.g = null; app.showTitle(); }); break;
      case 'help': app.openPanel('help'); break;
      case 'patron': { var gu = AU.Great.patronize(g, p, d.type, d.cur); if (gu) { app.toast(gu.name + ' ' + _('joins you!')); app.refreshPanel(); app.refreshHud(); } break; }
      case 'togglemusic': app.settings.music = !(app.settings.music !== false); app.saveSettings(); AU.Audio.setEnabled(app.settings.music); app.refreshPanel(); break;
      case 'musicvol': app.settings.musicVolume = Math.round(Math.max(0, Math.min(1, (AU.Audio.volume || 0) + 0.1 * (+d.d))) * 10) / 10; app.saveSettings(); AU.Audio.setVolume(app.settings.musicVolume); app.refreshPanel(); break;
      case 'pedia': app.openPanel('pedia', { cat: d.cat || app.pediaState.cat, id: d.id || null }); break;
      case 'csgift': { var gr = AU.Diplo.giftCS(g, p.idx, g.civs[+d.id]); app.toast(gr.text); app.refreshPanel(); app.refreshHud(); break; }
      case 'csbond': { var mb = g.civs[+d.id]; if (mb && AU.Society.bond(g, p, mb)) { app.toast('🤝 ' + _('Bond sealed with') + ' ' + G.civData(mb).name + '.'); app.refreshPanel(); app.refreshHud(); } break; }
      case 'csbreak': { var mk = g.civs[+d.id]; if (mk) app.confirm(_('Break the bond with') + ' ' + G.civData(mk).name + '? ' + _('-2 Happiness everywhere for 20 turns.'), function () { AU.Society.breakBond(g, p, mk); app.refreshPanel(); app.refreshHud(); }); break; }
      case 'csunion': { var mu = g.civs[+d.id]; app.confirm(G.civData(mu).name + ' ' + _('will join your empire as a Town and keep its bonus forever. Proceed?'), function () { if (AU.CityStates.union(g, p, mu)) { app.toast(G.civData(mu).name + ' ' + _('joined you!')); app.refreshPanel(); app.refreshHud(); app.invalidate(); } }); break; }
      case 'talk': if (AU.DiploUI && g.civs[+d.id]) AU.DiploUI.open(app, +d.id, { kind: 'talk' }); break;
      case 'palace': app.openPanel('palace'); break;
      case 'palacepick': app.panelData = { piece: d.piece, style: d.style }; app.refreshPanel(); break;
      case 'palacebuild': if (AU.Palace.build(g, p, d.piece, d.style)) { app.toast(_('The') + ' ' + AU.PALACE_PIECE_BY_ID[d.piece].name + ' ' + _('is built.')); app.panelData = {}; app.refreshPanel(); app.refreshHud(); } break;
      case 'relpick': app.panelData[d.what] = d.id; app.refreshPanel(); break;
      case 'pantheon': if (AU.Religion.choosePantheon(g, p, d.id)) { app.toast(_('Pantheon') + ': ' + AU.BELIEF_BY_ID[d.id].name + '.'); app.refreshPanel(); app.refreshHud(); } break;
      case 'foundrel': { var pdx = app.panelData; if (AU.Religion.found(g, p, pdx.relName, pdx.relFollower, pdx.relFounder)) { app.toast(_('Religion founded!')); app.refreshPanel(); app.refreshHud(); app.showQuotes(); } break; }
      case 'enhancerel': { var pd2 = app.panelData; if (AU.Religion.enhance(g, p, pd2.relEnh, pd2.relFollower2)) { app.toast(_('Religion enhanced.')); app.refreshPanel(); app.refreshHud(); } break; }
      case 'buyfaith': s = g.settlements[+d.id]; if (s) { var ru = AU.Religion.buyUnit(g, s, d.item); if (ru) { app.toast(ru.name + ' ' + _('purchased with Devotion.')); app.refreshPanel(); app.refreshHud(); } } break;
      case 'pediasearch': break;
      case 'civtab': app.panelData.tab = d.tab; app.refreshPanel(); break;
      case 'rankings': app.openPanel('rankings'); break;
      case 'hall': app.openPanel('hall'); break;
      case 'exportsave': app.exportSave(); break;
      case 'importsave': app.importSave(); break;
      case 'lang': app.setLanguage(d.id); break;
      case 'hallclear': app.confirm(_('Clear the whole Hall of Fame? This cannot be undone.'), function () { AU.Hall.clear(); app.refreshPanel(); }); break;
      case 'policies': app.openPanel('civics', { tab: 'policies' }); break;
      case 'policyadd': G.setPolicies(g, p, (p.policies || []).concat([d.id])); app.toast(AU.POLICIES[d.id].name + ' slotted.'); app.refreshPanel(); app.refreshHud(); break;
      case 'policyauto': { var act = p.policies || [], rest = G.availablePolicies(p).filter(function (x) { return act.indexOf(x) < 0; }).sort(function (a2, b2) { var A = AU.POLICIES[a2].fx || {}, B = AU.POLICIES[b2].fx || {}; return (B.yieldMult ? 1 : 0) - (A.yieldMult ? 1 : 0); }); G.setPolicies(g, p, act.concat(rest)); app.toast(_('Slots filled. Change any card whenever you like.')); app.refreshPanel(); app.refreshHud(); break; }
      case 'policyremove': G.setPolicies(g, p, (p.policies || []).filter(function (x) { return x !== d.id; })); app.refreshPanel(); app.refreshHud(); break;
      case 'cityview': app.openPanel('cityview', { id: +d.id }); break;
      case 'citytile': app.panelData.tile = +d.tile; app.refreshPanel(); setTimeout(function () { var cm = $('citymap'); if (cm) cm.scrollIntoView({ block: 'center' }); }, 0); break;
      case 'log': app.openPanel('log'); break;
      case 'togglegrid': app.renderer.showGrid = !app.renderer.showGrid; app.invalidate(); app.refreshPanel(); break;
      case 'toggleyields': app.settings.yields = !app.settings.yields; app.saveSettings(); if (app.renderer) app.renderer.showYields = app.settings.yields; app.invalidate(); if (app.panel === 'menu') app.refreshPanel(); if (g) app.toast(_('Tile yields') + ' ' + (app.settings.yields ? 'shown' : 'hidden') + '.'); break;
      case 'toggleiso': app.settings.iso = app.settings.iso === false; app.saveSettings(); if (app.renderer) { app.renderer.iso = app.settings.iso; app.renderer.sprites = {}; app.renderer.spriteCount = 0; } app.invalidate(); app.refreshPanel(); break;
      case 'applyupdate': app.save(true); location.reload(); break;
      case 'togglestrict': app.settings.strictTurn = !app.settings.strictTurn; app.saveSettings(); app.refreshPanel(); break;
      case 'togglegraphics': app.settings.graphics = app.settings.graphics === '3d' ? '2d' : '3d'; app.saveSettings(); app.makeRenderer(); app.refreshPanel(); break;
      case 'continueplaying': app.closePanel(); break;
    }
  };
})(globalThis.AU = globalThis.AU || {});
