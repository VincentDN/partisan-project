// Auto-resolve readiness and exact ammunition expenditure from owned kits; never issue weapons or count stash rounds.
import {ARMS} from '../inventory/arms.js';
import {TROOPS} from '../../band/troops.js';
import {AMMO_INDEX} from './ammo-index.js';
const PROFILE = {
  hunting: [0.8, 2],
  tt: [0.4, 4],
  akm: [1, 3],
  ak: [1, 3],
  ak74: [1, 3],
  ak74m: [1, 3],
  ak15k: [1.1, 3],
  pkm: [1.3, 5],
  rpk: [1.2, 4],
  svd: [1.1, 2],
  mk14: [1.1, 2],
  smg: [0.7, 4],
  shotgun: [0.6, 3],
};
/** References to compatible rounds in the primary and reachable inventory; no rounds in other weapons or nested bags. */
function supplies(kit, calibre) {
  const sources = [],
    seen = new Set();
  const compatible = slug => AMMO_INDEX[slug]?.[0] === 'ammo' && AMMO_INDEX[slug][1] === calibre;
  const magazine = mag => {
    if (!mag || (mag.uid && seen.has(mag.uid))) return;
    if (mag.uid) seen.add(mag.uid);
    if (AMMO_INDEX[mag.slug]?.[0] !== 'magazine' || AMMO_INDEX[mag.slug][1] !== calibre) return;
    for (const stack of mag.rounds || [])
      if (compatible(stack[0]) && Number.isSafeInteger(stack[1]) && stack[1] > 0)
        sources.push({
          count: stack[1],
          take: n => {
            stack[1] -= n;
            mag.rounds = mag.rounds.filter(([, left]) => left > 0);
          },
        });
  };
  const w = kit.primary;
  if (compatible(w.chamber))
    sources.push({
      count: 1,
      take: () => {
        w.chamber = null;
      },
    });
  magazine(w.mag);
  for (const bag of [kit.rig, kit.pockets, kit.backpack])
    for (const grid of bag?.grids || [])
      for (const entry of grid.items || []) {
        const item = entry.item;
        if (!item || (item.uid && seen.has(item.uid))) continue;
        if (AMMO_INDEX[item.slug]?.[0] === 'magazine') magazine(item);
        else if (compatible(item.slug) && Number.isSafeInteger(item.count) && item.count > 0) {
          if (item.uid) seen.add(item.uid);
          sources.push({
            count: item.count,
            take: n => {
              item.count -= n;
              if (!item.count) grid.items = grid.items.filter(e => e !== entry);
            },
          });
        }
      }
  return sources;
}
export function equipmentPlan(c, e) {
  const ids = e.fighters || [];
  return ids.map(id => {
    const f = c.band.fighters[id],
      kit = f?.kit;
    const weapon = Object.keys(PROFILE).find(w => ARMS[w]?.weapon === kit?.primary?.slug);
    const [power, cost] = PROFILE[weapon] || [0, 0];
    const calibre = AMMO_INDEX[ARMS[weapon]?.round]?.[1];
    const rounds = weapon && calibre ? supplies(kit, calibre).reduce((n, s) => n + s.count, 0) : 0;
    const required = Math.max(2, Math.ceil((Math.max(1, e.enemy?.strength || 1) * cost) / Math.max(1, ids.length)));
    return {
      id,
      weapon: weapon || null,
      rounds,
      required,
      ready: !!weapon && rounds >= required,
      strength: (TROOPS[f?.class]?.tier || 0) * power * Math.min(1, rounds / required),
    };
  });
}
/** Spend on a copy before deploy so an error cannot partially mutate the campaign. */
export function spentKits(c, plan) {
  const kits = {};
  for (const p of plan) {
    if (!p.ready) throw new Error('Selected fighters need compatible ammunition before auto-resolving.');
    const kit = structuredClone(c.band.fighters[p.id].kit);
    let left = p.required;
    for (const s of supplies(kit, AMMO_INDEX[ARMS[p.weapon].round][1])) {
      const n = Math.min(left, s.count);
      s.take(n);
      left -= n;
      if (!left) break;
    }
    if (left) throw new Error('Carried ammunition changed; review the squad and retry.');
    kits[p.id] = kit;
  }
  return kits;
}
