// Hunters and sight (WP-W7, shared/campaign/hunt.js): heat turns the columns out; a column sees the band less far at
// night, in forest and when the band is small; it chases what it sees, else the last-seen point, searches there and
// loses the trail (the heat cools); every fight tells the columns where the band was; the log gives hunts per day.
import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign, normalize} from '../shared/campaign/state.js';
import {COLUMNS, spotRange, bandSight, isOut, alert, huntMetrics, SEARCH_SECONDS, LOST_HEAT, SPOT_DAY} from '../shared/campaign/hunt.js';
import {pursue} from '../shared/campaign/defence.js';
import {readResults, SOURCES} from '../shared/campaign/contacts.js';
import {logEvent} from '../shared/campaign/state.js';
import {createWorld} from '../shared/campaign/world.js';

const at = h => {
  const c = newCampaign({id: 'w7'});
  c.world.clock.hour = h;
  return c;
};

test('how far a column sees the band: less at night, in forest, and for a small band', () => {
  const day = spotRange(at(12)),
    night = spotRange(at(0));
  assert.equal(day, SPOT_DAY);
  assert.ok(night < day / 2, `night ${night} < day ${day}`);
  assert.ok(spotRange(at(12), {ground: 'forest'}) < day * 0.6, 'forest hides');
  assert.ok(spotRange(at(12), {size: 6}) < day && spotRange(at(12), {size: 12}) > day, 'size shows');
  assert.ok(bandSight(at(12), {ground: 'forest'}) < bandSight(at(12)), 'the band sees less from a forest');
});

test('heat turns the columns out: the raiders at 20, the Orion column at 50', () => {
  const c = newCampaign();
  assert.deepEqual(Object.keys(COLUMNS), ['raiders', 'orion-hunters']);
  for (const id of Object.keys(COLUMNS)) assert.equal(SOURCES[id].kind, 'hunters');
  c.world.heat = 30;
  assert.deepEqual([isOut(c, 'raiders'), isOut(c, 'orion-hunters')], [true, false]);
  c.world.heat = 50;
  assert.equal(isOut(c, 'orion-hunters'), true);
});

test('a column chases what it sees, then the last-seen point, searches, and loses the trail', () => {
  const c = at(12),
    home = [0, 0];
  c.world.heat = 30;
  const band = {x: 60, z: 0};
  const first = pursue(c, 'raiders', home, band, 1, {spot: 100});
  assert.equal(first.event, 'spotted');
  assert.equal(c.log.at(-1).kind, 'hunt');
  assert.equal(first.hunting, true);
  // the band slips away out of sight: they make for where they saw it
  band.x = 400;
  pursue(c, 'raiders', home, band, 1, {spot: 100});
  const h = c.world.hunters.raiders;
  assert.deepEqual(h.seen, {x: 60, z: 0}, 'the last-seen point');
  let lost = null;
  for (let i = 0; i < 400 && !lost; i++) lost = pursue(c, 'raiders', home, band, 0.25, {spot: 100}).event === 'lost' || null;
  assert.ok(lost, 'they lose the trail');
  assert.ok(Math.hypot(h.x - 60, h.z) < 3, 'after searching where it was seen');
  assert.equal(c.world.heat, 30 - LOST_HEAT, 'the heat cools');
  assert.equal(c.log.at(-1).kind, 'hunt-lost');
  assert.equal(h.seen, null);
  const back = pursue(c, 'raiders', home, band, 30, {spot: 100});
  assert.equal(back.hunting, false, 'no lead: home');
  assert.ok(SEARCH_SECONDS > 0);
});

test('with no lead and the band out of sight, a column waits at its post; a fight gives it one', () => {
  const c = at(12);
  c.world.heat = 30;
  const band = {x: 500, z: 0};
  const r = pursue(c, 'raiders', [0, 0], band, 5, {spot: 100});
  assert.deepEqual([r.x, r.z, r.hunting], [0, 0, false]);
  // a won ambush 200 units off: the result tells every column where it happened
  logEvent(c, {kind: 'result', source: 'supply-convoy', outcome: 'won', at: {x: 200, z: 0}});
  readResults(c);
  assert.deepEqual(c.world.hunters.raiders.seen, {x: 200, z: 0});
  assert.deepEqual(c.world.hunters['orion-hunters'].seen, {x: 200, z: 0}, 'the Orion column knows too');
  const r2 = pursue(c, 'raiders', [0, 0], band, 5, {spot: 100});
  assert.ok(r2.hunting && r2.x > 0, 'they march on the place of the fight');
  assert.deepEqual(normalize(JSON.parse(JSON.stringify(c))).world.hunters.raiders, c.world.hunters.raiders, 'kept in the save');
});

test('in the world: a band in forest at night is not spotted where it would be by day in the open', () => {
  const run = hour => {
    const c = at(hour);
    c.world.heat = 30;
    c.world.party = {x: 0, z: 0, route: null};
    const w = createWorld(c, {hunters: {raiders: [70, 0]}});
    w.step(0.1);
    return c.world.hunters.raiders?.seen || null;
  };
  assert.ok(run(12), 'by day, 70 units off: seen');
  assert.equal(run(1), null, 'at night: not seen');
});

test('hunts per day from the log', () => {
  const c = newCampaign();
  c.world.clock.day = 3;
  for (let i = 0; i < 3; i++) logEvent(c, {kind: 'hunt', source: 'raiders'});
  logEvent(c, {kind: 'hunt-lost', source: 'raiders'});
  assert.deepEqual(huntMetrics(c), {days: 2.3, hunts: 3, lost: 1, perDay: 1.29});
  alert(c, {x: 'bad'});
});
