// Rifles from the Sketchfab batch (WP-A9, A12, A13, A15..A18). Same schema as models.js; this file only
// keeps the repeated slot boilerplate out of the way. Sockets are in SOURCE units (muzzle along +x), like the
// AK-74M's (the StG 44 and PPSh-41 files face the other way: their muzzle is at -x), and `scale` turns a source unit into metres (printed by tools/assets/import-sketchfab.mjs, or
// real length / source length for the skinned downloads).
//
// Models by D_U (CC BY 4.0) unless `author` says otherwise. Loose spare magazines and rounds were stripped
// at import time (`strip` in tools/assets/sketchfab-sources.json).

import {real, Z_FWD} from './attachments.js';

const DU = {name: 'D_U', url: 'https://sketchfab.com/DU1701'};
const rail = (min, max) => ({min, max, step: 0.01});
const std = {
  trigger: {factory: [{id: 'std', label: 'Standard', original: true, detail: 'Standard trigger.'}], library: ['match']},
  charging: {factory: [{id: 'std', label: 'Standard', original: true, detail: 'Standard charging handle.'}], library: ['ext']},
  sling: {factory: [{id: 'none', label: 'None', detail: 'No sling fitted.'}], library: ['swivel', 'strap']},
};
const side = {
  rail: rail(-0.08, 0.04),
  factory: [{id: 'none', fp: [0, 0], label: 'None', detail: 'Bare side rail.'}],
  library: ['light', 'laser', 'combo'],
};
const buis = {rail: rail(-0.1, 0.12), factory: [{id: 'none', fp: [0, 0], label: 'None', detail: 'No back-up sight.'}], library: ['flip']};
const foregrip = (travel = rail(-0.06, 0.02)) => ({
  rail: travel,
  factory: [{id: 'none', fp: [0, 0], label: 'None', detail: 'Clean handguard, no foregrip.'}],
  library: ['vertical', 'angled', 'stop', 'bipod'],
});
// Iron sights are part of the model, so the factory optic is "Irons" and optics clamp onto the top.
const optic = (library = ['micro', 'holo', 'scope'], travel = rail(-0.05, 0.05)) => ({
  rail: travel,
  factory: [{id: 'none', sightHeight: 0.025, fp: [0, 0], label: 'Irons', detail: 'Iron sights; the top of the receiver takes an optic.'}],
  library,
});
const muzzle = (factory, library = ['comp', 'can', 'bare']) => ({factory, library});
const magazine = (factory, library = ['none']) => ({factory, library});
const part = (id, label, detail, nodes = []) => ({id, label, detail, nodes});
// The slot parts a rifle has no separate mesh for: empty parts that still give the slot a mount.
// 7.62 NATO rifles take the PMAG drum instead of the AK drum.
const drum50 = {
  id: 'drum',
  label: '50-rnd drum',
  rounds: 50,
  build: real('g3-drum.glb', {scale: 0.966152, rotation: Z_FWD, anchor: ['c', 'max', 'c']}),
};
const EMPTY = {
  optic: part('optic', 'Optic', 'Top of the receiver: takes an optic.'),
  buis: part('buis', 'Back-up sight', 'Top-rail position for a folding back-up sight.'),
  trigger: part('trigger', 'Trigger', 'Standard trigger and guard.'),
  charging: part('charging', 'Charging handle', 'Standard charging handle.'),
  sling: part('sling', 'Sling', 'Rear sling mount.'),
  foregrip: part('foregrip', 'Foregrip', 'Clean handguard.'),
  side: part('side', 'Side rail', 'Side rail on the handguard.'),
  muzzle: part('muzzle', 'Muzzle device', 'Threaded muzzle.'),
};

