// Convoys on the campaign map in the browser (WP-W6): a convoy's nameplate shows its escort and its cargo; one that
// was destroyed is gone until its two days are up, then a new one is on the map again, from its seat; one that
// reaches the end of its road resupplies the garrison there, and the save keeps it.
import assert from 'node:assert/strict';
import {launch, open, startServer, frames} from './browser.mjs';

const server = await startServer(8194),
  browser = await launch();
const ready = page => page.waitForFunction(() => window.PARP_MAP?.ready, null, {timeout: 120000});
const saved = page => page.evaluate(() => JSON.parse(localStorage.getItem('parp-campaign-v1')));
try {
  const page = await open(browser, server.url + 'map/?campaign=c1');
  await page.evaluate(() => ['parp-campaign-v1', 'parp-squad-v1', 'parp-band-v2'].forEach(k => localStorage.removeItem(k)));
  await page.reload();
  await ready(page);
  await page.evaluate(() => window.PARP_MAP.setSpeed(0));

  // the nameplate: escort and cargo
  const plate = page.locator('.plate-party.invader', {hasText: 'Supply convoy'});
  assert.equal(await plate.locator('.pcount').innerText(), '14', 'its escort');
  assert.match(await plate.locator('.pcargo').innerText(), /^4 AK-74, 2 AK-74M, /, 'its cargo');
  assert.match(await plate.getAttribute('title'), /Cargo: 4 AK-74/);

  // destroyed a day ago: gone after a reload; two days on, a new one sets out
  await page.evaluate(() => {
    const M = window.PARP_MAP,
      c = M.travel.campaign;
    c.world.parties.push({id: 'fuel-convoy', state: 'destroyed', day: c.world.clock.day, hour: c.world.clock.hour});
    M.travel.save();
  });
  await page.reload();
  await ready(page);
  await page.evaluate(() => window.PARP_MAP.setSpeed(0));
  const visible = () => page.evaluate(() => window.PARP_MAP.parties.parties.find(p => p.id === 'fuel-convoy').root.visible);
  assert.equal(await visible(), false, 'the destroyed convoy is not on the map');
  const out = await page.evaluate(() => window.PARP_MAP.campaign.world.skip(49).respawned);
  assert.deepEqual(out, ['fuel-convoy']);
  await page.evaluate(() => {
    window.PARP_MAP.campaign.update(0.001); // the next frame draws it
    window.PARP_MAP.travel.save(); // as a rest does after its hours
  });
  await frames(page, 3);
  assert.equal(await visible(), true, 'a new one is on the map');
  assert.equal(
    (await saved(page)).world.parties.some(p => p.id === 'fuel-convoy' && p.state === 'destroyed'),
    false,
    'and in the save',
  );

  // the supply convoy reaches Agia Marina: the garrison there grows, and stays grown after a reload
  const before = (await saved(page)).world.settlements['agia-marina']?.garrison ?? 160;
  const r = await page.evaluate(() => {
    const W = window.PARP_MAP.campaign.world;
    for (let i = 0; i < 6000; i++) {
      const s = W.step(0.1);
      const hit = s.resupplied.find(x => x.id === 'supply-convoy');
      if (hit) return hit;
    }
    return null;
  });
  assert.ok(r && r.settlement === 'agia-marina', 'it arrived');
  await page.evaluate(() => window.PARP_MAP.travel.save());
  await page.reload();
  await ready(page);
  assert.equal((await saved(page)).world.settlements['agia-marina'].garrison, before + 8, 'the garrison took in eight soldiers');
  console.log('convoys: ok');
} finally {
  await browser.close();
  server.stop();
}
