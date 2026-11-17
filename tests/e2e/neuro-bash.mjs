// Neuro-Bash renders factory swaps and can be looted, equipped and fired in a campaign.
import assert from 'node:assert/strict';
import {launch, open, startServer} from './browser.mjs';
const server = await startServer(8187),
  browser = await launch();
try {
  const page = await open(browser, server.url + 'workbench/#rifle=stg44-neuro-bash');
  await page.waitForFunction(() => document.querySelector('[data-rifle="stg44-neuro-bash"]')?.getAttribute('aria-pressed') === 'true');
  const result = await page.evaluate(async () => {
    const {loadRifle, applySlotState} = await import('./rifle-instance.js');
    const rifle = await loadRifle('stg44-neuro-bash');
    const visible = id => rifle.slots[id].original.children.filter(n => n.visible).map(n => n.name);
    applySlotState(rifle, 'magazine', '25');
    applySlotState(rifle, 'stock', 'fixed');
    const first = [visible('magazine'), visible('stock')];
    applySlotState(rifle, 'magazine', '40');
    applySlotState(rifle, 'stock', 'adjustable');
    const second = [visible('magazine'), visible('stock')];
    const primary = rifle.slots.magazine.original.getObjectByName('mag_25');
    applySlotState(rifle, 'magazine', 'clear');
    const clear = rifle.slots.magazine.options.find(option => option.id === 'clear').object;
    applySlotState(rifle, 'muzzle', 'bare');
    return {
      first,
      second,
      clearFits: clear.children.length === 1 && clear.children[0].geometry === primary.geometry,
      originalMuzzleHidden: !rifle.slots.muzzle.original.visible,
    };
  });
  assert.deepEqual(result.first, [['mag_25'], ['stock_fixed']]);
  assert.deepEqual(result.second, [['mag_40'], ['stock_adj_body', 'stock_adj_tube']]);
  assert.ok(result.clearFits && result.originalMuzzleHidden);
  const encounter = await page.evaluate(async () => {
    const {createStore, newCampaign} = await import('../shared/campaign/state.js');
    const {encounterFor} = await import('../shared/campaign/contacts.js');
    const {deploy} = await import('../shared/campaign/encounter.js');
    const campaign = newCampaign();
    const store = createStore(localStorage);
    store.save(campaign);
    const loaded = store.load().campaign;
    const mission = encounterFor(loaded, 'supply-convoy');
    deploy(loaded, mission);
    store.save(loaded);
    return mission.id;
  });
  await page.goto(server.url + 'convoy/?campaign=c1&encounter=' + encounter);
  await page.waitForFunction(() => window.PARP_SPRITES?.ready, null, {timeout: 90000});
  await page.locator('#start').click();
  const rifle = await page.evaluate(() => {
    const {sim, search, renderer} = window.PARP_SPRITES;
    const leader = sim.units.find(unit => unit.side === 'army' && unit.leader);
    if (leader.weapon !== 'stg44-neuro-bash' || !renderer.guns[leader.weapon]) return null;
    for (const unit of sim.units) {
      if (unit === sim.player) continue;
      unit.thinkAt = Infinity;
      unit.cd = 9999;
    }
    Object.assign(leader, {alive: false, hp: 0, state: 'down', x: sim.player.x + 1, z: sim.player.z});
    search.ammo.scan();
    search.show(search.ammo.searched.get(leader.id));
    const body = search.ammo.searched.get(leader.id).container;
    return body.grids.flatMap(grid => grid.items).find(entry => entry.item.slug === leader.weapon)?.item.uid;
  });
  assert.ok(rifle, 'a supply-convoy leader carries the new rifle and its actual sprite');
  const source = await page.locator(`[data-uid="${rifle}"]`).boundingBox(),
    target = await page.locator('[data-weapon="primary"]').boundingBox();
  await page.mouse.move(source.x + 12, source.y + 12);
  await page.mouse.down();
  await page.mouse.move(target.x + 15, target.y + 15, {steps: 8});
  await page.mouse.up();
  await page.keyboard.press('Escape');
  const equipped = await page.evaluate(() => {
    const player = window.PARP_SPRITES.sim.player;
    return [player.weapon, player.mags[player.weapon]];
  });
  assert.deepEqual(equipped, ['stg44-neuro-bash', 25]);
  assert.deepEqual(
    await page.evaluate(() => {
      const {sim} = window.PARP_SPRITES;
      const player = sim.player;
      const fired = sim.shoot(player, player.x + 5, player.z);
      return [fired, player.mags[player.weapon]];
    }),
    [true, 24],
  );
  console.log('Neuro-Bash factory swaps, campaign loot, equipment and ammunition passed.');
} finally {
  await browser.close();
  server.stop();
}
