// Settlement choices carry actual defenders into missions; raids preserve ownership and captures liberate on return.
import assert from 'node:assert/strict';
import {launch, open, startServer, leaveSpoils} from './browser.mjs';
const server = await startServer(8186),
  browser = await launch();
try {
  const page = await open(browser, server.url + 'map/?campaign=c1');
  const ready = () => page.waitForFunction(() => window.PARP_MAP?.ready, null, {timeout: 180000});
  await ready();
  for (const intent of ['raid', 'capture']) {
    await page.evaluate(async () => {
      const M = window.PARP_MAP;
      for (const f of Object.values(M.travel.campaign.band.fighters)) {
        f.wounded = false;
        f.healIn = 0;
      }
      M.travel.campaign.world.clock.hour = 23;
      const {SETTLEMENTS} = await import('/map/island.js');
      const s = SETTLEMENTS.find(s => s.id === 'myrtia');
      M.campaign.showEncounter(M.campaign.contactAt(s));
    });
    await page.locator('#enc-intent').selectOption(intent);
    await page.locator('#enc-attack').click();
    await page.waitForFunction(() => window.PARP_SPRITES?.ready, null, {timeout: 120000});
    const fielded = await page.evaluate(() => {
      const {sim, campaign} = window.PARP_SPRITES;
      return {
        intent: sim.level.settlement.intent,
        total: sim.level.settlement.garrison + sim.level.settlement.militia,
        expected: campaign.deployment.enemy.strength,
        night: sim.level.night,
      };
    });
    assert.equal(fielded.intent, intent);
    assert.equal(fielded.total, fielded.expected);
    assert.equal(fielded.night, true);
    await page.locator('#start').click();
    await page.evaluate(() => {
      const s = window.PARP_SPRITES.sim;
      s.units
        .filter(u => u.side === 'army')
        .slice(0, 3)
        .forEach(u => (u.alive = false));
      s.outcome = 'won';
    });
    await page.locator('#finish-mission').click();
    await page.locator('#combat-loot').waitFor();
    await leaveSpoils(page); // a win: the spoils screen, then the map
    await ready();
    const state = await page.evaluate(() => window.PARP_MAP.travel.campaign.world.settlements.myrtia);
    assert.equal(state.owner === 'resistance', intent === 'capture');
    if (intent === 'raid') assert.equal(state.garrison, 22);
  }
  console.log('settlement raid/capture, night and exact roster: ok');
} finally {
  await browser.close();
  server.stop();
}
