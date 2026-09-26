// Buildings, wonders, projects and town specializations.
(function (AU) {
  AU.BUILDINGS = {
    palace:       { name: 'Palace',        cost: 0,   yields: { production: 2, science: 2, culture: 1, gold: 3, happiness: 1 }, noBuild: true, desc: 'Seat of government. Moves with your capital.' },
    monument:     { name: 'Monument',      cost: 60,  yields: { culture: 2 } },
    granary:      { name: 'Granary',       cost: 65,  yields: { food: 2 }, tech: 'pottery' },
    boundary_marker: { name: 'Boundary Marker', cost: 45, yields: { culture: 1 }, v2: true, era: 0, desc: 'Divergence rules: lets the settlement claim tiles beyond its first three (each claim also costs Influence).' },
    growth_hall:  { name: 'Growth Hall', cost: 140, yields: { culture: 1, happiness: 1 }, v2: true, era: 2, requires: 'boundary_marker', desc: 'Divergence rules: growth events queue up instead of turning into specialists when Influence is short.' },
    shrine:       { name: 'Shrine',        cost: 70,  yields: { faith: 2, happiness: 1 }, tech: 'mysticism' },
    temple:       { name: 'Temple',        cost: 160, yields: { faith: 4, culture: 1, happiness: 1 }, civic: 'mysticism_civic', requires: 'shrine' },
    walls:        { name: 'Walls',         cost: 80,  yields: {}, tech: 'masonry', defense: 6, hp: 100, desc: 'City +6 defense, +100 HP; bombards enemy units within 2 tiles every turn' },
    library:      { name: 'Library',       cost: 90,  yields: { science: 2 }, tech: 'writing', perPop: { science: 0.25 } },
    barracks:     { name: 'Barracks',      cost: 90,  yields: { production: 1 }, tech: 'bronze_working', unitStrength: 1, desc: 'Units built here +1 Strength' },
    water_mill:   { name: 'Water Mill',    cost: 80,  yields: { food: 1, production: 1 }, tech: 'wheel', needs: 'river' },
    market:       { name: 'Market',        cost: 120, yields: { gold: 3 }, tech: 'currency' },
    lighthouse:   { name: 'Lighthouse',    cost: 120, yields: { food: 1, gold: 1 }, tech: 'sailing', needs: 'coast', waterYields: { food: 1 } },
    amphitheater: { name: 'Amphitheater',  cost: 150, yields: { culture: 3 }, tourism: 2, civic: 'drama_poetry', requires: 'monument' },
    aqueduct:     { name: 'Aqueduct',      cost: 150, yields: { food: 2, happiness: 1 }, tech: 'engineering' },
    university:   { name: 'University',    cost: 250, yields: { science: 4 }, tech: 'education', requires: 'library', perPop: { science: 0.25 } },
    workshop:     { name: 'Workshop',      cost: 200, yields: { production: 3 }, tech: 'apprenticeship' },
    harbor:       { name: 'Harbor',        cost: 220, yields: { gold: 3, production: 1 }, tech: 'celestial_navigation', requires: 'lighthouse', needs: 'coast', waterYields: { production: 1 } },
    castle:       { name: 'Castle',        cost: 260, yields: { culture: 1 }, tech: 'castles', requires: 'walls', defense: 8, hp: 100, desc: 'City +8 defense, +100 HP' },
    bank:         { name: 'Bank',          cost: 300, yields: { gold: 5 }, tech: 'banking', requires: 'market' },
    museum:       { name: 'Museum',        cost: 320, yields: { culture: 5 }, tourism: 4, civic: 'humanism', requires: 'amphitheater' },
    printing_house:{ name: 'Printing House', cost: 300, yields: { science: 3, culture: 2 }, tech: 'printing', requires: 'library' },
    factory:      { name: 'Factory',       cost: 400, yields: { production: 6 }, tech: 'industrialization', requires: 'workshop', pct: { production: 10 } },
    hospital:     { name: 'Hospital',      cost: 380, yields: { food: 3, happiness: 2 }, tech: 'sanitation', requires: 'aqueduct' },
    stock_exchange:{ name: 'Stock Exchange', cost: 450, yields: { gold: 8 }, tech: 'economics', requires: 'bank' },
    military_academy: { name: 'Military Academy', cost: 400, yields: { production: 2 }, tech: 'military_science', requires: 'barracks', unitStrength: 2, pct: { unitProduction: 25 } },
    research_lab: { name: 'Research Lab',  cost: 520, yields: { science: 8 }, tech: 'chemistry', requires: 'university', perPop: { science: 0.5 } },
    power_plant:  { name: 'Power Plant',   cost: 520, yields: { production: 4 }, tech: 'electricity', requires: 'factory', pct: { production: 15 }, resource: 'coal' },
    broadcast_tower:{ name: 'Broadcast Tower', cost: 520, yields: { culture: 8 }, tourism: 6, tech: 'radio', requires: 'museum' },
    stadium:      { name: 'Stadium',       cost: 540, yields: { happiness: 4, culture: 2 }, tourism: 4, civic: 'professional_sports' },
    airport:      { name: 'Airport',       cost: 600, yields: { gold: 4, production: 2 }, tech: 'flight', resource: 'aluminum' },
    computer_center:{ name: 'Computer Center', cost: 700, yields: { science: 10, gold: 3 }, tech: 'computers', requires: 'research_lab', pct: { science: 15 } },
    sewer:        { name: 'Sewer',         cost: 300, yields: { food: 1, happiness: 2 }, tech: 'sanitation', requires: 'aqueduct' },
    shipyard:     { name: 'Shipyard',      cost: 260, yields: { production: 2, gold: 1 }, tech: 'mass_production', requires: 'harbor', needs: 'coast', pct: { unitProduction: 15 } },
    astronomical_observatory: { name: 'Observatory', cost: 280, yields: { science: 3 }, tech: 'astronomy', requires: 'library', needs: 'hills' },
    railway_station: { name: 'Railway Station', cost: 420, yields: { production: 3, gold: 2 }, tech: 'railroad', requires: 'workshop' },
    telegraph_office: { name: 'Telegraph Office', cost: 380, yields: { science: 2, gold: 2 }, tech: 'telegraph', requires: 'market' },
    nuclear_plant: { name: 'Nuclear Plant',  cost: 800, yields: { production: 8 }, tech: 'nuclear_power', resource: 'uranium', requires: 'power_plant', pct: { production: 20 } },
    data_center:  { name: 'Data Center',   cost: 850, yields: { science: 12, gold: 4 }, tech: 'the_internet', requires: 'computer_center', pct: { science: 10 } },
    spaceport:    { name: 'Spaceport',     cost: 900, yields: { science: 4 }, tech: 'rocketry', requires: 'airport', desc: 'Required for space projects.' }
  };

  // National wonders: each empire can build one of each, usually after owning several of a building.
  AU.NATIONAL = {
    national_epic:   { name: 'National Epic',      cost: 200, civic: 'drama_poetry', requiresCount: ['monument', 2], yields: { culture: 4 }, desc: 'Units built here start with a level of experience.', fx: { unitStrength: 2 } },
    heroic_epic:     { name: 'Heroic Epic', home: 'fort',        cost: 260, civic: 'military_training', requiresCount: ['barracks', 2], yields: { culture: 2, production: 2 }, desc: '+15% unit production here; all units +1 Strength.', fx: { pctUnitProduction: 15, empireLandBonus: 1 } },
    royal_library:   { name: 'Royal Library', home: 'urban',      cost: 320, tech: 'education', requiresCount: ['library', 3], yields: { science: 6, culture: 2 }, desc: '+6 Knowledge; +1 Knowledge per Library you own.', fx: { sciencePerBuilding: 'library' } },
    ironworks:       { name: 'Ironworks', home: 'mining',          cost: 380, tech: 'metal_casting', requiresCount: ['workshop', 2], yields: { production: 6 }, desc: '+6 Production; +1 Production per worked Mine here.', fx: { productionPerMine: 1 } },
    national_treasury:{ name: 'National Treasury', home: 'trade', cost: 380, tech: 'banking', requiresCount: ['market', 3], yields: { gold: 8 }, desc: '+8 Gold; +10% Gold empire-wide.', fx: { yieldMult: { gold: 1.1 } } },
    grand_temple:    { name: 'Grand Temple',       cost: 300, civic: 'mysticism_civic', requiresCount: ['shrine', 3], yields: { faith: 5, culture: 4, happiness: 3 }, desc: '+5 Devotion, +3 Happiness here, +1 Happiness in every settlement.', fx: { empireHappiness: 1 } },
    national_university:{ name: 'National University', home: 'urban', cost: 520, tech: 'scientific_method', requiresCount: ['university', 3], yields: { science: 10 }, desc: '+10 Knowledge and a free technology.', fx: { freeTech: 1 } },
    grand_arsenal:   { name: 'Grand Arsenal', home: 'fort',      cost: 520, tech: 'military_science', requiresCount: ['barracks', 3], yields: { production: 3 }, desc: 'Units built here +3 Strength; unit upkeep: 4 extra free units.', fx: { unitStrength: 3, freeUpkeep: 4 } },
    national_museum: { name: 'National Museum', home: 'urban',    cost: 560, civic: 'the_arts', requiresCount: ['museum', 2], yields: { culture: 10 }, desc: '+10 Heritage; +2 Heritage per wonder you own.', fx: { culturePerWonder: 2 } },
    central_bank:    { name: 'Central Bank', home: 'trade',       cost: 700, tech: 'economics', requiresCount: ['bank', 3], yields: { gold: 12 }, desc: '+12 Gold; purchases cost 10% less.', fx: { purchaseMult: 0.9 } },
    national_park:   { name: 'National Park',      cost: 600, civic: 'conservation', requiresCount: ['monument', 4], yields: { culture: 6, happiness: 2 }, desc: '+2 Happiness in every settlement.', fx: { empireHappiness: 2 } },
    oxford_university: { name: 'Oxford University', cost: 600, tech: 'scientific_theory', requiresCount: ['university', 2], home: 'urban', yields: { science: 8, culture: 2 }, desc: '+8 Knowledge and +2 Heritage; +1 Knowledge per University you own. Only an Urban Center Town can raise it.', fx: { sciencePerBuilding: 'university' } },
    space_agency:    { name: 'Space Agency',       cost: 900, tech: 'satellites', requiresCount: ['research_lab', 2], yields: { science: 8 }, desc: 'Space projects cost 20% less.', fx: { projectCostMult: 0.8 } }
  };

  AU.WONDERS = {
    pyramids:        { name: 'Pyramids',          cost: 220, tech: 'masonry',      yields: { culture: 2 }, desc: '+15% Production in this city; +1 free tile expansion in every settlement founded afterwards.', fx: { pctProduction: 15, freeExpansion: 1 }, needs: 'desert', tier: 'great', home: 'mining', fxV2: { freeClaims: 1 }, descV2: '+15% Production here. Every settlement gets one more free claim.' },
    stonehenge:      { name: 'Stonehenge',        cost: 180, tech: 'mysticism',    yields: { culture: 4, happiness: 1 }, desc: '+4 Heritage, +1 Happiness in all settlements.', fx: { empireHappiness: 1 }, fxV2: { culturePerSettlement: 1 }, descV2: '+4 Heritage here, +1 Happiness and +1 Heritage in every settlement.' },
    great_library:   { name: 'Great Library',     cost: 300, tech: 'writing',      yields: { science: 4 }, desc: '+4 Knowledge and a free Technology.', fx: { freeTech: 1 }, tier: 'great', home: 'urban', fxV2: { civicCostMult: 0.9 } },
    oracle:          { name: 'Oracle',            cost: 240, tech: 'mysticism',    yields: { culture: 3, science: 2 }, desc: '+3 Heritage, +2 Knowledge and a free Civic.', fx: { freeCivic: 1 }, tier: 'great', home: 'urban', fxV2: { insightInfluence: 5 } },
    colosseum:       { name: 'Colosseum',         cost: 320, tech: 'construction', yields: { culture: 2 }, desc: '+2 Happiness in every settlement.', fx: { empireHappiness: 2 } },
    hanging_gardens: { name: 'Hanging Gardens',   cost: 300, tech: 'irrigation',   yields: { food: 3 }, desc: '+15% growth in all settlements.', fx: { growthMult: 1.15 }, needs: 'river', tier: 'great', home: 'farming', fxV2: { riverClaimInfluence: 1 }, descV2: '+15% growth in all settlements. Claiming a river tile grants +1 Influence.' },
    great_lighthouse:{ name: 'Great Lighthouse',  cost: 280, tech: 'celestial_navigation', yields: { gold: 3 }, desc: 'Naval units +1 Movement. +3 Gold.', fx: { navalMoves: 1 }, needs: 'coast', tier: 'great', home: 'trade', fxV2: { influencePerTurn: 2 }, descV2: 'Naval units +1 Movement. +3 Gold and +2 Influence a turn.' },
    terracotta_army: { name: 'Terracotta Army',   cost: 320, tech: 'construction', yields: { culture: 2 }, desc: 'All current land units +5 Combat Strength permanently (+2 for future units).', fx: { landBonus: 2 }, tier: 'great', home: 'fort', fxV2: { scarecrowLevel: 1 }, descV2: 'All current land units +5 Strength for good (+2 for future units). Scarecrow Crews bait one level higher.' },
    petra:           { name: 'Petra',             cost: 340, tech: 'mathematics',  yields: { gold: 2 }, desc: 'Desert tiles in this settlement yield +2 Food, +2 Gold.', fx: { desertBonus: { food: 2, gold: 2 } }, needs: 'desert', tier: 'great', home: 'trade', fxV2: { claimCostMult: 0.85 }, descV2: 'Desert tiles here yield +2 Food and +2 Gold. Claims cost 15% less Influence.' },
    colossus:        { name: 'Colossus',          cost: 320, tech: 'shipbuilding', yields: { gold: 6 }, desc: '+6 Gold; naval units cost 20% less here.', fx: {}, needs: 'coast', tier: 'great', home: 'trade', fxV2: { bondUpkeepMult: 0.5 }, descV2: '+6 Gold; naval units cost 20% less here. Bonds with free cities cost half the upkeep.' },
    machu_picchu:    { name: 'Machu Picchu',      cost: 400, tech: 'engineering',  yields: { production: 3, gold: 2 }, desc: 'Hills in this settlement yield +1 Production, +1 Gold.', fx: { hillsBonus: { production: 1, gold: 1 } }, needs: 'hills', tier: 'great', home: 'mining', fxV2: { roadOrders: true }, descV2: 'Hills here yield +1 Production and +1 Gold. Orders to units on your roads cost 1 Command wherever they are.' },
    chichen_itza:    { name: 'Chichen Itza',      cost: 420, tech: 'mathematics',  yields: { culture: 4 }, desc: 'Rainforest tiles in this settlement yield +2 Heritage, +1 Production.', fx: { jungleBonus: { culture: 2, production: 1 } }, tier: 'great', home: 'farming', fxV2: { forestSinkMult: 1.5 }, descV2: 'Rainforest tiles here yield +2 Heritage and +1 Production. Your woods soak up 50% more Smoke.' },
    alhambra:        { name: 'Alhambra',          cost: 480, tech: 'castles',      yields: { culture: 3 }, needs: 'hills', tier: 'great', home: 'fort', fx: { defense: 8, unitStrength: 2, commandBonus: 1 }, desc: '+8 defense here; units built here +2 Strength. +1 Command every turn.' },
    notre_dame:      { name: 'Notre Dame',        cost: 520, tech: 'education',    yields: { culture: 6, happiness: 2 }, fx: { unrestMult: 0.5 }, desc: '+6 Heritage, +2 Happiness. Unrest in captured settlements lasts half as long.' },
    forbidden_city:  { name: 'Forbidden City',    cost: 620, tech: 'printing',     yields: { culture: 5 }, desc: '+10% Heritage and +10% Gold empire-wide.', fx: { yieldMult: { culture: 1.1, gold: 1.1 } }, fxV2: { reformsPerAge: 1 }, descV2: '+10% Heritage and +10% Gold empire-wide. One more Reform per age.' },
    taj_mahal:       { name: 'Taj Mahal',         cost: 680, civic: 'humanism',     yields: { culture: 6, happiness: 3 }, desc: '+3 Happiness here; +1 Happiness in all settlements.', fx: { empireHappiness: 1 }, fxV2: { culturePerSettlement: 1 }, descV2: '+3 Happiness here; +1 Happiness and +1 Heritage in all settlements.' },
    big_ben:         { name: 'Big Ben',           cost: 800, tech: 'economics',    yields: { gold: 6 }, needs: 'river', tier: 'great', home: 'trade', fx: { yieldMult: { gold: 1.2 }, instantGold: 250, commandBonus: 1 }, desc: '+20% Gold empire-wide; +250 Gold instantly. +1 Command every turn.' },
    eiffel_tower:    { name: 'Eiffel Tower',      cost: 900, tech: 'steel',        yields: { culture: 8 }, desc: '+2 Heritage in every settlement.', fx: { empireCulture: 2 }, fxV2: { tourismMult: 1.1 }, descV2: '+2 Heritage in every settlement and +10% Fame.' },
    statue_of_liberty:{ name: 'Statue of Liberty', cost: 900, tech: 'ideology_tech', yields: { culture: 4, happiness: 2 }, desc: '+2 Happiness and +2 Gold in every settlement.', fx: { empireHappiness: 2, empireGold: 2 }, needs: 'coast', fxV2: { unrestMult: 0.5 }, descV2: '+2 Happiness and +2 Gold in every settlement. Unrest in captured settlements lasts half as long.' },
    hubble:          { name: 'Hubble Telescope',  cost: 1200, tech: 'satellites',  yields: { science: 12 }, desc: '+12 Knowledge; +20% Knowledge empire-wide.', fx: { yieldMult: { science: 1.2 } }, tier: 'great', home: 'urban', fxV2: { synthCostMult: 0.8 }, descV2: '+12 Knowledge; +20% Knowledge empire-wide. Synthesis costs 20% less.' }
  };

  AU.PROJECTS = {
    launch_satellite: { name: 'Launch Earth Satellite', cost: 800, tech: 'satellites', requiresBuilding: 'spaceport', desc: 'Step 1 of the Knowledge Victory. Reveals the whole map. Needs a Spaceport.' },
    moon_landing:     { name: 'Moon Landing',           cost: 1200, tech: 'satellites', requiresProject: 'launch_satellite', desc: 'Step 2 of the Knowledge Victory.' },
    colony_ship:      { name: 'Launch Colony Ship',     cost: 1800, tech: 'spaceflight', requiresProject: 'moon_landing', desc: 'Final step: win a Knowledge Victory.' }
  };

  // Town specializations. A specialized town stops growing and sends its surplus food to the nearest city.
  AU.SPECIALIZATIONS = {
    farming:  { name: 'Farming Town',  minPop: 5, desc: 'Worked Farms, Pastures and Fishing Boats +1 Food. Surplus Food feeds your nearest City.', icon: '🌾' },
    mining:   { name: 'Mining Town',   minPop: 5, desc: 'Worked Mines, Quarries and Woodcutters +1 Production (converted to Gold).', icon: '⛏️' },
    trade:    { name: 'Trade Outpost', minPop: 5, desc: '+4 Gold, and +1 Gold per worked resource tile.', icon: '💰' },
    fort:     { name: 'Fort Town',     minPop: 3, desc: 'Free Walls. Units inside heal +15 HP per turn. +5 defense.', icon: '🏰' },
    urban:    { name: 'Urban Center',  minPop: 7, desc: '+2 Knowledge, +2 Heritage and +50% Knowledge and Heritage from buildings.', icon: '🏛️' }
  };
})(globalThis.AU = globalThis.AU || {});
