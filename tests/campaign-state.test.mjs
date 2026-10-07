// Campaign save (WP-W1): new, load, migrate from the tactical squad and Rebel Band saves, and corrupt input
// (shared/campaign/state.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign, normalize, migrate, logEvent, createStore, VERSION, CAMPAIGN_KEY, BAND_KEY} from '../shared/campaign/state.js';
import {SQUAD_KEY, newSquad} from '../convoy/progression.js';
import {START_BAND, START_STASH, TROOPS, GEAR} from '../band/troops.js';

/** A Storage stand-in; `fail` makes every call throw (private mode, blocked site data). */
function memory(init = {}, {fail = false} = {}) {
  const m = new Map(Object.entries(init));
  const guard = () => {
    if (fail) throw new Error('storage blocked');
  };
  return {
    map: m,
    getItem: k => (guard(), m.has(k) ? m.get(k) : null),
    setItem: (k, v) => (guard(), m.set(k, String(v))),
    removeItem: k => (guard(), m.delete(k)),
  };
}

const squadSave = () => {
  const s = newSquad();
  s.classes.player = 'guerrilla';
  s.xp = {player: 120, mila: 45, dragan: 0};
  s.stash = {vest: 2, scope: 1};
  s.scrip = 75;
  s.goods = [{name: 'Cigarettes', price: 12}];
  s.missions = 3;
  s.record.convoy = {played: 3, won: 2};
  s.log = [{level: 'convoy', outcome: 'won', difficulty: 'normal', loot: ['Vest']}];
  return JSON.stringify(s);
};
const bandSave = () =>
  JSON.stringify({
    band: {volunteer: {count: 5, xp: 100}, rifleman: {count: 2, xp: 300}, notaclass: {count: 9, xp: 1}},
    stash: {vest: 3, pkm: 1, laser_sword: 4},
    leader: {name: 'Kestrel', level: 9},
    raids: 2,
  });

test('a new campaign is versioned and holds world, band, stash and log', () => {
  const c = newCampaign({id: 'x', seed: 42, now: 1000});
  assert.equal(c.version, VERSION);
  assert.deepEqual([c.id, c.seed, c.created, c.saved], ['x', 42, 1000, 1000]);
  assert.deepEqual(c.world.clock, {day: 1, hour: 8, speed: 0});
  assert.equal(c.world.party, null);
  assert.deepEqual(Object.keys(c.band.fighters), ['player', 'mila', 'dragan']);
  for (const f of Object.values(c.band.fighters)) assert.ok(TROOPS[f.class]);
  assert.deepEqual(c.band.troops, START_BAND);
  for (const [g, n] of Object.entries(START_STASH)) assert.ok(c.stash[g] >= n, g);
  assert.deepEqual([c.log, c.settled, c.deployment], [[], [], null]);
  assert.deepEqual(normalize(JSON.stringify(c)), c, 'a fresh campaign survives a round trip unchanged');
});

test('migration brings the squad rebels, scrip, goods, record and log, and the band troops and leader', () => {
  const c = migrate({squad: squadSave(), band: bandSave()}, {now: 5});
  assert.deepEqual(c.migratedFrom, [SQUAD_KEY, BAND_KEY]);
  assert.deepEqual(c.band.fighters.player, {class: 'guerrilla', xp: 120, wounded: false, healIn: 0, kit: null});
  assert.equal(c.band.fighters.mila.xp, 45);
  assert.equal(c.scrip, 75);
  assert.deepEqual(c.goods, [{name: 'Cigarettes', price: 12}]);
  assert.deepEqual(c.record.convoy, {played: 3, won: 2});
  assert.equal(c.log[0].kind, 'mission');
  assert.deepEqual(c.band.troops, {volunteer: {count: 5, xp: 100}, rifleman: {count: 2, xp: 300}}, 'unknown classes dropped');
  assert.equal(c.band.leader.name, 'Kestrel');
  assert.equal(c.band.leader.level, 9);
  assert.ok(c.band.leader.skills, 'missing leader fields keep their defaults');
  assert.deepEqual(c.stash, {vest: 5, scope: 1, pkm: 1}, 'both stashes added; unknown gear dropped');
  assert.equal(c.created, 5);
});

test('migration from one save, and from none', () => {
  const s = migrate({squad: squadSave()});
  assert.deepEqual(s.migratedFrom, [SQUAD_KEY]);
  assert.deepEqual(s.band.troops, START_BAND, 'no band save: the starting band');
  assert.deepEqual(s.stash, {vest: 2, scope: 1}, 'the squad stash only');
  const b = migrate({band: bandSave()});
  assert.deepEqual(b.migratedFrom, [BAND_KEY]);
  assert.equal(b.scrip, newCampaign().scrip);
  assert.deepEqual(b.stash, {vest: 3, pkm: 1});
  assert.deepEqual(migrate({}).migratedFrom, []);
});

test('broken older saves are skipped rather than half-migrated', () => {
  for (const bad of ['{', 'null', '[]', '42', '"text"']) {
    const c = migrate({squad: bad, band: bad});
    assert.deepEqual(c.migratedFrom, [], bad);
    assert.deepEqual(c.band.troops, START_BAND);
  }
  assert.deepEqual(migrate({band: JSON.stringify({stash: {vest: 1}})}).migratedFrom, [], 'a band save needs its troops');
});

