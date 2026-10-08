// Convoy Ambush simulation: pure, deterministic (seeded), no three.js, so the AI can be unit-tested in node.
// Fixed-step: call step(dt, input) at 60 Hz. The renderer (convoy/sprite-render.js) only reads state and event lists.
import {REBEL_HEALTH, squadSpawns, DEFAULT_SQUAD} from './roster.js';
import {LEVELS, DEFAULT_LEVEL} from './levels/index.js';
import {WEAPONS, ROLES, PARTISAN_LOADOUTS, munition} from './weapons.js';
import {kitFor, modsFor} from './abilities.js';
import {difficulty as difficultyOf} from './difficulty.js';
import {initObjectives, evaluate} from './objectives.js';
import {requestControl, selectControl, cancelControl, ensureControl, advanceControl} from './squad-control.js';
import {bestBelief, compass, perceive, hear, decay, armyThink, armyAct, partisanThink, partisanAct, squadThink, receive} from './ai.js';
import {BARKS} from './banter-lines.js';
import {coverGrid, PAD} from './cover-grid.js';

/** mulberry32: small seeded PRNG so a run can be replayed exactly. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Entry fraction (0..1) of segment a->b into box b (centre x,z, size w,d, grown by pad), or Infinity. */
export function segmentBox(ax, az, bx, bz, box, pad = 0) {
  const minX = box.x - box.w / 2 - pad,
    maxX = box.x + box.w / 2 + pad,
    minZ = box.z - box.d / 2 - pad,
    maxZ = box.z + box.d / 2 + pad;
  const dx = bx - ax,
    dz = bz - az;
  let t0 = 0,
    t1 = 1;
  // the x slab, then the z slab (unrolled: this runs for every ray against every box near it)
  if (Math.abs(dx) < 1e-9) {
    if (ax < minX || ax > maxX) return Infinity;
  } else {
    let ta = (minX - ax) / dx,
      tb = (maxX - ax) / dx;
    if (ta > tb) [ta, tb] = [tb, ta];
    t0 = Math.max(t0, ta);
    t1 = Math.min(t1, tb);
    if (t0 > t1) return Infinity;
  }
  if (Math.abs(dz) < 1e-9) {
    if (az < minZ || az > maxZ) return Infinity;
  } else {
    let ta = (minZ - az) / dz,
      tb = (maxZ - az) / dz;
    if (ta > tb) [ta, tb] = [tb, ta];
    t0 = Math.max(t0, ta);
    t1 = Math.min(t1, tb);
    if (t0 > t1) return Infinity;
  }
  return t0;
}
export const inBox = (x, z, b, pad = 0) => Math.abs(x - b.x) <= b.w / 2 + pad && Math.abs(z - b.z) <= b.d / 2 + pad;

/** Distance along a unit ray (ox,oz)+(dx,dz)*s to circle (cx,cz,r), or Infinity. */
function rayCircle(ox, oz, dx, dz, cx, cz, r) {
  const fx = ox - cx,
    fz = oz - cz;
  const b = fx * dx + fz * dz,
    c = fx * fx + fz * fz - r * r;
  const disc = b * b - c;
  if (disc < 0) return Infinity;
  const s = -b - Math.sqrt(disc);
  return s >= 0 ? s : Infinity;
}

/** Does segment a->b pass within r of (cx, cz)? */
export function segmentCircle(ax, az, bx, bz, cx, cz, r) {
  const dx = bx - ax,
    dz = bz - az,
    L = dx * dx + dz * dz;
  const t = L ? Math.max(0, Math.min(1, ((cx - ax) * dx + (cz - az) * dz) / L)) : 0;
  return Math.hypot(ax + dx * t - cx, az + dz * t - cz) < r;
}

export const DAMAGE = 34;
export const MAG = WEAPONS.ak.mag;
const SPEED = {walk: 3, run: 4.6, sneak: 1.8, sprint: 6.6};
export const GRENADES = 3; // hand grenades each rebel carries (G)
const KEY_ROLES = new Set(['leader', 'rto', 'turret']);

/**
 * A level with only `force` (0..1) of its soldiers: foot soldiers, convoy riders, wave squads and the reaction force.
 * Leaders, radio operators and turret gunners always come; the rest are thinned evenly. The level object is not changed.
 */
export function thinLevel(L, force) {
  if (!(force < 1)) return L;
  const thin = list => {
    const keepN = Math.max(1, Math.round(list.length * force));
    const key = list.filter(u => KEY_ROLES.has(u.role)).length,
      others = list.length - key,
      spare = Math.max(0, keepN - key);
    let seen = 0;
    return list.filter(u => {
      if (KEY_ROLES.has(u.role)) return true;
      // keep `spare` of the others, spread through the list
      const keep = Math.floor(((seen + 1) * spare) / others) > Math.floor((seen * spare) / others);
      seen++;
      return keep;
    });
  };
  return {
    ...L,
    units: L.units ? thin(L.units) : L.units,
    convoy: L.convoy && {...L.convoy, vehicles: L.convoy.vehicles.map(v => ({...v, crew: thin(v.crew)}))},
    waves: L.waves?.map(w => ({...w, squads: w.squads?.map(q => ({...q, units: thin(q.units)}))})),
    reinforcements: L.reinforcements && {...L.reinforcements, units: thin(L.reinforcements.units)},
  };
}

/** Metres anyone can see, rebels and soldiers alike (role sights and optics are capped to it). */
export const VISION = 30;

