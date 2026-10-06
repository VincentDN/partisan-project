// The grid inventory screen in the browser (WP-S10, TAC-C-11): the rebel's 60 rounds, the weapon's magazine out by
// keyboard, loot dragged from the cache into the backpack, a magazine emptied, loaded from loose rounds by dropping
// them on it, and swapped back into the rifle; nothing created or lost on the way.
import assert from 'node:assert/strict';
import {launch, open, startServer} from './browser.mjs';

const server = await startServer(8197),
  browser = await launch();
try {
  const page = await open(browser, server.url + 'inventory/?seed=3');
  await page.waitForFunction(() => window.PARP_INV?.ready, null, {timeout: 60000});
  const carried = () => page.evaluate(() => Number(document.getElementById('carried').textContent.match(/(\d+) rounds/)[1]));
  const state = () =>
    page.evaluate(() => {
      const {rebel} = window.PARP_INV;
      return {mag: rebel.primary.mag?.uid || null, chamber: rebel.primary.chamber};
    });
  assert.equal(await carried(), 60, 'sixty rounds at the start');

  // E on the weapon: its magazine goes to the rig, the chambered round stays
  const mag = (await state()).mag;
  await page.locator('.inv-slot .inv-item').focus();
  await page.keyboard.press('e');
  assert.equal((await state()).mag, null, 'the magazine is out');
  assert.equal(await carried(), 60, 'nothing lost');
  assert.match(await page.locator('#status').textContent(), /Magazine out/);

  // drag a stack of loose 5.45 from the cache into the backpack
  const drag = async (from, to, dx = 10, dy = 10) => {
    const a = await page.locator(from).boundingBox(),
      b = await page.locator(to).boundingBox();
    await page.mouse.move(a.x + 10, a.y + 10);
    await page.mouse.down();
    await page.mouse.move(b.x + dx, b.y + dy, {steps: 4});
    await page.mouse.up();
  };
  const loose = await page.evaluate(() => {
    const {panels, cat} = window.PARP_INV;
    for (const g of panels[2].container.grids)
      for (const e of g.items)
        if (cat.def(e.item.slug).calibre === '545x39' && cat.def(e.item.slug).kind === 'ammo') return {uid: e.item.uid, n: e.item.count};
    return null;
  });
  assert.ok(loose, 'loose 5.45 in the cache');
  const backpack = '.inv-panel:first-child .inv-box:last-child .inv-grid';
  await drag(`[data-uid="${loose.uid}"]`, backpack, 100, 100);
  assert.equal(await carried(), 60 + loose.n, `the ${loose.n} rounds are carried now`);

  // U on the magazine: its rounds come out loose; then drop the cache's rounds on it to load it
  await page.locator(`[data-uid="${mag}"]`).focus();
  await page.keyboard.press('u');
  const inMag = () =>
    page.evaluate(m => {
      const {rebel} = window.PARP_INV;
      const all = [rebel.rig, rebel.pockets, rebel.backpack].flatMap(c => c.grids.flatMap(g => g.items.map(e => e.item)));
      return all.find(i => i.uid === m)?.rounds.reduce((s, [, n]) => s + n, 0);
    }, mag);
  assert.equal(await inMag(), 0, 'emptied');
  assert.equal(await carried(), 60 + loose.n, 'the rounds are loose, still carried');
  await drag(`[data-uid="${loose.uid}"]`, `[data-uid="${mag}"]`);
  assert.equal(await inMag(), Math.min(30, loose.n), 'loaded from the loose rounds');
  assert.match(await page.locator('#status').textContent(), /loaded/);

  // drop the magazine on the weapon: it goes in and a round is there to fire
  await drag(`[data-uid="${mag}"]`, '.inv-slot');
  assert.equal((await state()).mag, mag, 'the magazine is in the rifle');
  assert.equal(await carried(), 60 + loose.n, 'nothing created or lost');
  await page.screenshot({path: process.env.SHOT || '/tmp/inventory.png'});
  console.log('inventory: ok');
} finally {
  await browser.close();
  server.stop();
}
