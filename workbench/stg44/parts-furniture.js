// StG 44 (2044) bench: grips, muzzle devices, stocks and magazines (the non-sighting slots).
import * as THREE from 'three';
import {box, profile, tube} from './finish.js';

const grp = (...m) => {
  const g = new THREE.Group();
  g.add(...m.filter(Boolean));
  return g;
};

function curvedMag(M, rounds) {
  const g = new THREE.Group(),
    n = rounds > 30 ? 11 : 8,
    R = 0.34;
  for (let i = 0; i < n; i++) {
    const a = 0.06 + i * 0.075,
      seg = profile(
        i === n - 1 ? M.black : M.furniture,
        [
          [-0.027, -0.0135],
          [0.027, -0.0135],
          [0.027, 0.0135],
          [-0.027, 0.0135],
        ],
        i === n - 1 ? 0.0135 : 0.0125,
        0.0018,
      );
    seg.position.set(R * (1 - Math.cos(a)), -R * Math.sin(a) + 0.01, 0);
    seg.rotation.z = a;
    g.add(seg);
    if (i === Math.round(n * 0.62)) {
      const band = profile(
        M.red,
        [
          [-0.0278, -0.006],
          [0.0278, -0.006],
          [0.0278, 0.006],
          [-0.0278, 0.006],
        ],
        0.0131,
        0.0004,
      );
      band.position.copy(seg.position);
      band.rotation.z = a;
      g.add(band);
    }
  }
  return g;
}

function haenelStock(M, ext) {
  const g = grp(
    profile(
      M.furniture,
      [
        [-0.2, 0.034],
        [-0.03, 0.034],
        [-0.03, 0.078],
        [-0.2, 0.082],
      ],
      0.017,
      0.0025,
    ),
    profile(
      M.furniture,
      [
        [-0.2, 0.082],
        [-0.2, -0.06],
        [-0.178, -0.06],
        [-0.168, 0.03],
      ],
      0.016,
      0.0025,
    ),
    profile(
      M.furniture,
      [
        [-0.176, -0.055],
        [-0.165, -0.06],
        [-0.05, 0.032],
        [-0.062, 0.036],
      ],
      0.009,
      0.0015,
    ),
    box(M.black, -0.212, -0.2, -0.062, 0.084, 0.017, 0.003),
    box(M.steel, -0.07, -0.045, 0.024, 0.034, 0.006, 0.001),
  );
  g.position.x = -0.045 - ext;
  return g;
}

export const FURNITURE = {
  under: {
    label: 'Underbarrel',
    options: [
      {
        id: 'angled',
        label: 'Angled foregrip',
        grams: 110,
        len: 0.06,
        build: M =>
          grp(
            box(M.steel, -0.05, 0.04, -0.006, 0, 0.0115, 0.0008),
            profile(
              M.furniture,
              [
                [-0.055, -0.006],
                [0.05, -0.006],
                [0.03, -0.022],
                [-0.035, -0.07],
                [-0.062, -0.066],
              ],
              0.0125,
              0.0025,
            ),
          ),
      },
      {
        id: 'vertical',
        label: 'Vertical grip',
        grams: 150,
        len: 0.03,
        build: M =>
          grp(
            box(M.steel, -0.025, 0.025, -0.008, 0, 0.0115, 0.0008),
            profile(
              M.furniture,
              [
                [-0.018, -0.008],
                [0.018, -0.008],
                [0.015, -0.1],
                [-0.02, -0.1],
              ],
              0.014,
              0.003,
            ),
            box(M.black, -0.022, 0.017, -0.105, -0.1, 0.0145, 0.001),
          ),
      },
      {
        id: 'bipod',
        label: 'Folding bipod',
        grams: 320,
        len: 0.03,
        build: M =>
          grp(
            box(M.steel, -0.025, 0.025, -0.012, 0, 0.0125, 0.001),
            tube(M.steel, -0.19, 0, -0.02, 0.0055, {z: 0.012, seg: 8}),
            tube(M.steel, -0.19, 0, -0.02, 0.0055, {z: -0.012, seg: 8}),
            box(M.black, -0.205, -0.185, -0.028, -0.012, 0.0055, 0.001, 0.012),
            box(M.black, -0.205, -0.185, -0.028, -0.012, 0.0055, 0.001, -0.012),
          ),
      },
      {id: 'none', label: 'Bare rail', grams: 0, len: 0, build: () => null},
    ],
  },
  muzzle: {
    label: 'Muzzle',
    options: [
      {
        id: 'brake',
        label: 'Three-port brake',
        grams: 90,
        build: M =>
          grp(
            tube(M.steel, 0, 0.065, 0, 0.0125, {seg: 14}),
            ...[0.014, 0.032, 0.05].map(x => box(M.black, x, x + 0.008, -0.004, 0.004, 0.0135, 0.0005)),
          ),
      },
      {
        id: 'hider',
        label: 'Flash hider',
        grams: 60,
        build: M =>
          grp(
            tube(M.steel, 0, 0.05, 0, 0.011, {r2: 0.0125, seg: 12}),
            ...[0, 1, 2]
              .map(i => box(M.black, 0.015, 0.045, -0.0015, 0.0015, 0.0128, 0, 0))
              .map((b, i) => ((b.rotation.x = (i * Math.PI) / 3), b)),
          ),
      },
      {
        id: 'supp',
        label: 'Sound suppressor',
        grams: 420,
        build: M =>
          grp(
            tube(M.steel, 0, 0.012, 0, 0.012, {seg: 14}),
            tube(M.black, 0.01, 0.19, 0, 0.0195, {seg: 20}),
            tube(M.steel, 0.19, 0.196, 0, 0.0185, {seg: 20}),
          ),
      },
    ],
  },
  stock: {
    label: 'Stock',
    slide: {range: [0, 0.06], start: 0.03, label: 'Length of pull'},
    options: [
      {id: 'haenel', label: 'Haenel adjustable, model 2043', grams: 330, build: (M, s) => haenelStock(M, s)},
      {
        id: 'skeleton',
        label: 'Skeleton stock',
        grams: 240,
        build: (M, s) => {
          const g = grp(
            tube(M.steel, -0.22, -0.02, 0.055, 0.0165, {seg: 14}),
            profile(
              M.furniture,
              [
                [-0.235, 0.085],
                [-0.215, 0.085],
                [-0.215, -0.055],
                [-0.235, -0.055],
              ],
              0.015,
              0.003,
            ),
            tube(M.steel, -0.215, -0.04, -0.01, 0.006, {seg: 8}),
          );
          g.children[2].rotation.z = 0.33;
          g.children[2].position.set(-0.128, 0.0, 0);
          g.position.x = -0.045 - s;
          return g;
        },
      },
    ],
  },
  mag: {
    label: 'Magazine',
    options: [
      {id: 'kurz25', label: '25 rounds, 7.92×33 Kurz', grams: 420, build: M => curvedMag(M, 25)},
      {id: 'kurz40', label: '40 rounds, extended', grams: 610, build: M => curvedMag(M, 40)},
    ],
  },
};
