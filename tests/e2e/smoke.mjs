// Browser smoke test: every page loads without errors and its core interaction works.
//   npm run test:e2e                      (starts its own server on :8199)
//   node tests/e2e/smoke.mjs --url https://vincentdn.github.io/partisan-project/     (a live deployment)
//   ROOT=_site node tests/e2e/smoke.mjs   (the built artifact)
import assert from 'node:assert/strict';
import {launch, open, startServer} from './browser.mjs';
import {checkSquadControl} from './squad-control.mjs';

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
  } finally {
    // A failed check leaves its page rendering; in SwiftShader that starves every later page, so close them all.
    for (const p of browser.openPages?.splice(0) || []) if (!p.isClosed()) await p.close().catch(() => {});
  }
}
const noProblems = page =>
  assert.deepEqual(
    page.problems.filter(p => !/AudioContext|autoplay|ERR_ABORTED/i.test(p)),
    [],
  );

await check('index: the Nokia screen lies on the table and opens straight on the menu; number keys navigate', async () => {
  const page = await open(browser, server.url + 'menu/');
  await page.waitForFunction(() => window.PARP_INDEX?.ready && window.PARP_MENU?.ready);
  assert.equal(await page.evaluate(() => window.PARP_MENU.flat ?? false), false, 'WebGL scene is behind the screen');
  assert.match(
    await page.locator('#lcd-frame').evaluate(e => e.style.transform),
    /^matrix3d\(/,
    'LCD is laid on the phone with a projective transform',
  );
  assert.equal(await page.evaluate(() => window.PARP_INDEX.mode), 'menu', 'no splash screen');
  await page.evaluate(() => localStorage.removeItem('parp-devtools'));
  await page.reload();
  await page.waitForFunction(() => window.PARP_INDEX?.ready && window.PARP_MENU?.ready);
  const rows = await page.locator('.menu a').allInnerTexts();
  assert.equal(rows.length, 9, 'five demos, the locked dev tools, sound, about, projects');
  assert.match(rows[0], /Weapon Modder/i);
  assert.match(rows[1], /Operator Modder/i);
  assert.match(rows[2], /Top-down Shooter Tests/i);
  assert.match(rows[3], /Rebel Band/i);
  assert.match(rows[4], /Overworld Map/i);
  assert.match(rows[5], /Dev tools - tap to unlock/i);
  await page.keyboard.press('ArrowDown');
  assert.equal(await page.evaluate(() => window.PARP_INDEX.index), 1);
  // the first press folds open the explainer with a dithered preview and a big LAUNCH button
  await page.keyboard.press('3');
  assert.equal(await page.evaluate(() => window.PARP_INDEX.open), 2, 'explainer open');
  await page.waitForTimeout(400);
  const ink = await page.locator('#fold-2 canvas').evaluate(c => {
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let dark = 0;
    for (let i = 0; i < d.length; i += 4) dark += d[i] < 60;
    return dark / (d.length / 4);
  });
  assert.ok(ink > 0.05 && ink < 0.95, `the preview draws (${ink.toFixed(2)} ink)`);
  assert.equal(await page.locator('.menu a[data-i="2"]').getAttribute('aria-expanded'), 'true');
  assert.match(await page.locator('#fold-2 .launch').innerText(), /LAUNCH DEMO/);
  // tapping anything else folds it down: the explainer itself, the item, another item moves it
  await page.locator('#fold-2 p').click();
  assert.equal(await page.evaluate(() => window.PARP_INDEX.open), -1, 'a tap on the explainer folds it');
  await page.locator('.menu a[data-i="3"]').click();
  assert.equal(await page.evaluate(() => window.PARP_INDEX.open), 3);
  await page.locator('.menu a[data-i="3"]').click();
  assert.equal(await page.evaluate(() => window.PARP_INDEX.open), -1, 'a second tap on the item folds it');
  await page.keyboard.press('3');
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => window.PARP_INDEX.open), -1, 'Escape folds it shut');
  // dev tools: seven taps unlock the folder, which then shows its tools
  for (let i = 0; i < 6; i++) await page.locator('.menu a[data-i="5"]').click();
  assert.match(await page.locator('.menu a[data-i="5"]').innerText(), /tap to unlock/i, 'no countdown on screen: the pings climb');
  assert.doesNotMatch(await page.locator('#help').innerText(), /\d+ more tap/i);
  assert.equal(await page.evaluate(() => window.PARP_INDEX.devUnlocked), false);
  await page.locator('.menu a[data-i="5"]').click();
  assert.equal(await page.evaluate(() => window.PARP_INDEX.devUnlocked), true);
  const dev = await page.evaluate(() => window.PARP_INDEX.rows);
  for (const name of ['Equipment Wiki', 'Asset Viewer', 'Game Design Doc', 'Moodboard', 'Advanced animations'])
    assert.ok(dev.includes(name), name);
  assert.equal(await page.evaluate(() => localStorage.getItem('parp-devtools')), 'unlocked');
  await page.locator('.menu a[data-i="5"]').click();
  assert.equal(await page.locator('.menu a').count(), 9, 'a tap folds the tools away again');
  // LAUNCH opens the demo
  await page.locator('.menu a[data-i="1"]').click();
  await Promise.all([page.waitForURL(/operator\/?$/), page.locator('#fold-1 .launch').click()]);
  await page.evaluate(() => localStorage.removeItem('parp-devtools'));
  noProblems(page);
  await page.close();
});

