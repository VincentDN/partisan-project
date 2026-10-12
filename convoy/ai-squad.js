// The army as a group (convoy/ai.js): the squad director (falling back, flanking), radio reinforcements and bounding
// assaults (WP-S4). Split out of ai.js (WP-QA17).
import {nextBound} from './ai-cover.js';
import {setState} from './ai-sense.js';
import {dist} from './sim.js';

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
