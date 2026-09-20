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
  if (AU.WONDERS.great_library) AU.WONDERS.great_library.descV2 = '+4 Knowledge and a free foundation Spark.';
  if (AU.WONDERS.oracle) AU.WONDERS.oracle.descV2 = '+3 Heritage, +2 Knowledge and a free foundation Spark.';
  if (AU.GREAT_TYPES && AU.GREAT_TYPES.scientist) AU.GREAT_TYPES.scientist.descV2 = 'Fires the next foundation Spark of the age at once.';
  if (AU.UNITS.great_scientist) AU.UNITS.great_scientist.descV2 = 'Fires the next foundation Spark of the age at once. Earned with Great Scientist points (Libraries, Universities).';
})(globalThis.AU = globalThis.AU || {});
