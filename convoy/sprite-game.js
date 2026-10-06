// Partisan Tactical: the top-down shooter, drawn in the 2.5-D RimWorld style by convoy/sprite-render.js (the old 3-D
// view is archived in docs/archive/convoy-3d/). The squad's classes come from the Rebel Band tree (band/troops.js): they
// set each rebel's weapons, passives and abilities (Z X V), and the rebels level up between missions
// (convoy/progression.js). Switching rebel (Q) slows time and dithers the world; difficulty is a select in the panel.
import '../shared/frame.js';
import {mountTopBar} from '../shared/topbar.js';
import {Sim} from './sim.js';
import {WEAPONS} from './weapons.js';
import {activesFor, useAbility, cooldownLeft} from './abilities.js';
import {DIFFICULTY, DEFAULT_DIFFICULTY} from './difficulty.js';
import {SQUAD_KEY, loadSquad, newSquad, missionXp, award} from './progression.js';
import {openCampaign, describe} from './campaign-mode.js';
import {rollLoot, bank} from './loot.js';
import {createCamp, el} from './camp.js';
import {LEVELS, MISSIONS, DEFAULT_LEVEL} from './levels/index.js';
import {vary, TIMES, WEATHERS} from './levels/variants.js';
import {createSquadPicker} from './squad-picker.js';
import {createSoundscape} from './soundscape.js';
import {createSpriteRenderer} from './sprite-render.js';
import {createFieldSearch} from './field-search.js';
import {createCatalogue} from '../shared/inventory/catalogue.js';
import {COSMETICS, buildPawn, lookFor, saveLook, resetLook, savedLook} from './sprite-art.js';

mountTopBar({title: 'Partisan Tactical', scene: 'viewer'});
const $ = s => document.querySelector(s);
const stageEl = $('#stage'),
  view = $('#view');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const params = new URLSearchParams(location.search);
let levelId = LEVELS[params.get('mission')] ? params.get('mission') : DEFAULT_LEVEL;
// In a campaign (?campaign&encounter) the map's deployment sets the level, the seed and the squad (convoy/campaign-mode.js).
const cm = openCampaign(
  params,
  (() => {
    try {
      return localStorage;
    } catch {
      return null;
    }
  })(),
);
if (cm?.action === 'play' && LEVELS[cm.deployment.level]) levelId = cm.deployment.level;

$('#status').textContent = 'Loading the sprites…';
const R = await createSpriteRenderer(view);
$('#status').hidden = true;

// The squad (classes and experience) and the difficulty are kept in this browser.
const store = {
  get: k => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* private mode: the squad lives for this visit */
    }
  },
};
const DIFF_KEY = 'parp-difficulty';
let squad = loadSquad(store.get(SQUAD_KEY)),
  diffId = DIFFICULTY[store.get(DIFF_KEY)] ? store.get(DIFF_KEY) : DEFAULT_DIFFICULTY;
const saveSquad = () => store.set(SQUAD_KEY, JSON.stringify(squad));

let sim,
  started = false,
  paused = false,
  selected = [];
function newGame() {
  const awareness = Number($('#aware').value) / 100;
  const seed = cm?.action === 'play' ? cm.deployment.seed : Number(params.get('seed')) || Math.floor(Math.random() * 1e6);
  sim = new Sim({
    level: vary(LEVELS[levelId], conditions()),
    seed,
    awareness,
    squad: cm ? {...squad.classes, ...cm.classes()} : squad.classes,
    difficulty: diffId,
  });
  search?.attach(sim, {seed});
  awarded = false;
  lastLoot = lastEarned = null;
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
  $('#start').textContent = 'Start mission';
  renderMissions();
  $('#card').hidden = false;
  renderLook();
  renderSquad();
  renderCamp();
  if (cm) campaignCard();
}
/** In a campaign: no mission select or restart; a mission that cannot be played says why and leads back to the map. */
function campaignCard() {
  $('#restart').hidden = true;
  if (cm.action === 'play') {
    $('#start').textContent = 'Start mission';
    return;
  }
  $('#card-title').textContent = cm.action === 'none' ? 'No mission here' : sim.level.title;
  $('#card-text').textContent =
    cm.action === 'none' ? 'This mission has been fought already, or the link is out of date.' : describe(cm.result);
  $('#start').textContent = 'Return to the map';
}
/**
 * The conditions this fight is in (convoy/levels/variants.js): a campaign deployment brings its own (time, weather,
 * the ground where it was met, the enemy's strength); in practice they come from the pickers (or ?time=&weather=).
 */
