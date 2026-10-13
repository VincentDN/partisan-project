// The encounter's other choices (WP-W8): prepare an ambush (two hours, then the fight starts behind sandbags) against
// convoys and hunters; withdraw leaving a rearguard when hunters have caught the band (the rearguard is wounded, the
// hunters go home and rest twelve hours); leaving is not possible once hunters are on the band.
import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign, normalize} from '../shared/campaign/state.js';
import {encounterFor, SOURCES} from '../shared/campaign/contacts.js';
import {HEAL_WOUNDED} from '../shared/campaign/encounter.js';
import {pursue} from '../shared/campaign/defence.js';
import {stancesFor, caughtBy, prepare, withdrawWithRearguard, resting, PREPARE_HOURS} from '../shared/campaign/stances.js';
import {vary} from '../convoy/levels/variants.js';
import {LEVELS} from '../convoy/levels/index.js';
import {Sim, inBox} from '../convoy/sim.js';

test('stances: what each contact offers', () => {
  assert.deepEqual(stancesFor('convoy'), {prepare: true, rearguard: false, leave: true});
  assert.deepEqual(stancesFor('post'), {prepare: false, rearguard: false, leave: true});
  assert.deepEqual(stancesFor('settlement'), {prepare: false, rearguard: false, leave: true});
  assert.deepEqual(stancesFor('hunters', {caught: true}), {prepare: true, rearguard: true, leave: false}, 'caught: no leaving');
  assert.deepEqual(stancesFor('hunters', {caught: false}), {prepare: true, rearguard: false, leave: true}, 'at their post: walk away');
  const c = newCampaign();
  assert.equal(caughtBy(c, 'raiders'), false);
  c.world.hunters.raiders = {x: 0, z: 0, hunting: true};
  assert.equal(caughtBy(c, 'raiders'), true);
});

test('stances: preparing takes two hours and the fight starts behind sandbags', () => {
  const c = newCampaign();
  c.band.fighters.mila.wounded = true;
  c.band.fighters.mila.healIn = 10;
  const e = encounterFor(c, 'supply-convoy', SOURCES['supply-convoy']);
  const hour = c.world.clock.hour;
  prepare(c, e);
  assert.equal(c.world.clock.hour, hour + PREPARE_HOURS, 'the clock moved on');
  assert.equal(c.band.fighters.mila.healIn, 10 - PREPARE_HOURS, 'and wounds healed a little');
  assert.equal(e.variant.prepared, true);
  assert.equal(e.variant.ambush, 'roadblock', 'the ambush start is kept');
  const L = vary(LEVELS.convoy, {...e.variant, seed: 3});
  assert.equal(L.prepared, true);
  assert.match(L.brief, /two hours to dig in/);
  const sim = new Sim({level: L, seed: 3});
  const rebels = sim.units.filter(u => u.side === 'partisan');
  const bags = sim.fieldworks.filter(f => f.kind === 'sandbag');
  assert.equal(bags.length, rebels.length, 'a wall in front of every fighter');
  for (const u of rebels) assert.ok(!bags.some(b => inBox(u.x, u.z, b, 0.3)), `${u.id} is not standing in one`);
  const plain = new Sim({level: vary(LEVELS.convoy, {seed: 3}), seed: 3});
  assert.equal(plain.fieldworks.length, 0, 'an unprepared fight starts in the open');
});

test('stances: a rearguard lets the band get away; the hunters go home and rest', () => {
  const c = newCampaign();
  c.world.heat = 40;
  const home = [-80, 24],
    band = {x: -150, z: 30};
  pursue(c, 'raiders', home, band, 5);
  assert.equal(caughtBy(c, 'raiders'), true);
  withdrawWithRearguard(c, 'raiders', 'dragan', home);
  assert.equal(c.band.fighters.dragan.wounded, true);
  assert.equal(c.band.fighters.dragan.healIn, HEAL_WOUNDED, 'the rearguard comes back wounded');
  assert.deepEqual([c.world.hunters.raiders.x, c.world.hunters.raiders.z], home, 'the hunters are thrown back');
  assert.equal(resting(c, 'raiders'), true);
  assert.equal(pursue(c, 'raiders', home, band, 5).hunting, false, 'resting: they do not hunt');
  assert.ok(normalize(JSON.parse(JSON.stringify(c))).world.hunters.raiders.rest, 'the rest is saved');
  c.world.clock.hour += 12;
  assert.equal(resting(c, 'raiders'), false);
  assert.equal(pursue(c, 'raiders', home, band, 1).hunting, true, 'twelve hours later they come again');
  assert.throws(() => withdrawWithRearguard(c, 'raiders', 'dragan', home), /wounded/, 'a wounded fighter cannot hold the rear');
});
