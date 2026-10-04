// Small Nokia-style interface sounds for the index: a tap when the selection moves, a two-note chirp on select, a falling
// note on back, and a little fanfare for unlocking. Synthesised with Web Audio (no samples), and silent when the music preference is off.
import {audio} from './sfx.js';
import {soundLayer} from './sound-layer.js';

const enabled = () => {
  try {
    return soundLayer().prefs.on;
  } catch {
    return true;
  }
};

/** One square-wave note: `freq` Hz for `dur` seconds from `t`, with a fast attack and an exponential decay. */
const LEVEL = 4.5; // blip level relative to the first mix (about +13 dB): the phone's beeps sit clearly over the music
function note(ctx, out, freq, t, dur, gain = 0.07, type = 'square') {
  gain *= LEVEL;
  const osc = ctx.createOscillator(),
    g = ctx.createGain(),
    lp = ctx.createBiquadFilter();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  lp.type = 'lowpass';
  lp.frequency.value = 3200; // soften the square so it reads as a speaker, not a buzzer
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(lp).connect(g).connect(out);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function play(fn) {
  if (!enabled()) return;
  try {
    const {ctx, out} = audio();
    fn(ctx, out, ctx.currentTime + 0.005);
  } catch {}
}

/** Selection moved: a short dry tick. */
export const tap = () =>
  play((ctx, out, t) => {
    note(ctx, out, 1250, t, 0.035, 0.05);
    note(ctx, out, 620, t, 0.025, 0.03, 'triangle');
  });
/** Chosen: two quick rising notes. */
export const select = () =>
  play((ctx, out, t) => {
    note(ctx, out, 880, t, 0.07);
    note(ctx, out, 1320, t + 0.07, 0.11);
  });
/** Back or exit: a falling pair. */
export const back = () =>
  play((ctx, out, t) => {
    note(ctx, out, 990, t, 0.06);
    note(ctx, out, 660, t + 0.06, 0.1);
  });
/** Nothing to do: a low blip. */
export const deny = () => play((ctx, out, t) => note(ctx, out, 220, t, 0.12, 0.06));
/** Something unlocked: a quick rising arpeggio. */
export const unlock = () =>
  play((ctx, out, t) => {
    [784, 988, 1175, 1568].forEach((f, i) => note(ctx, out, f, t + i * 0.07, i === 3 ? 0.22 : 0.08));
  });
/** Victory: an 8-bit fanfare, a run up to a held major chord. */
export const victory = () =>
  play((ctx, out, t) => {
    const run = [523, 659, 784, 1047];
    run.forEach((f, i) => note(ctx, out, f, t + i * 0.09, 0.09, 0.06));
    const at = t + run.length * 0.09 + 0.02;
    note(ctx, out, 784, at, 0.12, 0.05);
    note(ctx, out, 1047, at + 0.13, 0.7, 0.06);
    note(ctx, out, 1319, at + 0.13, 0.7, 0.04);
    note(ctx, out, 1568, at + 0.13, 0.7, 0.03);
    note(ctx, out, 262, at + 0.13, 0.7, 0.05, 'triangle');
  });
