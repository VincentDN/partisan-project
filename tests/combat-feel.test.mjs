// RimWorld-style shooting: rounds fly and land on arrival, the trigger fires at once, hit chance falls with range.
import test from 'node:test';
import assert from 'node:assert/strict';
import {Sim} from '../convoy/sim.js';
import {WEAPONS} from '../convoy/weapons.js';

// The renderer module draws on a canvas; only its pure hit-chance function is tested here.
const {hitChance} = await import('../convoy/sprite-render.js');

test('a round is in flight before it lands, and the hit lands on arrival', () => {
  const s = new Sim({level: 'convoy', seed: 4});
  const p = s.player,
    o = s.units.find(u => u.side === 'army');
  Object.assign(o, {x: p.x + 30, z: p.z, state: 'engage'});
  Object.assign(p, {facing: 0, cd: 0});
  const hp = o.hp;
  // aim dead on, with no spread: the round must hit
  const spread = WEAPONS.ak.spread;
  WEAPONS.ak.spread = 0;
  try {
    s.shoot(p, o.x, o.z);
  } finally {
    WEAPONS.ak.spread = spread;
  }
  assert.equal(s.projectiles.length, 1, 'one round in flight');
  assert.equal(o.hp, hp, 'no damage before it arrives');
  const flight = s.projectiles[0].t1 - s.projectiles[0].t0;
  assert.ok(Math.abs(flight - 30 / WEAPONS.ak.speed) < 0.05, 'flies at the weapon speed');
  s.resolveProjectiles(Infinity);
  assert.ok(o.hp < hp, 'damage on arrival');
  assert.equal(s.impacts.at(-1).surface, 'flesh');
});

test('the player fires on the first frame of a trigger pull (no wait before shooting)', () => {
  const s = new Sim({level: 'convoy', seed: 5});
  const p = s.player;
  s.step(1 / 60, {ax: p.x + 20, az: p.z, fire: true});
  assert.equal(s.tracers.filter(t => t.unit === p.id).length, 1);
});

test('hit chance falls with range and with suppression', () => {
  const u = {x: 0, z: 0, supp: 0},
    W = WEAPONS.ak;
  const at = d => hitChance(u, {x: d, z: 0, r: 0.4}, W);
  assert.ok(at(5) > at(20) && at(20) > at(50));
  assert.ok(at(5) > 0.9 && at(5) <= 1);
  assert.equal(at(W.range + 1), 0);
  const calm = at(25);
  u.supp = 1;
  assert.ok(at(25) < calm);
});
