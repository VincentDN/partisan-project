// Level 1: Convoy ambush. An army convoy drives east down the valley road; a log roadblock stops it under the
// partisans' ridge. Metres; x runs east, z runs south, the road runs along z = 0. Level format: convoy/levels/index.js.
const BOUNDS = {minX: -64, maxX: 64, minZ: -36, maxZ: 36};
const ROAD = {z: 0, half: 3.2};
const ROADBLOCK = {x: 26, z: 0, w: 1.2, d: 7.5, h: 1.1, kind: 'log'};

// Static cover: centre (x, z), footprint (w along x, d along z), height h. Everything here blocks movement and sight.
const COVER = [
  // north ridge (ambush side): rocks and a broken wall
  {x: -6, z: -14, w: 4, d: 2, h: 1.3, kind: 'rock'},
  {x: 4, z: -12, w: 2.5, d: 2.5, h: 1.2, kind: 'rock'},
  {x: 12, z: -15, w: 6, d: 1, h: 1.4, kind: 'wall'},
  {x: 20, z: -11, w: 2, d: 3, h: 1.2, kind: 'rock'},
  {x: -16, z: -20, w: 3, d: 3, h: 1.6, kind: 'rock'},
  {x: 30, z: -18, w: 5, d: 1, h: 1.4, kind: 'wall'},
  // roadside (both sides): ditches' boulders, culvert, wreck
  {x: -22, z: 6.5, w: 2.5, d: 1.8, h: 1.1, kind: 'rock'},
  {x: -8, z: 7, w: 3.5, d: 1.5, h: 1.1, kind: 'rock'},
  {x: 6, z: 6.8, w: 2, d: 2, h: 1.1, kind: 'rock'},
  {x: 16, z: 7.5, w: 4.5, d: 2, h: 1.6, kind: 'wreck'},
  {x: 34, z: 6.5, w: 2, d: 2, h: 1.1, kind: 'rock'},
  {x: -30, z: -6.5, w: 2, d: 1.5, h: 1, kind: 'rock'},
  {x: 0, z: -6.8, w: 2.5, d: 1.2, h: 1, kind: 'rock'},
  {x: 40, z: -7, w: 2, d: 2, h: 1.1, kind: 'rock'},
  // south fields: stone walls and a barn the army can fall back to
  {x: -12, z: 16, w: 8, d: 1, h: 1.3, kind: 'wall'},
  {x: 10, z: 18, w: 1, d: 8, h: 1.3, kind: 'wall'},
  {x: 26, z: 20, w: 7, d: 5, h: 3.5, kind: 'barn'},
  {x: -36, z: 18, w: 4, d: 4, h: 1.5, kind: 'rock'},
  ROADBLOCK,
];

const PARTISAN_SPAWNS = [
  {id: 'player', x: 6, z: -16, label: 'Lead rebel'},
  {id: 'mila', x: 15, z: -18, label: 'Mila'},
  {id: 'dragan', x: -4, z: -18, label: 'Dragan'},
];

// Vehicles in convoy order (lead first), each with its crew: {name, role} (roles in convoy/weapons.js).
// hp: what an RPG has to chew through. The MRAP's turret gunner stays aboard; everyone else dismounts.
const CONVOY = [
  {
    id: 'lead',
    kind: 'jeep',
    w: 4.2,
    d: 2.2,
    h: 1.6,
    hp: 220,
    gap: 0,
    crew: [
      {name: 'Sgt. Horvat', role: 'leader'},
      {name: 'Pvt. Kos', role: 'rifleman'},
    ],
  },
  {
    id: 'mrap',
    kind: 'mrap',
    w: 6,
    d: 2.7,
    h: 2.8,
    hp: 520,
    armoured: true,
    gap: 12,
    crew: [
      {name: 'Cpl. Vidic', role: 'turret'},
      {name: 'Pvt. Sabo', role: 'marksman'},
      {name: 'Pvt. Radic', role: 'rto'},
    ],
  },
  {
    id: 'truck',
    kind: 'truck',
    w: 7,
    d: 2.6,
    h: 2.8,
    hp: 300,
    gap: 14,
    crew: [
      {name: 'Cpl. Babic', role: 'rifleman'},
      {name: 'Pvt. Lenz', role: 'mg'},
      {name: 'Pvt. Maric', role: 'rifleman'},
      {name: 'Pvt. Ulbrich', role: 'rifleman'},
    ],
  },
  {
    id: 'rear',
    kind: 'jeep',
    w: 4.2,
    d: 2.2,
    h: 1.6,
    hp: 220,
    gap: 13,
    crew: [
      {name: 'Pvt. Juric', role: 'grenadier'},
      {name: 'Pvt. Novak', role: 'rifleman'},
    ],
  },
];
const CONVOY_START_X = -58;
const CONVOY_SPEED = 7; // m/s

export default {
  id: 'convoy',
  title: 'Convoy ambush',
  summary: 'Ambush an army convoy stopped by your roadblock.',
  brief:
    'An army convoy is coming east down the valley road. The log across the road will stop it under your ridge. Wait for it, then open fire. Mila (marksman) and Dragan (machine gun) hold fire until you do. The MRAP’s heavy gun will tear you apart: you carry three RPG rockets for it.',
  bounds: BOUNDS,
  ground: {
    color: 0x56643a,
    patches: [{x: 0, z: -24, w: BOUNDS.maxX - BOUNDS.minX + 60, d: 30, color: 0x4b5733}], // the ridge
    roads: [{x: 0, z: ROAD.z, w: BOUNDS.maxX - BOUNDS.minX + 60, d: ROAD.half * 2}],
  },
  // places a soldier looking for cover would rather not stand (scored down, not forbidden)
  avoid: [{x: 0, z: ROAD.z, w: 1e4, d: ROAD.half * 2}],
  cover: COVER,
  partisans: PARTISAN_SPAWNS.map(p => ({...p, facing: Math.PI / 2})),
  convoy: {startX: CONVOY_START_X, z: ROAD.z, speed: CONVOY_SPEED, stopX: ROADBLOCK.x - ROADBLOCK.w / 2 - 3, vehicles: CONVOY},
  units: [],
  objectives: [
    {id: 'convoy', type: 'eliminate', routs: true, label: 'Destroy or rout the convoy'},
    {id: 'mrap', type: 'destroy', target: 'mrap', label: 'Knock out the MRAP', optional: true},
    {id: 'alive', type: 'protect', units: ['mila', 'dragan'], label: 'Bring Mila and Dragan home', optional: true},
  ],
};
