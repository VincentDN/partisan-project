// Convoy Ambush map: pure data, no three.js. Metres; x runs east, z runs south, the road runs along z = 0.
// The convoy drives east; a log roadblock stops it at the ambush site. Partisans start on the north ridge.

export const BOUNDS = {minX: -64, maxX: 64, minZ: -36, maxZ: 36};
export const ROAD = {z: 0, half: 3.2};
export const ROADBLOCK = {x: 26, z: 0, w: 1.2, d: 7.5, h: 1.1, kind: 'log'};

// Static cover: centre (x, z), footprint (w along x, d along z), height h. Everything here blocks movement and sight.
export const COVER = [
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

export const PARTISAN_SPAWNS = [
  {id: 'player', x: 6, z: -16, label: 'You'},
  {id: 'mila', x: 15, z: -18, label: 'Mila'},
  {id: 'dragan', x: -4, z: -18, label: 'Dragan'},
];

// Vehicles in convoy order (lead first), each with its dismounting squad.
export const CONVOY = [
  {id: 'lead', kind: 'jeep', w: 4.2, d: 2.2, h: 1.6, gap: 0, crew: ['Sgt. Horvat', 'Pvt. Kos']},
  {id: 'truck', kind: 'truck', w: 7, d: 2.6, h: 2.8, gap: 14, crew: ['Cpl. Babic', 'Pvt. Lenz', 'Pvt. Maric', 'Pvt. Ulbrich']},
  {id: 'rear', kind: 'jeep', w: 4.2, d: 2.2, h: 1.6, gap: 13, crew: ['Pvt. Juric', 'Pvt. Novak']},
];
export const CONVOY_START_X = -58;
export const CONVOY_SPEED = 7; // m/s
