// Real ammunition in the fights and things to search (WP-S9 and S11, TAC-C-11). Each rebel carries a grid kit
// (shared/inventory/kit.js): their main weapon fires the rounds in it, one by one, each round's damage against the
// issue round's; a reload swaps a real magazine from the rig, and a rebel with no magazine left is dry until they
// loot. The army keeps its own counters. The dead and the wrecks become searchable: a body with what that soldier
// carried, a wreck with its cargo, rolled once from the mission's seed. Pure apart from the sim it is given.
import {createKit, everything} from '../shared/inventory/kit.js';
import {roundsIn, fire, reload, loadedRounds, roundsCarried, reachable, loadMag, chamber} from '../shared/inventory/ammo.js';
import {contents, add, remove} from '../shared/inventory/grid.js';
import {ARMS} from '../shared/inventory/arms.js';

export const SEARCH_RANGE = 2.2; // metres from a body or a wreck
export const SEARCH_TIME = 1.2; // seconds of holding E

/**
 * Give the rebels kits (or the ones they carry already, by unit id) and install the sim's real-ammunition hooks.
 * army: the soldiers carry real kits too (the 60-round issue): they spend real rounds, and a body holds exactly what
 * its soldier had left. Without it they keep their own counters and a body's contents are rolled.
 */
