// Shared attachment library. Each slot sits on a mount point from a rifle's `sockets` in
// models.js and owns that rifle's part with the same id. Each rifle lists its factory options
// per slot and picks which library options it accepts. Units are meters in the slot's frame:
// +x toward the muzzle, +y up, +z the rifle's right side, origin at the mount point.
//
// Option kinds:
//  - original: shows the rifle's own part, optionally posed ({rotationY, position, nodes:{name:[dx,dy,dz]}}).
//  - build(ctx): returns an Object3D that replaces the source part. ctx.original is the
//    source part's group (for clones) and ctx.materials holds the model's materials by name.
//  - neither: the slot is left empty (or shows what the rifle has built in, like the AK-15K brake).
// Each slot's camera is the snappy angle the viewer cuts to when that slot changes: the
// direction from the part to the camera (model space), the distance in meters, and an
// optional aim offset from the mount point toward the part's middle.
// Built attachments are illustrative low-poly shapes, not measured replicas.
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

import {real, Z_FWD, Z_BACK} from './attachment-model.js';
import {buildScope, buildSling} from './attachment-mounts.js';
export {real, glb, Z_FWD, Z_BACK, ATTACHMENT_FILES} from './attachment-model.js';

const merge = geos => mergeGeometries(geos.map(g => (g.index ? g.toNonIndexed() : g)));
const box = (w, h, d, [x, y, z] = [0, 0, 0]) => new T.BoxGeometry(w, h, d).translate(x, y, z);
// Cylinder along x from x0 to x1.
const tube = (r, x0, x1, [y, z] = [0, 0], seg = 10, r1 = r) =>
  new T.CylinderGeometry(r1, r, x1 - x0, seg).rotateZ(-Math.PI / 2).translate((x0 + x1) / 2, y, z);
// Side profile (x,y) extruded to a thickness centered on z.
const profile = (points, depth, bevel = 0) => {
  const g = new T.ExtrudeGeometry(new T.Shape(points.map(p => new T.Vector2(...p))), {
    depth: depth - bevel * 2,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 1,
  });
  return g.translate(0, 0, -depth / 2 + bevel);
};
function group(...meshes) {
  const g = new T.Group();
  for (const [geos, material] of meshes) {
    g.add(new T.Mesh(Array.isArray(geos) ? merge(geos) : geos, material));
  }
  return g;
}
// The code-built attachments borrow the AK models' materials by name. Other rifles lack them, so these stand in.
export const FALLBACK_MATERIALS = {
  'h-190': new T.MeshStandardMaterial({name: 'h-190', color: '#1b1d1f', roughness: 0.6, metalness: 0.5}),
  stell: new T.MeshStandardMaterial({name: 'stell', color: '#3a3d40', roughness: 0.55, metalness: 0.6}),
  polymer: new T.MeshStandardMaterial({name: 'polymer', color: '#1d1e1f', roughness: 0.7}),
  glass: new T.MeshStandardMaterial({name: 'glass', color: '#6f9db8', roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.45}),
  red_emission: new T.MeshStandardMaterial({name: 'red_emission', color: '#ff2020', emissive: '#ff2020', emissiveIntensity: 2}),
};
const plum = new T.MeshStandardMaterial({name: 'polymer', color: '#3e1f22', roughness: 0.6});

