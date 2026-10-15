// The simulation's pure parts (convoy/sim.js): the seeded random generator, geometry, shared constants and level
// thinning. Split out of sim.js (WP-QA17); sim.js re-exports all of it.
import {WEAPONS} from './weapons.js';

/** mulberry32: small seeded PRNG so a run can be replayed exactly. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Entry fraction (0..1) of segment a->b into box b (centre x,z, size w,d, grown by pad), or Infinity. */
export function segmentBox(ax, az, bx, bz, box, pad = 0) {
  const minX = box.x - box.w / 2 - pad,
    maxX = box.x + box.w / 2 + pad,
    minZ = box.z - box.d / 2 - pad,
    maxZ = box.z + box.d / 2 + pad;
  const dx = bx - ax,
    dz = bz - az;
  let t0 = 0,
    t1 = 1;
  // the x slab, then the z slab (unrolled: this runs for every ray against every box near it)
  if (Math.abs(dx) < 1e-9) {
    if (ax < minX || ax > maxX) return Infinity;
  } else {
    let ta = (minX - ax) / dx,
      tb = (maxX - ax) / dx;
    if (ta > tb) [ta, tb] = [tb, ta];
    t0 = Math.max(t0, ta);
    t1 = Math.min(t1, tb);
    if (t0 > t1) return Infinity;
  }
  if (Math.abs(dz) < 1e-9) {
    if (az < minZ || az > maxZ) return Infinity;
  } else {
    let ta = (minZ - az) / dz,
      tb = (maxZ - az) / dz;
    if (ta > tb) [ta, tb] = [tb, ta];
    t0 = Math.max(t0, ta);
    t1 = Math.min(t1, tb);
    if (t0 > t1) return Infinity;
  }
  return t0;
}
export const inBox = (x, z, b, pad = 0) => Math.abs(x - b.x) <= b.w / 2 + pad && Math.abs(z - b.z) <= b.d / 2 + pad;

/** Distance along a unit ray (ox,oz)+(dx,dz)*s to circle (cx,cz,r), or Infinity. */
export function rayCircle(ox, oz, dx, dz, cx, cz, r) {
  const fx = ox - cx,
    fz = oz - cz;
  const b = fx * dx + fz * dz,
    c = fx * fx + fz * fz - r * r;
  const disc = b * b - c;
  if (disc < 0) return Infinity;
  const s = -b - Math.sqrt(disc);
  return s >= 0 ? s : Infinity;
}

/** Does segment a->b pass within r of (cx, cz)? */
export function segmentCircle(ax, az, bx, bz, cx, cz, r) {
  const dx = bx - ax,
    dz = bz - az,
    L = dx * dx + dz * dz;
  const t = L ? Math.max(0, Math.min(1, ((cx - ax) * dx + (cz - az) * dz) / L)) : 0;
  return Math.hypot(ax + dx * t - cx, az + dz * t - cz) < r;
}

export const DAMAGE = 34;
export const MAG = WEAPONS.ak.mag;
export const SPEED = {walk: 3, run: 4.6, sneak: 1.8, sprint: 6.6};
export const GRENADES = 3; // hand grenades each rebel carries (G)
const KEY_ROLES = new Set(['leader', 'rto', 'turret']);

/**
 * A level with only `force` (0..1) of its soldiers: foot soldiers, convoy riders, wave squads and the reaction force.
 * Leaders, radio operators and turret gunners always come; the rest are thinned evenly. The level object is not changed.
 */
export function thinLevel(L, force) {
  if (!(force < 1) || L.settlement || L.counterattack || L.hunters) return L;
  const thin = list => {
    const keepN = Math.max(1, Math.round(list.length * force));
    const key = list.filter(u => KEY_ROLES.has(u.role)).length,
      others = list.length - key,
      spare = Math.max(0, keepN - key);
    let seen = 0;
    return list.filter(u => {
      if (KEY_ROLES.has(u.role)) return true;
      // keep `spare` of the others, spread through the list
      const keep = Math.floor(((seen + 1) * spare) / others) > Math.floor((seen * spare) / others);
      seen++;
      return keep;
    });
  };
  return {
    ...L,
    units: L.units ? thin(L.units) : L.units,
    convoy: L.convoy && {...L.convoy, vehicles: L.convoy.vehicles.map(v => ({...v, crew: thin(v.crew)}))},
    waves: L.waves?.map(w => ({...w, squads: w.squads?.map(q => ({...q, units: thin(q.units)}))})),
    reinforcements: L.reinforcements && {...L.reinforcements, units: thin(L.reinforcements.units)},
  };
}

/** Metres anyone can see, rebels and soldiers alike (role sights and optics are capped to it). */
export const VISION = 30;

export const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

/** Low cover (sandbags, logs): seen and shot over; a body just behind it is harder to hit (sim.lowCover). */
export const isLow = b => b.kind === 'sandbag' || b.kind === 'log';
/** How close behind low cover a body must be for it to shield, and the share of rounds it then stops. */
export const LOW_SHIELD = 2.5,
  LOW_STOP = 0.55;
