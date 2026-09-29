// Ships strike the shore; the sea peoples each have their own sea; capture Knowledge is halved under Divergence; peaceful AIs still arm.
require('./load.js'); const G = AU.G, U = AU.U, AI = AU.AI;
function assert(c, m) { if (!c) throw new Error(m); }
function fresh(civ, leader, seed) { return G.newGame({ playerCiv: civ, playerLeader: leader, mapSize: 'small', mapType: 'continents', numCivs: 3, numStates: 1, seed: seed || 12, difficulty: 'prince', v2: true }); }
function found(g, p) { return U.foundCity(g, G.civUnits(g, p.idx).filter(u => u.type === 'settler')[0]); }
function shore(g, s) { // a land tile next to water, and the water tile beside it
  for (const t of g.tiles) { if (G.isWater(t) || t.terrain === 'mountain' || t.settlement != null) continue; const w = G.neighbors(g, t).map(i => g.tiles[i]).filter(x => x.terrain === 'coast' && !x.natural)[0]; if (w) return [t, w]; } return null; }
// --- a ship attacks a unit on the shore and cannot capture a settlement ---
{ const g = fresh('norway', 'harald'); const p = G.player(g); const cap = found(g, p); const o = g.civs.filter(c => !c.minor && c.idx !== p.idx)[0]; G.declareWar(g, p.idx, o.idx);
  const [land, water] = shore(g, cap); const ship = G.spawnUnit(g, p.idx, 'galley', water.i); const foe = G.spawnUnit(g, o.idx, 'warrior', land.i); ship.moves = 3; p.command = 99;
  assert(U.canAttackTile(g, ship, land.i), 'a ship may strike a unit on the shore');
  const r = U.attack(g, ship, land.i); assert(r && ship.tile === water.i, 'the ship stays at sea'); assert(foe.hp < 100 || !g.units[foe.id], 'the shore unit took damage');
  const os = G.civSettlements(g, o.idx)[0] || G.foundSettlement(g, o.idx, land.i); if (os.tile !== land.i) { const [l2, w2] = shore(g, os); }
  const sh2 = shore(g, cap); const site = g.tiles.filter(t => !G.isWater(t) && t.terrain !== 'mountain' && t.settlement == null && t.owner < 0 && G.neighbors(g, t).some(i => g.tiles[i].terrain === 'coast') && G.dist(t, g.tiles[cap.tile]) >= 4)[0];
  const town = G.foundSettlement(g, o.idx, site.i); const w3 = G.neighbors(g, site).map(i => g.tiles[i]).filter(x => x.terrain === 'coast')[0]; const ship2 = G.spawnUnit(g, p.idx, 'galley', w3.i); ship2.moves = 3; town.hp = 1; G.unitsAt(g, town.tile).forEach(u => G.removeUnit(g, u));
  assert(U.canAttackTile(g, ship2, town.tile), 'a ship may bombard a coastal settlement'); const r2 = U.attack(g, ship2, town.tile); assert(!r2.captured && town.civ === o.idx && ship2.tile === w3.i && town.hp >= 1, 'a ship levels the walls but never walks in (hp ' + town.hp + ')');
  const str = U.strength(g, ship2, { attacking: true, vs: foe.hp ? foe : { tile: land.i, hp: 100 } }); assert(G.civFx(g, p).navalRaidBonus === 5, 'Norway: ships striking the shore +5');
  const far = g.tiles.filter(t => t.terrain === 'coast' && G.civSettlements(g, p.idx).every(x => G.dist(t, g.tiles[x.tile]) > 10))[0]; if (far) { const ship3 = G.spawnUnit(g, p.idx, 'galley', far.i); assert(G.orderCost(g, ship3) === 1, 'Norway: a far ship costs 1 order (' + G.orderCost(g, ship3) + ')'); }
}
// --- Polynesia: coastal settlements born bigger with their waters claimed; Portugal: Gold on water; Indonesia: cheap ships; England: claims abroad; Carthage: mercenaries ---
{ const g = fresh('polynesia', 'kamehameha'); const p = G.player(g); const site = g.tiles.filter(t => !G.isWater(t) && t.terrain !== 'mountain' && t.settlement == null && G.neighbors(g, t).filter(i => g.tiles[i].terrain === 'coast').length >= 2)[0]; const s = G.foundSettlement(g, p.idx, site.i);
  assert(s.pop === 2, 'Polynesia: coastal settlement founded with 2 pop (' + s.pop + ')'); assert(s.tiles.filter(i => G.isWater(g.tiles[i])).length >= 2, 'Polynesia: two coast tiles claimed');
  const inland = g.tiles.filter(t => !G.isWater(t) && t.terrain !== 'mountain' && t.settlement == null && t.owner < 0 && !G.neighbors(g, t).some(i => G.isWater(g.tiles[i])) && G.dist(t, site) >= 4)[0]; if (inland) { const s2 = G.foundSettlement(g, p.idx, inland.i); assert(s2.pop === 1, 'an inland settlement stays at 1'); } }
{ const g = fresh('portugal', 'joao'); const p = G.player(g); const cap = found(g, p); const w = g.tiles.filter(t => t.terrain === 'coast' && G.dist(t, g.tiles[cap.tile]) <= 2)[0]; if (w) { const y = G.tileYields(g, w, cap); const g0 = fresh('rome', 'caesar'); const p0 = G.player(g0); const c0 = found(g0, p0); const w0 = g0.tiles.filter(t => t.terrain === 'coast' && G.dist(t, g0.tiles[c0.tile]) <= 2)[0]; if (w0) assert(y.gold === G.tileYields(g0, w0, c0).gold + 1, 'Portugal: +1 Gold on coast (' + y.gold + ')'); } }
{ const g = fresh('indonesia', 'gitarja'); const p = G.player(g); assert(G.civFx(g, p).navalCostMult === 0.7, 'Indonesia: ships 30% cheaper, once (' + G.civFx(g, p).navalCostMult + ')'); }
{ const g = fresh('england', 'victoria'); const p = G.player(g); const cap = found(g, p); assert(G.freeClaims(g, cap) === 3, 'England: home claims unchanged'); const other = g.tiles.filter(t => !G.isWater(t) && t.terrain !== 'mountain' && t.settlement == null && t.owner < 0 && t.continent >= 0 && t.continent !== g.tiles[cap.tile].continent)[0]; if (other) { const s = G.foundSettlement(g, p.idx, other.i); assert(G.freeClaims(g, s) === 4, 'England: colonies get a fourth free claim'); } assert(G.civFx(g, p).navalVsSettlements === 6, 'England: ships +6 vs settlements'); }
{ const g = fresh('carthage', 'dido'); const p = G.player(g); const cap = found(g, p); const g0 = fresh('rome', 'caesar'); const p0 = G.player(g0); const c0 = found(g0, p0); assert(G.purchaseCost(g, p, 'unit', 'warrior', cap) < G.purchaseCost(g0, p0, 'unit', 'warrior', c0), 'Carthage: mercenaries cost less'); }
// --- capture Knowledge halved under Divergence ---
{ const g = fresh('assyria', 'tiglath'); const p = G.player(g); found(g, p); const o = g.civs.filter(c => !c.minor && c.idx !== p.idx)[0]; const osite = g.tiles.filter(t => !G.isWater(t) && t.terrain !== 'mountain' && t.settlement == null && t.owner < 0)[6]; const os = G.civSettlements(g, o.idx)[0] || G.foundSettlement(g, o.idx, osite.i); G.declareWar(g, p.idx, o.idx); const u = G.spawnUnit(g, p.idx, 'warrior', os.tile); os.hp = 1; p.bonusScience = 0; U.captureSettlement(g, os, p.idx, u); assert(p.bonusScience === 20, 'Assyria: +20 Knowledge per capture under Divergence (' + p.bonusScience + ')'); }
// --- a peaceful AI arms when a warlord looms ---
{ const g = fresh('korea', 'sejong'); const p = G.player(g); p.ai = Object.assign({}, AU.LEADER_BY_ID[p.leaderId].ai); found(g, p); const o = g.civs.filter(c => !c.minor && c.idx !== p.idx)[0]; p.met[o.idx] = true; const osite2 = g.tiles.filter(t => !G.isWater(t) && t.terrain !== 'mountain' && t.settlement == null && t.owner < 0)[6]; const os = G.civSettlements(g, o.idx)[0] || G.foundSettlement(g, o.idx, osite2.i); for (let i = 0; i < 12; i++) G.spawnUnit(g, o.idx, 'warrior', os.tile); assert(AI.wantsMilitary(g, p), 'Korea wants soldiers with a 12-strong neighbour'); for (let i = 0; i < 7; i++) G.spawnUnit(g, p.idx, 'warrior', G.civSettlements(g, p.idx)[0].tile); assert(!AI.wantsMilitary(g, p), 'and stops at a sensible floor'); }
// --- the hearth guard: a small people defending its land fights harder against a wider empire ---
{ const g = fresh('korea', 'sejong'); const p = G.player(g); const cap = found(g, p); const o = g.civs.filter(c => !c.minor && c.idx !== p.idx)[0]; G.declareWar(g, p.idx, o.idx);
  const sites = g.tiles.filter(t => !G.isWater(t) && t.terrain !== 'mountain' && t.settlement == null && t.owner < 0 && G.dist(t, g.tiles[cap.tile]) > 5); for (let i = 0; i < 4; i++) G.foundSettlement(g, o.idx, sites[i * 7].i);
  const home = g.tiles[cap.tiles.filter(i => i !== cap.tile && !G.isWater(g.tiles[i]))[0] !== undefined ? cap.tiles.filter(i => i !== cap.tile && !G.isWater(g.tiles[i]))[0] : cap.tile]; const d = G.spawnUnit(g, p.idx, 'warrior', home.i); const a = G.spawnUnit(g, o.idx, 'warrior', home.i);
  const base = U.strength(g, d, { attacking: false }), vs = U.strength(g, d, { attacking: false, vs: a }); const gap = G.civSettlements(g, o.idx).length - G.civSettlements(g, p.idx).length;
  assert(vs === base + Math.min(8, 2 * gap), 'hearth guard: +' + Math.min(8, 2 * gap) + ' at home against a wider empire (' + base + ' -> ' + vs + ')');
  assert(G.settlementStrength(g, cap, o.idx) === G.settlementStrength(g, cap) + Math.min(8, 2 * gap), 'walls hold better too');
  const away = sites[30]; G.setUnitTile(g, d, away.i); assert(U.strength(g, d, { attacking: false, vs: a }) === U.strength(g, d, { attacking: false }), 'no hearth guard abroad'); }
