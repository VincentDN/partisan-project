// Healthy campaign launch and auto-resolve: visible preview, keyboard action, failed-save retry and durable results.
import assert from 'node:assert/strict';
import {launch, open, startServer} from './browser.mjs';
const server = await startServer(8186),
  browser = await launch();
const ready = page => page.waitForFunction(() => window.PARP_MAP?.ready, null, {timeout: 180000});
try {
  const page = await open(browser, 'about:blank');
  // Before scripts run, the static card must not invent a wounded soldier.
  const response = await page.request.get(server.url + 'map/');
  assert.match(await response.text(), /<dt>Wounded<\/dt><dd>0<\/dd>/);
  await page.goto(server.url + 'map/?campaign=c1');
  await ready(page);
  const card = () => page.locator('.party-card dl').innerText();
  assert.match(await card(), /Fighters\s+8 \/ 8\s+Wounded\s+0/);
  assert.ok(await page.evaluate(() => Object.values(window.PARP_MAP.travel.campaign.band.fighters).every(f => !f.wounded)));
  await page.reload();
  await ready(page);
  assert.match(await card(), /Wounded\s+0/);
  // Strength is deliberately increased in this fixture to test a lopsided convoy, not a real promotion grant.
  await page.evaluate(() => {
    const M = window.PARP_MAP;
    M.setSpeed(0);
    for (const f of Object.values(M.travel.campaign.band.fighters)) f.class = 'sniper';
    M.travel.save();
    const p = M.parties.parties.find(p => p.id === 'supply-convoy').root.position;
    M.campaign.showEncounter(M.campaign.contactAt({x: p.x, z: p.z}));
  });
  await page.locator('#enc-auto').waitFor({state: 'visible'});
  assert.match(await page.locator('#enc-auto-odds').innerText(), /chance of victory; about .* wounded/);
  const checkboxes = page.locator('.enc-fighters input[type=checkbox]');
  for (let i = 0; i < 3; i++) await checkboxes.nth(i).uncheck();
  assert.equal(await page.locator('#enc-auto').isVisible(), false, 'five fighters cannot auto-resolve');
  for (let i = 0; i < 3; i++) await checkboxes.nth(i).check();
  // Failed storage must not consume a fight, wound people or grant loot, even in memory.
  const before = await page.evaluate(() => JSON.stringify(window.PARP_MAP.travel.campaign));
  await page.evaluate(() => {
    window.restoreAutoStorage = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new Error('full');
    };
  });
  await page.locator('#enc-auto').click();
  assert.match(await page.locator('#toast').innerText(), /Cannot resolve/);
  assert.equal(await page.evaluate(() => JSON.stringify(window.PARP_MAP.travel.campaign)), before);
  await page.evaluate(() => {
    Storage.prototype.setItem = window.restoreAutoStorage;
  });
  await page.locator('#enc-auto').focus();
  await page.keyboard.press('Enter');
  await page.locator('#enc-report-close').waitFor();
  assert.match(await page.locator('.loot-report').innerText(), /Mission loot → stash/i);
  await page.locator('#enc-report-close').click();
  await page.locator('.encounter').waitFor({state: 'hidden'});
  const settled = await page.evaluate(() => JSON.parse(localStorage.getItem('parp-campaign-v1')));
  assert.equal(settled.settled.length, 1);
  assert.equal(settled.deployment, null);
  assert.equal(settled.log.filter(e => e.kind === 'result').length, 1);
  await page.reload();
  await ready(page);
  const loaded = await page.evaluate(() => window.PARP_MAP.travel.campaign);
  assert.deepEqual(loaded.band.fighters, settled.band.fighters, 'real wounds persist when continuing');
  assert.deepEqual(loaded.stash, settled.stash, 'reload grants nothing twice');
  assert.equal(loaded.settled.length, 1);
  console.log('campaign auto-resolve and healthy launch: ok');
} finally {
  await browser.close();
  server.stop();
}
