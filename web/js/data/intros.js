// Loading-screen narration: a motto per empire, and for every leader a scene and a call to the player.
(function (AU) {
  AU.INTROS = {
   "civs": {
    "rome": {
     "motto": "All roads lead home"
    },
    "japan": {
     "motto": "Where the sun first rises"
    },
    "china": {
     "motto": "One realm under heaven"
    },
    "america": {
     "motto": "Out of many, one nation"
    },
    "india": {
     "motto": "Many rivers, one Dharma"
    },
    "indonesia": {
     "motto": "A thousand islands, one sea"
    },
    "mongolia": {
     "motto": "The steppe rides as one"
    },
    "zulu": {
     "motto": "Children of the heavens"
    },
    "persia": {
     "motto": "Mercy rides the Royal Road"
    },
    "egypt": {
     "motto": "Eternal as the Nile"
    },
    "celts": {
     "motto": "Deep roots, wild hearts"
    },
    "arabia": {
     "motto": "Wisdom carried across the sands"
    },
    "france": {
     "motto": "Glory, light and grandeur"
    },
    "england": {
     "motto": "The sun never sets"
    },
    "aztec": {
     "motto": "Where the eagle lands"
    },
    "inca": {
     "motto": "Four quarters, one road"
    },
    "maya": {
     "motto": "Time written in stone"
    },
    "shawnee": {
     "motto": "Many nations, one fire"
    },
    "greece": {
     "motto": "Where ideas are born"
    },
    "germany": {
     "motto": "Free cities, iron will"
    },
    "russia": {
     "motto": "Vast as the winter sky"
    },
    "spain": {
     "motto": "Ever further beyond"
    },
    "ottoman": {
     "motto": "Where two continents meet"
    },
    "korea": {
     "motto": "Letters for every hand"
    },
    "vietnam": {
     "motto": "The dragon's children endure"
    },
    "ethiopia": {
     "motto": "Mountains that never bowed"
    },
    "mali": {
     "motto": "Salt, gold and song"
    },
    "norway": {
     "motto": "The sea road calls"
    },
    "babylon": {
     "motto": "Where cities first rose"
    },
    "polynesia": {
     "motto": "The stars are our map"
    },
    "austria_hungary": {
     "motto": "Two crowns, one waltz"
    },
    "carthage": {
     "motto": "Every harbour a home"
    },
    "byzantium": {
     "motto": "The city that endures"
    },
    "poland": {
     "motto": "The bulwark stands firm"
    },
    "assyria": {
     "motto": "Lions at the gate"
    },
    "nubia": {
     "motto": "Land of the bow"
    },
    "portugal": {
     "motto": "Beyond the last cape"
    },
    "netherlands": {
     "motto": "We made the land ourselves"
    },
    "khmer": {
     "motto": "Temples rising from the jungle"
    },
    "kongo": {
     "motto": "Heart of the great river"
    }
   },
   "leaders": {
    "trajan": {
     "scene": "Rome stands at its widest. Legionaries march home over the great bridge across the Danube, and in the capital a marble column rises, carved with the story of Dacia from base to crown.",
     "call": "Optimus Princeps Trajan, the Senate names you the best of rulers. Nurture the young towns, cross every river, and let each city you win add another spiral of glory to your column. Rome waits to grow wider still."
    },
    "augustus": {
     "scene": "The civil wars are over at last. The doors of the temple of Janus are closed, and across Rome the ring of chisels replaces the clash of swords as brick gives way to marble.",
     "call": "Augustus, first citizen of Rome, peace was bought dearly; now spend it well. Raise wonders that outlast the ages and dress your capital in marble. Build, Princeps, and let the world remember what peace can make."
    },
    "caesar": {
     "scene": "A small river in northern Italy marks the edge of the Republic's law. The Thirteenth Legion waits on the bank, breath steaming in the dawn, while all of Rome holds its breath.",
     "call": "Gaius Julius Caesar, the die is cast. Every victory fills your war chest and carries your legions onward before the enemy can recover. Come, see, conquer, Dictator, and do not stop to rest."
    },
    "tokugawa": {
     "scene": "After a century of warring states, the banners of Sekigahara are furled. Edo is a fishing town becoming a capital, and for the first time in living memory the roads of Japan are quiet.",
     "call": "Shogun Tokugawa Ieyasu, patience has won you the realm; now guard it. Keep your borders strong, let your towns turn their labour into wealth, and hold the country's heart as your own. Build a peace that lasts for centuries."
    },
    "hojo": {
     "scene": "The Mongol fleet fills the horizon off Hakata Bay. Samurai crouch behind a new stone wall along the shore, and the young regent in Kamakura has refused every demand of the Great Khan.",
     "call": "Shikken Hojo Tokimune, the sea is both your wall and your weapon. Command the coasts, rule the waves, and let any fleet that nears your harbours find the very wind against it. Stand firm, Regent; the storm is on your side."
    },
    "meiji": {
     "scene": "Steam whistles echo across Yokohama harbour. Students sail for Europe and America, telegraph wires hum toward Tokyo, and an ancient court steps boldly into a new age.",
     "call": "Emperor Meiji, your land has chosen to learn from the whole world. Let every discovery spark the next, fill your cities with schools, and turn knowledge into industry. Seek wisdom everywhere, and lead Japan into the modern age."
    },
    "qin": {
     "scene": "Seven warring kingdoms have become one. Across the new empire roads, coins and script are made the same, and thousands of craftsmen shape clay soldiers to guard their ruler forever.",
     "call": "Qin Shi Huang, First Emperor, you have unified all under heaven. Raise walls around every city and wonders beyond measure, and let no raider cross your frontier. Build for eternity, Son of Heaven."
    },
    "taizong": {
     "scene": "Chang'an is the greatest city on earth. Silk Road caravans unload at the Western Market, scholars copy the classics by lamplight, and horsemen of the steppe hail the emperor as their Heavenly Khagan.",
     "call": "Emperor Taizong of Tang, your Zhenguan reign is remembered as an age of wise counsel. Heed your scholars, mount your cavalry, and let every lesson learned make the next come easier. Govern well, and the ages will follow your example."
    },
    "wu": {
     "scene": "Lanterns glow over the palace halls of Luoyang. Examination candidates from humble families sit with brushes poised, and bolts of shimmering silk pass from hand to hand along the roads to the west.",
     "call": "Empress Wu Zetian, the only woman to rule China in her own name, talent is your treasure. Gather fine luxuries, open your libraries to every clever mind, and let your influence reach every court. Rule, Empress, and let the doubters watch."
    },
    "kublai": {
     "scene": "Barges heavy with southern rice crowd the Grand Canal toward Khanbaliq, the new capital. Merchants from Venice to Persia wander markets beneath the banners of the Yuan.",
     "call": "Kublai, Great Khan and Emperor of the Yuan, you rule the steppe and the rice fields alike. Send the harvest of your towns flowing to your cities, and keep your horsemen swift. Bind the land together with water and will."
    },
    "roosevelt": {
     "scene": "Steel mills roar in Pittsburgh, a canal is being carved through Panama, and a restless nation looks west to its wild national parks and outward across two oceans.",
     "call": "President Theodore Roosevelt, speak softly and carry a big stick. Make your home continent a fortress, keep your neighbours friendly and your forces ready. Charge ahead, Colonel; the arena is yours."
    },
    "lincoln": {
     "scene": "Washington is a city of unfinished domes and anxious telegrams. The nation is split in two, factories hum across the North, and everything hangs on whether the country can be made whole again.",
     "call": "President Lincoln, a house divided against itself cannot stand. Keep your cities working and your people hopeful, and heal the lands you win back with charity, not malice. Bind up the nation's wounds, Mr. President, and build it stronger."
    },
    "franklin": {
     "scene": "Philadelphia bustles with printers, lamplighters and debating clubs. A kite climbs into a thunderstorm, and in a crowded lending library the next great idea is only a pamphlet away.",
     "call": "Doctor Franklin, printer, inventor and statesman, curiosity is your capital. Fill your libraries and universities, and let every bright idea pay its own way. A penny saved is a penny earned; now go and earn a nation."
    },
    "gandhi": {
     "scene": "The dusty road to Dandi stretches toward the sea. Thousands walk behind a slight figure with a walking staff, and on the shore a handful of salt becomes a message to the world.",
     "call": "Mahatma Gandhi, your strength is truth and your weapon is peace. Let your people flourish, keep their spirit unbroken in hard times, and win the respect of every neighbour. Walk on, Bapu; the world will follow."
    },
    "ashoka": {
     "scene": "The battlefield of Kalinga falls silent. Where armies clashed, stonemasons now raise polished pillars carved with edicts of kindness, and messengers carry the Dharma along every road of the Mauryan realm.",
     "call": "Ashoka, Beloved of the Gods, you have seen the true cost of conquest. Carve your edicts, keep the peace, and let wisdom guide each decision. Rule with compassion, Samrat, and your words will outlast any sword."
    },
    "akbar": {
     "scene": "In the red sandstone halls of Fatehpur Sikri, scholars of many faiths debate late into the night. Bazaars overflow with spices, jewels and brocade, and the emperor listens to every voice.",
     "call": "Padishah Akbar the Great, your empire is a garden of many flowers. Treasure its luxuries, keep your people content, and let your towns trade freely. Rule with an open ear, Shahanshah, and harmony will be your crown."
    },
    "gitarja": {
     "scene": "Temple gongs carry across terraced rice fields. Water flows down from the volcanoes through channels blessed by priests, and the trading ships of Majapahit crowd the harbours of Java.",
     "call": "Queen Gitarja of Majapahit, the waters of your islands answer to the temples. Let shrines nourish the fields and your coastal towns ring with devotion. Guide the empire through its rising years, Queen, and a golden age will follow."
    },
    "gajah": {
     "scene": "Before the throne of Majapahit, the chief minister rises and swears an oath: he will taste no palapa, no worldly comfort, until all the islands of Nusantara are united.",
     "call": "Mahapatih Gajah Mada, your oath echoes across the archipelago. Send your fleets from island to island, and let every distant shore thrive under your banner. Keep your vow; the sea is only a road between your lands."
    },
    "genghis": {
     "scene": "Across the endless grass of the steppe, a great kurultai has gathered. The horse-hair banners of the clans stand together at last, the herds stretch to the horizon, and the world beyond has no idea what is coming.",
     "call": "Great Khan Genghis, the scattered clans answer to you alone. Ride fast, strike hard, and let word of each victory open the next city's gates. The horizon is endless, Khan; ride for it."
    },
    "mandukhai": {
     "scene": "The Mongol clans are feuding again, and the line of Genghis rests on a single young boy. A widowed queen straps on her quiver and gathers the scattered tribes to her standard.",
     "call": "Mandukhai Khatun, the Wise Queen, you ride at the head of your own army. Train your warriors hard, tend their wounds swiftly, and bring the lost clans home. Unite the steppe, Khatun, and let the nation be reborn."
    },
    "shaka": {
     "scene": "Short stabbing spears ring against cowhide shields as the regiments drill on the hills of kwaBulawayo. A small clan is becoming a nation, and its young king is remaking the art of war.",
     "call": "King Shaka kaSenzangakhona, your horns of the buffalo close around every foe. Attack boldly, let each victory add to your people's legend, and keep your warbands fit to march. Bayede, Nkosi; the hills await your command."
    },
    "cetshwayo": {
     "scene": "Redcoat columns cross the Buffalo River into Zululand. Beneath the hill of Isandlwana, the king's regiments wait in silence, shields low, as the invaders make camp.",
     "call": "King Cetshwayo kaMpande, the land of your fathers is threatened by a foe with rifles and cannon. Defend your borders fiercely, for there no enemy is too advanced to fall. Stand fast, Ndabezitha, and let your homeland be their undoing."
    },
    "cyrus": {
     "scene": "The gates of Babylon open without a battle. Priests and citizens line the streets as the Persian king rides in, and a clay cylinder records his promise to let peoples return home and honour their gods.",
     "call": "Cyrus the Great, King of Kings, you win cities with mercy as much as with arms. Take lands gently, keep their people whole and content, and they will never rise against you. Rule the four corners of the world."
    },
    "darius": {
     "scene": "Royal couriers gallop the Royal Road from Sardis to Susa, changing horses at every station. Tribute flows in from the satrapies, and the palace of Persepolis rises on its great stone terrace.",
     "call": "Shahanshah Darius, your empire runs on roads and ledgers. Lay your highways swiftly, let your towns fill the treasury, and buy what you need at a fair price. Govern the many lands, King of Kings, and let nothing stop your couriers."
    },
    "cleopatra": {
     "scene": "Alexandria's lighthouse burns over a harbour thick with Roman ships. In the palace, the last queen of the Ptolemies, fluent in many tongues, weighs the ambitions of Rome's most powerful men.",
     "call": "Pharaoh Cleopatra, Queen of Kings, your wit is sharper than any sword. Win friends in every court, let alliances fill your treasury, and leave your enemies too weary to fight. Charm the world, and keep Egypt free."
    },
    "ramses": {
     "scene": "Stonecutters sing as colossal statues emerge from the cliffs of Abu Simbel. The battle of Kadesh is carved on temple walls, and the Nile floods rich and black across the fields.",
     "call": "Ramses the Great, Lord of the Two Lands, your monuments will speak your name for thousands of years. Raise wonders along the river and let your engineers dream ever bigger. Build, Pharaoh, until the stones outshine the stars."
    },
    "hatshepsut": {
     "scene": "Ships sail home up the Red Sea laden with incense trees, ebony and gold from the land of Punt. At Deir el-Bahari, the walls of a terraced temple wait to record the voyage.",
     "call": "Pharaoh Hatshepsut, Foremost of Noble Women, your wealth arrives on trade winds and caravans. Prize every luxury, send your traders far, and let each route bring gold and blessing home. Open the roads, and Egypt will prosper."
    },
    "boudica": {
     "scene": "Smoke rises over the lands of the Iceni. Rome has broken its word, and through the forests of Britain the tribes gather in their thousands, chariots rattling, behind a tall queen with a great mane of tawny hair.",
     "call": "Queen Boudica of the Iceni, the wrong done to your family will be answered. Strike from the forests, charge headlong at the invaders, and make Rome remember your name. Ride out, and let the woods roar with you."
    },
    "vercingetorix": {
     "scene": "Signal fires blaze from the hill-forts of Gaul. At Gergovia the legions have been driven back down the slopes, and the young Arverni chieftain calls every tribe to stand together against Caesar.",
     "call": "Vercingetorix, chieftain of the Arverni and war leader of all Gaul, the high ground is yours. Fortify your hills, rest your warriors behind strong ramparts, and let every assault break on your walls. Hold fast; Gaul is watching."
    },
    "saladin": {
     "scene": "The Horns of Hattin shimmer in the summer heat. Ayyubid horsemen hold the springs, and beyond the hills lies Jerusalem, awaiting a sultan famed as much for his mercy as his victories.",
     "call": "Sultan Salah ad-Din, even your enemies praise your honour. Defend your cities and the holy places, and fight fiercest where your people need you most. Ride with justice, Sultan, and history will call you chivalrous."
    },
    "harun": {
     "scene": "Baghdad glows at night, a round city of gardens, bridges and booksellers. Paper mills turn beside the Tigris, and translators pore over manuscripts from Greece, Persia and India.",
     "call": "Caliph Harun al-Rashid, the tales of a thousand nights begin in your court. Gather scholars, build libraries, and let every wonder become a house of learning. Light the lamp of wisdom, Commander of the Faithful, and the world will read by it."
    },
    "napoleon": {
     "scene": "Drums beat along the roads of Europe. The Grande Armée marches in swift corps, living off the land, cannons polished and bands playing, toward a battlefield named Austerlitz.",
     "call": "Emperor Napoleon, the whole continent is your map table. Field great armies for less, bring your guns to bear on every city, and let your bandsmen quicken the march. Forward, Sire; victory belongs to the swift."
    },
    "louis": {
     "scene": "Fountains dance in the gardens of Versailles. Courtiers crowd the Hall of Mirrors, musicians tune for the evening ballet, and every eye turns to the king who rises each morning like the sun.",
     "call": "Louis, the Sun King, you have made France the envy of Europe. Let your capital shine with art and treasure, give your people splendour to be proud of, and let every city reflect your light. Shine, Sire, and outdazzle the world."
    },
    "joan": {
     "scene": "Orléans is besieged and France seems lost. Then a farm girl from Domrémy rides in beneath a white banner, and the weary defenders suddenly remember how to hope.",
     "call": "Joan of Arc, Maid of Orléans, you hear a calling others cannot. Drive the invaders from your land, tend your soldiers on home soil, and never lower your banner. Lift the siege, and see your king crowned."
    },
    "victoria": {
     "scene": "Chimneys smoke from Manchester to Glasgow. The Great Exhibition glitters inside a palace of glass, railways lace the countryside, and steamships carry British goods to every port on earth.",
     "call": "Queen Victoria of England, yours is an age of steam and steel. Build workshops and factories, fire up your cities, and turn every plume of smoke into gold. Stoke the engines, Your Majesty, and let the world run on your industry."
    },
    "elizabeth": {
     "scene": "Beacons blaze along the English coast. The Spanish Armada sails up the Channel, and in Plymouth harbour the Sea Dogs, Drake among them, hurry to put to sea.",
     "call": "Queen Elizabeth, Gloriana, you have the heart and stomach of a king. Loose your privateers, hunt the seas for prizes, and let no fleet stand against you. Sail on, Good Queen Bess, and make the ocean England's own."
    },
    "churchill": {
     "scene": "Air raid sirens wail over London. Spitfires climb above the white cliffs, families shelter in the Underground, and across the Channel an undefeated enemy waits for the island to despair.",
     "call": "Prime Minister Churchill, your whole life has prepared you for this hour. Fortify every city, hold every line, and never surrender. Defend your island, and let this be your finest hour."
    },
    "montezuma": {
     "scene": "Tenochtitlan floats on its lake like a dream. Canoes glide along the canals, the Great Temple towers over the plaza, and tribute from many cities fills the royal storehouses.",
     "call": "Huey Tlatoani Montezuma, the Triple Alliance reaches from sea to sea. Delight in your treasures of jade and quetzal feathers, and let every city brought under your rule send tribute to your capital. Reign in splendour, Great Speaker."
    },
    "itzcoatl": {
     "scene": "The Mexica are still vassals of Azcapotzalco. In the council halls of Tenochtitlan, a new ruler and his allies from Texcoco and Tlacopan swear to break free together.",
     "call": "Tlatoani Itzcoatl, Obsidian Serpent, your strength lies in your alliances. Grow your capital, send settlers across the valley, and let every friendship feed your workshops. Throw off your chains, and found an empire."
    },
    "pachacuti": {
     "scene": "High in the Andes, Cusco is being rebuilt in perfectly fitted stone. Runners carry knotted quipu along mountain roads, and the man who turned back the Chanka now dreams of four realms made one.",
     "call": "Sapa Inca Pachacuti, Earth-Shaker, your roads bind the mountains together. Move swiftly through your lands, work the mines for their riches, and command your empire as easily as your own courtyard. Remake the world."
    },
    "huayna": {
     "scene": "The Inca realm stretches from Quito deep into Chile. Storehouses line the hillsides, full of maize and cloth, and every community sends its workers in turn to labour for the state.",
     "call": "Sapa Inca Huayna Capac, the Young and Mighty, your empire runs on the labour of its towns. Let them grow and prosper, fill your storehouses, and turn their work into riches. Rule the four quarters, Son of the Sun."
    },
    "sixsky": {
     "scene": "The city of Naranjo lies humbled and leaderless. Into its plaza comes a princess from Dos Pilas, bearing the proud emblem of great Mutal, to restore a dynasty and rebuild its temples.",
     "call": "Lady Six Sky, Holy Queen of Naranjo, your power radiates from your seat of rule. Make the heartland rich, keep your warriors close to home, and let no rival city challenge you. Rule from the centre, and the jungle kingdoms will bow."
    },
    "pakal": {
     "scene": "In the misty hills of Palenque, the Temple of Inscriptions climbs step by step above the jungle. Scribes carve the long count of kings, and deep within, a hidden tomb is being prepared.",
     "call": "K'inich Janaab' Pakal, Holy Lord of Palenque, your city is a jewel of art and learning. Raise wonders, fill them with knowledge, and keep your people's spirit bright. Reach for the heavens, Ajaw, and your name will be read forever."
    },
    "tecumseh": {
     "scene": "Along the Wabash at Prophetstown, delegations arrive from nations across the Great Lakes and the Ohio country. A Shawnee leader speaks of one great confederacy, for the land belongs to all and cannot be sold piece by piece.",
     "call": "Tecumseh of the Shawnee, Shooting Star, your words unite nations that were once strangers. Defend your homeland, let your warriors heal and return to the fight, and drive back every raider. Stand together, and your people will never be broken."
    },
    "cornstalk": {
     "scene": "Cornfields ripen along the Scioto River, and council fires burn in the Shawnee towns. After hard years of war, the chief called Hokoleskwa speaks for peace and the survival of his people.",
     "call": "Chief Cornstalk, Hokoleskwa, your wisdom is spoken of around every council fire. Tend your fields, let your towns grow, and honour your people's traditions. Keep the fire burning, and your people will flourish."
    },
    "pericles": {
     "scene": "The Parthenon gleams white on the Acropolis. In the agora philosophers argue, playwrights prepare for the festival of Dionysus, and the citizens of Athens vote on their own laws.",
     "call": "Pericles, Strategos of Athens, your city is the school of Greece. Let every discovery inspire art, crown each wonder with learning, and make Athens the envy of all. Lead the Assembly, and build a golden age."
    },
    "leonidas": {
     "scene": "At the hot gates of Thermopylae, the pass narrows between mountain and sea. Spartans polish their bronze shields, and the Persian host covers the plain as far as the eye can see.",
     "call": "King Leonidas of Sparta, the high ground and the narrow pass are yours. Hold your ground, train every warrior from youth, and let the enemy's numbers be their downfall. Come back with your shield, or on it."
    },
    "alexander": {
     "scene": "The phalanx marches east from Macedon. Beyond the Hellespont lie Persia, Egypt and India, and more than one conquered city will soon bear its conqueror's name.",
     "call": "Alexander, King of Macedon, no horizon is far enough for your ambition. March without tiring, gather knowledge from every city you take, and found new Alexandrias at the ends of the earth. The world awaits; go and meet it."
    },
    "barbarossa": {
     "scene": "The Imperial Diet gathers on the plain of Roncaglia. Bishops, dukes and envoys from the proud cities of Lombardy crowd the tents, and the red-bearded emperor means to bring them all to heel.",
     "call": "Frederick Barbarossa, Holy Roman Emperor, you rule a patchwork of princes and cities. Let your towns trade, your cities build, and let no free city defy your crown. Unite the Empire, Kaiser, from the Alps to the sea."
    },
    "bismarck": {
     "scene": "Berlin is a city of iron and railways. The great questions of the day, the Chancellor has declared, will be settled not by speeches and votes but by blood and iron.",
     "call": "Chancellor Bismarck, the German states wait to become one nation. Raise soldiers cheaply and well, drill them in your barracks, and take every fortress that stands in your way. Forge Germany, Iron Chancellor."
    },
    "frederick": {
     "scene": "Flutes play at Sanssouci as philosophers debate with the king over dinner. Beyond the palace, Prussian regiments drill in perfect order, the best-trained army in Europe.",
     "call": "Frederick the Great, King of Prussia, you call yourself the first servant of the state. Pursue knowledge relentlessly, drill your soldiers well, and let every advance strengthen your voice among nations. Reason and discipline await, Old Fritz; lead them."
    },
    "peter": {
     "scene": "Marshland beside the Neva is becoming a city. Ships are built with the tsar's own hands, beards are trimmed by royal decree, and Russia turns its face toward the sea and the West.",
     "call": "Tsar Peter the Great, you have opened a window onto Europe. Learn every craft, embrace every new idea, and build a navy that sails ever faster. Modernise your empire, and the world will take notice."
    },
    "catherine": {
     "scene": "Candles glitter in the Winter Palace. Letters pass between St Petersburg and Voltaire, the Hermitage fills with paintings, and the empire stretches from the Baltic to the Pacific.",
     "call": "Empress Catherine the Great, your court is the jewel of the north. Fill your theatres and museums, spend your treasury wisely, and reform the empire as you see fit. Rule with brilliance, and let history call you great."
    },
    "ivan": {
     "scene": "A cold wind blows through the domes of Moscow. Kazan has fallen, Saint Basil's rises beside Red Square, and the first crowned tsar of all Russia watches for enemies without and within.",
     "call": "Tsar Ivan Vasilyevich, the Formidable, your realm is vast and your enemies many. Fortify your cities, defend your borders fiercely, and claim the land around every city you take. Be feared, Tsar, and be unconquerable."
    },
    "isabella": {
     "scene": "Granada has fallen and the long Reconquista is over. In the royal camp at Santa Fe, a Genoese navigator unrolls his charts and asks the queen for three ships and a wild chance.",
     "call": "Queen Isabella of Castile, the horizon beckons across the Ocean Sea. Found colonies on distant shores and give them a strong start, and let no rival stand in your way. Venture beyond, and a new world will open before you."
    },
    "philip": {
     "scene": "Galleons crowd the harbour at Lisbon, red crosses on their sails. The ruler of an empire spanning the globe prepares the greatest fleet Europe has ever seen.",
     "call": "King Philip II of Spain, your realms circle the world. Build your armada, sail in close formation, and honour your shrines. Command the seas, Majesty, and let no rival fleet stand against you."
    },
    "mehmed": {
     "scene": "The walls of Constantinople have stood for a thousand years. Outside them the young sultan's great bronze cannon stand ready, and his ships are hauled over the hills into the Golden Horn.",
     "call": "Sultan Mehmed II, a city unlike any other lies before you. Bring your siege guns to bear on every wall, and claim the capitals of your rivals. Take the city, Sultan, and a new age begins."
    },
    "suleiman": {
     "scene": "Istanbul is the heart of an empire spanning three continents. Sinan's domes rise above the city, and the sultan's jurists write laws for a realm of many peoples.",
     "call": "Suleiman Kanuni, the Lawgiver, justice is your greatest strength. Keep your people content, bring peace to lands you conquer, and let your empire grow without drowning in paperwork. Rule wisely, Magnificent One."
    },
    "sejong": {
     "scene": "In the Hall of Worthies in Hanyang, scholars work through the night. Rain gauges and water clocks are tested in the courtyard, and a new alphabet takes shape, simple enough to learn in a single morning.",
     "call": "King Sejong the Great, you have given your people the gift of letters. Pursue knowledge endlessly, spread learning to every town, and let each discovery become the people's pride. Illuminate the kingdom, Jeonha."
    },
    "sunsin": {
     "scene": "Japanese fleets fill the straits near Busan. In a quiet harbour the admiral's turtle ships, their roofs bristling with spikes, ready their cannon, and a handful of warships prepare to hold the sea.",
     "call": "Admiral Yi Sun-sin, your fleet is small but mighty. Make your turtle ships an unbreakable wall, move swiftly between the islands, and guard every coastal city. Hold the strait; all of Joseon depends on you."
    },
    "trung": {
     "scene": "Under Han rule, the people of Giao Chi chafe beneath heavy taxes and harsh governors. When her husband is executed, a noblewoman and her sister ride out on war elephants, and the whole land rises with them.",
     "call": "Queen Trưng Trắc, with your sister Trưng Nhị beside you, your people will not be conquered. Defend every town, raise walls, and let every loss spark a new uprising. Lead the rebellion, Queen, and free your homeland."
    },
    "leloi": {
     "scene": "In the forests of Lam Sơn, a landowner's band strikes from the trees and vanishes again. The Ming occupation is weakening, and a legend of a magic sword grows in the villages.",
     "call": "Bình Định Vương Lê Lợi, the forests are your fortress. Move unseen through the trees, strike swiftly, and let every victory grow your legend. Win back the land, and one day return the sword to the lake."
    },
    "menelik": {
     "scene": "Italian columns advance into the highlands of Tigray. At Adwa, armies gather from every province of Ethiopia, and bells ring in the mountain churches as the emperor and Empress Taytu march north.",
     "call": "Emperor Menelik II, King of Kings, your mountains have never known a foreign master. Defend your homeland, and let every invader who falls on your soil raise your standing among the nations. Hold the high ground, Atse, and Ethiopia will stay free."
    },
    "zara": {
     "scene": "Incense drifts through the new churches of Debre Berhan. Scribes copy sacred texts by candlelight, and the emperor himself writes a work of faith and learning called the Book of Light.",
     "call": "Negusa Nagast Zara Yaqob, faith and scholarship are the foundations of your empire. Build shrines that nourish mind and spirit, and keep your people content. Let the light shine from every hill."
    },
    "mansa": {
     "scene": "A caravan crosses the Sahara toward Mecca, so rich that gold given away in Cairo lowers its price for years. Back in Timbuktu, masons raise a great mosque of mud and timber.",
     "call": "Mansa Musa of Mali, richest of rulers, your caravans make friends wherever they travel. Found new towns, trade salt for gold, and let your pilgrims carry your story abroad. Journey on, Mansa, and let the world marvel."
    },
    "sundiata": {
     "scene": "Drums and the voices of the griots carry across the savanna at Kirina. The Lion of Mali has returned from exile, and the Mande clans ride out with him against the sorcerer-king Sumanguru.",
     "call": "Sundiata Keita, Lion of Mali, the epic of your people begins with you. Lead your horsemen to victory, then gather the clans under one charter so your cities thrive in peace. Roar, Mansa, and let the griots sing."
    },
    "harald": {
     "scene": "Longships run up the Humber on the autumn tide. Harald Hardrada, veteran of the Varangian Guard in Constantinople and king of Norway, has come to claim the throne of England.",
     "call": "King Harald Hardrada, last of the great Vikings, the sea road is your home. Fight from the coast, raid the shore, and let every strike fill your treasure hold. Take the land, and let the sagas remember you."
    },
    "olav": {
     "scene": "Dragon-prowed ships cut through the fjords. A king who has sailed from Kiev to England has come home to Norway with a new faith and a strong hand.",
     "call": "King Olav Tryggvason, you bring the cross across the northern seas. Raise shrines, command your ships, and let every town you take share your faith. Sail on, and bring Norway together as one kingdom."
    },
    "hammurabi": {
     "scene": "In Babylon beside the Euphrates, a black stone pillar is raised in the temple. Beneath an image of the sun god Shamash, laws are carved into its surface for all to read.",
     "call": "Hammurabi, King of Babylon, you bring order out of chaos. Raise your monuments, strengthen your cities, and let each new law lead to the next. Let justice be seen, and your kingdom will stand."
    },
    "nebuchadnezzar": {
     "scene": "The Ishtar Gate gleams with blue glazed brick and golden lions. Above the Euphrates, terraced gardens are said to climb toward the sky, a green mountain in the flat land of Babylon.",
     "call": "Nebuchadnezzar, King of Babylon, you rebuild the greatest city on earth. Raise wonders, guard your rivers, and let your cities flourish along their banks. Build, Great King, and let Babylon rise again."
    },
    "kamehameha": {
     "scene": "War canoes cross the channels between the islands. On the Big Island, a chief who by legend overturned the mighty Naha Stone gathers his warriors to unite Hawai'i under one rule.",
     "call": "Kamehameha the Great, the ocean joins your people together. Nourish your coastal towns, command your war canoes, and bring the islands under one rule. Unite them, Mō'ī, and bring peace to the land."
    },
    "hotu": {
     "scene": "After weeks on the open Pacific, voyaging canoes sight a lonely island. The ariki Hotu Matu'a steps ashore at Anakena, and his people begin to shape a new home from volcanic stone.",
     "call": "Ariki Hotu Matu'a, founder of Rapa Nui, your people will carve their ancestors in stone. Raise monuments and wonders, and let the quarries feed your towns. Carve your legacy, Ariki, and let the moai watch over your people."
    },
    "franz_joseph": {
     "scene": "Waltzes drift from Vienna's ballrooms, and a grand boulevard rises where the old city walls once stood. Coffee houses buzz, and the dual monarchy stretches from the Alps to the Carpathians.",
     "call": "Franz Joseph, Emperor of Austria and King of Hungary, your reign is long and your capital grand. Build boldly, keep your many peoples content, and let every new building add to Vienna's glory. Rule with patience, Majesty, and hold the realm together."
    },
    "maria_theresa": {
     "scene": "Europe's armies circle the young ruler's inheritance. In Vienna, between war councils and nurseries, she plans schools, reforms and a state strong enough to survive.",
     "call": "Maria Theresa, the only woman to rule the Habsburg lands in her own right, you will not let your realm fall. Open schools in every town, build libraries, and let learning make your people strong. Reform, Empress, and your realm will endure."
    },
    "sisi": {
     "scene": "Budapest celebrates as Elisabeth is crowned Queen of Hungary. Beloved by the Hungarians, the empress rides, writes poetry and travels far from the stiff formality of the Viennese court.",
     "call": "Empress Elisabeth, beloved Sisi, your grace has captivated a nation. Delight in life's luxuries, win the hearts of your people, and let your fame spread across Europe. Shine, Empress, and let the world adore you."
    },
    "hannibal": {
     "scene": "Elephants trumpet in the cold of the Alpine passes. Snow falls on Numidian horsemen and African infantry, and far below lie the green plains of Italy and the enemy's heartland.",
     "call": "Hannibal Barca, son of Hamilcar, no mountain can halt your march. Cross the peaks, lead your horsemen boldly, and let your army live off enemy lands. March on, and make Rome tremble."
    },
    "dido": {
     "scene": "A Phoenician princess lands on the African coast with loyal followers. Offered only as much land as an oxhide can cover, she cuts it into thin strips and encircles an entire hill.",
     "call": "Queen Dido, founder of Carthage, cleverness is your greatest treasure. Found new settlements, let your colonists spread along the coast, and fill your coffers from the sea. Build your city, Queen, and let it rival any empire."
    },
    "justinian": {
     "scene": "The great dome of Hagia Sophia rises over Constantinople, seeming to float on light. In the palace, jurists gather a thousand years of Roman law into a single code.",
     "call": "Basileus Justinian, you dream of restoring the glory of Rome. Reform the laws, build wonders that astonish, and let your architects work miracles. Restore the empire, and let Constantinople shine."
    },
    "theodora": {
     "scene": "The Nika riots burn through Constantinople and the emperor's ships stand ready to flee. In the council chamber the empress rises and declares that royal purple makes a fine burial shroud.",
     "call": "Augusta Theodora, you rose from the circus to the throne. Stand firm when others flee, defend your cities in their darkest hours, and welcome all who seek refuge. Hold the city, Augusta, and let courage be your crown."
    },
    "basil": {
     "scene": "The Balkan passes echo with the tramp of Byzantine armies, season after season. The emperor has sworn to win this long war with Bulgaria, however many years it takes.",
     "call": "Basil II, Emperor of the Romans, patience is your sharpest weapon. Wage war relentlessly, heal your soldiers at home, and let every captured city fill your treasury. Endure, Basileus, and the victory will be yours alone."
    },
    "casimir": {
     "scene": "Across Poland, wooden towns are giving way to brick walls and churches. In Kraków a new university opens its doors, and merchants crowd the cloth hall in the market square.",
     "call": "King Casimir the Great, you found Poland built of wood and will leave it built of brick. Build and fortify at little cost, let your cities grow, and protect your people. Build, King, and let the kingdom endure for centuries."
    },
    "jadwiga": {
     "scene": "In Wawel Cathedral a girl not yet in her teens is crowned King, not Queen, of Poland. Soon a marriage will bind Poland and Lithuania, and carry her faith to a new nation.",
     "call": "King Jadwiga of Poland, your union will join two peoples. Spread your faith through friendship, send your pilgrims far, and build a bond to last centuries. Rule with grace, and let love of learning be your legacy."
    },
    "sobieski": {
     "scene": "The Ottoman army encircles Vienna. On the slopes of the Kahlenberg, the winged hussars wait in the September morning, feathers rustling, for their king to give the signal.",
     "call": "King Jan III Sobieski, the city stands on the brink. Lead your horsemen in the greatest cavalry charge in history, and defend your allies wherever they stand. We came, we saw, God conquered; now charge."
    },
    "ashurbanipal": {
     "scene": "In the palace at Nineveh, scribes copy clay tablets from every corner of the empire. The king himself reads cuneiform, and his library gathers the wisdom of Mesopotamia, from omens to the epic of Gilgamesh.",
     "call": "Ashurbanipal, King of the Universe, knowledge is your greatest treasure. Place libraries in every city you win, and let learning spread across your empire. Gather the world's wisdom, and preserve it for all time."
    },
    "tiglath": {
     "scene": "The arsenals of Kalhu ring with iron. The new king has raised a standing army of professional soldiers, and his engineers roll battering rams toward the walls of rebel cities.",
     "call": "Tiglath-Pileser, King of Assyria, your army is always ready. Train your soldiers, bring your siege engines forward swiftly, and hold every position you take. March, King, and remake the Near East."
    },
    "amanirenas": {
     "scene": "Roman soldiers have pushed up the Nile to Aswan. From Meroë the one-eyed queen of Kush leads her armies north to strike first, and brings home a bronze head of Augustus to bury beneath a temple's steps.",
     "call": "Kandake Amanirenas, one-eyed and unbowed, Rome does not frighten you. Defend your homeland against invaders from afar, and make peace only on your own terms. Hold the Land of the Bow, and let Rome come to you."
    },
    "piye": {
     "scene": "From Napata in the south, the Kushite king sails down the Nile with his army. The temples of Amun await, and a divided Egypt is about to be united under the rule of Kush.",
     "call": "Piye, Pharaoh of Kush, you come as a guardian of Egypt's ancient faith. Take cities with respect for their temples, and let those who share your faith welcome you. Unite the Two Lands, Pharaoh."
    },
    "henry_navigator": {
     "scene": "On the windswept headland of Sagres, map-makers and shipwrights gather. Caravels with lateen sails set out along the African coast, each one venturing a little farther than the last.",
     "call": "Infante Henry, the Navigator, the unknown lies just past the horizon. Send your scouts ahead, profit from each discovery, and build your ships for less. Chart the unknown, and let Portugal lead the age of discovery."
    },
    "joao": {
     "scene": "Bartolomeu Dias has rounded the Cape of Storms, and Lisbon's quays are busy with ships. In a Castilian town, envoys draw a line from pole to pole to divide the world.",
     "call": "King João II, the Perfect Prince, the sea is your highway. Build strong ships, set up trading posts on every coast, and let your empire span the oceans. Sail, Prince, and claim your side of the line."
    },
    "william_orange": {
     "scene": "The dykes are opened and the sea floods the fields around Leiden. Spanish besiegers retreat through the rising water, and the Sea Beggars sail in over the drowned land to relieve the city.",
     "call": "William of Orange, Father of the Fatherland, the water itself fights for you. Defend your coasts and rivers, keep your people united and hopeful, and never yield. Hold the line, Stadtholder, and a republic will be born."
    },
    "dewitt": {
     "scene": "Amsterdam's canals are crowded with ships, and its warehouses overflow with spice and silk. The exchange buzzes with traders, and the Republic's Grand Pensionary balances the books by candlelight.",
     "call": "Johan de Witt, Grand Pensionary of Holland, true freedom is your guiding star. Invest wisely, build your navy for less, and let your treasury work for you. Trust in commerce, and let the Republic prosper."
    },
    "jayavarman": {
     "scene": "The serene stone faces of the Bayon smile over Angkor Thom. Rest houses line the roads and hospitals care for the sick, built by a king who says the suffering of his people is his own.",
     "call": "Jayavarman VII, King of the Khmer, compassion is the foundation of your rule. Build temples and hospitals, heal your people and your soldiers, and let serenity reign. Rule with a smile, Devaraja, and Angkor will flourish."
    },
    "suryavarman": {
     "scene": "Thousands of workers shape sandstone blocks outside Yasodharapura. A temple mountain dedicated to Vishnu rises from its moat, its five towers echoing the peaks of Mount Meru.",
     "call": "Suryavarman II, Lord of Angkor, you are building heaven on earth. Make every wonder a sacred site, spread your faith, and let your armies fight beside the cities that share it. Build, Devaraja, and let the gods walk in Angkor."
    },
    "nzinga": {
     "scene": "Portuguese forts line the coast and push inland into Ndongo. The queen who once sat as an equal before their governor refuses to kneel, and from the forests and marshes of Matamba she leads a long resistance.",
     "call": "Ngola Nzinga Mbande, Queen of Ndongo and Matamba, you negotiate as an equal and fight like a lioness. Resist invaders from across the sea, use the forests and marshes, and make allies of your enemies' enemies. Never kneel, Ngola."
    },
    "afonso": {
     "scene": "Mbanza Kongo is busy with markets and royal courts. The king writes letters to Lisbon and Rome in his own voice, and new churches rise in the capital.",
     "call": "Manikongo Afonso I, Mvemba a Nzinga, faith and learning shape your kingdom. Let your pilgrims tell their story far and wide, build shrines in every town, and let knowledge flourish. Lead your people, and let Kongo speak for itself."
    }
   }
  };
})(globalThis.AU = globalThis.AU || {});
