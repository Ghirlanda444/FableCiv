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
