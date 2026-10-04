// Compare the untouched complete Recon with the modular runtime model using synchronized cameras and lighting.
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {createStage} from '../shared/stage.js';
import {mountTopBar} from '../shared/topbar.js';
import {HERO_AZIMUTH} from './config.js';
mountTopBar({title: 'Recon comparison', scene: 'viewer'});
const $ = s => document.querySelector(s);
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const ids = ['original', 'current'];
const paths = ['../assets/models/operators/recon-original.glb', '../assets/models/operators/generated-recon.glb'];
const views = {full: [0.98, 3.9], torso: [1.34, 2.1], face: [1.69, 0.82]};
try {
  const stages = await Promise.all(
    ids.map(id =>
      createStage($(`#${id}-stage`), {
        environment: 'outdoor',
        backdrop: true,
        lightOffset: 255,
        heroAzimuth: (HERO_AZIMUTH * Math.PI) / 180,
      }),
    ),
  );
  const models = await Promise.all(paths.map(path => loader.loadAsync(path)));
  models.forEach((gltf, i) => {
    const display = new T.Group();
    display.add(gltf.scene);
    if (i === 0) {
      // Same world alignment as the importer; do not touch source nodes, geometry or materials.
      display.rotation.y = -Math.PI / 2;
      display.position.y = 0.925;
    }
    stages[i].scene.add(display);
    let triangles = 0;
    gltf.scene.traverse(mesh => {
      if (!mesh.isMesh) return;
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      triangles += (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3;
    });
    $(`#${ids[i]}-stats`).textContent = `${triangles.toLocaleString()} triangles · ${i ? 'modular conversion' : 'untouched source'}`;
    stages[i].renderer.toneMappingExposure = 0.85;
    stages[i].controls.enableDamping = false;
    // The shared stage writes Alt-drag lighting changes into this shared slider.
    stages[i].onFrame(() => stages[i].rotateLights(Number($('#light-rotation').value)));
  });
  let syncing = false;
  stages.forEach((source, i) =>
    source.controls.addEventListener('change', () => {
      if (syncing) return;
      syncing = true;
      const target = stages[1 - i];
      target.camera.position.copy(source.camera.position);
      target.camera.quaternion.copy(source.camera.quaternion);
      target.controls.target.copy(source.controls.target);
      target.controls.update();
      target.wake();
      syncing = false;
    }),
  );
  function view(id) {
    if (!Object.hasOwn(views, id)) id = 'full';
    const [height, distance] = views[id];
    stages[0].moveCamera(new T.Vector3(0, height, 0), new T.Vector3(0, height + 0.03, distance), 0);
    document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === id)));
    history.replaceState(null, '', `#view=${id}`);
    stages.forEach(s => s.wake());
  }
  document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => view(b.dataset.view)));
  $('#wire').onclick = () => {
    const wireframe = $('#wire').getAttribute('aria-pressed') !== 'true';
    $('#wire').setAttribute('aria-pressed', String(wireframe));
    models.forEach(g =>
      g.scene.traverse(m => {
        if (m.isMesh) m.material.wireframe = wireframe;
      }),
    );
    stages.forEach(s => s.wake());
  };
  $('#environment').onchange = async () => {
    try {
      await Promise.all(stages.map(s => s.useEnvironment($('#environment').value)));
    } catch {
      $('#status').textContent = 'Lighting could not load. Try another environment.';
    }
    stages.forEach(s => s.wake());
  };
  const initial = new URLSearchParams(location.hash.slice(1)).get('view');
  view(initial);
  $('#status').textContent = '';
  window.PARP_RECON_COMPARE = {ready: true, stages, models, view};
} catch (error) {
  $('#status').textContent = 'The models could not load. Reload in a browser with WebGL enabled.';
  console.error(error);
}
