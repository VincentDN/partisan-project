// Hunters on the campaign map in the browser (WP-W7): the band's sight ring; with the heat up, the raiding party sees
// the band and says so, and its ring turns red; the band slips away out of sight, the column searches where it saw it
// and loses the trail (said, saved, the heat cools); the Orion column stands at its post until the heat reaches 50.
import assert from 'node:assert/strict';
import {launch, open, startServer, frames} from './browser.mjs';

const server = await startServer(8188),
  browser = await launch();
const ready = page => page.waitForFunction(() => window.PARP_MAP?.ready, null, {timeout: 120000});
const saved = page => page.evaluate(() => JSON.parse(localStorage.getItem('parp-campaign-v1')));
try {
  const page = await open(browser, server.url + 'map/?campaign=c1');
  await page.evaluate(() => ['parp-campaign-v1', 'parp-squad-v1', 'parp-band-v2'].forEach(k => localStorage.removeItem(k)));
  await page.reload();
  await ready(page);
  await page.evaluate(() => window.PARP_MAP.setSpeed(0));
  const ring = id => page.evaluate(id => window.PARP_MAP.scene.getObjectByName(`sight-${id}`)?.visible ?? false, id);
  const step = s => page.evaluate(s => window.PARP_MAP.campaign.update(s), s); // the world runs, the map hears the news

  await step(0.1);
  assert.equal(await ring('band'), true, 'the band shows how far it sees');
  assert.equal(await ring('raiders'), false, 'no column out while the heat is low');
  assert.equal(await page.locator('.plate-party.invader', {hasText: 'Orion hunter column'}).count(), 1, 'the Orion column at its post');

  // heat up: the raiders (82 units off, by day) see the band
  await page.evaluate(() => (window.PARP_MAP.travel.campaign.world.heat = 30));
  await step(0.1);
  assert.match(await page.locator('#toast').innerText(), /Raiding party has spotted the band!/);
  assert.equal(await ring('raiders'), true, 'its ring shows');
  assert.equal(await ring('orion-hunters'), false, 'the Orion column stays in (heat under 50)');
  let s = await saved(page);
  assert.ok(s.world.hunters.raiders.seen && s.log.some(e => e.kind === 'hunt'), 'saved: where they saw it, a hunt logged');

  // the band is gone from where they saw it (far off, out of sight): they search there, then lose the trail
  await page.evaluate(() => {
    const M = window.PARP_MAP;
    Object.assign(M.travel.party, {x: 160, z: -200, route: null}); // Vrisi, far to the south-east
    M.travel.place();
  });
  let lost = false;
  for (let i = 0; i < 60 && !lost; i++) {
    await step(1);
    lost = /lost your trail/.test(await page.locator('#toast').innerText());
  }
  assert.ok(lost, 'the trail is lost');
  s = await saved(page);
  assert.equal(s.world.hunters.raiders.seen ?? null, null, 'no lead left');
  assert.equal(s.world.heat, 25, 'the heat cooled');
  assert.ok(s.log.some(e => e.kind === 'hunt-lost'));
  await frames(page, 2);
  console.log('hunters: ok');
} finally {
  await browser.close();
  server.stop();
}
