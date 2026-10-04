// Convoy Ambush simulation and AI: geometry, perception, beliefs, comms and a deterministic replay.
import test from 'node:test';
import assert from 'node:assert/strict';
import {Sim, segmentBox, dist} from '../convoy/sim.js';
import {addBelief, bestBelief, compass, findCover} from '../convoy/ai.js';

const run = (sim, seconds, input = () => ({})) => {
  for (let i = 0; i < seconds * 60 && !sim.outcome; i++) sim.step(1 / 60, input(sim));
};

test('segment-box intersection and line of sight', () => {
  const box = {x: 0, z: 0, w: 2, d: 2};
  assert.ok(segmentBox(-5, 0, 5, 0, box) < 1);
  assert.equal(segmentBox(-5, 3, 5, 3, box), Infinity);
  const sim = new Sim();
  assert.equal(sim.los(12, -20, 12, -10), false, 'the wall at (12, -15) blocks sight');
  assert.equal(sim.los(-40, -30, -40, -25), true);
});

test('compass words follow the map (x east, z south)', () => {
  assert.equal(compass(0, -1), 'north');
  assert.equal(compass(1, 0), 'east');
  assert.equal(compass(-1, 1), 'south-west');
});

test('beliefs merge nearby reports and prefer confident, precise ones', () => {
  const u = {beliefs: []};
  assert.equal(addBelief(u, {x: 0, z: 0, err: 8, conf: 0.5, src: 'heard'}, 0), 'new');
  assert.equal(addBelief(u, {x: 2, z: 1, err: 0.4, conf: 1, src: 'seen', id: 'player'}, 1), 'merged');
  assert.equal(u.beliefs.length, 1);
  assert.equal(bestBelief(u).src, 'seen');
  assert.equal(addBelief(u, {x: 40, z: 0, err: 1, conf: 0.6, src: 'heard'}, 2), 'new');
  assert.equal(bestBelief(u).x, 2);
});

test('the convoy stops at the roadblock and, unprovoked, the squad dismounts to secure it', () => {
  const sim = new Sim({seed: 1});
  run(sim, 40);
  assert.ok(sim.vehicles[0].stopped, 'lead vehicle stopped');
  assert.ok(
    sim.vehicles.every(v => v.stopped),
    'the column closed up and stopped',
  );
  const army = sim.units.filter(u => u.side === 'army');
  assert.ok(
    army.every(u => u.state !== 'mounted'),
    'everyone got out',
  );
  assert.ok(sim.callouts.some(c => c.text.startsWith('Road blocked')));
});

test('a shot is heard: the army forms a blurred belief about the shooter, and the ambush is sprung', () => {
  const sim = new Sim({seed: 2, awareness: 0.5});
  run(sim, 5); // the convoy is still rolling in, nobody has seen the ridge
  const p = sim.player;
  for (let i = 0; i < 40 && !sim.alarm; i++) sim.step(1 / 60, {ax: sim.vehicles[1].x, az: 0, fire: true}); // aim, then the first shot
  assert.ok(sim.alarm);
  const soldier = sim.units.find(u => u.side === 'army' && u.alive && dist(u, p) < 85);
  const b = bestBelief(soldier);
  assert.ok(b, 'has a belief');
  assert.equal(b.src, 'heard');
  assert.ok(Math.hypot(b.x - p.x, b.z - p.z) <= b.err, 'the shooter is inside the uncertainty');
});

test('higher awareness: tighter hearing and faster callouts', () => {
  const errAt = awareness => {
    const sim = new Sim({seed: 3, awareness});
    run(sim, 5);
    for (let i = 0; i < 40 && !sim.alarm; i++) sim.step(1 / 60, {ax: sim.vehicles[1].x, az: 0, fire: true}); // aim, then the first shot
    const army = sim.units.filter(u => u.side === 'army');
    return army.reduce((s, u) => s + bestBelief(u).err, 0) / army.length;
  };
  assert.ok(errAt(1) < errAt(0), 'aware soldiers locate the shooter more precisely');
  const delay = awareness => {
    const sim = new Sim({awareness});
    sim.share(sim.units[0], {x: 0, z: 0, err: 1, conf: 1});
    return sim.messages[0].at - sim.time;
  };
  assert.ok(delay(1) < delay(0));
});

