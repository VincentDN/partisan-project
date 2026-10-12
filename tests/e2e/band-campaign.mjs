// The band screen on the campaign (WP-W15), in the browser: the map's band panel opens the Rebel Band screen on the
// campaign save; it shows the named fighters above the troop stacks; promoting one spends their experience and the
// stash's kit; "Back to the map" returns, and the map's band panel shows the new class. The standalone demo keeps its
// raid and reset and its own save.
import assert from 'node:assert/strict';
import {launch, open, startServer} from './browser.mjs';

const server = await startServer(8192),
  browser = await launch();
const saved = page => page.evaluate(() => JSON.parse(localStorage.getItem('parp-campaign-v1')));
try {
  const page = await open(browser, server.url + 'map/?campaign=bandlink');
  await page.evaluate(() => ['parp-campaign-v1', 'parp-squad-v1', 'parp-band-v2'].forEach(k => localStorage.removeItem(k)));
  await page.reload();
  await page.waitForFunction(() => window.PARP_MAP?.ready, null, {timeout: 180000});
  // give Mila the experience and the kit for her first promotion, through the map's own save
  const plan = await page.evaluate(async () => {
    const {TROOPS} = await import('/band/troops.js');
    const c = window.PARP_MAP.travel.campaign,
      f = c.band.fighters.mila,
      t = TROOPS[f.class],
      to = t.to[0];
    f.xp = t.xp + 5;
    for (const [g, n] of Object.entries(TROOPS[to].needs)) c.stash[g] = (c.stash[g] || 0) + n;
    window.PARP_MAP.travel.save();
    window.PARP_MAP.setSpeed(0);
    return {from: f.class, to, label: TROOPS[to].label};
  });

  // the band panel links to the band screen
  await page.keyboard.press('p');
  await page.locator('.band-panel:not([hidden])').waitFor();
  await Promise.all([page.waitForURL(/band\/\?campaign=/, {waitUntil: 'commit'}), page.locator('.band-panel a.band-screen').click()]);
  await page.waitForFunction(() => window.PARP_BAND?.ready, null, {timeout: 120000});
  assert.equal(await page.evaluate(() => window.PARP_BAND.mode), 'campaign');
  assert.equal(await page.locator('#groups .fighters .card').count(), 8, 'the eight named fighters');
  assert.equal(await page.locator('#skirmish').isHidden(), true, 'no practice raid in the campaign');
  assert.equal(await page.locator('#reset').isHidden(), true, 'no reset in the campaign');

  // promote Mila
  await page.locator('#groups .fighters [data-fighter="mila"]').click();
  assert.equal(await page.locator('#who').textContent(), 'Mila');
  const go = page.locator('#ups .up', {hasText: plan.label}).locator('button.go');
  assert.equal(await go.isEnabled(), true, 'ready to promote');
  await go.click();
  await page.waitForFunction(() => !window.PARP_BAND.promoting, null, {timeout: 30000});
  const c = await saved(page);
  assert.equal(c.band.fighters.mila.class, plan.to, 'promoted in the campaign save');
  assert.equal(c.band.fighters.mila.xp, 5, 'the experience is spent');
  assert.match(await page.locator('#status').textContent(), new RegExp(`Mila is now a ${plan.label}`));

  // back on the map: the band panel knows
  await Promise.all([page.waitForURL(/map\/\?campaign=c1/, {waitUntil: 'commit'}), page.locator('a.back').click()]);
  await page.waitForFunction(() => window.PARP_MAP?.ready, null, {timeout: 180000});
  await page.evaluate(() => window.PARP_MAP.setSpeed(0));
  await page.keyboard.press('p');
  await page.locator('.band-panel:not([hidden])').waitFor();
  assert.match(
    await page.locator('.band-panel [data-squad="mila"] .cls').innerText(),
    new RegExp(plan.label),
    'the map shows the new class',
  );
  assert.doesNotMatch(await page.locator('.band-panel').innerText(), /\bnull\b/, 'no stray null in the panel');
  await page.close();

  // the standalone demo: its own save, its raid and reset, no fighters
  const demo = await open(browser, server.url + 'band/');
  await demo.waitForFunction(() => window.PARP_BAND?.ready, null, {timeout: 120000});
  assert.equal(await demo.evaluate(() => window.PARP_BAND.mode), 'standalone');
  assert.equal(await demo.locator('#groups .fighters').count(), 0);
  assert.equal(await demo.locator('#skirmish').isVisible(), true);
  await demo.locator('#skirmish').click();
  const band = await demo.evaluate(() => JSON.parse(localStorage.getItem('parp-band-v2')));
  assert.equal(band.raids, 1, 'the demo saves to its own key');
  await demo.close();
  console.log('band-campaign: ok');
} finally {
  await browser.close();
  server.stop();
}
