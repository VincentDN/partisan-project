// Import the placeholder equipment data for the Equipment Wiki (wiki/) from tarkov.dev's public data cache.
//
// The game needs a full catalogue of lootable equipment before its own exists. Until then the wiki copies
// tarkov.dev's item data (names, categories, sizes, weights, prices, descriptions and the stats that matter for
// a shooter) as placeholders. Images are not copied: the wiki draws placeholder icons from the project's own art.
//
//   node tools/wiki/import-tarkov.mjs              fetch json.tarkov.dev and write wiki/data/
//   node tools/wiki/import-tarkov.mjs <items.json> <items_en.json>   use local copies of the two files
//
// Kept: weapons, ammunition, weapon parts, gear, medication, provisions, barter items, info items, money and
// containers. Dropped: keys (Tarkov's own doors), maps, quest and battle-pass items, and weapon presets.
import fs from 'node:fs';

const SOURCE = 'https://json.tarkov.dev/regular/';
const OUT = 'wiki/data/';
const KEEP_ROOTS = [
  'weapons',
  'ammo',
  'weapon-parts-mods',
  'gear',
  'medication',
  'provisions',
  'barter-items',
  'info-items',
  'money',
  'special-equipment',
];

async function load(arg, name) {
  if (arg) return JSON.parse(fs.readFileSync(arg, 'utf8'));
  const res = await fetch(SOURCE + name);
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  return res.json();
}
const [itemsArg, enArg] = process.argv.slice(2);
const raw = await load(itemsArg, 'items');
const L = (await load(enArg, 'items_en')).data;
const tr = key => (key && L[key]) || key;
const items = raw.data.items,
  hb = raw.data.handbookCategories;

// ---------- categories (the handbook tree), names in English ----------
const rootOf = id => (hb[id].parent ? rootOf(hb[id].parent) : id);
const cats = {};
for (const c of Object.values(hb)) {
  const root = hb[rootOf(c.id)].normalizedName;
  if (!KEEP_ROOTS.includes(root)) continue;
  cats[c.id] = {id: c.id, name: tr(c.name), slug: c.normalizedName, parent: c.parent || null, root};
}

// ---------- items ----------
const caliber = c =>
  (c || '')
    .replace(/^Caliber/, '')
    .replace(/^(\d)(\d+)x(\d+)/, '$1.$2x$3')
    .replace(/NATO$/, ' NATO')
    .replace(/R$/, 'R') || null;
