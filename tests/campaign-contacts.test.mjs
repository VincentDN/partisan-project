// Contacts on the campaign map: which mission each enemy starts, who goes, what a fight changes, healing over time
// (shared/campaign/contacts.js, with the bridge in shared/campaign/encounter.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign} from '../shared/campaign/state.js';
import {deploy, enter, writeResult, settle, HEAL_WOUNDED, HEAL_DOWN} from '../shared/campaign/encounter.js';
import {
  SOURCES,
  encounterFor,
  settlementSource,
  fitFighters,
  readResults,
  isGone,
  ownerOf,
  passTime,
  SQUAD_MAX,
} from '../shared/campaign/contacts.js';
import {LEVELS} from '../convoy/levels/index.js';
import {SETTLEMENTS} from '../map/island.js';

const fight = (c, sourceId, result, source) => {
  const e = encounterFor(c, sourceId, source);
  deploy(c, e);
  enter(c, e.id);
  writeResult(c, e.id, result);
  settle(c, e.id);
  return e;
};

test('every enemy on the map leads to a mission that exists', () => {
  for (const [id, s] of Object.entries(SOURCES)) assert.ok(LEVELS[s.level], `${id} -> ${s.level}`);
  const invader = SETTLEMENTS.filter(s => s.faction === 'invader');
  assert.ok(invader.length >= 3);
  for (const s of invader) assert.ok(LEVELS[settlementSource(s).level]);
});

test('an encounter takes the fit fighters, carries the enemy, and is unique per meeting', () => {
  const c = newCampaign({seed: 3});
  c.band.fighters.mila.wounded = true;
  const e = encounterFor(c, 'supply-convoy');
  assert.equal(e.level, 'convoy');
  assert.deepEqual(e.fighters, ['player', 'dragan'], 'the wounded stay behind');
  assert.equal(e.enemy.strength, 14);
  assert.equal(e.time, 'day');
  c.world.clock.hour = 22;
  assert.equal(encounterFor(c, 'supply-convoy').time, 'night');
  deploy(c, e);
  enter(c, e.id);
  writeResult(c, e.id, {outcome: 'lost'});
  settle(c, e.id);
  const again = encounterFor(c, 'supply-convoy');
  assert.notEqual(again.id, e.id, 'a second meeting is a new encounter');
  assert.notEqual(again.seed, e.seed, 'and a different fight');
  assert.ok(fitFighters(c).length <= SQUAD_MAX);
});

test('a won fight destroys the party; a won raid takes the settlement; the map reports each result once', () => {
  const c = newCampaign();
  fight(c, 'supply-convoy', {outcome: 'won', loot: {ak74m: 2}, fighters: {mila: {state: 'wounded'}}});
  const myrtia = SETTLEMENTS.find(s => s.id === 'myrtia');
  fight(c, 'myrtia', {outcome: 'won'}, settlementSource(myrtia));
  fight(c, 'raiders', {outcome: 'lost'});
  const lines = readResults(c, {myrtia: 'Myrtia'});
  assert.equal(lines.length, 3);
  assert.match(lines[0], /Supply convoy: destroyed, 2 items taken, 1 wounded/);
  assert.match(lines[1], /Myrtia: taken for the Resistance/);
  assert.match(lines[2], /Raiding party: the attack failed/);
  assert.equal(isGone(c, 'supply-convoy'), true);
  assert.equal(isGone(c, 'raiders'), false, 'a lost fight leaves them standing');
  assert.equal(ownerOf(c, myrtia), 'resistance');
  assert.deepEqual(readResults(c), [], 'nothing new the second time');
});

test('wounds heal with time: a day for the hurt, two for the fallen', () => {
  const c = newCampaign();
  fight(c, 'supply-convoy', {outcome: 'won', fighters: {player: {state: 'wounded'}, mila: {state: 'down'}}});
  assert.equal(c.band.fighters.player.healIn, HEAL_WOUNDED);
  assert.equal(c.band.fighters.mila.healIn, HEAL_DOWN);
  assert.deepEqual(fitFighters(c), ['dragan']);
  const day = c.world.clock.day;
  assert.deepEqual(passTime(c, HEAL_WOUNDED), ['player']);
  assert.equal(c.world.clock.day, day + 1, 'the clock rolls over');
  assert.equal(c.band.fighters.mila.wounded, true);
  assert.deepEqual(passTime(c, HEAL_DOWN - HEAL_WOUNDED), ['mila']);
  assert.deepEqual(fitFighters(c), ['player', 'mila', 'dragan']);
  assert.equal(c.log.at(-1).kind, 'healed');
});
