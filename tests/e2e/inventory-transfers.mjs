// Real pointer double-click, primary swapping and compatible magazine insertion conserve owned equipment.
import assert from 'node:assert/strict';
import {launch, open, startServer} from './browser.mjs';
const server = await startServer(8214),
  browser = await launch();
try {
  const p = await open(browser, server.url + 'inventory/?seed=3');
  await p.waitForFunction(() => window.PARP_INV?.ready);
  const ids = await p.evaluate(async () => {
    const {rebel, kit, panels, ui} = window.PARP_INV;
    const {ARMS} = await import('/shared/inventory/arms.js');
    const {add} = await import('/shared/inventory/grid.js');
    const body = panels[1].container;
    body.grids = [{w: 10, h: 10, items: []}];
    const rifle = kit.issue('ak').primary;
    const mag = kit.make(ARMS.ak74m.mag);
    const ammo = kit.make(ARMS.ak74m.round, 30);
    const {loadMag} = await import('/shared/inventory/ammo.js');
    loadMag(window.PARP_INV.cat, mag, ammo);
    add(window.PARP_INV.cat, body, rifle);
    add(window.PARP_INV.cat, body, mag);
    ui.render();
    return {rifle: rifle.uid, original: rebel.primary.uid, mag: mag.uid};
  });
  const drag = async (from, to) => {
    await p.locator(from).scrollIntoViewIfNeeded();
    const a = await p.locator(from).boundingBox();
    const b = await p.locator(to).boundingBox();
    await p.mouse.move(a.x + 10, a.y + 10);
    await p.mouse.down();
    await p.mouse.move(b.x + 15, b.y + 15, {steps: 8});
    await p.mouse.up();
  };
  assert.ok(await p.locator('.inv-item img').count(), 'equipment icons rendered');
  await p.locator(`[data-uid="${ids.mag}"]`).dblclick();
  assert.ok(await p.locator(`.inv-panel:first-child [data-uid="${ids.mag}"]`).count(), 'double-click loots the magazine');
  await drag(`[data-uid="${ids.mag}"]`, '[data-weapon="primary"]');
  assert.equal(await p.evaluate(() => window.PARP_INV.rebel.primary.mag.uid), ids.mag, '6L23 inserts into a compatible rifle');
  await drag(`[data-uid="${ids.rifle}"]`, '[data-weapon="primary"]');
  assert.equal(await p.evaluate(() => window.PARP_INV.rebel.primary.uid), ids.rifle, 'drag onto occupied primary swaps rifles');
  assert.ok(await p.locator(`.inv-panel:nth-child(2) [data-uid="${ids.original}"]`).count(), 'old rifle preserved on body');
  await drag(`[data-uid="${ids.rifle}"]`, '.inv-panel:nth-child(2) .inv-grid');
  assert.equal(await p.evaluate(() => window.PARP_INV.rebel.primary), null, 'primary can be put down');
  await p.locator(`[data-uid="${ids.original}"]`).dblclick();
  assert.equal(await p.evaluate(() => window.PARP_INV.rebel.primary.uid), ids.original, 'double-click equips when hands are empty');
  await p.close();
  console.log('PASS inventory icons, double-click, magazines and primary transfers');
} finally {
  await browser.close();
  server.stop();
}
