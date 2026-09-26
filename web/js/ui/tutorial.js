// Tutorial scenario: a small fixed map and a guided list of steps shown in a bar under the top bar.
// Each step checks the game state itself, so the player learns by doing; a few steps are read-and-continue.
(function (AU) {
  var G = AU.G, U = AU.U;
  var T = AU.Tutorial = {};
  T.OPTIONS = { playerCiv: 'rome', playerLeader: 'trajan', mapSize: 'tiny', mapType: 'pangaea', speed: 'quick', difficulty: 'settler', numCivs: 3, numStates: 2, seed: 777, v2: true };
  function cap(g, p) { return p.capital && g.settlements[p.capital]; }
  function firstMil(g, p) { return G.civUnits(g, p.idx).filter(function (u) { return G.isMilitary(u); })[0]; }
  function settlerU(g, p) { return G.civUnits(g, p.idx).filter(function (u) { return u.type === 'settler'; })[0]; }
  function showCity(app, g, s) { if (!s) return; app.selectSettlement(s); app.renderer.centerOn(g, s.tile); app.openPanel('city', { id: s.id }); }
  function web(p) { return AU.MasteryWeb.state(p); }
  // A step's text may depend on the device (mouse or touch): text is a string or a function of the app.
  T.STEPS = [
    { id: 'found', title: _('Found your capital'), text: _('Welcome, Trajan! Your 🧭 Pioneers stand on a good spot. Tap them, then tap') + ' <b>' + _('Found Capital') + '</b>. (' + _('Rivers, hills and coast are all good places.)'), done: function (g, p) { return !!cap(g, p); }, go: function (app, g, p) { var u = settlerU(g, p); if (u) { app.closePanel(); app.selectUnit(u); app.renderer.centerOn(g, u.tile); } } },
    { id: 'web', title: _('No research: Sparks'), text: _('There is nothing to research. Every Spark 💡 lights up by itself when your empire does what its card says: work 3 Farms, meet an empire, hold a settlement for 10 turns. Tap 💡 at the top: the Mastery Web shows five lanes, one tile per Spark, and a bar for how close you are.'), manual: true, go: function (app) { app.openPanel('web', { tab: 'foundation' }); } },
    { id: 'move', title: _('Move a unit'), text: function (app) { return (app.isTouch && !app.isTouch() ? _('On a computer: left-click your 🪓 Militia, then right-click a white tile to move it (hold the right button to see the route). Left-click never moves a unit.') : _('Tap your 🪓 Militia, then tap a white tile to move it.')) + ' ' + _('Hills and forests cost more movement (the tile card shows 🥾). Your 🧭 Pathfinder can') + ' <b>' + _('Auto-explore') + '</b>.'; }, done: function (g, p) { return G.civUnits(g, p.idx).some(function (u) { return u.movedTurn !== undefined && u.movedTurn !== null; }); }, go: function (app, g, p) { var u = firstMil(g, p); if (u) { app.closePanel(); app.selectUnit(u); app.renderer.centerOn(g, u.tile); } } },
    { id: 'command', title: _('Command'), text: _('Every order to a unit costs Command 🎖️, which refills each turn. Units within 5 tiles of a settlement cost 1, farther ones 2 or 3; units on your own rivers always cost 1. Many units, far away, means some will wait a turn.'), manual: true },
    { id: 'endturn', title: _('End the turn'), text: _('The big button at the bottom right ends the turn (or shows what still needs a decision). Press it until it says') + ' <b>End Turn</b>, ' + _('then press it.'), done: function (g, p) { return g.turn >= 2; }, go: function (app) { app.closePanel(); app.toast(_('The big button at the bottom right: tap it.'), 2200); } },
    { id: 'produce', title: _('Queue Pioneers'), text: _('Your capital is a City with a production queue. Tap the capital, open its panel and press') + ' <b>' + _('Build') + '</b> ' + _('next to') + ' 🧭 <b>' + _('Pioneers') + '</b>. ' + _('They will found your second settlement.'), done: function (g, p) { var s = cap(g, p); return !!(s && (s.queue.some(function (q) { return q.id === 'settler'; }) || settlerU(g, p))); }, go: function (app, g, p) { showCity(app, g, cap(g, p)); } },
    { id: 'grow', title: _('Claim a tile when you grow'), text: _('A settlement starts with its centre and one tile. Each time it grows it claims one more: the first three are free, later ones cost Influence 🎯 and need a Boundary Marker. Claim Food 🌾 first, or the settlement stops growing.'), done: function (g, p) { var s = cap(g, p); return !!(s && s.pop >= 2 && !(s.pendingGrowth > 0)); }, go: function (app, g, p) { var s = cap(g, p); if (s && s.pendingGrowth > 0) { app.closePanel(); app.selectSettlement(s); app.renderer.centerOn(g, s.tile); app.startExpand(s); } else app.toast(_('Not grown yet: end a few more turns.'), 2200); } },
    { id: 'firstspark', title: _('Light a Spark'), text: _('Keep playing. A Spark lights the moment your empire does what its card says, and a card tells you what it gave you. On the Mastery Web, "Closest" names the Sparks you are about to light.'), done: function (g, p) { return web(p).log.some(function (l) { return l.id; }); }, go: function (app) { app.openPanel('web', { tab: 'foundation' }); } },
    { id: 'pioneers', title: _('Wait for the Pioneers'), text: _('The capital is training your Pioneers: the queue shows how many turns are left. Keep ending turns. When they appear next to the capital, this step completes by itself.'), done: function (g, p) { return !!settlerU(g, p) || G.civSettlements(g, p.idx).length >= 2; }, go: function (app, g, p) { showCity(app, g, cap(g, p)); } },
    { id: 'town', title: _('Found a Town'), text: _('New settlements are') + ' <b>' + _('Towns') + '</b>: ' + _('no queue, their production becomes gold, and you buy things in them. Move your Pioneers a few tiles away (at least 4 from the capital) and press') + ' <b>' + _('Found Town') + '</b>.', done: function (g, p) { return G.civSettlements(g, p.idx).length >= 2; }, go: function (app, g, p) { var u = settlerU(g, p); if (u) { app.closePanel(); app.selectUnit(u); app.renderer.centerOn(g, u.tile); } } },
    { id: 'study', title: _('Study a Spark'), text: _('Knowledge 📚 piles up every turn. A tile with a gold 📚 price can be bought now instead of waiting for its deed. Open 💡, tap a gold tile and press') + ' <b>' + _('Study') + '</b>.', done: function (g, p) { return web(p).log.some(function (l) { return l.how === 'study'; }); }, go: function (app) { app.openPanel('web', { tab: 'foundation' }); } },
    { id: 'insight', title: _('Insights'), text: _('When your empire does something for the first time (a first battle, a first rich merchant), you face a decision with two doors: 🔮 an Insight. The choice becomes a permanent trait. Once per age, Heritage 🎭 pays for a Reform to walk through the other door.'), manual: true, go: function (app, g, p) { if (web(p).pendingHubs.length) app.openPanel('hub'); else app.openPanel('web', { tab: 'traits' }); } },
    { id: 'lanes', title: _('Lanes and ages'), text: _('Light every Spark of one lane in its age and the lane is mastered 🏅: a permanent reward. 20 foundation Sparks open the next age; every Spark beyond that and every mastered lane make it come sooner.'), manual: true, go: function (app) { app.openPanel('web', { tab: 'foundation' }); } },
    { id: 'others', title: _('Free cities and Inchibils'), text: _('Two kinds of neighbours') + ': <b>' + _('Free cities') + '</b> (' + _('a leader you can build Ties with, through caravans, garrisons and gifts) and the') + ' <b>' + _('Inchibils') + '</b>, ' + _('wild raiders from 🏕️ camps. Disperse a camp with a military unit for Gold.'), manual: true, go: function (app) { app.openPanel('diplomacy'); } },
    { id: 'towns2', title: _('Towns grow up'), text: _('At pop 5 a Town can') + ' <b>specialize</b> (' + _("Farming, Mining, Trade, Fort, Urban Center, or your empire's own: Rome has none, Japan has the Castle Town). Pay gold to upgrade a Town into a City when you want a second production hub."), manual: true },
    { id: 'victory', title: _('Five ways to win'), text: _('Conquest ⚔️, Star Voyage 🚀, Renown 🎭, Devotion 🕊️ and Legacy 🏆 (highest score at the turn limit). Tap the 🏆 button at the top to see the Rankings and who leads each race. Trajan leans towards Conquest.'), manual: true, go: function (app) { app.openPanel('rankings'); } },
    { id: 'end', title: _('You know the basics'), text: _('That is everything a first game needs. Keep playing this world, or start a real game from ☰ → New game. Have fun!'), manual: true }
  ];
  T.start = function (app) {
    var g = G.newGame(Object.assign({}, T.OPTIONS));
    g.tutorial = { step: 0 };
    app.startGameState(g);
    app.toast(_('Tutorial started. Follow the steps in the bar at the top.'), 3000);
  };
  T.current = function (g) { return g && g.tutorial ? T.STEPS[g.tutorial.step] : null; };
  // Called after every UI refresh: advances finished steps, shows the current one.
  T.update = function (app) {
    var g = app.g, bar = document.getElementById('tutorial'); if (!bar) return;
    if (!g || !g.tutorial) { bar.hidden = true; return; }
    var p = G.player(g), st = T.STEPS[g.tutorial.step];
    while (st && !st.manual && st.done(g, p)) { g.tutorial.step++; app.toast('✓ ' + st.title, 1600); st = T.STEPS[g.tutorial.step]; }
    if (!st) { bar.hidden = true; return; }
    bar.hidden = false;
    bar.querySelector('.tut-step').textContent = '🎓 ' + _('Tutorial') + ' ' + (g.tutorial.step + 1) + '/' + T.STEPS.length + ' · ' + st.title;
    bar.querySelector('.tut-text').innerHTML = typeof st.text === 'function' ? st.text(app) : st.text;
    document.getElementById('tut-next').hidden = !st.manual;
    document.getElementById('tut-go').hidden = !st.go;
  };
  T.go = function (app) { var g = app.g, st = T.current(g); if (st && st.go) st.go(app, g, G.player(g)); };
  T.next = function (app) { var g = app.g; if (!g || !g.tutorial) return; g.tutorial.step++; if (g.tutorial.step >= T.STEPS.length) { delete g.tutorial; app.toast(_('Tutorial finished. The world is yours!'), 2500); } T.update(app); };
  T.skip = function (app) { var g = app.g; if (g) delete g.tutorial; T.update(app); app.toast(_('Tutorial skipped. It is always available from the title screen.'), 2500); };
})(globalThis.AU = globalThis.AU || {});