await check('opening scene: the table, the rifle, one button; the shell keeps one sound layer across pages', async () => {
  const page = await open(browser, server.url + 'intro/');
  await page.waitForFunction(
    () => {
      const b = document.querySelector('#start');
      return !!b && !b.disabled;
    },
    null,
    {timeout: 90000},
  );
  const labels = await page.locator('#start').allInnerTexts();
  assert.equal(await page.locator('.prompt a, .prompt button').count(), 1, 'one action on the scene');
  assert.deepEqual(
    labels.map(l => l.replace(/\s*E$/, '').trim().toLowerCase()),
    ['load all demos'],
    'the orange button is the only action; the rest is in the top bar',
  );
  assert.equal(await page.locator('.pbar a[href$="menu/"]').count(), 1, 'top bar has INDEX');
  assert.equal(await page.locator('.pbar a[href$="game-design-master-doc.html"]').count(), 1, 'top bar has GAME DESIGN DOC');
  assert.equal(await page.locator('.pbar a.brand[title="Return to home"]').count(), 1, 'lambda mark returns home');
  assert.equal(await page.locator('.pbar > a:not(.brand)').count(), 2, 'top bar has only INDEX and GAME DESIGN DOC');
  assert.equal(await page.locator('#music-player').isHidden(), true, 'the player is a drop-down');
  await page.locator('#music-menu').click();
  assert.equal(await page.locator('#music-player').isVisible(), true);
  assert.equal(await page.locator('.pbar #music-toggle').count(), 1, 'music player is in the top bar');
  noProblems(page);
  await page.close();
  // The shell: pages open inside one frame that owns the sound layer, and the address follows the frame.
  const shell = await open(browser, server.url);
  await shell.waitForFunction(
    () => {
      const b = document.querySelector('#view')?.contentDocument?.querySelector('#start');
      return !!b && !b.disabled;
    },
    null,
    {timeout: 90000},
  );
  const same = () =>
    shell.evaluate(() => document.querySelector('#view').contentWindow.parent.parpSound === window.parpSound && !!window.parpSound);
  assert.equal(await same(), true, 'the shell owns the sound layer');
  const frame = shell.frameLocator('#view');
  await frame.locator('.pbar a[href$="menu/"]').click();
  await shell.waitForFunction(() => document.querySelector('#view').contentWindow.location.pathname.endsWith('/menu/'), null, {
    timeout: 90000,
  });
  await shell.waitForFunction(() => document.querySelector('#view').contentWindow.PARP_INDEX?.ready, null, {timeout: 90000});
  assert.equal(await same(), true, 'the same sound layer after navigating');
  await shell.waitForFunction(() => location.search.includes('p=menu'), null, {timeout: 5000});
  await shell.close();
});

