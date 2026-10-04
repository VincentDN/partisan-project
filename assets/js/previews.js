// Index previews: when a menu item folds open, a small 1-bit animation of the demo plays on the LCD, with the demo's
// sounds coming in as if down a 1990s GSM phone call. The scenes are drawn in grey with Canvas 2-D at the LCD's own
// resolution, then ordered-dithered (Bayer 4 x 4) to the two LCD tones each frame. The sound is synthesised and passed
// through a "phone line": telephone band (300-3400 Hz), a coarse quantiser, codec warble, line hiss, the 217 Hz GSM
// buzz and the odd drop-out.
import {BAYER4} from './dither.js';
import {audio} from '../../shared/sfx.js';

export const W = 112,
  H = 44;
const INK = [0x16, 0x20, 0x0f],
  PAPER = [0xb5, 0xc7, 0x9a];

/** Which preview a menu item shows, from its link. */
export function sceneFor(item) {
  const h = item.href || '';
  if (h.includes('intro/advanced')) return 'advanced';
  if (h.includes('intro/')) return 'bench';
  if (h.includes('workbench/')) return 'modder';
  if (h.includes('?lab')) return 'lab';
  if (h.includes('operator/')) return 'operator';
  if (h.includes('convoy/')) return 'tactical';
  if (h.includes('band/')) return 'band';
  if (h.includes('wiki/')) return 'wiki';
  if (h.includes('viewer/')) return 'viewer';
  if (h.includes('moodboard')) return 'moodboard';
  if (h.includes('docs/')) return 'doc';
  return 'call';
}

