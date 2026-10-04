// Rig maths and pose data: character-space deltas, idle layers, and poses.json vs the real skeleton.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';
import {Rig, Spring, blinkAt, lookDeltas} from '../operator/rig.js';

const poseData = JSON.parse(fs.readFileSync('operator/poses.json', 'utf8'));
const manifest = JSON.parse(fs.readFileSync('assets/models/operators/base-operator.manifest.json', 'utf8'));

function chain(restRotY = 0) {
  const root = new T.Group();
  const a = new T.Bone();
  a.name = 'a';
  a.quaternion.setFromAxisAngle(new T.Vector3(0, 1, 0), restRotY);
  const b = new T.Bone();
  b.name = 'b';
  b.position.set(0, 0, 1);
  a.add(b);
  root.add(a);
  root.updateMatrixWorld(true);
  return {root, a, b};
}
const pos = bone => bone.getWorldPosition(new T.Vector3());
const near = (v, [x, y, z]) =>
  assert.ok(Math.abs(v.x - x) < 1e-6 && Math.abs(v.y - y) < 1e-6 && Math.abs(v.z - z) < 1e-6, `got ${v.toArray()} want ${[x, y, z]}`);

test('a character-space delta turns a bone about the world axis, whatever its rest orientation', () => {
  for (const rest of [0, Math.PI / 2, 1]) {
    const {root, b} = chain(rest);
    const before = pos(b);
    const rig = new Rig(root, {poses: {p: {bones: {a: [0, 0, 90]}}}, idles: {}});
    rig.setPose('p', 0);
    rig.update(0, 0, null, 0);
    root.updateMatrixWorld(true);
    const expected = before.clone().applyAxisAngle(new T.Vector3(0, 0, 1), Math.PI / 2);
    near(pos(b), expected.toArray());
  }
});

test('pitch -90 swings +z to +y (forward limb to up)', () => {
  const {root, b} = chain();
  const rig = new Rig(root, {poses: {p: {bones: {a: [-90, 0, 0]}}}, idles: {}});
  rig.setPose('p', 0);
  rig.update(0, 0, null, 0);
  root.updateMatrixWorld(true);
  near(pos(b), [0, 1, 0]);
});

test('blending reaches the target and uses smoothstep', () => {
  const {root} = chain();
  const rig = new Rig(root, {poses: {p: {bones: {a: [0, 90, 0]}}}, idles: {}});
  rig.setPose('p', 1);
  rig.update(0.5, 0, null, 0);
  const mid = rig.current.a[1];
  assert.ok(Math.abs(mid - 45) < 1e-9, `smoothstep midpoint is 0.5, got ${mid}`);
  rig.update(0.6, 0, null, 0);
  assert.equal(rig.current.a[1], 90);
});

test('idle layers are pure functions of time and respect scale 0', () => {
  const idle = {
    layers: [
      {bone: 'a', axis: 'x', amp: 2, hz: 0.25},
      {bone: 'a', axis: 'z', amp: 1, hz: 1, offset: 3},
    ],
  };
  assert.deepEqual(Rig.idleDelta(idle, 'a', 0), [0, 0, 3]);
  const d = Rig.idleDelta(idle, 'a', 1); // 0.25 Hz at t=1 -> sin(pi/2)
  assert.ok(Math.abs(d[0] - 2) < 1e-9);
  assert.deepEqual(Rig.idleDelta(idle, 'other', 1), [0, 0, 0]);
  const {root, b} = chain();
  const rig = new Rig(root, {poses: {p: {bones: {}}}, idles: {i: idle}});
  rig.setPose('p', 0);
  rig.update(0, 1, 'i', 0);
  root.updateMatrixWorld(true);
  near(pos(b), [0, 0, 1]); // idleScale 0 (reduced motion) => no movement
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
    for (const side of Object.keys(pose.weapon?.hands || {})) if (!bones.has(`hand_${side}`)) missing.push(`${id}:hand_${side}`);
    if (pose.weapon && !bones.has(pose.weapon.anchor)) missing.push(`${id}:${pose.weapon.anchor}`);
  }
  for (const [id, idle] of Object.entries(poseData.idles))
    for (const l of idle.layers) if (!bones.has(l.bone)) missing.push(`idle ${id}:${l.bone}`);
  assert.deepEqual(missing, []);
});

