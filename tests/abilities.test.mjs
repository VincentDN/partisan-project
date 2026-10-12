// Partisan Tactical: class abilities in a mission, difficulty, and the squad's levelling (convoy/abilities.js,
// convoy/difficulty.js, convoy/progression.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import {Sim} from '../convoy/sim.js';
import {ACTIVES, PASSIVES, DEFAULT_SQUAD, kitFor, modsFor, activesFor, useAbility, cooldownLeft} from '../convoy/abilities.js';
import {DIFFICULTY} from '../convoy/difficulty.js';
import {newSquad, loadSquad, missionXp, award, canPromote, promote, progress} from '../convoy/progression.js';
import {TROOPS, abilitiesOf} from '../band/troops.js';

const sim = (o = {}) => new Sim({seed: 7, squad: DEFAULT_SQUAD, ...o});

test('every ability and passive named here exists in the class tree', () => {
  const names = new Set(Object.keys(TROOPS).flatMap(id => abilitiesOf(id).map(a => `${a.kind}:${a.name}`)));
  for (const n of Object.keys(ACTIVES)) assert.ok(names.has('active:' + n), `active ${n}`);
  for (const n of Object.keys(PASSIVES)) assert.ok(names.has('passive:' + n), `passive ${n}`);
});

test('a class decides the kit; the lead rebel always has an RPG for the armour', () => {
  assert.deepEqual(kitFor('machinegunner'), ['pkm', 'ak']);
  assert.deepEqual(kitFor('sniper'), ['svd', 'ak']);
  assert.ok(kitFor('medic', true).includes('rpg'));
  const s = sim();
  assert.deepEqual(s.player.weapons, ['ak', 'svd', 'rpg']);
  assert.equal(s.units.find(u => u.id === 'dragan').weapon, 'pkm');
  assert.equal(s.player.cls, 'insurgent');
});

test('passives stack along the path: a machine gunner reloads its belt faster than a volunteer', () => {
  assert.ok(modsFor('machinegunner').reload < modsFor('volunteer').reload);
  assert.ok(modsFor('sniper').noise < 1 && modsFor('sniper').damage > 1 && modsFor('sharpshooter').range > 1);
  const s = sim({squad: {...DEFAULT_SQUAD, player: 'heavy'}});
  assert.ok(s.player.maxHp >= 100);
});

test('every class has at most three actives on the bar, the newest first', () => {
  for (const id of Object.keys(TROOPS)) {
    const a = activesFor(id);
    assert.ok(a.length <= 3, id);
    for (let i = 1; i < a.length; i++) assert.ok(TROOPS[a[i - 1].from].tier >= TROOPS[a[i].from].tier, id);
  }
  assert.ok(activesFor('fpvpilot').some(a => a.name === 'FPV strike'));
});

test('an ability fires once, then waits out its cooldown', () => {
  const s = sim({squad: {...DEFAULT_SQUAD, player: 'antiarmour'}});
  const p = s.player;
  const [rocket] = activesFor('antiarmour').filter(a => a.name === 'Rocket');
  assert.ok(rocket);
  assert.equal(useAbility(s, p, 'Rocket', {x: p.x + 20, z: p.z}), true);
  assert.ok(cooldownLeft(s, p, 'Rocket') > 0);
  assert.equal(useAbility(s, p, 'Rocket', {x: p.x + 20, z: p.z}), false);
  assert.equal(s.projectiles.length, 1);
  for (let i = 0; i < 60 * ACTIVES.Rocket.cd + 2; i++) s.step(1 / 60, {});
  assert.equal(cooldownLeft(s, p, 'Rocket'), 0);
});

test('smoke blocks sight, sandbags block like cover, mines go off under the army', () => {
  const s = sim();
  const p = s.player;
  const far = {x: p.x + 20, z: p.z};
  assert.ok(s.los(p.x, p.z, far.x, far.z));
  ACTIVES['Smoke out'].run(s, p, {x: p.x + 10, z: p.z});
  assert.ok(!s.los(p.x, p.z, far.x, far.z), 'smoke');
  const before = s.boxes().length;
  ACTIVES['Dig in'].run(s, p, {x: p.x + 3, z: p.z});
  assert.equal(s.boxes().length, before + 1, 'sandbags');
  const foe = s.units.find(u => u.side === 'army' && u.state !== 'mounted' && u.state !== 'turret') || s.vehicles[0];
  s.mines.push({x: foe.x, z: foe.z, by: p});
  s.tripMines();
  assert.equal(s.mines.length, 0);
  assert.ok(s.explosions.length > 0);
});

test('recon reveals soldiers and tells the squad; jamming cuts the radio', () => {
  const s = sim();
  const p = s.player,
    foe = s.units.find(u => u.side === 'army');
  ACTIVES['Recon drone'].run(s, p, {x: foe.x, z: foe.z});
  assert.ok(foe.revealedUntil > s.time);
  assert.ok(p.beliefs.some(b => Math.hypot(b.x - foe.x, b.z - foe.z) < 1 && b.conf === 1));
  assert.ok(!s.jammed);
  ACTIVES.Jam.run(s, p, p);
  assert.ok(s.jammed);
});

test('a medic patches the most hurt rebel near them', () => {
  const s = sim();
  const p = s.player,
    mila = s.units.find(u => u.id === 'mila');
  Object.assign(mila, {x: p.x + 1, z: p.z});
  mila.hp = 40;
  assert.ok(ACTIVES['Patch up'].run(s, p, p));
  assert.equal(mila.hp, 70);
});

test('difficulty scales the damage rebels take and the army aim', () => {
  const easy = sim({difficulty: 'easy'}),
    brutal = sim({difficulty: 'brutal'});
  const hit = s => {
    const foe = s.units.find(u => u.side === 'army');
    s.damage(s.player, foe, 34);
    return s.player.maxHp - s.player.hp;
  };
  assert.ok(hit(easy) < 34 && hit(brutal) > 34);
  for (const d of Object.values(DIFFICULTY)) assert.ok(d.label && d.taken > 0 && d.spread > 0 && d.react > 0 && d.xp > 0);
});

test('levelling: missions pay XP, scaled by difficulty; a promotion spends it along the tree', () => {
  const debrief = {
    outcome: 'won',
    objectives: [{state: 'done'}, {state: 'failed'}],
    byPartisan: [
      {id: 'player', kills: 3, state: 'fit'},
      {id: 'mila', kills: 0, state: 'down'},
      {id: 'dragan', kills: 1, state: 'wounded'},
    ],
  };
  const n = missionXp(debrief, 'normal'),
    h = missionXp(debrief, 'hard');
  assert.ok(n.player.total > n.mila.total && h.player.total > n.player.total);
  let sq = newSquad();
  assert.equal(canPromote(sq, 'player'), false);
  sq = award(sq, {player: {total: 500}});
  assert.equal(sq.missions, 1);
  assert.ok(canPromote(sq, 'player'));
  const to = TROOPS[sq.classes.player].to[0];
  const up = promote(sq, 'player', to);
  assert.equal(up.classes.player, to);
  assert.equal(up.xp.player, 500 - TROOPS.insurgent.xp);
  assert.equal(promote(sq, 'player', 'sniper'), null, 'only along the tree');
  assert.ok(progress(up, 'player').need > 0);
  assert.deepEqual(loadSquad('{broken'), newSquad());
  assert.equal(loadSquad({classes: {player: 'nope', mila: 'sniper'}, xp: {}}).classes.mila, 'sniper');
});
