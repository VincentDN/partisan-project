// Seeded weekly village persuasion: saved decisions grant better barter rates or one extra healthy recruit.
import {ownerOf} from './contacts.js';
import {provisions} from './territory.js';
import {villageAvailable, recruit, ROSTER_LIMIT} from './village.js';
import {logEvent} from './state.js';
export const dialogueWeek = c => Math.floor((c.world.clock.day - 1) / 7);
export function persuasion(c, s, topic) {
  if (!villageAvailable(c, s)) throw Error('Reach a neutral or liberated village first.');
  if (!['barter', 'recruit'].includes(topic)) throw Error('Unknown conversation.');
  const state = (c.world.settlements[s.id] ||= {}),
    week = dialogueWeek(c);
  if (state.dialogue?.week === week && state.dialogue[topic]) return state.dialogue[topic];
  const friendly = ownerOf(c, s) === 'resistance';
  if (topic === 'recruit') {
    if (!friendly) throw Error('Liberate this village before asking someone to join.');
    if (Object.keys(c.band.fighters).length >= ROSTER_LIMIT) throw Error('Your band is full.');
    if (provisions(c, s).food < 1) throw Error('Keep one village meal to welcome a recruit.');
  }
  let seed = c.seed >>> 0;
  for (const ch of `${s.id}:${week}:${topic}`) seed = Math.imul(seed ^ ch.charCodeAt(0), 16777619) >>> 0;
  seed ^= seed >>> 16;
  const die = ((seed >>> 0) % 20) + 1,
    modifier = friendly ? 3 : 0,
    target = topic === 'barter' ? 12 : 14;
  const result = {die, modifier, target, success: die + modifier >= target};
  if (result.success && topic === 'recruit') {
    provisions(c, s).recruits++;
    result.fighter = recruit(c, s);
  }
  if (state.dialogue?.week !== week) state.dialogue = {week};
  state.dialogue[topic] = result;
  logEvent(c, {kind: 'persuasion', settlement: s.id, topic, ...result});
  return result;
}
