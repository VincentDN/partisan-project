// Exercise mounted pouch copies, saved state, removal and all rifle carries; capture front/rear fit references.
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {launch, open, startServer} from './browser.mjs';
import {reconClearance, reconPalmDistances} from './recon-clearance.mjs';
import {carrierClothingClearance} from './carrier-clearance.mjs';
import {pouchInteractions, pouchMotion} from './pouch-interactions.mjs';
const server = await startServer(8194),
  browser = await launch();
async function rendered(page) {
  const frame = await page.evaluate(() => window.PARP_OPERATOR.stage.renderer.info.render.frame);
  await page.waitForFunction(frame => window.PARP_OPERATOR.stage.renderer.info.render.frame > frame, frame);
}
try {
  const page = await open(browser, server.url + 'operator/?standalone#base=recon-modular&carrier=placard&look=off&idle=off&pose=ready');
  await page.waitForFunction(() => window.PARP_OPERATOR?.ready && window.PARP_OPERATOR.weapon?.rifle.id === 'ak74m', null, {
    timeout: 90000,
  });
  if (await page.getByText('Skip tour', {exact: true}).isVisible()) await page.getByText('Skip tour', {exact: true}).click();
  const shots = [],
    failures = [];
  for (const type of ['magazine', 'utility', 'radio']) {
    await page.evaluate(type => {
      for (const side of ['front', 'rear']) for (let i = 1; i <= 3; i++) window.PARP_OPERATOR.set(side + i, type);
    }, type);
    for (const view of ['front', 'rear', 'side', 'armed']) {
      await page.evaluate(view => {
        const o = window.PARP_OPERATOR,
          T = o.stage.T;
        o.set('weapon', view === 'armed' ? 'ak74m' : 'none');
        o.set('pose', view === 'armed' ? 'port' : 'relaxed');
        o.stage.moveCamera(
          new T.Vector3(0, 1.23, 0),
          new T.Vector3(
            view === 'side' ? 1.35 : view === 'rear' ? -0.25 : 0.25,
            1.42,
            view === 'side' ? 0.25 : view === 'rear' ? -1.35 : 1.35,
          ),
          0,
        );
      }, view);
      if (view === 'armed') await page.waitForFunction(() => window.PARP_OPERATOR.weapon?.rifle.id === 'ak74m');
      await rendered(page);
      const input = await sharp(await page.locator('#stage').screenshot())
        .resize(480, 580, {fit: 'contain', background: '#11170f'})
        .toBuffer();
      const label = Buffer.from(
        `<svg width="480" height="40"><rect width="480" height="40" fill="#11170f"/><text x="12" y="27" font-family="sans-serif" font-size="18" fill="white">${type} copies · ${view}</text></svg>`,
      );
      shots.push(
        await sharp({create: {width: 480, height: 620, channels: 3, background: '#11170f'}})
          .composite([
            {input: label, left: 0, top: 0},
            {input, left: 0, top: 40},
          ])
          .png()
          .toBuffer(),
      );
    }
    for (const weapon of ['ak74m', 'g3', 'ak15k']) {
      await page.evaluate(id => window.PARP_OPERATOR.set('weapon', id), weapon);
      await page.waitForFunction(id => window.PARP_OPERATOR.weapon?.rifle.id === id, weapon);
      for (const pose of [
        'hero',
        'ready',
        'crouch',
        'kneel',
        'highready',
        'port',
        'gunner',
        'herotwo',
        'relaxed',
        'comms',
        'overwatch',
        'salute',
      ]) {
        await page.evaluate(id => window.PARP_OPERATOR.set('pose', id), pose);
        await rendered(page);
        const held = await page.evaluate(() => !!window.PARP_OPERATOR.rig.data.poses[window.PARP_OPERATOR.state.pose].weapon);
        const palms = held ? await page.evaluate(reconPalmDistances) : [],
          hits = await page.evaluate(reconClearance),
          clothing = await page.evaluate(carrierClothingClearance);
        if (palms.some(d => d > 0.025) || hits.length || clothing.length) failures.push({type, weapon, pose, palms, hits, clothing});
      }
    }
    console.log(type + ' carry checks complete');
  }
  await sharp({create: {width: 1440, height: 2480, channels: 3, background: '#11170f'}})
    .composite(shots.map((input, i) => ({input, left: Math.floor(i / 4) * 480, top: (i % 4) * 620})))
    .png()
    .toFile(process.env.POUCH_SHOT || 'build/recon-pouches-sheet.png');
  console.log(JSON.stringify(failures));
  assert.deepEqual(failures, [], 'pouch/rifle and pouch/clothing clearance');
  const count = () =>
    page.evaluate(() => new Set(window.PARP_OPERATOR.meshes.filter(m => m.userData.pouchInstance).map(m => m.userData.pouchInstance)).size);
  assert.equal(await count(), 6);
  await page.evaluate(() => window.PARP_OPERATOR.set('front2', 'none'));
  assert.equal(await count(), 5);
  const hash = await page.evaluate(() => location.hash);
  await page.reload();
  await page.waitForFunction(() => window.PARP_OPERATOR?.ready);
  assert.equal(await page.evaluate(() => location.hash), hash);
  assert.equal(await count(), 5);
  await page.evaluate(() => window.PARP_OPERATOR.set('carrier', 'light'));
  assert.equal(await count(), 3);
  await page.evaluate(() => window.PARP_OPERATOR.set('carrier', 'none'));
  assert.equal(await count(), 0);
  assert.equal(await page.evaluate(() => window.PARP_OPERATOR.rig.profileId), 'reconFoundation');
  assert.ok(
    await page
      .getByRole('group', {name: 'Front pouch 1', exact: true})
      .getByRole('button', {name: 'Magazine pouch', exact: true})
      .isDisabled(),
  );
  await page.evaluate(() => window.PARP_OPERATOR.set('carrier', 'placard'));
  assert.equal(await count(), 5);
  assert.equal(await page.evaluate(() => window.PARP_OPERATOR.rig.profileId), 'reconPouches');
  await pouchInteractions(page, rendered);
  await pouchMotion(page);
  assert.deepEqual(
    page.problems.filter(p => !p.includes('ERR_ABORTED')),
    [],
  );
  console.log('Pouches: 72 held and 36 slung six-copy carries, removal, share/colour restoration, keyboard/mobile and motion checks pass.');
} finally {
  await browser.close();
  server.stop();
}
