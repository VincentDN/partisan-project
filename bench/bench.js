// Bench Lab: staged part changes on a workbench. Reuses the Workbench's rifle instance, rules and rail logic;
// adds a choreographed task (reach, take off, tray, fetch, fit) with two IK arms. No firing.
import * as T from 'three';
import {createStage, reduceMotion} from '../shared/stage.js';
import {mountTopBar} from '../shared/topbar.js';
import {startTour} from '../shared/tour.js';
import {encode, toLegacy} from '../shared/loadout.js';
import {RAIL_OF} from '../workbench/models.js';
import {loadRifle, applySlotState} from '../workbench/rifle-instance.js';
import {applyLoadout, emptyLoadout, installCamo, savedLoadout} from '../workbench/apply-loadout.js';
import {resolve} from '../workbench/rails.js';
import {blockedBy} from '../workbench/stats.js';
import * as mech from '../workbench/mech.js';
import {BenchActions, FAMILIES, FAMILY_OF, phase, smooth} from './actions.js';
import {MOTION, IN_PLACE, partPaths} from './motion.js';
import {buildBench} from './scene.js';
import {Arms} from './hands.js';

const $ = s => document.querySelector(s);
const stageEl = $('#stage'),
  statusEl = $('#status'),
  actionStatus = $('#action-status'),
  review = new URLSearchParams(location.search).has('review');
const wearUniform = {value: 0};
const REST_Y = 0.012; // clearance between the table top and the lowest point of the rifle
let rifle,
  stage,
  arms,
  benchProps,
  restY = 0,
  ghosts = null,
  soundsOn = true;

mountTopBar({title: 'Bench Lab (experiment)', scene: 'bench'});
const play = fn => soundsOn && fn();

// ---------- Build persistence (shared with the Workbench and the Operator Customiser) ----------
function currentLoadout() {
  const offsets = {};
  for (const s of Object.values(rifle.slots)) if (s.offset) offsets[s.spec.id] = Math.round(s.offset * 1000);
  return {rifle: rifle.id, build: {...rifle.build}, offsets, finish: {}, wear: 0};
}
function persist() {
  const legacy = toLegacy(currentLoadout());
  history.replaceState(null, '', location.pathname + location.search + (legacy ? '#' + legacy : ''));
  try {
    localStorage.setItem('parp-loadout', legacy);
  } catch {}
}
// ---------- Rifle ----------
async function mount(l) {
  statusEl.hidden = false;
  if (rifle) stage.scene.remove(rifle.model);
  rifle = await loadRifle(l.rifle, {decorate: m => installCamo(m, wearUniform)});
  applyLoadout(rifle, l.build && Object.keys(l.build).length ? l : {...emptyLoadout(l.rifle), ...l}, wearUniform);
  stage.scene.add(rifle.model);
  rifle.model.updateMatrixWorld(true);
  restY = REST_Y - new T.Box3().setFromObject(rifle.model).min.y;
  rifle.model.position.y = restY;
  $('#title').innerHTML = rifle.config.title.replace(/ /, '<br>') + ',<br>on the bench.';
  for (const b of document.querySelectorAll('[data-rifle]')) b.setAttribute('aria-pressed', String(b.dataset.rifle === rifle.id));
  renderBuild();
  statusEl.hidden = true;
}

// ---------- Rails (same rule as the Workbench) ----------
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
const slotLabel = id => rifle.slots[id]?.spec.label.toLowerCase() || id;

// ---------- Panel ----------
const benchSlots = () => Object.values(rifle.slots).filter(s => FAMILY_OF[s.spec.id] && s.options.length > 1);
function renderBuild() {
  stage?.wake();
  $('#build').replaceChildren(
    ...benchSlots().map(slot => {
      const row = document.createElement('div');
      row.className = 'slot';
      const head = document.createElement('div');
      head.className = 'slot-head';
      head.textContent = slot.spec.label;
      const chips = document.createElement('div');
      chips.className = 'chips';
      for (const o of slot.options) {
        const b = document.createElement('button'),
          blocked = blockedBy(rifle.build, slot.spec.id, o.id),
          current = rifle.build[slot.spec.id] === o.id;
        b.textContent = o.label;
        b.setAttribute('aria-pressed', String(current));
        b.disabled = actions.busy;
        if (blocked && !current) {
          b.className = 'blocked';
          b.title = blocked.reason;
          b.setAttribute('aria-description', blocked.reason);
        }
        b.onclick = () => change(slot, o);
        chips.append(b);
      }
      row.append(head, chips);
      return row;
    }),
  );
}
const say = text => (actionStatus.textContent = text);

