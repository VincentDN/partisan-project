// The campaign convoy in the ambush (WP-W9): the column the map shows (its vehicles and escort) is the column the
// level fields; the ambush start is the band's choice: the roadblock, or a road charge that blows the lead vehicle
// as it arrives and wakes the escort; the charge comes out of the stash and is not given back.
import test from 'node:test';
import assert from 'node:assert/strict';
import {buildColumn, describeColumn} from '../convoy/levels/columns.js';
import {vary} from '../convoy/levels/variants.js';
import {LEVELS} from '../convoy/levels/index.js';
import {Sim} from '../convoy/sim.js';
import {newCampaign} from '../shared/campaign/state.js';
import {deploy, writeResult, settle} from '../shared/campaign/encounter.js';
import {encounterFor, SOURCES} from '../shared/campaign/contacts.js';

const crew = c => c.reduce((a, v) => a + v.crew.length, 0);
const roles = c => c.flatMap(v => v.crew.map(x => x.role));

test('column: the map convoy’s vehicles and escort, with a leader, a radio and the MRAP’s gunner', () => {
  for (const [id, s] of Object.entries(SOURCES).filter(([, s]) => s.vehicles)) {
    const c = buildColumn({vehicles: s.vehicles, escort: s.strength, seed: 3});
    assert.deepEqual(
      c.map(v => v.kind),
      s.vehicles.map(v => ({humvee: 'jeep', matv: 'mrap', truck: 'truck'})[v]),
      `${id}: its vehicles in order`,
    );
    assert.equal(crew(c), s.strength, `${id}: as many soldiers as the map shows`);
    assert.equal(roles(c).filter(r => r === 'leader').length, 1);
    assert.ok(roles(c).includes('rto'), 'someone can call it in');
    for (const v of c.filter(v => v.kind === 'mrap'))
      assert.ok(
        v.crew.some(x => x.role === 'turret'),
        'the MRAP keeps its gun',
      );
    assert.equal(c.filter(v => v.id === 'mrap').length, s.vehicles.includes('matv') ? 1 : 0, 'one vehicle named for the objective');
  }
  assert.equal(
    describeColumn(buildColumn({vehicles: ['humvee', 'matv', 'truck', 'humvee'], escort: 18})),
    'two jeeps, an MRAP and a truck',
  );
});

test('column: the level fields it, with a brief to match; no MRAP, no MRAP objective', () => {
  for (const level of ['convoy', 'forest-road']) {
    const L = vary(LEVELS[level], {seed: 2, convoy: {vehicles: ['humvee', 'truck'], escort: 7}, name: 'A test convoy'});
    assert.deepEqual(
      L.convoy.vehicles.map(v => v.kind),
      ['jeep', 'truck'],
    );
    assert.equal(crew(L.convoy.vehicles), 7);
    assert.ok(!L.objectives.some(o => o.target === 'mrap'), `${level}: no MRAP to knock out`);
    assert.match(L.brief, /^A test convoy comes down the road: a jeep and a truck, 7 soldiers\./);
  }
  const practice = vary(LEVELS.convoy, {seed: 2});
  assert.deepEqual(practice.convoy.vehicles, LEVELS.convoy.convoy.vehicles, 'practice keeps the level’s own column');
});

/** Step until the lead vehicle stops (or a time limit). */
function untilStopped(sim, seconds = 40) {
  for (let i = 0; i < seconds * 60; i++) {
    sim.step(1 / 60, {});
    if (sim.vehicles[0].destroyed || sim.alarm || sim.vehicles[0].stopped) break;
  }
}

test('ambush: a road charge blows the lead vehicle as it arrives and wakes the escort', () => {
  const L = vary(LEVELS.convoy, {seed: 4, convoy: {vehicles: ['humvee', 'matv', 'truck'], escort: 12}, ambush: 'charge'});
  assert.equal(L.mines.length, 1, 'one charge under the stop');
  const sim = new Sim({level: L, seed: 4});
  untilStopped(sim);
  assert.ok(sim.vehicles[0].destroyed, 'the lead jeep is gone');
  assert.ok(sim.alarm, 'the escort is awake');
});

test('ambush: at the roadblock there is no blast; the column stops whole', () => {
  const L = vary(LEVELS.convoy, {seed: 4, convoy: {vehicles: ['humvee', 'matv', 'truck'], escort: 12}, ambush: 'roadblock'});
  assert.equal(L.mines, undefined);
  const sim = new Sim({level: L, seed: 4});
  const lead = sim.vehicles[0];
  // until the lead vehicle has reached the stop (where a charge would have gone off)
  for (let i = 0; i < 40 * 60 && lead.x + lead.w / 2 < L.convoy.stopX - 0.5; i++) sim.step(1 / 60, {});
  assert.ok(lead.x + lead.w / 2 >= L.convoy.stopX - 0.5, 'it reached the stop');
  assert.equal(lead.destroyed, false, 'the lead vehicle stands');
  assert.ok(!sim.explosions.some(e => Math.abs(e.x - (L.convoy.stopX - 2)) < 1), 'nothing went off under it');
  // (whether the escort spots the band before it opens fire is the level's own business: WP-W12 notes it)
});

test('ambush: the encounter carries the column; a road charge is spent from the stash for good', () => {
  const c = newCampaign();
  const e = encounterFor(c, 'supply-convoy', SOURCES['supply-convoy']);
  assert.deepEqual(e.variant.convoy, {vehicles: ['matv', 'truck', 'truck'], escort: 14});
  assert.equal(e.variant.ambush, 'roadblock');
  assert.equal(e.variant.strength, 1, 'no scaling on top of the escort');
  assert.equal(c.stash.explosives || 0, 0, 'the small starting reserve has no demolition charge');
  c.stash.explosives = 1; // recovered earlier in this fixture
  const before = c.stash.explosives;
  deploy(c, {...e, variant: {...e.variant, ambush: 'charge'}, spend: {explosives: 1}});
  assert.equal(c.stash.explosives || 0, before - 1, 'taken for the charge');
  writeResult(c, e.id, {outcome: 'lost'});
  settle(c, e.id);
  assert.equal(c.stash.explosives || 0, before - 1, 'and not given back');
  c.stash.explosives = 0;
  const e2 = encounterFor(c, 'fuel-convoy', SOURCES['fuel-convoy']);
  assert.throws(() => deploy(c, {...e2, spend: {explosives: 1}}), /no explosives to spare/);
});
