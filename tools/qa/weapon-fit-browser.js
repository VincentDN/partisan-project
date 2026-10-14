// Browser geometry and visual audit of every weapon/attachment choice, using the production instance builder.
import * as T from 'three';
import {checkFits} from './weapon-fit-checks.js';
import {MODELS} from '../../workbench/models.js';
import {loadRifle, buildOption, applySlotState} from '../../workbench/rifle-instance.js';
import {localBounds} from '../../workbench/attachment-fit.js';

export async function audit({pictures = false} = {}) {
  const renderer = new T.WebGLRenderer({antialias: true, preserveDrawingBuffer: pictures});
  renderer.setSize(640, 280);
  renderer.setClearColor('#c8cdd2');
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.4;
  const scene = new T.Scene();
  scene.add(new T.HemisphereLight(0xffffff, 0x555555, 3));
  const key = new T.DirectionalLight(0xffffff, 3);
  key.position.set(-1, 2, 3);
  scene.add(key);
  const camera = new T.OrthographicCamera(-0.32, 0.32, 0.14, -0.14, 0.01, 10);
  const report = [];
  function render(target = [0, 0, 0], wide = false) {
    camera.zoom = wide ? 0.42 : 1;
    camera.updateProjectionMatrix();
    camera.position.set(target[0] + 0.16, target[1] + 0.12, target[2] + 3);
    camera.lookAt(...target);
    renderer.render(scene, camera);
    return renderer.domElement.toDataURL();
  }
  for (const id of Object.keys(MODELS)) {
    const rifle = await loadRifle(id),
      entry = {id, options: [], hero: null};
    scene.add(rifle.model);
    for (const [sid, slot] of Object.entries(rifle.slots))
      for (const o of slot.options) {
        const object = buildOption(rifle, sid, o);
        if (!object) continue;
        let mesh = false;
        object.traverse(m => {
          if (m.isMesh) mesh = true;
        });
        if (!mesh || object.userData.loading)
          await new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error(`${id}/${sid}/${o.id}: model did not load`)), 30000);
            object.addEventListener('loaded', () => {
              clearTimeout(timer);
              resolve();
            });
          });
      }
    const reset = () => {
      for (const [sid, slot] of Object.entries(rifle.slots)) applySlotState(rifle, sid, slot.options[0].id, 0);
    };
    for (const [sid, slot] of Object.entries(rifle.slots))
      for (const o of slot.options) {
        reset();
        applySlotState(rifle, sid, o.id, 0);
        const object = o.original ? slot.original : o.object;
        const b = object ? localBounds(object, rifle.model) : new T.Box3();
        const data = {slot: sid, option: o.id, empty: b.isEmpty(), min: b.min.toArray(), max: b.max.toArray()};
        if (object && !b.isEmpty()) {
          const centre = b.getCenter(new T.Vector3());
          if (pictures) data.png = render(centre.toArray(), ['stock', 'sling', 'handguard'].includes(sid));
        }
        entry.options.push(data);
      }
    entry.checks = checkFits(rifle, reset);
    reset();
    for (const [sid, choice] of Object.entries({optic: 'scope', foregrip: 'gp25', side: 'light', muzzle: 'can'}))
      applySlotState(rifle, sid, choice, 0);
    if (pictures) entry.hero = render([0, 0.035, 0], true);
    scene.remove(rifle.model);
    report.push(entry);
  }
  renderer.dispose();
  return report;
}
