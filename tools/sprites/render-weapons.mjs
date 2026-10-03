// Render the Workbench rifles to 2.5-D weapon sprites: assets/sprites/weapons/<id>.png plus manifest.json
// (label and real length in metres, so the sprite view draws each gun to scale).
//   CHROMIUM=... node tools/sprites/render-weapons.mjs
import fs from 'node:fs';
import sharp from 'sharp';
import {launch, open, startServer} from '../../tests/e2e/browser.mjs';

const OUT = 'assets/sprites/weapons';
const server = await startServer(8193),
  browser = await launch();
const page = await open(browser, `${server.url}tools/sprites/render-weapons.html`, {viewport: {width: 1024, height: 512}});
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
await page.waitForFunction(() => window.ready, null, {timeout: 60000});
const sprites = await page.evaluate(() => window.renderAll());
fs.mkdirSync(OUT, {recursive: true});
const manifest = {};
for (const s of sprites) {
  const buf = Buffer.from(s.png.split(',')[1], 'base64');
  // 256 px wide: enough for the closest zoom, small to ship
  await sharp(buf).resize({width: 256}).png({compressionLevel: 9}).toFile(`${OUT}/${s.id}.png`);
  manifest[s.id] = {label: s.label, file: `${s.id}.png`, length: s.length};
  console.log(`${s.id.padEnd(9)} ${s.length} m`);
}
fs.writeFileSync(`${OUT}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n');
console.log(errors.length ? 'ERRORS: ' + errors.join(' | ') : 'done');
await browser.close();
server.stop();
process.exit(0);
