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
      roosevelt: { fx: { commandBonus: 2 }, both: '+2 Command every turn.' },
      genghis: { fx: { commandBonus: 2 }, both: '+2 Command every turn: the Horde moves as one.' },
      pachacuti: { fx: { roadOrders: true }, both: 'Orders to units on your roads cost 1 Command wherever they are.' },
      napoleon: { fx: { warbandSize: 1 }, v2: 'Your Warbands hold four fighters.' },
      shaka: { fx: { warbandSize: 1 }, v2: 'Your Warbands hold four fighters.' },
      qin: { fx: { scarecrowLevel: 1 }, v2: 'Scarecrow Crews bait one level higher.' },
      meiji: { fx: { synthCostMult: 0.7 }, v2: 'Synthesis costs 30% less.' },
      peter: { fx: { synthSupplyBonus: 1 }, v2: 'Every Synthesis grants +3 supply instead of +2.' },
      victoria: { fx: { smokeGold: 1 }, v2: '+1 Gold per Smoke in every settlement.' },
      catherine: { fx: { reformsPerAge: 1 }, v2: 'Two Reforms per age.' },
      ashoka: { fx: { insightInfluence: 10 }, v2: '+10 Influence whenever you decide an Insight.' },
      hatshepsut: { fx: { riverClaimInfluence: 2 }, v2: 'Claiming a river tile grants +2 Influence.' },
      lincoln: { fx: { unrestMult: 0.5 }, both: 'Unrest in captured settlements lasts half as long.' }
    },
    civ: {
      rome: { fx: { roadOrders: true, commandBonus: 1 }, both: 'Orders to units on your roads cost 1 Command wherever they are, and +1 Command every turn.' },
      persia: { fx: { commandBonus: 2 }, both: '+2 Command every turn.' },
      shawnee: { fx: { farOrderDiscount: 1 }, both: 'Units far from your settlements cost 1 less Command.' },
      china: { fx: { claimCostMult: 0.75 }, v2: 'Claims cost 25% less Influence.' },
      america: { fx: { freeClaims: 1 }, v2: 'Every settlement gets four free claims instead of three.' },
      egypt: { fx: { riverClaimInfluence: 3 }, v2: 'Claiming a river tile grants +3 Influence.' },
      celts: { fx: { forestSinkMult: 2 }, v2: 'Your woods soak up twice the Smoke.' },
      netherlands: { fx: { smokeSink: 1 }, v2: 'Every settlement soaks up 1 Smoke.' },
      germany: { fx: { smokeSourceMult: 0.5 }, v2: 'Your buildings make half the Smoke.' },
      russia: { fx: { climateImmune: true }, v2: 'Your tiles never change with the climate.' },
      mongolia: { fx: { warbandSize: 1 }, v2: 'Your Warbands hold four fighters.' },
      zulu: { fx: { warbandWeights: [1, 0.8, 0.6] }, v2: 'Every Warband member strikes harder: 100/80/60% instead of 100/60/40%.' },
      japan: { fx: { warbandWeights: [1, 0.8, 0.6] }, v2: 'Every Warband member strikes harder: 100/80/60% instead of 100/60/40%.' },
      maya: { fx: { reformsPerAge: 1 }, v2: 'Two Reforms per age.' },
      greece: { fx: { insightInfluence: 15 }, v2: '+15 Influence whenever you decide an Insight.' },
      babylon: { fx: { synthCostMult: 0.75 }, v2: 'Synthesis costs 25% less.' },
      korea: { fx: { studyRefund: 0.25 }, v2: 'Studying a foundation Spark refunds a quarter of its cost.' },
      carthage: { fx: { bondUpkeepMult: 0.5 }, v2: 'Bonds with free cities cost half the Influence upkeep.' },
      arabia: { fx: { bondUpkeepMult: 0.5 }, v2: 'Bonds with free cities cost half the Influence upkeep.' }
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
