// Fresh campaign weapons and real mouse scope lifecycle, including release, cancellation and a mission reload.
import assert from 'node:assert/strict';
import {launch, open, startServer, frames} from './browser.mjs';
const server = await startServer(8207),
  browser = await launch();
try {
  const page = await open(browser, server.url + 'convoy/');
  await page.waitForFunction(() => window.PARP_SPRITES?.ready);
  await page.evaluate(async () => {
    const {newCampaign, createStore} = await import('/shared/campaign/state.js');
    const {deploy} = await import('/shared/campaign/encounter.js');
    const c = newCampaign();
    deploy(c, {id: 'sniper-test', level: 'convoy', fighters: Object.keys(c.band.fighters)});
    createStore(localStorage).save(c);
  });
  await page.goto(server.url + 'convoy/?campaign=c1&encounter=sniper-test');
  await page.waitForFunction(() => window.PARP_SPRITES?.ready);
  const initial = await page.evaluate(() => {
    const g = window.PARP_SPRITES;
    return g.sim.units.filter(u => u.side === 'partisan').map(u => [u.weapon, u.mags[u.weapon] + u.reserve[u.weapon], u.grenades]);
  });
  assert.equal(initial.length, 8);
  assert.ok(initial.every(([gun, ammo, grenades]) => gun === 'hunting' && ammo === 10 && grenades === 0));
  await page.evaluate(async () => {
    const g = window.PARP_SPRITES;
    const {selectControl} = await import('/convoy/squad-control.js');
    selectControl(g.sim, 'mila');
    // Freeze opponents without ending the mission, so input assertions do not depend on combat timing.
    g.sim.units
      .filter(u => u.side === 'army')
      .forEach(u => {
        u.thinkAt = Infinity;
        u.cd = Infinity;
      });
    g.start();
  });
  const box = await page.locator('#view').boundingBox();
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.5);
  await page.mouse.down({button: 'right'});
  await frames(page, 8);
  const held = await page.evaluate(() => {
    const g = window.PARP_SPRITES;
    return {scope: g.sim.scope, ammo: g.sim.player.mags.hunting, camera: {...g.renderer.camera}};
  });
  assert.equal(held.scope.id, 'mila');
  assert.equal(held.ammo, 5, 'holding aims without firing');
  assert.ok(Math.abs(held.camera.x - held.scope.x) < 0.1, 'camera looks downrange');
  await page.mouse.down({button: 'left'});
  await frames(page, 3);
  await page.mouse.up({button: 'left'});
  assert.ok(await page.evaluate(() => window.PARP_SPRITES.sim.scope), 'firing keeps the scope up');
  await page.mouse.up({button: 'right'});
  await frames(page, 5);
  assert.equal(
    await page.evaluate(() => window.PARP_SPRITES.sim.player.mags.hunting),
    4,
    'left-click fires one real round; releasing aim adds none',
  );
  assert.equal(await page.evaluate(() => window.PARP_SPRITES.sim.scope), null);
  await page.mouse.down({button: 'right'});
  await frames(page, 3);
  await page.keyboard.press('Escape');
  await page.mouse.up({button: 'right'});
  await frames(page, 3);
  assert.equal(await page.evaluate(() => window.PARP_SPRITES.sim.player.mags.hunting), 4, 'Escape cancels without a shot');
  await page.mouse.down({button: 'right'});
  await frames(page, 3);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.mouse.up({button: 'right'});
  await frames(page, 3);
  assert.equal(await page.evaluate(() => window.PARP_SPRITES.sim.scope), null);
  assert.equal(await page.evaluate(() => window.PARP_SPRITES.sim.player.mags.hunting), 4);
  await page.reload();
  await page.waitForFunction(() => window.PARP_SPRITES?.ready);
  assert.equal(await page.evaluate(() => window.PARP_SPRITES.campaign.action), 'withdrawn');
  assert.equal(await page.evaluate(() => window.PARP_SPRITES.campaign.campaign.band.fighters.mila.kit.armsId), 'hunting');
  console.log('Campaign starter and sniper mouse controls passed.');
} finally {
  await browser.close();
  server.stop();
}
