// Convoy Ambush simulation: pure, deterministic (seeded), no three.js, so the AI can be unit-tested in node.
// Fixed-step: call step(dt, input) at 60 Hz. The renderer (convoy/game.js) only reads state and event lists.
import {BOUNDS, COVER, PARTISAN_SPAWNS, CONVOY, CONVOY_START_X, CONVOY_SPEED, ROADBLOCK} from './world.js';
import {perceive, hear, decay, armyThink, armyAct, partisanThink, partisanAct, squadThink, receive} from './ai.js';

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
export const MAG = 30;
const RELOAD = 2.2;
const SPEED = {walk: 3, run: 4.6, sneak: 1.8};

export class Sim {
  /** @param {{seed?: number, awareness?: number}} opts awareness 0..1: how well the army perceives and communicates */
  constructor({seed = 7, awareness = 0.5} = {}) {
    this.rand = rng(seed);
    this.awareness = awareness;
    this.time = 0;
    this.alarm = false; // the ambush has been sprung (or the army spotted the partisans)
    this.alarmAt = Infinity;
    this.outcome = null; // 'won' | 'lost'
    this.tracers = []; // {x0,z0,x1,z1,side,t}
    this.callouts = []; // {id, name, side, text, t}
    this.messages = []; // comms in flight: {at, to, belief, from}
    this.squad = {contactSince: Infinity, flanking: false, retreating: false, nextThink: 0};
    this.vehicles = [];
    this.units = [];
    let x = CONVOY_START_X;
    for (const v of CONVOY) {
      x -= v.gap;
      const veh = {...v, x, z: 0, stopped: false, stopAt: Infinity, crew: []};
      this.vehicles.push(veh);
      v.crew.forEach((name, i) => {
        const u = this.unit({id: `${v.id}-${i}`, name, side: 'army', x, z: 0});
        u.state = 'mounted';
        u.vehicle = veh;
        u.leader = v.id === 'lead' && i === 0;
        veh.crew.push(u);
      });
    }
    for (const p of PARTISAN_SPAWNS) {
      const u = this.unit({id: p.id, name: p.label, side: 'partisan', x: p.x, z: p.z});
      u.state = 'hold';
      u.facing = Math.PI / 2; // facing the road (south, +z)
    }
    this.player = this.units.find(u => u.id === 'player');
  }

