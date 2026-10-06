// Contacts on the campaign map (the first cut of WP-W8 to W14): which mission each enemy leads to, who can go, what a
// fight changed, and healing over time. The map meets an Invader convoy, a garrison post, an Invader settlement or the
// hunters; levelFor picks the map from the contact and where it happens, and the deployment carries the conditions
// (time, weather, ground, the enemy's strength: convoy/levels/variants.js) so the fight is set up from them. Pure.
import {logEvent} from './state.js';
import {LEVELS} from '../../convoy/levels/index.js';
import {enemyCount} from '../../convoy/levels/variants.js';

/** The enemies on the map: id -> what they are, and the mission meeting them starts. */
export const SOURCES = {
  'supply-convoy': {name: 'Supply convoy', kind: 'convoy', level: 'convoy', strength: 14},
  'armoured-column': {name: 'Armoured column', kind: 'convoy', level: 'convoy', strength: 18},
  'fuel-convoy': {name: 'Fuel convoy', kind: 'convoy', level: 'convoy', strength: 9},
  'orion-patrol': {name: 'Orion garrison patrol', kind: 'post', level: 'checkpoint', strength: 24},
  'korfos-checkpoint': {name: 'Checkpoint Korfos', kind: 'post', level: 'checkpoint', strength: 12},
  raiders: {name: 'Raiding party', kind: 'hunters', level: 'cave', strength: 31},
};
/** What each kind of contact is called on the encounter panel, and what the band does there. */
export const ACTIONS = {
  convoy: {mission: 'Convoy ambush', verb: 'Ambush the convoy'},
  post: {mission: 'Checkpoint assault', verb: 'Attack the post'},
  hunters: {mission: 'Defence', verb: 'Stand and fight'},
  settlement: {mission: 'Raid', verb: 'Raid the settlement'},
};
/** The mission's own name, for the encounter panel. */
export const missionName = level => LEVELS[level]?.title || level;

/**
 * Which map a meeting is fought on: a convoy in forest or mountains on the forest road, otherwise in the valley; a
 * post at its checkpoint; a village raided street by street, a town or the base by its walled compound; hunters at
 * the cave when they catch the band near its camp, on a bare hilltop anywhere else.
 */
export function levelFor(source, {ground = 'plain', nearCamp = false} = {}) {
  if (source.kind === 'convoy') return ground === 'forest' || ground === 'mountain' || ground === 'steep' ? 'forest-road' : 'convoy';
  if (source.kind === 'hunters') return nearCamp ? 'cave' : 'hilltop';
  if (source.kind === 'settlement') return source.settlementKind === 'village' ? 'village' : 'compound';
  return source.level;
}
/** The ground of the fight from the map's ground under the band (shared/campaign/nav.js names). */
const GROUND_LOOK = {plain: 'plain', road: 'plain', forest: 'forest', mountain: 'mountain', steep: 'mountain', snow: 'snow', sea: 'coast'};
/** The most fighters a mission takes (the levels have three rebel slots). */
export const SQUAD_MAX = 3;

/** A settlement as a contact: Invader settlements can be raided; their garrison is the enemy's strength. */
export const settlementSource = s => ({
  name: s.name,
  kind: 'settlement',
  level: 'compound',
  strength: s.garrison + s.militia,
  settlement: s.id,
  settlementKind: s.kind,
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
export function encounterFor(c, sourceId, source = SOURCES[sourceId], {ground = null, nearCamp = false} = {}) {
  const n = c.settled.length + 1;
  const id = `${sourceId}-${n}-d${c.world.clock.day}`;
  let seed = c.seed * 7919 + n * 104729;
  for (const ch of sourceId) seed = (seed * 31 + ch.charCodeAt(0)) % 2147483647;
  const level = levelFor(source, {ground: ground || 'plain', nearCamp});
  const h = c.world.clock.hour;
  const time = h < 5 || h >= 21 ? 'night' : h < 7 || h >= 18 ? 'dusk' : 'day';
  const w = ((seed >>> 3) % 100) / 100; // the weather of the day, from the meeting's seed
  const weather = w < 0.14 ? 'fog' : w < 0.28 ? 'rain' : 'clear';
  // the enemy the level fields, scaled to the party actually met
  const base = enemyCount(LEVELS[level]) || source.strength;
  const strength = Math.round(Math.min(1.6, Math.max(0.6, source.strength / base)) * 100) / 100;
  return {
    id,
    level,
    seed,
    fighters: fitFighters(c),
    source: sourceId,
    enemy: {name: source.name, kind: source.kind, strength: source.strength, settlement: source.settlement || null},
    ground,
    time,
    variant: {time, weather, ground: GROUND_LOOK[ground] || 'plain', strength},
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