// Copy the source part with its transforms baked into slot-space geometry, then warp each vertex.
function reshape(original, warp) {
  original.updateMatrixWorld(true);
  const g = new T.Group(),
    inverse = original.matrixWorld.clone().invert(),
    v = new T.Vector3();
  original.traverse(o => {
    if (!o.isMesh) return;
    // The model files store quantized (normalized Int16) positions: expand to floats before
    // transforming and stretching, or values outside [-1, 1] would clamp.
    const geometry = o.geometry.clone();
    for (const name of ['position', 'normal']) {
      const at = geometry.attributes[name];
      if (at && !(at.array instanceof Float32Array)) {
        const f = new Float32Array(at.count * 3);
        for (let i = 0; i < at.count; i++) {
          f[i * 3] = at.getX(i);
          f[i * 3 + 1] = at.getY(i);
          f[i * 3 + 2] = at.getZ(i);
        }
        geometry.setAttribute(name, new T.BufferAttribute(f, 3));
      }
    }
    geometry.applyMatrix4(inverse.clone().multiply(o.matrixWorld));
    const p = geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      warp(v.fromBufferAttribute(p, i));
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.add(new T.Mesh(geometry, o.material)); // applyMatrix4 carried the source normals; the warps are gentle enough to keep them.
  });
  return g;
}
const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
// The CNC kit (a modernised older rifle, after the owner's RPK reference: a KPOS-style folding stock, an M-LOK
// handguard, a machined grip, a translucent polymer magazine) is sized from the part it replaces, so one design fits
// every rifle: `fitted(original)` is that part's box in slot space.
function fitted(original) {
  const container = original.parent;
  container.updateWorldMatrix(true, true);
  const box = new T.Box3().setFromObject(original);
  if (box.isEmpty()) return null;
  const inv = container.matrixWorld.clone().invert();
  return box.applyMatrix4(inv);
}
const anodised = new T.MeshStandardMaterial({name: 'h-190', color: '#1c1e20', roughness: 0.38, metalness: 0.75});
const slotBlack = new T.MeshStandardMaterial({name: 'slot', color: '#060708', roughness: 0.9, metalness: 0.2});
const rubber = new T.MeshStandardMaterial({name: 'rubber', color: '#141414', roughness: 0.95});
// A side profile with holes, extruded to `depth` (centred on z).
function cutout(points, holes, depth, bevel = 0.002) {
  const shape = new T.Shape(points.map(p => new T.Vector2(...p)));
  for (const h of holes) shape.holes.push(new T.Path(h.map(p => new T.Vector2(...p))));
  return new T.ExtrudeGeometry(shape, {
    depth: depth - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 1,
  }).translate(0, 0, -depth / 2 + bevel);
}
function cncStock({original}) {
  const b = fitted(original) || new T.Box3(new T.Vector3(-0.26, -0.1, -0.02), new T.Vector3(0, 0.03, 0.02));
  const front = b.max.x,
    L = Math.min(0.34, Math.max(0.22, b.max.x - b.min.x)),
    rear = front - L,
    bore = b.max.y - 0.022,
    H = Math.min(0.15, Math.max(0.11, b.max.y - b.min.y)),
    low = bore + 0.025 - H;
  // skeleton: a top strut over the tube, a diagonal down to the butt, two lightening windows
  const body = cutout(
    [
      [front - 0.04, bore + 0.022],
      [rear + 0.015, bore + 0.027],
      [rear, bore + 0.02],
      [rear, low],
      [rear + 0.035, low],
      [front - 0.075, bore - 0.03],
      [front - 0.04, bore - 0.02],
    ],
    [
      [
        [rear + 0.03, bore + 0.008],
        [rear + 0.03, low + 0.03],
        [rear + 0.03 + (front - rear) * 0.32, bore + 0.002],
      ],
      [
        [rear + 0.06 + (front - rear) * 0.3, bore + 0.01],
        [front - 0.085, bore + 0.01],
        [front - 0.085, bore - 0.012],
        [rear + 0.07 + (front - rear) * 0.36, bore - 0.006],
      ],
    ],
    0.026,
  );
  return group(
    [[body, box(0.06, 0.012, 0.03, [rear + 0.05, bore + 0.033, 0])], anodised],
    [
      [
        tube(0.0145, rear + 0.04, front - 0.03, [bore, 0], 12),
        box(0.034, 0.042, 0.036, [front - 0.017, bore, 0]),
        box(0.012, 0.012, 0.03, [front - 0.06, bore - 0.018, 0]),
      ],
      anodised,
    ],
    [[box(0.018, bore + 0.03 - low, 0.034, [rear - 0.008, (bore + 0.03 + low) / 2, 0])], rubber],
  );
}
function mlokHandguard({original, slot}) {
  // a rifle can give the tube's extent in metres on the laid-out rifle (`span` [x0, x1], `axis` [y, z], `radius`)
  const s = slot?.factory?.[0];
  let b = fitted(original) || new T.Box3(new T.Vector3(-0.1, -0.02, -0.02), new T.Vector3(0.1, 0.02, 0.02));
  if (s?.span) {
    const at = original.parent.position,
      r = s.radius || 0.024;
    b = new T.Box3(
      new T.Vector3(s.span[0] - at.x, s.axis[0] - at.y - r + 0.004, s.axis[1] - at.z - r + 0.004),
      new T.Vector3(s.span[1] - at.x, s.axis[0] - at.y + r - 0.004, s.axis[1] - at.z + r - 0.004),
    );
  }
  const x0 = b.min.x - 0.005,
    x1 = b.max.x + 0.02,
    len = x1 - x0,
    cy = (b.min.y + b.max.y) / 2,
    cz = (b.min.z + b.max.z) / 2,
    r = Math.min(0.034, Math.max(0.02, Math.max(b.max.y - b.min.y, b.max.z - b.min.z) / 2 + 0.004)),
    ap = r * Math.cos(Math.PI / 8);
  const shell = new T.CylinderGeometry(r, r, len, 8, 1)
    .rotateY(Math.PI / 8)
    .rotateZ(-Math.PI / 2)
    .translate((x0 + x1) / 2, cy, cz);
  const slots = [],
    rail = [box(len, 0.006, 0.022, [(x0 + x1) / 2, cy + ap + 0.003, cz])];
  for (let x = x0 + 0.025; x < x1 - 0.03; x += 0.042)
    for (const side of [1, -1]) {
      slots.push(box(0.03, 0.009, 0.004, [x + 0.015, cy, cz + side * (ap - 0.0012)]));
      slots.push(box(0.03, 0.004, 0.009, [x + 0.015, cy - ap + 0.0012, cz]).rotateX(0)); // bottom
    }
  for (let x = x0 + 0.006; x < x1 - 0.004; x += 0.01) rail.push(box(0.005, 0.004, 0.022, [x, cy + ap + 0.008, cz]));
  return group([[shell, ...rail, tube(r + 0.002, x1 - 0.008, x1, [cy, cz], 8)], anodised], [slots, slotBlack]);
}
function cncGrip({original}) {
  const b = fitted(original) || new T.Box3(new T.Vector3(-0.06, -0.12, -0.014), new T.Vector3(0.02, 0, 0.014));
  // a straight-backed machined grip with a finger groove and a beavertail, scaled into the old grip's footprint
  const unit = [
    [1, 1],
    [0.52, 1],
    [0.0, 0.08],
    [0.06, 0],
    [0.46, 0],
    [0.5, 0.12],
    [0.6, 0.34],
    [0.7, 0.44],
    [0.66, 0.54],
    [0.8, 0.74],
    [0.96, 0.86],
  ];
  const w = Math.min(0.085, b.max.x - b.min.x),
    h = Math.min(0.135, Math.max(0.1, b.max.y - b.min.y));
  const g = profile(
    unit.map(([u, v]) => [b.min.x + u * w, b.max.y - h + v * h]),
    Math.min(0.032, Math.max(0.024, b.max.z - b.min.z)),
    0.003,
  ).translate(0, 0, (b.min.z + b.max.z) / 2);
  return group([g, new T.MeshStandardMaterial({name: 'polymer', color: '#1d1e1f', roughness: 0.6})]);
}
function clearMagazine({original}) {
  const g = new T.Group(),
    container = original.parent;
  container.updateWorldMatrix(true, true);
  const inv = container.matrixWorld.clone().invert(),
    smoke = new T.MeshPhysicalMaterial({
      name: 'clear',
      color: '#c08a4a',
      roughness: 0.3,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    });
  original.traverse(m => {
    if (!m.isMesh) return;
    const c = new T.Mesh(m.geometry, smoke);
    c.matrixAutoUpdate = false;
    c.matrix.copy(inv).multiply(m.matrixWorld);
    g.add(c);
  });
  return g;
}
// Illustrative masses in grams; each rifle adds its own base mass. Magazines are empty.
// Finish colours for the furniture. Original keeps the source colour; only polymer and black-finish
// surfaces are recoloured, so steel stays steel.
export const FINISHES = [
  {id: 'original', label: 'Original'},
  {id: 'plum', label: 'Plum', color: '#4a2427'},
  {id: 'fde', label: 'FDE', color: '#76603f'},
  {id: 'wood', label: 'Walnut', color: '#5a3b24'},
  {id: 'od', label: 'OD green', color: '#3c4332'},
  // Camo finishes use the shared generated patterns (shared/camo.js), projected triplanar (the rifles have no UVs).
  {id: 'woodland', label: 'Woodland camo', color: '#5a6b3f', pattern: 'woodland'},
  {id: 'desert', label: 'Desert camo', color: '#b9a27a', pattern: 'desert'},
  {id: 'urban', label: 'Urban camo', color: '#8a8d90', pattern: 'urban'},
];
// Finish rows. A row with an option only shows (and only recolours) while that option is fitted.
export const FINISH_TARGETS = [
  {id: 'handguard'},
  {id: 'foregrip'},
  {id: 'grip'},
  {id: 'stock'},
  {id: 'magazine'},
  {
    id: 'suppressor',
    label: 'Suppressor',
    part: 'muzzle',
    option: 'can',
    finishes: [
      {id: 'original', label: 'Black'},
      {id: 'fde', label: 'FDE', color: '#76603f'},
      {id: 'od', label: 'OD green', color: '#3c4332'},
      {id: 'tungsten', label: 'Tungsten grey', color: '#5b5f63'},
      {id: 'bronze', label: 'Burnt bronze', color: '#4e3d2b'},
    ],
  },
];
// Optics carry sightHeight: the sight line's height above the optic mount point (m). Kept as data
// for aligning operator hero poses (cheek weld / eye line) when poses carry a weapon prop.
// Slot order is the Build panel order. Rails (10 mm steps) are set per rifle in models.js.
export const SLOTS = [
  {
    id: 'muzzle',
    camera: {direction: [0.55, 0.22, 0.8], distance: 0.42},
    label: 'Muzzle',
    library: [
      {
        id: 'ak74',
        grams: 70,
        label: 'AK-74 brake',
        detail: 'Classic two-chamber AK-74 brake with its wide front port.',
        build: ({materials}) =>
          group(
            [
              [tube(0.0105, -0.004, 0.03, [0, 0], 10), tube(0.012, 0.03, 0.07, [0, 0], 10), tube(0.0105, 0.07, 0.082, [0, 0], 10)],
              materials['h-190'],
            ],
            [
              [
                box(0.018, 0.004, 0.026, [0.05, 0, 0]),
                box(0.012, 0.022, 0.004, [0.05, 0, 0.011]),
                box(0.012, 0.022, 0.004, [0.05, 0, -0.011]),
              ],
              materials.stell,
            ],
          ),
      },
      {
        id: 'comp',
        grams: 95,
        label: 'Compensator',
        detail: 'Short three-port compensator; ports vent upward to hold the muzzle down.',
        build: real('muzzle-set.glb', {nodes: ['mb_556mm_2'], scale: 0.103763, anchor: ['min', 'c', 'c']}),
      },
      {
        id: 'can',
        grams: 540,
        label: 'Suppressor',
        detail: 'Full-length sound suppressor, 190 mm, on a quick-detach collar.',
        build: real('muzzle-set.glb', {nodes: ['sil_556m_8'], scale: 0.103763, anchor: ['min', 'c', 'c']}),
      },
      {id: 'bare', grams: 0, label: 'Bare', detail: 'Bare 24×1.5 mm threaded muzzle.'},
    ],
  },
  {
    id: 'rail',
    camera: {direction: [-0.3, 0.5, 1], distance: 0.5},
    label: 'Top rail',
    library: [
      {
        id: 'bare',
        fp: [0, 0],
        grams: -60,
        label: 'No rail',
        detail: 'Bolt-on rail removed: iron sights only. No optic or back-up sight can be mounted.',
      },
    ],
  },
  {
    id: 'optic',
    camera: {direction: [-0.45, 0.4, 1], distance: 0.5},
    label: 'Optic',
    library: [
      {
        id: 'micro',
        fp: [-0.026, 0.026],
        grams: 180,
        sightHeight: 0.034,
        label: 'Micro dot',
        detail: 'Compact tube red dot on a low mount.',
        build: real('collimator-set.glb', {nodes: ['holosun_403r_1'], scale: 0.103763, anchor: ['c', 'min', 'c']}),
      },
      {
        id: 'holo',
        fp: [-0.04, 0.04],
        grams: 320,
        sightHeight: 0.04,
        label: 'Holographic',
        detail: 'Box-hooded holographic sight with a wide window.',
        build: real('eotech.glb', {scale: 1.0, rotation: Z_FWD, anchor: ['c', 'min', 'c']}),
      },
      {
        id: 'scope',
        fp: [-0.13, 0.13],
        grams: 460,
        sightHeight: 0.042,
        label: '4× scope',
        detail: '4× fixed-power scope in two rings, 280 mm long.',
        build: buildScope,
      },
      {id: 'none', fp: [0, 0], sightHeight: 0.012, label: 'Irons', detail: 'No optic: the rifle falls back to its iron sights.'},
    ],
  },
  {
    id: 'buis',
    camera: {direction: [-0.45, 0.4, 1], distance: 0.5},
    label: 'Back-up sight',
    library: [
      {
        id: 'flip',
        fp: [-0.017, 0.017],
        grams: 55,
        label: 'Flip-up sight',
        detail: 'Folding back-up iron sight on a rail clamp. It rides ahead of the optic; a long scope pushes it forward.',
        build: real('iron-sight-set.glb', {nodes: ['kac_folding_rear_sight_9'], scale: 0.103763, anchor: ['c', 'min', 'c']}),
      },
      {id: 'none', fp: [0, 0], label: 'None', detail: 'No back-up sight.'},
    ],
  },
  {
    id: 'foregrip',
    camera: {direction: [0.1, -0.28, 1], distance: 0.46, aim: [0, -0.03, 0]},
    label: 'Foregrip',
    library: [
      {
        id: 'vertical',
        fp: [-0.023, 0.023],
        grams: 90,
        label: 'Vertical',
        detail: 'Plain vertical foregrip on a rail clamp.',
        build: real('grip-rvg.glb', {scale: 1.46184, rotation: Z_FWD, anchor: ['c', 'max', 'c']}),
      },
      {
        id: 'angled',
        fp: [-0.051, 0.045],
        grams: 60,
        label: 'Angled',
        detail: 'Angled foregrip: a thumb ramp for a high, straight-arm hold.',
        build: real('grip-afg.glb', {nodes: ['normal_0'], scale: 0.9, rotation: Z_FWD, anchor: ['c', 'max', 'c']}),
      },
      {
        id: 'bipod',
        fp: [-0.14, 0.14],
        grams: 450,
        label: 'Bipod',
        detail: 'Folding bipod on the lower rail.',
        // the file spreads its legs along x: a quarter turn spreads them sideways, as a deployed bipod stands
        build: real('g3-bipod.glb', {scale: 0.995917, rotation: [0, Math.PI / 2, 0], anchor: ['c', 'max', 'c']}),
      },
      {
        id: 'gp25',
        fp: [-0.14, 0.2],
        grams: 1500,
        label: 'GP-25 launcher',
        detail: '40 mm underbarrel grenade launcher clamped under the handguard.',
        // without the loose VOG round the file shows beside it; the clamp sits under the handguard, the tube runs forward
        build: real('gp25.glb', {
          nodes: ['Cube_1', 'Cylinder004_2', 'Cylinder003_3', 'Cube003_4'],
          scale: 0.103763,
          anchor: ['c', 'max', 'c'],
          offset: [0.035, 0, 0],
        }),
      },
      {
        id: 'stop',
        fp: [-0.018, 0.022],
        grams: 30,
        label: 'Hand stop',
        detail: 'Low hand stop at the front of the lower rail.',
        build: real('ak-grips.glb', {nodes: ['RK-0_4'], scale: 0.65, rotation: Z_BACK, anchor: ['c', 'max', 'c']}),
      },
      {id: 'none', fp: [0, 0], label: 'None', detail: 'Clean handguard, no foregrip.'},
    ],
  },
  {
    id: 'side',
    camera: {direction: [0.25, 0.2, 1], distance: 0.42},
    label: 'Side rail',
    library: [
      // Mounted on the right-hand rail: +z points away from the rifle.
      {
        id: 'light',
        fp: [-0.045, 0.052],
        grams: 110,
        label: 'Weapon light',
        detail: 'Compact weapon light on a rail clamp; its beam lights the scene.',
        build: real('light-surefire.glb', {
          scale: 0.00638423,
          rotation: [-Math.PI / 2, -Math.PI / 2, 0],
          stretch: [0.7, 1.4, 1.4],
          anchor: ['c', 'c', 'min'],
        }),
      },
      {
        id: 'laser',
        fp: [-0.025, 0.03],
        grams: 80,
        label: 'Laser',
        detail: 'Visible laser aiming module; the dot helps from the hip.',
        build: real('peq15.glb', {scale: 0.103763, rotation: [Math.PI / 2, 0, 0], anchor: ['c', 'c', 'min']}),
      },
      {
        id: 'combo',
        fp: [-0.032, 0.034],
        grams: 190,
        label: 'Light + laser',
        detail: 'Combined light and laser unit.',
        build: real('peq2.glb', {scale: 0.103763, rotation: [Math.PI / 2, 0, 0], anchor: ['c', 'c', 'min']}),
      },
      {id: 'none', fp: [0, 0], label: 'None', detail: 'Bare side rail.'},
    ],
  },
  {
    id: 'magazine',
    camera: {direction: [0.3, -0.05, 1], distance: 0.55, aim: [0.03, -0.1, 0]},
    label: 'Magazine',
    library: [
      {
        id: 'clear',
        grams: 220,
        label: 'Translucent polymer',
        detail: 'The same magazine in smoked translucent polymer: the rounds show through.',
        build: clearMagazine,
      },
      // Stretched copies of the source magazine; the part inside the mag well keeps its shape.
      {
        id: '45',
        grams: 310,
        label: 'Extended',
        detail: 'Extended RPK-style magazine: the 30-rounder lengthened by a third.',
        build: ({original}) =>
          reshape(original, v => {
            if (v.y < 0) v.y *= 1.36;
          }),
      },
      {
        id: '60',
        grams: 450,
        label: 'Quad-stack',
        detail: 'Quad-stack magazine: single-stack at the feed lips, twice as wide below the mag well.',
        build: ({original}) =>
          reshape(original, v => {
            if (v.y < 0) v.y *= 1.18;
            v.z *= 1 + 0.85 * smoothstep(0.02, 0.06, -v.y);
          }),
      },
      // Drum: a short feed tower out of the mag well into a 136 mm drum, axis across the rifle.
      {
        id: 'drum',
        grams: 900,
        label: 'Drum',
        detail: 'Drum magazine with a short feed tower into a round drum.',
        build: real('ak74-drum.glb', {
          nodes: ['11_AKDrumMag'],
          scale: 0.161309,
          anchor: ['c', 'max', 'c'],
          offset: [0, 0.025, 0],
        }),
      },
      {id: 'none', label: 'None', detail: 'Magazine removed.'},
    ],
  },
  {
    id: 'handguard',
    camera: {direction: [0.2, 0.25, 1], distance: 0.5},
    label: 'Handguard',
    library: [
      {
        id: 'mlok',
        grams: 340,
        label: 'CNC M-LOK',
        detail: 'Machined octagonal free-float handguard with M-LOK slots and a full-length top rail.',
        build: mlokHandguard,
      },
    ],
  },
  {
    id: 'grip',
    camera: {direction: [-0.35, 0.05, 1], distance: 0.42, aim: [-0.02, -0.05, 0]},
    label: 'Pistol grip',
    library: [
      {id: 'cnc', grams: 85, label: 'Machined grip', detail: 'Straight-backed grip with a finger groove and a beavertail.', build: cncGrip},
      {
        id: 'classic',
        grams: 70,
        label: 'Classic plum',
        detail: 'Classic plum polymer AK grip, slimmer and more steeply raked.',
        build: () =>
          group([
            profile(
              [
                [0.016, 0.004],
                [-0.02, 0.004],
                [-0.062, -0.112],
                [-0.058, -0.122],
                [-0.03, -0.124],
                [-0.004, -0.07],
                [0.012, -0.03],
              ],
              0.028,
              0.003,
            ),
            plum,
          ]),
      },
    ],
  },
  {
    id: 'stock',
    camera: {direction: [-0.7, 0.25, 0.7], distance: 0.55},
    label: 'Stock',
    library: [
      {id: 'none', label: 'Removed', detail: 'Stock removed: bare trunnion.'},
      {
        id: 'cnc',
        grams: 620,
        label: 'CNC folding stock',
        detail: 'Machined skeletal folding stock on a buffer-tube adapter, with a rubber pad.',
        build: cncStock,
      },
    ],
  },
  {
    id: 'trigger',
    camera: {direction: [0.15, -0.25, 1], distance: 0.34, aim: [0, -0.02, 0]},
    label: 'Trigger',
    library: [
      {
        id: 'match',
        grams: 12,
        label: 'Match trigger',
        detail: 'Wide, flat match trigger shoe: a cleaner, lighter break.',
        build: ({materials}) =>
          group([[box(0.012, 0.028, 0.012, [0.002, -0.014, 0]), box(0.016, 0.004, 0.022, [0.006, -0.03, 0])], materials.stell]),
      },
    ],
  },
  {
    id: 'charging',
    camera: {direction: [0.15, 0.25, 1], distance: 0.4},
    label: 'Charging handle',
    library: [
      // Right-hand side of the bolt carrier: +z points away from the rifle.
      {
        id: 'ext',
        grams: 25,
        label: 'Extended handle',
        detail: 'Oversized charging lever with a knurled knob, easy to hit with gloves on.',
        build: ({materials}) =>
          group([
            [
              box(0.014, 0.012, 0.03, [0, 0, 0.015]),
              box(0.02, 0.018, 0.014, [0.004, 0, 0.037]),
              box(0.012, 0.008, 0.02, [-0.014, 0, 0.012]),
            ],
            materials.stell,
          ]),
      },
    ],
  },
  {
    id: 'sling',
    camera: {direction: [-0.8, 0.15, 0.6], distance: 0.62, aim: [0.2, -0.05, 0]},
    label: 'Sling',
    library: [
      {
        id: 'swivel',
        grams: 35,
        label: 'Sling swivel',
        detail: 'Quick-detach swivel on the rear mount, ready for a sling.',
        build: ({materials}) =>
          group([
            [
              new T.TorusGeometry(0.012, 0.0027, 6, 12).rotateY(Math.PI / 2).translate(-0.014, -0.012, 0),
              box(0.016, 0.012, 0.01, [-0.004, 0, 0]),
            ],
            materials.stell,
          ]),
      },
      {
        id: 'strap',
        grams: 140,
        label: 'Two-point sling',
        detail: 'Padded two-point sling running from the rear swivel to the handguard, hanging in a loose catenary.',
        build: buildSling,
      },
    ],
  },
];
