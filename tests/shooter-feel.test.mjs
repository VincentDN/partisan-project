// Partisan Tactical: sprint, hand grenades, exploding vehicles, and difficulty thinning the army (convoy/sim.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import {Sim, thinLevel, GRENADES} from '../convoy/sim.js';
import {LEVELS} from '../convoy/levels/index.js';
import {DIFFICULTY} from '../convoy/difficulty.js';

const army = s => s.units.filter(u => u.side === 'army').length;

test('difficulty thins the army: fewer soldiers on easier settings, the key roles always come', () => {
  const counts = Object.keys(DIFFICULTY).map(d => army(new Sim({level: 'compound', difficulty: d})));
  for (let i = 1; i < counts.length; i++) assert.ok(counts[i] >= counts[i - 1], `${counts}`);
  assert.equal(counts.at(-1), army(new Sim({level: 'compound'})), 'brutal is the whole level');
  assert.ok(counts[0] < counts.at(-1));
  for (const id of Object.keys(LEVELS)) {
    const full = new Sim({level: id}),
      easy = new Sim({level: id, difficulty: 'easy'});
    for (const role of ['leader', 'rto', 'turret'])
      assert.equal(
        easy.units.filter(u => u.side === 'army' && u.role === role).length,
        full.units.filter(u => u.side === 'army' && u.role === role).length,
        `${id}: every ${role} comes`,
      );
  }
  assert.equal(thinLevel(LEVELS.cave, 1), LEVELS.cave, 'force 1 leaves the level alone');
  assert.ok(
    LEVELS.convoy.convoy.vehicles.every(v => v.crew.length > 0),
    'the level data is not changed',
  );
});

test('Shift sprints until the stamina runs out, then it is a run again', () => {
  const s = new Sim({seed: 3});
  const p = s.player,
    x0 = p.x;
  s.step(1 / 60, {mx: 1, sprint: true});
  assert.equal(p.sprinting, true);
  for (let i = 0; i < 60 * 6; i++) s.step(1 / 60, {mx: 1, sprint: true});
  assert.equal(p.sprinting, false, 'out of breath');
  assert.ok(p.stamina < 0.1);
  assert.ok(p.x > x0);
  for (let i = 0; i < 60 * 4; i++) s.step(1 / 60, {});
  assert.ok(p.stamina > 0.5, 'it comes back resting');
});

test('G throws a hand grenade that arcs over cover and bursts where it lands', () => {
  const s = new Sim({seed: 3});
  const p = s.player;
  assert.equal(p.grenades, GRENADES);
  s.step(1 / 60, {ax: p.x + 15, az: p.z, grenade: true});
  assert.equal(p.grenades, GRENADES - 1);
  assert.equal(s.projectiles.length, 1);
  assert.equal(s.projectiles[0].lob, true);
  s.step(1 / 60, {ax: p.x + 15, az: p.z, grenade: true});
  assert.equal(p.grenades, GRENADES - 1, 'one at a time');
  const before = s.explosions.length;
  for (let i = 0; i < 60 * 3; i++) s.step(1 / 60, {});
  assert.equal(s.explosions.length, before + 1);
  const e = s.explosions.at(-1);
  assert.ok(Math.hypot(e.x - (p.x + 15), e.z - p.z) < 6, 'near the aim point');
  // out of range: it falls short at its range
  const s2 = new Sim({seed: 3});
  s2.throwGrenade(s2.player, s2.player.x + 100, s2.player.z);
  assert.ok(Math.hypot(s2.projectiles[0].x1 - s2.player.x, s2.projectiles[0].z1 - s2.player.z) < 31);
});

test('a destroyed vehicle explodes: it hurts whoever is near, burns, and can set off the next one', () => {
  const s = new Sim({seed: 3});
  const [a, b] = s.vehicles;
  // park the second vehicle right behind the first and a soldier beside it
  Object.assign(b, {x: a.x - a.w / 2 - b.w / 2 - 0.5, z: a.z});
  const foot = s.units.find(u => u.side === 'army');
  Object.assign(foot, {state: 'guard', x: a.x, z: a.z + a.d / 2 + 1.5, hp: 100});
  b.hp = 100;
  const hp = foot.hp;
  s.damageVehicle(a, 9999, s.player);
  assert.equal(a.destroyed, true);
  assert.ok(a.burningUntil > s.time, 'it burns');
  assert.ok(foot.hp < hp, 'the blast hurts the soldier beside it');
  assert.equal(b.destroyed, true, 'and sets off the vehicle behind');
  assert.ok(s.explosions.length >= 2);
});
