// Rebel Band: the troop tree is consistent, upgrades spend experience and stash equipment, and the start lets you play.
import test from 'node:test';
import assert from 'node:assert/strict';
import {GEAR, CLASSES, TROOPS, START_BAND, START_STASH, ready, canUpgrade, upgrade, bandSize, abilitiesOf, pathTo} from '../band/troops.js';
import {layout} from '../band/tree.js';

test('every path leads to a real troop one tier up, and every need is stash equipment', () => {
  const classes = new Set(CLASSES.map(c => c.id));
  for (const [id, t] of Object.entries(TROOPS)) {
    assert.ok(classes.has(t.cls), `${id} class`);
    for (const to of t.to) {
      assert.ok(TROOPS[to], `${id} -> ${to}`);
      assert.equal(TROOPS[to].tier, t.tier + 1, `${id} -> ${to} is one tier up`);
    }
    if (t.to.length) assert.ok(t.xp > 0, `${id} has an xp cost`);
    for (const item of Object.keys(t.needs)) assert.ok(GEAR[item], `${id} needs ${item}`);
  }
  // every troop is reachable from the volunteer
  const seen = new Set(['volunteer']),
    queue = ['volunteer'];
  while (queue.length) for (const to of TROOPS[queue.shift()].to) if (!seen.has(to)) seen.add(to) && queue.push(to);
  assert.deepEqual([...seen].sort(), Object.keys(TROOPS).sort());
});

test('the depot raid stocks every step at least once, and some soldiers are ready from the start', () => {
  for (const [id, t] of Object.entries(TROOPS))
    for (const [item, per] of Object.entries(t.needs)) assert.ok(START_STASH[item] >= per, `${id}: ${item}`);
  assert.ok(Object.keys(START_BAND).some(id => TROOPS[id].to.some(to => canUpgrade(START_BAND, START_STASH, id, to) > 0)));
});

test('an upgrade moves soldiers, spends their experience and the equipment, and leaves the inputs alone', () => {
  const band = {volunteer: {count: 5, xp: 3 * 40 + 10}},
    stash = {ak74: 1, rig: 4};
  assert.equal(ready(band, 'volunteer'), 3);
  assert.equal(canUpgrade(band, stash, 'volunteer', 'fighter'), 1, 'one AK in the stash');
  assert.equal(canUpgrade(band, stash, 'volunteer', 'insurgent'), 0, 'not a step from Village Infantry');
  const r = upgrade(band, stash, 'volunteer', 'fighter', 3);
  assert.equal(r.n, 1);
  assert.deepEqual(r.band, {volunteer: {count: 4, xp: 2 * 40 + 10}, fighter: {count: 1, xp: 0}});
  assert.deepEqual(r.stash, {ak74: 0, rig: 4});
  assert.deepEqual(band, {volunteer: {count: 5, xp: 130}}, 'input band untouched');
  assert.equal(bandSize(r.band), 5);
});

test('the tree: Village Infantry, Fighter, Insurgent, then heavy, medium and light builds, seven tiers deep', () => {
  assert.deepEqual(pathTo('insurgent'), ['volunteer', 'fighter', 'insurgent']);
  assert.deepEqual(TROOPS.insurgent.to.sort(), ['guerrilla', 'heavy', 'skirmisher']);
  for (const id of ['machinegunner', 'engineer', 'droneop', 'recon', 'sniper', 'medic', 'signaller', 'saboteur', 'antiarmour'])
    assert.ok(TROOPS[id], id);
  assert.equal(Math.max(...Object.values(TROOPS).map(t => t.tier)), 7);
  assert.ok(Object.keys(TROOPS).length >= 40, `${Object.keys(TROOPS).length} classes`);
  for (const [id, t] of Object.entries(TROOPS))
    if (t.tier >= 4) assert.equal(t.build, TROOPS[pathTo(id)[3]].build, `${id} stays in its build`);
});

test('every class has its own abilities and keeps those of the classes it came through', () => {
  for (const [id, t] of Object.entries(TROOPS)) {
    assert.ok(t.abilities.length >= 2, `${id} abilities`);
    for (const a of t.abilities) assert.ok(a.name && a.text && ['active', 'passive'].includes(a.kind), `${id}: ${a.name}`);
    const all = abilitiesOf(id);
    assert.equal(all.filter(a => a.own).length, t.abilities.length);
    assert.equal(
      all.length,
      pathTo(id).reduce((s, c) => s + TROOPS[c].abilities.length, 0),
    );
  }
});

test('the tree layout gives every class its own place, children right of their parent', () => {
  const {pos, rows} = layout();
  assert.equal(Object.keys(pos).length, Object.keys(TROOPS).length);
  const seen = new Set();
  for (const [id, p] of Object.entries(pos)) {
    const key = `${p.x},${p.y}`;
    assert.ok(!seen.has(key), `overlap at ${key}`);
    seen.add(key);
    if (TROOPS[id].from) assert.ok(pos[TROOPS[id].from].x < p.x);
  }
  assert.ok(rows >= 10);
});
