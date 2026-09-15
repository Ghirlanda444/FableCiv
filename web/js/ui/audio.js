// Music: one track for the menu and one per era, looping, with a crossfade when the track changes.
// Browsers only allow sound after the first tap, so the wanted track is remembered and started on that tap.
(function (AU) {
  var A = AU.Audio = { enabled: true, volume: 0.7, cur: null, curName: null, want: null, missing: {}, unlocked: false, fading: [] };
  A.TRACKS = { menu: 'music/menu.mp3' };
  (AU.ERAS || []).forEach(function (name, i) { A.TRACKS['era' + i] = 'music/' + name.toLowerCase() + '.mp3'; });
  A.init = function (settings) {
    A.enabled = settings.music !== false; A.volume = typeof settings.musicVolume === 'number' ? settings.musicVolume : 0.7;
    var unlock = function () { A.unlocked = true; if (A.want && A.enabled) A.play(A.want); };
    ['pointerdown', 'touchend', 'keydown'].forEach(function (ev) { document.addEventListener(ev, unlock, { passive: true }); });
    document.addEventListener('visibilitychange', function () { if (!A.cur) return; if (document.hidden) A.cur.pause(); else if (A.enabled) A.cur.play().catch(function () {}); });
  };
  // The track for a given era: falls back to earlier eras (and finally the menu) when a file is missing.
  A.forEra = function (era) {
    for (var e = era; e >= 0; e--) if (!A.missing['era' + e]) return A.play('era' + e);
    return A.play('menu');
  };
  A.play = function (name) {
    A.want = name;
    if (!A.enabled || !A.TRACKS[name] || A.missing[name]) return;
    if (A.curName === name && A.cur) { if (A.cur.paused && A.unlocked) A.cur.play().catch(function () {}); return; }
    if (!A.unlocked) return; // started by the first tap
    var el = new Audio(A.TRACKS[name]); el.loop = true; el.volume = 0; el.preload = 'auto';
    var old = A.cur, oldName = A.curName; A.cur = el; A.curName = name;
    el.addEventListener('error', function () {
      if (el._dead) return; // a faded-out track being unloaded, not a missing file
      A.missing[name] = true; if (A.cur === el) { A.cur = null; A.curName = null; }
      if (old && !old.ended) { A.cur = old; A.curName = oldName; A.fadeTo(old, A.volume); } // keep the previous track instead of silence
      if (/^era/.test(name)) A.forEra(+name.slice(3)); // try the previous era's track
    });
    el.play().then(function () { A.fadeTo(el, A.volume); if (old) A.fadeTo(old, 0, function () { old._dead = true; old.pause(); old.removeAttribute('src'); try { old.load(); } catch (e) {} }); }).catch(function () { A.cur = old; A.curName = oldName; });
  };
  A.fadeTo = function (el, target, done) {
    var start = el.volume, t0 = Date.now(), dur = 1400;
    (function step() { var k = Math.min(1, (Date.now() - t0) / dur); try { el.volume = start + (target - start) * k; } catch (e) {} if (k < 1) setTimeout(step, 50); else if (done) done(); })();
  };
  A.setEnabled = function (on) { A.enabled = !!on; if (!on) { if (A.cur) { A.cur._dead = true; A.cur.pause(); A.cur.removeAttribute('src'); } A.cur = null; A.curName = null; } else if (A.want) A.play(A.want); };
  A.setVolume = function (v) { A.volume = Math.max(0, Math.min(1, v)); if (A.cur) A.cur.volume = A.volume; };
  A.status = function () { return !A.enabled ? 'off' : A.curName ? (A.curName === 'menu' ? 'Menu theme' : AU.ERAS[+A.curName.slice(3)] + ' era') : (A.want && A.missing[A.want] ? 'no track file yet (see music/README.md)' : 'waiting for a tap'); };
})(globalThis.AU = globalThis.AU || {});
