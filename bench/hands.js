// Two low-poly arms with articulated hands. Original geometry (boxes), driven by two-bone IK.
// A hand's local +Y runs along the fingers, +Z is the back of the hand, the palm faces -Z;
// curling a finger rotates it about X toward -Z. The right hand's thumb is on +X, the left's on -X.
import * as T from 'three';
import {solveTwoBone} from './ik.js';

const UPPER = 0.4,
  FORE = 0.38;

function box(w, h, d, y, parent, material) {
  const m = new T.Mesh(new T.BoxGeometry(w, h, d), material);
  m.position.y = y;
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}

function buildHand(side, skin, glove) {
  const root = new T.Group(),
    fingers = [];
  box(0.085, 0.075, 0.034, 0.045, root, glove); // palm
  for (let i = 0; i < 4; i++) {
    const length = i === 3 ? 0.052 : 0.062,
      base = new T.Group();
    base.position.set((i - 1.5) * 0.021, 0.085, 0);
    root.add(base);
    box(0.019, length, 0.02, length / 2, base, glove);
    const tip = new T.Group();
    tip.position.y = length;
    base.add(tip);
    box(0.017, 0.04, 0.018, 0.02, tip, glove);
    fingers.push({base, tip});
  }
  const thumb = new T.Group();
  thumb.position.set((side === 'R' ? 1 : -1) * 0.046, 0.03, -0.004);
  root.add(thumb);
  box(0.024, 0.06, 0.024, 0.03, thumb, glove);
  const wrist = box(0.07, 0.04, 0.05, -0.01, root, skin); // cuff
  wrist.castShadow = true;
  return {root, fingers, thumb, side};
}

/** curl 0 open .. 1 fist; pinch 0..1 brings the thumb across toward the index finger. */
function poseHand(h, curl, pinch) {
  h.fingers.forEach(({base, tip}, i) => {
    const k = i === 0 ? 1 - 0.35 * pinch : 1;
    base.rotation.x = -curl * k * 1.15;
    tip.rotation.x = -curl * 1.25;
  });
  const s = h.side === 'R' ? 1 : -1;
  h.thumb.rotation.set(-0.3 - curl * 0.3, 0, -s * (0.55 + pinch * 0.45));
}

export class Arms {
  /** @param {{R: number[], L: number[]}} shoulders world positions @param {number} sleeveColor */
  constructor(shoulders, sleeveColor = 0x55603f) {
    this.group = new T.Group();
    this.group.name = 'arms';
    const sleeve = new T.MeshStandardMaterial({color: sleeveColor, roughness: 0.9, flatShading: true}),
      glove = new T.MeshStandardMaterial({color: 0x2c2f2a, roughness: 0.85, flatShading: true}),
      skin = new T.MeshStandardMaterial({color: 0xba8c69, roughness: 0.8, flatShading: true});
    this.side = {};
    for (const s of ['R', 'L']) {
      const upper = new T.Mesh(new T.BoxGeometry(0.085, UPPER, 0.085), sleeve),
        fore = new T.Mesh(new T.BoxGeometry(0.07, FORE, 0.07), sleeve),
        hand = buildHand(s, skin, glove);
      for (const m of [upper, fore]) {
        m.castShadow = m.receiveShadow = true;
        this.group.add(m);
      }
      this.group.add(hand.root);
      this.side[s] = {upper, fore, hand, shoulder: new T.Vector3(...shoulders[s]), home: new T.Vector3(...shoulders[s]), error: 0};
    }
  }

  /**
   * Reach with one hand. `target` is the wrist position; `forward` the direction the fingers should point.
   * @param {'R'|'L'} s
   */
  reach(s, target, forward, {curl = 0.3, pinch = 0, lean = 0.35} = {}) {
    const a = this.side[s];
    // The operator leans toward the work: the shoulder follows the target a little along x.
    a.shoulder.x = a.home.x + (target.x - a.home.x) * lean;
    const pole = new T.Vector3(s === 'R' ? 0.6 : -0.6, -1, -0.2);
    const ik = solveTwoBone(a.shoulder, target, UPPER, FORE, pole);
    a.error = ik.clamped ? target.distanceTo(ik.wrist) : 0;
    const place = (mesh, from, to) => {
      mesh.position.copy(from).add(to).multiplyScalar(0.5);
      mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), to.clone().sub(from).normalize());
    };
    place(a.upper, a.shoulder, ik.elbow);
    place(a.fore, ik.elbow, ik.wrist);
    // Hand basis: y along the fingers (blend of forearm direction and the requested direction), palm down.
    const y = ik.wrist.clone().sub(ik.elbow).normalize().lerp(forward.clone().normalize(), 0.6).normalize();
    const up = Math.abs(y.y) > 0.97 ? new T.Vector3(0, 0, -1) : new T.Vector3(0, 1, 0);
    const x = new T.Vector3().crossVectors(y, up).normalize(),
      z = new T.Vector3().crossVectors(x, y);
    a.hand.root.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(x, y, z));
    a.hand.root.position.copy(ik.wrist);
    poseHand(a.hand, curl, pinch);
    return a.error;
  }
}
