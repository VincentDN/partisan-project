// PARP Operator Customiser: equipment slots, colour zones, hero poses and idle animation on a roster of
// bases that share one skeleton (Base Operator today; Recon, Insurgent, Enforcer next: see config.js BASES).
//
// State is one flat object {base, slot ids, 'z.<zone>' colours, pose, idle} serialised to the URL hash
// (only values that differ from the base's defaults), so every look is a shareable link.
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {createStage, reduceMotion} from '../shared/stage.js';
import {bindMusicUI} from '../shared/music-ui.js';
import {camoFor, FABRIC} from '../shared/camo.js';
import {Rig, blinkAt} from './rig.js';
import {PALETTES, CAMO_IDS, VIEWS, HERO_AZIMUTH, TRIANGLE_BUDGET, ROSTER, BASES, DEFAULT_BASE, defaultsFor} from './config.js';
import {loadRifle, applySlotState} from '../workbench/rifle-instance.js';
import {MODELS} from '../workbench/models.js';

const $ = s => document.querySelector(s);
const status = $('#status');
bindMusicUI();

const stage = await createStage($('#stage'), {environment: 'outdoor', backdrop: true, lightOffset: 255, heroAzimuth: HERO_AZIMUTH * Math.PI / 180});
const {scene, camera, renderer} = stage;
renderer.toneMappingExposure = 0.85;
const poseData = await (await fetch(new URL('./poses.json', import.meta.url))).json();
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);

const turn = new T.Group();   // turntable parent: operator and carried weapon spin together
turn.name = 'turntable';
scene.add(turn);
const pivot = new T.Group();  // carried weapon, positioned at the hand each frame (no IK)
pivot.name = 'weapon pivot';
turn.add(pivot);

// ---------- Current base ----------
let base = BASES[DEFAULT_BASE], DEFAULTS = defaultsFor(base), state = {...DEFAULTS};
let operator = null, rig = null, meshes = [], meshPart = new Map(), zoneMaterials = new Map();
const baseCache = new Map(); // id -> {scene, rig}: switching back is instant

const triangles = mesh => (mesh.geometry.index ? mesh.geometry.index.count : mesh.geometry.attributes.position.count) / 3;
// Multi-primitive nodes load as Group(SK_x) > SkinnedMesh(SK_x_2): the outermost SK_ ancestor is the node.
const nodeOf = mesh => { let name = null; for (let o = mesh; o; o = o.parent) if (o.name?.startsWith('SK_')) name = o.name; return name; };

// An extension pack ships the shared armature plus new skinned meshes. Re-bind each mesh to the base's own
// bones by name (same rest pose, so the pack's inverse bind matrices stay valid) and parent it to the base's
// Armature node, so posing, idle and visibility treat pack meshes exactly like the original ones.
function bindPack(packScene, scene, baseRig) {
  const armature = scene.getObjectByName('Armature') || scene;
  const baseMaterials = new Map();
  scene.traverse(o => { if (o.isMesh && !baseMaterials.has(o.material.name)) baseMaterials.set(o.material.name, o.material); });
  const skinned = [];
  packScene.traverse(o => { if (o.isSkinnedMesh) skinned.push(o); });
  for (const mesh of skinned) {
    const bones = mesh.skeleton.bones.map(b => baseRig.bones.get(b.name));
    if (bones.some(b => !b)) throw new Error(`pack mesh ${mesh.name} uses bones the base does not have`);
    // A pack material named like one of the base's shares the base instance, so colour zones paint both.
    const shared = baseMaterials.get(mesh.material.name);
    if (shared) mesh.material = shared; else baseMaterials.set(mesh.material.name, mesh.material);   // also share between pack meshes (e.g. hair, moustache, beard)
    mesh.bind(new T.Skeleton(bones, mesh.skeleton.boneInverses), mesh.bindMatrix);
    // The base's skin material uses vertex colours; a pack mesh without a colour attribute would render black.
    if (mesh.material.vertexColors && !mesh.geometry.attributes.color) {
      const n = mesh.geometry.attributes.position.count;
      mesh.geometry.setAttribute('color', new T.BufferAttribute(new Float32Array(n * 3).fill(1), 3));
    }
    armature.add(mesh);
  }
}

