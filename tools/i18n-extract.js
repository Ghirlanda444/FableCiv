// Collects every translatable English string: _() calls in the code, data names and descriptions, static text of index.html.
const fs = require('fs'), path = require('path');
const web = path.join(__dirname, '..', 'web');
const keys = new Set();
// code
function scan(dir) { fs.readdirSync(dir).forEach(f => { const p = path.join(dir, f); if (fs.statSync(p).isDirectory()) return scan(p); if (!/\.js$/.test(f)) return; const src = fs.readFileSync(p, 'utf8'); const re = /\bN?_\((?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")\)/g; let m; while ((m = re.exec(src))) keys.add((m[1] !== undefined ? m[1] : m[2]).replace(/\\(['"\\])/g, '$1')); }); }
scan(path.join(web, 'js'));
const nCode = keys.size;
// data
const AU = require('../tests/load.js');
AU.I18n.walkData(s => { keys.add(s); });
const nData = keys.size - nCode;
// static html: text nodes and title/placeholder attributes
const html = fs.readFileSync(path.join(web, 'index.html'), 'utf8').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');
let m; const reT = />([^<>]+)</g; while ((m = reT.exec(html))) { const t = m[1].trim(); if (/[A-Za-z]{2}/.test(t)) keys.add(t); }
const reA = /(?:title|placeholder)="([^"]+)"/g; while ((m = reA.exec(html))) keys.add(m[1]);
const list = Array.from(keys).filter(k => k && /[A-Za-z]/.test(k)).sort();
fs.mkdirSync(path.join(web, 'i18n'), { recursive: true });
fs.writeFileSync(path.join(web, 'i18n', 'keys.json'), JSON.stringify(list, null, 0).replace(/","/g, '",\n"'));
console.log('keys:', list.length, '(code', nCode, ', data', nData, ', html', list.length - nCode - nData, ')');
