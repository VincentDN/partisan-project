// Check pouch colours, keyboard/mobile controls and deterministic browser samples of idles and held-pose transitions.
import assert from 'node:assert/strict';
import {reconClearance, reconPalmDistances} from './recon-clearance.mjs';
import {carrierClothingClearance} from './carrier-clearance.mjs';

export async function pouchInteractions(page, rendered) {
  const fabric = () =>
    page.evaluate(() => {
      const materials = window.PARP_OPERATOR.meshes
        .filter(m => m.userData.pouchInstance && m.material.name === 'M_CM_Pouches')
        .map(m => m.material);
      return materials.map(m => ({colour: m.color.getHexString(), texture: m.map?.image.width}));
    });
  const original = await fabric();
  assert.ok(original.length && original.every(m => m.texture === 128));
  const olive = page.getByRole('group', {name: 'Pouch fabric colour', exact: true}).getByRole('button', {name: 'Olive', exact: true});
  await olive.focus();
  await page.keyboard.press('Enter');
  assert.equal(await olive.getAttribute('aria-pressed'), 'true');
  assert.ok(await olive.evaluate(b => b === document.activeElement), 'keyboard focus survives control redraw');
  assert.ok((await fabric()).every(m => m.colour === '4b5a3a' && m.texture === 128));
  await page.reload();
  await page.waitForFunction(() => window.PARP_OPERATOR?.ready);
  assert.ok((await fabric()).every(m => m.colour === '4b5a3a' && m.texture === 128));
  await page.getByRole('group', {name: 'Pouch fabric colour', exact: true}).getByRole('button', {name: 'Original', exact: true}).click();
  assert.deepEqual(await fabric(), original);
  await page.setViewportSize({width: 390, height: 844});
  const utility = page.getByRole('group', {name: 'Front pouch 2', exact: true}).getByRole('button', {name: 'Utility pouch', exact: true});
  await utility.focus();
  await page.keyboard.press('Space');
  assert.equal(await page.evaluate(() => window.PARP_OPERATOR.state.front2), 'utility');
  assert.equal(await utility.getAttribute('aria-pressed'), 'true');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'mobile page fits viewport');
  await page.getByRole('group', {name: 'Front pouch 2', exact: true}).scrollIntoViewIfNeeded();
  await page.screenshot({path: 'build/recon-pouches-mobile.png'});
  await page.setViewportSize({width: 1280, height: 800});
  await page.evaluate(() => {
    const o = window.PARP_OPERATOR;
    for (const side of ['front', 'rear']) for (let i = 1; i <= 3; i++) o.set(side + i, 'none');
  });
  assert.equal(await page.evaluate(() => window.PARP_OPERATOR.rig.profileId), 'reconCarrier');
  await page.evaluate(() => {
    const o = window.PARP_OPERATOR;
    for (const [k, v] of Object.entries({
      front1: 'magazine',
      front2: 'utility',
      front3: 'radio',
      rear1: 'radio',
      rear2: 'utility',
      rear3: 'magazine',
      weapon: 'ak74m',
      pose: 'ready',
      idle: 'off',
    }))
      o.set(k, v);
  });
  await page.waitForFunction(() => window.PARP_OPERATOR.weapon?.rifle.id === 'ak74m');
  await rendered(page);
}

export async function pouchMotion(page) {
  await page.clock.install();
  await page.reload();
  await page.waitForFunction(() => window.PARP_OPERATOR?.ready && window.PARP_OPERATOR.weapon?.rifle.id === 'ak74m', null, {
    timeout: 90000,
  });
  await page.clock.pauseAt(new Date((await page.evaluate(() => Date.now())) + 100));
  const samples = [];
  const check = async label => {
    const palms = await page.evaluate(reconPalmDistances),
      hits = await page.evaluate(reconClearance),
      clothing = await page.evaluate(carrierClothingClearance);
    samples.push({label, palms, hits, clothing});
    assert.ok(palms.every(d => d < 0.025) && !hits.length && !clothing.length, JSON.stringify(samples.at(-1)));
  };
  await page.emulateMedia({reducedMotion: 'no-preference'});
  for (const idle of ['calm', 'alert', 'weary']) {
    await page.evaluate(idle => window.PARP_OPERATOR.set('idle', idle), idle);
    for (let i = 0; i < 3; i++) {
      await page.clock.runFor(240);
      await check(`${idle} sample ${i + 1}`);
    }
  }
  await page.evaluate(() => window.PARP_OPERATOR.set('idle', 'off'));
  for (const pose of ['port', 'gunner', 'highready']) {
    await page.evaluate(pose => window.PARP_OPERATOR.set('pose', pose), pose);
    for (let i = 0; i < 3; i++) {
      await page.clock.runFor(200);
      await check(`transition to ${pose} sample ${i + 1}`);
    }
    await page.clock.runFor(800);
  }
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.evaluate(() => {
    window.PARP_OPERATOR.set('pose', 'ready');
    window.PARP_OPERATOR.set('idle', 'alert');
  });
  await page.clock.runFor(100);
  const head = () => page.evaluate(() => window.PARP_OPERATOR.rig.bones.get('head').quaternion.toArray());
  const still = await head();
  await page.clock.runFor(400);
  assert.deepEqual(await head(), still, 'reduced motion disables the idle');
  await check('reduced motion');
  console.log(`Pouch motion: ${samples.length} clearance samples pass.`);
}
