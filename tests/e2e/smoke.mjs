// Browser smoke test: every page loads without errors and its core interaction works.
//   npm run test:e2e                      (starts its own server on :8199)
//   node tests/e2e/smoke.mjs --url https://vincentdn.github.io/partisan-project/     (a live deployment)
//   ROOT=_site node tests/e2e/smoke.mjs   (the built artifact)
import assert from 'node:assert/strict';
import {launch, open, startServer} from './browser.mjs';

import {execFileSync} from 'node:child_process';
const live = process.argv.includes('--url') ? process.argv[process.argv.indexOf('--url') + 1] : null;
// Test what will be deployed: build the allowlisted site and serve that (unless a live URL or ROOT is given).
if (!live && !process.env.ROOT) {
  execFileSync('node', ['tools/build-site.mjs', '_site'], {stdio: 'ignore'});
  process.env.ROOT = '_site';
}
const server = live ? {url: live.replace(/\/?$/, '/'), stop() {}} : await startServer();
const browser = await launch();
const results = [];
async function check(name, fn) {
  try {
    await fn();
    results.push(`ok   ${name}`);
  } catch (e) {
    results.push(`FAIL ${name}: ${e.message}`);
    process.exitCode = 1;
  }
}
const noProblems = page =>
  assert.deepEqual(
    page.problems.filter(p => !/AudioContext|autoplay|ERR_ABORTED/i.test(p)),
    [],
  );

await check('index: the Nokia screen lies on the table, splash, menu, number key navigates', async () => {
  const page = await open(browser, server.url + 'menu/');
  await page.waitForFunction(() => window.PARP_INDEX?.ready && window.PARP_MENU?.ready);
  assert.equal(await page.evaluate(() => window.PARP_MENU.flat ?? false), false, 'WebGL scene is behind the screen');
  assert.match(
    await page.locator('#lcd-frame').evaluate(e => e.style.transform),
    /^matrix3d\(/,
    'LCD is laid on the phone with a projective transform',
  );
  assert.equal(await page.evaluate(() => window.PARP_INDEX.mode), 'splash');
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => window.PARP_INDEX.mode), 'menu');
  assert.equal(await page.locator('.menu a').count(), 10);
  await page.keyboard.press('ArrowDown');
  assert.equal(await page.evaluate(() => window.PARP_INDEX.index), 1);
  await Promise.all([page.waitForURL(/operator\/?$/), page.keyboard.press('2')]);
  noProblems(page);
  await page.close();
});

await check('opening scene: the table, the rifle, four buttons; the shell keeps one sound layer across pages', async () => {
  const page = await open(browser, server.url + 'intro/');
  await page.waitForFunction(() => window.PARP_INTRO?.ready, null, {timeout: 90000});
  const labels = await page.locator('.actions a').allInnerTexts();
  assert.deepEqual(
    labels.map(l => l.replace(/\s+E$/, '').trim().toLowerCase()),
    ['customize this weapon', 'partisan project index', 'read game design doc', 'load advanced animations test'],
  );
  assert.equal(await page.locator('.pbar a[href$="menu/"]').count(), 1, 'top bar has INDEX');
  assert.equal(await page.locator('.pbar a[href$="game-design-master-doc.html"]').count(), 1, 'top bar has DESIGN DOC');
  assert.equal(await page.locator('.pbar #music-toggle').count(), 1, 'music player is in the top bar');
  noProblems(page);
  await page.close();
  // The shell: pages open inside one frame that owns the sound layer, and the address follows the frame.
  const shell = await open(browser, server.url);
  await shell.waitForFunction(() => document.querySelector('#view')?.contentWindow?.PARP_INTRO?.ready, null, {timeout: 90000});
  const same = () =>
    shell.evaluate(() => document.querySelector('#view').contentWindow.parent.parpSound === window.parpSound && !!window.parpSound);
  assert.equal(await same(), true, 'the shell owns the sound layer');
  const frame = shell.frameLocator('#view');
  await frame.locator('.pbar a[href$="menu/"]').click();
  await shell.waitForFunction(() => document.querySelector('#view').contentWindow.location.pathname.endsWith('/menu/'));
  await shell.waitForFunction(() => document.querySelector('#view').contentWindow.PARP_INDEX?.ready);
  assert.equal(await same(), true, 'the same sound layer after navigating');
  await shell.waitForFunction(() => location.search.includes('p=menu'), null, {timeout: 5000});
  await shell.close();
});

