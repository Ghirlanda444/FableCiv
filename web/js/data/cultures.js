// Artistic art groups : every civilization belongs to one, and units and
// buildings can have a picture per group (web/assets/units/<culture>/<unit>.png), falling back to the shared picture.
(function (AU) {
  AU.CULTURES = {
    mediterranean: { name: 'Mediterranean', people: 'light olive skin, brown or black hair, dark eyes', gear: 'classical Greco-Roman style', arch: 'Mediterranean architecture with white marble columns, arches, terracotta tiled roofs and cypress trees' },
    european: { name: 'European', people: 'fair skin, blond or light brown hair, blue or green eyes', gear: 'medieval and early-modern western European style', arch: 'European architecture with timber-framed walls, grey stone, steep slate roofs and pointed towers' },
    middle_eastern: { name: 'Middle Eastern', people: 'olive to brown skin, black hair, dark eyes, often a beard', gear: 'Persian and Arabian style with turbans, curved swords and flowing robes', arch: 'Middle Eastern architecture with mudbrick walls, domes, pointed arches, minarets and blue tiles' },
    east_asian: { name: 'East Asian', people: 'light skin, straight black hair, narrow dark eyes', gear: 'East Asian style with lacquered armour and silk', arch: 'East Asian architecture with curved tiled pagoda roofs, red wooden pillars and paper screens' },
    south_asian: { name: 'South and Southeast Asian', people: 'tan to brown skin, straight black hair, dark eyes', gear: 'Indian and Southeast Asian style with turbans or conical hats, sampots, dhotis and gilded ornaments', arch: 'South and Southeast Asian architecture with tiered golden roofs, carved sandstone towers, onion domes and ornate arches' },
    african: { name: 'African', people: 'dark brown skin, short black curly hair, dark eyes', gear: 'sub-Saharan African style with cowhide shields, beads and bright patterned cloth', arch: 'African architecture with adobe and mud-brick walls, thatched conical roofs and carved wooden posts' },
    mesoamerican: { name: 'Indigenous American', people: 'copper-brown skin, straight black hair, dark eyes', gear: 'Aztec, Maya, Inca and Native North American style with feathered headdresses, beadwork, jade and obsidian weapons', arch: 'Indigenous American architecture with stepped stone pyramids, carved glyphs, painted plaster, longhouses and totem carvings' }
  };
  var MAP = {
    rome: 'mediterranean', greece: 'mediterranean', carthage: 'mediterranean', byzantium: 'mediterranean', spain: 'mediterranean', portugal: 'mediterranean',
    germany: 'european', austria_hungary: 'european', france: 'european', england: 'european', celts: 'european', norway: 'european', netherlands: 'european', poland: 'european', russia: 'european',
    america: 'european',
    china: 'east_asian', japan: 'east_asian', korea: 'east_asian', mongolia: 'east_asian',
    vietnam: 'south_asian', khmer: 'south_asian', indonesia: 'south_asian',
    india: 'south_asian',
    persia: 'middle_eastern', arabia: 'middle_eastern', ottoman: 'middle_eastern', babylon: 'middle_eastern', assyria: 'middle_eastern', egypt: 'middle_eastern',
    zulu: 'african', mali: 'african', ethiopia: 'african', kongo: 'african', nubia: 'african',
    aztec: 'mesoamerican', maya: 'mesoamerican', inca: 'mesoamerican',
    shawnee: 'mesoamerican', polynesia: 'south_asian',
    // city-states
    venice: 'mediterranean', bologna: 'mediterranean', valletta: 'mediterranean', geneva: 'european', vilnius: 'european', armagh: 'european', preslav: 'european', wolin: 'european', brussels: 'european',
    toronto: 'european', auckland: 'european', buenos_aires: 'european', lhasa: 'east_asian', singapore: 'south_asian', nalanda: 'south_asian', mohenjo_daro: 'south_asian', kandy: 'south_asian', lahore: 'south_asian',
    samarkand: 'middle_eastern', muscat: 'middle_eastern', anshan: 'middle_eastern', jerusalem: 'middle_eastern', yerevan: 'middle_eastern', kabul: 'middle_eastern',
    zanzibar: 'african', mogadishu: 'african', kumasi: 'african', antananarivo: 'african', chinguetti: 'african', ngazargamu: 'african', johannesburg: 'african', mitla: 'mesoamerican', cahokia: 'mesoamerican', nan_madol: 'south_asian'
  };
  AU.CIV_CULTURE = MAP;
  AU.CIVS.forEach(function (c) { c.culture = MAP[c.id] || 'european'; });
  (AU.CITY_STATES || []).forEach(function (s) { s.culture = MAP[s.id] || 'european'; });
  AU.cultureOf = function (civOrData) { if (!civOrData) return null; var d = civOrData.civId ? (AU.CIV_BY_ID[civOrData.civId] || AU.CITY_STATE_BY_ID[civOrData.civId]) : civOrData; return d && d.culture || null; };
})(globalThis.AU = globalThis.AU || {});
