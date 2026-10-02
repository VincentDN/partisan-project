// The earlier workbench's operator at the bench, with its articulated hands (restored from vincentdenil-site,
// ak15-workbench-intro/bench-hands.js). Same interface as bench/hands.js `Arms`, so Bench Lab can use either.
import * as T from 'three';
import {DEFAULT_OPERATOR, buildOperator} from '../shared/legacy-operator/operator.js';
import {solveArm} from '../shared/legacy-operator/field.js';

const DOWN = new T.Vector3(0, -1, 0);
const PALM = new T.Vector3(0, -0.024, 0); // palm centre in hand space

// Solve the wrist from a palm contact and then orient the palm in world space.
function solveContact(op, side, contact, orientation, pole) {
  const centre = PALM.clone().applyQuaternion(orientation);
  solveArm(op, side, contact.clone().sub(centre), pole, {handExtension: 0});
  const joint = op.joints['hand' + side];
  joint.quaternion.copy(joint.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(orientation));
  joint.updateWorldMatrix(true, false);
  return joint.localToWorld(PALM.clone()).distanceTo(contact);
}

// Bench-only articulated low-poly hands; the operator's own hand meshes are hidden.
function installHands(op) {
  const hands = {};
  for (const side of ['R', 'L']) {
    const joint = op.joints['hand' + side],
      original = joint.children.filter(o => o.isMesh);
    const material = original[0]?.material || new T.MeshStandardMaterial({color: 0xba8c69, roughness: 0.8});
    for (const m of original) m.visible = false;
    const group = new T.Group();
    joint.add(group);
    const fingers = [];
    const mesh = (w, h, d, y, parent) => {
      const m = new T.Mesh(new T.BoxGeometry(w, h, d), material);
      m.position.y = y;
      m.castShadow = m.receiveShadow = true;
      parent.add(m);
    };
    mesh(0.067, 0.048, 0.027, -0.024, group);
    for (let i = 0; i < 4; i++) {
      const base = new T.Group();
      base.position.set((i - 1.5) * 0.016, -0.046, 0);
      group.add(base);
      const length = i === 3 ? 0.019 : 0.024;
      mesh(0.013, length, 0.014, -length / 2, base);
      const tip = new T.Group();
      tip.position.y = -length;
      base.add(tip);
      mesh(0.012, 0.021, 0.013, -0.0105, tip);
      fingers.push({base, tip});
    }
    const thumb = new T.Group();
    thumb.position.set(side === 'R' ? 0.04 : -0.04, -0.021, 0.006);
    group.add(thumb);
    mesh(0.02, 0.034, 0.02, -0.017, thumb);
    hands[side] = {fingers, thumb};
  }
  return (side, curl = 0.6, pinch = 0) => {
    const h = hands[side];
    h.fingers.forEach(({base, tip}, i) => {
      base.rotation.x = -curl * (i === 0 && pinch ? 0.35 : 1) * 1.15;
      tip.rotation.x = -curl * 1.25;
    });
    h.thumb.rotation.set(-0.45 - curl * 0.35, 0, (side === 'R' ? -1 : 1) * (0.65 + pinch * 0.25));
  };
}

const LEAN = {hips: 0.1, spine: 0.16, chest: 0.18, neck: 0.08, head: 0.42};
const POLE = {R: new T.Vector3(-1, -0.6, -0.3), L: new T.Vector3(1, -0.6, -0.3)};

export class LegacyArms {
  /** @param {{position?: number[], tableTop?: number}} [opts] where the operator stands; the table top is at y = 0 in the scene */
  constructor({position = [0, 0, -0.47], tableTop = 0.86} = {}) {
    this.op = buildOperator({...DEFAULT_OPERATOR, headgear: 'none', gloves: 'none', pack: 'none'});
    this.op.root.traverse(m => {
      if (m.isMesh) m.castShadow = m.receiveShadow = true;
    });
    this.group = this.op.root;
    this.group.name = 'arms';
    this.group.position.set(position[0], position[1] - tableTop, position[2]);
    for (const [joint, x] of Object.entries(LEAN)) this.op.joints[joint].rotation.x = x;
    for (const side of ['R', 'L']) {
      this.op.joints['upperLeg' + side].rotation.x = -0.08;
      this.op.joints['lowerLeg' + side].rotation.x = 0.14;
    }
    this.pose = installHands(this.op);
    this.side = {R: {error: 0}, L: {error: 0}};
    this.group.updateMatrixWorld(true);
  }

  /** Reach with one hand: `target` is the wrist, `forward` where the fingers point (same meaning as Arms.reach). */
  reach(s, target, forward, {curl = 0.3, pinch = 0} = {}) {
    const dir = forward.clone().normalize();
    const palm = target.clone().addScaledVector(dir, 0.09 + PALM.y * 0); // palm sits a hand-length along the fingers
    const orientation = new T.Quaternion().setFromUnitVectors(DOWN, dir);
    this.group.updateMatrixWorld(true);
    const err = solveContact(this.op, s, palm, orientation, POLE[s]);
    this.pose(s, curl, pinch);
    this.side[s].error = err;
    return err;
  }
}
