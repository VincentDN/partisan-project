// Day and night on the campaign map (WP-W4, shared/campaign/daylight.js): full light by day, none at night, eased at
// dawn and dusk; the band sees less far in the dark.
import test from 'node:test';
import assert from 'node:assert/strict';
import {daylight, sightRange, SIGHT_DAY, SIGHT_NIGHT} from '../shared/campaign/daylight.js';

test('day, night, dawn and dusk', () => {
  for (const h of [7, 8, 12, 17.9]) assert.equal(daylight(h), 1, `${h}:00 is day`);
  for (const h of [21, 23, 0, 3, 4.9]) assert.equal(daylight(h), 0, `${h}:00 is night`);
  assert.ok(daylight(6) > 0 && daylight(6) < 1, 'dawn');
  assert.ok(daylight(19.5) > 0 && daylight(19.5) < 1, 'dusk');
  for (let h = 5; h < 7; h += 0.25) assert.ok(daylight(h + 0.25) >= daylight(h), 'dawn only brightens');
  for (let h = 18; h < 21; h += 0.25) assert.ok(daylight(h + 0.25) <= daylight(h), 'dusk only darkens');
  assert.equal(daylight(36), daylight(12), 'hours wrap');
});

test('sight shrinks at night', () => {
  assert.equal(sightRange(12), SIGHT_DAY);
  assert.equal(sightRange(0), SIGHT_NIGHT);
  assert.ok(sightRange(19.5) < SIGHT_DAY && sightRange(19.5) > SIGHT_NIGHT);
});
