"use strict";
// Tile-by-tile layout for the KayKit art (CC0, Kay Lousberg: Medieval Hexagon Pack + Adventurers characters, in assets/kaykit).
// Plain JS so Node can test it (tools/godot/test-geo.js); main.js turns the lists into instanced meshes and character nodes.
// KayKit hexes are pointy-top like the map but 2.31 wide, so every model is scaled by S to our hex radius of 1.
// Instance entries: [x, y, z, yaw, scale, r, g, b, a] where (r, g, b, a) is the shader's per-instance colour (linear) and strength.

const SQRT3 = Math.sqrt(3), S = SQRT3 / 2, STEP = Math.PI / 3;
const WATER_Y = -0.05;       // the animated water surface
const OCEAN_DROP = -0.12;    // open ocean tiles sit lower than coast and lakes, so depth reads at a glance

function center(col, row) { return [SQRT3 * (col + 0.5 * (row & 1)), 1.5 * row]; }
function pick(x, z, W, H) {
  const q = (SQRT3 / 3 * x - z / 3), r = 2 / 3 * z, s = -q - r;
  let rq = Math.round(q), rr = Math.round(r); const rs = Math.round(s);
  const dq = Math.abs(rq - q), dr = Math.abs(rr - r), ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs; else if (dr > ds) rr = -rq - rs;
  const row = rr, col = rq + ((rr - (rr & 1)) >> 1);
  return col >= 0 && col < W && row >= 0 && row < H ? row * W + col : -1;
}
// neighbour in direction j (angle 60·j from +x toward +z), or -1
function toward(g, t, j) { const c = center(t.col, t.row); return pick(c[0] + SQRT3 * Math.cos(STEP * j), c[1] + SQRT3 * Math.sin(STEP * j), g.W, g.H); }
function hash1(i) { let h = (i * 2654435761) >>> 0; h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13; return (h >>> 0) / 4294967296; }
function lin(hex, a) { const v = parseInt(String(hex).replace('#', ''), 16); return [Math.pow(((v >> 16) & 255) / 255, 2.2), Math.pow(((v >> 8) & 255) / 255, 2.2), Math.pow((v & 255) / 255, 2.2), a === undefined ? 1 : a]; }
const isWater = (AU, t) => !!((AU.TERRAIN[t.terrain] || {}).water);

// River tiles: directions (60·j) whose edge carries water in each model, measured from the meshes (tools/godot/kaykit-edges.js).
const RIVERS = { A: [0, 3], B: [3, 5], C: [3, 4], D: [1, 3, 5], E: [0, 3, 5], F: [0, 1, 3], G: [2, 3, 4], H: [0, 2, 3, 4], I: [1, 2, 4, 5], J: [0, 1, 2, 3], K: [1, 2, 3, 4, 5], L: [0, 1, 2, 3, 4, 5] };
// A model turned by yaw r·60° moves its direction j to j − r.
function riverFor(dirs) {
  const want = dirs.slice().sort().join(',');
  for (const k of Object.keys(RIVERS)) for (let r = 0; r < 6; r++) if (RIVERS[k].map(j => ((j - r) % 6 + 6) % 6).sort().join(',') === want) return { model: 'hex_river_' + k, yaw: r * STEP };
  return null;
}

// grass recolour per terrain (sRGB): the pack only ships grassland, so other terrains reuse its tiles and decorations in their colours
const GROUND = { grassland: '#7fc23a', plains: '#b8c04a', desert: '#ecd49c', tundra: '#a3a985', snow: '#eef3f6', mountain: '#a9a96c' };

