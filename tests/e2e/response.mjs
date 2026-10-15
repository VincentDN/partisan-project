// Escalation is explained before launch and its saved tier reaches actual tactical equipment and difficulty.
import assert from 'node:assert/strict';
import {launch, open, startServer} from './browser.mjs';
const server = await startServer(8189),
  browser = await launch();
try {
  const page = await open(browser, server.url + 'map/?campaign=c1');
  const ready = () => page.waitForFunction(() => window.PARP_MAP?.ready, null, {timeout: 180000});
  await ready();
  await page.evaluate(async () => {
    const M = window.PARP_MAP,
      {SETTLEMENTS} = await import('/map/island.js');
    M.setSpeed(0);
    for (const s of SETTLEMENTS.filter(s => s.faction === 'invader')) M.travel.campaign.world.settlements[s.id] = {owner: 'resistance'};
    for (let i = 0; i < 4; i++)
      M.travel.campaign.band.fighters[`Reserve ${i}`] = {class: 'volunteer', xp: 0, wounded: false, healIn: 0, kit: null};
    M.travel.save();
  });
  await page.reload();
  await ready();
  await page.evaluate(() => window.PARP_MAP.campaign.toggleBand(true));
  assert.match(await page.locator('#campaign-response').innerText(), /Suppression \(tier 3\).*Strength 80/);
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    const M = window.PARP_MAP,
      p = M.parties.parties.find(p => p.id === 'raiders');
    M.campaign.showEncounter(M.campaign.contactAt({x: p.root.position.x, z: p.root.position.z}));
  });
  assert.match(await page.locator('.enc-mission').innerText(), /43 enemy/);
  assert.match(await page.locator('.enc-response').innerText(), /Suppression.*tier 3/);
  await page.locator('#enc-attack').click();
  await page.waitForFunction(() => window.PARP_SPRITES?.ready, null, {timeout: 120000});
  const data = await page.evaluate(() => {
    const S = window.PARP_SPRITES.sim,
      L = S.level;
    return {
      tier: L.response.tier,
      count: L.hunters,
      react: S.difficulty.react,
      roles: L.waves.flatMap(w => w.squads.flatMap(s => s.units.map(u => u.role))),
    };
  });
  assert.equal(data.tier, 3);
  assert.equal(data.count, 43);
  assert.equal(data.react, 0.7);
  assert.ok(data.roles.includes('marksman'));
  assert.ok(data.roles.includes('mg'));
  console.log('saved response explanation, hunter count, specialist kit and tactical reaction: ok');
} finally {
  await browser.close();
  server.stop();
}
