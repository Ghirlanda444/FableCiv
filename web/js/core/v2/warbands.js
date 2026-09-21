// Warbands (Divergence rules): up to three fighters of one empire share a tile and fight as one.
// A Warband attacks and defends in a single exchange with combined strength (strongest counts full,
// the next 60%, the third 40%); damage lands on the weakest member first; a Commander on the tile adds
// 15% strength and 1 movement; every unit that ends its move next to an enemy stack stops there (zone of control).
(function (AU) {
  var G = AU.G, U = AU.U;
  var WB = AU.Warbands = {};
  WB.MAX = 3;
  WB.WEIGHTS = [1, 0.6, 0.4];
  WB.COMMANDER_MULT = 1.15;
  WB.on = function (g) { return !!(g && g.v2); };
  WB.isCommander = function (u) { return !!AU.UNITS[u.type].commander; };
  // The fighters of one side on a tile: military units that are neither Commanders nor Great People.
  WB.isDecoy = function (u) { return !!AU.UNITS[u.type].decoy; };
  WB.fighters = function (g, tileIdx, civIdx) { return G.unitsAt(g, tileIdx).filter(function (o) { return o.civ === civIdx && G.isMilitary(o) && !WB.isCommander(o) && !WB.isDecoy(o) && !AU.UNITS[o.type].great; }); };
  WB.commanderAt = function (g, tileIdx, civIdx) { return G.unitsAt(g, tileIdx).filter(function (o) { return o.civ === civIdx && WB.isCommander(o); })[0] || null; };
  // Everyone of the side who travels as the Warband on this tile (fighters plus the Commander).
  WB.members = function (g, tileIdx, civIdx) { return G.unitsAt(g, tileIdx).filter(function (o) { return o.civ === civIdx && G.isMilitary(o) && !WB.isDecoy(o) && !AU.UNITS[o.type].great; }); };
  // ---------- bait ----------
  // A Scarecrow Crew's bait level: 1, plus 1 per Bait Spark. Attackers lose 4/6/8 Strength for 10/15/20 turns.
  WB.baitLevel = function (g, civ) { return 1 + (civ ? (G.civFx(g, civ).scarecrowLevel || 0) : 0); };
  WB.baitPenalty = function (level) { return 2 + 2 * level; };
  WB.baitTurns = function (level) { return 5 + 5 * level; };
  WB.baited = function (g, u) { return u.baited && u.baited.until > g.turn ? u.baited : null; };
  // The ambush: the attackers spend their turn, carry a Strength penalty for a while, and the crew is gone.
  WB.springBait = function (g, u, decoy, group) {
    var owner = U.civ(g, decoy), level = WB.baitLevel(g, owner), pen = WB.baitPenalty(level), turns = WB.baitTurns(level), civ = U.civ(g, u);
    var result = { attacker: u.id, tile: decoy.tile, baited: true, attackers: group.map(function (o) { return o.id; }), baitLevel: level, baitTurns: turns, baitPenalty: pen };
    group.forEach(function (o) { o.moves = 0; o.attacksLeft = 0; o.attackedTurn = g.turn; o.fortify = 0; o.sleep = false; o.path = null; o.baited = { until: g.turn + turns, str: pen, by: decoy.civ }; });
    if (civ) { civ.flags['ev:baited'] = g.turn; G.notify(g, civ, { kind: 'loss', text: '🎃 ' + _('An ambush!') + ' ' + _('That Warband was a Scarecrow Crew:') + ' ' + group.length + ' ' + _('of your units lose their turn and fight') + ' -' + pen + ' ' + _('Strength for') + ' ' + turns + ' ' + _('turns.'), tile: decoy.tile }); }
    if (owner) { owner.flags['ev:baitSprung'] = g.turn; owner.stats.baits = (owner.stats.baits || 0) + 1; G.notify(g, owner, { kind: 'capture', text: '🎃 ' + decoy.name + ' ' + _('sprang its ambush near') + ' ' + U.nearestName(g, decoy.tile) + ': ' + group.length + ' ' + _('enemy units lose their turn and') + ' -' + pen + ' ' + _('Strength for') + ' ' + turns + ' ' + _('turns.'), tile: decoy.tile }); }
    G.removeUnit(g, decoy);
    return result;
  };
  // May unit u end its move on this tile next to the friends already there?
  WB.roomFor = function (g, u, tileIdx) {
    if (!G.isMilitary(u) || AU.UNITS[u.type].great) return true;
    if (WB.isCommander(u)) { var c = WB.commanderAt(g, tileIdx, u.civ); return !c || c.id === u.id; }
    if (WB.isDecoy(u)) return !G.unitsAt(g, tileIdx).some(function (o) { return o.civ === u.civ && o.id !== u.id && WB.isDecoy(o); }); // one Scarecrow Crew per tile
    return WB.fighters(g, tileIdx, u.civ).filter(function (o) { return o.id !== u.id; }).length < WB.MAX;
  };
  // Combined strength of a group in one exchange. parts are sorted strongest first.
  WB.groupStrength = function (g, units, ctx) {
    var parts = units.map(function (o) { return { u: o, str: U.strength(g, o, ctx) }; }).sort(function (a, b) { return b.str - a.str; });
    var total = 0; parts.forEach(function (p, i) { total += p.str * (WB.WEIGHTS[i] || 0); });
    var cmd = units.length && G.isMilitary(units[0]) ? WB.commanderAt(g, units[0].tile, units[0].civ) : null;
    if (cmd) total *= WB.COMMANDER_MULT;
    return { total: Math.max(1, Math.round(total)), parts: parts, commander: cmd };
  };
  // Damage lands on the weakest member first and spills over to the next when one dies. Returns the units killed.
  WB.spread = function (parts, dmg) {
    var killed = [], left = dmg;
    for (var i = parts.length - 1; i >= 0 && left > 0; i--) { var o = parts[i].u; var take = Math.min(left, o.hp); o.hp -= take; left -= take; if (o.hp <= 0) killed.push(o); }
    return killed;
  };
  // The fighters who join unit u in an attack on a tile: same kind (ranged or melee) and able to strike it.
  WB.attackGroup = function (g, u, tileIdx) {
    var ranged = U.isRanged(u);
    return WB.fighters(g, u.tile, u.civ).filter(function (o) { return o.id === u.id || (U.isRanged(o) === ranged && U.canAttackTile(g, o, tileIdx, true)); }); // the band strikes on the initiator's order
  };
  WB.defenceGroup = function (g, target, tileIdx) {
    var v = target.unit; if (!v) return [];
    if (!G.isMilitary(v) || AU.UNITS[v.type].great) return [v];
    var f = WB.fighters(g, tileIdx, v.civ); return f.length ? f : [v];
  };
  // Numbers the attack card shows: our combined strength, theirs, and the expected damage each way.
  WB.preview = function (g, u, tileIdx) {
    var target = U.targetAt(g, u, tileIdx); if (!target) return null;
    var ranged = U.isRanged(u), group = WB.attackGroup(g, u, tileIdx);
    var a = WB.groupStrength(g, group, { attacking: true, ranged: ranged, vs: target.unit || target.settlement });
    var d, dGroup = [];
    if (target.settlement && (!target.unit || ranged)) d = G.settlementStrength(g, target.settlement);
    else { dGroup = WB.defenceGroup(g, target, tileIdx); d = WB.groupStrength(g, dGroup, { attacking: false, vs: a.parts[0].u }).total; if (target.settlement) d = Math.max(d, G.settlementStrength(g, target.settlement) - 5); if (dGroup.length === 1 && WB.isDecoy(dGroup[0]) && dGroup[0].civ !== u.civ) { var dz = AU.UNITS[AU.UNITS[dGroup[0].type].disguise || 'warrior']; d = Math.round(dz.strength * 2); dGroup = [dGroup[0], dGroup[0], dGroup[0]]; } }
    var est = Math.round(30 * Math.exp(0.04 * (a.total - d)));
    var back = ranged ? 0 : Math.round(30 * Math.exp(0.04 * (d - a.total)) * (target.settlement && !target.unit ? 0.7 : 1));
    return { a: a.total, d: d, est: est, back: back, attackers: group.length, defenders: dGroup.length, commander: !!a.commander };
  };
  // One exchange between the Warband on u's tile and whatever holds the target tile. Mirrors U.attack's result shape.
  WB.attack = function (g, u, tileIdx) {
    g.undo = null;
    var target = U.targetAt(g, u, tileIdx), ranged = U.isRanged(u), def = U.def(g, u), civ = U.civ(g, u);
    var result = { attacker: u.id, ranged: ranged, tile: tileIdx, warband: true };
    var group = WB.attackGroup(g, u, tileIdx);
    group.forEach(function (o) { o.attackedTurn = g.turn; o.fortify = 0; o.sleep = false; o.path = null; o.orderedTurn = g.turn; });
    if (civ) civ.flags['ev:combat'] = g.turn;
    if (target.unit) { var tciv = U.civ(g, target.unit); if (tciv) tciv.flags['ev:combat'] = g.turn; } else if (target.settlement && g.civs[target.settlement.civ]) g.civs[target.settlement.civ].flags['ev:combat'] = g.turn;
    if (target.unit && WB.isDecoy(target.unit) && !target.settlement && !WB.fighters(g, tileIdx, target.unit.civ).length) { var br = WB.springBait(g, u, target.unit, group); if (civ && civ.isPlayer) G.refreshVisibility(g, civ); return br; }
    var atk = WB.groupStrength(g, group, { attacking: true, ranged: ranged, vs: target.unit || target.settlement });
    result.attackers = group.map(function (o) { return o.id; }); result.attackStrength = atk.total;
    var xpMult = (civ ? (G.civFx(g, civ).xpMult || 1) : 1) * (1 + (def.xpMult || 0));
    function retaliation(back) { if (def.noRetaliation) return 0; if (def.halfRetaliation) return Math.round(back / 2); return back; }
    if (target.settlement && (!target.unit || ranged)) {
      var s = target.settlement, sStr = G.settlementStrength(g, s);
      var dmg = U.damage(g, atk.total - sStr);
      if (ranged && def.cls !== 'siege' && def.cls !== 'navalRanged') dmg = Math.round(dmg * 0.5);
      s.hp = Math.max(0, s.hp - dmg); s.attackedTurn = g.turn;
      result.settlementDamage = dmg; result.settlement = s.id; result.defenceStrength = sStr;
      if (!ranged) { var back = Math.round(retaliation(U.damage(g, sStr - atk.total)) * 0.7); result.attackerDamage = back; WB.spread(atk.parts, back); }
      if (s.hp <= 0 && !ranged && U.canCapture(u) && u.hp > 0) {
        if (target.unit) G.unitsAt(g, tileIdx).forEach(function (o) { if (o.civ !== u.civ) G.removeUnit(g, o); });
        U.captureSettlement(g, s, u.civ, def);
        WB.members(g, u.tile, u.civ).forEach(function (o) { if (o.hp > 0) { o.moves = 0; G.setUnitTile(g, o, tileIdx); } });
        result.captured = true;
        WB.bury(g, group, result, u); if (civ && civ.isPlayer) G.refreshVisibility(g, civ);
        return result;
      }
      G.notify(g, g.civs[s.civ], { kind: 'attack', text: s.name + ' ' + _('is under attack!'), tile: s.tile, settlement: s.id });
      group.forEach(function (o) { if (o.hp > 0) o.xp += 1 * xpMult; });
    } else if (target.unit) {
      var v = target.unit, dGroup = WB.defenceGroup(g, target, tileIdx);
      var dfn = WB.groupStrength(g, dGroup, { attacking: false, vs: atk.parts[0].u });
      var defStr = dfn.total; if (target.settlement) defStr = Math.max(defStr, G.settlementStrength(g, target.settlement) - 5);
      var dmg2 = U.damage(g, atk.total - defStr);
      if (!G.isMilitary(v)) dmg2 = 100; else if (dGroup.every(function (o) { return U.isEmbarked(g, o); })) dmg2 = 100 * dGroup.length;
      result.defenderDamage = dmg2; result.defender = dfn.parts[dfn.parts.length - 1].u.id; result.defenceStrength = defStr; result.defenders = dGroup.length;
      var killed = WB.spread(dfn.parts, dmg2);
      if (!ranged) { var back2 = G.isMilitary(v) ? retaliation(U.damage(g, defStr - atk.total)) : 0; result.attackerDamage = back2; WB.spread(atk.parts, back2); }
      var vciv = U.civ(g, v);
      if (killed.length) {
        result.killed = killed[0].id; result.killedCount = killed.length; result.killedNames = killed.map(function (o) { return o.name; });
        group.forEach(function (o) { if (o.hp > 0) o.xp += (o.id === u.id ? 3 : 2) * killed.length * xpMult; });
        killed.forEach(function (k) {
          U.killRewards(g, u, def, k);
          if (civ) { var kf = G.civFx(g, civ); if (kf.faithFromKills) civ.bonusFaith = (civ.bonusFaith || 0) + kf.faithFromKills; if (kf.goldPerKill) civ.gold += kf.goldPerKill; if (kf.culturePerKill) civ.bonusCulture = (civ.bonusCulture || 0) + kf.culturePerKill; civ.stats.kills++; if (U.isNaval(u)) civ.flags['ev:killNaval'] = g.turn; if (U.isRanged(u)) civ.flags['ev:killRanged'] = g.turn; if (AU.UNITS[u.type].cls === 'antcav') civ.flags['ev:killSpear'] = g.turn; if (u.type === 'slinger') civ.flags['ev:killSlinger'] = g.turn; }
          var kciv = U.civ(g, k);
          if (kciv) { kciv.flags['ev:combat'] = g.turn; kciv.flags['ev:unitLost'] = g.turn; if (U.isNaval(k)) kciv.flags['ev:boatLost'] = g.turn; G.notify(g, kciv, { kind: 'loss', text: _('Your') + ' ' + k.name + ' was killed near ' + U.nearestName(g, k.tile) + '.', tile: k.tile }); }
          if (!G.isMilitary(k) && !ranged && U.canCapture(u) && !AU.UNITS[k.type].religious) { k.civ = u.civ; k.hp = 100; k.moves = 0; result.capturedUnit = k.id; if (civ) G.notify(g, civ, { kind: 'capture', text: _('Captured an enemy') + ' ' + k.name + '!', tile: k.tile }); }
          else G.removeUnit(g, k);
        });
        // the tile is empty of enemies: the whole Warband advances into it
        var enemiesLeft = G.unitsAt(g, tileIdx).some(function (o) { return o.civ !== u.civ; });
        if (!ranged && !enemiesLeft && !target.settlement && !U.tileBlocked(g, u, tileIdx, true) && U.enterCost(g, u, g.tiles[tileIdx], g.tiles[u.tile]) !== Infinity) {
          WB.members(g, u.tile, u.civ).forEach(function (o) { if (o.hp > 0 && WB.roomFor(g, o, tileIdx)) G.setUnitTile(g, o, tileIdx); }); result.advanced = true;
        }
      } else group.forEach(function (o) { if (o.hp > 0) o.xp += 1 * xpMult; });
      if (vciv && !killed.length) vciv.flags['ev:combat'] = g.turn;
      if (target.settlement) target.settlement.attackedTurn = g.turn;
    }
    group.forEach(function (o) {
      o.attacksLeft = Math.max(0, (o.attacksLeft === undefined ? 1 : o.attacksLeft) - 1);
      var od = U.def(g, o);
      if (o.attacksLeft > 0 && o.moves > 0) o.moves = Math.max(1, o.moves - 1); else if (od.movesAfterAttack) o.moves = Math.max(0, o.moves - 1); else o.moves = 0;
    });
    WB.bury(g, group, result, u);
    if (civ && civ.isPlayer) G.refreshVisibility(g, civ);
    return result;
  };
  // Remove the attackers who fell in the exchange.
  WB.bury = function (g, group, result, u) {
    var civ = U.civ(g, u);
    group.forEach(function (o) { if (o.hp <= 0 && g.units[o.id]) { if (o.id === u.id) result.attackerKilled = true; result.attackersLost = (result.attackersLost || 0) + 1; if (civ) { G.notify(g, civ, { kind: 'loss', text: _('Your') + ' ' + o.name + ' ' + _('died attacking.'), tile: o.tile }); civ.flags['ev:unitLost'] = g.turn; } G.removeUnit(g, o); } });
  };
  // ---------- zone of control ----------
  WB.zocApplies = function (g, u) { var d = AU.UNITS[u.type]; return G.isMilitary(u) && !d.great && !d.ignoreZoc && d.cls !== 'recon' && !U.isNaval(u) && !U.isAir(u); };
  // Is the tile next to an enemy fighter (someone at war with civIdx)?
  WB.zocAt = function (g, civIdx, tileIdx) {
    var nb = G.neighbors(g, g.tiles[tileIdx]);
    for (var i = 0; i < nb.length; i++) { var us = G.unitsAt(g, nb[i]); for (var j = 0; j < us.length; j++) { var o = us[j]; if (o.civ !== civIdx && G.isMilitary(o) && !WB.isCommander(o) && !AU.UNITS[o.type].great && G.atWar(g, civIdx, o.civ)) return true; } }
    return false;
  };
  // ---------- moving together ----------
  // Order every awake member of the Warband on `origin` (except u, already ordered) to the same destination.
  WB.moveTogether = function (g, u, origin, target) {
    var n = 0;
    WB.members(g, origin, u.civ).forEach(function (o) { if (o.id === u.id || o.moves <= 0 || o.sleep) return; if (U.orderMove(g, o, target)) n++; });
    return n;
  };
  // ---------- Migrants ----------
  WB.canJoin = function (g, u) { var s = G.settlementAt(g, u.tile); return !!(AU.UNITS[u.type].migrant && s && s.civ === u.civ && u.moves > 0); };
  WB.join = function (g, u) {
    if (!WB.canJoin(g, u)) return false;
    var s = G.settlementAt(g, u.tile); s.pop += 1; s.pendingGrowth += 1; G.autoExpand(g, s);
    var civ = U.civ(g, u); if (civ) G.notify(g, civ, { kind: 'growth', text: u.name + ' ' + _('joined') + ' ' + s.name + ' (' + _('population') + ' ' + s.pop + ').', tile: s.tile, settlement: s.id });
    G.removeUnit(g, u); return s;
  };
  // Text for the unit card: who is in the Warband and what it fights at.
  WB.describe = function (g, u) {
    var m = WB.members(g, u.tile, u.civ); if (m.length < 2) return null;
    var f = WB.fighters(g, u.tile, u.civ), gs = WB.groupStrength(g, f, { attacking: false });
    return { members: m, fighters: f, strength: gs.total, commander: gs.commander, full: f.length >= WB.MAX };
  };
})(globalThis.AU = globalThis.AU || {});
