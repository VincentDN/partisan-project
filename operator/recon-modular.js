// Opt-in clean Recon clothing foundation; equipment assemblies and articulated head/hands follow in later milestones.
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
      'Hood-free clothing foundation with a broader chest and neck, no vest, harness or bags. The face covering and fixed-finger gloves remain temporary.',
    model: '../assets/models/operators/recon-modular.glb',
    packs: [],
    poseProfile: 'reconFoundation',
    // These long source gloves need an upward knuckle direction to keep the wrist below the stock.
    grip: {
      palms: {r: [-0.015, 0.145, 0.04], l: [0.015, 0.145, 0.04]},
      grips: {grip: {at: [-0.028, -0.058, 0], finger: [0.65, 0.76, 0], side: [-0.76, 0.65, 0]}},
    },
    parts: {},
    slots: [weaponSlot],
    zones: [
      zone('top', 'Clean jacket', ['M_CM_Jacket', 'M_CM_Seams']),
      zone('pants', 'Trousers', ['M_CM_Trousers'], 'legs'),
      zone('headcover', 'Head covering', ['M_CM_HeadCover'], 'head'),
      zone('neck', 'Collar', ['M_CM_Neck'], 'head'),
      zone('gloves', 'Gloves', ['M_GR_gloves']),
      zone('boots', 'Boots', ['M_GR_boots'], 'legs'),
    ],
    presets: [{id: 'foundation', label: 'Clean clothing', state: {}}],
    defaults: {pose: 'relaxed'},
  };
}
