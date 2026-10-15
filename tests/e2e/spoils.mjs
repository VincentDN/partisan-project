// The spoils of a won campaign mission in the browser: the screen deals the rewards out (each card with its picture
// and a blip), then offers the world map or the Rebel Band; a lost mission has no spoils screen.
import assert from 'node:assert/strict';
import {launch, open, startServer} from './browser.mjs';

const server = await startServer(8182),
  browser = await launch();
/** Deploy a convoy ambush with a manifest and open the mission page. */
async function mission(page, id) {
  await page.goto(server.url + 'map/?campaign=c1');
  await page.waitForFunction(() => window.PARP_MAP?.ready, null, {timeout: 120000});
  await page.evaluate(
    async ([url, id]) => {
      const {deploy} = await import(url);
      const M = window.PARP_MAP,
        c = M.travel.campaign;
      for (const f of Object.values(c.band.fighters)) f.wounded = false;
      deploy(c, {
        id,
        level: 'convoy',
        seed: 5,
        fighters: Object.keys(c.band.fighters).slice(0, 8),
        source: 'supply-convoy',
        cargo: {ak74: 4, helmet: 2},
      });
      M.travel.save();
    },
    [server.url + 'shared/campaign/encounter.js', id],
  );
  await page.goto(server.url + `convoy/?campaign=c1&encounter=${id}`);
  await page.waitForFunction(() => window.PARP_SPRITES?.ready, null, {timeout: 90000});
  await page.locator('#start').click();
}
try {
  const page = await open(browser, server.url + 'map/?campaign=c1');
  await page.evaluate(() => ['parp-campaign-v1', 'parp-squad-v1', 'parp-band-v2'].forEach(k => localStorage.removeItem(k)));
  // count the blips: every oscillator started
  await page.addInitScript(() => {
    window.__blips = 0;
    const start = OscillatorNode.prototype.start;
    OscillatorNode.prototype.start = function (...a) {
      window.__blips++;
      return start.apply(this, a);
    };
  });

  // a win: an SVDS and a helmet came home in the kits, the convoy's cargo in the stash
  await mission(page, 'spoils-1');
  await page.evaluate(() => {
    const {sim, search} = window.PARP_SPRITES,
      A = search.ammo,
      k = A.kitOf(sim.player);
    k.secondary = A.factory.make('svds-762x54r-sniper-rifle');
    k.backpack = A.factory.make('scav-backpack');
    sim.outcome = 'won';
  });
  await page.locator('.spoils').waitFor({timeout: 20000});
  await page.locator('.spoils-foot:not([hidden])').waitFor({timeout: 30000});
  const cards = await page.locator('.spoils-card').evaluateAll(cs =>
    cs.map(c => ({
      label: c.getAttribute('aria-label'),
      drawn: c
        .querySelector('canvas')
        .getContext('2d')
        .getImageData(0, 0, 220, 110)
        .data.some((v, i) => i % 4 === 3 && v > 0),
    })),
  );
  // the AK-74s: the cargo's four and any the fight gave; every rifle before the rest (in any order among them)
  const ak = cards.find(c => /^AK-74, \d+$/.test(c.label));
  assert.ok(ak && +ak.label.split(', ')[1] >= 4, `the AK-74s (${ak?.label})`);
  const rifles = await page.locator('.spoils-card').evaluateAll(cs => cs.map(c => c.classList.contains('spoils-weapon')));
  assert.ok(rifles.indexOf(false) === -1 || rifles.indexOf(false) > rifles.lastIndexOf(true), 'every rifle before the rest');
  assert.ok(
    cards.some(c => c.label === 'SVDS 7.62x54R sniper rifle, 1'),
    'the rifle brought home in a kit',
  );
  assert.ok(
    cards.some(c => c.label === 'Helmet, 2'),
    'the cargo',
  );
  for (const c of cards) assert.ok(c.drawn, `${c.label}: its picture is drawn`);
  assert.ok((await page.evaluate(() => window.__blips)) >= cards.length * 2, 'a blip for every card');
  assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Back to the world map', 'the way on has the focus');
  await Promise.all([
    page.waitForURL(/band\/\?campaign=c1$/, {timeout: 20000, waitUntil: 'commit'}),
    page.locator('.spoils button', {hasText: 'Rebel Band'}).click(),
  ]);
  const settled = await page.evaluate(() => JSON.parse(localStorage.getItem('parp-campaign-v1')));
  assert.equal(settled.deployment, null, 'settled before going to the band');
  assert.ok(settled.settled.includes('spoils-1'));

  // the map button goes back to the map
  await mission(page, 'spoils-2');
  await page.evaluate(() => (window.PARP_SPRITES.sim.outcome = 'won'));
  await page.locator('.spoils').waitFor({timeout: 20000});
  await page.keyboard.press('Enter'); // hurries the deal
  await page.locator('.spoils-foot:not([hidden])').waitFor({timeout: 10000});
  await Promise.all([page.waitForURL(/map\/\?campaign=c1$/, {timeout: 20000, waitUntil: 'commit'}), page.keyboard.press('Enter')]);

  // a loss: the debrief only
  await mission(page, 'spoils-3');
  await page.evaluate(() => (window.PARP_SPRITES.sim.outcome = 'lost'));
  await page.waitForFunction(() => !document.querySelector('#card').hidden, null, {timeout: 20000});
  await page.waitForTimeout(500);
  assert.equal(await page.locator('.spoils').count(), 0, 'no spoils for a lost fight');
  console.log('spoils: ok');
} finally {
  await browser.close();
  server.stop();
}