await check('operator: loads, equipment toggles, zones are independent, hash round-trips, poses and weapon', async () => {
  const page = await open(browser, server.url + 'operator/');
  await page.waitForFunction(() => window.PARP_OPERATOR?.ready, null, {timeout: 60000});
  const vis = mat => page.evaluate(n => window.PARP_OPERATOR.meshes.filter(m => m.material.name === n).some(m => m.visible), mat);
  assert.equal(await vis('M_Helmet'), true);
  await page.evaluate(() => window.PARP_OPERATOR.set('head', 'bare'));
  assert.equal(await vis('M_Helmet'), false); // shell hidden
  assert.equal(await vis('M_Helmet_Scope'), false); // NVG hidden
  assert.equal(await vis('M_Helmet_Headphone'), true); // headset is its own slot
  await page.evaluate(() => window.PARP_OPERATOR.set('comms', 'off'));
  assert.equal(await vis('M_Helmet_Headphone'), false);
  // regression: top and trousers are separate materials (a dedup bug once fused them)
  await page.evaluate(() => {
    window.PARP_OPERATOR.set('z.top', 'navy');
  });
  const colours = await page.evaluate(() => {
    const g = n => window.PARP_OPERATOR.meshes.find(m => m.material.name === n).material;
    return [g('M_Top_Fabric').color.getHexString(), g('M_Fabric_Bottom').color.getHexString(), !!g('M_Fabric_Bottom').map];
  });
  assert.notEqual(colours[0], colours[1]);
  assert.equal(colours[2], true, 'trousers keep their camo texture');
  assert.match(await page.evaluate(() => location.hash), /head=bare/);
  assert.match(await page.evaluate(() => location.hash), /z\.top=navy/);
  // reload restores
  await page.reload();
  await page.waitForFunction(() => window.PARP_OPERATOR?.ready, null, {timeout: 60000});
  assert.equal(await page.evaluate(() => window.PARP_OPERATOR.state.head), 'bare');
  // roster switching keeps working (reload the same base) and resets looks to the base defaults
  await page.evaluate(() => window.PARP_OPERATOR.switchBase('base'));
  assert.equal(await page.evaluate(() => window.PARP_OPERATOR.state.head), 'nvg');
  assert.equal(await page.locator('#roster button').count(), 4, 'Base, Recon, Insurgent, Enforcer in the roster');
  // pose + weapon prop
  await page.evaluate(() => {
    window.PARP_OPERATOR.set('weapon', 'ak74m');
    window.PARP_OPERATOR.set('pose', 'hero');
  });
  await page.waitForFunction(() => window.PARP_OPERATOR.weapon, null, {timeout: 60000});
  await page.waitForFunction(() => window.PARP_OPERATOR.pivot.visible, null, {timeout: 30000}); // a frame has placed the prop
  const hand = await page.evaluate(() => {
    const o = window.PARP_OPERATOR;
    const h = o.rig.bones.get('hand_r').getWorldPosition(new o.stage.T.Vector3());
    const w = o.pivot.getWorldPosition(new o.stage.T.Vector3());
    return h.distanceTo(w);
  });
  assert.ok(hand < 0.05, `rifle pivot follows the right hand (distance ${hand})`);
  // triangle readout within budget
  const tris = await page.locator('#tris').innerText();
  assert.ok(+tris.replace(/,/g, '') <= 15000, 'triangles ' + tris);
  noProblems(page);
  await page.close();
});

await check('operator: Recon base (extension pack bound to the shared skeleton) loads and responds', async () => {
  const page = await open(browser, server.url + 'operator/#base=recon');
  await page.waitForFunction(() => window.PARP_OPERATOR?.ready, null, {timeout: 60000});
  assert.equal(await page.evaluate(() => window.PARP_OPERATOR.base.id), 'recon');
  const vis = mat => page.evaluate(n => window.PARP_OPERATOR.meshes.filter(m => m.material.name === n).some(m => m.visible), mat);
  assert.equal(await vis('M_Hood'), true);
  assert.equal(await vis('M_Scarf'), true);
  assert.equal(await vis('M_Helmet'), false);
  const bound = await page.evaluate(() => {
    const o = window.PARP_OPERATOR;
    const hood = o.meshes.find(m => m.material.name === 'M_Hood');
    return hood.isSkinnedMesh && hood.skeleton.bones.every(b => o.rig.bones.get(b.name) === b);
  });
  assert.equal(bound, true, 'pack meshes are bound to the base skeleton, not a copy');
  await page.evaluate(() => window.PARP_OPERATOR.set('neck', 'off'));
  assert.equal(await vis('M_Scarf'), false);
  assert.match(await page.evaluate(() => location.hash), /base=recon/);
  await page.evaluate(() => window.PARP_OPERATOR.switchBase('base'));
  assert.equal(await vis('M_Hood'), false);
  noProblems(page);
  await page.close();
});

