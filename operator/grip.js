// Hands on the carried rifle: the rifle is placed per pose in body space, then a two-bone IK puts each
// gripping hand on it (right hand on the pistol grip, left hand under the handguard).
//
// Skeleton facts (UE5 mannequin, measured): every arm bone points along local +Y; on a hand, +Y runs
// wrist -> knuckles, the palm faces +Z, and pinky -> index is +X on the right hand and -X on the left.
// Rifle frame (workbench models): +x muzzle, +y top rail, +z the rifle's right side, origin at the
// pistol-grip socket.
import * as T from 'three';

// Where each grip sits on the rifle, and how the hand lies on it (rifle frame).
//   at:     the point the palm closes around
//   finger: wrist -> knuckles direction
//   side:   pinky -> index direction
export const GRIPS = {
  // Pistol grip: the grip rakes ~20 degrees back; index finger on top by the trigger, palm on the right side.
  grip: {at: [-0.028, -0.058, 0], finger: [0.94, -0.34, 0], side: [0.34, 0.94, 0]},
  // Support hand under the handguard: index toward the muzzle, fingers wrapping up the right side.
  handguard: {at: [0.3, 0.008, 0], finger: [0, 0.35, 1], side: [1, 0, 0]},
};
// The grip centre in hand space: along the fingers and a little off the palm (metres).
const PALM = new T.Vector3(0, 0.072, 0.028);

const X = new T.Vector3(),
  Y = new T.Vector3(),
  Z = new T.Vector3(),
  v1 = new T.Vector3(),
  v2 = new T.Vector3(),
  v3 = new T.Vector3(),
  m = new T.Matrix4(),
  q = new T.Quaternion(),
  qp = new T.Quaternion();

/** A world quaternion from two directions: local +Y maps to `y`, local `nLocal` maps (as near as possible) to `n`. */
function basis(y, n, nLocal, out) {
  Y.copy(y).normalize();
  Z.copy(n).addScaledVector(Y, -n.dot(Y)).normalize(); // n made orthogonal to y
  X.crossVectors(Y, Z);
  m.makeBasis(X, Y, Z);
  const world = out.setFromRotationMatrix(m);
  // nLocal is orthogonal to +Y; turn it onto +Z first so the basis above lands it on n.
  const a = Math.atan2(nLocal.x, nLocal.z);
  return world.multiply(q.setFromAxisAngle(v3.set(0, 1, 0), -a));
}

/** Set a bone's world rotation. */
function setWorld(bone, world) {
  bone.parent.getWorldQuaternion(qp).invert();
  bone.quaternion.copy(qp).multiply(world);
  bone.updateMatrixWorld(true);
}

export class Grip {
  /** @param {Map<string, T.Bone>} bones  @param {Map<string, {world: T.Quaternion}>} rest */
  constructor(bones, rest, profile = {}) {
    this.bones = bones;
    this.grips = {...GRIPS, ...profile.grips};
    this.palms = Object.fromEntries(
      ['r', 'l'].map(side => [side, profile.palms?.[side] ? new T.Vector3(...profile.palms[side]) : PALM.clone()]),
    );
    this.arms = {};
    for (const side of ['r', 'l']) {
      const U = bones.get(`upperarm_${side}`),
        L = bones.get(`lowerarm_${side}`),
        H = bones.get(`hand_${side}`);
      if (!U || !L || !H) continue;
      // Elbow hinge in the upper arm's frame: the rig's poses bend the forearm about the character's X axis.
      const uRest = rest.get(U.name).world,
        lRest = rest.get(L.name).world;
      const upDir = new T.Vector3(0, 1, 0).applyQuaternion(uRest),
        fore = new T.Vector3(0, 1, 0).applyQuaternion(lRest).applyAxisAngle(new T.Vector3(1, 0, 0), -Math.PI / 2);
      const hingeLocal = new T.Vector3().crossVectors(upDir, fore).normalize().applyQuaternion(uRest.clone().invert());
      this.arms[side] = {
        U,
        L,
        H,
        hingeLocal,
        lRel: uRest.clone().invert().multiply(lRest), // forearm in the upper arm's frame at rest
        hRest: rest.get(H.name).local,
        twist: [`lowerarm_twist_01_${side}`, `lowerarm_twist_02_${side}`]
          .filter(n => bones.has(n))
          .map(n => ({bone: bones.get(n), rest: rest.get(n).local})),
      };
    }
  }

