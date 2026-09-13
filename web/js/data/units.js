// Unit types. cls: melee | antcav | ranged | siege | cavalry | naval | navalRanged | recon | civilian
(function (AU) {
  AU.UNITS = {
    settler:     { name: 'Settler',     cls: 'civilian', cost: 80,  moves: 2, strength: 0,  icon: '🧭', desc: 'Founds a new Town.' },
    scout:       { name: 'Scout',       cls: 'recon',    cls2: 'melee', cost: 30,  moves: 3, strength: 10, sight: 3, icon: '🔭' },
    warrior:     { name: 'Warrior',     cls: 'melee',    cost: 40,  moves: 2, strength: 20, icon: '🪓', upgradesTo: 'swordsman' },
    slinger:     { name: 'Slinger',     cls: 'ranged',   cost: 35,  moves: 2, strength: 5,  ranged: 15, range: 1, icon: '🪃', upgradesTo: 'archer' },
    archer:      { name: 'Archer',      cls: 'ranged',   cost: 60,  moves: 2, strength: 15, ranged: 25, range: 2, tech: 'archery', icon: '🏹', upgradesTo: 'crossbowman' },
    spearman:    { name: 'Spearman',    cls: 'antcav',   cost: 65,  moves: 2, strength: 25, tech: 'bronze_working', icon: '🔱', upgradesTo: 'pikeman' },
    swordsman:   { name: 'Swordsman',   cls: 'melee',    cost: 90,  moves: 2, strength: 36, tech: 'iron_working', resource: 'iron', icon: '⚔️', upgradesTo: 'musketman' },
    horseman:    { name: 'Horseman',    cls: 'cavalry',  cost: 80,  moves: 4, strength: 36, tech: 'horseback_riding', resource: 'horses', icon: '🐎', upgradesTo: 'knight' },
    catapult:    { name: 'Catapult',    cls: 'siege',    cost: 120, moves: 2, strength: 23, ranged: 35, range: 2, tech: 'engineering', icon: '🪨', upgradesTo: 'bombard' },
    galley:      { name: 'Galley',      cls: 'naval',    cost: 65,  moves: 3, strength: 30, tech: 'sailing', icon: '⛵', upgradesTo: 'caravel' },
    crossbowman: { name: 'Crossbowman', cls: 'ranged',   cost: 180, moves: 2, strength: 30, ranged: 40, range: 2, tech: 'machinery', icon: '🏹', upgradesTo: 'field_cannon' },
    pikeman:     { name: 'Pikeman',     cls: 'antcav',   cost: 180, moves: 2, strength: 41, tech: 'military_tactics', icon: '🔱', upgradesTo: 'rifleman' },
    knight:      { name: 'Knight',      cls: 'cavalry',  cost: 220, moves: 4, strength: 48, tech: 'stirrups', resource: 'horses', icon: '🐴', upgradesTo: 'cavalry' },
    musketman:   { name: 'Musketman',   cls: 'melee',    cost: 240, moves: 2, strength: 55, tech: 'gunpowder', resource: 'niter', icon: '🔫', upgradesTo: 'infantry' },
    bombard:     { name: 'Bombard',     cls: 'siege',    cost: 280, moves: 2, strength: 35, ranged: 45, range: 2, tech: 'metal_casting', resource: 'niter', icon: '💣', upgradesTo: 'artillery' },
    caravel:     { name: 'Caravel',     cls: 'naval',    cost: 240, moves: 4, strength: 45, tech: 'cartography', icon: '⛵', upgradesTo: 'ironclad' },
    field_cannon:{ name: 'Field Cannon',cls: 'ranged',   cost: 330, moves: 2, strength: 45, ranged: 60, range: 2, tech: 'ballistics', resource: 'niter', icon: '🎯', upgradesTo: 'machine_gun' },
    cavalry:     { name: 'Cavalry',     cls: 'cavalry',  cost: 330, moves: 5, strength: 62, tech: 'military_science', resource: 'horses', icon: '🐎', upgradesTo: 'tank' },
    rifleman:    { name: 'Rifleman',    cls: 'antcav',   cost: 360, moves: 2, strength: 65, tech: 'rifling', resource: 'niter', icon: '🔫', upgradesTo: 'infantry' },
    ironclad:    { name: 'Ironclad',    cls: 'naval',    cost: 380, moves: 4, strength: 55, tech: 'steam_power', resource: 'coal', icon: '🚢', upgradesTo: 'battleship' },
    artillery:   { name: 'Artillery',   cls: 'siege',    cost: 430, moves: 2, strength: 50, ranged: 70, range: 2, tech: 'steel', resource: 'coal', icon: '🎇' },
    infantry:    { name: 'Infantry',    cls: 'melee',    cost: 430, moves: 2, strength: 70, tech: 'replaceable_parts', icon: '🪖' },
    machine_gun: { name: 'Machine Gun', cls: 'ranged',   cost: 450, moves: 2, strength: 60, ranged: 75, range: 2, tech: 'replaceable_parts', icon: '🔩' },
    battleship:  { name: 'Battleship',  cls: 'navalRanged', cost: 480, moves: 5, strength: 60, ranged: 70, range: 3, tech: 'steel', resource: 'coal', icon: '🚢' },
    tank:        { name: 'Tank',        cls: 'cavalry',  cost: 480, moves: 4, strength: 80, tech: 'combustion', resource: 'oil', icon: '🛡️' },
    mech_infantry:{ name: 'Mechanized Infantry', cls: 'melee', cost: 560, moves: 3, strength: 90, tech: 'plastics', resource: 'oil', icon: '🚛' },
    rocket_artillery: { name: 'Rocket Artillery', cls: 'siege', cost: 580, moves: 3, strength: 60, ranged: 95, range: 2, tech: 'rocketry', resource: 'oil', icon: '🚀' }
  };
  // The barbarian roster by era index
  AU.BARBARIAN_UNITS = [['warrior', 'slinger', 'scout'], ['spearman', 'archer', 'horseman'], ['pikeman', 'crossbowman', 'knight'], ['musketman', 'crossbowman'], ['rifleman', 'field_cannon'], ['infantry', 'machine_gun'], ['infantry', 'tank']];
})(globalThis.AU = globalThis.AU || {});
