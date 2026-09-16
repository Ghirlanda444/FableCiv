#!/usr/bin/env node
// Build a scenario map from Natural Earth data: node tools/build-scenario-map.js <dir with ne_50m_*.geojson> [mediterranean]
// Rasterises the real coastline, lakes and big rivers onto the hex grid, adds hand-placed mountain ranges and deserts,
// and writes web/js/data/maps/<name>.js (a compact, hand-editable tile map the generator turns into a playable world).
const fs = require('fs'), path = require('path');
const neDir = process.argv[2] || '.', which = process.argv[3] || 'mediterranean';

const MAPS = {
  mediterranean: {
    W: 90, H: 57, lon0: -10.5, lon1: 46.5, lat0: 26.0, lat1: 50.0, // lon0..lon1 west to east, lat1 at row 0 (north)
    rivers: ['Nile', 'Damietta Branch', 'Rosetta Branch', 'Danube', 'Donau', 'Rhine', 'Rhein', 'Rhin', 'Rhône', 'Po', 'Ebro', 'Tajo', 'Tejo', 'Duero', 'Loire', 'Seine', 'Garonne', 'Dnipro', 'Dniester', 'Don', 'Tigris', 'Dicle', 'Euphrates', 'Firat', 'Al Furat', 'Jordan', 'Drava', 'Tisza', 'Tisa'],
    // extra rivers not in the 50m data, as lon/lat polylines (source first)
    handRivers: { Tiber: [[12.0, 43.0], [12.3, 42.4], [12.5, 41.9], [12.25, 41.75]], Orontes: [[36.3, 34.0], [36.4, 35.0], [36.2, 35.8], [36.0, 36.1]], Guadalquivir: [[-2.9, 38.0], [-4.5, 37.7], [-6.0, 37.3], [-6.4, 36.8]], Meander: [[30.0, 38.3], [28.8, 37.9], [27.6, 37.8], [27.2, 37.7]], Halys: [[37.0, 39.0], [35.5, 38.6], [34.0, 39.5], [34.4, 40.7], [35.8, 41.6]] },
    // mountain ranges: lon/lat polylines with a half-width in tiles (core tiles become mountains, a ring of hills around)
    ranges: [
      { name: 'Alps', pts: [[5.5, 44.2], [7.0, 45.5], [8.5, 46.4], [10.5, 46.6], [12.5, 47.0], [14.5, 47.2]], w: 1.2 },
      { name: 'Pyrenees', pts: [[-1.5, 43.2], [0.5, 42.8], [2.5, 42.5]], w: 0.8 },
      { name: 'Apennines', pts: [[9.0, 44.3], [11.0, 43.8], [12.8, 42.9], [13.8, 42.0], [15.0, 41.0], [16.0, 39.8], [16.2, 38.6]], w: 0.5 },
      { name: 'Atlas', pts: [[-8.0, 31.0], [-6.0, 32.4], [-4.0, 33.4], [-2.0, 34.6], [1.0, 35.0], [4.0, 35.6], [7.5, 35.8], [9.0, 35.4]], w: 0.9 },
      { name: 'Taurus', pts: [[29.5, 37.0], [31.0, 37.2], [33.0, 37.0], [35.0, 37.5], [36.5, 37.6]], w: 0.9 },
      { name: 'Pontic', pts: [[32.0, 41.2], [35.5, 41.2], [38.5, 40.8], [41.5, 40.9]], w: 0.6 },
      { name: 'Caucasus', pts: [[40.0, 43.5], [42.5, 43.2], [44.5, 42.7], [46.5, 42.0]], w: 1.2 },
      { name: 'Zagros', pts: [[43.5, 37.5], [45.0, 36.0], [46.5, 34.5]], w: 1.0 },
      { name: 'Dinaric', pts: [[14.0, 45.8], [16.0, 44.6], [18.0, 43.6], [19.8, 42.5], [21.0, 41.5]], w: 0.9 },
      { name: 'Pindus', pts: [[20.8, 40.5], [21.5, 39.4], [22.0, 38.6]], w: 0.5 },
      { name: 'Balkan', pts: [[22.5, 43.0], [24.5, 42.8], [26.5, 42.9]], w: 0.6 },
      { name: 'Carpathians', pts: [[19.5, 49.4], [22.5, 49.0], [24.5, 47.8], [25.5, 46.0], [24.0, 45.4], [22.5, 45.5]], w: 1.0 },
      { name: 'Cantabrian', pts: [[-7.5, 43.0], [-5.0, 43.1], [-3.0, 43.0]], w: 0.7 },
      { name: 'Iberian', pts: [[-3.0, 41.0], [-1.5, 40.5], [-1.0, 39.5]], w: 0.6 },
      { name: 'Sierra Nevada', pts: [[-3.5, 37.1], [-2.5, 37.0]], w: 0.4 },
      { name: 'Lebanon', pts: [[35.8, 33.6], [36.2, 34.6]], w: 0.4 },
      { name: 'Sinai', pts: [[33.8, 28.5], [34.2, 29.2]], w: 0.4 },
      { name: 'Massif Central', pts: [[2.5, 45.0], [3.5, 44.5], [4.2, 45.4]], w: 0.5 },
      { name: 'Rhodope', pts: [[23.5, 41.6], [25.0, 41.7]], w: 0.4 }
    ],
    // deserts: land inside these lon/lat boxes is desert unless close to a river or the coast strip listed
    deserts: [
      { box: [-10.5, 26, 36, 31.0], coastKeep: 1, riverKeep: 1 },   // Sahara and Egypt (Nile valley and the coast stay fertile)
      { box: [10, 31, 26, 33.2], coastKeep: 1, riverKeep: 1 },       // Libyan coast, thin fertile strip
      { box: [36, 26, 46.5, 35.5], coastKeep: 2, riverKeep: 1 }      // Arabian and Syrian deserts (Mesopotamia and the Levant coast stay fertile)
    ],
    hillsBias: [[-10.5, 26, 46.5, 50, 0]],
    naturals: [['vesuvius', 14.43, 40.82], ['matterhorn', 7.66, 45.98], ['dead_sea', 35.5, 31.5]],
    starts: [['rome', 12.5, 41.9], ['carthage', 10.3, 36.85], ['greece', 23.7, 38.0], ['egypt', 30.6, 31.2], ['celts', 4.8, 45.8], ['persia', 44.4, 32.6]],
    states: [['syracuse', 15.3, 37.1], ['massalia', 5.4, 43.3], ['cyrene', 21.9, 32.8], ['rhodes', 28.2, 36.4], ['pergamon', 27.2, 39.1], ['tyre', 35.2, 33.3], ['jerusalem', 35.2, 31.8], ['cirta', 6.6, 36.4], ['gades', -6.3, 36.5], ['tarentum', 17.2, 40.5], ['sparta', 22.4, 37.1], ['byzantion', 29.0, 41.0], ['sinope', 35.2, 42.0], ['petra', 35.4, 30.3], ['valletta', 14.5, 35.9], ['genava', 6.1, 46.2], ['bologna', 11.3, 44.5], ['yerevan', 44.5, 40.2], ['olbia', 31.9, 46.7], ['emporion', 3.1, 42.1]]
  }
};
const M = MAPS[which]; if (!M) { console.error('unknown map', which); process.exit(1); }
const W = M.W, H = M.H, dLon = (M.lon1 - M.lon0) / W, dLat = (M.lat1 - M.lat0) / H;
function lonlat(col, row) { return [M.lon0 + (col + 0.5 + 0.5 * (row & 1)) * dLon, M.lat1 - (row + 0.5) * dLat]; }
function tileOf(lon, lat) { const row = Math.max(0, Math.min(H - 1, Math.round((M.lat1 - lat) / dLat - 0.5))); const col = Math.max(0, Math.min(W - 1, Math.round((lon - M.lon0) / dLon - 0.5 - 0.5 * (row & 1)))); return row * W + col; }
function hexDist(a, b) { // odd-r offset distance
  const ax = a.c - (a.r - (a.r & 1)) / 2, az = a.r, bx = b.c - (b.r - (b.r & 1)) / 2, bz = b.r; const dx = ax - bx, dz = az - bz; return Math.max(Math.abs(dx), Math.abs(dz), Math.abs(dx + dz)); }
