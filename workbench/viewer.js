import {installCamo as installRifleCamo, applyFinishState} from './rifle-finishes.js';
import {loadRifle as loadRifleInstance, applySlotState} from './rifle-instance.js';
import * as T from 'three';
import {startTour} from '../shared/tour.js';
import {bindMusicUI} from '../shared/music-ui.js';
import {createStage} from '../shared/stage.js';
import {renderStatsPanel} from './stats-panel.js';
import {savePhoto, saveCard} from './export.js';
import {parseLegacy, toLegacy, encode, decode} from '../shared/loadout.js';
import {MODELS, DEFAULT_MODEL, RAIL_OF} from './models.js';
import {resolve, fits} from './rails.js';
import {blockedBy} from './stats.js';
import * as mech from './mech.js';

const accent = 0xef8f39;
// Launch look: the sunset HDR as a blurred backdrop, turned so the sun keys the rifle from front-left.
// Lights follow the camera, so this relationship holds from every angle; lightOffset is in degrees.
const LAUNCH = {environment: 'sunset', backdrop: true, lightOffset: 255};
// The hero view the launch lighting was set up from: azimuth and elevation in radians.
const HERO = {azimuth: -0.2, elevation: 0.1};
// Reduced motion: camera moves and part swaps jump straight to their end state.
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
// Camera presets are sized for a rifle this long (m); longer or shorter builds scale them.
const FRAME_LENGTH = 0.943;

// Background music, volume and track: shared with every PARP module (shared/music-ui.js).
bindMusicUI();

const stageEl = document.querySelector('#stage'),
  status = document.querySelector('#status'),
  detail = document.querySelector('#detail');
const buildPanel = document.querySelector('#build'),
  finishPanel = document.querySelector('#finish'),
  statsPanel = document.querySelector('#stats');
let st, scene, renderer, camera, controls, floor;
let selected = null,
  hovered = null,
  tweens = [],
  spinning = false,
  buildBox = new T.Box3(),
  restoring = true;
// Everything that belongs to the mounted rifle; replaced on a switch.
let rifle = null;
const socketMarkers = new T.Group(),
  labelPoint = new T.Vector3();
let labelsShown = false;
socketMarkers.visible = false;

const loadRifle = id => loadRifleInstance(id, {decorate: installCamo});

function disposeRifle(r) {
  r.model.removeFromParent();
  r.model.traverse(o => {
    if (o.isMesh) {
      o.geometry.dispose();
      o.material.dispose();
    }
  });
  socketMarkers.clear();
  for (const l of r.socketLabels || []) l.el.remove();
  document.querySelector('#parts').replaceChildren();
}

// Selected parts glow orange; the part under the pointer gets a faint lift.
function paint() {
  if (!rifle) return;
  const chosen = new Set(rifle.parts.find(p => p.id === selected)?.objects || []),
    hover = new Set(rifle.parts.find(p => p.id === hovered)?.objects || []);
  rifle.model.traverse(o => {
    if (!o.isMesh || !o.material.emissive) return;
    const on = chosen.has(o) || hover.has(o);
    o.material.emissive.setHex(chosen.has(o) ? accent : on ? 0xffffff : 0);
    o.material.emissiveIntensity = chosen.has(o) ? 0.35 : on ? 0.06 : 0;
  });
}
function select(id) {
  selected = selected === id ? null : id;
  const part = rifle.parts.find(p => p.id === selected);
  paint();
  for (const p of rifle.parts) p.entry.setAttribute('aria-pressed', String(p.id === selected));
  detail.textContent = part ? part.detail : 'Select a part on the model or in this list to highlight it.';
}

