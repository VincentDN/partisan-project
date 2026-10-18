// Original quiet minor-key campaign score: plucked strings over soft bowed tones, with no percussion or recording downloads.
export const CAMPAIGN_BAR = 4.8; // 50 BPM, four beats
const chords = [
  [45, 52, 57, 60, 64],
  [41, 48, 53, 57, 60],
  [38, 45, 50, 53, 57],
  [40, 47, 52, 55, 59],
];
const hz = n => 440 * 2 ** ((n - 69) / 12);
function tone(g, note, t, duration, pluck) {
  const {ctx} = g,
    osc = ctx.createOscillator(),
    amp = ctx.createGain(),
    filter = ctx.createBiquadFilter();
  osc.type = pluck ? 'triangle' : 'sawtooth';
  osc.frequency.value = hz(note);
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(pluck ? 2600 : 650, t);
  if (pluck) filter.frequency.exponentialRampToValueAtTime(450, t + duration);
  const peak = pluck ? 0.09 : 0.018;
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(peak, t + (pluck ? 0.012 : 1.1));
  amp.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(filter).connect(amp);
  amp.connect(g.out);
  amp.connect(g.reverb);
  osc.start(t);
  osc.stop(t + duration + 0.05);
  osc.onended = () => {
    osc.disconnect();
    filter.disconnect();
    amp.disconnect();
  };
}
export function scheduleCampaignBar(g, index, t) {
  const chord = chords[Math.floor(index / 2) % chords.length];
  for (const n of chord.slice(1)) tone(g, n, t, CAMPAIGN_BAR + 0.4, false);
  for (const [beat, n] of [chord[0], chord[2], chord[4], chord[3]].entries()) tone(g, n, t + beat * 1.2, 2.8, true);
}
