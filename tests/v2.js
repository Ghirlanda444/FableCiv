// v2 Mastery Web: run a game with the engine on and report which Era 1 nodes real play triggers, for every empire.
require('./load.js'); const G = AU.G, MW = AU.MasteryWeb;
const g = G.newGame({ playerCiv: 'rome', playerLeader: 'caesar', mapSize: 'small', mapType: 'continents', numCivs: 5, numStates: 3, seed: 11, difficulty: 'prince', v2: true });
const pl = G.player(g);
// the player plays itself through the AI so triggers fire from real actions
pl.isPlayer = false; pl.ai = Object.assign({}, AU.LEADER_BY_ID[pl.leaderId].ai);
for (let t = 0; t < 120; t++) { G.endTurn(g); if (g.turn % 30 === 0) { const s = MW.state(pl); console.log('turn', g.turn, 'era', s.era, 'unlocked', Object.keys(s.unlocked).length, 'foundation', MW.foundationCount(pl, 0), 'locked', Object.keys(s.locked).join(','), 'traits', JSON.stringify(s.traits), 'study', Math.round(s.study)); } }
const majors = g.civs.filter(c => !c.minor);
const never = AU.V2.NODES.filter(n => !majors.some(c => c.v2 && c.v2.unlocked[n.id]));
console.log('nodes no empire unlocked in 120 turns:', never.map(n => n.id + '(' + n.trigger.type + ':' + n.trigger.cond.join('/') + ')').join(' '));
majors.forEach(c => { const s = MW.state(c); console.log(c.civId, 'era', s.era, 'unlocked', Object.keys(s.unlocked).length, 'hubs', Object.keys(s.traits).length); });
if (!majors.some(c => Object.keys(MW.state(c).unlocked).length >= 10)) throw new Error('the web barely unlocks anything');
console.log('v2 smoke OK');