function applySlot(id, optionId, offset, animate = false) {
  const slot = rifle.slots[id],
    option = slot.options.find(o => o.id === optionId) || slot.options[0];
  const shownBefore = slot.original.visible ? slot.original : slot.options.find(o => o.object?.visible)?.object;
  const before = {
    container: slot.container.position.clone(),
    position: slot.original.position.clone(),
    rotationY: slot.original.rotation.y,
    nodes: new Map([...slot.home.keys()].map(n => [n, n.position.clone()])),
  };
  applySlotState(rifle, id, option.id, offset);
  slot.part.entry?.querySelector('span') && (slot.part.entry.querySelector('span').textContent = option.label);
  if (selected === id) detail.textContent = slot.part.detail;
  renderBuild();
  renderFinish();
  updateStats();
  writeHash();
  if (!animate) return;
  // Stats above used the final pose; now rewind to the old one and glide there.
  const shown = option.original ? slot.original : option.object,
    slide = slot.direction.clone().multiplyScalar(0.05);
  tween(slot.container, 'position', before.container, slot.container.position.clone());
  if (shown && shown !== shownBefore) tween(shown, 'position', shown.position.clone().add(slide), shown.position.clone());
  else if (shown === slot.original) {
    tween(slot.original, 'position', before.position, slot.original.position.clone());
    tween(slot.original, 'rotationY', before.rotationY, slot.original.rotation.y);
    for (const [node, p] of before.nodes) tween(node, 'position', p, node.position.clone());
  }
}
function tween(object, property, from, to) {
  tweens = tweens.filter(t => !(t.object === object && t.property === property));
  const same = property === 'rotationY' ? from === to : from.equals(to);
  if (!same) tweens.push({object, property, from, to, t: 0});
}
function stepTweens(dt) {
  for (const t of tweens) {
    t.t = reduceMotion ? 1 : Math.min(1, t.t + dt / 0.4);
    const e = 1 - (1 - t.t) ** 3;
    if (t.property === 'rotationY') t.object.rotation.y = t.from + (t.to - t.from) * e;
    else t.object.position.lerpVectors(t.from, t.to, e);
  }
  tweens = tweens.filter(t => t.t < 1);
}

// ---------- Rails: parts on one rail cannot overlap (rails.js) ----------
function railItems() {
  return Object.values(rifle.slots)
    .filter(s => RAIL_OF[s.spec.id] && s.rail)
    .map(s => ({
      slot: s.spec.id,
      rail: RAIL_OF[s.spec.id],
      baseX: s.base.x,
      offset: s.offset,
      fp: s.options.find(o => o.id === rifle.build[s.spec.id])?.fp || [0, 0],
      travel: s.rail,
    }));
}
const say = text => {
  detail.textContent = text;
  detail.classList.remove('flash');
  void detail.offsetWidth;
  detail.classList.add('flash');
};
const slotLabel = id => rifle.slots[id]?.spec.label.toLowerCase() || id;
// Fit an option on its rail, sliding neighbours clear when that is possible. Returns false (and explains) when there is no room.
function chooseOption(slot, option, current) {
  const id = slot.spec.id,
    r = resolve(railItems(), id, option.fp || [0, 0], slot.offset);
  if (!r.ok) {
    say(`${option.label} won't fit: no room on the ${RAIL_OF[id]} rail next to the ${r.blockedBy.map(slotLabel).join(' and ')}.`);
    return false;
  }
  if (o_changed(option, current)) mech.fit(id, option, current);
  for (const [sid, off] of Object.entries(r.offsets)) if (sid !== id) applySlot(sid, rifle.build[sid], off, true);
  applySlot(id, option.id, r.offsets[id], true);
  if (r.moved.length) say(`Slid the ${r.moved.map(slotLabel).join(' and ')} to make room for the ${option.label.toLowerCase()}.`);
  return true;
}
const o_changed = (a, b) => a && b && a.id !== b.id;
// After a restore (links can be hand-edited) settle any overlap by sliding parts to free positions.
function settleRails() {
  for (const it of railItems()) {
    const r = resolve(railItems(), it.slot, it.fp, it.offset);
    if (r.ok)
      for (const [sid, off] of Object.entries(r.offsets)) if (rifle.slots[sid].offset !== off) applySlot(sid, rifle.build[sid], off);
  }
}

