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
