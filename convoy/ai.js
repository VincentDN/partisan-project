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
import {WEAPONS, ROLES} from './weapons.js';
import {dist, inBox} from './sim.js';

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
    if (d > sight) continue;
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
        ((sim.level.avoid || []).some(a => inBox(px, pz, a)) ? 4 : 0);
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
    idx = v.crew.filter(c => c.role !== 'turret').indexOf(u);
  const since = sim.alarm ? sim.alarmAt : v.stopAt;
  if (sim.time < since + 0.4 + idx * 0.35) return; // they pile out one by one
  const side = best ? (best.z < v.z ? 1 : -1) : 1; // out of the doors away from the threat
  u.x = v.x + (idx - (v.crew.length - 2) / 2) * 1.3;
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
        // drift around the vehicles (or the post), looking north
        const at = u.vehicle || u.post;
        u.moveTo = {x: at.x + (sim.rand() - 0.5) * 10, z: at.z + 3 + sim.rand() * 4};
        u.speed = 1.6;
      }
      break;
    case 'guard':
    case 'patrol':
      if (u.alert) {
        react(sim, u, best);
        break;
      }
      if (u.state === 'guard') {
        // stand the post, scanning left and right of its arc
        u.moveTo = Math.hypot(u.post.x - u.x, u.post.z - u.z) > 0.5 ? {x: u.post.x, z: u.post.z} : null;
        u.speed = 1.6;
        if (!u.moveTo) u.facing = u.post.facing + Math.sin(sim.time * 0.35 + u.post.x) * 0.7;
      } else {
        // walk the route, waypoint to waypoint, and loop
        const w = u.route[u.routeI];
        if (Math.hypot(w.x - u.x, w.z - u.z) < 0.6) u.routeI = (u.routeI + 1) % u.route.length;
        u.moveTo = {...u.route[u.routeI]};
        u.speed = 1.5;
      }
      break;
    case 'bound':
    case 'overwatch':
      // run by the assault director (squadThink); here only the hand-over to a plain fight
      if (u.supp > 0.75) {
        setState(sim, u, 'pinned');
        sim.say(u, 'Pinned down!', 'pinned', 8);
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
    case 'turret':
      if (best) u.lastKnown = {x: best.x, z: best.z};
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
        if (!u.vehicle) u.post = {x: u.x, z: u.z, facing: u.facing};
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

const between = (sim, [lo, hi]) => lo + sim.rand() * (hi - lo);

/** A guard or patrol has been alerted: take cover from what it believes, or go and look where the trouble was. */
function react(sim, u, best) {
  if (best) {
    setState(sim, u, 'cover');
    u.moveTo = findCover(sim, u, best);
    u.speed = 4.6;
    sim.say(u, `Contact ${compass(best.x - u.x, best.z - u.z)}!`, 'contact', 5);
  } else {
    setState(sim, u, 'search');
    u.speed = 2.4;
    u.moveTo = u.lastKnown || null;
  }
}

export function armyAct(sim, u, dt) {
  if (u.state === 'mounted' || u.state === 'escaped') return;
  if (!u.moveTo && u.path?.length) u.moveTo = u.path.shift();
  if (!['engage', 'pinned', 'turret', 'overwatch'].includes(u.state)) sim.move(u, dt);
  else u.moving = false;
  if (u.pause > 0) {
    u.pause -= dt;
    return;
  }
  if (sim.time < (u.reactAt || 0)) return; // the first moments of an ambush: surprise
  const W = WEAPONS[u.weapon],
    role = ROLES[u.role];
  const target = u.visible.filter(e => e.alive).sort((a, b) => dist(u, a) - dist(u, b))[0];
  const best = bestBelief(u);
  // Grenadier: lob a grenade at a hidden enemy it is fairly sure about, to flush it out of cover.
  if (role.launcher && best && !target && best.conf > 0.45 && best.err < 7 && sim.time - (u.lastLob || -99) > 6) {
    const d = Math.hypot(best.x - u.x, best.z - u.z);
    if (d > 12 && d < WEAPONS[role.launcher].range && (u.mags[role.launcher] > 0 || u.reserve[role.launcher] > 0) && u.state !== 'pinned') {
      if (u.mags[role.launcher] === 0) sim.startReload(u, role.launcher);
      else if (sim.shoot(u, best.x, best.z, 0, role.launcher)) {
        u.lastLob = sim.time;
        u.pause = 1;
        sim.say(u, 'Grenade out!', 'lob', 6);
        return;
      }
    }
  }
  if (!u.alert && sim.alarmMode === 'local') return; // unaware soldiers do not fire
  const firing = ['engage', 'flank', 'search', 'cover', 'retreat', 'turret', 'bound', 'overwatch'].includes(u.state);
  if (target && firing) {
    if (sim.shoot(u, target.x, target.z) && ++u.burst >= Math.round(between(sim, W.burst))) {
      u.burst = 0;
      u.pause = between(sim, W.pause);
    }
    return;
  }
  // Suppress where it thinks you are (a marksman never fires blind): wider spread, slower cadence.
  if ((u.state === 'engage' || u.state === 'turret' || u.state === 'overwatch') && best && best.conf > role.suppressAt) {
    u.facing = Math.atan2(best.z - u.z, best.x - u.x);
    if (sim.shoot(u, best.x, best.z, 0.05 + best.err * 0.012)) {
      sim.say(u, 'Suppressing!', 'suppress', 8);
      if (++u.burst >= Math.max(2, Math.round(between(sim, W.burst) * 0.6))) {
        u.burst = 0;
        u.pause = between(sim, W.pause) + 0.8;
      }
    }
  } else if (best && !u.moving) u.facing = Math.atan2(best.z - u.z, best.x - u.x);
}

/** Squad director, 1 Hz: flanking orders and the decision to fall back. */
export function squadThink(sim) {
  if (!sim.alarm) return;
  reinforce(sim);
  directAssaults(sim);
  const army = sim.units.filter(u => u.side === 'army');
  const up = army.filter(u => u.alive && !u.escaped && u.state !== 'mounted' && u.state !== 'turret');
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
  return {x: p.x + Math.cos(back) * 2.2 - Math.sin(back) * side, z: p.z + Math.sin(back) * 2.2 + Math.cos(back) * side};
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

// ---------- reinforcements and bounding assaults (WP-S4) ----------
/**
 * Reinforcements need the radio: an alerted, living radio operator spends `callTime` seconds on the call (kill him then
 * and nobody comes); the group arrives `after` seconds later and assaults what the army believes.
 */
function reinforce(sim) {
  const R = sim.reinforcements;
  if (!R || R.state === 'arrived' || R.state === 'lost') return;
  if (sim.radioDown) {
    R.state = 'lost'; // the mast is down: the call never goes out
    return;
  }
  const rto = sim.units.find(u => u.side === 'army' && u.role === 'rto' && u.alive && u.alert);
  if (R.state === 'idle') {
    if (!rto) return;
    R.state = 'calling';
    R.callEnds = sim.time + (R.callTime ?? 4);
    R.caller = rto.id;
    sim.say(rto, 'Base, contact at our position, send the reaction force!', 'radio-call', 99);
  } else if (R.state === 'calling') {
    const caller = sim.units.find(u => u.id === R.caller);
    if (!caller?.alive) {
      R.state = 'lost';
      return;
    }
    if (sim.time >= R.callEnds) {
      R.state = 'inbound';
      R.arriveAt = sim.time + (R.after ?? 20);
      sim.say(caller, 'Reaction force inbound!', 'radio-ok', 99);
    }
  } else if (R.state === 'inbound' && sim.time >= R.arriveAt) {
    R.state = 'arrived';
    const army = sim.units.filter(u => u.side === 'army' && u.alive);
    const beliefs = army.flatMap(u => u.beliefs).filter(b => b.conf > 0.3);
    const goal = beliefs.reduce((a, b) => (!a || b.conf > a.conf ? b : a), null) || R.goal || sim.player;
    const made = sim.spawnGroup(R.units, {group: R.group || 'qrf', goal: {x: goal.x, z: goal.z}, beliefs});
    if (made[0]) sim.say(made[0], 'Reaction force here! Moving up!', 'qrf', 99);
  }
}

/** Next spot for a bounding soldier: 5 to 15 m on, nearer the goal, preferably hidden from it. */
export function nextBound(sim, u, goal) {
  const d0 = Math.hypot(goal.x - u.x, goal.z - u.z);
  const c = findCover(sim, u, goal);
  if (c) {
    const d1 = Math.hypot(goal.x - c.x, goal.z - c.z),
      hop = Math.hypot(c.x - u.x, c.z - u.z);
    if (d1 < d0 - 3 && hop > 3 && hop < 16) return c;
  }
  const step = Math.min(10, d0 - 4);
  return {x: u.x + ((goal.x - u.x) / d0) * step, z: u.z + ((goal.z - u.z) / d0) * step};
}

/**
 * Bounding overwatch: each assault group splits into two fireteams; one moves cover to cover toward the goal while the
 * other holds and fires, then they swap. Within 10 m of the goal (or with the enemy in sight up close) it becomes a fight.
 */
function directAssaults(sim) {
  for (const a of sim.assaults) {
    const team = sim.units.filter(
      u => u.group === a.group && u.alive && (u.state === 'bound' || u.state === 'overwatch' || u.state === 'pinned'),
    );
    if (!team.length) continue;
    const near = team.some(u => Math.hypot(a.goal.x - u.x, a.goal.z - u.z) < 10 || u.visible.some(e => dist(u, e) < 12));
    if (near) {
      for (const u of team) if (u.state !== 'pinned') setState(sim, u, 'engage');
      a.done = true;
      continue;
    }
    const fireteams = [team.filter((_, i) => i % 2 === 0), team.filter((_, i) => i % 2 === 1)];
    const movers = fireteams[a.moving].filter(u => u.state !== 'pinned');
    const arrived = movers.every(u => u.state === 'overwatch' || (!u.moveTo && u.state === 'bound'));
    if (arrived || sim.time - a.since > 12) {
      // swap: the team that was covering bounds forward now
      a.moving = fireteams[1].length ? 1 - a.moving : 0;
      a.since = sim.time;
      const next = fireteams[a.moving].filter(u => u.state !== 'pinned');
      for (const u of team) if (u.state !== 'pinned') setState(sim, u, next.includes(u) ? 'bound' : 'overwatch');
      for (const u of next) {
        u.moveTo = nextBound(sim, u, a.goal);
        u.speed = 4.6;
      }
      for (const u of team) if (!next.includes(u)) u.moveTo = null;
      if (next[0]) sim.say(next[0], 'Moving!', 'bound', 3);
      const cover = team.find(u => !next.includes(u));
      if (cover) sim.say(cover, 'Covering!', 'covering', 3);
    }
  }
  sim.assaults = sim.assaults.filter(a => !a.done);
}