await check('operator: loads, equipment toggles, zones are independent, hash round-trips, poses and weapon', async () => {
  const page = await open(browser, server.url + 'operator/#base=base');
  await page.waitForFunction(() => window.PARP_OPERATOR?.ready, null, {timeout: 60000});
  // the Bannerlord layout: the stash on the left, the operator in the warehouse, the kit on the right
  await page.waitForFunction(() => document.querySelectorAll('#stash tbody tr').length >= 10, null, {timeout: 20000});
  assert.equal(await page.evaluate(() => window.PARP_OPERATOR.warehouse.enabled), true, 'the warehouse is the default room');
  // the crew in the background (three insurgents, one with a rifle in hand) and the depth of field on the room
  await page.waitForFunction(() => window.PARP_OPERATOR.crew?.figures.length === 3, null, {timeout: 60000});
  assert.equal(await page.evaluate(() => window.PARP_OPERATOR.dof.on), true, 'the background is out of focus');
  // the dirty lens: looking up past the operator toward the rim light, the light is picked up as a flare source
  const flares = await page.evaluate(async () => {
    const o = window.PARP_OPERATOR,
      {camera, controls} = o.stage;
    camera.position.set(-0.4, 0.9, 2.2);
    controls.target.set(-1.2, 2.4, -3);
    controls.update();
    o.stage.wake(2000);
    await new Promise(r => setTimeout(r, 600));
    return o.dof.uniforms.uFlareCount.value;
  });
  assert.ok(flares >= 1, `lens flare sources in view: ${flares}`);
  const crewInfo = await page.evaluate(() => {
    const o = window.PARP_OPERATOR,
      V = o.stage.T.Vector3;
    const inspector = o.crew.figures.find(f => f.def.id === 'inspector');
    return {
      poses: o.crew.figures.map(f => f.rig.poseId).sort(),
      handOnRifle: inspector.rig.bones.get('hand_r').getWorldPosition(new V()).distanceTo(inspector.holder.getWorldPosition(new V())),
    };
  });
  assert.deepEqual(crewInfo.poses, ['inspect', 'rummage', 'sit']);
  assert.ok(crewInfo.handOnRifle < 0.2, `the inspector holds his rifle (${crewInfo.handOnRifle.toFixed(2)} m)`);
  const firstName = await page.locator('#stash tbody tr .nm').first().innerText();
  await page.locator('#stash th[data-sort="value"] button').click();
  assert.equal(await page.locator('#stash th[data-sort="value"]').getAttribute('aria-sort'), 'ascending');
  await page.locator('[data-env="studio"]').click();
  assert.equal(await page.evaluate(() => window.PARP_OPERATOR.warehouse.enabled), false, 'an HDR lighting swaps the room out');
  assert.equal(await page.evaluate(() => window.PARP_OPERATOR.dof.on), false, 'and the depth of field with it');
  await page.locator('#room').click();
  assert.equal(await page.evaluate(() => window.PARP_OPERATOR.warehouse.enabled), true);
  assert.ok(firstName.length > 2);
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
    window.PARP_OPERATOR.set('z.pants', 'original');
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
  await page.reload({waitUntil: 'domcontentloaded'}); // ready is awaited below; the load event can trail on a slow runner
  await page.waitForFunction(() => window.PARP_OPERATOR?.ready, null, {timeout: 60000});
  assert.equal(await page.evaluate(() => window.PARP_OPERATOR.state.head), 'bare');
  // roster switching keeps working (reload the same base) and resets looks to the base defaults
  await page.evaluate(() => window.PARP_OPERATOR.switchBase('base'));
  assert.equal(await page.evaluate(() => window.PARP_OPERATOR.state.head), 'nvg');
  assert.equal(
    await page.locator('#roster button').count(),
    5,
    'Recon, clothing foundation, Base, Insurgent and Enforcer in the roster (the old Recon is deprecated)',
  );
  // pose + weapon prop
  await page.evaluate(() => {
    window.PARP_OPERATOR.set('weapon', 'ak74m');
    window.PARP_OPERATOR.set('pose', 'hero');
  });
  await page.waitForFunction(() => window.PARP_OPERATOR.weapon, null, {timeout: 60000});
  await page.waitForFunction(() => window.PARP_OPERATOR.pivot.visible, null, {timeout: 30000}); // a frame has placed the prop
  // The hands are solved onto the rifle (operator/grip.js): once the rifle has eased into place, each palm closes on its grip point.
  const reach = async (pose, sides) => {
    await page.evaluate(pose => window.PARP_OPERATOR.set('pose', pose), pose);
    const handle = await page
      .waitForFunction(
        sides => {
          const o = window.PARP_OPERATOR,
            V = o.stage.T.Vector3;
          o.stage.wake();
          const gripAt = {r: [-0.028, -0.058, 0], l: [0.3, 0.008, 0]};
          const d = sides.map(side => {
            const h = o.rig.bones.get('hand_' + side);
            const palm = h
              .getWorldPosition(new V())
              .add(new V(0, 0.072, 0.028).applyQuaternion(h.getWorldQuaternion(new o.stage.T.Quaternion())));
            return palm.distanceTo(o.pivot.localToWorld(new V(...gripAt[side])));
          });
          return d.every(x => x < 0.02) && d;
        },
        sides,
        {timeout: 20000, polling: 250},
      )
      .catch(() => null);
    return handle ? handle.jsonValue() : null;
  };
  assert.ok(await reach('hero', ['r']), 'hero: the right palm closes on the pistol grip');
  assert.ok(await reach('ready', ['r', 'l']), 'low ready: both palms on the rifle');
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
  const page = await open(browser, server.url + 'operator/#base=base');
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
  const page = await open(browser, server.url + 'operator/#base=base&idle=alert', {reducedMotion: 'no-preference'});
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
  const still = await open(browser, server.url + 'operator/#base=base&idle=alert', {reducedMotion: 'reduce'});
  await still.waitForFunction(() => window.PARP_OPERATOR?.ready, null, {timeout: 60000});
  const c = await still.evaluate(() => window.PARP_OPERATOR.rig.bones.get('head').quaternion.toArray());
  await still.waitForTimeout(1200);
  const d = await still.evaluate(() => window.PARP_OPERATOR.rig.bones.get('head').quaternion.toArray());
  assert.deepEqual(c, d);
  await still.close();
});

