// Resolve immutable equipment instances into a parent-first assembly, with compatibility reasons and full geometry costs.
import {validateCatalogue, validateOutfit} from './assembly-schema.js';

// Rotate a parent-surface cell/depth offset by its authored xyzw quaternion.
function placement(mount, cell, depth) {
  const [x, y, z, w] = mount.quaternion;
  const v = [cell[0] * (mount.kind === 'grid' ? mount.spacing[0] : 0), cell[1] * (mount.kind === 'grid' ? mount.spacing[1] : 0), depth];
  const t = [2 * (y * v[2] - z * v[1]), 2 * (z * v[0] - x * v[2]), 2 * (x * v[1] - y * v[0])];
  const cross = [y * t[2] - z * t[1], z * t[0] - x * t[2], x * t[1] - y * t[0]];
  return {position: v.map((n, i) => mount.position[i] + n + w * t[i] + cross[i]), quaternion: [...mount.quaternion], scale: 1};
}

export function resolveAssembly(catalogue, outfit, {triangleLimit = 15000} = {}) {
  const errors = [...validateCatalogue(catalogue), ...validateOutfit(outfit)];
  const fail = (code, instanceId, message, relatedId = null) => errors.push({code, instanceId, message, relatedId});
  if (!Number.isSafeInteger(triangleLimit) || triangleLimit < 0) fail('budget', null, 'Triangle limit must be a non-negative integer.');
  const budget = {triangles: 0, limit: triangleLimit, complete: false};
  const result = () => ({ok: errors.length === 0, errors, budget, active: [], coverage: []});
  if (errors.length) return result();
  const definitions = new Map(catalogue.map(d => [d.id, d]));
  const instances = new Map(outfit.instances.map(i => [i.id, i]));
  const ordered = [...instances.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const body = definitions.get(instances.get(outfit.rootId).itemId);
  for (const i of ordered) if (!definitions.has(i.itemId)) fail('unknown-item', i.id, `Unknown equipment: ${i.itemId}.`);
  if (body?.family !== 'body') fail('root', outfit.rootId, 'The outfit root must be a complete body.');
  budget.triangles = ordered.reduce((sum, i) => sum + (definitions.get(i.itemId)?.triangleCount || 0), 0);
  budget.complete = ordered.every(i => definitions.has(i.itemId)) && Number.isSafeInteger(budget.triangles);
  if (!Number.isSafeInteger(budget.triangles) || budget.triangles > triangleLimit)
    fail('budget', null, `Outfit uses ${budget.triangles} triangles; limit is ${triangleLimit}.`);
  if (!body || body.family !== 'body') return result();

  const visits = new Map(),
    sorted = [];
  function visit(i) {
    if (visits.get(i.id) === 2) return;
    if (visits.get(i.id) === 1) {
      fail('cycle', i.id, 'Equipment ownership contains a cycle.');
      return;
    }
    visits.set(i.id, 1);
    if (i.id !== outfit.rootId) {
      const parent = instances.get(i.parentId);
      if (!parent) fail('missing-parent', i.id, 'This item needs its parent assembly.', i.parentId);
      else visit(parent);
    }
    visits.set(i.id, 2);
    sorted.push(i);
  }
  ordered.forEach(visit);
  const placements = new Map(),
    occupied = new Map();
  for (const i of sorted) {
    const d = definitions.get(i.itemId);
    if (!d) continue;
    if (d.skeletonId !== body.skeletonId && !body.compatibleSkeletons.includes(d.skeletonId))
      fail('skeleton', i.id, 'This item uses an incompatible skeleton.');
    if (d.fitProfile !== body.fitProfile) fail('fit', i.id, 'This item has no fit for the selected body.');
    for (const region of d.coverage)
      if (!body.coverageRegions.includes(region)) fail('coverage', i.id, `Unknown body coverage region: ${region}.`);
    if (i.id === outfit.rootId) {
      if (i.cell.some(Boolean)) fail('cell', i.id, 'The body must stay at the origin.');
      continue;
    }
    const parent = instances.get(i.parentId),
      parentDef = definitions.get(parent?.itemId);
    if (!parentDef) continue;
    if (!d.owner.includes(parentDef.family)) fail('owner', i.id, `This ${d.family} needs a compatible parent.`, parent.id);
    const mount = parentDef.mounts.find(m => m.id === i.mount);
    if (!mount) {
      fail('mount', i.id, 'The parent has no such attachment region.', parent.id);
      continue;
    }
    if (d.mountType !== mount.type) fail('mount-type', i.id, 'This item does not fit this attachment type.', parent.id);
    if (d.depth < mount.depthRange[0] || d.depth > mount.depthRange[1])
      fail('depth', i.id, 'The authored depth is outside this mount fit.');
    const [col, row] = i.cell,
      [width, height] = d.footprint;
    const columns = mount.kind === 'socket' ? 1 : mount.columns,
      rows = mount.kind === 'socket' ? 1 : mount.rows;
    if (col + width > columns || row + height > rows) {
      fail('footprint', i.id, 'This item needs a wider or taller attachment region.');
      continue;
    }
    // Rectangles avoid allocating a cell for every unit of a malformed or oversized grid.
    const key = JSON.stringify([i.parentId, i.mount]),
      peers = occupied.get(key) || [];
    for (const p of peers)
      if (col < p.col + p.width && col + width > p.col && row < p.row + p.height && row + height > p.row)
        fail('overlap', i.id, 'This attachment region is already occupied.', p.id);
    peers.push({id: i.id, col, row, width, height});
    occupied.set(key, peers);
    const transform = placement(mount, i.cell, d.depth);
    if (!transform.position.every(Number.isFinite)) fail('placement', i.id, 'The authored mount produces an invalid position.');
    placements.set(i.id, transform);
  }
  for (let a = 0; a < ordered.length; a++)
    for (let b = a + 1; b < ordered.length; b++) {
      const left = definitions.get(ordered[a].itemId),
        right = definitions.get(ordered[b].itemId);
      if (left && right && (left.excludes.includes(right.family) || right.excludes.includes(left.family)))
        fail('exclusion', ordered[b].id, `The ${left.family} and ${right.family} cannot be worn together.`, ordered[a].id);
    }
  if (errors.length) return result();
  return {
    ...result(),
    active: sorted.map(i => ({...structuredClone(i), transform: placements.get(i.id) || null})),
    coverage: [...new Set(sorted.filter(i => i.id !== outfit.rootId).flatMap(i => definitions.get(i.itemId).coverage))].sort(),
  };
}

/** Detach an owned subtree without destroying its instance data; CM8 can restore this draft on undo. */
export function detachAssembly(outfit, instanceId) {
  if (validateOutfit(outfit).length) throw new Error('Cannot detach from a malformed outfit.');
  if (instanceId === outfit.rootId) throw new Error('Cannot detach the body.');
  if (!outfit.instances.some(i => i.id === instanceId)) throw new Error('Unknown placed item.');
  const removed = new Set([instanceId]);
  let changed;
  do {
    changed = false;
    for (const i of outfit.instances)
      if (removed.has(i.parentId) && !removed.has(i.id)) {
        removed.add(i.id);
        changed = true;
      }
  } while (changed);
  if (removed.has(outfit.rootId)) throw new Error('Invalid ownership reaches the body.');
  return {
    outfit: {...structuredClone(outfit), instances: structuredClone(outfit.instances.filter(i => !removed.has(i.id)))},
    draft: {version: 1, rootId: instanceId, instances: structuredClone(outfit.instances.filter(i => removed.has(i.id)))},
  };
}