export class Sim {
  /**
   * @param {{level?: object|string, seed?: number, awareness?: number, squad?: object, difficulty?: string}} opts
   *   level: a level object or id (convoy/levels/index.js); awareness 0..1: how well the army perceives and communicates
   *   squad: {rebel id: class id} (band/troops.js): the class sets a rebel's weapons, passives and abilities
   *   difficulty: an id from convoy/difficulty.js; given, it also thins the level's soldiers (its `force`)
   */
  constructor({level = DEFAULT_LEVEL, seed = 7, awareness = 0.5, squad = null, difficulty = null} = {}) {
    this.level = typeof level === 'string' ? LEVELS[level] : level;
    if (!this.level) throw new Error(`unknown level ${level}`);
    if (difficulty) this.level = thinLevel(this.level, difficultyOf(difficulty).force);
    this.rand = rng(seed);
    this.voice = rng(seed * 31 + 7); // which words a bark uses: its own stream, so the fight stays the same
    this.awareness = awareness;
    // Everyone sees as far as the rebels' fog of war shows (convoy/sprite-render.js), and while a screen is watching,
    // `view` is the part of the map on it: a soldier off the screen can neither spot nor shoot a rebel. You see them,
    // they see you.
    this.vision = VISION;
    this.view = null; // {x0, x1, z0, z1} in metres, set by the renderer each frame
    this.difficultyId = difficulty || 'normal';
    this.difficulty = difficultyOf(this.difficultyId);
    // What abilities leave in the world (convoy/abilities.js): sandbag walls, smoke, mines, marks on revealed soldiers.
    this.fieldworks = []; // {x, z, w, d, h, kind}: block like cover
    this.smokes = []; // {x, z, r, t, until}: block sight
    this.mines = []; // {x, z, by}: burst under the army
    this.reveals = []; // {x, z, r, t, until, kind?}: for the renderer
    // Real ammunition (TAC-C-11, convoy/kit-ammo.js): when set, the weapons it owns fire the rounds in their fighter's
    // grid kit and reload real magazines from it. {owns(u, wid), canReload(u, wid), reloaded(u, wid), fired(u, wid)}
    this.ammo = null;
    this.jamUntil = -Infinity; // the army's radio is jammed until then
    this.time = 0;
    this.alarm = false; // the ambush has been sprung (or the army spotted the partisans)
    this.alarmAt = Infinity;
    this.outcome = null; // 'won' | 'lost'
    this.tracers = []; // {x0,z0,x1,z1,side,weapon,t}
    // Rounds in flight (RimWorld-style): where a round goes is decided when it is fired, what it does lands when it
    // arrives. {x0, z0, x1, z1, t0, t1, weapon, side, by, hit, hitBox, lob}
    this.projectiles = [];
    this.impacts = []; // where rounds landed, for the renderers: {x, z, surface, weapon, t}
    this.explosions = []; // {x,z,r,t}
    this.callouts = []; // {id, name, side, text, t}
    // Sound events for the soundscape (convoy/soundscape.js drains them each frame): {type, x, z, t, ...}.
    this.sounds = [];
    this.messages = []; // comms in flight: {at, to, belief, from}
    this.squad = {contactSince: Infinity, flanking: false, retreating: false, nextThink: 0};
    this.objectives = initObjectives(this.level);
    this.items = (this.level.items || []).map(i => ({...i, progress: 0, taken: false})); // things to steal (hold E)
    this.taken = new Set();
    // Alarm: 'global' (the convoy: one shot and the whole column knows) or 'local' (word travels by voice, radio, gunfire)
    this.alarmMode = this.level.alarm || 'global';
    this.reinforcements = this.level.reinforcements ? {...this.level.reinforcements, state: 'idle'} : null;
    // Destructible structures from level data (a radio mast): {id, x, z, w, d, h, hp, radio?}. They block like cover until destroyed.
    this.targets = (this.level.targets || []).map(t => ({...t, maxHp: t.hp, destroyed: false}));
    this.radioDown = false; // the radio mast is gone: no reinforcements, and word no longer travels by radio
    this.waves = (this.level.waves || []).map(w => ({...w, spawned: false})); // scheduled attacks (the cave defence)
    this.assaults = []; // bounding groups: {group, goal, moving: 0 | 1}
    this.kills = {}; // partisan id -> soldiers they put down
    this.vehicles = [];
    this.units = [];
    const L = this.level;
    let x = L.convoy?.startX ?? 0;
    for (const v of L.convoy?.vehicles || []) {
      x -= v.gap;
      this.addVehicle(v, x, L.convoy.z);
    }
    (L.units || []).forEach((f, i) => this.footSoldier(f, i));
    const roster = squad
      ? Object.keys(squad)
      : LEVELS[L.id] && L.partisans.some(p => p.id === 'player')
        ? Object.keys(DEFAULT_SQUAD)
        : L.partisans.map(p => p.id);
    for (const p of squadSpawns(L, roster)) {
      const cls = squad?.[p.id] || null;
      const u = this.unit({
        id: p.id,
        name: p.label,
        role: 'partisan',
        side: 'partisan',
        x: p.x,
        z: p.z,
        weapons: p.weapons || (cls ? kitFor(cls, p.id === 'player') : PARTISAN_LOADOUTS[p.id] || ['ak']),
      });
      u.hp = u.maxHp = REBEL_HEALTH;
      if (cls) {
        u.cls = cls;
        u.mods = modsFor(cls);
        u.hp = u.maxHp = Math.round(REBEL_HEALTH * u.mods.hp);
      }
      u.cooldowns = {};
      u.grenades = GRENADES;
      u.stamina = 1;
      u.state = 'hold';
      u.facing = p.facing ?? 0;
    }
    this.active = this.units.find(u => u.id === 'player') || this.units.find(u => u.side === 'partisan');
    if (!this.active) throw new Error('level requires a playable rebel');
    this.control = {readyAt: 0, pending: null, revision: 0};
  }

  /** Backward-compatible alias: identity stays on the unit, control moves between units. */
  get player() {
    return this.active;
  }

  requestSwap() {
    return requestControl(this);
  }
  swapTo(id) {
    return selectControl(this, id);
  }
  cancelSwap() {
    return cancelControl(this);
  }
  advanceSwap(seconds) {
    return advanceControl(this, seconds);
  }

  /** A vehicle with its crew at (x, z); the convoy builds one per entry, a wave can park one. */
  addVehicle(v, x, z) {
    const veh = {...v, x, z, maxHp: v.hp, destroyed: false, stopped: false, stopAt: Infinity, crew: []};
    this.vehicles.push(veh);
    v.crew.forEach((c, i) => {
      const role = ROLES[c.role];
      const u = this.unit({
        id: `${v.id}-${i}`,
        name: c.name,
        role: c.role,
        side: 'army',
        x,
        z,
        weapons: [role.weapon, ...(role.launcher ? [role.launcher] : [])],
      });
      u.state = c.role === 'turret' ? 'turret' : 'mounted';
      u.vehicle = veh;
      u.leader = c.role === 'leader';
      if (c.role === 'turret') {
        u.r = 0.32; // only head and shoulders show above the hatch
        u.armour = 0.5; // the gun shield halves suppression
      }
      veh.crew.push(u);
    });
    return veh;
  }

