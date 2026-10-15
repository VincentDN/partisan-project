// Owned guns (WP-W16, shared/campaign/builds.js): the Workbench offers a fighter the band's rifles and only free
// attachments (in the stash, not fitted to another fighter's build); locked parts say where they are found; a build
// is kept on the fighter through the save and changes how they fight (convoy/builds-in-mission.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign, normalize} from '../shared/campaign/state.js';
import {rifleLock, partLock, free, buildGear, buildMods, makeBuild, PART_GEAR, RIFLE_GEAR} from '../shared/campaign/builds.js';
import {GEAR} from '../band/troops.js';
import {gearFor} from '../convoy/loot.js';
import {arm} from '../convoy/builds-in-mission.js';
import {Sim} from '../convoy/sim.js';

test('every gear the Workbench asks for is band gear', () => {
  for (const g of Object.values(RIFLE_GEAR)) assert.ok(GEAR[g], g);
  for (const slot of Object.values(PART_GEAR)) for (const g of Object.values(slot)) assert.equal(GEAR[g]?.kind, 'attachment', g);
});

test('rifles: what the band holds or the fighter carries; foreign rifles are not on the island', () => {
  const c = newCampaign();
  c.stash = {ak74m: 1};
  assert.deepEqual(rifleLock(c, 'mila', 'ak74m'), {ok: true});
  assert.equal(rifleLock(c, 'mila', 'rpk').ok, false);
  assert.match(rifleLock(c, 'mila', 'rpk').reason, /no RPK/);
  assert.match(rifleLock(c, 'mila', 'g3').reason, /Not found on this island/);
  c.band.fighters.mila.kit = {primary: {slug: 'rpk-16-545x39-light-machine-gun'}, pockets: {}};
  assert.deepEqual(rifleLock(c, 'mila', 'rpk'), {ok: true}, 'she carries one');
});

test('attachments: only free ones fit; one fitted to another fighter is taken; locked ones say where they are found', () => {
  const c = newCampaign();
  c.stash = {suppressor: 1};
  assert.deepEqual(partLock(c, 'mila', 'muzzle', 'can'), {ok: true});
  assert.deepEqual(partLock(c, 'mila', 'grip', 'cnc'), {ok: true}, 'furniture is always there');
  c.band.fighters.dragan.build = makeBuild('ak74m', {muzzle: 'can'});
  assert.equal(free(c, 'suppressor', 'mila'), 0);
  const lock = partLock(c, 'mila', 'muzzle', 'can');
  assert.equal(lock.ok, false);
  assert.match(lock.reason, /no Suppressor free\. Found on the fallen/);
  assert.deepEqual(partLock(c, 'dragan', 'muzzle', 'can'), {ok: true}, 'his own stays his');
  assert.match(partLock(c, 'mila', 'optic', 'holo').reason, /Red dot sight/);
});

test('a build is kept through the save, and what its parts do', () => {
  const c = newCampaign();
  c.band.fighters.mila.build = makeBuild('ak15k', {optic: 'scope', muzzle: 'can'}, 'rifle=ak15k&optic=scope');
  const back = normalize(JSON.parse(JSON.stringify(c)));
  assert.deepEqual(back.band.fighters.mila.build, c.band.fighters.mila.build);
  assert.deepEqual(buildGear(back.band.fighters.mila.build), ['ak15k', 'scope', 'suppressor']);
  assert.deepEqual(buildMods(back.band.fighters.mila.build), {spread: 0.75, noise: 0.45});
});

test('in a mission: the build is the gun drawn and its parts change the fighter', () => {
  const sim = new Sim({level: 'checkpoint', seed: 3, squad: {player: 'insurgent', mila: 'marksman'}});
  const mila = sim.units.find(u => u.id === 'mila'),
    {spread, noise = 1} = mila.mods;
  arm(sim, {mila: makeBuild('ak15k', {optic: 'scope', muzzle: 'can'})});
  assert.equal(mila.gun, 'ak15k');
  assert.ok(Math.abs(mila.mods.spread - spread * 0.75) < 1e-9);
  assert.ok(Math.abs(mila.mods.noise - noise * 0.45) < 1e-9, 'the suppressor on top of the quiet of her class');
  assert.equal(sim.units.find(u => u.id === 'player').gun, undefined, 'no build: the class weapon');
});

test('the new attachments drop from the catalogue', () => {
  assert.equal(gearFor({name: 'EOTech EXPS3 holographic sight'}, 'compact-collimators'), 'reddot');
  assert.equal(gearFor({name: 'Zenit Klesch-2IKS IR illuminator'}, 'tactical-combo-devices'), 'taclight');
  assert.equal(gearFor({name: 'RPK-16 5.45x39 95-round drum magazine'}, 'magazines'), 'extmag');
});
