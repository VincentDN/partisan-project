// Partisan Tactical abilities: what the Rebel Band classes (band/troops.js) do in a mission.
//
// A rebel carries a class. Its passive abilities (and those of the classes it came through) become stat modifiers
// (mods, read by convoy/sim.js); its active abilities become actions on the ability bar, each with a cooldown and a
// range, built from a few effects the simulation understands: launch (a rocket, an FPV drone, a guided missile),
// blast, reveal, heal, revive, suppress, cover (sandbags), smoke, mines, jam, spoof, stealth, dash, rally, bipod and a
// steady shot. The class also decides the weapons the rebel brings (kitFor). Pure (no DOM), so it is unit-tested.
import {TROOPS, abilitiesOf} from '../band/troops.js';
import {addBelief} from './ai.js';

/** The classes the three rebels start with (the squad is saved in the browser and levels up between missions). */
export const DEFAULT_SQUAD = {player: 'insurgent', mila: 'marksman', dragan: 'machinegunner'};

// ---------- kits ----------
const KIT_LINES = [
  [
    ['machinegunner', 'heavygunner', 'gunteamleader'],
    ['pkm', 'ak'],
  ],
  [
    ['grenadier', 'breacher', 'demolitionist'],
    ['ak', 'gp'],
  ],
  [
    ['antiarmour', 'tankhunter', 'atgmteam'],
    ['rpg', 'ak'],
  ],
  [
    ['marksman', 'sharpshooter', 'sniper', 'countersniper'],
    ['svd', 'ak'],
  ],
];
/** The weapons a class brings: its line's kit, else a rifle. The leader always carries an RPG for the convoy's armour. */
export function kitFor(cls, leader = false) {
  const kit = [...(KIT_LINES.find(([ids]) => ids.includes(cls))?.[1] || ['ak'])];
  if (leader && !kit.includes('rpg')) kit.push('rpg');
  if (leader && !kit.includes('svd') && kit.length < 3) kit.splice(1, 0, 'svd');
  return kit;
}

// ---------- passives: stat modifiers ----------
const NO_MODS = {
  hp: 1,
  speed: 1,
  reload: 1,
  spread: 1,
  damage: 1,
  vehicleDamage: 1,
  suppTaken: 1,
  suppOut: 1,
  taken: 1,
  range: 1,
  interact: 1,
  noise: 1,
  cooldown: 1,
  recover: 1,
};
/** What each passive does, as multipliers on NO_MODS (passives with no entry are flavour for now). */
export const PASSIVES = {
  'Local knowledge': {speed: 1.05},
  Hardy: {hp: 1.1},
  'Rifle drill': {reload: 0.85},
  Ambusher: {damage: 1.1},
  Scavenger: {interact: 1.3},
  'Pack mule': {reload: 0.95},
  Armoured: {taken: 0.85, speed: 0.9},
  'Fire and move': {spread: 0.95},
  'Light foot': {speed: 1.15, noise: 0.8},
  'Keen eyes': {range: 1.05},
  'Beaten zone': {suppOut: 1.3},
  'Belt-fed': {reload: 0.6},
  'Interlocking fire': {suppOut: 1.2},
  'Flush out': {suppOut: 1.1},
  'Close quarters': {damage: 1.1},
  'Chain reaction': {vehicleDamage: 1.2},
  'Steady launch': {reload: 0.85},
  'Weak spots': {vehicleDamage: 1.5},
  'Ambush position': {noise: 0.7},
  Marksmanship: {spread: 0.85},
  Unshakable: {recover: 2},
  'Double tap': {damage: 1.1},
  Leadership: {reload: 0.9},
  'Night fighter': {spread: 0.95},
  'Remote detonation': {cooldown: 0.85},
  Repair: {interact: 1.2},
  Triage: {taken: 0.95},
  'Nobody left behind': {cooldown: 0.8},
  Spotter: {cooldown: 0.9},
  'Fast hands': {cooldown: 0.6},
  'Hardened link': {cooldown: 0.9},
  'Radio net': {cooldown: 0.9},
  Relay: {cooldown: 0.9},
  Unseen: {noise: 0.7},
  'Night eyes': {range: 1.05},
  'Forward observer': {cooldown: 0.85},
  Vanish: {noise: 0.5},
  'Long shot': {range: 1.3},
  'Priority targets': {damage: 1.15},
  'One shot': {damage: 1.3},
  'Hidden shooter': {noise: 0.3},
  Glint: {spread: 0.9},
  'Light touch': {interact: 1.5},
};
/** A class's stat modifiers: every passive it has, its own and inherited, multiplied together. */
export function modsFor(cls) {
  const m = {...NO_MODS};
  if (!TROOPS[cls]) return m;
  for (const a of abilitiesOf(cls))
    if (a.kind === 'passive' && PASSIVES[a.name]) for (const [k, v] of Object.entries(PASSIVES[a.name])) m[k] *= v;
  return m;
}