function tileCR(i) { return { c: i % W, r: Math.floor(i / W) }; }
function neighbors(i) { const c = i % W, r = Math.floor(i / W), d = (r & 1) ? [[1, 0], [1, -1], [0, -1], [-1, 0], [0, 1], [1, 1]] : [[1, 0], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1]]; const out = []; d.forEach(([dc, dr]) => { const nc = c + dc, nr = r + dr; if (nc >= 0 && nc < W && nr >= 0 && nr < H) out.push(nr * W + nc); }); return out; }

// --- land from Natural Earth polygons (point in polygon, 5 samples per hex)
const land = JSON.parse(fs.readFileSync(path.join(neDir, 'ne_50m_land.geojson'), 'utf8'));
const polys = [];
land.features.forEach(f => { const g = f.geometry; const list = g.type === 'Polygon' ? [g.coordinates] : g.coordinates; list.forEach(rings => { const outer = rings[0]; let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; outer.forEach(([x, y]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }); if (x1 < M.lon0 - 1 || x0 > M.lon1 + 1 || y1 < M.lat0 - 1 || y0 > M.lat1 + 1) return; polys.push({ rings, bbox: [x0, y0, x1, y1] }); }); });
function inRing(ring, x, y) { let inside = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1]; if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside; } return inside; }
function isLand(x, y) { for (const p of polys) { const b = p.bbox; if (x < b[0] || x > b[2] || y < b[1] || y > b[3]) continue; if (inRing(p.rings[0], x, y)) { let hole = false; for (let k = 1; k < p.rings.length; k++) if (inRing(p.rings[k], x, y)) { hole = true; break; } if (!hole) return true; } } return false; }
const lakes = JSON.parse(fs.readFileSync(path.join(neDir, 'ne_50m_lakes.geojson'), 'utf8'));
const lakePolys = []; lakes.features.forEach(f => { const g = f.geometry; const list = g.type === 'Polygon' ? [g.coordinates] : g.coordinates; list.forEach(rings => lakePolys.push(rings[0])); });
function isLake(x, y) { return lakePolys.some(r => inRing(r, x, y)); }

