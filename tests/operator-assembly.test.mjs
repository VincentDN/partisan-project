// Exercise assembly ownership, compatibility, grid placement and conservative geometry/coverage accounting without WebGL.
import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveAssembly, detachAssembly} from '../operator/assembly.js';
import {validateCatalogue} from '../operator/assembly-schema.js';

import {catalogue, placed, outfit} from './fixtures/operator-assembly.mjs';

function deepFreeze(value) {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}
const codes = result => result.errors.map(e => e.code);

test('repeated items resolve parent-first without mutating definitions, finishes or outfit order', () => {
  const source = deepFreeze(outfit()),
    defs = deepFreeze(structuredClone(catalogue));
  const r = resolveAssembly(defs, source);
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  assert.deepEqual(r.budget, {triangles: 8218, limit: 15000, complete: true});
  assert.deepEqual(r.coverage, ['back', 'chest']);
  assert.equal(r.active.filter(i => i.itemId === 'pouch.mag').length, 2);
  r.active.forEach((i, n) => {
    if (i.parentId) assert.ok(r.active.slice(0, n).some(p => p.id === i.parentId));
  });
  assert.deepEqual(r, resolveAssembly(defs, {...source, instances: [...source.instances].reverse()}));
  r.active.find(i => i.id === 'mag-b').finish.fabric = 'black';
  assert.equal(source.instances.find(i => i.id === 'mag-b').finish.fabric, 'olive');
});

test('authored grid offsets are transformed in parent-local coordinates with no arbitrary scaling', () => {
  const defs = structuredClone(catalogue),
    m = defs[1].mounts[0];
  m.quaternion = [0, 0, Math.SQRT1_2, Math.SQRT1_2];
  const o = outfit();
  o.instances.find(i => i.id === 'mag-b').cell = [2, 1];
  const r = resolveAssembly(defs, o);
  assert.equal(r.ok, true);
  const t = r.active.find(i => i.id === 'mag-b').transform;
  [-0.105, 1.25, 0.13].forEach((v, i) => assert.ok(Math.abs(t.position[i] - v) < 1e-9));
  assert.deepEqual(t.quaternion, m.quaternion);
  assert.equal(t.scale, 1);
});

test('detach removes the entire owned subtree and restores coverage; draft can restore the exact outfit', () => {
  const o = deepFreeze(outfit()),
    {outfit: stripped, draft} = detachAssembly(o, 'vest');
  assert.deepEqual(
    stripped.instances.map(i => i.id),
    ['body'],
  );
  assert.equal(draft.instances.length, 5);
  assert.equal(draft.rootId, 'vest');
  assert.deepEqual(resolveAssembly(catalogue, stripped).coverage, []);
  assert.equal(resolveAssembly(catalogue, stripped).budget.triangles, 5568);
  assert.deepEqual(
    resolveAssembly(catalogue, {...stripped, instances: [...stripped.instances, ...draft.instances]}),
    resolveAssembly(catalogue, o),
  );
  assert.throws(() => detachAssembly(o, 'body'), /body/);
  assert.throws(() => detachAssembly(o, 'missing'), /Unknown/);
});

test('coverage remains until the last covering item is detached', () => {
  const defs = structuredClone(catalogue);
  defs[5].coverage = ['back'];
  const o = outfit();
  o.instances = o.instances.filter(i => !['radio', 'radio-pouch'].includes(i.id));
  o.instances.push(placed('bag', 'bag.day', 'body', 'back'));
  assert.deepEqual(resolveAssembly(defs, detachAssembly(o, 'vest').outfit).coverage, ['back']);
});

test('unknown definitions, missing parents, cycles and duplicate IDs fail atomically with recovery data untouched', () => {
  for (const [code, change] of [
    [
      'unknown-item',
      o => {
        o.instances[2].itemId = 'removed-pouch';
      },
    ],
    [
      'missing-parent',
      o => {
        o.instances[2].parentId = 'missing';
      },
    ],
    [
      'cycle',
      o => {
        o.instances[1].parentId = 'mag-a';
      },
    ],
    [
      'duplicate',
      o => {
        o.instances.push(structuredClone(o.instances[2]));
      },
    ],
    [
      'root',
      o => {
        o.rootId = 'absent';
      },
    ],
  ]) {
    const o = outfit();
    change(o);
    const snapshot = structuredClone(o),
      r = resolveAssembly(catalogue, o);
    assert.ok(codes(r).includes(code), JSON.stringify(r.errors));
    assert.equal(r.ok, false);
    assert.deepEqual(r.active, []);
    assert.deepEqual(r.coverage, []);
    assert.deepEqual(o, snapshot);
    if (code === 'unknown-item') assert.equal(r.budget.complete, false);
  }
});

