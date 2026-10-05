// Partisan Project Operator Customiser: equipment slots, colour zones, hero poses and idle animation on a roster of
// bases that share one skeleton (Base Operator today; Recon, Insurgent, Enforcer next: see config.js BASES).
//
// State is one flat object {base, slot ids, 'z.<zone>' colours, pose, idle} serialised to the URL hash
// (only values that differ from the base's defaults), so every look is a shareable link.
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import {shareCardDataUrl} from './share-card.js';
import {createStage, reduceMotion} from '../shared/stage.js';
import {buildWarehouse} from './warehouse.js';
import {mountStash} from './stash.js';
import {mountCrew} from './crew.js';
import {createLens} from './lens.js';
import {warehouseAmbience} from '../shared/warehouse-ambience.js';
import {mountTopBar} from '../shared/topbar.js';
import {camoFor, FABRIC} from '../shared/camo.js';
import {Rig, blinkAt} from './rig.js';
import {posesForProfile} from './pose-profile.js';
import * as mech from '../workbench/mech.js';
import {Grip, GRIPS} from './grip.js';
import {PALETTES, CAMO_IDS, VIEWS, HERO_AZIMUTH, TRIANGLE_BUDGET, ROSTER, BASES, DEFAULT_BASE, defaultsFor} from './config.js';
import {loadRifle} from '../workbench/rifle-instance.js';
import {disposeModel, prefetchModels} from '../shared/model-cache.js';
import {MODELS} from '../workbench/models.js';
import {applyLoadout, emptyLoadout, installCamo} from '../workbench/apply-loadout.js';
import {encode, decode, parseLegacy} from '../shared/loadout.js';

const $ = s => document.querySelector(s);
const status = $('#status');
const lab = new URLSearchParams(location.search).has('lab'); // Art Style Lab mode (operator/art-lab.js)
mountTopBar({title: lab ? 'Art Style Lab' : 'Operator Customiser', scene: 'viewer'});

const stage = await createStage($('#stage'), {
  environment: 'outdoor',
  backdrop: true,
  lightOffset: 255,
  heroAzimuth: (HERO_AZIMUTH * Math.PI) / 180,
});
const {scene, camera, renderer} = stage;
renderer.toneMappingExposure = 0.85;
// The room: a dark rebel warehouse with the operator in a pool of light (operator/warehouse.js). It is the default;
// the HDR lighting buttons swap it for Studio, Outdoor or Sunset, and the Warehouse button brings it back.
const warehouse = buildWarehouse(stage);
mountStash($('#stash'));

/**
 * A background figure: another copy of a base, dressed by its own state (equipment and colours), with its own rig and
 * any extra poses. The hero's pipeline, without touching the hero (operator/crew.js places and animates them).
 */
