// Pose and idle animation for the Base Operator skeleton (UE5-mannequin-style, 83 bones).
//
// Poses are DATA (operator/poses.json), not code: for each bone a rotation in degrees, expressed
// in CHARACTER space (x = pitch about the left-right axis, y = turn about the vertical, z = roll
// about the front-back axis), applied on top of the bone's rest pose. This keeps poses
// independent of the skeleton's internal bone axes, which is what makes them authorable by eye
// and portable to the Recon / Insurgent / Enforcer bases when they share the skeleton.
//
// Maths: with R the character-space delta and W the bone's rest world orientation,
//   local = restLocal * W^-1 * R * W
// so the delta turns the bone about character axes, and children inherit it through the hierarchy.
//
// Idle animation is layered on top: sine "layers" per bone/axis (breathing, weight shift, head
// scan). Everything is deterministic from time, so tests can sample it without a renderer.
import * as T from 'three';

const DEG = Math.PI / 180;
const AXES = {x: 0, y: 1, z: 2};
// Finger bones that curl with the `curl` macro, per hand: [bone, degrees at curl = 1].
const FINGER_CURL = [
  ['index_01', 62], ['index_02', 78], ['index_03', 52],
  ['middle_01', 66], ['middle_02', 82], ['middle_03', 54],
  ['ring_01', 70], ['ring_02', 84], ['ring_03', 52],
  ['pinky_01', 72], ['pinky_02', 86], ['pinky_03', 50],
];
const THUMB_CURL = [['thumb_01', 18, 'y'], ['thumb_02', 34, 'z'], ['thumb_03', 40, 'z']];

export class Rig {
  /** @param {T.Object3D} root the loaded glTF scene containing the skeleton */
  constructor(root, data) {
    this.root = root;
    this.data = data;
    this.bones = new Map();
    root.updateMatrixWorld(true);
    root.traverse(o => { if (o.isBone) this.bones.set(o.name, o); });
    this.order = [...this.bones.keys()]; // traverse() visits parents before children
    this.rest = new Map();
    for (const [name, bone] of this.bones) {
      const world = bone.getWorldQuaternion(new T.Quaternion());
      this.rest.set(name, {local: bone.quaternion.clone(), world, worldInv: world.clone().invert()});
    }
    this.current = {};          // blended base deltas: {bone: [x,y,z]}
    this.target = {};
    this.blend = 1;
    this.poseId = null;
    this.lower = 0;             // metres the whole body is lowered (crouch, kneel); blended like the bone deltas
    this.targetLower = 0;
    this._r = new T.Quaternion();
    this._e = new T.Euler();
  }

  /** Expand a pose's `bones` plus `curl` macros into one {bone: [x,y,z]} table. */
  static expand(pose) {
    const out = {};
    for (const [bone, d] of Object.entries(pose.bones || {})) out[bone] = [...d];
    for (const side of ['r', 'l']) {
      const c = pose.curl?.[side];
      if (!c) continue;
      const sign = side === 'r' ? 1 : -1; // fingers close toward the palm: +z on the right hand, -z on the left
      for (const [b, deg] of FINGER_CURL) out[`${b}_${side}`] = [0, 0, sign * deg * c];
      for (const [b, deg, axis] of THUMB_CURL) {
        const v = [0, 0, 0];
        v[AXES[axis]] = sign * deg * c;
        out[`${b}_${side}`] = v;
      }
    }
    return out;
  }

  /** Switch to a named pose; blends over `seconds` (instantly when 0). */
  setPose(id, seconds = 0.6) {
    const pose = this.data.poses[id];
    if (!pose) throw new Error(`Unknown pose "${id}"`);
    this.poseId = id;
    this.target = Rig.expand(pose);
    this.targetLower = pose.lower || 0;
    if (seconds <= 0) { this.current = structuredClone(this.target); this.lower = this.targetLower; this.blend = 1; }
    else { this.from = structuredClone(this.current); this.fromLower = this.lower; this.blend = 0; this.blendSeconds = seconds; }
  }

  /** Idle layer sum for one bone at time t: {x,y,z} degrees. Pure function of (idle, bone, t). */
  static idleDelta(idle, bone, t) {
    const d = [0, 0, 0];
    for (const l of idle?.layers || []) {
      if (l.bone !== bone) continue;
      d[AXES[l.axis]] += (l.offset || 0) + l.amp * Math.sin((t * l.hz + (l.phase || 0)) * Math.PI * 2);
    }
    return d;
  }

  /**
   * Advance blending and write bone rotations.
   * @param {number} dt seconds
   * @param {number} t  absolute time for idle layers
   * @param {string|null} idleId  key of data.idles, or null for a held pose
   * @param {number} idleScale  0 under reduced motion
   */
  update(dt, t, idleId = null, idleScale = 1) {
    if (this.blend < 1) {
      this.blend = Math.min(1, this.blend + dt / this.blendSeconds);
      const k = this.blend * this.blend * (3 - 2 * this.blend); // smoothstep
      const names = new Set([...Object.keys(this.from || {}), ...Object.keys(this.target)]);
      this.lower = this.fromLower + (this.targetLower - this.fromLower) * k;
      this.current = {};
      for (const n of names) {
        const a = this.from?.[n] || [0, 0, 0], b = this.target[n] || [0, 0, 0];
        this.current[n] = [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
      }
    }
    const idle = idleId ? this.data.idles[idleId] : null;
    for (const name of this.order) {
      const bone = this.bones.get(name), rest = this.rest.get(name);
      const base = this.current[name];
      let x = base?.[0] || 0, y = base?.[1] || 0, z = base?.[2] || 0;
      if (idle && idleScale) {
        const i = Rig.idleDelta(idle, name, t);
        x += i[0] * idleScale; y += i[1] * idleScale; z += i[2] * idleScale;
      }
      if (!x && !y && !z) { bone.quaternion.copy(rest.local); continue; }
      this._r.setFromEuler(this._e.set(x * DEG, y * DEG, z * DEG, 'XYZ'));
      bone.quaternion.copy(rest.local).multiply(rest.worldInv).multiply(this._r).multiply(rest.world);
    }
  }
}