function conditions() {
  if (cm?.action === 'play') return {...cm.deployment.variant, seed: cm.deployment.seed};
  const time = TIMES.includes(params.get('time')) ? params.get('time') : null,
    weather = WEATHERS.includes(params.get('weather')) ? params.get('weather') : 'clear';
  return {time, weather};
}
function renderMissions() {
  if (cm) {
    $('#missions').hidden = true;
    return;
  }
  $('#missions').replaceChildren(
    ...MISSIONS.map((m, i) => {
      const b = document.createElement('button');
      const r = squad.record[m.id] || {played: 0, won: 0};
      b.textContent = `${i + 1}. ${m.title}${r.won ? ' ✓' : ''}`;
      b.title = `Played ${r.played}, won ${r.won}`;
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
    conditionPicker('time', ['', ...TIMES], v => (v ? v[0].toUpperCase() + v.slice(1) : 'Level default')),
    conditionPicker('weather', WEATHERS, v => v[0].toUpperCase() + v.slice(1)),
  );
}
/** A practice picker for one condition: it writes the address and sets the mission up again. */
function conditionPicker(key, values, label) {
  const sel = document.createElement('select');
  sel.id = 'cond-' + key;
  sel.setAttribute('aria-label', key === 'time' ? 'Time of day' : 'Weather');
  for (const v of values) sel.append(new Option(label(v), v));
  sel.value = params.get(key) || values[0];
  sel.onchange = () => {
    if (sel.value) params.set(key, sel.value);
    else params.delete(key);
    const url = new URL(location.href);
    url.search = params.toString();
    history.replaceState(null, '', url);
    newGame();
  };
  return sel;
}
// Sound: opened by the first key or click (browsers keep audio shut until then); M or the button mutes it.
const sound = createSoundscape();
const soundButton = () => {
  const b = $('#sound');
  if (!b) return;
  b.textContent = sound.on ? 'Sound on (M)' : 'Sound off (M)';
  b.setAttribute('aria-pressed', String(sound.on));
};
addEventListener('pointerdown', () => sound.unlock(), {capture: true});
addEventListener(
  'keydown',
  e => {
    sound.unlock();
    if (e.key.toLowerCase() === 'm' && !e.repeat && !e.target.closest?.('input, textarea')) {
      sound.setOn(!sound.on);
      soundButton();
    }
  },
  {capture: true},
);
$('#sound')?.addEventListener('click', () => {
  sound.setOn(!sound.on);
  soundButton();
});
soundButton();

function start() {
  started = true;
  $('#card').hidden = true;
  stageEl.focus();
}

// ---------- input (same keys as the 3-D page) ----------
const keys = new Set();
let fire = false,
  grenade = false,
  reload = false,
  wantWeapon = null,
  pointer = null; // CSS pixels on the canvas
const aimPoint = () => (pointer ? R.toWorld(pointer.x, pointer.y) : null);
addEventListener('keydown', e => {
  if (search?.key(e)) return;
  if (picker.key(e)) return;
  if (e.key.toLowerCase() === 'q' && started && !sim.outcome) {
    e.preventDefault();
    if (!e.repeat) picker.open();
    return;
  }
  if (e.target.closest?.('aside, nav')) return;
  const k = e.key.toLowerCase();
  if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift', 'control', ' ', 'e', 'g'].includes(k))
    e.preventDefault();
  if (k === 'g' && !e.repeat) grenade = true; // throw a hand grenade at the cursor
  keys.add(k);
  if (k === 'r') reload = true;
  const slot = ABILITY_KEYS.indexOf(k);
  if (slot >= 0 && started && !sim.outcome && !paused && !sim.control.pending && !e.repeat) ability(slot);
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

// ---------- abilities: Z X V use the active rebel's class abilities at the cursor ----------
const ABILITY_KEYS = ['z', 'x', 'v'];
function ability(slot) {
  const a = activesFor(sim.player.cls)[slot];
  if (!a?.run) return false;
  return useAbility(sim, sim.player, a.name, aimPoint());
}
function abilityBar() {
  const p = sim.player;
  if (!p.cls || !p.alive) return null;
  return activesFor(p.cls).map((a, i) => {
    const left = cooldownLeft(sim, p, a.name);
    return {key: ABILITY_KEYS[i], name: a.name, left, cd: a.cd * (p.mods?.cooldown ?? 1), ready: left <= 0, usable: !!a.run};
  });
}
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
// Right mouse held: aim down the sights (a subtle zoom and a longer lean); a right click still gives squad orders.
let aimZoom = false;
view.addEventListener('pointerdown', e => {
  if (e.button === 0 && started && !sim.control.pending) fire = true;
  if (e.button === 2) aimZoom = true;
});
addEventListener('pointerup', e => {
  if (e.button === 0) fire = false;
  if (e.button === 2) aimZoom = false;
});
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
  aimZoom = false;
  reload = false;
  grenade = false;
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
  const i = {
    mx,
    mz,
    sprint: has('shift'),
    sneak: has('control'),
    fire,
    grenade,
    reload,
    interact: has('e'),
    weapon: wantWeapon,
    ...(aim ? {ax: aim.x, az: aim.z} : {}),
  };
  reload = false;
  grenade = false;
  wantWeapon = null;
  return i;
}

// ---------- panel ----------
$('#start').onclick = () => (cm && (cm.action !== 'play' || sim.outcome) ? cm.returnToMap() : sim.outcome ? newGame() : start());
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
  // experience and loot: paid once per mission, scaled by difficulty; promotions and the trader are right below
  if (cm && !awarded) {
    // a campaign mission: its one result goes into the campaign save; the practice squad is not touched
    awarded = true;
    lastEarned = missionXp(d, diffId);
    lastLoot = rollLoot(POOL, {levelId, debrief: d, difficulty: DIFFICULTY[diffId], seed: cm.deployment.seed});
    cm.finish(d, diffId, lastLoot);
    text.textContent += ' ' + describe(cm.result);
    $('#start').textContent = 'Return to the map';
    renderSquad();
    return;
  }
  if (!awarded) {
    awarded = true;
    lastEarned = missionXp(d, diffId);
    lastLoot = rollLoot(POOL, {
      levelId,
      debrief: d,
      difficulty: DIFFICULTY[diffId],
      seed: (Number(params.get('seed')) || Math.floor(Math.random() * 1e9)) + squad.missions,
    });
    squad = bank(
      award(squad, lastEarned, {level: levelId, outcome: d.outcome, difficulty: diffId, loot: lastLoot.map(e => e.name)}),
      lastLoot,
    );
    saveSquad();
  }
  $('#start').textContent = 'Back to camp';
  renderMissions();
  renderSquad();
  renderCamp();
}

// ---------- the campaign: squad, loot, stash and trader (saved in this browser; drawn by convoy/camp.js) ----------
let awarded = false,
  lastEarned = null,
  lastLoot = null;
const POOL = await fetch(new URL('./data/loot-pool.json', import.meta.url))
  .then(r => r.json())
  .then(d => d.items)
  .catch(() => []);
// The grid inventory (TAC-C-11): the rebels fire the rounds in their kits, and hold E by the dead to search them.
const CAT = await fetch(new URL('../wiki/data/items.json', import.meta.url))
  .then(r => r.json())
  .then(createCatalogue)
  .catch(() => null);
const search = CAT ? createFieldSearch(CAT, {onOpen: () => clearInput(), onClose: () => clearInput()}) : null;
const camp = createCamp({
  get: () => squad,
  set: (next, why) => {
    squad = next;
    saveSquad();
    if (why && sim) sim.say(sim.player, why, 'camp-' + why, 0);
    renderSquad();
    renderCamp();
  },
});
/** The camp, under the briefing or the debrief: rebels and promotions, the stash, the trader. */
function renderCamp() {
  const box = $('#camp');
  if (!box) return;
  box.hidden = !!cm; // the practice camp (trader, promotions) is not part of a campaign mission
  if (cm) return;
  const debrief = !!sim?.outcome;
  box.replaceChildren(
    ...[
      debrief ? el('h3', {}, 'Brought home') : null,
      debrief ? camp.lootList(lastLoot) : null,
      el('h3', {}, 'Squad'),
      camp.squadCards({earned: debrief ? lastEarned : null}),
      el(
        'div',
        {class: 'camp-cols'},
        el('section', {}, el('h3', {}, 'Stash'), camp.stashView()),
        el('section', {}, el('h3', {}, 'Trader'), camp.traderView()),
      ),
    ].filter(Boolean),
  );
}
function renderSquad() {
  const box = $('#squad');
  if (!box) return;
  const reset = el(
    'button',
    {
      type: 'button',
      onclick: () => {
        if (!confirm('Start the campaign over? The squad, its experience and the stash are lost.')) return;
        squad = newSquad();
        saveSquad();
        newGame();
      },
    },
    'New campaign',
  );
  const won = MISSIONS.filter(m => squad.record[m.id]?.won).length;
  box.replaceChildren(
    camp.squadCards({compact: true}),
    el(
      'p',
      {class: 'note'},
      `Missions: ${squad.missions} · ${won} of ${MISSIONS.length} won · ${squad.scrip} scrip. Promotions take effect at the next start.`,
    ),
    reset,
  );
}
const diffSel = $('#difficulty');
for (const [id, d] of Object.entries(DIFFICULTY)) diffSel.append(new Option(d.label, id, false, id === diffId));
const diffNote = () => ($('#difficulty-note').textContent = DIFFICULTY[diffId].text);
diffNote();
diffSel.onchange = () => {
  diffId = diffSel.value;
  store.set(DIFF_KEY, diffId);
  diffNote();
  newGame();
};

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

// ---------- look: cosmetics for each rebel (saved in this browser; they change only the sprites) ----------
let lookId = 'player';
const lookEl = $('#look');
function lookUnit() {
  return sim.units.find(u => u.id === lookId && u.side === 'partisan') || sim.units.find(u => u.side === 'partisan');
}
function select(label, value, options, onChange) {
  const row = document.createElement('label');
  row.className = 'row';
  const sel = document.createElement('select');
  for (const [v, text] of options) sel.append(new Option(text, v, false, v === value));
  sel.onchange = () => onChange(sel.value);
  row.append(label, sel);
  return row;
}
function swatches(label, value, colors, onChange) {
  const row = document.createElement('div');
  row.className = 'row';
  const box = document.createElement('div');
  box.className = 'sw';
  box.setAttribute('role', 'group');
  box.setAttribute('aria-label', label);
  colors.forEach((c, i) => {
    const b = document.createElement('button');
    b.style.background = c;
    b.setAttribute('aria-label', `${label} ${i + 1}`);
    b.setAttribute('aria-pressed', String(c === value));
    b.onclick = () => onChange(c);
    box.append(b);
  });
  row.append(Object.assign(document.createElement('span'), {textContent: label}), box);
  return row;
}
const nice = s => (s === 'none' ? 'None' : s.replace(/([a-z])([A-Z])/g, '$1 $2'));
async function renderLook() {
  const u = lookUnit();
  if (!u) return;
  lookId = u.id;
  const look = lookFor(u),
    gun = savedLook(u.id).gun || '';
  const change = patch => {
    saveLook(u.id, patch);
    R.refreshLook(u.id);
    renderLook();
  };
  const tabs = document.createElement('div');
  tabs.className = 'tools';
  tabs.setAttribute('role', 'group');
  tabs.setAttribute('aria-label', 'Rebel');
  for (const r of sim.units.filter(x => x.side === 'partisan')) {
    const b = document.createElement('button');
    b.textContent = r.name;
    b.setAttribute('aria-pressed', String(r.id === u.id));
    b.onclick = () => {
      lookId = r.id;
      renderLook();
    };
    tabs.append(b);
  }
  const preview = document.createElement('canvas');
  preview.width = 440;
  preview.height = 240;
  preview.setAttribute('aria-label', `${u.name}: front and side`);
  const reset = document.createElement('button');
  reset.textContent = 'Reset look';
  reset.onclick = () => {
    resetLook(u.id);
    R.refreshLook(u.id);
    renderLook();
  };
  const gunOptions = [['', `Default (${WEAPONS[u.weapons[0]].label})`], ...Object.entries(R.guns).map(([id, g]) => [id, g.label])];
  lookEl.replaceChildren(
    tabs,
    preview,
    select('Gun', gun, gunOptions, v => change({gun: v || undefined})),
    select(
      'Body',
      look.body,
      COSMETICS.body.map(b => [b, b]),
      v => change({body: v}),
    ),
    swatches('Skin', look.skin, COSMETICS.skins, v => change({skin: v})),
    select(
      'Hair',
      look.hair,
      COSMETICS.hair.map(h => [h, h]),
      v => change({hair: v}),
    ),
    swatches('Hair colour', look.hairColor, COSMETICS.hairColors, v => change({hairColor: v})),
    select(
      'Shirt',
      look.shirt || 'ShirtBasic',
      COSMETICS.shirt.map(h => [h, nice(h)]),
      v => change({shirt: v}),
    ),
    swatches('Shirt colour', look.shirtColor, COSMETICS.colors, v => change({shirtColor: v})),
    select(
      'Outfit',
      look.shell || 'none',
      COSMETICS.shell.map(h => [h, nice(h)]),
      v => change({shell: v}),
    ),
    swatches('Outfit colour', look.shellColor, COSMETICS.colors, v => change({shellColor: v})),
    select(
      'Headgear',
      look.hat || 'none',
      COSMETICS.hat.map(h => [h, nice(h)]),
      v => change({hat: v}),
    ),
    swatches('Headgear colour', look.hatColor, COSMETICS.colors, v => change({hatColor: v})),
    reset,
  );
  // preview: front and side, the side view holding the gun
  const sprites = await buildPawn(look);
  const g = preview.getContext('2d');
  g.clearRect(0, 0, preview.width, preview.height);
  g.drawImage(sprites.south, 10, 0, 220, 220);
  const chosen = R.guns[gun] || null;
  g.drawImage(sprites.east, 220, 0, 220, 220);
  const G = chosen || R.guns.ak74m;
  if (G) {
    const w = 170,
      h = (w * G.img.height) / G.img.width;
    g.drawImage(G.img, 300, 130 - h / 2, w, h);
  }
}

// ---------- loop ----------
const resize = () => R.resize();
new ResizeObserver(resize).observe(view);
resize();
let acc = 0,
  slowmo = 0,
  last = performance.now(),
  panelAt = 0;
const STEP = 1 / 60;
function frame() {
  const now = performance.now();
  const elapsed = Math.min((now - last) / 1000, 0.25);
  last = now;
  if (started && !document.hidden) picker.update(elapsed);
  acc = Math.min(acc + elapsed * picker.scale, 0.25);
  const live = started && !paused && !sim.outcome && !search?.open;
  if (started && !paused && !search?.open && !document.hidden)
    while (acc >= STEP) {
      sim.step(STEP, input());
      acc -= STEP;
    }
  else acc = 0;
  search?.update(live ? elapsed : 0, live && keys.has('e'));
  if (sim.outcome && $('#card').hidden) {
    showDebrief(sim.debrief());
    $('#card').hidden = false;
  }
  sound.update(sim, {paused, scale: picker.scale, dt: elapsed});
  // slow motion while choosing a rebel, eased in and out; the world dithers with it (none with reduced motion)
  const slowTarget = reduceMotion ? 0 : 1 - picker.scale;
  slowmo += (slowTarget - slowmo) * (1 - Math.exp(-elapsed * (slowTarget > slowmo ? 10 : 6)));
  R.draw(sim, {
    aim: started ? aimPoint() : null,
    selected,
    pointer: started ? pointer : null,
    aimZoom: aimZoom && started,
    abilities: started && !sim.control.pending ? abilityBar() : null,
    slowmo: slowmo < 0.01 ? 0 : slowmo,
  });
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
  sound,
  ability,
  get squad() {
    return squad;
  },
  campaign: cm,
  search,
  get slowmo() {
    return slowmo;
  },
  openSwap: () => picker.open(),
  ready: true,
};
