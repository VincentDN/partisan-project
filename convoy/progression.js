// Partisan Tactical campaign: the squad's named rebels earn experience and loot in missions and are promoted along the
// Rebel Band class tree (band/troops.js). A promotion costs the experience of the class it leaves (`xp`) and the
// equipment the new class carries (`needs`, from the stash). The loot (convoy/loot.js) fills the stash; trade goods are
// sold for scrip and scrip buys equipment. Pure (no DOM): the page keeps the campaign in localStorage (SQUAD_KEY).
import {TROOPS, GEAR} from '../band/troops.js';
import {MISSIONS} from './levels/index.js';
import {DEFAULT_SQUAD} from './abilities.js';
import {difficulty} from './difficulty.js';

export const SQUAD_KEY = 'parp-squad-v1';
export const XP_PAY = {kill: 12, objective: 25, survived: 20, won: 40};

/** What the squad starts with: enough for one first step out of Insurgent, and a little scrip. */
export const START_STASH = {vest: 1, helmet: 1, binoculars: 1};
export const START_SCRIP = 20;

/**
 * A fresh campaign: {classes: {id: class}, xp: {id: n}, missions, stash: {gear id: n}, goods: [trade goods], scrip,
 * record: {level id: {played, won}}, log: [the last missions: {level, outcome, difficulty, loot: [names]}]}.
 */
export const newSquad = () => ({
  classes: {...DEFAULT_SQUAD},
  xp: Object.fromEntries(Object.keys(DEFAULT_SQUAD).map(id => [id, 0])),
  missions: 0,
  stash: {...START_STASH},
  goods: [],
  scrip: START_SCRIP,
  record: Object.fromEntries(MISSIONS.map(m => [m.id, {played: 0, won: 0}])),
  log: [],
});

/** A saved squad, repaired: unknown classes fall back to the defaults, missing xp to 0. */
export function loadSquad(raw) {
  const s = newSquad();
  try {
    const o = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!o) return s;
    for (const id of Object.keys(s.classes)) {
      if (TROOPS[o.classes?.[id]]) s.classes[id] = o.classes[id];
      if (Number.isFinite(o.xp?.[id])) s.xp[id] = Math.max(0, o.xp[id]);
    }
    if (Number.isFinite(o.missions)) s.missions = o.missions;
    if (o.stash && typeof o.stash === 'object')
      s.stash = Object.fromEntries(Object.entries(o.stash).filter(([g, n]) => GEAR[g] && Number.isFinite(n) && n > 0));
    if (Array.isArray(o.goods)) s.goods = o.goods.filter(g => g && typeof g.name === 'string' && Number.isFinite(g.price));
    if (Number.isFinite(o.scrip)) s.scrip = Math.max(0, o.scrip);
    for (const id of Object.keys(s.record))
      if (o.record?.[id]) s.record[id] = {played: +o.record[id].played || 0, won: +o.record[id].won || 0};
    if (Array.isArray(o.log)) s.log = o.log.slice(-12);
  } catch {
    /* a broken save starts over */
  }
  return s;
}

/**
 * Experience each rebel earned in a mission, from sim.debrief(): kills, objectives done (shared), surviving, winning,
 * scaled by difficulty. Returns {id: {total, parts: [[label, n]]}}.
 */
export function missionXp(debrief, diffId) {
  const mult = difficulty(diffId).xp,
    done = debrief.objectives.filter(o => o.state === 'done').length;
  const out = {};
  for (const r of debrief.byPartisan) {
    const parts = [];
    if (r.kills) parts.push([`${r.kills} kill${r.kills > 1 ? 's' : ''}`, r.kills * XP_PAY.kill]);
    if (done) parts.push([`${done} objective${done > 1 ? 's' : ''}`, done * XP_PAY.objective]);
    if (r.state !== 'down') parts.push(['Survived', XP_PAY.survived]);
    if (debrief.outcome === 'won') parts.push(['Victory', XP_PAY.won]);
    const total = Math.round(parts.reduce((s, [, n]) => s + n, 0) * mult);
    out[r.id] = {total, parts, mult};
  }
  return out;
}

/**
 * Add a mission's experience to the squad (a new squad object), and, when `mission` is given, its record and log
 * entry: {level, outcome, difficulty, loot: [{name, gear, rarity}]}.
 */
export function award(squad, earned, mission = null) {
  const s = {...squad, xp: {...squad.xp}, missions: squad.missions + 1};
  for (const [id, e] of Object.entries(earned)) if (id in s.xp) s.xp[id] += e.total;
  if (mission) {
    const r = squad.record?.[mission.level] || {played: 0, won: 0};
    s.record = {...squad.record, [mission.level]: {played: r.played + 1, won: r.won + (mission.outcome === 'won' ? 1 : 0)}};
    s.log = [...(squad.log || []), {...mission, n: s.missions}].slice(-12);
  }
  return s;
}

/** Equipment class `to` needs that the stash lacks: [[gear id, short by]] (empty: it can be paid for). */
export function missingFor(squad, to) {
  return Object.entries(TROOPS[to]?.needs || {})
    .map(([g, n]) => [g, n - (squad.stash?.[g] || 0)])
    .filter(([, short]) => short > 0);
}
/** Does rebel `id` have the experience to step up (`to` given: and the equipment for that class)? */
export const canPromote = (squad, id, to = null) => {
  const t = TROOPS[squad.classes[id]];
  if (!t || !t.to.length || squad.xp[id] < t.xp) return false;
  return to ? t.to.includes(to) && !missingFor(squad, to).length : true;
};
/** How far rebel `id` is to its next promotion: {xp, need, frac} (need 0 at the top of a path). */
export function progress(squad, id) {
  const t = TROOPS[squad.classes[id]];
  const need = t?.to.length ? t.xp : 0;
  return {xp: squad.xp[id], need, frac: need ? Math.min(1, squad.xp[id] / need) : 1};
}
/**
 * Promote rebel `id` to `to` (one of its class's `to`): spends the class's xp and the new class's equipment from the
 * stash. Returns the new squad, or null.
 */
export function promote(squad, id, to) {
  const t = TROOPS[squad.classes[id]];
  if (!canPromote(squad, id, to)) return null;
  const stash = {...squad.stash};
  for (const [g, n] of Object.entries(TROOPS[to].needs)) if (!(stash[g] -= n)) delete stash[g];
  return {...squad, classes: {...squad.classes, [id]: to}, xp: {...squad.xp, [id]: squad.xp[id] - t.xp}, stash};
}
