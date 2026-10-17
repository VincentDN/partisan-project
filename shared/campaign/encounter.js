// The mission bridge (WP-W2): the one place the campaign and the missions meet. The map writes a deployment into the
// campaign save (the encounter, the level, the seed, the fighters and the kit they carry, taken out of the stash);
// the mission page reads it, plays the level and writes one result; settling applies that result exactly once,
// keyed on the encounter id. A mission left without a result (a refresh, a closed tab) settles as withdrawn: the
// fighters come back wounded, their kit with them, nothing taken. Pure, no DOM. docs/campaign-roadmap.md §5.
import {SQUAD_MAX} from '../../convoy/roster.js';
import {GEAR} from '../../band/troops.js';
import {logEvent} from './state.js';
import {cargoTaken, recordIn} from './cargo.js';

export const OUTCOMES = ['won', 'lost', 'withdrawn'];
/** Campaign hours a fighter needs to heal: hurt, or carried off after going down. */
export const HEAL_WOUNDED = 24,
  HEAL_DOWN = 48;
const isObj = o => !!o && typeof o === 'object' && !Array.isArray(o);
const isKit = k => isObj(k) && (k.primary === null || isObj(k.primary)) && isObj(k.pockets);
const count = n => (Number.isFinite(n) && n >= 1 ? Math.floor(n) : 0);

/**
 * Launch an encounter: writes c.deployment and reserves its kit (it leaves the stash and travels on the fighters).
 * opts: {id, level, seed, fighters: [fighter ids], kit: {gear id: n}, enemy?, ground?, time?, source?, cargo?}; cargo:
 * the convoy's manifest (shared/campaign/cargo.js), taken home on a win; at: {x, z} where on the map it happens (the
 * aftermath is left there, WP-W13); spend: {gear id: n} the plan uses up (a road charge, WP-W9), not returned.
 * Throws when a mission is already under way, a fighter is unknown or wounded, or the stash lacks the kit.
 */
export function deploy(
  c,
  {
    id,
    level,
    seed = 1,
    fighters,
    kit = {},
    enemy = null,
    ground = null,
    time = null,
    source = null,
    variant = null,
    cargo = null,
    at = null,
    spend = {},
  },
) {
  if (c.deployment) throw new Error(`a mission is already under way (${c.deployment.id})`);
  if (typeof id !== 'string' || !id) throw new Error('an encounter needs an id');
  if (c.settled.includes(id)) throw new Error(`encounter ${id} was already fought`);
  if (!Array.isArray(fighters) || !fighters.length) throw new Error('deploy at least one fighter');
  if (level === 'roadblock' && (fighters.length < 2 || fighters.length > 4)) throw new Error('Roadblocks need two to four fit fighters');
  if (fighters.length > SQUAD_MAX || new Set(fighters).size !== fighters.length) throw new Error('deploy up to nine distinct fighters');
  for (const f of fighters) {
    if (!c.band.fighters[f]) throw new Error(`no fighter ${f}`);
    if (c.band.fighters[f].wounded) throw new Error(`${f} is wounded`);
  }
  const reserved = {};
  for (const [g, n] of Object.entries(kit)) {
    if (!GEAR[g] || !count(n)) continue;
    if ((c.stash[g] || 0) < count(n)) throw new Error(`the stash has ${c.stash[g] || 0} ${g}, not ${count(n)}`);
    reserved[g] = count(n);
  }
  // what the plan uses up (a road charge, WP-W9): taken now and not returned at settling
  const spent = {};
  for (const [g, n] of Object.entries(spend || {})) {
    if (!GEAR[g] || !count(n)) continue;
    if ((c.stash[g] || 0) - (reserved[g] || 0) < count(n)) throw new Error(`the stash has no ${g} to spare`);
    spent[g] = count(n);
  }
  for (const [g, n] of Object.entries(spent)) {
    c.stash[g] -= n;
    if (!c.stash[g]) delete c.stash[g];
  }
  for (const [g, n] of Object.entries(reserved)) {
    c.stash[g] -= n;
    if (!c.stash[g]) delete c.stash[g];
  }
  // each fighter's grid kit travels with them (null: one is issued in the mission); it is theirs again at settling
  const kits = {};
  for (const f of fighters) {
    kits[f] = c.band.fighters[f].kit || null;
    c.band.fighters[f].kit = null;
  }
  c.deployment = {
    id,
    kits,
    level,
    seed,
    fighters: [...fighters],
    kit: reserved,
    enemy,
    ground,
    time,
    source,
    variant,
    cargo: cargo && typeof cargo === 'object' ? {...cargo} : null,
    at: at && Number.isFinite(at.x) && Number.isFinite(at.z) ? {x: at.x, z: at.z} : null,
    spent,
    entered: false,
    result: null,
  };
  logEvent(c, {kind: 'deploy', encounter: id, level, fighters: [...fighters], source});
  return c;
}

