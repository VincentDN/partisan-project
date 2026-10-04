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
/**
 * A secret getting closer (the vincentdenil.com nerd-mode easter egg): taps 1-6 each ping a whole tone higher than the
 * last, gaining notes and volume, so the ear counts instead of the screen.
 */
export const climb = step =>
  play((ctx, out, t) => {
    const base = 660 * 2 ** (((step - 1) * 2) / 12),
      peak = (0.04 + step * 0.012) / LEVEL; // note() scales by LEVEL; keep the site's own levels
    note(ctx, out, base, t, 0.08, peak);
    note(ctx, out, base * 1.5, t + 0.06, 0.08, peak * 0.8);
    if (step >= 3) note(ctx, out, base * 2, t + 0.12, 0.09, peak * 0.7);
    if (step >= 4) note(ctx, out, base / 2, t, 0.2, peak * 0.35, 'sawtooth');
    if (step >= 5) note(ctx, out, base * 3, t + 0.18, 0.1, peak * 0.6);
    if (step >= 6) note(ctx, out, base * 4, t + 0.24, 0.12, peak * 0.8, 'triangle');
  });
/** Unlocked: a fast rising arpeggio into a held major chord (the site's "level unlocked"). */
export const unlock = () =>
  play((ctx, out, t) => {
    const v = x => x / LEVEL;
    [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98].forEach((f, i) => note(ctx, out, f, t + i * 0.07, 0.1, v(0.1)));
    const c = t + 0.45;
    note(ctx, out, 1046.5, c, 0.6, v(0.09));
    note(ctx, out, 1318.51, c, 0.6, v(0.07));
    note(ctx, out, 1567.98, c, 0.6, v(0.07));
    note(ctx, out, 2093, c, 0.6, v(0.08), 'triangle');
    note(ctx, out, 261.63, c, 0.6, v(0.05), 'sawtooth');
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
