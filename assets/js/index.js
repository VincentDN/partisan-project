// PARP index browser logic: a keyboard- and click-driven menu in the shape of a 1990s phone.
// The menu items are real links (so it works without JS and for screen readers); this script adds
// selection state, number-key jumps, soft keys, the sound toggle and the About screen.
import {drawDithered} from './dither.js';
import {soundLayer} from '../../shared/sound-layer.js';
import {ITEMS} from './items.js';

const $ = s => document.querySelector(s);
const screen = $('.screen'),
  content = $('#content');
const sound = soundLayer();
let index = 0,
  mode = 'splash';

const clock = () => new Date().toLocaleTimeString('en-GB', {hour: '2-digit', minute: '2-digit'});
function chrome(titleLeft, titleRight) {
  return `<div class="status"><span class="bars" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span>PARP</span><span>${clock()}<span class="batt" aria-hidden="true"><b></b></span></span></div>
  <div class="title"><span>${titleLeft}</span><span>${titleRight || ''}</span></div>`;
}
const softkeys = (l, r) =>
  `<div class="softkeys"><button id="sk-l" data-key="select"${l ? '' : ' hidden'}>${l}</button><button id="sk-r" data-key="back"${r ? '' : ' hidden'}>${r}</button></div>`;

function soundLabel() {
  return `Sound: ${sound.prefs.on ? 'ON' : 'OFF'}`;
}

function renderSplash() {
  mode = 'splash';
  content.innerHTML =
    chrome('PARP', 'v' + window.PARP_VERSION) +
    `<div class="splash boot"><canvas id="dither" aria-label="Dithered concept art of two low-poly operators" role="img"></canvas><div class="cap"><h1>PARP</h1><p>PARTISAN PROJECT <span class="blink">· PRESS ANY KEY</span></p></div></div>` +
    softkeys('MENU', '');
  drawDithered($('#dither'), '../docs/moodboard/keyframe-2-firefight.jpg', {width: 200, contrast: 1.45, bias: -0.04}).catch(() => {});
}
function renderMenu() {
  mode = 'menu';
  const rows = ITEMS.map(
    (it, i) =>
      `<li><a href="${it.href || '#'}" ${it.href && /^https?:/.test(it.href) ? 'rel="noopener"' : ''} data-i="${i}" ${i === index ? 'aria-current="true"' : ''}><span class="n">${i + 1}</span><span class="ic" aria-hidden="true">${it.icon || ''}</span><span>${it.action === 'sound' ? soundLabel() : it.label}</span></a></li>`,
  ).join('');
  content.innerHTML =
    chrome('MAIN MENU', `${index + 1}/${ITEMS.length}`) +
    `<ul class="menu" id="menu" aria-label="PARP index">${rows}</ul><div class="help" id="help" aria-live="polite"></div>` +
    softkeys('SELECT', 'EXIT');
  for (const a of content.querySelectorAll('.menu a')) {
    a.addEventListener('click', e => {
      const i = +a.dataset.i;
      if (ITEMS[i].action) {
        e.preventDefault();
        index = i;
        activate();
      }
    });
    a.addEventListener('mouseenter', () => select(+a.dataset.i, false));
    a.addEventListener('focus', () => select(+a.dataset.i, false));
  }
  select(index, true);
}
function select(i, scroll = true) {
  index = (i + ITEMS.length) % ITEMS.length;
  for (const a of content.querySelectorAll('.menu a')) a.toggleAttribute('aria-current', +a.dataset.i === index);
  for (const a of content.querySelectorAll('.menu a')) if (+a.dataset.i !== index) a.removeAttribute('aria-current');
  const cur = content.querySelector(`.menu a[data-i="${index}"]`);
  cur.setAttribute('aria-current', 'true');
  $('#help').textContent = ITEMS[index].help;
  const t = content.querySelector('.title span:last-child');
  if (t) t.textContent = `${index + 1}/${ITEMS.length}`;
  if (scroll) cur.scrollIntoView({block: 'nearest'});
}
function renderAbout() {
  mode = 'about';
  content.innerHTML =
    chrome('ABOUT', '') +
    `<div class="about"><p><b>PARP</b> v${window.PARP_VERSION}<br>Partisan Project: an interactive game design document made of playable demos.</p>
  <p>Demos: Weapon Workbench, Operator Modder, Bench Lab, Asset Viewer.<br>Docs: Game Design Doc, Master Roadmap.</p>
  <p>Source: <a href="https://github.com/VincentDN/partisan-project" rel="noopener">github.com/VincentDN/partisan-project</a><br>By Atelier Vincent De Nil BV.</p>
  <p>Third-party credits and licences: <a href="../docs/game-design-master-doc.html#credits">design doc, credits</a>.</p></div>` +
    softkeys('', 'BACK');
}
function activate() {
  if (mode === 'splash') return renderMenu();
  if (mode === 'about') return renderMenu();
  const it = ITEMS[index];
  if (it.action === 'sound') {
    sound.prefs.on = !sound.prefs.on;
    sound.save();
    sound.changed();
    sound.prefs.on ? sound.start(0.4) : sound.stop();
    const label = content.querySelector(`.menu a[data-i="${index}"] span:last-child`);
    if (label) label.textContent = soundLabel();
    return;
  }
  if (it.action === 'about') return renderAbout();
  if (it.href) (/^https?:/.test(it.href) ? window.top : window).location.href = it.href; // outbound links leave the frame
}
function back() {
  if (mode === 'about') renderMenu();
  else if (mode === 'menu') renderSplash();
}

// Input: keyboard, soft keys, d-pad, number pad.
function press(k) {
  if (mode === 'splash') {
    renderMenu();
    return;
  }
  if (k === 'up') mode === 'menu' && select(index - 1);
  else if (k === 'down') mode === 'menu' && select(index + 1);
  else if (k === 'select') activate();
  else if (k === 'back') back();
  else if (/^[1-9]$/.test(k) && mode === 'menu' && ITEMS[+k - 1]) {
    select(+k - 1);
    activate();
  }
}
addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const map = {
    ArrowUp: 'up',
    ArrowDown: 'down',
    Enter: 'select',
    ArrowRight: 'select',
    Escape: 'back',
    Backspace: 'back',
    ArrowLeft: 'back',
  };
  const k = map[e.key] || (/^[1-9]$/.test(e.key) ? e.key : null);
  if (!k) {
    if (mode === 'splash') press('select');
    return;
  }
  if (e.key === 'Enter' && document.activeElement?.closest('.menu a') && mode === 'menu') return; // let the focused link navigate
  e.preventDefault();
  press(k);
});
// Soft keys are re-created with each screen, so listen once on the screen.
content.addEventListener('click', e => {
  const k = e.target.closest?.('[data-key]');
  if (k) press(k.dataset.key);
});
screen.addEventListener('click', e => {
  if (mode === 'splash') press('select');
});

// Music follows the shared preference (autoplay is blocked until a first gesture).
addEventListener(
  'pointerdown',
  () => {
    if (sound.prefs.on) sound.start(1.5);
  },
  {once: true, capture: true},
);
addEventListener(
  'keydown',
  () => {
    if (sound.prefs.on) sound.start(1.5);
  },
  {once: true, capture: true},
);

renderSplash();
if (location.hash === '#menu') renderMenu();
window.PARP_INDEX = {
  ready: true,
  get mode() {
    return mode;
  },
  get index() {
    return index;
  },
};
