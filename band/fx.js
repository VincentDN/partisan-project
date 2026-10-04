// Rebel Band effects: the idle loop that keeps every pawn breathing, and the promotion, played on the big pawn when a
// soldier steps up a class: the old class glows and shakes, sparks rise, it dithers away into the new class through an
// 8 x 8 Bayer pattern, a white flash, light rays turn behind the new pawn as it pops in, and a PROMOTED banner.
// Drawing is done by callbacks (band.js owns the pawns); this module owns time.
const B8 = (() => {
  let m = [[0]];
  for (let n = 1; n < 8; n *= 2)
    m = [
      ...m.map(r => [...r.map(v => 4 * v), ...r.map(v => 4 * v + 2)]),
      ...m.map(r => [...r.map(v => 4 * v + 3), ...r.map(v => 4 * v + 1)]),
    ];
  return m.flat();
})();
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = k => 1 - (1 - k) ** 3;

// ---------- idle ----------
/** canvas -> {draw(g, t)}: every registered pawn canvas is redrawn about 30 times a second with the time. */
const idlers = new Map();
let last = 0;
function tick(now) {
  requestAnimationFrame(tick);
  if (document.hidden || now - last < 33) return;
  last = now;
  const t = now / 1000;
  for (const [canvas, it] of idlers) {
    if (!canvas.isConnected) {
      idlers.delete(canvas);
      continue;
    }
    if (it.busy || canvas.offsetParent === null) continue; // promoting, or hidden
    it.draw(canvas.getContext('2d'), t);
  }
}
if (!reduceMotion) requestAnimationFrame(tick);
/** Keep `canvas` animated with draw(g, t); draws once at once. Reduced motion: drawn once, still. */
export function idle(canvas, draw) {
  draw(canvas.getContext('2d'), reduceMotion ? 0 : performance.now() / 1000);
  if (!reduceMotion) idlers.set(canvas, {draw, busy: false});
}
/**
 * The idle motion for a pawn at time t (seconds), with a per-pawn phase: a slow breath (a little lift and squash), a
 * weight shift from foot to foot, and the gun swaying with it.
 */
export function idlePose(t, phase = 0) {
  if (reduceMotion) return {lift: 0, squash: 1, shift: 0, gun: 0};
  const breath = Math.sin((t + phase) * Math.PI * 2 * 0.42),
    sway = Math.sin((t + phase * 1.7) * Math.PI * 2 * 0.17);
  return {lift: breath * 0.012, squash: 1 + breath * 0.014, shift: sway * 0.012, gun: breath * 0.035 + sway * 0.02};
}

// ---------- promotion ----------
/**
 * Play the promotion on `canvas`. drawOld / drawNew(g, t) paint the pawn (with its ground) onto a context the size
 * of the canvas. Resolves when it is done; the canvas then goes back to its idle loop (drawNew).
 */