// ---------- Choreography ----------
const V = (...a) => new T.Vector3(...a);

/** Keyframed hand: each key is {u, at: () => world Vector3, curl, pinch}; positions blend with smoothstep. */
function sample(keys, u) {
  let i = 0;
  while (i < keys.length - 1 && u >= keys[i + 1].u) i++;
  const a = keys[i],
    b = keys[Math.min(i + 1, keys.length - 1)],
    k = a === b ? 0 : smooth((u - a.u) / (b.u - a.u));
  return {
    pos: a.at().lerp(b.at(), k),
    curl: a.curl + (b.curl - a.curl) * k,
    pinch: (a.pinch ?? 0) + ((b.pinch ?? 0) - (a.pinch ?? 0)) * k,
  };
}

const actions = new BenchActions({
  onState: busy => {
    $('#skip').disabled = $('#cancel').disabled = !busy;
    for (const b of document.querySelectorAll('#build button')) b.disabled = busy;
  },
});

function makeGhost(slot, option) {
  const src = option.original ? slot.original : option.object;
  if (!src) return null;
  const g = new T.Group(),
    copy = src.clone(true);
  copy.visible = true;
  copy.traverse(o => {
    if (o.isMesh) o.castShadow = true;
  });
  g.add(copy);
  g.position.copy(slot.container.position);
  rifle.model.add(g);
  return g;
}

function change(slot, option) {
  const id = slot.spec.id,
    current = slot.options.find(o => o.id === rifle.build[id]);
  if (actions.busy || option.id === current.id) return;
  const rule = blockedBy(rifle.build, id, option.id);
  if (rule) return say(rule.reason);
  // Rails: slide neighbours clear if possible, otherwise explain.
  let offsets = {[id]: slot.offset};
  if (RAIL_OF[id] && slot.rail) {
    const r = resolve(railItems(), id, option.fp || [0, 0], slot.offset);
    if (!r.ok) return say(`${option.label} won't fit: no room next to the ${r.blockedBy.map(slotLabel).join(' and ')}.`);
    offsets = r.offsets;
  }
  const commit = () => {
    for (const [sid, off] of Object.entries(offsets)) if (sid !== id) applySlotState(rifle, sid, rifle.build[sid], off);
    applySlotState(rifle, id, option.id, offsets[id]);
    persist();
    renderBuild();
  };
  if (reduceMotion) {
    commit();
    play(() => mech.fit(id, option, current));
    return say(`${option.label} fitted.`);
  }
  runTask(slot, current, option, commit);
}