test('parent families, mount types, fit versions, skeletons, depth and coverage each report a distinct reason', () => {
  for (const [code, change] of [
    [
      'owner',
      d => {
        d[2].owner = ['bag'];
      },
    ],
    [
      'mount-type',
      d => {
        d[2].mountType = 'belt-loop';
      },
    ],
    [
      'fit',
      d => {
        d[2].fitProfile = 'different-body';
      },
    ],
    [
      'skeleton',
      d => {
        d[2].skeletonId = 'incompatible-v3';
      },
    ],
    [
      'depth',
      d => {
        d[2].depth = 0.1;
      },
    ],
    [
      'coverage',
      d => {
        d[2].coverage = ['missing-torso'];
      },
    ],
  ]) {
    const defs = structuredClone(catalogue);
    change(defs);
    const r = resolveAssembly(defs, outfit());
    assert.ok(codes(r).includes(code), code);
    assert.equal(r.ok, false);
    assert.ok(r.errors.every(e => e.message.length > 10));
  }
  const o = outfit();
  o.instances[2].mount = 'absent';
  assert.ok(codes(resolveAssembly(catalogue, o)).includes('mount'));
});

test('footprints fit the last cell exactly, reject overlap/overflow and remain independent on different surfaces', () => {
  for (const [cell, expected] of [
    [[4, 1], null],
    [[5, 1], 'footprint'],
    [[4, 2], 'footprint'],
    [[1, 0], 'overlap'],
  ]) {
    const o = outfit();
    o.instances.find(i => i.id === 'mag-b').cell = cell;
    const r = resolveAssembly(catalogue, o);
    if (expected) assert.ok(codes(r).includes(expected));
    else assert.equal(r.ok, true);
  }
  const o = outfit();
  o.instances = o.instances.filter(i => !['radio', 'radio-pouch'].includes(i.id));
  Object.assign(
    o.instances.find(i => i.id === 'mag-b'),
    {mount: 'rear', cell: [0, 0]},
  );
  assert.equal(resolveAssembly(catalogue, o).ok, true);
  o.instances.push(placed('vest-2', 'carrier.light', 'body', 'chest'));
  assert.ok(codes(resolveAssembly(catalogue, o)).includes('overlap'));
});

test('one-sided family exclusions reject the same outfit regardless of instance order', () => {
  const o = outfit();
  o.instances.push(placed('bag', 'bag.day', 'body', 'back'));
  const r = resolveAssembly(catalogue, o);
  assert.ok(codes(r).includes('exclusion'));
  assert.deepEqual(r, resolveAssembly(catalogue, {...o, instances: [...o.instances].reverse()}));
  assert.equal(resolveAssembly(catalogue, detachAssembly(o, 'radio').outfit).ok, true);
});

test('triangle accounting includes repeated, hidden and covered geometry and enforces the exact limit', () => {
  const o = outfit();
  o.instances[2].visible = false;
  assert.equal(resolveAssembly(catalogue, o, {triangleLimit: 8218}).ok, true);
  const r = resolveAssembly(catalogue, o, {triangleLimit: 8217});
  assert.ok(codes(r).includes('budget'));
  assert.equal(r.budget.triangles, 8218);
  assert.equal(r.budget.complete, true);
  assert.equal(resolveAssembly(catalogue, o, {triangleLimit: NaN}).ok, false);
});

test('numeric overflow in authored spacing or total cost cannot produce a valid assembly', () => {
  const defs = structuredClone(catalogue);
  defs[1].mounts[0].spacing = [Number.MAX_VALUE, 0.03];
  assert.ok(codes(resolveAssembly(defs, outfit())).includes('placement'));
  defs[1].mounts[0].spacing = [0.025, 0.03];
  defs[2].triangleCount = Number.MAX_SAFE_INTEGER;
  const r = resolveAssembly(defs, outfit());
  assert.ok(codes(r).includes('budget'));
  assert.equal(r.budget.complete, false);
});

test('malformed author data and imported outfits fail with reasons instead of NaN placements or exceptions', () => {
  for (const value of [null, {}, {version: 99}, {...outfit(), instances: [null]}, {...outfit(), instances: Array(257).fill({})}])
    assert.equal(resolveAssembly(catalogue, value).ok, false);
  for (const cell of [[-1, 0], [0.5, 0], [NaN, 0], [0], '0,0']) {
    const o = outfit();
    o.instances[2].cell = cell;
    assert.ok(codes(resolveAssembly(catalogue, o)).includes('cell'));
  }
  for (const change of [
    d => {
      d[0].complete = false;
    },
    d => {
      d[2].triangleCount = -1;
    },
    d => {
      d[2].footprint = [0, 2];
    },
    d => {
      d[1].mounts[0].quaternion = [0, 0, 0, 2];
    },
    d => {
      d[1].mounts[0].position = null;
    },
    d => {
      d[1].mounts[0].scale = 2;
    },
    d => {
      d[1].mounts[0].spacing = [0, 1];
    },
    d => {
      d[1].mounts[0].depthRange = [1, 0];
    },
    d => {
      d.push(structuredClone(d[1]));
    },
    d => {
      d[1].mounts.push(structuredClone(d[1].mounts[0]));
    },
  ]) {
    const defs = structuredClone(catalogue);
    change(defs);
    assert.ok(validateCatalogue(defs).length);
    assert.equal(resolveAssembly(defs, outfit()).ok, false);
  }
});
