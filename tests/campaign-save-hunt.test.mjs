// The campaign save hunt (WP-QA4): a played-in campaign save, damaged thousands of ways (keys removed, values swapped
// for null, NaN, strings, arrays, objects, huge numbers; JSON cut short). Loading must either refuse it (the store keeps
// the raw text and starts afresh) or repair it into a campaign every rule can work with: deploying, settling,
// reading results, passing time, healing, and saving again unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign, normalize, createStore, logEvent} from '../shared/campaign/state.js';
import {deploy, enter, writeResult, settle, settleAbandoned} from '../shared/campaign/encounter.js';
import {encounterFor, fitFighters, readResults, passTime, SOURCES} from '../shared/campaign/contacts.js';

function playedIn() {
  const c = newCampaign({id: 'hunt', seed: 3});
  for (let n = 0; n < 4; n++) {
    while (!fitFighters(c).length) passTime(c, 12);
    const e = encounterFor(c, Object.keys(SOURCES)[n]);
    deploy(c, {...e, fighters: fitFighters(c)});
    enter(c, e.id);
    writeResult(c, e.id, {outcome: n % 2 ? 'won' : 'lost', fighters: {player: {state: 'wounded', xp: 5}}, kills: 1});
    settle(c, e.id);
    readResults(c);
  }
  c.band.fighters.player.kit = {armsId: 'ak', primary: {uid: 'a', slug: 'x'}, pockets: {slug: 'pockets', grids: []}};
  c.world.party = {x: 3, z: 4};
  logEvent(c, {kind: 'note'});
  return JSON.parse(JSON.stringify(c));
}

const VALUES = [null, undefined, NaN, Infinity, -1, 0, 1e308, '', 'x', [], [1, 'a'], {}, {a: 1}, true];
/** Every path into the object: ['band', 'fighters', 'player', 'xp'], ... */
const paths = (o, at = []) => (o && typeof o === 'object' ? [at, ...Object.keys(o).flatMap(k => paths(o[k], [...at, k]))] : [at]);

/** The rules a loaded campaign must survive. */
function exercise(c) {
  passTime(c, 30);
  readResults(c);
  settleAbandoned(c);
  if (!c.deployment && fitFighters(c).length) {
    const e = encounterFor(c, 'supply-convoy');
    deploy(c, {...e, fighters: fitFighters(c)});
    enter(c, e.id);
    writeResult(c, e.id, {outcome: 'won'});
    settle(c, e.id);
    readResults(c);
  }
  const again = normalize(JSON.parse(JSON.stringify(c)));
  assert.deepEqual(JSON.parse(JSON.stringify(again)), JSON.parse(JSON.stringify(c)), 'a repaired save saves and loads unchanged');
}

test('a damaged save is refused or repaired into one the rules can use', () => {
  const base = playedIn();
  let r = 99;
  const rand = () => (r = (Math.imul(r, 1103515245) + 12345) >>> 0) / 4294967296;
  const all = paths(base).filter(p => p.length);
  let refused = 0,
    repaired = 0;
  for (let i = 0; i < 2500; i++) {
    const o = structuredClone(base);
    for (let k = 0; k < 1 + Math.floor(rand() * 3); k++) {
      const p = all[Math.floor(rand() * all.length)];
      let at = o;
      for (const key of p.slice(0, -1)) at = at?.[key];
      if (!at || typeof at !== 'object') continue;
      if (rand() < 0.3) delete at[p.at(-1)];
      else at[p.at(-1)] = VALUES[Math.floor(rand() * VALUES.length)];
    }
    let c;
    try {
      c = normalize(JSON.stringify(o));
    } catch {
      refused++;
      continue;
    }
    repaired++;
    try {
      exercise(c);
    } catch (e) {
      assert.fail(`mutation ${i} loaded but broke the rules: ${e.message}\n${e.stack.split('\n')[1]}`);
    }
  }
  if (process.env.HUNT_STATS) console.log({repaired, refused});
  assert.ok(repaired > 2000, `most damage is repaired (${repaired} repaired, ${refused} refused)`);
});

test('a save cut short or not JSON is kept aside and a fresh campaign starts', () => {
  const raw = JSON.stringify(playedIn());
  for (const bad of [raw.slice(0, raw.length / 2), 'null', '[]', '"x"', '{"version":2}', '\u0000']) {
    const mem = new Map([['parp-campaign-v1', bad]]);
    const store = createStore({getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v), removeItem: k => mem.delete(k)});
    const {status} = store.load();
    assert.equal(status, 'recovered', JSON.stringify(bad).slice(0, 30));
    assert.equal(mem.get('parp-campaign-v1-corrupt'), bad, 'the damaged text is kept');
  }
});
