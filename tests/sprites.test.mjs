// 2.5-D sprite art: a gun sprite for every Workbench rifle, and the manifest gives each its real length.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {MODELS} from '../workbench/models.js';

const manifest = JSON.parse(fs.readFileSync('assets/sprites/weapons/manifest.json', 'utf8'));

test('weapon sprites: one per Workbench rifle, each file present, lengths in metres', () => {
  assert.deepEqual(Object.keys(manifest).sort(), Object.keys(MODELS).sort());
  for (const [id, g] of Object.entries(manifest)) {
    assert.ok(fs.existsSync(`assets/sprites/weapons/${g.file}`), `${id}: file`);
    assert.ok(g.length > 0.5 && g.length < 1.5, `${id}: ${g.length} m`);
    assert.equal(g.label, MODELS[id].label);
  }
});
