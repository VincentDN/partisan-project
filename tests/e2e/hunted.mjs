// Hunted, and the camp overrun (WP-W11, W8), in the browser: once the heat is high the raiding party marches on the
// band across the map and is saved where it got to; caught, the band cannot leave but can leave a rearguard; caught at
// Oros Camp again, it prepares an ambush and fights the cave defence behind sandbags; losing it,
// the map applies TAC-K-03: the band falls back to Lithia (the new camp, rebuilding), Oros Camp is burnt, half the
// stash is gone and the heat halves.
import assert from 'node:assert/strict';
import {launch, open, startServer, frames} from './browser.mjs';

const server = await startServer(8190),
  browser = await launch();
const mapReady = page => page.waitForFunction(() => window.PARP_MAP?.ready, null, {timeout: 180000});
const saved = page => page.evaluate(() => JSON.parse(localStorage.getItem('parp-campaign-v1')));
try {
  const page = await open(browser, server.url + 'map/?campaign=c1');
  await page.evaluate(() => ['parp-campaign-v1', 'parp-squad-v1', 'parp-band-v2'].forEach(k => localStorage.removeItem(k)));
  await page.reload();
  await mapReady(page);

  // 1. heat up: the hunters set out after the band and close in while the clock runs
  const raiders = () =>
    page.evaluate(() => {
      const p = window.PARP_MAP.parties.parties.find(q => q.id === 'raiders').root.position,
        b = window.PARP_MAP.travel.party;
      return {x: p.x, z: p.z, d: Math.hypot(p.x - b.x, p.z - b.z)};
    });
  const r0 = await raiders();
  await page.evaluate(() => {
    window.PARP_MAP.travel.campaign.world.heat = 30;
    window.PARP_MAP.setSpeed(3);
  });
  await page.waitForFunction(
    d0 => {
      const p = window.PARP_MAP.parties.parties.find(q => q.id === 'raiders').root.position,
        b = window.PARP_MAP.travel.party;
      return Math.hypot(p.x - b.x, p.z - b.z) < d0 - 5;
    },
    r0.d,
    {timeout: 60000},
  );
  await page.evaluate(() => {
    window.PARP_MAP.setSpeed(0);
    window.PARP_MAP.travel.save();
  });
  const r1 = await raiders();
  assert.ok(r1.d < r0.d - 5, `the hunters close in (${r0.d.toFixed(0)} -> ${r1.d.toFixed(0)})`);
  const h = (await saved(page)).world.hunters.raiders;
  assert.ok(Math.hypot(h.x - r1.x, h.z - r1.z) < 6 && h.hunting, 'where they got to is saved');

  // 2. caught (WP-W8): no leaving, a rearguard instead; the hunters go home and rest, the rearguard comes back wounded
  const openRaiders = () =>
    page.evaluate(() => {
      const M = window.PARP_MAP,
        r = M.parties.parties.find(q => q.id === 'raiders').root.position;
      M.campaign.showEncounter(M.campaign.contactAt({x: r.x, z: r.z}));
    });
  await openRaiders();
  await page.locator('.encounter:not([hidden])').waitFor({timeout: 10000});
  assert.match(
    await page.locator('.enc-sides').innerText(),
    /^Your band: 8 of 8 fighters fit · \d+ troops · /,
    'both sides and the ground',
  );
  assert.equal(await page.locator('#enc-leave').isDisabled(), true, 'caught: no leaving');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.encounter').isHidden(), false, 'not by Escape either');
  await page.locator('#enc-rearguard-who').selectOption('dragan');
  await page.locator('#enc-rearguard').click();
  assert.equal(await page.locator('.encounter').isHidden(), true, 'the band gets away');
  let s = await saved(page);
  assert.equal(s.band.fighters.dragan.wounded, true, 'the rearguard is wounded');
  assert.equal(s.world.hunters.raiders.hunting, false);
  assert.ok(s.world.hunters.raiders.rest, 'the hunters rest at their post');
  // the hunters come back once rested (time moved on), and catch the band at the camp
  await page.evaluate(() => {
    const M = window.PARP_MAP,
      h = M.travel.campaign.world.hunters.raiders;
    delete h.rest;
    h.hunting = true;
    M.travel.campaign.band.fighters.dragan.wounded = false; // healed for the next test step
    M.travel.campaign.band.fighters.dragan.healIn = 0;
    M.parties.parties.find(q => q.id === 'raiders').place(-176, -26);
    M.travel.save();
  });

  // 3. caught at the camp: the cave defence, from prepared positions
  const before = await saved(page);
  await page.evaluate(() => {
    const M = window.PARP_MAP,
      c = M.campaign;
    Object.assign(M.travel.party, {x: -178, z: -28, route: null});
    M.travel.place();
    const contact = c.contactAt({
      x: M.parties.parties.find(q => q.id === 'raiders').root.position.x,
      z: M.parties.parties.find(q => q.id === 'raiders').root.position.z,
    });
    c.showEncounter(contact);
  });
  await page.locator('.encounter:not([hidden])').waitFor({timeout: 10000});
  assert.match(await page.locator('.enc-mission').innerText(), /Cave/i, 'the cave defence at Oros Camp');
  await Promise.all([
    page.waitForURL(/convoy\/\?campaign=c1&encounter=raiders-/, {waitUntil: 'commit'}),
    page.locator('#enc-prepare').click(),
  ]);
  await page.waitForFunction(() => window.PARP_SPRITES?.ready, null, {timeout: 60000});
  assert.equal(await page.evaluate(() => window.PARP_SPRITES.sim.level.id), 'cave');
  const bags = await page.evaluate(() => ({
    bags: window.PARP_SPRITES.sim.fieldworks.filter(f => f.kind === 'sandbag').length,
    rebels: window.PARP_SPRITES.sim.units.filter(u => u.side === 'partisan').length,
  }));
  assert.equal(bags.bags, bags.rebels, 'prepared: sandbags in front of every fighter');
  await page.locator('#start').click();
  await page.evaluate(() => (window.PARP_SPRITES.sim.outcome = 'lost'));
  await page.waitForFunction(() => !document.querySelector('#card').hidden, null, {timeout: 10000});

  // 4. overrun: back on the map at Lithia, Oros Camp burnt, half the stash gone, heat halved, the camp rebuilding
  await Promise.all([page.waitForURL(/map\/\?campaign=c1$/, {waitUntil: 'commit'}), page.locator('#start').click()]);
  await mapReady(page);
  assert.match(await page.locator('#toast').innerText(), /Raiding party overran Oros Camp: .* The band fell back to Lithia/);
  const c = await saved(page);
  assert.equal(c.world.camp.id, 'lithia');
  assert.ok(Math.hypot(c.world.party.x - -240, c.world.party.z - -190) < 15, 'the band is at Lithia');
  assert.equal(c.world.heat, Math.floor(before.world.heat / 2), 'heat halved');
  // half of every stack it had then (the mission's own loot came home first), rounded down: the overrun's log says
  const o = c.log.find(e => e.kind === 'overrun');
  assert.ok(o && Object.keys(o.lost).length, 'the overrun took from the stash');
  for (const [g, l] of Object.entries(o.lost)) assert.equal(l, Math.floor((c.stash[g] + l) / 2), `${g}: half lost`);
  assert.ok(await page.locator('.town-label.burnt, .burnt').count(), 'Oros Camp shows burnt');
  await page.keyboard.press('p');
  await page.locator('.band-panel:not([hidden])').waitFor();
  assert.match(await page.locator('.band-panel .rebuilding').innerText(), /The new camp at Lithia is rebuilding: \d+ h left/);
  assert.equal(await page.locator('.band-panel .kit-open').first().isDisabled(), true, 'no kit changes while it rebuilds');
  await frames(page, 2);
  console.log('hunted: ok');
} finally {
  await browser.close();
  server.stop();
}