// ---------- scenes: grey shapes on a white field, t in seconds ----------
const rifle = (g, x, y, s = 1, col = '#222') => {
  g.fillStyle = col;
  g.fillRect(x, y, 34 * s, 3 * s); // receiver and barrel
  g.fillRect(x + 34 * s, y + 0.5 * s, 14 * s, 1.5 * s);
  g.fillRect(x - 12 * s, y + 0.5 * s, 12 * s, 4 * s); // stock
  g.fillRect(x + 9 * s, y + 3 * s, 3 * s, 7 * s); // magazine
  g.fillRect(x + 2 * s, y + 3 * s, 2 * s, 5 * s); // grip
};
const pawn = (g, x, y, s = 1, col = '#333') => {
  g.fillStyle = col;
  g.beginPath();
  g.arc(x, y - 7 * s, 4 * s, 0, Math.PI * 2);
  g.fill();
  g.fillRect(x - 4 * s, y - 3 * s, 8 * s, 9 * s);
};
const SCENES = {
  bench(g, t) {
    // the table under a pulsing lamp, the rifle lying on it, the radio dial glowing
    const r = g.createRadialGradient(60, 4, 2, 60, 4, 60);
    r.addColorStop(0, `rgba(255,255,255,${0.9 + Math.sin(t * 3) * 0.1})`);
    r.addColorStop(1, '#666');
    g.fillStyle = r;
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#8a8a8a';
    g.fillRect(0, 30, W, 14);
    rifle(g, 26 + Math.sin(t) * 2, 24, 1.1);
    g.fillStyle = '#333';
    g.fillRect(88, 14, 20, 16);
    g.fillStyle = Math.sin(t * 7) > 0 ? '#fff' : '#ccc';
    g.fillRect(91, 17, 9, 4);
  },
  modder(g, t) {
    // a rifle on a light field; an optic drops onto the rail and snaps, then the muzzle device swaps
    g.fillStyle = '#eee';
    g.fillRect(0, 0, W, H);
    rifle(g, 30, 22, 1.15);
    const k = (t % 3) / 3,
      drop = Math.min(1, k * 3);
    g.fillStyle = '#111';
    g.fillRect(44, 4 + drop * 13, 12, 4); // optic
    g.fillRect(48, 8 + drop * 13, 3, 2);
    if (k > 0.35 && k < 0.42) {
      g.strokeStyle = '#000';
      g.strokeRect(41, 15, 18, 8); // the snap
    }
    g.fillStyle = k > 0.66 ? '#000' : '#555';
    g.fillRect(85, 21 + (k > 0.66 ? 0 : 1), k > 0.66 ? 9 : 5, k > 0.66 ? 4 : 2);
  },
  operator(g, t) {
    // the operator turning on a turntable, kit appearing piece by piece
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#fff');
    sky.addColorStop(1, '#999');
    g.fillStyle = sky;
    g.fillRect(0, 0, W, H);
    const c = Math.cos(t * 1.2);
    g.save();
    g.translate(56, 0);
    g.scale(0.35 + Math.abs(c) * 0.65, 1);
    g.fillStyle = '#222';
    g.beginPath();
    g.arc(0, 9, 5, 0, Math.PI * 2);
    g.fill(); // the hooded head
    g.fillRect(-7, 14, 14, 15); // torso
    g.fillRect(-6, 29, 5, 13);
    g.fillRect(1, 29, 5, 13); // legs
    if (t % 4 > 1) {
      g.fillStyle = '#555';
      g.fillRect(-8, 16, 16, 8); // the chest rig
    }
    if (t % 4 > 2) {
      g.fillStyle = '#000';
      g.fillRect(-10, 20, 22, 3); // the rifle
    }
    g.restore();
    g.fillStyle = '#777';
    g.fillRect(36, 41, 40, 3);
  },
  lab(g, t) {
    // the operator's silhouette in a different style every second: flat, gradient, outline, noise
    const mode = Math.floor(t) % 4;
    g.fillStyle = '#ddd';
    g.fillRect(0, 0, W, H);
    const fill = mode === 1 ? g.createLinearGradient(40, 0, 72, 0) : null;
    if (fill) {
      fill.addColorStop(0, '#000');
      fill.addColorStop(1, '#ccc');
    }
    g.fillStyle = fill || (mode === 3 ? '#777' : '#222');
    g.strokeStyle = '#000';
    g.beginPath();
    g.arc(56, 10, 6, 0, Math.PI * 2);
    g.rect(48, 16, 16, 18);
    g.rect(49, 34, 6, 10);
    g.rect(57, 34, 6, 10);
    if (mode === 2) g.stroke();
    else g.fill();
    if (mode === 3) for (let i = 0; i < 40; i++) g.clearRect(46 + Math.random() * 20, Math.random() * 44, 1, 1);
  },
  tactical(g, t) {
    // top down: a convoy rolls along the road, tracers fly from the ridge, a blast blooms
    g.fillStyle = '#bbb';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#888';
    g.fillRect(0, 26, W, 9);
    for (let i = 0; i < 3; i++) {
      const x = ((t * 14 + i * 26) % (W + 30)) - 20;
      g.fillStyle = '#222';
      g.fillRect(x, 27, 16, 7);
      g.fillStyle = '#555';
      g.fillRect(x + 12, 28, 4, 5);
    }
    for (let i = 0; i < 4; i++) pawn(g, 14 + i * 26, 12, 0.55, '#333');
    const k = (t * 1.7) % 1;
    g.strokeStyle = '#000';
    g.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const x0 = 18 + i * 26,
        x1 = x0 + 12 + i * 3;
      g.beginPath();
      g.moveTo(x0 + (x1 - x0) * k, 14 + 14 * k);
      g.lineTo(x0 + (x1 - x0) * (k + 0.12), 14 + 14 * (k + 0.12));
      g.stroke();
    }
    const b = (t % 3.2) / 3.2;
    if (b < 0.25) {
      const r = g.createRadialGradient(70, 30, 0, 70, 30, 4 + b * 50);
      r.addColorStop(0, '#fff');
      r.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = r;
      g.fillRect(0, 0, W, H);
    }
  },
  band(g, t) {
    // three soldiers; one at a time levels up: an arrow rises, its bar fills
    g.fillStyle = '#e6e6e6';
    g.fillRect(0, 0, W, H);
    const up = Math.floor(t / 1.2) % 3,
      k = (t % 1.2) / 1.2;
    for (let i = 0; i < 3; i++) {
      const x = 22 + i * 34;
      pawn(g, x, 26, 1.1, i === up ? '#000' : '#555');
      g.fillStyle = '#aaa';
      g.fillRect(x - 12, 38, 24, 3);
      g.fillStyle = '#000';
      g.fillRect(x - 12, 38, 24 * (i === up ? k : 0.3), 3);
      if (i === up) {
        g.beginPath();
        g.moveTo(x + 10, 16 - k * 8);
        g.lineTo(x + 14, 22 - k * 8);
        g.lineTo(x + 6, 22 - k * 8);
        g.fill();
      }
    }
  },
  advanced(g, t) {
    // a hand lifts a part off the rifle, sets it down and fits another
    g.fillStyle = '#ddd';
    g.fillRect(0, 0, W, H);
    rifle(g, 24, 26, 1.1);
    const k = (t % 3) / 3,
      lift = Math.sin(Math.min(1, k * 2) * Math.PI) * 14;
    g.fillStyle = '#111';
    g.fillRect(70, 25 - lift, 9, 4);
    g.fillStyle = '#555';
    g.beginPath();
    g.arc(74, 19 - lift, 5, 0, Math.PI * 2);
    g.fill();
  },
  viewer(g, t) {
    // a wireframe box turning, a triangle counter ticking
    g.fillStyle = '#eee';
    g.fillRect(0, 0, W, H);
    g.strokeStyle = '#000';
    const pts = [];
    for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) pts.push([x, y, z]);
    const a = t * 0.9,
      p = pts.map(([x, y, z]) => [56 + (x * Math.cos(a) - z * Math.sin(a)) * 12, 22 + y * 12 + (x * Math.sin(a) + z * Math.cos(a)) * 3]);
    g.beginPath();
    for (let i = 0; i < 8; i++)
      for (let j = i + 1; j < 8; j++)
        if ([0, 1, 2].filter(k => pts[i][k] !== pts[j][k]).length === 1) {
          g.moveTo(...p[i]);
          g.lineTo(...p[j]);
        }
    g.stroke();
    g.fillStyle = '#000';
    g.font = '7px monospace';
    g.fillText(`${(4200 + (Math.floor(t * 37) % 900)).toString()} tris`, 4, 40);
  },
  doc(g, t) {
    // a page scrolling past
    g.fillStyle = '#f2f2f2';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#111';
    for (let i = 0; i < 10; i++) {
      const y = ((i * 7 - t * 9) % 70) + 70;
      const yy = (y % 70) - 6;
      g.fillRect(16, yy, i % 4 === 0 ? 40 : 60 + ((i * 17) % 20), i % 4 === 0 ? 4 : 2);
    }
  },
  moodboard(g, t) {
    // frames sliding by, each a different shade
    g.fillStyle = '#ccc';
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 5; i++) {
      const x = ((i * 34 - t * 12) % 170) + 170;
      g.fillStyle = ['#222', '#666', '#999', '#444', '#888'][i];
      g.fillRect((x % 170) - 30, 8, 28, 28);
    }
  },
  wiki(g, t) {
    // a catalogue: rows scrolling, one highlighted, its card with a rifle on it
    g.fillStyle = '#eee';
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 8; i++) {
      const y = ((i * 7 - t * 8) % 56) + 56;
      const yy = (y % 56) - 6,
        hi = i === Math.floor(t * 1.5) % 8;
      g.fillStyle = hi ? '#000' : '#888';
      g.fillRect(4, yy, 44, 5);
    }
    g.fillStyle = '#ccc';
    g.fillRect(56, 4, 52, 36);
    rifle(g, 68, 16, 0.6, '#111');
    g.fillStyle = '#333';
    for (let i = 0; i < 3; i++) g.fillRect(60, 28 + i * 4, 24 + ((i * 13 + Math.floor(t * 1.5) * 7) % 20), 2);
  },
  call(g, t) {
    // ringing handset
    g.fillStyle = '#eee';
    g.fillRect(0, 0, W, H);
    pawn(g, 56 + Math.sin(t * 30) * (Math.sin(t * 2) > 0 ? 1.5 : 0), 30, 1.4, '#222');
  },
};

