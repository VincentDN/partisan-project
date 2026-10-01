// Headless smoke test for the Partisan loadout demo. Loads the page, walks every screen, both
// rifles, every Build option, every Operator control and every pose, and fails on any page error
// or console error, or if the stats never change.
//
// Usage (from the repository root):
//   python3 -m http.server 8123 &
//   npm i playwright@1.56   (any recent version; set CHROMIUM to a local build if needed)
// Loads the page with ?screens=all so the parked Operator and Field screens are still covered.
//   node 3d/partisan-project/ak15-workbench-intro/ak15-weapon-customiser/model-source/smoke-test.mjs [http://localhost:8123] [--three=/path/to/three/package]
// --three serves Three.js from a local copy of the npm package instead of the CDN (offline runs).
import {chromium} from 'playwright';
import path from 'node:path';

const args = process.argv.slice(2);
const base = (args.find(a => !a.startsWith('--')) || 'http://localhost:8123').replace(/\/$/, '');
const threeDir = args.find(a => a.startsWith('--three='))?.slice(8);
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({viewport: {width: 1400, height: 900}});
const problems = [];
page.on('pageerror', e => problems.push('pageerror: ' + e.message));
page.on('console', m => {
  if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) problems.push('console: ' + m.text());
});
if (threeDir)
  await page.route(/cdn\.jsdelivr\.net\/npm\/three@[^/]+\//, r => {
    const rel = r
      .request()
      .url()
      .replace(/.*three@[^/]+\//, '');
    r.fulfill({path: path.join(threeDir, rel), contentType: 'application/javascript'});
  });

const settle = ms => page.waitForTimeout(ms);
const click = async sel => {
  await page.locator(sel).first().click({force: true});
};
// The BUILD stats panel (#stats) was removed from the UI; the loadout hash still changes with
// every option, so it stands in as the "something changed" oracle below.
const stats = () => page.evaluate(() => location.hash);
let checks = 0;
async function step(label, fn) {
  try {
    await fn();
    checks++;
  } catch (err) {
    problems.push(`${label}: ${err.message.split('\n')[0]}`);
  }
}

await page.goto(base + '/3d/partisan-project/ak15-workbench-intro/ak15-weapon-customiser/?screens=all');
await settle(6000);
for (const rifle of ['ak74m', 'ak15k']) {
  await step('rifle ' + rifle, async () => {
    await click(`[data-rifle=${rifle}]`);
    await settle(3500);
  });
  const before = await stats();
  let changed = false;
  const slots = await page.$$eval('#build .slot', rows => rows.map((_, i) => i));
  for (const i of slots) {
    const count = await page.locator('#build .slot').nth(i).locator('.chips button').count();
    for (let k = 0; k < count; k++)
      await step(`${rifle} slot ${i} option ${k}`, async () => {
        const b = page.locator('#build .slot').nth(i).locator('.chips button').nth(k);
        await b.click({force: true});
        await settle(120);
        if ((await stats()) !== before) changed = true;
      });
  }
  if (!changed) problems.push(`${rifle}: stats never changed across all options`);
  const swatches = await page.locator('#finish .swatches button').count();
  for (let k = 0; k < swatches; k++)
    await step(`${rifle} finish ${k}`, () => page.locator('#finish .swatches button').nth(k).click({force: true}));
  await step(`${rifle} wear`, async () => {
    await page.$eval('#wear', i => {
      i.value = '70';
      i.dispatchEvent(new Event('input'));
      i.dispatchEvent(new Event('change'));
    });
    if (!/wear=70/.test(await page.evaluate(() => location.hash))) throw new Error('wear not in hash');
  });
  await step(`${rifle} test fire`, async () => {
    await click('[data-panel=armoury] .fire');
    await settle(700);
  });
}
await step('operator tab', async () => {
  await click('[data-mode=operator]');
  await settle(1500);
});
const controls = await page.locator('#operator-panel .chips button, #operator-panel .swatches button').count();
for (let k = 0; k < controls; k++)
  await step(`operator control ${k}`, async () => {
    await page.locator('#operator-panel .chips button, #operator-panel .swatches button').nth(k).click({force: true});
    await settle(60);
  });
await step('randomise', async () => {
  for (let i = 0; i < 5; i++) {
    await click('#randomise');
    await settle(200);
  }
});
await step('field tab', async () => {
  await click('[data-mode=field]');
  await settle(1500);
});
const poses = await page.locator('#poses button').count();
for (let k = 0; k < poses; k++)
  await step(`pose ${k}`, async () => {
    await page.locator('#poses button').nth(k).click({force: true});
    await settle(300);
  });
const presets = await page.locator('#presets button').count();
for (let k = 0; k < presets; k++)
  await step(`preset ${k}`, async () => {
    await page.locator('#presets button').nth(k).click({force: true});
    await settle(2500);
  });
await step('field test fire', async () => {
  await click('[data-panel=field] .fire');
  await settle(700);
});
await step('reload', async () => {
  await click('#poses button >> nth=0');
  await click('#reload');
  await page.waitForFunction(() => Number(document.body.dataset.reload) > 0.2, null, {timeout: 60000});
});
await step('range drill', async () => {
  await click('#drill');
  await page.waitForFunction(() => /\//.test(document.querySelector('#drill-result').textContent), null, {timeout: 120000});
});
await step('loadout card', async () => {
  const [dl] = await Promise.all([page.waitForEvent('download'), click('#card')]);
  if (!/\.png$/.test(dl.suggestedFilename())) throw new Error('card is not a PNG');
});
await step('round-trip hash', async () => {
  const hash = await page.evaluate(() => location.hash);
  await page.goto('about:blank');
  await page.goto(base + '/3d/partisan-project/ak15-workbench-intro/ak15-weapon-customiser/?screens=all' + hash);
  await settle(6000);
  const again = await page.evaluate(() => location.hash);
  if (again !== hash) throw new Error(`hash changed: ${hash} → ${again}`);
});

await browser.close();
console.log(`${checks} checks, ${problems.length} problems`);
for (const p of problems) console.log(' - ' + p);
process.exit(problems.length ? 1 : 0);
