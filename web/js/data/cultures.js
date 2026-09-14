// Cultural art groups (like Civilization IV's art styles): every civilization belongs to one, and units and
// buildings can have a picture per group (web/assets/units/<culture>/<unit>.png), falling back to the shared picture.
(function (AU) {
  AU.CULTURES = {
    mediterranean: { name: 'Mediterranean', people: 'light olive skin, brown or black hair, dark eyes', gear: 'classical Greco-Roman style', arch: 'Mediterranean architecture with white marble columns, arches, terracotta tiled roofs and cypress trees' },
    european: { name: 'European', people: 'fair skin, blond or light brown hair, blue or green eyes', gear: 'medieval and early-modern western European style', arch: 'northern European architecture with timber-framed walls, grey stone, steep slate roofs and pointed towers' },
    new_world: { name: 'New World', people: 'mixed light and tan skin tones, brown hair', gear: 'colonial and modern western style', arch: 'colonial and modern architecture with red brick, white wooden porches, iron and glass' },
    east_asian: { name: 'East Asian', people: 'light skin, straight black hair, narrow dark eyes', gear: 'East Asian style with lacquered armour and silk', arch: 'East Asian architecture with curved tiled pagoda roofs, red wooden pillars and paper screens' },
    southeast_asian: { name: 'Southeast Asian', people: 'tan skin, straight black hair, dark eyes', gear: 'Southeast Asian style with conical hats, sampots and gilded ornaments', arch: 'Southeast Asian architecture with tiered golden roofs, Khmer stone towers and stilt houses' },
    south_asian: { name: 'South Asian', people: 'brown skin, black hair, dark eyes', gear: 'Indian style with turbans, dhotis and gilded scale armour', arch: 'South Asian architecture with onion domes, carved sandstone, chhatri pavilions and ornate arches' },
    middle_eastern: { name: 'Middle Eastern', people: 'olive to brown skin, black hair, dark eyes, often a beard', gear: 'Persian and Arabian style with turbans, curved swords and flowing robes', arch: 'Middle Eastern architecture with mudbrick walls, domes, pointed arches, minarets and blue tiles' },
    african: { name: 'African', people: 'dark brown skin, short black curly hair, dark eyes', gear: 'sub-Saharan African style with cowhide shields, beads and bright patterned cloth', arch: 'African architecture with adobe and mud-brick walls, thatched conical roofs and carved wooden posts' },
    mesoamerican: { name: 'Mesoamerican and Andean', people: 'copper-brown skin, straight black hair, dark eyes', gear: 'Aztec, Maya and Inca style with feathered headdresses, jade and obsidian weapons', arch: 'Mesoamerican architecture with stepped stone pyramids, carved glyphs and painted plaster' },
    native_american: { name: 'Native American', people: 'copper-brown skin, long straight black hair, dark eyes', gear: 'Native North American style with feathers, buckskin and beadwork', arch: 'Native North American architecture with wooden longhouses, palisades, tipis and totem carvings' },
    polynesian: { name: 'Polynesian', people: 'brown skin, black wavy hair, dark eyes, tribal tattoos', gear: 'Polynesian style with bark cloth, feather capes, shark-tooth weapons and tattoos', arch: 'Polynesian architecture with thatched A-frame huts, carved wooden posts, palm trees and stone platforms' }
  };
  var MAP = {
    rome: 'mediterranean', greece: 'mediterranean', carthage: 'mediterranean', byzantium: 'mediterranean', spain: 'mediterranean', portugal: 'mediterranean', georgia: 'mediterranean',
    germany: 'european', france: 'european', england: 'european', scotland: 'european', celts: 'european', norway: 'european', sweden: 'european', netherlands: 'european', holy_roman_empire: 'european', austria_hungary: 'european', poland: 'european', russia: 'european',
    america: 'new_world', australia: 'new_world', brazil: 'new_world',
    china: 'east_asian', japan: 'east_asian', korea: 'east_asian', mongolia: 'east_asian',
    vietnam: 'southeast_asian', khmer: 'southeast_asian', siam: 'southeast_asian', indonesia: 'southeast_asian',
    india: 'south_asian',
    persia: 'middle_eastern', arabia: 'middle_eastern', ottoman: 'middle_eastern', babylon: 'middle_eastern', sumer: 'middle_eastern', hittites: 'middle_eastern', assyria: 'middle_eastern', egypt: 'middle_eastern',
    zulu: 'african', mali: 'african', ethiopia: 'african', kongo: 'african', nubia: 'african',
    aztec: 'mesoamerican', maya: 'mesoamerican', inca: 'mesoamerican', mapuche: 'mesoamerican',
    shawnee: 'native_american', polynesia: 'polynesian',
    // city-states
    venice: 'mediterranean', bologna: 'mediterranean', valletta: 'mediterranean', geneva: 'european', vilnius: 'european', armagh: 'european', preslav: 'european', wolin: 'european', brussels: 'european',
    toronto: 'new_world', auckland: 'new_world', buenos_aires: 'new_world', lhasa: 'east_asian', singapore: 'southeast_asian', nalanda: 'south_asian', mohenjo_daro: 'south_asian', kandy: 'south_asian', lahore: 'south_asian',
    samarkand: 'middle_eastern', muscat: 'middle_eastern', anshan: 'middle_eastern', jerusalem: 'middle_eastern', yerevan: 'middle_eastern', kabul: 'middle_eastern',
    zanzibar: 'african', mogadishu: 'african', kumasi: 'african', antananarivo: 'african', chinguetti: 'african', ngazargamu: 'african', johannesburg: 'african', mitla: 'mesoamerican', cahokia: 'native_american', nan_madol: 'polynesian'
  };
  AU.CIV_CULTURE = MAP;
  AU.CIVS.forEach(function (c) { c.culture = MAP[c.id] || 'european'; });
  (AU.CITY_STATES || []).forEach(function (s) { s.culture = MAP[s.id] || 'european'; });
  AU.cultureOf = function (civOrData) { if (!civOrData) return null; var d = civOrData.civId ? (AU.CIV_BY_ID[civOrData.civId] || AU.CITY_STATE_BY_ID[civOrData.civId]) : civOrData; return d && d.culture || null; };
})(globalThis.AU = globalThis.AU || {});
