// Convoy Ambush simulation: pure, deterministic (seeded), no three.js, so the AI can be unit-tested in node.
// Fixed-step: call step(dt, input) at 60 Hz. The renderer (convoy/sprite-render.js) only reads state and event lists.
// The class's methods live in sim-units, sim-comms, sim-combat, sim-motion and sim-orders (installed below), its pure
// helpers and constants in sim-base (re-exported here) (WP-QA17).
import {kitFor, modsFor} from './abilities.js';
import {armyAct, armyThink, decay, partisanAct, partisanThink, perceive, receive, squadThink} from './ai.js';
import {coverGrid} from './cover-grid.js';
import {difficulty as difficultyOf} from './difficulty.js';
import {DEFAULT_LEVEL, LEVELS} from './levels/index.js';
import {sandbagsFor} from './levels/util.js';
import {initObjectives} from './objectives.js';
import {DEFAULT_SQUAD, REBEL_HEALTH, squadSpawns} from './roster.js';
import {GRENADES, SPEED, VISION, inBox, isLow, LOW_SHIELD, rng, segmentBox, segmentCircle, thinLevel} from './sim-base.js';
import {advanceControl, cancelControl, ensureControl, requestControl, selectControl} from './squad-control.js';
import {PARTISAN_LOADOUTS, WEAPONS} from './weapons.js';
import {unitMethods} from './sim-units.js';
import {commsMethods} from './sim-comms.js';
import {combatMethods} from './sim-combat.js';
import {motionMethods} from './sim-motion.js';
import {orderMethods} from './sim-orders.js';
export * from './sim-base.js';

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
    this.difficulty = {...difficultyOf(this.difficultyId)};
    if (this.level.response) {
      this.difficulty.react *= this.level.response.react;
      this.difficulty.spread *= this.level.response.spread;
    }
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
    // the level's own mines (a road charge, WP-W9): the band's, so setting one off raises the alarm
    for (const m of this.level.mines || []) this.mines.push({x: m.x, z: m.z, by: this.player});
    // a prepared ambush (WP-W8): sandbags in front of every fighter where they start
    if (this.level.prepared) this.fieldworks.push(...sandbagsFor(this.units.filter(u => u.side === 'partisan')));
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

  /** Line of sight between two points (eye height is implied: all but low cover is taller than a crouching man). */
  los(ax, az, bx, bz) {
    const blocks = b => !isLow(b) && !inBox(ax, az, b) && !inBox(bx, bz, b) && segmentBox(ax, az, bx, bz, b, -0.05) < 1;
    if (this.someCoverAlong(ax, az, bx, bz, blocks)) return false;
    for (const b of this.dynamicBoxes()) if (blocks(b)) return false;
    for (const c of this.smokes) if (this.time < c.until && segmentCircle(ax, az, bx, bz, c.x, c.z, c.r)) return false;
    return true;
  }

  /** The low cover (sandbags, logs) shielding (bx, bz) from (ax, az): just in front of b, not at a's feet; or null. */
  lowCover(ax, az, bx, bz) {
    const L = Math.hypot(bx - ax, bz - az);
    let found = null;
    const shields = b => {
      if (!isLow(b) || inBox(ax, az, b, 1.5)) return false;
      const t = segmentBox(ax, az, bx, bz, b, 0.2);
      if (t <= 1 && L * (1 - t) < LOW_SHIELD) found = b;
      return !!found;
    };
    if (this.someCoverAlong(ax, az, bx, bz, shields)) return found;
    for (const b of this.fieldworks) if (shields(b)) return found;
    return null;
  }

  enemiesOf(u) {
    return this.units.filter(o => o.alive && !o.escaped && o.side !== u.side && o.state !== 'mounted');
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
}

// the methods kept in their own modules (WP-QA17), installed as class methods are: not enumerable
for (const methods of [unitMethods, commsMethods, combatMethods, motionMethods, orderMethods])
  for (const [k, d] of Object.entries(Object.getOwnPropertyDescriptors(methods)))
    Object.defineProperty(Sim.prototype, k, {...d, enumerable: false});
