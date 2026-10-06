// The grid inventory screen in the browser (WP-S10, TAC-C-11): the rebel's 60 rounds, the weapon's magazine out by
// keyboard, loot dragged from the cache into the backpack, a magazine emptied, loaded from loose rounds by dropping
// them on it, and swapped back into the rifle; nothing created or lost on the way. Then in a mission: sixty rounds,
// hold E by a body to search it, Escape back to the fight (WP-S9). Then the campaign map's kit screen.
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
  await page.close();

  // in a mission: the rebel fires the rounds in their kit; hold E by the dead to search them; Escape goes back
  const m = await open(browser, server.url + 'convoy/?seed=7');
  await m.waitForFunction(() => window.PARP_SPRITES?.ready, null, {timeout: 60000});
  await m.locator('#start').click();
  const kit = await m.evaluate(() => {
    const {sim, search} = window.PARP_SPRITES,
      p = sim.player;
    return {kit: !!search.ammo.kitOf(p), ready: p.mags[p.weapon], reserve: p.reserve[p.weapon]};
  });
  assert.deepEqual(kit, {kit: true, ready: 30, reserve: 30}, 'sixty rounds in the mission too');
  await m.evaluate(() => {
    const {sim} = window.PARP_SPRITES,
      p = sim.player,
      u = sim.units.find(o => o.side === 'army');
    Object.assign(u, {state: 'idle', alive: false, x: p.x + 1, z: p.z});
    p.hp -= 30; // hurt: the medicine in the pockets has work to do
  });
  await m.locator('canvas').first().focus();
  await m.keyboard.down('e');
  await m.waitForFunction(() => window.PARP_SPRITES.search.open, null, {timeout: 60000});
  await m.keyboard.up('e');
  assert.equal(await m.locator('.field-search .inv-panel').count(), 2, 'your kit beside the body');
  assert.ok((await m.locator('.field-search .inv-panel:last-child .k-weapon').count()) >= 1, 'his weapon on him');
  const hp0 = await m.evaluate(() => window.PARP_SPRITES.sim.player.hp);
  await m.locator('.field-search .inv-panel:first-child .k-meds').first().focus();
  await m.keyboard.press('h');
  assert.ok((await m.evaluate(() => window.PARP_SPRITES.sim.player.hp)) > hp0, 'H on medicine heals');
  assert.match(await m.locator('.field-search .search-status').textContent(), /healed/);
  if (process.env.SHOT2) await m.screenshot({path: process.env.SHOT2});
  const t0 = await m.evaluate(() => window.PARP_SPRITES.sim.time);
  await m.keyboard.press('Escape');
  assert.equal(await m.evaluate(() => window.PARP_SPRITES.search.open), false, 'Escape closes it');
  await m.waitForFunction(t => window.PARP_SPRITES.sim.time > t, t0, {timeout: 30000});
  await m.close();

  // on the campaign map: the band panel opens each fighter's kit beside the armoury; it is issued once and saved
  const w = await open(browser, server.url + 'map/?campaign=kit-test');
  await w.evaluate(() => localStorage.removeItem('parp-campaign-v1'));
  await w.reload();
  await w.waitForFunction(() => window.PARP_MAP?.ready, null, {timeout: 180000});
  await w.evaluate(() => window.PARP_MAP.setSpeed(0));
  await w.keyboard.press('p');
  await w.locator('.kit-open').first().click();
  await w.waitForSelector('.kit-screen:not([hidden]) .inv-panel', {timeout: 60000});
  assert.match(await w.locator('.kit-screen .search-status').textContent(), /^60 rounds/);
  assert.equal(await w.locator('.kit-screen .inv-panel').count(), 2, 'the kit beside the armoury');
  await w.keyboard.press('Escape');
  assert.equal(await w.locator('.kit-screen').isHidden(), true);
  assert.equal(await w.locator('.band-panel').isHidden(), false, 'Escape closes the kit screen first');
  const saved = await w.evaluate(() => JSON.parse(localStorage.getItem('parp-campaign-v1')));
  assert.ok(saved.band.fighters.player.kit?.primary, 'the issued kit is in the save');
  await w.close();
  console.log('inventory: ok');
} finally {
  await browser.close();
  server.stop();
}
