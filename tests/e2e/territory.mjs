// A saved counterattack appears on the map, opens a defence and keeps liberation after a won return.
import assert from 'node:assert/strict';
import {launch, open, startServer, leaveSpoils} from './browser.mjs';
const server = await startServer(8187),
  browser = await launch();
try {
  const page = await open(browser, server.url + 'map/?campaign=c1');
  const ready = () => page.waitForFunction(() => window.PARP_MAP?.ready, null, {timeout: 180000});
  await ready();
  await page.evaluate(() => {
    const M = window.PARP_MAP,
      c = M.travel.campaign;
    c.world.settlements.myrtia = {owner: 'resistance', counterAt: 0, garrison: 0, militia: 0};
    M.campaign.world.skip(0.1);
    M.campaign.update(0);
    M.travel.save();
  });
  await page.reload();
  await ready();
  const strength = await page.evaluate(() => {
    const M = window.PARP_MAP,
      c = M.travel.campaign,
      a = c.world.counterattacks.myrtia;
    const contact = M.campaign.contactAt(a);
    if (!contact || contact.id !== a.id) throw Error('No visible counterattack contact');
    M.campaign.showEncounter(contact);
    return a.strength;
  });
  await page.locator('#enc-attack').click();
  await page.waitForFunction(() => window.PARP_SPRITES?.ready, null, {timeout: 120000});
  assert.equal(await page.evaluate(() => window.PARP_SPRITES.sim.level.counterattack), strength);
  await page.locator('#start').click();
  await page.evaluate(() => {
    window.PARP_SPRITES.sim.outcome = 'won';
  });
  await page.locator('#finish-mission').click();
  await page.locator('#combat-loot').waitFor();
  await leaveSpoils(page); // a win: the spoils screen, then the map
  await ready();
  assert.deepEqual(
    await page.evaluate(() => {
      const c = window.PARP_MAP.travel.campaign;
      return [c.world.settlements.myrtia.owner, c.world.counterattacks.myrtia.state];
    }),
    ['resistance', 'defeated'],
  );
  console.log('counterattack map/reload, exact defence, return ownership: ok');
} finally {
  await browser.close();
  server.stop();
}