export const EXTRA = {
  g3: {
    label: 'HK G3A3',
    title: 'HK G3A3',
    url: '../assets/models/weapons/g3.glb',
    scale: 0.0983263,
    fixed: ['stock'], // one moulding with the grip and handguard
    author: DU,
    source: {title: 'low-poly HK G3', url: 'https://sketchfab.com/3d-models/86ff01824c394e349cda876a827fa69c'},
    specs: [
      ['Overall length', '1,025 mm'],
      ['Cartridge', '7.62×51 mm NATO'],
      ['Action', 'Roller-delayed blowback'],
    ],
    baseGrams: 4000,
    stats: {ergo: 30, recoil: 40, handling: 34, loud: 92, sighting: 38},
    defaults: {build: {}, finish: {}},
    parts: [
      part('receiver', 'Receiver & bolt group', 'G3 receiver, bolt, selector, magazine and bolt releases.', [
        'bolt_4',
        'mode_5',
        'mag release_1',
      ]),
      part('trigger', 'Trigger', 'Trigger and pack.', ['trigga_3']),
      part('charging', 'Charging handle', 'Cocking handle on the left of the forend.', ['reload handle_10', 'idk. with reload handle_11']),
      part('muzzle', 'Muzzle device', 'G3 birdcage flash hider.', ['muzzle 76251 g3_9']),
      part('stock', 'Furniture', 'Polymer buttstock, pistol grip and handguard (one moulding in this model).', ['Object_5']),
      part('magazine', 'Magazine', '20-round 7.62×51 steel magazine.', ['76251 g3mag 30rnd empty_7']),
      EMPTY.optic,
      EMPTY.buis,
      EMPTY.sling,
      EMPTY.foregrip,
      EMPTY.side,
    ],
    // Where the support hand holds the rifle, in metres from the grip socket (muzzle +x, up +y): operator/operator.js.
    handguardAt: [0.4, 0.045, 0],
    sockets: [
      ['muzzle', 'Muzzle', [5.023, -0.04247, 0], [1, 0, 0]],
      ['optic', 'Optic mount', [1, 0.3718, 0], [0, 1, 0]],
      ['buis', 'Back-up sight', [2.5, 0.3525, 0], [0, 1, 0]],
      ['trigger', 'Trigger', [-0.5, -0.4, 0], [0, -1, 0]],
      ['charging', 'Charging handle', [1.6, 0.12, 0.2], [0, 0, 1]],
      ['sling', 'Sling mount', [-4.7, -0.05, 0], [-1, 0, 0]],
      ['foregrip', 'Under rail', [2.3, -0.19, 0], [0, -1, 0]],
      ['side', 'Side rail', [2.3, 0.05, 0.2022], [0, 0, 1]],
      ['magazine', 'Mag well', [0.25, -0.0726, 0], [0, -1, 0]],
      ['stock', 'Stock', [-2.4, 0.1, 0], [-1, 0, 0]],
      ['grip', 'Grip', [-1.55, -0.5, 0], [0, -1, 0]],
    ],
    slots: {
      muzzle: muzzle([{id: 'g3', grams: 90, label: 'G3 flash hider', original: true}]),
      optic: optic([
        {id: 'scope', build: real('g3-scope.glb', {scale: 0.971672, rotation: Z_FWD, anchor: ['c', 'min', 'c'], offset: [0, -0.012, 0]})},
        'micro',
        'holo',
      ]),
      buis,
      trigger: std.trigger,
      charging: std.charging,
      sling: std.sling,
      foregrip: foregrip(),
      side,
      magazine: magazine([{id: '20', grams: 330, label: '20-rnd steel', original: true}], [drum50, 'none']),
      stock: {factory: [{id: 'extended', grams: 1300, label: 'G3 furniture', original: true}], library: []},
    },
  },

  m16: {
    label: 'M16A1',
    title: 'M16A1',
    url: '../assets/models/weapons/m16.glb',
    scale: 0.005135,
    // The source is drawn too tall and too thin for an M16A1 (990 mm long, about 240 mm from carry handle to grip).
    stretch: [1, 0.63, 2.2],
    fixed: ['stock'], // stock and handguard are one moulding
    author: DU,
    source: {title: 'low-poly M16', url: 'https://sketchfab.com/DU1701'},
    specs: [
      ['Overall length', '990 mm'],
      ['Cartridge', '5.56×45 mm NATO'],
      ['Action', 'Direct impingement'],
    ],
    baseGrams: 2900,
    stats: {ergo: 48, recoil: 66, handling: 56, loud: 86, sighting: 40},
    defaults: {build: {}, finish: {}},
    parts: [
      part('stock', 'Stock & handguard', 'Fixed A1 buttstock and triangular handguard (one moulding in this model).', ['Object_12']),
      part('magazine', 'Magazine', '20-round 5.56×45 aluminium magazine.', ['Object_13']),
      EMPTY.optic,
      EMPTY.sling,
      EMPTY.foregrip,
      EMPTY.side,
      EMPTY.muzzle,
    ],
    // Where the support hand holds the rifle, in metres from the grip socket (muzzle +x, up +y): operator/operator.js.
    handguardAt: [0.4, 0.12, 0],
    // Clamp-on mount points this source has no socket for, in metres on the laid-out rifle (workbench/universal.js).
    mounts: [
      ['buis', 'Back-up sight', [0.16, 0.076, 0], [0, 1, 0]],
      ['trigger', 'Trigger', [-0.165, -0.019, 0], [0, -1, 0]],
      ['charging', 'Charging handle', [-0.2, 0.057, 0.026], [0, 0, 1]],
    ],
    sockets: [
      ['muzzle', 'Muzzle', [111.45, 18.779, 0], [1, 0, 0]],
      ['optic', 'Carry-handle mount', [-8, 45, 0], [0, 1, 0]],
      ['sling', 'Sling mount', [-81, 12, 0], [-1, 0, 0]],
      ['foregrip', 'Under handguard', [55, 13.447, 0], [0, -1, 0]],
      ['side', 'Side rail', [60, 22, 2.153], [0, 0, 1]],
      ['magazine', 'Mag well', [-3, -6.233, 0], [0, -1, 0]],
      ['stock', 'Stock', [-35, 14, 0], [-1, 0, 0]],
      ['grip', 'Grip', [-28, -14, 0], [0, -1, 0]],
    ],
    slots: {
      muzzle: muzzle([{id: 'a1', grams: 0, label: 'A1 flash hider', detail: 'Birdcage flash hider, modelled into the barrel.'}], ['can']),
      optic: optic(['micro', 'holo', 'scope'], rail(-0.05, 0.04)),
      sling: std.sling,
      foregrip: foregrip(rail(-0.06, 0.02)),
      side,
      magazine: magazine([{id: '20', grams: 270, label: '20-rnd', original: true}], [drum50, 'none']),
      stock: {factory: [{id: 'extended', grams: 900, label: 'A1 furniture', original: true}], library: []},
    },
  },
  mk14: {
    label: 'Mk 14 EBR',
    title: 'Mk 14 EBR',
    url: '../assets/models/weapons/mk14.glb',
    scale: 0.002382,
    author: DU,
    source: {title: 'low-poly Mk 14 EBR', url: 'https://sketchfab.com/DU1701'},
    specs: [
      ['Overall length', '889 mm'],
      ['Cartridge', '7.62×51 mm NATO'],
      ['Role', 'Designated marksman rifle'],
    ],
    baseGrams: 5100,
    stats: {ergo: 28, recoil: 42, handling: 30, loud: 92, sighting: 52},
    defaults: {build: {optic: 'scope'}, finish: {}},
    parts: [
      part('stock', 'Chassis stock', 'Adjustable chassis stock with pistol grip and cheek riser.', ['Object_32', 'Object_37']),
      part('magazine', 'Magazine', '20-round 7.62×51 magazine.', ['Object_41']),
      EMPTY.optic,
      EMPTY.buis,
      EMPTY.sling,
      EMPTY.foregrip,
      EMPTY.side,
      EMPTY.muzzle,
    ],
    // Where the support hand holds the rifle, in metres from the grip socket (muzzle +x, up +y): operator/operator.js.
    handguardAt: [0.357, 0.074, 0],
    // Clamp-on mount points this source has no socket for, in metres on the laid-out rifle (workbench/universal.js).
    mounts: [
      ['trigger', 'Trigger', [-0.18, -0.005, -0.008], [0, -1, 0]],
      ['charging', 'Charging handle', [0.03, 0.05, 0.02], [0, 0, 1]],
    ],
    sockets: [
      ['muzzle', 'Muzzle', [186.96, 21.774, 0], [1, 0, 0]],
      ['optic', 'Top rail', [10, 31.592, 0], [0, 1, 0]],
      ['buis', 'Back-up sight rail', [70, 32.797, 0], [0, 1, 0]],
      ['sling', 'Sling mount', [-185, 20, 0], [-1, 0, 0]],
      ['foregrip', 'Under rail', [80, 6.326, 0], [0, -1, 0]],
      ['side', 'Side rail', [90, 18, 7.938], [0, 0, 1]],
      ['magazine', 'Mag well', [-8, 2.792, 0], [0, -1, 0]],
      ['stock', 'Stock', [-80, 12, 0], [-1, 0, 0]],
      ['grip', 'Grip', [-100, -16, 0], [0, -1, 0]],
    ],
    slots: {
      muzzle: muzzle([{id: 'ebr', grams: 0, label: 'Flash hider', detail: 'Flash hider, modelled into the barrel.'}], ['can', 'comp']),
      optic: optic(['micro', 'holo', 'scope'], rail(-0.08, 0.1)),
      buis,
      sling: std.sling,
      foregrip: foregrip(rail(-0.08, 0.04)),
      side,
      magazine: magazine([{id: '20', grams: 310, label: '20-rnd', original: true}], [drum50, 'none']),
      stock: {factory: [{id: 'extended', grams: 1500, label: 'EBR chassis', original: true}], library: []},
    },
  },
  spear: {
    label: 'SIG Spear',
    title: 'SIG MCX Spear',
    url: '../assets/models/weapons/spear.glb',
    scale: 0.103763,
    author: DU,
    source: {title: 'low-poly SIG MCX Spear', url: 'https://sketchfab.com/3d-models/36ac159795ae465e8a4d44068bbaf434'},
    specs: [
      ['Overall length', '1,209 mm (stock extended)'],
      ['Cartridge', '6.8×51 mm'],
      ['Action', 'Short-stroke piston'],
    ],
    baseGrams: 3900,
    stats: {ergo: 40, recoil: 46, handling: 46, loud: 90, sighting: 42},
    defaults: {build: {}, finish: {}},
    parts: [
      part('receiver', 'Receiver & bolt group', 'MCX Spear upper and lower, bolt carrier, shutter, selector and releases.', [
        'mcx bolt carrier_3',
        'mcx spear shutter_4',
        'mcx mode&safe_6',
        'mcx mag release_8',
        'mcx bolt release 1_9',
        'mcx bolt release 2_10',
        'mcx reload handle base_16',
        'mcx reload handle_17',
      ]),
      part('trigger', 'Trigger', 'Trigger.', ['mcx trigga_7']),
      part('charging', 'Charging handle', 'Ambidextrous charging handle.', ['mcx spear charging handle_5']),
      part('muzzle', 'Muzzle device', 'SLX suppressor on its brake adapter.', ['mcx muzzle brake&sup adapter_14', '6.8 slx suppressor_19']),
      part('optic', 'Optic', 'EOTech XPS2 holographic sight.', ['eotech xps2_18']),
      part('magazine', 'Magazine', '20-round 6.8×51 Lancer magazine.', ['277 ar-10 mag 30rnd (lancer).001_1']),
      part('grip', 'Pistol grip', 'MCX pistol grip.', ['sig mcx spear.001_20']),
      part('stock', 'Stock', 'Telescoping stock: tube, base and butt.', ['mcx srock tube_11', 'mcx stock base_12', 'mcx srock butt_13']),
      EMPTY.buis,
      EMPTY.sling,
      EMPTY.foregrip,
      EMPTY.side,
    ],
    // Where the support hand holds the rifle, in metres from the grip socket (muzzle +x, up +y): operator/operator.js.
    handguardAt: [0.384, 0.042, 0],
    sockets: [
      ['muzzle', 'Muzzle', [4.463, 0.1829, 0], [1, 0, 0]],
      ['optic', 'Optic rail', [0.55, 0.74, 0], [0, 1, 0]],
      ['buis', 'Back-up sight rail', [1.9, 0.7059, 0], [0, 1, 0]],
      ['trigger', 'Trigger', [-0.65, -0.2, 0], [0, -1, 0]],
      ['charging', 'Charging handle', [-0.2, 0.64, 0], [0, 1, 0]],
      ['sling', 'Sling mount', [-4.6, 0, 0], [-1, 0, 0]],
      ['foregrip', 'Under rail', [2.5, 0.02179, 0], [0, -1, 0]],
      ['side', 'Side rail', [2.6, 0.25, 0.2308], [0, 0, 1]],
      ['magazine', 'Mag well', [0.16, 0.03965, 0], [0, -1, 0]],
      ['grip', 'Grip', [-1.2, -0.15, 0], [0, -1, 0]],
      ['stock', 'Stock', [-2.0, 0.27, 0], [-1, 0, 0]],
    ],
    slots: {
      muzzle: muzzle([
        // the file leaves a gap between the brake adapter and the can: seat it over the adapter
        {id: 'slx', grams: 700, label: 'SLX suppressor', original: true, pose: {nodes: {'6.8 slx suppressor_19': [-0.045, 0, 0]}}},
      ]),
      optic: {
        rail: rail(-0.06, 0.1),
        factory: [{id: 'eotech', fp: [-0.05, 0.05], grams: 310, sightHeight: 0.055, label: 'EOTech XPS2', original: true}],
        library: ['micro', 'holo', 'scope', 'none'],
      },
      buis,
      trigger: std.trigger,
      charging: std.charging,
      sling: std.sling,
      foregrip: foregrip(rail(-0.08, 0.02)),
      side,
      magazine: magazine([{id: '20', grams: 330, label: '20-rnd', original: true}], [drum50, 'none']),
      grip: {factory: [{id: 'factory', grams: 90, label: 'MCX grip', original: true}], library: []},
      stock: {factory: [{id: 'extended', grams: 600, label: 'Extended', original: true}], library: ['none']},
    },
  },
  stg44: {
    label: 'StG 44',
    title: 'StG 44',
    url: '../assets/models/weapons/stg44.glb',
    scale: 0.103763,
    // One black mesh in the source: split into a walnut butt, a Bakelite grip and stamped steel (workbench/surface.js).
    surface: {
      base: {name: 'h-190', tex: 'steel', color: '#26292b', roughness: 0.45, metalness: 0.65},
      parts: {magazine: {name: 'mag', tex: 'steel', color: '#2f3234', roughness: 0.5, metalness: 0.55}},
      regions: [
        {min: [-1, -1, -1], max: [-0.235, 1, 1], spec: {name: 'polymer', tex: 'wood', color: '#5e3c22', roughness: 0.6, metalness: 0}},
        {
          min: [-0.16, -1, -1],
          max: [-0.03, -0.035, 1],
          spec: {name: 'bakelite', tex: 'bakelite', color: '#3a2116', roughness: 0.45, metalness: 0},
        },
      ],
    },
    author: DU,
    source: {title: 'low-poly StG 44', url: 'https://sketchfab.com/DU1701'},
    specs: [
      ['Overall length', '953 mm'],
      ['Cartridge', '7.92×33 mm Kurz'],
      ['Year', '1944'],
    ],
    baseGrams: 5100,
    stats: {ergo: 32, recoil: 52, handling: 36, loud: 90, sighting: 28},
    defaults: {build: {}, finish: {}},
    parts: [part('magazine', 'Magazine', '30-round curved Kurz magazine.', ['Cube.004_2']), EMPTY.optic, EMPTY.sling, EMPTY.muzzle],
    // Where the support hand holds the rifle, in metres from the grip socket (muzzle +x, up +y): operator/operator.js.
    handguardAt: [0.34, 0.047, 0],
    // Clamp-on mount points this source has no socket for, in metres on the laid-out rifle (workbench/universal.js).
    mounts: [
      ['buis', 'Back-up sight', [0.17, 0.131, 0.01], [0, 1, 0]],
      ['trigger', 'Trigger', [-0.025, 0.03, 0.01], [0, -1, 0]],
      ['charging', 'Charging handle', [0.1, 0.1, 0.036], [0, 0, 1]],
      ['foregrip', 'Under forend', [0.15, 0.02, 0.01], [0, -1, 0]],
      ['side', 'Side of forend', [0.17, 0.07, 0.035], [0, 0, 1]],
    ],
    sockets: [
      ['muzzle', 'Muzzle', [-4.479, 0.4161, 0], [-1, 0, 0]],
      ['optic', 'Optic mount', [-0.1, 1.073, 0], [0, 1, 0]],
      ['sling', 'Sling mount', [4.4, 0, 0], [1, 0, 0]],
      ['magazine', 'Mag well', [-0.37, 0.1, 0], [0, -1, 0]],
      ['grip', 'Grip', [0.76, -0.35, 0], [0, -1, 0]],
    ],
    slots: {
      muzzle: muzzle(
        [{id: 'hood', grams: 0, label: 'Plain muzzle', detail: 'Threaded muzzle with its front sight hood.'}],
        ['can', 'comp'],
      ),
      optic: optic(['scope', 'micro'], rail(-0.04, 0.06)),
      sling: std.sling,
      magazine: magazine([{id: '30', grams: 450, label: '30-rnd', original: true}], ['none']),
    },
  },
  ppsh41: {
    label: 'PPSh-41',
    title: 'PPSh-41',
    url: '../assets/models/weapons/ppsh41.glb',
    scale: 0.103763,
    author: DU,
    source: {title: 'low-poly PPSh-41', url: 'https://sketchfab.com/DU1701'},
    specs: [
      ['Overall length', '1,063 mm'],
      ['Cartridge', '7.62×25 mm Tokarev'],
      ['Magazine', '71-round drum'],
    ],
    baseGrams: 3600,
    stats: {ergo: 36, recoil: 70, handling: 48, loud: 80, sighting: 20},
    defaults: {build: {}, finish: {}},
    parts: [part('magazine', 'Drum magazine', '71-round drum.', ['Cylinder.002_2']), EMPTY.optic, EMPTY.sling, EMPTY.muzzle],
    // Where the support hand holds the rifle, in metres from the grip socket (muzzle +x, up +y): operator/operator.js.
    handguardAt: [0.45, 0.02, 0],
    // Clamp-on mount points this source has no socket for, in metres on the laid-out rifle (workbench/universal.js).
    mounts: [
      ['buis', 'Back-up sight', [0.33, 0.087, 0], [0, 1, 0]],
      ['trigger', 'Trigger', [0.045, -0.02, 0], [0, -1, 0]],
      ['charging', 'Charging handle', [-0.03, 0.07, 0.022], [0, 0, 1]],
      ['foregrip', 'Under forend', [0.28, 0.064, 0], [0, -1, 0]],
      ['side', 'Side of forend', [0.3, 0.076, 0.012], [0, 0, 1]],
    ],
    sockets: [
      ['muzzle', 'Muzzle', [-5.008, 0.8934, 0], [-1, 0, 0]],
      ['optic', 'Optic mount', [-1, 0.9535, 0], [0, 1, 0]],
      ['sling', 'Sling mount', [4.95, -0.2, 0], [1, 0, 0]],
      ['magazine', 'Mag well', [-0.98, 0.3, 0], [0, -1, 0]],
      ['grip', 'Grip', [0.3, -0.3, 0], [0, -1, 0]],
    ],
    slots: {
      muzzle: muzzle(
        [{id: 'shroud', grams: 0, label: 'Slotted jacket', detail: 'Perforated barrel shroud, modelled into the barrel.'}],
        ['can'],
      ),
      optic: optic(['micro', 'holo'], rail(-0.04, 0.04)),
      sling: std.sling,
      magazine: magazine([{id: 'drum71', grams: 1000, label: '71-rnd drum', original: true}], ['none']),
    },
  },
  bren: {
    label: 'Bren',
    title: 'Bren Mk 2',
    url: '../assets/models/weapons/bren.glb',
    scale: 0.932484,
    // The source has no textures and one grey for everything: blued steel, a walnut stock and grip (workbench/surface.js).
    surface: {
      base: {name: 'h-190', tex: 'steel', color: '#2c2f31', roughness: 0.5, metalness: 0.6},
      parts: {
        stock: {name: 'polymer', tex: 'wood', color: '#5a3b24', roughness: 0.65, metalness: 0},
        grip: {name: 'polymer', tex: 'wood', color: '#5a3b24', roughness: 0.65, metalness: 0},
        magazine: {name: 'mag', tex: 'steel', color: '#3a3d3a', roughness: 0.55, metalness: 0.5},
      },
    },
    author: {name: 'Sketchfab artist', url: 'https://sketchfab.com'},
    source: {title: 'Bren', url: 'https://sketchfab.com'},
    specs: [
      ['Overall length', '1,150 mm'],
      ['Cartridge', '.303 British'],
      ['Magazine', '30-round top-mounted box'],
    ],
    baseGrams: 10150,
    stats: {ergo: 18, recoil: 42, handling: 16, loud: 96, sighting: 34},
    defaults: {build: {}, finish: {stock: 'wood', grip: 'wood'}},
    parts: [
      part('magazine', 'Magazine', '30-round curved box magazine on top.', ['Cube004', 'Cube005']),
      part('stock', 'Stock', 'Wooden buttstock with cheek piece.', ['Cube019', 'Cube020', 'Cube021']),
      part('grip', 'Pistol grip', 'Pistol grip and trigger guard.', ['Cube008', 'Cube009']),
      EMPTY.optic,
      EMPTY.sling,
      EMPTY.muzzle,
    ],
    // Where the support hand holds the rifle, in metres from the grip socket (muzzle +x, up +y): operator/operator.js.
    handguardAt: [0.39, 0.07, 0],
    // Clamp-on mount points this source has no socket for, in metres on the laid-out rifle (workbench/universal.js).
    mounts: [
      ['buis', 'Back-up sight', [0.3, -0.012, -0.004], [0, 1, 0]],
      ['trigger', 'Trigger', [-0.205, -0.065, -0.004], [0, -1, 0]],
      ['charging', 'Charging handle', [0, -0.03, 0.018], [0, 0, 1]],
      ['foregrip', 'Under forend', [0.25, -0.075, -0.004], [0, -1, 0]],
      ['side', 'Side of forend', [0.28, -0.04, 0.007], [0, 0, 1]],
    ],
    sockets: [
      ['muzzle', 'Muzzle', [0.6093, -0.03155, 0], [1, 0, 0]],
      ['optic', 'Side mount', [-0.28, 0.006129, 0], [0, 1, 0]],
      ['sling', 'Sling mount', [-0.62, -0.08, 0], [-1, 0, 0]],
      ['magazine', 'Mag well', [-0.095, 0.03, 0], [0, 1, 0]],
      ['grip', 'Grip', [-0.27, -0.09, 0], [0, -1, 0]],
      ['stock', 'Stock', [-0.4, -0.06, 0], [-1, 0, 0]],
    ],
    slots: {
      muzzle: muzzle([{id: 'bren', grams: 0, label: 'Flash hider', detail: 'Conical flash hider, modelled into the barrel.'}], ['can']),
      optic: optic(['scope'], rail(-0.04, 0.06)),
      sling: std.sling,
      magazine: magazine([{id: '30', grams: 1200, label: '30-rnd', original: true}], ['none']),
      grip: {factory: [{id: 'factory', grams: 150, label: 'Bren grip', original: true}], library: []},
      stock: {factory: [{id: 'extended', grams: 900, label: 'Bren stock', original: true}], library: []},
    },
  },
  chauchat: {
    label: 'Chauchat',
    title: 'Chauchat M1915 CSRG',
    url: '../assets/models/weapons/chauchat.glb',
    scale: 0.00122306,
    fixed: ['stock'], // one moulding with the grip
    author: {name: 'Sketchfab artist', url: 'https://sketchfab.com'},
    source: {title: 'Chauchat', url: 'https://sketchfab.com'},
    specs: [
      ['Overall length', '1,143 mm'],
      ['Cartridge', '8×50 mm Lebel'],
      ['Magazine', '20-round half-moon'],
    ],
    baseGrams: 9200,
    stats: {ergo: 14, recoil: 38, handling: 12, loud: 94, sighting: 28},
    defaults: {build: {}, finish: {}},
    parts: [
      part('magazine', 'Magazine', '20-round half-moon magazine.', ['Object_24', 'Object_25']),
      part('stock', 'Stock & grip', 'Stock and pistol grip (one moulding in this model).', ['Object_26']),
      EMPTY.optic,
      EMPTY.sling,
      EMPTY.muzzle,
    ],
    // Where the support hand holds the rifle, in metres from the grip socket (muzzle +x, up +y): operator/operator.js.
    handguardAt: [0.37, 0.067, 0],
    // Clamp-on mount points this source has no socket for, in metres on the laid-out rifle (workbench/universal.js).
    mounts: [
      ['buis', 'Back-up sight', [0.3, 0.068, -0.007], [0, 1, 0]],
      ['trigger', 'Trigger', [-0.205, 0.005, -0.007], [0, -1, 0]],
      ['charging', 'Charging handle', [-0.05, 0.04, 0.01], [0, 0, 1]],
      ['foregrip', 'Under forend', [0.26, 0.042, -0.007], [0, -1, 0]],
      ['side', 'Side of forend', [0.28, 0.055, 0.003], [0, 0, 1]],
    ],
    sockets: [
      ['muzzle', 'Muzzle', [468.19, 36.795, 0], [1, 0, 0]],
      ['optic', 'Optic mount', [-20, 66, 0], [0, 1, 0]],
      ['sling', 'Sling mount', [-455, 20, 0], [-1, 0, 0]],
      ['magazine', 'Mag well', [38, 33, 0], [0, -1, 0]],
      ['stock', 'Stock', [-300, 10, 0], [-1, 0, 0]],
      ['grip', 'Grip', [-200, -5, 0], [0, -1, 0]],
    ],
    slots: {
      muzzle: muzzle([{id: 'cone', grams: 0, label: 'Flash cone', detail: 'Flared flash hider, modelled into the barrel.'}], ['can']),
      optic: optic(['scope', 'micro'], rail(-0.06, 0.06)),
      sling: std.sling,
      magazine: magazine([{id: '20', grams: 900, label: '20-rnd', original: true}], ['none']),
      stock: {factory: [{id: 'extended', grams: 1500, label: 'Chauchat stock', original: true}], library: []},
    },
  },
  rpk: {
    label: 'RPK (7.62×39)',
    title: 'RPK 7.62×39',
    url: '../assets/models/weapons/rpk-762.glb',
    scale: 0.103763,
    author: DU,
    source: {title: 'low-poly RPK 7.62x39', url: 'https://sketchfab.com/DU1701'},
    specs: [
      ['Overall length', '1,059 mm'],
      ['Cartridge', '7.62×39 mm'],
      ['Magazine', '40-round curved steel'],
    ],
    baseGrams: 4800,
    stats: {ergo: 32, recoil: 50, handling: 36, loud: 92, sighting: 38},
    defaults: {build: {}, finish: {}},
    parts: [
      part('receiver', 'Receiver & bolt group', 'RPK receiver, dust cover, bolt carrier, gas tube, recoil spring and selector.', [
        'rpk762 selector_2',
        'rpk762 receiver_3',
        'rpk762 rear sight_4',
        'rpk762 mag release_6',
        'rpk762 gas tube_8',
        'rpk762 dust cover_9',
        'ak 76239 bolt carrier_10',
        'rpk 76239 barrel_11',
        'rpk762 recoil spring.001_22',
      ]),
      part('trigger', 'Trigger', 'Trigger and guard.', ['rpk762 trigga_0']),
      part('muzzle', 'Muzzle device', 'Muzzle nut on the heavy barrel.', ['ak 76239 muzzle nut_17']),
      part('handguard', 'Handguard', 'Wooden handguard.', ['rpk762 handguard_7']),
      part('foregrip', 'Bipod', 'Folding bipod on the barrel.', [
        'rpk bipod base_18',
        'rpk bipod axes_19',
        'rpk bipod right leg_20',
        'rpk bipod left leg_21',
      ]),
      part('magazine', 'Magazine', '40-round curved steel magazine.', ['ak 40rnd empty steel mag_15']),
      part('grip', 'Pistol grip', 'Wooden pistol grip.', ['rpk762 pistol grip_5']),
      part('stock', 'Stock', 'Wooden buttstock with steel butt plate.', ['rpk762 stock_1']),
      EMPTY.optic,
      EMPTY.sling,
    ],
    // Where the support hand holds the rifle, in metres from the grip socket (muzzle +x, up +y): operator/operator.js.
    handguardAt: [0.31, 0.06, 0],
    // Clamp-on mount points this source has no socket for, in metres on the laid-out rifle (workbench/universal.js).
    mounts: [
      ['buis', 'Back-up sight', [0.2, 0.121, -0.01], [0, 1, 0]],
      ['charging', 'Charging handle', [-0.03, 0.1, 0.018], [0, 0, 1]],
      ['side', 'Side of forend', [0.33, 0.057, 0.002], [0, 0, 1]],
    ],
    sockets: [
      ['muzzle', 'Muzzle', [6.685, 0.1267, 0], [1, 0, 0]],
      ['optic', 'Optic mount', [-0.2, 0.55, 0], [0, 1, 0]],
      ['sling', 'Sling mount', [-3.4, -0.3, 0], [-1, 0, 0]],
      ['trigger', 'Trigger', [-0.43, -0.3, 0], [0, -1, 0]],
      ['foregrip', 'Bipod mount', [4.7, -0.01892, 0], [0, -1, 0]],
      ['magazine', 'Mag well', [0.4, -0.1, 0], [0, -1, 0]],
      ['grip', 'Grip', [-0.75, -0.17, 0], [0, -1, 0]],
      ['stock', 'Stock', [-1.5, -0.2, 0], [-1, 0, 0]],
    ],
    slots: {
      muzzle: muzzle([{id: 'nut', grams: 40, label: 'Muzzle nut', original: true}], ['comp', 'can', 'bare']),
      optic: optic(['micro', 'holo', 'scope'], rail(-0.05, 0.08)),
      sling: std.sling,
      trigger: std.trigger,
      foregrip: {
        rail: rail(-0.08, 0.02),
        factory: [{id: 'bipod', fp: [-0.05, 0.05], grams: 450, label: 'Bipod', original: true}],
        library: ['vertical', 'angled', 'stop', 'none'],
      },
      magazine: magazine([{id: '40', grams: 360, label: '40-rnd', original: true}], ['drum', 'none']),
      grip: {factory: [{id: 'factory', grams: 110, label: 'Wood grip', original: true}], library: ['classic']},
      stock: {factory: [{id: 'extended', grams: 700, label: 'Wood stock', original: true}], library: ['none']},
    },
  },
};

// The MCX with chunky, dithered bitmap textures over its own colours: a 90s shooter look (workbench/surface.js).
EXTRA['spear-retro'] = {
  ...EXTRA.spear,
  label: 'MCX retro textures',
  title: 'SIG MCX Spear, retro textures',
  surface: {retro: true},
};
