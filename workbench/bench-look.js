// Weapon Workbench: the gunsmith-bench studio look from the StG 44 bench (warm key, cold rim, dusty floor, dark stage, canted rifle).
import * as T from 'three';
import {floorTexture} from './stg44/floor.js';

// Cant per camera view, in radians of roll about the rifle's bore: the showroom tilt, level for the flat views.
const CANT = {hero: 0.2, three: 0.2, muzzle: 0.1, left: 0, right: 0, top: 0};
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Lighting, floor and stage that follow the camera round the rifle, so the bench light holds from every angle.
 * The look is on while the Studio lighting is chosen and the warehouse room is off; the other lighting buttons
 * bring back the shared stage's own key light and shadow floor.
 * @param {any} st  the shared stage (shared/stage.js)
 * @param {{stageEl: HTMLElement, isOn: () => boolean, lightOffset: number}} opts
 */
export function installBenchLook(st, {stageEl, isOn, lightOffset}) {
  const {scene, controls, floor, key: stageKey} = st;
  const small = matchMedia('(max-width: 780px), (pointer: coarse)').matches;
  const rig = new T.Group();
  // a warm key from above the shooter's side, a cold rim from behind, a low orange kick
  const key = new T.SpotLight(0xffe2bd, 38, 6, 0.5, 0.6, 1.4);
  key.position.set(-0.7, 1.5, 1.5);
  key.castShadow = true;
  key.shadow.mapSize.setScalar(small ? 1024 : 2048);
  key.shadow.bias = -0.0003;
  key.shadow.radius = 4;
  const rim = new T.DirectionalLight(0x7fb4ff, 2.6);
  rim.position.set(1.2, 0.9, -1.6);
  const kick = new T.DirectionalLight(0xff9a5c, 0.7);
  kick.position.set(-1.5, -0.2, -0.6);
  rig.add(key, key.target, rim, rim.target, kick, kick.target, new T.HemisphereLight(0x8fa6c4, 0x0a0806, 0.35));
  // the dusty floor that catches the shadow in a pool of light, some way under the rifle so it seems to float
  const ground = new T.Mesh(new T.CircleGeometry(4, 48), new T.MeshStandardMaterial({map: floorTexture(), roughness: 0.92, metalness: 0}));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(rig, ground);
  const fog = new T.Fog(0x06080b, 2.2, 5.5);
  const slider = /** @type {HTMLInputElement|null} */ (document.querySelector('#light-rotation'));
  let cant = CANT.hero,
    cantTo = CANT.hero,
    was = null;

  function apply(on) {
    was = on;
    rig.visible = ground.visible = on;
    floor.visible = !on;
    stageKey.castShadow = !on;
    stageKey.intensity = on ? 0 : 1.6;
    scene.fog = on ? fog : null;
    scene.environmentIntensity = on ? 0.55 : 1;
    st.renderer.toneMappingExposure = on ? 1.05 : 1.1;
    stageEl.classList.toggle('bench-look', on);
    st.wake();
  }

  return {
    /** Ease toward the cant of a camera view (instant under reduced motion). */
    view(name) {
      cantTo = CANT[name] ?? 0;
      if (reduceMotion) cant = cantTo;
      st.wake(1200);
    },
    /** Per frame: cant the rifle (and anything that turns with it), keep the bench light on the camera side. */
    update(dt, rifleModel, followers = []) {
      const on = isOn();
      if (on !== was) apply(on);
      cant += (cantTo - cant) * (reduceMotion ? 1 : 1 - Math.exp(-dt * 6));
      for (const o of [rifleModel, ...followers]) {
        if (!o) continue;
        o.rotation.order = 'YXZ'; // yaw (turntable) first, then roll about the bore
        o.rotation.x = cant;
      }
      if (!on) return;
      const offset = T.MathUtils.degToRad((slider ? Number(slider.value) : lightOffset) - lightOffset);
      rig.position.copy(controls.target);
      rig.rotation.y = controls.getAzimuthalAngle() + offset;
      ground.position.set(controls.target.x, floor.position.y - 0.18, 0);
    },
    get animating() {
      return Math.abs(cantTo - cant) > 1e-4;
    },
  };
}
