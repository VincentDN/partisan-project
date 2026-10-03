// Partisan Tactical: the level framework (levels are data) and mission objectives.
import test from 'node:test';
import assert from 'node:assert/strict';
import {Sim} from '../convoy/sim.js';
import {LEVELS, MISSIONS} from '../convoy/levels/index.js';
import {evaluate} from '../convoy/objectives.js';

// A tiny level with no convoy: two partisans, one guard, a crate.
const tiny = (objectives, extra = {}) => ({
  id: 'tiny',
  title: 'Tiny',
  brief: '',
  bounds: {minX: -30, maxX: 30, minZ: -30, maxZ: 30},
  ground: {color: 0x445533},
  cover: [{x: 0, z: 0, w: 2, d: 2, h: 1.5, kind: 'rock'}],
  partisans: [
    {id: 'player', label: 'You', x: -10, z: 0},
    {id: 'mila', label: 'Mila', x: -12, z: 2},
  ],
  convoy: null,
  units: [{name: 'Guard', role: 'rifleman', x: 20, z: 20, facing: Math.PI, group: 'gate'}],
  items: [{id: 'cache', label: 'Cache', x: -10, z: 1.5, search: 1}],
  objectives,
  ...extra,
});
const steps = (sim, seconds, input = {}) => {
  for (let i = 0; i < seconds * 60 && !sim.outcome; i++) sim.step(1 / 60, input);
};

test('levels: every mission entry is built or says what is coming; the convoy level is complete data', () => {
  for (const m of MISSIONS) assert.ok(LEVELS[m.id] || m.soon, m.id);
  const c = LEVELS.convoy;
  for (const k of ['bounds', 'ground', 'cover', 'partisans', 'convoy', 'objectives']) assert.ok(c[k], k);
  assert.equal(new Sim({level: 'convoy', seed: 1}).units.length, new Sim({seed: 1}).units.length, 'the default level is the convoy');
});

test('levels: a level made of data loads and runs, with foot soldiers and no convoy', () => {
  const sim = new Sim({level: tiny([{id: 'x', type: 'hold', seconds: 999, label: 'wait'}]), seed: 2});
  assert.equal(sim.vehicles.length, 0);
  const guard = sim.units.find(u => u.side === 'army');
  assert.equal(guard.name, 'Guard');
  assert.deepEqual(guard.post, {x: 20, z: 20, facing: Math.PI});
  steps(sim, 3);
  assert.equal(sim.outcome, null);
  assert.throws(() => new Sim({level: 'nowhere'}), /unknown level/);
});

test('objectives: eliminate, destroy and the convoy outcome', () => {
  const sim = new Sim({level: tiny([{id: 'kill', type: 'eliminate', label: 'Kill the guard'}]), seed: 3});
  sim.units.find(u => u.side === 'army').alive = false;
  assert.equal(evaluate(sim), 'won');
  const c = new Sim({seed: 3});
  assert.equal(c.objectives.find(o => o.id === 'mrap').optional, true);
  c.vehicles.find(v => v.id === 'mrap').destroyed = true;
  evaluate(c);
  assert.equal(c.objectives.find(o => o.id === 'mrap').state, 'done');
  assert.equal(evaluate(c), null, 'an optional objective alone does not win');
});

test('objectives: steal by holding E, then extract (locked until stolen)', () => {
  const zone = {x: -25, z: 0, w: 8, d: 8};
  const sim = new Sim({
    level: tiny([
      {id: 'steal', type: 'steal', item: 'cache', label: 'Take the cache'},
      {id: 'out', type: 'extract', zone, after: ['steal'], label: 'Get out'},
    ]),
    seed: 4,
  });
  evaluate(sim);
  assert.equal(sim.objectives[1].state, 'locked');
  steps(sim, 0.5, {interact: true});
  assert.equal(sim.taken.has('cache'), false, 'half way');
  steps(sim, 0.3, {});
  assert.equal(sim.items[0].progress, 0, 'letting go resets the search');
  steps(sim, 1.2, {interact: true});
  assert.ok(sim.taken.has('cache'));
  evaluate(sim);
  assert.equal(sim.objectives[1].state, 'active');
  for (const u of sim.units.filter(u => u.side === 'partisan')) Object.assign(u, {x: -25, z: 0});
  assert.equal(evaluate(sim), 'won');
});

test('objectives: reach, hold, protect (fails when the protected one falls) and the player dying', () => {
  const reach = new Sim({level: tiny([{id: 'r', type: 'reach', zone: {x: -10, z: 0, w: 2, d: 2}, label: 'Here'}]), seed: 5});
  assert.equal(evaluate(reach), 'won');
  const hold = new Sim({level: tiny([{id: 'h', type: 'hold', seconds: 1, label: 'Hold'}]), seed: 5});
  steps(hold, 0.5);
  assert.equal(hold.outcome, null);
  steps(hold, 1);
  assert.equal(hold.outcome, 'won');
  const prot = new Sim({
    level: tiny([
      {id: 'h', type: 'hold', seconds: 60, label: 'Hold'},
      {id: 'p', type: 'protect', units: ['mila'], label: 'Keep Mila alive'},
    ]),
    seed: 5,
  });
  prot.units.find(u => u.id === 'mila').alive = false;
  assert.equal(evaluate(prot), 'lost');
  const dead = new Sim({level: tiny([{id: 'h', type: 'hold', seconds: 60, label: 'Hold'}]), seed: 5});
  dead.player.alive = false;
  assert.equal(evaluate(dead), 'lost');
});

