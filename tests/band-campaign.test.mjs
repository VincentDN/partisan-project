// The band screen on the campaign save (WP-W15): opened with ?campaign it reads and writes the campaign's band, stash
// and named fighters; a fighter's promotion spends their experience and the stash's kit; troop upgrades land in the
// campaign; the standalone demo keeps its own save and never touches the campaign's.
import test from 'node:test';
import assert from 'node:assert/strict';
import {openBand, promoteFighter, canPromoteFighter, fighterProgress} from '../band/band-state.js';
import {createStore, CAMPAIGN_KEY, BAND_KEY} from '../shared/campaign/state.js';
import {TROOPS, upgrade, canUpgrade} from '../band/troops.js';

const memory = () => {
  const m = new Map();
  return {getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), m};
};
const campaign = new URLSearchParams('campaign=c1');

/** A fighter whose class has a next step, given the experience and the kit for it. */
function readyFighter(S) {
  for (const [id, f] of Object.entries(S.fighters)) {
    const t = TROOPS[f.class];
    if (!t.to.length) continue;
    const to = t.to[0];
    f.xp = t.xp + 7;
    for (const [g, n] of Object.entries(TROOPS[to].needs)) S.stash[g] = (S.stash[g] || 0) + n;
    return {id, from: f.class, to, cost: t.xp, needs: TROOPS[to].needs};
  }
  throw new Error('no fighter with a next step');
}

test('band: with ?campaign it opens the campaign band, fighters included', () => {
  const store = memory();
  const c = createStore(store).load().campaign;
  createStore(store).save(c);
  const {S, mode} = openBand(campaign, store);
  assert.equal(mode, 'campaign');
  assert.deepEqual(Object.keys(S.fighters), Object.keys(c.band.fighters), 'the named fighters');
  assert.deepEqual(S.band, c.band.troops, 'the troop stacks');
  assert.deepEqual(S.stash, c.stash, 'the stash');
});

test('band: promoting a fighter spends experience and kit, and the map sees it', () => {
  const store = memory();
  const opened = openBand(campaign, store);
  const S = opened.S;
  const r = readyFighter(S);
  const stash0 = {...S.stash};
  assert.ok(canPromoteFighter(S, r.id, r.to));
  assert.ok(promoteFighter(S, r.id, r.to));
  assert.equal(S.fighters[r.id].class, r.to);
  assert.equal(S.fighters[r.id].xp, 7, 'the step is paid in experience');
  for (const [g, n] of Object.entries(r.needs)) assert.equal(S.stash[g] || 0, stash0[g] - n, `${g} taken from the stash`);
  assert.ok(opened.save(S));
  // the map opens the same save
  const c = createStore(store).load().campaign;
  assert.equal(c.band.fighters[r.id].class, r.to, 'saved in the campaign');
  for (const [g, n] of Object.entries(r.needs)) assert.equal(c.stash[g] || 0, stash0[g] - n);
  assert.equal(store.getItem(BAND_KEY), null, 'the standalone demo save is untouched');
});

test('band: a fighter without the experience or the kit stays as they are', () => {
  const {S} = openBand(campaign, memory());
  const [id, f] = Object.entries(S.fighters).find(([, f]) => TROOPS[f.class].to.length);
  const to = TROOPS[f.class].to[0];
  f.xp = 0;
  assert.equal(canPromoteFighter(S, id, to), false);
  assert.equal(promoteFighter(S, id, to), false);
  assert.equal(S.fighters[id].class, f.class);
  assert.equal(fighterProgress(S, id).frac, 0);
});

test('band: troop upgrades in campaign mode are written to the campaign', () => {
  const store = memory();
  const opened = openBand(campaign, store);
  const S = opened.S;
  const [from, to] = Object.keys(S.band)
    .flatMap(id => TROOPS[id].to.map(to => [id, to]))
    .find(([id, to]) => {
      S.band[id].xp = S.band[id].count * TROOPS[id].xp;
      for (const [g, n] of Object.entries(TROOPS[to].needs)) S.stash[g] = (S.stash[g] || 0) + n * S.band[id].count;
      return canUpgrade(S.band, S.stash, id, to) > 0;
    });
  const r = upgrade(S.band, S.stash, from, to, 1);
  S.band = r.band;
  S.stash = r.stash;
  opened.save(S);
  const c = createStore(store).load().campaign;
  assert.equal(c.band.troops[to].count, opened.campaign.band.troops[to]?.count ?? 0, 'the new class has the soldier');
  assert.ok(c.band.troops[to].count >= 1);
});

test('band: opened on its own it is the standalone demo with its own save', () => {
  const store = memory();
  const opened = openBand(new URLSearchParams(''), store);
  assert.equal(opened.mode, 'standalone');
  assert.equal(opened.S.fighters, undefined, 'no campaign fighters');
  opened.S.raids = 3;
  opened.save(opened.S);
  assert.equal(JSON.parse(store.getItem(BAND_KEY)).raids, 3);
  assert.equal(store.getItem(CAMPAIGN_KEY), null, 'no campaign save made');
  assert.equal(openBand(new URLSearchParams(''), store).S.raids, 3, 'and it comes back');
});
