// Rounds, magazines and weapons (TAC-C-11): rounds and magazines are separate things. A loose stack is an ammo item
// with a count (up to the cartridge's stack size). A magazine holds an ordered stack of real rounds, bottom first, as
// [[round slug, n], ...], only of its calibre and never past its capacity; the top round feeds first. A weapon holds an
// inserted magazine (`mag`) and one round in the chamber (`chamber`); launchers load straight into the chamber. A
// reload swaps actual magazines: the one that comes out keeps whatever it still holds. Pure: catalogue in, data out.
import {contents, remove, placeAt, add} from './grid.js';

/** Rounds in a magazine. */
export const roundsIn = mag => (mag?.rounds || []).reduce((a, [, n]) => a + n, 0);

/**
 * Load up to `n` rounds from a loose stack into a magazine: same calibre only, never past capacity. The stack's
 * count goes down by what went in. Returns how many were loaded (0 with a reason when it cannot).
 */
export function loadMag(cat, mag, stack, n = Infinity) {
  const m = cat.def(mag.slug),
    r = cat.def(stack.slug);
  if (m.kind !== 'magazine' || r.kind !== 'ammo') return {loaded: 0, reason: 'not a magazine and rounds'};
  if (m.calibre !== r.calibre) return {loaded: 0, reason: `${r.short} is not ${m.calibre} ammunition`};
  const k = Math.max(0, Math.min(n, stack.count, m.capacity - roundsIn(mag)));
  if (!k) return {loaded: 0, reason: roundsIn(mag) >= m.capacity ? 'the magazine is full' : 'no rounds'};
  mag.rounds ??= [];
  const top = mag.rounds.at(-1);
  if (top && top[0] === stack.slug) top[1] += k;
  else mag.rounds.push([stack.slug, k]);
  stack.count -= k;
  return {loaded: k};
}

/** Empty a magazine into loose stacks, one per round type, split at the stack size. `make(slug, count)` builds items. */
export function unloadMag(cat, mag, make) {
  const by = new Map();
  for (const [slug, n] of mag.rounds || []) by.set(slug, (by.get(slug) || 0) + n);
  mag.rounds = [];
  const out = [];
  for (const [slug, n] of by) {
    const size = cat.def(slug).stack;
    for (let left = n; left > 0; left -= size) out.push(make(slug, Math.min(size, left)));
  }
  return out;
}

/** Take the top round off a magazine: its slug, or null when empty. */
export function popRound(mag) {
  const top = mag?.rounds?.at(-1);
  if (!top) return null;
  if (--top[1] <= 0) mag.rounds.pop();
  return top[0];
}

/** Rack the weapon: chamber the magazine's top round if the chamber is empty. Returns the chambered slug or null. */
export function chamber(weapon) {
  if (!weapon.chamber && weapon.mag) weapon.chamber = popRound(weapon.mag);
  return weapon.chamber || null;
}

/** Fire one round: the chambered round's definition (damage, penetration), the next round chambered; null when dry. */
export function fire(cat, weapon) {
  if (!weapon.chamber) chamber(weapon);
  const slug = weapon.chamber;
  if (!slug) return null;
  weapon.chamber = null;
  chamber(weapon);
  return cat.def(slug);
}

/** Rounds ready to fire: chamber plus the inserted magazine. */
export const loadedRounds = weapon => (weapon.chamber ? 1 : 0) + roundsIn(weapon.mag);

/** The containers a fighter reaches into, in the order a reload searches them: rig, pockets, backpack. */
export const reachable = kit => [kit.rig, kit.pockets, kit.backpack].filter(Boolean);

/** Every round a fighter carries of a calibre: in the weapon, in magazines and loose. */
export function roundsCarried(cat, kit, calibre) {
  let n = 0;
  for (const w of [kit.primary, kit.secondary].filter(Boolean)) if (cat.def(w.slug).calibre === calibre) n += loadedRounds(w);
  for (const c of reachable(kit))
    for (const it of contents(c)) {
      const d = cat.def(it.slug);
      if (d.calibre !== calibre) continue;
      if (d.kind === 'magazine') n += roundsIn(it);
      if (d.kind === 'ammo') n += it.count;
    }
  return n;
}

/**
 * Reload `weapon` from the fighter's kit. A magazine weapon takes the compatible magazine with the most rounds; the
 * magazine it held goes back where the new one came from (or anywhere with room; with no room it is dropped and
 * returned). A launcher loads one round of its calibre into the chamber. Returns {ok, reason?, dropped?}.
 */
export function reload(cat, kit, weapon) {
  const wd = cat.def(weapon.slug);
  let best = null;
  for (const c of reachable(kit))
    for (const it of contents(c)) {
      const d = cat.def(it.slug);
      if (d.calibre !== wd.calibre || it === weapon.mag) continue;
      const score = d.kind === 'magazine' ? roundsIn(it) : d.kind === 'ammo' && !weapon.usesMag ? it.count : -1;
      if (score > 0 && (!best || score > best.score)) best = {c, it, score, kind: d.kind};
    }
  if (!best) return {ok: false, reason: 'no ammunition for it'};
  if (best.kind === 'ammo') {
    if (weapon.chamber) return {ok: false, reason: 'already loaded'};
    weapon.chamber = best.it.slug;
    if (--best.it.count <= 0) remove(best.c, best.it.uid);
    return {ok: true};
  }
  const spot = remove(best.c, best.it.uid);
  const old = weapon.mag;
  weapon.mag = best.it;
  chamber(weapon);
  if (!old) return {ok: true};
  const back = placeAt(cat, best.c, spot.g, old, spot.x, spot.y, 0) || placeAt(cat, best.c, spot.g, old, spot.x, spot.y, 1);
  if (back || reachable(kit).some(c => add(cat, c, old))) return {ok: true};
  return {ok: true, dropped: old};
}

/** Unload a magazine's rounds into the first of `places` with room; what finds none goes back in. Returns that count. */
export function unloadInto(cat, mag, places, make) {
  let kept = 0;
  for (const s of unloadMag(cat, mag, make)) if (!places.some(c => add(cat, c, s))) kept += loadMag(cat, mag, s).loaded;
  return kept;
}

/** Take a weapon's magazine out into the first of `places` with room (it stays in with none). Returns whether it came out. */
export function ejectMag(cat, weapon, places) {
  const m = weapon.mag;
  if (!m || !places.some(c => add(cat, c, m))) return false;
  weapon.mag = null;
  return true;
}
