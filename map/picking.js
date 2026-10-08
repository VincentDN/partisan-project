// Pick the baked heightfield directly, avoiding a raycast through 86,400 terrain triangles.
import {sample} from './island.js';
export function pickGround(field, ray) {
  const o = ray.origin,
    d = ray.direction;
  let start = 0,
    end = 4000;
  for (const [axis, half] of [
    ['x', field.w / 2],
    ['z', field.d / 2],
  ]) {
    if (Math.abs(d[axis]) < 1e-9) {
      if (Math.abs(o[axis]) > half) return null;
    } else {
      const a = (-half - o[axis]) / d[axis],
        b = (half - o[axis]) / d[axis];
      start = Math.max(start, Math.min(a, b));
      end = Math.min(end, Math.max(a, b));
    }
  }
  if (start > end) return null;
  const delta = t => o.y + d.y * t - sample(field, o.x + d.x * t, o.z + d.z * t);
  const step = Math.min(10, field.step / (2 * Math.max(Math.abs(d.x), Math.abs(d.z), 0.001)));
  let prev = start,
    above = delta(start);
  for (let t = Math.min(start + step, end); t <= end; t = Math.min(t + step, end)) {
    const below = delta(t);
    if (above >= 0 && below <= 0) {
      let a = prev,
        b = t;
      for (let i = 0; i < 14; i++) {
        const m = (a + b) / 2;
        if (delta(m) > 0) a = m;
        else b = m;
      }
      const hit = (a + b) / 2;
      return {point: {x: o.x + d.x * hit, y: o.y + d.y * hit, z: o.z + d.z * hit}};
    }
    if (t === end) break;
    prev = t;
    above = below;
  }
  return null;
}
