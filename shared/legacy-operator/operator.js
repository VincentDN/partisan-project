// Restored unchanged from the earlier workbench (vincentdenil-site, ak15-weapon-customiser/operator.js): the code-built
// operator used by the opening scene and Bench Lab. The Operator Customiser uses the new Base Operator instead.
// Procedural low-poly operator: a jointed rig of rigid, flat-shaded segments, built from a state
// object. Meters; feet on y=0, facing +z, so the operator's right side is -x. Each joint is an
// Object3D whose local -y runs down the limb, which is what field.js poses and solves IK against.
// Everything here is original geometry; no external character assets.
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// ---------- Options (drive the Operator panel) ----------
const SKIN = {s1: '#f1c9a5', s2: '#e0ac85', s3: '#c68a5e', s4: '#a0673f', s5: '#7a4a2c', s6: '#4f2f1d'};
const HAIR = {black: '#1c1917', brown: '#4a3222', blonde: '#b8955a', grey: '#8b8a86', auburn: '#7a3a1e'};
// Solid fabric colours and generated camo patterns (base + three blob colours).
const FABRIC = {
  olive: '#4b5a3a',
  khaki: '#a08c62',
  tan: '#8c7350',
  black: '#23262b',
  grey: '#63676b',
  navy: '#2a3348',
  woodland: {base: '#5a6b3f', blobs: ['#394829', '#6e5a3c', '#1f241c']},
  desert: {base: '#b9a27a', blobs: ['#8d7550', '#d2c19a', '#6e5a3c']},
  urban: {base: '#8a8d90', blobs: ['#5c6064', '#b8bbbe', '#2f3236']},
  flora: {base: '#6b7a4e', blobs: ['#4a5a34', '#8c9a64', '#2e3a22']},
};
const ARMBAND = {red: '#a3262a', white: '#e8e6df', blue: '#2b4c8c', yellow: '#d4b02a', green: '#3f7a3a'};
const choice = (id, label) => ({id, label});
const swatch = (map, labels = {}) =>
  Object.entries(map).map(([id, v]) => ({
    id,
    label: labels[id] || id[0].toUpperCase() + id.slice(1),
    color: typeof v === 'string' ? v : v.base,
    pattern: typeof v !== 'string',
  }));

