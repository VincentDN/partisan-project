// Verify actual pouch exports, duplicate ownership, occupied cells and rest/posed mount binding.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'meshoptimizer';
import {Rig} from '../operator/rig.js';
import {posesForProfile} from '../operator/pose-profile.js';
import {bindPack} from '../operator/bind-pack.js';
import {mountedPouches} from '../operator/mounted-pouches.js';
import {POUCH_POSITIONS, pouchOutfit} from '../operator/pouch-slots.js';
import {resolveAssembly, detachAssembly} from '../operator/assembly.js';
const read = p => JSON.parse(fs.readFileSync(p));
const carrier = read('operator/recon-carrier.json'),
  pouches = read('operator/recon-pouches.json');
const catalogue = [...carrier.catalogue, ...pouches.catalogue];
const load = async name => {
  const b = fs.readFileSync(`assets/models/operators/${name}.glb`);
  return new GLTFLoader()
    .register(() => ({name: 'NodeTexture', loadTexture: () => Promise.resolve(new T.Texture())}))
    .setMeshoptDecoder(MeshoptDecoder)
    .parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), '');
};
const {scene} = await load('recon-modular');
const rig = new Rig(scene, read('operator/poses.json'));
bindPack((await load('recon-carrier')).scene, scene, rig);
const templates = (await load('recon-pouches')).scene;
const controller = mountedPouches(scene, rig, templates, carrier, pouches);
const state = {carrier: 'placard', ...Object.fromEntries(POUCH_POSITIONS.map(p => [p.id, 'radio']))};
const meshes = () => {
  const list = [];
  scene.traverse(m => {
    if (m.userData.pouchInstance) list.push(m);
  });
  return list;
};
test('measured pouch budgets, textures, closed geometry and source hashes agree', () => {
  const manifest = read('assets/models/operators/recon-pouches.manifest.json');
  const fit = read('assets/models/operators/recon-pouches.fit.json');
  assert.equal(manifest.triangles, 860);
  assert.equal(createHash('sha256').update(fs.readFileSync('assets/models/operators/recon-pouches.glb')).digest('hex'), fit.modelSha256);
  assert.ok(fit.meshes.every(m => m.boundaryEdges === 0 && m.degenerateTriangles === 0));
  assert.ok(['M_CM_Pouches', 'M_CM_PouchTrim'].every(name => manifest.materials.find(m => m.name === name)?.textured));
  for (const [i, name] of ['recon-modular', 'recon-carrier'].entries())
    assert.equal(
      createHash('sha256')
        .update(fs.readFileSync(`assets/models/operators/${name}.glb`))
        .digest('hex'),
      fit.sourceSha256[i],
    );
  templates.updateMatrixWorld(true);
  templates.traverse(m => {
    if (!m.isMesh) return;
    const points = Array.from({length: m.geometry.attributes.position.count}, (_, i) =>
      m
        .getVertexPosition(i, new T.Vector3())
        .applyMatrix4(m.matrixWorld)
        .toArray()
        .map(v => v.toFixed(5))
        .join(','),
    );
    const edges = new Map(),
      ids = m.geometry.index.array;
    for (let i = 0; i < ids.length; i += 3) {
      assert.equal(new Set([points[ids[i]], points[ids[i + 1]], points[ids[i + 2]]]).size, 3, m.name + ' noncollapsed triangle');
      for (let j = 0; j < 3; j++) {
        const a = points[ids[i + j]],
          b = points[ids[i + ((j + 1) % 3)]],
          key = [a, b].sort().join('|');
        edges.set(key, (edges.get(key) || 0) + 1);
      }
    }
    assert.ok(
      [...edges.values()].every(n => n === 2),
      m.name + ' closed',
    );
    assert.ok(m.geometry.attributes.uv, 'UVs retained');
  });
});
test('six independent copies resolve, occupied cells reject and owned radios detach', () => {
  const outfit = pouchOutfit(state, carrier.outfits),
    result = resolveAssembly(catalogue, outfit);
  assert.equal(result.ok, true);
  assert.equal(result.budget.triangles, 6684 + 6 * 376);
  assert.ok(result.budget.triangles <= result.budget.limit);
  const bad = structuredClone(outfit);
  bad.instances.find(i => i.id === 'front2').cell = [0, 0];
  assert.ok(resolveAssembly(catalogue, bad).errors.some(e => e.code === 'overlap'));
  const detached = detachAssembly(outfit, 'front1');
  assert.equal(detached.draft.instances.length, 1);
  assert.equal(resolveAssembly(catalogue, detached.outfit).budget.triangles, result.budget.triangles - 376);
  assert.equal(detachAssembly(outfit, 'carrier').outfit.instances.length, 1);
});
test('pouch fitting inherits the carrier and finger profiles without changing their data', () => {
  const data = read('operator/poses.json'),
    before = structuredClone(data),
    fitted = posesForProfile(data, 'reconPouches'),
    bareCarrier = posesForProfile(data, 'reconCarrier');
  assert.deepEqual(fitted.localBones, bareCarrier.localBones);
  assert.deepEqual(fitted.handShapes, bareCarrier.handShapes);
  assert.deepEqual(fitted.slung.hands, {});
  fitted.slung.hold[2] = 100;
  fitted.poses.port.bones.spine_01 = [100, 0, 0];
  assert.deepEqual(data, before, 'fits never mutate shared pose data');
  assert.equal(bareCarrier.slung, undefined);
});
test('front/rear copies use distinct rest positions, normalized skinning and move with the torso', () => {
  assert.equal(controller.update(state), true);
  assert.equal(controller.equipped, true);
  scene.updateMatrixWorld(true);
  const list = meshes();
  assert.equal(new Set(list.map(m => m.userData.pouchInstance)).size, 6);
  for (const m of list) {
    m.skeleton.update();
    const a = m.geometry.attributes;
    for (let i = 0; i < a.position.count; i++) {
      assert.ok(Math.abs([0, 1, 2, 3].reduce((n, k) => n + a.skinWeight.getComponent(i, k), 0) - 1) < 1e-5);
      assert.ok(
        m.getVertexPosition(i, new T.Vector3()).distanceTo(new T.Vector3().fromBufferAttribute(a.position, i)) < 1e-5,
        'rest frame does not double-transform',
      );
    }
    const box = new T.Box3().setFromBufferAttribute(a.position);
    assert.ok(m.userData.pouchInstance.startsWith('front') ? box.min.z > 0.23 : box.max.z < -0.21, 'surface faces outward');
    if (m.material.name === 'M_CM_Pouches') {
      const front = m.userData.pouchInstance.startsWith('front');
      assert.ok(front ? box.min.z <= 0.234 : box.max.z >= -0.212, 'pouch back meets the outer carrier webbing within 2 mm');
    }
  }
  const m = list[0],
    before = m.getVertexPosition(0, new T.Vector3());
  rig.bones.get('spine_02').rotateX(0.2);
  scene.updateMatrixWorld(true);
  m.skeleton.update();
  assert.ok(before.distanceTo(m.getVertexPosition(0, new T.Vector3())) > 0.01);
});
test('switching releases obsolete geometry and carrier removal leaves no orphan hardware', () => {
  let disposed = 0;
  for (const m of meshes()) m.geometry.addEventListener('dispose', () => disposed++);
  const old = meshes().length;
  controller.update({...state, front1: 'none'});
  assert.equal(disposed, old);
  assert.ok(!meshes().some(m => m.userData.pouchInstance === 'front1'));
  for (let i = 0; i < 12; i++) controller.update({...state, front1: i % 2 ? 'utility' : 'magazine'});
  assert.equal(new Set(meshes().map(m => m.userData.pouchInstance)).size, 6);
  controller.update({...state, carrier: 'light'});
  assert.equal(new Set(meshes().map(m => m.userData.pouchInstance)).size, 3);
  controller.update({...state, carrier: 'none'});
  assert.equal(meshes().length, 0);
  assert.equal(controller.equipped, false);
  controller.update(state);
  assert.equal(new Set(meshes().map(m => m.userData.pouchInstance)).size, 6);
  assert.equal(controller.update(state), false, 'pose/colour updates retain mounted geometry');
});
