// Operator Customiser configuration: how the Base Operator's 21 modular meshes become equipment
// slots, and which materials the colour zones repaint. Pure data, no three.js, so tests can read it.
//
// A *part* names mesh nodes (SK_* in assets/models/operators/base-operator.glb) and, optionally, the
// materials inside them (a node can carry several primitives, e.g. the helmet shell and its headset).
// A *slot* lists mutually exclusive options; each option says which parts are visible.

export const PARTS = {
  helmet:       {nodes: ['SK_Helmet'], materials: ['M_Helmet_Frame', 'M_Helmet', 'M_Mask_Strap']},
  headset:      {nodes: ['SK_Helmet'], materials: ['M_Helmet_Headphone']},
  nvg:          {nodes: ['SK_Helmet_Scope']},
  mask:         {nodes: ['SK_Mask']},
  visor:        {nodes: ['SK_Glass']},
  plates:       {nodes: ['SK_Body'], materials: ['M_Body_Armor']},
  chestPouches: {nodes: ['SK_Chest_Pouches']},
  bellyPouches: {nodes: ['SK_Belly_Pouches']},
  shoulderPads: {nodes: ['SK_Shoulder_Pouches']},
  belt:         {nodes: ['SK_Belt']},
  backpack:     {nodes: ['SK_Backpack']},
  elbowGuards:  {nodes: ['SK_Elbow_Guard_L', 'SK_Elbow_Guard_R']},
  kneeGuards:   {nodes: ['SK_Leg_Guard_L', 'SK_Leg_Guard_R']},
  holsterR:     {nodes: ['SK_Leg_Holster_R']},
  holsterL:     {nodes: ['SK_Leg_Holster_L']},
};
// Always shown: SK_Face, SK_Eyeball, SK_Body (uniform top), SK_Legs, SK_Gloves, SK_Shoes.

const on = (...parts) => parts;
export const SLOTS = [
  {id: 'head', label: 'Headgear', camera: 'head', default: 'nvg', options: [
    {id: 'nvg',    label: 'Helmet + NVG', show: on('helmet', 'nvg')},
    {id: 'helmet', label: 'Helmet',       show: on('helmet')},
    {id: 'bare',   label: 'Bare head',    show: on()},
  ]},
  {id: 'comms', label: 'Headset', camera: 'head', default: 'on', options: [
    {id: 'on',  label: 'Headset', show: on('headset')},
    {id: 'off', label: 'None',    show: on()},
  ]},
  {id: 'face', label: 'Face', camera: 'head', default: 'mask', options: [
    {id: 'mask',  label: 'Mask',      show: on('mask')},
    {id: 'visor', label: 'Visor',     show: on('visor')},
    {id: 'both',  label: 'Mask + visor', show: on('mask', 'visor')},
    {id: 'bare',  label: 'Bare face', show: on()},
  ]},
  {id: 'armor', label: 'Body armour', camera: 'torso', default: 'plates', options: [
    {id: 'plates', label: 'Plate carrier', show: on('plates')},
    {id: 'soft',   label: 'Uniform only',  show: on()},
  ]},
  {id: 'rig', label: 'Chest rig', camera: 'torso', default: 'full', options: [
    {id: 'full',    label: 'Full',      show: on('chestPouches', 'bellyPouches', 'shoulderPads')},
    {id: 'mags',    label: 'Mag pouches', show: on('chestPouches')},
    {id: 'minimal', label: 'Minimal',   show: on()},
  ]},
  {id: 'belt', label: 'Belt kit', camera: 'torso', default: 'on', options: [
    {id: 'on',  label: 'Belt + pouches', show: on('belt')},
    {id: 'off', label: 'None',           show: on()},
  ]},
  {id: 'pack', label: 'Backpack', camera: 'back', default: 'on', options: [
    {id: 'on',  label: 'Backpack', show: on('backpack')},
    {id: 'off', label: 'None',     show: on()},
  ]},
  {id: 'holsters', label: 'Holsters', camera: 'legs', default: 'both', options: [
    {id: 'both',  label: 'Both legs',  show: on('holsterR', 'holsterL')},
    {id: 'right', label: 'Right leg',  show: on('holsterR')},
    {id: 'left',  label: 'Left leg',   show: on('holsterL')},
    {id: 'none',  label: 'None',       show: on()},
  ]},
  {id: 'guards', label: 'Pads', camera: 'legs', default: 'both', options: [
    {id: 'both',  label: 'Elbow + knee', show: on('elbowGuards', 'kneeGuards')},
    {id: 'knee',  label: 'Knee only',    show: on('kneeGuards')},
    {id: 'elbow', label: 'Elbow only',   show: on('elbowGuards')},
    {id: 'none',  label: 'None',         show: on()},
  ]},
  {id: 'weapon', label: 'Carried weapon', camera: 'full', default: 'none', options: [
    {id: 'none',  label: 'None',    show: on()},
    {id: 'ak74m', label: 'AK-74M',  show: on(), weapon: 'ak74m'},
    {id: 'ak15k', label: 'AK-15K',  show: on(), weapon: 'ak15k'},
  ]},
];

