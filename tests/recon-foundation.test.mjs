// Validate the shipped clothing's surface coverage, closed topology, canonical skeleton and deformations.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'meshoptimizer';
import {Rig} from '../operator/rig.js';
import {posesForProfile} from '../operator/pose-profile.js';
import {BASES, DEFAULT_BASE} from '../operator/config.js';
const read = p => JSON.parse(fs.readFileSync(p));
const bytes = fs.readFileSync('assets/models/operators/recon-modular.glb');
const report = read('assets/models/operators/recon-modular.foundation.json');
const audit = read('assets/models/operators/recon-source-audit.json');
const extension = read('assets/models/operators/recon-modular.rig.json');
const {scene} = await new GLTFLoader()
  .register(() => ({name: 'NodeTexture', loadTexture: () => Promise.resolve(new T.Texture())}))
  .setMeshoptDecoder(MeshoptDecoder)
  .parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
scene.updateMatrixWorld(true);
const meshes = [];
scene.traverse(m => {
  if (m.isMesh) meshes.push(m);
});
const data = posesForProfile(read('operator/poses.json'), 'reconFoundation'),
  rig = new Rig(scene, data);
function vertices(mesh) {
  mesh.skeleton.update();
  return Array.from({length: mesh.geometry.attributes.position.count}, (_, i) =>
    mesh.getVertexPosition(i, new T.Vector3()).applyMatrix4(mesh.matrixWorld),
  );
}
test('foundation is opt-in, contains no legacy gear and preserves all 26 rest transforms', () => {
  assert.equal(DEFAULT_BASE, 'generated-recon');
  assert.equal(BASES['recon-modular'].poseProfile, 'reconFoundation');
  assert.deepEqual(Object.keys(BASES['recon-modular'].parts), ['mask', 'cap', 'carrier', 'placard']);
  assert.equal(rig.bones.size, 56);
  for (const expected of audit.current.bones) {
    const bone = rig.bones.get(expected.name);
    assert.ok(bone);
    assert.equal(bone.parent.name, expected.parent);
    assert.ok(
      bone.matrix.elements.every((n, i) => Math.abs(n - expected.localMatrix[i]) < 1e-5),
      expected.name,
    );
  }
  assert.ok(!meshes.some(m => /Hood|Harness|Pouch|Radio|ShoulderTab|Holster|Knee_/.test(m.name)));
  assert.ok(!meshes.some(m => m.material.name === 'M_GR_hood'));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), report.modelSha256);
  assert.equal(
    meshes.reduce((n, m) => n + m.geometry.index.count / 3, 0),
    report.runtimeTriangles,
  );
  assert.ok(report.runtimeTriangles <= 8000);
  assert.equal(extension.addedBones.length, 30);
  for (const joint of extension.addedBones) {
    const bone = rig.bones.get(joint.name);
    assert.equal(bone.parent.name, joint.parent);
    assert.ok(bone.matrix.elements.every((v, i) => Math.abs(v - joint.localMatrix[i]) < 1e-5));
  }
});
test('every clothing volume is closed in the actual compressed export', () => {
  for (const mesh of meshes.filter(m => /Jacket|Trousers|Waist|Neck|Boot|Cuff/.test(m.name) || m.name === 'SK_CM_Head')) {
    const ids = new Map(),
      mapped = vertices(mesh).map(p => {
        const key = p
          .toArray()
          .map(v => Math.round(v * 1e5))
          .join(',');
        if (!ids.has(key)) ids.set(key, ids.size);
        return ids.get(key);
      }),
      edges = new Map();
    const index = mesh.geometry.index.array;
    for (let i = 0; i < index.length; i += 3) {
      const abc = [0, 1, 2].map(j => mapped[index[i + j]]);
      if (new Set(abc).size < 3) continue;
      for (let j = 0; j < 3; j++) {
        const a = abc[j],
          b = abc[(j + 1) % 3],
          key = a < b ? `${a},${b}` : `${b},${a}`;
        edges.set(key, (edges.get(key) || 0) + 1);
      }
    }
    assert.equal([...edges.values()].filter(n => n === 1).length, 0, mesh.name + ' has open edges');
  }
});
test('front, rear, waist and shoulders have cloth coverage rather than missing vest surfaces', () => {
  const jacket = meshes.find(m => m.name === 'SK_CM_Jacket'),
    waist = meshes.find(m => m.name === 'SK_CM_Waist');
  for (const y of [1.0, 1.08, 1.18, 1.3, 1.4])
    for (const x of [-0.1, 0, 0.1])
      for (const s of [-1, 1]) {
        const ray = new T.Raycaster(new T.Vector3(x, y, s * 0.5), new T.Vector3(0, 0, -s));
        assert.ok(ray.intersectObject(jacket).length, `missing torso ${x}/${y}/${s}`);
      }
  for (const y of [0.88, 0.92, 0.96])
    for (const s of [-1, 1])
      assert.ok(new T.Raycaster(new T.Vector3(0, y, s * 0.5), new T.Vector3(0, 0, -s)).intersectObject(waist).length, `waist ${y}/${s}`);
  const maps = new Set(meshes.filter(m => /Jacket|Trousers|Waist|Cuff/.test(m.name)).map(m => m.material.map));
  assert.ok(maps.size >= 2 && !maps.has(undefined));
  const face = meshes.find(m => m.material.name === 'M_CM_Skin');
  assert.ok(!maps.has(face.material.map));
});

