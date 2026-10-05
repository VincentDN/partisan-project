// Keep the source audit and authoring contract grounded in unchanged assets and measured skeleton data.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const read = p => JSON.parse(fs.readFileSync(p));
const audit = read('assets/models/operators/recon-source-audit.json');
const contract = read('tools/assets/recon-modular-contract.json');
const digest = p => createHash('sha256').update(fs.readFileSync(p)).digest('hex');
test('source inspection is an exact copy; audit pins all three local model baselines', () => {
  assert.equal(digest(audit.source.path), audit.source.sha256);
  assert.equal(digest('assets/models/operators/recon-split-reference.glb'), audit.source.sha256);
  assert.equal(digest('assets/models/operators/recon-original.glb'), audit.complete.sha256);
  assert.equal(digest('assets/models/operators/generated-recon.glb'), audit.current.sha256);
  assert.equal(
    audit.parts.reduce((n, p) => n + p.triangles, 0),
    audit.source.triangles,
  );
  assert.equal(
    audit.current.meshes.reduce((n, p) => n + p.triangles, 0),
    audit.current.triangles,
  );
});
test('every source part has a measured boundary and a specific rebuild decision', () => {
  assert.deepEqual(
    audit.parts.map(p => p.id),
    Array.from({length: 27}, (_, i) => i),
  );
  for (const p of audit.parts) {
    assert.ok(p.triangles > 0 && p.boundaryEdges > 0 && p.boundaryEdges <= p.triangles * 3);
    assert.ok(['reuse-fit', 'repair', 'rebuild', 'replace', 'discard'].includes(p.decision));
    assert.ok(p.module && p.note.length > 30 && p.sourceNode);
    assert.ok(p.center.every((n, i) => n >= p.bounds.min[i] && n <= p.bounds.max[i]));
    assert.ok(p.at.length === 3 && p.at.every(Number.isFinite));
  }
  assert.equal(audit.parts[4].category, 'fused');
  assert.equal(audit.parts[25].decision, 'replace');
  assert.equal(audit.parts[21].module, 'clothing.cuff-r');
});
test('the canonical skeleton explicitly retains the corrected hand frames', () => {
  assert.equal(contract.skeleton.baselineSha256, audit.current.sha256);
  assert.equal(audit.current.bones.length, 26);
  assert.deepEqual(audit.differingBones, ['hand_r', 'hand_l']);
  const names = new Set(audit.current.bones.map(b => b.name));
  for (const bone of audit.current.bones) {
    assert.ok(bone.name === 'root' || names.has(bone.parent));
    for (const field of ['localMatrix', 'worldMatrix']) assert.ok(bone[field].length === 16 && bone[field].every(Number.isFinite));
    const upstream = audit.upstream.bones.find(b => b.name === bone.name);
    if (!audit.differingBones.includes(bone.name)) assert.deepEqual(bone, upstream);
  }
  for (const m of contract.modules) {
    assert.ok(names.has(m.ownerBone));
    assert.ok(m.sourceParts.every(id => audit.parts.some(p => p.id === id)));
  }
});
test('modular geometry allocations fit the whole character cap', () => {
  assert.equal(
    Object.values(contract.budget.allocation).reduce((a, b) => a + b, 0),
    15000,
  );
  assert.equal(
    Object.values(contract.budget.bodyAllocation).reduce((a, b) => a + b, 0),
    contract.budget.allocation.bodyClothing,
  );
  assert.equal(contract.budget.operatorMaximum, 15000);
  assert.equal(contract.mounts.uniformScale, 1);
  assert.equal(contract.mounts.transformSpace, 'parent-local');
});
