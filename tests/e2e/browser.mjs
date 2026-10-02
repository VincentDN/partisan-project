// Shared helpers for the browser tests: static server + headless Chromium with software WebGL.
import {chromium} from 'playwright-core';
import {spawn} from 'node:child_process';

export async function startServer(port = 8199, root = process.env.ROOT || '.') {
  const proc = spawn('node', ['tools/serve.mjs'], {env: {...process.env, PORT: String(port), ROOT: root}, stdio: 'ignore'});
  for (let i = 0; i < 40; i++) {
    try {
      if ((await fetch(`http://localhost:${port}/`)).ok) break;
    } catch {}
    await new Promise(r => setTimeout(r, 100));
  }
  return {url: `http://localhost:${port}/`, stop: () => proc.kill()};
}
export async function launch() {
  return chromium.launch({
    executablePath: process.env.CHROMIUM || undefined,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'],
  });
}
/** Open a page that records console errors, page errors and failed requests. */
export async function open(browser, url, opts = {}) {
  const page = await browser.newPage({viewport: {width: 1280, height: 800}, reducedMotion: 'reduce', ...opts});
  page.problems = [];
  (browser.openPages ||= []).push(page); // closed after each smoke check, pass or fail
  page.on('console', m => {
    if (m.type() === 'error') page.problems.push('console: ' + m.text());
  });
  page.on('pageerror', e => page.problems.push('pageerror: ' + e.message));
  page.on('requestfailed', r => page.problems.push(`requestfailed: ${r.url()} (${r.failure()?.errorText})`));
  page.on('response', r => {
    if (r.status() >= 400) page.problems.push(`http ${r.status()}: ${r.url()}`);
  });
  await page.goto(url);
  return page;
}
