// Campaign Roadblock: small-crew selection, four guards, loot window, persistent rewards and audible result states.
import assert from 'node:assert/strict';
import {launch, open, startServer} from './browser.mjs';
const server = await startServer(8211),
  browser = await launch();
try {
  const p = await open(browser, server.url + 'map/?campaign=roadblock');
  await p.waitForFunction(() => window.PARP_MAP?.ready, null, {timeout: 180000});
  await p.evaluate(() => {
    const m = window.PARP_MAP,
      pos = m.parties.parties.find(p => p.id === 'oros-roadblock').root.position;
    m.setSpeed(0);
    m.campaign.showEncounter(m.campaign.contactAt({x: pos.x, z: pos.z}));
  });
  assert.match(await p.locator('.enc-mission').innerText(), /Roadblock.*4 enemy/);
  assert.match(await p.locator('.enc-count').innerText(), /Deploying 3 fighters.*2–4/);
  await p.locator('.enc-fighters input[value=mila]').uncheck();
  await p.locator('.enc-fighters input[value=dragan]').uncheck();
  assert.ok(await p.locator('#enc-attack').isDisabled());
  await p.locator('.enc-fighters input[value=lena]').check();
  await Promise.all([p.waitForURL(/convoy\//, {waitUntil: 'commit'}), p.locator('#enc-attack').click()]);
  await p.waitForFunction(() => window.PARP_SPRITES?.ready, null, {timeout: 90000});
  assert.deepEqual(
    await p.evaluate(() => {
      const s = window.PARP_SPRITES.sim;
      return [
        s.units.filter(u => u.side === 'army').length,
        s.units
          .filter(u => u.side === 'partisan')
          .map(u => u.weapon)
          .sort(),
      ];
    }),
    [4, ['hunting', 'tt']],
  );
  await p.locator('#start').click();
  await p.evaluate(() => {
    const g = window.PARP_SPRITES;
    g.sound.setOn(true);
    for (const u of g.sim.units.filter(u => u.side === 'army')) g.sim.damage(u, g.sim.player, 1000);
  });
  await p.waitForFunction(() => window.PARP_SPRITES.sim.objectives[0].state === 'done');
  assert.equal(await p.evaluate(() => window.PARP_SPRITES.sim.outcome), null, 'can loot before extraction');
  await p.locator('#raid-complete button').click();
  await p.waitForSelector('.spoils');
  assert.match(await p.locator('.spoils-title').innerText(), /VICTORY/);
  assert.equal(await p.evaluate(() => window.PARP_SPRITES.sound.stats.outcomes), 1);
  await p.screenshot({path: '/tmp/partisan-victory.png'});
  await p.evaluate(async () => {
    const {newCampaign, createStore} = await import('/shared/campaign/state.js');
    const {encounterFor} = await import('/shared/campaign/contacts.js');
    const {deploy} = await import('/shared/campaign/encounter.js');
    localStorage.removeItem('parp-campaign-v1');
    const c = newCampaign();
    const e = encounterFor(c, 'oros-roadblock');
    e.id = 'roadblock-defeat';
    deploy(c, e);
    createStore(localStorage).save(c);
  });
  await p.goto(server.url + 'convoy/?campaign=c1&encounter=roadblock-defeat');
  await p.waitForFunction(() => window.PARP_SPRITES?.ready, null, {timeout: 90000});
  await p.locator('#start').click();
  await p.evaluate(() => {
    const g = window.PARP_SPRITES;
    g.sound.setOn(true);
    g.sim.outcome = 'lost';
  });
  await p.waitForFunction(() => document.querySelector('#card-title').textContent.startsWith('DEFEAT'));
  assert.equal(await p.evaluate(() => window.PARP_SPRITES.sound.stats.outcomes), 1);
  await p.evaluate(() => {
    const s = window.PARP_SPRITES.sound;
    s.setOn(false);
    s.outcome(true);
  });
  assert.equal(await p.evaluate(() => window.PARP_SPRITES.sound.stats.outcomes), 1, 'muted result cues do not play');
  await p.screenshot({path: '/tmp/partisan-defeat.png'});
  console.log('Roadblock: small crew, four soldiers, loot window, victory/defeat labels and sound/mute passed.');
} finally {
  await browser.close();
  server.stop();
}
