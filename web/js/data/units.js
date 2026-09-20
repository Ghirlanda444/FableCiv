// Unit types. cls: melee | antcav | ranged | siege | cavalry | naval | navalRanged | recon | civilian
(function (AU) {
  AU.UNITS = {
    settler:     { name: 'Pioneers',     cls: 'civilian', cost: 80,  moves: 2, strength: 0,  icon: '🧭', popCost: 1, desc: 'Founds a new Town. Takes 1 Population from the settlement that trains it (needs pop 2).' },
    scout:       { name: 'Pathfinder',       cls: 'recon',    cls2: 'melee', cost: 30,  moves: 3, strength: 10, sight: 3, icon: '🔭' },
    commander:   { name: 'Bandleader',   cls: 'support',  cost: 60,  moves: 2, strength: 10, icon: '🪶', v2: true, commander: true, noAttack: true, era: 0, desc: 'Leads a Warband. The fighters on its tile hit 15% harder and move 1 tile farther. Cannot attack by itself.' },
    migrant:     { name: 'Uprooters',     cls: 'civilian', cost: 50,  moves: 2, strength: 0,  icon: '🎒', v2: true, migrant: true, popCost: 1, era: 0, desc: 'Takes 1 Population from the settlement that trains it and adds it to any other settlement of yours it walks into.' },
    scarecrow:   { name: 'Scarecrow Crew', cls: 'melee', cost: 30, moves: 2, strength: 8, icon: '🎃', v2: true, decoy: true, noAttack: true, disguise: 'warrior', era: 0, desc: 'Bait. To every other empire it looks like a full Warband. Enemies who attack it lose the rest of their turn and fight weaker for 10 turns (longer and harder with Bait Sparks). The crew is spent in the ambush.' },
    warrior:     { name: 'Militia',     cls: 'melee',    cost: 40,  moves: 2, strength: 20, icon: '🪓', upgradesTo: 'swordsman' },
    slinger:     { name: 'Sling Hunter',     cls: 'ranged',   cost: 35,  moves: 2, strength: 5,  ranged: 15, range: 1, icon: '🪃', upgradesTo: 'archer' },
    archer:      { name: 'Bowman',      cls: 'ranged',   cost: 60,  moves: 2, strength: 15, ranged: 25, range: 2, tech: 'archery', icon: '🏹', upgradesTo: 'crossbowman' },
    spearman:    { name: 'Spear Guard',    cls: 'antcav',   cost: 65,  moves: 2, strength: 25, tech: 'bronze_working', icon: '🔱', upgradesTo: 'pikeman' },
    swordsman:   { name: 'Swordbearer',   cls: 'melee',    cost: 90,  moves: 2, strength: 36, tech: 'iron_working', resource: 'iron', icon: '⚔️', upgradesTo: 'musketman' },
    horseman:    { name: 'Horse Raider',    cls: 'cavalry',  cost: 80,  moves: 4, strength: 36, tech: 'horseback_riding', resource: 'horses', icon: '🐎', upgradesTo: 'knight' },
    catapult:    { name: 'Stone Thrower',    cls: 'siege',    cost: 120, moves: 2, strength: 23, ranged: 35, range: 2, tech: 'engineering', icon: '🪨', upgradesTo: 'bombard' },
    galley:      { name: 'Oarship',      cls: 'naval',    cost: 65,  moves: 3, strength: 30, tech: 'sailing', icon: '⛵', upgradesTo: 'caravel' },
    crossbowman: { name: 'Arbalester', cls: 'ranged',   cost: 180, moves: 2, strength: 30, ranged: 40, range: 2, tech: 'machinery', icon: '🏹', upgradesTo: 'field_cannon' },
    pikeman:     { name: 'Pike Guard',     cls: 'antcav',   cost: 180, moves: 2, strength: 41, tech: 'military_tactics', icon: '🔱', upgradesTo: 'rifleman' },
    knight:      { name: 'Chevalier',      cls: 'cavalry',  cost: 220, moves: 4, strength: 48, tech: 'stirrups', resource: 'horses', icon: '🐴', upgradesTo: 'cavalry' },
    musketman:   { name: 'Musketeer',   cls: 'melee',    cost: 240, moves: 2, strength: 55, tech: 'gunpowder', resource: 'niter', icon: '🔫', upgradesTo: 'infantry' },
    bombard:     { name: 'Great Cannon',     cls: 'siege',    cost: 280, moves: 2, strength: 35, ranged: 45, range: 2, tech: 'metal_casting', resource: 'niter', icon: '💣', upgradesTo: 'artillery' },
    caravel:     { name: 'Carrack',     cls: 'naval',    cost: 240, moves: 4, strength: 45, tech: 'cartography', icon: '⛵', ocean: true, upgradesTo: 'ironclad' },
    field_cannon:{ name: 'Field Gun',cls: 'ranged',   cost: 330, moves: 2, strength: 45, ranged: 60, range: 2, tech: 'ballistics', resource: 'niter', icon: '🎯', upgradesTo: 'machine_gun' },
    cavalry:     { name: 'Dragoon',     cls: 'cavalry',  cost: 330, moves: 5, strength: 62, tech: 'military_science', resource: 'horses', icon: '🐎', upgradesTo: 'tank' },
    rifleman:    { name: 'Fusilier',    cls: 'antcav',   cost: 360, moves: 2, strength: 65, tech: 'rifling', resource: 'niter', icon: '🔫', upgradesTo: 'infantry' },
    ironclad:    { name: 'Monitor',    cls: 'naval',    cost: 380, moves: 4, strength: 55, tech: 'steam_power', resource: 'coal', icon: '🚢', ocean: true, upgradesTo: 'submarine' },
    artillery:   { name: 'Howitzer',   cls: 'siege',    cost: 430, moves: 2, strength: 50, ranged: 70, range: 2, tech: 'steel', resource: 'coal', icon: '🎇' },
    infantry:    { name: 'Regulars',    cls: 'melee',    cost: 430, moves: 2, strength: 70, tech: 'replaceable_parts', icon: '🪖', upgradesTo: 'mech_infantry' },
    machine_gun: { name: 'Gunners', cls: 'ranged',   cost: 450, moves: 2, strength: 60, ranged: 75, range: 2, tech: 'replaceable_parts', icon: '🔩' },
    battleship:  { name: 'Dreadnought',  cls: 'navalRanged', cost: 480, moves: 5, strength: 60, ranged: 70, range: 3, tech: 'steel', resource: 'coal', icon: '🚢', ocean: true, upgradesTo: 'destroyer' },
    tank:        { name: 'Land Cruiser',        cls: 'cavalry',  cost: 480, moves: 4, strength: 80, tech: 'combustion', resource: 'oil', icon: '🛡️', upgradesTo: 'modern_armor' },
    mech_infantry:{ name: 'Mechanized Troops', cls: 'melee', cost: 560, moves: 3, strength: 90, tech: 'plastics', resource: 'oil', icon: '🚛' },
    rocket_artillery: { name: 'Rocket Battery', cls: 'siege', cost: 580, moves: 3, strength: 60, ranged: 95, range: 2, tech: 'rocketry', resource: 'oil', icon: '🚀' },
    destroyer:   { name: 'Torpedo Ship',   cls: 'navalRanged', cost: 520, moves: 6, strength: 70, ranged: 75, range: 2, tech: 'combustion', resource: 'oil', icon: '⚓', ocean: true },
    submarine:   { name: 'Attack Sub',   cls: 'naval',    cost: 560, moves: 5, strength: 85, tech: 'radar', resource: 'oil', icon: '🛥️', ocean: true },
    modern_armor:{ name: 'Heavy Armor', cls: 'cavalry', cost: 700, moves: 5, strength: 100, tech: 'composites', resource: 'oil', icon: '🛡️' },
    special_forces:{ name: 'Commandos', cls: 'melee', cost: 640, moves: 3, strength: 95, tech: 'stealth', icon: '🥷' },
    fighter:     { name: 'Biplane',     cls: 'air',      cost: 420, moves: 8,  strength: 55, ranged: 60, range: 2, tech: 'flight', resource: 'oil', icon: '✈️', flying: true, sight: 3, upgradesTo: 'jet_fighter', desc: 'Flies over any terrain and water; attacks from 2 tiles. Cannot capture.' },
    bomber:      { name: 'Heavy Bomber',      cls: 'air',      cost: 520, moves: 8,  strength: 45, ranged: 85, range: 2, tech: 'advanced_flight', resource: 'oil', icon: '🛩️', flying: true, sight: 3, vsSettlements: 15, desc: 'Heavy bomber: flies over anything, +15 vs settlements. Cannot capture.' },
    jet_fighter: { name: 'Jet Interceptor', cls: 'air',      cost: 680, moves: 10, strength: 90, ranged: 95, range: 2, tech: 'jet_engines', resource: 'oil', icon: '🛫', flying: true, sight: 4, desc: 'Fast jet: flies over anything, attacks from 2 tiles. Cannot capture.' },
    caravan:     { name: 'Caravan',     cls: 'civilian', caravan: true, cost: 60, moves: 2, strength: 0, civic: 'foreign_trade', icon: '🐪', desc: 'Walks into a Free City\'s land and opens a trade route: Gold every turn and +3 Ties while it stays. One route per free city; you can keep one caravan plus one per Market or Harbor.' },
    great_prophet:   { name: 'Great Prophet',   cls: 'civilian', great: 'prophet',   cost: 0, moves: 3, strength: 0, icon: '🕊️', desc: 'Founds a religion in one of your settlements. Earned with Great Prophet points (Shrines, Temples, Devotion).' },
    great_scientist: { name: 'Great Scientist', cls: 'civilian', great: 'scientist', cost: 0, moves: 3, strength: 0, icon: '🔬', desc: 'Completes the technology being researched. Earned with Great Scientist points (Libraries, Universities, Research Labs).' },
    great_engineer:  { name: 'Great Engineer',  cls: 'civilian', great: 'engineer',  cost: 0, moves: 3, strength: 0, icon: '⚙️', desc: 'Adds a big burst of Production to a City. Earned with Great Engineer points (Workshops, Factories, Power Plants).' },
    great_merchant:  { name: 'Great Merchant',  cls: 'civilian', great: 'merchant',  cost: 0, moves: 3, strength: 0, icon: '💰', desc: 'Brings Gold and an envoy. Earned with Great Merchant points (Markets, Banks, Stock Exchanges).' },
    great_artist:    { name: 'Great Artist',    cls: 'civilian', great: 'artist',    cost: 0, moves: 3, strength: 0, icon: '🎨', desc: 'Creates a Great Work: +3 Heritage and +3 Fame in a settlement. Earned with Great Artist points (Amphitheaters, Museums).' },
    great_general:   { name: 'Great General',   cls: 'civilian', great: 'general',   cost: 0, moves: 3, strength: 0, icon: '⚔️', desc: '+5 Strength to your land units within 2 tiles. Earned with Great General points (Barracks, Castles, Military Academies).' },
    great_admiral:   { name: 'Great Admiral',   cls: 'civilian', great: 'admiral',   cost: 0, moves: 4, strength: 0, icon: '⚓', desc: '+5 Strength and +1 Movement to your naval units within 2 tiles. Earned with Great Admiral points (Lighthouses, Harbors, Shipyards).' },
    missionary:  { name: 'Preacher',  cls: 'civilian', religious: true, cost: 0, faithCost: 100, charges: 3, moves: 3, strength: 0, icon: '🕊️', desc: 'Spreads your religion (3 charges). Purchased with Devotion in a settlement with a Shrine.' },
    apostle:     { name: 'Evangelist',     cls: 'civilian', religious: true, cost: 0, faithCost: 220, charges: 3, moves: 3, strength: 0, icon: '📿', desc: 'Spreads your religion (3 charges, stronger) and debates enemy religious units. Purchased with Devotion in a settlement with a Temple.' },
    inquisitor:  { name: 'Faith Warden',  cls: 'civilian', religious: true, cost: 0, faithCost: 120, charges: 3, moves: 3, strength: 0, icon: '📜', desc: 'Removes other religions from your settlements (3 charges). Purchased with Devotion in a settlement with a Temple.' }
  };
  // The Inchibil (wild raider) roster by era index
  AU.BARBARIAN_UNITS = [['warrior', 'slinger', 'scout'], ['spearman', 'archer', 'horseman'], ['pikeman', 'crossbowman', 'knight'], ['musketman', 'crossbowman'], ['rifleman', 'field_cannon'], ['infantry', 'machine_gun'], ['infantry', 'tank'], ['mech_infantry', 'modern_armor']];
})(globalThis.AU = globalThis.AU || {});

