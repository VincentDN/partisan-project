// Inspect the clean clothing foundation from all sides and through the existing pose/idle library.
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {createStage} from '../shared/stage.js';
import {mountTopBar} from '../shared/topbar.js';
import {Rig} from './rig.js';
import {posesForProfile} from './pose-profile.js';
import {bindPack} from './bind-pack.js';
import {resolveAssembly} from './assembly.js';
import {Grip} from './grip.js';
import {modularRecon} from './recon-modular.js';
import {referenceGrip} from './reference-grip.js';
mountTopBar({title: 'Recon clothing foundation', scene: 'viewer'});
const $ = s => document.querySelector(s);
try {
  const stage = await createStage($('#foundation-stage'), {environment: 'outdoor', backdrop: true, lightOffset: 255});
  const response = await fetch('poses.json');
  if (!response.ok) throw Error('Poses unavailable');
  const poseSource = await response.json();
  const data = posesForProfile(poseSource, 'reconFoundation');
  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync('../assets/models/operators/recon-modular.glb');
  stage.scene.add(gltf.scene);
  const rig = new Rig(gltf.scene, data),
    meshes = [];
  rig.grip = new Grip(rig.bones, rig.rest, modularRecon(null).grip);
  const carrierData = await fetch('recon-carrier.json').then(r => {
    if (!r.ok) throw Error('Carrier definitions unavailable');
    return r.json();
  });
  const carrierPack = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync('../assets/models/operators/recon-carrier.glb');
  bindPack(carrierPack.scene, gltf.scene, rig);
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
  function handShape() {
    const shape = data.handShapes[$('#hands').value];
    if (!shape) return;
    for (const side of ['r', 'l'])
      for (const [finger, angles] of Object.entries(shape))
        angles.forEach((angle, i) => {
          const name = `${finger}_0${i + 1}_${side}`,
            bone = rig.bones.get(name);
          const radians = angle.map((v, axis) => ((v * Math.PI) / 180) * (axis === 2 && side === 'l' ? -1 : 1));
          bone.quaternion.copy(rig.rest.get(name).local).multiply(new T.Quaternion().setFromEuler(new T.Euler(...radians)));
        });
  }
  function headwear() {
    const value = $('#headwear').value;
    meshes.filter(m => m.name === 'SK_CM_Mask').forEach(m => (m.visible = value === 'mask' || value === 'both'));
    meshes.filter(m => m.name === 'SK_CM_HeadCap').forEach(m => (m.visible = value === 'cap' || value === 'both'));
    stage.wake();
  }
  function carrier() {
    const result = resolveAssembly(carrierData.catalogue, carrierData.outfits[$('#carrier').value]);
    if (!result.ok) throw Error(result.errors.map(e => e.message).join(' '));
    const nodes = new Set(result.active.flatMap(i => carrierData.catalogue.find(d => d.id === i.itemId).geometry.nodes || []));
    meshes
      .filter(m => m.name.startsWith('SK_LC_') || m.parent?.name.startsWith('SK_LC_'))
      .forEach(m => {
        const node = m.userData.packPart || m.name;
        m.visible = nodes.has(node);
      });
    stage.wake();
  }
  function setPose(id) {
    rig.data = posesForProfile(poseSource, $('#carrier').value === 'bare' ? 'reconFoundation' : 'reconCarrier');
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
    if (id !== 'rest') referenceGrip(rig);
    handShape();
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
  $('#hands').onchange = () => setPose(pose);
  $('#headwear').onchange = headwear;
  $('#carrier').onchange = () => {
    carrier();
    setPose(pose);
  };
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
    if (pose !== 'rest') referenceGrip(rig);
    handShape();
  });
  const triangles = meshes.reduce((n, m) => n + m.geometry.index.count / 3, 0);
  $('#stats').textContent = `${triangles.toLocaleString()} loaded triangles · 56 bones · removable carrier, mask and cap`;
  headwear();
  carrier();
  setPose('rest');
  frame('front');
  $('#status').textContent = '';
  window.PARP_RECON_FOUNDATION = {ready: true, stage, scene: gltf.scene, rig, meshes, setPose, frame, carrierData};
} catch (error) {
  $('#status').textContent = 'The clothing preview could not load. Reload in a browser with WebGL enabled.';
  console.error(error);
}
