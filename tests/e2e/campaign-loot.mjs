// Every campaign mission shows a durable itemized recovery report, including carried acquisitions and empty defeats.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {launch, open, startServer} from './browser.mjs';
const server = await startServer(8187),
  browser = await launch();
try {
  const page = await open(browser, 'about:blank');
  await page.route('**/loot-fixture.html', r => r.fulfill({contentType: 'text/html', body: '<title>Fixture</title>'}));
  for (const [i, level] of ['convoy', 'forest-road', 'checkpoint', 'village', 'hilltop', 'compound', 'cave'].entries()) {
    await page.goto(server.url + 'loot-fixture.html');
    await page.evaluate(
      async ({level, i}) => {
        const {newCampaign, createStore} = await import('./shared/campaign/state.js');
        const {deploy} = await import('./shared/campaign/encounter.js');
        const c = newCampaign({id: 'loot'});
        deploy(c, {id: `test-${i}`, level, seed: 4242, fighters: Object.keys(c.band.fighters), cargo: {medkit: 4}});
        createStore(localStorage).save(c);
      },
      {level, i},
    );
    await page.goto(server.url + `convoy/?campaign=loot&encounter=test-${i}`);
    await page.waitForFunction(() => window.PARP_SPRITES?.ready, null, {timeout: 120000});
    await page.locator('#start').click();
    await page.evaluate(() => {
      const {sim, search} = window.PARP_SPRITES;
      const kit = search.ammo.kits.player;
      kit.secondary = {...structuredClone(kit.primary), uid: 'looted-extra-rifle', mag: null, chamber: null};
      sim.outcome = 'won';
    });
    await page.locator('#combat-loot').waitFor();
    const text = await page.locator('#combat-loot').innerText();
    for (const heading of ['Mission loot → stash', 'Convoy cargo → stash', 'Valuables → trade goods', 'Net new equipment'])
      assert.ok(text.includes(heading), `${level}: ${heading}`);
    const result = await page.evaluate(() => JSON.parse(localStorage.getItem('parp-campaign-v1')).deployment.result);
    assert.ok(
      Object.values(result.kitGains).some(n => n >= 1),
      'looted rifle counted',
    );
    assert.equal(Object.keys(result.kits).length, 8);
    await page.reload();
    await page.waitForFunction(() => window.PARP_SPRITES?.ready, null, {timeout: 120000});
    assert.equal(await page.locator('#combat-loot').innerText(), text, `${level}: exact report survives reload`);
    if (i === 0) {
      fs.mkdirSync('build/campaign-loot', {recursive: true});
      await page.locator('#card').screenshot({path: 'build/campaign-loot/report.png'});
    }
    console.log(`${level}: report and reload passed`);
  }
} finally {
  await browser.close();
  server.stop();
}