await check('operator: Insurgent and Enforcer load; plaid paints the shirt torso as well as the sleeves', async () => {
  for (const base of ['insurgent', 'enforcer']) {
    const page = await open(browser, server.url + 'operator/#base=' + base);
    await page.waitForFunction(() => window.PARP_OPERATOR?.ready, null, {timeout: 60000});
    const r = await page.evaluate(() => {
      const o = window.PARP_OPERATOR;
      const tops = o.meshes.filter(m => m.material.name === 'M_Top_Fabric');
      return {
        n: tops.length,
        shared: tops.every(m => m.material === tops[0].material),
        hasUV: tops.every(m => !!m.geometry.attributes.uv),
        beanie: o.meshes.some(m => m.material.name === 'M_Beanie' && m.visible),
      };
    });
    assert.ok(r.n >= 2 && r.shared && r.hasUV, `${base}: torso shirt shares the top material and has UVs ${JSON.stringify(r)}`);
    assert.equal(r.beanie, true, `${base}: beanie visible by default`);
    noProblems(page);
    await page.close();
  }
});

await check('operator: the share card downloads a PNG with the carried weapon', async () => {
  const page = await open(browser, server.url + 'operator/');
  await page.waitForSelector('#slots .slot', {timeout: 60000});
  await page.evaluate(() => window.PARP_OPERATOR.set('weapon', 'ak74m'));
  await page.waitForFunction(() => window.PARP_OPERATOR.weapon, null, {timeout: 60000});
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#card').click()]);
  assert.match(download.suggestedFilename(), /^parp-.*-card\.png$/);
  if (process.env.CARD_OUT) await download.saveAs(process.env.CARD_OUT);
  noProblems(page);
  await page.close();
});

await check('operator: idle animation moves bones; reduced motion freezes them', async () => {
  const page = await open(browser, server.url + 'operator/#idle=alert', {reducedMotion: 'no-preference'});
  await page.waitForFunction(() => window.PARP_OPERATOR?.ready, null, {timeout: 60000});
  const head = () => page.evaluate(() => window.PARP_OPERATOR.rig.bones.get('head').quaternion.toArray());
  const a = await head();
  await page.waitForTimeout(1500);
  const b = await head();
  assert.ok(
    a.some((v, i) => Math.abs(v - b[i]) > 1e-5),
    'head moved with idle',
  );
  await page.close();
  const still = await open(browser, server.url + 'operator/#idle=alert', {reducedMotion: 'reduce'});
  await still.waitForFunction(() => window.PARP_OPERATOR?.ready, null, {timeout: 60000});
  const c = await still.evaluate(() => window.PARP_OPERATOR.rig.bones.get('head').quaternion.toArray());
  await still.waitForTimeout(1200);
  const d = await still.evaluate(() => window.PARP_OPERATOR.rig.bones.get('head').quaternion.toArray());
  assert.deepEqual(c, d);
  await still.close();
});

await check('operator: carries the Workbench build (P1 code) onto the character', async () => {
  const page = await open(browser, server.url + 'operator/');
  await page.waitForFunction(() => window.PARP_OPERATOR?.ready, null, {timeout: 60000});
  await page.evaluate(() => localStorage.setItem('parp-loadout', 'rifle=ak15k&muzzle=brake&optic=scope@-20&stock-finish=fde&wear=40'));
  await page.evaluate(() => window.PARP_OPERATOR.set('weapon', 'bench'));
  await page.waitForFunction(() => window.PARP_OPERATOR.weapon, null, {timeout: 60000});
  const r = await page.evaluate(() => {
    const w = window.PARP_OPERATOR.weapon;
    return {rifle: w.rifle.id, muzzle: w.rifle.build.muzzle, optic: w.rifle.build.optic, stock: w.rifle.finish.stock, hash: location.hash};
  });
  assert.deepEqual([r.rifle, r.muzzle, r.optic, r.stock], ['ak15k', 'brake', 'scope', 'fde']);
  assert.match(r.hash, /weapon=bench&build=P1\./, 'the link is self-contained: it carries the code');
  // the link works in a fresh browser profile with no stored build
  const other = await open(browser, server.url + 'operator/' + r.hash);
  await other.waitForFunction(() => window.PARP_OPERATOR?.weapon, null, {timeout: 60000});
  assert.equal(await other.evaluate(() => window.PARP_OPERATOR.weapon.rifle.build.muzzle), 'brake');
  await other.close();
  await page.close();
});

