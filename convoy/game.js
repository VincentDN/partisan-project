// Convoy Ambush: renders convoy/sim.js top-down and feeds it the player's input. All rules and AI live in the
// simulation; this file only draws state, callouts and (in AI view) what each soldier believes.
import '../shared/frame.js';
import * as T from 'three';
import {mountTopBar} from '../shared/topbar.js';
import {Sim} from './sim.js';
import {WEAPONS, ROLES} from './weapons.js';
import {COVER, ROAD, BOUNDS} from './world.js';
import {bestBelief} from './ai.js';

mountTopBar({title: 'Convoy Ambush', scene: 'viewer'});

const $ = s => document.querySelector(s);
const stageEl = $('#stage'),
  labelsEl = $('#labels');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- three.js scene ----------
const renderer = new T.WebGLRenderer({antialias: true});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFSoftShadowMap;
stageEl.prepend(renderer.domElement);
const scene = new T.Scene();
scene.background = new T.Color(0x2a3320);
scene.fog = new T.Fog(0x2a3320, 70, 130);
const camera = new T.PerspectiveCamera(36, 1, 0.5, 300);
scene.add(new T.HemisphereLight(0xe4ecd0, 0x2f3622, 1.5));
const sun = new T.DirectionalLight(0xfff0d4, 1.7);
sun.castShadow = true;
sun.shadow.mapSize.setScalar(2048);
Object.assign(sun.shadow.camera, {left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 120});
scene.add(sun, sun.target);

const flat = color => new T.MeshLambertMaterial({color, flatShading: true});
const ground = new T.Mesh(new T.PlaneGeometry(BOUNDS.maxX - BOUNDS.minX + 60, BOUNDS.maxZ - BOUNDS.minZ + 60), flat(0x56643a));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);
const ridge = new T.Mesh(new T.PlaneGeometry(BOUNDS.maxX - BOUNDS.minX + 60, 30), flat(0x4b5733));
ridge.rotation.x = -Math.PI / 2;
ridge.position.set(0, 0.01, -24);
ridge.receiveShadow = true;
scene.add(ridge);
const road = new T.Mesh(new T.PlaneGeometry(BOUNDS.maxX - BOUNDS.minX + 60, ROAD.half * 2), flat(0x6e6553));
road.rotation.x = -Math.PI / 2;
road.position.set(0, 0.02, ROAD.z);
road.receiveShadow = true;
scene.add(road);

const KIND = {rock: 0x7d7a6c, wall: 0x8c846f, wreck: 0x4b4236, barn: 0x7a5a3a, log: 0x6b4a2a};
for (const c of COVER) {
  let mesh;
  if (c.kind === 'rock') {
    mesh = new T.Mesh(new T.IcosahedronGeometry(0.5, 0), flat(KIND.rock));
    mesh.scale.set(c.w * 1.1, c.h * 1.6, c.d * 1.1);
    mesh.position.y = c.h * 0.5;
    mesh.rotation.y = (c.x * 7 + c.z) % 3;
  } else if (c.kind === 'log') {
    mesh = new T.Mesh(new T.CylinderGeometry(c.h / 2, c.h / 2, c.d, 7), flat(KIND.log));
    mesh.rotation.x = Math.PI / 2;
    mesh.position.y = c.h / 2;
  } else {
    mesh = new T.Mesh(new T.BoxGeometry(c.w, c.h, c.d), flat(KIND[c.kind] || KIND.wall));
    mesh.position.y = c.h / 2;
    if (c.kind === 'barn') {
      const roof = new T.Mesh(new T.ConeGeometry(Math.hypot(c.w, c.d) / 2, 1.8, 4), flat(0x4a3a2c));
      roof.rotation.y = Math.PI / 4;
      roof.scale.set((c.w / Math.hypot(c.w, c.d)) * 1.42, 1, (c.d / Math.hypot(c.w, c.d)) * 1.42);
      roof.position.y = c.h / 2 + 0.9;
      mesh.add(roof);
    }
  }
  mesh.position.x = c.x;
  mesh.position.z = c.z;
  mesh.castShadow = mesh.receiveShadow = true;
  scene.add(mesh);
}