/** Draw scene `id` at time t into a W x H canvas, dithered to the LCD tones. Returns the ink coverage (0..1). */
export function drawPreview(canvas, id, t) {
  const g = canvas.getContext('2d', {willReadFrequently: true});
  g.save();
  (SCENES[id] || SCENES.call)(g, t);
  g.restore();
  const img = g.getImageData(0, 0, W, H),
    px = img.data;
  let ink = 0;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4,
        l = (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255;
      const on = l < (BAYER4[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
      const c = on ? INK : PAPER;
      px[i] = c[0];
      px[i + 1] = c[1];
      px[i + 2] = c[2];
      px[i + 3] = 255;
      ink += on;
    }
  g.putImageData(img, 0, 0);
  return ink / (W * H);
}

// ---------- the phone line ----------
let line = null;
/** The GSM call: everything played into `line.input` comes out band-limited, quantised, warbling and hissing. */
function phoneLine() {
  if (line) return line;
  const {ctx, out} = audio();
  const input = ctx.createGain(),
    hp = ctx.createBiquadFilter(),
    lp = ctx.createBiquadFilter(),
    mid = ctx.createBiquadFilter(),
    crush = ctx.createWaveShaper(),
    warble = ctx.createGain(),
    level = ctx.createGain();
  hp.type = 'highpass';
  hp.frequency.value = 320;
  hp.Q.value = 0.9;
  lp.type = 'lowpass';
  lp.frequency.value = 3300;
  lp.Q.value = 1.2;
  mid.type = 'peaking';
  mid.frequency.value = 1700;
  mid.gain.value = 7;
  // a coarse quantiser with a soft knee: the low-bit codec grit
  const n = 2048,
    curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1,
      s = Math.tanh(x * 2.2);
    curve[i] = Math.round(s * 14) / 14;
  }
  crush.curve = curve;
  // codec warble: the level wobbles a little, fast
  const lfo = ctx.createOscillator(),
    depth = ctx.createGain();
  lfo.frequency.value = 23;
  depth.gain.value = 0.18;
  warble.gain.value = 0.82;
  lfo.connect(depth).connect(warble.gain);
  lfo.start();
  level.gain.value = 0.55;
  input.connect(hp).connect(mid).connect(lp).connect(crush).connect(warble).connect(level).connect(out);
  // line hiss and the GSM buzz (217 Hz bursts), both quiet, both on the line only while a preview plays
  const hissBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate),
    d = hissBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.5;
  const hiss = ctx.createBufferSource();
  hiss.buffer = hissBuf;
  hiss.loop = true;
  const hissGain = ctx.createGain();
  hissGain.gain.value = 0;
  hiss.connect(hissGain).connect(hp);
  hiss.start();
  const buzz = ctx.createOscillator(),
    buzzGate = ctx.createGain(),
    buzzGain = ctx.createGain();
  buzz.type = 'square';
  buzz.frequency.value = 217;
  const gate = ctx.createOscillator();
  gate.type = 'square';
  gate.frequency.value = 2.2;
  const gateDepth = ctx.createGain();
  gateDepth.gain.value = 0.5;
  buzzGate.gain.value = 0.5;
  gate.connect(gateDepth).connect(buzzGate.gain);
  buzzGain.gain.value = 0;
  buzz.connect(buzzGate).connect(buzzGain).connect(hp);
  buzz.start();
  gate.start();
  line = {ctx, input, level, hissGain, buzzGain};
  return line;
}

