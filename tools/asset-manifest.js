// Writes web/assets/manifest.json and web/assets/PROMPTS.md: every picture the game can use, with a
// ready-made image-generation prompt for each, in one consistent style.
const fs = require('fs'), path = require('path');
require('../tests/load');
const AU = globalThis.AU;
const STYLE = 'Painted concept art for a classic turn-based strategy game (Civilization IV style), warm colours, soft painterly shading, clean readable silhouette, isolated on a plain white background, no text, no watermark, no frame.';
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
  galley: 'an ancient wooden galley warship with oars and a single square sail',
  crossbowman: 'a medieval crossbowman in a gambeson and kettle helmet',
  pikeman: 'a medieval pikeman with a very long pike and a breastplate',
  knight: 'an armoured medieval knight on a barded warhorse with a lance',
  musketman: 'a 17th-century musketeer with a matchlock musket and wide-brim hat',
  bombard: 'a medieval bronze bombard cannon on a wooden carriage',
  caravel: 'a renaissance caravel sailing ship with lateen sails',
  field_cannon: 'an 18th-century field cannon with two artillerymen',
  cavalry: 'a napoleonic hussar cavalryman on a horse with a sabre',
  rifleman: 'a 19th-century rifleman in a blue uniform with a rifle and shako',
  ironclad: 'a 19th-century ironclad steam warship with a smokestack',
  artillery: 'a World War One era howitzer artillery gun with crew',
  infantry: 'a World War One infantry soldier with rifle, helmet and backpack',
  machine_gun: 'a World War One machine gun crew behind a tripod gun',
  battleship: 'an early 20th-century dreadnought battleship with big gun turrets',
  tank: 'a World War Two era medium tank',
  mech_infantry: 'modern infantry soldier next to an armoured personnel carrier',
  rocket_artillery: 'a modern multiple rocket launcher truck',
  destroyer: 'a modern naval destroyer warship',
  submarine: 'a modern submarine surfaced on the water',
  modern_armor: 'a modern main battle tank',
  special_forces: 'a modern special forces soldier with night vision and a carbine'
};
const ERA_HINT = ['ancient', 'classical', 'medieval', 'renaissance', 'industrial', 'modern', 'atomic', 'futuristic'];
function eraOf(tech, civic) { if (tech && AU.TECH_BY_ID[tech]) return ERA_HINT[AU.TECH_BY_ID[tech].era]; if (civic && AU.CIVIC_BY_ID[civic]) return ERA_HINT[AU.CIVIC_BY_ID[civic].era]; return 'ancient'; }
const items = [];
for (const [id, u] of Object.entries(AU.UNITS)) items.push({ kind: 'units', id, name: u.name, size: '512x512', prompt: `Full-body illustration of ${UNIT_DESC[id] || u.name}, the entire figure visible from head to toe, standing on the ground, side view facing left, small in the frame with empty space around it. ${STYLE}` });
for (const [id, b] of Object.entries(AU.BUILDINGS)) if (!b.noBuild) items.push({ kind: 'buildings', id, name: b.name, size: '512x512', prompt: `A single ${eraOf(b.tech, b.civic)} ${b.name} building as a strategy-game city building, seen from a 3/4 bird's-eye view, whole building visible with empty space around it. ${STYLE}` });
for (const [id, w] of Object.entries(AU.WONDERS)) items.push({ kind: 'wonders', id, name: w.name, size: '768x512', prompt: `The ${w.name}, the real historical monument, seen from a 3/4 bird's-eye view, whole monument visible with empty space around it. ${STYLE}` });
for (const [id, n] of Object.entries(AU.NATIONAL)) items.push({ kind: 'national', id, name: n.name, size: '512x512', prompt: `A grand ${eraOf(n.tech, n.civic)} civic building called ${n.name}, seen from a 3/4 bird's-eye view, whole building visible with empty space around it. ${STYLE}` });
for (const [id, n] of Object.entries(AU.NATURAL_WONDERS)) items.push({ kind: 'natural', id, name: n.name, size: '768x512', prompt: `${n.name}, the real natural landmark, seen from above at an angle as a small landscape vignette on a plain white background, painted strategy-game concept art, no text.` });
for (const c of AU.CIVS) for (const l of c.leaders) items.push({ kind: 'leaders', id: l.id, name: `${l.name} (${c.name})`, size: '512x640', prompt: `Painted portrait of ${l.name}, ${l.title} of ${c.name}, head and shoulders, period-accurate clothing, dignified expression, looking at the viewer, plain white background, classic strategy game leader portrait style, no text.` });
for (const [id, r] of Object.entries(AU.RESOURCES)) items.push({ kind: 'resources', id, name: r.name, size: '256x256', prompt: `Simple game icon of ${r.name} as a map resource, single object, slight 3D shading, isolated on a plain white background, no text.` });
for (const c of AU.CIVS) items.push({ kind: 'civs', id: c.id, name: c.name + ' emblem', size: '256x256', prompt: `Circular heraldic emblem symbolising the ${c.name} civilization, single symbolic motif, gold and ${c.color} colours, flat painted style, plain white background, no text.` });
const outDir = path.join(__dirname, '..', 'web', 'assets');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(items.map(i => ({ kind: i.kind, id: i.id, file: `${i.kind}/${i.id}.png`, name: i.name, size: i.size })), null, 1));
let md = `# Artwork wanted (${items.length} pictures)\n\nSave each image as **web/assets/<kind>/<id>.png** (PNG with transparency; the generation script removes the white background automatically). The game uses a picture the moment the file exists and keeps its built-in look for anything missing, so you can add them in any order.\n\nStyle guide for every prompt: ${STYLE}\n\n`;
let kind = '';
for (const i of items) { if (i.kind !== kind) { kind = i.kind; md += `\n## ${kind}\n\n`; } md += `- **${i.kind}/${i.id}.png** (${i.size}) — ${i.name}\n  > ${i.prompt}\n`; }
fs.writeFileSync(path.join(outDir, 'PROMPTS.md'), md);
console.log('manifest:', items.length, 'items;', Object.entries(items.reduce((a, i) => { a[i.kind] = (a[i.kind] || 0) + 1; return a; }, {})).map(e => e.join(' ')).join(', '));