  /** An army soldier on foot from level data: {name, role, x, z, facing, state?, ...}. */
  footSoldier(f, i) {
    const role = ROLES[f.role];
    const u = this.unit({
      id: f.id || `foot-${i}`,
      name: f.name,
      role: f.role,
      side: 'army',
      x: f.x,
      z: f.z,
      facing: f.facing || 0,
      weapons: [role.weapon, ...(role.launcher ? [role.launcher] : [])],
    });
    u.state = f.state || (f.patrol ? 'patrol' : 'guard');
    u.leader = f.role === 'leader';
    u.group = f.group || null;
    u.post = {x: f.x, z: f.z, facing: f.facing || 0};
    if (f.patrol) Object.assign(u, {route: f.patrol, routeI: 0});
    if (f.path) u.path = f.path.map(p => ({...p})); // waypoints to walk first (a tunnel); see the 'flank' state
    return u;
  }

  unit(o) {
    const u = {
      r: 0.45,
      hp: 100,
      alive: true,
      escaped: false,
      facing: 0,
      weapons: ['ak'],
      reload: 0,
      reloading: null,
      cd: 0,
      burst: 0,
      pause: 0,
      supp: 0,
      moving: false,
      moveTo: null,
      speed: SPEED.run,
      state: 'idle',
      stateAt: 0,
      beliefs: [],
      visible: [],
      suspicion: 0,
      said: {},
      thinkAt: 0,
      ...o,
    };
    u.weapon = u.weapons[0];
    u.mags = Object.fromEntries(u.weapons.map(w => [w, WEAPONS[w].mag]));
    u.reserve = Object.fromEntries(u.weapons.map(w => [w, WEAPONS[w].reserve ?? Infinity]));
    this.units.push(u);
    return u;
  }

  /** Static cover plus the vehicles, as boxes. */
  boxes() {
    return [...this.level.cover, ...this.dynamicBoxes()];
  }
  /** What can change during a fight, as boxes: fieldworks, standing targets, vehicles. */
  dynamicBoxes() {
    return [
      ...this.fieldworks,
      ...this.targets.filter(t => !t.destroyed).map(t => ({x: t.x, z: t.z, w: t.w, d: t.d, h: t.h, kind: 'target', target: t})),
      ...this.vehicles.map(v => ({x: v.x, z: v.z, w: v.w, d: v.d, h: v.h, kind: 'vehicle', vehicle: v})),
    ];
  }

  /** Does any of the level's static cover near a rectangle pass `test`? (convoy/cover-grid.js; no allocation) */
  someCoverNear(x0, z0, x1, z1, test) {
    const grid = (this._grid ||= coverGrid(this.level.cover)),
      cover = this.level.cover;
    for (const n of grid.near(x0, z0, x1, z1, (this._near ||= []))) if (test(cover[n])) return true;
    return false;
  }
  /** Does any of the level's static cover the segment a->b passes near pass `test`? (the cells it crosses only) */
  someCoverAlong(ax, az, bx, bz, test) {
    const grid = (this._grid ||= coverGrid(this.level.cover)),
      cover = this.level.cover;
    for (const n of grid.along(ax, az, bx, bz, (this._near ||= []))) if (test(cover[n])) return true;
    return false;
  }
  /** The level's static cover near a rectangle, in level order. */
  coverNear(x0, z0, x1, z1) {
    const grid = (this._grid ||= coverGrid(this.level.cover));
    return grid.near(x0, z0, x1, z1, [], true).map(n => this.level.cover[n]);
  }

  /** Line of sight between two points (eye height is implied: every obstacle is taller than a crouching man). */
  los(ax, az, bx, bz) {
    const blocks = b => !inBox(ax, az, b) && !inBox(bx, bz, b) && segmentBox(ax, az, bx, bz, b, -0.05) < 1;
    if (this.someCoverAlong(ax, az, bx, bz, blocks)) return false;
    for (const b of this.dynamicBoxes()) if (blocks(b)) return false;
    for (const c of this.smokes) if (this.time < c.until && segmentCircle(ax, az, bx, bz, c.x, c.z, c.r)) return false;
    return true;
  }

  enemiesOf(u) {
    return this.units.filter(o => o.alive && !o.escaped && o.side !== u.side && o.state !== 'mounted');
  }

  say(u, text, key = text, every = 4, dur = 0) {
    if (!u.alive) return false;
    if (this.time - (u.said[key] ?? -Infinity) < every) return false;
    // One voice per line: a squadmate who just shouted the same thing covers it (beliefs are still shared).
    if (this.callouts.some(c => c.side === u.side && c.text === text && this.time - c.t < 2.5)) return false;
    u.said[key] = this.time;
    this.callouts.push({id: u.id, name: u.name, side: u.side, text, t: this.time, ...(dur ? {dur} : {})}); // dur: a longer bubble
    this.sound({type: 'say', x: u.x, z: u.z, side: u.side, key, radio: u.role === 'rto', unit: u.id});
    if (this.callouts.length > 60) this.callouts.shift();
    return true;
  }

  /** One of the barks for `kind` on u's side (convoy/banter-lines.js), {name} filled in; `fallback` if there are none. */
  bark(u, kind, fallback, name = '') {
    const list = BARKS[u.side === 'army' ? 'army' : 'militia'][kind];
    if (!list?.length) return fallback;
    return list[Math.floor(this.voice() * list.length)].replace('{name}', name);
  }

  /** Queue a sound event (shot, impact, explode, reload, death, ...); capped so a headless run never grows it. */
  sound(e) {
    this.sounds.push({...e, t: this.time});
    if (this.sounds.length > 400) this.sounds.splice(0, this.sounds.length - 400);
  }

  /** One soldier becomes alert: a moment of surprise first; in a global alarm everyone does at once. */
  alert(u) {
    if (u.alert || !u.alive) return;
    if (!this.alarm) return this.raiseAlarm(u);
    u.alert = true;
    u.reactAt = this.time + (0.5 + this.rand()) * (1.4 - this.awareness * 0.8) * this.difficulty.react;
    // A radio operator who hears of contact puts it out on the net at once.
    const b = u.role === 'rto' && this.alarmMode === 'local' ? bestBelief(u) : null;
    if (b) {
      this.say(u, `All units, contact ${compass(b.x - u.x, b.z - u.z)}!`, 'radio-net', 20);
      this.shareLocal(u, b);
    }
  }

