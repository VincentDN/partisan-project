// Operator Customiser configuration: how the Base Operator's 21 modular meshes become equipment
// slots, and which materials the colour zones repaint. Pure data, no three.js, so tests can read it.
//
// A *part* names mesh nodes (SK_* in assets/models/operators/base-operator.glb) and, optionally, the
// materials inside them (a node can carry several primitives, e.g. the helmet shell and its headset).
// A *slot* lists mutually exclusive options; each option says which parts are visible.

import {generatedRecon} from './generated-recon.js';

export const PARTS = {
  helmet: {nodes: ['SK_Helmet'], materials: ['M_Helmet_Frame', 'M_Helmet', 'M_Mask_Strap']},
  headset: {nodes: ['SK_Helmet'], materials: ['M_Helmet_Headphone']},
  nvg: {nodes: ['SK_Helmet_Scope']},
  mask: {nodes: ['SK_Mask']},
  visor: {nodes: ['SK_Glass']},
  hair: {nodes: ['SK_Core_Hair']},
  hairBuzz: {nodes: ['SK_Core_Hair_Buzz']},
  hairSwept: {nodes: ['SK_Core_Hair_Swept']},
  hairLong: {nodes: ['SK_Core_Hair_Long']},
  stache: {nodes: ['SK_Core_Moustache']},
  beard: {nodes: ['SK_Core_Beard']},
  goatee: {nodes: ['SK_Core_Goatee']},
  lids: {nodes: ['SK_Core_Lids']}, // shown only while blinking (operator.js); no slot controls it
  plates: {nodes: ['SK_Body'], materials: ['M_Body_Armor']},
  chestPouches: {nodes: ['SK_Chest_Pouches']},
  bellyPouches: {nodes: ['SK_Belly_Pouches']},
  shoulderPads: {nodes: ['SK_Shoulder_Pouches']},
  belt: {nodes: ['SK_Belt']},
  backpack: {nodes: ['SK_Backpack']},
  elbowGuards: {nodes: ['SK_Elbow_Guard_L', 'SK_Elbow_Guard_R']},
  kneeGuards: {nodes: ['SK_Leg_Guard_L', 'SK_Leg_Guard_R']},
  holsterR: {nodes: ['SK_Leg_Holster_R']},
  holsterL: {nodes: ['SK_Leg_Holster_L']},
};
// Always shown: SK_Face, SK_Eyeball, SK_Body (uniform top), SK_Legs, SK_Gloves, SK_Shoes.

const on = (...parts) => parts;

