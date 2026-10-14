// Reproducible attachment audit and contact sheets. CHROMIUM=/path node tools/qa/weapon-fit.mjs [output-directory]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {launch, open, startServer} from '../../tests/e2e/browser.mjs';
const out = process.argv[2] || 'build/weapon-fit';
fs.mkdirSync(out, {recursive: true});
const server = await startServer(8185),
  browser = await launch();
try {
  const page = await open(browser, 'about:blank');
  await page.route('**/fit-audit.html', r =>
    r.fulfill({
      contentType: 'text/html',
      body: '<script type="importmap">{"imports":{"three":"./vendor/three/build/three.module.min.js","three/addons/":"./vendor/three/examples/jsm/"}}</script>',
    }),
  );
  await page.goto(server.url + 'fit-audit.html');
  const report = await page.evaluate(async () => (await import('./tools/qa/weapon-fit-browser.js')).audit({pictures: true}));
  const heroes = [];
  const tile = async (png, title) =>
    sharp(Buffer.from(png.split(',')[1], 'base64'))
      .composite([
        {
          input: Buffer.from(
            `<svg width="640" height="28"><rect width="640" height="28" fill="white"/><text x="10" y="20" font-size="17">${title}</text></svg>`,
          ),
          left: 0,
          top: 0,
        },
      ])
      .png()
      .toBuffer();
  for (const [i, r] of report.entries()) {
    const choices = r.options.filter(o => o.png),
      tiles = [];
    for (const [j, o] of choices.entries()) {
      tiles.push({input: await tile(o.png, `${r.id} / ${o.slot} / ${o.option}`), left: (j % 4) * 640, top: Math.floor(j / 4) * 280});
      delete o.png;
    }
    await sharp({create: {width: 2560, height: Math.ceil(choices.length / 4) * 280, channels: 3, background: '#c8cdd2'}})
      .composite(tiles)
      .png()
      .toFile(path.join(out, r.id + '.png'));
    heroes.push({input: await tile(r.hero, r.id), left: (i % 2) * 640, top: Math.floor(i / 2) * 280});
    delete r.hero;
  }
  await sharp({create: {width: 1280, height: Math.ceil(report.length / 2) * 280, channels: 3, background: '#c8cdd2'}})
    .composite(heroes)
    .png()
    .toFile(path.join(out, 'overview.png'));
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`${report.length} weapons, ${report.reduce((n, r) => n + r.options.length, 0)} choices: ${out}`);
} finally {
  await browser.close();
  server.stop();
}