// ---------- sounds per scene, scheduled onto the line ----------
function burst(L, at, {dur = 0.08, freq = 1200, q = 0.8, gain = 0.8, type = 'bandpass'} = {}) {
  const {ctx} = L;
  const src = ctx.createBufferSource(),
    buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * (dur + 0.05)), ctx.sampleRate),
    d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  src.buffer = buf;
  const f = ctx.createBiquadFilter(),
    g = ctx.createGain();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  g.gain.setValueAtTime(gain, at);
  g.gain.exponentialRampToValueAtTime(0.001, at + dur);
  src.connect(f).connect(g).connect(L.input);
  src.start(at);
  src.stop(at + dur + 0.05);
}
function tone(L, at, {freq = 440, end = null, dur = 0.12, gain = 0.4, type = 'square'} = {}) {
  const {ctx} = L,
    o = ctx.createOscillator(),
    g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, at);
  if (end) o.frequency.exponentialRampToValueAtTime(end, at + dur);
  g.gain.setValueAtTime(gain, at);
  g.gain.exponentialRampToValueAtTime(0.001, at + dur);
  o.connect(g).connect(L.input);
  o.start(at);
  o.stop(at + dur + 0.02);
}
const shot = (L, at, k = 1) => (
  burst(L, at, {dur: 0.12 * k, freq: 900, q: 0.6, gain: 1}),
  tone(L, at, {freq: 160, end: 60, dur: 0.1, type: 'sine', gain: 0.8})
);
const clank = (L, at) => (
  burst(L, at, {dur: 0.04, freq: 2500, q: 3, gain: 0.7}),
  tone(L, at, {freq: 620, end: 560, dur: 0.25, type: 'triangle', gain: 0.25})
);
/** Each scene's sound loop: called about every `every` seconds while its preview is open. */
const SOUNDS = {
  tactical: {
    every: 1.6,
    play: (L, t) => {
      for (let i = 0; i < 4; i++) shot(L, t + i * 0.1);
      if (Math.random() < 0.4) burst(L, t + 0.7, {dur: 0.7, freq: 400, q: 0.5, gain: 1.2, type: 'lowpass'});
    },
  },
  modder: {every: 1.5, play: (L, t) => (clank(L, t), clank(L, t + 0.45), burst(L, t + 0.9, {dur: 0.18, freq: 1800, q: 1.5, gain: 0.5}))},
  bench: {
    every: 2.4,
    play: (L, t) => (
      tone(L, t, {freq: 523, dur: 0.3, type: 'triangle', gain: 0.25}),
      tone(L, t + 0.35, {freq: 659, dur: 0.3, type: 'triangle', gain: 0.25}),
      tone(L, t + 0.7, {freq: 784, dur: 0.5, type: 'triangle', gain: 0.25})
    ),
  },
  operator: {every: 1.8, play: (L, t) => (burst(L, t, {dur: 0.35, freq: 2600, q: 0.7, gain: 0.5}), clank(L, t + 0.6))},
  lab: {every: 1, play: (L, t) => tone(L, t, {freq: 880 + Math.random() * 600, dur: 0.06, gain: 0.3})},
  band: {
    every: 1.2,
    play: (L, t) => (tone(L, t, {freq: 523, dur: 0.1}), tone(L, t + 0.1, {freq: 659, dur: 0.1}), tone(L, t + 0.2, {freq: 1047, dur: 0.2})),
  },
  advanced: {every: 1.5, play: (L, t) => (clank(L, t + 0.2), clank(L, t + 1.0))},
  viewer: {every: 2, play: (L, t) => tone(L, t, {freq: 200, end: 400, dur: 0.6, type: 'sawtooth', gain: 0.15})},
  doc: {
    every: 0.9,
    play: (L, t) => {
      for (let i = 0; i < 4; i++) burst(L, t + i * 0.12 + Math.random() * 0.04, {dur: 0.02, freq: 3000, q: 2, gain: 0.5});
    },
  },
  moodboard: {every: 1.6, play: (L, t) => burst(L, t, {dur: 0.25, freq: 1400, q: 0.6, gain: 0.35})},
  wiki: {
    every: 1.1,
    play: (L, t) => (burst(L, t, {dur: 0.03, freq: 2600, q: 2, gain: 0.4}), burst(L, t + 0.5, {dur: 0.2, freq: 1500, q: 0.5, gain: 0.25})),
  },
  call: {every: 2, play: (L, t) => tone(L, t, {freq: 425, dur: 0.9, type: 'sine', gain: 0.35})}, // a ringing tone
};

