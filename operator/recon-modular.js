// Opt-in clean Recon foundation with removable headwear, articulated gloves and independent fabric colours.
import {pouchSlots} from './pouch-slots.js';
export function modularRecon(weaponSlot) {
  const zone = (id, label, materials, camera = 'torso') => ({
    id,
    label,
    materials,
    camera,
    palette: 'fabric',
    default: 'original',
    preserveTexture: true,
  });
  return {
    id: 'recon-modular',
    label: 'Recon · foundation',
    status: 'available',
    description:
      'Hood-free clothing foundation with a broader chest and neck, articulated gloves, removable face covering/cap and a fitted lightweight plate carrier.',
    model: '../assets/models/operators/recon-modular.glb',
    packs: ['../assets/models/operators/recon-carrier.glb'],
    pouchModel: '../assets/models/operators/recon-pouches.glb',
    pouchPoseProfile: 'reconPouches',
    poseProfile: 'reconFoundation',
    equippedPoseProfile: {slot: 'carrier', options: ['light', 'placard'], profile: 'reconCarrier'},
    // Measured palm targets and upward knuckle direction keep the wrist below the stock.
    grip: {
      palms: {r: [0, 0.078, 0.024], l: [0, 0.078, 0.024]},
      grips: {grip: {at: [-0.028, -0.058, 0], finger: [0.65, 0.76, 0], side: [-0.76, 0.65, 0]}},
    },
    parts: {
      mask: {nodes: ['SK_CM_Mask']},
      cap: {nodes: ['SK_CM_HeadCap']},
      carrier: {
        nodes: [
          'SK_LC_Front',
          'SK_LC_Rear',
          'SK_LC_Shoulder_L',
          'SK_LC_Shoulder_R',
          'SK_LC_Pad_L',
          'SK_LC_Pad_R',
          'SK_LC_Buckle_L',
          'SK_LC_Buckle_R',
          'SK_LC_Cummerbund_L',
          'SK_LC_Cummerbund_R',
        ],
      },
      placard: {nodes: ['SK_LC_Placard']},
    },
    slots: [
      {
        id: 'carrier',
        label: 'Plate carrier',
        camera: 'torso',
        default: 'none',
        options: [
          {id: 'none', label: 'Clean clothing', show: []},
          {id: 'light', label: 'Lightweight carrier', show: ['carrier']},
          {id: 'placard', label: 'Carrier + front placard', show: ['carrier', 'placard']},
        ],
      },
      {
        id: 'mask',
        label: 'Face covering',
        camera: 'head',
        default: 'cloth',
        options: [
          {id: 'none', label: 'Uncovered', show: []},
          {id: 'cloth', label: 'Cloth mask', show: ['mask']},
        ],
      },
      {
        id: 'cap',
        label: 'Headwear',
        camera: 'head',
        default: 'none',
        options: [
          {id: 'none', label: 'Bare head', show: []},
          {id: 'fitted', label: 'Fitted cap', show: ['cap']},
        ],
      },
      weaponSlot,
      ...pouchSlots(),
    ],
    zones: [
      zone('top', 'Clean jacket', ['M_CM_Jacket', 'M_CM_Seams']),
      zone('pants', 'Trousers', ['M_CM_Trousers'], 'legs'),
      zone('headcover', 'Head covering', ['M_CM_HeadCover'], 'head'),
      zone('neck', 'Collar', ['M_CM_Neck'], 'head'),
      zone('gloves', 'Gloves', ['M_CM_Gloves']),
      zone('boots', 'Boots', ['M_GR_boots'], 'legs'),
      zone('carrier', 'Carrier fabric', ['M_CM_Carrier']),
      zone('webbing', 'Carrier webbing', ['M_CM_CarrierWebbing']),
      zone('placard', 'Front placard', ['M_CM_Placard']),
      zone('pouches', 'Pouch fabric', ['M_CM_Pouches']),
      zone('pouchtrim', 'Pouch straps', ['M_CM_PouchTrim']),
    ],
    presets: [
      {id: 'foundation', label: 'Clean clothing', state: {carrier: 'none'}},
      {id: 'light-carrier', label: 'Light carrier', state: {carrier: 'placard'}},
      {
        id: 'patrol-carrier',
        label: 'Patrol carrier',
        state: {carrier: 'placard', front1: 'magazine', front2: 'magazine', front3: 'utility', rear1: 'radio'},
      },
    ],
    defaults: {pose: 'relaxed'},
  };
}
