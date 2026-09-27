// Railways: a ruler's investment in Gold, time, Production, Iron and Coal, paid back in trade, industry and speed.
const AU = require('./load.js'); const G = AU.G, U = AU.U, RD = AU.Roads, MW = AU.MasteryWeb;
let fails = 0; function ok(c, m) { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok', m); }
function setup(seed) {
  const g = G.newGame({ playerCiv: 'germany', playerLeader: 'barbarossa', mapSize: 'small', numCivs: 3, numStates: 1, seed: seed || 91, difficulty: 'prince', v2: true });
  const p = G.player(g); U.foundCity(g, G.civUnits(g, p.idx).find(u => u.type === 'settler')); const cap = g.settlements[p.capital];
  const t0 = g.tiles[cap.tile]; const site = g.tiles.find(t => !G.isWater(t) && t.continent === t0.continent && G.dist(t, t0) === 6 && G.canFoundAt(g, p.idx, t.i));
  const s2 = G.foundSettlement(g, p.idx, site.i); s2.pop = 8; cap.pop = 8;
  return { g, p, cap, s2 };
}
function supply(g, p, iron, coal) { p.synth = { iron: iron, coal: coal }; p._lux = null; }

{ const { g, p, cap, s2 } = setup();
  const opt0 = RD.railOptions(g, p, cap).find(o => o.other === s2); ok(opt0 && opt0.path.length >= 6, 'the ruler can pick another settlement to connect (' + (opt0 && opt0.path.length) + ' tiles)');
  ok(/Iron Rail/.test(RD.railWhy(g, p, cap, opt0)), 'no railway before the Iron Rail Spark');
  MW.state(p).unlocked[RD.RAIL.spark] = g.turn;
  ok(/Station/.test(RD.railWhy(g, p, cap, opt0)), 'a Railway Station is needed at one end');
  G.addBuilding(g, cap, 'railway_station');
  supply(g, p, 0, 0); ok(/Iron/.test(RD.railWhy(g, p, cap, opt0)), 'every line needs a free Iron');
  supply(g, p, 1, 0); ok(/Coal/.test(RD.railWhy(g, p, cap, opt0)), 'and Coal to run the trains');
  supply(g, p, 1, 1); p.gold = 10; ok(/Gold/.test(RD.railWhy(g, p, cap, opt0)), 'and the Gold up front');
  const opt = RD.railOptions(g, p, cap).find(o => o.other === s2);
  const flatCost = opt.path.reduce((a, i) => a + RD.tileGold(g, g.tiles[i]), 0);
  ok(opt.cost === flatCost && opt.cost >= RD.RAIL.goldPerTile * opt.path.length * G.speed(g), 'the price is ' + opt.cost + ' Gold for ' + opt.path.length + ' tiles (50 a tile, more on rough ground and bridges)');
  ok(opt.turns >= 2 * opt.path.length, 'and ' + opt.turns + ' turns of work (2 a tile at least)');
  // start
  p.gold = opt.cost + 500; const p0 = G.settlementYields(g, cap).production;
  const L = RD.startRail(g, p, cap, s2.id); ok(L && p.gold === 500, 'the line is paid up front');
  ok(RD.ironFree(g, p) === 0, 'the line holds the Iron');
  const p1 = G.settlementYields(g, cap).production; ok(p1 < p0, 'the crews drain Production at both ends (' + p0.toFixed(1) + ' -> ' + p1.toFixed(1) + ')');
  // laying takes time, tile by tile
  const turn0 = g.turn; let firstTile = null;
  for (let k = 0; k < 400 && !L.done; k++) { g.turn++; RD.railTurn(g, p); if (firstTile === null && RD.lineProgress(g, L).laid > 0) firstTile = g.turn - turn0; if (g.turn - turn0 === 3) ok(RD.lineProgress(g, L).laid <= 2, 'after 3 turns at most 2 tiles are down'); }
  ok(L.done && g.turn - turn0 >= opt.turns - 1, 'the line opens after ' + (g.turn - turn0) + ' turns (planned ' + opt.turns + ')');
  ok(L.path.every(i => g.tiles[i].rail), 'every tile of the line carries track');
  // running
  const y = RD.railYields(g, s2, p); ok(y.running === 1 && y.gold >= 2 + 2 && y.pct === 15, 'a running line: +' + y.gold + ' Gold from trade and +15% Production');
  const u = G.spawnUnit(g, p.idx, 'warrior', L.path[1]); ok(U.enterCost(g, u, g.tiles[L.path[2]], g.tiles[L.path[1]]) <= 0.1, 'trains cross the line for almost nothing');
  supply(g, p, 1, 0); ok(RD.railYields(g, s2, p).running === 0, 'without Coal the line stands idle'); supply(g, p, 1, 1);
  const gold0 = p.gold; RD.railTurn(g, p); ok(p.gold === gold0 - RD.RAIL.upkeep, 'each line costs 2 Gold a turn');
  // a new line reuses the track
  const t0 = g.tiles[cap.tile]; const site3 = g.tiles.find(t => !G.isWater(t) && t.continent === t0.continent && G.dist(t, g.tiles[s2.tile]) === 3 && G.dist(t, t0) >= 7 && G.canFoundAt(g, p.idx, t.i));
  if (site3) { const s3 = G.foundSettlement(g, p.idx, site3.i); supply(g, p, 3, 1); const o3 = RD.railOptions(g, p, cap).find(o => o.other === s3);
    ok(o3 && o3.fresh < o3.path.length && o3.cost < RD.RAIL.goldPerTile * o3.path.length * G.speed(g), 'a second line reuses the track already laid and only pays for new tiles (' + (o3 && o3.fresh) + ' new of ' + (o3 && o3.path.length) + ')'); }
  // the benefits never fade
  MW.state(p).era = 6; ok(RD.railYields(g, s2, p).pct === 15, 'in the Pixel Age a line still gives its full benefits');
}
{ // the AI invests when it can afford it
  const { g, p, cap, s2 } = setup(92); p.isPlayer = false; p.ai = Object.assign({}, AU.LEADER_BY_ID[p.leaderId].ai);
  MW.state(p).unlocked[RD.RAIL.spark] = g.turn; G.addBuilding(g, cap, 'railway_station'); supply(g, p, 2, 1); p.gold = 3000;
  AU.AI.rails(g, p); ok(RD.lines(p).length === 1, 'the AI starts a line when rich enough');
  const { g: g2, p: p2, cap: c2 } = setup(93); p2.isPlayer = false; MW.state(p2).unlocked[RD.RAIL.spark] = g2.turn; G.addBuilding(g2, c2, 'railway_station'); supply(g2, p2, 2, 1); p2.gold = 100;
  AU.AI.rails(g2, p2); ok(RD.lines(p2).length === 0, 'and not when it cannot keep a reserve');
}
console.log(fails ? fails + ' FAILED' : 'rails OK'); process.exit(fails ? 1 : 0);
