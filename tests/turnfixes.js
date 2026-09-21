// Sparks fire mid-turn, moves can be undone, settlers cost population, map density.
const AU = require('./load.js'); const G = AU.G, U = AU.U;
let fails = 0; const check = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } };
const g = G.newGame({ playerCiv: 'rome', mapSize: 'small', difficulty: 'prince', seed: 21, mapType: 'continents', speed: 'standard', numCivs: 3 });
const p = G.player(g); const settlerU = G.civUnits(g, p.idx).find(u => u.type === 'settler'); const s = U.foundCity(g, settlerU);
// settlers take population
check(!G.canBuildUnit(g, s, 'settler'), 'no settler at pop 1');
s.pop = 3; check(G.canBuildUnit(g, s, 'settler'), 'settler at pop 3'); G.completeItem(g, s, 'unit', 'settler'); check(s.pop === 2, 'settler cost 1 pop: ' + s.pop);
// spark fires as soon as the condition is met (no end of turn needed)
const t = g.tiles.find(x => x.owner === s.id && x.i !== s.tile && !AU.TERRAIN[x.terrain].water && !x.hills && x.terrain !== 'mountain');
t.resource = 'sheep'; t.feature = null; t.worked = true; if (s.tiles.indexOf(t.i) < 0) s.tiles.push(t.i);
check(G.improvementFor(g, t, p) === 'pasture', 'pasture on sheep');
G.checkBoosts(g, p); check(p.boosts.animal_husbandry !== undefined, 'Herding spark fired mid-turn');
check(g.notifications.some(n => n.big && /Spark/.test(n.text)), 'big spark notification');
// undo a move
const w = G.civUnits(g, p.idx).find(u => u.type === 'warrior'); const from = w.tile, mv = w.moves;
const dest = G.neighbors(g, g.tiles[from]).find(i => G.passable(g, g.tiles[i]) && !G.unitsAt(g, i).length && U.findPath(g, w, i));
check(dest != null && U.orderMove(g, w, dest), 'move ordered'); check(w.tile === dest, 'moved');
check(U.canUndo(g, w), 'can undo'); check(U.undoMove(g, w), 'undo ok'); check(w.tile === from && w.moves === mv, 'position and moves restored');
check(!U.canUndo(g, w), 'no double undo');
check(U.orderMove(g, w, dest) && U.canUndo(g, w), 'second order can be undone'); G.endTurn(g); check(!U.canUndo(g, w), 'undo gone after end of turn');
// map density
check(AU.MAP_SIZES.huge.civs === 12 && AU.MAP_SIZES.enormous.civs === 14, 'lower empire counts on big maps');
if (fails) { console.log(fails, 'failures'); process.exit(1); } console.log('turnfixes tests OK');

// A natural wonder found on turn 1 must never complete the first technology or civic by itself (it used to give a flat +40).
(function () {
  const G = AU.G;
  const g = G.newGame({ playerCiv: 'rome', playerLeader: 'caesar', scenario: 'rise_of_rome', difficulty: 'prince', seed: 5 });
  const pl = G.player(g); pl.currentTech = G.availableTechs(pl)[0].id; pl.currentCivic = G.availableCivics(pl)[0].id;
  const t = pl.currentTech, c = pl.currentCivic;
  if (!(pl.bonusScience > 0)) throw new Error('expected a natural wonder discovery bonus at the start of Rise of Rome');
  G.endTurn(g);
  if (pl.techs[t] || pl.civics[c]) throw new Error('natural wonder bonus completed ' + (pl.techs[t] ? t : c) + ' on turn 2');
  console.log('natural wonder bonus OK: turn 2 progress', Math.round(pl.techProgress[t]), '/', G.techCost(g, pl, AU.TECH_BY_ID[t]));
})();

// ---- balance of power: unrest, satiation, truce length, mercy, revolts
{
  const G = AU.G, U = AU.U;
  const g = G.newGame({ playerCiv: 'rome', playerLeader: 'caesar', mapSize: 'small', mapType: 'continents', numCivs: 3, numStates: 0, seed: 7, difficulty: 'prince' });
  const a = g.civs[0], b = g.civs[1]; a.met[b.idx] = true; b.met[a.idx] = true;
  const sa = U.foundCity(g, G.civUnits(g, a.idx).filter(u => u.type === 'settler')[0]);
  const settlerB = G.civUnits(g, b.idx).filter(u => u.type === 'settler')[0]; const sb = U.foundCity(g, settlerB);
  const far = g.tiles.filter(t => !G.isWater(t) && !AU.TERRAIN[t.terrain].impassable && t.settlement == null && t.owner < 0 && G.dist(t, g.tiles[sa.tile]) > 10 && G.dist(t, g.tiles[sb.tile]) > 4)[0];
  const sb2 = G.foundSettlement(g, b.idx, far.i); // a second, distant settlement of b
  G.declareWar(g, a.idx, b.idx);
  if (a.rel[b.idx].warBy !== a.idx) throw new Error('warBy not recorded');
  U.captureSettlement(g, sb2, a.idx, null);
  if (!(sb2.unrest > g.turn) || sb2.origCiv !== b.idx || a.rel[b.idx].capturedThisWar !== 1) throw new Error('capture bookkeeping: unrest ' + sb2.unrest + ' origCiv ' + sb2.origCiv);
  const y = G.settlementYields(g, sb2); if (!(y.happiness <= 0)) throw new Error('unrest should sour the settlement: ' + y.happiness);
  // revolt: far, unhappy, no garrison: within 40 tries it returns
  G.unitsAt(g, sb2.tile).forEach(u => G.removeUnit(g, u)); sb2.pop = 12; g.tiles.forEach(t => {}); let back = false;
  for (let i = 0; i < 60 && !back; i++) { G.revoltsTurn(g); if (sb2.civ === b.idx) back = true; }
  if (!back) throw new Error('a far unhappy conquered settlement never revolted');
  // satiation and mercy
  a.rel[b.idx].capturedThisWar = 2; a.rel[b.idx].warSince = g.turn - 10; if (!G.aiAcceptsPeace(g, a, b.idx)) throw new Error('two captures should satiate');
  a.ai = Object.assign({}, AU.LEADER_BY_ID[a.leaderId].ai, { aggression: 0.5 }); b.rel[a.idx].warBy = a.idx;
  const cnt = G.civSettlements(g, b.idx).length; const target = AU.AI.warTarget(g, a);
  if (cnt === 1 && target) throw new Error('mercy: the last settlement of an attacked empire should be spared');
  G.makePeace(g, a.idx, b.idx); if (a.rel[b.idx].peaceUntil - g.turn !== 40) throw new Error('a truce after captures should hold 40 turns, got ' + (a.rel[b.idx].peaceUntil - g.turn));
  console.log('balance of power OK');
}
