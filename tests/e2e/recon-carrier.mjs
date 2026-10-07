// Inspect the first carrier fit and render a contact sheet.
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {launch, open, startServer, operatorRendered} from './browser.mjs';
import {reconClearance, reconPalmDistances} from './recon-clearance.mjs';
import {carrierClothingClearance} from './carrier-clearance.mjs';
const server = await startServer(8193),
  browser = await launch();
try {
  const page = await open(browser, server.url + 'operator/foundation.html', {viewport: {width: 760, height: 1100}});
  await page.waitForFunction(() => window.PARP_RECON_FOUNDATION?.ready);
  const shots = [];
  for (const [carrier, pose, view] of [
    ['bare', 'rest', 'front'],
    ['light', 'rest', 'front'],
    ['placard', 'rest', 'front'],
    ['placard', 'rest', 'back'],
    ['placard', 'rest', 'left'],
    ['placard', 'ready', 'front'],
  ]) {
    await page.locator('#carrier').selectOption(carrier);
    await page.locator('#pose').selectOption(pose);
    await page.locator(`[data-camera="${view}"]`).click();
    await page.waitForTimeout(100);
    const active = await page.evaluate(() =>
      window.PARP_RECON_FOUNDATION.meshes.filter(m => m.name.startsWith('SK_LC_') && m.visible).map(m => m.userData.packPart),
    );
    assert.equal(active.length > 0, carrier !== 'bare');
    assert.equal(active.includes('SK_LC_Placard'), carrier === 'placard');
    const input = await sharp(await page.locator('section').screenshot())
      .resize(480, 610, {fit: 'contain', background: '#11170f'})
      .toBuffer();
    const label = Buffer.from(
      `<svg width="480" height="40"><rect width="480" height="40" fill="#11170f"/><text x="12" y="27" font-family="sans-serif" font-size="18" fill="white">${carrier} · ${pose} · ${view}</text></svg>`,
    );
    shots.push(
      await sharp({create: {width: 480, height: 650, channels: 3, background: '#11170f'}})
        .composite([
          {input: label, left: 0, top: 0},
          {input, left: 0, top: 40},
        ])
        .png()
        .toBuffer(),
    );
  }
  await sharp({create: {width: 1440, height: 1300, channels: 3, background: '#11170f'}})
    .composite(shots.map((input, i) => ({input, left: (i % 3) * 480, top: Math.floor(i / 3) * 650})))
    .png()
    .toFile(process.env.CARRIER_SHOT || 'build/recon-carrier-sheet.png');
  assert.deepEqual(
    page.problems.filter(p => !p.includes('ERR_ABORTED')),
    [],
  );
  const modder = await open(browser, server.url + 'operator/#base=recon-modular&carrier=placard&look=off&idle=off&pose=ready');
  await modder.waitForFunction(() => window.PARP_OPERATOR?.ready && window.PARP_OPERATOR.weapon?.rifle.id === 'ak74m', null, {
    timeout: 60000,
  });
  const failures = [];
  for (const weapon of ['ak74m', 'g3', 'ak15k']) {
    await modder.evaluate(id => window.PARP_OPERATOR.set('weapon', id), weapon);
    await modder.waitForFunction(id => window.PARP_OPERATOR.weapon?.rifle.id === id, weapon);
    for (const pose of ['hero', 'ready', 'crouch', 'kneel', 'highready', 'port', 'gunner', 'herotwo']) {
      await modder.evaluate(id => window.PARP_OPERATOR.set('pose', id), pose);
      await operatorRendered(modder);
      const palms = await modder.evaluate(reconPalmDistances),
        hits = await modder.evaluate(reconClearance);
      const clothing = await modder.evaluate(carrierClothingClearance);
      if (palms.some(n => n > 0.025) || hits.length || clothing.length) failures.push({weapon, pose, palms, hits, clothing});
    }
  }
  console.log(JSON.stringify(failures));
  assert.deepEqual(failures, [], 'equipped rifle clearance and hand reach');
  for (const value of ['none', 'light', 'placard']) {
    await modder.evaluate(value => window.PARP_OPERATOR.set('carrier', value), value);
    const visible = await modder.evaluate(() =>
      window.PARP_OPERATOR.meshes.filter(m => m.visible && m.userData.packPart?.startsWith('SK_LC_')).map(m => m.userData.packPart),
    );
    assert.equal(visible.length > 0, value !== 'none');
    assert.equal(visible.includes('SK_LC_Placard'), value === 'placard');
  }
  const hash = await modder.evaluate(() => location.hash);
  await modder.reload();
  await modder.waitForFunction(() => window.PARP_OPERATOR?.ready);
  assert.equal(await modder.evaluate(() => location.hash), hash);
  assert.deepEqual(
    modder.problems.filter(p => !p.includes('ERR_ABORTED')),
    [],
  );

  console.log('Carrier inspection: selectable frame/placard, front/back/side and held-pose contact sheet pass.');
} finally {
  await browser.close();
  server.stop();
}
