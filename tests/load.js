// Loads the game's classic scripts into a Node global scope for headless testing.
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..', 'web', 'js');
const files = ['i18n.js', 'version.js', 'assetlist.js', 'core/rng.js', 'core/hex.js', 'data/terrain.js', 'data/civs.js', 'data/civs2.js', 'data/leanings.js', 'data/religion.js', 'data/citystates.js', 'data/maps/mediterranean.js', 'data/scenarios.js', 'data/v2/era1.js', 'data/cultures.js', 'data/palace.js', 'data/greatpeople.js', 'data/units.js', 'data/buildings.js', 'data/techs.js', 'data/mastery.js', 'data/quotes.js', 'core/mapgen.js', 'core/game.js', 'core/units.js', 'core/religion.js', 'core/citystates.js', 'core/diplomacy.js', 'core/palace.js', 'core/greatpeople.js', 'core/ai.js', 'core/v2/masteryweb.js'];
for (const f of files) vm.runInThisContext(fs.readFileSync(path.join(root, f), 'utf8'), { filename: f });
module.exports = globalThis.AU;
