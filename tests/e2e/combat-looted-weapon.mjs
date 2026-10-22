// Replace a primary through the body inventory, then actually fire, reload and use a bandage during combat.
import assert from 'node:assert/strict';
import {launch, open, startServer} from './browser.mjs';
const server = await startServer(8225),
  browser = await launch();
try {
  const p = await open(browser, server.url + 'convoy/');
  await p.waitForFunction(() => window.PARP_SPRITES?.ready);
  await p.evaluate(async () => {
    const {newCampaign, createStore} = await import('/shared/campaign/state.js');
    const {deploy} = await import('/shared/campaign/encounter.js');
    const c = newCampaign();
    deploy(c, {id: 'loot-fire', level: 'compound', fighters: Object.keys(c.band.fighters)});
    createStore(localStorage).save(c);
  });
  await p.goto(server.url + 'convoy/?campaign=c1&encounter=loot-fire');
  await p.waitForFunction(() => window.PARP_SPRITES?.ready);
  await p.locator('#start').click();
  const ids = await p.evaluate(() => {
    const {sim, search} = window.PARP_SPRITES;
    // Keep enemies alive (no recovery phase) but isolate player input from hostile fire.
    for (const u of sim.units)
      if (u !== sim.player) {
        u.thinkAt = Infinity;
        u.cd = 9999;
      }
    const a = search.ammo,
      k = a.kitOf(sim.player),
      enemy = sim.units.find(u => u.side === 'army');
    const issue = a.factory.issue('ak');
    a.kitOf(enemy).primary = issue.primary;
    k.rig = issue.rig;
    k.secondary = a.factory.issue('tt').primary;
    a.selectSlot(sim.player, 1);
    enemy.alive = false;
    enemy.hp = 0;
    enemy.x = sim.player.x + 1;
    enemy.z = sim.player.z;
    sim.player.hp = sim.player.maxHp - 40;
    a.scan();
    const body = a.searched.get(enemy.id);
    search.show(body);
    return {
      rifle: issue.primary.uid,
      bandage: body.container.grids.flatMap(g => g.items).find(x => x.item.slug === 'army-bandage').item.uid,
    };
  });
  const a = await p.locator(`[data-uid="${ids.rifle}"]`).boundingBox(),
    b = await p.locator('[data-weapon="primary"]').boundingBox();
  await p.mouse.move(a.x + 12, a.y + 12);
  await p.mouse.down();
  await p.mouse.move(b.x + 15, b.y + 15, {steps: 8});
  await p.mouse.up();
  await p.locator(`[data-uid="${ids.bandage}"]`).focus();
  const before = await p.evaluate(() => {
    const player = window.PARP_SPRITES.sim.player;
    const hp = player.hp;
    player.hp = player.maxHp;
    return hp;
  });
  await p.locator(`[data-use="${ids.bandage}"]`).click();
  assert.match(await p.locator('.search-status').innerText(), /Not hurt/);
  assert.match(await p.locator(`[data-use="${ids.bandage}"]`).innerText(), /30\/30/);
  await p.evaluate(hp => (window.PARP_SPRITES.sim.player.hp = hp), before);
  await p.locator(`[data-use="${ids.bandage}"]`).click();
  assert.equal(await p.evaluate(() => window.PARP_SPRITES.sim.player.hp), before + 15);
  await p.locator(`[data-uid="${ids.bandage}"]`).focus();
  await p.keyboard.press('h');
  assert.equal(await p.evaluate(() => window.PARP_SPRITES.sim.player.hp), before + 30);
  assert.equal(await p.locator(`[data-uid="${ids.bandage}"]`).count(), 0, 'spent bandage removed');
  await p.keyboard.press('Escape');
  assert.equal(await p.evaluate(() => window.PARP_SPRITES.sim.player.weapon), 'ak');
  await p.mouse.move(800, 400);
  await p.mouse.down();
  await p.waitForFunction(() => window.PARP_SPRITES.sim.player.mags.ak < 29, null, {timeout: 5000});
  await p.mouse.up();
  await p.keyboard.press('r');
  await p.waitForFunction(() => window.PARP_SPRITES.sim.player.reload > 0, null, {timeout: 5000});
  await p.waitForFunction(() => window.PARP_SPRITES.sim.player.reload === 0, null, {timeout: 10000});
  assert.ok(await p.evaluate(() => window.PARP_SPRITES.sim.player.mags.ak >= 29));
  console.log('Looted primary fires and reloads during combat; visible bandage action heals 15 HP.');
} finally {
  await browser.close();
  server.stop();
}
