// StG 44 (2044) gunsmith bench: stage, lighting, the canted rifle you turn by hand, sliding/swapping attachments and handling foley.
import * as THREE from 'three';
import {RGBELoader} from 'three/addons/loaders/RGBELoader.js';
import * as mech from '../../shared/mech.js';
import {WEAR, PALETTES, applyPalette, materials} from './finish.js';
import {MOUNTS, buildRifle} from './rifle.js';
import {DEFAULT_BUILD, SLOTS, optionOf} from './parts.js';
import {buildPanel} from './panel.js';
import {floorTexture} from './floor.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const stageEl = document.getElementById('stage'),
  status = document.getElementById('status');
const state = {build: {...DEFAULT_BUILD}, pos: {}, palette: 'feldgrau', sound: true};
for (const [k, m] of Object.entries(MOUNTS)) if (m.range) state.pos[k] = m.start;
state.pos.stock = SLOTS.stock.slide.start;
try {
  const saved = JSON.parse(decodeURIComponent(location.hash.slice(1)) || 'null');
  if (saved) {
    for (const k in saved.b || {}) if (SLOTS[k] && SLOTS[k].options.some(o => o.id === saved.b[k])) state.build[k] = saved.b[k];
    for (const k in saved.p || {}) if (k in state.pos && Number.isFinite(saved.p[k])) state.pos[k] = saved.p[k];
    if (PALETTES[saved.f]) state.palette = saved.f;
    if (Number.isFinite(saved.w)) WEAR.value = Math.min(1, Math.max(0, saved.w));
  }
} catch {
  /* a bad link falls back to the default build */
}
const save = () =>
  history.replaceState(
    null,
    '',
    '#' + encodeURIComponent(JSON.stringify({b: state.build, p: state.pos, f: state.palette, w: +WEAR.value.toFixed(2)})),
  );
const play = fn => {
  if (!state.sound) return;
  try {
    fn();
  } catch {
    /* sound is optional */
  }
};

const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true, preserveDrawingBuffer: true});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
stageEl.prepend(renderer.domElement);
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x06080b, 2.2, 5.5);
const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 20);
let dist = 2.25;

