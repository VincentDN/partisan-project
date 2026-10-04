// Partisan Tactical loot: what the squad brings home from a mission. Items are rolled from the Equipment Wiki's
// Tarkov-style catalogue (wiki/data/items.json, through the compact pool convoy/data/loot-pool.json built by
// tools/loot/build-pool.mjs). An item that is a piece of the Rebel Band's equipment (band/troops.js GEAR: a PKM, a plate
// carrier, a night vision monocular...) goes into the stash and pays for promotions; anything else is trade goods,
// sold to the trader for scrip. A few things the catalogue lacks (RPG rockets, anti-tank mines, an ATGM) come only as
// salvage from wrecked vehicles. Pure (no DOM, seeded), so it is unit-tested.
import {GEAR} from '../band/troops.js';
import {rng} from './sim.js';

// ---------- the catalogue to the band's equipment ----------
/** First match wins: [category slugs or null (any), name pattern or null (any), gear id | (item) => gear id]. */
const RULES = [
  [null, /RShG|rocket launcher/i, 'rpg'],
  [null, /surgical kit/i, 'surgical'],
  [['special-purpose-sights', 'headgear', 'eyewear'], /night vision|NVG|PVS-|PNV-|GPNVG|thermal goggles/i, 'nvg'],
  [null, /rangefinder|signaling device|laser designator/i, 'designator'],
  [null, /binocular/i, 'binoculars'],
  [null, /jamm|electronic warfare/i, 'jammer'],
  [null, /radio|transmitter|repeater|COFDM|GPS Signal/i, 'radio'],
  // drone parts: rare electronics build a quadcopter or an FPV
  [
    ['electronics'],
    /graphics card|gyrotachometer|military circuit|thermal vision module|processor|electric motor|power supply|Virtex|Tetriz|UHF RFID/i,
    it => (hash(it.id) % 2 ? 'fpv' : 'quad'),
  ],
  [['tools'], null, 'tools'],
  [null, /toolset|multitool|entrenching tool/i, 'tools'],
  [null, /TNT|thermite|C-4|plastic explosive|detonator/i, 'explosives'],
  [null, /gunpowder/i, 'mines'],
  [['throwables'], /smoke/i, 'smoke'],
  [['throwables'], /grenade|VOG|RGD|F-1|M67|RGN|RGO|V40/i, 'grenades'],
  [['launchers', 'grenade-launchers'], null, 'gp25'],
  [['bipods'], null, 'bipod'],
  [['suppressors'], null, 'suppressor'],
  [['optics', 'assault-scopes'], null, 'scope'],
  [['machine-guns'], /PKM|PKP|M60/i, 'pkm'],
  [['machine-guns'], null, 'rpk'],
  [['marksman-rifles'], /SVD/i, 'svd'],
  [['marksman-rifles'], /M1A|SR-25|G28|RSASS|Mk-18/i, 'mk14'],
  [['marksman-rifles'], null, 'svd'],
  [['bolt-action-rifles'], null, 'hunting'],
  [['assault-rifles', 'assault-carbines'], /AK-74M/i, 'ak74m'],
  [['assault-rifles', 'assault-carbines'], /AK-1[25]|AK-15/i, 'ak15k'],
  [['assault-rifles', 'assault-carbines'], null, 'ak74'],
  [['submachine-guns'], null, 'smg'],
  [['shotguns'], null, 'shotgun'],
  [['tactical-rigs'], /plate carrier/i, 'plates'],
  [['tactical-rigs'], null, 'rig'],
  [['body-armor'], null, it => ((it.stats?.class ?? 0) >= 4 ? 'plates' : 'vest')],
  [
    ['headgear'],
    /helmet|6B47|Altyn|FAST|Ronin|ZSh|ULACH|Kolpak|SSh-68|LZSh|TC-2001|TC 800|Bastion|Maska|Vulkan|K1C|Airframe|Caiman|Exfil|MICH/i,
    'helmet',
  ],
  [['facecovers'], /balaclava|shemagh|hood|scarf|ghillie/i, 'ghillie'],
  [['medkits', 'injury-treatment'], null, 'medkit'],
];
const hash = s => [...String(s)].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);

