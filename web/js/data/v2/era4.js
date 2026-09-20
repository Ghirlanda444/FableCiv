// v2 "Civ-Divergence": Era 3 content — Easel Age / "Paint Got Expensive".
(function (AU) {
  var V2 = AU.V2, E = 3, N = [];
  function node(o) { o.era = E; N.push(o); return o; }
  var F = 'foundation', B = 'branched';
  function pair(a, b) { a.pool = B; b.pool = B; a.locks = [b.id]; b.locks = [a.id]; a.pair = b.id; b.pair = a.id; node(a); node(b); }
  // ---- Foundation pool (32): Sustenance 7, Shelter 6, Kinship 7, Craft 6, Wayfinding 6 ----
  node({ id: 'e_terrace', pool: F, cat: 'Sustenance', name: 'Terraced Fields', joke: 'We Cut The Hill Into Steps', trigger: { type: 'threshold', cond: ['improvement', 'farm', 5], desc: 'Work 5 Farms' }, fx: { tileBonus: [{ when: 'farm', yields: { food: 1 } }] }, cheap: true });
  node({ id: 'e_windmill', pool: F, cat: 'Sustenance', name: 'Grain Windmill', joke: 'The Wind Does The Grinding Now', trigger: { type: 'threshold', cond: ['improvedTiles', 14], desc: 'Work 14 improved tiles' }, fx: { capitalYields: { food: 2 } } });
  node({ id: 'e_orchard', pool: F, cat: 'Sustenance', name: 'Orchard Rows', joke: 'Fruit Trees In Straight Lines', trigger: { type: 'threshold', cond: ['improvement', 'plantation', 4], desc: 'Work 4 Plantations' }, fx: { tileBonus: [{ when: 'plantation', yields: { food: 1 } }] } });
  node({ id: 'e_granaryplus', pool: F, cat: 'Sustenance', name: 'Bigger Pantry', joke: 'The Pantry Got An Extension', trigger: { type: 'threshold', cond: ['pop', 12], desc: 'Reach 12 population in a settlement' }, fx: { housingBonus: 1 } });
  node({ id: 'e_marketgoods', pool: F, cat: 'Sustenance', name: 'New World Crops', joke: 'Somebody Brought Back Potatoes', trigger: { type: 'discovery', cond: ['resource', 'bananas|cotton|spices', 1], desc: 'Own Bananas, Cotton or Spices' }, fx: { capitalYields: { food: 1, gold: 1 } } });
  node({ id: 'e_saltcod', pool: F, cat: 'Sustenance', name: 'Salted Fish', joke: "We Salted The Fish, It Lasts Longer Now", trigger: { type: 'threshold', cond: ['improvement', 'fishing', 3], desc: 'Work 3 sea resources' }, fx: { coastalSettlementYields: { food: 1 } } });
  node({ id: 'e_famineward', pool: F, cat: 'Sustenance', name: 'Grain Reserve', joke: 'We Started Keeping Extra Grain Around', trigger: { type: 'state', cond: ['event', 'foodSurplus'], turns: 20, desc: 'Positive Food for 20 turns' }, fx: { growthMult: 1.1 } });
  node({ id: 'e_bastion', pool: F, cat: 'Shelter', name: 'Star Bastion', joke: 'The Wall Now Has Points', trigger: { type: 'state', cond: ['event', 'undamaged'], turns: 30, desc: 'No settlement damaged for 30 turns' }, fx: { cityDefense: 4 } });
  node({ id: 'e_stonemason', pool: F, cat: 'Shelter', name: 'Mason Guild', joke: 'The Masons Formed A Guild', trigger: { type: 'threshold', cond: ['improvement', 'quarry', 4], desc: 'Work 4 Quarries' }, fx: { tileBonus: [{ when: 'quarry', yields: { production: 1 } }] }, cheap: true });
  node({ id: 'e_observatory_site', pool: F, cat: 'Shelter', name: 'Star Chart', joke: 'We Started Writing Down Where The Stars Go', trigger: { type: 'threshold', cond: ['tiles', 'hills', 6], desc: 'Own 6 Hill tiles' }, unlocks: { building: 'astronomical_observatory' } });
  node({ id: 'e_towncharter', pool: F, cat: 'Shelter', name: 'Town Charter', joke: 'We Wrote Down The Rules This Time', trigger: { type: 'threshold', cond: ['settlements', 4], desc: 'Found 4 settlements' }, fx: { housingBonus: 1 } });
  node({ id: 'e_glasswindow', pool: F, cat: 'Shelter', name: 'Glass Windows', joke: 'The Windows Are See-Through Now', trigger: { type: 'threshold', cond: ['pop', 13], desc: 'Reach 13 population in a settlement' }, fx: { happinessBonus: 1 } });
  node({ id: 'e_cannonproof', pool: F, cat: 'Shelter', name: 'Cannon-Proof Walls', joke: 'We Made The Walls Thicker Just In Case', trigger: { type: 'threshold', cond: ['military', 8], desc: 'Own 8 military units' }, fx: { homeDefenseBonus: 6 } });
  node({ id: 'e_guildhall', pool: F, cat: 'Kinship', name: 'Guild Hall', joke: 'Everyone Joined A Guild', trigger: { type: 'state', cond: ['event', 'content'], turns: 25, desc: 'No unhappy settlement for 25 turns' }, fx: { happinessBonus: 2 }, cheap: true });
  node({ id: 'e_counting_house', pool: F, cat: 'Kinship', name: 'Counting House', joke: 'Somebody Is Very Good At Counting Money', trigger: { type: 'threshold', cond: ['gold', 300], desc: 'Hold 300 Gold in the treasury' }, unlocks: { building: 'bank' }, hub: 'counting_house_deal' });
  node({ id: 'e_gallery', pool: F, cat: 'Kinship', name: 'Art Gallery', joke: 'We Hung The Paintings On A Wall', trigger: { type: 'state', cond: ['event', 'cultureSurplus'], turns: 15, desc: 'Positive Heritage for 15 turns' }, unlocks: { building: 'museum' } });
  node({ id: 'e_taj', pool: F, cat: 'Kinship', name: 'Grand Mausoleum', joke: 'A Very Nice Building For A Very Sad Reason', trigger: { type: 'threshold', cond: ['totalPop', 45], desc: 'Reach 45 total population' }, unlocks: { wonder: 'taj_mahal' } });
  node({ id: 'e_diplomat_corps', pool: F, cat: 'Kinship', name: 'Diplomat Corps', joke: 'We Sent A Guy To Go Be Polite Somewhere Else', trigger: { type: 'discovery', cond: ['peaceWith', 3], turns: 20, desc: 'Stay at peace with 3 empires for 20 turns' }, fx: { influencePerTurn: 2 } });
  node({ id: 'e_salon', pool: F, cat: 'Kinship', name: 'Literary Salon', joke: 'Everyone Argues About Books Now', trigger: { type: 'discovery', cond: ['met', 3], turns: 10, desc: 'Know three other empires for 10 turns' }, fx: { sciencePerSettlement: 1 } });
  node({ id: 'e_marriage_pact', pool: F, cat: 'Kinship', name: 'Marriage Pact', joke: 'Two Families Merged Because Of A Treaty', trigger: { type: 'threshold', cond: ['cities', 3], desc: 'Own 3 Cities' }, fx: { attitudeBonus: 10 } });
  node({ id: 'e_gunsmith', pool: F, cat: 'Craft', name: 'Gunsmith Row', joke: 'Somebody Figured Out The Metal Tube Thing', trigger: { type: 'discovery', cond: ['resource', 'niter', 1], desc: 'Own Niter' }, unlocks: { unit: 'musketman' }, hub: 'gunsmith_deal' });
  node({ id: 'e_foundry', pool: F, cat: 'Craft', name: 'Cannon Foundry', joke: 'We Learned To Pour Metal Into Cannon Shapes', trigger: { type: 'threshold', cond: ['improvement', 'mine', 5], desc: 'Work 5 Mines' }, unlocks: { unit: 'bombard' } });
  node({ id: 'e_presshouse', pool: F, cat: 'Craft', name: 'Moveable Type', joke: 'Somebody Carved A Thousand Tiny Letters', trigger: { type: 'threshold', cond: ['improvedTiles', 20], desc: 'Work 20 improved tiles' }, unlocks: { building: 'printing_house' }, hub: 'presshouse_deal' });
  node({ id: 'e_workshop_guild', pool: F, cat: 'Craft', name: 'Workshop Guild', joke: 'The Workshop Guys Formed A Union', trigger: { type: 'threshold', cond: ['improvement', 'mine|quarry', 6], desc: 'Work 6 Mines or Quarries' }, fx: { capitalYields: { production: 2 } }, cheap: true });
  node({ id: 'e_ledger', pool: F, cat: 'Craft', name: 'Double-Entry Ledger', joke: 'We Started Writing Numbers In Two Columns', trigger: { type: 'state', cond: ['event', 'scienceSurplus'], turns: 15, desc: 'Positive Knowledge for 15 turns' }, fx: { yieldMult: { science: 1.15 } } });
  node({ id: 'e_engineering_corps', pool: F, cat: 'Craft', name: 'Siege Engineers', joke: 'These Guys Just Build Big Metal Tubes All Day', trigger: { type: 'threshold', cond: ['kills', 8], desc: 'Defeat 8 units' }, fx: { combatBonus: 3 } });
  node({ id: 'e_caravel_yard', pool: F, cat: 'Wayfinding', name: 'Ocean-Going Hull', joke: "The Boat Can Now Leave The Boat-Shaped Lake", trigger: { type: 'threshold', cond: ['coastal', 2], desc: 'Settle 2 coastal settlements' }, unlocks: { unit: 'caravel' } });
  node({ id: 'e_harbor_upgrade', pool: F, cat: 'Wayfinding', name: 'Dry Dock', joke: "We Built A Dock That Isn't Wet", trigger: { type: 'threshold', cond: ['improvement', 'fishing', 4], desc: 'Work 4 sea resources' }, unlocks: { building: 'shipyard' } });
  node({ id: 'e_cartography', pool: F, cat: 'Wayfinding', name: 'New Charts', joke: 'The Map Guy Finally Got It Mostly Right', trigger: { type: 'threshold', cond: ['explored', 700], desc: 'Explore 700 tiles' }, fx: { reconSight: 1, navalMoves: 1 }, cheap: true });
  node({ id: 'e_tradewinds', pool: F, cat: 'Wayfinding', name: 'Trade Winds', joke: 'We Figured Out Which Way The Wind Usually Blows', trigger: { type: 'discovery', cond: ['met', 3], desc: 'Meet 3 empires' }, fx: { caravanRange: 2 } });
  node({ id: 'e_lighthouse_watch', pool: F, cat: 'Wayfinding', name: 'Lighthouse Watch', joke: 'A Guy Stands There With A Lantern All Night', trigger: { type: 'state', cond: ['coastal', 2], turns: 15, desc: 'Hold 2 coastal settlements for 15 turns' }, fx: { coastalSettlementYields: { gold: 1 } } });
  node({ id: 'e_farhorizon', pool: F, cat: 'Wayfinding', name: 'Far Horizon', joke: 'We Went Further Than Anyone Meant To', trigger: { type: 'threshold', cond: ['farSettlement', 12], desc: 'Found a settlement 12+ tiles from the capital' }, fx: { distantProduction: 3 } });
  // ---- Branched pool (18): 6 exclusivity pairs (12) + 6 standalone ----
  pair({ id: 'e_merchant_guild', name: 'Merchant Guild', joke: 'The Merchants Formed A Guild Too', trigger: { type: 'threshold', cond: ['met', 3], desc: 'Meet 3 empires' }, fx: { goldPerSettlement: 2 } },
       { id: 'e_artisan_guild', name: 'Artisan Guild', joke: 'The Artisans Formed A Guild Too', trigger: { type: 'threshold', cond: ['improvedTiles', 20], desc: 'Work 20 improved tiles' }, fx: { capitalYields: { production: 3 } } });
  pair({ id: 'e_realist_school', name: 'Realist School', joke: 'Paintings That Look Like Actual People Now', trigger: { type: 'state', cond: ['event', 'cultureSurplus'], turns: 10, desc: 'Positive Heritage for 10 turns' }, fx: { yieldMult: { culture: 1.15 } } },
       { id: 'e_ornate_school', name: 'Ornate School', joke: 'Paintings With Way Too Much Gold Leaf', trigger: { type: 'threshold', cond: ['gold', 400], desc: 'Hold 400 Gold in the treasury' }, fx: { luxuryGold: 2, happinessBonus: 1 } });
  pair({ id: 'e_letters_of_credit', name: 'Letters Of Credit', joke: 'A Piece Of Paper That Means Money, Trust Us', trigger: { type: 'threshold', cond: ['building', 'bank', 2], desc: 'Build 2 Banks' }, fx: { yieldMult: { gold: 1.15 } } },
       { id: 'e_coin_hoard', name: 'Coin Hoard', joke: 'We Just Keep The Actual Coins In A Box', trigger: { type: 'threshold', cond: ['gold', 500], desc: 'Hold 500 Gold in the treasury' }, fx: { capitalYields: { gold: 3 } } });
  pair({ id: 'e_musket_line', name: 'Musket Line', joke: 'Everybody Point The Same Direction', trigger: { type: 'threshold', cond: ['unitcls', 'melee', 6], desc: 'Own 6 melee units' }, fx: { combatBonus: 3 } },
       { id: 'e_cannon_row', name: 'Cannon Row', joke: 'Line Up The Cannons, See What Happens', trigger: { type: 'threshold', cond: ['unitcls', 'siege', 3], desc: 'Own 3 siege units' }, fx: { landBonus: 4 } });
  pair({ id: 'e_western_route', name: 'Western Route', joke: 'We Just Kept Sailing West', trigger: { type: 'threshold', cond: ['explored', 900], desc: 'Explore 900 tiles' }, fx: { reconMoves: 1, navalMoves: 1 } },
       { id: 'e_eastern_route', name: 'Eastern Route', joke: 'Turns Out East Was Also An Option', trigger: { type: 'discovery', cond: ['abroad', 1], desc: 'Found a settlement on another continent' }, fx: { distantProduction: 3 } });
  pair({ id: 'e_royal_charter', name: 'Royal Charter', joke: 'The Crown Signed Off On It, Probably', trigger: { type: 'threshold', cond: ['settlements', 5], desc: 'Found 5 settlements' }, fx: { settlerCostMult: 0.85 } },
       { id: 'e_private_ledger', name: 'Private Ledger', joke: "Nobody Else Gets To See This Book", trigger: { type: 'threshold', cond: ['military', 10], desc: 'Own 10 military units' }, fx: { freeUpkeep: 3 } });
  node({ id: 'e_forbidden_city', pool: B, name: 'Forbidden City', joke: 'Nobody Is Allowed In Except Basically Everyone Important', trigger: { type: 'threshold', cond: ['building', 'printing_house', 2], desc: 'Build 2 Printing Houses' }, fx: { happinessBonus: 1 }, unlocks: { wonder: 'forbidden_city' } });
  node({ id: 'e_ironworks_node', pool: B, name: 'Iron Forges', joke: 'The Forges Never Really Stop Now', trigger: { type: 'threshold', cond: ['improvement', 'mine', 6], desc: 'Work 6 Mines' }, fx: { capitalYields: { production: 2 } }, unlocks: { national: 'ironworks' } });
  node({ id: 'e_national_treasury_node', pool: B, name: 'Treasury Vaults', joke: 'We Built A Room Just For Money', trigger: { type: 'threshold', cond: ['gold', 600], desc: 'Hold 600 Gold in the treasury' }, fx: { goldPerSettlement: 1 }, unlocks: { national: 'national_treasury' } });
  node({ id: 'e_national_university_node', pool: B, name: 'Great Library Wing', joke: 'The Library Got A Whole New Wing', trigger: { type: 'threshold', cond: ['building', 'printing_house', 3], desc: 'Build 3 Printing Houses' }, fx: { sciencePerSettlement: 1 }, unlocks: { national: 'national_university' } });
  node({ id: 'e_national_museum_node', pool: B, name: 'Royal Collection', joke: 'The King Just Kept All The Nice Paintings', trigger: { type: 'threshold', cond: ['building', 'museum', 2], desc: 'Build 2 Museums' }, fx: { culturePerSettlement: 1 }, unlocks: { national: 'national_museum' } });
  node({ id: 'e_almanac', pool: B, name: "Farmer's Almanac", joke: 'A Book That Tells You When To Plant Things', trigger: { type: 'discovery', cond: ['event', 'natural'], turns: 15, desc: 'Know a natural wonder for 15 turns' }, fx: { capitalYields: { culture: 2 } } });
  N.forEach(function (n) { V2.NODES.push(n); V2.NODE_BY_ID[n.id] = n; });
  // ---- Narrative hubs (5) ----
  var HUBS = [
    { id: 'presshouse_deal', name: 'The Presses Start Running', when: ['node', 'e_presshouse'], branches: [
      { id: 'sell_it', name: 'Print Whatever Sells', fx: { goldPerSettlement: 1 } },
      { id: 'truth_it', name: 'Print The Truth, Mostly', fx: { attitudeBonus: 8 } },
      { id: 'flood_it', name: 'Print Everything Nobody Asked For', fx: { culturePerSettlement: 1 } }] },
    { id: 'counting_house_deal', name: 'The Vault Is Full Now', when: ['node', 'e_counting_house'], branches: [
      { id: 'loan_it', name: 'Loan It Out', fx: { yieldMult: { gold: 1.1 } } },
      { id: 'lock_it', name: 'Keep It Locked Up', fx: { homeDefenseBonus: 4 } },
      { id: 'spend_it', name: 'Spend It All Immediately', fx: { purchaseMult: 0.9 } }] },
    { id: 'gunsmith_deal', name: 'The Guns Are Ready', when: ['node', 'e_gunsmith'], branches: [
      { id: 'arm_all', name: 'Arm Everyone', fx: { unitCostMult: 0.85 } },
      { id: 'arm_pros', name: 'Arm The Professionals Only', fx: { combatBonus: 3, xpMult: 1.3 } },
      { id: 'arm_none', name: 'Keep Them In A Warehouse Just In Case', fx: { freeUpkeep: 3 } }] },
    { id: 'world_stage', name: "Everyone's Trading With Everyone Now", when: ['met', 3], branches: [
      { id: 'ambassador', name: 'We Send An Ambassador', fx: { attitudeBonus: 12 } },
      { id: 'fleet', name: 'We Send A Fleet Instead', fx: { navalBonus: 3 } },
      { id: 'wave_dock', name: 'We Just Wave From The Dock', fx: { influencePerTurn: 2 } }] },
    { id: 'grand_tour', name: 'The Grand Tour Is Fashionable Now', when: ['wonders', 2], branches: [
      { id: 'tour_theirs', name: "We Tour Everyone Else's Wonders", fx: { culturePerSettlement: 1 } },
      { id: 'build_ours', name: 'We Build Our Own, Thanks', fx: { wonderCostMult: 0.9 } },
      { id: 'charge_tourists', name: 'We Just Charge Tourists', fx: { tourismMult: 1.15 } }] }
  ];
  HUBS.forEach(function (h) { V2.HUBS.push(h); V2.HUB_BY_ID[h.id] = h; });
  // ---- Turning Point into the next era ----
  var TP = { name: 'The Puffstack Age Is Coming', branches: [
      { id: 'e_tp_industrious', name: "The Foundries' Way", fx: { buildingCostMult: 0.9 } },
      { id: 'e_tp_militant', name: "The Muskets' Way", fx: { unitCostMult: 0.9, combatBonus: 1 } },
      { id: 'e_tp_mercantile', name: "The Ledgers' Way", fx: { goldPerSettlement: 1 } }] };
  TP.id = 'turning:' + E; TP.turning = E; V2.TURNING[E] = TP; V2.HUBS.push(TP); V2.HUB_BY_ID[TP.id] = TP;
  // ---- Unit joke names ----
  Object.assign(V2.UNITS, { musketman: { joke: 'Boom Stick Guy' }, bombard: { joke: 'Big Boom Wagon' }, caravel: { joke: 'Fancy Float Guy' } });
})(globalThis.AU = globalThis.AU || {});
