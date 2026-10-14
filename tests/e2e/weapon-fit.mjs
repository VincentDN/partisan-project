// Exhaustive attachment-choice geometry and interacting combinations in a real browser, using the built site too.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {launch, open, startServer} from './browser.mjs';
const server = await startServer(8184),
  browser = await launch();
try {
  const page = await open(browser, 'about:blank');
  await page.route('**/fit-audit.html', r =>
    r.fulfill({
      contentType: 'text/html',
      body: '<script type="importmap">{"imports":{"three":"./vendor/three/build/three.module.min.js","three/addons/":"./vendor/three/examples/jsm/"}}</script>',
    }),
  );
  for (const name of ['weapon-fit-browser.js', 'weapon-fit-checks.js'])
    await page.route(`**/tools/qa/${name}`, r =>
      r.fulfill({contentType: 'text/javascript', body: fs.readFileSync(`tools/qa/${name}`, 'utf8')}),
    );
  await page.goto(server.url + 'fit-audit.html');
  const report = await page.evaluate(async () => (await import('./tools/qa/weapon-fit-browser.js')).audit());
  assert.equal(report.length, 12);
  const failures = report.flatMap(r => r.checks.errors);
  assert.deepEqual(failures, []);
  for (const r of report)
    for (const o of r.options)
      if (!o.empty) {
        assert.ok([...o.min, ...o.max].every(Number.isFinite), `${r.id}/${o.slot}/${o.option}: finite geometry`);
        assert.ok(
          o.max[0] - o.min[0] < 1.5 && o.max[1] - o.min[1] < 0.7 && o.max[2] - o.min[2] < 0.5,
          `${r.id}/${o.slot}/${o.option}: believable size`,
        );
      }
  fs.mkdirSync('build/weapon-fit', {recursive: true});
  fs.writeFileSync('build/weapon-fit/acceptance.json', JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify({
      weapons: report.length,
      choices: report.reduce((n, r) => n + r.options.length, 0),
      underbarrel: report.reduce((n, r) => n + r.checks.counts.underbarrel, 0),
      pairs: report.reduce((n, r) => n + r.checks.counts.pairs, 0),
      optics: report.reduce((n, r) => n + r.checks.counts.optics, 0),
    }),
  );
} finally {
  await browser.close();
  server.stop();
}
