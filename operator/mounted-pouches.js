// Mount independent pouch copies in asset-rest space and interpolate their skin weights from the owning carrier surface.
import * as T from 'three';
import {resolveAssembly} from './assembly.js';
import {pouchOutfit} from './pouch-slots.js';

export function mountedPouches(scene, rig, templates, carrierData, pouchData) {
  const catalogue = [...carrierData.catalogue, ...pouchData.catalogue];
  const bones = [...rig.bones.values()],
    indices = new Map(bones.map((b, i) => [b.name, i]));
  scene.updateMatrixWorld(true);
  const skeleton = new T.Skeleton(
    bones,
    bones.map(b => b.matrixWorld.clone().invert()),
  );
  const surfaces = {front: [], rear: []};
  // Capture dequantized rest vertices once, before the first pose; compressed GLBs may encode mesh decode transforms in bind matrices.
  scene.traverse(m => {
    const side = m.userData.packPart === 'SK_LC_Placard' ? 'front' : m.userData.packPart === 'SK_LC_Rear' ? 'rear' : null;
    if (!side || !m.isSkinnedMesh) return;
    m.skeleton.update();
    const vertices = Array.from({length: m.geometry.attributes.position.count}, (_, i) => ({
      p: m.getVertexPosition(i, new T.Vector3()).applyMatrix4(m.matrixWorld),
      weights: Array.from({length: 4}, (_, k) => [
        indices.get(m.skeleton.bones[m.geometry.attributes.skinIndex.getComponent(i, k)].name),
        m.geometry.attributes.skinWeight.getComponent(i, k),
      ]),
    }));
    const ids = m.geometry.index.array;
    for (let i = 0; i < ids.length; i += 3) {
      const v = [vertices[ids[i]], vertices[ids[i + 1]], vertices[ids[i + 2]]];
      surfaces[side].push({v, triangle: new T.Triangle(...v.map(a => a.p))});
    }
  });
  templates.updateMatrixWorld(true);
  const sources = new Map();
  templates.traverse(m => {
    if (!m.isMesh) return;
    let root = m;
    for (let p = m.parent; p; p = p.parent) if (p.name.startsWith('Pouch_')) root = p;
    const key = root.name.replace('Pouch_', 'pouch.');
    if (!sources.has(key)) sources.set(key, []);
    sources.get(key).push(m);
  });
  let key = '',
    meshes = [];
  function weightsAt(point, surface) {
    let distance = Infinity,
      nearest,
      bary;
    const hit = new T.Vector3(),
      bc = new T.Vector3();
    for (const {v, triangle} of surface) {
      triangle.closestPointToPoint(point, hit);
      const d = hit.distanceToSquared(point);
      if (d < distance) {
        distance = d;
        nearest = v;
        triangle.getBarycoord(hit, bc);
        bary = bc.toArray();
      }
    }
    const blend = new Map();
    nearest.forEach((v, i) => v.weights.forEach(([b, w]) => blend.set(b, (blend.get(b) || 0) + w * bary[i])));
    const top = [...blend].sort((a, b) => b[1] - a[1]).slice(0, 4),
      total = top.reduce((n, p) => n + p[1], 0);
    while (top.length < 4) top.push([0, 0]);
    return top.map(([b, w]) => [b, w / total]);
  }
  function create(source, instance, cache) {
    const matrix = new T.Matrix4().compose(
      new T.Vector3(...instance.transform.position),
      new T.Quaternion(...instance.transform.quaternion),
      new T.Vector3(1, 1, 1),
    );
    const geometry = source.geometry.clone(),
      positions = [],
      skinIndex = [],
      skinWeight = [];
    for (let i = 0; i < geometry.attributes.position.count; i++) {
      const local = source.getVertexPosition(i, new T.Vector3()).applyMatrix4(source.matrixWorld);
      const anchor = local.clone();
      anchor.z = 0;
      anchor.applyMatrix4(matrix);
      positions.push(...local.applyMatrix4(matrix).toArray());
      const key = anchor
        .toArray()
        .map(v => v.toFixed(5))
        .join(',');
      if (!cache.has(key)) cache.set(key, weightsAt(anchor, surfaces[instance.mount]));
      const weights = cache.get(key);
      skinIndex.push(...weights.map(w => w[0]));
      skinWeight.push(...weights.map(w => w[1]));
    }
    geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('skinIndex', new T.Uint16BufferAttribute(skinIndex, 4));
    geometry.setAttribute('skinWeight', new T.Float32BufferAttribute(skinWeight, 4));
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    const m = new T.SkinnedMesh(geometry, source.material);
    m.name = `SK_Pouch_${instance.id}_${source.name}`;
    m.userData.pouchInstance = instance.id;
    m.castShadow = m.receiveShadow = true;
    m.frustumCulled = false;
    m.bind(skeleton, new T.Matrix4());
    scene.add(m);
    return m;
  }
  return {
    update(state) {
      const outfit = pouchOutfit(state, carrierData.outfits),
        next = JSON.stringify(outfit);
      if (next === key) return false;
      const result = resolveAssembly(catalogue, outfit);
      if (!result.ok) throw Error(result.errors.map(e => e.message).join(' '));
      for (const m of meshes) {
        m.removeFromParent();
        m.geometry.dispose();
      }
      meshes = result.active
        .filter(i => i.itemId.startsWith('pouch.'))
        .flatMap(i => {
          const cache = new Map();
          return sources.get(i.itemId).map(m => create(m, i, cache));
        });
      key = next;
      return true;
    },
  };
}
