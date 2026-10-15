// Village services conserve items, stay finite across reload and reject unavailable/failed transactions.
import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign, normalize} from '../shared/campaign/state.js';
import {
  villageAvailable,
  villageStock,
  barterQuote,
  barter,
  recruit,
  villageTransaction,
  ROSTER_LIMIT,
} from '../shared/campaign/village.js';
import {provisions} from '../shared/campaign/territory.js';
import {SETTLEMENTS} from '../map/island.js';
import {deploy} from '../shared/campaign/encounter.js';
const village = SETTLEMENTS.find(s => s.kind === 'village' && s.faction === 'neutral');
function atVillage(friendly = false) {
  const c = newCampaign();
  c.world.party = {x: village.x, z: village.z};
  if (friendly) c.world.settlements[village.id] = {owner: 'resistance'};
  return c;
}
test('only nearby neutral/liberated villages offer barter; seeded stock persists and refreshes weekly', () => {
  const c = atVillage();
  const stock = villageStock(c, village);
  assert.deepEqual(stock, villageStock(atVillage(), village));
  assert.equal(
    villageAvailable(
      c,
      SETTLEMENTS.find(s => s.kind === 'camp'),
    ),
    false,
  );
  assert.deepEqual(villageStock(normalize(JSON.stringify(c)), village), stock);
  stock.medkit = 0;
  assert.equal(villageStock(c, village).medkit, 0);
  c.world.settlements[village.id].owner = 'resistance';
  assert.equal(villageStock(c, village).medkit, 0);
  c.world.clock.day = 8;
  assert.equal(villageStock(c, village).medkit, 2);
  c.world.settlements[village.id].owner = 'invader';
  assert.throws(() => villageStock(c, village));
});
test('barter consumes only selected items, pays no currency/change, records provenance and respects finite stock', () => {
  const c = atVillage();
  c.goods = [
    {name: 'Watch', price: 900000},
    {name: 'Radio', price: 100000},
  ];
  const scrip = c.scrip,
    offer = {offer: {ak74: 1}, goods: [0], take: {medkit: 1, food: 1}};
  const q = barterQuote(c, village, offer);
  assert.equal(q.value, 120);
  assert.equal(q.cost, 24);
  barter(c, village, offer);
  assert.equal(c.stash.ak74, 1);
  assert.equal(c.stash.medkit, 3);
  assert.equal(c.goods.length, 1);
  assert.equal(c.scrip, scrip);
  assert.equal(provisions(c, village).food, 1);
  assert.equal(villageStock(c, village).medkit, 0);
  assert.ok(c.ledger.some(e => e.from === `${village.name} barter`));
  const before = structuredClone(c);
  assert.throws(() => barter(c, village, offer));
  assert.deepEqual(c, before);
  const friendly = atVillage(true);
  assert.equal(barterQuote(friendly, village, {offer: {ak74: 1}, take: {medkit: 1}}).cost, 16);
});
test('invalid selections and failed writes preserve the live inventory and volunteers', () => {
  const c = atVillage(true);
  villageStock(c, village);
  provisions(c, village);
  for (const selection of [
    {offer: {ak74: 999}, take: {medkit: 1}},
    {offer: {ak74: 1.2}, take: {medkit: 1}},
    {goods: [0, 0], take: {food: 1}},
    {take: {food: 1}},
    {offer: {ak74: 1}, take: {food: -1}},
  ]) {
    const before = structuredClone(c);
    assert.throws(() =>
      villageTransaction(
        c,
        () => true,
        next => barter(next, village, selection),
      ),
    );
    assert.deepEqual(c, before);
  }
  const before = structuredClone(c);
  assert.throws(() =>
    villageTransaction(
      c,
      () => false,
      next => barter(next, village, {offer: {ak74: 1}, take: {medkit: 1}}),
    ),
  );
  assert.deepEqual(c, before);
  assert.throws(() =>
    villageTransaction(
      c,
      () => {
        throw Error('Quota');
      },
      next => recruit(next, village),
    ),
  );
  assert.deepEqual(c, before);
});
test('liberated recruits are healthy tier-one fighters, bounded weekly, persistent and deployable', () => {
  assert.throws(() => recruit(atVillage(), village));
  let c = atVillage(true);
  const id = recruit(c, village),
    id2 = recruit(c, village);
  assert.notEqual(id, id2);
  assert.throws(() => recruit(c, village));
  assert.deepEqual(c.band.fighters[id], {class: 'volunteer', xp: 0, wounded: false, healIn: 0, kit: null});
  c = normalize(JSON.stringify(c));
  assert.equal(provisions(c, village).recruits, 0);
  assert.equal(c.band.fighters[id].class, 'volunteer');
  deploy(c, {id: 'recruits', level: 'checkpoint', fighters: [id, id2, ...Object.keys(c.band.fighters).slice(0, 4)]});
  assert.ok(c.deployment.fighters.includes(id));
  assert.throws(() => recruit(c, village));
  c.deployment = null;
  for (let i = 0; i < 20; i++) {
    c.world.clock.day += 7;
    try {
      recruit(c, village);
    } catch {}
  }
  assert.equal(Object.keys(c.band.fighters).length, ROSTER_LIMIT);
});
