// Hands-on pawn for the Rebel Band screen: with the mouse over the big character (or the character focused), the
// movement keys walk it in place (it bobs and faces where it walks), the mouse turns it and its weapon to aim, a click
// or Space fires (recoil and a muzzle flash) and R reloads. Pure state, no DOM: band.js feeds input and draws pose(),
// and every audible moment is an event for band/handling-audio.js (`emit(type, data)`).
import {RELOADS} from '../convoy/soundscape.js';

/** How each weapon sprite handles: seconds between rounds, automatic or not, magazine, reload seconds and choreography. */
export const PROFILES = {
  rifle: {cadence: 0.1, auto: true, mag: 30, reload: 2.2, moves: 'ak', shot: {cat: 'shot-rifle', rate: 1, len: 0.9, gain: 0.55}, kick: 1},
  smg: {
    cadence: 0.075,
    auto: true,
    mag: 30,
    reload: 2,
    moves: 'ak',
    shot: {cat: 'shot-rifle', rate: 1.25, len: 0.6, gain: 0.45},
    kick: 0.7,
  },
  lmg: {
    cadence: 0.09,
    auto: true,
    mag: 100,
    reload: 4.2,
    moves: 'pkm',
    shot: {cat: 'shot-rifle', rate: 0.86, len: 0.8, gain: 0.6},
    kick: 1.2,
  },
  marksman: {
    cadence: 0.35,
    auto: false,
    mag: 10,
    reload: 2.6,
    moves: 'svd',
    shot: {cat: 'shot-sniper', rate: 1, len: 1.6, gain: 0.6},
    kick: 1.6,
  },
  bolt: {
    cadence: 1.1,
    auto: false,
    mag: 5,
    reload: 3,
    moves: 'svd',
    shot: {cat: 'shot-sniper', rate: 0.95, len: 1.8, gain: 0.6},
    kick: 1.8,
  },
  shotgun: {
    cadence: 0.7,
    auto: false,
    mag: 6,
    reload: 2.8,
    moves: 'gp',
    shot: {cat: 'shot-rifle', rate: 0.72, len: 1, gain: 0.65},
    kick: 2,
  },
  launcher: {
    cadence: 1.2,
    auto: false,
    mag: 1,
    reload: 3.2,
    moves: 'rpg',
    shot: {cat: 'rpg-launch', rate: 1, len: 2.2, gain: 0.6},
    kick: 2.2,
  },
};
const BY_GUN = {
  'set-smg': 'smg',
  'set-mp': 'smg',
  'set-lmg': 'lmg',
  rpk: 'lmg',
  'set-sniper': 'marksman',
  mk14: 'marksman',
  'set-bolt': 'bolt',
  'set-shotgun': 'shotgun',
  'set-rocket': 'launcher',
};
/** The handling profile for a gun sprite id (anything unknown handles as an assault rifle). */
export const profileFor = gunId => PROFILES[BY_GUN[gunId] || 'rifle'];

