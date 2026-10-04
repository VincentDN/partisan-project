// Partisan Project index browser logic: a keyboard- and click-driven menu in the shape of a 1990s phone.
// The menu items are real links (so it works without JS and for screen readers); this script adds
// selection state, number-key jumps, soft keys, the sound toggle and the About screen.
// The first tap (or Enter, or a number key) on a demo folds open its explainer: a short dithered loop of the demo and
// its sounds down a phone line (previews.js), and a big LAUNCH button. Tapping anything else folds it shut again
// (Enter, the soft key or the same number key also launch). The Dev tools folder is locked until tapped seven times
// (remembered in this browser); then a tap folds its tools open or shut.
import {soundLayer} from '../../shared/sound-layer.js';
import {ITEMS, DEV_TAPS} from './items.js';
import * as ui from '../../shared/ui-sounds.js';
import {sceneFor, startPreview} from './previews.js';

const $ = s => document.querySelector(s);
const content = $('#content');
const sound = soundLayer();
let index = 0,
  mode = 'menu',
  open = -1, // the item whose explainer is folded open
  stopPreview = null;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const DEV_KEY = 'parp-devtools';
const store = {
  get: () => {
    try {
      return localStorage.getItem(DEV_KEY) === 'unlocked';
    } catch {
      return false;
    }
  },
  set: () => {
    try {
      localStorage.setItem(DEV_KEY, 'unlocked');
    } catch {
      /* private mode: unlocked for this visit */
    }
  },
};
let devUnlocked = store.get(),
  devOpen = false,
  devTaps = 0;
/** The rows on screen: the items, with the folder's tools under it while it is unlocked and open. */
let ROWS = [];
function rowsFor() {
  return ITEMS.flatMap(it => (it.folder && devUnlocked && devOpen ? [it, ...it.children.map(c => ({...c, child: true}))] : [it]));
}
// No countdown on screen: each tap pings a whole tone higher (shared/ui-sounds.js climb), as on vincentdenil.com.
const folderLabel = it => (devUnlocked ? `${it.label} ${devOpen ? '▾' : '▸'}` : `${it.label} - tap to unlock`);

const clock = () => new Date().toLocaleTimeString('en-GB', {hour: '2-digit', minute: '2-digit'});
function chrome(titleLeft, titleRight) {
  return `<div class="status"><span class="bars" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span>Partisan Project</span><span>${clock()}<span class="batt" aria-hidden="true"><b></b></span></span></div>
  <div class="title"><span>${titleLeft}</span><span>${titleRight || ''}</span></div>`;
}
const softkeys = (l, r) =>
  `<div class="softkeys"><button id="sk-l" data-key="select"${l ? '' : ' hidden'}>${l}</button><button id="sk-r" data-key="back"${r ? '' : ' hidden'}>${r}</button></div>`;

function soundLabel() {
  return `Sound: ${sound.prefs.on ? 'ON' : 'OFF'}`;
}

