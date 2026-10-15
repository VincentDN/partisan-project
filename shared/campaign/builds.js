// Owned guns in the Weapon Modder (WP-W16). In a campaign the Workbench offers only what the band has: a rifle it holds
// (in the stash, or the one the fighter already carries), and attachments that are band gear (a suppressor, a scope, a
// red dot, a bipod...) only while one is free: in the stash and not already fitted to another fighter's build.
// Furniture, finishes and each rifle's own factory parts are always there. A locked part says where it is found.
// A build assigned to a fighter is the gun they carry next mission: its sprite, and what its parts do in a fight.
// Pure, no DOM.
import {GEAR} from '../../band/troops.js';
import {ARMS} from '../inventory/arms.js';

/** Workbench rifles that are campaign weapons (model id -> gear id); the others are not found on this island. */
export const RIFLE_GEAR = {ak74m: 'ak74m', ak15k: 'ak15k', rpk: 'rpk', mk14: 'mk14'};
/** Workbench options that are band gear: slot -> option -> gear id. Anything else is free to fit. */
export const PART_GEAR = {
  muzzle: {can: 'suppressor'},
  optic: {reddot: 'reddot', micro: 'reddot', holo: 'reddot', scope: 'scope'},
  foregrip: {bipod: 'bipod', gp25: 'gp25'},
  side: {light: 'taclight', laser: 'taclight', combo: 'taclight'},
  magazine: {45: 'extmag', 60: 'extmag', drum: 'extmag'},
};
/** Where the band comes by each kind of gear (for a locked part). */
const WHERE = {
  suppressor: 'on the fallen and in abandoned caches',
  scope: 'in compound stores and on marksmen',
  reddot: 'in compound stores and convoy cargo',
  bipod: 'with machine guns, and in checkpoint stores',
  gp25: 'on grenadiers, and in convoy cargo',
  taclight: 'in compound stores',
  extmag: 'in convoy cargo and on machine gunners',
};
/** What a part does in a fight: multipliers on the unit's mods (convoy/abilities.js modsFor). */
export const PART_EFFECTS = {
  scope: {spread: 0.75},
  reddot: {spread: 0.88},
  suppressor: {noise: 0.45},
  bipod: {spread: 0.9, suppOut: 1.15},
};

/** The gear a build uses: [gear ids], the rifle first. build: {rifle, parts: {slot: option}}. */
export function buildGear(build) {
  const out = [];
  if (RIFLE_GEAR[build?.rifle]) out.push(RIFLE_GEAR[build.rifle]);
  for (const [slot, option] of Object.entries(build?.parts || {})) if (PART_GEAR[slot]?.[option]) out.push(PART_GEAR[slot][option]);
  return out;
}

/** How many of `gear` are free for fighter `id`: the stash's, less what other fighters' builds have fitted. */
export function free(c, gear, id) {
  let n = c.stash?.[gear] || 0;
  for (const [other, f] of Object.entries(c.band?.fighters || {})) if (other !== id) n -= buildGear(f.build).filter(g => g === gear).length;
  return n;
}

/** Does fighter `id` already carry rifle gear `gear` (their kit's weapon)? */
const carries = (c, id, gear) => c.band?.fighters?.[id]?.kit?.primary?.slug === ARMS[gear]?.weapon;

/**
 * Can fighter `id` have Workbench rifle `rifle`? {ok} or {ok: false, reason}.
 */
export function rifleLock(c, id, rifle) {
  const gear = RIFLE_GEAR[rifle];
  if (!gear) return {ok: false, reason: 'Not found on this island.'};
  if (carries(c, id, gear) || c.band?.fighters?.[id]?.build?.rifle === rifle || free(c, gear, id) > 0) return {ok: true};
  return {ok: false, reason: `The band has no ${GEAR[gear].label} to spare. They are found on Invader soldiers and in convoy cargo.`};
}

/**
 * Can fighter `id` fit `option` in `slot`? {ok} or {ok: false, reason}. The fighter's own build counts as theirs.
 */
export function partLock(c, id, slot, option) {
  const gear = PART_GEAR[slot]?.[option];
  if (!gear) return {ok: true};
  if (free(c, gear, id) > 0) return {ok: true};
  return {ok: false, reason: `The band has no ${GEAR[gear].label} free. Found ${WHERE[gear] || 'on the island'}.`};
}

/** A build's effect on a unit's mods (spread, noise, suppOut multipliers). */
export function buildMods(build) {
  const m = {};
  for (const g of buildGear(build)) for (const [k, v] of Object.entries(PART_EFFECTS[g] || {})) m[k] = (m[k] ?? 1) * v;
  return m;
}

/** A build as it is kept on a fighter: {rifle, parts: {slot: option}, hash} (hash: the Workbench's own link). */
export function makeBuild(rifle, parts, hash = '') {
  return {rifle, parts: {...parts}, hash: String(hash || '')};
}