test('removing the hood leaves a complete crown and back of head above a fuller neck', () => {
  const head = meshes.find(m => m.name === 'SK_CM_Head'),
    neck = meshes.find(m => m.name === 'SK_CM_Neck');
  assert.ok(head);
  for (const y of [1.63, 1.71, 1.8])
    for (const side of [-1, 1])
      assert.ok(new T.Raycaster(new T.Vector3(0, y, side * 0.4), new T.Vector3(0, 0, -side)).intersectObject(head).length);
  assert.ok(new T.Box3().setFromObject(neck).getSize(new T.Vector3()).x >= 0.175, 'neck width');
});
test('all poses and idle samples retain finite normalized deformation without stretching clothing edges excessively', () => {
  const cloth = meshes.filter(m => /Jacket|Trousers|Waist|Cuff|Boot/.test(m.name));
  const rest = new Map(cloth.map(m => [m, vertices(m)]));
  for (const mesh of meshes) {
    const a = mesh.geometry.attributes.skinWeight;
    for (let i = 0; i < a.count; i++) {
      const w = [a.getX(i), a.getY(i), a.getZ(i), a.getW(i)];
      assert.ok(w.every(n => n >= 0 && Number.isFinite(n)));
      assert.ok(Math.abs(w.reduce((a, b) => a + b, 0) - 1) < 0.002);
    }
  }
  for (const pose of Object.keys(data.poses))
    for (const idle of [null, ...Object.keys(data.idles)]) {
      rig.setPose(pose, 0);
      rig.update(1 / 60, 2.7, idle, 1);
      scene.updateMatrixWorld(true);
      for (const mesh of cloth) {
        const now = vertices(mesh),
          before = rest.get(mesh),
          idx = mesh.geometry.index.array;
        assert.ok(
          now.every(p => p.toArray().every(Number.isFinite) && p.length() < 4),
          pose + '/' + mesh.name,
        );
        for (let i = 0; i < idx.length; i += 3)
          for (const [a, b] of [
            [0, 1],
            [1, 2],
            [2, 0],
          ]) {
            const old = before[idx[i + a]].distanceTo(before[idx[i + b]]),
              len = now[idx[i + a]].distanceTo(now[idx[i + b]]);
            assert.ok(
              len < old * 4 + 0.025,
              `${pose}/${idle}/${mesh.name}: stretched seam ${old} → ${len}; vertices ${before[idx[i + a]].toArray()} / ${before[idx[i + b]].toArray()}`,
            );
          }
      }
    }
});

test('the articulated thumbs close across the palm and every finger joint deforms glove vertices', () => {
  for (const side of ['r', 'l']) {
    const glove = meshes.find(m => m.name === 'SK_CM_Glove_' + side.toUpperCase());
    const used = new Set();
    const indices = glove.geometry.attributes.skinIndex,
      weights = glove.geometry.attributes.skinWeight;
    for (let i = 0; i < indices.count; i++)
      for (let c = 0; c < 4; c++) if (weights.getComponent(i, c) > 0.01) used.add(glove.skeleton.bones[indices.getComponent(i, c)].name);
    for (const finger of ['thumb', 'index', 'middle', 'ring', 'pinky'])
      for (let i = 1; i <= 3; i++) assert.ok(used.has(`${finger}_0${i}_${side}`));
    const tips = {};
    for (const shape of ['open', 'grip']) {
      for (const [finger, angles] of Object.entries(data.handShapes[shape]))
        angles.forEach((angle, i) => {
          const name = `${finger}_0${i + 1}_${side}`,
            v = angle.map((n, axis) => ((n * Math.PI) / 180) * (axis === 2 && side === 'l' ? -1 : 1));
          rig.bones
            .get(name)
            .quaternion.copy(rig.rest.get(name).local)
            .multiply(new T.Quaternion().setFromEuler(new T.Euler(...v)));
        });
      scene.updateMatrixWorld(true);
      tips[shape] = rig.bones.get('hand_' + side).worldToLocal(rig.bones.get('thumb_03_' + side).localToWorld(new T.Vector3(0, 0.021, 0)));
    }
    assert.ok(Math.abs(tips.grip.x) < Math.abs(tips.open.x) * 0.65, 'thumb must oppose across palm');
    assert.ok(tips.grip.y > 0.055, 'thumb closes toward knuckles, not wrist');
  }
});
