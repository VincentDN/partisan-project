// One loader everywhere (shared/loader.css, shared/loader.js): every page that shows a loading state uses the Nokia
// LCD loader and links its stylesheet; the older loaders (the map's sky-blue screen, the viewer ring, plain status
// lines) are gone; reduced motion stops it.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const PAGES = [
  'map/index.html',
  'map/3d.html',
  'band/index.html',
  'wiki/index.html',
  'convoy/index.html',
  'viewer/index.html',
  'workbench/index.html',
  'operator/index.html',
  'operator/compare.html',
  'operator/teardown.html',
  'operator/foundation.html',
  'intro/index.html',
  'intro/advanced.html',
];
const read = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

for (const p of PAGES)
  test(`loader: ${p} uses the shared loader`, () => {
    const html = read(p);
    assert.match(html, /<link rel="stylesheet" href="\.\.\/shared\/loader\.css">/, 'links shared/loader.css');
    const card = html.match(/<div[^>]*class="nk-loader[^"]*"[^>]*>(.*?)<\/div>/);
    assert.ok(card, 'has an nk-loader card');
    assert.match(card[0], /role="status"/, 'announced as a status');
    assert.match(card[1], /<span class="nk-spin" aria-hidden="true"><\/span><span class="nk-text">[^<.…]+<\/span>/, 'spinner and message');
    assert.doesNotMatch(html, /viewer-loading|viewer-spinner|class="loading"/, 'no older loader left');
  });

test('loader: the stylesheet stops the spinner and the dots for reduced motion', () => {
  const css = read('shared/loader.css');
  const reduced = css.slice(css.indexOf('prefers-reduced-motion'));
  assert.match(reduced, /\.nk-spin::before/);
  assert.match(reduced, /animation: none/);
});
