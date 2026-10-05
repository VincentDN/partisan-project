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
  assert.deepEqual(BASES['recon-modular'].parts, {});
  assert.equal(rig.bones.size, 26);
  for (const expected of audit.current.bones) {
    const bone = rig.bones.get(expected.name);
    assert.ok(bone);
    assert.equal(bone.parent.name, expected.parent);
    assert.ok(
      bone.matrix.elements.every((n, i) => Math.abs(n - expected.localMatrix[i]) < 1e-5),
      expected.name,
    );
  }
  assert.ok(!meshes.some(m => /Harness|Pouch|Radio|ShoulderTab|Holster|Knee_/.test(m.name)));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), report.modelSha256);
  assert.equal(
    meshes.reduce((n, m) => n + m.geometry.index.count / 3, 0),
    report.runtimeTriangles,
  );
  assert.ok(report.runtimeTriangles <= 8000);
});
test('every clothing volume is closed in the actual compressed export', () => {
  for (const mesh of meshes.filter(m => /Jacket|Trousers|Waist|Neck|Boot|Cuff/.test(m.name))) {
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
  const face = meshes.find(m => m.material.name === 'M_GR_Face');
  assert.ok(!maps.has(face.material.map));
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