// Build panel: one chip row per slot, plus rail position steppers.
function renderBuild() {
  if (restoring) return;
  buildPanel.replaceChildren(
    ...Object.values(rifle.slots).map(slot => {
      const row = document.createElement('div');
      row.className = 'slot';
      const head = document.createElement('div');
      head.className = 'slot-head';
      head.innerHTML = '<span></span>';
      head.firstChild.textContent = slot.spec.label;
      const current = slot.options.find(o => o.id === rifle.build[slot.spec.id]);
      if (slot.rail && (current.original || current.build)) {
        const {min, max, step} = slot.rail,
          stepper = document.createElement('span');
        stepper.className = 'stepper';
        const mm = Math.round(slot.offset * 1000);
        for (const [text, delta, label] of [
          ['−', -step, 'rearward'],
          [`${mm > 0 ? '+' : ''}${mm} mm`, 0],
          ['+', step, 'forward'],
        ]) {
          if (!delta) {
            const out = document.createElement('output');
            out.textContent = text;
            stepper.append(out);
            continue;
          }
          const b = document.createElement('button');
          b.textContent = text;
          b.setAttribute('aria-label', `Move ${slot.spec.label.toLowerCase()} ${label} one rail slot`);
          b.disabled = delta < 0 ? slot.offset <= min + 1e-6 : slot.offset >= max - 1e-6;
          if (!b.disabled && !fits(railItems(), slot.spec.id, slot.offset + delta)) {
            b.disabled = true;
            b.title = 'Another part is in the way on this rail.';
          }
          b.onclick = () => {
            mech.railStep(Math.sign(delta));
            applySlot(slot.spec.id, rifle.build[slot.spec.id], slot.offset + delta, true);
            frame(slot.spec.id);
          };
          stepper.append(b);
        }
        head.append(stepper);
      }
      const chips = document.createElement('div');
      chips.className = 'chips';
      chips.role = 'group';
      chips.setAttribute('aria-label', slot.spec.label);
      for (const o of slot.options) {
        const b = document.createElement('button');
        b.textContent = o.label;
        b.setAttribute('aria-pressed', String(rifle.build[slot.spec.id] === o.id));
        // Blocked options stay visible; clicking explains why instead of fitting them.
        const rule =
          blockedBy(rifle.build, slot.spec.id, o.id) ||
          (RAIL_OF[slot.spec.id] && !resolve(railItems(), slot.spec.id, o.fp || [0, 0], slot.offset).ok
            ? {reason: 'No room on the ' + RAIL_OF[slot.spec.id] + ' rail: another part is in the way.'}
            : null);
        if (rule) {
          b.setAttribute('aria-disabled', 'true');
          b.classList.add('blocked');
          b.title = rule.reason;
        }
        b.onclick = () => {
          if (rule) {
            detail.textContent = `${o.label} can't be fitted: ${rule.reason}`;
            detail.classList.remove('flash');
            void detail.offsetWidth;
            detail.classList.add('flash');
            return;
          }
          if (chooseOption(slot, o, current)) frame(slot.spec.id);
        };
        // Hover or focus previews the stat change this option would make.
        const preview = () => renderStats({...rifle.build, [slot.spec.id]: o.id});
        b.onpointerenter = b.onfocus = preview;
        b.onpointerleave = b.onblur = () => renderStats();
        chips.append(b);
      }
      row.append(head, chips);
      return row;
    }),
  );
}
// Snap to the slot's hero angle (slot.spec.camera: direction from the part, distance in m,
// aim offset toward the part's middle), turned with the model so it works mid-turntable.
function frame(id) {
  const slot = rifle.slots[id],
    target = slot.container.getWorldPosition(new T.Vector3());
  const {direction, distance, aim = [0, 0, 0]} = slot.spec.camera,
    up = new T.Vector3(0, 1, 0);
  target.add(new T.Vector3(...aim).applyAxisAngle(up, rifle.model.rotation.y));
  const dir = new T.Vector3(...direction).normalize().applyAxisAngle(up, rifle.model.rotation.y);
  st.moveCamera(target, target.clone().addScaledVector(dir, distance), 0.45);
}

