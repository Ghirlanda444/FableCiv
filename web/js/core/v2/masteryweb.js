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
  MW.triggerMet = function (g, civ, node) {
    var s = st(civ), tr = node.trigger, ok = MW.cond(g, civ, tr.cond);
    if (tr.type !== 'state' || !tr.turns) return ok;
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
    MW.grantFreeBuildings(g, civ);
    (node.locks || []).forEach(function (other) { MW.lockPermanent(g, civ, other); });
    G.notify(g, civ, { big: true, kind: 'tech', text: '💡 ' + _('Spark!') + ' ' + node.name + ' — “' + node.joke + '”' + (node.unlocks && node.unlocks.unit ? ' · ' + _('unlocks') + ' ' + (AU.UNITS[node.unlocks.unit] ? AU.UNITS[node.unlocks.unit].name : node.unlocks.unit) : '') + (node.unlocks && node.unlocks.building ? ' · ' + _('unlocks') + ' ' + (AU.BUILDINGS[node.unlocks.building] ? AU.BUILDINGS[node.unlocks.building].name : node.unlocks.building) : ''), panel: 'web' });
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
    if (hub.turning !== undefined && !civ.isPlayer) { s.aiTurning = { hub: hubId, at: g.turn + 12 }; return; } // the AI lingers a dozen turns before crossing into the next age
    if (civ.isPlayer) { s.pendingHubs.push(hubId); G.notify(g, civ, { big: true, kind: 'civic', text: '🔮 ' + _('Insight!') + ' ' + hub.name + ': ' + _('a decision awaits'), panel: 'hub' }); }
    else MW.choose(g, civ, hubId, MW.aiPick(g, civ, hub).id);
  };
  MW.aiPick = function (g, civ, hub) { var ai = civ.ai || {}; var scored = hub.branches.map(function (b, i) { var sc = i === 0 ? 0.5 : 0; var f = b.fx || {}; if (f.combatBonus || f.meleeBonus || f.homeDefenseBonus) sc += (ai.aggression || 0.3); if (f.yieldMult && f.yieldMult.gold || f.goldPerSettlement) sc += 0.4; if (f.growthMult || f.happinessBonus) sc += (1 - (ai.aggression || 0.3)); if (f.attitudeBonus) sc += 0.3; return [sc, b]; }); scored.sort(function (x, y) { return y[0] - x[0]; }); return scored[0][1]; };
  MW.choose = function (g, civ, hubId, branchId) {
    var s = st(civ), hub = AU.V2.HUB_BY_ID[hubId]; if (!hub || s.traits[hubId]) return false;
    var br = hub.branches.filter(function (b) { return b.id === branchId; })[0]; if (!br) return false;
    s.traits[hubId] = branchId; s.pendingHubs = s.pendingHubs.filter(function (h) { return h !== hubId; }); civ._fx = null; g.fxGen = (g.fxGen || 0) + 1;
    var cfx = G.civFx(g, civ); if (cfx.civicScience) civ.bonusScience = (civ.bonusScience || 0) + cfx.civicScience; // "whenever you learn a civic" = whenever an Insight is decided
    s.log.push({ turn: g.turn, hub: hubId, branch: branchId });
    if (br.greatPerson && AU.GreatPeople && AU.GreatPeople.spawnNamed) AU.GreatPeople.spawnNamed(g, civ, br.greatPerson, hub.name);
    if (hub.turning !== undefined && s.era === hub.turning) MW.advanceEra(g, civ);
    G.notify(g, civ, { kind: 'civic', text: '🔮 ' + hub.name + ' → ' + br.name, panel: 'hub' });
    return true;
  };
  MW.foundationCount = function (civ, era) { var s = st(civ), c = 0; AU.V2.NODES.forEach(function (n) { if (n.era === era && n.pool === 'foundation' && s.unlocked[n.id]) c++; }); return c; };
  MW.checkEraAdvance = function (g, civ) {
    var s = st(civ), era = AU.V2.ERAS[s.era]; if (!era || !era.advance) return;
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
    var s = st(civ); s.era += 1; civ.era = s.era; civ._fx = null; g.fxGen = (g.fxGen || 0) + 1;
    MW.grantFreeBuildings(g, civ);
    G.notify(g, civ, { big: true, kind: 'wonder', text: '🌅 ' + _('Turning Point') + ': ' + (AU.V2.ERAS[s.era] ? AU.V2.ERAS[s.era].name : '') + ' — “' + (AU.V2.ERAS[s.era] ? AU.V2.ERAS[s.era].joke : '') + '”', panel: 'web' });
  };
  // Study: Knowledge piles up slowly and can only buy nodes flagged cheap (a safety valve, never a research race).
  MW.studyCost = function (g, civ, node) { var fx = G.civFx(g, civ); return Math.round(40 * (1 + (st(civ).era || 0) * 0.5) * G.speed(g) * (fx.techCostMult || 1) * (fx.civicCostMult || 1)); };
  MW.study = function (g, civ, id) { var s = st(civ), n = AU.V2.NODE_BY_ID[id]; if (!n || !n.cheap || s.unlocked[id] || s.locked[id] || s.study < MW.studyCost(g, civ, n)) return false; s.study -= MW.studyCost(g, civ, n); return MW.unlock(g, civ, id, 'study'); };
  // Eras without authored nodes yet (2–7 come in phase 6): Knowledge study advances them so the game stays playable to the end. Temporary.
  MW.provisionalEraCost = function (g, civ) { return Math.round(300 * Math.pow(1.6, st(civ).era) * G.speed(g)); };
  MW.turn = function (g, civ) {
    if (!AU.V2 || civ.minor) return;
    var s = st(civ), y = G.civYields(g, civ); s.study += Math.round((y.science || 0) * 10) / 10;
    var nodes = MW.openNodes(s.era), eraNodes = MW.nodesOfEra(s.era);
    nodes.forEach(function (n) { if (s.unlocked[n.id] || s.locked[n.id]) return; if (MW.triggerMet(g, civ, n)) MW.unlock(g, civ, n.id); });
    AU.V2.HUBS.forEach(function (h) { if (!h.when || s.hubsFired[h.id] || h.when[0] === 'node') return; if (MW.cond(g, civ, h.when)) MW.fireHub(g, civ, h.id); });
    if (!civ.isPlayer) { var aiCheap = nodes.filter(function (n) { return n.cheap && !s.unlocked[n.id] && !s.locked[n.id]; })[0]; if (aiCheap && s.study >= MW.studyCost(g, civ, aiCheap)) MW.study(g, civ, aiCheap.id); }
    if (!eraNodes.length && s.era < AU.V2.ERAS.length - 1 && s.study >= MW.provisionalEraCost(g, civ)) { s.study -= MW.provisionalEraCost(g, civ); s.hubsFired['turning:' + s.era] = g.turn; s.era += 1; civ._fx = null; G.notify(g, civ, { big: true, kind: 'wonder', text: '🌅 ' + _('Turning Point') + ': ' + AU.V2.ERAS[s.era].name + ' — “' + AU.V2.ERAS[s.era].joke + '”', panel: 'web' }); }
    if (s.aiTurning && g.turn >= s.aiTurning.at) { var tp = AU.V2.HUB_BY_ID[s.aiTurning.hub]; s.aiTurning = null; if (tp) MW.choose(g, civ, tp.id, MW.aiPick(g, civ, tp).id); }
    civ.era = s.era;
  };
  // Effects of unlocked nodes and chosen traits, merged into the empire's effect set.
  MW.fx = function (civ, merge, fx) { var s = civ.v2; if (!s) return; for (var id in s.unlocked) { var n = AU.V2.NODE_BY_ID[id]; if (n && n.fx) merge(fx, n.fx); } for (var h in s.traits) { var hub = AU.V2.HUB_BY_ID[h]; if (!hub) continue; var br = hub.branches.filter(function (b) { return b.id === s.traits[h]; })[0]; if (br && br.fx) merge(fx, br.fx); } };
  MW.nodeFor = function (kind, id) { if (!MW._idx) { MW._idx = {}; AU.V2.NODES.forEach(function (n) { if (n.unlocks) for (var k in n.unlocks) MW._idx[k + ':' + n.unlocks[k]] = n.id; }); } return MW._idx[kind + ':' + id] || null; };
  MW.v1Era = function (def) { var t = def.tech && AU.TECH_BY_ID[def.tech], c = def.civic && AU.CIVIC_BY_ID[def.civic]; return Math.max(t ? t.era : 0, c ? c.era : 0); };
  // Is this unit/building/wonder available under v2 rules? Named by a node → that node; else its v1 era must be reached.
  MW.allows = function (g, civ, kind, id, def) {
    var s = st(civ), nid = MW.nodeFor(kind, id);
    if (nid) return !!s.unlocked[nid];
    if (kind === 'unit' && (id === 'scout' || id === 'settler')) return id === 'scout' || !!s.unlocked.fence || s.era > 0;
    return MW.v1Era(def) <= s.era;
  };
})(globalThis.AU = globalThis.AU || {});
