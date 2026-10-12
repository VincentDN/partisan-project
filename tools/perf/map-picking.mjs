// Reproducible CPU comparison of the former full-mesh raycast and the campaign heightfield picker (no GPU required).
import * as T from 'three';
import {bakeHeights} from '../../map/island.js';
import {pickGround} from '../../map/picking.js';
const f = bakeHeights();
const g = new T.PlaneGeometry(f.w, f.d, f.cols - 1, f.rows - 1).rotateX(-Math.PI / 2);
for (let k = 0; k < g.attributes.position.count; k++) g.attributes.position.setY(k, f.h[k]);
const mesh = new T.Mesh(g, new T.MeshBasicMaterial());
mesh.updateMatrixWorld();
const rays = Array.from(
  {length: 400},
  (_, i) =>
    new T.Raycaster(new T.Vector3(-300 + (i % 20) * 30, 150, -220 + Math.floor(i / 20) * 22), new T.Vector3(0.2, -1, 0.1).normalize()),
);
const measure = fn => {
  const times = [];
  for (const r of rays.slice(0, 20)) fn(r);
  for (const r of rays) {
    const start = performance.now();
    fn(r);
    times.push(performance.now() - start);
  }
  times.sort((a, b) => a - b);
  return {medianMs: +times[200].toFixed(4), p95Ms: +times[380].toFixed(4)};
};
const before = measure(r => r.intersectObject(mesh, false)[0]);
const after = measure(r => pickGround(f, r.ray));
console.log(
  JSON.stringify(
    {
      runtime: process.version,
      samples: rays.length,
      triangles: g.index.count / 3,
      before,
      after,
      medianSpeedup: +(before.medianMs / after.medianMs).toFixed(1),
    },
    null,
    2,
  ),
);
