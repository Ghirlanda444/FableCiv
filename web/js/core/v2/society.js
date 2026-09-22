// Society (Divergence rules): resource richness tiers, Kinfolk persuasion and Bonds, happiness tiers and Migration Pull.
(function (AU) {
  var G = AU.G;
  var SO = AU.Society = {};
  SO.on = function (g) { return !!(g && g.v2); };
  // ---------- resource richness ----------
  // Every resource tile of a Divergence map carries a tier: 0 poor, 1 normal, 2 rich. Yields grow with the tier and a strategic tile supports 1, 2 or 3 units.
  SO.RICH = [{ id: 'poor', name: 'Poor', pips: 1, supply: 1 }, { id: 'normal', name: 'Normal', pips: 2, supply: 2 }, { id: 'rich', name: 'Rich', pips: 3, supply: 3 }];
  SO.richOf = function (t) { return t && t.rich != null ? SO.RICH[t.rich] : null; };
  // Extra yields a tier adds on top of the resource's own: normal +1 on its first yield, rich +1 on every yield and +1 more on the first.
  SO.richYields = function (t, R) {
    if (t.rich == null || !R) return null;
    var keys = Object.keys(R.yields || {}), out = {};
    if (!keys.length) return null;
    if (t.rich >= 1) out[keys[0]] = (out[keys[0]] || 0) + 1;
    if (t.rich >= 2) { keys.forEach(function (k) { out[k] = (out[k] || 0) + 1; }); }
    return out;
  };
  SO.supplyOf = function (t) { return t.rich == null ? 1 : SO.RICH[t.rich].supply; };
  // Units in service that eat a strategic resource.
  SO.resourceUse = function (g, civ, res) { var n = 0; G.civUnits(g, civ.idx).forEach(function (u) { if (AU.UNITS[u.type].resource === res) n++; }); return n; };
  SO.resourceSupply = function (g, civ, res) { return G.luxuryCount(g, civ).strategic[res] || 0; };
  SO.canSupply = function (g, civ, res) { return !res || SO.resourceSupply(g, civ, res) > SO.resourceUse(g, civ, res); };
  // ---------- happiness tiers ----------
  SO.TIERS = [
    { id: 'miserable', name: 'Miserable', icon: '😭', min: -Infinity, mult: 0.6, growth: 0 },
    { id: 'unhappy', name: 'Unhappy', icon: '😠', min: -4, mult: 0.85, growth: 0.5 },
    { id: 'content', name: 'Content', icon: '🙂', min: 0, mult: 1, growth: 1 },
    { id: 'happy', name: 'Happy', icon: '😊', min: 4, mult: 1.1, growth: 1.1 },
    { id: 'joyful', name: 'Joyful', icon: '🤩', min: 8, mult: 1.2, growth: 1.25 }
  ];
  SO.tierOf = function (h) { var out = SO.TIERS[0]; SO.TIERS.forEach(function (T) { if (h >= T.min) out = T; }); return out; };
  SO.tierIndex = function (h) { return SO.TIERS.indexOf(SO.tierOf(h)); };
  // The empire's mood: population-weighted happiness of its settlements.
  SO.mood = function (g, civ) {
    var sets = G.civSettlements(g, civ.idx), sum = 0, pop = 0;
    sets.forEach(function (s) { var h = G.settlementYields(g, s).happiness || 0; sum += h * s.pop; pop += s.pop; });
    var h = pop ? sum / pop : 0;
    return { value: Math.round(h * 10) / 10, tier: SO.tierOf(h), settlements: sets.length };
  };
  // ---------- Migration Pull ----------
  SO.MIGRATION_EVERY = 10;
  SO.sharesBorder = function (g, a, b) {
    var owner = G.tileOwnerCiv;
    for (var i = 0; i < g.tiles.length; i++) { var t = g.tiles[i]; if (owner(g, t) !== a) continue; var nb = G.neighbors(g, t); for (var k = 0; k < nb.length; k++) if (owner(g, g.tiles[nb[k]]) === b) return true; }
    return false;
  };
  // Every 10 turns a Joyful empire draws one citizen from each Miserable neighbour into its smallest settlement.
  SO.migrationTurn = function (g) {
    if (!SO.on(g) || g.turn % SO.MIGRATION_EVERY !== 0) return [];
    var majors = g.civs.filter(function (c) { return c.alive && !c.minor; }), moods = {}, moves = [];
    majors.forEach(function (c) { moods[c.idx] = SO.mood(g, c).tier.id; });
    majors.forEach(function (a) {
      if (moods[a.idx] !== 'joyful') return;
      majors.forEach(function (b) {
        if (b.idx === a.idx || moods[b.idx] !== 'miserable' || !SO.sharesBorder(g, a.idx, b.idx)) return;
        var from = null; G.civSettlements(g, b.idx).forEach(function (s) { if (s.pop >= 3 && (!from || s.pop > from.pop)) from = s; });
        var to = null; G.civSettlements(g, a.idx).forEach(function (s) { if (!to || s.pop < to.pop) to = s; });
        if (!from || !to) return;
        from.pop -= 1; G.unworkWorstTile(g, from); to.pop += 1; to.pendingGrowth += 1; G.autoExpand(g, to);
        moves.push({ from: from, to: to });
        G.notify(g, a, { kind: 'growth', text: '🧳 ' + _('Migration Pull') + ': ' + _('a family from') + ' ' + from.name + ' (' + G.civData(b).name + ') ' + _('settled in') + ' ' + to.name + '.', tile: to.tile, settlement: to.id });
        G.notify(g, b, { kind: 'starve', text: '🧳 ' + _('Migration Pull') + ': ' + _('a family left') + ' ' + from.name + ' ' + _('for the joyful lands of') + ' ' + G.civData(a).name + '.', tile: from.tile, settlement: from.id });
      });
    });
    return moves;
  };
  // ---------- Kinfolk: persuasion and Bonds ----------
  // What each free city listens to. The matching way of building Ties counts double.
  SO.PERSUASION = {
    gifts: { name: 'Gifts', icon: '🎁', desc: 'Gold gifts and caravans count double.' },
    deeds: { name: 'Deeds', icon: '🏅', desc: 'Their quests count double.' },
    faith: { name: 'Faith', icon: '🕊️', desc: 'Sharing their religion counts double.' },
    force: { name: 'Force', icon: '🛡️', desc: 'Soldiers guarding their land count double.' }
  };
  SO.persuasionOf = function (minor) { var t = minor.stateType; return t === 'trade' ? 'gifts' : t === 'military' ? 'force' : t === 'religious' ? 'faith' : 'deeds'; };
  // Does a way of earning Ties match the city's persuasion? (source ids: caravan, gift, quest, religion, garrison)
  SO.persuasionMult = function (minor, why) {
    var p = SO.persuasionOf(minor);
    if (p === 'gifts' && (why === 'gift' || why === 'caravan')) return 2;
    if (p === 'deeds' && why === 'quest') return 2;
    if (p === 'faith' && why === 'religion') return 2;
    if (p === 'force' && why === 'garrison') return 2;
    return 1;
  };
  SO.BOND_TIER = 3; // Patron
  SO.bondUpkeep = function (g, civ) { var n = (civ.bonds || []).length; return n ? Math.round((2 + n) * (G.civFx(g, civ).bondUpkeepMult !== undefined ? G.civFx(g, civ).bondUpkeepMult : 1)) : 0; };
  SO.bondUpkeepNext = function (g, civ) { return Math.round((2 + (civ.bonds || []).length + 1) * (G.civFx(g, civ).bondUpkeepMult !== undefined ? G.civFx(g, civ).bondUpkeepMult : 1)); };
  SO.hasBond = function (civ, minor) { return (civ.bonds || []).indexOf(minor.civId) >= 0; };
  SO.bondsOf = function (g, civ) { return (civ.bonds || []).map(function (id) { return g.civs.filter(function (c) { return c.civId === id; })[0]; }).filter(function (m) { return m && m.alive; }); };
  SO.bondState = function (g, civ, minor) {
    var CS = AU.CityStates;
    if (civ.minor || !minor.alive || G.atWar(g, civ.idx, minor.idx)) return { ok: false, why: _('not possible') };
    if (SO.hasBond(civ, minor)) return { ok: false, bonded: true, why: _('bonded') };
    if (CS.patron(g, minor) !== civ.idx || CS.tierOf(CS.tiesOf(g, civ, minor)) < SO.BOND_TIER) return { ok: false, why: _('you must be its Patron (60 Ties)') };
    var up = SO.bondUpkeepNext(g, civ);
    if ((civ.influence || 0) < up * 3) return { ok: false, why: _('needs') + ' ' + (up * 3) + ' ' + _('Influence in hand') };
    return { ok: true, why: '', upkeep: up };
  };
  SO.bond = function (g, civ, minor) {
    if (!SO.bondState(g, civ, minor).ok) return false;
    civ.bonds = (civ.bonds || []).concat([minor.civId]);
    g.civs.forEach(function (c) { c._fx = null; }); g.fxGen = (g.fxGen || 0) + 1;
    var name = G.civData(minor).name;
    G.log(g, name + ' ' + _('bonded with') + ' ' + G.civData(civ).name + '.', civ.idx);
    G.notify(g, civ, { kind: 'diplomacy', text: '🤝 ' + _('Bond with') + ' ' + name + ': ' + _('half its yields flow to your capital and its bonus is yours while you pay') + ' ' + SO.bondUpkeep(g, civ) + ' ' + _('Influence a turn.'), panel: 'diplomacy' });
    return true;
  };
  SO.breakBond = function (g, civ, minor, why) {
    if (!SO.hasBond(civ, minor)) return false;
    civ.bonds = civ.bonds.filter(function (id) { return id !== minor.civId; });
    civ.bondShame = g.turn + 20;
    if (AU.CityStates && minor.alive) AU.CityStates.addTies(g, civ, minor, -30);
    g.civs.forEach(function (c) { c._fx = null; }); g.fxGen = (g.fxGen || 0) + 1;
    G.notify(g, civ, { kind: 'diplomacy', text: '💔 ' + _('The bond with') + ' ' + G.civData(minor).name + ' ' + _('is broken') + (why ? ' (' + why + ')' : '') + ': ' + _('-2 Happiness everywhere for 20 turns.'), panel: 'diplomacy' });
    return true;
  };
  // Yields a bonded free city sends to the patron's capital: half of what its own settlement makes (not food).
  SO.bondYields = function (g, civ) {
    var out = { production: 0, gold: 0, science: 0, culture: 0, faith: 0 };
    SO.bondsOf(g, civ).forEach(function (m) { var s = G.civSettlements(g, m.idx)[0]; if (!s) return; var y = G.settlementYields(g, s); ['production', 'gold', 'science', 'culture', 'faith'].forEach(function (k) { out[k] += Math.round((y[k] || 0) * 0.5 * 10) / 10; }); });
    return out;
  };
  // Per turn: pay upkeep, break bonds that cannot be paid, let the AI bond when it can.
  SO.bondsTurn = function (g, civ) {
    if (!SO.on(g) || civ.minor || !civ.alive) return;
    var up = SO.bondUpkeep(g, civ);
    if (up) {
      civ.influence = (civ.influence || 0) - up;
      if (civ.influence < 0) { var m = SO.bondsOf(g, civ)[0]; civ.influence = 0; if (m) SO.breakBond(g, civ, m, _('no Influence left for its upkeep')); }
    }
    SO.bondsOf(g, civ).forEach(function (m) { if (G.atWar(g, civ.idx, m.idx)) SO.breakBond(g, civ, m, _('war')); });
    if (!civ.isPlayer && AU.CityStates) AU.CityStates.minors(g).forEach(function (m) { if (m.alive && civ.met[m.idx] && (civ.influence || 0) >= 40 && SO.bondState(g, civ, m).ok) SO.bond(g, civ, m); });
  };
})(globalThis.AU = globalThis.AU || {});
