// Civ ladder: AI-only games with random civs, ranked by score at the end, to spot abilities that win or lose too often.
// Usage: node tools/civ-ladder.js <games> <turns> <v2:0|1> [seed0]   → prints one JSON line per game (append to a log, then summarize with --summary <log>)
require('../tests/load.js'); const G = AU.G;
if (process.argv[2] === '--summary') {
  const fs = require('fs'), rows = fs.readFileSync(process.argv[3], 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
  // civ-level and civ/leader-level tables; a seat's rank is normalised to 0 (first) .. 1 (last) so games with different civ counts compare
  function table(keyOf, minN) { const acc = {}; rows.forEach(r => { const n = r.civs.length; r.civs.forEach(c => { const k = keyOf(c); acc[k] = acc[k] || { n: 0, rank: 0, top: 0, dead: 0, score: 0 }; acc[k].n++; acc[k].rank += n > 1 ? (c.rank - 1) / (n - 1) : 0; if (c.rank === 1) acc[k].top++; if (!c.alive) acc[k].dead++; acc[k].score += c.score; }); });
    return Object.keys(acc).map(k => ({ k, n: acc[k].n, rank: acc[k].rank / acc[k].n, top: acc[k].top / acc[k].n, dead: acc[k].dead / acc[k].n, score: acc[k].score / acc[k].n })).filter(o => o.n >= (minN || 1)).sort((a, b) => a.rank - b.rank); }
  const md = process.argv.indexOf('--md') >= 0, minN = +(process.argv[process.argv.indexOf('--min') + 1] || 0) || 1;
  function print(title, out) { if (md) { console.log('\n### ' + title + '\n\n| civ | games | avg place (0 first, 1 last) | wins | eliminated | score |\n|---|---|---|---|---|---|'); out.forEach(o => console.log('| ' + o.k + ' | ' + o.n + ' | ' + o.rank.toFixed(2) + ' | ' + Math.round(o.top * 100) + '% | ' + Math.round(o.dead * 100) + '% | ' + Math.round(o.score) + ' |')); }
    else { console.log('\n== ' + title); out.forEach(o => console.log(o.k.padEnd(28), 'games', String(o.n).padStart(3), 'place', o.rank.toFixed(2), 'wins', (Math.round(o.top * 100) + '%').padStart(4), 'eliminated', (Math.round(o.dead * 100) + '%').padStart(4), 'score', Math.round(o.score))); } }
  console.log((md ? '## ' : '') + 'Civ ladder: ' + rows.length + ' games, ' + (rows[0] && rows[0].v2 ? 'Divergence' : 'classic') + ' rules, ' + (rows[0] ? rows[0].turns : '?') + ' turns');
  print('By civilization (' + minN + '+ games)', table(c => c.civ, minN)); print('By leader (' + minN + '+ games)', table(c => c.civ + '/' + c.leader, minN)); return;
}
const games = +process.argv[2] || 4, turns = +process.argv[3] || 250, v2 = process.argv[4] === '1', seed0 = +(process.argv[5] || 100);
for (let k = 0; k < games; k++) {
  // Every leader gets a seat in turn (round robin over all leaders, offset by the seed), so no leader is under-sampled.
  const seed = seed0 + k; const all = []; Object.keys(AU.CIV_BY_ID).forEach(c => (AU.CIV_BY_ID[c].leaders || []).forEach(l => all.push([c, l])));
  const [pick, leader] = all[(seed * 7 + k) % all.length];
  const g = G.newGame({ playerCiv: pick, playerLeader: leader ? leader.id : undefined, mapSize: 'small', mapType: 'continents', numCivs: 5, numStates: 3, seed, difficulty: 'prince', v2 });
  const pl = G.player(g); pl.isPlayer = false; pl.ai = Object.assign({}, AU.LEADER_BY_ID[pl.leaderId].ai);
  for (let t = 0; t < turns; t++) G.endTurn(g);
  const majors = g.civs.filter(c => !c.minor).map(c => ({ civ: c.civId, leader: c.leaderId, alive: !!c.alive, score: c.alive ? G.score(g, c) : 0, sets: G.civSettlements(g, c.idx).length })).sort((a, b) => b.score - a.score);
  majors.forEach((c, i) => { c.rank = i + 1; });
  console.log(JSON.stringify({ seed, v2, turns, civs: majors }));
}
