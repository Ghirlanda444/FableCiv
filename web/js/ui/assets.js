// Optional artwork loader. Drop PNG files into web/assets/<kind>/<id>.png and the renderers use them;
// anything missing keeps the procedural look. The single-file build inlines them as AU.ASSET_DATA.
(function (AU) {
  var cache = {}, textures = {};
  var A = AU.Assets = {
    base: 'assets/',
    key: function (kind, id) { return kind + '/' + id; },
    // full-frame pictures are stored as JPEG, cut-outs as PNG
    ext: function (kind) { return kind === 'terrain' || kind === 'techs' || kind === 'civics' || kind === 'thrones' || kind === 'keyart' ? 'jpg' : 'png'; },
    // returns an HTMLImageElement when loaded, null while loading or if missing
    get: function (kind, id) {
      var k = A.key(kind, id), e = cache[k];
      if (e === undefined) {
        // the build's asset index knows every picture that exists: skip the request (and the 404) for one that does not
        if (AU.ASSET_LIST && !(AU.ASSET_DATA && AU.ASSET_DATA[k])) { if (!A._index) { A._index = {}; AU.ASSET_LIST.forEach(function (p) { A._index[p] = true; }); } if (!A._index[A.base + k + '.' + A.ext(kind)]) { e = cache[k] = { img: null, ok: false, failed: true }; return null; } }
        var img = new Image(); e = cache[k] = { img: img, ok: false, failed: false };
        img.onload = function () {
          e.ok = true;
          // Pictures opened from a bare file:// path are "tainted" for WebGL; detect it once so the 3D view can fall back.
          try { var cv = document.createElement('canvas'); cv.width = cv.height = 2; var cx = cv.getContext('2d'); cx.drawImage(img, 0, 0, 2, 2); cx.getImageData(0, 0, 1, 1); e.tainted = false; } catch (err) { e.tainted = true; }
          if (AU.App && AU.App.invalidate) AU.App.invalidate(); if (AU.App && AU.App.refreshPanel && AU.App.panel) AU.App.refreshPanel();
        };
        img.onerror = function () { e.failed = true; };
        img.src = (AU.ASSET_DATA && AU.ASSET_DATA[k]) ? AU.ASSET_DATA[k] : A.base + k + '.' + A.ext(kind);
      }
      return e.ok ? e.img : null;
    },
    has: function (kind, id) { return !!A.get(kind, id); },
    // Heritage-specific variant (kind/<culture>/<id>) when it exists, otherwise the shared picture.
    _state: function (kind, id) { return cache[A.key(kind, id)]; },
    getFor: function (kind, id, culture) {
      if (!culture) return A.get(kind, id);
      var ck = kind + '/' + culture, img = A.get(ck, id); if (img) return img;
      var e = A._state(ck, id); if (e && e.failed) return A.get(kind, id);
      return null; // still loading
    },
    // First picture that exists in a preference list: [[kind,id], ...]. null while an earlier candidate is still loading.
    getChain: function (list) { for (var i = 0; i < list.length; i++) { var img = A.get(list[i][0], list[i][1]); if (img) return img; var e = A._state(list[i][0], list[i][1]); if (!e || !e.failed) return null; } return null; },
    textureChain: function (list) { for (var i = 0; i < list.length; i++) { var tex = A.texture(list[i][0], list[i][1]); if (tex) return tex; var e = A._state(list[i][0], list[i][1]); if (!e || !e.failed) return null; } return null; },
    // Unit picture: unique-unit art, then the cultural version of the base type, then the shared picture.
    unitChain: function (artId, baseId, culture) { var l = []; if (artId !== baseId) l.push(['units', artId]); if (culture) l.push(['units/' + culture, baseId]); l.push(['units', baseId]); return l; },
    urlFor: function (kind, id, culture) { if (!culture) return A.url(kind, id); var ck = kind + '/' + culture, e = A._state(ck, id); return e && e.ok ? A.url(ck, id) : A.url(kind, id); },
    textureFor: function (kind, id, culture) {
      if (!culture) return A.texture(kind, id);
      var ck = kind + '/' + culture, tex = A.texture(ck, id); if (tex) return tex;
      var e = A._state(ck, id); if (e && e.failed) return A.texture(kind, id);
      return null;
    },
    url: function (kind, id) { var k = A.key(kind, id); return (AU.ASSET_DATA && AU.ASSET_DATA[k]) ? AU.ASSET_DATA[k] : A.base + k + '.' + A.ext(kind); },
    usable3D: function (kind, id) { var e = cache[A.key(kind, id)]; return !!(e && e.ok && !e.tainted); },
    texture: function (kind, id) {
      var img = A.get(kind, id); if (!img || !window.THREE) return null;
      if (cache[A.key(kind, id)].tainted) return null;
      var k = A.key(kind, id); if (textures[k]) return textures[k];
      var tex = new THREE.Texture(img); tex.needsUpdate = true; tex.colorSpace = THREE.SRGBColorSpace; tex.minFilter = THREE.LinearFilter;
      textures[k] = tex; return tex;
    }
  };
})(globalThis.AU = globalThis.AU || {});
