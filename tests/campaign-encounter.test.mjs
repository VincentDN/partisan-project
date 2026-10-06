// The mission bridge (WP-W2): deployment, kit reserved on launch, one result, settled exactly once, a reload
// mid-mission settles as withdrawn (shared/campaign/encounter.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign, normalize} from '../shared/campaign/state.js';
import {deploy, enter, writeResult, withdraw, settle, settleAbandoned, cleanResult} from '../shared/campaign/encounter.js';

const fresh = () => {
  const c = newCampaign({now: 1});
  c.stash = {vest: 2, ak74m: 1};
  return c;
};
const launch = (c, extra = {}) => deploy(c, {id: 'e1', level: 'convoy', seed: 9, fighters: ['player', 'mila'], kit: {vest: 1}, ...extra});

test('deploying reserves the kit and refuses what cannot be sent', () => {
  const c = launch(fresh());
  assert.equal(c.deployment.id, 'e1');
  assert.deepEqual(c.deployment.kit, {vest: 1});
  assert.equal(c.stash.vest, 1, 'the vest travels on the fighter, not in the stash');
  assert.equal(c.log.at(-1).kind, 'deploy');
  assert.throws(() => launch(c), /already under way/);
  assert.throws(() => launch(fresh(), {fighters: ['ghost']}), /no fighter/);
  assert.throws(() => launch(fresh(), {kit: {vest: 5}}), /stash has 2/);
  assert.throws(() => launch(fresh(), {fighters: []}), /at least one/);
  const w = fresh();
  w.band.fighters.mila.wounded = true;
  assert.throws(() => launch(w), /wounded/);
  const k = launch(fresh(), {kit: {ak74m: 1}});
  assert.equal(k.stash.ak74m, undefined, 'the last one leaves the stash entirely');
});

test('the mission page enters once; a reload without a result is recognised', () => {
  const c = launch(fresh());
  assert.equal(enter(c, 'other'), 'none');
  assert.equal(enter(c, 'e1'), 'play');
  assert.equal(c.deployment.entered, true);
  const reloaded = normalize(JSON.stringify(c));
  assert.equal(enter(reloaded, 'e1'), 'reload', 'the mark survives the save');
  writeResult(reloaded, 'e1', {outcome: 'won'});
  assert.equal(enter(reloaded, 'e1'), 'debrief', 'a reload on the debrief shows it again');
});

test('a result is written once and settled exactly once', () => {
  const c = launch(fresh());
  enter(c, 'e1');
  const xp = c.band.fighters.player.xp;
  assert.equal(
    writeResult(c, 'e1', {
      outcome: 'won',
      fighters: {player: {state: 'fit', xp: 60, kills: 3}, mila: {state: 'down', xp: 20}},
      loot: {ak74m: 2, nonsense: 1},
      goods: [{name: 'Cigarettes', price: 8}],
      kills: 5,
    }),
    true,
  );
  assert.equal(writeResult(c, 'e1', {outcome: 'lost'}), false, 'the first result stands');
  const r = settle(c, 'e1');
  assert.equal(r.outcome, 'won');
  assert.equal(c.band.fighters.player.xp, xp + 60);
  assert.equal(c.band.fighters.player.wounded, false);
  assert.equal(c.band.fighters.mila.wounded, true, 'down comes home wounded');
  assert.deepEqual(c.stash, {vest: 2, ak74m: 3}, 'kit back, loot in, unknown gear dropped');
  assert.deepEqual(c.goods, [{name: 'Cigarettes', price: 8}]);
  assert.deepEqual(c.record.convoy, {played: 1, won: 1});
  assert.deepEqual(c.settled, ['e1']);
  assert.equal(c.deployment, null);
  assert.equal(c.log.at(-1).kind, 'result');
  const before = JSON.stringify(c);
  assert.equal(settle(c, 'e1'), null, 'settling twice is a no-op');
  assert.equal(JSON.stringify(c), before);
  assert.throws(() => launch(c), /already fought/, 'the same encounter cannot be replayed');
});

