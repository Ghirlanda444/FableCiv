// v2 "Civ-Divergence": Era 1 content — Marble Age / "When Columns Were Cool".
(function (AU) {
  var V2 = AU.V2, E = 1, N = [];
  function node(o) { o.era = E; N.push(o); return o; }
  var F = 'foundation', B = 'branched';
  function pair(a, b) { a.pool = B; b.pool = B; a.locks = [b.id]; b.locks = [a.id]; a.pair = b.id; b.pair = a.id; node(a); node(b); }
  // ---- Foundation pool (32): Sustenance 7, Shelter 6, Kinship 7, Craft 6, Wayfinding 6 ----
  node({ id: 'm_olive', pool: F, cat: 'Sustenance', name: 'Olive Groves', joke: 'Olives: Now A Whole Personality', trigger: { type: 'threshold', cond: ['improvement', 'plantation', 4], desc: 'Work 4 Plantations' }, fx: { tileBonus: [{ when: 'plantation', yields: { food: 1 } }] } });
  node({ id: 'm_vineyard', pool: F, cat: 'Sustenance', name: 'Vineyard Rows', joke: 'Wine: Also A Whole Personality', trigger: { type: 'discovery', cond: ['improvement', 'plantation|farm', 5], desc: 'Work 5 Plantations or Farms' }, fx: { capitalYields: { food: 1, gold: 1 } } });
  node({ id: 'm_aqueduct_line', pool: F, cat: 'Sustenance', name: 'Aqueduct Lines', joke: 'Water Now Comes From Somewhere Else', trigger: { type: 'threshold', cond: ['pop', 8], desc: 'Reach 8 population in a settlement' }, unlocks: { building: 'aqueduct' }, cheap: true });
  node({ id: 'm_terraces', pool: F, cat: 'Sustenance', name: 'Hill Terraces', joke: 'We Cut The Hill Into Steps', trigger: { type: 'threshold', cond: ['tiles', 'hills', 6], desc: 'Own 6 Hill tiles' }, fx: { tileBonus: [{ when: 'hills', yields: { food: 1 } }] } });
  node({ id: 'm_saltpans', pool: F, cat: 'Sustenance', name: 'Salt Pans', joke: "Salt: Nature's Seasoning Rock", trigger: { type: 'threshold', cond: ['improvement', 'fishing', 3], desc: 'Work 3 sea resources' }, fx: { coastalSettlementYields: { food: 1 } } });
  node({ id: 'm_grain_dole', pool: F, cat: 'Sustenance', name: 'Grain Dole', joke: 'Free Bread, Occasional Circus', trigger: { type: 'state', cond: ['event', 'foodSurplus'], turns: 15, desc: 'Positive Food for 15 turns' }, fx: { happinessBonus: 1 } });
  node({ id: 'm_irrigation2', pool: F, cat: 'Sustenance', name: 'Stone Channels', joke: 'Water Goes Where We Tell It Now', trigger: { type: 'discovery', cond: ['riverTiles', 4], desc: 'Work 4 river tiles' }, fx: { tileBonus: [{ when: 'river', yields: { food: 1 } }] } });
  node({ id: 'm_step_pyramid', pool: F, cat: 'Shelter', name: 'Step Pyramid Plans', joke: 'Stairs That Go Nowhere In Particular', trigger: { type: 'threshold', cond: ['improvedTiles', 14], desc: 'Work 14 improved tiles' }, unlocks: { wonder: 'chichen_itza' } });
  node({ id: 'm_forum', pool: F, cat: 'Shelter', name: 'The Forum', joke: 'Everyone Argues In The Same Square Now', trigger: { type: 'state', cond: ['event', 'content'], turns: 20, desc: 'No unhappy settlement for 20 turns' }, fx: { happinessBonus: 2 }, hub: 'm_hub_forum' });
  node({ id: 'm_road_grid', pool: F, cat: 'Shelter', name: 'Road Grid', joke: 'All Roads Lead Somewhere Specific Now', trigger: { type: 'threshold', cond: ['settlements', 3], desc: 'Found 3 settlements' }, fx: { roadMoves: 1 } });
  node({ id: 'm_walls2', pool: F, cat: 'Shelter', name: 'Stone Walls', joke: 'Walls, But Actually Sturdy This Time', trigger: { type: 'state', cond: ['event', 'undamaged'], turns: 25, desc: 'No settlement damaged for 25 turns' }, fx: { cityDefense: 4 } });
  node({ id: 'm_insulae', pool: F, cat: 'Shelter', name: 'Stacked Housing', joke: 'Everybody Lives On Top Of Everybody Else', trigger: { type: 'threshold', cond: ['pop', 9], desc: 'Reach 9 population in a settlement' }, fx: { housingBonus: 1 } });
  node({ id: 'm_hillfort', pool: F, cat: 'Shelter', name: 'Hillfort', joke: 'The Hill Has Opinions About Defense', trigger: { type: 'threshold', cond: ['tiles', 'hills', 8], desc: 'Own 8 Hill tiles' }, fx: { hillsDefense: 4 } });
  node({ id: 'm_temple', pool: F, cat: 'Kinship', name: 'The Temple', joke: 'The Gods Get Their Own Building Now', trigger: { type: 'threshold', cond: ['settlements', 2], desc: 'Found a second settlement' }, unlocks: { building: 'temple' }, cheap: true });
  node({ id: 'm_market', pool: F, cat: 'Kinship', name: 'The Market', joke: 'Buying And Selling, Now Official', trigger: { type: 'threshold', cond: ['gold', 100], desc: 'Hold 100 Gold in the treasury' }, unlocks: { building: 'market' } });
  node({ id: 'm_amphitheater', pool: F, cat: 'Kinship', name: 'The Amphitheater', joke: 'Community Theater, Except Everyone Comes', trigger: { type: 'state', cond: ['event', 'cultureSurplus'], turns: 12, desc: 'Positive Heritage for 12 turns' }, unlocks: { building: 'amphitheater' } });
  node({ id: 'm_grand_temple', pool: F, cat: 'Kinship', name: 'Grand Temple', joke: 'One Big Temple To Rule Them All', trigger: { type: 'threshold', cond: ['building', 'temple', 2], desc: 'Build 2 Temples' }, unlocks: { national: 'grand_temple' } });
  node({ id: 'm_senate', pool: F, cat: 'Kinship', name: 'The Senate', joke: 'Old Men Yell At Each Other, Productively', trigger: { type: 'state', cond: ['event', 'peace'], turns: 20, desc: '20 turns without war' }, fx: { influencePerTurn: 1 } });
  node({ id: 'm_orator', pool: F, cat: 'Kinship', name: 'The Orator', joke: 'Somebody Learned To Talk Real Good', trigger: { type: 'discovery', cond: ['met', 3], turns: 10, desc: 'Know 3 other empires for 10 turns' }, fx: { attitudeBonus: 8 } });
  node({ id: 'm_augur', pool: F, cat: 'Kinship', name: 'The Augur', joke: 'Reads The Future In Bird Guts', trigger: { type: 'threshold', cond: ['pop', 9], desc: 'Reach 9 population in a settlement' }, fx: { greatSlot: 'prophet' }, hub: 'm_hub_augur' });
  node({ id: 'm_bronze', pool: F, cat: 'Craft', name: 'Bronze Casting', joke: 'Metal, But Fancier', trigger: { type: 'threshold', cond: ['improvement', 'mine', 4], desc: 'Work 4 Mines' }, unlocks: { unit: 'swordsman' }, cheap: true });
  node({ id: 'm_siege_works', pool: F, cat: 'Craft', name: 'Siege Works', joke: 'We Built A Machine That Throws Rocks Back', trigger: { type: 'threshold', cond: ['kills', 5], desc: 'Defeat 5 units' }, unlocks: { unit: 'catapult' } });
  node({ id: 'm_masonry', pool: F, cat: 'Craft', name: 'Fitted Masonry', joke: 'Rocks That Fit Together On Purpose', trigger: { type: 'threshold', cond: ['improvedTiles', 18], desc: 'Work 18 improved tiles' }, fx: { capitalYields: { production: 2 } } });
  node({ id: 'm_glassware', pool: F, cat: 'Craft', name: 'Glass Trinkets', joke: 'We Made Sand Shiny', trigger: { type: 'threshold', cond: ['resourcekind', 'luxury', 2], desc: 'Own 2 Luxury resources' }, fx: { luxuryGold: 2 } });
  node({ id: 'm_legion_drill', pool: F, cat: 'Craft', name: 'Legion Drill', joke: 'Marching In A Straight Line, On Purpose', trigger: { type: 'threshold', cond: ['military', 6], desc: 'Own 6 military units' }, fx: { xpMult: 1.2 } });
  node({ id: 'm_mosaic', pool: F, cat: 'Craft', name: 'Mosaic Floors', joke: 'Tiny Rocks, Arranged With Great Care', trigger: { type: 'state', cond: ['event', 'cultureSurplus'], turns: 10, desc: 'Positive Heritage for 10 turns' }, fx: { capitalYields: { culture: 2 } } });
  node({ id: 'm_horse_breeding', pool: F, cat: 'Wayfinding', name: 'Horse Breeding', joke: 'Turns Out You Can Ride Those', trigger: { type: 'discovery', cond: ['resource', 'horses', 1], desc: 'Own Horses' }, unlocks: { unit: 'horseman' }, cheap: true });
  node({ id: 'm_harbor_works', pool: F, cat: 'Wayfinding', name: 'Harbor Works', joke: "A Dock That Doesn't Fall Over", trigger: { type: 'threshold', cond: ['coastal', 2], desc: 'Settle 2 coastal settlements' }, unlocks: { building: 'harbor' } });
  node({ id: 'm_triremes', pool: F, cat: 'Wayfinding', name: 'Trireme Lanes', joke: 'Three Rows Of Guys Rowing Very Hard', trigger: { type: 'discovery', cond: ['coastal', 1], desc: 'Settle on the coast' }, fx: { navalBonus: 2 } });
  node({ id: 'm_milestones', pool: F, cat: 'Wayfinding', name: 'Milestones', joke: 'Somebody Counted Every Single Step', trigger: { type: 'threshold', cond: ['explored', 450], desc: 'Explore 450 tiles' }, fx: { reconSight: 1, roadMoves: 1 } });
  node({ id: 'm_lighthouse_fires', pool: F, cat: 'Wayfinding', name: 'Watch Fires', joke: 'Fire On A Stick, But Taller', trigger: { type: 'discovery', cond: ['event', 'natural'], turns: 12, desc: 'Know a natural wonder for 12 turns' }, fx: { capitalYields: { culture: 2 } } });
  node({ id: 'm_trade_lanes', pool: F, cat: 'Wayfinding', name: 'Trade Lanes', joke: 'Somebody Mapped The Good Routes', trigger: { type: 'threshold', cond: ['event', 'caravan'], desc: 'Run a trade route' }, fx: { caravanRange: 2 }, hub: 'm_hub_trade' });
  // ---- Branched pool (18): 6 exclusivity pairs (12) + 6 standalone ----
  pair({ id: 'm_circus', name: 'Circus Games', joke: 'Bread And Circuses (Mostly Circuses)', trigger: { type: 'threshold', cond: ['building', 'amphitheater', 2], desc: 'Build 2 Amphitheaters' }, fx: { happinessBonus: 2 }, unlocks: { wonder: 'colosseum' } },
       { id: 'm_quiet_life', name: 'The Quiet Life', joke: 'We Just... Stayed Home', trigger: { type: 'state', cond: ['event', 'content'], turns: 18, desc: 'No unhappy settlement for 18 turns' }, fx: { happinessBonus: 2, growthMult: 1.05 } });
  pair({ id: 'm_pharos', name: 'The Great Pharos', joke: 'A Fire So Big Ships Stop Getting Lost', trigger: { type: 'threshold', cond: ['coastal', 3], desc: 'Settle 3 coastal settlements' }, fx: { navalBonus: 2 }, unlocks: { wonder: 'great_lighthouse' } },
       { id: 'm_inland_roads', name: 'Inland Roads', joke: 'Who Needs The Sea Anyway', trigger: { type: 'threshold', cond: ['improvedTiles', 20], desc: 'Work 20 improved tiles' }, fx: { roadMoves: 1, distantProduction: 2 } });
  pair({ id: 'm_clay_legion', name: 'Clay Legion', joke: 'An Army That Never Complains', trigger: { type: 'threshold', cond: ['unitsBuilt', 10], desc: 'Train 10 units' }, fx: { unitsStartXp: 5 }, unlocks: { wonder: 'terracotta_army' } },
       { id: 'm_living_legion', name: 'Living Legion', joke: 'We Just Used Real Guys', trigger: { type: 'threshold', cond: ['level', 3], desc: 'Have a unit reach level 3' }, fx: { combatBonus: 3, xpMult: 1.3 } });
  pair({ id: 'm_rose_city', name: 'Rose City Roads', joke: 'A City Carved Into A Cliff, Somehow', trigger: { type: 'threshold', cond: ['gold', 150], desc: 'Hold 150 Gold in the treasury' }, fx: { caravanRange: 2 }, unlocks: { wonder: 'petra' } },
       { id: 'm_mountain_pass', name: 'Mountain Pass', joke: 'The Long Way Around, But Shorter', trigger: { type: 'discovery', cond: ['adjacent', 'mountain', 1], desc: 'Settle next to a mountain' }, fx: { settlementSiteBonus: [{ when: 'mountain', yields: { gold: 1 } }] } });
  pair({ id: 'm_bronze_giant', name: 'The Bronze Giant', joke: 'A Statue So Big It Has Its Own Weather', trigger: { type: 'threshold', cond: ['building', 'harbor', 1], desc: 'Build a Harbor' }, fx: { coastalSettlementYields: { gold: 1 } }, unlocks: { wonder: 'colossus' } },
       { id: 'm_modest_stele', name: 'Modest Stele', joke: 'A Small Rock That Says "We Exist"', trigger: { type: 'threshold', cond: ['met', 3], desc: 'Meet 3 empires' }, fx: { influenceOnce: 20 } });
  pair({ id: 'm_sky_terraces', name: 'Sky Terraces', joke: 'A City So High The Clouds Complain', trigger: { type: 'threshold', cond: ['tiles', 'hills', 10], desc: 'Own 10 Hill tiles' }, fx: { hillsDefense: 3 }, unlocks: { wonder: 'machu_picchu' } },
       { id: 'm_valley_city', name: 'Valley City', joke: 'We Just Built It Down There Instead', trigger: { type: 'threshold', cond: ['totalPop', 22], desc: 'Reach 22 total population' }, fx: { growthMult: 1.15 } });
  node({ id: 'm_epic_poets', pool: B, name: 'Epic Poets', joke: 'Our History, Now In Verse', trigger: { type: 'state', cond: ['event', 'cultureSurplus'], turns: 15, desc: 'Positive Heritage for 15 turns' }, unlocks: { national: 'national_epic' } });
  node({ id: 'm_war_college', pool: B, name: 'War College', joke: 'Legion Tactics, Now Written Down', trigger: { type: 'threshold', cond: ['military', 8], desc: 'Own 8 military units' }, unlocks: { national: 'heroic_epic' } });
  node({ id: 'm_philosophers', pool: B, name: 'The Philosophers', joke: 'Arguing About Everything, Professionally', trigger: { type: 'state', cond: ['event', 'scienceSurplus'], turns: 15, desc: 'Positive Knowledge for 15 turns' }, fx: { yieldMult: { science: 1.15 } } });
  node({ id: 'm_toga_fashion', pool: B, name: 'Toga Fashion', joke: 'One Piece Of Cloth, Infinite Styles', trigger: { type: 'threshold', cond: ['resourcekind', 'luxury', 3], desc: 'Own 3 Luxury resources' }, fx: { luxuryHappinessBonus: 2 } });
  node({ id: 'm_captive_games', pool: B, name: 'Captive Games', joke: 'The Losers Fight For Our Entertainment', trigger: { type: 'threshold', cond: ['captures', 2], desc: 'Capture 2 settlements' }, fx: { culturePerKill: 5 } });
  node({ id: 'm_oracle', pool: B, name: 'The Oracle', joke: 'Vague Answers, Delivered With Confidence', trigger: { type: 'discovery', cond: ['event', 'meetCS'], turns: 15, desc: 'Know a Free city for 15 turns' }, fx: { attitudeBonus: 6 } });
  N.forEach(function (n) { V2.NODES.push(n); V2.NODE_BY_ID[n.id] = n; });
  // ---- Narrative hubs (5) ----
  var HUBS = [
    { id: 'm_hub_forum', name: 'The Forum Erupts Into Argument', when: ['node', 'm_forum'], branches: [
      { id: 'senate_rule', name: 'Let The Senate Decide', fx: { civicCostMult: 0.9 } },
      { id: 'strongman', name: 'One Guy Decides Everything', fx: { combatBonus: 2 } },
      { id: 'mob_rule', name: 'Whoever Shouts Loudest Wins', fx: { happinessBonus: 2 } }] },
    { id: 'm_hub_augur', name: 'The Augur Reads The Omens', when: ['node', 'm_augur'], branches: [
      { id: 'trust_omens', name: 'Trust The Omens', fx: { faithPerSettlement: 1 } },
      { id: 'trust_math', name: 'Trust The Math Instead', fx: { yieldMult: { science: 1.1 } } },
      { id: 'trust_both', name: 'Hedge Our Bets', fx: { happinessBonus: 1, sciencePerSettlement: 1 } }] },
    { id: 'm_hub_trade', name: 'The Trade Lanes Pay Off', when: ['node', 'm_trade_lanes'], branches: [
      { id: 'guild_cut', name: 'The Guild Takes A Cut', fx: { goldPerSettlement: 2 } },
      { id: 'spread_wealth', name: 'Spread The Wealth Around', fx: { happinessBonus: 1, yieldMult: { gold: 1.1 } } },
      { id: 'reinvest', name: 'Reinvest In The Roads', fx: { roadMoves: 1, caravanRange: 1 } }] },
    { id: 'm_hub_legion', name: 'The Legion Marches Home', when: ['event', 'combat'], branches: [
      { id: 'triumph', name: 'Throw Them A Triumph', fx: { combatBonus: 2, culturePerKill: 4 } },
      { id: 'quiet_return', name: 'They Just... Come Home', fx: { attitudeBonus: 10, warWearinessMult: 0.6 } },
      { id: 'retire_legion', name: 'Retire The Legion Early', fx: { happinessBonus: 2 } }] },
    { id: 'm_hub_meet', name: 'The Neighbors Notice The Columns', when: ['met', 2], branches: [
      { id: 'show_columns', name: 'Invite Them To Look', fx: { attitudeBonus: 12 } },
      { id: 'guard_columns', name: 'Guard The Columns Closely', fx: { homeDefenseBonus: 5 } },
      { id: 'sell_columns', name: 'Sell Them The Blueprints', fx: { goldPerSettlement: 1, influencePerTurn: 1 } }] }
  ];
  HUBS.forEach(function (h) { V2.HUBS.push(h); V2.HUB_BY_ID[h.id] = h; });
  // ---- Turning Point into the next era ----
  var TP = { name: 'The Turret Age Is Coming', branches: [
      { id: 'engineers', name: "The Engineers' Way", fx: { buildingCostMult: 0.9 } },
      { id: 'legionaries', name: "The Legionaries' Way", fx: { unitCostMult: 0.9, combatBonus: 1 } },
      { id: 'merchants', name: "The Merchants' Way", fx: { goldPerSettlement: 1 } }] };
  TP.id = 'turning:' + E; TP.turning = E; V2.TURNING[E] = TP; V2.HUBS.push(TP); V2.HUB_BY_ID[TP.id] = TP;
  // ---- Unit joke names ----
  Object.assign(V2.UNITS, { swordsman: { joke: 'Upgraded Pointy Stick Guy' }, horseman: { joke: 'Faster Pointy Stick Guy' }, catapult: { joke: 'Rock, But Farther' } });
})(globalThis.AU = globalThis.AU || {});
