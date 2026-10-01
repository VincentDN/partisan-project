// Authoring helper: solve arm angles so a hand reaches a target (world metres, character space).
// Pose files stay plain data (operator/poses.json); this only suggests numbers to paste in.
//
//   node tools/pose-fit.mjs <poseId> <side r|l> <x,y,z | w:px,py,pz> [weapon=ak74m] [lowerZ=1]
// lowerZ=1 lets the elbow also roll about the front-back axis (arms raised sideways, e.g. a salute).
//
// Target forms: "x,y,z" world position, or "w:px,py,pz" = a point in the carried rifle's frame
// (grip at origin, +x muzzle), so a support hand can be fitted to the handguard.
// Needs a static server on :8123 (npm run serve) and playwright-core with a Chromium.
import {chromium} from 'playwright-core';

const [poseId, side, targetArg, ...rest] = process.argv.slice(2);
if (!poseId || !side || !targetArg) {
  console.error('usage: node tools/pose-fit.mjs <poseId> <r|l> <x,y,z|w:x,y,z> [weapon=ak74m]');
  process.exit(1);
}
const opts = Object.fromEntries(rest.map(a => a.split('=')));
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({viewport: {width: 900, height: 600}});
await page.goto(`http://localhost:8123/operator/#${opts.weapon ? 'weapon=' + opts.weapon : ''}`);
await page.waitForFunction(() => window.PARP_OPERATOR?.ready, null, {timeout: 30000});
await page.waitForTimeout(2500);

const result = await page.evaluate(
  async ({poseId, side, targetArg, lowerZ}) => {
    const o = window.PARP_OPERATOR,
      rig = o.rig,
      T = o.stage.T;
    o.set('pose', poseId);
    o.set('idle', 'off');
    for (let i = 0; i < 3; i++) await new Promise(r => requestAnimationFrame(r)); // let the frame loop place the weapon pivot
    const upper = `upperarm_${side}`,
      lower = `lowerarm_${side}`,
      hand = `hand_${side}`;
    let target;
    const place = () => {
      rig.update(0, 0, null, 0);
      o.stage.scene.updateMatrixWorld(true);
    };
    if (targetArg.startsWith('w:')) {
      const p = targetArg.slice(2).split(',').map(Number);
      place();
      // Weapon pivot is positioned in operator.js placeWeapon(); run one frame's worth by hand.
      const pivot = o.stage.scene.getObjectByName('weapon pivot');
      target = pivot.localToWorld(new T.Vector3(...p));
    } else target = new T.Vector3(...targetArg.split(',').map(Number));
    const base = {...rig.target};
    const get = v => {
      rig.target = {...base, [upper]: [v[0], v[1], v[2]], [lower]: [v[3], 0, v[4]]};
      rig.current = rig.target;
      place();
      return rig.bones.get(hand).getWorldPosition(new T.Vector3());
    };
    const cost = v => get(v).distanceToSquared(target) + 1e-6 * (v[0] ** 2 + v[1] ** 2 + v[2] ** 2 + v[3] ** 2);
    const lo = [-110, -60, side === 'r' ? -10 : -70, -150, lowerZ ? (side === 'r' ? -130 : -10) : 0],
      hi = [40, 60, side === 'r' ? 70 : 10, 5, lowerZ ? (side === 'r' ? 10 : 130) : 0];
    let best = null;
    for (let s = 0; s < 40; s++) {
      let v = lo.map((l, i) => l + Math.random() * (hi[i] - l)),
        c = cost(v),
        step = 30;
      while (step > 0.25) {
        let improved = false;
        for (let i = 0; i < v.length; i++)
          for (const d of [-step, step]) {
            const w = [...v];
            w[i] = Math.min(hi[i], Math.max(lo[i], w[i] + d));
            const cw = cost(w);
            if (cw < c) {
              v = w;
              c = cw;
              improved = true;
            }
          }
        if (!improved) step /= 2;
      }
      if (!best || c < best.c) best = {v, c};
    }
    const reached = get(best.v);
    return {
      [upper]: best.v.slice(0, 3).map(Math.round),
      [lower]: [Math.round(best.v[3]), 0, Math.round(best.v[4])],
      error_m: +Math.sqrt(reached.distanceToSquared(target)).toFixed(3),
      target: target.toArray().map(n => +n.toFixed(2)),
    };
  },
  {poseId, side, targetArg, lowerZ: opts.lowerZ === '1'},
);
console.log(JSON.stringify(result));
await browser.close();
