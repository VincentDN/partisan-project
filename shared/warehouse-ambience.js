// The rebel warehouse's sound, behind the Operator and Weapon Modders: real recordings only (CC0, Freesound, fetched by
// tools/audio/fetch-shooter-sounds.mjs --set warehouse into assets/audio/warehouse/). Beds loop under everything (the
// room, rain on the tin roof, men talking in the next bay, a lamp's hum); on top, every few seconds, something happens
// somewhere in the room: a radio call between squelches, a rifle charged or a magazine seated at the crate, a bolt
// worked, brass tipped on the bench, an ammo box, tools, a laugh, a cough, steps, a lighter, cards, a chair, the door.
// Each event is placed left or right and further off (quieter, duller, wetter in the room's reverb).
//
//   const amb = warehouseAmbience();   amb.set(true|false)   // follows the warehouse being shown
//   amb.trigger('radio')               // play one event now (tests)
//   amb.stats                          // {beds, played:{event:n}}
// It starts on the first click or key (browsers block sound before that) and goes quiet in a background tab.
import {audio} from './sfx.js';

const BASE = new URL('../assets/audio/warehouse/', import.meta.url);
const PREF = 'parp-ambience';

// level, pan (-1 left .. 1 right; null = random), distance 0..1, weight (how often), filter for radio
const EVENTS = {
  radio: {cats: ['radio-chatter'], level: 0.5, pan: 0.45, dist: 0.35, weight: 3, radio: true},
  handling: {cats: ['gun-handling'], level: 0.75, pan: -0.55, dist: 0.3, weight: 4},
  bolt: {cats: ['bolt'], level: 0.6, pan: -0.5, dist: 0.35, weight: 2},
  shells: {cats: ['shells-table'], level: 0.55, pan: 0.05, dist: 0.5, weight: 2},
  ammo: {cats: ['ammo-box'], level: 0.6, pan: -0.6, dist: 0.4, weight: 2},
  tools: {cats: ['tools'], level: 0.5, pan: 0.1, dist: 0.55, weight: 2},
  laugh: {cats: ['laugh'], level: 0.4, pan: null, dist: 0.75, weight: 1.5},
  cough: {cats: ['cough'], level: 0.4, pan: null, dist: 0.6, weight: 1.5},
  steps: {cats: ['footsteps'], level: 0.45, pan: null, dist: 0.6, weight: 1.5},
  zippo: {cats: ['zippo'], level: 0.5, pan: 0.5, dist: 0.3, weight: 1},
  cards: {cats: ['cards'], level: 0.45, pan: 0.6, dist: 0.6, weight: 1},
  creak: {cats: ['creak'], level: 0.45, pan: 0.45, dist: 0.25, weight: 1},
  door: {cats: ['metal-door'], level: 0.35, pan: null, dist: 0.9, weight: 0.4},
};
const BEDS = [
  {cat: 'amb-room', level: 0.5},
  {cat: 'amb-rain', level: 0.22},
  {cat: 'voices', level: 0.2, dist: 0.7, pan: -0.35},
  {cat: 'hum', level: 0.05},
];

let single = null;
export function warehouseAmbience() {
  return (single ??= create());
}

