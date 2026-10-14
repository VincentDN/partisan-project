// Being hunted and losing the camp (WP-W11, TAC-K-03): the hunters march on the band once the heat is high and go
// home when it is not; a lost defence of the camp halves every stack kept there (rounded down), moves the band and its
// camp to the nearest friendly settlement (rebuilding for three days), burns the old camp and halves the heat; a loss
// in the open or a win does none of that.
import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign, normalize} from '../shared/campaign/state.js';
import {deploy, writeResult, settle} from '../shared/campaign/encounter.js';
import {encounterFor, readResults, passTime, SOURCES} from '../shared/campaign/contacts.js';
import {pursue, overrun, isOverrun, campOf, rebuildingFor, HUNT_HEAT, HUNT_SPEED} from '../shared/campaign/defence.js';
import {SETTLEMENTS} from '../map/island.js';

const OROS = SETTLEMENTS.find(s => s.id === 'oros-camp');
const fightHunters = (c, outcome, at) => {
  const e = encounterFor(c, 'raiders', SOURCES.raiders, {nearCamp: true});
  deploy(c, {...e, at});
  writeResult(c, e.id, {outcome, fighters: {player: {state: 'down'}}});
  settle(c, e.id);
  return readResults(c, {}, {settlements: SETTLEMENTS});
};

test('hunt: the hunters wait while the heat is low and march on the band once it is high', () => {
  const c = newCampaign();
  const home = [-80, 24],
    band = {x: -160, z: 40};
  assert.deepEqual(pursue(c, 'raiders', home, band, 10), {x: -80, z: 24, hunting: false, heading: null});
  c.world.heat = HUNT_HEAT;
  const h = pursue(c, 'raiders', home, band, 2);
  assert.equal(h.hunting, true);
  assert.ok(Math.abs(Math.hypot(h.x - -80, h.z - 24) - HUNT_SPEED * 2) < 1e-9, 'at their marching speed');
  const saved = normalize(JSON.parse(JSON.stringify(c))).world.hunters.raiders;
  assert.deepEqual(saved, c.world.hunters.raiders, 'kept in the save');
  assert.deepEqual([saved.x, saved.z, saved.hunting, saved.seen], [h.x, h.z, true, band], 'where they are, and where they saw the band');
  c.world.heat = 0;
  for (let i = 0; i < 20; i++) pursue(c, 'raiders', home, band, 5);
  assert.deepEqual([c.world.hunters.raiders.x, c.world.hunters.raiders.z], home, 'home again when the heat is off');
  c.world.parties.push({id: 'raiders', state: 'destroyed'});
  assert.equal(pursue(c, 'raiders', home, band, 1), null, 'gone when destroyed');
});

test('overrun: half of every stack lost, the band falls back to the nearest friendly settlement, heat halves', () => {
  const c = newCampaign();
  c.world.heat = 41;
  c.stash = {ak74: 9, rpg: 1, medkit: 2};
  const troops = Object.fromEntries(Object.entries(c.band.troops).map(([k, t]) => [k, t.count]));
  const lines = fightHunters(c, 'lost', {x: OROS.x + 10, z: OROS.z});
  assert.deepEqual(c.stash, {ak74: 5, rpg: 1, medkit: 1}, 'half of each, rounded down: a single item survives');
  for (const [k, n] of Object.entries(troops)) assert.equal(c.band.troops[k].count, n - Math.floor(n / 2), `${k} halved`);
  assert.equal(c.world.camp.id, 'lithia', 'the nearest Resistance settlement is the camp now');
  assert.ok(Math.hypot(c.world.party.x - -240, c.world.party.z - -190) < 15, 'and the band is there');
  assert.equal(c.world.heat, 20, 'the Invader thinks it has won');
  assert.ok(c.world.burnt.includes('oros-camp'));
  assert.ok(
    c.world.aftermath.some(a => a.id === 'oros-camp' && a.kind === 'raid'),
    'the old camp burns on the map',
  );
  assert.equal(c.band.fighters.player.wounded, true, 'the fallen are wounded, not dead');
  assert.match(lines[0], /Raiding party overran Oros Camp: .* lost\. The band fell back to Lithia; the new camp needs three days\./);
  assert.equal(campOf(c, SETTLEMENTS).id, 'lithia');
  assert.equal(rebuildingFor(c), 72);
  passTime(c, 30);
  assert.equal(rebuildingFor(c), 42, 'rebuilding counts down');
  passTime(c, 42);
  assert.equal(rebuildingFor(c), 0);
  assert.deepEqual(readResults(c, {}, {settlements: SETTLEMENTS}), [], 'applied once');
});

test('overrun: only a lost defence of the camp; a loss in the open or a win leaves the camp alone', () => {
  const far = newCampaign();
  const before = {...far.stash};
  fightHunters(far, 'lost', {x: 200, z: 200});
  assert.deepEqual(far.stash, before, 'a loss far from camp costs no stash');
  assert.equal(far.world.camp, null);
  const won = newCampaign();
  fightHunters(won, 'won', {x: OROS.x, z: OROS.z});
  assert.equal(won.world.camp, null);
  assert.equal(
    isOverrun(won, {kind: 'result', outcome: 'lost', source: 'supply-convoy', at: {x: OROS.x, z: OROS.z}}, SETTLEMENTS),
    false,
    'only hunters overrun the camp',
  );
});

test('overrun: a second overrun falls back again, from the new camp', () => {
  const c = newCampaign();
  overrun(c, SETTLEMENTS);
  assert.equal(c.world.camp.id, 'lithia');
  const lithia = SETTLEMENTS.find(s => s.id === 'lithia');
  assert.ok(isOverrun(c, {kind: 'result', outcome: 'lost', source: 'raiders', at: {x: lithia.x, z: lithia.z}}, SETTLEMENTS));
  overrun(c, SETTLEMENTS);
  assert.notEqual(c.world.camp.id, 'lithia');
  assert.ok(['oros-camp', 'pelekas', 'korfos', 'vrisi'].includes(c.world.camp.id));
});
