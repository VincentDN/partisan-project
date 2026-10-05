// Inspect intact source geometry through reversible explosion, isolation and measured part decisions.
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createStage} from '../shared/stage.js';
import {mountTopBar} from '../shared/topbar.js';
mountTopBar({title: 'Recon teardown', scene: 'viewer'});
const $ = s => document.querySelector(s);
const colors = {clothing: 0xabb98e, fused: 0xe0a34f, equipment: 0x6bbad5, discard: 0xe18078};
const number = id => String(id + 1).padStart(2, '0');
try {
  const response = await fetch('../assets/models/operators/recon-source-audit.json');
  if (!response.ok) throw Error('Source audit unavailable');
  const audit = await response.json();
  const stage = await createStage($('#teardown-stage'), {environment: 'outdoor', backdrop: true, lightOffset: 255});
  const gltf = await new GLTFLoader().loadAsync('../assets/models/operators/recon-split-reference.glb');
  const aligned = new T.Group();
  aligned.rotation.y = audit.alignment.rotationY;
  aligned.scale.setScalar(audit.alignment.scale);
  aligned.position.fromArray(audit.alignment.translation);
  aligned.add(gltf.scene);
  stage.scene.add(aligned);
  aligned.updateMatrixWorld(true);
  stage.renderer.toneMappingExposure = 0.95;
  stage.controls.enableDamping = false;
  const parts = audit.parts.map(spec => {
    const node = gltf.scene.getObjectByName(spec.sourceNode);
    if (!node) throw Error(`Missing source part ${spec.sourceNode}`);
    const group = new T.Group();
    stage.scene.add(group);
    group.attach(node); // Preserve source transforms; explode the new parent only.
    node.traverse(mesh => {
      if (!mesh.isMesh) return;
      mesh.material = new T.MeshStandardMaterial({color: colors[spec.category], roughness: 0.85, side: T.DoubleSide});
      mesh.castShadow = mesh.receiveShadow = true;
    });
    const label = document.createElement('span');
    label.className = 'part-number';
    label.textContent = number(spec.id);
    label.setAttribute('aria-hidden', 'true');
    $('#teardown-stage').append(label);
    const button = document.createElement('button');
    button.className = spec.category;
    button.dataset.part = spec.id;
    button.setAttribute('aria-pressed', 'false');
    const index = document.createElement('span');
    index.textContent = number(spec.id);
    button.append(index, spec.label);
    button.onclick = () => select(spec.id);
    $('#parts').append(button);
    return {spec, group, node, label, button, offset: new T.Vector3().fromArray(spec.at).sub(new T.Vector3().fromArray(spec.center))};
  });
  let separation = 1,
    mode = 'exploded',
    selected = 4,
    isolated = false,
    camera = 'front';
  function update() {
    for (const p of parts) {
      p.group.position.copy(p.offset).multiplyScalar(separation);
      p.group.visible = isolated ? p.spec.id === selected : mode !== 'body' || p.spec.bodyCandidate;
      p.button.setAttribute('aria-pressed', String(p.spec.id === selected));
      p.label.classList.toggle('selected', p.spec.id === selected);
    }
    document.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
    $('#isolate').setAttribute('aria-pressed', String(isolated));
    $('#separation').value = Math.round(separation * 100);
    $('#separation-value').textContent = `${Math.round(separation * 100)}%`;
    const count = parts.filter(p => p.group.visible).length;
    $('#scene-note').textContent =
      `${count} / 27 pieces · ${audit.source.triangles.toLocaleString()} source triangles · ${mode === 'body' ? 'Fused vest and unfinished joins remain visible.' : 'Select a number in the list to inspect its rebuild decision.'}`;
    stage.wake();
  }
  function select(id) {
    const p = parts.find(p => p.spec.id === id);
    if (!p) return;
    selected = id;
    $('#part-title').textContent = `${number(id)} · ${p.spec.label}`;
    $('#part-note').textContent = p.spec.note;
    $('#part-stats').textContent =
      `${p.spec.triangles.toLocaleString()} triangles · ${p.spec.boundaryEdges.toLocaleString()} boundary edges · ${p.spec.decision.replace('-', ' + ')}`;
    $('#part-module').textContent = `Future module: ${p.spec.module}`;
    update();
    if (isolated) frame(camera, true);
  }
  function frame(direction = camera, focus = false) {
    camera = direction;
    const part = parts.find(p => p.spec.id === selected);
    const box = new T.Box3();
    parts.filter(p => p.group.visible && (!focus || p === part)).forEach(p => box.expandByObject(p.group));
    if (box.isEmpty()) box.setFromObject(part.group);
    const target = box.getCenter(new T.Vector3()),
      size = box.getSize(new T.Vector3());
    const vertical = Math.tan(T.MathUtils.degToRad(stage.camera.fov / 2));
    const width = direction === 'side' ? size.z : size.x;
    const depth = direction === 'side' ? size.x : size.z;
    const distance = Math.max(size.y / vertical, width / (vertical * stage.camera.aspect)) * 0.56 + depth / 2;
    const axis = direction === 'side' ? new T.Vector3(1, 0, 0) : new T.Vector3(0, 0, direction === 'back' ? -1 : 1);
    stage.moveCamera(target, target.clone().addScaledVector(axis, Math.max(0.4, distance)), 0);
    document.querySelectorAll('[data-camera]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.camera === direction)));
  }
  function setMode(next) {
    mode = next;
    isolated = false;
    separation = next === 'exploded' ? 1 : 0;
    update();
    frame();
  }
  function setSeparation(value) {
    separation = Math.max(0, Math.min(1, value));
    if (mode !== 'body') mode = separation === 0 ? 'assembled' : 'exploded';
    update();
    frame(camera, isolated);
  }
  document.querySelectorAll('[data-mode]').forEach(b => (b.onclick = () => setMode(b.dataset.mode)));
  document.querySelectorAll('[data-camera]').forEach(b => (b.onclick = () => frame(b.dataset.camera)));
  $('#separation').oninput = e => setSeparation(Number(e.target.value) / 100);
  $('#isolate').onclick = () => {
    isolated = !isolated;
    update();
    frame(camera, isolated);
  };
  $('#focus').onclick = () => {
    if (!parts.find(p => p.spec.id === selected).group.visible) isolated = true;
    update();
    frame(camera, true);
  };
  $('#show-all').onclick = () => setMode('exploded');
  $('#wire').onclick = () => {
    const wire = $('#wire').getAttribute('aria-pressed') !== 'true';
    $('#wire').setAttribute('aria-pressed', String(wire));
    parts.forEach(p =>
      p.node.traverse(m => {
        if (m.isMesh) m.material.wireframe = wire;
      }),
    );
    stage.wake();
  };
  const projected = new T.Vector3();
  stage.onFrame(() => {
    const width = $('#teardown-stage').clientWidth,
      height = $('#teardown-stage').clientHeight;
    for (const p of parts) {
      projected.fromArray(p.spec.center).add(p.group.position).project(stage.camera);
      const visible = p.group.visible && (separation > 0.2 || p.spec.id === selected) && Math.abs(projected.z) <= 1;
      p.label.hidden = !visible;
      if (visible)
        p.label.style.transform = `translate(${((projected.x + 1) * width) / 2}px,${((1 - projected.y) * height) / 2}px) translate(-50%,-50%)`;
    }
  });
  select(selected);
  setMode('exploded');
  $('#status').textContent = '';
  window.PARP_RECON_TEARDOWN = {ready: true, stage, parts, audit, setMode, setSeparation, select, frame};
} catch (error) {
  $('#status').textContent = 'The source inspection could not load. Reload in a browser with WebGL enabled.';
  console.error(error);
}
