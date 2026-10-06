// Overworld map test: a Bannerlord-style campaign map of the island. A 3-D world map (map/terrain.js, water.js,
// props.js) with the player's party, Invader patrols and convoys (parties.js), towns named on the map, the provinces in
// their owners' colours, and the campaign HUD: time controls, the party panel, the menu bar and a province card.
// Click land to march the band there (map/travel.js, WP-W3); with ?campaign its position is kept in the campaign save.
// The other parties, the menus and the clock are still placeholders.
import * as T from 'three';
import {mountTopBar} from '../shared/topbar.js';
import {bakeHeights, sample, SETTLEMENTS, FACTIONS, provinceAt} from './island.js';
import {buildTerrain} from './terrain.js';
import {buildWater} from './water.js';
import {buildProps} from './props.js';
import {buildParties} from './parties.js';
import {mountTravel} from './travel.js';
import {mountCampaign} from './campaign-ui.js';

mountTopBar({title: 'Overworld map', scene: 'viewer', overlay: true});
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = s => document.querySelector(s);
const stageEl = $('#stage'),
  labels = $('#labels');

// ---------- renderer, scene, light ----------
const renderer = new T.WebGLRenderer({antialias: true});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFSoftShadowMap;
stageEl.prepend(renderer.domElement);
const scene = new T.Scene();
const HAZE = new T.Color('#b9cfe2');
scene.background = HAZE;
scene.fog = new T.Fog(HAZE, 300, 1400);
const camera = new T.PerspectiveCamera(40, 1, 1, 4000);

const sunDir = new T.Vector3(0.55, 0.75, 0.35).normalize();
const sun = new T.DirectionalLight('#fff1d8', 2.7);
sun.castShadow = true;
sun.shadow.mapSize.setScalar(2048);
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.4;
scene.add(sun, sun.target, new T.HemisphereLight('#bcd6f0', '#6b5a3e', 1.1));

// ---------- the world ----------
const field = bakeHeights();
const terrain = buildTerrain(field, {anisotropy: renderer.capabilities.getMaxAnisotropy()});
const water = buildWater(field, sunDir);
const props = buildProps(field);
scene.add(terrain.mesh, water.mesh, props.group);

// town names on the map, Bannerlord-style banners
const townLabels = SETTLEMENTS.map(s => {
  const el = document.createElement('div');
  el.className = `plate-town ${s.faction} ${s.kind}`;
  el.innerHTML = `<span class="shield" style="--c:${FACTIONS[s.faction].banner}">${FACTIONS[s.faction].emblem}</span><span class="tname"></span>`;
  el.querySelector('.tname').textContent = s.name;
  labels.append(el);
  return {s, el, p: new T.Vector3(s.x, sample(field, s.x, s.z) + (s.kind === 'town' ? 9 : 6), s.z)};
});

// ---------- camera: Bannerlord's campaign camera (tilts toward the horizon as it comes down) ----------
// it opens behind the player's party, looking east past it to the raiders on the ridge and Fort Orion beyond
const cam = {x: -128, z: 38, d: 70, yaw: -1.3, tx: -128, tz: 38, td: 70, tyaw: -1.3}; // opens on the player's party
function placeCamera(dt) {
  const k = reduceMotion ? 1 : 1 - Math.exp(-dt * 8);
  cam.x += (cam.tx - cam.x) * k;
  cam.z += (cam.tz - cam.z) * k;
  cam.d += (cam.td - cam.d) * k;
  cam.yaw += (cam.tyaw - cam.yaw) * k;
  const pitch = T.MathUtils.lerp(0.42, 1.22, T.MathUtils.smoothstep(cam.d, 30, 520)); // radians above the horizon: low and long up close
  const gy = Math.max(0, sample(field, cam.x, cam.z));
  camera.position.set(
    cam.x + Math.sin(cam.yaw) * Math.cos(pitch) * cam.d,
    gy + Math.sin(pitch) * cam.d,
    cam.z + Math.cos(cam.yaw) * Math.cos(pitch) * cam.d,
  );
  camera.lookAt(cam.x, gy, cam.z);
  // haze and the political colours deepen as the camera climbs; the sun's shadows follow what is in view
  scene.fog.near = cam.d * 1.6;
  scene.fog.far = cam.d * 6 + 500;
  terrain.uniforms.uPolitical.value = T.MathUtils.smoothstep(cam.d, 90, 380);
  const span = Math.min(260, cam.d * 1.3);
  sun.target.position.set(cam.x, gy, cam.z);
  sun.position.copy(sun.target.position).addScaledVector(sunDir, 400);
  Object.assign(sun.shadow.camera, {left: -span, right: span, top: span, bottom: -span, near: 100, far: 800});
  sun.shadow.camera.updateProjectionMatrix();
}
const pan = (dx, dz) => {
  const c = Math.cos(cam.tyaw),
    s = Math.sin(cam.tyaw);
  cam.tx = T.MathUtils.clamp(cam.tx + dx * c + dz * s, -520, 520);
  cam.tz = T.MathUtils.clamp(cam.tz - dx * s + dz * c, -400, 400);
};
let drag = null;
stageEl.addEventListener('pointerdown', e => {
  drag = {x: e.clientX, y: e.clientY, button: e.button};
  stageEl.setPointerCapture(e.pointerId);
});
stageEl.addEventListener('pointermove', e => {
  hover(e);
  if (!drag) return;
  const dx = e.clientX - drag.x,
    dy = e.clientY - drag.y;
  drag.x = e.clientX;
  drag.y = e.clientY;
  if (drag.button === 2 || e.shiftKey) cam.tyaw -= dx * 0.005;
  else pan((-dx * cam.d) / 700, (-dy * cam.d) / 700);
});
stageEl.addEventListener('pointerup', () => (drag = null));
stageEl.addEventListener('contextmenu', e => e.preventDefault());
stageEl.addEventListener(
  'wheel',
  e => {
    e.preventDefault();
    cam.td = T.MathUtils.clamp(cam.td * Math.exp(e.deltaY * 0.0012), 28, 560);
  },
  {passive: false},
);
const keys = new Set();
addEventListener('keydown', e => {
  if (e.target.closest?.('input, select, textarea')) return;
  keys.add(e.key.toLowerCase());
  if (e.key === ' ') {
    e.preventDefault();
    setSpeed(speed ? 0 : 1);
  }
  if (e.key === '+' || e.key === '=') cam.td = Math.max(28, cam.td * 0.85);
  if (e.key === '-') cam.td = Math.min(560, cam.td * 1.18);
});
addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
function keyPan(dt) {
  const v = cam.d * dt * 0.9;
  if (keys.has('w') || keys.has('arrowup')) pan(0, -v);
  if (keys.has('s') || keys.has('arrowdown')) pan(0, v);
  if (keys.has('a') || keys.has('arrowleft')) pan(-v, 0);
  if (keys.has('d') || keys.has('arrowright')) pan(v, 0);
  if (keys.has('q')) cam.tyaw += dt * 1.2;
  if (keys.has('e')) cam.tyaw -= dt * 1.2;
}