const ARMY = 0x6b6e62,
  PARTISAN = 0x4f6236;
function mrapMesh(v, g) {
  // Angular armoured hull with a V-shaped belly, a raised cab and a ring turret with the DShK.
  const hull = new T.Mesh(new T.BoxGeometry(v.w, v.h * 0.5, v.d), flat(0x55594a));
  hull.position.y = v.h * 0.5;
  const belly = new T.Mesh(new T.CylinderGeometry(v.d * 0.5, v.d * 0.5, v.w * 0.92, 3), flat(0x3f4236));
  belly.rotation.set(0, 0, Math.PI / 2);
  belly.rotation.x = Math.PI;
  belly.scale.set(1, 1, 0.5);
  belly.position.y = v.h * 0.22;
  const cab = new T.Mesh(new T.BoxGeometry(v.w * 0.62, v.h * 0.32, v.d * 0.94), flat(0x4b4f42));
  cab.position.set(v.w * 0.12, v.h * 0.9, 0);
  const glass = new T.Mesh(new T.BoxGeometry(0.05, v.h * 0.16, v.d * 0.7), flat(0x1b2226));
  glass.position.set(v.w * 0.43 + 0.02, v.h * 0.92, 0);
  const ring = new T.Mesh(new T.CylinderGeometry(0.62, 0.7, 0.3, 8), flat(0x3a3d33));
  ring.position.set(-0.2, v.h * 1.12, 0);
  const turret = new T.Group();
  turret.position.copy(ring.position);
  turret.position.y += 0.2;
  const shield = new T.Mesh(new T.BoxGeometry(0.12, 0.55, 0.9), flat(0x4b4f42));
  shield.position.set(0.5, 0.25, 0);
  const gun = new T.Mesh(new T.CylinderGeometry(0.06, 0.07, 1.6, 6), flat(0x15161a));
  gun.rotation.z = Math.PI / 2;
  gun.position.set(1.1, 0.22, 0);
  turret.add(shield, gun);
  g.add(hull, belly, cab, glass, ring, turret);
  g.userData.turret = turret;
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const w = new T.Mesh(new T.CylinderGeometry(0.62, 0.62, 0.45, 8), flat(0x1c1d1a));
      w.rotation.x = Math.PI / 2;
      w.position.set(sx * (v.w / 2 - 1.1), 0.62, sz * (v.d / 2));
      g.add(w);
    }
}
function vehicleMesh(v) {
  const g = new T.Group();
  if (v.kind === 'mrap') {
    mrapMesh(v, g);
    g.traverse(o => (o.castShadow = o.receiveShadow = true));
    scene.add(g);
    return g;
  }
  const body = new T.Mesh(new T.BoxGeometry(v.w, v.h * 0.55, v.d), flat(0x5c6150));
  body.position.y = v.h * 0.45;
  const cabW = v.kind === 'truck' ? 2 : v.w * 0.45;
  const cab = new T.Mesh(new T.BoxGeometry(cabW, v.h * 0.4, v.d * 0.92), flat(0x4a4f40));
  cab.position.set(v.w / 2 - cabW / 2 - 0.1, v.h * 0.9, 0);
  g.add(body, cab);
  if (v.kind === 'truck') {
    const tarp = new T.Mesh(new T.BoxGeometry(v.w - 2.3, v.h * 0.55, v.d * 0.96), flat(0x6f6a52));
    tarp.position.set(-1.1, v.h * 0.98, 0);
    g.add(tarp);
  }
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const w = new T.Mesh(new T.CylinderGeometry(0.45, 0.45, 0.35, 8), flat(0x1c1d1a));
      w.rotation.x = Math.PI / 2;
      w.position.set(sx * (v.w / 2 - 0.8), 0.45, sz * (v.d / 2));
      g.add(w);
    }
  g.traverse(o => (o.castShadow = o.receiveShadow = true));
  scene.add(g);
  return g;
}
/** Weapon silhouettes along +x: length and bulk tell them apart from above. */
function weaponMesh(w) {
  const g = new T.Group();
  const dark = flat(0x1e1f1b);
  const add = (len, thick, x) => {
    const m = new T.Mesh(new T.BoxGeometry(len, thick, thick), dark);
    m.position.x = x;
    g.add(m);
    return m;
  };
  if (w === 'ak') add(0.95, 0.09, 0.35);
  else if (w === 'pkm') {
    add(1.15, 0.13, 0.45);
    add(0.18, 0.18, 0.25).position.y = -0.12; // ammo box
  } else if (w === 'svd') {
    add(1.3, 0.08, 0.5);
    add(0.3, 0.1, 0.2).position.y = 0.1; // scope
  } else if (w === 'rpg') {
    const tube = new T.Mesh(new T.CylinderGeometry(0.07, 0.07, 1.1, 6), flat(0x4a5233));
    tube.rotation.z = Math.PI / 2;
    tube.position.x = 0.2;
    const head = new T.Mesh(new T.ConeGeometry(0.11, 0.35, 6), flat(0x3a3f2a));
    head.rotation.z = -Math.PI / 2;
    head.position.x = 0.9;
    g.add(tube, head);
  }
  return g;
}
function unitMesh(u) {
  const g = new T.Group();
  const col = u.side === 'army' ? ARMY : PARTISAN;
  const body = new T.Mesh(new T.CylinderGeometry(0.34, 0.4, 1.15, 7), flat(col));
  body.position.y = 0.6;
  const head = new T.Mesh(new T.IcosahedronGeometry(0.24, 0), flat(u.side === 'army' ? 0x3a3d34 : 0xc89a72));
  head.position.y = 1.36;
  g.add(body, head);
  g.userData.weapons = {};
  for (const w of u.weapons) {
    if (w === 'gp') continue;
    const m = weaponMesh(w);
    m.position.set(0.1, 0.95, 0.18);
    m.visible = w === u.weapon;
    g.add(m);
    g.userData.weapons[w] = m;
  }
  // role silhouettes: an antenna for the radio operator, a beret band for the sergeant, a launcher tube on the grenadier
  if (u.role === 'rto') {
    const pack = new T.Mesh(new T.BoxGeometry(0.3, 0.45, 0.42), flat(0x3d4234));
    pack.position.set(-0.36, 0.85, 0);
    const ant = new T.Mesh(new T.CylinderGeometry(0.015, 0.015, 1.5, 4), flat(0x111111));
    ant.position.set(-0.4, 1.7, 0.12);
    g.add(pack, ant);
  }
  if (u.role === 'leader') {
    const beret = new T.Mesh(new T.CylinderGeometry(0.27, 0.27, 0.08, 8), flat(0x7a2a24));
    beret.position.y = 1.5;
    g.add(beret);
  }
  if (u.role === 'grenadier') {
    const tube = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 0.35, 6), flat(0x2a2b26));
    tube.rotation.z = Math.PI / 2;
    tube.position.set(0.5, 0.86, 0.18);
    g.add(tube);
  }
  if (u.role === 'turret') {
    body.scale.set(0.9, 0.55, 0.9); // only the torso shows above the hatch
    body.position.y = 0.35;
    head.position.y = 0.85;
    for (const m of Object.values(g.userData.weapons)) m.visible = false; // the DShK is on the vehicle
  }
  if (u.id === 'player') {
    const ring = new T.Mesh(new T.RingGeometry(0.55, 0.7, 20), new T.MeshBasicMaterial({color: 0xef8f39}));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.04;
    g.add(ring);
  }
  g.traverse(o => (o.castShadow = true));
  scene.add(g);
  return g;
}

