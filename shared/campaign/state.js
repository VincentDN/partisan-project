// The campaign save (WP-W1): one versioned state for the world, the band, the stash and the encounter log. Pure, no DOM.
// It replaces the separate saves of Partisan Tactical (`parp-squad-v1`, convoy/progression.js) and the Rebel Band
// (`parp-band-v2`, band/band.js), which it migrates on first load. Each module keeps its own save outside a campaign.
// Storage goes through a small adapter (any object with getItem/setItem/removeItem, localStorage in the browser), so
// IndexedDB and transactions (WP-S29) can replace it later without touching the rules. docs/campaign-roadmap.md §8.
import {TROOPS, GEAR, LEADER, START_BAND, START_STASH} from '../../band/troops.js';
import {loadSquad, newSquad, SQUAD_KEY} from '../../convoy/progression.js';

export const VERSION = 1;
export const CAMPAIGN_KEY = 'parp-campaign-v1';
export const BAND_KEY = 'parp-band-v2';
const LOG_LIMIT = 200;

const isObj = o => !!o && typeof o === 'object' && !Array.isArray(o);
const num = (v, fallback = 0, min = -Infinity) => (Number.isFinite(v) ? Math.max(min, v) : fallback);
const str = (v, fallback = '') => (typeof v === 'string' ? v : fallback);

/** Stash counts kept to known gear with whole positive counts. */
function cleanStash(o) {
  const out = {};
  if (!isObj(o)) return out;
  for (const [g, n] of Object.entries(o)) if (GEAR[g] && Number.isFinite(n) && n >= 1) out[g] = Math.floor(n);
  return out;
}

/** Band troop stacks kept to known classes: {class id: {count, xp}} (xp is the pool the class's soldiers share). */
function cleanTroops(o) {
  const out = {};
  if (!isObj(o)) return out;
  for (const [id, t] of Object.entries(o))
    if (TROOPS[id] && isObj(t) && Number.isFinite(t.count) && t.count >= 1) out[id] = {count: Math.floor(t.count), xp: num(t.xp, 0, 0)};
  return out;
}

/** The named fighters you deploy and play: {id: {class, xp, wounded}}. Starts as the three tactical rebels. */
function cleanFighters(o, fallback) {
  const out = {};
  if (isObj(o))
    for (const [id, f] of Object.entries(o))
      if (isObj(f) && TROOPS[f.class])
        out[id] = {
          class: f.class,
          xp: num(f.xp, 0, 0),
          wounded: !!f.wounded,
          healIn: f.wounded ? num(f.healIn, 24, 0) : 0,
          kit: isKit(f.kit) ? f.kit : null,
        };
  return Object.keys(out).length ? out : fallback;
}

const fightersFromSquad = squad =>
  Object.fromEntries(
    Object.keys(squad.classes).map(id => [id, {class: squad.classes[id], xp: squad.xp[id] || 0, wounded: false, healIn: 0, kit: null}]),
  );
/** A fighter's grid kit (shared/inventory/kit.js, TAC-C-11): kept as it came back from the last mission. */
const isKit = k => isObj(k) && isObj(k.primary) && isObj(k.pockets);
/** The band's armoury: a grid container of loose kit (placed by a page with the catalogue), and items not placed yet. */
export const newArmoury = () => ({uid: 'armoury', slug: 'stash', label: 'Armoury', grids: [{w: 10, h: 30, items: []}], inbox: []});
const isGrid = a => isObj(a) && Array.isArray(a.grids) && a.grids.every(g => isObj(g) && Array.isArray(g.items));

/**
 * A fresh campaign. `id` names it (deployments and results are keyed on it later, WP-W2); `seed` drives the world
 * simulation (WP-W5); `now` is a timestamp from the caller, so the module stays pure and testable.
 */
export function newCampaign({id = 'c1', seed = 1, now = 0} = {}) {
  const squad = newSquad();
  return {
    version: VERSION,
    id,
    seed,
    created: now,
    saved: now,
    world: {
      clock: {day: 1, hour: 8, speed: 0}, // speed 0 = paused (WP-W4)
      party: null, // the band's place on the map, set when the map first opens (WP-W3)
      parties: [], // Invader patrols, convoys, hunter columns (WP-W5 onward)
      settlements: {}, // per-settlement state by id: owner, garrison, heat (WP-W19)
      heat: 0,
      seen: 0, // log entries the map has already shown (it reports mission results once)
    },
    band: {
      leader: structuredClone(LEADER),
      fighters: fightersFromSquad(squad),
      troops: structuredClone(START_BAND),
    },
    stash: addCounts({...START_STASH}, squad.stash), // the band depot plus the squad's starting kit
    armoury: newArmoury(), // loose grid kit: magazines, rounds, weapons set aside (TAC-C-11)
    goods: [],
    scrip: squad.scrip,
    record: squad.record,
    deployment: null, // the mission in progress (WP-W2)
    settled: [], // encounter ids whose result was applied, so a result is settled exactly once (WP-W2)
    log: [],
    migratedFrom: [],
  };
}

function addCounts(into, from) {
  for (const [g, n] of Object.entries(from)) into[g] = (into[g] || 0) + n;
  return into;
}

/**
 * A stored campaign repaired against the current rules: unknown classes and gear are dropped, missing fields take
 * their fresh values. Throws on anything that is not a version-1 campaign object (the store treats that as corrupt).
 */