  /** Radio a belief to the squad: arrives after a delay that shrinks with awareness, slightly blurred. */
  share(from, belief) {
    if (this.alarmMode === 'local' || (from.side === 'army' && this.jammed)) return this.shareLocal(from, belief);
    // A living radio operator halves the delay; with the sergeant dead too, word travels slower.
    const army = from.side === 'army' ? this.units.filter(u => u.side === 'army' && u.alive) : [];
    const rto = army.some(u => u.role === 'rto') ? 0.5 : 1,
      leaderless = from.side === 'army' && !army.some(u => u.leader) ? 1.5 : 1;
    const delay = (0.4 + (1 - this.awareness) * 1.4) * rto * leaderless;
    for (const to of this.units)
      if (to !== from && to.alive && to.side === from.side)
        this.messages.push({
          at: this.time + delay,
          to,
          from,
          belief: {...belief, err: belief.err + 2.5, conf: belief.conf * 0.85, src: 'told'},
        });
  }

  /**
   * Local alarm: a shout reaches soldiers within 30 m; the radio reaches everyone, but only while a radio operator lives.
   */
  shareLocal(from, belief) {
    const radio =
      from.side === 'army' &&
      !this.radioDown &&
      !this.jammed &&
      this.units.some(u => u.side === 'army' && u.alive && u.role === 'rto' && u.alert);
    for (const to of this.units) {
      if (to === from || !to.alive || to.side !== from.side) continue;
      const voice = dist(to, from) < 30;
      if (!voice && !radio) continue;
      const delay = voice ? 0.4 + this.rand() * 0.5 : (0.8 + (1 - this.awareness) * 1.6) * 0.6;
      this.messages.push({
        at: this.time + delay,
        to,
        from,
        belief: {...belief, err: belief.err + (voice ? 1.5 : 3), conf: belief.conf * 0.85, src: 'told'},
      });
    }
  }

  /** The army's radio is jammed (an ability): word only travels by voice. */
  get jammed() {
    return this.time < this.jamUntil;
  }

  /** Spawn army soldiers on foot (reinforcements, attack waves) and, with a goal, send them in as a bounding assault. */
  spawnGroup(defs, {group, goal, beliefs = []} = {}) {
    const made = defs.map((f, i) => {
      const u = this.footSoldier(
        {...f, id: f.id || `${group}-${i}`, group, state: f.state || (goal ? 'bound' : 'secure')},
        this.units.length,
      );
      u.alert = true;
      u.reactAt = this.time + 0.5;
      for (const b of beliefs) u.beliefs.push({...b});
      return u;
    });
    if (goal) this.assaults.push({group, goal: {...goal}, moving: 0, since: this.time});
    return made;
  }

  /**
   * Scheduled attacks (level.waves): {at, text?, squads: [{group, units, goal?, state?}], vehicle?: {...convoy entry, x, z}}.
   * A squad's units carry their own spawn points; the goal defaults to where the nearest rebel stands.
   */
  runWaves() {
    for (const w of this.waves) {
      if (w.spawned || this.time < w.at) continue;
      w.spawned = true;
      this.alarm || this.raiseAlarm(null);
      let first = null;
      for (const sq of w.squads || []) {
        const g = sq.goal || this.player;
        const made = this.spawnGroup(sq.units, {group: sq.group, goal: sq.goal === null ? null : {x: g.x, z: g.z}});
        first ||= made[0];
      }
      if (w.vehicle) {
        const v = this.addVehicle(w.vehicle, w.vehicle.x, w.vehicle.z);
        v.stopped = true;
        v.stopAt = this.time;
        first ||= v.crew[0];
      }
      if (first && w.text) this.say(first, w.text, 'wave-' + w.at, 99);
    }
  }
  get wavesDone() {
    return this.waves.every(w => w.spawned);
  }

  raiseAlarm(by) {
    if (this.alarm) return;
    this.alarm = true;
    this.sound({type: 'alarm', x: by?.x ?? 0, z: by?.z ?? 0});
    this.alarmAt = this.time;
    for (const v of this.vehicles) {
      v.stopped = true;
      v.stopAt = this.time;
    }
    if (this.alarmMode === 'global') {
      // Human reaction: nobody returns fire the instant the ambush opens (quicker when the army is alert).
      for (const u of this.units)
        if (u.side === 'army') {
          u.reactAt = this.time + (0.5 + this.rand()) * (1.4 - this.awareness * 0.8) * this.difficulty.react;
          u.alert = true;
        }
    } else if (by?.side === 'army') this.alert(by);
    if (by?.side === 'army') this.say(by, 'Ambush! Contact north!', 'contact');
  }

  startReload(u, wid = u.weapon) {
    const W = WEAPONS[wid];
    const real = this.ammo?.owns(u, wid);
    if (u.reload > 0 || (real ? !this.ammo.canReload(u, wid) : u.mags[wid] >= W.mag || u.reserve[wid] <= 0)) return false;
    u.reload = W.reload * (u.mods?.reload ?? 1);
    u.reloadTime = u.reload;
    u.reloading = wid;
    if (!real && u.reserve[wid] !== Infinity) u.reserve[wid]--;
    this.sound({type: 'reload', x: u.x, z: u.z, weapon: wid, seconds: u.reload, unit: u.id, side: u.side});
    if (u !== this.player) this.say(u, this.bark(u, 'reload', 'Reloading!'), 'reload', 6);
    return true;
  }

