// The inventory's compact catalogue (WP-QA12, tools/loot/build-inventory.mjs): in step with the wiki's full list,
// small, quick to build, and holding every item the game issues, rolls or reads.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {slim} from '../tools/loot/build-inventory.mjs';
import {createCatalogue} from '../shared/inventory/catalogue.js';
import {ARMS, ISSUE} from '../shared/inventory/arms.js';

const full = JSON.parse(fs.readFileSync('wiki/data/items.json', 'utf8'));
const raw = fs.readFileSync('convoy/data/inventory-items.json', 'utf8');

test('the compact catalogue is in step with the wiki (else: node tools/loot/build-inventory.mjs)', () => {
  assert.equal(raw.trim(), JSON.stringify(slim(full)));
});

test('small and quick, with every item the game uses, defined as the full catalogue defines it', () => {
  assert.ok(raw.length < 200 * 1024, `${(raw.length / 1024).toFixed(0)} KB`);
  const t = performance.now();
  const cat = createCatalogue(JSON.parse(raw));
  assert.ok(performance.now() - t < 200, 'parsed and built quickly');
  const all = createCatalogue(full);
  const used = [
    ...Object.values(ARMS).flatMap(a => [a.weapon, a.mag, a.round].filter(Boolean)),
    ISSUE.rig,
    ...ISSUE.meds,
    ISSUE.grenade,
    'scav-backpack',
    'ai-2-medkit',
    'army-bandage',
  ];
  for (const s of used) assert.deepEqual(cat.def(s), all.def(s), s);
  for (const cal of ['545x39', '762x54r', '9x19', '12g']) assert.equal(cat.roundsFor(cal).length, all.roundsFor(cal).length, cal);
});
