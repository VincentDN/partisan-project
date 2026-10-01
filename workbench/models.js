// Rifle configurations. Both source models are by D_U on Sketchfab (CC BY 4.0), share one
// coordinate frame and scale, and had their loose rounds and spare magazines stripped
// (model-source/strip-loose-parts.mjs).
//
// parts:   source node names grouped into selectable parts (source spelling; GLTFLoader
//          sanitizes names and the viewer matches them the same way). A node listed in one part
//          is excluded from the others, so a mesh inside a group can be its own part.
// sockets: mount points in source coordinates (muzzle along +x): position and the direction an
//          attachment extends from it.
// defaults: the launch build (slot option ids) and finishes; anything unlisted uses the slot's
//          first option and the original colour. Reset returns here, and the URL hash only
//          records choices that differ from it.
// slots:   per slot, the rifle's factory options (listed first; the first is the default), which
//          library options from attachments.js it accepts (string, or {id,...overrides}), and
//          an optional rail for 10 mm position steps.

// Meters per source unit, shared by both files: the AK-74M model is scaled to its published
// 943 mm overall length, which puts the AK-15K at the same scale.
// Which rail each railed slot rides on. Slots on one rail share space: workbench/rails.js keeps them from overlapping.
export const RAIL_OF = {optic: 'top', buis: 'top', foregrip: 'bottom', side: 'side'};

const SCALE = 0.943 / 9.088;
const AUTHOR = {name: 'D_U', url: 'https://sketchfab.com/DU1701'};

