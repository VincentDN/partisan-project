// Level 3: Cave hideout defence. Your camp in a cave, at night. The army attacks in three waves: rifle squads, then a
// machine-gun team at the mouth with a flanking party through the east tunnel, then an MRAP with a searchlight. Hold until
// dawn (four minutes) or break the attack, and never let them into the fallback chamber. Metres; x east, z south.
import {wall} from './util.js';

const BOUNDS = {minX: -60, maxX: 78, minZ: -42, maxZ: 40};
const CHAMBER = {x: -39, z: 0, w: 16, d: 16};
const T = 2; // wall thickness in the cave

const c = (x1, z1, x2, z2, h = 3.5) => wall(x1, z1, x2, z2, h, 'cave', T);

const CAVE = [
  // main cavern x -8..40, z -12..12
  c(-8, -12, 28, -12), // north, up to the east-tunnel opening (x 28 to 32)
  c(32, -12, 40, -12),
  c(-8, 12, 40, 12), // south
  c(40, -12, 40, -4), // east, with the mouth between z = -4 and 4
  c(40, 4, 40, 12),
  c(-8, -12, -8, -3), // west, with the west tunnel between z = -3 and 3
  c(-8, 3, -8, 12),
  // west tunnel, x -30..-8
  wall(-30, -3.5, -8, -3.5, 3.5, 'cave', 1),
  wall(-30, 3.5, -8, 3.5, 3.5, 'cave', 1),
  // fallback chamber x -47..-31, z -8..8 (door at x = -30, z -3..3)
  c(-47, -8, -30, -8),
  c(-47, 8, -30, 8),
  c(-47, -8, -47, 8),
  c(-30, -8, -30, -3),
  c(-30, 3, -30, 8),
  // east tunnel: north from the cavern to z = -32, then east out onto the hillside
  wall(27.5, -34.5, 27.5, -12, 3.5, 'cave', 1),
  wall(32.5, -29.5, 32.5, -12, 3.5, 'cave', 1),
  wall(27.5, -34.5, 58, -34.5, 3.5, 'cave', 1),
  wall(32.5, -29.5, 58, -29.5, 3.5, 'cave', 1),
];

const INSIDE = [
  {x: 36, z: -6, w: 1.2, d: 3.4, h: 1, kind: 'sandbag'}, // the barricade either side of the mouth
  {x: 36, z: 6, w: 1.2, d: 3.4, h: 1, kind: 'sandbag'},
  {x: 24, z: -7, w: 2, d: 2, h: 1.5, kind: 'rock'}, // stalagmites
  {x: 18, z: 6, w: 2.4, d: 2, h: 1.6, kind: 'rock'},
  {x: 8, z: -4, w: 2, d: 2.4, h: 1.5, kind: 'rock'},
  {x: 2, z: 7, w: 2.6, d: 2, h: 1.4, kind: 'rock'},
  {x: 30, z: 8, w: 2, d: 1.6, h: 1.2, kind: 'crate'},
  {x: 12, z: -9, w: 2, d: 1.6, h: 1.2, kind: 'crate'},
  {x: -36, z: -5, w: 2, d: 2, h: 1.2, kind: 'crate'}, // supplies in the chamber
  {x: -36, z: 5, w: 2, d: 2, h: 1.2, kind: 'crate'},
  {x: -19, z: 0, w: 1.2, d: 1.2, h: 1, kind: 'crate'},
];

const OUTSIDE = [
  {x: 48, z: -9, w: 4, d: 3, h: 1.5, kind: 'rock'},
  {x: 52, z: 9, w: 3, d: 3, h: 1.4, kind: 'rock'},
  {x: 60, z: -14, w: 3, d: 2.6, h: 1.4, kind: 'rock'},
  {x: 62, z: 14, w: 4, d: 3, h: 1.5, kind: 'rock'},
  {x: 70, z: -6, w: 2.6, d: 2.6, h: 1.3, kind: 'rock'},
  {x: 46, z: 24, w: 5, d: 3, h: 1.6, kind: 'rock'},
  {x: 64, z: 28, w: 3, d: 3, h: 1.4, kind: 'rock'},
  {x: 56, z: -24, w: 3, d: 3, h: 1.4, kind: 'rock'},
];

const rifle = (name, x, z, role = 'rifleman') => ({name, role, x, z, facing: Math.PI});

