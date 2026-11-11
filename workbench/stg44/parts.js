// StG 44 (2044) bench: the swappable attachments per slot. Each builder returns a group whose origin is its mount point.
import * as THREE from 'three';
import {box, profile, rail, tube} from './finish.js';
import {FURNITURE} from './parts-furniture.js';

const grp = (...m) => {
  const g = new THREE.Group();
  g.add(...m.filter(Boolean));
  return g;
};
const clamp = (M, x0, x1) => [
  box(M.steel, x0, x1, 0, 0.011, 0.0125, 0.001),
  tube(M.steel, 0.0125, 0.019, (x0 + x1) / 2, 0.004, {axis: 'z', z: 0.0055, seg: 8}),
];

// id, label, grams (handling sound weight), len (half-length kept inside the rail), build(M, state)
export const SLOTS = {
  optic: {
    label: 'Optic',
    options: [
      {
        id: 'reddot',
        label: 'Reflex sight on riser',
        grams: 190,
        len: 0.04,
        build: M =>
          grp(
            ...clamp(M, -0.03, 0.03),
            box(M.steel, -0.02, 0.02, 0.011, 0.03, 0.01, 0.001),
            tube(M.steel, -0.036, 0.036, 0.05, 0.021, {seg: 18}),
            tube(M.glass, -0.0365, 0.0365, 0.05, 0.0165, {seg: 18}),
            tube(M.steel, -0.008, 0.008, 0.074, 0.008, {seg: 10}),
            tube(M.steel, 0.02, 0.03, 0.006, 0.007, {axis: 'z', z: 0.05, seg: 10}),
          ),
      },
      {
        id: 'holo',
        label: 'Holographic sight',
        grams: 320,
        len: 0.05,
        build: M =>
          grp(
            ...clamp(M, -0.045, 0.045),
            box(M.steel, -0.045, 0.045, 0.011, 0.028, 0.019, 0.002),
            profile(
              M.steel,
              [
                [-0.012, 0.028],
                [0.042, 0.028],
                [0.042, 0.07],
                [0.0, 0.07],
              ],
              0.02,
              0.002,
            ),
            profile(
              M.glass,
              [
                [0.0425, 0.032],
                [0.0435, 0.032],
                [0.0435, 0.066],
                [0.0425, 0.066],
              ],
              0.015,
              0,
            ),
            profile(
              M.glass,
              [
                [-0.0, 0.034],
                [0.001, 0.034],
                [0.001, 0.066],
                [-0.0, 0.066],
              ],
              0.015,
              0,
            ),
          ),
      },
      {
        id: 'zf',
        label: 'ZF 1-6× scope',
        grams: 560,
        len: 0.09,
        build: M =>
          grp(
            ...clamp(M, -0.07, -0.04),
            ...clamp(M, 0.04, 0.07),
            box(M.steel, -0.068, -0.042, 0.011, 0.034, 0.008, 0.001),
            box(M.steel, 0.042, 0.068, 0.011, 0.034, 0.008, 0.001),
            tube(M.steel, -0.13, 0.11, 0.05, 0.0155, {seg: 18}),
            tube(M.steel, 0.09, 0.15, 0.05, 0.0155, {r2: 0.023, seg: 18}),
            tube(M.steel, -0.17, -0.12, 0.05, 0.021, {seg: 18}),
            tube(M.glass, 0.1505, 0.1515, 0.05, 0.021, {seg: 18}),
            tube(M.steel, 0.066, 0.086, 0.0, 0.012, {axis: 'y', z: 0, seg: 12}),
            tube(M.steel, 0.012, 0.03, 0.0, 0.011, {axis: 'z', z: 0.05, seg: 12}),
          ),
      },
      {id: 'none', label: 'Iron sights only', grams: 0, len: 0, build: () => null},
    ],
  },
  laser: {
    label: 'Laser',
    options: [
      {
        id: 'blitz',
        label: 'Blitzstrahl laser-lamp',
        grams: 210,
        len: 0.045,
        build: M =>
          grp(
            box(M.steel, -0.03, 0.03, 0, 0.006, 0.012, 0.0008),
            box(M.body, -0.045, 0.045, 0.006, 0.03, 0.023, 0.0025),
            tube(M.black, 0.045, 0.05, 0.02, 0.006, {z: 0.011, seg: 10}),
            tube(M.glass, 0.045, 0.051, 0.02, 0.007, {z: -0.01, seg: 10}),
            box(M.black, -0.03, -0.01, 0.03, 0.0335, 0.006, 0.0006, 0.008),
            box(M.red, -0.002, 0.012, 0.03, 0.033, 0.004, 0.0005, -0.008),
          ),
      },
      {
        id: 'compact',
        label: 'Compact aiming laser',
        grams: 90,
        len: 0.025,
        build: M =>
          grp(
            box(M.steel, -0.02, 0.02, 0, 0.005, 0.011, 0.0008),
            box(M.black, -0.025, 0.025, 0.005, 0.024, 0.014, 0.002),
            tube(M.glass, 0.025, 0.027, 0.015, 0.005, {seg: 10}),
          ),
      },
      {id: 'none', label: 'None', grams: 0, len: 0, build: () => null},
    ],
  },
  light: {
    label: 'Weapon light',
    options: [
      {
        id: 'scout',
        label: 'Scout light',
        grams: 140,
        len: 0.055,
        build: M =>
          grp(
            box(M.steel, -0.02, 0.02, -0.009, 0.009, 0.004, 0.0008, 0.004),
            tube(M.steel, -0.055, 0.035, 0.0, 0.0125, {z: 0.02, seg: 14}),
            tube(M.steel, 0.035, 0.07, 0.0, 0.0125, {z: 0.02, r2: 0.0175, seg: 14}),
            tube(M.amber, 0.0705, 0.0715, 0.0, 0.015, {z: 0.02, seg: 14}),
            tube(M.black, -0.066, -0.055, 0.0, 0.011, {z: 0.02, seg: 12}),
          ),
      },
      {
        id: 'long',
        label: 'Long-range spotting lamp',
        grams: 260,
        len: 0.07,
        build: M =>
          grp(
            box(M.steel, -0.03, 0.03, -0.009, 0.009, 0.004, 0.0008, 0.004),
            tube(M.steel, -0.08, 0.06, 0.0, 0.0145, {z: 0.023, seg: 14}),
            tube(M.steel, 0.06, 0.105, 0.0, 0.0145, {z: 0.023, r2: 0.0215, seg: 14}),
            tube(M.amber, 0.1055, 0.1065, 0.0, 0.019, {z: 0.023, seg: 14}),
            tube(M.black, -0.092, -0.08, 0.0, 0.0125, {z: 0.023, seg: 12}),
          ),
      },
      {id: 'none', label: 'None', grams: 0, len: 0, build: () => null},
    ],
  },
  ...FURNITURE,
};
export const DEFAULT_BUILD = {
  optic: 'reddot',
  laser: 'blitz',
  light: 'scout',
  under: 'angled',
  muzzle: 'brake',
  stock: 'haenel',
  mag: 'kurz25',
};
export const optionOf = (slot, id) => SLOTS[slot].options.find(o => o.id === id) || SLOTS[slot].options[0];
export {rail};