// Colour zones repaint materials. `textured` zones start with the pack's camo texture ('original').
export const ZONES = [
  {id: 'top',    label: 'Uniform top', materials: ['M_Top_Fabric'], textured: true,  camera: 'torso', default: 'original', palette: 'fabric'},
  {id: 'pants',  label: 'Trousers',    materials: ['M_Fabric_Bottom'], textured: true, camera: 'legs', default: 'original', palette: 'fabric'},
  {id: 'armor',  label: 'Armour',      materials: ['M_Body_Armor'], camera: 'torso', default: 'black',  palette: 'gear'},
  {id: 'helmet', label: 'Helmet',      materials: ['M_Helmet'],     camera: 'head',  default: 'brown',  palette: 'gear'},
  {id: 'gear',   label: 'Pouches & pack', materials: ['M_Pouch', 'M_Pouch_Strap', 'M_Backpack', 'M_Backpack_Strap', 'M_Leg_Holster', 'M_Hip_Guard'], camera: 'torso', default: 'original', palette: 'gear'},
  {id: 'gloves', label: 'Gloves',      materials: ['M_Glove'],      camera: 'full',  default: 'black',  palette: 'dark'},
  {id: 'boots',  label: 'Boots',       materials: ['M_Shoe'],       camera: 'legs',  default: 'black',  palette: 'dark'},
  {id: 'skin',   label: 'Skin tone',   materials: ['M_Head'],       camera: 'head',  default: 'original', palette: 'skin'},
];

export const PALETTES = {
  skin: [['s1', 'Fair', '#f1c9a5'], ['s2', 'Light', '#e0ac85'], ['s3', 'Tan', '#c68a5e'], ['s4', 'Brown', '#a0673f'], ['s5', 'Deep', '#7a4a2c'], ['s6', 'Dark', '#4f2f1d']],
  dark:  [['black', 'Black', '#16171a'], ['brown', 'Brown', '#3b2c20'], ['olive', 'Olive', '#3a4229'], ['grey', 'Grey', '#4c5054']],
  gear:  [['black', 'Black', '#1c1d20'], ['brown', 'Coyote brown', '#6b5538'], ['tan', 'Tan', '#8c7350'], ['olive', 'Olive drab', '#4b5a3a'], ['grey', 'Wolf grey', '#63676b'], ['navy', 'Navy', '#2a3348']],
  fabric: [['olive', 'Olive', '#4b5a3a'], ['khaki', 'Khaki', '#a08c62'], ['tan', 'Tan', '#8c7350'], ['black', 'Black', '#23262b'], ['grey', 'Grey', '#63676b'], ['navy', 'Navy', '#2a3348']],
};
// Generated camo patterns (shared/camo.js) offered on textured zones, plus 'original' (the pack's own camo).
export const CAMO_IDS = ['woodland', 'desert', 'urban', 'flora'];

export const VIEWS = {
  full:  {label: 'Full',  target: [0, 0.92, 0], distance: 3.5, height: 0.9},
  head:  {label: 'Head',  target: [0, 1.66, 0.05], distance: 1.25, height: 1.7},
  torso: {label: 'Torso', target: [0, 1.25, 0.05], distance: 2.3, height: 1.3},
  legs:  {label: 'Legs',  target: [0, 0.55, 0.05], distance: 2.6, height: 0.6},
  back:  {label: 'Back',  target: [0, 1.15, 0], distance: 3.2, height: 1.2, azimuth: 180},
};
export const HERO_AZIMUTH = 24; // degrees, front-right three-quarter: the hero angle used by the character sheets

// Triangle budget for the finished roster (docs/art-direction.md): operator + equipment.
export const TRIANGLE_BUDGET = 15000;

// Roadmap roster shown as locked entries: they are built from the moodboard sheets, not yet modelled.
export const ROSTER = [
  {id: 'base',      label: 'Base Operator', status: 'available'},
  {id: 'recon',     label: 'Recon',         status: 'planned', note: 'Hooded, scarf, plate carrier: see docs/moodboard (Recon sheet v01-09).'},
  {id: 'insurgent', label: 'Insurgent',     status: 'planned', note: 'Plaid shirt, shemagh, G3-pattern rifle: keyframe 1 and the AK rifleman in keyframe 2.'},
  {id: 'enforcer',  label: 'Enforcer',      status: 'planned', note: 'Black kit, bold pouches, modern rifle: the foreground operator of keyframe 2.'},
];

// Looks assembled from Base Operator parts, hinting at the planned roster.
export const PRESETS = [
  {id: 'base',      label: 'Base Operator', state: {}},
  {id: 'recon',     label: 'Recon-style',   state: {head: 'bare', comms: 'off', face: 'mask', pack: 'on', holsters: 'right', guards: 'knee', weapon: 'ak15k', 'z.top': 'olive', 'z.pants': 'olive', 'z.armor': 'olive', 'z.gear': 'olive'}},
  {id: 'insurgent', label: 'Insurgent-style', state: {head: 'bare', comms: 'off', face: 'mask', armor: 'soft', rig: 'mags', belt: 'on', pack: 'off', holsters: 'none', guards: 'none', weapon: 'ak74m', 'z.top': 'flora', 'z.pants': 'khaki', 'z.gear': 'brown'}},
  {id: 'enforcer',  label: 'Enforcer-style', state: {head: 'nvg', comms: 'on', face: 'both', armor: 'plates', rig: 'full', pack: 'off', holsters: 'both', guards: 'both', weapon: 'ak15k', 'z.top': 'black', 'z.pants': 'black', 'z.armor': 'black', 'z.gear': 'olive', 'z.helmet': 'tan'}},
];