// ---------- actives: effects ----------
const near = (list, x, z, r) => list.filter(o => Math.hypot(o.x - x, o.z - z) <= r);
const army = sim => sim.units.filter(o => o.side === 'army' && o.alive && !o.escaped);
const allies = (sim, u) => sim.units.filter(o => o.side === u.side && !o.escaped);
const reveal =
  (r, dur, around = 'target') =>
  (sim, u, t) => {
    const c = around === 'self' ? u : t;
    const seen = near(army(sim), c.x, c.z, r);
    for (const o of seen) {
      o.revealedUntil = sim.time + dur;
      // the squad knows where they are: teammates engage, the player sees a mark
      for (const m of allies(sim, u)) if (m.alive) addBelief(m, {x: o.x, z: o.z, err: 0.5, conf: 1, src: 'told', id: o.id}, sim.time);
    }
    sim.reveals.push({x: c.x, z: c.z, r, t: sim.time, until: sim.time + Math.min(dur, 3)});
    return true;
  };
const suppress = (r, amount) => (sim, u, t) => {
  for (const o of near(army(sim), t.x, t.z, r)) o.supp = Math.min(1, o.supp + amount);
  sim.reveals.push({x: t.x, z: t.z, r, t: sim.time, until: sim.time + 0.6, kind: 'suppress'});
  return true;
};
const blast = (r, damage, vehicle) => (sim, u, t) => (sim.explode(t.x, t.z, {splash: {r, damage}, vehicle, lob: true}, u, null), true);
const launch =
  (weapon, extra = {}) =>
  (sim, u, t) => {
    sim.launch(u, weapon, u.x, u.z, t.x, t.z, extra);
    return true;
  };
const heal =
  (amount, reach = 3) =>
  (sim, u) => {
    const hurt = near(allies(sim, u), u.x, u.z, reach)
      .filter(o => o.alive && o.hp < (o.maxHp ?? 100))
      .sort((a, b) => a.hp - b.hp)[0];
    if (!hurt) return false;
    hurt.hp = Math.min(hurt.maxHp ?? 100, hurt.hp + amount);
    hurt.supp = 0;
    return true;
  };
const revive =
  (hp, reach = 4) =>
  (sim, u) => {
    const down = near(allies(sim, u), u.x, u.z, reach).find(o => !o.alive);
    if (!down) return false;
    Object.assign(down, {alive: true, hp, state: 'hold', supp: 0});
    return true;
  };
const fieldworks =
  (length, walls = 1) =>
  (sim, u, t) => {
    const a = Math.atan2(t.z - u.z, t.x - u.x),
      across = Math.abs(Math.cos(a)) < Math.abs(Math.sin(a)); // facing north or south: the wall runs east-west
    for (let i = 0; i < walls; i++) {
      const off = 1.3 + i * 1.3;
      sim.fieldworks.push({
        x: u.x + Math.cos(a) * off,
        z: u.z + Math.sin(a) * off,
        w: across ? length : 1,
        d: across ? 1 : length,
        h: 1,
        kind: 'sandbag',
      });
    }
    return true;
  };
const smoke = (r, dur) => (sim, u, t) => (sim.smokes.push({x: t.x, z: t.z, r, until: sim.time + dur, t: sim.time}), true);
const mines = n => (sim, u, t) => {
  const a = Math.atan2(t.z - u.z, t.x - u.x);
  for (let i = 0; i < n; i++)
    sim.mines.push({
      x: t.x + Math.cos(a + Math.PI / 2) * (i - (n - 1) / 2) * 2.2,
      z: t.z + Math.sin(a + Math.PI / 2) * (i - (n - 1) / 2) * 2.2,
      by: u,
    });
  return true;
};
const jam = dur => sim => ((sim.jamUntil = Math.max(sim.jamUntil, sim.time + dur)), (sim.messages = []), true);
const stealth = dur => (sim, u) => ((u.stealthUntil = sim.time + dur), true);
const dash =
  (dur, mult = 1.6) =>
  (sim, u) => ((u.dashUntil = sim.time + dur), (u.dashMult = mult), (u.supp = 0), true);
