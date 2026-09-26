// v2 Mastery Web engine: nodes unlock from what the empire actually does (thresholds, sustained states, discoveries),
// exclusivity pairs lock their partner for the whole game, unlocking a node can fire a narrative hub event whose
// branch becomes a permanent trait. Runs for every empire each turn; effects merge into G.civFx.
(function (AU) {
  var G = AU.G, MW = AU.MasteryWeb = {};
  function st(civ) { return civ.v2 || (civ.v2 = { era: 0, unlocked: {}, locked: {}, streak: {}, traits: {}, hubsFired: {}, pendingHubs: [], study: 0, log: [] }); }
  MW.state = st;
  MW.nodesOfEra = function (era) { return AU.V2.NODES.filter(function (n) { return n.era === era; }); };
  MW.openNodes = function (era) { return AU.V2.NODES.filter(function (n) { return n.era <= era; }); }; // earlier eras stay sparkable
  MW.status = function (civ, id) { var s = st(civ); return s.unlocked[id] ? 'unlocked' : s.locked[id] ? 'locked_permanent' : 'locked_unmet'; };
  // Extra conditions on top of G.condMet (the Sparks vocabulary): exploration, roads, streak events and per-turn facts.
  MW.cond = function (g, civ, cond) {
    var type = cond[0], a = cond[1], n = cond[2] || 1, sets = G.civSettlements(g, civ.idx);
    switch (type) {
      case 'explored': { var c = 0; for (var i = 0; i < civ.explored.length; i++) c += civ.explored[i]; return c >= a; }
      case 'exploredContinent': { var cc = G.capitalContinent(g, civ); if (cc < 0) return false; var tot = 0, seen = 0; for (var k = 0; k < g.tiles.length; k++) if (g.tiles[k].continent === cc) { tot++; if (civ.explored[k]) seen++; } return tot > 0 && seen / tot * 100 >= a; }
      case 'roads': { var r = 0; for (var q = 0; q < g.tiles.length; q++) if (g.tiles[q].road && g.tiles[q].owner >= 0 && G.tileOwnerCiv(g, g.tiles[q]) === civ.idx) r++; return r >= a; }
      case 'riverTiles': { var rv = 0; sets.forEach(function (s) { s.tiles.forEach(function (ti) { if (g.tiles[ti].worked && g.tiles[ti].river) rv++; }); }); return rv >= a; }
      case 'unitsBuilt': return (civ.unitsBuilt || 0) >= a;
      case 'farSettlement': { var cap = civ.capital && g.settlements[civ.capital]; if (!cap) return false; return sets.some(function (s) { return s.id !== cap.id && G.dist(g.tiles[s.tile], g.tiles[cap.tile]) >= a; }); }
      case 'event': { // per-turn facts computed here; one-shot flags fall through to the Sparks flags
        var y;
        switch (a) {
          case 'combat': return !!(civ.flags['ev:combat'] || civ.stats.kills || civ.flags['ev:unitLost']);
          case 'undamaged': return sets.length > 0 && sets.every(function (s) { return s.attackedTurn < g.turn - 1; });
          case 'content': return sets.length > 0 && sets.every(function (s) { return (G.settlementYields(g, s).happiness || 0) >= 0; });
          case 'foodSurplus': y = G.civYields(g, civ); return sets.length > 0 && y.food > 0;
          case 'cultureSurplus': y = G.civYields(g, civ); return y.culture > 0;
          case 'scienceSurplus': y = G.civYields(g, civ); return y.science > 0;
          case 'peacefulContact': return Object.keys(civ.met).length > 0 && !civ.flags['ev:combat'] && !civ.stats.kills;
          case 'natural': for (var f in civ.flags) if (f.indexOf('nat:') === 0) return true; return false;
          case 'meetCS': return g.civs.some(function (c) { return c.minor && civ.met[c.idx]; });
          case 'kinfolkFriend': return g.civs.some(function (c) { return c.minor && civ.met[c.idx] && !civ.rel[c.idx].war && (AU.CityStates && AU.CityStates.tiesOf ? AU.CityStates.tiesOf(g, civ, c) >= 10 : true); });
          case 'roadLink': { var roadS = sets.filter(function (s) { return G.neighbors(g, g.tiles[s.tile]).some(function (ti) { return g.tiles[ti].road; }); }); return roadS.length >= 2; }
          case 'noTrade': return !(AU.CityStates && AU.CityStates.caravans && AU.CityStates.caravans(g, civ).length);
          case 'caravan': return !!(AU.CityStates && AU.CityStates.caravans && AU.CityStates.caravans(g, civ).length) || !!civ.flags['ev:caravan'];
          case 'settlementAttacked': return sets.some(function (s2) { return s2.attackedTurn >= 0; });
          case 'peace': return !g.civs.some(function (o) { return o.alive && o.idx !== civ.idx && civ.rel[o.idx] && civ.rel[o.idx].war; });
          case 'unitLost': return !!civ.flags['ev:unitLost'];
          case 'boatLost': return !!civ.flags['ev:boatLost'];
          case 'disaster': return !!civ.flags['ev:disaster'];
          default: return G.condMet(g, civ, cond);
        }
      }
      default: return G.condMet(g, civ, cond);
    }
  };
  // How far along a Spark is: { have, need, ratio } for countable triggers, streak turns for sustained ones, null when it is a plain yes/no.
  MW.progress = function (g, civ, node) {
    var s = st(civ), tr = node.trigger, c = tr.cond, type = c[0], a = c[1], n = c[2] || 1, sets = G.civSettlements(g, civ.idx), units = G.civUnits(g, civ.idx);
    if (s.unlocked[node.id]) return { have: 1, need: 1, ratio: 1, done: true };
    if (tr.turns) { var have = s.streak[node.id] || 0; return { have: have, need: tr.turns, ratio: Math.min(1, have / tr.turns), turns: true }; }
    function anyOf(v) { return String(a).split('|').indexOf(v) >= 0; }
    var have2 = null, need2 = null;
    switch (type) {
      case 'pop': have2 = sets.reduce(function (m, x) { return Math.max(m, x.pop); }, 0); need2 = a; break;
      case 'totalPop': have2 = sets.reduce(function (t, x) { return t + x.pop; }, 0); need2 = a; break;
      case 'improvement': { var ci = 0; sets.forEach(function (x) { x.tiles.forEach(function (i) { var t = g.tiles[i]; if (t.worked && i !== x.tile && anyOf(G.improvementFor(g, t, civ) || '')) ci++; }); }); have2 = ci; need2 = n; break; }
      case 'improvedTiles': { var c2 = 0; sets.forEach(function (x) { x.tiles.forEach(function (i) { if (g.tiles[i].worked && i !== x.tile) c2++; }); }); have2 = c2; need2 = a; break; }
      case 'coastal': have2 = sets.filter(function (x) { return G.isCoastal(g, x); }).length; need2 = a; break;
      case 'building': { var cb = 0; sets.forEach(function (x) { if (G.hasBuilding(x, a)) cb++; }); have2 = cb; need2 = n; break; }
      case 'met': have2 = Object.keys(civ.met).length; need2 = a; break;
      case 'tiles': { var c3 = 0; sets.forEach(function (x) { x.tiles.forEach(function (i) { var t = g.tiles[i]; if ((a === 'hills' && t.hills) || t.terrain === a) c3++; }); }); have2 = c3; need2 = n; break; }
      case 'feature': { var c4 = 0; sets.forEach(function (x) { x.tiles.forEach(function (i) { if (anyOf(g.tiles[i].feature || '')) c4++; }); }); have2 = c4; need2 = n; break; }
      case 'kills': have2 = civ.stats.kills || 0; need2 = a; break;
      case 'captures': have2 = civ.stats.captures || 0; need2 = a; break;
      case 'resourcekind': { var lc = G.luxuryCount(g, civ); have2 = a === 'luxury' ? lc.luxuries.length : Object.keys(lc.strategic).length; need2 = n; break; }
      case 'gold': have2 = Math.floor(civ.gold); need2 = a; break;
      case 'unit': have2 = units.filter(function (u) { return u.type === a; }).length; need2 = n; break;
      case 'unitcls': have2 = units.filter(function (u) { return anyOf(AU.UNITS[u.type].cls); }).length; need2 = n; break;
      case 'military': have2 = units.filter(G.isMilitary).length; need2 = a; break;
      case 'settlements': have2 = sets.length; need2 = a; break;
      case 'cities': have2 = sets.filter(function (x) { return x.isCity; }).length; need2 = a; break;
      case 'explored': { var ce = 0; for (var i2 = 0; i2 < civ.explored.length; i2++) ce += civ.explored[i2]; have2 = ce; need2 = a; break; }
      case 'exploredContinent': { var cc = G.capitalContinent(g, civ); if (cc >= 0) { var tot = 0, seen = 0; for (var k = 0; k < g.tiles.length; k++) if (g.tiles[k].continent === cc) { tot++; if (civ.explored[k]) seen++; } have2 = tot ? Math.round(seen / tot * 100) : 0; need2 = a; } break; }
      case 'riverTiles': { var rv = 0; sets.forEach(function (x) { x.tiles.forEach(function (ti) { if (g.tiles[ti].worked && g.tiles[ti].river) rv++; }); }); have2 = rv; need2 = a; break; }
      case 'unitsBuilt': have2 = civ.unitsBuilt || 0; need2 = a; break;
      case 'farSettlement': { var cap = civ.capital && g.settlements[civ.capital], far = 0; if (cap) sets.forEach(function (x) { if (x.id !== cap.id) far = Math.max(far, G.dist(g.tiles[x.tile], g.tiles[cap.tile])); }); have2 = far; need2 = a; break; }
      case 'level': have2 = units.reduce(function (m, u) { return Math.max(m, u.level || 0); }, 0); need2 = a; break;
      case 'wonders': { var w = 0; for (var wid in g.wonders) { var ws = g.settlements[g.wonders[wid]]; if (ws && ws.civ === civ.idx) w++; } have2 = w; need2 = a; break; }
      default: return null;
    }
    if (have2 === null) return null;
    return { have: Math.min(have2, need2), need: need2, ratio: need2 ? Math.min(1, have2 / need2) : 0 };
  };
  MW.triggerMet = function (g, civ, node) {
    var s = st(civ), tr = node.trigger, ok = MW.cond(g, civ, tr.cond);
    if (!tr.turns) return ok; // "for N turns" cards count turns in a row, whatever their kind; a break resets the count
    s.streak[node.id] = ok ? (s.streak[node.id] || 0) + 1 : 0;
    return s.streak[node.id] >= tr.turns;
  };
  MW.unlock = function (g, civ, id, how) {
    var s = st(civ), node = AU.V2.NODE_BY_ID[id]; if (!node || s.unlocked[id] || s.locked[id]) return false;
    s.unlocked[id] = g.turn; s.log.push({ turn: g.turn, id: id, how: how || 'trigger' }); civ._fx = null; g.fxGen = (g.fxGen || 0) + 1;
    // abilities written for the classic rules: "whenever you learn a technology" means "whenever a Spark fires" here
    var fx = G.civFx(g, civ);
    if (fx.techGold) civ.gold += fx.techGold;
    if (fx.techCulture) civ.bonusCulture = (civ.bonusCulture || 0) + fx.techCulture;
    if (fx.eurekaDiscount) civ.bonusScience = (civ.bonusScience || 0) + Math.round(40 * fx.eurekaDiscount);
    if (fx.inspirationDiscount) civ.bonusCulture = (civ.bonusCulture || 0) + Math.round(40 * fx.inspirationDiscount);
    if (node.fx && node.fx.influenceOnce) civ.influence = (civ.influence || 0) + node.fx.influenceOnce;
    MW.grantFreeBuildings(g, civ);
    (node.locks || []).forEach(function (other) { MW.lockPermanent(g, civ, other); });
    if (node.pool === 'foundation' && node.cat) MW.checkLane(g, civ, node.era, node.cat);
    G.notify(g, civ, { big: true, kind: 'tech', focus: id, text: '💡 ' + _('Spark!') + ' ' + node.name + ' — “' + node.joke + '”' + (MW.describeNode ? ' · ' + MW.describeNode(node) : ''), panel: 'web' });
    if (civ.isPlayer) { g.sparksLit = g.sparksLit || []; g.sparksLit.push(id); }
    if (node.hub && AU.V2.HUB_BY_ID[node.hub]) MW.fireHub(g, civ, node.hub);
    MW.checkEraAdvance(g, civ);
    return true;
  };
  MW.lockPermanent = function (g, civ, id) { // the partner and everything downstream of it
    var s = st(civ); if (s.locked[id] || s.unlocked[id]) return; s.locked[id] = g.turn;
    AU.V2.NODES.forEach(function (n) { if ((n.requires || []).indexOf(id) >= 0) MW.lockPermanent(g, civ, n.id); });
  };
  MW.fireHub = function (g, civ, hubId) {
    var s = st(civ), hub = AU.V2.HUB_BY_ID[hubId]; if (!hub || s.hubsFired[hubId]) return;
    s.hubsFired[hubId] = g.turn;
    if (hub.turning !== undefined && !civ.isPlayer) { s.aiTurning = { hub: hubId, at: g.turn + 16 }; return; } // the AI lingers sixteen turns before crossing into the next age
    if (civ.isPlayer) { s.pendingHubs.push(hubId); G.notify(g, civ, { big: true, kind: 'civic', text: '🔮 ' + _('Insight!') + ' ' + hub.name + ': ' + _('a decision awaits'), panel: 'hub' }); }
    else MW.choose(g, civ, hubId, MW.aiPick(g, civ, hub).id);
  };
  MW.aiPick = function (g, civ, hub) { var ai = civ.ai || {}; var scored = hub.branches.map(function (b, i) { var sc = i === 0 ? 0.5 : 0; var f = b.fx || {}; if (f.combatBonus || f.meleeBonus || f.homeDefenseBonus) sc += (ai.aggression || 0.3); if (f.yieldMult && f.yieldMult.gold || f.goldPerSettlement) sc += 0.4; if (f.growthMult || f.happinessBonus) sc += (1 - (ai.aggression || 0.3)); if (f.attitudeBonus) sc += 0.3; return [sc, b]; }); scored.sort(function (x, y) { return y[0] - x[0]; }); return scored[0][1]; };
  MW.choose = function (g, civ, hubId, branchId) {
    var s = st(civ), hub = AU.V2.HUB_BY_ID[hubId]; if (!hub || s.traits[hubId]) return false;
    var br = hub.branches.filter(function (b) { return b.id === branchId; })[0]; if (!br) return false;
    s.traits[hubId] = branchId; s.pendingHubs = s.pendingHubs.filter(function (h) { return h !== hubId; }); civ._fx = null; g.fxGen = (g.fxGen || 0) + 1;
    var cfx = G.civFx(g, civ); if (cfx.civicScience) civ.bonusScience = (civ.bonusScience || 0) + cfx.civicScience; // "whenever you learn a civic" = whenever an Insight is decided
    if (cfx.insightInfluence) civ.influence = (civ.influence || 0) + cfx.insightInfluence;
    s.log.push({ turn: g.turn, hub: hubId, branch: branchId });
    if (br.greatPerson && AU.GreatPeople && AU.GreatPeople.spawnNamed) AU.GreatPeople.spawnNamed(g, civ, br.greatPerson, hub.name);
    if (hub.turning !== undefined && s.era === hub.turning) MW.advanceEra(g, civ);
    G.notify(g, civ, { kind: 'civic', text: '🔮 ' + hub.name + ' → ' + br.name, panel: 'hub' });
    return true;
  };
  MW.foundationCount = function (civ, era) { var s = st(civ), c = 0; AU.V2.NODES.forEach(function (n) { if (n.era === era && n.pool === 'foundation' && s.unlocked[n.id]) c++; }); return c; };
  MW.MIN_ERA_TURNS = 35; // an age lasts at least this long (scaled by game speed), however fast the Sparks come
  MW.checkEraAdvance = function (g, civ) {
    var s = st(civ), era = AU.V2.ERAS[s.era]; if (!era || !era.advance) return;
    if (g.turn - (s.eraSince || 0) < Math.round(MW.MIN_ERA_TURNS * G.speed(g))) return;
    if (MW.foundationCount(civ, s.era) >= era.advance && !s.hubsFired['turning:' + s.era]) {
      var th = AU.V2.HUB_BY_ID['turning:' + s.era];
      if (th) { s.turningReady = g.turn; MW.fireHub(g, civ, th.id); }
      else MW.advanceEra(g, civ);
    }
  };
  // "Free Walls once Masonry is known": under v2 the building arrives the moment the empire may build it
  MW.grantFreeBuildings = function (g, civ) {
    var fx = G.civFx(g, civ), s = st(civ); if (!fx.freeBuildingWithTech) return;
    for (var b in fx.freeBuildingWithTech) { if (s.freeGiven && s.freeGiven[b]) continue; var d = AU.BUILDINGS[b]; if (!d || !MW.allows(g, civ, 'building', b, d)) continue; s.freeGiven = s.freeGiven || {}; s.freeGiven[b] = g.turn; G.civSettlements(g, civ.idx).forEach(function (st2) { if (!G.hasBuilding(st2, b)) G.addBuilding(g, st2, b); }); }
  };
  // "A free technology/civic when you build your first Library": the cheapest unmet foundation Spark of the age fires
  MW.grantFreeSpark = function (g, civ) {
    var s = st(civ), cands = MW.openNodes(s.era).filter(function (n) { return n.pool === 'foundation' && !s.unlocked[n.id] && !s.locked[n.id]; });
    if (!cands.length) return false; return MW.unlock(g, civ, cands[0].id, 'gift');
  };
  MW.advanceEra = function (g, civ) {
    var s = st(civ); s.era += 1; s.eraSince = g.turn; civ.era = s.era; civ._fx = null; g.fxGen = (g.fxGen || 0) + 1;
    MW.grantFreeBuildings(g, civ);
    G.notify(g, civ, { big: true, kind: 'wonder', text: '🌅 ' + _('Turning Point') + ': ' + (AU.V2.ERAS[s.era] ? AU.V2.ERAS[s.era].name : '') + ' — “' + (AU.V2.ERAS[s.era] ? AU.V2.ERAS[s.era].joke : '') + '”', panel: 'web' });
  };
  // Study: Knowledge piles up and can buy any open Spark, so a scholarly empire steers instead of waiting.
  // Cheap Sparks cost 30, foundation Sparks 60, branch Sparks 90 (times 1 + half the age, game speed and ability discounts).
  MW.STUDY_BASE = { cheap: 30, foundation: 60, branched: 90 };
  MW.STUDY_STEP = 0.15; // every Spark already studied this age makes the next one 15% dearer
  MW.studiedThisAge = function (civ) { var s = st(civ); return (s.studied && s.studied[s.era]) || 0; };
  MW.studyCost = function (g, civ, node) { var fx = G.civFx(g, civ), base = node.cheap ? MW.STUDY_BASE.cheap : (MW.STUDY_BASE[node.pool] || MW.STUDY_BASE.branched); return Math.round(base * (1 + (st(civ).era || 0) * 0.5) * (1 + MW.STUDY_STEP * MW.studiedThisAge(civ)) * G.speed(g) * (fx.techCostMult || 1) * (fx.civicCostMult || 1)); };
  MW.canStudy = function (g, civ, id) { var s = st(civ), n = AU.V2.NODE_BY_ID[id]; return !!n && n.era <= s.era && !s.unlocked[id] && !s.locked[id] && s.study >= MW.studyCost(g, civ, n); };
  MW.study = function (g, civ, id) { if (!MW.canStudy(g, civ, id)) return false; var s = st(civ), n = AU.V2.NODE_BY_ID[id], cost = MW.studyCost(g, civ, n), fx = G.civFx(g, civ); s.study -= cost; if (fx.studyRefund && n.pool === 'foundation') s.study += Math.round(cost * fx.studyRefund); s.studied = s.studied || {}; s.studied[s.era] = (s.studied[s.era] || 0) + 1; return MW.unlock(g, civ, id, 'study'); };
  // The AI studies the cheapest Spark of its own age that still counts toward the Turning Point (foundation first), then anything else.
  MW.aiStudyPick = function (g, civ) {
    var s = st(civ), best = null, bv = -1;
    MW.openNodes(s.era).forEach(function (n) { if (s.unlocked[n.id] || s.locked[n.id]) return; var c = MW.studyCost(g, civ, n); if (s.study < c) return; var v = (n.pool === 'foundation' && n.era === s.era ? 3 : n.pool === 'foundation' ? 2 : 1) * 1000 - c + (n.unlocks ? 50 : 0); if (n.pool === 'foundation' && n.cat) { var lc = MW.laneCount(civ, n.era, n.cat); if (lc.total - lc.lit <= 2) v += 400; } if (v > bv) { bv = v; best = n; } });
    return best;
  };
  // Heritage: Culture piles up too. Once per age an empire may Reform: take back an Insight already decided and choose its other branch.
  MW.reformCost = function (g, civ) { var fx = G.civFx(g, civ); return Math.round(120 * (1 + (st(civ).era || 0) * 0.75) * G.speed(g) * (fx.civicCostMult || 1)); };
  MW.reformsPerAge = function (g, civ) { return 1 + (G.civFx(g, civ).reformsPerAge || 0); };
  MW.reformsLeft = function (g, civ) { var s = st(civ); s.reformUsed = s.reformUsed || {}; return MW.reformsPerAge(g, civ) - (s.reformUsed[s.era] || 0); };
  MW.canReform = function (g, civ, hubId) { var s = st(civ), hub = AU.V2.HUB_BY_ID[hubId]; if (!hub || !s.traits[hubId] || hub.turning !== undefined || hub.branches.length < 2) return false; return MW.reformsLeft(g, civ) > 0 && (s.heritage || 0) >= MW.reformCost(g, civ); };
  MW.reform = function (g, civ, hubId, branchId) {
    if (!MW.canReform(g, civ, hubId)) return false;
    var s = st(civ), hub = AU.V2.HUB_BY_ID[hubId], br = hub.branches.filter(function (b) { return b.id === branchId; })[0]; if (!br || s.traits[hubId] === branchId) return false;
    s.heritage -= MW.reformCost(g, civ); s.reformUsed[s.era] = (s.reformUsed[s.era] || 0) + 1; s.traits[hubId] = branchId; civ._fx = null; g.fxGen = (g.fxGen || 0) + 1;
    s.log.push({ turn: g.turn, hub: hubId, branch: branchId, how: 'reform' });
    G.notify(g, civ, { kind: 'civic', text: '🎭 ' + _('Reform') + ': ' + hub.name + ' → ' + br.name, panel: 'hub' });
    return true;
  };
  // Eras without authored nodes yet (2–7 come in phase 6): Knowledge study advances them so the game stays playable to the end. Temporary.
  MW.provisionalEraCost = function (g, civ) { return Math.round(300 * Math.pow(1.6, st(civ).era) * G.speed(g)); };
  // Fire the Sparks whose condition is already met (called after player actions, so a Spark lands the moment it is earned).
  MW.evaluate = function (g, civ) {
    if (!AU.V2 || civ.minor || !civ.v2) return;
    var s = st(civ);
    MW.openNodes(s.era).forEach(function (n) { if (s.unlocked[n.id] || s.locked[n.id]) return; if (n.trigger.type !== 'state' && !n.trigger.turns && MW.triggerMet(g, civ, n)) MW.unlock(g, civ, n.id); });
  };
  MW.turn = function (g, civ) {
    if (!AU.V2 || civ.minor) return;
    var s = st(civ), y = G.civYields(g, civ); s.study += Math.round((y.science || 0) * 10) / 10; s.heritage = (s.heritage || 0) + Math.round((y.culture || 0) * 10) / 10;
    var nodes = MW.openNodes(s.era), eraNodes = MW.nodesOfEra(s.era);
    nodes.forEach(function (n) { if (s.unlocked[n.id] || s.locked[n.id]) return; if (MW.triggerMet(g, civ, n)) MW.unlock(g, civ, n.id); });
    AU.V2.HUBS.forEach(function (h) { if (!h.when || s.hubsFired[h.id] || h.when[0] === 'node') return; if (MW.cond(g, civ, h.when)) MW.fireHub(g, civ, h.id); });
    if (!civ.isPlayer) { var aiPick = MW.aiStudyPick(g, civ); if (aiPick) MW.study(g, civ, aiPick.id); }
    if (!eraNodes.length && s.era < AU.V2.ERAS.length - 1 && s.study >= MW.provisionalEraCost(g, civ)) { s.study -= MW.provisionalEraCost(g, civ); s.hubsFired['turning:' + s.era] = g.turn; s.era += 1; civ._fx = null; G.notify(g, civ, { big: true, kind: 'wonder', text: '🌅 ' + _('Turning Point') + ': ' + AU.V2.ERAS[s.era].name + ' — “' + AU.V2.ERAS[s.era].joke + '”', panel: 'web' }); }
    MW.checkEraAdvance(g, civ); // the age may have lasted long enough now
    if (s.aiTurning && g.turn >= s.aiTurning.at) { var tp = AU.V2.HUB_BY_ID[s.aiTurning.hub]; s.aiTurning = null; if (tp) MW.choose(g, civ, tp.id, MW.aiPick(g, civ, tp).id); }
    civ.era = s.era;
  };
  // ---------- Lane Mastery: every foundation Spark of a lane lit in its age is a permanent reward ----------
  MW.laneNodes = function (era, cat) { return MW.nodesOfEra(era).filter(function (n) { return n.pool === 'foundation' && n.cat === cat; }); };
  MW.laneCount = function (civ, era, cat) { var s = st(civ), nodes = MW.laneNodes(era, cat), lit = 0; nodes.forEach(function (n) { if (s.unlocked[n.id]) lit++; }); return { lit: lit, total: nodes.length }; };
  MW.laneMastered = function (civ, era, cat) { var s = st(civ); return !!(s.lanes && s.lanes[era + ':' + cat]); };
  MW.laneReward = function (era, cat) { return AU.V2.LANES ? AU.V2.LANES.reward(era, cat) : null; };
  MW.lanesMastered = function (civ) { var s = st(civ), n = 0; for (var k in (s.lanes || {})) n++; return n; };
  MW.checkLane = function (g, civ, era, cat) {
    var s = st(civ), key = era + ':' + cat; s.lanes = s.lanes || {}; if (s.lanes[key]) return false;
    var c = MW.laneCount(civ, era, cat); if (!c.total || c.lit < c.total) return false;
    s.lanes[key] = g.turn; s.log.push({ turn: g.turn, lane: key }); civ._fx = null; g.fxGen = (g.fxGen || 0) + 1;
    var reward = MW.laneReward(era, cat), fx = G.civFx(g, civ), gifts = [];
    // a people whose abilities speak of learning gets more from a mastered lane
    if (fx.laneMasteryKnowledge) { s.study += fx.laneMasteryKnowledge; gifts.push('+' + fx.laneMasteryKnowledge + ' 📚'); }
    if (fx.laneMasteryHeritage) { s.heritage = (s.heritage || 0) + fx.laneMasteryHeritage; gifts.push('+' + fx.laneMasteryHeritage + ' 🎭'); }
    if (fx.laneMasteryInfluence) { civ.influence = (civ.influence || 0) + fx.laneMasteryInfluence; gifts.push('+' + fx.laneMasteryInfluence + ' 🎯'); }
    if (fx.laneMasteryGold) { civ.gold += fx.laneMasteryGold; gifts.push('+' + fx.laneMasteryGold + ' 💰'); }
    if (fx.laneMasterySpark) { var before = Object.keys(s.unlocked).length; MW.grantFreeSpark(g, civ); if (Object.keys(s.unlocked).length > before) gifts.push(_('a free Spark')); }
    G.notify(g, civ, { big: true, kind: 'lane', text: '🏅 ' + _('Lane mastered!') + ' ' + _(cat) + ' — ' + (reward ? reward.name + ': ' + (MW.describeFx ? MW.describeFx(reward.fx) : '') : '') + (gifts.length ? ' · ' + gifts.join(' ') : ''), panel: 'web', tab: 'foundation', era: era });
    if (civ.isPlayer) { g.sparksLit = g.sparksLit || []; g.sparksLit.push('lane:' + key); }
    return true;
  };
  // Effects of unlocked nodes, chosen traits and mastered lanes, merged into the empire's effect set.
  MW.fx = function (civ, merge, fx) {
    var s = civ.v2; if (!s) return;
    for (var id in s.unlocked) { var n = AU.V2.NODE_BY_ID[id]; if (n && n.fx) merge(fx, n.fx); }
    for (var h in s.traits) { var hub = AU.V2.HUB_BY_ID[h]; if (!hub) continue; var br = hub.branches.filter(function (b) { return b.id === s.traits[h]; })[0]; if (br && br.fx) merge(fx, br.fx); }
    var lanes = 0; for (var k in (s.lanes || {})) { lanes++; var parts = k.split(':'), r = MW.laneReward(+parts[0], parts[1]); if (r && r.fx) merge(fx, r.fx); }
    // per-lane synergies from abilities: a yield in the capital for every lane mastered, or cheaper study for every lane mastered
    if (lanes && fx.laneMasteryYield) { var cy = {}; for (var yk in fx.laneMasteryYield) cy[yk] = fx.laneMasteryYield[yk] * lanes; merge(fx, { capitalYields: cy }); }
    if (lanes && fx.laneMasteryStudyMult) merge(fx, { techCostMult: Math.pow(fx.laneMasteryStudyMult, lanes) });
  };
  MW.nodeFor = function (kind, id) { if (!MW._idx) { MW._idx = {}; AU.V2.NODES.forEach(function (n) { if (n.unlocks) for (var k in n.unlocks) MW._idx[k + ':' + n.unlocks[k]] = n.id; }); } return MW._idx[kind + ':' + id] || null; };
  MW.v1Era = function (def) { if (def.era !== undefined) return def.era; var t = def.tech && AU.TECH_BY_ID[def.tech], c = def.civic && AU.CIVIC_BY_ID[def.civic]; return Math.max(t ? t.era : 0, c ? c.era : 0); };
  // Is this unit/building/wonder available under v2 rules? Named by a node → that node; else its v1 era must be reached.
  MW.allows = function (g, civ, kind, id, def) {
    var s = st(civ), nid = MW.nodeFor(kind, id);
    if (nid) return !!s.unlocked[nid];
    if (kind === 'unit' && (id === 'scout' || id === 'settler')) return id === 'scout' || !!s.unlocked.fence || s.era > 0;
    return MW.v1Era(def) <= (s.era >= AU.V2.ERAS.length - 1 ? 99 : s.era); // the last age opens everything the classic tree still holds
  };
})(globalThis.AU = globalThis.AU || {});
