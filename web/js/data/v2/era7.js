// v2 "Civ-Divergence": Era 6 content — Pixel Age / "Everything Is A Screen Now".
(function (AU) {
  var V2 = AU.V2, E = 6, N = [];
  function node(o) { o.era = E; N.push(o); return o; }
  var F = 'foundation', B = 'branched';
  function pair(a, b) { a.pool = B; b.pool = B; a.locks = [b.id]; b.locks = [a.id]; a.pair = b.id; b.pair = a.id; node(a); node(b); }
  // ---- Foundation pool (32): Sustenance 7, Shelter 6, Kinship 7, Craft 6, Wayfinding 6 ----
  node({ id: 'x_freezer', pool: F, cat: 'Sustenance', name: 'Frozen Food', joke: 'We Froze Food On Purpose', trigger: { type: 'threshold', cond: ['improvement', 'farm', 8], desc: 'Work 8 Farms' }, fx: { tileBonus: [{ when: 'farm', yields: { food: 1 } }] }, cheap: true });
  node({ id: 'x_greenhouse', pool: F, cat: 'Sustenance', name: 'Greenhouse Rows', joke: 'Plants That Never See Weather', trigger: { type: 'threshold', cond: ['improvement', 'plantation', 6], desc: 'Work 6 Plantations' }, fx: { tileBonus: [{ when: 'plantation', yields: { food: 1 } }] } });
  node({ id: 'x_fishfarm', pool: F, cat: 'Sustenance', name: 'Ocean Ranch', joke: 'We Fenced Off Part Of The Ocean', trigger: { type: 'threshold', cond: ['improvement', 'fishing', 5], desc: 'Work 5 sea resources' }, fx: { coastalSettlementYields: { food: 1 } } });
  node({ id: 'x_supermart', pool: F, cat: 'Sustenance', name: 'Supermarket Aisles', joke: 'One Building Has Everything Now', trigger: { type: 'threshold', cond: ['pop', 16], desc: 'Reach 16 population in a settlement' }, fx: { capitalYields: { food: 2 } } });
  node({ id: 'x_fastfood', pool: F, cat: 'Sustenance', name: 'Drive-Thru Window', joke: 'Food Without Leaving The Car', trigger: { type: 'threshold', cond: ['totalPop', 50], desc: 'Reach 50 total population' }, fx: { growthMult: 1.1 } });
  node({ id: 'x_coldchain', pool: F, cat: 'Sustenance', name: 'Cold Chain Logistics', joke: 'Nothing Warms Up Between Here And There', trigger: { type: 'threshold', cond: ['improvedTiles', 40], desc: 'Work 40 improved tiles' }, fx: { capitalYields: { food: 2 } } });
  node({ id: 'x_syntheticfert', pool: F, cat: 'Sustenance', name: 'Synthetic Fertilizer', joke: 'We Made Dirt Better Than Dirt', trigger: { type: 'discovery', cond: ['riverTiles', 6], desc: 'Work 6 river tiles' }, fx: { tileBonus: [{ when: 'river', yields: { food: 1 } }] } });
  node({ id: 'x_highrise', pool: F, cat: 'Shelter', name: 'Sky Boxes', joke: 'We Stacked The Houses This Time', trigger: { type: 'threshold', cond: ['pop', 17], desc: 'Reach 17 population in a settlement' }, fx: { housingBonus: 2 }, cheap: true });
  node({ id: 'x_suburbs', pool: F, cat: 'Shelter', name: 'Suburb Sprawl', joke: 'Every House Looks The Same On Purpose', trigger: { type: 'threshold', cond: ['settlements', 7], desc: 'Found 7 settlements' }, fx: { housingBonus: 1 } });
  node({ id: 'x_aircon', pool: F, cat: 'Shelter', name: 'Air Conditioning', joke: 'We Made The Desert Chilly', trigger: { type: 'discovery', cond: ['adjacent', 'desert', 1], desc: 'Settle next to a desert' }, fx: { happinessBonus: 1 } });
  node({ id: 'x_bunker', pool: F, cat: 'Shelter', name: 'Backyard Bunker', joke: 'Grandpa Was Right, Apparently', trigger: { type: 'state', cond: ['event', 'undamaged'], turns: 20, desc: 'No settlement damaged for 20 turns' }, fx: { homeDefenseBonus: 4 }, unlocks: { unit: 'special_forces' } });
  node({ id: 'x_security', pool: F, cat: 'Shelter', name: 'Security Cameras', joke: 'The Cameras Watch The Cameras Now', trigger: { type: 'state', cond: ['event', 'content'], turns: 20, desc: 'No unhappy settlement for 20 turns' }, fx: { happinessBonus: 1 } });
  node({ id: 'x_smarthome', pool: F, cat: 'Shelter', name: 'Smart Thermostat', joke: 'The House Argues With You About Temperature', trigger: { type: 'threshold', cond: ['improvedTiles', 45], desc: 'Work 45 improved tiles' }, fx: { capitalYields: { gold: 2 } } });
  node({ id: 'x_broadcast', pool: F, cat: 'Kinship', name: 'Broadcast Tower', joke: 'Everyone Watches The Same Show Now', trigger: { type: 'discovery', cond: ['met', 3], desc: 'Know 3 other empires' }, fx: { influencePerTurn: 2 }, cheap: true });
  node({ id: 'x_stadium_node', pool: F, cat: 'Kinship', name: 'Friday Night Lights', joke: 'We Built A Building Just For Yelling', trigger: { type: 'threshold', cond: ['pop', 15], desc: 'Reach 15 population in a settlement' }, fx: { happinessBonus: 1 }, unlocks: { building: 'stadium' }, hub: 'x_hub_friday_lights' });
  node({ id: 'x_datacenter_node', pool: F, cat: 'Kinship', name: 'Server Farm', joke: 'A Warehouse Full Of Warm Boxes', trigger: { type: 'discovery', cond: ['met', 4], desc: 'Know 4 other empires' }, fx: { sciencePerSettlement: 1 }, unlocks: { building: 'data_center' }, hub: 'x_hub_datarush' });
  node({ id: 'x_mallrats', pool: F, cat: 'Kinship', name: 'Mall Culture', joke: 'Teenagers Now Live At The Mall', trigger: { type: 'threshold', cond: ['totalPop', 60], desc: 'Reach 60 total population' }, fx: { goldPerSettlement: 2 } });
  node({ id: 'x_globaltour', pool: F, cat: 'Kinship', name: 'Global Tourism', joke: 'Everyone Wants A Photo Of Our Stuff', trigger: { type: 'threshold', cond: ['explored', 1200], desc: 'Explore 1200 tiles' }, fx: { tourismMult: 1.1 } });
  node({ id: 'x_creditcards', pool: F, cat: 'Kinship', name: 'Plastic Money', joke: 'Money You Cannot See Or Touch', trigger: { type: 'threshold', cond: ['event', 'caravan'], desc: 'Run a trade route' }, fx: { goldPerSettlement: 1 } });
  node({ id: 'x_freecity', pool: F, cat: 'Kinship', name: 'Sister Cities', joke: 'We Are Now Officially Friends On Paper', trigger: { type: 'discovery', cond: ['event', 'peacefulContact'], desc: 'Make peaceful contact with someone' }, fx: { attitudeBonus: 10 } });
  node({ id: 'x_microchip', pool: F, cat: 'Craft', name: 'Microchip Fab', joke: 'We Etched Tiny Lightning Into Sand', trigger: { type: 'threshold', cond: ['improvedTiles', 50], desc: 'Work 50 improved tiles' }, fx: { capitalYields: { production: 3 } }, unlocks: { building: 'computer_center' } });
  node({ id: 'x_atomsplit', pool: F, cat: 'Craft', name: 'Split Atom, Again', joke: 'We Did The Dangerous Thing On Purpose, Carefully', trigger: { type: 'threshold', cond: ['improvement', 'mine', 8], desc: 'Work 8 Mines' }, fx: { capitalYields: { production: 3 } }, unlocks: { building: 'nuclear_plant' } });
  node({ id: 'x_mechline', pool: F, cat: 'Craft', name: 'Assembly Line Redux', joke: 'The Robots Build The Robots Now', trigger: { type: 'threshold', cond: ['military', 12], desc: 'Own 12 military units' }, fx: { unitCostMult: 0.9 }, unlocks: { unit: 'mech_infantry' } });
  node({ id: 'x_heavytread', pool: F, cat: 'Craft', name: 'Heavy Tread Works', joke: 'Bigger Wheels, Fewer Questions', trigger: { type: 'threshold', cond: ['kills', 15], desc: 'Defeat 15 units' }, fx: { combatBonus: 2 }, unlocks: { unit: 'modern_armor' } });
  node({ id: 'x_rocketshop', pool: F, cat: 'Craft', name: 'Rocket Shop', joke: 'Fireworks, But Job-Related', trigger: { type: 'discovery', cond: ['resource', 'oil', 1], desc: 'Own Oil' }, fx: { combatBonus: 2 }, unlocks: { unit: 'rocket_artillery' } });
  node({ id: 'x_roboarm', pool: F, cat: 'Craft', name: 'Robot Arms', joke: 'The Arm Does Not Complain', trigger: { type: 'threshold', cond: ['improvedTiles', 55], desc: 'Work 55 improved tiles' }, fx: { pctUnitProduction: 10 }, cheap: true });
  node({ id: 'x_satellite', pool: F, cat: 'Wayfinding', name: 'Eyes In Orbit', joke: 'Somebody Is Always Watching Now', trigger: { type: 'threshold', cond: ['explored', 1400], desc: 'Explore 1400 tiles' }, fx: { reconSight: 2 }, unlocks: { building: 'spaceport' }, hub: 'x_hub_launch' });
  node({ id: 'x_subpen', pool: F, cat: 'Wayfinding', name: 'Silent Running', joke: 'A Boat That Pretends It Is Not There', trigger: { type: 'discovery', cond: ['coastal', 3], desc: 'Found 3 coastal settlements' }, fx: { navalBonus: 3 }, unlocks: { unit: 'submarine' } });
  node({ id: 'x_airbase', pool: F, cat: 'Wayfinding', name: 'Long Runway', joke: 'Concrete So Long It Has Its Own Weather', trigger: { type: 'threshold', cond: ['military', 14], desc: 'Own 14 military units' }, fx: { combatBonus: 2 }, unlocks: { unit: 'jet_fighter' } });
  node({ id: 'x_heavybomb', pool: F, cat: 'Wayfinding', name: 'Heavy Payload', joke: 'We Made The Sky Heavier', trigger: { type: 'threshold', cond: ['kills', 18], desc: 'Defeat 18 units' }, fx: { combatBonus: 2 }, unlocks: { unit: 'bomber' } });
  node({ id: 'x_highway', pool: F, cat: 'Wayfinding', name: 'Interstate System', joke: 'Roads That Go Absolutely Everywhere', trigger: { type: 'threshold', cond: ['improvedTiles', 58], desc: 'Work 58 improved tiles' }, fx: { roadMoves: 2 } });
  node({ id: 'x_gpsnav', pool: F, cat: 'Wayfinding', name: 'Satellite Navigation', joke: 'A Voice Tells Us Where To Turn Now', trigger: { type: 'discovery', cond: ['event', 'natural'], turns: 15, desc: 'Know a natural wonder for 15 turns' }, fx: { reconMoves: 2 } });
  // ---- Branched pool (18): 6 exclusivity pairs (12) + 6 standalone ----
  pair({ id: 'x_screentime', name: 'Screen Time', joke: 'Screens Everywhere Now', trigger: { type: 'state', cond: ['event', 'scienceSurplus'], turns: 10, desc: 'Positive Knowledge for 10 turns' }, fx: { yieldMult: { science: 1.15 } } },
       { id: 'x_analog', name: 'Analog Holdouts', joke: 'Some Folks Kept Paper Maps', trigger: { type: 'state', cond: ['event', 'cultureSurplus'], turns: 10, desc: 'Positive Heritage for 10 turns' }, fx: { yieldMult: { culture: 1.15 } } });
  pair({ id: 'x_fastlane', name: 'Fast Lane', joke: 'Everything Moves Faster Now', trigger: { type: 'threshold', cond: ['improvedTiles', 50], desc: 'Work 50 improved tiles' }, fx: { roadMoves: 2 } },
       { id: 'x_scenic', name: 'Scenic Route', joke: 'We Took The Long Way On Purpose', trigger: { type: 'discovery', cond: ['coastal', 3], desc: 'Found 3 coastal settlements' }, fx: { navalMoves: 2 } });
  pair({ id: 'x_bigcrowd', name: 'Big Crowd Energy', joke: 'Everyone Showed Up At Once', trigger: { type: 'threshold', cond: ['totalPop', 65], desc: 'Reach 65 total population' }, fx: { happinessBonus: 3 } },
       { id: 'x_quietblock', name: 'Quiet Neighborhood', joke: 'Nobody Here Wants Trouble', trigger: { type: 'state', cond: ['event', 'content'], turns: 15, desc: 'No unhappy settlement for 15 turns' }, fx: { growthMult: 1.15 } });
  pair({ id: 'x_globalchain', name: 'Global Chains', joke: 'The Same Sign On Every Corner', trigger: { type: 'threshold', cond: ['met', 4], desc: 'Know 4 other empires' }, fx: { goldPerSettlement: 2 } },
       { id: 'x_localshop', name: 'Local Shops', joke: 'We Kept It Small On Purpose', trigger: { type: 'threshold', cond: ['settlements', 6], desc: 'Found 6 settlements' }, fx: { capitalMult: { gold: 1.15 } } });
  pair({ id: 'x_armsrace', name: 'Arms Race', joke: 'Whoever Has More Toys Wins, Probably', trigger: { type: 'threshold', cond: ['military', 16], desc: 'Own 16 military units' }, fx: { combatBonus: 3 } },
       { id: 'x_peacedividend', name: 'Peace Dividend', joke: 'We Spent The War Money On Not War', trigger: { type: 'state', cond: ['event', 'peace'], turns: 15, desc: '15 turns without war' }, fx: { buildingCostMult: 0.85 } });
  pair({ id: 'x_eyesinsky', name: 'Eyes In The Sky', joke: 'We Can See Everything Now, Mostly', trigger: { type: 'threshold', cond: ['explored', 900], desc: 'Explore 900 tiles' }, fx: { reconSight: 2 } },
       { id: 'x_bootsground', name: 'Boots On The Ground', joke: 'Somebody Still Has To Walk There', trigger: { type: 'threshold', cond: ['unitsBuilt', 10], desc: 'Train 10 units' }, fx: { unitsStartXp: 8 } });
  node({ id: 'x_hubble_node', pool: B, name: 'Bigger Telescope', joke: 'We Looked Further Than Anyone Asked Us To', trigger: { type: 'threshold', cond: ['explored', 1600], desc: 'Explore 1600 tiles' }, fx: { capitalYields: { science: 2 } }, unlocks: { wonder: 'hubble' } });
  node({ id: 'x_spaceagency_node', pool: B, name: 'National Space Program', joke: 'A Whole Agency Just For Up', trigger: { type: 'threshold', cond: ['building', 'spaceport', 1], desc: 'Build a Spaceport' }, fx: { sciencePerSettlement: 2 }, unlocks: { national: 'space_agency' } });
  node({ id: 'x_gamer', pool: B, name: 'Video Game Arcade', joke: 'Quarters In Exchange For Joy', trigger: { type: 'threshold', cond: ['building', 'stadium', 1], desc: 'Build a Stadium' }, fx: { culturePerSettlement: 1 } });
  node({ id: 'x_callcenter', pool: B, name: 'Global Call Center', joke: 'Someone Somewhere Is Always Answering The Phone', trigger: { type: 'threshold', cond: ['met', 5], desc: 'Know 5 other empires' }, fx: { goldPerSettlement: 2 } });
  node({ id: 'x_ecowarrior', pool: B, name: 'Solar Rooftop', joke: 'The Sun Pays Some Of The Bills Now', trigger: { type: 'state', cond: ['event', 'foodSurplus'], turns: 20, desc: 'Positive Food for 20 turns' }, fx: { yieldMult: { production: 1.1 } } });
  node({ id: 'x_esports', pool: B, name: 'Esports League', joke: 'People Now Watch Other People Play Games', trigger: { type: 'threshold', cond: ['wonders', 1], desc: 'Own a Wonder' }, fx: { happinessBonus: 2, tourismMult: 1.05 } });
  N.forEach(function (n) { V2.NODES.push(n); V2.NODE_BY_ID[n.id] = n; });
  // ---- Narrative hubs (5) ----
  var HUBS = [
    { id: 'x_hub_datarush', name: 'The Data Rush', when: ['node', 'x_datacenter_node'], branches: [
      { id: 'sell_it', name: 'Sell The Data', fx: { goldPerSettlement: 2 } },
      { id: 'protect_it', name: 'Protect The Data', fx: { attitudeBonus: 10 } },
      { id: 'open_it', name: 'Open Source It', fx: { sciencePerSettlement: 2 } }] },
    { id: 'x_hub_launch', name: 'The Launch Countdown', when: ['node', 'x_satellite'], branches: [
      { id: 'watch_skies', name: 'Watch The Skies', fx: { reconSight: 2 } },
      { id: 'build_bigger', name: 'Build It Bigger', fx: { wonderCostMult: 0.85 } },
      { id: 'keep_secret', name: 'Keep It Secret', fx: { homeDefenseBonus: 5 } }] },
    { id: 'x_hub_friday_lights', name: 'Friday Night Lights, For Real', when: ['node', 'x_stadium_node'], branches: [
      { id: 'sell_out', name: 'Sell Out The Season', fx: { goldPerSettlement: 2 } },
      { id: 'keep_cheap', name: 'Keep Tickets Cheap', fx: { happinessBonus: 2 } },
      { id: 'bigger_one', name: 'Build A Bigger One', fx: { culturePerSettlement: 2 } }] },
    { id: 'x_hub_meltdown', name: 'Somebody Left The Reactor Running', when: ['wonders', 2], branches: [
      { id: 'bigger_reactor', name: 'Build A Bigger Reactor', fx: { yieldMult: { production: 1.15 } } },
      { id: 'switch_solar', name: 'Switch To Solar', fx: { happinessBonus: 2 } },
      { id: 'quiet_panic', name: 'Quietly Panic', fx: { warWearinessMult: 0.7 } }] },
    { id: 'x_hub_globalstage', name: "Everyone's Watching Everyone Now", when: ['met', 5], branches: [
      { id: 'play_cameras', name: 'Play To The Cameras', fx: { influencePerTurn: 2 } },
      { id: 'go_dark', name: 'Go Dark', fx: { homeDefenseBonus: 4 } },
      { id: 'be_normal', name: 'Just Be Normal', fx: { attitudeBonus: 10 } }] }
  ];
  HUBS.forEach(function (h) { V2.HUBS.push(h); V2.HUB_BY_ID[h.id] = h; });
  // ---- Turning Point: the finale decision ----
  var TP = { name: 'The Stars Are Coming', branches: [
      { id: 'reach_stars', name: 'Reach For The Stars', fx: { sciencePerSettlement: 2 } },
      { id: 'dig_in', name: 'Dig In And Defend', fx: { defenseBonus: 5 } },
      { id: 'go_quiet', name: 'Go Quiet And Watch', fx: { attitudeBonus: 15 } }] };
  TP.id = 'turning:' + E; TP.turning = E; V2.TURNING[E] = TP; V2.HUBS.push(TP); V2.HUB_BY_ID[TP.id] = TP;
  // ---- Unit joke names ----
  Object.assign(V2.UNITS, {
    mech_infantry: { joke: 'Robo Grunt' },
    rocket_artillery: { joke: 'Boom Truck' },
    submarine: { joke: 'Silent Fish' },
    bomber: { joke: 'Sky Anvil' },
    jet_fighter: { joke: 'Zoom Boy' },
    modern_armor: { joke: 'Big Metal Boi' },
    special_forces: { joke: 'Ghost Squad' }
  });
})(globalThis.AU = globalThis.AU || {});
