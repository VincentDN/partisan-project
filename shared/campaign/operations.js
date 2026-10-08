// Campaign recovery and the first liberation operation: resupply at friendly settlements and a persistent goal.
import {ownerOf, passTime} from './contacts.js';
import {logEvent} from './state.js';

export function safeHaven(c, settlements, at = c.world.party) {
  return at && settlements.find(s => ownerOf(c, s) !== 'invader' && Math.hypot(s.x - at.x, s.z - at.z) < 32);
}
export function rest(c, settlements, hours = 24) {
  const haven = safeHaven(c, settlements);
  if (!haven) throw new Error('Reach a friendly or independent settlement to rest.');
  if (c.deployment) throw new Error('Finish the active mission first.');
  if (![12, 24, 48].includes(hours)) throw new Error('Rest for 12, 24 or 48 hours.');
  const healed = passTime(c, hours);
  c.world.heat = Math.max(0, c.world.heat - hours / 4);
  logEvent(c, {kind: 'rest', settlement: haven.id, hours, fighters: healed});
  return healed;
}
/** Completion is derived from durable territory and records, never from the bounded event log. */
export function operation(c) {
  const victories = Object.values(c.record).reduce((n, r) => n + r.won, 0);
  const settlements = Object.entries(c.world.settlements)
    .filter(([, s]) => s.owner === 'resistance')
    .map(([id]) => id);
  const convoy = (c.record.convoy?.won || 0) + (c.record['forest-road']?.won || 0) > 0;
  const fort = settlements.includes('fort-orion');
  return {
    victories,
    convoy,
    fort,
    complete: convoy && fort && victories >= 3,
    text: `Operation foothold: ${convoy ? '✓' : '○'} intercept a convoy · ${Math.min(victories, 3)}/3 victories · ${fort ? '✓' : '○'} liberate Fort Orion`,
  };
}