const MOVE = {
  KeyW: [0, -1],
  ArrowUp: [0, -1],
  KeyS: [0, 1],
  ArrowDown: [0, 1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};
const TURN = {KeyQ: -1, KeyE: 1};
const SOUTH = Math.PI / 2; // screen angles: x right, y down; facing the viewer is "south"
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

/** The sprite facing for a screen angle: east and west from the side, north and south from the back and front. */
export function facingDir(a) {
  const cx = Math.cos(a),
    cz = Math.sin(a);
  return Math.abs(cx) > Math.abs(cz) ? (cx > 0 ? 'east' : 'west') : cz > 0 ? 'south' : 'north';
}

/**
 * A controller for one pawn. `emit(type, data)` receives 'step' {sprint}, 'turn', 'shot' {profile}, 'dry', 'reload'
 * {profile} and 'reload-move' {bank, gain}. `reduceMotion` keeps the pawn still (no bob, no recoil travel, no dip
 * animation) while every action still happens and still sounds.
 */
export function createHandling({gun = null, emit = () => {}, reduceMotion = false} = {}) {
  const keys = new Set();
  let profile = profileFor(gun),
    mag = profile.mag,
    facing = SOUTH,
    aim = null, // the mouse's screen angle while it is over the pawn
    walk = 0, // stride phase (radians); a footfall each half turn
    moving = false,
    sprint = false,
    trigger = false,
    pressed = false, // a semi-automatic fires once per press
    cooldown = 0,
    kick = 0, // recoil, 1 at the shot, easing back
    flash = 0, // seconds of muzzle flash left
    reload = null, // {t, seen} while reloading
    lastDir = facingDir(facing),
    idleFor = 0; // seconds since the last input, for handing the pawn back to its idle pose

  function startReload() {
    if (reload || mag === profile.mag) return false;
    reload = {t: 0, seen: -1};
    trigger = false;
    emit('reload', {profile});
    return true;
  }
  /** Fire a round (or click empty); false while the gun is not ready, so a press waits for it. */
  function fire() {
    if (reload || cooldown > 0) return false;
    if (mag <= 0) {
      emit('dry', {profile});
      pressed = false;
      trigger = false;
      startReload();
      return true;
    }
    mag--;
    cooldown = profile.cadence;
    kick = 1;
    flash = 0.06;
    emit('shot', {profile, angle: facing});
    return true;
  }

  return {
    /** A key went down or up; returns true when the pawn uses it (the page then stops it scrolling). */
    key(code, down, {shift = false} = {}) {
      sprint = shift;
      if (MOVE[code] || TURN[code]) {
        if (down) keys.add(code);
        else keys.delete(code);
        idleFor = 0;
        return true;
      }
      if (!down) {
        if (code === 'Space' || code === 'KeyF') this.trigger(false);
        return code === 'Space' || code === 'KeyF' || code === 'KeyR';
      }
      if (code === 'KeyR') {
        startReload();
        idleFor = 0;
        return true;
      }
      if (code === 'Space' || code === 'KeyF') {
        this.trigger(true);
        return true;
      }
      return false;
    },
    /** Aim toward a point dx, dy pixels from the pawn's centre (screen axes); null when the mouse leaves. */
    aimAt(dx, dy) {
      aim = dx === null ? null : Math.atan2(dy, dx);
      if (aim !== null) idleFor = 0;
    },
    trigger(down) {
      if (down && !trigger) pressed = true;
      trigger = down;
      idleFor = 0;
    },
    /** Let go of everything (the mouse left, the page lost focus, a promotion started). */
    release() {
      keys.clear();
      trigger = false;
      aim = null;
    },
    setGun(id) {
      const next = profileFor(id);
      if (next !== profile) {
        profile = next;
        mag = next.mag;
        reload = null;
      }
    },
    step(dt) {
      dt = Math.min(dt, 0.1);
      let mx = 0,
        mz = 0,
        turn = 0;
      for (const k of keys) {
        if (MOVE[k]) {
          mx += MOVE[k][0];
          mz += MOVE[k][1];
        }
        if (TURN[k]) turn += TURN[k];
      }
      moving = mx !== 0 || mz !== 0;
      // facing: the mouse if it is over the pawn, else Q/E, else the way it walks
      const want = aim ?? (turn ? facing + turn * 3 * dt : moving ? Math.atan2(mz, mx) : facing);
      const d = wrap(want - facing);
      facing = wrap(aim !== null || turn || reduceMotion ? want : facing + d * Math.min(1, dt * 12));
      const dir = facingDir(facing);
      if (dir !== lastDir) {
        lastDir = dir;
        emit('turn', {dir});
      }
      if (moving) {
        const before = Math.floor(walk / Math.PI);
        walk += dt * (sprint ? 13 : 9);
        if (Math.floor(walk / Math.PI) !== before) emit('step', {sprint});
      } else walk = 0;
      cooldown = Math.max(0, cooldown - dt);
      if (trigger && (profile.auto || pressed) && fire()) pressed = false;
      kick = Math.max(0, kick - dt * 9);
      flash = Math.max(0, flash - dt);
      if (reload) {
        reload.t += dt;
        const p = Math.min(1, reload.t / profile.reload);
        for (const [when, bank, gain] of RELOADS[profile.moves] || RELOADS.ak)
          if (when > reload.seen && when <= p) emit('reload-move', {bank, gain});
        reload.seen = p;
        if (p >= 1) {
          reload = null;
          mag = profile.mag;
        }
      }
      if (moving || trigger || reload || aim !== null || flash > 0) idleFor = 0;
      else idleFor += dt;
    },
    /**
     * What to draw: dir (south, east, north, west), aim (the gun's screen angle), bob (0..1 of a stride's lift), kick
     * (recoil 0..1), dip (0..1, the gun lowered and tilted for the reload), flash (true while the muzzle flashes).
     */
    pose() {
      const p = reload ? reload.t / profile.reload : 0;
      return {
        dir: facingDir(facing),
        aim: facing,
        bob: reduceMotion || !moving ? 0 : Math.abs(Math.sin(walk)),
        kick: reduceMotion ? 0 : kick * profile.kick,
        dip: reload ? (reduceMotion ? 1 : Math.sin(Math.PI * Math.min(1, p * 1.15))) : 0,
        flash: flash > 0,
      };
    },
    /** True while the player is doing something with the pawn (or did within the last second and a half). */
    get engaged() {
      return idleFor < 1.5;
    },
    get mag() {
      return mag;
    },
    get reloading() {
      return !!reload;
    },
    get profile() {
      return profile;
    },
  };
}
