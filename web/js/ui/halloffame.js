// Hall of Fame: every finished game (won or lost) is recorded on this device with its score.
(function (AU) {
  var G = AU.G, KEY = 'te_hall_of_fame';
  var H = AU.Hall = {};
  function store() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } }
  H.list = function () { return store().sort(function (a, b) { return b.score - a.score || a.turn - b.turn; }); };
  H.clear = function () { try { localStorage.removeItem(KEY); } catch (e) {} };
  // Builds the record of a finished game for the player (called once, when the game ends).
  H.entryFor = function (g) {
    var p = G.player(g), d = G.civData(p), v = g.victory, won = !!(v && g.civs[v.civ] && g.civs[v.civ].isPlayer);
    var wonders = 0; for (var w in g.wonders) if (g.settlements[g.wonders[w]] && g.settlements[g.wonders[w]].civ === p.idx) wonders++;
    var greats = 0; if (p.great && p.great.count) for (var k in p.great.count) greats += p.great.count[k];
    return { date: new Date().toISOString(), civ: d.name, civId: p.civId, leader: G.leaderName(p), leaderId: p.leaderId, won: won, alive: !!p.alive,
      type: !p.alive ? 'defeat' : v ? v.type : 'defeat', winner: v && !won ? G.civData(g.civs[v.civ]).name : null,
      turn: g.turn, score: G.score(g, p), difficulty: g.difficulty, size: g.W + 'x' + g.H, speed: g.speed, mapType: g.mapType,
      settlements: G.civSettlements(g, p.idx).length, techs: Object.keys(p.techs).length, civics: Object.keys(p.civics).length, wonders: wonders, greats: greats, empires: g.civs.filter(function (c) { return !c.minor; }).length };
  };
  H.record = function (g) {
    if (g.hallRecorded) return null;
    var e = H.entryFor(g); g.hallRecorded = e.date;
    try { var list = store(); list.push(e); localStorage.setItem(KEY, JSON.stringify(list.slice(-200))); } catch (err) {}
    return e;
  };
  H.medal = function (i) { return i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1) + '.'; };
  H.typeLabel = function (t) { return t === 'defeat' ? { icon: '💀', name: 'Defeat' } : (AU.VICTORIES[t] || { icon: '🏁', name: t }); };
})(globalThis.AU = globalThis.AU || {});
