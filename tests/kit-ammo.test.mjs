// Real ammunition in the fights and searching the dead (WP-S9 and S11, TAC-C-11, convoy/kit-ammo.js): a rebel fires
// the rounds in their kit and is dry after sixty; reloads swap real magazines; the round fired sets the damage; the dead
// and the wrecks become searchable, and what is taken from them can be fired.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Sim} from '../convoy/sim.js';
import {attachAmmo} from '../convoy/kit-ammo.js';
import {createCatalogue} from '../shared/inventory/catalogue.js';
import {roundsCarried} from '../shared/inventory/ammo.js';
import {add, contents} from '../shared/inventory/grid.js';
import {everything} from '../shared/inventory/kit.js';
import {ARMS} from '../shared/inventory/arms.js';

const cat = createCatalogue(JSON.parse(fs.readFileSync('wiki/data/items.json', 'utf8')));
/** Fire until dry; a reload completes at once (the sim's clock stops once the fight is won). */
const fireAll = sim => {
  let shots = 0;
  const p = sim.player;
  for (let i = 0; i < 500; i++) {
    p.cd = 0;
    if (sim.shoot(p, p.x + 30, p.z)) shots++;
    else if (p.reload > 0) finish(sim);
    else if (!sim.startReload(p)) break;
  }
  return shots;
};
const finish = sim => {
  const p = sim.player;
  p.reload = 0;
  p.mags[p.reloading] = sim.ammo.reloaded(p, p.reloading);
  p.reloading = null;
};

test('a rebel fires the sixty rounds in their kit, then is dry until they loot', () => {
  const sim = new Sim({seed: 4});
  const A = attachAmmo(sim, cat, {seed: 4});
  const p = sim.player;
  sim.units.filter(u => u.side === 'army').forEach(u => (u.alive = false)); // nobody shoots back
  assert.ok(A.kitOf(p), 'the player has a kit');
  assert.equal(p.mags[p.weapon] + p.reserve[p.weapon], 60, 'sixty rounds');
  const shots = fireAll(sim);
  assert.equal(shots, 60, 'sixty shots, no more');
  assert.equal(p.mags[p.weapon], 0);
  assert.equal(sim.startReload(p), false, 'nothing to reload with');
  // loot a magazine of BP: it reloads, and the round sets the damage
  const m = A.factory.magazine('ak-74-545x39-6l23-30-round-magazine', '545x39mm-bp-gs', 30);
  assert.ok(add(cat, A.kitOf(p).rig, m));
  A.sync(p);
  assert.equal(p.reserve[p.weapon], 30);
  assert.equal(sim.startReload(p), true);
  finish(sim);
  assert.equal(p.mags[p.weapon], 30, 'the looted magazine is in');
  const mult = sim.ammo.fired(p, p.weapon);
  const bp = cat.def('545x39mm-bp-gs'),
    ps = cat.def('545x39mm-ps-gs');
  assert.equal(mult, bp.damage / ps.damage, 'the round fired sets the damage (BP trades flesh damage for penetration)');
  assert.equal(roundsCarried(cat, A.kitOf(p), '545x39'), 29);
});

test('without kits nothing changes: the old counters', () => {
  const sim = new Sim({seed: 4});
  assert.equal(sim.ammo, null);
  assert.ok(sim.player.mags[sim.player.weapon] > 0);
});

test('the dead and the wrecks become searchable, near where they fell', () => {
  const sim = new Sim({seed: 5});
  const A = attachAmmo(sim, cat, {seed: 5});
  const foe = sim.units.find(u => u.side === 'army' && u.state !== 'mounted');
  assert.ok(foe);
  foe.alive = false;
  const v = sim.vehicles[0];
  v.destroyed = true;
  A.scan();
  const body = A.near(foe.x + 1, foe.z);
  assert.ok(body, 'a body within reach');
  assert.ok(
    contents(body.container).some(i => cat.def(i.slug).kind === 'weapon'),
    'with his weapon',
  );
  assert.equal(A.near(foe.x + 40, foe.z + 40), null, 'out of reach');
  assert.ok(A.near(v.x, v.z), 'the wreck');
  const again = JSON.stringify(attachAmmo(new Sim({seed: 5}), cat, {seed: 5}).kits);
  assert.equal(again, JSON.stringify(attachAmmo(new Sim({seed: 5}), cat, {seed: 5}).kits), 'deterministic');
});