function renderMenu() {
  mode = 'menu';
  ROWS = rowsFor();
  const rows = ROWS.map((it, i) => {
    const link = !!it.href,
      label = it.action === 'sound' ? soundLabel() : it.folder ? folderLabel(it) : it.label;
    const attrs = [
      `href="${it.href || '#'}"`,
      it.href && /^https?:/.test(it.href) ? 'rel="noopener"' : '',
      `data-i="${i}"`,
      i === index ? 'aria-current="true"' : '',
      link ? `aria-expanded="false" aria-controls="fold-${i}"` : '',
      it.folder && devUnlocked ? `aria-expanded="${devOpen}"` : '',
      it.folder ? 'class="folder"' : it.child ? 'class="child"' : '',
    ].filter(Boolean);
    return `<li><a ${attrs.join(' ')}><span class="n">${i + 1}</span><span class="ic" aria-hidden="true">${it.icon || ''}</span><span>${label}</span></a>${link ? `<div class="fold" id="fold-${i}" data-i="${i}" hidden></div>` : ''}</li>`;
  }).join('');
  content.innerHTML =
    chrome('MAIN MENU', `${index + 1}/${ROWS.length}`) +
    `<ul class="menu" id="menu" aria-label="Partisan Project index">${rows}</ul><div class="help" id="help" aria-live="polite"></div>` +
    softkeys('SELECT', 'EXIT');
  for (const a of content.querySelectorAll('.menu a')) {
    a.addEventListener('click', e => {
      e.preventDefault(); // links open from the LAUNCH button
      const i = +a.dataset.i;
      if (open === i) return closeFold(); // tapping the open item again folds it down
      index = i;
      select(i, false);
      activate();
    });
    a.addEventListener('mouseenter', () => select(+a.dataset.i, false));
    a.addEventListener('focus', () => select(+a.dataset.i, false));
  }
  open = -1;
  select(Math.min(index, ROWS.length - 1), true);
}
/** The Dev tools folder: count taps until it unlocks, then fold its tools open or shut. */
function folder() {
  if (!devUnlocked) {
    devTaps++;
    if (devTaps < DEV_TAPS) {
      ui.climb(devTaps);
      const row = content.querySelector(`.menu a[data-i="${index}"]`);
      row?.classList.remove('nudge');
      void row?.offsetWidth; // restart the nudge
      row?.classList.add('nudge');
      return;
    }
    devUnlocked = true;
    store.set();
    ui.unlock();
  } else ui.select();
  devOpen = !devOpen;
  renderMenu();
  if (devOpen) content.querySelector(`.menu a[data-i="${index + ROWS[index].children.length}"]`)?.scrollIntoView({block: 'nearest'});
}
/** Fold open item i's explainer (closing any other): the dithered preview, what the demo is, how to open it. */
function fold(i) {
  closeFold(false);
  const it = ROWS[i],
    a = content.querySelector(`.menu a[data-i="${i}"]`),
    box = content.querySelector(`#fold-${i}`);
  if (!box) return;
  open = i;
  ui.select();
  box.innerHTML = `<canvas aria-hidden="true"></canvas><p>${it.help}</p><button type="button" class="launch">${/^https?:/.test(it.href) || it.href.includes('docs/') ? '▶ OPEN' : '▶ LAUNCH DEMO'}</button>`;
  box.hidden = false;
  a.setAttribute('aria-expanded', 'true');
  // the big button launches; a tap anywhere else in the explainer folds it shut
  box.addEventListener('click', e => {
    e.stopPropagation();
    if (e.target.closest('.launch')) launch(i);
    else closeFold();
  });
  stopPreview = startPreview(box.querySelector('canvas'), sceneFor(it), {withSound: sound.prefs.on, reduceMotion});
  requestAnimationFrame(() => box.classList.add('open'));
  setSoftkey('LAUNCH');
  $('#help').hidden = true; // the explainer carries the same text
  box.scrollIntoView({block: 'nearest'});
}
function closeFold(sound = true) {
  if (open < 0) return;
  stopPreview?.();
  stopPreview = null;
  const box = content.querySelector(`#fold-${open}`),
    a = content.querySelector(`.menu a[data-i="${open}"]`);
  if (box) {
    box.classList.remove('open');
    box.hidden = true;
    box.replaceChildren();
  }
  a?.setAttribute('aria-expanded', 'false');
  open = -1;
  setSoftkey('SELECT');
  const help = $('#help');
  if (help) help.hidden = false;
  if (sound) ui.back();
}
function setSoftkey(label) {
  const l = content.querySelector('#sk-l');
  if (l) l.textContent = label;
}
function select(i, scroll = true) {
  const before = index;
  index = (i + ROWS.length) % ROWS.length;
  if (mode === 'menu' && index !== before) {
    ui.tap();
    if (open >= 0 && open !== index) closeFold(false);
  }
  for (const a of content.querySelectorAll('.menu a')) a.toggleAttribute('aria-current', +a.dataset.i === index);
  for (const a of content.querySelectorAll('.menu a')) if (+a.dataset.i !== index) a.removeAttribute('aria-current');
  const cur = content.querySelector(`.menu a[data-i="${index}"]`);
  cur.setAttribute('aria-current', 'true');
  $('#help').textContent = ROWS[index].folder && devUnlocked ? 'Tools and documents for building the game.' : ROWS[index].help;
  const t = content.querySelector('.title span:last-child');
  if (t) t.textContent = `${index + 1}/${ROWS.length}`;
  if (scroll) cur.scrollIntoView({block: 'nearest'});
}
function renderAbout() {
  mode = 'about';
  content.innerHTML =
    chrome('ABOUT', '') +
    `<div class="about"><p><b>Partisan Project</b> v${window.PARP_VERSION}<br>Partisan Project: an interactive game design document made of playable demos.</p>
  <p>Demos: Weapon Workbench, Operator Modder, Advanced animations, Asset Viewer.<br>Docs: Game Design Doc, Master Roadmap.</p>
  <p>Source: <a href="https://github.com/VincentDN/partisan-project" rel="noopener">github.com/VincentDN/partisan-project</a><br>By Atelier Vincent De Nil BV.</p>
  <p>Credits and licences: see the documentation in the <a href="https://github.com/VincentDN/partisan-project">GitHub repository</a>, or contact <a href="mailto:vincent@kaisercatcinema.com">vincent@kaisercatcinema.com</a>.</p></div>` +
    softkeys('', 'BACK');
}
/** Open row i's demo or document. */
function launch(i) {
  const it = ROWS[i];
  ui.select();
  closeFold(false);
  if (it.href) (/^https?:/.test(it.href) ? window.top : window).location.href = it.href; // outbound links leave the frame
}
function activate() {
  if (mode === 'about') {
    ui.select();
    return renderMenu();
  }
  const it = ROWS[index];
  if (it.folder) return folder();
  if (it.href) return open === index ? launch(index) : fold(index); // the first select folds open the explainer
  ui.select();
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
}
function back() {
  if (open >= 0) return closeFold();
  if (mode === 'about') {
    ui.back();
    renderMenu();
  } else ui.deny(); // already at the top: nothing to go back to
}

