// Signature effects: the one-of-a-kind part of each civ and leader ability (data in data/v2/signatures.js).
// Every key here belongs to exactly one ability; tests/uniqueness.js checks that no ability is left without one.
(function (AU) {
  var G = AU.G;
  var SG = AU.Sig = {};
  function worked(g, s, f) { var n = 0; s.tiles.forEach(function (i) { if (i === s.tile) return; var t = g.tiles[i]; if (t.worked && f(t)) n++; }); return n; }
  function atWarWithAnyone(g, civ) { return g.civs.some(function (o) { return o !== civ && o.alive && !o.minor && G.atWar(g, civ.idx, o.idx); }); }
  function friends(g, civ) { var D = AU.Diplo; if (!D) return 0; return g.civs.filter(function (o) { return o !== civ && o.alive && !o.minor && (D.isFriend(g, civ.idx, o.idx) || D.isAlly(g, civ.idx, o.idx)); }).length; }
  function capTile(g, civ) { var c = civ.capital && g.settlements[civ.capital]; return c ? g.tiles[c.tile] : null; }
  function sparks(civ) { return civ.v2 && civ.v2.unlocked ? Object.keys(civ.v2.unlocked).length : Object.keys(civ.techs || {}).length; }
  SG.nearForeign = function (g, s, range) { var t = g.tiles[s.tile]; for (var id in g.settlements) { var o = g.settlements[id], oc = g.civs[o.civ]; if (o.civ !== s.civ && oc && !oc.minor && G.dist(t, g.tiles[o.tile]) <= range) return true; } return false; };
  SG.isDesertRiver = function (t) { return t.river && t.terrain === 'desert'; };
  SG.isDelta = function (g, t) { return t.feature === 'marsh' || (t.river && G.neighbors(g, t).some(function (n) { return G.isWater(g.tiles[n]) && g.tiles[n].terrain !== 'lake'; })); };

  // ---------- settlement yields (added in G.settlementYields) ----------
  SG.settlementYields = function (g, s, civ, fx, y) {
    var t = g.tiles[s.tile], ct = capTile(g, civ);
    if (fx.capitalCulturePerBuilding && s.isCapital) y.culture += fx.capitalCulturePerBuilding * s.buildings.filter(function (b) { return AU.BUILDINGS[b]; }).length; // Ringstraße
    if (fx.manyFaiths && AU.Religion) y.happiness += Math.min(2, Math.max(0, AU.Religion.faithsIn(g, civ).length - 1)) * fx.manyFaiths; // Dharma
    if (fx.edictsPeace && !atWarWithAnyone(g, civ)) y.culture += fx.edictsPeace; // Edicts of Ashoka
    if (fx.palapa && ct && t.continent !== ct.continent) { y.production += fx.palapa; y.happiness += 1; } // the Palapa Oath: one Nusantara
    if (fx.bondHappiness && g.v2 && AU.Society) y.happiness += Math.min(3, (civ.bonds || []).length) * fx.bondHappiness; // Mandukhai reunites the clans
    if (fx.desertRiver) { var n = worked(g, s, SG.isDesertRiver); y.food += 2 * n; y.production += n; } // the black land of the Nile
    if (fx.farScience && ct && !s.isCapital && G.dist(t, ct) >= 10) { y.science += fx.farScience; y.culture += 1; } // an Alexandria at the end of the world
    if (fx.riverCity && t.river) y.production += Math.floor(s.pop / 5) * fx.riverCity; // Babylon on the Euphrates
    if (fx.danube && (t.navigable || G.neighbors(g, t).some(function (i) { return g.tiles[i].navigable; }))) { y.gold += fx.danube; y.culture += 1; } // the Danube monarchy
    if (fx.schooling) y.science += Math.floor(s.pop / 3) * fx.schooling; // Maria Theresa's compulsory schooling
    if (fx.mitaLabor && !s.isCity) y.production += Math.floor(s.pop / 3) * fx.mitaLabor; // the Mit'a labour levy
    if (fx.delta) { var d = worked(g, s, function (x) { return SG.isDelta(g, x); }); y.food += d; y.production += d; } // the Mekong delta
    if (fx.rockChurches && t.hills && (G.hasBuilding(s, 'shrine') || G.hasBuilding(s, 'temple'))) y.faith += fx.rockChurches; // Lalibela
    if (fx.bigHappiness && s.pop >= 6) y.happiness += fx.bigHappiness; // the Kouroukan Fouga charter
    if (fx.nubianGold) y.gold += worked(g, s, function (x) { return G.improvementFor(g, x, civ) === 'mine'; }) * fx.nubianGold; // Ta-Nehesi, the land of gold
    if (fx.feitoria && !s.isCapital && G.isCoastal(g, s)) { y.gold += fx.feitoria + (ct && t.continent !== ct.continent ? 1 : 0); y.production += 1; } // a feitoria
    if (fx.hospitals && (G.hasBuilding(s, 'shrine') || G.hasBuilding(s, 'temple'))) y.happiness += fx.hospitals; // Jayavarman's 102 hospitals
    if (fx.allyProduction) y.production += Math.min(3, friends(g, civ)) * fx.allyProduction; // the Triple Alliance
    if (fx.bulwark && SG.nearForeign(g, s, 6)) y.faith += fx.bulwark; // Antemurale
    if (fx.shipyards && G.isCoastal(g, s)) y.production += (1 + Math.floor(s.pop / 3)) * fx.shipyards; // the Royal Dockyards
    if (fx.paddies) y.food += worked(g, s, function (x) { return !G.isWater(x) && !x.hills && x.terrain !== 'mountain' && (x.river || G.neighbors(g, x).some(function (i) { return G.isWater(g.tiles[i]); })); }) * fx.paddies; // rice paddies
    if (fx.lisbon && s.isCapital) { var ports = Math.min(6, G.civSettlements(g, civ.idx).filter(function (o) { return G.isCoastal(g, o); }).length); y.production += ports * fx.lisbon; y.gold += ports * fx.lisbon; } // Lisbon
    if (fx.subak) y.food += ((G.hasBuilding(s, 'shrine') ? 1 : 0) + (G.hasBuilding(s, 'temple') ? 1 : 0)) * fx.subak; // Bali's temple-run irrigation
    if (fx.dure) { var dq = Math.floor(s.pop / 4) * fx.dure; y.food += dq; y.production += dq; } // Korean village work teams
    if (fx.stockfish && G.isCoastal(g, s)) { y.food += 2 * fx.stockfish; y.gold += fx.stockfish; } // Norwegian dried cod
    if (fx.poleis) { var near = Math.min(3, G.civSettlements(g, civ.idx).filter(function (o) { return o !== s && G.dist(g.tiles[o.tile], t) <= 6; }).length) * fx.poleis; y.production += near; y.science += near; } // the Greek poleis
    if (fx.windmills && (G.hasBuilding(s, 'market') || G.hasBuilding(s, 'workshop'))) { y.production += fx.windmills; y.food += 1; } // Dutch windmills
    if (fx.cothon && s.isCity && G.isCoastal(g, s)) y.production += fx.cothon; // the Cothon of Carthage
    if (fx.moai) { if (G.hasBuilding(s, 'monument')) { y.production += fx.moai; y.food += fx.moai; } y.production += 2 * fx.moai * s.buildings.filter(function (b) { return AU.WONDERS[b]; }).length; } // the moai quarries
  };
  // settlement defense (added in G.settlementStrength)
  SG.settlementStrength = function (g, s, fx) {
    var n = 0, t = g.tiles[s.tile];
    if (fx.riverCity && t.river) n += 5;
    if (fx.bulwark && SG.nearForeign(g, s, 6)) n += 4;
    return n;
  };
  SG.growthMult = function (g, s, fx) { return fx.mekongGrowth && g.tiles[s.tile].river ? fx.mekongGrowth : 1; };
  SG.fame = function (g, civ, fx, s) { var n = 0; if (fx.wonderFame) s.buildings.forEach(function (b) { if (AU.WONDERS[b]) n += fx.wonderFame; }); return n; };

  // ---------- combat (added in U.strength) ----------
  SG.strength = function (g, u, ctx, civ, fx) {
    var n = 0, t = g.tiles[u.tile], vs = ctx && ctx.vs, vsUnit = vs && vs.hp !== undefined && vs.type ? vs : null, vsCiv = vs && vs.civ >= 0 ? g.civs[vs.civ] : null;
    var mine = function (tile) { return G.tileOwnerCiv(g, tile) === u.civ; };
    if (fx.encircle && ctx && ctx.attacking && vsUnit) { var k = G.neighbors(g, g.tiles[vsUnit.tile]).filter(function (i) { return i !== u.tile && G.unitsAt(g, i).some(function (o) { return o.civ === u.civ && G.isMilitary(o); }); }).length; n += Math.min(3, k) * fx.encircle; } // the horns of the buffalo
    if (fx.vsAdvanced && vsCiv && !vsCiv.minor && sparks(vsCiv) > sparks(civ)) n += fx.vsAdvanced; // Isandlwana
    if (fx.holyWar && g.religions) for (var rid in g.religions) { var hc = g.settlements[g.religions[rid].holyCity]; if (hc && G.dist(t, g.tiles[hc.tile]) <= 3) { n += fx.holyWar; break; } }
    if (fx.liberator && ctx && ctx.attacking && vsUnit && mine(g.tiles[vsUnit.tile])) n += fx.liberator; // Joan: drive them out
    if (fx.outnumbered && ctx && !ctx.attacking) { var e = G.neighbors(g, t).filter(function (i) { return G.unitsAt(g, i).some(function (o) { return o.civ >= 0 && o.civ !== u.civ && G.isMilitary(o) && G.atWar(g, o.civ, u.civ); }); }).length; n += Math.min(3, Math.max(0, e - 1)) * fx.outnumbered; } // the hot gates
    if (fx.vsMinor && vsCiv && vsCiv.minor) n += fx.vsMinor; // Barbarossa in Italy
    if (fx.fleetBonus && AU.U.isNaval(u)) n += Math.min(6, G.civUnits(g, u.civ).filter(function (o) { return o !== u && AU.U.isNaval(o) && G.dist(g.tiles[o.tile], t) <= 2; }).length) * fx.fleetBonus; // the Armada sails together
    if (fx.ambush && ctx && ctx.attacking && (t.feature === 'forest' || t.feature === 'jungle')) n += fx.ambush; // Lam Sơn
    if (fx.reliefOfVienna) { var D = AU.Diplo, near = false; for (var sid in g.settlements) { var st = g.settlements[sid]; if ((st.civ === u.civ || (D && (D.isFriend(g, u.civ, st.civ) || D.isAlly(g, u.civ, st.civ)))) && G.dist(t, g.tiles[st.tile]) <= 3) { near = true; break; } } if (near) n += fx.reliefOfVienna; }
    if (fx.fortifyBonus && u.fortify > 0) n += fx.fortifyBonus; // the standing army holds
    if (fx.waterLine && ctx && !ctx.attacking && mine(t) && (t.river || G.neighbors(g, t).some(function (i) { return G.isWater(g.tiles[i]); }))) n += fx.waterLine; // the Dutch water line
    return n;
  };

  // ---------- healing (added in U.heal) ----------
  SG.heal = function (g, u, civ, fx) {
    var t = g.tiles[u.tile], owner = G.tileOwnerCiv(g, t), n = 0;
    if (fx.forage && owner >= 0 && owner !== u.civ) n += fx.forage; // Hannibal lives off the land
    if (fx.hospitals) { var s = G.settlementAt(g, u.tile); if (s && s.civ === u.civ) n += 100; }
    return n;
  };

  // ---------- events ----------
  SG.onKill = function (g, u, v) {
    var civ = u.civ >= 0 ? g.civs[u.civ] : null; if (!civ) return; var fx = G.civFx(g, civ);
    if (fx.killMove && u.killMoveTurn !== g.turn) { u.killMoveTurn = g.turn; u.killMovePending = true; } // Veni, vidi, vici: granted once the attack is settled (SG.afterAttack)
    if (fx.adwa && G.tileOwnerCiv(g, g.tiles[v.tile]) === civ.idx) { // Adwa: every invader beaten at home is heard of abroad
      civ.bonusCulture = (civ.bonusCulture || 0) + fx.adwa;
      g.civs.forEach(function (o) { if (o !== civ && o.alive && !o.minor && o.idx !== v.civ && o.rel[civ.idx] && o.met && o.met[civ.idx]) o.rel[civ.idx].attitude = Math.min(80, o.rel[civ.idx].attitude + 1); });
    }
  };
  // after an attack the rules set the attacker's movement; a victor under Caesar keeps 1 tile to move (never a second attack)
  SG.afterAttack = function (g, u) { if (!u.killMovePending) return; u.killMovePending = false; var civ = u.civ >= 0 ? g.civs[u.civ] : null; if (civ && g.units[u.id]) u.moves = Math.max(u.moves, G.civFx(g, civ).killMove || 0); };
  SG.onAttack = function (g, u, tileIdx) {
    var civ = u.civ >= 0 ? g.civs[u.civ] : null; if (!civ) return; var fx = G.civFx(g, civ);
    if (fx.shoreRaid && AU.U.isNaval(u) && !G.isWater(g.tiles[tileIdx])) { civ.gold += fx.shoreRaid; if (civ.isPlayer) G.notify(g, civ, { kind: 'combat', text: '+' + fx.shoreRaid + ' ' + _('Gold plundered from the shore.'), tile: tileIdx }); } // the last Viking
  };
  SG.onCapture = function (g, s, newCiv, oldCiv) {
    var fx = G.civFx(g, newCiv), t = g.tiles[s.tile];
    if (fx.terror) G.civSettlements(g, oldCiv.idx).forEach(function (o) { if (G.dist(t, g.tiles[o.tile]) <= 6) o.hp = Math.max(1, Math.round(o.hp * 0.7)); }); // the steppe's terror runs ahead
    if (fx.kazan) G.neighbors(g, t).concat([].concat.apply([], G.neighbors(g, t).map(function (i) { return G.neighbors(g, g.tiles[i]); }))).forEach(function (i) { var x = g.tiles[i]; if (x.owner < 0 && !G.isWater(x) && x.terrain !== 'mountain') { x.owner = s.id; x.worked = false; if (s.tiles.indexOf(i) < 0) s.tiles.push(i); } }); // Kazan: the land around it too
    if (fx.devshirme) { var best = null; for (var id in AU.UNITS) { var d = G.unitType(g, newCiv, id); if (d.cls !== 'melee' || !G.gateOk(g, newCiv, 'unit', id, d) || d.resource) continue; if (!best || d.strength > G.unitType(g, newCiv, best).strength) best = id; } G.spawnUnit(g, newCiv.idx, best || 'warrior', s.tile); }
    if (fx.christening && AU.Religion && AU.Religion.rel(g, newCiv.religion)) AU.Religion.setMajority(g, s, newCiv.religion); // Olav's christening sword
    if (fx.deport) { var cap = newCiv.capital && g.settlements[newCiv.capital]; if (cap && cap !== s && s.pop > 3) { var moved = s.pop - 3; for (var k = 0; k < moved; k++) { s.pop -= 1; if (s.specialists > 0) s.specialists--; else G.unworkWorstTile(g, s); } cap.pop += moved; cap.pendingGrowth += moved; G.autoExpand(g, cap); } }
    if (fx.captureLibrary && AU.BUILDINGS.library && !G.hasBuilding(s, 'library')) G.addBuilding(g, s, 'library'); // clay tablets for Nineveh
    if (fx.coreligion && s.religion && s.religion === newCiv.religion) { s.unrest = g.turn; newCiv.faith = (newCiv.faith || 0) + fx.coreligion; } // Piye: a pious conquest
    if (fx.abroadFaith && AU.Religion && AU.Religion.rel(g, newCiv.religion)) { var ct = capTile(g, newCiv); if (ct && t.continent !== ct.continent) AU.Religion.setMajority(g, s, newCiv.religion); }
    var lf = G.civFx(g, oldCiv); // the loser
    if (lf.uprising && oldCiv.alive !== false) { var spots = G.neighbors(g, t).filter(function (i) { var x = g.tiles[i]; return !G.isWater(x) && x.terrain !== 'mountain' && !G.unitsAt(g, i).length && !G.settlementAt(g, i); }).slice(0, 2), ut = null; for (var uid in AU.UNITS) { var ud = G.unitType(g, oldCiv, uid); if (ud.cls === 'melee' && G.gateOk(g, oldCiv, 'unit', uid, ud) && !ud.resource && (!ut || ud.strength > G.unitType(g, oldCiv, ut).strength)) ut = uid; } ut = ut || 'warrior'; if (G.civSettlements(g, oldCiv.idx).length) spots.forEach(function (i) { G.spawnUnit(g, oldCiv.idx, ut, i); }); } // the Trưng sisters rise
  };
  SG.onFound = function (g, s, civ, fx) {
    var ct = capTile(g, civ), t = g.tiles[s.tile];
    if (fx.abroadFaith && AU.Religion && AU.Religion.rel(g, civ.religion) && ct && !s.isCapital && t.continent !== ct.continent) AU.Religion.setMajority(g, s, civ.religion); // the missions
  };
  SG.onPeace = function (g, a, b) {
    [[a, b], [b, a]].forEach(function (p) {
      var c = g.civs[p[0]], o = g.civs[p[1]], fx = G.civFx(g, c);
      if (fx.peaceTribute && !(o.rel[c.idx] && o.rel[c.idx].capturedThisWar)) { var pay = Math.min(Math.max(0, Math.floor(o.gold)), Math.round(fx.peaceTribute * G.speed(g))); o.gold -= pay; c.gold += pay; if (c.isPlayer && pay) G.notify(g, c, { kind: 'peace', text: G.civData(o).name + ' ' + _('pays') + ' ' + pay + ' ' + _('Gold for peace.') }); } // the treaty of Samos
    });
  };

  // ---------- once a turn ----------
  SG.turn = function (g, civ) {
    if (!civ.alive || civ.minor) return; var fx = G.civFx(g, civ), sets = G.civSettlements(g, civ.idx);
    if (fx.examInfluence && g.v2) civ.influence = (civ.influence || 0) + sets.filter(function (s) { return G.hasBuilding(s, 'library'); }).length * fx.examInfluence; // the imperial examination
    if (fx.friendGold) civ.gold += friends(g, civ) * fx.friendGold; // the Ptolemaic court
    if (fx.captureIncome) civ.gold += (civ.stats.captures || 0) * fx.captureIncome; // tribute
    if (fx.interest) civ.gold += Math.min(25, Math.floor(Math.max(0, civ.gold) * fx.interest)); // the Amsterdam exchange
    if (fx.routeIncense) { var r = G.civUnits(g, civ.idx).filter(function (u) { return u.route != null; }).length; civ.bonusFaith = (civ.bonusFaith || 0) + r * fx.routeIncense; civ.bonusCulture = (civ.bonusCulture || 0) + r; } // incense from Punt
    if (fx.divineWind) G.civSettlements(g, civ.idx).forEach(function (s) { var st = g.tiles[s.tile]; for (var id in g.units) { var u = g.units[id]; if (u.civ < 0 || u.civ === civ.idx || !AU.U.isNaval(u) || !G.atWar(g, u.civ, civ.idx)) continue; if (G.dist(g.tiles[u.tile], st) <= 2) u.hp = Math.max(10, u.hp - fx.divineWind); } }); // kamikaze
  };
  SG.greatPoints = function (g, civ, fx, out) { if (fx.wonderGreatPoints) { var w = 0; for (var k in g.wonders) { var s = g.settlements[g.wonders[k]]; if (s && s.civ === civ.idx) w++; } out.engineer += w * fx.wonderGreatPoints; } };
  SG.buildCostMult = function (g, civ, fx, s) { return fx.capitalBuildCost && s && s.isCapital ? fx.capitalBuildCost : 1; };
})(globalThis.AU = globalThis.AU || {});
