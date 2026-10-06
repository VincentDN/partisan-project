// Checkpoint assault: an Invader checkpoint where the valley road crosses a stream bed: a barrier, sandbagged firing
// points, a guard hut, a watchtower and a radio mast. The squad comes out of an olive grove to the north-west. Take the
// post (kill or rout the garrison); cut the mast first or a truck of reinforcements comes down the road.
// Metres; x east, z south; the road runs along z = 4. Level format: convoy/levels/index.js.
import {wall, trees} from './util.js';

const BOUNDS = {minX: -80, maxX: 80, minZ: -55, maxZ: 50};
const ROAD = {z: 4, half: 3.2};
const SPAWN = {x: -58, z: -40};
const POST = {minX: -16, maxX: 24, minZ: -14, maxZ: 18};

const COVER = [
  // the barrier across the road and the firing points either side
  {x: 2, z: ROAD.z, w: 1, d: 6.4, h: 1.1, kind: 'log'},
  {x: -6, z: -3, w: 4, d: 1.4, h: 1.2, kind: 'sandbag'},
  {x: 10, z: -3, w: 4, d: 1.4, h: 1.2, kind: 'sandbag'},
  {x: -6, z: 11, w: 4, d: 1.4, h: 1.2, kind: 'sandbag'},
  {x: 12, z: 12, w: 1.4, d: 4, h: 1.2, kind: 'sandbag'},
  // the guard hut, the tower, a parked truck and stores
  {x: 16, z: -9, w: 9, d: 6, h: 3.2, kind: 'building'},
  {x: -12, z: -10, w: 3.5, d: 3.5, h: 6, kind: 'tower'},
  {x: 20, z: 13, w: 6.5, d: 2.6, h: 2.6, kind: 'truck'},
  {x: 6, z: -11, w: 2, d: 2, h: 1.2, kind: 'crate'},
  {x: 8, z: -11.5, w: 2, d: 2, h: 1.2, kind: 'crate'},
  // the dry stream bed's banks, crossing the road under the post
  {x: -26, z: -26, w: 3, d: 2.4, h: 1.2, kind: 'rock'},
  {x: -30, z: -12, w: 2.4, d: 3, h: 1.3, kind: 'rock'},
  {x: -28, z: 16, w: 3, d: 2.4, h: 1.2, kind: 'rock'},
  {x: -32, z: 30, w: 2.4, d: 2, h: 1.1, kind: 'rock'},
  // field walls south of the road, for a flanking crawl
  wall(-40, 26, -18, 26, 1.3),
  wall(30, 28, 52, 28, 1.3),
  {x: 40, z: -24, w: 3, d: 2.6, h: 1.4, kind: 'rock'},
];
const nearPost = (x, z, pad) => x > POST.minX - pad && x < POST.maxX + pad && z > POST.minZ - pad && z < POST.maxZ + pad;
const GROVE = trees({minX: -78, maxX: 10, minZ: -53, maxZ: -16}, 6, 3131, (x, z) => {
  if (nearPost(x, z, 10)) return true;
  if (Math.hypot(x - SPAWN.x, z - SPAWN.z) < 8) return true;
  return COVER.some(c => Math.abs(c.x - x) < c.w / 2 + 2 && Math.abs(c.z - z) < c.d / 2 + 2);
});

export default {
  id: 'checkpoint',
  title: 'Checkpoint assault',
  summary: 'Take a roadside checkpoint: barrier, sandbags, a tower and a radio.',
  brief:
    'The Invader holds the valley road at a checkpoint: a barrier, sandbagged firing points, a guard hut, a watchtower with a marksman and a radio mast. Come out of the olive grove to the north-west and take the post. Kill or rout the garrison. The mast calls a truck of reinforcements down the road from the east; cut it first, or silence the radio operator, and they never come.',
  bounds: BOUNDS,
  ground: {
    color: 0x67683f,
    patches: [
      {x: -40, z: -36, w: 80, d: 40, color: 0x58603a}, // the grove
      {x: -29, z: 2, w: 8, d: 100, color: 0x7a7058}, // the dry stream bed
      {x: 4, z: 2, w: 40, d: 32, color: 0x76705c}, // the post's trodden ground
    ],
    roads: [{x: 0, z: ROAD.z, w: BOUNDS.maxX - BOUNDS.minX + 60, d: ROAD.half * 2, color: 0x6a6252}],
  },
  avoid: [{x: 0, z: ROAD.z, w: 1e4, d: ROAD.half * 2}],
  cover: [...COVER, ...GROVE],
  targets: [{id: 'mast', label: 'Radio mast', kind: 'mast', x: 22, z: -4, w: 1.2, d: 1.2, h: 10, hp: 150, radio: true}],
  alarm: 'local',
  partisans: [
    {id: 'player', x: SPAWN.x, z: SPAWN.z, label: 'Lead rebel'},
    {id: 'mila', x: SPAWN.x - 3, z: SPAWN.z - 3, label: 'Mila'},
    {id: 'dragan', x: SPAWN.x + 3, z: SPAWN.z - 3, label: 'Dragan'},
  ].map(p => ({...p, facing: 0.6})),
  convoy: null,
  units: [
    {name: 'Pvt. Hribar', role: 'rifleman', x: -2, z: 0, facing: Math.PI, group: 'barrier'},
    {name: 'Pvt. Petek', role: 'rifleman', x: -2, z: 8, facing: Math.PI, group: 'barrier'},
    {name: 'Cpl. Zorman', role: 'marksman', x: -12, z: -6.5, facing: Math.PI * 1.15, group: 'tower'},
    {name: 'Pvt. Vidmar', role: 'mg', x: -6, z: -5, facing: Math.PI * 1.25, group: 'sandbags'},
    {name: 'Sgt. Golob', role: 'leader', x: 14, z: -4.5, facing: Math.PI, group: 'hut'},
    {name: 'Pvt. Kovacic', role: 'rto', x: 20, z: -2.5, facing: Math.PI, group: 'hut'},
    {
      name: 'Pvt. Sever',
      role: 'rifleman',
      x: -10,
      z: 16,
      group: 'patrol',
      patrol: [
        {x: -10, z: 16},
        {x: -22, z: 0},
        {x: -10, z: -16},
        {x: 4, z: -16},
        {x: 4, z: 16},
      ],
    },
    {name: 'Pvt. Bergant', role: 'grenadier', x: 18, z: 10, facing: 0.4, group: 'truck'},
  ],
  reinforcements: {
    callTime: 6,
    after: 30,
    group: 'qrf',
    goal: {x: 4, z: 4},
    units: [
      {name: 'Sgt. Pirc', role: 'leader', x: 76, z: 4},
      {name: 'Pvt. Rupnik', role: 'rifleman', x: 78, z: 2},
      {name: 'Pvt. Skok', role: 'rifleman', x: 78, z: 6},
      {name: 'Pvt. Tavcar', role: 'mg', x: 80, z: 4},
    ],
  },
  objectives: [
    {id: 'post', type: 'eliminate', routs: true, label: 'Take the checkpoint: kill or rout the garrison'},
    {id: 'mast', type: 'destroy', target: 'mast', label: 'Cut the radio mast (stops reinforcements)', optional: true},
    {id: 'alive', type: 'protect', units: ['mila', 'dragan'], label: 'Bring Mila and Dragan home', optional: true},
  ],
};
