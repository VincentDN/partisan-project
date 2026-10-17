// One deterministic strategic campaign; no synthetic wins, loot, XP or forced resolution of forbidden missions.
import {carried} from './inventory.mjs';
import {newCampaign, normalize} from '../../shared/campaign/state.js';
import {createWorld, HOURS_PER_SECOND} from '../../shared/campaign/world.js';
import {buildNav} from '../../shared/campaign/nav.js';
import {PARTY_SPOTS} from '../../map/island.js';
import {response} from '../../shared/campaign/response.js';
import {act, HOMES, elapsed, promotionBarriers} from './policy.mjs';
let cachedNav;
const count = c => Object.values(c.stash).reduce((a, n) => a + n, 0);
export function simulate({seed, days = 14, policy = 'standard', reloadEveryHours = 24} = {}) {
  if (
    !Number.isSafeInteger(seed) ||
    seed < 1 ||
    !Number.isFinite(days) ||
    days <= 0 ||
    days > 365 ||
    !['standard', 'early-rest'].includes(policy)
  )
    throw Error('Invalid campaign simulation options');
  const nav = (cachedNav ||= buildNav());
  let c = newCampaign({seed, id: `bench-${seed}`});
  c.world.party = {x: PARTY_SPOTS.player[0], z: PARTY_SPOTS.player[1], route: null};
  const makeWorld = () => createWorld(c, {nav, hunters: HOMES, vehicles: {'supply-convoy': 3, 'fuel-convoy': 2, 'armoured-column': 4}});
  let world = makeWorld(),
    nextReload = reloadEveryHours || Infinity;
  const metrics = {
    seed,
    firstEncounterHours: null,
    firstAutoHours: null,
    firstPromotionHours: null,
    contacts: 0,
    autoFights: 0,
    wins: 0,
    wounded: 0,
    promotions: 0,
    hunts: 0,
    rearguards: 0,
    rests: 0,
    declined: 0,
    unreachablePlans: 0,
    blockedDefence: false,
    stashStart: count(c),
    carriedStart: carried(c),
    autoAmmoSpent: 0,
  };
  const remember = {ignored: new Set(), nextPlan: 0},
    horizon = days * 24;
  function stepHours(hours) {
    const step = world.step(hours / HOURS_PER_SECOND);
    metrics.hunts += step.hunts.filter(h => h.event === 'spotted').length;
    return step;
  }
  while (elapsed(c) < horizon - 1e-7 && !metrics.blockedDefence) {
    act({c, world, nav, metrics, policy, remember, stepHours, horizon});
    if (metrics.blockedDefence) break;
    // 0.1 map second: the same fixed world tick, sampled for contacts on every step.
    if (elapsed(c) < horizon - 1e-7) stepHours(Math.min(0.06, horizon - elapsed(c)));
    if (elapsed(c) >= nextReload) {
      c = normalize(JSON.stringify(c));
      world = makeWorld();
      nextReload += reloadEveryHours;
    }
  }
  const duration = elapsed(c),
    round = n => Math.round(n * 1000) / 1000;
  return {
    ...metrics,
    promotionBarriers: promotionBarriers(c),
    elapsedHours: round(duration),
    huntsPerDay: round(metrics.hunts / (duration / 24)),
    stashEnd: count(c),
    carriedEnd: carried(c),
    stashGrowth: count(c) - metrics.stashStart,
    goodsEnd: c.goods.length,
    responseTier: response(c).tier,
    firstEncounterHours: metrics.firstEncounterHours === null ? null : round(metrics.firstEncounterHours),
    firstAutoHours: metrics.firstAutoHours === null ? null : round(metrics.firstAutoHours),
    firstPromotionHours: metrics.firstPromotionHours === null ? null : round(metrics.firstPromotionHours),
    simulatedMapSeconds: round(duration / HOURS_PER_SECOND),
    state: c,
  };
}
