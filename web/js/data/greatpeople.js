// Great People: seven kinds, earned with Great Person points from buildings and wonders (Civ 4/6 style).
// Each kind has its own points, its own rising cost and a list of historical names in era order.
(function (AU) {
  AU.GREAT_TYPES = {
    prophet:   { name: 'Great Prophet',   icon: '🕊️', unit: 'great_prophet',   yield: 'faith',      desc: 'Founds a religion in one of your settlements (only a Great Prophet can). If every religion of the world is already founded, spreads your religion powerfully instead, or retires for Devotion.' },
    scientist: { name: 'Great Scientist', icon: '🔬', unit: 'great_scientist', yield: 'science',    desc: 'Instantly completes the technology you are researching (or the cheapest available one).' },
    engineer:  { name: 'Great Engineer',  icon: '⚙️', unit: 'great_engineer',  yield: 'production', desc: 'Adds a huge burst of Production to what a City is building: a quick way to finish a wonder. In a Town the burst becomes Gold.' },
    merchant:  { name: 'Great Merchant',  icon: '💰', unit: 'great_merchant',  yield: 'gold',       desc: 'Brings a large sum of Gold to the treasury and one envoy to send to a city-state.' },
    artist:    { name: 'Great Artist',    icon: '🎨', yield: 'culture', unit: 'great_artist',      desc: 'Creates a Great Work in a settlement: +3 Heritage and +3 Fame there every turn, forever.' },
    general:   { name: 'Great General',   icon: '⚔️', unit: 'great_general',   yield: 'military',   desc: 'While alive: your land units within 2 tiles get +5 Strength. Can retire to fully heal every friendly unit within 2 tiles.' },
    admiral:   { name: 'Great Admiral',   icon: '⚓', unit: 'great_admiral',   yield: 'naval',      desc: 'While alive: your naval units within 2 tiles get +5 Strength and +1 Movement. Can retire to fully heal every friendly unit within 2 tiles.' }
  };
  AU.GREAT_ORDER = ['prophet', 'scientist', 'engineer', 'merchant', 'artist', 'general', 'admiral'];
  // Points per turn given by buildings, national wonders and world wonders.
  AU.GREAT_POINTS = {
    shrine: { prophet: 2 }, temple: { prophet: 3 }, grand_temple: { prophet: 3 }, stonehenge: { prophet: 3 }, oracle: { prophet: 2, artist: 1 }, notre_dame: { prophet: 2 },
    library: { scientist: 1 }, university: { scientist: 2 }, research_lab: { scientist: 3 }, astronomical_observatory: { scientist: 1 }, computer_center: { scientist: 2 }, royal_library: { scientist: 2 }, national_university: { scientist: 2 }, space_agency: { scientist: 2 }, great_library: { scientist: 3 }, hubble: { scientist: 4 },
    workshop: { engineer: 1 }, factory: { engineer: 2 }, power_plant: { engineer: 2 }, ironworks: { engineer: 2 }, pyramids: { engineer: 3 }, hanging_gardens: { engineer: 1 }, forbidden_city: { engineer: 2 }, eiffel_tower: { engineer: 3 },
    market: { merchant: 1 }, bank: { merchant: 2 }, stock_exchange: { merchant: 3 }, national_treasury: { merchant: 2 }, central_bank: { merchant: 2 }, colossus: { merchant: 3 }, petra: { merchant: 2 }, machu_picchu: { merchant: 2 }, big_ben: { merchant: 3 }, statue_of_liberty: { merchant: 2 },
    amphitheater: { artist: 1 }, museum: { artist: 2 }, broadcast_tower: { artist: 2 }, national_epic: { artist: 2 }, national_museum: { artist: 2 }, colosseum: { artist: 2 }, chichen_itza: { artist: 2 }, taj_mahal: { artist: 3 },
    barracks: { general: 1 }, castle: { general: 1 }, military_academy: { general: 2 }, heroic_epic: { general: 2 }, terracotta_army: { general: 3 }, alhambra: { general: 2 },
    lighthouse: { admiral: 1 }, harbor: { admiral: 1 }, shipyard: { admiral: 2 }, grand_arsenal: { admiral: 2, general: 1 }, great_lighthouse: { admiral: 3 }
  };
  // Names in rough era order; the game picks the first unused name of the current era or earlier.
  AU.GREAT_NAMES = {
    prophet:   [[0, 'Zoroaster'], [0, 'Moses'], [1, 'Siddhartha Gautama'], [1, 'Confucius'], [1, 'Laozi'], [1, 'Mahavira'], [1, 'Paul of Tarsus'], [2, 'Bodhidharma'], [2, 'Adi Shankara'], [2, 'Francis of Assisi'], [3, 'Martin Luther'], [3, 'Guru Nanak'], [3, 'Ignatius of Loyola'], [4, 'Joseph Smith'], [5, 'Swami Vivekananda'], [6, 'Thich Nhat Hanh']],
    scientist: [[0, 'Imhotep'], [1, 'Euclid'], [1, 'Archimedes'], [1, 'Hypatia'], [1, 'Zhang Heng'], [2, 'Al-Khwarizmi'], [2, 'Ibn Sina'], [2, 'Shen Kuo'], [3, 'Copernicus'], [3, 'Galileo Galilei'], [3, 'Isaac Newton'], [4, 'Charles Darwin'], [4, 'James Watt'], [5, 'Marie Curie'], [5, 'Albert Einstein'], [6, 'Alan Turing'], [7, 'Stephen Hawking'], [7, 'Katherine Johnson']],
    engineer:  [[0, 'Ur-Nammu'], [1, 'Vitruvius'], [1, 'Lu Ban'], [2, 'Ismail al-Jazari'], [2, 'Li Chun'], [3, 'Filippo Brunelleschi'], [3, 'Leonardo da Vinci'], [3, 'Mimar Sinan'], [4, 'Isambard Kingdom Brunel'], [4, 'Gustave Eiffel'], [5, 'Nikola Tesla'], [5, 'Henry Ford'], [6, 'Wernher von Braun'], [6, 'Sergei Korolev'], [7, 'Ove Arup']],
    merchant:  [[0, 'Ea-nasir'], [1, 'Marcus Crassus'], [1, 'Zhang Qian'], [2, 'Marco Polo'], [2, 'Ibn Battuta'], [2, 'Mansa Musa'], [3, 'Jakob Fugger'], [3, 'Cosimo de\' Medici'], [3, 'Zheng He'], [4, 'Adam Smith'], [4, 'Mayer Rothschild'], [5, 'Andrew Carnegie'], [5, 'John D. Rockefeller'], [6, 'Sam Walton'], [7, 'Muhammad Yunus']],
    artist:    [[0, 'Enheduanna'], [1, 'Homer'], [1, 'Sappho'], [1, 'Phidias'], [1, 'Qu Yuan'], [2, 'Murasaki Shikibu'], [2, 'Rumi'], [2, 'Li Bai'], [3, 'Michelangelo'], [3, 'William Shakespeare'], [3, 'Hokusai'], [4, 'Ludwig van Beethoven'], [4, 'Jane Austen'], [5, 'Pablo Picasso'], [5, 'Frida Kahlo'], [6, 'Miles Davis'], [7, 'Hayao Miyazaki']],
    general:   [[0, 'Sargon of Akkad'], [1, 'Sun Tzu'], [1, 'Hannibal Barca'], [1, 'Scipio Africanus'], [1, 'Boudica'], [2, 'Khalid ibn al-Walid'], [2, 'Subutai'], [2, 'Joan of Arc'], [3, 'Tokugawa Ieyasu'], [3, 'Gustavus Adolphus'], [4, 'Napoleon Bonaparte'], [4, 'Shaka Zulu'], [5, 'Erwin Rommel'], [5, 'Georgy Zhukov'], [6, 'Douglas MacArthur'], [7, 'Norman Schwarzkopf']],
    admiral:   [[0, 'Themistocles'], [1, 'Gaius Duilius'], [2, 'Yi Sun-sin'], [2, 'Rajendra Chola'], [3, 'Francis Drake'], [3, 'Michiel de Ruyter'], [3, 'Zheng Zhilong'], [4, 'Horatio Nelson'], [4, 'David Farragut'], [5, 'Togo Heihachiro'], [5, 'Chester Nimitz'], [6, 'Hyman Rickover'], [7, 'Grace Hopper']]
  };
})(globalThis.AU = globalThis.AU || {});
