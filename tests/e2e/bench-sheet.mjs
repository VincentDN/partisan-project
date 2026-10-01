// One image of a bench task at eight points in time, for visual review of hand contacts.
//   node tests/e2e/bench-sheet.mjs out.png optic scope [rifle=ak74m]
import sharp from 'sharp';
import {launch, open, startServer} from './browser.mjs';

const [out = 'build/bench-sheet.png', slot = 'optic', opt = 'scope', rifle = 'ak74m'] = process.argv.slice(2);
const server = await startServer(8197),
  browser = await launch();
const page = await open(browser, `${server.url}bench/#rifle=${rifle}`, {
  viewport: {width: 1100, height: 760},
  reducedMotion: 'no-preference',
});
await page.waitForFunction(() => window.PARP_BENCH?.ready, null, {timeout: 90000});
await page.evaluate(() => (document.querySelector('#first-run').hidden = true));
await page.evaluate(
  ([s, o]) => {
    const b = window.PARP_BENCH;
    window.__t = 0;
    b.actions.now = () => window.__t;
    b.change(s, o);
  },
  [slot, opt],
);
const dur = await page.evaluate(() => window.PARP_BENCH.actions.current?.duration);
if (!dur) throw new Error(`no task started for ${slot}=${opt} (blocked, or already fitted)`);
const tiles = [];
for (const u of [0.05, 0.2, 0.33, 0.45, 0.6, 0.7, 0.85, 0.98]) {
  await page.evaluate(([u, d]) => (window.__t = u * d), [u, dur]);
  await page.waitForTimeout(250);
  const buf = await page.locator('#stage').screenshot();
  tiles.push({
    input: await sharp(buf).resize(560, 380).toBuffer(),
    left: (tiles.length % 4) * 560,
    top: Math.floor(tiles.length / 4) * 380,
  });
}
const err = await page.evaluate(() => document.querySelector('#reach-error').textContent);
await sharp({create: {width: 2240, height: 760, channels: 3, background: '#111'}})
  .composite(tiles)
  .png()
  .toFile(out);
console.log('wrote', out, err, page.problems.length ? page.problems : '');
await browser.close();
server.stop();
