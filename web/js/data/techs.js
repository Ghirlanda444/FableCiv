// One continuous technology tree and one civics tree. Eras are labels only: nothing resets between them.
(function (AU) {
  AU.ERAS = ['Ancient', 'Classical', 'Medieval', 'Renaissance', 'Industrial', 'Modern', 'Atomic'];

  function T(id, name, era, cost, pre, extra) {
    var t = { id: id, name: name, era: era, cost: cost, pre: pre || [] };
    if (extra) for (var k in extra) t[k] = extra[k];
    return t;
  }
  AU.TECHS = [
    T('pottery', 'Pottery', 0, 25),
    T('animal_husbandry', 'Animal Husbandry', 0, 25),
    T('mining', 'Mining', 0, 25),
    T('sailing', 'Sailing', 0, 50, [], { embark: true }),
    T('mysticism', 'Mysticism', 0, 50),
    T('irrigation', 'Irrigation', 0, 50, ['pottery']),
    T('archery', 'Archery', 0, 50, ['animal_husbandry']),
    T('writing', 'Writing', 0, 50, ['pottery']),
    T('masonry', 'Masonry', 0, 80, ['mining']),
    T('bronze_working', 'Bronze Working', 0, 80, ['mining']),
    T('wheel', 'The Wheel', 0, 80, ['mining']),

    T('celestial_navigation', 'Celestial Navigation', 1, 120, ['sailing', 'mysticism']),
    T('currency', 'Currency', 1, 120, ['writing']),
    T('horseback_riding', 'Horseback Riding', 1, 120, ['archery']),
    T('iron_working', 'Iron Working', 1, 120, ['bronze_working']),
    T('shipbuilding', 'Shipbuilding', 1, 200, ['sailing']),
    T('mathematics', 'Mathematics', 1, 200, ['currency']),
    T('construction', 'Construction', 1, 200, ['masonry', 'horseback_riding']),
    T('engineering', 'Engineering', 1, 200, ['wheel']),

    T('military_tactics', 'Military Tactics', 2, 275, ['mathematics']),
    T('apprenticeship', 'Apprenticeship', 2, 275, ['currency', 'horseback_riding']),
    T('machinery', 'Machinery', 2, 275, ['iron_working', 'engineering']),
    T('education', 'Education', 2, 335, ['apprenticeship', 'mathematics']),
    T('stirrups', 'Stirrups', 2, 360, ['horseback_riding', 'military_tactics']),
    T('military_engineering', 'Military Engineering', 2, 390, ['construction']),
    T('castles', 'Castles', 2, 390, ['construction']),

    T('cartography', 'Cartography', 3, 490, ['shipbuilding', 'celestial_navigation'], { ocean: true }),
    T('mass_production', 'Mass Production', 3, 490, ['education', 'shipbuilding']),
    T('banking', 'Banking', 3, 490, ['education', 'stirrups']),
    T('gunpowder', 'Gunpowder', 3, 490, ['military_engineering', 'stirrups']),
    T('printing', 'Printing', 3, 490, ['machinery']),
    T('astronomy', 'Astronomy', 3, 600, ['education']),
    T('metal_casting', 'Metal Casting', 3, 660, ['gunpowder']),
    T('siege_tactics', 'Siege Tactics', 3, 660, ['metal_casting', 'castles']),

    T('industrialization', 'Industrialization', 4, 700, ['mass_production', 'printing']),
    T('scientific_theory', 'Scientific Theory', 4, 700, ['astronomy', 'banking']),
    T('ballistics', 'Ballistics', 4, 730, ['metal_casting']),
    T('military_science', 'Military Science', 4, 730, ['printing', 'siege_tactics']),
    T('steam_power', 'Steam Power', 4, 805, ['industrialization', 'cartography']),
    T('sanitation', 'Sanitation', 4, 805, ['scientific_theory']),
    T('economics', 'Economics', 4, 805, ['scientific_theory', 'banking']),
    T('rifling', 'Rifling', 4, 805, ['ballistics', 'military_science']),

    T('electricity', 'Electricity', 5, 985, ['steam_power']),
    T('radio', 'Radio', 5, 985, ['electricity']),
    T('chemistry', 'Chemistry', 5, 985, ['sanitation']),
    T('steel', 'Steel', 5, 1140, ['rifling', 'industrialization']),
    T('replaceable_parts', 'Replaceable Parts', 5, 1140, ['economics', 'rifling']),
    T('flight', 'Flight', 5, 1140, ['steel', 'electricity']),
    T('ideology_tech', 'Mass Politics', 5, 1140, ['radio', 'economics']),
    T('combustion', 'Combustion', 5, 1250, ['steel', 'replaceable_parts']),

    T('plastics', 'Plastics', 6, 1400, ['combustion', 'chemistry']),
    T('computers', 'Computers', 6, 1500, ['flight', 'radio']),
    T('rocketry', 'Rocketry', 6, 1550, ['combustion', 'chemistry']),
    T('satellites', 'Satellites', 6, 1800, ['rocketry', 'computers']),
    T('spaceflight', 'Spaceflight', 6, 2200, ['satellites', 'plastics'])
  ];
  AU.TECH_BY_ID = {};
  AU.TECHS.forEach(function (t) { AU.TECH_BY_ID[t.id] = t; });

  AU.CIVICS = [
    T('code_of_laws', 'Code of Laws', 0, 20, [], { unlocks: 'Autocracy, Oligarchy' }),
    T('craftsmanship', 'Craftsmanship', 0, 40, ['code_of_laws'], { fx: { yieldMult: { production: 1.05 } } }),
    T('foreign_trade', 'Foreign Trade', 0, 40, ['code_of_laws'], { fx: { goldPerSettlement: 1 } }),
    T('military_tradition', 'Military Tradition', 0, 50, ['craftsmanship'], { fx: { unitCostMult: 0.9 } }),
    T('state_workforce', 'State Workforce', 0, 70, ['craftsmanship'], { fx: { buildingCostMult: 0.9 } }),
    T('early_empire', 'Early Empire', 0, 70, ['foreign_trade'], { fx: { settlerCostMult: 0.8 } }),
    T('mysticism_civic', 'Rituals', 0, 70, ['foreign_trade'], { fx: { happinessBonus: 1 } }),

    T('political_philosophy', 'Political Philosophy', 1, 110, ['state_workforce', 'early_empire'], { unlocks: 'Classical Republic' }),
    T('games_recreation', 'Games and Recreation', 1, 110, ['state_workforce'], { fx: { happinessBonus: 1 } }),
    T('drama_poetry', 'Drama and Poetry', 1, 110, ['early_empire'], { fx: { culturePerSettlement: 1 } }),
    T('recorded_history', 'Recorded History', 1, 175, ['political_philosophy', 'drama_poetry'], { fx: { yieldMult: { science: 1.05 } } }),
    T('defensive_tactics', 'Defensive Tactics', 1, 175, ['games_recreation', 'political_philosophy'], { fx: { cityDefense: 3 } }),

    T('feudalism', 'Feudalism', 2, 275, ['defensive_tactics'], { fx: { tileBonus: [{ when: 'farm', yields: { food: 1 } }] } }),
    T('civil_service', 'Civil Service', 2, 275, ['defensive_tactics', 'recorded_history'], { fx: { growthMult: 1.1 } }),
    T('guilds', 'Guilds', 2, 390, ['feudalism', 'civil_service'], { fx: { townGoldMult: 1.15 } }),
    T('mercenaries', 'Mercenaries', 2, 290, ['feudalism'], { fx: { purchaseMult: 0.85 } }),
    T('divine_right', 'Divine Right', 2, 390, ['civil_service'], { unlocks: 'Monarchy, Theocracy' }),
    T('exploration', 'Exploration', 2, 400, ['mercenaries'], { fx: { navalMoves: 1, unlocks: 'Merchant Republic' }, unlocks: 'Merchant Republic' }),

    T('humanism', 'Humanism', 3, 540, ['guilds'], { fx: { yieldMult: { culture: 1.05 } } }),
    T('diplomatic_service', 'Diplomatic Service', 3, 540, ['guilds'], { fx: { warWeariness: -1 } }),
    T('reformed_church', 'Reformed Church', 3, 600, ['divine_right'], { fx: { happinessBonus: 1 } }),
    T('enlightenment', 'The Enlightenment', 3, 655, ['humanism', 'diplomatic_service'], { fx: { yieldMult: { science: 1.05 } } }),

    T('civil_engineering', 'Civil Engineering', 4, 920, ['enlightenment'], { fx: { buildingCostMult: 0.9 } }),
    T('nationalism', 'Nationalism', 4, 920, ['enlightenment'], { fx: { landBonus: 2 } }),
    T('opera_ballet', 'Opera and Ballet', 4, 920, ['enlightenment'], { fx: { culturePerWonder: 1 } }),
    T('natural_history', 'Natural History', 4, 1050, ['civil_engineering'], { fx: { yieldMult: { science: 1.05 } } }),
    T('urbanization', 'Urbanization', 4, 1060, ['civil_engineering', 'nationalism'], { fx: { cityUpgradeCostMult: 0.8, growthMult: 1.1 } }),

    T('ideology', 'Ideology', 5, 1210, ['natural_history', 'urbanization', 'opera_ballet'], { unlocks: 'Democracy, Communism, Fascism' }),
    T('mass_media', 'Mass Media', 5, 1410, ['ideology'], { fx: { happinessBonus: 1 } }),
    T('mobilization', 'Mobilization', 5, 1410, ['ideology'], { fx: { unitCostMult: 0.85 } }),
    T('suffrage', 'Suffrage', 5, 1500, ['mass_media'], { fx: { happinessBonus: 1, yieldMult: { gold: 1.05 } } }),
    T('professional_sports', 'Professional Sports', 6, 1590, ['mass_media'], { fx: { happinessBonus: 2 } }),
    T('space_race', 'Space Race', 6, 1800, ['mobilization', 'suffrage'], { fx: { projectCostMult: 0.8 } })
  ];
  AU.CIVIC_BY_ID = {};
  AU.CIVICS.forEach(function (c) { AU.CIVIC_BY_ID[c.id] = c; });

  AU.GOVERNMENTS = {
    chiefdom:      { name: 'Chiefdom',           civic: null, desc: 'The starting government. No bonuses.', fx: {} },
    autocracy:     { name: 'Autocracy',          civic: 'code_of_laws', desc: '+10% Production in the capital, +2 Combat Strength.', fx: { capitalMult: { production: 1.1 }, combatBonus: 2 } },
    oligarchy:     { name: 'Oligarchy',          civic: 'code_of_laws', desc: 'Melee, anti-cavalry and cavalry units +4 Combat Strength.', fx: { meleeBonus: 4 } },
    classical_republic: { name: 'Classical Republic', civic: 'political_philosophy', desc: '+1 Happiness per settlement, +10% Culture.', fx: { happinessBonus: 1, yieldMult: { culture: 1.1 } } },
    monarchy:      { name: 'Monarchy',           civic: 'divine_right', desc: '+50% defense from Walls, +1 Gold per settlement, +10% growth.', fx: { wallsMult: 1.5, goldPerSettlement: 1, growthMult: 1.1 } },
    theocracy:     { name: 'Theocracy',          civic: 'divine_right', desc: 'Purchases 15% cheaper, +2 Culture per settlement.', fx: { purchaseMult: 0.85, culturePerSettlement: 2 } },
    merchant_republic: { name: 'Merchant Republic', civic: 'exploration', desc: '+15% Gold, Towns convert Production to Gold at 115%.', fx: { yieldMult: { gold: 1.15 }, townGoldMult: 1.15 } },
    democracy:     { name: 'Democracy',          civic: 'ideology', desc: '+15% Gold and Science, +1 Happiness per settlement, units cost 10% more.', fx: { yieldMult: { gold: 1.15, science: 1.15 }, happinessBonus: 1, unitCostMult: 1.1 } },
    communism:     { name: 'Communism',          civic: 'ideology', desc: '+20% Production, +2 Happiness per settlement, -10% Gold.', fx: { yieldMult: { production: 1.2, gold: 0.9 }, happinessBonus: 2 } },
    fascism:       { name: 'Fascism',            civic: 'ideology', desc: '+5 Combat Strength, units cost 30% less, -1 Happiness per settlement.', fx: { combatBonus: 5, unitCostMult: 0.7, happinessBonus: -1 } }
  };

  AU.DIFFICULTIES = {
    settler:  { name: 'Settler',  aiYield: 0.75, playerYield: 1.2, aiUnits: 0, aiSettlers: 0, playerBonusGold: 100 },
    chieftain:{ name: 'Chieftain',aiYield: 0.9,  playerYield: 1.1, aiUnits: 0, aiSettlers: 0, playerBonusGold: 50 },
    prince:   { name: 'Prince',   aiYield: 1.0,  playerYield: 1.0, aiUnits: 1, aiSettlers: 0, playerBonusGold: 0 },
    king:     { name: 'King',     aiYield: 1.2,  playerYield: 1.0, aiUnits: 2, aiSettlers: 0, playerBonusGold: 0 },
    emperor:  { name: 'Emperor',  aiYield: 1.4,  playerYield: 1.0, aiUnits: 3, aiSettlers: 1, playerBonusGold: 0 },
    deity:    { name: 'Deity',    aiYield: 1.8,  playerYield: 1.0, aiUnits: 4, aiSettlers: 2, playerBonusGold: 0 }
  };
})(globalThis.AU = globalThis.AU || {});
