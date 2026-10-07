// Browser acceptance for the fitted Generated Recon, equipment switching and motion preferences.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {launch, open, startServer, operatorRendered} from './browser.mjs';
import {reconClearance, reconPalmDistances} from './recon-clearance.mjs';
const server = await startServer(8197),
  browser = await launch();
try {
  const page = await open(browser, server.url + 'operator/#base=generated-recon&look=off');
  await page.waitForFunction(() => window.PARP_OPERATOR?.ready, null, {timeout: 60000});
  assert.equal(await page.evaluate(() => window.PARP_OPERATOR.base.id), 'generated-recon');
  await page.locator('#roster button').getByText('Recon', {exact: true}).click();
  const failures = await page.evaluate(() => {
    const o = window.PARP_OPERATOR,
      errors = [];
    for (const slot of o.base.slots.filter(s => s.id !== 'weapon')) {
      for (const option of slot.options) {
        o.set(slot.id, option.id);
        for (const p of new Set(slot.options.flatMap(x => x.show))) {
          const meshes = o.meshes.filter(m => o.meshPart.get(m) === p);
          if (!meshes.length || meshes.some(m => m.visible !== option.show.includes(p))) errors.push(slot.id + '/' + option.id + '/' + p);
        }
        for (const name of ['SK_GR_Glove_L', 'SK_GR_Glove_R'])
          if (!o.meshes.find(m => m.name === name)?.visible) errors.push('missing hand ' + name);
      }
    }
    o.set('z.top', 'navy');
    o.set('scarf', 'on');
    o.set('comms', 'on');
    o.set('z.pants', 'khaki');
    o.set('pose', 'ready');
    o.set('idle', 'alert');
    const m = n => o.meshes.find(m => m.material.name === n).material;
    if (m('M_GR_top') === m('M_GR_pants') || m('M_GR_top').color.equals(m('M_GR_pants').color)) errors.push('shared colours');
    for (const name of ['M_GR_top', 'M_GR_pants', 'M_GR_hood', 'M_GR_Face']) {
      const material = m(name);
      if (!material.map?.image || material.map.image.width !== 2048) errors.push('missing decoded atlas: ' + name);
    }
    const face = m('M_GR_Face').color.clone();
    o.set('z.hood', 'navy');
    if (!m('M_GR_Face').color.equals(face)) errors.push('hood colour changed the face');
    if (!m('M_GR_hood').map) errors.push('hood recolouring lost texture');
    return errors;
  });
  assert.deepEqual(failures, []);
  const hash = await page.evaluate(() => location.hash);
  await page.waitForFunction(() => window.PARP_OPERATOR.weapon?.rifle, null, {timeout: 60000}); // let the rifle finish loading first
  await page.reload();
  await page.waitForFunction(() => window.PARP_OPERATOR?.ready);
  assert.equal(await page.evaluate(() => location.hash), hash);
  assert.equal(await page.evaluate(() => window.PARP_OPERATOR.state['z.top']), 'navy');
  // Reduced motion holds the exact same bones even with an idle selected.
  const head = () => page.evaluate(() => window.PARP_OPERATOR.rig.bones.get('head').quaternion.toArray());
  const still = await head();
  await page.waitForTimeout(350);
  assert.deepEqual(await head(), still);
  await page.evaluate(() => {
    window.PARP_OPERATOR.set('weapon', 'ak74m');
    window.PARP_OPERATOR.set('pose', 'hero');
  });
  await page.waitForFunction(() => window.PARP_OPERATOR.weapon?.rifle.id === 'ak74m' && window.PARP_OPERATOR.pivot.visible);
  for (const [pose, sides] of [
    ['hero', ['r']],
    ['ready', ['r', 'l']],
    ['crouch', ['r', 'l']],
    ['kneel', ['r', 'l']],
    ['highready', ['r', 'l']],
    ['port', ['r', 'l']],
    ['gunner', ['r', 'l']],
    ['herotwo', ['r', 'l']],
  ]) {
    await page.evaluate(p => window.PARP_OPERATOR.set('pose', p), pose);
    await operatorRendered(page);
    const distances = await page.evaluate(sides => {
      const o = window.PARP_OPERATOR,
        {Vector3: V, Quaternion: Q} = o.stage.T;
      return sides.map(side => {
        const h = o.rig.bones.get('hand_' + side);
        const palm = h.getWorldPosition(new V()).add(o.rig.grip.palms[side].clone().applyQuaternion(h.getWorldQuaternion(new Q())));
        const at = side === 'r' ? [-0.028, -0.058, 0] : o.weapon.rifle.config.handguardAt || [0.3, 0.008, 0];
        return palm.distanceTo(o.pivot.localToWorld(new V(...at)));
      });
    }, sides);
    assert.ok(
      distances.every(d => d < 0.025),
      `${pose}: palms miss grips ${distances}`,
    );
    assert.deepEqual(await page.evaluate(reconClearance), [], `${pose}: rifle penetrates the torso or equipment`);
  }
  const weapons = await page.evaluate(() =>
    window.PARP_OPERATOR.base.slots
      .find(s => s.id === 'weapon')
      .options.filter(o => o.weapon && o.weapon !== 'bench')
      .map(o => o.weapon),
  );
  for (const id of weapons) {
    await page.evaluate(id => window.PARP_OPERATOR.set('weapon', id), id);
    await page.waitForFunction(id => window.PARP_OPERATOR.weapon?.rifle.id === id, id);
    for (const pose of ['hero', 'ready', 'crouch', 'kneel', 'highready', 'port', 'gunner', 'herotwo']) {
      await page.evaluate(pose => window.PARP_OPERATOR.set('pose', pose), pose);
      await operatorRendered(page);
      assert.deepEqual(await page.evaluate(reconClearance), [], `${id}/${pose}: rifle penetrates the torso or equipment`);
      const palms = await page.evaluate(reconPalmDistances);
      assert.ok(
        palms.every(d => d < 0.025),
        `${id}/${pose}: palms miss grips ${palms}`,
      );
    }
  }
  assert.ok(
    await page.evaluate(() => !window.PARP_OPERATOR.base.slots.find(s => s.id === 'weapon').options.some(o => o.id === 'none')),
    'the operator always holds a weapon',
  );
  await page.evaluate(() => window.PARP_OPERATOR.switchBase('base'));
  await page.evaluate(() => window.PARP_OPERATOR.switchBase('generated-recon'));
  assert.equal(await page.evaluate(() => window.PARP_OPERATOR.rig.bones.size), 26);
  await page.emulateMedia({reducedMotion: 'no-preference'});
  await page.waitForFunction(() => window.PARP_OPERATOR.weapon?.rifle, null, {timeout: 60000}); // let the rifle finish loading first
  await page.reload();
  await page.waitForFunction(() => window.PARP_OPERATOR?.ready);
  await page.evaluate(() => {
    window.PARP_OPERATOR.set('look', 'off');
    window.PARP_OPERATOR.set('idle', 'alert');
  });
  const moving = await head();
  await page.waitForTimeout(450);
  assert.notDeepEqual(await head(), moving);
  const blend = await page.evaluate(() => {
    const o = window.PARP_OPERATOR;
    o.set('pose', 'hero');
    return o.rig.blend;
  });
  assert.ok(blend < 1, 'pose changes animate');
  await page.waitForFunction(() => window.PARP_OPERATOR.rig.blend === 1);
  // Reloading can abort optional in-flight resources; actual load/HTTP/JS errors still fail.
  assert.deepEqual(
    page.problems.filter(p => !/ERR_ABORTED/.test(p)),
    [],
  );
  const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
  await page.addScriptTag({content: axeSource});
  const violations = await page.evaluate(async () => {
    const results = await window.axe.run(document, {runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']}});
    return results.violations.filter(v => ['serious', 'critical'].includes(v.impact)).map(v => v.id);
  });
  assert.deepEqual(violations, [], 'Generated Recon accessibility');
  console.log(
    'Generated Recon browser acceptance passed: textures, protected face, equipment, palms, 11 rifles in eight carry poses, URL reload, idle, blending, reduced motion and roster switching.',
  );
} finally {
  await browser.close();
  server.stop();
}
