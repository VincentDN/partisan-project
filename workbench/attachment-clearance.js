// Clip magazine triangles to an attachment's vertical/lateral envelope; curved magazines need more than a whole-mesh box.
import * as T from 'three';

function clip(points, axis, limit, sign) {
  const out = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i],
      b = points[(i + 1) % points.length];
    const da = sign * (a[axis] - limit),
      db = sign * (b[axis] - limit);
    if (da >= 0) out.push(a);
    if (da < 0 !== db < 0) out.push(a.clone().lerp(b, da / (da - db)));
  }
  return out;
}
export function frontInEnvelope(object, frame, envelope) {
  frame.updateWorldMatrix(true, true);
  const inverse = frame.matrixWorld.clone().invert();
  let front = -Infinity;
  object.traverse(m => {
    if (!m.isMesh) return;
    const g = m.geometry,
      p = g.attributes.position,
      index = g.index;
    const matrix = inverse.clone().multiply(m.matrixWorld);
    for (let i = 0, count = index?.count || p.count; i < count; i += 3) {
      let polygon = [0, 1, 2].map(k => new T.Vector3().fromBufferAttribute(p, index ? index.getX(i + k) : i + k).applyMatrix4(matrix));
      for (const axis of ['y', 'z']) {
        polygon = clip(polygon, axis, envelope.min[axis], 1);
        polygon = clip(polygon, axis, envelope.max[axis], -1);
      }
      for (const point of polygon) front = Math.max(front, point.x);
    }
  });
  return front;
}
