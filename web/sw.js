// Service worker: makes the hosted game installable and playable offline, and picks up new versions automatically.
// VERSION is stamped by the deploy workflow (commit id); a new version installs a fresh cache and the page reloads.
var VERSION = '__VERSION__';
var CACHE = 'tiny-empires-' + VERSION;
var CORE = ['./', './index.html', './style.css', './fonts/fonts.css', './fonts/baloo2-latin.woff2', './fonts/baloo2-latin-ext.woff2', './fonts/nunito-latin.woff2', './fonts/nunito-latin-ext.woff2', './fonts/nunito-cyrillic.woff2', './fonts/nunito-cyrillic-ext.woff2', './assets/ui/paper.png', './assets/ui/wood.png', './manifest.webmanifest', './icon-512.png', './lib/three.min.js',
  './js/i18n.js', './js/core/rng.js', './js/ui/assets.js', './js/core/hex.js', './js/data/terrain.js', './js/data/civs.js', './js/data/civs2.js', './js/data/religion.js', './js/data/citystates.js', './js/data/maps/mediterranean.js', './js/data/scenarios.js', './js/data/v2/era1.js', './js/core/v2/masteryweb.js', './js/data/cultures.js',
  './js/data/units.js', './js/data/buildings.js', './js/data/techs.js', './js/data/quotes.js', './js/core/mapgen.js', './js/core/game.js', './js/core/units.js', './js/core/religion.js', './js/core/citystates.js', './js/core/ai.js',
  './js/ui/renderer.js', './js/ui/renderer3d.js', './js/ui/panels.js', './js/ui/pedia.js', './js/ui/cityview.js', './js/ui/app.js', './js/version.js'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) { return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
// Core files: cache first (they are versioned by the cache name). Artwork: cache first too, fetched once and kept.
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== self.location.origin) return;
  if (/\/music\//.test(e.request.url)) return; // music: streamed by the browser with range requests, not cached
  e.respondWith(caches.match(e.request).then(function (hit) {
    if (hit) return hit;
    return fetch(e.request).then(function (res) {
      if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, copy); }); }
      return res;
    });
  }));
});
// Optional: warm the artwork cache in the background once the page asks for it (list sent by the page).
self.addEventListener('message', function (e) {
  if (!e.data || e.data.type !== 'precache' || !Array.isArray(e.data.urls)) return;
  caches.open(CACHE).then(function (c) {
    var urls = e.data.urls.slice(), n = 0;
    function next() { var u = urls.shift(); if (!u) return; c.match(u).then(function (hit) { if (hit) return next(); return fetch(u).then(function (r) { if (r.ok) return c.put(u, r); }).catch(function () {}).then(next); }); }
    for (var i = 0; i < 4; i++) next();
  });
});
