// Builds a single self-contained FableCiv.html (all scripts, styles and artwork inlined) that runs in any browser.
const fs = require('fs'), path = require('path');
const web = path.join(__dirname, '..', 'web');
let html = fs.readFileSync(path.join(web, 'index.html'), 'utf8');
// stylesheets are inlined; the fonts and UI textures they reference become data URIs so the single file works offline
function inlineCssUrls(css, baseDir) {
  return css.replace(/url\((['"]?)([^'")]+)\1\)/g, (m, q, ref) => {
    if (/^(data:|https?:)/.test(ref)) return m;
    const file = path.join(baseDir, ref); if (!fs.existsSync(file)) return m;
    const ext = ref.split('.').pop().toLowerCase(), mime = ext === 'woff2' ? 'font/woff2' : ext === 'png' ? 'image/png' : ext === 'jpg' ? 'image/jpeg' : 'application/octet-stream';
    return 'url(data:' + mime + ';base64,' + fs.readFileSync(file).toString('base64') + ')';
  });
}
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (m, href) => '<style>\n' + inlineCssUrls(fs.readFileSync(path.join(web, href), 'utf8'), path.dirname(path.join(web, href))) + '\n</style>');
// artwork present under web/assets becomes data URIs available to the loader
const assetsDir = path.join(web, 'assets'); const data = {};
function walkAssets(dir, prefix) { for (const f of fs.readdirSync(dir)) { const p = path.join(dir, f); if (fs.statSync(p).isDirectory()) { walkAssets(p, prefix + f + '/'); continue; } if (/\.(png|jpg|jpeg|webp)$/i.test(f)) { const ext = f.split('.').pop().toLowerCase(); data[prefix + f.replace(/\.[^.]+$/, '')] = 'data:image/' + (ext === 'jpg' ? 'jpeg' : ext) + ';base64,' + fs.readFileSync(p).toString('base64'); } } }
if (fs.existsSync(assetsDir)) walkAssets(assetsDir, '');
if (Object.keys(data).length) html = html.replace('<script src="js/core/rng.js"></script>', '<script>window.AU = window.AU || {}; window.AU.ASSET_DATA = ' + JSON.stringify(data) + ';</script>\n<script src="js/core/rng.js"></script>');
// every language dictionary rides along, the loader picks the chosen one
const i18nDir = path.join(web, 'i18n'), dicts = {};
if (fs.existsSync(i18nDir)) for (const f of fs.readdirSync(i18nDir)) if (/^[a-z]{2}\.json$/.test(f)) dicts[f.slice(0, 2)] = JSON.parse(fs.readFileSync(path.join(i18nDir, f), 'utf8'));
if (Object.keys(dicts).length) html = html.replace('<script src="js/i18n.js"></script>', '<script>window.AU = window.AU || {}; window.AU.I18N_DICTS = ' + JSON.stringify(dicts) + ';</script>\n<script src="js/i18n.js"></script>');
html = html.replace(/<script src="([^"]+)"><\/script>/g, (m, src) => '<script>\n' + fs.readFileSync(path.join(web, src), 'utf8').replace(/<\/script/g, '<\\/script') + '\n</script>');
const out = process.argv[2] || path.join(__dirname, '..', 'FableCiv.html');
fs.writeFileSync(out, html);
console.log('wrote', out, (fs.statSync(out).size / 1024 / 1024).toFixed(1) + ' MB, artwork entries:', Object.keys(data).length);
