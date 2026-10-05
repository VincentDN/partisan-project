// Sounds for the hands-on pawn on the Rebel Band screen (band/handling.js events): footsteps with a little gear rattle,
// cloth when it turns, real recorded shots (assets/audio/shooter) and the reload choreography from the recorded foley
// bank (assets/audio/foley). Loaded on the first action, silent when the site's sound preference is off.
import {audio} from '../shared/sfx.js';
import {soundLayer} from '../shared/sound-layer.js';

const REAL = new URL('../assets/audio/shooter/', import.meta.url),
  FOLEY = new URL('../assets/audio/foley/', import.meta.url);
const CATS = ['shot-rifle', 'shot-sniper', 'rpg-launch'],
  BANKS = ['click', 'clunk', 'slide', 'hit', 'long', 'handle', 'ratchet'];
const BANK_FOR = {belt: 'ratchet'}; // the reload table's belt feed plays the ratchet takes

const enabled = () => {
  try {
    return soundLayer().prefs.on;
  } catch {
    return true;
  }
};

export function handlingAudio() {
  const bufs = {}; // category or bank -> [AudioBuffer]
  let loading = null,
    steps = 0;
  const decode = async (ctx, url) => {
    try {
      return await ctx.decodeAudioData(await (await fetch(url)).arrayBuffer());
    } catch {
      return null;
    }
  };
  function load(ctx) {
    loading ??= (async () => {
      try {
        const [real, foley] = await Promise.all(
          [new URL('manifest.json', REAL), new URL('manifest.json', FOLEY)].map(async u => (await fetch(u)).json()),
        );
        await Promise.all([
          ...CATS.map(async c => {
            const files = real.categories?.[c]?.files || [];
            bufs[c] = (await Promise.all(files.slice(0, 3).map(f => decode(ctx, new URL(f.file, REAL))))).filter(Boolean);
          }),
          ...BANKS.map(async b => {
            const files = foley[b] || [];
            bufs[b] = (await Promise.all(files.slice(0, 4).map(f => decode(ctx, new URL(`${b}/${f}`, FOLEY))))).filter(Boolean);
          }),
        ]);
      } catch {
        /* no recordings: the synthesised layers still play */
      }
    })();
    return loading;
  }
  function sample(ctx, out, name, {gain = 1, rate = 1, len = 0, at = ctx.currentTime} = {}) {
    const list = bufs[name];
    if (!list?.length) return false;
    const src = ctx.createBufferSource(),
      g = ctx.createGain();
    src.buffer = list[Math.floor(Math.random() * list.length)];
    src.playbackRate.value = rate * (0.95 + Math.random() * 0.1);
    g.gain.setValueAtTime(gain, at);
    if (len) g.gain.setTargetAtTime(0, at + len - 0.12, 0.05);
    src.connect(g).connect(out);
    src.start(at);
    if (len) src.stop(at + len + 0.3);
    return true;
  }
  /** Filtered noise: a footfall, cloth, or a fallback crack when the recordings have not loaded. */
  function noise(ctx, out, n, {at = ctx.currentTime, dur = 0.06, gain = 0.4, type = 'lowpass', freq = 900, q = 0.7} = {}) {
    const src = ctx.createBufferSource(),
      f = ctx.createBiquadFilter(),
      g = ctx.createGain();
    src.buffer = n;
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(gain, at + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(f).connect(g).connect(out);
    src.start(at, Math.random() * 1.5, dur + 0.05);
  }

  return {
    /** One event from the handling controller. */
    on(type, data = {}) {
      if (!enabled()) return;
      let a;
      try {
        a = audio();
      } catch {
        return;
      }
      const {ctx, out, noise: n} = a;
      load(ctx);
      const v = 0.85 + Math.random() * 0.3;
      if (type === 'step') {
        // a boot on gravel, and every other step the kit on the body knocks together
        const k = data.sprint ? 1.25 : 1;
        noise(ctx, out, n, {dur: 0.08, gain: 0.32 * k, freq: 800 * v});
        noise(ctx, out, n, {at: ctx.currentTime + 0.012, dur: 0.05, gain: 0.12 * k, type: 'highpass', freq: 3600 * v});
        if (++steps % 2 === 0) sample(ctx, out, 'handle', {gain: 0.1 * k, rate: 1.1});
      } else if (type === 'turn') {
        noise(ctx, out, n, {dur: 0.16, gain: 0.12, type: 'bandpass', freq: 1500 * v, q: 0.8}); // cloth
        sample(ctx, out, 'handle', {gain: 0.08});
      } else if (type === 'shot') {
        const s = data.profile.shot;
        if (!sample(ctx, out, s.cat, {gain: s.gain, rate: s.rate, len: s.len})) {
          noise(ctx, out, n, {dur: 0.05, gain: 0.7, type: 'highpass', freq: 1800});
          noise(ctx, out, n, {dur: 0.35, gain: 0.5, freq: 700});
        }
      } else if (type === 'dry') {
        if (!sample(ctx, out, 'click', {gain: 0.5, rate: 1.3}))
          noise(ctx, out, n, {dur: 0.02, gain: 0.3, type: 'bandpass', freq: 3000, q: 4});
      } else if (type === 'reload-move') {
        const bank = BANK_FOR[data.bank] || data.bank;
        if (bank === 'rustle' || !sample(ctx, out, bank, {gain: 0.55 * data.gain}))
          noise(ctx, out, n, {dur: 0.2, gain: 0.16 * data.gain, type: 'bandpass', freq: 1300 * v, q: 0.6});
      }
    },
  };
}
