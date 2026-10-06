// Opt-in clean Recon foundation with removable headwear, articulated gloves and independent fabric colours.
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
    description: 'Hood-free clothing foundation with a broader chest and neck, articulated gloves and removable face covering and cap.',
    model: '../assets/models/operators/recon-modular.glb',
    packs: [],
    poseProfile: 'reconFoundation',
    // Measured palm targets and upward knuckle direction keep the wrist below the stock.
    grip: {
      palms: {r: [0, 0.078, 0.024], l: [0, 0.078, 0.024]},
      grips: {grip: {at: [-0.028, -0.058, 0], finger: [0.65, 0.76, 0], side: [-0.76, 0.65, 0]}},
    },
    parts: {mask: {nodes: ['SK_CM_Mask']}, cap: {nodes: ['SK_CM_HeadCap']}},
    slots: [
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
    ],
    zones: [
      zone('top', 'Clean jacket', ['M_CM_Jacket', 'M_CM_Seams']),
      zone('pants', 'Trousers', ['M_CM_Trousers'], 'legs'),
      zone('headcover', 'Head covering', ['M_CM_HeadCover'], 'head'),
      zone('neck', 'Collar', ['M_CM_Neck'], 'head'),
      zone('gloves', 'Gloves', ['M_CM_Gloves']),
      zone('boots', 'Boots', ['M_GR_boots'], 'legs'),
    ],
    presets: [{id: 'foundation', label: 'Clean clothing', state: {}}],
    defaults: {pose: 'relaxed'},
  };
}
