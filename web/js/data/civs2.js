// Additional empires (the second batch of 20). Same format as civs.js; pushed into AU.CIVS.
// Extra fields: difficulty ('easy' | 'medium' | 'hard') and bias (preferred start terrain, strongest first).
(function (AU) {
  function L(id, name, title, abName, abDesc, fx, ai) { return { id: id, name: name, title: title, ability: { name: abName, desc: abDesc, fx: fx }, ai: ai }; }
  var MORE = [
    { id: 'austria_hungary', name: 'Austria-Hungary', adj: 'Austro-Hungarian', difficulty: 'easy', bias: ['plains', 'river'], color: '#000000', color2: '#ffd700',
      ability: { name: 'Ausgleich', desc: '+1 Heritage and +1 Happiness in every settlement. Captured settlements gain +2 extra Happiness.', fx: { culturePerSettlement: 1, happinessBonus: 1, capturedHappiness: 2 } },
      uu: { id: 'kuk_field_gun', name: 'k.u.k. Field Gun', replaces: 'field_cannon', ranged: 5, moves: 1, defense: 4, vsSettlements: 5, costMult: 1.15, desc: '+5 Ranged Strength, +1 Movement, +4 defending, +5 vs settlements, costs 15% more' },
      ub: { id: 'theresian_academy', name: 'Theresian Academy', replaces: 'military_academy', yields: { production: 2, science: 2 }, unitStrength: 1, desc: '+2 Production, +2 Knowledge, units built here +1 extra Strength' },
      cities: ['Vienna', 'Budapest', 'Prague', 'Trieste', 'Kraków', 'Lemberg', 'Zagreb', 'Sarajevo', 'Innsbruck', 'Graz', 'Linz', 'Salzburg', 'Brno', 'Pressburg', 'Ljubljana', 'Czernowitz', 'Debrecen', 'Szeged', 'Klagenfurt', 'Temesvár', 'Pécs', 'Fiume', 'Pola', 'Görz', 'Bozen', 'Trento', 'Olmütz', 'Troppau', 'Teschen', 'Przemyśl', 'Tarnów', 'Kaschau', 'Klausenburg', 'Hermannstadt', 'Kronstadt', 'Zara', 'Spalato', 'Ragusa', 'Mostar', 'Miskolc'],
      leaders: [
        L('franz_joseph', 'Franz Joseph I', 'Emperor-King', 'Ringstraße', 'Each Wonder yields +2 Heritage. Buildings cost 10% less. +1 Happiness in every settlement.', { culturePerWonder: 2, buildingCostMult: 0.9, happinessBonus: 1 }, { aggression: 0.4, expansion: 0.6, science: 0.5, culture: 0.8 }),
        L('maria_theresa', 'Maria Theresa', 'Empress', 'Theresian Reforms', 'Settlements grow 15% faster. Libraries +1 Knowledge. Units gain 25% more experience.', { growthMult: 1.15, buildingBonus: { library: { science: 1 } }, xpMult: 1.25 }, { aggression: 0.4, expansion: 0.6, science: 0.7, culture: 0.6 }),
        L('sisi', 'Elisabeth', 'Empress', 'Queen of Hungary', '+20% Fame. Each worked Luxury yields +1 Heritage. +1 Happiness in every settlement.', { tourismMult: 1.2, luxuryCulture: 1, happinessBonus: 1 }, { aggression: 0.2, expansion: 0.5, science: 0.5, culture: 0.9 })
      ] },,

    { id: 'carthage', name: 'Carthage', adj: 'Carthaginian', difficulty: 'medium', bias: ['coast', 'desert'], color: '#66023c', color2: '#e6cf9c',
      ability: { name: 'Emporia', desc: 'Coastal settlements +2 Gold. Trade Outposts yield +2 extra Gold. Naval units cost 15% less.', fx: { coastalSettlementYields: { gold: 2 }, specializationYields: { trade: { gold: 2 } }, navalCostMult: 0.85 } },
      uu: { id: 'quinquereme', name: 'Quinquereme', replaces: 'galley', strength: 5, moves: 1, goldOnKill: 30, costMult: 1.15, desc: '+5 Strength, +1 Movement, +30 Gold per kill, costs 15% more' },
      ub: { id: 'cothon', name: 'Cothon', replaces: 'harbor', yields: { gold: 2, production: 3 }, desc: '+2 Gold, +3 Production' },
      cities: ['Carthage', 'Utica', 'Hadrumetum', 'Hippo Regius', 'Leptis Magna', 'Gades', 'Carthago Nova', 'Panormus', 'Lilybaeum', 'Motya', 'Sabratha', 'Oea', 'Thapsus', 'Kerkouane', 'Hippo Diarrhytus', 'Tharros', 'Sulci', 'Caralis', 'Nora', 'Ebusus', 'Malaca', 'Sexi', 'Abdera', 'Tingis', 'Lixus', 'Rusadir', 'Icosium', 'Zama', 'Sicca', 'Thugga', 'Bulla Regia', 'Cirta', 'Theveste', 'Capsa', 'Tacapae', 'Gigthis', 'Meninx', 'Selinus', 'Eryx', 'Olbia'],
      leaders: [
        L('hannibal', 'Hannibal Barca', 'Suffete', 'Crossing the Alps', 'Units can cross Mountains. Cavalry +4 Strength; all units +4 Strength on continents other than your capital\'s.', { mountainsPassable: true, classBonus: { cavalry: 4 }, combatBonusAbroad: 4 }, { aggression: 0.85, expansion: 0.5, science: 0.4, culture: 0.4 }),
        L('dido', 'Dido', 'Queen', 'Byrsa Hide', 'Gain 60 Gold when you found a settlement. Pioneers cost 10% less. Coastal settlements +1 Food and +1 Heritage.', { foundGold: 60, settlerCostMult: 0.9, coastalSettlementYields: { food: 1, culture: 1 } }, { aggression: 0.3, expansion: 0.9, science: 0.5, culture: 0.6 })
      ] },

    { id: 'byzantium', name: 'Byzantium', adj: 'Byzantine', difficulty: 'medium', bias: ['coast', 'hills'], color: '#4a1259', color2: '#f5c542',
      ability: { name: 'Caesaropapism', desc: '+15% Devotion. Settlements following your religion +1 Heritage. Units +3 Strength against empires of another religion.', fx: { yieldMult: { faith: 1.15 }, culturePerFollowerSettlement: 1, combatBonusVsOtherReligion: 3 } },
      uu: { id: 'dromon', name: 'Dromon', replaces: 'galley', strength: 4, attack: 5, movesAfterAttack: true, costMult: 1.15, desc: '+4 Strength, +5 when attacking (Greek fire), can move after attacking, costs 15% more' },
      ub: { id: 'great_church', name: 'Great Church', replaces: 'shrine', yields: { faith: 3, culture: 1, happiness: 1 }, desc: '+3 Devotion, +1 Heritage, +1 Happiness' },
      cities: ['Constantinople', 'Thessalonica', 'Nicaea', 'Antioch', 'Trebizond', 'Adrianople', 'Chalcedon', 'Nicomedia', 'Smyrna', 'Ancyra', 'Caesarea Mazaca', 'Iconium', 'Attaleia', 'Amorium', 'Dyrrachium', 'Ohrid', 'Mystras', 'Monemvasia', 'Naupaktos', 'Sinope', 'Amaseia', 'Sebasteia', 'Melitene', 'Edessa', 'Cherson', 'Bari', 'Kastoria', 'Serdica', 'Philippopolis', 'Varna', 'Mesembria', 'Herakleia', 'Cyzicus', 'Prusa', 'Dorylaion', 'Laodicea', 'Philadelphia', 'Side', 'Theodosiopolis', 'Selymbria'],
      leaders: [
        L('justinian', 'Justinian I', 'Basileus', 'Renovatio Imperii', 'Wonders cost 15% less and each yields +2 Heritage. Captured settlements keep all their buildings.', { wonderCostMult: 0.85, culturePerWonder: 2, captureKeepBuildings: true }, { aggression: 0.6, expansion: 0.6, science: 0.5, culture: 0.7 }),
        L('theodora', 'Theodora', 'Augusta', 'Purple Shroud', 'Your religion spreads 25% faster. +1 Heritage and +1 Happiness in every settlement.', { pressureMult: 1.25, culturePerSettlement: 1, happinessBonus: 1 }, { aggression: 0.3, expansion: 0.5, science: 0.6, culture: 0.9 }),
        L('basil', 'Basil II', 'Bulgar Slayer', 'Bulgaroktonos', 'Units +4 Strength against empires of another religion (stacks with Caesaropapism). Units heal +10 in your territory. +80 Gold per captured settlement.', { combatBonusVsOtherReligion: 4, healBonusHome: 10, captureGold: 80 }, { aggression: 0.9, expansion: 0.5, science: 0.3, culture: 0.4 })
      ] },

    { id: 'poland', name: 'Poland', adj: 'Polish', difficulty: 'medium', bias: ['plains', 'forest'], color: '#d63384', color2: '#ffffff',
      ability: { name: 'Antemurale Christianitatis', desc: '+1 Devotion per settlement. Units +3 Strength against empires of another religion and +4 when defending inside your borders.', fx: { faithPerSettlement: 1, combatBonusVsOtherReligion: 3, homeDefenseBonus: 4 } },
      uu: { id: 'winged_hussar', name: 'Winged Hussar', replaces: 'cavalry', strength: 3, attack: 6, intimidate: 4, flank: 2, costMult: 1.2, desc: '+3 Strength, +6 when attacking, adjacent enemies fight at -4, +2 per adjacent friendly unit, costs 20% more' },
      ub: { id: 'sukiennice', name: 'Sukiennice', replaces: 'market', yields: { gold: 3, culture: 2 }, desc: '+3 Gold, +2 Heritage' },
      cities: ['Kraków', 'Warszawa', 'Gniezno', 'Poznań', 'Wrocław', 'Gdańsk', 'Lublin', 'Toruń', 'Łódź', 'Szczecin', 'Płock', 'Sandomierz', 'Kalisz', 'Radom', 'Częstochowa', 'Bydgoszcz', 'Białystok', 'Rzeszów', 'Kielce', 'Opole', 'Katowice', 'Olsztyn', 'Elbląg', 'Legnica', 'Przemyśl', 'Zamość', 'Tarnów', 'Włocławek', 'Łęczyca', 'Sieradz', 'Wieliczka', 'Malbork', 'Grudziądz', 'Chełmno', 'Koszalin', 'Słupsk', 'Gorzów', 'Zielona Góra', 'Nowy Sącz', 'Piotrków'],
      leaders: [
        L('casimir', 'Casimir III', 'The Great', 'Poland of Brick', 'Buildings cost 15% less and Walls cost half. Settlements grow 10% faster.', { buildingCostMult: 0.85, wallsMult: 0.5, growthMult: 1.1 }, { aggression: 0.3, expansion: 0.7, science: 0.6, culture: 0.6 }),
        L('jadwiga', 'Jadwiga', 'King of Poland', 'Evangelist Queen', 'Your religion spreads 50% faster and religious units cost 25% less. Start with a free Pantheon.', { pressureMult: 1.5, religiousUnitCostMult: 0.75, freePantheon: true }, { aggression: 0.2, expansion: 0.5, science: 0.6, culture: 0.8 }),
        L('sobieski', 'Jan III Sobieski', 'King', 'Relief of Vienna', 'Cavalry +5 Strength. Units +3 Strength within 3 tiles of your settlements. +5 Devotion per kill.', { cavalryBonus: 5, nearHomeBonus: 3, faithFromKills: 5 }, { aggression: 0.75, expansion: 0.5, science: 0.4, culture: 0.5 })
      ] },

    { id: 'assyria', name: 'Assyria', adj: 'Assyrian', difficulty: 'hard', bias: ['river', 'plains'], color: '#6b8e23', color2: '#f5e6c8',
      ability: { name: 'Deportation', desc: 'Captured settlements lose no population and grant +40 Knowledge. Siege units +5 Strength vs settlements. -1 Happiness in every settlement.', fx: { captureNoPopLoss: true, captureScience: 40, classBonusVsSettlements: { siege: 5 }, happinessBonus: -1 } },
      uu: { id: 'assyrian_slinger', name: 'Assyrian Sling Hunter', replaces: 'slinger', ranged: 5, strength: 5, range: 1, vsSettlements: 5, costMult: 1.3, desc: '+5 Ranged Strength, +5 Strength, +1 Range, +5 vs settlements, costs 30% more' },
      ub: { id: 'lamassu_gate', name: 'Lamassu Gate', replaces: 'walls', yields: { culture: 2, happiness: 1 }, desc: '+2 Heritage, +1 Happiness' },
      cities: ['Assur', 'Nineveh', 'Kalhu', 'Dur-Sharrukin', 'Arbela', 'Harran', 'Imgur-Enlil', 'Kar-Tukulti-Ninurta', 'Tarbisu', 'Ekallatum', 'Shubat-Enlil', 'Guzana', 'Til Barsip', 'Arrapha', 'Nasibina', 'Kilizu', 'Shibaniba', 'Dur-Katlimmu', 'Tushhan', 'Amedi', 'Kurbail', 'Qatna', 'Hadatu', 'Halzi', 'Rasappa', 'Sikan', 'Qattara', 'Idu', 'Apku', 'Shadikanni', 'Nuzi', 'Kalzu', 'Nahur', 'Talmussu', "Sam'al", 'Arzuhina', 'Lahiru', 'Mazamua', 'Hindanu', 'Suhu'],
      leaders: [
        L('ashurbanipal', 'Ashurbanipal', 'King of the Universe', 'Library of Nineveh', 'Captured settlements grant +60 extra Knowledge. Libraries +2 Heritage. +10 Heritage when you learn a technology.', { captureScience: 60, buildingBonus: { library: { culture: 2 } }, techCulture: 10 }, { aggression: 0.7, expansion: 0.5, science: 0.8, culture: 0.6 }),
        L('tiglath', 'Tiglath-Pileser III', 'King of Assyria', 'Standing Army', 'Units cost 15% less and gain 50% more experience. Siege units +1 Movement.', { unitCostMult: 0.85, xpMult: 1.5, classMoves: { siege: 1 } }, { aggression: 0.95, expansion: 0.6, science: 0.3, culture: 0.2 })
      ] },

    { id: 'nubia', name: 'Nubia', adj: 'Nubian', difficulty: 'medium', bias: ['desert', 'river'], color: '#e2725b', color2: '#2b2b2b',
      ability: { name: 'Ta-Seti', desc: 'Ranged units +2 Strength and cost 15% less. Worked Desert tiles yield +1 Devotion.', fx: { classBonus: { ranged: 2 }, classCostMult: { ranged: 0.85 }, tileBonus: [{ when: 'desert', yields: { faith: 1 } }] } },
      uu: { id: 'pitati', name: 'Pitati Bowman', replaces: 'archer', ranged: 3, sight: 1, xpMult: 0.5, costMult: 0.85, desc: '+3 Ranged Strength, +1 Sight, +50% experience, 15% cheaper' },
      ub: { id: 'meroitic_temple', name: 'Meroitic Temple', replaces: 'shrine', yields: { faith: 2, culture: 1, happiness: 1 }, desc: '+2 Devotion, +1 Heritage, +1 Happiness' },
      cities: ['Meroë', 'Napata', 'Kerma', 'Faras', 'Dongola', 'Soba', 'Qustul', 'Buhen', 'Semna', 'Sai', 'Sedeinga', 'Jebel Barkal', 'Kawa', 'Sanam', 'Tabo', 'Musawwarat', 'Naqa', 'Wad ban Naqa', 'Basa', 'Dangeil', 'Amara', 'Kurgus', 'Tombos', 'Kurru', 'Nuri', 'Argo', 'Qasr Ibrim', 'Ballana', 'Kalabsha', 'Dakka', 'Aniba', 'Mirgissa', 'Uronarti', 'Shalfak', 'Askut', 'Kumma', 'Debeira', 'Serra', 'Sesebi', 'Wadi Halfa'],
      leaders: [
        L('amanirenas', 'Amanirenas', 'Kandake', 'One-Eyed Queen', 'Units +6 Strength when defending inside your borders and +4 vs units from another continent. +15 Gold per kill.', { homeDefenseBonus: 6, combatBonusVsInvaders: 4, goldPerKill: 15 }, { aggression: 0.5, expansion: 0.5, science: 0.4, culture: 0.5 }),
        L('piye', 'Piye', 'Pharaoh of Kush', 'Conqueror of Egypt', '+5 Devotion per kill. Captured settlements keep their buildings. Units +3 Strength against empires that share your religion.', { faithFromKills: 5, captureKeepBuildings: true, combatBonusOwnReligion: 3 }, { aggression: 0.75, expansion: 0.6, science: 0.4, culture: 0.5 })
      ] },

    { id: 'portugal', name: 'Portugal', adj: 'Portuguese', difficulty: 'easy', bias: ['coast'], color: '#7cb518', color2: '#c1121f',
      ability: { name: 'Padrão', desc: 'Naval units +1 Movement and can cross Ocean from the start. Coastal settlements +2 Gold and +1 Devotion.', fx: { navalMoves: 1, earlyOcean: true, coastalSettlementYields: { gold: 2, faith: 1 } } },
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
      ui: { id: 'polder', name: 'Polder', icon: '🌷', replaces: 'farm', when: 'coast', yields: { food: 1, gold: 1, production: 1 }, desc: 'farms by the sea yield +1 Food, +1 Gold and +1 Production' },
      cities: ['Amsterdam', 'Rotterdam', 'Utrecht', 'The Hague', 'Leiden', 'Haarlem', 'Delft', 'Groningen', 'Middelburg', 'Dordrecht', 'Nijmegen', 'Maastricht', 'Eindhoven', 'Arnhem', 'Deventer', 'Zwolle', 'Enkhuizen', 'Hoorn', 'Alkmaar', 'Gouda', 'Breda', "'s-Hertogenbosch", 'Tilburg', 'Leeuwarden', 'Kampen', 'Zutphen', 'Amersfoort', 'Vlissingen', 'Zierikzee', 'Den Helder', 'Apeldoorn', 'Almere', 'Lelystad', 'Roermond', 'Venlo', 'Bergen op Zoom', 'Harlingen', 'Franeker', 'Naarden', 'Edam'],
      leaders: [
        L('william_orange', 'William of Orange', 'Stadtholder', 'Father of the Fatherland', 'Units +5 Strength when defending inside your borders. Coastal settlements +5 defense. +1 Happiness in every settlement.', { homeDefenseBonus: 5, coastalDefense: 5, happinessBonus: 1 }, { aggression: 0.3, expansion: 0.6, science: 0.6, culture: 0.6 }),
        L('dewitt', 'Johan de Witt', 'Grand Pensionary', 'True Freedom', '+10% Gold. Gain 20 Gold whenever you learn a technology. Naval units cost 15% less.', { yieldMult: { gold: 1.1 }, techGold: 20, navalCostMult: 0.85 }, { aggression: 0.2, expansion: 0.7, science: 0.8, culture: 0.5 })
      ] },

    { id: 'khmer', name: 'Khmer', adj: 'Khmer', difficulty: 'hard', bias: ['river', 'jungle'], color: '#a67c52', color2: '#0b3d2e',
      ability: { name: 'Devaraja', desc: 'Settlements founded on a river +2 Devotion and +1 Heritage. Worked River tiles +1 Food. Units +2 Strength against empires that share your religion.', fx: { settlementSiteBonus: [{ when: 'river', yields: { faith: 2, culture: 1 } }], tileBonus: [{ when: 'river', yields: { food: 1 } }], combatBonusOwnReligion: 2 } },
      uu: { id: 'domrey', name: 'Domrey', replaces: 'catapult', strength: 6, ranged: 3, moves: 1, costMult: 1.2, desc: '+6 Strength, +3 Ranged Strength, +1 Movement (a ballista carried on an elephant), costs 20% more' },
      ui: { id: 'baray', name: 'Baray', icon: '💧', replaces: 'farm', when: 'river', yields: { food: 2, faith: 1 }, desc: 'river farms become reservoirs: +2 Food, +1 Devotion' },
      cities: ['Yasodharapura', 'Hariharalaya', 'Indrapura', 'Isanapura', 'Lingapura', 'Banteay Chhmar', 'Preah Khan', 'Phimai', 'Lavo', 'Vyadhapura', 'Angkor Borei', 'Oudong', 'Longvek', 'Phnom Penh', 'Battambang', 'Siem Reap', 'Kampot', 'Kratie', 'Stung Treng', 'Kampong Cham', 'Kampong Thom', 'Takeo', 'Prey Veng', 'Svay Rieng', 'Pursat', 'Kampong Chhnang', 'Sisophon', 'Poipet', 'Sihanoukville', 'Koh Kong', 'Pailin', 'Kep', 'Preah Vihear', 'Beng Mealea', 'Banteay Srei', 'Wat Phu', 'Sdok Kok Thom', 'Phanom Rung', 'Muang Tam', 'Bakong'],
      leaders: [
        L('jayavarman', 'Jayavarman VII', 'Devaraja', 'Bayon', 'Each Wonder yields +2 Devotion. Wonders cost 10% less. +1 Happiness in every settlement.', { faithPerWonder: 2, wonderCostMult: 0.9, happinessBonus: 1 }, { aggression: 0.4, expansion: 0.5, science: 0.5, culture: 0.8 }),
        L('suryavarman', 'Suryavarman II', 'Devaraja', 'Angkor Wat', 'Your religion spreads 30% faster. Settlements following your religion +1 Heritage. Units +3 Strength against empires that share your religion (stacks with Devaraja).', { pressureMult: 1.3, culturePerFollowerSettlement: 1, combatBonusOwnReligion: 3 }, { aggression: 0.7, expansion: 0.6, science: 0.4, culture: 0.6 })
      ] },

    { id: 'kongo', name: 'Kongo', adj: 'Kongolese', difficulty: 'hard', bias: ['jungle', 'river'], color: '#f4a261', color2: '#264653',
      ability: { name: 'Mbanza', desc: 'Worked Rainforest and Marsh tiles yield +1 Food and +1 Heritage. Settlements following your religion +1 Gold. Each worked Luxury yields +1 Heritage.', fx: { tileBonus: [{ when: 'jungle', yields: { food: 1, culture: 1 } }], goldPerFollowerSettlement: 1, luxuryCulture: 1 } },
      uu: { id: 'ngao_mbebe', name: 'Ngao Mbebe', replaces: 'spearman', strength: 2, defVsRanged: 6, terrainBonus: { jungle: 5 }, costMult: 1.05, desc: '+2 Strength, +6 defending against ranged attacks (great shield), +5 in jungle, costs 5% more' },
      ub: { id: 'lumbu', name: 'Lumbu', replaces: 'monument', yields: { culture: 1, food: 1, happiness: 1 }, desc: '+1 Heritage, +1 Food, +1 Happiness' },
      cities: ['Mbanza Kongo', 'Mbanza Mbata', 'Mbanza Nsundi', 'Mbanza Mpangu', 'Mbanza Mpemba', 'Mbanza Soyo', 'Mbanza Wembo', 'Mbanza Mbamba', 'Kabasa', 'Matamba', 'Loango', 'Mpinda', 'Ngoyo', 'Kakongo', 'Cabinda', 'Nkusu', 'Wandu', 'Nkondo', 'Mbwila', 'Kinsundi', 'Bumbu', 'Ndembo', 'Zombo', 'Kibangu', 'Lemba', 'Mbula', 'Kongo dia Nlaza', 'Mbanza Nkanda', 'Vunda', 'Mpangala', 'Kinkanga', 'Mukondo', 'Noki', 'Boma', 'Matadi', 'Songololo', 'Kimpese', 'Mbanza-Ngungu', 'Malanza', 'Mpumbu'],
      leaders: [
        L('nzinga', 'Nzinga Mbande', 'Ngola', 'Queen of Matamba', 'Units +5 Strength vs units from another continent and +4 in Rainforest and Marsh. Units heal +10 in your territory.', { combatBonusVsInvaders: 5, combatBonusJungle: 4, healBonusHome: 10 }, { aggression: 0.6, expansion: 0.5, science: 0.4, culture: 0.5 }),
        L('afonso', 'Afonso I', 'Manikongo', 'Evangelist of Kongo', 'Your religion spreads 50% faster. Settlements following your religion +1 Knowledge. Every settlement gets a free Shrine once Mysticism is known.', { pressureMult: 1.5, sciencePerFollowerSettlement: 1, freeBuildingWithTech: { shrine: 'mysticism' } }, { aggression: 0.3, expansion: 0.6, science: 0.7, culture: 0.7 })
      ] },

  ];
  MORE.forEach(function (c) { AU.CIVS.push(c); });
  AU.indexCivs();
})(globalThis.AU = globalThis.AU || {});
