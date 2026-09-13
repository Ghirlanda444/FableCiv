// Long Playwright run: the AI plays the human seat through the real UI for many turns, re-rendering
// every panel along the way so late-game states (wonders, projects, captures, victory) are exercised.
const path = require('path');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const out = process.env.SHOT_DIR || path.join(__dirname, 'shots');
const TURNS = +process.argv[2] || 200;
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('dialog', d => d.accept());
  await page.goto('file://' + path.join(__dirname, '..', 'web', 'index.html'));
  await page.click('#btn-new');
  await page.click('.civ-card[data-civ="mongolia"]');
  await page.selectOption('#opt-size', 'small');
  await page.selectOption('#opt-diff', 'king');
  await page.fill('#opt-seed', '99');
  await page.click('#btn-start');
  await page.waitForFunction(() => window.AU.App.g && !document.getElementById('game').hidden);
  await page.evaluate(() => { const p = AU.G.player(AU.App.g); p.ai = Object.assign({}, AU.G.leaderData(p).ai); });
  const t0 = Date.now();
  for (let i = 0; i < TURNS; i++) {
    const done = await page.evaluate(() => {
      const app = AU.App, g = app.g, p = AU.G.player(g);
      if (g.victory || !p.alive) return true;
      AU.AI.takeTurn(g, p);
      app.refreshHud();
      return false;
    });
    if (done) break;
    await page.click('#btn-end');
    await page.waitForFunction(() => !AU.App.busy);
    if (i % 25 === 24) {
      // render every panel and every own settlement's city panel; tap around the map
      await page.evaluate(() => {
        const app = AU.App, g = app.g, p = AU.G.player(g);
        for (const name of ['tech', 'civics', 'diplomacy', 'empire', 'log', 'menu']) app.openPanel(name);
        for (const s of AU.G.civSettlements(g, p.idx)) { app.openPanel('city', { id: s.id }); for (const tab of ['units', 'buildings', 'wonders', 'projects']) { app.panelData.tab = tab; app.refreshPanel(); } }
        app.closePanel();
        for (const u of AU.G.civUnits(g, p.idx)) { app.selectUnit(u); app.refreshHud(); }
        for (const s of AU.G.civSettlements(g, p.idx)) { app.selectSettlement(s); if (s.pendingGrowth) app.startExpand(s); app.refreshHud(); }
        for (let k = 0; k < 40; k++) app.onTap(Math.floor(Math.random() * g.tiles.length));
        app.deselect(); app.renderer.draw(g, app);
      });
      const st = await page.evaluate(() => { const g = AU.App.g, p = AU.G.player(g); return { turn: g.turn, era: AU.ERAS[p.era], sets: AU.G.civSettlements(g, p.idx).length, cities: AU.G.civSettlements(g, p.idx).filter(s => s.isCity).length, units: AU.G.civUnits(g, p.idx).length, techs: Object.keys(p.techs).length, gold: Math.round(p.gold), wonders: Object.keys(g.wonders).length, alive: g.civs.filter(c => c.alive).length, victory: g.victory }; });
      console.log(JSON.stringify(st));
      await page.screenshot({ path: out + `/long-${st.turn}.png` });
    }
  }
  await page.evaluate(() => { const app = AU.App; app.g.victory = app.g.victory || { type: 'score', civ: 0, turn: app.g.turn }; app.openPanel('victory'); });
  await page.screenshot({ path: out + '/long-victory.png' });
  console.log('elapsed', ((Date.now() - t0) / 1000).toFixed(1) + 's', 'ERRORS:', errors.length); errors.slice(0, 20).forEach(e => console.log('  ', e));
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
