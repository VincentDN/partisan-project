// One writer at a time (WP-W24): a tab writes only over the revision it loaded, so two tabs on one campaign can never
// both settle a mission or overwrite each other's progress. The stale tab is told once and writes nothing more.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore, newCampaign, CAMPAIGN_KEY} from '../shared/campaign/state.js';
import {encounterFor, settlementSource} from '../shared/campaign/contacts.js';
import {deploy, writeResult, settle} from '../shared/campaign/encounter.js';
import {SETTLEMENTS} from '../map/island.js';

const memory = (init = {}) => {
  const m = new Map(Object.entries(init));
  return {map: m, getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k)};
};

test('each save moves the revision on; a reload carries it', () => {
  const storage = memory();
  const store = createStore(storage);
  const {campaign} = store.load();
  assert.equal(campaign.rev, 0);
  assert.equal(store.save(campaign), true);
  assert.equal(store.save(campaign), true);
  assert.equal(campaign.rev, 2);
  assert.equal(createStore(storage).load().campaign.rev, 2);
});

test('a second tab on the same campaign cannot write over the first: it is stale, told once', () => {
  const storage = memory();
  createStore(storage).save(newCampaign({id: 'run'}));
  let told = 0;
  const a = createStore(storage),
    b = createStore(storage, {onConflict: () => told++});
  const ca = a.load().campaign,
    cb = b.load().campaign;
  ca.world.heat = 5;
  assert.equal(a.save(ca), true);
  cb.world.heat = 1;
  assert.equal(b.save(cb), false, 'the stale tab is refused');
  assert.equal(b.save(cb), false, 'and stays refused');
  assert.equal(b.stale, true);
  assert.equal(told, 1, 'the notice is shown once');
  assert.equal(JSON.parse(storage.map.get(CAMPAIGN_KEY)).world.heat, 5, "the first tab's progress stands");
  assert.equal(a.save(ca), true, 'the tab that wrote last carries on');
  const fresh = createStore(storage);
  const cf = fresh.load().campaign;
  assert.equal(fresh.save(cf), true, 'a reloaded tab writes again');
});

test('double settlement is impossible across tabs: the result counts once', () => {
  const s = SETTLEMENTS.find(s => s.id === 'myrtia');
  const storage = memory();
  const c = newCampaign({id: 'run'});
  const e = encounterFor(c, s.id, settlementSource(s, c));
  deploy(c, e);
  writeResult(c, e.id, {outcome: 'won', enemyLosses: {garrison: 3, militia: 2}});
  createStore(storage).save(c);
  // both tabs sit at the debrief of the same mission
  const a = createStore(storage),
    b = createStore(storage);
  const ca = a.load().campaign,
    cb = b.load().campaign;
  assert.ok(settle(ca, e.id));
  assert.equal(a.save(ca), true);
  settle(cb, e.id); // in memory only
  assert.equal(b.save(cb), false);
  const after = createStore(storage).load().campaign;
  assert.deepEqual(after.world.settlements[s.id], ca.world.settlements[s.id], 'what was saved is the one settlement');
  assert.equal(after.settled.filter(id => id === e.id).length, 1, 'settled once');
});

test('a save from before revisions is read as revision 0 and written over', () => {
  const old = newCampaign({id: 'old'});
  delete old.rev;
  const storage = memory({[CAMPAIGN_KEY]: JSON.stringify(old)});
  const store = createStore(storage);
  const {campaign} = store.load();
  assert.equal(campaign.rev, 0);
  assert.equal(store.save(campaign), true);
  assert.equal(campaign.rev, 1);
});

test('a write that fails leaves the revision where it was', () => {
  const storage = memory();
  const store = createStore(storage);
  const {campaign} = store.load();
  storage.setItem = () => {
    throw new Error('full');
  };
  assert.equal(store.save(campaign), false);
  assert.equal(campaign.rev, 0);
  assert.equal(store.stale, false, 'a full disk is not another tab');
});
