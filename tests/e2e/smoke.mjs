// Browser smoke test: every page loads without errors and its core interaction works.
//   npm run test:e2e                      (starts its own server on :8199)
//   node tests/e2e/smoke.mjs --url https://vincentdn.github.io/partisan-project/     (a live deployment)
//   ROOT=_site node tests/e2e/smoke.mjs   (the built artifact)
import assert from 'node:assert/strict';
import {launch, open, startServer} from './browser.mjs';

import {execFileSync} from 'node:child_process';
const live = process.argv.includes('--url') ? process.argv[process.argv.indexOf('--url') + 1] : null;
// Test what will be deployed: build the allowlisted site and serve that (unless a live URL or ROOT is given).
if (!live && !process.env.ROOT) { execFileSync('node', ['tools/build-site.mjs', '_site'], {stdio: 'ignore'}); process.env.ROOT = '_site'; }
const server = live ? {url: live.replace(/\/?$/, '/'), stop() {}} : await startServer();
const browser = await launch();
const results = [];
async function check(name, fn) {
  try { await fn(); results.push(`ok   ${name}`); }
  catch (e) { results.push(`FAIL ${name}: ${e.message}`); process.exitCode = 1; }
}
const noProblems = page => assert.deepEqual(page.problems.filter(p => !/AudioContext|autoplay|ERR_ABORTED/i.test(p)), []);

await check('index: splash, menu, number key navigates', async () => {
  const page = await open(browser, server.url);
  await page.waitForFunction(() => window.PARP_INDEX?.ready);
  assert.equal(await page.evaluate(() => window.PARP_INDEX.mode), 'splash');
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => window.PARP_INDEX.mode), 'menu');
  assert.equal(await page.locator('.menu a').count(), 9);
  await page.keyboard.press('ArrowDown');
  assert.equal(await page.evaluate(() => window.PARP_INDEX.index), 1);
  await Promise.all([page.waitForURL(/operator\/?$/), page.keyboard.press('2')]);
  noProblems(page);
  await page.close();
});

await check('operator: loads, equipment toggles, zones are independent, hash round-trips, poses and weapon', async () => {
  const page = await open(browser, server.url + 'operator/');
  await page.waitForFunction(() => window.PARP_OPERATOR?.ready, null, {timeout: 60000});
  const vis = mat => page.evaluate(n => window.PARP_OPERATOR.meshes.filter(m => m.material.name === n).some(m => m.visible), mat);
  assert.equal(await vis('M_Helmet'), true);
  await page.evaluate(() => window.PARP_OPERATOR.set('head', 'bare'));
  assert.equal(await vis('M_Helmet'), false);          // shell hidden
  assert.equal(await vis('M_Helmet_Scope'), false);    // NVG hidden
  assert.equal(await vis('M_Helmet_Headphone'), true); // headset is its own slot
  await page.evaluate(() => window.PARP_OPERATOR.set('comms', 'off'));
  assert.equal(await vis('M_Helmet_Headphone'), false);
  // regression: top and trousers are separate materials (a dedup bug once fused them)
  await page.evaluate(() => { window.PARP_OPERATOR.set('z.top', 'navy'); });
  const colours = await page.evaluate(() => { const g = n => window.PARP_OPERATOR.meshes.find(m => m.material.name === n).material; return [g('M_Top_Fabric').color.getHexString(), g('M_Fabric_Bottom').color.getHexString(), !!g('M_Fabric_Bottom').map]; });
  assert.notEqual(colours[0], colours[1]); assert.equal(colours[2], true, 'trousers keep their camo texture');
  assert.match(await page.evaluate(() => location.hash), /head=bare/);
  assert.match(await page.evaluate(() => location.hash), /z\.top=navy/);
  // reload restores
  await page.reload(); await page.waitForFunction(() => window.PARP_OPERATOR?.ready, null, {timeout: 60000});
  assert.equal(await page.evaluate(() => window.PARP_OPERATOR.state.head), 'bare');
  // pose + weapon prop
  await page.evaluate(() => { window.PARP_OPERATOR.set('weapon', 'ak74m'); window.PARP_OPERATOR.set('pose', 'hero'); });
  await page.waitForFunction(() => window.PARP_OPERATOR.weapon, null, {timeout: 60000});
  await page.waitForTimeout(400);
  const hand = await page.evaluate(() => { const o = window.PARP_OPERATOR; const h = o.rig.bones.get('hand_r').getWorldPosition(new o.stage.T.Vector3()); const w = o.pivot.getWorldPosition(new o.stage.T.Vector3()); return h.distanceTo(w); });
  assert.ok(hand < 0.05, `rifle pivot follows the right hand (distance ${hand})`);
  // triangle readout within budget
  const tris = await page.locator('#tris').innerText();
  assert.ok(+tris.replace(/,/g, '') <= 15000, 'triangles ' + tris);
  noProblems(page);
  await page.close();
});

