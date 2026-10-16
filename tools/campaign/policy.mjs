// Headless campaign policy uses real positions, legal auto-resolve, rearguards, safe-haven rest and paid promotions.
import {SETTLEMENTS, PARTY_SPOTS} from '../../map/island.js';
import {TROOPS} from '../../band/troops.js';
import {SOURCES, sourceFor, ownerOf, isGone, encounterFor, readResults, settlementSource} from '../../shared/campaign/contacts.js';
import {autoPreview, resolveAuto} from '../../shared/campaign/auto-resolve.js';
import {withdrawWithRearguard} from '../../shared/campaign/stances.js';
import {safeHaven, rest} from '../../shared/campaign/operations.js';
import {promote, missingFor} from '../../convoy/progression.js';
import {findPath, groundAt} from '../../shared/campaign/nav.js';
export const HOMES = {raiders: PARTY_SPOTS.raiders, 'orion-hunters': PARTY_SPOTS.column};
export const elapsed = c => (c.world.clock.day - 1) * 24 + c.world.clock.hour - 8;
export const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export function contacts(c, world) {
  const out = [];
  for (const [id, source] of Object.entries(SOURCES)) {
    if (isGone(c, id)) continue;
    const at =
      source.kind === 'convoy'
        ? world.convoy(id)?.[0]
        : source.kind === 'hunters'
          ? c.world.hunters[id]
          : id === 'orion-patrol'
            ? {x: PARTY_SPOTS.orion[0], z: PARTY_SPOTS.orion[1]}
            : {x: PARTY_SPOTS.korfos[0], z: PARTY_SPOTS.korfos[1]};
    if (at && Number.isFinite(at.x)) out.push({id, source: sourceFor(c, id), at, radius: 12});
  }
  for (const s of SETTLEMENTS) if (ownerOf(c, s) === 'invader') out.push({id: s.id, source: settlementSource(s, c), at: s, radius: 22});
  return out;
}
export function promoteAtHaven(c) {
  if (!safeHaven(c, SETTLEMENTS)) return 0;
  let n = 0;
  for (const [id, f] of Object.entries(c.band.fighters)) {
    if (f.wounded) continue;
    const squad = {classes: {[id]: f.class}, xp: {[id]: f.xp}, stash: c.stash};
    for (const to of TROOPS[f.class].to) {
      const next = promote(squad, id, to);
      if (!next) continue;
      f.class = next.classes[id];
      f.xp = next.xp[id];
      c.stash = next.stash;
      n++;
      break;
    }
  }
  return n;
}
export function act({c, world, nav, metrics, policy, remember, stepHours, horizon}) {
  const at = c.world.party,
    now = elapsed(c),
    fit = Object.entries(c.band.fighters)
      .filter(([, f]) => !f.wounded)
      .map(([id]) => id);
  const all = contacts(c, world);
  // Leave suppresses the same contact until the band is 34 map units away, as on the map UI.
  for (const id of remember.ignored) {
    const contact = all.find(p => p.id === id);
    if (!contact || distance(at, contact.at) >= 34) remember.ignored.delete(id);
  }
  for (const p of all) {
    if (distance(at, p.at) >= p.radius || remember.ignored.has(p.id)) continue;
    remember.ignored.add(p.id);
    metrics.contacts++;
    metrics.firstEncounterHours ??= now;
    if (p.source.kind === 'hunters' && c.world.hunters[p.id]?.hunting) {
      if (fit.length) {
        withdrawWithRearguard(c, p.id, fit[fit.length - 1], HOMES[p.id]);
        metrics.rearguards++;
        return;
      }
      metrics.blockedDefence = true;
      return; // A forced tactical defence cannot be legally auto-resolved.
    }
    const e = encounterFor(c, p.id, p.source, {ground: groundAt(nav, at.x, at.z)});
    if (!autoPreview(c, e).eligible) {
      metrics.declined++;
      continue;
    }
    const {result} = resolveAuto(c, {...e, at: {x: at.x, z: at.z}});
    readResults(c, {}, {settlements: SETTLEMENTS});
    metrics.autoFights++;
    metrics.firstAutoHours ??= now;
    metrics.wins += result.outcome === 'won' ? 1 : 0;
    metrics.wounded += Object.values(result.fighters).filter(f => f.state !== 'fit').length;
    return;
  }
  const promoted = promoteAtHaven(c);
  metrics.promotions += promoted;
  if (promoted) metrics.firstPromotionHours ??= now;
  const needsRest = fit.length < (policy === 'early-rest' ? 8 : 6);
  if (needsRest && safeHaven(c, SETTLEMENTS) && now + 12 <= horizon) {
    at.route = null;
    rest(c, SETTLEMENTS, 12, h => stepHours(h).healed);
    metrics.rests++;
    return;
  }
  // Replan once per campaign hour for a moving convoy. Otherwise retain the real A* route.
  if (at.route && now < remember.nextPlan) return;
  remember.nextPlan = now + 1;
  const haven = SETTLEMENTS.filter(s => ownerOf(c, s) !== 'invader').sort((a, b) => distance(at, a) - distance(at, b))[0];
  const candidates = needsRest
    ? []
    : all
        .filter(p => !remember.ignored.has(p.id) && autoPreview(c, encounterFor(c, p.id, p.source)).eligible)
        .sort((a, b) => distance(at, a.at) - distance(at, b.at));
  const goal = candidates[0]?.at || haven;
  if (!goal) return;
  if (distance(at, goal) < 4) {
    at.route = null;
    return;
  }
  const path = findPath(nav, at, goal);
  if (path) at.route = {points: path.points, leg: 1};
  else metrics.unreachablePlans++;
}

/** Explain stalls without inventing XP or equipment: ready means both costs can be paid, before wound checks. */
export function promotionBarriers(c) {
  const out = {xpReady: 0, gearReady: 0, ready: 0, maxXp: 0};
  for (const f of Object.values(c.band.fighters)) {
    const t = TROOPS[f.class];
    if (!t.to.length) continue;
    const xp = f.xp >= t.xp,
      gear = t.to.some(to => !missingFor({stash: c.stash}, to).length);
    out.xpReady += Number(xp);
    out.gearReady += Number(gear);
    out.ready += Number(xp && gear);
    out.maxXp = Math.max(out.maxXp, f.xp);
  }
  return out;
}
