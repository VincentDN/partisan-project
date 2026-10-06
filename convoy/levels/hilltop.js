// Hilltop defence: hunters catch the band in the open, away from its cave. A bare hilltop with a ring of rocks, a
// ruined shepherd's hut and stone walls; the attack comes up three slopes in waves. Hold until the hunters give up, or
// break them. Daylight, unlike the cave: they see you coming too. Metres; x east, z south.
// Level format: convoy/levels/index.js.
import {wall, trees} from './util.js';

const BOUNDS = {minX: -75, maxX: 75, minZ: -60, maxZ: 60};
const TOP = {x: 0, z: 0, r: 14};
const HUT = {minX: -4, maxX: 4, minZ: -3, maxZ: 3};

const RING = [
  {x: -12, z: -6, w: 3, d: 2.4, h: 1.3, kind: 'rock'},
  {x: -8, z: 10, w: 2.6, d: 2.6, h: 1.2, kind: 'rock'},
  {x: 10, z: 9, w: 3, d: 2, h: 1.3, kind: 'rock'},
  {x: 13, z: -5, w: 2.4, d: 3, h: 1.2, kind: 'rock'},
  {x: 1, z: -14, w: 4, d: 1.6, h: 1.1, kind: 'rock'},
  {x: 0, z: 15, w: 3.5, d: 1.6, h: 1.1, kind: 'rock'},
  // the shepherd's hut: three walls, open to the south
  wall(HUT.minX, HUT.minZ, HUT.maxX, HUT.minZ, 2, 'wall'),
  wall(HUT.minX, HUT.minZ, HUT.minX, HUT.maxZ, 2, 'wall'),
  wall(HUT.maxX, HUT.minZ, HUT.maxX, HUT.maxZ, 2, 'wall'),
];
const SLOPES = [
  // terraces' stone walls down the slopes: cover for the attackers as much as for you
  wall(-40, -20, -26, -20, 1.2),
  wall(26, -24, 42, -24, 1.2),
  wall(-34, 26, -20, 26, 1.2),
  wall(22, 30, 36, 30, 1.2),
  {x: -44, z: 6, w: 3, d: 2.4, h: 1.3, kind: 'rock'},
  {x: 46, z: 4, w: 2.4, d: 3, h: 1.3, kind: 'rock'},
  {x: 4, z: 40, w: 3, d: 2.4, h: 1.2, kind: 'rock'},
];
// scattered pines low on the slopes; the top stays bare
const PINES = trees({minX: -73, maxX: 73, minZ: -58, maxZ: 58}, 9, 5150, (x, z) => {
  if (Math.hypot(x - TOP.x, z - TOP.z) < 34) return true;
  if (Math.abs(x) > 62 || Math.abs(z) > 48) return true; // the slopes' feet, where the waves arrive
  return [...RING, ...SLOPES].some(c => Math.abs(c.x - x) < c.w / 2 + 2 && Math.abs(c.z - z) < c.d / 2 + 2);
});

const rifle = (name, x, z, role = 'rifleman') => ({name, role, x, z, facing: 0});

export default {
  id: 'hilltop',
  title: 'Hilltop defence',
  summary: 'Caught in the open: hold a bare hilltop against three waves of hunters.',
  brief:
    'The hunters caught the band on the march. Get to the rocks on the hilltop: you have thirty seconds before the first squad comes up the west slope. Then a squad from the east and a machine gun to the south, then a last push from every side. Hold for three minutes and they give up the chase, or break every wave. Pause with Space and give orders: the shepherd’s hut is the best place for the machine gun.',
  bounds: BOUNDS,
  ground: {
    color: 0x6c6a48,
    patches: [
      {x: 0, z: 0, w: 46, d: 40, color: 0x7d7756}, // the bare top
      {x: 0, z: 0, w: 22, d: 18, color: 0x857e62},
    ],
    roads: [{x: -50, z: 44, w: 60, d: 4, color: 0x7a7262}], // a goat track
  },
  avoid: [],
  cover: [...RING, ...SLOPES, ...PINES],
  alarm: 'global',
  partisans: [
    {id: 'player', x: -2, z: 6, label: 'Lead rebel'},
    {id: 'mila', x: 4, z: 7, label: 'Mila'},
    {id: 'dragan', x: 0, z: 1, label: 'Dragan'},
  ].map(p => ({...p, facing: 0})),
  convoy: null,
  units: [],
  prep: 30,
  waves: [
    {
      at: 30,
      text: 'Contact west! Squad coming up the slope!',
      squads: [
        {
          group: 'w1',
          goal: {x: -6, z: 0},
          units: [
            rifle('Sgt. Arh', -70, -6, 'leader'),
            rifle('Pvt. Bole', -71, -2),
            rifle('Pvt. Cernic', -70, 2),
            rifle('Pvt. Dovjak', -72, 6, 'grenadier'),
            rifle('Pvt. Ermenc', -69, -10),
          ],
        },
      ],
    },
    {
      at: 85,
      text: 'East slope! And a gun to the south!',
      squads: [
        {
          group: 'w2e',
          goal: {x: 8, z: 0},
          units: [
            rifle('Cpl. Fajdiga', 70, -4, 'leader'),
            rifle('Pvt. Gabrovec', 71, 0),
            rifle('Pvt. Hocevar', 70, 4),
            rifle('Pvt. Ivancic', 72, -8),
          ],
        },
        {
          group: 'w2s',
          goal: {x: 0, z: 22},
          units: [rifle('Pvt. Jamnik', -2, 56, 'mg'), rifle('Pvt. Kastelic', 2, 57, 'mg'), rifle('Pvt. Lampret', 0, 55, 'marksman')],
        },
      ],
    },
    {
      at: 140,
      text: 'They are coming from everywhere!',
      squads: [
        {
          group: 'w3n',
          goal: {x: 0, z: -6},
          units: [rifle('Sgt. Mrak', -2, -56, 'leader'), rifle('Pvt. Nagode', 2, -57), rifle('Pvt. Ocvirk', 0, -55, 'grenadier')],
        },
        {
          group: 'w3w',
          goal: {x: -8, z: 4},
          units: [rifle('Pvt. Pecar', -70, 10), rifle('Pvt. Ravnik', -71, 14), rifle('Pvt. Strnad', -70, 18, 'rto')],
        },
      ],
    },
  ],
  objectives: [
    {id: 'hold', type: 'hold', seconds: 180, orClear: true, label: 'Hold the hilltop for three minutes (or break the attack)'},
    {id: 'alive', type: 'protect', units: ['mila', 'dragan'], label: 'Bring Mila and Dragan home', optional: true},
  ],
};
