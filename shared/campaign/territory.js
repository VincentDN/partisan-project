// Captured territory supplies recovery and recruits; the occupier sends a saved, interceptable column to retake it.
import {SETTLEMENTS, byId} from '../../map/island.js';
import {buildNav, findPath, advance} from './nav.js';
import {logEvent} from './state.js';
const owner = (c, s) => c.world.settlements[s.id]?.owner || s.faction;
const hours = c => c.world.clock.day * 24 + c.world.clock.hour;
let fallbackNav;
export const COUNTER_DELAY = 24;

export function counterSource(c, id) {
  const a = Object.values(c.world.counterattacks || {}).find(a => a.id === id && ['marching', 'besieging'].includes(a.state));
  if (!a || !byId(a.target)) return null;
  return {name: `${byId(a.target).name} counterattack`, kind: 'counterattack', level: 'hilltop', strength: a.strength, target: a.target};
}

/** Weekly food and volunteers belong to the settlement, not to repeated visits or captures. */
export function provisions(c, s) {
  const state = (c.world.settlements[s.id] ||= {});
  const week = Math.floor((c.world.clock.day - 1) / 7);
  if (!state.provisions || state.provisions.week !== week)
    state.provisions = {
      week,
      food: owner(c, s) === 'resistance' ? 4 : 0,
      recruits: owner(c, s) === 'resistance' && s.kind === 'village' ? 2 : 0,
    };
  return state.provisions;
}
export function mealBonus(c, s, hoursRested) {
  if (owner(c, s) === 'invader' || s.kind === 'camp') return 0;
  const stock = provisions(c, s),
    meals = Math.min(stock.food, Math.floor(hoursRested / 12));
  stock.food -= meals;
  return meals * 6; // six additional hours of wound recovery per meal; world time is unchanged
}

/** Fixed-step movement. A band present at the target can fight; an undefended seat falls after a six-hour siege. */
export function stepTerritory(c, {dt, nav = null, party = c.world.party} = {}) {
  const events = [],
    now = hours(c);
  c.world.counterattacks ||= {};
  for (const s of SETTLEMENTS) {
    const state = c.world.settlements[s.id];
    if (!state || owner(c, s) !== 'resistance' || !Number.isFinite(state.counterAt)) continue;
    let a = c.world.counterattacks[s.id];
    if (!a && now >= state.counterAt) {
      const from = SETTLEMENTS.filter(p => owner(c, p) === 'invader' && (c.world.settlements[p.id]?.garrison ?? p.garrison) >= 12).sort(
        (a, b) => Math.hypot(a.x - s.x, a.z - s.z) - Math.hypot(b.x - s.x, b.z - s.z),
      )[0];
      if (!from) continue;
      nav ||= fallbackNav ||= buildNav();
      const route = findPath(nav, from, s);
      if (!route) {
        state.counterAt = now + 24;
        continue;
      }
      const home = (c.world.settlements[from.id] ||= {});
      const strength = Math.min(24, Math.floor((home.garrison ?? from.garrison) / 2));
      home.garrison = (home.garrison ?? from.garrison) - strength;
      a = c.world.counterattacks[s.id] = {
        id: `retake-${s.id}`,
        target: s.id,
        from: from.id,
        strength,
        x: from.x,
        z: from.z,
        route: {...route, leg: 0},
        state: 'marching',
      };
      c.world.parties = c.world.parties.filter(p => p.id !== a.id);
      logEvent(c, {kind: 'counterattack-out', source: a.id, target: s.id, from: from.id, strength});
      events.push({kind: 'out', target: s.id});
    }
    if (!a || !['marching', 'besieging'].includes(a.state)) continue;
    if (a.state === 'marching') {
      nav ||= fallbackNav ||= buildNav();
      if (!a.route) a.route = findPath(nav, a, s);
      if (a.route && !Number.isInteger(a.route.leg)) a.route.leg = 0;
      if (a.route && advance(nav, a, dt)) {
        a.state = 'besieging';
        a.arrived = now;
        events.push({kind: 'siege', target: s.id});
      }
    }
    if (a.state === 'besieging' && now - (a.arrived ?? now) >= 6 && (!party || Math.hypot(party.x - s.x, party.z - s.z) > 32)) {
      state.owner = 'invader';
      state.garrison = a.strength;
      state.militia = 0;
      delete state.counterAt;
      a.state = 'retaken';
      c.world.parties = c.world.parties.filter(p => p.id !== s.id);
      logEvent(c, {kind: 'retaken', source: a.id, target: s.id});
      events.push({kind: 'retaken', target: s.id});
    }
  }
  return events;
}