// ---------- Unit modifiers (unique units and promotions share one vocabulary) ----------
// Numeric keys add, object keys merge-add, booleans OR, costMult multiplies.
(function (AU) {
  var ADD = { strength: 1, ranged: 1, moves: 1, range: 1, sight: 1, defense: 1, attack: 1, flank: 1, flankSame: 1, intimidate: 1, vsSettlements: 1, vsStronger: 1, bonusVsDamaged: 1, healOnKill: 1, goldOnKill: 1, cultureOnKill: 1, scienceOnKill: 1, productionOnKill: 1, xpMult: 1, homeBonus: 1, abroadBonus: 1, homeContinentBonus: 1, fortifyMult: 1, healBonus: 1, defVsRanged: 1, vsIndependents: 1, garrisonBonus: 1, freeLevel: 1, purchaseMult: 1, openBonus: 1, roughBonus: 1 };
  var OBJ = { vsCls: 1, terrainBonus: 1 };
  var SKIP = { id: 1, name: 1, replaces: 1, desc: 1, icon: 1, tier: 1, cls: 1 };
  AU.applyUnitMods = function (def, mods) {
    if (!mods) return def;
    for (var k in mods) {
      if (SKIP[k]) continue;
      var v = mods[k];
      if (k === 'costMult') def.cost = Math.round(def.cost * v);
      else if (k === 'noResource') { if (v) delete def.resource; }
      else if (OBJ[k]) { def[k] = Object.assign({}, def[k] || {}); for (var kk in v) def[k][kk] = (def[k][kk] || 0) + v[kk]; }
      else if (ADD[k] || typeof v === 'number') def[k] = (def[k] || 0) + v;
      else def[k] = def[k] || v;
    }
    return def;
  };
  // Human-readable summary of a modifier set (used by the Chibipedia and the promotion picker).
  AU.modsText = function (m) {
    var out = [];
    if (m.strength) out.push((m.strength > 0 ? '+' : '') + m.strength + ' Strength');
    if (m.ranged) out.push('+' + m.ranged + ' Ranged Strength');
    if (m.moves) out.push((m.moves > 0 ? '+' : '') + m.moves + ' Movement');
    if (m.range) out.push('+' + m.range + ' Range');
    if (m.sight) out.push('+' + m.sight + ' Sight');
    if (m.attack) out.push('+' + m.attack + ' when attacking');
    if (m.defense) out.push((m.defense > 0 ? '+' : '') + m.defense + ' when defending');
    if (m.defVsRanged) out.push('+' + m.defVsRanged + ' defending against ranged attacks');
    if (m.vsCls) for (var c in m.vsCls) out.push('+' + m.vsCls[c] + ' vs ' + ({ melee: 'melee', antcav: 'anti-cavalry', cavalry: 'cavalry', ranged: 'ranged', siege: 'siege', naval: 'naval', navalRanged: 'naval', recon: 'recon' }[c] || c) + ' units');
    if (m.vsSettlements) out.push('+' + m.vsSettlements + ' vs settlements');
    if (m.vsStronger) out.push('+' + m.vsStronger + ' vs units stronger than itself');
    if (m.vsIndependents) out.push('+' + m.vsIndependents + ' vs Inchibil raiders');
    if (m.bonusVsDamaged) out.push('+' + m.bonusVsDamaged + ' vs wounded units');
    if (m.terrainBonus) for (var t in m.terrainBonus) out.push('+' + m.terrainBonus[t] + ' on ' + t);
    if (m.openBonus) out.push('+' + m.openBonus + ' on open flat terrain');
    if (m.roughBonus) out.push('+' + m.roughBonus + ' on hills, forest and jungle');
    if (m.homeBonus) out.push('+' + m.homeBonus + ' inside your borders');
    if (m.abroadBonus) out.push('+' + m.abroadBonus + ' on foreign continents');
    if (m.homeContinentBonus) out.push('+' + m.homeContinentBonus + ' on its home continent');
    if (m.garrisonBonus) out.push('+' + m.garrisonBonus + ' when garrisoned in a settlement');
    if (m.flank) out.push('+' + m.flank + ' per adjacent friendly military unit (max 3)');
    if (m.flankSame) out.push('+' + m.flankSame + ' per adjacent unit of the same type (max 3)');
    if (m.intimidate) out.push('adjacent enemies fight at -' + m.intimidate);
    if (m.fortifyMult) out.push('fortification bonus doubled');
    if (m.noDamagePenalty) out.push('no strength loss when wounded');
    if (m.healAlways) out.push('heals every turn, even after moving');
    if (m.healBonus) out.push('+' + m.healBonus + ' HP healed per turn');
    if (m.healOnKill) out.push('heals ' + m.healOnKill + ' HP on a kill');
    if (m.goldOnKill) out.push('+' + m.goldOnKill + ' Gold per kill');
    if (m.cultureOnKill) out.push('+' + m.cultureOnKill + ' Heritage per kill');
    if (m.scienceOnKill) out.push('+' + m.scienceOnKill + ' Knowledge per kill');
    if (m.productionOnKill) out.push('+' + m.productionOnKill + ' Production to the nearest settlement per kill');
    if (m.halfRetaliation) out.push('takes only half damage back when attacking');
    if (m.noRetaliation) out.push('takes no damage back when attacking');
    if (m.movesAfterAttack) out.push('can move after attacking');
    if (m.extraAttack) out.push('can attack twice per turn');
    if (m.ignoreHills) out.push('hills cost no extra movement');
    if (m.ignoreTerrain) out.push('all terrain costs 1 movement');
    if (m.forestMove) out.push('forest and jungle cost no extra movement');
    if (m.amphibious) out.push('no penalty landing from the sea');
    if (m.captureBonus) out.push('captured settlements keep their population and buildings');
    if (m.freeLevel) out.push('starts at level ' + m.freeLevel);
    if (m.xpMult) out.push('earns ' + (m.xpMult > 0 ? '+' : '') + Math.round(m.xpMult * 100) + '% experience');
    if (m.noResource) out.push('needs no strategic resource');
    if (m.costMult && m.costMult !== 1) out.push(Math.round((1 - m.costMult) * 100) + '% cheaper');
    if (m.purchaseMult && m.purchaseMult !== 1) out.push('Gold purchase ' + Math.round((1 - m.purchaseMult) * 100) + '% cheaper');
    return out.join(', ');
  };

  // Promotions: each class family has its own list; a unit picks one per level (levels at 5 / 12 / 24 / 40 XP).
  var PR = function (id, name, fam, mods, tier) { return { id: id, name: name, fam: fam, mods: mods, tier: tier || 1 }; };
  AU.PROMOTIONS = [
    // melee / anti-cavalry
    PR('battlecry', 'Battlecry', 'melee', { vsCls: { melee: 7, antcav: 7 } }),
    PR('tortoise', 'Tortoise', 'melee', { defVsRanged: 10 }),
    PR('commando', 'Commando', 'melee', { moves: 1, ignoreHills: true }, 2),
    PR('zweihander', 'Zweihander', 'melee', { vsSettlements: 7 }, 2),
    PR('amphibious', 'Amphibious', 'melee', { amphibious: true, terrainBonus: { coast: 5 } }),
    PR('eliteguard', 'Elite Guard', 'melee', { healBonus: 10, defense: 4 }, 3),
    PR('phalanx', 'Shield Wall', 'melee', { flank: 2 }, 2),
    // ranged / siege
    PR('volley', 'Volley', 'ranged', { openBonus: 5 }),
    PR('arrowstorm', 'Arrow Storm', 'ranged', { roughBonus: 5 }),
    PR('garrison', 'Garrison', 'ranged', { garrisonBonus: 10 }),
    PR('emplacement', 'Emplacement', 'ranged', { vsSettlements: 10 }, 2),
    PR('marksman', 'Expert Marksman', 'ranged', { range: 1 }, 3),
    PR('suppression', 'Suppression', 'ranged', { bonusVsDamaged: 6 }, 2),
    PR('crewweapons', 'Crew Weapons', 'ranged', { moves: 1, defense: 3 }, 2),
    // cavalry
    PR('caparison', 'Caparison', 'cavalry', { defense: 5 }),
    PR('charge', 'Charge', 'cavalry', { bonusVsDamaged: 8 }),
    PR('depredation', 'Depredation', 'cavalry', { goldOnKill: 30 }),
    PR('pursuit', 'Pursuit', 'cavalry', { moves: 1 }, 2),
    PR('coursers', 'Coursers', 'cavalry', { movesAfterAttack: true }, 2),
    PR('breakthrough', 'Breakthrough', 'cavalry', { vsSettlements: 7 }, 3),
    PR('escort', 'Escort Mobility', 'cavalry', { ignoreHills: true }, 2),
    // naval
    PR('helmsman', 'Helmsman', 'naval', { moves: 1 }),
    PR('rutter', 'Rutter', 'naval', { sight: 1 }),
    PR('hull', 'Reinforced Hull', 'naval', { defense: 10 }),
    PR('convoy', 'Convoy', 'naval', { attack: 7 }, 2),
    PR('boarding', 'Boarding Parties', 'naval', { goldOnKill: 40, bonusVsDamaged: 5 }, 2),
    PR('bombardment', 'Shore Bombardment', 'naval', { vsSettlements: 10 }, 3),
    // recon
    PR('ranger', 'Ranger', 'recon', { roughBonus: 5, ignoreHills: true }),
    PR('sentry', 'Sentry', 'recon', { sight: 2 }),
    PR('alpine', 'Alpine', 'recon', { forestMove: true, moves: 1 }, 2),
    PR('guerrilla', 'Guerrilla', 'recon', { movesAfterAttack: true, attack: 5 }, 2),
    PR('ambush', 'Ambush', 'recon', { terrainBonus: { forest: 10, jungle: 10 } }, 3),
    PR('camouflage', 'Camouflage', 'recon', { defVsRanged: 10, defense: 3 }, 2)
  ];
  AU.PROMO_BY_ID = {}; AU.PROMOTIONS.forEach(function (p) { AU.PROMO_BY_ID[p.id] = p; });
  AU.promoFamily = function (cls) { return cls === 'antcav' ? 'melee' : cls === 'siege' || cls === 'air' ? 'ranged' : cls === 'navalRanged' ? 'naval' : cls; };
})(globalThis.AU = globalThis.AU || {});