await check('operator: carries the Workbench build (P1 code) onto the character', async () => {
  const page = await open(browser, server.url + 'operator/#base=base');
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
  await page.close(); // one 3D page at a time: the warehouse crew and depth of field are heavy for a software renderer
  // the link works in a fresh browser profile with no stored build
  const other = await open(browser, server.url + 'operator/' + r.hash);
  await other.waitForFunction(() => window.PARP_OPERATOR?.weapon, null, {timeout: 90000});
  assert.equal(await other.evaluate(() => window.PARP_OPERATOR.weapon.rifle.build.muzzle), 'brake');
  await other.close();
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
  const page = await open(browser, server.url + 'operator/#base=base&idle=off', {reducedMotion: 'no-preference'});
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

await check('workbench: no onboarding tour (deprecated), and the stats panel renders', async () => {
  const page = await open(browser, server.url + 'workbench/');
  await page.waitForSelector('#build .slot', {timeout: 60000});
  await page.waitForSelector('#stats .bar', {timeout: 10000});
  assert.equal(
    await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()),
    '#ef8f39',
    'shared/tokens.css loaded through panel-ui.css',
  );
  assert.equal(await page.locator('#first-run, .tour-lit').count(), 0, 'the onboarding tour is gone');
  noProblems(page);
  await page.close();
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
  // the warehouse backdrop is a baked panorama that stays put; Backdrop swaps in the HDR sky, Warehouse brings it back
  await page.waitForFunction(
    () => window.PARP_WORKBENCH.room.texture && window.PARP_WORKBENCH.stage.scene.background === window.PARP_WORKBENCH.room.texture,
    null,
    {timeout: 30000},
  );
  await page.locator('#backdrop').click();
  assert.equal(await page.evaluate(() => window.PARP_WORKBENCH.room.on), false);
  await page.locator('#room').click();
  await page.waitForFunction(() => window.PARP_WORKBENCH.stage.scene.background === window.PARP_WORKBENCH.room.texture, null, {
    timeout: 10000,
  });
  // the room's sound: recorded beds start, and a radio call plays (squelch, call, squelch) on demand
  await page.evaluate(() => window.PARP_WORKBENCH.ambience.trigger('radio'));
  await page.waitForFunction(
    () => window.PARP_WORKBENCH.ambience.stats.beds >= 3 && window.PARP_WORKBENCH.ambience.stats.loaded >= 5,
    null,
    {
      timeout: 30000,
    },
  );
  assert.equal(await page.evaluate(() => window.PARP_WORKBENCH.ambience.stats.played.radio), 1);
  // the retro MCX: every surface carries a nearest-filtered bitmap; an old rifle takes a modern grip and light
  await page.locator('[data-rifle="spear-retro"]').click();
  await page.waitForFunction(() => window.PARP_WORKBENCH.rifle?.id === 'spear-retro', null, {timeout: 60000});
  const retro = await page.evaluate(() => {
    const maps = [];
    window.PARP_WORKBENCH.rifle.model.traverseVisible(o => o.isMesh && maps.push(o.material.map?.magFilter));
    return {meshes: maps.length, nearest: maps.filter(f => f === 1003).length};
  });
  assert.ok(retro.meshes > 5 && retro.nearest === retro.meshes, JSON.stringify(retro));
  await page.locator('[data-rifle="stg44"]').click();
  await page.waitForFunction(() => window.PARP_WORKBENCH.rifle?.id === 'stg44', null, {timeout: 60000});
  await page.locator('#build .chips button', {hasText: 'Vertical'}).first().click();
  assert.match(await page.evaluate(() => location.hash), /foregrip=vertical/);
  // the Modern RPK preset: the CNC kit (folding stock, M-LOK handguard, machined grip, translucent magazine)
  await page.locator('#presets button', {hasText: 'Modern RPK'}).click();
  await page.waitForFunction(
    () => window.PARP_WORKBENCH.rifle?.id === 'rpk' && window.PARP_WORKBENCH.rifle.build.handguard === 'mlok',
    null,
    {
      timeout: 60000,
    },
  );
  assert.deepEqual(await page.evaluate(() => ['stock', 'handguard', 'grip', 'magazine'].map(s => window.PARP_WORKBENCH.rifle.build[s])), [
    'cnc',
    'mlok',
    'cnc',
    'clear',
  ]);
  noProblems(page);
  await page.close();
});

await check('art style lab: every style renders over the operator and switching back restores the materials', async () => {
  const page = await open(browser, server.url + 'operator/?lab#weapon=ak74m&pose=hero');
  await page.waitForFunction(() => window.PARP_OPERATOR?.artLab && window.PARP_OPERATOR.weapon, null, {timeout: 90000});
  assert.equal((await page.locator('#styles button').count()) >= 6, true, 'style buttons');
  const before = await page.evaluate(() => window.PARP_OPERATOR.meshes.map(m => m.material.uuid).join());
  for (const id of await page.locator('#styles button').evaluateAll(bs => bs.map(b => b.dataset.style))) {
    await page.locator(`#styles button[data-style="${id}"]`).click();
    await page.waitForTimeout(400);
    assert.equal(await page.locator(`#styles button[data-style="${id}"]`).getAttribute('aria-pressed'), 'true');
    assert.match(page.url(), new RegExp(`lab=${id}`));
  }
  await page.locator('#styles button[data-style="pbr"]').click();
  assert.equal(
    await page.evaluate(() => window.PARP_OPERATOR.meshes.map(m => m.material.uuid).join()),
    before,
    'original materials restored',
  );
  noProblems(page);
  await page.close();
});

await check('squad control: keyboard, death transfer, all-down and reduced motion', () => checkSquadControl(browser, server.url));
await check('squad control: timed slow-motion selection', () => checkSquadControl(browser, server.url, 'no-preference'));

await check(
  'partisan tactical: abilities, difficulty, and a campaign: loot, stash, trader and promotions that cost equipment',
  async () => {
    const page = await open(browser, server.url + 'convoy/?seed=7');
    await page.evaluate(() => localStorage.removeItem('parp-squad-v1'));
    await page.reload();
    await page.waitForFunction(() => window.PARP_SPRITES?.ready, null, {timeout: 60000});
    await page.locator('#difficulty').selectOption('hard');
    assert.equal(await page.evaluate(() => window.PARP_SPRITES.sim.difficultyId), 'hard');
    await page.locator('#start').click();
    const used = await page.evaluate(() => {
      const {sim, ability} = window.PARP_SPRITES;
      return {cls: sim.player.cls, ok: ability(0), cd: Object.keys(sim.player.cooldowns).length};
    });
    assert.equal(used.cls, 'insurgent');
    assert.ok(used.ok && used.cd === 1, 'Z uses the first ability and starts its cooldown');
    assert.ok((await page.locator('#squad .squad-card').count()) === 3, 'the squad panel lists the three rebels');
    await page.evaluate(() => {
      const {sim} = window.PARP_SPRITES;
      sim.kills.player = 30;
      for (const u of sim.units.filter(u => u.side === 'partisan'))
        sim.damage(
          u,
          sim.units.find(a => a.side === 'army'),
          999,
        );
      sim.checkOutcome();
    });
    // the debrief: loot from the catalogue banked into the stash, experience, and the camp with its promotions
    await page.locator('#card:not([hidden]) #camp .loot-list li').first().waitFor();
    const camp = await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('parp-squad-v1'));
      return {missions: s.missions, record: s.record.convoy, items: s.log.at(-1).loot.length, stash: s.stash};
    });
    assert.equal(camp.missions, 1);
    assert.deepEqual(camp.record, {played: 1, won: 0});
    assert.ok(camp.items >= 1, 'loot rolled');
    assert.equal(await page.locator('#camp .loot-list li').count(), camp.items);
    assert.match(await page.locator('#camp .squad-card').first().innerText(), /XP/);
    // the start stash has the vest and helmet for Heavy Fighter
    const promote = page.locator('#camp [data-promote="player:heavy"]');
    assert.equal(await promote.isDisabled(), false);
    await promote.click();
    const squad = await page.evaluate(() => JSON.parse(localStorage.getItem('parp-squad-v1')));
    assert.equal(squad.classes.player, 'heavy', 'promoted along the tree and saved');
    assert.ok(!squad.stash.vest && !squad.stash.helmet, 'the equipment is spent');
    // the trader: buy something with the starting scrip
    const offer = page.locator('#camp .offers button:not([disabled])').first();
    if (await offer.count()) {
      const before = await page.evaluate(() => JSON.parse(localStorage.getItem('parp-squad-v1')).scrip);
      await offer.click();
      assert.ok((await page.evaluate(() => JSON.parse(localStorage.getItem('parp-squad-v1')).scrip)) < before, 'scrip spent');
    }
    await page.locator('#start').click(); // back to camp
    assert.equal(await page.locator('#start').innerText(), 'Start mission');
    await page.locator('#start').click();
    assert.equal(await page.evaluate(() => window.PARP_SPRITES.sim.player.cls), 'heavy');
    await page.reload();
    await page.waitForFunction(() => window.PARP_SPRITES?.ready, null, {timeout: 60000});
    assert.equal(await page.evaluate(() => window.PARP_SPRITES.squad.classes.player), 'heavy', 'the campaign persists');
    await page.evaluate(() => localStorage.removeItem('parp-squad-v1'));
    noProblems(page);
    await page.close();
  },
);

