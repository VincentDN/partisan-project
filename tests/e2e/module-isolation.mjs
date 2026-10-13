// Real shell navigation must never fetch demo modules during gameplay; demos opt in on their own pages.
import assert from 'node:assert/strict';
import {launch, open, startServer} from './browser.mjs';

const server = await startServer(8187),
  browser = await launch();
const forbidden = /\/(?:operator|workbench|intro|viewer)\/.*\.js(?:\?|$)|\/map\/(?:models|demo-3d)\.js(?:\?|$)/;
try {
  const page = await open(browser, 'about:blank');
  const requests = [];
  page.on('request', r => requests.push(r.url()));
  await page.goto(server.url + '?p=map/%3Fcampaign%3Dmodules', {waitUntil: 'domcontentloaded'});
  await page.locator('#view').waitFor();
  const frame = () => page.frames().find(f => f.parentFrame() === page.mainFrame());
  const ready = name => frame().waitForFunction(n => window[n]?.ready, name, {timeout: 180000});
  await ready('PARP_MAP');
  await frame().evaluate(() => window.PARP_MAP.setSpeed(0));
  assert.ok(await frame().evaluate(() => window.PARP_MAP.sprites.cards.length > 0));
  await frame().locator('#stage').press('p');
  await frame().locator('.band-panel a.band-screen').click();
  await ready('PARP_BAND');
  assert.equal(await frame().evaluate(() => window.PARP_BAND.mode), 'campaign');
  await frame().locator('a.back').click();
  await ready('PARP_MAP');
  await frame().evaluate(async () => {
    const {deploy} = await import('../shared/campaign/encounter.js');
    const map = window.PARP_MAP;
    deploy(map.travel.campaign, {
      id: 'module-mission',
      level: 'compound',
      seed: 4242,
      fighters: Object.keys(map.travel.campaign.band.fighters).slice(0, 8),
      kit: {},
    });
    map.travel.save();
  });
  await frame().goto(server.url + 'convoy/?campaign=modules&encounter=module-mission', {waitUntil: 'domcontentloaded'});
  await ready('PARP_SPRITES');
  assert.ok(await frame().evaluate(() => window.PARP_SPRITES.campaign), 'real campaign mission');
  assert.deepEqual(
    requests.filter(url => forbidden.test(url)),
    [],
    'shell, map, band and mission never fetch demo code',
  );
  assert.ok(
    requests.some(url => url.includes('/map/vehicles.js')),
    '3-D convoy vehicles remain in gameplay',
  );
  assert.deepEqual(
    requests.filter(url => /\/assets\/models\/(operators|weapons)\//.test(url)),
    [],
    'no 3-D people or rifle assets',
  );
  console.log('PASS shell → campaign map → band → map → mission: no demo module requests');
  await page.close();

  for (const [url, name, module] of [
    ['map/3d.html', 'PARP_MAP', '/operator/rig.js'],
    ['workbench/', 'PARP_WORKBENCH', '/workbench/viewer.js'],
    ['operator/', 'PARP_OPERATOR', '/operator/rig.js'],
  ]) {
    const demo = await open(browser, 'about:blank');
    const loaded = [];
    demo.on('request', r => loaded.push(r.url()));
    await demo.goto(server.url + url, {waitUntil: 'domcontentloaded'});
    await demo.waitForFunction(n => !!window[n], name, {timeout: 180000});
    if (name === 'PARP_WORKBENCH') await demo.waitForFunction(() => !!window.PARP_WORKBENCH.rifle, null, {timeout: 180000});
    if (name === 'PARP_OPERATOR') await demo.waitForFunction(() => window.PARP_OPERATOR.ready, null, {timeout: 180000});
    if (name === 'PARP_MAP') await demo.waitForFunction(() => window.PARP_MAP.ready, null, {timeout: 180000});
    assert.ok(
      loaded.some(u => u.includes(module)),
      `${url} explicitly loads its demo code`,
    );
    console.log(`PASS standalone ${url}`);
    await demo.close();
  }
} finally {
  await browser.close();
  server.stop();
}
