// Render a repeatable detail sheet of the bare head, removable coverings and articulated glove shapes.
import sharp from 'sharp';
import {launch, open, startServer} from './browser.mjs';
const s = await startServer(8190),
  b = await launch();
try {
  const p = await open(b, s.url + 'operator/foundation.html', {viewport: {width: 760, height: 1000}});
  await p.waitForFunction(() => window.PARP_RECON_FOUNDATION?.ready);
  const shots = [];
  for (const [kind, value] of [
    ['head', 'none'],
    ['head', 'mask'],
    ['head', 'both'],
    ['hand', 'open'],
    ['hand', 'relaxed'],
    ['hand', 'grip'],
  ]) {
    if (kind === 'head') {
      await p.locator('#headwear').selectOption(value);
      await p.evaluate(() => {
        const f = window.PARP_RECON_FOUNDATION,
          T = f.stage.T;
        f.stage.moveCamera(new T.Vector3(0, 1.71, 0), new T.Vector3(0.1, 1.72, 0.63), 0);
      });
    } else {
      await p.locator('#hands').selectOption(value);
      await p.evaluate(() => {
        const f = window.PARP_RECON_FOUNDATION,
          T = f.stage.T,
          h = f.rig.bones.get('hand_r'),
          target = h.localToWorld(new T.Vector3(0, 0.08, 0));
        f.stage.moveCamera(target, target.clone().add(new T.Vector3(0.22, 0.015, 0.32)), 0);
      });
    }
    await p.waitForTimeout(200);
    const input = await sharp(await p.locator('#foundation-stage').screenshot())
      .resize(450, 560, {fit: 'cover'})
      .toBuffer();
    const text = Buffer.from(
      `<svg width="450" height="40"><rect width="450" height="40" fill="#101710"/><text x="12" y="27" fill="white" font-family="sans-serif" font-size="19">${kind} · ${value}</text></svg>`,
    );
    shots.push(
      await sharp({create: {width: 450, height: 600, channels: 3, background: '#101710'}})
        .composite([
          {input, left: 0, top: 40},
          {input: text, left: 0, top: 0},
        ])
        .png()
        .toBuffer(),
    );
  }
  await sharp({create: {width: 1350, height: 1200, channels: 3, background: '#101710'}})
    .composite(shots.map((input, i) => ({input, left: (i % 3) * 450, top: Math.floor(i / 3) * 600})))
    .png()
    .toFile(process.env.HEAD_HAND_SHOT || 'build/cm3-detail.png');
} finally {
  await b.close();
  s.stop();
}
