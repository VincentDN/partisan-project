// Authored visual mount profiles in normalized weapon space; fictional combinations use visible adapter rails.
import * as T from 'three';
import {frontInEnvelope} from './attachment-clearance.js';

// x/y for the usable underside, side-rail centre and optic seat. z follows the weapon's barrel centre.
export const FIT_PROFILES = {
  ak74m: {under: [0.15, 0.034], side: [0.15, 0.069], optic: [-0.117, 0.116], travel: [-0.02, 0.03]},
  ak15k: {under: [0.205, 0.043], side: [0.205, 0.078], optic: [-0.014, 0.117], travel: [-0.02, 0.02]},
  g3: {under: [0.235, 0.025], side: [0.235, 0.054], optic: [-0.07, 0.088], travel: [-0.03, 0.04]},
  m16: {under: [0.21, 0.014], side: [0.21, 0.05], optic: [-0.113, 0.116], travel: [-0.03, 0.03]},
  mk14: {under: [0.18, 0.013], side: [0.18, 0.046], optic: [0.023, 0.082], travel: [-0.02, 0.02]},
  spear: {under: [0.17, 0.009], side: [0.17, 0.047], optic: [-0.061, 0.091], travel: [-0.04, 0.04]},
  stg44: {under: [0.23, 0.088], side: [0.23, 0.114], optic: [-0.09, 0.141], travel: [-0.02, 0.02]},
  ppsh41: {under: [0.32, 0.061], side: [0.32, 0.076], optic: [-0.015, 0.106], travel: [-0.03, 0.03]},
  bren: {under: [0.29, -0.076], side: [0.29, -0.041], optic: [-0.235, 0.003], opticZ: -0.06, travel: [-0.02, 0.02]},
  chauchat: {under: [0.3, 0.034], side: [0.3, 0.055], optic: [-0.026, 0.079], travel: [-0.03, 0.04]},
  rpk: {under: [0.1, 0.054], side: [0.1, 0.101], optic: [-0.188, 0.136], travel: [-0.02, 0.02]},
};
FIT_PROFILES['spear-retro'] = FIT_PROFILES.spear;

export function localBounds(object, frame) {
  frame.updateWorldMatrix(true, true);
  const inverse = frame.matrixWorld.clone().invert(),
    bounds = new T.Box3();
  object.traverse(m => {
    if (!m.isMesh || !m.geometry.attributes.position?.count) return;
    m.geometry.computeBoundingBox();
    bounds.union(m.geometry.boundingBox.clone().applyMatrix4(inverse.clone().multiply(m.matrixWorld)));
  });
  return bounds;
}
function block(root, size, position, material) {
  const mesh = new T.Mesh(new T.BoxGeometry(...size), material);
  mesh.position.set(...position);
  root.add(mesh);
}

/** Set up shared library seats without moving factory geometry or mutating shared configuration. */
export function configureFit(rifle) {
  const p = FIT_PROFILES[rifle.id],
    z = rifle.slots.muzzle.base.z;
  const trigger = {g3: [-0.117, -0.003], mk14: [-0.157, 0.009], stg44: [-0.104, 0.026], ppsh41: [-0.087, 0.006], rpk: [-0.218, 0.075]};
  const seats = {
    foregrip: [...p.under, z],
    side: [...p.side, z + 0.033],
    optic: [...p.optic, z + (p.opticZ || 0)],
    ...(trigger[rifle.id] ? {trigger: [...trigger[rifle.id], z]} : {}),
    ...(rifle.id === 'stg44' ? {grip: [-0.14, 0.038, z]} : {}),
    ...(rifle.id === 'g3' ? {charging: [0.135, 0.074, z - 0.024]} : {}),
    ...(['spear', 'spear-retro'].includes(rifle.id) ? {charging: [-0.22, 0.079, z + 0.024]} : {}),
  };
  for (const [id, slot] of Object.entries(rifle.slots)) {
    slot.fitBase = new T.Vector3(...(seats[id] || slot.base.toArray()));
    if (['foregrip', 'side'].includes(id)) slot.rail = {min: p.travel[0], max: p.travel[1], step: 0.01};
    slot.build.rifle = rifle;
    slot.build.slingEnd = [p.under[0] - rifle.slots.sling.base.x, p.side[1] - rifle.slots.sling.base.y, 0];
    for (const o of slot.options) {
      if (!o.build) continue;
      if (id === 'charging' || (id === 'trigger' && rifle.id === 'rpk')) o.keepOriginal = true;
      const delta = slot.fitBase.clone().sub(slot.base);
      o.fitDelta = delta;
      if (o.fp) o.fp = o.fp.map(x => x + delta.x);
      if (o.sightHeight) o.sightHeight += delta.y;
    }
  }
}

