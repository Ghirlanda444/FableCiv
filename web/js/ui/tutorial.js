// Tutorial scenario: a small fixed map and a guided list of steps shown in a bar under the top bar.
// Each step checks the game state itself, so the player learns by doing; a few steps are read-and-continue.
(function (AU) {
  var G = AU.G, U = AU.U;
  var T = AU.Tutorial = {};
  T.OPTIONS = { playerCiv: 'rome', playerLeader: 'trajan', mapSize: 'tiny', mapType: 'pangaea', speed: 'quick', difficulty: 'settler', numCivs: 3, numStates: 2, seed: 777 };
  function cap(g, p) { return p.capital && g.settlements[p.capital]; }
  T.STEPS = [
    { id: 'found', title: 'Found your capital', text: 'Welcome, Trajan! Your 🧭 Pioneers stand on a good spot. Tap them, then tap <b>Found Capital</b>. (Rivers, hills and coast are all good places.)', done: function (g, p) { return !!cap(g, p); } },
    { id: 'research', title: 'Pick a technology', text: 'Knowledge 🔬 flows into research every turn. Tap the 🔬 box at the top and choose a technology. Ceramics or Herding are fine first picks.', done: function (g, p) { return !!p.currentTech; } },
    { id: 'civic', title: 'Pick a civic', text: 'Heritage 🎭 fills civics the same way. Tap the 🎭 box at the top and choose <b>First Laws</b>: it unlocks your first policy cards.', done: function (g, p) { return !!p.currentCivic; } },
    { id: 'move', title: 'Move a unit', text: 'Tap your 🪓 Militia, then tap a white tile to move it. Tiles cost movement points: hills and forests cost more (the tile card shows 🥾). Your 🧭 Pathfinder can <b>Auto-explore</b>.', done: function (g, p) { return G.civUnits(g, p.idx).some(function (u) { return u.movedTurn !== undefined && u.movedTurn !== null; }); } },
    { id: 'endturn', title: 'End the turn', text: 'The big button at the bottom right ends the turn (or shows what still needs a decision). Press it until it says <b>End Turn</b>, then press it.', done: function (g, p) { return g.turn >= 2; } },
    { id: 'produce', title: 'Build something', text: 'Your capital is a City with a production queue. Tap the capital, then <b>Manage</b>, and queue a 🧭 Pioneers (a second settlement) or a Militia.', done: function (g, p) { var s = cap(g, p); return !!(s && s.queue.length); } },
    { id: 'grow', title: 'Pick a tile when you grow', text: 'When a settlement grows, you choose the tile the new citizen works. The citizen also improves it (farm, mine, pasture…). Keep ending turns until your capital grows, then pick a tile with good yields.', done: function (g, p) { var s = cap(g, p); return !!(s && s.pop >= 2 && !(s.pendingGrowth > 0)); } },
    { id: 'spark', title: 'Sparks', text: 'Every technology and civic has a <b>Spark</b> 💡: a small in-game deed (work a pasture, meet an empire…). Do it before finishing the research and you also earn its <b>Mastery</b> ⭐, a permanent bonus. Open the 🔬 panel to see the Spark of each technology.', manual: true },
    { id: 'town', title: 'Found a Town', text: 'New settlements are <b>Towns</b>: no queue, their production becomes gold, and you buy things in them. Move your Pioneers a few tiles away (not too close to the capital) and found a Town.', done: function (g, p) { return G.civSettlements(g, p.idx).length >= 2; } },
    { id: 'policy', title: 'Slot a policy card', text: 'Once <b>First Laws</b> is done you have policy cards and one wildcard slot. Open ☰ → <b>Government &amp; policies</b> and slot a card (or tap "Fill the empty slots for me").', done: function (g, p) { return (p.policies || []).length > 0; } },
    { id: 'others', title: 'Free cities and Inchibils', text: 'Two kinds of neighbours: <b>Free cities</b> (a leader you can build Ties with, through caravans, garrisons and gifts) and the <b>Inchibils</b>, wild raiders from 🏕️ camps. Disperse a camp with a military unit for Gold.', manual: true },
    { id: 'towns2', title: 'Towns grow up', text: 'At pop 5 a Town can <b>specialize</b> (Farming, Mining, Trade, Fort, Urban Center, or your empire\'s own: Rome has none, Japan has the Castle Town). Pay gold to upgrade a Town into a City when you want a second production hub.', manual: true },
    { id: 'victory', title: 'Five ways to win', text: 'Conquest ⚔️, Star Voyage 🚀, Renown 🎭, Devotion 🕊️ and Legacy 🏆 (highest score at the turn limit). Tap the 🏆 button at the top to see the Rankings and who leads each race. Trajan leans towards Conquest.', manual: true },
    { id: 'end', title: 'You know the basics', text: 'That is everything a first game needs. Keep playing this world, or start a real game from ☰ → New game. Have fun!', manual: true }
  ];
  T.start = function (app) {
    var g = G.newGame(Object.assign({}, T.OPTIONS));
    g.tutorial = { step: 0 };
    app.startGameState(g);
    app.toast('Tutorial started. Follow the steps in the bar at the top.', 3000);
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
    bar.querySelector('.tut-step').textContent = '🎓 Tutorial ' + (g.tutorial.step + 1) + '/' + T.STEPS.length + ' · ' + st.title;
    bar.querySelector('.tut-text').innerHTML = st.text;
    document.getElementById('tut-next').hidden = !st.manual;
  };
  T.next = function (app) { var g = app.g; if (!g || !g.tutorial) return; g.tutorial.step++; if (g.tutorial.step >= T.STEPS.length) { delete g.tutorial; app.toast('Tutorial finished. The world is yours!', 2500); } T.update(app); };
  T.skip = function (app) { var g = app.g; if (g) delete g.tutorial; T.update(app); app.toast('Tutorial skipped. It is always available from the title screen.', 2500); };
})(globalThis.AU = globalThis.AU || {});