// ---------- the province card: whatever is under the cursor ----------
const ray = new T.Raycaster(),
  mouse = new T.Vector2();
let hoverAt = 0;
function hover(e) {
  if (performance.now() - hoverAt < 80) return;
  hoverAt = performance.now();
  const r = stageEl.getBoundingClientRect();
  mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(mouse, camera);
  const hit = ray.intersectObject(terrain.mesh, false)[0];
  const card = $('#province');
  if (!hit || hit.point.y < 0.2) return void (card.hidden = true);
  const s = provinceAt(hit.point.x, hit.point.z),
    f = FACTIONS[s.faction];
  card.hidden = false;
  card.style.setProperty('--c', f.color);
  $('#prov-name').textContent = `${s.name} province`;
  $('#prov-owner').textContent = f.name;
  $('#prov-rows').innerHTML = [
    ['Seat', `${s.name} (${s.kind})`],
    ['Prosperity', s.prosperity],
    ['Garrison', s.garrison],
    ['Militia', s.militia],
    ['Terrain', hit.point.y > 56 ? 'Snowfield' : hit.point.y > 32 ? 'Mountain' : hit.point.y < 3 ? 'Coast' : 'Hills and scrub'],
  ]
    .map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`)
    .join('');
}

// ---------- time ----------
let speed = 1;
const day = {n: 14, season: 'Spring', year: 3, hours: 9};
function setSpeed(s) {
  speed = s;
  for (const b of document.querySelectorAll('[data-speed]')) b.setAttribute('aria-pressed', String(Number(b.dataset.speed) === s));
}
for (const b of document.querySelectorAll('[data-speed]')) b.onclick = () => setSpeed(Number(b.dataset.speed));
setSpeed(1);
function toast(text, ms = 3200) {
  const t = $('#toast');
  t.textContent = text;
  t.hidden = false;
  clearTimeout(t._h);
  t._h = setTimeout(() => (t.hidden = true), ms);
}
for (const b of document.querySelectorAll('.menu-bar button'))
  b.onclick = () => toast(`${b.dataset.label}: placeholder, not built yet.`, 1800);

// ---------- loop ----------
const resize = () => {
  const w = stageEl.clientWidth,
    h = stageEl.clientHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
};
new ResizeObserver(resize).observe(stageEl);
resize();

const parties = await buildParties(field, props.roads, labels);
scene.add(parties.group);
const travel = mountTravel({
  scene,
  camera,
  field,
  terrain,
  stageEl,
  hero: parties.hero,
  cam,
  toast,
  reduceMotion,
  params: new URLSearchParams(location.search),
});
const campaignUi = mountCampaign({travel, parties, townLabels, setSpeed, toast});
$('#loading').hidden = true;

const clock = new T.Clock();
let worldT = 0;
const v = new T.Vector3();
renderer.setAnimationLoop(() => {
  const real = Math.min(clock.getDelta(), 0.1);
  const dt = real * (reduceMotion ? Math.min(speed, 1) : speed); // the world runs at the chosen speed; the camera never pauses
  worldT += dt;
  keyPan(real);
  placeCamera(real);
  camera.updateMatrixWorld(); // labels below project with this frame's camera, not the last one's
  terrain.uniforms.uTime.value = worldT;
  water.uniforms.uTime.value = worldT;
  props.update(dt, worldT, camera);
  travel.update(dt);
  campaignUi?.update(dt);
  const w = stageEl.clientWidth,
    h = stageEl.clientHeight;
  parties.update(dt, worldT, camera, w, h);
  for (const l of townLabels) {
    v.copy(l.p).project(camera);
    const on = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
    l.el.style.display = on ? '' : 'none';
    if (on) l.el.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px) translate(-50%, -100%)`;
  }
  // the clock: a day passes every 40 s at normal speed
  day.hours += dt * 0.6;
  if (day.hours >= 24) {
    day.hours -= 24;
    day.n++;
  }
  $('#date').textContent = campaignUi
    ? campaignUi.clockText()
    : `${day.season} ${day.n}, Year ${day.year} of the Occupation · ${String(Math.floor(day.hours)).padStart(2, '0')}:00`;
  renderer.render(scene, camera);
});

window.PARP_MAP = {
  scene,
  camera,
  cam,
  parties,
  props,
  terrain,
  field,
  townLabels,
  renderer,
  setSpeed,
  travel,
  campaign: campaignUi,
  ready: true,
};
