// Check the real carrier export, shared rig binding, assembly budgets and posed clothing clearance.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'meshoptimizer';
import {bindPack} from '../operator/bind-pack.js';
import {Rig} from '../operator/rig.js';
import {posesForProfile} from '../operator/pose-profile.js';
import {resolveAssembly, detachAssembly} from '../operator/assembly.js';
import {referenceGrip} from '../operator/reference-grip.js';
import {Grip} from '../operator/grip.js';
import {modularRecon} from '../operator/recon-modular.js';
const read = p => JSON.parse(fs.readFileSync(p));
const load = async p => {
  const bytes = fs.readFileSync(p);
  return new GLTFLoader()
    .register(() => ({name: 'NodeTexture', loadTexture: () => Promise.resolve(new T.Texture())}))
    .setMeshoptDecoder(MeshoptDecoder)
    .parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
};
const {scene} = await load('assets/models/operators/recon-modular.glb');
const pack = await load('assets/models/operators/recon-carrier.glb');
scene.updateMatrixWorld(true);
pack.scene.updateMatrixWorld(true);
const rig = new Rig(scene, posesForProfile(read('operator/poses.json'), 'reconCarrier'));
rig.grip = new Grip(rig.bones, rig.rest, modularRecon(null).grip);
const fit = read('assets/models/operators/recon-carrier.fit.json'),
  manifest = read('assets/models/operators/recon-carrier.manifest.json');
const {catalogue, outfits} = read('operator/recon-carrier.json');
const oldMatrices = new Map();
pack.scene.traverse(o => {
  if (o.isBone) oldMatrices.set(o.name, o.matrix.toArray());
});
bindPack(pack.scene, scene, rig);
scene.updateMatrixWorld(true);
const meshes = [];
scene.traverse(m => {
  if (m.isMesh) meshes.push(m);
});
const carrier = meshes.filter(m => m.name.startsWith('SK_LC_'));
function vertices(m) {
  m.skeleton.update();
  return Array.from({length: m.geometry.attributes.position.count}, (_, i) =>
    m.getVertexPosition(i, new T.Vector3()).applyMatrix4(m.matrixWorld),
  );
}
function deform(m) {
  const v = vertices(m),
    positions = Array.from(m.geometry.index.array).flatMap(i => v[i].toArray());
  const result = new T.Mesh(
    new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute(positions, 3)),
    new T.MeshBasicMaterial({side: T.DoubleSide}),
  );
  result.geometry.computeBoundingBox();
  return result;
}
test('carrier stays inside its allocation, preserves body file and rebinds every canonical bone', () => {
  assert.ok(manifest.triangles <= 1700);
  assert.equal(
    carrier.reduce((n, m) => n + m.geometry.index.count / 3, 0),
    manifest.triangles,
  );
  assert.equal(createHash('sha256').update(fs.readFileSync('assets/models/operators/recon-modular.glb')).digest('hex'), fit.bodySha256);
  assert.equal(createHash('sha256').update(fs.readFileSync('assets/models/operators/recon-carrier.glb')).digest('hex'), fit.modelSha256);
  for (const [name, matrix] of oldMatrices)
    assert.ok(
      rig.bones.get(name).matrix.elements.every((v, i) => Math.abs(v - matrix[i]) < 1e-5),
      name,
    );
  for (const m of carrier) {
    assert.ok(m.userData.packPart);
    assert.ok(m.skeleton.bones.every(b => rig.bones.get(b.name) === b));
  }
});
test('every carrier volume is closed and every skin vertex has normalized finite weights', () => {
  assert.ok(fit.meshes.every(m => m.boundaryEdges === 0));
  for (const m of carrier) {
    const edges = new Map(),
      ids = new Map();
    const mapped = vertices(m).map(p => {
      const key = p
        .toArray()
        .map(v => Math.round(v * 1e5))
        .join(',');
      if (!ids.has(key)) ids.set(key, ids.size);
      return ids.get(key);
    });
    const indices = m.geometry.index.array;
    for (let i = 0; i < indices.length; i += 3) {
      const face = [0, 1, 2].map(j => mapped[indices[i + j]]);
      if (new Set(face).size < 3) continue;
      for (let j = 0; j < 3; j++) {
        const a = face[j],
          b = face[(j + 1) % 3],
          key = [Math.min(a, b), Math.max(a, b)].join(',');
        edges.set(key, (edges.get(key) || 0) + 1);
      }
    }
    assert.ok(
      [...edges.values()].every(n => n === 2),
      m.name + ' non-closed geometry',
    );
    const weights = m.geometry.attributes.skinWeight;
    for (let i = 0; i < weights.count; i++) {
      const w = new T.Vector4().fromBufferAttribute(weights, i).toArray();
      assert.ok(w.every(Number.isFinite));
      assert.ok(Math.abs(w.reduce((a, b) => a + b, 0) - 1) < 1e-4);
    }
  }
});
test('real assemblies charge the whole loaded pack, preserve the placard dependency and remove all kit cleanly', () => {
  for (const name of ['light', 'placard']) {
    const r = resolveAssembly(catalogue, outfits[name]);
    assert.equal(r.ok, true, JSON.stringify(r.errors));
    assert.equal(r.budget.triangles, 5568 + manifest.triangles);
    assert.deepEqual(r.coverage, []);
  }
  assert.equal(resolveAssembly(catalogue, detachAssembly(outfits.placard, 'carrier').outfit).budget.triangles, 5568);
  const orphan = structuredClone(outfits.placard);
  orphan.instances = orphan.instances.filter(i => i.id !== 'carrier');
  assert.equal(resolveAssembly(catalogue, orphan).ok, false);
  assert.equal(new Set(carrier.map(m => m.userData.packPart)).size, manifest.meshes.length);
});
test('carrier remains outside the closed jacket through reference held poses', () => {
  const jacket = meshes.find(m => m.name === 'SK_CM_Jacket'),
    ray = new T.Raycaster(),
    direction = new T.Vector3(1, 0.173, 0.317).normalize();
  const failures = [];
  for (const pose of ['relaxed', 'ready', 'hero', 'crouch', 'kneel', 'highready', 'port', 'gunner', 'herotwo', 'salute']) {
    rig.setPose(pose, 0);
    rig.update(0, 0, null, 0);
    scene.updateMatrixWorld(true);
    referenceGrip(rig);
    scene.updateMatrixWorld(true);
    const body = deform(jacket),
      box = body.geometry.boundingBox;
    for (const m of carrier) {
      let count = 0;
      for (const point of vertices(m)) {
        if (!box.containsPoint(point)) continue;
        ray.set(point, direction);
        const hits = ray.intersectObject(body, false).filter((h, i, a) => i === 0 || Math.abs(h.distance - a[i - 1].distance) > 1e-5);
        if (hits.length % 2 && hits[0].distance > 0.005) count++;
      }
      if (count) failures.push(`${pose}/${m.name}: ${count}`);
    }
    body.geometry.dispose();
    body.material.dispose();
  }
  assert.deepEqual(failures, []);
});
