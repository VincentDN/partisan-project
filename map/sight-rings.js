// Sight on the campaign map (WP-W7): a ring round the band showing how far it sees, and a red ring round each hunter
// column that is out, showing how far it would spot the band. Drawn over the ground, they follow its heights.
import * as T from 'three';
import {sample} from './island.js';

const SEGMENTS = 96;

export function createSightRings({scene, field}) {
  const group = new T.Group();
  group.name = 'sight-rings';
  scene.add(group);
  const rings = new Map(); // id -> {line, x, z, r}
  function ring(id, color) {
    if (rings.has(id)) return rings.get(id);
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(new Float32Array(SEGMENTS * 3), 3));
    const line = new T.LineLoop(
      geo,
      new T.LineDashedMaterial({color, dashSize: 4, gapSize: 3, transparent: true, opacity: 0.75, depthTest: false}),
    );
    line.renderOrder = 4;
    line.name = `sight-${id}`;
    group.add(line);
    const r = {line, x: NaN, z: NaN, r: NaN};
    rings.set(id, r);
    return r;
  }
  /** Draw ring `id` (colour on first use) round (x, z) with radius r; it is rebuilt only when it has moved. */
  function show(id, x, z, r, color = '#d9f5c8') {
    const o = ring(id, color);
    o.line.visible = true;
    if (Math.abs(o.x - x) < 0.5 && Math.abs(o.z - z) < 0.5 && Math.abs(o.r - r) < 0.5) return;
    Object.assign(o, {x, z, r});
    const pos = o.line.geometry.attributes.position;
    for (let i = 0; i < SEGMENTS; i++) {
      const a = (i / SEGMENTS) * Math.PI * 2,
        px = x + Math.cos(a) * r,
        pz = z + Math.sin(a) * r;
      pos.setXYZ(i, px, Math.max(0, sample(field, px, pz)) + 1.2, pz);
    }
    pos.needsUpdate = true;
    o.line.geometry.computeBoundingSphere();
    o.line.computeLineDistances();
  }
  const hide = id => rings.has(id) && (rings.get(id).line.visible = false);
  return {show, hide, group};
}
