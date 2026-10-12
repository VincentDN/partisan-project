// A paused map releases its GPU budget while camera input, resize and active travel remain immediate.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRenderBudget} from '../map/render-budget.js';
test('idle map renders twice per second after the initial frame', () => {
  const next = createRenderBudget();
  const idle = {active: false, cameraMoving: false};
  assert.equal(next(0, idle), true);
  for (let time = 16; time < 500; time += 16) assert.equal(next(time, idle), false);
  assert.equal(next(500, idle), true);
  assert.equal(next(999, idle), false);
  assert.equal(next(1000, idle), true);
});
test('movement and resize wake the renderer without waiting for the idle interval', () => {
  const next = createRenderBudget();
  assert.equal(next(0, {active: false, cameraMoving: false}), true);
  assert.equal(next(16, {active: true, cameraMoving: false}), true);
  assert.equal(next(32, {active: false, cameraMoving: true}), true);
  assert.equal(next(48, {active: false, cameraMoving: false, dirty: true}), true);
  assert.equal(next(64, {active: false, cameraMoving: false}), false);
});
