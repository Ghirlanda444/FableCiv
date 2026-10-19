"use strict";
// Which painted picture to show for each unit and building, and where it stands. Plain JS so Node can test it
// (tools/godot/test-geo.js). Pictures are the web game's own art (web/assets, copied to godot/art by tools/godot/bundle.js)
// and follow the web game's rules: unique-unit art, then the culture's version, then the shared picture.
// Every list of paths is a preference chain, relative to the art folder; main.js shows the first one that exists.

const SQRT3 = Math.sqrt(3);
function center(col, row) { return [SQRT3 * (col + 0.5 * (row & 1)), 1.5 * row]; }
function hash1(i) { let h = (i * 2654435761) >>> 0; h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13; return (h >>> 0) / 4294967296; }
function cultureOfCiv(AU, civ) { return civ && AU.cultureOf ? AU.cultureOf(civ) : null; }

function unitChain(AU, g, u) {
  const civ = g.civs[u.civ], type = u.type, culture = cultureOfCiv(AU, civ);
  const artId = civ && AU.G.unitArtId ? AU.G.unitArtId(g, civ, type) : type, out = [];
  if (artId !== type) out.push('units/' + artId + '.png');
  if (culture) out.push('units/' + culture + '/' + type + '.png');
  out.push('units/' + type + '.png');
  return out;
}
function buildingChain(AU, id, culture) {
  if (AU.WONDERS && AU.WONDERS[id]) return ['wonders/' + id + '.png'];
  if (AU.NATIONAL && AU.NATIONAL[id]) return ['national/' + id + '.png'];
  return (culture ? ['buildings/' + culture + '/' + id + '.png'] : []).concat(['buildings/' + id + '.png']);
}

// Units: one standee per unit (up to four per tile, fanned out), standing on the ground. heightAt gives the ground height.
function unitSpots(AU, g, heightAt) {
  const byTile = {}, out = [];
  Object.keys(g.units).forEach(id => { const u = g.units[id]; (byTile[u.tile] = byTile[u.tile] || []).push(u); });
  Object.keys(byTile).forEach(ti => {
    const t = g.tiles[ti], list = byTile[ti]; if (!t) return;
    const c = center(t.col, t.row), town = t.settlement !== undefined && t.settlement !== null && !!g.settlements[t.settlement];
    list.slice(0, 4).forEach((u, k) => {
      const spread = town || list.length > 1, a = Math.PI * (0.3 + 0.45 * k), d = spread ? 0.55 : 0;
      const x = c[0] + Math.cos(a) * d, z = c[1] + Math.sin(a) * d + (town ? 0.2 : 0), U = AU.UNITS[u.type] || {};
      const military = U.cls !== 'civilian';
      out.push({ id: u.id, unit: u, chain: unitChain(AU, g, u), x, y: Math.max(0, heightAt(x, z)), z, height: military ? 0.82 : 0.68, color: (g.civs[u.civ] || {}).color || '#999999' });
    });
  });
  return out;
}

// Settlements: the palace (capital) or a hall (city, town) at the centre, then the buildings the settlement has built in two
// rings, wonders on the outer ring. Walls and boundary markers are drawn as geometry, not pictures.
const SKIP = { palace: 1, walls: 1, castle: 1, boundary_marker: 1 };
function townSprites(AU, g, heightAt) {
  const out = [];
  Object.keys(g.settlements).forEach(id => {
    const s = g.settlements[id], t = g.tiles[s.tile], civ = g.civs[s.civ]; if (!t || !civ) return;
    const c = center(t.col, t.row), culture = cultureOfCiv(AU, civ), put = (chain, x, z, h, key) => out.push({ key: s.id + ':' + key, chain, x, y: Math.max(0, heightAt(x, z)), z, height: h, settlement: s.id });
    if (s.isCapital) put(buildingChain(AU, 'palace', culture), c[0], c[1] - 0.05, 0.92, 'centre');
    else put((culture ? ['palace/' + culture + '/hall.png'] : []).concat(buildingChain(AU, 'monument', culture)), c[0], c[1] - 0.05, s.isCity ? 0.72 : 0.55, 'centre');
    const slots = [];
    for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + Math.PI / 6; slots.push([Math.cos(a) * 0.42, Math.sin(a) * 0.42 * 0.85]); }
    for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; slots.push([Math.cos(a) * 0.74, Math.sin(a) * 0.74 * 0.85]); }
    const order = slots.map((p, i) => i).sort((a, b) => hash1(s.id * 31 + a) - hash1(s.id * 31 + b)).sort((a, b) => (a < 6 ? 0 : 1) - (b < 6 ? 0 : 1));
    let n = 0;
    const blds = (s.buildings || []).filter(b => !SKIP[b]), wonders = blds.filter(b => AU.WONDERS && AU.WONDERS[b]), plain = blds.filter(b => !(AU.WONDERS && AU.WONDERS[b]));
    plain.concat(wonders).forEach(b => {
      if (n >= slots.length) return;
      const isW = AU.WONDERS && AU.WONDERS[b], slot = isW ? order[Math.min(slots.length - 1, 6 + (n % 6))] : order[n];
      const p = slots[slot]; n++;
      put(buildingChain(AU, b, culture), c[0] + p[0], c[1] + p[1], isW ? 0.86 : 0.62, b);
    });
  });
  return out;
}

// the paths every chain may ask for, to check that the art is present (tools/godot/test-geo.js)
function allChains(AU) {
  const out = [];
  Object.keys(AU.UNITS).forEach(type => out.push(['units/' + type + '.png']));
  return out;
}

module.exports = { unitChain, buildingChain, unitSpots, townSprites, allChains };
