"use strict";
// The yields lens, Civilization 6 style: a row of round icons near the front of each tile — bread (food), a gear (production),
// banknotes (gold), an open book (knowledge), a temple (heritage) — with a count bubble when a yield is 2 or more. Shown on every tile with the HUD's Yields button, or on the tiles
// of the selected settlement, or around a selected settler (where a new town would work).
// Plain JS (no Godot), so Node can test it (tools/godot/test-geo.js); main.js draws the icons (shaders.YIELD_ICON).
const geo = typeof process !== 'undefined' && process.versions && process.versions.node ? require('./geo.js') : require('res://geo.js');

const KINDS = ['food', 'production', 'gold', 'science', 'culture']; // the icon index the shader draws
const SPACING = 0.35, FRONT = 0.42;

// what a tile yields: worked by its owner's settlement when it has one, else as raw land for the player's civilization
function tileYield(AU, g, i) {
  const t = g.tiles[i], G = AU.G; if (!t) return null;
  const s = t.owner !== undefined && t.owner !== null ? g.settlements[t.owner] : null;
  try {
    if (s) return G.tileYields(g, t, s);
    const civ = G.player ? G.player(g) : g.civs[0];
    return AU.baseTileYields(t, civ);
  } catch (e) { return null; }
}

// tiles within `r` steps of tile i (i included)
function around(AU, g, i, r) {
  const seen = { [i]: true }; let ring = [i];
  for (let k = 0; k < r; k++) {
    const next = [];
    ring.forEach(j => AU.G.neighbors(g, g.tiles[j]).forEach(n => { if (!seen[n]) { seen[n] = true; next.push(n); } }));
    ring = next;
  }
  return Object.keys(seen).map(Number);
}

// which tiles the lens covers: all (the button), the selected settlement's own tiles, or a settler's prospective town
function lensTiles(AU, g, opts) {
  if (opts.all) return g.tiles.map((t, i) => i);
  const sel = opts.selected; if (sel === undefined || sel < 0 || !g.tiles[sel]) return [];
  const t = g.tiles[sel], s = t.settlement !== undefined && t.settlement !== null ? g.settlements[t.settlement] : null;
  if (s) return [s.tile].concat((s.tiles || []).filter(j => j !== s.tile));
  const founder = Object.keys(g.units).some(id => { const u = g.units[id]; return u.tile === sel && (u.type === 'settler' || u.type === 'migrant'); });
  return founder ? around(AU, g, sel, 2) : [];
}

// icon spots: { x, y, z, kind (index into KINDS), count }
function yieldSpots(AU, g, heightAt, opts) {
  const out = [];
  lensTiles(AU, g, opts).forEach(i => {
    const t = g.tiles[i], y = tileYield(AU, g, i); if (!t || !y) return;
    const list = KINDS.map((k, n) => [n, Math.round(y[k] || 0)]).filter(e => e[1] > 0);
    const c = geo.center(t.col, t.row), x0 = c[0] - (list.length - 1) * SPACING / 2, z = c[1] + FRONT;
    list.forEach((e, n) => { const x = x0 + n * SPACING; out.push({ x, y: Math.max(0, heightAt(x, z)) + 0.08, z, kind: e[0], count: Math.min(9, e[1]), tile: i }); });
  });
  return out;
}

function yieldText(AU, g, i) {
  const y = tileYield(AU, g, i); if (!y) return '';
  const names = { food: 'Food', production: 'Production', gold: 'Gold', science: 'Knowledge', culture: 'Heritage' };
  return KINDS.filter(k => (y[k] || 0) > 0).map(k => Math.round(y[k]) + ' ' + names[k]).join(' · ') || 'no yield';
}

module.exports = { KINDS, tileYield, lensTiles, yieldSpots, yieldText };
