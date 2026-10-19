// Converts .glb models to .gltf + .bin + external .png textures (Godot 4.6.1's importer crashes on the KayKit characters' embedded
// textures). Usage: node tools/godot/glb-to-gltf.js <file.glb>...  (writes next to each input and deletes the .glb)
const fs = require('fs'), path = require('path');
for (const file of process.argv.slice(2)) {
  const b = fs.readFileSync(file), base = path.basename(file, '.glb'), dir = path.dirname(file);
  if (b.readUInt32LE(0) !== 0x46546c67) throw new Error(file + ' is not a GLB');
  let o = 12, json = null, bin = null;
  while (o < b.length) { const len = b.readUInt32LE(o), type = b.readUInt32LE(o + 4), data = b.slice(o + 8, o + 8 + len); if (type === 0x4e4f534a) json = JSON.parse(data.toString()); else if (type === 0x004e4942) bin = data; o += 8 + len; }
  (json.images || []).forEach((img, i) => {
    if (img.bufferView === undefined) return;
    const bv = json.bufferViews[img.bufferView], name = base + '_' + (img.name || 'image' + i) + (img.mimeType === 'image/jpeg' ? '.jpg' : '.png');
    fs.writeFileSync(path.join(dir, name), bin.slice(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength));
    delete img.bufferView; delete img.mimeType; img.uri = name;
  });
  json.buffers = [{ byteLength: bin.length, uri: base + '.bin' }];
  fs.writeFileSync(path.join(dir, base + '.bin'), bin);
  fs.writeFileSync(path.join(dir, base + '.gltf'), JSON.stringify(json));
  fs.unlinkSync(file);
  console.log(file + ' → ' + base + '.gltf (' + (json.images || []).length + ' textures, ' + (json.animations || []).length + ' animations)');
}
