// The technology and civic tree layouts: every prerequisite sits in an earlier column, era bands are contiguous.
const AU = require('./load.js');
const fs = require('fs'), path = require('path'), vm = require('vm');
AU.Panels = {}; globalThis.window = { innerWidth: 400 }; globalThis.document = { getElementById: () => null, addEventListener: () => {} };
for (const f of ['ui/tree.js', 'ui/audio.js']) vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'web', 'js', f), 'utf8'), { filename: f });
let fails = 0;
function check(cond, msg) { if (!cond) { fails++; console.log('FAIL', msg); } }
for (const [name, list, byId] of [['tech', AU.TECHS, AU.TECH_BY_ID], ['civic', AU.CIVICS, AU.CIVIC_BY_ID]]) {
  const L = AU.Tree.layout(list, byId);
  check(Object.keys(L.pos).length === list.length, name + ': every node placed');
  for (const t of list) for (const p of t.pre) check(L.pos[p].col < L.pos[t.id].col, name + ': ' + p + ' before ' + t.id);
  let last = -1; for (const b of L.eras) { check(b.from === last + 1, name + ': era band ' + b.name + ' contiguous'); last = b.to; }
  for (const t of list) { const b = L.eras.find(e => e.name === AU.ERAS[t.era]); check(L.pos[t.id].col >= b.from && L.pos[t.id].col <= b.to, name + ': ' + t.id + ' inside its era band'); }
  const seen = {}; for (const t of list) { const k = L.pos[t.id].col + ':' + L.pos[t.id].row; check(!seen[k], name + ': no overlap at ' + k); seen[k] = true; }
  console.log(name, 'tree:', L.cols.length, 'columns,', Math.round(L.W), 'x', Math.round(L.H), 'px; widest column', Math.max(...L.cols.map(c => c.length)));
}
check(AU.Audio.TRACKS.era7 === 'music/information.mp3', 'era track names');
check(AU.Audio.TRACKS.menu === 'music/menu.mp3', 'menu track');
if (fails) { console.log(fails, 'failures'); process.exit(1); } console.log('tree tests OK');
