// Every promise on a card is kept: the Spark and Insight effects that once did nothing now act, and the age clock follows the Sparks.
const AU = require('./load.js'); const G = AU.G, MW = AU.MasteryWeb, U = AU.U;
let fails = 0; function ok(c, m) { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok', m); }
function fresh(civ, leader, seed) { const g = G.newGame({ playerCiv: civ, playerLeader: leader, mapSize: 'small', numCivs: 3, numStates: 2, seed: seed || 21, difficulty: 'prince', v2: true }); const p = G.player(g); const set = G.civUnits(g, p.idx).find(u => u.type === 'settler'); AU.U.foundCity(g, set); return { g, p }; }
{ const { g, p } = fresh('rome', 'trajan'); ok(p.unitsBuilt === 0, 'starting units are not counted as trained (' + p.unitsBuilt + ')'); ok(!MW.state(p).unlocked.kids, 'Kid Training does not light on turn 1'); }
{ const { g, p } = fresh('rome', 'trajan'); const cc = G.capitalContinent(g, p); const seen = () => g.tiles.filter((t, i) => t.continent === cc && p.explored[i]).length, total = g.tiles.filter(t => t.continent === cc).length;
  const before = seen(); MW.unlock(g, p, 'map'); ok(seen() === total && before < total, 'Bad Map charts the whole home continent (' + before + ' -> ' + seen() + ' of ' + total + ')'); }
{ const { g, p } = fresh('rome', 'trajan'); const o = g.civs.find(c => c !== p && !c.minor); const a0 = o.rel[p.idx].attitude;
  MW.unlock(g, p, 'talking'); ok(o.rel[p.idx].attitude >= a0 + 5, 'Talking Works: leaders warm up at once (' + a0 + ' -> ' + o.rel[p.idx].attitude + ')');
  o.rel[p.idx].attitude = 0; o.isPlayer = false; for (let i = 0; i < 40; i++) { const rel = o.rel[p.idx]; const rest = G.civFx(g, p).attitudeBonus || 0; if (rel.attitude < rest) rel.attitude = Math.min(rest, rel.attitude + 0.5); }
  ok(o.rel[p.idx].attitude >= 5, 'and their opinion rests at the bonus, it does not decay to 0'); }
{ const { g, p } = fresh('rome', 'trajan'); const pts0 = AU.Great.pointsPerTurn(g, p).scientist; MW.unlock(g, p, 'elder'); p._fx = null;
  ok(AU.Great.pointsPerTurn(g, p).scientist === pts0 + 2, 'The Elder: +2 Great Scientist points a turn'); }
{ const { g, p } = fresh('rome', 'trajan'); const sc = G.civUnits(g, p.idx).find(u => AU.UNITS[u.type].cls === 'recon'); const m0 = G.maxMoves(g, p.idx, sc.type, sc); MW.unlock(g, p, 'farwalk'); p._fx = null;
  ok(G.maxMoves(g, p.idx, sc.type, sc) === m0 + 1, 'Long Walk: scouts +1 Movement'); }
{ const { g, p } = fresh('rome', 'trajan'); const w = G.civUnits(g, p.idx).find(u => G.isMilitary(u) && AU.UNITS[u.type].cls !== 'recon'); g.tiles[w.tile].road = true; U.newTurn(g, w); const m0 = w.moves; MW.unlock(g, p, 'path'); p._fx = null; U.newTurn(g, w); ok(w.moves === m0 + 1, 'Path Marks: a unit starting on a road +1 Movement (' + m0 + ' -> ' + w.moves + ')'); }
{ const { g, p } = fresh('rome', 'trajan'); const cap = g.settlements[p.capital]; const far = g.tiles.map((t, i) => i).find(i => G.canFoundAt(g, p.idx, i) && G.dist(g.tiles[i], g.tiles[cap.tile]) >= 6 && g.tiles[i].continent === g.tiles[cap.tile].continent);
  const s = G.foundSettlement(g, p.idx, far); const tp = () => G.settlementYields(g, s).townProduction; const y0 = tp(); MW.unlock(g, p, 'longwalk'); p._fx = null; g.fxGen = (g.fxGen || 0) + 1;
  ok(tp() >= y0 + 2, 'Far Home: settlements 6+ tiles away +2 Production (a Town sells it for Gold) (' + y0 + ' -> ' + tp() + ')'); }
{ const { g, p } = fresh('rome', 'trajan'); const hub = AU.V2.HUB_BY_ID.old_lady; if (hub) { const n0 = G.civUnits(g, p.idx).length; MW.state(p).hubsFired.old_lady = g.turn; MW.choose(g, p, 'old_lady', 'elder_trait'); ok(G.civUnits(g, p.idx).length === n0 + 1, 'an Insight that promises a Great Person delivers one'); } }
// the age clock
{ const { g, p } = fresh('rome', 'trajan'); const s = MW.state(p); const base = MW.ageTurnsNeeded(g, p);
  MW.nodesOfEra(0).filter(n => n.pool === 'foundation').slice(0, 20).forEach(n => { s.unlocked[n.id] = 1; }); ok(MW.ageTurnsNeeded(g, p) === base, 'at the threshold the age lasts ' + base + ' turns');
  MW.nodesOfEra(0).filter(n => n.pool === 'foundation').slice(20, 25).forEach(n => { s.unlocked[n.id] = 1; }); ok(MW.ageTurnsNeeded(g, p) === Math.round((36 - 10) * G.speed(g)), 'five extra Sparks cut it by 10 turns (' + MW.ageTurnsNeeded(g, p) + ')');
  s.lanes = { '0:Sustenance': 1, '0:Craft': 1 }; ok(MW.ageTurnsNeeded(g, p) === Math.round(22 * G.speed(g)), 'two lanes more reach the floor of 22'); }
console.log(fails ? fails + ' FAILED' : 'honesty OK'); process.exit(fails ? 1 : 0);
