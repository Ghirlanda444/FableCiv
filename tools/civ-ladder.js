// Civ ladder: AI-only games with random civs, ranked by score at the end, to spot abilities that win or lose too often.
// Usage: node tools/civ-ladder.js <games> <turns> <v2:0|1> [seed0] [mapSize] [mapType] [speed] [civs] [cityStates]
//   → prints one JSON line per game (append to a log, then summarize with --summary <log>). Defaults: standard continents,
//   Standard speed, 6 empires and 3 city-states; on another map size the empires and city-states follow that size's defaults.
//   <turns> is for Standard speed and scales with the game speed.
require('../tests/load.js'); const G = AU.G;
if (process.argv[2] === '--summary') {
  const fs = require('fs'), rows = fs.readFileSync(process.argv[3], 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
  // civ-level and civ/leader-level tables; a seat's rank is normalised to 0 (first) .. 1 (last) so games with different civ counts compare
  // victories reached during the game (domination, science, culture, religion) by the civ that reached them; 'wins' stays the top score at the end
  const VT = { domination: 'dom', science: 'sci', culture: 'her', religion: 'rel', score: 'score' };
  function vicOf(r, c) { return r.victory && r.victory.civ === c.civ && r.victory.leader === c.leader ? (VT[r.victory.type] || r.victory.type) : null; }
  function table(keyOf, minN) { const acc = {}; rows.forEach(r => { const n = r.civs.length; r.civs.forEach(c => { const k = keyOf(c); acc[k] = acc[k] || { n: 0, rank: 0, top: 0, dead: 0, score: 0, vic: {} }; const v = vicOf(r, c); if (v) acc[k].vic[v] = (acc[k].vic[v] || 0) + 1; acc[k].n++; acc[k].rank += n > 1 ? (c.rank - 1) / (n - 1) : 0; if (c.rank === 1) acc[k].top++; if (!c.alive) acc[k].dead++; acc[k].score += c.score; }); });
    return Object.keys(acc).map(k => ({ k, n: acc[k].n, rank: acc[k].rank / acc[k].n, top: acc[k].top / acc[k].n, dead: acc[k].dead / acc[k].n, score: acc[k].score / acc[k].n, vic: Object.keys(acc[k].vic).map(t => t + ' ' + acc[k].vic[t]).join(', ') || '-' })).filter(o => o.n >= (minN || 1)).sort((a, b) => a.rank - b.rank); }
  const md = process.argv.indexOf('--md') >= 0, minN = +(process.argv[process.argv.indexOf('--min') + 1] || 0) || 1;
  function print(title, out) { if (md) { console.log('\n### ' + title + '\n\n| # | civ | games | avg place (0 first, 1 last) | wins | eliminated | score | victories reached |\n|---|---|---|---|---|---|---|---|'); out.forEach((o, i) => console.log('| ' + (i + 1) + ' | ' + o.k + ' | ' + o.n + ' | ' + o.rank.toFixed(2) + ' | ' + Math.round(o.top * 100) + '% | ' + Math.round(o.dead * 100) + '% | ' + Math.round(o.score) + ' | ' + o.vic + ' |')); }
    else { console.log('\n== ' + title); out.forEach((o, i) => console.log(String(i + 1).padStart(3), o.k.padEnd(28), 'games', String(o.n).padStart(3), 'place', o.rank.toFixed(2), 'wins', (Math.round(o.top * 100) + '%').padStart(4), 'eliminated', (Math.round(o.dead * 100) + '%').padStart(4), 'score', String(Math.round(o.score)).padStart(5), 'victories', o.vic)); } }
  const vt = {}, vturn = []; rows.forEach(r => { const t = r.victory ? r.victory.type : 'none (top score at the end)'; vt[t] = (vt[t] || 0) + 1; if (r.victory) vturn.push(r.victory.turn); }); vturn.sort((a, b) => a - b);
  const cfg = rows[0] && rows[0].map ? ', ' + rows[0].map.size + ' ' + rows[0].map.type + ' map, ' + rows[0].map.speed + ' speed, ' + rows[0].map.civs + ' empires' : '';
  console.log((md ? '## ' : '') + 'Civ ladder: ' + rows.length + ' games, ' + (rows[0] && rows[0].v2 ? 'Divergence' : 'classic') + ' rules' + cfg + ', ' + (rows[0] ? rows[0].turns : '?') + ' turns');
  console.log((md ? '\n' : '') + 'Games decided by: ' + Object.keys(vt).map(t => t + ' ' + vt[t]).join(', ') + (vturn.length ? ' · victory turn: earliest ' + vturn[0] + ', median ' + vturn[Math.floor(vturn.length / 2)] + ', latest ' + vturn[vturn.length - 1] : '') + '. "wins" = the victor, or the top score when nobody won.');
  if (vturn.length) { const pct = q => vturn[Math.min(vturn.length - 1, Math.floor(vturn.length * q))]; console.log((md ? '\n' : '') + 'Victory turn percentiles: p10 ' + pct(0.1) + ', p25 ' + pct(0.25) + ', p50 ' + pct(0.5) + ', p75 ' + pct(0.75) + ', p85 ' + pct(0.85) + ', p90 ' + pct(0.9) + ', p95 ' + pct(0.95) + ' (a turn limit at pN leaves about ' + '(100-N)% of games to the score victory).'); }
  print('By civilization (' + minN + '+ games)', table(c => c.civ, minN)); print('By leader (' + minN + '+ games)', table(c => c.civ + '/' + c.leader, minN)); return;
}
const games = +process.argv[2] || 4, v2 = process.argv[4] === '1', seed0 = +(process.argv[5] || 100);
const mapSize = process.argv[6] || 'standard', mapType = process.argv[7] || 'continents', speed = process.argv[8] || 'standard';
const numCivs = +process.argv[9] || (mapSize === 'standard' ? 6 : AU.MAP_SIZES[mapSize].civs), numStates = process.argv[10] !== undefined && process.argv[10] !== '' ? +process.argv[10] : (mapSize === 'standard' ? 3 : Math.round(AU.MAP_SIZES[mapSize].civs / 2));
const turns = Math.round((+process.argv[3] || 250) * AU.SPEEDS[speed].mult);
for (let k = 0; k < games; k++) {
  // Every leader gets a seat in turn (round robin over all leaders, offset by the seed), so no leader is under-sampled.
  const seed = seed0 + k; const all = []; Object.keys(AU.CIV_BY_ID).forEach(c => (AU.CIV_BY_ID[c].leaders || []).forEach(l => all.push([c, l])));
  const [pick, leader] = all[(seed * 7 + k) % all.length];
  const g = G.newGame({ playerCiv: pick, playerLeader: leader ? leader.id : undefined, mapSize, mapType, speed, numCivs, numStates, seed, difficulty: 'prince', v2 }); // a standard map: room to settle, so abilities decide more than who spawned next to a warlord
  const pl = G.player(g); pl.isPlayer = false; pl.ai = Object.assign({}, AU.LEADER_BY_ID[pl.leaderId].ai);
  for (let t = 0; t < turns && !g.victory; t++) G.endTurn(g); // the game ends at its first victory, as it does for a player
  const majors = g.civs.filter(c => !c.minor).map(c => ({ civ: c.civId, leader: c.leaderId, alive: !!c.alive, score: c.alive ? G.score(g, c) : 0, sets: G.civSettlements(g, c.idx).length })).sort((a, b) => b.score - a.score);
  if (g.victory) { const vi = majors.findIndex(c => c.civ === g.civs[g.victory.civ].civId && c.leader === g.civs[g.victory.civ].leaderId); if (vi > 0) majors.unshift(majors.splice(vi, 1)[0]); } // the victor places first, the rest by score
  majors.forEach((c, i) => { c.rank = i + 1; });
  const vic = g.victory && g.civs[g.victory.civ] ? { type: g.victory.type, civ: g.civs[g.victory.civ].civId, leader: g.civs[g.victory.civ].leaderId, turn: g.victory.turn } : null;
  console.log(JSON.stringify({ seed, v2, turns, played: g.turn, map: { size: mapSize, type: mapType, speed, civs: numCivs }, civs: majors, victory: vic }));
}