// Sleeve patches (patches-pack.glb): six designs, one quad each per sleeve. Slots below choose one per side.
export const PATCH_DESIGNS = [
  ['star', 'Star roundel'],
  ['shield', 'Mountain shield'],
  ['tag', 'MP-O tag'],
  ['tricolour', 'Tricolour (placeholder)'],
  ['cross', 'Medic cross'],
  ['chevrons', 'Chevrons'],
];
for (const side of ['L', 'R']) for (const [id] of PATCH_DESIGNS) PARTS[`patch${side}_${id}`] = {nodes: [`SK_Patch_${side}_${id}`]};
const patchSlot = (side, def = 'none') => ({
  id: `patch${side}`,
  label: side === 'L' ? 'Left sleeve patch' : 'Right sleeve patch',
  camera: 'torso',
  default: def,
  options: [{id: 'none', label: 'None', show: on()}, ...PATCH_DESIGNS.map(([id, label]) => ({id, label, show: on(`patch${side}_${id}`)}))],
});
export const SLOTS = [
  {
    id: 'head',
    label: 'Headgear',
    camera: 'head',
    default: 'nvg',
    options: [
      {id: 'nvg', label: 'Helmet + NVG', show: on('helmet', 'nvg')},
      {id: 'helmet', label: 'Helmet', show: on('helmet')},
      {id: 'bare', label: 'Bare head', show: on(), hair: true},
    ],
  },
  {
    id: 'comms',
    label: 'Headset',
    camera: 'head',
    default: 'on',
    options: [
      {id: 'on', label: 'Headset', show: on('headset')},
      {id: 'off', label: 'None', show: on()},
    ],
  },
  {
    id: 'face',
    label: 'Face',
    camera: 'head',
    default: 'mask',
    options: [
      {id: 'mask', label: 'Balaclava', show: on('mask'), covers: true},
      {id: 'visor', label: 'Visor', show: on('visor')},
      {id: 'both', label: 'Balaclava + visor', show: on('mask', 'visor'), covers: true},
      {id: 'bare', label: 'Bare face', show: on()},
    ],
  },
  {
    id: 'hair',
    label: 'Hair (bare head only)',
    camera: 'head',
    default: 'short',
    options: [
      {id: 'short', label: 'Short crop', show: on('hair')},
      {id: 'buzz', label: 'Buzz cut', show: on('hairBuzz')},
      {id: 'swept', label: 'Swept fringe', show: on('hairSwept')},
      {id: 'long', label: 'Long', show: on('hairLong')},
      {id: 'none', label: 'None', show: on()},
    ],
  },
  {
    id: 'facial',
    label: 'Facial hair (uncovered face)',
    camera: 'head',
    default: 'none',
    options: [
      {id: 'none', label: 'None', show: on()},
      {id: 'stache', label: 'Moustache', show: on('stache')},
      {id: 'goatee', label: 'Goatee', show: on('goatee')},
      {id: 'beard', label: 'Beard', show: on('beard')},
      {id: 'full', label: 'Both', show: on('stache', 'beard')},
    ],
  },
  {
    id: 'armor',
    label: 'Body armour',
    camera: 'torso',
    default: 'plates',
    options: [
      {id: 'plates', label: 'Plate carrier', show: on('plates')},
      {id: 'soft', label: 'Uniform only', show: on()},
    ],
  },
  {
    id: 'rig',
    label: 'Chest rig',
    camera: 'torso',
    default: 'full',
    options: [
      {id: 'full', label: 'Full', show: on('chestPouches', 'bellyPouches', 'shoulderPads')},
      {id: 'mags', label: 'Mag pouches', show: on('chestPouches')},
      {id: 'minimal', label: 'Minimal', show: on()},
    ],
  },
  {
    id: 'belt',
    label: 'Belt kit',
    camera: 'torso',
    default: 'on',
    options: [
      {id: 'on', label: 'Belt + pouches', show: on('belt')},
      {id: 'off', label: 'None', show: on()},
    ],
  },
  {
    id: 'pack',
    label: 'Backpack',
    camera: 'back',
    default: 'on',
    options: [
      {id: 'on', label: 'Backpack', show: on('backpack')},
      {id: 'off', label: 'None', show: on()},
    ],
  },
  {
    id: 'holsters',
    label: 'Holsters',
    camera: 'legs',
    default: 'both',
    options: [
      {id: 'both', label: 'Both legs', show: on('holsterR', 'holsterL')},
      {id: 'right', label: 'Right leg', show: on('holsterR')},
      {id: 'left', label: 'Left leg', show: on('holsterL')},
      {id: 'none', label: 'None', show: on()},
    ],
  },
  {
    id: 'guards',
    label: 'Pads',
    camera: 'legs',
    default: 'both',
    options: [
      {id: 'both', label: 'Elbow + knee', show: on('elbowGuards', 'kneeGuards')},
      {id: 'knee', label: 'Knee only', show: on('kneeGuards')},
      {id: 'elbow', label: 'Elbow only', show: on('elbowGuards')},
      {id: 'none', label: 'None', show: on()},
    ],
  },
  patchSlot('L'),
  patchSlot('R'),
  {
    id: 'weapon',
    label: 'Carried weapon',
    camera: 'full',
    default: 'ak74m', // the operator always holds a gun: the AK-74M, or the user's Workbench build (operator.js)
    options: [
      {id: 'ak74m', label: 'AK-74M', show: on(), weapon: 'ak74m'},
      {id: 'ak15k', label: 'AK-15K', show: on(), weapon: 'ak15k'},
      {id: 'rpk', label: 'RPK 7.62×39', show: on(), weapon: 'rpk'},
      {id: 'm16', label: 'M16A1', show: on(), weapon: 'm16'},
      {id: 'g3', label: 'HK G3A3', show: on(), weapon: 'g3'},
      {id: 'mk14', label: 'Mk 14 EBR', show: on(), weapon: 'mk14'},
      {id: 'spear', label: 'SIG Spear', show: on(), weapon: 'spear'},
      {id: 'stg44', label: 'StG 44', show: on(), weapon: 'stg44'},
      {id: 'ppsh41', label: 'PPSh-41', show: on(), weapon: 'ppsh41'},
      {id: 'bren', label: 'Bren', show: on(), weapon: 'bren'},
      {id: 'chauchat', label: 'Chauchat', show: on(), weapon: 'chauchat'},
      {id: 'bench', label: 'Workbench build', show: on(), weapon: 'bench'},
    ],
  },
];

