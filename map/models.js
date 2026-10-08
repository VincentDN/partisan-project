// Lazy-loaded figures and vehicles for the optional fully 3-D overworld demo.
import * as T from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import {loadTemplate, loadModel} from '../shared/model-cache.js';
import {Rig} from '../operator/rig.js';
import {Grip, GRIPS} from '../operator/grip.js';
import {posesForProfile} from '../operator/pose-profile.js';
import {BASES} from '../operator/config.js';
import {loadRifle} from '../workbench/rifle-instance.js';
import {applyLoadout, emptyLoadout} from '../workbench/apply-loadout.js';

const FIGURE_SCALE = 3.2; // map units per metre for people (token scale: a party reads at a glance)
const VEHICLE_SCALE = 1.3; // and for vehicles (a little under the people, so a column is not larger than a village)
const POLES = {r: [-0.5, -1, -0.45], l: [0.6, -1, -0.3]};
const recon = BASES['generated-recon'];
let poseData = null;

/** A posed figure holding a rifle: {root, update(dt, t)}. `paint` recolours the uniform (enemies). */
export async function figure3d({pose, idle, rifle = 'ak74m', paint = null}) {
  poseData ??= await (await fetch(new URL('../operator/poses.json', import.meta.url))).json();
  const root = new T.Group();
  const body = SkeletonUtils.clone(await loadTemplate(new URL(recon.model, new URL('../operator/', import.meta.url)).href));
  body.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = true;
    o.frustumCulled = false;
    if (paint && /^M_GR_/.test(o.material.name) && !/skin|face|eye|hair|lash|brow/i.test(o.material.name)) {
      o.material = o.material.clone();
      o.material.color.multiply(new T.Color(paint));
    }
  });
  root.add(body);
  const rig = new Rig(body, posesForProfile(poseData, recon.poseProfile));
  rig.grip = new Grip(rig.bones, rig.rest, recon.grip);
  rig.setPose(pose, 0);
  // the rifle, as the Operator Customiser carries it: grip socket at the pivot, hands solved onto it
  const r = await loadRifle(rifle);
  applyLoadout(r, emptyLoadout(rifle), {value: 0});
  const grip = r.sockets.find(s => s.userData.id === 'grip');
  const gp = grip ? r.model.worldToLocal(grip.getWorldPosition(new T.Vector3())) : new T.Vector3();
  const pivot = new T.Group();
  r.model.position.sub(gp);
  pivot.add(r.model);
  r.model.traverse(o => o.isMesh && (o.castShadow = true));
  root.add(pivot);
  const w = rig.data.poses[pose].weapon;
  const anchor = new T.Vector3(),
    mx = new T.Vector3(),
    my = new T.Vector3(),
    mz = new T.Vector3(),
    basis = new T.Matrix4(),
    pole = new T.Vector3();
  root.scale.setScalar(FIGURE_SCALE);
  return {
    root,
    rig,
    update(dt, t) {
      rig.update(dt, t, idle, 1);
      body.position.y = -rig.lower;
      if (!w) return;
      root.updateMatrixWorld(true);
      root.worldToLocal(rig.bones.get(w.anchor || 'spine_03').getWorldPosition(anchor));
      mx.fromArray(w.muzzle).normalize();
      my.fromArray(w.up);
      my.addScaledVector(mx, -my.dot(mx)).normalize();
      mz.crossVectors(mx, my);
      pivot.quaternion.setFromRotationMatrix(basis.makeBasis(mx, my, mz));
      pivot.position.fromArray(w.hold).add(anchor).sub(mx.fromArray(GRIPS.grip.at).applyQuaternion(pivot.quaternion));
      pivot.updateMatrixWorld(true);
      for (const [side, gripId] of Object.entries(w.hands || {r: 'grip'})) {
        pole.fromArray(w.pole?.[side] || POLES[side]).transformDirection(root.matrixWorld);
        const at = r.config.handguardAt;
        rig.grip.solve(side, gripId === 'handguard' && at ? {...GRIPS.handguard, at} : gripId, pivot.matrixWorld, pole, 1);
      }
    },
  };
}

// ---------- vehicles ----------
const VEHICLES = {
  matv: {file: 'matv.glb', length: 6.3},
  truck: {file: 'army-truck.glb', length: 8},
  humvee: {file: 'humvee.glb', length: 4.9},
};
/** A vehicle laid along +x (its front), wheels on y = 0, at token scale. */
export async function vehicle3d(id) {
  const v = VEHICLES[id];
  const model = await loadModel(new URL(`../assets/models/vehicles/${v.file}`, import.meta.url).href);
  const holder = new T.Group();
  holder.add(model);
  model.updateMatrixWorld(true);
  let box = new T.Box3().setFromObject(model);
  const size = box.getSize(new T.Vector3());
  if (size.z > size.x) model.rotation.y = Math.PI / 2; // the long side along x
  model.updateMatrixWorld(true);
  box = new T.Box3().setFromObject(model);
  const s = (v.length * VEHICLE_SCALE) / box.getSize(new T.Vector3()).x;
  model.scale.multiplyScalar(s);
  model.updateMatrixWorld(true);
  box = new T.Box3().setFromObject(model);
  const c = box.getCenter(new T.Vector3());
  model.position.sub(new T.Vector3(c.x, box.min.y, c.z));
  holder.traverse(o => o.isMesh && (o.castShadow = true));
  return holder;
}
