// Escalation uses durable band/territory strength and carries fixed rules into every tactical mission.
import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign, normalize} from '../shared/campaign/state.js';
import {response, RESPONSE_TIERS} from '../shared/campaign/response.js';
import {sourceFor, encounterFor, settlementSource} from '../shared/campaign/contacts.js';
import {isOut} from '../shared/campaign/hunt.js';
import {SETTLEMENTS} from '../map/island.js';
import {LEVELS} from '../convoy/levels/index.js';
import {vary, enemyCount} from '../convoy/levels/variants.js';
import {Sim} from '../convoy/sim.js';
import {DIFFICULTY} from '../convoy/difficulty.js';
import {autoPreview} from '../shared/campaign/auto-resolve.js';
import {deploy} from '../shared/campaign/encounter.js';
const campaignAt = tier => {
  const c = newCampaign();
  for (let i = 28; i < RESPONSE_TIERS[tier].threshold; i++)
    c.band.fighters[`reserve-${i}`] = {class: 'volunteer', xp: 0, wounded: false, kit: null};
  return c;
};
test('tiers rise with promoted/recruited strength and captured seats, not selected squad, heat or legacy troop stacks', () => {
  const c = newCampaign();
  assert.equal(response(c).score, 28);
  assert.equal(response(c).tier, 0);
  c.world.heat = 100;
  c.band.troops.volunteer = {count: 9999, xp: 0};
  assert.equal(response(c).tier, 0);
  c.world.settlements.myrtia = {owner: 'resistance'};
  assert.equal(response(c).tier, 1);
  Object.values(c.band.fighters).forEach(f => (f.wounded = true));
  assert.equal(response(c).tier, 1);
  assert.deepEqual(response(normalize(JSON.stringify(c))), response(c));
  c.world.settlements.myrtia.owner = 'invader';
  assert.equal(response(c).tier, 0);
});
test('all tiers alter hunter strength/activation and field exactly that column in both defences', () => {
  for (const profile of RESPONSE_TIERS) {
    const c = campaignAt(profile.tier);
    assert.equal(response(c).tier, profile.tier);
    for (const id of ['raiders', 'orion-hunters']) {
      c.world.heat = (id === 'raiders' ? 20 : 50) - profile.heatDiscount;
      assert.equal(isOut(c, id), true);
      c.world.heat--;
      assert.equal(isOut(c, id), false);
      const source = sourceFor(c, id);
      assert.equal(source.strength, (id === 'raiders' ? 31 : 26) + profile.hunters);
      for (const nearCamp of [true, false]) {
        const e = encounterFor(c, id, source, {nearCamp}),
          L = vary(LEVELS[e.level], e.variant);
        assert.equal(enemyCount(L), source.strength);
        assert.equal(enemyCount(new Sim({level: L, difficulty: 'easy'}).level), source.strength);
      }
    }
  }
});
test('response preserves actual garrison/convoy counts, changes equipment and modifiers, leaves practice and base difficulty untouched', () => {
  const c = campaignAt(3),
    s = SETTLEMENTS.find(s => s.id === 'myrtia');
  const original = structuredClone(DIFFICULTY);
  for (const [id, source] of [
    ['myrtia', settlementSource(s, c)],
    ['supply-convoy', sourceFor(c, 'supply-convoy')],
  ]) {
    const e = encounterFor(c, id, source),
      high = vary(LEVELS[e.level], e.variant),
      low = vary(LEVELS[e.level], {...e.variant, response: {tier: 0}});
    assert.equal(enemyCount(high), enemyCount(low));
    const roles = L => JSON.stringify([L.units, L.convoy?.vehicles, L.waves]);
    assert.notEqual(roles(high), roles(low));
    const sim = new Sim({level: high, difficulty: 'normal'});
    assert.equal(sim.difficulty.react, RESPONSE_TIERS[3].react);
    assert.equal(sim.difficulty.spread, RESPONSE_TIERS[3].spread);
    assert.equal(sim.difficulty.taken, RESPONSE_TIERS[3].taken);
  }
  assert.deepEqual(DIFFICULTY, original);
  assert.equal(vary(LEVELS.hilltop).response, undefined);
});
test('launch snapshots the response even if the campaign grows before mission setup', () => {
  const c = newCampaign(),
    e = encounterFor(c, 'raiders');
  deploy(c, e);
  c.world.settlements.myrtia = {owner: 'resistance'};
  const restored = normalize(JSON.stringify(c));
  assert.equal(response(restored).tier, 1);
  assert.equal(restored.deployment.variant.response.tier, 0);
  const L = vary(LEVELS[restored.deployment.level], restored.deployment.variant);
  assert.equal(L.response.tier, 0);
  assert.equal(enemyCount(L), 31);
});

test('escalation changes auto-resolve risk without changing its eligibility rule', () => {
  const c = newCampaign(),
    e = encounterFor(c, 'orion-patrol');
  const low = autoPreview(c, e),
    high = autoPreview(c, {...e, variant: {...e.variant, response: {tier: 3}}});
  assert.equal(high.eligible, low.eligible);
  assert.equal(high.ratio, low.ratio);
  assert.ok(high.odds < low.odds);
  assert.ok(high.expectedWounds > low.expectedWounds);
});
