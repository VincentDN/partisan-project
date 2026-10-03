// Mission objectives: pure rules over the simulation, evaluated a few times a second. A level lists them in
// `objectives`; each has {id, type, label, optional?, after?: [ids]} plus the fields its type needs:
//
//   eliminate {group?, routs?}     every army soldier (of `group`, if given) is down, or fled when `routs`
//   reach     {zone, who?}         'player' (default) or 'squad' (every living partisan) stands in zone {x, z, w, d}
//   destroy   {target}             the vehicle with that id is destroyed
//   steal     {item}               the level item with that id has been taken (hold E next to it)
//   hold      {seconds, from?}     survive that long after 'start' (default) or after the 'alarm'
//   defend    {zone, grace}        fails once army soldiers have stood in zone for `grace` seconds in total (a last line)
//   protect   {units}              the partisans with these ids stay alive (fails the moment one falls; counts as
//                                  met once every other required objective is done)
//   extract   {zone, carry?}       every living partisan stands in zone (usually `after` the main goal); with `carry`, the
//                                  listed items must also be in a living rebel's hands. A casualty drops what he carried.
//
// An objective is 'locked' until everything in `after` is done, then 'active', then 'done' or 'failed'.
// The mission is won when every non-optional objective is done; lost when every rebel is down or a non-optional fails.
import {inBox} from './sim.js';

const squad = sim => sim.units.filter(u => u.side === 'partisan' && u.alive);

export const CHECKS = {
  eliminate: (sim, o) => {
    const army = sim.units.filter(u => u.side === 'army' && (!o.group || u.group === o.group));
    return army.length > 0 && army.every(u => !u.alive || (o.routs && u.escaped)) ? 'done' : 'active';
  },
  reach: (sim, o) => ((o.who === 'squad' ? squad(sim) : [sim.player]).every(u => u.alive && inBox(u.x, u.z, o.zone)) ? 'done' : 'active'),
  destroy: (sim, o) =>
    (sim.vehicles.find(v => v.id === o.target) || sim.targets.find(t => t.id === o.target))?.destroyed ? 'done' : 'active',
  steal: (sim, o) => (sim.taken.has(o.item) ? 'done' : 'active'),
  hold: (sim, o) => {
    const from = o.from === 'alarm' ? sim.alarmAt : 0;
    // orClear: the attack is also broken once every wave has come and no soldier is left standing
    if (o.orClear && sim.wavesDone && !sim.units.some(u => u.side === 'army' && u.alive && !u.escaped)) return 'done';
    return sim.time - from >= o.seconds ? 'done' : 'active';
  },
  defend: (sim, o) => {
    const dt = sim.time - (o.last ?? sim.time);
    o.last = sim.time;
    if (sim.units.some(u => u.side === 'army' && u.alive && inBox(u.x, u.z, o.zone))) o.held = (o.held || 0) + dt;
    return (o.held || 0) >= o.grace ? 'failed' : 'active';
  },
  protect: (sim, o) => (o.units.every(id => sim.units.find(u => u.id === id)?.alive) ? 'active' : 'failed'),
  extract: (sim, o) => {
    const alive = squad(sim);
    const carried = (o.carry || []).every(id => {
      const holder = sim.units.find(u => u.id === sim.items.find(i => i.id === id)?.takenBy);
      return holder?.alive && inBox(holder.x, holder.z, o.zone);
    });
    return alive.length && carried && alive.every(u => inBox(u.x, u.z, o.zone)) ? 'done' : 'active';
  },
};

/** Fresh objective state for a level: copies, with state 'locked' or 'active'. */
export function initObjectives(level) {
  return (level.objectives || []).map(o => ({...o, state: o.after?.length ? 'locked' : 'active', doneAt: null}));
}

/** Update every objective; returns the mission outcome ('won' | 'lost' | null). */
export function evaluate(sim) {
  const byId = Object.fromEntries(sim.objectives.map(o => [o.id, o]));
  for (const o of sim.objectives) {
    if (o.state === 'done' || o.state === 'failed') continue;
    if (o.state === 'locked') {
      if (o.after.every(id => byId[id]?.state === 'done')) o.state = 'active';
      else continue;
    }
    const s = CHECKS[o.type]?.(sim, o) ?? 'active';
    if (s !== 'active') {
      o.state = s;
      o.doneAt = sim.time;
    }
  }
  if (!squad(sim).length) return 'lost';
  const required = sim.objectives.filter(o => !o.optional);
  if (required.some(o => o.state === 'failed')) return 'lost';
  const goals = required.filter(o => o.type !== 'protect' && o.type !== 'defend');
  if (goals.length && goals.every(o => o.state === 'done')) {
    for (const o of sim.objectives)
      if ((o.type === 'protect' || o.type === 'defend') && o.state === 'active') ((o.state = 'done'), (o.doneAt = sim.time));
    return 'won';
  }
  return null;
}
