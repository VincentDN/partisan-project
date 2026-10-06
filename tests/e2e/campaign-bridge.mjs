// The mission bridge in the browser (WP-W2): convoy/?campaign&encounter plays the map's deployment, writes one result,
// settles it on the way back to the map; a reload mid-mission is withdrawn; a stale link plays nothing; practice
// mode is unchanged and never touches the campaign.
import assert from 'node:assert/strict';
import {launch, open, startServer} from './browser.mjs';

const server = await startServer(8194),
  browser = await launch();
const save = page => page.evaluate(() => JSON.parse(localStorage.getItem('parp-campaign-v1')));
/** Write a campaign with a deployment, as the map will (WP-W8/W9), through the real modules. */
const seed = (page, id, level) =>
  page.evaluate(
    async ([id, level]) => {
      const {createStore} = await import('/shared/campaign/state.js');
      const {deploy} = await import('/shared/campaign/encounter.js');
      const store = createStore(localStorage);
      const {campaign} = store.load();
      for (const f of Object.values(campaign.band.fighters)) f.wounded = false;
      const vests = campaign.stash.vest || 0;
      deploy(campaign, {id, level, seed: 4242, fighters: ['player', 'mila'], kit: {vest: 1}});
      store.save(campaign);
      return vests;
    },
    [id, level],
  );
const ready = page => page.waitForFunction(() => window.PARP_SPRITES?.ready, null, {timeout: 60000});
try {
  // practice: the mission select and the camp, no campaign
  const page = await open(browser, server.url + 'convoy/');
  await ready(page);
  assert.equal(await page.evaluate(() => window.PARP_SPRITES.campaign), null);
  assert.ok((await page.locator('#missions button').count()) >= 3, 'mission select in practice');
  const vests = await seed(page, 'e1', 'compound');
  const squadBefore = await page.evaluate(() => localStorage.getItem('parp-squad-v1'));

  // the deployment plays: its level and seed, no mission select, no restart, no practice camp
  await page.goto(server.url + 'convoy/?campaign=c1&encounter=e1');
  await ready(page);
  assert.equal(await page.evaluate(() => window.PARP_SPRITES.campaign.action), 'play');
  assert.equal(await page.evaluate(() => window.PARP_SPRITES.sim.level.id), 'compound');
  assert.equal(await page.locator('#missions').isHidden(), true);
  assert.equal(await page.locator('#restart').isHidden(), true);
  assert.equal(await page.locator('#camp').isHidden(), true);
  assert.equal((await save(page)).deployment.entered, true);
  assert.equal((await save(page)).stash.vest || 0, vests - 1, 'the vest is reserved: it travels with the fighters');
  await page.locator('#start').click();
  await page.evaluate(() => {
    window.PARP_SPRITES.sim.outcome = 'won';
  });
  await page.waitForFunction(() => !document.querySelector('#card').hidden, null, {timeout: 10000});
  assert.equal(await page.locator('#start').innerText(), 'Return to the map');
  const written = (await save(page)).deployment.result;
  assert.equal(written.outcome, 'won');
  assert.deepEqual(Object.keys(written.fighters).sort(), ['mila', 'player'], 'only the deployed fighters');

  // a reload on the debrief shows it again and never plays twice
  await page.reload();
  await ready(page);
  assert.equal(await page.evaluate(() => window.PARP_SPRITES.campaign.action), 'debrief');
  assert.match(await page.locator('#card-text').innerText(), /Accomplished/);
  await Promise.all([page.waitForURL(/\/map\/\?campaign=c1$/), page.locator('#start').click()]);
  let c = await save(page);
  assert.deepEqual(c.settled, ['e1']);
  assert.equal(c.deployment, null);
  assert.deepEqual(c.record.compound, {played: 1, won: 1});
  assert.ok((c.stash.vest || 0) >= vests, 'the vest is back in the stash (plus any loot)');
  assert.equal(await page.evaluate(() => localStorage.getItem('parp-squad-v1')), squadBefore, 'the practice squad is untouched');

  // the same link again: nothing to play, and settling again changes nothing
  await page.goto(server.url + 'convoy/?campaign=c1&encounter=e1');
  await ready(page);
  assert.equal(await page.evaluate(() => window.PARP_SPRITES.campaign.action), 'none');
  assert.deepEqual((await save(page)).settled, ['e1']);

  // a reload mid-mission is withdrawn: the fighters come back wounded, the kit returns, no record
  await seed(page, 'e2', 'convoy');
  await page.goto(server.url + 'convoy/?campaign=c1&encounter=e2');
  await ready(page);
  await page.locator('#start').click();
  await page.waitForTimeout(500);
  await page.reload();
  await ready(page);
  assert.equal(await page.evaluate(() => window.PARP_SPRITES.campaign.action), 'withdrawn');
  assert.match(await page.locator('#card-text').innerText(), /left the mission/);
  c = await save(page);
  assert.deepEqual(c.settled, ['e1', 'e2']);
  assert.equal(c.band.fighters.player.wounded, true);
  assert.equal(c.band.fighters.mila.wounded, true);
  assert.equal(c.record.convoy.played, 0);
  assert.equal(c.log.at(-1).outcome, 'withdrawn');
  await page.close();
  console.log(
    'Campaign bridge passed: deployment plays, one result, settled once on return, reload on the debrief, stale link, reload mid-mission withdrawn, practice untouched.',
  );
} finally {
  await browser.close();
  server.stop();
}
