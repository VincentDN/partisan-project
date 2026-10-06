// Talk in a mission (convoy/banter-lines.js): while nothing is happening, two militia near each other, or two soldiers
// near enough for the rebels to overhear, have a conversation in long CRPG-style bubbles, a line at a time. A shot
// cuts it short. In a fight the squad and the army bark: hit, low on rounds, out, pinned, the occasional taunt (kills,
// reloads and casualties are called by the sim itself). Driven by the game loop, not the sim step, so the fight and its
// tests are unchanged; its own seeded stream picks who talks and what.
import {MILITIA, SOLDIERS, BARKS} from './banter-lines.js';
import {rng} from './sim.js';

export const QUIET = 20; // seconds after the last shot before anyone chats again
const PAIR = 14; // metres between two people talking
const OVERHEAR = 30; // metres from a rebel to a soldier the rebels can overhear
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
/** How long a line stays up: long enough to read. */
export const readTime = text => Math.min(9, Math.max(3, 1.6 + text.length * 0.055));

/** A shuffled deck that deals every conversation once before any repeats. */
function deck(list, r) {
  let cards = [];
  return () => {
    if (!cards.length) {
      cards = list.map((_, i) => i);
      for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(r() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
      }
    }
    return list[cards.pop()];
  };
}

export function createBanter(sim, seed = 1) {
  const r = rng((seed * 2654435761) >>> 0 || 1);
  const decks = {partisan: deck(MILITIA, r), army: deck(SOLDIERS, r)};
  let convo = null, // {lines, i, speakers, at}
    lastShot = -Infinity,
    seen = sim.time,
    nextChat = sim.time + 4 + r() * 6,
    nextTaunt = 0;
  const pick = list => list[Math.floor(r() * list.length)];
  const alive = side => sim.units.filter(u => u.side === side && u.alive && !u.escaped);
  const quiet = () => sim.time - lastShot > QUIET && !sim.outcome;

  /** Two people of `side` close enough to talk (soldiers only where a rebel can overhear), or null. */
  function pair(side) {
    const rebels = alive('partisan');
    const people = alive(side).filter(u => side === 'partisan' || (!u.alert && rebels.some(p => dist(p, u) < OVERHEAR)));
    const pairs = [];
    for (let i = 0; i < people.length; i++)
      for (let j = i + 1; j < people.length; j++) if (dist(people[i], people[j]) < PAIR) pairs.push([people[i], people[j]]);
    if (!pairs.length) return null;
    const p = pick(pairs);
    return r() < 0.5 ? p : [p[1], p[0]];
  }
  function startChat() {
    const sides = r() < 0.55 ? ['partisan', 'army'] : ['army', 'partisan'];
    for (const side of sides) {
      const speakers = pair(side);
      if (!speakers) continue;
      convo = {lines: decks[side](), i: 0, speakers, at: sim.time};
      return true;
    }
    return false;
  }
  function talk() {
    const [who, text] = convo.lines[convo.i],
      u = convo.speakers[who];
    if (!u.alive || convo.speakers.some(s => !s.alive || s.alert)) return (convo = null);
    const dur = readTime(text);
    sim.say(u, text, `chat-${convo.i}-${text.length}`, 0, dur);
    convo.i++;
    convo.at = sim.time + dur + 0.3;
    if (convo.i >= convo.lines.length) {
      convo = null;
      nextChat = sim.time + dur + 18 + r() * 25;
    }
  }

  // ---------- barks ----------
  const side = u => (u.side === 'army' ? 'army' : 'militia');
  function bark(u, kind, every = 6) {
    if (!u?.alive || u === sim.player) return false;
    const list = BARKS[side(u)][kind];
    return list ? sim.say(u, pick(list), 'bark-' + kind, every) : false;
  }
  function ammo(u) {
    const w = u.weapon,
      ready = u.mags?.[w],
      more = u.reserve?.[w];
    if (more === undefined || more === Infinity) return;
    if (ready === 0 && more === 0) bark(u, 'dry', 15);
    else if (more === 0 && ready > 0 && ready <= 10) bark(u, 'low', 20);
  }

  /** Call once a frame while the mission runs. */
  function update() {
    for (const e of sim.sounds) {
      if (e.t <= seen) continue;
      if (e.type === 'shot') lastShot = Math.max(lastShot, e.t);
      if (e.type === 'hurt')
        bark(
          sim.units.find(u => u.id === e.unit),
          'hurt',
          5,
        );
    }
    seen = sim.time;
    const fighting = sim.time - lastShot < 4;
    if (convo && sim.time - lastShot < 1) convo = null; // a shot ends the talking
    if (fighting) {
      for (const u of alive('partisan')) {
        ammo(u);
        if (u.supp > 0.85) bark(u, 'pinned', 12);
      }
      for (const u of alive('army')) if (u.supp > 0.9) bark(u, 'pinned', 14);
      if (sim.alarm && sim.time > nextTaunt) {
        const near = alive('army').filter(u => alive('partisan').some(p => dist(p, u) < OVERHEAR));
        if (near.length) bark(pick(near), 'taunt', 20);
        nextTaunt = sim.time + 18 + r() * 20;
      }
    }
    if (convo && sim.time >= convo.at) talk();
    else if (!convo && quiet() && sim.time >= nextChat && !startChat()) nextChat = sim.time + 5;
  }
  return {
    update,
    get talking() {
      return convo;
    },
  };
}