// Input: keyboard, soft keys, d-pad, number pad.
function press(k) {
  if (k === 'up') mode === 'menu' && select(index - 1);
  else if (k === 'down') mode === 'menu' && select(index + 1);
  else if (k === 'select') activate();
  else if (k === 'back') back();
  else if (/^[1-9]$/.test(k) && mode === 'menu' && ROWS[+k - 1]) {
    select(+k - 1);
    activate(); // a number folds its explainer open; the same number again launches
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
  if (!k) return;
  if (e.key === 'Enter' && document.activeElement?.closest('.menu a') && mode === 'menu') {
    // Enter on a focused link: the same two steps as a tap (explainer first, then the demo)
    e.preventDefault();
    const i = +document.activeElement.closest('.menu a').dataset.i;
    if (i !== index) select(i, false);
    return activate();
  }
  e.preventDefault();
  press(k);
});
// Soft keys are re-created with each screen, so listen once on the screen.
content.addEventListener('click', e => {
  const k = e.target.closest?.('[data-key]');
  if (k) return press(k.dataset.key);
  // a tap anywhere off the menu items folds an open explainer shut
  if (open >= 0 && !e.target.closest?.('.menu a')) closeFold();
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

renderMenu();
window.PARP_INDEX = {
  ready: true,
  get mode() {
    return mode;
  },
  get index() {
    return index;
  },
  get open() {
    return open;
  },
  get rows() {
    return ROWS.map(r => r.label);
  },
  get devUnlocked() {
    return devUnlocked;
  },
};
