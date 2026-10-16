// The campaign save in browser storage, one writer at a time (WP-W1, W24). `load()` returns {campaign, status}:
// 'loaded', 'migrated' (built from the older saves, which are left in place for the standalone modules), 'new', or
// 'recovered' (the stored save was unreadable; its raw text is kept under `<key>-corrupt` and a fresh one starts).
// Every save carries a revision. A tab writes only over the revision it loaded: if another tab saved in between, the
// write is refused, the store is `stale` and `onConflict` is called (the page tells the player to reload), so two
// tabs can never both settle a mission or overwrite each other's progress. `watch()` notices another tab's save as it
// happens. Pure apart from the storage given (and `addEventListener` for watch).
import {normalize, newCampaign, migrate, CAMPAIGN_KEY, BAND_KEY} from './state.js';
import {SQUAD_KEY} from '../../convoy/progression.js';

/** The revision stored under `raw` (0 for none, or for a save from before revisions). */
function revOf(raw) {
  if (raw === null) return null;
  try {
    return Number(JSON.parse(raw)?.rev) || 0;
  } catch {
    return 0; // unreadable: load() recovers it; a save writes over it
  }
}

export function createStore(storage, {key = CAMPAIGN_KEY, now = () => Date.now(), onConflict = () => {}} = {}) {
  const read = k => {
    try {
      return storage?.getItem(k) ?? null;
    } catch {
      return null;
    }
  };
  const write = (k, v) => {
    try {
      if (!storage) return false;
      storage.setItem(k, v);
      return true;
    } catch {
      return false; // full or blocked storage: the campaign keeps running in memory
    }
  };
  const store = {
    key,
    /** True once another tab has saved over what this one loaded: this tab must reload before it writes. */
    stale: false,
    load(opts = {}) {
      const raw = read(key);
      if (raw !== null) {
        try {
          return {campaign: normalize(raw), status: 'loaded'};
        } catch {
          write(key + '-corrupt', raw);
          return {campaign: newCampaign({now: now(), ...opts}), status: 'recovered'};
        }
      }
      const squad = read(SQUAD_KEY),
        band = read(BAND_KEY);
      const campaign = migrate({squad, band}, {now: now(), ...opts});
      return {campaign, status: campaign.migratedFrom.length ? 'migrated' : 'new'};
    },
    /** Stamp the time and write, a revision on; false (and stale) if another tab saved since this one loaded. */
    save(campaign) {
      const stored = revOf(read(key));
      if (store.stale || (stored !== null && stored !== (campaign.rev || 0))) {
        if (!store.stale) {
          store.stale = true;
          onConflict();
        }
        return false;
      }
      campaign.saved = now();
      campaign.rev = (campaign.rev || 0) + 1;
      const ok = write(key, JSON.stringify(campaign));
      if (!ok) campaign.rev--; // not written: the stored revision is still the old one
      return ok;
    },
    /** Notice another tab's save as it happens (the storage event): this tab is stale at once. */
    watch(campaign) {
      if (typeof addEventListener !== 'function') return store;
      addEventListener('storage', e => {
        if (e.key !== key || store.stale || e.newValue === null) return;
        if (revOf(e.newValue) !== (campaign.rev || 0)) {
          store.stale = true;
          onConflict();
        }
      });
      return store;
    },
    clear() {
      try {
        storage?.removeItem(key);
      } catch {}
    },
  };
  return store;
}
