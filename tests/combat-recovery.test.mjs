// Looted weapons use their own rounds; post-victory walking cannot restart combat or duplicate mission rewards.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Sim} from '../convoy/sim.js';
import {attachAmmo} from '../convoy/kit-ammo.js';
import {createCatalogue} from '../shared/inventory/catalogue.js';
import {loadedRounds} from '../shared/inventory/ammo.js';
import {recoveryStep, recoverySwitch} from '../convoy/recovery.js';
const cat = createCatalogue(JSON.parse(fs.readFileSync('convoy/data/inventory-items.json')));
for (const campaign of [false, true])
  test(`looted primary and secondary fire independent owned rounds, campaign=${campaign}`, () => {
    const sim = new Sim(),
      a = attachAmmo(sim, cat, {campaign}),
      u = sim.player,
      k = a.kitOf(u);
    k.primary = a.factory.issue('ak').primary;
    k.secondary = a.factory.issue('svd').primary;
    a.sync(u);
    const primary = loadedRounds(k.primary),
      secondary = loadedRounds(k.secondary);
    assert.ok(a.selectSlot(u, 1));
    assert.equal(u.weapon, 'svd');
    sim.ammo.fired(u, 'svd');
    assert.equal(loadedRounds(k.secondary), secondary - 1);
    assert.equal(loadedRounds(k.primary), primary);
    assert.ok(a.selectSlot(u, 0));
    assert.equal(u.weapon, 'ak');
    sim.ammo.fired(u, 'ak');
    assert.equal(loadedRounds(k.primary), primary - 1);
    k.secondary = a.factory.issue('ak').primary;
    a.sync(u);
    a.selectSlot(u, 1);
    sim.ammo.fired(u, 'ak');
    assert.equal(loadedRounds(k.primary), primary - 1, 'same-type secondary does not spend primary rounds');
    u.reload = 2;
    u.reloading = 'ak';
    k.secondary = a.factory.issue('ak').primary;
    a.sync(u);
    assert.equal(u.reload, 0, 'swapping same type cancels the previous physical weapon reload');
    k.secondary = null;
    k.primary = null;
    a.sync(u);
    assert.equal(u.mags[u.weapon], 0);
  });
test('victory allows collision-bounded movement and survivor switching but freezes battle time and damage', () => {
  const s = new Sim();
  s.outcome = 'won';
  const x = s.player.x,
    hp = s.units.map(u => u.hp),
    time = s.time;
  for (let i = 0; i < 60; i++) recoveryStep(s, 1 / 60, {mx: 1, mz: 0, fire: true, grenade: true});
  assert.notEqual(s.player.x, x);
  assert.equal(s.time, time);
  assert.deepEqual(
    s.units.map(u => u.hp),
    hp,
  );
  assert.equal(s.outcome, 'won');
  const first = s.player;
  assert.ok(recoverySwitch(s));
  assert.notEqual(s.player, first);
  s.player.alive = false;
  recoveryStep(s, 0, {});
  assert.ok(s.player.alive);
  s.outcome = 'lost';
  const last = s.player.x;
  recoveryStep(s, 1, {mx: 1});
  assert.equal(s.player.x, last);
});
