// Renders every map type fully explored and zoomed out, one screenshot each, to eyeball the generator and the art.
const path = require('path');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const out = process.env.SHOT_DIR || path.join(__dirname, 'shots');
require('fs').mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.goto('file://' + path.join(__dirname, '..', 'web', 'index.html'));
  for (const type of Object.keys(await page.evaluate(() => AU.MAP_TYPES))) {
    await page.evaluate((type) => {
      const app = AU.App; const g = AU.G.newGame({ playerCiv: 'rome', mapSize: 'standard', mapType: type, seed: 5 });
      const p = AU.G.player(g); p.explored.fill(1); p.visible = null;
      app.startGameState(g); app.deselect();
      app.renderer.cam.zoom = 0.36; app.renderer.cam.x = AU.HEX_R * 1.732 * g.W / 2; app.renderer.cam.y = AU.HEX_R * 1.5 * g.H / 2; app.renderer.clampCamera(g); app.invalidate();
    }, type);
    await page.waitForTimeout(150);
    await page.screenshot({ path: out + `/map-${type}.png` });
  }
  // natural wonder close-up
  await page.evaluate(() => { const app = AU.App, g = app.g; const nt = g.tiles.find(t => t.natural); if (nt) { app.renderer.centerOn(g, nt.i); app.renderer.cam.zoom = 2.2; app.invalidate(); } });
  await page.waitForTimeout(200);
  await page.screenshot({ path: out + '/map-natural.png' });
  // close-up of the art at zoom 1.6
  await page.evaluate(() => { const app = AU.App, g = app.g, p = AU.G.player(g); app.renderer.cam.zoom = 1.5; app.renderer.centerOn(g, g.settlements[p.capital] ? g.settlements[p.capital].tile : AU.G.civUnits(g, 0)[0].tile); app.invalidate(); });
  await page.waitForTimeout(150);
  await page.screenshot({ path: out + '/map-closeup.png' });
  console.log('ERRORS:', errors.length); errors.forEach(e => console.log('  ', e));
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
