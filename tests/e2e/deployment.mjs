// Deployment (WP-W12) in the browser: the encounter panel lists every fit fighter (the first nine ticked, a tenth in
// reserve, the wounded healing), the keyboard picks six to nine and Attack waits until it is; the picked fighters,
// and only they, go into the mission with their own ids and classes. Then each of the seven mission types is played
// from a campaign deployment: the same fighters, the same classes and the same grid kits they carried home.
import assert from 'node:assert/strict';
import {launch, open, startServer} from './browser.mjs';

const LEVELS = ['convoy', 'forest-road', 'checkpoint', 'village', 'hilltop', 'compound', 'cave'];
const server = await startServer(8191),
  browser = await launch();
const mapReady = page => page.waitForFunction(() => window.PARP_MAP?.ready, null, {timeout: 180000});
const missionReady = page => page.waitForFunction(() => window.PARP_SPRITES?.ready, null, {timeout: 90000});
const saved = page => page.evaluate(() => JSON.parse(localStorage.getItem('parp-campaign-v1')));
/** The rebels in the mission: {id: class}, and the uid of each one's rifle in its grid kit. */
const inMission = page =>
  page.evaluate(() => {
    const {sim, search} = window.PARP_SPRITES;
    const rebels = sim.units.filter(u => u.side === 'partisan');
    return {
      classes: Object.fromEntries(rebels.map(u => [u.id, u.cls])),
      rifles: Object.fromEntries(rebels.map(u => [u.id, search.ammo.kitOf(u)?.primary?.uid || null])),
    };
  });