/**
 * Start a preview in `canvas`: the animation (unless reduced motion asks for a still) and, when `withSound`, the
 * scene's sounds down the phone line. Returns stop().
 */
export function startPreview(canvas, id, {withSound = true, reduceMotion = false} = {}) {
  canvas.width = W;
  canvas.height = H;
  let raf = 0,
    stopped = false;
  const t0 = performance.now();
  const frame = () => {
    if (stopped) return;
    drawPreview(canvas, id, (performance.now() - t0) / 1000);
    if (!reduceMotion) raf = setTimeout(() => requestAnimationFrame(frame), 90); // about 10 frames a second, like the LCD
  };
  frame();
  let timer = 0,
    L = null;
  if (withSound) {
    try {
      L = phoneLine();
      const s = SOUNDS[id] || SOUNDS.call,
        now = L.ctx.currentTime;
      L.ctx.resume();
      L.hissGain.gain.setTargetAtTime(0.05, now, 0.05);
      L.buzzGain.gain.setTargetAtTime(0.025, now, 0.05);
      tone(L, now + 0.02, {freq: 1400, dur: 0.05, gain: 0.25}); // the line picking up
      const loop = () => {
        if (stopped) return;
        const t = L.ctx.currentTime + 0.05;
        // now and then the call drops out for a moment
        if (Math.random() < 0.15) {
          L.level.gain.setValueAtTime(0.55, t + 0.3);
          L.level.gain.linearRampToValueAtTime(0.02, t + 0.33);
          L.level.gain.linearRampToValueAtTime(0.55, t + 0.5);
        }
        s.play(L, t);
        timer = setTimeout(loop, s.every * 1000);
      };
      timer = setTimeout(loop, 250);
    } catch {
      L = null;
    }
  }
  return () => {
    stopped = true;
    clearTimeout(raf);
    clearTimeout(timer);
    if (L) {
      const now = L.ctx.currentTime;
      L.hissGain.gain.setTargetAtTime(0, now, 0.05);
      L.buzzGain.gain.setTargetAtTime(0, now, 0.05);
    }
  };
}
