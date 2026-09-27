// Byzantium, Justinian, Theodora, Basil and Trajan: each new ability does what its card says.
const AU = require('./load.js'); const G = AU.G, U = AU.U, D = AU.Diplo, MW = AU.MasteryWeb;
let fails = 0; function ok(c, m) { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok', m); }
function fresh(civ, leader, seed) { const g = G.newGame({ playerCiv: civ, playerLeader: leader, mapSize: 'small', numCivs: 3, numStates: 1, seed: seed || 41, difficulty: 'prince', v2: true }); const p = G.player(g); AU.U.foundCity(g, G.civUnits(g, p.idx).find(u => u.type === 'settler')); return { g, p }; }
function other(g, p) { return g.civs.find(c => c !== p && !c.minor); }
{ const { g, p } = fresh('byzantium', 'justinian'); const cap = g.settlements[p.capital];
  cap.hp = 40; cap.attackedTurn = g.turn; G.processSettlement(g, cap); ok(cap.hp >= 90, 'Theodosian Walls: the capital heals 50 even under siege (' + cap.hp + ')');
  const o = other(g, p); p.met[o.idx] = true; o.met[p.idx] = true; p.gold = 500; const a0 = o.rel[p.idx].attitude; D.gift(g, p.idx, o.idx); ok(o.rel[p.idx].attitude === a0 + 16, 'gifts count double (+16)');
  G.declareWar(g, p.idx, o.idx); const price = D.peacePrice(g, p.idx, o.idx); p.gold = price + 10; ok(D.canBuyPeace(g, p.idx, o.idx), 'at war Byzantium can buy peace for ' + price);
  D.buyPeace(g, p.idx, o.idx); ok(!p.rel[o.idx].war && p.gold === 10, 'peace bought and paid');
  ok(MW.reformCost(g, p) === Math.round(120 * G.speed(g) * 0.5), 'Justinian: Reforms cost half (' + MW.reformCost(g, p) + ')');
  ok(AU.Great.pointsPerTurn(g, p).engineer >= 2, 'Justinian: +2 Great Engineer points a turn'); }
{ const { g, p } = fresh('rome', 'trajan'); const o = other(g, p);
  ok(!D.canBuyPeace(g, p.idx, o.idx), 'only Byzantium can buy peace');
  const cap = g.settlements[p.capital]; const c0 = G.settlementYields(g, cap).culture; p.stats.captures = 3; p._fx = null; g.fxGen = (g.fxGen || 0) + 1; ok(G.settlementYields(g, cap).culture >= c0 + 6, "Trajan's Column: +2 Heritage per capture (before the mood multiplier)");
  cap.pop = 3; const f0 = cap.food; G.processSettlement(g, cap); const withA = cap.food - f0;
  const ab = G.leaderData(p).ability; const keep = ab.fx.smallGrowthMult; delete ab.fx.smallGrowthMult; p._fx = null; p._fxKey = null; cap.food = f0; G.processSettlement(g, cap); const without = cap.food - f0; ab.fx.smallGrowthMult = keep; p._fx = null; p._fxKey = null;
  ok(withA > without, 'Alimenta: a small settlement grows faster (' + without.toFixed(2) + ' -> ' + withA.toFixed(2) + ')');
  const nav = g.tiles.find(t => t.navigable && !G.settlementAt(g, t.i)); if (nav) { const bank = g.tiles[G.neighbors(g, nav).find(n => !g.tiles[n].river && !G.isWater(g.tiles[n]) && !AU.TERRAIN[g.tiles[n].terrain].impassable)]; if (bank) { nav.owner = -1; ok(U.enterCost(g, { civ: p.idx, type: 'warrior', tile: bank.i }, nav, bank) < 99, "Trajan's Bridge: rivers do not stop his units"); } } }
{ const { g, p } = fresh('byzantium', 'theodora'); const o = other(g, p); const cap = g.settlements[p.capital];
  const w = G.civUnits(g, p.idx).find(u => G.isMilitary(u)); G.setUnitTile(g, w, cap.tile); const s0 = U.strength(g, w, { attacking: false }); cap.hp = 50; const s1 = U.strength(g, w, { attacking: false });
  ok(s1 === s0 + 5, 'Purple Shroud: defenders of a damaged settlement +5 (' + s0 + ' -> ' + s1 + ')');
  cap.unrest = g.turn + 5; cap.origCiv = o.idx; const civ0 = cap.civ; for (let i = 0; i < 30; i++) G.revoltsTurn(g); ok(cap.civ === civ0, 'her settlements never revolt'); }
{ const { g, p } = fresh('byzantium', 'basil'); const o = other(g, p); G.declareWar(g, p.idx, o.idx);
  const w = G.civUnits(g, p.idx).find(u => G.isMilitary(u)); const enemy = G.civUnits(g, o.idx).find(u => G.isMilitary(u));
  const s0 = U.strength(g, w, { attacking: true, vs: enemy }); g.turn += 20; const s20 = U.strength(g, w, { attacking: true, vs: enemy }); g.turn += 40; const s60 = U.strength(g, w, { attacking: true, vs: enemy });
  ok(s20 === s0 + 4 && s60 === s0 + 6, 'Bulgaroktonos: +1 per 5 turns at war, capped at +6 (' + s0 + ', ' + s20 + ', ' + s60 + ')'); }
console.log(fails ? fails + ' FAILED' : 'byzantium OK'); process.exit(fails ? 1 : 0);