/**
 * The mission page opens the deployment. Returns what it should do:
 *  'play'    the first time: it is marked entered, so a later reload is recognised;
 *  'debrief' the result is written but not settled yet (a reload on the debrief): show it again;
 *  'reload'  it was entered before and has no result: the mission was left, so it is withdrawn (call withdraw());
 *  'none'    there is no deployment for this encounter (already settled, or a stale link).
 */
export function enter(c, encounterId) {
  const d = c.deployment;
  if (!d || d.id !== encounterId) return 'none';
  if (d.result) return 'debrief';
  if (d.entered) return 'reload';
  d.entered = true;
  return 'play';
}

/**
 * A result, cleaned: {outcome, fighters: {id: {state: fit|wounded|down, xp, kills}}, loot: {gear: n}, cargo: {gear: n},
 * goods, ...}. cargo is what the band takes of the convoy's manifest (from the vehicles and how many burnt).
 */
export function cleanResult(d, raw) {
  const r = isObj(raw) ? raw : {};
  const outcome = OUTCOMES.includes(r.outcome) ? r.outcome : 'lost';
  const fighters = {};
  for (const f of d.fighters) {
    const x = isObj(r.fighters?.[f]) ? r.fighters[f] : {};
    fighters[f] = {
      state: ['fit', 'wounded', 'down'].includes(x.state) ? x.state : outcome === 'withdrawn' ? 'wounded' : 'fit',
      xp: Number.isFinite(x.xp) ? Math.max(0, Math.round(x.xp)) : 0,
      kills: count(x.kills),
    };
  }
  const loot = {};
  if (isObj(r.loot)) for (const [g, n] of Object.entries(r.loot)) if (GEAR[g] && count(n)) loot[g] = count(n);
  const goods = Array.isArray(r.goods) ? r.goods.filter(g => isObj(g) && typeof g.name === 'string' && Number.isFinite(g.price)) : [];
  return {
    outcome,
    enemyLosses: Object.fromEntries(
      ['garrison', 'militia'].map(kind => [kind, Math.min(count(r.enemyLosses?.[kind]), count(d.variant?.settlement?.[kind]))]),
    ),
    kitGains:
      outcome === 'withdrawn'
        ? {}
        : isObj(r.kitGains)
          ? Object.fromEntries(
              Object.entries(r.kitGains)
                .filter(([, n]) => Number.isFinite(n) && n > 0)
                .map(([slug, n]) => [slug, Math.floor(n)]),
            )
          : null,
    fighters,
    loot: outcome === 'withdrawn' ? {} : loot,
    goods: outcome === 'withdrawn' ? [] : goods,
    kills: count(r.kills),
    time: Number.isFinite(r.time) ? r.time : 0,
    destroyed: count(r.destroyed),
    vehicles: count(r.vehicles),
    cargo: cargoTaken(d.cargo, {
      outcome,
      vehicles: count(r.vehicles),
      destroyed: count(r.destroyed),
      kept: d.resolution === 'auto' ? 0.75 : 1,
    }),
    captured: !!r.captured && outcome === 'won',
    // the kits the fighters carried home, as they are after the fight (withdrawn: the ones they left with)
    kits:
      outcome === 'withdrawn' || !isObj(r.kits)
        ? {}
        : Object.fromEntries(d.fighters.filter(f => isKit(r.kits[f])).map(f => [f, r.kits[f]])),
  };
}

