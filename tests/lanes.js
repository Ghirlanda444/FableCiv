// Lane Mastery: lighting every foundation Spark of a lane in its age grants a permanent reward; abilities add to it; three effect keys are real.
const AU = require('./load.js'); const G = AU.G, MW = AU.MasteryWeb;
let fails = 0; function ok(c, m) { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok', m); }
function fresh(civ, leader) { const g = G.newGame({ playerCiv: civ, playerLeader: leader, mapSize: 'tiny', numCivs: 3, numStates: 1, seed: 11, difficulty: 'prince', v2: true }); const p = G.player(g); const set = G.civUnits(g, p.idx).find(u => u.type === 'settler'); AU.U.foundCity(g, set); return { g, p }; }
{ const { g, p } = fresh('rome', 'caesar'); const s = MW.state(p);
  const nodes = MW.laneNodes(0, 'Sustenance'); ok(nodes.length === 7, 'Sustenance lane of the Pebble Age has 7 Sparks');
  nodes.slice(0, 6).forEach(n => MW.unlock(g, p, n.id)); ok(!MW.laneMastered(p, 0, 'Sustenance') && MW.laneCount(p, 0, 'Sustenance').lit === 6, 'six of seven: not mastered yet');
  const before = G.civFx(g, p).growthMult || 1;
  MW.unlock(g, p, nodes[6].id); ok(MW.laneMastered(p, 0, 'Sustenance'), 'seventh Spark masters the lane');
  const fx = G.civFx(g, p); ok(Math.abs((fx.growthMult || 1) - before * 1.1) < 1e-9, 'Full Bellies: growth +10% (' + before + ' -> ' + fx.growthMult + ')');
  ok(g.notifications.some(n => n.kind === 'lane'), 'the player is told');
  ok((g.sparksLit || []).indexOf('lane:0:Sustenance') >= 0, 'the lane goes on the Spark card');
  MW.unlock(g, p, nodes[0].id); ok(s.log.filter(l => l.lane === '0:Sustenance').length === 1, 'a lane is mastered once');
}
{ const { g, p } = fresh('babylon', 'hammurabi'); const s = MW.state(p);
  const nodes = MW.laneNodes(0, 'Shelter'); const litBefore = () => Object.keys(s.unlocked).length;
  nodes.slice(0, -1).forEach(n => MW.unlock(g, p, n.id)); const n0 = litBefore(); MW.unlock(g, p, nodes[nodes.length - 1].id);
  ok(litBefore() === n0 + 2, 'Hammurabi: mastering a lane lights one more foundation Spark (' + n0 + ' -> ' + litBefore() + ')');
}
{ const { g, p } = fresh('korea', 'sejong'); const s = MW.state(p); const study0 = s.study;
  MW.laneNodes(0, 'Craft').forEach(n => MW.unlock(g, p, n.id));
  ok(s.study >= study0 + 60, 'Sejong: +60 Knowledge on mastery');
  ok((G.civFx(g, p).capitalYields || {}).science >= 3, 'Korea: capital +3 Knowledge per lane mastered');
}
{ const { g, p } = fresh('china', 'taizong'); const n = MW.laneNodes(0, 'Kinship')[0]; const c0 = MW.studyCost(g, p, MW.laneNodes(0, 'Craft')[0]);
  MW.laneNodes(0, 'Kinship').forEach(x => MW.unlock(g, p, x.id)); const c1 = MW.studyCost(g, p, MW.laneNodes(0, 'Craft')[0]);
  ok(c1 < c0, 'Taizong: study cheaper after a lane (' + c0 + ' -> ' + c1 + ')');
}
{ const { g, p } = fresh('rome', 'caesar'); const cap = g.settlements[p.capital];
  const y = G.settlementYields(g, cap); const surplus = y.food - cap.pop * 2; ok(surplus > 0, 'capital has a food surplus to test housing');
  const f0 = cap.food; G.processSettlement(g, cap); const gain0 = cap.food - f0; cap.food = f0;
  p._fx = null; const ab = G.civData(p).ability; const keep = ab.fx.housingBonus; ab.fx.housingBonus = 4; p._fxKey = null; p._fx = null;
  G.processSettlement(g, cap); const gain1 = cap.food - f0; ab.fx.housingBonus = keep; p._fx = null;
  ok(gain1 > gain0, 'Housing speeds growth (' + gain0.toFixed(2) + ' -> ' + gain1.toFixed(2) + ')');
}
{ const { g, p } = fresh('rome', 'caesar'); const cap = g.settlements[p.capital]; const t = g.tiles[cap.tile];
  const far = AU.Hex.spiral(t.col, t.row, 5, g.W, g.H).filter(i => G.dist(t, g.tiles[i]) === 5); const u = { civ: p.idx, tile: far[0], type: 'caravan' };
  const i0 = AU.CityStates.routeIncome(g, u); const ab = G.civData(p).ability; ab.fx.caravanRange = 3; p._fx = null; p._fxKey = null; const i1 = AU.CityStates.routeIncome(g, u); delete ab.fx.caravanRange; p._fx = null;
  ok(i1 > i0, 'caravanRange pays more (' + i0 + ' -> ' + i1 + ')');
}
console.log(fails ? fails + ' FAILED' : 'lanes OK'); process.exit(fails ? 1 : 0);