// which edges of a river tile carry the river: links between consecutive path tiles, plus the mouth into the sea at a path's end
function riverDirs(AU, g) {
  const dirs = {};
  const link = (a, b) => { const A = g.tiles[a]; for (let j = 0; j < 6; j++) if (toward(g, A, j) === b) { (dirs[a] = dirs[a] || new Set()).add(j); return; } };
  (g.rivers || []).forEach(path => {
    for (let k = 0; k + 1 < path.length; k++) { link(path[k], path[k + 1]); link(path[k + 1], path[k]); }
    const end = g.tiles[path[path.length - 1]];
    if (end) for (let j = 0; j < 6; j++) { const n = toward(g, end, j); if (n >= 0 && isWater(AU, g.tiles[n])) { (dirs[end.i] = dirs[end.i] || new Set()).add(j); break; } }
  });
  return dirs;
}

// Static map: ground tiles, rivers and nature. Settled tiles stay clear for buildings; worked flat land shows grain fields.
function buildStatic(AU, g) {
  const out = {}, add = (m, e) => (out[m] = out[m] || []).push(e), rdirs = riverDirs(AU, g);
  g.tiles.forEach(t => {
    const c = center(t.col, t.row), rnd = k => hash1(t.i * 613 + k * 97), yaw = Math.floor(rnd(1) * 6) * STEP;
    if (isWater(AU, t)) { add('hex_water', [c[0], t.terrain === 'ocean' ? OCEAN_DROP : 0, c[1], yaw, S, 0, 0, 0, 0]); return; }
    const ground = lin(GROUND[t.terrain] || GROUND.grassland, 1);
    if (t.feature === 'marsh') { ground[0] *= 0.7; ground[1] *= 0.85; ground[2] = Math.max(ground[2], 0.08); }
    let tile = { model: 'hex_grass', yaw };
    if (rdirs[t.i]) {
      const d = Array.from(rdirs[t.i]);
      tile = riverFor(d.length === 1 ? [d[0], (d[0] + 3) % 6] : d) || tile; // a river's source runs straight on into its first tile
    }
    add(tile.model, [c[0], 0, c[1], tile.yaw, S, ground[0], ground[1], ground[2], 1]);
    if (t.settlement !== undefined && t.settlement !== null && g.settlements[t.settlement]) return;
    const forest = t.feature === 'forest' || t.feature === 'jungle', v = 'ABC'[Math.floor(rnd(2) * 3)];
    if (t.terrain === 'mountain') add('mountain_' + v + (forest ? '_grass_trees' : ''), [c[0], 0, c[1], yaw, S, ground[0], ground[1], ground[2], 1]);
    else if (t.hills) add('hills_' + v + (forest ? '_trees' : ''), [c[0], 0, c[1], yaw, S, ground[0], ground[1], ground[2], 1]);
    else if (forest) {
      const jungle = t.feature === 'jungle', tint = jungle ? lin('#3f8f3a', 1) : [1, 1, 1, 0];
      add((jungle ? 'trees_B_' : 'trees_A_') + (rnd(3) < 0.55 ? 'large' : 'medium'), [c[0], 0, c[1], yaw, S, tint[0], tint[1], tint[2], tint[3]]);
    }
    else if (t.worked && !rdirs[t.i] && (t.terrain === 'grassland' || t.terrain === 'plains')) add('building_grain', [c[0], 0, c[1], yaw, S * 0.92, 0, 0, 0, 0]);
    else if (t.feature === 'marsh') for (let k = 0; k < 4; k++) { const a = rnd(10 + k) * 6.28, d = 0.25 + rnd(20 + k) * 0.5; add(k % 2 ? 'waterplant_A' : 'waterplant_B', [c[0] + Math.cos(a) * d, 0, c[1] + Math.sin(a) * d, a, S * 1.6, 0, 0, 0, 0]); }
    else if (t.terrain === 'desert' || t.terrain === 'tundra' || t.terrain === 'snow') { if (rnd(4) < 0.5) add('rock_single_' + 'ABCDE'[Math.floor(rnd(5) * 5)], [c[0] + (rnd(6) - 0.5) * 0.8, 0, c[1] + (rnd(7) - 0.5) * 0.8, yaw, S * 1.4, 0, 0, 0, 0]); }
    else if (rnd(8) < 0.18) add(rnd(9) < 0.5 ? 'tree_single_A' : 'tree_single_B', [c[0] + (rnd(6) - 0.5) * 0.9, 0, c[1] + (rnd(7) - 0.5) * 0.9, yaw, S * 0.8, 0, 0, 0, 0]);
  });
  return out;
}
// a key that changes when the static layout must be rebuilt (a new settlement clears its tile; worked tiles grow fields)
function staticKey(g) { const s = Object.keys(g.settlements).map(id => g.settlements[id].tile).sort((a, b) => a - b).join(','); let w = 0; g.tiles.forEach(t => { if (t.worked) w = (w * 31 + t.i) % 1000000007; }); return s + '|' + w; }