const code = new Array(W * H).fill('.');
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
  const [lon, lat] = lonlat(c, r); let n = 0;
  const offs = [[0, 0], [0.3, 0.2], [-0.3, 0.2], [0.3, -0.2], [-0.3, -0.2]];
  offs.forEach(([ox, oy]) => { if (isLand(lon + ox * dLon, lat + oy * dLat)) n++; });
  if (n >= 3) code[r * W + c] = isLake(lon, lat) ? 'l' : '#';
}

// --- rivers: polylines to tile paths (source first), snapped to land, ending in water
const riversNE = JSON.parse(fs.readFileSync(path.join(neDir, 'ne_50m_rivers_lake_centerlines.geojson'), 'utf8'));
const lines = {};
riversNE.features.forEach(f => { const nm = f.properties.name || f.properties.name_en; if (!nm || M.rivers.indexOf(nm) < 0) return; const g = f.geometry; const list = g.type === 'LineString' ? [g.coordinates] : g.coordinates; list.forEach(l => { (lines[nm] = lines[nm] || []).push(l); }); });
const NAME_ALIAS = { Donau: 'Danube', Rhein: 'Rhine', Rhin: 'Rhine', Tejo: 'Tajo', Dicle: 'Tigris', Firat: 'Euphrates', 'Al Furat': 'Euphrates', Tisa: 'Tisza', 'Damietta Branch': 'Nile', 'Rosetta Branch': 'Nile' };
const merged = {};
Object.keys(lines).forEach(nm => { const key = NAME_ALIAS[nm] || nm; (merged[key] = merged[key] || []).push(...lines[nm]); });
Object.keys(M.handRivers).forEach(nm => { merged[nm] = [M.handRivers[nm]]; });
function isWaterCode(ch) { return ch === '.' || ch === 'l'; }
const riverPaths = [];
Object.keys(merged).forEach(nm => {
  // join the segments into one long line (longest chain), then walk it tile by tile
  let segs = merged[nm].map(l => l.filter(([x, y]) => x >= M.lon0 - 2 && x <= M.lon1 + 2 && y >= M.lat0 - 2 && y <= M.lat1 + 2)).filter(l => l.length > 1);
  if (!segs.length) return;
  // chain segments whose ends touch (the data splits every river into many pieces)
  const near = (a, b) => Math.abs(a[0] - b[0]) < 0.06 && Math.abs(a[1] - b[1]) < 0.06;
  let joined = true;
  while (joined) {
    joined = false;
    outer: for (let i = 0; i < segs.length; i++) for (let j = 0; j < segs.length; j++) {
      if (i === j) continue; const a = segs[i], b = segs[j];
      if (near(a[a.length - 1], b[0])) { segs[i] = a.concat(b.slice(1)); segs.splice(j, 1); joined = true; break outer; }
      if (near(b[b.length - 1], a[0])) { segs[j] = b.concat(a.slice(1)); segs.splice(i, 1); joined = true; break outer; }
    }
  }
  segs.sort((a, b) => b.length - a.length);
  segs.forEach(seg => {
    const tiles = []; seg.forEach(([x, y]) => { if (x < M.lon0 || x > M.lon1 || y < M.lat0 || y > M.lat1) return; const t = tileOf(x, y); if (!tiles.length || tiles[tiles.length - 1] !== t) tiles.push(t); });
    // make consecutive tiles adjacent (walk hex steps), drop water tiles except the last one (the mouth)
    const path = [];
    for (let k = 0; k < tiles.length; k++) {
      let cur = path.length ? path[path.length - 1] : tiles[k];
      if (!path.length) { path.push(cur); continue; }
      let guard = 0;
      while (cur !== tiles[k] && guard++ < 40) { const target = tileCR(tiles[k]); let best = null, bd = 1e9; neighbors(cur).forEach(n => { const d = hexDist(tileCR(n), target); if (d < bd) { bd = d; best = n; } }); if (best == null) break; cur = best; if (path.indexOf(cur) < 0) path.push(cur); }
    }
    // trim: cut at the first water tile (that is the mouth)
    let cut = path.findIndex(t => isWaterCode(code[t]));
    let body = cut >= 0 ? path.slice(0, cut + 1) : path;
    if (body.length >= 4) riverPaths.push({ name: nm, tiles: body });
  });
});
// NE lines run source to mouth; a segment ending on land (a tributary) is kept as is. Mark river tiles.
const riverTile = new Set(); riverPaths.forEach(p => p.tiles.forEach(t => riverTile.add(t)));

