// The campaign world in motion (WP-W5): one fixed-step simulation, no renderer, that the map only draws. Each tick
// moves the convoys along their roads (out, a wait, back), the band along its ordered route, the hunters after the
// band or home (defence.js), and the clock (wounds heal). Everything it moves lives in the campaign save, so a
// reload carries on where it was, mid-route included; the same save and the same orders give the same world
// whatever the frame rate. Pure, no DOM.
import {roadLine} from '../../map/island.js';
import {advance} from './nav.js';
import {pursue} from './defence.js';
import {passTime, isGone} from './contacts.js';
import {sightRange} from './daylight.js';

export const STEP = 0.1; // map seconds per tick
export const HOURS_PER_SECOND = 0.6; // campaign hours per map second at speed 1
/** The convoys and the roads they drive (from, to), out and back. */
export const CONVOY_ROADS = {
  'supply-convoy': ['fort-orion', 'agia-marina'],
  'armoured-column': ['kastro', 'fort-orion'],
  'fuel-convoy': ['fort-orion', 'myrtia'],
};
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
/** Drive motion {s, dir, wait, speed} along `road` for dt; a column of `n` vehicles turns round at each end. */
export function driveConvoy(road, m, n, dt) {
  if (m.wait > 0) return void (m.wait = Math.max(0, m.wait - dt));
  m.s += m.dir * m.speed * dt;
  const end = m.dir > 0 ? road.total - 2 : CONVOY_GAP * (n - 1) + 2;
  if ((m.dir > 0 && m.s >= end) || (m.dir < 0 && m.s <= end)) {
    m.s = end;
    m.wait = CONVOY_WAIT;
    m.dir *= -1;
    m.s += m.dir * CONVOY_GAP * (n - 1); // the last vehicle leads back
  }
}
/** Vehicle `i` of a convoy (0 leads): {x, z, heading}. */
export function vehicleAt(road, m, i) {
  const p = alongRoad(road, m.s - m.dir * i * CONVOY_GAP);
  return {x: p.x, z: p.z, heading: Math.atan2(-p.dz * m.dir, p.dx * m.dir)};
}

const validRoute = r =>
  !!r && Array.isArray(r.points) && r.points.every(p => Number.isFinite(p?.x) && Number.isFinite(p?.z)) && Number.isInteger(r.leg);

/**
 * The world of campaign `c`. opts: {nav (the band moves only with one), party (the band's {x, z, route}; default
 * c.world.party), hunters: {id: [home x, z]}, vehicles: {convoy id: vehicle count}}.
 */
export function createWorld(c, {nav = null, party = null, hunters = {}, vehicles = {}} = {}) {
  const band = party || (c.world.party ||= {x: 0, z: 0});
  if (band.route && !validRoute(band.route)) band.route = null;
  /** A convoy's saved motion (made the first time). */
  function motion(id) {
    let e = c.world.parties.find(p => p.id === id && p.motion);
    if (!e) c.world.parties.push((e = {id, motion: freshMotion(convoyRoad(id))}));
    return e.motion;
  }
  for (const id of Object.keys(CONVOY_ROADS)) motion(id);
  let acc = 0;
  /** One fixed step. Returns {healed: [ids], arrived}. */
  function tick(dt) {
    for (const id of Object.keys(CONVOY_ROADS)) if (!isGone(c, id)) driveConvoy(convoyRoad(id), motion(id), vehicles[id] || 3, dt);
    const moving = !!band.route;
    const arrived = moving && nav ? advance(nav, band, dt) : false;
    for (const [id, home] of Object.entries(hunters)) pursue(c, id, home, band, dt);
    return {healed: passTime(c, dt * HOURS_PER_SECOND), arrived};
  }
  /** Run the world for dt map seconds (any frame rate: it moves in whole STEPs). Returns what happened. */
  function step(dt) {
    const out = {healed: [], arrived: false, ticks: 0};
    acc += Math.max(0, dt);
    while (acc >= STEP - 1e-9) {
      acc -= STEP;
      const r = tick(STEP);
      out.healed.push(...r.healed);
      out.arrived ||= r.arrived;
      out.ticks++;
    }
    return out;
  }
  /** Let `hours` of campaign time pass in the world (a rest): everything moves, nothing is skipped. */
  const skip = hours => step(hours / HOURS_PER_SECOND);
  /** Is (x, z) within the band's sight now (night shortens it, WP-W4)? */
  const sees = (x, z) => Math.hypot(x - band.x, z - band.z) <= sightRange(c.world.clock.hour);
  return {
    step,
    skip,
    sees,
    band,
    motion,
    /** Where a convoy's vehicles are now: [{x, z, heading}], or null when it is gone. */
    convoy: id => (isGone(c, id) ? null : Array.from({length: vehicles[id] || 3}, (_, i) => vehicleAt(convoyRoad(id), motion(id), i))),
  };
}
