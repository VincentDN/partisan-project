// Limited seeded auto-resolve (WP-W22): preview the selected fighters' odds, then use the normal settlement path.
import {TROOPS} from '../../band/troops.js';
import {SQUAD_MIN, SQUAD_MAX} from '../../convoy/roster.js';
import {rng} from '../../convoy/sim-base.js';
import {deploy, writeResult, settle} from './encounter.js';

/** Only the selected fit fighters count; reserve troop stacks never inflate the odds. */
export function autoPreview(c, e) {
  const ids = e.fighters || [],
    enemy = e.enemy?.strength,
    valid =
      ids.length >= SQUAD_MIN &&
      ids.length <= SQUAD_MAX &&
      new Set(ids).size === ids.length &&
      ids.every(id => c.band.fighters[id] && !c.band.fighters[id].wounded);
  const strength = ids.reduce((n, id) => n + (TROOPS[c.band.fighters[id]?.class]?.tier || 0), 0);
  const ratio = strength / Math.max(1, enemy || 0);
  const combatRatio = ratio / (1 + 0.1 * (e.variant?.response?.tier || 0));
  const forbidden =
    !['post', 'convoy'].includes(e.enemy?.kind) ||
    e.enemy?.settlement ||
    ['cave', 'hilltop', 'compound', 'village'].includes(e.level) ||
    e.source === 'fort-orion';
  const eligible =
    valid &&
    Number.isFinite(enemy) &&
    enemy > 0 &&
    !forbidden &&
    (ratio >= 2.5 || e.enemy?.patrol === true) &&
    !c.deployment &&
    !c.settled.includes(e.id);
  const odds = Math.min(0.97, (0.95 * combatRatio * combatRatio) / (1 + combatRatio * combatRatio));
  const woundChance = Math.min(0.8, 0.1 + 0.4 / Math.max(0.1, combatRatio));
  return {eligible, strength, enemy, ratio, odds, expectedWounds: ids.length * (odds * woundChance + (1 - odds) * 0.65), woundChance};
}

/** The encounter seed fixes the outcome across reloads. No rare cargo or random bonus reward roll. */
export function resolveAuto(c, e) {
  const p = autoPreview(c, e);
  if (!p.eligible) throw new Error('Auto-resolve requires six to nine fit fighters and a small, eligible fight.');
  const random = rng(e.seed);
  const won = random() < p.odds;
  const fighters = Object.fromEntries(
    e.fighters.map(id => [
      id,
      {
        state: random() < (won ? p.woundChance : 0.65) ? 'wounded' : 'fit',
        xp: won ? 12 : 4,
        kills: 0,
      },
    ]),
  );
  // Calculate before mutating; deploy validates identities, kit and duplicate encounter ids before reserving anything.
  deploy(c, {...e, spend: {}, variant: {...e.variant, ambush: 'roadblock'}});
  c.deployment.resolution = 'auto';
  writeResult(c, e.id, {
    outcome: won ? 'won' : 'lost',
    kitGains: {},
    fighters,
    loot: won ? {ak74: Math.floor((p.enemy / 4) * 0.75)} : {},
    vehicles: e.variant?.convoy?.vehicles.length || 0,
  });
  const result = settle(c, e.id);
  return {preview: p, result};
}