/** Fit once geometry arrives, before highlighting/finishing adopts the meshes. */
export function fitOption(rifle, id, option, object) {
  if (object.userData.loading) return;
  const slot = rifle.slots[id];
  if (object.userData.fitted) return;
  const b = localBounds(object, object);
  if (b.isEmpty()) return;
  object.position.copy(option.fitDelta);
  if (id === 'charging' && rifle.id === 'g3') object.rotation.y = Math.PI;
  // CNC furniture is generated in the factory part's own frame; only the generic plum grip needs a relocated socket.
  if (id === 'grip') {
    object.position.set(0, 0, 0);
    if (option.id === 'classic') {
      const original = localBounds(slot.original, slot.container);
      const size = b.getSize(new T.Vector3()),
        target = original.getSize(new T.Vector3());
      object.scale.set(
        T.MathUtils.clamp(target.x, 0.055, 0.1) / size.x,
        T.MathUtils.clamp(target.y, 0.1, 0.135) / size.y,
        T.MathUtils.clamp(target.z, 0.024, 0.036) / size.z,
      );
      object.position.set(
        original.max.x - b.max.x * object.scale.x,
        original.max.y - b.max.y * object.scale.y,
        original.getCenter(new T.Vector3()).z,
      );
    }
  }
  const material = slot.build.materials['h-190'];
  // An explicit short rail bridges the mounting shoe to the handguard instead of leaving the imported part floating.
  if (id === 'foregrip') {
    object.userData.mountPosts = [];
    const xs = option.id === 'gp25' ? [0.07, 0.15] : [-0.018, 0.018];
    for (const x of xs) {
      const post = new T.Mesh(new T.BoxGeometry(0.018, 1, 0.022), material);
      post.position.x = x;
      object.add(post);
      object.userData.mountPosts.push(post);
    }
    block(object, [option.id === 'gp25' ? 0.11 : 0.06, 0.006, 0.024], [option.id === 'gp25' ? 0.11 : 0, 0, 0], material);
  }
  if (id === 'side') block(object, [0.06, 0.021, 0.015], [0, 0, -0.006], material);
  if (id === 'optic') {
    block(object, [option.id === 'scope' ? 0.18 : 0.075, 0.006, 0.024], [0, -0.002, 0], material);
    if (rifle.id === 'bren') block(object, [0.1, 0.012, 0.07], [0, -0.007, 0.03], material);
  }
  if (id === 'sling') {
    object.position.z += 0.045;
    block(object, [0.012, 0.012, 0.05], [0, 0, -0.022], material);
    if (option.id === 'strap') {
      const end = slot.build.slingEnd;
      block(object, [0.012, 0.012, 0.05], [end[0], end[1], -0.022], material);
    }
  }
  // Replacement magazines must meet the original feed seat, not an approximate source socket.
  if (id === 'magazine' && !['clear', '45', '60'].includes(option.id)) {
    const original = localBounds(slot.original, slot.container);
    if (!original.isEmpty()) {
      object.position.x += original.getCenter(new T.Vector3()).x - b.getCenter(new T.Vector3()).x;
      object.position.y += original.max.y - b.max.y;
    }
  }
  object.userData.fitBody = b.clone();
  object.userData.fitted = true;
  if (option.fp) {
    const measured = localBounds(object, slot.container);
    option.fp = [measured.min.x, measured.max.x];
  }
  refreshFit(rifle);
}

/** Resolve visible magazine/underbarrel clearance after either part or a rail offset changes. */
export function refreshFit(rifle) {
  const fg = rifle.slots.foregrip,
    mag = rifle.slots.magazine;
  const option = fg?.options.find(o => o.id === rifle.build.foregrip);
  if (!option?.object?.userData.fitted || !mag) return;
  const object = option.object;
  object.position.copy(option.fitDelta);
  const selected = mag.options.find(o => o.id === rifle.build.magazine);
  const magazine = selected?.original ? mag.original : selected?.object;
  seatPosts(rifle, fg, object);
  const a = object.userData.fitBody.clone().translate(slotPosition(fg).add(object.position));
  if (magazine) {
    const b = localBounds(magazine, rifle.model);
    if (!b.isEmpty() && a.min.y <= b.max.y && a.max.y >= b.min.y && a.min.z <= b.max.z && a.max.z >= b.min.z) {
      const advance = Math.max(0, frontInEnvelope(magazine, rifle.model, a) + 0.008 - a.min.x);
      object.position.x += advance;
      object.userData.clearanceShift = advance;
    }
  }
  seatPosts(rifle, fg, object);
}
const slotPosition = slot => slot.base.clone().add(new T.Vector3(slot.offset, 0, 0));
function seatPosts(rifle, slot, object) {
  const excluded = new Set();
  for (const [id, s] of Object.entries(rifle.slots))
    if (!['handguard', 'stock', 'grip'].includes(id)) s.container.traverse(m => excluded.add(m));
  const core = [];
  rifle.model.updateWorldMatrix(true, true);
  rifle.model.traverse(m => {
    if (!m.isMesh || excluded.has(m)) return;
    for (let p = m; p && p !== rifle.model; p = p.parent) if (!p.visible) return;
    core.push(m);
  });
  const at = slotPosition(slot).add(object.position),
    ray = new T.Raycaster();
  const contacts = [];
  for (const post of object.userData.mountPosts || []) {
    const x = at.x + post.position.x;
    ray.set(
      new T.Vector3(x, -2, at.z).applyMatrix4(rifle.model.matrixWorld),
      new T.Vector3(0, 1, 0).transformDirection(rifle.model.matrixWorld),
    );
    const hit = ray.intersectObjects(core, false)[0];
    const y = hit ? rifle.model.worldToLocal(hit.point.clone()).y : at.y + 0.006;
    contacts.push({post, y});
  }
  if (contacts.length) {
    const lift = Math.min(...contacts.map(c => c.y)) - at.y - 0.004;
    object.position.y += lift;
    for (const {post, y} of contacts) {
      const height = Math.max(0.004, y - at.y - lift + 0.002);
      post.scale.y = height;
      post.position.y = height / 2;
    }
  }
}