// --- mountains and hills along the ranges
M.ranges.forEach(rg => {
  const pts = rg.pts.map(([x, y]) => tileCR(tileOf(x, y)));
  for (let i = 0; i < W * H; i++) {
    if (isWaterCode(code[i]) || riverTile.has(i)) continue;
    const p = tileCR(i); let d = 1e9;
    for (let k = 0; k < pts.length - 1; k++) { // distance to the segment in offset-ish space (good enough at this scale)
      const a = pts[k], b = pts[k + 1]; const steps = Math.max(1, hexDist(a, b)); for (let s = 0; s <= steps; s++) { const q = { c: Math.round(a.c + (b.c - a.c) * s / steps), r: Math.round(a.r + (b.r - a.r) * s / steps) }; d = Math.min(d, hexDist(p, q)); }
    }
    if (d <= rg.w) code[i] = 'm'; else if (d <= rg.w + 1 && code[i] === '#') code[i] = 'h';
  }
});
// coast tiles are never mountains (harbours must exist)
for (let i = 0; i < W * H; i++) if (code[i] === 'm' && neighbors(i).some(n => isWaterCode(code[n]))) code[i] = 'h';

// --- deserts
function distToWater(i) { let best = 9; const p = tileCR(i); for (let r = Math.max(0, p.r - 3); r <= Math.min(H - 1, p.r + 3); r++) for (let c = Math.max(0, p.c - 3); c <= Math.min(W - 1, p.c + 3); c++) { const j = r * W + c; if (isWaterCode(code[j])) best = Math.min(best, hexDist(p, tileCR(j))); } return best; }
function distToRiver(i) { let best = 9; const p = tileCR(i); riverTile.forEach(t => { best = Math.min(best, hexDist(p, tileCR(t))); }); return best; }
M.deserts.forEach(dz => {
  for (let i = 0; i < W * H; i++) {
    if (code[i] !== '#' && code[i] !== 'h') continue;
    const [lon, lat] = lonlat(i % W, Math.floor(i / W)); const b = dz.box; if (lon < b[0] || lon > b[2] || lat < b[1] || lat > b[3]) continue;
    if (distToWater(i) <= dz.coastKeep || distToRiver(i) <= dz.riverKeep) continue;
    code[i] = code[i] === 'h' ? 'D' : 'd';
  }
});

