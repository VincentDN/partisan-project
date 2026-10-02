// The chiptune cover must stay locked to the recording and the crossfade must hand over cleanly. Run with the autoplay
// policy relaxed (headless Chromium would otherwise block the audio):  node tests/e2e/chip-sync.mjs  (npm run test:audio)
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {startServer} from './browser.mjs';
const server = await startServer(8193, '_site');
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM,
  args: [
    '--autoplay-policy=no-user-gesture-required',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--no-sandbox',
  ],
});
const page = await browser.newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message));
await page.goto(server.url + 'menu/');
await page.waitForFunction(() => window.PARP_INDEX?.ready && window.parpSound);
await page.evaluate(() => window.parpSound.start(0.1));
const read = () =>
  page.evaluate(() => {
    const m = window.parpSound.music;
    return {
      variant: m.variant,
      ready: m.chipReady,
      a: m.audio?.currentTime,
      c: m.chipAudio?.currentTime,
      ap: m.audio?.paused,
      cp: m.chipAudio?.paused,
      rate: m.chipAudio?.playbackRate,
      main: m.mainGain.gain.value,
      chip: m.chipGain.gain.value,
    };
  });
for (const t of [2500, 2500]) await page.waitForTimeout(t);
const locked = await read();
assert.ok(!locked.ap && !locked.cp, 'both versions are playing');
assert.ok(Math.abs(locked.c - locked.a) < 0.04, `cover is within 40 ms of the recording (${((locked.c - locked.a) * 1000).toFixed(1)} ms)`);
assert.ok(locked.chip > 0.99 && locked.main < 0.01, 'on the index the cover is what you hear');
await page.evaluate(() => window.parpSound.variant('original', 1));
await page.waitForTimeout(1500);
const left = await read();
assert.ok(left.main > 0.99 && left.chip < 0.01, 'leaving the index fades back to the recording');
await page.evaluate(() => window.parpSound.variant('chip', 1));
await page.waitForTimeout(1500);
const back = await read();
assert.ok(back.chip > 0.99 && back.main < 0.01, 'and returning fades the cover in again');
assert.deepEqual(errs, []);
console.log('chip sync ok');
await browser.close();
server.stop();
