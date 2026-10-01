// Any base that exposes the contract's bone names must run every pose and idle with finite results.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';
import {Rig} from '../operator/rig.js';

const manifest = JSON.parse(fs.readFileSync('assets/models/operators/base-operator.manifest.json', 'utf8'));
const poseData = JSON.parse(fs.readFileSync('operator/poses.json', 'utf8'));

// Rebuild a skeleton with the manifest's bone names: a spine column with limbs hanging off it.
function skeleton() {
  const root = new T.Group(),
    bones = new Map();
  for (const name of manifest.bones) {
    const b = new T.Bone();
    b.name = name;
    bones.set(name, b);
  }
  const parentOf = n => {
    if (n === 'root') return null;
    if (/^ik_/.test(n)) return 'root';
    if (n === 'pelvis') return 'root';
    if (/^spine_01$|^thigh_[lr]$/.test(n)) return 'pelvis';
    const spine = n.match(/^spine_0([2-4])$/);
    if (spine) return `spine_0${spine[1] - 1}`;
    if (/^neck_01$|^clavicle_/.test(n)) return 'spine_04';
    const neck = n.match(/^neck_0([23])$/);
    if (neck) return `neck_0${neck[1] - 1}`;
    if (n === 'head') return 'neck_03';
    for (const part of ['upperarm', 'lowerarm', 'hand', 'thigh', 'calf', 'foot', 'ball']) {
      const m = n.match(new RegExp(`^${part}(?:_twist_0\\d)?_([lr])$`));
      if (m)
        return {
          upperarm: `clavicle_${m[1]}`,
          lowerarm: `upperarm_${m[1]}`,
          hand: `lowerarm_${m[1]}`,
          thigh: 'pelvis',
          calf: `thigh_${m[1]}`,
          foot: `calf_${m[1]}`,
          ball: `foot_${m[1]}`,
        }[part];
    }
    const f = n.match(/^(index|middle|ring|pinky|thumb)_(metacarpal|01|02|03)_([lr])$/);
    if (f) {
      const [, finger, joint, side] = f;
      if (joint === 'metacarpal' || (finger === 'thumb' && joint === '01')) return `hand_${side}`;
      const prev = joint === '01' ? (finger === 'thumb' ? null : 'metacarpal') : `0${joint - 1}`;
      return `${finger}_${prev}_${side}`;
    }
    return 'root';
  };
  for (const [n, b] of bones) {
    const p = parentOf(n);
    if (p && bones.has(p)) {
      b.position.set(0, 0.1, 0);
      bones.get(p).add(b);
    } else if (!p) root.add(b);
    else root.add(b);
  }
  root.updateMatrixWorld(true);
  return root;
}

test('every pose and idle applies cleanly to a contract skeleton', () => {
  const root = skeleton();
  const rig = new Rig(root, poseData);
  for (const id of Object.keys(poseData.poses)) {
    rig.setPose(id, 0);
    for (const idle of [null, ...Object.keys(poseData.idles)])
      for (const t of [0, 3.3, 41.7]) {
        rig.update(1 / 60, t, idle, 1);
        for (const b of rig.bones.values()) assert.ok(b.quaternion.toArray().every(Number.isFinite), `${id}/${idle}@${t}: ${b.name}`);
      }
  }
});

test('poses are small deltas: no pose moves a bone further than 180 degrees from rest', () => {
  const root = skeleton(),
    rig = new Rig(root, poseData);
  for (const id of Object.keys(poseData.poses)) {
    rig.setPose(id, 0);
    rig.update(0, 0, null, 0);
    for (const [name, b] of rig.bones)
      assert.ok(2 * Math.acos(Math.min(1, Math.abs(b.quaternion.dot(rig.rest.get(name).local)))) <= Math.PI + 1e-6, `${id}:${name}`);
  }
});

test('manifest exposes the bones the pose system relies on', () => {
  for (const n of [
    'pelvis',
    'spine_02',
    'spine_03',
    'neck_01',
    'head',
    'clavicle_l',
    'clavicle_r',
    'upperarm_l',
    'lowerarm_l',
    'hand_l',
    'upperarm_r',
    'lowerarm_r',
    'hand_r',
    'thigh_l',
    'calf_l',
    'thigh_r',
    'calf_r',
  ])
    assert.ok(manifest.bones.includes(n), n);
});
