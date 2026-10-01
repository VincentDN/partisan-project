// PARP Asset Viewer: inspect any registered GLB against the budgets in assets/register.json.
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {createStage} from '../shared/stage.js';
import {summarise} from './report.js';

const $ = s => document.querySelector(s);
const stage = await createStage($('#stage'), {environment: 'studio', backdrop: false, floorSize: 10});
const register = await (await fetch('../assets/register.json')).json();
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
let current = null, helper = null, spinning = false, mixer = null;

async function show(path) {
  $('#status').hidden = false;
  if (current) { current.removeFromParent(); }
  if (helper) { helper.removeFromParent(); helper = null; }
  const gltf = await loader.loadAsync(new URL('../' + path, import.meta.url).href);
  current = gltf.scene;
  current.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; o.frustumCulled = false; } });
  stage.scene.add(current);
  const box = new T.Box3().setFromObject(current), size = box.getSize(new T.Vector3()), center = box.getCenter(new T.Vector3());
  stage.floor.position.y = box.min.y - 0.002;
  const d = Math.max(size.x, size.y, size.z) * 2.2;
  stage.moveCamera(center, center.clone().add(new T.Vector3(d * 0.55, d * 0.25, d * 0.8)), 0.01);
  const entry = register.assets.find(a => a.path === path);
  const s = summarise(current, gltf.animations, entry, box);
  $('#report').innerHTML = s.rows.map(([k, v, warn]) => `<div>${k}: <b${warn ? ' style="color:#ffb56b"' : ''}>${v}</b></div>`).join('');
  for (const b of $('#models').children) b.setAttribute('aria-pressed', String(b.dataset.path === path));
  $('#status').hidden = true;
}
const glbs = register.assets.filter(a => a.path.endsWith('.glb'));
$('#models').replaceChildren(...glbs.map(a => {
  const b = document.createElement('button');
  b.textContent = a.label; b.dataset.path = a.path; b.setAttribute('aria-pressed', 'false');
  b.onclick = () => show(a.path);
  return b;
}));
$('#spin').onclick = e => { spinning = !spinning; e.currentTarget.setAttribute('aria-pressed', String(spinning)); };
$('#wire').onclick = e => {
  const on = e.currentTarget.getAttribute('aria-pressed') !== 'true';
  current?.traverse(o => { if (o.isMesh) o.material.wireframe = on; });
  e.currentTarget.setAttribute('aria-pressed', String(on));
};
$('#bones').onclick = e => {
  const on = e.currentTarget.getAttribute('aria-pressed') !== 'true';
  if (helper) { helper.removeFromParent(); helper = null; }
  if (on && current) { helper = new T.SkeletonHelper(current); stage.scene.add(helper); }
  e.currentTarget.setAttribute('aria-pressed', String(on));
};
stage.onFrame(dt => { if (spinning && current) current.rotation.y += dt * 0.6; });

const wanted = new URLSearchParams(location.search).get('model');
await show(wanted || glbs[0].path);
window.PARP_VIEWER = {ready: true};
