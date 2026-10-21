// First-campaign island fly-in: readable story beats, paused simulation, skip/pause and reduced-motion presentation.
import {trapTab, rememberFocus} from '../shared/modal.js';
export const OPENING_LINES = [
  'YOU ARE THE RESISTANCE.',
  'FIVE YEARS AGO, THE INVADERS TOOK YOUR LAND',
  'YOU HAVE ONLY ONE OBJECTIVE',
  'DRIVE OUT THE INVADER\nAND FREE YANTIS!',
];
export const OPENING_DURATION = 22;
export function openingBeat(seconds) {
  if (seconds < 1.4) return -1;
  if (seconds < 5.8) return 0;
  if (seconds < 10.8) return 1;
  if (seconds < 14.5) return 2;
  if (seconds < 16.5) return -1; // Hold the island alone before the final call.
  return 3;
}
export function mountOpening({campaign, cam, party, save, reduceMotion, onFinish}) {
  if (!campaign || campaign.world.openingSeen !== false) return null;
  const restore = rememberFocus(() => document.querySelector('[data-speed="0"]'));
  const destination = {x: party.x, z: party.z, d: cam.d, yaw: cam.yaw};
  const dialog = document.createElement('dialog');
  dialog.className = 'campaign-opening';
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-label', 'The liberation of Yantis');
  dialog.innerHTML =
    '<div class="opening-shade" aria-hidden="true"></div><div class="opening-copy" role="status" aria-live="polite" aria-atomic="true"></div><div class="opening-controls"><button type="button" class="opening-pause" aria-pressed="false">Pause introduction</button><button type="button" class="opening-skip">Skip introduction</button></div>';
  const copy = dialog.querySelector('.opening-copy'),
    pause = dialog.querySelector('.opening-pause');
  let elapsed = 0,
    lastBeat = -2,
    paused = false,
    active = true;
  function pose(t) {
    const k = t * t * (3 - 2 * t);
    cam.tx = cam.x = destination.x * k;
    cam.tz = cam.z = -60 + (destination.z + 60) * k;
    cam.td = cam.d = 1100 + (destination.d - 1100) * k;
    cam.tyaw = cam.yaw = -0.55 + (destination.yaw + 0.55) * k;
  }
  function finish() {
    if (!active) return;
    active = false;
    pose(1);
    campaign.world.openingSeen = true;
    save(); // Normal campaign storage warning handles unavailable storage; the in-memory session can continue.
    dialog.close();
    dialog.remove();
    document.body.classList.remove('opening-active');
    restore();
    onFinish();
  }
  pause.onclick = () => {
    paused = !paused;
    pause.textContent = paused ? 'Resume introduction' : 'Pause introduction';
    pause.setAttribute('aria-pressed', String(paused));
    dialog.classList.toggle('opening-paused', paused);
  };
  dialog.querySelector('.opening-skip').onclick = finish;
  dialog.addEventListener('cancel', e => {
    e.preventDefault();
    finish();
  });
  dialog.addEventListener('keydown', e => e.stopPropagation());
  document.body.classList.add('opening-active');
  document.body.append(dialog);
  dialog.showModal();
  trapTab();
  dialog.querySelector('.opening-skip').focus();
  if (reduceMotion) {
    pose(1);
    copy.textContent = OPENING_LINES.join('\n\n');
    copy.classList.add('opening-static');
  } else pose(0);
  return {
    get elapsed() {
      return elapsed;
    },
    get active() {
      return active;
    },
    update(dt) {
      if (!active || paused) return;
      elapsed += dt;
      if (!reduceMotion) {
        pose(Math.min(1, elapsed / OPENING_DURATION));
        const beat = openingBeat(elapsed);
        if (beat !== lastBeat) {
          lastBeat = beat;
          copy.textContent = OPENING_LINES[beat] || '';
          copy.classList.remove('opening-reveal');
          void copy.offsetWidth;
          if (beat >= 0) copy.classList.add('opening-reveal');
        }
      }
      if (elapsed >= (reduceMotion ? 12 : OPENING_DURATION)) finish();
    },
  };
}
