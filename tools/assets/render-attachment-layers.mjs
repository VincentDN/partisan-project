// Render a rifle in the Weapon Modder's 3/4 view as transparent PNG layers for a layered TIFF/PSD placement guide:
// the rifle as built at the factory, then every attachment it can take, one per layer, each alone at its default
// mount position (drawn over the rifle, not hidden by it). layers.json also gives each mount point's pixel position,
// which tools/assets/layered-tiff.py draws as a layer of its own.
//   node tools/assets/render-attachment-layers.mjs [rifle=stg44] [outDir=build/layers-<rifle>] [width=3000] [height=2000]
import fs from 'node:fs';
import path from 'node:path';
import {launch, open, startServer} from '../../tests/e2e/browser.mjs';

const [rifleId = 'stg44', outDir = `build/layers-${rifleId}`, W = '3000', H = '2000'] = process.argv.slice(2);
fs.mkdirSync(outDir, {recursive: true});
const server = await startServer(8188),
  browser = await launch();
const page = await open(browser, `${server.url}workbench/#rifle=${rifleId}`, {viewport: {width: 1400, height: 900}});
page.on('pageerror', e => console.error('page error:', e.message));
await page.waitForFunction(id => window.PARP_WORKBENCH?.rifle?.id === id && document.querySelector('#status').hidden, rifleId, {
  timeout: 90000,
});
await page.locator('[data-view="three"]').click();
await page.waitForTimeout(2500);

// build every attachment once (files load asynchronously), then render layer by layer
const plan = await page.evaluate(async () => {
  const r = window.PARP_WORKBENCH.rifle;
  const {buildOption} = await import('./rifle-instance.js');
  for (const [slot, s] of Object.entries(r.slots)) for (const o of s.options) buildOption(r, slot, o);
  const out = [];
  for (const [slot, s] of Object.entries(r.slots))
    for (const o of s.options) if (o.object) out.push({slot, id: o.id, label: o.label, slotLabel: s.spec.label});
  return out;
});
await page.waitForTimeout(4000);

const layers = await page.evaluate(
  async ({W, H}) => {
    const T = await import('three');
    const wb = window.PARP_WORKBENCH,
      {renderer, scene, camera} = wb.stage,
      r = wb.rifle;
    renderer.setAnimationLoop(null);
    const bg = scene.background,
      floor = wb.stage.floor;
    scene.background = null;
    floor.visible = false;
    renderer.setPixelRatio(1);
    renderer.setSize(W, H, false);
    renderer.setClearColor(0x000000, 0);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    // factory build: every slot on its first (factory) option, at offset 0
    const factory = new Map();
    for (const s of Object.values(r.slots)) {
      const f = s.options[0];
      s.original.visible = !!f.original;
      for (const o of s.options) if (o.object) o.object.visible = o === f;
      s.container.position.copy(s.base);
      factory.set(s, f);
    }
    const shot = () => {
      renderer.render(scene, camera);
      return renderer.domElement.toDataURL('image/png');
    };
    const out = [{name: '00 Rifle (factory build)', png: shot()}];
    // attachments alone: hide the whole model, then show one option's object
    const shown = [];
    r.model.traverse(o => o.isMesh && o.visible && shown.push(o));
    for (const m of shown) m.visible = false;
    let i = 1;
    for (const [slot, s] of Object.entries(r.slots))
      for (const o of s.options) {
        if (!o.object || o === factory.get(s)) continue;
        for (const x of s.options) if (x.object) x.object.visible = x === o;
        o.object.traverse(m => m.isMesh && (m.visible = true));
        out.push({name: `${String(i++).padStart(2, '0')} ${s.spec.label}: ${o.label}`, png: shot()});
        o.object.visible = false;
      }
    // mount points: where each slot sits on the rifle, projected to the image (pixels)
    r.model.updateMatrixWorld(true);
    const mounts = Object.entries(r.slots).map(([slot, s]) => {
      const p = s.container.getWorldPosition(new T.Vector3()).project(camera);
      return {slot, label: s.spec.label, x: ((p.x + 1) / 2) * W, y: ((1 - p.y) / 2) * H};
    });
    for (const m of shown) m.visible = true;
    scene.background = bg;
    return {out, mounts, camera: {position: camera.position.toArray(), fov: camera.fov}};
  },
  {W: Number(W), H: Number(H)},
);
const manifest = [];
for (const [k, l] of layers.out.entries()) {
  const file = `${String(k).padStart(2, '0')}.png`;
  fs.writeFileSync(path.join(outDir, file), Buffer.from(l.png.split(',')[1], 'base64'));
  manifest.push({file, name: l.name});
}
fs.writeFileSync(
  path.join(outDir, 'layers.json'),
  JSON.stringify({rifle: rifleId, width: +W, height: +H, layers: manifest, mounts: layers.mounts, camera: layers.camera, plan}, null, 1),
);
console.log(`${manifest.length} layers -> ${outDir}`);
await browser.close();
process.exit(0);