const templates = new Map(); // base id -> Promise of its model with the packs bound, never shown: cloned per figure
function template(b) {
  if (!templates.has(b.id))
    templates.set(
      b.id,
      (async () => {
        const gltf = await loader.loadAsync(b.model);
        const r = new Rig(gltf.scene, posesForProfile(poseData, b.poseProfile));
        for (const url of b.packs || []) bindPack((await loader.loadAsync(url)).scene, gltf.scene, r);
        return gltf.scene;
      })(),
    );
  return templates.get(b.id);
}
async function figure(baseId, st = {}, extraPoses = {}) {
  const b = BASES[baseId];
  const gltf = {scene: SkeletonUtils.clone(await template(b))}; // its own bones, so it poses on its own
  const data = posesForProfile(poseData, b.poseProfile);
  const r = new Rig(gltf.scene, {...data, poses: {...data.poses, ...extraPoses}});
  r.grip = new Grip(r.bones, r.rest, b.grip);
  const full = {...defaultsFor(b), ...st},
    show = visibleParts(b, full),
    mats = new Map();
  gltf.scene.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = o.receiveShadow = true;
    o.frustumCulled = false;
    o.material = o.material.clone();
    o.material.userData.orig = {color: o.material.color.clone(), map: o.material.map};
    if (!mats.has(o.material.name)) mats.set(o.material.name, o.material);
    const part =
      Object.entries(b.parts).find(
        ([, p]) => p.nodes.includes(nodeOf(o)) && (!p.materials || p.materials.includes(o.material.name)),
      )?.[0] ?? null;
    o.visible = part === null || show.has(part);
  });
  // a clone per mesh: paint every material of a zone, not only the first one found
  for (const zone of b.zones) {
    const id = full[`z.${zone.id}`];
    gltf.scene.traverse(
      o => o.isMesh && zone.materials.includes(o.material.name) && paintZone(zone, id, new Map([[o.material.name, o.material]])),
    );
  }
  return {root: gltf.scene, rig: r};
}
/** A rifle prop (no hands solved on it): +x muzzle, +y up, the pistol grip at the origin. */
async function rifleProp(id = 'ak74m') {
  const rifle = await loadRifle(id);
  applyLoadout(rifle, emptyLoadout(id), {value: 0});
  const grip = rifle.sockets.find(s => s.userData.id === 'grip');
  const gp = grip ? rifle.model.worldToLocal(grip.getWorldPosition(new T.Vector3())) : new T.Vector3();
  const holder = new T.Group();
  holder.add(rifle.model);
  rifle.model.position.sub(gp);
  holder.traverse(o => o.isMesh && (o.castShadow = true));
  return holder;
}
// The dirty lens in the warehouse: grime and flares when a lamp or the rim light looks into the camera. The scene draws
// straight to the canvas (its own antialiasing, no blur). Not in the Art Style Lab, which draws its own passes.
const flareSources = [];
warehouse.group.traverse(l => {
  if (l.isPointLight)
    flareSources.push({light: l, strength: 0.55}); // the hanging bulbs
  else if (l.isSpotLight) flareSources.push({light: l, strength: l === warehouse.lights.rim ? 1.2 : 0.8});
});
const lens = lab
  ? null
  : createLens(stage, {
      flares: () => flareSources,
      // who can stand in front of a light: the operator and the crew (operator/crew.js names its group)
      occluders: () =>
        [scene.children.find(o => o.name === 'turntable'), warehouse.group.children.find(o => o.name === 'crew')].filter(Boolean),
    });
// the room's sound (shared/warehouse-ambience.js): voices, radio calls and weapon handling while the warehouse shows
const ambience = lab ? null : warehouseAmbience();
const roomButton = () => {
  $('#room')?.setAttribute('aria-pressed', String(warehouse.enabled));
  lens?.set(warehouse.enabled);
  ambience?.set(warehouse.enabled);
};
$('#ambience')?.setAttribute('aria-pressed', String(!!ambience?.on));
$('#ambience')?.addEventListener('click', () => $('#ambience').setAttribute('aria-pressed', String(!!ambience?.toggle())));
warehouse.on(true);
roomButton();
for (const b of document.querySelectorAll('[data-env], #backdrop'))
  b.addEventListener('click', () => {
    warehouse.on(false);
    roomButton();
  });
$('#room')?.addEventListener('click', () => {
  warehouse.on(!warehouse.enabled);
  roomButton();
});
const poseData = await (await fetch(new URL('./poses.json', import.meta.url))).json();
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);

const turn = new T.Group(); // turntable parent: operator and carried weapon spin together
turn.name = 'turntable';
scene.add(turn);
const pivot = new T.Group(); // carried weapon: placed per pose in body space, then the hands are solved onto it
pivot.name = 'weapon pivot';
turn.add(pivot);

// ---------- Current base ----------
let base = BASES[DEFAULT_BASE],
  DEFAULTS = defaultsFor(base),
  state = {...DEFAULTS};
let operator = null,
  rig = null,
  meshes = [],
  meshPart = new Map(),
  zoneMaterials = new Map();
const baseCache = new Map(); // id -> {scene, rig}: switching back is instant

const triangles = mesh => (mesh.geometry.index ? mesh.geometry.index.count : mesh.geometry.attributes.position.count) / 3;
// Multi-primitive nodes load as Group(SK_x) > SkinnedMesh(SK_x_2): the outermost SK_ ancestor is the node.
const nodeOf = mesh => {
  let name = null;
  for (let o = mesh; o; o = o.parent) if (o.name?.startsWith('SK_')) name = o.name;
  return name;
};

