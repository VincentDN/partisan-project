// The campaign map's frame budget, measured (WP-W24): the main-thread time each drawn frame costs (map/map-runtime.js
// keeps the last 240), with the world running and the camera panning, at 1280x800 and at a phone's 412x915. Written to
// build/map-budget.json and printed. The ceiling is a 30 fps frame (33 ms) of main-thread work; here WebGL draws in
// software in the GPU process, so the GPU's share is not in it: the 30 fps a mid-range phone must hold is measured on
// a device (WP-W24 notes).
import assert from 'node:assert/strict';
import {mkdirSync, writeFileSync} from 'node:fs';
import {launch, open, startServer, frames} from './browser.mjs';

const CEILING_P95_MS = 33; // per drawn frame, main thread: a 30 fps frame
const server = await startServer(8195),
  browser = await launch();
const pct = (xs, p) => [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor((xs.length * p) / 100))];
const report = {};
try {
  for (const [name, viewport] of [
    ['desktop', {width: 1280, height: 800}],
    ['phone', {width: 412, height: 915}],
  ]) {
    const page = await open(browser, server.url + 'map/?campaign=c1', {viewport});
    await page.evaluate(() => ['parp-campaign-v1', 'parp-squad-v1', 'parp-band-v2'].forEach(k => localStorage.removeItem(k)));
    await page.reload();
    await page.waitForFunction(() => window.PARP_MAP?.ready, null, {timeout: 180000});
    await frames(page, 10); // past the first frames (shaders, uploads)
    await page.evaluate(() => {
      const M = window.PARP_MAP;
      M.performance.recent.length = 0;
      M.setSpeed(1); // the world moves: convoys, patrols, the clock
    });
    // pan across the island while it runs
    for (let i = 0; i < 4; i++) {
      await page.evaluate(i => {
        const c = window.PARP_MAP.cam;
        c.tx += i % 2 ? -40 : 40;
        c.tz += 25;
      }, i);
      await frames(page, 15);
    }
    const s = await page.evaluate(() => ({...window.PARP_MAP.performance, recent: [...window.PARP_MAP.performance.recent]}));
    assert.ok(s.recent.length >= 30, `${name}: frames drawn (${s.recent.length})`);
    const r = (report[name] = {
      frames: s.recent.length,
      skipped: s.skipped,
      p50: +pct(s.recent, 50).toFixed(2),
      p95: +pct(s.recent, 95).toFixed(2),
      max: +Math.max(...s.recent).toFixed(2),
    });
    console.log(
      `map frame budget (${name} ${viewport.width}x${viewport.height}): p50 ${r.p50} ms, p95 ${r.p95} ms, max ${r.max} ms over ${r.frames} frames`,
    );
    assert.ok(r.p95 < CEILING_P95_MS, `${name}: p95 ${r.p95} ms under ${CEILING_P95_MS} ms`);
    await page.close();
  }
  mkdirSync('build', {recursive: true});
  writeFileSync(
    'build/map-budget.json',
    JSON.stringify({measured: new Date().toISOString(), ceilingP95Ms: CEILING_P95_MS, ...report}, null, 2) + '\n',
  );
} finally {
  await browser.close();
  server.stop();
}
