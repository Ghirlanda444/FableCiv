// Writes web/assets/manifest.json and web/assets/PROMPTS.md: every picture the game can use, with a
// ready-made image-generation prompt for each, in one consistent style.
const fs = require('fs'), path = require('path');
require('../tests/load');
const LEADER_LOOKS = require('./leader-looks');
const CIV_SYMBOLS = require('./civ-symbols');
const UU_LOOKS = require('./uu-looks');
const AU = globalThis.AU;
const STYLE = 'Cute chibi 3D game render in the style of Clash of Clans and Kingshot: chunky exaggerated proportions, smooth rounded 3D shapes with glossy toy-like shading, soft studio lighting with a warm rim light and subtle ambient occlusion, bright saturated colours, cheerful and readable, isolated on a plain white background, no text, no watermark, no frame.';
const SCENE_STYLE = 'Colourful 3D-rendered cartoon game art like Clash of Clans and Kingshot: chunky rounded shapes with soft glossy shading and subtle ambient occlusion, bright saturated colours, cheerful, no text, no watermark.';
const UNIT_DESC = {
  settler: 'a pioneer family with an ox-drawn covered wagon and bundles',
  scout: 'a lean scout in leather with a bow on the back, looking into the distance',
  warrior: 'a bronze-age warrior with a wooden club and a hide shield',
  slinger: 'a light skirmisher whirling a leather sling, wearing a simple tunic',
  archer: 'an ancient archer drawing a wooden bow, quiver on the back',
  spearman: 'a hoplite-like spearman with a long spear and a large round shield',
  swordsman: 'an iron-age swordsman with a short sword, helmet and rectangular shield',
  horseman: 'a light cavalryman on a galloping horse with a spear',
  catapult: 'a wooden torsion catapult siege engine with a crew of two',
  galley: 'an ancient wooden galley warship with oars and a single square sail, ship only, no people',
  crossbowman: 'a medieval crossbowman in a gambeson and kettle helmet',
  pikeman: 'a medieval pikeman with a very long pike and a breastplate',
  knight: 'an armoured medieval knight on a barded warhorse with a lance',
  musketman: 'a 17th-century musketeer with a matchlock musket and wide-brim hat',
  bombard: 'a medieval bronze bombard cannon on a wooden carriage',
  caravel: 'a renaissance caravel sailing ship with lateen sails, ship only, no people',
  field_cannon: 'an 18th-century field cannon with two artillerymen',
  cavalry: 'a napoleonic hussar cavalryman on a horse with a sabre',
  rifleman: 'a 19th-century rifleman in a blue uniform with a rifle and shako',
  ironclad: 'a 19th-century ironclad steam warship with a smokestack, ship only, no people',
  artillery: 'a World War One era howitzer artillery gun with crew',
  infantry: 'a World War One infantry soldier with rifle, helmet and backpack',
  machine_gun: 'a World War One machine gun crew behind a tripod gun',
  battleship: 'an early 20th-century dreadnought battleship with big gun turrets, ship only, no people',
  tank: 'a World War Two era medium tank',
  mech_infantry: 'modern infantry soldier next to an armoured personnel carrier',
  rocket_artillery: 'a modern multiple rocket launcher truck',
  destroyer: 'a modern naval destroyer warship, ship only, no people',
  submarine: 'a modern submarine surfaced on the water, ship only, no people',
  modern_armor: 'a modern main battle tank',
  special_forces: 'a modern special forces soldier with night vision and a carbine',
  fighter: 'a World War One biplane fighter aircraft in flight, seen from the side and slightly above, no people',
  bomber: 'a World War Two four-engine heavy bomber aircraft in flight, seen from the side and slightly above, no people',
  jet_fighter: 'a modern jet fighter aircraft in flight, seen from the side and slightly above, no people'
};
const ERA_HINT = ['ancient', 'classical', 'medieval', 'renaissance', 'industrial', 'modern', 'atomic', 'futuristic'];
function eraOf(tech, civic) { if (tech && AU.TECH_BY_ID[tech]) return ERA_HINT[AU.TECH_BY_ID[tech].era]; if (civic && AU.CIVIC_BY_ID[civic]) return ERA_HINT[AU.CIVIC_BY_ID[civic].era]; return 'ancient'; }
const items = [];
// Ships, aircraft, guns and vehicles: one shared picture, no cultural versions (a machine looks the same everywhere)
const VEHICLE = new Set(['galley', 'caravel', 'ironclad', 'battleship', 'destroyer', 'submarine', 'catapult', 'bombard', 'field_cannon', 'artillery', 'machine_gun', 'rocket_artillery', 'tank', 'modern_armor', 'fighter', 'bomber', 'jet_fighter']);
const isVehicle = id => VEHICLE.has(id) || (AU.UNITS[id] && (AU.UNITS[id].cls === 'naval' || AU.UNITS[id].cls === 'navalRanged' || AU.UNITS[id].cls === 'air'));
const unitEra = id => AU.UNITS[id] && AU.UNITS[id].tech && AU.TECH_BY_ID[AU.UNITS[id].tech] ? AU.TECH_BY_ID[AU.UNITS[id].tech].era : 0;
// From the industrial era on, soldiers wear period-correct uniforms everywhere; only the person changes with the culture
const UNIFORM = { 4: '19th-century military uniform with a shako or kepi', 5: 'World War One era uniform with a steel helmet', 6: 'mid-20th-century combat fatigues and helmet', 7: 'modern camouflage battle dress with body armour' };
for (const [id, u] of Object.entries(AU.UNITS)) items.push({ kind: 'units', id, name: u.name, size: '512x512', prompt: `Chibi 3D game character, exactly one subject alone in the picture: ${UNIT_DESC[id] || u.name}, big head and small stocky body, full figure visible from head to toe, standing on the ground, 3/4 view facing left, small in the frame with empty space around it. ${STYLE}` });
for (const c of AU.CIVS) items.push({ kind: 'units', id: c.uu.id, name: c.uu.name + ' (' + c.name + ' unique unit)', size: '512x512', prompt: `Chibi 3D game character: ${UU_LOOKS[c.uu.id] || c.uu.name}, big head and small stocky body, full figure visible from head to toe, standing on the ground, 3/4 view facing left, small in the frame with empty space around it. ${STYLE}` });
for (const [id, b] of Object.entries(AU.BUILDINGS)) if (!b.noBuild) items.push({ kind: 'buildings', id, name: b.name, size: '512x512', prompt: `A single cute cartoon ${eraOf(b.tech, b.civic)} ${b.name} building for a city-builder game, chunky and rounded, seen from a 3/4 bird's-eye view, whole building visible with empty space around it. ${STYLE}` });
for (const [id, w] of Object.entries(AU.WONDERS)) items.push({ kind: 'wonders', id, name: w.name, size: '768x512', prompt: `The ${w.name}, the famous historical monument, as a cute chunky cartoon game building standing on a small round patch of green ground, bright daylight, large and centred in the frame, seen from a 3/4 bird's-eye view. ${STYLE}` });
for (const [id, n] of Object.entries(AU.NATIONAL)) items.push({ kind: 'national', id, name: n.name, size: '512x512', prompt: `A grand cartoon ${eraOf(n.tech, n.civic)} civic building called ${n.name}, chunky and rounded, standing on a small round patch of green ground, bright daylight, large and centred in the frame, seen from a 3/4 bird's-eye view. ${STYLE}` });
const NATURAL_DESC = {
  everest: 'Mount Everest: one huge snow-capped grey pyramid peak with a small snow plume, towering over two smaller peaks', kilimanjaro: 'Kilimanjaro: a wide lone volcano with a flat snowy top rising over golden savanna grass and one acacia tree',
  vesuvius: 'Mount Vesuvius: a dark cone volcano with a glowing red lava crater and a puff of grey smoke', matterhorn: 'the Matterhorn: a single sharp crooked snowy horn-shaped peak',
  uluru: 'Uluru: a huge smooth red-orange sandstone monolith on flat red desert sand', dead_sea: 'the Dead Sea: a turquoise lake with white salt crust shores and salt pillars, desert around it',
  crater_lake: 'Crater Lake: a round volcanic caldera filled with deep blue water and a small island, pine trees on the rim', yosemite: 'Yosemite: a grey granite half-dome cliff with a tall white waterfall and pine trees',
  torres: 'Torres del Paine: three grey granite towers with snowy tips over a turquoise glacial lake', danxia: 'Zhangye Danxia: rolling hills striped in rainbow bands of red, orange, yellow and green rock',
  causeway: "the Giant's Causeway: hexagonal dark basalt columns stepping down into blue sea water with white foam", barrier_reef: 'the Great Barrier Reef: bright coral heads in orange, pink and turquoise in shallow clear water with two small fish',
  halong: 'Ha Long Bay: tall green limestone karst pillars rising from emerald sea water', galapagos: 'the Galapagos: a small volcanic island with a giant tortoise and a marine iguana on black rocks',
  pantanal: 'the Pantanal: a lush green wetland with water channels, water lilies, reeds and a caiman', cliffs_dover: 'the White Cliffs of Dover: tall white chalk cliffs with green grass on top and a lighthouse, blue sea below'
};
for (const [id, n] of Object.entries(AU.NATURAL_WONDERS)) items.push({ kind: 'natural', id, name: n.name, size: '768x512', prompt: `Cute chunky chibi 3D diorama of ${NATURAL_DESC[id] || n.name + ', the famous natural landmark'}, one landmark sitting on a small flat hexagonal patch of matching ground, seen from above at a 3/4 angle, bright daylight, large and centred, isolated on a plain white background, no people, no text. ${SCENE_STYLE}` });
for (const c of AU.CIVS) for (const l of c.leaders) items.push({ kind: 'leaders', id: l.id, name: `${l.name} (${c.name})`, size: '512x640', prompt: `Chibi 3D portrait of the historical ${l.name}, ${l.title} of ${c.name}, with a recognisable likeness: ${LEADER_LOOKS[l.id] || 'period-accurate clothing and headgear'}. Big expressive head, oversized eyes, confident expression, looking at the viewer, head and shoulders, plain white background. ${STYLE}` });
const RESOURCE_DESC = {
  wheat: 'a bundle of golden wheat ears tied with a string', rice: 'a woven basket full of white rice with green rice stalks', cattle: 'a brown and white cow', sheep: 'a fluffy white sheep', deer: 'a brown deer with antlers', bananas: 'a bunch of yellow bananas', stone: 'a pile of grey stone blocks', fish: 'two shiny blue fish', crabs: 'a red crab',
  silk: 'a roll of shimmering pink silk cloth', spices: 'small sacks of red, orange and yellow spices', gems: 'a cluster of sparkling red and blue gemstones', wine: 'a bunch of purple grapes with a wine bottle', furs: 'a stack of brown animal fur pelts', ivory: 'two curved white elephant tusks', cotton: 'white cotton bolls on a plant', dyes: 'three clay pots of bright red, blue and purple dye', salt: 'a white pile of salt crystals', incense: 'an incense burner with curling smoke', pearls: 'an open oyster shell with a shiny pearl', whales: 'a blue whale',
  horses: 'a brown horse', iron: 'a pile of dark grey iron ore chunks with a metal ingot', niter: 'a white crystalline mineral pile with a small gunpowder barrel', coal: 'a pile of black coal lumps', oil: 'a black oil barrel with an oil drop'
};
for (const [id, r] of Object.entries(AU.RESOURCES)) items.push({ kind: 'resources', id, name: r.name, size: '512x512', prompt: `Chibi 3D game resource icon: ${RESOURCE_DESC[id] || 'a ' + r.name}, one single chunky glossy object, instantly recognisable, bright saturated colours, large and centred, isolated on a plain white background, no ground, no base, no circle, no text, no people. ${STYLE}` });
for (const c of AU.CIVS) items.push({ kind: 'civs', id: c.id, name: c.name + ' emblem', size: '512x512', prompt: `Round game emblem badge of the ${c.name} civilization: one bold, instantly recognisable symbol filling the centre: ${CIV_SYMBOLS[c.id] || 'a bold symbol associated with ' + c.name}. Flat bright colours, ${c.color} background, thick gold rim, thick clean outlines, symmetrical and centred, chibi cartoon vector sticker style, no text, no letters, no extra people, isolated on a plain white background. ${SCENE_STYLE}` });
// Terrain is painted procedurally by the renderer (generated textures looked like photos and broke the map's continuity).
const FEATURE_DESC = {
  oasis: 'a small cartoon oasis pond with three palm trees', mountain: 'a cluster of three chunky grey rocky mountains with snowy peaks, the middle one tallest', raider_camp: 'a small barbarian raider camp with hide tents, a campfire and a wooden palisade',
  farm: 'a small cartoon farm with wheat field rows and a tiny farmhouse', mine: 'a cartoon mine entrance in a rocky mound with a minecart and wooden supports', woodcutter: 'a cartoon lumber camp with a sawmill hut, log pile and stumps', pasture: 'a cartoon pasture with a wooden fence and two cows',
  plantation: 'a cartoon plantation with neat rows of bushes and a small hut', quarry: 'a cartoon stone quarry with cut blocks and a crane', camp: 'a cartoon hunting camp with a tent, drying racks and a campfire', fishing: 'two cartoon wooden fishing boats with nets', well: 'a cartoon oil derrick pump on rocky ground', clearing: 'a cartoon cleared meadow with stumps and a small garden',
  forest: 'a tight clump of six chunky round cartoon pine and oak trees in bright greens', jungle: 'a tight clump of chunky cartoon jungle trees with huge glossy leaves, palm fronds and vines', marsh: 'a clump of cartoon reeds and cattails around two small dark puddles with lily pads', hills: 'three soft rounded grassy cartoon hills side by side'
};
for (const [id, d] of Object.entries(FEATURE_DESC)) items.push({ kind: 'features', id, name: id.replace('_', ' ') + ' sprite', size: '512x512', prompt: `Chibi 3D game map piece: ${d}, seen from above at a 3/4 angle as one compact clump, no ground base, no platform, no circle, nothing underneath it, isolated on a plain white background, no text, no people. ${SCENE_STYLE}` });
// Throne rooms: the backdrop of the leader screen, one per cultural art group
for (const [cid, cu] of Object.entries(AU.CULTURES)) items.push({ kind: 'thrones', id: cid, name: cu.name + ' throne room', size: '768x512', nobg: true, prompt: `Interior of a grand ${cu.arch || cu.name + ' style'} throne room seen from the front, an empty ornate throne on a dais in the centre, tall pillars, banners and lanterns, warm light, no people, no text. ${SCENE_STYLE}` });
// Palace pieces (the "build your palace" screen): every piece in every architectural style
const PALACE_DESC = { hall: 'the great central hall of a palace, a wide grand building', left_wing: 'the left wing of a palace, a long two-storey building', right_wing: 'the right wing of a palace, a long two-storey building', dome: 'the ornate roof crown of a palace (a dome, tiered roof or spire) by itself', tower_left: 'a tall slender palace watchtower', tower_right: 'a tall slender palace bell tower', gate: 'the grand ceremonial gatehouse of a palace with a big arched door', walls: 'a long low decorated palace wall with battlements, seen straight on', gardens: 'a small formal palace garden with clipped trees, hedges and flower beds', fountain: 'an ornate palace fountain with a round basin and water jets', statue: 'a statue of a heroic founder on a stone pedestal', banners: 'a row of five tall flagpoles with fluttering banners' };
for (const [sid, S] of Object.entries(AU.PALACE_STYLES)) for (const [pid, d] of Object.entries(PALACE_DESC)) items.push({ kind: 'palace/' + sid, id: pid, name: S.name + ' ' + pid.replace('_', ' '), size: '512x512', prompt: `${d}, ${S.look}, ${S.name} architecture, cute chunky chibi cartoon building seen from the front at a slight angle from above, isolated on a plain white background, no ground, no text. ${SCENE_STYLE}` });
// Per-culture variants of every unit and building (Civ 4 style art groups)
for (const [cid, cu] of Object.entries(AU.CULTURES)) {
  for (const [id, u] of Object.entries(AU.UNITS)) {
    if (isVehicle(id)) continue;
    const era = unitEra(id), modern = era >= 4;
    const outfit = modern ? `wearing a period-correct ${UNIFORM[era] || UNIFORM[7]} (absolutely no ancient armour, no tunic, no shield) with only a small ${cu.name} detail such as a badge or sash` : `equipment and clothing in ${cu.gear}`;
    items.push({ kind: 'units/' + cid, id, name: u.name + ' (' + cu.name + ')', size: '512x512', prompt: `Chibi 3D game character, exactly one single character alone in the picture (no second person, no companion, no group): a ${cu.name} ${UNIT_DESC[id] || u.name}, with ${cu.people}, ${outfit}, big head and small stocky body, full figure visible from head to toe, standing on the ground, 3/4 view facing left, small in the frame with empty space around it. ${STYLE}` });
  }
  for (const [id, b] of Object.entries(AU.BUILDINGS)) if (!b.noBuild || id === 'palace') items.push({ kind: 'buildings/' + cid, id, name: b.name + ' (' + cu.name + ')', size: '512x512', prompt: `A single cute cartoon ${eraOf(b.tech, b.civic)} ${b.name} building for a city-builder game in ${cu.arch}, chunky and rounded, seen from a 3/4 bird's-eye view, whole building visible with empty space around it. ${STYLE}` });
}
const CARD_STYLE = 'Cute chibi 3D-rendered mobile strategy game illustration, chunky rounded shapes with glossy toy-like shading, bright saturated colours, cheerful, a small scene filling the whole square. Absolutely no text, no words, no letters, no numbers, no titles, no logos, no badges, no watermark, no border.';
for (const t of AU.TECHS) items.push({ kind: 'techs', id: t.id, name: t.name, size: '512x512', nobg: true, prompt: `Square game card picture for the technology "${t.name}" (${ERA_HINT[t.era]} era): a tiny chibi person or object that represents ${t.name}. ${CARD_STYLE}` });
for (const c of AU.CIVICS) items.push({ kind: 'civics', id: c.id, name: c.name, size: '512x512', nobg: true, prompt: `Square game card picture for the civic "${c.name}" (${ERA_HINT[c.era]} era): a tiny chibi scene of people that represents ${c.name}. ${CARD_STYLE}` });
const outDir = path.join(__dirname, '..', 'web', 'assets');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(items.map(i => ({ kind: i.kind, id: i.id, file: `${i.kind}/${i.id}.${['terrain', 'techs', 'civics', 'thrones'].indexOf(i.kind) >= 0 ? 'jpg' : 'png'}`, name: i.name, size: i.size, nobg: !!i.nobg })), null, 1));
let md = `# Artwork wanted (${items.length} pictures)\n\nSave each image as **web/assets/<kind>/<id>.png** (jpg for terrain, techs and civics) (PNG with transparency; the generation script removes the white background automatically). The game uses a picture the moment the file exists and keeps its built-in look for anything missing, so you can add them in any order.\n\nStyle guide for every prompt: ${STYLE}\n\n`;
let kind = '';
for (const i of items) { if (i.kind !== kind) { kind = i.kind; md += `\n## ${kind}\n\n`; } md += `- **${i.kind}/${i.id}.png** (${i.size}) — ${i.name}\n  > ${i.prompt}\n`; }
fs.writeFileSync(path.join(outDir, 'PROMPTS.md'), md);
// list of the pictures that exist on disk, so the hosted version can cache them for offline play
function walk(dir, prefix) { let out = []; for (const f of fs.readdirSync(dir)) { const p = path.join(dir, f); if (fs.statSync(p).isDirectory()) out = out.concat(walk(p, prefix + f + '/')); else if (/\.(png|jpg)$/i.test(f)) out.push('assets/' + prefix + f); } return out; }
fs.writeFileSync(path.join(__dirname, '..', 'web', 'js', 'assetlist.js'), '// generated by tools/asset-manifest.js: pictures present on disk (used to warm the offline cache)\n(function (AU) { AU.ASSET_LIST = ' + JSON.stringify(walk(outDir, '')) + '; })(globalThis.AU = globalThis.AU || {});\n');
console.log('manifest:', items.length, 'items;', Object.entries(items.reduce((a, i) => { a[i.kind] = (a[i.kind] || 0) + 1; return a; }, {})).map(e => e.join(' ')).join(', '));