const round = (v, d = 3) => (typeof v === 'number' ? Math.round(v * 10 ** d) / 10 ** d : v);
/** The stats a shooter needs from each kind of item, with readable names. */
function stats(p) {
  if (!p) return null;
  const pick = (...keys) => Object.fromEntries(keys.filter(k => p[k] !== undefined && p[k] !== null).map(k => [k, round(p[k])]));
  const armour = () => ({
    ...pick('class', 'durability', 'ergoPenalty', 'speedPenalty', 'turnPenalty', 'bluntThroughput'),
    material: p.material?.name || null,
    zones: (p.zones || []).map(tr),
  });
  switch (p.propertiesType) {
    case 'ItemPropertiesWeapon':
      return {
        kind: 'weapon',
        caliber: caliber(p.caliber),
        ...pick('fireRate', 'ergonomics', 'recoilVertical', 'recoilHorizontal', 'effectiveDistance', 'sightingRange'),
        fireModes: p.fireModes || [],
      };
    case 'ItemPropertiesAmmo':
      return {
        kind: 'ammo',
        caliber: caliber(p.caliber),
        ...pick(
          'damage',
          'penetrationPower',
          'armorDamage',
          'fragmentationChance',
          'initialSpeed',
          'projectileCount',
          'tracer',
          'stackMaxSize',
          'recoilModifier',
          'accuracyModifier',
        ),
      };
    case 'ItemPropertiesMagazine':
      return {
        kind: 'magazine',
        ...pick('capacity', 'ergonomics', 'recoilModifier', 'loadModifier', 'ammoCheckModifier', 'malfunctionChance'),
      };
    case 'ItemPropertiesScope':
      return {
        kind: 'sight',
        ...pick('ergonomics', 'recoilModifier', 'sightingRange'),
        zoom: [...new Set((p.zoomLevels || []).flat())].sort((a, b) => a - b),
      };
    case 'ItemPropertiesBarrel':
    case 'ItemPropertiesWeaponMod':
      return {kind: 'part', ...pick('ergonomics', 'recoilModifier', 'accuracyModifier')};
    case 'ItemPropertiesArmor':
    case 'ItemPropertiesArmorAttachment':
      return {kind: 'armour', ...armour()};
    case 'ItemPropertiesHelmet':
      return {kind: 'helmet', ...armour(), ...pick('deafening')};
    case 'ItemPropertiesChestRig':
      return {kind: 'rig', ...pick('capacity'), ...(p.class ? armour() : {})};
    case 'ItemPropertiesBackpack':
      return {kind: 'backpack', ...pick('capacity', 'ergoPenalty', 'speedPenalty', 'turnPenalty')};
    case 'ItemPropertiesContainer':
      return {kind: 'container', ...pick('capacity')};
    case 'ItemPropertiesGlasses':
      return {kind: 'eyewear', ...pick('class', 'durability', 'blindnessProtection')};
    case 'ItemPropertiesHeadphone':
      return {kind: 'headset', ...pick('distanceModifier', 'ambientVolume', 'distortion')};
    case 'ItemPropertiesNightVision':
      return {kind: 'nightvision', ...pick('intensity', 'noiseIntensity')};
    case 'ItemPropertiesMedKit':
      return {kind: 'medkit', ...pick('hitpoints', 'maxHealPerUse', 'useTime'), cures: (p.cures || []).map(tr)};
    case 'ItemPropertiesMedicalItem':
    case 'ItemPropertiesSurgicalKit':
    case 'ItemPropertiesPainkiller':
      return {kind: 'medical', ...pick('uses', 'useTime', 'painkillerDuration'), cures: (p.cures || []).map(tr)};
    case 'ItemPropertiesStim':
      return {kind: 'stimulant', ...pick('useTime'), cures: (p.cures || []).map(tr)};
    case 'ItemPropertiesFoodDrink':
      return {kind: 'food', ...pick('energy', 'hydration', 'units')};
    case 'ItemPropertiesGrenade':
      return {
        kind: 'grenade',
        type: p.type || null,
        ...pick('fuse', 'minExplosionDistance', 'maxExplosionDistance', 'fragments', 'contusionRadius'),
      };
    case 'ItemPropertiesMelee':
      return {kind: 'melee', ...pick('slashDamage', 'stabDamage', 'hitRadius')};
    default:
      return null;
  }
}
const SKIP_TYPES = new Set(['preset', 'keys', 'poster']);
const kept = [];
for (const it of Object.values(items)) {
  if (it.types.some(t => SKIP_TYPES.has(t))) continue;
  const cat = (it.handbookCategories || []).find(id => cats[id]);
  if (!cat) continue;
  const p = it.properties;
  const row = {
    id: it.id,
    slug: it.normalizedName,
    name: tr(it.name),
    short: tr(it.shortName),
    cat,
    w: it.width,
    h: it.height,
    kg: round(it.weight, 3),
    price: it.basePrice || 0,
    desc: (tr(it.description) || '').replace(/\s+/g, ' ').trim(),
    stats: stats(p),
  };
  if (p?.allowedAmmo?.length && p.propertiesType === 'ItemPropertiesWeapon') row.ammo = p.allowedAmmo;
  if (p?.slots?.length) row.slots = p.slots.map(s => ({name: tr(s.name), n: (s.filters?.allowedItems || []).length})).filter(s => s.name);
  kept.push(row);
}
const ids = new Set(kept.map(r => r.id));
for (const r of kept) if (r.ammo) r.ammo = r.ammo.filter(a => ids.has(a));

// Loot rarity for the game's loot tables: by base price within the item's top category.
const byRoot = {};
for (const r of kept) (byRoot[cats[r.cat].root] ??= []).push(r);
for (const list of Object.values(byRoot)) {
  const prices = list.map(r => r.price).sort((a, b) => a - b);
  const at = q => prices[Math.min(prices.length - 1, Math.floor(q * prices.length))];
  const [p50, p80, p95] = [at(0.5), at(0.8), at(0.95)];
  for (const r of list) r.rarity = r.price >= p95 ? 'very rare' : r.price >= p80 ? 'rare' : r.price >= p50 ? 'uncommon' : 'common';
}
// Only categories that hold something (or lead to something).
const used = new Set();
for (const r of kept) for (let c = r.cat; c && cats[c]; c = cats[c].parent) used.add(c);
const categories = Object.values(cats)
  .filter(c => used.has(c.id))
  .map(c => ({...c, count: kept.filter(r => r.cat === c.id).length}));

kept.sort((a, b) => a.name.localeCompare(b.name));
fs.mkdirSync(OUT, {recursive: true});
const meta = {
  source: 'https://tarkov.dev/items/',
  fetched: new Date().toISOString().slice(0, 10),
  items: kept.length,
  note: 'Placeholder data copied from tarkov.dev; to be replaced by the game’s own catalogue.',
};
fs.writeFileSync(OUT + 'items.json', JSON.stringify({meta, categories, items: kept}));
console.log(
  `wrote ${OUT}items.json: ${kept.length} items in ${categories.length} categories (${Math.round(fs.statSync(OUT + 'items.json').size / 1024)} KB)`,
);