function create() {
  const stats = {beds: 0, played: {}, loaded: 0};
  let enabled = false,
    on = true,
    graph = null,
    timer = 0,
    manifest = null;
  try {
    on = localStorage.getItem(PREF) !== 'off';
  } catch {
    /* storage blocked: stay on */
  }
  const buffers = new Map(); // file -> Promise<AudioBuffer>

  function setup() {
    if (graph) return graph;
    const {ctx, out} = audio();
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(out);
    // the room: a two-second decay off concrete and brick (an impulse response shaped from noise)
    const verb = ctx.createConvolver(),
      len = Math.round(ctx.sampleRate * 2.2),
      ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3.2;
    }
    verb.buffer = ir;
    const wet = ctx.createGain();
    wet.gain.value = 0.55;
    verb.connect(wet).connect(master);
    graph = {ctx, master, verb};
    return graph;
  }
  const loadManifest = () =>
    (manifest ??= fetch(new URL('manifest.json', BASE))
      .then(r => r.json())
      .catch(() => ({categories: {}})));
  function buffer(file) {
    if (!buffers.has(file))
      buffers.set(
        file,
        fetch(new URL(file, BASE))
          .then(r => r.arrayBuffer())
          .then(b => graph.ctx.decodeAudioData(b))
          .then(b => (stats.loaded++, b)),
      );
    return buffers.get(file);
  }
  const pick = a => a[Math.floor(Math.random() * a.length)];

  // one voice: source -> (radio band) -> distance filter -> gain -> pan -> dry + reverb send
  function voice(buf, {level, pan = 0, dist = 0.3, radio = false, when = 0, fadeIn = 0}) {
    const {ctx, master, verb} = graph,
      t = ctx.currentTime + when;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    let node = src;
    if (radio) {
      // a handset across the room: narrow band and a little crunch
      const hp = ctx.createBiquadFilter(),
        lp = ctx.createBiquadFilter(),
        crunch = ctx.createWaveShaper();
      hp.type = 'highpass';
      hp.frequency.value = 420;
      lp.type = 'lowpass';
      lp.frequency.value = 2900;
      const curve = new Float32Array(256);
      for (let i = 0; i < 256; i++) curve[i] = Math.tanh(((i / 255) * 2 - 1) * 2.4);
      crunch.curve = curve;
      node = node.connect(hp).connect(crunch).connect(lp);
    }
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 16000 * (1 - dist) ** 1.6 + 900;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(fadeIn ? 0 : level * (1 - dist * 0.55), t);
    if (fadeIn) gain.gain.linearRampToValueAtTime(level * (1 - dist * 0.55), t + fadeIn);
    const panner = ctx.createStereoPanner();
    panner.pan.value = pan;
    node.connect(tone).connect(gain).connect(panner);
    panner.connect(master);
    const send = ctx.createGain();
    send.gain.value = 0.15 + dist * 0.6;
    panner.connect(send).connect(verb);
    src.start(t);
    return src;
  }

  // beds: each loop restarts two seconds before it ends and fades in over its predecessor's fading tail
  async function bed(spec) {
    const files = (await loadManifest()).categories[spec.cat]?.files || [];
    if (!files.length) return;
    const buf = await buffer(pick(files).file);
    stats.beds++;
    const next = () => {
      if (!enabled || !on) return void (spec.playing = false);
      voice(buf, {level: spec.level, pan: spec.pan ?? 0, dist: spec.dist ?? 0, fadeIn: 2});
      spec.timer = setTimeout(next, Math.max(4, buf.duration - 2) * 1000);
    };
    spec.playing = true;
    next();
  }

  async function trigger(id) {
    const e = EVENTS[id];
    if (!e || !graph) return;
    const cats = (await loadManifest()).categories;
    const files = e.cats.flatMap(c => cats[c]?.files || []);
    if (!files.length) return;
    const pan = e.pan ?? Math.random() * 1.6 - 0.8;
    const dist = Math.min(1, e.dist + Math.random() * 0.15);
    stats.played[id] = (stats.played[id] || 0) + 1;
    if (e.radio) {
      // squelch, the call, squelch
      const sq = cats['radio-squelch']?.files || [];
      const call = await buffer(pick(files).file);
      if (sq.length) voice(await buffer(pick(sq).file), {level: e.level * 0.8, pan, dist, radio: true});
      voice(call, {level: e.level, pan, dist, radio: true, when: 0.25});
      if (sq.length) voice(await buffer(pick(sq).file), {level: e.level * 0.8, pan, dist, radio: true, when: 0.35 + call.duration});
      return;
    }
    voice(await buffer(pick(files).file), {level: e.level, pan, dist});
  }
  function schedule() {
    clearTimeout(timer);
    if (!enabled || !on) return;
    timer = setTimeout(
      () => {
        if (!document.hidden) {
          const all = Object.entries(EVENTS),
            total = all.reduce((s, [, e]) => s + e.weight, 0);
          let r = Math.random() * total;
          const [id] = all.find(([, e]) => (r -= e.weight) < 0) || all[0];
          trigger(id).catch(() => {});
        }
        schedule();
      },
      2500 + Math.random() * 5500,
    );
  }

  function apply() {
    if (!graph) return;
    const live = enabled && on && !document.hidden;
    graph.master.gain.setTargetAtTime(live ? 1 : 0, graph.ctx.currentTime, live ? 0.8 : 0.25);
    if (enabled && on) {
      for (const b of BEDS) if (!b.playing) bed(b).catch(() => {});
      schedule();
    } else clearTimeout(timer);
  }
  // sound may only start after the first gesture on the page
  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    setup();
    graph.ctx.resume();
    apply();
  };
  addEventListener('pointerdown', start, {once: true, capture: true});
  addEventListener('keydown', start, {once: true, capture: true});
  document.addEventListener('visibilitychange', apply);

  return {
    stats,
    get on() {
      return on;
    },
    /** The warehouse is shown (true) or swapped for an HDR studio (false). */
    set(value) {
      enabled = value;
      apply();
    },
    /** The listener's own switch (remembered in this browser). */
    toggle(value = !on) {
      on = value;
      try {
        localStorage.setItem(PREF, on ? 'on' : 'off');
      } catch {
        /* storage blocked */
      }
      if (on) start();
      apply();
      return on;
    },
    trigger: id => (start(), trigger(id)),
  };
}
