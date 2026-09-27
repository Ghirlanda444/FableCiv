// Religion: the spirits of the land, Revelations, faiths with tenets, state faith, spread along roads, rivers and trade, Pilgrims,
// rites (Offering, Festival), Sacred Sites, the Holy City tithe and the Devotion victory.
(function (AU) {
  var G = AU.G;
  var R = AU.Religion = {};

  R.MAJORITY = 30;
  R.TENET_AT = [0, 250, 600]; // Devotion earned by the founder before each tenet choice (times the game speed)
  R.STATE_COOLDOWN = 20;
  R.rel = function (g, id) { return id && g.religions ? g.religions[id] : null; };
  R.icon = function (g, id) { var r = R.rel(g, id); return r ? r.icon : '🕊️'; };
  R.nameData = function (nameId) { var l = AU.FAITH_NAME_LIST || []; for (var i = 0; i < l.length; i++) if (l[i].id === nameId) return l[i]; return null; };
  R.name = function (g, id) { var r = R.rel(g, id); if (!r) return _('no faith'); var nd = R.nameData(r.nameId); return nd ? nd.name : r.name; }; // the data name follows the language
  R.religionsFounded = function (g) { return Object.keys(g.religions || {}).length; };
  R.hasTenet = function (g, id, tenet) { var r = R.rel(g, id); if (!r || !r.tenets) return false; for (var k in r.tenets) if (r.tenets[k] === tenet) return true; return false; };
  R.founded = function (g, civ) { var r = R.rel(g, civ.founded); return r && r.founder === civ.idx ? r : null; };
  function speed(g) { return G.speed(g); }

  // ---------- old saves ----------
  // Saves from before the rebuild carry pantheons, beliefs, real-world religion names, Evangelists and Faith Wardens.
  R.migrate = function (g) {
    if (g.relVersion === 2) return;
    var old = g.religions || {}, fresh = {};
    for (var id in old) {
      var o = old[id], holy = g.settlements[o.holyCity], sp = holy ? R.spiritOf(g, holy) : 'field', nm = R.pickName(g, sp, fresh, true);
      fresh[id] = { id: id, nameId: nm.id, name: nm.name, icon: nm.icon, spirit: sp, founder: o.founder, holyCity: o.holyCity, tenets: {}, turn: o.turn || 0 };
    }
    g.religions = fresh;
    g.civs.forEach(function (c) { c.pantheon = null; if (c.religion && !fresh[c.religion]) c.religion = null; if (c.religion && fresh[c.religion].founder === c.idx) c.founded = c.religion; });
    for (var uid in g.units) { var u = g.units[uid]; if (u.type === 'apostle' || u.type === 'inquisitor') { u.type = 'missionary'; u.name = AU.UNITS.missionary.name; u.charges = Math.min(2, u.charges || 1); } }
    g.relVersion = 2;
  };

  // ---------- spirits ----------
  function woodsIn(g, s) { var n = 0; s.tiles.forEach(function (i) { var t = g.tiles[i]; if (t.feature === 'forest' || t.feature === 'jungle') n++; }); return n; }
  function workedImp(g, s, list) { var civ = g.civs[s.civ], n = 0; s.tiles.forEach(function (i) { if (i === s.tile) return; var t = g.tiles[i]; if (!t.worked) return; var imp = G.improvementFor(g, t, civ); if (list.indexOf(imp) >= 0) n++; }); return n; }
  // The spirit of a settlement comes from its site and never changes.
  R.spiritOf = function (g, s) {
    if (s.spirit && s.spirit.id) return s.spirit.id;
    var t = g.tiles[s.tile], nb = G.neighbors(g, t).map(function (i) { return g.tiles[i]; }), id = 'field';
    var count = function (f) { return nb.filter(f).length; };
    if (t.river) id = 'river';
    else if (count(function (x) { return G.isWater(x); })) id = 'sea';
    else if (count(function (x) { return x.terrain === 'mountain'; })) id = 'peak';
    else if (count(function (x) { return x.feature === 'forest' || x.feature === 'jungle'; }) >= 2) id = 'wood';
    else if (count(function (x) { return x.terrain === 'desert'; }) >= 2 || t.terrain === 'desert') id = 'sun';
    else if (count(function (x) { return x.terrain === 'tundra' || x.terrain === 'snow'; }) >= 2 || t.terrain === 'tundra') id = 'frost';
    s.spirit = { id: id, mood: 0, woods: woodsIn(g, s), since: g.turn };
    return id;
  };
  R.spirit = function (g, s) { R.spiritOf(g, s); return s.spirit; };
  // A Sacred Site: made by a Great Prophet, or any settlement with a Wonder for Suryavarman II
  R.isSacred = function (g, s) { if (s.sacred) return true; var c = g.civs[s.civ]; if (!c || !G.civFx(g, c).wonderSacred) return false; for (var w in g.wonders) if (g.wonders[w] === s.id) return true; return false; };
  R.spiritLikes = function (g, s) {
    switch (R.spiritOf(g, s)) {
      case 'river': return s.tiles.filter(function (i) { return i !== s.tile && g.tiles[i].river && g.tiles[i].worked; }).length >= 3;
      case 'sea': return s.tiles.filter(function (i) { return G.isWater(g.tiles[i]) && g.tiles[i].worked; }).length >= 2;
      case 'peak': return workedImp(g, s, ['mine', 'quarry']) >= 1;
      case 'wood': return woodsIn(g, s) >= 4;
      case 'sun': return G.hasBuilding(s, 'shrine') || G.hasBuilding(s, 'temple') || Object.keys(g.wonders || {}).some(function (w) { return g.wonders[w] === s.id; });
      case 'frost': return workedImp(g, s, ['camp', 'pasture']) >= 1;
      default: return workedImp(g, s, ['farm']) >= 3;
    }
  };
  R.smokeOf = function (g, s) { return g.v2 && AU.Smoke ? AU.Smoke.smoke(g, s) : 0; };
  // Why the spirit is angry, or null
  R.spiritHates = function (g, s) {
    var sp = R.spiritOf(g, s), smoke = R.smokeOf(g, s), warmth = g.v2 && AU.Climate ? AU.Climate.state(g).warmth || 0 : 0;
    if (sp === 'river' ? smoke > 1 : smoke >= 4) return 'smoke';
    if (sp === 'wood' && woodsIn(g, s) < (s.spirit.woods || 0) - 1) return 'woods';
    if (sp === 'field' && s.foodSurplus != null && s.foodSurplus < 0) return 'hunger';
    if ((sp === 'frost' && warmth >= 1) || (sp === 'sea' && warmth >= 2)) return 'warm';
    if (sp === 'sun' && warmth <= -1) return 'cold';
    if (sp === 'peak' && s.tiles.some(function (i) { return G.unitsAt(g, i).some(function (u) { return u.civ >= 0 && u.civ !== s.civ && G.isMilitary(u) && G.atWar(g, u.civ, s.civ); }); })) return 'enemies';
    return null;
  };
  // Once a turn: pleased (1), quiet (0) or angry (-1). An Offering or a Sacred Site keeps it pleased.
  R.spiritTurn = function (g, s) {
    var sp = R.spirit(g, s), before = sp.mood, hate = null;
    var owner = g.civs[s.civ], blessed = s.isCapital && owner && G.civFx(g, owner).capitalBlessed; // Pakal: the capital's spirit
    if (R.isSacred(g, s) || blessed || (sp.offerUntil || 0) > g.turn) sp.mood = 1;
    else if ((hate = R.spiritHates(g, s))) sp.mood = -1;
    else sp.mood = R.spiritLikes(g, s) && (s.pop < 8 || G.hasBuilding(s, 'shrine') || G.hasBuilding(s, 'temple')) ? 1 : 0; // a big settlement needs a Shrine to hear its spirit
    if (hate !== 'woods') sp.woods = Math.max(sp.woods || 0, woodsIn(g, s)); // the wood spirit remembers the most trees it had
    if (sp.mood !== before) {
      var civ = g.civs[s.civ], S = AU.SPIRITS[sp.id];
      if (civ && civ.isPlayer && sp.mood === -1) G.notify(g, civ, { kind: 'faith', text: S.icon + ' ' + _('The spirit of') + ' ' + s.name + ' ' + _('is angry') + ' (' + R.hateText(hate) + ').', tile: s.tile, settlement: s.id });
      if (civ && civ.isPlayer && sp.mood === 1 && before === -1) G.notify(g, civ, { kind: 'faith', text: S.icon + ' ' + _('The spirit of') + ' ' + s.name + ' ' + _('is pleased again.'), tile: s.tile, settlement: s.id });
    }
  };
  R.hateText = function (h) { return ({ smoke: _('Smoke'), woods: _('woods cut down'), hunger: _('hunger'), warm: _('the world is too warm'), cold: _('the world is too cold'), enemies: _('enemy soldiers in its land') })[h] || ''; };
  R.MOOD_NAMES = { '-1': 'Angry', '0': 'Quiet', '1': 'Pleased' };
  R.moodName = function (m) { return _(R.MOOD_NAMES[String(m || 0)]); };

  // Yields a settlement gets from its spirit, its faith and the rites (read by G.settlementYields; moods are set once a turn).
  R.settlementYields = function (g, s) {
    var y = { food: 0, production: 0, gold: 0, culture: 0, faith: 0, happiness: 0 }, civ = g.civs[s.civ];
    if (!civ || civ.minor) return y;
    var sp = R.spirit(g, s), gift = AU.SPIRITS[sp.id].gift, relId = s.religion;
    var stewards = R.hasTenet(g, relId, 'stewards');
    if (sp.mood === 1) { for (var k in gift) y[k] += gift[k] * (stewards ? 2 : 1); y.faith += 1; }
    else if (sp.mood === -1) { y.happiness -= stewards ? 1 : 2; y.faith -= 1; }
    if (R.isSacred(g, s)) { y.faith += 3; y.culture += 2; }
    if (relId && civ.religion === relId) y.happiness += 1; // the settlement follows the state faith
    if (relId && R.hasTenet(g, relId, 'builders')) {
      y.production += (G.hasBuilding(s, 'shrine') ? 2 : 0) + (G.hasBuilding(s, 'temple') ? 2 : 0);
      for (var w in g.wonders) if (g.wonders[w] === s.id) y.faith += 2;
    }
    if (relId && R.hasTenet(g, relId, 'humility')) { y.happiness += 2; y.culture += 1; }
    var rel = R.rel(g, relId); if (rel && rel.holyCity === s.id) y.faith += 2;
    if ((civ.festivalUntil || 0) > g.turn) y.happiness += 2;
    return y;
  };

  // Empire effects from the state faith's tenets (merged into G.civFx).
  R.civFx = function (g, civ) {
    var out = [];
    if (R.hasTenet(g, civ.religion, 'zeal')) out.push({ combatBonusVsOtherReligion: 4 });
    return out;
  };
  R.fxKey = function (g, civ) { var rel = R.rel(g, civ.religion); return (civ.religion || '') + '|' + (rel && rel.tenets ? Object.keys(rel.tenets).map(function (k) { return rel.tenets[k]; }).join(',') : ''); };
  R.followerCount = function (g, relId, civIdx) { var n = 0; for (var id in g.settlements) { var s = g.settlements[id]; if (s.religion === relId && (civIdx === undefined || s.civ === civIdx)) n++; } return n; };
  R.foreignFollowerCount = function (g, relId, civIdx) { var n = 0; for (var id in g.settlements) { var s = g.settlements[id]; if (s.religion === relId && s.civ !== civIdx) n++; } return n; };

  // ---------- Revelation: an empire's own faith ----------
  R.revelationCost = function (g) { return Math.round(100 * (1 + 0.5 * R.religionsFounded(g)) * speed(g)); };
  // A people that already follows another faith (a state faith, or half its settlements) receives no Revelation of its own.
  R.converted = function (g, civ) { if (civ.religion && !R.founded(g, civ)) return true; var sets = G.civSettlements(g, civ.idx), n = sets.filter(function (s) { return s.religion; }).length; return sets.length > 0 && n * 2 >= sets.length; };
  R.canReveal = function (g, civ) {
    if (!civ.alive || civ.minor || R.founded(g, civ) || R.converted(g, civ) || (civ.faithTotal || 0) < R.revelationCost(g)) return false;
    return G.civSettlements(g, civ.idx).some(function (s) { return s.spirit && s.spirit.mood === 1; });
  };
  R.pickName = function (g, spirit, taken, skipWorld) {
    var used = {}; [skipWorld ? {} : g.religions || {}, taken || {}].forEach(function (m) { for (var k in m) used[m[k].nameId] = 1; });
    var list = (AU.FAITH_NAMES[spirit] || []).concat(AU.FAITH_NAME_LIST);
    for (var i = 0; i < list.length; i++) if (!used[list[i].id]) return list[i];
    var n = R.religionsFounded(g) + 1; return { id: 'faith' + n, name: _('Faith') + ' ' + n, icon: '🕊️' };
  };
  R.reveal = function (g, civ) {
    if (!R.canReveal(g, civ)) return null;
    var sets = G.civSettlements(g, civ.idx).filter(function (s) { return s.spirit && s.spirit.mood === 1; });
    var worth = function (s) { return (R.isSacred(g, s) ? 10 : 0) + (G.hasBuilding(s, 'temple') ? 3 : 0) + (G.hasBuilding(s, 'shrine') ? 2 : 0) + (s.isCapital ? 1 : 0) + s.pop * 0.1; };
    sets.sort(function (a, b) { return worth(b) - worth(a); });
    var holy = sets[0], sp = R.spiritOf(g, holy), nm = R.pickName(g, sp);
    g.religions = g.religions || {};
    var id = nm.id, rel = { id: id, nameId: nm.id, name: nm.name, icon: nm.icon, spirit: sp, founder: civ.idx, holyCity: holy.id, tenets: {}, turn: g.turn };
    g.religions[id] = rel; civ.founded = id; civ.religion = id; civ.stateSince = g.turn; civ._fx = null; g.fxGen = (g.fxGen || 0) + 1;
    R.setMajority(g, holy, id); holy.pressure[id] = Math.max(holy.pressure[id], 200);
    var S = AU.SPIRITS[sp];
    G.notify(g, civ, { kind: 'faith', text: _('A Revelation in') + ' ' + holy.name + '! ' + S.icon + ' ' + rel.icon + ' ' + rel.name + ' ' + _('is born. Choose its first tenet.'), panel: 'religion' });
    g.civs.forEach(function (o) { if (o.isPlayer && o.idx !== civ.idx && o.met[civ.idx]) G.notify(g, o, { kind: 'faith', text: G.civData(civ).name + ': ' + rel.icon + ' ' + rel.name + ' ' + _('is born in') + ' ' + holy.name + '.', panel: 'religion' }); });
    G.log(g, G.civData(civ).name + ' founded ' + rel.name + ' in ' + holy.name + '.', civ.idx);
    if (civ.isPlayer) G.quote(g, civ, 'religion', 'founded', rel.name, _('A Revelation'));
    civ.flags['ev:religion'] = g.turn;
    return rel;
  };
  // The tenet group the founder may decide now, or null
  R.pendingTenet = function (g, civ) {
    var rel = R.founded(g, civ); if (!rel) return null;
    for (var i = 0; i < AU.TENETS.length; i++) {
      var T = AU.TENETS[i]; if (rel.tenets[T.id]) continue;
      return (civ.faithTotal || 0) >= R.TENET_AT[i] * speed(g) ? T : null;
    }
    return null;
  };
  R.nextTenetAt = function (g, civ) { var rel = R.founded(g, civ); if (!rel) return null; for (var i = 0; i < AU.TENETS.length; i++) if (!rel.tenets[AU.TENETS[i].id]) return Math.round(R.TENET_AT[i] * speed(g)); return null; };
  R.chooseTenet = function (g, civ, optId) {
    var T = R.pendingTenet(g, civ); if (!T) return false;
    var opt = T.options.filter(function (o) { return o.id === optId; })[0]; if (!opt) return false;
    var rel = R.founded(g, civ); rel.tenets[T.id] = optId; g.fxGen = (g.fxGen || 0) + 1; g.civs.forEach(function (c) { c._fx = null; });
    G.log(g, rel.name + ': ' + opt.name + '.', civ.idx);
    if (civ.isPlayer) G.notify(g, civ, { kind: 'faith', text: rel.icon + ' ' + rel.name + ': ' + opt.name + '.', panel: 'religion' });
    return true;
  };

  // ---------- state faith ----------
  R.adoptWhy = function (g, civ, id) {
    if (!R.rel(g, id)) return _('No such faith.');
    if (civ.religion === id) return _('Already your state faith.');
    var own = R.founded(g, civ); if (own && R.followerCount(g, own.id, civ.idx) > 0) return _('You keep the faith you founded while your settlements follow it.');
    if (g.turn - (civ.stateSince == null ? -999 : civ.stateSince) < R.STATE_COOLDOWN) return _('You changed your state faith recently.');
    if (!G.civSettlements(g, civ.idx).some(function (s) { return s.religion === id; })) return _('None of your settlements follows it.');
    return '';
  };
  R.canAdopt = function (g, civ, id) { return !R.adoptWhy(g, civ, id); };
  R.adopt = function (g, civ, id) {
    if (!R.canAdopt(g, civ, id)) return false;
    civ.religion = id; civ.stateSince = g.turn; civ._fx = null; g.fxGen = (g.fxGen || 0) + 1;
    var rel = R.rel(g, id);
    G.log(g, G.civData(civ).name + ' adopted ' + rel.name + ' as state faith.', civ.idx);
    if (civ.isPlayer) G.notify(g, civ, { kind: 'faith', text: rel.icon + ' ' + rel.name + ' ' + _('is now your state faith.'), panel: 'religion' });
    var f = g.civs[rel.founder]; if (f && f.isPlayer && f.idx !== civ.idx) G.notify(g, f, { kind: 'faith', text: G.civData(civ).name + ' ' + _('adopted your faith') + ' ' + rel.name + '.', panel: 'religion' });
    return true;
  };
  // Faiths followed in an empire's settlements: [{id, n}], most first
  R.faithsIn = function (g, civ) {
    var c = {}; G.civSettlements(g, civ.idx).forEach(function (s) { if (s.religion) c[s.religion] = (c[s.religion] || 0) + 1; });
    return Object.keys(c).map(function (k) { return { id: k, n: c[k] }; }).sort(function (a, b) { return b.n - a.n; });
  };

  // ---------- spread ----------
  R.majority = function (s) {
    var best = null, bv = 0, p = s.pressure || {};
    for (var id in p) if (p[id] > bv) { bv = p[id]; best = id; }
    return best && bv >= R.MAJORITY ? best : null;
  };
  R.addPressure = function (g, s, relId, amount) { if (!relId || !s) return; s.pressure = s.pressure || {}; s.pressure[relId] = (s.pressure[relId] || 0) + amount; R.updateMajority(g, s); };
  R.setMajority = function (g, s, relId) { var p = s.pressure = s.pressure || {}, top = 0; for (var k in p) if (k !== relId) top = Math.max(top, p[k]); p[relId] = Math.max(p[relId] || 0, top + 1, R.MAJORITY); R.updateMajority(g, s); };
  R.updateMajority = function (g, s) {
    var before = s.religion || null, after = R.majority(s);
    if (before === after) return;
    s.religion = after;
    var civ = g.civs[s.civ];
    if (civ && civ.isPlayer) G.notify(g, civ, { kind: 'faith', text: s.name + (after ? ' ' + _('now follows') + ' ' + R.icon(g, after) + ' ' + R.name(g, after) + '.' : ' ' + _('lost its faith.')), tile: s.tile, settlement: s.id });
    if (after) { var rel = R.rel(g, after); if (rel && g.civs[rel.founder] && g.civs[rel.founder].isPlayer && rel.founder !== s.civ) G.notify(g, g.civs[rel.founder], { kind: 'faith', text: rel.name + ' ' + _('spread to') + ' ' + s.name + '.', tile: s.tile }); }
    if (civ) civ._fx = null;
    g.fxGen = (g.fxGen || 0) + 1;
  };
  // Settlement pairs joined by a finished road (the links of each empire's road plan)
  R.roadLinks = function (g) {
    var out = {};
    g.civs.forEach(function (c) { if (!c.roadPlan || !c.roadPlan.paths) return; c.roadPlan.paths.forEach(function (p) { if (!p || p.length < 2) return; if (!p.every(function (i) { return g.tiles[i].road; })) return; var a = p[0], b = p[p.length - 1]; out[a + '-' + b] = 1; out[b + '-' + a] = 1; }); });
    return out;
  };
  R.RANGE = 8; R.ROAD_RANGE = 12; R.CAP = 300; // a settlement holds at most 300 pressure in all: a faith gains ground only by pushing harder than the others
  // How hard one settlement's faith pushes on another this turn (0 when out of reach)
  R.push = function (g, src, dst, roads) {
    var rel = R.rel(g, src.religion); if (!rel) return 0;
    var d = G.dist(g.tiles[src.tile], g.tiles[dst.tile]), road = !!(roads && roads[src.tile + '-' + dst.tile]);
    if (d > (road ? R.ROAD_RANGE : R.RANGE)) return 0;
    var owner = g.civs[src.civ], fx = owner ? G.civFx(g, owner) : {};
    var v = (src.id === rel.holyCity ? 3 : 1) * (1 + src.pop / 10) * (R.isSacred(g, src) ? 2 : 1) * (fx.spreadMult || 1);
    if (R.hasTenet(g, rel.id, 'open')) v *= 1.5;
    v *= road ? 2 : d <= 3 ? 1 : d <= 6 ? 0.6 : 0.3;
    if (g.tiles[src.tile].river && g.tiles[dst.tile].river) v *= 1.5; // stories travel along the river
    if (dst.religion && dst.religion !== rel.id && R.hasTenet(g, dst.religion, 'zeal')) v *= 0.5;
    return v;
  };
  R.spreadTurn = function (g) {
    if (g.relVersion !== 2) R.migrate(g);
    var sets = Object.keys(g.settlements).map(function (k) { return g.settlements[k]; });
    sets.forEach(function (s) { if (g.civs[s.civ] && !g.civs[s.civ].minor) R.spiritTurn(g, s); });
    if (!R.religionsFounded(g)) return;
    var roads = R.roadLinks(g), add = [];
    sets.forEach(function (src) { if (!src.religion) return; sets.forEach(function (dst) { if (dst === src) return; var v = R.push(g, src, dst, roads); if (v > 0) add.push([dst, src.religion, v]); }); });
    // trade and kinship carry the state faith: a Caravan parked in a free city, a Bond
    g.civs.forEach(function (c) {
      if (!c.alive || c.minor || !R.rel(g, c.religion)) return;
      var cfx = G.civFx(g, c);
      G.civUnits(g, c.idx).forEach(function (u) { if (u.route == null) return; var m = g.civs[u.route], s = m && G.civSettlements(g, m.idx)[0]; if (s) add.push([s, c.religion, 4 * (cfx.caravanFaith || 1)]); });
      if (cfx.friendFaith && AU.Diplo) g.civs.forEach(function (o) { if (o === c || !o.alive || o.minor || !AU.Diplo.isFriend(g, c.idx, o.idx)) return; var cap = o.capital && g.settlements[o.capital]; if (cap) add.push([cap, c.religion, cfx.friendFaith]); }); // Jadwiga: friendship carries the faith
      if (g.v2 && AU.Society && AU.Society.bondsOf) AU.Society.bondsOf(g, c).forEach(function (m) { var s = G.civSettlements(g, m.idx)[0]; if (s) add.push([s, c.religion, 3]); });
    });
    // conviction: a settlement keeps telling its own faith's story to itself
    sets.forEach(function (s) { var rel = R.rel(g, s.religion); if (rel) add.push([s, rel.id, (s.id === rel.holyCity ? 3 : 1) * (1 + s.pop / 10) * 2]); });
    add.forEach(function (a) { var s = a[0]; s.pressure = s.pressure || {}; s.pressure[a[1]] = (s.pressure[a[1]] || 0) + a[2]; });
    sets.forEach(function (s) {
      if (!s.pressure) return;
      var tot = 0;
      for (var id in s.pressure) { if (!g.religions[id]) { delete s.pressure[id]; continue; } if (id !== s.religion) s.pressure[id] = Math.max(0, s.pressure[id] - 0.2); tot += s.pressure[id]; }
      if (tot > R.CAP) for (var id2 in s.pressure) s.pressure[id2] *= R.CAP / tot;
      R.updateMajority(g, s);
    });
  };

  // ---------- Pilgrims ----------
  R.unitDef = function (id) { return AU.UNITS[id] && AU.UNITS[id].religious ? AU.UNITS[id] : null; };
  R.unitCost = function (g, civ, id) { var d = R.unitDef(id); return d ? Math.round(d.faithCost * speed(g) * (G.civFx(g, civ).religiousUnitCostMult || 1)) : 0; };
  R.buyWhy = function (g, s, id) {
    var civ = g.civs[s.civ]; if (!R.unitDef(id)) return _('Not a Devotion unit.');
    if (!R.rel(g, civ.religion)) return _('You need a state faith.');
    if (s.religion !== civ.religion) return _('This settlement does not follow your state faith.');
    if ((civ.faith || 0) < R.unitCost(g, civ, id)) return _('Not enough Devotion.');
    return '';
  };
  R.canBuyUnit = function (g, s, id) { return !R.buyWhy(g, s, id); };
  R.buyUnit = function (g, s, id) {
    if (!R.canBuyUnit(g, s, id)) return null;
    var civ = g.civs[s.civ], d = R.unitDef(id), fx = G.civFx(g, civ);
    civ.faith -= R.unitCost(g, civ, id);
    return G.spawnUnit(g, civ.idx, id, s.tile, { charges: d.charges + (fx.missionaryCharges || 0), religion: civ.religion });
  };
  R.spreadStrength = function (g, u) { var civ = g.civs[u.civ]; return 100 + ((civ && G.civFx(g, civ).pilgrimStrength) || 0); };
  R.canSpread = function (g, u) { var d = R.unitDef(u.type); if (!d || u.charges <= 0 || u.moves <= 0 || !R.rel(g, u.religion)) return false; var s = G.settlementAt(g, u.tile); if (!s || s.religion === u.religion) return false; if (s.civ !== u.civ && G.atWar(g, u.civ, s.civ)) return false; return true; };
  R.spread = function (g, u) {
    if (!R.canSpread(g, u)) return false;
    var s = G.settlementAt(g, u.tile), host = g.civs[s.civ];
    R.addPressure(g, s, u.religion, R.spreadStrength(g, u));
    if (host && host.idx !== u.civ && !host.minor && host.religion !== u.religion) { host.preachedBy = host.preachedBy || {}; host.preachedBy[u.civ] = g.turn; }
    u.charges--; u.moves = 0;
    if (u.charges <= 0) G.removeUnit(g, u);
    var owner = g.civs[u.civ]; if (owner) owner.flags['ev:spread'] = g.turn;
    return true;
  };
  // Leaders of another faith resent pilgrims preaching in their settlements for 20 turns
  R.preachedRecently = function (g, host, by) { return !!(host.preachedBy && host.preachedBy[by] != null && g.turn - host.preachedBy[by] <= 20); };

  // ---------- rites ----------
  R.offeringCost = function (g) { return Math.round(25 * speed(g)); };
  R.canOffer = function (g, civ, s) { if (!s || s.civ !== civ.idx) return false; return R.spirit(g, s).mood < 1 && (civ.faith || 0) >= R.offeringCost(g); };
  R.offer = function (g, civ, s) {
    if (!R.canOffer(g, civ, s)) return false;
    civ.faith -= R.offeringCost(g); var sp = R.spirit(g, s); sp.offerUntil = g.turn + 20; sp.mood = 1;
    G.log(g, G.civData(civ).name + ' made an Offering in ' + s.name + '.', civ.idx);
    return true;
  };
  R.festivalCost = function (g, civ) { return Math.round((40 + 10 * G.civSettlements(g, civ.idx).length) * speed(g)); };
  R.canFestival = function (g, civ) { return (civ.faith || 0) >= R.festivalCost(g, civ) && g.turn >= (civ.festivalReady || 0); };
  R.festival = function (g, civ) {
    if (!R.canFestival(g, civ)) return false;
    civ.faith -= R.festivalCost(g, civ); civ.festivalUntil = g.turn + 8; civ.festivalReady = g.turn + 30;
    G.log(g, G.civData(civ).name + ' held a Festival.', civ.idx);
    return true;
  };

  // ---------- per turn ----------
  R.tithe = function (g, civ) {
    var out = { gold: 0, culture: 0 };
    for (var id in (g.religions || {})) {
      var rel = g.religions[id], holy = g.settlements[rel.holyCity]; if (!holy || holy.civ !== civ.idx) continue;
      out.gold += R.followerCount(g, id) * (R.hasTenet(g, id, 'tithe') ? 2 : 1); out.culture += R.foreignFollowerCount(g, id, civ.idx);
    }
    return out;
  };
  R.turn = function (g, civ) {
    if (!civ.alive) return;
    var y = civ._turnFaith || 0, fx = G.civFx(g, civ), mine = civ.religion;
    if (R.rel(g, mine)) { // settlements anywhere that follow your state faith
      var all = R.followerCount(g, mine), ff = R.foreignFollowerCount(g, mine, civ.idx);
      y += (fx.faithPerFollowerSettlement || 0) * all + (fx.faithPerForeignFollower || 0) * ff;
      civ.bonusCulture = (civ.bonusCulture || 0) + (fx.culturePerFollowerSettlement || 0) * all;
      civ.bonusScience = (civ.bonusScience || 0) + (fx.sciencePerFollowerSettlement || 0) * all;
      civ.gold += (fx.goldPerFollowerSettlement || 0) * all;
    }
    var ti = R.tithe(g, civ); civ.gold += ti.gold; civ.bonusCulture = (civ.bonusCulture || 0) + ti.culture; // the Holy City tithe goes to whoever holds it
    civ.faith = Math.max(0, (civ.faith || 0) + y); civ.faithTotal = (civ.faithTotal || 0) + Math.max(0, y);
    if (!civ.minor && R.canReveal(g, civ)) R.reveal(g, civ);
    if (civ.isPlayer) {
      var T = R.pendingTenet(g, civ);
      if (T && civ.flags['n:tenet'] !== T.id) { civ.flags['n:tenet'] = T.id; G.notify(g, civ, { kind: 'faith', text: _('Your faith is ready for a new tenet') + ': ' + T.name + '.', panel: 'religion' }); }
      if (!civ.religion) { var fi = R.faithsIn(g, civ)[0]; if (fi && civ.flags['n:adopt'] !== fi.id && R.canAdopt(g, civ, fi.id)) { civ.flags['n:adopt'] = fi.id; G.notify(g, civ, { kind: 'faith', text: R.icon(g, fi.id) + ' ' + R.name(g, fi.id) + ' ' + _('is followed in your settlements: you can adopt it as your state faith.'), panel: 'religion' }); } }
    }
  };

  // ---------- Devotion victory ----------
  // From the Puffstack Age (the Industrial era in classic rules): 60% of the world's settlements follow your faith and every other
  // living empire holds it as state faith, for 10 turns in a row.
  R.VICTORY_TURNS = 10;
  R.victoryEra = function (g, civ) { return g.v2 && AU.MasteryWeb ? AU.MasteryWeb.state(civ).era >= 4 : (civ.era || 0) >= 4; };
  R.victoryState = function (g, id) {
    var rel = R.rel(g, id); if (!rel) return null;
    var others = g.civs.filter(function (c) { return c.alive && !c.minor && c.idx !== rel.founder; });
    var allS = 0, folS = 0; for (var sid in g.settlements) { var s = g.settlements[sid]; if (!g.civs[s.civ] || g.civs[s.civ].minor) continue; allS++; if (s.religion === id) folS++; }
    var state = others.filter(function (c) { return c.religion === id; }).length, needState = others.length;
    return { share: allS ? folS / allS : 0, followers: folS, total: allS, state: state, needState: needState, others: others.length, ok: others.length > 0 && folS >= allS * 0.6 && state >= needState };
  };
  R.checkVictory = function (g) {
    if (!g.religions) return null;
    g.faithStreak = g.faithStreak || {};
    for (var id in g.religions) {
      var rel = g.religions[id], founder = g.civs[rel.founder]; if (!founder || !founder.alive || !R.victoryEra(g, founder)) continue;
      var st = R.victoryState(g, id), k = g.faithStreak[id] || { turn: -1, n: 0 };
      if (k.turn !== g.turn) { k = { turn: g.turn, n: st.ok ? k.n + 1 : 0 }; g.faithStreak[id] = k; }
      if (k.n >= R.VICTORY_TURNS) return { type: 'religion', civ: rel.founder, turn: g.turn };
    }
    return null;
  };
  // Rows for the rankings: every other empire and whether it holds the faith as state faith
  R.victoryProgress = function (g, civ) {
    var rel = R.founded(g, civ); if (!rel) return null;
    var rows = [];
    g.civs.forEach(function (c) { if (!c.alive || c.minor || c.idx === civ.idx) return; var sets = G.civSettlements(g, c.idx); rows.push({ civ: c, followers: sets.filter(function (s) { return s.religion === rel.id; }).length, total: sets.length, ok: c.religion === rel.id }); });
    return rows;
  };
})(globalThis.AU = globalThis.AU || {});
