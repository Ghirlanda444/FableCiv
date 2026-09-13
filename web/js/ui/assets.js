// Optional artwork loader. Drop PNG files into web/assets/<kind>/<id>.png and the renderers use them;
// anything missing keeps the procedural look. The single-file build inlines them as AU.ASSET_DATA.
(function (AU) {
  var cache = {}, textures = {};
  var A = AU.Assets = {
    base: 'assets/',
    key: function (kind, id) { return kind + '/' + id; },
    // returns an HTMLImageElement when loaded, null while loading or if missing
    get: function (kind, id) {
      var k = A.key(kind, id), e = cache[k];
      if (e === undefined) {
        var img = new Image(); e = cache[k] = { img: img, ok: false, failed: false };
        img.onload = function () {
          e.ok = true;
          // Pictures opened from a bare file:// path are "tainted" for WebGL; detect it once so the 3D view can fall back.
          try { var cv = document.createElement('canvas'); cv.width = cv.height = 2; var cx = cv.getContext('2d'); cx.drawImage(img, 0, 0, 2, 2); cx.getImageData(0, 0, 1, 1); e.tainted = false; } catch (err) { e.tainted = true; }
          if (AU.App && AU.App.invalidate) AU.App.invalidate(); if (AU.App && AU.App.refreshPanel && AU.App.panel) AU.App.refreshPanel();
        };
        img.onerror = function () { e.failed = true; };
        img.src = (AU.ASSET_DATA && AU.ASSET_DATA[k]) ? AU.ASSET_DATA[k] : A.base + k + '.png';
      }
      return e.ok ? e.img : null;
    },
    has: function (kind, id) { return !!A.get(kind, id); },
    url: function (kind, id) { var k = A.key(kind, id); return (AU.ASSET_DATA && AU.ASSET_DATA[k]) ? AU.ASSET_DATA[k] : A.base + k + '.png'; },
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
