// Larger campaign approaches preserve objectives, provide reachable staging and avoid immediate spawn combat.
import test from 'node:test';
import assert from 'node:assert/strict';
import {LEVELS} from '../convoy/levels/index.js';
import {campaignApproach} from '../convoy/levels/approach.js';
import {Sim, inBox} from '../convoy/sim.js';
import {reachable} from '../convoy/pathfind.js';
for (const id of ['roadblock', 'convoy', 'forest-road', 'compound', 'checkpoint', 'village']) {
  test(`${id}: covered campaign approach is larger, reachable and quiet at deployment`, () => {
    const original = JSON.stringify(LEVELS[id]),
      base = LEVELS[id],
      level = campaignApproach(base);
    const area = l => (l.bounds.maxX - l.bounds.minX) * (l.bounds.maxZ - l.bounds.minZ);
    assert.ok(area(level) > area(base));
    assert.deepEqual(level.objectives, base.objectives);
    assert.ok(level.approach.distance >= 32);
    assert.ok(level.cover.length > base.cover.length);
    const sim = new Sim({level, seed: 7});
    for (const u of sim.units.filter(u => u.side === 'partisan')) {
      assert.ok(!level.cover.some(b => inBox(u.x, u.z, b, u.r)), `${u.id} starts clear`);
      assert.ok(reachable(sim, u.x, u.z, level.approach.rally.x, level.approach.rally.z), `${u.id} can reach the original attack line`);
    }
    for (let i = 0; i < 480; i++) sim.step(1 / 60, {});
    assert.ok(!sim.alarm, 'no immediate combat while staging');
    const before = {x: sim.player.x, z: sim.player.z};
    const dx = level.approach.rally.x - before.x,
      dz = level.approach.rally.z - before.z,
      length = Math.hypot(dx, dz);
    for (let i = 0; i < 240; i++) sim.step(1 / 60, {mx: dx / length, mz: dz / length});
    assert.ok(Math.hypot(sim.player.x - before.x, sim.player.z - before.z) > 10, 'can walk into the approach');
    assert.ok(!sim.alarm, 'first four seconds of approach remain quiet');
    assert.equal(JSON.stringify(base), original, 'authored mission not mutated');
    assert.equal(campaignApproach(level), level, 'not expanded twice');
  });
}
test('timed defence missions retain their authored preparation and spawn positions', () => {
  for (const id of ['cave', 'hilltop']) assert.equal(campaignApproach(LEVELS[id]), LEVELS[id]);
});
