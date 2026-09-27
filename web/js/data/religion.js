// Religion: the spirits of the land, faith tenets and faith names.
// Every settlement is watched over by the spirit of its site. A spirit is pleased when the settlement lives the way the land likes
// (a river spirit wants its water worked, a wood spirit wants its trees standing) and angry when it is choked with Smoke or wronged.
// Devotion comes from pleased spirits, Shrines and Temples; enough of it brings a Revelation that founds the empire's own faith.
(function (AU) {
  // likes / hates: the conditions the rules check (core/religion.js R.spiritLikes, R.spiritHates); gift: yields while pleased.
  // Every spirit also hates Smoke of 4 or more, and a settlement of 8 or more needs a Shrine or Temple to keep its spirit pleased.
  AU.SPIRITS = {
    river: { name: 'River Spirit', icon: '🌊', site: 'a settlement on a river', likes: 'three worked river tiles', hates: 'any Smoke over 1', gift: { food: 2 } },
    sea: { name: 'Sea Spirit', icon: '🐚', site: 'a settlement on the coast', likes: 'two worked water tiles', hates: 'a hot world', gift: { food: 1, gold: 2 } },
    peak: { name: 'Mountain Spirit', icon: '🏔️', site: 'a settlement beside a mountain', likes: 'a worked Mine or Quarry', hates: 'enemy soldiers in its land', gift: { production: 2 } },
    wood: { name: 'Wood Spirit', icon: '🌲', site: 'a settlement among woods', likes: 'four woods in its land', hates: 'woods cut down', gift: { culture: 1, production: 1 } },
    sun: { name: 'Sun Spirit', icon: '☀️', site: 'a settlement in the desert', likes: 'a Shrine, Temple or Wonder', hates: 'a cold world', gift: { culture: 2 } },
    frost: { name: 'Frost Spirit', icon: '❄️', site: 'a settlement in the cold north', likes: 'a worked Camp or Pasture', hates: 'a warm world', gift: { production: 1, happiness: 1 } },
    field: { name: 'Field Spirit', icon: '🌾', site: 'any other settlement', likes: 'three worked Farms', hates: 'hunger', gift: { food: 1, happiness: 1 } }
  };
  AU.SPIRIT_ORDER = ['river', 'sea', 'peak', 'wood', 'sun', 'frost', 'field'];
  // Tenets: every faith makes three choices over its life (at the Revelation, then at 250 and 600 Devotion earned, times the game speed).
  AU.TENETS = [
    { id: 'reach', name: 'How the faith meets strangers', options: [
      { id: 'open', name: 'Open Doors', desc: 'The faith spreads 50% stronger, and empires that share it like each other twice as much.' },
      { id: 'zeal', name: 'Zeal', desc: 'Other faiths push only half as hard in settlements of the faith, and your units fight +4 against empires of another state faith.' }
    ] },
    { id: 'land', name: 'How the faith treats the land', options: [
      { id: 'stewards', name: 'Stewards', desc: 'In settlements of the faith, pleased spirits give their gift twice and an angry spirit costs only 1 Happiness.' },
      { id: 'builders', name: 'Builders', desc: 'In settlements of the faith, Shrines and Temples also give +2 Production and every Wonder +2 Devotion.' }
    ] },
    { id: 'wealth', name: 'What the faith does with wealth', options: [
      { id: 'tithe', name: 'Tithe', desc: 'The Holy City collects a double tithe.' },
      { id: 'humility', name: 'Humility', desc: 'Settlements of the faith get +2 Happiness and +1 Heritage.' }
    ] }
  ];
  AU.TENET_BY_ID = {}; AU.TENETS.forEach(function (t) { t.options.forEach(function (o) { AU.TENET_BY_ID[o.id] = o; }); });
  // A faith is named after the spirit of its Holy City.
  AU.FAITH_NAMES = {
    river: [{ id: 'river_way', name: 'The River Way', icon: '🌊' }, { id: 'flood_children', name: 'Children of the Flood', icon: '💧' }, { id: 'long_water', name: 'The Long Water', icon: '🛶' }],
    sea: [{ id: 'salt_star', name: 'Salt and Star', icon: '⭐' }, { id: 'tide_covenant', name: 'The Tide Covenant', icon: '🐚' }, { id: 'deep_lantern', name: 'Lantern of the Deep', icon: '🏮' }],
    peak: [{ id: 'high_fire', name: 'The High Fire', icon: '🔥' }, { id: 'stone_fathers', name: 'The Stone Fathers', icon: '🪨' }, { id: 'summit_word', name: 'The Summit Word', icon: '⛰️' }],
    wood: [{ id: 'green_word', name: 'The Green Word', icon: '🌿' }, { id: 'oak_council', name: 'The Oak Council', icon: '🌳' }, { id: 'leaf_road', name: 'The Leaf Road', icon: '🍃' }],
    sun: [{ id: 'sun_hearth', name: 'Sun Hearth', icon: '🌞' }, { id: 'noon_law', name: 'The Noon Law', icon: '🔆' }, { id: 'sand_light', name: 'Sand and Light', icon: '🏜️' }],
    frost: [{ id: 'aurora_path', name: 'The Aurora Path', icon: '🌌' }, { id: 'white_silence', name: 'The White Silence', icon: '🤍' }, { id: 'snow_hearth', name: 'Hearth in the Snow', icon: '🕯️' }],
    field: [{ id: 'open_hand', name: 'The Open Hand', icon: '🤲' }, { id: 'harvest_mothers', name: 'The Harvest Mothers', icon: '🌻' }, { id: 'seed_season', name: 'Seed and Season', icon: '🌱' }]
  };
  AU.FAITH_NAME_LIST = []; AU.SPIRIT_ORDER.forEach(function (k) { AU.FAITH_NAMES[k].forEach(function (n) { n.spirit = k; AU.FAITH_NAME_LIST.push(n); }); });
})(globalThis.AU = globalThis.AU || {});
