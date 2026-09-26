// v2 "Civ-Divergence": the Divergence wording of abilities that speak of technologies, civics or governments (shown with G.abilityDesc).
(function (AU) {
  var L = {
    meiji: 'Every Spark also adds 20% of a Spark\'s study cost to your Knowledge. Buildings in Cities yield +1 Knowledge each.',
    franklin: 'Libraries and Universities +2 Knowledge. +40 Gold whenever a Spark fires.',
    harun: '+10% Knowledge. Each Wonder yields +3 Knowledge. Your first Library fires a free foundation Spark.',
    louis: '+2 Heritage per settlement. Capital +20% Heritage and Gold. +1 extra Happiness in every settlement.',
    pericles: 'Every Spark also adds 20% of a Spark\'s study cost to your Heritage. Each Wonder yields +2 Knowledge and +2 Heritage.',
    alexander: 'No war weariness. Capturing a settlement adds +60 Knowledge to your studies. Cavalry +4 Strength.',
    frederick: 'Studying Sparks costs 10% less. +10% Knowledge. All units +1 Strength.',
    peter: '+15 Knowledge whenever you decide an Insight and +15 Heritage whenever a Spark fires. Naval units +1 Movement.',
    sejong: 'Studying Sparks costs 10% less. +1 Knowledge per settlement. +20 Heritage whenever a Spark fires.',
    hammurabi: 'Your first Monument fires a free foundation Spark. +2 Heritage per settlement. Settlements +2 defense.',
    ashurbanipal: 'Capturing a settlement adds +60 Knowledge to your studies. Libraries +2 Heritage. +10 Heritage whenever a Spark fires.',
    henry_navigator: 'Scouts see 1 tile farther. +20 Gold whenever a Spark fires. Naval units cost 15% less.',
    dewitt: '+10% Gold. +20 Gold whenever a Spark fires. Naval units cost 15% less.',
    qin: 'Wonders cost 20% less. Every settlement gets free Walls once the Stick Ring Spark fires.',
    trung: 'Units +8 Strength when defending inside your borders. Every settlement gets free Walls once the Stick Ring Spark fires.',
    afonso: 'Your religion spreads 50% faster. Settlements following it yield +1 Knowledge. Every settlement gets a free Shrine once your age allows Shrines.'
  };
  var C = {
    china: 'Studying Sparks costs 10% less. Settlements may expand into a fourth ring of tiles.',
    greece: '+10% Heritage. +1 Happiness per settlement.',
    babylon: 'Studying Sparks costs 15% less, but each settlement yields -1 Knowledge. Worked River tiles +1 Gold.'
  };
  for (var lid in L) if (AU.LEADER_BY_ID[lid]) AU.LEADER_BY_ID[lid].ability.descV2 = L[lid];
  for (var cid in C) if (AU.CIV_BY_ID[cid]) AU.CIV_BY_ID[cid].ability.descV2 = C[cid];

  // ---- Synergy with the new rules (rivers, claims, Smoke, Sparks, Warbands, Command, Synthesis, Climate, Bonds, Reforms) ----
  // `fx` is added to the ability. `v2` is a sentence for the Divergence wording only; `both` is a sentence for both rule sets
  // (Command and unrest exist under both). Divergence-only effects are read only by Divergence code, so the classic text stays true.
  var SYN = {
    leader: {
      cyrus: { fx: { noUnrest: true }, both: 'Captured settlements suffer no unrest and never revolt.' },
      suleiman: { fx: { unrestMult: 0.5 }, both: 'Unrest in captured settlements lasts half as long.' },
      trajan: { fx: { farOrderDiscount: 1 }, both: 'Units far from your settlements cost 1 less Command.' },
      roosevelt: { fx: { commandBonus: 1 }, both: '+1 Command every turn.' },
      genghis: { fx: { commandBonus: 1 }, both: '+1 Command every turn: the Horde moves as one.' },
      pachacuti: { fx: { roadOrders: true }, both: 'Orders to units on your roads cost 1 Command wherever they are.' },
      napoleon: { fx: { commanderMult: 0.1 }, v2: 'A Bandleader makes its Warband 25% stronger instead of 15%.' },
      shaka: { fx: { warbandHeal: 5 }, v2: 'Fighters in a Warband heal +5 every turn.' },
      qin: { fx: { scarecrowLevel: 1 }, v2: 'Scarecrow Crews bait one level higher.' },
      meiji: { fx: { synthCostMult: 0.8 }, v2: 'Synthesis costs 20% less.' },
      peter: { fx: { synthSupplyBonus: 1 }, v2: 'Every Synthesis grants +3 supply instead of +2.' },
      victoria: { fx: { smokeGold: 1 }, v2: '+1 Gold per Smoke in every settlement.' },
      catherine: { fx: { reformsPerAge: 1 }, v2: 'Two Reforms per age.' },
      ashoka: { fx: { insightInfluence: 6 }, v2: '+6 Influence whenever you decide an Insight.' },
      hatshepsut: { fx: { riverClaimInfluence: 1 }, v2: 'Claiming a river tile grants +1 Influence.' },
      lincoln: { fx: { unrestMult: 0.5 }, both: 'Unrest in captured settlements lasts half as long.' },
      // Lane Mastery: leaders of learning get more from a mastered lane (every foundation Spark of one lane lit in its age)
      sejong: { fx: { laneMasteryKnowledge: 60 }, v2: 'Mastering a lane grants +60 Knowledge.' },
      pericles: { fx: { laneMasteryHeritage: 60 }, v2: 'Mastering a lane grants +60 Heritage.' },
      franklin: { fx: { laneMasteryGold: 120 }, v2: 'Mastering a lane grants +120 Gold.' },
      meiji: { fx: { laneMasteryYield: { production: 2 } }, v2: 'Capital +2 Production for every lane mastered.' },
      frederick: { fx: { laneMasteryInfluence: 20 }, v2: 'Mastering a lane grants +20 Influence.' },
      taizong: { fx: { laneMasteryStudyMult: 0.96 }, v2: 'Every lane mastered makes studying Sparks 4% cheaper.' },
      hammurabi: { fx: { laneMasterySpark: true }, v2: 'Mastering a lane also lights the next foundation Spark of the age.' }
    },
    civ: {
      rome: { fx: { roadOrders: true }, both: 'Orders to units on your roads cost 1 Command wherever they are.' },
      persia: { fx: { commandBonus: 1 }, both: '+1 Command every turn.' },
      shawnee: { fx: { farOrderDiscount: 1 }, both: 'Units far from your settlements cost 1 less Command.' },
      china: { fx: { claimCostMult: 0.8 }, v2: 'Claims cost 20% less Influence.' },
      america: { fx: { freeClaims: 1 }, v2: 'Every settlement gets four free claims instead of three.' },
      egypt: { fx: { riverClaimInfluence: 2 }, v2: 'Claiming a river tile grants +2 Influence.' },
      celts: { fx: { forestSinkMult: 1.5 }, v2: 'Your woods soak up 50% more Smoke.' },
      netherlands: { fx: { smokeSink: 1 }, v2: 'Every settlement soaks up 1 Smoke.' },
      germany: { fx: { smokeSourceMult: 0.7 }, v2: 'Your buildings make 30% less Smoke.' },
      russia: { fx: { climateImmune: true }, v2: 'Your tiles never change with the climate.' },
      mongolia: { fx: { warbandMoves: 1 }, v2: 'Fighters in a Warband move one tile farther.' },
      zulu: { fx: { warbandWeights: [1, 0.65, 0.45] }, v2: 'Every Warband member strikes harder: 100/65/45% instead of 100/60/40%.' },
      japan: { fx: { warbandWeights: [1, 0.7, 0.5] }, v2: 'Every Warband member strikes harder: 100/70/50% instead of 100/60/40%.' },
      maya: { fx: { reformsPerAge: 1 }, v2: 'Two Reforms per age.' },
      greece: { fx: { insightInfluence: 8 }, v2: '+8 Influence whenever you decide an Insight.' },
      babylon: { fx: { synthCostMult: 0.85 }, v2: 'Synthesis costs 15% less.' },
      korea: { fx: { studyRefund: 0.2, laneMasteryYield: { science: 3 } }, v2: 'Studying a foundation Spark refunds a fifth of its cost. Capital +3 Knowledge for every lane mastered.' },
      carthage: { fx: { bondUpkeepMult: 0.5, unitPurchaseMult: 0.75 }, both: 'Units bought with Gold cost 25% less: mercenaries.', v2: 'Bonds with free cities cost half the Influence upkeep.' },
      arabia: { fx: { bondUpkeepMult: 0.5 }, v2: 'Bonds with free cities cost half the Influence upkeep.' },
      // the sea peoples, each with a different sea
      portugal: { fx: { tileBonus: [{ when: 'water', yields: { gold: 1 } }] }, both: 'Worked Coast and Ocean tiles yield +1 Gold.' },
      polynesia: { fx: { coastalFoundPop: 1, coastalFoundWater: 2 }, v2: 'Coastal settlements are founded with 2 population and two coast tiles already claimed.' },
      indonesia: { fx: { navalCostMult: 0.7 }, both: 'Naval units cost 30% less.' },
      norway: { fx: { seaOrders: true, navalRaidBonus: 5 }, both: 'Orders to ships and embarked units cost 1 Command wherever they are. Ships striking the shore +5 Strength.' },
      england: { fx: { navalVsSettlements: 6, abroadFreeClaims: 1 }, both: 'Ships +6 Strength against settlements.', v2: 'Settlements on another continent get one more free claim.' }
    }
  };
  function applySyn(ab, r) {
    if (!ab || !r) return; ab.fx = ab.fx || {}; for (var k in r.fx) ab.fx[k] = r.fx[k];
    if (r.both) { ab.desc = ab.desc + ' ' + r.both; if (ab.descV2) ab.descV2 = ab.descV2 + ' ' + r.both; }
    if (r.v2) ab.descV2 = (ab.descV2 || ab.desc) + ' ' + r.v2;
  }
  for (var sl in SYN.leader) if (AU.LEADER_BY_ID[sl]) applySyn(AU.LEADER_BY_ID[sl].ability, SYN.leader[sl]);
  for (var sc in SYN.civ) if (AU.CIV_BY_ID[sc]) applySyn(AU.CIV_BY_ID[sc].ability, SYN.civ[sc]);
  AU.V2_SYNERGY = SYN;
  if (AU.WONDERS.great_library) AU.WONDERS.great_library.descV2 = '+4 Knowledge and a free foundation Spark.';
  if (AU.WONDERS.oracle) AU.WONDERS.oracle.descV2 = '+3 Heritage, +2 Knowledge and a free foundation Spark.';
  if (AU.GREAT_TYPES && AU.GREAT_TYPES.scientist) AU.GREAT_TYPES.scientist.descV2 = 'Fires the next foundation Spark of the age at once.';
  if (AU.UNITS.great_scientist) AU.UNITS.great_scientist.descV2 = 'Fires the next foundation Spark of the age at once. Earned with Great Scientist points (Libraries, Universities).';
})(globalThis.AU = globalThis.AU || {});
