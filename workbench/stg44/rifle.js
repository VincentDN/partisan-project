// StG 44 (2044) bench: the base rifle (receiver, handguard, rails, barrel, sights) built from parts. +x is the muzzle, +y up.
import * as THREE from 'three';
import {box, profile, rail, tube} from './finish.js';

// Where attachments sit: rail slots carry an x range (metres) the part may slide along.
export const MOUNTS = {
  optic: {y: 0.0925, range: [-0.02, 0.36], start: 0.1},
  laser: {y: 0.0925, range: [0.44, 0.585], start: 0.55},
  light: {y: 0.056, z: 0.0275, range: [0.43, 0.6], start: 0.56},
  under: {y: 0.0215, range: [0.37, 0.57], start: 0.45},
  muzzle: {x: 0.805, y: 0.05},
  stock: {x: -0.085, y: 0.055},
  mag: {x: 0.158, y: -0.04},
};

export function buildRifle(M) {
  const g = new THREE.Group();
  const add = (...m) => g.add(...m);
  // receiver: stamped upper with the StG's long ribs, and the trigger housing under it
  add(
    profile(
      M.body,
      [
        [-0.085, 0.03],
        [-0.085, 0.074],
        [-0.06, 0.084],
        [0.3, 0.084],
        [0.3, 0.04],
        [0.19, 0.04],
        [0.17, 0.03],
      ],
      0.0225,
      0.0016,
    ),
  );
  add(
    profile(
      M.body,
      [
        [-0.085, 0.031],
        [0.13, 0.031],
        [0.118, -0.008],
        [0.07, -0.02],
        [-0.068, -0.02],
        [-0.085, 0.002],
      ],
      0.019,
      0.0014,
    ),
  );
  for (const s of [1, -1]) {
    add(
      box(M.body, -0.05, 0.27, 0.064, 0.0705, 0.0015, 0.0007, s * 0.0232),
      box(M.body, -0.05, 0.12, 0.046, 0.052, 0.0015, 0.0007, s * 0.0232),
    );
    add(box(M.body, -0.06, 0.1, 0.004, 0.012, 0.0012, 0.0006, s * 0.0196));
    for (const [x, y] of [
      [-0.062, 0.018],
      [0.095, 0.02],
      [0.02, -0.008],
    ])
      add(tube(M.steel, s * 0.0185, s * 0.0215, x, 0.0045, {axis: 'z', z: y, seg: 10}));
  }
  add(box(M.black, 0.105, 0.165, 0.05, 0.066, 0.0012, 0.0004, 0.0236)); // ejection port
  add(box(M.steel, 0.07, 0.165, 0.0665, 0.071, 0.002, 0.0006, 0.0245)); // dust cover hinge
  add(
    tube(M.steel, 0.0225, 0.046, 0.215, 0.0055, {axis: 'z', z: 0.058, seg: 10}),
    box(M.steel, 0.207, 0.223, 0.052, 0.064, 0.003, 0.0008, 0.047),
  ); // charging handle
  add(box(M.steel, -0.03, -0.012, 0.014, 0.024, 0.004, 0.0008, 0.0215)); // selector
  // magazine well and trigger group
  add(
    profile(
      M.body,
      [
        [0.128, 0.035],
        [0.188, 0.035],
        [0.19, -0.04],
        [0.126, -0.04],
      ],
      0.0185,
      0.0014,
    ),
  );
  add(box(M.steel, 0.112, 0.126, -0.03, -0.006, 0.006, 0.001)); // magazine release paddle
  add(
    profile(
      M.steel,
      [
        [0.02, -0.02],
        [0.118, -0.02],
        [0.118, -0.024],
        [0.1, -0.052],
        [0.035, -0.052],
        [0.02, -0.024],
      ],
      0.006,
      0.001,
    ),
  );
  add(
    profile(
      M.black,
      [
        [0.026, -0.0235],
        [0.112, -0.0235],
        [0.097, -0.0485],
        [0.038, -0.0485],
      ],
      0.0065,
      0,
    ),
  ); // guard opening
  add(
    profile(
      M.steel,
      [
        [0.072, -0.02],
        [0.08, -0.02],
        [0.074, -0.044],
        [0.068, -0.04],
      ],
      0.003,
      0.0006,
    ),
  ); // trigger
  // pistol grip: modern raked polymer grip with a palm swell
  add(
    profile(
      M.furniture,
      [
        [-0.04, -0.019],
        [0.02, -0.019],
        [0.006, -0.06],
        [-0.012, -0.128],
        [-0.068, -0.12],
        [-0.052, -0.06],
      ],
      0.0165,
      0.003,
    ),
  );
  for (let i = 0; i < 5; i++)
    add(
      box(M.black, -0.05 + i * 0.002, -0.012 + i * 0.002, -0.07 - i * 0.01, -0.066 - i * 0.01, 0.0005, 0, 0.0167),
      box(M.black, -0.05 + i * 0.002, -0.012 + i * 0.002, -0.07 - i * 0.01, -0.066 - i * 0.01, 0.0005, 0, -0.0167),
    );
  // free-float handguard with slots, rails on top, under and both sides
  add(
    profile(
      M.furniture,
      [
        [0.3, 0.03],
        [0.3, 0.084],
        [0.625, 0.084],
        [0.625, 0.036],
        [0.612, 0.026],
        [0.33, 0.026],
      ],
      0.0235,
      0.003,
    ),
  );
  for (let i = 0; i < 5; i++)
    for (const s of [1, -1])
      add(
        box(M.black, 0.325 + i * 0.058, 0.365 + i * 0.058, 0.036, 0.043, 0.0008, 0.0003, s * 0.0238),
        ...(i < 2 ? [box(M.black, 0.325 + i * 0.058, 0.365 + i * 0.058, 0.066, 0.073, 0.0008, 0.0003, s * 0.0238)] : []),
      );
  add(rail(M.steel, -0.058, 0.622, 0.088), rail(M.steel, 0.36, 0.6, 0.026, {dir: -1}));
  add(rail(M.steel, 0.42, 0.62, 0.056, {dir: 'side', z: 0.0262}), rail(M.steel, 0.42, 0.62, 0.056, {dir: 'side', z: -0.0262}));
  // barrel, gas system and the hooded front sight
  add(
    tube(M.steel, 0.3, 0.8, 0.05, 0.0092, {r2: 0.0082}),
    tube(M.steel, 0.625, 0.745, 0.071, 0.0065, {seg: 12}),
    tube(M.steel, 0.745, 0.76, 0.071, 0.0085, {seg: 12}),
  );
  add(
    profile(
      M.steel,
      [
        [0.655, 0.038],
        [0.69, 0.038],
        [0.69, 0.08],
        [0.655, 0.08],
      ],
      0.011,
      0.0015,
    ),
  );
  add(
    profile(
      M.steel,
      [
        [0.722, 0.04],
        [0.752, 0.04],
        [0.748, 0.1],
        [0.728, 0.1],
      ],
      0.0075,
      0.0012,
    ),
  );
  const hood = new THREE.Mesh(new THREE.TorusGeometry(0.0125, 0.0022, 8, 22), M.steel);
  hood.rotation.y = Math.PI / 2;
  hood.position.set(0.738, 0.112, 0);
  hood.castShadow = true;
  hood.geometry.setAttribute('aEdge', new THREE.BufferAttribute(new Float32Array(hood.geometry.attributes.position.count), 1));
  add(hood, tube(M.steel, 0.1, 0.118, 0, 0.0012, {axis: 'y', z: 0.738, seg: 6}));
  add(tube(M.steel, 0.785, 0.805, 0.05, 0.0098, {seg: 14})); // thread collar
  // folding rear sight and the buffer tube the stock rides on
  add(
    box(M.steel, -0.05, -0.03, 0.0925, 0.1, 0.008, 0.0008),
    profile(
      M.steel,
      [
        [-0.046, 0.1],
        [-0.04, 0.1],
        [-0.04, 0.114],
        [-0.046, 0.114],
      ],
      0.007,
      0.0006,
    ),
  );
  add(tube(M.steel, -0.275, -0.085, 0.055, 0.0135, {seg: 16}), tube(M.steel, -0.098, -0.085, 0.055, 0.0175, {seg: 16}));
  return g;
}
