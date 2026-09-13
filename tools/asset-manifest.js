// Writes web/assets/manifest.json and web/assets/PROMPTS.md: every picture the game can use, with a
// ready-made image-generation prompt for each, in one consistent style.
const fs = require('fs'), path = require('path');
require('../tests/load');
const AU = globalThis.AU;
const STYLE = 'Painted illustration in the style of a classic 2005 turn-based strategy game (Civilization IV era): warm colours, soft painterly shading, clean silhouette, isolated on a plain transparent (alpha) background, no text, no watermark, no frame, centered, full object visible.';
const items = [];
for (const [id, u] of Object.entries(AU.UNITS)) items.push({ kind: 'units', id, name: u.name, size: '512x512', prompt: `${u.name}, a single ${u.cls === 'civilian' ? 'civilian' : 'military'} unit of a strategy game, seen from a 3/4 front view slightly above, facing left, historically plausible equipment. ${STYLE}` });
for (const [id, b] of Object.entries(AU.BUILDINGS)) if (!b.noBuild) items.push({ kind: 'buildings', id, name: b.name, size: '512x512', prompt: `${b.name}, a single building seen from a 3/4 view slightly above, in the architecture of the era it belongs to. ${STYLE}` });
for (const [id, w] of Object.entries(AU.WONDERS)) items.push({ kind: 'wonders', id, name: w.name, size: '768x512', prompt: `The ${w.name}, the real historical monument, seen from a 3/4 view slightly above, grand and detailed. ${STYLE}` });
for (const [id, n] of Object.entries(AU.NATIONAL)) items.push({ kind: 'national', id, name: n.name, size: '512x512', prompt: `${n.name}, a grand civic building, seen from a 3/4 view slightly above. ${STYLE}` });
for (const [id, n] of Object.entries(AU.NATURAL_WONDERS)) items.push({ kind: 'natural', id, name: n.name, size: '768x512', prompt: `${n.name}, the real natural landmark, seen from above at an angle, as a landscape vignette with soft edges fading to transparent. ${STYLE}` });
for (const c of AU.CIVS) for (const l of c.leaders) items.push({ kind: 'leaders', id: l.id, name: `${l.name} (${c.name})`, size: '512x640', prompt: `Portrait of ${l.name}, ${l.title} of ${c.name}, head and shoulders, period-accurate clothing and setting, dignified expression, looking at the viewer. Painted illustration in the style of a classic strategy game leader screen, warm lighting, detailed, no text.` });
for (const [id, r] of Object.entries(AU.RESOURCES)) items.push({ kind: 'resources', id, name: r.name, size: '256x256', prompt: `Small icon of ${r.name} as a map resource, simple readable shape, slight 3D shading. ${STYLE}` });
for (const c of AU.CIVS) items.push({ kind: 'civs', id: c.id, name: c.name + ' emblem', size: '256x256', prompt: `Circular emblem representing the ${c.name} civilization, symbolic motif, gold and ${c.color} colours, flat vector-like painted style, transparent background, no text.` });
const outDir = path.join(__dirname, '..', 'web', 'assets');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(items.map(i => ({ kind: i.kind, id: i.id, file: `${i.kind}/${i.id}.png`, name: i.name, size: i.size })), null, 1));
let md = `# Artwork wanted (${items.length} pictures)\n\nSave each image as **web/assets/<kind>/<id>.png** (PNG with transparency). The game uses a picture the moment the file exists and keeps its built-in look for anything missing, so you can add them in any order.\n\nStyle guide for every prompt: ${STYLE}\n\n`;
let kind = '';
for (const i of items) { if (i.kind !== kind) { kind = i.kind; md += `\n## ${kind}\n\n`; } md += `- **${i.kind}/${i.id}.png** (${i.size}) — ${i.name}\n  > ${i.prompt}\n`; }
fs.writeFileSync(path.join(outDir, 'PROMPTS.md'), md);
console.log('manifest:', items.length, 'items;', Object.entries(items.reduce((a, i) => { a[i.kind] = (a[i.kind] || 0) + 1; return a; }, {})).map(e => e.join(' ')).join(', '));
