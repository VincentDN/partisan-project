// Verify the actual generated GLB: weighted geometry, posed deformation, equipment coverage and data profiles.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'meshoptimizer';
import {Rig} from '../operator/rig.js';
import {posesForProfile} from '../operator/pose-profile.js';
import {BASES, TRIANGLE_BUDGET} from '../operator/config.js';
const data = JSON.parse(fs.readFileSync('operator/poses.json'));
const base = BASES['generated-recon'];
const bytes = fs.readFileSync('assets/models/operators/generated-recon.glb');
// Node has no DOM image decoder. Keep the real geometry/material loader, supplying only a texture stub;
// browser acceptance verifies the embedded atlas decodes and remains on recoloured materials.
const {scene} = await new GLTFLoader()
  .register(() => ({name: 'NodeTexture', loadTexture: () => Promise.resolve(new T.Texture())}))
  .setMeshoptDecoder(MeshoptDecoder)
  .parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
const meshes = [];
scene.traverse(o => {
  if (o.isMesh) meshes.push(o);
});
const rig = new Rig(scene, posesForProfile(data, base.poseProfile));

test('generated hand axes match the grip solver and the face has a protected textured material', () => {
  for (const side of ['r', 'l']) {
    const palmNormal = new T.Vector3(0, 0, 1).applyQuaternion(rig.rest.get('hand_' + side).world);
    assert.ok(palmNormal.x * (side === 'r' ? 1 : -1) > 0.98, `${side}: rest palm must face inward`);
  }
  const face = meshes.find(m => m.material.name === 'M_GR_Face');
  assert.ok(face?.material.map);
  assert.ok(face.geometry.attributes.uv);
  assert.ok(!base.zones.some(z => z.materials.includes('M_GR_Face')));
});

test('generated geometry is skinned, normalized, compact and within the complete equipment budget', () => {
  assert.equal(meshes.length, 27); // the hood's protected face material creates a second primitive
  assert.ok(bytes.length < 1500 * 1024);
  let triangles = 0;
  for (const mesh of meshes) {
    assert.ok(mesh.isSkinnedMesh, mesh.name);
    triangles += mesh.geometry.index.count / 3;
    const w = mesh.geometry.attributes.skinWeight;
    for (let i = 0; i < w.count; i++) {
      const weights = [w.getX(i), w.getY(i), w.getZ(i), w.getW(i)];
      assert.ok(weights.every(v => Number.isFinite(v) && v >= 0));
      assert.ok(Math.abs(weights.reduce((a, b) => a + b, 0) - 1) < 0.002, `${mesh.name} vertex ${i}`);
    }
  }
  assert.ok(triangles <= TRIANGLE_BUDGET);
  const box = new T.Box3().setFromObject(scene);
  assert.ok(Math.abs(box.getSize(new T.Vector3()).y - 1.85) < 0.03);
  assert.ok(Math.abs(box.min.y) < 0.01);
});

test('every shared pose and idle deforms the real generated mesh without invalid vertices', () => {
  for (const id of Object.keys(rig.data.poses)) {
    rig.setPose(id, 0);
    for (const idle of [null, ...Object.keys(data.idles)]) {
      rig.update(1 / 60, 2.7, idle, 1);
      scene.updateMatrixWorld(true);
      for (const mesh of meshes) {
        mesh.skeleton.update();
        for (let i = 0; i < mesh.geometry.attributes.position.count; i += 13) {
          const p = mesh.getVertexPosition(i, new T.Vector3()).applyMatrix4(mesh.matrixWorld);
          assert.ok(p.toArray().every(Number.isFinite), `${id}/${idle}/${mesh.name}`);
          assert.ok(p.length() < 4, `${id}/${mesh.name} escaped the operator bounds`);
        }
      }
    }
  }
});

test('both generated hands remain body parts for every equipment combination', () => {
  for (const name of ['SK_GR_Glove_L', 'SK_GR_Glove_R', 'SK_GR_Cuff_R', 'SK_GR_Neck']) {
    assert.ok(
      meshes.some(m => m.name === name),
      name,
    );
    assert.ok(!Object.values(base.parts).some(p => p.nodes.includes(name)), `${name} must never be equipment`);
  }
  assert.ok(!meshes.some(m => /rifle|tripo/i.test(m.name)));
});

test('pose profiles preserve the original pose library and share weapon data without mutating it', () => {
  const before = JSON.stringify(data);
  const profiled = posesForProfile(data, 'generatedRecon');
  assert.notDeepEqual(profiled.poses.relaxed.bones.upperarm_r, data.poses.relaxed.bones.upperarm_r);
  assert.equal(JSON.stringify(data), before);
  assert.equal(posesForProfile(data), data);
  assert.throws(() => posesForProfile(data, 'missing'), /Unknown pose profile/);
  rig.setPose('relaxed', 0);
  rig.update(0, 0, null, 0);
  const head = rig.bones.get('head');
  const held = head.quaternion.clone();
  rig.update(0.1, 10, 'alert', 0);
  assert.ok(head.quaternion.angleTo(held) < 1e-6);
  rig.update(0.1, 10, 'alert', 1);
  assert.ok(head.quaternion.angleTo(held) > 0.001);
});
