// Your teammates (convoy/ai.js): orders, follow slots, holding fire until the ambush, picking targets. Split out of
// ai.js (WP-QA17).
import {between, setState} from './ai-sense.js';
import {openNear} from './pathfind.js';
import {dist} from './sim.js';
import {WEAPONS} from './weapons.js';

// Orders (WP-S3), set with sim.order(): u.order = {type, x?, z?, target?, angle?}
//   hold    stay put (at x, z when given)          follow  keep a slot behind the player, at the player's pace
//   move    go to x, z, then hold there            attack  close on `target` until it is in sight, then kill it
//   cover   watch the sector toward `angle` and only engage what is inside it (about 100 degrees wide)
// Before the ambush is sprung they hold fire, unless ordered to attack.
const SECTOR = 0.9; // half-width of a cover sector, radians

/** Where follower number k stands: behind the player, alternating left and right. */
function followSlot(sim, u) {
  const p = sim.player;
  const followers = sim.units.filter(o => o.side === 'partisan' && o.alive && o !== p && o.order?.type === 'follow');
  const k = followers.indexOf(u);
  // behind the way the player is going (not where he aims, or the squad would circle him as he turns)
  const h = (sim.followHeading ||= {x: p.x, z: p.z, a: p.facing});
  if (Math.hypot(p.x - h.x, p.z - h.z) > 0.6) Object.assign(h, {a: Math.atan2(p.z - h.z, p.x - h.x), x: p.x, z: p.z});
  const back = h.a + Math.PI,
    side = (k % 2 ? 1 : -1) * (1 + Math.floor(k / 2)) * 1.4;
  // a slot that falls in a wall or off the map moves to the nearest ground a body can stand on
  const x = p.x + Math.cos(back) * 2.2 - Math.sin(back) * side,
    z = p.z + Math.sin(back) * 2.2 + Math.cos(back) * side;
  return openNear(sim, x, z) || {x: p.x, z: p.z};
}

export function partisanThink(sim, u) {
  // The squad moves up with you unless told otherwise. By default it keeps its starting (ambush) positions until the
  // player has moved off 4 m, then follows; an order to follow (F) applies at once.
  const o = (u.order ||= {type: 'follow', settled: true});
  if (o.settled) {
    const start = (sim.squadStart ||= {x: sim.player.x, z: sim.player.z});
    if (Math.hypot(sim.player.x - start.x, sim.player.z - start.z) > 4) delete o.settled;
  }
  if (o.type === 'follow' && o.settled) u.moveTo = null;
  else if (o.type === 'follow') {
    const slot = followSlot(sim, u);
    const behind = Math.hypot(slot.x - u.x, slot.z - u.z);
    // at the player's pace, running only to catch up when left behind
    u.speed = behind > 8 ? Math.max(sim.player.speed, 5.8) : sim.player.speed;
    u.moveTo = behind > 1.2 ? slot : null;
  } else if (o.type === 'move') {
    if (Math.hypot(o.x - u.x, o.z - u.z) < 0.5) {
      u.order = {type: 'hold', x: o.x, z: o.z};
      sim.say(u, 'In position.', 'ack-pos', 2);
    } else u.moveTo = {x: o.x, z: o.z};
  } else if (o.type === 'attack') {
    const t = sim.units.find(x => x.id === o.target);
    if (!t || !t.alive || t.escaped) {
      u.order = {type: 'hold'};
      u.moveTo = null;
    } else u.moveTo = u.visible.includes(t) ? null : {x: t.x, z: t.z};
  } else if (o.x !== undefined && Math.hypot(o.x - u.x, o.z - u.z) > 0.6) u.moveTo = {x: o.x, z: o.z};
  else u.moveTo = null;
  if (o.type !== 'follow') u.speed = 4.6;
  if (!sim.alarm && o.type !== 'attack') return; // hold fire until the ambush is sprung
  if (u.supp > 0.7) {
    if (u.state !== 'duck') sim.say(u, "I'm pinned!", 'pinned', 8);
    setState(sim, u, 'duck');
  } else setState(sim, u, 'fight');
}

export function partisanAct(sim, u, dt) {
  if (u.moveTo) sim.move(u, dt);
  if (u.state !== 'fight') return;
  if (u.pause > 0) {
    u.pause -= dt;
    return;
  }
  const W = WEAPONS[u.weapon],
    o = u.order || {};
  let seen = u.visible.filter(e => e.alive);
  if (o.type === 'attack') seen = seen.filter(e => e.id === o.target).concat(seen.filter(e => e.id !== o.target));
  else if (o.type === 'cover')
    seen = seen.filter(
      e =>
        Math.abs(Math.atan2(Math.sin(Math.atan2(e.z - u.z, e.x - u.x) - o.angle), Math.cos(Math.atan2(e.z - u.z, e.x - u.x) - o.angle))) <
        SECTOR,
    );
  const target = o.type === 'attack' && seen[0]?.id === o.target ? seen[0] : seen.sort((a, b) => dist(u, a) - dist(u, b))[0];
  if (target && sim.shoot(u, target.x, target.z) && ++u.burst >= Math.round(between(sim, W.burst))) {
    u.burst = 0;
    u.pause = between(sim, W.pause);
  }
  if (!target && o.type === 'cover' && !u.moving) u.facing = o.angle;
}
