// Convoys on the map (WP-W6): each sets out from an Invader seat along a road (map/island.js ROADS) to another
// Invader settlement, waits there and drives back, and so on. Arriving, it resupplies that garrison (up to half again
// its size, never above). Ambushed and destroyed, it is gone from the map for two campaign days, then a new one sets
// out from its seat. Its cargo (cargo.js) and escort (contacts.js SOURCES) are on its nameplate. Pure, no DOM.
import {roadLine, byId} from '../../map/island.js';
import {logEvent} from './state.js';
import {ageOf} from './contacts.js';

/** The convoys: the road they drive (from its seat, to where it delivers) and the soldiers each arrival brings. */
export const CONVOYS = {
  'supply-convoy': {from: 'fort-orion', to: 'agia-marina', brings: 8},
  'armoured-column': {from: 'kastro', to: 'fort-orion', brings: 12},
  'fuel-convoy': {from: 'fort-orion', to: 'myrtia', brings: 4},
};
export const CONVOY_ROADS = Object.fromEntries(Object.entries(CONVOYS).map(([id, v]) => [id, [v.from, v.to]]));
export const RESPAWN_HOURS = 48;
export const GARRISON_CAP = 1.5; // a garrison is resupplied to at most this much of its strength at the start
export const CONVOY_SPEED = 9,
  CONVOY_WAIT = 2.5, // map seconds at each end
  CONVOY_GAP = 10; // map units between vehicles

// ---------- roads ----------
const roads = new Map();
/** A convoy's road as a line: {points: [{x, z}], cum: [distance along], total}. */
export function convoyRoad(id) {
  if (!roads.has(id)) {
    const points = roadLine(...CONVOY_ROADS[id]);
    const cum = [0];
    for (let i = 1; i < points.length; i++) cum.push(cum[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z));
    roads.set(id, {points, cum, total: cum.at(-1)});
  }
  return roads.get(id);
}
/** Where along `road` distance `s` is: {x, z, dx, dz} (dx, dz: the road's direction there). */
export function alongRoad(road, s) {
  const {points, cum, total} = road;
  s = Math.max(0, Math.min(total, s));
  const i = Math.max(
    1,
    cum.findIndex(d => d >= s),
  );
  const a = points[i - 1],
    b = points[i],
    k = (s - cum[i - 1]) / (cum[i] - cum[i - 1] || 1),
    len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
  return {x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k, dx: (b.x - a.x) / len, dz: (b.z - a.z) / len};
}
/** A convoy's motion at the start: a third of the way out (the same every time). */
export const freshMotion = road => ({s: road.total * 0.35, dir: 1, wait: 0, speed: CONVOY_SPEED});
/**
 * Drive motion {s, dir, wait, speed} along `road` for dt; a column of `n` vehicles turns round at each end. Returns
 * 'to' or 'from' on the tick it reaches that end of its road, else null.
 */
export function driveConvoy(road, m, n, dt) {
  if (m.wait > 0) {
    m.wait = Math.max(0, m.wait - dt);
    return null;
  }
  m.s += m.dir * m.speed * dt;
  const end = m.dir > 0 ? road.total - 2 : CONVOY_GAP * (n - 1) + 2;
  if ((m.dir > 0 && m.s >= end) || (m.dir < 0 && m.s <= end)) {
    m.s = end;
    m.wait = CONVOY_WAIT;
    m.dir *= -1;
    m.s += m.dir * CONVOY_GAP * (n - 1); // the last vehicle leads back
    return m.dir < 0 ? 'to' : 'from';
  }
  return null;
}
/** Vehicle `i` of a convoy (0 leads): {x, z, heading}. */
export function vehicleAt(road, m, i) {
  const p = alongRoad(road, m.s - m.dir * i * CONVOY_GAP);
  return {x: p.x, z: p.z, heading: Math.atan2(-p.dz * m.dir, p.dx * m.dir)};
}

/** A settlement's garrison now (the save's, once a convoy or a fight has changed it). */
export const garrisonOf = (c, s) => c.world.settlements[s.id]?.garrison ?? s.garrison;

/**
 * Convoy `id` has reached `end` ('to' or 'from'): an Invader-held settlement there takes in its soldiers. Returns
 * {settlement, added, garrison} or null (not held by the Invader, or already full).
 */
export function arrive(c, id, end) {
  const v = CONVOYS[id],
    s = byId(end === 'to' ? v.to : v.from);
  if (!s || (c.world.settlements[s.id]?.owner || s.faction) !== 'invader') return null;
  const now = garrisonOf(c, s),
    cap = Math.round(s.garrison * GARRISON_CAP);
  const added = Math.max(0, Math.min(v.brings, cap - now));
  if (!added) return null;
  c.world.settlements[s.id] = {...c.world.settlements[s.id], garrison: now + added};
  logEvent(c, {kind: 'resupply', source: id, settlement: s.id, added});
  return {settlement: s.id, added, garrison: now + added};
}

/** A destroyed convoy whose time is up sets out again from its seat. Returns true when it did. */
export function respawn(c, id, n) {
  const i = c.world.parties.findIndex(p => p.id === id && p.state === 'destroyed');
  if (i < 0 || ageOf(c, c.world.parties[i]) < RESPAWN_HOURS) return false;
  c.world.parties.splice(i, 1);
  const m = c.world.parties.find(p => p.id === id && p.motion)?.motion;
  if (m) Object.assign(m, {s: CONVOY_GAP * (n - 1) + 2, dir: 1, wait: 0});
  logEvent(c, {kind: 'convoy-out', source: id, from: CONVOYS[id].from});
  return true;
}
