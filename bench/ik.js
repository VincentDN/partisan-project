// Analytic two-bone IK: place the elbow so shoulder->elbow->wrist keeps the bone lengths and bends toward `pole`.
import * as T from 'three';

/**
 * @param {T.Vector3} shoulder
 * @param {T.Vector3} target  where the wrist should be
 * @param {number} upper  upper-arm length
 * @param {number} fore   forearm length
 * @param {T.Vector3} pole  direction the elbow prefers (need not be unit or perpendicular)
 * @returns {{elbow: T.Vector3, wrist: T.Vector3, reach: number, clamped: boolean}}
 */
export function solveTwoBone(shoulder, target, upper, fore, pole) {
  const to = target.clone().sub(shoulder);
  let d = to.length();
  const max = upper + fore - 1e-4,
    min = Math.abs(upper - fore) + 1e-4;
  const clamped = d > max || d < min;
  d = Math.min(max, Math.max(min, d));
  const dir = to.lengthSq() ? to.clone().normalize() : new T.Vector3(0, 0, 1);
  const wrist = shoulder.clone().addScaledVector(dir, d);
  // Distance along the shoulder->wrist line to the elbow's foot, and its height off that line.
  const along = (upper * upper - fore * fore + d * d) / (2 * d),
    height = Math.sqrt(Math.max(0, upper * upper - along * along));
  const side = pole.clone().addScaledVector(dir, -pole.dot(dir));
  if (side.lengthSq() < 1e-8) side.set(0, 1, 0).addScaledVector(dir, -dir.y);
  side.normalize();
  const elbow = shoulder.clone().addScaledVector(dir, along).addScaledVector(side, height);
  return {elbow, wrist, reach: d, clamped};
}
