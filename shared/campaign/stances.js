// What the band can do when it meets the enemy (WP-W8), besides attacking at once or leaving: prepare an ambush (two
// campaign hours digging in, then the fight starts with sandbags in front of every fighter), or, caught by hunters,
// withdraw and leave a rearguard (no mission: the band gets away, the rearguard comes back wounded, the hunters are
// thrown back to their post and rest before they hunt again). Hunters who have caught the band cannot simply be left.
// Pure, no DOM.
import {logEvent} from './state.js';
import {passTime} from './contacts.js';
import {HEAL_WOUNDED} from './encounter.js';

export const PREPARE_HOURS = 2;
export const HUNTER_REST_HOURS = 12;

/**
 * Which choices a contact offers. Hunters on the hunt have caught the band: no leaving, a rearguard instead (hunters
 * waiting at their post can be walked away from). Ambushes can be prepared against convoys and hunters.
 */
export const stancesFor = (kind, {caught = kind === 'hunters'} = {}) => ({
  prepare: kind === 'convoy' || kind === 'hunters',
  rearguard: kind === 'hunters' && caught,
  leave: !(kind === 'hunters' && caught),
});

/** Have these hunters caught the band (are they on the hunt)? */
export const caughtBy = (c, sourceId) => !!c.world.hunters?.[sourceId]?.hunting;

/** Two hours to dig in: the clock moves on (wounds heal) and the fight will start from prepared positions. */
export function prepare(c, e) {
  passTime(c, PREPARE_HOURS);
  e.variant = {...e.variant, prepared: true};
  logEvent(c, {kind: 'prepare', encounter: e.id, source: e.source, hours: PREPARE_HOURS});
  return e;
}

/**
 * Withdraw from hunters, leaving `rearguard` (a fit fighter id) to hold them: the rearguard is wounded, the hunters
 * go back to their post (`home`) and rest HUNTER_REST_HOURS before they hunt again. Returns the rearguard's id.
 */
export function withdrawWithRearguard(c, sourceId, rearguard, home) {
  const f = c.band.fighters[rearguard];
  if (!f) throw new Error(`no fighter ${rearguard}`);
  if (f.wounded) throw new Error(`${rearguard} is wounded and cannot hold the rear`);
  f.wounded = true;
  f.healIn = Math.max(f.healIn || 0, HEAL_WOUNDED);
  const k = c.world.clock;
  const until = k.hour + HUNTER_REST_HOURS;
  (c.world.hunters ||= {})[sourceId] = {
    x: home[0],
    z: home[1],
    hunting: false,
    rest: {day: k.day + Math.floor(until / 24), hour: until % 24},
  };
  logEvent(c, {kind: 'rearguard', source: sourceId, fighter: rearguard});
  return rearguard;
}

/** Are these hunters resting after a rearguard action? */
export function resting(c, sourceId) {
  const r = c.world.hunters?.[sourceId]?.rest;
  if (!r) return false;
  return c.world.clock.day < r.day || (c.world.clock.day === r.day && c.world.clock.hour < r.hour);
}
