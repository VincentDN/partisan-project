// Occupation escalation derives from named fighters and liberated seats; heat still decides when hunters deploy.
import {TROOPS} from '../../band/troops.js';
import {SETTLEMENTS} from '../../map/island.js';
export const RESPONSE_TIERS = [
  {tier: 0, label: 'Routine patrols', threshold: 0, hunters: 0, heatDiscount: 0, react: 1.6, spread: 1.9, taken: 0.65},
  {tier: 1, label: 'Active search', threshold: 40, hunters: 4, heatDiscount: 5, react: 1.4, spread: 1.65, taken: 0.75},
  {tier: 2, label: 'Containment', threshold: 60, hunters: 8, heatDiscount: 10, react: 1.2, spread: 1.4, taken: 0.85},
  {tier: 3, label: 'Suppression', threshold: 80, hunters: 12, heatDiscount: 15, react: 1, spread: 1.2, taken: 0.95},
];
export const responseTier = tier => RESPONSE_TIERS.find(t => t.tier === tier) || RESPONSE_TIERS[0];
/** Wounded and undeployed fighters still count: choosing a small squad cannot hide the band's strength. */
export function response(c) {
  const fighters = Object.values(c.band.fighters).reduce((n, f) => n + (TROOPS[f.class]?.tier || 1), 0);
  const seats = SETTLEMENTS.filter(s => s.faction === 'invader' && c.world.settlements[s.id]?.owner === 'resistance').length;
  const score = fighters + seats * 12;
  const tier = RESPONSE_TIERS.findLast(t => score >= t.threshold);
  return {...tier, score, fighters, seats, next: RESPONSE_TIERS[tier.tier + 1]?.threshold ?? null};
}