async function loadBase(id) {
  const next = BASES[id] || BASES[DEFAULT_BASE];
  status.hidden = false;
  if (!baseCache.has(next.id)) {
    const gltf = await loader.loadAsync(next.model);
    // The rig captures the rest pose, so it must be created once, before any pose is applied, and cached with the scene.
    const newRig = new Rig(gltf.scene, poseData);
    for (const url of next.packs || []) bindPack((await loader.loadAsync(url)).scene, gltf.scene, newRig);
    gltf.scene.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; o.frustumCulled = false; } });
    baseCache.set(next.id, {scene: gltf.scene, rig: newRig});
  }
  if (operator) operator.removeFromParent();
  base = next; DEFAULTS = defaultsFor(base);
  ({scene: operator, rig} = baseCache.get(base.id));
  turn.add(operator);
  meshes = []; meshPart = new Map(); zoneMaterials = new Map();
  operator.traverse(o => { if (o.isMesh) meshes.push(o); });
  // A mesh belongs to a part when it sits under one of the part's nodes and (if the part lists materials) uses one of them.
  for (const mesh of meshes) {
    const node = nodeOf(mesh), mat = mesh.material.name;
    meshPart.set(mesh, Object.entries(base.parts).find(([, p]) => p.nodes.includes(node) && (!p.materials || p.materials.includes(mat)))?.[0] ?? null);
    const m = mesh.material;
    m.userData.orig ??= {color: m.color.clone(), map: m.map};
    if (!zoneMaterials.has(m.name)) zoneMaterials.set(m.name, m);
  }
  status.hidden = true;
}

// ---------- Hash <-> state ----------
const slotOf = id => base.slots.find(s => s.id === id);
function valid(key, value) {
  if (key === 'pose') return !!poseData.poses[value];
  if (key === 'look') return value === 'on' || value === 'off';
  if (key === 'idle') return value === 'off' || !!poseData.idles[value];
  if (key.startsWith('z.')) { const z = base.zones.find(z => z.id === key.slice(2)); return !!z && zoneOptions(z).some(o => o.id === value); }
  return !!slotOf(key)?.options.some(o => o.id === value);
}
const hashOf = () => [...(base.id === DEFAULT_BASE ? [] : [`base=${base.id}`]), ...Object.keys(DEFAULTS).filter(k => k !== 'base' && state[k] !== DEFAULTS[k]).map(k => `${k}=${state[k]}`)].join('&');
function writeHash() { const h = hashOf(); history.replaceState(null, '', h ? '#' + h : location.pathname + location.search); }

