// The campaign clock on the map in the browser (WP-W4): Space pauses, 1-3 set the speed and the buttons say which;
// the light follows the hour (dark and blue at night, back at dawn); at night the band sees less far, so distant
// enemies show no nameplate until they are close; an open panel stops time.
import assert from 'node:assert/strict';
import {launch, open, startServer, frames} from './browser.mjs';

const server = await startServer(8192),
  browser = await launch();
const ready = page => page.waitForFunction(() => window.PARP_MAP?.ready, null, {timeout: 120000});
try {
  const page = await open(browser, server.url + 'map/?campaign=c1');
  await page.evaluate(() => ['parp-campaign-v1', 'parp-squad-v1', 'parp-band-v2'].forEach(k => localStorage.removeItem(k)));
  await page.reload();
  await ready(page);
  const pressed = () => page.locator('[data-speed][aria-pressed=true]').getAttribute('data-speed');
  const speed = () => page.evaluate(() => window.PARP_MAP.travel.campaign.world.clock.speed);

  // speeds: 1-3 and Space, the buttons in step
  await page
    .locator('#stage canvas')
    .click({position: {x: 5, y: 5}})
    .catch(() => {});
  await page.evaluate(() => document.activeElement?.blur());
  for (const k of ['2', '3', '1']) {
    await page.keyboard.press(k);
    assert.equal(await speed(), Number(k), `key ${k}`);
    assert.equal(await pressed(), k, `button ${k} pressed`);
  }
  await page.keyboard.press(' ');
  assert.equal(await speed(), 0, 'Space pauses');
  assert.equal(await page.locator('[data-speed="0"]').getAttribute('aria-label'), 'Pause');

  // night: the sky darkens, far enemies lose their nameplates, near ones keep them
  const look = () =>
    page.evaluate(() => {
      const M = window.PARP_MAP,
        b = M.travel.party;
      const far = M.parties.parties.filter(p => p.kind !== 'player' && p.root.visible !== false);
      return {
        sky: M.scene.background.getHSL({}).l,
        plates: Object.fromEntries(far.map(p => [p.id, p.plate.style.display !== 'none'])),
        dist: Object.fromEntries(far.map(p => [p.id, Math.hypot(p.root.position.x - b.x, p.root.position.z - b.z)])),
      };
    });
  const setHour = h => page.evaluate(h => (window.PARP_MAP.travel.campaign.world.clock.hour = h), h);
  // look straight down on the band from high up so every party is on screen
  await page.evaluate(() => Object.assign(window.PARP_MAP.cam, {td: 560}));
  await setHour(12);
  await frames(page, 30);
  const day = await look();
  await setHour(23);
  await frames(page, 30);
  const night = await look();
  assert.ok(night.sky < day.sky - 0.2, `darker at night (${day.sky.toFixed(2)} -> ${night.sky.toFixed(2)})`);
  const farOnes = Object.keys(night.dist).filter(id => night.dist[id] > 70 && day.plates[id]);
  assert.ok(farOnes.length, 'some enemy is seen by day and far away');
  for (const id of farOnes) assert.equal(night.plates[id], false, `${id}: no nameplate in the dark`);
  // one of them walks up close: its nameplate shows again
  const id = farOnes[0];
  await page.evaluate(id => {
    const M = window.PARP_MAP,
      p = M.parties.parties.find(q => q.id === id);
    if (p.place) p.place(M.travel.party.x + 30, M.travel.party.z);
    else p.root.position.set(M.travel.party.x + 30, p.root.position.y, M.travel.party.z);
  }, id);
  await frames(page, 10);
  const near = await look();
  assert.ok(near.dist[id] < 60, `${id} moved close (${near.dist[id].toFixed(0)})`);
  assert.equal(near.plates[id], true, `${id} close: seen again`);
  await setHour(8);
  await frames(page, 30);
  assert.ok((await look()).sky > night.sky + 0.2, 'dawn brings the light back');

  // an open panel stops time
  await page.keyboard.press('1');
  await page.keyboard.press('p');
  await page.locator('.band-panel:not([hidden])').waitFor();
  const h0 = await page.evaluate(() => window.PARP_MAP.travel.campaign.world.clock.hour);
  await frames(page, 30);
  assert.equal(await page.evaluate(() => window.PARP_MAP.travel.campaign.world.clock.hour), h0, 'the band panel stops the clock');
  console.log('map-clock: ok');
} finally {
  await browser.close();
  server.stop();
}
