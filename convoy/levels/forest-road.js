// Forest road ambush: a convoy on a road through pine forest, stopped by a felled tree. Close range: the trees hide
// the ambush until the shooting starts and hide the dismounted crews afterwards. No MRAP, but an extra truck of
// riflemen. Metres; x runs east, z runs south, the road runs along z = 0. Level format: convoy/levels/index.js.
import {trees} from './util.js';

const BOUNDS = {minX: -70, maxX: 70, minZ: -40, maxZ: 40};
const ROAD = {z: 0, half: 3};
const FELLED = {x: 30, z: 0, w: 1.4, d: 8, h: 1.2, kind: 'log'};
const SPAWN = {x: 10, z: -20};

const COVER = [
  FELLED,
  // the ambush line: a fallen trunk and rocks along the north verge
  {x: 2, z: -9, w: 7, d: 1.2, h: 1.1, kind: 'log'},
  {x: 16, z: -10, w: 2.4, d: 2, h: 1.2, kind: 'rock'},
  {x: 24, z: -12, w: 5, d: 1.2, h: 1.1, kind: 'log'},
  {x: -10, z: -11, w: 2.4, d: 2.2, h: 1.3, kind: 'rock'},
  // the south verge: a ditch's boulders and a woodcutter's stack
  {x: -18, z: 7, w: 2.4, d: 1.8, h: 1.1, kind: 'rock'},
  {x: 6, z: 8, w: 6, d: 1.6, h: 1.4, kind: 'log'},
  {x: 22, z: 7.5, w: 2, d: 2, h: 1.1, kind: 'rock'},
  {x: 38, z: 9, w: 4, d: 3, h: 2.2, kind: 'crate'},
];
// pines on both sides, clear of the road, the ambush line and the spawn
const FOREST = trees({minX: -68, maxX: 68, minZ: -38, maxZ: 38}, 5.5, 777, (x, z) => {
  if (Math.abs(z) < ROAD.half + 3) return true;
  if (Math.hypot(x - SPAWN.x, z - SPAWN.z) < 8) return true;
  if (z < -6 && z > -15 && x > -14 && x < 30) return true; // the ambush line
  return COVER.some(c => Math.abs(c.x - x) < c.w / 2 + 2 && Math.abs(c.z - z) < c.d / 2 + 2);
});

const crew = (...list) => list.map(([name, role]) => ({name, role}));
const CONVOY = [
  {id: 'lead', kind: 'jeep', w: 4.2, d: 2.2, h: 1.6, hp: 220, gap: 0, crew: crew(['Sgt. Zupan', 'leader'], ['Pvt. Oblak', 'rifleman'])},
  {
    id: 'truck',
    kind: 'truck',
    w: 7,
    d: 2.6,
    h: 2.8,
    hp: 300,
    gap: 12,
    crew: crew(['Cpl. Mlakar', 'rifleman'], ['Pvt. Turk', 'mg'], ['Pvt. Bizjak', 'rifleman'], ['Pvt. Kos', 'grenadier']),
  },
  {
    id: 'truck2',
    kind: 'truck',
    w: 7,
    d: 2.6,
    h: 2.8,
    hp: 300,
    gap: 14,
    crew: crew(['Cpl. Rozman', 'rto'], ['Pvt. Leban', 'rifleman'], ['Pvt. Furlan', 'marksman']),
  },
  {id: 'rear', kind: 'jeep', w: 4.2, d: 2.2, h: 1.6, hp: 220, gap: 13, crew: crew(['Pvt. Kralj', 'rifleman'], ['Pvt. Medved', 'rifleman'])},
];

export default {
  id: 'forest-road',
  title: 'Forest road ambush',
  summary: 'Stop a convoy with a felled tree and fight it out among the pines.',
  brief:
    'A supply convoy is taking the forest road. A pine felled across it will stop the column right under your ambush line. There is no armour this time, but two trucks of riflemen, and in the trees they will be on top of you before you see them. Wait for the stop, open fire together, and do not let the radio operator in the second truck call it in.',
  bounds: BOUNDS,
  ground: {
    color: 0x3f5230,
    patches: [
      {x: -30, z: -25, w: 70, d: 24, color: 0x36472b},
      {x: 35, z: 25, w: 70, d: 24, color: 0x36472b},
    ],
    roads: [{x: 0, z: ROAD.z, w: BOUNDS.maxX - BOUNDS.minX + 60, d: ROAD.half * 2, color: 0x5a5244}],
  },
  avoid: [{x: 0, z: ROAD.z, w: 1e4, d: ROAD.half * 2}],
  cover: [...COVER, ...FOREST],
  partisans: [
    {id: 'player', x: SPAWN.x, z: SPAWN.z, label: 'Lead rebel'},
    {id: 'mila', x: SPAWN.x + 8, z: SPAWN.z + 1, label: 'Mila'},
    {id: 'dragan', x: SPAWN.x - 8, z: SPAWN.z + 1, label: 'Dragan'},
  ].map(p => ({...p, facing: Math.PI / 2})),
  convoy: {startX: -64, z: ROAD.z, speed: 6, stopX: FELLED.x - FELLED.w / 2 - 3, vehicles: CONVOY},
  units: [],
  objectives: [
    {id: 'convoy', type: 'eliminate', routs: true, label: 'Destroy or rout the convoy'},
    {id: 'alive', type: 'protect', units: ['mila', 'dragan'], label: 'Bring Mila and Dragan home', optional: true},
  ],
};
