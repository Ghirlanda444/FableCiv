// Builds a single self-contained FableCiv.html (all scripts and styles inlined) that runs in any browser.
const fs = require('fs'), path = require('path');
const web = path.join(__dirname, '..', 'web');
let html = fs.readFileSync(path.join(web, 'index.html'), 'utf8');
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (m, href) => '<style>\n' + fs.readFileSync(path.join(web, href), 'utf8') + '\n</style>');
html = html.replace(/<script src="([^"]+)"><\/script>/g, (m, src) => '<script>\n' + fs.readFileSync(path.join(web, src), 'utf8').replace(/<\/script/g, '<\\/script') + '\n</script>');
const out = process.argv[2] || path.join(__dirname, '..', 'FableCiv.html');
fs.writeFileSync(out, html);
console.log('wrote', out, (fs.statSync(out).size / 1024).toFixed(0) + ' KB');
