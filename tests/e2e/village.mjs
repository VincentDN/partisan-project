// Village UI exchanges real supplies, recruits healthy fighters and rolls back blocked storage.
import assert from 'node:assert/strict';
import {launch, open, startServer} from './browser.mjs';
const server = await startServer(8188),
  browser = await launch();
try {
  const page = await open(browser, server.url + 'map/?campaign=c1');
  const ready = () => page.waitForFunction(() => window.PARP_MAP?.ready, null, {timeout: 180000});
  await ready();
  await page.evaluate(() => window.PARP_MAP.campaign.toggleBand(true));
  assert.equal(await page.locator('.trader').count(), 0);
  await page.keyboard.press('Escape');
  await page.evaluate(async () => {
    const M = window.PARP_MAP,
      {SETTLEMENTS} = await import('/map/island.js');
    const s = SETTLEMENTS.find(s => s.kind === 'village' && s.faction === 'neutral');
    M.setSpeed(0);
    Object.assign(M.travel.party, {x: s.x, z: s.z, route: null});
    M.travel.campaign.world.settlements[s.id] = {owner: 'resistance'};
    M.travel.campaign.stash.ak74 = 2; // acquired loot for the barter scenario
    M.travel.save();
    M.campaign.toggleBand(true);
  });
  await page.locator('#village-recruit').click();
  assert.equal(await page.evaluate(() => Object.keys(window.PARP_MAP.travel.campaign.band.fighters).length), 9);
  assert.match(await page.locator('.squad-cards').innerText(), /volunteer 1/);
  await page.getByLabel('Receive Medical kit', {exact: true}).fill('1');
  await page.getByLabel('Offer AK-74', {exact: true}).fill('1');
  assert.match(await page.locator('#barter-preview').innerText(), /Offer value 30; supplies value 16/);
  const before = await page.evaluate(() => structuredClone(window.PARP_MAP.travel.campaign.stash));
  // A blocked write leaves the same quantities available for a safe retry.
  await page.evaluate(() => {
    window.originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function () {
      throw Error('Quota');
    };
  });
  await page.locator('#village-barter').click();
  assert.deepEqual(await page.evaluate(() => window.PARP_MAP.travel.campaign.stash), before);
  await page.evaluate(() => {
    Storage.prototype.setItem = window.originalSetItem;
  });
  await page.locator('#village-barter').focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => window.PARP_MAP.travel.campaign.stash.ak74), before.ak74 - 1);
  assert.equal(await page.evaluate(() => window.PARP_MAP.travel.campaign.stash.medkit), (before.medkit || 0) + 1);
  await page.reload();
  await ready();
  await page.evaluate(() => window.PARP_MAP.campaign.toggleBand(true));
  assert.match(await page.locator('#village-services').innerText(), /1 volunteers and 3 meals/);
  assert.equal(await page.getByLabel('Receive Medical kit', {exact: true}).getAttribute('max'), '1');
  await page.addScriptTag({path: 'node_modules/axe-core/axe.min.js'});
  const violations = await page.evaluate(async () =>
    (await window.axe.run('#village-services', {runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa']}})).violations.map(v => ({
      id: v.id,
      description: v.description,
    })),
  );
  assert.deepEqual(violations, []);
  await page.locator('#village-talk').click();
  await page.keyboard.press('c');
  assert.match(await page.locator('.dialogue-result').innerText(), /one saved roll/);
  await page.keyboard.press('a');
  const decision = await page.locator('.dialogue-result').innerText();
  assert.match(decision, /D20:.*target 12/);
  await page.keyboard.press('a');
  assert.equal(await page.locator('.dialogue-result').innerText(), decision);
  const dialogueViolations = await page.evaluate(async () =>
    (await window.axe.run('.village-dialogue', {runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa']}})).violations.map(v => v.id),
  );
  assert.deepEqual(dialogueViolations, []);
  await page.setViewportSize({width: 390, height: 844});
  assert.equal(await page.locator('.village-dialogue').evaluate(e => e.scrollWidth <= e.clientWidth), true);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#village-talk').evaluate(e => e === document.activeElement), true);
  await page.setViewportSize({width: 1280, height: 900});
  await page.keyboard.press('Escape');
  const recruited = await page.evaluate(() => {
    const M = window.PARP_MAP,
      p = M.parties.parties.find(p => p.id === 'orion-patrol');
    M.campaign.showEncounter(M.campaign.contactAt({x: p.root.position.x, z: p.root.position.z}));
    return Object.keys(M.travel.campaign.band.fighters).find(id => id.includes('volunteer'));
  });
  await page.locator('#enc-attack').click();
  await page.waitForFunction(() => window.PARP_SPRITES?.ready, null, {timeout: 120000});
  assert.equal(await page.evaluate(id => window.PARP_SPRITES.sim.units.some(u => u.id === id && u.side === 'partisan'), recruited), true);
  console.log('village barter, keyboard exchange, recruit deployment, reload, rollback and accessibility: ok');
} finally {
  await browser.close();
  server.stop();
}
