// A short fuzz run (WP-QA1): every level, two seeds, 25 simulated seconds of random play with real ammunition on both
// sides; no invariant may break. The long run: node tests/fuzz/fuzz.mjs (see tests/fuzz/fuzz.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import {fuzz, fight} from './fuzz/fuzz.mjs';

test('random fights on every level break no invariant', () => {
  const problems = fuzz({seeds: 2, seconds: 25});
  assert.deepEqual(
    problems.map(p => `${p.kind} · ${p.level} seed ${p.seed} · ${p.detail}`),
    [],
  );
});

test('the fuzzer catches what it is meant to: an item in two places, counters drifting from the kit', () => {
  const kinds = new Set();
  fight(
    'checkpoint',
    1,
    3,
    k => kinds.add(k),
    (sim, A, i) => {
      if (i !== 60) return;
      const rig = A.kitOf(sim.player).rig.grids.find(g => g.items.length);
      [...A.searched.values()][0].container.grids[0].items.push({item: rig.items[0].item, x: 7, y: 5}); // copied, not moved
      sim.player.reserve[sim.player.weapon] += 7;
    },
  );
  assert.ok(kinds.has('an item in two places'), [...kinds].join(', '));
  assert.ok(kinds.has('ammunition counters drift from the kit'));
});
