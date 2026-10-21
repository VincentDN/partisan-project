// The campaign prologue has an explicit silent beat and saves completion without replaying legacy campaigns.
import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign, normalize} from '../shared/campaign/state.js';
import {openingBeat, OPENING_LINES, OPENING_DURATION} from '../map/campaign-opening.js';
test('opening makes room for the island fade and a dramatic pause before the final call', () => {
  assert.equal(openingBeat(0), -1);
  assert.equal(openingBeat(2), 0);
  assert.equal(openingBeat(7), 1);
  assert.equal(openingBeat(12), 2);
  assert.equal(openingBeat(15.5), -1);
  assert.equal(openingBeat(18), 3);
  assert.ok(OPENING_DURATION - 16.5 >= 5, 'final call is held long enough to read');
  assert.equal(OPENING_LINES[3], 'DRIVE OUT THE INVADER\nAND FREE YANTIS!');
});
test('new and interrupted introductions persist; completed and legacy saves resume normally', () => {
  const c = newCampaign();
  assert.equal(normalize(JSON.stringify(c)).world.openingSeen, false);
  c.world.openingSeen = true;
  assert.equal(normalize(JSON.stringify(c)).world.openingSeen, true);
  delete c.world.openingSeen;
  assert.equal(normalize(JSON.stringify(c)).world.openingSeen, true);
});