// An extension pack ships the shared armature plus new skinned meshes. Re-bind each mesh to the base's own
// bones by name (same rest pose, so the pack's inverse bind matrices stay valid) and parent it to the base's
// Armature node, so posing, idle and visibility treat pack meshes exactly like the original ones.
function bindPack(packScene, scene, baseRig) {
  const armature = scene.getObjectByName('Armature') || scene;
  const baseMaterials = new Map();
  scene.traverse(o => {
    if (o.isMesh && !baseMaterials.has(o.material.name)) baseMaterials.set(o.material.name, o.material);
  });
  const skinned = [];
  packScene.traverse(o => {
    if (o.isSkinnedMesh) skinned.push(o);
  });
  for (const mesh of skinned) {
    const bones = mesh.skeleton.bones.map(b => baseRig.bones.get(b.name));
    if (bones.some(b => !b)) throw new Error(`pack mesh ${mesh.name} uses bones the base does not have`);
    // A pack material named like one of the base's shares the base instance, so colour zones paint both.
    const shared = baseMaterials.get(mesh.material.name);
    if (shared) mesh.material = shared;
    else baseMaterials.set(mesh.material.name, mesh.material); // also share between pack meshes (e.g. hair, moustache, beard)
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
    const newRig = new Rig(gltf.scene, posesForProfile(poseData, next.poseProfile));
    newRig.grip = new Grip(newRig.bones, newRig.rest, next.grip);
    for (const url of next.packs || []) bindPack((await loader.loadAsync(url)).scene, gltf.scene, newRig);
    gltf.scene.traverse(o => {
      if (o.isMesh) {
        o.castShadow = o.receiveShadow = true;
        o.frustumCulled = false;
      }
    });
    baseCache.set(next.id, {scene: gltf.scene, rig: newRig});
  }
  if (operator) operator.removeFromParent();
  base = next;
  DEFAULTS = defaultsFor(base);
  ({scene: operator, rig} = baseCache.get(base.id));
  turn.add(operator);
  meshes = [];
  meshPart = new Map();
  zoneMaterials = new Map();
  operator.traverse(o => {
    if (o.isMesh) meshes.push(o);
  });
  // A mesh belongs to a part when it sits under one of the part's nodes and (if the part lists materials) uses one of them.
  for (const mesh of meshes) {
    const node = nodeOf(mesh),
      mat = mesh.material.name;
    meshPart.set(
      mesh,
      Object.entries(base.parts).find(([, p]) => p.nodes.includes(node) && (!p.materials || p.materials.includes(mat)))?.[0] ?? null,
    );
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
  if (key === 'build') return value === '' || decode(value) !== null;
  if (key === 'idle') return value === 'off' || !!poseData.idles[value];
  if (key.startsWith('z.')) {
    const z = base.zones.find(z => z.id === key.slice(2));
    return !!z && zoneOptions(z).some(o => o.id === value);
  }
  return !!slotOf(key)?.options.some(o => o.id === value);
}
const hashOf = () =>
  [
    ...(base.id === DEFAULT_BASE ? [] : [`base=${base.id}`]),
    ...Object.keys(DEFAULTS)
      .filter(k => k !== 'base' && state[k] !== DEFAULTS[k])
      .map(k => `${k}=${state[k]}`),
  ].join('&');
function writeHash() {
  const h = hashOf();
  history.replaceState(null, '', h ? '#' + h : location.pathname + location.search);
}

// ---------- Colour zones ----------
function zoneOptions(zone) {
  const palette = PALETTES[zone.palette].map(([id, label, color]) => ({id, label, color}));
  const camo = zone.textured ? CAMO_IDS.map(id => ({id, label: id[0].toUpperCase() + id.slice(1) + ' camo', camo: id})) : [];
  return [{id: 'original', label: zone.textured ? 'Original camo' : 'Original', original: true}, ...camo, ...palette];
}
function paintZone(zone, id, materials = zoneMaterials) {
  const option = zoneOptions(zone).find(o => o.id === id) || zoneOptions(zone)[0];
  for (const name of zone.materials) {
    const m = materials.get(name);
    if (!m) continue;
    const orig = m.userData.orig;
    if (option.original) {
      m.color.copy(orig.color);
      m.map = orig.map;
    } else if (option.camo) {
      m.color.set(0xffffff);
      m.map = camoFor(option.camo);
    } else {
      m.color.set(option.color);
      m.map = zone.preserveTexture ? orig.map : null;
    }
    m.needsUpdate = true;
  }
}

// ---------- Apply state ----------
function visibleParts(b = base, st = state) {
  const set = new Set();
  const chosen = id => {
    const slot = b.slots.find(s => s.id === id);
    return slot && (slot.options.find(o => o.id === st[id]) || slot.options[0]);
  };
  for (const slot of b.slots) for (const p of chosen(slot.id).show) set.add(p);
  // Hair needs a bare head; a beard and moustache need an uncovered lower face.
  if (!chosen('head')?.hair) set.delete('hair');
  if (chosen('face')?.covers) {
    set.delete('beard');
    set.delete('stache');
  }
  return set;
}
function applyEquipment() {
  const show = visibleParts();
  let tris = 0,
    calls = 0;
  for (const mesh of meshes) {
    const part = meshPart.get(mesh);
    mesh.visible = part === null || show.has(part);
    if (mesh.visible) {
      tris += triangles(mesh);
      calls++;
    }
  }
  // The operator is budgeted on its own; a carried weapon has its own budget (register) and is shown beside it.
  $('#tris').textContent = Math.round(tris).toLocaleString('en');
  $('#tris-budget').textContent = TRIANGLE_BUDGET.toLocaleString('en');
  $('#tris-weapon').textContent = weapon ? ` · carried weapon ${Math.round(weapon.tris).toLocaleString('en')} triangles` : '';
  $('#calls').textContent = String(calls);
  $('#tris-bar').style.width = Math.min(100, (tris / TRIANGLE_BUDGET) * 100) + '%';
}
function applyAll(blendSeconds = 0) {
  applyEquipment();
  for (const zone of base.zones) paintZone(zone, state[`z.${zone.id}`]);
  rig.setPose(state.pose, blendSeconds);
  syncWeapon();
}

// ---------- Carried weapon (a prop from the Weapon Workbench; no firing, no hand animation) ----------
let weapon = null,
  weaponId = 'none';
async function syncWeapon() {
  const option = slotOf('weapon')?.options.find(o => o.id === state.weapon);
  const choice = option?.weapon || 'none';
  const key = choice === 'bench' ? 'bench:' + state.build : choice; // a different build is a different prop
  if (key === weaponId) return;
  weaponId = key;
  if (weapon) {
    weapon.holder.removeFromParent();
    disposeModel(weapon.holder);
    weapon = null;
  }
  if (choice === 'none') {
    applyEquipment();
    return;
  }
  let loadout = choice === 'bench' ? decode(state.build) || emptyLoadout('ak74m') : emptyLoadout(choice);
  if (!MODELS[loadout.rifle]) loadout = emptyLoadout('ak74m');
  const wearUniform = {value: 0};
  const rifle = await loadRifle(loadout.rifle, {decorate: m => installCamo(m, wearUniform)});
  if (weaponId !== key) return; // switched again while loading
  applyLoadout(rifle, loadout, wearUniform);
  // Mount so the pistol-grip socket sits at the pivot origin; rifle axes: +x muzzle, +y up.
  const grip = rifle.sockets.find(s => s.userData.id === 'grip');
  const gp = grip ? rifle.model.worldToLocal(grip.getWorldPosition(new T.Vector3())) : new T.Vector3();
  const holder = new T.Group();
  holder.add(rifle.model);
  rifle.model.position.sub(gp);
  pivot.add(holder);
  let tris = 0;
  rifle.model.traverseVisible(o => {
    if (o.isMesh) tris += triangles(o);
  });
  weapon = {rifle, holder, tris, loadout};
  applyEquipment();
}
// A weapon pose (poses.json `weapon`) places the rifle in character space: `hold` is where the pistol-grip centre
// sits, in metres from the `anchor` bone (so it rides the breathing and the crouch), `muzzle` and `up` are the
// directions of the barrel and the top rail. `hands` names the grip each hand takes (operator/grip.js).
const anchorPos = new T.Vector3(),
  mx = new T.Vector3(),
  my = new T.Vector3(),
  mz = new T.Vector3(),
  basisM = new T.Matrix4(),
  goalP = new T.Vector3(),
  goalQ = new T.Quaternion(),
  poleV = new T.Vector3(),
  POLES = {r: [-0.5, -1, -0.45], l: [0.6, -1, -0.3]}; // elbows hang down, out and a little back
// Slung across the back: muzzle up over the right shoulder, top rail facing out, no hands on it.
const SLUNG = {anchor: 'spine_03', hold: [0.1, -0.12, -0.2], muzzle: [-0.55, 0.83, 0], up: [0, 0, -1], hands: {}};
let carry = null; // {p, q, w}: the rifle's blended placement (turn space) and the IK weight
function placeWeapon(dt = 0) {
  const pose = rig.data.poses[state.pose];
  const w = pose.weapon || SLUNG; // a pose with no hands on the rifle carries it slung across the back
  pivot.visible = !!weapon;
  if (!pivot.visible) {
    carry = null;
    return;
  }
  turn.worldToLocal(rig.bones.get(w.anchor || 'spine_03').getWorldPosition(anchorPos));
  mx.fromArray(w.muzzle).normalize();
  my.fromArray(w.up);
  my.addScaledVector(mx, -my.dot(mx)).normalize();
  mz.crossVectors(mx, my);
  goalQ.setFromRotationMatrix(basisM.makeBasis(mx, my, mz));
  goalP.fromArray(w.hold).add(anchorPos).sub(mx.fromArray(GRIPS.grip.at).applyQuaternion(goalQ));
  if (!carry) carry = {p: goalP.clone(), q: goalQ.clone(), w: 0};
  // Follow the pose blend: the rifle eases to its new place while the body blends.
  const k = dt > 0 && !reduceMotion ? 1 - Math.exp(-dt * 9) : 1;
  carry.p.lerp(goalP, k);
  carry.q.slerp(goalQ, k);
  carry.w = w === SLUNG ? 0 : reduceMotion ? 1 : Math.min(1, carry.w + dt * 5); // the hands blend in again when it comes off the back
  pivot.position.copy(carry.p);
  pivot.quaternion.copy(carry.q);
  pivot.updateMatrixWorld(true);
  const ik = rig.grip;
  for (const [side, gripId] of Object.entries(w.hands || {r: 'grip'})) {
    poleV.fromArray(w.pole?.[side] || POLES[side]).transformDirection(turn.matrixWorld);
    const at = weapon.rifle.config.handguardAt;
    ik.solve(side, gripId === 'handguard' && at ? {...GRIPS.handguard, at} : gripId, pivot.matrixWorld, poleV, carry.w);
  }
  if (carry.w < 1) rig._dirty = true; // the next frame rewrites the pose before blending the IK in again
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
// The weapon an operator holds unless something says otherwise: the user's Workbench build if they made one,
// else the slot default (AK-74M). Applied to fresh states, not to DEFAULTS, so a shared link still names its gun.
function benchDefault() {
  let stored = '';
  try {
    stored = localStorage.getItem('parp-loadout') || '';
  } catch {}
  const build = stored ? encode(parseLegacy(stored)) : '';
  return build && decode(build) && slotOf('weapon')?.options.some(o => o.id === 'bench') ? {weapon: 'bench', build} : {};
}
const fresh = () => ({...DEFAULTS, ...benchDefault()});
// Handling sounds from the Workbench (recorded foley, synthesised until it loads) for every change on the operator.
const HEAVY = new Set(['armor', 'rig', 'pack', 'belt', 'holsters']);
function actionSound(key) {
  if (key === 'weapon') {
    mech.setDown();
    setTimeout(() => mech.charge(), 220);
  } else if (key === 'pose') mech.handle(0.9);
  else if (key === 'idle' || key === 'look') mech.handle(0.4);
  else if (key.startsWith('z.') || key.startsWith('patch')) mech.tap();
  else if (HEAVY.has(key)) mech.clunk(0.55);
  else mech.latch();
}
function set(key, value, cameraView) {
  if (state[key] !== value) actionSound(key);
  state = {...state, [key]: value};
  if (key === 'weapon' && value === 'bench') {
    // capture the Workbench's latest build so the link is self-contained
    let stored = '';
    try {
      stored = localStorage.getItem('parp-loadout') || '';
    } catch {}
    state.build = encode(parseLegacy(stored));
  } else if (key === 'weapon') state.build = '';
  applyAll(key === 'pose' && !reduceMotion ? 0.6 : 0);
  render();
  writeHash();
  if (cameraView) view(cameraView);
}
const camoGradient = id => {
  const spec = FABRIC[id];
  if (spec.plaid)
    return `repeating-linear-gradient(0deg,transparent 0 5px,${spec.plaid[1]}88 5px 7px),repeating-linear-gradient(90deg,transparent 0 5px,${spec.plaid[1]}88 5px 7px),linear-gradient(45deg,${spec.plaid[0]},${spec.base})`;
  const {
    base: a,
    blobs: [b, c],
  } = spec;
  return `radial-gradient(circle at 30% 35%,${b} 0 28%,transparent 29%),radial-gradient(circle at 72% 68%,${c} 0 26%,transparent 27%),${a}`;
};

function render() {
  stage.wake();
  $('#slots').replaceChildren(
    ...base.slots.map(slot => {
      const row = document.createElement('div');
      row.className = 'slot';
      const head = document.createElement('div');
      head.className = 'slot-head';
      head.innerHTML = '<span></span>';
      head.firstChild.textContent = slot.label;
      const chips = document.createElement('div');
      chips.className = 'chips';
      chips.role = 'group';
      chips.setAttribute('aria-label', slot.label);
      for (const o of slot.options) chips.append(chip(o.label, state[slot.id] === o.id, () => set(slot.id, o.id, slot.camera)));
      row.append(head, chips);
      return row;
    }),
  );
  $('#zones').replaceChildren(
    ...base.zones.map(zone => {
      const row = document.createElement('div');
      row.className = 'finish-row';
      const label = document.createElement('span');
      label.textContent = zone.label;
      const swatches = document.createElement('div');
      swatches.className = 'swatches op-swatches';
      swatches.role = 'group';
      swatches.setAttribute('aria-label', zone.label + ' colour');
      for (const o of zoneOptions(zone)) {
        const b = chip('', state[`z.${zone.id}`] === o.id, () => set(`z.${zone.id}`, o.id, zone.camera), {
          title: o.label,
          'aria-label': o.label,
        });
        b.style.background =
          o.color || (o.camo ? camoGradient(o.camo) : 'repeating-linear-gradient(45deg,#4b5a3a 0 5px,#8a6f4a 5px 10px,#2f3a24 10px 15px)');
        if (o.camo || o.original) b.classList.add('pattern');
        swatches.append(b);
      }
      row.append(label, swatches);
      return row;
    }),
  );
  $('#poses').replaceChildren(...Object.entries(poseData.poses).map(([id, p]) => chip(p.label, state.pose === id, () => set('pose', id))));
  $('#lookat').replaceChildren(chip('Head follows camera', state.look === 'on', () => set('look', state.look === 'on' ? 'off' : 'on')));
  $('#pose-detail').textContent = poseData.poses[state.pose].detail;
  $('#idles').replaceChildren(
    ...[['off', 'Held'], ...Object.entries(poseData.idles).map(([id, i]) => [id, i.label])].map(([id, label]) =>
      chip(label, state.idle === id, () => set('idle', id)),
    ),
  );
  $('#presets').replaceChildren(
    ...base.presets.map(p =>
      chip(p.label, false, () => {
        mech.clunk(0.6);
        setTimeout(() => mech.latch(), 120);
        state = {...fresh(), pose: state.pose, idle: state.idle, ...p.state};
        applyAll();
        render();
        writeHash();
        view(p.view || 'full');
      }),
    ),
  );
  $('#roster').replaceChildren(
    ...ROSTER.map(r => {
      const planned = r.status === 'planned';
      const b = chip(
        r.label + (planned ? ' · planned' : ''),
        r.id === base.id,
        () => {
          if (!planned && r.id !== base.id) switchBase(r.id);
        },
        planned ? {'aria-disabled': 'true', title: r.note || 'Planned'} : {},
      );
      if (planned) b.classList.add('blocked');
      return b;
    }),
  );
  $('#base-title').innerHTML = `${base.label},<br>low-poly.`;
  $('#base-description').textContent =
    base.description || 'Choose an operator, change equipment and colours, then combine a pose with an idle style.';
}
async function switchBase(id) {
  mech.setDown();
  await loadBase(id);
  state = {...fresh(), idle: state.idle};
  applyAll();
  render();
  writeHash();
  view('full');
}

// ---------- Camera ----------
let turntable = false;
function view(name) {
  const v = VIEWS[name] || VIEWS.full;
  const azimuth = ((v.azimuth ?? HERO_AZIMUTH) * Math.PI) / 180;
  const aspect = $('#stage').clientWidth / $('#stage').clientHeight;
  const d = v.distance * Math.max(1, 0.9 / aspect);
  const target = new T.Vector3(...v.target);
  // Fast and tight: a third of a second, a small overshoot.
  stage.moveCamera(target, new T.Vector3(Math.sin(azimuth) * d + target.x, v.height + 0.1, Math.cos(azimuth) * d + target.z), 0.32, 1.1);
}
for (const [name, v] of Object.entries(VIEWS))
  $('#views').append(
    chip(v.label, false, () => {
      mech.handle(0.3);
      view(name);
    }),
  );
$('#spin').onclick = e => {
  turntable = !turntable;
  e.currentTarget.setAttribute('aria-pressed', String(turntable));
};
$('#wire').onclick = e => {
  const on = e.currentTarget.getAttribute('aria-pressed') !== 'true';
  for (const m of zoneMaterials.values()) m.wireframe = on;
  e.currentTarget.setAttribute('aria-pressed', String(on));
};

// ---------- Actions ----------
$('#reset').onclick = () => {
  mech.clunk(0.4);
  state = {...fresh()};
  applyAll();
  render();
  writeHash();
  view('full');
};
$('#random').onclick = () => {
  const pick = a => a[Math.floor(Math.random() * a.length)];
  mech.handle(1);
  mech.clunk(0.5);
  setTimeout(() => mech.charge(), 250);
  state = {...fresh(), idle: state.idle};
  for (const s of base.slots) state[s.id] = pick(s.options).id;
  for (const z of base.zones) state[`z.${z.id}`] = pick(zoneOptions(z)).id;
  state.pose = pick(Object.keys(poseData.poses));
  applyAll();
  render();
  writeHash();
  view('full');
};
$('#share').onclick = async e => {
  const button = e.currentTarget;
  writeHash();
  try {
    await navigator.clipboard.writeText(location.href);
    button.textContent = 'Link copied';
  } catch {
    prompt('Copy this look:', location.href);
  }
  setTimeout(() => {
    button.textContent = 'Copy look link';
  }, 1600);
};
$('#card').onclick = () => {
  renderer.render(scene, camera);
  const equipment = base.slots
    .map(sl => ({label: sl.label, choice: sl.options.find(o => o.id === state[sl.id])?.label}))
    .filter(e => e.choice && !(weapon && e.label === 'Carried weapon'));
  const a = document.createElement('a');
  a.download = `parp-${base.id}-card.png`;
  a.href = shareCardDataUrl({
    canvas: renderer.domElement,
    base,
    poseLabel: poseData.poses[state.pose].label,
    equipment,
    rifle: weapon?.rifle,
  });
  a.click();
};
$('#photo').onclick = () => {
  renderer.render(scene, camera);
  const src = renderer.domElement,
    out = document.createElement('canvas');
  out.width = src.width;
  out.height = src.height;
  const g = out.getContext('2d'),
    scale = src.width / 1400;
  const grad = g.createRadialGradient(out.width / 2, out.height * 0.42, 0, out.width / 2, out.height * 0.42, out.width * 0.7);
  grad.addColorStop(0, '#46563a');
  grad.addColorStop(1, '#1e2717');
  g.fillStyle = grad;
  g.fillRect(0, 0, out.width, out.height);
  g.drawImage(src, 0, 0);
  const bar = Math.round(64 * scale);
  g.fillStyle = '#12170fd9';
  g.fillRect(0, out.height - bar, out.width, bar);
  g.fillStyle = '#ef8f39';
  g.font = `600 ${Math.round(22 * scale)}px ui-monospace,monospace`;
  g.fillText('Partisan Project', Math.round(24 * scale), out.height - bar / 2 + Math.round(8 * scale));
  g.fillStyle = '#dbe5c3';
  g.font = `${Math.round(18 * scale)}px system-ui,sans-serif`;
  g.fillText(
    `${base.label} · ${poseData.poses[state.pose].label} · ${new Date().toISOString().slice(0, 10)}`,
    Math.round(250 * scale),
    out.height - bar / 2 + Math.round(7 * scale),
  );
  const a = document.createElement('a');
  a.download = `parp-${base.id}-${state.pose}.png`;
  a.href = out.toDataURL('image/png');
  a.click();
};
// ---------- Boot ----------
// Hash -> state. `base=` picks the roster entry (loading its model); other keys are validated against it.
async function restore(hash) {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const id = BASES[params.get('base')] ? params.get('base') : DEFAULT_BASE;
  if (id !== base.id || !operator) await loadBase(id);
  const next = {...fresh()};
  for (const [k, v] of params) if (k in next && k !== 'base' && valid(k, v)) next[k] = v;
  state = next;
  applyAll();
  render();
}
try {
  await restore(location.hash);
} catch (err) {
  console.error(err);
  status.hidden = false;
  status.textContent = 'The operator could not load. Reload in a browser with WebGL enabled.';
  throw err;
}
addEventListener('hashchange', () => {
  if (location.hash.replace(/^#/, '') !== hashOf()) restore(location.hash);
});
view('full');

let lidCache = {meshes: null, count: -1, list: []};
const headPos = new T.Vector3(),
  camPos = new T.Vector3(),
  lids = () => {
    if (lidCache.meshes !== meshes || lidCache.count !== meshes.length)
      lidCache = {meshes, count: meshes.length, list: meshes.filter(m => meshPart.get(m) === 'lids')};
    return lidCache.list;
  };
function updateLook(dt) {
  const target = {yaw: 0, pitch: 0};
  if (state.look === 'on' && !reduceMotion) {
    turn.worldToLocal(rig.bones.get('head').getWorldPosition(headPos));
    turn.worldToLocal(camPos.copy(camera.position));
    const dx = camPos.x - headPos.x,
      dz = camPos.z - headPos.z;
    let yaw = (Math.atan2(dx, dz) * 180) / Math.PI; // 0 = camera straight ahead, + = to the character's left
    const pitch = (Math.atan2(camPos.y - headPos.y, Math.hypot(dx, dz)) * 180) / Math.PI;
    if (Math.abs(yaw) > 110) yaw = 0; // camera behind: do not wring the neck
    target.yaw = Math.max(-40, Math.min(40, yaw));
    target.pitch = Math.max(-20, Math.min(20, pitch));
  }
  const k = 1 - Math.exp(-dt * 4);
  rig.look.yaw += (target.yaw - rig.look.yaw) * k;
  rig.look.pitch += (target.pitch - rig.look.pitch) * k;
}
// Idle motion, the turntable and a pose blend animate on their own; otherwise the stage idles at a low frame rate.
stage.setAnimated(() => (!reduceMotion && state.idle !== 'off') || turntable || rig.blend < 1);
stage.onFrame((dt, t) => {
  updateLook(dt);
  if (!reduceMotion && state.idle !== 'off') {
    const closed = blinkAt(t);
    for (const m of lids()) m.visible = closed;
  }
  rig.update(dt, t, state.idle === 'off' ? null : state.idle, reduceMotion ? 0 : 1);
  operator.position.y = -rig.lower; // crouch / kneel: legs fold, the whole body drops
  operator.updateMatrixWorld(true);
  placeWeapon(dt);
  if (turntable) turn.rotation.y += dt * 0.5;
});

// Test hook: lets browser tests await a fully loaded operator and inspect state.
// the background crew loads after the hero, so it never delays the operator
const crew = lab ? null : mountCrew({scene, warehouse, figure, rifleProp, stage, reduceMotion});
// Parse the rifles in the background, one per idle moment, so picking a weapon is instant (shared/model-cache.js).
prefetchModels(Object.values(MODELS).map(m => new URL(m.url, new URL('../workbench/', import.meta.url)).href));
window.PARP_OPERATOR = {
  warehouse,
  lens,
  ambience,
  get crew() {
    return crew;
  },
  get state() {
    return state;
  },
  get rig() {
    return rig;
  },
  get meshes() {
    return meshes;
  },
  get meshPart() {
    return meshPart;
  },
  get weapon() {
    return weapon;
  },
  get look() {
    return rig.look;
  },
  get base() {
    return base;
  },
  stage,
  pivot,
  set: (k, v) => set(k, v),
  switchBase,
  ready: true,
};
if (lab) window.PARP_OPERATOR.artLab = (await import('./art-lab.js')).mountArtLab(window.PARP_OPERATOR);
