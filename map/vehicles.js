// Shared 3-D convoy models for both campaign map styles; no operator rig or weapon dependencies.
import * as T from 'three';
import {loadModel} from '../shared/model-cache.js';
const VEHICLE_SCALE = 1.3;

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
