// Reachable, reserved follow positions and short-lived cover choices for the rebel squad.
import {openNear, reachable} from './pathfind.js';
import {findCover} from './ai-cover.js';

const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const free = (sim, u, p) =>
  sim.units.every(
    o =>
      o === u ||
      !o.alive ||
      o.side !== u.side ||
      (distance(p, o) >= 1.8 && distance(p, (o !== sim.player && o.order?.type === 'follow' && o.followPosition) || o.moveTo || o) >= 2.4),
  );

export function followPosition(sim, u) {
  const p = sim.player;
  const followers = sim.units.filter(o => o.side === 'partisan' && o.alive && o !== p && o.order?.type === 'follow');
  const k = Math.max(0, followers.indexOf(u));
  if (sim.followHeading?.leader !== p.id) sim.followHeading = {leader: p.id, x: p.x, z: p.z, a: p.facing};
  const h = sim.followHeading;
  if (distance(p, h) > 0.6) Object.assign(h, {a: Math.atan2(p.z - h.z, p.x - h.x), x: p.x, z: p.z});
  const back = h.a + Math.PI;
  const row = Math.floor(k / 2),
    side = (k % 2 ? 1 : -1) * 2;
  const slot = {
    x: p.x + Math.cos(back) * (2.6 + row * 2.8) - Math.sin(back) * side,
    z: p.z + Math.sin(back) * (2.6 + row * 2.8) + Math.cos(back) * side,
  };
  const valid = at => distance(at, p) >= 2.4 && free(sim, u, at) && reachable(sim, u.x, u.z, at.x, at.z);
  const threat = sim.alarm && u.visible.filter(e => e.alive && !e.escaped).sort((a, b) => distance(u, a) - distance(u, b))[0];
  const cache = u.followCover;
  // Reuse a covered destination briefly; rescan only twice a second, not every simulation frame.
  if (!threat && cache && distance(cache.anchor, p) < 3 && sim.time < cache.until && valid(cache.at)) {
    u.followPosition = cache.at;
    return cache.at; // Breaking line of sight is the purpose of cover; do not abandon it immediately.
  }
  if (!threat) u.followCover = null;
  else if (cache && cache.threat === threat.id && distance(cache.anchor, p) < 3 && sim.time < cache.until && valid(cache.at)) {
    u.followPosition = cache.at;
    return cache.at;
  } else if (sim.time >= (u.followCoverAt || 0)) {
    u.followCoverAt = sim.time + 0.6;
    const at = findCover(sim, u, threat, {
      protectedOnly: true,
      accept: at => distance(at, slot) <= 6 && distance(at, p) <= 12 && valid(at),
    });
    u.followCover = at ? {at, anchor: {x: p.x, z: p.z}, threat: threat.id, until: sim.time + 1.8} : null;
    if (at) {
      u.followPosition = at;
      return at;
    }
  }
  // Never collapse blocked slots onto the leader. Search distinct nearby ground, or wait in place.
  for (const radius of [0, 2.8, 5.6]) {
    for (let i = 0; i < (radius ? 8 : 1); i++) {
      const a = back + (i * Math.PI) / 4;
      const at = openNear(sim, slot.x + Math.cos(a) * radius, slot.z + Math.sin(a) * radius);
      if (at && valid(at)) {
        u.followPosition = at;
        return at;
      }
    }
  }
  u.followPosition = {x: u.x, z: u.z};
  return u.followPosition;
}
