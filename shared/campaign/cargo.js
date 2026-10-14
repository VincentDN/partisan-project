// What the band takes and where it came from (WP-W14). Convoys on the map carry a cargo manifest: the encounter panel
// shows it, the deployment carries it, and a won ambush takes it home; a vehicle burnt in the fight loses its share,
// half of it salvaged from the wreck. Every addition to the stash is written in a ledger with its source and day, and
// the stash is shown with where its items came from: the newest arrivals are the ones still held (kit is spent
// oldest first), the rest is the band's first cache. Pure, no DOM. docs/campaign-roadmap.md §2.
import {GEAR} from '../../band/troops.js';

const LEDGER_LIMIT = 300;
export const FIRST_CACHE = 'the band’s first cache';

/** The cargo each convoy on the map carries, gear id -> count. Fixed per convoy: the panel can show it before a fight. */
export const MANIFESTS = {
  'supply-convoy': {ak74: 4, ak74m: 2, grenades: 3, medkit: 2, rig: 2, helmet: 2},
  'armoured-column': {pkm: 2, rpk: 2, rpg: 2, rockets: 4, plates: 2, nvg: 1},
  'fuel-convoy': {explosives: 2, tools: 2, smoke: 2, radio: 1},
};

/** The manifest of a contact (a copy), or null for anything that is not a convoy with cargo. */
export const manifestFor = sourceId => (MANIFESTS[sourceId] ? {...MANIFESTS[sourceId]} : null);

/** A manifest as words: "4 AK-74, 2 AK-74M, 3 Grenades (x4)". */
export const describeManifest = m =>
  Object.entries(m || {})
    .filter(([g, n]) => GEAR[g] && n > 0)
    .map(([g, n]) => `${n} ${GEAR[g].label}`)
    .join(', ');

/**
 * What the band takes from a convoy's cargo: nothing unless the fight was won; otherwise the manifest, less the share
 * of each burnt vehicle (vehicles share the cargo evenly), half of which is salvaged. Whole items, rounded down.
 */
export function cargoTaken(manifest, {outcome, vehicles = 0, destroyed = 0, kept: recovery = 1} = {}) {
  if (!manifest || outcome !== 'won') return {};
  const burnt = vehicles > 0 ? Math.min(1, destroyed / vehicles) : 0;
  const kept = (1 - burnt * 0.5) * Math.max(0, Math.min(1, recovery));
  const out = {};
  for (const [g, n] of Object.entries(manifest)) {
    const k = Math.floor(n * kept + 1e-9);
    if (GEAR[g] && k > 0) out[g] = k;
  }
  return out;
}

/** Write what came into the stash, and from where: {gear: n} labelled `from` on the campaign's current day. */
export function recordIn(c, items, from) {
  const day = c.world.clock.day;
  c.ledger ||= [];
  for (const [g, n] of Object.entries(items || {})) if (GEAR[g] && n > 0) c.ledger.push({gear: g, n, from, day});
  if (c.ledger.length > LEDGER_LIMIT) c.ledger.splice(0, c.ledger.length - LEDGER_LIMIT);
  return c;
}

/**
 * Where the `gear` the stash holds now came from: [{from, day, n}], newest first, adding up to the count held. Kit is
 * spent oldest first, so the newest arrivals are what is left; what the ledger does not cover is the first cache.
 */
export function provenance(c, gear) {
  let left = c.stash[gear] || 0;
  const out = [];
  for (let i = (c.ledger || []).length - 1; i >= 0 && left > 0; i--) {
    const e = c.ledger[i];
    if (e.gear !== gear) continue;
    const n = Math.min(left, e.n);
    const same = out.find(o => o.from === e.from && o.day === e.day);
    if (same) same.n += n;
    else out.push({from: e.from, day: e.day, n});
    left -= n;
  }
  if (left > 0) out.push({from: FIRST_CACHE, day: null, n: left});
  return out;
}

/** Provenance as words: "3 from Supply convoy’s cargo (day 4), 2 from the band’s first cache". */
export const describeProvenance = list => list.map(p => `${p.n} from ${p.from}${p.day ? ` (day ${p.day})` : ''}`).join(', ');
