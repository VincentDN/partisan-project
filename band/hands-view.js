// The Rebel Band's big character under the player's hands: drawing the handled pose (paintHandled) and wiring the
// mouse and keyboard to the controller (band/handling.js) and its sounds (band/handling-audio.js).
import {createHandling} from './handling.js';
import {handlingAudio} from './handling-audio.js';
import {hold} from './fx.js';

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * The pawn under the player's hands (band/handling.js pose): it faces where it aims or walks, as the shooter draws a
 * rebel (east and west from the side, north from behind with the gun behind it), bobs with each stride, kicks back
 * when it fires with a flash at the muzzle, and lowers and tilts the gun to reload.
 */
export function paintHandled(g, p, gun, {size, cx, cy, pose}) {
  const u = size / 2.4, // pixels per metre: the shooter draws a pawn 2.4 m across
    a = pose.aim,
    ca = Math.cos(a),
    sa = Math.sin(a),
    left = ca < 0,
    bob = pose.bob * 0.06 * u,
    recoil = pose.kick * 0.05 * u;
  const img = pose.dir === 'west' ? p.east : p[pose.dir];
  const len = gun ? gun.length * 1.4 * u : 0,
    gh = gun ? (len * gun.img.height) / gun.img.width : 0,
    off = len * 0.28 * (1 - pose.dip * 0.35) - recoil * 2,
    gx = cx + ca * off - ca * recoil,
    gy = cy + 0.42 * u + sa * off - sa * recoil - bob + pose.dip * 0.1 * u;
  // the reload tilts the muzzle toward the ground on whichever side the gun points
  const rot = a + (left ? -1 : 1) * pose.dip * 0.75 - (left ? -1 : 1) * pose.kick * 0.12;
  const drawGun = () => {
    if (!gun) return;
    g.save();
    g.translate(gx, gy);
    g.rotate(rot);
    if (left) g.scale(1, -1);
    g.drawImage(gun.img, -len / 2, -gh / 2, len, gh);
    g.restore();
  };
  if (pose.dir === 'north') drawGun();
  g.save();
  g.translate(cx - ca * recoil * 0.6, cy - bob - sa * recoil * 0.6);
  if (pose.dir === 'west') g.scale(-1, 1);
  g.drawImage(img, -size / 2, -size / 2, size, size);
  g.restore();
  if (pose.dir !== 'north') drawGun();
  if (pose.flash && gun) {
    const mx = gx + Math.cos(rot) * len * 0.55,
      my = gy + Math.sin(rot) * len * 0.55,
      R = 0.55 * u;
    g.save();
    g.globalCompositeOperation = 'lighter';
    const r = g.createRadialGradient(mx, my, 0, mx, my, R);
    r.addColorStop(0, 'rgba(255,240,200,.95)');
    r.addColorStop(0.25, 'rgba(255,190,90,.7)');
    r.addColorStop(1, 'rgba(255,150,60,0)');
    g.fillStyle = r;
    g.fillRect(mx - R, my - R, R * 2, R * 2);
    // the star of the blast along the barrel
    g.translate(mx, my);
    g.rotate(rot);
    g.fillStyle = 'rgba(255,225,150,.9)';
    g.beginPath();
    g.moveTo(0, -0.06 * u);
    g.lineTo(0.5 * u, 0);
    g.lineTo(0, 0.06 * u);
    g.lineTo(0.1 * u, 0);
    g.closePath();
    g.fill();
    g.restore();
  }
}

/**
 * Wire the big pawn canvas: with the mouse over it, or it focused, WASD or the arrows walk it in place, the mouse aims
 * it (Q and E turn it from the keyboard), a click, Space or F fires, R reloads. Leaving hands it back to its idle.
 * pawn: the painter's {size, cy}; hint: the element that shows the rounds left; canHandle(): false while a promotion
 * or the class tree has the screen. Returns {hands, setPawn(draw, gunId)}: setPawn after each new selection.
 */
export function mountHands(pawnCanvas, {pawn, hint, canHandle}) {
  const sounds = handlingAudio();
  const hands = createHandling({emit: (type, data) => sounds.on(type, data), reduceMotion});
  let live = null,
    hovered = false,
    loop = 0,
    lastFrame = 0;
  const handsOn = () => canHandle() && !!live;
  const active = () => hovered || document.activeElement === pawnCanvas;
  function showAmmo() {
    const p = hands.profile;
    hint.textContent = hands.reloading ? 'Reloading…' : `${hands.mag} / ${p.mag}`;
  }
  function frame(now) {
    const dt = (now - lastFrame) / 1000;
    lastFrame = now;
    if (!handsOn()) {
      loop = 0;
      if (canHandle()) hold(pawnCanvas, false); // a promotion owns the canvas now: leave it alone
      return;
    }
    hands.step(dt);
    if (!hands.engaged && !hovered) {
      // nothing done for a moment and no mouse over it: back to its idle (keys still wake it while it has focus)
      loop = 0;
      hold(pawnCanvas, false);
      hint.textContent = '';
      return;
    }
    hold(pawnCanvas, true);
    live(pawnCanvas.getContext('2d'), now / 1000, hands.pose());
    showAmmo();
    loop = requestAnimationFrame(frame);
  }
  function wake() {
    if (loop || !handsOn()) return;
    lastFrame = performance.now();
    loop = requestAnimationFrame(frame);
  }
  function aimFrom(e) {
    // aim from the hands: the canvas is scaled by CSS, so map the pointer into canvas pixels first
    const r = pawnCanvas.getBoundingClientRect(),
      k = pawnCanvas.width / r.width;
    const u = pawn.size / 2.4;
    hands.aimAt((e.clientX - r.left) * k - pawnCanvas.width / 2, (e.clientY - r.top) * k - (pawn.cy + 0.42 * u));
  }
  pawnCanvas.addEventListener('pointerenter', e => {
    hovered = true;
    aimFrom(e);
    wake();
  });
  pawnCanvas.addEventListener('pointermove', e => {
    aimFrom(e);
    wake();
  });
  pawnCanvas.addEventListener('pointerleave', () => {
    hovered = false;
    hands.release();
  });
  pawnCanvas.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    pawnCanvas.setPointerCapture?.(e.pointerId);
    hands.trigger(true);
    wake();
  });
  for (const type of ['pointerup', 'pointercancel']) pawnCanvas.addEventListener(type, () => hands.trigger(false));
  pawnCanvas.addEventListener('focus', wake);
  pawnCanvas.addEventListener('blur', () => !hovered && hands.release());
  addEventListener('blur', () => hands.release());
  addEventListener('keydown', e => {
    if (!active() || !handsOn() || e.ctrlKey || e.metaKey || e.altKey) return;
    if (hands.key(e.code, true, {shift: e.shiftKey})) {
      e.preventDefault();
      wake();
    }
  });
  addEventListener('keyup', e => {
    if (hands.key(e.code, false, {shift: e.shiftKey}) && active()) e.preventDefault();
  });
  return {
    hands,
    setPawn(draw, gunId) {
      live = draw;
      hands.setGun(gunId);
    },
  };
}
