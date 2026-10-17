// Count carried tactical ammunition and weapons independently of reserve-stash rewards for W23 coverage audits.
import {ARMS} from '../../shared/inventory/arms.js';
import {kitCounts} from '../../shared/campaign/loot-report.js';
const rounds = new Set(Object.values(ARMS).map(a => a.round));
const weapons = new Set(Object.values(ARMS).map(a => a.weapon));
export function carried(c) {
  const kits = Object.fromEntries(Object.entries(c.band.fighters).map(([id, f]) => [id, f.kit]));
  const counts = kitCounts(kits);
  const sum = slugs => [...slugs].reduce((n, slug) => n + (counts[slug] || 0), 0);
  return {rounds: sum(rounds), weapons: sum(weapons)};
}
