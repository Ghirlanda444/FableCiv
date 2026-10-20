// Downloads the ground textures for the Godot build's detailed terrain from Poly Haven (CC0: free for any use, no
// attribution required). Run by CI before the import (the sandbox that edits this repo cannot reach polyhaven.com).
// Usage: node tools/godot/fetch-textures.js → godot/textures/<slot>_diff.jpg and <slot>_nor.jpg (grass, sand, rock, snow; generated, not committed)
// Each slot tries a list of known Poly Haven textures, then any texture whose id holds one of the keywords. A slot that
// cannot be fetched is left out; the game draws the painted look on any tile whose textures are missing.
const fs = require('fs'), path = require('path'), https = require('https');
const dest = path.join(__dirname, '..', '..', 'godot', 'textures');
const RES = process.env.TEX_RES || '1k';
const SLOTS = {
  grass: { ids: ['aerial_grass_rock', 'leafy_grass', 'sparse_grass', 'grass_path_2'], words: ['grass'] },
  sand: { ids: ['coast_sand_01', 'aerial_beach_01', 'sand_01', 'coast_sand_02'], words: ['sand', 'beach'] },
  rock: { ids: ['rocky_terrain_02', 'aerial_rocks_02', 'rock_face', 'aerial_rocks_04'], words: ['rock', 'cliff'] },
  snow: { ids: ['snow_02', 'snow_field_aerial', 'snow_01', 'snow_03'], words: ['snow'] }
};
function get(url, asJson) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'TinyEmpires-GodotBuild/1.0 (github.com/Ghirlanda444/FableCiv)' }, timeout: 60000 }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) { res.resume(); return resolve(get(res.headers.location, asJson)); }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error(url + ' → HTTP ' + res.statusCode)); }
      const chunks = []; res.on('data', c => chunks.push(c)); res.on('end', () => { const b = Buffer.concat(chunks); try { resolve(asJson ? JSON.parse(b.toString('utf8')) : b); } catch (e) { reject(e); } });
    });
    req.on('timeout', () => req.destroy(new Error('timeout ' + url))); req.on('error', reject);
  });
}
async function retry(fn, n) { for (let i = 0; ; i++) { try { return await fn(); } catch (e) { if (i + 1 >= n) throw e; await new Promise(r => setTimeout(r, 2000 * (i + 1))); } } }
// GPU-compressed with mipmaps (a fraction of the memory of the default lossless import, which matters on phones); normal maps
// keep plain RGB so the shader reads them the same on every platform
function importSettings(file) {
  fs.writeFileSync(path.join(dest, file + '.import'), '[remap]\n\nimporter="texture"\ntype="CompressedTexture2D"\n\n[params]\n\ncompress/mode=2\ncompress/normal_map=2\nmipmaps/generate=true\n');
}
function mapUrl(files, names) { for (const n of names) { const m = files[n] && (files[n][RES] || files[n]['1k'] || files[n]['2k']); const f = m && (m.jpg || m.png); if (f && f.url) return f.url; } return null; }
(async () => {
  fs.mkdirSync(dest, { recursive: true });
  const all = await retry(() => get('https://api.polyhaven.com/assets?t=textures', true), 4);
  const ids = Object.keys(all), credits = [];
  ['grass', 'sand', 'rock', 'snow'].forEach(w => console.log('poly haven ' + w + ' textures: ' + ids.filter(i => i.includes(w)).join(' '))); // for choosing better ones
  for (const slot of Object.keys(SLOTS)) {
    const S = SLOTS[slot], tries = S.ids.filter(id => all[id]).concat(ids.filter(id => S.words.some(w => id.includes(w)) && !S.ids.includes(id)));
    let done = false;
    for (const id of tries.slice(0, 6)) {
      try {
        const files = await retry(() => get('https://api.polyhaven.com/files/' + id, true), 3);
        const diff = mapUrl(files, ['Diffuse', 'diff', 'Color']), nor = mapUrl(files, ['nor_gl', 'Normal', 'nor']);
        if (!diff) continue;
        fs.writeFileSync(path.join(dest, slot + '_diff.jpg'), await retry(() => get(diff), 3)); importSettings(slot + '_diff.jpg');
        if (nor) { fs.writeFileSync(path.join(dest, slot + '_nor.jpg'), await retry(() => get(nor), 3)); importSettings(slot + '_nor.jpg'); }
        credits.push(slot + ': ' + (all[id].name || id) + ' (https://polyhaven.com/a/' + id + ')' + (nor ? '' : ', no normal map'));
        console.log('texture ' + slot + ' ← ' + id); done = true; break;
      } catch (e) { console.log('texture ' + slot + ': ' + id + ' failed (' + e.message + ')'); }
    }
    if (!done) console.log('texture ' + slot + ': none fetched, painted look on these tiles');
  }
  fs.writeFileSync(path.join(dest, 'CREDITS.txt'), 'Ground textures from Poly Haven (https://polyhaven.com), CC0 (public domain).\n' + credits.join('\n') + '\n');
})().catch(e => { console.log('textures unavailable (' + e.message + '): the game keeps the painted look'); process.exit(0); });
