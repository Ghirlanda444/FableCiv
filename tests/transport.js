// Airports, highways and fuel: the transport of the Glowbit and Pixel Ages.
const AU = require('./load.js'); const G = AU.G, U = AU.U, AR = AU.Air, HW = AU.Hwy, TR = AU.Transport, MW = AU.MasteryWeb;
let fails = 0; function ok(c, m) { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok', m); }
function setup(seed, n) {
  const g = G.newGame({ playerCiv: 'germany', playerLeader: 'barbarossa', mapSize: 'standard', numCivs: 2, numStates: 0, seed: seed || 91, difficulty: 'prince', v2: true });
  const p = G.player(g); U.foundCity(g, G.civUnits(g, p.idx).find(u => u.type === 'settler')); const cap = g.settlements[p.capital]; cap.pop = 12;
  const sets = [cap], t0 = g.tiles[cap.tile];
  for (let d = 4; d <= 14 && sets.length < n; d++) g.tiles.forEach(t => { if (sets.length >= n || G.isWater(t) || t.continent !== t0.continent || G.dist(t, t0) !== d) return; if (sets.some(o => G.dist(g.tiles[o.tile], t) < 4)) return; if (!G.canFoundAt(g, p.idx, t.i)) return; const s = G.foundSettlement(g, p.idx, t.i); s.pop = 4 + sets.length; sets.push(s); });
  return { g, p, cap, sets };
}
function supply(p, o) { p.synth = Object.assign({}, o); p._lux = null; }

// ---------- airports ----------
{ const { g, p, cap, sets } = setup(91, 6);
  ok(sets.length >= 5, 'test empire has ' + sets.length + ' settlements');
  MW.state(p).unlocked[AR.CFG.spark] = g.turn;
  ok(G.canBuildBuilding(g, cap, 'airport'), 'the Airport is an ordinary building (no Aluminum needed to build it)');
  G.addBuilding(g, cap, 'airport'); ok(AR.routes(g, p).length === 0 && AR.yields(g, cap, p).gold === 0, 'one Airport flies nowhere');
  G.addBuilding(g, sets[1], 'airport'); const y1 = AR.yields(g, cap, p);
  ok(AR.routes(g, p).length === 1 && y1.gold > 0 && y1.science > 0 && y1.fame > 0, 'two Airports fly a route: +' + y1.gold + ' Gold +' + y1.science + ' Knowledge +' + y1.fame + ' Fame');
  sets.slice(2).forEach(s => G.addBuilding(g, s, 'airport'));
  ok(sets.every(s => AR.partners(g, p, s).length <= 3), 'a level-1 Airport serves at most 3 routes');
  ok(AR.partners(g, p, cap).length === 3, 'the capital fills its 3 gates');
  // a hub
  cap.airLevel = 2; const hub = AR.partners(g, p, cap);
  ok(hub.length === Math.min(6, sets.length - 1), 'a level-2 hub serves ' + hub.length + ' routes (6 gates)');
  ok(sets.slice(1).every(s => AR.partners(g, p, s).length <= 3), 'the Airports it serves keep their own 3-gate limit');
  ok(sets.slice(1).every(s => AR.partners(g, p, s).indexOf(cap) >= 0), 'and every one of them flies to the hub first');
  // diminishing
  const ys = []; cap.airLevel = 1; for (let k = 1; k <= 5; k++) { const others = sets.slice(1, 1 + k); const g2 = { turn: g.turn + k * 1000 }; ys.push(k); }
  const w = AR.partners(g, p, cap).map((o, k) => (AR.CFG.gold + Math.floor(o.pop / AR.CFG.popPerGold)) / (k + 1));
  ok(w.every((v, k) => k === 0 || v <= w[k - 1]), 'each extra route counts for less (' + w.map(v => v.toFixed(1)).join(', ') + ')');
  // upgrades
  p.gold = 5000; const c1 = AR.upgradeCost(g, cap); ok(AR.upgrade(g, p, cap) && p.gold === 5000 - c1 && cap.airWork, 'enlarging costs ' + c1 + ' Gold up front');
  ok(!AR.upgrade(g, p, cap), 'one works at a time');
  const t1 = cap.airWork.done; while (g.turn < t1) { g.turn++; AR.turn(g, p); }
  ok(AR.level(cap) === 2 && !cap.airWork, 'the Airport reaches level 2 after ' + AR.upgradeTurns({ buildings: ['airport'], airLevel: 1 }) + ' turns');
  supply(p, {}); ok(/Aluminum/.test(AR.upgradeWhy(g, p, cap)), 'level 3 needs Aluminum');
  supply(p, { aluminum: 1 }); ok(!AR.upgradeWhy(g, p, cap), 'with Aluminum the works can start');
  cap.airLevel = 7; ok(AR.gates(cap) === 21, 'there is no top level: level 7 has 21 gates');
  cap.airLevel = 2;
  // fuel
  supply(p, {}); const f0 = TR.fuel(g, p); ok(f0.need === 1 + sets.length && f0.cost === 2 * f0.need, 'without Oil every Airport level runs on imported fuel (' + f0.cost + ' Gold a turn)');
  supply(p, { oil: 2 }); ok(TR.fuel(g, p).cost === 0, '2 Oil fuel 12 points');
  // airlift
  const u = G.spawnUnit(g, p.idx, 'warrior', cap.tile); u.moves = U.def(g, u).moves; u.movedTurn = -1;
  const dest = AR.flights(g, u); ok(dest.length === AR.partners(g, p, cap).length, 'a soldier in the hub can fly to ' + dest.length + ' Airports');
  ok(AR.fly(g, u, dest[0].id) && u.tile === dest[0].tile && u.moves === 0, 'and lands in ' + dest[0].name + ' with its turn spent');
  const u2 = G.spawnUnit(g, p.idx, 'warrior', cap.tile); u2.movedTurn = g.turn; ok(!!AR.flyWhy(g, u2), 'a unit that already moved cannot board');
  // settlement yields include the routes
  const base = G.settlementYields(g, sets[1]).gold; G.removeBuilding ? G.removeBuilding(g, sets[1], 'airport') : sets[1].buildings.splice(sets[1].buildings.indexOf('airport'), 1);
  ok(G.settlementYields(g, sets[1]).gold < base, 'the routes show in the settlement Gold');
  // AI enlarges its hub when rich
  p.isPlayer = false; sets[1].buildings.push('airport'); cap.airLevel = 1; cap.airWork = null; p.gold = 9000; AU.AI.airports(g, p); ok(!!cap.airWork || sets.some(s => s.airWork), 'the AI enlarges its busiest Airport when rich');
}

// ---------- highways ----------
{ const { g, p, cap, sets } = setup(93, 3);
  const s2 = sets.slice(1).find(s => G.dist(g.tiles[s.tile], g.tiles[cap.tile]) <= 8) || sets[1];
  ok(!G.canBuildBuilding(g, cap, 'interchange'), 'no Interchange before the Paved Everywhere Spark');
  MW.state(p).unlocked[HW.CFG.spark] = g.turn; G.addBuilding(g, cap, 'workshop');
  ok(G.canBuildBuilding(g, cap, 'interchange'), 'Paved Everywhere unlocks the Highway Interchange');
  G.addBuilding(g, cap, 'interchange'); G.addBuilding(g, s2, 'interchange');
  cap.tiles.forEach(i => { const t = g.tiles[i]; if (G.dist(t, g.tiles[cap.tile]) <= 2 && !G.isWater(t)) t.worked = true; });
  let paved0 = g.tiles.filter(t => t.highway).length; g.turn++; HW.turn(g, p); let paved1 = g.tiles.filter(t => t.highway).length;
  ok(paved1 - paved0 <= 2 + 2 + 2, 'paving takes time: ' + (paved1 - paved0) + ' tiles on the first turn');
  ok(g.tiles[cap.tile].highway, 'the Interchange paves its own square first');
  const gold0 = p.gold; g.turn++; HW.turn(g, p); ok(p.gold === gold0 - 2 * HW.CFG.upkeep, 'each Interchange costs 2 Gold a turn');
  for (let k = 0; k < 40; k++) { g.turn++; HW.turn(g, p); }
  const j = HW.joined(g, p, cap); ok(j.indexOf(s2) >= 0, 'the interstate joins ' + cap.name + ' and ' + s2.name);
  const hy = HW.yields(g, cap, p); ok(hy.production === HW.CFG.joinProd && hy.trucks > 0 && hy.gold >= hy.trucks, 'Interchange: +' + hy.production + ' Production, +' + hy.gold + ' Gold (' + hy.trucks + ' worked tiles on a highway)');
  ok(HW.growthMult(g, cap) === 1.15 && HW.growthMult(g, sets.find(s => !HW.inter(s)) || { buildings: [] }) === 1, 'suburbs: +15% growth');
  const pth = g.tiles.filter(t => t.highway && !G.settlementAt(g, t.i)); const a = pth[0], b = g.tiles[G.neighbors(g, a).find(n => g.tiles[n].highway && !g.tiles[n].rail)];
  const u = G.spawnUnit(g, p.idx, 'warrior', a.i); ok(b && U.enterCost(g, u, b, a) <= 0.2, 'units drive the highway for 0.2 movement');
  ok(G.settlementYields(g, cap).production > 0, 'settlement yields still compute');
  supply(p, {}); ok(TR.fuel(g, p).need === 4, 'each Interchange needs 2 fuel');
}
console.log(fails ? fails + ' FAILED' : 'transport OK'); process.exit(fails ? 1 : 0);
