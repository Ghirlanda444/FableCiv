"use strict";
// Which painted picture to show for each unit and building, and where it stands. Plain JS so Node can test it
// (tools/godot/test-geo.js). Pictures are the web game's own art (web/assets, copied to godot/art by tools/godot/bundle.js)
// and follow the web game's rules: unique-unit art, then the culture's version, then the shared picture.
// Every list of paths is a preference chain, relative to the art folder; main.js shows the first one that exists.

const { unitOffset } = typeof process !== 'undefined' && process.versions && process.versions.node ? require('./geo.js') : require('res://geo.js');
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
  const STAND_IN = { commander: 'great_general', migrant: 'settler', scarecrow: 'warrior' }; // no art of their own yet
  if (STAND_IN[type]) out.push('units/' + STAND_IN[type] + '.png');
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
      const o = unitOffset(k, list.length, town), x = c[0] + o[0], z = c[1] + o[1], U = AU.UNITS[u.type] || {};
      const military = U.cls !== 'civilian';
      out.push({ id: u.id, unit: u, chain: unitChain(AU, g, u), x, y: Math.max(0, heightAt(x, z)), z, height: military ? 0.82 : 0.68, color: (g.civs[u.civ] || {}).color || '#999999' });
    });
  });
  return out;
}

// "Show city": one settlement's buildings as pictures on its plaza. The palace (capital) or a hall stands in the middle, the
// buildings on three rings around it, wonders and national projects on the outer ring. Walls are drawn by city.js.
const SKIP = { palace: 1, walls: 1, castle: 1, boundary_marker: 1 };
const RINGS = [[6, 0.33, 0.5], [9, 0.57, 0.2], [12, 0.8, 0.0]];
function cityViewSprites(AU, g, s, heightAt) {
  const out = [], t = g.tiles[s.tile], civ = g.civs[s.civ]; if (!t || !civ) return out;
  const c = center(t.col, t.row), culture = cultureOfCiv(AU, civ), put = (chain, x, z, h, key) => out.push({ key: s.id + ':' + key, chain, x, y: Math.max(0, heightAt(x, z)), z, height: h, settlement: s.id });
  if (s.isCapital) put(buildingChain(AU, 'palace', culture), c[0], c[1] - 0.05, 0.66, 'centre');
  else put((culture ? ['palace/' + culture + '/hall.png'] : []).concat(buildingChain(AU, 'monument', culture)), c[0], c[1] - 0.05, s.isCity ? 0.56 : 0.46, 'centre');
  const inner = [], outer = [];
  RINGS.forEach(([n, r, off], ring) => { for (let k = 0; k < n; k++) { const a = off + 2 * Math.PI * k / n; (ring < 2 ? inner : outer).push([Math.cos(a) * r, Math.sin(a) * r * 0.88]); } });
  const big = b => (AU.WONDERS && AU.WONDERS[b]) || (AU.NATIONAL && AU.NATIONAL[b]);
  const blds = (s.buildings || []).filter(b => !SKIP[b]), plain = blds.filter(b => !big(b)), wonders = blds.filter(big);
  const spots = inner.concat(outer), wonderSpots = outer.slice().sort((p, q) => p[1] - q[1]); // wonders fill the back of the outer ring first
  const used = {};
  wonders.slice(0, outer.length).forEach((b, i) => { const p = wonderSpots[i]; used[p.join()] = 1; put(buildingChain(AU, b, culture), c[0] + p[0], c[1] + p[1], 0.62, b); });
  plain.reduce((n, b) => {
    while (n < spots.length && used[spots[n].join()]) n++;
    if (n < spots.length) put(buildingChain(AU, b, culture), c[0] + spots[n][0], c[1] + spots[n][1], 0.46, b);
    return n + 1;
  }, 0);
  return out;
}

// the paths every chain may ask for, to check that the art is present (tools/godot/test-geo.js)
function allChains(AU) {
  const out = [];
  Object.keys(AU.UNITS).forEach(type => out.push(['units/' + type + '.png']));
  return out;
}

module.exports = { unitChain, buildingChain, unitOffset, unitSpots, cityViewSprites, allChains };
