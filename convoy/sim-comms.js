// Sim methods (convoy/sim.js): talk and alarm: speech bubbles and barks, sounds the AI hears, shared beliefs over the
// radio, waves, the alarm. Split out of sim.js (WP-QA17); installed on Sim.prototype there, so `this` is the sim.
import {bestBelief, compass} from './ai.js';
import {BARKS} from './banter-lines.js';
import {dist} from './sim-base.js';

export const commsMethods = {
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
  },

  /** One of the barks for `kind` on u's side (convoy/banter-lines.js), {name} filled in; `fallback` if there are none. */
  bark(u, kind, fallback, name = '') {
    const list = BARKS[u.side === 'army' ? 'army' : 'militia'][kind];
    if (!list?.length) return fallback;
    return list[Math.floor(this.voice() * list.length)].replace('{name}', name);
  },

  /** Queue a sound event (shot, impact, explode, reload, death, ...); capped so a headless run never grows it. */
  sound(e) {
    this.sounds.push({...e, t: this.time});
    if (this.sounds.length > 400) this.sounds.splice(0, this.sounds.length - 400);
  },

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
  },

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
  },

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
  },

  /** The army's radio is jammed (an ability): word only travels by voice. */
  get jammed() {
    return this.time < this.jamUntil;
  },

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
  },

  /**
   * Scheduled attacks (level.waves): {at, text?, squads: [{group, units, goal?, state?}], vehicle?: {...convoy entry, x, z}}.
   * A squad's units carry their own spawn points; the goal defaults to where the nearest rebel stands.
   */
  runWaves() {
    for (const w of this.waves) {
      if (w.spawned || this.time < w.at) continue;
      if (w.reserve) {
        const alive = this.units.filter(u => u.side === 'army' && u.alive && !u.escaped).length;
        const incoming = w.squads.reduce((n, s) => n + s.units.length, 0);
        if ((!this.alarm && alive > 0) || alive + incoming > w.activeLimit) continue;
      }
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
  },

  get wavesDone() {
    return this.waves.every(w => w.spawned);
  },

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
  },
};
