// The soundscape's pure parts (placement, gun and reload tables) and the sound events the simulation queues.
import test from 'node:test';
import assert from 'node:assert/strict';
import {GUNS, RELOADS, spatial, segmentDistance} from '../convoy/soundscape.js';
import {WEAPONS} from '../convoy/weapons.js';
import {Sim} from '../convoy/sim.js';

test('every weapon has a gun voice and a reload choreography in order', () => {
  for (const id of Object.keys(WEAPONS)) {
    assert.ok(GUNS[id], `gun voice for ${id}`);
    const steps = RELOADS[id];
    assert.ok(steps?.length, `reload for ${id}`);
    for (let i = 1; i < steps.length; i++) assert.ok(steps[i][0] > steps[i - 1][0], `${id} reload steps in order`);
    assert.ok(steps.every(([t]) => t > 0 && t < 1));
  }
});

test('distance quietens, dulls, delays and pans a sound', () => {
  const near = spatial(0, 0, 2, 0),
    far = spatial(0, 0, 80, 0),
    left = spatial(0, 0, -30, 0);
  assert.ok(near.gain > far.gain);
  assert.ok(near.cutoff > far.cutoff);
  assert.ok(far.delay > near.delay && far.delay <= 0.4);
  assert.ok(Math.abs(far.delay - 80 / 343) < 1e-9, 'sound travels at 343 m/s');
  assert.ok(near.pan > 0 && left.pan < 0 && Math.abs(left.pan) <= 1);
});

test('segmentDistance finds the closest pass of a round', () => {
  const p = segmentDistance(5, 2, 0, 0, 10, 0);
  assert.ok(Math.abs(p.d - 2) < 1e-9 && Math.abs(p.t - 0.5) < 1e-9);
  assert.equal(segmentDistance(-5, 0, 0, 0, 10, 0).t, 0);
});

test('the simulation queues shots, impacts, explosions, reloads and deaths, and caps the queue', () => {
  const sim = new Sim({level: 'convoy', seed: 7});
  while (!sim.vehicles[0].stopped && sim.time < 60) sim.step(1 / 60, {});
  const v = sim.vehicles[1];
  const types = new Set();
  for (let i = 0; i < 1800 && !sim.outcome; i++) {
    sim.step(1 / 60, {ax: v.x, az: v.z, fire: true, weapon: i > 240 ? 'rpg' : 'ak'});
    for (const e of sim.sounds) types.add(e.type);
    assert.ok(sim.sounds.length <= 400);
  }
  for (const t of ['shot', 'impact', 'reload', 'explode', 'alarm', 'switch']) assert.ok(types.has(t), `${t} event`);
  const shot = sim.sounds.find(e => e.type === 'shot') || {weapon: 'ak', x: 0, z: 0, x1: 0, z1: 0, t: 0};
  for (const k of ['weapon', 'x', 'z', 'x1', 'z1', 't']) assert.ok(k in shot, `shot carries ${k}`);
});