  /** Desired world rotation of a hand holding grip `g` on a rifle with world rotation `rifleQ`. */
  handRotation(side, g, rifleQ, out) {
    const f = v1.fromArray(g.finger).normalize().applyQuaternion(rifleQ),
      s = v2.fromArray(g.side).applyQuaternion(rifleQ);
    s.addScaledVector(f, -s.dot(f)).normalize();
    // local +X is pinky->index on the right hand and index->pinky on the left
    if (side === 'l') s.negate();
    Y.copy(f);
    X.copy(s);
    Z.crossVectors(X, Y);
    return out.setFromRotationMatrix(m.makeBasis(X, Y, Z));
  }

  /**
   * Put hand `side` on grip `gripId` of the rifle (world matrix `rifleWorld`).
   * @param {T.Vector3} pole  world direction the elbow should point
   * @param {number} weight   0 = leave the pose alone, 1 = full IK
   */
  solve(side, gripId, rifleWorld, pole, weight = 1) {
    const arm = this.arms[side],
      g = typeof gripId === 'string' ? this.grips[gripId] : gripId;
    if (!arm || !g || weight <= 0) return;
    const {U, L, H} = arm;
    const fk = weight < 1 ? [U.quaternion.clone(), L.quaternion.clone(), H.quaternion.clone()] : null;
    const rifleQ = new T.Quaternion(),
      rifleP = new T.Vector3();
    rifleWorld.decompose(rifleP, rifleQ, v3);
    const handQ = this.handRotation(side, g, rifleQ, new T.Quaternion());
    // Wrist target: the grip point minus the palm offset carried by the hand's rotation.
    const gripW = new T.Vector3().fromArray(g.at).applyMatrix4(rifleWorld);
    const wrist = gripW.sub(this.palms[side].clone().applyQuaternion(handQ));
    const S = U.getWorldPosition(new T.Vector3());
    const a = L.getWorldPosition(new T.Vector3()).distanceTo(S),
      b = H.getWorldPosition(new T.Vector3()).distanceTo(L.getWorldPosition(new T.Vector3()));
    const toW = wrist.clone().sub(S);
    const d = Math.min(Math.max(toW.length(), Math.abs(a - b) + 1e-4), a + b - 1e-4);
    const u = toW.normalize();
    const p = pole.clone().addScaledVector(u, -pole.dot(u));
    if (p.lengthSq() < 1e-8) p.set(0, -1, 0).addScaledVector(u, -u.y);
    p.normalize();
    const cosA = (a * a + d * d - b * b) / (2 * a * d),
      sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
    const E = S.clone()
      .addScaledVector(u, a * cosA)
      .addScaledVector(p, a * sinA);
    const W = S.clone().addScaledVector(u, d);
    // Upper arm: bone axis to the elbow, hinge normal to the bend plane.
    const upperDir = E.clone().sub(S),
      foreDir = W.clone().sub(E);
    const n = new T.Vector3().crossVectors(upperDir, foreDir);
    if (n.lengthSq() < 1e-10) n.copy(p).cross(u);
    const uQ = basis(upperDir, n.normalize(), arm.hingeLocal, new T.Quaternion());
    setWorld(U, uQ);
    // Forearm: the rest relation to the upper arm, swung about the hinge until it points at the wrist.
    const lQ = uQ.clone().multiply(arm.lRel);
    const cur = new T.Vector3(0, 1, 0).applyQuaternion(lQ);
    lQ.premultiply(new T.Quaternion().setFromUnitVectors(cur, foreDir.normalize()));
    setWorld(L, lQ);
    setWorld(H, handQ);
    // Spread the wrist's roll along the forearm's twist bones so the skin does not candy-wrap.
    const twist = this.twistAngle(arm.hRest, H.quaternion);
    arm.twist.forEach(({bone, rest}, i) => {
      bone.quaternion.copy(rest).multiply(q.setFromAxisAngle(v3.set(0, 1, 0), twist * (i ? 0.66 : 0.33)));
      bone.updateMatrixWorld(true);
    });
    if (fk) {
      U.quaternion.slerpQuaternions(fk[0], U.quaternion, weight);
      L.quaternion.slerpQuaternions(fk[1], L.quaternion, weight);
      H.quaternion.slerpQuaternions(fk[2], H.quaternion, weight);
      U.updateMatrixWorld(true);
    }
  }

  /** Roll of the hand about the forearm axis against its rest rotation (swing-twist about +Y, radians). */
  twistAngle(restLocal, local) {
    const r = restLocal.clone().invert().multiply(local);
    const t = new T.Quaternion(0, r.y, 0, r.w).normalize();
    let ang = 2 * Math.atan2(t.y, t.w);
    if (ang > Math.PI) ang -= 2 * Math.PI;
    if (ang < -Math.PI) ang += 2 * Math.PI;
    return ang;
  }
}
