// Tutorial scenario: a small fixed map and a guided list of steps shown in a bar under the top bar.
// Each step checks the game state itself, so the player learns by doing; a few steps are read-and-continue.
(function (AU) {
  var G = AU.G, U = AU.U;
  var T = AU.Tutorial = {};
  T.OPTIONS = { playerCiv: 'rome', playerLeader: 'trajan', mapSize: 'tiny', mapType: 'pangaea', speed: 'quick', difficulty: 'settler', numCivs: 3, numStates: 2, seed: 777 };
  function cap(g, p) { return p.capital && g.settlements[p.capital]; }
  T.STEPS = [
    { id: 'found', title: _('Found your capital'), text: _('Welcome, Trajan! Your 🧭 Pioneers stand on a good spot. Tap them, then tap') + ' <b>' + _('Found Capital') + '</b>. (' + _('Rivers, hills and coast are all good places.)'), done: function (g, p) { return !!cap(g, p); } },
    { id: 'research', title: _('Pick a technology'), text: _('Knowledge 🔬 flows into research every turn. Tap the 🔬 box at the top and choose a technology. Ceramics or Herding are fine first picks.'), done: function (g, p) { return !!p.currentTech; } },
    { id: 'civic', title: _('Pick a civic'), text: _('Heritage 🎭 fills civics the same way. Tap the 🎭 box at the top and choose') + ' <b>' + _('First Laws') + '</b>: it unlocks your first policy cards.', done: function (g, p) { return !!p.currentCivic; } },
    { id: 'move', title: _('Move a unit'), text: _('Tap your 🪓 Militia, then tap a white tile to move it. Tiles cost movement points: hills and forests cost more (the tile card shows 🥾). Your 🧭 Pathfinder can') + ' <b>' + _('Auto-explore') + '</b>.', done: function (g, p) { return G.civUnits(g, p.idx).some(function (u) { return u.movedTurn !== undefined && u.movedTurn !== null; }); } },
    { id: 'endturn', title: _('End the turn'), text: _('The big button at the bottom right ends the turn (or shows what still needs a decision). Press it until it says') + ' <b>End Turn</b>, ' + _('then press it.'), done: function (g, p) { return g.turn >= 2; } },
    { id: 'produce', title: _('Build something'), text: _('Your capital is a City with a production queue. Tap the capital, then') + ' <b>' + _('Manage') + '</b>, ' + _('and queue a 🧭 Pioneers (a second settlement) or a Militia.'), done: function (g, p) { var s = cap(g, p); return !!(s && s.queue.length); } },
    { id: 'grow', title: _('Pick a tile when you grow'), text: _('When a settlement grows, you choose the tile the new citizen works. The citizen also improves it (farm, mine, pasture…). Keep ending turns until your capital grows, then pick a tile with good yields.'), done: function (g, p) { var s = cap(g, p); return !!(s && s.pop >= 2 && !(s.pendingGrowth > 0)); } },
    { id: 'spark', title: _('Sparks'), text: _('Every technology and civic has a') + ' <b>' + _('Spark') + '</b> 💡: ' + _('a small in-game deed (work a pasture, meet an empire…). Do it before finishing the research and you also earn its') + ' <b>' + _('Mastery') + '</b> ⭐, ' + _('a permanent bonus. Open the 🔬 panel to see the Spark of each technology.'), manual: true },
    { id: 'town', title: _('Found a Town'), text: _('New settlements are') + ' <b>' + _('Towns') + '</b>: ' + _('no queue, their production becomes gold, and you buy things in them. Move your Pioneers a few tiles away (not too close to the capital) and found a Town.'), done: function (g, p) { return G.civSettlements(g, p.idx).length >= 2; } },
    { id: 'policy', title: _('Slot a policy card'), text: _('Once') + ' <b>' + _('First Laws') + '</b> ' + _('is done you have policy cards and one wildcard slot. Open') + ' ☰ → <b>' + _('Government') + ' &amp; policies</b> and slot a card (or tap "' + _('Fill the empty slots for me') + '").', done: function (g, p) { return (p.policies || []).length > 0; } },
    { id: 'others', title: _('Free cities and Inchibils'), text: _('Two kinds of neighbours') + ': <b>' + _('Free cities') + '</b> (' + _('a leader you can build Ties with, through caravans, garrisons and gifts) and the') + ' <b>' + _('Inchibils') + '</b>, ' + _('wild raiders from 🏕️ camps. Disperse a camp with a military unit for Gold.'), manual: true },
    { id: 'towns2', title: _('Towns grow up'), text: _('At pop 5 a Town can') + ' <b>specialize</b> (' + _("Farming, Mining, Trade, Fort, Urban Center, or your empire's own: Rome has none, Japan has the Castle Town). Pay gold to upgrade a Town into a City when you want a second production hub."), manual: true },
    { id: 'victory', title: _('Five ways to win'), text: _('Conquest ⚔️, Star Voyage 🚀, Renown 🎭, Devotion 🕊️ and Legacy 🏆 (highest score at the turn limit). Tap the 🏆 button at the top to see the Rankings and who leads each race. Trajan leans towards Conquest.'), manual: true },
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
    bar.querySelector('.tut-text').innerHTML = st.text;
    document.getElementById('tut-next').hidden = !st.manual;
  };
  T.next = function (app) { var g = app.g; if (!g || !g.tutorial) return; g.tutorial.step++; if (g.tutorial.step >= T.STEPS.length) { delete g.tutorial; app.toast(_('Tutorial finished. The world is yours!'), 2500); } T.update(app); };
  T.skip = function (app) { var g = app.g; if (g) delete g.tutorial; T.update(app); app.toast(_('Tutorial skipped. It is always available from the title screen.'), 2500); };
})(globalThis.AU = globalThis.AU || {});
