// Partisan Tactical levelling: the squad's three rebels earn experience in missions and are promoted along the Rebel
// Band class tree (band/troops.js). A class's `xp` is what it costs to leave it; a promotion picks one of its `to`.
// Pure (no DOM): the page keeps the squad in localStorage (SQUAD_KEY) and shows promotions in the debrief.
import {TROOPS} from '../band/troops.js';
import {DEFAULT_SQUAD} from './abilities.js';
import {difficulty} from './difficulty.js';

export const SQUAD_KEY = 'parp-squad-v1';
export const XP_PAY = {kill: 12, objective: 25, survived: 20, won: 40};

/** A fresh squad: {classes: {id: class}, xp: {id: n}, missions: 0}. */
export const newSquad = () => ({
  classes: {...DEFAULT_SQUAD},
  xp: Object.fromEntries(Object.keys(DEFAULT_SQUAD).map(id => [id, 0])),
  missions: 0,
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

/** Add a mission's experience to the squad (a new squad object). */
export function award(squad, earned) {
  const s = {...squad, xp: {...squad.xp}, missions: squad.missions + 1};
  for (const [id, e] of Object.entries(earned)) if (id in s.xp) s.xp[id] += e.total;
  return s;
}

/** Can rebel `id` be promoted now? Needs the class's xp and a class to become. */
export const canPromote = (squad, id) => {
  const t = TROOPS[squad.classes[id]];
  return !!t && t.to.length > 0 && squad.xp[id] >= t.xp;
};
/** How far rebel `id` is to its next promotion: {xp, need, frac} (need 0 at the top of a path). */
export function progress(squad, id) {
  const t = TROOPS[squad.classes[id]];
  const need = t?.to.length ? t.xp : 0;
  return {xp: squad.xp[id], need, frac: need ? Math.min(1, squad.xp[id] / need) : 1};
}
/** Promote rebel `id` to `to` (one of its class's `to`): spends the class's xp. Returns the new squad, or null. */
export function promote(squad, id, to) {
  const t = TROOPS[squad.classes[id]];
  if (!canPromote(squad, id) || !t.to.includes(to)) return null;
  return {...squad, classes: {...squad.classes, [id]: to}, xp: {...squad.xp, [id]: squad.xp[id] - t.xp}};
}
