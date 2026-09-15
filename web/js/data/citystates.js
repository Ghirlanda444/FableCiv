// Free cities: independent single-city minor powers. Ties give tiered bonuses; the empire with the most Ties (60+) is the Patron.
(function (AU) {
  var TYPES = AU.CITY_STATE_TYPES = {
    trade: { name: 'Trade', icon: '💰', yield: 'gold', desc: 'Gold' }, science: { name: 'Scholarly', icon: '🔬', yield: 'science', desc: 'Knowledge' },
    culture: { name: 'Artistic', icon: '🎭', yield: 'culture', desc: 'Heritage' }, religious: { name: 'Devout', icon: '🕊️', yield: 'faith', desc: 'Devotion' },
    military: { name: 'Martial', icon: '⚔️', yield: null, desc: 'military' }, industrial: { name: 'Industrial', icon: '⚙️', yield: 'production', desc: 'Production' }
  };
  function S(id, name, type, color, abName, abDesc, fx) { return { id: id, name: name, type: type, color: color, ability: { name: abName, desc: abDesc, fx: fx } }; }
  AU.CITY_STATES = [
    S('venice', 'Venice', 'trade', '#c0392b', 'Serenissima', 'Patron: +2 Gold in every settlement.', { goldPerSettlement: 2 }),
    S('zanzibar', 'Zanzibar', 'trade', '#16a085', 'Spice Islands', 'Patron: +1 Happiness per luxury resource (max +4 extra).', { luxuryHappinessBonus: 1 }),
    S('samarkand', 'Samarkand', 'trade', '#d35400', 'Silk Road', 'Patron: +3 Gold and +1 Knowledge in the capital, town purchases 15% cheaper.', { capitalYields: { gold: 3, science: 1 }, townPurchaseMult: 0.85 }),
    S('muscat', 'Muscat', 'trade', '#7f8c8d', 'Frankincense', 'Patron: coastal settlements +2 Gold.', { coastalSettlementYields: { gold: 2 } }),
    S('singapore', 'Singapore', 'trade', '#e74c3c', 'Entrepôt', 'Patron: +10% Gold.', { yieldMult: { gold: 1.1 } }),
    S('mogadishu', 'Mogadishu', 'trade', '#2980b9', 'Benadir Coast', 'Patron: Fishing Boats +1 Gold and +1 Food.', { tileBonus: [{ when: 'fishing', yields: { gold: 1, food: 1 } }] }),
    S('geneva', 'Geneva', 'science', '#95a5a6', 'Neutrality', 'Patron: +15% Knowledge while not at war.', { peaceScienceMult: 1.15 }),
    S('nalanda', 'Nalanda', 'science', '#f39c12', 'Great Library of the East', 'Patron: Libraries +2 Knowledge.', { buildingBonus: { library: { science: 2 } } }),
    S('bologna', 'Bologna', 'science', '#8e44ad', 'Alma Mater', 'Patron: Universities +3 Knowledge.', { buildingBonus: { university: { science: 3 } } }),
    S('mitla', 'Mitla', 'science', '#27ae60', 'Place of the Dead', 'Patron: +1 Knowledge per settlement.', { sciencePerSettlement: 1 }),
    S('anshan', 'Anshan', 'science', '#34495e', 'Elamite Scribes', 'Patron: each technology learned grants +20 Gold.', { techGold: 20 }),
    S('kumasi', 'Kumasi', 'culture', '#f1c40f', 'Golden Stool', 'Patron: +1 Heritage per settlement and +1 Happiness in the capital.', { culturePerSettlement: 1, capitalYields: { happiness: 1 } }),
    S('vilnius', 'Vilnius', 'culture', '#1abc9c', 'Gates of Dawn', 'Patron: +10% Heritage.', { yieldMult: { culture: 1.1 } }),
    S('nan_madol', 'Nan Madol', 'culture', '#3498db', 'Stone City on the Reef', 'Patron: coastal settlements +2 Heritage.', { coastalSettlementYields: { culture: 2 } }),
    S('antananarivo', 'Antananarivo', 'culture', '#e67e22', 'Highland Kingdom', 'Patron: Monuments and Amphitheaters +1 Heritage.', { buildingBonus: { monument: { culture: 1 }, amphitheater: { culture: 1 } } }),
    S('mohenjo_daro', 'Mohenjo-Daro', 'culture', '#c39bd3', 'Great Bath', 'Patron: settlements on rivers +1 Heritage and +1 Happiness.', { settlementSiteBonus: [{ when: 'river', yields: { culture: 1, happiness: 1 } }] }),
    S('jerusalem', 'Jerusalem', 'religious', '#ecf0f1', 'Holy Land', 'Patron: your religion spreads 50% farther and stronger.', { pressureMult: 0.5 }),
    S('yerevan', 'Yerevan', 'religious', '#a04000', 'Mount Ararat', 'Patron: religious units cost 25% less Devotion and have +10 debate strength.', { religiousUnitCostMult: 0.75, religiousStrength: 10 }),
    S('armagh', 'Armagh', 'religious', '#229954', 'Saint Patrick', 'Patron: Shrines +2 Devotion.', { buildingBonus: { shrine: { faith: 2 } } }),
    S('lhasa', 'Lhasa', 'religious', '#b03a2e', 'Roof of the World', 'Patron: +1 Devotion per settlement and Temples +1 Happiness.', { faithPerSettlement: 1, buildingBonus: { temple: { happiness: 1 } } }),
    S('kandy', 'Kandy', 'religious', '#0e6655', 'Temple of the Tooth', 'Patron: +2 Devotion per Natural Wonder inside your borders.', { faithPerNaturalWonder: 2 }),
    S('chinguetti', 'Chinguetti', 'religious', '#d4ac0d', 'Desert Libraries', 'Patron: worked Desert tiles +1 Devotion and +1 Knowledge.', { tileBonus: [{ when: 'desert', yields: { faith: 1, science: 1 } }] }),
    S('kabul', 'Kabul', 'military', '#6e2c00', 'Mountain Warriors', 'Patron: units start with +5 XP and hills cost no extra movement.', { unitsStartXp: 5, hillsMoveCost: 1 }),
    S('preslav', 'Preslav', 'military', '#1b4f72', 'Bulgar Cavalry', 'Patron: cavalry units +1 Movement.', { cavalryMoves: 1 }),
    S('valletta', 'Valletta', 'military', '#7d6608', 'Knights Hospitaller', 'Patron: Walls cost 40% less and settlements +3 defence.', { wallsMult: 0.6, cityDefense: 3 }),
    S('wolin', 'Wolin', 'military', '#4a235a', 'Jomsvikings', 'Patron: +30 Gold per naval kill and naval units +1 Movement.', { navalKillGold: 30, navalMoves: 1 }),
    S('lahore', 'Lahore', 'military', '#186a3b', 'Nihang Warriors', 'Patron: melee and anti-cavalry units +3 Strength.', { meleeBonus: 3 }),
    S('ngazargamu', 'Ngazargamu', 'military', '#9c640c', 'Kanem-Bornu Riders', 'Patron: units heal +5 HP per turn inside your borders.', { healBonusHome: 5 }),
    S('toronto', 'Toronto', 'industrial', '#5d6d7e', 'Regional Hub', 'Patron: Towns +1 Production and +1 Gold.', { townYields: { production: 1, gold: 1 } }),
    S('brussels', 'Brussels', 'industrial', '#943126', 'Grand Place', 'Patron: Wonders cost 15% less.', { wonderCostMult: 0.85 }),
    S('auckland', 'Auckland', 'industrial', '#117a65', 'City of Sails', 'Patron: coastal settlements +2 Production.', { coastalSettlementYields: { production: 2 } }),
    S('buenos_aires', 'Buenos Aires', 'industrial', '#2e86c1', 'Pampas', 'Patron: Pastures +1 Production and +1 Gold.', { tileBonus: [{ when: 'pasture', yields: { production: 1, gold: 1 } }] }),
    S('johannesburg', 'Johannesburg', 'industrial', '#b7950b', 'Gold Reef', 'Patron: Mines +1 Production and +1 Gold.', { tileBonus: [{ when: 'mine', yields: { production: 1, gold: 1 } }] }),
    S('cahokia', 'Cahokia', 'industrial', '#784212', 'Mound Builders', 'Patron: Farms +1 Production; +1 Happiness per settlement is not included.', { tileBonus: [{ when: 'farm', yields: { production: 1 } }] })
  ];
  AU.CITY_STATE_BY_ID = {};
  // Each city-state doubles as a minimal "empire" record so every code path that reads civ data keeps working.
  AU.CITY_STATES.forEach(function (s) {
    s.adj = s.name; s.color2 = '#ffffff'; s.minor = true; s.cities = [s.name]; s.difficulty = 'medium'; s.bias = [];
    s.leaders = [{ id: 'cs_' + s.id, name: s.name, title: TYPES[s.type].name + ' city-state', civId: s.id, ability: { name: TYPES[s.type].name, desc: '', fx: {} }, ai: { aggression: 0, expansion: 0, science: 0.5, culture: 0.5, religion: s.type === 'religious' ? 0.9 : 0.2 } }];
    AU.CITY_STATE_BY_ID[s.id] = s;
  });
  // Tier bonuses by type: Partner, Patron, Kin (cumulative).
  AU.ENVOY_TIERS = function (type) {
    var y = TYPES[type].yield;
    if (!y) return [{ n: 1, desc: 'Units start with +3 XP', fx: { unitsStartXp: 3 } }, { n: 3, desc: '+10% Production toward units', fx: { pctUnitProduction: 10 } }, { n: 6, desc: 'Units cost 15% less', fx: { unitCostMult: 0.85 } }];
    var t1 = {}; t1[y] = 2; var t2 = {}; t2[y] = 1; var t3 = {}; t3[y] = 1;
    return [{ n: 1, desc: '+2 ' + TYPES[type].desc + ' in the capital', fx: { capitalYields: t1 } }, { n: 3, desc: '+1 ' + TYPES[type].desc + ' in every settlement', fx: { townYields: t2, citySiteYields: t2 } }, { n: 6, desc: 'another +1 ' + TYPES[type].desc + ' in every settlement', fx: { townYields: t3, citySiteYields: t3 } }];
  };
})(globalThis.AU = globalThis.AU || {});
