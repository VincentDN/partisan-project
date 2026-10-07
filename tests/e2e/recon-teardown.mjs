// Verify reversible source inspection, selection, camera controls, mobile layout and accessibility.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import sharp from 'sharp';
import {launch, open, startServer, frames} from './browser.mjs';
const server = await startServer(8193),
  browser = await launch();
try {
  const page = await open(browser, server.url + 'operator/teardown.html', {viewport: {width: 1550, height: 1000}});
  await page.waitForFunction(() => window.PARP_RECON_TEARDOWN?.ready, null, {timeout: 60000});
  assert.equal(await page.locator('#parts button').count(), 27);
  // Compare transformed geometry bounds with independently measured glTF audit coordinates.
  const baseline = await page.evaluate(() => {
    const v = window.PARP_RECON_TEARDOWN;
    v.setMode('assembled');
    return v.parts.map(p => {
      const box = new v.stage.T.Box3().setFromObject(p.node);
      return {
        id: p.spec.id,
        min: box.min.toArray(),
        max: box.max.toArray(),
        matrix: p.node.matrixWorld.toArray(),
        geometry: p.node.geometry.attributes.position.array.reduce((s, n, i) => s + n * (i + 1), 0),
      };
    });
  });
  const audit = JSON.parse(fs.readFileSync('assets/models/operators/recon-source-audit.json'));
  for (const p of baseline)
    for (const axis of ['min', 'max']) {
      assert.ok(
        p[axis].every((n, i) => Math.abs(n - audit.parts[p.id].bounds[axis][i]) < 0.00001),
        `source alignment ${p.id}`,
      );
    }
  await page.getByRole('button', {name: 'Exploded', exact: true}).click();
  await page.locator('[data-part="6"]').click();
  assert.match(await page.locator('#part-title').innerText(), /Harness/);
  await page.getByRole('button', {name: 'Isolate selected', exact: true}).click();
  assert.deepEqual(await page.evaluate(() => window.PARP_RECON_TEARDOWN.parts.filter(p => p.group.visible).map(p => p.spec.id)), [6]);
  await page.getByRole('button', {name: 'Show all', exact: true}).click();
  await page.getByRole('button', {name: 'Body candidates', exact: true}).click();
  assert.deepEqual(
    await page.evaluate(() => window.PARP_RECON_TEARDOWN.parts.filter(p => p.group.visible).map(p => p.spec.id)),
    audit.parts.filter(p => p.bodyCandidate).map(p => p.id),
  );
  await page.getByRole('button', {name: 'Assembled', exact: true}).click();
  const restored = await page.evaluate(() =>
    window.PARP_RECON_TEARDOWN.parts.map(p => ({
      matrix: p.node.matrixWorld.toArray(),
      geometry: p.node.geometry.attributes.position.array.reduce((s, n, i) => s + n * (i + 1), 0),
    })),
  );
  baseline.forEach((p, i) => {
    assert.deepEqual(restored[i].matrix, p.matrix);
    assert.equal(restored[i].geometry, p.geometry);
  });
  const before = await page.evaluate(() => window.PARP_RECON_TEARDOWN.stage.camera.position.toArray());
  await page.locator('#teardown-stage').focus();
  await page.keyboard.press('ArrowRight');
  assert.notDeepEqual(await page.evaluate(() => window.PARP_RECON_TEARDOWN.stage.camera.position.toArray()), before);
  await page.getByRole('button', {name: 'Wireframe', exact: true}).click();
  assert.ok(await page.evaluate(() => window.PARP_RECON_TEARDOWN.parts.every(p => p.node.material.wireframe)));
  await page.getByRole('button', {name: 'Wireframe', exact: true}).click();
  if (process.env.TEARDOWN_SHOT) {
    const shots = [];
    for (const [mode, camera] of [
      ['assembled', 'front'],
      ['body', 'front'],
      ['body', 'back'],
      ['exploded', 'front'],
    ]) {
      await page.evaluate(
        ([m, c]) => {
          const v = window.PARP_RECON_TEARDOWN;
          v.setMode(m);
          v.frame(c);
        },
        [mode, camera],
      );
      await frames(page, 3);
      const raw = await page.locator('section').screenshot();
      const tile = await sharp(raw).resize(900, 660, {fit: 'contain', background: '#11170f'}).toBuffer();
      const title = Buffer.from(
        `<svg width="900" height="40"><rect width="900" height="40" fill="#11170f"/><text x="20" y="27" fill="#e6e9dc" font-family="sans-serif" font-size="20">${mode.toUpperCase()} · ${camera.toUpperCase()}</text></svg>`,
      );
      shots.push(
        await sharp({create: {width: 900, height: 700, channels: 3, background: '#11170f'}})
          .composite([
            {input: title, top: 0, left: 0},
            {input: tile, top: 40, left: 0},
          ])
          .png()
          .toBuffer(),
      );
    }
    await sharp({create: {width: 1800, height: 1400, channels: 3, background: '#11170f'}})
      .composite(shots.map((input, i) => ({input, left: (i % 2) * 900, top: Math.floor(i / 2) * 700})))
      .png()
      .toFile(process.env.TEARDOWN_SHOT);
  }
  await page.getByRole('button', {name: 'Exploded', exact: true}).click();
  await page.setViewportSize({width: 390, height: 844});
  await page.getByRole('button', {name: 'Front', exact: true}).click();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.addScriptTag({content: fs.readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8')});
  const violations = await page.evaluate(async () =>
    (await window.axe.run(document, {preload: false, runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa']}})).violations
      .filter(v => ['serious', 'critical'].includes(v.impact))
      .map(v => v.id),
  );
  assert.deepEqual(violations, []);
  assert.deepEqual(
    page.problems.filter(p => !/ERR_ABORTED/.test(p)),
    [],
  );
  console.log(
    'Recon teardown passed: 27 parts, measured alignment, reversible transforms/geometry, isolation, body candidates, keyboard, wireframe, mobile, accessibility.',
  );
} finally {
  await browser.close();
  server.stop();
}