// Colour zones repaint materials. `textured` zones start with the pack's camo texture ('original').
export const ZONES = [
  {id: 'top', label: 'Uniform top', materials: ['M_Top_Fabric'], textured: true, camera: 'torso', default: 'original', palette: 'fabric'},
  {id: 'pants', label: 'Trousers', materials: ['M_Fabric_Bottom'], textured: true, camera: 'legs', default: 'original', palette: 'fabric'},
  {id: 'armor', label: 'Armour', materials: ['M_Body_Armor'], camera: 'torso', default: 'black', palette: 'gear'},
  {id: 'helmet', label: 'Helmet', materials: ['M_Helmet'], camera: 'head', default: 'brown', palette: 'gear'},
  {
    id: 'gear',
    label: 'Pouches & pack',
    materials: ['M_Pouch', 'M_Pouch_Strap', 'M_Backpack', 'M_Backpack_Strap', 'M_Leg_Holster', 'M_Hip_Guard'],
    camera: 'torso',
    default: 'original',
    palette: 'gear',
  },
  {id: 'gloves', label: 'Gloves', materials: ['M_Glove'], camera: 'full', default: 'black', palette: 'dark'},
  {id: 'boots', label: 'Boots', materials: ['M_Shoe'], camera: 'legs', default: 'black', palette: 'dark'},
  {id: 'skin', label: 'Skin tone', materials: ['M_Head'], camera: 'head', default: 'original', palette: 'skin'},
  {id: 'hair', label: 'Hair colour', materials: ['M_Hair'], camera: 'head', default: 'original', palette: 'hair'},
];

export const PALETTES = {
  hair: [
    ['black', 'Black', '#1c1917'],
    ['brown', 'Brown', '#4a3222'],
    ['blonde', 'Blonde', '#b8955a'],
    ['grey', 'Grey', '#8b8a86'],
    ['auburn', 'Auburn', '#7a3a1e'],
  ],
  skin: [
    ['s1', 'Fair', '#f1c9a5'],
    ['s2', 'Light', '#e0ac85'],
    ['s3', 'Tan', '#c68a5e'],
    ['s4', 'Brown', '#a0673f'],
    ['s5', 'Deep', '#7a4a2c'],
    ['s6', 'Dark', '#4f2f1d'],
  ],
  dark: [
    ['black', 'Black', '#16171a'],
    ['brown', 'Brown', '#3b2c20'],
    ['olive', 'Olive', '#3a4229'],
    ['grey', 'Grey', '#4c5054'],
  ],
  gear: [
    ['black', 'Black', '#1c1d20'],
    ['brown', 'Coyote brown', '#6b5538'],
    ['tan', 'Tan', '#8c7350'],
    ['olive', 'Olive drab', '#4b5a3a'],
    ['grey', 'Wolf grey', '#63676b'],
    ['navy', 'Navy', '#2a3348'],
  ],
  fabric: [
    ['olive', 'Olive', '#4b5a3a'],
    ['khaki', 'Khaki', '#a08c62'],
    ['tan', 'Tan', '#8c7350'],
    ['black', 'Black', '#23262b'],
    ['grey', 'Grey', '#63676b'],
    ['navy', 'Navy', '#2a3348'],
  ],
};
// Generated camo patterns (shared/camo.js) offered on textured zones, plus 'original' (the pack's own camo).
export const CAMO_IDS = ['woodland', 'desert', 'urban', 'flora', 'recon', 'plaidGreen', 'plaidBrown'];

