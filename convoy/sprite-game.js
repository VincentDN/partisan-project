// Partisan Tactical in the 2.5-D sprite style (graphics roadmap test): the same simulation, input and rules as the 3-D
// page (convoy/game.js), drawn by convoy/sprite-render.js with the RimWorld-style placeholder art.
import '../shared/frame.js';
import {mountTopBar} from '../shared/topbar.js';
import {Sim} from './sim.js';
import {WEAPONS} from './weapons.js';
import {LEVELS, MISSIONS, DEFAULT_LEVEL} from './levels/index.js';
import {createSquadPicker} from './squad-picker.js';
import {createSpriteRenderer} from './sprite-render.js';

mountTopBar({title: 'Partisan Tactical (2.5-D test)', scene: 'viewer'});
const $ = s => document.querySelector(s);
const stageEl = $('#stage'),
  view = $('#view');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const params = new URLSearchParams(location.search);
let levelId = LEVELS[params.get('mission')] ? params.get('mission') : DEFAULT_LEVEL;

$('#status').textContent = 'Loading the sprites…';
const R = await createSpriteRenderer(view);
$('#status').hidden = true;

let sim,
  started = false,
  paused = false,
  selected = [];
function newGame() {
  const awareness = Number($('#aware').value) / 100;
  sim = new Sim({level: LEVELS[levelId], seed: Number(params.get('seed')) || Math.floor(Math.random() * 1e6), awareness});
  R.snap(sim);
  started = false;
  selected = [];
  setPaused(false);
  clearInput();
  commsSeen = -1;
  $('#comms').replaceChildren();
  picker.sync();
  $('#card-title').textContent = sim.level.title;
  $('#card-text').textContent = sim.level.brief;
  $('#start').textContent = 'Start';
  renderMissions();
  $('#card').hidden = false;
  $('#to-3d').href = `./?mission=${levelId}`;
}
function renderMissions() {
  $('#missions').replaceChildren(
    ...MISSIONS.map((m, i) => {
      const b = document.createElement('button');
      b.textContent = `${i + 1}. ${m.title}`;
      b.setAttribute('aria-pressed', String(m.id === levelId));
      b.onclick = () => {
        levelId = m.id;
        const url = new URL(location.href);
        url.searchParams.set('mission', m.id);
        history.replaceState(null, '', url);
        newGame();
      };
      return b;
    }),
  );
}
function start() {
  started = true;
  $('#card').hidden = true;
  stageEl.focus();
}

// ---------- input (same keys as the 3-D page) ----------
const keys = new Set();
let fire = false,
  reload = false,
  wantWeapon = null,
  pointer = null; // CSS pixels on the canvas
const aimPoint = () => (pointer ? R.toWorld(pointer.x, pointer.y) : null);
addEventListener('keydown', e => {
  if (picker.key(e)) return;
  if (e.key.toLowerCase() === 'q' && started && !sim.outcome) {
    e.preventDefault();
    if (!e.repeat) picker.open();
    return;
  }
  if (e.target.closest?.('aside, nav')) return;
  const k = e.key.toLowerCase();
  if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift', ' ', 'e'].includes(k)) e.preventDefault();
  keys.add(k);
  if (k === 'r') reload = true;
  if (['1', '2', '3'].includes(k)) wantWeapon = sim.player.weapons[Number(k) - 1];
  if (k === '+' || k === '=') zoom(1.15);
  if (k === '-') zoom(1 / 1.15);
  if (k === 'enter') started && !sim.outcome ? null : sim.outcome ? newGame() : start();
  if (!started || sim.outcome) return;
  if (k === ' ') setPaused(!paused);
  if (k === 'tab') {
    e.preventDefault();
    const ids = teammates().map(u => u.id);
    const steps = [[], ...ids.map(id => [id]), ids];
    const at = steps.findIndex(s => s.length === selected.length && s.every(id => selected.includes(id)));
    selected = steps[(at + 1) % steps.length];
  }
  const point = aimPoint();
  if (selected.length && point) {
    if (k === 'f') sim.order(selected, {type: 'follow'});
    if (k === 'h') sim.order(selected, {type: 'hold'});
    if (k === 'g') sim.order(selected, {type: 'move', x: point.x, z: point.z});
    if (k === 't') {
      const t = enemyNear(point);
      if (t) sim.order(selected, {type: 'attack', target: t.id});
    }
    if (k === 'c') {
      const team = sim.units.filter(u => selected.includes(u.id));
      const cx = team.reduce((s, u) => s + u.x, 0) / team.length,
        cz = team.reduce((s, u) => s + u.z, 0) / team.length;
      sim.order(selected, {type: 'cover', angle: Math.atan2(point.z - cz, point.x - cx)});
    }
  }
});
addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
addEventListener('blur', () => clearInput());
addEventListener('visibilitychange', () => clearInput());
const teammates = () => sim.units.filter(u => u.side === 'partisan' && u !== sim.player && u.alive);
const enemyNear = p =>
  sim.units
    .filter(u => u.side === 'army' && u.alive && !u.escaped && u.state !== 'mounted' && Math.hypot(u.x - p.x, u.z - p.z) < 2.5)
    .sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];
