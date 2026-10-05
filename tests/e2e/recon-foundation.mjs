// Exercise the clean body inspection and real Operator Modder, including held weapons, saved colours and a strip sheet.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import sharp from 'sharp';
import {launch, open, startServer} from './browser.mjs';
import {reconClearance, reconPalmDistances} from './recon-clearance.mjs';
const server = await startServer(8191),
  browser = await launch();
try {
  const page = await open(browser, server.url + 'operator/foundation.html', {viewport: {width: 760, height: 1100}});
  await page.waitForFunction(() => window.PARP_RECON_FOUNDATION?.ready, null, {timeout: 60000});
  const base = await page.evaluate(() => {
    const f = window.PARP_RECON_FOUNDATION;
    return {
      triangles: f.meshes.reduce((s, m) => s + m.geometry.index.count / 3, 0),
      height: new f.stage.T.Box3().setFromObject(f.scene).getSize(new f.stage.T.Vector3()).y,
      cloth: f.meshes
        .filter(m => /M_CM_(Jacket|Trousers|Neck|Gloves|HeadCover)/.test(m.material.name))
        .every(m => m.material.map?.image.width === 256),
      eyes: f.meshes.filter(m => m.material.name === 'M_CM_Pupil').length,
    };
  });
  assert.ok(base.triangles <= 8000 && Math.abs(base.height - 1.827) < 0.01);
  assert.ok(base.cloth);
  assert.equal(base.eyes, 2);
  for (const value of ['none', 'mask', 'cap', 'both']) {
    await page.locator('#headwear').selectOption(value);
    assert.deepEqual(
      await page.evaluate(() => {
        const m = window.PARP_RECON_FOUNDATION.meshes;
        return [m.find(x => x.name === 'SK_CM_Mask').visible, m.find(x => x.name === 'SK_CM_HeadCap').visible];
      }),
      [value === 'mask' || value === 'both', value === 'cap' || value === 'both'],
    );
  }
  await page.locator('#headwear').selectOption('none');
  const handStates = [];
  for (const value of ['open', 'relaxed', 'grip', 'support']) {
    await page.locator('#hands').selectOption(value);
    handStates.push(await page.evaluate(() => window.PARP_RECON_FOUNDATION.rig.bones.get('index_02_r').quaternion.toArray().join(',')));
  }
  assert.equal(new Set(handStates).size, 4);
  await page.locator('#hands').selectOption('pose');
  const poses = await page.locator('#pose option').evaluateAll(options => options.map(o => o.value));
  for (const pose of poses) {
    await page.locator('#pose').selectOption(pose);
    await page.waitForTimeout(60);
  }
  await page.locator('#pose').selectOption('rest');
  assert.equal(await page.evaluate(() => window.PARP_RECON_FOUNDATION.scene.position.y), 0);
  const shots = [];
  for (const [pose, view] of [
    ['rest', 'front'],
    ['rest', 'back'],
    ['rest', 'left'],
    ['rest', 'right'],
    ['salute', 'front'],
    ['crouch', 'front'],
  ]) {
    await page.locator('#pose').selectOption(pose);
    await page.getByRole('button', {name: view[0].toUpperCase() + view.slice(1), exact: true}).click();
    await page.waitForTimeout(300);
    if (process.env.FOUNDATION_SHOT) {
      const tile = await sharp(await page.locator('section').screenshot())
        .resize(600, 700, {fit: 'contain', background: '#11170f'})
        .toBuffer();
      const title = Buffer.from(
        `<svg width="600" height="40"><rect width="600" height="40" fill="#11170f"/><text x="16" y="27" fill="#e6e9dc" font-family="sans-serif" font-size="18">${pose.toUpperCase()} · ${view.toUpperCase()}</text></svg>`,
      );
      shots.push(
        await sharp({create: {width: 600, height: 740, channels: 3, background: '#11170f'}})
          .composite([
            {input: title, left: 0, top: 0},
            {input: tile, left: 0, top: 40},
          ])
          .png()
          .toBuffer(),
      );
    }
  }
  if (shots.length)
    await sharp({create: {width: 1800, height: 1480, channels: 3, background: '#11170f'}})
      .composite(shots.map((input, i) => ({input, left: (i % 3) * 600, top: Math.floor(i / 3) * 740})))
      .png()
      .toFile(process.env.FOUNDATION_SHOT);
  const before = await page.evaluate(() => window.PARP_RECON_FOUNDATION.stage.camera.position.toArray());
  await page.locator('#foundation-stage').focus();
  await page.keyboard.press('ArrowRight');
  assert.notDeepEqual(await page.evaluate(() => window.PARP_RECON_FOUNDATION.stage.camera.position.toArray()), before);
  await page.locator('#pose').selectOption('relaxed');
  await page.locator('#idle').selectOption('alert');
  const head = () => page.evaluate(() => window.PARP_RECON_FOUNDATION.rig.bones.get('head').quaternion.toArray());
  const still = await head();
  await page.waitForTimeout(300);
  assert.deepEqual(await head(), still);
  await page.emulateMedia({reducedMotion: 'no-preference'});
  await page.waitForTimeout(300);
  assert.notDeepEqual(await head(), still);
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.getByRole('button', {name: 'Wireframe', exact: true}).click();
  assert.ok(await page.evaluate(() => window.PARP_RECON_FOUNDATION.meshes.every(m => m.material.wireframe)));
  await page.setViewportSize({width: 390, height: 844});
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.addScriptTag({content: fs.readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8')});
  assert.deepEqual(
    await page.evaluate(async () =>
      (await window.axe.run(document, {runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa']}})).violations
        .filter(v => ['serious', 'critical'].includes(v.impact))
        .map(v => v.id),
    ),
    [],
  );
  assert.deepEqual(
    page.problems.filter(p => !/ERR_ABORTED/.test(p)),
    [],
  );
  await page.close();
  const modder = await open(browser, server.url + 'operator/#base=recon-modular&look=off&idle=off&pose=ready');
  await modder.waitForFunction(() => window.PARP_OPERATOR?.ready && window.PARP_OPERATOR.weapon?.rifle.id === 'ak74m', null, {
    timeout: 60000,
  });
  const skinTone = await modder.evaluate(() =>
    window.PARP_OPERATOR.meshes.find(m => m.material.name === 'M_CM_Skin').material.color.getHex(),
  );
  for (const weapon of ['ak74m', 'g3', 'ak15k']) {
    await modder.evaluate(id => window.PARP_OPERATOR.set('weapon', id), weapon);
    await modder.waitForFunction(id => window.PARP_OPERATOR.weapon?.rifle.id === id, weapon);
    for (const pose of ['hero', 'ready', 'crouch', 'kneel', 'highready', 'port', 'gunner', 'herotwo']) {
      await modder.evaluate(p => window.PARP_OPERATOR.set('pose', p), pose);
      await modder.waitForTimeout(300);
      assert.ok(
        (await modder.evaluate(reconPalmDistances)).every(d => d < 0.025),
        `${weapon}/${pose} palm reach`,
      );
      assert.deepEqual(await modder.evaluate(reconClearance), [], `${weapon}/${pose} clothing clearance`);
    }
  }
  await modder.evaluate(() => {
    window.PARP_OPERATOR.set('z.top', 'navy');
    window.PARP_OPERATOR.set('z.pants', 'khaki');
    window.PARP_OPERATOR.set('mask', 'none');
    window.PARP_OPERATOR.set('cap', 'fitted');
  });
  const hash = await modder.evaluate(() => location.hash);
  await modder.reload();
  await modder.waitForFunction(() => window.PARP_OPERATOR?.ready);
  assert.equal(await modder.evaluate(() => location.hash), hash);
  assert.ok(
    await modder.evaluate(skinTone => {
      const o = window.PARP_OPERATOR;
      return (
        o.base.id === 'recon-modular' &&
        o.state['z.top'] === 'navy' &&
        !o.meshes.find(m => m.name === 'SK_CM_Mask').visible &&
        o.meshes.find(m => m.name === 'SK_CM_HeadCap').visible &&
        o.meshes.filter(m => m.material.name === 'M_CM_Jacket').every(m => m.material.map?.image.width === 256) &&
        o.meshes.find(m => m.material.name === 'M_CM_Skin').material.color.getHex() === skinTone
      );
    }, skinTone),
  );
  await modder.evaluate(() => window.PARP_OPERATOR.switchBase('generated-recon'));
  await modder.waitForFunction(() => window.PARP_OPERATOR.base.id === 'generated-recon');
  assert.ok(await modder.evaluate(() => window.PARP_OPERATOR.meshes.some(m => m.name === 'SK_GR_Harness')));
  assert.deepEqual(
    modder.problems.filter(p => !/ERR_ABORTED/.test(p)),
    [],
  );
  console.log(
    'Foundation passed: decoded textures, all inspection poses, four sides, keyboard, motion preferences, mobile/a11y, 24 rifle carries, palette/share reload, legacy roster switch.',
  );
} finally {
  await browser.close();
  server.stop();
}
