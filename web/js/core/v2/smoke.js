// Smoke (Divergence rules): pollution per settlement. Industry and crowds make it, forests and civic works soak it up.
// Net Smoke costs Happiness (-1 per 3, at most -4); heavy Smoke (6+) costs farms and pastures 1 Food and halves the settlement's Fame.
(function (AU) {
  var G = AU.G, SM = AU.Smoke = {};
  SM.on = function (g) { return !!(g && g.v2); };
  SM.SOURCES = { workshop: 1, factory: 3, power_plant: 4, ironworks: 2, railway_station: 1, nuclear_plant: 1, stock_exchange: 0.5, airport: 1, data_center: 1 };
  SM.SINKS = { aqueduct: 1, sewer: 2, hospital: 1, national_park: 3 };
  SM.POP_ERA = 4; // from the Puffstack Age on, crowds smoke too
  SM.HEAVY = 6;
  // Where a settlement's Smoke comes from and goes.
  SM.detail = function (g, s) {
    var civ = g.civs[s.civ], fx = G.civFx(g, civ), src = [], sink = [], sources = 0, sinks = 0;
    s.buildings.forEach(function (b) { if (SM.SOURCES[b]) { sources += SM.SOURCES[b]; src.push([b, SM.SOURCES[b]]); } if (SM.SINKS[b]) { sinks += SM.SINKS[b]; sink.push([b, SM.SINKS[b]]); } });
    var mines = 0, woods = 0;
    s.tiles.forEach(function (i) { var t = g.tiles[i]; if (i === s.tile) return; if (t.worked) { var imp = G.improvementFor(g, t, civ); if (imp === 'mine' || imp === 'quarry') mines++; } if (t.feature === 'forest' || t.feature === 'jungle') woods++; });
    if (mines) { sources += mines * 0.5; src.push(['mines', mines * 0.5]); }
    var era = civ.era || 0; if (era >= SM.POP_ERA && s.pop >= 6) { var crowd = Math.floor(s.pop / 6); sources += crowd; src.push(['crowds', crowd]); }
    if (woods) { var w = woods * 0.5 * (fx.forestSinkMult || 1); sinks += w; sink.push(['woods', w]); }
    if (fx.smokeSink) { sinks += fx.smokeSink; sink.push(['sparks', fx.smokeSink]); }
    if (G.hasRiver(g, s)) { sinks += 1; sink.push(['river', 1]); }
    var net = Math.max(0, Math.round((sources - sinks) * 10) / 10);
    return { sources: Math.round(sources * 10) / 10, sinks: Math.round(sinks * 10) / 10, net: net, src: src, sink: sink };
  };
  SM.smoke = function (g, s) {
    if (!SM.on(g)) return 0;
    if (s._smoke && s._smokeTurn === g.turn && s._smokeGen === (g.fxGen || 0) && s._smokeB === s.buildings.length) return s._smoke;
    s._smoke = SM.detail(g, s).net; s._smokeTurn = g.turn; s._smokeGen = g.fxGen || 0; s._smokeB = s.buildings.length; return s._smoke;
  };
  SM.happiness = function (net) { return -Math.min(4, Math.floor(net / 3)); };
  SM.heavy = function (net) { return net >= SM.HEAVY; };
  // Worked farms and pastures: what heavy Smoke costs Food on.
  SM.farmTiles = function (g, s) { var civ = g.civs[s.civ], n = 0; s.tiles.forEach(function (i) { var t = g.tiles[i]; if (i === s.tile || !t.worked) return; var imp = G.improvementFor(g, t, civ); if (imp === 'farm' || imp === 'pasture') n++; }); return n; };
  SM.total = function (g, civ) { var n = 0; G.civSettlements(g, civ.idx).forEach(function (s) { n += SM.smoke(g, s); }); return Math.round(n * 10) / 10; };
  SM.world = function (g) { var n = 0; for (var id in g.settlements) n += SM.smoke(g, g.settlements[id]); return Math.round(n * 10) / 10; };
  SM.NAMES = { mines: 'worked mines and quarries', crowds: 'crowds', woods: 'woods you own', sparks: 'Sparks', river: 'the river' };
  SM.describe = function (g, s) {
    var d = SM.detail(g, s), nm = function (k) { return AU.BUILDINGS[k] ? AU.BUILDINGS[k].name : AU.NATIONAL[k] ? AU.NATIONAL[k].name : _(SM.NAMES[k] || k); };
    return { net: d.net, from: d.src.map(function (x) { return nm(x[0]) + ' +' + x[1]; }).join(', '), soaked: d.sink.map(function (x) { return nm(x[0]) + ' -' + x[1]; }).join(', '), happiness: SM.happiness(d.net), heavy: SM.heavy(d.net) };
  };
})(globalThis.AU = globalThis.AU || {});