export const VIEWS = {
  full: {label: 'Full', target: [0, 0.92, 0], distance: 3.5, height: 0.9},
  head: {label: 'Head', target: [0, 1.66, 0.05], distance: 1.25, height: 1.7},
  torso: {label: 'Torso', target: [0, 1.25, 0.05], distance: 2.3, height: 1.3},
  legs: {label: 'Legs', target: [0, 0.55, 0.05], distance: 2.6, height: 0.6},
  back: {label: 'Back', target: [0, 1.15, 0], distance: 3.2, height: 1.2, azimuth: 180},
  // Unusual low angle, medium close-up: lens at knee height, looking up past the rifle at the face.
  low: {label: 'Low angle', target: [0, 1.38, 0.05], distance: 1.25, height: 0.42, azimuth: -14},
};
export const HERO_AZIMUTH = 24; // degrees, front-right three-quarter: the hero angle used by the character sheets

// Triangle budget for the finished roster (docs/art-direction.md): operator + equipment.
export const TRIANGLE_BUDGET = 15000;

// Roadmap roster entries that are not modelled yet: shown locked ({id, label, status: 'planned', note}).
export const PLANNED = [];

// Looks assembled from Base Operator parts, hinting at the planned roster.
export const PRESETS = [
  {id: 'base', label: 'Base Operator', state: {}},
  {
    id: 'recon',
    label: 'Recon-style',
    state: {
      head: 'bare',
      comms: 'off',
      face: 'mask',
      pack: 'on',
      holsters: 'right',
      guards: 'knee',
      weapon: 'ak15k',
      'z.top': 'olive',
      'z.pants': 'olive',
      'z.armor': 'olive',
      'z.gear': 'olive',
    },
  },
  {
    id: 'gunner',
    label: 'Gunner · low angle',
    view: 'low',
    state: {
      pose: 'gunner',
      head: 'bare',
      comms: 'off',
      face: 'mask',
      armor: 'plates',
      rig: 'mags',
      belt: 'on',
      pack: 'off',
      holsters: 'none',
      guards: 'none',
      weapon: 'bench',
      build: 'P1.eyJyIjoicnBrIiwiYiI6eyJtYWdhemluZSI6ImRydW0ifX0', // RPK with the drum (shared/loadout.js encode)
      'z.top': 'black',
      'z.pants': 'olive',
      'z.armor': 'olive',
      'z.gear': 'olive',
    },
  },
  {
    id: 'insurgent',
    label: 'Insurgent-style',
    state: {
      head: 'bare',
      comms: 'off',
      face: 'mask',
      armor: 'soft',
      rig: 'mags',
      belt: 'on',
      pack: 'off',
      holsters: 'none',
      guards: 'none',
      weapon: 'ak74m',
      'z.top': 'flora',
      'z.pants': 'khaki',
      'z.gear': 'brown',
    },
  },
  {
    id: 'enforcer',
    label: 'Enforcer-style',
    state: {
      head: 'nvg',
      comms: 'on',
      face: 'both',
      armor: 'plates',
      rig: 'full',
      pack: 'off',
      holsters: 'both',
      guards: 'both',
      weapon: 'ak15k',
      'z.top': 'black',
      'z.pants': 'black',
      'z.armor': 'black',
      'z.gear': 'olive',
      'z.helmet': 'tan',
    },
  },
];

