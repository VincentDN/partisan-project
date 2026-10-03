// Browser acceptance for whole-squad control, forced death choice, keyboard/touch and reduced motion.
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {launch, open, startServer} from './browser.mjs';

export async function checkSquadControl(browser, url, reducedMotion = 'reduce') {
  const page = await open(browser, url + 'convoy/3d.html?seed=7', {reducedMotion});
  try {
    await page.waitForFunction(() => window.PARP_CONVOY?.ready);
    await page.locator('#start').click();
    await page.keyboard.press('q');
    await page.locator('#squad-picker:not([hidden])').waitFor();
    // Buttons track moving world positions during the zoom; interact without waiting for animation to stop.
    await page.locator('[data-rebel="mila"]').hover({force: true});
    await page.locator('[data-rebel="mila"]').click({force: true});
    assert.equal(await page.evaluate(() => window.PARP_CONVOY.sim.player.id), 'mila');
    assert.equal(await page.locator('#squad-picker').isVisible(), false);
    assert.equal(await page.locator('#switch-rebel').isDisabled(), true, 'cooldown');
    await page.evaluate(() => {
      window.PARP_CONVOY.sim.time += 3;
    });
    await page.keyboard.press('q');
    await page.keyboard.press('1');
    assert.equal(await page.evaluate(() => window.PARP_CONVOY.sim.player.id), 'player', 'keyboard chooses a rebel, not a weapon');
    await page.evaluate(() => {
      const s = window.PARP_CONVOY.sim;
      s.damage(
        s.player,
        s.units.find(u => u.side === 'army'),
        999,
      );
      s.checkOutcome();
    });
    await page.locator('#squad-picker:not([hidden])').waitFor();
    assert.equal(await page.evaluate(() => window.PARP_CONVOY.sim.outcome), null, 'active death does not fail mission');
    assert.equal(await page.locator('[data-swap-cancel]').isVisible(), false, 'cannot cancel death choice');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#squad-picker').isVisible(), true);
    await page.locator('[data-rebel="dragan"]').click({force: true});
    assert.equal(await page.evaluate(() => window.PARP_CONVOY.sim.player.id), 'dragan');
    const x = await page.evaluate(() => window.PARP_CONVOY.sim.player.x);
    await page.keyboard.down('d');
    await page.waitForFunction(x => window.PARP_CONVOY.sim.player.x > x + 0.1, x);
    await page.keyboard.up('d');
    await page.evaluate(() => {
      const s = window.PARP_CONVOY.sim;
      for (const u of s.units.filter(u => u.side === 'partisan' && u.alive))
        s.damage(
          u,
          s.units.find(a => a.side === 'army'),
          999,
        );
      s.checkOutcome();
    });
    await page.waitForFunction(() => window.PARP_CONVOY.sim.outcome === 'lost');
    await page.locator('#card:not([hidden])').waitFor();
    assert.match(await page.locator('#card-title').innerText(), /failed/);
    assert.equal(await page.locator('#squad-picker').isVisible(), false);
    await page.locator('#restart').click();
    assert.equal(await page.evaluate(() => window.PARP_CONVOY.sim.player.id), 'player');
    assert.equal(await page.evaluate(() => window.PARP_CONVOY.sim.control.pending), null);
    assert.deepEqual(
      page.problems.filter(p => !/AudioContext|autoplay|ERR_ABORTED/i.test(p)),
      [],
    );
  } finally {
    await page.close();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = await startServer(8198);
  let browser;
  try {
    browser = await launch();
    for (const motion of ['reduce', 'no-preference']) {
      await checkSquadControl(browser, server.url, motion);
      console.log(`PASS squad switching (${motion})`);
    }
  } finally {
    await browser?.close();
    server.stop();
  }
}
