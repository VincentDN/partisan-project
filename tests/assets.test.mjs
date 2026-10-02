// Asset sanity: the weapon and operator models carry a triangle budget for the Asset Viewer.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const reg = JSON.parse(fs.readFileSync('assets/register.json', 'utf8'));
test('every GLB has a triangle budget', () => {
  for (const a of reg.assets.filter(a => a.path.endsWith('.glb'))) assert.ok(a.budget?.triangles > 0, `${a.id}: budget`);
});
test('no .blend or .fbx source files are tracked in the shipped folders', () => {
  const bad = [];
  const walk = d =>
    fs.readdirSync(d, {withFileTypes: true}).forEach(e => {
      if (['node_modules', '.git', '_site', 'build', 'assets-incoming'].includes(e.name)) return;
      const p = `${d}/${e.name}`;
      if (e.isDirectory()) walk(p);
      else if (/\.(blend|fbx)$/i.test(e.name)) bad.push(p);
    });
  walk('.');
  assert.deepEqual(bad, []);
});