export const MODELS = {
  ak74m: {
    label: 'AK-74M Zenitco',
    title: 'AK-74M Zenitco',
    url: '../assets/models/weapons/ak-74m-zenitco.glb',
    scale: SCALE,
    author: AUTHOR,
    source: {
      title: 'low-poly AK-74M Zenitco',
      url: 'https://sketchfab.com/3d-models/low-poly-ak-74m-zenitco-35ad8e37a513453cbbbd04064fa5fb79',
    },
    specs: [
      ['Overall length (stock extended)', '943 mm'],
      ['Barrel', '415 mm'],
      ['Cartridge', '5.45×39 mm'],
    ],
    // Everything outside the slots: receiver, bolt group, barrel, B-10/B-19 handguard, B-13 mount.
    baseGrams: 2550,
    // Handling baseline before slot modifiers (stats.js); illustrative 0–100 values.
    stats: {ergo: 38, recoil: 58, handling: 52, loud: 88, sighting: 35},
    // Black receiver, tan furniture and magazine, suppressor.
    defaults: {build: {muzzle: 'can'}, finish: {handguard: 'fde', foregrip: 'fde', grip: 'fde', stock: 'fde', magazine: 'fde'}},
    parts: [
      {
        id: 'receiver',
        label: 'Receiver & bolt group',
        detail: 'AK-74M receiver, dust cover, bolt carrier, recoil spring, trigger, selector and magazine release.',
        nodes: [
          'ak74m receiver_8',
          'ak74m dust cover_11',
          'ak74m bolt carrier_10',
          'ak74m recoil spring.001_21',
          'ak74m trigga_0',
          'ak74m selector_1',
          'ak74m mag release_2',
        ],
      },
      {
        id: 'rail',
        label: 'B-13 rail mount',
        detail: 'Zenitco B-13 side-mount bracket with a top rail. It carries the optic.',
        nodes: ['b13 bracket_14'],
      },
      {id: 'optic', label: 'Optic', detail: 'Compact red dot on the B-13 rail.', nodes: ['vzor1 red dot_20']},
      {id: 'buis', label: 'Back-up sight', detail: 'Top-rail position for a folding back-up sight.', nodes: []},
      {id: 'trigger', label: 'Trigger', detail: 'Standard trigger and guard.', nodes: []},
      {id: 'charging', label: 'Charging handle', detail: 'Standard charging handle on the bolt carrier.', nodes: []},
      {id: 'sling', label: 'Sling', detail: 'Rear sling mount.', nodes: []},
      {
        id: 'handguard',
        label: 'B-10 / B-19 handguard',
        detail: 'Zenitco railed handguard with a lower rail that holds the foregrip.',
        nodes: ['b10+b19 handguard_15'],
      },
      {id: 'barrel', label: 'Barrel & gas block', detail: '415 mm barrel with front sight and gas block.', nodes: ['ak74m barrel_9']},
      {id: 'muzzle', label: 'Muzzle device', detail: 'Zenitco DTK-1 muzzle brake on the threaded muzzle.', nodes: ['dtk1 compensator_12']},
      {
        id: 'foregrip',
        label: 'Foregrip',
        detail: 'Zenitco RK-1 vertical foregrip on the lower handguard rail.',
        nodes: ['rk1 front grip_16'],
      },
      {id: 'side', label: 'Side rail', detail: 'Right-side rail on the B-10 handguard.', nodes: []},
      {id: 'magazine', label: 'Magazine', detail: '30-round 5.45×39 polymer magazine.', nodes: ['ak74 30rnd mag (polymer)_6']},
      {id: 'grip', label: 'Pistol grip', detail: 'Zenitco RK-9 pistol grip.', nodes: ['rk9 pistol grip_13']},
      {
        id: 'stock',
        label: 'Stock',
        detail: 'Zenitco PT-1 stock: base, butt pad and adjustable cheek rest.',
        nodes: ['pt1 stock base_17', 'pt1 stock butt_18', 'pt1 cheek_19'],
      },
    ],
    sockets: [
      ['muzzle', 'Muzzle', [4.95, 0.18, 0], [1, 0, 0]],
      ['optic', 'Optic rail', [0.08, 0.69, 0], [0, 1, 0]],
      ['buis', 'Back-up sight rail', [0.95, 0.69, 0], [0, 1, 0]],
      ['rail', 'Top rail', [0.1, 0.62, 0], [0, 1, 0]],
      ['trigger', 'Trigger', [-0.3, -0.1, 0], [0, -1, 0]],
      ['charging', 'Charging handle', [0.55, 0.42, 0.13], [0, 0, 1]],
      ['sling', 'Sling mount', [-1.12, 0.06, 0], [-1, 0, 0]],
      ['foregrip', 'Under rail', [2.5, -0.03, 0], [0, -1, 0]],
      ['side', 'Side rail', [2.4, 0.25, 0.186], [0, 0, 1]],
      ['magazine', 'Mag well', [0.7, -0.2, 0], [0, -1, 0]],
      ['grip', 'Grip', [-0.8, -0.15, 0], [0, -1, 0]],
      ['stock', 'Stock', [-1.2, 0, 0], [-1, 0, 0]],
    ],
    slots: {
      side: {
        rail: {min: -0.08, max: 0.04, step: 0.01},
        factory: [{id: 'none', fp: [0, 0], label: 'None', detail: 'Bare side rail.'}],
        library: ['light', 'laser', 'combo'],
      },
      muzzle: {factory: [{id: 'dtk1', grams: 160, label: 'DTK-1', original: true}], library: ['ak74', 'comp', 'can', 'bare']},
      optic: {
        rail: {min: -0.06, max: 0.04, step: 0.01},
        factory: [{id: 'reddot', fp: [-0.03, 0.03], grams: 210, sightHeight: 0.04, label: 'Red dot', original: true}],
        library: ['micro', 'holo', 'scope', 'none'],
      },
      rail: {
        factory: [{id: 'b13', label: 'B-13 rail', original: true, detail: 'Zenitco B-13 bracket with its top rail.'}],
        library: ['bare'],
      },
      trigger: {factory: [{id: 'std', label: 'Standard', original: true, detail: 'Standard trigger.'}], library: ['match']},
      charging: {factory: [{id: 'std', label: 'Standard', original: true, detail: 'Standard charging handle.'}], library: ['ext']},
      sling: {factory: [{id: 'none', label: 'None', detail: 'No sling fitted.'}], library: ['swivel', 'strap']},
      buis: {
        rail: {min: -0.1, max: 0.12, step: 0.01},
        factory: [{id: 'none', fp: [0, 0], label: 'None', detail: 'No back-up sight.'}],
        library: ['flip'],
      },
      foregrip: {
        rail: {min: -0.08, max: 0, step: 0.01},
        factory: [{id: 'rk1', fp: [-0.02, 0.02], grams: 85, label: 'RK-1', original: true}],
        library: ['vertical', 'angled', 'stop', 'none'],
      },
      magazine: {
        factory: [{id: '30', grams: 230, label: '30-rnd', original: true}],
        library: [{id: '45', label: '45-rnd RPK'}, {id: '60', label: '60-rnd quad'}, {id: 'drum', label: '95-rnd drum'}, 'none'],
      },
      grip: {factory: [{id: 'rk9', grams: 95, label: 'RK-9', original: true}], library: ['classic']},
      stock: {
        factory: [
          {id: 'extended', grams: 430, label: 'Extended', original: true},
          // The butt and cheek rest slide forward along the PT-1 base.
          {
            id: 'collapsed',
            grams: 430,
            label: 'Collapsed',
            original: true,
            detail: 'PT-1 butt slid fully forward on its base.',
            pose: {nodes: {'pt1 stock butt_18': [0.06, 0, 0], 'pt1 cheek_19': [0.06, 0, 0]}},
          },
          // Folds 180° to the left about a hinge 35 mm left of the mount point (negative: swings through the left side).
          {
            id: 'folded',
            grams: 430,
            label: 'Folded',
            original: true,
            detail: 'PT-1 folded along the left side of the receiver.',
            pose: {rotationY: -Math.PI, position: [0, 0, -0.07]},
          },
        ],
        library: ['none'],
      },
    },
  },
  ak15k: {
    label: 'AK-15K',
    title: 'AK-15K',
    url: '../assets/models/weapons/ak-15k.glb',
    scale: SCALE,
    author: AUTHOR,
    source: {title: 'low-poly AK-15 K', url: 'https://sketchfab.com/3d-models/low-poly-ak-15-k-68725380dd654391bb6b751e888e2c44'},
    specs: [
      ['Type', 'Short carbine'],
      ['Cartridge', '7.62×39 mm'],
    ],
    baseGrams: 2350,
    // Short 7.62 carbine: livelier recoil and blast, quicker handling.
    stats: {ergo: 42, recoil: 64, handling: 62, loud: 94, sighting: 35},
    // Same look as the AK-74M: its bare rails get the micro dot and a vertical grip.
    defaults: {
      build: {muzzle: 'can', optic: 'micro', foregrip: 'vertical'},
      finish: {handguard: 'fde', foregrip: 'fde', grip: 'fde', stock: 'fde', magazine: 'fde'},
    },
    parts: [
      {
        id: 'receiver',
        label: 'Receiver & bolt group',
        detail: 'AK-15K receiver, bolt, recoil spring, trigger, selector and magazine release.',
        nodes: [
          'ak15k receiver_4',
          'ak15k bolt_6',
          'ak15k recoil spring.001_15',
          'ak15k trigga_0',
          'ak15k selector_1',
          'ak15k mag release_2',
        ],
      },
      {
        id: 'rail',
        label: 'Receiver cover & rail',
        detail: 'Hinged receiver cover with an integral top rail and rear sight.',
        nodes: ['ak15k receiver cover_7'],
      },
      {id: 'handguard', label: 'Handguard', detail: 'Polymer handguard with a lower rail.', nodes: ['ak15k handguard_8']},
      {
        id: 'barrel',
        label: 'Barrel, gas block & brake',
        detail: 'Short carbine barrel with gas block, front sight and its integral muzzle brake.',
        nodes: ['ak15k barrel_5'],
      },
      {id: 'muzzle', label: 'Muzzle device', detail: 'Factory brake, part of the barrel.', nodes: []},
      {id: 'optic', label: 'Optic', detail: 'Iron sights; the top rail takes an optic.', nodes: []},
      {id: 'buis', label: 'Back-up sight', detail: 'Top-rail position for a folding back-up sight.', nodes: []},
      {id: 'trigger', label: 'Trigger', detail: 'Standard trigger and guard.', nodes: []},
      {id: 'charging', label: 'Charging handle', detail: 'Standard charging handle on the bolt carrier.', nodes: []},
      {id: 'sling', label: 'Sling', detail: 'Rear sling mount.', nodes: []},
      {id: 'foregrip', label: 'Foregrip', detail: 'Clean handguard.', nodes: []},
      {id: 'side', label: 'Side rail', detail: 'Right-side rail on the handguard.', nodes: []},
      {id: 'magazine', label: 'Magazine', detail: '30-round 7.62×39 polymer magazine.', nodes: ['akm 30rnd mag (polymer)_14']},
      // The grip is a mesh inside the receiver node in this file.
      {id: 'grip', label: 'Pistol grip', detail: 'AK-15 polymer pistol grip.', nodes: ['Object_12']},
      {
        id: 'stock',
        label: 'Stock',
        detail: 'Folding, telescoping AK-15 stock: base and butt.',
        nodes: ['ak15k stock base_9', 'ak15k stock butt_10'],
      },
    ],
    sockets: [
      ['muzzle', 'Muzzle', [4.195, 0.18, 0], [1, 0, 0]],
      // 5 mm below the rail top (y .616), like the AK-74M's, so mounts read as clamped on.
      ['optic', 'Optic rail', [0.25, 0.566, 0], [0, 1, 0]],
      ['buis', 'Back-up sight rail', [1.1, 0.566, 0], [0, 1, 0]],
      ['trigger', 'Trigger', [-0.3, -0.12, 0], [0, -1, 0]],
      ['charging', 'Charging handle', [0.55, 0.34, 0.13], [0, 0, 1]],
      ['sling', 'Sling mount', [-1.12, 0.0, 0], [-1, 0, 0]],
      ['foregrip', 'Under rail', [2.2, -0.08, 0], [0, -1, 0]],
      ['side', 'Side rail', [2.3, 0.15, 0.204], [0, 0, 1]],
      ['magazine', 'Mag well', [0.7, -0.2, 0], [0, -1, 0]],
      ['grip', 'Grip', [-0.8, -0.15, 0], [0, -1, 0]],
      ['stock', 'Stock', [-1.2, 0, 0], [-1, 0, 0]],
    ],
    slots: {
      side: {
        rail: {min: -0.08, max: 0.04, step: 0.01},
        factory: [{id: 'none', fp: [0, 0], label: 'None', detail: 'Bare side rail.'}],
        library: ['light', 'laser', 'combo'],
      },
      // The brake is modelled into the barrel, so the factory option leaves the slot empty and a
      // suppressor threads on in front of it.
      muzzle: {
        factory: [{id: 'brake', grams: 0, label: 'Factory brake', detail: 'Factory muzzle brake, modelled into the barrel.'}],
        library: ['can'],
      },
      optic: {
        rail: {min: -0.04, max: 0.06, step: 0.01},
        factory: [
          {id: 'none', sightHeight: 0.025, label: 'Irons', detail: 'Iron sights: rear notch on the receiver cover, post on the gas block.'},
        ],
        library: ['micro', 'holo', 'scope'],
      },
      trigger: {factory: [{id: 'std', label: 'Standard', original: true, detail: 'Standard trigger.'}], library: ['match']},
      charging: {factory: [{id: 'std', label: 'Standard', original: true, detail: 'Standard charging handle.'}], library: ['ext']},
      sling: {factory: [{id: 'none', label: 'None', detail: 'No sling fitted.'}], library: ['swivel', 'strap']},
      buis: {
        rail: {min: -0.1, max: 0.12, step: 0.01},
        factory: [{id: 'none', fp: [0, 0], label: 'None', detail: 'No back-up sight.'}],
        library: ['flip'],
      },
      foregrip: {
        rail: {min: -0.06, max: 0.02, step: 0.01},
        factory: [{id: 'none', label: 'None', detail: 'Clean handguard, no foregrip.'}],
        library: ['vertical', 'angled', 'stop'],
      },
      magazine: {
        factory: [{id: '30', grams: 250, label: '30-rnd', original: true}],
        library: [
          {id: '45', label: '40-rnd RPK', grams: 330, rounds: 40},
          {id: '60', label: '60-rnd quad', grams: 480},
          {id: 'drum', label: '75-rnd drum', grams: 950, rounds: 75},
          'none',
        ],
      },
      grip: {factory: [{id: 'factory', grams: 90, label: 'AK-15', original: true}], library: ['classic']},
      stock: {
        factory: [
          {id: 'extended', grams: 520, label: 'Extended', original: true},
          {
            id: 'collapsed',
            grams: 520,
            label: 'Collapsed',
            original: true,
            detail: 'Butt slid forward on the telescoping base.',
            pose: {nodes: {'ak15k stock butt_10': [0.05, 0, 0]}},
          },
          {
            id: 'folded',
            grams: 520,
            label: 'Folded',
            original: true,
            detail: 'Stock folded along the left side of the receiver.',
            pose: {rotationY: -Math.PI, position: [0, 0, -0.07]},
          },
        ],
        library: ['none'],
      },
    },
  },
};
export const DEFAULT_MODEL = 'ak74m';
