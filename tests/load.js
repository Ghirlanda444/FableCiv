// Loads the game's classic scripts into a Node global scope for headless testing.
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..', 'web', 'js');
const files = ['core/rng.js', 'core/hex.js', 'data/terrain.js', 'data/civs.js', 'data/civs2.js', 'data/religion.js', 'data/citystates.js', 'data/units.js', 'data/buildings.js', 'data/techs.js', 'data/quotes.js', 'core/mapgen.js', 'core/game.js', 'core/units.js', 'core/religion.js', 'core/citystates.js', 'core/ai.js'];
for (const f of files) vm.runInThisContext(fs.readFileSync(path.join(root, f), 'utf8'), { filename: f });
module.exports = globalThis.AU;
