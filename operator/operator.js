// PARP Operator Customiser: equipment slots, colour zones, hero poses and idle animation on the
// Base Operator (purchased low-poly US soldier, see assets/REGISTER.md).
//
// State is one flat object {slot ids, 'z.<zone>' colours, pose, idle} serialised to the URL hash
// (only values that differ from the defaults), so every look is a shareable link.
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {createStage, reduceMotion} from '../shared/stage.js';
import {bindMusicUI} from '../shared/music-ui.js';
import {camoFor} from '../shared/camo.js';
import {Rig} from './rig.js';
import {PARTS, SLOTS, ZONES, PALETTES, CAMO_IDS, VIEWS, HERO_AZIMUTH, TRIANGLE_BUDGET, ROSTER, PRESETS} from './config.js';
import {loadRifle, applySlotState} from '../workbench/rifle-instance.js';
import {MODELS} from '../workbench/models.js';

const MODEL_URL = '../assets/models/operators/base-operator.glb';
const $ = s => document.querySelector(s);
const status = $('#status');

bindMusicUI();

const DEFAULTS = {
  ...Object.fromEntries(SLOTS.map(s => [s.id, s.default])),
  ...Object.fromEntries(ZONES.map(z => [`z.${z.id}`, z.default])),
  pose: 'relaxed', idle: 'calm',
};
let state = {...DEFAULTS};

