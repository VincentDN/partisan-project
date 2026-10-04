import * as T from 'three';
import {loadModel} from '../shared/model-cache.js';
import {SLOTS, FINISHES, FINISH_TARGETS, FALLBACK_MATERIALS} from './attachments.js';
import {MODELS} from './models.js';
import {paintSurface, paintRetro} from './surface.js';
import {applyFinishState} from './rifle-finishes.js';
// Lay the longest axis along x with the muzzle (the slimmer end) at +x, scale to meters, center. `stretch` [x, y, z]
// corrects a source whose proportions are off (the M16's is too tall and too thin), in the laid-out axes.
export function normalize(root, scale, stretch = null) {
  root.updateMatrixWorld(true);
  let size = new T.Box3().setFromObject(root).getSize(new T.Vector3());
  if (size.z > size.x && size.z >= size.y) root.rotation.y = Math.PI / 2;
  else if (size.y > size.x && size.y > size.z) root.rotation.z = Math.PI / 2;
  root.updateMatrixWorld(true);
  const bounds = new T.Box3().setFromObject(root);
  size = bounds.getSize(new T.Vector3());
  const ends = [
      [Infinity, -Infinity],
      [Infinity, -Infinity],
    ],
    v = new T.Vector3();
  root.traverse(o => {
    if (!o.isMesh) return;
    const p = o.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld);
      const t = (v.x - bounds.min.x) / size.x,
        e = t < 0.12 ? ends[0] : t > 0.88 ? ends[1] : null;
      if (e) {
        e[0] = Math.min(e[0], v.y);
        e[1] = Math.max(e[1], v.y);
      }
    }
  });
  if (ends[0][1] - ends[0][0] < ends[1][1] - ends[1][0]) root.rotateY(Math.PI);
  root.scale.multiplyScalar(scale);
  let body = root;
  if (stretch) {
    body = new T.Group();
    body.name = 'proportions';
    body.scale.set(...stretch);
    body.add(root);
  }
  body.updateMatrixWorld(true);
  const center = new T.Box3().setFromObject(body).getCenter(new T.Vector3());
  const holder = new T.Group();
  holder.add(body);
  body.position.sub(center);
  return holder;
}

const nodeName = name => T.PropertyBinding.sanitizeNodeName(name);
// Load a rifle and build its parts, slots (with library options) and finish targets.
export async function loadRifle(id, {decorate = () => {}} = {}) {
  const config = MODELS[id],
    root = await loadModel(new URL(config.url, import.meta.url).href);
  root.traverse(o => {
    if (o.isMesh) o.castShadow = o.receiveShadow = true;
  });
  const sockets = config.sockets.map(([sid, label, p, d]) => {
    const o = new T.Object3D();
    o.name = 'socket:' + sid;
    o.position.set(...p);
    o.userData = {id: sid, label, direction: new T.Vector3(...d)};
    root.add(o);
    return o;
  });
  const model = normalize(root, config.scale, config.stretch);
  // Mount points given in metres on the laid-out rifle (workbench/universal.js), for rifles whose source has no part there.
  for (const [sid, label, p, d] of config.mounts || []) {
    const o = new T.Object3D();
    o.name = 'socket:' + sid;
    o.position.set(...p);
    o.userData = {id: sid, label, direction: new T.Vector3(...d)};
    model.add(o);
    sockets.push(o);
  }
  model.updateMatrixWorld(true);
  if (config.surface) paintSurface(model, config);
  // Clone materials so highlighting, finishes and wireframe only touch this rifle's meshes.
  model.traverse(o => {
    if (o.isMesh) o.material = o.material.clone();
  });
  // A node claimed by one part is skipped when collecting another part's meshes.
  const claimed = new Set(config.parts.flatMap(p => p.nodes.map(nodeName)));
  const parts = config.parts.map(p => {
    const objects = [],
      own = new Set(p.nodes.map(nodeName));
    const walk = o => {
      if (o.isMesh) objects.push(o);
      for (const c of o.children) if (!claimed.has(c.name) || own.has(c.name)) walk(c);
    };
    for (const n of p.nodes) {
      const node = model.getObjectByName(nodeName(n));
      if (node) walk(node);
    }
    return {...p, objects};
  });
  const own = {};
  model.traverse(o => {
    if (o.isMesh && !own[o.material.name]) own[o.material.name] = o.material;
  });
  const materials = {...FALLBACK_MATERIALS, ...own};
  // Slots: a container at each mount point (model space, meters). The rifle's own part moves into
  // the container's "original" group so poses, rail offsets and swaps act on one object.
  const slots = {};
  for (const spec of SLOTS) {
    const socket = sockets.find(s => s.userData.id === spec.id),
      part = parts.find(p => p.id === spec.id),
      slotConfig = config.slots[spec.id];
    if (!socket || !part || !slotConfig) continue;
    const container = new T.Group();
    container.name = 'slot:' + spec.id;
    model.add(container);
    container.position.copy(model.worldToLocal(socket.getWorldPosition(new T.Vector3())));
    const original = new T.Group();
    container.add(original);
    const nodes = part.nodes.map(n => model.getObjectByName(nodeName(n))).filter(Boolean);
    for (const node of nodes) original.attach(node);
    const home = new Map(nodes.map(n => [n, n.position.clone()]));
    const library = slotConfig.library.map(entry => {
      const o = typeof entry === 'string' ? {id: entry} : entry;
      return {...spec.library.find(l => l.id === o.id), ...o};
    });
    // Attachments are built the first time they are chosen (buildOption), not up front: most never are.
    const options = [...slotConfig.factory, ...library].map(o => ({...o, object: null}));
    // Every mesh the slot can show belongs to its part, so clicks and highlights cover attachments too.
    part.objects = [];
    container.traverse(m => {
      if (m.isMesh) part.objects.push(m);
    });
    slots[spec.id] = {
      spec,
      rail: slotConfig.rail,
      container,
      original,
      home,
      options,
      part,
      direction: socket.userData.direction.clone().transformDirection(socket.matrixWorld),
      base: container.position.clone(),
      offset: 0,
      baseDetail: part.detail,
      build: {original, materials, slot: slotConfig},
    };
  }
  model.userData.isRifleModel = true; // camo projects in this space, also for attachments built later
  decorate(model);
  // A finish target covers a whole part (attachments included) or one option's object only.
  const finishTargets = FINISH_TARGETS.map(t => ({
    ...t,
    part: parts.find(p => p.id === (t.part || t.id)),
    finishes: t.finishes || FINISHES,
  })).filter(
    t =>
      t.part &&
      (t.part.objects.length || t.option || slots[t.part.id]?.options.some(o => o.build)) &&
      (!t.option || slots[t.part.id]?.options.some(o => o.id === t.option)),
  );
  return {
    id,
    config,
    decorate,
    model,
    parts: parts.filter(p => p.objects.length || slots[p.id]),
    sockets,
    slots,
    finishTargets,
    build: {},
    finish: {},
  };
}

