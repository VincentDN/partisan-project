// Persuasion decisions survive reload, cannot duplicate rewards and roll back on storage failure.
import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign, normalize} from '../shared/campaign/state.js';
import {persuasion} from '../shared/campaign/dialogue.js';
import {barterQuote, villageTransaction} from '../shared/campaign/village.js';
import {provisions} from '../shared/campaign/territory.js';
import {SETTLEMENTS} from '../map/island.js';
const s = SETTLEMENTS.find(s => s.kind === 'village' && s.faction === 'neutral');
function setup(seed) {
  const c = newCampaign();
  c.seed = seed;
  c.world.party = {x: s.x, z: s.z};
  c.world.settlements[s.id] = {owner: 'resistance'};
  return c;
}
test('both outcomes are saved and replayed without spending meals or duplicating recruits', () => {
  const outcomes = new Set();
  for (let seed = 1; seed <= 40; seed++) {
    let c = setup(seed);
    const n = Object.keys(c.band.fighters).length,
      food = provisions(c, s).food,
      volunteers = provisions(c, s).recruits;
    const r = persuasion(c, s, 'recruit');
    outcomes.add(r.success);
    assert.equal(Object.keys(c.band.fighters).length, n + Number(r.success));
    assert.equal(provisions(c, s).food, food - Number(r.success));
    assert.equal(provisions(c, s).recruits, volunteers);
    if (r.success) assert.equal(c.band.fighters[r.fighter].wounded, false);
    c = normalize(JSON.stringify(c));
    const before = structuredClone(c);
    assert.deepEqual(persuasion(c, s, 'recruit'), r);
    assert.deepEqual(c, before);
  }
  assert.equal(outcomes.size, 2);
});
test('price reductions apply only for the saved successful week', () => {
  for (let seed = 1; seed < 30; seed++) {
    const c = setup(seed),
      r = persuasion(c, s, 'barter');
    assert.equal(barterQuote(c, s, {take: {medkit: 1}}).cost, r.success ? 14 : 16);
    c.world.clock.day = 8;
    assert.equal(barterQuote(c, s, {take: {medkit: 1}}).cost, 16);
  }
});
test('save failure and ineligible recruitment do not mutate live campaigns', () => {
  const c = setup(1),
    before = structuredClone(c);
  assert.throws(() =>
    villageTransaction(
      c,
      () => false,
      next => persuasion(next, s, 'recruit'),
    ),
  );
  assert.deepEqual(c, before);
  assert.deepEqual(persuasion(c, s, 'barter'), persuasion(setup(1), s, 'barter'));
  const neutral = setup(3);
  neutral.world.settlements[s.id].owner = 'neutral';
  assert.throws(() => persuasion(neutral, s, 'recruit'));
  const empty = setup(3);
  provisions(empty, s).food = 0;
  assert.throws(() => persuasion(empty, s, 'recruit'));
});
