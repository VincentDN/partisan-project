// Verify the as-is source asset and paired camera/material controls in the Recon comparison view.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {launch, open, startServer} from './browser.mjs';
assert.ok(
  fs
    .readFileSync('inbound/Models/PARP_Recon_hooded_model_v01_05.glb')
    .equals(fs.readFileSync('assets/models/operators/recon-original.glb')),
);
const server = await startServer(8194),
  browser = await launch();
try {
  const page = await open(browser, server.url + 'operator/compare.html', {viewport: {width: 1500, height: 1000}});
  await page.waitForFunction(() => window.PARP_RECON_COMPARE?.ready, null, {timeout: 60000});
  assert.match(await page.locator('#original-stats').innerText(), /193,534/);
  assert.match(await page.locator('#current-stats').innerText(), /14,523/);
  const original = await page.evaluate(() => {
    const {models, stages} = window.PARP_RECON_COMPARE,
      meshes = [];
    models[0].scene.traverse(m => {
      if (m.isMesh) meshes.push(m);
    });
    const box = new stages[0].T.Box3().setFromObject(models[0].scene);
    return {skins: meshes.filter(m => m.isSkinnedMesh).length, width: meshes[0].material.map.image.width, minY: box.min.y, maxY: box.max.y};
  });
  assert.equal(original.skins, 0);
  assert.equal(original.width, 4096);
  assert.ok(Math.abs(original.minY) < 0.01 && Math.abs(original.maxY - 1.85) < 0.01, JSON.stringify(original));
  await page.getByRole('button', {name: 'Face', exact: true}).click();
  await page.locator('#original-stage').focus();
  await page.keyboard.press('ArrowRight');
  const synced = await page.evaluate(() => {
    const [a, b] = window.PARP_RECON_COMPARE.stages;
    return a.camera.position.distanceTo(b.camera.position) < 1e-8 && a.controls.target.distanceTo(b.controls.target) < 1e-8;
  });
  assert.ok(synced, 'orbit from either pane must sync');
  await page.getByRole('button', {name: 'Wireframe', exact: true}).click();
  assert.ok(
    await page.evaluate(() =>
      window.PARP_RECON_COMPARE.models.every(g => {
        let ok = true;
        g.scene.traverse(m => {
          if (m.isMesh && !m.material.wireframe) ok = false;
        });
        return ok;
      }),
    ),
  );
  await page.getByRole('button', {name: 'Wireframe', exact: true}).click();
  await page.locator('#environment').selectOption('studio');
  await page.waitForTimeout(500);
  await page.locator('#environment').selectOption('outdoor');
  await page.getByRole('button', {name: 'Full body', exact: true}).click();
  await page.waitForTimeout(700);
  if (process.env.COMPARISON_SHOT) await page.screenshot({path: process.env.COMPARISON_SHOT, fullPage: true});
  await page.getByRole('button', {name: 'Face', exact: true}).click();
  await page.reload();
  await page.waitForFunction(() => window.PARP_RECON_COMPARE?.ready);
  assert.equal(await page.getByRole('button', {name: 'Face', exact: true}).getAttribute('aria-pressed'), 'true');
  await page.setViewportSize({width: 390, height: 844});
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.deepEqual(
    page.problems.filter(p => !/ERR_ABORTED/.test(p)),
    [],
  );
  await page.addScriptTag({content: fs.readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8')});
  const violations = await page.evaluate(async () =>
    (await window.axe.run(document, {preload: false, runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa']}})).violations
      .filter(v => ['serious', 'critical'].includes(v.impact))
      .map(v => v.id),
  );
  assert.deepEqual(violations, []);
  console.log(
    'Recon comparison passed: unchanged source, decoded 4K texture, alignment, synchronized cameras, view reload, wireframe, mobile and accessibility.',
  );
} finally {
  await browser.close();
  server.stop();
}