// --- sea invasions: the army gathers at the port nearest the target, sails as one wave no bigger than its Command can steer, lands two tiles out ---
{ let g, a, b, capA, capB;
  for (let seed = 1; seed < 60 && !capB; seed++) {
    g = G.newGame({ playerCiv: 'mongolia', playerLeader: 'genghis', mapSize: 'small', mapType: 'archipelago', numCivs: 2, numStates: 0, seed, difficulty: 'prince', v2: true });
    g.civs.forEach(c => { if (c.minor || c.capital != null) return; const u = G.civUnits(g, c.idx).find(u => u.type === 'settler'); if (u) U.foundCity(g, u); });
    [a, b] = g.civs.filter(c => !c.minor); capA = g.settlements[a.capital]; const cb = b && g.settlements[b.capital];
    if (cb && capA && G.isCoastal(g, capA) && G.isCoastal(g, cb) && g.tiles[capA.tile].continent !== g.tiles[cb.tile].continent) capB = cb;
  }
  assert(capB, 'found two coastal capitals on different islands');
  g.civs.forEach(c => { c.met = c.met || {}; g.civs.forEach(o => { c.met[o.idx] = true; }); });
  AU.MasteryWeb.state(a).era = 3; a.era = 3; G.declareWar(g, a.idx, b.idx); a.command = 99;
  const home = G.neighbors(g, g.tiles[capA.tile]).filter(i => !G.isWater(g.tiles[i]) && g.tiles[i].terrain !== 'mountain');
  const inv = AI.planInvasion(g, a);
  assert(inv && inv.port === capA.id, 'the invasion sails from the port nearest the target');
  const land = g.tiles[inv.landing]; assert(land.continent === g.tiles[capB.tile].continent && !G.isWater(land), 'the landing is a beach on the target\'s shore');
  assert(G.dist(land, g.tiles[capB.tile]) >= 2 || !G.neighbors(g, g.tiles[capB.tile]).some(i => G.dist(g.tiles[i], g.tiles[capB.tile]) === 2), 'landing two tiles out, beyond the walls\' reach');
  const s1 = G.spawnUnit(g, a.idx, 'swordsman', capA.tile); AI.moveUnits(g, a);
  assert(!U.isEmbarked(g, s1) && !inv.launched, 'one soldier does not wade in alone: it waits at the port');
  const force = AI.invasionForce(g, a); const band = [s1];
  for (let k = 0; band.length < force + 3; k++) band.push(G.spawnUnit(g, a.idx, 'swordsman', home[k % home.length]));
  g.turn++; band.forEach(u => { u.moves = 2; }); a.command = 99; AI.moveUnits(g, a);
  assert(inv.launched || a.aiInv.launched, 'a full force launches the invasion');
  const afloat = G.civUnits(g, a.idx).filter(u => u.aiInv).length;
  assert(afloat >= 1 && afloat <= force, 'the wave sets out (' + afloat + ' under way) and is no bigger than the Command can steer (' + force + ')');
  g.turn++; band.forEach(u => { if (g.units[u.id]) u.moves = 2; }); a.command = 99; AI.moveUnits(g, a);
  assert(G.civUnits(g, a.idx).filter(u => u.aiInv).length <= force, 'no second wave boards while the first is under way');
  assert(G.civUnits(g, a.idx).some(u => G.settlementAt(g, u.tile) === capA && G.isMilitary(u)), 'the port keeps its guard');
}
console.log('naval tests OK');