// ---------- Colour zones ----------
function zoneOptions(zone) {
  const palette = PALETTES[zone.palette].map(([id, label, color]) => ({id, label, color}));
  const camo = zone.textured ? CAMO_IDS.map(id => ({id, label: id[0].toUpperCase() + id.slice(1) + ' camo', camo: id})) : [];
  return [{id: 'original', label: zone.textured ? 'Original camo' : 'Original', original: true}, ...camo, ...palette];
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

// ---------- Apply state ----------
function visibleParts() {
  const set = new Set();
  const chosen = id => { const slot = slotOf(id); return slot && (slot.options.find(o => o.id === state[id]) || slot.options[0]); };
  for (const slot of base.slots) for (const p of (chosen(slot.id)).show) set.add(p);
  // Hair needs a bare head; a beard and moustache need an uncovered lower face.
  if (!chosen('head')?.hair) set.delete('hair');
  if (chosen('face')?.covers) { set.delete('beard'); set.delete('stache'); }
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
function applyAll() {
  applyEquipment();
  for (const zone of base.zones) paintZone(zone, state[`z.${zone.id}`]);
  rig.setPose(state.pose, 0);
  syncWeapon();
}

// ---------- Carried weapon (a prop from the Weapon Workbench; no firing, no hand animation) ----------
let weapon = null, weaponId = 'none';
async function syncWeapon() {
  const option = slotOf('weapon')?.options.find(o => o.id === state.weapon);
  const id = option?.weapon || 'none';
  if (id === weaponId) return;
  weaponId = id;
  if (weapon) { weapon.holder.removeFromParent(); weapon = null; }
  if (id === 'none') { applyEquipment(); return; }
  const rifle = await loadRifle(id);
  if (weaponId !== id) return; // switched again while loading
  for (const [sid, slot] of Object.entries(rifle.slots)) {
    const wanted = MODELS[id].defaults?.build?.[sid];
    applySlotState(rifle, sid, slot.options.some(o => o.id === wanted) ? wanted : slot.options[0].id);
  }
  // Mount so the pistol-grip socket sits at the pivot origin; rifle axes: +x muzzle, +y up.
  const grip = rifle.sockets.find(s => s.userData.id === 'grip');
  const gp = grip ? rifle.model.worldToLocal(grip.getWorldPosition(new T.Vector3())) : new T.Vector3();
  const holder = new T.Group();
  holder.add(rifle.model);
  rifle.model.position.sub(gp);
  pivot.add(holder);
  let tris = 0;
  rifle.model.traverseVisible(o => { if (o.isMesh) tris += triangles(o); });
  weapon = {rifle, holder, tris};
  applyEquipment();
}
const handPos = new T.Vector3(), tmpE = new T.Euler();
function placeWeapon() {
  const pose = poseData.poses[state.pose];
  pivot.visible = !!weapon && !!pose.weapon;
  if (!pivot.visible) return;
  const w = pose.weapon, offset = w.offset || [0, 0, 0], r = w.rotation || [0, 0, 0];
  turn.worldToLocal(rig.bones.get(`hand_${w.hand}`).getWorldPosition(handPos));
  pivot.position.set(handPos.x + offset[0], handPos.y + offset[1], handPos.z + offset[2]);
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
function set(key, value, cameraView) {
  state = {...state, [key]: value};
  applyAll(); render(); writeHash();
  if (cameraView) view(cameraView);
}
const camoGradient = id => {
  const spec = FABRIC[id];
  if (spec.plaid) return `repeating-linear-gradient(0deg,transparent 0 5px,${spec.plaid[1]}88 5px 7px),repeating-linear-gradient(90deg,transparent 0 5px,${spec.plaid[1]}88 5px 7px),linear-gradient(45deg,${spec.plaid[0]},${spec.base})`;
  const {base: a, blobs: [b, c]} = spec;
  return `radial-gradient(circle at 30% 35%,${b} 0 28%,transparent 29%),radial-gradient(circle at 72% 68%,${c} 0 26%,transparent 27%),${a}`;
};

function render() {
  $('#slots').replaceChildren(...base.slots.map(slot => {
    const row = document.createElement('div'); row.className = 'slot';
    const head = document.createElement('div'); head.className = 'slot-head';
    head.innerHTML = '<span></span>'; head.firstChild.textContent = slot.label;
    const chips = document.createElement('div'); chips.className = 'chips'; chips.role = 'group'; chips.setAttribute('aria-label', slot.label);
    for (const o of slot.options) chips.append(chip(o.label, state[slot.id] === o.id, () => set(slot.id, o.id, slot.camera)));
    row.append(head, chips);
    return row;
  }));
  $('#zones').replaceChildren(...base.zones.map(zone => {
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
  $('#lookat').replaceChildren(chip('Head follows camera', state.look === 'on', () => set('look', state.look === 'on' ? 'off' : 'on')));
  $('#pose-detail').textContent = poseData.poses[state.pose].detail;
  $('#idles').replaceChildren(...[['off', 'Held'], ...Object.entries(poseData.idles).map(([id, i]) => [id, i.label])].map(([id, label]) => chip(label, state.idle === id, () => set('idle', id))));
  $('#presets').replaceChildren(...base.presets.map(p => chip(p.label, false, () => { state = {...DEFAULTS, pose: state.pose, idle: state.idle, ...p.state}; applyAll(); render(); writeHash(); view('full'); })));
  $('#roster').replaceChildren(...ROSTER.map(r => {
    const planned = r.status === 'planned';
    const b = chip(r.label + (planned ? ' · planned' : ''), r.id === base.id, () => { if (!planned && r.id !== base.id) switchBase(r.id); }, planned ? {'aria-disabled': 'true', title: r.note || 'Planned'} : {});
    if (planned) b.classList.add('blocked');
    return b;
  }));
  $('#base-title').innerHTML = `${base.label},<br>low-poly.`;
}
async function switchBase(id) {
  await loadBase(id);
  state = {...DEFAULTS, idle: state.idle};
  applyAll(); render(); writeHash(); view('full');
}

// ---------- Camera ----------
let turntable = false;
function view(name) {
  const v = VIEWS[name] || VIEWS.full;
  const azimuth = (v.azimuth ?? HERO_AZIMUTH) * Math.PI / 180;
  const aspect = $('#stage').clientWidth / $('#stage').clientHeight;
  const d = v.distance * Math.max(1, 0.9 / aspect);
  const target = new T.Vector3(...v.target);
  stage.moveCamera(target, new T.Vector3(Math.sin(azimuth) * d + target.x, v.height + 0.1, Math.cos(azimuth) * d + target.z));
}
for (const [name, v] of Object.entries(VIEWS)) $('#views').append(chip(v.label, false, () => view(name)));
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
  for (const s of base.slots) state[s.id] = pick(s.options).id;
  for (const z of base.zones) state[`z.${z.id}`] = pick(zoneOptions(z)).id;
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
  g.fillText(`${base.label} · ${poseData.poses[state.pose].label} · ${new Date().toISOString().slice(0, 10)}`, Math.round(120 * scale), out.height - bar / 2 + Math.round(7 * scale));
  const a = document.createElement('a'); a.download = `parp-${base.id}-${state.pose}.png`; a.href = out.toDataURL('image/png'); a.click();
};
$('#first-run-close').onclick = () => { $('#first-run').hidden = true; try { localStorage.setItem('parp-operator-seen', '1'); } catch {} };

// ---------- Boot ----------
// Hash -> state. `base=` picks the roster entry (loading its model); other keys are validated against it.
async function restore(hash) {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const id = BASES[params.get('base')] ? params.get('base') : DEFAULT_BASE;
  if (id !== base.id || !operator) await loadBase(id);
  const next = {...DEFAULTS};
  for (const [k, v] of params) if (k in next && k !== 'base' && valid(k, v)) next[k] = v;
  state = next;
  applyAll(); render();
}
try { await restore(location.hash); }
catch (err) { console.error(err); status.hidden = false; status.textContent = 'The operator could not load. Reload in a browser with WebGL enabled.'; throw err; }
addEventListener('hashchange', () => { if (location.hash.replace(/^#/, '') !== hashOf()) restore(location.hash); });
view('full');
try { if (!localStorage.getItem('parp-operator-seen')) { $('#first-run').hidden = false; setTimeout(() => { $('#first-run').hidden = true; }, 14000); } } catch {}

const headPos = new T.Vector3(), camPos = new T.Vector3(), lids = () => meshes.filter(m => meshPart.get(m) === 'lids');
function updateLook(dt) {
  const target = {yaw: 0, pitch: 0};
  if (state.look === 'on' && !reduceMotion) {
    turn.worldToLocal(rig.bones.get('head').getWorldPosition(headPos));
    turn.worldToLocal(camPos.copy(camera.position));
    const dx = camPos.x - headPos.x, dz = camPos.z - headPos.z;
    let yaw = Math.atan2(dx, dz) * 180 / Math.PI;                       // 0 = camera straight ahead, + = to the character's left
    const pitch = Math.atan2(camPos.y - headPos.y, Math.hypot(dx, dz)) * 180 / Math.PI;
    if (Math.abs(yaw) > 110) yaw = 0;                                   // camera behind: do not wring the neck
    target.yaw = Math.max(-40, Math.min(40, yaw)); target.pitch = Math.max(-20, Math.min(20, pitch));
  }
  const k = 1 - Math.exp(-dt * 4);
  rig.look.yaw += (target.yaw - rig.look.yaw) * k; rig.look.pitch += (target.pitch - rig.look.pitch) * k;
}
stage.onFrame((dt, t) => {
  updateLook(dt);
  if (!reduceMotion && state.idle !== 'off') { const closed = blinkAt(t); for (const m of lids()) m.visible = closed; }
  rig.update(dt, t, state.idle === 'off' ? null : state.idle, reduceMotion ? 0 : 1);
  operator.position.y = -rig.lower;               // crouch / kneel: legs fold, the whole body drops
  operator.updateMatrixWorld(true);
  placeWeapon();
  if (turntable) turn.rotation.y += dt * 0.5;
});

// Test hook: lets browser tests await a fully loaded operator and inspect state.
window.PARP_OPERATOR = {
  get state() { return state; }, get rig() { return rig; }, get meshes() { return meshes; }, get meshPart() { return meshPart; },
  get weapon() { return weapon; }, get look() { return rig.look; }, get base() { return base; }, stage, pivot, set: (k, v) => set(k, v), switchBase, ready: true,
};
