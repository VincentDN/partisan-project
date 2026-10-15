// Territory benefits and occupation responses persist and settle without repeated rewards.
import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign, normalize, logEvent} from '../shared/campaign/state.js';
import {stepTerritory, counterSource, provisions} from '../shared/campaign/territory.js';
import {readResults, encounterFor} from '../shared/campaign/contacts.js';
import {rest} from '../shared/campaign/operations.js';
import {createWorld} from '../shared/campaign/world.js';
import {SETTLEMENTS, byId} from '../map/island.js';
import {LEVELS} from '../convoy/levels/index.js';
import {vary, enemyCount} from '../convoy/levels/variants.js';
import {Sim} from '../convoy/sim.js';
const captured = () => {
  const c = newCampaign();
  c.world.party = {x: -1000, z: -1000};
  c.world.settlements.myrtia = {owner: 'resistance', garrison: 0, militia: 0, counterAt: 56};
  return c;
};
test('counterattack draws a real garrison, survives reload en route and retakes an undefended village', () => {
  let c = captured();
  const w = createWorld(c);
  w.skip(23);
  assert.deepEqual(c.world.counterattacks, {});
  w.skip(2);
  let a = c.world.counterattacks.myrtia;
  assert.ok(a);
  assert.equal(a.strength, 24);
  const from = byId(a.from);
  assert.ok(c.world.settlements[from.id].garrison <= from.garrison);
  const direct = captured();
  direct.world.clock.day = 3;
  stepTerritory(direct, {dt: 0});
  assert.equal(direct.world.settlements[from.id].garrison, from.garrison - 24);
  c = normalize(JSON.stringify(c));
  assert.deepEqual(c.world.counterattacks.myrtia, a);
  const resumed = createWorld(c);
  resumed.skip(300);
  assert.equal(c.world.settlements.myrtia.owner, 'invader');
  assert.equal(c.world.counterattacks.myrtia.state, 'retaken');
  assert.equal(counterSource(c, a.id), null);
});
test('fixed world steps produce the same saved column at different frame rates', () => {
  const a = captured(),
    b = captured(),
    wa = createWorld(a),
    wb = createWorld(b);
  wa.step(100);
  for (let i = 0; i < 1000; i++) wb.step(0.1);
  assert.deepEqual(a, b);
});
test('band can defend the siege; win cancels it, loss retakes it, and recapture schedules a new response', () => {
  for (const outcome of ['won', 'lost', 'withdrawn']) {
    const c = captured(),
      s = byId('myrtia');
    c.world.party = {x: s.x, z: s.z};
    createWorld(c).skip(300);
    const a = c.world.counterattacks.myrtia;
    assert.equal(a.state, 'besieging');
    const src = counterSource(c, a.id),
      e = encounterFor(c, a.id, src),
      L = vary(LEVELS[e.level], e.variant);
    assert.equal(enemyCount(L), a.strength);
    assert.equal(enemyCount(new Sim({level: L, difficulty: 'easy'}).level), a.strength);
    logEvent(c, {kind: 'result', source: a.id, outcome});
    readResults(c);
    assert.equal(c.world.settlements.myrtia.owner, outcome === 'won' ? 'resistance' : 'invader');
    const before = structuredClone(c);
    readResults(c);
    assert.deepEqual(c, before);
    logEvent(c, {kind: 'result', source: 'myrtia', intent: 'capture', outcome: 'won'});
    readResults(c);
    assert.equal(c.world.counterattacks.myrtia, undefined);
  }
});
test('liberated food accelerates recovery, is finite, and replenishes weekly across saves', () => {
  let c = captured();
  const s = byId('myrtia');
  c.world.party = {x: s.x, z: s.z};
  Object.assign(c.band.fighters.mila, {wounded: true, healIn: 100});
  rest(c, SETTLEMENTS, 24);
  assert.equal(c.band.fighters.mila.healIn, 64);
  assert.equal(provisions(c, s).food, 2);
  c = normalize(JSON.stringify(c));
  rest(c, SETTLEMENTS, 24);
  assert.equal(c.band.fighters.mila.healIn, 28);
  rest(c, SETTLEMENTS, 12);
  assert.equal(c.band.fighters.mila.healIn, 16);
  assert.equal(provisions(c, s).food, 0);
  c.world.clock.day = 8;
  assert.equal(provisions(c, s).food, 4);
  c.world.settlements.myrtia.owner = 'invader';
  assert.throws(() => rest(c, SETTLEMENTS, 12));
});