await check('convoy ambush: the convoy drives, the ambush springs, soldiers dismount and call out', async () => {
  const page = await open(browser, server.url + 'convoy/?seed=7');
  await page.waitForFunction(() => window.PARP_SPRITES?.ready, null, {timeout: 60000});
  await page.locator('#start').click();
  // fast-forward the simulation until the lead vehicle stops at the roadblock, then open fire on it
  await page.evaluate(() => {
    const {sim} = window.PARP_SPRITES;
    while (!sim.vehicles[0].stopped && sim.time < 60) sim.step(1 / 60, {});
    const v = sim.vehicles[1];
    for (let i = 0; i < 60; i++) sim.step(1 / 60, {ax: v.x, az: v.z, fire: true});
    for (let i = 0; i < 60 * 4; i++) sim.step(1 / 60, {});
  });
  const r = await page.evaluate(() => {
    const {sim} = window.PARP_SPRITES;
    return {
      alarm: sim.alarm,
      dismounted: sim.units.filter(u => u.side === 'army' && u.state !== 'mounted').length,
      soldiers: sim.units.filter(u => u.side === 'army').length,
      callouts: sim.callouts.length,
    };
  });
  assert.equal(r.alarm, true, 'the ambush is sprung');
  assert.equal(r.dismounted, r.soldiers, 'every soldier is out (the MRAP gunner is in his turret, not mounted)');
  assert.ok(r.soldiers < 11, 'the difficulty thins the convoy (Normal: about 70%)');
  assert.ok(r.callouts >= 3, `the army calls out (${r.callouts})`);
  // the panel redraws every 120 ms of real frames: wait for it rather than for a fixed time
  await page.waitForFunction(() => document.querySelectorAll('#comms li').length >= 3, null, {timeout: 10000}).catch(() => {});
  assert.ok((await page.locator('#comms li').count()) >= 3, 'callouts reach the comms log');
  noProblems(page);
  await page.close();
});

