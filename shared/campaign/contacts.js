// Contacts on the campaign map (the first cut of WP-W8 to W14): which mission each enemy leads to, who can go, what a
// fight changed, and healing over time. The map meets an Invader convoy, a garrison post, an Invader settlement or the
// hunters; levelFor picks the map from the contact and where it happens, and the deployment carries the conditions
// (time, weather, ground, the enemy's strength: convoy/levels/variants.js) so the fight is set up from them. Pure.
import {logEvent} from './state.js';
import {LEVELS} from '../../convoy/levels/index.js';
import {enemyCount} from '../../convoy/levels/variants.js';
import {manifestFor} from './cargo.js';
import {isOverrun, overrun} from './defence.js';
import {counterSource, COUNTER_DELAY} from './territory.js';
import {alert} from './hunt.js';

/** The enemies on the map: id -> what they are, and the mission meeting them starts. */
export const SOURCES = {
  // a convoy's vehicles (map models, in column order) are the ones the ambush fields (convoy/levels/columns.js, WP-W9)
  'supply-convoy': {name: 'Supply convoy', kind: 'convoy', level: 'convoy', strength: 14, vehicles: ['matv', 'truck', 'truck']},
  'armoured-column': {
    name: 'Armoured column',
    kind: 'convoy',
    level: 'convoy',
    strength: 18,
    vehicles: ['humvee', 'matv', 'truck', 'humvee'],
  },
  'fuel-convoy': {name: 'Fuel convoy', kind: 'convoy', level: 'convoy', strength: 9, vehicles: ['matv', 'truck']},
  'orion-patrol': {name: 'Orion garrison patrol', kind: 'post', patrol: true, level: 'checkpoint', strength: 24},
  'korfos-checkpoint': {name: 'Checkpoint Korfos', kind: 'post', level: 'checkpoint', strength: 12},
  raiders: {name: 'Raiding party', kind: 'hunters', level: 'cave', strength: 31},
  // turned out by heat 50 (hunt.js, WP-W7)
  'orion-hunters': {name: 'Orion hunter column', kind: 'hunters', level: 'hilltop', strength: 26},
};
/** What each kind of contact is called on the encounter panel, and what the band does there. */
export const ACTIONS = {
  counterattack: {mission: 'Settlement defence', verb: 'Defend against the counterattack'},
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
/** The maximum deployed roster; each mission places these identities at its insertion. */
import {SQUAD_MAX} from '../../convoy/roster.js';
export {SQUAD_MAX};

/** A settlement as a contact: Invader settlements can be raided; their garrison is the enemy's strength. */
export const settlementSource = (s, c = null) => ({
  name: s.name,
  kind: 'settlement',
  level: 'compound',
  strength: (c?.world.settlements[s.id]?.garrison ?? s.garrison) + (c?.world.settlements[s.id]?.militia ?? s.militia), // as resupplied by convoys (WP-W6)
  settlement: s.id,
  settlementKind: s.kind,
  garrison: c?.world.settlements[s.id]?.garrison ?? s.garrison,
  militia: c?.world.settlements[s.id]?.militia ?? s.militia,
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
  // a convoy fields its own column and escort (convoy/levels/columns.js): no scaling on top of that
  const column = source.vehicles ? {vehicles: [...source.vehicles], escort: source.strength} : null;
  const convoyVariant = column ? {convoy: column, ambush: 'roadblock', name: source.name} : {};
  const strength = column ? 1 : Math.round(Math.min(1.6, Math.max(0.6, source.strength / base)) * 100) / 100;
  return {
    id,
    level,
    seed,
    fighters: fitFighters(c),
    source: sourceId,
    enemy: {
      name: source.name,
      kind: source.kind,
      strength: source.strength,
      settlement: source.settlement || null,
      patrol: !!source.patrol,
    },
    ground,
    time,
    variant: {
      time,
      weather,
      ground: GROUND_LOOK[ground] || 'plain',
      strength,
      ...convoyVariant,
      ...(source.kind === 'counterattack' ? {counterattack: source.strength} : {}),
      ...(source.kind === 'settlement'
        ? {
            settlement: {
              garrison: source.garrison ?? source.strength,
              militia: source.militia || 0,
              name: source.name,
              kind: source.settlementKind,
              intent: 'capture',
            },
          }
        : {}),
    },
    cargo: manifestFor(sourceId), // a convoy's manifest (shared/campaign/cargo.js); null for anything else
  };
}

/**
 * Apply what the log says happened since the map last looked (mission results settled by the mission page): a won
 * fight destroys the enemy party; a won raid takes the settlement for the Resistance. Returns one line per result
 * for the map to show, and marks them seen. `names`: settlement id -> name, for raids.
 */
export function readResults(c, names = {}, {settlements = null} = {}) {
  const lines = [];
  pruneAftermath(c);
  for (const e of c.log.filter(e => e.seq > c.world.seen)) {
    if (e.kind !== 'result') continue;
    const src = SOURCES[e.source] || counterSource(c, e.source);
    const name = src?.name || names[e.source] || e.source || 'the enemy';
    if (e.defenders && e.source) {
      const state = (c.world.settlements[e.source] ||= {});
      for (const kind of ['garrison', 'militia'])
        state[kind] = Math.max(0, (state[kind] ?? e.defenders[kind] ?? 0) - (e.enemyLosses?.[kind] || 0));
    }
    if (src?.kind === 'counterattack') {
      const a = c.world.counterattacks[src.target];
      if (e.outcome === 'won') a.state = 'defeated';
      else {
        // A failed defence leaves the settlement to the attackers, even if the band remains nearby.
        const s = c.world.settlements[src.target];
        Object.assign(s, {owner: 'invader', garrison: a.strength, militia: 0});
        delete s.counterAt;
        a.state = 'retaken';
        c.world.parties = c.world.parties.filter(p => p.id !== src.target);
      }
    }
    alert(c, e.at); // every fight tells the hunter columns where the band was (hunt.js, WP-W7)
    if (e.outcome === 'won' && e.source) {
      c.world.heat = Math.min(100, c.world.heat + 10);
      if ((src || e.intent !== 'raid') && !isGone(c, e.source))
        c.world.parties.push({id: e.source, state: 'destroyed', day: e.day, hour: e.hour ?? 0});
      // what the fight left on the map: wrecks and smoke where a convoy died, smoke over a taken place (WP-W13)
      if (Number.isFinite(e.at?.x) && Number.isFinite(e.at?.z)) {
        const kind = src?.kind === 'convoy' ? 'wreck' : src ? 'fight' : 'raid';
        (c.world.aftermath ||= []).push({id: e.source, kind, x: e.at.x, z: e.at.z, day: e.day, hour: e.hour ?? 0});
      }
      if (!src && e.intent !== 'raid') {
        delete c.world.counterattacks[e.source];
        c.world.settlements[e.source] = {
          ...c.world.settlements[e.source],
          owner: 'resistance',
          garrison: 0,
          militia: 0,
          taken: e.day,
          counterAt: e.day * 24 + (e.hour || 0) + COUNTER_DELAY,
        };
      }
    }
    // a lost defence of the camp: TAC-K-03 (shared/campaign/defence.js, WP-W11)
    if (settlements && isOverrun(c, e, settlements)) {
      const o = overrun(c, settlements);
      const lost = Object.values(o.lost).reduce((a, b) => a + b, 0);
      lines.push(
        `${name} overran ${o.from.name}: ${lost} item${lost === 1 ? '' : 's'} of the stash${o.troops ? ` and ${o.troops} troops` : ''} lost. ` +
          (o.to ? `The band fell back to ${o.to.name}; the new camp needs three days. ` : 'There is nowhere left to fall back to. ') +
          'The Invader thinks it has won: the heat halves.',
      );
      continue;
    }
    const hurt = e.wounded?.length ? `, ${e.wounded.length} wounded` : '';
    const loot = e.loot ? `, ${e.loot} item${e.loot === 1 ? '' : 's'} taken` : '';
    lines.push(
      e.outcome === 'won'
        ? `${name}: ${src ? 'destroyed' : e.intent === 'raid' ? 'raided for supplies' : 'taken for the Resistance'}${loot}${hurt}.`
        : e.outcome === 'withdrawn'
          ? `${name}: the band fell back. The fighters are wounded.`
          : `${name}: the attack failed${hurt}.`,
    );
  }
  c.world.seen = c.log.at(-1)?.seq ?? c.world.seen;
  return lines;
}

// ---------- aftermath (WP-W13) ----------
/** Campaign hours the marks of a fight stay on the map: the smoke thins over two days, the wrecks over two weeks. */
export const SMOKE_HOURS = 48,
  AFTERMATH_HOURS = 14 * 24;
/** How many campaign hours ago a mark was left. */
export const ageOf = (c, a) => (c.world.clock.day - a.day) * 24 + (c.world.clock.hour - (a.hour || 0));
/** Drop marks older than AFTERMATH_HOURS. */
export function pruneAftermath(c) {
  if (c.world.aftermath) c.world.aftermath = c.world.aftermath.filter(a => ageOf(c, a) < AFTERMATH_HOURS);
  return c.world.aftermath || [];
}
/** What a mark looks like now: smoke 1..0 over SMOKE_HOURS, the wreck and scorch 1..0 over AFTERMATH_HOURS. */
export function aftermathLook(c, a) {
  const age = Math.max(0, ageOf(c, a));
  return {smoke: Math.max(0, 1 - age / SMOKE_HOURS), remains: Math.max(0, 1 - age / AFTERMATH_HOURS)};
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
