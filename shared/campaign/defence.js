// Being hunted, and losing the camp (WP-W11, TAC-K-03). Once the band's heat is high enough, the hunters march on it
// across the map, slower than the band on the move: a band that rests or dawdles is caught. Caught near the camp it
// fights the camp defence (the cave at Oros Camp), elsewhere a defence in the open. An overrun camp is a heavy
// setback, never a game over by itself: half of every stack kept at camp is lost (rounded down, so a single item
// survives in the hidden cache), the band falls back to the nearest friendly settlement, which becomes the camp and is
// rebuilding for three days (no kit screen or trader there meanwhile), the old camp burns, and the heat halves. Pure.
import {logEvent} from './state.js';
import {ownerOf, SOURCES} from './contacts.js';
import {isOut, track} from './hunt.js';

export const HUNT_HEAT = 20; // heat at which the hunters set out after the band
export const HUNT_SPEED = 4.5; // map units a second of campaign time: three quarters of the band's (nav.js BASE_SPEED)
export const HOME_SPEED = 3;
export const CAMP_RANGE = 90; // a fight this near the camp is the camp's defence
export const REBUILD_HOURS = 72;
export const FIRST_CAMP = 'oros-camp';

/** The band's camp: Oros Camp until it is overrun, then the settlement the band fell back to. */
export const campOf = (c, settlements) =>
  settlements.find(s => s.id === (c.world.camp?.id || FIRST_CAMP)) || settlements.find(s => s.id === FIRST_CAMP);

/** Hours until the camp is rebuilt (0: it is ready). */
export function rebuildingFor(c) {
  const r = c.world.camp?.ready;
  if (!r) return 0;
  return Math.max(0, (r.day - c.world.clock.day) * 24 + (r.hour - c.world.clock.hour));
}

/**
 * One step of the hunters (`id`, a hunters contact) for dt seconds of campaign time. Out once the heat is high enough
 * for them (hunt.js): after the band while they see it (within `spot`; unlimited unless given), else to where it was
 * last seen, where they search and may lose it (WP-W7); back to their post when not out. Their place and their lead
 * are kept in the save (world.hunters). Returns {x, z, hunting, heading, event?: 'spotted' | 'lost'} or null when
 * they are gone.
 */
export function pursue(c, id, home, band, dt, {spot = Infinity} = {}) {
  if (c.world.parties.some(p => p.id === id && p.state === 'destroyed')) return null;
  const h = ((c.world.hunters ||= {})[id] ||= {x: home[0], z: home[1]});
  if (!Number.isFinite(h.x) || !Number.isFinite(h.z)) Object.assign(h, {x: home[0], z: home[1]}); // a lead, no place yet
  // thrown back by a rearguard (shared/campaign/stances.js, WP-W8): they rest at their post until h.rest
  const k = c.world.clock,
    rested = !h.rest || k.day > h.rest.day || (k.day === h.rest.day && k.hour >= h.rest.hour);
  const out = isOut(c, id) && !!band && rested;
  const {target, event} = out ? track(c, id, h, band, home, dt, spot) : {target: {x: home[0], z: home[1]}, event: null};
  const hunting = out && !!h.seen;
  const [tx, tz] = [target.x, target.z];
  const dx = tx - h.x,
    dz = tz - h.z,
    d = Math.hypot(dx, dz);
  const step = Math.min(d, (hunting ? HUNT_SPEED : HOME_SPEED) * dt);
  if (d > 0.01) {
    h.x += (dx / d) * step;
    h.z += (dz / d) * step;
  }
  h.hunting = hunting;
  return {x: h.x, z: h.z, hunting, heading: d > 0.01 ? Math.atan2(dx, dz) : null, ...(event ? {event} : {})};
}

/** Was this result a lost defence of the camp? (a hunters fight lost within reach of the camp) */
export function isOverrun(c, e, settlements) {
  if (e.kind !== 'result' || e.outcome !== 'lost' || SOURCES[e.source]?.kind !== 'hunters') return false;
  if (!Number.isFinite(e.at?.x) || !Number.isFinite(e.at?.z)) return false;
  const camp = campOf(c, settlements);
  return !!camp && Math.hypot(e.at.x - camp.x, e.at.z - camp.z) < CAMP_RANGE;
}

/**
 * The camp is overrun (TAC-K-03). Halves every stash stack and troop stack (rounded down), moves the band and its camp
 * to the nearest friendly settlement (Resistance first, else independent), burns the old camp, halves the heat.
 * Returns {from, to, lost: {gear: n}, troops: n lost}.
 */
export function overrun(c, settlements) {
  const from = campOf(c, settlements);
  const lost = {};
  for (const [g, n] of Object.entries(c.stash)) {
    const l = Math.floor(n / 2);
    if (l) {
      c.stash[g] = n - l;
      lost[g] = l;
    }
  }
  let troops = 0;
  for (const t of Object.values(c.band.troops)) {
    const l = Math.floor(t.count / 2);
    if (!l) continue;
    t.xp = (t.xp * (t.count - l)) / t.count;
    t.count -= l;
    troops += l;
  }
  const nearest = list => list.sort((a, b) => Math.hypot(a.x - from.x, a.z - from.z) - Math.hypot(b.x - from.x, b.z - from.z))[0] || null;
  const others = settlements.filter(s => s.id !== from.id);
  const to = nearest(others.filter(s => ownerOf(c, s) === 'resistance')) || nearest(others.filter(s => ownerOf(c, s) === 'neutral'));
  const k = c.world.clock;
  const readyAt = k.hour + REBUILD_HOURS;
  if (to) {
    c.world.camp = {id: to.id, ready: {day: k.day + Math.floor(readyAt / 24), hour: readyAt % 24}};
    c.world.party = {x: to.x + 8, z: to.z + 8};
  }
  // the old camp burns: its smoke and scorch on the map (map/aftermath.js)
  (c.world.aftermath ||= []).push({id: from.id, kind: 'raid', x: from.x, z: from.z, day: k.day, hour: k.hour});
  (c.world.burnt ||= []).includes(from.id) || c.world.burnt.push(from.id);
  c.world.heat = Math.floor(c.world.heat / 2);
  logEvent(c, {kind: 'overrun', from: from.id, to: to?.id || null, lost, troops});
  return {from, to, lost, troops};
}
