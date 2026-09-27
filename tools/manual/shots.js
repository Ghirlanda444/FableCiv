// Screenshots for the printed manual: the map with its HUD, the Mastery Web, the Religion and City panels.
// node tools/manual/shots.js <outDir>
const path = require('path'), fs = require('fs');
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright');
const out = process.argv[2] || path.join(__dirname, 'out', 'shots'); fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  page.on('dialog', d => d.accept());
  await page.goto('file://' + path.join(__dirname, '..', '..', 'web', 'index.html'));
  await page.click('#btn-new');
  await page.click('.civ-card[data-civ="rome"]');
  await page.click('.leader-card[data-leader="trajan"]');
  await page.click('#btn-sheet-ok');
  await page.selectOption('#opt-size', 'small');
  await page.fill('#opt-seed', '2718');
  await page.click('#btn-start');
  await page.waitForSelector('#ld-go:not([hidden])'); await page.click('#ld-go');
  await page.waitForFunction(() => window.AU.App.g && !document.getElementById('game').hidden);
  await page.click('[data-action="found"]');
  // let the AI play our seat for a while, then hand it back
  await page.evaluate(() => { const g = AU.App.g, p = AU.G.player(g); p.isPlayer = false; p.ai = Object.assign({}, AU.LEADER_BY_ID[p.leaderId].ai); for (let i = 0; i < 70; i++) AU.G.endTurn(g); p.isPlayer = true; p.ai = null; });
  const hide = () => page.evaluate(() => { ['quote', 'leader', 'tip-card'].forEach(id => { const e = document.getElementById(id); if (e) e.hidden = true; }); const pn = document.getElementById('panel'); if (pn) pn.hidden = true; AU.App.panel = null; });
  await hide();
  await page.evaluate(() => { const g = AU.App.g, p = AU.G.player(g), cap = g.settlements[p.capital]; AU.App.refreshHud(); AU.App.renderer.centerOn(g, cap.tile); AU.App.selectSettlement && AU.App.selectSettlement(cap); AU.App.invalidate(); });
  await page.waitForTimeout(400);
  await page.evaluate(() => { ['quote', 'leader', 'tip-card'].forEach(id => { const e = document.getElementById(id); if (e) e.hidden = true; }); });
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(out, 'map.png') });
  for (const [name, fn] of [['web', "AU.App.openPanel('web', { tab: 'foundation' })"], ['religion', "AU.App.openPanel('religion')"], ['city', "AU.App.openPanel('city', { id: AU.App.g.civs[0].capital })"], ['diplomacy', "AU.App.openPanel('diplomacy')"]]) {
    await hide(); await page.evaluate(fn); await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(out, name + '.png') });
  }
  await browser.close();
  console.log('shots in', out);
})();