await check('operator and viewer: the 3D stage is operable by keyboard (arrows orbit, +/- zoom)', async () => {
  for (const [path, ready] of [
    ['operator/', () => window.PARP_OPERATOR?.ready],
    ['viewer/', () => window.PARP_VIEWER?.ready],
  ]) {
    const page = await open(browser, server.url + path);
    await page.waitForFunction(ready, null, {timeout: 60000});
    await page.focus('#stage');
    const probe = await page.evaluate(() => ({operator: !!window.PARP_OPERATOR}));
    if (probe.operator) {
      const read = () => page.evaluate(() => window.PARP_OPERATOR.stage.camera.position.toArray());
      const a = await read();
      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('+');
      const b = await read();
      assert.ok(
        a.some((v, i) => Math.abs(v - b[i]) > 0.01),
        'camera moved on arrow key',
      );
    } else assert.equal(await page.evaluate(() => document.querySelector('#stage').getAttribute('tabindex')), '0');
    await page.close();
  }
});

await check('operator: eyelids exist (hidden until a blink) and the head follows the camera', async () => {
  const page = await open(browser, server.url + 'operator/#idle=off', {reducedMotion: 'no-preference'});
  await page.waitForFunction(() => window.PARP_OPERATOR?.ready, null, {timeout: 60000});
  const lids = await page.evaluate(() =>
    window.PARP_OPERATOR.meshes.filter(m => window.PARP_OPERATOR.meshPart.get(m) === 'lids').map(m => m.visible),
  );
  assert.deepEqual(lids, [false], 'one eyelid mesh, hidden');
  await page.evaluate(() => {
    const {camera, controls} = window.PARP_OPERATOR.stage;
    controls.target.set(0, 1.5, 0);
    camera.position.set(3, 1.5, 1.2);
    controls.update();
  });
  await page.waitForFunction(() => Math.abs(window.PARP_OPERATOR.look.yaw) > 15, null, {timeout: 20000});
  const yaw = await page.evaluate(() => window.PARP_OPERATOR.look.yaw);
  assert.ok(yaw > 15 && yaw <= 40, `camera on the character's left turns the head left (+): ${yaw}`);
  await page.close();
});

await check('workbench: the guided tour steps through, is remembered, and the stats panel renders', async () => {
  const page = await open(browser, server.url + 'workbench/');
  await page.waitForSelector('#build .slot', {timeout: 60000});
  await page.waitForSelector('#stats .bar', {timeout: 10000});
  assert.equal(
    await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()),
    '#ef8f39',
    'shared/tokens.css loaded through panel-ui.css',
  );
  assert.equal(await page.locator('#first-run').isVisible(), true, 'tour shows on first visit');
  assert.match(await page.locator('#first-run').innerText(), /1 \/ 3/);
  await page.locator('#first-run button', {hasText: 'Next'}).click();
  assert.equal(await page.locator('.tour-lit').count(), 1);
  await page.locator('#first-run button', {hasText: 'Skip tour'}).click();
  assert.equal(await page.locator('#first-run').isVisible(), false);
  assert.equal(await page.evaluate(() => localStorage.getItem('parp-tour-workbench')), '1');
  noProblems(page);
  await page.close();
});