  /**
   * Fire one round of weapon `wid` from u toward (tx, tz). extra: added spread (radians), e.g. for suppressive fire.
   * Bullets are hitscan; explosives burst where they hit; lobbed rounds arc over cover to land near the aim point.
   */
  shoot(u, tx, tz, extra = 0, wid = u.weapon) {
    const W = WEAPONS[wid];
    if (u.side === 'army' && !this.onScreen(u)) return false; // off the player's screen: holds fire
    if (u.reload > 0 || u.cd > 0 || !u.alive || !(wid in u.mags)) return false;
    if (u.mags[wid] <= 0) {
      this.startReload(u, wid);
      return false;
    }
    u.mags[wid]--;
    const mult = this.ammo?.owns(u, wid) ? this.ammo.fired(u, wid) : 1; // the round fired: its damage against the issue round
    u.cd = W.cd;
    const base = Math.atan2(tz - u.z, tx - u.x);
    u.facing = base;
    // Aim: the class's marksmanship, a bipod set up (not moving), a held breath (one shot), the army's by difficulty.
    if (u.moving) u.bipod = false;
    const skill = (u.mods?.spread ?? 1) * (u.bipod ? 0.55 : 1) * (u.steady ? 0.2 : 1) * (u.side === 'army' ? this.difficulty.spread : 1);
    u.steady = 0;
    const sigma =
      W.spread * (u === this.player ? 0.9 : 1.5) * skill +
      u.supp * 0.1 * (u.armour ?? 1) +
      (u.moving ? 0.045 : 0) +
      (u.sprinting ? 0.09 : 0) +
      extra;
    const g = (this.rand() + this.rand() + this.rand() - 1.5) * 1.15; // ~normal
    const a = base + g * sigma,
      dx = Math.cos(a),
      dz = Math.sin(a);
    const ox = u.x + dx * (u.r + 0.05),
      oz = u.z + dz * (u.r + 0.05);
    if (u.side === 'partisan') this.raiseAlarm(null);
    hear(this, u);
    if (W.lob) {
      // Indirect: lands short or long of the aim point by the spread, whatever is in between.
      const d = Math.min(W.range, Math.hypot(tx - u.x, tz - u.z)) * (1 + g * W.spread * 2);
      const x1 = u.x + dx * d,
        z1 = u.z + dz * d;
      this.tracers.push({x0: ox, z0: oz, x1, z1, side: u.side, weapon: wid, t: this.time, unit: u.id});
      this.sound({type: 'shot', x: ox, z: oz, x1, z1, weapon: wid, side: u.side, unit: u.id});
      this.launch(u, wid, ox, oz, x1, z1, {lob: true, mult});
      return true;
    }
    // Every box the round could hit; a turret gunner sits above his own hull, so that box does not shield him.
    const boxHits = [],
      ex = ox + dx * W.range,
      ez = oz + dz * W.range;
    const grid = (this._grid ||= coverGrid(this.level.cover));
    const near = [...grid.along(ox, oz, ex, ez, [], true).map(n => this.level.cover[n]), ...this.dynamicBoxes()];
    for (const b of near) {
      if (inBox(u.x, u.z, b, 0.1)) continue;
      const t = segmentBox(ox, oz, ox + dx * W.range, oz + dz * W.range, b);
      if (t <= 1) boxHits.push({s: t * W.range, b});
    }
    const blockFor = o => boxHits.reduce((m, h) => (o?.state === 'turret' && h.b.vehicle === o.vehicle ? m : Math.min(m, h.s)), W.range);
    let best = blockFor(null),
      hit = null;
    for (const o of this.units) {
      if (o === u || !o.alive || o.escaped || o.state === 'mounted' || o.side === u.side) continue;
      const s = rayCircle(ox, oz, dx, dz, o.x, o.z, o.r);
      if (s < blockFor(o) && s < (hit ? best : Infinity)) {
        best = s;
        hit = o;
      }
    }
    if (!hit) best = blockFor(null);
    const hitBox = hit ? null : boxHits.find(h => Math.abs(h.s - best) < 1e-6)?.b || null;
    const x1 = ox + dx * best,
      z1 = oz + dz * best;
    this.tracers.push({x0: ox, z0: oz, x1, z1, side: u.side, weapon: wid, t: this.time, unit: u.id});
    if (this.tracers.length > 80) this.tracers.shift();
    this.sound({type: 'shot', x: ox, z: oz, x1, z1, weapon: wid, side: u.side, unit: u.id});
    // Near misses suppress (less behind a gun shield).
    for (const o of this.units) {
      if (!o.alive || o.side === u.side || o === hit) continue;
      const px = o.x - ox,
        pz = o.z - oz,
        along = px * dx + pz * dz;
      if (along > 0 && along < best + 1.5 && Math.abs(px * dz - pz * dx) < 2.6)
        o.supp = Math.min(1, o.supp + W.supp * (u.mods?.suppOut ?? 1) * (u.bipod ? 1.25 : 1) * (o.armour ?? 1));
    }
    this.launch(u, wid, ox, oz, x1, z1, {hit, hitBox, mult});
    return true;
  }

  /** Throw a hand grenade from u toward (x, z): it arcs over cover, lands within its range and goes off on landing. */
  throwGrenade(u, x, z) {
    if (!u.alive || !(u.grenades > 0) || this.time < (u.grenadeAt ?? 0)) return false;
    const W = munition('frag'),
      d = Math.max(0.5, Math.hypot(x - u.x, z - u.z)),
      k = d > W.range ? W.range / d : 1;
    // a thrown grenade scatters a little with the distance
    const s = (this.rand() - 0.5) * d * 0.08,
      a = Math.atan2(z - u.z, x - u.x);
    const x1 = u.x + (x - u.x) * k + Math.cos(a + Math.PI / 2) * s,
      z1 = u.z + (z - u.z) * k + Math.sin(a + Math.PI / 2) * s;
    u.grenades--;
    u.grenadeAt = this.time + 1;
    u.facing = a;
    this.sound({type: 'throw', x: u.x, z: u.z, unit: u.id, side: u.side});
    this.launch(u, 'frag', u.x, u.z, x1, z1, {lob: true});
    if (u.side === 'partisan' && u !== this.player) this.say(u, 'Grenade out!', 'nade', 3);
    return true;
  }

  /** A round leaves the muzzle: it lands after its flight time (weapon speed), or at once without one. */
  launch(u, wid, x0, z0, x1, z1, {hit = null, hitBox = null, lob = false, mult = 1} = {}) {
    const W = munition(wid),
      d = Math.hypot(x1 - x0, z1 - z0),
      flight = W.speed ? Math.max(lob ? 0.45 : 0, d / W.speed) : 0;
    const p = {x0, z0, x1, z1, t0: this.time, t1: this.time + flight, weapon: wid, side: u.side, by: u, hit, hitBox, lob, mult};
    if (flight <= 0) this.land(p);
    else this.projectiles.push(p);
  }

