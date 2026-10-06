// Validate authored equipment definitions before resolving an outfit; no renderer or asset loading.
const record = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const name = v => typeof v === 'string' && v.length > 0;
const names = v => Array.isArray(v) && v.every(name) && new Set(v).size === v.length;
const vector = (v, n) => Array.isArray(v) && v.length === n && v.every(Number.isFinite);
const positive = v => Number.isSafeInteger(v) && v > 0;

export function validateCatalogue(catalogue) {
  const errors = [],
    ids = new Set();
  const fail = (id, message) => errors.push({code: 'definition', instanceId: null, itemId: id, message});
  if (!Array.isArray(catalogue)) return [{code: 'definition', instanceId: null, message: 'Equipment catalogue must be a list.'}];
  for (const d of catalogue) {
    if (!record(d) || !name(d.id)) {
      fail(null, 'Every definition needs an item ID.');
      continue;
    }
    if (ids.has(d.id)) fail(d.id, 'Item IDs must be unique.');
    ids.add(d.id);
    if (!name(d.family) || !name(d.skeletonId) || !name(d.fitProfile)) fail(d.id, 'Family, skeleton and fit profile are required.');
    for (const key of ['owner', 'excludes', 'coverage', 'materialRegions'])
      if (!names(d[key])) fail(d.id, `${key} must contain unique names.`);
    if (!Number.isSafeInteger(d.triangleCount) || d.triangleCount < 0) fail(d.id, 'Triangle cost must be a non-negative integer.');
    if (!Array.isArray(d.footprint) || d.footprint.length !== 2 || !d.footprint.every(positive))
      fail(d.id, 'Footprint needs positive integer columns and rows.');
    if (d.family === 'body') {
      if (
        d.mountType !== null ||
        d.owner?.length !== 0 ||
        d.complete !== true ||
        !names(d.coverageRegions) ||
        !names(d.compatibleSkeletons)
      )
        fail(d.id, 'A body needs complete surfaces, coverage regions, compatible skeletons and no owner/mount.');
    } else if (!name(d.mountType) || !Number.isFinite(d.depth)) fail(d.id, 'Equipment needs a mount type and authored depth in metres.');
    if (!Array.isArray(d.mounts)) {
      fail(d.id, 'Mounts must be a list.');
      continue;
    }
    const mountIds = new Set();
    for (const m of d.mounts) {
      if (!record(m)) {
        fail(d.id, 'Each mount must be an object.');
        continue;
      }
      if (!name(m.id) || mountIds.has(m.id) || !name(m.type)) fail(d.id, 'Mount IDs must be unique and have a type.');
      mountIds.add(m.id);
      if (!['socket', 'grid'].includes(m.kind)) fail(d.id, 'Mount kind must be socket or grid.');
      if (!vector(m.position, 3) || !vector(m.quaternion, 4) || Math.abs(Math.hypot(...(m.quaternion || [])) - 1) > 1e-5 || m.scale !== 1)
        fail(d.id, 'Mounts need finite positions, unit xyzw quaternions and unit scale.');
      if (!vector(m.depthRange, 2) || m.depthRange[0] > m.depthRange[1]) fail(d.id, 'Mount depth range is invalid.');
      if (m.kind === 'grid' && (!positive(m.columns) || !positive(m.rows) || !vector(m.spacing, 2) || m.spacing.some(v => v <= 0)))
        fail(d.id, 'Grids need positive cell counts and spacing in metres.');
    }
  }
  return errors;
}

export function validateOutfit(outfit) {
  if (!record(outfit) || outfit.version !== 1 || !name(outfit.rootId) || !Array.isArray(outfit.instances) || outfit.instances.length > 256)
    return [{code: 'outfit', instanceId: null, message: 'Expected an outfit version 1 with a root ID and at most 256 instances.'}];
  const errors = [],
    ids = new Set();
  for (const i of outfit.instances) {
    if (!record(i) || !name(i.id) || !name(i.itemId)) {
      errors.push({code: 'instance', instanceId: null, message: 'Every placed item needs an instance ID and item ID.'});
      continue;
    }
    if (ids.has(i.id)) errors.push({code: 'duplicate', instanceId: i.id, message: 'Placed item IDs must be unique.'});
    ids.add(i.id);
    if (i.id === outfit.rootId ? i.parentId !== null || i.mount !== null : !name(i.parentId) || !name(i.mount))
      errors.push({code: 'parent', instanceId: i.id, message: 'The body has no parent/mount; equipment needs both.'});
    if (!vector(i.cell, 2) || !i.cell.every(v => Number.isSafeInteger(v) && v >= 0))
      errors.push({code: 'cell', instanceId: i.id, message: 'Mount cells must be non-negative integers.'});
  }
  if (!ids.has(outfit.rootId)) errors.push({code: 'root', instanceId: outfit.rootId, message: 'The outfit body is missing.'});
  return errors;
}