/** The categories trade goods come from (everything else that is not equipment stays out of the pool). */
export const GOODS_ROOTS = ['barter-items', 'provisions', 'medication', 'info-items'];

/** The band's equipment an item from the catalogue is (a GEAR id), or null for trade goods. */
export function gearFor(item, catSlug) {
  for (const [slugs, re, gear] of RULES) {
    if (slugs && !slugs.includes(catSlug)) continue;
    if (re && !re.test(item.name)) continue;
    return typeof gear === 'function' ? gear(item) : gear;
  }
  return null;
}

/**
 * The loot pool from the wiki catalogue: every item that is band equipment, plus trade goods.
 * Each entry: {id, name, short, rarity, price, cat, gear | null}.
 */
export function buildPool(data) {
  const cats = Object.fromEntries(data.categories.map(c => [c.id, c]));
  const pool = [];
  for (const it of data.items) {
    const c = cats[it.cat];
    if (!c) continue;
    const gear = gearFor(it, c.slug);
    if (!gear && !GOODS_ROOTS.includes(c.root)) continue;
    pool.push({id: it.id, name: it.name, short: it.short, rarity: it.rarity || 'common', price: it.price || 0, cat: c.slug, gear});
  }
  return pool;
}

/** What only wrecked vehicles give (the catalogue has no RPG rounds, mines or ATGMs). */
export const SALVAGE = [
  {id: 'salvage-pg7', name: 'PG-7VL rockets (crate)', short: 'PG-7', rarity: 'uncommon', price: 60000, cat: 'salvage', gear: 'rockets'},
  {id: 'salvage-rpg7', name: 'RPG-7V2 launcher', short: 'RPG-7', rarity: 'rare', price: 140000, cat: 'salvage', gear: 'rpg'},
  {id: 'salvage-tm62', name: 'TM-62 anti-tank mines', short: 'TM-62', rarity: 'uncommon', price: 50000, cat: 'salvage', gear: 'mines'},
  {id: 'salvage-pkt', name: 'PKT machine gun (dismounted)', short: 'PKT', rarity: 'rare', price: 120000, cat: 'salvage', gear: 'pkm'},
  {id: 'salvage-kornet', name: '9M133 Kornet launcher', short: 'Kornet', rarity: 'very rare', price: 400000, cat: 'salvage', gear: 'atgm'},
  {id: 'salvage-r168', name: 'R-168 vehicle radio', short: 'R-168', rarity: 'uncommon', price: 70000, cat: 'salvage', gear: 'radio'},
];

// ---------- rolling ----------
export const RARITIES = ['common', 'uncommon', 'rare', 'very rare'];
const RARITY_WEIGHT = {common: 52, uncommon: 28, rare: 14, 'very rare': 6};
/** What each mission's ground is rich in: multipliers on a gear's kind (GEAR[id].kind, or 'goods'). */
export const LEVEL_LOOT = {
  convoy: {label: 'Convoy cargo', kinds: {weapon: 2, ammo: 1.6, gear: 1, attachment: 1, drone: 0.6, goods: 1}},
  compound: {label: 'Compound stores', kinds: {gear: 2, drone: 1.6, attachment: 1.3, weapon: 1, ammo: 1, goods: 1.4}},
  cave: {label: 'Abandoned caches', kinds: {ammo: 2, attachment: 1.5, weapon: 1.2, gear: 1, drone: 0.8, goods: 1.2}},
};
const GOODS_WEIGHT = 5; // trade goods against one kind of equipment: about a quarter of the drops

/**
 * How many items a mission yields: a few for showing up, more for winning, objectives, kills and things taken.
 * debrief: sim.debrief(); difficulty: {loot} from convoy/difficulty.js.
 */
