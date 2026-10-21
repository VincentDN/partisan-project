// Combat fills the screen; own inventory and both weapons work, and victory loot reaches the saved result.
import assert from 'node:assert/strict';
import {launch, open, startServer} from './browser.mjs';
const server = await startServer(8222),
  browser = await launch();
try {
  const page = await open(browser, server.url + 'convoy/');
  await page.waitForFunction(() => window.PARP_SPRITES?.ready);
  await page.evaluate(async () => {
    const {newCampaign, createStore} = await import('/shared/campaign/state.js');
    const {deploy} = await import('/shared/campaign/encounter.js');
    const c = newCampaign();
    deploy(c, {id: 'recovery-test', level: 'compound', fighters: Object.keys(c.band.fighters)});
    createStore(localStorage).save(c);
  });
  await page.goto(server.url + 'convoy/?campaign=c1&encounter=recovery-test');
  await page.waitForFunction(() => window.PARP_SPRITES?.ready);
  await page.locator('#start').click();
  assert.equal(await page.locator('main>aside').isVisible(), false);
  assert.ok(await page.locator('#stage').evaluate(e => e.clientWidth >= innerWidth - 2));
  await page.setViewportSize({width: 390, height: 844});
  assert.ok(await page.locator('.combat-controls').evaluate(e => e.scrollWidth <= e.clientWidth));
  await page.setViewportSize({width: 1280, height: 800});
  await page.locator('#combat-inventory').click();
  assert.equal(await page.locator('#search-title').innerText(), 'Your inventory');
  await page.keyboard.press('Escape');
  await page.keyboard.press('i');
  assert.equal(await page.locator('.field-search').isVisible(), true);
  await page.keyboard.press('Escape');
  const corpse = await page.evaluate(() => {
    const {sim, search} = window.PARP_SPRITES;
    const k = search.ammo.kitOf(sim.player);
    k.secondary = search.ammo.factory.issue('svd').primary;
    search.ammo.sync(sim.player);
    const dead = sim.units.find(u => u.side === 'army');
    search.ammo.kitOf(dead).primary = search.ammo.factory.issue('ak').primary;
    dead.alive = false;
    dead.hp = 0;
    Object.assign(dead, {x: sim.player.x + 1, z: sim.player.z});
    sim.outcome = 'won';
    return dead.id;
  });
  await page.locator('#finish-mission').waitFor({state: 'visible'});
  assert.equal(await page.locator('#card').isVisible(), false);
  await page.locator('#combat-secondary').click();
  assert.equal(await page.evaluate(() => window.PARP_SPRITES.sim.player.weapon), 'svd');
  await page.keyboard.press('1');
  assert.equal(await page.evaluate(() => window.PARP_SPRITES.sim.player.weapon), 'hunting');
  await page.keyboard.down('e');
  await page.locator('.field-search').waitFor({state: 'visible', timeout: 10000});
  await page.keyboard.up('e');
  const uid = await page.evaluate(id => {
    const a = window.PARP_SPRITES.search.ammo;
    const body = a.searched.get(id);
    return body.container.grids.flatMap(g => g.items).find(e => e.item.slug === 'kalashnikov-ak-74m-545x39-assault-rifle')?.item.uid;
  }, corpse);
  // Use the actual rendered corpse rifle; item kind lives in the catalogue rather than every instance.
  const rifle = uid
    ? page.locator(`[data-uid="${uid}"]`)
    : page.locator('.inv-panel:nth-child(2) .inv-item').filter({hasText: /AK/}).first();
  const a = await rifle.boundingBox(),
    b = await page.locator('[data-weapon="primary"]').boundingBox();
  await page.mouse.move(a.x + 10, a.y + 10);
  await page.mouse.down();
  await page.mouse.move(b.x + 15, b.y + 15, {steps: 8});
  await page.mouse.up();
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => window.PARP_SPRITES.sim.player.weapon), 'ak');
  await page.addScriptTag({path: 'node_modules/axe-core/axe.min.js'});
  assert.deepEqual(
    await page.evaluate(async () =>
      (await axe.run('.combat-controls', {preload: false, runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa']}})).violations.map(
        v => v.id,
      ),
    ),
    [],
  );
  if (process.env.SHOT) await page.screenshot({path: process.env.SHOT});
  await page.locator('#finish-mission').click();
  await page.locator('#combat-loot').waitFor();
  const result = await page.evaluate(() => JSON.parse(localStorage.getItem('parp-campaign-v1')).deployment.result);
  assert.equal(result.outcome, 'won');
  assert.equal(result.kits.player.primary.slug, 'kalashnikov-ak-74m-545x39-assault-rifle');
  assert.ok(Object.keys(result.kitGains).length);
  console.log('Combat controls, full viewport, own inventory, secondary switching, post-victory body loot and saved result passed.');
} finally {
  await browser.close();
  server.stop();
}
