// Diplomacy: leader agendas and opinions, delegations, friendship, alliances, open borders, denouncements,
// luxury deals, first-contact events and city-state audiences (free envoy for first contact, quests).
(function (AU) {
  var G = AU.G;
  var D = AU.Diplo = {};

  // ---------- relationship record (older saves get the new fields lazily) ----------
  D.rel = function (g, a, b) {
    var ca = g.civs[a]; if (!ca || !ca.rel[b]) return null;
    var r = ca.rel[b];
    if (r.friendUntil === undefined) { r.friendUntil = -1; r.allyUntil = -1; r.bordersUntil = -1; r.delegationTurn = -99; r.giftTurn = -99; r.denouncedTurn = -99; r.friendSince = -1; r.log = []; }
    return r;
  };
  D.log = function (g, a, b, text, delta) {
    var r = D.rel(g, a, b); if (!r) return;
    r.log.push({ t: g.turn, text: text, d: delta || 0 }); if (r.log.length > 8) r.log.shift();
    if (delta) r.attitude += delta;
  };
  D.isFriend = function (g, a, b) { var r = D.rel(g, a, b); return !!r && r.friendUntil > g.turn; };
  D.isAlly = function (g, a, b) { var r = D.rel(g, a, b); return !!r && r.allyUntil > g.turn; };
  D.hasOpenBorders = function (g, mover, owner) { if (mover === owner) return true; if (D.isAlly(g, mover, owner)) return true; var r = D.rel(g, owner, mover); return !!r && r.bordersUntil > g.turn; };
  D.isDenounced = function (g, a, b) { var r = D.rel(g, a, b); return !!r && g.turn - r.denouncedTurn < 25; };
  D.mood = function (att) { return att > 40 ? 'Admiring' : att > 15 ? 'Friendly' : att > -10 ? 'Neutral' : att > -30 ? 'Unfriendly' : 'Hostile'; };
  D.canDeclareWar = function (g, a, b) { var r = D.rel(g, a, b); if (!r || r.war) return false; if (r.peaceUntil > g.turn) return false; if (D.isFriend(g, a, b) || D.isAlly(g, a, b)) return false; return true; };

  // ---------- agendas: what a leader cares about (derived from the leader's personality) ----------
  var AGENDAS = {
    warlord:  { name: 'Iron Fist', desc: 'Respects a strong army and despises weakness. Likes you when your military rivals theirs.', line: 'Show me your strength. Weak neighbours are only future provinces.' },
    landgrab: { name: 'Manifest Destiny', desc: 'Wants room to grow. Dislikes anyone who settles close to their borders.', line: 'The land is wide, but not wide enough for two of us. Keep your distance.' },
    scholar:  { name: 'Enlightened', desc: 'Admires civilizations ahead in science; looks down on backward ones.', line: 'Knowledge is the only empire that lasts. What have you discovered?' },
    patron:   { name: 'Patron of the Arts', desc: 'Likes civilizations rich in culture and wonders; bored by those without.', line: 'A people is judged by what it builds. I hope to see wonders in your lands.' },
    devout:   { name: 'True Devotion', desc: 'Likes those who follow their religion, resents those who spread another one into their settlements.', line: 'The heavens favour us. Walk with us in faith, and we shall be friends.' },
    merchant: { name: 'Peace and Plenty', desc: 'Values peace and trade. Dislikes warmongers and those who denounce others.', line: 'Prosperity needs peace. Trade with us and both our peoples will flourish.' }
  };
  D.agenda = function (civ) {
    var tr = civ.ai || {}, best = 'merchant', bv = 0.55;
    if ((tr.aggression || 0) > bv) { best = 'warlord'; bv = tr.aggression; }
    if ((tr.expansion || 0) > bv) { best = 'landgrab'; bv = tr.expansion; }
    if ((tr.science || 0) > bv) { best = 'scholar'; bv = tr.science; }
    if ((tr.culture || 0) > bv) { best = 'patron'; bv = tr.culture; }
    if ((tr.religion || 0) > bv) { best = 'devout'; bv = tr.religion; }
    var a = AGENDAS[best]; return { id: best, name: a.name, desc: a.desc, line: a.line };
  };
  // Live opinion factors (shown in the leader screen, applied every 10 turns)
  D.opinion = function (g, civ, other) {
    var out = [], ag = D.agenda(civ), tr = civ.ai || {};
    var myS = G.militaryStrength(g, civ.idx), theirS = G.militaryStrength(g, other.idx);
    var mine = G.civSettlements(g, civ.idx), theirs = G.civSettlements(g, other.idx);
    var near = AU.AI && AU.AI.borderTension ? AU.AI.borderTension(g, civ, other) : false;
    switch (ag.id) {
      case 'warlord': if (theirS >= myS * 0.9) out.push(['Respects your army', 3]); else if (theirS < myS * 0.5) out.push(['Despises your weak army', -4]); break;
      case 'landgrab': if (near) out.push(['You settle too close to their lands', -5]); else out.push(['You keep your distance', 2]); break;
      case 'scholar': { var ts = Object.keys(other.techs).length, ms = Object.keys(civ.techs).length; if (ts >= ms + 2) out.push(['Admires your science', 4]); else if (ts + 3 < ms) out.push(['Thinks you are backward', -3]); break; }
      case 'patron': { var wc = 0; for (var w in g.wonders) if (g.settlements[g.wonders[w]] && g.settlements[g.wonders[w]].civ === other.idx) wc++; if (wc >= 2) out.push(['Admires your wonders', 4]); else if (wc === 0 && g.turn > 60) out.push(['Finds your culture dull', -2]); break; }
      case 'devout': if (civ.religion && other.religion === civ.religion) out.push(['You share their faith', 4]); else if (other.religion && civ.religion && mine.some(function (s) { return s.religion === other.religion; })) out.push(['Your religion spreads in their cities', -5]); break;
      default: { var wars = 0; g.civs.forEach(function (c) { if (c.alive && c.idx !== other.idx && other.rel[c.idx] && other.rel[c.idx].war && !c.minor) wars++; }); if (wars >= 2) out.push(['Sees you as a warmonger', -4]); else if (!wars) out.push(['Appreciates a peaceful neighbour', 2]); }
    }
    if (near && ag.id !== 'landgrab') out.push(['Shared border tension', -1]);
    if (D.isFriend(g, civ.idx, other.idx)) out.push(['Declared friendship', 3]);
    if (D.isAlly(g, civ.idx, other.idx)) out.push(['Allied', 4]);
    if (D.isDenounced(g, civ.idx, other.idx) || D.isDenounced(g, other.idx, civ.idx)) out.push(['Recent denouncement', -3]);
    return out;
  };

  // ---------- meeting ----------
  // Called whenever two civilizations meet for the first time (either direction). Returns true if it was new.
  D.onMeet = function (g, a, b) {
    var ca = g.civs[a], cb = g.civs[b]; if (!ca || !cb || a === b) return false;
    var isNew = !ca.met[b] || !cb.met[a];
    ca.met[b] = true; cb.met[a] = true;
    if (!isNew) return false;
    [[ca, cb], [cb, ca]].forEach(function (pair) {
      var me = pair[0], them = pair[1];
      if (!them.minor || me.minor) return;
      // the first civilization to find a city-state gets a free envoy there
      var first = !them.flags['firstMet'];
      if (first) them.flags['firstMet'] = me.idx;
      AU.CityStates.addTies(g, me, them, AU.CityStates.MEET_TIES * (first ? 2 : 1), 'first contact');
      if (me.isPlayer) {
        me.flags['met:' + them.idx] = g.turn;
        g.diploQueue = g.diploQueue || []; g.diploQueue.push({ kind: 'meetCS', civ: them.idx, first: first });
        G.notify(g, me, { kind: 'meet', text: 'You met the free city of ' + G.civData(them).name + (first ? ': as the first to find it you start with +10 Ties.' : ': +5 Ties.'), panel: 'diplomacy' });
      }
    });
    if (!ca.minor && !cb.minor) [[ca, cb], [cb, ca]].forEach(function (pair) {
      var me = pair[0], them = pair[1];
      if (!me.isPlayer) return;
      me.flags['met:' + them.idx] = g.turn;
      g.diploQueue = g.diploQueue || []; g.diploQueue.push({ kind: 'meet', civ: them.idx });
      G.notify(g, me, { kind: 'meet', text: 'You met ' + G.leaderName(them) + ' of ' + G.civData(them).name + '.', panel: 'diplomacy' });
    });
    return true;
  };

  // ---------- actions between two majors (a acts, b responds) ----------
  D.canDelegation = function (g, a, b) { var r = D.rel(g, a, b); return !!r && !r.war && g.turn - r.delegationTurn >= 15 && g.civs[a].gold >= 30; };
  D.sendDelegation = function (g, a, b) {
    if (!D.canDelegation(g, a, b)) return { ok: false, text: 'A delegation was sent recently or you cannot afford it (30 Gold).' };
    g.civs[a].gold -= 30; D.rel(g, a, b).delegationTurn = g.turn; D.log(g, b, a, 'Received a delegation', 6); D.log(g, a, b, 'Sent a delegation', 0);
    return { ok: true, text: G.leaderName(g.civs[b]) + ' welcomes your delegation with a feast. (+6 opinion)' };
  };
  D.canGift = function (g, a, b) { var r = D.rel(g, a, b); return !!r && !r.war && g.turn - r.giftTurn >= 10 && g.civs[a].gold >= 100; };
  D.gift = function (g, a, b) {
    if (!D.canGift(g, a, b)) return { ok: false, text: 'You gifted them recently or cannot afford 100 Gold.' };
    g.civs[a].gold -= 100; g.civs[b].gold += 100; D.rel(g, a, b).giftTurn = g.turn; D.log(g, b, a, 'Received a gift of 100 Gold', 8);
    return { ok: true, text: 'The gift is accepted with thanks. (+8 opinion)' };
  };
  D.wantsFriendship = function (g, ai, other) { var r = D.rel(g, ai.idx, other); return !!r && !r.war && r.attitude >= 15 && !D.isDenounced(g, ai.idx, other) && !D.isDenounced(g, other, ai.idx); };
  D.declareFriendship = function (g, a, b) {
    var ca = g.civs[a], cb = g.civs[b], ra = D.rel(g, a, b), rb = D.rel(g, b, a);
    if (!ra || ra.war) return { ok: false, text: 'Not while at war.' };
    if (D.isFriend(g, a, b)) return { ok: false, text: 'You are already friends.' };
    if (!cb.isPlayer && !D.wantsFriendship(g, cb, a)) return { ok: false, text: G.leaderName(cb) + ' is not ready for friendship. Improve their opinion first (delegations, gifts, peace, shared interests).' };
    ra.friendUntil = rb.friendUntil = g.turn + 30; ra.friendSince = rb.friendSince = g.turn;
    D.log(g, a, b, 'Declared friendship', 5); D.log(g, b, a, 'Declared friendship', 5);
    g.civs.forEach(function (c) { if (c.alive && !c.minor && c.idx !== a && c.idx !== b && c.met[a] && c.rel[b] && c.rel[b].war) D.log(g, c.idx, a, 'Befriended their enemy', -4); });
    G.log(g, G.civData(ca).name + ' and ' + G.civData(cb).name + ' declared friendship.', a);
    return { ok: true, text: G.leaderName(cb) + ': "Let it be known that our peoples are friends." Friendship lasts 30 turns; neither side can declare war on the other.' };
  };
  D.wantsAlliance = function (g, ai, other) { var r = D.rel(g, ai.idx, other); return !!r && D.isFriend(g, ai.idx, other) && g.turn - r.friendSince >= 8 && r.attitude >= 35; };
  D.formAlliance = function (g, a, b) {
    var ca = g.civs[a], cb = g.civs[b], ra = D.rel(g, a, b), rb = D.rel(g, b, a);
    if (!ra || !D.isFriend(g, a, b)) return { ok: false, text: 'An alliance needs an active friendship first.' };
    if (D.isAlly(g, a, b)) return { ok: false, text: 'You are already allied.' };
    if (!cb.isPlayer && !D.wantsAlliance(g, cb, a)) return { ok: false, text: G.leaderName(cb) + ' wants a longer, warmer friendship before an alliance (8 turns of friendship and a high opinion).' };
    ra.allyUntil = rb.allyUntil = g.turn + 40; ra.friendUntil = rb.friendUntil = Math.max(ra.friendUntil, g.turn + 40);
    D.log(g, a, b, 'Formed an alliance', 8); D.log(g, b, a, 'Formed an alliance', 8);
    G.log(g, G.civData(ca).name + ' and ' + G.civData(cb).name + ' formed an alliance.', a);
    return { ok: true, text: 'Alliance sealed for 40 turns: open borders both ways, shared map knowledge, and each of you joins the war if the other is attacked.' };
  };
  D.wantsOpenBorders = function (g, ai, other) { var r = D.rel(g, ai.idx, other); return !!r && !r.war && r.attitude >= 5; };
  D.openBorders = function (g, a, b) {
    var cb = g.civs[b], ra = D.rel(g, a, b), rb = D.rel(g, b, a);
    if (!ra || ra.war) return { ok: false, text: 'Not while at war.' };
    if (rb.bordersUntil > g.turn && ra.bordersUntil > g.turn) return { ok: false, text: 'Borders are already open.' };
    if (!cb.isPlayer && !D.wantsOpenBorders(g, cb, a)) return { ok: false, text: G.leaderName(cb) + ' does not trust you enough to open the borders.' };
    ra.bordersUntil = rb.bordersUntil = g.turn + 30; D.log(g, b, a, 'Open borders agreement', 2); D.log(g, a, b, 'Open borders agreement', 2);
    return { ok: true, text: 'Open borders for 30 turns: military units may cross each other\'s territory.' };
  };
  D.denounce = function (g, a, b) {
    var ca = g.civs[a], cb = g.civs[b], ra = D.rel(g, a, b);
    if (!ra || ra.war) return { ok: false, text: 'You are already at war.' };
    if (D.isFriend(g, a, b) || D.isAlly(g, a, b)) return { ok: false, text: 'You cannot denounce a friend or ally while the agreement lasts.' };
    ra.denouncedTurn = g.turn; D.log(g, b, a, 'Denounced them publicly', -15); D.log(g, a, b, 'You denounced them', -5);
    g.civs.forEach(function (c) { if (!c.alive || c.minor || c.idx === a || c.idx === b || !c.met[a]) return; if (D.isFriend(g, c.idx, b)) D.log(g, c.idx, a, 'Denounced their friend', -6); else if (c.rel[b] && c.rel[b].attitude < -15) D.log(g, c.idx, a, 'Denounced a leader they dislike too', 3); });
    G.log(g, G.civData(ca).name + ' denounced ' + G.civData(cb).name + '.', a);
    return { ok: true, text: 'Denounced. Their friends think less of you; their enemies approve.' };
  };
  // Luxuries: what a could offer b that b lacks
  D.spareLuxuries = function (g, a, b) {
    var la = G.luxuryCount(g, g.civs[a]).luxuries, lb = G.luxuryCount(g, g.civs[b]).luxuries;
    return la.filter(function (r) { return lb.indexOf(r) < 0 && !(g.civs[a].imports && g.civs[a].imports[r] > g.turn); });
  };
  D.addImport = function (g, civIdx, res, turns) { var c = g.civs[civIdx]; c.imports = c.imports || {}; c.imports[res] = g.turn + turns; c._lux = null; c._fx = null; g.fxGen = (g.fxGen || 0) + 1; };
  D.swapLuxuries = function (g, a, b, give, get) {
    var cb = g.civs[b], ra = D.rel(g, a, b);
    if (!ra || ra.war) return { ok: false, text: 'Not while at war.' };
    if (D.spareLuxuries(g, a, b).indexOf(give) < 0 || D.spareLuxuries(g, b, a).indexOf(get) < 0) return { ok: false, text: 'That trade is no longer possible.' };
    if (!cb.isPlayer && ra.attitude < -10) return { ok: false, text: G.leaderName(cb) + ' refuses to trade with you right now.' };
    D.addImport(g, b, give, 30); D.addImport(g, a, get, 30); D.log(g, b, a, 'Traded luxuries', 3); D.log(g, a, b, 'Traded luxuries', 1);
    return { ok: true, text: 'Deal: ' + AU.RESOURCES[give].name + ' for ' + AU.RESOURCES[get].name + ', 30 turns.' };
  };
  D.sellLuxury = function (g, a, b, res) {
    var cb = g.civs[b], ra = D.rel(g, a, b), price = 90;
    if (!ra || ra.war) return { ok: false, text: 'Not while at war.' };
    if (D.spareLuxuries(g, a, b).indexOf(res) < 0) return { ok: false, text: 'They already have that.' };
    if (!cb.isPlayer && (cb.gold < price || ra.attitude < -10)) return { ok: false, text: G.leaderName(cb) + (cb.gold < price ? ' cannot afford it (they have ' + Math.floor(cb.gold) + ' Gold).' : ' refuses to trade with you right now.') };
    cb.gold -= price; g.civs[a].gold += price; D.addImport(g, b, res, 30); D.log(g, b, a, 'Bought a luxury from them', 2);
    return { ok: true, text: 'Sold ' + AU.RESOURCES[res].name + ' for ' + price + ' Gold (30 turns).' };
  };
  D.buyLuxury = function (g, a, b, res) {
    var cb = g.civs[b], ra = D.rel(g, a, b), price = 110;
    if (!ra || ra.war) return { ok: false, text: 'Not while at war.' };
    if (D.spareLuxuries(g, b, a).indexOf(res) < 0) return { ok: false, text: 'They cannot spare that.' };
    if (g.civs[a].gold < price) return { ok: false, text: 'You need ' + price + ' Gold.' };
    if (!cb.isPlayer && ra.attitude < -10) return { ok: false, text: G.leaderName(cb) + ' refuses to trade with you right now.' };
    g.civs[a].gold -= price; cb.gold += price; D.addImport(g, a, res, 30); D.log(g, b, a, 'Sold them a luxury', 2);
    return { ok: true, text: 'Bought ' + AU.RESOURCES[res].name + ' for ' + price + ' Gold (30 turns).' };
  };

  // ---------- city-state audience ----------
  D.giftCost = function (g, a, m) { var CS = AU.CityStates; return CS.GIFT_COST + CS.tiesOf(g, g.civs[a], m) * 3; }; // the closer you are, the pricier the presents
  D.canGiftCS = function (g, a, m) { var r = D.rel(g, a, m.idx), CS = AU.CityStates; return !!r && !r.war && g.turn - r.giftTurn >= 15 && g.civs[a].gold >= D.giftCost(g, a, m) && !CS.isHostile(g, g.civs[a], m) && CS.tiesOf(g, g.civs[a], m) < CS.PASSIVE_CAP; };
  D.giftCS = function (g, a, m) {
    var CS = AU.CityStates;
    if (!D.canGiftCS(g, a, m)) return { ok: false, text: 'You need ' + D.giftCost(g, a, m) + ' Gold, one gift every 15 turns, Ties below ' + CS.PASSIVE_CAP + ', and no recent attack on a free city.' };
    g.civs[a].gold -= D.giftCost(g, a, m); m.gold += 60; D.rel(g, a, m.idx).giftTurn = g.turn;
    CS.addTies(g, g.civs[a], m, CS.GIFT_TIES, 'gift');
    return { ok: true, text: G.civData(m).name + ' thanks you for the gold: +' + CS.GIFT_TIES + ' Ties (' + CS.tiesOf(g, g.civs[a], m) + ', ' + CS.tierName(CS.tiesOf(g, g.civs[a], m)) + ').' };
  };
  // Quests: each free city asks for one thing; every civilization that does it earns Ties there.
  var QUEST_BUILDINGS = ['granary', 'monument', 'shrine', 'library', 'barracks', 'market', 'walls', 'water_mill'];
  var QUEST_UNITS = ['warrior', 'slinger', 'archer', 'spearman', 'scout', 'galley', 'horseman', 'settler'];
  D.questOf = function (g, m) {
    if (m.quest) return m.quest;
    var rng = AU.lcgSimple ? AU.lcgSimple(m.idx) : null, roll = ((m.idx * 7919 + (g.seed || 1) * 31) % 100) / 100;
    if (roll < 0.4) { var b = QUEST_BUILDINGS[(m.idx + (g.seed || 0)) % QUEST_BUILDINGS.length]; m.quest = { kind: 'building', id: b, text: 'Build a ' + AU.BUILDINGS[b].name + ' in one of your settlements' }; }
    else if (roll < 0.75) { var u = QUEST_UNITS[(m.idx * 3 + (g.seed || 0)) % QUEST_UNITS.length]; m.quest = { kind: 'unit', id: u, text: 'Have a ' + AU.UNITS[u].name + ' in your service' }; }
    else { var techs = AU.TECHS.filter(function (t) { return t.era <= 1; }); var t2 = techs[(m.idx * 5 + (g.seed || 0)) % techs.length]; m.quest = { kind: 'tech', id: t2.id, text: 'Research ' + t2.name }; }
    m.questDone = m.questDone || {};
    return m.quest;
  };
  D.questMet = function (g, civ, q) {
    if (q.kind === 'tech') return !!civ.techs[q.id];
    if (q.kind === 'building') return G.civSettlements(g, civ.idx).some(function (s) { return G.hasBuilding(s, q.id); });
    if (q.kind === 'unit') return G.civUnits(g, civ.idx).some(function (u) { return u.type === q.id; });
    return false;
  };
  D.questTurn = function (g, m) {
    if (!m.alive) return; var q = D.questOf(g, m);
    g.civs.forEach(function (c) {
      if (c.minor || !c.alive || !c.met[m.idx] || m.questDone[c.idx] || G.atWar(g, c.idx, m.idx)) return;
      if (!D.questMet(g, c, q)) return;
      m.questDone[c.idx] = g.turn;
      AU.CityStates.addTies(g, c, m, AU.CityStates.QUEST_TIES, 'quest');
      if (c.isPlayer) G.notify(g, c, { kind: 'diplomacy', text: 'Quest complete for ' + G.civData(m).name + ' (' + q.text.toLowerCase() + '): +' + AU.CityStates.QUEST_TIES + ' Ties there.', panel: 'diplomacy' });
    });
  };

  // ---------- per-turn AI diplomacy (majors) ----------
  D.turn = function (g, civ) {
    if (civ.minor || !civ.alive) return;
    g.civs.forEach(function (o) {
      if (o === civ || !o.alive || o.minor || !civ.met[o.idx]) return;
      var r = D.rel(g, civ.idx, o.idx); if (!r) return;
      // agendas judge every 10 turns
      if (g.turn % 10 === 0 && !r.war) D.opinion(g, civ, o).forEach(function (op) { if (op[1]) { r.attitude += op[1] * 0.6; } });
      r.attitude = Math.max(-80, Math.min(80, r.attitude));
      if (r.war) return;
      // expiring agreements
      if (r.allyUntil === g.turn && o.isPlayer) G.notify(g, o, { kind: 'diplomacy', text: 'Your alliance with ' + G.civData(civ).name + ' has expired.', panel: 'diplomacy' });
      if (r.friendUntil === g.turn && o.isPlayer) G.notify(g, o, { kind: 'diplomacy', text: 'Your friendship with ' + G.civData(civ).name + ' has expired. Renew it in the leader screen.', panel: 'diplomacy' });
      var rng = G.rng(g);
      if (o.isPlayer) {
        if (D.wantsFriendship(g, civ, o.idx) && !D.isFriend(g, civ.idx, o.idx) && rng < 0.08 && g.turn - (r.proposedTurn || -99) > 15) { r.proposedTurn = g.turn; g.diploQueue = g.diploQueue || []; g.diploQueue.push({ kind: 'proposeFriendship', civ: civ.idx }); }
        else if (D.wantsAlliance(g, civ, o.idx) && !D.isAlly(g, civ.idx, o.idx) && rng < 0.1 && g.turn - (r.proposedTurn || -99) > 15) { r.proposedTurn = g.turn; g.diploQueue = g.diploQueue || []; g.diploQueue.push({ kind: 'proposeAlliance', civ: civ.idx }); }
        else if (r.attitude < -30 && rng < 0.05 && g.turn - r.denouncedTurn > 40) { D.denounce(g, civ.idx, o.idx); g.diploQueue = g.diploQueue || []; g.diploQueue.push({ kind: 'denounced', civ: civ.idx }); }
      } else if (civ.idx < o.idx) { // AI to AI, once per pair
        if (D.wantsFriendship(g, civ, o.idx) && D.wantsFriendship(g, o, civ.idx) && !D.isFriend(g, civ.idx, o.idx) && rng < 0.1) D.declareFriendship(g, civ.idx, o.idx);
        else if (D.wantsAlliance(g, civ, o.idx) && D.wantsAlliance(g, o, civ.idx) && !D.isAlly(g, civ.idx, o.idx) && rng < 0.1) D.formAlliance(g, civ.idx, o.idx);
        else if (r.attitude < -30 && rng < 0.04 && g.turn - r.denouncedTurn > 40) D.denounce(g, civ.idx, o.idx);
      }
    });
  };
  // Allies join a war against the aggressor; breaking a friendship by attacking is remembered by everyone.
  D.onWarDeclared = function (g, a, b) {
    var ca = g.civs[a], cb = g.civs[b];
    if (D.isFriend(g, a, b) || D.isAlly(g, a, b)) {
      var ra = D.rel(g, a, b), rb = D.rel(g, b, a); ra.friendUntil = rb.friendUntil = -1; ra.allyUntil = rb.allyUntil = -1;
      D.log(g, b, a, 'Betrayed our friendship', -25);
      g.civs.forEach(function (c) { if (c.alive && !c.minor && c.idx !== a && c.idx !== b && c.met[a]) D.log(g, c.idx, a, 'Attacked a friend: untrustworthy', -12); });
      G.log(g, G.civData(ca).name + ' broke a friendship with ' + G.civData(cb).name + '!', a);
    }
    g.civs.forEach(function (c) {
      if (!c.alive || c.minor || c.idx === a || c.idx === b) return;
      if (D.isAlly(g, c.idx, b) && !G.atWar(g, c.idx, a) && D.canDeclareWar(g, c.idx, a)) { G.declareWar(g, c.idx, a); G.log(g, G.civData(c).name + ' joins the war to defend its ally ' + G.civData(cb).name + '.', c.idx); }
    });
  };
  // Player-facing greeting for the first meeting
  D.greeting = function (g, civ, player) {
    var d = G.civData(civ), l = G.leaderData(civ), ag = D.agenda(civ), att = D.rel(g, civ.idx, player.idx) ? D.rel(g, civ.idx, player.idx).attitude : 0;
    var open = att >= 10 ? 'Greetings, stranger. ' : att <= -10 ? 'So, another power creeps toward our lands. ' : 'Well met. ';
    return open + 'I am ' + l.name + ', ' + (l.title.indexOf(' of ') >= 0 ? l.title : l.title + ' of ' + d.name) + '. ' + ag.line;
  };
})(globalThis.AU = globalThis.AU || {});