await check('partisan tactical: G throws a grenade, Shift sprints, the fog hides what the rebels cannot see', async () => {
  const page = await open(browser, server.url + 'convoy/?seed=7');
  await page.waitForFunction(() => window.PARP_SPRITES?.ready, null, {timeout: 90000});
  await page.locator('#start').click();
  await page.mouse.move(700, 300);
  const before = await page.evaluate(() => window.PARP_SPRITES.sim.player.grenades);
  await page.keyboard.press('g');
  await page.waitForFunction(b => window.PARP_SPRITES.sim.player.grenades === b - 1, before, {timeout: 5000});
  await page.keyboard.down('d');
  await page.keyboard.down('Shift');
  await page.waitForFunction(() => window.PARP_SPRITES.sim.player.sprinting, null, {timeout: 5000});
  await page.keyboard.up('Shift');
  await page.keyboard.up('d');
  // the convoy is far off at the start: the fog hides its soldiers from the renderer, the simulation still has them
  const hidden = await page.evaluate(() => {
    const {sim} = window.PARP_SPRITES;
    return sim.units.filter(
      u =>
        u.side === 'army' &&
        u.alive &&
        !sim.units.some(p => p.side === 'partisan' && Math.hypot(p.x - u.x, p.z - u.z) < 46 && sim.los(p.x, p.z, u.x, u.z)),
    ).length;
  });
  assert.ok(hidden > 0, 'soldiers out of sight exist');
  noProblems(page);
  await page.close();
});

