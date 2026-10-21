// Map recordings load after a gesture, walking follows actual travel, commands murmur and mute stops every voice.
import assert from 'node:assert/strict';
import {launch, open, startServer} from './browser.mjs';
const server = await startServer(8223),
  browser = await launch();
try {
  const p = await open(browser, server.url + 'map/?campaign=c1');
  await p.waitForFunction(() => window.PARP_MAP?.ready, null, {timeout: 180000});
  await p.mouse.click(10, 10);
  await p.waitForFunction(() => window.PARP_MAP.ambience.status.loaded === 4, null, {timeout: 30000});
  const status = () => p.evaluate(() => window.PARP_MAP.ambience.status);
  assert.ok((await status()).loops.includes('country'));
  await p.evaluate(() => {
    const m = window.PARP_MAP;
    m.travel.moveTo(m.travel.party.x + 20, m.travel.party.z);
  });
  await p.waitForFunction(() => window.PARP_MAP.ambience.status.loops.includes('feet'));
  assert.ok((await status()).walla > 0);
  await p.evaluate(() => window.PARP_MAP.setSpeed(0));
  await p.waitForFunction(() => !window.PARP_MAP.ambience.status.loops.includes('feet'));
  await p.evaluate(() => window.PARP_MAP.ambience.update(45));
  assert.ok((await status()).radio > 0);
  await p.locator('#campaign-sfx').click();
  assert.equal((await status()).enabled, false);
  assert.equal((await status()).active, 0);
  await p.reload();
  await p.waitForFunction(() => window.PARP_MAP?.ready, null, {timeout: 180000});
  assert.equal((await status()).enabled, false);
  assert.equal((await status()).active, 0);
  await p.locator('#campaign-sfx').click();
  await p.waitForFunction(() => window.PARP_MAP.ambience.status.loaded === 4);
  await p.waitForFunction(() => window.PARP_MAP.ambience.status.active > 0);
  await p.evaluate(() => dispatchEvent(new CustomEvent('parp-sfx-change', {detail: {on: true, volume: 0}})));
  await p.waitForFunction(() => window.PARP_MAP.ambience.status.active === 0);
  assert.ok((await status()).active <= 5);
  console.log('Recorded map ambience, moving-only footsteps, acknowledgements, radio, saved mute and zero volume passed.');
} finally {
  await browser.close();
  server.stop();
}