export function lootCount(debrief, difficulty) {
  const done = debrief.objectives.filter(o => o.state === 'done').length;
  const n = (debrief.outcome === 'won' ? 4 : 1) + done + Math.floor(debrief.kills / 3) + (debrief.taken?.length || 0) * 2;
  return Math.min(14, Math.max(1, Math.round(n * (difficulty?.loot ?? 1))));
}

/**
 * Roll a mission's loot. Returns [{...pool entry, salvage?}]: rolls from the pool weighted by rarity (harder
 * difficulties lean rarer) and by what the level is rich in, plus one salvage item per wrecked vehicle.
 */
export function rollLoot(pool, {levelId, debrief, difficulty, seed = 1}) {
  const rand = rng(seed);
  const n = lootCount(debrief, difficulty),
    shift = difficulty?.rarity ?? 1,
    kinds = LEVEL_LOOT[levelId]?.kinds || {};
  const pick = (list, weight) => {
    const total = list.reduce((s, e) => s + weight(e), 0);
    let r = rand() * total;
    for (const e of list) if ((r -= weight(e)) <= 0) return e;
    return list.at(-1);
  };
  // by rarity, then by what it is (a gear id or 'goods'): the 88 helmets in the catalogue are one choice, not 88
  const groups = {};
  for (const e of pool) ((groups[e.rarity] ??= {})[e.gear || 'goods'] ??= []).push(e);
  const out = [];
  for (let i = 0; i < n; i++) {
    const rarity = pick(
      RARITIES.filter(r => groups[r]),
      r => RARITY_WEIGHT[r] * (r === 'common' ? 1 : shift ** RARITIES.indexOf(r)),
    );
    const key = pick(
      Object.keys(groups[rarity]),
      k => (k === 'goods' ? GOODS_WEIGHT : 1) * (kinds[k === 'goods' ? 'goods' : GEAR[k].kind] ?? 1),
    );
    const list = groups[rarity][key];
    out.push({...list[Math.floor(rand() * list.length)]});
  }
  for (let i = 0; i < (debrief.vehiclesDestroyed || 0); i++) out.push({...pick(SALVAGE, e => RARITY_WEIGHT[e.rarity]), salvage: true});
  return out;
}

// ---------- the stash and the trader ----------
/** Scrip the trader pays for trade goods: one per 10,000 roubles of catalogue price, at least one. */
export const scripFor = e => Math.max(1, Math.round(e.price / 10000));
/** What the trader asks for a piece of equipment, by its kind. */
export const GEAR_PRICE = {weapon: 30, attachment: 14, ammo: 10, gear: 18, drone: 34};
export const priceOf = gear => (gear === 'atgm' ? 90 : gear === 'rpg' ? 45 : (GEAR_PRICE[GEAR[gear].kind] ?? 20));

/** Bank a mission's loot: equipment to the stash, goods to the trade pile. Returns a new state. */
export function bank(state, loot) {
  const s = {...state, stash: {...state.stash}, goods: [...(state.goods || [])]};
  for (const e of loot)
    if (e.gear) s.stash[e.gear] = (s.stash[e.gear] || 0) + 1;
    else s.goods.push({id: e.id, name: e.name, rarity: e.rarity, price: e.price});
  return s;
}
/** Sell every trade good for scrip. */
export function sellGoods(state) {
  const scrip = (state.goods || []).reduce((s, g) => s + scripFor(g), 0);
  return {...state, goods: [], scrip: (state.scrip || 0) + scrip};
}
/** Buy one piece of equipment from the trader, or null if the scrip is short. */
export function buy(state, gear) {
  const cost = priceOf(gear);
  if (!GEAR[gear] || (state.scrip || 0) < cost) return null;
  return {...state, scrip: state.scrip - cost, stash: {...state.stash, [gear]: (state.stash[gear] || 0) + 1}};
}
