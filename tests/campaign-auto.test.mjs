// Auto-resolve uses selected identities, bounded eligibility and deterministic normal campaign settlement.
import test from 'node:test';
import fs from 'node:fs';
import {createCatalogue} from '../shared/inventory/catalogue.js';
import {ARMS} from '../shared/inventory/arms.js';
import assert from 'node:assert/strict';
import {newCampaign, normalize, createStore} from '../shared/campaign/state.js';
import {autoPreview, resolveAuto} from '../shared/campaign/auto-resolve.js';
import {encounterFor, SOURCES, readResults, isGone} from '../shared/campaign/contacts.js';
import {starterKit} from '../shared/campaign/starter-kit.js';
import {kitCounts} from '../shared/campaign/loot-report.js';
import {AMMO_INDEX} from '../shared/campaign/ammo-index.js';
import {settle} from '../shared/campaign/encounter.js';

function fixture(source = 'fuel-convoy') {
  const c = newCampaign();
  for (const [id, f] of Object.entries(c.band.fighters)) {
    f.class = 'sniper';
    f.kit = starterKit('dragan');
    f.kit.primary.uid = `${id}-rifle`;
    f.kit.primary.mag.uid = `${id}-mag`;
  }
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
  const kit = structuredClone(c.band.fighters.player.kit);
  const copy = normalize(structuredClone(c));
  const a = resolveAuto(c, e),
    b = resolveAuto(copy, structuredClone(e));
  assert.deepEqual(a, b);
  assert.equal(a.result.outcome, 'won');
  assert.deepEqual(a.result.cargo, {ak74: 3, ak74m: 1, grenades: 2, medkit: 1, rig: 1, helmet: 1});
  assert.equal(c.band.fighters.player.kit.primary.uid, kit.primary.uid);
  assert.equal(c.band.fighters.player.kit.primary.mag.rounds[0][1], 4);
  assert.equal(a.result.ammoSpent, 48);
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

const rounds = c =>
  Object.entries(kitCounts(Object.fromEntries(Object.entries(c.band.fighters).map(([id, f]) => [id, f.kit]))))
    .filter(([slug]) => AMMO_INDEX[slug]?.[0] === 'ammo')
    .reduce((n, [, count]) => n + count, 0);

test('owned weapons and compatible carried ammunition govern odds; dry or missing kits cannot auto-resolve', () => {
  const {c, e} = fixture();
  const equipped = autoPreview(c, e);
  c.band.fighters.player.kit = starterKit('player');
  assert.ok(autoPreview(c, e).strength < equipped.strength);
  c.band.fighters.player.kit.primary = null;
  assert.equal(autoPreview(c, e).eligible, false);
  const before = structuredClone(c);
  assert.throws(() => resolveAuto(c, e));
  assert.deepEqual(c, before);
  c.band.fighters.player.kit = starterKit('dragan');
  c.band.fighters.player.kit.primary.chamber = null;
  c.band.fighters.player.kit.primary.mag.rounds = [['545x39mm-ps-gs', 30]];
  c.stash.ak74 = 100;
  assert.equal(autoPreview(c, e).supplied, false, 'wrong calibre and stash weapons do not make a ready fighter');
});

test('both outcomes spend the previewed rounds exactly once; reload and repeated settlement conserve spent ammo', () => {
  const outcomes = new Set();
  for (let seed = 1; seed < 1000 && outcomes.size < 2; seed++) {
    const {c, e} = fixture('orion-patrol');
    e.seed = seed;
    const before = rounds(c),
      preview = autoPreview(c, e);
    const {result} = resolveAuto(c, e);
    outcomes.add(result.outcome);
    assert.equal(before - rounds(c), preview.ammunition);
    assert.equal(result.ammoSpent, preview.ammunition);
    const reloaded = normalize(JSON.stringify(c));
    settle(reloaded, e.id);
    assert.equal(rounds(reloaded), rounds(c));
    assert.equal(autoPreview(c, {...e, id: 'next'}).eligible, false, 'spent band cannot fight on free rounds');
  }
  assert.deepEqual([...outcomes].sort(), ['lost', 'won']);
});

test('loose compatible rounds and alternate loads are spent; wrong-calibre magazines remain untouched', () => {
  const {c, e} = fixture('orion-patrol');
  const k = c.band.fighters.player.kit;
  k.primary.chamber = '762x39mm-bp-gzh';
  k.primary.mag.rounds = [['762x39mm-bp-gzh', 1]];
  k.pockets.grids[0].items = [{x: 0, y: 0, item: {uid: 'loose', slug: '762x39mm-ps-gzh', count: 7}}];
  const wrong = {uid: 'wrong', slug: 'tt-762x25-tt-105-8-round-magazine', rounds: [['762x25mm-tt-pst-gzh', 8]]};
  k.pockets.grids[1].items = [{x: 0, y: 0, item: wrong}];
  const preview = autoPreview(c, e);
  assert.equal(preview.equipment[0].rounds, 9);
  resolveAuto(c, e);
  const back = c.band.fighters.player.kit;
  assert.equal(back.primary.chamber, null);
  assert.deepEqual(back.primary.mag.rounds, []);
  assert.deepEqual(back.pockets.grids[0].items, []);
  assert.deepEqual(back.pockets.grids[1].items[0].item, wrong);
});

test('lightweight auto-resolve calibre index stays consistent with the tactical inventory catalogue', () => {
  const data = JSON.parse(fs.readFileSync('convoy/data/inventory-items.json'));
  const cat = createCatalogue(data);
  const calibres = new Set(Object.values(ARMS).map(a => cat.def(a.weapon).calibre));
  for (const item of data.items) {
    const d = cat.def(item.slug);
    if (['ammo', 'magazine'].includes(d.kind) && calibres.has(d.calibre))
      assert.deepEqual(AMMO_INDEX[item.slug], [d.kind, d.calibre], item.slug);
  }
});
