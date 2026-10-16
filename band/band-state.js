// Where the Rebel Band keeps its state (WP-W15). Opened from the campaign map (`?campaign=<id>`), it works on the
// campaign save (shared/campaign/state.js): the band's troop stacks, its leader, the stash of stolen kit and the named
// fighters you deploy. A promotion here is a promotion on the map and in the next mission. Opened on its own it is
// the standalone demo with its own save (`parp-band-v2`), its practice raids and its reset. Pure apart from storage.
import {createStore, BAND_KEY} from '../shared/campaign/state.js';
import {settleAbandoned} from '../shared/campaign/encounter.js';
import {showStale} from '../shared/campaign/stale-notice.js';
import {canPromote, missingFor, promote, progress} from '../convoy/progression.js';
import {TROOPS, LEADER, START_BAND, START_STASH} from './troops.js';

/** A fresh standalone band. */
export const freshBand = () => ({band: structuredClone(START_BAND), stash: {...START_STASH}, leader: structuredClone(LEADER), raids: 0});

/**
 * Open the band: {S, campaign, save(S), mode}. In campaign mode S.band, S.stash and S.leader are the campaign's own
 * (replaced objects are written back on save), S.fighters are its named fighters and S.raids its missions played.
 */
export function openBand(params, storage) {
  if (params.has('campaign')) {
    const store = createStore(storage, {onConflict: showStale});
    const c = store.load().campaign;
    store.watch(c); // WP-W24: another tab's save makes this one stale
    // as the map does on opening: a mission entered and never finished is withdrawn and settled
    const settledNow = settleAbandoned(c);
    const S = {band: c.band.troops, stash: c.stash, leader: c.band.leader, fighters: c.band.fighters, raids: missionsPlayed(c)};
    const save = s => {
      c.band.troops = s.band;
      c.band.leader = s.leader;
      c.stash = s.stash;
      return store.save(c);
    };
    if (settledNow) save(S);
    return {
      S,
      campaign: c,
      save,
      mode: 'campaign',
      get stale() {
        return store.stale; // another tab saved this campaign: nothing more is written from here (WP-W24)
      },
    };
  }
  let S = freshBand();
  try {
    const saved = JSON.parse(storage?.getItem(BAND_KEY) || 'null');
    if (saved?.band && saved?.stash && Object.keys(saved.band).every(id => TROOPS[id])) S = {...freshBand(), ...saved};
  } catch {}
  const save = s => {
    try {
      storage?.setItem(BAND_KEY, JSON.stringify(s));
      return true;
    } catch {
      return false;
    }
  };
  return {S, campaign: null, save, mode: 'standalone'};
}

const missionsPlayed = c => Object.values(c.record || {}).reduce((n, r) => n + (r.played || 0), 0);

// ---------- the named fighters: promoted one at a time with their own experience (convoy/progression.js rules) ----------
const asSquad = (S, id) => ({classes: {[id]: S.fighters[id].class}, xp: {[id]: S.fighters[id].xp}, stash: S.stash});

/** How far fighter `id` is to the next step: {xp, need, frac}. */
export const fighterProgress = (S, id) => progress(asSquad(S, id), id);

/** Equipment class `to` needs that the stash lacks: [[gear id, short by]]. */
export const fighterMissing = (S, to) => missingFor({stash: S.stash}, to);

/** Can fighter `id` step up to `to` now (experience and kit)? */
export const canPromoteFighter = (S, id, to) => canPromote(asSquad(S, id), id, to);

/** Promote fighter `id` to `to`: spends the class's experience and the new class's kit. Returns false if it cannot. */
export function promoteFighter(S, id, to) {
  const next = promote(asSquad(S, id), id, to);
  if (!next) return false;
  S.fighters[id].class = to;
  S.fighters[id].xp = next.xp[id];
  S.stash = next.stash;
  return true;
}
