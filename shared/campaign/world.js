// The campaign world in motion (WP-W5): one fixed-step simulation, no renderer, that the map only draws. Each tick
// moves the convoys along their roads (out, a wait, back; convoys.js), the band along its ordered route, the hunters after the
// band or home (defence.js), and the clock (wounds heal). Everything it moves lives in the campaign save, so a
// reload carries on where it was, mid-route included; the same save and the same orders give the same world
// whatever the frame rate. Pure, no DOM.
import {rumour} from './journal.js';
import {stepTerritory} from './territory.js';
import {advance, groundAt} from './nav.js';
import {bandSight, spotRange} from './hunt.js';
import {pursue} from './defence.js';
import {passTime, isGone} from './contacts.js';
import {CONVOY_ROADS, convoyRoad, freshMotion, driveConvoy, vehicleAt, arrive, respawn} from './convoys.js';

export {CONVOY_ROADS, convoyRoad, alongRoad, freshMotion, driveConvoy, vehicleAt} from './convoys.js';

export const STEP = 0.1; // map seconds per tick
export const HOURS_PER_SECOND = 0.6; // campaign hours per map second at speed 1
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
  /** One fixed step. Returns {healed: [ids], arrived, resupplied: [{id, settlement, added, garrison}], respawned: [ids]}. */
  function tick(dt) {
    rumour(c);
    const resupplied = [],
      respawned = [];
    for (const id of Object.keys(CONVOY_ROADS)) {
      const n = vehicles[id] || 3;
      // destroyed: a new convoy sets out from its seat once its time is up (convoys.js, WP-W6)
      if (isGone(c, id)) {
        if (respawn(c, id, n)) respawned.push(id);
        continue;
      }
      const end = driveConvoy(convoyRoad(id), motion(id), n, dt);
      const r = end && arrive(c, id, end); // arriving, it resupplies the garrison there
      if (r) resupplied.push({id, ...r});
    }
    const moving = !!band.route;
    const arrived = moving && nav ? advance(nav, band, dt) : false;
    // the hunters see the band as far as the hour, the ground under it and its size allow (hunt.js, WP-W7)
    const spot = spotRange(c, {ground: groundOf(), size: fitCount()}),
      hunts = [];
    for (const [id, home] of Object.entries(hunters)) {
      const r = pursue(c, id, home, band, dt, {spot});
      if (r?.event) hunts.push({id, event: r.event});
    }
    return {
      healed: passTime(c, dt * HOURS_PER_SECOND),
      arrived,
      resupplied,
      respawned,
      hunts,
      territory: stepTerritory(c, {dt, nav, party: band}),
    };
  }
  /** Run the world for dt map seconds (any frame rate: it moves in whole STEPs). Returns what happened. */
  function step(dt) {
    const out = {healed: [], arrived: false, resupplied: [], respawned: [], hunts: [], territory: [], ticks: 0};
    acc += Math.max(0, dt);
    while (acc >= STEP - 1e-9) {
      acc -= STEP;
      const r = tick(STEP);
      out.healed.push(...r.healed);
      out.resupplied.push(...r.resupplied);
      out.respawned.push(...r.respawned);
      out.hunts.push(...r.hunts);
      out.territory.push(...r.territory);
      out.arrived ||= r.arrived;
      out.ticks++;
    }
    return out;
  }
  /** Let `hours` of campaign time pass in the world (a rest): everything moves, nothing is skipped. */
  const skip = hours => step(hours / HOURS_PER_SECOND);
  /** The ground under the band, and how many fighters are fit (a big band is seen further off). */
  const groundOf = () => (nav ? groundAt(nav, band.x, band.z) : 'plain');
  const fitCount = () => Object.values(c.band?.fighters || {}).filter(f => !f.wounded).length || 8;
  /** How far the band sees now (night and forest shorten it, WP-W4, W7), and how far a column would spot it. */
  const sight = () => bandSight(c, {ground: groundOf()});
  const spotted = () => spotRange(c, {ground: groundOf(), size: fitCount()});
  /** Is (x, z) within the band's sight now? */
  const sees = (x, z) => Math.hypot(x - band.x, z - band.z) <= sight();
  return {
    step,
    skip,
    sees,
    sight,
    spotted,
    band,
    motion,
    /** Where a convoy's vehicles are now: [{x, z, heading}], or null when it is gone. */
    convoy: id => (isGone(c, id) ? null : Array.from({length: vehicles[id] || 3}, (_, i) => vehicleAt(convoyRoad(id), motion(id), i))),
  };
}
