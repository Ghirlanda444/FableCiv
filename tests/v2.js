// v2 Mastery Web: run a 400-turn game with the engine on and check that real play carries empires through the ages.
require('./load.js'); const G = AU.G, MW = AU.MasteryWeb;
const g = G.newGame({ playerCiv: 'rome', playerLeader: 'caesar', mapSize: 'small', mapType: 'continents', numCivs: 5, numStates: 3, seed: 11, difficulty: 'prince', v2: true });
const pl = G.player(g);
// the player plays itself through the AI so triggers fire from real actions
pl.isPlayer = false; pl.ai = Object.assign({}, AU.LEADER_BY_ID[pl.leaderId].ai);
const TURNS = +(process.env.V2_TURNS || 400);
for (let t = 0; t < TURNS; t++) { G.endTurn(g); if (g.turn % 50 === 0) { const s = MW.state(pl); console.log('turn', g.turn, 'era', s.era, 'unlocked', Object.keys(s.unlocked).length, 'foundation', MW.foundationCount(pl, s.era) + '/' + (AU.V2.ERAS[s.era].advance || '-'), 'traits', Object.keys(s.traits).length, 'study', Math.round(s.study)); } }
const majors = g.civs.filter(c => !c.minor), alive = majors.filter(c => c.alive);
majors.forEach(c => { const s = MW.state(c); console.log(c.civId.padEnd(10), c.alive ? 'alive' : 'gone ', 'era', s.era, 'unlocked', Object.keys(s.unlocked).length, 'hubs', Object.keys(s.traits).length, 'pop', G.civSettlements(g, c.idx).reduce((a, x) => a + x.pop, 0)); });
// which nodes of the eras reached never fired for anyone (balance report)
const maxEra = Math.max.apply(null, majors.map(c => MW.state(c).era));
for (let e = 0; e <= Math.min(maxEra, 2); e++) { const never = AU.V2.NODES.filter(n => n.era === e && !majors.some(c => c.v2 && c.v2.unlocked[n.id])); console.log('era', e, 'nodes nobody unlocked:', never.length + '/' + MW.nodesOfEra(e).length, never.map(n => n.id).join(' ')); }
// every classic unit, building and wonder stays reachable: either a node of an existing era unlocks it or its era gate opens by the last age
function reach(kind, table) { const bad = []; for (const id in table) { const d = table[id]; if (d.v2 || d.great || d.religious) continue; const nid = MW.nodeFor(kind, id); if (nid && !AU.V2.NODE_BY_ID[nid]) bad.push(id + '→' + nid); if (nid && AU.V2.NODE_BY_ID[nid].era > AU.V2.ERAS.length - 1) bad.push(id + '@' + AU.V2.NODE_BY_ID[nid].era); } return bad; }
const unreachable = reach('unit', AU.UNITS).concat(reach('building', AU.BUILDINGS), reach('wonder', AU.WONDERS), reach('national', AU.NATIONAL || {}));
if (unreachable.length) throw new Error('unreachable items: ' + unreachable.join(' '));
const mapped = ['unit', 'building', 'wonder', 'national'].map(k => { const T = { unit: AU.UNITS, building: AU.BUILDINGS, wonder: AU.WONDERS, national: AU.NATIONAL || {} }[k]; let n = 0, m = 0; for (const id in T) { if (T[id].v2 || T[id].great || T[id].religious) continue; n++; if (MW.nodeFor(k, id)) m++; } return k + ' ' + m + '/' + n; });
console.log('items mapped to Sparks:', mapped.join(', '));
// node ids unique, hubs well formed
const ids = {}; AU.V2.NODES.forEach(n => { if (ids[n.id]) throw new Error('duplicate node id ' + n.id); ids[n.id] = 1; if (n.hub && !AU.V2.HUB_BY_ID[n.hub]) throw new Error('node ' + n.id + ' fires unknown hub ' + n.hub); if (n.pair && !AU.V2.NODE_BY_ID[n.pair]) throw new Error('bad pair ' + n.id); });
AU.V2.HUBS.forEach(h => { if (!h.branches || !h.branches.length) throw new Error('hub without branches ' + h.id); });
if (!alive.every(c => MW.state(c).era >= 1)) throw new Error('a surviving empire never left the first age in ' + TURNS + ' turns');
if (!majors.some(c => MW.state(c).era >= 3)) throw new Error('no empire reached the fourth age in ' + TURNS + ' turns');
console.log('v2 smoke OK');