test('withdrawn: the fighters come back wounded with their kit, nothing taken, no record', () => {
  const c = launch(fresh());
  enter(c, 'e1');
  withdraw(c, 'e1');
  assert.equal(writeResult(c, 'e1', {outcome: 'won', loot: {ak74m: 5}}), false, 'no winning after leaving');
  settle(c, 'e1');
  assert.equal(c.band.fighters.player.wounded, true);
  assert.equal(c.band.fighters.mila.wounded, true);
  assert.deepEqual(c.stash, {vest: 2, ak74m: 1});
  assert.deepEqual(c.record.convoy, {played: 0, won: 0});
  assert.equal(c.log.at(-1).outcome, 'withdrawn');
});

test('the map settles a mission that was entered and abandoned; one never opened stays deployed', () => {
  const c = launch(fresh());
  assert.equal(settleAbandoned(c), null, 'not entered yet: the mission is still to be played');
  enter(c, 'e1');
  assert.equal(settleAbandoned(c).outcome, 'withdrawn');
  assert.equal(c.deployment, null);
  const d = launch(fresh());
  enter(d, 'e1');
  writeResult(d, 'e1', {outcome: 'won'});
  assert.equal(settleAbandoned(d).outcome, 'won', 'a written result is settled as it is, not withdrawn');
});

test('results are cleaned: unknown outcomes lose, missing fighters default, numbers are bounded', () => {
  const d = {fighters: ['player']};
  assert.deepEqual(cleanResult(d, null).fighters, {player: {state: 'fit', xp: 0, kills: 0}});
  assert.equal(cleanResult(d, {outcome: 'draw'}).outcome, 'lost');
  const r = cleanResult(d, {outcome: 'won', fighters: {player: {state: 'asleep', xp: -4, kills: 2.9}, ghost: {}}, captured: true});
  assert.deepEqual(r.fighters, {player: {state: 'fit', xp: 0, kills: 2}});
  assert.equal(r.captured, true);
  assert.equal(cleanResult(d, {outcome: 'lost', captured: true}).captured, false);
});

// TAC-C-11: grid kits travel with the fighters and come home as they are; what they spent stays spent
const kit = (uid, rounds) => ({
  armsId: 'ak',
  primary: {uid, slug: 'rifle', rounds},
  pockets: {slug: 'pockets', grids: [{w: 1, h: 1, items: []}]},
});

test('grid kits travel with the fighters and come home as they are after the fight', () => {
  const c = fresh();
  c.band.fighters.player.kit = kit('a1', 60);
  launch(c);
  assert.equal(c.band.fighters.player.kit, null, 'the kit is on the fighter in the field');
  assert.equal(c.deployment.kits.player.primary.rounds, 60);
  assert.equal(c.deployment.kits.mila, null, 'none yet: the mission issues one');
  enter(c, 'e1');
  writeResult(c, 'e1', {outcome: 'won', kits: {player: kit('a1', 12), mila: kit('m5-1', 47), ghost: kit('x', 1)}});
  settle(c, 'e1');
  assert.equal(c.band.fighters.player.kit.primary.rounds, 12, 'spent stays spent');
  assert.equal(c.band.fighters.mila.kit.primary.rounds, 47, 'the issued kit is hers now, loot included');
  assert.equal(c.armoury.inbox.length, 0);
  const again = normalize(JSON.parse(JSON.stringify(c)));
  assert.equal(again.band.fighters.mila.kit.primary.rounds, 47, 'kits survive the save');
});

test('withdrawn: the kits come back as they left; a kit replaced in the field goes to the armoury', () => {
  const c = fresh();
  c.band.fighters.player.kit = kit('a1', 60);
  launch(c);
  enter(c, 'e1');
  withdraw(c, 'e1');
  settle(c, 'e1');
  assert.equal(c.band.fighters.player.kit.primary.rounds, 60);
  for (const f of Object.values(c.band.fighters)) f.wounded = false; // healed
  launch(c, {id: 'e2'});
  enter(c, 'e2');
  writeResult(c, 'e2', {outcome: 'lost', kits: {player: kit('b9', 30)}}); // promoted: a new weapon, a new kit
  settle(c, 'e2');
  assert.equal(c.band.fighters.player.kit.primary.uid, 'b9');
  assert.deepEqual(
    c.armoury.inbox.map(i => i.uid),
    ['a1'],
    'the old rifle is set aside, not lost',
  );
});