// A base = one skinned character on the shared skeleton (docs/engineering/skeleton-contract.md) plus the
// equipment slots, colour zones and looks that fit it. Adding Recon/Insurgent/Enforcer = adding an entry.
export const DEFAULT_BASE = 'generated-recon'; // the Recon (generated); the kitbashed Recon is deprecated
// ---- Recon: the Base Operator skeleton and meshes plus the Recon pack (hood, houndstooth scarf, chest radio) ----
const RECON_PARTS = {
  ...PARTS,
  hood: {nodes: ['SK_Recon_Hood']},
  scarf: {nodes: ['SK_Recon_Scarf']},
  radio: {nodes: ['SK_Recon_Radio']},
  carabiner: {nodes: ['SK_Recon_Carabiner']},
  canister: {nodes: ['SK_Recon_Canister']},
};
const bySlot = (id, patch) => SLOTS.map(s => (s.id !== id ? s : {...s, ...patch}));
const RECON_SLOTS = [
  {
    id: 'head',
    label: 'Headgear',
    camera: 'head',
    default: 'hood',
    options: [
      {id: 'hood', label: 'Hood', show: on('hood')},
      {id: 'nvg', label: 'Helmet + NVG', show: on('helmet', 'nvg')},
      {id: 'helmet', label: 'Helmet', show: on('helmet')},
      {id: 'bare', label: 'Bare head', show: on(), hair: true},
    ],
  },
  {
    id: 'neck',
    label: 'Scarf',
    camera: 'head',
    default: 'on',
    options: [
      {id: 'on', label: 'Houndstooth scarf', show: on('scarf')},
      {id: 'off', label: 'None', show: on()},
    ],
  },
  {
    id: 'radio',
    label: 'Chest radio',
    camera: 'torso',
    default: 'on',
    options: [
      {id: 'on', label: 'Radio', show: on('radio')},
      {id: 'off', label: 'None', show: on()},
    ],
  },
  {
    id: 'props',
    label: 'Hip props',
    camera: 'torso',
    default: 'both',
    options: [
      {id: 'both', label: 'Carabiner + canister', show: on('carabiner', 'canister')},
      {id: 'carabiner', label: 'Carabiner', show: on('carabiner')},
      {id: 'canister', label: 'Canister', show: on('canister')},
      {id: 'off', label: 'None', show: on()},
    ],
  },
  ...bySlot('comms', {default: 'off'}).filter(s => s.id === 'comms'),
  ...['face', 'hair', 'facial', 'armor', 'rig', 'belt'].map(id => SLOTS.find(s => s.id === id)),
  ...bySlot('pack', {default: 'off'}).filter(s => s.id === 'pack'),
  ...bySlot('holsters', {default: 'right'}).filter(s => s.id === 'holsters'),
  ...SLOTS.filter(s => s.id === 'guards'),
  patchSlot('L', 'shield'),
  patchSlot('R', 'tag'),
  ...bySlot('weapon', {default: 'ak15k'}).filter(s => s.id === 'weapon'),
];
const RECON_ZONES = [
  ...ZONES.map(
    z =>
      ({
        top: {...z, default: 'recon'},
        pants: {...z, default: 'recon'},
        armor: {...z, default: 'olive'},
        helmet: {...z, default: 'olive'},
        gear: {...z, default: 'olive'},
        gloves: {...z, default: 'olive'},
      })[z.id] || z,
  ),
  {id: 'hood', label: 'Hood', materials: ['M_Hood'], textured: true, camera: 'head', default: 'recon', palette: 'gear'},
  {id: 'scarf', label: 'Scarf', materials: ['M_Scarf'], textured: true, camera: 'head', default: 'original', palette: 'fabric'},
];
const RECON_PRESETS = [
  {id: 'recon', label: 'Recon (sheet)', state: {}},
  {
    id: 'ghost',
    label: 'Pale hood',
    state: {'z.hood': 'urban', 'z.top': 'urban', 'z.pants': 'urban', 'z.armor': 'grey', 'z.gear': 'grey', pack: 'on', holsters: 'none'},
  },
  {
    id: 'desert',
    label: 'Desert recon',
    state: {'z.hood': 'desert', 'z.top': 'desert', 'z.pants': 'desert', 'z.armor': 'tan', 'z.gear': 'brown', 'z.scarf': 'sand'},
  },
];

