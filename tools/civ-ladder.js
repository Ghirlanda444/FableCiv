// Civ ladder: AI-only games with random civs, ranked by score at the end, to spot abilities that win or lose too often.
// Usage: node tools/civ-ladder.js <games> <turns> <v2:0|1> [seed0]   → prints one JSON line per game (append to a log, then summarize with --summary <log>)
require('../tests/load.js'); const G = AU.G;
if (process.argv[2] === '--summary') {
  const fs = require('fs'), rows = fs.readFileSync(process.argv[3], 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
  const acc = {}; rows.forEach(r => r.civs.forEach(c => { const k = c.civ + '/' + c.leader; acc[k] = acc[k] || { n: 0, rank: 0, top: 0, dead: 0, score: 0 }; acc[k].n++; acc[k].rank += c.rank; if (c.rank === 1) acc[k].top++; if (!c.alive) acc[k].dead++; acc[k].score += c.score; }));
  const out = Object.keys(acc).map(k => ({ k, n: acc[k].n, rank: acc[k].rank / acc[k].n, top: acc[k].top / acc[k].n, dead: acc[k].dead / acc[k].n, score: acc[k].score / acc[k].n })).sort((a, b) => a.rank - b.rank);
  console.log('games', rows.length, 'rules', rows[0] && rows[0].v2 ? 'Divergence' : 'classic'); out.forEach(o => console.log(o.k.padEnd(28), 'games', o.n, 'avg rank', o.rank.toFixed(2), 'wins', Math.round(o.top * 100) + '%', 'eliminated', Math.round(o.dead * 100) + '%', 'score', Math.round(o.score))); return;
}
const games = +process.argv[2] || 4, turns = +process.argv[3] || 250, v2 = process.argv[4] === '1', seed0 = +(process.argv[5] || 100);
for (let k = 0; k < games; k++) {
  const seed = seed0 + k; const civIds = Object.keys(AU.CIV_BY_ID); const rng = (i) => { let x = (seed * 9301 + i * 49297 + 233) % 233280; return x / 233280; };
  const pick = civIds.slice().sort((a, b) => rng(civIds.indexOf(a)) - rng(civIds.indexOf(b)))[0];
  const leaders = AU.CIV_BY_ID[pick].leaders || []; const leader = leaders[Math.floor(rng(99) * leaders.length)] || leaders[0];
  const g = G.newGame({ playerCiv: pick, playerLeader: leader ? leader.id : undefined, mapSize: 'small', mapType: 'continents', numCivs: 5, numStates: 3, seed, difficulty: 'prince', v2 });
  const pl = G.player(g); pl.isPlayer = false; pl.ai = Object.assign({}, AU.LEADER_BY_ID[pl.leaderId].ai);
  for (let t = 0; t < turns; t++) G.endTurn(g);
  const majors = g.civs.filter(c => !c.minor).map(c => ({ civ: c.civId, leader: c.leaderId, alive: !!c.alive, score: c.alive ? G.score(g, c) : 0, sets: G.civSettlements(g, c.idx).length })).sort((a, b) => b.score - a.score);
  majors.forEach((c, i) => { c.rank = i + 1; });
  console.log(JSON.stringify({ seed, v2, turns, civs: majors }));
}
