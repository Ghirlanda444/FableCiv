// Technologies (104, eight eras) with sparks, civics (64) with insights, policy cards and governments.
// Nothing resets between eras. Spark/inspiration: meeting the condition instantly grants 40% of the cost.
(function (AU) {
  AU.ERAS = ['Ancient', 'Classical', 'Medieval', 'Renaissance', 'Industrial', 'Modern', 'Atomic', 'Information'];
  var ERA_COST = [30, 130, 300, 560, 860, 1250, 1750, 2400];

  // Condition shorthand: [type, arg, n]. Evaluated every turn against the empire's state or event flags.
  function T(id, name, era, step, pre, eureka, extra) {
    var t = { id: id, name: name, era: era, cost: Math.round(ERA_COST[era] * (1 + step * 0.09)), pre: pre || [] };
    if (eureka) { t.eureka = { desc: eureka[0], cond: eureka[1] }; }
    if (extra) for (var k in extra) t[k] = extra[k];
    return t;
  }
  AU.TECHS = [
    // ---- Ancient
    T('pottery', 'Ceramics', 0, 0, [], ['Own a settlement with 3 population', ['pop', 3]]),
    T('animal_husbandry', 'Herding', 0, 0, [], ['Work a Pasture', ['improvement', 'pasture', 1]]),
    T('mining', 'Prospecting', 0, 0, [], ['Work a Mine or Quarry', ['improvement', 'mine|quarry', 1]]),
    T('hunting', 'Trapping', 0, 1, [], ['Work a Camp', ['improvement', 'camp', 1]], { fx: { tileBonus: [{ when: 'camp', yields: { production: 1 } }] }, desc: 'Camps yield +1 Production.' }),
    T('fishing', 'Net Fishing', 0, 1, [], ['Found a coastal settlement', ['coastal', 1]], { fx: { tileBonus: [{ when: 'fishing', yields: { food: 1 } }] }, desc: 'Fishing Boats yield +1 Food.' }),
    T('sailing', 'Seafaring', 0, 2, ['fishing'], ['Own 2 coastal settlements', ['coastal', 2]], { embark: true }),
    T('mysticism', 'Omens', 0, 2, [], ['Build a Monument', ['building', 'monument', 1]]),
    T('irrigation', 'Water Channels', 0, 3, ['pottery'], ['Work 3 Farms', ['improvement', 'farm', 3]]),
    T('archery', 'Bowcraft', 0, 3, ['hunting'], ['Kill a unit with a Sling Hunter', ['event', 'killSlinger']]),
    T('writing', 'Script', 0, 4, ['pottery'], ['Meet another empire', ['met', 1]]),
    T('masonry', 'Stonework', 0, 5, ['mining'], ['Work a Quarry or own 2 Hills tiles', ['tiles', 'hills', 2]]),
    T('bronze_working', 'Bronze Casting', 0, 5, ['mining'], ['Kill 2 units', ['kills', 2]]),
    T('wheel', 'Cartwright', 0, 6, ['mining', 'animal_husbandry'], ['Work Horses or Cattle', ['resource', 'horses|cattle', 1]]),
    // ---- Classical
    T('celestial_navigation', 'Star Charts', 1, 0, ['sailing', 'mysticism'], ['Build a Lighthouse', ['building', 'lighthouse', 1]]),
    T('currency', 'Coinage', 1, 0, ['writing'], ['Have 200 Gold in the treasury', ['gold', 200]]),
    T('horseback_riding', 'Horsemanship', 1, 1, ['archery', 'wheel'], ['Work Horses', ['resource', 'horses', 1]]),
    T('iron_working', 'Ironsmithing', 1, 1, ['bronze_working'], ['Work Iron', ['resource', 'iron', 1]]),
    T('calendar', 'Almanac', 1, 2, ['irrigation', 'mysticism'], ['Work a Plantation', ['improvement', 'plantation', 1]], { fx: { tileBonus: [{ when: 'plantation', yields: { culture: 1 } }] }, desc: 'Plantations yield +1 Heritage.' }),
    T('shipbuilding', 'Shipwrights', 1, 3, ['sailing'], ['Build a Oarship', ['unit', 'galley', 1]]),
    T('mathematics', 'Geometry', 1, 4, ['currency', 'calendar'], ['Build a Library', ['building', 'library', 1]]),
    T('roads', 'Paved Roads', 1, 4, ['wheel', 'currency'], ['Own 3 settlements', ['settlements', 3]], { fx: { homeMoves: 1 }, desc: 'Units +1 Movement inside your borders.' }),
    T('construction', 'Building Craft', 1, 5, ['masonry', 'horseback_riding'], ['Build Walls', ['building', 'walls', 1]]),
    T('engineering', 'Arches', 1, 6, ['wheel', 'masonry'], ['Own a settlement on a river', ['river', 1]]),
    T('optics', 'Lenses', 1, 6, ['shipbuilding', 'writing'], ['Own 2 naval units', ['unitcls', 'naval', 2]], { fx: { reconSight: 1 }, desc: 'Pathfinders and naval units see 1 tile further.' }),
    T('herbalism', 'Remedies', 1, 7, ['irrigation', 'hunting'], ['Work 4 Forest or Rainforest tiles', ['feature', 'forest|jungle', 4]], { fx: { healBonusAll: 5 }, desc: 'Units heal +5 HP per turn.' }),
    T('metallurgy', 'Smelting', 1, 8, ['iron_working', 'engineering'], ['Own 3 Swordbearers or Spearmen', ['unitcls', 'melee|antcav', 3]], { fx: { classBonus: { melee: 1, antcav: 1 } }, desc: 'Melee and anti-cavalry units +1 Strength.' }),
    // ---- Medieval
    T('military_tactics', 'Battle Drill', 2, 0, ['mathematics', 'metallurgy'], ['Kill a unit with a Spear Guard', ['event', 'killSpear']]),
    T('apprenticeship', 'Trade Skills', 2, 0, ['currency', 'horseback_riding'], ['Work 3 Mines', ['improvement', 'mine', 3]]),
    T('machinery', 'Gearwork', 2, 1, ['iron_working', 'engineering'], ['Own 3 Bowmen', ['unitcls', 'ranged', 3]]),
    T('compass', 'Lodestone', 2, 1, ['celestial_navigation', 'optics'], ['Build a Harbor', ['building', 'harbor', 1]], { fx: { navalMoves: 1 }, desc: 'Naval units +1 Movement.' }),
    T('education', 'Schooling', 2, 2, ['apprenticeship', 'mathematics'], ['Own 2 Libraries', ['building', 'library', 2]]),
    T('paper', 'Papermaking', 2, 3, ['writing', 'calendar'], ['Learn 12 civics', ['civics', 12]], { fx: { yieldMult: { science: 1.05 } }, desc: '+5% Knowledge.' }),
    T('stirrups', 'Saddlery', 2, 3, ['horseback_riding', 'military_tactics'], ['Own 2 Horsemen', ['unitcls', 'cavalry', 2]]),
    T('three_field_system', 'Crop Rotation', 2, 4, ['irrigation', 'apprenticeship'], ['Own a settlement with 8 population', ['pop', 8]], { fx: { tileBonus: [{ when: 'farm', yields: { food: 1 } }] }, desc: 'Farms yield +1 Food.' }),
    T('military_engineering', 'Siegecraft', 2, 5, ['construction', 'machinery'], ['Build a Stone Thrower', ['unit', 'catapult', 1]]),
    T('castles', 'Keeps', 2, 5, ['construction', 'roads'], ['Own 3 settlements with Walls', ['building', 'walls', 3]]),
    T('alchemy', 'Elixirs', 2, 6, ['herbalism', 'education'], ['Work 2 Luxury resources', ['resourcekind', 'luxury', 2]], { fx: { luxuryGold: 1 }, desc: 'Each worked Luxury yields +1 Gold in the capital.' }),
    T('heraldry', 'Crests', 2, 7, ['stirrups', 'castles'], ['Own a level-2 unit', ['level', 2]], { fx: { xpMult: 1.25 }, desc: 'Units gain experience 25% faster.' }),
    T('clockwork', 'Clockmaking', 2, 8, ['machinery', 'paper'], ['Own a University', ['building', 'university', 1]], { fx: { yieldMult: { production: 1.05 } }, desc: '+5% Production.' }),
    // ---- Renaissance
    T('cartography', 'Mapmaking', 3, 0, ['compass', 'shipbuilding'], ['Own 3 coastal settlements', ['coastal', 3]], { ocean: true }),
    T('mass_production', 'Manufactories', 3, 0, ['education', 'clockwork'], ['Build a Workshop', ['building', 'workshop', 1]]),
    T('banking', 'Ledgers', 3, 1, ['education', 'alchemy'], ['Own 2 Markets', ['building', 'market', 2]]),
    T('gunpowder', 'Black Powder', 3, 1, ['military_engineering', 'alchemy'], ['Work Niter', ['resource', 'niter', 1]]),
    T('printing', 'Movable Type', 3, 2, ['machinery', 'paper'], ['Own 2 Universities', ['building', 'university', 2]]),
    T('astronomy', 'Telescopes', 3, 3, ['education', 'compass'], ['Own a settlement next to Mountains', ['adjacent', 'mountain', 1]]),
    T('square_rigging', 'Tall Ships', 3, 3, ['cartography', 'gunpowder'], ['Kill a unit with a naval unit', ['event', 'killNaval']], { fx: { navalBonus: 2 }, desc: 'Naval units +2 Strength.' }),
    T('metal_casting', 'Foundries', 3, 4, ['gunpowder', 'mass_production'], ['Own 2 Bombards or Stone Thrower', ['unitcls', 'siege', 2]]),
    T('anatomy', 'Surgery', 3, 5, ['herbalism', 'printing'], ['Build an Aqueduct', ['building', 'aqueduct', 1]], { fx: { growthMult: 1.05 }, desc: '+5% growth.' }),
    T('siege_tactics', 'Bombardment', 3, 6, ['metal_casting', 'castles'], ['Capture a settlement', ['event', 'capture']]),
    T('scientific_method', 'Experiments', 3, 6, ['astronomy', 'printing'], ['Own 3 Universities', ['building', 'university', 3]], { fx: { yieldMult: { science: 1.05 } }, desc: '+5% Knowledge.' }),
    T('joint_stock', 'Chartered Companies', 3, 7, ['banking', 'cartography'], ['Have 1000 Gold', ['gold', 1000]], { fx: { yieldMult: { gold: 1.1 } }, desc: '+10% Gold.' }),
    T('fortification', 'Bastions', 3, 8, ['siege_tactics', 'metal_casting'], ['Own 2 Castles', ['building', 'castle', 2]], { fx: { cityDefense: 4 }, desc: 'Settlements +4 defense.' }),
    // ---- Industrial
    T('industrialization', 'Industry', 4, 0, ['mass_production', 'joint_stock'], ['Own 3 Workshops', ['building', 'workshop', 3]]),
    T('scientific_theory', 'Natural Laws', 4, 0, ['scientific_method', 'banking'], ['Own a Printing House', ['building', 'printing_house', 1]]),
    T('ballistics', 'Trajectories', 4, 1, ['metal_casting', 'scientific_method'], ['Own 2 Bombards', ['unit', 'bombard', 2]]),
    T('military_science', 'War College', 4, 1, ['printing', 'siege_tactics'], ['Own 3 Chevaliers or Musketmen', ['unitcls', 'cavalry|melee', 3]]),
    T('steam_power', 'Steam Engines', 4, 2, ['industrialization', 'square_rigging'], ['Work Coal', ['resource', 'coal', 1]]),
    T('sanitation', 'Public Health', 4, 3, ['anatomy', 'scientific_theory'], ['Own 2 Aqueducts', ['building', 'aqueduct', 2]]),
    T('economics', 'Free Markets', 4, 3, ['scientific_theory', 'joint_stock'], ['Own 2 Banks', ['building', 'bank', 2]]),
    T('rifling', 'Rifled Barrels', 4, 4, ['ballistics', 'military_science'], ['Own 3 Musketmen', ['unit', 'musketman', 3]]),
    T('railroad', 'Railways', 4, 5, ['steam_power', 'fortification'], ['Own 2 Factories', ['building', 'factory', 2]], { fx: { homeMoves: 1 }, desc: 'Units +1 extra Movement inside your borders.' }),
    T('telegraph', 'Telegraphy', 4, 5, ['scientific_theory', 'railroad'], ['Meet 4 empires', ['met', 4]]),
    T('mass_agriculture', 'Tractors', 4, 6, ['sanitation', 'industrialization'], ['Own a settlement with 15 population', ['pop', 15]], { fx: { tileBonus: [{ when: 'farm', yields: { food: 1 } }, { when: 'pasture', yields: { food: 1 } }] }, desc: 'Farms and Pastures +1 Food.' }),
    T('explosives', 'Dynamite', 4, 7, ['rifling', 'railroad'], ['Own 2 Field Cannons', ['unit', 'field_cannon', 2]], { fx: { classBonus: { siege: 3 } }, desc: 'Siege units +3 Strength.' }),
    T('refining', 'Oil Refining', 4, 8, ['economics', 'steam_power'], ['Own 2 Power-hungry Factories… own 3 Factories', ['building', 'factory', 3]]),
    // ---- Modern
    T('electricity', 'Dynamos', 5, 0, ['steam_power', 'telegraph'], ['Own 3 Factories', ['building', 'factory', 3]]),
    T('radio', 'Wireless', 5, 0, ['electricity', 'telegraph'], ['Own 2 Museums', ['building', 'museum', 2]]),
    T('chemistry', 'Compounds', 5, 1, ['sanitation', 'refining'], ['Own 2 Research Labs… own 2 Universities and a Hospital', ['building', 'hospital', 1]]),
    T('steel', 'Steelmaking', 5, 1, ['rifling', 'railroad'], ['Own 2 Ironclads', ['unit', 'ironclad', 2]]),
    T('replaceable_parts', 'Interchangeable Parts', 5, 2, ['economics', 'rifling'], ['Own 3 Riflemen', ['unit', 'rifleman', 3]]),
    T('flight', 'Aviation', 5, 3, ['steel', 'electricity'], ['Own 3 Broadcast Towers… own a Stock Exchange', ['building', 'stock_exchange', 1]]),
    T('ideology_tech', 'Mass Movements', 5, 3, ['radio', 'economics'], ['Adopt an Industrial-era civic', ['civicera', 4]]),
    T('refrigeration', 'Cold Storage', 5, 4, ['electricity', 'mass_agriculture'], ['Own a settlement with 20 population', ['pop', 20]], { fx: { growthMult: 1.1 }, desc: '+10% growth.' }),
    T('automobile', 'Motorcars', 5, 5, ['steel', 'refining'], ['Work Oil', ['resource', 'oil', 1]], { fx: { homeMoves: 1 }, desc: 'Units +1 extra Movement inside your borders.' }),
    T('combustion', 'Engines', 5, 5, ['steel', 'replaceable_parts', 'refining'], ['Own 2 Artillery', ['unit', 'artillery', 2]]),
    T('electronics', 'Circuits', 5, 6, ['radio', 'flight'], ['Own 3 Research Labs… own 2 Broadcast Towers', ['building', 'broadcast_tower', 2]]),
    T('advanced_ballistics', 'Precision Guns', 5, 7, ['combustion', 'ballistics'], ['Own 2 Machine Guns', ['unit', 'machine_gun', 2]], { fx: { classBonus: { ranged: 3, siege: 3 } }, desc: 'Ranged and siege units +3 Strength.' }),
    T('telecommunications', 'Telephony', 5, 8, ['electronics', 'ideology_tech'], ['Own 3 Broadcast Towers', ['building', 'broadcast_tower', 3]], { fx: { yieldMult: { culture: 1.1 } }, desc: '+10% Heritage.' }),
    // ---- Atomic
    T('plastics', 'Polymers', 6, 0, ['combustion', 'chemistry'], ['Own 3 Power Plants… own 2 Power Plants', ['building', 'power_plant', 2]]),
    T('computers', 'Computing', 6, 0, ['electronics', 'telecommunications'], ['Own 3 Research Labs', ['building', 'research_lab', 3]]),
    T('rocketry', 'Rockets', 6, 1, ['combustion', 'advanced_ballistics'], ['Own 2 Artillery and a Military Academy', ['building', 'military_academy', 1]]),
    T('radar', 'Radar Arrays', 6, 1, ['electronics', 'advanced_ballistics'], ['Own 2 Airports', ['building', 'airport', 2]], { fx: { reconSight: 1, cityDefense: 3 }, desc: 'Settlements +3 defense; scouts see further.' }),
    T('penicillin', 'Antibiotics', 6, 2, ['chemistry', 'refrigeration'], ['Own 3 Hospitals', ['building', 'hospital', 3]], { fx: { healBonusAll: 10, happinessBonus: 1 }, desc: 'Units heal +10; +1 Happiness per settlement.' }),
    T('nuclear_fission', 'The Atom', 6, 3, ['plastics', 'computers'], ['Own 3 Research Labs and 2 Power Plants', ['building', 'power_plant', 3]]),
    T('combined_arms', 'Blitz Warfare', 6, 3, ['rocketry', 'radar'], ['Own 2 Tanks', ['unit', 'tank', 2]]),
    T('synthetic_materials', 'Synthetics', 6, 4, ['plastics', 'refining'], ['Own 3 Factories with Power Plants… own 3 Power Plants', ['building', 'power_plant', 3]]),
    T('television', 'Broadcast TV', 6, 5, ['telecommunications', 'computers'], ['Own 2 Stadiums', ['building', 'stadium', 2]], { fx: { happinessBonus: 1, yieldMult: { culture: 1.05 } }, desc: '+1 Happiness per settlement, +5% Heritage.' }),
    T('advanced_flight', 'Supersonic Flight', 6, 5, ['flight', 'combined_arms'], ['Own 3 Airports', ['building', 'airport', 3]]),
    T('jet_engines', 'Turbojets', 6, 6, ['advanced_flight', 'synthetic_materials'], ['Own 3 Airports and an Aluminium… own 2 Rocket Artillery', ['unit', 'rocket_artillery', 2]], { fx: { classMoves: { cavalry: 1 } }, desc: 'Armored units +1 Movement.' }),
    T('satellites', 'Orbit', 6, 7, ['rocketry', 'computers'], ['Complete the Launch Earth Satellite project… own a Computer Center', ['building', 'computer_center', 1]]),
    T('nuclear_power', 'Reactors', 6, 8, ['nuclear_fission', 'synthetic_materials'], ['Own 3 Power Plants', ['building', 'power_plant', 3]]),
    // ---- Information
    T('spaceflight', 'Space Travel', 7, 0, ['satellites', 'plastics'], ['Complete the Moon Landing… complete the Launch Earth Satellite project', ['project', 'launch_satellite']]),
    T('robotics', 'Automation', 7, 0, ['computers', 'nuclear_power'], ['Own 2 Computer Centers', ['building', 'computer_center', 2]], { fx: { yieldMult: { production: 1.1 } }, desc: '+10% Production.' }),
    T('lasers', 'Laser Optics', 7, 1, ['nuclear_power', 'satellites'], ['Own 3 Computer Centers', ['building', 'computer_center', 3]], { fx: { classBonus: { ranged: 4, siege: 4 } }, desc: 'Ranged and siege units +4 Strength.' }),
    T('the_internet', 'Networks', 7, 2, ['computers', 'television'], ['Own 4 Computer Centers… own 3 Computer Centers', ['building', 'computer_center', 3]]),
    T('genetics', 'Genomics', 7, 2, ['penicillin', 'computers'], ['Own 4 Hospitals', ['building', 'hospital', 4]], { fx: { growthMult: 1.15, happinessBonus: 1 }, desc: '+15% growth, +1 Happiness per settlement.' }),
    T('composites', 'Carbon Fibre', 7, 3, ['synthetic_materials', 'lasers'], ['Own 3 Tanks', ['unit', 'tank', 3]]),
    T('stealth', 'Stealth Coating', 7, 4, ['jet_engines', 'composites'], ['Own 2 Mechanized Regulars', ['unit', 'mech_infantry', 2]], { fx: { classBonus: { melee: 4 } }, desc: 'Melee units +4 Strength.' }),
    T('guidance_systems', 'Smart Weapons', 7, 5, ['lasers', 'spaceflight'], ['Own 3 Rocket Artillery', ['unit', 'rocket_artillery', 3]], { fx: { vsSettlements: 8 }, desc: 'Units +8 Strength vs settlements.' }),
    T('nanotechnology', 'Nanomachines', 7, 5, ['robotics', 'genetics'], ['Own 4 Research Labs', ['building', 'research_lab', 4]], { fx: { yieldMult: { science: 1.1 } }, desc: '+10% Knowledge.' }),
    T('artificial_intelligence', 'Thinking Machines', 7, 6, ['the_internet', 'robotics'], ['Own 5 Computer Centers… own 4 Computer Centers', ['building', 'computer_center', 4]], { fx: { yieldMult: { science: 1.1, gold: 1.1 } }, desc: '+10% Knowledge and Gold.' }),
    T('fusion', 'Fusion Power', 7, 7, ['nuclear_power', 'nanotechnology'], ['Own 4 Power Plants', ['building', 'power_plant', 4]], { fx: { yieldMult: { production: 1.15 } }, desc: '+15% Production.' }),
    T('quantum_computing', 'Qubits', 7, 8, ['artificial_intelligence', 'fusion'], ['Complete the Moon Landing project', ['project', 'moon_landing']], { fx: { projectCostMult: 0.75 }, desc: 'Space projects cost 25% less.' }),
    T('future_tech', 'Next Horizon', 7, 9, ['quantum_computing', 'stealth', 'guidance_systems'], ['Reach 5000 Gold', ['gold', 5000]], { fx: { happinessBonus: 2 }, desc: '+2 Happiness per settlement. The road goes ever on.' })
  ];
  // Clean up eureka descriptions that were drafted with an alternative (keep the text after the ellipsis)
  AU.TECHS.forEach(function (t) { if (t.eureka && t.eureka.desc.indexOf('… ') >= 0) { var d = t.eureka.desc.split('… ')[1]; t.eureka.desc = d.charAt(0).toUpperCase() + d.slice(1); } });
  AU.TECH_BY_ID = {}; AU.TECHS.forEach(function (t) { AU.TECH_BY_ID[t.id] = t; });

  // ---------- Civics ----------
  var CIVIC_COST = [25, 110, 260, 500, 800, 1150, 1600, 2200];
  function C(id, name, era, step, pre, insp, extra) {
    var c = { id: id, name: name, era: era, cost: Math.round(CIVIC_COST[era] * (1 + step * 0.1)), pre: pre || [] };
    if (insp) c.inspiration = { desc: insp[0], cond: insp[1] };
    if (extra) for (var k in extra) c[k] = extra[k];
    return c;
  }
  AU.CIVICS = [
    C('code_of_laws', "First Laws", 0, 0, [], null, { unlocks: 'Autocracy, Oligarchy', cards: ['discipline', 'urban_planning'] }),
    C('craftsmanship', "Artisans", 0, 1, ['code_of_laws'], ['Work 3 tiles with improvements', ['improvedTiles', 3]], { cards: ['agoge', 'ilkum'] }),
    C('foreign_trade', "Caravans", 0, 1, ['code_of_laws'], ['Meet another empire', ['met', 1]], { cards: ['caravansary'], fx: { goldPerSettlement: 1 } }),
    C('military_tradition', "War Bands", 0, 2, ['craftsmanship'], ['Disperse an Inchibil camp', ['event', 'camp']], { cards: ['survey', 'conscription'] }),
    C('state_workforce', "Corvée Labor", 0, 3, ['craftsmanship'], ['Build a wonder or a City hall… upgrade a Town into a City', ['cities', 2]], { cards: ['corvee'] }),
    C('early_empire', "First Kingdoms", 0, 3, ['foreign_trade'], ['Grow to 6 population in total', ['totalPop', 6]], { cards: ['colonization'] }),
    C('rituals', "Sacred Rites", 0, 4, ['foreign_trade'], ['Build a Shrine', ['building', 'shrine', 1]], { fx: { happinessBonus: 1 }, cards: ['god_king'] }),
    C('oral_tradition', "Storytellers", 0, 5, ['rituals'], ['Own 2 Monuments', ['building', 'monument', 2]], { fx: { culturePerSettlement: 1 } }),
    // Classical
    C('political_philosophy', "Statecraft", 1, 0, ['state_workforce', 'early_empire'], ['Meet 3 empires', ['met', 3]], { unlocks: 'Classical Republic' }),
    C('games_recreation', "Festivals", 1, 0, ['state_workforce'], ['Research Construction', ['tech', 'construction']], { fx: { happinessBonus: 1 }, cards: ['bread_circuses'] }),
    C('drama_poetry', "Theater", 1, 1, ['early_empire', 'oral_tradition'], ['Build a wonder', ['wonders', 1]], { cards: ['inspiration_card'] }),
    C('military_training', "Drill Yards", 1, 2, ['military_tradition', 'games_recreation'], ['Build a Barracks', ['building', 'barracks', 1]], { cards: ['maneuver', 'strategos'] }),
    C('recorded_history', "Chronicles", 1, 3, ['political_philosophy', 'drama_poetry'], ['Own 2 Libraries… build 2 wonders', ['wonders', 2]], { fx: { yieldMult: { science: 1.05 } }, cards: ['natural_philosophy'] }),
    C('defensive_tactics', "Watchtowers", 1, 3, ['games_recreation', 'political_philosophy'], ['Be the target of a declaration of war', ['event', 'warDeclaredOnUs']], { fx: { cityDefense: 3 }, cards: ['bastions', 'limes'] }),
    C('mysticism_civic', "Doctrine", 1, 4, ['rituals', 'drama_poetry'], ['Own 3 Shrines', ['building', 'shrine', 3]], { cards: ['scripture'] }),
    C('trade_league', "Merchant League", 1, 5, ['foreign_trade', 'political_philosophy'], ['Own 2 Markets', ['building', 'market', 2]], { fx: { townGoldMult: 1.1 }, cards: ['triangular_trade'] }),
    // Medieval
    C('feudalism', "Vassalage", 2, 0, ['defensive_tactics'], ['Own 6 Farms', ['improvement', 'farm', 6]], { fx: { tileBonus: [{ when: 'farm', yields: { food: 1 } }] }, cards: ['serfdom', 'feudal_contract'] }),
    C('civil_service', "Bureaucracy", 2, 0, ['defensive_tactics', 'recorded_history'], ['Own a City with 10 population', ['pop', 10]], { fx: { growthMult: 1.1 }, cards: ['meritocracy'] }),
    C('mercenaries', "Sellswords", 2, 1, ['feudalism', 'military_training'], ['Own 8 military units', ['military', 8]], { fx: { purchaseMult: 0.9 }, cards: ['sack'] }),
    C('guilds', "Craft Guilds", 2, 2, ['feudalism', 'civil_service', 'trade_league'], ['Own 2 Workshops… own 3 Markets', ['building', 'market', 3]], { fx: { townGoldMult: 1.1 }, cards: ['craftsmen'] }),
    C('divine_right', "Sacred Kingship", 2, 3, ['civil_service', 'mysticism_civic'], ['Build a Castle… own 2 Shrines and a Castle', ['building', 'castle', 1]], { unlocks: 'Monarchy, Theocracy' }),
    C('naval_tradition', "Admiralty", 2, 3, ['trade_league', 'military_training'], ['Own 3 naval units', ['unitcls', 'naval', 3]], { fx: { navalBonus: 2 }, cards: ['press_gangs'] }),
    C('exploration', "Great Voyages", 2, 4, ['mercenaries', 'naval_tradition'], ['Own 2 Harbors… own 2 Lighthouses', ['building', 'lighthouse', 2]], { fx: { navalMoves: 1 }, unlocks: 'Merchant Republic' }),
    C('medieval_faires', "Market Fairs", 2, 5, ['guilds'], ['Work 4 Luxury resources', ['resourcekind', 'luxury', 4]], { fx: { luxuryHappinessBonus: 0 , yieldMult: { gold: 1.05 } }, cards: ['merchant_confederation'] }),
    // Renaissance
    C('humanism', "Humanities", 3, 0, ['guilds', 'medieval_faires'], ['Build 3 wonders… build a Museum', ['building', 'museum', 1]], { fx: { yieldMult: { culture: 1.05 } }, cards: ['patronage'] }),
    C('diplomatic_service', "Embassies", 3, 0, ['guilds', 'exploration'], ['Make peace… be at peace with 3 met empires', ['peaceWith', 3]], { fx: { warWearinessMult: 0.75 }, cards: ['charismatic_leader'] }),
    C('reformed_church', "Reformation", 3, 1, ['divine_right'], ['Own 4 Shrines', ['building', 'shrine', 4]], { fx: { happinessBonus: 1 }, cards: ['religious_orders'] }),
    C('mercantilism', "Trade Monopolies", 3, 2, ['medieval_faires', 'diplomatic_service'], ['Own 3 Banks… own 2 Banks', ['building', 'bank', 2]], { fx: { yieldMult: { gold: 1.05 } }, cards: ['free_market'] }),
    C('enlightenment', "Age of Reason", 3, 3, ['humanism', 'diplomatic_service'], ['Own 3 Universities', ['building', 'university', 3]], { fx: { yieldMult: { science: 1.05 } }, cards: ['rationalism', 'liberalism'] }),
    C('colonialism', "Overseas Colonies", 3, 4, ['mercantilism', 'exploration'], ['Own a settlement on another continent', ['abroad', 1]], { fx: { abroadFreeBuilding: 'monument' }, cards: ['expropriation'] }),
    C('absolutism', "Court of the Sun", 3, 5, ['reformed_church', 'humanism'], ['Adopt Monarchy or Theocracy', ['government', 'monarchy|theocracy']], { fx: { capitalMult: { production: 1.1, gold: 1.1 } }, cards: ['grand_army'] }),
    C('the_arts', "Salons", 3, 6, ['humanism'], ['Build 4 wonders… own 2 Museums', ['building', 'museum', 2]], { fx: { culturePerWonder: 1 }, cards: ['art_collections'] }),
    // Industrial
    C('civil_engineering', "Public Works", 4, 0, ['enlightenment', 'colonialism'], ['Own 3 Factories… own 2 Workshops and an Aqueduct', ['building', 'aqueduct', 1]], { fx: { buildingCostMult: 0.9 }, cards: ['public_works'] }),
    C('nationalism', "Homeland", 4, 0, ['enlightenment', 'absolutism'], ['Fight a war for 20 turns', ['warTurns', 20]], { fx: { landBonus: 2 }, cards: ['national_identity'] }),
    C('opera_ballet', "Grand Stages", 4, 1, ['the_arts'], ['Own 3 Amphitheaters', ['building', 'amphitheater', 3]], { fx: { culturePerWonder: 1 }, cards: ['grand_opera'] }),
    C('natural_history', "Cabinets of Wonder", 4, 2, ['civil_engineering'], ['Own a Museum and a University in the same City… own 3 Libraries', ['building', 'library', 3]], { fx: { yieldMult: { science: 1.05 } }, cards: ['natural_history_card'] }),
    C('urbanization', "Metropolis", 4, 3, ['civil_engineering', 'nationalism'], ['Own 4 Cities', ['cities', 4]], { fx: { cityUpgradeCostMult: 0.8, growthMult: 1.1 }, cards: ['five_year_plan'] }),
    C('scorched_earth', "Ruthless War", 4, 3, ['nationalism'], ['Capture 2 settlements', ['captures', 2]], { fx: { vsSettlements: 4 }, cards: ['total_war'] }),
    C('capitalism', "Free Enterprise", 4, 4, ['mercantilism', 'urbanization'], ['Own 2 Stock Exchanges… own 3 Banks', ['building', 'bank', 3]], { fx: { yieldMult: { gold: 1.1 } }, cards: ['laissez_faire'] }),
    C('conservation', "Nature Reserves", 4, 5, ['natural_history', 'urbanization'], ['Own 10 Forest tiles', ['feature', 'forest', 10]], { fx: { tileBonus: [{ when: 'forest', yields: { culture: 1 } }] }, cards: ['parks'] }),
    // Modern
    C('ideology', "Great Ideologies", 5, 0, ['natural_history', 'urbanization', 'opera_ballet'], ['Research Mass Politics', ['tech', 'ideology_tech']], { unlocks: 'Democracy, Communism, Fascism' }),
    C('mass_media', "Press and Radio", 5, 1, ['ideology'], ['Own 2 Broadcast Towers… research Radio', ['tech', 'radio']], { fx: { happinessBonus: 1 }, cards: ['propaganda'] }),
    C('mobilization', "Home Front", 5, 1, ['ideology', 'scorched_earth'], ['Own 12 military units', ['military', 12]], { fx: { unitCostMult: 0.85 }, cards: ['levee_en_masse'] }),
    C('suffrage', "Universal Vote", 5, 2, ['mass_media', 'capitalism'], ['Adopt Democracy', ['government', 'democracy']], { fx: { happinessBonus: 1, yieldMult: { gold: 1.05 } }, cards: ['new_deal'] }),
    C('totalitarianism', "Iron Rule", 5, 2, ['mobilization'], ['Adopt Fascism or Communism', ['government', 'fascism|communism']], { fx: { combatBonus: 2 }, cards: ['martial_law'] }),
    C('class_struggle', "Workers' Movement", 5, 3, ['ideology', 'capitalism'], ['Own 3 Factories', ['building', 'factory', 3]], { fx: { yieldMult: { production: 1.05 } }, cards: ['collectivization'] }),
    C('cultural_heritage', "Heritage Sites", 5, 4, ['conservation', 'mass_media'], ['Own 3 Museums', ['building', 'museum', 3]], { fx: { culturePerSettlement: 1, tourismMult: 0.25 }, cards: ['heritage_tourism'] }),
    C('cold_war', "Iron Curtain", 5, 5, ['totalitarianism', 'suffrage'], ['Research Nuclear Fission… research Rocketry', ['tech', 'rocketry']], { fx: { cityDefense: 3 }, cards: ['military_research'] }),
    // Atomic
    C('professional_sports', "Stadium Leagues", 6, 0, ['mass_media', 'cultural_heritage'], ['Own 2 Stadiums', ['building', 'stadium', 2]], { fx: { happinessBonus: 2 }, cards: ['sports_media'] }),
    C('rapid_deployment', "Airlift Doctrine", 6, 1, ['cold_war', 'mobilization'], ['Own 3 Airports… own 2 Airports', ['building', 'airport', 2]], { fx: { classMoves: { melee: 1, ranged: 1 } }, cards: ['lightning_warfare'] }),
    C('space_race', "Moonshot", 6, 2, ['cold_war', 'class_struggle'], ['Research Rocketry', ['tech', 'rocketry']], { fx: { projectCostMult: 0.8 }, cards: ['space_program'] }),
    C('environmentalism', "Green Movement", 6, 3, ['conservation', 'professional_sports'], ['Own 15 Forest tiles', ['feature', 'forest', 15]], { fx: { happinessBonus: 1 }, cards: ['green_economy'] }),
    C('globalization', "World Markets", 6, 4, ['space_race', 'suffrage'], ['Meet every other empire', ['metAll', 1]], { fx: { yieldMult: { gold: 1.1, science: 1.05 } }, cards: ['multinationals'] }),
    C('social_media', "Viral Heritage", 6, 5, ['professional_sports', 'globalization'], ['Research The Internet', ['tech', 'the_internet']], { fx: { yieldMult: { culture: 1.1 } }, cards: ['online_communities'] }),
    // Information
    C('digital_democracy', "E-Democracy", 7, 0, ['social_media', 'globalization'], ['Research Artificial Intelligence… research Computers', ['tech', 'computers']], { fx: { happinessBonus: 1, yieldMult: { science: 1.05 } }, cards: ['open_data'] }),
    C('corporate_libertarianism', "Megacorporations", 7, 1, ['globalization'], ['Own 3 Stock Exchanges', ['building', 'stock_exchange', 3]], { fx: { yieldMult: { gold: 1.15 } }, cards: ['venture_capital'] }),
    C('synthetic_technocracy', "Technocracy", 7, 2, ['digital_democracy', 'space_race'], ['Research Robotics', ['tech', 'robotics']], { fx: { yieldMult: { production: 1.1 } }, cards: ['automation'] }),
    C('smart_power', "Balanced Power", 7, 3, ['rapid_deployment', 'digital_democracy'], ['Research Lasers… research Guidance Systems', ['tech', 'guidance_systems']], { fx: { combatBonus: 3 }, cards: ['integrated_command'] }),
    C('exodus_imperative', "Star Exodus", 7, 4, ['synthetic_technocracy', 'smart_power'], ['Complete the Moon Landing project', ['project', 'moon_landing']], { fx: { projectCostMult: 0.8 }, cards: ['final_frontier'] }),
    C('cultural_hegemony', "Global Heritage", 7, 5, ['social_media', 'corporate_libertarianism'], ['Own 4 Broadcast Towers', ['building', 'broadcast_tower', 4]], { fx: { culturePerSettlement: 2 } })
  ];
  AU.CIVICS.forEach(function (c) { if (c.inspiration && c.inspiration.desc.indexOf('… ') >= 0) { var d = c.inspiration.desc.split('… ')[1]; c.inspiration.desc = d.charAt(0).toUpperCase() + d.slice(1); } });
  AU.CIVIC_BY_ID = {}; AU.CIVICS.forEach(function (c) { AU.CIVIC_BY_ID[c.id] = c; });

  // ---------- Policy cards (slotted into the government) ----------
  function P(id, name, type, desc, fx) { return { id: id, name: name, type: type, desc: desc, fx: fx }; }
  AU.POLICIES = {
    discipline: P('discipline', 'Discipline', 'military', '+5 Strength vs Inchibil units.', { vsIndependents: 5 }),
    urban_planning: P('urban_planning', 'Urban Planning', 'economic', '+1 Production in every settlement.', { citySiteYields: { production: 1 }, townYields: { gold: 1 } }),
    agoge: P('agoge', 'Agoge', 'military', 'Melee, ranged and anti-cavalry units cost 30% less.', { classCostMult: { melee: 0.7, ranged: 0.7, antcav: 0.7 } }),
    ilkum: P('ilkum', 'Ilkum', 'economic', 'Buildings cost 15% less.', { buildingCostMult: 0.85 }),
    caravansary: P('caravansary', 'Caravansary', 'economic', '+2 Gold per Trade Outpost and Town.', { townYields: { gold: 2 } }),
    survey: P('survey', 'Survey', 'military', 'Pathfinders see further and units gain XP 50% faster.', { reconSight: 1, xpMult: 1.5 }),
    conscription: P('conscription', 'Conscription', 'military', '3 extra free units of upkeep.', { freeUpkeep: 3 }),
    corvee: P('corvee', 'Corvée', 'economic', 'Wonders cost 15% less.', { wonderCostMult: 0.85 }),
    colonization: P('colonization', 'Colonization', 'economic', 'Pioneers cost 40% less.', { settlerCostMult: 0.6 }),
    god_king: P('god_king', 'God King', 'diplomatic', '+2 Heritage and +2 Gold in the capital.', { capitalYields: { culture: 2, gold: 2 } }),
    bread_circuses: P('bread_circuses', 'Bread and Circuses', 'economic', '+1 Happiness in every settlement.', { happinessBonus: 1 }),
    inspiration_card: P('inspiration_card', 'Muse', 'wildcard', '+10% Heritage.', { yieldMult: { culture: 1.1 } }),
    maneuver: P('maneuver', 'Maneuver', 'military', 'Cavalry units cost 30% less.', { classCostMult: { cavalry: 0.7 } }),
    strategos: P('strategos', 'Strategos', 'military', 'Units heal +10 inside your borders.', { healBonusHome: 10 }),
    natural_philosophy: P('natural_philosophy', 'Natural Philosophy', 'wildcard', '+10% Knowledge.', { yieldMult: { science: 1.1 } }),
    bastions: P('bastions', 'Bastions', 'military', 'Settlements +6 defense and their walls always fire.', { cityDefense: 6, cityAttackNoWalls: true }),
    limes: P('limes', 'Limes', 'military', 'Walls cost 50% less; +4 Strength defending inside your borders.', { homeDefenseBonus: 4 }),
    scripture: P('scripture', 'Scripture', 'diplomatic', 'Shrines yield +2 Heritage.', { buildingBonus: { shrine: { culture: 2 } } }),
    triangular_trade: P('triangular_trade', 'Triangular Trade', 'economic', 'Towns convert Production to Gold at 120%.', { townGoldMult: 1.2 }),
    serfdom: P('serfdom', 'Serfdom', 'economic', 'Farms and Mines yield +1.', { tileBonus: [{ when: 'farm', yields: { food: 1 } }, { when: 'mine', yields: { production: 1 } }] }),
    feudal_contract: P('feudal_contract', 'Feudal Contract', 'military', 'Units cost 25% less.', { unitCostMult: 0.75 }),
    meritocracy: P('meritocracy', 'Meritocracy', 'economic', '+1 Knowledge and +1 Heritage per City.', { citySiteYields: { science: 1, culture: 1 } }),
    sack: P('sack', 'Sack', 'military', 'Capturing a settlement grants +150 Gold.', { captureGold: 150 }),
    craftsmen: P('craftsmen', 'Craftsmen', 'economic', 'Workshops and Factories +2 Production.', { buildingBonus: { workshop: { production: 2 }, factory: { production: 2 } } }),
    press_gangs: P('press_gangs', 'Press Gangs', 'military', 'Naval units cost 40% less.', { navalCostMult: 0.6 }),
    merchant_confederation: P('merchant_confederation', 'Merchant Confederation', 'diplomatic', '+2 Gold per settlement.', { goldPerSettlement: 2 }),
    patronage: P('patronage', 'Patronage', 'wildcard', 'Each wonder yields +2 Heritage.', { culturePerWonder: 2 }),
    charismatic_leader: P('charismatic_leader', 'Charismatic Leader', 'diplomatic', 'Other leaders like you more; less war weariness.', { attitudeDrift: 1, warWearinessMult: 0.5 }),
    religious_orders: P('religious_orders', 'Devout Orders', 'diplomatic', '+1 Happiness per settlement with a Shrine.', { happinessPerShrine: 1 }),
    free_market: P('free_market', 'Free Market', 'economic', 'Markets and Banks +3 Gold.', { buildingBonus: { market: { gold: 3 }, bank: { gold: 3 } } }),
    rationalism: P('rationalism', 'Rationalism', 'economic', 'Libraries and Universities +2 Knowledge.', { buildingBonus: { library: { science: 2 }, university: { science: 2 } } }),
    liberalism: P('liberalism', 'Liberalism', 'diplomatic', '+1 Happiness per settlement; purchases 10% cheaper.', { happinessBonus: 1, purchaseMult: 0.9 }),
    expropriation: P('expropriation', 'Expropriation', 'economic', 'Pioneers 50% cheaper; settlements abroad start with a Granary.', { settlerCostMult: 0.5, abroadFreeBuilding: 'granary' }),
    grand_army: P('grand_army', 'Grand Army', 'military', 'Land units +3 Strength.', { landBonus: 3 }),
    art_collections: P('art_collections', 'Art Collections', 'wildcard', 'Museums +4 Heritage.', { buildingBonus: { museum: { culture: 4 } } }),
    public_works: P('public_works', 'Public Works', 'economic', 'Buildings 20% cheaper; +1 Production per City.', { buildingCostMult: 0.8, citySiteYields: { production: 1 } }),
    national_identity: P('national_identity', 'National Identity', 'military', '+5 Strength defending inside your borders.', { homeDefenseBonus: 5 }),
    grand_opera: P('grand_opera', 'Grand Opera', 'wildcard', 'Amphitheaters +3 Heritage.', { buildingBonus: { amphitheater: { culture: 3 } } }),
    natural_history_card: P('natural_history_card', 'Natural History', 'wildcard', '+2 Knowledge per settlement next to a natural wonder or mountain.', { scienceNearMountains: 2 }),
    five_year_plan: P('five_year_plan', 'Five-Year Plan', 'economic', '+15% Production in Cities.', { cityYieldMult: { production: 1.15 } }),
    total_war: P('total_war', 'Total War', 'military', '+7 Strength vs settlements; no war weariness.', { vsSettlements: 7, warWearinessMult: 0 }),
    laissez_faire: P('laissez_faire', 'Laissez-Faire', 'economic', '+15% Gold.', { yieldMult: { gold: 1.15 } }),
    parks: P('parks', 'National Parks', 'wildcard', 'Forest tiles +1 Heritage and +1 Happiness per 4 forests… simplified: forests +1 Heritage, +1 Happiness per settlement.', { tileBonus: [{ when: 'forest', yields: { culture: 1 } }], happinessBonus: 1 }),
    propaganda: P('propaganda', 'Propaganda', 'diplomatic', 'No war weariness; +1 Happiness per settlement.', { warWearinessMult: 0, happinessBonus: 1 }),
    levee_en_masse: P('levee_en_masse', 'Levée en Masse', 'military', 'Units 35% cheaper.', { unitCostMult: 0.65 }),
    new_deal: P('new_deal', 'New Deal', 'economic', '+2 Happiness and +2 Food per City.', { citySiteYields: { food: 2, happiness: 2 } }),
    martial_law: P('martial_law', 'Martial Law', 'military', '+2 Happiness per settlement while at war; +3 Strength.', { happinessBonus: 2, combatBonus: 3 }),
    collectivization: P('collectivization', 'Collectivization', 'economic', 'Farms +2 Food.', { tileBonus: [{ when: 'farm', yields: { food: 2 } }] }),
    heritage_tourism: P('heritage_tourism', 'Heritage Fame', 'diplomatic', 'Each wonder yields +3 Gold and +25% Fame.', { goldPerWonder: 3, tourismMult: 0.25 }),
    military_research: P('military_research', 'Military Research', 'military', 'Military Academies +5 Knowledge.', { buildingBonus: { military_academy: { science: 5 } } }),
    sports_media: P('sports_media', 'Sports Media', 'wildcard', 'Stadiums +3 Heritage and +2 Happiness.', { buildingBonus: { stadium: { culture: 3, happiness: 2 } } }),
    lightning_warfare: P('lightning_warfare', 'Lightning Warfare', 'military', 'Armored and cavalry units +1 Movement and +4 Strength.', { classMoves: { cavalry: 1 }, classBonus: { cavalry: 4 } }),
    space_program: P('space_program', 'Space Program', 'wildcard', 'Space projects cost 30% less.', { projectCostMult: 0.7 }),
    green_economy: P('green_economy', 'Green Economy', 'economic', '+2 Happiness per settlement; Power Plants +3 Gold.', { happinessBonus: 2, buildingBonus: { power_plant: { gold: 3 } } }),
    multinationals: P('multinationals', 'Multinationals', 'economic', 'Stock Exchanges +6 Gold.', { buildingBonus: { stock_exchange: { gold: 6 } } }),
    online_communities: P('online_communities', 'Online Communities', 'diplomatic', '+15% Heritage.', { yieldMult: { culture: 1.15 } }),
    open_data: P('open_data', 'Open Data', 'wildcard', '+15% Knowledge.', { yieldMult: { science: 1.15 } }),
    venture_capital: P('venture_capital', 'Venture Capital', 'economic', 'Purchases 25% cheaper.', { purchaseMult: 0.75 }),
    automation: P('automation', 'Automation', 'economic', 'Factories +5 Production.', { buildingBonus: { factory: { production: 5 } } }),
    integrated_command: P('integrated_command', 'Integrated Command', 'military', 'All units +5 Strength.', { combatBonus: 5 }),
    final_frontier: P('final_frontier', 'Final Frontier', 'wildcard', 'Space projects cost 40% less.', { projectCostMult: 0.6 })
  };
  for (var pid in AU.POLICIES) { var pc = AU.POLICIES[pid]; if (pc.desc.indexOf('… ') >= 0) pc.desc = pc.desc.split('… simplified: ')[1] ? pc.desc.split('… simplified: ')[1].charAt(0).toUpperCase() + pc.desc.split('… simplified: ')[1].slice(1) : pc.desc; }

  // The kind of a civic for colouring: the dominant type of the cards it gives (military, economic, diplomatic, wildcard), else none.
  AU.civicKind = function (c) { if (!c || !c.cards || !c.cards.length) return ''; var n = {}; c.cards.forEach(function (k) { var pc = AU.POLICIES[k]; if (pc) n[pc.type] = (n[pc.type] || 0) + 1; }); var best = '', bn = 0; for (var k2 in n) if (n[k2] > bn) { bn = n[k2]; best = k2; } return best; };
  AU.GOVERNMENTS = {
    chiefdom:      { name: 'Chiefdom',           civic: null, desc: 'The starting government. One wildcard slot.', fx: {}, slots: { military: 0, economic: 0, diplomatic: 0, wildcard: 1 } },
    autocracy:     { name: 'Autocracy',          civic: 'code_of_laws', desc: '+10% Production in the capital, +2 Combat Strength.', fx: { capitalMult: { production: 1.1 }, combatBonus: 2 }, slots: { military: 1, economic: 1, diplomatic: 0, wildcard: 0 } },
    oligarchy:     { name: 'Oligarchy',          civic: 'code_of_laws', desc: 'Melee, anti-cavalry and cavalry units +4 Combat Strength.', fx: { meleeBonus: 4 }, slots: { military: 2, economic: 0, diplomatic: 0, wildcard: 0 } },
    classical_republic: { name: 'Classical Republic', civic: 'political_philosophy', desc: '+1 Happiness per settlement, +10% Heritage.', fx: { happinessBonus: 1, yieldMult: { culture: 1.1 } }, slots: { military: 0, economic: 1, diplomatic: 1, wildcard: 1 } },
    monarchy:      { name: 'Monarchy',           civic: 'divine_right', desc: '+50% defense from Walls, +1 Gold per settlement, +10% growth.', fx: { wallsMult: 1.5, goldPerSettlement: 1, growthMult: 1.1 }, slots: { military: 2, economic: 1, diplomatic: 1, wildcard: 0 } },
    theocracy:     { name: 'Theocracy',          civic: 'divine_right', desc: 'Purchases 15% cheaper, +2 Heritage per settlement.', fx: { purchaseMult: 0.85, culturePerSettlement: 2 }, slots: { military: 1, economic: 1, diplomatic: 2, wildcard: 0 } },
    merchant_republic: { name: 'Merchant Republic', civic: 'exploration', desc: '+15% Gold, Towns convert Production to Gold at 115%.', fx: { yieldMult: { gold: 1.15 }, townGoldMult: 1.15 }, slots: { military: 1, economic: 2, diplomatic: 1, wildcard: 0 } },
    democracy:     { name: 'Democracy',          civic: 'ideology', desc: '+15% Gold and Knowledge, +1 Happiness per settlement, units cost 10% more.', fx: { yieldMult: { gold: 1.15, science: 1.15 }, happinessBonus: 1, unitCostMult: 1.1 }, slots: { military: 1, economic: 3, diplomatic: 2, wildcard: 1 } },
    communism:     { name: 'Communism',          civic: 'ideology', desc: '+20% Production, +2 Happiness per settlement, -10% Gold.', fx: { yieldMult: { production: 1.2, gold: 0.9 }, happinessBonus: 2 }, slots: { military: 3, economic: 3, diplomatic: 1, wildcard: 0 } },
    fascism:       { name: 'Fascism',            civic: 'ideology', desc: '+5 Combat Strength, units cost 30% less, -1 Happiness per settlement.', fx: { combatBonus: 5, unitCostMult: 0.7, happinessBonus: -1 }, slots: { military: 4, economic: 1, diplomatic: 1, wildcard: 1 } }
  };

  AU.DIFFICULTIES = {
    settler:  { name: 'Newcomer',  aiYield: 0.75, playerYield: 1.2, aiUnits: 0, aiSettlers: 0, playerBonusGold: 100 },
    chieftain:{ name: 'Villager',aiYield: 0.9,  playerYield: 1.1, aiUnits: 0, aiSettlers: 0, playerBonusGold: 50 },
    prince:   { name: 'Duke',   aiYield: 1.0,  playerYield: 1.0, aiUnits: 1, aiSettlers: 0, playerBonusGold: 0 },
    king:     { name: 'Monarch',     aiYield: 1.2,  playerYield: 1.0, aiUnits: 2, aiSettlers: 0, playerBonusGold: 0 },
    emperor:  { name: 'Sovereign',  aiYield: 1.4,  playerYield: 1.0, aiUnits: 3, aiSettlers: 1, playerBonusGold: 0 },
    deity:    { name: 'Myth',    aiYield: 1.8,  playerYield: 1.0, aiUnits: 4, aiSettlers: 2, playerBonusGold: 0 }
  };
})(globalThis.AU = globalThis.AU || {});