await check('bench: Skip fits the part, Cancel before the commit changes nothing, reduced motion is instant', async () => {
  const page = await open(browser, server.url + 'bench/', {reducedMotion: 'no-preference'});
  await page.waitForFunction(() => window.PARP_BENCH?.ready, null, {timeout: 90000});
  await page.evaluate(() => (document.querySelector('#first-run').hidden = true));
  const optic = () => page.evaluate(() => window.PARP_BENCH.rifle.build.optic);
  const before = await optic();
  // A frozen clock keeps the task before its commit however slow the software renderer is.
  await page.evaluate(() => (window.PARP_BENCH.actions.now = () => 0));
  await page.evaluate(() => window.PARP_BENCH.change('optic', 'scope'));
  assert.equal(await page.evaluate(() => window.PARP_BENCH.actions.busy), true);
  assert.equal(await page.locator('#skip').isEnabled(), true);
  await page.locator('#cancel').click();
  assert.equal(await optic(), before, 'cancel before the commit leaves the build alone');
  assert.equal(await page.evaluate(() => window.PARP_BENCH.ghosts), null, 'presentation copies are removed');
  await page.evaluate(() => window.PARP_BENCH.change('optic', 'scope'));
  await page.locator('#skip').click();
  assert.equal(await optic(), 'scope');
  assert.match(await page.evaluate(() => location.hash), /optic=scope/);
  assert.equal(await page.evaluate(() => window.PARP_BENCH.rifle.slots.optic.container.visible), true);
  noProblems(page);
  await page.close();
  const instant = await open(browser, server.url + 'bench/');
  await instant.waitForFunction(() => window.PARP_BENCH?.ready, null, {timeout: 90000});
  await instant.evaluate(() => window.PARP_BENCH.change('muzzle', 'comp'));
  assert.equal(await instant.evaluate(() => window.PARP_BENCH.actions.busy), false);
  assert.equal(await instant.evaluate(() => window.PARP_BENCH.rifle.build.muzzle), 'comp');
  await instant.close();
});

await check('workbench sounds: the recorded foley bank loads after the first handling sound', async () => {
  const page = await open(browser, server.url + 'workbench/');
  await page.waitForSelector('#build .slot', {timeout: 60000});
  const loaded = await page.evaluate(async () => {
    const m = await import('../workbench/mech.js');
    m.latch();
    for (let i = 0; i < 100 && !m.foleyLoaded(); i++) await new Promise(r => setTimeout(r, 100));
    return m.foleyLoaded();
  });
  assert.equal(loaded, true);
  noProblems(page);
  await page.close();
});

await check('workbench: loads, swapping a part writes the hash, both rifles load', async () => {
  const page = await open(browser, server.url + 'workbench/');
  await page.waitForSelector('#build .slot', {timeout: 60000});
  await page.locator('#build .chips button', {hasText: 'Compensator'}).first().click();
  assert.match(await page.evaluate(() => location.hash), /muzzle=comp/);
  assert.match(
    await page.evaluate(() => localStorage.getItem('parp-loadout')),
    /muzzle=comp/,
    'the Workbench publishes its build for the Operator Customiser',
  );
  // rails: a back-up sight and a 4x scope share the top rail, so fitting the scope slides the sight forward
  await page.locator('#build .chips button', {hasText: 'Flip-up sight'}).click();
  await page.locator('#build .chips button', {hasText: '4× scope'}).click();
  const hash = await page.evaluate(() => location.hash);
  assert.match(hash, /optic=scope/);
  assert.match(hash, /buis=flip@(\d+)/);
  assert.ok(+hash.match(/buis=flip@(\d+)/)[1] >= 40, 'back-up sight pushed at least 40 mm forward: ' + hash);
  await page.locator('[data-rifle="ak15k"]').click();
  await page.waitForFunction(() => document.querySelector('#title').textContent.includes('AK-15K'), null, {timeout: 60000});
  assert.equal(await page.locator('.fire').count(), 0, 'no test-fire control remains');
  assert.equal(await page.locator('#copy-code').count(), 1);
  noProblems(page);
  await page.close();
});

await check('viewer: lists registered models and reports triangles and licence', async () => {
  const page = await open(browser, server.url + 'viewer/');
  await page.waitForFunction(() => window.PARP_VIEWER?.ready, null, {timeout: 60000});
  const report = await page.locator('#report').innerText();
  assert.match(report, /Triangles/);
  assert.match(report, /Licence/);
  assert.ok((await page.locator('#models button').count()) >= 3);
  noProblems(page);
  await page.close();
});

await check('design doc: sections, live progress and credits render', async () => {
  const page = await open(browser, server.url + 'docs/game-design-master-doc.html');
  await page.waitForFunction(() => document.querySelectorAll('#milestones .ms').length >= 4, null, {timeout: 15000});
  assert.ok((await page.locator('#credit-rows tr').count()) >= 4);
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

await browser.close();
server.stop();
console.log(results.join('\n'));
console.log(process.exitCode ? '\nSMOKE FAILED' : '\nsmoke ok');
