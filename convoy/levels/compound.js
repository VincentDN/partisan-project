// Level 2: Compound assault. A walled farm compound on a hill; the partisans come out of the forest to the north-west.
// Quiet first (guards and patrols, a local alarm), loud by choice. Steal the armoury cache, optionally cut the radio mast
// (it gates the reinforcements), then everyone leaves the way they came. Metres; x east, z south. Format: levels/index.js.
import {wall, trees} from './util.js';

const BOUNDS = {minX: -100, maxX: 100, minZ: -70, maxZ: 65};
const YARD = {minX: -35, maxX: 35, minZ: -25, maxZ: 25}; // inside the walls
const SPAWN = {x: -4, z: -62};
const EXIT = {x: -4, z: -62, w: 24, d: 10};

const WALLS = [
  wall(-36, -25, 18, -25), // north, with a gap where a drain runs out under the wall behind the armoury (x 18 to 22)
  wall(22, -25, 36, -25),
  wall(-35, -25, -35, 25), // west
  wall(35, -25, 35, 6), // east, with a 6 m breach where the wall has fallen (z 6 to 12)
  wall(35, 12, 35, 25),
  wall(-36, 25, -4, 25), // south, with the gate between x = -4 and 4
  wall(4, 25, 36, 25),
];

const BUILDINGS = [
  {x: -18, z: -13, w: 18, d: 9, h: 3.5, kind: 'building'}, // barracks
  // armoury: three walls round the cache, open to the south
  wall(14, -21, 26, -21, 3, 'building'),
  wall(14, -21, 14, -13, 3, 'building'),
  wall(26, -21, 26, -13, 3, 'building'),
  // towers stand just outside the north-west and south-east corners
  {x: -38, z: -28, w: 4, d: 4, h: 7, kind: 'tower'},
  {x: 38, z: 28, w: 4, d: 4, h: 7, kind: 'tower'},
];

const YARD_COVER = [
  {x: -24, z: 10, w: 6, d: 2.6, h: 2.4, kind: 'truck'},
  {x: -6, z: 12, w: 2, d: 2, h: 1.2, kind: 'crate'},
  {x: -3, z: 12, w: 2, d: 2, h: 1.2, kind: 'crate'},
  {x: 8, z: 15, w: 3, d: 1.6, h: 1.1, kind: 'sandbag'},
  {x: 30, z: 9, w: 1.6, d: 3, h: 1.1, kind: 'sandbag'}, // the machine-gun post by the breach
  {x: 28, z: 14, w: 2, d: 2, h: 1.2, kind: 'crate'},
  {x: 22, z: -6, w: 2.4, d: 2.4, h: 1.6, kind: 'tank'},
  {x: -10, z: 2, w: 2, d: 2, h: 1.2, kind: 'crate'},
  {x: 14, z: 4, w: 2, d: 1.4, h: 1, kind: 'crate'},
];

const OUTSIDE = [
  {x: -44, z: -16, w: 3, d: 3, h: 1.4, kind: 'rock'},
  {x: -50, z: 4, w: 4, d: 2.4, h: 1.2, kind: 'rock'},
  {x: -42, z: 22, w: 2.5, d: 2.5, h: 1.2, kind: 'rock'},
  {x: 44, z: -14, w: 3, d: 2.4, h: 1.3, kind: 'rock'},
  {x: 46, z: 18, w: 2.4, d: 3, h: 1.2, kind: 'rock'},
  {x: -20, z: -33, w: 6, d: 1, h: 1.2, kind: 'wall'}, // a field wall along the north side
  {x: 6, z: -34, w: 5, d: 1, h: 1.2, kind: 'wall'},
  {x: -8, z: 36, w: 4, d: 1, h: 1.2, kind: 'wall'},
];

// Forest to the north and west. Kept clear: the compound and a 14 m field round it, the spawn, and the road.
const nearYard = (x, z, pad) => x > YARD.minX - pad && x < YARD.maxX + pad && z > YARD.minZ - pad && z < YARD.maxZ + pad;
const FOREST = trees({minX: -98, maxX: 98, minZ: -68, maxZ: 22}, 6, 4242, (x, z) => {
  if (nearYard(x, z, 14)) return true;
  if (Math.hypot(x - SPAWN.x, z - SPAWN.z) < 7) return true;
  if (z > 20) return true;
  return x > -30 && z > -12; // keep the east and the middle open: trees thin out toward the south and east
});