export function normalize(raw) {
  const o = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!isObj(o)) throw new Error('campaign save is not an object');
  if (o.version !== VERSION) throw new Error(`campaign save version ${o.version} is not ${VERSION}`);
  const c = newCampaign({id: str(o.id, 'c1'), seed: num(o.seed, 1), now: num(o.created, 0)});
  c.saved = num(o.saved, c.created);
  const w = isObj(o.world) ? o.world : {};
  if (isObj(w.clock)) c.world.clock = {day: num(w.clock.day, 1, 1), hour: num(w.clock.hour, 8, 0) % 24, speed: num(w.clock.speed, 0, 0)};
  if (isObj(w.party) && Number.isFinite(w.party.x) && Number.isFinite(w.party.z)) c.world.party = {...w.party};
  if (Array.isArray(w.parties)) c.world.parties = w.parties.filter(isObj);
  if (isObj(w.settlements)) c.world.settlements = w.settlements;
  c.world.heat = num(w.heat, 0, 0);
  c.world.seen = num(w.seen, 0, 0);
  const b = isObj(o.band) ? o.band : {};
  if (isObj(b.leader)) c.band.leader = {...c.band.leader, ...b.leader};
  c.band.fighters = cleanFighters(b.fighters, c.band.fighters);
  if (isObj(b.troops)) c.band.troops = cleanTroops(b.troops);
  if (isObj(o.stash)) c.stash = cleanStash(o.stash);
  if (isGrid(o.armoury))
    c.armoury = {...newArmoury(), ...o.armoury, inbox: Array.isArray(o.armoury.inbox) ? o.armoury.inbox.filter(isObj) : []};
  if (Array.isArray(o.goods)) c.goods = o.goods.filter(g => isObj(g) && typeof g.name === 'string' && Number.isFinite(g.price));
  c.scrip = num(o.scrip, c.scrip, 0);
  if (isObj(o.record))
    for (const id of Object.keys(c.record))
      if (isObj(o.record[id])) c.record[id] = {played: num(o.record[id].played, 0, 0), won: num(o.record[id].won, 0, 0)};
  c.deployment = isObj(o.deployment) ? o.deployment : null;
  if (Array.isArray(o.settled)) c.settled = o.settled.filter(s => typeof s === 'string');
  if (Array.isArray(o.log)) c.log = o.log.filter(isObj).slice(-LOG_LIMIT);
  if (Array.isArray(o.migratedFrom)) c.migratedFrom = o.migratedFrom.filter(s => typeof s === 'string');
  return c;
}

/**
 * A new campaign seeded from the older saves (raw JSON strings or null). The tactical squad brings its three rebels
 * (class and experience), scrip, trade goods, record and mission log; the Rebel Band brings its leader and troop
 * stacks. Stashes are added together: both are gear the player took. A save that does not parse is skipped.
 */
export function migrate({squad = null, band = null} = {}, opts = {}) {
  const c = newCampaign(opts);
  const from = [];
  if (squad) {
    let parsed = null;
    try {
      parsed = JSON.parse(squad);
    } catch {}
    if (isObj(parsed)) {
      const s = loadSquad(parsed);
      c.band.fighters = fightersFromSquad(s);
      c.stash = {...s.stash};
      c.goods = s.goods;
      c.scrip = s.scrip;
      c.record = s.record;
      c.log = s.log.map(e => ({kind: 'mission', ...e}));
      from.push(SQUAD_KEY);
    }
  }
  if (band) {
    let parsed = null;
    try {
      parsed = JSON.parse(band);
    } catch {}
    if (isObj(parsed) && isObj(parsed.band)) {
      c.band.troops = cleanTroops(parsed.band);
      if (isObj(parsed.leader)) c.band.leader = {...c.band.leader, ...parsed.leader};
      const stash = cleanStash(parsed.stash);
      c.stash = from.length ? addCounts(c.stash, stash) : stash;
      from.push(BAND_KEY);
    }
  }
  c.migratedFrom = from;
  return c;
}

/** Add an entry to the encounter log (kept to the last LOG_LIMIT). Returns the campaign. */
export function logEvent(c, entry) {
  c.log.push({day: c.world.clock.day, hour: c.world.clock.hour, ...entry});
  if (c.log.length > LOG_LIMIT) c.log.splice(0, c.log.length - LOG_LIMIT);
  return c;
}

/**
 * The storage adapter. `load()` returns `{campaign, status}`: status is 'loaded', 'migrated' (built from the older
 * saves, which are left in place for the standalone modules), 'new', or 'recovered' (the stored save was unreadable;
 * its raw text is kept under `<key>-corrupt` and a fresh campaign starts). `save()` stamps the time and writes.
 */
export function createStore(storage, {key = CAMPAIGN_KEY, now = () => Date.now()} = {}) {
  const read = k => {
    try {
      return storage?.getItem(k) ?? null;
    } catch {
      return null;
    }
  };
  const write = (k, v) => {
    try {
      storage?.setItem(k, v);
      return true;
    } catch {
      return false; // full or blocked storage: the campaign keeps running in memory
    }
  };
  return {
    key,
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
    save(campaign) {
      campaign.saved = now();
      return write(key, JSON.stringify(campaign));
    },
    clear() {
      try {
        storage?.removeItem(key);
      } catch {}
    },
  };
}
