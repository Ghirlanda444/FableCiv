// Headless simulation: every civ (player included) is driven by the AI for N turns.
const AU = require('./load');
const G = AU.G, U = AU.U;
const turns = +process.argv[2] || 120, seed = +process.argv[3] || 12345, size = process.argv[4] || 'small';
const t0 = Date.now();
const g = G.newGame({ playerCiv: 'rome', mapSize: size, difficulty: 'prince', seed });
const player = G.player(g);
player.ai = Object.assign({}, G.civData(player).ai);
console.log('map', g.W + 'x' + g.H, 'civs', g.civs.map(c => c.civId).join(','), 'camps', g.camps.length);
for (let i = 0; i < turns && !g.victory; i++) {
  AU.AI.takeTurn(g, player);
  G.endTurn(g);
  if (g.turn % 20 === 0) {
    const line = g.civs.map(c => `${c.civId}:${c.alive ? G.civSettlements(g, c.idx).length + 's/' + G.civUnits(g, c.idx).length + 'u/' + Object.keys(c.techs).length + 't/' + Math.round(c.gold) + 'g' : 'dead'}`).join(' ');
    console.log('T' + g.turn, line);
  }
}
const errs = g.log.filter(l => /AI error/.test(l.msg));
console.log('done in', Date.now() - t0, 'ms; turn', g.turn, 'victory', JSON.stringify(g.victory), 'AI errors:', errs.length);
errs.slice(0, 5).forEach(e => console.log('  ', e.msg));
const pops = Object.values(g.settlements).map(s => s.pop);
console.log('settlements', pops.length, 'pop range', Math.min(...pops), '-', Math.max(...pops), 'wonders', Object.keys(g.wonders).length, 'wars', g.log.filter(l => /declared war/.test(l.msg)).length, 'captures', g.log.filter(l => /captured/.test(l.msg)).length);
const json = G.serialize(g); const g2 = G.deserialize(json);
console.log('save size', (json.length / 1024).toFixed(0) + 'KB', 'roundtrip ok', g2.turn === g.turn && Object.keys(g2.units).length === Object.keys(g.units).length);
if (errs.length) process.exit(1);
