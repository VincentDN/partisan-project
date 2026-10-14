// Auto-resolve uses selected identities, bounded eligibility and deterministic normal campaign settlement.
import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign, normalize, createStore} from '../shared/campaign/state.js';
import {autoPreview, resolveAuto} from '../shared/campaign/auto-resolve.js';
import {encounterFor, SOURCES, readResults, isGone} from '../shared/campaign/contacts.js';
import {settle} from '../shared/campaign/encounter.js';

function fixture(source = 'fuel-convoy') {
  const c = newCampaign();
  for (const f of Object.values(c.band.fighters)) f.class = 'sniper';
  return {c, e: encounterFor(c, source)};
}

test('fresh and recovered campaigns start with eight fit fighters; loading preserves earned wounds', () => {
  for (const storage of [null, {getItem: () => '{broken', setItem() {}}]) {
    const c = createStore(storage).load().campaign;
    assert.equal(Object.keys(c.band.fighters).length, 8);
    assert.ok(Object.values(c.band.fighters).every(f => !f.wounded && f.healIn === 0));
  }
  const c = newCampaign();
  Object.assign(c.band.fighters.mila, {wounded: true, healIn: 19});
  assert.equal(normalize(c).band.fighters.mila.healIn, 19);
  assert.equal(normalize(c).band.fighters.mila.wounded, true);
});

test('eligibility follows selected strength, patrol exception and forbidden important fights', () => {
  const {c, e} = fixture();
  assert.equal(autoPreview(c, e).eligible, true);
  e.enemy.strength = 23; // 56 / 23 < 2.5
  assert.equal(autoPreview(c, e).eligible, false);
  e.enemy.strength = 22.4;
  assert.equal(autoPreview(c, e).eligible, true);
  e.fighters.pop();
  assert.equal(autoPreview(c, e).eligible, false);
  c.band.troops.insurgent = {count: 9999, xp: 0};
  assert.equal(autoPreview(c, e).eligible, false, 'reserves do not inflate odds');
  const patrol = encounterFor(c, 'orion-patrol');
  assert.equal(autoPreview(c, patrol).eligible, true);
  for (const kind of ['settlement', 'hunters']) {
    const forbidden = {...patrol, enemy: {...patrol.enemy, kind, strength: 1}};
    assert.equal(autoPreview(c, forbidden).eligible, false);
  }
  for (const level of ['cave', 'hilltop', 'compound', 'village']) assert.equal(autoPreview(c, {...patrol, level}).eligible, false);
  e.fighters = e.fighters.slice(0, 5);
  assert.equal(autoPreview(c, e).eligible, false);
  assert.equal(autoPreview(c, {...patrol, fighters: ['player', ...patrol.fighters]}).eligible, false);
});

test('seeded outcomes survive reload, settle once, preserve kits and apply reduced cargo', () => {
  const {c, e} = fixture('supply-convoy');
  e.seed = 1;
  const kit = {primary: {uid: 'rifle'}, pockets: {grids: []}};
  c.band.fighters.player.kit = kit;
  const copy = normalize(structuredClone(c));
  const a = resolveAuto(c, e),
    b = resolveAuto(copy, structuredClone(e));
  assert.deepEqual(a, b);
  assert.equal(a.result.outcome, 'won');
  assert.deepEqual(a.result.cargo, {ak74: 3, ak74m: 1, grenades: 2, medkit: 1, rig: 1, helmet: 1});
  assert.equal(c.band.fighters.player.kit, kit);
  assert.equal(c.deployment, null);
  assert.equal(c.record.convoy.won, 1);
  assert.equal(settle(c, e.id), null);
  const before = structuredClone(c);
  assert.throws(() => resolveAuto(c, e));
  assert.deepEqual(c, before);
  readResults(c);
  assert.equal(isGone(c, 'supply-convoy'), true);
  const heat = c.world.heat;
  readResults(c);
  assert.equal(c.world.heat, heat);
});

test('a wounded pick or active deployment is rejected without mutation; losses give no loot', () => {
  const {c, e} = fixture();
  c.band.fighters.player.wounded = true;
  let before = structuredClone(c);
  assert.throws(() => resolveAuto(c, e));
  assert.deepEqual(c, before);
  c.band.fighters.player.wounded = false;
  c.deployment = {id: 'busy'};
  before = structuredClone(c);
  assert.throws(() => resolveAuto(c, e));
  assert.deepEqual(c, before);
  let loss;
  for (let seed = 1; seed < 10000 && !loss; seed++) {
    const f = fixture('orion-patrol');
    f.e.seed = seed;
    const result = resolveAuto(f.c, f.e).result;
    if (result.outcome === 'lost') loss = result;
  }
  assert.ok(loss);
  assert.deepEqual(loss.loot, {});
  assert.deepEqual(loss.cargo, {});
  assert.equal(SOURCES['orion-patrol'].patrol, true);
});