// Settlements: a capital castle or a town centre, plus houses and trades that grow with population, all in the owner's colour.
const TRADES = ['building_market_blue', 'building_tavern_blue', 'building_blacksmith_blue', 'building_church_blue', 'building_lumbermill_blue', 'building_barracks_blue'];
// heightAt (optional): ground height for the sculpted painted terrain; without it buildings sit on the flat KayKit tiles
function buildTowns(AU, g, heightAt) {
  const out = {}, add = (m, e) => (out[m] = out[m] || []).push(e);
  Object.keys(g.settlements).forEach(id => {
    const s = g.settlements[id], t = g.tiles[s.tile], civ = g.civs[s.civ]; if (!t || !civ) return;
    const c = center(t.col, t.row), team = lin(civ.color || '#cccccc', 1), rnd = k => hash1(s.id * 389 + k * 53);
    const put = (m, x, z, yaw, sc) => add(m, [x, heightAt ? Math.max(0, heightAt(x, z)) - 0.04 : 0, z, yaw, sc, team[0], team[1], team[2], 1]);
    if (s.isCapital) put('building_castle_blue', c[0], c[1] - 0.05, 0, S * 0.5);
    else if (s.isCity) put('building_tower_A_blue', c[0], c[1], rnd(1) * 6.28, S * 0.6);
    else put('building_well_blue', c[0], c[1], rnd(1) * 6.28, S * 0.7);
    const n = Math.min(6, 2 + Math.floor((s.pop || 1) / (s.isCity ? 2 : 3)));
    for (let k = 0; k < n; k++) {
      const a = STEP * k + 0.5 + rnd(2) * 0.3, d = s.isCapital ? 0.66 : 0.52, x = c[0] + Math.cos(a) * d, z = c[1] + Math.sin(a) * d;
      const m = k >= 2 && s.isCity && rnd(10 + k) < 0.5 ? TRADES[Math.floor(rnd(20 + k) * TRADES.length)] : (rnd(30 + k) < 0.5 ? 'building_home_A_blue' : 'building_home_B_blue');
      put(m, x, z, Math.atan2(c[0] - x, c[1] - z) + (rnd(40 + k) - 0.5) * 0.6, S * (m.indexOf('home') >= 0 ? 0.42 : 0.36));
    }
  });
  return out;
}

