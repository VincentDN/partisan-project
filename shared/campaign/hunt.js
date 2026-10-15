// Hunters and sight on the campaign map (WP-W7). Heat turns the hunter columns out: the raiding party at 20, the
// Orion hunter column at 50. A column out hunts what it knows: the band while it can see it, otherwise the last place
// it was seen (a won fight tells every column where it happened). There it searches for a while, then loses the trail
// and goes home, and the heat cools a little. How far they see: less at night, less in forest, and a big band is
// easier to spot than a small one. The band sees less far in forest too. Pure, no DOM.
import {response} from './response.js';
import {daylight, sightRange} from './daylight.js';
import {logEvent} from './state.js';

/** The hunter columns: the heat that turns each out. Their posts are on the map (map/island.js PARTY_SPOTS). */
export const COLUMNS = {raiders: {heat: 20}, 'orion-hunters': {heat: 50}};
export const SPOT_DAY = 110, // map units a column sees the band by day; at night:
  SPOT_NIGHT = 40;
export const FOREST = 0.55; // in forest a band is seen this much less far, and sees 0.7 as far
export const SEARCH_SECONDS = 5; // map seconds (three campaign hours) a column searches the last-seen point
export const LOST_HEAT = 5; // a trail lost cools the heat this much

/** How far a column sees the band: by daylight, the ground the band is on, and its size (fit fighters). */
export function spotRange(c, {ground = 'plain', size = 8} = {}) {
  const base = SPOT_NIGHT + (SPOT_DAY - SPOT_NIGHT) * daylight(c.world.clock.hour);
  return base * (ground === 'forest' ? FOREST : 1) * Math.min(1.3, Math.max(0.7, Math.sqrt(size / 8)));
}
/** How far the band sees (daylight.js), less from inside a forest. */
export const bandSight = (c, {ground = 'plain'} = {}) => sightRange(c.world.clock.hour) * (ground === 'forest' ? 0.7 : 1);

/** Is this column out (the heat is high enough for it)? */
export const isOut = (c, id) => c.world.heat >= Math.max(5, (COLUMNS[id]?.heat ?? 20) - response(c).heatDiscount);

/** A won fight at `at`: every column now knows where the band was (it hunts there once the heat turns it out). */
export function alert(c, at) {
  if (!Number.isFinite(at?.x) || !Number.isFinite(at?.z)) return;
  for (const id of Object.keys(COLUMNS)) {
    const h = c.world.hunters?.[id];
    if (h) h.seen = {x: at.x, z: at.z};
    else (c.world.hunters ||= {})[id] = {seen: {x: at.x, z: at.z}};
  }
}

/**
 * Where a column out goes: {target: {x, z}, event}. It sees the band within `spot`: after it ('spotted' the moment it
 * finds it); otherwise to where it was last seen, searching there `dt` at a time until it gives up ('lost'); with no
 * lead at all, it waits at `home`.
 */
export function track(c, id, h, band, home, dt, spot) {
  if (band && Math.hypot(band.x - h.x, band.z - h.z) <= spot) {
    const fresh = !h.seen || h.search > 0 || h.lost;
    h.seen = {x: band.x, z: band.z};
    h.search = 0;
    h.lost = false;
    if (fresh) logEvent(c, {kind: 'hunt', source: id});
    return {target: band, event: fresh ? 'spotted' : null};
  }
  if (h.seen) {
    if (Math.hypot(h.seen.x - h.x, h.seen.z - h.z) > 2) return {target: h.seen, event: null};
    h.search = (h.search || 0) + dt;
    if (h.search < SEARCH_SECONDS) return {target: h.seen, event: null};
    h.seen = null;
    h.search = 0;
    h.lost = true;
    c.world.heat = Math.max(0, c.world.heat - LOST_HEAT);
    logEvent(c, {kind: 'hunt-lost', source: id});
    return {target: {x: home[0], z: home[1]}, event: 'lost'};
  }
  return {target: {x: home[0], z: home[1]}, event: null};
}

/** The hunts in a campaign's log, for the harness: {days, hunts, lost, perDay}. */
export function huntMetrics(c) {
  const hunts = c.log.filter(e => e.kind === 'hunt').length,
    lost = c.log.filter(e => e.kind === 'hunt-lost').length,
    days = Math.max(1, c.world.clock.day - 1 + c.world.clock.hour / 24);
  return {days: Math.round(days * 10) / 10, hunts, lost, perDay: Math.round((hunts / days) * 100) / 100};
}
