// Sim methods (convoy/sim.js): fire and damage: reloads, hitscan shots, grenades and lobbed rounds, explosions, damage
// to people, vehicles, targets. Split out of sim.js (WP-QA17); installed on Sim.prototype there, so `this` is the sim.
import {hear} from './ai.js';
import {coverGrid} from './cover-grid.js';
import {DAMAGE, dist, inBox, rayCircle, segmentBox} from './sim-base.js';
import {WEAPONS, munition} from './weapons.js';

export const combatMethods = {
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
  },

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
  },

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
  },

  /** A round leaves the muzzle: it lands after its flight time (weapon speed), or at once without one. */
  launch(u, wid, x0, z0, x1, z1, {hit = null, hitBox = null, lob = false, mult = 1} = {}) {
    const W = munition(wid),
      d = Math.hypot(x1 - x0, z1 - z0),
      flight = W.speed ? Math.max(lob ? 0.45 : 0, d / W.speed) : 0;
    const p = {x0, z0, x1, z1, t0: this.time, t1: this.time + flight, weapon: wid, side: u.side, by: u, hit, hitBox, lob, mult};
    if (flight <= 0) this.land(p);
    else this.projectiles.push(p);
  },

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
  },

  /** Land every round due by `until` (all of them with Infinity). */
  resolveProjectiles(until = this.time) {
    if (!this.projectiles.some(p => p.t1 <= until)) return;
    const due = this.projectiles.filter(p => p.t1 <= until);
    this.projectiles = this.projectiles.filter(p => p.t1 > until);
    for (const p of due) this.land(p);
  },

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
  },

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
  },

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
  },

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
  },
};