view.addEventListener('pointermove', e => {
  const r = view.getBoundingClientRect();
  pointer = {x: e.clientX - r.left, y: e.clientY - r.top};
});
view.addEventListener('pointerdown', e => {
  if (e.button === 0 && started && !sim.control.pending) fire = true;
});
addEventListener('pointerup', () => (fire = false));
view.addEventListener('contextmenu', e => {
  e.preventDefault();
  const point = started && !sim.outcome && !sim.control.pending && selected.length ? aimPoint() : null;
  if (!point) return;
  const t = enemyNear(point);
  sim.order(selected, t ? {type: 'attack', target: t.id} : {type: 'move', x: point.x, z: point.z});
});
function zoom(f) {
  R.camera.zoom = Math.max(0.5, Math.min(2.5, R.camera.zoom * f));
}
view.addEventListener(
  'wheel',
  e => {
    e.preventDefault();
    zoom(e.deltaY < 0 ? 1.1 : 1 / 1.1);
  },
  {passive: false},
);
function clearInput() {
  keys.clear();
  fire = false;
  reload = false;
  wantWeapon = null;
}
function setPaused(on) {
  paused = on;
  $('#paused').hidden = !on;
}
function input() {
  if (sim.control.pending) return {};
  const has = k => keys.has(k);
  const mx = (has('d') || has('arrowright') ? 1 : 0) - (has('a') || has('arrowleft') ? 1 : 0);
  const mz = (has('s') || has('arrowdown') ? 1 : 0) - (has('w') || has('arrowup') ? 1 : 0);
  const aim = aimPoint();
  const i = {mx, mz, sneak: has('shift'), fire, reload, interact: has('e'), weapon: wantWeapon, ...(aim ? {ax: aim.x, az: aim.z} : {})};
  reload = false;
  wantWeapon = null;
  return i;
}