export default {
  id: 'compound',
  title: 'Compound assault',
  summary: 'Slip into a walled compound, take the ammunition cache and get out.',
  brief:
    'An army outpost holds a farm compound with an armoury. Your squad comes out of the forest to the north. Take the cache from the armoury (hold E beside it), then get everyone back to the trees. The guards are not expecting you, so patience pays: a body that a patrol finds will bring the compound down on you. The radio mast in the yard calls in a truck of reinforcements; cut it, or silence the radio operator, and nobody comes. The mast takes an RPG or a lot of rifle fire.',
  bounds: BOUNDS,
  night: false,
  ground: {
    color: 0x56643a,
    patches: [
      {x: -40, z: -30, w: 130, d: 80, color: 0x445530}, // forest floor
      {x: 0, z: 0, w: 70, d: 50, color: 0x6b6150}, // the yard
    ],
    roads: [{x: 0, z: 42, w: 220, d: 6, color: 0x5f5b52}],
  },
  avoid: [{x: 0, z: 0, w: 14, d: 14}],
  cover: [...WALLS, ...BUILDINGS, ...YARD_COVER, ...OUTSIDE, ...FOREST],
  targets: [{id: 'mast', label: 'Radio mast', kind: 'mast', x: 2, z: -6, w: 1.2, d: 1.2, h: 10, hp: 150, radio: true}],
  items: [{id: 'cache', label: 'Ammunition cache', x: 20, z: -17, search: 4}],
  alarm: 'local',
  partisans: [
    {id: 'player', x: SPAWN.x, z: SPAWN.z, label: 'Lead rebel'},
    {id: 'mila', x: SPAWN.x - 3, z: SPAWN.z - 2, label: 'Mila'},
    {id: 'dragan', x: SPAWN.x + 2, z: SPAWN.z - 4, label: 'Dragan'},
  ].map(p => ({...p, facing: Math.PI / 2})),
  convoy: null,
  units: [
    // gate
    {name: 'Pvt. Kovac', role: 'rifleman', x: -3, z: 22.5, facing: Math.PI / 2, group: 'gate'},
    {name: 'Pvt. Simic', role: 'rifleman', x: 3, z: 22.5, facing: Math.PI / 2, group: 'gate'},
    // corner towers
    {name: 'Cpl. Tomas', role: 'marksman', x: -40, z: -31, facing: Math.PI, group: 'towers'},
    {name: 'Pvt. Burek', role: 'rifleman', x: 40, z: 31, facing: 0, group: 'towers'},
    // patrols round the yard
    {
      name: 'Pvt. Galic',
      role: 'rifleman',
      x: -8,
      z: -2,
      group: 'patrol',
      patrol: [
        {x: -8, z: -2},
        {x: 10, z: -2},
        {x: 10, z: 16},
        {x: -8, z: 16},
      ],
    },
    {
      name: 'Pvt. Rukavina',
      role: 'rifleman',
      x: 10,
      z: 16,
      group: 'patrol',
      patrol: [
        {x: 10, z: 16},
        {x: -8, z: 16},
        {x: -8, z: -2},
        {x: 10, z: -2},
      ],
    },
    // command and radio
    {name: 'Sgt. Peric', role: 'leader', x: -18, z: -6, facing: Math.PI / 2, group: 'hq'},
    {name: 'Pvt. Jukic', role: 'rto', x: 5, z: -4, facing: 0, group: 'hq'},
    // the machine-gun post by the breach
    {name: 'Pvt. Lenz', role: 'mg', x: 27.5, z: 9, facing: 0, group: 'east'},
    // off duty by the barracks
    {name: 'Pvt. Matic', role: 'rifleman', x: -26, z: -4, facing: 0.3, group: 'barracks'},
    {name: 'Pvt. Vuk', role: 'rifleman', x: -24, z: -2, facing: 2.8, group: 'barracks'},
  ],
  reinforcements: {
    callTime: 5,
    after: 25,
    group: 'qrf',
    goal: {x: 0, z: 10},
    units: [
      {name: 'Sgt. Brkic', role: 'leader', x: 92, z: 42},
      {name: 'Pvt. Ilic', role: 'rifleman', x: 94, z: 40},
      {name: 'Pvt. Zoric', role: 'rifleman', x: 94, z: 44},
      {name: 'Pvt. Hodak', role: 'rifleman', x: 96, z: 42},
      {name: 'Pvt. Krsmanovic', role: 'mg', x: 96, z: 40},
    ],
  },
  objectives: [
    {id: 'cache', type: 'steal', item: 'cache', label: 'Take the ammunition cache from the armoury'},
    {id: 'mast', type: 'destroy', target: 'mast', label: 'Cut the radio mast (stops reinforcements)', optional: true},
    {id: 'exit', type: 'extract', zone: EXIT, carry: ['cache'], after: ['cache'], label: 'Everyone back to the trees'},
  ],
};