  unit(o) {
    const u = {
      r: 0.45,
      hp: 100,
      alive: true,
      escaped: false,
      facing: 0,
      mag: MAG,
      reload: 0,
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
    this.units.push(u);
    return u;
  }

  /** Static cover plus the vehicles, as boxes. */
  boxes() {
    return [...COVER, ...this.vehicles.map(v => ({x: v.x, z: v.z, w: v.w, d: v.d, h: v.h, kind: 'vehicle'}))];
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

  /** Radio a belief to the squad: arrives after a delay that shrinks with awareness, slightly blurred. */
  share(from, belief) {
    const delay = 0.4 + (1 - this.awareness) * 1.4;
    for (const to of this.units)
      if (to !== from && to.alive && to.side === from.side)
        this.messages.push({
          at: this.time + delay,
          to,
          from,
          belief: {...belief, err: belief.err + 2.5, conf: belief.conf * 0.85, src: 'told'},
        });
  }

  raiseAlarm(by) {
    if (this.alarm) return;
    this.alarm = true;
    this.alarmAt = this.time;
    for (const v of this.vehicles) {
      v.stopped = true;
      v.stopAt = this.time;
    }
    if (by?.side === 'army') this.say(by, 'Ambush! Contact north!', 'contact');
  }

  /** Fire one round from u toward (tx, tz). extra: added spread (radians), e.g. for suppressive fire. */
  shoot(u, tx, tz, extra = 0) {
    if (u.reload > 0 || u.cd > 0 || !u.alive) return false;
    if (u.mag <= 0) {
      u.reload = RELOAD;
      if (u.side === 'army' || u.id !== 'player') this.say(u, 'Reloading!', 'reload', 6);
      return false;
    }
    u.mag--;
    u.cd = u.id === 'player' ? 0.1 : 0.11;
    const base = Math.atan2(tz - u.z, tx - u.x);
    u.facing = base;
    const sigma = (u.id === 'player' ? 0.018 : 0.03) + u.supp * 0.1 + (u.moving ? 0.045 : 0) + extra;
    const g = (this.rand() + this.rand() + this.rand() - 1.5) * 1.15; // ~normal
    const a = base + g * sigma,
      dx = Math.cos(a),
      dz = Math.sin(a);
    const ox = u.x + dx * (u.r + 0.05),
      oz = u.z + dz * (u.r + 0.05);
    let best = 70,
      hit = null;
    for (const b of this.boxes()) {
      if (inBox(u.x, u.z, b, 0.1)) continue;
      const t = segmentBox(ox, oz, ox + dx * 70, oz + dz * 70, b);
      if (t * 70 < best) best = t * 70;
    }
    for (const o of this.units) {
      if (o === u || !o.alive || o.escaped || o.state === 'mounted' || o.side === u.side) continue;
      const s = rayCircle(ox, oz, dx, dz, o.x, o.z, o.r);
      if (s < best) {
        best = s;
        hit = o;
      }
    }
    const x1 = ox + dx * best,
      z1 = oz + dz * best;
    this.tracers.push({x0: ox, z0: oz, x1, z1, side: u.side, t: this.time});
    if (this.tracers.length > 80) this.tracers.shift();
    // Near misses suppress; anyone on the other side within earshot hears where the shot came from.
    for (const o of this.units) {
      if (!o.alive || o.side === u.side || o === hit) continue;
      const px = o.x - ox,
        pz = o.z - oz,
        along = px * dx + pz * dz;
      if (along > 0 && along < best + 1.5 && Math.abs(px * dz - pz * dx) < 2.6) o.supp = Math.min(1, o.supp + 0.22);
    }
    hear(this, u);
    if (u.side === 'partisan') this.raiseAlarm(null);
    if (hit) this.damage(hit, u);
    return true;
  }

  damage(o, by) {
    o.hp -= DAMAGE;
    o.supp = Math.min(1, o.supp + 0.4);
    if (o.hp > 0) return;
    o.alive = false;
    o.state = 'down';
    o.moveTo = null;
    if (by.side === 'partisan' && by.id !== 'player') this.say(by, 'Target down!', 'kill', 3);
    // The nearest comrade who can see the body calls it.
    const mates = this.units.filter(m => m.alive && m.side === o.side && m !== o).sort((a, b) => dist(a, o) - dist(b, o));
    if (mates[0] && dist(mates[0], o) < 25)
      this.say(mates[0], o.side === 'army' ? 'Man down!' : o.id === 'player' ? "You're hit!" : `${o.name} is down!`, 'mandown', 2);
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
    const blocked = (x, z) =>
      this.boxes().some(b => inBox(x, z, b, u.r)) || x < BOUNDS.minX || x > BOUNDS.maxX || z < BOUNDS.minZ || z > BOUNDS.maxZ;
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
      const front = i === 0 ? ROADBLOCK.x - ROADBLOCK.w / 2 - 3 : this.vehicles[i - 1].x - this.vehicles[i - 1].w / 2 - 4;
      const nx = Math.min(v.x + CONVOY_SPEED * dt, front - v.w / 2);
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
      for (const u of v.crew) if (u.state === 'mounted') u.x = v.x;
    });
  }

  /**
   * Advance the world.
   * @param {number} dt seconds (fixed step)
   * @param {{mx?: number, mz?: number, ax?: number, az?: number, fire?: boolean, reload?: boolean, sneak?: boolean}} input player controls
   */
  step(dt, input = {}) {
    if (this.outcome) return;
    this.time += dt;
    this.driveConvoy(dt);
    // comms in flight
    this.messages = this.messages.filter(m => {
      if (m.at > this.time) return true;
      if (m.to.alive) receive(this, m.to, m.belief);
      return false;
    });
    for (const u of this.units) {
      if (!u.alive) continue;
      u.cd = Math.max(0, u.cd - dt);
      u.supp = Math.max(0, u.supp - dt * 0.18);
      if (u.reload > 0 && (u.reload -= dt) <= 0) {
        u.reload = 0;
        u.mag = MAG;
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
      if (input.reload && p.reload === 0 && p.mag < MAG) p.reload = RELOAD;
      if (input.fire && input.ax !== undefined) this.shoot(p, input.ax, input.az);
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

  checkOutcome() {
    const army = this.units.filter(u => u.side === 'army');
    if (!this.player.alive) this.outcome = 'lost';
    else if (army.every(u => !u.alive || u.escaped)) this.outcome = 'won';
  }

  stats() {
    const army = this.units.filter(u => u.side === 'army');
    return {
      armyAlive: army.filter(u => u.alive && !u.escaped).length,
      armyDown: army.filter(u => !u.alive).length,
      escaped: army.filter(u => u.escaped).length,
      partisansAlive: this.units.filter(u => u.side === 'partisan' && u.alive).length,
    };
  }
}

export const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