// Units as KayKit characters: the model, the gear left visible, the idle animation and where they stand.
const LOADOUT = {
  melee: { model: 'Knight', gear: ['1H_Sword', 'Round_Shield', 'Knight_Helmet', 'Knight_Cape'], anim: 'Idle' },
  antcav: { model: 'Knight', gear: ['2H_Sword', 'Knight_Helmet', 'Knight_Cape'], anim: '2H_Melee_Idle' },
  support: { model: 'Knight', gear: ['1H_Sword', 'Badge_Shield', 'Knight_Cape'], anim: 'Idle' },
  ranged: { model: 'Rogue', gear: ['2H_Crossbow', 'Rogue_Cape'], anim: 'Idle' },
  recon: { model: 'Rogue_Hooded', gear: ['Knife', 'Rogue_Cape'], anim: 'Idle' },
  cavalry: { model: 'Barbarian', gear: ['2H_Axe', 'Barbarian_Hat', 'Barbarian_Cape'], anim: '2H_Melee_Idle' },
  siege: { model: 'Barbarian', gear: ['1H_Axe', 'Barbarian_Round_Shield', 'Barbarian_Cape'], anim: 'Idle' },
  civilian: { model: 'Rogue_Hooded', gear: ['Rogue_Cape'], anim: 'Unarmed_Idle' },
  great: { model: 'Mage', gear: ['2H_Staff', 'Mage_Hat', 'Mage_Cape'], anim: 'Idle' },
};
const GEAR = { // every optional mesh per model (the rest of each character is always shown)
  Knight: ['1H_Sword_Offhand', 'Badge_Shield', 'Rectangle_Shield', 'Round_Shield', 'Spike_Shield', '1H_Sword', '2H_Sword', 'Knight_Helmet', 'Knight_Cape'],
  Barbarian: ['1H_Axe_Offhand', 'Barbarian_Round_Shield', '1H_Axe', '2H_Axe', 'Mug', 'Barbarian_Hat', 'Barbarian_Cape'],
  Mage: ['Spellbook', 'Spellbook_open', '1H_Wand', '2H_Staff', 'Mage_Hat', 'Mage_Cape'],
  Rogue: ['Knife_Offhand', '1H_Crossbow', '2H_Crossbow', 'Knife', 'Throwable', 'Rogue_Cape'],
  Rogue_Hooded: ['Knife_Offhand', '1H_Crossbow', '2H_Crossbow', 'Knife', 'Throwable', 'Rogue_Cape'],
};
function loadoutFor(AU, u) {
  const cls = (AU.UNITS[u.type] || {}).cls || 'melee';
  if (cls === 'civilian') return /^great_|missionary/.test(u.type) ? LOADOUT.great : LOADOUT.civilian;
  return LOADOUT[cls] || null; // naval and air: no art yet, drawn as placeholders
}
function unitSpots(AU, g, heightAt) {
  const byTile = {}, out = [];
  Object.keys(g.units).forEach(id => { const u = g.units[id]; (byTile[u.tile] = byTile[u.tile] || []).push(u); });
  Object.keys(byTile).forEach(ti => {
    const t = g.tiles[ti], list = byTile[ti]; if (!t) return;
    const c = center(t.col, t.row), town = t.settlement !== undefined && t.settlement !== null && !!g.settlements[t.settlement];
    list.slice(0, 4).forEach((u, k) => {
      const spread = town || list.length > 1, a = Math.PI * (0.3 + 0.45 * k), d = spread ? 0.52 : 0;
      const x = c[0] + Math.cos(a) * d, z = c[1] + Math.sin(a) * d + (town ? 0.15 : 0);
      const y = heightAt ? Math.max(0, heightAt(x, z)) : isWater(AU, t) ? WATER_Y : (t.hills && !town ? 0.3 : 0) + (t.terrain === 'mountain' ? 0.6 : 0);
      out.push({ id: u.id, unit: u, load: loadoutFor(AU, u), x, y, z, yaw: (hash1(u.id * 7) - 0.5) * 0.9, color: (g.civs[u.civ] || {}).color || '#999999' });
    });
  });
  return out;
}

// heights for borders and labels: flat land at 0, water at its surface
function flatField(AU, g) {
  return { heightAt: (x, z) => { const i = pick(x, z, g.W, g.H); if (i < 0) return WATER_Y; const t = g.tiles[i]; return isWater(AU, t) ? WATER_Y : (t.terrain === 'mountain' ? 0.4 : t.hills ? 0.15 : 0); } };
}

module.exports = { S, WATER_Y, RIVERS, riverFor, riverDirs, buildStatic, staticKey, buildTowns, unitSpots, GEAR, LOADOUT, loadoutFor, flatField, lin };
