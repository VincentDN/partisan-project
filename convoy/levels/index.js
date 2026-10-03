// Partisan Tactical missions. A level is plain data, read by the simulation (convoy/sim.js) and the renderer:
//
//   id, title, summary, brief          what the mission select and briefing show
//   bounds {minX, maxX, minZ, maxZ}    the playable area (metres; x east, z south)
//   ground {color, patches, roads}     flat ground colours for the renderer: rectangles {x, z, w, d, color}
//   avoid  [{x, z, w, d}]              places cover-seeking soldiers would rather not stand (a road, a courtyard)
//   cover  [{x, z, w, d, h, kind}]     boxes that block movement, sight and bullets (rock, wall, wreck, barn, log, ...)
//   partisans [{id, label, x, z, facing, weapons?}]   your squad; weapons default to PARTISAN_LOADOUTS
//   convoy {startX, z, speed, stopX, vehicles} | null   a column driving east that stops at stopX
//   units  [{name, role, x, z, facing, ...}]   army soldiers on foot (guards, patrols; see convoy/ai.js)
//   objectives [...]                   what wins and loses the mission (convoy/objectives.js)
import convoy from './convoy.js';

export const LEVELS = {convoy};
// Mission order in the campaign; levels not built yet are listed so the select can show what is coming.
export const MISSIONS = [
  {id: 'convoy', title: 'Convoy ambush'},
  {id: 'compound', title: 'Compound assault', soon: 'Coming next: a walled compound, stealth then alarm.'},
  {id: 'cave', title: 'Cave hideout defence', soon: 'Coming next: hold the cave until dawn.'},
];
export const DEFAULT_LEVEL = 'convoy';
