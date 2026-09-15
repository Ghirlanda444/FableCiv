// 30 civilizations, each with two or three leaders. A leader can only rule their own civilization.
// Every civilization has a permanent civ ability, a unique unit and a unique building; every leader adds
// a leader ability on top, so Rome under Caesar plays differently from Rome under Augustus.
(function (AU) {
  function L(id, name, title, abName, abDesc, fx, ai) { return { id: id, name: name, title: title, ability: { name: abName, desc: abDesc, fx: fx }, ai: ai }; }
  AU.CIVS = [
    { id: 'rome', name: 'Rome', adj: 'Roman', difficulty: 'easy', bias: ['hills', 'river'], color: '#8b1a1a', color2: '#f5d76e',
      ability: { name: 'Pax Romana', desc: 'Every new settlement starts with a free Monument. Upgrading a Town into a City costs 25% less.', fx: { freeBuilding: 'monument', cityUpgradeCostMult: 0.75 } },
      uu: { id: 'legion', name: 'Legion', replaces: 'swordsman', strength: 3, fortifyMult: 1, vsSettlements: 5, desc: '+3 Strength, +5 vs settlements, fortification bonus doubled (the legion digs in like a fort)' },
      ub: { id: 'forum', name: 'Forum', replaces: 'market', yields: { gold: 2, culture: 1 }, desc: '+2 Gold, +1 Culture' },
      cities: ['Roma', 'Ostia', 'Antium', 'Cumae', 'Ravenna', 'Neapolis', 'Mediolanum', 'Aquileia', 'Brundisium', 'Capua', 'Verona', 'Tarentum', 'Arretium', 'Ariminum', 'Pisae', 'Florentia', 'Bononia', 'Genua', 'Placentia', 'Cremona', 'Patavium', 'Tergeste', 'Pompeii', 'Herculaneum', 'Beneventum', 'Syracusae', 'Messana', 'Panormus', 'Lilybaeum', 'Caralis', 'Narbo', 'Lugdunum', 'Massilia', 'Carthago Nova', 'Tarraco', 'Corduba', 'Hispalis', 'Londinium', 'Eboracum', 'Augusta Treverorum'],
      leaders: [
        L('trajan', 'Trajan', 'Optimus Princeps', 'Column of Victory', 'Capturing a settlement keeps all its buildings and loses no population. +100 Gold per capture.', { captureKeepBuildings: true, captureNoPopLoss: true, captureGold: 100 }, { aggression: 0.75, expansion: 0.7, science: 0.4, culture: 0.4 }),
        L('augustus', 'Augustus', 'Princeps', 'Marble City', 'Wonders cost 20% less and each Wonder yields +2 Culture. +1 Happiness in every settlement.', { wonderCostMult: 0.8, culturePerWonder: 2, happinessBonus: 1 }, { aggression: 0.3, expansion: 0.6, science: 0.5, culture: 0.8 }),
        L('caesar', 'Julius Caesar', 'Dictator', 'Veni Vidi Vici', 'Land units +3 Strength and +1 Movement in enemy territory is not needed: they simply gain +25 Gold and +1 XP per kill.', { landBonus: 3, goldPerKill: 25, xpMult: 1.5 }, { aggression: 0.9, expansion: 0.6, science: 0.3, culture: 0.3 })
      ] },

    { id: 'japan', name: 'Japan', adj: 'Japanese', difficulty: 'easy', bias: ['coast'], color: '#f2f2f2', color2: '#c0392b',
      ability: { name: 'Bushido', desc: 'Units fight at full strength no matter how damaged they are. Coastal settlements +1 Production.', fx: { noDamagePenalty: true, coastalSettlementYields: { production: 1 } } },
      uu: { id: 'samurai', name: 'Samurai', replaces: 'pikeman', strength: 4, attack: 4, noDamagePenalty: true, costMult: 1.25, desc: '+4 Strength, +4 when attacking, never loses strength when wounded, costs 25% more' },
      ub: { id: 'dojo', name: 'Dojo', replaces: 'barracks', yields: { production: 1, culture: 2 }, unitStrength: 2, desc: '+1 Production, +2 Culture, units built here +2 Strength' },
      cities: ['Kyoto', 'Osaka', 'Edo', 'Nagoya', 'Kamakura', 'Nara', 'Sapporo', 'Kanazawa', 'Sendai', 'Hiroshima', 'Fukuoka', 'Nagasaki', 'Himeji', 'Matsumoto', 'Kumamoto', 'Okayama', 'Hikone', 'Matsue', 'Kochi', 'Takamatsu', 'Wakayama', 'Shizuoka', 'Odawara', 'Kagoshima', 'Sakai', 'Niigata', 'Nagano', 'Toyama', 'Fukui', 'Gifu', 'Tottori', 'Hagi', 'Aizu', 'Morioka', 'Akita', 'Hirosaki', 'Kofu', 'Utsunomiya', 'Mito', 'Matsuyama'],
      leaders: [
        L('tokugawa', 'Tokugawa Ieyasu', 'Shogun', 'Sakoku', '+5 Strength for units inside your borders and +3 settlement defense. Towns convert Production to Gold at 125%.', { combatBonusHome: 5, cityDefense: 3, townGoldMult: 1.25 }, { aggression: 0.3, expansion: 0.5, science: 0.6, culture: 0.6 }),
        L('hojo', 'Hojo Tokimune', 'Shikken', 'Kamikaze', 'Naval units +6 Strength and +1 Movement. Units on Coast tiles +5 Strength.', { navalBonus: 6, navalMoves: 1, combatBonusCoast: 5 }, { aggression: 0.5, expansion: 0.5, science: 0.5, culture: 0.5 }),
        L('meiji', 'Emperor Meiji', 'Emperor', 'Restoration', 'Every Spark also grants 20% of the technology\'s cost in Science. Every building yields +1 Science in Cities.', { eurekaDiscount: 0.2, cityBuildingScience: 1 }, { aggression: 0.35, expansion: 0.5, science: 0.9, culture: 0.6 })
      ] },

    { id: 'china', name: 'China', adj: 'Chinese', difficulty: 'easy', bias: ['river', 'grassland'], color: '#2e8b57', color2: '#f7e04b',
      ability: { name: 'Mandate of Heaven', desc: 'Civics cost 10% less. Settlements may expand into a fourth ring of tiles.', fx: { civicCostMult: 0.9, expansionRadius: 1 } },
      uu: { id: 'crouching_tiger', name: 'Crouching Tiger', replaces: 'crossbowman', ranged: 3, extraAttack: true, costMult: 1.3, desc: '+3 Ranged Strength, fires twice per turn, costs 30% more' },
      ub: { id: 'great_wall_tower', name: 'Great Wall', replaces: 'walls', yields: { culture: 2, gold: 1 }, desc: '+2 Culture, +1 Gold' },
      cities: ['Xi\'an', 'Beijing', 'Nanjing', 'Luoyang', 'Guangzhou', 'Hangzhou', 'Chengdu', 'Kaifeng', 'Suzhou', 'Wuhan', 'Xiamen', 'Tianjin', 'Anyang', 'Handan', 'Datong', 'Taiyuan', 'Jinan', 'Qufu', 'Xuzhou', 'Yangzhou', 'Ningbo', 'Fuzhou', 'Quanzhou', 'Changsha', 'Nanchang', 'Chongqing', 'Kunming', 'Guilin', 'Lanzhou', 'Dunhuang', 'Xianyang', 'Zhengzhou', 'Shenyang', 'Harbin', 'Qingdao', 'Wuxi', 'Shaoxing', 'Guiyang', 'Nanning', 'Shanghai'],
      leaders: [
        L('qin', 'Qin Shi Huang', 'First Emperor', 'Terracotta Legions', 'Wonders cost 20% less. Every settlement starts with free Walls once Masonry is known.', { wonderCostMult: 0.8, freeBuildingWithTech: { walls: 'masonry' } }, { aggression: 0.4, expansion: 0.6, science: 0.6, culture: 0.6 }),
        L('taizong', 'Emperor Taizong', 'Emperor', 'Zhenguan Era', '+10% Science and Culture. +1 Science per settlement. Cavalry +2 Strength.', { yieldMult: { science: 1.1, culture: 1.1 }, sciencePerSettlement: 1, classBonus: { cavalry: 2 } }, { aggression: 0.45, expansion: 0.6, science: 0.8, culture: 0.7 }),
        L('wu', 'Wu Zetian', 'Empress', 'Silk and Ink', 'Each worked Luxury resource yields +2 Culture. +1 Happiness in every settlement.', { luxuryCulture: 2, happinessBonus: 1 }, { aggression: 0.3, expansion: 0.6, science: 0.7, culture: 0.8 }),
        L('kublai', 'Kublai Khan', 'Emperor', 'Grand Canal', 'Towns send 50% more food to Cities and yield +2 Gold when specialized. Cavalry +3 Strength.', { townFoodMult: 1.5, specializedTownYields: { gold: 2 }, cavalryBonus: 3 }, { aggression: 0.6, expansion: 0.7, science: 0.5, culture: 0.4 })
      ] },

    { id: 'america', name: 'America', adj: 'American', difficulty: 'easy', bias: ['plains', 'river'], color: '#1f3f8f', color2: '#ffffff',
      ability: { name: 'Manifest Destiny', desc: 'Pioneers cost 20% less and move +1. Towns grow 15% faster.', fx: { settlerCostMult: 0.8, civilianMoves: 1, townGrowthMult: 1.15 } },
      uu: { id: 'minuteman', name: 'Minuteman', replaces: 'musketman', strength: 3, ignoreTerrain: true, homeBonus: 6, desc: '+3 Strength, all terrain costs 1 movement, +6 inside your borders' },
      ub: { id: 'film_studio', name: 'Film Studio', replaces: 'broadcast_tower', yields: { culture: 4 }, desc: '+4 Culture' },
      cities: ['Washington', 'New York', 'Boston', 'Philadelphia', 'Chicago', 'Los Angeles', 'Atlanta', 'Seattle', 'Houston', 'Denver', 'Miami', 'Detroit', 'San Francisco', 'Baltimore', 'New Orleans', 'St. Louis', 'Pittsburgh', 'Charleston', 'Richmond', 'Savannah', 'Cleveland', 'Cincinnati', 'Minneapolis', 'Kansas City', 'Dallas', 'San Antonio', 'Phoenix', 'Salt Lake City', 'Portland', 'Nashville', 'Memphis', 'Buffalo', 'Milwaukee', 'Providence', 'Hartford', 'Albany', 'Santa Fe', 'Sacramento', 'Omaha', 'Louisville'],
      leaders: [
        L('roosevelt', 'Theodore Roosevelt', 'President', 'Big Stick', '+5 Strength for units on your home continent. Other leaders start friendlier toward you.', { combatBonusHomeContinent: 5, attitudeBonus: 10 }, { aggression: 0.5, expansion: 0.7, science: 0.6, culture: 0.6 }),
        L('lincoln', 'Abraham Lincoln', 'President', 'A House United', 'Cities +2 Production; +1 Happiness in every settlement; unit upkeep: 4 extra free units.', { citySiteYields: { production: 2 }, happinessBonus: 1, freeUpkeep: 4 }, { aggression: 0.35, expansion: 0.6, science: 0.6, culture: 0.5 }),
        L('franklin', 'Benjamin Franklin', 'Statesman', 'Lightning Rod', 'Libraries and Universities yield +2 Science. Gain 40 Gold whenever you learn a technology.', { buildingBonus: { library: { science: 2 }, university: { science: 2 } }, techGold: 40 }, { aggression: 0.2, expansion: 0.5, science: 0.9, culture: 0.6 })
      ] },

    { id: 'india', name: 'India', adj: 'Indian', difficulty: 'easy', bias: ['river', 'grassland'], color: '#f39c12', color2: '#1a5e2a',
      ability: { name: 'Dharma', desc: '+1 Happiness in every settlement. Specialized Towns yield +2 Culture.', fx: { happinessBonus: 1, specializedTownYields: { culture: 2 } } },
      uu: { id: 'varu', name: 'War Elephant', replaces: 'horseman', strength: 6, moves: -1, defense: 5, noResource: true, intimidate: 3, costMult: 1.3, desc: '+6 Strength, +5 defending, adjacent enemies fight at -3, needs no Horses, -1 Movement, costs 30% more' },
      ub: { id: 'stepwell', name: 'Stepwell', replaces: 'granary', yields: { food: 1, happiness: 1 }, desc: '+1 Food, +1 Happiness' },
      cities: ['Delhi', 'Mumbai', 'Vijayanagara', 'Pataliputra', 'Varanasi', 'Agra', 'Calcutta', 'Lahore', 'Bengaluru', 'Hyderabad', 'Madurai', 'Ahmedabad', 'Ujjain', 'Mathura', 'Kanchipuram', 'Thanjavur', 'Taxila', 'Ayodhya', 'Prayaga', 'Kausambi', 'Nalanda', 'Sanchi', 'Amaravati', 'Puri', 'Bhubaneswar', 'Jaipur', 'Jodhpur', 'Udaipur', 'Chittorgarh', 'Gwalior', 'Kannauj', 'Somnath', 'Dwarka', 'Surat', 'Pune', 'Kochi', 'Calicut', 'Mysore', 'Warangal', 'Lucknow'],
      leaders: [
        L('gandhi', 'Gandhi', 'Mahatma', 'Satyagraha', 'Settlements grow 20% faster and never lose yields to unhappiness. Others start friendlier toward you.', { growthMult: 1.2, noUnhappinessPenalty: true, attitudeBonus: 15 }, { aggression: 0.1, expansion: 0.6, science: 0.6, culture: 0.7 }),
        L('ashoka', 'Ashoka', 'Emperor', 'Edicts of Stone', '+2 Culture and +1 Faith per settlement. Capturing a settlement grants +150 Culture; conquered settlements keep their buildings.', { culturePerSettlement: 2, faithPerSettlement: 1, captureCulture: 150, captureKeepBuildings: true }, { aggression: 0.5, expansion: 0.6, science: 0.5, culture: 0.8 }),
        L('akbar', 'Akbar', 'Padishah', 'Din-i Ilahi', 'Each worked Luxury gives +1 extra Happiness. Purchases in Towns cost 20% less.', { luxuryHappinessBonus: 1, townPurchaseMult: 0.8 }, { aggression: 0.4, expansion: 0.7, science: 0.6, culture: 0.6 })
      ] },

    { id: 'indonesia', name: 'Indonesia', adj: 'Indonesian', difficulty: 'hard', bias: ['coast'], color: '#7d2a7d', color2: '#f1c40f',
      ability: { name: 'Nusantara', desc: 'Worked Coast and Lake tiles yield +1 Food and +1 Gold. Units embark at full strength (defense 20).', fx: { tileBonus: [{ when: 'water', yields: { food: 1, gold: 1 } }], embarkedStrength: 20 } },
      uu: { id: 'jong', name: 'Jong', replaces: 'caravel', strength: 5, moves: 1, sight: 1, goldOnKill: 40, costMult: 1.25, desc: '+5 Strength, +1 Movement, +1 Sight, +40 Gold per kill, costs 25% more' },
      ub: { id: 'kampung', name: 'Kampung', replaces: 'lighthouse', yields: { food: 2, production: 1 }, desc: '+2 Food, +1 Production' },
      cities: ['Majapahit', 'Surabaya', 'Jakarta', 'Palembang', 'Makassar', 'Yogyakarta', 'Banda Aceh', 'Malang', 'Bali', 'Medan', 'Semarang', 'Ambon', 'Trowulan', 'Demak', 'Tuban', 'Gresik', 'Banten', 'Cirebon', 'Kediri', 'Singhasari', 'Mataram', 'Surakarta', 'Bandung', 'Kutai', 'Banjarmasin', 'Pontianak', 'Samarinda', 'Ternate', 'Tidore', 'Kupang', 'Manado', 'Padang', 'Jambi', 'Bengkulu', 'Pekanbaru', 'Denpasar', 'Kendari', 'Banda Neira', 'Gorontalo', 'Jayapura'],
      leaders: [
        L('gitarja', 'Gitarja', 'Queen', 'Sea of Temples', 'Naval units cost 30% less. Coastal settlements +2 Culture.', { navalCostMult: 0.7, coastalSettlementYields: { culture: 2 } }, { aggression: 0.4, expansion: 0.6, science: 0.5, culture: 0.6 }),
        L('gajah', 'Gajah Mada', 'Mahapatih', 'Palapa Oath', 'Naval units +5 Strength; capturing coastal settlements grants +100 Gold; +1 Movement for embarked units.', { navalBonus: 5, captureGold: 100, embarkMoves: 1 }, { aggression: 0.8, expansion: 0.6, science: 0.4, culture: 0.4 })
      ] },

    { id: 'mongolia', name: 'Mongolia', adj: 'Mongol', difficulty: 'hard', bias: ['plains', 'grassland'], color: '#5b3a1e', color2: '#e8d5a3',
      ability: { name: 'Horde', desc: 'Cavalry +1 Movement. Mounted units cost 20% less.', fx: { cavalryMoves: 1, classCostMult: { cavalry: 0.8 } } },
      uu: { id: 'keshig', name: 'Keshig', replaces: 'knight', strength: 2, moves: 1, halfRetaliation: true, movesAfterAttack: true, costMult: 1.15, desc: '+2 Strength, +1 Movement, showers arrows before charging (half damage back) and can move after attacking, costs 15% more' },
      ui: { id: 'ordu', name: 'Ordu', icon: '🐎', replaces: 'pasture', yields: { production: 1, gold: 1 }, desc: '+1 Production and +1 Gold on every pasture' },
      cities: ['Karakorum', 'Beshbalik', 'Turfan', 'Hsia', 'Old Sarai', 'New Sarai', 'Tabriz', 'Tiflis', 'Otrar', 'Sanchu', 'Kazan', 'Almarikh', 'Khanbaliq', 'Shangdu', 'Avarga', 'Ulaanbaatar', 'Erdene Zuu', 'Bukhara', 'Samarkand', 'Urgench', 'Merv', 'Nishapur', 'Herat', 'Balkh', 'Kashgar', 'Khotan', 'Hami', 'Ningxia', 'Bolghar', 'Astrakhan', 'Azov', 'Uliastai', 'Khovd', 'Choibalsan', 'Dalanzadgad', 'Tsetserleg', 'Baruun-Urt', 'Ordos', 'Hohhot', 'Sükhbaatar'],
      leaders: [
        L('genghis', 'Genghis Khan', 'Great Khan', 'Terror of the Steppe', 'Cavalry +5 Strength. Capturing a settlement grants 100 Gold and heals all your units nearby.', { cavalryBonus: 5, captureGold: 100, captureHeal: true }, { aggression: 0.95, expansion: 0.6, science: 0.3, culture: 0.2 }),
        L('mandukhai', 'Mandukhai', 'Khatun', 'Unifier of the Clans', '+1 Happiness per settlement, units heal +10 everywhere, units gain XP 50% faster.', { happinessBonus: 1, healBonusAll: 10, xpMult: 1.5 }, { aggression: 0.6, expansion: 0.7, science: 0.4, culture: 0.4 })
      ] },

    { id: 'zulu', name: 'Zulu', adj: 'Zulu', difficulty: 'medium', bias: ['grassland', 'hills'], color: '#3a2c1c', color2: '#e74c3c',
      ability: { name: 'Amabutho', desc: 'Melee and anti-cavalry units cost 25% less and start with a level of experience.', fx: { classCostMult: { melee: 0.75, antcav: 0.75 }, unitsStartXp: 5 } },
      uu: { id: 'impi', name: 'Impi', replaces: 'pikeman', strength: 2, moves: 1, costMult: 0.7, flank: 3, xpMult: 0.5, desc: '+2 Strength, +1 Movement, 30% cheaper, +3 per adjacent friendly unit, +50% experience' },
      ut: { id: 'ikhanda', name: 'Ikhanda', icon: '🛡️', minPop: 3, desc: 'A warrior town: units bought here cost 40% less, +6 defense, free Walls, and +1 Production per worked tile.', fx: { unitPurchaseMult: 0.6, defense: 6, freeWalls: true, tileYields: { when: 'all', yields: { production: 1 } } } },
      cities: ['Ulundi', 'uMgungundlovu', 'kwaBulawayo', 'kwaDukuza', 'Nobamba', 'Eshowe', 'Ondini', 'Isandlwana', 'Nongoma', 'Empangeni', 'Melmoth', 'Mthonjaneni', 'Babanango', 'Mahlabathini', "Rorke's Drift", 'Hlobane', 'Gingindlovu', 'Ntombe', 'Kambula', 'Vryheid', 'Nkandla', 'Mtubatuba', 'Hluhluwe', 'Pongola', 'Mkuze', 'Ingwavuma', 'Richards Bay', 'Mandeni', 'Greytown', 'Kranskop', 'Umlazi', 'Inanda', 'Pinetown', 'Ixopo', 'Estcourt', 'Ladysmith', 'Colenso', 'Weenen', 'Dundee', 'Nquthu'],
      leaders: [
        L('shaka', 'Shaka', 'King', 'Horns of the Buffalo', 'Melee units +6 Strength when attacking. Killing a unit grants +10 Culture.', { meleeAttackBonus: 6, culturePerKill: 10 }, { aggression: 0.95, expansion: 0.5, science: 0.2, culture: 0.3 }),
        L('cetshwayo', 'Cetshwayo', 'King', 'Isandlwana', '+8 Strength when defending inside your borders; units in your territory heal +15.', { homeDefenseBonus: 8, healBonusHome: 15 }, { aggression: 0.5, expansion: 0.5, science: 0.4, culture: 0.4 })
      ] },

    { id: 'persia', name: 'Persia', adj: 'Persian', difficulty: 'easy', bias: ['plains', 'hills'], color: '#7b2f8a', color2: '#f5cba7',
      ability: { name: 'Royal Road', desc: '+2 Gold per settlement. Units +1 Movement inside your borders. Free cities you have met gain +1 Ties with you every turn.', fx: { tiesPerTurn: 1, goldPerSettlement: 2, homeMoves: 1 } },
      uu: { id: 'immortal', name: 'Immortal', replaces: 'swordsman', strength: 3, defense: 6, healOnKill: 25, costMult: 1.2, desc: '+3 Strength, +6 defending, heals 25 HP on a kill, costs 20% more' },
      ut: { id: 'satrapy', name: 'Satrapy', icon: '👑', minPop: 4, desc: 'A tribute town: +4 Gold, +1 Gold per worked tile, +2 Culture.', fx: { flat: { gold: 4, culture: 2 }, tileYields: { when: 'all', yields: { gold: 1 } } } },
      cities: ['Pasargadae', 'Susa', 'Persepolis', 'Ecbatana', 'Babylon', 'Sardis', 'Bactra', 'Tarsus', 'Gordion', 'Arbela', 'Rhagae', 'Zranka', 'Ctesiphon', 'Isfahan', 'Shiraz', 'Istakhr', 'Gundeshapur', 'Firuzabad', 'Bishapur', 'Kermanshah', 'Qazvin', 'Yazd', 'Kerman', 'Kashan', 'Tus', 'Hecatompylos', 'Amol', 'Damghan', 'Sistan', 'Zadracarta', 'Seleucia', 'Opis', 'Nisa', 'Dura-Europos', 'Palmyra', 'Halicarnassus', 'Cyropolis', 'Taoce', 'Ahvaz', 'Bam'],
      leaders: [
        L('cyrus', 'Cyrus', 'King of Kings', 'Cylinder of Mercy', 'Conquered settlements keep buildings and lose no population; +2 Happiness in captured settlements.', { captureKeepBuildings: true, captureNoPopLoss: true, capturedHappiness: 2 }, { aggression: 0.6, expansion: 0.7, science: 0.5, culture: 0.6 }),
        L('darius', 'Darius I', 'Shahanshah', 'Satrapies', 'Towns yield +3 Gold and specialized Towns +1 Science. Purchases cost 10% less. +1 Gold per settlement following your religion.', { townYields: { gold: 3 }, specializedTownYields: { science: 1 }, purchaseMult: 0.9, goldPerFollowerSettlement: 1 }, { aggression: 0.4, expansion: 0.8, science: 0.6, culture: 0.5 })
      ] },

    { id: 'egypt', name: 'Egypt', adj: 'Egyptian', difficulty: 'medium', bias: ['river', 'desert'], color: '#d4ac0d', color2: '#1b2631',
      ability: { name: 'Gift of the Nile', desc: 'Worked River tiles yield +1 Food. Settlements on rivers +1 Production and +1 Culture.', fx: { tileBonus: [{ when: 'river', yields: { food: 1 } }], settlementSiteBonus: [{ when: 'river', yields: { production: 1, culture: 1 } }] } },
      uu: { id: 'maryannu', name: 'Chariot Bowman', replaces: 'archer', ranged: 4, moves: 1, movesAfterAttack: true, terrainBonus: {desert: 6, floodplains: 6}, desc: '+4 Ranged Strength, +1 Movement, can move after attacking, +6 on desert and floodplains' },
      ui: { id: 'sphinx', name: 'Sphinx', icon: '🗿', replaces: 'farm', when: 'desert', yields: { culture: 2, faith: 1 }, desc: 'desert farms become monuments: +2 Culture, +1 Faith' },
      cities: ['Ra-Kedet', 'Thebes', 'Memphis', 'Akhetaten', 'Heliopolis', 'Elephantine', 'Alexandria', 'Pi-Ramesses', 'Abydos', 'Giza', 'Edfu', 'Tanis', 'Saqqara', 'Dendera', 'Kom Ombo', 'Aswan', 'Karnak', 'Hermopolis', 'Herakleopolis', 'Bubastis', 'Sais', 'Buto', 'Avaris', 'Mendes', 'Naukratis', 'Pelusium', 'Thinis', 'Coptos', 'Esna', 'Hierakonpolis', 'Faiyum', 'Crocodilopolis', 'Abu Simbel', 'Buhen', 'Napata', 'Meroe', 'Berenice', 'Nekheb', 'Athribis', 'Xois'],
      leaders: [
        L('cleopatra', 'Cleopatra', 'Pharaoh', 'Ptolemaic Court', '+15% Gold. Other leaders start friendlier toward you and wars declared on you cause 50% less war weariness.', { yieldMult: { gold: 1.15 }, attitudeBonus: 15, warWearinessMult: 0.5 }, { aggression: 0.3, expansion: 0.5, science: 0.5, culture: 0.8 }),
        L('ramses', 'Ramses II', 'Pharaoh', 'Builder of Monuments', 'Wonders cost 25% less and each Wonder yields +1 Happiness, +2 Culture and +2 Faith.', { wonderCostMult: 0.75, happinessPerWonder: 1, culturePerWonder: 2, faithPerWonder: 2 }, { aggression: 0.5, expansion: 0.5, science: 0.4, culture: 0.9 }),
        L('hatshepsut', 'Hatshepsut', 'Pharaoh', 'Expedition to Punt', 'Each worked Luxury yields +2 Gold. Naval units +1 Movement; Trade Outposts yield +3 Gold.', { luxuryGold: 2, navalMoves: 1, specializationYields: { trade: { gold: 3 } } }, { aggression: 0.2, expansion: 0.6, science: 0.6, culture: 0.6 })
      ] },

    { id: 'celts', name: 'Celts', adj: 'Celtic', difficulty: 'medium', bias: ['forest'], color: '#1e6b3a', color2: '#e0e0e0',
      ability: { name: 'Sacred Groves', desc: 'Worked Forest tiles yield +1 Production and +1 Culture. Units move through forest at normal cost.', fx: { tileBonus: [{ when: 'forest', yields: { production: 1, culture: 1 } }], forestMoveCost: 1 } },
      uu: { id: 'gaesatae', name: 'Gaesatae', replaces: 'spearman', strength: 3, vsStronger: 10, costMult: 0.8, desc: '+3 Strength, +10 vs units stronger than itself, 20% cheaper' },
      ub: { id: 'ceilidh_hall', name: 'Ceilidh Hall', replaces: 'amphitheater', yields: { culture: 2, happiness: 1 }, desc: '+2 Culture, +1 Happiness' },
      cities: ['Camulodunon', 'Bibracte', 'Alesia', 'Verlamion', 'Gergovia', 'Lugdunon', 'Eburacon', 'Tara', 'Dun Ollaigh', 'Isca', 'Namnetes', 'Durocornovium', 'Avaricum', 'Cenabum', 'Uxellodunum', 'Vesontio', 'Noviodunum', 'Manching', 'Heuneburg', 'Hallstatt', 'La Tène', 'Entremont', 'Numantia', 'Emain Macha', 'Cruachan', 'Dún Aonghasa', 'Cashel', 'Dunadd', 'Traprain Law', 'Maiden Castle', 'Danebury', 'Hengistbury', 'Ratae', 'Sorviodunum', 'Segontium', 'Caer Caradoc', 'Ynys Môn', "Tre'r Ceiri", 'Bagacum', 'Durocortorum'],
      leaders: [
        L('boudica', 'Boudica', 'Queen', 'Iceni Fury', 'Units +6 Strength in Forest and Rainforest. Melee units +3 when attacking.', { combatBonusForest: 6, meleeAttackBonus: 3 }, { aggression: 0.8, expansion: 0.5, science: 0.3, culture: 0.5 }),
        L('vercingetorix', 'Vercingetorix', 'Chieftain', 'Oppidum', 'Settlements on Hills +5 defense, +1 Production and +1 Culture. Fort Towns heal units fully each turn.', { settlementSiteBonus: [{ when: 'hills', yields: { production: 1, culture: 1 } }], hillsDefense: 5, fortFullHeal: true }, { aggression: 0.5, expansion: 0.6, science: 0.4, culture: 0.5 })
      ] },

    { id: 'arabia', name: 'Arabia', adj: 'Arabian', difficulty: 'medium', bias: ['desert'], color: '#1a7a4a', color2: '#f4f4f4',
      ability: { name: 'Caravanserai', desc: 'Worked Desert tiles yield +1 Gold. Trade Outposts yield +2 Science. Your religion spreads 50% faster.', fx: { tileBonus: [{ when: 'desert', yields: { gold: 1 } }], specializationYields: { trade: { science: 2 } }, pressureMult: 0.5 } },
      uu: { id: 'mamluk', name: 'Mamluk', replaces: 'knight', strength: 2, attack: 4, healAlways: true, desc: '+2 Strength, +4 attacking, heals every turn even after moving' },
      ub: { id: 'madrasa', name: 'Madrasa', replaces: 'university', yields: { science: 2, culture: 1 }, desc: '+2 Science, +1 Culture' },
      cities: ['Cairo', 'Damascus', 'Baghdad', 'Mecca', 'Medina', 'Aleppo', 'Basra', 'Jerusalem', 'Kufa', 'Mosul', 'Sana\'a', 'Muscat', 'Taif', 'Jeddah', 'Riyadh', 'Najran', 'Homs', 'Hama', 'Tripoli', 'Tyre', 'Acre', 'Gaza', 'Amman', 'Kairouan', 'Fustat', 'Fez', 'Tunis', 'Tangier', 'Samarra', 'Wasit', 'Raqqa', 'Aden', 'Zabid', 'Shibam', 'Mukalla', 'Salalah', 'Qatif', 'Hofuf', 'Tabuk', 'Khaybar'],
      leaders: [
        L('saladin', 'Saladin', 'Sultan', 'Righteous Blade', 'Units +5 Strength when fighting near your settlements (within 3 tiles). Capturing a settlement heals your nearby units.', { nearHomeBonus: 5, captureHeal: true }, { aggression: 0.6, expansion: 0.6, science: 0.6, culture: 0.5 }),
        L('harun', 'Harun al-Rashid', 'Caliph', 'House of Wisdom', '+10% Science; each Wonder yields +3 Science; gain a free technology when you build your first Library.', { yieldMult: { science: 1.1 }, sciencePerWonder: 3, freeTechOnBuilding: 'library' }, { aggression: 0.3, expansion: 0.6, science: 0.9, culture: 0.6 })
      ] },

    { id: 'france', name: 'France', adj: 'French', difficulty: 'medium', bias: ['grassland', 'river'], color: '#2c3e9e', color2: '#f5f5f5',
      ability: { name: 'Grand Siècle', desc: 'Each Wonder yields +2 Culture. Wonders cost 10% less.', fx: { culturePerWonder: 2, wonderCostMult: 0.9 } },
      uu: { id: 'garde_imperiale', name: 'Garde Impériale', replaces: 'musketman', strength: 5, homeContinentBonus: 8, cultureOnKill: 15, costMult: 1.25, desc: '+5 Strength, +8 on its home continent, +15 Culture per kill, costs 25% more' },
      ub: { id: 'salon', name: 'Salon', replaces: 'museum', yields: { culture: 3, gold: 1 }, desc: '+3 Culture, +1 Gold' },
      cities: ['Paris', 'Orléans', 'Lyon', 'Marseille', 'Bordeaux', 'Toulouse', 'Rouen', 'Reims', 'Nantes', 'Strasbourg', 'Lille', 'Dijon', 'Tours', 'Poitiers', 'Amiens', 'Caen', 'Rennes', 'Brest', 'Nancy', 'Metz', 'Besançon', 'Grenoble', 'Avignon', 'Nîmes', 'Montpellier', 'Toulon', 'Nice', 'Aix-en-Provence', 'Limoges', 'Clermont-Ferrand', 'Bourges', 'Chartres', 'Troyes', 'Angers', 'Le Mans', 'La Rochelle', 'Bayonne', 'Perpignan', 'Calais', 'Versailles'],
      leaders: [
        L('napoleon', 'Napoleon Bonaparte', 'Emperor', 'Grande Armée', 'Land units +4 Strength and cost 15% less. Siege units +5 vs settlements.', { landBonus: 4, unitCostMult: 0.85, vsSettlements: 5 }, { aggression: 0.9, expansion: 0.6, science: 0.5, culture: 0.6 }),
        L('louis', 'Louis XIV', 'Sun King', 'Versailles', '+2 Culture per settlement, capital +20% Culture and Gold; Theocracy and Monarchy give +2 extra Happiness.', { culturePerSettlement: 2, capitalMult: { culture: 1.2, gold: 1.2 }, monarchHappiness: 2 }, { aggression: 0.5, expansion: 0.5, science: 0.5, culture: 0.9 }),
        L('joan', 'Joan of Arc', 'Maid of Orléans', 'Divine Mission', '+8 Strength when defending inside your borders; units heal +10 in your territory; +1 Happiness per settlement.', { homeDefenseBonus: 8, healBonusHome: 10, happinessBonus: 1 }, { aggression: 0.3, expansion: 0.5, science: 0.5, culture: 0.7 })
      ] },

    { id: 'england', name: 'England', adj: 'English', difficulty: 'medium', bias: ['coast'], color: '#b71c1c', color2: '#ffffff',
      ability: { name: 'Rule the Waves', desc: 'Naval units +1 Movement and cost 20% less. Coastal settlements +2 Gold.', fx: { navalMoves: 1, navalCostMult: 0.8, coastalSettlementYields: { gold: 2 } } },
      uu: { id: 'redcoat', name: 'Redcoat', replaces: 'rifleman', strength: 4, amphibious: true, abroadBonus: 8, costMult: 1.2, desc: '+4 Strength, +8 on foreign continents, lands from the sea without penalty, costs 20% more' },
      ub: { id: 'royal_dockyard', name: 'Royal Navy Dockyard', replaces: 'harbor', yields: { gold: 4, production: 1 }, desc: '+4 Gold, +1 Production' },
      cities: ['London', 'York', 'Liverpool', 'Bristol', 'Manchester', 'Norwich', 'Birmingham', 'Leeds', 'Nottingham', 'Exeter', 'Canterbury', 'Newcastle', 'Winchester', 'Oxford', 'Cambridge', 'Southampton', 'Portsmouth', 'Plymouth', 'Dover', 'Coventry', 'Leicester', 'Lincoln', 'Chester', 'Durham', 'Carlisle', 'Lancaster', 'Sheffield', 'Hull', 'Derby', 'Gloucester', 'Worcester', 'Bath', 'Salisbury', 'Ipswich', 'Colchester', 'Shrewsbury', 'Warwick', 'Hastings', 'Reading', 'Sunderland'],
      leaders: [
        L('victoria', 'Victoria', 'Queen', 'Workshop of the World', 'Factories and Workshops yield +3 Production; +10% Production in Cities.', { buildingBonus: { factory: { production: 3 }, workshop: { production: 3 } }, cityYieldMult: { production: 1.1 } }, { aggression: 0.5, expansion: 0.7, science: 0.7, culture: 0.5 }),
        L('elizabeth', 'Elizabeth I', 'Queen', 'Sea Dogs', 'Naval units +5 Strength; killing a unit at sea or dispersing a camp grants triple Gold.', { navalBonus: 5, campGoldMult: 3, navalKillGold: 60 }, { aggression: 0.6, expansion: 0.6, science: 0.6, culture: 0.6 }),
        L('churchill', 'Winston Churchill', 'Prime Minister', 'Finest Hour', 'Settlements +5 defense and their walls always fire. Units +5 Strength when defending.', { cityDefense: 5, cityAttackNoWalls: true, defenseBonus: 5 }, { aggression: 0.4, expansion: 0.5, science: 0.6, culture: 0.5 })
      ] },

    { id: 'aztec', name: 'Aztec', adj: 'Aztec', difficulty: 'medium', bias: ['jungle', 'lake'], color: '#0e6655', color2: '#f0b27a',
      ability: { name: 'Flower Wars', desc: 'Killing a unit grants +10 Culture and +5 Gold. Melee units +1 Strength per worked Luxury (max +5).', fx: { culturePerKill: 10, goldPerKill: 5, strPerLuxury: 1 } },
      uu: { id: 'eagle_warrior', name: 'Eagle Warrior', replaces: 'warrior', strength: 6, productionOnKill: 25, costMult: 1.4, desc: '+6 Strength, each kill sends +25 Production to the nearest settlement, costs 40% more' },
      ub: { id: 'tlachtli', name: 'Tlachtli', replaces: 'amphitheater', yields: { culture: 1, happiness: 2 }, desc: '+1 Culture, +2 Happiness' },
      cities: ['Tenochtitlan', 'Texcoco', 'Tlatelolco', 'Tlacopan', 'Xochimilco', 'Azcapotzalco', 'Chalco', 'Tula', 'Cholula', 'Cuauhnahuac', 'Tlaxcala', 'Malinalco', 'Teotihuacan', 'Coyoacan', 'Ixtapalapa', 'Culhuacan', 'Chapultepec', 'Tenayuca', 'Coatlinchan', 'Huexotla', 'Tepeyac', 'Mixquic', 'Tlalmanalco', 'Amecameca', 'Tepoztlan', 'Tollantzinco', 'Huexotzinco', 'Atlixco', 'Toluca', 'Ixtlahuaca', 'Zumpango', 'Xaltocan', 'Cuautitlan', 'Tepeaca', 'Tehuacan', 'Coixtlahuaca', 'Tochtepec', 'Xoconochco', 'Oaxtepec', 'Ahuilizapan'],
      leaders: [
        L('montezuma', 'Montezuma', 'Tlatoani', 'Tribute of Blood', 'Each worked Luxury gives +1 extra Happiness. Captured settlements grant +200 Gold.', { luxuryHappinessBonus: 1, captureGold: 200 }, { aggression: 0.85, expansion: 0.5, science: 0.3, culture: 0.5 }),
        L('itzcoatl', 'Itzcoatl', 'Tlatoani', 'Triple Alliance', '+1 Production per settlement in the capital... simplified: capital +15% Production, units cost 15% less, settlers 20% cheaper.', { capitalMult: { production: 1.15 }, unitCostMult: 0.85, settlerCostMult: 0.8 }, { aggression: 0.6, expansion: 0.8, science: 0.4, culture: 0.4 })
      ] },

    { id: 'inca', name: 'Inca', adj: 'Incan', difficulty: 'hard', bias: ['mountain', 'hills'], color: '#a04000', color2: '#f9e79f',
      ability: { name: 'Terraces', desc: 'Worked Hills yield +1 Food. Units can cross Mountains (3 movement).', fx: { tileBonus: [{ when: 'hills', yields: { food: 1 } }], mountainsPassable: true } },
      ub: { id: 'qollqa', name: 'Qollqa', replaces: 'granary', yields: { food: 2, production: 1 }, desc: '+2 Food, +1 Production' },
      ui: { id: 'terrace', name: 'Terrace', icon: '🌄', replaces: 'mine', when: 'hills', yields: { food: 2 }, desc: 'hill mines also grow food: +2 Food' },
      cities: ['Cusco', 'Machu Picchu', 'Ollantaytambo', 'Vilcabamba', 'Cajamarca', 'Quito', 'Tiwanaku', 'Chan Chan', 'Huánuco', 'Arequipa', 'Pisac', 'Vitcos', 'Sacsayhuamán', 'Vilcashuamán', 'Huánuco Pampa', 'Pachacamac', 'Tumebamba', 'Ingapirca', 'Hatun Xauxa', 'Chinchero', 'Raqchi', 'Choquequirao', 'Tipón', 'Pucara', 'Chucuito', 'Copacabana', 'Cochabamba', 'Samaipata', 'Incallajta', 'Paucartambo', 'Andahuaylas', 'Abancay', 'Ayacucho', 'Huancayo', 'Tarma', 'Chachapoyas', 'Kuelap', 'Paramonga', 'Nazca', 'Puno'],
      leaders: [
        L('pachacuti', 'Pachacuti', 'Sapa Inca', 'Qhapaq Ñan', 'Units +1 Movement inside your borders; worked Hills +1 Production; Mining Towns +2 Gold.', { homeMoves: 1, tileBonus: [{ when: 'hills', yields: { production: 1 } }], specializationYields: { mining: { gold: 2 } } }, { aggression: 0.3, expansion: 0.7, science: 0.5, culture: 0.5 }),
        L('huayna', 'Huayna Capac', 'Sapa Inca', 'Mit\'a Levy', 'Towns convert Production to Gold at 130% and grow 15% faster. Pioneers cost 15% less.', { townGoldMult: 1.3, townGrowthMult: 1.15, settlerCostMult: 0.85 }, { aggression: 0.4, expansion: 0.9, science: 0.4, culture: 0.4 })
      ] },

    { id: 'maya', name: 'Maya', adj: 'Mayan', difficulty: 'hard', bias: ['jungle'], color: '#117864', color2: '#fdfefe',
      ability: { name: 'Long Count', desc: 'Farms yield +1 Food. +1 Science per 2 population in every settlement.', fx: { tileBonus: [{ when: 'farm', yields: { food: 1 } }], sciencePerPop: 0.5 } },
      uu: { id: 'hulche', name: "Hul'che", replaces: 'archer', ranged: 2, range: 1, bonusVsDamaged: 5, desc: '+2 Ranged Strength, +1 Range, +5 vs wounded units' },
      ub: { id: 'observatory', name: 'Observatory', replaces: 'library', yields: { science: 2 }, desc: '+2 Science' },
      cities: ['Mutal', 'Yaxchilan', 'Calakmul', 'Uxmal', 'Chichen Itza', 'Copan', 'Palenque', 'Caracol', 'Coba', 'Tulum', 'Mayapan', 'Naranjo', 'Quirigua', 'Bonampak', 'Piedras Negras', 'Dos Pilas', 'Seibal', 'Altar de Sacrificios', 'El Mirador', 'Nakbe', 'Uaxactun', 'Rio Azul', 'Xunantunich', 'Lamanai', 'Altun Ha', 'Cerros', 'Edzna', 'Kabah', 'Sayil', 'Labna', 'Dzibilchaltun', 'Ek Balam', 'Izamal', 'Becan', 'Comalcalco', 'Tonina', 'Kaminaljuyu', 'Zaculeu', 'Iximche', 'Cancuen'],
      leaders: [
        L('sixsky', 'Lady Six Sky', 'Queen', 'Ix Mutal Ajaw', 'Settlements within 6 tiles of the capital yield +15%; units +5 Strength within 6 tiles of the capital.', { capitalRadiusBonus: { radius: 6, mult: 1.15 }, capitalRadiusCombat: { radius: 6, bonus: 5 } }, { aggression: 0.4, expansion: 0.5, science: 0.8, culture: 0.5 }),
        L('pakal', 'K\'inich Janaab\' Pakal', 'Ajaw', 'Temple of Inscriptions', 'Wonders cost 15% less; each Wonder yields +3 Science and +1 Happiness. Starts with a free Pantheon.', { wonderCostMult: 0.85, sciencePerWonder: 3, happinessPerWonder: 1, freePantheon: true }, { aggression: 0.3, expansion: 0.5, science: 0.8, culture: 0.7 })
      ] },

    { id: 'shawnee', name: 'Shawnee', adj: 'Shawnee', difficulty: 'medium', bias: ['forest', 'river'], color: '#6e2c00', color2: '#7fb3d5',
      ability: { name: 'Kithita', desc: 'Worked River tiles yield +1 Food and +1 Culture. Independent camps yield triple Gold when dispersed.', fx: { tileBonus: [{ when: 'river', yields: { food: 1, culture: 1 } }], campGoldMult: 3 } },
      uu: { id: 'kispoko', name: 'Kispoko Warrior', replaces: 'horseman', strength: 3, moves: 1, forestMove: true, sight: 1, terrainBonus: {forest: 6}, desc: '+3 Strength, +1 Movement, +1 Sight, moves freely through forest, +6 in forest' },
      ub: { id: 'council_lodge', name: 'Council Lodge', replaces: 'monument', yields: { culture: 1, happiness: 1 }, desc: '+1 Culture, +1 Happiness' },
      cities: ['Chalahgawtha', 'Piqua', 'Wapakoneta', 'Kispoko', 'Mekoche', 'Prophetstown', 'Lower Shawneetown', 'Tippecanoe', 'Blue Jacket\'s Town', 'Girty\'s Town', 'Cornstalk\'s Town', 'Hog Creek', 'Old Chillicothe', 'Standing Stone', 'Sonnontio', 'Logstown', 'Eskippakithiki', 'Pekowi', 'Thawikila', 'Hathawekela', 'Wakatomika', 'Mackachack', "Snake's Town", "Moluntha's Town", "Tecumseh's Town", "Black Hoof's Town", 'Lewistown', "Captain Johnny's Town", 'Blue Licks', 'Greenville', 'Cape Girardeau', 'Apple Creek', 'Grand Glaize', 'Willstown', 'Chartierstown', 'Sawcunk', 'Pequea', 'Paxtang', 'Kittanning', 'Salt Lick Town'],
      leaders: [
        L('tecumseh', 'Tecumseh', 'War Chief', 'Confederacy', 'Units +5 Strength vs independents and +3 inside your borders; units heal +10 in your territory.', { vsIndependents: 5, combatBonusHome: 3, healBonusHome: 10 }, { aggression: 0.5, expansion: 0.6, science: 0.4, culture: 0.6 }),
        L('cornstalk', 'Cornstalk', 'Chief', 'Council Fire', '+2 Culture per settlement; Towns grow 20% faster; Farming Towns +2 Food.', { culturePerSettlement: 2, townGrowthMult: 1.2, specializationYields: { farming: { food: 2 } } }, { aggression: 0.3, expansion: 0.7, science: 0.5, culture: 0.7 })
      ] },

    { id: 'greece', name: 'Greece', adj: 'Greek', difficulty: 'easy', bias: ['coast', 'hills'], color: '#1a5276', color2: '#f4f6f7',
      ability: { name: 'Agora', desc: '+10% Culture. Governments give +1 Happiness per settlement (any except Chiefdom).', fx: { yieldMult: { culture: 1.1 }, governmentHappiness: 1 } },
      uu: { id: 'hoplite', name: 'Hoplite', replaces: 'spearman', strength: 3, defense: 3, flankSame: 5, costMult: 1.15, desc: '+3 Strength, +3 defending, +5 per adjacent Hoplite (phalanx), costs 15% more' },
      ub: { id: 'odeon', name: 'Odeon', replaces: 'amphitheater', yields: { culture: 2, science: 1 }, desc: '+2 Culture, +1 Science' },
      cities: ['Athens', 'Sparta', 'Corinth', 'Thebes', 'Argos', 'Delphi', 'Rhodes', 'Ephesus', 'Miletus', 'Knossos', 'Olympia', 'Pella', 'Megara', 'Eretria', 'Chalcis', 'Marathon', 'Eleusis', 'Piraeus', 'Mycenae', 'Tiryns', 'Epidaurus', 'Mantinea', 'Tegea', 'Messene', 'Pylos', 'Elis', 'Patras', 'Naupactus', 'Delos', 'Naxos', 'Samos', 'Chios', 'Mytilene', 'Smyrna', 'Phocaea', 'Byzantium', 'Larissa', 'Amphipolis', 'Thessaloniki', 'Olynthus'],
      leaders: [
        L('pericles', 'Pericles', 'Strategos', 'Golden Age of Athens', 'Every Insight also grants 20% of the civic\'s cost in Culture. Each Wonder yields +2 Science and +2 Culture.', { inspirationDiscount: 0.2, sciencePerWonder: 2, culturePerWonder: 2 }, { aggression: 0.3, expansion: 0.5, science: 0.7, culture: 0.9 }),
        L('leonidas', 'Leonidas', 'King', 'Thermopylae', 'Anti-cavalry +6 Strength; +10 Strength when defending on Hills; units start with a level.', { classBonus: { antcav: 6 }, hillsDefenseBonus: 10, unitsStartXp: 5 }, { aggression: 0.7, expansion: 0.4, science: 0.3, culture: 0.4 }),
        L('alexander', 'Alexander', 'King of Macedon', 'To the Ends of the World', 'No war weariness. Capturing a settlement grants a free technology boost of 60 Science; cavalry +4 Strength.', { warWearinessMult: 0, captureScience: 60, cavalryBonus: 4 }, { aggression: 0.95, expansion: 0.6, science: 0.5, culture: 0.4 })
      ] },

    { id: 'germany', name: 'Germany', adj: 'German', difficulty: 'easy', bias: ['river', 'forest'], color: '#4d4d4d', color2: '#f1c40f',
      ability: { name: 'Free Imperial Cities', desc: '+10% Production in Cities. Upgrading a Town into a City is 15% cheaper.', fx: { cityYieldMult: { production: 1.1 }, cityUpgradeCostMult: 0.85 } },
      uu: { id: 'landsknecht', name: 'Landsknecht', replaces: 'pikeman', strength: 2, costMult: 0.6, vsCls: {melee: 6}, goldOnKill: 25, desc: '+2 Strength, 40% cheaper, +6 vs melee, +25 Gold per kill' },
      ub: { id: 'hansa', name: 'Hansa', replaces: 'workshop', yields: { production: 2, gold: 2 }, desc: '+2 Production, +2 Gold' },
      cities: ['Aachen', 'Cologne', 'Frankfurt', 'Magdeburg', 'Mainz', 'Heidelberg', 'Trier', 'Berlin', 'Hamburg', 'Munich', 'Nuremberg', 'Leipzig', 'Bremen', 'Lübeck', 'Regensburg', 'Augsburg', 'Würzburg', 'Bamberg', 'Erfurt', 'Dresden', 'Hanover', 'Brunswick', 'Münster', 'Dortmund', 'Essen', 'Düsseldorf', 'Stuttgart', 'Ulm', 'Freiburg', 'Speyer', 'Worms', 'Koblenz', 'Kassel', 'Göttingen', 'Rostock', 'Stralsund', 'Kiel', 'Potsdam', 'Weimar', 'Wittenberg'],
      leaders: [
        L('barbarossa', 'Frederick Barbarossa', 'Holy Roman Emperor', 'Imperial Diet', '+1 Production per Town... simplified: every Town yields +2 Production-as-Gold and Cities +2 Production.', { townYields: { gold: 2 }, citySiteYields: { production: 2 } }, { aggression: 0.6, expansion: 0.7, science: 0.6, culture: 0.4 }),
        L('bismarck', 'Otto von Bismarck', 'Chancellor', 'Blood and Iron', 'Units cost 20% less; Military Academies and Barracks give +2 Strength to units built there; +5 Strength vs settlements.', { unitCostMult: 0.8, unitStrengthFromBarracks: 2, vsSettlements: 5 }, { aggression: 0.7, expansion: 0.6, science: 0.6, culture: 0.4 }),
        L('frederick', 'Frederick the Great', 'King of Prussia', 'Enlightened Despot', 'Technologies cost 10% less; +10% Science; Oligarchy and Autocracy give +2 extra Combat Strength.', { techCostMult: 0.9, yieldMult: { science: 1.1 }, despotCombat: 2 }, { aggression: 0.6, expansion: 0.5, science: 0.8, culture: 0.6 })
      ] },

    { id: 'russia', name: 'Russia', adj: 'Russian', difficulty: 'medium', bias: ['tundra'], color: '#5d6d7e', color2: '#f4d03f',
      ability: { name: 'Endless Steppe', desc: 'Tundra and Snow tiles yield +1 Food and +1 Production when worked. Settlements expand into a fourth ring.', fx: { tileBonus: [{ when: 'cold', yields: { food: 1, production: 1 } }], expansionRadius: 1 } },
      uu: { id: 'cossack', name: 'Cossack', replaces: 'cavalry', strength: 5, movesAfterAttack: true, homeBonus: 5, terrainBonus: {tundra: 5, snow: 5}, costMult: 1.25, desc: '+5 Strength, can move after attacking, +5 inside your borders and on tundra or snow, costs 25% more' },
      ub: { id: 'lavra', name: 'Lavra', replaces: 'shrine', yields: { culture: 3, happiness: 1 }, desc: '+3 Culture, +1 Happiness' },
      cities: ['Moscow', 'St. Petersburg', 'Novgorod', 'Kiev', 'Kazan', 'Yekaterinburg', 'Vladimir', 'Smolensk', 'Rostov', 'Tver', 'Yaroslavl', 'Arkhangelsk', 'Pskov', 'Suzdal', 'Ryazan', 'Nizhny Novgorod', 'Kostroma', 'Vologda', 'Murom', 'Kolomna', 'Kaluga', 'Kursk', 'Voronezh', 'Samara', 'Saratov', 'Tsaritsyn', 'Orenburg', 'Perm', 'Chelyabinsk', 'Omsk', 'Tomsk', 'Novosibirsk', 'Krasnoyarsk', 'Irkutsk', 'Yakutsk', 'Vladivostok', 'Khabarovsk', 'Magadan', 'Murmansk', 'Tobolsk'],
      leaders: [
        L('peter', 'Peter the Great', 'Tsar', 'Window to the West', 'Gain +15 Science whenever you learn a civic and +15 Culture when you learn a technology. Naval units +1 Movement.', { civicScience: 15, techCulture: 15, navalMoves: 1 }, { aggression: 0.5, expansion: 0.7, science: 0.8, culture: 0.6 }),
        L('catherine', 'Catherine the Great', 'Empress', 'Enlightened Court', '+2 Culture per settlement; Museums and Amphitheaters +2 Culture; purchases 10% cheaper.', { culturePerSettlement: 2, buildingBonus: { museum: { culture: 2 }, amphitheater: { culture: 2 } }, purchaseMult: 0.9 }, { aggression: 0.4, expansion: 0.7, science: 0.6, culture: 0.8 }),
        L('ivan', 'Ivan the Terrible', 'Tsar', 'Oprichnina', 'Units +6 Strength when defending in your territory; settlements +5 defense; capturing a settlement grants +80 Gold.', { homeDefenseBonus: 6, cityDefense: 5, captureGold: 80 }, { aggression: 0.8, expansion: 0.7, science: 0.4, culture: 0.4 })
      ] },

    { id: 'spain', name: 'Spain', adj: 'Spanish', difficulty: 'medium', bias: ['coast', 'hills'], color: '#c0392b', color2: '#f7dc6f',
      ability: { name: 'Conquistadores', desc: 'Units +5 Strength when fighting on a continent other than your capital\'s and +5 vs followers of other religions. Dispersing camps grants double Gold.', fx: { combatBonusAbroad: 5, combatBonusVsOtherReligion: 5, campGoldMult: 2 } },
      uu: { id: 'tercio', name: 'Tercio', replaces: 'musketman', strength: 6, vsCls: {cavalry: 10}, captureBonus: true, costMult: 1.3, desc: '+6 Strength, +10 vs cavalry, captured settlements keep population and buildings, costs 30% more' },
      ub: { id: 'mission', name: 'Mission', replaces: 'shrine', yields: { culture: 2, science: 1, happiness: 1 }, desc: '+2 Culture, +1 Science, +1 Happiness' },
      cities: ['Madrid', 'Barcelona', 'Seville', 'Toledo', 'Valencia', 'Córdoba', 'Zaragoza', 'Granada', 'Bilbao', 'Cádiz', 'Salamanca', 'Santiago', 'Burgos', 'León', 'Valladolid', 'Segovia', 'Ávila', 'Cuenca', 'Murcia', 'Cartagena', 'Málaga', 'Almería', 'Jaén', 'Mérida', 'Badajoz', 'Cáceres', 'Oviedo', 'Gijón', 'Santander', 'Pamplona', 'Logroño', 'Vitoria', 'Tarragona', 'Girona', 'Lleida', 'Palma', 'Alicante', 'Huelva', 'Jerez', 'Ceuta'],
      leaders: [
        L('isabella', 'Isabella I', 'Queen of Castile', 'Treasure Fleet', 'Settlements founded on another continent start with +2 population and a free Granary. Naval units +1 Movement.', { abroadFoundPop: 2, abroadFreeBuilding: 'granary', navalMoves: 1 }, { aggression: 0.6, expansion: 0.8, science: 0.5, culture: 0.6 }),
        L('philip', 'Philip II', 'King', 'Spanish Armada', 'Naval units +6 Strength and cost 20% less; Missions yield +2 extra Culture.', { navalBonus: 6, navalCostMult: 0.8, buildingBonus: { shrine: { culture: 2 } } }, { aggression: 0.7, expansion: 0.6, science: 0.4, culture: 0.6 })
      ] },

    { id: 'ottoman', name: 'Ottomans', adj: 'Ottoman', difficulty: 'medium', bias: ['coast', 'hills'], color: '#1b4f3f', color2: '#e8e8e8',
      ability: { name: 'Devshirme', desc: 'Siege units +1 Movement and +5 Strength vs settlements. Conquered settlements keep all buildings.', fx: { classMoves: { siege: 1 }, vsSettlements: 5, captureKeepBuildings: true } },
      uu: { id: 'janissary', name: 'Janissary', replaces: 'musketman', strength: 4, costMult: 0.8, vsSettlements: 8, freeLevel: 1, desc: '+4 Strength, 20% cheaper, +8 vs settlements, starts at level 1' },
      ub: { id: 'bazaar', name: 'Grand Bazaar', replaces: 'market', yields: { gold: 4, happiness: 1 }, desc: '+4 Gold, +1 Happiness' },
      cities: ['Istanbul', 'Edirne', 'Bursa', 'Ankara', 'Izmir', 'Konya', 'Trabzon', 'Antalya', 'Erzurum', 'Adana', 'Sofia', 'Belgrade', 'Söğüt', 'Iznik', 'Manisa', 'Amasya', 'Sivas', 'Kayseri', 'Kütahya', 'Diyarbakır', 'Van', 'Kars', 'Samsun', 'Sinop', 'Gallipoli', 'Selanik', 'Skopje', 'Sarajevo', 'Buda', 'Plovdiv', 'Varna', 'Nicosia', 'Algiers', 'Bitola', 'Niš', 'Ruse', 'Silistra', 'Bender', 'Ochakov', 'Kefe'],
      leaders: [
        L('mehmed', 'Mehmed II', 'Sultan', 'Conqueror', 'Siege units +10 Strength vs settlements; capturing a capital grants +300 Gold.', { classBonusVsSettlements: { siege: 10 }, captureCapitalGold: 300 }, { aggression: 0.9, expansion: 0.6, science: 0.5, culture: 0.5 }),
        L('suleiman', 'Suleiman', 'Kanuni', 'Lawgiver', '+2 Happiness per settlement; +10% Gold; conquered settlements gain +3 Happiness.', { happinessBonus: 2, yieldMult: { gold: 1.1 }, capturedHappiness: 3 }, { aggression: 0.6, expansion: 0.6, science: 0.6, culture: 0.7 })
      ] },

    { id: 'korea', name: 'Korea', adj: 'Korean', difficulty: 'medium', bias: ['coast', 'mountain'], color: '#2874a6', color2: '#f4f6f7',
      ability: { name: 'Seowon', desc: 'Libraries and Universities yield +2 Science. Urban Centers +3 Science.', fx: { buildingBonus: { library: { science: 2 }, university: { science: 2 } }, specializationYields: { urban: { science: 3 } } } },
      uu: { id: 'hwacha', name: 'Hwacha', replaces: 'field_cannon', ranged: 8, defense: 5, scienceOnKill: 20, costMult: 1.3, desc: '+8 Ranged Strength, +5 defending, +20 Science per kill, costs 30% more' },
      ub: { id: 'jipgyeongjeon', name: 'Jiphyeonjeon', replaces: 'university', yields: { science: 3, culture: 1 }, desc: '+3 Science, +1 Culture' },
      cities: ['Seoul', 'Busan', 'Gyeongju', 'Pyongyang', 'Gaeseong', 'Daegu', 'Incheon', 'Jeonju', 'Gwangju', 'Suwon', 'Ulsan', 'Cheongju', 'Gongju', 'Buyeo', 'Wonju', 'Chuncheon', 'Gangneung', 'Andong', 'Sangju', 'Jinju', 'Mokpo', 'Yeosu', 'Suncheon', 'Namwon', 'Gimhae', 'Pohang', 'Gyeongsan', 'Chungju', 'Jeju', 'Hamhung', 'Wonsan', 'Sinuiju', 'Uiju', 'Kanggye', 'Hoeryong', 'Chongjin', 'Nampo', 'Haeju', 'Sariwon', 'Ganghwa'],
      leaders: [
        L('sejong', 'Sejong', 'King', 'Hangul', 'Technologies cost 10% less; +1 Science per settlement; +20 Culture whenever you learn a technology.', { techCostMult: 0.9, sciencePerSettlement: 1, techCulture: 20 }, { aggression: 0.2, expansion: 0.5, science: 0.95, culture: 0.6 }),
        L('sunsin', 'Yi Sun-sin', 'Admiral', 'Turtle Ships', 'Naval units +8 Strength when defending and +1 Movement; coastal settlements +5 defense.', { navalDefenseBonus: 8, navalMoves: 1, coastalDefense: 5 }, { aggression: 0.5, expansion: 0.5, science: 0.7, culture: 0.4 })
      ] },

    { id: 'vietnam', name: 'Vietnam', adj: 'Vietnamese', difficulty: 'hard', bias: ['jungle'], color: '#a93226', color2: '#f9e79f',
      ability: { name: 'Nine Dragons', desc: 'Worked Rainforest and Marsh tiles yield +1 Production and +1 Culture. Units +5 Strength in Rainforest and Marsh.', fx: { tileBonus: [{ when: 'jungle', yields: { production: 1, culture: 1 } }], combatBonusJungle: 5 } },
      uu: { id: 'voi_chien', name: 'Voi Chiến', replaces: 'knight', strength: 3, forestMove: true, terrainBonus: {forest: 7, jungle: 7, marsh: 7}, costMult: 1.25, desc: '+3 Strength, moves freely through forest and jungle, +7 in forest, jungle and marsh, costs 25% more' },
      ub: { id: 'thanh', name: 'Thành', replaces: 'walls', yields: { culture: 1, production: 1 }, desc: '+1 Culture, +1 Production' },
      cities: ['Thang Long', 'Hue', 'Saigon', 'Hai Phong', 'Da Nang', 'Hoa Lu', 'Vinh', 'Can Tho', 'Nha Trang', 'Hoi An', 'Ha Long', 'Bac Ninh', 'Co Loa', 'Me Linh', 'Thanh Hoa', 'Nam Dinh', 'Ninh Binh', 'Hai Duong', 'Lang Son', 'Cao Bang', 'Thai Nguyen', 'Viet Tri', 'Phu Tho', 'Son Tay', 'Ha Tinh', 'Dong Hoi', 'Quang Tri', 'Quang Ngai', 'Quy Nhon', 'Tuy Hoa', 'Phan Rang', 'Phan Thiet', 'Da Lat', 'Bien Hoa', 'My Tho', 'Vinh Long', 'Long Xuyen', 'Rach Gia', 'Ca Mau', 'Tay Ninh'],
      leaders: [
        L('trung', 'Trưng Trắc', 'Queen', 'Uprising', 'Units +8 Strength when defending inside your borders; each settlement gets free Walls with Masonry.', { homeDefenseBonus: 8, freeBuildingWithTech: { walls: 'masonry' } }, { aggression: 0.4, expansion: 0.5, science: 0.4, culture: 0.6 }),
        L('leloi', 'Lê Lợi', 'Emperor', 'Lam Sơn', 'Units +1 Movement in Forest and Rainforest (normal cost); units heal +15 in your territory; killing a unit grants +8 Culture.', { forestMoveCost: 1, healBonusHome: 15, culturePerKill: 8 }, { aggression: 0.6, expansion: 0.6, science: 0.4, culture: 0.6 })
      ] },

    { id: 'ethiopia', name: 'Ethiopia', adj: 'Ethiopian', difficulty: 'medium', bias: ['hills', 'mountain'], color: '#7d6608', color2: '#27ae60',
      ability: { name: 'Roof of Africa', desc: 'Settlements on Hills yield +2 Culture and +3 defense. Worked Hills +1 Gold.', fx: { settlementSiteBonus: [{ when: 'hills', yields: { culture: 2 } }], hillsDefense: 3, tileBonus: [{ when: 'hills', yields: { gold: 1 } }] } },
      uu: { id: 'shotel', name: 'Shotel Warrior', replaces: 'swordsman', strength: 3, moves: 1, ignoreHills: true, terrainBonus: {hills: 5}, vsIndependents: 8, desc: '+3 Strength, +1 Movement, hills cost no extra movement, +5 on hills, +8 vs raiders' },
      ub: { id: 'rock_church', name: 'Rock-Hewn Church', replaces: 'shrine', yields: { culture: 2, happiness: 2 }, desc: '+2 Culture, +2 Happiness' },
      cities: ['Aksum', 'Gondar', 'Lalibela', 'Addis Ababa', 'Harar', 'Adwa', 'Mekelle', 'Bahir Dar', 'Dire Dawa', 'Jimma', 'Debre Markos', 'Yeha', 'Debre Berhan', 'Debre Damo', 'Ankober', 'Magdala', 'Adulis', 'Dessie', 'Woldia', 'Adigrat', 'Sokota', 'Debre Tabor', 'Gorgora', 'Dembidolo', 'Nekemte', 'Ambo', 'Awasa', 'Arba Minch', 'Shashamane', 'Dila', 'Goba', 'Jijiga', 'Gambela', 'Assosa', 'Semera', 'Wukro', 'Zeila', 'Entoto', 'Tegulet', 'Barara'],
      leaders: [
        L('menelik', 'Menelik II', 'Emperor', 'Victory at Adwa', 'Units +6 Strength when defending on Hills and +5 vs units from another continent.', { hillsDefenseBonus: 6, combatBonusVsInvaders: 5 }, { aggression: 0.4, expansion: 0.6, science: 0.5, culture: 0.5 }),
        L('zara', 'Zara Yaqob', 'Emperor', 'Book of Light', '+2 Culture per settlement; Shrines yield +2 Science; +1 Happiness per settlement; +25% Faith.', { culturePerSettlement: 2, buildingBonus: { shrine: { science: 2 } }, happinessBonus: 1, yieldMult: { faith: 1.25 } }, { aggression: 0.3, expansion: 0.5, science: 0.6, culture: 0.8 })
      ] },

    { id: 'mali', name: 'Mali', adj: 'Malian', difficulty: 'hard', bias: ['desert'], color: '#b9770e', color2: '#fdfefe',
      ability: { name: 'Salt and Gold', desc: 'Worked Desert tiles yield +2 Gold. Purchases cost 15% less. Cities -10% Production. Caravans: two extra, and each route yields +2 Gold.', fx: { extraCaravans: 2, caravanGold: 2, tileBonus: [{ when: 'desert', yields: { gold: 2 } }], purchaseMult: 0.85, cityYieldMult: { production: 0.9 } } },
      uu: { id: 'sofa', name: 'Sofa', replaces: 'horseman', strength: 2, defense: 4, goldOnKill: 50, purchaseMult: 0.7, desc: '+2 Strength, +4 defending, +50 Gold per kill, 30% cheaper to purchase' },
      ub: { id: 'suguba', name: 'Suguba', replaces: 'market', yields: { gold: 5 }, desc: '+5 Gold' },
      cities: ['Niani', 'Timbuktu', 'Djenné', 'Gao', 'Walata', 'Kangaba', 'Ségou', 'Koumbi Saleh', 'Kita', 'Bamako', 'Mopti', 'Sikasso', 'Taghaza', 'Takedda', 'Tadmekka', 'Audaghost', 'Kayes', 'Nioro', 'Koulikoro', 'Bandiagara', 'Douentza', 'Bourem', 'Kabara', 'Diré', 'Goundam', 'Kong', 'Bobo-Dioulasso', 'Kankan', 'Siguiri', 'Kouroussa', 'Dinguiraye', 'Bouré', 'Bambouk', 'Sansanding', 'Djoliba', 'Hamdallahi', 'Macina', 'Tichitt', 'Araouane', 'Dioïla'],
      leaders: [
        L('mansa', 'Mansa Musa', 'Mansa', 'Golden Pilgrimage', '+25% Gold. Trade Outposts +4 Gold. Gain 100 Gold when you found a settlement.', { yieldMult: { gold: 1.25 }, specializationYields: { trade: { gold: 4 } }, foundGold: 100 }, { aggression: 0.2, expansion: 0.7, science: 0.6, culture: 0.6 }),
        L('sundiata', 'Sundiata Keita', 'Mansa', 'Lion King', 'Cavalry +5 Strength; units heal +10 everywhere; +1 Happiness per settlement.', { cavalryBonus: 5, healBonusAll: 10, happinessBonus: 1 }, { aggression: 0.6, expansion: 0.6, science: 0.4, culture: 0.5 })
      ] },

    { id: 'norway', name: 'Norway', adj: 'Norse', difficulty: 'hard', bias: ['coast'], color: '#1f618d', color2: '#e74c3c',
      ability: { name: 'Longships', desc: 'Units can embark from the start and embark/disembark without ending their move. Naval units +1 Movement.', fx: { earlyEmbark: true, freeDisembark: true, navalMoves: 1 } },
      uu: { id: 'berserker', name: 'Berserker', replaces: 'swordsman', strength: 5, moves: 1, amphibious: true, attack: 7, defense: -3, costMult: 1.25, desc: '+5 Strength, +1 Movement, +7 attacking, -3 defending, lands from the sea without penalty, costs 25% more' },
      ub: { id: 'stave_church', name: 'Stave Church', replaces: 'shrine', yields: { culture: 2, production: 1 }, desc: '+2 Culture, +1 Production' },
      cities: ['Nidaros', 'Bergen', 'Oslo', 'Tønsberg', 'Stavanger', 'Kaupang', 'Tromsø', 'Hamar', 'Bodø', 'Ålesund', 'Kristiansand', 'Sarpsborg', 'Borg', 'Avaldsnes', 'Lade', 'Stiklestad', 'Steinkjer', 'Molde', 'Kristiansund', 'Narvik', 'Harstad', 'Alta', 'Hammerfest', 'Vardø', 'Kirkenes', 'Lillehammer', 'Gjøvik', 'Drammen', 'Fredrikstad', 'Moss', 'Halden', 'Arendal', 'Grimstad', 'Skien', 'Larvik', 'Haugesund', 'Florø', 'Røros', 'Namsos', 'Svolvær'],
      leaders: [
        L('harald', 'Harald Hardrada', 'King', 'Last Viking', 'Melee units +5 Strength when attacking from the sea or on Coast; killing a unit grants +20 Gold.', { combatBonusCoast: 5, goldPerKill: 20 }, { aggression: 0.85, expansion: 0.6, science: 0.3, culture: 0.4 }),
        L('olav', 'Olav Tryggvason', 'King', 'Christening Sword', 'Capturing a settlement grants +100 Culture; Shrines +2 Culture; naval units +4 Strength.', { captureCulture: 100, buildingBonus: { shrine: { culture: 2 } }, navalBonus: 4 }, { aggression: 0.7, expansion: 0.6, science: 0.4, culture: 0.6 })
      ] },

    { id: 'babylon', name: 'Babylon', adj: 'Babylonian', difficulty: 'medium', bias: ['river', 'marsh'], color: '#6c3483', color2: '#f8c471',
      ability: { name: 'Cradle of Civilization', desc: 'Technologies cost 15% less, but each settlement yields -1 Science. Worked River tiles +1 Gold.', fx: { techCostMult: 0.85, sciencePerSettlement: -1, tileBonus: [{ when: 'river', yields: { gold: 1 } }] } },
      uu: { id: 'sabum', name: 'Sabum Kibittum', replaces: 'warrior', strength: 3, moves: 1, sight: 2, xpMult: 1, scienceOnKill: 10, desc: '+3 Strength, +1 Movement, +2 Sight, double experience, +10 Science per kill' },
      ub: { id: 'ziggurat', name: 'Ziggurat', replaces: 'library', yields: { science: 2, culture: 1, faith: 1 }, desc: '+2 Science, +1 Culture, +1 Faith' },
      cities: ['Babylon', 'Ur', 'Uruk', 'Nippur', 'Sippar', 'Kish', 'Larsa', 'Eridu', 'Lagash', 'Borsippa', 'Isin', 'Akkad', 'Girsu', 'Umma', 'Shuruppak', 'Adab', 'Bad-tibira', 'Marad', 'Dilbat', 'Kutha', 'Der', 'Eshnunna', 'Mari', 'Nineveh', 'Ashur', 'Nimrud', 'Dur-Sharrukin', 'Arrapha', 'Nuzi', 'Harran', 'Carchemish', 'Ebla', 'Terqa', 'Tuttul', 'Kisurra', 'Zabalam', 'Larak', 'Dur-Kurigalzu', 'Nagar', 'Urkesh'],
      leaders: [
        L('hammurabi', 'Hammurabi', 'King', 'Code of Laws', 'Gain a free Civic when you build your first Monument; +2 Culture per settlement; Walls +2 defense.', { freeCivicOnBuilding: 'monument', culturePerSettlement: 2, cityDefense: 2 }, { aggression: 0.4, expansion: 0.6, science: 0.7, culture: 0.7 }),
        L('nebuchadnezzar', 'Nebuchadnezzar II', 'King', 'Hanging Gardens', 'Settlements grow 20% faster; Wonders cost 15% less; +1 Happiness per Wonder.', { growthMult: 1.2, wonderCostMult: 0.85, happinessPerWonder: 1 }, { aggression: 0.5, expansion: 0.6, science: 0.6, culture: 0.7 })
      ] },

    { id: 'polynesia', name: 'Polynesia', adj: 'Polynesian', difficulty: 'hard', bias: ['coast'], color: '#148f77', color2: '#fad7a0',
      ability: { name: 'Wayfinders', desc: 'Units can embark and cross Ocean from the start. Embarked units +1 Movement. Worked water tiles +1 Production.', fx: { earlyEmbark: true, earlyOcean: true, embarkMoves: 1, tileBonus: [{ when: 'water', yields: { production: 1 } }] } },
      uu: { id: 'maori_warrior', name: 'Toa', replaces: 'warrior', strength: 5, intimidate: 5, amphibious: true, costMult: 1.3, desc: '+5 Strength, adjacent enemies fight at -5 (haka), lands from the sea without penalty, costs 30% more' },
      ub: { id: 'marae', name: 'Marae', replaces: 'monument', yields: { culture: 2, happiness: 1 }, desc: '+2 Culture, +1 Happiness' },
      cities: ['Honolulu', 'Rapa Nui', 'Tahiti', 'Nuku Hiva', 'Apia', 'Tongatapu', 'Rarotonga', 'Hilo', 'Bora Bora', 'Aotearoa', 'Raiatea', 'Nukuʻalofa', 'Papeete', 'Moorea', 'Huahine', "Taha'a", 'Hiva Oa', 'Fatu Hiva', 'Ua Pou', 'Mangareva', 'Tubuai', 'Rurutu', 'Niue', "Vava'u", "Ha'apai", "Savai'i", 'Upolu', 'Tutuila', 'Pago Pago', 'Funafuti', 'Aitutaki', 'Mangaia', 'Atiu', 'Lahaina', 'Kailua-Kona', 'Waipio', 'Hanalei', 'Lihue', 'Rotorua', 'Waitangi'],
      leaders: [
        L('kamehameha', 'Kamehameha', 'King', 'Unification of the Islands', 'Coastal settlements +2 Food and +1 Production; melee units +4 on Coast.', { coastalSettlementYields: { food: 2, production: 1 }, combatBonusCoast: 4 }, { aggression: 0.5, expansion: 0.7, science: 0.4, culture: 0.5 }),
        L('hotu', 'Hotu Matu\'a', 'Ariki', 'Moai', 'Each Wonder yields +3 Culture; settlements on Coast +2 Culture; Monuments +1 Culture.', { culturePerWonder: 3, coastalSettlementYields: { culture: 2 }, buildingBonus: { monument: { culture: 1 } } }, { aggression: 0.3, expansion: 0.6, science: 0.4, culture: 0.8 })
      ] }
  ];
  // Rebuilds the lookup tables; extra civilization files (civs2.js) push into AU.CIVS and call this again.
  AU.indexCivs = function () { AU.CIV_BY_ID = {}; AU.LEADER_BY_ID = {}; AU.CIVS.forEach(function (c) { AU.CIV_BY_ID[c.id] = c; c.leaders.forEach(function (l) { l.civId = c.id; AU.LEADER_BY_ID[l.id] = l; }); }); };
  AU.indexCivs();
  AU.leadersOf = function (civId) { return AU.CIV_BY_ID[civId].leaders; };
})(globalThis.AU = globalThis.AU || {});