// Camo on the rifle: it has no UVs, so recolourable materials get a triplanar projection in the
// rifle's own space (fixed per part at load, so the pattern stays glued to each part).
const wearUniform = {value: 0};
let wear = 0;
const installCamo = model => installRifleCamo(model, wearUniform);
function applyFinish(targetId, finishId) {
  applyFinishState(rifle, targetId, finishId);
  renderFinish();
  writeHash();
}
function setWear(value) {
  wear = value;
  wearUniform.value = value;
  const input = document.querySelector('#wear');
  if (input) {
    input.value = String(Math.round(value * 100));
    document.querySelector('#wear-level').textContent =
      value < 0.05 ? 'Factory new' : value < 0.35 ? 'Light' : value < 0.7 ? 'Field used' : 'Battle worn';
  }
}
function renderFinish() {
  if (restoring) return;
  finishPanel.replaceChildren(
    ...rifle.finishTargets
      .filter(t => !t.option || rifle.build[t.part.id] === t.option)
      .map(target => {
        const label = target.label || target.part.label;
        const row = document.createElement('div');
        row.className = 'finish-row';
        row.textContent = label;
        const swatches = document.createElement('div');
        swatches.className = 'swatches';
        swatches.role = 'group';
        swatches.setAttribute('aria-label', label + ' colour');
        for (const f of target.finishes) {
          const b = document.createElement('button');
          b.title = f.label;
          b.setAttribute('aria-label', f.label);
          b.setAttribute('aria-pressed', String(rifle.finish[target.id] === f.id));
          b.style.background = f.color || 'linear-gradient(135deg,#1c1d1f 50%,#3a3c3f 50%)';
          if (f.pattern) b.classList.add('pattern');
          b.onclick = () => {
            if (rifle.finish[target.id] !== f.id) mech.tap();
            applyFinish(target.id, f.id);
          };
          swatches.append(b);
        }
        row.append(swatches);
        return row;
      }),
  );
}
// Live stats: length from the visible geometry (turntable angle ignored), mass and handling from
// the options (stats.js). renderStats(preview) shows the change a hovered option would make.
function updateStats() {
  buildBox = localBox(rifle.model);
  renderStats();
}
// Bounds of an object's visible meshes in its own space, whatever its parent, pose or visibility.
function localBox(object) {
  object.updateMatrixWorld(true);
  const inverse = object.matrixWorld.clone().invert(),
    box = new T.Box3(),
    m = new T.Matrix4();
  for (const child of object.children)
    child.traverseVisible(o => {
      if (!o.isMesh || o.userData.visualEffect) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      box.union(o.geometry.boundingBox.clone().applyMatrix4(m.multiplyMatrices(inverse, o.matrixWorld)));
    });
  return box;
}
function renderStats(preview) {
  if (restoring || !statsPanel) return;
  renderStatsPanel(statsPanel, rifle, buildBox, preview);
}