// ---------- panel ----------
$('#start').onclick = () => (sim.outcome ? newGame() : start());
$('#restart').onclick = () => newGame();
$('#switch-rebel').onclick = () => picker.open();
$('#aware').oninput = e => ($('#aware-out').textContent = `${e.target.value}%`);
let commsSeen = -1;
function updatePanel() {
  for (const c of sim.callouts.filter(c => c.t > commsSeen)) {
    const li = document.createElement('li');
    li.className = c.side;
    li.innerHTML = '<b></b> ';
    li.querySelector('b').textContent = c.name + ':';
    li.append(c.text);
    $('#comms').prepend(li);
    while ($('#comms').children.length > 14) $('#comms').lastChild.remove();
  }
  commsSeen = sim.callouts.at(-1)?.t ?? commsSeen;
  const p = sim.player;
  $('#switch-rebel').disabled = !started || !!sim.outcome || !!sim.control.pending || sim.time < sim.control.readyAt || !teammates().length;
  const status = sim.outcome ? (sim.outcome === 'won' ? 'Mission accomplished' : 'Mission failed') : !sim.alarm ? 'Quiet' : 'Contact';
  const mark = {active: '○', locked: '·', done: '✓', failed: '✗'};
  const objectives = sim.objectives
    .filter(o => o.state !== 'locked')
    .map(o => {
      const left =
        o.type === 'hold' && o.state === 'active'
          ? Math.max(0, Math.ceil(o.seconds - (sim.time - (o.from === 'alarm' ? sim.alarmAt : 0))))
          : null;
      return `<span class="obj ${o.state}">${mark[o.state]} ${o.label}${left !== null ? ` · ${left} s` : ''}${o.optional ? ' <i>(optional)</i>' : ''}</span>`;
    })
    .join('<br>');
  const next = sim.waves.find(w => !w.spawned);
  const waveLine = sim.waves.length
    ? next
      ? `<br><i>Wave ${sim.waves.indexOf(next) + 1} of ${sim.waves.length} in ${Math.max(0, Math.ceil(next.at - sim.time))} s</i>`
      : '<br><i>Final wave is here</i>'
    : '';
  const squad = sim.units
    .filter(u => u.side === 'partisan')
    .map(
      u =>
        `${selected.includes(u.id) ? '<b>▸ ' : ''}${u.name} (${Math.max(0, Math.ceil(u.hp))} HP): ${!u.alive ? 'down' : u === p ? 'YOU' : u.order?.type || 'holding'}${selected.includes(u.id) ? '</b>' : ''}`,
    )
    .join('<br>');
  const weapons = p.weapons
    .map((w, i) => {
      const W = WEAPONS[w],
        ammo = p.reload > 0 && p.reloading === w ? 'reloading' : `${p.mags[w]}${p.reserve[w] === Infinity ? '' : ` +${p.reserve[w]}`}`;
      return `${w === p.weapon ? '▸ ' : ''}${i + 1} ${W.label} ${ammo}`;
    })
    .join('<br>');
  const s = sim.stats();
  $('#hud').innerHTML =
    `<b>${status}</b><br>${objectives}${waveLine}<br>Health ${Math.max(0, Math.ceil(p.hp))}<br>${squad}<br>${weapons}<br>` +
    `Army: ${s.armyAlive} up · ${s.armyDown} down · ${s.escaped} fled · ${s.vehiclesDestroyed} vehicles burning`;
}
function showDebrief(d) {
  $('#card-title').textContent = `${sim.level.title}: ${d.outcome === 'won' ? 'accomplished' : 'failed'}`;
  const text = $('#card-text');
  text.textContent = `${Math.floor(d.time / 60)}:${String(Math.floor(d.time % 60)).padStart(2, '0')} · ${d.armyDown} soldiers down, ${d.escaped} fled, ${d.vehiclesDestroyed} vehicles destroyed. ${d.byPartisan.map(u => `${u.name}: ${u.state}, ${u.kills} down`).join(' · ')}`;
  $('#start').textContent = 'Play again';
}

const picker = createSquadPicker({
  root: $('#squad-picker'),
  getSim: () => sim,
  project: (x, y, z) => R.project(x, y, z),
  reducedMotion: reduceMotion,
  onOpen: open => {
    clearInput();
    if (open) selected = [];
    else stageEl.focus({preventScroll: true});
  },
  onChange: () => {
    clearInput();
    selected = [];
  },
});

// ---------- loop ----------
const resize = () => R.resize();
new ResizeObserver(resize).observe(view);
resize();
let acc = 0,
  last = performance.now(),
  panelAt = 0;
const STEP = 1 / 60;
function frame() {
  const now = performance.now();
  const elapsed = Math.min((now - last) / 1000, 0.25);
  last = now;
  if (started && !document.hidden) picker.update(elapsed);
  acc = Math.min(acc + elapsed * picker.scale, 0.25);
  if (started && !paused && !document.hidden)
    while (acc >= STEP) {
      sim.step(STEP, input());
      acc -= STEP;
    }
  else acc = 0;
  if (sim.outcome && $('#card').hidden) {
    showDebrief(sim.debrief());
    $('#card').hidden = false;
  }
  R.draw(sim, {aim: started ? aimPoint() : null, selected});
  if (now - panelAt > 120) {
    panelAt = now;
    updatePanel();
  }
  picker.sync();
  requestAnimationFrame(frame);
}
newGame();
requestAnimationFrame(frame);
// Test hook: lets browser tests drive the game.
window.PARP_SPRITES = {
  get sim() {
    return sim;
  },
  renderer: R,
  start,
  newGame,
  ready: true,
};
