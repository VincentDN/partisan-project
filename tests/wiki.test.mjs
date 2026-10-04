// Equipment Wiki: the imported catalogue is complete and consistent, and filtering, sorting and icons behave.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {filterItems, iconFor, inCategory} from '../wiki/catalogue.js';

const data = JSON.parse(fs.readFileSync('wiki/data/items.json', 'utf8'));
const cats = Object.fromEntries(data.categories.map(c => [c.id, c]));

test('the catalogue covers every kind of lootable equipment, each item well formed', () => {
  assert.ok(data.items.length > 2000, `${data.items.length} items`);
  const roots = new Set(data.items.map(i => cats[i.cat].root));
  for (const r of ['weapons', 'ammo', 'weapon-parts-mods', 'gear', 'medication', 'provisions', 'barter-items']) assert.ok(roots.has(r), r);
  const slugs = new Set();
  for (const i of data.items) {
    assert.ok(i.name && i.short && cats[i.cat], i.id);
    assert.ok(!slugs.has(i.slug), `unique slug ${i.slug}`);
    slugs.add(i.slug);
    assert.ok(i.w >= 1 && i.h >= 1 && i.kg >= 0 && i.price >= 0, i.slug);
    assert.ok(['common', 'uncommon', 'rare', 'very rare'].includes(i.rarity), i.slug);
    assert.ok(!/ Name$| ShortName$/.test(i.name + ' ' + i.short), `translated: ${i.slug}`);
  }
  const ids = new Set(data.items.map(i => i.id));
  for (const i of data.items) for (const a of i.ammo || []) assert.ok(ids.has(a), `${i.slug} ammo ${a}`);
  const ak = data.items.find(i => i.slug.startsWith('kalashnikov-ak-74m'));
  assert.equal(ak?.stats?.caliber, '5.45x39');
  assert.ok(ak.ammo.length > 3);
});

test('filtering by category, search and rarity, and sorting', () => {
  const weapons = data.categories.find(c => c.slug === 'weapons' && !c.parent);
  const guns = filterItems(data.items, cats, {cat: weapons.id});
  assert.ok(guns.length > 50 && guns.every(i => inCategory(i, weapons.id, cats)));
  const pkm = filterItems(data.items, cats, {q: 'pkm'});
  assert.ok(pkm.some(i => i.short === 'PKM'));
  const rare = filterItems(data.items, cats, {rarity: 'very rare', sort: 'price'});
  assert.ok(rare.every(i => i.rarity === 'very rare'));
  for (let i = 1; i < rare.length; i++) assert.ok(rare[i - 1].price >= rare[i].price);
});

test('every item gets a placeholder icon', () => {
  for (const i of data.items) {
    const ic = iconFor(i, cats);
    assert.ok(ic.gun || ic.path, i.slug);
    if (ic.path) assert.ok(fs.existsSync('inbound/Placeholder Assets/' + ic.path), ic.path);
  }
});