await check('2.5-D sprite view: the ambush draws with the placeholder art and plays through the same simulation', async () => {
  const page = await open(browser, server.url + 'convoy/?seed=7');
  await page.waitForFunction(() => window.PARP_SPRITES?.ready, null, {timeout: 90000});
  await page.locator('#start').click();
  await page.evaluate(() => {
    const {sim} = window.PARP_SPRITES;
    while (!sim.vehicles[0].stopped && sim.time < 60) sim.step(1 / 60, {});
    const v = sim.vehicles[1];
    for (let i = 0; i < 60; i++) sim.step(1 / 60, {ax: v.x, az: v.z, fire: true});
  });
  await page.waitForTimeout(600);
  const r = await page.evaluate(() => {
    const {sim, renderer} = window.PARP_SPRITES;
    const c = document.querySelector('#view'),
      px = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let colours = new Set();
    for (let i = 0; i < px.length; i += 4 * 97) colours.add((px[i] >> 4) * 256 + (px[i + 1] >> 4) * 16 + (px[i + 2] >> 4));
    return {
      alarm: sim.alarm,
      loaded: Object.values(renderer.files).filter(Boolean).length,
      total: Object.keys(renderer.files).length,
      colours: colours.size,
    };
  });
  assert.equal(r.alarm, true);
  assert.equal(r.loaded, r.total, `every sprite file loads (${r.loaded}/${r.total})`);
  // the soundscape opened on the Start click and turned the shots and impacts into sound
  const heard = await page.evaluate(() => window.PARP_SPRITES.sound.stats.played);
  assert.ok(heard.shot > 0 && heard.impact > 0, `soundscape played ${JSON.stringify(heard)}`);
  // every Workbench rifle has a gun sprite, and the Look panel dresses a rebel (saved per browser)
  const looks = await page.evaluate(async () => {
    const {MODELS} = await import('../workbench/models.js');
    const guns = window.PARP_SPRITES.renderer.guns;
    return {missing: Object.keys(MODELS).filter(id => !guns[id]), options: document.querySelectorAll('#look select').length};
  });
  assert.deepEqual(looks.missing, [], 'gun sprites for every Workbench rifle');
  assert.ok(looks.options >= 6, 'the Look panel offers gun, body, hair, shirt, outfit and headgear');
  await page.locator('#look label.row', {hasText: 'Gun'}).locator('select').selectOption('g3');
  assert.match(await page.evaluate(() => localStorage.getItem('parp-sprite-looks')), /"gun":"g3"/);
  assert.ok(r.colours > 30, `the canvas shows textured art, not a flat fill (${r.colours} colours)`);
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

await check('design doc: sections and live progress render', async () => {
  const page = await open(browser, server.url + 'docs/game-design-master-doc.html');
  await page.waitForFunction(() => document.querySelectorAll('#milestones .ms').length >= 4, null, {timeout: 15000});
  assert.equal(await page.locator('#credits').count(), 0, 'no credits section');
  await page.click('#signal');
  await page.waitForSelector('.frame canvas', {timeout: 15000});
  noProblems(page);
  await page.close();
});

await check('rebel band: the band idles, the stash, and an upgrade under the character that plays a promotion', async () => {
  const page = await open(browser, server.url + 'band/', {reducedMotion: 'no-preference'});
  await page.evaluate(() => localStorage.removeItem('parp-band-v2'));
  await page.reload();
  await page.waitForFunction(() => window.PARP_BAND?.ready, null, {timeout: 60000});
  assert.ok((await page.locator('#groups .card').count()) >= 6, 'troop cards');
  assert.ok((await page.locator('#stash .item').count()) >= 15, 'stash items');
  await page.locator('#groups .card', {hasText: 'Village Infantry'}).click();
  assert.ok((await page.locator('#detail .abilities li').count()) >= 2, 'abilities listed');
  // the pawn idles: its pixels change from one moment to the next
  const pixels = () => page.locator('#pawn').evaluate(c => c.toDataURL());
  const still = await pixels();
  await page.waitForTimeout(500);
  assert.notEqual(await pixels(), still, 'the pawn breathes');
  // the upgrade buttons sit right under the character, before the abilities
  assert.equal(await page.evaluate(() => document.querySelector('#pawn').nextElementSibling.id), 'ups');
  const before = await page.evaluate(() => window.PARP_BAND.state.band.fighter.count);
  await page.locator('#ups .up', {hasText: 'Fighter'}).getByRole('button', {name: 'Upgrade 1'}).click();
  assert.equal(await page.evaluate(() => window.PARP_BAND.state.band.fighter.count), before + 1);
  assert.equal(await page.evaluate(() => window.PARP_BAND.promoting), true, 'the promotion plays');
  await page.waitForFunction(() => !window.PARP_BAND.promoting, null, {timeout: 10000});
  assert.equal(await page.locator('#who').innerText(), 'Fighter', 'the screen shows the new class');
  // an upgrade during a promotion is never ignored: it cuts the animation short and goes through
  await page.locator('#groups .card', {hasText: 'Village Infantry'}).click();
  const up = () => page.locator('#ups .up', {hasText: 'Fighter'}).getByRole('button', {name: 'Upgrade 1'}).click();
  await up();
  await page.locator('#groups .card', {hasText: 'Village Infantry'}).click();
  await up();
  assert.equal(await page.evaluate(() => window.PARP_BAND.state.band.fighter.count), before + 3, 'both quick upgrades count');
  await page.waitForFunction(() => !window.PARP_BAND.promoting, null, {timeout: 10000});
  // the class tree: every class as a node, a card with abilities, back to the band
  await page.locator('#tree-btn').click();
  assert.ok((await page.locator('#tree-view .node').count()) >= 40, 'every class in the tree');
  await page.locator('#tree-view .node[data-id="fpvpilot"]').click();
  assert.match(await page.locator('.tree-side h3').innerText(), /FPV Pilot/);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#tree-view').isHidden(), true);
  await page.locator('#skirmish').click();
  assert.equal(await page.evaluate(() => window.PARP_BAND.state.raids), 1);
  noProblems(page);
  await page.close();
});

await check('equipment wiki: categories, search and an item card', async () => {
  const page = await open(browser, server.url + 'wiki/');
  await page.waitForFunction(() => window.PARP_WIKI?.ready, null, {timeout: 60000});
  assert.ok((await page.locator('#tree details').count()) >= 8, 'top categories');
  await page.locator('#q').fill('PKM');
  await page.locator('#items button', {hasText: 'Kalashnikov PKM'}).first().click();
  assert.match(await page.locator('#detail h1').innerText(), /PKM/);
  assert.ok((await page.locator('#detail .chips button').count()) > 0, 'compatible ammunition');
  assert.match(page.url(), /item=kalashnikov-pkm/);
  noProblems(page);
  await page.close();
});

await check('roadmap page renders (built site only)', async () => {
  const res = await fetch(server.url + 'docs/master-roadmap.html');
  if (res.status === 404 && !live && !process.env.ROOT) return; // source tree has the .md only
  assert.equal(res.status, 200);
  assert.match(await res.text(), /Partisan Project master roadmap/);
});

// last: the overworld map is the heaviest page for a software renderer, so nothing else runs after it
await check('overworld map: the island, the parties with nameplates, convoys moving, the province card', async () => {
  const page = await open(browser, server.url + 'map/', {viewport: {width: 1280, height: 800}});
  await page.waitForFunction(() => window.PARP_MAP?.ready, null, {timeout: 120000});
  const r = await page.evaluate(async () => {
    const m = window.PARP_MAP;
    const convoy = m.parties.parties.find(p => p.kind === 'convoy');
    const at = convoy.root.position.clone();
    await new Promise(res => setTimeout(res, 3000));
    return {
      kinds: m.parties.parties.map(p => p.kind),
      moved: convoy.root.position.distanceTo(at),
      plates: document.querySelectorAll('.plate-party').length,
      towns: document.querySelectorAll('.plate-town').length,
    };
  });
  assert.equal(r.kinds[0], 'player');
  assert.ok(r.kinds.filter(k => k === 'enemy').length >= 3, 'Invader patrols');
  assert.ok(r.kinds.filter(k => k === 'convoy').length >= 2, 'convoys');
  assert.ok(r.moved > 0.2, `a convoy drives (${r.moved.toFixed(1)})`);
  assert.equal(r.plates, r.kinds.length, 'a nameplate per party');
  assert.ok(r.towns >= 8, 'towns named on the map');
  await page.mouse.move(640, 420);
  await page.mouse.move(660, 430);
  await page.waitForSelector('#province:not([hidden])', {timeout: 5000});
  assert.match(await page.locator('#prov-name').innerText(), /province/i);
  await page.locator('[data-speed="0"]').click();
  assert.equal(await page.locator('[data-speed="0"]').getAttribute('aria-pressed'), 'true');
  noProblems(page);
  await page.close();
});

await browser.close();
server.stop();
console.log(results.join('\n'));
console.log(process.exitCode ? '\nSMOKE FAILED' : '\nsmoke ok');
