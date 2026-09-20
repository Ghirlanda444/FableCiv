// v2 "Civ-Divergence": Era 2 content — Turret Age / "Everyone Built A Pointy House".
(function (AU) {
  var V2 = AU.V2, E = 2, N = [];
  function node(o) { o.era = E; N.push(o); return o; }
  var F = 'foundation', B = 'branched';
  function pair(a, b) { a.pool = B; b.pool = B; a.locks = [b.id]; b.locks = [a.id]; a.pair = b.id; b.pair = a.id; node(a); node(b); }
  // ---- Foundation pool (32): Sustenance 7, Shelter 6, Kinship 7, Craft 6, Wayfinding 6 ----
  node({ id: 't_millwheel', pool: F, cat: 'Sustenance', name: 'Water Mill', joke: 'The River Does The Grinding Now', trigger: { type: 'threshold', cond: ['riverTiles', 4], desc: 'Work 4 river tiles' }, fx: { tileBonus: [{ when: 'river', yields: { food: 1 } }] } });
  node({ id: 't_threefield', pool: F, cat: 'Sustenance', name: 'Three-Field Rotation', joke: "We Stopped Planting The Same Dang Field", trigger: { type: 'threshold', cond: ['improvement', 'farm', 5], desc: 'Work 5 Farms' }, fx: { tileBonus: [{ when: 'farm', yields: { food: 1 } }] }, cheap: true });
  node({ id: 't_fishpond', pool: F, cat: 'Sustenance', name: 'Monastery Fishpond', joke: 'Monks Really Like Fish, Turns Out', trigger: { type: 'threshold', cond: ['improvement', 'fishing', 3], desc: 'Work 3 sea resources' }, fx: { coastalSettlementYields: { food: 1 } } });
  node({ id: 't_orchard', pool: F, cat: 'Sustenance', name: 'Walled Orchard', joke: 'Apples Behind A Wall, Very Serious', trigger: { type: 'threshold', cond: ['improvement', 'plantation', 4], desc: 'Work 4 Plantations' }, fx: { tileBonus: [{ when: 'plantation', yields: { food: 1 } }] } });
  node({ id: 't_tithebarn', pool: F, cat: 'Sustenance', name: 'Tithe Barn', joke: 'Everyone Owes The Church A Tenth Of Everything', trigger: { type: 'threshold', cond: ['pop', 10], desc: 'Reach 10 population in a settlement' }, fx: { growthMult: 1.1 }, cheap: true });
  node({ id: 't_beeswax', pool: F, cat: 'Sustenance', name: 'Monastery Apiary', joke: 'Monks Now Run A Honey Operation', trigger: { type: 'threshold', cond: ['improvement', 'pasture', 3], desc: 'Work 3 Pastures' }, fx: { tileBonus: [{ when: 'pasture', yields: { food: 1 } }] } });
  node({ id: 't_leanyears', pool: F, cat: 'Sustenance', name: 'Lean Years', joke: "We Remember The Lean Years (Mostly Fondly)", trigger: { type: 'state', cond: ['event', 'foodSurplus'], turns: 20, desc: 'Positive Food for 20 turns' }, fx: { happinessBonus: 1 } });
  node({ id: 't_motte', pool: F, cat: 'Shelter', name: 'Motte And Bailey', joke: 'A Hill With Extra Steps', trigger: { type: 'threshold', cond: ['tiles', 'hills', 8], desc: 'Own 8 Hill tiles' }, fx: { hillsDefense: 4 } });
  node({ id: 't_stonewall', pool: F, cat: 'Shelter', name: 'Stone Curtain Wall', joke: 'Sticks In A Circle Was A Phase', trigger: { type: 'state', cond: ['event', 'undamaged'], turns: 30, desc: 'No settlement damaged for 30 turns' }, unlocks: { building: 'castle' } });
  node({ id: 't_pikewall', pool: F, cat: 'Shelter', name: 'Pike Wall', joke: 'Extra Pointy Sticks, Now In A Wall', trigger: { type: 'threshold', cond: ['military', 6], desc: 'Own 6 military units' }, unlocks: { unit: 'pikeman' } });
  node({ id: 't_moat', pool: F, cat: 'Shelter', name: 'The Moat', joke: 'A Ditch, But Make It Intimidating', trigger: { type: 'threshold', cond: ['pop', 11], desc: 'Reach 11 population in a settlement' }, fx: { housingBonus: 1 } });
  node({ id: 't_garrison', pool: F, cat: 'Shelter', name: 'Standing Garrison', joke: 'Some Guys Just Live At The Wall Now', trigger: { type: 'threshold', cond: ['settlements', 4], desc: 'Found 4 settlements' }, fx: { freeUpkeep: 2 }, cheap: true });
  node({ id: 't_keep', pool: F, cat: 'Shelter', name: 'The Keep', joke: 'The Tall Part Where Everyone Hides', trigger: { type: 'discovery', cond: ['event', 'combat'], desc: 'Survive a fight' }, fx: { cityDefense: 3 } });
  node({ id: 't_parish', pool: F, cat: 'Kinship', name: 'Parish Bells', joke: 'The Bells Ring, Everyone Shows Up', trigger: { type: 'state', cond: ['event', 'content'], turns: 25, desc: 'No unhappy settlement for 25 turns' }, fx: { happinessBonus: 1 } });
  node({ id: 't_guildhall', pool: F, cat: 'Kinship', name: 'Guildhall', joke: 'Now Everyone Needs A License', trigger: { type: 'threshold', cond: ['building', 'market', 2], desc: 'Build 2 Markets' }, fx: { goldPerSettlement: 1 } });
  node({ id: 't_university', pool: F, cat: 'Kinship', name: 'University Charter', joke: 'A Building Where Arguing Is The Whole Point', trigger: { type: 'threshold', cond: ['building', 'library', 2], desc: 'Build 2 Libraries' }, unlocks: { building: 'university' } });
  node({ id: 't_pilgrimage', pool: F, cat: 'Kinship', name: 'The Pilgrimage', joke: 'Everyone Walks Somewhere Holy Once', trigger: { type: 'discovery', cond: ['event', 'peacefulContact'], desc: 'Make peaceful contact with another empire' }, fx: { influencePerTurn: 1 } });
  node({ id: 't_monastery', pool: F, cat: 'Kinship', name: 'The Monastery', joke: 'Guys In Robes Copying Books All Day', trigger: { type: 'threshold', cond: ['improvedTiles', 15], desc: 'Work 15 improved tiles' }, fx: { sciencePerSettlement: 1 }, hub: 't_hub_monks' });
  node({ id: 't_feast', pool: F, cat: 'Kinship', name: 'Harvest Feast', joke: 'One Good Meal Fixes Most Problems', trigger: { type: 'state', cond: ['event', 'foodSurplus'], turns: 15, desc: 'Positive Food for 15 turns' }, fx: { happinessBonus: 1 }, cheap: true });
  node({ id: 't_charter', pool: F, cat: 'Kinship', name: 'Town Charter', joke: 'Now It Says So On Paper', trigger: { type: 'threshold', cond: ['settlements', 5], desc: 'Found 5 settlements' }, fx: { civicCostMult: 0.9 } });
  node({ id: 't_workshop', pool: F, cat: 'Craft', name: "Craftsmen's Workshop", joke: 'Sharp Things Made By Committee', trigger: { type: 'threshold', cond: ['improvement', 'mine|quarry', 4], desc: 'Work 4 Mines or Quarries' }, unlocks: { building: 'workshop' } });
  node({ id: 't_crossbow', pool: F, cat: 'Craft', name: 'The Crossbow', joke: 'Click-Clack, Very Rude', trigger: { type: 'threshold', cond: ['kills', 5], desc: 'Defeat 5 units' }, unlocks: { unit: 'crossbowman' } });
  node({ id: 't_forge', pool: F, cat: 'Craft', name: "Blacksmith's Forge", joke: 'Everything Is Slightly On Fire, In A Good Way', trigger: { type: 'threshold', cond: ['improvedTiles', 18], desc: 'Work 18 improved tiles' }, fx: { capitalYields: { production: 2 } } });
  node({ id: 't_stonemason', pool: F, cat: 'Craft', name: "Stonemason's Guild", joke: 'They Charge By The Pointy Bit', trigger: { type: 'threshold', cond: ['improvement', 'quarry', 3], desc: 'Work 3 Quarries' }, fx: { buildingCostMult: 0.95 }, cheap: true });
  node({ id: 't_tannery', pool: F, cat: 'Craft', name: "Tanner's Yard", joke: 'Smells Terrible, Works Great', trigger: { type: 'threshold', cond: ['resourcekind', 'strategic', 1], desc: 'Own a strategic resource' }, fx: { unitCostMult: 0.9 } });
  node({ id: 't_siegecraft', pool: F, cat: 'Craft', name: 'Siege Engineers', joke: 'They Build Things Whose Only Job Is Knocking Down Other Things', trigger: { type: 'threshold', cond: ['military', 7], desc: 'Own 7 military units' }, fx: { combatBonus: 2 } });
  node({ id: 't_knight', pool: F, cat: 'Wayfinding', name: 'Mounted Knight', joke: 'A Guy In A Metal Suit On A Horse', trigger: { type: 'discovery', cond: ['resource', 'horses', 1], desc: 'Own Horses' }, unlocks: { unit: 'knight' } });
  node({ id: 't_pilgrimroad', pool: F, cat: 'Wayfinding', name: 'Pilgrim Road', joke: 'Well-Worn By Knees And Feet', trigger: { type: 'threshold', cond: ['explored', 500], desc: 'Explore 500 tiles' }, fx: { roadMoves: 1 } });
  node({ id: 't_causeway', pool: F, cat: 'Wayfinding', name: 'The Causeway', joke: 'A Road That Refuses To Sink', trigger: { type: 'threshold', cond: ['coastal', 2], desc: 'Hold 2 coastal settlements' }, fx: { navalMoves: 1 } });
  node({ id: 't_cartographers', pool: F, cat: 'Wayfinding', name: "Cartographers' Guild", joke: 'The Map Is Only Slightly Wrong Now', trigger: { type: 'state', cond: ['exploredContinent', 60], turns: 1, desc: 'Explore 60% of your continent' }, fx: { reconSight: 1 } });
  node({ id: 't_tradefair', pool: F, cat: 'Wayfinding', name: 'The Great Trade Fair', joke: 'Everyone Brings Their Best Stuff Once A Year', trigger: { type: 'state', cond: ['event', 'caravan'], turns: 10, desc: 'Run a trade route for 10 turns' }, fx: { caravanRange: 2 } });
  node({ id: 't_scoutriders', pool: F, cat: 'Wayfinding', name: 'Scout Riders', joke: 'They Ride Ahead So We Do Not Get Surprised', trigger: { type: 'threshold', cond: ['met', 3], desc: 'Know 3 other empires' }, fx: { reconSight: 1, reconMoves: 1 } });
  // ---- Branched pool (18): 6 exclusivity pairs (12) + 6 standalone ----
  pair({ id: 't_guildrules', name: 'Guild Rules', joke: "The Guild Says How It's Done", trigger: { type: 'threshold', cond: ['building', 'market', 3], desc: 'Build 3 Markets' }, fx: { buildingCostMult: 0.9 } },
       { id: 't_freemarket', name: 'Open Stalls', joke: 'Anyone Can Sell Anything, Apparently', trigger: { type: 'threshold', cond: ['gold', 200], desc: 'Hold 200 Gold in the treasury' }, fx: { goldPerSettlement: 2 } });
  pair({ id: 't_archerydrill', name: 'Archery Drill', joke: 'Every Sunday, Shoot At A Target', trigger: { type: 'threshold', cond: ['unitcls', 'ranged', 3], desc: 'Own 3 ranged units' }, fx: { combatBonus: 2 } },
       { id: 't_swordguild', name: 'Blade Guild', joke: 'Everyone Learns The Sword', trigger: { type: 'threshold', cond: ['unitcls', 'melee', 2], desc: 'Own 2 melee units' }, fx: { meleeBonus: 3 } });
  pair({ id: 't_monastic', name: 'Monastic Rule', joke: 'The Monks Run Things Now', trigger: { type: 'state', cond: ['event', 'scienceSurplus'], turns: 15, desc: 'Positive Knowledge for 15 turns' }, fx: { yieldMult: { science: 1.15 } } },
       { id: 't_secular', name: 'Secular Court', joke: 'The Monks Can Keep Their Books', trigger: { type: 'state', cond: ['event', 'cultureSurplus'], turns: 15, desc: 'Positive Heritage for 15 turns' }, fx: { yieldMult: { culture: 1.15 } } });
  pair({ id: 't_chivalry', name: 'Chivalric Order', joke: 'Everyone Wants A Horse Now', trigger: { type: 'threshold', cond: ['unitcls', 'cavalry', 2], desc: 'Own 2 cavalry units' }, fx: { cavalryBonus: 3 } },
       { id: 't_shieldwall', name: 'Shield Wall', joke: 'Just Stand Really Close Together', trigger: { type: 'threshold', cond: ['unitcls', 'antcav', 2], desc: 'Own 2 anti-cavalry units' }, fx: { defenseBonus: 3 } });
  pair({ id: 't_roadtolls', name: 'Road Tolls', joke: 'Pay The Guy At The Bridge', trigger: { type: 'threshold', cond: ['improvedTiles', 10], desc: 'Work 10 improved tiles' }, fx: { goldPerSettlement: 1 } },
       { id: 't_churchtithe', name: 'Church Tithe', joke: 'Ten Percent, No Exceptions', trigger: { type: 'threshold', cond: ['pop', 8], desc: 'Reach 8 population in a settlement' }, fx: { faithPerSettlement: 1 } });
  pair({ id: 't_quarantine', name: 'Quarantine Gate', joke: 'Nobody In, Nobody Out (Mostly)', trigger: { type: 'discovery', cond: ['event', 'settlementAttacked'], desc: 'Have a settlement survive an attack' }, fx: { healBonusAll: 2 } },
       { id: 't_plaguedoctor', name: 'The Beak Mask Guy', joke: 'He Shows Up, Nobody Knows Why It Helps', trigger: { type: 'discovery', cond: ['event', 'unitLost'], desc: 'Lose a unit in combat' }, fx: { happinessBonus: 1 } });
  node({ id: 't_cathedral', pool: B, name: 'Cathedral Bells', joke: 'You Can Hear Them From Three Valleys Over', trigger: { type: 'state', cond: ['event', 'content'], turns: 20, desc: 'No unhappy settlement for 20 turns' }, fx: { happinessBonus: 2 } });
  node({ id: 't_stainedglass', pool: B, name: 'Stained Glass', joke: 'Colored Light, Extremely Serious Business', trigger: { type: 'discovery', cond: ['event', 'natural'], desc: 'Know a natural wonder' }, fx: { capitalYields: { culture: 3 } } });
  node({ id: 't_tourney', pool: B, name: 'The Tourney', joke: 'Falling Off A Horse, Competitively', trigger: { type: 'discovery', cond: ['event', 'combat'], desc: 'Survive a fight' }, fx: { xpMult: 1.2 } });
  node({ id: 't_alhambra_node', pool: B, name: 'Hillside Fortress', joke: 'Fancy, But It Can Also Take A Hit', trigger: { type: 'threshold', cond: ['tiles', 'hills', 10], desc: 'Own 10 Hill tiles' }, unlocks: { wonder: 'alhambra' }, hub: 't_hub_castle' });
  node({ id: 't_notredame_node', pool: B, name: 'The Grand Cathedral', joke: 'Took Longer Than Anyone Alive When It Started', trigger: { type: 'threshold', cond: ['wonders', 1], desc: 'Own a wonder' }, unlocks: { wonder: 'notre_dame' } });
  node({ id: 't_royallibrary_node', pool: B, name: 'The Royal Library', joke: 'Every Book, Chained To A Desk So Nobody Steals Them', trigger: { type: 'threshold', cond: ['building', 'library', 4], desc: 'Build 4 Libraries' }, unlocks: { national: 'royal_library' }, hub: 't_hub_scholars' });
  N.forEach(function (n) { V2.NODES.push(n); V2.NODE_BY_ID[n.id] = n; });
  // ---- Narrative hubs (5) ----
  var HUBS = [
    { id: 't_hub_monks', name: 'The Monks Want A Say', when: ['node', 't_monastery'], branches: [
      { id: 'keep_quiet', name: 'Let Them Pray In Peace', fx: { faithPerSettlement: 1 } },
      { id: 'speak_up', name: 'Let Them Speak At Court', fx: { influencePerTurn: 1 } },
      { id: 'ignore_them', name: 'Politely Ignore Them', fx: { happinessBonus: 1 } }] },
    { id: 't_hub_castle', name: 'Who Actually Gets The Castle', when: ['node', 't_alhambra_node'], branches: [
      { id: 'the_king', name: 'The King Does', fx: { cityDefense: 3 } },
      { id: 'the_lords', name: 'The Local Lords Do', fx: { goldPerSettlement: 1 } },
      { id: 'the_people', name: 'Technically, Everyone', fx: { happinessBonus: 1 } }] },
    { id: 't_hub_scholars', name: 'The Scholars Argue About Priorities', when: ['node', 't_royallibrary_node'], branches: [
      { id: 'chase_science', name: 'Chase Knowledge', fx: { yieldMult: { science: 1.15 } } },
      { id: 'chase_culture', name: 'Chase Heritage', fx: { yieldMult: { culture: 1.15 } } },
      { id: 'chase_gold', name: 'Chase Funding', fx: { yieldMult: { gold: 1.1 } } }] },
    { id: 't_hub_siege', name: 'So... We Laid Siege', when: ['event', 'combat'], branches: [
      { id: 'mercy', name: 'Offer Mercy', fx: { attitudeBonus: 10 } },
      { id: 'no_mercy', name: 'Offer No Mercy', fx: { combatBonus: 2, culturePerKill: 3 } },
      { id: 'shrug', name: 'Honestly We Just Wanted The Bridge', fx: { happinessBonus: 1 } }] },
    { id: 't_hub_relic', name: 'Everyone Wants What We Built', when: ['wonders', 1], branches: [
      { id: 'share_plans', name: 'Share The Blueprints', fx: { influenceOnce: 20 } },
      { id: 'guard_secrets', name: 'Guard The Secrets', fx: { defenseBonus: 2 } },
      { id: 'sell_tickets', name: 'Sell Tickets, Basically', fx: { goldPerWonder: 2 } }] }
  ];
  HUBS.forEach(function (h) { V2.HUBS.push(h); V2.HUB_BY_ID[h.id] = h; });
  // ---- Turning Point into the next era ----
  var TP = { name: 'The Easel Age Is Coming', branches: [
      { id: 'masons', name: "The Masons' Way", fx: { buildingCostMult: 0.9 } },
      { id: 'knights_way', name: "The Knights' Way", fx: { unitCostMult: 0.9, combatBonus: 1 } },
      { id: 'merchants', name: "The Merchants' Way", fx: { goldPerSettlement: 1 } }] };
  TP.id = 'turning:' + E; TP.turning = E; V2.TURNING[E] = TP; V2.HUBS.push(TP); V2.HUB_BY_ID[TP.id] = TP;
  // ---- Unit joke names ----
  Object.assign(V2.UNITS, { crossbowman: { joke: 'Click-Clack Guy' }, pikeman: { joke: 'Extra Pointy Stick Guy' }, knight: { joke: 'Guy In A Metal Suit' } });
})(globalThis.AU = globalThis.AU || {});
