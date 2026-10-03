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
