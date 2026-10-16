// One campaign in two tabs (WP-W24). Whichever tab saved last is the live one: the other is told at once (the storage
// event) that the campaign changed in another tab, and nothing more is written from it. Two tabs at the debrief of the
// same mission cannot both settle it: the result counts once.
import assert from 'node:assert/strict';
import {launch, open, startServer} from './browser.mjs';

const server = await startServer(8196),
  browser = await launch();
const saved = page => page.evaluate(() => JSON.parse(localStorage.getItem('parp-campaign-v1')));
const stale = page => page.locator('#campaign-stale').isVisible();
try {
  const context = await browser.newContext({viewport: {width: 1280, height: 800}, reducedMotion: 'reduce'});
  // ---------- the map in one tab, the band screen in another ----------
  const map = await open(browser, server.url + 'map/?campaign=c1', {context});
  await map.evaluate(() => ['parp-campaign-v1', 'parp-squad-v1', 'parp-band-v2'].forEach(k => localStorage.removeItem(k)));
  await map.reload();
  await map.waitForFunction(() => window.PARP_MAP?.ready, null, {timeout: 180000});
  await map.evaluate(() => window.PARP_MAP.setSpeed(0));
  const band = await open(browser, server.url + 'band/?campaign=c1', {context});
  await band.waitForFunction(() => window.PARP_BAND?.ready, null, {timeout: 120000});

  // the map saves: the band tab is stale, its notice up, its writes refused
  const rev = await map.evaluate(() => {
    const t = window.PARP_MAP.travel;
    t.campaign.world.heat = 4;
    return t.save() && t.campaign.rev;
  });
  assert.ok(rev > 0, 'the map tab saved');
  await band.locator('#campaign-stale').waitFor({timeout: 30000});
  assert.match(await band.locator('#campaign-stale').innerText(), /changed in another tab/);
  const before = await saved(band);
  // a promotion the stale tab can afford: it happens on screen, but is not written over the other tab's save
  const to = await band.evaluate(async () => {
    const {TROOPS} = await import('/band/troops.js');
    const S = window.PARP_BAND.state,
      f = S.fighters.mila,
      to = TROOPS[f.class].to[0];
    f.xp = TROOPS[f.class].xp + 5;
    for (const [g, n] of Object.entries(TROOPS[to].needs)) S.stash[g] = (S.stash[g] || 0) + n;
    S.stash.medkit = 99;
    await window.PARP_BAND.promoteFighter('mila', to);
    return to;
  });
  assert.equal(await band.evaluate(() => window.PARP_BAND.state.fighters.mila.class), to, 'promoted in the tab');
  assert.deepEqual(await saved(band), before, 'nothing written from the stale tab');
  assert.equal(await stale(map), false, 'the tab that saved carries on');

  // reloading the stale tab picks the campaign up from there
  await band.reload();
  await band.waitForFunction(() => window.PARP_BAND?.ready, null, {timeout: 120000});
  assert.equal(await stale(band), false);
  assert.equal(await band.evaluate(() => window.PARP_BAND.state.stash.medkit === 99), false, 'the stale edit was not kept');

  // ---------- the same mission's debrief in two tabs ----------
  const id = await map.evaluate(async url => {
    const {deploy, writeResult} = await import(url);
    const M = window.PARP_MAP,
      c = M.travel.campaign;
    deploy(c, {id: 'tabs-1', level: 'convoy', seed: 5, fighters: ['player', 'mila'], cargo: {ak74: 3}});
    writeResult(c, 'tabs-1', {outcome: 'won', kills: 4, fighters: {player: {state: 'fit', xp: 30, kills: 4}}, loot: {medkit: 1}});
    M.travel.save();
    return 'tabs-1';
  }, server.url + 'shared/campaign/encounter.js');
  const stash = (await saved(map)).stash;
  const url = server.url + `convoy/?campaign=c1&encounter=${id}`;
  const a = await open(browser, url, {context});
  await a.waitForFunction(() => window.PARP_SPRITES?.ready, null, {timeout: 90000});
  const b = await open(browser, url, {context});
  await b.waitForFunction(() => window.PARP_SPRITES?.ready, null, {timeout: 90000});
  // b opened last: a (and the map) are stale
  await a.locator('#campaign-stale').waitFor({timeout: 30000});
  await map.locator('#campaign-stale').waitFor({timeout: 30000});
  assert.equal(await a.evaluate(() => window.PARP_SPRITES.campaign.returnToMap()), false, 'the stale tab cannot settle');
  assert.equal((await saved(a)).settled.includes(id), false, 'not settled by the stale tab');
  await Promise.all([
    b.waitForURL(/map\/\?campaign=/, {waitUntil: 'commit'}),
    b.evaluate(() => window.PARP_SPRITES.campaign.returnToMap()),
  ]);
  const after = await saved(a);
  assert.equal(after.settled.filter(x => x === id).length, 1, 'settled once');
  assert.equal(after.stash.medkit, (stash.medkit || 0) + 1, 'the loot counted once');
  assert.equal(after.stash.ak74, (stash.ak74 || 0) + 3, 'the cargo counted once');
  assert.equal(await a.evaluate(() => window.PARP_SPRITES.campaign.returnToMap()), false, 'and still not twice');
  assert.equal((await saved(a)).stash.medkit, after.stash.medkit);
  console.log('campaign tabs: stale tabs refused, one settlement');
} finally {
  await browser.close();
  server.stop();
}
