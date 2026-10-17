// Starter equipment is owned once; spent ammunition, empty slings and looted weapons survive mission boundaries.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCampaign, normalize} from '../shared/campaign/state.js';
import {deploy, writeResult, settle} from '../shared/campaign/encounter.js';
import {createCatalogue} from '../shared/inventory/catalogue.js';
import {roundsCarried} from '../shared/inventory/ammo.js';
import {attachAmmo} from '../convoy/kit-ammo.js';
import {Sim} from '../convoy/sim.js';
const cat = createCatalogue(JSON.parse(fs.readFileSync('convoy/data/inventory-items.json')));
const classes = c => Object.fromEntries(Object.entries(c.band.fighters).map(([id, f]) => [id, f.class]));

test('all eight fresh fighters have only a Mosin, ten rounds and no reserve equipment', () => {
  const c = normalize(newCampaign());
  assert.deepEqual(c.stash, {});
  assert.equal(Object.keys(c.band.fighters).length, 8);
  for (const f of Object.values(c.band.fighters)) {
    assert.equal(f.wounded, false);
    assert.equal(f.kit.armsId, 'hunting');
    assert.equal(roundsCarried(cat, f.kit, cat.def(f.kit.primary.slug).calibre), 10);
    for (const slot of ['secondary', 'rig', 'armor', 'headwear', 'backpack']) assert.equal(f.kit[slot], null);
  }
  const sim = new Sim({squad: classes(c)});
  attachAmmo(sim, cat, {campaign: true, kits: Object.fromEntries(Object.entries(c.band.fighters).map(([id, f]) => [id, f.kit]))});
  for (const u of sim.units.filter(u => u.side === 'partisan')) {
    assert.deepEqual(u.weapons, ['hunting']);
    assert.equal(u.grenades, 0);
    assert.equal(u.mags.hunting + u.reserve.hunting, 10);
  }
});

test('ten shots exhaust the kit and a later deployment or promotion cannot replenish it', () => {
  let c = newCampaign();
  deploy(c, {id: 'one', level: 'convoy', fighters: ['player']});
  const sim = new Sim({squad: {player: 'insurgent'}});
  const a = attachAmmo(sim, cat, {campaign: true, kits: structuredClone(c.deployment.kits)});
  const p = sim.player;
  let shots = 0;
  for (let i = 0; i < 30; i++) {
    p.cd = 0;
    if (sim.shoot(p, p.x + 40, p.z)) shots++;
    if (p.reload) {
      p.reload = 0;
      a.sync(p);
      sim.ammo.reloaded(p);
    }
  }
  assert.equal(shots, 10);
  writeResult(c, 'one', {outcome: 'won', kits: a.kits});
  settle(c);
  c = normalize(c);
  c.band.fighters.player.class = 'machinegunner';
  deploy(c, {id: 'two', level: 'convoy', fighters: ['player']});
  const next = new Sim({squad: {player: 'machinegunner'}});
  attachAmmo(next, cat, {campaign: true, kits: c.deployment.kits});
  assert.deepEqual(next.player.weapons, ['hunting']);
  assert.equal(next.player.mags.hunting + next.player.reserve.hunting, 0);
  assert.equal(next.startReload(next.player), false);
});

test('looted replacement and empty primary persist without duplicating the original kit', () => {
  const c = newCampaign();
  deploy(c, {id: 'loot', level: 'convoy', fighters: ['player']});
  const sim = new Sim();
  const a = attachAmmo(sim, cat, {campaign: true, kits: structuredClone(c.deployment.kits)});
  const k = a.kitOf(sim.player);
  k.primary = a.factory.issue('ak').primary;
  a.sync(sim.player);
  assert.equal(sim.player.weapon, 'ak');
  assert.equal(sim.player.mags.ak, 30);
  writeResult(c, 'loot', {outcome: 'won', kits: {player: k}});
  settle(c);
  assert.equal(c.armoury.inbox.length, 0, 'the old rifle was transferred in the field, not recreated at home');
  k.primary = null;
  a.sync(sim.player);
  assert.equal(sim.shoot(sim.player, 40, 0), false);
  assert.equal(normalize(c).band.fighters.player.kit.primary, null);
});
