// Victory rules: the Colony Ship's voyage, Conquest by holding most capitals, Renown, the world-faith route to Devotion and the
// conquerors' campaigns.
const AU = require('./load.js'); const G = AU.G, R = AU.Religion, AI = AU.AI;
let fails = 0; function ok(c, m) { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok', m); }
function world(seed) {
  const g = G.newGame({ playerCiv: 'mongolia', playerLeader: 'genghis', mapSize: 'standard', mapType: 'continents', numCivs: 6, numStates: 0, seed: seed || 17, difficulty: 'prince', v2: true });
  g.civs.forEach(c => { if (c.minor || c.capital != null) return; const u = G.civUnits(g, c.idx).find(u => u.type === 'settler'); if (u) AU.U.foundCity(g, u); });
  return g;
}
const majors = g => g.civs.filter(c => !c.minor);
function give(g, s, civ) { s.civ = civ.idx; }

// ---------- Star Voyage ----------
{ const g = world(17), [a, b] = majors(g), cap = g.settlements[a.capital];
  a.projects = { launch_satellite: 1, moon_landing: 2, colony_ship: g.turn };
  G.launchVoyage(g, a, cap);
  ok(a.voyage && G.voyageTurnsLeft(g, a) === G.voyageTurns(g), 'a launched Colony Ship lands in ' + G.voyageTurns(g) + ' turns');
  G.checkVictory(g); ok(!g.victory, 'the launch itself wins nothing');
  for (let k = 0; k < G.voyageTurns(g) - 1; k++) { g.turn++; G.checkVictory(g); }
  ok(!g.victory, 'still in flight one turn before landing');
  g.turn++; G.checkVictory(g); ok(g.victory && g.victory.type === 'science' && g.victory.civ === a.idx, 'the ship lands: Star Voyage victory on turn ' + (g.victory && g.victory.turn));
}
{ const g = world(17), [a, b] = majors(g), cap = g.settlements[a.capital];
  a.projects = { launch_satellite: 1, moon_landing: 2, colony_ship: g.turn }; G.launchVoyage(g, a, cap);
  g.turn += 5; give(g, cap, b); G.checkVictory(g);
  ok(!g.victory && !a.voyage && !a.projects.colony_ship && a.projects.moon_landing, 'the launch city falls: the ship is lost and must be built again');
  give(g, cap, a); g.turn += 20; G.checkVictory(g); ok(!g.victory, 'retaking the city does not bring the ship back');
}

// ---------- Conquest ----------
{ const g = world(19), M = majors(g), a = M[0], need = G.conquestNeed(g);
  ok(need === 5, '6 empires: Conquest needs 5 original capitals (own included), got ' + need);
  M.slice(1, need).forEach(o => give(g, g.settlements[o.originalCapital], a));
  ok(G.capitalsHeld(g, a) === need, 'holding ' + need + ' capitals');
  G.checkVictory(g); ok(!g.victory && a.conquestHold === g.turn, 'the countdown starts');
  for (let k = 1; k < G.conquestTurns(g) - 1; k++) { g.turn++; G.checkVictory(g); }
  ok(!g.victory && G.conquestProgress(g, a).turns === G.conquestTurns(g) - 1, 'held ' + G.conquestProgress(g, a).turns + ' of ' + G.conquestTurns(g) + ' turns');
  const lost = g.settlements[M[1].originalCapital]; give(g, lost, M[1]); g.turn++; G.checkVictory(g);
  ok(!g.victory && !a.conquestHold, 'one capital retaken: the countdown resets');
  give(g, lost, a); for (let k = 0; k < G.conquestTurns(g); k++) { g.turn++; G.checkVictory(g); }
  ok(g.victory && g.victory.type === 'domination' && g.victory.civ === a.idx, 'held again for ' + G.conquestTurns(g) + ' turns: Conquest victory');
}
{ const g = world(19), M = majors(g), a = M[0];
  M.slice(1).forEach(o => give(g, g.settlements[o.originalCapital], a)); G.checkVictory(g);
  ok(g.victory && g.victory.type === 'domination', 'every original capital: Conquest at once');
}

// ---------- scaling ----------
{ const need = n => G.conquestNeed({ civs: Array.from({ length: n }, () => ({ minor: false })) });
  ok(need(4) === 3 && need(6) === 5 && need(10) === 8 && need(12) === 9, 'Conquest needs 75% of the capitals: 4 empires ' + need(4) + ', 6 ' + need(6) + ', 10 ' + need(10) + ', 12 ' + need(12));
  ok(G.voyageTurns({ speed: 'quick' }) === G.voyageTurns({ speed: 'standard' }) && G.voyageTurns({ speed: 'epic' }) > 15 && G.conquestTurns({ speed: 'epic' }) > 10, 'the voyage and the Conquest countdown follow the game speed');
}

// ---------- Renown ----------
{ const g = world(23), M = majors(g), a = M[0], b = M[1];
  M.forEach(c => { c.cultureTotal = 20000; c.tourismTotal = 0; });
  a.tourismTotal = 150 * (G.domesticTourists(g, b) + 1); a.era = 4;
  ok(!G.cultureProgress(g, a).ready, 'no Renown before the Glowbit Age');
  a.era = 5; ok(G.cultureProgress(g, a).ready, 'Renown: ' + G.cultureProgress(g, a).visitors + ' visitors beat ' + (G.cultureProgress(g, a).need - 1) + ' domestic tourists (1 per ' + G.DOMESTIC_PER + ' Culture)');
}

// ---------- Devotion: the world-faith route ----------
{ const g = world(29), M = majors(g), a = M[0];
  g.religions = { f1: { id: 'f1', name: 'Test', icon: '🕊️', founder: a.idx, holyCity: a.capital, tenets: {} } }; a.founded = 'f1';
  const all = Object.values(g.settlements).filter(s => !g.civs[s.civ].minor);
  const set = n => all.forEach((s, i) => { s.religion = i < n ? 'f1' : null; });
  set(Math.ceil(all.length * 0.6)); ok(!R.victoryState(g, 'f1').ok, '60% of the world without the state faiths is not enough');
  set(all.length); M.forEach(c => { if (c !== a) c.religion = null; });
  ok(R.victoryState(g, 'f1').ok, 'the whole world follows the faith: Devotion, whatever the rulers declare');
}

// ---------- campaigns ----------
{ const g = world(31), M = majors(g), a = M[0], b = M[1];
  g.civs.forEach(c => { c.met = c.met || {}; g.civs.forEach(o => { c.met[o.idx] = true; }); });
  a.v2 = a.v2 || {}; AU.MasteryWeb.state(a).era = 3; a.era = 3;
  ok(AI.conqueror(g, a), 'Genghis Khan is a conqueror');
  const cap = g.settlements[a.capital]; for (let k = 0; k < 12; k++) G.spawnUnit(g, a.idx, 'swordsman', cap.tile);
  b.voyage = { launched: g.turn, arrives: g.turn + 15, from: b.capital };
  let n = 0; while (!a.rel[b.idx].war && n++ < 40) AI.campaign(g, a);
  ok(a.rel[b.idx].war && a.rel[b.idx].campaign, 'a Colony Ship in flight draws the conqueror\'s campaign');
  ok(AI.warTarget(g, a) === g.settlements[b.originalCapital], 'the campaign marches on the original capital');
  g.turn += 10; ok(!G.aiAcceptsPeace(g, a, b.idx), 'no peace while the campaign goes well');
  give(g, g.settlements[b.originalCapital], a); ok(AI.campaignGoal(g, a, b.idx) === null && !a.rel[b.idx].campaign, 'the capital taken: the campaign is over');
}
console.log(fails ? fails + ' FAILED' : 'victory OK'); process.exit(fails ? 1 : 0);
