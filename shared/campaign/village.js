// Village services: seeded finite weekly barter stock and healthy tier-one volunteers; no campaign currency.
import {GEAR} from '../../band/troops.js';
import {priceOf, scripFor} from '../../convoy/loot.js';
import {lcg} from '../../convoy/levels/util.js';
import {ownerOf} from './contacts.js';
import {provisions} from './territory.js';
import {rebuildingFor} from './defence.js';
import {logEvent} from './state.js';
import {recordIn} from './cargo.js';
export const ROSTER_LIMIT = 18;
export const barterValue = id => (id === 'food' ? 6 : GEAR[id] ? priceOf(id) : 0);

export function villageAvailable(c, s) {
  return (
    !!s &&
    s.kind === 'village' &&
    ownerOf(c, s) !== 'invader' &&
    !c.deployment &&
    !rebuildingFor(c) &&
    !!c.world.party &&
    Math.hypot(c.world.party.x - s.x, c.world.party.z - s.z) < 32
  );
}
function requireVillage(c, s) {
  if (!villageAvailable(c, s)) throw new Error('Reach a neutral or liberated village to use its services.');
}
/** Ownership never resets this week's stock; liberation improves the exchange rate immediately. */
export function villageStock(c, s) {
  requireVillage(c, s);
  const state = (c.world.settlements[s.id] ||= {}),
    week = Math.floor((c.world.clock.day - 1) / 7);
  if (state.market?.week === week) return state.market.stock;
  let seed = c.seed + week * 104729;
  for (const ch of s.id) seed = (Math.imul(seed, 31) + ch.charCodeAt(0)) >>> 0;
  const rand = lcg(seed),
    bonus = ownerOf(c, s) === 'resistance' ? 1 : 0;
  const stock = {food: 2 + bonus, medkit: 1 + bonus, grenades: 1 + bonus, smoke: 1 + bonus};
  const gear = ['rig', 'vest', 'binoculars', 'bipod'];
  stock[gear[Math.floor(rand() * gear.length)]] = 1 + bonus;
  if (rand() < 0.2) stock.ak74 = 1;
  state.market = {week, stock};
  return stock;
}
function counts(o, available) {
  if (!o || typeof o !== 'object' || Array.isArray(o)) throw new Error('Choose whole item quantities.');
  for (const [id, n] of Object.entries(o))
    if (!Number.isSafeInteger(n) || n < 1 || !barterValue(id) || n > (available[id] || 0))
      throw new Error('An item quantity is no longer available.');
}
/** Preview uses the same checks as commit; goods are selected by their current positions in the save. */
export function barterQuote(c, s, {offer = {}, goods = [], take = {}} = {}) {
  requireVillage(c, s);
  const stock = villageStock(c, s);
  counts(offer, c.stash);
  counts(take, stock);
  if (!Object.keys(take).length) throw new Error('Choose supplies to receive.');
  if (
    !Array.isArray(goods) ||
    new Set(goods).size !== goods.length ||
    goods.some(i => !Number.isSafeInteger(i) || i < 0 || i >= c.goods.length)
  )
    throw new Error('Choose available trade goods once each.');
  const value =
    Object.entries(offer).reduce((v, [id, n]) => v + barterValue(id) * n, 0) + goods.reduce((v, i) => v + scripFor(c.goods[i]), 0);
  const decision = c.world.settlements[s.id]?.dialogue;
  const discount = decision?.week === Math.floor((c.world.clock.day - 1) / 7) && decision.barter?.success ? 0.1 : 0;
  const rate = (ownerOf(c, s) === 'resistance' ? 0.85 : 1) - discount;
  const cost = Math.ceil(Object.entries(take).reduce((v, [id, n]) => v + barterValue(id) * n, 0) * rate);
  return {value, cost, excess: Math.max(0, value - cost), affordable: value >= cost};
}
export function barter(c, s, selection) {
  const q = barterQuote(c, s, selection);
  if (!q.affordable) throw new Error('Offer more items to cover the supplies.');
  const {offer = {}, goods = [], take = {}} = selection,
    stock = villageStock(c, s);
  for (const [id, n] of Object.entries(offer)) {
    c.stash[id] -= n;
    if (!c.stash[id]) delete c.stash[id];
  }
  c.goods = c.goods.filter((_, i) => !goods.includes(i));
  const gear = {};
  for (const [id, n] of Object.entries(take)) {
    stock[id] -= n;
    if (id === 'food') provisions(c, s).food += n;
    else {
      c.stash[id] = (c.stash[id] || 0) + n;
      gear[id] = n;
    }
  }
  recordIn(c, gear, `${s.name} barter`);
  logEvent(c, {kind: 'barter', settlement: s.id, offer, goods: goods.length, take, value: q.value, cost: q.cost});
  return q;
}
export function recruit(c, s) {
  requireVillage(c, s);
  if (ownerOf(c, s) !== 'resistance') throw new Error('Liberate the village before recruiting.');
  if (Object.keys(c.band.fighters).length >= ROSTER_LIMIT) throw new Error(`The band can support ${ROSTER_LIMIT} fighters.`);
  const stock = provisions(c, s);
  if (stock.recruits < 1) throw new Error('No volunteers remain this week.');
  if (stock.food < 1) throw new Error('One meal is needed to welcome a volunteer.');
  const state = c.world.settlements[s.id];
  let n = state.recruited || 0,
    id;
  do {
    id = `${s.name} volunteer ${++n}`;
  } while (c.band.fighters[id]);
  c.band.fighters[id] = {class: 'volunteer', xp: 0, wounded: false, healIn: 0, kit: null};
  state.recruited = n;
  stock.recruits--;
  stock.food--;
  logEvent(c, {kind: 'recruit', settlement: s.id, fighter: id});
  return id;
}
/** Mutations become visible only after storage succeeds; failed writes and validation leave the live save intact. */
export function villageTransaction(c, save, action) {
  const before = structuredClone(c),
    next = structuredClone(c),
    result = action(next);
  Object.assign(c, next);
  try {
    if (!save()) throw new Error('Campaign storage is unavailable. No items or volunteers were exchanged.');
  } catch (err) {
    Object.assign(c, before);
    throw err;
  }
  return result;
}
