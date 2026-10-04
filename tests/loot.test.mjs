// Partisan Tactical loot and campaign: the catalogue mapped to the band's equipment, seeded rolls, the stash, the
// trader, and promotions that cost equipment (convoy/loot.js, convoy/progression.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GEAR, TROOPS} from '../band/troops.js';
import {buildPool, gearFor, rollLoot, lootCount, bank, sellGoods, buy, priceOf, SALVAGE, LEVEL_LOOT} from '../convoy/loot.js';
import {newSquad, loadSquad, award, canPromote, missingFor, promote} from '../convoy/progression.js';
import {difficulty} from '../convoy/difficulty.js';
import {MISSIONS} from '../convoy/levels/index.js';

const catalogue = JSON.parse(fs.readFileSync('wiki/data/items.json', 'utf8'));
const pool = JSON.parse(fs.readFileSync('convoy/data/loot-pool.json', 'utf8')).items;
const won = {outcome: 'won', objectives: [{state: 'done'}, {state: 'active'}], kills: 7, taken: [], vehiclesDestroyed: 2};
const lost = {outcome: 'lost', objectives: [], kills: 0, taken: [], vehiclesDestroyed: 0};

test('the loot pool is built from the wiki catalogue and is up to date', () => {
  assert.deepEqual(pool, buildPool(catalogue), 'run node tools/loot/build-pool.mjs');
  assert.ok(pool.length > 500);
  for (const e of pool) assert.ok(e.gear === null || GEAR[e.gear], e.name);
});

test('catalogue items map to the right equipment', () => {
  const by = name => {
    const it = catalogue.items.find(i => i.name === name);
    const cat = catalogue.categories.find(c => c.id === it.cat);
    return gearFor(it, cat.slug);
  };
  assert.equal(by('Kalashnikov PKM 7.62x54R machine gun'), 'pkm');
  assert.equal(by('RShG-2 72.5mm rocket launcher'), 'rpg');
  assert.equal(by('L3Harris AN/PVS-14 night vision monocular'), 'nvg');
  assert.equal(by('CMS surgical kit'), 'surgical');
  assert.equal(by('GP-25 Kostyor 40mm underbarrel grenade launcher'), 'gp25');
  assert.equal(by('Toolset'), 'tools');
});

test('every piece of equipment a class needs can be found: in the pool, as salvage, or at the trader', () => {
  const found = new Set([...pool, ...SALVAGE].map(e => e.gear));
  for (const t of Object.values(TROOPS)) for (const g of Object.keys(t.needs)) assert.ok(found.has(g) || priceOf(g) > 0, g);
  for (const g of Object.keys(GEAR)) assert.ok(priceOf(g) > 0, g);
});

test('a mission yields more for winning, and harder difficulties yield more', () => {
  assert.ok(lootCount(won, difficulty('normal')) > lootCount(lost, difficulty('normal')));
  assert.ok(lootCount(won, difficulty('brutal')) > lootCount(won, difficulty('easy')));
  assert.equal(lootCount(lost, difficulty('easy')), 1, 'always something');
  for (const m of MISSIONS) assert.ok(LEVEL_LOOT[m.id], m.id);
});

test('rolls are seeded, from the pool, with salvage for wrecked vehicles', () => {
  const a = rollLoot(pool, {levelId: 'convoy', debrief: won, difficulty: difficulty('normal'), seed: 5});
  const b = rollLoot(pool, {levelId: 'convoy', debrief: won, difficulty: difficulty('normal'), seed: 5});
  assert.deepEqual(a, b);
  assert.equal(a.length, lootCount(won, difficulty('normal')) + 2);
  assert.equal(a.filter(e => e.salvage).length, 2);
  // over many rolls: mostly equipment, some trade goods, a spread of kinds, rarer on Brutal
  const many = s =>
    Array.from({length: 200}, (_, i) => rollLoot(pool, {levelId: 'compound', debrief: lost, difficulty: difficulty(s), seed: i})).flat();
  const normal = many('normal');
  const goods = normal.filter(e => !e.gear).length / normal.length;
  assert.ok(goods > 0.1 && goods < 0.45, `trade goods ${goods}`);
  assert.ok(new Set(normal.map(e => e.gear)).size > 15);
  const rare = list => list.filter(e => e.rarity === 'rare' || e.rarity === 'very rare').length / list.length;
  assert.ok(rare(many('brutal')) > rare(normal));
});

test('the stash, the trader and promotions that cost equipment', () => {
  let s = newSquad();
  s = award(
    s,
    {player: {total: 200}, mila: {total: 0}, dragan: {total: 0}},
    {level: 'convoy', outcome: 'won', difficulty: 'normal', loot: []},
  );
  assert.deepEqual(s.record.convoy, {played: 1, won: 1});
  assert.equal(s.log.length, 1);
  // Insurgent -> Guerrilla needs an AK-74M and a vest: the start stash has the vest only
  assert.ok(canPromote(s, 'player'));
  assert.equal(canPromote(s, 'player', 'guerrilla'), false);
  assert.deepEqual(missingFor(s, 'guerrilla'), [['ak74m', 1]]);
  assert.equal(promote(s, 'player', 'guerrilla'), null);
  s = bank(s, [
    {name: 'AK-74M 5.45x39 assault rifle', gear: 'ak74m', rarity: 'rare', price: 1},
    {name: 'Golden rooster figurine', gear: null, rarity: 'rare', price: 120000},
  ]);
  assert.equal(s.stash.ak74m, 1);
  assert.equal(s.goods.length, 1);
  const up = promote(s, 'player', 'guerrilla');
  assert.equal(up.classes.player, 'guerrilla');
  assert.equal(up.stash.ak74m, undefined, 'the rifle is spent');
  assert.equal(up.stash.vest, undefined, 'and the vest');
  assert.equal(up.xp.player, 200 - TROOPS.insurgent.xp);
  // sell the goods, buy what Mila's next class needs
  const sold = sellGoods(up);
  assert.equal(sold.goods.length, 0);
  assert.equal(sold.scrip, up.scrip + 12);
  const bought = buy(sold, 'scope');
  assert.equal(bought.stash.scope, 1);
  assert.equal(bought.scrip, sold.scrip - priceOf('scope'));
  assert.equal(buy({...sold, scrip: 0}, 'scope'), null);
  // the campaign survives a save and load
  assert.deepEqual(loadSquad(JSON.stringify(bought)), bought);
});
