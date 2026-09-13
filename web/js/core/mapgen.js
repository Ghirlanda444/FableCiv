// Procedural world generation.
(function (AU) {
  var Hex = AU.Hex;

  function ValueNoise(rng, size) {
    this.size = size;
    this.grid = new Float32Array(size * size);
    for (var i = 0; i < this.grid.length; i++) this.grid[i] = rng.next();
  }
  ValueNoise.prototype.at = function (x, y) {
    var s = this.size;
    var x0 = Math.floor(x), y0 = Math.floor(y);
    var fx = x - x0, fy = y - y0;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    var g = this.grid;
    function v(ix, iy) { return g[((iy % s + s) % s) * s + ((ix % s + s) % s)]; }
    var a = v(x0, y0), b = v(x0 + 1, y0), c = v(x0, y0 + 1), d = v(x0 + 1, y0 + 1);
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
  };
  function fbm(noise, x, y, octaves, lac, gain) {
    var sum = 0, amp = 1, freq = 1, norm = 0;
    for (var o = 0; o < octaves; o++) {
      sum += amp * noise.at(x * freq, y * freq); norm += amp; amp *= gain; freq *= lac;
    }
    return sum / norm;
  }

  function makeTile(i, col, row) {
    return { i: i, col: col, row: row, terrain: 'ocean', hills: false, feature: null, river: false, resource: null, natural: null,
      owner: -1, worked: false, camp: false, continent: -1, elev: 0 };
  }

  AU.generateMap = function (opts) {
    var rng = new AU.RNG(opts.seed);
    var W = opts.width, H = opts.height;
    var tiles = new Array(W * H);
    var i, c, r;
    for (r = 0; r < H; r++) for (c = 0; c < W; c++) { i = r * W + c; tiles[i] = makeTile(i, c, r); }

    var elevN = new ValueNoise(rng, 64), moistN = new ValueNoise(rng, 64), tempN = new ValueNoise(rng, 64), hillN = new ValueNoise(rng, 64), splitN = new ValueNoise(rng, 64);
    var type = opts.mapType || 'continents';
    var TYPE = {
      continents:  { scale: 3.2, land: 0.36, octaves: 5, lac: 2.1, edge: 0.18, minStart: 25 },
      pangaea:     { scale: 2.4, land: 0.38, octaves: 5, lac: 2.1, edge: 0.22, minStart: 40 },
      fractal:     { scale: 4.5, land: 0.34, octaves: 6, lac: 2.4, edge: 0.10, minStart: 20 },
      archipelago: { scale: 15.0, land: 0.22, octaves: 3, lac: 2.2, edge: 0.10, minStart: 8 },
      islands:     { scale: 8.0, land: 0.27, octaves: 3, lac: 2.1, edge: 0.12, minStart: 14 },
      donut:       { scale: 4.0, land: 0.36, octaves: 4, lac: 2.1, edge: 0.10, minStart: 25 },
      inland_sea:  { scale: 4.0, land: 0.40, octaves: 4, lac: 2.1, edge: 0.0,  minStart: 25 },
      terra:       { scale: 3.2, land: 0.36, octaves: 5, lac: 2.1, edge: 0.16, minStart: 25 }
    }[type] || { scale: 3.2, land: 0.36, octaves: 5, lac: 2.1, edge: 0.18, minStart: 25 };
    var scale = TYPE.scale / Math.max(W, H);

    // Elevation shaped by the map type.
    var elev = new Float32Array(W * H);
    var landCount = 0;
    var targetLand = opts.landFraction || TYPE.land;
    var values = [];
    for (r = 0; r < H; r++) for (c = 0; c < W; c++) {
      i = r * W + c;
      var nx = c * scale, ny = r * scale * 1.15;
      var e = fbm(elevN, nx, ny, TYPE.octaves, TYPE.lac, 0.5);
      var fx = c / (W - 1) - 0.5, fy = r / (H - 1) - 0.5; // -0.5..0.5
      var radial = Math.sqrt(fx * fx * 1.3 + fy * fy * 2.2); // 0 center .. ~0.9 corners
      var edge = 1;
      if (TYPE.edge > 0) { var ex = Math.min(c, W - 1 - c) / (W * TYPE.edge), ey = Math.min(r, H - 1 - r) / (H * TYPE.edge); edge = Math.min(1, ex) * Math.min(1, ey); }
      var mask = 1;
      if (type === 'pangaea') mask = Math.max(0, 1 - radial * 1.6) * 0.8 + 0.2;
      else if (type === 'donut') { var ring = Math.abs(radial - 0.45) / 0.22; mask = Math.max(0, 1 - ring) * 0.85 + 0.15; if (radial < 0.2) mask = 0; }
      else if (type === 'inland_sea') mask = radial < 0.25 ? 0 : Math.min(1, (radial - 0.25) / 0.2) * 0.8 + 0.2;
      else if (type === 'continents') { var sp = splitN.at(c * 1.4 / W + 3, r * 1.4 / H + 7); mask = 0.55 + 0.45 * Math.abs(sp - 0.5) * 2; }
      else if (type === 'terra') { var gap = Math.abs(fx + 0.02) < 0.06 ? 0.2 : 1; mask = gap; }
      e = e * (0.3 + 0.7 * edge) * mask;
      elev[i] = e; values.push(e);
    }
    values.sort(function (a, b) { return a - b; });
    var seaLevel = values[Math.floor(values.length * (1 - targetLand))];

    for (i = 0; i < tiles.length; i++) {
      tiles[i].elev = elev[i];
      if (elev[i] > seaLevel) { tiles[i].terrain = 'grassland'; landCount++; }
    }

    // Remove tiny islands (< 4 tiles) and mark continents.
    var continentId = 0, continentSizes = [];
    for (i = 0; i < tiles.length; i++) {
      if (tiles[i].terrain === 'ocean' || tiles[i].continent >= 0) continue;
      var stack = [i], members = [];
      tiles[i].continent = continentId;
      while (stack.length) {
        var t = tiles[stack.pop()]; members.push(t.i);
        var nb = Hex.neighborsOf(t.col, t.row, W, H);
        for (var k = 0; k < nb.length; k++) {
          var n = tiles[nb[k]];
          if (n.terrain === 'ocean' || n.continent >= 0) continue;
          n.continent = continentId; stack.push(n.i);
        }
      }
      if (members.length < 4) { members.forEach(function (m) { tiles[m].terrain = 'ocean'; tiles[m].continent = -1; }); }
      else { continentSizes[continentId] = members.length; continentId++; }
    }

    // Climate: temperature by latitude, moisture by noise.
    for (i = 0; i < tiles.length; i++) {
      var t2 = tiles[i];
      if (t2.terrain === 'ocean') continue;
      var lat = Math.abs((t2.row / (H - 1)) * 2 - 1); // 0 equator .. 1 pole
      var temp = 1 - lat + (tempN.at(t2.col * 0.2, t2.row * 0.2) - 0.5) * 0.35;
      var moist = fbm(moistN, t2.col * 0.11, t2.row * 0.11, 3, 2, 0.5);
      var hv = fbm(hillN, t2.col * 0.35, t2.row * 0.35, 3, 2, 0.5) * 0.6 + (t2.elev - seaLevel) / (1 - seaLevel) * 0.9;
      if (hv > 0.72) { t2.terrain = 'mountain'; continue; }
      if (hv > 0.52) t2.hills = true;
      if (temp < 0.12) t2.terrain = 'snow';
      else if (temp < 0.28) t2.terrain = 'tundra';
      else if (temp > 0.62 && moist < 0.36) t2.terrain = 'desert';
      else if (moist < 0.5) t2.terrain = 'plains';
      else t2.terrain = 'grassland';
      // features
      if (t2.terrain === 'grassland' || t2.terrain === 'plains' || t2.terrain === 'tundra') {
        if (temp > 0.78 && moist > 0.58 && t2.terrain !== 'tundra') t2.feature = 'jungle';
        else if (moist > 0.52 && rng.chance(0.55)) t2.feature = 'forest';
        else if (t2.terrain === 'grassland' && !t2.hills && moist > 0.7 && rng.chance(0.12)) t2.feature = 'marsh';
      } else if (t2.terrain === 'desert' && !t2.hills && rng.chance(0.05)) t2.feature = 'oasis';
    }

    // Coast / lakes
    for (i = 0; i < tiles.length; i++) {
      var t3 = tiles[i];
      if (t3.terrain !== 'ocean') continue;
      var nb2 = Hex.neighborsOf(t3.col, t3.row, W, H);
      for (var k2 = 0; k2 < nb2.length; k2++) if (tiles[nb2[k2]].terrain !== 'ocean' && !AU.TERRAIN[tiles[nb2[k2]].terrain].water) { t3.terrain = 'coast'; break; }
    }
    // second ring of coast, sparse
    var coastRing = [];
    for (i = 0; i < tiles.length; i++) {
      if (tiles[i].terrain !== 'ocean') continue;
      var nb3 = Hex.neighborsOf(tiles[i].col, tiles[i].row, W, H);
      for (var k3 = 0; k3 < nb3.length; k3++) if (tiles[nb3[k3]].terrain === 'coast') { if (rng.chance(0.5)) coastRing.push(i); break; }
    }
    coastRing.forEach(function (ci) { tiles[ci].terrain = 'coast'; });
    // Lakes: water bodies not connected to the big ocean (size <= 8)
    var seen = new Uint8Array(W * H);
    for (i = 0; i < tiles.length; i++) {
      if (!AU.TERRAIN[tiles[i].terrain].water || seen[i]) continue;
      var st = [i], body = []; seen[i] = 1;
      while (st.length) {
        var w = tiles[st.pop()]; body.push(w.i);
        var nb4 = Hex.neighborsOf(w.col, w.row, W, H);
        for (var k4 = 0; k4 < nb4.length; k4++) { var q = tiles[nb4[k4]]; if (AU.TERRAIN[q.terrain].water && !seen[q.i]) { seen[q.i] = 1; st.push(q.i); } }
      }
      if (body.length <= 8) body.forEach(function (b) { tiles[b].terrain = 'lake'; });
    }

    // Rivers: from hills/mountains downhill to water.
    var riverSources = [];
    for (i = 0; i < tiles.length; i++) if ((tiles[i].hills || tiles[i].terrain === 'mountain') && !AU.TERRAIN[tiles[i].terrain].water) riverSources.push(i);
    rng.shuffle(riverSources);
    var riversWanted = Math.floor(landCount / 45);
    var made = 0, riverPaths = [];
    for (var s = 0; s < riverSources.length && made < riversWanted; s++) {
      var cur = tiles[riverSources[s]], path = [], guard = 0, ok = false, mouth = null;
      var visited = {};
      if (cur.river) continue;
      while (guard++ < 24) {
        visited[cur.i] = 1;
        var nbs = Hex.neighborsOf(cur.col, cur.row, W, H).map(function (x) { return tiles[x]; });
        var water = nbs.filter(function (n) { return AU.TERRAIN[n.terrain].water; });
        if (water.length && path.length >= 2) { ok = true; mouth = water[0].i; break; }
        var joins = nbs.filter(function (n) { return n.river && !visited[n.i]; });
        if (joins.length && path.length >= 2) { ok = true; mouth = joins[0].i; break; }
        var cands = nbs.filter(function (n) { return !visited[n.i] && n.terrain !== 'mountain' && !AU.TERRAIN[n.terrain].water && !n.river && n.elev <= cur.elev + 0.02; });
        if (!cands.length) break;
        cands.sort(function (a, b) { return a.elev - b.elev; });
        var nxt = cands[rng.int(Math.min(2, cands.length))];
        if (nxt.terrain !== 'mountain') path.push(nxt.i);
        cur = nxt;
      }
      if (ok && path.length >= 2) { path.forEach(function (p) { tiles[p].river = true; }); riverPaths.push([riverSources[s]].concat(path, [mouth])); made++; }
    }

    // Resources
    var resIds = Object.keys(AU.RESOURCES);
    for (i = 0; i < tiles.length; i++) {
      var t4 = tiles[i];
      if (t4.terrain === 'mountain') continue;
      var p = AU.TERRAIN[t4.terrain].water ? 0.08 : 0.16;
      if (type === 'terra' && t4.col > W * 0.5) p *= 1.8;
      if (!rng.chance(p)) continue;
      var opts2 = resIds.filter(function (id) {
        var R = AU.RESOURCES[id];
        if (R.terrain.indexOf(t4.terrain) < 0) return false;
        if (R.flat && t4.hills) return false;
        if (R.hills && !t4.hills && rng.chance(0.7)) return false;
        if (R.feature) { if (R.feature.indexOf(t4.feature) < 0) return false; }
        else if (t4.feature === 'jungle' || t4.feature === 'oasis' || t4.feature === 'marsh') return false;
        return true;
      });
      if (!opts2.length) continue;
      // weight: bonus 3, luxury 2, strategic 2
      var weighted = [];
      opts2.forEach(function (id) { var kind = AU.RESOURCES[id].kind; var w2 = kind === 'bonus' ? 3 : 2; for (var z = 0; z < w2; z++) weighted.push(id); });
      t4.resource = rng.pick(weighted);
    }

    // Natural wonders: a few per map, on matching terrain, apart from each other
    var naturals = [], wantNat = Math.max(2, Math.round(landCount / 220));
    var natIds = rng.shuffle(Object.keys(AU.NATURAL_WONDERS));
    natIds.forEach(function (nid) {
      if (naturals.length >= wantNat) return;
      var NW = AU.NATURAL_WONDERS[nid], cands = [];
      for (var q = 0; q < tiles.length; q++) {
        var tq = tiles[q];
        if (tq.terrain !== NW.terrain) continue;
        if (NW.flat && tq.hills) continue; if (NW.hills && !tq.hills) continue;
        if (tq.resource || tq.natural) continue;
        if (NW.terrain === 'coast') { var hasLand = Hex.neighborsOf(tq.col, tq.row, W, H).some(function (n) { return !AU.TERRAIN[tiles[n].terrain].water; }); if (!hasLand) continue; }
        cands.push(tq);
      }
      rng.shuffle(cands);
      for (var ci = 0; ci < cands.length; ci++) {
        var ct = cands[ci], far = naturals.every(function (o) { return Hex.distance(ct.col, ct.row, tiles[o].col, tiles[o].row) >= 8; });
        if (!far) continue;
        ct.natural = nid; ct.feature = null; if (NW.terrain !== 'mountain' && NW.style === 'lake') ct.river = false;
        naturals.push(ct.i); break;
      }
    });

    // Start positions
    var nStarts = opts.numCivs;
    var landTiles = [], landTilesAll = [];
    for (i = 0; i < tiles.length; i++) {
      var t5 = tiles[i];
      if (AU.TERRAIN[t5.terrain].water || t5.terrain === 'mountain' || t5.terrain === 'snow' || t5.natural) continue;
      if (t5.continent >= 0 && continentSizes[t5.continent] < TYPE.minStart) continue;
      landTilesAll.push(t5);
      if (type === 'terra' && t5.col > W * 0.47) continue; // the new world is settled later
      landTiles.push(t5);
    }
    function siteScore(t) {
      var sc = 0, area = Hex.spiral(t.col, t.row, 2, W, H);
      var waterN = 0;
      area.forEach(function (ai) {
        var a = tiles[ai], y = AU.baseTileYields(a);
        sc += y.food * 1.3 + y.production * 1.1 + y.gold * 0.5;
        if (a.resource) sc += 1.5;
        if (a.river) sc += 0.8;
        if (a.terrain === 'snow' || a.terrain === 'mountain') sc -= 1.2;
        if (a.terrain === 'desert' && !a.feature && !a.river) sc -= 0.8;
        if (AU.TERRAIN[a.terrain].water) waterN++;
      });
      if (waterN > 10) sc -= (waterN - 10) * 1.5;
      if (t.hills) sc += 2; if (t.river) sc += 2;
      if (t.terrain === 'desert' || t.terrain === 'tundra') sc -= 4;
      return sc;
    }
    landTiles.forEach(function (t) { t._score = siteScore(t); });
    landTiles.sort(function (a, b) { return b._score - a._score; });
    var starts = [];
    var minDist = Math.max(7, Math.floor(Math.sqrt(landTiles.length / nStarts) * 1.15));
    while (starts.length < nStarts && minDist >= 6) {
      starts = [];
      for (var li = 0; li < landTiles.length && starts.length < nStarts; li++) {
        var cand = landTiles[li], good = true;
        for (var si = 0; si < starts.length; si++) if (Hex.distance(cand.col, cand.row, starts[si].col, starts[si].row) < minDist) { good = false; break; }
        if (good) starts.push(cand);
      }
      if (starts.length < nStarts) minDist--;
    }
    if (starts.length < nStarts && landTilesAll.length > landTiles.length) {
      // not enough room in the old world: fall back to the whole map
      landTilesAll.forEach(function (t) { if (t._score === undefined) t._score = siteScore(t); });
      landTiles = landTilesAll.sort(function (a, b) { return b._score - a._score; });
      minDist = 8; starts = [];
      while (starts.length < nStarts && minDist >= 5) {
        starts = [];
        for (var li2 = 0; li2 < landTiles.length && starts.length < nStarts; li2++) {
          var cand2 = landTiles[li2], good2 = true;
          for (var si2 = 0; si2 < starts.length; si2++) if (Hex.distance(cand2.col, cand2.row, starts[si2].col, starts[si2].row) < minDist) { good2 = false; break; }
          if (good2) starts.push(cand2);
        }
        if (starts.length < nStarts) minDist--;
      }
    }
    // Barbarian camps far from starts
    var camps = [];
    var campCands = landTiles.filter(function (t) {
      if (t.hills === false && t.feature === null && rng.chance(0.5)) return false;
      for (var si = 0; si < starts.length; si++) if (Hex.distance(t.col, t.row, starts[si].col, starts[si].row) < 7) return false;
      return true;
    });
    rng.shuffle(campCands);
    for (var ci2 = 0; ci2 < campCands.length && camps.length < (opts.numCamps || 8); ci2++) {
      var cc = campCands[ci2], far = true;
      for (var cj = 0; cj < camps.length; cj++) if (Hex.distance(cc.col, cc.row, tiles[camps[cj]].col, tiles[camps[cj]].row) < 8) { far = false; break; }
      if (far) { camps.push(cc.i); cc.camp = true; }
    }
    landTilesAll.forEach(function (t) { delete t._score; });
    return { width: W, height: H, tiles: tiles, starts: starts.map(function (t) { return t.i; }), camps: camps, continentSizes: continentSizes, rivers: riverPaths, mapType: type, naturals: naturals };
  };

  // Base yields of a tile: terrain + hills + feature + resource (resource only if visible to viewer civ, if given)
  AU.baseTileYields = function (t, civ) {
    var y = { food: 0, production: 0, gold: 0, science: 0, culture: 0, happiness: 0 };
    var T = AU.TERRAIN[t.terrain];
    add(y, T.yields);
    if (t.hills) y.production += 1;
    if (t.feature) add(y, AU.FEATURES[t.feature].yields);
    if (t.river && !T.water) y.food += 1;
    if (t.natural) add(y, AU.NATURAL_WONDERS[t.natural].yields);
    if (t.resource) {
      var R = AU.RESOURCES[t.resource];
      if (!R.revealTech || !civ || civ.techs[R.revealTech]) add(y, R.yields);
    }
    return y;
  };
  function add(a, b) { if (!b) return a; for (var k in b) a[k] = (a[k] || 0) + b[k]; return a; }
  AU.addYields = add;
})(globalThis.AU = globalThis.AU || {});
