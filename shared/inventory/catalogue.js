// Item definitions for the grid inventory (TAC-C-11), read from the Equipment Wiki's catalogue (wiki/data/items.json:
// tarkov.dev placeholder data with real cartridges, magazines, footprints and weights), plus the few items the game
// needs that the catalogue lacks (the RPG-7 and its rockets, the DShK). Pure: give it the catalogue's data.
//   const cat = createCatalogue(data);  cat.def('kalashnikov-ak-74m-545x39-assault-rifle')
// A definition: {slug, name, short, kind, w, h, kg, calibre?, capacity?, stack?, damage?, pen?, grids?}
//   kind      weapon | magazine | ammo | rig | backpack | armor | headwear | meds | grenade | item
//   calibre   a normalised key ('545x39', '762x54r', '9x19', '12g', ...) shared by weapons, magazines and rounds
//   grids     for containers: the grids inside it, [{w, h}] (a rig's pouches, a backpack's main compartment)

/** One calibre key for the catalogue's spellings ('9x19PARA', '5.56x45 NATO', '12g') and magazine names ('12ga'). */
export function calibreKey(s) {
  if (!s) return null;
  const k = String(s)
    .toLowerCase()
    .replace(/para|nato|mm|\s/g, '')
    .replace(/\./g, '');
  return k === '12ga' ? '12g' : k === '20ga' ? '20g' : k;
}
/** The calibre a magazine's name declares ('AK-12 5.45x39 30-round magazine' -> '545x39'). */
const MAG_CALIBRE = /(\d+(?:\.\d+)?x\d+R?|\d{2}ga|\.\d{3}\b)/;

/** Items the catalogue lacks, in its own format. */
export const EXTRA = [
  {
    slug: 'gp-25-grenade-launcher',
    name: 'GP-25 Kostyor 40mm under-barrel grenade launcher',
    short: 'GP-25',
    w: 2,
    h: 1,
    kg: 1.5,
    stats: {kind: 'weapon', caliber: '40mmRU'},
  },
  {slug: 'rpg-7-launcher', name: 'RPG-7 rocket launcher', short: 'RPG-7', w: 4, h: 1, kg: 6.3, stats: {kind: 'weapon', caliber: 'PG-7'}},
  {
    slug: 'pg-7v-rocket',
    name: 'PG-7V HEAT rocket',
    short: 'PG-7V',
    w: 3,
    h: 1,
    kg: 2.2,
    stats: {kind: 'ammo', caliber: 'PG-7', damage: 400, penetrationPower: 80, stackMaxSize: 1},
  },
  {
    slug: 'og-7v-rocket',
    name: 'OG-7V fragmentation rocket',
    short: 'OG-7V',
    w: 3,
    h: 1,
    kg: 2,
    stats: {kind: 'ammo', caliber: 'PG-7', damage: 260, penetrationPower: 10, stackMaxSize: 1},
  },
  {
    slug: 'dshk-127x108-machine-gun',
    name: 'DShK 12.7x108 heavy machine gun',
    short: 'DShK',
    w: 6,
    h: 2,
    kg: 34,
    stats: {kind: 'weapon', caliber: '12.7x108'},
  },
  {
    slug: 'dshk-127x108-50-round-belt-box',
    name: 'DShK 12.7x108 50-round belt box',
    short: 'DShK',
    w: 2,
    h: 2,
    kg: 3,
    stats: {kind: 'magazine', capacity: 50},
  },
  {
    slug: '127x108mm-b-32',
    name: '12.7x108mm B-32',
    short: 'B-32',
    w: 1,
    h: 1,
    kg: 0.13,
    stats: {kind: 'ammo', caliber: '12.7x108', damage: 190, penetrationPower: 70, stackMaxSize: 20},
  },
];

const KIND_BY_CATEGORY = {
  Medkits: 'meds',
  'Injury treatment': 'meds',
  'Medical supplies': 'meds',
  Injectors: 'meds',
  Throwables: 'grenade',
  'Body armor': 'armor',
  Headgear: 'headwear',
};

/** A container's grids from its catalogue capacity: a rig is rows of 1x2 pouches (a magazine each), a backpack one grid. */
export function gridsFor(kind, capacity) {
  if (kind === 'rig') {
    const pouches = Math.min(8, Math.floor(capacity / 2));
    const grids = Array.from({length: pouches}, () => ({w: 1, h: 2}));
    for (let i = pouches * 2; i < Math.min(capacity, 20); i++) grids.push({w: 1, h: 1});
    return grids;
  }
  const w = Math.max(3, Math.min(6, Math.round(Math.sqrt(capacity * 0.8))));
  return [{w, h: Math.ceil(capacity / w)}];
}

export function createCatalogue(data, extra = EXTRA) {
  const catName = Object.fromEntries((data.categories || []).map(c => [c.id, c.name]));
  const defs = new Map();
  for (const it of [...(data.items || []), ...extra]) {
    const st = it.stats || {};
    let kind = st.kind || KIND_BY_CATEGORY[catName[it.cat]] || 'item';
    if (kind === 'part') kind = 'item';
    const med = kind === 'medical' || kind === 'medkit'; // shared/inventory/meds.js
    if (med) kind = 'meds';
    const d = {slug: it.slug, name: it.name, short: it.short || it.name, kind, w: it.w || 1, h: it.h || 1, kg: it.kg || 0};
    if (kind === 'weapon' || kind === 'ammo') d.calibre = calibreKey(st.caliber);
    if (kind === 'magazine') {
      d.capacity = st.capacity;
      d.calibre = calibreKey(it.name.match(MAG_CALIBRE)?.[1]);
    }
    if (kind === 'ammo')
      Object.assign(d, {stack: st.stackMaxSize || 60, damage: st.damage || 0, pen: st.penetrationPower || 0, tracer: !!st.tracer});
    if (med) Object.assign(d, {heal: st.maxHealPerUse || 15, charges: st.hitpoints || (st.uses || 1) * 15});
    if (kind === 'rig' || kind === 'backpack') d.grids = gridsFor(kind, st.capacity || 4);
    if (kind === 'armor' || kind === 'rig') d.armourClass = st.class || 0;
    defs.set(it.slug, d);
  }
  const all = [...defs.values()];
  return {
    /** The definition of `slug` (throws on an unknown item: a typo should fail loudly). */
    def(slug) {
      const d = defs.get(slug);
      if (!d) throw new Error(`no catalogue item ${slug}`);
      return d;
    },
    has: slug => defs.has(slug),
    /** Every round of a calibre, weakest penetration first. */
    roundsFor: calibre => all.filter(d => d.kind === 'ammo' && d.calibre === calibre).sort((a, b) => a.pen - b.pen),
    /** Every magazine of a calibre, smallest first. */
    magazinesFor: calibre => all.filter(d => d.kind === 'magazine' && d.calibre === calibre).sort((a, b) => a.capacity - b.capacity),
    size: defs.size,
  };
}
