// Terrain, features, resources and rural improvements.
(function (AU) {
  AU.TERRAIN = {
    ocean:     { name: 'Ocean',     water: true, yields: { food: 1 },          move: 1, color: '#1b4f8a' },
    coast:     { name: 'Coast',     water: true, yields: { food: 1, gold: 1 }, move: 1, color: '#2d7fc1' },
    lake:      { name: 'Lake',      water: true, yields: { food: 2, gold: 1 }, move: 1, color: '#3d93d6' },
    grassland: { name: 'Grassland', yields: { food: 2 },                  move: 1, color: '#6fa84a' },
    plains:    { name: 'Plains',    yields: { food: 1, production: 1 },   move: 1, color: '#b7a951' },
    desert:    { name: 'Desert',    yields: {},                           move: 1, color: '#e0c98a' },
    tundra:    { name: 'Tundra',    yields: { food: 1 },                  move: 1, color: '#9aa085' },
    snow:      { name: 'Snow',      yields: {},                           move: 1, color: '#e8eef2' },
    mountain:  { name: 'Mountain',  yields: {}, impassable: true,         move: 99, color: '#7d7a76' }
  };

  AU.FEATURES = {
    forest: { name: 'Forest',      yields: { production: 1 }, move: 2, defense: 3, icon: '🌲' },
    jungle: { name: 'Rainforest',  yields: { food: 1 },       move: 2, defense: 3, icon: '🌴' },
    marsh:  { name: 'Marsh',       yields: { food: 1 },       move: 2, defense: 0, icon: '🌾' },
    oasis:  { name: 'Oasis',       yields: { food: 3, gold: 1 }, move: 1, defense: 0, icon: '🌵' }
  };

  // Resources: kind = bonus | luxury | strategic. revealTech hides strategic resources until researched.
  AU.RESOURCES = {
    wheat:   { name: 'Wheat',   kind: 'bonus', yields: { food: 1 }, icon: '🌾', improvement: 'farm',   terrain: ['grassland', 'plains'], flat: true },
    rice:    { name: 'Rice',    kind: 'bonus', yields: { food: 1 }, icon: '🍚', improvement: 'farm',   terrain: ['grassland'], flat: true, feature: ['marsh', null] },
    cattle:  { name: 'Cattle',  kind: 'bonus', yields: { food: 1 }, icon: '🐄', improvement: 'pasture', terrain: ['grassland'], flat: true },
    sheep:   { name: 'Sheep',   kind: 'bonus', yields: { food: 1 }, icon: '🐑', improvement: 'pasture', terrain: ['grassland', 'plains', 'tundra'], hills: true },
    deer:    { name: 'Deer',    kind: 'bonus', yields: { production: 1 }, icon: '🦌', improvement: 'camp', terrain: ['tundra', 'grassland', 'plains'], feature: ['forest'] },
    bananas: { name: 'Bananas', kind: 'bonus', yields: { food: 1 }, icon: '🍌', improvement: 'plantation', terrain: ['grassland', 'plains'], feature: ['jungle'] },
    stone:   { name: 'Stone',   kind: 'bonus', yields: { production: 1 }, icon: '🪨', improvement: 'quarry', terrain: ['grassland', 'plains', 'desert', 'tundra'] },
    fish:    { name: 'Fish',    kind: 'bonus', yields: { food: 1 }, icon: '🐟', improvement: 'fishing', terrain: ['coast', 'lake'] },
    crabs:   { name: 'Crabs',   kind: 'bonus', yields: { gold: 2 }, icon: '🦀', improvement: 'fishing', terrain: ['coast'] },

    silk:    { name: 'Silk',    kind: 'luxury', yields: { culture: 1, gold: 1 }, icon: '🧵', improvement: 'plantation', terrain: ['grassland', 'plains'], feature: ['forest', null] },
    spices:  { name: 'Spices',  kind: 'luxury', yields: { food: 1, gold: 1 }, icon: '🌶️', improvement: 'plantation', terrain: ['grassland', 'plains'], feature: ['jungle', null] },
    gems:    { name: 'Gems',    kind: 'luxury', yields: { gold: 3 }, icon: '💎', improvement: 'mine', terrain: ['grassland', 'plains', 'desert'], hills: true },
    wine:    { name: 'Wine',    kind: 'luxury', yields: { culture: 1, gold: 1 }, icon: '🍇', improvement: 'plantation', terrain: ['grassland', 'plains'] },
    furs:    { name: 'Furs',    kind: 'luxury', yields: { gold: 2 }, icon: '🦫', improvement: 'camp', terrain: ['tundra', 'snow', 'grassland'], feature: ['forest', null] },
    ivory:   { name: 'Ivory',   kind: 'luxury', yields: { production: 1, gold: 1 }, icon: '🐘', improvement: 'camp', terrain: ['plains', 'desert'] },
    cotton:  { name: 'Cotton',  kind: 'luxury', yields: { gold: 3 }, icon: '☁️', improvement: 'plantation', terrain: ['grassland', 'plains', 'desert'], flat: true },
    dyes:    { name: 'Dyes',    kind: 'luxury', yields: { culture: 2 }, icon: '🎨', improvement: 'plantation', terrain: ['grassland', 'plains'], feature: ['jungle', 'forest'] },
    salt:    { name: 'Salt',    kind: 'luxury', yields: { food: 1, gold: 1 }, icon: '🧂', improvement: 'mine', terrain: ['desert', 'plains', 'tundra'], flat: true },
    incense: { name: 'Incense', kind: 'luxury', yields: { culture: 1, gold: 1 }, icon: '🕯️', improvement: 'plantation', terrain: ['desert', 'plains'] },
    pearls:  { name: 'Pearls',  kind: 'luxury', yields: { gold: 2, culture: 1 }, icon: '🦪', improvement: 'fishing', terrain: ['coast'] },
    whales:  { name: 'Whales',  kind: 'luxury', yields: { production: 1, gold: 1 }, icon: '🐋', improvement: 'fishing', terrain: ['coast', 'ocean'] },

    horses:  { name: 'Horses',  kind: 'strategic', yields: { production: 1 }, icon: '🐎', improvement: 'pasture', terrain: ['grassland', 'plains'], flat: true, revealTech: 'animal_husbandry' },
    iron:    { name: 'Iron',    kind: 'strategic', yields: { production: 1 }, icon: '⛏️', improvement: 'mine', terrain: ['grassland', 'plains', 'desert', 'tundra'], revealTech: 'bronze_working' },
    niter:   { name: 'Niter',   kind: 'strategic', yields: { production: 1 }, icon: '🧪', improvement: 'mine', terrain: ['grassland', 'plains', 'desert', 'tundra'], flat: true, revealTech: 'military_engineering' },
    coal:    { name: 'Coal',    kind: 'strategic', yields: { production: 2 }, icon: '🪨', improvement: 'mine', terrain: ['grassland', 'plains'], hills: true, revealTech: 'industrialization' },
    oil:     { name: 'Oil',     kind: 'strategic', yields: { production: 3 }, icon: '🛢️', improvement: 'well', terrain: ['desert', 'tundra', 'snow', 'coast'], revealTech: 'combustion' }
  };

  AU.IMPROVEMENTS = {
    farm:       { name: 'Farm',          yields: { food: 1 }, icon: '🌱' },
    mine:       { name: 'Mine',          yields: { production: 1 }, icon: '⚒️' },
    woodcutter: { name: 'Woodcutter',    yields: { production: 1 }, icon: '🪓' },
    pasture:    { name: 'Pasture',       yields: { food: 1 }, icon: '🏕️' },
    plantation: { name: 'Plantation',    yields: { gold: 1 }, icon: '🏡' },
    quarry:     { name: 'Quarry',        yields: { production: 1 }, icon: '🧱' },
    camp:       { name: 'Camp',          yields: { gold: 1 }, icon: '⛺' },
    fishing:    { name: 'Fishing Boats', yields: { food: 1 }, icon: '⛵' },
    well:       { name: 'Oil Well',      yields: { production: 1 }, icon: '🏗️' },
    clearing:   { name: 'Clearing',      yields: { food: 1 }, icon: '🌱' }
  };

  // Natural wonders occupy one tile (or two for 'pair'), give strong yields, and +science/culture to the discoverer.
  AU.NATURAL_WONDERS = {
    everest:     { name: 'Mount Everest',        terrain: 'mountain', yields: { science: 3, culture: 2 }, adjacent: { science: 1 }, icon: '🏔️', desc: 'The roof of the world. Adjacent worked tiles +1 Science; settlements nearby gain +2 Science.', style: 'peak' },
    kilimanjaro: { name: 'Kilimanjaro',          terrain: 'mountain', yields: { food: 2, culture: 2 }, adjacent: { food: 1 }, icon: '🌋', desc: 'A lone snow-capped volcano over the savanna. Adjacent worked tiles +1 Food.', style: 'peak' },
    vesuvius:    { name: 'Mount Vesuvius',       terrain: 'mountain', yields: { production: 3, culture: 1 }, adjacent: { production: 1 }, icon: '🌋', desc: 'Volcanic soil is rich. Adjacent worked tiles +1 Production.', style: 'volcano' },
    matterhorn:  { name: 'Matterhorn',           terrain: 'mountain', yields: { culture: 4 }, adjacent: { culture: 1 }, icon: '🏔️', desc: 'The most photographed peak. Adjacent worked tiles +1 Culture.', style: 'peak' },
    uluru:       { name: 'Uluru',                terrain: 'desert', flat: true, yields: { food: 2, culture: 3 }, adjacent: { culture: 1 }, icon: '🪨', desc: 'A red monolith sacred to the peoples around it. Adjacent worked tiles +1 Culture.', style: 'monolith' },
    dead_sea:    { name: 'Dead Sea',             terrain: 'desert', flat: true, yields: { gold: 4, science: 1 }, adjacent: { gold: 1 }, icon: '🧂', desc: 'Salt and minerals worth a fortune. Adjacent worked tiles +1 Gold.', style: 'lake' },
    crater_lake: { name: 'Crater Lake',          terrain: 'grassland', hills: true, yields: { food: 3, science: 2 }, adjacent: { food: 1 }, icon: '💧', desc: 'A deep blue lake in a volcanic caldera. Adjacent worked tiles +1 Food.', style: 'lake' },
    yosemite:    { name: 'Yosemite',             terrain: 'grassland', hills: true, yields: { gold: 2, culture: 2, science: 1 }, adjacent: { gold: 1 }, icon: '🏞️', desc: 'Granite cliffs and waterfalls. Adjacent worked tiles +1 Gold.', style: 'cliffs' },
    torres:      { name: 'Torres del Paine',     terrain: 'tundra', hills: true, yields: { production: 2, culture: 3 }, adjacent: { production: 1 }, icon: '🏔️', desc: 'Granite towers over glacial lakes. Adjacent worked tiles +1 Production.', style: 'peak' },
    danxia:      { name: 'Zhangye Danxia',       terrain: 'desert', hills: true, yields: { gold: 3, culture: 2 }, adjacent: { culture: 1 }, icon: '🌄', desc: 'Rainbow-striped sandstone hills. Adjacent worked tiles +1 Culture.', style: 'cliffs' },
    causeway:    { name: "Giant's Causeway",     terrain: 'coast', yields: { production: 2, culture: 3 }, adjacent: { production: 1 }, icon: '🧱', desc: 'Basalt columns marching into the sea. Adjacent worked tiles +1 Production; units +3 Strength nearby.', style: 'reef' },
    barrier_reef:{ name: 'Great Barrier Reef',   terrain: 'coast', yields: { food: 3, science: 3 }, adjacent: { food: 1 }, icon: '🐠', desc: 'The largest living structure on Earth. Adjacent worked tiles +1 Food.', style: 'reef' },
    halong:      { name: 'Ha Long Bay',          terrain: 'coast', yields: { food: 2, gold: 2, culture: 2 }, adjacent: { gold: 1 }, icon: '⛰️', desc: 'Limestone pillars rising from emerald water. Adjacent worked tiles +1 Gold.', style: 'reef' },
    galapagos:   { name: 'Galápagos',            terrain: 'coast', yields: { science: 5 }, adjacent: { science: 1 }, icon: '🐢', desc: 'Where the theory of evolution was born. Adjacent worked tiles +1 Science.', style: 'reef' },
    pantanal:    { name: 'Pantanal',             terrain: 'grassland', flat: true, yields: { food: 4, culture: 1 }, adjacent: { food: 1 }, icon: '🐊', desc: "The world's largest wetland. Adjacent worked tiles +1 Food.", style: 'wetland' },
    cliffs_dover:{ name: 'Cliffs of Dover',      terrain: 'coast', yields: { culture: 3, gold: 2 }, adjacent: { culture: 1 }, icon: '🏝️', desc: 'White chalk walls facing the sea. Adjacent worked tiles +1 Culture.', style: 'cliffs' }
  };
  AU.MAP_SIZES = {
    tiny:     { name: 'Tiny',     w: 40,  h: 26, civs: 4,  camps: 5 },
    small:    { name: 'Small',    w: 52,  h: 34, civs: 6,  camps: 8 },
    standard: { name: 'Standard', w: 64,  h: 42, civs: 8,  camps: 12 },
    large:    { name: 'Large',    w: 80,  h: 52, civs: 12, camps: 18 },
    huge:     { name: 'Huge',     w: 104, h: 66, civs: 16, camps: 26 },
    enormous: { name: 'Enormous', w: 128, h: 80, civs: 20, camps: 36 }
  };
  AU.MAP_TYPES = {
    continents:  { name: 'Continents',  desc: 'Two to four large land masses separated by oceans.' },
    pangaea:     { name: 'Pangaea',     desc: 'One giant supercontinent with a few small islands.' },
    fractal:     { name: 'Fractal',     desc: 'Irregular, unpredictable coastlines and land masses.' },
    archipelago: { name: 'Archipelago', desc: 'Many small and medium islands. Sailing matters.' },
    islands:     { name: 'Islands',     desc: 'A scatter of medium islands, each big enough for a civilization.' },
    donut:       { name: 'Donut',       desc: 'A ring of land around a central inland sea.' },
    inland_sea:  { name: 'Inland Sea',  desc: 'Land all around the map edge, a large sea in the middle.' },
    terra:       { name: 'Terra',       desc: 'Everyone starts on the old world; a rich new world waits across the ocean.' }
  };
})(globalThis.AU = globalThis.AU || {});
