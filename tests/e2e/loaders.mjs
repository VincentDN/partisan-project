// Every maintained page starts with centred, named loading feedback; measurable progress and failure states remain accessible.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {launch, startServer} from './browser.mjs';
const server = await startServer(8226),
  browser = await launch();
try {
  for (const path of [
    'map/index.html',
    'map/3d.html',
    'workbench/index.html',
    'operator/index.html',
    'viewer/index.html',
    'convoy/index.html',
    'band/index.html',
    'wiki/index.html',
    'operator/compare.html',
    'operator/foundation.html',
    'operator/teardown.html',
  ]) {
    const html = fs.readFileSync(path, 'utf8');
    const entry = [...html.matchAll(/<script type="module" src="([^"]+)"/g)].at(-1)[1];
    const url = new URL(path, server.url).href,
      module = new URL(entry, url).href;
    const p = await browser.newPage({viewport: {width: 1280, height: 800}, reducedMotion: 'reduce'});
    let release;
    const gate = new Promise(resolve => (release = resolve));
    await p.route(module, async route => {
      await gate;
      if (!p.isClosed()) await route.continue().catch(() => {});
    });
    await p.goto(url, {waitUntil: 'commit'});
    await p.locator('.nk-bar').waitFor();
    const position = await p.locator('.nk-loader').evaluate(e => {
      const r = e.getBoundingClientRect(),
        parent = e.classList.contains('nk-fixed')
          ? {left: 0, top: 0, width: innerWidth, height: innerHeight}
          : e.parentElement.getBoundingClientRect();
      return {x: r.x + r.width / 2, y: r.y + r.height / 2, cx: parent.left + parent.width / 2, cy: parent.top + parent.height / 2};
    });
    assert.ok(Math.abs(position.x - position.cx) < 3 && Math.abs(position.y - position.cy) < 3, `${path}: ${JSON.stringify(position)}`);
    assert.ok((await p.locator('.nk-text').innerText()).length > 8);
    if (process.env.LOADER_SHOT && path === 'workbench/index.html') await p.screenshot({path: process.env.LOADER_SHOT});
    await p.evaluate(async () => {
      const {loaderProgress} = await import('/shared/loader.js');
      loaderProgress(document.querySelector('.nk-loader'), 0.5);
    });
    assert.equal(await p.locator('.nk-bar').getAttribute('aria-valuenow'), '50');
    await p.evaluate(async () => {
      const {loaderError} = await import('/shared/loader.js');
      loaderError(document.querySelector('.nk-loader'), 'Test failure: reload to retry.');
    });
    assert.equal(await p.locator('.nk-loader').getAttribute('role'), 'alert');
    assert.equal(await p.locator('.nk-bar').isVisible(), false);
    release();
    await p.close();
    console.log(`${path}: centred phase, progress and error states passed`);
  }
} finally {
  await browser.close();
  server.stop();
}