export function attachAmmo(sim, cat, {kits = {}, seed = 1, army = false} = {}) {
  // ids unique across missions: kits carried in from earlier missions keep theirs
  const factory = createKit(cat, {prefix: `m${seed}-`});
  for (const u of sim.units) {
    const w = u.weapons?.[0];
    if (!ARMS[w] || (u.side !== 'partisan' && !(army && u.side === 'army'))) continue;
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
      if (r.dropped) drops.push({x: u.x, z: u.z, label: 'a dropped magazine', container: pile(r.dropped)});
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
  const searched = new Map(); // a unit id, vehicle id or crate -> {x, z, r?, container, label}
  let n = 0;
  // the level's crates are supply caches: a little ammunition, sometimes a medkit, a grenade or a rifle
  (sim.level.cover || []).forEach((c, i) => {
    if (c.kind !== 'crate') return;
    const label = 'Supply crate';
    searched.set(`crate-${i}`, {
      x: c.x,
      z: c.z,
      r: Math.max(c.w, c.d) / 2,
      label,
      container: factory.cache(seed * 71 + i, {label, calibres: ['ak']}),
    });
  });
  /** A body holding what its fighter carried: the weapon (magazine in it), then everything from rig and pockets. */
  function bodyOf(u) {
    const k = kitOf(u),
      c = factory.place('body', u.name || 'Fallen soldier');
    for (const it of [k.primary, k.secondary].filter(Boolean)) add(cat, c, it);
    for (const box of reachable(k)) for (const it of contents(box)) add(cat, c, it);
    kits[u.id] = null; // it is all on the ground now
    return c;
  }
  /** New bodies and wrecks since the last call (call it every frame or so). */
  function scan() {
    for (const u of sim.units)
      // a rebel who goes down is carried off with their kit (it comes home with them); a soldier's stays on him
      if (u.side === 'army' && !u.alive && !searched.has(u.id) && u.state !== 'mounted')
        searched.set(u.id, {
          x: u.x,
          z: u.z,
          label: u.name || 'Fallen soldier',
          container: kitOf(u) ? bodyOf(u) : factory.body(u.role, seed * 97 + ++n, u.name),
        });
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
  // ---------- scavenging: a fighter out of rounds takes a magazine off a body close by ----------
  const SCAVENGE_RANGE = 6,
    SCAVENGE_TIME = 2;
  /** Something of the calibre in a body: the fullest magazine, else a stack of rounds (a launcher, or to load later). */
  function takeable(container, cal, usesMag) {
    let bestIt = null,
      score = 0;
    for (const it of everything(container)) {
      const d = cat.def(it.slug);
      if (d.calibre !== cal) continue;
      const v = d.kind === 'magazine' ? roundsIn(it) : d.kind === 'ammo' ? (usesMag ? it.count / 4 : it.count) : 0;
      if (v > score) [bestIt, score] = [it, v];
    }
    return bestIt;
  }
  /** Call once a frame: AI fighters who are dry take what fits from a body within a few metres. */
  function scavenge(dt) {
    scan();
    lootTick(dt);
    for (const u of sim.units) {
      const k = kitOf(u);
      if (!u.alive || u === sim.player || !k?.primary || u.mags[k.armsId] > 0 || u.reload > 0 || sim.ammo.canReload(u, k.armsId)) {
        if (u.scavenge) u.scavenge = 0;
        continue;
      }
      const cal = calibreOf(k);
      const body = [...searched.values()].find(
        s => Math.hypot(s.x - u.x, s.z - u.z) < SCAVENGE_RANGE && takeable(s.container, cal, k.primary.usesMag),
      );
      if (!body) {
        if (u.side === 'army' || u.side === 'partisan')
          sim.say(u, u.side === 'army' ? "I'm out! Who has rounds?" : 'I am out of rounds!', 'dry', 20);
        continue;
      }
      u.scavenge = (u.scavenge || 0) + dt;
      if (u.scavenge < SCAVENGE_TIME) continue;
      u.scavenge = 0;
      const it = takeable(body.container, cal, k.primary.usesMag);
      takeOut(body.container, it);
      const own = k.primary.mag;
      if (cat.def(it.slug).kind === 'ammo' && own) {
        // loose rounds: thumbed into their own empty magazine; what does not fit stays on the body
        loadMag(cat, own, it);
        chamber(k.primary);
        if (it.count > 0) add(cat, body.container, it);
      } else if (!reachable(k).some(c => add(cat, c, it))) {
        // no room on them: straight into the weapon
        if (cat.def(it.slug).kind === 'magazine') {
          if (k.primary.mag) add(cat, body.container, k.primary.mag);
          k.primary.mag = it;
        } else if (!k.primary.chamber) k.primary.chamber = it.slug;
      }
      sync(u);
      sim.say(u, u.side === 'army' ? 'Taking his magazines!' : 'Grabbing his ammo!', 'scavenge', 6);
    }
  }
  // ---------- ordered looting: L sends the selected rebels to the body, crate or wreck nearest the cursor ----------
  const looting = new Map(); // unit id -> {target, t}
  /** Order rebels `ids` to loot the searchable nearest (x, z). Returns the target, or null with none near. */
  function orderLoot(ids, x, z) {
    const target = near(x, z, 10);
    if (!target) return null;
    sim.order(ids, {type: 'move', x: target.x, z: target.z + (target.r || 0) + 0.8});
    for (const id of ids) if (sim.units.find(u => u.id === id && u !== sim.player)) looting.set(id, {target, t: 0});
    return target;
  }
  /** Take what fits their weapon (magazines with rounds, loose rounds) and medicine, while they have room. */
  function lootInto(u, target) {
    const k = kitOf(u),
      cal = calibreOf(k);
    let mags = 0,
      rounds = 0;
    for (const it of everything(target.container)) {
      const d = cat.def(it.slug);
      const wanted = (d.calibre === cal && ((d.kind === 'magazine' && roundsIn(it)) || d.kind === 'ammo')) || d.kind === 'meds';
      if (!wanted || !reachable(k).some(c => add(cat, c, it))) continue;
      takeOut(target.container, it);
      if (d.kind === 'magazine') mags++;
      if (d.kind === 'ammo') rounds += it.count;
    }
    sync(u);
    const got = [mags && `${mags} magazine${mags > 1 ? 's' : ''}`, rounds && `${rounds} rounds`].filter(Boolean).join(' and ');
    sim.say(u, got ? `Took ${got}.` : 'Nothing here for me.', 'looted', 0);
  }
  function lootTick(dt) {
    for (const [id, L] of looting) {
      const u = sim.units.find(x => x.id === id);
      if (!u?.alive || !kitOf(u) || !['move', 'hold'].includes(u.order?.type)) {
        looting.delete(id);
        continue;
      }
      if (Math.hypot(L.target.x - u.x, L.target.z - u.z) - (L.target.r || 0) > SEARCH_RANGE + 0.6) continue;
      if ((L.t += dt) < SEARCH_TIME * 1.5) continue;
      looting.delete(id);
      lootInto(u, L.target);
    }
  }
  /** Take an item out of a container, or out of a weapon in it (a magazine still in a rifle on the ground). */
  function takeOut(container, it) {
    if (remove(container, it.uid)) return;
    for (const w of everything(container)) if (w.mag === it) w.mag = null;
  }
  return {kits, kitOf, sync, scan, near, searched, drops, factory, scavenge, orderLoot, looting};
}