export const BASES = {
  base: {
    id: 'base',
    label: 'Base Operator',
    model: '../assets/models/operators/base-operator.glb',
    packs: ['../assets/models/operators/core-pack.glb', '../assets/models/operators/patches-pack.glb'],
    parts: PARTS,
    slots: SLOTS,
    zones: ZONES,
    presets: PRESETS,
    // Plain fabric by default; the pack's camo stays one click away as 'Original camo'.
    defaults: {'z.top': 'olive', 'z.pants': 'olive'},
    status: 'available',
  },
  // Deprecated: the kitbashed Recon (Base Operator plus the hood pack). Off the roster; old links still load it.
  recon: {
    id: 'recon',
    label: 'Recon (old)',
    model: '../assets/models/operators/base-operator.glb',
    packs: [
      '../assets/models/operators/core-pack.glb',
      '../assets/models/operators/patches-pack.glb',
      '../assets/models/operators/recon-pack.glb',
    ],
    parts: RECON_PARTS,
    slots: RECON_SLOTS,
    zones: RECON_ZONES,
    presets: RECON_PRESETS,
    defaults: {pose: 'hero'},
    status: 'deprecated',
  },
};
// ---- Insurgent and Enforcer: both wear the headwear pack (knit beanie, shemagh); Enforcer is otherwise Base parts in black ----
const HEADWEAR_PARTS = {...PARTS, beanie: {nodes: ['SK_Ins_Beanie']}, shemagh: {nodes: ['SK_Ins_Shemagh']}};
const headSlot = def => ({
  id: 'head',
  label: 'Headgear',
  camera: 'head',
  default: def,
  options: [
    {id: 'beanie', label: 'Knit beanie', show: on('beanie')},
    {id: 'nvg', label: 'Helmet + NVG', show: on('helmet', 'nvg')},
    {id: 'helmet', label: 'Helmet', show: on('helmet')},
    {id: 'bare', label: 'Bare head', show: on(), hair: true},
  ],
});
const faceSlot = def => ({
  id: 'face',
  label: 'Face',
  camera: 'head',
  default: def,
  options: [
    {id: 'shemagh', label: 'Shemagh', show: on('shemagh'), covers: true},
    {id: 'mask', label: 'Balaclava', show: on('mask'), covers: true},
    {id: 'visor', label: 'Visor', show: on('visor')},
    {id: 'both', label: 'Balaclava + visor', show: on('mask', 'visor'), covers: true},
    {id: 'bare', label: 'Bare face', show: on()},
  ],
});
const variantSlots = (head, face, defaults) =>
  SLOTS.map(s => {
    const slot = s.id === 'head' ? headSlot(head) : s.id === 'face' ? faceSlot(face) : s;
    return defaults[s.id] ? {...slot, default: defaults[s.id]} : slot;
  });
