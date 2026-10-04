// Partisan Tactical soundscape: gunfire, impacts, explosions, reloads, footsteps, vehicles and the place itself.
//
// Everything is synthesised with Web Audio except the reload handling, which uses the recorded foley bank the
// Workbench already ships (assets/audio/foley). The simulation queues sound events (sim.sounds: shot, impact,
// explode, reload, death, ...); update() drains them each frame and also polls the state that has no event
// (reload progress, footsteps, engines). Every sound is placed relative to the listener (the active rebel):
// it pans, quietens and loses its top end with distance, and arrives late by the speed of sound.
//
//   const sound = createSoundscape();        // one per page
//   sound.unlock();                           // from a user gesture (browsers keep audio closed until one)
//   sound.update(sim, {paused, scale});       // every frame
//   sound.setOn(false); sound.setVolume(0.6); sound.stats
import {WEAPONS} from './weapons.js';

const FOLEY = new URL('../assets/audio/foley/', import.meta.url);
// Real recordings (tools/audio/fetch-shooter-sounds.mjs: CC0 field, range and military recordings from Freesound).
// Where a category has loaded, it replaces the synthesis below; until then, or without it, the synthesis plays.
const REAL = new URL('../assets/audio/shooter/', import.meta.url);
/** Which recording each weapon fires with: category, pitch, how much of the clip a single round lets ring, level. */
export const SHOT_SAMPLES = {
  ak: {cat: 'shot-rifle', rate: 1, len: 1.2, gain: 0.9},
  pkm: {cat: 'shot-rifle', rate: 0.86, len: 0.9, gain: 1},
  svd: {cat: 'shot-sniper', rate: 1, len: 2, gain: 1},
  hmg: {cat: 'shot-sniper', rate: 0.7, len: 1.1, gain: 1.1},
  rpg: {cat: 'rpg-launch', rate: 1, len: 2.6, gain: 1},
  gp: {cat: 'gl-thump', rate: 1, len: 1.2, gain: 0.9},
};
const KEY = 'parp-sfx';
const SPEED_OF_SOUND = 343;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Gun voices. crack: the muzzle blast's sharp front · body: band-passed blast [Hz, Q, seconds] · thump: the low
// punch [from Hz, to Hz, seconds] · tail: the rolling echo [low-pass Hz, seconds] · gain: overall loudness.
export const GUNS = {
  ak: {crack: 1, body: [1150, 0.9, 0.085], thump: [150, 55, 0.09], tail: [950, 0.65], gain: 0.85},
  pkm: {crack: 1.05, body: [880, 0.8, 0.11], thump: [120, 45, 0.12], tail: [760, 0.85], gain: 0.95},
  svd: {crack: 1.35, body: [1300, 1, 0.1], thump: [125, 40, 0.15], tail: [1100, 1.5], gain: 1.15},
  hmg: {crack: 1.2, body: [620, 0.7, 0.15], thump: [85, 32, 0.2], tail: [520, 1.2], gain: 1.3},
  rpg: {crack: 0.6, body: [500, 0.6, 0.25], thump: [90, 38, 0.22], tail: [600, 1.2], gain: 1.1},
  gp: {crack: 0.25, body: [420, 1.2, 0.07], thump: [230, 105, 0.09], tail: [500, 0.4], gain: 0.7},
};

// Reload choreography, as fractions of the weapon's reload time: [when, foley bank or synth, loudness].
export const RELOADS = {
  ak: [
    [0.04, 'click', 0.7],
    [0.12, 'slide', 0.8],
    [0.3, 'rustle', 0.5],
    [0.6, 'clunk', 1],
    [0.66, 'hit', 0.8],
    [0.84, 'long', 0.9],
  ],
  svd: [
    [0.05, 'click', 0.7],
    [0.15, 'slide', 0.8],
    [0.35, 'rustle', 0.5],
    [0.62, 'clunk', 1],
    [0.68, 'hit', 0.7],
    [0.86, 'long', 1],
  ],
  pkm: [
    [0.06, 'clunk', 0.9],
    [0.18, 'click', 0.6],
    [0.35, 'belt', 0.8],
    [0.62, 'slide', 0.8],
    [0.78, 'clunk', 1],
    [0.9, 'long', 1],
  ],
  hmg: [
    [0.06, 'clunk', 1],
    [0.3, 'belt', 0.9],
    [0.6, 'slide', 0.9],
    [0.76, 'clunk', 1],
    [0.9, 'long', 1.1],
  ],
  rpg: [
    [0.15, 'rustle', 0.6],
    [0.5, 'slide', 0.9],
    [0.62, 'clunk', 0.8],
    [0.85, 'click', 0.9],
  ],
  gp: [
    [0.25, 'rustle', 0.5],
    [0.55, 'slide', 0.8],
    [0.8, 'click', 0.9],
  ],
};

/**
 * Where a sound at (x, z) sits for a listener at (lx, lz): distance, gain, stereo pan, air low-pass and arrival delay.
 * Pure, so it is unit-tested.
 */
export function spatial(lx, lz, x, z) {
  const dx = x - lx,
    dz = z - lz,
    d = Math.hypot(dx, dz);
  return {
    d,
    gain: 1 / (1 + d / 9),
    pan: clamp(dx / 22, -1, 1) * 0.85,
    cutoff: clamp(17000 * Math.exp(-d / 55), 700, 17000),
    delay: Math.min(d / SPEED_OF_SOUND, 0.4),
  };
}

/** Shortest distance from (px, pz) to the segment (ax, az)-(bx, bz), and how far along it that point is (0..1). */
export function segmentDistance(px, pz, ax, az, bx, bz) {
  const vx = bx - ax,
    vz = bz - az,
    len2 = vx * vx + vz * vz || 1e-9;
  const t = clamp(((px - ax) * vx + (pz - az) * vz) / len2, 0, 1);
  return {d: Math.hypot(ax + vx * t - px, az + vz * t - pz), t};
}

