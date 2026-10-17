// Opening fairness: real shot dispersion, progressive damage, fixed four-guard raids and loot-before-extraction.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Sim} from '../convoy/sim.js';
import {LEVELS} from '../convoy/levels/index.js';
import {vary} from '../convoy/levels/variants.js';
import {WEAPONS} from '../convoy/weapons.js';
import {evaluate} from '../convoy/objectives.js';
import {newCampaign} from '../shared/campaign/state.js';
import {encounterFor} from '../shared/campaign/contacts.js';
import {deploy, writeResult, settle} from '../shared/campaign/encounter.js';
import {createCatalogue} from '../shared/inventory/catalogue.js';
import {attachAmmo} from '../convoy/kit-ammo.js';
const cat = createCatalogue(JSON.parse(fs.readFileSync('convoy/data/inventory-items.json')));

test('routine troops shoot less accurately; escalating response stays gradual and ordinary rounds cannot one-hit healthy rebels', t => {
  const hits = [];
  for (const tier of [null, 0, 1, 2, 3]) {
    const level = vary(LEVELS.roadblock, tier === null ? {} : {response: {tier}});
    level.cover = [];
    const s = new Sim({level, seed: 571, squad: {player: 'insurgent'}});
    const enemy = s.units.find(u => u.side === 'army'),
      p = s.player;
    s.units = [enemy, p];
    Object.assign(enemy, {x: 0, z: 0});
    Object.assign(p, {x: 30, z: 0});
    let n = 0;
    for (let i = 0; i < 1000; i++) {
      enemy.cd = 0;
      enemy.mags.ak = 30;
      s.shoot(enemy, p.x, p.z);
      if (s.projectiles.at(-1)?.hit === p) n++;
      s.projectiles.length = 0;
    }
    hits.push(n);
    for (const id of ['ak', 'pkm', 'svd', 'hmg']) {
      p.hp = p.maxHp;
      p.alive = true;
      s.damage(p, enemy, WEAPONS[id].damage);
      assert.ok(p.alive, `tier ${tier}, ${id}`);
      if (tier === 0) assert.ok(p.hp >= p.maxHp * 0.65, 'time to react even to a marksman hit');
    }
  }
  t.diagnostic(`Hits per 1000 shots at 30m, baseline then tiers 0–3: ${hits.join(', ')}`);
  assert.ok(hits[1] < hits[0] * 0.8, `opening hit counts ${hits}`);
  assert.ok(
    hits.slice(1).every((n, i, a) => !i || n >= a[i - 1]),
    `gradual accuracy ${hits}`,
  );
});

test('roadblock fields exactly four riflemen on every difficulty/tier; accepts only two to four fit fighters', () => {
  const c = newCampaign(),
    e = encounterFor(c, 'oros-roadblock');
  assert.equal(e.fighters.length, 3);
  for (const difficulty of ['easy', 'normal', 'hard', 'brutal'])
    for (const tier of [0, 1, 2, 3]) {
      const s = new Sim({
        level: vary(LEVELS.roadblock, {...e.variant, strength: 1.6, response: {tier}}),
        difficulty,
        squad: {player: 'insurgent', mila: 'marksman'},
      });
      const army = s.units.filter(u => u.side === 'army');
      assert.equal(army.length, 4);
      assert.ok(army.every(u => u.role === 'rifleman'));
    }
  for (const fighters of [['player'], Object.keys(c.band.fighters)]) assert.throws(() => deploy(c, {...e, fighters}), /two to four/);
  deploy(c, {...e, fighters: ['player', 'lena']});
  const s = new Sim({level: LEVELS.roadblock, squad: {player: 'insurgent', lena: 'insurgent'}});
  const ammo = attachAmmo(s, cat, {campaign: true, kits: c.deployment.kits});
  assert.equal(s.units.find(u => u.id === 'lena').weapon, 'tt');
  for (const u of s.units.filter(u => u.side === 'army')) {
    u.alive = false;
    u.hp = 0;
  }
  assert.equal(evaluate(s), null, 'there is time to search the bodies');
  for (const u of s.units.filter(u => u.side === 'partisan')) Object.assign(u, {x: -35, z: 22});
  assert.equal(evaluate(s), 'won');
  writeResult(c, e.id, {outcome: 'won', kits: ammo.kits, loot: {ak74: 1}});
  settle(c);
  assert.equal(c.stash.ak74, 1);
  settle(c);
  assert.equal(c.stash.ak74, 1, 'loot is awarded once');
});

test('old pistols can fire and reload their ten owned rounds without a calibre mismatch', () => {
  const c = newCampaign(),
    s = new Sim({squad: {lena: 'insurgent'}});
  attachAmmo(s, cat, {campaign: true, kits: {lena: c.band.fighters.lena.kit}});
  const a = s.ammo;
  const u = s.units.find(u => u.id === 'lena');
  for (let i = 0; i < 8; i++) a.fired(u, 'tt');
  assert.equal(u.mags.tt, 0);
  assert.equal(a.reloaded(u), 2);
  for (let i = 0; i < 2; i++) a.fired(u, 'tt');
  assert.equal(u.mags.tt + u.reserve.tt, 0);
});
