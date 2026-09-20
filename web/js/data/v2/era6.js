// v2 "Civ-Divergence": Era 5 content — Glowbit Age / "We Split The Tiny Thing".
(function (AU) {
  var V2 = AU.V2, E = 5, N = [];
  function node(o) { o.era = E; N.push(o); return o; }
  var F = 'foundation', B = 'branched';
  function pair(a, b) { a.pool = B; b.pool = B; a.locks = [b.id]; b.locks = [a.id]; a.pair = b.id; b.pair = a.id; node(a); node(b); }
  // ---- Foundation pool (32): Sustenance 7, Shelter 6, Kinship 7, Craft 6, Wayfinding 6 ----
  node({ id: 'g_fertilizer', pool: F, cat: 'Sustenance', name: 'Bagged Nitrogen', joke: 'We Bagged The Air, Basically', trigger: { type: 'threshold', cond: ['improvement', 'farm', 12], desc: 'Work 12 Farms' }, fx: { tileBonus: [{ when: 'farm', yields: { food: 2 } }] } });
  node({ id: 'g_coldbox', pool: F, cat: 'Sustenance', name: 'Cold Box', joke: 'A Box That Stays Cold On Purpose', trigger: { type: 'threshold', cond: ['pop', 16], desc: 'Reach 16 population in a settlement' }, fx: { housingBonus: 2 }, cheap: true });
  node({ id: 'g_greenhouse', pool: F, cat: 'Sustenance', name: 'Glass Farm', joke: 'A Farm Inside A Window', trigger: { type: 'threshold', cond: ['improvement', 'plantation', 8], desc: 'Work 8 Plantations' }, fx: { tileBonus: [{ when: 'plantation', yields: { food: 1, gold: 1 } }] } });
  node({ id: 'g_cannery', pool: F, cat: 'Sustenance', name: 'Tin Can Trick', joke: 'Food That Lasts Forever Now, Apparently', trigger: { type: 'threshold', cond: ['building', 'granary', 4], desc: 'Build 4 Granaries' }, fx: { growthMult: 1.1 }, cheap: true });
  node({ id: 'g_tractor', pool: F, cat: 'Sustenance', name: 'Metal Ox', joke: 'The Metal Ox Never Gets Tired', trigger: { type: 'threshold', cond: ['improvedTiles', 60], desc: 'Work 60 improved tiles' }, fx: { tileBonus: [{ when: 'farm', yields: { production: 1 } }] } });
  node({ id: 'g_vitamins', pool: F, cat: 'Sustenance', name: 'Little Pills', joke: 'Little Pills That Are Secretly Vegetables', trigger: { type: 'state', cond: ['event', 'foodSurplus'], turns: 28, desc: 'Positive Food for 28 turns' }, fx: { happinessBonus: 1, growthMult: 1.05 } });
  node({ id: 'g_freezer', pool: F, cat: 'Sustenance', name: 'Home Freezer', joke: 'Cold Box, But Smaller', trigger: { type: 'threshold', cond: ['totalPop', 60], desc: 'Reach 60 total population' }, fx: { capitalYields: { food: 2 } } });
  node({ id: 'g_bunker', pool: F, cat: 'Shelter', name: 'Concrete Bunker', joke: 'A Basement That Means Business', trigger: { type: 'state', cond: ['event', 'undamaged'], turns: 20, desc: 'No settlement damaged for 20 turns' }, fx: { cityDefense: 6 }, unlocks: { unit: 'infantry' } });
  node({ id: 'g_steelframe', pool: F, cat: 'Shelter', name: 'Steel Frame', joke: 'The House Has A Skeleton Now', trigger: { type: 'threshold', cond: ['pop', 18], desc: 'Reach 18 population in a settlement' }, fx: { housingBonus: 2 } });
  node({ id: 'g_zoning', pool: F, cat: 'Shelter', name: 'Zoning Board', joke: 'A Board That Decides Where Your House Goes', trigger: { type: 'threshold', cond: ['settlements', 6], desc: 'Found 6 settlements' }, fx: { cityGrowthMult: 1.1 } });
  node({ id: 'g_airraid', pool: F, cat: 'Shelter', name: 'Air Raid Drill', joke: 'Practice Hiding Under The Desk', trigger: { type: 'discovery', cond: ['event', 'settlementAttacked'], desc: 'Have a settlement survive an attack' }, fx: { homeDefenseBonus: 6 } });
  node({ id: 'g_elevator', pool: F, cat: 'Shelter', name: 'Box On A Rope', joke: 'A Box That Goes Up Instead Of Sideways', trigger: { type: 'threshold', cond: ['cities', 3], desc: 'Grow 3 settlements into Cities' }, fx: { housingBonus: 1, cityGrowthMult: 1.05 }, cheap: true });
  node({ id: 'g_plumbing2', pool: F, cat: 'Shelter', name: 'Indoor Everything', joke: 'The Bathroom Moved Inside', trigger: { type: 'threshold', cond: ['building', 'aqueduct', 5], desc: 'Build 5 Aqueducts' }, fx: { happinessBonus: 1 } });
  node({ id: 'g_ballot', pool: F, cat: 'Kinship', name: 'Paper With A Box', joke: 'Paper With A Box You Check', trigger: { type: 'state', cond: ['event', 'content'], turns: 30, desc: 'No unhappy settlement for 30 turns' }, fx: { happinessBonus: 2 }, cheap: true });
  node({ id: 'g_union', pool: F, cat: 'Kinship', name: 'Break Room Vote', joke: 'Everyone Votes On The Coffee Machine', trigger: { type: 'threshold', cond: ['totalPop', 70], desc: 'Reach 70 total population' }, fx: { goldPerSettlement: 1 } });
  node({ id: 'g_newspaper', pool: F, cat: 'Kinship', name: 'Daily Paper', joke: 'News From Yesterday, Printed Today', trigger: { type: 'threshold', cond: ['building', 'amphitheater', 4], desc: 'Build 4 Amphitheaters' }, fx: { culturePerSettlement: 1 }, hub: 'g_the_paper' });
  node({ id: 'g_treaty', pool: F, cat: 'Kinship', name: 'A Signed Paper', joke: 'A Paper Everyone Agreed To Sign', trigger: { type: 'discovery', cond: ['peaceWith', 3], turns: 20, desc: 'Stay at peace with 3 empires for 20 turns' }, fx: { attitudeBonus: 10 } });
  node({ id: 'g_union2', pool: F, cat: 'Kinship', name: 'Standing In Line', joke: "Standing In Line, It's A Whole Thing Now", trigger: { type: 'threshold', cond: ['building', 'market', 5], desc: 'Build 5 Markets' }, fx: { happinessBonus: 1, luxuryHappinessBonus: 1 } });
  node({ id: 'g_census', pool: F, cat: 'Kinship', name: 'The Big Count', joke: 'Somebody Counted Everyone, Twice', trigger: { type: 'threshold', cond: ['settlements', 5], desc: 'Found 5 settlements' }, fx: { sciencePerSettlement: 1 } });
  node({ id: 'g_summit', pool: F, cat: 'Kinship', name: 'Everyone In One Room', joke: 'We All Sat In One Room And It Was Fine', trigger: { type: 'discovery', cond: ['met', 4], turns: 15, desc: 'Know 4 other empires for 15 turns' }, fx: { influencePerTurn: 2 }, hub: 'g_one_room' });
  node({ id: 'g_assembly2', pool: F, cat: 'Craft', name: 'Moving Belt', joke: 'The Belt Moves So You Don’t Have To', trigger: { type: 'threshold', cond: ['improvedTiles', 50], desc: 'Work 50 improved tiles' }, fx: { capitalYields: { production: 3 } }, unlocks: { unit: 'machine_gun' } });
  node({ id: 'g_alloy', pool: F, cat: 'Craft', name: 'Better Metal Mix', joke: 'Metal, But We Cheated On The Recipe', trigger: { type: 'threshold', cond: ['improvement', 'mine', 10], desc: 'Work 10 Mines' }, fx: { tileBonus: [{ when: 'mine', yields: { production: 1 } }] }, unlocks: { unit: 'artillery' } });
  node({ id: 'g_oilrig', pool: F, cat: 'Craft', name: 'Black Goo Pump', joke: 'We Found The Black Goo And Pumped It', trigger: { type: 'discovery', cond: ['resource', 'oil', 1], desc: 'Own an Oil resource' }, fx: { capitalYields: { production: 2 } }, unlocks: { unit: 'tank' } });
  node({ id: 'g_radio2', pool: F, cat: 'Craft', name: 'Boxes That Talk', joke: 'A Box In The Corner That Talks All Day', trigger: { type: 'threshold', cond: ['unitsBuilt', 12], desc: 'Train 12 units' }, unlocks: { building: 'broadcast_tower' } });
  node({ id: 'g_splitatom', pool: F, cat: 'Craft', name: 'The Tiny Thing', joke: 'We Split The Tiny Thing', trigger: { type: 'threshold', cond: ['building', 'workshop', 4], desc: 'Build 4 Workshops' }, unlocks: { building: 'research_lab' }, hub: 'g_tiny_thing' });
  node({ id: 'g_grid', pool: F, cat: 'Craft', name: 'The Big Grid', joke: 'Wires For Everyone, Basically', trigger: { type: 'threshold', cond: ['resourcekind', 'strategic', 2], desc: 'Own 2 strategic resources' }, unlocks: { building: 'power_plant' } });
  node({ id: 'g_runway', pool: F, cat: 'Wayfinding', name: 'Long Flat Dirt', joke: 'We Flattened The Dirt Real Long', trigger: { type: 'threshold', cond: ['explored', 1300], desc: 'Explore 1,300 tiles' }, unlocks: { building: 'airport' }, hub: 'g_first_flight' });
  node({ id: 'g_radar', pool: F, cat: 'Wayfinding', name: 'Bouncing Beeps', joke: 'We Bounce Beeps Off The Sky Now', trigger: { type: 'threshold', cond: ['coastal', 5], desc: 'Hold 5 coastal settlements' }, fx: { reconSight: 2 }, unlocks: { unit: 'destroyer' } });
  node({ id: 'g_convoy', pool: F, cat: 'Wayfinding', name: 'The Convoy', joke: 'A Line Of Trucks That Never Stops', trigger: { type: 'threshold', cond: ['event', 'caravan'], turns: 10, desc: 'Keep a trade route running for 10 turns' }, fx: { caravanRange: 2, goldPerSettlement: 1 } });
  node({ id: 'g_sonar', pool: F, cat: 'Wayfinding', name: 'Whale Song Copy', joke: 'We Copied The Whale Song For Boats', trigger: { type: 'threshold', cond: ['unitcls', 'naval', 3], desc: 'Own 3 naval units' }, fx: { navalMoves: 1, navalBonus: 3 }, unlocks: { unit: 'battleship' } });
  node({ id: 'g_assemblyroad', pool: F, cat: 'Wayfinding', name: 'Paved Everywhere', joke: 'Pavement Reaches Everywhere Now', trigger: { type: 'threshold', cond: ['improvedTiles', 45], desc: 'Work 45 improved tiles' }, fx: { roadMoves: 1, homeMoves: 1 } });
  node({ id: 'g_farflight', pool: F, cat: 'Wayfinding', name: 'Really Far Now', joke: 'We Can Get There Embarrassingly Fast', trigger: { type: 'discovery', cond: ['farSettlement', 14], desc: 'Found a settlement 14+ tiles from the capital' }, fx: { distantProduction: 3 }, unlocks: { unit: 'fighter' } });
  // ---- Branched pool (18): 6 exclusivity pairs (12) + 6 standalone ----
  pair({ id: 'g_bighorn', name: 'The Big Horns', joke: 'Everyone Gets A Big Metal Gun', trigger: { type: 'threshold', cond: ['military', 12], desc: 'Own 12 military units' }, fx: { combatBonus: 3, unitCostMult: 0.9 } },
       { id: 'g_fewhorns', name: 'A Few Good Horns', joke: 'Only The Fancy Guns Get Handed Out', trigger: { type: 'threshold', cond: ['level', 5], desc: 'Have a unit reach level 5' }, fx: { xpMult: 1.5, combatBonus: 5 } });
  pair({ id: 'g_bigfactory', name: 'One Big Factory', joke: 'One Factory Does Everything Now', trigger: { type: 'threshold', cond: ['building', 'factory', 3], desc: 'Build 3 Factories' }, fx: { yieldMult: { production: 1.15 } } },
       { id: 'g_manyshops', name: 'Many Small Shops', joke: 'Lots Of Little Shops Instead', trigger: { type: 'threshold', cond: ['settlements', 8], desc: 'Found 8 settlements' }, fx: { goldPerSettlement: 2 } });
  pair({ id: 'g_wired', name: 'Everyone Is Wired', joke: 'Wires Into Every Single House', trigger: { type: 'threshold', cond: ['building', 'power_plant', 2], desc: 'Build 2 Power Plants' }, fx: { yieldMult: { production: 1.1 }, happinessBonus: 1 } },
       { id: 'g_candles', name: 'We Still Like Candles', joke: 'Candles Are Cozier, Honestly', trigger: { type: 'state', cond: ['event', 'content'], turns: 18, desc: 'No unhappy settlement for 18 turns' }, fx: { culturePerSettlement: 1 } });
  pair({ id: 'g_navyfirst', name: 'Navy First', joke: 'Big Boats Before Anything Else', trigger: { type: 'threshold', cond: ['unitcls', 'navalRanged', 2], desc: 'Own 2 heavy naval units' }, fx: { navalBonus: 5 } },
       { id: 'g_landfirst', name: 'Land First', joke: 'Dirt Is Where The Fighting Happens', trigger: { type: 'threshold', cond: ['unitcls', 'cavalry', 3], desc: 'Own 3 cavalry-class units' }, fx: { landBonus: 5 } });
  pair({ id: 'g_bombhub', name: 'Build The Big One', joke: "We're Building The Big One", trigger: { type: 'threshold', cond: ['resourcekind', 'strategic', 3], desc: 'Own 3 strategic resources' }, fx: { combatBonus: 4, goldPerKill: 3 } },
       { id: 'g_nobomb', name: 'We Said No', joke: 'We Voted No On The Big One', trigger: { type: 'state', cond: ['event', 'peace'], turns: 25, desc: '25 turns without war' }, fx: { attitudeBonus: 15, warWearinessMult: 0.6 } });
  pair({ id: 'g_skyfirst', name: 'Look Up First', joke: 'We Look Up Before We Look Anywhere Else', trigger: { type: 'threshold', cond: ['unit', 'fighter', 2], desc: 'Own 2 Fighters' }, fx: { reconSight: 2, combatBonus: 2 } },
       { id: 'g_groundfirst', name: 'Look Down First', joke: 'We Look At Our Feet Instead', trigger: { type: 'threshold', cond: ['kills', 10], desc: 'Defeat 10 units' }, fx: { meleeBonus: 4, healBonusAll: 10 } });
  node({ id: 'g_jinglead', pool: B, name: 'Catchy Jingle', joke: 'A Jingle You Can’t Get Out Of Your Head', trigger: { type: 'threshold', cond: ['building', 'broadcast_tower', 1], desc: 'Build a Broadcast Tower' }, fx: { culturePerSettlement: 1, tourismMult: 1.1 } });
  node({ id: 'g_lightbulb', pool: B, name: 'A Bulb That Lights', joke: 'A Bulb That Just... Lights Up', trigger: { type: 'discovery', cond: ['building', 'power_plant', 1], desc: 'Build a Power Plant' }, fx: { happinessBonus: 1 }, unlocks: { wonder: 'eiffel_tower' } });
  node({ id: 'g_stockticker', pool: B, name: 'The Ticker Tape', joke: 'Paper That Prints Numbers All Day', trigger: { type: 'threshold', cond: ['gold', 800], desc: 'Hold 800 Gold in the treasury' }, fx: { yieldMult: { gold: 1.1 } }, unlocks: { wonder: 'statue_of_liberty' } });
  node({ id: 'g_wingwalk', pool: B, name: 'Wing Walking', joke: 'A Guy Walks On The Wing For Fun', trigger: { type: 'discovery', cond: ['unit', 'fighter', 1], desc: 'Own a Fighter' }, fx: { happinessBonus: 1, culturePerSettlement: 1 } });
  node({ id: 'g_bunkerclub', pool: B, name: 'Bunker Club', joke: 'A Club That Meets Underground', trigger: { type: 'discovery', cond: ['event', 'unitLost'], desc: 'Lose a unit in combat' }, fx: { homeDefenseBonus: 4 } });
  node({ id: 'g_deepwell', pool: B, name: 'Deep Well Pump', joke: 'We Pumped The Well Even Deeper', trigger: { type: 'threshold', cond: ['improvement', 'mine|quarry', 12], desc: 'Work 12 Mines or Quarries' }, fx: { capitalYields: { production: 2 } } });
  N.forEach(function (n) { V2.NODES.push(n); V2.NODE_BY_ID[n.id] = n; });
  // ---- Narrative hubs (5) ----
  var HUBS = [
    { id: 'g_tiny_thing', name: 'We Split The Tiny Thing (And Now What)', when: ['node', 'g_splitatom'], branches: [
      { id: 'g_power_it', name: 'Power Things With It', fx: { yieldMult: { production: 1.1 } } },
      { id: 'g_lightit', name: 'Light Cities With It', fx: { happinessBonus: 2 } },
      { id: 'g_lockitup', name: 'Lock It In A Vault And Never Speak Of It Again', fx: { attitudeBonus: 12 } }] },
    { id: 'g_the_paper', name: 'The Paper Printed Something Embarrassing', when: ['node', 'g_newspaper'], branches: [
      { id: 'g_runcorrection', name: 'Print A Correction', fx: { attitudeBonus: 8 } },
      { id: 'g_doublet', name: 'Print It Bigger Tomorrow', fx: { culturePerSettlement: 1 } },
      { id: 'g_buythepaper', name: 'Just Buy The Paper', fx: { goldPerSettlement: 2 } }] },
    { id: 'g_one_room', name: 'Everyone In One Room (It Got Tense)', when: ['met', 3], branches: [
      { id: 'g_stayfriendly', name: 'Stay Friendly Anyway', fx: { attitudeBonus: 12 } },
      { id: 'g_walkedout', name: 'We Walked Out', fx: { homeDefenseBonus: 5 } },
      { id: 'g_tookminutes', name: 'Somebody Took Minutes', fx: { sciencePerSettlement: 1 } }] },
    { id: 'g_first_flight', name: 'A Guy Got A Box Of Metal Off The Ground', when: ['node', 'g_runway'], branches: [
      { id: 'g_airshow', name: 'Throw An Air Show', fx: { happinessBonus: 2, tourismMult: 1.1 } },
      { id: 'g_airforce', name: 'Point It At Someone Instead', fx: { combatBonus: 3 } },
      { id: 'g_mailplane', name: 'Use It To Deliver Mail Faster', fx: { goldPerSettlement: 1, caravanRange: 2 } }] },
    { id: 'g_lightning_wire', name: 'The Wire Learned To Talk', when: ['wonders', 1], branches: [
      { id: 'g_wire_science', name: 'Wire It To The Lab', fx: { sciencePerSettlement: 1 } },
      { id: 'g_wire_culture', name: 'Wire It To The Theater', fx: { culturePerSettlement: 1 } },
      { id: 'g_wire_gold', name: 'Wire It To The Bank', fx: { goldPerSettlement: 1 } }] }
  ];
  HUBS.forEach(function (h) { V2.HUBS.push(h); V2.HUB_BY_ID[h.id] = h; });
  // ---- Turning Point into the next era ----
  var TP = { name: 'The Pixel Age Is Coming', branches: [
      { id: 'g_wired_way', name: "The Wired Way", fx: { yieldMult: { science: 1.1 } } },
      { id: 'g_armored_way', name: "The Armored Way", fx: { combatBonus: 2, unitCostMult: 0.9 } },
      { id: 'g_broadcast_way', name: "The Broadcast Way", fx: { culturePerSettlement: 1, tourismMult: 1.1 } }] };
  TP.id = 'turning:' + E; TP.turning = E; V2.TURNING[E] = TP; V2.HUBS.push(TP); V2.HUB_BY_ID[TP.id] = TP;
  // ---- Unit joke names ----
  Object.assign(V2.UNITS, {
    artillery: { joke: 'Big Boomer' },
    infantry: { joke: 'Regular Guys' },
    machine_gun: { joke: 'Rattle Gun' },
    battleship: { joke: 'Big Metal Boat' },
    tank: { joke: 'Metal Turtle' },
    destroyer: { joke: 'Fast Metal Boat' },
    fighter: { joke: 'Sky Guy' }
  });
})(globalThis.AU = globalThis.AU || {});
