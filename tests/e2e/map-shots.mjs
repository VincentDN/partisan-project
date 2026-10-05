// Screenshots of the Overworld Map for visual review: the opening view, then any camera views given as JSON.
//   node tests/e2e/map-shots.mjs out-prefix '[null, [x, z, distance, yaw], ...]'   (null = the opening view)
import {launch, open, startServer} from './browser.mjs';
const server = await startServer(8183),
  browser = await launch();
const page = await open(browser, server.url + 'map/', {viewport: {width: 1600, height: 900}});
const errs = [];
page.on('pageerror', e => errs.push('pageerror ' + e.message));
page.on('console', m => (m.type() === 'error' || m.type() === 'warning') && errs.push(m.text()));
await page.waitForFunction(() => window.PARP_MAP?.ready, null, {timeout: 120000}).catch(e => errs.push('timeout'));
await page.waitForTimeout(3000);
const out = process.argv[2];
const views = JSON.parse(process.argv[3] || '[null]');
for (const [i, v] of views.entries()) {
  if (v) await page.evaluate(([x, z, d, y]) => Object.assign(window.PARP_MAP.cam, {tx: x, tz: z, td: d, tyaw: y}), v);
  await page.waitForTimeout(2500);
  await page.screenshot({path: `${out}-${i + 1}.png`});
}
console.log(errs.slice(0, 10).join('\n'));
process.exit(0);