test('soldiers carry real kits: a body holds exactly what its soldier had left', () => {
  const sim = new Sim({seed: 6});
  const A = attachAmmo(sim, cat, {seed: 6, army: true});
  const foe = sim.units.find(u => u.side === 'army' && A.kitOf(u) && u.state !== 'turret');
  assert.ok(foe, 'a soldier with a kit');
  const w = foe.weapon;
  assert.ok(Number.isFinite(foe.reserve[w]), 'finite ammunition');
  for (let i = 0; i < 7; i++) sim.ammo.fired(foe, w);
  const cal = cat.def(A.kitOf(foe).primary.slug).calibre;
  const left = roundsCarried(cat, A.kitOf(foe), cal);
  foe.alive = false;
  foe.state = 'down';
  const body = A.scan().get(foe.id).container;
  const onBody = everything(body).reduce(
    (n, i) =>
      n +
      (cat.def(i.slug).calibre !== cal
        ? 0
        : cat.def(i.slug).kind === 'magazine'
          ? i.rounds.reduce((a, [, k]) => a + k, 0)
          : cat.def(i.slug).kind === 'ammo'
            ? i.count
            : i.chamber
              ? 1
              : 0),
    0,
  );
  assert.equal(onBody, left, 'what he had left, no more');
  assert.equal(A.kitOf(foe), null, 'it is all on the ground');
});

test('a fighter out of rounds takes a magazine off a body close by', () => {
  const sim = new Sim({seed: 6});
  const A = attachAmmo(sim, cat, {seed: 6, army: true});
  const [a, b] = sim.units.filter(u => u.side === 'army' && A.kitOf(u) && u.weapon === 'ak' && u.state !== 'turret');
  assert.ok(a && b, 'two riflemen');
  b.alive = false;
  b.state = 'down';
  Object.assign(b, {x: a.x + 2, z: a.z});
  const k = A.kitOf(a);
  k.primary.mag.rounds = [];
  k.primary.chamber = null;
  for (const c of [k.rig, k.pockets]) for (const g of c.grids) g.items = g.items.filter(e => cat.def(e.item.slug).kind !== 'magazine');
  A.sync(a);
  assert.equal(a.mags.ak + a.reserve.ak, 0, 'dry');
  for (let i = 0; i < 4 * 60; i++) A.scavenge(1 / 60);
  assert.ok(a.reserve.ak + a.mags.ak > 0, 'rounds again');
  assert.ok(
    sim.callouts.some(c => c.id === a.id && /magazines/.test(c.text)),
    'and says so',
  );
});

test("the level's crates are supply caches to search", () => {
  const sim = new Sim({level: 'checkpoint', seed: 2});
  const A = attachAmmo(sim, cat, {seed: 2});
  const crates = sim.level.cover.filter(c => c.kind === 'crate');
  assert.ok(crates.length >= 1);
  const c = A.near(crates[0].x + crates[0].w / 2 + 1, crates[0].z);
  assert.ok(c && /crate/i.test(c.label), 'a crate within reach');
  assert.ok(
    everything(c.container).some(i => cat.def(i.slug).kind === 'ammo'),
    'ammunition in it',
  );
});

test('L: a rebel ordered to loot walks to the body and takes what fits their weapon', () => {
  const sim = new Sim({seed: 3});
  const A = attachAmmo(sim, cat, {seed: 3, army: true});
  const mate = sim.units.find(u => u.side === 'partisan' && u !== sim.player && A.kitOf(u));
  const w = A.kitOf(mate).armsId,
    a = ARMS[w];
  const foe = sim.units.find(u => u.side === 'army');
  Object.assign(foe, {alive: false, state: 'down', x: mate.x + 6, z: mate.z});
  sim.units.filter(u => u.side === 'army').forEach(u => (u.alive = false)); // a quiet field
  const body = A.scan().get(foe.id).container;
  add(cat, body, a.mag ? A.factory.magazine(a.mag, a.round, 5) : A.factory.make(a.round)); // something for their weapon
  const before = mate.reserve[w];
  assert.ok(A.orderLoot([mate.id], foe.x, foe.z), 'a body near the cursor');
  for (let i = 0; i < 60 * 15 && A.looting.size; i++) {
    sim.outcome = null; // keep the clock running in this empty field
    sim.step(1 / 60, {});
    A.scavenge(1 / 60);
  }
  assert.equal(A.looting.size, 0, 'done');
  assert.ok(mate.reserve[w] > before, `more rounds: ${before} -> ${mate.reserve[w]}`);
  assert.ok(
    sim.callouts.some(c => c.id === mate.id && /^Took /.test(c.text)),
    'says what they took',
  );
});
