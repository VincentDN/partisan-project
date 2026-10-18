// Recovery and intercepted-intelligence history is visible on desktop/mobile and survives a map reload.
import assert from 'node:assert/strict';
import {launch, open, startServer} from './browser.mjs';
const server = await startServer(8215),
  browser = await launch();
try {
  const p = await open(browser, server.url + 'map/?campaign=journal');
  await p.waitForFunction(() => window.PARP_MAP?.ready, null, {timeout: 180000});
  await p.locator('#campaign-journal summary').click();
  await p.evaluate(async () => {
    window.recoveryNotes = 0;
    const create = AudioContext.prototype.createOscillator;
    AudioContext.prototype.createOscillator = function (...args) {
      window.recoveryNotes++;
      return create.apply(this, args);
    };
    const {logEvent} = await import('/shared/campaign/state.js');
    const {passTime} = await import('/shared/campaign/contacts.js');
    const m = window.PARP_MAP,
      c = m.travel.campaign;
    m.setSpeed(0);
    Object.assign(c.band.fighters.mila, {wounded: true, healIn: 1});
    passTime(c, 2);
    logEvent(c, {kind: 'counterattack-out', target: 'oros'});
    m.travel.save();
  });
  await p.waitForFunction(() => document.querySelector('#campaign-journal').textContent.includes('Mila recovered'));
  assert.equal(await p.evaluate(() => window.recoveryNotes), 2, 'one quiet two-note cue');
  assert.match(await p.locator('#campaign-journal').innerText(), /Mila recovered/);
  assert.match(await p.locator('#campaign-journal').innerText(), /Intercepted orders/);
  await p.reload();
  await p.waitForFunction(() => window.PARP_MAP?.ready, null, {timeout: 180000});
  await p.locator('#campaign-journal summary').click();
  assert.equal(await p.locator('#campaign-journal li').filter({hasText: 'Mila recovered'}).count(), 1);
  await p.setViewportSize({width: 390, height: 844});
  const bounds = await p.locator('#campaign-journal').boundingBox();
  assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 390);
  await p.close();
  console.log('PASS saved campaign journal and mobile layout');
} finally {
  await browser.close();
  server.stop();
}