// Sections and controls for the panel. `camera` names the framing used when a control changes.
export const OPERATOR_SECTIONS = [
  {
    id: 'body',
    label: 'Body',
    camera: 'full',
    controls: [
      {id: 'frame', label: 'Frame', type: 'choice', options: [choice('male', 'Male'), choice('female', 'Female')]},
      {id: 'height', label: 'Height', type: 'range', min: 1.6, max: 1.95, step: 0.01, unit: 'm'},
      {id: 'build', label: 'Build', type: 'range', min: 0, max: 1, step: 0.05, ends: ['Lean', 'Heavy']},
      {
        id: 'skin',
        label: 'Skin',
        type: 'swatch',
        options: swatch(SKIN, {s1: 'Tone 1', s2: 'Tone 2', s3: 'Tone 3', s4: 'Tone 4', s5: 'Tone 5', s6: 'Tone 6'}),
      },
    ],
  },
  {
    id: 'head',
    label: 'Head',
    camera: 'face',
    controls: [
      {
        id: 'hair',
        label: 'Hair',
        type: 'choice',
        options: [choice('none', 'Shaved'), choice('buzz', 'Buzz'), choice('short', 'Short'), choice('long', 'Tied back')],
      },
      {id: 'hairColor', label: 'Hair colour', type: 'swatch', options: swatch(HAIR)},
      {
        id: 'facial',
        label: 'Facial hair',
        type: 'choice',
        options: [choice('none', 'None'), choice('moustache', 'Moustache'), choice('beard', 'Beard')],
      },
      {
        id: 'headgear',
        label: 'Headgear',
        type: 'choice',
        options: [
          choice('none', 'None'),
          choice('beanie', 'Beanie'),
          choice('cap', 'Field cap'),
          choice('boonie', 'Boonie'),
          choice('helmet', 'Helmet'),
        ],
      },
      {
        id: 'faceCover',
        label: 'Face',
        type: 'choice',
        options: [choice('none', 'Bare'), choice('shemagh', 'Shemagh'), choice('balaclava', 'Balaclava')],
      },
      {
        id: 'eyewear',
        label: 'Eyewear',
        type: 'choice',
        options: [choice('none', 'None'), choice('glasses', 'Glasses'), choice('goggles', 'Goggles')],
      },
    ],
  },
  {
    id: 'clothing',
    label: 'Clothing',
    camera: 'full',
    controls: [
      {
        id: 'top',
        label: 'Top',
        type: 'choice',
        options: [choice('tshirt', 'T-shirt'), choice('jacket', 'Field jacket'), choice('smock', 'Smock')],
      },
      {id: 'topColor', label: 'Top colour', type: 'swatch', options: swatch(FABRIC)},
      {id: 'pants', label: 'Trousers', type: 'choice', options: [choice('cargo', 'Cargo'), choice('plain', 'Plain')]},
      {id: 'pantsColor', label: 'Trouser colour', type: 'swatch', options: swatch(FABRIC)},
      {id: 'boots', label: 'Footwear', type: 'choice', options: [choice('boots', 'Boots'), choice('trainers', 'Trainers')]},
      {
        id: 'gloves',
        label: 'Gloves',
        type: 'choice',
        options: [choice('none', 'None'), choice('fingerless', 'Fingerless'), choice('full', 'Full')],
      },
    ],
  },
  {
    id: 'gear',
    label: 'Gear',
    camera: 'torso',
    controls: [
      {
        id: 'vest',
        label: 'Vest',
        type: 'choice',
        options: [choice('none', 'None'), choice('rig', 'Chest rig'), choice('plates', 'Plate carrier')],
      },
      {
        id: 'pack',
        label: 'Pack',
        type: 'choice',
        options: [choice('none', 'None'), choice('assault', 'Assault pack'), choice('radio', 'Radio')],
      },
      {
        id: 'sidearm',
        label: 'Sidearm',
        type: 'choice',
        options: [choice('none', 'None'), choice('thigh', 'Thigh holster'), choice('hip', 'Hip holster')],
      },
      {id: 'gearColor', label: 'Gear colour', type: 'swatch', options: swatch(FABRIC)},
    ],
  },
  {
    id: 'insignia',
    label: 'Insignia',
    camera: 'arm',
    controls: [
      {id: 'armband', label: 'Armband', type: 'swatch', options: [{id: 'none', label: 'None', color: null}, ...swatch(ARMBAND)]},
      {
        id: 'patch',
        label: 'Shoulder patch',
        type: 'choice',
        options: [choice('none', 'None'), choice('star', 'Star'), choice('stripes', 'Tricolour'), choice('shield', 'Shield')],
      },
    ],
  },
];

// Launch operator. Every key of every control must be present.
export const DEFAULT_OPERATOR = {
  frame: 'male',
  height: 1.78,
  build: 0.5,
  skin: 's2',
  hair: 'short',
  hairColor: 'brown',
  facial: 'beard',
  headgear: 'beanie',
  faceCover: 'none',
  eyewear: 'none',
  top: 'jacket',
  topColor: 'woodland',
  pants: 'cargo',
  pantsColor: 'olive',
  boots: 'boots',
  gloves: 'fingerless',
  vest: 'rig',
  pack: 'none',
  sidearm: 'none',
  gearColor: 'khaki',
  armband: 'red',
  patch: 'star',
};
export const OPERATOR_KEYS = OPERATOR_SECTIONS.flatMap(s => s.controls.map(c => c.id));

