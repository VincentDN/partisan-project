// Heightfield picking hits land for vertical/oblique rays and rejects rays pointing away or missing the island.
import test from 'node:test';
import assert from 'node:assert/strict';
import {bakeHeights, sample} from '../map/island.js';
import {pickGround} from '../map/picking.js';
const field = bakeHeights();
test('vertical and oblique rays hit the sampled ground', () => {
  for (const [x, z] of [
    [0, 0],
    [-160, 40],
    [78, -20],
    [440, 320],
  ]) {
    for (const dx of [0, 0.1, -0.1]) {
      const hit = pickGround(field, {origin: {x, y: 200, z}, direction: {x: dx, y: -1, z: 0}});
      assert.ok(hit);
      assert.ok(Math.abs(hit.point.y - sample(field, hit.point.x, hit.point.z)) < 0.002);
    }
  }
});
test('rays away from the island have no hit', () => {
  assert.equal(pickGround(field, {origin: {x: 600, y: 200, z: 0}, direction: {x: 0, y: -1, z: 0}}), null);
  assert.equal(pickGround(field, {origin: {x: 0, y: 200, z: 0}, direction: {x: 0, y: 1, z: 0}}), null);
});
