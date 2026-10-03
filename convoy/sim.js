// Convoy Ambush simulation: pure, deterministic (seeded), no three.js, so the AI can be unit-tested in node.
// Fixed-step: call step(dt, input) at 60 Hz. The renderer (convoy/game.js) only reads state and event lists.
import {LEVELS, DEFAULT_LEVEL} from './levels/index.js';
import {WEAPONS, ROLES, PARTISAN_LOADOUTS} from './weapons.js';
import {initObjectives, evaluate} from './objectives.js';
import {requestControl, selectControl, cancelControl, ensureControl, advanceControl} from './squad-control.js';
import {bestBelief, compass, perceive, hear, decay, armyThink, armyAct, partisanThink, partisanAct, squadThink, receive} from './ai.js';

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
  for (const [p, d, lo, hi] of [
    [ax, dx, minX, maxX],
    [az, dz, minZ, maxZ],
  ]) {
    if (Math.abs(d) < 1e-9) {
      if (p < lo || p > hi) return Infinity;
    } else {
      let ta = (lo - p) / d,
        tb = (hi - p) / d;
      if (ta > tb) [ta, tb] = [tb, ta];
      t0 = Math.max(t0, ta);
      t1 = Math.min(t1, tb);
      if (t0 > t1) return Infinity;
    }
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

export const DAMAGE = 34;
export const MAG = WEAPONS.ak.mag;
const SPEED = {walk: 3, run: 4.6, sneak: 1.8};

export class Sim {
  /**
   * @param {{level?: object|string, seed?: number, awareness?: number}} opts
   *   level: a level object or id (convoy/levels/index.js); awareness 0..1: how well the army perceives and communicates
   */
  constructor({level = DEFAULT_LEVEL, seed = 7, awareness = 0.5} = {}) {
    this.level = typeof level === 'string' ? LEVELS[level] : level;
    if (!this.level) throw new Error(`unknown level ${level}`);
    this.rand = rng(seed);
    this.awareness = awareness;
    this.time = 0;
    this.alarm = false; // the ambush has been sprung (or the army spotted the partisans)
    this.alarmAt = Infinity;
    this.outcome = null; // 'won' | 'lost'
    this.tracers = []; // {x0,z0,x1,z1,side,weapon,t}
    this.explosions = []; // {x,z,r,t}
    this.callouts = []; // {id, name, side, text, t}
    this.messages = []; // comms in flight: {at, to, belief, from}
    this.squad = {contactSince: Infinity, flanking: false, retreating: false, nextThink: 0};
    this.objectives = initObjectives(this.level);
    this.items = (this.level.items || []).map(i => ({...i, progress: 0, taken: false})); // things to steal (hold E)
    this.taken = new Set();
    // Alarm: 'global' (the convoy: one shot and the whole column knows) or 'local' (word travels by voice, radio, gunfire)
    this.alarmMode = this.level.alarm || 'global';
    this.reinforcements = this.level.reinforcements ? {...this.level.reinforcements, state: 'idle'} : null;
    this.assaults = []; // bounding groups: {group, goal, moving: 0 | 1}
    this.kills = {}; // partisan id -> soldiers they put down
    this.vehicles = [];
    this.units = [];
    const L = this.level;
    let x = L.convoy?.startX ?? 0;
    for (const v of L.convoy?.vehicles || []) {
      x -= v.gap;
      const z = L.convoy.z;
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
    }
    (L.units || []).forEach((f, i) => this.footSoldier(f, i));
    for (const p of L.partisans) {
      const u = this.unit({
        id: p.id,
        name: p.label,
        role: 'partisan',
        side: 'partisan',
        x: p.x,
        z: p.z,
        weapons: p.weapons || PARTISAN_LOADOUTS[p.id] || ['ak'],
      });
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
    return [...this.level.cover, ...this.vehicles.map(v => ({x: v.x, z: v.z, w: v.w, d: v.d, h: v.h, kind: 'vehicle', vehicle: v}))];
  }

  /** Line of sight between two points (eye height is implied: every obstacle is taller than a crouching man). */
  los(ax, az, bx, bz) {
    for (const b of this.boxes()) {
      if (inBox(ax, az, b) || inBox(bx, bz, b)) continue;
      if (segmentBox(ax, az, bx, bz, b, -0.05) < 1) return false;
    }
    return true;
  }

  enemiesOf(u) {
    return this.units.filter(o => o.alive && !o.escaped && o.side !== u.side && o.state !== 'mounted');
  }

  say(u, text, key = text, every = 4) {
    if (!u.alive) return false;
    if (this.time - (u.said[key] ?? -Infinity) < every) return false;
    // One voice per line: a squadmate who just shouted the same thing covers it (beliefs are still shared).
    if (this.callouts.some(c => c.side === u.side && c.text === text && this.time - c.t < 2.5)) return false;
    u.said[key] = this.time;
    this.callouts.push({id: u.id, name: u.name, side: u.side, text, t: this.time});
    if (this.callouts.length > 60) this.callouts.shift();
    return true;
  }

  /** One soldier becomes alert: a moment of surprise first; in a global alarm everyone does at once. */
  alert(u) {
    if (u.alert || !u.alive) return;
    if (!this.alarm) return this.raiseAlarm(u);
    u.alert = true;
    u.reactAt = this.time + (0.5 + this.rand()) * (1.4 - this.awareness * 0.8);
    // A radio operator who hears of contact puts it out on the net at once.
    const b = u.role === 'rto' && this.alarmMode === 'local' ? bestBelief(u) : null;
    if (b) {
      this.say(u, `All units, contact ${compass(b.x - u.x, b.z - u.z)}!`, 'radio-net', 20);
      this.shareLocal(u, b);
    }
  }

  /** Radio a belief to the squad: arrives after a delay that shrinks with awareness, slightly blurred. */
  share(from, belief) {
    if (this.alarmMode === 'local') return this.shareLocal(from, belief);
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
    const radio = from.side === 'army' && this.units.some(u => u.side === 'army' && u.alive && u.role === 'rto' && u.alert);
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

  /** Spawn army soldiers on foot (reinforcements, attack waves) and, with a goal, send them in as a bounding assault. */
  spawnGroup(defs, {group, goal, beliefs = []} = {}) {
    const made = defs.map((f, i) => {
      const u = this.footSoldier({...f, id: f.id || `${group}-${i}`, group, state: goal ? 'bound' : 'secure'}, this.units.length);
      u.alert = true;
      u.reactAt = this.time + 0.5;
      for (const b of beliefs) u.beliefs.push({...b});
      return u;
    });
    if (goal) this.assaults.push({group, goal: {...goal}, moving: 0, since: this.time});
    return made;
  }

  raiseAlarm(by) {
    if (this.alarm) return;
    this.alarm = true;
    this.alarmAt = this.time;
    for (const v of this.vehicles) {
      v.stopped = true;
      v.stopAt = this.time;
    }
    if (this.alarmMode === 'global') {
      // Human reaction: nobody returns fire the instant the ambush opens (quicker when the army is alert).
      for (const u of this.units)
        if (u.side === 'army') {
          u.reactAt = this.time + (0.5 + this.rand()) * (1.4 - this.awareness * 0.8);
          u.alert = true;
        }
    } else if (by?.side === 'army') this.alert(by);
    if (by?.side === 'army') this.say(by, 'Ambush! Contact north!', 'contact');
  }

  startReload(u, wid = u.weapon) {
    const W = WEAPONS[wid];
    if (u.reload > 0 || u.mags[wid] >= W.mag || u.reserve[wid] <= 0) return false;
    u.reload = W.reload;
    u.reloading = wid;
    if (u.reserve[wid] !== Infinity) u.reserve[wid]--;
    if (u !== this.player) this.say(u, 'Reloading!', 'reload', 6);
    return true;
  }

  /**
   * Fire one round of weapon `wid` from u toward (tx, tz). extra: added spread (radians), e.g. for suppressive fire.
   * Bullets are hitscan; explosives burst where they hit; lobbed rounds arc over cover to land near the aim point.
   */
  shoot(u, tx, tz, extra = 0, wid = u.weapon) {
    const W = WEAPONS[wid];
    if (u.reload > 0 || u.cd > 0 || !u.alive || !(wid in u.mags)) return false;
    if (u.mags[wid] <= 0) {
      this.startReload(u, wid);
      return false;
    }
    u.mags[wid]--;
    u.cd = W.cd;
    const base = Math.atan2(tz - u.z, tx - u.x);
    u.facing = base;
    const sigma = W.spread * (u === this.player ? 0.9 : 1.5) + u.supp * 0.1 * (u.armour ?? 1) + (u.moving ? 0.045 : 0) + extra;
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
      this.tracers.push({x0: ox, z0: oz, x1, z1, side: u.side, weapon: wid, t: this.time});
      this.explode(x1, z1, W, u, null);
      return true;
    }
    // Every box the round could hit; a turret gunner sits above his own hull, so that box does not shield him.
    const boxHits = [];
    for (const b of this.boxes()) {
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
    this.tracers.push({x0: ox, z0: oz, x1, z1, side: u.side, weapon: wid, t: this.time});
    if (this.tracers.length > 80) this.tracers.shift();
    // Near misses suppress (less behind a gun shield).
    for (const o of this.units) {
      if (!o.alive || o.side === u.side || o === hit) continue;
      const px = o.x - ox,
        pz = o.z - oz,
        along = px * dx + pz * dz;
      if (along > 0 && along < best + 1.5 && Math.abs(px * dz - pz * dx) < 2.6) o.supp = Math.min(1, o.supp + W.supp * (o.armour ?? 1));
    }
    if (W.splash) this.explode(x1, z1, W, u, hitBox);
    else if (hit) this.damage(hit, u, W.damage);
    return true;
  }

  /** An explosive bursts at (x, z): splash damage with falloff, heavy suppression, and damage to a vehicle it struck. */
  explode(x, z, W, by, hitBox) {
    this.explosions.push({x, z, r: W.splash.r, t: this.time});
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
    // Whoever is close shouts what it was.
    const word = W.lob ? 'Grenade!' : 'RPG!';
    const near = this.units
      .filter(o => o.alive && o.side !== by.side && Math.hypot(o.x - x, o.z - z) < 14)
      .sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z))[0];
    if (near && near !== this.player) this.say(near, word, 'blast', 3);
  }

  damageVehicle(v, amount, by) {
    if (v.destroyed || !amount) return;
    v.hp -= amount;
    if (v.hp > 0) return;
    v.hp = 0;
    v.destroyed = true;
    v.stopped = true;
    for (const u of v.crew) if (u.alive && (u.state === 'mounted' || u.state === 'turret')) this.damage(u, by, 999);
    const mate = this.units.filter(m => m.alive && m.side === 'army').sort((a, b) => dist(a, v) - dist(b, v))[0];
    if (mate) this.say(mate, v.kind === 'mrap' ? "We've lost the MRAP!" : 'Vehicle down!', 'vehicle', 3);
  }

  damage(o, by, amount = DAMAGE) {
    o.hp -= amount;
    o.supp = Math.min(1, o.supp + 0.4);
    if (o.hp > 0) return;
    o.alive = false;
    o.state = 'down';
    o.moveTo = null;
    if (by.side === 'partisan') this.kills[by.id] = (this.kills[by.id] || 0) + 1;
    if (by.side === 'partisan' && by !== this.player) this.say(by, 'Target down!', 'kill', 3);
    if (o.role === 'rto') {
      const m = this.units.find(x => x.alive && x.side === 'army');
      if (m) this.say(m, "Radio's down!", 'radio', 99);
    }
    // The nearest comrade who can see the body calls it.
    const mates = this.units.filter(m => m.alive && m.side === o.side && m !== o).sort((a, b) => dist(a, o) - dist(b, o));
    if (mates[0] && dist(mates[0], o) < 25)
      this.say(mates[0], o.side === 'army' ? 'Man down!' : o === this.player ? "You're hit!" : `${o.name} is down!`, 'mandown', 2);
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
    const step = Math.min(d, u.speed * (1 - u.supp * 0.4) * dt);
    this.slide(u, (dx / d) * step, (dz / d) * step);
    u.facing = Math.atan2(dz, dx);
    u.moving = true;
    return false;
  }

  slide(u, sx, sz) {
    const B = this.level.bounds;
    const blocked = (x, z) => this.boxes().some(b => inBox(x, z, b, u.r)) || x < B.minX || x > B.maxX || z < B.minZ || z > B.maxZ;
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
    for (const o of input.orders || []) this.order(o.ids, o);
    this.driveConvoy(dt);
    // comms in flight
    // (split first: a delivery can send new messages, e.g. a radio operator relaying what he heard)
    const due = this.messages.filter(m => m.at <= this.time);
    this.messages = this.messages.filter(m => m.at > this.time);
    for (const m of due) if (m.to.alive) receive(this, m.to, m.belief);
    for (const u of this.units) {
      if (!u.alive) continue;
      u.cd = Math.max(0, u.cd - dt);
      u.supp = Math.max(0, u.supp - dt * 0.18);
      if (u.reload > 0 && (u.reload -= dt) <= 0) {
        u.reload = 0;
        if (u.reloading) u.mags[u.reloading] = WEAPONS[u.reloading].mag;
        u.reloading = null;
      }
      decay(this, u, dt);
    }
    // player
    const p = this.player;
    if (p.alive) {
      const len = Math.hypot(input.mx || 0, input.mz || 0);
      p.speed = input.sneak ? SPEED.sneak : SPEED.run;
      p.moving = len > 0;
      if (len > 0) this.slide(p, ((input.mx || 0) / len) * p.speed * dt, ((input.mz || 0) / len) * p.speed * dt);
      if (input.ax !== undefined) p.facing = Math.atan2(input.az - p.z, input.ax - p.x);
      if (input.weapon && input.weapon !== p.weapon && p.weapons.includes(input.weapon)) {
        p.weapon = input.weapon;
        p.reload = 0;
        p.reloading = null;
        p.cd = 0.35; // bring it up
      }
      if (input.reload) this.startReload(p);
      if (p.mags[p.weapon] === 0 && p.reload === 0) this.startReload(p);
      if (input.fire && input.ax !== undefined) this.shoot(p, input.ax, input.az);
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
    item.progress += dt;
    if (item.progress >= (item.search ?? 3)) {
      item.taken = true;
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
