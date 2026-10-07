// Performance budgets (WP-QA2). Two measurements and a stored baseline (docs/perf-baseline.json):
//   sim    every level, two seeds, 120 simulated seconds on Hard with the player firing: ms per step (mean, p99,
//          worst) and the process's CPU time, so a busy machine skews it less than wall time alone; each number is
//          the median of three runs
//   pages  cold load of each page in headless Chromium: requests, bytes, time until the page says it is ready, and
//          the bytes once the network is quiet (what it loads after it is ready: terrain, sounds, models)
//   node tools/perf/bench.mjs sim|pages|all [--write] [--check]
// --write stores the result as the new baseline; --check fails on a regression over 20 % (a mean, p99 or bytes;
// the worst single step is reported, not checked: it is the noisiest number).
import fs from 'node:fs';
import {Sim} from '../../convoy/sim.js';
import {LEVELS} from '../../convoy/levels/index.js';

const BASELINE = new URL('../../docs/perf-baseline.json', import.meta.url);
const TOLERANCE = 1.2;

/** The sim benchmark three times over, each number the median of the three (one run is too noisy to budget on). */
export function simBench(opts = {}) {
  const runs = [simRun(opts), simRun(opts), simRun(opts)];
  const med = vs => vs.sort((a, b) => a - b)[1];
  return Object.fromEntries(
    Object.keys(runs[0]).map(level => [
      level,
      Object.fromEntries(Object.keys(runs[0][level]).map(k => [k, med(runs.map(r => r[level][k]))])),
    ]),
  );
}

function simRun({seconds = 120, seeds = [3, 4]} = {}) {
  const out = {};
  for (const level of Object.keys(LEVELS)) {
    const times = [];
    const cpu0 = process.cpuUsage();
    for (const seed of seeds) {
      const sim = new Sim({level, seed, difficulty: 'hard'});
      for (let i = 0; i < seconds * 60 && !sim.outcome; i++) {
        const foe = sim.units.find(u => u.side === 'army' && u.alive && !u.escaped);
        const t = performance.now();
        sim.step(1 / 60, foe && sim.time > 10 ? {ax: foe.x, az: foe.z, fire: true} : {});
        times.push(performance.now() - t);
      }
    }
    const cpu = process.cpuUsage(cpu0);
    times.sort((a, b) => a - b);
    const r = v => Math.round(v * 1000) / 1000;
    out[level] = {
      steps: times.length,
      meanMs: r(times.reduce((a, b) => a + b, 0) / times.length),
      p99Ms: r(times[Math.floor(times.length * 0.99)]),
      worstMs: r(times.at(-1)),
      cpuMs: Math.round((cpu.user + cpu.system) / 1000),
    };
  }
  return out;
}

/** Each page and how it says it is ready. */
const PAGES = {
  'convoy/?seed=3': () => window.PARP_SPRITES?.ready,
  'map/': () => window.PARP_MAP?.ready,
  'map25/': () => window.PARP_MAP?.ready,
  'inventory/': () => window.PARP_INV?.ready,
  'band/': () => window.PARP_BAND?.ready,
  'menu/': () => window.PARP_MENU?.ready,
  'workbench/': () => !!window.PARP_WORKBENCH?.rifle,
  'operator/': () => window.PARP_OPERATOR?.ready,
};

export async function pageBench(pages = Object.keys(PAGES)) {
  const {launch, open, startServer} = await import('../../tests/e2e/browser.mjs');
  const server = await startServer(8185),
    browser = await launch();
  const out = {};
  try {
    for (const url of pages) {
      const page = await open(browser, 'about:blank');
      // the browser's own resource timing: every request the page made and its decoded size
      const loaded = () =>
        page.evaluate(() => {
          const all = [...performance.getEntriesByType('navigation'), ...performance.getEntriesByType('resource')];
          return {requests: all.length, kb: Math.round(all.reduce((s, e) => s + (e.decodedBodySize || 0), 0) / 1024)};
        });
      const t = Date.now();
      await page.goto(server.url + url);
      await page.waitForFunction(PAGES[url], null, {timeout: 240000});
      const readyMs = Date.now() - t,
        ready = await loaded();
      // and everything it goes on to load once ready (terrain, sounds, models), until the network is quiet
      await page.waitForLoadState('networkidle', {timeout: 120000}).catch(() => {});
      const settled = await loaded();
      out[url] = {requests: ready.requests, kb: ready.kb, readyMs, settledRequests: settled.requests, settledKb: settled.kb};
      console.error(`${url}: ${JSON.stringify(out[url])}`);
      await page.close();
    }
  } finally {
    await browser.close();
    server.stop();
  }
  return out;
}

/** Pages whose size depends on timing (the operator page parses the other rifles in idle moments): sizes not checked. */
export const NOISY = new Set(['operator/']);

/** Regressions of `now` against `base`: lines for every mean, p99 or size over TOLERANCE times its baseline. */
export function regressions(base, now) {
  const worse = [];
  for (const [kind, rows] of Object.entries(now))
    for (const [name, row] of Object.entries(rows))
      for (const k of ['meanMs', 'p99Ms', 'cpuMs', 'kb', 'requests', 'settledKb']) {
        if (NOISY.has(name) && ['kb', 'requests', 'settledKb'].includes(k)) continue;
        const was = base?.[kind]?.[name]?.[k];
        if (Number.isFinite(was) && Number.isFinite(row[k]) && row[k] > was * TOLERANCE && row[k] - was > 0.05)
          worse.push(`${kind} ${name} ${k}: ${was} -> ${row[k]}`);
      }
  return worse;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const what = process.argv[2] || 'sim';
  const now = {};
  if (what === 'sim' || what === 'all') now.sim = simBench();
  if (what === 'pages' || what === 'all') now.pages = await pageBench();
  console.log(JSON.stringify(now, null, 1));
  const base = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, 'utf8')) : {};
  if (process.argv.includes('--check')) {
    const worse = regressions(base, now);
    console.log(worse.length ? `Regressions over ${Math.round((TOLERANCE - 1) * 100)} %:\n  ${worse.join('\n  ')}` : 'within budget');
    if (worse.length) process.exitCode = 1;
  }
  if (process.argv.includes('--write')) {
    fs.writeFileSync(BASELINE, JSON.stringify({...base, ...now, measured: new Date().toISOString().slice(0, 10)}, null, 1) + '\n');
    console.log('baseline written');
  }
}
