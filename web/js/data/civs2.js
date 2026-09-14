// Additional civilizations (the second batch of 20). Same format as civs.js; pushed into AU.CIVS.
// Extra fields: difficulty ('easy' | 'medium' | 'hard') and bias (preferred start terrain, strongest first).
(function (AU) {
  function L(id, name, title, abName, abDesc, fx, ai) { return { id: id, name: name, title: title, ability: { name: abName, desc: abDesc, fx: fx }, ai: ai }; }
  var MORE = [
    { id: 'carthage', name: 'Carthage', adj: 'Carthaginian', difficulty: 'medium', bias: ['coast', 'desert'], color: '#66023c', color2: '#e6cf9c',
      ability: { name: 'Emporia', desc: 'Coastal settlements +2 Gold. Trade Outposts yield +2 extra Gold. Naval units cost 15% less.', fx: { coastalSettlementYields: { gold: 2 }, specializationYields: { trade: { gold: 2 } }, navalCostMult: 0.85 } },
      uu: { id: 'quinquereme', name: 'Quinquereme', replaces: 'galley', strength: 5, moves: 1, goldOnKill: 30, costMult: 1.15, desc: '+5 Strength, +1 Movement, +30 Gold per kill, costs 15% more' },
      ub: { id: 'cothon', name: 'Cothon', replaces: 'harbor', yields: { gold: 2, production: 3 }, desc: '+2 Gold, +3 Production' },
      cities: ['Carthage', 'Utica', 'Hadrumetum', 'Hippo Regius', 'Leptis Magna', 'Gades', 'Carthago Nova', 'Panormus', 'Lilybaeum', 'Motya', 'Sabratha', 'Oea', 'Thapsus', 'Kerkouane', 'Hippo Diarrhytus', 'Tharros', 'Sulci', 'Caralis', 'Nora', 'Ebusus', 'Malaca', 'Sexi', 'Abdera', 'Tingis', 'Lixus', 'Rusadir', 'Icosium', 'Zama', 'Sicca', 'Thugga', 'Bulla Regia', 'Cirta', 'Theveste', 'Capsa', 'Tacapae', 'Gigthis', 'Meninx', 'Selinus', 'Eryx', 'Olbia'],
      leaders: [
        L('hannibal', 'Hannibal Barca', 'Suffete', 'Crossing the Alps', 'Units can cross Mountains. Cavalry +4 Strength; all units +4 Strength on continents other than your capital\'s.', { mountainsPassable: true, classBonus: { cavalry: 4 }, combatBonusAbroad: 4 }, { aggression: 0.85, expansion: 0.5, science: 0.4, culture: 0.4 }),
        L('dido', 'Dido', 'Queen', 'Byrsa Hide', 'Gain 60 Gold when you found a settlement. Settlers cost 10% less. Coastal settlements +1 Food and +1 Culture.', { foundGold: 60, settlerCostMult: 0.9, coastalSettlementYields: { food: 1, culture: 1 } }, { aggression: 0.3, expansion: 0.9, science: 0.5, culture: 0.6 })
      ] },

    { id: 'byzantium', name: 'Byzantium', adj: 'Byzantine', difficulty: 'medium', bias: ['coast', 'hills'], color: '#4a1259', color2: '#f5c542',
      ability: { name: 'Caesaropapism', desc: '+15% Faith. Settlements following your religion +1 Culture. Units +3 Strength against civilizations of another religion.', fx: { yieldMult: { faith: 1.15 }, culturePerFollowerSettlement: 1, combatBonusVsOtherReligion: 3 } },
      uu: { id: 'dromon', name: 'Dromon', replaces: 'galley', strength: 4, attack: 5, movesAfterAttack: true, costMult: 1.15, desc: '+4 Strength, +5 when attacking (Greek fire), can move after attacking, costs 15% more' },
      ub: { id: 'great_church', name: 'Great Church', replaces: 'shrine', yields: { faith: 3, culture: 1, happiness: 1 }, desc: '+3 Faith, +1 Culture, +1 Happiness' },
      cities: ['Constantinople', 'Thessalonica', 'Nicaea', 'Antioch', 'Trebizond', 'Adrianople', 'Chalcedon', 'Nicomedia', 'Smyrna', 'Ancyra', 'Caesarea Mazaca', 'Iconium', 'Attaleia', 'Amorium', 'Dyrrachium', 'Ohrid', 'Mystras', 'Monemvasia', 'Naupaktos', 'Sinope', 'Amaseia', 'Sebasteia', 'Melitene', 'Edessa', 'Cherson', 'Bari', 'Kastoria', 'Serdica', 'Philippopolis', 'Varna', 'Mesembria', 'Herakleia', 'Cyzicus', 'Prusa', 'Dorylaion', 'Laodicea', 'Philadelphia', 'Side', 'Theodosiopolis', 'Selymbria'],
      leaders: [
        L('justinian', 'Justinian I', 'Basileus', 'Renovatio Imperii', 'Wonders cost 15% less and each yields +2 Culture. Captured settlements keep all their buildings.', { wonderCostMult: 0.85, culturePerWonder: 2, captureKeepBuildings: true }, { aggression: 0.6, expansion: 0.6, science: 0.5, culture: 0.7 }),
        L('theodora', 'Theodora', 'Augusta', 'Purple Shroud', 'Your religion spreads 25% faster. +1 Culture and +1 Happiness in every settlement.', { pressureMult: 1.25, culturePerSettlement: 1, happinessBonus: 1 }, { aggression: 0.3, expansion: 0.5, science: 0.6, culture: 0.9 }),
        L('basil', 'Basil II', 'Bulgar Slayer', 'Bulgaroktonos', 'Units +4 Strength against civilizations of another religion (stacks with Caesaropapism). Units heal +10 in your territory. +80 Gold per captured settlement.', { combatBonusVsOtherReligion: 4, healBonusHome: 10, captureGold: 80 }, { aggression: 0.9, expansion: 0.5, science: 0.3, culture: 0.4 })
      ] },

    { id: 'poland', name: 'Poland', adj: 'Polish', difficulty: 'medium', bias: ['plains', 'forest'], color: '#d63384', color2: '#ffffff',
      ability: { name: 'Antemurale Christianitatis', desc: '+1 Faith per settlement. Units +3 Strength against civilizations of another religion and +4 when defending inside your borders.', fx: { faithPerSettlement: 1, combatBonusVsOtherReligion: 3, homeDefenseBonus: 4 } },
      uu: { id: 'winged_hussar', name: 'Winged Hussar', replaces: 'cavalry', strength: 3, attack: 6, intimidate: 4, flank: 2, costMult: 1.2, desc: '+3 Strength, +6 when attacking, adjacent enemies fight at -4, +2 per adjacent friendly unit, costs 20% more' },
      ub: { id: 'sukiennice', name: 'Sukiennice', replaces: 'market', yields: { gold: 3, culture: 2 }, desc: '+3 Gold, +2 Culture' },
      cities: ['Kraków', 'Warszawa', 'Gniezno', 'Poznań', 'Wrocław', 'Gdańsk', 'Lublin', 'Toruń', 'Łódź', 'Szczecin', 'Płock', 'Sandomierz', 'Kalisz', 'Radom', 'Częstochowa', 'Bydgoszcz', 'Białystok', 'Rzeszów', 'Kielce', 'Opole', 'Katowice', 'Olsztyn', 'Elbląg', 'Legnica', 'Przemyśl', 'Zamość', 'Tarnów', 'Włocławek', 'Łęczyca', 'Sieradz', 'Wieliczka', 'Malbork', 'Grudziądz', 'Chełmno', 'Koszalin', 'Słupsk', 'Gorzów', 'Zielona Góra', 'Nowy Sącz', 'Piotrków'],
      leaders: [
        L('casimir', 'Casimir III', 'The Great', 'Poland of Brick', 'Buildings cost 15% less and Walls cost half. Settlements grow 10% faster.', { buildingCostMult: 0.85, wallsMult: 0.5, growthMult: 1.1 }, { aggression: 0.3, expansion: 0.7, science: 0.6, culture: 0.6 }),
        L('jadwiga', 'Jadwiga', 'King of Poland', 'Apostle Queen', 'Your religion spreads 50% faster and religious units cost 25% less. Start with a free Pantheon.', { pressureMult: 1.5, religiousUnitCostMult: 0.75, freePantheon: true }, { aggression: 0.2, expansion: 0.5, science: 0.6, culture: 0.8 }),
        L('sobieski', 'Jan III Sobieski', 'King', 'Relief of Vienna', 'Cavalry +5 Strength. Units +3 Strength within 3 tiles of your settlements. +5 Faith per kill.', { cavalryBonus: 5, nearHomeBonus: 3, faithFromKills: 5 }, { aggression: 0.75, expansion: 0.5, science: 0.4, culture: 0.5 })
      ] },

    { id: 'sumer', name: 'Sumer', adj: 'Sumerian', difficulty: 'medium', bias: ['river', 'plains'], color: '#c9b27c', color2: '#2f4858',
      ability: { name: 'Cuneiform', desc: 'Worked River tiles yield +1 Science. Gain 10 Science whenever you learn a civic.', fx: { tileBonus: [{ when: 'river', yields: { science: 1 } }], civicScience: 10 } },
      uu: { id: 'war_cart', name: 'War Cart', replaces: 'scout', strength: 8, movesAfterAttack: true, costMult: 1.3, desc: '+8 Strength, can move after attacking, costs 30% more (an onager-drawn battle cart that scouts and raids)' },
      ub: { id: 'edubba', name: 'Edubba', replaces: 'monument', yields: { culture: 1, science: 2 }, desc: '+1 Culture, +2 Science' },
      cities: ['Uruk', 'Ur', 'Eridu', 'Lagash', 'Kish', 'Nippur', 'Umma', 'Larsa', 'Adab', 'Shuruppak', 'Girsu', 'Bad-tibira', 'Sippar', 'Isin', 'Zabalam', 'Kuara', 'Dilbat', 'Marad', 'Kutha', 'Akshak', 'Nina', 'Larak', 'Kisurra', 'Der', 'Eshnunna', 'Tutub', 'Kazallu', 'Awan', 'Mari', 'Borsippa', 'Puzrish-Dagan', 'Urum', 'Apisal', 'Ubaid', 'Jemdet Nasr', 'Khafajah', 'Ishchali', 'Tell Agrab', 'Abu Salabikh', 'Nagar'],
      leaders: [
        L('gilgamesh', 'Gilgamesh', 'Lugal of Uruk', 'Epic of Gilgamesh', 'Units heal +10 everywhere and +5 Strength vs independent raiders. Killing a unit grants +8 Culture.', { healBonusAll: 10, vsIndependents: 5, culturePerKill: 8 }, { aggression: 0.7, expansion: 0.5, science: 0.4, culture: 0.6 }),
        L('urnammu', 'Ur-Nammu', 'King of Ur', 'Code of Ur-Nammu', 'Wonders cost 15% less. +1 Happiness in every settlement and settlements grow 10% faster.', { wonderCostMult: 0.85, happinessBonus: 1, growthMult: 1.1 }, { aggression: 0.3, expansion: 0.6, science: 0.7, culture: 0.7 })
      ] },

    { id: 'hittites', name: 'Hittites', adj: 'Hittite', difficulty: 'medium', bias: ['hills', 'plains'], color: '#556b2f', color2: '#e6d8ad',
      ability: { name: 'Land of Hatti', desc: 'Melee units +2 Strength and cost 15% less. Settlements founded on Hills +1 Production.', fx: { meleeBonus: 2, classCostMult: { melee: 0.85 }, settlementSiteBonus: [{ when: 'hills', yields: { production: 1 } }] } },
      uu: { id: 'three_man_chariot', name: 'Three-Man Chariot', replaces: 'horseman', strength: 3, openBonus: 6, flank: 2, costMult: 1.15, desc: '+3 Strength, +6 on open flat terrain, +2 per adjacent friendly unit, costs 15% more' },
      ub: { id: 'iron_smithy', name: 'Iron Smithy', replaces: 'workshop', yields: { production: 3, science: 1 }, desc: '+3 Production, +1 Science' },
      cities: ['Hattusa', 'Kanesh', 'Tarhuntassa', 'Sapinuwa', 'Sarissa', 'Alaca Höyük', 'Zalpa', 'Nerik', 'Kussara', 'Arinna', 'Ankuwa', 'Kummanni', 'Karkemish', 'Alalakh', 'Ugarit', 'Tuwanuwa', 'Purushanda', 'Hahha', 'Hurma', 'Samuha', 'Tegarama', 'Ishuwa', 'Hakpis', 'Tapikka', 'Kizzuwatna', 'Adaniya', 'Lawazantiya', 'Malatya', 'Kummuh', 'Tarsa', 'Ura', 'Pala', 'Tumanna', 'Wilusa', 'Apasa', 'Nenassa', 'Durmitta', 'Hanhana', 'Katapa', 'Shalatiwara'],
      leaders: [
        L('suppiluliuma', 'Suppiluliuma I', 'Great King', 'Great King of Hatti', 'Captured settlements keep all buildings. Units +4 Strength vs settlements. +15 Gold per kill.', { captureKeepBuildings: true, vsSettlements: 4, goldPerKill: 15 }, { aggression: 0.85, expansion: 0.6, science: 0.4, culture: 0.3 }),
        L('hattusili', 'Hattusili III', 'Great King', 'Treaty of Kadesh', '+1 Happiness per settlement. Units +5 Strength when defending in your borders and heal +10 there. +10 Culture when you learn a technology.', { happinessBonus: 1, homeDefenseBonus: 5, healBonusHome: 10, techCulture: 10 }, { aggression: 0.4, expansion: 0.6, science: 0.6, culture: 0.6 })
      ] },

    { id: 'assyria', name: 'Assyria', adj: 'Assyrian', difficulty: 'hard', bias: ['river', 'plains'], color: '#6b8e23', color2: '#f5e6c8',
      ability: { name: 'Deportation', desc: 'Captured settlements lose no population and grant +40 Science. Siege units +5 Strength vs settlements. -1 Happiness in every settlement.', fx: { captureNoPopLoss: true, captureScience: 40, classBonusVsSettlements: { siege: 5 }, happinessBonus: -1 } },
      uu: { id: 'assyrian_slinger', name: 'Assyrian Slinger', replaces: 'slinger', ranged: 5, strength: 5, range: 1, vsSettlements: 5, costMult: 1.3, desc: '+5 Ranged Strength, +5 Strength, +1 Range, +5 vs settlements, costs 30% more' },
      ub: { id: 'lamassu_gate', name: 'Lamassu Gate', replaces: 'walls', yields: { culture: 2, happiness: 1 }, desc: '+2 Culture, +1 Happiness' },
      cities: ['Assur', 'Nineveh', 'Kalhu', 'Dur-Sharrukin', 'Arbela', 'Harran', 'Imgur-Enlil', 'Kar-Tukulti-Ninurta', 'Tarbisu', 'Ekallatum', 'Shubat-Enlil', 'Guzana', 'Til Barsip', 'Arrapha', 'Nasibina', 'Kilizu', 'Shibaniba', 'Dur-Katlimmu', 'Tushhan', 'Amedi', 'Kurbail', 'Qatna', 'Hadatu', 'Halzi', 'Rasappa', 'Sikan', 'Qattara', 'Idu', 'Apku', 'Shadikanni', 'Nuzi', 'Kalzu', 'Nahur', 'Talmussu', "Sam'al", 'Arzuhina', 'Lahiru', 'Mazamua', 'Hindanu', 'Suhu'],
      leaders: [
        L('ashurbanipal', 'Ashurbanipal', 'King of the Universe', 'Library of Nineveh', 'Captured settlements grant +60 extra Science. Libraries +2 Culture. +10 Culture when you learn a technology.', { captureScience: 60, buildingBonus: { library: { culture: 2 } }, techCulture: 10 }, { aggression: 0.7, expansion: 0.5, science: 0.8, culture: 0.6 }),
        L('tiglath', 'Tiglath-Pileser III', 'King of Assyria', 'Standing Army', 'Units cost 15% less and gain 50% more experience. Siege units +1 Movement.', { unitCostMult: 0.85, xpMult: 1.5, classMoves: { siege: 1 } }, { aggression: 0.95, expansion: 0.6, science: 0.3, culture: 0.2 })
      ] },

    { id: 'nubia', name: 'Nubia', adj: 'Nubian', difficulty: 'medium', bias: ['desert', 'river'], color: '#e2725b', color2: '#2b2b2b',
      ability: { name: 'Ta-Seti', desc: 'Ranged units +2 Strength and cost 15% less. Worked Desert tiles yield +1 Faith.', fx: { classBonus: { ranged: 2 }, classCostMult: { ranged: 0.85 }, tileBonus: [{ when: 'desert', yields: { faith: 1 } }] } },
      uu: { id: 'pitati', name: 'Pitati Archer', replaces: 'archer', ranged: 3, sight: 1, xpMult: 0.5, costMult: 0.85, desc: '+3 Ranged Strength, +1 Sight, +50% experience, 15% cheaper' },
      ub: { id: 'meroitic_temple', name: 'Meroitic Temple', replaces: 'shrine', yields: { faith: 2, culture: 1, happiness: 1 }, desc: '+2 Faith, +1 Culture, +1 Happiness' },
      cities: ['Meroë', 'Napata', 'Kerma', 'Faras', 'Dongola', 'Soba', 'Qustul', 'Buhen', 'Semna', 'Sai', 'Sedeinga', 'Jebel Barkal', 'Kawa', 'Sanam', 'Tabo', 'Musawwarat', 'Naqa', 'Wad ban Naqa', 'Basa', 'Dangeil', 'Amara', 'Kurgus', 'Tombos', 'Kurru', 'Nuri', 'Argo', 'Qasr Ibrim', 'Ballana', 'Kalabsha', 'Dakka', 'Aniba', 'Mirgissa', 'Uronarti', 'Shalfak', 'Askut', 'Kumma', 'Debeira', 'Serra', 'Sesebi', 'Wadi Halfa'],
      leaders: [
        L('amanirenas', 'Amanirenas', 'Kandake', 'One-Eyed Queen', 'Units +6 Strength when defending inside your borders and +4 vs units from another continent. +15 Gold per kill.', { homeDefenseBonus: 6, combatBonusVsInvaders: 4, goldPerKill: 15 }, { aggression: 0.5, expansion: 0.5, science: 0.4, culture: 0.5 }),
        L('piye', 'Piye', 'Pharaoh of Kush', 'Conqueror of Egypt', '+5 Faith per kill. Captured settlements keep their buildings. Units +3 Strength against civilizations that share your religion.', { faithFromKills: 5, captureKeepBuildings: true, combatBonusOwnReligion: 3 }, { aggression: 0.75, expansion: 0.6, science: 0.4, culture: 0.5 })
      ] },

    { id: 'holy_roman_empire', name: 'Holy Roman Empire', adj: 'Imperial', difficulty: 'medium', bias: ['forest', 'river'], color: '#8e7cc3', color2: '#1a1a1a',
      ability: { name: 'Reichstag', desc: '+1 Happiness per Shrine you own. +1 Faith per settlement. Settlements following your religion +1 Science.', fx: { happinessPerShrine: 1, faithPerSettlement: 1, sciencePerFollowerSettlement: 1 } },
      uu: { id: 'genoese_crossbowman', name: 'Genoese Crossbowman', replaces: 'crossbowman', ranged: 3, defense: 4, defVsRanged: 8, costMult: 1.1, desc: '+3 Ranged Strength, +4 defending, +8 defending against ranged attacks (pavise), costs 10% more' },
      ub: { id: 'kaiserpfalz', name: 'Kaiserpfalz', replaces: 'castle', yields: { culture: 2, faith: 1, happiness: 1 }, desc: '+2 Culture, +1 Faith, +1 Happiness' },
      cities: ['Aachen', 'Regensburg', 'Worms', 'Speyer', 'Goslar', 'Augsburg', 'Würzburg', 'Bamberg', 'Ulm', 'Lübeck', 'Bremen', 'Basel', 'Zürich', 'Bern', 'Wetzlar', 'Fulda', 'Erfurt', 'Quedlinburg', 'Paderborn', 'Konstanz', 'Freiburg', 'Passau', 'Eger', 'Metz', 'Besançon', 'Arles', 'Pavia', 'Ingelheim', 'Gelnhausen', 'Kaiserslautern', 'Rothenburg', 'Nördlingen', 'Esslingen', 'Memmingen', 'Kempten', 'Lindau', 'Dinkelsbühl', 'Verdun', 'Cambrai', 'Lucca'],
      leaders: [
        L('charlemagne', 'Charlemagne', 'Emperor of the Romans', 'Carolingian Renaissance', 'Settlements following your religion +1 Culture. Gain 10 Science when you learn a civic and a free Civic when you build your first Library.', { culturePerFollowerSettlement: 1, civicScience: 10, freeCivicOnBuilding: 'library' }, { aggression: 0.6, expansion: 0.7, science: 0.6, culture: 0.7 }),
        L('otto', 'Otto I', 'Holy Roman Emperor', 'Ottonian Church', 'Every new settlement starts with a free Shrine. Your religion spreads 25% faster. Units +4 Strength when defending inside your borders.', { freeBuilding: 'shrine', pressureMult: 1.25, homeDefenseBonus: 4 }, { aggression: 0.5, expansion: 0.6, science: 0.5, culture: 0.6 }),
        L('charles_v', 'Charles V', 'Emperor', 'Plus Ultra', 'Units +3 Strength on continents other than your capital\'s. +1 Gold per settlement. Settlements founded on another continent start with +1 population.', { combatBonusAbroad: 3, goldPerSettlement: 1, abroadFoundPop: 1 }, { aggression: 0.6, expansion: 0.8, science: 0.5, culture: 0.5 })
      ] },

    { id: 'portugal', name: 'Portugal', adj: 'Portuguese', difficulty: 'easy', bias: ['coast'], color: '#7cb518', color2: '#c1121f',
      ability: { name: 'Padrão', desc: 'Naval units +1 Movement and can cross Ocean from the start. Coastal settlements +2 Gold and +1 Faith.', fx: { navalMoves: 1, earlyOcean: true, coastalSettlementYields: { gold: 2, faith: 1 } } },
      uu: { id: 'nau', name: 'Nau', replaces: 'caravel', strength: 3, moves: 1, sight: 2, healAlways: true, costMult: 1.15, desc: '+3 Strength, +1 Movement, +2 Sight, heals every turn even after moving, costs 15% more' },
      ub: { id: 'feitoria', name: 'Feitoria', replaces: 'lighthouse', yields: { gold: 3, food: 1 }, desc: '+3 Gold, +1 Food' },
      cities: ['Lisboa', 'Porto', 'Coimbra', 'Braga', 'Évora', 'Guimarães', 'Faro', 'Setúbal', 'Lagos', 'Sagres', 'Aveiro', 'Viseu', 'Leiria', 'Sintra', 'Tomar', 'Bragança', 'Beja', 'Elvas', 'Funchal', 'Ponta Delgada', 'Angra do Heroísmo', 'Viana do Castelo', 'Santarém', 'Castelo Branco', 'Guarda', 'Portalegre', 'Cascais', 'Tavira', 'Silves', 'Óbidos', 'Batalha', 'Alcobaça', 'Vila Real', 'Chaves', 'Covilhã', 'Figueira da Foz', 'Peniche', 'Nazaré', 'Estremoz', 'Olhão'],
      leaders: [
        L('henry_navigator', 'Henry the Navigator', 'Infante', 'School of Sagres', 'Recon units +1 Sight. Gain 20 Gold whenever you learn a technology. Naval units cost 15% less.', { reconSight: 1, techGold: 20, navalCostMult: 0.85 }, { aggression: 0.2, expansion: 0.8, science: 0.7, culture: 0.5 }),
        L('joao', 'João II', 'The Perfect Prince', 'Treaty of Tordesillas', 'Naval units +4 Strength. Settlements founded on another continent start with +1 population and a free Monument.', { navalBonus: 4, abroadFoundPop: 1, abroadFreeBuilding: 'monument' }, { aggression: 0.5, expansion: 0.9, science: 0.5, culture: 0.5 })
      ] },

    { id: 'netherlands', name: 'Netherlands', adj: 'Dutch', difficulty: 'easy', bias: ['coast', 'marsh'], color: '#ff6a13', color2: '#1e40af',
      ability: { name: 'Polders', desc: 'Worked Coast and Lake tiles yield +1 Food. Towns convert Production to Gold at 120%. Each worked Luxury yields +1 Gold.', fx: { tileBonus: [{ when: 'water', yields: { food: 1 } }], townGoldMult: 1.2, luxuryGold: 1 } },
      uu: { id: 'sea_beggar', name: 'Sea Beggar', replaces: 'caravel', strength: 2, moves: 1, goldOnKill: 30, vsCls: { naval: 5 }, costMult: 1.1, desc: '+2 Strength, +1 Movement, +5 vs naval units, +30 Gold per kill, costs 10% more' },
      ub: { id: 'beurs', name: 'Beurs', replaces: 'bank', yields: { gold: 5, science: 1 }, desc: '+5 Gold, +1 Science' },
      cities: ['Amsterdam', 'Rotterdam', 'Utrecht', 'The Hague', 'Leiden', 'Haarlem', 'Delft', 'Groningen', 'Middelburg', 'Dordrecht', 'Nijmegen', 'Maastricht', 'Eindhoven', 'Arnhem', 'Deventer', 'Zwolle', 'Enkhuizen', 'Hoorn', 'Alkmaar', 'Gouda', 'Breda', "'s-Hertogenbosch", 'Tilburg', 'Leeuwarden', 'Kampen', 'Zutphen', 'Amersfoort', 'Vlissingen', 'Zierikzee', 'Den Helder', 'Apeldoorn', 'Almere', 'Lelystad', 'Roermond', 'Venlo', 'Bergen op Zoom', 'Harlingen', 'Franeker', 'Naarden', 'Edam'],
      leaders: [
        L('william_orange', 'William of Orange', 'Stadtholder', 'Father of the Fatherland', 'Units +5 Strength when defending inside your borders. Coastal settlements +5 defense. +1 Happiness in every settlement.', { homeDefenseBonus: 5, coastalDefense: 5, happinessBonus: 1 }, { aggression: 0.3, expansion: 0.6, science: 0.6, culture: 0.6 }),
        L('dewitt', 'Johan de Witt', 'Grand Pensionary', 'True Freedom', '+10% Gold. Gain 20 Gold whenever you learn a technology. Naval units cost 15% less.', { yieldMult: { gold: 1.1 }, techGold: 20, navalCostMult: 0.85 }, { aggression: 0.2, expansion: 0.7, science: 0.8, culture: 0.5 })
      ] },

    { id: 'sweden', name: 'Sweden', adj: 'Swedish', difficulty: 'easy', bias: ['tundra', 'coast'], color: '#3b7dd8', color2: '#ffd400',
      ability: { name: 'Nobel Prize', desc: '+1 Happiness in every settlement. Gain 10 Culture whenever you learn a technology and 10 Science whenever you learn a civic.', fx: { happinessBonus: 1, techCulture: 10, civicScience: 10 } },
      uu: { id: 'carolean', name: 'Carolean', replaces: 'musketman', strength: 3, attack: 6, terrainBonus: { tundra: 5, snow: 5 }, costMult: 1.1, desc: '+3 Strength, +6 when attacking (gå på), +5 on tundra and snow, costs 10% more' },
      ub: { id: 'folkskola', name: 'Folkskola', replaces: 'library', yields: { science: 2, happiness: 1 }, desc: '+2 Science, +1 Happiness' },
      cities: ['Stockholm', 'Uppsala', 'Sigtuna', 'Birka', 'Gothenburg', 'Malmö', 'Visby', 'Kalmar', 'Lund', 'Örebro', 'Västerås', 'Linköping', 'Norrköping', 'Jönköping', 'Gävle', 'Umeå', 'Luleå', 'Kiruna', 'Sundsvall', 'Karlstad', 'Falun', 'Helsingborg', 'Borås', 'Växjö', 'Nyköping', 'Vadstena', 'Skara', 'Strängnäs', 'Västervik', 'Karlskrona', 'Halmstad', 'Kristianstad', 'Härnösand', 'Östersund', 'Söderköping', 'Eskilstuna', 'Uddevalla', 'Trollhättan', 'Piteå', 'Skellefteå'],
      leaders: [
        L('gustavus', 'Gustavus Adolphus', 'Lion of the North', 'Combined Arms', 'Ranged units +3 Strength and cavalry +3 Strength. Units gain 50% more experience.', { classBonus: { ranged: 3 }, cavalryBonus: 3, xpMult: 1.5 }, { aggression: 0.8, expansion: 0.5, science: 0.5, culture: 0.4 }),
        L('kristina', 'Kristina', 'Queen', 'Minerva of the North', '+10% Science. Each Wonder yields +2 Culture. Universities +2 Culture.', { yieldMult: { science: 1.1 }, culturePerWonder: 2, buildingBonus: { university: { culture: 2 } } }, { aggression: 0.2, expansion: 0.5, science: 0.9, culture: 0.8 })
      ] },

    { id: 'brazil', name: 'Brazil', adj: 'Brazilian', difficulty: 'easy', bias: ['jungle', 'coast'], color: '#00c853', color2: '#ffdf00',
      ability: { name: 'Carnaval', desc: '+10% Culture and +20% Tourism. +1 Happiness in every settlement.', fx: { yieldMult: { culture: 1.1 }, tourismMult: 1.2, happinessBonus: 1 } },
      uu: { id: 'minas_geraes', name: 'Minas Geraes', replaces: 'battleship', strength: 5, ranged: 5, cultureOnKill: 20, costMult: 1.15, desc: '+5 Strength, +5 Ranged Strength, +20 Culture per kill, costs 15% more' },
      ub: { id: 'sambadrome', name: 'Sambadrome', replaces: 'stadium', yields: { happiness: 2, culture: 4 }, desc: '+2 Happiness, +4 Culture' },
      cities: ['Rio de Janeiro', 'São Paulo', 'Salvador', 'Brasília', 'Recife', 'Belo Horizonte', 'Fortaleza', 'Manaus', 'Curitiba', 'Porto Alegre', 'Belém', 'Goiânia', 'Florianópolis', 'Natal', 'São Luís', 'Maceió', 'João Pessoa', 'Vitória', 'Cuiabá', 'Campo Grande', 'Teresina', 'Aracaju', 'Ouro Preto', 'Olinda', 'Santos', 'Campinas', 'Niterói', 'Petrópolis', 'Paraty', 'Diamantina', 'Porto Seguro', 'Ilhéus', 'Macapá', 'Boa Vista', 'Palmas', 'Porto Velho', 'Rio Branco', 'Londrina', 'Joinville', 'Pelotas'],
      leaders: [
        L('pedro', 'Pedro II', 'Emperor', 'The Magnanimous', 'Universities +2 Culture. Gain 10 Culture whenever you learn a technology. +1 Happiness in every settlement.', { buildingBonus: { university: { culture: 2 } }, techCulture: 10, happinessBonus: 1 }, { aggression: 0.2, expansion: 0.6, science: 0.8, culture: 0.8 }),
        L('vargas', 'Getúlio Vargas', 'President', 'Estado Novo', '+10% Production in Cities. Towns convert Production to Gold at 120%. Units cost 10% less.', { cityYieldMult: { production: 1.1 }, townGoldMult: 1.2, unitCostMult: 0.9 }, { aggression: 0.5, expansion: 0.7, science: 0.6, culture: 0.5 })
      ] },

    { id: 'khmer', name: 'Khmer', adj: 'Khmer', difficulty: 'hard', bias: ['river', 'jungle'], color: '#a67c52', color2: '#0b3d2e',
      ability: { name: 'Devaraja', desc: 'Settlements founded on a river +2 Faith and +1 Culture. Worked River tiles +1 Food. Units +2 Strength against civilizations that share your religion.', fx: { settlementSiteBonus: [{ when: 'river', yields: { faith: 2, culture: 1 } }], tileBonus: [{ when: 'river', yields: { food: 1 } }], combatBonusOwnReligion: 2 } },
      uu: { id: 'domrey', name: 'Domrey', replaces: 'catapult', strength: 6, ranged: 3, moves: 1, costMult: 1.2, desc: '+6 Strength, +3 Ranged Strength, +1 Movement (a ballista carried on an elephant), costs 20% more' },
      ub: { id: 'baray', name: 'Baray', replaces: 'aqueduct', yields: { food: 3, faith: 1, happiness: 1 }, desc: '+3 Food, +1 Faith, +1 Happiness' },
      cities: ['Yasodharapura', 'Hariharalaya', 'Indrapura', 'Isanapura', 'Lingapura', 'Banteay Chhmar', 'Preah Khan', 'Phimai', 'Lavo', 'Vyadhapura', 'Angkor Borei', 'Oudong', 'Longvek', 'Phnom Penh', 'Battambang', 'Siem Reap', 'Kampot', 'Kratie', 'Stung Treng', 'Kampong Cham', 'Kampong Thom', 'Takeo', 'Prey Veng', 'Svay Rieng', 'Pursat', 'Kampong Chhnang', 'Sisophon', 'Poipet', 'Sihanoukville', 'Koh Kong', 'Pailin', 'Kep', 'Preah Vihear', 'Beng Mealea', 'Banteay Srei', 'Wat Phu', 'Sdok Kok Thom', 'Phanom Rung', 'Muang Tam', 'Bakong'],
      leaders: [
        L('jayavarman', 'Jayavarman VII', 'Devaraja', 'Bayon', 'Each Wonder yields +2 Faith. Wonders cost 10% less. +1 Happiness in every settlement.', { faithPerWonder: 2, wonderCostMult: 0.9, happinessBonus: 1 }, { aggression: 0.4, expansion: 0.5, science: 0.5, culture: 0.8 }),
        L('suryavarman', 'Suryavarman II', 'Devaraja', 'Angkor Wat', 'Your religion spreads 30% faster. Settlements following your religion +1 Culture. Units +3 Strength against civilizations that share your religion (stacks with Devaraja).', { pressureMult: 1.3, culturePerFollowerSettlement: 1, combatBonusOwnReligion: 3 }, { aggression: 0.7, expansion: 0.6, science: 0.4, culture: 0.6 })
      ] },

    { id: 'siam', name: 'Siam', adj: 'Siamese', difficulty: 'medium', bias: ['river', 'jungle'], color: '#1cb5b5', color2: '#ffd700',
      ability: { name: 'Mandala', desc: 'Specialized Towns yield +1 Gold and +1 Culture. Each worked Luxury gives +1 extra Happiness.', fx: { specializedTownYields: { gold: 1, culture: 1 }, luxuryHappinessBonus: 1 } },
      uu: { id: 'wild_tiger', name: 'Wild Tiger Corps', replaces: 'infantry', strength: 5, forestMove: true, terrainBonus: { jungle: 5 }, costMult: 1.1, desc: '+5 Strength, forest and jungle cost no extra movement, +5 in jungle, costs 10% more' },
      ub: { id: 'wat', name: 'Wat', replaces: 'amphitheater', yields: { culture: 2, faith: 2 }, desc: '+2 Culture, +2 Faith' },
      cities: ['Ayutthaya', 'Sukhothai', 'Bangkok', 'Thonburi', 'Chiang Mai', 'Nakhon Si Thammarat', 'Phitsanulok', 'Si Satchanalai', 'Kamphaeng Phet', 'Nakhon Ratchasima', 'Ubon Ratchathani', 'Chanthaburi', 'Songkhla', 'Phuket', 'Ratchaburi', 'Kanchanaburi', 'Nakhon Pathom', 'Suphan Buri', 'Chiang Rai', 'Lampang', 'Lamphun', 'Nan', 'Phrae', 'Tak', 'Uttaradit', 'Nakhon Sawan', 'Chai Nat', 'Sing Buri', 'Ang Thong', 'Saraburi', 'Prachuap Khiri Khan', 'Chumphon', 'Surat Thani', 'Trang', 'Pattani', 'Yala', 'Khon Kaen', 'Udon Thani', 'Roi Et', 'Nong Khai'],
      leaders: [
        L('ramkhamhaeng', 'Ramkhamhaeng', 'King of Sukhothai', 'Thai Script', 'Gain 15 Culture whenever you learn a technology. +1 Culture and +1 Happiness in every settlement.', { techCulture: 15, culturePerSettlement: 1, happinessBonus: 1 }, { aggression: 0.3, expansion: 0.6, science: 0.6, culture: 0.8 }),
        L('naresuan', 'Naresuan', 'King of Ayutthaya', 'Elephant Duel', 'Cavalry +4 Strength. Units +5 Strength when defending inside your borders. +10 Gold per kill.', { cavalryBonus: 4, homeDefenseBonus: 5, goldPerKill: 10 }, { aggression: 0.7, expansion: 0.5, science: 0.4, culture: 0.5 })
      ] },

    { id: 'austria_hungary', name: 'Austria-Hungary', adj: 'Austro-Hungarian', difficulty: 'easy', bias: ['plains', 'river'], color: '#000000', color2: '#ffd700',
      ability: { name: 'Ausgleich', desc: '+1 Culture and +1 Happiness in every settlement. Captured settlements gain +2 extra Happiness.', fx: { culturePerSettlement: 1, happinessBonus: 1, capturedHappiness: 2 } },
      uu: { id: 'kuk_field_gun', name: 'k.u.k. Field Gun', replaces: 'field_cannon', ranged: 5, moves: 1, defense: 4, vsSettlements: 5, costMult: 1.15, desc: '+5 Ranged Strength, +1 Movement, +4 defending, +5 vs settlements, costs 15% more' },
      ub: { id: 'theresian_academy', name: 'Theresian Academy', replaces: 'military_academy', yields: { production: 2, science: 2 }, unitStrength: 1, desc: '+2 Production, +2 Science, units built here +1 extra Strength' },
      cities: ['Vienna', 'Budapest', 'Prague', 'Trieste', 'Kraków', 'Lemberg', 'Zagreb', 'Sarajevo', 'Innsbruck', 'Graz', 'Linz', 'Salzburg', 'Brno', 'Pressburg', 'Ljubljana', 'Czernowitz', 'Debrecen', 'Szeged', 'Klagenfurt', 'Temesvár', 'Pécs', 'Fiume', 'Pola', 'Görz', 'Bozen', 'Trento', 'Olmütz', 'Troppau', 'Teschen', 'Przemyśl', 'Tarnów', 'Kaschau', 'Klausenburg', 'Hermannstadt', 'Kronstadt', 'Zara', 'Spalato', 'Ragusa', 'Mostar', 'Miskolc'],
      leaders: [
        L('franz_joseph', 'Franz Joseph I', 'Emperor-King', 'Ringstraße', 'Each Wonder yields +2 Culture. Buildings cost 10% less. +1 Happiness in every settlement.', { culturePerWonder: 2, buildingCostMult: 0.9, happinessBonus: 1 }, { aggression: 0.4, expansion: 0.6, science: 0.5, culture: 0.8 }),
        L('maria_theresa', 'Maria Theresa', 'Empress', 'Theresian Reforms', 'Settlements grow 15% faster. Libraries +1 Science. Units gain 25% more experience.', { growthMult: 1.15, buildingBonus: { library: { science: 1 } }, xpMult: 1.25 }, { aggression: 0.4, expansion: 0.6, science: 0.7, culture: 0.6 }),
        L('sisi', 'Elisabeth', 'Empress', 'Queen of Hungary', '+20% Tourism. Each worked Luxury yields +1 Culture. +1 Happiness in every settlement.', { tourismMult: 1.2, luxuryCulture: 1, happinessBonus: 1 }, { aggression: 0.2, expansion: 0.5, science: 0.5, culture: 0.9 })
      ] },

    { id: 'scotland', name: 'Scotland', adj: 'Scottish', difficulty: 'medium', bias: ['hills', 'coast'], color: '#4b4bcf', color2: '#f0f0f0',
      ability: { name: 'Scottish Enlightenment', desc: 'Settlements founded on Hills +1 Science. Universities +2 Science. Units +5 Strength when defending on Hills.', fx: { settlementSiteBonus: [{ when: 'hills', yields: { science: 1 } }], buildingBonus: { university: { science: 2 } }, hillsDefenseBonus: 5 } },
      uu: { id: 'highlander', name: 'Highlander', replaces: 'rifleman', strength: 3, roughBonus: 6, ignoreHills: true, costMult: 1.1, desc: '+3 Strength, +6 on hills, forest and jungle, hills cost no extra movement, costs 10% more' },
      ub: { id: 'distillery', name: 'Distillery', replaces: 'granary', yields: { food: 1, gold: 2, happiness: 1 }, desc: '+1 Food, +2 Gold, +1 Happiness' },
      cities: ['Edinburgh', 'Glasgow', 'Scone', 'Stirling', 'Perth', 'Dundee', 'Aberdeen', 'Inverness', 'St Andrews', 'Dunfermline', 'Dumfries', 'Ayr', 'Elgin', 'Kirkwall', 'Lerwick', 'Fort William', 'Oban', 'Falkirk', 'Paisley', 'Kilmarnock', 'Dumbarton', 'Arbroath', 'Montrose', 'Forfar', 'Linlithgow', 'Haddington', 'Berwick', 'Jedburgh', 'Kelso', 'Melrose', 'Peebles', 'Lanark', 'Hamilton', 'Greenock', 'Stornoway', 'Wick', 'Thurso', 'Dornoch', 'Nairn', 'Banff'],
      leaders: [
        L('bruce', 'Robert the Bruce', 'King of Scots', 'Bannockburn', 'Anti-cavalry units +4 Strength. Units +6 Strength when defending inside your borders and heal +10 there.', { classBonus: { antcav: 4 }, homeDefenseBonus: 6, healBonusHome: 10 }, { aggression: 0.5, expansion: 0.5, science: 0.4, culture: 0.5 }),
        L('james_iv', 'James IV', 'King of Scots', 'Flower of Scotland', 'Naval units cost 15% less. Gain 20 Gold whenever you learn a technology. +1 Culture per settlement.', { navalCostMult: 0.85, techGold: 20, culturePerSettlement: 1 }, { aggression: 0.4, expansion: 0.6, science: 0.8, culture: 0.7 })
      ] },

    { id: 'kongo', name: 'Kongo', adj: 'Kongolese', difficulty: 'hard', bias: ['jungle', 'river'], color: '#f4a261', color2: '#264653',
      ability: { name: 'Mbanza', desc: 'Worked Rainforest and Marsh tiles yield +1 Food and +1 Culture. Settlements following your religion +1 Gold. Each worked Luxury yields +1 Culture.', fx: { tileBonus: [{ when: 'jungle', yields: { food: 1, culture: 1 } }], goldPerFollowerSettlement: 1, luxuryCulture: 1 } },
      uu: { id: 'ngao_mbebe', name: 'Ngao Mbebe', replaces: 'spearman', strength: 2, defVsRanged: 6, terrainBonus: { jungle: 5 }, costMult: 1.05, desc: '+2 Strength, +6 defending against ranged attacks (great shield), +5 in jungle, costs 5% more' },
      ub: { id: 'lumbu', name: 'Lumbu', replaces: 'monument', yields: { culture: 1, food: 1, happiness: 1 }, desc: '+1 Culture, +1 Food, +1 Happiness' },
      cities: ['Mbanza Kongo', 'Mbanza Mbata', 'Mbanza Nsundi', 'Mbanza Mpangu', 'Mbanza Mpemba', 'Mbanza Soyo', 'Mbanza Wembo', 'Mbanza Mbamba', 'Kabasa', 'Matamba', 'Loango', 'Mpinda', 'Ngoyo', 'Kakongo', 'Cabinda', 'Nkusu', 'Wandu', 'Nkondo', 'Mbwila', 'Kinsundi', 'Bumbu', 'Ndembo', 'Zombo', 'Kibangu', 'Lemba', 'Mbula', 'Kongo dia Nlaza', 'Mbanza Nkanda', 'Vunda', 'Mpangala', 'Kinkanga', 'Mukondo', 'Noki', 'Boma', 'Matadi', 'Songololo', 'Kimpese', 'Mbanza-Ngungu', 'Malanza', 'Mpumbu'],
      leaders: [
        L('nzinga', 'Nzinga Mbande', 'Ngola', 'Queen of Matamba', 'Units +5 Strength vs units from another continent and +4 in Rainforest and Marsh. Units heal +10 in your territory.', { combatBonusVsInvaders: 5, combatBonusJungle: 4, healBonusHome: 10 }, { aggression: 0.6, expansion: 0.5, science: 0.4, culture: 0.5 }),
        L('afonso', 'Afonso I', 'Manikongo', 'Apostle of Kongo', 'Your religion spreads 50% faster. Settlements following your religion +1 Science. Every settlement gets a free Shrine once Mysticism is known.', { pressureMult: 1.5, sciencePerFollowerSettlement: 1, freeBuildingWithTech: { shrine: 'mysticism' } }, { aggression: 0.3, expansion: 0.6, science: 0.7, culture: 0.7 })
      ] },

    { id: 'mapuche', name: 'Mapuche', adj: 'Mapuche', difficulty: 'hard', bias: ['hills', 'forest'], color: '#b5838d', color2: '#0b3954',
      ability: { name: 'Toqui', desc: 'Units +5 Strength when defending inside your borders and +4 vs units from another continent. Killing a unit grants +6 Culture.', fx: { homeDefenseBonus: 5, combatBonusVsInvaders: 4, culturePerKill: 6 } },
      uu: { id: 'malon_raider', name: 'Malón Raider', replaces: 'horseman', strength: 2, goldOnKill: 25, movesAfterAttack: true, ignoreHills: true, costMult: 1.15, desc: '+2 Strength, can move after attacking, hills cost no extra movement, +25 Gold per kill, costs 15% more' },
      ub: { id: 'pukara', name: 'Pukara', replaces: 'walls', yields: { production: 2, faith: 1 }, desc: '+2 Production, +1 Faith' },
      cities: ['Arauco', 'Tucapel', 'Purén', 'Angol', 'Cañete', 'Lumaco', 'Villarrica', 'Temuco', 'Lebu', 'Tirúa', 'Collipulli', 'Traiguén', 'Boroa', 'Imperial', 'Toltén', 'Pitrufquén', 'Curacautín', 'Lonquimay', 'Carahue', 'Pucón', 'Panguipulli', 'Chol Chol', 'Freire', 'Cunco', 'Melipeuco', 'Vilcún', 'Curarrehue', 'Loncoche', 'Gorbea', 'Mariquina', 'Lanco', 'Máfil', 'Paillaco', 'Futrono', 'Osorno', 'Puerto Saavedra', 'Quilacahuín', 'Mulchén', 'Nacimiento', 'Los Sauces'],
      leaders: [
        L('lautaro', 'Lautaro', 'Toqui', 'Ambush at Tucapel', 'Units +6 Strength in Forest and Rainforest. Units heal +10 in your territory and gain 50% more experience.', { combatBonusForest: 6, healBonusHome: 10, xpMult: 1.5 }, { aggression: 0.7, expansion: 0.4, science: 0.3, culture: 0.5 }),
        L('galvarino', 'Galvarino', 'Weichafe', 'Blades for Hands', 'Melee units +5 Strength when attacking. Units fight at full strength no matter how damaged. Killing a unit grants +6 extra Culture.', { meleeAttackBonus: 5, noDamagePenalty: true, culturePerKill: 6 }, { aggression: 0.9, expansion: 0.4, science: 0.2, culture: 0.4 })
      ] },

    { id: 'australia', name: 'Australia', adj: 'Australian', difficulty: 'hard', bias: ['coast', 'desert'], color: '#79b473', color2: '#2b2118',
      ability: { name: 'Land of Plenty', desc: 'Coastal settlements +1 Production and +1 Science. Worked Pastures +1 Production. Units +3 Strength on continents other than your capital\'s.', fx: { coastalSettlementYields: { production: 1, science: 1 }, tileBonus: [{ when: 'pasture', yields: { production: 1 } }], combatBonusAbroad: 3 } },
      uu: { id: 'light_horse', name: 'Light Horse', replaces: 'cavalry', strength: 3, moves: 1, terrainBonus: { desert: 6 }, costMult: 1.1, desc: '+3 Strength, +1 Movement, +6 on desert, costs 10% more' },
      ub: { id: 'outback_station', name: 'Outback Station', replaces: 'railway_station', yields: { production: 2, gold: 2, food: 2 }, desc: '+2 Production, +2 Gold, +2 Food' },
      cities: ['Canberra', 'Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Hobart', 'Darwin', 'Newcastle', 'Wollongong', 'Geelong', 'Gold Coast', 'Cairns', 'Townsville', 'Toowoomba', 'Ballarat', 'Bendigo', 'Launceston', 'Alice Springs', 'Broken Hill', 'Kalgoorlie', 'Albany', 'Fremantle', 'Mackay', 'Rockhampton', 'Bundaberg', 'Dubbo', 'Wagga Wagga', 'Albury', 'Tamworth', 'Port Augusta', 'Mount Gambier', 'Broome', 'Port Hedland', 'Coffs Harbour', 'Bathurst', 'Orange', 'Mildura', 'Shepparton', 'Devonport'],
      leaders: [
        L('curtin', 'John Curtin', 'Prime Minister', 'Home Front', 'Units +5 Strength when defending inside your borders and heal +10 there. Units cost 10% less.', { homeDefenseBonus: 5, healBonusHome: 10, unitCostMult: 0.9 }, { aggression: 0.4, expansion: 0.5, science: 0.6, culture: 0.5 }),
        L('menzies', 'Robert Menzies', 'Prime Minister', 'The Forgotten People', '+1 Happiness in every settlement. Universities +2 Science. Settlements grow 10% faster.', { happinessBonus: 1, buildingBonus: { university: { science: 2 } }, growthMult: 1.1 }, { aggression: 0.2, expansion: 0.6, science: 0.8, culture: 0.6 })
      ] },

    { id: 'georgia', name: 'Georgia', adj: 'Georgian', difficulty: 'hard', bias: ['hills', 'mountain'], color: '#ff4d6d', color2: '#ffffff',
      ability: { name: 'Kartvelian Fastness', desc: 'Settlements founded on Hills +1 Faith and +1 Culture. Walls cost half. Units +3 Strength against civilizations that share your religion.', fx: { settlementSiteBonus: [{ when: 'hills', yields: { faith: 1, culture: 1 } }], wallsMult: 0.5, combatBonusOwnReligion: 3 } },
      uu: { id: 'monaspa', name: 'Monaspa', replaces: 'knight', strength: 3, defense: 4, homeBonus: 5, costMult: 1.1, desc: '+3 Strength, +4 defending, +5 inside your borders, costs 10% more' },
      ub: { id: 'tsikhe_church', name: 'Tsikhe Church', replaces: 'shrine', yields: { faith: 2, culture: 2 }, desc: '+2 Faith, +2 Culture' },
      cities: ['Tbilisi', 'Kutaisi', 'Mtskheta', 'Batumi', 'Gori', 'Telavi', 'Rustavi', 'Poti', 'Sukhumi', 'Zugdidi', 'Akhaltsikhe', 'Vardzia', 'Gelati', 'Uplistsikhe', 'Sighnaghi', 'Kvareli', 'Dmanisi', 'Bolnisi', 'Tskhinvali', 'Ozurgeti', 'Senaki', 'Samtredia', 'Khashuri', 'Borjomi', 'Kaspi', 'Gurjaani', 'Lagodekhi', 'Dedoplistskaro', 'Marneuli', 'Gardabani', 'Tianeti', 'Dusheti', 'Stepantsminda', 'Mestia', 'Oni', 'Ambrolauri', 'Chiatura', 'Zestafoni', 'Tkibuli', 'Kobuleti'],
      leaders: [
        L('tamar', 'Tamar', 'King of Kings', 'Golden Age of Georgia', 'Settlements following your religion +1 Culture. +1 Faith and +1 Happiness in every settlement.', { culturePerFollowerSettlement: 1, faithPerSettlement: 1, happinessBonus: 1 }, { aggression: 0.3, expansion: 0.6, science: 0.5, culture: 0.9 }),
        L('david_builder', 'David IV', 'The Builder', 'Didgori', 'Units +5 Strength vs units from another continent and gain 50% more experience. Buildings cost 10% less.', { combatBonusVsInvaders: 5, xpMult: 1.5, buildingCostMult: 0.9 }, { aggression: 0.6, expansion: 0.6, science: 0.5, culture: 0.6 })
      ] }
  ];
  MORE.forEach(function (c) { AU.CIVS.push(c); });
  AU.indexCivs();
})(globalThis.AU = globalThis.AU || {});
