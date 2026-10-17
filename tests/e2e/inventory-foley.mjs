// Actual body search and item controls play recorded Foley while respecting live mute and volume changes.
import assert from 'node:assert/strict';
import {launch, open, startServer, frames} from './browser.mjs';
const server = await startServer(8208),
  browser = await launch();
try {
  const p = await open(browser, server.url + 'convoy/?seed=7');
  await p.waitForFunction(() => window.PARP_SPRITES?.ready, null, {timeout: 120000});
  await p.evaluate(async () => {
    const f = await import('/shared/inventory/foley.js');
    window.foleyStatus = f.inventoryFoleyStatus;
  });
  await p.locator('#start').click();
  await p.waitForFunction(() => window.foleyStatus().loaded);
  await p.evaluate(() => {
    const {sim} = window.PARP_SPRITES,
      player = sim.player;
    const enemy = sim.units.find(u => u.side === 'army');
    Object.assign(enemy, {state: 'idle', alive: false, x: player.x + 1, z: player.z});
  });
  await p.locator('#view').focus();
  await p.keyboard.down('e');
  await p.waitForFunction(() => window.PARP_SPRITES.search.open);
  await p.keyboard.up('e');
  const status = () => p.evaluate(() => window.foleyStatus());
  assert.equal((await status()).lastAction, 'open');
  assert.ok((await status()).recorded > 0, 'body opening uses decoded gun Foley');
  const before = (await status()).played;
  await frames(p, 5);
  await p.locator('.field-search .inv-panel:last-child .k-weapon').first().focus();
  await p.keyboard.press('t');
  assert.equal((await status()).lastAction, 'drop', 'keyboard quick-loot seats the rifle');
  assert.ok((await status()).played > before);
  await frames(p, 5);
  await p.locator('.field-search [data-weapon="primary"] .inv-item').focus();
  await p.keyboard.press('e');
  assert.equal((await status()).lastAction, 'eject');
  await frames(p, 5);
  await p.locator('.field-search .inv-panel:first-child .k-magazine').first().focus();
  await p.keyboard.press('u');
  assert.equal((await status()).lastAction, 'unload');
  await frames(p, 5);
  await p.keyboard.press('Escape');
  assert.equal((await status()).lastAction, 'close');
  await p.evaluate(() => window.PARP_SPRITES.sound.setOn(false));
  const muted = (await status()).played;
  await p.evaluate(() => {
    const {sim, search} = window.PARP_SPRITES;
    search.show(search.ammo.near(sim.player.x, sim.player.z));
  });
  await frames(p, 5);
  await p.keyboard.press('Escape');
  assert.equal((await status()).played, muted, 'muted opening and closing schedule no voices');
  assert.equal((await status()).gain, 0, 'mute silences existing Foley tails');
  await p.evaluate(() => {
    const s = window.PARP_SPRITES.sound;
    s.setVolume(0.25);
    s.setOn(true);
  });
  await frames(p, 5);
  await p.evaluate(() => {
    const {sim, search} = window.PARP_SPRITES;
    search.show(search.ammo.near(sim.player.x, sim.player.z));
  });
  assert.ok(Math.abs((await status()).gain - 0.4) < 0.001, 'Foley follows the saved SFX volume with a prominent handling gain');
  assert.ok((await status()).active <= 4, 'voices are bounded');
  await p.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw Error('storage unavailable');
    };
    window.PARP_SPRITES.sound.setOn(false);
  });
  assert.equal((await status()).gain, 0, 'mute still works when preference storage is unavailable');
  console.log('Recorded body/inventory Foley, item actions, mute and volume passed.');
} finally {
  await browser.close();
  server.stop();
}