function runTask(slot, current, option, commit) {
  const family = FAMILY_OF[slot.spec.id],
    fam = FAMILIES[family],
    motion = MOTION[family],
    inPlace = IN_PLACE.has(family),
    model = rifle.model,
    quick = $('#quick').checked,
    duration = fam.duration * (quick ? 0.55 : 1);
  const oldGhost = inPlace ? null : makeGhost(slot, current),
    nextGhost = inPlace ? null : makeGhost(slot, option);
  for (const g of [oldGhost, nextGhost]) if (g) g.visible = false;
  ghosts = [oldGhost, nextGhost];
  const mount = slot.container.position.toArray(),
    toLocal = w => model.worldToLocal(w.clone());
  const wrist = (grip, dir, along = 0.09) => grip.clone().addScaledVector(dir.clone().normalize(), -along);
  const down = V(0, -1, 0.3),
    over = V(0.1, -0.35, 1);
  const world = {
    mount: () => model.localToWorld(V(...mount)),
    clear: () => model.localToWorld(V(...mount).add(V(...motion.clear))),
    support: () => model.localToWorld(V(0.2, 0.05, 0)),
    home: () => V(0.0, 0.2, -0.45),
  };
  const lift = fam.lift;
  const rightKeys = [
    {u: 0, at: () => world.home().add(V(0.25, 0, 0)), curl: 0.2},
    {u: 0.14, at: () => wrist(world.clear().add(V(0, 0.05, 0)), down), curl: 0.1},
    {u: 0.28, at: () => wrist(world.mount(), down), curl: 0.15, pinch: motion.pinch},
    {u: 0.33, at: () => wrist(world.mount(), down), curl: 0.8, pinch: motion.pinch},
    {u: 0.4, at: () => wrist(oldGhost ? oldGhost.getWorldPosition(V(0, 0, 0)) : world.clear(), down), curl: 0.8, pinch: motion.pinch},
    {u: 0.5, at: () => wrist(oldGhost ? oldGhost.getWorldPosition(V(0, 0, 0)) : world.clear(), down), curl: 0.8, pinch: motion.pinch},
    {u: 0.54, at: () => wrist(benchProps.trayA.clone().add(V(0, 0.06, 0)), down), curl: 0.1},
    {u: 0.58, at: () => wrist(benchProps.trayB, down), curl: 0.2},
    {u: 0.62, at: () => wrist(benchProps.trayB, down), curl: 0.8, pinch: motion.pinch},
    {u: 0.74, at: () => wrist(nextGhost ? nextGhost.getWorldPosition(V(0, 0, 0)) : world.mount(), down), curl: 0.8, pinch: motion.pinch},
    {u: 0.8, at: () => wrist(world.mount(), down), curl: 0.3},
    {u: 0.88, at: () => wrist(world.clear().add(V(0, 0.08, 0)), down), curl: 0.1},
    {u: 1, at: () => world.home().add(V(0.25, 0, 0)), curl: 0.2},
  ];
  const leftKeys = [
    {u: 0, at: () => world.home().add(V(-0.25, 0, 0)), curl: 0.2},
    {u: 0.1, at: () => wrist(world.support().add(V(0, 0.04, 0)), over), curl: 0.2},
    {u: 0.16, at: () => wrist(world.support(), over), curl: 0.7},
    {u: 0.86, at: () => wrist(world.support(), over), curl: 0.7},
    {u: 0.94, at: () => wrist(world.support().add(V(0, 0.06, 0)), over), curl: 0.2},
    {u: 1, at: () => world.home().add(V(-0.25, 0, 0)), curl: 0.2},
  ];

  let fitted = false;
  const spec = {
    duration,
    commitAt: duration * 0.74,
    pauseAt: review && $('#checkpoint').value ? Number($('#checkpoint').value) * duration : undefined,
    commit: () => {
      commit();
      fitted = true;
      slot.container.visible = true;
    },
    update: u => {
      // Rifle: lifted while worked on.
      model.position.y = restY + lift * (phase(u, 0, 0.12) - phase(u, 0.88, 1));
      model.rotation.z = -0.12 * (phase(u, 0, 0.12) - phase(u, 0.88, 1));
      model.updateMatrixWorld(true);
      // Real mounted part hides while its copies travel.
      slot.container.visible = inPlace || fitted || u < 0.34;
      const path = {
        mount,
        clear: motion.clear,
        tray: toLocal(benchProps.trayA).toArray(),
        arc: motion.arc,
      };
      const p = partPaths(u, path);
      if (oldGhost) {
        oldGhost.visible = u >= 0.34 && u < 0.82;
        oldGhost.position.set(...p.old);
      }
      if (nextGhost) {
        const trayB = toLocal(benchProps.trayB).toArray();
        const q = partPaths(u, {...path, tray: trayB});
        nextGhost.visible = u >= 0.5 && u < 0.76;
        nextGhost.position.set(...q.next);
        nextGhost.scale.setScalar(0.4 + 0.6 * phase(u, 0.5, 0.58));
      }
      const r = sample(rightKeys, u),
        l = sample(leftKeys, u);
      const e1 = arms.reach('R', r.pos, down, {curl: r.curl, pinch: r.pinch}),
        e2 = arms.reach('L', l.pos, over, {curl: l.curl});
      $('#reach-error').textContent = review ? `reach error ${(Math.max(e1, e2) * 1000).toFixed(0)} mm` : '';
      stage.controls.update();
    },
    events: [
      {at: duration * 0.05, run: () => play(() => mech.handle(0.4)), transient: true},
      {at: duration * 0.31, run: () => play(() => mech.latch()), transient: true},
      {
        at: duration * 0.38,
        run: () => play(() => (family === 'magazine' ? mech.magazine(0.5, {out: true, in: false}) : mech.railSlide())),
        transient: true,
      },
      {at: duration * 0.5, run: () => play(() => mech.tap()), transient: true},
      {at: duration * 0.6, run: () => play(() => mech.tap()), transient: true},
      {at: duration * 0.73, run: () => play(() => mech.fit(slot.spec.id, option, current)), transient: true},
      {at: duration * 0.95, run: () => play(() => mech.setDown()), transient: true},
    ],
    cleanup: (reason, committed) => {
      slot.container.visible = true;
      for (const g of ghosts || []) g?.removeFromParent();
      ghosts = null;
      model.position.y = restY;
      model.rotation.z = 0;
      parkArms();
      say(
        reason === 'cancel' && !committed
          ? 'Cancelled. Nothing changed.'
          : reason === 'cancel'
            ? `${option.label} was already fitted.`
            : `${option.label} fitted.`,
      );
      $('#resume').disabled = true;
    },
  };
  say(`${fam.label}: ${option.label}…`);
  actions.start(spec);
}

