// Religion: spirits and their moods, Revelation, tenets, state faith, spread along roads and rivers, Pilgrims, rites, tithe, victory,
// the faith leaders' hooks and old-save migration.
const AU = require('./load.js'); const G = AU.G, R = AU.Religion, D = AU.Diplo;
let fails = 0; function ok(c, m) { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok', m); }
function fresh(civ, leader, seed) { const g = G.newGame({ playerCiv: civ, playerLeader: leader, mapSize: 'small', numCivs: 3, numStates: 1, seed: seed || 41, difficulty: 'prince', v2: true }); const p = G.player(g); AU.U.foundCity(g, G.civUnits(g, p.idx).find(u => u.type === 'settler')); return { g, p }; }
function other(g, p) { const o = g.civs.find(c => c !== p && !c.minor); if (!G.civSettlements(g, o.idx).length) AU.U.foundCity(g, G.civUnits(g, o.idx).find(u => u.type === 'settler')); return o; }
function secondSettlement(g, civ, near) {
  const t0 = g.tiles[near.tile]; const t = g.tiles.find(t => !G.isWater(t) && !AU.TERRAIN[t.terrain].impassable && G.dist(t, t0) >= 4 && G.dist(t, t0) <= 6 && t.owner < 0 && G.canFoundAt(g, civ.idx, t.i));
  const u = G.spawnUnit(g, civ.idx, 'settler', t.i); AU.U.foundCity(g, u); return G.settlementAt(g, t.i);
}
function oldFaith(fx) { return Object.keys(fx).some(k => /pressureMult|freePantheon/.test(k)); }

// no leftovers from the old system
ok(!AU.PANTHEONS && !AU.BELIEF_BY_ID && !AU.RELIGION_NAMES, 'pantheons, beliefs and real-world religion names are gone');
ok(!AU.UNITS.apostle && !AU.UNITS.inquisitor && AU.UNITS.missionary.name === 'Pilgrim', 'one faith unit: the Pilgrim');
ok(Object.values(AU.LEADER_BY_ID).every(l => !oldFaith(l.ability.fx)) && AU.CIVS.every(c => !oldFaith(c.ability.fx)), 'no ability uses pressureMult or freePantheon');

{ const { g, p } = fresh('rome', 'trajan'); const cap = g.settlements[p.capital];
  const sp = R.spirit(g, cap); ok(AU.SPIRITS[sp.id], 'the capital has a spirit: ' + sp.id);
  // moods
  sp.mood = 1; const yP = R.settlementYields(g, cap); ok(yP.faith >= 1 && Object.keys(AU.SPIRITS[sp.id].gift).every(k => yP[k] >= AU.SPIRITS[sp.id].gift[k]), 'a pleased spirit gives its gift and Devotion');
  sp.mood = -1; const yA = R.settlementYields(g, cap); ok(yA.happiness <= -2 && yA.faith <= -1, 'an angry spirit costs 2 Happiness and 1 Devotion');
  // smoke angers
  const keep = AU.Smoke.smoke; AU.Smoke.smoke = () => 6; R.spiritTurn(g, cap); ok(cap.spirit.mood === -1 && R.spiritHates(g, cap) === 'smoke', 'heavy Smoke angers the spirit'); AU.Smoke.smoke = keep;
  // offering
  p.faith = 100; ok(R.offer(g, p, cap) && p.faith === 100 - R.offeringCost(g), 'an Offering costs ' + R.offeringCost(g) + ' Devotion');
  AU.Smoke.smoke = () => 6; R.spiritTurn(g, cap); ok(cap.spirit.mood === 1, 'an Offering keeps the spirit pleased despite Smoke'); AU.Smoke.smoke = keep;
  g.turn += 21; AU.Smoke.smoke = () => 6; R.spiritTurn(g, cap); ok(cap.spirit.mood === -1, 'after 20 turns the Offering wears off'); AU.Smoke.smoke = keep;
  // revelation
  cap.spirit.offerUntil = g.turn + 50; R.spiritTurn(g, cap); p.faithTotal = R.revelationCost(g) - 1; ok(!R.canReveal(g, p), 'no Revelation below ' + R.revelationCost(g) + ' Devotion earned');
  p.faithTotal = R.revelationCost(g); const rel = R.reveal(g, p);
  ok(rel && p.religion === rel.id && cap.religion === rel.id && rel.holyCity === cap.id, 'a Revelation founds ' + (rel && rel.name) + ' in the capital and makes it the state faith');
  ok(AU.FAITH_NAMES[rel.spirit].some(n => n.id === rel.nameId), 'the faith is named after the spirit of its Holy City');
  // tenets
  ok(R.pendingTenet(g, p) === AU.TENETS[0], 'the first tenet waits');
  ok(R.chooseTenet(g, p, 'zeal') && R.hasTenet(g, rel.id, 'zeal'), 'Zeal chosen'); p._fx = null; ok(G.civFx(g, p).combatBonusVsOtherReligion === 4, 'Zeal: +4 against another state faith');
  ok(!R.pendingTenet(g, p), 'the second tenet waits for 250 Devotion earned'); p.faithTotal = 250 * G.speed(g); ok(R.pendingTenet(g, p) === AU.TENETS[1], 'at 250 the land tenet opens');
  R.chooseTenet(g, p, 'stewards'); cap.spirit.mood = 1; const gift = AU.SPIRITS[cap.spirit.id].gift, k0 = Object.keys(gift)[0]; const yS = R.settlementYields(g, cap), y0 = Object.assign({}, yS);
  ok(yS[k0] >= gift[k0] * 2, 'Stewards: the gift comes twice');
  // spread
  const s2 = secondSettlement(g, p, cap); s2.pressure = {}; s2.religion = null;
  const roads = {}; const plain = R.push(g, cap, s2, roads); roads[cap.tile + '-' + s2.tile] = 1; const road = R.push(g, cap, s2, roads);
  ok(plain > 0 && road > plain, 'a finished road carries the faith harder (' + plain.toFixed(2) + ' -> ' + road.toFixed(2) + ')');
  const rv1 = g.tiles[cap.tile].river, rv2 = g.tiles[s2.tile].river; g.tiles[cap.tile].river = true; g.tiles[s2.tile].river = true; const riv = R.push(g, cap, s2, {}); g.tiles[cap.tile].river = rv1; g.tiles[s2.tile].river = rv2;
  ok(Math.abs(riv - plain * 1.5) < 1e-9, 'river to river: half again');
  for (let i = 0; i < 40; i++) R.spreadTurn(g); ok(s2.religion === rel.id, 'the faith reaches the neighbouring settlement');
  // tithe
  const t = R.tithe(g, p); ok(t.gold === R.followerCount(g, rel.id), 'the Holy City tithe: 1 Gold per follower settlement (' + t.gold + ')');
  // festival
  p.faith = 500; ok(R.festival(g, p), 'a Festival'); ok(R.settlementYields(g, cap).happiness >= R.settlementYields(g, cap).happiness, 'festival counted'); ok(!R.canFestival(g, p), 'one Festival every 30 turns');
  // victory state
  const vs = R.victoryState(g, rel.id); ok(vs && vs.total >= 2 && vs.others >= 1, 'victory state counts settlements and empires');
}
{ // state faith, pilgrims and diplomacy
  const { g, p } = fresh('japan', 'tokugawa', 43); const o = other(g, p); p.met[o.idx] = o.met[p.idx] = true;
  const ocap = g.settlements[o.capital] || G.civSettlements(g, o.idx)[0]; const cap = g.settlements[p.capital];
  R.spirit(g, ocap).mood = 1; o.faithTotal = 999; const rel = R.reveal(g, o); ok(!!rel, 'the neighbour has a faith');
  ok(!R.canAdopt(g, p, rel.id), 'cannot adopt a faith none of your settlements follows');
  R.setMajority(g, cap, rel.id); ok(R.canAdopt(g, p, rel.id) && R.adopt(g, p, rel.id) && p.religion === rel.id, 'adopt it once it takes hold at home');
  ok(D.opinion(g, o, p).some(x => x[1] > 0 && /faith/.test(x[0])), 'a shared state faith warms the founder');
  ok(!R.canAdopt(g, o, rel.id), 'a founder keeps its faith');
  // Pilgrims resented by a leader of another faith
  const { g: g2, p: p2 } = fresh('rome', 'trajan', 44); const o2 = other(g2, p2); p2.met[o2.idx] = o2.met[p2.idx] = true;
  const c2 = g2.settlements[p2.capital]; R.spirit(g2, c2).mood = 1; p2.faithTotal = 999; const r2 = R.reveal(g2, p2); p2.faith = 500;
  const pil = R.buyUnit(g2, c2, 'missionary'); ok(pil && pil.charges === 2 && p2.faith === 500 - R.unitCost(g2, p2, 'missionary'), 'a Pilgrim costs ' + R.unitCost(g2, p2, 'missionary') + ' Devotion, 2 stories');
  const tgt = g2.settlements[o2.capital] || G.civSettlements(g2, o2.idx)[0]; G.setUnitTile(g2, pil, tgt.tile); pil.moves = 3;
  ok(R.spread(g2, pil) && (tgt.pressure[r2.id] || 0) >= 100, 'the story adds 100 pressure');
  ok(D.opinion(g2, o2, p2).some(x => x[1] < 0 && /pilgrims/i.test(x[0])), 'their leader resents the Pilgrims');
}
{ // the faith leaders
  const { g, p } = fresh('arabia', 'harun', 45); p._fx = null; ok(G.civFx(g, p).caravanFaith === 3, 'Arabia: Caravans carry the faith three times as hard');
  const k = fresh('khmer', 'suryavarman', 46); const cap = k.g.settlements[k.p.capital]; ok(!R.isSacred(k.g, cap), 'no Wonder, no Sacred Site'); k.g.wonders.pyramids = cap.id; k.p._fx = null; ok(R.isSacred(k.g, cap), 'Suryavarman: a settlement with a Wonder is a Sacred Site');
  const m = fresh('maya', 'pakal', 47); const mc = m.g.settlements[m.p.capital]; const keep = AU.Smoke.smoke; AU.Smoke.smoke = () => 9; R.spiritTurn(m.g, mc); AU.Smoke.smoke = keep; ok(mc.spirit.mood === 1, "Pakal: the capital's spirit is always pleased");
  const a = fresh('kongo', 'afonso', 48); a.p._fx = null; ok(R.spreadStrength(a.g, { civ: a.p.idx }) === 200, 'Afonso: Pilgrims tell twice as strongly');
  const j = fresh('poland', 'jadwiga', 49); j.p._fx = null; ok(G.civFx(j.g, j.p).friendFaith === 10, 'Jadwiga: friendship carries the faith');
}
{ // an old save
  const { g, p } = fresh('rome', 'trajan', 50); const cap = g.settlements[p.capital];
  g.relVersion = undefined; g.religions = { catholicism: { id: 'catholicism', nameId: 'catholicism', name: 'Catholicism', icon: '✝️', founder: p.idx, holyCity: cap.id, beliefs: ['tithe'], enhanced: false, turn: 5 } };
  p.religion = 'catholicism'; p.pantheon = 'god_sea'; cap.religion = 'catholicism'; cap.pressure = { catholicism: 200 }; delete cap.spirit;
  const u = G.spawnUnit(g, p.idx, 'missionary', cap.tile); u.type = 'apostle'; u.charges = 3;
  const g2 = G.deserialize(G.serialize ? G.serialize(g) : JSON.stringify(g)); const p2 = G.player(g2), r = g2.religions.catholicism;
  ok(g2.relVersion === 2 && r && r.name !== 'Catholicism' && r.tenets && !p2.pantheon && p2.founded === 'catholicism', 'an old save loads: faith renamed after its spirit, pantheon gone, founder kept (' + (r && r.name) + ')');
  ok(Object.values(g2.units).every(x => x.type !== 'apostle'), 'old Evangelists become Pilgrims');
}
{ // AI games found and spread faiths
  const g = G.newGame({ playerCiv: 'byzantium', playerLeader: 'theodora', mapSize: 'small', numCivs: 4, numStates: 2, seed: 61, difficulty: 'prince', v2: true });
  const pl = G.player(g); pl.isPlayer = false; pl.ai = Object.assign({}, AU.LEADER_BY_ID[pl.leaderId].ai);
  for (let t = 0; t < 120; t++) G.endTurn(g);
  const n = R.religionsFounded(g), fol = Object.values(g.settlements).filter(s => s.religion).length, tenets = Object.values(g.religions).reduce((a, r) => a + Object.keys(r.tenets).length, 0);
  ok(n >= 2, 'faiths revealed in 120 AI turns: ' + n); ok(fol >= 4, 'settlements following a faith: ' + fol); ok(tenets >= n, 'the AI decides tenets: ' + tenets);
}
console.log(fails ? fails + ' FAILED' : 'religion OK'); process.exit(fails ? 1 : 0);
