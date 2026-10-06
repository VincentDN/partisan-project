// Real ammunition in the fights and things to search (WP-S9 and S11, TAC-C-11). Each rebel carries a grid kit
// (shared/inventory/kit.js): their main weapon fires the rounds in it, one by one, each round's damage against the
// issue round's; a reload swaps a real magazine from the rig, and a rebel with no magazine left is dry until they
// loot. The army keeps its own counters. The dead and the wrecks become searchable: a body with what that soldier
// carried, a wreck with its cargo, rolled once from the mission's seed. Pure apart from the sim it is given.
import {createKit} from '../shared/inventory/kit.js';
import {roundsIn, fire, reload, loadedRounds, roundsCarried, reachable} from '../shared/inventory/ammo.js';
import {contents} from '../shared/inventory/grid.js';
import {ARMS} from '../shared/inventory/arms.js';

export const SEARCH_RANGE = 2.2; // metres from a body or a wreck
export const SEARCH_TIME = 1.2; // seconds of holding E

/** Give the rebels kits (or the ones they carry already, by unit id) and install the sim's real-ammunition hooks. */
export function attachAmmo(sim, cat, {kits = {}, seed = 1} = {}) {
  // ids unique across missions: kits carried in from earlier missions keep theirs
  const factory = createKit(cat, {prefix: `m${seed}-`});
  for (const u of sim.units) {
    const w = u.weapons?.[0];
    if (u.side !== 'partisan' || !ARMS[w]) continue;
    // a kit for another weapon (the fighter was promoted into a new class) stays home; a new one is issued
    if (!kits[u.id] || (kits[u.id].armsId && kits[u.id].armsId !== w)) kits[u.id] = factory.issue(w);
    kits[u.id].armsId = w;
  }
  const kitOf = u => kits[u.id];
  const owns = (u, wid) => !!kitOf(u) && kitOf(u).armsId === wid && !!kitOf(u).primary;
  const calibreOf = k => cat.def(k.primary.slug).calibre;
  /** The unit's counters from its kit: rounds ready, and rounds carried besides. */
  function sync(u) {
    const k = kitOf(u),
      wid = k.armsId;
    u.mags[wid] = loadedRounds(k.primary);
    u.reserve[wid] = roundsCarried(cat, k, calibreOf(k)) - u.mags[wid];
    return u.mags[wid];
  }
  /** The best thing to reload with: the fullest magazine of the calibre, or a loose round for a launcher. */
  function best(k) {
    const w = k.primary,
      cal = calibreOf(k);
    let n = 0;
    for (const c of reachable(k))
      for (const it of contents(c)) {
        const d = cat.def(it.slug);
        if (d.calibre !== cal || it === w.mag) continue;
        if (d.kind === 'magazine') n = Math.max(n, roundsIn(it));
        if (d.kind === 'ammo' && !w.usesMag) n = Math.max(n, it.count);
      }
    return n;
  }
  const drops = (sim.drops ||= []);
  sim.ammo = {
    owns,
    canReload(u, wid) {
      const k = kitOf(u),
        w = k.primary;
      if (!w.usesMag) return !w.chamber && best(k) > 0;
      return best(k) > roundsIn(w.mag);
    },
    reloaded(u) {
      const k = kitOf(u),
        r = reload(cat, k, k.primary);
      if (r.dropped) drops.push({x: u.x, z: u.z, container: pile(r.dropped)});
      return sync(u);
    },
    fired(u, wid) {
      const d = fire(cat, kitOf(u).primary);
      sync(u);
      const base = cat.def(ARMS[wid].round).damage;
      return d && base ? d.damage / base : 1;
    },
  };
  for (const u of sim.units) if (owns(u, u.weapons[0])) sync(u);

  const pile = item => ({
    uid: `drop-${item.uid}`,
    slug: 'body',
    label: 'On the ground',
    grids: [{w: 4, h: 4, items: [{item, x: 0, y: 0}]}],
  });

  // ---------- things to search ----------
  const searched = new Map(); // a unit id or vehicle id -> {x, z, container, label}
  let n = 0;
  /** New bodies and wrecks since the last call (call it every frame or so). */
  function scan() {
    for (const u of sim.units)
      if (u.side === 'army' && !u.alive && !searched.has(u.id) && u.state !== 'mounted')
        searched.set(u.id, {x: u.x, z: u.z, label: u.name || 'Fallen soldier', container: factory.body(u.role, seed * 97 + ++n, u.name)});
    for (const v of sim.vehicles || [])
      if (v.destroyed && !searched.has(v.id))
        searched.set(v.id, {
          x: v.x,
          z: v.z,
          r: Math.max(v.w || 0, v.d || 0) / 2,
          label: `${v.label || 'Wreck'}: cargo`,
          container: factory.cache(seed * 89 + ++n, {label: `${v.label || 'Wreck'}: cargo`, calibres: ['ak', 'pkm']}),
        });
    return searched;
  }
  /** The nearest thing to search within reach of (x, z), or null. */
  function near(x, z, r = SEARCH_RANGE) {
    scan();
    let out = null,
      bestD = Infinity;
    for (const s of [...searched.values(), ...drops]) {
      const d = Math.hypot(s.x - x, s.z - z) - (s.r || 0);
      if (d <= r && d < bestD) [out, bestD] = [s, d];
    }
    return out;
  }
  return {kits, kitOf, sync, scan, near, searched, drops, factory};
}
