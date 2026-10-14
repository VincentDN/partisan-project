// Real source geometry keeps its factory appearance while replaceable parts stop owning the chassis.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'meshoptimizer';
import {MODELS} from '../workbench/models.js';
import {normalize} from '../workbench/rifle-instance.js';
import {partitionSource} from '../workbench/rifle-partitions.js';
import {frontInEnvelope} from '../workbench/attachment-clearance.js';
const triangles = root => {
  let count = 0;
  root.traverse(o => {
    if (o.isMesh) count += (o.geometry.index?.count || o.geometry.attributes.position.count) / 3;
  });
  return count;
};
for (const id of ['ak15k', 'mk14'])
  test(`${id}: partitions preserve factory geometry and leave shared templates intact`, async () => {
    const c = MODELS[id],
      bytes = fs.readFileSync(new URL(c.url, new URL('../workbench/models.js', import.meta.url)));
    const {scene} = await new GLTFLoader()
      .register(() => ({name: 'TextureStub', loadTexture: () => Promise.resolve(new T.Texture())}))
      .setMeshoptDecoder(MeshoptDecoder)
      .parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
    const templateCount = triangles(scene),
      model = normalize(scene.clone(true), c.scale, c.stretch);
    const before = new T.Box3().setFromObject(model),
      count = triangles(model);
    partitionSource(model, id);
    const after = new T.Box3().setFromObject(model);
    assert.equal(triangles(model), count);
    assert.equal(triangles(scene), templateCount);
    assert.ok(before.min.distanceTo(after.min) < 1e-6 && before.max.distanceTo(after.max) < 1e-6);
    if (id === 'mk14') {
      const stock = new T.Box3().setFromObject(model.getObjectByName('mk14-stock'));
      const mag = new T.Box3().setFromObject(model.getObjectByName('Object_41'));
      assert.ok(stock.max.x < -0.2, 'replacement stock cannot include the forend');
      assert.ok(mag.max.y < 0.026 && mag.getSize(new T.Vector3()).x < 0.1, 'only the actual magazine is removable');
    } else assert.ok(new T.Box3().setFromObject(model.getObjectByName('Object_12')).max.x < -0.09, 'trigger guard stays with receiver');
  });
test('clearance uses the occupied magazine section, not the distant curve at its bottom', () => {
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute([0, 0, 0, 0, -1, 0, 1, -1, 0], 3));
  const mesh = new T.Mesh(g),
    frame = new T.Group();
  frame.add(mesh);
  const slice = new T.Box3(new T.Vector3(-2, -0.2, -0.1), new T.Vector3(2, 0, 0.1));
  assert.ok(Math.abs(frontInEnvelope(mesh, frame, slice) - 0.2) < 1e-6);
});
