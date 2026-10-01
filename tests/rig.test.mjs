// Rig maths and pose data: character-space deltas, idle layers, and poses.json vs the real skeleton.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';
import {Rig} from '../operator/rig.js';

const poseData = JSON.parse(fs.readFileSync('operator/poses.json', 'utf8'));
const manifest = JSON.parse(fs.readFileSync('assets/models/operators/base-operator.manifest.json', 'utf8'));

function chain(restRotY = 0) {
  const root = new T.Group();
  const a = new T.Bone(); a.name = 'a'; a.quaternion.setFromAxisAngle(new T.Vector3(0, 1, 0), restRotY);
  const b = new T.Bone(); b.name = 'b'; b.position.set(0, 0, 1);
  a.add(b); root.add(a); root.updateMatrixWorld(true);
  return {root, a, b};
}
const pos = bone => bone.getWorldPosition(new T.Vector3());
const near = (v, [x, y, z]) => assert.ok(Math.abs(v.x - x) < 1e-6 && Math.abs(v.y - y) < 1e-6 && Math.abs(v.z - z) < 1e-6, `got ${v.toArray()} want ${[x, y, z]}`);

test('a character-space delta turns a bone about the world axis, whatever its rest orientation', () => {
  for (const rest of [0, Math.PI / 2, 1]) {
    const {root, a, b} = chain(rest);
    const before = pos(b);
    const rig = new Rig(root, {poses: {p: {bones: {a: [0, 0, 90]}}}, idles: {}});
    rig.setPose('p', 0); rig.update(0, 0, null, 0); root.updateMatrixWorld(true);
    const expected = before.clone().applyAxisAngle(new T.Vector3(0, 0, 1), Math.PI / 2);
    near(pos(b), expected.toArray());
  }
});

test('pitch -90 swings +z to +y (forward limb to up)', () => {
  const {root, b} = chain();
  const rig = new Rig(root, {poses: {p: {bones: {a: [-90, 0, 0]}}}, idles: {}});
  rig.setPose('p', 0); rig.update(0, 0, null, 0); root.updateMatrixWorld(true);
  near(pos(b), [0, 1, 0]);
});

test('blending reaches the target and uses smoothstep', () => {
  const {root, b} = chain();
  const rig = new Rig(root, {poses: {p: {bones: {a: [0, 90, 0]}}}, idles: {}});
  rig.setPose('p', 1);
  rig.update(0.5, 0, null, 0);
  const mid = rig.current.a[1];
  assert.ok(Math.abs(mid - 45) < 1e-9, `smoothstep midpoint is 0.5, got ${mid}`);
  rig.update(0.6, 0, null, 0);
  assert.equal(rig.current.a[1], 90);
});

test('idle layers are pure functions of time and respect scale 0', () => {
  const idle = {layers: [{bone: 'a', axis: 'x', amp: 2, hz: 0.25}, {bone: 'a', axis: 'z', amp: 1, hz: 1, offset: 3}]};
  assert.deepEqual(Rig.idleDelta(idle, 'a', 0), [0, 0, 3]);
  const d = Rig.idleDelta(idle, 'a', 1);   // 0.25 Hz at t=1 -> sin(pi/2)
  assert.ok(Math.abs(d[0] - 2) < 1e-9);
  assert.deepEqual(Rig.idleDelta(idle, 'other', 1), [0, 0, 0]);
  const {root, b} = chain();
  const rig = new Rig(root, {poses: {p: {bones: {}}}, idles: {i: idle}});
  rig.setPose('p', 0); rig.update(0, 1, 'i', 0); root.updateMatrixWorld(true);
  near(pos(b), [0, 0, 1]);          // idleScale 0 (reduced motion) => no movement
});

test('curl macro expands to finger bones with mirrored sign', () => {
  const out = Rig.expand({bones: {}, curl: {r: 1, l: 0.5}});
  assert.ok(out.index_01_r[2] > 0 && out.index_01_l[2] < 0);
  assert.ok(Math.abs(out.index_01_l[2]) * 2 - out.index_01_r[2] < 1e-9);
  assert.ok('thumb_02_r' in out && 'pinky_03_l' in out);
});

test('every bone named in poses.json exists in the Base Operator skeleton', () => {
  const bones = new Set(manifest.bones);
  const missing = [];
  for (const [id, pose] of Object.entries(poseData.poses)) {
    for (const b of Object.keys(Rig.expand(pose))) if (!bones.has(b)) missing.push(`${id}:${b}`);
    if (pose.weapon && !bones.has(`hand_${pose.weapon.hand}`)) missing.push(`${id}:hand_${pose.weapon.hand}`);
  }
  for (const [id, idle] of Object.entries(poseData.idles)) for (const l of idle.layers) if (!bones.has(l.bone)) missing.push(`idle ${id}:${l.bone}`);
  assert.deepEqual(missing, []);
});

test('pose angles are sane (|deg| <= 180) and every pose has a label and detail', () => {
  for (const [id, pose] of Object.entries(poseData.poses)) {
    assert.ok(pose.label && pose.detail, `${id} needs label and detail`);
    for (const [b, v] of Object.entries(Rig.expand(pose))) for (const n of v) assert.ok(Math.abs(n) <= 180, `${id}.${b} = ${n}`);
  }
  for (const [id, idle] of Object.entries(poseData.idles)) for (const l of idle.layers) {
    assert.ok(['x', 'y', 'z'].includes(l.axis), `${id}: axis`);
    assert.ok(l.hz > 0 && l.hz < 1, `${id}: breathing/scan frequencies are well under 1 Hz`);
    assert.ok(Math.abs(l.amp) <= 30, `${id}: amplitude ${l.amp} too large for an idle`);
  }
});