// tracers
const MAX_TRACERS = 120;
const tracerGeo = new T.BufferGeometry();
tracerGeo.setAttribute('position', new T.BufferAttribute(new Float32Array(MAX_TRACERS * 6), 3));
tracerGeo.setAttribute('color', new T.BufferAttribute(new Float32Array(MAX_TRACERS * 6), 3));
const tracers = new T.LineSegments(tracerGeo, new T.LineBasicMaterial({vertexColors: true, transparent: true, opacity: 0.9}));
tracers.frustumCulled = false;
scene.add(tracers);
const TRACER = {
  partisan: new T.Color(0xffe08a),
  army: new T.Color(0xff8a50),
  hmg: new T.Color(0xff5030),
  svd: new T.Color(0xffffff),
  rpg: new T.Color(0xffb040),
  gp: new T.Color(0xc0c0a0),
};

// explosions: a flash and an expanding scorch ring, pooled
const blasts = [...Array(8)].map(() => {
  const flash = new T.Mesh(new T.IcosahedronGeometry(1, 1), new T.MeshBasicMaterial({color: 0xffc070, transparent: true}));
  const ring = new T.Mesh(
    new T.RingGeometry(0.8, 1, 24),
    new T.MeshBasicMaterial({color: 0x2a1e12, transparent: true, side: T.DoubleSide}),
  );
  ring.rotation.x = -Math.PI / 2;
  flash.visible = ring.visible = false;
  scene.add(flash, ring);
  return {flash, ring};
});