// ---------- Materials ----------
const materialCache = new Map();
function seeded(seed) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
}
// Blob camo on a canvas: tiles because blobs wrap across the edges.
function camoTexture(spec, seed) {
  const size = 256,
    c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d'),
    rand = seeded(seed);
  g.fillStyle = spec.base;
  g.fillRect(0, 0, size, size);
  spec.blobs.forEach((color, layer) => {
    g.fillStyle = color;
    for (let i = 0; i < 14 - layer * 3; i++) {
      const x = rand() * size,
        y = rand() * size,
        r = 14 + rand() * 26,
        points = 7;
      for (const [ox, oy] of [
        [0, 0],
        [-size, 0],
        [size, 0],
        [0, -size],
        [0, size],
      ]) {
        g.beginPath();
        for (let k = 0; k < points; k++) {
          const a = (k / points) * Math.PI * 2,
            rr = r * (0.6 + rand() * 0.6);
          g.lineTo(x + ox + Math.cos(a) * rr * 1.4, y + oy + Math.sin(a) * rr);
        }
        g.closePath();
        g.fill();
      }
    }
  });
  const t = new T.CanvasTexture(c);
  t.wrapS = t.wrapT = T.RepeatWrapping;
  t.repeat.set(1.5, 1.5);
  t.colorSpace = T.SRGBColorSpace;
  t.magFilter = T.NearestFilter;
  return t;
}
// Shared with the rifle finishes (viewer.js), so weapon and clothing camo match.
const camoCache = new Map();
export const CAMO_PATTERNS = Object.keys(FABRIC).filter(k => typeof FABRIC[k] !== 'string');
export function camoFor(name) {
  if (!camoCache.has(name)) camoCache.set(name, camoTexture(FABRIC[name], name.length * 977 + FABRIC[name].base.charCodeAt(1)));
  return camoCache.get(name);
}
function mat(key, roughness = 0.85) {
  if (materialCache.has(key)) return materialCache.get(key);
  let m;
  if (key.startsWith('fabric:')) {
    const spec = FABRIC[key.slice(7)];
    m =
      typeof spec === 'string'
        ? new T.MeshStandardMaterial({color: spec, roughness: 0.92, flatShading: true})
        : new T.MeshStandardMaterial({map: camoFor(key.slice(7)), roughness: 0.92, flatShading: true});
  } else m = new T.MeshStandardMaterial({color: key, roughness, flatShading: true});
  m.userData.shared = true;
  materialCache.set(key, m);
  return m;
}

// ---------- Geometry helpers ----------
const merge = geos => mergeGeometries(geos.map(g => (g.index ? g.toNonIndexed() : g)));
const box = (w, h, d, [x, y, z] = [0, 0, 0]) => new T.BoxGeometry(w, h, d).translate(x, y, z);
// Limb segment hanging from its joint along -y: radius r1 at the joint, r2 at the far end.
const limb = (r1, r2, len, sides = 7, from = 0) => new T.CylinderGeometry(r1, r2, len, sides).translate(0, -len / 2 - from, 0);
// Box whose top face is scaled to wTop (a tapered torso block).
function taper(wBottom, wTop, h, d, dTop = d) {
  const g = new T.BoxGeometry(wBottom, h, d),
    p = g.attributes.position;
  for (let i = 0; i < p.count; i++)
    if (p.getY(i) > 0) {
      p.setX(i, (p.getX(i) * wTop) / wBottom);
      p.setZ(i, (p.getZ(i) * dTop) / d);
    }
  g.computeVertexNormals();
  return g;
}
const sphere = (r, w = 7, h = 5) => new T.SphereGeometry(r, w, h);
const dome = (r, w = 9, h = 4, cut = Math.PI / 2) => new T.SphereGeometry(r, w, h, 0, Math.PI * 2, 0, cut);
function star(r, depth) {
  const s = new T.Shape();
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / 5,
      rr = i % 2 ? r * 0.45 : r;
    const x = Math.cos(a) * rr,
      y = Math.sin(a) * rr;
    i ? s.lineTo(x, y) : s.moveTo(x, y);
  }
  return new T.ExtrudeGeometry(s, {depth, bevelEnabled: false});
}