// Build an attachment the first time it is needed: its meshes join the part (clicks, highlights), take the rifle's
// camo, wear and finishes, and the retro bitmap on the retro MCX; parts that arrive later from a file get the same.
export function buildOption(rifle, id, option) {
  const slot = rifle.slots[id];
  if (option.object || !option.build) return option.object;
  const object = option.build(slot.build);
  object.visible = false;
  slot.container.add(object);
  const adopt = () => {
    object.traverse(m => {
      if (!m.isMesh || m.userData.adopted) return;
      m.userData.adopted = true;
      m.castShadow = m.receiveShadow = true;
      m.material = m.material.clone();
      slot.part.objects.push(m);
    });
    if (rifle.config.surface?.retro) paintRetro(object, rifle.model);
    rifle.decorate(object);
    for (const t of rifle.finishTargets) if (t.part === slot.part && rifle.finish[t.id]) applyFinishState(rifle, t.id, rifle.finish[t.id]);
  };
  adopt();
  object.addEventListener('loaded', adopt);
  option.object = object;
  return object;
}

// Mutate geometry only. Callers own UI, transaction timing and persistence.
export function applySlotState(rifle, id, optionId, offset) {
  const slot = rifle.slots[id],
    option = slot.options.find(o => o.id === optionId) || slot.options[0];
  buildOption(rifle, id, option);
  rifle.build[id] = option.id;
  slot.original.visible = !!option.original;
  slot.original.rotation.set(0, option.pose?.rotationY || 0, 0);
  slot.original.position.set(...(option.pose?.position || [0, 0, 0]));
  for (const [node, p] of slot.home) {
    node.position.copy(p);
    const d = option.pose?.nodes?.[Object.keys(option.pose.nodes).find(n => nodeName(n) === node.name)];
    if (d) node.position.add(new T.Vector3(...d));
  }
  for (const o of slot.options) if (o.object) o.object.visible = o === option;
  if (slot.rail && offset !== undefined) {
    const {min, max, step} = slot.rail;
    slot.offset = Math.round(T.MathUtils.clamp(offset, min, max) / step) * step;
  }
  if (!slot.rail) slot.offset = 0;
  slot.container.position.copy(slot.base).x += slot.offset;
  slot.part.detail = option.detail || slot.baseDetail;
  return option;
}