export default {
  id: 'cave',
  title: 'Cave hideout defence',
  summary: 'Hold the cave until dawn against three waves.',
  brief:
    'The army has found your cave. It is night, and they come at first light of the attack, not of day: you have forty seconds before the first squad. Spend them: press Space to pause and give orders, and put Dragan behind the barricade where the machine gun covers the mouth. Wave one is a rifle squad up the slope. Wave two sets up a machine gun at the mouth and sends a party through the east tunnel behind you. Wave three is an MRAP with a searchlight and a heavy gun; keep your RPG for it. Hold until dawn, in four minutes, or break the attack. If they reach the fallback chamber at the end of the west tunnel, it is over.',
  bounds: BOUNDS,
  night: true,
  sight: 0.7, // the army sees less in the dark
  alarm: 'global',
  ground: {
    color: 0x2c3328,
    patches: [
      {x: 0, z: 0, w: 52, d: 26, color: 0x3a372f}, // cavern floor
      {x: -22, z: 0, w: 30, d: 6, color: 0x3a372f},
      {x: -39, z: 0, w: 18, d: 18, color: 0x403c33},
      {x: 30, z: -22, w: 6, d: 22, color: 0x3a372f},
      {x: 44, z: -32, w: 30, d: 6, color: 0x3a372f},
    ],
    roads: [{x: 58, z: 0, w: 40, d: 7, color: 0x4a463c}],
  },
  avoid: [],
  cover: [...CAVE, ...INSIDE, ...OUTSIDE],
  partisans: [
    {id: 'player', x: 28, z: 3, label: 'Lead rebel', facing: 0},
    {id: 'mila', x: 34, z: -8, label: 'Mila', facing: 0},
    {id: 'dragan', x: 22, z: -2, label: 'Dragan', facing: 0},
  ],
  convoy: null,
  units: [],
  lights: [
    {x: 30, z: 0},
    {x: 8, z: 0},
    {x: -18, z: 0, intensity: 160},
    {x: -39, z: 0},
    {x: 30, z: -20, intensity: 140},
  ],
  prep: 40, // seconds before the first wave
  waves: [
    {
      at: 40,
      text: 'Contact! Squad coming up the slope!',
      squads: [
        {
          group: 'w1',
          goal: {x: 34, z: 0},
          units: [
            rifle('Sgt. Marin', 74, -2, 'leader'),
            rifle('Pvt. Dugan', 75, -4),
            rifle('Pvt. Fabek', 76, 0),
            rifle('Pvt. Gorec', 74, 2),
            rifle('Pvt. Hlebec', 76, 4),
            rifle('Pvt. Ivan', 77, -2),
          ],
        },
      ],
    },
    {
      at: 105,
      text: 'Machine gun at the mouth! Others are going round!',
      squads: [
        {
          group: 'w2mg',
          goal: {x: 46, z: 0},
          units: [rifle('Cpl. Jelic', 74, -1, 'mg'), rifle('Pvt. Kalan', 75, 1, 'mg'), rifle('Pvt. Lukic', 76, 0)],
        },
        {
          group: 'w2flank',
          goal: null,
          units: ['Sgt. Mandic', 'Pvt. Novosel', 'Pvt. Oreskovic', 'Pvt. Pavlic'].map((name, i) => ({
            name,
            role: i === 0 ? 'leader' : i === 3 ? 'grenadier' : 'rifleman',
            x: 66 + i,
            z: -32,
            facing: Math.PI,
            state: 'flank',
            path: [
              {x: 33, z: -32},
              {x: 30, z: -28},
              {x: 30, z: -14},
              {x: 28 + i * 2, z: -8},
            ],
          })),
        },
      ],
    },
    {
      at: 175,
      text: 'Headlights! That is an MRAP!',
      squads: [
        {
          group: 'w3',
          goal: {x: 36, z: 0},
          units: [
            rifle('Cpl. Radan', 74, -3, 'leader'),
            rifle('Pvt. Sertic', 75, 3),
            rifle('Pvt. Tuma', 76, -1),
            rifle('Pvt. Uzelac', 77, 2),
          ],
        },
      ],
      vehicle: {
        id: 'mrap',
        kind: 'mrap',
        w: 6,
        d: 2.7,
        h: 2.8,
        hp: 520,
        armoured: true,
        searchlight: true,
        x: 60,
        z: 0,
        crew: [
          {name: 'Cpl. Vidic', role: 'turret'},
          {name: 'Pvt. Sabo', role: 'marksman'},
          {name: 'Pvt. Radic', role: 'rto'},
        ],
      },
    },
  ],
  objectives: [
    {id: 'dawn', type: 'hold', seconds: 240, orClear: true, label: 'Hold the cave until dawn (or break the attack)'},
    {id: 'chamber', type: 'defend', zone: CHAMBER, grace: 6, label: 'Keep the army out of the fallback chamber'},
    {id: 'mrap', type: 'destroy', target: 'mrap', label: 'Knock out the MRAP', optional: true},
  ],
};