// ---------- Hash <-> state ----------
function readHash(hash) {
  const next = {...DEFAULTS};
  for (const [k, v] of new URLSearchParams(hash.replace(/^#/, ''))) {
    if (!(k in DEFAULTS)) continue;
    if (valid(k, v)) next[k] = v;
  }
  return next;
}
function valid(key, value) {
  if (key === 'pose') return !!poseData.poses[value];
  if (key === 'idle') return value === 'off' || !!poseData.idles[value];
  if (key.startsWith('z.')) return zoneOptions(ZONES.find(z => z.id === key.slice(2))).some(o => o.id === value);
  return !!SLOTS.find(s => s.id === key)?.options.some(o => o.id === value);
}
function writeHash() {
  const parts = Object.keys(DEFAULTS).filter(k => state[k] !== DEFAULTS[k]).map(k => `${k}=${state[k]}`);
  history.replaceState(null, '', parts.length ? '#' + parts.join('&') : location.pathname + location.search);
}

// ---------- Colour zones ----------
function zoneOptions(zone) {
  const palette = PALETTES[zone.palette].map(([id, label, color]) => ({id, label, color}));
  const camo = zone.textured ? CAMO_IDS.map(id => ({id, label: id[0].toUpperCase() + id.slice(1) + ' camo', camo: id})) : [];
  const original = {id: 'original', label: zone.textured ? 'Original camo' : 'Original', original: true};
  return [original, ...camo, ...palette];
}

// ---------- Scene ----------
const stage = await createStage($('#stage'), {environment: 'outdoor', backdrop: true, lightOffset: 255, heroAzimuth: HERO_AZIMUTH * Math.PI / 180});
const {scene, controls, camera, renderer} = stage;
stage.renderer.toneMappingExposure = 0.85;

const poseData = await (await fetch(new URL('./poses.json', import.meta.url))).json();

let operator, rig, meshes = [], zoneMaterials = new Map();
try {
  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(MODEL_URL);
  operator = gltf.scene;
} catch (err) {
  console.error(err);
  status.hidden = false;
  status.textContent = 'The operator could not load. Reload in a browser with WebGL enabled.';
  throw err;
}
const turn = new T.Group();   // turntable parent: operator and carried weapon spin together
turn.name = 'turntable';
scene.add(turn);
turn.add(operator);
operator.traverse(o => {
  if (o.isMesh) { o.castShadow = o.receiveShadow = true; o.frustumCulled = false; meshes.push(o); }
});
rig = new Rig(operator, poseData);

// Index meshes by part: a mesh belongs to a part when it sits under one of the part's nodes and
// (if the part lists materials) uses one of them.
// Multi-primitive nodes load as Group(SK_x) > SkinnedMesh(SK_x_2): the outermost SK_ ancestor is the node.
const nodeOf = mesh => { let name = null; for (let o = mesh; o; o = o.parent) if (o.name?.startsWith('SK_')) name = o.name; return name; };
const meshPart = new Map();
for (const mesh of meshes) {
  const node = nodeOf(mesh), mat = mesh.material.name;
  const id = Object.entries(PARTS).find(([, p]) => p.nodes.includes(node) && (!p.materials || p.materials.includes(mat)))?.[0] ?? null;
  meshPart.set(mesh, id);
}
for (const mesh of meshes) {
  const m = mesh.material;
  m.userData.orig ??= {color: m.color.clone(), map: m.map};
  if (!zoneMaterials.has(m.name)) zoneMaterials.set(m.name, m);
}
const triangles = mesh => (mesh.geometry.index ? mesh.geometry.index.count : mesh.geometry.attributes.position.count) / 3;

// ---------- Apply state ----------
function visibleParts() {
  const set = new Set();
  for (const slot of SLOTS) {
    const option = slot.options.find(o => o.id === state[slot.id]) || slot.options[0];
    for (const p of option.show) set.add(p);
  }
  return set;
}
function applyEquipment() {
  const show = visibleParts();
  let tris = 0, calls = 0;
  for (const mesh of meshes) {
    const part = meshPart.get(mesh);
    mesh.visible = part === null || show.has(part);
    if (mesh.visible) { tris += triangles(mesh); calls++; }
  }
  // The operator is budgeted on its own; a carried weapon has its own budget (register) and is shown beside it.
  $('#tris').textContent = Math.round(tris).toLocaleString('en');
  $('#tris-budget').textContent = TRIANGLE_BUDGET.toLocaleString('en');
  $('#tris-weapon').textContent = weapon ? ` · carried weapon ${Math.round(weapon.tris).toLocaleString('en')} triangles` : '';
  $('#calls').textContent = String(calls);
  $('#tris-bar').style.width = Math.min(100, tris / TRIANGLE_BUDGET * 100) + '%';
}
function paintZone(zone, id) {
  const option = zoneOptions(zone).find(o => o.id === id) || zoneOptions(zone)[0];
  for (const name of zone.materials) {
    const m = zoneMaterials.get(name);
    if (!m) continue;
    const orig = m.userData.orig;
    if (option.original) { m.color.copy(orig.color); m.map = orig.map; }
    else if (option.camo) { m.color.set(0xffffff); m.map = camoFor(option.camo); }
    else { m.color.set(option.color); m.map = null; }
    m.needsUpdate = true;
  }
}
function applyAll() {
  applyEquipment();
  for (const zone of ZONES) paintZone(zone, state[`z.${zone.id}`]);
  rig.setPose(state.pose, 0);
  syncWeapon();
}

// ---------- Carried weapon (a prop from the Weapon Workbench; no firing, no hand animation) ----------
let weapon = null, weaponId = 'none';
const pivot = new T.Group();
pivot.name = 'weapon pivot';
turn.add(pivot);
async function syncWeapon() {
  const option = SLOTS.find(s => s.id === 'weapon').options.find(o => o.id === state.weapon);
  const id = option?.weapon || 'none';
  if (id === weaponId) return;
  weaponId = id;
  if (weapon) { weapon.rifle.model.removeFromParent(); weapon = null; }
  if (id === 'none') { applyEquipment(); return; }
  const rifle = await loadRifle(id);
  if (weaponId !== id) return; // switched again while loading
  for (const [sid, slot] of Object.entries(rifle.slots)) {
    const wanted = MODELS[id].defaults?.build?.[sid];
    applySlotState(rifle, sid, slot.options.some(o => o.id === wanted) ? wanted : slot.options[0].id);
  }
  // Mount so the pistol-grip socket sits at the pivot origin, rifle axes: +x muzzle, +y up.
  const grip = rifle.sockets.find(s => s.userData.id === 'grip');
  const gp = grip ? rifle.model.worldToLocal(grip.getWorldPosition(new T.Vector3())) : new T.Vector3();
  const holder = new T.Group();
  holder.add(rifle.model);
  rifle.model.position.sub(gp);
  pivot.add(holder);
  let tris = 0, calls = 0;
  rifle.model.traverseVisible(o => { if (o.isMesh) { tris += triangles(o); calls++; } });
  weapon = {rifle, holder, tris, calls};
  applyEquipment();
}
const handPos = new T.Vector3(), tmpQ = new T.Quaternion(), tmpE = new T.Euler();
function placeWeapon() {
  const pose = poseData.poses[state.pose];
  pivot.visible = !!weapon && !!pose.weapon;
  if (!pivot.visible) return;
  const w = pose.weapon, hand = rig.bones.get(`hand_${w.hand}`);
  turn.worldToLocal(hand.getWorldPosition(handPos));
  const offset = w.offset || [0, 0, 0];
  pivot.position.set(handPos.x + offset[0], handPos.y + offset[1], handPos.z + offset[2]);
  const r = w.rotation || [0, 0, 0];
  pivot.quaternion.setFromEuler(tmpE.set(r[0] * Math.PI / 180, r[1] * Math.PI / 180, r[2] * Math.PI / 180, 'YXZ'));
}

// ---------- Panels ----------
function chip(label, pressed, onclick, attrs = {}) {
  const b = document.createElement('button');
  b.textContent = label;
  b.setAttribute('aria-pressed', String(pressed));
  b.onclick = onclick;
  Object.entries(attrs).forEach(([k, v]) => b.setAttribute(k, v));
  return b;
}
function set(key, value, camera) {
  state = {...state, [key]: value};
  applyAll();
  render();
  writeHash();
  if (camera) view(camera);
}
function render() {
  $('#slots').replaceChildren(...SLOTS.map(slot => {
    const row = document.createElement('div'); row.className = 'slot';
    const head = document.createElement('div'); head.className = 'slot-head';
    head.innerHTML = '<span></span>'; head.firstChild.textContent = slot.label;
    const chips = document.createElement('div'); chips.className = 'chips'; chips.role = 'group'; chips.setAttribute('aria-label', slot.label);
    for (const o of slot.options) chips.append(chip(o.label, state[slot.id] === o.id, () => set(slot.id, o.id, slot.camera)));
    row.append(head, chips);
    return row;
  }));
  $('#zones').replaceChildren(...ZONES.map(zone => {
    const row = document.createElement('div'); row.className = 'finish-row';
    const label = document.createElement('span'); label.textContent = zone.label;
    const swatches = document.createElement('div'); swatches.className = 'swatches op-swatches'; swatches.role = 'group'; swatches.setAttribute('aria-label', zone.label + ' colour');
    for (const o of zoneOptions(zone)) {
      const b = chip('', state[`z.${zone.id}`] === o.id, () => set(`z.${zone.id}`, o.id, zone.camera), {title: o.label, 'aria-label': o.label});
      b.style.background = o.color || (o.camo ? camoGradient(o.camo) : 'repeating-linear-gradient(45deg,#4b5a3a 0 5px,#8a6f4a 5px 10px,#2f3a24 10px 15px)');
      if (o.camo || o.original) b.classList.add('pattern');
      swatches.append(b);
    }
    row.append(label, swatches);
    return row;
  }));
  $('#poses').replaceChildren(...Object.entries(poseData.poses).map(([id, p]) => chip(p.label, state.pose === id, () => set('pose', id))));
  $('#pose-detail').textContent = poseData.poses[state.pose].detail;
  $('#idles').replaceChildren(...[['off', 'Held'], ...Object.entries(poseData.idles).map(([id, i]) => [id, i.label])].map(([id, label]) => chip(label, state.idle === id, () => set('idle', id))));
  $('#presets').replaceChildren(...PRESETS.map(p => chip(p.label, false, () => { state = {...DEFAULTS, pose: state.pose, idle: state.idle, ...p.state}; applyAll(); render(); writeHash(); view('full'); })));
}
const CAMO_BASE = {woodland: ['#5a6b3f', '#394829', '#6e5a3c'], desert: ['#b9a27a', '#8d7550', '#d2c19a'], urban: ['#8a8d90', '#5c6064', '#2f3236'], flora: ['#6b7a4e', '#4a5a34', '#8c9a64']};
const camoGradient = id => { const [a, b, c] = CAMO_BASE[id]; return `radial-gradient(circle at 30% 35%,${b} 0 28%,transparent 29%),radial-gradient(circle at 72% 68%,${c} 0 26%,transparent 27%),${a}`; };

$('#roster').replaceChildren(...ROSTER.map(r => {
  const b = chip(r.label + (r.status === 'planned' ? ' · planned' : ''), r.status === 'available', () => {}, r.status === 'planned' ? {'aria-disabled': 'true', title: r.note} : {});
  if (r.status === 'planned') b.classList.add('blocked');
  return b;
}));

// ---------- Camera ----------
let currentView = 'full', turntable = false;
function view(name) {
  currentView = name;
  const v = VIEWS[name] || VIEWS.full;
  const azimuth = (v.azimuth ?? HERO_AZIMUTH) * Math.PI / 180;
  const aspect = $('#stage').clientWidth / $('#stage').clientHeight;
  const d = v.distance * Math.max(1, 0.9 / aspect);
  const target = new T.Vector3(...v.target);
  stage.moveCamera(target, new T.Vector3(Math.sin(azimuth) * d, v.height + 0.1, Math.cos(azimuth) * d).add(new T.Vector3(0, 0, 0)).add(new T.Vector3(target.x, 0, target.z)));
}
for (const [name, v] of Object.entries(VIEWS)) {
  const b = chip(v.label, false, () => view(name));
  $('#views').append(b);
}
$('#spin').onclick = e => { turntable = !turntable; e.currentTarget.setAttribute('aria-pressed', String(turntable)); };
$('#wire').onclick = e => {
  const on = e.currentTarget.getAttribute('aria-pressed') !== 'true';
  for (const m of zoneMaterials.values()) m.wireframe = on;
  e.currentTarget.setAttribute('aria-pressed', String(on));
};

// ---------- Actions ----------
$('#reset').onclick = () => { state = {...DEFAULTS}; applyAll(); render(); writeHash(); view('full'); };
$('#random').onclick = () => {
  const pick = a => a[Math.floor(Math.random() * a.length)];
  state = {...DEFAULTS, idle: state.idle};
  for (const s of SLOTS) state[s.id] = pick(s.options).id;
  for (const z of ZONES) state[`z.${z.id}`] = pick(zoneOptions(z)).id;
  state.pose = pick(Object.keys(poseData.poses));
  applyAll(); render(); writeHash(); view('full');
};
$('#share').onclick = async e => {
  const button = e.currentTarget; writeHash();
  try { await navigator.clipboard.writeText(location.href); button.textContent = 'Link copied'; }
  catch { prompt('Copy this look:', location.href); }
  setTimeout(() => { button.textContent = 'Copy look link'; }, 1600);
};
$('#photo').onclick = () => {
  renderer.render(scene, camera);
  const src = renderer.domElement, out = document.createElement('canvas');
  out.width = src.width; out.height = src.height;
  const g = out.getContext('2d'), scale = src.width / 1400;
  const grad = g.createRadialGradient(out.width / 2, out.height * .42, 0, out.width / 2, out.height * .42, out.width * .7);
  grad.addColorStop(0, '#3a454b'); grad.addColorStop(1, '#1b2226');
  g.fillStyle = grad; g.fillRect(0, 0, out.width, out.height); g.drawImage(src, 0, 0);
  const bar = Math.round(64 * scale);
  g.fillStyle = '#0f1417d9'; g.fillRect(0, out.height - bar, out.width, bar);
  g.fillStyle = '#ef8f39'; g.font = `600 ${Math.round(22 * scale)}px ui-monospace,monospace`; g.fillText('PARP', Math.round(24 * scale), out.height - bar / 2 + Math.round(8 * scale));
  g.fillStyle = '#eceeea'; g.font = `${Math.round(18 * scale)}px system-ui,sans-serif`;
  g.fillText(`Base Operator · ${poseData.poses[state.pose].label} · ${new Date().toISOString().slice(0, 10)}`, Math.round(120 * scale), out.height - bar / 2 + Math.round(7 * scale));
  const a = document.createElement('a'); a.download = `parp-operator-${state.pose}.png`; a.href = out.toDataURL('image/png'); a.click();
};

// ---------- Boot ----------
state = readHash(location.hash);
addEventListener('hashchange', () => { state = readHash(location.hash); applyAll(); render(); });
applyAll();
render();
view('full');
$('#first-run-close').onclick = () => { $('#first-run').hidden = true; try { localStorage.setItem('parp-operator-seen', '1'); } catch {} };
try { if (!localStorage.getItem('parp-operator-seen')) { $('#first-run').hidden = false; setTimeout(() => { $('#first-run').hidden = true; }, 14000); } } catch {}
status.hidden = true;

stage.onFrame((dt, t) => {
  rig.update(dt, t, state.idle === 'off' ? null : state.idle, reduceMotion ? 0 : 1);
  operator.updateMatrixWorld(true);
  placeWeapon();
  if (turntable) turn.rotation.y += dt * 0.5;
});

// Test hook: lets browser tests await a fully loaded operator and inspect state.
window.PARP_OPERATOR = {get state() { return state; }, rig, stage, meshes, meshPart, pivot, get weapon() { return weapon; }, set: (k, v) => set(k, v), ready: true};