function parkArms() {
  const home = V(0, 0.2, -0.45);
  arms.reach('R', home.clone().add(V(0.25, 0, 0)), V(0, -1, 0.3), {curl: 0.25});
  arms.reach('L', home.clone().add(V(-0.25, 0, 0)), V(0, -1, 0.3), {curl: 0.25});
}

// ---------- Boot ----------
$('#skip').onclick = () => actions.skip();
$('#cancel').onclick = () => actions.cancel();
$('#resume').onclick = () => {
  actions.resume();
  $('#resume').disabled = true;
};
$('#sounds').onchange = e => (soundsOn = e.target.checked);
if (review) $('#review').hidden = false;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) actions.cancel();
});
for (const b of document.querySelectorAll('[data-rifle]'))
  b.onclick = async () => {
    if (actions.busy || rifle.id === b.dataset.rifle) return;
    await mount(emptyLoadout(b.dataset.rifle));
    persist();
  };

try {
  stage = await createStage(stageEl, {environment: 'sunset', backdrop: true, lightOffset: 255, floorSize: 4});
  stage.floor.position.y = -0.9;
  stage.controls.minDistance = 0.4;
  stage.controls.maxDistance = 4;
  stage.controls.target.set(0.03, 0.12, -0.05);
  stage.camera.position.set(0.35, 1.3, 1.85);
  stage.controls.maxPolarAngle = Math.PI * 0.49;
  Object.assign(stage.key.shadow.camera, {left: -1.6, right: 1.6, top: 1.6, bottom: -1.6, near: 0.5, far: 9});
  stage.key.shadow.camera.updateProjectionMatrix();
  benchProps = buildBench();
  stage.scene.add(benchProps.group);
  arms = new Arms({R: [0.22, 0.46, -0.78], L: [-0.22, 0.46, -0.78]});
  stage.scene.add(arms.group);
  await mount(savedLoadout());
  parkArms();
  stage.setAnimated(() => actions.busy);
  stage.onFrame(() => actions.tick());
  persist();
  startTour(
    [
      {
        target: '#build',
        text: 'Pick any option. The operator takes the old part off, sets it in the tray, fetches the new one and fits it.',
      },
      {target: '#skip', text: 'Skip jumps straight to the result. Cancel before the part is fitted leaves the rifle unchanged.'},
      {target: '#quick', text: 'Quick changes shortens the whole sequence.'},
    ],
    {key: 'parp-tour-bench'},
  );
  window.PARP_BENCH = {
    ready: true,
    get rifle() {
      return rifle;
    },
    actions,
    change: (slotId, optionId) => {
      const s = rifle.slots[slotId];
      return change(
        s,
        s.options.find(o => o.id === optionId),
      );
    },
    get ghosts() {
      return ghosts;
    },
    get arms() {
      return arms;
    },
    encode: () => encode(currentLoadout()),
  };
} catch (err) {
  console.error(err);
  statusEl.hidden = false;
  statusEl.textContent = 'The bench could not load. Reload in a browser with WebGL enabled.';
}
