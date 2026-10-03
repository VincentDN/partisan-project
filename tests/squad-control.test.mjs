// Whole-squad control preserves identity, finite state and orders while death transfers agency instead of ending a raid.
import test from 'node:test';
import assert from 'node:assert/strict';
import {Sim} from '../convoy/sim.js';
import {controlCandidates} from '../convoy/squad-control.js';

const get = (sim, id) => sim.units.find(u => u.id === id);
test('swap preserves each rebel object, health, ammo, cooldowns and in-progress reload', () => {
  const sim = new Sim({seed: 5});
  const old = sim.player,
    mila = get(sim, 'mila');
  Object.assign(mila, {hp: 57, reload: 1.3, reloading: 'svd', cd: 0.2, supp: 0.4});
  mila.mags.svd = 3;
  const before = {hp: mila.hp, mags: {...mila.mags}, reserve: {...mila.reserve}, reload: mila.reload, cd: mila.cd};
  assert.ok(sim.requestSwap());
  assert.ok(sim.swapTo('mila'));
  assert.equal(sim.player, mila);
  assert.equal(sim.active, mila);
  assert.equal(old.id, 'player');
  assert.deepEqual({hp: mila.hp, mags: mila.mags, reserve: mila.reserve, reload: mila.reload, cd: mila.cd}, before);
  assert.equal(old.order.type, 'hold');
  assert.equal(old.order.x, old.x);
  assert.equal(sim.swapTo('dragan'), false, 'cannot bypass voluntary cooldown');
  sim.time += 3;
  sim.order(['player'], {type: 'follow'});
  sim.swapTo('player');
  sim.time += 3;
  sim.swapTo('dragan');
  assert.equal(old.order.type, 'follow', 'standing order resumes after manual control');
});

test('invalid selection cannot grant control to enemies, dead, escaped or missing units', () => {
  const sim = new Sim();
  get(sim, 'mila').alive = false;
  get(sim, 'dragan').escaped = true;
  for (const id of ['mila', 'dragan', 'lead-0', 'missing', 'player']) assert.equal(sim.swapTo(id), false);
  assert.equal(sim.requestSwap(), false);
});

test('active rebel death requests forced choice and all-down alone loses the mission', () => {
  const sim = new Sim();
  sim.swapTo('mila');
  sim.damage(sim.player, get(sim, 'lead-0'), 999);
  sim.checkOutcome();
  assert.equal(sim.outcome, null);
  assert.ok(sim.control.pending.forced);
  assert.equal(sim.cancelSwap(), false);
  assert.ok(sim.swapTo('dragan'), 'forced selection bypasses cooldown');
  assert.equal(sim.player.id, 'dragan');
  sim.damage(get(sim, 'player'), get(sim, 'lead-0'), 999);
  sim.damage(sim.player, get(sim, 'lead-0'), 999);
  sim.checkOutcome();
  assert.equal(sim.outcome, 'lost');
  assert.equal(sim.control.pending, null);
});

test('host-time timeout selects nearest living rebel deterministically; cancellation never changes kit', () => {
  const sim = new Sim();
  get(sim, 'mila').x = sim.player.x + 1;
  get(sim, 'mila').z = sim.player.z;
  sim.requestSwap();
  assert.equal(sim.advanceSwap(NaN), false);
  sim.advanceSwap(2.4);
  assert.equal(sim.player.id, 'player');
  sim.advanceSwap(0.2);
  assert.equal(sim.player.id, 'mila');
  sim.time += 3;
  sim.requestSwap();
  sim.cancelSwap();
  sim.advanceSwap(100);
  assert.equal(sim.player.id, 'mila');
});

test('orders target only inactive rebels; movement input follows the new active object', () => {
  const sim = new Sim();
  const old = sim.player;
  sim.swapTo('mila');
  sim.order(['mila', 'player'], {type: 'follow'});
  assert.equal(sim.player.order, undefined, 'active rebel ignores orders');
  assert.equal(old.order.type, 'follow');
  assert.ok(!controlCandidates(sim).includes(sim.player));
  const x = sim.player.x;
  sim.step(1 / 60, {mx: 1});
  assert.ok(sim.player.x > x);
});

test('a failed named protect objective still ends the mission even when other rebels survive', () => {
  const sim = new Sim();
  sim.objectives.find(o => o.id === 'alive').optional = false;
  get(sim, 'mila').alive = false;
  sim.checkOutcome();
  assert.equal(sim.outcome, 'lost');
});

test('named roster levels do not need a character with id player; no free search completion on swapping', () => {
  const source = new Sim().level;
  const sim = new Sim({
    level: {
      ...source,
      partisans: [
        {id: 'asha', label: 'Asha', x: 0, z: -20},
        {id: 'mila', label: 'Mila', x: 2, z: -20},
      ],
    },
  });
  assert.equal(sim.player.id, 'asha');
  const searching = {progress: 2};
  sim.player.searching = searching;
  sim.swapTo('mila');
  assert.equal(searching.progress, 0);
  assert.equal(get(sim, 'asha').searching, null);
});
