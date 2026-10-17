// Recovery accounting excludes carried issue and transfers while counting nested ammunition and new stacks.
import test from 'node:test';
import assert from 'node:assert/strict';
import {kitCounts, kitGains} from '../shared/campaign/loot-report.js';
import {newCampaign, normalize, CAMPAIGN_START_STASH} from '../shared/campaign/state.js';
import {deploy, writeResult, settle} from '../shared/campaign/encounter.js';

test('fresh campaigns have an empty reserve; existing acquired stock is preserved', () => {
  const c = newCampaign();
  assert.deepEqual(c.stash, CAMPAIGN_START_STASH);
  assert.equal(c.stash.atgm, undefined);
  c.stash.ak74 = 45;
  assert.equal(normalize(c).stash.ak74, 45);
});

test('carried gains count nested rounds, exclude issue and ignore transfers across the squad', () => {
  const before = {
    player: {
      primary: {uid: 'w1', slug: 'rifle', chamber: 'round', mag: {uid: 'm1', slug: 'mag', rounds: [['round', 29]]}},
      pockets: {uid: 'p', slug: 'pockets', grids: [{items: [{item: {uid: 'med', slug: 'bandage', count: 2}}]}]},
    },
  };
  assert.deepEqual(kitCounts(before), {rifle: 1, round: 30, mag: 1, bandage: 2});
  const after = {mila: structuredClone(before.player)};
  assert.deepEqual(kitGains(before, after), {});
  after.mila.primary.mag.rounds = [['round', 15]];
  after.mila.pockets.grids[0].items.push({item: {uid: 'taken', slug: 'round', count: 25}});
  assert.deepEqual(kitGains(before, after), {round: 11});
});

test('recovery detail persists in the debrief and never awards kit gains twice', () => {
  const c = newCampaign();
  deploy(c, {id: 'loot-test', level: 'convoy', fighters: ['player']});
  writeResult(c, 'loot-test', {outcome: 'won', loot: {medkit: 2}, kitGains: {round: 11}, goods: [{name: 'Watch', price: 25}]});
  const loaded = normalize(JSON.stringify(c));
  assert.deepEqual(loaded.deployment.result.kitGains, {round: 11});
  settle(loaded);
  assert.equal(loaded.stash.medkit, (CAMPAIGN_START_STASH.medkit || 0) + 2);
  assert.equal(loaded.stash.round, undefined, 'carried gains are informational, not another stash grant');
  const once = structuredClone(loaded);
  settle(loaded, 'loot-test');
  assert.deepEqual(loaded, once);
});
