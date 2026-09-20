// v2 "Civ-Divergence": Era 4 content — Puffstack Age / "The Sky Turned Grey On Purpose".
(function (AU) {
  var V2 = AU.V2, E = 4, N = [];
  function node(o) { o.era = E; N.push(o); return o; }
  var F = 'foundation', B = 'branched';
  function pair(a, b) { a.pool = B; b.pool = B; a.locks = [b.id]; b.locks = [a.id]; a.pair = b.id; b.pair = a.id; node(a); node(b); }
  // ---- Foundation pool (32): Sustenance 7, Shelter 6, Kinship 7, Craft 6, Wayfinding 6 ----
  node({ id: 'p_coalseam', pool: F, cat: 'Sustenance', name: 'Coal Seam', joke: 'The Ground Was Full Of Rocks That Burn', trigger: { type: 'threshold', cond: ['improvement', 'mine', 6], desc: 'Work 6 Mines' }, fx: { tileBonus: [{ when: 'mine', yields: { production: 2 } }] }, cheap: true });
  node({ id: 'p_ironplow', pool: F, cat: 'Sustenance', name: 'Iron Plow', joke: 'The Plow Got Heavier And So Did Dinner', trigger: { type: 'threshold', cond: ['improvement', 'farm', 6], desc: 'Work 6 Farms' }, fx: { tileBonus: [{ when: 'farm', yields: { food: 1 } }] } });
  node({ id: 'p_publichealth', pool: F, cat: 'Sustenance', name: 'Public Health', joke: 'Doctors Now Wash Their Hands (Mostly)', fx: { smokeSink: 1 }, trigger: { type: 'state', cond: ['event', 'foodSurplus'], turns: 20, desc: 'Positive Food for 20 turns' }, unlocks: { building: 'hospital' } });
  node({ id: 'p_underground', pool: F, cat: 'Sustenance', name: 'Underground Pipes', joke: 'We Put The Poop Somewhere Else', fx: { smokeSink: 1 }, trigger: { type: 'threshold', cond: ['pop', 14], desc: 'Reach 14 population in a settlement' }, unlocks: { building: 'sewer' } });
  node({ id: 'p_icebox', pool: F, cat: 'Sustenance', name: 'Cold Storage', joke: 'Ice, But Organized', trigger: { type: 'discovery', cond: ['improvement', 'plantation|farm', 6], desc: 'Work 6 Plantations or Farms' }, fx: { tileBonus: [{ when: 'plantation', yields: { food: 1 } }] } });
  node({ id: 'p_ranchwire', pool: F, cat: 'Sustenance', name: 'Fenced Ranch', joke: 'The Cows Can No Longer Escape', trigger: { type: 'threshold', cond: ['improvement', 'pasture', 4], desc: 'Work 4 Pastures' }, fx: { tileBonus: [{ when: 'pasture', yields: { food: 1, production: 1 } }] }, cheap: true });
  node({ id: 'p_greenhouse', pool: F, cat: 'Sustenance', name: 'Glass House', joke: 'We Grow Food Under Glass Now, Fancy', trigger: { type: 'state', cond: ['event', 'content'], turns: 20, desc: 'No unhappy settlement for 20 turns' }, fx: { happinessBonus: 1, growthMult: 1.05 } });
  node({ id: 'p_brickwall', pool: F, cat: 'Shelter', name: 'Brick Barracks', joke: 'Bricks Now Instead Of Sticks', trigger: { type: 'threshold', cond: ['military', 10], desc: 'Own 10 military units' }, unlocks: { unit: 'rifleman' } });
  node({ id: 'p_drillyard', pool: F, cat: 'Shelter', name: 'Drill Yard', joke: 'Marching In A Straight Line, On Purpose', trigger: { type: 'state', cond: ['event', 'undamaged'], turns: 30, desc: 'No settlement damaged for 30 turns' }, unlocks: { building: 'military_academy' } });
  node({ id: 'p_hilltop_fort', pool: F, cat: 'Shelter', name: 'Hilltop Redoubt', joke: 'We Put A Fort On The Hill Because Obviously', trigger: { type: 'threshold', cond: ['tiles', 'hills', 10], desc: 'Own 10 Hill tiles' }, fx: { hillsDefense: 4 } });
  node({ id: 'p_bigblock', pool: F, cat: 'Shelter', name: 'Tenement Block', joke: 'Everyone Sleeps In The Same Big Building Now', trigger: { type: 'threshold', cond: ['pop', 15], desc: 'Reach 15 population in a settlement' }, fx: { housingBonus: 2 } });
  node({ id: 'p_riverfort', pool: F, cat: 'Shelter', name: 'River Watch', joke: 'We Watch The River Very Closely', trigger: { type: 'discovery', cond: ['riverTiles', 6], turns: 15, desc: 'Hold 6 worked river tiles for 15 turns' }, fx: { defenseBonus: 3 } });
  node({ id: 'p_streetlamp', pool: F, cat: 'Shelter', name: 'Gas Lamp', joke: 'The Streets Glow At Night Now', trigger: { type: 'threshold', cond: ['building', 'walls', 3], desc: 'Build Walls in 3 settlements' }, fx: { cityDefense: 3 }, cheap: true });
  node({ id: 'p_unionhall', pool: F, cat: 'Kinship', name: 'Union Hall', joke: 'Everyone Agreed To Agree, Eventually', trigger: { type: 'state', cond: ['event', 'content'], turns: 25, desc: 'No unhappy settlement for 25 turns' }, fx: { happinessBonus: 2 } });
  node({ id: 'p_ticker', pool: F, cat: 'Kinship', name: 'Ticker Tape', joke: 'Numbers Now Print Themselves On Paper', trigger: { type: 'threshold', cond: ['gold', 300], desc: 'Hold 300 Gold in treasury' }, unlocks: { building: 'stock_exchange' } });
  node({ id: 'p_wire', pool: F, cat: 'Kinship', name: 'Copper Wire', joke: 'We Sent A Word Really Far, Really Fast', trigger: { type: 'discovery', cond: ['met', 3], turns: 15, desc: 'Know three other empires for 15 turns' }, unlocks: { building: 'telegraph_office' } });
  node({ id: 'p_mayor', pool: F, cat: 'Kinship', name: 'Elected Mayor', joke: 'Somebody Got Voted Into Being In Charge', trigger: { type: 'threshold', cond: ['settlements', 6], desc: 'Found 6 settlements' }, fx: { greatSlot: 'merchant' }, hub: 'p_hub_election' });
  node({ id: 'p_penny_press', pool: F, cat: 'Kinship', name: 'Penny Press', joke: 'The News Costs A Penny Now, Wild', trigger: { type: 'state', cond: ['event', 'cultureSurplus'], turns: 15, desc: 'Positive Heritage for 15 turns' }, fx: { culturePerSettlement: 1 } });
  node({ id: 'p_soupline', pool: F, cat: 'Kinship', name: 'Soup Line', joke: 'Free Soup, No Questions Asked', trigger: { type: 'discovery', cond: ['peaceWith', 3], turns: 15, desc: 'Stay at peace with 3 empires for 15 turns' }, fx: { influencePerTurn: 2 } });
  node({ id: 'p_towncrier', pool: F, cat: 'Kinship', name: 'Town Crier Retires', joke: 'The Crier Finally Got Some Rest', trigger: { type: 'threshold', cond: ['building', 'market', 3], desc: 'Build Markets in 3 settlements' }, fx: { goldPerSettlement: 1 }, cheap: true });
  node({ id: 'p_ironworks', pool: F, cat: 'Craft', name: 'Ironworks', joke: 'We Melt Rocks Into Better Rocks', trigger: { type: 'threshold', cond: ['improvement', 'mine|quarry', 6], desc: 'Work 6 Mines or Quarries' }, unlocks: { building: 'factory' }, hub: 'p_hub_smoke' });
  node({ id: 'p_bigguns', pool: F, cat: 'Craft', name: 'Bigger Guns', joke: 'The Guns Got Bigger, As Guns Do', trigger: { type: 'threshold', cond: ['unitcls', 'ranged', 3], desc: 'Own 3 ranged units' }, unlocks: { unit: 'field_cannon' } });
  node({ id: 'p_assemblyline', pool: F, cat: 'Craft', name: 'Assembly Line', joke: 'Everyone Does One Tiny Job Now', trigger: { type: 'threshold', cond: ['improvedTiles', 30], desc: 'Work 30 improved tiles' }, fx: { capitalYields: { production: 3 } } });
  node({ id: 'p_steamhammer', pool: F, cat: 'Craft', name: 'Steam Hammer', joke: 'The Hammer Hits Itself Now', trigger: { type: 'discovery', cond: ['riverTiles', 6], desc: 'Work 6 river tiles' }, fx: { tileBonus: [{ when: 'river', yields: { production: 1 } }] } });
  node({ id: 'p_patentoffice', pool: F, cat: 'Craft', name: 'Patent Office', joke: 'Somebody Patented The Wheel, Again', trigger: { type: 'threshold', cond: ['unitsBuilt', 10], desc: 'Train 10 units' }, fx: { unitsStartXp: 5, scarecrowLevel: 1 } });
  node({ id: 'p_coalfire', pool: F, cat: 'Craft', name: 'Coal Furnace', joke: 'The Fire Never Goes Out Now, Ever', trigger: { type: 'state', cond: ['event', 'scienceSurplus'], turns: 15, desc: 'Positive Knowledge for 15 turns' }, fx: { smokeGold: 1, yieldMult: { science: 1.15 } } });
  node({ id: 'p_dragoon_corps', pool: F, cat: 'Wayfinding', name: 'Dragoon Corps', joke: 'Horses And Guns, Together At Last', trigger: { type: 'discovery', cond: ['resource', 'horses', 1], desc: 'Own a Horses resource' }, unlocks: { unit: 'cavalry' } });
  node({ id: 'p_ironrail', pool: F, cat: 'Wayfinding', name: 'Iron Rail', joke: "The Cart Doesn't Need A Horse Anymore", trigger: { type: 'threshold', cond: ['improvedTiles', 35], desc: 'Work 35 improved tiles' }, unlocks: { building: 'railway_station' } });
  node({ id: 'p_coalport', pool: F, cat: 'Wayfinding', name: 'Coaling Station', joke: 'Ships Now Eat Rocks For Fuel', trigger: { type: 'threshold', cond: ['coastal', 3], desc: 'Settle 3 coastal settlements' }, fx: { coastalSettlementYields: { production: 2 } } });
  node({ id: 'p_farrail', pool: F, cat: 'Wayfinding', name: 'Far Rail', joke: 'The Train Goes Really Far Now', trigger: { type: 'threshold', cond: ['farSettlement', 12], desc: 'Found a settlement 12+ tiles from the capital' }, fx: { distantProduction: 3 } });
  node({ id: 'p_roadbed', pool: F, cat: 'Wayfinding', name: 'Gravel Roadbed', joke: "The Road Finally Stopped Being Mud", trigger: { type: 'threshold', cond: ['event', 'caravan'], desc: 'Run a trade route' }, fx: { roadMoves: 2, caravanRange: 2 }, cheap: true });
  node({ id: 'p_globe', pool: F, cat: 'Wayfinding', name: 'Globe On A Shelf', joke: 'We Bought A Globe To Look Smart', trigger: { type: 'state', cond: ['exploredContinent', 70], turns: 1, desc: 'Explore 70% of your continent' }, fx: { reconSight: 2 } });
  // ---- Branched pool (18): 6 exclusivity pairs (12) + 6 standalone ----
  pair({ id: 'p_coal_barons', name: 'Coal Barons', joke: 'A Few Guys Own All The Coal Now', trigger: { type: 'threshold', cond: ['improvement', 'mine', 8], desc: 'Work 8 Mines' }, fx: { yieldMult: { production: 1.15 } } },
       { id: 'p_steam_collective', name: 'Steam Collective', joke: 'Everyone Shares The Steam Engine', trigger: { type: 'threshold', cond: ['improvedTiles', 34], desc: 'Work 34 improved tiles' }, fx: { happinessBonus: 2, citySiteYields: { production: 2 } } });
  pair({ id: 'p_railbarons', name: 'Rail Barons', joke: 'The Trains Run On Time (Mostly)', trigger: { type: 'threshold', cond: ['building', 'railway_station', 2], desc: 'Build Railway Stations in 2 settlements' }, fx: { goldPerSettlement: 2 } },
       { id: 'p_canalworks', name: 'Canal Works', joke: 'We Dug A Big Ditch And Water Went In It', trigger: { type: 'threshold', cond: ['riverTiles', 8], desc: 'Work 8 river tiles' }, fx: { tileBonus: [{ when: 'river', yields: { gold: 2 } }] } });
  pair({ id: 'p_standing_army', name: 'Standing Army', joke: 'Soldiers, Now A Full Time Job', trigger: { type: 'threshold', cond: ['military', 12], desc: 'Own 12 military units' }, fx: { unitCostMult: 0.85, freeUpkeep: 3 } },
       { id: 'p_citizen_militia', name: 'Citizen Militia', joke: 'Everyone Keeps A Rifle By The Door', trigger: { type: 'threshold', cond: ['level', 3], desc: 'Have a unit reach level 3' }, fx: { combatBonus: 4, xpMult: 1.4 } });
  pair({ id: 'p_bankers_row', name: "Banker's Row", joke: 'The Bank Has More Doors Than The Church Now', trigger: { type: 'threshold', cond: ['gold', 400], desc: 'Hold 400 Gold in treasury' }, fx: { yieldMult: { gold: 1.15 } } },
       { id: 'p_tariff_wall', name: 'Tariff Wall', joke: 'Foreign Goods Now Cost More, Somehow', trigger: { type: 'state', cond: ['event', 'noTrade'], turns: 12, desc: 'No trade route for 12 turns' }, fx: { homeDefenseBonus: 6, cityDefense: 4 } });
  pair({ id: 'p_slum_grit', name: 'Slum Grit', joke: 'Nobody Is Happy But Everyone Works Hard', trigger: { type: 'threshold', cond: ['totalPop', 40], desc: 'Reach 40 total population' }, fx: { growthMult: 1.15 } },
       { id: 'p_garden_suburb', name: 'Garden Suburb', joke: 'A Tree, On Purpose, In The City', trigger: { type: 'state', cond: ['event', 'foodSurplus'], turns: 15, desc: 'Positive Food for 15 turns' }, fx: { smokeSink: 1, happinessBonus: 3 } });
  pair({ id: 'p_war_correspondent', name: 'War Correspondent', joke: 'A Guy With A Notebook Follows The Army Now', trigger: { type: 'threshold', cond: ['kills', 12], desc: 'Defeat 12 units' }, fx: { culturePerKill: 6 } },
       { id: 'p_propaganda_office', name: 'Propaganda Office', joke: 'The Posters Are Very Convincing', trigger: { type: 'threshold', cond: ['building', 'telegraph_office', 2], desc: 'Build Telegraph Offices in 2 settlements' }, fx: { influencePerTurn: 2, attitudeBonus: 5 } });
  node({ id: 'p_monitor_yard', pool: B, name: 'Monitor Yard', joke: 'We Put Metal On A Boat, It Still Floats', trigger: { type: 'discovery', cond: ['resource', 'coal', 1], desc: 'Own a Coal resource' }, unlocks: { unit: 'ironclad' }, hub: 'p_hub_ironclad' });
  node({ id: 'p_clocktower', pool: B, name: 'Clock Tower', joke: 'Now Everyone Knows Exactly How Late They Are', trigger: { type: 'threshold', cond: ['wonders', 1], desc: 'Own a Wonder' }, unlocks: { wonder: 'big_ben' } });
  node({ id: 'p_arsenal_town', pool: B, name: 'Arsenal Town', joke: 'The Whole Town Just Makes Guns Now', trigger: { type: 'threshold', cond: ['building', 'military_academy', 2], desc: 'Build Military Academies in 2 settlements' }, unlocks: { national: 'grand_arsenal' } });
  node({ id: 'p_vault', pool: B, name: 'The Vault', joke: 'A Room Just For Money, Very Secure', trigger: { type: 'threshold', cond: ['building', 'stock_exchange', 2], desc: 'Build Stock Exchanges in 2 settlements' }, unlocks: { national: 'central_bank' } });
  node({ id: 'p_greenbelt', pool: B, name: 'Green Belt', joke: 'We Left Some Trees Alone On Purpose', fx: { forestSinkMult: 2 }, trigger: { type: 'threshold', cond: ['building', 'monument', 4], desc: 'Build Monuments in 4 settlements' }, unlocks: { national: 'national_park' } });
  node({ id: 'p_smokestack', pool: B, name: 'Tall Smokestack', joke: 'The Smoke Goes Really High Up Now', trigger: { type: 'discovery', cond: ['event', 'combat'], desc: 'Survive a fight' }, fx: { defenseBonus: 3 } });
  N.forEach(function (n) { V2.NODES.push(n); V2.NODE_BY_ID[n.id] = n; });
  // ---- Narrative hubs (5) ----
  var HUBS = [
    { id: 'p_hub_election', name: 'The Mayor Got Elected', when: ['node', 'p_mayor'], branches: [
      { id: 'reform', name: 'Clean Up City Hall', fx: { happinessBonus: 2 } },
      { id: 'machine', name: 'Keep The Machine Running', fx: { goldPerSettlement: 2 } },
      { id: 'promises', name: 'Just Promise Everyone Everything', fx: { attitudeBonus: 10 } }] },
    { id: 'p_hub_smoke', name: 'The Sky Turned Grey (On Purpose, Mostly)', when: ['node', 'p_ironworks'], branches: [
      { id: 'embrace', name: 'Breathe It In, Progress Smells Like This', fx: { yieldMult: { production: 1.15 } } },
      { id: 'scrub', name: "Actually, Let's Scrub The Chimneys", fx: { happinessBonus: 2 } },
      { id: 'move_out', name: 'The Rich Just Move Upwind', fx: { goldPerSettlement: 1, happinessBonus: 1 } }] },
    { id: 'p_hub_ironclad', name: 'The Ironclad Made Waves (Literally)', when: ['node', 'p_monitor_yard'], branches: [
      { id: 'blockade', name: 'Blockade Everyone', fx: { navalBonus: 4 } },
      { id: 'showboat', name: 'Just Sail It Around To Show Off', fx: { influenceOnce: 25 } },
      { id: 'escort', name: 'Use It To Escort Merchant Ships', fx: { caravanRange: 3 } }] },
    { id: 'p_hub_rifles', name: 'So... We Fought With Rifles Now', when: ['event', 'combat'], branches: [
      { id: 'pride', name: "Conqueror's New Uniform", fx: { combatBonus: 3, culturePerKill: 6 } },
      { id: 'weary', name: 'We Are Extremely Tired Of This', fx: { attitudeBonus: 12, warWearinessMult: 0.5 } },
      { id: 'medics', name: 'At Least Send More Medics', fx: { healBonusAll: 3 } }] },
    { id: 'p_hub_papers', name: 'The Newspapers Noticed', when: ['met', 3], branches: [
      { id: 'headline', name: 'Put It On The Front Page', fx: { attitudeBonus: 10 } },
      { id: 'ignore', name: 'We Do Not Comment', fx: { homeDefenseBonus: 5 } },
      { id: 'brag', name: 'We Print Our Own Good News', fx: { culturePerSettlement: 1 } }] }
  ];
  HUBS.forEach(function (h) { V2.HUBS.push(h); V2.HUB_BY_ID[h.id] = h; });
  // ---- Turning Point into the next era ----
  var TP = { name: 'The Glowbit Age Is Coming', branches: [
      { id: 'engineers', name: "The Engineers' Way", fx: { buildingCostMult: 0.9 } },
      { id: 'gunners', name: "The Gunners' Way", fx: { unitCostMult: 0.9, combatBonus: 2 } },
      { id: 'financiers', name: "The Financiers' Way", fx: { goldPerSettlement: 2 } }] };
  TP.id = 'turning:' + E; TP.turning = E; V2.TURNING[E] = TP; V2.HUBS.push(TP); V2.HUB_BY_ID[TP.id] = TP;
  // ---- Unit joke names ----
  Object.assign(V2.UNITS, { field_cannon: { joke: 'Boom Tube' }, cavalry: { joke: 'Horse, But Angrier' }, rifleman: { joke: 'Stick That Goes Bang' }, ironclad: { joke: 'Boat Made Of Metal Rocks' } });
})(globalThis.AU = globalThis.AU || {});
