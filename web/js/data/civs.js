// 30 civilizations, each with two or three leaders. A leader can only rule their own civilization.
// Every civilization has a permanent civ ability, a unique unit and a unique building; every leader adds
// a leader ability on top, so Rome under Caesar plays differently from Rome under Augustus.
(function (AU) {
  function L(id, name, title, abName, abDesc, fx, ai) { return { id: id, name: name, title: title, ability: { name: abName, desc: abDesc, fx: fx }, ai: ai }; }
  AU.CIVS = [
    { id: 'rome', name: 'Rome', adj: 'Roman', color: '#8b1a1a', color2: '#f5d76e',
      ability: { name: 'Pax Romana', desc: 'Every new settlement starts with a free Monument. Upgrading a Town into a City costs 25% less.', fx: { freeBuilding: 'monument', cityUpgradeCostMult: 0.75 } },
      uu: { id: 'legion', name: 'Legion', replaces: 'swordsman', strength: 4, desc: '+4 Combat Strength' },
      ub: { id: 'forum', name: 'Forum', replaces: 'market', yields: { gold: 2, culture: 1 }, desc: '+2 Gold, +1 Culture' },
      cities: ['Roma', 'Ostia', 'Antium', 'Cumae', 'Ravenna', 'Neapolis', 'Mediolanum', 'Aquileia', 'Brundisium', 'Capua', 'Verona', 'Tarentum'],
      leaders: [
        L('trajan', 'Trajan', 'Optimus Princeps', 'Column of Victory', 'Capturing a settlement keeps all its buildings and loses no population. +100 Gold per capture.', { captureKeepBuildings: true, captureNoPopLoss: true, captureGold: 100 }, { aggression: 0.75, expansion: 0.7, science: 0.4, culture: 0.4 }),
        L('augustus', 'Augustus', 'Princeps', 'Marble City', 'Wonders cost 20% less and each Wonder yields +2 Culture. +1 Happiness in every settlement.', { wonderCostMult: 0.8, culturePerWonder: 2, happinessBonus: 1 }, { aggression: 0.3, expansion: 0.6, science: 0.5, culture: 0.8 }),
        L('caesar', 'Julius Caesar', 'Dictator', 'Veni Vidi Vici', 'Land units +3 Strength and +1 Movement in enemy territory is not needed: they simply gain +25 Gold and +1 XP per kill.', { landBonus: 3, goldPerKill: 25, xpMult: 1.5 }, { aggression: 0.9, expansion: 0.6, science: 0.3, culture: 0.3 })
      ] },

    { id: 'japan', name: 'Japan', adj: 'Japanese', color: '#f2f2f2', color2: '#c0392b',
      ability: { name: 'Bushido', desc: 'Units fight at full strength no matter how damaged they are. Coastal settlements +1 Production.', fx: { noDamagePenalty: true, coastalSettlementYields: { production: 1 } } },
      uu: { id: 'samurai', name: 'Samurai', replaces: 'pikeman', strength: 5, desc: '+5 Combat Strength' },
      ub: { id: 'dojo', name: 'Dojo', replaces: 'barracks', yields: { production: 1, culture: 2 }, unitStrength: 2, desc: '+1 Production, +2 Culture, units built here +2 Strength' },
      cities: ['Kyoto', 'Osaka', 'Edo', 'Nagoya', 'Kamakura', 'Nara', 'Sapporo', 'Kanazawa', 'Sendai', 'Hiroshima', 'Fukuoka', 'Nagasaki'],
      leaders: [
        L('tokugawa', 'Tokugawa Ieyasu', 'Shogun', 'Sakoku', '+5 Strength for units inside your borders and +3 settlement defense. Towns convert Production to Gold at 125%.', { combatBonusHome: 5, cityDefense: 3, townGoldMult: 1.25 }, { aggression: 0.3, expansion: 0.5, science: 0.6, culture: 0.6 }),
        L('hojo', 'Hojo Tokimune', 'Shikken', 'Kamikaze', 'Naval units +6 Strength and +1 Movement. Units on Coast tiles +5 Strength.', { navalBonus: 6, navalMoves: 1, combatBonusCoast: 5 }, { aggression: 0.5, expansion: 0.5, science: 0.5, culture: 0.5 }),
        L('meiji', 'Emperor Meiji', 'Emperor', 'Restoration', 'Technologies cost 10% less. Every building yields +1 Science in Cities.', { techCostMult: 0.9, cityBuildingScience: 1 }, { aggression: 0.35, expansion: 0.5, science: 0.9, culture: 0.6 })
      ] },

    { id: 'china', name: 'China', adj: 'Chinese', color: '#2e8b57', color2: '#f7e04b',
      ability: { name: 'Mandate of Heaven', desc: 'Civics cost 10% less. Settlements may expand into a fourth ring of tiles.', fx: { civicCostMult: 0.9, expansionRadius: 1 } },
      uu: { id: 'crouching_tiger', name: 'Crouching Tiger', replaces: 'crossbowman', ranged: 5, desc: '+5 Ranged Strength' },
      ub: { id: 'great_wall_tower', name: 'Great Wall', replaces: 'walls', yields: { culture: 2, gold: 1 }, desc: '+2 Culture, +1 Gold' },
      cities: ['Xi\'an', 'Beijing', 'Nanjing', 'Luoyang', 'Guangzhou', 'Hangzhou', 'Chengdu', 'Kaifeng', 'Suzhou', 'Wuhan', 'Xiamen', 'Tianjin'],
      leaders: [
        L('qin', 'Qin Shi Huang', 'First Emperor', 'Terracotta Legions', 'Wonders cost 20% less. Every settlement starts with free Walls once Masonry is known.', { wonderCostMult: 0.8, freeBuildingWithTech: { walls: 'masonry' } }, { aggression: 0.4, expansion: 0.6, science: 0.6, culture: 0.6 }),
        L('wu', 'Wu Zetian', 'Empress', 'Silk and Ink', 'Each worked Luxury resource yields +2 Culture. +1 Happiness in every settlement.', { luxuryCulture: 2, happinessBonus: 1 }, { aggression: 0.3, expansion: 0.6, science: 0.7, culture: 0.8 }),
        L('kublai', 'Kublai Khan', 'Emperor', 'Grand Canal', 'Towns send 50% more food to Cities and yield +2 Gold when specialized. Cavalry +3 Strength.', { townFoodMult: 1.5, specializedTownYields: { gold: 2 }, cavalryBonus: 3 }, { aggression: 0.6, expansion: 0.7, science: 0.5, culture: 0.4 })
      ] },

    { id: 'america', name: 'America', adj: 'American', color: '#1f3f8f', color2: '#ffffff',
      ability: { name: 'Manifest Destiny', desc: 'Settlers cost 20% less and move +1. Towns grow 15% faster.', fx: { settlerCostMult: 0.8, civilianMoves: 1, townGrowthMult: 1.15 } },
      uu: { id: 'minuteman', name: 'Minuteman', replaces: 'musketman', strength: 3, defense: 5, desc: '+3 Strength, +5 when defending' },
      ub: { id: 'film_studio', name: 'Film Studio', replaces: 'broadcast_tower', yields: { culture: 4 }, desc: '+4 Culture' },
      cities: ['Washington', 'New York', 'Boston', 'Philadelphia', 'Chicago', 'Los Angeles', 'Atlanta', 'Seattle', 'Houston', 'Denver', 'Miami', 'Detroit'],
      leaders: [
        L('roosevelt', 'Theodore Roosevelt', 'President', 'Big Stick', '+5 Strength for units on your home continent. Other leaders start friendlier toward you.', { combatBonusHomeContinent: 5, attitudeBonus: 10 }, { aggression: 0.5, expansion: 0.7, science: 0.6, culture: 0.6 }),
        L('lincoln', 'Abraham Lincoln', 'President', 'A House United', 'Cities +2 Production; +1 Happiness in every settlement; unit upkeep: 4 extra free units.', { citySiteYields: { production: 2 }, happinessBonus: 1, freeUpkeep: 4 }, { aggression: 0.35, expansion: 0.6, science: 0.6, culture: 0.5 }),
        L('franklin', 'Benjamin Franklin', 'Statesman', 'Lightning Rod', 'Libraries and Universities yield +2 Science. Gain 40 Gold whenever you learn a technology.', { buildingBonus: { library: { science: 2 }, university: { science: 2 } }, techGold: 40 }, { aggression: 0.2, expansion: 0.5, science: 0.9, culture: 0.6 })
      ] },

    { id: 'india', name: 'India', adj: 'Indian', color: '#f39c12', color2: '#1a5e2a',
      ability: { name: 'Dharma', desc: '+1 Happiness in every settlement. Specialized Towns yield +2 Culture.', fx: { happinessBonus: 1, specializedTownYields: { culture: 2 } } },
      uu: { id: 'varu', name: 'War Elephant', replaces: 'horseman', strength: 5, noResource: true, desc: '+5 Strength, needs no Horses' },
      ub: { id: 'stepwell', name: 'Stepwell', replaces: 'granary', yields: { food: 1, happiness: 1 }, desc: '+1 Food, +1 Happiness' },
      cities: ['Delhi', 'Mumbai', 'Vijayanagara', 'Pataliputra', 'Varanasi', 'Agra', 'Calcutta', 'Lahore', 'Bengaluru', 'Hyderabad', 'Madurai', 'Ahmedabad'],
      leaders: [
        L('gandhi', 'Gandhi', 'Mahatma', 'Satyagraha', 'Settlements grow 20% faster and never lose yields to unhappiness. Others start friendlier toward you.', { growthMult: 1.2, noUnhappinessPenalty: true, attitudeBonus: 15 }, { aggression: 0.1, expansion: 0.6, science: 0.6, culture: 0.7 }),
        L('ashoka', 'Ashoka', 'Emperor', 'Edicts of Stone', '+2 Culture per settlement. Capturing a settlement grants +150 Culture; conquered settlements keep their buildings.', { culturePerSettlement: 2, captureCulture: 150, captureKeepBuildings: true }, { aggression: 0.5, expansion: 0.6, science: 0.5, culture: 0.8 }),
        L('akbar', 'Akbar', 'Padishah', 'Din-i Ilahi', 'Each worked Luxury gives +1 extra Happiness. Purchases in Towns cost 20% less.', { luxuryHappinessBonus: 1, townPurchaseMult: 0.8 }, { aggression: 0.4, expansion: 0.7, science: 0.6, culture: 0.6 })
      ] },

    { id: 'indonesia', name: 'Indonesia', adj: 'Indonesian', color: '#7d2a7d', color2: '#f1c40f',
      ability: { name: 'Nusantara', desc: 'Worked Coast and Lake tiles yield +1 Food and +1 Gold. Units embark at full strength (defense 20).', fx: { tileBonus: [{ when: 'water', yields: { food: 1, gold: 1 } }], embarkedStrength: 20 } },
      uu: { id: 'jong', name: 'Jong', replaces: 'caravel', strength: 8, moves: 1, desc: '+8 Strength, +1 Movement' },
      ub: { id: 'kampung', name: 'Kampung', replaces: 'lighthouse', yields: { food: 2, production: 1 }, desc: '+2 Food, +1 Production' },
      cities: ['Majapahit', 'Surabaya', 'Jakarta', 'Palembang', 'Makassar', 'Yogyakarta', 'Banda Aceh', 'Malang', 'Bali', 'Medan', 'Semarang', 'Ambon'],
      leaders: [
        L('gitarja', 'Gitarja', 'Queen', 'Sea of Temples', 'Naval units cost 30% less. Coastal settlements +2 Culture.', { navalCostMult: 0.7, coastalSettlementYields: { culture: 2 } }, { aggression: 0.4, expansion: 0.6, science: 0.5, culture: 0.6 }),
        L('gajah', 'Gajah Mada', 'Mahapatih', 'Palapa Oath', 'Naval units +5 Strength; capturing coastal settlements grants +100 Gold; +1 Movement for embarked units.', { navalBonus: 5, captureGold: 100, embarkMoves: 1 }, { aggression: 0.8, expansion: 0.6, science: 0.4, culture: 0.4 })
      ] },

    { id: 'mongolia', name: 'Mongolia', adj: 'Mongol', color: '#5b3a1e', color2: '#e8d5a3',
      ability: { name: 'Horde', desc: 'Cavalry +1 Movement. Mounted units cost 20% less.', fx: { cavalryMoves: 1, classCostMult: { cavalry: 0.8 } } },
      uu: { id: 'keshig', name: 'Keshig', replaces: 'knight', strength: 4, moves: 1, desc: '+4 Strength, +1 Movement' },
      ub: { id: 'ordu', name: 'Ordu', replaces: 'barracks', yields: { production: 2, gold: 1 }, desc: '+2 Production, +1 Gold' },
      cities: ['Karakorum', 'Beshbalik', 'Turfan', 'Hsia', 'Old Sarai', 'New Sarai', 'Tabriz', 'Tiflis', 'Otrar', 'Sanchu', 'Kazan', 'Almarikh'],
      leaders: [
        L('genghis', 'Genghis Khan', 'Great Khan', 'Terror of the Steppe', 'Cavalry +5 Strength. Capturing a settlement grants 100 Gold and heals all your units nearby.', { cavalryBonus: 5, captureGold: 100, captureHeal: true }, { aggression: 0.95, expansion: 0.6, science: 0.3, culture: 0.2 }),
        L('mandukhai', 'Mandukhai', 'Khatun', 'Unifier of the Clans', '+1 Happiness per settlement, units heal +10 everywhere, units gain XP 50% faster.', { happinessBonus: 1, healBonusAll: 10, xpMult: 1.5 }, { aggression: 0.6, expansion: 0.7, science: 0.4, culture: 0.4 })
      ] },

    { id: 'zulu', name: 'Zulu', adj: 'Zulu', color: '#3a2c1c', color2: '#e74c3c',
      ability: { name: 'Amabutho', desc: 'Melee and anti-cavalry units cost 25% less and start with a level of experience.', fx: { classCostMult: { melee: 0.75, antcav: 0.75 }, unitsStartXp: 5 } },
      uu: { id: 'impi', name: 'Impi', replaces: 'pikeman', strength: 3, moves: 1, costMult: 0.75, desc: '+3 Strength, +1 Movement, cheaper' },
      ub: { id: 'ikanda', name: 'Ikanda', replaces: 'barracks', yields: { production: 2 }, unitStrength: 1, desc: '+2 Production, units built here +1 Strength' },
      cities: ['Ulundi', 'uMgungundlovu', 'kwaBulawayo', 'kwaDukuza', 'Nobamba', 'Eshowe', 'Ondini', 'Isandlwana', 'Nongoma', 'Empangeni', 'Melmoth', 'Mthonjaneni'],
      leaders: [
        L('shaka', 'Shaka', 'King', 'Horns of the Buffalo', 'Melee units +6 Strength when attacking. Killing a unit grants +10 Culture.', { meleeAttackBonus: 6, culturePerKill: 10 }, { aggression: 0.95, expansion: 0.5, science: 0.2, culture: 0.3 }),
        L('cetshwayo', 'Cetshwayo', 'King', 'Isandlwana', '+8 Strength when defending inside your borders; units in your territory heal +15.', { homeDefenseBonus: 8, healBonusHome: 15 }, { aggression: 0.5, expansion: 0.5, science: 0.4, culture: 0.4 })
      ] },

    { id: 'persia', name: 'Persia', adj: 'Persian', color: '#7b2f8a', color2: '#f5cba7',
      ability: { name: 'Royal Road', desc: '+2 Gold per settlement. Units +1 Movement inside your borders.', fx: { goldPerSettlement: 2, homeMoves: 1 } },
      uu: { id: 'immortal', name: 'Immortal', replaces: 'swordsman', strength: 2, defense: 5, desc: '+2 Strength, +5 when defending' },
      ub: { id: 'pairidaeza', name: 'Pairidaeza', replaces: 'amphitheater', yields: { culture: 2, gold: 2 }, desc: '+2 Culture, +2 Gold' },
      cities: ['Pasargadae', 'Susa', 'Persepolis', 'Ecbatana', 'Babylon', 'Sardis', 'Bactra', 'Tarsus', 'Gordion', 'Arbela', 'Rhagae', 'Zranka'],
      leaders: [
        L('cyrus', 'Cyrus', 'King of Kings', 'Cylinder of Mercy', 'Conquered settlements keep buildings and lose no population; +2 Happiness in captured settlements.', { captureKeepBuildings: true, captureNoPopLoss: true, capturedHappiness: 2 }, { aggression: 0.6, expansion: 0.7, science: 0.5, culture: 0.6 }),
        L('darius', 'Darius I', 'Shahanshah', 'Satrapies', 'Towns yield +3 Gold and specialized Towns +1 Science. Purchases cost 10% less.', { townYields: { gold: 3 }, specializedTownYields: { science: 1 }, purchaseMult: 0.9 }, { aggression: 0.4, expansion: 0.8, science: 0.6, culture: 0.5 })
      ] },

    { id: 'egypt', name: 'Egypt', adj: 'Egyptian', color: '#d4ac0d', color2: '#1b2631',
      ability: { name: 'Gift of the Nile', desc: 'Worked River tiles yield +1 Food. Settlements on rivers +1 Production and +1 Culture.', fx: { tileBonus: [{ when: 'river', yields: { food: 1 } }], settlementSiteBonus: [{ when: 'river', yields: { production: 1, culture: 1 } }] } },
      uu: { id: 'maryannu', name: 'Chariot Archer', replaces: 'archer', ranged: 5, moves: 1, desc: '+5 Ranged Strength, +1 Movement' },
      ub: { id: 'nilometer', name: 'Nilometer', replaces: 'water_mill', yields: { food: 2, gold: 1 }, desc: '+2 Food, +1 Gold' },
      cities: ['Ra-Kedet', 'Thebes', 'Memphis', 'Akhetaten', 'Heliopolis', 'Elephantine', 'Alexandria', 'Pi-Ramesses', 'Abydos', 'Giza', 'Edfu', 'Tanis'],
      leaders: [
        L('cleopatra', 'Cleopatra', 'Pharaoh', 'Ptolemaic Court', '+15% Gold. Other leaders start friendlier toward you and wars declared on you cause 50% less war weariness.', { yieldMult: { gold: 1.15 }, attitudeBonus: 15, warWearinessMult: 0.5 }, { aggression: 0.3, expansion: 0.5, science: 0.5, culture: 0.8 }),
        L('ramses', 'Ramses II', 'Pharaoh', 'Builder of Monuments', 'Wonders cost 25% less and each Wonder yields +1 Happiness and +2 Culture.', { wonderCostMult: 0.75, happinessPerWonder: 1, culturePerWonder: 2 }, { aggression: 0.5, expansion: 0.5, science: 0.4, culture: 0.9 }),
        L('hatshepsut', 'Hatshepsut', 'Pharaoh', 'Expedition to Punt', 'Each worked Luxury yields +2 Gold. Naval units +1 Movement; Trade Outposts yield +3 Gold.', { luxuryGold: 2, navalMoves: 1, specializationYields: { trade: { gold: 3 } } }, { aggression: 0.2, expansion: 0.6, science: 0.6, culture: 0.6 })
      ] },

    { id: 'celts', name: 'Celts', adj: 'Celtic', color: '#1e6b3a', color2: '#e0e0e0',
      ability: { name: 'Sacred Groves', desc: 'Worked Forest tiles yield +1 Production and +1 Culture. Units move through forest at normal cost.', fx: { tileBonus: [{ when: 'forest', yields: { production: 1, culture: 1 } }], forestMoveCost: 1 } },
      uu: { id: 'gaesatae', name: 'Gaesatae', replaces: 'spearman', strength: 5, desc: '+5 Strength' },
      ub: { id: 'ceilidh_hall', name: 'Ceilidh Hall', replaces: 'amphitheater', yields: { culture: 2, happiness: 1 }, desc: '+2 Culture, +1 Happiness' },
      cities: ['Camulodunon', 'Bibracte', 'Alesia', 'Verlamion', 'Gergovia', 'Lugdunon', 'Eburacon', 'Tara', 'Dun Ollaigh', 'Isca', 'Namnetes', 'Durocornovium'],
      leaders: [
        L('boudica', 'Boudica', 'Queen', 'Iceni Fury', 'Units +6 Strength in Forest and Rainforest. Melee units +3 when attacking.', { combatBonusForest: 6, meleeAttackBonus: 3 }, { aggression: 0.8, expansion: 0.5, science: 0.3, culture: 0.5 }),
        L('vercingetorix', 'Vercingetorix', 'Chieftain', 'Oppidum', 'Settlements on Hills +5 defense, +1 Production and +1 Culture. Fort Towns heal units fully each turn.', { settlementSiteBonus: [{ when: 'hills', yields: { production: 1, culture: 1 } }], hillsDefense: 5, fortFullHeal: true }, { aggression: 0.5, expansion: 0.6, science: 0.4, culture: 0.5 })
      ] },

    { id: 'arabia', name: 'Arabia', adj: 'Arabian', color: '#1a7a4a', color2: '#f4f4f4',
      ability: { name: 'Caravanserai', desc: 'Worked Desert tiles yield +1 Gold. Trade Outposts yield +2 Science.', fx: { tileBonus: [{ when: 'desert', yields: { gold: 1 } }], specializationYields: { trade: { science: 2 } } } },
      uu: { id: 'mamluk', name: 'Mamluk', replaces: 'knight', strength: 2, healAlways: true, desc: '+2 Strength, heals every turn even after moving' },
      ub: { id: 'madrasa', name: 'Madrasa', replaces: 'university', yields: { science: 2, culture: 1 }, desc: '+2 Science, +1 Culture' },
      cities: ['Cairo', 'Damascus', 'Baghdad', 'Mecca', 'Medina', 'Aleppo', 'Basra', 'Jerusalem', 'Kufa', 'Mosul', 'Sana\'a', 'Muscat'],
      leaders: [
        L('saladin', 'Saladin', 'Sultan', 'Righteous Blade', 'Units +5 Strength when fighting near your settlements (within 3 tiles). Capturing a settlement heals your nearby units.', { nearHomeBonus: 5, captureHeal: true }, { aggression: 0.6, expansion: 0.6, science: 0.6, culture: 0.5 }),
        L('harun', 'Harun al-Rashid', 'Caliph', 'House of Wisdom', '+10% Science; each Wonder yields +3 Science; gain a free technology when you build your first Library.', { yieldMult: { science: 1.1 }, sciencePerWonder: 3, freeTechOnBuilding: 'library' }, { aggression: 0.3, expansion: 0.6, science: 0.9, culture: 0.6 })
      ] },

    { id: 'france', name: 'France', adj: 'French', color: '#2c3e9e', color2: '#f5f5f5',
      ability: { name: 'Grand Siècle', desc: 'Each Wonder yields +2 Culture. Wonders cost 10% less.', fx: { culturePerWonder: 2, wonderCostMult: 0.9 } },
      uu: { id: 'garde_imperiale', name: 'Garde Impériale', replaces: 'musketman', strength: 5, desc: '+5 Strength' },
      ub: { id: 'salon', name: 'Salon', replaces: 'museum', yields: { culture: 3, gold: 1 }, desc: '+3 Culture, +1 Gold' },
      cities: ['Paris', 'Orléans', 'Lyon', 'Marseille', 'Bordeaux', 'Toulouse', 'Rouen', 'Reims', 'Nantes', 'Strasbourg', 'Lille', 'Dijon'],
      leaders: [
        L('napoleon', 'Napoleon Bonaparte', 'Emperor', 'Grande Armée', 'Land units +4 Strength and cost 15% less. Siege units +5 vs settlements.', { landBonus: 4, unitCostMult: 0.85, vsSettlements: 5 }, { aggression: 0.9, expansion: 0.6, science: 0.5, culture: 0.6 }),
        L('louis', 'Louis XIV', 'Sun King', 'Versailles', '+2 Culture per settlement, capital +20% Culture and Gold; Theocracy and Monarchy give +2 extra Happiness.', { culturePerSettlement: 2, capitalMult: { culture: 1.2, gold: 1.2 }, monarchHappiness: 2 }, { aggression: 0.5, expansion: 0.5, science: 0.5, culture: 0.9 }),
        L('joan', 'Joan of Arc', 'Maid of Orléans', 'Divine Mission', '+8 Strength when defending inside your borders; units heal +10 in your territory; +1 Happiness per settlement.', { homeDefenseBonus: 8, healBonusHome: 10, happinessBonus: 1 }, { aggression: 0.3, expansion: 0.5, science: 0.5, culture: 0.7 })
      ] },

    { id: 'england', name: 'England', adj: 'English', color: '#b71c1c', color2: '#ffffff',
      ability: { name: 'Rule the Waves', desc: 'Naval units +1 Movement and cost 20% less. Coastal settlements +2 Gold.', fx: { navalMoves: 1, navalCostMult: 0.8, coastalSettlementYields: { gold: 2 } } },
      uu: { id: 'redcoat', name: 'Redcoat', replaces: 'rifleman', strength: 5, desc: '+5 Strength' },
      ub: { id: 'royal_dockyard', name: 'Royal Navy Dockyard', replaces: 'harbor', yields: { gold: 4, production: 1 }, desc: '+4 Gold, +1 Production' },
      cities: ['London', 'York', 'Liverpool', 'Bristol', 'Manchester', 'Norwich', 'Birmingham', 'Leeds', 'Nottingham', 'Exeter', 'Canterbury', 'Newcastle'],
      leaders: [
        L('victoria', 'Victoria', 'Queen', 'Workshop of the World', 'Factories and Workshops yield +3 Production; +10% Production in Cities.', { buildingBonus: { factory: { production: 3 }, workshop: { production: 3 } }, cityYieldMult: { production: 1.1 } }, { aggression: 0.5, expansion: 0.7, science: 0.7, culture: 0.5 }),
        L('elizabeth', 'Elizabeth I', 'Queen', 'Sea Dogs', 'Naval units +5 Strength; killing a unit at sea or dispersing a camp grants triple Gold.', { navalBonus: 5, campGoldMult: 3, navalKillGold: 60 }, { aggression: 0.6, expansion: 0.6, science: 0.6, culture: 0.6 }),
        L('churchill', 'Winston Churchill', 'Prime Minister', 'Finest Hour', 'Settlements +5 defense and their walls always fire. Units +5 Strength when defending.', { cityDefense: 5, cityAttackNoWalls: true, defenseBonus: 5 }, { aggression: 0.4, expansion: 0.5, science: 0.6, culture: 0.5 })
      ] },

    { id: 'aztec', name: 'Aztec', adj: 'Aztec', color: '#0e6655', color2: '#f0b27a',
      ability: { name: 'Flower Wars', desc: 'Killing a unit grants +10 Culture and +5 Gold. Melee units +1 Strength per worked Luxury (max +5).', fx: { culturePerKill: 10, goldPerKill: 5, strPerLuxury: 1 } },
      uu: { id: 'eagle_warrior', name: 'Eagle Warrior', replaces: 'warrior', strength: 8, desc: '+8 Strength' },
      ub: { id: 'tlachtli', name: 'Tlachtli', replaces: 'amphitheater', yields: { culture: 1, happiness: 2 }, desc: '+1 Culture, +2 Happiness' },
      cities: ['Tenochtitlan', 'Texcoco', 'Tlatelolco', 'Tlacopan', 'Xochimilco', 'Azcapotzalco', 'Chalco', 'Tula', 'Cholula', 'Cuauhnahuac', 'Tlaxcala', 'Malinalco'],
      leaders: [
        L('montezuma', 'Montezuma', 'Tlatoani', 'Tribute of Blood', 'Each worked Luxury gives +1 extra Happiness. Captured settlements grant +200 Gold.', { luxuryHappinessBonus: 1, captureGold: 200 }, { aggression: 0.85, expansion: 0.5, science: 0.3, culture: 0.5 }),
        L('itzcoatl', 'Itzcoatl', 'Tlatoani', 'Triple Alliance', '+1 Production per settlement in the capital... simplified: capital +15% Production, units cost 15% less, settlers 20% cheaper.', { capitalMult: { production: 1.15 }, unitCostMult: 0.85, settlerCostMult: 0.8 }, { aggression: 0.6, expansion: 0.8, science: 0.4, culture: 0.4 })
      ] },

    { id: 'inca', name: 'Inca', adj: 'Incan', color: '#a04000', color2: '#f9e79f',
      ability: { name: 'Terraces', desc: 'Worked Hills yield +1 Food. Units can cross Mountains (3 movement).', fx: { tileBonus: [{ when: 'hills', yields: { food: 1 } }], mountainsPassable: true } },
      uu: { id: 'warakaq', name: "Warak'aq", replaces: 'archer', ranged: 3, moves: 1, desc: '+3 Ranged Strength, +1 Movement' },
      ub: { id: 'qollqa', name: 'Qollqa', replaces: 'granary', yields: { food: 2, production: 1 }, desc: '+2 Food, +1 Production' },
      cities: ['Cusco', 'Machu Picchu', 'Ollantaytambo', 'Vilcabamba', 'Cajamarca', 'Quito', 'Tiwanaku', 'Chan Chan', 'Huánuco', 'Arequipa', 'Pisac', 'Vitcos'],
      leaders: [
        L('pachacuti', 'Pachacuti', 'Sapa Inca', 'Qhapaq Ñan', 'Units +1 Movement inside your borders; worked Hills +1 Production; Mining Towns +2 Gold.', { homeMoves: 1, tileBonus: [{ when: 'hills', yields: { production: 1 } }], specializationYields: { mining: { gold: 2 } } }, { aggression: 0.3, expansion: 0.7, science: 0.5, culture: 0.5 }),
        L('huayna', 'Huayna Capac', 'Sapa Inca', 'Mit\'a Levy', 'Towns convert Production to Gold at 130% and grow 15% faster. Settlers cost 15% less.', { townGoldMult: 1.3, townGrowthMult: 1.15, settlerCostMult: 0.85 }, { aggression: 0.4, expansion: 0.9, science: 0.4, culture: 0.4 })
      ] },

    { id: 'maya', name: 'Maya', adj: 'Mayan', color: '#117864', color2: '#fdfefe',
      ability: { name: 'Long Count', desc: 'Farms yield +1 Food. +1 Science per 2 population in every settlement.', fx: { tileBonus: [{ when: 'farm', yields: { food: 1 } }], sciencePerPop: 0.5 } },
      uu: { id: 'hulche', name: "Hul'che", replaces: 'archer', ranged: 3, bonusVsDamaged: 5, desc: '+3 Ranged Strength, +5 vs damaged units' },
      ub: { id: 'observatory', name: 'Observatory', replaces: 'library', yields: { science: 2 }, desc: '+2 Science' },
      cities: ['Mutal', 'Yaxchilan', 'Calakmul', 'Uxmal', 'Chichen Itza', 'Copan', 'Palenque', 'Caracol', 'Coba', 'Tulum', 'Mayapan', 'Naranjo'],
      leaders: [
        L('sixsky', 'Lady Six Sky', 'Queen', 'Ix Mutal Ajaw', 'Settlements within 6 tiles of the capital yield +15%; units +5 Strength within 6 tiles of the capital.', { capitalRadiusBonus: { radius: 6, mult: 1.15 }, capitalRadiusCombat: { radius: 6, bonus: 5 } }, { aggression: 0.4, expansion: 0.5, science: 0.8, culture: 0.5 }),
        L('pakal', 'K\'inich Janaab\' Pakal', 'Ajaw', 'Temple of Inscriptions', 'Wonders cost 15% less; each Wonder yields +3 Science and +1 Happiness.', { wonderCostMult: 0.85, sciencePerWonder: 3, happinessPerWonder: 1 }, { aggression: 0.3, expansion: 0.5, science: 0.8, culture: 0.7 })
      ] },

    { id: 'shawnee', name: 'Shawnee', adj: 'Shawnee', color: '#6e2c00', color2: '#7fb3d5',
      ability: { name: 'Kithita', desc: 'Worked River tiles yield +1 Food and +1 Culture. Independent camps yield triple Gold when dispersed.', fx: { tileBonus: [{ when: 'river', yields: { food: 1, culture: 1 } }], campGoldMult: 3 } },
      uu: { id: 'kispoko', name: 'Kispoko Warrior', replaces: 'horseman', strength: 4, moves: 1, desc: '+4 Strength, +1 Movement' },
      ub: { id: 'council_lodge', name: 'Council Lodge', replaces: 'monument', yields: { culture: 1, happiness: 1 }, desc: '+1 Culture, +1 Happiness' },
      cities: ['Chalahgawtha', 'Piqua', 'Wapakoneta', 'Kispoko', 'Mekoche', 'Prophetstown', 'Lower Shawneetown', 'Tippecanoe', 'Blue Jacket\'s Town', 'Girty\'s Town', 'Cornstalk\'s Town', 'Hog Creek'],
      leaders: [
        L('tecumseh', 'Tecumseh', 'War Chief', 'Confederacy', 'Units +5 Strength vs independents and +3 inside your borders; units heal +10 in your territory.', { vsIndependents: 5, combatBonusHome: 3, healBonusHome: 10 }, { aggression: 0.5, expansion: 0.6, science: 0.4, culture: 0.6 }),
        L('cornstalk', 'Cornstalk', 'Chief', 'Council Fire', '+2 Culture per settlement; Towns grow 20% faster; Farming Towns +2 Food.', { culturePerSettlement: 2, townGrowthMult: 1.2, specializationYields: { farming: { food: 2 } } }, { aggression: 0.3, expansion: 0.7, science: 0.5, culture: 0.7 })
      ] },

    { id: 'greece', name: 'Greece', adj: 'Greek', color: '#1a5276', color2: '#f4f6f7',
      ability: { name: 'Agora', desc: '+10% Culture. Governments give +1 Happiness per settlement (any except Chiefdom).', fx: { yieldMult: { culture: 1.1 }, governmentHappiness: 1 } },
      uu: { id: 'hoplite', name: 'Hoplite', replaces: 'spearman', strength: 5, desc: '+5 Strength' },
      ub: { id: 'odeon', name: 'Odeon', replaces: 'amphitheater', yields: { culture: 2, science: 1 }, desc: '+2 Culture, +1 Science' },
      cities: ['Athens', 'Sparta', 'Corinth', 'Thebes', 'Argos', 'Delphi', 'Rhodes', 'Ephesus', 'Miletus', 'Knossos', 'Olympia', 'Pella'],
      leaders: [
        L('pericles', 'Pericles', 'Strategos', 'Golden Age of Athens', 'Each Wonder yields +2 Science and +2 Culture; Amphitheaters +2 Culture.', { sciencePerWonder: 2, culturePerWonder: 2, buildingBonus: { amphitheater: { culture: 2 } } }, { aggression: 0.3, expansion: 0.5, science: 0.7, culture: 0.9 }),
        L('leonidas', 'Leonidas', 'King', 'Thermopylae', 'Anti-cavalry +6 Strength; +10 Strength when defending on Hills; units start with a level.', { classBonus: { antcav: 6 }, hillsDefenseBonus: 10, unitsStartXp: 5 }, { aggression: 0.7, expansion: 0.4, science: 0.3, culture: 0.4 }),
        L('alexander', 'Alexander', 'King of Macedon', 'To the Ends of the World', 'No war weariness. Capturing a settlement grants a free technology boost of 60 Science; cavalry +4 Strength.', { warWearinessMult: 0, captureScience: 60, cavalryBonus: 4 }, { aggression: 0.95, expansion: 0.6, science: 0.5, culture: 0.4 })
      ] },

    { id: 'germany', name: 'Germany', adj: 'German', color: '#4d4d4d', color2: '#f1c40f',
      ability: { name: 'Free Imperial Cities', desc: '+10% Production in Cities. Upgrading a Town into a City is 15% cheaper.', fx: { cityYieldMult: { production: 1.1 }, cityUpgradeCostMult: 0.85 } },
      uu: { id: 'landsknecht', name: 'Landsknecht', replaces: 'pikeman', strength: 2, costMult: 0.6, desc: '+2 Strength, costs 40% less' },
      ub: { id: 'hansa', name: 'Hansa', replaces: 'workshop', yields: { production: 2, gold: 2 }, desc: '+2 Production, +2 Gold' },
      cities: ['Aachen', 'Cologne', 'Frankfurt', 'Magdeburg', 'Mainz', 'Heidelberg', 'Trier', 'Berlin', 'Hamburg', 'Munich', 'Nuremberg', 'Leipzig'],
      leaders: [
        L('barbarossa', 'Frederick Barbarossa', 'Holy Roman Emperor', 'Imperial Diet', '+1 Production per Town... simplified: every Town yields +2 Production-as-Gold and Cities +2 Production.', { townYields: { gold: 2 }, citySiteYields: { production: 2 } }, { aggression: 0.6, expansion: 0.7, science: 0.6, culture: 0.4 }),
        L('bismarck', 'Otto von Bismarck', 'Chancellor', 'Blood and Iron', 'Units cost 20% less; Military Academies and Barracks give +2 Strength to units built there; +5 Strength vs settlements.', { unitCostMult: 0.8, unitStrengthFromBarracks: 2, vsSettlements: 5 }, { aggression: 0.7, expansion: 0.6, science: 0.6, culture: 0.4 }),
        L('frederick', 'Frederick the Great', 'King of Prussia', 'Enlightened Despot', 'Technologies cost 10% less; +10% Science; Oligarchy and Autocracy give +2 extra Combat Strength.', { techCostMult: 0.9, yieldMult: { science: 1.1 }, despotCombat: 2 }, { aggression: 0.6, expansion: 0.5, science: 0.8, culture: 0.6 })
      ] },

    { id: 'russia', name: 'Russia', adj: 'Russian', color: '#5d6d7e', color2: '#f4d03f',
      ability: { name: 'Endless Steppe', desc: 'Tundra and Snow tiles yield +1 Food and +1 Production when worked. Settlements expand into a fourth ring.', fx: { tileBonus: [{ when: 'cold', yields: { food: 1, production: 1 } }], expansionRadius: 1 } },
      uu: { id: 'cossack', name: 'Cossack', replaces: 'cavalry', strength: 5, desc: '+5 Strength' },
      ub: { id: 'lavra', name: 'Lavra', replaces: 'shrine', yields: { culture: 3, happiness: 1 }, desc: '+3 Culture, +1 Happiness' },
      cities: ['Moscow', 'St. Petersburg', 'Novgorod', 'Kiev', 'Kazan', 'Yekaterinburg', 'Vladimir', 'Smolensk', 'Rostov', 'Tver', 'Yaroslavl', 'Arkhangelsk'],
      leaders: [
        L('peter', 'Peter the Great', 'Tsar', 'Window to the West', 'Gain +15 Science whenever you learn a civic and +15 Culture when you learn a technology. Naval units +1 Movement.', { civicScience: 15, techCulture: 15, navalMoves: 1 }, { aggression: 0.5, expansion: 0.7, science: 0.8, culture: 0.6 }),
        L('catherine', 'Catherine the Great', 'Empress', 'Enlightened Court', '+2 Culture per settlement; Museums and Amphitheaters +2 Culture; purchases 10% cheaper.', { culturePerSettlement: 2, buildingBonus: { museum: { culture: 2 }, amphitheater: { culture: 2 } }, purchaseMult: 0.9 }, { aggression: 0.4, expansion: 0.7, science: 0.6, culture: 0.8 }),
        L('ivan', 'Ivan the Terrible', 'Tsar', 'Oprichnina', 'Units +6 Strength when defending in your territory; settlements +5 defense; capturing a settlement grants +80 Gold.', { homeDefenseBonus: 6, cityDefense: 5, captureGold: 80 }, { aggression: 0.8, expansion: 0.7, science: 0.4, culture: 0.4 })
      ] },

    { id: 'spain', name: 'Spain', adj: 'Spanish', color: '#c0392b', color2: '#f7dc6f',
      ability: { name: 'Conquistadores', desc: 'Units +5 Strength when fighting on a continent other than your capital\'s. Dispersing camps grants double Gold.', fx: { combatBonusAbroad: 5, campGoldMult: 2 } },
      uu: { id: 'tercio', name: 'Tercio', replaces: 'musketman', strength: 6, desc: '+6 Strength' },
      ub: { id: 'mission', name: 'Mission', replaces: 'shrine', yields: { culture: 2, science: 1, happiness: 1 }, desc: '+2 Culture, +1 Science, +1 Happiness' },
      cities: ['Madrid', 'Barcelona', 'Seville', 'Toledo', 'Valencia', 'Córdoba', 'Zaragoza', 'Granada', 'Bilbao', 'Cádiz', 'Salamanca', 'Santiago'],
      leaders: [
        L('isabella', 'Isabella I', 'Queen of Castile', 'Treasure Fleet', 'Settlements founded on another continent start with +2 population and a free Granary. Naval units +1 Movement.', { abroadFoundPop: 2, abroadFreeBuilding: 'granary', navalMoves: 1 }, { aggression: 0.6, expansion: 0.8, science: 0.5, culture: 0.6 }),
        L('philip', 'Philip II', 'King', 'Spanish Armada', 'Naval units +6 Strength and cost 20% less; Missions yield +2 extra Culture.', { navalBonus: 6, navalCostMult: 0.8, buildingBonus: { shrine: { culture: 2 } } }, { aggression: 0.7, expansion: 0.6, science: 0.4, culture: 0.6 })
      ] },

    { id: 'ottoman', name: 'Ottomans', adj: 'Ottoman', color: '#1b4f3f', color2: '#e8e8e8',
      ability: { name: 'Devshirme', desc: 'Siege units +1 Movement and +5 Strength vs settlements. Conquered settlements keep all buildings.', fx: { classMoves: { siege: 1 }, vsSettlements: 5, captureKeepBuildings: true } },
      uu: { id: 'janissary', name: 'Janissary', replaces: 'musketman', strength: 4, costMult: 0.8, desc: '+4 Strength, 20% cheaper' },
      ub: { id: 'bazaar', name: 'Grand Bazaar', replaces: 'market', yields: { gold: 4, happiness: 1 }, desc: '+4 Gold, +1 Happiness' },
      cities: ['Istanbul', 'Edirne', 'Bursa', 'Ankara', 'Izmir', 'Konya', 'Trabzon', 'Antalya', 'Erzurum', 'Adana', 'Sofia', 'Belgrade'],
      leaders: [
        L('mehmed', 'Mehmed II', 'Sultan', 'Conqueror', 'Siege units +10 Strength vs settlements; capturing a capital grants +300 Gold.', { classBonusVsSettlements: { siege: 10 }, captureCapitalGold: 300 }, { aggression: 0.9, expansion: 0.6, science: 0.5, culture: 0.5 }),
        L('suleiman', 'Suleiman', 'Kanuni', 'Lawgiver', '+2 Happiness per settlement; +10% Gold; conquered settlements gain +3 Happiness.', { happinessBonus: 2, yieldMult: { gold: 1.1 }, capturedHappiness: 3 }, { aggression: 0.6, expansion: 0.6, science: 0.6, culture: 0.7 })
      ] },

    { id: 'korea', name: 'Korea', adj: 'Korean', color: '#2874a6', color2: '#f4f6f7',
      ability: { name: 'Seowon', desc: 'Libraries and Universities yield +2 Science. Urban Centers +3 Science.', fx: { buildingBonus: { library: { science: 2 }, university: { science: 2 } }, specializationYields: { urban: { science: 3 } } } },
      uu: { id: 'hwacha', name: 'Hwacha', replaces: 'field_cannon', ranged: 8, desc: '+8 Ranged Strength' },
      ub: { id: 'jipgyeongjeon', name: 'Jiphyeonjeon', replaces: 'university', yields: { science: 3, culture: 1 }, desc: '+3 Science, +1 Culture' },
      cities: ['Seoul', 'Busan', 'Gyeongju', 'Pyongyang', 'Gaeseong', 'Daegu', 'Incheon', 'Jeonju', 'Gwangju', 'Suwon', 'Ulsan', 'Cheongju'],
      leaders: [
        L('sejong', 'Sejong', 'King', 'Hangul', 'Technologies cost 10% less; +1 Science per settlement; +20 Culture whenever you learn a technology.', { techCostMult: 0.9, sciencePerSettlement: 1, techCulture: 20 }, { aggression: 0.2, expansion: 0.5, science: 0.95, culture: 0.6 }),
        L('sunsin', 'Yi Sun-sin', 'Admiral', 'Turtle Ships', 'Naval units +8 Strength when defending and +1 Movement; coastal settlements +5 defense.', { navalDefenseBonus: 8, navalMoves: 1, coastalDefense: 5 }, { aggression: 0.5, expansion: 0.5, science: 0.7, culture: 0.4 })
      ] },

    { id: 'vietnam', name: 'Vietnam', adj: 'Vietnamese', color: '#a93226', color2: '#f9e79f',
      ability: { name: 'Nine Dragons', desc: 'Worked Rainforest and Marsh tiles yield +1 Production and +1 Culture. Units +5 Strength in Rainforest and Marsh.', fx: { tileBonus: [{ when: 'jungle', yields: { production: 1, culture: 1 } }], combatBonusJungle: 5 } },
      uu: { id: 'voi_chien', name: 'Voi Chiến', replaces: 'knight', strength: 3, ranged: 0, desc: '+3 Strength, ignores forest movement cost', forestMove: true },
      ub: { id: 'thanh', name: 'Thành', replaces: 'walls', yields: { culture: 1, production: 1 }, desc: '+1 Culture, +1 Production' },
      cities: ['Thang Long', 'Hue', 'Saigon', 'Hai Phong', 'Da Nang', 'Hoa Lu', 'Vinh', 'Can Tho', 'Nha Trang', 'Hoi An', 'Ha Long', 'Bac Ninh'],
      leaders: [
        L('trung', 'Trưng Trắc', 'Queen', 'Uprising', 'Units +8 Strength when defending inside your borders; each settlement gets free Walls with Masonry.', { homeDefenseBonus: 8, freeBuildingWithTech: { walls: 'masonry' } }, { aggression: 0.4, expansion: 0.5, science: 0.4, culture: 0.6 }),
        L('leloi', 'Lê Lợi', 'Emperor', 'Lam Sơn', 'Units +1 Movement in Forest and Rainforest (normal cost); units heal +15 in your territory; killing a unit grants +8 Culture.', { forestMoveCost: 1, healBonusHome: 15, culturePerKill: 8 }, { aggression: 0.6, expansion: 0.6, science: 0.4, culture: 0.6 })
      ] },

    { id: 'ethiopia', name: 'Ethiopia', adj: 'Ethiopian', color: '#7d6608', color2: '#27ae60',
      ability: { name: 'Roof of Africa', desc: 'Settlements on Hills yield +2 Culture and +3 defense. Worked Hills +1 Gold.', fx: { settlementSiteBonus: [{ when: 'hills', yields: { culture: 2 } }], hillsDefense: 3, tileBonus: [{ when: 'hills', yields: { gold: 1 } }] } },
      uu: { id: 'shotel', name: 'Shotel Warrior', replaces: 'swordsman', strength: 3, moves: 1, desc: '+3 Strength, +1 Movement' },
      ub: { id: 'rock_church', name: 'Rock-Hewn Church', replaces: 'shrine', yields: { culture: 2, happiness: 2 }, desc: '+2 Culture, +2 Happiness' },
      cities: ['Aksum', 'Gondar', 'Lalibela', 'Addis Ababa', 'Harar', 'Adwa', 'Mekelle', 'Bahir Dar', 'Dire Dawa', 'Jimma', 'Debre Markos', 'Yeha'],
      leaders: [
        L('menelik', 'Menelik II', 'Emperor', 'Victory at Adwa', 'Units +6 Strength when defending on Hills and +5 vs units from another continent.', { hillsDefenseBonus: 6, combatBonusVsInvaders: 5 }, { aggression: 0.4, expansion: 0.6, science: 0.5, culture: 0.5 }),
        L('zara', 'Zara Yaqob', 'Emperor', 'Book of Light', '+2 Culture per settlement; Shrines yield +2 Science; +1 Happiness per settlement.', { culturePerSettlement: 2, buildingBonus: { shrine: { science: 2 } }, happinessBonus: 1 }, { aggression: 0.3, expansion: 0.5, science: 0.6, culture: 0.8 })
      ] },

    { id: 'mali', name: 'Mali', adj: 'Malian', color: '#b9770e', color2: '#fdfefe',
      ability: { name: 'Salt and Gold', desc: 'Worked Desert tiles yield +2 Gold. Purchases cost 15% less. Cities -10% Production.', fx: { tileBonus: [{ when: 'desert', yields: { gold: 2 } }], purchaseMult: 0.85, cityYieldMult: { production: 0.9 } } },
      uu: { id: 'sofa', name: 'Sofa', replaces: 'horseman', strength: 2, defense: 4, desc: '+2 Strength, +4 when defending' },
      ub: { id: 'suguba', name: 'Suguba', replaces: 'market', yields: { gold: 5 }, desc: '+5 Gold' },
      cities: ['Niani', 'Timbuktu', 'Djenné', 'Gao', 'Walata', 'Kangaba', 'Ségou', 'Koumbi Saleh', 'Kita', 'Bamako', 'Mopti', 'Sikasso'],
      leaders: [
        L('mansa', 'Mansa Musa', 'Mansa', 'Golden Pilgrimage', '+25% Gold. Trade Outposts +4 Gold. Gain 100 Gold when you found a settlement.', { yieldMult: { gold: 1.25 }, specializationYields: { trade: { gold: 4 } }, foundGold: 100 }, { aggression: 0.2, expansion: 0.7, science: 0.6, culture: 0.6 }),
        L('sundiata', 'Sundiata Keita', 'Mansa', 'Lion King', 'Cavalry +5 Strength; units heal +10 everywhere; +1 Happiness per settlement.', { cavalryBonus: 5, healBonusAll: 10, happinessBonus: 1 }, { aggression: 0.6, expansion: 0.6, science: 0.4, culture: 0.5 })
      ] },

    { id: 'norway', name: 'Norway', adj: 'Norse', color: '#1f618d', color2: '#e74c3c',
      ability: { name: 'Longships', desc: 'Units can embark from the start and embark/disembark without ending their move. Naval units +1 Movement.', fx: { earlyEmbark: true, freeDisembark: true, navalMoves: 1 } },
      uu: { id: 'berserker', name: 'Berserker', replaces: 'swordsman', strength: 5, moves: 1, desc: '+5 Strength, +1 Movement' },
      ub: { id: 'stave_church', name: 'Stave Church', replaces: 'shrine', yields: { culture: 2, production: 1 }, desc: '+2 Culture, +1 Production' },
      cities: ['Nidaros', 'Bergen', 'Oslo', 'Tønsberg', 'Stavanger', 'Kaupang', 'Tromsø', 'Hamar', 'Bodø', 'Ålesund', 'Kristiansand', 'Sarpsborg'],
      leaders: [
        L('harald', 'Harald Hardrada', 'King', 'Last Viking', 'Melee units +5 Strength when attacking from the sea or on Coast; killing a unit grants +20 Gold.', { combatBonusCoast: 5, goldPerKill: 20 }, { aggression: 0.85, expansion: 0.6, science: 0.3, culture: 0.4 }),
        L('olav', 'Olav Tryggvason', 'King', 'Christening Sword', 'Capturing a settlement grants +100 Culture; Shrines +2 Culture; naval units +4 Strength.', { captureCulture: 100, buildingBonus: { shrine: { culture: 2 } }, navalBonus: 4 }, { aggression: 0.7, expansion: 0.6, science: 0.4, culture: 0.6 })
      ] },

    { id: 'babylon', name: 'Babylon', adj: 'Babylonian', color: '#6c3483', color2: '#f8c471',
      ability: { name: 'Cradle of Civilization', desc: 'Technologies cost 15% less, but each settlement yields -1 Science. Worked River tiles +1 Gold.', fx: { techCostMult: 0.85, sciencePerSettlement: -1, tileBonus: [{ when: 'river', yields: { gold: 1 } }] } },
      uu: { id: 'sabum', name: 'Sabum Kibittum', replaces: 'warrior', strength: 3, moves: 1, desc: '+3 Strength, +1 Movement' },
      ub: { id: 'ziggurat', name: 'Ziggurat', replaces: 'library', yields: { science: 2, culture: 1 }, desc: '+2 Science, +1 Culture' },
      cities: ['Babylon', 'Ur', 'Uruk', 'Nippur', 'Sippar', 'Kish', 'Larsa', 'Eridu', 'Lagash', 'Borsippa', 'Isin', 'Akkad'],
      leaders: [
        L('hammurabi', 'Hammurabi', 'King', 'Code of Laws', 'Gain a free Civic when you build your first Monument; +2 Culture per settlement; Walls +2 defense.', { freeCivicOnBuilding: 'monument', culturePerSettlement: 2, cityDefense: 2 }, { aggression: 0.4, expansion: 0.6, science: 0.7, culture: 0.7 }),
        L('nebuchadnezzar', 'Nebuchadnezzar II', 'King', 'Hanging Gardens', 'Settlements grow 20% faster; Wonders cost 15% less; +1 Happiness per Wonder.', { growthMult: 1.2, wonderCostMult: 0.85, happinessPerWonder: 1 }, { aggression: 0.5, expansion: 0.6, science: 0.6, culture: 0.7 })
      ] },

    { id: 'polynesia', name: 'Polynesia', adj: 'Polynesian', color: '#148f77', color2: '#fad7a0',
      ability: { name: 'Wayfinders', desc: 'Units can embark and cross Ocean from the start. Embarked units +1 Movement. Worked water tiles +1 Production.', fx: { earlyEmbark: true, earlyOcean: true, embarkMoves: 1, tileBonus: [{ when: 'water', yields: { production: 1 } }] } },
      uu: { id: 'maori_warrior', name: 'Toa', replaces: 'warrior', strength: 5, desc: '+5 Strength' },
      ub: { id: 'marae', name: 'Marae', replaces: 'monument', yields: { culture: 2, happiness: 1 }, desc: '+2 Culture, +1 Happiness' },
      cities: ['Honolulu', 'Rapa Nui', 'Tahiti', 'Nuku Hiva', 'Apia', 'Tongatapu', 'Rarotonga', 'Hilo', 'Bora Bora', 'Aotearoa', 'Raiatea', 'Nukuʻalofa'],
      leaders: [
        L('kamehameha', 'Kamehameha', 'King', 'Unification of the Islands', 'Coastal settlements +2 Food and +1 Production; melee units +4 on Coast.', { coastalSettlementYields: { food: 2, production: 1 }, combatBonusCoast: 4 }, { aggression: 0.5, expansion: 0.7, science: 0.4, culture: 0.5 }),
        L('hotu', 'Hotu Matu\'a', 'Ariki', 'Moai', 'Each Wonder yields +3 Culture; settlements on Coast +2 Culture; Monuments +1 Culture.', { culturePerWonder: 3, coastalSettlementYields: { culture: 2 }, buildingBonus: { monument: { culture: 1 } } }, { aggression: 0.3, expansion: 0.6, science: 0.4, culture: 0.8 })
      ] }
  ];
  AU.CIV_BY_ID = {}; AU.LEADER_BY_ID = {};
  AU.CIVS.forEach(function (c) { AU.CIV_BY_ID[c.id] = c; c.leaders.forEach(function (l) { l.civId = c.id; AU.LEADER_BY_ID[l.id] = l; }); });
  AU.leadersOf = function (civId) { return AU.CIV_BY_ID[civId].leaders; };
})(globalThis.AU = globalThis.AU || {});
