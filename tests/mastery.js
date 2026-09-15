// Mastery: a tech finished after its Eureka keeps a bonus; finished without, it does not. Every mastery refers to real ids.
const AU = require('./load.js'); const G = AU.G;
let fails = 0; const check = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } };
for (const t of AU.TECHS) check(!!AU.MASTERY.techs[t.id], 'tech mastery for ' + t.id);
for (const c of AU.CIVICS) check(!!AU.MASTERY.civics[c.id], 'civic mastery for ' + c.id);
const known = new Set(['yieldMult', 'classCostMult', 'buildingDiscount', 'tileBonus', 'buildingBonus', 'classBonus', 'classMoves', 'goldPerSettlement', 'culturePerSettlement', 'faithPerSettlement', 'sciencePerSettlement', 'happinessBonus', 'growthMult', 'cityGrowthMult', 'wonderCostMult', 'settlerCostMult', 'purchaseMult', 'tourismMult', 'greatPeopleMult', 'unitsStartXp', 'healBonusAll', 'navalMoves', 'homeMoves', 'landBonus', 'navalBonus', 'vsSettlements', 'cityDefense', 'combatBonus', 'combatBonusHome', 'buildingCostMult', 'unitCostMult', 'navalCostMult', 'projectCostMult', 'sciencePerPop', 'capitalMult']);
for (const kind of ['techs', 'civics']) for (const id in AU.MASTERY[kind]) { const m = AU.MASTERY[kind][id]; check(m.desc && m.fx, kind + ' ' + id + ' has desc and fx'); for (const k in m.fx) check(known.has(k), kind + ' ' + id + ' uses known key ' + k); if (m.fx.buildingBonus) for (const b in m.fx.buildingBonus) check(!!AU.BUILDINGS[b], id + ' building ' + b); if (m.fx.buildingDiscount) for (const b in m.fx.buildingDiscount) check(!!AU.BUILDINGS[b], id + ' building ' + b); }
const g = G.newGame({ playerCiv: 'rome', mapSize: 'small', difficulty: 'prince', seed: 5, mapType: 'continents', speed: 'standard' });
const p = G.player(g);
const cost0 = G.itemCost(g, p, 'unit', 'archer');
p.boosts = { archery: 1 }; G.learnTech(g, p, 'archery');
check(G.hasMastery(p, 'archery'), 'archery mastery granted after eureka');
const cost1 = G.itemCost(g, p, 'unit', 'archer'); check(cost1 < cost0, 'archers cheaper with mastery: ' + cost0 + ' -> ' + cost1);
G.learnTech(g, p, 'pottery'); check(!G.hasMastery(p, 'pottery'), 'no mastery without eureka');
p.boosts['c:code_of_laws'] = 1; G.learnCivic(g, p, 'code_of_laws'); check(G.hasMastery(p, 'code_of_laws', true), 'civic mastery granted');
check((G.civFx(g, p).culturePerSettlement || 0) >= 1, 'civic mastery effect merged');
if (fails) { console.log(fails, 'failures'); process.exit(1); } console.log('mastery tests OK', cost0, '->', cost1);