// lighting: a warm key from above the shooter's side, a cold rim from behind, studio reflections for the steel
const key = new THREE.SpotLight(0xffe2bd, 38, 6, 0.5, 0.6, 1.4);
key.position.set(-0.7, 1.5, 1.5);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.bias = -0.0003;
key.shadow.radius = 4;
const rim = new THREE.DirectionalLight(0x7fb4ff, 2.6);
rim.position.set(1.2, 0.9, -1.6);
const kick = new THREE.DirectionalLight(0xff9a5c, 0.7);
kick.position.set(-1.5, -0.2, -0.6);
scene.add(key, key.target, rim, kick, new THREE.HemisphereLight(0x8fa6c4, 0x0a0806, 0.35));
new RGBELoader().load('../../assets/lighting/studio.hdr', hdr => {
  hdr.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = new THREE.PMREMGenerator(renderer).fromEquirectangular(hdr).texture;
  scene.environmentIntensity = 0.55;
  hdr.dispose();
});
// dusty floor that catches the shadow and a pool of light
const floorTex = floorTexture();
const floor = new THREE.Mesh(
  new THREE.CircleGeometry(4, 48),
  new THREE.MeshStandardMaterial({map: floorTex, roughness: 0.92, metalness: 0}),
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.34;
floor.receiveShadow = true;
scene.add(floor);

// the rifle on a pivot you turn by hand; `cant` keeps the showroom roll
const M = materials();
applyPalette(M, state.palette);
const pivot = new THREE.Group(),
  rifle = buildRifle(M);
rifle.position.x = -0.27; // centre of mass over the pivot
pivot.add(rifle);
scene.add(pivot);
const VIEWS = {hero: [-0.42, 0.14, 0.2], left: [Math.PI, 0.04, 0], right: [0, 0.04, 0], top: [-0.2, 1.15, 0], muzzle: [-1.25, 0.1, 0.1]};
const rot = {yaw: VIEWS.hero[0], pitch: VIEWS.hero[1], cant: VIEWS.hero[2], vy: 0, vp: 0, ty: null, tp: null, tc: null};
const groups = {};
function mountSlot(slot) {
  if (groups[slot]) rifle.remove(groups[slot]);
  const opt = optionOf(slot, state.build[slot]),
    g = opt.build(M, state.pos.stock) || new THREE.Group();
  g.userData.slot = slot;
  groups[slot] = g;
  rifle.add(g);
  placeSlot(slot);
  return opt;
}
function placeSlot(slot) {
  const m = MOUNTS[slot],
    g = groups[slot],
    opt = optionOf(slot, state.build[slot]);
  if (m.range) {
    const half = opt.len || 0;
    state.pos[slot] = Math.min(m.range[1] - half * 0.5, Math.max(m.range[0] + half * 0.5, state.pos[slot]));
    g.position.set(state.pos[slot], m.y, m.z || 0);
  } else if (slot !== 'stock') g.position.set(m.x, m.y, 0); // the stock builder places itself on the buffer tube
}
Object.keys(SLOTS).forEach(mountSlot);

function setOption(slot, id) {
  const prev = optionOf(slot, state.build[slot]);
  if (prev.id === id) return;
  state.build[slot] = id;
  const opt = mountSlot(slot);
  const w = Math.min(1, (opt.grams || prev.grams || 100) / 600);
  play(() => (slot === 'mag' ? mech.magazine(w) : (mech.clunk(w), mech.latch(undefined, 0))));
  panel.sync();
  save();
}
function slideTo(slot, x, quiet) {
  const before = Math.round(state.pos[slot] * 100);
  state.pos[slot] = x;
  if (slot === 'stock') mountSlot('stock');
  else placeSlot(slot);
  const after = Math.round(state.pos[slot] * 100);
  if (after !== before && !quiet) play(() => mech.railStep(after > before ? 1 : -1));
  panel.sync();
  save();
}
const panel = buildPanel({
  state,
  SLOTS,
  MOUNTS,
  PALETTES,
  WEAR,
  setOption,
  slideTo,
  setPalette(id) {
    state.palette = id;
    applyPalette(M, id);
    play(() => mech.tap());
    save();
  },
  setWear(v) {
    WEAR.value = v;
    play(() => mech.file());
    save();
  },
  view(name) {
    [rot.ty, rot.tp, rot.tc] = VIEWS[name];
    play(() => mech.handle(0.7));
  },
  reset() {
    Object.assign(state.build, DEFAULT_BUILD);
    for (const [k, m] of Object.entries(MOUNTS)) if (m.range) state.pos[k] = m.start;
    state.pos.stock = SLOTS.stock.slide.start;
    Object.keys(SLOTS).forEach(mountSlot);
    play(() => mech.charge());
    save();
  },
});

// pointer: drag empty space to turn the rifle, drag an attachment to slide it along its rail
const ray = new THREE.Raycaster(),
  ndc = new THREE.Vector2();
let drag = null,
  turned = 0;
const slotAt = e => {
  const r = renderer.domElement.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  for (const hit of ray.intersectObject(rifle, true)) {
    let o = hit.object;
    while (o && !o.userData.slot) o = o.parent;
    return o && (MOUNTS[o.userData.slot].range || o.userData.slot === 'stock') ? o.userData.slot : null;
  }
  return null;
};
renderer.domElement.addEventListener('pointerdown', e => {
  const slot = slotAt(e);
  renderer.domElement.setPointerCapture(e.pointerId);
  rot.ty = rot.tp = rot.tc = null;
  if (slot) {
    // screen direction of the bore, so dragging along the rail moves the part
    const a = new THREE.Vector3(0, 0, 0).applyMatrix4(rifle.matrixWorld).project(camera),
      b = new THREE.Vector3(0.1, 0, 0).applyMatrix4(rifle.matrixWorld).project(camera),
      r = renderer.domElement.getBoundingClientRect();
    const dx = ((b.x - a.x) * r.width) / 2,
      dy = (-(b.y - a.y) * r.height) / 2,
      len = Math.hypot(dx, dy) || 1;
    drag = {slot, x: e.clientX, y: e.clientY, ux: dx / len, uy: dy / len, perPx: 0.1 / len, start: state.pos[slot]};
    play(() => mech.handle(0.4));
  } else {
    drag = {x: e.clientX, y: e.clientY};
    play(() => mech.handle(0.6));
  }
});
renderer.domElement.addEventListener('pointermove', e => {
  if (!drag) {
    renderer.domElement.style.cursor = slotAt(e) ? 'ew-resize' : 'grab';
    return;
  }
  if (drag.slot) {
    const d = ((e.clientX - drag.x) * drag.ux + (e.clientY - drag.y) * drag.uy) * drag.perPx * (drag.slot === 'stock' ? -1 : 1);
    slideTo(drag.slot, Math.round((drag.start + d) * 100) / 100);
    return;
  }
  const dx = (e.clientX - drag.x) * 0.006,
    dy = (e.clientY - drag.y) * 0.004;
  drag.x = e.clientX;
  drag.y = e.clientY;
  rot.yaw += dx;
  rot.pitch = Math.min(1.3, Math.max(-0.9, rot.pitch + dy));
  rot.vy = dx;
  rot.vp = dy;
  turned += Math.abs(dx) + Math.abs(dy);
  if (turned > 0.55) {
    turned = 0;
    play(() => mech.handle(0.35 + Math.min(0.5, Math.abs(dx) * 6)));
  }
});
const release = () => {
  if (drag && !drag.slot && Math.abs(rot.vy) + Math.abs(rot.vp) < 0.004) play(() => mech.tap());
  drag = null;
};
renderer.domElement.addEventListener('pointerup', release);
renderer.domElement.addEventListener('pointercancel', release);
renderer.domElement.addEventListener(
  'wheel',
  e => {
    e.preventDefault();
    dist = Math.min(3.4, Math.max(0.9, dist * (e.deltaY > 0 ? 1.08 : 0.92)));
  },
  {passive: false},
);
stageEl.addEventListener('keydown', e => {
  const k = {ArrowLeft: [-0.12, 0], ArrowRight: [0.12, 0], ArrowUp: [0, -0.08], ArrowDown: [0, 0.08]}[e.key];
  if (k) {
    rot.ty = rot.tp = rot.tc = null;
    rot.yaw += k[0];
    rot.pitch = Math.min(1.3, Math.max(-0.9, rot.pitch + k[1]));
    play(() => mech.handle(0.3));
  } else if (e.key === '+' || e.key === '=') dist = Math.max(0.9, dist * 0.92);
  else if (e.key === '-') dist = Math.min(3, dist * 1.08);
  else return;
  e.preventDefault();
});

function resize() {
  const w = stageEl.clientWidth,
    h = stageEl.clientHeight;
  camera.aspect = w / h;
  camera.fov = w < h ? 46 : 30;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
new ResizeObserver(resize).observe(stageEl);
resize();
let tris = 0;
rifle.traverse(o => o.isMesh && (tris += o.geometry.attributes.position.count / 3));
stageEl.dataset.triangles = String(Math.round(tris));
status.hidden = true;
panel.sync();

let last = performance.now();
renderer.setAnimationLoop(now => {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (rot.ty !== null) {
    const k = reduce ? 1 : 1 - Math.exp(-dt * 6);
    rot.yaw += (rot.ty - rot.yaw) * k;
    rot.pitch += (rot.tp - rot.pitch) * k;
    rot.cant += (rot.tc - rot.cant) * k;
  } else if (!drag && !reduce) {
    rot.yaw += rot.vy;
    rot.pitch = Math.min(1.3, Math.max(-0.9, rot.pitch + rot.vp));
    rot.vy *= 0.92;
    rot.vp *= 0.92;
  }
  const idle = reduce ? 0 : Math.sin(now / 1900) * 0.012;
  pivot.rotation.set(rot.pitch + idle, rot.yaw + idle * 0.6, 0);
  rifle.rotation.x = rot.cant;
  pivot.position.y = reduce ? 0 : Math.sin(now / 2300) * 0.004;
  camera.position.set(0, 0.2, dist);
  camera.lookAt(0, 0.0, 0);
  renderer.render(scene, camera);
});
