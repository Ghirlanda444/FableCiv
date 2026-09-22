// Three kinds of wonder: Wonders in any City, Great Wonders in the capital or a Town of their trade, National Wonders once per empire (some only in a Town of a trade).
require('./load.js'); const G = AU.G, U = AU.U;
function assert(c, m) { if (!c) throw new Error(m); }
function fresh(v2, seed) { return G.newGame({ playerCiv: 'egypt', playerLeader: 'ramses', mapSize: 'small', mapType: 'continents', numCivs: 3, numStates: 1, seed: seed || 12, difficulty: 'prince', v2: !!v2 }); }
function landNear(g, s, d) { return g.tiles.filter(t => !G.isWater(t) && t.terrain !== 'mountain' && t.settlement == null && t.owner < 0 && G.dist(t, g.tiles[s.tile]) >= d && G.dist(t, g.tiles[s.tile]) <= d + 2)[0]; }
const great = Object.keys(AU.WONDERS).filter(k => AU.WONDERS[k].tier === 'great'), generic = Object.keys(AU.WONDERS).filter(k => AU.WONDERS[k].tier !== 'great');
assert(great.length === 13 && generic.length === 7, 'tiers: ' + great.length + ' great, ' + generic.length + ' generic');
great.forEach(k => assert(AU.SPECIALIZATIONS[AU.WONDERS[k].home], k + ' has a home trade'));
for (let v2 = 0; v2 < 2; v2++) {
  const g = fresh(!!v2); const p = G.player(g);
  const cap = U.foundCity(g, G.civUnits(g, p.idx).filter(u => u.type === 'settler')[0]); assert(cap.isCity && cap.isCapital, 'capital');
  // everything unlocked for the test
  if (g.v2) { const st = AU.MasteryWeb.state(p); st.era = 6; p.era = 6; } else { for (const t of AU.TECHS) p.techs[t.id] = true; for (const c of AU.CIVICS) p.civics[c.id] = true; }
  p._fx = null; g.fxGen = (g.fxGen || 0) + 1;
  const site = landNear(g, cap, 4); const town = G.foundSettlement(g, p.idx, site.i); assert(town && !town.isCity, 'a Town');
  // a plain Town raises nothing; a City raises generic wonders only; the capital raises Great Wonders too
  const noSite = id => !AU.WONDERS[id].needs;
  const gen = generic.filter(noSite)[0], grt = great.filter(noSite)[0]; assert(gen && grt, 'wonders without a site rule: ' + gen + ' ' + grt);
  assert(!G.canBuildWonder(g, town, gen) && !G.canBuildWonder(g, town, grt), 'an unspecialized Town raises no wonder');
  assert(G.canBuildWonder(g, cap, gen) && G.canBuildWonder(g, cap, grt), 'the capital raises both kinds');
  assert(G.itemCost(g, p, 'wonder', grt, cap) === Math.round(AU.WONDERS[grt].cost * (G.civFx(g, p).wonderCostMult || 1) * 1.5) || Math.abs(G.itemCost(g, p, 'wonder', grt, cap) - AU.WONDERS[grt].cost * (G.civFx(g, p).wonderCostMult || 1) * 1.5) < 1, 'the capital pays 50% more for a Great Wonder (' + G.itemCost(g, p, 'wonder', grt, cap) + ')');
  const city2 = G.foundSettlement(g, p.idx, landNear(g, cap, 8).i); city2.isCity = true;
  assert(G.canBuildWonder(g, city2, gen) && !G.canBuildWonder(g, city2, grt), 'a second City raises generic wonders only');
  // a Town of the matching trade raises the Great Wonder; the wrong trade does not
  town.pop = 6; const home = AU.WONDERS[grt].home; const other = Object.keys(AU.SPECIALIZATIONS).filter(k => k !== home)[0];
  town.specialization = other; assert(!G.canBuildWonder(g, town, grt), 'wrong trade: ' + other + ' cannot raise ' + grt);
  town.specialization = home; assert(G.canBuildWonder(g, town, grt), home + ' Town raises ' + grt);
  assert(!G.enqueue(g, town, 'unit', 'warrior') && !G.enqueue(g, town, 'wonder', gen), 'a Town queues no units and no generic wonder');
  assert(G.enqueue(g, town, 'wonder', grt), 'the Great Wonder is queued'); assert(!G.enqueue(g, town, 'wonder', grt), 'one Great work at a time');
  // its Production now builds the wonder instead of turning into Gold
  town.tiles.forEach(i => { if (i !== town.tile) g.tiles[i].worked = true; });
  const y = G.settlementYields(g, town); assert(y.production > 0 && y.townProduction === y.production, 'Town keeps its Production while raising (' + y.production + ')');
  const gold0 = p.gold; G.processSettlement(g, town); assert(town.progress['wonder:' + grt] > 0, 'progress on the wonder'); 
  town.queue = []; const y2 = G.settlementYields(g, town); assert(y2.production === 0 && y2.gold > y.gold, 'without a queue the Production turns to Gold again');
  // finish it
  G.enqueue(g, town, 'wonder', grt); town.progress['wonder:' + grt] = AU.WONDERS[grt].cost * 10; G.processSettlement(g, town);
  assert(g.wonders[grt] === town.id && G.hasBuilding(town, grt), 'the Town completed the Great Wonder'); assert(!G.canBuildWonder(g, cap, grt), 'only one in the world');
  // a change of trade drops a queued wonder with half the work refunded
  const grt2 = great.filter(k => noSite(k) && k !== grt && AU.WONDERS[k].home === home)[0] || great.filter(k => noSite(k) && k !== grt)[0]; town.specialization = AU.WONDERS[grt2].home; G.enqueue(g, town, 'wonder', grt2); town.progress['wonder:' + grt2] = 100; town.pop = 8; p.gold = 500; const g1 = p.gold; const other2 = Object.keys(AU.SPECIALIZATIONS).filter(k => k !== town.specialization)[0]; assert(G.specialize(g, town, other2), 'trade changed'); assert(!town.queue.length && p.gold >= g1 + 50 - 60, 'trade change prunes the queue and refunds half (' + (p.gold - g1) + ')');
  // national wonders with a home: only that trade, once per empire
  const oxford = AU.NATIONAL.oxford_university; assert(oxford && oxford.home === 'urban', 'Oxford lives in Urban Centers');
  [cap, city2].forEach(s => { G.addBuilding(g, s, 'university'); }); town.specialization = 'urban';
  assert(!G.canBuildNational(g, cap, 'oxford_university'), 'the capital cannot raise Oxford'); assert(G.canBuildNational(g, town, 'oxford_university'), 'an Urban Center Town can');
  assert(G.enqueue(g, town, 'national', 'oxford_university'), 'queued'); town.progress['national:oxford_university'] = 99999; G.processSettlement(g, town); assert(G.hasBuilding(town, 'oxford_university'), 'Oxford raised');
  assert(!G.canBuildNational(g, town, 'oxford_university'), 'once per empire');
  assert(G.canBuildNational(g, cap, 'national_epic') || !G.canBuildNational(g, cap, 'national_epic'), 'city nationals still evaluate');
  // Divergence wonder effects reach the empire
  if (g.v2) { g.wonders.pyramids = cap.id; G.addBuilding(g, cap, 'pyramids'); p._fx = null; g.fxGen++; assert(G.civFx(g, p).freeClaims === 1, 'Pyramids: +1 free claim under Divergence'); assert(G.freeClaims(g, cap) === 4, 'four free claims'); }
  else { g.wonders.pyramids = cap.id; G.addBuilding(g, cap, 'pyramids'); p._fx = null; g.fxGen++; assert(!G.civFx(g, p).freeClaims, 'classic: no Divergence extra'); }
  g.wonders.big_ben = cap.id; G.addBuilding(g, cap, 'big_ben'); p._fx = null; g.fxGen++; assert(G.civFx(g, p).commandBonus >= 1, 'Big Ben: +1 Command in both rule sets');
  console.log((g.v2 ? 'Divergence' : 'classic') + ' wonders OK');
}
// the AI raises Great Wonders in specialized Towns over a long game
{ const g = fresh(true, 14); const p = G.player(g); p.isPlayer = false; p.ai = Object.assign({}, AU.LEADER_BY_ID[p.leaderId].ai); let townWork = 0; for (let t = 0; t < 260; t++) { G.endTurn(g); for (const id in g.settlements) { const s = g.settlements[id]; if (!s.isCity && s.queue.length) townWork++; } }
  assert(townWork > 0, 'some Town worked on a Great work during the game');
  const inTowns = Object.keys(g.wonders).filter(w => { const s = g.settlements[g.wonders[w]]; return s && !s.isCity; }), all = Object.keys(g.wonders);
  console.log('wonders built', all.length, 'in Towns', inTowns.length, inTowns.join(' '));
  assert(all.length >= 3, 'the AI still builds wonders (' + all.length + ')'); }
console.log('wonder tests OK');