await check('operator: idle animation moves bones; reduced motion freezes them', async () => {
  const page = await open(browser, server.url + 'operator/#idle=alert', {reducedMotion: 'no-preference'});
  await page.waitForFunction(() => window.PARP_OPERATOR?.ready, null, {timeout: 60000});
  const head = () => page.evaluate(() => window.PARP_OPERATOR.rig.bones.get('head').quaternion.toArray());
  const a = await head(); await page.waitForTimeout(1500); const b = await head();
  assert.ok(a.some((v, i) => Math.abs(v - b[i]) > 1e-5), 'head moved with idle');
  await page.close();
  const still = await open(browser, server.url + 'operator/#idle=alert', {reducedMotion: 'reduce'});
  await still.waitForFunction(() => window.PARP_OPERATOR?.ready, null, {timeout: 60000});
  const c = await still.evaluate(() => window.PARP_OPERATOR.rig.bones.get('head').quaternion.toArray()); await still.waitForTimeout(1200);
  const d = await still.evaluate(() => window.PARP_OPERATOR.rig.bones.get('head').quaternion.toArray());
  assert.deepEqual(c, d); await still.close();
});

await check('workbench: loads, swapping a part writes the hash, both rifles load', async () => {
  const page = await open(browser, server.url + 'workbench/');
  await page.waitForSelector('#build .slot', {timeout: 60000});
  await page.locator('#build .chips button', {hasText: 'Compensator'}).first().click();
  assert.match(await page.evaluate(() => location.hash), /muzzle=comp/);
  await page.locator('[data-rifle="ak15k"]').click();
  await page.waitForFunction(() => document.querySelector('#title').textContent.includes('AK-15K'), null, {timeout: 60000});
  assert.equal(await page.locator('.fire').count(), 0, 'no test-fire control remains');
  noProblems(page);
  await page.close();
});

await check('viewer: lists registered models and reports triangles and licence', async () => {
  const page = await open(browser, server.url + 'viewer/');
  await page.waitForFunction(() => window.PARP_VIEWER?.ready, null, {timeout: 60000});
  const report = await page.locator('#report').innerText();
  assert.match(report, /Triangles/); assert.match(report, /Licence/);
  assert.ok(await page.locator('#models button').count() >= 3);
  noProblems(page);
  await page.close();
});

await check('design doc: sections, live progress and credits render', async () => {
  const page = await open(browser, server.url + 'docs/game-design-master-doc.html');
  await page.waitForFunction(() => document.querySelectorAll('#milestones .ms').length >= 4, null, {timeout: 15000});
  assert.ok(await page.locator('#credit-rows tr').count() >= 4);
  await page.click('#signal');
  await page.waitForSelector('.frame canvas', {timeout: 15000});
  noProblems(page);
  await page.close();
});

await check('roadmap page renders (built site only)', async () => {
  const res = await fetch(server.url + 'docs/master-roadmap.html');
  if (res.status === 404 && !live && !process.env.ROOT) return; // source tree has the .md only
  assert.equal(res.status, 200);
  assert.match(await res.text(), /PARP master roadmap/);
});

await browser.close(); server.stop();
console.log(results.join('\n'));
console.log(process.exitCode ? '\nSMOKE FAILED' : '\nsmoke ok');
