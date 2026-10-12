// Keyboard and focus through the stacked panels (WP-QA8): on the campaign map the band panel, a fighter's kit on top
// of it and the music menu; in a mission the search. Escape closes the top one only, focus goes back where it was,
// Tab stays in the top panel, Space presses the focused button, no key reaches the map or the fight behind, and a
// touch drag in the kit can be cancelled.
import assert from 'node:assert/strict';
import {launch, open, startServer, frames} from './browser.mjs';

const server = await startServer(8193),
  browser = await launch();
try {
  const w = await open(browser, server.url + 'map/?campaign=overlay-test');
  await w.evaluate(() => localStorage.removeItem('parp-campaign-v1'));
  await w.reload();
  await w.waitForFunction(() => window.PARP_MAP?.ready, null, {timeout: 180000});
  await w.evaluate(() => window.PARP_MAP.setSpeed(0));
  const cam = () => w.evaluate(() => ({x: window.PARP_MAP.cam.tx, z: window.PARP_MAP.cam.tz}));
  const speed = () => w.evaluate(() => document.querySelector('[data-speed][aria-pressed="true"]')?.dataset.speed);
  const focused = () => w.evaluate(() => document.activeElement?.outerHTML.slice(0, 80) || '');
  const shown = sel => w.locator(sel).isVisible();

  // a key held down pans the map; once a panel opens it stops, though the key is still down
  await w.locator('canvas').first().focus();
  await w.keyboard.down('d');
  await frames(w, 6);
  await w.keyboard.up('d');
  const c0 = await cam();
  await w.locator('.menu-bar [data-label="Party"]').click();
  assert.ok(await shown('.band-panel'), 'Party opens the band panel');
  await w.keyboard.down('d');
  await frames(w, 6);
  await w.keyboard.up('d');
  assert.deepEqual(await cam(), c0, 'no panning behind the band panel');

  // Space presses the focused button and leaves the clock alone
  await w.locator('.band-panel .enc-actions button').focus();
  await w.keyboard.press(' ');
  assert.equal(await shown('.band-panel'), false, 'Space on Close closes the panel');
  assert.equal(await speed(), '0', 'and does not start the clock');
  assert.match(await focused(), /data-label="Party"/, 'focus is back on the Party button');

  // the second fighter's kit on top of the band panel
  await w.locator('.menu-bar [data-label="Party"]').click();
  const id = await w.locator('.kit-open').nth(1).getAttribute('data-id');
  await w.locator('.kit-open').nth(1).click();
  await w.waitForSelector('.kit-screen:not([hidden]) .inv-item', {timeout: 60000});
  for (let i = 0; i < 4; i++) await w.keyboard.press('ArrowRight');
  await frames(w, 4);
  assert.deepEqual(await cam(), c0, 'arrows in the kit do not pan the map');
  for (let i = 0; i < 40; i++) await w.keyboard.press('Tab');
  assert.ok(await w.evaluate(() => !!document.activeElement.closest('.kit-screen')), 'Tab stays in the kit screen');
  await w.keyboard.press('Shift+Tab');
  assert.ok(await w.evaluate(() => !!document.activeElement.closest('.kit-screen')), 'so does Shift+Tab');
  // touch: a drag the browser cancels (a scroll, a call) puts the item back; a finished one moves it
  const touch = (uid, to, end) =>
    w.evaluate(
      ([uid, to, end]) => {
        const it = document.querySelector(`.kit-screen [data-uid="${uid}"]`),
          a = it.getBoundingClientRect(),
          b = document.querySelector(to).getBoundingClientRect();
        const ev = (type, x, y, at = window) =>
          at.dispatchEvent(
            new PointerEvent(type, {pointerType: 'touch', pointerId: 7, isPrimary: true, button: 0, clientX: x, clientY: y, bubbles: true}),
          );
        ev('pointerdown', a.x + 5, a.y + 5, it);
        ev('pointermove', b.x + 30, b.y + 30);
        ev(end, b.x + 30, b.y + 30);
      },
      [uid, to, end],
    );
  const where = uid =>
    w.evaluate(u => {
      const panel = document.querySelector(`.kit-screen [data-uid="${u}"]`)?.closest('.inv-panel');
      return [...document.querySelectorAll('.kit-screen .inv-panel')].indexOf(panel);
    }, uid);
  const uid = await w.locator('.kit-screen .inv-panel:first-child .inv-box .inv-item').first().getAttribute('data-uid');
  const home = await where(uid);
  assert.equal(home, 0, 'the item starts in the fighter’s kit');
  await touch(uid, '.kit-screen .inv-panel:last-child .inv-grid', 'pointercancel');
  assert.equal(await where(uid), home, 'a cancelled touch drag puts the item back');
  assert.equal(await w.locator('.inv-ghost').count(), 0, 'and leaves no ghost behind');
  await touch(uid, '.kit-screen .inv-panel:last-child .inv-grid', 'pointerup');
  assert.equal(await where(uid), 1, 'a finished touch drag moves it to the armoury');
  await w.keyboard.press('Escape');
  assert.equal(await shown('.kit-screen'), false, 'Escape closes the kit');
  assert.ok(await shown('.band-panel'), 'and only the kit');
  assert.match(await focused(), new RegExp(`data-id="${id}"`), 'focus is back on that fighter’s kit button');

  // the music menu over the band panel: Escape closes the menu, not the panel
  await w.locator('#music-menu').click();
  assert.ok(await shown('#music-player'), 'the music menu opens');
  await w.keyboard.press('Escape');
  assert.equal(await shown('#music-player'), false, 'Escape closes the music menu');
  assert.ok(await shown('.band-panel'), 'the band panel stays');
  await w.keyboard.press('Escape');
  assert.equal(await shown('.band-panel'), false, 'the next Escape closes the band panel');
  await w.close();

  // in a mission: the search takes the keyboard while it is open and gives it back to the fight when it closes
  const m = await open(browser, server.url + 'convoy/?seed=7');
  await m.waitForFunction(() => window.PARP_SPRITES?.ready, null, {timeout: 60000});
  await m.locator('#start').click();
  await m.evaluate(() => {
    const {sim} = window.PARP_SPRITES,
      p = sim.player,
      u = sim.units.find(o => o.side === 'army');
    Object.assign(u, {state: 'idle', alive: false, x: p.x + 1, z: p.z});
  });
  await m.locator('#stage').focus();
  await m.keyboard.down('e');
  await m.waitForFunction(() => window.PARP_SPRITES.search.open, null, {timeout: 60000});
  await m.keyboard.up('e');
  for (let i = 0; i < 40; i++) await m.keyboard.press('Tab');
  assert.ok(await m.evaluate(() => !!document.activeElement.closest('.field-search')), 'Tab stays in the search');
  const at = await m.evaluate(() => ({x: window.PARP_SPRITES.sim.player.x, z: window.PARP_SPRITES.sim.player.z}));
  await m.keyboard.down('d');
  await frames(m, 6);
  await m.keyboard.up('d');
  assert.deepEqual(
    await m.evaluate(() => ({x: window.PARP_SPRITES.sim.player.x, z: window.PARP_SPRITES.sim.player.z})),
    at,
    'the rebel does not walk while the search is open',
  );
  await m.keyboard.press('Escape');
  assert.equal(await m.evaluate(() => window.PARP_SPRITES.search.open), false, 'Escape closes the search');
  assert.equal(await m.evaluate(() => document.activeElement.id), 'stage', 'focus is back on the fight');
  await m.close();
  console.log('overlays: ok');
} finally {
  await browser.close();
  server.stop();
}