/** Write the mission's one result. A second write for the same encounter is ignored (returns false). */
export function writeResult(c, encounterId, raw) {
  const d = c.deployment;
  if (!d || d.id !== encounterId || d.result) return false;
  d.result = cleanResult(d, raw);
  return true;
}

/** The mission was left without a result (reload, closed tab): it is written as withdrawn. */
export function withdraw(c, encounterId) {
  return writeResult(c, encounterId, {outcome: 'withdrawn'});
}

/**
 * Apply the written result to the campaign, exactly once per encounter: experience to the fighters, wounds (a rebel
 * who went down comes home wounded), the reserved kit back to the stash, loot and goods into it, the level's record,
 * a log entry. Returns the settled result, or null when there is nothing to settle (no result yet, or done before).
 */
export function settle(c, encounterId = c.deployment?.id) {
  const d = c.deployment;
  if (!d || d.id !== encounterId || !d.result || c.settled.includes(d.id)) return null;
  const r = d.result;
  for (const [f, x] of Object.entries(r.fighters)) {
    const fighter = c.band.fighters[f];
    if (!fighter) continue;
    fighter.xp += x.xp;
    if (x.state !== 'fit') {
      fighter.wounded = true;
      fighter.healIn = Math.max(fighter.healIn || 0, x.state === 'down' ? HEAL_DOWN : HEAL_WOUNDED); // campaign hours
    }
  }
  const cargo = r.cargo || {};
  for (const bag of [d.kit, r.loot, cargo]) for (const [g, n] of Object.entries(bag)) c.stash[g] = (c.stash[g] || 0) + n;
  // where it came from (the reserved kit coming back is not new): the stash lists show it (WP-W14)
  const from = d.enemy?.name || d.source || 'a fight';
  recordIn(c, r.loot, from);
  recordIn(c, cargo, `${from}’s cargo`);
  // Grid kits: keep exactly what came home. Replacing a rifle in the field does not duplicate its old kit.
  for (const f of d.fighters) {
    const fighter = c.band.fighters[f],
      left = d.kits?.[f] || null,
      back = r.kits?.[f] || left;
    if (fighter) fighter.kit = back;
    // A changed primary is a field transfer, not permission to recreate the original kit.
  }
  c.goods.push(...r.goods);
  if (c.record[d.level] && r.outcome !== 'withdrawn') {
    c.record[d.level].played++;
    if (r.outcome === 'won') c.record[d.level].won++;
  }
  c.settled.push(d.id);
  c.deployment = null;
  logEvent(c, {
    kind: 'result',
    encounter: d.id,
    source: d.source,
    intent: d.variant?.settlement?.intent || null,
    defenders: d.variant?.settlement || null,
    enemyLosses: r.enemyLosses,
    level: d.level,
    at: d.at || null,
    outcome: r.outcome,
    resolution: d.resolution || 'played',
    kills: r.kills,
    wounded: Object.keys(r.fighters).filter(f => r.fighters[f].state !== 'fit'),
    loot: [r.loot, cargo].flatMap(Object.values).reduce((a, b) => a + b, 0) + r.goods.length,
  });
  return r;
}

/** Everything in a kit as loose items: the weapons (magazines in them), then the containers' contents. */
export function kitItems(k) {
  const out = [k.primary, k.secondary].filter(Boolean);
  for (const c of [k.rig, k.pockets, k.backpack].filter(Boolean)) {
    if (c.slug !== 'pockets') out.push(c);
    else for (const g of c.grids) out.push(...g.items.map(e => e.item));
  }
  return out;
}

/** The map, on opening: a deployment entered and never finished is withdrawn and settled. Returns that result or null. */
export function settleAbandoned(c) {
  const d = c.deployment;
  if (!d || !d.entered) return null;
  if (!d.result) withdraw(c, d.id);
  return settle(c, d.id);
}