// The rifle's launch build and colours (models.js `defaults`).
const defaultOption = slot => {
  const id = rifle.config.defaults?.build?.[slot.spec.id];
  return slot.options.some(o => o.id === id) ? id : slot.options[0].id;
};
const defaultFinish = target => rifle.config.defaults?.finish?.[target.id] ?? 'original';
// Loadout codes live in the URL hash, e.g. #rifle=ak15k&optic=scope@-20&stock-finish=fde
function writeHash() {
  st?.wake();
  if (restoring) return;
  // Ids and offsets are URL-safe, so the hash is joined by hand to keep '@' readable.
  const params = rifle.id === DEFAULT_MODEL ? [] : ['rifle=' + rifle.id];
  for (const slot of Object.values(rifle.slots)) {
    const id = slot.spec.id;
    if (rifle.build[id] !== defaultOption(slot) || slot.offset)
      params.push(id + '=' + rifle.build[id] + (slot.offset ? '@' + Math.round(slot.offset * 1000) : ''));
  }
  for (const t of rifle.finishTargets) if (rifle.finish[t.id] !== defaultFinish(t)) params.push(t.id + '-finish=' + rifle.finish[t.id]);
  if (wear) params.push('wear=' + Math.round(wear * 100));
  history.replaceState(null, '', params.length ? '#' + params.join('&') : location.pathname + location.search);
  // The Operator Customiser can carry this build as its rifle ("Workbench build").
  try {
    localStorage.setItem('parp-loadout', location.hash.replace(/^#/, ''));
  } catch {}
}

// Swap in another rifle; the camera, lighting and music carry on untouched.
async function mount(id) {
  if (rifle?.id === id) return;
  status.hidden = false;
  const next = await loadRifle(id);
  if (rifle) disposeRifle(rifle);
  rifle = next;
  selected = hovered = null;
  tweens = [];
  scene.add(rifle.model);
  const config = rifle.config;
  floor.position.y = new T.Box3().setFromObject(rifle.model).min.y - 0.002;
  for (const b of document.querySelectorAll('[data-rifle]')) b.setAttribute('aria-pressed', String(b.dataset.rifle === id));
  document.querySelector('#source').innerHTML =
    `Model: <a href="${config.source.url}">${config.source.title}</a> by <a href="${config.author.url}">${config.author.name}</a>, <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. Loose rounds and spare magazine removed.`;
  for (const part of rifle.parts) {
    const entry = document.createElement('button');
    entry.className = 'part';
    entry.setAttribute('aria-pressed', 'false');
    entry.innerHTML = '<strong></strong><span></span>';
    entry.querySelector('strong').textContent = part.label;
    entry.onclick = () => select(part.id);
    document.querySelector('#parts').append(entry);
    part.entry = entry;
  }
  detail.textContent = 'Select a part on the model or in this list to highlight it.';
  rifle.socketLabels = rifle.sockets.map(s => {
    const el = document.createElement('div');
    el.className = 'socket';
    el.textContent = s.userData.label;
    el.hidden = true;
    stageEl.append(el);
    return {socket: s, el};
  });
  socketMarkers.rotation.y = 0;
  for (const s of rifle.sockets) {
    const ring = new T.Mesh(new T.TorusGeometry(0.012, 0.0022, 8, 24), new T.MeshBasicMaterial({color: accent, depthTest: false}));
    ring.renderOrder = 10;
    ring.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), s.userData.direction);
    s.getWorldPosition(ring.position);
    socketMarkers.add(ring);
  }
  if (document.querySelector('#wire').getAttribute('aria-pressed') === 'true')
    rifle.model.traverse(o => {
      if (o.isMesh) o.material.wireframe = true;
    });
  status.hidden = true;
}
// Restores are queued so rapid switches or hash changes apply in order.
let queue = Promise.resolve();
function restore(hash) {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const id = MODELS[params.get('rifle')] ? params.get('rifle') : DEFAULT_MODEL;
  queue = queue
    .then(async () => {
      const switching = rifle?.id !== id;
      await mount(id);
      restoring = true;
      tweens = [];
      for (const slot of Object.values(rifle.slots)) {
        const [option, mm] = (params.get(slot.spec.id) || '').split('@');
        slot.offset = 0;
        rifle.build[slot.spec.id] = slot.options.some(o => o.id === option) ? option : defaultOption(slot);
        slot.pendingOffset = Number(mm) / 1000 || 0;
      }
      // Old or hand-edited links may break a rule; the later slot falls back to its default.
      for (const slot of Object.values(rifle.slots)) {
        const id = slot.spec.id;
        if (blockedBy(rifle.build, id, rifle.build[id]))
          rifle.build[id] = [defaultOption(slot), ...slot.options.map(o => o.id)].find(o => !blockedBy(rifle.build, id, o));
      }
      for (const sid of Object.keys(rifle.slots)) applySlot(sid, rifle.build[sid], rifle.slots[sid].pendingOffset);
      settleRails();
      for (const t of rifle.finishTargets) applyFinish(t.id, params.get(t.id + '-finish') ?? defaultFinish(t));
      setWear(T.MathUtils.clamp(Number(params.get('wear')) || 0, 0, 100) / 100);
      restoring = false;
      renderBuild();
      renderFinish();
      renderStats();
      showRifle();
      writeHash();
      if (switching && camera) view('hero');
    })
    .catch(err => {
      console.error(err);
      status.hidden = false;
      status.textContent = 'The rifle could not load. Reload to try again.';
    });
  return queue;
}
// Switching rifles keeps whatever of the current build the other rifle can take.
function switchRifle(id) {
  if (rifle?.id === id) return;
  const params = location.hash
    .replace(/^#/, '')
    .split('&')
    .filter(p => p && !p.startsWith('rifle='));
  if (id !== DEFAULT_MODEL) params.unshift('rifle=' + id);
  return restore('#' + params.join('&'));
}

function view(name) {
  // Fit the current build: long muzzle devices, short carbines or a folded stock change the length.
  const center = buildBox.getCenter(new T.Vector3()),
    fit = (buildBox.max.x - buildBox.min.x) / FRAME_LENGTH || 1;
  const aspect = stageEl.clientWidth / stageEl.clientHeight,
    d = Math.max(1.3, 1.6 / aspect) * fit;
  controls.target.set(center.x, 0, 0);
  const hero = new T.Vector3().setFromSphericalCoords(d * 1.08, Math.PI / 2 - HERO.elevation, HERO.azimuth);
  const at = {
    hero: hero.toArray(),
    three: [d * 0.55, d * 0.32, d * 0.8],
    left: [0, 0.02, -d],
    right: [0, 0.02, d],
    top: [0, d, 0.001],
    muzzle: [d * 0.65, 0.06, d * 0.28],
  }[name];
  if (name === 'muzzle') controls.target.set(buildBox.max.x - 0.14, 0, 0);
  camera.position.set(...at).add(controls.target);
  controls.update();
}

// The rifle sits at the origin, facing +x.
function showRifle() {
  st?.wake();
  if (rifle.model.parent !== scene) scene.add(rifle.model);
  rifle.model.position.set(0, 0, 0);
  rifle.model.quaternion.identity();
  rifle.model.visible = true;
  document.querySelector('#title').innerHTML = `${rifle.config.title},<br>low-poly.`;
}
// Presets: whole loadouts (rifle build and finishes) as hash fragments; the current
// rifle is kept only where the preset names one.
const PRESETS = [
  {id: 'partisan', label: 'Partisan', hash: ''},
  {
    id: 'scout',
    label: 'Scout',
    hash: 'rifle=ak15k&foregrip=stop&handguard-finish=od&foregrip-finish=od&grip-finish=od&stock-finish=od&magazine-finish=od&suppressor-finish=od',
  },
  {
    id: 'breacher',
    label: 'Breacher',
    hash: 'rifle=ak15k&muzzle=brake&optic=holo&magazine=60&stock=collapsed&handguard-finish=original&foregrip-finish=original&grip-finish=original&stock-finish=original&magazine-finish=original',
  },
  {
    id: 'marksman',
    label: 'Marksman',
    hash: 'optic=scope&foregrip=angled&handguard-finish=desert&stock-finish=desert&foregrip-finish=desert&suppressor-finish=fde',
  },
];
function applyPreset(preset) {
  restore('#' + preset.hash).then(() => view('hero'));
}

try {
  st = await createStage(stageEl, {
    environment: LAUNCH.environment,
    backdrop: LAUNCH.backdrop,
    lightOffset: LAUNCH.lightOffset,
    heroAzimuth: HERO.azimuth,
    floorSize: 4,
  });
  ({scene, renderer, camera, controls, floor} = st);
  controls.minDistance = 0.15;
  controls.maxDistance = 3.5;
  floor.material.opacity = 0.28;
  // The rifle is ~1 m: a tighter shadow frustum than the default keeps the shadow crisp.
  Object.assign(st.key.shadow.camera, {left: -1.3, right: 1.3, top: 1.3, bottom: -1.3, near: 0.5, far: 8});
  st.key.shadow.camera.updateProjectionMatrix();
  scene.add(socketMarkers);

  await restore(location.hash);
  if (!rifle) throw new Error('No rifle loaded');
  view('hero');
  for (const b of document.querySelectorAll('[data-rifle]'))
    b.onclick = () => {
      if (rifle?.id === b.dataset.rifle) return;
      mech.setDown();
      switchRifle(b.dataset.rifle)?.then(() => mech.charge());
    };
  // Warm the HTTP cache with the other rifles once the page is idle, so switching is instant.
  (window.requestIdleCallback || setTimeout)(
    () => {
      if (navigator.connection?.saveData) return; // respect Data Saver
      for (const [id, m] of Object.entries(MODELS)) if (id !== rifle.id) fetch(m.url).catch(() => {});
    },
    {timeout: 4000},
  );
  document.querySelector('#photo').onclick = () => savePhoto({renderer, scene, camera, rifle});
  let lastFile = 0;
  document.querySelector('#wear').oninput = e => {
    setWear(Number(e.target.value) / 100);
    if (performance.now() - lastFile > 70) {
      lastFile = performance.now();
      mech.file();
    }
  };
  document.querySelector('#wear').onchange = () => writeHash();
  document.querySelector('#card').onclick = () => saveCard({renderer, scene, camera, rifle, buildBox});
  // First visit: a short guided tour (preset > part > stat), remembered per browser.
  startTour(
    [
      {target: '#presets', text: 'Start from a preset loadout, or build your own.'},
      {target: '#build', text: 'Swap a part at any mount point. Hover an option to preview its effect.'},
      {target: '#stats', text: 'The stat bars show what each choice does to handling. Green is better.'},
    ],
    {key: 'parp-tour-workbench'},
  );
  document.querySelector('#presets').replaceChildren(
    ...PRESETS.map(p => {
      const b = document.createElement('button');
      b.textContent = p.label;
      b.onclick = () => {
        mech.handle(1);
        mech.clunk(0.6);
        setTimeout(() => mech.charge(), 250);
        applyPreset(p);
      };
      return b;
    }),
  );
  // Reset returns the rifle build to its defaults; the chosen rifle stays.
  document.querySelector('#reset').onclick = () => {
    mech.handle(1);
    mech.clunk(0.5);
    const keep = location.hash
      .replace(/^#/, '')
      .split('&')
      .filter(p => /^rifle/.test(p));
    restore(keep.length ? '#' + keep.join('&') : '').then(() => view('hero'));
  };
  // A versioned, paste-able code for the whole build (also accepted: a legacy link). See shared/loadout.js.
  document.querySelector('#copy-code').onclick = async e => {
    const button = e.currentTarget;
    writeHash();
    const code = encode(parseLegacy(location.hash));
    try {
      await navigator.clipboard.writeText(code);
      button.textContent = 'Code copied';
    } catch {
      prompt('Copy this loadout code:', code);
    }
    setTimeout(() => {
      button.textContent = 'Copy loadout code';
    }, 1600);
  };
  document.querySelector('#load-code').onclick = () => {
    const text = prompt('Paste a loadout code (P1.…) or a Workbench link:');
    if (text === null) return;
    const l = decode(text);
    if (!l) {
      alert('That code could not be read. It may come from a newer version.');
      return;
    }
    restore('#' + toLegacy(l)).then(() => view('hero'));
  };
  document.querySelector('#share').onclick = async e => {
    const button = e.currentTarget;
    writeHash();
    try {
      await navigator.clipboard.writeText(location.href);
      button.textContent = 'Link copied';
    } catch {
      prompt('Copy this loadout link:', location.href);
    }
    setTimeout(() => {
      button.textContent = 'Copy loadout link';
    }, 1600);
  };
  addEventListener('hashchange', () => restore(location.hash));

  document.querySelector('#sockets').onclick = e => {
    socketMarkers.visible = !socketMarkers.visible;
    e.currentTarget.setAttribute('aria-pressed', String(socketMarkers.visible));
  };
  document.querySelector('#spin').onclick = e => {
    spinning = !spinning;
    e.currentTarget.setAttribute('aria-pressed', String(spinning));
  };
  document.querySelector('#wire').onclick = e => {
    const on = e.currentTarget.getAttribute('aria-pressed') !== 'true';
    rifle.model.traverse(o => {
      if (o.isMesh) o.material.wireframe = on;
    });
    e.currentTarget.setAttribute('aria-pressed', String(on));
  };

  const ray = new T.Raycaster(),
    pointer = new T.Vector2();
  let down = null;
  function partAt(e) {
    const r = renderer.domElement.getBoundingClientRect();
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, (-(e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(pointer, camera);
    const hit = ray.intersectObject(rifle.model, true)[0];
    return hit && rifle.parts.find(p => p.objects.includes(hit.object));
  }
  renderer.domElement.addEventListener('pointerdown', e => {
    down = [e.clientX, e.clientY];
  });
  renderer.domElement.addEventListener('pointerup', e => {
    if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 5) {
      const p = partAt(e);
      if (p) select(p.id);
      else if (selected) select(selected);
    }
    down = null;
  });
  renderer.domElement.addEventListener('pointermove', e => {
    if (down || !controls.enabled) return;
    const p = partAt(e);
    renderer.domElement.style.cursor = p ? 'pointer' : '';
    if ((p?.id || null) !== hovered) {
      hovered = p?.id || null;
      paint();
    }
  });
  renderer.domElement.addEventListener('pointerleave', () => {
    if (hovered) {
      hovered = null;
      paint();
    }
  });

  for (const b of document.querySelectorAll('[data-view]')) b.onclick = () => view(b.dataset.view);
  stageEl.addEventListener('keydown', e => {
    if (e.key === 'Escape' && selected) select(selected);
  });

  st.setAnimated(() => spinning || tweens.length > 0);
  st.onFrame(dt => {
    if (spinning) {
      rifle.model.rotation.y += dt * 0.5;
      socketMarkers.rotation.y = rifle.model.rotation.y;
    }
    stepTweens(dt);
    // Mount-point labels only cost anything while they are shown; hide them once when the markers go off.
    if (socketMarkers.visible || labelsShown) {
      labelsShown = socketMarkers.visible;
      for (const {socket, el} of rifle.socketLabels) {
        const p = socket.getWorldPosition(labelPoint).project(camera);
        el.hidden = !labelsShown || p.z > 1;
        el.style.left = (p.x * 0.5 + 0.5) * stageEl.clientWidth + 'px';
        el.style.top = (-p.y * 0.5 + 0.5) * stageEl.clientHeight - 18 + 'px';
      }
    }
  });
} catch (err) {
  console.error(err);
  status.hidden = false;
  status.textContent = 'The viewer could not load. Reload in a browser with WebGL enabled.';
}
