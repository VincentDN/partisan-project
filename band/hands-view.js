// The Rebel Band's big character under the player's hands: drawing the handled pose (paintHandled) and wiring the
// mouse and keyboard to the controller (band/handling.js) and its sounds (band/handling-audio.js).
import {createHandling, REST_ANGLE} from './handling.js';
import {handlingAudio} from './handling-audio.js';
import {hold} from './fx.js';

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * The pawn under the player's hands (band/handling.js pose). It always faces the viewer; only the weapon turns. At rest
 * the weapon sits exactly where the idle draws it (across the body, muzzle up); aimed, it swings round the hands as the
 * shooter holds a rifle, flipped when it points left so it is never upside down. The pawn bobs with each stride, kicks
 * when it fires with a flash at the muzzle, and lowers and tilts the gun to reload.
 */
export function paintHandled(g, p, gun, {size, cx, cy, pose}) {
  const u = size / 2.4, // pixels per metre: the shooter draws a pawn 2.4 m across
    bob = pose.bob * 0.06 * u,
    recoil = pose.kick * 0.05 * u,
    k = pose.rest,
    mix = (x, y) => x + (y - x) * k;
  g.save();
  g.translate(cx, cy - bob + recoil * 0.3);
  g.drawImage(p.south, -size / 2, -size / 2, size, size);
  g.restore();
  if (!gun) return;
  const a = pose.aim,
    ca = Math.cos(a),
    sa = Math.sin(a);
  // aimed: held at the hands, pushed out along the barrel; resting: the idle's place and angle (band.js paint)
  const len = mix(gun.length * 1.4 * u, size * 0.62 * Math.min(1.2, gun.length)),
    gh = (len * gun.img.height) / gun.img.width,
    off = len * 0.28 * (1 - pose.dip * 0.35) * (1 - k) - recoil * 2,
    hx = mix(cx, cx + size * 0.02),
    hy = mix(cy + 0.42 * u, cy + size * 0.1),
    gx = hx + Math.cos(a) * off - ca * recoil * (1 - k),
    gy = hy + Math.sin(a) * off - sa * recoil * (1 - k) - bob + pose.dip * 0.1 * u;
  const base = a + Math.atan2(Math.sin(REST_ANGLE - a), Math.cos(REST_ANGLE - a)) * k,
    left = Math.cos(base) < 0;
  // the reload tilts the muzzle toward the ground on whichever side the gun points; a shot kicks it up
  const rot = base + (left ? -1 : 1) * (pose.dip * 0.75 - pose.kick * 0.12);
  g.save();
  g.translate(gx, gy);
  g.rotate(rot);
  if (left) g.scale(1, -1);
  g.drawImage(gun.img, -len / 2, -gh / 2, len, gh);
  g.restore();
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
 * its weapon, a click, Space or F fires, R reloads. Leaving eases the weapon back to rest, then hands it to its idle.
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
      // nothing going on, the weapon back at rest and no mouse over it: back to its idle (keys still wake it)
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