test('debrief: outcome, objectives, kills per partisan, what was taken', () => {
  const sim = new Sim({level: tiny([{id: 'kill', type: 'eliminate', label: 'Kill the guard'}]), seed: 6});
  const guard = sim.units.find(u => u.side === 'army');
  sim.damage(guard, sim.player, 999);
  sim.step(1 / 60, {});
  const d = sim.debrief();
  assert.equal(d.outcome, 'won');
  assert.equal(d.kills, 1);
  assert.equal(d.byPartisan.find(p => p.id === 'player').kills, 1);
  assert.deepEqual(
    d.objectives.map(o => o.state),
    ['done'],
  );
});

// ---------- WP-S3: squad orders ----------
const squadLevel = extra =>
  tiny([{id: 'h', type: 'hold', seconds: 999, label: 'wait'}], {
    cover: [],
    partisans: [
      {id: 'player', label: 'You', x: -10, z: 0},
      {id: 'mila', label: 'Mila', x: -12, z: 4},
      {id: 'dragan', label: 'Dragan', x: -14, z: -4},
    ],
    units: [],
    ...extra,
  });
const mate = (sim, id) => sim.units.find(u => u.id === id);

test('orders: move goes to the point then holds there; hold keeps the spot', () => {
  const sim = new Sim({level: squadLevel(), seed: 7});
  sim.step(1 / 60, {orders: [{ids: ['mila'], type: 'move', x: 5, z: 5}]});
  assert.equal(mate(sim, 'mila').order.type, 'move');
  steps(sim, 8);
  const m = mate(sim, 'mila');
  assert.ok(Math.hypot(m.x - 5, m.z - 5) < 0.6, `arrived (${m.x.toFixed(2)}, ${m.z.toFixed(2)})`);
  assert.equal(m.order.type, 'hold', 'then holds');
  sim.order(['dragan'], {type: 'hold'});
  const d = mate(sim, 'dragan');
  const at = [d.x, d.z];
  steps(sim, 2);
  assert.deepEqual([d.x, d.z], at);
  assert.ok(sim.callouts.some(c => c.text === 'Moving.') && sim.callouts.some(c => c.text === 'In position.'));
});

test('orders: follow keeps teammates in slots behind the player, at the player’s pace', () => {
  const sim = new Sim({level: squadLevel(), seed: 8});
  sim.order(['mila', 'dragan'], {type: 'follow'});
  steps(sim, 6, {mx: 1}); // walk east
  const p = sim.player;
  for (const id of ['mila', 'dragan']) {
    const u = mate(sim, id);
    assert.ok(Math.hypot(u.x - p.x, u.z - p.z) < 5, `${id} keeps up`);
    assert.ok(u.x < p.x, `${id} stays behind`);
  }
  steps(sim, 1, {mx: 1, sneak: true});
  assert.equal(mate(sim, 'mila').speed, p.speed, 'sneaks when you sneak');
});

test('orders: attack closes on the target and opens fire even before the alarm', () => {
  const sim = new Sim({level: squadLevel({units: [{id: 'g', name: 'Guard', role: 'rifleman', x: 15, z: 0, facing: 0}]}), seed: 9});
  sim.order(['mila'], {type: 'attack', target: 'g'});
  steps(sim, 12);
  const g = sim.units.find(u => u.id === 'g');
  assert.ok(
    sim.tracers.some(t => t.side === 'partisan'),
    'Mila fired',
  );
  assert.ok(!g.alive || sim.alarm, 'the attack sprang the ambush or killed the guard');
});

test('orders: cover only engages targets inside the sector', () => {
  const lvl = squadLevel({
    units: [
      {id: 'east', name: 'East', role: 'rifleman', x: 10, z: 4, facing: Math.PI},
      {id: 'south', name: 'South', role: 'rifleman', x: -12, z: 25, facing: -Math.PI / 2},
    ],
  });
  const sim = new Sim({level: lvl, seed: 10});
  sim.order(['mila'], {type: 'cover', angle: 0}); // watch east
  sim.raiseAlarm(null);
  const shotAt = new Set();
  const orig = sim.shoot.bind(sim);
  sim.shoot = (u, tx, tz, ...rest) => {
    if (u.id === 'mila') shotAt.add(Math.abs(tz - 25) < 3 ? 'south' : 'east');
    return orig(u, tx, tz, ...rest);
  };
  steps(sim, 4);
  assert.ok(shotAt.has('east'), 'engages the soldier in the sector');
  assert.ok(!shotAt.has('south'), 'never turns to the south soldier');
});
