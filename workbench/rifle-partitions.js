// Keep unrelated chassis triangles out of replaceable source parts; factory appearance and total geometry are preserved.
import * as T from 'three';

const RULES = {
  ak15k: {Object_12: {owns: p => p.x < -0.105}},
  mk14: Object.fromEntries(
    Array.from({length: 14}, (_, i) => {
      const name = `Object_${i + 29}`;
      return [
        name,
        i + 29 === 41 ? {owns: (_p, corners) => corners.every(p => p.y < 0.025)} : {owns: p => p.x < -0.3, target: 'mk14-stock'},
      ];
    }),
  ),
};
export function partitionSource(model, id) {
  model.updateMatrixWorld(true);
  const inverse = model.matrixWorld.clone().invert();
  for (const [name, {owns, target}] of Object.entries(RULES[id] || {})) {
    const mesh = model.getObjectByName(name);
    if (!mesh?.isMesh) throw new Error(`Missing partition source ${id}/${name}`);
    const source = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
    const matrix = inverse.clone().multiply(mesh.matrixWorld),
      p = source.attributes.position;
    const groups = [[], []],
      centre = new T.Vector3(),
      point = new T.Vector3();
    for (let i = 0; i < p.count; i += 3) {
      centre.set(0, 0, 0);
      const corners = [0, 1, 2].map(k =>
        point
          .fromBufferAttribute(p, i + k)
          .applyMatrix4(matrix)
          .clone(),
      );
      corners.forEach(p => centre.add(p));
      groups[owns(centre.multiplyScalar(1 / 3), corners) ? 0 : 1].push(i);
    }
    function geometry(starts) {
      const g = new T.BufferGeometry();
      for (const [key, a] of Object.entries(source.attributes)) {
        const data = new a.array.constructor(starts.length * 3 * a.itemSize);
        starts.forEach((start, i) => data.set(a.array.subarray(start * a.itemSize, (start + 3) * a.itemSize), i * 3 * a.itemSize));
        g.setAttribute(key, new T.BufferAttribute(data, a.itemSize, a.normalized));
      }
      return g;
    }
    mesh.geometry = geometry(groups[0]);
    const fixed = new T.Mesh(geometry(groups[1]), mesh.material);
    fixed.name = `${name}:fixed-chassis`;
    fixed.matrixAutoUpdate = false;
    fixed.matrix.copy(matrix);
    model.add(fixed);
    fixed.castShadow = fixed.receiveShadow = true;
    if (target) {
      let group = model.getObjectByName(target);
      if (!group) {
        group = new T.Group();
        group.name = target;
        model.add(group);
      }
      group.attach(mesh);
    }
    source.dispose();
  }
}
