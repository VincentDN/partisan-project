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
/**
 * Headless Chromium. Closing it reports every console error, page error, failed request and HTTP error any page
 * opened with open() recorded (WP-QA3), and fails the run: a suite can pass its own checks and still have broken
 * something on the way. A page may list expected problems in `page.allowProblems` (regular expressions).
 */
export async function launch() {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM || undefined,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'],
  });
  const close = browser.close.bind(browser);
  browser.close = async () => {
    for (const p of browser.openPages || []) p.closing = true;
    const problems = (browser.openPages || []).flatMap(p =>
      (p.problems || []).filter(x => !(p.allowProblems || []).some(re => re.test(x))).map(x => `${p.openedAt}: ${x}`),
    );
    await close();
    if (problems.length) {
      console.error(`\n${problems.length} page problem(s):\n  ` + [...new Set(problems)].join('\n  '));
      process.exitCode = 1;
    }
  };
  return browser;
}
/** Wait until the Operator has applied its rig and weapon transforms in an actual rendered frame. */
export async function operatorRendered(page) {
  const frame = await page.evaluate(() => window.PARP_OPERATOR.stage.renderer.info.render.frame);
  await page.waitForFunction(frame => window.PARP_OPERATOR.stage.renderer.info.render.frame > frame, frame);
}
/** Open a page that records console errors, page errors and failed requests. */
export async function open(browser, url, opts = {}) {
  const page = await browser.newPage({viewport: {width: 1280, height: 800}, reducedMotion: 'reduce', ...opts});
  page.problems = [];
  page.openedAt = url.replace(/^https?:\/\/[^/]+\//, '/');
  (browser.openPages ||= []).push(page); // closed after each smoke check, pass or fail
  // what happens while a test tears a page down (loads cancelled by the close or a navigation) is not a problem
  const note = x => page.closing || page.leaving || page.problems.push(x);
  // a reload or a navigation away is teardown for the document being left, until the next one has loaded
  page.on('request', r => {
    if (r.isNavigationRequest() && r.frame() === page.mainFrame() && page.loadedOnce) page.leaving = true;
  });
  page.on('domcontentloaded', () => {
    page.leaving = false;
    page.loadedOnce = true;
  });
  const close = page.close.bind(page);
  page.close = (...a) => ((page.closing = true), close(...a));
  page.on('console', m => {
    if (m.type() === 'error') note('console: ' + m.text());
  });
  page.on('pageerror', e => note('pageerror: ' + e.message));
  page.on('requestfailed', r => {
    if (r.failure()?.errorText !== 'net::ERR_ABORTED') note(`requestfailed: ${r.url()} (${r.failure()?.errorText})`);
  });
  page.on('response', r => {
    if (r.status() >= 400) note(`http ${r.status()}: ${r.url()}`);
  });
  await page.goto(url);
  return page;
}

/**
 * Wait until the page has rendered `n` more animation frames (WP-QA16). Use it instead of a fixed sleep: to let a
 * change settle before a screenshot, or to check that something does not move over a few frames. A software-rendered
 * browser on a busy machine may take seconds per frame; frames, not milliseconds, are what matter.
 */
export async function frames(page, n = 3) {
  await page.evaluate(
    k =>
      new Promise(done => {
        const tick = () => (--k <= 0 ? done() : requestAnimationFrame(tick));
        requestAnimationFrame(tick);
      }),
    n,
  );
}
