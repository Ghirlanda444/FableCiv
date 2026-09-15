// Religion: pantheons, beliefs (follower / founder / enhancer / worship), religion names and religious units.
(function (AU) {
  function B(id, name, type, desc, fx, extra) { return Object.assign({ id: id, name: name, type: type, desc: desc, fx: fx || {} }, extra || {}); }
  // Pantheons: cheap early belief chosen with the first 25 Faith. Effects use the ordinary civ effect vocabulary.
  AU.PANTHEONS = [
    B('god_sea', 'God of the Sea', 'pantheon', '+1 Production from Fishing Boats.', { tileBonus: [{ when: 'fishing', yields: { production: 1 } }] }),
    B('goddess_hunt', 'Goddess of the Hunt', 'pantheon', '+1 Food and +1 Production from Camps.', { tileBonus: [{ when: 'camp', yields: { food: 1, production: 1 } }] }),
    B('desert_folklore', 'Desert Folklore', 'pantheon', '+1 Faith from worked Desert tiles.', { tileBonus: [{ when: 'desert', yields: { faith: 1 } }] }),
    B('dance_aurora', 'Dance of the Aurora', 'pantheon', '+1 Faith from worked Tundra and Snow tiles.', { tileBonus: [{ when: 'cold', yields: { faith: 1 } }] }),
    B('sacred_path', 'Sacred Path', 'pantheon', '+1 Faith from worked Jungle and Marsh tiles.', { tileBonus: [{ when: 'jungle', yields: { faith: 1 } }] }),
    B('river_goddess', 'River Goddess', 'pantheon', '+1 Happiness and +1 Faith in settlements on a river.', { settlementSiteBonus: [{ when: 'river', yields: { happiness: 1, faith: 1 } }] }),
    B('fertility_rites', 'Fertility Rites', 'pantheon', '+10% growth in all settlements.', { growthMult: 1.1 }),
    B('god_craftsmen', 'God of Craftsmen', 'pantheon', '+1 Production from Mines and Quarries.', { tileBonus: [{ when: 'mine', yields: { production: 1 } }, { when: 'quarry', yields: { production: 1 } }] }),
    B('stone_circles', 'Stone Circles', 'pantheon', '+2 Faith from Quarries.', { tileBonus: [{ when: 'quarry', yields: { faith: 2 } }] }),
    B('earth_goddess', 'Earth Goddess', 'pantheon', '+1 Faith from tiles next to a Natural Wonder or a Mountain.', { tileBonus: [{ when: 'sacred', yields: { faith: 1 } }] }),
    B('oral_tradition', 'Oral Tradition', 'pantheon', '+1 Culture from Plantations.', { tileBonus: [{ when: 'plantation', yields: { culture: 1 } }] }),
    B('lady_reeds', 'Lady of the Reeds and Marshes', 'pantheon', '+2 Production from Marsh and Oasis tiles.', { tileBonus: [{ when: 'wet', yields: { production: 2 } }] }),
    B('god_forge', 'God of the Forge', 'pantheon', '+25% Production toward Ancient and Classical military units.', { pctUnitProductionEarly: 25 }),
    B('monument_gods', 'Monument to the Gods', 'pantheon', '+15% Production toward Wonders.', { wonderCostMult: 0.87 }),
    B('religious_settlements', 'Religious Settlements', 'pantheon', 'New settlements claim one extra tile and +1 Culture in every settlement.', { freeExpansion: 1, culturePerSettlement: 1 }),
    B('god_war', 'God of War', 'pantheon', '+10 Faith whenever a unit dies within 8 tiles of your settlements... simplified: +5 Faith per kill.', { faithFromKills: 5 }),
    B('initiation_rites', 'Initiation Rites', 'pantheon', '+50 Faith when you disperse an independent camp.', { campFaith: 50 })
  ];
  // Follower beliefs: every settlement following the religion gets them.
  AU.FOLLOWER_BELIEFS = [
    B('feed_world', 'Feed the World', 'follower', 'Shrines and Temples give +2 Food.', { buildingBonus: { shrine: { food: 2 }, temple: { food: 2 } } }),
    B('work_ethic', 'Work Ethic', 'follower', '+1 Production per 4 population.', { productionPerPop: 0.25 }),
    B('choral_music', 'Choral Music', 'follower', 'Shrines and Temples give +2 Culture.', { buildingBonus: { shrine: { culture: 2 }, temple: { culture: 2 } } }),
    B('jesuit_education', 'Jesuit Education', 'follower', 'Libraries and Universities give +2 Science.', { buildingBonus: { library: { science: 2 }, university: { science: 2 } } }),
    B('religious_community', 'Religious Community', 'follower', '+1 Happiness, +1 more with a Temple.', { happinessBonus: 1, buildingBonus: { temple: { happiness: 1 } } }),
    B('divine_inspiration', 'Divine Insight', 'follower', 'Each Wonder gives +4 Faith.', { faithPerWonder: 4 }),
    B('zealotry', 'Zealotry', 'follower', 'Land military units can be purchased with Faith.', { faithPurchaseUnits: true }),
    B('warrior_monks', 'Militia Monks', 'follower', 'Units +4 Strength when fighting in or next to settlements of this religion.', { combatBonusOwnReligion: 4 }),
    B('reliquaries', 'Reliquaries', 'follower', 'Settlements of this religion generate +2 Tourism and +1 Gold.', { tourismPerFollower: 2, goldPerSettlement: 1 }),
    B('tithe', 'Tithe', 'follower', '+2 Gold per settlement following this religion.', { goldPerSettlement: 2 })
  ];
  // Founder beliefs: benefit the civilization that founded the religion, scaling with settlements following it anywhere.
  AU.FOUNDER_BELIEFS = [
    B('church_property', 'Church Property', 'founder', '+2 Gold per settlement in the world following this religion.', { goldPerFollowerSettlement: 2 }),
    B('world_church', 'World Church', 'founder', '+1 Culture per settlement in the world following this religion.', { culturePerFollowerSettlement: 1 }),
    B('cross_cultural', 'Cross-Cultural Dialogue', 'founder', '+1 Science per settlement in the world following this religion.', { sciencePerFollowerSettlement: 1 }),
    B('lay_ministry', 'Lay Ministry', 'founder', '+1 Faith per settlement in the world following this religion.', { faithPerFollowerSettlement: 1 }),
    B('papal_primacy', 'Papal Primacy', 'founder', 'City-states following this religion give you +1 extra envoy of influence.', { envoyPerFollowerState: 1 }),
    B('pilgrimage', 'Pilgrimage', 'founder', '+2 Faith and +1 Tourism per foreign settlement following this religion.', { faithPerForeignFollower: 2, tourismPerForeignFollower: 1 })
  ];
  // Enhancer beliefs: chosen when the religion is enhanced (second Faith milestone).
  AU.ENHANCER_BELIEFS = [
    B('missionary_zeal', 'Preacher Zeal', 'enhancer', 'Religious units +1 charge and +1 Movement.', { missionaryCharges: 1, religiousMoves: 1 }),
    B('holy_order', 'Holy Order', 'enhancer', 'Religious units cost 30% less Faith.', { religiousUnitCostMult: 0.7 }),
    B('defender_faith', 'Defender of the Faith', 'enhancer', 'Units +5 Strength when fighting near settlements of this religion; +20 in theological combat.', { combatBonusOwnReligion: 5, religiousStrength: 20 }),
    B('crusade', 'Crusade', 'enhancer', 'Units +8 Strength when attacking settlements that follow this religion but belong to someone else.', { combatBonusVsFollowerSettlements: 8 }),
    B('itinerant_preachers', 'Itinerant Preachers', 'enhancer', 'Religious pressure spreads 50% farther and stronger.', { pressureMult: 0.5 }),
    B('burial_grounds', 'Burial Grounds', 'enhancer', 'Settlements of this religion +1 Culture, +1 Happiness.', { culturePerSettlement: 1, happinessBonus: 1 }),
    B('scripture', 'Scripture', 'enhancer', 'Temples give +2 Faith; Faith +15%.', { buildingBonus: { temple: { faith: 2 } }, yieldMult: { faith: 1.15 } })
  ];
  AU.BELIEF_BY_ID = {};
  [AU.PANTHEONS, AU.FOLLOWER_BELIEFS, AU.FOUNDER_BELIEFS, AU.ENHANCER_BELIEFS].forEach(function (list) { list.forEach(function (b) { AU.BELIEF_BY_ID[b.id] = b; }); });
  AU.RELIGION_NAMES = [
    { id: 'buddhism', name: 'Buddhism', icon: '☸️' }, { id: 'catholicism', name: 'Catholicism', icon: '✝️' }, { id: 'confucianism', name: 'Confucianism', icon: '☯️' },
    { id: 'hinduism', name: 'Hinduism', icon: '🕉️' }, { id: 'islam', name: 'Islam', icon: '☪️' }, { id: 'judaism', name: 'Judaism', icon: '✡️' },
    { id: 'orthodoxy', name: 'Eastern Orthodoxy', icon: '☦️' }, { id: 'protestantism', name: 'Protestantism', icon: '✝️' }, { id: 'shinto', name: 'Shinto', icon: '⛩️' },
    { id: 'sikhism', name: 'Sikhism', icon: '🪯' }, { id: 'taoism', name: 'Taoism', icon: '☯️' }, { id: 'zoroastrianism', name: 'Zoroastrianism', icon: '🔥' },
    { id: 'tengriism', name: 'Tengriism', icon: '🌤️' }, { id: 'norse', name: 'Old Norse Faith', icon: '🔨' }, { id: 'ancestor_worship', name: 'Ancestor Worship', icon: '🏺' }
  ];
  // Preferred religion names per civilization (first free one is used by the AI).
  AU.RELIGION_PREF = { india: 'hinduism', china: 'confucianism', japan: 'shinto', arabia: 'islam', ottoman: 'islam', persia: 'zoroastrianism', mongolia: 'tengriism', norway: 'norse', russia: 'orthodoxy', byzantium: 'orthodoxy', rome: 'catholicism', spain: 'catholicism', france: 'catholicism', poland: 'catholicism', portugal: 'catholicism', germany: 'protestantism', england: 'protestantism', netherlands: 'protestantism', korea: 'buddhism', khmer: 'buddhism', vietnam: 'buddhism', babylon: 'ancestor_worship', mali: 'islam', ethiopia: 'orthodoxy', nubia: 'ancestor_worship', egypt: 'ancestor_worship' };
  // Religious units: bought with Faith only (no combat; captured units are lost).
  AU.RELIGIOUS_UNITS = {
    missionary: { name: 'Preacher', cls: 'civilian', religious: true, faithCost: 100, charges: 3, moves: 3, strength: 0, icon: '🕊️', requires: 'shrine', desc: 'Spreads your religion: 3 charges, each adds strong pressure to the settlement it stands in.' },
    apostle: { name: 'Evangelist', cls: 'civilian', religious: true, faithCost: 220, charges: 3, moves: 3, strength: 0, icon: '📿', requires: 'temple', needsReligion: true, desc: 'A stronger Preacher (3 charges) that can also debate enemy religious units next to it: theological combat removes the loser.' },
    inquisitor: { name: 'Faith Warden', cls: 'civilian', religious: true, faithCost: 120, charges: 3, moves: 3, strength: 0, icon: '📜', requires: 'temple', needsReligion: true, desc: 'Removes foreign religions from your own settlements (3 charges) and defends against enemy Evangelists.' }
  };
})(globalThis.AU = globalThis.AU || {});
