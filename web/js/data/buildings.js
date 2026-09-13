// Buildings, wonders, projects and town specializations.
(function (AU) {
  AU.BUILDINGS = {
    palace:       { name: 'Palace',        cost: 0,   yields: { production: 2, science: 2, culture: 1, gold: 3, happiness: 1 }, noBuild: true, desc: 'Seat of government. Moves with your capital.' },
    monument:     { name: 'Monument',      cost: 60,  yields: { culture: 2 } },
    granary:      { name: 'Granary',       cost: 65,  yields: { food: 2 }, tech: 'pottery' },
    shrine:       { name: 'Shrine',        cost: 70,  yields: { culture: 1, happiness: 1 }, tech: 'mysticism' },
    walls:        { name: 'Walls',         cost: 80,  yields: {}, tech: 'masonry', defense: 6, hp: 100, desc: 'City +6 defense, +100 HP, ranged attack' },
    library:      { name: 'Library',       cost: 90,  yields: { science: 2 }, tech: 'writing', perPop: { science: 0.25 } },
    barracks:     { name: 'Barracks',      cost: 90,  yields: { production: 1 }, tech: 'bronze_working', unitStrength: 1, desc: 'Units built here +1 Strength' },
    water_mill:   { name: 'Water Mill',    cost: 80,  yields: { food: 1, production: 1 }, tech: 'wheel', needs: 'river' },
    market:       { name: 'Market',        cost: 120, yields: { gold: 3 }, tech: 'currency' },
    lighthouse:   { name: 'Lighthouse',    cost: 120, yields: { food: 1, gold: 1 }, tech: 'sailing', needs: 'coast', waterFood: 1 },
    amphitheater: { name: 'Amphitheater',  cost: 150, yields: { culture: 3 }, tech: 'drama_poetry', requires: 'monument' },
    aqueduct:     { name: 'Aqueduct',      cost: 150, yields: { food: 2, happiness: 1 }, tech: 'engineering' },
    university:   { name: 'University',    cost: 250, yields: { science: 4 }, tech: 'education', requires: 'library', perPop: { science: 0.25 } },
    workshop:     { name: 'Workshop',      cost: 200, yields: { production: 3 }, tech: 'apprenticeship' },
    harbor:       { name: 'Harbor',        cost: 220, yields: { gold: 3, production: 1 }, tech: 'celestial_navigation', requires: 'lighthouse', needs: 'coast' },
    castle:       { name: 'Castle',        cost: 260, yields: { culture: 1 }, tech: 'castles', requires: 'walls', defense: 8, hp: 100, desc: 'City +8 defense, +100 HP' },
    bank:         { name: 'Bank',          cost: 300, yields: { gold: 5 }, tech: 'banking', requires: 'market' },
    museum:       { name: 'Museum',        cost: 320, yields: { culture: 5 }, tech: 'humanism', requires: 'amphitheater' },
    printing_house:{ name: 'Printing House', cost: 300, yields: { science: 3, culture: 2 }, tech: 'printing', requires: 'library' },
    factory:      { name: 'Factory',       cost: 400, yields: { production: 6 }, tech: 'industrialization', requires: 'workshop', pct: { production: 10 } },
    hospital:     { name: 'Hospital',      cost: 380, yields: { food: 3, happiness: 2 }, tech: 'sanitation', requires: 'aqueduct' },
    stock_exchange:{ name: 'Stock Exchange', cost: 450, yields: { gold: 8 }, tech: 'economics', requires: 'bank' },
    military_academy: { name: 'Military Academy', cost: 400, yields: { production: 2 }, tech: 'military_science', requires: 'barracks', unitStrength: 2, pct: { unitProduction: 25 } },
    research_lab: { name: 'Research Lab',  cost: 520, yields: { science: 8 }, tech: 'chemistry', requires: 'university', perPop: { science: 0.5 } },
    power_plant:  { name: 'Power Plant',   cost: 520, yields: { production: 4 }, tech: 'electricity', requires: 'factory', pct: { production: 15 }, resource: 'coal' },
    broadcast_tower:{ name: 'Broadcast Tower', cost: 520, yields: { culture: 8 }, tech: 'radio', requires: 'museum' },
    stadium:      { name: 'Stadium',       cost: 540, yields: { happiness: 4, culture: 2 }, tech: 'mass_media' },
    airport:      { name: 'Airport',       cost: 600, yields: { gold: 4, production: 2 }, tech: 'flight' },
    computer_center:{ name: 'Computer Center', cost: 700, yields: { science: 10, gold: 3 }, tech: 'computers', requires: 'research_lab', pct: { science: 15 } }
  };

  AU.WONDERS = {
    pyramids:        { name: 'Pyramids',          cost: 220, tech: 'masonry',      yields: { culture: 2 }, desc: '+15% Production in this city; +1 free tile expansion in every settlement founded afterwards.', fx: { pctProduction: 15, freeExpansion: 1 }, needs: 'desert' },
    stonehenge:      { name: 'Stonehenge',        cost: 180, tech: 'mysticism',    yields: { culture: 4, happiness: 1 }, desc: '+4 Culture, +1 Happiness in all settlements.', fx: { empireHappiness: 1 } },
    great_library:   { name: 'Great Library',     cost: 300, tech: 'writing',      yields: { science: 4 }, desc: '+4 Science and a free Technology.', fx: { freeTech: 1 } },
    oracle:          { name: 'Oracle',            cost: 240, tech: 'mysticism',    yields: { culture: 3, science: 2 }, desc: '+3 Culture, +2 Science and a free Civic.', fx: { freeCivic: 1 } },
    colosseum:       { name: 'Colosseum',         cost: 320, tech: 'construction', yields: { culture: 2 }, desc: '+2 Happiness in every settlement.', fx: { empireHappiness: 2 } },
    hanging_gardens: { name: 'Hanging Gardens',   cost: 300, tech: 'irrigation',   yields: { food: 3 }, desc: '+15% growth in all settlements.', fx: { growthMult: 1.15 }, needs: 'river' },
    great_lighthouse:{ name: 'Great Lighthouse',  cost: 280, tech: 'celestial_navigation', yields: { gold: 3 }, desc: 'Naval units +1 Movement. +3 Gold.', fx: { navalMoves: 1 }, needs: 'coast' },
    terracotta_army: { name: 'Terracotta Army',   cost: 320, tech: 'construction', yields: { culture: 2 }, desc: 'All current land units +5 Combat Strength permanently (+2 for future units).', fx: { landBonus: 2 } },
    petra:           { name: 'Petra',             cost: 340, tech: 'mathematics',  yields: { gold: 2 }, desc: 'Desert tiles in this settlement yield +2 Food, +2 Gold.', fx: { desertBonus: { food: 2, gold: 2 } }, needs: 'desert' },
    colossus:        { name: 'Colossus',          cost: 320, tech: 'shipbuilding', yields: { gold: 6 }, desc: '+6 Gold; naval units cost 20% less here.', fx: {}, needs: 'coast' },
    machu_picchu:    { name: 'Machu Picchu',      cost: 400, tech: 'engineering',  yields: { production: 3, gold: 2 }, desc: 'Hills in this settlement yield +1 Production, +1 Gold.', fx: { hillsBonus: { production: 1, gold: 1 } }, needs: 'hills' },
    chichen_itza:    { name: 'Chichen Itza',      cost: 420, tech: 'mathematics',  yields: { culture: 4 }, desc: 'Rainforest tiles in this settlement yield +2 Culture, +1 Production.', fx: { jungleBonus: { culture: 2, production: 1 } } },
    alhambra:        { name: 'Alhambra',          cost: 480, tech: 'castles',      yields: { culture: 3 }, desc: '+8 city defense here; units built here +2 Strength.', fx: { defense: 8, unitStrength: 2 }, needs: 'hills' },
    notre_dame:      { name: 'Notre Dame',        cost: 520, tech: 'education',    yields: { culture: 6, happiness: 2 }, desc: '+6 Culture, +2 Happiness.', fx: {} },
    forbidden_city:  { name: 'Forbidden City',    cost: 620, tech: 'printing',     yields: { culture: 5 }, desc: '+10% Culture and +10% Gold empire-wide.', fx: { yieldMult: { culture: 1.1, gold: 1.1 } } },
    taj_mahal:       { name: 'Taj Mahal',         cost: 680, tech: 'humanism',     yields: { culture: 6, happiness: 3 }, desc: '+3 Happiness here; +1 Happiness in all settlements.', fx: { empireHappiness: 1 } },
    big_ben:         { name: 'Big Ben',           cost: 800, tech: 'economics',    yields: { gold: 6 }, desc: '+20% Gold empire-wide; +250 Gold instantly.', fx: { yieldMult: { gold: 1.2 }, instantGold: 250 }, needs: 'river' },
    eiffel_tower:    { name: 'Eiffel Tower',      cost: 900, tech: 'steel',        yields: { culture: 8 }, desc: '+2 Culture in every settlement.', fx: { empireCulture: 2 } },
    statue_of_liberty:{ name: 'Statue of Liberty', cost: 900, tech: 'ideology_tech', yields: { culture: 4, happiness: 2 }, desc: '+2 Happiness and +2 Gold in every settlement.', fx: { empireHappiness: 2, empireGold: 2 }, needs: 'coast' },
    hubble:          { name: 'Hubble Telescope',  cost: 1200, tech: 'satellites',  yields: { science: 12 }, desc: '+12 Science; +20% Science empire-wide.', fx: { yieldMult: { science: 1.2 } } }
  };

  AU.PROJECTS = {
    launch_satellite: { name: 'Launch Earth Satellite', cost: 800, tech: 'satellites', desc: 'Step 1 of the Science Victory. Reveals the whole map.' },
    moon_landing:     { name: 'Moon Landing',           cost: 1200, tech: 'satellites', requiresProject: 'launch_satellite', desc: 'Step 2 of the Science Victory.' },
    colony_ship:      { name: 'Launch Colony Ship',     cost: 1800, tech: 'spaceflight', requiresProject: 'moon_landing', desc: 'Final step: win a Science Victory.' }
  };

  // Civ 7 style town specializations. A specialized town stops growing and sends its surplus food to the nearest city.
  AU.SPECIALIZATIONS = {
    farming:  { name: 'Farming Town',  minPop: 5, desc: 'Worked Farms, Pastures and Fishing Boats +1 Food. Surplus Food feeds your nearest City.', icon: '🌾' },
    mining:   { name: 'Mining Town',   minPop: 5, desc: 'Worked Mines, Quarries and Woodcutters +1 Production (converted to Gold).', icon: '⛏️' },
    trade:    { name: 'Trade Outpost', minPop: 5, desc: '+4 Gold, and +1 Gold per worked resource tile.', icon: '💰' },
    fort:     { name: 'Fort Town',     minPop: 3, desc: 'Free Walls. Units inside heal +15 HP per turn. +5 defense.', icon: '🏰' },
    urban:    { name: 'Urban Center',  minPop: 7, desc: '+2 Science, +2 Culture and +50% Science and Culture from buildings.', icon: '🏛️' }
  };
})(globalThis.AU = globalThis.AU || {});
