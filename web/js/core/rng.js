// Seeded PRNG (mulberry32) so maps and combat are reproducible from a seed.
(function (AU) {
  function RNG(seed) {
    this.s = (seed >>> 0) || 0x9e3779b9;
  }
  RNG.prototype.next = function () {
    var t = (this.s += 0x6d2b79f5) | 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  RNG.prototype.int = function (n) { return Math.floor(this.next() * n); };
  RNG.prototype.range = function (a, b) { return a + this.next() * (b - a); };
  RNG.prototype.pick = function (arr) { return arr[this.int(arr.length)]; };
  RNG.prototype.chance = function (p) { return this.next() < p; };
  RNG.prototype.shuffle = function (arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = this.int(i + 1); var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  };
  AU.RNG = RNG;
  AU.hashString = function (str) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h >>> 0;
  };
})(globalThis.AU = globalThis.AU || {});
