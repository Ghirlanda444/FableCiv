// Generates icon.ico (and icon.png) for the desktop build: a gold hexagon with a star, no external assets.
const fs = require('fs'), path = require('path'), zlib = require('zlib');
function png(size) {
  const px = Buffer.alloc(size * size * 4);
  const cx = size / 2, cy = size / 2, r = size * 0.46;
  function inHex(x, y) { const dx = Math.abs(x - cx), dy = Math.abs(y - cy); return dx <= r * 0.866 && dy <= r && (r * 0.866 * r - dx * r * 0.5 - dy * r * 0.866 >= 0 || dy <= r * 0.5); }
  function inStar(x, y) { const a = Math.atan2(y - cy, x - cx) + Math.PI / 2, d = Math.hypot(x - cx, y - cy); const k = Math.cos(5 * a) * 0.35 + 0.65; return d < r * 0.38 * k; }
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4; let c = [0, 0, 0, 0];
    if (inHex(x + 0.5, y + 0.5)) c = [138, 109, 31, 255];
    if (inStar(x + 0.5, y + 0.5)) c = [245, 215, 110, 255];
    px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = c[3];
  }
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) { raw[y * (size * 4 + 1)] = 0; px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4); }
  const crcTable = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcTable[n] = c >>> 0; }
  function crc(buf) { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
  function chunk(type, data) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const cr = Buffer.alloc(4); cr.writeUInt32BE(crc(td)); return Buffer.concat([len, td, cr]); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const sizes = [16, 32, 48, 64, 128, 256];
const pngs = sizes.map(png);
const header = Buffer.alloc(6); header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
let offset = 6 + 16 * sizes.length; const entries = [], datas = [];
sizes.forEach((s, i) => { const e = Buffer.alloc(16); e[0] = s === 256 ? 0 : s; e[1] = s === 256 ? 0 : s; e[2] = 0; e[3] = 0; e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6); e.writeUInt32LE(pngs[i].length, 8); e.writeUInt32LE(offset, 12); offset += pngs[i].length; entries.push(e); datas.push(pngs[i]); });
const out = process.argv[2] || path.join(__dirname, '..', 'desktop', 'icon.ico');
fs.writeFileSync(out, Buffer.concat([header, ...entries, ...datas]));
fs.writeFileSync(out.replace(/\.ico$/, '.png'), pngs[pngs.length - 1]);
console.log('wrote', out);
