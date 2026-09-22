// Synthesis (Divergence rules): from the Glowbit Age a City with a Research Lab turns Knowledge into a lasting supply of a
// strategic resource. Every synthesis makes the next dearer, so a scholar empire arms itself without the land, but a
// resource-rich one still does it cheaper. Late-game Knowledge becomes a strategic currency instead of piling up unused.
(function (AU) {
  var G = AU.G, SY = AU.Synthesis = {};
  SY.on = function (g) { return !!(g && g.v2); };
  SY.MIN_ERA = 5; // the Glowbit Age
  SY.BASE = 300; SY.STEP = 0.6; SY.SUPPLY = 2; // Knowledge; each synthesis raises the next by 60%; supply granted per synthesis
  SY.LABS = ['research_lab', 'computer_center'];
  SY.count = function (civ) { return civ.synthN || 0; };
  SY.supplyFor = function (g, civ) { return SY.SUPPLY + (G.civFx(g, civ).synthSupplyBonus || 0); };
  SY.cost = function (g, civ) { var fx = G.civFx(g, civ); return Math.round(SY.BASE * (1 + SY.STEP * SY.count(civ)) * G.speed(g) * (fx.synthCostMult || 1)); };
  SY.hasLab = function (s) { return SY.LABS.some(function (b) { return G.hasBuilding(s, b); }); };
  SY.lab = function (g, civ) { return G.civSettlements(g, civ.idx).filter(function (s) { return s.isCity && SY.hasLab(s); })[0] || null; };
  // May this empire synthesise (in this settlement, when one is given)?
  SY.canRun = function (g, civ, s) { if (!SY.on(g) || civ.minor || (civ.era || 0) < SY.MIN_ERA) return false; return s ? (!!s.isCity && SY.hasLab(s)) : !!SY.lab(g, civ); };
  // Every strategic resource the empire knows of, with its supply and the units eating it.
  SY.options = function (g, civ) {
    var out = [];
    for (var id in AU.RESOURCES) { var R = AU.RESOURCES[id]; if (R.kind !== 'strategic' || !G.resourceKnown(g, civ, id)) continue; out.push({ id: id, supply: AU.Society ? AU.Society.resourceSupply(g, civ, id) : G.luxuryCount(g, civ).strategic[id] || 0, use: AU.Society ? AU.Society.resourceUse(g, civ, id) : 0, made: (civ.synth && civ.synth[id]) || 0 }); }
    return out;
  };
  SY.canAfford = function (g, civ) { return !!civ.v2 && (civ.v2.study || 0) >= SY.cost(g, civ); };
  SY.run = function (g, civ, res) {
    var R = AU.RESOURCES[res]; if (!R || R.kind !== 'strategic' || !SY.canRun(g, civ) || !G.resourceKnown(g, civ, res) || !SY.canAfford(g, civ)) return false;
    var cost = SY.cost(g, civ), sup = SY.supplyFor(g, civ); civ.v2.study -= cost;
    civ.synth = civ.synth || {}; civ.synth[res] = (civ.synth[res] || 0) + sup; civ.synthN = (civ.synthN || 0) + 1; civ._lux = null; civ.flags['ev:synthesis'] = g.turn;
    G.notify(g, civ, { kind: 'project', text: '🧪 ' + _('Synthesis') + ': ' + R.icon + ' ' + R.name + ' ' + _('supply') + ' +' + sup + ' (' + cost + ' 📚)', panel: 'empire' });
    if (AU.MasteryWeb && AU.MasteryWeb.evaluate) AU.MasteryWeb.evaluate(g, civ);
    return true;
  };
  // Which unit types the empire could build if only it had this resource.
  SY.wantedBy = function (g, civ, res) { var out = []; for (var id in AU.UNITS) { var u = AU.UNITS[id]; if (u.resource !== res || u.v2 || u.great || u.religious) continue; if (G.gateOk(g, civ, 'unit', id, u)) out.push(id); } for (var b in AU.BUILDINGS) { var d = AU.BUILDINGS[b]; if (d.resource === res && G.gateOk(g, civ, 'building', b, d)) out.push(b); } return out; };
  // The AI synthesises the resource it lacks whose consumers it may already build, keeping a small Knowledge reserve for studies.
  SY.aiTurn = function (g, civ) {
    if (civ.isPlayer || !SY.canRun(g, civ)) return;
    var cost = SY.cost(g, civ); if ((civ.v2.study || 0) < cost + 120) return;
    var best = null, bv = 0;
    SY.options(g, civ).forEach(function (o) { if (o.supply > o.use) return; var v = SY.wantedBy(g, civ, o.id).length * 2 + (o.supply === 0 ? 1 : 0) + (o.use >= o.supply && o.use > 0 ? 1 : 0); if (v > bv) { bv = v; best = o; } });
    if (best) SY.run(g, civ, best.id);
  };
})(globalThis.AU = globalThis.AU || {});
