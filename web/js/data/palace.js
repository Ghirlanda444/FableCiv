// "Build your palace" (Civ 1 & 2): as your people prosper they offer to add a piece to the palace.
// Every piece is chosen in an architectural style; styles can be mixed freely.
(function (AU) {
  // Pieces in build order. x/y/w are layout positions on a 640x400 canvas (bottom-anchored), z is draw order.
  AU.PALACE_PIECES = [
    { id: 'hall',        name: 'Great Hall',      desc: 'The heart of the palace.',                  x: 320, y: 305, w: 210, z: 5, maxH: 210, needs: [] },
    { id: 'left_wing',   name: 'West Wing',       desc: 'Apartments and audience rooms.',           x: 185, y: 312, w: 150, z: 4, maxH: 130, needs: ['hall'] },
    { id: 'right_wing',  name: 'East Wing',       desc: 'The treasury and the archives.',           x: 455, y: 312, w: 150, z: 4, maxH: 130, needs: ['hall'] },
    { id: 'dome',        name: 'Crown',           desc: 'Dome, pagoda roof or spire over the hall.', x: 320, y: 128, w: 150, z: 6, maxH: 62, needs: ['hall'] },
    { id: 'tower_left',  name: 'West Tower',      desc: 'A watchtower over the gardens.',           x: 95, y: 312, w: 90,  z: 3, maxH: 200, needs: ['left_wing'] },
    { id: 'tower_right', name: 'East Tower',      desc: 'A bell tower or minaret.',                 x: 545, y: 312, w: 90,  z: 3, maxH: 200, needs: ['right_wing'] },
    { id: 'gate',        name: 'Grand Gate',      desc: 'The ceremonial entrance.',                 x: 320, y: 358, w: 120, z: 8, maxH: 90, needs: ['hall'] },
    { id: 'walls',       name: 'Outer Walls',     desc: 'Walls and battlements around the grounds.', x: 320, y: 356, w: 560, z: 7, maxH: 70, needs: ['gate'] },
    { id: 'gardens',     name: 'Gardens',         desc: 'Trees, hedges and flower beds.',           x: 150, y: 392, w: 190, z: 9, maxH: 90, needs: ['left_wing'] },
    { id: 'fountain',    name: 'Fountain',        desc: 'A fountain or reflecting pool.',           x: 490, y: 392, w: 150, z: 9, maxH: 90, needs: ['right_wing'] },
    { id: 'statue',      name: 'Monument',        desc: 'A statue of the founder.',                 x: 320, y: 396, w: 70,  z: 10, maxH: 80, needs: ['gate'] },
    { id: 'banners',     name: 'Banners',         desc: 'Flags and banners in your colours.',       x: 320, y: 112, w: 240, z: 11, maxH: 48, needs: ['dome'] }
  ];
  AU.PALACE_PIECE_BY_ID = {}; AU.PALACE_PIECES.forEach(function (p) { AU.PALACE_PIECE_BY_ID[p.id] = p; });
  // Architectural styles: one per cultural art group, with the colours the fallback painter uses.
  AU.PALACE_STYLES = {
    mediterranean:   { name: 'Classical',      look: 'white marble with red-tiled roofs, columns and round arches',        wall: '#efe7d6', roof: '#b0432f', trim: '#d9c27a', roofShape: 'gable' },
    european:        { name: 'Gothic',         look: 'grey stone with steep slate roofs, pointed arches and spires',        wall: '#c9c4bd', roof: '#4f5a6e', trim: '#8f8a80', roofShape: 'steep' },
    new_world:       { name: 'Federal',        look: 'red brick and white trim, columns, a copper dome',                     wall: '#b8624a', roof: '#4d7d6b', trim: '#f2ece0', roofShape: 'dome' },
    east_asian:      { name: 'Pagoda',         look: 'red lacquered wood, curved tiered roofs with upturned eaves, gold trim', wall: '#b23a2c', roof: '#3d4a5c', trim: '#e8b84a', roofShape: 'pagoda' },
    southeast_asian: { name: 'Khmer',          look: 'sandstone towers with tiered golden spires and carved reliefs',        wall: '#c9a06b', roof: '#e0b23f', trim: '#7d5a33', roofShape: 'spire' },
    south_asian:     { name: 'Mughal',         look: 'white marble and red sandstone, onion domes, chhatri kiosks',          wall: '#f2eadb', roof: '#e9ecef', trim: '#b8412f', roofShape: 'onion' },
    middle_eastern:  { name: 'Persian',        look: 'blue and turquoise glazed tiles, pointed domes and slender minarets', wall: '#e2d3b0', roof: '#2f8fb3', trim: '#d7b15c', roofShape: 'onion' },
    african:         { name: 'Sahelian',       look: 'ochre mud-brick with wooden beams, conical thatched roofs, stone towers', wall: '#c98a4a', roof: '#8a6a3a', trim: '#5c3d1e', roofShape: 'cone' },
    mesoamerican:    { name: 'Stepped',        look: 'stepped stone pyramids, carved masks, bright painted friezes',        wall: '#b7a889', roof: '#c8433a', trim: '#2f9c8a', roofShape: 'step' },
    native_american: { name: 'Longhouse',      look: 'timber longhouses and lodges, bark and hide roofs, totem carvings',   wall: '#9c7248', roof: '#5f4a30', trim: '#d9b36a', roofShape: 'round' },
    polynesian:      { name: 'Marae',          look: 'carved wooden posts, thatched roofs, stone platforms',                 wall: '#a37a4d', roof: '#c9b26a', trim: '#3f2a18', roofShape: 'gable' }
  };
})(globalThis.AU = globalThis.AU || {});
