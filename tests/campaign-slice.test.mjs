// The eight-fighter campaign slice: safe insertion, durable migration, recovery, repeat missions and completion.
import test from 'node:test';
import assert from 'node:assert/strict';
import {Sim} from '../convoy/sim.js';
import {LEVELS} from '../convoy/levels/index.js';
import {DEFAULT_SQUAD, REBEL_HEALTH} from '../convoy/roster.js';
import {newCampaign, normalize, createStore} from '../shared/campaign/state.js';
import {deploy, enter, writeResult, settle} from '../shared/campaign/encounter.js';
import {encounterFor, readResults, fitFighters, settlementSource} from '../shared/campaign/contacts.js';
import {rest, operation} from '../shared/campaign/operations.js';
import {SETTLEMENTS} from '../map/island.js';

for (const level of Object.keys(LEVELS))
  test(`${level}: eight durable rebels have distinct clear spawns, including a six-person deployment`, () => {
    const sim = new Sim({level, squad: DEFAULT_SQUAD});
    const rebels = sim.units.filter(u => u.side === 'partisan');
    assert.equal(rebels.length, 8);
    for (const u of rebels) {
      assert.ok(u.hp >= REBEL_HEALTH && u.maxHp === u.hp);
      assert.ok(!sim.level.cover.some(b => Math.abs(u.x - b.x) < b.w / 2 + 0.5 && Math.abs(u.z - b.z) < b.d / 2 + 0.5), u.id);
      assert.ok(!rebels.some(v => v !== u && Math.hypot(v.x - u.x, v.z - u.z) < 1.8), u.id);
    }
    assert.ok(sim.units.filter(u => u.side === 'army').every(u => u.hp === 100));
    const six = Object.fromEntries(Object.entries(DEFAULT_SQUAD).slice(2));
    const deployed = new Sim({level, squad: six}).units.filter(u => u.side === 'partisan');
    assert.deepEqual(
      deployed.map(u => u.id),
      Object.keys(six),
    );
  });

test('legacy roster expands once without healing, replacing kits or resetting promotions', () => {
  const c = newCampaign();
  delete c.band.rosterVersion;
  for (const id of Object.keys(c.band.fighters).slice(3)) delete c.band.fighters[id];
  Object.assign(c.band.fighters.mila, {wounded: true, healIn: 17, xp: 92});
  const migrated = normalize(c);
  assert.equal(Object.keys(migrated.band.fighters).length, 8);
  assert.deepEqual(migrated.band.fighters.mila, c.band.fighters.mila);
  assert.deepEqual(normalize(migrated), migrated);
});

test('fight, lose, recover, trade-ready rest and a second deployment survive save/load', () => {
  let c = newCampaign();
  const e = encounterFor(c, 'supply-convoy');
  deploy(c, e);
  enter(c, e.id);
  writeResult(c, e.id, {outcome: 'lost', fighters: Object.fromEntries(e.fighters.map(id => [id, {state: 'down', xp: 20}]))});
  settle(c, e.id);
  readResults(c);
  assert.equal(fitFighters(c).length, 0);
  c = normalize(JSON.stringify(c));
  c.world.party = {x: 470, z: 350};
  assert.throws(() => rest(c, SETTLEMENTS, 48), /friendly/);
  const haven = SETTLEMENTS.find(s => s.faction === 'resistance');
  c.world.party = {x: haven.x, z: haven.z};
  rest(c, SETTLEMENTS, 48);
  c = normalize(JSON.stringify(c));
  assert.equal(fitFighters(c).length, 8);
  assert.equal(c.band.fighters.player.xp, 20);
  deploy(c, encounterFor(c, 'supply-convoy'));
  assert.equal(c.deployment.fighters.length, 8);
});

test('completion needs a convoy, three wins and Fort Orion; reading results twice grants nothing twice', () => {
  const c = newCampaign();
  const fort = SETTLEMENTS.find(s => s.id === 'fort-orion');
  for (const [id, source] of [['supply-convoy'], ['korfos-checkpoint'], [fort.id, settlementSource(fort)]]) {
    const e = encounterFor(c, id, source);
    deploy(c, e);
    enter(c, e.id);
    writeResult(c, e.id, {outcome: 'won'});
    settle(c, e.id);
    readResults(c);
  }
  assert.equal(operation(c).complete, true);
  const before = JSON.stringify(c);
  readResults(c);
  assert.equal(JSON.stringify(c), before);
  assert.equal(operation(normalize(c)).complete, true);
});

test('blocked storage and duplicate deployments fail explicitly without losing kit', () => {
  const c = newCampaign();
  assert.equal(createStore(null).save(c), false);
  assert.throws(() => deploy(c, {id: 'duplicate', level: 'convoy', fighters: ['player', 'player']}), /distinct/);
  assert.equal(c.deployment, null);
});
