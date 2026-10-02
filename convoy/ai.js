// Convoy Ambush AI. Design pillars 3 and 4 (docs/game-design-master-doc.html): the enemy is smart because it
// speaks, and difficulty is what it knows, never its health or aim.
//
// Every army soldier keeps BELIEFS about where threats are: {x, z, err (metres), conf (0..1), src, id}.
//   seen  - in its vision cone with line of sight: exact, conf 1
//   heard - a gunshot: position blurred by distance (less blur with higher awareness)
//   told  - a squadmate's callout over the radio: arrives late (sooner with awareness) and a little blurred
// Beliefs fade (conf down, err up) unless refreshed. Decisions read beliefs, not the truth: a soldier suppresses
// where it THINKS you are, searches where it last knew you were, and can be wrong.
//
// Unit states (army): mounted > (secure | cover) > engage <> pinned, flank, search, retreat.
// The squad director (1 Hz) handles what no single soldier decides: flanking and falling back.
import {ROAD} from './world.js';
import {dist} from './sim.js';

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
}

// ---------- perception ----------
export function perceive(sim, u) {
  const mounted = u.state === 'mounted';
  const range = mounted ? 24 : u.side === 'army' ? 42 : 48;
  const halfFov = u.side === 'partisan' || mounted || sim.alarm ? Math.PI : 1.25;
  u.visible = [];
  for (const e of sim.enemiesOf(u)) {
    const d = dist(u, e);
    if (d > range) continue;
    let da = Math.atan2(e.z - u.z, e.x - u.x) - u.facing;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    if (Math.abs(da) > halfFov) continue;
    if (!sim.los(u.x, u.z, e.x, e.z)) continue;
    if (u.side === 'army' && !sim.alarm) {
      // Before the ambush a soldier only grows suspicious: movement and closeness make you easier to spot.
      const pace = !e.moving ? 0.6 : e.speed < 2 ? 1 : 2.2;
      u.suspicion += 0.2 * (0.4 + sim.awareness * 1.2) * (1 - d / range) * pace;
      if (u.suspicion < 1) continue;
      sim.raiseAlarm(u);
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
    if (d > 85) continue;
    const err = 1 + d * 0.14 * (1.5 - sim.awareness);
    const a = sim.rand() * Math.PI * 2,
      r = sim.rand() * err * 0.6;
    const isNew = addBelief(
      u,
      {x: shooter.x + Math.cos(a) * r, z: shooter.z + Math.sin(a) * r, err, conf: 0.55, src: 'heard', id: null},
      sim.time,
    );
    if (isNew === 'new' && u.state !== 'mounted') sim.say(u, `Shots ${compass(shooter.x - u.x, shooter.z - u.z)}!`, 'shots', 6);
  }
}

// ---------- cover ----------
/** Best spot near u that hides it from `threat`: behind boxes, away from the threat, not crowded. */
export function findCover(sim, u, threat) {
  let best = null,
    bestScore = -Infinity;
  const boxes = sim.boxes();
  const blocked = (x, z) => boxes.some(b => Math.abs(x - b.x) < b.w / 2 + u.r && Math.abs(z - b.z) < b.d / 2 + u.r);
  for (const b of boxes) {
    if (Math.hypot(b.x - u.x, b.z - u.z) > 28) continue;
    let ax = b.x - threat.x,
      az = b.z - threat.z;
    const al = Math.hypot(ax, az) || 1;
    ax /= al;
    az /= al;
    // reach: half the box's extent along the away direction, plus a body and a little air
    const reach = Math.abs(ax) * (b.w / 2) + Math.abs(az) * (b.d / 2) + u.r + 0.5;
    for (const lateral of [0, -0.6, 0.6]) {
      const px = b.x + ax * reach - az * lateral * (b.w / 2),
        pz = b.z + az * reach + ax * lateral * (b.d / 2);
      if (blocked(px, pz)) continue;
      const covered = !sim.los(threat.x, threat.z, px, pz);
      const crowd = sim.units.filter(
        o => o !== u && o.alive && o.side === u.side && Math.hypot((o.moveTo || o).x - px, (o.moveTo || o).z - pz) < 1.6,
      ).length;
      const score =
        (covered ? 40 : 0) -
        Math.hypot(px - u.x, pz - u.z) * 1.2 -
        (Math.hypot(px - threat.x, pz - threat.z) < 10 ? 25 : 0) -
        crowd * 14 -
        (Math.abs(pz - ROAD.z) < ROAD.half ? 4 : 0);
      if (score > bestScore) {
        bestScore = score;
        best = {x: px, z: pz};
      }
    }
  }
  return best;
}
const exposed = (sim, u, b) => sim.los(b.x, b.z, u.x, u.z);

function setState(sim, u, state) {
  u.state = state;
  u.stateAt = sim.time;
}

// ---------- army ----------
function dismount(sim, u, best) {
  const v = u.vehicle,
    idx = v.crew.indexOf(u);
  const since = sim.alarm ? sim.alarmAt : v.stopAt;
  if (sim.time < since + 0.4 + idx * 0.35) return; // they pile out one by one
  const side = best ? (best.z < v.z ? 1 : -1) : 1; // out of the doors away from the threat
  u.x = v.x + (idx - (v.crew.length - 1) / 2) * 1.3;
  u.z = v.z + side * (v.d / 2 + 0.8);
  u.facing = side > 0 ? -Math.PI / 2 : Math.PI / 2;
  if (best) {
    setState(sim, u, 'cover');
    u.moveTo = findCover(sim, u, best);
    u.speed = 4.6;
    if (u.leader) sim.say(u, 'Dismount! Get to cover!', 'dismount', 99);
    else sim.say(u, 'Moving!', 'moving', 3);
  } else {
    setState(sim, u, 'secure');
    if (u.leader) sim.say(u, 'Spread out, watch the ridge.', 'secure', 99);
  }
}

export function armyThink(sim, u) {
  const best = bestBelief(u);
  if (best && best.conf > 0.3) u.lastContact = Math.max(u.lastContact || 0, sim.time - (u.visible.length ? 0 : 0.2));
  switch (u.state) {
    case 'mounted':
      if (sim.alarm || (u.vehicle.stopped && sim.time - u.vehicle.stopAt > 1.2)) dismount(sim, u, best);
      break;
    case 'secure':
      if (best) {
        setState(sim, u, 'cover');
        u.moveTo = findCover(sim, u, best);
        u.speed = 4.6;
      } else if (!u.moveTo && sim.rand() < 0.04) {
        // drift around the vehicles, looking north
        u.moveTo = {x: u.vehicle.x + (sim.rand() - 0.5) * 10, z: u.vehicle.z + 3 + sim.rand() * 4};
        u.speed = 1.6;
      }
      break;
    case 'cover':
      if (!u.moveTo && !u.path?.length) setState(sim, u, 'engage');
      break;
    case 'engage':
      if (u.supp > 0.65) {
        setState(sim, u, 'pinned');
        sim.say(u, 'Pinned down!', 'pinned', 8);
      } else if (best && !u.visible.length && exposed(sim, u, best) && sim.time - u.stateAt > 3) {
        const c = findCover(sim, u, best);
        if (c && Math.hypot(c.x - u.x, c.z - u.z) > 1) {
          setState(sim, u, 'cover');
          u.moveTo = c;
          u.speed = 4.6;
          sim.say(u, 'Moving!', 'moving', 4);
        }
      } else if (!best && sim.time - (u.lastContact || 0) > 6) {
        setState(sim, u, 'search');
        u.speed = 2.4;
        u.moveTo = u.lastKnown || null;
        sim.say(u, 'Lost them. Moving up.', 'lost', 10);
      }
      if (best) u.lastKnown = {x: best.x, z: best.z};
      break;
    case 'pinned':
      if (u.supp < 0.3) setState(sim, u, 'engage');
      break;
    case 'flank':
      if (u.visible.length) {
        setState(sim, u, 'engage');
        u.moveTo = null;
        u.path = [];
        sim.say(u, 'Eyes on! Engaging!', 'eyes', 6);
      } else if (!u.moveTo && !u.path?.length) setState(sim, u, 'engage');
      break;
    case 'search':
      if (u.visible.length) setState(sim, u, 'engage');
      else if (best && best.conf > 0.35) {
        setState(sim, u, 'cover');
        u.moveTo = findCover(sim, u, best);
        u.speed = 4.6;
      } else if (!u.moveTo) {
        setState(sim, u, 'secure');
        u.vehicle = u.vehicle || sim.vehicles[0];
        sim.say(u, 'Clear here.', 'clear', 15);
      }
      break;
    case 'retreat':
      if (u.x < -60) {
        u.escaped = true;
        u.state = 'escaped';
      }
      break;
  }
}

export function armyAct(sim, u, dt) {
  if (u.state === 'mounted' || u.state === 'escaped') return;
  if (!u.moveTo && u.path?.length) u.moveTo = u.path.shift();
  if (u.state !== 'engage' && u.state !== 'pinned') sim.move(u, dt);
  else u.moving = false;
  const target = u.visible.filter(e => e.alive).sort((a, b) => dist(u, a) - dist(u, b))[0];
  const firing = ['engage', 'flank', 'search', 'cover', 'retreat'].includes(u.state);
  if (u.pause > 0) {
    u.pause -= dt;
    return;
  }
  if (target && firing && u.state !== 'pinned') {
    if (sim.shoot(u, target.x, target.z) && ++u.burst >= 3) {
      u.burst = 0;
      u.pause = 0.45 + sim.rand() * 0.8;
    }
    return;
  }
  const best = bestBelief(u);
  if (u.state === 'engage' && best && best.conf > 0.3) {
    // Suppress where it thinks you are: wider spread, slower cadence.
    u.facing = Math.atan2(best.z - u.z, best.x - u.x);
    if (sim.shoot(u, best.x, best.z, 0.05 + best.err * 0.012)) {
      sim.say(u, 'Suppressing!', 'suppress', 8);
      if (++u.burst >= 2) {
        u.burst = 0;
        u.pause = 1.1 + sim.rand() * 1.2;
      }
    }
  } else if (best && !u.moving) u.facing = Math.atan2(best.z - u.z, best.x - u.x);
}

/** Squad director, 1 Hz: flanking orders and the decision to fall back. */
export function squadThink(sim) {
  if (!sim.alarm) return;
  const army = sim.units.filter(u => u.side === 'army');
  const up = army.filter(u => u.alive && !u.escaped && u.state !== 'mounted');
  const all = army.filter(u => u.alive && !u.escaped);
  if (!all.length) return;
  const beliefs = up.flatMap(u => u.beliefs.filter(b => b.conf > 0.4));
  if (beliefs.length) sim.squad.contactSince = Math.min(sim.squad.contactSince, sim.time);
  else sim.squad.contactSince = Infinity;
  const speaker = all.find(u => u.leader) || all[0];
  if (!sim.squad.retreating && all.length <= army.length * 0.4) {
    sim.squad.retreating = true;
    sim.say(speaker, 'Fall back! Fall back!', 'retreat', 99);
    for (const u of up) {
      setState(sim, u, 'retreat');
      u.path = [
        {x: u.x - 4, z: Math.max(u.z, 4)},
        {x: -66, z: 5 + sim.rand() * 3},
      ];
      u.moveTo = null;
      u.speed = 4.6;
    }
    return;
  }
  if (sim.squad.flanking || sim.squad.retreating || !beliefs.length || sim.time - sim.squad.contactSince < 9) return;
  const ready = up.filter(u => u.state === 'engage' && u.supp < 0.4);
  if (ready.length < 3) return;
  // Flank the strongest shared belief from the side the squad is not already on.
  const threat = beliefs.reduce((a, b) => (b.conf > a.conf ? b : a));
  const meanX = up.reduce((s, u) => s + u.x, 0) / up.length;
  const side = threat.x >= meanX ? 1 : -1;
  const goal = {x: threat.x + side * 15, z: threat.z + 2};
  const team = ready.sort((a, b) => Math.hypot(a.x - goal.x, a.z - goal.z) - Math.hypot(b.x - goal.x, b.z - goal.z)).slice(0, 2);
  sim.squad.flanking = true;
  sim.say(speaker, `Fireteam, flank ${side > 0 ? 'east' : 'west'}!`, 'flank', 99);
  for (const u of team) {
    setState(sim, u, 'flank');
    u.path = [{x: goal.x, z: Math.max(u.z, 5)}, {x: goal.x, z: goal.z + 6}, goal];
    u.moveTo = null;
    u.speed = 4.6;
    sim.say(u, 'Moving to flank!', 'flankgo', 99);
  }
}

// ---------- partisans (your teammates) ----------
export function partisanThink(sim, u) {
  if (!sim.alarm) return; // hold fire until the ambush is sprung
  if (u.supp > 0.7) {
    if (u.state !== 'duck') sim.say(u, "I'm pinned!", 'pinned', 8);
    setState(sim, u, 'duck');
  } else setState(sim, u, 'fight');
}

export function partisanAct(sim, u, dt) {
  if (u.state !== 'fight') return;
  if (u.pause > 0) {
    u.pause -= dt;
    return;
  }
  const target = u.visible.filter(e => e.alive).sort((a, b) => dist(u, a) - dist(u, b))[0];
  if (target && sim.shoot(u, target.x, target.z) && ++u.burst >= 2 + Math.floor(sim.rand() * 2)) {
    u.burst = 0;
    u.pause = 0.5 + sim.rand() * 0.9;
  }
}
