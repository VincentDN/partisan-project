// The spoils screen's contents (convoy/spoils.js spoilsOf): stash loot, convoy cargo and the weapons, attachments and
// wearables brought home in kits, one card per kind of thing (merged across sources), weapons first, each with its
// picture; rounds and magazines summed up; valuables by name.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createCatalogue} from '../shared/inventory/catalogue.js';
import {spoilsOf} from '../convoy/spoils.js';

const cat = createCatalogue(JSON.parse(fs.readFileSync('wiki/data/items.json', 'utf8')));

test('one card per thing, weapons first, each with a picture', () => {
  const s = spoilsOf(
    {
      outcome: 'won',
      loot: {medkit: 1, ak74: 1, scope: 1},
      cargo: {ak74: 4, helmet: 2},
      kitGains: {'svds-762x54r-sniper-rifle': 1, '6b47-helmet': 1, '545x39mm-ps-gs': 40, 'ak-74-545x39-6l23-30-round-magazine': 2},
      goods: [{name: 'Gold chain'}],
    },
    {catalogue: cat},
  );
  const names = s.cards.map(c => `${c.name} ${c.count}`);
  assert.deepEqual(names.slice(0, 2), ['AK-74 5', 'SVDS 7.62x54R sniper rifle 1'], 'weapons first, the AK-74s merged');
  assert.ok(names.includes('6B47 Ratnik helmet 1') && names.includes('Helmet 2') && names.includes('Medical kit 1'));
  for (const c of s.cards) assert.ok(c.gun || c.icon, `${c.name} has a picture`);
  assert.equal(s.cards.find(c => c.name.startsWith('SVDS')).gun, 'set-sniper', 'the rifle as its own sprite');
  assert.deepEqual(s.rest, {ammo: 40, magazine: 2}, 'rounds and magazines summed');
  assert.deepEqual(s.goods, ['Gold chain']);
});

test('nothing won: no cards', () => {
  assert.deepEqual(spoilsOf({outcome: 'won'}, {catalogue: cat}), {cards: [], rest: {}, goods: []});
});
