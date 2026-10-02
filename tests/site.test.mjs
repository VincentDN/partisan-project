// Builds the allowlisted site into a temp dir and runs the link/import checker on it.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const out = fs.mkdtempSync(path.join(os.tmpdir(), 'parp-site-'));
test('site builds and every link, import and import-map target resolves', () => {
  execFileSync('node', ['tools/build-site.mjs', out], {encoding: 'utf8'});
  const res = execFileSync('node', ['tools/check-site.mjs', out], {encoding: 'utf8'});
  assert.match(res, /site OK/);
});
test('internal documents and raw sources are not published', () => {
  const published = f => fs.existsSync(path.join(out, f));
  for (const f of [
    'docs/agent-ops',
    'docs/adr',
    'docs/archive',
    'docs/ai',
    'tools',
    'tests',
    'package.json',
    'AGENTS.md',
    'assets-incoming',
    'build',
  ])
    assert.ok(!published(f), `${f} must not be published`);
  for (const f of [
    'index.html',
    'shell.js',
    'intro/index.html',
    'menu/index.html',
    'docs/game-design-master-doc.html',
    'docs/master-roadmap.html',
    'docs/packets.json',
    'workbench/index.html',
    'operator/index.html',
    'intro/advanced.html',
    'viewer/index.html',
    '.nojekyll',
  ])
    assert.ok(published(f), `${f} must be published`);
});
test('no published .md, .blend or .fbx files', () => {
  const walk = d =>
    fs.readdirSync(d, {withFileTypes: true}).flatMap(e => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  assert.deepEqual(
    walk(out).filter(f => /\.(md|blend|fbx)$/i.test(f)),
    [],
  );
});
test('roadmap HTML links to the repo for documents and to the site for demos', () => {
  const html = fs.readFileSync(path.join(out, 'docs/master-roadmap.html'), 'utf8');
  assert.match(html, /github\.com\/VincentDN\/partisan-project\/blob\/main\/docs\/agent-ops\/README\.md/);
  assert.match(html, /href="\.\.\/workbench\/"|topbar\.js/);
});

test('version is consistent across VERSION, index, design doc and package.json', () => {
  const v = fs.readFileSync('VERSION', 'utf8').trim();
  assert.match(fs.readFileSync('menu/index.html', 'utf8'), new RegExp(`PARP_VERSION="${v.replace(/\./g, '\\.')}"`));
  assert.match(
    fs.readFileSync('docs/game-design-master-doc.html', 'utf8'),
    new RegExp(`name="version" content="${v.replace(/\./g, '\\.')}"`),
  );
  assert.equal(JSON.parse(fs.readFileSync('package.json', 'utf8')).version, v);
  assert.match(fs.readFileSync('CHANGELOG.md', 'utf8'), new RegExp(`## \\[${v.replace(/\./g, '\\.')}\\]`));
});

test('every published page is hidden from search: noindex, nofollow, noarchive and seo_hidden', () => {
  const pages = [];
  const walk = d =>
    fs
      .readdirSync(d, {withFileTypes: true})
      .forEach(e => (e.isDirectory() ? walk(path.join(d, e.name)) : /\.html$/.test(e.name) && pages.push(path.join(d, e.name))));
  walk(out);
  assert.ok(pages.length >= 9);
  for (const p of pages) {
    const html = fs.readFileSync(p, 'utf8');
    assert.match(html, /name="robots" content="[^"]*noindex[^"]*nofollow[^"]*noarchive/, `${p}: robots`);
    assert.match(html, /name="seo_hidden" content="true"/, `${p}: seo_hidden`);
  }
});
