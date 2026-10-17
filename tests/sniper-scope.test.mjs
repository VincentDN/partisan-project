// Extended sight is directional, local to the controlled sniper, and still blocked by geometry.
import test from 'node:test';
import assert from 'node:assert/strict';
import {beginScope, validScope, moveScope, sightRange} from '../convoy/sniper-scope.js';
import {Sim} from '../convoy/sim.js';
import {perceive} from '../convoy/ai-sense.js';

test('scope requires a precision weapon; changing weapon or fighter invalidates it', () => {
  const u = {id: 'mila', cls: 'marksman', alive: true, weapon: 'hunting', x: 0, z: 0};
  const s = beginScope(u, {x: 10, z: 0});
  assert.equal(s.x, 45);
  assert.ok(validScope(s, u));
  assert.equal(validScope(s, {...u, id: 'player'}), false);
  assert.equal(validScope(s, {...u, weapon: 'ak'}), false);
  assert.equal(beginScope({...u, cls: 'insurgent'}, {x: 10, z: 0}), null);
  moveScope(s, u, 1000, 1000);
  assert.ok(Math.hypot(s.x, s.z) <= 85.001);
});

test('scope reveals distant targets in its cone, never through cover or for other soldiers', () => {
  const sim = new Sim();
  const p = sim.player;
  p.weapon = 'svd';
  p.x = p.z = 0;
  const target = sim.units.find(u => u.side === 'army');
  target.x = 60;
  target.z = 0;
  target.alive = true;
  sim.enemiesOf = () => [target];
  sim.onScreen = () => true;
  sim.los = () => true;
  perceive(sim, p);
  assert.equal(p.visible.length, 0);
  sim.scope = beginScope(p, target);
  perceive(sim, p);
  assert.deepEqual(p.visible, [target]);
  assert.equal(sightRange(sim, p, Math.PI), sim.vision);
  assert.equal(sightRange(sim, {...p, id: 'other'}, 0), sim.vision);
  sim.los = () => false;
  perceive(sim, p);
  assert.equal(p.visible.length, 0);
  sim.scope = null;
  sim.los = () => true;
  perceive(sim, p);
  assert.equal(p.visible.length, 0);
});
