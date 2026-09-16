// Scenarios: a real map, fixed empires with their historical leaders, free cities in their historical places.
// A scenario map (web/js/data/maps/*.js) is a hand-editable character grid the generator turns into a playable world.
(function (AU) {
  var TYPES = AU.CITY_STATE_TYPES;
  // Free cities of the ancient Mediterranean. They only appear in scenarios that list them (scenario: id).
  function S(id, name, type, color, abilityName, desc, fx, scenario) {
    var s = { id: id, name: name, type: type, color: color, ability: { name: abilityName, desc: desc, fx: fx }, scenario: scenario };
    s.adj = name; s.color2 = '#ffffff'; s.minor = true; s.cities = [name]; s.difficulty = 'medium'; s.bias = [];
    s.leaders = [{ id: 'cs_' + id, name: name, title: TYPES[type].name + ' city-state', civId: id, ability: { name: TYPES[type].name, desc: '', fx: {} }, ai: { aggression: 0, expansion: 0, science: 0.5, culture: 0.5, religion: type === 'religious' ? 0.9 : 0.2 } }];
    return s;
  }
  var ROR = 'rise_of_rome';
  var ANCIENT_STATES = [
    S('syracuse', 'Syracuse', 'science', '#2e86c1', 'Archimedes', 'Patron: Libraries +2 Knowledge.', { buildingBonus: { library: { science: 2 } } }, ROR),
    S('massalia', 'Massalia', 'trade', '#1abc9c', 'Greek Harbour', 'Patron: coastal settlements +2 Gold.', { coastalSettlementYields: { gold: 2 } }, ROR),
    S('cyrene', 'Cyrene', 'trade', '#d4ac0d', 'Silphium', 'Patron: +1 Happiness per luxury resource (max +4 extra).', { luxuryHappinessBonus: 1 }, ROR),
    S('rhodes', 'Rhodes', 'trade', '#e67e22', 'Colossus', 'Patron: +10% Gold.', { yieldMult: { gold: 1.1 } }, ROR),
    S('pergamon', 'Pergamon', 'culture', '#8e44ad', 'Library of Pergamon', 'Patron: +1 Heritage per settlement and +1 Happiness in the capital.', { culturePerSettlement: 1, capitalYields: { happiness: 1 } }, ROR),
    S('tyre', 'Tyre', 'trade', '#7d3c98', 'Purple Dye', 'Patron: Fishing Boats +1 Gold and +1 Food.', { tileBonus: [{ when: 'fishing', yields: { gold: 1, food: 1 } }] }, ROR),
    S('cirta', 'Cirta', 'military', '#a04000', 'Numidian Cavalry', 'Patron: cavalry units +1 movement.', { cavalryMoves: 1 }, ROR),
    S('gades', 'Gades', 'trade', '#2874a6', 'Pillars of Heracles', 'Patron: +2 Gold in every settlement.', { goldPerSettlement: 2 }, ROR),
    S('tarentum', 'Tarentum', 'culture', '#c0392b', 'Magna Graecia', 'Patron: +10% Heritage.', { yieldMult: { culture: 1.1 } }, ROR),
    S('sparta', 'Sparta', 'military', '#922b21', 'Agoge', 'Patron: melee units +3 Strength.', { meleeBonus: 3 }, ROR),
    S('byzantion', 'Byzantion', 'trade', '#1f618d', 'Golden Horn', 'Patron: +3 Gold and +1 Knowledge in the capital, town purchases 15% cheaper.', { capitalYields: { gold: 3, science: 1 }, townPurchaseMult: 0.85 }, ROR),
    S('sinope', 'Sinope', 'industrial', '#117a65', 'Black Sea Shipwrights', 'Patron: coastal settlements +2 Production.', { coastalSettlementYields: { production: 2 } }, ROR),
    S('petra', 'Petra', 'religious', '#b9770e', 'Rose City', 'Patron: desert tiles +1 Devotion and +1 Knowledge.', { tileBonus: [{ when: 'desert', yields: { faith: 1, science: 1 } }] }, ROR),
    S('olbia', 'Olbia', 'industrial', '#5d6d7e', 'Grain of the Steppe', 'Patron: Farms +1 Production.', { tileBonus: [{ when: 'farm', yields: { production: 1 } }] }, ROR),
    S('emporion', 'Emporion', 'trade', '#f39c12', 'Iberian Market', 'Patron: Towns +1 Production and +1 Gold.', { townYields: { production: 1, gold: 1 } }, ROR)
  ];
  ANCIENT_STATES.forEach(function (s) { AU.CITY_STATES.push(s); AU.CITY_STATE_BY_ID[s.id] = s; });

  AU.SCENARIOS = {
    rise_of_rome: {
      id: 'rise_of_rome', name: 'Rise of Rome', icon: '🏛️', map: 'mediterranean', era: 0,
      desc: 'The Mediterranean, 300 BC. Six ancient powers and twenty free cities share the real coastline from Iberia to Mesopotamia. Rome starts as a small republic on the Tiber: unite Italy, break Carthage, and make the Middle Sea your lake.',
      civs: [
        { civ: 'rome', leader: 'caesar', name: 'Roman Republic' },
        { civ: 'carthage', leader: 'hannibal', name: 'Carthage' },
        { civ: 'greece', leader: 'alexander', name: 'Macedon and the Greeks' },
        { civ: 'egypt', leader: 'cleopatra', name: 'Ptolemaic Egypt' },
        { civ: 'celts', leader: 'vercingetorix', name: 'The Gauls' },
        { civ: 'persia', leader: 'darius', name: 'The Seleucid East' }
      ],
      states: { genava: 'geneva' }, // map ids that stand for an existing free city
      camps: 14, speed: 'standard', foundCapitals: true, extraWarriors: 1,
      capitalNames: { rome: 'Roma', carthage: 'Carthago', greece: 'Athenai', egypt: 'Alexandria', celts: 'Bibracte', persia: 'Seleucia' }
    }
  };
  // Decode a scenario map into the per-tile template the generator understands.
  AU.scenarioTemplate = function (sc) {
    var m = AU.SCENARIO_MAPS && AU.SCENARIO_MAPS[sc.map]; if (!m) throw new Error('missing scenario map ' + sc.map);
    var W = m.w, H = m.h, n = W * H, land = new Uint8Array(n), terrain = new Array(n), hills = new Uint8Array(n);
    for (var r = 0; r < H; r++) { var row = m.rows[r]; for (var c = 0; c < W; c++) { var ch = row[c] || '.', i = r * W + c; if (ch === '.') continue; if (ch === 'l') { land[i] = 0; terrain[i] = 'lake'; continue; } land[i] = 1; if (ch === 'h') hills[i] = 1; else if (ch === 'm') terrain[i] = 'mountain'; else if (ch === 'd') terrain[i] = 'desert'; else if (ch === 'D') { terrain[i] = 'desert'; hills[i] = 1; } } }
    var starts = sc.civs.map(function (cv) { var e = m.starts.filter(function (s) { return s[0] === cv.civ; })[0]; if (!e) throw new Error('no start for ' + cv.civ); return e[1]; });
    var stateIds = [], stateTiles = [];
    m.states.forEach(function (s) { var id = (sc.states && sc.states[s[0]]) || s[0]; if (!AU.CITY_STATE_BY_ID[id]) return; stateIds.push(id); stateTiles.push(s[1]); });
    return { w: W, h: H, land: land, terrain: terrain, hills: hills, latOf: function (row) { return m.lat1 - (row + 0.5) * (m.lat1 - m.lat0) / H; }, rivers: m.rivers.map(function (rv) { return rv.tiles; }), naturals: m.naturals, starts: starts, stateTiles: stateTiles, stateIds: stateIds };
  };
})(globalThis.AU = globalThis.AU || {});
