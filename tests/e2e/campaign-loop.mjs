// The whole loop in the browser: on the campaign map the band meets an Invader convoy, attacks, fights the Convoy
// Ambush with the deployed fighters, comes back to the map with the result (the convoy gone, experience, loot), is
// promoted in the band panel with stolen kit, heals over campaign time, and an Invader settlement offers a raid.
import assert from 'node:assert/strict';
import {launch, open, startServer} from './browser.mjs';

const server = await startServer(8198),
  browser = await launch();
const mapReady = page => page.waitForFunction(() => window.PARP_MAP?.ready, null, {timeout: 120000});
const saved = page => page.evaluate(() => JSON.parse(localStorage.getItem('parp-campaign-v1')));
/** Put the band at (x, z) and let one frame see what is there (a shortcut for the march; travel has its own test). */
const standAt = (page, x, z) =>
  page.evaluate(
    ([x, z]) =>
      new Promise(r => {
        const t = window.PARP_MAP.travel;
        t.party.route = null;
        t.party.x = x;
        t.party.z = z;
        requestAnimationFrame(() => requestAnimationFrame(r));
      }),
    [x, z],
  );
try {
  const page = await open(browser, server.url + 'map/?campaign=c1');
  await page.evaluate(() => {
    localStorage.removeItem('parp-campaign-v1');
    localStorage.removeItem('parp-squad-v1');
    localStorage.removeItem('parp-band-v2');
  });
  await page.reload();
  await mapReady(page);
  const before = await saved(page);
  assert.deepEqual(before.settled, []);
  assert.match(await page.locator('#date').innerText(), /Spring 1, Year 3 .* 08:00/, 'the campaign clock');

  // 1. meet the supply convoy: the encounter panel, the fit fighters, Attack
  const convoy = await page.evaluate(() => {
    const p = window.PARP_MAP.parties.parties.find(p => p.id === 'supply-convoy');
    window.PARP_MAP.setSpeed(0); // the convoy holds still while the band steps in
    return {x: p.root.position.x, z: p.root.position.z};
  });
  await standAt(page, convoy.x + 4, convoy.z);
  await page.locator('.encounter:not([hidden])').waitFor({timeout: 10000});
  assert.equal(await page.locator('#enc-title').innerText(), 'SUPPLY CONVOY');
  assert.match(await page.locator('.enc-mission').innerText(), /(Convoy|Forest road) ambush · 14 enemy/);
  assert.equal(await page.locator('.enc-fighters li').count(), 8, 'eight fighters going in');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'enc-attack', 'Attack has the focus');

  // 2. Attack: into the Convoy Ambush with the deployment
  await Promise.all([page.waitForURL(/convoy\/\?campaign=c1&encounter=supply-convoy-1-d1/), page.locator('#enc-attack').click()]);
  await page.waitForFunction(() => window.PARP_SPRITES?.ready, null, {timeout: 60000});
  assert.equal(await page.evaluate(() => window.PARP_SPRITES.campaign.action), 'play');
  const fought = await page.evaluate(() => window.PARP_SPRITES.sim.level.id);
  assert.ok(['convoy', 'forest-road'].includes(fought), 'a convoy map');
  await page.locator('#start').click();
  await page.evaluate(() => {
    window.PARP_SPRITES.sim.outcome = 'won';
  });
  await page.waitForFunction(() => !document.querySelector('#card').hidden, null, {timeout: 10000});
  const result = (await saved(page)).deployment.result;
  assert.equal(result.outcome, 'won');

  // 3. back on the map: the result reported, the convoy gone, experience and loot in the save
  await Promise.all([page.waitForURL(/map\/\?campaign=c1$/), page.locator('#start').click()]);
  await mapReady(page);
  assert.match(await page.locator('#toast').innerText(), /Supply convoy: destroyed/);
  assert.equal(await page.evaluate(() => window.PARP_MAP.parties.parties.find(p => p.id === 'supply-convoy').root.visible), false);
  let c = await saved(page);
  assert.deepEqual(c.record[fought], {played: 1, won: 1});
  const xp = c.band.fighters.player.xp;
  assert.ok(xp > before.band.fighters.player.xp, 'experience earned');
  const loot = Object.values(result.loot).reduce((a, b) => a + b, 0);
  const stashCount = s => Object.values(s).reduce((a, b) => a + b, 0);
  assert.equal(stashCount(c.stash), stashCount(before.stash) + loot, 'the loot is in the stash');
  assert.equal(c.world.seen, c.log.length, 'the result is reported once');
  await page.reload();
  await mapReady(page);
  assert.doesNotMatch(
    (await page
      .locator('#toast')
      .innerText()
      .catch(() => '')) || '',
    /destroyed/,
    'not again after a reload',
  );

  // 4. the band panel: promote a fighter with experience and stolen kit
  const plan = await page.evaluate(async () => {
    const {TROOPS} = await import('/band/troops.js');
    const c = window.PARP_MAP.travel.campaign;
    const f = c.band.fighters.player,
      from = TROOPS[f.class];
    const to = from.to[0];
    f.xp = from.xp + 5; // enough experience
    for (const [g, n] of Object.entries(TROOPS[to].needs)) c.stash[g] = (c.stash[g] || 0) + n; // and the kit
    window.PARP_MAP.travel.save();
    return {from: f.class, to, label: TROOPS[to].label, needs: TROOPS[to].needs};
  });
  await page.keyboard.press('p');
  await page.locator('.band-panel:not([hidden])').waitFor();
  assert.equal(await page.locator('.band-panel .squad-card').count(), 8);
  await page.locator('.band-panel .path.ready button', {hasText: plan.label}).first().click();
  c = await saved(page);
  assert.equal(c.band.fighters.player.class, plan.to, 'promoted');
  assert.match(await page.locator('#toast').innerText(), new RegExp(`now a ${plan.label}`));
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.band-panel').isHidden(), true);

  // 5. wounds heal with campaign time
  await page.evaluate(() => {
    const c = window.PARP_MAP.travel.campaign;
    Object.assign(c.band.fighters.mila, {wounded: true, healIn: 2});
    window.PARP_MAP.campaign.update(2 / 0.6 + 0.1); // two campaign hours
  });
  assert.equal(await page.evaluate(() => window.PARP_MAP.travel.campaign.band.fighters.mila.wounded), false);
  assert.match(await page.locator('#toast').innerText(), /Mila is fit again/);

  // 6. an Invader settlement offers a raid (the Compound Assault); Leave, and it does not nag until the band has gone
  await standAt(page, 320, -18);
  await page.locator('.encounter:not([hidden])').waitFor({timeout: 10000});
  assert.equal(await page.locator('#enc-title').innerText(), 'MYRTIA');
  assert.match(await page.locator('.enc-mission').innerText(), /Village raid/, 'a village is raided street by street');
  assert.equal(await page.locator('#enc-attack').innerText(), 'Raid the settlement');
  await page.keyboard.press('Escape');
  await standAt(page, 322, -20);
  assert.equal(await page.locator('.encounter').isHidden(), true, 'left alone while the band stays');
  await standAt(page, 250, -60);
  await standAt(page, 320, -18);
  await page.locator('.encounter:not([hidden])').waitFor({timeout: 10000});
  // the hunters lead to the cave defence
  assert.equal(await page.evaluate(() => window.PARP_MAP.campaign.contactAt({x: -80, z: 24})?.source.level), 'cave');
  await page.close();
  console.log(
    'Campaign loop passed: map contact, encounter panel, attack, convoy ambush, result back on the map, convoy gone, xp and loot saved, promotion with stash kit, healing, settlement raid offer, hunters to the cave.',
  );
} finally {
  await browser.close();
  server.stop();
}
