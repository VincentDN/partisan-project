// Fit inspection hands to the pose's reference rifle frame even when no weapon is rendered.
import * as T from 'three';
import {GRIPS} from './grip.js';
export function referenceGrip(rig) {
  const w = rig.data.poses[rig.poseId]?.weapon;
  if (!w) return;
  const x = new T.Vector3(...w.muzzle).normalize(),
    y = new T.Vector3(...w.up);
  y.addScaledVector(x, -y.dot(x)).normalize();
  const q = new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(x, y, new T.Vector3().crossVectors(x, y)));
  const p = rig.bones
    .get(w.anchor || 'spine_03')
    .getWorldPosition(new T.Vector3())
    .add(new T.Vector3(...w.hold))
    .sub(new T.Vector3(...GRIPS.grip.at).applyQuaternion(q));
  const matrix = new T.Matrix4().compose(p, q, new T.Vector3(1, 1, 1));
  const poles = {r: [-0.5, -1, -0.45], l: [0.6, -1, -0.3]};
  for (const [side, grip] of Object.entries(w.hands || {r: 'grip'}))
    rig.grip.solve(side, grip, matrix, new T.Vector3(...(w.pole?.[side] || poles[side])), 1);
  return matrix;
}
