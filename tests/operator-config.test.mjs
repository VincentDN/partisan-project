// Operator Customiser data: slots, parts, zones and palettes against the real model manifest.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PARTS, SLOTS, ZONES, PALETTES, VIEWS, TRIANGLE_BUDGET, PRESETS, ROSTER} from '../operator/config.js';

const manifest = JSON.parse(fs.readFileSync('assets/models/operators/base-operator.manifest.json', 'utf8'));
const nodes = new Map(manifest.meshes.map(m => [m.node, m]));

test('Base Operator model is within budget and well-formed', () => {
  assert.ok(fs.existsSync('assets/models/operators/base-operator.glb'));
  assert.equal(manifest.meshes.length, 21);
  assert.equal(manifest.bones.length, 83);
  assert.ok(manifest.triangles <= TRIANGLE_BUDGET, `${manifest.triangles} tris > ${TRIANGLE_BUDGET}`);
  assert.ok(fs.statSync('assets/models/operators/base-operator.glb').size < 1.5 * 1024 * 1024, 'GLB must stay under 1.5 MB');
});

test('every part names real nodes and real materials', () => {
  for (const [id, part] of Object.entries(PARTS)) {
    for (const n of part.nodes) assert.ok(nodes.has(n), `${id}: node ${n} not in model`);
    for (const m of part.materials || []) assert.ok(part.nodes.some(n => nodes.get(n).materials.includes(m)), `${id}: material ${m} not in its nodes`);
  }
});

test('slots: unique ids, default option exists, options only show known parts', () => {
  const seen = new Set();
  for (const s of SLOTS) {
    assert.ok(!seen.has(s.id), `duplicate slot ${s.id}`); seen.add(s.id);
    assert.ok(s.options.some(o => o.id === s.default), `${s.id}: default ${s.default} missing`);
    assert.equal(new Set(s.options.map(o => o.id)).size, s.options.length, `${s.id}: duplicate option ids`);
    assert.ok(VIEWS[s.camera], `${s.id}: unknown camera ${s.camera}`);
    for (const o of s.options) for (const p of o.show) assert.ok(PARTS[p], `${s.id}/${o.id}: unknown part ${p}`);
  }
});

test('no part is shown by two different slots (they would fight)', () => {
  const owner = new Map();
  for (const s of SLOTS) for (const o of s.options) for (const p of o.show) {
    if (owner.has(p) && owner.get(p) !== s.id) assert.fail(`part ${p} controlled by ${owner.get(p)} and ${s.id}`);
    owner.set(p, s.id);
  }
});

test('colour zones target real materials and real palettes', () => {
  const materials = new Set(manifest.materials.map(m => m.name));
  for (const z of ZONES) {
    assert.ok(PALETTES[z.palette], `${z.id}: palette ${z.palette}`);
    for (const m of z.materials) assert.ok(materials.has(m), `${z.id}: material ${m} not in model`);
    assert.ok(VIEWS[z.camera], `${z.id}: camera`);
    if (z.textured) for (const m of z.materials) assert.ok(manifest.materials.find(x => x.name === m).textured, `${z.id}: ${m} should be textured`);
  }
});

test('presets only use known slot and zone values', () => {
  for (const p of PRESETS) for (const [k, v] of Object.entries(p.state)) {
    if (k.startsWith('z.')) assert.ok(ZONES.find(z => z.id === k.slice(2)), `${p.id}: zone ${k}`);
    else assert.ok(SLOTS.find(s => s.id === k)?.options.some(o => o.id === v), `${p.id}: ${k}=${v}`);
  }
});

test('default look fits the triangle budget with the largest equipment on', () => {
  const total = manifest.meshes.reduce((n, m) => n + m.triangles, 0);
  assert.ok(total <= TRIANGLE_BUDGET);
  assert.ok(ROSTER.some(r => r.status === 'available'));
});
