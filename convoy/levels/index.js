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
//   targets [{id, label, kind, x, z, w, d, h, hp, radio?}]   destructible structures (the radio mast)
//   items  [{id, label, x, z, search}] things to steal (hold E)    alarm 'global' | 'local'    reinforcements {...}
//   waves  [{at, text, squads: [{group, goal, units}], vehicle?}]   scheduled attacks      night, sight    darkness
//   objectives [...]                   what wins and loses the mission (convoy/objectives.js)
import convoy from './convoy.js';
import compound from './compound.js';
import cave from './cave.js';

export const LEVELS = {convoy, compound, cave};
// Mission order in the campaign; levels not built yet are listed so the select can show what is coming.
export const MISSIONS = [
  {id: 'convoy', title: 'Convoy ambush'},
  {id: 'compound', title: 'Compound assault'},
  {id: 'cave', title: 'Cave hideout defence'},
];
export const DEFAULT_LEVEL = 'convoy';
