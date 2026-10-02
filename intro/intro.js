// The opening scene, restored from the earlier workbench: an over-the-shoulder shot of a partisan's bench, the rifle
// from your saved build lying flat under the work lamp, an old radio tuning in at the back of the table. The buttons
// at the bottom left lead on to the Workbench (with a push-in on the rifle), the index and the design document.
import * as T from 'three';
import {mountTopBar} from '../shared/topbar.js';
import {soundLayer} from '../shared/sound-layer.js';
import {buildBenchScene, TABLE} from '../shared/bench-scene.js';
import {loadRifle} from '../workbench/rifle-instance.js';
import {applyLoadout, installCamo, savedLoadout} from '../workbench/apply-loadout.js';
import {DEFAULT_OPERATOR, buildOperator} from '../shared/legacy-operator/operator.js';
import {solveArm} from '../shared/legacy-operator/field.js';
import * as mech from '../workbench/mech.js';

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const small = matchMedia('(max-width: 780px), (pointer: coarse)').matches;
const RIFLE_AT = new T.Vector3(0.04, 0, 0.47); // x/z on the table; y comes from the rifle's own thickness
// Camera behind and above the right shoulder, looking down at the rifle.
const SHOT = {position: new T.Vector3(-0.56, 1.86, 0), target: new T.Vector3(-0.06, 0.84, 0.42)};
const PUSH_IN = {duration: 1.9, fadeAt: 0.75}; // seconds; the fade starts at this fraction of the push

mountTopBar({title: 'The workbench', scene: 'bench', current: 'intro', overlay: true});
const sound = soundLayer();

const $ = s => document.querySelector(s);
const stageEl = $('#stage'),
  status = $('#status'),
  start = $('#start'),
  fade = $('#fade');
const renderer = new T.WebGLRenderer({antialias: true});
renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.5 : 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = small ? T.PCFShadowMap : T.PCFSoftShadowMap;
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
stageEl.append(renderer.domElement);
const scene = new T.Scene();
const camera = new T.PerspectiveCamera(42, 1, 0.05, 20);
camera.position.copy(SHOT.position);
camera.lookAt(SHOT.target);
const room = buildBenchScene(scene, {small});

// The partisan, leaning over the bench (the earlier workbench's code-built operator, restored).
const op = buildOperator({...DEFAULT_OPERATOR, headgear: 'none', gloves: 'none', pack: 'none'});
op.root.traverse(m => {
  if (m.isMesh) m.castShadow = m.receiveShadow = true;
});
scene.add(op.root);
const LEAN = {hips: 0.1, spine: 0.16, chest: 0.18, neck: 0.08, head: 0.42};
function pose(time) {
  const breath = reduceMotion ? 0 : Math.sin(time * 1.4) * 0.012;
  for (const [joint, x] of Object.entries(LEAN)) op.joints[joint].rotation.x = x + (joint === 'chest' ? breath : 0);
  op.joints.head.rotation.y = -0.1 + look.x * 0.12;
  for (const side of ['R', 'L']) {
    op.joints['upperLeg' + side].rotation.x = -0.08;
    op.joints['lowerLeg' + side].rotation.x = 0.14;
  }
  op.root.updateMatrixWorld(true);
}

// The rifle lies flat on its side; yaw and tilt live on the outer group.
const rifleGroup = new T.Group();
scene.add(rifleGroup);
let rifleHalf = 0,
  rifleLength = 0;
async function loadModel() {
  const rifle = await loadRifle(savedLoadout().rifle, {decorate: m => installCamo(m, wear)});
  applyLoadout(rifle, savedLoadout(), wear);
  const model = rifle.model;
  model.rotation.x = Math.PI / 2; // top of the rifle points away from the operator, right side up
  model.updateMatrixWorld(true);
  const box = new T.Box3().setFromObject(model),
    size = box.getSize(new T.Vector3());
  model.position.sub(box.getCenter(new T.Vector3()));
  rifleHalf = size.y / 2;
  rifleLength = size.x;
  rifleGroup.add(model);
}
const wear = {value: 0};

// ---------- Look (mouse, touch, gamepad) and the push-in ----------
const look = {x: 0, y: 0},
  want = {x: 0, y: 0};
