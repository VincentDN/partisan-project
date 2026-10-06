// Contacts on the campaign map (the first cut of WP-W8 to W14): which mission each enemy leads to, who can go, what a
// fight changed, and healing over time. The map meets an Invader convoy (the Convoy Ambush), a garrison post or an
// Invader settlement (the Compound Assault) or the hunters (the Rebel Base Defence in the cave); the deployment
// carries the enemy's strength and the ground so the mission can be set up from it. Pure, no DOM.
import {logEvent} from './state.js';

/** The enemies on the map: id -> what they are, and the mission meeting them starts. */
export const SOURCES = {
  'supply-convoy': {name: 'Supply convoy', kind: 'convoy', level: 'convoy', strength: 14},
  'armoured-column': {name: 'Armoured column', kind: 'convoy', level: 'convoy', strength: 18},
  'fuel-convoy': {name: 'Fuel convoy', kind: 'convoy', level: 'convoy', strength: 9},
  'orion-patrol': {name: 'Orion garrison patrol', kind: 'post', level: 'compound', strength: 24},
  'korfos-checkpoint': {name: 'Checkpoint Korfos', kind: 'post', level: 'compound', strength: 12},
  raiders: {name: 'Raiding party', kind: 'hunters', level: 'cave', strength: 31},
};
/** What each kind of contact is called on the encounter panel, and what the band does there. */
export const ACTIONS = {
  convoy: {mission: 'Convoy ambush', verb: 'Ambush the convoy'},
  post: {mission: 'Compound assault', verb: 'Attack the post'},
  hunters: {mission: 'Cave hideout defence', verb: 'Stand and fight'},
  settlement: {mission: 'Compound assault', verb: 'Raid the settlement'},
};
/** The most fighters a mission takes (the levels have three rebel slots). */
export const SQUAD_MAX = 3;

/** A settlement as a contact: Invader settlements can be raided; their garrison is the enemy's strength. */
export const settlementSource = s => ({
  name: s.name,
  kind: 'settlement',
  level: 'compound',
  strength: s.garrison + s.militia,
  settlement: s.id,
});

/** Is this enemy gone from the map (destroyed, or its settlement taken)? */
export const isGone = (c, id) => c.world.parties.some(p => p.id === id && p.state === 'destroyed');
/** Who holds a settlement now: its owner in the save, or its starting faction. */
export const ownerOf = (c, s) => c.world.settlements[s.id]?.owner || s.faction;

/** The fighters fit to go, up to the squad's size. */
export const fitFighters = c =>
  Object.entries(c.band.fighters)
    .filter(([, f]) => !f.wounded)
    .map(([id]) => id)
    .slice(0, SQUAD_MAX);

/**
 * The deployment for meeting `sourceId` (an id of SOURCES, or a settlement id with its source given): pass it to
 * encounter.deploy(). The id is unique per meeting, the seed varies with it, and the enemy and ground travel along.
 */
export function encounterFor(c, sourceId, source = SOURCES[sourceId], {ground = null} = {}) {
  const n = c.settled.length + 1;
  const id = `${sourceId}-${n}-d${c.world.clock.day}`;
  let seed = c.seed * 7919 + n * 104729;
  for (const ch of sourceId) seed = (seed * 31 + ch.charCodeAt(0)) % 2147483647;
  const night = c.world.clock.hour < 6 || c.world.clock.hour >= 20;
  return {
    id,
    level: source.level,
    seed,
    fighters: fitFighters(c),
    source: sourceId,
    enemy: {name: source.name, kind: source.kind, strength: source.strength, settlement: source.settlement || null},
    ground,
    time: night ? 'night' : 'day',
  };
}

/**
 * Apply what the log says happened since the map last looked (mission results settled by the mission page): a won
 * fight destroys the enemy party; a won raid takes the settlement for the Resistance. Returns one line per result
 * for the map to show, and marks them seen. `names`: settlement id -> name, for raids.
 */
export function readResults(c, names = {}) {
  const lines = [];
  for (const e of c.log.slice(c.world.seen)) {
    if (e.kind !== 'result') continue;
    const src = SOURCES[e.source];
    const name = src?.name || names[e.source] || e.source || 'the enemy';
    if (e.outcome === 'won' && e.source) {
      if (!isGone(c, e.source)) c.world.parties.push({id: e.source, state: 'destroyed', day: e.day});
      if (!src) c.world.settlements[e.source] = {...c.world.settlements[e.source], owner: 'resistance', taken: e.day};
    }
    const hurt = e.wounded?.length ? `, ${e.wounded.length} wounded` : '';
    const loot = e.loot ? `, ${e.loot} item${e.loot === 1 ? '' : 's'} taken` : '';
    lines.push(
      e.outcome === 'won'
        ? `${name}: ${src ? 'destroyed' : 'taken for the Resistance'}${loot}${hurt}.`
        : e.outcome === 'withdrawn'
          ? `${name}: the band fell back. The fighters are wounded.`
          : `${name}: the attack failed${hurt}.`,
    );
  }
  c.world.seen = c.log.length;
  return lines;
}

/** Let campaign time pass: wounds heal. Returns the ids of fighters fit again. */
export function heal(c, hours) {
  const back = [];
  for (const [id, f] of Object.entries(c.band.fighters)) {
    if (!f.wounded) continue;
    f.healIn = Math.max(0, (f.healIn || 0) - hours);
    if (!f.healIn) {
      f.wounded = false;
      back.push(id);
    }
  }
  if (back.length) logEvent(c, {kind: 'healed', fighters: back});
  return back;
}

/** Advance the campaign clock by `hours` (healing as it goes). Returns the fighters fit again. */
export function passTime(c, hours) {
  const clock = c.world.clock;
  clock.hour += hours;
  while (clock.hour >= 24) {
    clock.hour -= 24;
    clock.day++;
  }
  return heal(c, hours);
}