// ---------- Build ----------
export function buildOperator(state) {
  const o = {...DEFAULT_OPERATOR, ...state};
  const female = o.frame === 'female';
  const s = o.height / 1.78,
    b = o.build;
  const thick = (0.86 + 0.34 * b) * (female ? 0.9 : 1),
    shoulder = (female ? 0.86 : 1) * (0.95 + 0.1 * b),
    hip = female ? 1.1 : 1;
  const root = new T.Group();
  root.name = 'operator';
  const joints = {};
  const joint = (name, parent, [x, y, z]) => {
    const j = new T.Object3D();
    j.name = name;
    j.position.set(x, y, z);
    (parent ? joints[parent] : root).add(j);
    joints[name] = j;
    return j;
  };
  // Parts are merged per joint and material, so a whole operator is only a few dozen meshes.
  const pieces = new Map();
  const add = (jointName, material, geo) => {
    const k = jointName + '|' + material.uuid;
    if (!pieces.has(k)) pieces.set(k, {jointName, material, geos: []});
    pieces.get(k).geos.push(geo);
  };

  // Skeleton. Lengths scale with height; widths with frame and build.
  const L = {upperArm: 0.29 * s, foreArm: 0.26 * s, hand: 0.085 * s, upperLeg: 0.45 * s, lowerLeg: 0.43 * s};
  joint('hips', null, [0, 0.93 * s, 0]);
  joint('spine', 'hips', [0, 0.12 * s, 0]);
  joint('chest', 'spine', [0, 0.18 * s, 0]);
  joint('neck', 'chest', [0, 0.24 * s, 0]);
  joint('head', 'neck', [0, 0.08 * s, 0]);
  for (const [side, sx] of [
    ['R', -1],
    ['L', 1],
  ]) {
    joint('upperArm' + side, 'chest', [sx * 0.185 * s * shoulder, 0.2 * s, 0]);
    joint('foreArm' + side, 'upperArm' + side, [0, -L.upperArm, 0]);
    joint('hand' + side, 'foreArm' + side, [0, -L.foreArm, 0]);
    joint('upperLeg' + side, 'hips', [sx * 0.095 * s * hip, -0.04 * s, 0]);
    joint('lowerLeg' + side, 'upperLeg' + side, [0, -L.upperLeg, 0]);
    joint('foot' + side, 'lowerLeg' + side, [0, -L.lowerLeg, 0]);
  }

  const skin = mat(SKIN[o.skin] || SKIN.s2, 0.7),
    hair = mat(HAIR[o.hairColor] || HAIR.brown, 0.9),
    dark = mat('#15171a', 0.6);
  const top = mat('fabric:' + o.topColor),
    pants = mat('fabric:' + o.pantsColor),
    gear = mat('fabric:' + o.gearColor);
  const boot = mat('#1e1b18', 0.8),
    sole = mat('#2b2724', 0.9),
    metal = mat('#3a3e42', 0.45),
    glove = mat('#26282b', 0.8);

  // Body.
  const torsoW = 0.3 * thick * shoulder,
    torsoD = 0.2 * thick;
  add('hips', skin, taper(0.33 * thick * hip, 0.3 * thick, 0.2 * s, 0.21 * thick).translate(0, -0.02 * s, 0));
  add('spine', skin, taper(0.3 * thick, 0.31 * thick * shoulder, 0.2 * s, torsoD).translate(0, 0.08 * s, 0));
  add('chest', skin, taper(0.31 * thick * shoulder, 0.4 * thick * shoulder, 0.27 * s, 0.23 * thick, 0.2 * thick).translate(0, 0.11 * s, 0));
  if (female)
    for (const x of [-0.07, 0.07])
      add(
        'chest',
        skin,
        sphere(0.055 * thick, 6, 4)
          .scale(1, 0.85, 0.8)
          .translate(x * shoulder, 0.08 * s, 0.1 * thick),
      );
  add('neck', skin, limb(0.052, 0.056, 0.11 * s, 7, -0.02 * s).translate(0, 0.1 * s, 0));
  // Faceted head with simple features on the +z face.
  const headY = 0.1 * s;
  add('head', skin, new T.IcosahedronGeometry(0.112 * s, 1).scale(0.9, 1.08, 1).translate(0, headY, 0.005));
  add('head', skin, box(0.03, 0.045, 0.035, [0, headY - 0.005, 0.108 * s])); // nose
  add('head', skin, box(0.13, 0.022, 0.03, [0, headY + 0.035, 0.095 * s])); // brow
  add('head', skin, box(0.1, 0.05, 0.06, [0, headY - 0.07 * s, 0.06 * s])); // jaw
  for (const x of [-0.1, 0.1]) add('head', skin, box(0.025, 0.045, 0.03, [x * s, headY, -0.005])); // ears
  for (const x of [-0.036, 0.036]) add('head', dark, box(0.022, 0.012, 0.01, [x * s, headY + 0.012, 0.103 * s])); // eyes
  add('head', mat('#6b3b34', 0.7), box(0.045, 0.009, 0.01, [0, headY - 0.048 * s, 0.1 * s])); // mouth

  for (const [side, sx] of [
    ['R', -1],
    ['L', 1],
  ]) {
    add('upperArm' + side, skin, limb(0.052 * thick, 0.043 * thick, L.upperArm));
    add('upperArm' + side, skin, sphere(0.056 * thick));
    add('foreArm' + side, skin, limb(0.043 * thick, 0.033 * thick, L.foreArm));
    add('foreArm' + side, skin, sphere(0.044 * thick, 6, 4));
    add('hand' + side, skin, box(0.075, L.hand, 0.032, [0, -L.hand / 2, 0]));
    add('hand' + side, skin, box(0.022, 0.05, 0.022, [sx * -0.04, -0.03, 0.014])); // thumb, toward the body's front
    add('upperLeg' + side, skin, limb(0.085 * thick * hip, 0.058 * thick, L.upperLeg));
    add('lowerLeg' + side, skin, limb(0.058 * thick, 0.043 * thick, L.lowerLeg));
    add('lowerLeg' + side, skin, sphere(0.06 * thick, 6, 4));
    add('foot' + side, skin, box(0.09, 0.06, 0.24, [0, -0.03, 0.06]));
  }

  // Hair and facial hair.
  if (o.hair !== 'none') {
    const r = 0.118 * s * (o.hair === 'buzz' ? 1 : 1.04);
    add(
      'head',
      hair,
      dome(r, 9, 4, o.hair === 'buzz' ? Math.PI * 0.45 : Math.PI * 0.55)
        .scale(0.92, 1.02, 1.02)
        .translate(0, headY + 0.015, -0.004),
    );
    if (o.hair !== 'buzz') add('head', hair, box(0.2 * s, 0.1 * s, 0.05, [0, headY - 0.01, -0.085 * s]));
    if (o.hair === 'long') add('head', hair, limb(0.03, 0.018, 0.16 * s, 6).translate(0, headY - 0.02, -0.12 * s));
  }
  if (o.facial === 'moustache') add('head', hair, box(0.07, 0.016, 0.02, [0, headY - 0.034 * s, 0.108 * s]));
  if (o.facial === 'beard') {
    add('head', hair, box(0.125, 0.085, 0.075, [0, headY - 0.07 * s, 0.065 * s]));
    add('head', hair, box(0.07, 0.016, 0.02, [0, headY - 0.034 * s, 0.108 * s]));
  }

  // Clothing: shells a little larger than the body segment they cover.
  const shell = 1.12;
  const sleeve = (side, full) => {
    add(
      'upperArm' + side,
      top,
      limb(0.052 * thick * shell + 0.006, 0.043 * thick * shell + 0.006, full ? L.upperArm : L.upperArm * 0.45, 7, -0.02),
    );
    add('upperArm' + side, top, sphere(0.062 * thick * shell, 7, 5));
    if (full) {
      add('foreArm' + side, top, limb(0.043 * thick * shell + 0.004, 0.037 * thick * shell + 0.004, L.foreArm * 0.9));
      add('foreArm' + side, top, sphere(0.05 * thick, 6, 4));
    }
  };
  add('spine', top, taper(0.3 * thick * shell, 0.31 * thick * shoulder * shell, 0.2 * s, torsoD * shell).translate(0, 0.08 * s, 0));
  // 1 cm taller, raised 5 mm: its top face (the shoulders) clears the skin's instead of z-fighting with it.
  add(
    'chest',
    top,
    taper(
      0.31 * thick * shoulder * shell,
      0.4 * thick * shoulder * shell,
      0.27 * s + 0.01,
      0.23 * thick * shell,
      0.2 * thick * shell,
    ).translate(0, 0.11 * s + 0.005, 0),
  );
  for (const side of ['R', 'L']) sleeve(side, o.top !== 'tshirt');
  if (o.top !== 'tshirt') {
    add('chest', top, limb(0.075, 0.08, 0.05 * s, 8, -0.26 * s)); // collar
    for (const x of [-0.08, 0.08]) add('chest', top, box(0.09, 0.08, 0.03, [x * shoulder, 0.14 * s, 0.125 * thick])); // chest pockets
  }
  if (o.top === 'smock') {
    add('hips', top, taper(0.36 * thick * hip * shell, 0.33 * thick * shell, 0.24 * s, 0.24 * thick * shell).translate(0, -0.08 * s, 0)); // skirt
    add('chest', top, box(0.26 * thick, 0.12 * s, 0.07, [0, 0.2 * s, -0.13 * thick])); // rolled hood
  } else add('hips', top, taper(0.34 * thick * hip, 0.31 * thick * shell, 0.07 * s, 0.22 * thick * shell).translate(0, 0.05 * s, 0));

  add('hips', pants, taper(0.345 * thick * hip, 0.315 * thick, 0.21 * s, 0.22 * thick).translate(0, -0.03 * s, 0));
  add('hips', mat('#2a2622', 0.8), box(0.33 * thick * hip, 0.03 * s, 0.225 * thick, [0, 0.06 * s, 0])); // belt
  for (const [side, sx] of [
    ['R', -1],
    ['L', 1],
  ]) {
    add('upperLeg' + side, pants, limb(0.09 * thick * hip + 0.006, 0.064 * thick + 0.006, L.upperLeg));
    add('lowerLeg' + side, pants, limb(0.064 * thick + 0.006, 0.05 * thick + 0.006, L.lowerLeg * 0.8));
    add('lowerLeg' + side, pants, sphere(0.066 * thick, 6, 4));
    if (o.pants === 'cargo') add('upperLeg' + side, pants, box(0.03, 0.12 * s, 0.1, [sx * 0.09 * thick * hip, -0.24 * s, 0.01]));
    if (o.boots === 'boots') {
      add('lowerLeg' + side, boot, limb(0.055 * thick + 0.01, 0.053 * thick + 0.01, L.lowerLeg * 0.32, 7, L.lowerLeg * 0.68));
      add('foot' + side, boot, box(0.105, 0.075, 0.27, [0, -0.025, 0.065]));
      add('foot' + side, sole, box(0.11, 0.022, 0.28, [0, -0.058, 0.065]));
    } else {
      add('foot' + side, mat('#d9d6cf', 0.8), box(0.1, 0.065, 0.26, [0, -0.028, 0.062]));
      add('foot' + side, mat('#f2f0ea', 0.7), box(0.105, 0.022, 0.27, [0, -0.058, 0.062]));
    }
    if (o.gloves !== 'none') {
      add(
        'hand' + side,
        glove,
        box(0.082, L.hand * (o.gloves === 'full' ? 1.04 : 0.62), 0.038, [0, -L.hand * (o.gloves === 'full' ? 0.52 : 0.31), 0]),
      );
      add('foreArm' + side, glove, limb(0.038, 0.037, 0.03, 7, L.foreArm - 0.03));
    }
  }

  // Gear.
  const chestFront = 0.12 * thick;
  if (o.vest === 'rig') {
    add('chest', gear, box(0.3 * thick * shoulder, 0.15 * s, 0.05, [0, -0.01 * s, chestFront]));
    for (const x of [-0.085, 0, 0.085]) add('chest', gear, box(0.075, 0.1 * s, 0.045, [x * shoulder, 0.0, chestFront + 0.045]));
    for (const x of [-0.1, 0.1]) {
      add('chest', gear, box(0.04, 0.3 * s, 0.02, [x * shoulder, 0.12 * s, 0.115 * thick]));
      add('chest', gear, box(0.04, 0.34 * s, 0.02, [x * shoulder, 0.12 * s, -0.11 * thick]));
      add('chest', gear, box(0.05, 0.02, 0.24 * thick, [x * shoulder, 0.26 * s, 0]));
    }
  }
  if (o.vest === 'plates') {
    add('chest', gear, box(0.32 * thick * shoulder, 0.3 * s, 0.06, [0, 0.07 * s, chestFront]));
    add('chest', gear, box(0.32 * thick * shoulder, 0.32 * s, 0.06, [0, 0.08 * s, -0.115 * thick]));
    add('spine', gear, taper(0.36 * thick, 0.36 * thick * shoulder, 0.14 * s, 0.28 * thick).translate(0, 0.1 * s, 0)); // cummerbund
    for (const x of [-0.09, 0, 0.09]) add('chest', gear, box(0.078, 0.1 * s, 0.045, [x * shoulder, -0.02 * s, chestFront + 0.05]));
    add('chest', gear, box(0.14, 0.07 * s, 0.035, [0, 0.13 * s, chestFront + 0.045])); // admin pouch
    for (const x of [-0.11, 0.11]) add('chest', gear, box(0.07, 0.03, 0.25 * thick, [x * shoulder, 0.26 * s, 0]));
  }
  if (o.pack === 'assault') {
    add('chest', gear, box(0.3 * thick, 0.42 * s, 0.16, [0, 0.05 * s, -0.21 * thick]));
    add('chest', gear, box(0.28 * thick, 0.08 * s, 0.17, [0, 0.28 * s, -0.21 * thick]));
    add('chest', gear, box(0.2 * thick, 0.16 * s, 0.05, [0, -0.02 * s, -0.31 * thick]));
  }
  if (o.pack === 'radio') {
    add('chest', gear, box(0.2 * thick, 0.26 * s, 0.1, [0.02, 0.06 * s, -0.18 * thick]));
    add('chest', metal, box(0.14, 0.12 * s, 0.03, [0.02, 0.1 * s, -0.235 * thick]));
    add('chest', dark, limb(0.005, 0.004, 0.55 * s, 5).translate(0.08, 0.72 * s, -0.2 * thick)); // antenna
  }

  // Sidearm: a compact pistol in a holster on the right (−x) thigh or hip, grip up and slightly back.
  if (o.sidearm !== 'none') {
    const thigh = o.sidearm === 'thigh',
      joint = thigh ? 'upperLegR' : 'hips';
    const out = thigh ? -(0.09 * thick * hip + 0.035) : -((0.33 * thick * hip) / 2 + 0.03);
    const at = thigh ? [out, -0.14 * s, 0.01] : [out, -0.03 * s, -0.02];
    const place = g => g.rotateX(-0.12).translate(...at);
    add(joint, gear, place(box(0.05, 0.16, 0.1, [0, -0.02, 0]))); // holster body
    if (thigh) {
      for (const y of [0.02, -0.1])
        add(
          joint,
          gear,
          limb(0.09 * thick * hip + 0.012, 0.085 * thick * hip + 0.012, 0.025, 8, y)
            .translate(0, 0, 0)
            .translate(0, -0.14 * s + 0.04, 0),
        ); // leg straps
      add(joint, gear, box(0.03, 0.16 * s, 0.03, [out + 0.012, -0.02 * s, 0.01]));
    } // drop strap to the belt
    else add(joint, gear, box(0.06, 0.03, 0.05, [out + 0.015, 0.05 * s, -0.02])); // belt loop
    const pistol = mat('#1e2023', 0.5);
    add(joint, pistol, place(box(0.036, 0.07, 0.03, [-0.002, 0.09, 0.03]))); // grip, above the holster
    add(joint, pistol, place(box(0.04, 0.022, 0.12, [-0.002, 0.07, 0]))); // slide top peeking out
    add(joint, pistol, place(box(0.02, 0.012, 0.02, [-0.002, 0.112, 0.04]))); // beavertail
  }

  // Headgear, face covers and eyewear.
  const hr = 0.125 * s;
  if (o.faceCover === 'balaclava') {
    add('head', gear, new T.IcosahedronGeometry(0.12 * s, 1).scale(0.92, 1.1, 1.03).translate(0, headY, 0.004));
    add('head', skin, box(0.12, 0.035, 0.02, [0, headY + 0.012, 0.11 * s]));
    for (const x of [-0.036, 0.036]) add('head', dark, box(0.022, 0.012, 0.01, [x * s, headY + 0.012, 0.121 * s]));
  }
  if (o.faceCover === 'shemagh') {
    add('neck', gear, new T.TorusGeometry(0.075, 0.03, 5, 9).rotateX(Math.PI / 2).translate(0, 0.08 * s, 0.005));
    add(
      'head',
      gear,
      dome(0.118 * s, 9, 3, Math.PI * 0.42)
        .rotateX(Math.PI)
        .scale(0.95, 0.9, 1.05)
        .translate(0, headY - 0.02 * s, 0.01),
    );
  }
  if (o.headgear === 'beanie') {
    add(
      'head',
      gear,
      dome(hr, 9, 4, Math.PI * 0.5)
        .scale(0.94, 1.05, 1.02)
        .translate(0, headY + 0.02 * s, -0.004),
    );
    add('head', gear, new T.CylinderGeometry(hr * 0.95, hr * 0.97, 0.03 * s, 9).translate(0, headY + 0.03 * s, -0.004));
  }
  if (o.headgear === 'cap') {
    add('head', gear, new T.CylinderGeometry(hr * 0.9, hr * 0.96, 0.08 * s, 9).translate(0, headY + 0.08 * s, -0.004));
    add('head', gear, box(0.14, 0.012, 0.08, [0, headY + 0.045 * s, 0.12 * s]));
  }
  if (o.headgear === 'boonie') {
    add('head', gear, dome(hr * 1.02, 9, 3, Math.PI * 0.48).translate(0, headY + 0.02 * s, 0));
    add('head', gear, new T.CylinderGeometry(hr * 1.75, hr * 1.75, 0.01, 11).translate(0, headY + 0.025 * s, 0));
  }
  if (o.headgear === 'helmet') {
    add(
      'head',
      gear,
      dome(hr * 1.12, 10, 4, Math.PI * 0.52)
        .scale(1, 0.95, 1.06)
        .translate(0, headY + 0.015 * s, -0.006),
    );
    add('head', metal, box(0.05, 0.035, 0.02, [0, headY + 0.09 * s, 0.132 * s])); // NVG shroud
    for (const x of [-1, 1]) add('head', gear, box(0.012, 0.03, 0.12, [x * hr * 1.08, headY + 0.03 * s, 0])); // side rails
  }
  if (o.eyewear === 'glasses') {
    for (const x of [-0.036, 0.036]) add('head', dark, box(0.034, 0.022, 0.006, [x * s, headY + 0.012, 0.112 * s]));
    add('head', dark, box(0.2 * s, 0.006, 0.006, [0, headY + 0.02, 0.1 * s]));
  }
  if (o.eyewear === 'goggles') {
    add('head', mat('#2a2d30', 0.4), box(0.13, 0.045, 0.04, [0, headY + 0.012, 0.108 * s]));
    add('head', dark, new T.TorusGeometry(0.12 * s, 0.008, 4, 12).rotateX(Math.PI / 2).translate(0, headY + 0.015, 0));
  }

  // Insignia: armband on the left arm, patch on the right shoulder.
  if (o.armband !== 'none' && ARMBAND[o.armband])
    add(
      'upperArmL',
      mat(ARMBAND[o.armband], 0.8),
      limb(0.052 * thick * shell + 0.014, 0.05 * thick * shell + 0.014, 0.055 * s, 8, 0.1 * s),
    );
  if (o.patch !== 'none') {
    const at = [-(0.052 * thick * shell + 0.012), -0.09 * s, 0],
      rot = g => g.rotateY(-Math.PI / 2).translate(...at);
    if (o.patch === 'star') add('upperArmR', mat('#a3262a', 0.7), rot(star(0.028, 0.006).translate(0, 0, 0)));
    if (o.patch === 'stripes')
      ['#c8102e', '#f2f0ea', '#1f4e9a'].forEach((c, i) =>
        add('upperArmR', mat(c, 0.7), rot(box(0.05, 0.014, 0.004, [0, 0.014 - i * 0.014, 0]))),
      );
    if (o.patch === 'shield') {
      add('upperArmR', mat('#1f3a5f', 0.7), rot(box(0.045, 0.055, 0.004)));
      add('upperArmR', mat('#d4b02a', 0.7), rot(box(0.03, 0.008, 0.006)));
    }
  }

  for (const {jointName, material, geos} of pieces.values()) {
    const m = new T.Mesh(merge(geos), material);
    m.castShadow = m.receiveShadow = true;
    m.name = jointName;
    joints[jointName].add(m);
  }
  return {root, joints, lengths: L, state: o, height: o.height};
}

export function disposeOperator(op) {
  op.root.traverse(m => {
    if (m.isMesh) m.geometry.dispose();
  }); // materials are shared via the cache
}
