// v2 "Civ-Divergence": Era 1 reference content from the design spec (Pebble Age / "Way Too Long Ago").
// A mastery node: { id, name (legible), joke, era, pool: 'foundation'|'branched', cat, trigger: { type: 'threshold'|'state'|'discovery',
//   cond: [condition in the G.condMet vocabulary], turns?: N (state: consecutive turns the condition must hold), desc },
//   fx (civ-wide effects in the existing civFx vocabulary), unlocks: { unit|building|improvement }, locks: [nodeId], hub: hubEventId, cheap: true }
// Effects that need new mechanics carry a plain `note` until the mechanic exists; they are listed in tools/v2-gaps.md.
(function (AU) {
  var V2 = AU.V2 = AU.V2 || {};
  V2.ERAS = [
    { id: 0, name: 'Pebble Age', joke: 'Way Too Long Ago', advance: 20, foundationSize: 32 },
    { id: 1, name: 'Marble Age', joke: 'When Columns Were Cool', advance: 24, foundationSize: 32 }, { id: 2, name: 'Turret Age', joke: 'Everyone Built A Pointy House', advance: 24, foundationSize: 32 },
    { id: 3, name: 'Easel Age', joke: 'Paint Got Expensive', advance: 24, foundationSize: 32 }, { id: 4, name: 'Puffstack Age', joke: 'The Sky Turned Grey On Purpose', advance: 24, foundationSize: 32 },
    { id: 5, name: 'Glowbit Age', joke: 'We Split The Tiny Thing', advance: 24, foundationSize: 32 }, { id: 6, name: 'Pixel Age', joke: 'Everything Is A Screen Now', foundationSize: 32 }
  ];
  var N = [];
  function node(o) { o.era = 0; N.push(o); return o; }
  // ---- Foundation pool (32): Sustenance 7, Shelter 6, Kinship 7, Craft 6, Wayfinding 6 ----
  var F = 'foundation';
  node({ id: 'fire', pool: F, cat: 'Sustenance', name: 'Cookfire', joke: 'We Have Fire, Apparently', trigger: { type: 'threshold', cond: ['feature', 'forest', 6], desc: 'Own 6 Forest tiles' }, fx: { tileBonus: [{ when: 'forest', yields: { food: 1 } }] }, unlocks: { improvement: 'cookfire' } });
  node({ id: 'farming', pool: F, cat: 'Sustenance', name: 'Seed Rows', joke: 'Turns Out Farming Changes Everything', trigger: { type: 'threshold', cond: ['improvement', 'farm', 3], desc: 'Work 3 Farms' }, fx: { tileBonus: [{ when: 'farm', yields: { food: 1 } }] }, hub: 'farming_sequel' });
  node({ id: 'fishing', pool: F, cat: 'Sustenance', name: 'Net Poke', joke: 'We Poked The Water And Fish Came Out', trigger: { type: 'threshold', cond: ['improvement', 'fishing', 2], desc: 'Work 2 sea resources' }, fx: { coastalSettlementYields: { food: 1 } } });
  node({ id: 'berry', pool: F, cat: 'Sustenance', name: 'Berry Luck', joke: 'Somebody Ate A Weird Berry And Lived', trigger: { type: 'discovery', cond: ['improvement', 'plantation|farm', 3], desc: 'Work 3 Plantations or Farms' }, fx: { capitalYields: { food: 1 } } });
  node({ id: 'storage', pool: F, cat: 'Sustenance', name: 'Rock Pantry', joke: 'Big Rock Storage Idea', trigger: { type: 'threshold', cond: ['pop', 7], desc: 'Reach 7 population in a settlement' }, unlocks: { building: 'granary' }, cheap: true });
  node({ id: 'irrigation', pool: F, cat: 'Sustenance', name: 'Dirt Watering', joke: 'Watering The Dirt On Purpose', trigger: { type: 'discovery', cond: ['riverTiles', 3], desc: 'Work 3 river tiles' }, fx: { tileBonus: [{ when: 'river', yields: { food: 1 } }] } });
  node({ id: 'herds_placeholder', pool: F, cat: 'Sustenance', name: 'Goat Path', joke: 'Chase the Goats', trigger: { type: 'threshold', cond: ['improvement', 'pasture', 1], desc: 'Work a Pasture' }, fx: { tileBonus: [{ when: 'pasture', yields: { food: 1 } }] }, note: 'the spec moves Chase the Goats to the Branched pool; this seventh Sustenance node keeps the pool at 7 as the pool counts require' });
  node({ id: 'fence', pool: F, cat: 'Shelter', name: 'First Fence', joke: 'Somebody Built a Fence', trigger: { type: 'state', cond: ['event', 'combat'], desc: 'Survive a fight' }, unlocks: { unit: 'settler' }, cheap: true });
  node({ id: 'roof', pool: F, cat: 'Shelter', name: 'Dry Roof', joke: "Roof That Doesn't Leak", trigger: { type: 'threshold', cond: ['settlements', 2], desc: 'Found a second settlement' }, fx: { housingBonus: 1 }, note: 'housing cap is a new stat' });
  node({ id: 'dig', pool: F, cat: 'Shelter', name: 'Hill Hole', joke: 'We Dug A Hole On Purpose', trigger: { type: 'threshold', cond: ['tiles', 'hills', 7], desc: 'Own 7 Hill tiles' }, fx: { hillsDefense: 3 } });
  node({ id: 'palisade', pool: F, cat: 'Shelter', name: 'Stick Ring', joke: 'Sticks In A Circle Count As A Wall', trigger: { type: 'state', cond: ['event', 'undamaged'], turns: 40, desc: 'No settlement damaged for 40 turns' }, unlocks: { building: 'walls' } });
  node({ id: 'sleepspot', pool: F, cat: 'Shelter', name: 'Big Sleep Spot', joke: 'Everyone Sleeps In The Same Spot Now', trigger: { type: 'threshold', cond: ['pop', 8], desc: 'Reach 8 population in a settlement' }, fx: { housingBonus: 1 } });
  node({ id: 'cave', pool: F, cat: 'Shelter', name: 'Tidy Cave', joke: 'Cave, But Organized', trigger: { type: 'discovery', cond: ['adjacent', 'mountain', 1], turns: 20, desc: 'Hold a settlement next to a mountain for 10 turns' }, fx: { settlementSiteBonus: [{ when: 'mountain', yields: { production: 1 } }] } });
  node({ id: 'grouphug', pool: F, cat: 'Kinship', name: 'Group Hug', joke: 'Group Hug Diplomacy', trigger: { type: 'state', cond: ['event', 'content'], turns: 30, desc: 'No unhappy settlement for 30 turns' }, unlocks: { unit: 'migrant' } });
  node({ id: 'chief', pool: F, cat: 'Kinship', name: 'Big Chief', joke: 'Somebody Has To Be In Charge', trigger: { type: 'threshold', cond: ['military', 4], desc: 'Own 4 military units' }, unlocks: { unit: 'commander' } });
  node({ id: 'rule', pool: F, cat: 'Kinship', name: 'First Rule', joke: 'We Made Up A Rule', trigger: { type: 'state', cond: ['event', 'kinfolkFriend'], turns: 20, desc: 'Stay on good terms with a Free city for 20 turns' }, fx: { hubsEnabled: true } });
  node({ id: 'talking', pool: F, cat: 'Kinship', name: 'Talking Works', joke: 'Turns Out Talking Works Too', trigger: { type: 'discovery', cond: ['met', 2], turns: 10, desc: 'Know two other empires for 10 turns' }, fx: { diplomacyBasic: true }, hub: 'looking_at_us' });
  node({ id: 'elder', pool: F, cat: 'Kinship', name: 'The Elder', joke: 'The Old Lady Knows Things', trigger: { type: 'threshold', cond: ['pop', 9], desc: 'Reach 9 population in a settlement' }, fx: { greatSlot: 'elder' }, hub: 'old_lady' });
  node({ id: 'cookturn', pool: F, cat: 'Kinship', name: 'Cook Rota', joke: "Somebody's Turn To Cook", trigger: { type: 'state', cond: ['event', 'foodSurplus'], turns: 25, desc: 'Positive Food for 25 turns' }, fx: { happinessBonus: 1 } });
  node({ id: 'truce', pool: F, cat: 'Kinship', name: 'Mostly Peace', joke: 'We Agreed Not To Hit Each Other (Mostly)', trigger: { type: 'discovery', cond: ['peaceWith', 2], turns: 15, desc: 'Stay at peace with 2 empires for 15 turns' }, fx: { influencePerTurn: 1 } });
  node({ id: 'shiny', pool: F, cat: 'Craft', name: 'Shiny Rocks', joke: 'We Found Shiny Rocks', trigger: { type: 'threshold', cond: ['improvement', 'mine|quarry', 3], desc: 'Work 3 Mines or Quarries' }, unlocks: { unit: 'slinger' }, cheap: true });
  node({ id: 'point', pool: F, cat: 'Craft', name: 'Pointy Sticks', joke: 'Sticks Now Have a Point', trigger: { type: 'state', cond: ['settlements', 1], turns: 10, desc: 'Hold a settlement for 10 turns' }, unlocks: { unit: 'warrior' }, cheap: true });
  node({ id: 'string', pool: F, cat: 'Craft', name: 'String Theory', joke: 'String Theory (Sort Of)', trigger: { type: 'threshold', cond: ['kills', 3], desc: 'Defeat 3 units' }, unlocks: { unit: 'archer' } });
  node({ id: 'sharper', pool: F, cat: 'Craft', name: 'Sharper Rocks', joke: 'Rocks That Are Sharper Than Other Rocks', trigger: { type: 'threshold', cond: ['improvedTiles', 12], desc: 'Work 12 improved tiles' }, fx: { capitalYields: { production: 2 } } });
  node({ id: 'clay', pool: F, cat: 'Craft', name: 'Clay Thing', joke: 'We Figured Out Clay Does A Thing', trigger: { type: 'discovery', cond: ['riverTiles', 4], desc: 'Work 4 river tiles' }, unlocks: { improvement: 'kiln' } });
  node({ id: 'wheels', pool: F, cat: 'Craft', name: 'Round Things', joke: 'Wheels Are Good, Actually', trigger: { type: 'threshold', cond: ['improvedTiles', 9], desc: 'Work 9 improved tiles (roads come with the cut-over)' }, unlocks: { unit: 'caravan' }, hub: 'market_guy' });
  node({ id: 'boats', pool: F, cat: 'Wayfinding', name: 'Float Idea', joke: 'Turns Out Water Moves Boats', trigger: { type: 'discovery', cond: ['coastal', 1], desc: 'Settle on the coast or a navigable river' }, unlocks: { unit: 'galley' } });
  node({ id: 'farwalk', pool: F, cat: 'Wayfinding', name: 'Long Walk', joke: 'We Walked Really Far', trigger: { type: 'threshold', cond: ['explored', 350], desc: 'Explore 350 tiles' }, fx: { reconSight: 1, reconMoves: 1 } });
  node({ id: 'overhill', pool: F, cat: 'Wayfinding', name: 'Over That Hill', joke: "There's Stuff Over That Hill", trigger: { type: 'discovery', cond: ['event', 'natural'], turns: 15, desc: 'Know a natural wonder for 15 turns' }, fx: { capitalYields: { culture: 2 } } });
  node({ id: 'otherguys', pool: F, cat: 'Wayfinding', name: 'Other Guys', joke: 'We Found The Other Guys', trigger: { type: 'discovery', cond: ['event', 'meetCS'], turns: 20, desc: 'Know a Free city for 20 turns' }, fx: { kinfolkBasic: true } });
  node({ id: 'path', pool: F, cat: 'Wayfinding', name: 'Path Marks', joke: "Marking The Path So We Don't Get Lost", trigger: { type: 'threshold', cond: ['event', 'caravan'], desc: 'Run a trade route' }, fx: { roadMoves: 1 } });
  node({ id: 'map', pool: F, cat: 'Wayfinding', name: 'Bad Map', joke: 'Somebody Drew A Map (Badly)', trigger: { type: 'state', cond: ['exploredContinent', 55], turns: 1, desc: 'Explore 40% of your continent' }, fx: { revealContinent: true } });
  // ---- Branched pool (30): 8 exclusivity pairs (16) + 14 standalone ----
  var B = 'branched';
  function pair(a, b) { a.pool = B; b.pool = B; a.locks = [b.id]; b.locks = [a.id]; a.pair = b.id; b.pair = a.id; node(a); node(b); }
  pair({ id: 'goats', name: 'Goat Chase', joke: 'Chase the Goats', trigger: { type: 'threshold', cond: ['improvement', 'pasture', 2], desc: 'Work 2 Pastures' }, fx: { tileBonus: [{ when: 'pasture', yields: { food: 1, production: 1 } }] } },
       { id: 'wheat', name: 'Dang Wheat', joke: 'Just Grow The Dang Wheat', trigger: { type: 'threshold', cond: ['improvement', 'farm', 4], desc: 'Work 4 Farms' }, fx: { tileBonus: [{ when: 'farm', yields: { food: 1 } }], growthMult: 1.1 } });
  pair({ id: 'cavewall', name: 'Cave Wall', joke: 'Draw It On A Cave Wall', trigger: { type: 'state', cond: ['event', 'cultureSurplus'], turns: 5, desc: 'Positive Heritage for 5 turns' }, fx: { yieldMult: { culture: 1.15 } } },
       { id: 'remember', name: 'Just Remember', joke: 'Just Remember It, Geez', trigger: { type: 'state', cond: ['event', 'scienceSurplus'], turns: 5, desc: 'Positive Knowledge for 5 turns' }, fx: { yieldMult: { science: 1.15 } } });
  pair({ id: 'allspears', name: 'Spears For All', joke: 'Everyone Gets A Spear', trigger: { type: 'threshold', cond: ['military', 4], desc: 'Own 4 military units' }, fx: { unitCostMult: 0.8, freeUpkeep: 2 } },
       { id: 'somespears', name: 'Chosen Spears', joke: 'Only Some Guys Get Spears', trigger: { type: 'threshold', cond: ['level', 2], desc: 'Have a unit reach level 2' }, fx: { combatBonus: 3, xpMult: 1.5 } });
  pair({ id: 'share', name: 'Share All', joke: 'We Share Everything', trigger: { type: 'state', cond: ['event', 'content'], turns: 6, desc: 'No unhappy settlement for 6 turns' }, fx: { happinessBonus: 2 } },
       { id: 'score', name: 'Keep Score', joke: 'We Keep Score', trigger: { type: 'threshold', cond: ['improvedTiles', 6], desc: 'Work 6 improved tiles' }, fx: { citySiteYields: { production: 2 } } });
  pair({ id: 'herds', name: 'Follow Herds', joke: 'Follow The Herds', trigger: { type: 'threshold', cond: ['settlements', 3], desc: 'Found 3 settlements' }, fx: { settlerCostMult: 0.75, homeMoves: 1 } },
       { id: 'stayput', name: 'Stay Put', joke: "Stay Put, It's Fine", trigger: { type: 'threshold', cond: ['pop', 6], desc: 'Reach 6 population in a settlement' }, fx: { capitalMult: { food: 1.15, production: 1.15 } } });
  pair({ id: 'tradeall', name: 'Trade With All', joke: 'Trade With Everyone', trigger: { type: 'threshold', cond: ['met', 2], desc: 'Meet 2 empires' }, fx: { caravanRange: 3, goldPerSettlement: 1 } },
       { id: 'tradenone', name: 'Trust Issues', joke: 'Trade With Nobody, Trust Issues', trigger: { type: 'state', cond: ['event', 'noTrade'], turns: 10, desc: 'No trade route for 10 turns' }, fx: { homeDefenseBonus: 5, cityDefense: 3 } });
  pair({ id: 'loudguy', name: 'Loud Chief', joke: 'The Loud Guy Is In Charge', trigger: { type: 'threshold', cond: ['kills', 2], desc: 'Defeat 2 units' }, fx: { greatSlot: 'general' } },
       { id: 'smartguy', name: 'Smart Chief', joke: 'The Smart Guy Is In Charge', trigger: { type: 'threshold', cond: ['building', 'monument', 2], desc: 'Build 2 Monuments' }, fx: { greatSlot: 'scientist' } });
  pair({ id: 'bigfamily', name: 'Big Family', joke: 'Big Family, Big Problems', trigger: { type: 'threshold', cond: ['totalPop', 8], desc: 'Reach 8 total population' }, fx: { growthMult: 1.2 } },
       { id: 'smallfamily', name: 'Small Family', joke: 'Small Family, Small Problems', trigger: { type: 'state', cond: ['event', 'foodSurplus'], turns: 8, desc: 'Positive Food for 8 turns' }, fx: { yieldPerPop: { production: 0.25 } } });
  node({ id: 'bison', pool: B, name: 'Bison Painting', joke: 'We Painted A Bison (Badly)', trigger: { type: 'state', cond: ['event', 'cultureSurplus'], turns: 5, desc: 'Positive Heritage for 5 turns' }, fx: { capitalYields: { culture: 2 } } });
  node({ id: 'dog', pool: B, name: 'A Dog Now', joke: "Somebody's Dog Now Lives Here", trigger: { type: 'discovery', cond: ['resource', 'cattle|sheep|deer|horses', 1], desc: 'Own an animal resource' }, fx: { settlementSight: 1 } });
  node({ id: 'burial', pool: B, name: 'Rock Burial', joke: 'We Buried Someone With Their Favorite Rock', trigger: { type: 'state', cond: ['event', 'unitLost'], desc: 'Lose a unit in combat' }, fx: { faithPerSettlement: 1 } });
  node({ id: 'floatrocks', pool: B, name: 'Float Test', joke: "Turns Out Some Rocks Float (They Don't, We Checked)", trigger: { type: 'threshold', cond: ['event', 'boatLost'], desc: 'Lose a ship' }, fx: { capitalYields: { gold: 2 } } });
  node({ id: 'kids', pool: B, name: 'Kid Training', joke: 'The Kids Are Getting Good At This', trigger: { type: 'threshold', cond: ['unitsBuilt', 3], desc: 'Train 3 units' }, fx: { unitsStartXp: 5 }, unlocks: { unit: 'scarecrow' } });
  node({ id: 'rockpile', pool: B, name: 'Bigger Rock Pile', joke: 'We Made A Bigger Rock Pile', trigger: { type: 'threshold', cond: ['pop', 8], desc: 'Reach 8 population in a settlement' }, fx: { housingBonus: 1 } });
  node({ id: 'tamed', pool: B, name: 'Tamed Thing', joke: 'Somebody Tamed A Thing', trigger: { type: 'discovery', cond: ['resource', 'horses|cattle', 1], desc: 'Own Horses or Cattle' }, fx: { era2: 'cavalryHead' } });
  node({ id: 'riverguy', pool: B, name: 'River Snacks', joke: 'The River Guy Gets All The Snacks', trigger: { type: 'state', cond: ['riverTiles', 3], desc: 'Work 3 river tiles' }, fx: { tileBonus: [{ when: 'river', yields: { gold: 1 } }] } });
  node({ id: 'storm', pool: B, name: 'Storm Yell', joke: 'We Yelled At A Storm And It Stopped (Coincidence)', trigger: { type: 'discovery', cond: ['event', 'settlementAttacked'], desc: 'Have a settlement survive an attack' }, fx: { happinessBonus: 1 }, note: 'stands in for the disaster trigger until disasters exist' });
  node({ id: 'sheep', pool: B, name: 'Sheep Count', joke: 'Somebody Counted The Sheep Twice', trigger: { type: 'threshold', cond: ['improvedTiles', 5], desc: 'Work 5 improved resource tiles' }, fx: { capitalYields: { gold: 3 } } });
  node({ id: 'game', pool: B, name: 'A Game', joke: 'The Kids Made Up A Game', trigger: { type: 'state', cond: ['event', 'peace'], turns: 10, desc: '10 turns without war' }, fx: { capitalYields: { culture: 1 } }, unlocks: { improvement: 'playfield' } });
  node({ id: 'echo', pool: B, name: 'Echo Cave', joke: 'We Found A Cave With Echoes', trigger: { type: 'discovery', cond: ['adjacent', 'mountain', 1], desc: 'Settle next to a mountain' }, fx: { capitalYields: { science: 2 } } });
  node({ id: 'cousin', pool: B, name: 'A Cousin', joke: "Somebody's Cousin Showed Up", trigger: { type: 'discovery', cond: ['met', 2], desc: 'Meet a second empire or Free city' }, fx: { influenceOnce: 20 } });
  node({ id: 'longwalk', pool: B, name: 'Far Home', joke: 'The Long Walk Paid Off', trigger: { type: 'threshold', cond: ['farSettlement', 8], desc: 'Found a settlement 8+ tiles from the capital' }, fx: { distantProduction: 2 } });
  V2.NODES = N; V2.NODE_BY_ID = {}; N.forEach(function (n) { V2.NODE_BY_ID[n.id] = n; });
  // ---- Narrative hub events (5): each resolves into one permanent trait ----
  V2.HUBS = [
    { id: 'fought', name: 'So... We Fought Someone', when: ['event', 'combat'], branches: [
      { id: 'pride', name: "Conqueror's Pride", fx: { combatBonus: 2, culturePerKill: 5 } },
      { id: 'never_again', name: "We'd Rather Not Do That Again", fx: { attitudeBonus: 10, warWearinessMult: 0.5 } },
      { id: 'accident', name: 'Honestly We Kind Of Won By Accident', fx: { happinessBonus: 1 } }] },
    { id: 'market_guy', name: 'The Market Guy Got Rich', when: ['node', 'wheels'], branches: [
      { id: 'keep_it', name: 'Let Him Keep It', fx: { yieldMult: { gold: 1.15 } } },
      { id: 'share_it', name: 'Actually No, Share It', fx: { happinessBonus: 1, goldPerSettlement: 1 } }] },
    { id: 'farming_sequel', name: 'Turns Out Farming Changes Everything (The Sequel)', when: ['node', 'farming'], branches: [
      { id: 'everyone_farms', name: 'Everyone Farms Now', fx: { growthMult: 1.15 } },
      { id: 'sticks', name: 'Some People Still Just Hit Things With Sticks', fx: { meleeBonus: 2 } }] },
    { id: 'looking_at_us', name: "Everyone's Looking At Us Now", when: ['met', 1], branches: [
      { id: 'wave', name: 'We Wave', fx: { attitudeBonus: 15 } },
      { id: 'hide', name: 'We Hide', fx: { homeDefenseBonus: 4 } },
      { id: 'showoff', name: 'We Show Off Our Pointy Sticks', fx: { unitStrengthFromBarracks: 2, unitsStartXp: 3 } }] },
    { id: 'old_lady', name: 'The Old Lady Was Right', when: ['node', 'elder'], payoff: true, branches: [
      { id: 'elder_trait', name: 'Listen To The Elder', fx: { sciencePerSettlement: 1 }, greatPerson: 'elder' }] }
  ];
  // Turning Points: one per era transition; the choice reframes how the empire enters the next age.
  V2.TURNING = { 0: { name: 'The Marble Age Is Coming', branches: [
      { id: 'builders', name: "The Builders' Way", fx: { buildingCostMult: 0.9 } },
      { id: 'warriors', name: "The Warriors' Way", fx: { unitCostMult: 0.9, combatBonus: 1 } },
      { id: 'traders', name: "The Traders' Way", fx: { goldPerSettlement: 1 } }] } };
  V2.HUB_BY_ID = {}; V2.HUBS.forEach(function (h) { V2.HUB_BY_ID[h.id] = h; });
  for (var te in V2.TURNING) { var th = V2.TURNING[te]; th.id = 'turning:' + te; th.turning = +te; V2.HUBS.push(th); V2.HUB_BY_ID[th.id] = th; }
  // ---- Era 1 unit roster (the legible name is the game's unit name; the joke name shows on unlock) ----
  V2.UNITS = { settler: { joke: 'Homesteader' }, scout: { joke: 'Sniffer' }, migrant: { joke: 'Wanderer', note: 'new unit: joins a settlement for +1 population' }, warrior: { joke: 'Pointy Stick Guy' }, slinger: { joke: 'Rock Chucker' }, archer: { joke: 'Twangbow' }, caravan: { joke: 'Cart Guy' }, galley: { joke: 'Float Guy', note: 'doubles as the trade ship in era 1' }, commander: { joke: 'Big Chief', note: 'new unit: carries up to 3 units as a Warband and buffs them' } };
})(globalThis.AU = globalThis.AU || {});