test('cover is chosen behind an obstacle, out of the threat line of sight', () => {
  const sim = new Sim({seed: 4});
  run(sim, 40);
  const u = sim.units.find(x => x.side === 'army');
  const threat = {x: sim.player.x, z: sim.player.z};
  const c = findCover(sim, u, threat);
  assert.ok(c);
  assert.equal(sim.los(threat.x, threat.z, c.x, c.z), false);
});

test('a full ambush plays out deterministically for a seed', () => {
  const play = () => {
    const sim = new Sim({seed: 11, awareness: 0.5});
    run(sim, 90, s => {
      const p = s.player;
      const t = s.units
        .filter(u => u.side === 'army' && u.alive && !u.escaped && u.state !== 'mounted' && s.los(p.x, p.z, u.x, u.z))
        .sort((a, b) => dist(p, a) - dist(p, b))[0];
      if (!s.vehicles[0].stopped) return {};
      const aim = t || s.vehicles[1];
      return {ax: aim.x, az: aim.z, fire: !!t || !s.alarm};
    });
    return JSON.stringify([sim.time.toFixed(2), sim.stats(), sim.callouts.length, sim.player.hp]);
  };
  const a = play();
  assert.equal(play(), a);
  const [, stats, callouts] = JSON.parse(a);
  assert.ok(stats.armyDown >= 1, 'the ambush draws blood');
  assert.ok(callouts >= 6, 'the army talks');
});

test('vehicles: rifles bounce off, three RPG rockets destroy the MRAP and its gunner', () => {
  const sim = new Sim({seed: 5});
  run(sim, 40);
  const mrap = sim.vehicles.find(v => v.kind === 'mrap');
  const gunner = mrap.crew.find(u => u.role === 'turret');
  const p = sim.player;
  // rifle fire at the hull does nothing to it
  for (let i = 0; i < 30; i++) sim.step(1 / 60, {weapon: 'ak', ax: mrap.x, az: mrap.z, fire: true});
  assert.equal(mrap.hp, mrap.maxHp);
  for (let i = 0; i < 60 * 15 && !mrap.destroyed && p.alive; i++) sim.step(1 / 60, {weapon: 'rpg', ax: mrap.x, az: mrap.z, fire: true});
  assert.ok(mrap.destroyed || !p.alive, 'MRAP destroyed (or the player died trying)');
  if (mrap.destroyed) {
    assert.equal(gunner.alive, false, 'the turret gunner goes with it');
    assert.ok(sim.explosions.length >= 3);
    assert.equal(p.mags.rpg + p.reserve.rpg, 0, 'all three rockets used');
  }
});

test('roles: every soldier carries its role weapon; the grenadier also has a launcher', () => {
  const sim = new Sim();
  const by = r => sim.units.find(u => u.role === r);
  assert.equal(by('mg').weapon, 'pkm');
  assert.equal(by('marksman').weapon, 'svd');
  assert.equal(by('turret').weapon, 'hmg');
  assert.deepEqual(by('grenadier').weapons, ['ak', 'gp']);
  assert.deepEqual(sim.player.weapons, ['ak', 'svd', 'rpg']);
});

test('the radio operator speeds up squad comms; losing him and the sergeant slows them', () => {
  const sim = new Sim({awareness: 0.5});
  const from = sim.units.find(u => u.role === 'rifleman');
  const delay = () => {
    sim.messages = [];
    sim.share(from, {x: 0, z: 0, err: 1, conf: 1});
    return sim.messages[0].at - sim.time;
  };
  const withRto = delay();
  sim.units.find(u => u.role === 'rto').alive = false;
  const without = delay();
  sim.units.find(u => u.leader).alive = false;
  const leaderless = delay();
  assert.ok(withRto < without && without < leaderless, `${withRto} < ${without} < ${leaderless}`);
});

test('the grenadier lobs a grenade at a hidden enemy it believes in', () => {
  const sim = new Sim({seed: 9, awareness: 1});
  run(sim, 40);
  const gr = sim.units.find(u => u.role === 'grenadier');
  // put him in a fight with a confident belief about a target he cannot see
  sim.raiseAlarm(null);
  Object.assign(gr, {
    state: 'engage',
    supp: 0,
    visible: [],
    pause: 0,
    reactAt: 0,
    x: 0,
    z: 10,
    beliefs: [{x: 0, z: -14, err: 2, conf: 0.9, src: 'told', t: sim.time}],
  });
  for (let i = 0; i < 30; i++) sim.step(1 / 60, {});
  assert.ok(sim.callouts.some(c => c.id === gr.id && c.text === 'Grenade out!') || gr.mags.gp === 0, 'a grenade went out');
});
