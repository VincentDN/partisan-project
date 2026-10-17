// What an army soldier knows (convoy/ai.js): beliefs about where threats are, what it sees and hears, and the small
// helpers every AI module shares. Split out of ai.js (WP-QA17).
import {sightRange} from './sniper-scope.js';
import {dist} from './sim.js';
import {ROLES} from './weapons.js';

const COMPASS = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'];
/** Compass word for a direction on the map (x east, z south). */
export const compass = (dx, dz) => COMPASS[(Math.round(Math.atan2(dz, dx) / (Math.PI / 4)) + 8) % 8];

// ---------- beliefs ----------
/** Merge belief b into u's beliefs. Returns 'new' when it is a threat u did not know about. */
export function addBelief(u, b, now) {
  let near = null,
    nd = Infinity;
  for (const e of u.beliefs) {
    const d = Math.hypot(e.x - b.x, e.z - b.z);
    if ((b.id && e.id === b.id) || d < Math.max(5, e.err + b.err * 0.5)) {
      if (d < nd) {
        near = e;
        nd = d;
      }
    }
  }
  if (!near) {
    u.beliefs.push({...b, t: now});
    return 'new';
  }
  if (b.conf >= near.conf * 0.7 || b.err < near.err) {
    near.x = b.x;
    near.z = b.z;
    near.err = Math.min(b.err, near.err + 1);
    near.src = b.src;
    near.id = b.id || near.id;
  }
  near.conf = Math.max(near.conf, b.conf);
  near.t = now;
  return 'merged';
}
/** The belief u would act on: confident and precise first. */
export const bestBelief = u => u.beliefs.reduce((a, b) => (!a || b.conf / (1 + b.err * 0.05) > a.conf / (1 + a.err * 0.05) ? b : a), null);

export function decay(sim, u, dt) {
  for (const b of u.beliefs) {
    b.conf -= dt * (b.src === 'seen' ? 0.05 : 0.09);
    b.err += dt * 0.45;
  }
  u.beliefs = u.beliefs.filter(b => b.conf > 0.05);
}

export function receive(sim, u, belief) {
  addBelief(u, belief, sim.time);
  if (u.side === 'army' && !u.alert) sim.alert(u); // word of contact puts a soldier on alert
}

// ---------- perception ----------
export function perceive(sim, u) {
  const mounted = u.state === 'mounted';
  // Sight by role (a marksman's optic, the gunner's height on the MRAP); riders in a moving vehicle see little.
  // Before the ambush the MRAP gunner watches the road ahead from his hatch: farther than the riders, not all round.
  const scanning = u.state === 'turret' && !u.alert;
  const range = mounted
    ? 24
    : scanning
      ? 32
      : u.side === 'army'
        ? (ROLES[u.role]?.sight || 42) * (sim.level.sight ?? 1)
        : u.weapon === 'svd'
          ? 60
          : 48;
  const sight = Math.min(range, sim.vision ?? Infinity); // nobody sees farther than the rebels' fog of war shows
  const halfFov = scanning ? 1.6 : u.side === 'partisan' || mounted || u.state === 'turret' || u.alert ? Math.PI : 1.25;
  u.visible = [];
  for (const e of sim.enemiesOf(u)) {
    const d = dist(u, e);
    const scopedSight = u === sim.player ? sightRange(sim, u, Math.atan2(e.z - u.z, e.x - u.x)) : sight;
    if (d > scopedSight) continue;
    if (!sim.onScreen?.(u.side === 'army' ? u : e)) continue; // you see them, they see you: only on the player's screen
    let da = Math.atan2(e.z - u.z, e.x - u.x) - u.facing;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    if (Math.abs(da) > halfFov) continue;
    if (!sim.los(u.x, u.z, e.x, e.z)) continue;
    // A rebel in stealth (an ability) is only seen up close; a quiet class (noise) is slower to notice.
    if (u.side === 'army' && sim.time < (e.stealthUntil ?? -1) && d > 4) continue;
    if (u.side === 'army' && !u.alert) {
      // Before the alarm a soldier only grows suspicious: movement and closeness make you easier to spot.
      const pace = !e.moving ? 0.6 : e.speed < 2 ? 1 : 2.2;
      u.suspicion += 0.2 * (0.4 + sim.awareness * 1.2) * (1 - d / sight) * pace * (e.mods?.noise ?? 1);
      if (u.suspicion < 1) continue;
      sim.alert(u);
    }
    u.visible.push(e);
  }
  if (u.side !== 'army') return;
  for (const e of u.visible) {
    const isNew = addBelief(u, {x: e.x, z: e.z, err: 0.4, conf: 1, src: 'seen', id: e.id}, sim.time) === 'new';
    u.lastContact = sim.time;
    if (isNew && sim.say(u, `Contact ${compass(e.x - u.x, e.z - u.z)}!`, 'contact', 5))
      sim.share(u, {x: e.x, z: e.z, err: 0.4, conf: 1, id: e.id});
  }
}

/** A shot was fired by `shooter`: the other side hears it, more precisely the closer and the more aware. */
export function hear(sim, shooter) {
  if (shooter.side !== 'partisan') return;
  for (const u of sim.units) {
    if (!u.alive || u.escaped || u.side !== 'army') continue;
    const d = dist(u, shooter);
    if (d > 85 * (shooter.mods?.noise ?? 1)) continue; // a quiet shooter (suppressor, class) is heard nearer
    const err = 1 + d * 0.14 * (1.5 - sim.awareness);
    const a = sim.rand() * Math.PI * 2,
      r = sim.rand() * err * 0.6;
    const isNew = addBelief(
      u,
      {x: shooter.x + Math.cos(a) * r, z: shooter.z + Math.sin(a) * r, err, conf: 0.55, src: 'heard', id: null},
      sim.time,
    );
    if (isNew === 'new' && u.state !== 'mounted') sim.say(u, `Shots ${compass(shooter.x - u.x, shooter.z - u.z)}!`, 'shots', 6);
    sim.alert(u);
  }
}

/** Enter a state and note when (the AI times its decisions from stateAt). */
export function setState(sim, u, state) {
  u.state = state;
  u.stateAt = sim.time;
}

/** A random number in [lo, hi) from the sim's seeded generator. */
export const between = (sim, [lo, hi]) => lo + sim.rand() * (hi - lo);
