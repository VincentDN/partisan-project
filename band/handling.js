// Hands-on pawn for the Rebel Band screen: with the mouse over the big character (or the character focused), the
// movement keys walk it in place (it bobs), the mouse swings its weapon to aim while the character keeps facing you,
// a click or Space fires (recoil and a muzzle flash) and R reloads. When the mouse leaves, the weapon eases back to
// the angle it rests at. Pure state, no DOM: band.js feeds input and draws pose(),
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
/** The angle the weapon rests at, held across the body muzzle up (screen angles: x right, y down). */
export const REST_ANGLE = -0.6;
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * A controller for one pawn. The character always faces the viewer; only its weapon turns. `emit(type, data)` receives
 * 'step' {sprint}, 'shot' {profile}, 'dry', 'reload'
 * {profile} and 'reload-move' {bank, gain}. `reduceMotion` keeps the pawn still (no bob, no recoil travel, no dip
 * animation) while every action still happens and still sounds.
 */
export function createHandling({gun = null, emit = () => {}, reduceMotion = false} = {}) {
  const keys = new Set();
  let profile = profileFor(gun),
    mag = profile.mag,
    aim = null, // the mouse's screen angle while it is over the pawn
    gunAngle = REST_ANGLE, // where the weapon points while aimed
    rest = 1, // 1: the weapon in its resting pose; 0: aimed at gunAngle
    walk = 0, // stride phase (radians); a footfall each half turn
    moving = false,
    sprint = false,
    trigger = false,
    pressed = false, // a semi-automatic fires once per press
    cooldown = 0,
    kick = 0, // recoil, 1 at the shot, easing back
    flash = 0, // seconds of muzzle flash left
    reload = null; // {t, seen} while reloading
  const muzzleAngle = () => wrap(gunAngle + wrap(REST_ANGLE - gunAngle) * rest);

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
    emit('shot', {profile, angle: muzzleAngle()});
    return true;
  }

  return {
    /** A key went down or up; returns true when the pawn uses it (the page then stops it scrolling). */
    key(code, down, {shift = false} = {}) {
      sprint = shift;
      if (MOVE[code]) {
        if (down) keys.add(code);
        else keys.delete(code);
        return true;
      }
      if (!down) {
        if (code === 'Space' || code === 'KeyF') this.trigger(false);
        return code === 'Space' || code === 'KeyF' || code === 'KeyR';
      }
      if (code === 'KeyR') {
        startReload();
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
    },
    trigger(down) {
      if (down && !trigger) pressed = true;
      trigger = down;
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
        mz = 0;
      for (const k of keys) {
        mx += MOVE[k][0];
        mz += MOVE[k][1];
      }
      moving = mx !== 0 || mz !== 0;
      // the weapon follows the mouse; without it, it eases back to where it rests
      const k = reduceMotion ? 1 : Math.min(1, dt * 14);
      if (aim !== null) gunAngle = wrap(gunAngle + wrap(aim - gunAngle) * (rest > 0.5 ? 1 : k));
      rest += ((aim === null ? 1 : 0) - rest) * k;
      if (Math.abs(rest - Math.round(rest)) < 0.002) rest = Math.round(rest);
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
    },
    /**
     * What to draw: aim (the weapon's screen angle when aimed), rest (0..1, how far it is back in its resting pose),
     * bob (0..1 of a stride's lift), kick (recoil 0..1), dip (0..1, the gun lowered and tilted for the reload), flash
     * (true while the muzzle flashes). The character itself always faces the viewer.
     */
    pose() {
      const p = reload ? reload.t / profile.reload : 0;
      return {
        aim: gunAngle,
        rest,
        bob: reduceMotion || !moving ? 0 : Math.abs(Math.sin(walk)),
        kick: reduceMotion ? 0 : kick * profile.kick,
        dip: reload ? (reduceMotion ? 1 : Math.sin(Math.PI * Math.min(1, p * 1.15))) : 0,
        flash: flash > 0,
      };
    },
    /** True while the player is doing something with the pawn, or its weapon is still on its way back to rest. */
    get engaged() {
      return moving || trigger || !!reload || aim !== null || rest < 1 || flash > 0 || kick > 0;
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