addEventListener('pointermove', e => {
  want.x = (e.clientX / innerWidth) * 2 - 1;
  want.y = (e.clientY / innerHeight) * 2 - 1;
});
function pollPad() {
  for (const pad of navigator.getGamepads?.() || []) {
    if (!pad) continue;
    const [x, y] = pad.axes;
    if (Math.hypot(x, y) > 0.15) {
      want.x = x;
      want.y = y;
    }
    if (pad.buttons[0]?.pressed || pad.buttons[9]?.pressed) begin();
  }
}
// Palm targets along the rifle: grip (right hand) and handguard (left hand), just above the top face.
const HOLD = {R: {along: -0.2, pole: new T.Vector3(-1, -0.2, -0.5)}, L: {along: 0.2, pole: new T.Vector3(1, -0.4, -0.4)}};
function placeRifle() {
  const tilt = look.y * 0.07; // lift the far edge a touch, as if checking the ejection port
  rifleGroup.position.set(RIFLE_AT.x, TABLE.top + rifleHalf + Math.abs(tilt) * rifleHalf, RIFLE_AT.z);
  rifleGroup.rotation.set(tilt, -0.22 + look.x * 0.08, 0, 'YXZ');
  rifleGroup.updateMatrixWorld(true);
  for (const [side, h] of Object.entries(HOLD)) {
    const target = new T.Vector3(h.along * rifleLength, rifleHalf + 0.035, -0.015).applyMatrix4(rifleGroup.matrixWorld);
    solveArm(op, side, target, h.pole);
  }
}

let push = null;
const currentTarget = SHOT.target.clone();
const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
let destination = null;
function begin() {
  if (push || start.getAttribute('aria-disabled') === 'true') return;
  start.setAttribute('aria-disabled', 'true');
  document.body.classList.add('leaving');
  mech.charge(); // picks it up and racks it before going in
  destination = start.href + location.hash;
  const focus = rifleGroup.getWorldPosition(new T.Vector3());
  push = {
    start: performance.now() / 1000,
    from: camera.position.clone(),
    fromTarget: currentTarget.clone(),
    to: focus.clone().add(new T.Vector3(-0.08, 0.3, -0.16)),
    toTarget: focus,
    faded: false,
  };
  if (reduceMotion) push.start -= PUSH_IN.duration * PUSH_IN.fadeAt;
}
start.addEventListener('click', e => {
  e.preventDefault();
  begin();
});
addEventListener('keydown', e => {
  if (e.target.matches?.('a,button,input,select,textarea') && e.key !== 'e' && e.key !== 'E') return;
  if (e.key === 'e' || e.key === 'E' || e.key === 'Enter') begin();
});

function resize() {
  const w = stageEl.clientWidth,
    h = stageEl.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = w / h < 1 ? 60 : 42;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

const clock = new T.Clock();
const radioAt = new T.Vector3();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05),
    time = clock.elapsedTime;
  pollPad();
  const k = 1 - Math.exp(-dt * (push ? 1.5 : 4));
  look.x += (want.x - look.x) * k;
  look.y += (want.y - look.y) * k;
  pose(time);
  placeRifle();
  room.drapeFlag(time);
  room.radio.userData.dial.material.emissiveIntensity = 1.3 + Math.random() * 0.15; // valve glow flicker
  if (sound.bench) sound.bench.setPan(room.radio.getWorldPosition(radioAt).project(camera).x * 0.8);
  if (push) {
    // Wall-clock time, so a slow device still hands over on schedule.
    const t = performance.now() / 1000 - push.start,
      u = Math.min(t / PUSH_IN.duration, 1),
      e = ease(u);
    camera.position.lerpVectors(push.from, push.to, e);
    currentTarget.lerpVectors(push.fromTarget, push.toTarget, e);
    if (u >= PUSH_IN.fadeAt && !push.faded) {
      push.faded = true;
      fade.classList.remove('clear');
    }
    if (t >= PUSH_IN.duration + 0.5) {
      location.href = destination; // fully black: stop rendering so the main thread is free for the navigation
      return;
    }
  } else {
    const sway = reduceMotion ? 0 : Math.sin(time * 0.6) * 0.006;
    camera.position.set(SHOT.position.x + look.x * 0.05, SHOT.position.y - look.y * 0.03 + sway, SHOT.position.z);
    currentTarget.set(SHOT.target.x + look.x * 0.1, SHOT.target.y - look.y * 0.06, SHOT.target.z);
  }
  camera.lookAt(currentTarget);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
// Coming back with the browser's back button restores this page from cache: reset the shot.
addEventListener('pageshow', e => {
  if (e.persisted) {
    push = null;
    start.removeAttribute('aria-disabled');
    document.body.classList.remove('leaving');
    fade.classList.add('clear');
    clock.getDelta();
    requestAnimationFrame(frame);
  }
});

window.PARP_INTRO = {
  ready: false,
  get push() {
    return push;
  },
  scene,
  camera,
  renderer,
  room,
  op,
};
loadModel()
  .then(() => {
    status.hidden = true;
    start.removeAttribute('aria-disabled');
    start.focus({preventScroll: true});
    requestAnimationFrame(frame);
    requestAnimationFrame(() => fade.classList.add('clear'));
    window.PARP_INTRO.ready = true;
  })
  .catch(err => {
    console.error(err);
    status.textContent = 'Could not load the rifle: ' + err.message;
    fade.classList.add('clear');
    start.removeAttribute('aria-disabled');
  });
