// Real island prologue: camera approach, paused world, full story, input containment, skip, reload and reduced motion.
import assert from 'node:assert/strict';
import {launch, open, startServer} from './browser.mjs';
const server = await startServer(8220),
  browser = await launch();
try {
  const page = await open(browser, server.url + 'map/?campaign=c1', {reducedMotion: 'no-preference'});
  await page.waitForFunction(() => window.PARP_MAP?.opening?.active, null, {timeout: 180000});
  const clock = () => page.evaluate(() => structuredClone(window.PARP_MAP.travel.campaign.world.clock));
  const before = await clock();
  await page.locator('.opening-pause').click();
  const distance = await page.evaluate(() => window.PARP_MAP.cam.d);
  await page.waitForTimeout(800);
  assert.equal(await page.evaluate(() => window.PARP_MAP.cam.d), distance);
  await page.keyboard.press('p');
  assert.equal(await page.locator('.campaign-opening').count(), 1);
  assert.deepEqual(await clock(), before);
  await page.locator('.opening-pause').click();
  // Advance the real controller across each beat without spending 22 seconds per browser assertion.
  for (const [dt, text] of [
    [2, 'YOU ARE THE RESISTANCE.'],
    [7, 'FIVE YEARS AGO'],
    [12, 'YOU HAVE ONLY ONE OBJECTIVE'],
    [15.5, ''],
    [17.5, 'DRIVE OUT THE INVADER'],
  ]) {
    await page.evaluate(dt => window.PARP_MAP.opening.update(Math.max(0, dt - window.PARP_MAP.opening.elapsed)), dt);
    const actual = await page.locator('.opening-copy').innerText();
    if (text) assert.ok(actual.includes(text), actual);
    else assert.equal(actual, '');
  }
  assert.ok(await page.evaluate(() => window.PARP_MAP.cam.d < 500));
  assert.deepEqual(await clock(), before);
  await page.locator('.opening-pause').click();
  assert.equal(await page.locator('.opening-copy').evaluate(e => getComputedStyle(e).opacity), '1');
  await page.addScriptTag({path: 'node_modules/axe-core/axe.min.js'});
  const violations = await page.evaluate(async () =>
    (await window.axe.run('.campaign-opening', {runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa']}})).violations.map(v => v.id),
  );
  assert.deepEqual(violations, []);
  if (process.env.SHOT) await page.screenshot({path: process.env.SHOT});
  await page.locator('.opening-skip').click();
  assert.equal(await page.evaluate(() => window.PARP_MAP.ready && !window.PARP_MAP.opening.active), true);
  assert.equal(await page.locator('[data-speed="0"]').evaluate(e => e === document.activeElement), true);
  await page.reload();
  await page.waitForFunction(() => window.PARP_MAP?.ready, null, {timeout: 180000});
  assert.equal(await page.locator('.campaign-opening').count(), 0);
  await page.close();
  const mobile = await open(browser, server.url + 'map/?campaign=c1', {viewport: {width: 390, height: 844}});
  await mobile.waitForFunction(() => window.PARP_MAP?.opening?.active, null, {timeout: 180000});
  assert.match(await mobile.locator('.opening-copy').innerText(), /YOU ARE THE RESISTANCE\.[\s\S]*AND FREE YANTIS!/);
  const stationary = await mobile.evaluate(() => window.PARP_MAP.cam.d);
  await mobile.evaluate(() => window.PARP_MAP.opening.update(3));
  assert.equal(await mobile.evaluate(() => window.PARP_MAP.cam.d), stationary);
  assert.equal(await mobile.locator('.campaign-opening').evaluate(e => e.scrollWidth <= e.clientWidth), true);
  await mobile.keyboard.press('Escape');
  assert.equal(await mobile.locator('.campaign-opening').count(), 0);
  console.log('campaign prologue: camera, beats, pause, skip, reload, keyboard, reduced motion, mobile and accessibility passed');
} finally {
  await browser.close();
  server.stop();
}
