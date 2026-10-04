// One image with every rifle (or a chosen few) in the Weapon Modder, for visual review.
//   node tests/e2e/workbench-sheet.mjs out.png [rifles=all] [extra hash, e.g. "optic=scope&foregrip=vertical"] [view=hero]
import sharp from 'sharp';
import {launch, open, startServer} from './browser.mjs';

const [out = 'build/workbench-sheet.png', ids = 'all', extra = '', viewName = 'hero'] = process.argv.slice(2);
const {MODELS} = await import('../../workbench/models.js');
const rifles = ids === 'all' ? Object.keys(MODELS) : ids.split(',');
const server = await startServer(8197),
  browser = await launch();
const tiles = [],
  W = 520,
  H = 330;
for (const id of rifles) {
  const page = await open(browser, `${server.url}workbench/#rifle=${id}${extra ? '&' + extra : ''}`, {
    viewport: {width: 1300, height: 820},
  });
  await page.waitForFunction(() => window.PARP_WORKBENCH?.rifle && document.querySelector('#status').hidden, null, {timeout: 60000});
  await page.evaluate(v => document.querySelector(`[data-view="${v}"]`)?.click(), viewName);
  await page.waitForTimeout(2200);
  const shot = await page.locator('#stage').screenshot();
  tiles.push(await sharp(shot).resize(W, H, {fit: 'cover'}).png().toBuffer());
  await page.close();
}
const cols = Math.min(3, tiles.length),
  rows = Math.ceil(tiles.length / cols);
await sharp({create: {width: cols * W, height: rows * H, channels: 3, background: '#000'}})
  .composite(tiles.map((input, i) => ({input, left: (i % cols) * W, top: Math.floor(i / cols) * H})))
  .png()
  .toFile(out);
await browser.close();
server.close?.();
console.log(out);
process.exit(0);
