// Syntax-check every browser script (the Node tests only load the core, so a broken UI file would otherwise slip through).
const { execFileSync } = require('child_process'), fs = require('fs'), path = require('path');
function walk(d, out) { fs.readdirSync(d).forEach(f => { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p, out); else if (f.endsWith('.js')) out.push(p); }); return out; }
const files = walk(path.join(__dirname, '..', 'web', 'js'), []); let bad = 0;
files.forEach(f => { try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); } catch (e) { bad++; console.log(String(e.stderr)); } });
if (bad) { console.log('syntax errors:', bad); process.exit(1); }
console.log('syntax OK (' + files.length + ' files)');
