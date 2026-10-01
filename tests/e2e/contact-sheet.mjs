// One image with every pose × two angles (or any looks), for visual review: far cheaper than many screenshots.
//   node tests/e2e/contact-sheet.mjs out.png "weapon=ak74m&head=helmet" [poses=relaxed,hero,ready,comms,overwatch] [azimuths=24,160]
import sharp from 'sharp';
import {launch, open, startServer} from './browser.mjs';

const [out = 'build/contact-sheet.png', query = '', poses = 'relaxed,hero,ready,comms,overwatch', azs = '24,160', ty = '0.95', dist = '3.3'] = process.argv.slice(2);
const server = await startServer(8198), browser = await launch();
const tiles = [], W = 420, H = 560;
for (const pose of poses.split(',')) for (const az of azs.split(',')) {
  const page = await open(browser, `${server.url}operator/#${query}`, {viewport: {width: 1100, height: 760}});
  await page.waitForFunction(() => window.PARP_OPERATOR?.ready, null, {timeout: 60000});
  await page.evaluate(({pose, az, ty, dist}) => {
    const o = window.PARP_OPERATOR; o.set('pose', pose); o.set('idle', 'off');
    document.querySelectorAll('aside,header,#first-run').forEach(e => e.style.display = 'none');
    document.querySelector('main').style.display = 'block'; document.querySelector('#stage').style.height = '760px';
    const {camera, controls} = o.stage, a = az * Math.PI / 180;
    controls.target.set(0, ty, 0); camera.position.set(Math.sin(a) * dist, ty + 0.15, Math.cos(a) * dist); controls.update();
  }, {pose, az: +az, ty: +ty, dist: +dist});
  await page.waitForTimeout(1500);
  tiles.push(await sharp(await page.screenshot({clip: {x: 190, y: 0, width: 720, height: 760}})).resize(W, H).toBuffer());
  await page.close();
}
const cols = azs.split(',').length, rows = Math.ceil(tiles.length / cols);
await sharp({create: {width: W * cols, height: H * rows, channels: 3, background: '#222'}}).composite(tiles.map((input, i) => ({input, left: (i % cols) * W, top: Math.floor(i / cols) * H}))).png().toFile(out);
console.log('wrote', out); await browser.close(); server.stop();