// aim marker
const aimRing = new T.Mesh(new T.RingGeometry(0.35, 0.45, 16), new T.MeshBasicMaterial({color: 0xef8f39, transparent: true, opacity: 0.8}));
aimRing.rotation.x = -Math.PI / 2;
aimRing.position.y = 0.05;
scene.add(aimRing);

// AI view: pooled belief rings, belief lines and view fans
const aiGroup = new T.Group();
scene.add(aiGroup);
const circleGeo = new T.BufferGeometry().setFromPoints(
  [...Array(33)].map((_, i) => new T.Vector3(Math.cos((i / 32) * Math.PI * 2), 0, Math.sin((i / 32) * Math.PI * 2))),
);
const rings = [];
const ringAt = i => {
  if (!rings[i]) {
    rings[i] = new T.Line(circleGeo, new T.LineBasicMaterial({color: 0xffb070, transparent: true}));
    aiGroup.add(rings[i]);
  }
  return rings[i];
};
const MAX_AI_LINES = 200;
const aiLineGeo = new T.BufferGeometry();
aiLineGeo.setAttribute('position', new T.BufferAttribute(new Float32Array(MAX_AI_LINES * 6), 3));
const aiLines = new T.LineSegments(aiLineGeo, new T.LineBasicMaterial({color: 0xf2c9a0, transparent: true, opacity: 0.45}));
aiLines.frustumCulled = false;
aiGroup.add(aiLines);

// ---------- game state ----------
let sim,
  units,
  vehicles,
  started,
  aiView = false;
const params = new URLSearchParams(location.search);
function newGame() {
  for (const m of [...(units?.values() || []), ...(vehicles || [])]) scene.remove(m);
  const awareness = Number($('#aware').value) / 100;
  sim = new Sim({seed: Number(params.get('seed')) || Math.floor(Math.random() * 1e6), awareness});
  units = new Map(sim.units.map(u => [u, unitMesh(u)]));
  vehicles = sim.vehicles.map(vehicleMesh);
  updateLabels.last = -1;
  labelsEl.replaceChildren();
  bubbles.clear();
  stateLabels.clear();
  $('#comms').replaceChildren();
  started = false;
  $('#card-title').textContent = 'Convoy ambush';
  $('#card-text').textContent =
    'An army convoy is coming east down the valley road. The log across the road will stop it under your ridge. Wait for it, then open fire. Mila (marksman) and Dragan (machine gun) hold fire until you do. The MRAP’s heavy gun will tear you apart: you carry three RPG rockets for it.';
  $('#start').textContent = 'Start';
  $('#card').hidden = false;
}
function start() {
  started = true;
  $('#card').hidden = true;
  stageEl.focus();
}

// ---------- input ----------
const keys = new Set();
let fire = false,
  reload = false,
  wantWeapon = null;
const aim = new T.Vector3(),
  ray = new T.Raycaster(),
  ndc = new T.Vector2(),
  groundPlane = new T.Plane(new T.Vector3(0, 1, 0), 0);