const variantZones = (defaults, extra = []) => [...ZONES.map(z => (defaults[z.id] ? {...z, default: defaults[z.id]} : z)), ...extra];
const HEADWEAR_ZONES = [
  {id: 'beanie', label: 'Beanie', materials: ['M_Beanie'], camera: 'head', default: 'original', palette: 'dark'},
  {id: 'shemagh', label: 'Shemagh', materials: ['M_Shemagh'], textured: true, camera: 'head', default: 'original', palette: 'fabric'},
];
const INSURGENT_SLOTS = variantSlots('beanie', 'shemagh', {
  comms: 'off',
  armor: 'soft',
  rig: 'mags',
  belt: 'on',
  pack: 'off',
  holsters: 'none',
  guards: 'none',
  weapon: 'ak74m',
  patchL: 'star',
});
const ENFORCER_SLOTS = variantSlots('beanie', 'shemagh', {
  comms: 'off',
  armor: 'plates',
  rig: 'full',
  belt: 'on',
  pack: 'off',
  holsters: 'both',
  guards: 'both',
  weapon: 'ak15k',
});

BASES.insurgent = {
  id: 'insurgent',
  label: 'Insurgent',
  model: BASES.base.model,
  packs: [
    '../assets/models/operators/core-pack.glb',
    '../assets/models/operators/patches-pack.glb',
    '../assets/models/operators/insurgent-pack.glb',
  ],
  parts: HEADWEAR_PARTS,
  slots: INSURGENT_SLOTS,
  zones: variantZones({top: 'plaidGreen', pants: 'khaki', gear: 'brown', gloves: 'brown'}, HEADWEAR_ZONES),
  presets: [
    {id: 'insurgent', label: 'Keyframe 1', state: {}},
    {id: 'brown', label: 'Brown plaid', state: {'z.top': 'plaidBrown', 'z.pants': 'olive', 'z.shemagh': 'khaki'}},
    {
      id: 'ak',
      label: 'AK rifleman',
      state: {
        'z.top': 'tan',
        'z.pants': 'olive',
        'z.gear': 'olive',
        rig: 'full',
        armor: 'plates',
        'z.armor': 'olive',
        head: 'bare',
        face: 'shemagh',
      },
    },
  ],
  defaults: {pose: 'ready'},
  status: 'available',
};
BASES.enforcer = {
  id: 'enforcer',
  label: 'Enforcer',
  model: BASES.base.model,
  packs: [
    '../assets/models/operators/core-pack.glb',
    '../assets/models/operators/patches-pack.glb',
    '../assets/models/operators/insurgent-pack.glb',
  ],
  parts: HEADWEAR_PARTS,
  slots: ENFORCER_SLOTS,
  zones: variantZones(
    {top: 'black', pants: 'black', armor: 'black', helmet: 'tan', gear: 'olive', gloves: 'black', boots: 'black'},
    HEADWEAR_ZONES,
  ),
  presets: [
    {id: 'enforcer', label: 'Keyframe 2', state: {}},
    {id: 'nvg', label: 'NVG night', state: {head: 'nvg', face: 'both', 'z.helmet': 'black', 'z.gear': 'black'}},
    {id: 'tan', label: 'Tan kit', state: {'z.top': 'tan', 'z.pants': 'tan', 'z.armor': 'brown', 'z.gear': 'brown'}},
  ],
  defaults: {pose: 'hero'},
  status: 'available',
};

BASES['generated-recon'] = generatedRecon(SLOTS.find(s => s.id === 'weapon'));

export const ROSTER = [
  ...Object.values(BASES)
    .filter(b => b.status !== 'deprecated')
    .sort((a, b) => Number(b.id === DEFAULT_BASE) - Number(a.id === DEFAULT_BASE))
    .map(b => ({id: b.id, label: b.label, status: b.status})),
  ...PLANNED.filter(p => !BASES[p.id]),
];

/** Default state for a base: every slot and zone at its default, plus pose and idle. */
export const defaultsFor = base => ({
  base: base.id,
  ...Object.fromEntries(base.slots.map(s => [s.id, s.default])),
  ...Object.fromEntries(base.zones.map(z => [`z.${z.id}`, z.default])),
  pose: 'relaxed',
  idle: 'calm',
  look: 'on',
  build: '',
  ...base.defaults,
});
