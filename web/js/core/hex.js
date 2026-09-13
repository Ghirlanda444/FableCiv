// Hex grid math. Pointy-top hexes, "odd-r" offset coordinates (odd rows shifted right).
(function (AU) {
  var SQRT3 = Math.sqrt(3);
  var EVEN = [[1, 0], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1]];
  var ODD = [[1, 0], [1, -1], [0, -1], [-1, 0], [0, 1], [1, 1]];

  var Hex = {
    SQRT3: SQRT3,
    neighborsOf: function (col, row, width, height) {
      var d = (row & 1) ? ODD : EVEN, out = [];
      for (var k = 0; k < 6; k++) {
        var c = col + d[k][0], r = row + d[k][1];
        if (c >= 0 && c < width && r >= 0 && r < height) out.push(r * width + c);
      }
      return out;
    },
    toCube: function (col, row) {
      var x = col - ((row - (row & 1)) >> 1);
      var z = row;
      return [x, -x - z, z];
    },
    fromCube: function (x, z) {
      return [x + ((z - (z & 1)) >> 1), z];
    },
    distance: function (c1, r1, c2, r2) {
      var a = Hex.toCube(c1, r1), b = Hex.toCube(c2, r2);
      return Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
    },
    // All tiles within radius r of (col,row) (excluding center when r>0 and includeCenter false)
    ring: function (col, row, radius, width, height) {
      var out = [], c = Hex.toCube(col, row);
      for (var dx = -radius; dx <= radius; dx++) {
        for (var dy = Math.max(-radius, -dx - radius); dy <= Math.min(radius, -dx + radius); dy++) {
          var dz = -dx - dy;
          if (Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz)) !== radius) continue;
          var o = Hex.fromCube(c[0] + dx, c[2] + dz);
          if (o[0] >= 0 && o[0] < width && o[1] >= 0 && o[1] < height) out.push(o[1] * width + o[0]);
        }
      }
      return out;
    },
    spiral: function (col, row, radius, width, height) {
      var out = [row * width + col];
      for (var r = 1; r <= radius; r++) out = out.concat(Hex.ring(col, row, r, width, height));
      return out;
    },
    // pixel center of a hex with circumradius R
    center: function (col, row, R) {
      return [R * SQRT3 * (col + 0.5 * (row & 1)), R * 1.5 * row];
    },
    // pixel -> offset coords (rounded)
    fromPixel: function (px, py, R) {
      var q = (SQRT3 / 3 * px - 1 / 3 * py) / R;
      var r = (2 / 3 * py) / R;
      var x = q, z = r, y = -x - z;
      var rx = Math.round(x), ry = Math.round(y), rz = Math.round(z);
      var dx = Math.abs(rx - x), dy = Math.abs(ry - y), dz = Math.abs(rz - z);
      if (dx > dy && dx > dz) rx = -ry - rz; else if (dy > dz) ry = -rx - rz; else rz = -rx - ry;
      return Hex.fromCube(rx, rz);
    },
    corners: function (cx, cy, R) {
      var pts = [];
      for (var i = 0; i < 6; i++) {
        var a = Math.PI / 180 * (60 * i - 30);
        pts.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]);
      }
      return pts;
    }
  };
  AU.Hex = Hex;
})(globalThis.AU = globalThis.AU || {});
