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
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';

// Real (downloaded, CC0 / CC BY) attachment parts. Replace a code-built `build` with
//   build: glb('red-dot.glb', {position:[0,0,0], rotation:[0,0,0], scale:1})
// where the file lives in assets/models/attachments/ (import it with tools/assets/import-asset.py,
// add its budget to assets/register.json). Geometry arrives asynchronously into an empty group,
// so the slot works immediately and the part pops in when loaded. Units: metres in slot space
// (+x toward the muzzle, +y up, +z right side, origin at the mount point).
const partLoader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
export const glb =
  (file, {position = [0, 0, 0], rotation = [0, 0, 0], scale = 1} = {}) =>
  () => {
    const group = new T.Group();
    partLoader.load(
      new URL(`../assets/models/attachments/${file}`, import.meta.url).href,
      gltf => {
        const model = gltf.scene;
        model.position.set(...position);
        model.rotation.set(...rotation);
        model.scale.setScalar(scale);
        model.traverse(m => {
          if (m.isMesh) {
            m.castShadow = m.receiveShadow = true;
            m.material = m.material.clone();
          }
        });
        group.add(model);
      },
      undefined,
      err => console.error(`attachment ${file} failed to load`, err),
    );
    return group;
  };

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
        build: ({materials}) =>
          group(
            [[tube(0.0135, -0.004, 0.052, [0, 0], 8)], materials.stell],
            [
              [
                box(0.008, 0.005, 0.012, [0.012, 0.012, 0]),
                box(0.008, 0.005, 0.012, [0.026, 0.012, 0]),
                box(0.008, 0.005, 0.012, [0.04, 0.012, 0]),
              ],
              materials['h-190'],
            ],
          ),
      },
      {
        id: 'can',
        grams: 540,
        label: 'Suppressor',
        detail: 'Full-length sound suppressor, 190 mm, on a quick-detach collar.',
        build: ({materials}) =>
          group(
            [[tube(0.016, -0.004, 0.024, [0, 0], 12)], materials.stell],
            [[tube(0.0195, 0.024, 0.19, [0, 0], 12), tube(0.017, 0.19, 0.198, [0, 0], 12, 0.0195)], materials['h-190']],
          ),
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
        build: ({materials}) => {
          const g = group(
            [
              [
                box(0.042, 0.01, 0.03, [0, 0.005, 0]),
                box(0.03, 0.012, 0.018, [0, 0.016, 0]),
                tube(0.0155, -0.024, 0.024, [0.034, 0], 12),
                tube(0.0175, 0.018, 0.026, [0.034, 0], 12),
                tube(0.0175, -0.026, -0.018, [0.034, 0], 12),
                new T.CylinderGeometry(0.006, 0.006, 0.012, 8).translate(0, 0.054, 0),
              ],
              materials['h-190'],
            ],
            [tube(0.0145, 0.0245, 0.0255, [0.034, 0], 12), materials.glass],
          );
          const dot = new T.Mesh(new T.SphereGeometry(0.001, 6, 4), materials.red_emission);
          dot.position.set(0, 0.034, 0);
          g.add(dot);
          return g;
        },
      },
      {
        id: 'holo',
        fp: [-0.04, 0.04],
        grams: 320,
        sightHeight: 0.04,
        label: 'Holographic',
        detail: 'Box-hooded holographic sight with a wide window.',
        build: ({materials}) => {
          const g = group(
            [
              [
                box(0.08, 0.012, 0.032, [0, 0.006, 0]),
                box(0.028, 0.026, 0.036, [-0.02, 0.025, 0]),
                box(0.05, 0.004, 0.036, [0.012, 0.058, 0]),
                box(0.05, 0.046, 0.004, [0.012, 0.035, 0.017]),
                box(0.05, 0.046, 0.004, [0.012, 0.035, -0.017]),
                box(0.012, 0.012, 0.012, [-0.02, 0.044, 0.02]),
              ],
              materials['h-190'],
            ],
            [box(0.002, 0.034, 0.03, [0.03, 0.037, 0]), materials.glass],
          );
          const dot = new T.Mesh(new T.SphereGeometry(0.0012, 6, 4), materials.red_emission);
          dot.position.set(0.03, 0.04, 0);
          g.add(dot);
          return g;
        },
      },
      {
        id: 'scope',
        fp: [-0.155, 0.151],
        grams: 460,
        sightHeight: 0.046,
        label: '4× scope',
        detail: '4× fixed-power scope in two rings, 280 mm long.',
        build: ({materials}) =>
          group(
            [
              [
                tube(0.0127, -0.07, 0.07, [0.046, 0], 12),
                tube(0.021, 0.07, 0.12, [0.046, 0], 12, 0.0127),
                tube(0.021, 0.12, 0.15, [0.046, 0], 12),
                tube(0.0127, -0.12, -0.07, [0.046, 0], 12, 0.019),
                tube(0.019, -0.155, -0.12, [0.046, 0], 12),
                new T.CylinderGeometry(0.009, 0.009, 0.018, 8).translate(0, 0.066, 0),
                new T.CylinderGeometry(0.009, 0.009, 0.018, 8).rotateX(Math.PI / 2).translate(0, 0.046, 0.02),
                box(0.016, 0.03, 0.028, [-0.05, 0.021, 0]),
                box(0.016, 0.03, 0.028, [0.05, 0.021, 0]),
                box(0.026, 0.008, 0.03, [-0.05, 0.004, 0]),
                box(0.026, 0.008, 0.03, [0.05, 0.004, 0]),
              ],
              materials['h-190'],
            ],
            [[tube(0.019, 0.1495, 0.151, [0.046, 0], 12), tube(0.0165, -0.1555, -0.1545, [0.046, 0], 12)], materials.glass],
          ),
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
        build: ({materials}) =>
          group([
            [
              box(0.034, 0.008, 0.03, [0, 0.004, 0]),
              box(0.006, 0.02, 0.004, [0, 0.018, 0.011]),
              box(0.006, 0.02, 0.004, [0, 0.018, -0.011]),
              box(0.006, 0.004, 0.026, [0, 0.03, 0]),
            ],
            materials['h-190'],
          ]),
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
        build: ({materials}) =>
          group([
            [
              box(0.046, 0.01, 0.028, [0, -0.005, 0]),
              new T.CylinderGeometry(0.0145, 0.013, 0.085, 8).translate(0, -0.052, 0),
              new T.CylinderGeometry(0.015, 0.015, 0.006, 8).translate(0, -0.096, 0),
            ],
            materials.polymer,
          ]),
      },
      {
        id: 'angled',
        fp: [-0.051, 0.045],
        grams: 60,
        label: 'Angled',
        detail: 'Angled foregrip: a thumb ramp for a high, straight-arm hold.',
        build: ({materials}) =>
          group([
            profile(
              [
                [-0.048, 0],
                [0.042, 0],
                [0.038, -0.012],
                [-0.028, -0.046],
                [-0.046, -0.042],
              ],
              0.028,
              0.003,
            ),
            materials.polymer,
          ]),
      },
      {
        id: 'stop',
        fp: [-0.018, 0.022],
        grams: 30,
        label: 'Hand stop',
        detail: 'Low hand stop at the front of the lower rail.',
        build: ({materials}) =>
          group([
            profile(
              [
                [-0.016, 0],
                [0.02, 0],
                [0.02, -0.016],
                [0.008, -0.021],
                [-0.016, -0.008],
              ],
              0.024,
              0.002,
            ),
            materials.polymer,
          ]),
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
        build: ({materials}) => {
          const g = group(
            [
              [
                box(0.03, 0.012, 0.016, [0, 0, 0.008]),
                tube(0.013, -0.045, 0.035, [0, 0.03], 10),
                tube(0.016, 0.035, 0.05, [0, 0.03], 10, 0.013),
              ],
              materials['h-190'],
            ],
            [
              tube(0.0145, 0.0505, 0.0515, [0, 0.03], 10),
              new T.MeshStandardMaterial({color: '#fff6de', emissive: '#fff1c4', emissiveIntensity: 2}),
            ],
          );
          // Beam: a soft spotlight along the barrel.
          const beam = new T.SpotLight(0xfff1d6, 6, 6, 0.28, 0.6, 1.5);
          beam.position.set(0.052, 0, 0.03);
          beam.target.position.set(2, 0, 0.03);
          g.add(beam, beam.target);
          return g;
        },
      },
      {
        id: 'laser',
        fp: [-0.025, 0.03],
        grams: 80,
        label: 'Laser',
        detail: 'Visible laser aiming module; the dot helps from the hip.',
        build: ({materials}) => {
          const g = group(
            [[box(0.03, 0.012, 0.016, [0, 0, 0.008]), box(0.06, 0.028, 0.026, [0.005, 0.02, 0.025])], materials['h-190']],
            [box(0.002, 0.008, 0.008, [0.036, 0.02, 0.025]), materials.red_emission],
          );
          const ray = new T.Mesh(
            new T.CylinderGeometry(0.0006, 0.0006, 1.4, 4).rotateZ(-Math.PI / 2).translate(0.037 + 0.7, 0.02, 0.025),
            new T.MeshBasicMaterial({color: '#ff2a2a', transparent: true, opacity: 0.55, depthWrite: false}),
          );
          ray.userData.visualEffect = true;
          g.add(ray);
          return g;
        },
      },
      {
        id: 'combo',
        fp: [-0.032, 0.034],
        grams: 190,
        label: 'Light + laser',
        detail: 'Combined light and laser unit.',
        build: ({materials}) => {
          const g = group(
            [[box(0.03, 0.012, 0.016, [0, 0, 0.008]), box(0.065, 0.028, 0.028, [0, 0.022, 0.026])], materials['h-190']],
            [
              tube(0.0105, 0.0325, 0.0335, [0.026, 0.026], 10),
              new T.MeshStandardMaterial({color: '#fff6de', emissive: '#fff1c4', emissiveIntensity: 2}),
            ],
            [box(0.002, 0.006, 0.006, [0.0335, 0.012, 0.026]), materials.red_emission],
          );
          const beam = new T.SpotLight(0xfff1d6, 6, 6, 0.28, 0.6, 1.5);
          beam.position.set(0.034, 0.026, 0.026);
          beam.target.position.set(2, 0.026, 0.026);
          g.add(beam, beam.target);
          return g;
        },
      },
      {id: 'none', fp: [0, 0], label: 'None', detail: 'Bare side rail.'},
    ],
  },
  {
    id: 'magazine',
    camera: {direction: [0.3, -0.05, 1], distance: 0.55, aim: [0.03, -0.1, 0]},
    label: 'Magazine',
    library: [
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
        detail: 'Drum magazine: a short feed tower into a 136 mm drum with a winding key on the right face.',
        build: ({materials}) =>
          group(
            [
              [
                profile(
                  [
                    [-0.062, 0.03],
                    [0.014, 0.03],
                    [0.02, -0.02],
                    [0.03, -0.07],
                    [-0.042, -0.07],
                    [-0.056, -0.02],
                  ],
                  0.026,
                  0.002,
                ),
                new T.CylinderGeometry(0.068, 0.068, 0.05, 16).rotateX(Math.PI / 2).translate(-0.008, -0.118, 0),
              ],
              materials.polymer,
            ],
            [
              [
                new T.CylinderGeometry(0.064, 0.064, 0.058, 16).rotateX(Math.PI / 2).translate(-0.008, -0.118, 0),
                new T.CylinderGeometry(0.018, 0.018, 0.066, 10).rotateX(Math.PI / 2).translate(-0.008, -0.118, 0),
                box(0.03, 0.006, 0.006, [-0.008, -0.118, 0.035]),
              ],
              materials['h-190'],
            ],
          ),
      },
      {id: 'none', label: 'None', detail: 'Magazine removed.'},
    ],
  },
  {
    id: 'grip',
    camera: {direction: [-0.35, 0.05, 1], distance: 0.42, aim: [-0.02, -0.05, 0]},
    label: 'Pistol grip',
    library: [
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
    library: [{id: 'none', label: 'Removed', detail: 'Stock removed: bare trunnion.'}],
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
        build: ({materials}) => {
          const top = [],
            bot = [],
            n = 14,
            len = 0.64,
            sag = 0.15;
          for (let k = 0; k <= n; k++) {
            const t = k / n,
              x = -0.014 + t * len,
              y = -0.012 - sag * Math.sin(Math.PI * t);
            top.push([x, y]);
            bot.push([x, y - 0.006]);
          }
          return group(
            [
              [
                new T.TorusGeometry(0.012, 0.0027, 6, 12).rotateY(Math.PI / 2).translate(-0.014, -0.012, 0),
                box(0.016, 0.012, 0.01, [-0.004, 0, 0]),
              ],
              materials.stell,
            ],
            [profile([...top, ...bot.reverse()], 0.03, 0.001), materials.polymer],
          );
        },
      },
    ],
  },
];
