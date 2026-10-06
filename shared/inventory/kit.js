// Making things for the grid inventory (TAC-C-11): item instances with unique ids, the fighter's loadout (slots,
// pockets, rig, backpack), the kit a fighter deploys with (60 rounds and nothing loose: shared/inventory/arms.js),
// and what the dead and the caches hold, rolled once from a seed. Pure and serialisable: plain objects throughout.
import {add, contents} from './grid.js';
import {loadMag, chamber} from './ammo.js';
import {ARMS, ISSUE, armsFor} from './arms.js';

/** Containers that are places, not items: their grids. */
export const PLACES = {
  pockets: [
    {w: 1, h: 1},
    {w: 1, h: 1},
    {w: 1, h: 1},
    {w: 1, h: 1},
  ],
  body: [{w: 6, h: 5}],
  cache: [{w: 8, h: 6}],
  stash: [{w: 10, h: 30}],
};
const ROLE_ARMS = {rifleman: 'ak', leader: 'ak', rto: 'ak', grenadier: 'ak', mg: 'pkm', marksman: 'svd', turret: 'hmg'};

function lcg(seed) {
  let a = seed >>> 0 || 1;
  return () => (a = (Math.imul(a, 1664525) + 1013904223) >>> 0) / 4294967296;
}

/** Item factory with its own id counter: `prefix` keeps ids unique across factories (a mission, the stash). */
export function createKit(cat, {prefix = 'i'} = {}) {
  let n = 0;
  /** A new item: weapons, magazines (empty), stacks (`count`), containers (empty grids). */
  function make(slug, count = 1) {
    const d = cat.def(slug);
    const it = {uid: `${prefix}${++n}`, slug, rot: 0};
    if (d.kind === 'ammo' || d.kind === 'grenade') it.count = Math.max(1, Math.min(count, d.stack || 99));
    if (d.kind === 'magazine') it.rounds = [];
    if (d.kind === 'weapon') {
      it.mag = null;
      it.chamber = null;
      it.usesMag = !!cat.magazinesFor(d.calibre).length;
    }
    if (d.grids) it.grids = d.grids.map(g => ({...g, items: []}));
    return it;
  }
  /** A place (pockets, a body, a cache, the stash) as a container with empty grids. */
  const place = (kind, label = kind) => ({uid: `${prefix}${++n}`, slug: kind, label, grids: PLACES[kind].map(g => ({...g, items: []}))});
  /** A magazine of `slug` loaded with `rounds` of `round`. */
  function magazine(slug, round, rounds) {
    const m = make(slug);
    loadMag(cat, m, {slug: round, count: rounds});
    return m;
  }

  /**
   * The kit a fighter deploys with for weapon `armsId` (a tactical weapon or band gear id): the weapon with a full
   * magazine inserted and a round chambered, the rest of its starting rounds in further magazines in the rig, and
   * nothing loose; a bandage, a medkit and a grenade in the pockets. Launchers carry their rounds in a backpack.
   */
  function issue(armsId) {
    const a = armsFor(armsId),
      w = make(a.weapon);
    const kit = {primary: w, secondary: null, armor: null, headwear: null, rig: make(ISSUE.rig), backpack: null, pockets: place('pockets')};
    let left = a.start;
    if (a.mag) {
      const cap = cat.def(a.mag).capacity;
      w.mag = magazine(a.mag, a.round, Math.min(cap, left));
      left -= roundsOf(w.mag);
      chamber(w);
      while (left > 0) {
        const m = magazine(a.mag, a.round, Math.min(cap, left));
        left -= roundsOf(m);
        if (!add(cat, kit.rig, m)) break; // the rig is full: no more is carried
      }
    } else {
      w.chamber = a.round;
      left -= 1;
      kit.backpack = make('scav-backpack');
      for (; left > 0; left--) if (!add(cat, kit.backpack, make(a.round))) break;
    }
    for (const m of ISSUE.meds) add(cat, kit.pockets, make(m));
    add(cat, kit.pockets, make(ISSUE.grenade));
    return kit;
  }
  const roundsOf = m => m.rounds.reduce((s, [, k]) => s + k, 0);

  /**
   * What a dead soldier leaves (rolled once from `seed`): his weapon with a part-spent magazine, a spare magazine or
   * two (rarely full), a few loose rounds, sometimes a bandage or a grenade. Ammunition is scarce here too.
   */
  function body(role, seed, label = 'Fallen soldier') {
    const r = lcg(seed),
      a = ARMS[ROLE_ARMS[role] || 'ak'],
      c = place('body', label);
    const w = make(a.weapon);
    if (a.mag) {
      const cap = cat.def(a.mag).capacity;
      w.mag = magazine(a.mag, a.round, Math.floor(r() * cap * 0.7));
      for (let i = Math.floor(r() * 2.4); i > 0; i--) add(cat, c, magazine(a.mag, a.round, Math.floor(cap * (0.2 + r() * 0.8))));
    } else if (r() < 0.6) add(cat, c, make(a.round));
    add(cat, c, w);
    if (r() < 0.45) add(cat, c, make(a.round, 3 + Math.floor(r() * 15)));
    if (r() < 0.3) add(cat, c, make('army-bandage'));
    if (r() < 0.2) add(cat, c, make(ISSUE.grenade));
    return c;
  }

  /** An equipment cache (an armoury, a convoy's cargo): ammunition in packs and magazines, medicine, a weapon. */
  function cache(seed, {label = 'Supply cache', calibres = ['ak', 'pkm', 'svd']} = {}) {
    const r = lcg(seed),
      c = place('cache', label);
    for (const id of calibres) {
      const a = ARMS[id];
      for (let i = 0; i < 1 + Math.floor(r() * 3); i++) add(cat, c, make(a.round, 20 + Math.floor(r() * 40)));
      if (a.mag && r() < 0.6) add(cat, c, make(a.mag));
    }
    if (r() < 0.5) add(cat, c, make('ai-2-medkit'));
    if (r() < 0.4) add(cat, c, make(ISSUE.grenade));
    if (r() < 0.3) add(cat, c, make(ARMS[calibres[Math.floor(r() * calibres.length)]].weapon));
    return c;
  }
  return {make, place, magazine, issue, body, cache};
}

/** Every item in a container, weapons' magazines included (for searches and tests). */
export function everything(container) {
  const out = [];
  for (const it of contents(container)) {
    out.push(it);
    if (it.mag) out.push(it.mag);
    if (it.grids) out.push(...everything(it));
  }
  return out;
}