test('normalize repairs fields and rejects what is not a version-1 campaign', () => {
  for (const bad of ['{', 'null', '[]', JSON.stringify({version: 2}), JSON.stringify({id: 'c1'})])
    assert.throws(() => normalize(bad), undefined, bad);
  const c = newCampaign();
  const raw = {
    ...c,
    world: {clock: {day: -3, hour: 30, speed: 'fast'}, party: {x: 'a'}, parties: [1, {id: 'p'}], heat: -5},
    band: {fighters: {ghost: {class: 'nope'}}, troops: {rifleman: {count: 0}, medic: {count: 2.7, xp: -9}}},
    stash: {vest: -1, scope: 2.5, nonsense: 3},
    goods: [{name: 'Tea', price: 3}, {name: 7}],
    scrip: Number.NaN,
    settled: ['e1', 4],
    log: Array.from({length: 250}, (_, i) => ({i})),
  };
  const n = normalize(JSON.stringify(raw));
  assert.deepEqual(n.world.clock, {day: 1, hour: 6, speed: 0});
  assert.equal(n.world.party, null);
  assert.deepEqual(n.world.parties, [{id: 'p'}]);
  assert.equal(n.world.heat, 0);
  assert.deepEqual(Object.keys(n.band.fighters), ['player', 'mila', 'dragan'], 'no valid fighter: the defaults');
  assert.deepEqual(n.band.troops, {medic: {count: 2, xp: 0}});
  assert.deepEqual(n.stash, {scope: 2});
  for (const g of Object.keys(n.stash)) assert.ok(GEAR[g]);
  assert.deepEqual(n.goods, [{name: 'Tea', price: 3}]);
  assert.equal(n.scrip, c.scrip);
  assert.deepEqual(n.settled, ['e1']);
  assert.equal(n.log.length, 200);
  assert.deepEqual(n.log.at(-1), {i: 249, seq: 200}, 'the newest entries kept (numbered: an old save had no seq)');
});

test('the log stamps entries with the campaign clock and stays bounded', () => {
  const c = newCampaign();
  c.world.clock.day = 4;
  logEvent(c, {kind: 'encounter', text: 'Convoy sighted'});
  assert.deepEqual(c.log[0], {day: 4, hour: 8, kind: 'encounter', text: 'Convoy sighted', seq: 1});
  for (let i = 0; i < 260; i++) logEvent(c, {i});
  assert.equal(c.log.length, 200);
});

test('store: new, migrated, saved and loaded back; the older saves stay for the standalone modules', () => {
  let t = 100;
  const empty = createStore(memory(), {now: () => t});
  assert.equal(empty.load().status, 'new');

  const storage = memory({[SQUAD_KEY]: squadSave(), [BAND_KEY]: bandSave()});
  const store = createStore(storage, {now: () => t});
  const first = store.load({id: 'run1'});
  assert.equal(first.status, 'migrated');
  assert.equal(first.campaign.id, 'run1');
  first.campaign.world.heat = 3;
  t = 200;
  assert.equal(store.save(first.campaign), true);
  assert.ok(storage.map.has(SQUAD_KEY) && storage.map.has(BAND_KEY), 'older saves untouched');
  const again = store.load();
  assert.equal(again.status, 'loaded', 'once saved, the campaign is read, not migrated again');
  assert.equal(again.campaign.world.heat, 3);
  assert.equal(again.campaign.saved, 200);
  assert.deepEqual(again.campaign, first.campaign);
  store.clear();
  assert.equal(storage.map.has(CAMPAIGN_KEY), false);
});

test('store: a corrupt save is kept aside and a fresh campaign starts; blocked storage never throws', () => {
  const storage = memory({[CAMPAIGN_KEY]: '{"version":1,'});
  const r = createStore(storage).load();
  assert.equal(r.status, 'recovered');
  assert.equal(r.campaign.version, VERSION);
  assert.equal(storage.map.get(CAMPAIGN_KEY + '-corrupt'), '{"version":1,', 'the unreadable text is not lost');

  const blocked = createStore(memory({}, {fail: true}));
  const b = blocked.load();
  assert.equal(b.status, 'new');
  assert.equal(blocked.save(b.campaign), false, 'save reports failure instead of throwing');
  assert.doesNotThrow(() => blocked.clear());
  assert.equal(createStore(null).load().status, 'new', 'no storage at all');
});

test('an old save (log without seq, seen as a position) is read on from where it was', () => {
  const c = newCampaign();
  for (let i = 0; i < 5; i++) logEvent(c, {kind: 'result', i});
  const old = JSON.parse(JSON.stringify(c));
  for (const e of old.log) delete e.seq;
  old.world.seen = 3; // the map had shown the first three
  const n = normalize(old);
  assert.deepEqual(
    n.log.filter(e => e.seq > n.world.seen).map(e => e.i),
    [3, 4],
    'the last two are still to be shown',
  );
});