  /** A round arrives: a burst for explosives, damage to whoever it was going to hit, otherwise a strike on cover or ground. */
  land(p) {
    const W = munition(p.weapon),
      by = p.by;
    if (p.hit) {
      // a round decided as a hit lands on the target wherever it has moved to
      p.x1 = p.hit.x;
      p.z1 = p.hit.z;
    }
    if (W.splash) return this.explode(p.x1, p.z1, W, by, p.hitBox);
    let surface = p.hitBox?.vehicle || p.hitBox?.target ? 'metal' : p.hitBox ? 'wall' : 'ground';
    if (p.hit && p.hit.alive && !p.hit.escaped) {
      surface = 'flesh';
      this.damage(p.hit, by, W.damage * (p.mult ?? 1));
    } else if (p.hitBox?.target && by.side === 'partisan') this.damageTarget(p.hitBox.target, W.damage * 0.5, by);
    this.sound({type: 'impact', x: p.x1, z: p.z1, surface});
    this.impacts.push({x: p.x1, z: p.z1, surface, weapon: p.weapon, t: this.time, dx: p.x1 - p.x0, dz: p.z1 - p.z0});
    if (this.impacts.length > 80) this.impacts.shift();
  }

  /** Land every round due by `until` (all of them with Infinity). */
  resolveProjectiles(until = this.time) {
    if (!this.projectiles.some(p => p.t1 <= until)) return;
    const due = this.projectiles.filter(p => p.t1 <= until);
    this.projectiles = this.projectiles.filter(p => p.t1 > until);
    for (const p of due) this.land(p);
  }

