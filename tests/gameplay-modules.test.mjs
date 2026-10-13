// Keep standalone 3-D demos out of gameplay's transitive module graph, including lazy imports.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {parse} from 'espree'; // ESLint's parser, already supplied by the lint toolchain

function graph(entry, seen = new Set()) {
  if (seen.has(entry)) return seen;
  seen.add(entry);
  const ast = parse(readFileSync(entry, 'utf8'), {ecmaVersion: 'latest', sourceType: 'module'});
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    const spec = ['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration', 'ImportExpression'].includes(node.type)
      ? node.source?.value
      : null;
    if (typeof spec === 'string' && spec.startsWith('.')) {
      const file = path.posix.normalize(path.posix.join(path.posix.dirname(entry), spec));
      if (file.endsWith('.js')) graph(file, seen);
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === 'object') visit(value);
    }
  }
  visit(ast);
  return seen;
}

for (const entry of ['shell.js', 'assets/js/index.js', 'menu/menu.js', 'map/map.js', 'band/band.js', 'convoy/sprite-game.js']) {
  test(`${entry} cannot import a demo, even lazily`, () => {
    const files = [...graph(entry)];
    assert.deepEqual(
      files.filter(f => /^(operator|workbench|intro|viewer)\//.test(f) || /^map\/(models|demo-3d)\.js$/.test(f)),
      [],
    );
  });
}

test('each map page has its own entry; only the demo reaches the operator rig', () => {
  assert.match(readFileSync('map/index.html', 'utf8'), /src="\.\/map.js"/);
  assert.match(readFileSync('map/3d.html', 'utf8'), /src="\.\/demo-3d.js"/);
  assert.ok(graph('map/demo-3d.js').has('operator/rig.js'));
  assert.ok(graph('map/map.js').has('map/vehicles.js'), 'campaign retains solid convoy models');
});