test('pose angles are sane (|deg| <= 180) and every pose has a label and detail', () => {
  for (const [id, pose] of Object.entries(poseData.poses)) {
    assert.ok(pose.label && pose.detail, `${id} needs label and detail`);
    for (const [b, v] of Object.entries(Rig.expand(pose))) for (const n of v) assert.ok(Math.abs(n) <= 180, `${id}.${b} = ${n}`);
  }
  for (const [id, idle] of Object.entries(poseData.idles))
    for (const l of idle.layers) {
      assert.ok(['x', 'y', 'z'].includes(l.axis), `${id}: axis`);
      assert.ok(l.hz > 0 && l.hz < 1, `${id}: breathing/scan frequencies are well under 1 Hz`);
      assert.ok(Math.abs(l.amp) <= 30, `${id}: amplitude ${l.amp} too large for an idle`);
    }
});

test('the pose library is the three rifle poses, and lowered poses stay physically plausible', () => {
  const ids = Object.keys(poseData.poses);
  assert.deepEqual(ids, ['hero', 'relaxed', 'ready'], 'three poses: hero (rifle up, the default), relaxed, low ready');
  for (const id of ids) assert.ok(poseData.poses[id].weapon, `${id}: the rifle is in hand`);
  for (const [id, p] of Object.entries(poseData.poses)) {
    const lower = p.lower || 0;
    assert.ok(lower >= 0 && lower <= 0.6, `${id}: lower ${lower} m`);
    if (lower > 0.3)
      assert.ok((p.bones.thigh_l?.[0] ?? 0) <= -60 || (p.bones.thigh_r?.[0] ?? 0) <= -60, `${id}: a lowered pose must flex a hip`);
  }
});

test('lowering is blended like bone deltas and cleared when the pose changes back', () => {
  const {root} = chain();
  const rig = new Rig(root, {poses: {a: {bones: {}}, b: {bones: {}, lower: 0.4}}, idles: {}});
  rig.setPose('b', 1);
  rig.update(0.5, 0, null, 0);
  assert.ok(Math.abs(rig.lower - 0.2) < 1e-9, String(rig.lower));
  rig.update(1, 0, null, 0);
  assert.equal(rig.lower, 0.4);
  rig.setPose('a', 0);
  assert.equal(rig.lower, 0);
});

test('blink: deterministic, short, and rare enough to look natural', () => {
  assert.equal(blinkAt(12.345), blinkAt(12.345));
  let closed = 0,
    edges = 0,
    prev = false;
  for (let t = 0; t < 120; t += 0.01) {
    const c = blinkAt(t);
    if (c) closed++;
    if (c && !prev) edges++;
    prev = c;
  }
  const duty = (closed * 0.01) / 120,
    perMinute = edges / 2;
  assert.ok(duty > 0.02 && duty < 0.08, `duty ${duty}`);
  assert.ok(perMinute > 14 && perMinute < 32, `blinks per minute ${perMinute}`);
});

test('look-at: head takes most of the turn, neck and upper spine share the rest, signs are consistent', () => {
  const d = lookDeltas(30, 10);
  assert.ok(Math.abs(d.head[1] + d.neck_01[1] + d.spine_04[1] - 30) < 1e-9, 'yaw shares add up to the full turn');
  assert.ok(d.head[1] > d.neck_01[1] && d.neck_01[1] > d.spine_04[1]);
  assert.ok(d.head[0] < 0, 'a camera above the head tilts the head back (negative pitch)');
});