  /** An explosive bursts at (x, z): splash damage with falloff, heavy suppression, and damage to a vehicle it struck. */
  explode(x, z, W, by, hitBox) {
    this.explosions.push({x, z, r: W.splash.r, t: this.time});
    if (!W.silent) this.sound({type: 'explode', x, z, r: W.splash.r, lob: !!W.lob});
    if (by?.side === 'partisan') this.raiseAlarm(null);
    if (this.explosions.length > 20) this.explosions.shift();
    for (const o of this.units) {
      if (!o.alive || o.escaped || o.state === 'mounted') continue;
      const d = Math.hypot(o.x - x, o.z - z);
      if (d < W.splash.r && (d < 1 || this.los(x, z, o.x, o.z)))
        this.damage(o, by, W.splash.damage * (1 - d / W.splash.r) * (o.armour ?? 1));
      if (o.alive && d < W.splash.r * 2.5) o.supp = Math.min(1, o.supp + 0.6 * (o.armour ?? 1));
    }
    for (const v of this.vehicles) {
      const direct = hitBox?.vehicle === v;
      const near = Math.max(Math.abs(x - v.x) - v.w / 2, Math.abs(z - v.z) - v.d / 2, 0);
      if (direct || near < W.splash.r * 0.4) this.damageVehicle(v, W.vehicle * (direct ? 1 : 0.3), by);
    }
    for (const t of this.targets) {
      if (t.destroyed) continue;
      const direct = hitBox?.target === t;
      const near = Math.max(Math.abs(x - t.x) - t.w / 2, Math.abs(z - t.z) - t.d / 2, 0);
      if (direct || near < W.splash.r * 0.5) this.damageTarget(t, (W.vehicle || W.splash.damage) * (direct ? 1 : 0.4), by);
    }
    // Whoever is close shouts what it was.
    const word = W.lob ? 'Grenade!' : W === munition('mine') ? 'Mine!' : W === munition('fpv') ? 'Drone!' : 'RPG!';
    const near = this.units
      .filter(o => o.alive && o.side !== by.side && Math.hypot(o.x - x, o.z - z) < 14)
      .sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z))[0];
    if (near && near !== this.player) this.say(near, word, 'blast', 3);
  }

  /** Damage a destructible structure; the radio mast going down cuts the army's radio. */
  damageTarget(t, amount, by) {
    if (t.destroyed || !amount) return;
    t.hp -= amount;
    if (t.hp > 0) return;
    t.hp = 0;
    t.destroyed = true;
    this.explosions.push({x: t.x, z: t.z, r: 3, t: this.time});
    this.sound({type: 'collapse', x: t.x, z: t.z});
    if (t.radio) {
      this.radioDown = true;
      const mate = this.units.filter(m => m.alive && m.side === 'army').sort((a, b) => dist(a, t) - dist(b, t))[0];
      if (mate) this.say(mate, "The mast's down! No radio!", 'mast', 99);
    }
    if (by?.side === 'partisan') this.raiseAlarm(null);
  }

  damageVehicle(v, amount, by) {
    if (v.destroyed || !amount) return;
    v.hp -= amount * (by?.mods?.vehicleDamage ?? 1);
    if (v.hp > 0) return;
    v.hp = 0;
    v.destroyed = true;
    v.stopped = true;
    v.burningUntil = this.time + 45;
    this.sound({type: 'wreck', x: v.x, z: v.z, id: v.id});
    for (const u of v.crew) if (u.alive && (u.state === 'mounted' || u.state === 'turret')) this.damage(u, by, 999);
    // the fuel goes up: a blast round the wreck that hurts whoever is near and can set off the next vehicle
    this.explode(v.x, v.z, munition('wreck'), by, {vehicle: v});
    const mate = this.units.filter(m => m.alive && m.side === 'army').sort((a, b) => dist(a, v) - dist(b, v))[0];
    if (mate) this.say(mate, v.kind === 'mrap' ? "We've lost the MRAP!" : 'Vehicle down!', 'vehicle', 3);
  }

  damage(o, by, amount = DAMAGE) {
    amount *= by?.mods?.damage ?? 1;
    if (o.side === 'partisan') amount *= this.difficulty.taken * (o.mods?.taken ?? 1);
    o.hp -= amount;
    o.supp = Math.min(1, o.supp + 0.4);
    if (o.hp > 0) {
      this.sound({type: 'hurt', x: o.x, z: o.z, unit: o.id, side: o.side});
      return;
    }
    this.sound({type: 'death', x: o.x, z: o.z, unit: o.id, side: o.side});
    o.alive = false;
    o.state = 'down';
    o.moveTo = null;
    // Whatever the casualty was carrying drops where he fell, to be picked up again (hold E).
    for (const it of this.items)
      if (it.taken && it.takenBy === o.id) Object.assign(it, {taken: false, takenBy: null, progress: 0, x: o.x, z: o.z});
    if (by.side === 'partisan') this.kills[by.id] = (this.kills[by.id] || 0) + 1;
    if (by.side === 'partisan' && by !== this.player) this.say(by, this.bark(by, 'kill', 'Target down!'), 'kill', 3);
    else if (by.side === 'army' && o.side === 'partisan') this.say(by, this.bark(by, 'kill', 'Got one!'), 'kill', 3);
    if (o.role === 'rto') {
      const m = this.units.find(x => x.alive && x.side === 'army');
      if (m) this.say(m, "Radio's down!", 'radio', 99);
    }
    // The nearest comrade who can see the body calls it.
    const mates = this.units.filter(m => m.alive && m.side === o.side && m !== o).sort((a, b) => dist(a, o) - dist(b, o));
    if (mates[0] && dist(mates[0], o) < 25)
      this.say(
        mates[0],
        o === this.player ? "You're hit!" : this.bark(mates[0], 'mateDown', o.side === 'army' ? 'Man down!' : `${o.name} is down!`, o.name),
        'mandown',
        2,
      );
  }

  /** Move u toward u.moveTo with sliding collision; returns true on arrival. */
  move(u, dt) {
    u.moving = false;
    if (!u.moveTo) return true;
    const dx = u.moveTo.x - u.x,
      dz = u.moveTo.z - u.z,
      d = Math.hypot(dx, dz);
    if (d < 0.35) {
      u.moveTo = null;
      return true;
    }
    const step = Math.min(d, u.speed * this.pace(u) * (1 - u.supp * 0.4) * dt);
    this.slide(u, (dx / d) * step, (dz / d) * step);
    u.facing = Math.atan2(dz, dx);
    u.moving = true;
    return false;
  }

  /** Speed multiplier from the class and a dash ability. */
  pace(u) {
    return (u.mods?.speed ?? 1) * (this.time < (u.dashUntil ?? -1) ? (u.dashMult ?? 1.6) : 1);
  }

  slide(u, sx, sz) {
    const B = this.level.bounds;
    const hits = b => inBox(x0, z0, b, u.r);
    let x0, z0;
    const blocked = (x, z) => {
      if (x < B.minX || x > B.maxX || z < B.minZ || z > B.maxZ) return true;
      [x0, z0] = [x, z];
      if (u.r > PAD) return this.boxes().some(hits); // larger than the grid files cover for: test everything
      return this.someCoverNear(x, z, x, z, hits) || this.dynamicBoxes().some(hits);
    };
    const ox = u.x,
      oz = u.z;
    if (!blocked(u.x + sx, u.z)) u.x += sx;
    if (!blocked(u.x, u.z + sz)) u.z += sz;
    if (u.x === ox && u.z === oz && (sx || sz)) {
      // stuck on a corner: step sideways along the obstacle
      const px = -sz,
        pz = sx;
      if (!blocked(u.x + px, u.z + pz)) {
        u.x += px;
        u.z += pz;
      } else if (!blocked(u.x - px, u.z - pz)) {
        u.x -= px;
        u.z -= pz;
      }
    }
  }

  /** A mine bursts under a soldier on foot or a vehicle that drives over it. */
  tripMines() {
    for (const m of [...this.mines]) {
      const on =
        this.units.some(
          o => o.side === 'army' && o.alive && o.state !== 'mounted' && o.state !== 'turret' && Math.hypot(o.x - m.x, o.z - m.z) < 1.3,
        ) || this.vehicles.find(v => !v.destroyed && inBox(m.x, m.z, v, 0.4));
      if (!on) continue;
      this.mines.splice(this.mines.indexOf(m), 1);
      this.explode(m.x, m.z, munition('mine'), m.by, on.w ? {vehicle: on} : null);
    }
  }

  driveConvoy(dt) {
    this.vehicles.forEach((v, i) => {
      if (v.stopped) return;
      const C = this.level.convoy;
      const front = i === 0 ? C.stopX : this.vehicles[i - 1].x - this.vehicles[i - 1].w / 2 - 4;
      const nx = Math.min(v.x + C.speed * dt, front - v.w / 2);
      if (nx <= v.x + 1e-6 && i === 0 && !v.stopped) {
        v.stopped = true;
        v.stopAt = this.time;
        this.say(v.crew[0], 'Road blocked! Everyone out!', 'blocked', 99);
      }
      v.x = Math.max(v.x, nx);
      if (i > 0 && this.vehicles[0].stopped && v.x >= front - v.w / 2 - 0.01 && !v.stopped) {
        v.stopped = true;
        v.stopAt = this.time;
      }
      for (const u of v.crew) if (u.state === 'mounted' || u.state === 'turret') u.x = v.x;
    });
  }

  /**
   * Advance the world.
   * @param {number} dt seconds (fixed step)
   * @param {{mx?: number, mz?: number, ax?: number, az?: number, fire?: boolean, reload?: boolean, sneak?: boolean, weapon?: string}} input player controls
   */
  step(dt, input = {}) {
    if (this.outcome) return;
    ensureControl(this);
    this.time += dt;
    this.resolveProjectiles();
    for (const o of input.orders || []) this.order(o.ids, o);
    this.driveConvoy(dt);
    this.runWaves();
    this.tripMines();
    if (this.smokes.length && this.smokes[0].until < this.time) this.smokes = this.smokes.filter(c => c.until >= this.time);
    if (this.reveals.length > 30) this.reveals.splice(0, this.reveals.length - 30);
    // comms in flight
    // (split first: a delivery can send new messages, e.g. a radio operator relaying what he heard)
    const due = this.messages.filter(m => m.at <= this.time);
    this.messages = this.messages.filter(m => m.at > this.time);
    for (const m of due) if (m.to.alive) receive(this, m.to, m.belief);
    for (const u of this.units) {
      if (!u.alive) continue;
      u.cd = Math.max(0, u.cd - dt);
      u.supp = Math.max(0, u.supp - dt * 0.18 * (u.mods?.recover ?? 1));
      if (u.reload > 0 && (u.reload -= dt) <= 0) {
        u.reload = 0;
        if (u.reloading)
          u.mags[u.reloading] = this.ammo?.owns(u, u.reloading) ? this.ammo.reloaded(u, u.reloading) : WEAPONS[u.reloading].mag;
        u.reloading = null;
      }
      decay(this, u, dt);
    }
    // player
    const p = this.player;
    if (p.alive) {
      const len = Math.hypot(input.mx || 0, input.mz || 0);
      // Shift sprints while there is stamina (it drains in about five seconds and comes back resting); Ctrl sneaks
      p.sprinting = !!input.sprint && !input.sneak && len > 0 && (p.stamina ?? 1) > 0.02;
      p.stamina = Math.max(0, Math.min(1, (p.stamina ?? 1) + (p.sprinting ? -0.2 : len > 0 ? 0.08 : 0.16) * dt));
      p.speed = input.sneak ? SPEED.sneak : p.sprinting ? SPEED.sprint : SPEED.run;
      p.moving = len > 0;
      const v = p.speed * this.pace(p);
      if (len > 0) this.slide(p, ((input.mx || 0) / len) * v * dt, ((input.mz || 0) / len) * v * dt);
      if (input.ax !== undefined) p.facing = Math.atan2(input.az - p.z, input.ax - p.x);
      if (input.weapon && input.weapon !== p.weapon && p.weapons.includes(input.weapon)) {
        p.weapon = input.weapon;
        p.reload = 0;
        p.reloading = null;
        p.cd = 0.35; // bring it up
        this.sound({type: 'switch', x: p.x, z: p.z, weapon: p.weapon, unit: p.id});
      }
      if (input.reload) this.startReload(p);
      if (p.mags[p.weapon] === 0 && p.reload === 0) this.startReload(p);
      if (input.fire && input.ax !== undefined) this.shoot(p, input.ax, input.az);
      if (input.grenade && input.ax !== undefined) this.throwGrenade(p, input.ax, input.az);
      this.interact(p, !!input.interact, dt);
    }
    // AI: perception and decisions at 5 Hz per unit (staggered), actions every step
    for (const u of this.units) {
      if (!u.alive || u.escaped || u === p) continue;
      if (this.time >= u.thinkAt) {
        u.thinkAt = this.time + 0.2;
        perceive(this, u);
        if (u.side === 'army') armyThink(this, u);
        else partisanThink(this, u);
      }
      if (u.side === 'army') armyAct(this, u, dt);
      else partisanAct(this, u, dt);
    }
    if (p.alive && this.time >= p.thinkAt) {
      p.thinkAt = this.time + 0.2;
      perceive(this, p);
    }
    if (this.time >= this.squad.nextThink) {
      this.squad.nextThink = this.time + 1;
      squadThink(this);
    }
    this.checkOutcome();
  }

  /**
   * Give teammates an order (see partisanThink in convoy/ai.js): {type: 'hold'|'follow'|'move'|'attack'|'cover', x?, z?, target?, angle?}.
   * @param {string[]} ids partisan ids (the player is ignored)
   */
  /** Is this point on the player's screen (always true with no screen, as in tests)? 1 m inside the edge. */
  onScreen(u) {
    const v = this.view;
    return !v || (u.x > v.x0 + 1 && u.x < v.x1 - 1 && u.z > v.z0 + 1 && u.z < v.z1 - 1);
  }
  order(ids, order) {
    const ACK = {hold: 'Holding.', follow: 'On you.', move: 'Moving.', attack: 'Engaging.', cover: 'Watching that sector.'};
    for (const u of this.units) {
      if (u.side !== 'partisan' || u === this.player || !u.alive || !ids.includes(u.id)) continue;
      u.order = {...order};
      if (order.type === 'hold' && order.x === undefined) Object.assign(u.order, {x: u.x, z: u.z});
      u.moveTo = null;
      u.thinkAt = this.time; // react on this step
      this.say(u, ACK[order.type] || 'Copy.', 'ack', 0);
    }
  }

  /** Hold E next to an item to take it: progress fills over item.search seconds, and resets if you let go or move off. */
  interact(u, holding, dt) {
    const item = this.items
      .filter(i => !i.taken && Math.hypot(i.x - u.x, i.z - u.z) < 1.8)
      .sort((a, b) => Math.hypot(a.x - u.x, a.z - u.z) - Math.hypot(b.x - u.x, b.z - u.z))[0];
    for (const i of this.items) if (i !== item || !holding) i.progress = 0;
    u.searching = holding && item ? item : null;
    if (!u.searching) return;
    item.progress += dt * (u.mods?.interact ?? 1);
    if (item.progress >= (item.search ?? 3)) {
      item.taken = true;
      item.takenBy = u.id;
      this.taken.add(item.id);
      this.say(u, `Got the ${item.label.toLowerCase()}!`, 'taken-' + item.id, 99);
    }
  }

  checkOutcome() {
    this.outcome = evaluate(this);
    ensureControl(this);
  }

  /** What the debrief shows. */
  debrief() {
    const s = this.stats();
    const squad = this.units.filter(u => u.side === 'partisan');
    return {
      outcome: this.outcome,
      time: this.time,
      objectives: this.objectives.map(o => ({id: o.id, label: o.label, state: o.state, optional: !!o.optional})),
      kills: Object.values(this.kills).reduce((a, b) => a + b, 0),
      byPartisan: squad.map(u => ({
        id: u.id,
        name: u.name,
        kills: this.kills[u.id] || 0,
        state: !u.alive ? 'down' : u.hp < 100 ? 'wounded' : 'fit',
      })),
      taken: this.items.filter(i => i.taken).map(i => i.label),
      ...s,
    };
  }

  stats() {
    const army = this.units.filter(u => u.side === 'army');
    return {
      armyAlive: army.filter(u => u.alive && !u.escaped).length,
      armyDown: army.filter(u => !u.alive).length,
      escaped: army.filter(u => u.escaped).length,
      partisansAlive: this.units.filter(u => u.side === 'partisan' && u.alive).length,
      vehiclesDestroyed: this.vehicles.filter(v => v.destroyed).length,
    };
  }
}

export const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
