// Campaign GUI: objective updates while paused, keyboard travel controls, grouped kits and responsive HUD bounds.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {launch, open, startServer} from './browser.mjs';
const server = await startServer(8210),
  browser = await launch();
const shots = process.env.GUI_SHOTS;
if (shots) fs.mkdirSync(shots, {recursive: true});
try {
  const p = await open(browser, server.url + 'map/?campaign=gui');
  await p.waitForFunction(() => window.PARP_MAP?.ready, null, {timeout: 180000});
  await p.waitForSelector('.campaign-objective');
  assert.match(await p.locator('.party-card').innerText(), /Carried rounds\s+80/);
  assert.match(await p.locator('.campaign-route').innerText(), /No travel order/);
  if (shots) await p.screenshot({path: shots + '/desktop.png'});
  await p.locator('#campaign-play').click();
  await p.waitForFunction(() => document.querySelector('#clock-state').textContent.includes('Running'));
  await p.locator('[data-speed="1"]').click();
  await p.locator('#stage').focus();
  await p.keyboard.press('w');
  assert.equal(await p.evaluate(() => window.PARP_MAP.travel.following), false);
  await p.locator('#centre-band').focus();
  await p.keyboard.press('Space');
  assert.equal(await p.evaluate(() => window.PARP_MAP.travel.following), true);
  assert.equal(
    await p.locator('[data-speed="1"]').getAttribute('aria-pressed'),
    'true',
    'Space activates the focused button without pausing',
  );
  assert.ok(
    await p.evaluate(() => {
      const t = window.PARP_MAP.travel;
      return !!t.moveTo(t.party.x + 6, t.party.z + 6);
    }),
  );
  await p.locator('[data-speed="0"]').click();
  await p.waitForFunction(() => document.querySelector('.campaign-route strong').textContent.startsWith('Travel paused'));
  await p.locator('#stop-march').focus();
  await p.keyboard.press('Enter');
  await p.waitForFunction(() => !window.PARP_MAP.travel.party.route);
  assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('parp-campaign-v1')).world.party.route), null);
  await p.locator('[data-label="Party"]').click();
  assert.equal(await p.locator('.squad-card .kit-open').count(), 8);
  assert.equal(await p.locator('.squad-card .gun-open').count(), 8);
  assert.equal(await p.locator('.band-panel .kit-buttons').count(), 0);
  assert.match(await p.locator('.empty-stash').innerText(), /No reserve equipment/);
  if (shots) await p.screenshot({path: shots + '/band.png'});
  await p.locator('.kit-open').first().click();
  await p.waitForSelector('.kit-screen:not([hidden]) .inv-item');
  await p.evaluate(() => {
    const k = window.PARP_MAP.travel.campaign.band.fighters.player.kit;
    k.primary.chamber = null;
    k.primary.mag.rounds = [];
  });
  await p.keyboard.press('Escape');
  await p.keyboard.press('Escape');
  await p.waitForFunction(() => document.querySelector('.party-card').innerText.includes('75'));
  await p.evaluate(() => {
    const c = window.PARP_MAP.travel.campaign;
    c.record.convoy = {played: 3, won: 3};
    c.world.settlements['fort-orion'] = {owner: 'resistance'};
  });
  await p.waitForFunction(() => document.querySelector('.objective-next').textContent.includes('Foothold secured'));
  await p.addScriptTag({path: 'node_modules/axe-core/axe.min.js'});
  const violations = await p.evaluate(
    async () => (await window.axe.run({include: ['.campaign-objective', '.party-card', '.timebar', '.command-panel']})).violations,
  );
  assert.deepEqual(
    violations.map(v => [v.id, v.nodes.map(n => n.target)]),
    [],
    'campaign HUD accessibility',
  );
  await p.close();
  const mobile = await open(browser, 'about:blank', {viewport: {width: 390, height: 844}});
  await mobile.goto(server.url + 'map/?campaign=gui-mobile', {waitUntil: 'domcontentloaded', timeout: 120000});
  await mobile.waitForFunction(() => window.PARP_MAP?.ready, null, {timeout: 180000});
  await mobile.locator('#command-toggle').click();
  const rectangles = await mobile.evaluate(() =>
    ['.timebar', '.command-panel'].map(selector => {
      const r = document.querySelector(selector).getBoundingClientRect();
      return {selector, left: r.left, right: r.right, top: r.top, bottom: r.bottom};
    }),
  );
  for (const r of rectangles) assert.ok(r.left >= 0 && r.right <= 390 && r.top >= 30 && r.bottom <= 844, JSON.stringify(r));
  assert.ok(rectangles[1].bottom <= rectangles[0].top, 'drawer clears time controls');
  if (shots) await mobile.screenshot({path: shots + '/mobile.png'});
  await mobile.locator('.campaign-help summary').click();
  assert.ok(await mobile.locator('.campaign-help div').isVisible());
  await mobile.locator('.campaign-help summary').click();
  await mobile.locator('[data-label="Party"]').click();
  await mobile.locator('.band-panel .panel-footer button').click();
  assert.equal(await mobile.locator('.band-panel').isHidden(), true);
  console.log('Campaign GUI: live status, keyboard actions, kit grouping, accessibility and phone layout passed.');
} finally {
  await browser.close();
  server.stop();
}
