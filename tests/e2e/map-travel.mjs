// The band on the campaign map in the browser (WP-W3): a click on land orders a march along a route that shows on
// the ground; the band walks it on the map clock and the camera follows; open sea is refused; in a campaign the
// position is saved and survives a reload; without ?campaign nothing is saved.
import assert from 'node:assert/strict';
import {launch, open, startServer, frames} from './browser.mjs';

const server = await startServer(8196),
  browser = await launch();
const ready = page => page.waitForFunction(() => window.PARP_MAP?.ready, null, {timeout: 120000});
const saved = page => page.evaluate(() => JSON.parse(localStorage.getItem('parp-campaign-v1')));
try {
  // practice map: the band moves, nothing is saved
  const page = await open(browser, server.url + 'map/');
  await page.evaluate(() => localStorage.removeItem('parp-campaign-v1'));
  await page.reload();
  await ready(page);
  const r0 = await page.evaluate(() => !!window.PARP_MAP.travel.moveTo(-60, 120));
  assert.equal(r0, true, 'a route over land');
  assert.equal(await saved(page), null, 'no campaign, no save');

  // the campaign map
  await page.goto(server.url + 'map/?campaign=c1');
  await ready(page);
  const start = await page.evaluate(() => ({...window.PARP_MAP.travel.party}));
  assert.deepEqual([start.x, start.z], [-160, 40], 'the band starts at its camp spot');
  assert.deepEqual((await saved(page)).world.party, {x: -160, z: 40}, 'and that is saved');

  // a click on land (not a drag): a route, a line on the ground and a marker, a toast with the time it takes
  await page.evaluate(() => window.PARP_MAP.setSpeed(0)); // paused: orders still work, the band waits
  const box = await page.locator('#stage canvas').boundingBox();
  await page.mouse.click(box.x + box.width * 0.62, box.y + box.height * 0.55);
  await page.waitForFunction(() => !!window.PARP_MAP.travel.party.route, null, {timeout: 30000}); // slow software frames
  await page.waitForFunction(() => window.PARP_MAP.scene.getObjectByName('route').count > 0, null, {timeout: 60000}); // drawn on the next frame (a dot every 3 units)
  assert.match(await page.locator('#toast').innerText(), /Marching to .+ province .+ about \d/);
  assert.ok(
    await page.evaluate(
      () => window.PARP_MAP.scene.getObjectByName('route').count > 0 && window.PARP_MAP.scene.getObjectByName('route-end').visible,
    ),
    'the route on the ground, with its end marked',
  );
  const still = await page.evaluate(() => ({...window.PARP_MAP.travel.party}));
  await frames(page, 5);
  const after = await page.evaluate(() => ({...window.PARP_MAP.travel.party}));
  assert.deepEqual([after.x, after.z], [still.x, still.z], 'paused: the band waits');

  // a drag pans and does not order
  const before = await page.evaluate(() => JSON.stringify(window.PARP_MAP.travel.party.route.points));
  await page.mouse.move(box.x + 300, box.y + 300);
  await page.mouse.down();
  await page.mouse.move(box.x + 380, box.y + 340, {steps: 5});
  await page.mouse.up();
  assert.equal(await page.evaluate(() => JSON.stringify(window.PARP_MAP.travel.party.route.points)), before, 'a drag is not an order');
  assert.equal(await page.evaluate(() => window.PARP_MAP.travel.following), false, 'panning stops the camera following');

  // open sea is refused
  assert.equal(await page.evaluate(() => window.PARP_MAP.travel.moveTo(470, 350)), null);
  assert.match(await page.locator('#toast').innerText(), /open sea/);

  // march to Fort Orion: it walks on the map clock, the camera follows, and it arrives
  const plan = await page.evaluate(() => {
    const r = window.PARP_MAP.travel.moveTo(78, -20);
    return {time: r.time, end: r.points.at(-1)};
  });
  assert.equal(await page.evaluate(() => window.PARP_MAP.travel.following), true, 'an order brings the camera back');
  await page.evaluate(() => window.PARP_MAP.setSpeed(4));
  await page
    // under way (software frames on a busy machine are slow; the arrival is checked below in one step)
    .waitForFunction(s => Math.hypot(window.PARP_MAP.travel.party.x - s.x, window.PARP_MAP.travel.party.z - s.z) > 1, start, {
      timeout: 90000,
    })
    .catch(async e => {
      const st = await page.evaluate(() => ({
        party: window.PARP_MAP.travel.party,
        encounter: !document.querySelector('.encounter')?.hidden,
        toast: document.querySelector('#toast')?.innerText,
        clock: document.querySelector('.clock, #clock')?.innerText,
      }));
      throw new Error(`the band did not march: ${JSON.stringify(st)} (${e.message})`);
    });
  const cam = await page.evaluate(() => [
    window.PARP_MAP.cam.tx,
    window.PARP_MAP.cam.tz,
    window.PARP_MAP.travel.party.x,
    window.PARP_MAP.travel.party.z,
  ]);
  assert.ok(Math.hypot(cam[0] - cam[2], cam[1] - cam[3]) < 1, 'the camera follows the band');
  // finish the march in one step (the browser is slow here), then check the save
  await page.evaluate(t => window.PARP_MAP.travel.update(t + 5), plan.time);
  const end = await page.evaluate(() => ({...window.PARP_MAP.travel.party}));
  assert.equal(end.route, null, 'arrived');
  assert.equal(await page.evaluate(() => window.PARP_MAP.scene.getObjectByName('route-end').visible), false, 'the marker goes');
  assert.ok(Math.hypot(end.x - plan.end.x, end.z - plan.end.z) < 0.5);
  assert.match(await page.locator('#toast').innerText(), /arrived/);
  const s = (await saved(page)).world.party;
  assert.ok(Math.hypot(s.x - end.x, s.z - end.z) < 0.2, 'the arrival is saved');

  // a reload puts the band where it was
  await page.reload();
  await ready(page);
  const back = await page.evaluate(() => ({...window.PARP_MAP.travel.party}));
  assert.ok(Math.hypot(back.x - end.x, back.z - end.z) < 0.2, 'the band is where it was left');
  await page.close();
  console.log(
    'Map travel passed: click to march, route on the ground, paused clock, drag is not an order, sea refused, camera follows, arrival saved, reload keeps it, practice map saves nothing.',
  );
} finally {
  await browser.close();
  server.stop();
}
