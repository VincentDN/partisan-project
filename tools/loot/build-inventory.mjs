// The inventory's own catalogue (WP-QA12): from the Equipment Wiki's full item list (wiki/data/items.json, 4,000+
// items, 2 MB) only what the grid inventory uses: weapons, magazines, rounds, medicine, grenades, rigs and backpacks,
// with the fields it reads. Missions, the map's kit screen and the inventory page load this one (about 170 KB).
//   node tools/loot/build-inventory.mjs           (writes convoy/data/inventory-items.json)
// tests/inventory-catalogue.test.mjs fails when it is out of date with the wiki's list.
import fs from 'node:fs';

const KINDS = new Set(['weapon', 'magazine', 'ammo', 'medical', 'medkit', 'rig', 'backpack']);
const FIELDS = [
  'kind',
  'caliber',
  'capacity',
  'damage',
  'penetrationPower',
  'stackMaxSize',
  'tracer',
  'class',
  'uses',
  'hitpoints',
  'maxHealPerUse',
];
export const OUT = new URL('../../convoy/data/inventory-items.json', import.meta.url);

/** The compact list from the wiki's data: {categories, items} in the wiki's own format. */
export function slim(data) {
  const name = Object.fromEntries(data.categories.map(c => [c.id, c.name]));
  const keep = data.items.filter(i => KINDS.has(i.stats?.kind) || name[i.cat] === 'Throwables');
  const items = keep.map(({slug, name: n, short, cat, w, h, kg, stats}) => ({
    slug,
    name: n,
    short,
    cat,
    w,
    h,
    kg,
    stats: Object.fromEntries(FIELDS.filter(f => stats && f in stats).map(f => [f, stats[f]])),
  }));
  const cats = [...new Set(keep.map(i => i.cat))].map(id => ({id, name: name[id]}));
  return {categories: cats, items};
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const data = JSON.parse(fs.readFileSync(new URL('../../wiki/data/items.json', import.meta.url), 'utf8'));
  const out = JSON.stringify(slim(data));
  fs.writeFileSync(OUT, out + '\n');
  console.log(`${slim(data).items.length} items, ${(out.length / 1024).toFixed(0)} KB`);
}
