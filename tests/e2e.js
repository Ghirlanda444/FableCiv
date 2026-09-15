// Playwright smoke test: plays the first turns through the real UI and screenshots every screen.
const path = require('path');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const out = process.env.SHOT_DIR || path.join(__dirname, 'shots');
require('fs').mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_FILE_NOT_FOUND|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  page.on('dialog', d => d.accept());
  await page.goto('file://' + path.join(__dirname, '..', 'web', 'index.html'));
  await page.screenshot({ path: out + '/01-title.png' });
  await page.click('#btn-new');
  await page.click('.civ-card[data-civ="japan"]');
  await page.click('.leader-card[data-leader="tokugawa"]');
  await page.selectOption('#opt-size', 'tiny');
  await page.fill('#opt-seed', '4242');
  await page.screenshot({ path: out + '/02-setup.png' });
  await page.click('#btn-start');
  await page.waitForFunction(() => window.AU.App.g && !document.getElementById('game').hidden);
  await page.waitForTimeout(300);
  await page.screenshot({ path: out + '/03-start.png' });
  // found the capital
  await page.click('[data-action="found"]');
  await page.waitForTimeout(100);
  await page.screenshot({ path: out + '/04-capital.png' });
  const info = await page.evaluate(() => { const g = AU.App.g, p = AU.G.player(g); return { sets: AU.G.civSettlements(g, p.idx).map(s => s.name), units: AU.G.civUnits(g, p.idx).map(u => u.type) }; });
  console.log('after founding:', JSON.stringify(info));
  // open the city panel from the context card
  await page.click('[data-action="city"]');
  await page.waitForTimeout(100);
  await page.screenshot({ path: out + '/05-city.png' });
  await page.click('[data-action="enqueue"][data-item="warrior"]');
  await page.click('[data-action="citytab"][data-tab="buildings"]');
  await page.click('[data-action="enqueue"][data-item="monument"]');
  await page.screenshot({ path: out + '/06-city-queue.png' });
  await page.click('#panel-close');
  // move the warrior by tapping a reachable tile
  const moved = await page.evaluate(() => {
    const app = AU.App, g = app.g, p = AU.G.player(g);
    const w = AU.G.civUnits(g, p.idx).find(u => u.type === 'warrior');
    app.selectUnit(w);
    const reach = Object.keys(app.renderer.highlights.reach || {});
    if (!reach.length) return 'no reachable tiles';
    const t = g.tiles[+reach[0]]; const c = app.renderer.worldToScreen(...app.renderer.tileCenter(t));
    return { x: c[0], y: c[1], from: w.tile, to: +reach[0] };
  });
  console.log('warrior move target:', JSON.stringify(moved));
  if (moved.x) { await page.mouse.click(moved.x, moved.y); await page.waitForTimeout(100); }
  const afterMove = await page.evaluate(() => { const g = AU.App.g; const w = AU.G.civUnits(g, 0).find(u => u.type === 'warrior'); return w.tile; });
  console.log('warrior tile after tap:', afterMove, moved.to === afterMove ? 'MOVED OK' : 'DID NOT MOVE');
  await page.screenshot({ path: out + '/07-unit.png' });
  // run 30 turns through the End Turn button
  for (let i = 0; i < 30; i++) {
    await page.evaluate(() => { document.getElementById('panel').hidden = true; AU.App.panel = null; AU.App.endTurn(true); });
    await page.waitForFunction(() => !AU.App.busy); await page.evaluate(() => { while (AU.App.g.quoteQueue && AU.App.g.quoteQueue.length) AU.App.g.quoteQueue.shift(); document.getElementById('quote').hidden = true; });
  }
  await page.waitForTimeout(200);
  await page.screenshot({ path: out + '/08-turn30.png' });
  const state = await page.evaluate(() => { const g = AU.App.g, p = AU.G.player(g); return { turn: g.turn, gold: Math.round(p.gold), techs: Object.keys(p.techs), sets: AU.G.civSettlements(g, p.idx).map(s => s.name + ':' + s.pop), notifs: g.notifications.length, units: AU.G.civUnits(g, p.idx).length }; });
  console.log('turn 30 state:', JSON.stringify(state));
  // in-app confirm dialog: disband a unit
  const before = await page.evaluate(() => AU.G.civUnits(AU.App.g, 0).length);
  // an audience (leader screen) may be open after meeting an empire: close it like a player would
  await page.evaluate(() => { if (AU.DiploUI && AU.DiploUI.state) AU.DiploUI.close(); AU.App.g.diploQueue = []; document.getElementById('leader').hidden = true; document.getElementById('quote').hidden = true; });
  await page.evaluate(() => { const g = AU.App.g; const u = AU.G.civUnits(g, 0)[0]; AU.App.selectUnit(u); });
  await page.click('[data-action="disband"]');
  await page.waitForSelector('#confirm:not([hidden])');
  await page.click('#confirm-no');
  const mid = await page.evaluate(() => AU.G.civUnits(AU.App.g, 0).length);
  await page.click('[data-action="disband"]');
  await page.click('#confirm-yes');
  const after = await page.evaluate(() => AU.G.civUnits(AU.App.g, 0).length);
  console.log('confirm dialog: units', before, '-> cancel', mid, '-> confirm', after, (mid === before && after === before - 1) ? 'OK' : 'FAILED');
  for (const panel of ['tech', 'civics', 'diplomacy', 'empire', 'menu', 'help', 'log']) {
    await page.evaluate(p => AU.App.openPanel(p), panel);
    await page.waitForTimeout(80);
    await page.screenshot({ path: out + `/09-${panel}.png` });
  }
  await page.evaluate(() => AU.App.closePanel());
  // pinch zoom / pan sanity: zoom out
  await page.mouse.wheel(0, 600); await page.waitForTimeout(50);
  await page.screenshot({ path: out + '/10-zoomout.png' });
  // reload and continue from autosave
  await page.reload();
  await page.waitForSelector('#btn-continue:not([hidden])');
  await page.click('#btn-continue');
  await page.waitForFunction(() => window.AU.App.g && !document.getElementById('game').hidden);
  const turn = await page.evaluate(() => AU.App.g.turn);
  console.log('continued from save at turn', turn);
  await page.screenshot({ path: out + '/11-continued.png' });
  console.log('ERRORS:', errors.length); errors.slice(0, 20).forEach(e => console.log('  ', e));
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
