"use strict";
// Which painted picture to show for each unit and building, and where it stands. Plain JS so Node can test it
// (tools/godot/test-geo.js). Pictures are the web game's own art (web/assets, copied to godot/art by tools/godot/bundle.js)
// and follow the web game's rules: unique-unit art, then the culture's version, then the shared picture.
// Every list of paths is a preference chain, relative to the art folder; main.js shows the first one that exists.

const { unitOffset, showsResource } = typeof process !== 'undefined' && process.versions && process.versions.node ? require('./geo.js') : require('res://geo.js');
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
      const o = unitOffset(k, list.length, town, showsResource(AU, g, t)), x = c[0] + o[0], z = c[1] + o[1], U = AU.UNITS[u.type] || {};
      const military = U.cls !== 'civilian'; // heights of the figure itself (main.js crops the pictures' empty margins)
      out.push({ id: u.id, unit: u, chain: unitChain(AU, g, u), x, y: Math.max(0, heightAt(x, z)), z, height: military ? 0.6 : 0.5, color: (g.civs[u.civ] || {}).color || '#999999' });
    });
  });
  return out;
}

// "Show city": one settlement's buildings as pictures on its square. The palace (capital) or a hall stands in the middle, the
// buildings spread around it, wonders and national projects at the back. Walls are drawn by city.js.
const SKIP = { palace: 1, walls: 1, castle: 1, boundary_marker: 1 };
function cityViewSprites(AU, g, s, heightAt) {
  const out = [], t = g.tiles[s.tile], civ = g.civs[s.civ]; if (!t || !civ) return out;
  const c = center(t.col, t.row), culture = cultureOfCiv(AU, civ), put = (chain, x, z, h, key) => out.push({ key: s.id + ':' + key, chain, x, y: Math.max(0, heightAt(x, z)), z, height: h, settlement: s.id });
  const big = b => (AU.WONDERS && AU.WONDERS[b]) || (AU.NATIONAL && AU.NATIONAL[b]);
  const blds = (s.buildings || []).filter(b => !SKIP[b]), n = blds.length;
  // spots spread evenly over the square (a sunflower spiral around the centre piece); pictures shrink as the city fills up
  const spacing = 0.78 * Math.sqrt(Math.PI / Math.max(1, n + 1)), h = Math.max(0.24, Math.min(0.46, spacing * 0.95));
  const spots = [];
  for (let i = 1; i <= n; i++) { const r = 0.8 * Math.sqrt((i + 0.5) / (n + 1)), a = i * 2.39996 + 0.6; spots.push([Math.cos(a) * r, Math.sin(a) * r * 0.88]); }
  spots.sort((p, q) => p[1] - q[1]);                                        // back to front: wonders take the back
  const order = blds.filter(big).concat(blds.filter(b => !big(b)));
  order.forEach((b, i) => put(buildingChain(AU, b, culture), c[0] + spots[i][0], c[1] + spots[i][1], big(b) ? h * 1.3 : h, b));
  if (s.isCapital) put(buildingChain(AU, 'palace', culture), c[0], c[1] - 0.02, Math.max(0.4, h * 1.35), 'centre');
  else put((culture ? ['palace/' + culture + '/hall.png'] : []).concat(buildingChain(AU, 'monument', culture)), c[0], c[1] - 0.02, Math.max(0.34, h * 1.15), 'centre');
  return out;
}

// Resources: the web game's painted resource picture in the centre of the tile (geo.showsResource decides which show; units on
// the tile line up in front of it)
function resourceSpots(AU, g, heightAt) {
  const out = [];
  g.tiles.forEach(t => {
    if (!showsResource(AU, g, t)) return;
    const c = center(t.col, t.row), x = c[0], z = c[1] - 0.05;
    out.push({ key: 'res:' + t.i, tile: t.i, resource: t.resource, chain: ['resources/' + t.resource + '.png'], x, y: Math.max(0, heightAt(x, z)), z, height: 0.34 });
  });
  return out;
}

// the paths every chain may ask for, to check that the art is present (tools/godot/test-geo.js)
function allChains(AU) {
  const out = [];
  Object.keys(AU.UNITS).forEach(type => out.push(['units/' + type + '.png']));
  return out;
}

module.exports = { unitChain, buildingChain, unitOffset, unitSpots, cityViewSprites, resourceSpots, allChains };
