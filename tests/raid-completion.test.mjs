// Explicit Roadblock departure cannot bypass live guards and does not remove the looting window.
import test from 'node:test';
import assert from 'node:assert/strict';
import {Sim} from '../convoy/sim.js';
import {finishRoadblock, securedRoadblock} from '../convoy/raid-completion.js';
test('Roadblock departure is available only after all guards are defeated', () => {
  const sim = new Sim({level: 'roadblock', seed: 7});
  assert.equal(finishRoadblock(sim), false);
  for (const u of sim.units.filter(u => u.side === 'army')) sim.damage(u, sim.player, 1000);
  sim.checkOutcome();
  assert.equal(sim.outcome, null, 'still able to loot');
  assert.ok(securedRoadblock(sim));
  assert.ok(finishRoadblock(sim));
  assert.equal(sim.outcome, 'won');
  assert.equal(finishRoadblock(sim), false, 'cannot finish twice');
});
test('Roadblock shortcut does not complete other mission types', () => {
  assert.equal(finishRoadblock(new Sim({level: 'convoy'})), false);
});