// keep the map's frame as water so nothing hugs the edge
for (let r = 0; r < H; r++) { code[r * W] = '.'; code[r * W + W - 1] = '.'; }
for (let c = 0; c < W; c++) { code[c] = '.'; code[(H - 1) * W + c] = '.'; }
// --- output
const rows = []; for (let r = 0; r < H; r++) rows.push(code.slice(r * W, r * W + W).join(''));
const out = {
  id: which, w: W, h: H, lon0: M.lon0, lon1: M.lon1, lat0: M.lat0, lat1: M.lat1,
  legend: '. ocean/sea  l lake  # land  h hills  m mountain  d desert  D desert hills',
  rows, rivers: riverPaths.map(p => ({ name: p.name, tiles: p.tiles })),
  naturals: M.naturals.map(([id, x, y]) => [id, tileOf(x, y)]),
  starts: M.starts.map(([id, x, y]) => [id, tileOf(x, y)]),
  states: M.states.map(([id, x, y]) => [id, tileOf(x, y)])
};
// starts and free cities must stand on land: nudge to the nearest land tile
function nearestLand(t) { if (!isWaterCode(code[t]) && code[t] !== 'm') return t; let best = t, bd = 1e9; const p = tileCR(t); for (let i = 0; i < W * H; i++) { if (isWaterCode(code[i]) || code[i] === 'm') continue; const d = hexDist(p, tileCR(i)); if (d < bd) { bd = d; best = i; } } return best; }
out.starts = out.starts.map(([id, t]) => [id, nearestLand(t)]); out.states = out.states.map(([id, t]) => [id, nearestLand(t)]); out.naturals = out.naturals.map(([id, t]) => [id, id === 'dead_sea' ? nearestLand(t) : t]);
const dir = path.join(__dirname, '..', 'web', 'js', 'data', 'maps'); fs.mkdirSync(dir, { recursive: true });
const js = '// Generated by tools/build-scenario-map.js from Natural Earth (public domain). Hand edits welcome: one char per hex, odd rows shifted right.\n' +
  '(function (AU) { AU.SCENARIO_MAPS = AU.SCENARIO_MAPS || {}; AU.SCENARIO_MAPS.' + which + ' = ' + JSON.stringify(out, null, 0).replace(/"rows":\[/, '"rows":[\n').replace(/","/g, '",\n"') + ';\n})(globalThis.AU = globalThis.AU || {});\n';
fs.writeFileSync(path.join(dir, which + '.js'), js);
const counts = {}; code.forEach(ch => { counts[ch] = (counts[ch] || 0) + 1; });
console.log('wrote', path.join(dir, which + '.js'), counts, 'rivers', riverPaths.map(p => p.name + ':' + p.tiles.length).join(' '));
console.log(rows.join('\n'));