const rally = r => (sim, u) => {
  for (const o of near(allies(sim, u), u.x, u.z, r)) if (o.alive) o.supp = 0;
  return true;
};
const vehicleStrike = (amount, reach) => (sim, u, t) => {
  const v = sim.vehicles
    .filter(v => !v.destroyed && Math.hypot(v.x - t.x, v.z - t.z) < reach + Math.max(v.w, v.d) / 2)
    .sort((a, b) => Math.hypot(a.x - t.x, a.z - t.z) - Math.hypot(b.x - t.x, b.z - t.z))[0];
  const target = sim.targets.find(g => !g.destroyed && Math.hypot(g.x - t.x, g.z - t.z) < reach + 2);
  if (!v && !target) return false;
  if (v) sim.damageVehicle(v, amount, u);
  else sim.damageTarget(target, amount, u);
  sim.explosions.push({x: (v || target).x, z: (v || target).z, r: 2.5, t: sim.time});
  sim.sound({type: 'explode', x: (v || target).x, z: (v || target).z, r: 2.5});
  return true;
};
const silentKill = (sim, u) => {
  const o = near(army(sim), u.x, u.z, 3).find(o => !o.alert && o.state !== 'mounted' && o.state !== 'turret');
  if (!o) return false;
  o.hp = 0;
  sim.damage(o, u, 1);
  return true;
};
const spoof = (sim, u, t) => {
  for (const o of near(army(sim), u.x, u.z, 50)) addBelief(o, {x: t.x, z: t.z, err: 2, conf: 0.9, src: 'heard', id: null}, sim.time);
  return true;
};
const toggleBipod = (sim, u) => ((u.bipod = !u.bipod), true);
const steady = (sim, u) => ((u.steady = 1), true);
const both =
  (...fns) =>
  (sim, u, t) =>
    fns.map(f => f(sim, u, t)).some(Boolean);

/**
 * Every active ability: cd (seconds), range (metres to the aim point; 0 = on itself), and what it does. Abilities
 * named in band/troops.js and missing here show on the bar as "not in this mission".
 */
