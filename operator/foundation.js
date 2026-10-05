// Inspect the clean clothing foundation from all sides and through the existing pose/idle library.
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {createStage} from '../shared/stage.js';
import {mountTopBar} from '../shared/topbar.js';
import {Rig} from './rig.js';
import {posesForProfile} from './pose-profile.js';
mountTopBar({title: 'Recon clothing foundation', scene: 'viewer'});
const $ = s => document.querySelector(s);
try {
  const stage = await createStage($('#foundation-stage'), {environment: 'outdoor', backdrop: true, lightOffset: 255});
  const response = await fetch('poses.json');
  if (!response.ok) throw Error('Poses unavailable');
  const data = posesForProfile(await response.json(), 'reconFoundation');
  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync('../assets/models/operators/recon-modular.glb');
  stage.scene.add(gltf.scene);
  const rig = new Rig(gltf.scene, data),
    meshes = [];
  gltf.scene.traverse(m => {
    if (m.isMesh) {
      meshes.push(m);
      m.castShadow = m.receiveShadow = true;
      m.frustumCulled = false;
    }
  });
  stage.renderer.toneMappingExposure = 0.85;
  stage.controls.enableDamping = false;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let pose = 'rest';
  function setPose(id) {
    pose = id;
    $('#pose').value = id;
    $('#idle').disabled = id === 'rest';
    if (id === 'rest') {
      for (const [name, rest] of rig.rest) rig.bones.get(name).quaternion.copy(rest.local);
      gltf.scene.position.y = 0;
    } else {
      rig.setPose(id, 0);
      rig.update(0, 0, null, 0);
    }
    if (id !== 'rest') gltf.scene.position.y = -rig.lower;
    gltf.scene.updateMatrixWorld(true);
    stage.wake();
  }
  for (const [id, p] of Object.entries(data.poses)) {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = p.label;
    $('#pose').append(option);
  }
  function frame(direction) {
    const target = new T.Vector3(0, 0.97, 0),
      distance = Math.max(3.45, 1.45 / stage.camera.aspect);
    const axis = {front: [0, 0, 1], back: [0, 0, -1], left: [1, 0, 0], right: [-1, 0, 0]}[direction];
    stage.moveCamera(target, target.clone().addScaledVector(new T.Vector3(...axis), distance), 0);
    document.querySelectorAll('[data-camera]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.camera === direction)));
  }
  document.querySelectorAll('[data-camera]').forEach(b => (b.onclick = () => frame(b.dataset.camera)));
  $('#pose').onchange = e => setPose(e.target.value);
  $('#idle').onchange = () => stage.wake();
  $('#wire').onclick = () => {
    const wire = $('#wire').getAttribute('aria-pressed') !== 'true';
    $('#wire').setAttribute('aria-pressed', String(wire));
    meshes.forEach(m => (m.material.wireframe = wire));
    stage.wake();
  };
  stage.setAnimated(() => pose !== 'rest' && $('#idle').value !== 'off' && !reduced.matches);
  stage.onFrame((dt, t) => {
    if (pose !== 'rest') rig.update(dt, t, $('#idle').value === 'off' ? null : $('#idle').value, reduced.matches ? 0 : 1);
  });
  const triangles = meshes.reduce((n, m) => n + m.geometry.index.count / 3, 0);
  $('#stats').textContent = `${triangles.toLocaleString()} triangles · 26-bone Recon skeleton · no equipment geometry`;
  setPose('rest');
  frame('front');
  $('#status').textContent = '';
  window.PARP_RECON_FOUNDATION = {ready: true, stage, scene: gltf.scene, rig, meshes, setPose, frame};
} catch (error) {
  $('#status').textContent = 'The clothing preview could not load. Reload in a browser with WebGL enabled.';
  console.error(error);
}
