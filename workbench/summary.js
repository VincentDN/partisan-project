// Build summary: total weight plus the derived stat bars for a loadout.
import {computeStats} from './stats.js';

/** @param {any} rifle  the mounted rifle instance  @param {Record<string,string>} build  slot id -> option id */
export function buildSummary(rifle, build) {
  const options = Object.fromEntries(
    Object.values(rifle.slots).map(slot => [slot.spec.id, slot.options.find(o => o.id === build[slot.spec.id])]),
  );
  const grams = rifle.config.baseGrams + Object.values(options).reduce((sum, o) => sum + (o?.grams || 0), 0);
  return {grams, ...computeStats(rifle.config.stats, options)};
}
