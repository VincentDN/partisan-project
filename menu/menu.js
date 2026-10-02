// The index: the Nokia screen, lying on the workbench table. A close-up looks down at the phone, which is turned a
// little; the LCD stays real HTML (links, keys, focus) and is laid exactly over the phone's screen with a
// projective transform, recomputed whenever the camera moves.
import * as T from 'three';
import {mountTopBar} from '../shared/topbar.js';
import {buildBenchScene, TABLE} from '../shared/bench-scene.js';
import {quadTransform} from '../shared/homography.js';

mountTopBar({title: 'Index', scene: 'bench', current: 'index'});

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const small = matchMedia('(max-width: 780px), (pointer: coarse)').matches;
const stageEl = document.querySelector('#stage'),
  frame = document.querySelector('#lcd-frame');
const LCD = {w: 360, h: 300}; // CSS px of the flat screen
// Phone, metres, drawn oversized so the screen reads; local +x right, +y towards the top of the phone, +z out of the face.
const PHONE = {w: 0.27, l: 0.6, t: 0.05, screen: {w: 0.2, h: 0.1667, y: 0.17}};
const YAW = -0.2; // radians: turned a little on the table

try {
  const renderer = new T.WebGLRenderer({antialias: true});
  renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.5 : 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = small ? T.PCFShadowMap : T.PCFSoftShadowMap;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  stageEl.append(renderer.domElement);
  const scene = new T.Scene();
  const room = buildBenchScene(scene, {small});
  room.lamp.position.set(0.3, 1.5, 0.6);
  room.lamp.intensity = 7; // the phone is much nearer the lamp than the rifle is
  room.lamp.target.position.set(0.1, TABLE.top, 0.62);

  // ---------- The phone ----------
  const mat = (color, rough = 0.55, extra = {}) => new T.MeshStandardMaterial({color, roughness: rough, ...extra});
  const phone = new T.Group();
  const roundedRect = (w, h, r) => {
    const s = new T.Shape();
    s.moveTo(-w / 2 + r, -h / 2);
    s.lineTo(w / 2 - r, -h / 2);
    s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    s.lineTo(w / 2, h / 2 - r);
    s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    s.lineTo(-w / 2 + r, h / 2);
    s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    s.lineTo(-w / 2, -h / 2 + r);
    s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    return s;
  };
  const body = new T.Mesh(
    new T.ExtrudeGeometry(roundedRect(PHONE.w, PHONE.l, 0.07), {
      depth: PHONE.t,
      bevelEnabled: true,
      bevelThickness: 0.008,
      bevelSize: 0.008,
      bevelSegments: 3,
      curveSegments: 10,
    }),
    mat(0x1f251c, 0.5),
  );
  body.castShadow = body.receiveShadow = true;
  phone.add(body);
  const top = PHONE.t + 0.008; // face height
  const add = (geo, material, x, y, z, parent = phone) => {
    const m = new T.Mesh(geo, material);
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const sc = PHONE.screen;
  add(new T.PlaneGeometry(sc.w + 0.04, sc.h + 0.04), mat(0x0c100a, 0.3), 0, sc.y, top + 0.001); // bezel
  const lcd = add(new T.PlaneGeometry(sc.w, sc.h), new T.MeshBasicMaterial({color: 0x9fb184}), 0, sc.y, top + 0.002); // under the HTML screen
  lcd.castShadow = false;
  // Earpiece slot, navigation ring, soft keys and number keys: decoration (the real keys are on the LCD and the keyboard).
  add(new T.BoxGeometry(0.06, 0.008, 0.004), mat(0x0a0c09), 0, sc.y + sc.h / 2 + 0.05, top + 0.001);
  const key = mat(0x3a4234, 0.45);
  add(new T.CylinderGeometry(0.055, 0.055, 0.012, 24).rotateX(Math.PI / 2), mat(0x2b3126, 0.4), 0, -0.04, top + 0.006);
  for (const x of [-0.085, 0.085]) add(new T.CylinderGeometry(0.03, 0.03, 0.01, 18).rotateX(Math.PI / 2), key, x, -0.025, top + 0.005);
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 3; c++) add(new T.BoxGeometry(0.062, 0.034, 0.012), key, (c - 1) * 0.07, -0.13 - r * 0.045, top + 0.006);
  phone.position.set(0, 0, 0);
  const holder = new T.Group();
  holder.add(phone);
  holder.rotation.order = 'YXZ';
  holder.rotation.set(-Math.PI / 2, Math.PI + YAW, 0); // lying face up, top of the phone away from the camera
  holder.position.set(0.1, TABLE.top + 0.001, 0.62);
  scene.add(holder);

  // ---------- Camera ----------
  const camera = new T.PerspectiveCamera(40, 1, 0.02, 10);
  const centre = new T.Vector3();
  const quad = [
    [-sc.w / 2, sc.y + sc.h / 2],
    [sc.w / 2, sc.y + sc.h / 2],
    [sc.w / 2, sc.y - sc.h / 2],
    [-sc.w / 2, sc.y - sc.h / 2],
  ].map(([x, y]) => new T.Vector3(x, y, top + 0.002));
  const look = {x: 0, y: 0, tx: 0, ty: 0};
  const tmp = new T.Vector3();
  function aim() {
    const w = stageEl.clientWidth,
      h = stageEl.clientHeight,
      aspect = w / h,
      portrait = aspect < 1;
    holder.rotation.y = Math.PI + (portrait ? YAW / 2 : YAW); // a phone-shaped view needs the phone straighter
    holder.updateMatrixWorld(true);
    centre.set(0, sc.y, top).applyMatrix4(holder.matrixWorld);
    // Frame the screen with some phone around it: about 62% of the height on a landscape view, 84% of the width on a portrait one.
    const visibleH = Math.max(sc.h / 0.8, sc.w / 0.9 / aspect);
    const dist = 0.28;
    camera.fov = (2 * Math.atan(visibleH / 2 / dist) * 180) / Math.PI;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    // From the operator's side and above, tilted ~28 degrees off straight down, with a touch of parallax.
    const tilt = portrait ? 0.12 : 0.49;
    camera.position.set(centre.x + look.x * 0.012, centre.y + dist * Math.cos(tilt), centre.z - dist * Math.sin(tilt) + look.y * 0.008);
    camera.lookAt(centre);
    camera.updateMatrixWorld(true);
    const px = quad.map(p => {
      tmp.copy(p).applyMatrix4(holder.matrixWorld).project(camera);
      return [((tmp.x + 1) / 2) * w, ((1 - tmp.y) / 2) * h];
    });
    frame.style.transform = quadTransform(LCD.w, LCD.h, px);
    frame.style.left = '0px';
    frame.style.top = 'var(--topbar,40px)';
  }
  function draw() {
    aim();
    renderer.render(scene, camera);
  }
  function resize() {
    renderer.setSize(stageEl.clientWidth, stageEl.clientHeight, false);
    draw();
  }
  new ResizeObserver(resize).observe(stageEl);
  document.body.classList.remove('flat');
  resize();
  // The HDR and the flag texture arrive after the first frame: redraw when they have.
  for (const t of [300, 900, 2000]) setTimeout(draw, t);
  if (!reduceMotion) {
    addEventListener('pointermove', e => {
      look.tx = (e.clientX / innerWidth) * 2 - 1;
      look.ty = (e.clientY / innerHeight) * 2 - 1;
      if (!running) {
        running = true;
        requestAnimationFrame(step);
      }
    });
  }
  let running = false;
  function step() {
    look.x += (look.tx - look.x) * 0.12;
    look.y += (look.ty - look.y) * 0.12;
    draw();
    if (Math.hypot(look.tx - look.x, look.ty - look.y) > 0.002) requestAnimationFrame(step);
    else running = false;
  }
  window.PARP_MENU = {ready: true, scene, camera, renderer, phone: holder};
} catch (err) {
  console.error(err);
  document.body.classList.add('flat'); // no WebGL: the LCD sits centred on a plain background
  window.PARP_MENU = {ready: true, flat: true};
}