let hasAim = false;
addEventListener('keydown', e => {
  if (e.target.closest?.('aside, nav')) return;
  const k = e.key.toLowerCase();
  if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift', ' '].includes(k)) e.preventDefault();
  keys.add(k);
  if (k === 'r') reload = true;
  if (['1', '2', '3'].includes(k)) wantWeapon = sim.player.weapons[Number(k) - 1];
  if (k === 'v') toggleAi();
  if (k === 'enter') started && !sim.outcome ? null : sim.outcome ? newGame() : start();
});
addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
addEventListener('blur', () => {
  keys.clear();
  fire = false;
});
renderer.domElement.addEventListener('pointermove', e => {
  const r = renderer.domElement.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  hasAim = true;
});
renderer.domElement.addEventListener('pointerdown', e => {
  if (e.button === 0 && started) fire = true;
});
addEventListener('pointerup', () => (fire = false));
renderer.domElement.addEventListener('contextmenu', e => e.preventDefault());

function input() {
  const has = k => keys.has(k);
  const mx = (has('d') || has('arrowright') ? 1 : 0) - (has('a') || has('arrowleft') ? 1 : 0);
  const mz = (has('s') || has('arrowdown') ? 1 : 0) - (has('w') || has('arrowup') ? 1 : 0);
  if (hasAim) {
    ray.setFromCamera(ndc, camera);
    ray.ray.intersectPlane(groundPlane, aim);
  }
  const i = {mx, mz, sneak: has('shift'), fire, reload, weapon: wantWeapon, ...(hasAim ? {ax: aim.x, az: aim.z} : {})};
  reload = false;
  wantWeapon = null;
  return i;
}

// ---------- panel ----------
$('#start').onclick = () => (sim.outcome ? newGame() : start());
$('#restart').onclick = () => newGame();
function toggleAi(on = !aiView) {
  aiView = on;
  aiGroup.visible = on;
  $('#aiview').setAttribute('aria-pressed', String(on));
  for (const el of stateLabels.values()) el.hidden = !on;
}
$('#aiview').onclick = () => toggleAi();
$('#aware').oninput = e => ($('#aware-out').textContent = `${e.target.value}%`);

// ---------- labels (callout bubbles and AI state) ----------
const bubbles = new Map(),
  stateLabels = new Map();
const v3 = new T.Vector3();
function project(x, y, z) {
  v3.set(x, y, z).project(camera);
  return [(v3.x * 0.5 + 0.5) * stageEl.clientWidth, (-v3.y * 0.5 + 0.5) * stageEl.clientHeight, v3.z < 1];
}
function updateLabels() {
  // new callouts: a bubble over the speaker and a line in the comms log
  const fresh = sim.callouts.filter(c => c.t > (updateLabels.last ?? -1));
  updateLabels.last = sim.callouts.at(-1)?.t ?? updateLabels.last;
  for (const c of fresh) {
    let el = bubbles.get(c.id);
    if (!el) {
      el = document.createElement('div');
      labelsEl.append(el);
      bubbles.set(c.id, el);
    }
    el.className = `bubble ${c.side}`;
    el.textContent = c.text;
    el.dataset.until = String(sim.time + 2.2);
    el.style.opacity = '1';
    const li = document.createElement('li');
    li.className = c.side;
    li.innerHTML = `<b></b> `;
    li.querySelector('b').textContent = c.name + ':';
    li.append(c.text);
    $('#comms').prepend(li);
    while ($('#comms').children.length > 14) $('#comms').lastChild.remove();
  }
  for (const [id, el] of bubbles) {
    const u = sim.units.find(x => x.id === id);
    const [x, y, ok] = project(u.x, 2.1, u.z);
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.opacity = sim.time < Number(el.dataset.until) && ok ? '1' : '0';
  }
  if (!aiView) return;
  for (const u of sim.units) {
    if (u.side !== 'army') continue;
    let el = stateLabels.get(u.id);
    if (!el) {
      el = document.createElement('div');
      el.className = 'state';
      labelsEl.append(el);
      stateLabels.set(u.id, el);
    }
    const show = u.alive && !u.escaped && u.state !== 'mounted';
    el.hidden = !show;
    if (!show) continue;
    const [x, y] = project(u.x, u.state === 'turret' ? 3.4 : 0, u.z);
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.textContent = `${ROLES[u.role]?.short || ''} · ${u.state}${u.supp > 0.3 ? ` · supp ${Math.round(u.supp * 100)}%` : ''}`;
  }
}

