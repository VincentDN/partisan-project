// Workbench fit audit: where every mount point should sit on its gun, and a contact sheet of every slot option.
//   node tools/workbench/fit-audit.mjs                 report gaps (mm) and the snapped source coordinates as JSON
//   node tools/workbench/fit-audit.mjs --sheets [ids]  write build/fit/<rifle>.png, one tile per slot option
import fs from 'node:fs';
import sharp from 'sharp';
import {launch, open, startServer} from '../../tests/e2e/browser.mjs';

const args = process.argv.slice(2);
const server = await startServer(8194),
  browser = await launch();
const page = await open(browser, `${server.url}tools/workbench/fit-audit.html`, {viewport: {width: 400, height: 300}});
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => m.type() === 'error' && errors.push(m.text()));
page.on('response', r => r.status() >= 400 && errors.push(`${r.status()} ${r.url()}`));
await page.waitForFunction(() => window.ready, null, {timeout: 60000});
if (args[0] === '--sheets') {
  const ids = args.slice(1).length
    ? args.slice(1)
    : await page.evaluate(async () => Object.keys((await import('../../workbench/models.js')).MODELS));
  fs.mkdirSync('build/fit', {recursive: true});
  for (const id of ids) {
    const tiles = await page.evaluate(id => window.sheet(id), id);
    const cols = 6,
      W = 320,
      H = 240;
    const composites = [];
    for (const [i, t] of tiles.entries()) {
      const label = Buffer.from(
        `<svg width="${W}" height="20"><rect width="${W}" height="20" fill="#000a"/><text x="6" y="14" font-family="monospace" font-size="12" fill="#fff">${t.slot} · ${t.option} · ${t.label.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text></svg>`,
      );
      composites.push({input: Buffer.from(t.png.split(',')[1], 'base64'), left: (i % cols) * W, top: Math.floor(i / cols) * H + 20});
      composites.push({input: label, left: (i % cols) * W, top: Math.floor(i / cols) * H});
    }
    await sharp({create: {width: cols * W, height: Math.ceil(tiles.length / cols) * H, channels: 3, background: '#222'}})
      .composite(composites)
      .png()
      .toFile(`build/fit/${id}.png`);
    console.log(`build/fit/${id}.png: ${tiles.length} tiles`);
  }
} else {
  const report = await page.evaluate(() => window.audit());
  fs.mkdirSync('build', {recursive: true});
  fs.writeFileSync('build/fit-audit.json', JSON.stringify(report, null, 1));
  for (const [id, rows] of Object.entries(report)) console.log(id.padEnd(9), rows.map(r => `${r.slot}:${r.gapMm ?? 'miss'}`).join('  '));
}
if (errors.length) console.log('ERRORS', errors.slice(0, 5).join(' | '));
await browser.close();
server.stop();
process.exit(0);