// The place: reverb length, how wet, an echo off the treeline, and the ambience beds.
function environment(level) {
  if (level.id === 'cave') return {reverb: 3.2, decay: 2.2, wet: 0.5, echo: 0, beds: ['cave', 'night'], step: 'stone'};
  if (level.night) return {reverb: 1.6, decay: 3.5, wet: 0.25, echo: 0.32, beds: ['wind', 'night'], step: 'dirt'};
  if (level.id === 'compound') return {reverb: 1.3, decay: 3.2, wet: 0.24, echo: 0.22, beds: ['wind', 'birds', 'crows'], step: 'dirt'};
  return {reverb: 1.5, decay: 3.4, wet: 0.22, echo: 0.36, beds: ['wind', 'birds', 'leaves'], step: 'dirt'};
}

function loadPrefs() {
  try {
    return {on: true, volume: 0.8, ...JSON.parse(localStorage.getItem(KEY) || '{}')};
  } catch {
    return {on: true, volume: 0.8};
  }
}

export function createSoundscape() {
  const prefs = loadPrefs();
  const stats = {events: 0, voices: 0, played: {}, skipped: 0};
  let ctx = null,
    A = null, // audio graph
    level = null,
    env = null,
    foley = {},
    real = {}, // category -> [AudioBuffer]
    chokes = new Map(), // unit id -> the last shot voice, so a burst does not pile up ringing tails
    loops = {}, // name -> looping voice (beds, the player's footsteps and breath)
    birdsQuietUntil = 0,
    nextAmbient = {};
  const engines = new Map(), // vehicle -> {osc, gain, ...}
    fires = new Map(), // burning wreck -> roar voice
    reloadSeen = new Map(), // unit id -> last reload fraction played
    steps = new Map(); // unit id -> {x, z, acc}

  function count(type) {
    stats.played[type] = (stats.played[type] || 0) + 1;
  }

  // ---------- graph ----------
  function build() {
    ctx = new AudioContext();
    const out = ctx.createDynamicsCompressor();
    out.threshold.value = -14;
    out.knee.value = 8;
    out.ratio.value = 5;
    out.attack.value = 0.002;
    out.release.value = 0.25;
    const master = ctx.createGain();
    master.gain.value = prefs.on ? prefs.volume : 0;
    const muffle = ctx.createBiquadFilter(); // pause, slow motion and blast deafness pull the whole mix down
    muffle.type = 'lowpass';
    muffle.frequency.value = 20000;
    muffle.connect(out).connect(master).connect(ctx.destination);
    const sfx = ctx.createGain(),
      amb = ctx.createGain();
    sfx.connect(muffle);
    amb.gain.value = 0.9;
    amb.connect(muffle);
    const reverb = ctx.createConvolver(),
      wet = ctx.createGain();
    reverb.connect(wet).connect(muffle);
    const echo = ctx.createDelay(1),
      echoGain = ctx.createGain(),
      echoFilter = ctx.createBiquadFilter();
    echoFilter.type = 'lowpass';
    echoFilter.frequency.value = 1400;
    echo.connect(echoFilter).connect(echoGain).connect(muffle);
    echoGain.connect(echo); // feedback: the echo rolls off the far treeline more than once
    const noise = buffer(2, () => Math.random() * 2 - 1);
    let b = 0;
    const brown = buffer(6, () => (b = clamp(b + (Math.random() * 2 - 1) * 0.04, -1, 1)) * 2.2);
    A = {out, master, muffle, sfx, amb, reverb, wet, echo, echoGain, noise, brown, ringing: null};
  }
  function buffer(seconds, fn, channels = 1) {
    const buf = ctx.createBuffer(channels, ctx.sampleRate * seconds, ctx.sampleRate);
    for (let c = 0; c < channels; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < d.length; i++) d[i] = fn(i, d.length);
    }
    return buf;
  }
  function impulse(seconds, decay) {
    const n = ctx.sampleRate * seconds;
    return buffer(seconds, (i, len) => (Math.random() * 2 - 1) * (1 - i / len) ** decay * (i < n * 0.004 ? 0 : 1), 2);
  }

  function setEnvironment(l) {
    level = l;
    env = environment(l);
    A.reverb.buffer = impulse(env.reverb, env.decay);
    A.wet.gain.value = env.wet;
    A.echo.delayTime.value = 0.28 + Math.random() * 0.12;
    A.echoGain.gain.value = env.echo;
    for (const voice of engines.values()) stopVoice(voice);
    engines.clear();
    for (const voice of fires.values()) stopVoice(voice);
    fires.clear();
    reloadSeen.clear();
    steps.clear();
    birdsQuietUntil = 0;
    nextAmbient = {};
    startBeds();
  }

  // ---------- building blocks ----------
  /** A placed output: panner -> air filter -> gain -> mix, with a reverb send and (for loud things) the echo. */
  function spot(x, z, listener, {gain = 1, echo = 0, wet = 1} = {}) {
    const s = spatial(listener.x, listener.z, x, z);
    const g = ctx.createGain(),
      air = ctx.createBiquadFilter(),
      pan = ctx.createStereoPanner();
    g.gain.value = gain * s.gain;
    air.type = 'lowpass';
    air.frequency.value = s.cutoff;
    pan.pan.value = s.pan;
    pan.connect(air).connect(g).connect(A.sfx);
    const send = ctx.createGain();
    send.gain.value = gain * wet * (0.25 + 0.75 * (1 - s.gain)) * 0.6; // far sounds are mostly room
    air.connect(send).connect(A.reverb);
    if (echo) {
      const e = ctx.createGain();
      e.gain.value = gain * echo * 0.5;
      air.connect(e).connect(A.echo);
    }
    return {node: pan, at: ctx.currentTime + s.delay + 0.005, s};
  }
  function track(src, end) {
    stats.voices++;
    src.onended = () => stats.voices--;
    src.stop(end);
  }
  function noise(
    dest,
    at,
    {dur, gain = 1, type = 'bandpass', freq = 1000, freqEnd = null, q = 0.8, attack = 0.002, buf = A.noise, rate = 1},
  ) {
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.playbackRate.value = rate;
    gain = Math.max(gain, 1e-4);
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, at);
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, at + dur);
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(gain, at + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(f).connect(g).connect(dest);
    src.start(at, Math.random() * Math.max(0, buf.duration - dur * rate - 0.1));
    track(src, at + dur + 0.05);
  }
  function tone(dest, at, {dur, gain = 1, type = 'sine', freq = 200, freqEnd = null, attack = 0.003}) {
    const o = ctx.createOscillator();
    o.type = type;
    gain = Math.max(gain, 1e-4);
    o.frequency.setValueAtTime(freq, at);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, at + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(gain, at + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g).connect(dest);
    o.start(at);
    track(o, at + dur + 0.05);
  }
  function sample(bank, dest, at, gain = 1) {
    const list = foley[bank];
    if (!list?.length) return false;
    const src = ctx.createBufferSource();
    src.buffer = list[Math.floor(Math.random() * list.length)];
    src.playbackRate.value = 0.94 + Math.random() * 0.12;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(g).connect(dest);
    src.start(at);
    track(src, at + src.buffer.duration + 0.05);
    return true;
  }
  const busy = () => stats.voices > 90;
  /** Play a real recording of category `cat` at (x, z): returns the voice, or null if the category has not loaded. */
  function play(cat, x, z, listener, {gain = 1, echo = 0, wet = 1, rate = 1, len = 0, delay = 0} = {}) {
    const list = real[cat];
    if (!list?.length) return null;
    const {node, at} = spot(x, z, listener, {gain, echo, wet});
    const src = ctx.createBufferSource();
    src.buffer = list[Math.floor(Math.random() * list.length)];
    src.playbackRate.value = rate * (0.96 + Math.random() * 0.08);
    const g = ctx.createGain();
    const start = at + delay,
      end = start + (len ? Math.min(len, src.buffer.duration / src.playbackRate.value) : src.buffer.duration / src.playbackRate.value);
    g.gain.setValueAtTime(1, start);
    if (len) g.gain.setTargetAtTime(0, end - 0.12, 0.05);
    src.connect(g).connect(node);
    src.start(start);
    track(src, end + 0.3);
    return {src, g};
  }
  /** A looping recording, its level and pitch eased toward a target each frame; started on first use. */
  function loopVoice(name, cat, dest) {
    if (loops[name]) return loops[name];
    const list = real[cat];
    if (!list?.length) return null;
    const src = ctx.createBufferSource();
    src.buffer = list[Math.floor(Math.random() * list.length)];
    src.loop = true;
    const g = ctx.createGain();
    g.gain.value = 0;
    const pan = ctx.createStereoPanner();
    src
      .connect(g)
      .connect(pan)
      .connect(dest || A.sfx);
    src.start(0, Math.random() * src.buffer.duration);
    return (loops[name] = {src, g, pan, nodes: [src]});
  }
  function setLoop(voice, gain, {rate = null, pan = null, tc = 0.25} = {}) {
    if (!voice) return;
    const now = ctx.currentTime;
    voice.g.gain.setTargetAtTime(gain, now, tc);
    if (rate !== null) voice.src.playbackRate.setTargetAtTime(rate, now, 0.2);
    if (pan !== null) voice.pan.pan.setTargetAtTime(pan, now, 0.1);
  }

  // ---------- weapons ----------
  function shot(e, listener, sim) {
    const P = GUNS[e.weapon] || GUNS.ak;
    const own = e.unit === sim.player?.id;
    const near = spatial(listener.x, listener.z, e.x, e.z);
    if (busy() && !own && near.d > 12) return stats.skipped++;
    const S = SHOT_SAMPLES[e.weapon];
    if (S && real[S.cat]?.length) {
      // the real thing: a recorded shot, its tail choked by the next round of the same burst
      const prev = chokes.get(e.unit);
      if (prev) prev.g.gain.setTargetAtTime(0.25, ctx.currentTime, 0.03);
      const v = play(S.cat, e.x, e.z, listener, {gain: S.gain * P.gain * (own ? 1.1 : 1), echo: 1, rate: S.rate, len: S.len});
      if (v) chokes.set(e.unit, v);
      if (own && !['rpg', 'gp'].includes(e.weapon) && Math.random() < 0.3)
        play('shells', e.x, e.z, listener, {gain: 0.22, wet: 0.2, delay: 0.3 + Math.random() * 0.2});
      flyby(e, listener, own);
      return count('shot');
    }
    const {node, at} = spot(e.x, e.z, listener, {gain: P.gain * (own ? 1 : 0.95), echo: 1});
    const v = 0.94 + Math.random() * 0.12,
      closeness = clamp(1 - near.d / 45, 0, 1);
    // the crack: a few milliseconds of bright noise, mostly lost with distance
    noise(node, at, {dur: 0.012, gain: 0.9 * P.crack * (0.25 + closeness), type: 'highpass', freq: 2600 * v, q: 0.5, attack: 0.0008});
    noise(node, at, {dur: P.body[2] * v, gain: 0.8, type: 'bandpass', freq: P.body[0] * v, q: P.body[1], attack: 0.001});
    tone(node, at, {dur: P.thump[2], gain: 0.9 * (0.4 + closeness * 0.6), freq: P.thump[0] * v, freqEnd: P.thump[1], attack: 0.001});
    noise(node, at + 0.01, {
      dur: P.tail[1] * (1 + (1 - closeness) * 0.5),
      gain: 0.22 + (1 - closeness) * 0.2,
      type: 'lowpass',
      freq: P.tail[0],
      freqEnd: P.tail[0] * 0.4,
      q: 0.3,
      attack: 0.02,
      buf: A.brown,
    });
    if (own) {
      // your own rifle: the bolt cycling and the brass on the ground
      noise(node, at + 0.018, {dur: 0.025, gain: 0.25, type: 'bandpass', freq: 3200, q: 3});
      if (Math.random() < 0.6 && !['rpg', 'gp'].includes(e.weapon))
        tone(node, at + 0.35 + Math.random() * 0.2, {
          dur: 0.09,
          gain: 0.05,
          freq: 5200 + Math.random() * 1400,
          freqEnd: 4800,
          attack: 0.001,
        });
    }
    if (e.weapon === 'rpg') {
      // the launch: back-blast whoosh, then the motor's hiss crossing to the target
      noise(node, at, {dur: 0.45, gain: 0.8, type: 'lowpass', freq: 1600, freqEnd: 300, q: 0.4, attack: 0.004});
      const fly = Math.min(0.6, Math.hypot(e.x1 - e.x, e.z1 - e.z) / 120);
      const hiss = spot(e.x1, e.z1, listener, {gain: 0.5});
      noise(hiss.node, at + 0.05, {dur: fly + 0.1, gain: 0.6, type: 'bandpass', freq: 1800, freqEnd: 3200, q: 1.5, attack: fly * 0.8});
    }
    if (e.weapon === 'gp') tone(node, at, {dur: 0.06, gain: 0.4, freq: 600, freqEnd: 300}); // the hollow "bloop"
    flyby(e, listener, own);
    count('shot');
  }
  /** A round passing close to you: the supersonic snap and the whizz. */
  function flyby(e, listener, own) {
    if (!own && !['rpg', 'gp'].includes(e.weapon)) {
      const pass = segmentDistance(listener.x, listener.z, e.x, e.z, e.x1, e.z1);
      if (pass.d < 5 && pass.t > 0.08 && pass.t < 0.999) {
        const k = 1 - pass.d / 5;
        const px = e.x + (e.x1 - e.x) * pass.t,
          pz = e.z + (e.z1 - e.z) * pass.t;
        if (!play('flyby', px, pz, listener, {gain: 0.8 * k, wet: 0.3})) {
          const by = spot(px, pz, listener, {gain: 0.9 * k, wet: 0.3});
          noise(by.node, ctx.currentTime, {dur: 0.006, gain: 1, type: 'highpass', freq: 3500, attack: 0.0005});
          noise(by.node, ctx.currentTime, {dur: 0.14, gain: 0.4, type: 'bandpass', freq: 3600, freqEnd: 1200, q: 4, attack: 0.03});
        }
        count('flyby');
      }
    }
  }

  function impact(e, listener) {
    const s = spatial(listener.x, listener.z, e.x, e.z);
    if (s.d > 35 || (busy() && s.d > 10)) return;
    if (e.surface !== 'flesh') {
      const cat = e.surface === 'metal' ? 'impact-metal' : 'impact-dirt';
      if (play(cat, e.x, e.z, listener, {gain: e.surface === 'metal' ? 0.45 : 0.5, wet: 0.5, rate: e.surface === 'wall' ? 1.2 : 1})) {
        if ((e.surface === 'metal' || e.surface === 'wall') && Math.random() < 0.15)
          play('ricochet', e.x, e.z, listener, {gain: 0.35, wet: 0.6});
        return count('impact');
      }
    }
    const {node, at} = spot(e.x, e.z, listener, {gain: 0.55, wet: 0.6});
    const v = 0.9 + Math.random() * 0.2;
    if (e.surface === 'metal') {
      noise(node, at, {dur: 0.02, gain: 0.7, type: 'highpass', freq: 3000});
      for (const f of [1750, 2630, 4100]) tone(node, at, {dur: 0.12 + Math.random() * 0.2, gain: 0.14, freq: f * v});
    } else if (e.surface === 'wall') {
      noise(node, at, {dur: 0.03, gain: 0.6, type: 'bandpass', freq: 2100 * v, q: 1.6});
      noise(node, at, {dur: 0.09, gain: 0.5, type: 'lowpass', freq: 500, q: 0.5});
    } else if (e.surface === 'flesh') {
      noise(node, at, {dur: 0.08, gain: 0.7, type: 'lowpass', freq: 320 * v, q: 0.7});
      tone(node, at, {dur: 0.07, gain: 0.4, freq: 110, freqEnd: 60});
    } else {
      noise(node, at, {dur: 0.06, gain: 0.45, type: 'lowpass', freq: 1100 * v, q: 0.4});
      noise(node, at + 0.02, {dur: 0.15, gain: 0.12, type: 'highpass', freq: 3500, attack: 0.03}); // grit falling
    }
    if ((e.surface === 'metal' || e.surface === 'wall') && Math.random() < 0.18)
      tone(node, at + 0.01, {dur: 0.28, gain: 0.09, type: 'triangle', freq: 3200 * v, freqEnd: 1300, attack: 0.01}); // ricochet
    count('impact');
  }

  function explosion(x, z, listener, size = 1, metal = false, kind = 'big') {
    const s = spatial(listener.x, listener.z, x, z);
    const cat = kind === 'grenade' ? 'explosion-grenade' : kind === 'wreck' ? 'car-explode' : 'explosion-big';
    if (real[cat]?.length) {
      // the recording, with a sub-bass push underneath for the weight it loses on small speakers
      play(cat, x, z, listener, {gain: 1.2 * size, echo: 1.2, wet: 1.1});
      const {node, at} = spot(x, z, listener, {gain: 0.9 * size, wet: 0.2});
      tone(node, at, {dur: 0.7 * size, gain: 1, freq: 55, freqEnd: 26, attack: 0.003});
      if (s.d < 10 * size) deafen(1 - s.d / (10 * size));
      return count('explode');
    }
    const {node, at} = spot(x, z, listener, {gain: 1.5 * size, echo: 1.4, wet: 1.4});
    noise(node, at, {dur: 0.05, gain: 1, type: 'highpass', freq: 1800, attack: 0.001});
    tone(node, at, {dur: 0.9 * size, gain: 1.4, freq: 62, freqEnd: 24, attack: 0.002});
    noise(node, at, {
      dur: 1.9 * size,
      gain: 1.1,
      type: 'lowpass',
      freq: 1400,
      freqEnd: 140,
      q: 0.5,
      attack: 0.004,
      buf: A.brown,
      rate: 0.7,
    });
    noise(node, at + 0.02, {dur: 0.6, gain: 0.5, type: 'bandpass', freq: 700, freqEnd: 250, q: 0.6, attack: 0.003});
    if (s.d < 45) {
      // debris pattering down
      const n = 6 + Math.floor(Math.random() * 8 * size);
      for (let i = 0; i < n; i++)
        noise(node, at + 0.25 + Math.random() * 1.3, {
          dur: 0.025,
          gain: 0.08 + Math.random() * 0.12,
          type: 'bandpass',
          freq: 1500 + Math.random() * 3000,
          q: 2,
        });
    }
    if (metal) for (const f of [310, 470, 820]) tone(node, at + 0.05, {dur: 1.6, gain: 0.12, type: 'triangle', freq: f, freqEnd: f * 0.9});
    if (s.d < 10 * size) deafen(1 - s.d / (10 * size));
    count('explode');
  }

  /** A blast close by: the mix goes dull and a ringing tone fades over a couple of seconds. */
  function deafen(k) {
    const now = ctx.currentTime;
    const f = A.muffle.frequency;
    f.cancelScheduledValues(now);
    f.setValueAtTime(f.value, now);
    f.exponentialRampToValueAtTime(clamp(4000 - 3500 * k, 400, 4000), now + 0.04);
    f.exponentialRampToValueAtTime(20000, now + 0.6 + 2.6 * k);
    tone(A.out, now + 0.03, {dur: 1.5 + 2 * k, gain: 0.05 * k, freq: 3900, attack: 0.05});
    count('deafen');
  }

  function reloadStep(u, kind, gain, listener) {
    const {node, at} = spot(u.x, u.z, listener, {gain, wet: 0.35});
    if (kind === 'rustle') noise(node, at, {dur: 0.35, gain: 0.25, type: 'bandpass', freq: 1800, freqEnd: 900, q: 0.6, attack: 0.08});
    else if (kind === 'belt')
      for (let i = 0; i < 7; i++)
        tone(node, at + i * 0.045 + Math.random() * 0.02, {dur: 0.04, gain: 0.05, type: 'triangle', freq: 2400 + Math.random() * 1600});
    else if (!sample(kind, node, at, 0.9)) noise(node, at, {dur: 0.05, gain: 0.5, type: 'bandpass', freq: 1600, q: 2});
    count('reload');
  }

  function death(e, listener) {
    const s = spatial(listener.x, listener.z, e.x, e.z);
    if (s.d > 30) return;
    const {node, at} = spot(e.x, e.z, listener, {gain: 0.7, wet: 0.5});
    noise(node, at + 0.25, {dur: 0.14, gain: 0.7, type: 'lowpass', freq: 260, q: 0.5});
    tone(node, at + 0.25, {dur: 0.12, gain: 0.5, freq: 85, freqEnd: 45});
    for (let i = 0; i < 3; i++)
      tone(node, at + 0.33 + i * 0.07 + Math.random() * 0.04, {dur: 0.08, gain: 0.07, type: 'triangle', freq: 1900 + Math.random() * 1500});
    count('death');
  }

  function radio(e, listener) {
    const {node, at} = spot(e.x, e.z, listener, {gain: 0.6, wet: 0.3});
    noise(node, at, {dur: 0.09, gain: 0.5, type: 'bandpass', freq: 1900, q: 1.2, attack: 0.002});
    noise(node, at + 0.1, {dur: 0.7, gain: 0.07, type: 'bandpass', freq: 2400, q: 0.8, attack: 0.05});
    noise(node, at + 0.85, {dur: 0.05, gain: 0.4, type: 'bandpass', freq: 1700, q: 1.5});
    count('radio');
  }

  function flush(listener) {
    // birds scattering at the first shots
    if (!env.beds.includes('birds')) return;
    for (let b = 0; b < 3; b++) {
      const {node, at} = spot(listener.x + (Math.random() - 0.5) * 50, listener.z + (Math.random() - 0.5) * 50, listener, {gain: 0.3});
      for (let i = 0; i < 9; i++) noise(node, at + 0.3 + b * 0.2 + i * 0.07, {dur: 0.05, gain: 0.3, type: 'bandpass', freq: 700, q: 0.8});
    }
  }

  // ---------- running state: engines, fires, footsteps, reloads ----------
  function engine(v, listener, dt) {
    let voice = engines.get(v);
    const s = spatial(listener.x, listener.z, v.x, v.z);
    if (!voice && !v.destroyed && s.d < 140 && real['engine-truck']?.length) {
      // a recorded diesel, pitched up with the revs
      const list = real['engine-truck'],
        src = ctx.createBufferSource(),
        g = ctx.createGain(),
        pan = ctx.createStereoPanner(),
        f = ctx.createBiquadFilter();
      src.buffer = list[engines.size % list.length];
      src.loop = true;
      f.type = 'lowpass';
      f.frequency.value = 2500;
      g.gain.value = 0;
      src.connect(f).connect(g).connect(pan).connect(A.sfx);
      src.start(0, Math.random() * src.buffer.duration);
      voice = {nodes: [src], g, f, pan, src, real: true, heavy: v.kind === 'mrap' ? 0.85 : 1, x: v.x, z: v.z, rpm: 0};
      engines.set(v, voice);
    }
    if (!voice && !v.destroyed && s.d < 140) {
      const heavy = v.kind === 'mrap' ? 0.8 : 1;
      const o1 = ctx.createOscillator(),
        o2 = ctx.createOscillator(),
        lfo = ctx.createOscillator(),
        lfoGain = ctx.createGain(),
        f = ctx.createBiquadFilter(),
        g = ctx.createGain(),
        pan = ctx.createStereoPanner();
      o1.type = 'sawtooth';
      o2.type = 'square';
      o1.frequency.value = 36 * heavy;
      o2.frequency.value = 72.6 * heavy;
      lfo.frequency.value = 9 * heavy; // cylinders firing
      lfoGain.gain.value = 0.35;
      f.type = 'lowpass';
      f.frequency.value = 260;
      f.Q.value = 2;
      g.gain.value = 0;
      const am = ctx.createGain();
      am.gain.value = 0.65;
      lfo.connect(lfoGain).connect(am.gain);
      o1.connect(f);
      o2.connect(f);
      f.connect(am).connect(g).connect(pan).connect(A.sfx);
      const rumble = ctx.createBufferSource();
      rumble.buffer = A.brown;
      rumble.loop = true;
      const rf = ctx.createBiquadFilter();
      rf.type = 'lowpass';
      rf.frequency.value = 180;
      rumble.connect(rf).connect(g);
      for (const n of [o1, o2, lfo, rumble]) n.start();
      voice = {nodes: [o1, o2, lfo, rumble], g, f, pan, o1, o2, lfo, heavy, x: v.x, z: v.z, rpm: 0};
      engines.set(v, voice);
    }
    if (!voice) return;
    const now = ctx.currentTime;
    if (v.destroyed || s.d > 160) {
      stopVoice(voice);
      engines.delete(v);
      return;
    }
    const moved = Math.hypot(v.x - voice.x, v.z - voice.z) / Math.max(dt, 1e-3);
    voice.x = v.x;
    voice.z = v.z;
    voice.rpm += (clamp(moved / 8, 0, 1) - voice.rpm) * Math.min(1, dt * 2);
    const r = voice.rpm;
    if (voice.real) {
      voice.src.playbackRate.setTargetAtTime(voice.heavy * (0.85 + r * 0.45), now, 0.25);
      voice.f.frequency.setTargetAtTime(s.cutoff, now, 0.2);
      voice.g.gain.setTargetAtTime((0.22 + r * 0.25) * s.gain, now, 0.15);
      voice.pan.pan.setTargetAtTime(s.pan, now, 0.1);
      return;
    }
    voice.o1.frequency.setTargetAtTime(voice.heavy * (34 + r * 26), now, 0.2);
    voice.o2.frequency.setTargetAtTime(voice.heavy * (68.6 + r * 52), now, 0.2);
    voice.lfo.frequency.setTargetAtTime(voice.heavy * (8 + r * 9), now, 0.2);
    voice.f.frequency.setTargetAtTime(220 + r * 380, now, 0.2);
    voice.g.gain.setTargetAtTime((0.1 + r * 0.14) * s.gain * 1.6, now, 0.15);
    voice.pan.pan.setTargetAtTime(s.pan, now, 0.1);
  }
  function fire(v, listener, dt) {
    const s = spatial(listener.x, listener.z, v.x, v.z);
    let voice = fires.get(v);
    if (!voice && real['fire-burning']?.length) {
      const src = ctx.createBufferSource(),
        g = ctx.createGain(),
        pan = ctx.createStereoPanner();
      src.buffer = real['fire-burning'][fires.size % real['fire-burning'].length];
      src.loop = true;
      g.gain.value = 0;
      src.connect(g).connect(pan).connect(A.sfx);
      src.start(0, Math.random() * src.buffer.duration);
      voice = {nodes: [src], g, pan, real: true};
      fires.set(v, voice);
    }
    if (voice?.real) {
      const burning = (v.burningUntil ?? Infinity) - (A.sim?.time ?? 0);
      voice.g.gain.setTargetAtTime(0.5 * s.gain * Math.max(0.15, Math.min(1, burning / 20)), ctx.currentTime, 0.3);
      voice.pan.pan.setTargetAtTime(s.pan, ctx.currentTime, 0.1);
      return;
    }
    if (!voice) {
      const src = ctx.createBufferSource();
      src.buffer = A.brown;
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 500;
      const g = ctx.createGain(),
        pan = ctx.createStereoPanner();
      g.gain.value = 0;
      src.connect(f).connect(g).connect(pan).connect(A.sfx);
      src.start();
      voice = {nodes: [src], g, pan};
      fires.set(v, voice);
    }
    voice.g.gain.setTargetAtTime(0.18 * s.gain, ctx.currentTime, 0.3);
    voice.pan.pan.setTargetAtTime(s.pan, ctx.currentTime, 0.1);
    if (s.d < 50 && Math.random() < dt * 14) {
      const {node, at} = spot(v.x, v.z, listener, {gain: 0.35, wet: 0.4});
      noise(node, at, {
        dur: 0.015 + Math.random() * 0.02,
        gain: 0.3 + Math.random() * 0.5,
        type: 'bandpass',
        freq: 1200 + Math.random() * 3000,
        q: 1.5,
      });
    }
  }
  function stopVoice(voice) {
    const now = ctx.currentTime;
    voice.g.gain.cancelScheduledValues(now);
    voice.g.gain.setTargetAtTime(0, now, 0.15);
    for (const n of voice.nodes) n.stop(now + 0.8);
  }

  function footsteps(sim, listener, dt) {
    const near = sim.units
      .filter(u => u.alive && !u.escaped && u.state !== 'mounted' && u.state !== 'turret')
      .map(u => [u, Math.hypot(u.x - listener.x, u.z - listener.z)])
      .filter(([, d]) => d < 16)
      .sort((a, b) => a[1] - b[1])
      .slice(0, 8);
    const p = sim.player;
    const stepLoop = p && loopVoice('steps', 'footstep-gravel');
    if (stepLoop) {
      // your own footsteps: a recorded walk on gravel, faster and louder at a sprint, near silent sneaking
      const going = p.alive && p.moving,
        sneaking = p.speed < 2.5;
      setLoop(stepLoop, going ? (p.sprinting ? 0.42 : sneaking ? 0.05 : 0.2) : 0, {
        rate: p.sprinting ? 1.35 : sneaking ? 0.75 : 1,
        tc: 0.08,
      });
    }
    const breath = p && loopVoice('breath', 'breath-sprint');
    if (breath) setLoop(breath, p.alive && (p.sprinting || (p.stamina ?? 1) < 0.6) ? 0.3 * (1.1 - (p.stamina ?? 1)) : 0, {tc: 0.6});
    for (const [u] of near) {
      if (u === p && stepLoop) continue;
      const st = steps.get(u.id) || {x: u.x, z: u.z, acc: 0};
      const moved = Math.hypot(u.x - st.x, u.z - st.z);
      st.x = u.x;
      st.z = u.z;
      if (moved > 2)
        st.acc = 0; // a teleport (spawn, swap), not a stride
      else st.acc += moved;
      const sneaking = u.speed !== undefined && u.speed < 2.5;
      const stride = sneaking ? 0.55 : 0.8;
      if (st.acc > stride && moved / Math.max(dt, 1e-3) > 0.5) {
        st.acc = 0;
        const {node, at} = spot(u.x, u.z, listener, {gain: (sneaking ? 0.12 : 0.32) * (u === sim.player ? 1 : 0.8), wet: 0.4});
        const v = 0.85 + Math.random() * 0.3;
        if (env.step === 'stone') {
          noise(node, at, {dur: 0.035, gain: 0.5, type: 'bandpass', freq: 1800 * v, q: 1.5});
          noise(node, at, {dur: 0.06, gain: 0.3, type: 'lowpass', freq: 300, q: 0.5});
        } else {
          noise(node, at, {dur: 0.07, gain: 0.5, type: 'lowpass', freq: 900 * v, q: 0.6});
          noise(node, at + 0.01, {dur: 0.05, gain: 0.18, type: 'highpass', freq: 3800 * v, attack: 0.01}); // gravel
        }
        count('step');
      }
      steps.set(u.id, st);
    }
  }

  function reloads(sim, listener) {
    for (const u of sim.units) {
      if (!u.alive || !(u.reload > 0) || !u.reloading) {
        reloadSeen.delete(u.id);
        continue;
      }
      const d = Math.hypot(u.x - listener.x, u.z - listener.z);
      if (d > 20) continue;
      const W = WEAPONS[u.reloading],
        p = 1 - u.reload / (u.reloadTime || W.reload),
        seen = reloadSeen.get(u.id) ?? -1;
      for (const [when, kind, gain] of RELOADS[u.reloading] || RELOADS.ak)
        if (when > seen && when <= p) reloadStep(u, kind, gain * (u === sim.player ? 0.9 : 0.6), listener);
      reloadSeen.set(u.id, p);
    }
  }

  // ---------- ambience ----------
  function startBeds() {
    if (A.beds) for (const n of A.beds) n.stop();
    A.beds = [];
    const loop = (buf, type, freq, gain, q = 0.5) => {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      f.Q.value = q;
      const g = ctx.createGain();
      g.gain.value = gain;
      src.connect(f).connect(g).connect(A.amb);
      src.start(0, Math.random() * 4);
      A.beds.push(src);
      return {f, g};
    };
    for (const k of ['bed', 'battle']) if (loops[k]) (stopVoice(loops[k]), delete loops[k]);
    A.realBed = false;
    const bedCat = env.beds.includes('night') ? 'amb-forest-night' : 'amb-countryside';
    if (real[bedCat]?.length) {
      // the place, recorded: a countryside or night-forest bed, and a far-off war under it
      A.realBed = true;
      setLoop(loopVoice('bed', bedCat, A.amb), env.beds.includes('cave') ? 0.18 : 0.55, {tc: 1.5});
      if (!env.beds.includes('cave')) setLoop(loopVoice('battle', 'amb-distant-battle', A.amb), 0.12, {tc: 3});
    }
    A.wind = env.beds.includes('wind') && !A.realBed ? loop(A.brown, 'lowpass', 500, 0.16) : null;
    A.drone = env.beds.includes('cave') ? loop(A.brown, 'lowpass', 140, 0.22, 1.5) : null;
  }
  function ambience(listener, dt) {
    const now = ctx.currentTime,
      t = now; // real time, so the place keeps sounding on the briefing card and in the pause
    if (A.wind) {
      // gusts: a slow random walk on the wind's brightness and level
      A.windWalk = clamp((A.windWalk ?? 0.4) + (Math.random() - 0.5) * dt * 0.6, 0, 1);
      A.wind.f.frequency.setTargetAtTime(280 + A.windWalk * 900, now, 0.5);
      A.wind.g.gain.setTargetAtTime(0.1 + A.windWalk * 0.14, now, 0.5);
    }
    const due = (key, min, max) => {
      if ((nextAmbient[key] ?? 0) > t) return false;
      nextAmbient[key] = t + min + Math.random() * (max - min);
      return true;
    };
    const around = (r = 40) => [listener.x + (Math.random() - 0.5) * r * 2, listener.z + (Math.random() - 0.5) * r * 2];
    const at = () => {
      const [x, z] = around();
      return spot(x, z, listener, {gain: 1, wet: 1.2});
    };
    if (A.realBed && !env.beds.includes('cave')) return; // the recorded bed carries the birds, crickets and wind
    if (env.beds.includes('birds') && t > birdsQuietUntil && due('bird', 0.6, 2.6)) {
      const {node, at: when} = at();
      const kind = Math.random();
      if (kind < 0.45) {
        // trill
        const base = 3000 + Math.random() * 2200,
          n = 3 + Math.floor(Math.random() * 5);
        for (let i = 0; i < n; i++) tone(node, when + i * 0.07, {dur: 0.05, gain: 0.05, freq: base, freqEnd: base * 1.3, attack: 0.005});
      } else if (kind < 0.8) {
        const f = 1900 + Math.random() * 900;
        tone(node, when, {dur: 0.28, gain: 0.05, freq: f, freqEnd: f * 1.45, attack: 0.04}); // whistle
        tone(node, when + 0.32, {dur: 0.22, gain: 0.04, freq: f * 1.4, freqEnd: f * 1.05, attack: 0.04});
      } else {
        tone(node, when, {dur: 0.32, gain: 0.04, freq: 720, freqEnd: 700, attack: 0.03}); // distant cuckoo
        tone(node, when + 0.38, {dur: 0.42, gain: 0.04, freq: 580, freqEnd: 560, attack: 0.03});
      }
      count('bird');
    }
    if (env.beds.includes('crows') && t > birdsQuietUntil - 30 && due('crow', 6, 16)) {
      const {node, at: when} = at();
      for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i++)
        noise(node, when + i * 0.35, {dur: 0.22, gain: 0.12, type: 'bandpass', freq: 1150, freqEnd: 800, q: 6, attack: 0.02});
    }
    if (env.beds.includes('leaves') && due('leaves', 3, 9)) {
      const {node, at: when} = at();
      noise(node, when, {dur: 1.2 + Math.random(), gain: 0.05, type: 'highpass', freq: 3500, attack: 0.5});
    }
    if (env.beds.includes('night')) {
      if (due('cricket', 0.25, 0.7)) {
        const {node, at: when} = at();
        const f = 4300 + Math.random() * 500,
          g = env.beds.includes('cave') ? 0.012 : 0.025;
        for (let i = 0; i < 3 + Math.floor(Math.random() * 3); i++)
          tone(node, when + i * 0.035, {dur: 0.025, gain: g, freq: f, attack: 0.004});
      }
      if (due('owl', 18, 40) && t > 5) {
        const {node, at: when} = at();
        tone(node, when, {dur: 0.35, gain: 0.05, freq: 390, freqEnd: 360, attack: 0.06});
        tone(node, when + 0.55, {dur: 0.7, gain: 0.05, freq: 380, freqEnd: 340, attack: 0.08});
      }
    }
    if (env.beds.includes('cave') && due('drip', 0.5, 2.2)) {
      const {node, at: when} = at();
      const f = 1100 + Math.random() * 1100;
      tone(node, when, {dur: 0.08, gain: 0.07, freq: f, freqEnd: f * 2.2, attack: 0.002});
      count('drip');
    }
  }

  // ---------- public ----------
  async function loadReal() {
    try {
      const manifest = await (await fetch(new URL('manifest.json', REAL))).json();
      await Promise.all(
        Object.entries(manifest.categories).map(async ([cat, {files}]) => {
          const bufs = await Promise.all(
            files.map(async f => {
              try {
                return await ctx.decodeAudioData(await (await fetch(new URL(f.file, REAL))).arrayBuffer());
              } catch {
                return null;
              }
            }),
          );
          real[cat] = bufs.filter(Boolean);
        }),
      );
      if (env) startBeds(); // swap the synthesised beds for the recordings
      stats.real = Object.keys(real).filter(k => real[k].length).length;
    } catch {
      // no recordings: everything stays synthesised
    }
  }
  async function loadFoley() {
    try {
      const manifest = await (await fetch(new URL('manifest.json', FOLEY))).json();
      await Promise.all(
        Object.entries(manifest).map(async ([bank, files]) => {
          foley[bank] = (
            await Promise.all(
              files.slice(0, 4).map(async f => {
                try {
                  return await ctx.decodeAudioData(await (await fetch(new URL(`${bank}/${f}`, FOLEY))).arrayBuffer());
                } catch {
                  return null;
                }
              }),
            )
          ).filter(Boolean);
        }),
      );
    } catch {
      // no foley: the reload falls back to synthesised clicks
    }
  }

  return {
    stats,
    get on() {
      return prefs.on;
    },
    /** Open the audio (call from a user gesture). Safe to call often. */
    unlock() {
      if (!ctx) {
        build();
        loadFoley();
        loadReal();
      }
      if (ctx.state === 'suspended') ctx.resume();
    },
    setOn(on) {
      prefs.on = on;
      save();
      if (A) A.master.gain.setTargetAtTime(on ? prefs.volume : 0, ctx.currentTime, 0.05);
    },
    setVolume(v) {
      prefs.volume = v;
      save();
      if (A && prefs.on) A.master.gain.setTargetAtTime(v, ctx.currentTime, 0.05);
    },
    get volume() {
      return prefs.volume;
    },
    /**
     * Drain the simulation's sound events and keep the running sounds in step. paused: the tactical pause;
     * scale: game speed (the slow-motion squad picker runs below 1).
     */
    update(sim, {paused = false, scale = 1, dt = 1 / 60} = {}) {
      if (!ctx || ctx.state !== 'running') {
        sim.sounds.length = 0;
        return;
      }
      if (level !== sim.level || A.sim !== sim) {
        A.sim = sim;
        setEnvironment(sim.level);
      }
      const listener = sim.player || {x: 0, z: 0};
      for (const e of sim.sounds) {
        stats.events++;
        if (e.type === 'shot') shot(e, listener, sim);
        else if (e.type === 'impact') impact(e, listener);
        else if (e.type === 'explode') explosion(e.x, e.z, listener, e.lob ? 0.75 : 1, false, e.lob ? 'grenade' : 'big');
        else if (e.type === 'wreck') explosion(e.x, e.z, listener, 1.5, true, 'wreck');
        else if (e.type === 'throw') play('throw', e.x, e.z, listener, {gain: 0.5, wet: 0.3});
        else if (e.type === 'collapse') explosion(e.x, e.z, listener, 0.8, true);
        else if (e.type === 'death') death(e, listener);
        else if (e.type === 'hurt' && e.unit === sim.player?.id) deafen(0.25);
        else if (e.type === 'reload' && e.unit !== sim.player?.id) reloadStep(e, 'rustle', 0.3, listener);
        else if (e.type === 'switch') reloadStep(e, 'handle', 0.6, listener);
        else if (e.type === 'ability') reloadStep(e, 'handle', 0.8, listener);
        else if (e.type === 'say' && e.radio) radio(e, listener);
        else if (e.type === 'alarm') {
          birdsQuietUntil = ctx.currentTime + 60;
          flush(listener);
        }
      }
      sim.sounds.length = 0;
      if (!paused) {
        reloads(sim, listener);
        footsteps(sim, listener, dt);
      }
      for (const v of sim.vehicles) {
        engine(v, listener, dt);
        if (v.destroyed) fire(v, listener, dt);
      }
      ambience(listener, dt);
      // the tactical pause and the slow-motion picker dull the world
      const target = paused ? 700 : scale < 0.9 ? 1400 + 8000 * scale : null;
      if (target && !A.dulled) {
        A.muffle.frequency.setTargetAtTime(target, ctx.currentTime, 0.08);
        A.dulled = true;
      } else if (!target && A.dulled) {
        A.muffle.frequency.setTargetAtTime(20000, ctx.currentTime, 0.12);
        A.dulled = false;
      }
    },
  };
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(prefs));
    } catch {}
  }
}