function updateAi() {
  if (!aiView) return;
  let r = 0,
    l = 0;
  const pos = aiLineGeo.attributes.position.array;
  const seg = (x0, z0, x1, z1) => {
    if (l >= MAX_AI_LINES) return;
    pos.set([x0, 0.12, z0, x1, 0.12, z1], l * 6);
    l++;
  };
  for (const u of sim.units) {
    if (u.side !== 'army' || !u.alive || u.escaped || u.state === 'mounted') continue;
    for (const b of u.beliefs) {
      const ring = ringAt(r++);
      ring.visible = true;
      ring.position.set(b.x, 0.1, b.z);
      ring.scale.setScalar(Math.max(0.5, b.err));
      ring.material.opacity = 0.15 + b.conf * 0.85;
      ring.material.color.set(b.src === 'seen' ? 0xff7a4a : b.src === 'heard' ? 0xffc070 : 0xf2e2a0);
    }
    const best = bestBelief(u);
    if (best) seg(u.x, u.z, best.x, best.z);
    // view fan: two edges of the cone (all-round once the ambush is sprung)
    const range = 42,
      half = sim.alarm ? Math.PI : 1.25;
    if (half < Math.PI)
      for (const s of [-1, 1]) seg(u.x, u.z, u.x + Math.cos(u.facing + s * half) * range, u.z + Math.sin(u.facing + s * half) * range);
  }
  for (let i = r; i < rings.length; i++) rings[i].visible = false;
  aiLineGeo.setDrawRange(0, l * 2);
  aiLineGeo.attributes.position.needsUpdate = true;
}

function updateHud() {
  const p = sim.player,
    s = sim.stats();
  const status = sim.outcome
    ? sim.outcome === 'won'
      ? 'Ambush successful'
      : 'You were killed'
    : !sim.alarm
      ? 'Waiting for the convoy'
      : 'Contact';
  $('#hud').innerHTML =
    `<b>${status}</b><br>Health ${Math.max(0, p.hp)}<br>` +
    p.weapons
      .map((w, i) => {
        const W = WEAPONS[w],
          ammo = p.reload > 0 && p.reloading === w ? 'reloading' : `${p.mags[w]}${p.reserve[w] === Infinity ? '' : ` +${p.reserve[w]}`}`;
        return `${w === p.weapon ? '<b>▸' : '&nbsp;'} ${i + 1} ${W.label} ${ammo}${w === p.weapon ? '</b>' : ''}`;
      })
      .join('<br>') +
    `<br>Army: ${s.armyAlive} up · ${s.armyDown} down · ${s.escaped} fled · ${s.vehiclesDestroyed} vehicles burning<br>Partisans up: ${s.partisansAlive}/3 · ${Math.floor(sim.time)} s`;
}

