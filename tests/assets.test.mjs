// Asset register: every shipped file registered, licences approved, pipeline items well-formed.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadRegister, audit, toMarkdown} from '../tools/assets/register-lib.mjs';

const reg = loadRegister();
test('register audit is clean', () => assert.deepEqual(audit(reg), []));
test('ids are unique across assets and pipeline', () => {
  const ids = [...reg.assets.map(a => a.id), ...reg.pipeline.map(p => p.id)];
  assert.equal(new Set(ids).size, ids.length);
});
test('pipeline items name what blocks them and where candidates may come from', () => {
  for (const p of reg.pipeline) {
    assert.ok(p.blocked_by, `${p.id}: blocked_by`);
    assert.ok(p.status === 'pending' || p.status === 'placeholder', `${p.id}: status`);
  }
});
test('every GLB has a triangle budget', () => {
  for (const a of reg.assets.filter(a => a.path.endsWith('.glb'))) assert.ok(a.budget?.triangles > 0, `${a.id}: budget`);
});
test('assets/REGISTER.md is generated from the register (run: node tools/assets/register.mjs md)', () => {
  assert.equal(fs.readFileSync('assets/REGISTER.md', 'utf8'), toMarkdown(reg));
});
test('no raw purchased sources or ripped audio ship in the repository tree', () => {
  const bad = [];
  const walk = d =>
    fs.readdirSync(d, {withFileTypes: true}).forEach(e => {
      if (['node_modules', '.git', '_site', 'build', 'assets-incoming'].includes(e.name)) return;
      const p = `${d}/${e.name}`;
      if (e.isDirectory()) walk(p);
      else if (/\.(blend|fbx)$/i.test(e.name) || /(^|\/)sfx\/(cuts|reels)/.test(p)) bad.push(p);
    });
  walk('.');
  assert.deepEqual(bad, []);
});
