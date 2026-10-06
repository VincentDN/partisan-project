// Village raid: an Invader-held village round a square: stone houses, a church, garden walls, a supply depot in the
// school. The squad comes over the vineyards from the south-west. Take the depot's supplies and get out the way you
// came; the garrison sleeps in the houses and the square has a machine gun. Metres; x east, z south.
// Level format: convoy/levels/index.js.
import {wall, trees} from './util.js';

const BOUNDS = {minX: -85, maxX: 85, minZ: -60, maxZ: 65};
const SPAWN = {x: -62, z: 50};
const EXIT = {x: -62, z: 52, w: 26, d: 12};
const SQUARE = {x: 4, z: -2, w: 26, d: 20};

const HOUSES = [
  {x: -26, z: -18, w: 12, d: 9, h: 4, kind: 'building'},
  {x: -26, z: 12, w: 11, d: 9, h: 4, kind: 'building'},
  {x: 32, z: -18, w: 12, d: 10, h: 4, kind: 'building'},
  {x: 34, z: 14, w: 10, d: 9, h: 4, kind: 'building'},
  {x: 4, z: -26, w: 16, d: 9, h: 6, kind: 'barn'}, // the church
  // the school: the depot, three walls, open toward the square
  wall(-2, 18, -2, 28, 3.2, 'building'),
  wall(14, 18, 14, 28, 3.2, 'building'),
  wall(-2, 28, 14, 28, 3.2, 'building'),
];
const STREET = [
  // garden walls and lanes between the houses
  wall(-44, -4, -34, -4, 1.4),
  wall(-44, 26, -30, 26, 1.4),
  wall(46, 0, 46, 24, 1.4),
  wall(20, 36, 40, 36, 1.4),
  // in the square: the well, a market stall, the sandbagged machine gun, a parked truck
  {x: 4, z: -2, w: 2.4, d: 2.4, h: 1.2, kind: 'rock'},
  {x: -6, z: 4, w: 3, d: 1.6, h: 1.1, kind: 'crate'},
  {x: 12, z: 6, w: 1.6, d: 4, h: 1.2, kind: 'sandbag'},
  {x: 20, z: -6, w: 6.5, d: 2.6, h: 2.6, kind: 'truck'},
  // the edge of the village toward the vineyards
  {x: -40, z: 38, w: 3, d: 2.4, h: 1.2, kind: 'rock'},
  {x: -16, z: 42, w: 2.4, d: 2, h: 1.1, kind: 'rock'},
  {x: 10, z: 44, w: 4, d: 1.6, h: 1.1, kind: 'crate'},
];
const COVER = [...HOUSES, ...STREET];
// vineyard rows and olive trees to the south-west, the approach
const VINES = trees({minX: -83, maxX: -10, minZ: 30, maxZ: 63}, 5, 909, (x, z) => {
  if (Math.hypot(x - SPAWN.x, z - SPAWN.z) < 9) return true;
  if (Math.abs(x - EXIT.x) < EXIT.w / 2 + 2 && Math.abs(z - EXIT.z) < EXIT.d / 2 + 2) return true;
  return COVER.some(c => Math.abs(c.x - x) < c.w / 2 + 2.5 && Math.abs(c.z - z) < c.d / 2 + 2.5);
});

export default {
  id: 'village',
  title: 'Village raid',
  summary: 'Raid an occupied village: take the depot in the school and get out.',
  brief:
    'The Invader garrisons the village and keeps its supplies in the school on the square. Come in over the vineyards from the south-west, take the supplies from the school (hold E inside it) and bring them back to the vines. Most of the garrison is off duty by the houses; the square has a sandbagged machine gun and a sentry on the church steps. Gunfire wakes the whole village.',
  bounds: BOUNDS,
  ground: {
    color: 0x6a6a44,
    patches: [
      {x: -46, z: 46, w: 80, d: 36, color: 0x5c6238}, // the vineyards
      {x: SQUARE.x, z: SQUARE.z, w: SQUARE.w, d: SQUARE.d, color: 0x8a8070}, // the square's paving
    ],
    roads: [
      {x: 0, z: -2, w: 200, d: 5, color: 0x7a7262},
      {x: 6, z: 20, w: 5, d: 70, color: 0x7a7262},
    ],
  },
  avoid: [{x: SQUARE.x, z: SQUARE.z, w: SQUARE.w, d: SQUARE.d}],
  cover: [...COVER, ...VINES],
  items: [{id: 'supplies', label: 'Depot supplies', x: 6, z: 23, search: 4}],
  alarm: 'global',
  partisans: [
    {id: 'player', x: SPAWN.x, z: SPAWN.z, label: 'Lead rebel'},
    {id: 'mila', x: SPAWN.x - 3, z: SPAWN.z + 2, label: 'Mila'},
    {id: 'dragan', x: SPAWN.x + 3, z: SPAWN.z + 2, label: 'Dragan'},
  ].map(p => ({...p, facing: -0.7})),
  convoy: null,
  units: [
    {name: 'Pvt. Kuhar', role: 'mg', x: 10, z: 6, facing: Math.PI * 0.75, group: 'square'},
    {name: 'Pvt. Lipovec', role: 'rifleman', x: 4, z: -18, facing: Math.PI / 2, group: 'church'},
    {
      name: 'Pvt. Mesar',
      role: 'rifleman',
      x: -14,
      z: 2,
      group: 'patrol',
      patrol: [
        {x: -14, z: 2},
        {x: -14, z: 30},
        {x: 22, z: 30},
        {x: 22, z: 2},
      ],
    },
    // off duty at the houses' doors (the alarm brings them in)
    {name: 'Sgt. Novak', role: 'leader', x: -26, z: -11.5, facing: 0, group: 'house-w'},
    {name: 'Pvt. Oman', role: 'rifleman', x: -23, z: -11.5, facing: 0, group: 'house-w'},
    {name: 'Pvt. Pavlin', role: 'grenadier', x: -26, z: 5.5, facing: 0, group: 'house-sw'},
    {name: 'Cpl. Rebec', role: 'marksman', x: 32, z: -11, facing: Math.PI, group: 'house-e'},
    {name: 'Pvt. Sajovic', role: 'rto', x: 34, z: 7.5, facing: Math.PI, group: 'house-se'},
    {name: 'Pvt. Tomsic', role: 'rifleman', x: 31, z: 7.5, facing: Math.PI, group: 'house-se'},
  ],
  objectives: [
    {id: 'supplies', type: 'steal', item: 'supplies', label: 'Take the supplies from the school'},
    {id: 'exit', type: 'extract', zone: EXIT, carry: ['supplies'], after: ['supplies'], label: 'Everyone back to the vineyards'},
    {id: 'alive', type: 'protect', units: ['mila', 'dragan'], label: 'Bring Mila and Dragan home', optional: true},
  ],
};