// ---------- frame ----------
function draw() {
  for (const [u, g] of units) {
    g.visible = !u.escaped && u.state !== 'mounted';
    g.position.set(u.x, u.state === 'turret' || (u.role === 'turret' && !u.alive) ? u.vehicle.h * 1.2 : 0, u.z);
    if (u.role !== 'turret') for (const [w, m] of Object.entries(g.userData.weapons)) m.visible = w === u.weapon;
    g.rotation.y = -u.facing;
    if (!u.alive && !g.userData.down) {
      g.userData.down = true;
      g.rotation.z = Math.PI / 2;
      g.position.y = 0.35;
      g.traverse(o => o.material?.color?.multiplyScalar?.(0.55));
    }
    if (!u.alive && u.role !== 'turret') g.position.y = 0.35;
  }
  sim.vehicles.forEach((v, i) => {
    const g = vehicles[i];
    g.position.set(v.x, 0, v.z);
    const gunner = v.crew.find(c => c.role === 'turret');
    if (g.userData.turret && gunner?.alive) g.userData.turret.rotation.y = -gunner.facing;
    if (v.destroyed && !g.userData.burnt) {
      g.userData.burnt = true;
      g.traverse(o => o.material && (o.material = o.material.clone()) && o.material.color.multiplyScalar(0.3));
      g.rotation.z = 0.05;
      g.rotation.x = 0.06;
    }
  });
  // explosions: 0.6 s each
  const live = sim.explosions.filter(e => sim.time - e.t < 0.6);
  blasts.forEach((b, i) => {
    const e = live[i];
    b.flash.visible = b.ring.visible = !!e;
    if (!e) return;
    const k = (sim.time - e.t) / 0.6;
    b.flash.position.set(e.x, 1, e.z);
    b.flash.scale.setScalar(e.r * (0.4 + k * 0.6));
    b.flash.material.opacity = 1 - k;
    b.ring.position.set(e.x, 0.06, e.z);
    b.ring.scale.setScalar(e.r * (0.5 + k));
    b.ring.material.opacity = 0.7 * (1 - k);
  });
  // tracers: the last 70 ms of shots
  const pos = tracerGeo.attributes.position.array,
    col = tracerGeo.attributes.color.array;
  let n = 0;
  for (const t of sim.tracers) {
    if (sim.time - t.t > 0.07 || n >= MAX_TRACERS) continue;
    pos.set([t.x0, 1, t.z0, t.x1, 1, t.z1], n * 6);
    const c = TRACER[t.weapon] || TRACER[t.side];
    col.set([c.r, c.g, c.b, c.r, c.g, c.b], n * 6);
    n++;
  }
  tracerGeo.setDrawRange(0, n * 2);
  tracerGeo.attributes.position.needsUpdate = tracerGeo.attributes.color.needsUpdate = true;
  // camera follows the player, looking down at an angle
  const p = sim.player;
  const tx = Math.max(BOUNDS.minX + 12, Math.min(BOUNDS.maxX - 12, p.x)),
    tz = Math.max(BOUNDS.minZ + 6, Math.min(BOUNDS.maxZ - 6, p.z + 12)); // look a little south of you, toward the road
  const k = reduceMotion ? 1 : 0.08;
  camera.position.lerp(v3.set(tx, 44, tz + 24), k);
  camera.lookAt(camera.position.x, 0, camera.position.z - 24);
  sun.position.set(camera.position.x - 20, 50, camera.position.z - 30);
  sun.target.position.set(camera.position.x, 0, camera.position.z - 24);
  aimRing.visible = hasAim && p.alive && started;
  aimRing.position.set(aim.x, 0.05, aim.z);
  updateAi();
  updateLabels();
  updateHud();
}

function resize() {
  const w = stageEl.clientWidth,
    h = stageEl.clientHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
new ResizeObserver(resize).observe(stageEl);

let acc = 0,
  last = performance.now();
const STEP = 1 / 60;
renderer.setAnimationLoop(() => {
  const now = performance.now();
  acc = Math.min(acc + (now - last) / 1000, 0.25);
  last = now;
  if (started && !document.hidden)
    while (acc >= STEP) {
      sim.step(STEP, input());
      acc -= STEP;
    }
  else acc = 0;
  if (sim.outcome && $('#card').hidden) {
    $('#card-title').textContent = sim.outcome === 'won' ? 'Ambush successful' : 'You were killed';
    const s = sim.stats();
    $('#card-text').textContent =
      `${s.armyDown} soldiers down, ${s.escaped} fled, ${s.partisansAlive}/3 partisans standing, in ${Math.floor(sim.time)} seconds.`;
    $('#start').textContent = 'Play again';
    $('#card').hidden = false;
  }
  draw();
  renderer.render(scene, camera);
});

newGame();
resize();
toggleAi(params.has('ai'));
// Test hook: lets browser tests drive the game.
window.PARP_CONVOY = {
  get sim() {
    return sim;
  },
  start,
  newGame,
  toggleAi,
  ready: true,
};