export const ACTIVES = {
  'Take cover': {cd: 10, range: 0, run: dash(1.5, 1.8)},
  'Covering fire': {cd: 14, range: 60, run: suppress(4, 0.7)},
  'Deploy bipod': {cd: 1, range: 0, run: toggleBipod},
  'Hose down': {cd: 25, range: 70, run: suppress(7, 1)},
  'Fire mission': {cd: 35, range: 90, run: both(suppress(9, 1), blast(3, 40, 20))},
  Lob: {cd: 10, range: 55, run: launch('gp', {lob: true})},
  Breach: {cd: 16, range: 10, run: both(blast(3, 60, 40), suppress(4, 1))},
  'Shaped charge': {cd: 30, range: 6, run: vehicleStrike(420, 4)},
  Rocket: {cd: 12, range: 80, run: launch('rpg')},
  'Tandem round': {cd: 20, range: 80, run: launch('tandem')},
  'Guided missile': {cd: 40, range: 130, run: launch('atgm')},
  Bound: {cd: 8, range: 0, run: dash(2, 1.7)},
  Rally: {cd: 25, range: 0, run: rally(20)},
  Assault: {cd: 25, range: 0, run: both(dash(5, 1.4), rally(3))},
  'Dig in': {cd: 30, range: 4, run: fieldworks(3)},
  'Clear mines': {cd: 20, range: 0, run: reveal(10, 5, 'self')},
  'Lay mines': {cd: 30, range: 12, run: mines(3)},
  'Improvised charge': {cd: 35, range: 12, run: mines(1)},
  'Kill zone': {cd: 60, range: 14, run: both(mines(5), fieldworks(4))},
  Bunker: {cd: 50, range: 4, run: fieldworks(4, 2)},
  'Patch up': {cd: 12, range: 0, run: heal(30)},
  Drag: {cd: 10, range: 0, run: heal(15, 4)},
  Revive: {cd: 40, range: 0, run: revive(40)},
  Adrenaline: {cd: 45, range: 0, run: heal(100, 4)},
  'Recon drone': {cd: 25, range: 80, run: reveal(40, 20)},
  'FPV strike': {cd: 20, range: 150, run: launch('fpv')},
  Swarm: {
    cd: 45,
    range: 150,
    run: (sim, u, t) => [0, 1, 2].map(i => launch('fpv')(sim, u, {x: t.x + (i - 1) * 4, z: t.z + ((i * 7) % 3) - 1})).some(Boolean),
  },
  Overwatch: {cd: 60, range: 0, run: reveal(50, 60, 'self')},
  'Laser mark': {cd: 15, range: 90, run: both(reveal(3, 20), suppress(2, 0.3))},
  'Listen in': {cd: 30, range: 0, run: reveal(60, 10, 'self')},
  'Call for help': {cd: 60, range: 0, run: both(rally(40), heal(25, 40))},
  Jam: {cd: 45, range: 0, run: jam(30)},
  Spoof: {cd: 40, range: 90, run: spoof},
  'Scout ahead': {cd: 25, range: 50, run: reveal(25, 15)},
  'Mark route': {cd: 30, range: 0, run: both(reveal(30, 10, 'self'), stealth(6))},
  'Lead in': {cd: 50, range: 0, run: stealth(12)},
  'Silent kill': {cd: 12, range: 0, run: silentKill},
  'Hold breath': {cd: 8, range: 0, run: steady},
  'Suppressing marksman': {cd: 10, range: 90, run: suppress(2, 0.8)},
  'Return fire': {
    cd: 30,
    range: 0,
    run: (sim, u) => (
      army(sim)
        .filter(o => o.role === 'marksman')
        .forEach(o => (o.revealedUntil = sim.time + 20)),
      true
    ),
  },
  Sabotage: {cd: 30, range: 5, run: vehicleStrike(300, 3)},
  Disguise: {cd: 45, range: 0, run: stealth(15)},
  'Smoke out': {cd: 20, range: 30, run: smoke(5, 20)},
  'Behind the lines': {cd: 60, range: 0, run: stealth(20)},
  'Cut the wires': {cd: 60, range: 0, run: jam(60)},
};

/** The active abilities a class can use in a mission, newest first (its own, then those it kept), at most `max`. */
export function activesFor(cls, max = 3) {
  if (!TROOPS[cls]) return [];
  const all = abilitiesOf(cls).filter(a => a.kind === 'active');
  const ordered = [...all].sort((a, b) => TROOPS[b.from].tier - TROOPS[a.from].tier);
  return ordered.slice(0, max).map(a => ({name: a.name, from: a.from, text: a.text, ...(ACTIVES[a.name] || {cd: 0, range: 0, run: null})}));
}

/** Seconds until u can use `name` again (0 = ready). */
export const cooldownLeft = (sim, u, name) => Math.max(0, (u.cooldowns?.[name] ?? -Infinity) - sim.time);

/** Use ability `name` as u, aimed at t {x, z}. Returns true when it fired (and starts its cooldown). */
export function useAbility(sim, u, name, t) {
  const A = ACTIVES[name];
  if (!A || !u.alive || cooldownLeft(sim, u, name) > 0) return false;
  let target = t || {x: u.x + Math.cos(u.facing) * 3, z: u.z + Math.sin(u.facing) * 3};
  if (A.range) {
    const d = Math.hypot(target.x - u.x, target.z - u.z);
    if (d > A.range) target = {x: u.x + ((target.x - u.x) / d) * A.range, z: u.z + ((target.z - u.z) / d) * A.range};
  }
  if (!A.run(sim, u, target)) return false;
  u.cooldowns ??= {};
  u.cooldowns[name] = sim.time + A.cd * (u.mods?.cooldown ?? 1);
  sim.sound({type: 'ability', name, x: u.x, z: u.z, unit: u.id});
  if (u.side === 'partisan' && name !== 'Deploy bipod' && name !== 'Hold breath') sim.say(u, `${name}!`, 'ab-' + name, 2);
  return true;
}
