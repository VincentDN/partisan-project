// Owned guns in the Weapon Modder (WP-W16) in the browser: from the band panel a fighter's gun opens the Workbench on
// the campaign; parts the band does not have are locked and say where they are found, rifles it does not hold too;
// a free suppressor fits; Assign keeps the build on the fighter (and takes the suppressor from the others); in the
// next mission the fighter carries it: drawn as that rifle, heard nearer.
import assert from 'node:assert/strict';
import {launch, open, startServer} from './browser.mjs';

const server = await startServer(8180),
  browser = await launch();
const saved = page => page.evaluate(() => JSON.parse(localStorage.getItem('parp-campaign-v1')));
const benchReady = page =>
  page.waitForFunction(() => window.PARP_WORKBENCH?.rifle && document.querySelector('#status').hidden, null, {timeout: 120000});
try {
  const page = await open(browser, server.url + 'map/?campaign=c1');
  await page.evaluate(() => ['parp-campaign-v1', 'parp-squad-v1', 'parp-band-v2'].forEach(k => localStorage.removeItem(k)));
  await page.reload();
  await page.waitForFunction(() => window.PARP_MAP?.ready, null, {timeout: 120000});
  // the band holds an AK-74M and one suppressor, and no optics
  await page.evaluate(() => {
    const M = window.PARP_MAP;
    Object.assign(M.travel.campaign.stash, {ak74m: 1, suppressor: 1});
    M.travel.save();
  });
  await page.keyboard.press('p');
  await page.locator('.band-panel:not([hidden])').waitFor();
  const link = page.locator('.band-panel a.gun-open[data-id="mila"]');
  assert.match(await link.getAttribute('href'), /workbench\/\?campaign=c1&fighter=mila$/);
  await Promise.all([page.waitForURL(/workbench/, {waitUntil: 'commit'}), link.click()]);
  await benchReady(page);

  // the panel, and what is locked
  const fitted = await page.evaluate(() => ({...window.PARP_WORKBENCH.rifle.build}));
  assert.equal(fitted.optic, 'none', "the AK-74M's own red dot is gear the band lacks: irons until one is found");
  assert.equal(fitted.muzzle, 'can', 'its suppressor the band has');
  assert.match(await page.locator('.campaign-bench').innerText(), /CAMPAIGN ARMOURY/);
  assert.equal(await page.locator('#bench-fighter').inputValue(), 'mila');
  assert.equal(await page.locator('[data-rifle="g3"]').getAttribute('aria-disabled'), 'true', 'a rifle not on the island');
  assert.match(await page.locator('[data-rifle="g3"]').getAttribute('title'), /Not found on this island/);
  const holo = page.locator('#build .chips button', {hasText: /holo/i}).first();
  assert.equal(await holo.getAttribute('aria-disabled'), 'true', 'no red dot in the stash');
  assert.match(await holo.getAttribute('title'), /no Red dot sight free\. Found in compound stores/);
  await holo.evaluate(b => b.click()); // (the chip list redraws on hover: a plain DOM click)
  assert.match(await page.locator('#detail').innerText(), /can't be fitted: The band has no Red dot sight free/);

  // the suppressor fits; assign the build
  const can = page.locator('#build .chips button', {hasText: 'Suppressor'}).first();
  assert.equal(await can.getAttribute('aria-disabled'), null, 'the band has a suppressor');
  await can.evaluate(b => b.click());
  await page.waitForFunction(() => window.PARP_WORKBENCH.rifle.build.muzzle === 'can');
  await page.locator('#bench-assign').click();
  assert.match(await page.locator('#bench-status').innerText(), /^Assigned: Mila carries this AK74M next mission\./);
  let c = await saved(page);
  assert.equal(c.band.fighters.mila.build.rifle, 'ak74m');
  assert.equal(c.band.fighters.mila.build.parts.muzzle, 'can');
  // Dragan now finds the suppressor taken
  await page.locator('#bench-fighter').selectOption('dragan');
  await page.waitForFunction(() => document.querySelector('#build .chips button[title*="Suppressor"]'), null, {timeout: 30000});
  assert.equal(await page.locator('#build .chips button', {hasText: 'Suppressor'}).first().getAttribute('aria-disabled'), 'true');

  // the next mission: Mila carries it
  await page.goto(server.url + 'map/?campaign=c1');
  await page.waitForFunction(() => window.PARP_MAP?.ready, null, {timeout: 120000});
  await page.evaluate(async url => {
    const {deploy} = await import(url);
    const M = window.PARP_MAP,
      c = M.travel.campaign;
    deploy(c, {id: 'gun-1', level: 'convoy', seed: 5, fighters: ['player', 'mila', 'dragan', 'ivana', 'petar', 'lena']});
    M.travel.save();
  }, server.url + 'shared/campaign/encounter.js');
  await page.goto(server.url + 'convoy/?campaign=c1&encounter=gun-1');
  await page.waitForFunction(() => window.PARP_SPRITES?.ready, null, {timeout: 90000});
  const mila = await page.evaluate(() => {
    const u = window.PARP_SPRITES.sim.units.find(x => x.id === 'mila');
    return {gun: u.gun, noise: u.mods.noise, muzzle: u.build?.parts.muzzle};
  });
  assert.deepEqual([mila.gun, mila.muzzle], ['ak74m', 'can'], 'her build, drawn as an AK-74M');
  assert.ok(mila.noise < 0.5, `heard nearer (${mila.noise})`);
  c = await saved(page);
  assert.ok(c.band.fighters.mila.build, 'the build stays with her');
  console.log('owned-guns: ok');
} finally {
  await browser.close();
  server.stop();
}
