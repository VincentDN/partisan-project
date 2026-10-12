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
//
// This file is the army soldier's state machine; the rest lives beside it (WP-QA17): ai-sense.js (beliefs, sight,
// hearing), ai-cover.js (cover and bounds), ai-squad.js (squad director, reinforcements, assaults) and
// ai-partisan.js (your teammates). Everything is re-exported here.
import {findCover} from './ai-cover.js';
import {bestBelief, between, compass, setState} from './ai-sense.js';
import {dist} from './sim.js';
import {ROLES, WEAPONS} from './weapons.js';

export * from './ai-sense.js';
export {findCover, nextBound} from './ai-cover.js';
export {squadThink} from './ai-squad.js';
export {partisanThink, partisanAct} from './ai-partisan.js';

const exposed = (sim, u, b) => sim.los(b.x, b.z, u.x, u.z);

// ---------- army ----------
function dismount(sim, u, best) {
  const v = u.vehicle,
    idx = v.crew.filter(c => c.role !== 'turret').indexOf(u);
  const since = sim.alarm ? sim.alarmAt : v.stopAt;
  if (sim.time < since + 0.4 + idx * 0.35) return; // they pile out one by one
  const side = best ? (best.z < v.z ? 1 : -1) : 1; // out of the doors away from the threat
  const B = sim.level.bounds; // a column still driving in from beyond the map edge dismounts on the map
  u.x = Math.max(B.minX + 1, Math.min(B.maxX - 1, v.x + (idx - (v.crew.length - 2) / 2) * 1.3));
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