test('look-at turns the head toward +x when the target is on the left', () => {
  const root = new T.Group(),
    head = new T.Bone(),
    tip = new T.Bone();
  head.name = 'head';
  tip.name = 'tip';
  tip.position.set(0, 0, 1);
  head.add(tip);
  root.add(head);
  root.updateMatrixWorld(true);
  const rig = new Rig(root, {poses: {p: {bones: {}}}, idles: {}});
  rig.setPose('p', 0);
  rig.look = {yaw: 90, pitch: 0};
  rig.update(0, 0, null, 0);
  root.updateMatrixWorld(true);
  const v = tip.getWorldPosition(new T.Vector3()); // head takes 55 % of 90 degrees ~ 49.5 degrees
  assert.ok(v.x > 0.7 && v.z < 0.7, `forward (+z) vector turns toward +x, got ${v.toArray()}`);
});

test('spring settles on its target without overshooting wildly and is frame-rate independent', () => {
  const run = fps => {
    const s = new Spring();
    let peak = 0;
    for (let i = 0; i < fps * 3; i++) peak = Math.max(peak, s.step(10, 1 / fps));
    return {x: s.x, peak};
  };
  for (const fps of [30, 60, 144]) {
    const {x, peak} = run(fps);
    assert.ok(Math.abs(x - 10) < 0.05, `settles at ${fps} fps`);
    assert.ok(peak < 12, `overshoot bounded at ${fps} fps`);
  }
  assert.ok(Math.abs(run(30).x - run(144).x) < 0.05);
});

test('secondary motion is off at idleScale 0 and costs well under 0.3 ms per update', () => {
  const rig = new Rig(new T.Group(), {poses: {a: {bones: {}}}, idles: {}});
  rig.setPose('a', 0);
  rig.update(1 / 60, 0, null, 0);
  assert.ok(rig.springs.every(s => s.x === 0 && s.v === 0));
  const t0 = performance.now();
  for (let i = 0; i < 2000; i++) rig.update(1 / 60, i / 60, null, 1);
  assert.ok((performance.now() - t0) / 2000 < 0.3);
});

test('a held pose skips the bone pass, and leaving idle writes the held pose back', () => {
  const root = new T.Group(),
    bone = new T.Bone();
  bone.name = 'spine_03';
  root.add(bone);
  const data = {poses: {a: {bones: {}}}, idles: {sway: {layers: [{bone: 'spine_03', axis: 'x', amp: 10, hz: 1}]}}};
  const rig = new Rig(root, data);
  rig.setPose('a', 0);
  rig.update(1 / 60, 0.25, 'sway', 1);
  const swayed = bone.quaternion.clone();
  assert.ok(swayed.angleTo(new T.Quaternion()) > 0.05, 'idle moves the bone');
  rig.update(1 / 60, 0.3, null, 1); // idle switched off: back to the held pose
  assert.ok(bone.quaternion.angleTo(new T.Quaternion()) < 1e-6);
  for (let i = 0; i < 600; i++) rig.update(1 / 60, 1 + i / 60, null, 1); // springs settle
  assert.ok(rig.springs.every(s => s.x === 0 && s.v === 0));
  bone.quaternion.set(0.1, 0, 0, 0.99);
  rig.update(1 / 60, 20, null, 1); // nothing changed: the pass is skipped, the bone is not rewritten
  assert.equal(bone.quaternion.x, 0.1);
});

test('weapon poses place the rifle with valid directions and name known grips', async () => {
  const {GRIPS} = await import('../operator/grip.js');
  for (const [id, pose] of Object.entries(poseData.poses)) {
    const w = pose.weapon;
    if (!w) continue;
    for (const k of ['hold', 'muzzle', 'up'])
      assert.ok(Array.isArray(w[k]) && w[k].length === 3 && w[k].every(Number.isFinite), `${id}.weapon.${k}`);
    const len = v => Math.hypot(...v);
    const cos = w.muzzle.reduce((s, x, i) => s + x * w.up[i], 0) / (len(w.muzzle) * len(w.up));
    assert.ok(Math.abs(cos) < 0.9, `${id}: muzzle and up must not be (nearly) parallel`);
    assert.ok(w.hands?.r === 'grip', `${id}: the right hand takes the pistol grip`);
    for (const g of Object.values(w.hands)) assert.ok(GRIPS[g], `${id}: unknown grip "${g}"`);
  }
});
