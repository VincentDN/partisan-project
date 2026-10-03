// Generated Recon equipment and colour regions, fitted to the generated character's own skeleton.
const part = name => ({nodes: [`SK_GR_${name}`]});
const parts = {
  harness: part('Harness'),
  scarf: part('Scarf'),
  beltPouch: part('BeltPouch'),
  holster: part('Holster'),
  hipPouch: part('HipPouch'),
  kneeL: part('Knee_L'),
  kneeR: part('Knee_R'),
  utility: part('UtilityPouch'),
  magazines: part('MagPouches'),
  backPouch: part('BackPouch'),
  carabiner: part('Carabiner'),
  radio: {nodes: ['SK_GR_Radio', 'SK_GR_RadioBadge']},
};
const option = (id, label, ...show) => ({id, label, show});
const slot = (id, label, camera, def, options) => ({id, label, camera, default: def, options});
const zone = (id, label, camera = 'torso', palette = 'fabric') => ({
  id,
  label,
  materials: [`M_GR_${id}`],
  camera,
  palette,
  default: 'original',
});
export function generatedRecon(weaponSlot) {
  return {
    id: 'generated-recon',
    label: 'Generated Recon',
    status: 'available',
    model: '../assets/models/operators/generated-recon.glb',
    packs: [],
    poseProfile: 'generatedRecon',
    parts,
    slots: [
      slot('rig', 'Chest equipment', 'torso', 'full', [
        option('light', 'Light', 'harness'),
        option('utility', 'Utility', 'harness', 'utility'),
        option('full', 'Magazine rig', 'harness', 'utility', 'magazines'),
      ]),
      slot('comms', 'Radio', 'torso', 'on', [option('on', 'Radio', 'radio'), option('off', 'None')]),
      slot('scarf', 'Neck wrap', 'head', 'on', [option('on', 'Shemagh', 'scarf'), option('off', 'None')]),
      slot('pack', 'Back equipment', 'torso', 'full', [
        option('off', 'None'),
        option('belt', 'Belt pouch', 'beltPouch'),
        option('full', 'Patrol pouches', 'beltPouch', 'backPouch'),
      ]),
      slot('holsters', 'Thigh equipment', 'legs', 'both', [
        option('none', 'None'),
        option('sidearm', 'Sidearm holster', 'holster'),
        option('utility', 'Utility pouch', 'hipPouch'),
        option('both', 'Both', 'holster', 'hipPouch'),
      ]),
      slot('guards', 'Knee protection', 'legs', 'both', [option('none', 'None'), option('both', 'Knee pads', 'kneeL', 'kneeR')]),
      slot('clip', 'Belt clip', 'torso', 'on', [option('on', 'Carabiner', 'carabiner'), option('off', 'None')]),
      {...weaponSlot, default: 'none'},
    ],
    zones: [
      zone('top', 'Jacket'),
      zone('pants', 'Trousers', 'legs'),
      zone('hood', 'Hood', 'head'),
      zone('scarf', 'Neck wrap', 'head'),
      zone('rig', 'Load carrying gear'),
      zone('gear', 'Hard equipment', 'torso', 'dark'),
      zone('gloves', 'Gloves', 'torso', 'dark'),
      zone('boots', 'Boots', 'legs', 'dark'),
    ],
    presets: [
      {id: 'patrol', label: 'Patrol', state: {}},
      {id: 'scout', label: 'Light scout', state: {rig: 'light', comms: 'off', pack: 'off', holsters: 'none', guards: 'none', clip: 'off'}},
      {
        id: 'night',
        label: 'Night watch',
        state: {'z.top': 'black', 'z.pants': 'black', 'z.hood': 'black', 'z.rig': 'olive', weapon: 'ak74m'},
      },
      {id: 'sand', label: 'Sand patrol', state: {'z.top': 'tan', 'z.pants': 'khaki', 'z.hood': 'tan', 'z.rig': 'brown', weapon: 'ak15k'}},
    ],
    defaults: {pose: 'relaxed', idle: 'calm'},
  };
}