const runs = new WeakMap(); // canvas -> the promotion playing on it (a newer one, or endPromotion, stops the older)
/** Stop any promotion on `canvas` and hand it back to its idle loop. */
export function endPromotion(canvas) {
  runs.set(canvas, {});
  const cur = idlers.get(canvas);
  if (cur) cur.busy = false;
}
export function promote(canvas, drawOld, drawNew, {title = 'PROMOTED', sub = ''} = {}) {
  const token = {};
  runs.set(canvas, token);
  const W = canvas.width,
    H = canvas.height,
    g = canvas.getContext('2d');
  const it = idlers.get(canvas);
  if (it) it.busy = true;
  const off = n => Object.assign(document.createElement('canvas'), {width: W, height: H}).getContext('2d');
  const A = off(),
    Bc = off(),
    glow = off(),
    S = 4,
    mask = off();
  mask.canvas.width = Math.ceil(W / S);
  mask.canvas.height = Math.ceil(H / S);
  const sparks = Array.from({length: 46}, (_, i) => ({
    x: W / 2 + (Math.random() - 0.5) * W * 0.45,
    y: H * 0.72,
    v: 60 + Math.random() * 140,
    d: Math.random() * 0.9,
    s: 1 + Math.random() * 2.5,
    i,
  }));
  const D = reduceMotion ? 0.35 : 2.3;
  return new Promise(done => {
    const t0 = performance.now() / 1000;
    const frame = () => {
      if (runs.get(canvas) !== token) return done(); // cut short
      const now = performance.now() / 1000,
        k = (now - t0) / D,
        t = now;
      g.clearRect(0, 0, W, H);
      if (reduceMotion) {
        drawNew(g, 0);
      } else {
        const charge = clamp(k / 0.3),
          melt = clamp((k - 0.28) / 0.27),
          pop = clamp((k - 0.55) / 0.2),
          after = clamp((k - 0.55) / 0.45);
        // light rays turning behind, from the dissolve on
        if (melt > 0) {
          g.save();
          g.translate(W / 2, H * 0.48);
          g.rotate(t * 0.6);
          g.globalAlpha = 0.5 * Math.min(melt * 2, 1) * (1 - after * 0.85);
          for (let i = 0; i < 12; i++) {
            g.rotate((Math.PI * 2) / 12);
            const grad = g.createLinearGradient(0, 0, 0, -H * 0.6);
            grad.addColorStop(0, 'rgba(255,224,140,.9)');
            grad.addColorStop(1, 'rgba(255,224,140,0)');
            g.fillStyle = grad;
            g.beginPath();
            g.moveTo(0, 0);
            g.lineTo(-W * 0.05, -H * 0.6);
            g.lineTo(W * 0.05, -H * 0.6);
            g.fill();
          }
          g.restore();
        }
        // the old class, shaking and glowing
        A.clearRect(0, 0, W, H);
        Bc.clearRect(0, 0, W, H);
        const shake = charge * (1 - melt) * 4;
        A.save();
        A.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
        drawOld(A, t);
        A.restore();
        if (charge > 0) {
          glow.clearRect(0, 0, W, H);
          glow.drawImage(A.canvas, 0, 0);
          glow.globalCompositeOperation = 'source-atop';
          glow.fillStyle = `rgba(255,236,170,${0.75 * charge})`;
          glow.fillRect(0, 0, W, H);
          glow.globalCompositeOperation = 'source-over';
          A.drawImage(glow.canvas, 0, 0);
        }
        // the new class pops in with a bounce
        const s = pop > 0 ? 1 + Math.sin(pop * Math.PI) * 0.12 * (1 - pop) + (1 - ease(pop)) * 0.06 : 1;
        Bc.save();
        Bc.translate(W / 2, H * 0.75);
        Bc.scale(s, s);
        Bc.translate(-W / 2, -H * 0.75);
        drawNew(Bc, t);
        Bc.restore();
        // the dissolve: a Bayer mask decides, pixel block by block, which of the two shows
        if (melt <= 0) g.drawImage(A.canvas, 0, 0);
        else if (melt >= 1) g.drawImage(Bc.canvas, 0, 0);
        else {
          const m = mask.canvas,
            img = mask.createImageData(m.width, m.height);
          for (let y = 0; y < m.height; y++)
            for (let x = 0; x < m.width; x++) img.data[(y * m.width + x) * 4 + 3] = (B8[(y & 7) * 8 + (x & 7)] + 0.5) / 64 < melt ? 255 : 0;
          mask.putImageData(img, 0, 0);
          g.drawImage(A.canvas, 0, 0);
          glow.clearRect(0, 0, W, H);
          glow.drawImage(Bc.canvas, 0, 0);
          glow.globalCompositeOperation = 'destination-in';
          glow.imageSmoothingEnabled = false;
          glow.drawImage(m, 0, 0, W, H);
          glow.globalCompositeOperation = 'source-over';
          g.save();
          g.globalCompositeOperation = 'destination-out';
          g.imageSmoothingEnabled = false;
          g.drawImage(m, 0, 0, W, H);
          g.restore();
          g.drawImage(glow.canvas, 0, 0);
        }
        // sparks rising
        g.save();
        g.globalCompositeOperation = 'lighter';
        for (const p of sparks) {
          const life = k * D - p.d * 0.6;
          if (life < 0 || life > 1.4) continue;
          const y = p.y - p.v * life,
            x = p.x + Math.sin(life * 6 + p.i) * 8;
          g.fillStyle = `rgba(255,${200 + (p.i % 3) * 20},120,${1 - life / 1.4})`;
          g.fillRect(Math.round(x), Math.round(y), p.s, p.s);
        }
        g.restore();
        // the flash at the change-over
        const flash = Math.max(0, 1 - Math.abs(k - 0.55) / 0.08);
        if (flash > 0) {
          g.fillStyle = `rgba(255,250,230,${flash * 0.85})`;
          g.fillRect(0, 0, W, H);
        }
        // the banner
        if (pop > 0) {
          const a = clamp(pop * 2) * (1 - clamp((k - 0.92) / 0.08));
          g.save();
          g.globalAlpha = a;
          g.textAlign = 'center';
          g.fillStyle = 'rgba(20,24,14,.85)';
          g.fillRect(W * 0.12, H * 0.04, W * 0.76, sub ? 54 : 34);
          g.strokeStyle = '#e9c46a';
          g.lineWidth = 2;
          g.strokeRect(W * 0.12, H * 0.04, W * 0.76, sub ? 54 : 34);
          g.fillStyle = '#e9c46a';
          g.font = '700 20px ui-monospace, Menlo, Consolas, monospace';
          g.fillText(title, W / 2, H * 0.04 + 24);
          if (sub) {
            g.fillStyle = '#d8e3c4';
            g.font = '600 12px ui-monospace, Menlo, Consolas, monospace';
            g.fillText(sub, W / 2, H * 0.04 + 44);
          }
          g.restore();
        }
      }
      if (k < 1) requestAnimationFrame(frame);
      else {
        g.clearRect(0, 0, W, H);
        drawNew(g, performance.now() / 1000);
        const cur = idlers.get(canvas);
        if (cur) cur.busy = false;
        done();
      }
    };
    requestAnimationFrame(frame);
  });
}
