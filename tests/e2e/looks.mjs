// Looks from kit (WP-W17) in the browser: in a mission, a helmet and a vest taken off a dead soldier and put on (the
// kit's Head and Body slots) dress the rebel at once, and the Look panel shows them as worn; on the campaign map the
// band figure is dressed as its first fighters are: a promotion changes the outfit, a worn helmet shows.
import assert from 'node:assert/strict';
import {launch, open, startServer, frames} from './browser.mjs';

const server = await startServer(8181),
  browser = await launch();
try {
  // in a mission: loot the helmet and the vest and put them on
  const m = await open(browser, server.url + 'convoy/?seed=7');
  await m.waitForFunction(() => window.PARP_SPRITES?.ready, null, {timeout: 90000});
  await m.locator('#start').click();
  await m.evaluate(() => {
    const {sim, search} = window.PARP_SPRITES,
      p = sim.player,
      u = sim.units.find(o => o.side === 'army' && o.role === 'rifleman');
    Object.assign(u, {state: 'idle', alive: false, x: p.x + 1, z: p.z});
    search.show(search.ammo.near(p.x, p.z));
  });
  await m.locator('.field-search:not([hidden]) .inv-item').first().waitFor();
  const body = '.field-search .inv-panel:last-child';
  await m
    .locator(`${body} .k-headwear`)
    .first()
    .click({modifiers: ['Control']});
  assert.match(await m.locator('.field-search .search-status').innerText(), /^Took the SSh-68 steel helmet \(worn\)\./);
  assert.equal(await m.locator('.field-search [data-weapon="headwear"] .inv-item').count(), 1, 'on the head');
  if (await m.locator(`${body} .k-armor`).count()) {
    await m
      .locator(`${body} .k-armor`)
      .first()
      .click({modifiers: ['Control']});
    assert.equal(await m.locator('.field-search [data-weapon="armor"] .inv-item').count(), 1, 'the vest on');
  }
  await m.keyboard.press('Escape');
  const wear = await m.evaluate(() => window.PARP_SPRITES.sim.player.wear);
  assert.equal(wear.hat, 'SimpleHelmet', 'the rebel wears the helmet');
  // the Look panel says so, and does not offer to change it
  await m.locator('#look select').first().waitFor();
  const headgear = m.locator('#look label', {hasText: 'Headgear'});
  assert.equal(await headgear.locator('select').isDisabled(), true);
  assert.match(await headgear.innerText(), /worn: SSh-68/);
  await m.close();

  // the campaign map: the band figure dressed as its fighters are
  const page = await open(browser, server.url + 'map/?campaign=c1');
  await page.evaluate(() => ['parp-campaign-v1', 'parp-squad-v1', 'parp-band-v2'].forEach(k => localStorage.removeItem(k)));
  await page.reload();
  await page.waitForFunction(() => window.PARP_MAP?.ready, null, {timeout: 120000});
  const looks = () =>
    page.evaluate(() => {
      const M = window.PARP_MAP;
      return M.sprites.cards.find(c => c.root === M.parties.hero.root).members.map(x => ({hat: x.look.hat, shell: x.look.shell}));
    });
  const before = await looks();
  assert.equal(before.length, 3);
  // a promotion to Heavy Fighter, and a helmet on Mila's head
  await page.evaluate(async () => {
    const M = window.PARP_MAP,
      c = M.travel.campaign;
    c.band.fighters.player.class = 'heavy';
    // (a kit the save keeps has a weapon and pockets; this one has a helmet on its Head slot)
    c.band.fighters.mila.kit = {
      primary: {uid: 'w1', slug: 'svds-762x54r-sniper-rifle'},
      pockets: {uid: 'p1', slug: 'pockets', grids: [{w: 1, h: 1, items: []}]},
      headwear: {uid: 'h1', slug: '6b47-helmet', rot: 0},
    };
    M.travel.save();
  });
  await page.reload();
  await page.waitForFunction(() => window.PARP_MAP?.ready, null, {timeout: 120000});
  await page.waitForFunction(
    () => {
      const M = window.PARP_MAP;
      const [a, b] = M.sprites.cards.find(c => c.root === M.parties.hero.root).members;
      return a.look.shell === 'PlateArmor' && b.look.hat === 'AdvancedHelmet';
    },
    null,
    {timeout: 30000},
  );
  const after = await looks();
  assert.deepEqual(after[0], {hat: 'AdvancedHelmet', shell: 'PlateArmor'}, 'the Heavy Fighter in plates and a helmet');
  assert.equal(after[1].hat, 'AdvancedHelmet', "Mila's 6B47 shows");
  assert.notDeepEqual(after[0], before[0]);
  await frames(page, 2);
  console.log('looks: ok');
} finally {
  await browser.close();
  server.stop();
}
