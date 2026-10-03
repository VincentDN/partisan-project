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

test('the Sketchfab importer scales to real size, keeps weapon units for the Workbench, and maps nodes', async () => {
  const os = await import('node:os');
  const fs = await import('node:fs');
  const path = await import('node:path');
  const {importSource, DU_SCALE} = await import('../tools/assets/import-sketchfab.mjs');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-'));
  fs.mkdirSync(path.join(tmp, 'in', 'x'), {recursive: true});
  fs.copyFileSync('assets/models/weapons/ak-74m-zenitco.glb', path.join(tmp, 'in', 'x', 'scene.glb'));
  const opts = {inDir: path.join(tmp, 'in'), outRoot: path.join(tmp, 'out'), register: null};
  const du = await importSource({id: 'x', name: 'stand-in', unit: 'du', dir: 'weapons'}, opts);
  assert.equal(du.size, 0.943, 'D_U units: the AK-74M comes out at its real 943 mm');
  assert.equal(du.scale, +DU_SCALE.toPrecision(6), 'weapons keep source units; the models.js scale is printed');
  assert.ok(
    du.tree.some(l => l.includes('ak74m receiver')),
    'node names survive for part mapping',
  );
  const prop = await importSource({id: 'x', name: 'stand-in', length: 2, dir: 'props'}, opts);
  assert.equal(prop.size, 2);
  assert.equal(prop.scale, 1, 'props get their real size baked in');
  fs.rmSync(tmp, {recursive: true, force: true});
});

test('outbound/sketchfab-download.py is the current standalone build of the downloader and its model list', async () => {
  const fs = await import('node:fs');
  const {build} = await import('../tools/assets/build-outbound-downloader.mjs');
  assert.equal(
    fs.readFileSync('outbound/sketchfab-download.py', 'utf8'),
    build(),
    'stale: run node tools/assets/build-outbound-downloader.mjs',
  );
  const {sources} = JSON.parse(fs.readFileSync('tools/assets/sketchfab-sources.json', 'utf8'));
  assert.ok(sources.length >= 39);
  for (const s of sources) assert.match(s.uid, /^[0-9a-f]{32}$/, `${s.id}: bad uid`);
});