try {
  const page = await open(browser, server.url + 'map/?campaign=c1');
  await page.evaluate(() => ['parp-campaign-v1', 'parp-squad-v1', 'parp-band-v2'].forEach(k => localStorage.removeItem(k)));
  await page.reload();
  await mapReady(page);
  // ten fit fighters (three joined since: recruits, WP-W18) and Niko wounded
  await page.evaluate(() => {
    const M = window.PARP_MAP,
      F = M.travel.campaign.band.fighters;
    F.tomo = {...structuredClone(F.petar), class: 'insurgent', xp: 0};
    F.vesna = {...structuredClone(F.mila), xp: 0};
    F.jure = {...structuredClone(F.petar), xp: 0};
    Object.assign(F.niko, {wounded: true, healIn: 20});
    M.travel.save();
  });
  await page.reload();
  await mapReady(page);

  // 1. the panel: ten fit fighters, nine ticked, the wounded one healing
  await page.evaluate(() => {
    const M = window.PARP_MAP,
      p = M.parties.parties.find(q => q.id === 'supply-convoy').root.position;
    M.setSpeed(0);
    M.campaign.showEncounter(M.campaign.contactAt({x: p.x, z: p.z}));
  });
  await page.locator('.encounter:not([hidden])').waitFor({timeout: 10000});
  const boxes = page.locator('.enc-fighters input[type=checkbox]');
  assert.equal(await boxes.count(), 10, 'every fit fighter is listed');
  assert.equal(await page.locator('.enc-fighters input:checked').count(), 9, 'the first nine are ticked');
  assert.match(await page.locator('.enc-fighters .hurt').innerText(), /^Niko: wounded, 20h to heal$/);
  assert.equal(await page.locator('.enc-count').innerText(), 'Deploying 9 fighters · choose 6–9.');
  assert.equal(await page.locator('.enc-fighters input[value=jure]').isChecked(), false, 'the tenth is in reserve');
  assert.match(await page.locator('.enc-sides').innerText(), /^Your band: 10 of 11 fighters fit/);

  // 2. by keyboard: untick four (five left: Attack waits), then tick the reserve in (six: Attack is ready)
  const tick = async id => {
    await page.locator(`.enc-fighters input[value=${id}]`).focus();
    await page.keyboard.press('Space');
  };
  for (const id of ['dragan', 'lena', 'sara', 'tomo']) await tick(id);
  assert.equal(await page.locator('.enc-count').innerText(), 'Deploying 5 fighters · choose 6–9 to continue.');
  assert.equal(await page.locator('#enc-attack').isDisabled(), true, 'five cannot go');
  assert.equal(await page.locator('#enc-prepare').isDisabled(), true, 'nor prepare');
  await tick('jure');
  const picked = ['player', 'mila', 'ivana', 'petar', 'vesna', 'jure'];
  assert.equal(await page.locator('.enc-count').innerText(), 'Deploying 6 fighters · choose 6–9.');
  assert.equal(await page.locator('#enc-attack').isDisabled(), false, 'six can go');

  // 3. Attack: the six go in, as themselves; the rest stay with the band
  await Promise.all([page.waitForURL(/convoy\/\?campaign=c1&encounter=/, {waitUntil: 'commit'}), page.locator('#enc-attack').click()]);
  await missionReady(page);
  let d = (await saved(page)).deployment;
  assert.deepEqual([...d.fighters].sort(), [...picked].sort(), 'the picked fighters are deployed');
  let m = await inMission(page);
  assert.deepEqual(Object.keys(m.classes).sort(), [...picked].sort(), 'and only they are in the mission');
  const band = (await saved(page)).band.fighters;
  for (const id of picked) assert.equal(m.classes[id], band[id].class, `${id} keeps the class`);
  await page.locator('#start').click();
  await page.evaluate(() => (window.PARP_SPRITES.sim.outcome = 'won'));
  await page.waitForFunction(() => !document.querySelector('#card').hidden, null, {timeout: 10000});
  await page.locator('.spoils-foot:not([hidden])').waitFor({timeout: 30000}); // a win: the spoils, then the map
  await Promise.all([
    page.waitForURL(/map\/\?campaign=c1$/, {waitUntil: 'commit'}),
    page.locator('.spoils button', {hasText: 'Back to the world map'}).click(),
  ]);
  await mapReady(page);
  const home = (await saved(page)).band.fighters;
  for (const id of picked) assert.ok(home[id].kit?.primary?.uid, `${id} carried a kit home`);
  assert.equal(home.tomo.xp, 0, 'the reserves stayed at the camp');

  // 4. every mission type from a deployment: the same fighters, classes and kits
  const kitsHome = Object.fromEntries(picked.map(id => [id, home[id].kit.primary.uid]));
  for (const level of LEVELS) {
    await page.evaluate(
      async ([level, fighters, url]) => {
        const {deploy} = await import(url);
        const M = window.PARP_MAP,
          c = M.travel.campaign;
        for (const f of Object.values(c.band.fighters)) f.wounded = false; // the last fight's wounds healed
        deploy(c, {id: `w12-${level}`, level, seed: 5, fighters});
        M.travel.save();
      },
      [level, picked, server.url + 'shared/campaign/encounter.js'],
    );
    await page.goto(server.url + `convoy/?campaign=c1&encounter=w12-${level}`);
    await missionReady(page);
    assert.equal(await page.evaluate(() => window.PARP_SPRITES.sim.level.id), level);
    m = await inMission(page);
    assert.deepEqual(Object.keys(m.classes).sort(), [...picked].sort(), `${level}: the deployed fighters`);
    for (const id of picked) {
      assert.equal(m.classes[id], home[id].class, `${level}: ${id}'s class`);
      assert.equal(m.rifles[id], kitsHome[id], `${level}: ${id}'s own rifle`);
    }
    await page.locator('#start').click();
    await page.evaluate(() => (window.PARP_SPRITES.sim.outcome = 'won'));
    await page.waitForFunction(() => !document.querySelector('#card').hidden, null, {timeout: 10000});
    await page.locator('.spoils-foot:not([hidden])').waitFor({timeout: 30000}); // a win: the spoils, then the map
    await Promise.all([
      page.waitForURL(/map\/\?campaign=c1$/, {waitUntil: 'commit'}),
      page.locator('.spoils button', {hasText: 'Back to the world map'}).click(),
    ]);
    await mapReady(page);
    d = (await saved(page)).deployment;
    assert.equal(d, null, `${level}: settled`);
  }
  console.log('deployment: ok');
} finally {
  await browser.close();
  server.stop();
}
