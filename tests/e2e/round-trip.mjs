// A full campaign round trip for the smoke run (WP-W24): a fresh campaign on the map, the band meets the supply
// convoy, attacks, wins the ambush, takes the spoils to the Rebel Band screen, and walks back to the map. The save
// moves one revision at a time, settles the mission once, and no page ever thinks another tab has it.
import assert from 'node:assert/strict';
import {open} from './browser.mjs';

export async function checkRoundTrip(browser, url) {
  const page = await open(browser, url + 'map/?campaign=c1');
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('parp-campaign-v1')));
  const mapReady = () => page.waitForFunction(() => window.PARP_MAP?.ready, null, {timeout: 180000});
  const notStale = async where => assert.equal(await page.locator('#campaign-stale').count(), 0, `${where}: no stale-tab notice`);
  try {
    await page.evaluate(() => ['parp-campaign-v1', 'parp-squad-v1', 'parp-band-v2'].forEach(k => localStorage.removeItem(k)));
    await page.reload();
    await mapReady();
    const before = await saved();
    // the band steps up to the supply convoy, held still
    await page.evaluate(
      () =>
        new Promise(r => {
          const M = window.PARP_MAP,
            p = M.parties.parties.find(p => p.id === 'supply-convoy');
          M.setSpeed(0);
          Object.assign(M.travel.party, {route: null, x: p.root.position.x + 4, z: p.root.position.z});
          requestAnimationFrame(() => requestAnimationFrame(r));
        }),
    );
    await page.locator('.encounter:not([hidden])').waitFor({timeout: 10000});
    await Promise.all([page.waitForURL(/convoy\/\?campaign=c1&encounter=/), page.locator('#enc-attack').click()]);
    await page.waitForFunction(() => window.PARP_SPRITES?.ready, null, {timeout: 90000});
    assert.equal(await page.evaluate(() => window.PARP_SPRITES.campaign.action), 'play');
    const encounter = await page.evaluate(() => window.PARP_SPRITES.campaign.encounter);
    await page.locator('#start').click();
    await page.evaluate(() => (window.PARP_SPRITES.sim.outcome = 'won'));
    await page.locator('#finish-mission').click();
    await page.locator('.spoils-foot:not([hidden])').waitFor({timeout: 30000});
    await notStale('mission');
    const fought = await saved();
    assert.equal(fought.deployment.result.outcome, 'won');

    // the spoils lead to the Rebel Band; the mission is settled on the way
    await Promise.all([
      page.waitForURL(/band\/\?campaign=c1/, {waitUntil: 'commit'}),
      page.locator('.spoils button', {hasText: 'Rebel Band'}).click(),
    ]);
    await page.waitForFunction(() => window.PARP_BAND?.ready, null, {timeout: 120000});
    assert.equal(await page.evaluate(() => window.PARP_BAND.mode), 'campaign');
    await notStale('band');
    const settled = await saved();
    assert.deepEqual(settled.settled, [encounter], 'settled once');
    assert.ok(settled.rev > fought.rev && fought.rev > before.rev, 'each step a newer revision');
    assert.ok(settled.band.fighters.player.xp > before.band.fighters.player.xp, 'experience earned');
    const count = s => Object.values(s).reduce((a, b) => a + b, 0);
    assert.ok(count(settled.stash) > count(before.stash), 'the spoils are in the stash');

    // and back to the map, where the convoy is gone and nothing is counted again
    await Promise.all([page.waitForURL(/map\/\?campaign=c1/, {waitUntil: 'commit'}), page.locator('a.back').click()]);
    await mapReady();
    await notStale('map');
    assert.equal(await page.evaluate(() => window.PARP_MAP.parties.parties.find(p => p.id === 'supply-convoy').root.visible), false);
    const back = await saved();
    assert.deepEqual(back.settled, [encounter]);
    assert.deepEqual(back.stash, settled.stash, 'the stash as the band screen left it');
    assert.equal(await page.evaluate(() => window.PARP_MAP.travel.save()), true, 'the map still writes');
  } finally {
    await page.close();
  }
}
