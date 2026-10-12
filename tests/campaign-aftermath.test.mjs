// What fights leave on the map (WP-W13): a won fight leaves a mark where it happened (wrecks for a convoy, a fight
// for a post or the hunters, a raid for a settlement), in the save so a reload keeps it; the smoke thins over two
// campaign days and the mark is gone after two weeks; lost fights leave none.
import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign, normalize} from '../shared/campaign/state.js';
import {deploy, writeResult, settle} from '../shared/campaign/encounter.js';
import {
  encounterFor,
  readResults,
  settlementSource,
  SOURCES,
  aftermathLook,
  pruneAftermath,
  passTime,
} from '../shared/campaign/contacts.js';
import {SETTLEMENTS} from '../map/island.js';

const fight = (c, sourceId, outcome, at, source = SOURCES[sourceId]) => {
  const e = encounterFor(c, sourceId, source);
  deploy(c, {...e, at});
  writeResult(c, e.id, {outcome});
  settle(c, e.id);
};

test('aftermath: a won fight leaves its mark where it happened', () => {
  const c = newCampaign();
  fight(c, 'supply-convoy', 'won', {x: 10, z: -20});
  fight(c, 'korfos-checkpoint', 'won', {x: 30, z: 5});
  const myrtia = SETTLEMENTS.find(s => s.id === 'myrtia');
  fight(c, 'myrtia', 'won', {x: myrtia.x, z: myrtia.z}, settlementSource(myrtia));
  fight(c, 'raiders', 'lost', {x: 50, z: 50});
  readResults(c);
  assert.deepEqual(
    c.world.aftermath.map(a => [a.id, a.kind, a.x, a.z]),
    [
      ['supply-convoy', 'wreck', 10, -20],
      ['korfos-checkpoint', 'fight', 30, 5],
      ['myrtia', 'raid', myrtia.x, myrtia.z],
    ],
    'a lost fight leaves nothing',
  );
  readResults(c);
  assert.equal(c.world.aftermath.length, 3, 'read once: not added again');
});

test('aftermath: the smoke thins over two days, the wreck over two weeks, then it is gone', () => {
  const c = newCampaign();
  fight(c, 'fuel-convoy', 'won', {x: 0, z: 0});
  readResults(c);
  const a = c.world.aftermath[0];
  assert.deepEqual(aftermathLook(c, a), {smoke: 1, remains: 1});
  passTime(c, 24);
  assert.ok(Math.abs(aftermathLook(c, a).smoke - 0.5) < 1e-9, 'half the smoke after a day');
  passTime(c, 24);
  assert.equal(aftermathLook(c, a).smoke, 0, 'no smoke after two days');
  assert.ok(aftermathLook(c, a).remains > 0.8, 'the wreck still there');
  passTime(c, 13 * 24);
  assert.equal(pruneAftermath(c).length, 0, 'gone after two weeks');
});

test('aftermath: a fight with no place on the map (an old deployment) leaves no mark', () => {
  const c = newCampaign();
  fight(c, 'supply-convoy', 'won', null);
  readResults(c);
  assert.deepEqual(c.world.aftermath, []);
});

test('aftermath: kept by the save, cleaned on load', () => {
  const c = newCampaign();
  fight(c, 'armoured-column', 'won', {x: 4, z: 8});
  readResults(c);
  const raw = JSON.parse(JSON.stringify(c));
  raw.world.aftermath.push({id: 'x', kind: 'nonsense', x: 1, z: 1, day: 1}, {id: 'y', kind: 'wreck', x: 'a', z: 1, day: 1});
  assert.deepEqual(normalize(raw).world.aftermath, c.world.aftermath);
});
