// Performance budgets (WP-QA2). Two measurements and a stored baseline (docs/perf-baseline.json):
//   sim    every level, two seeds, 120 simulated seconds on Hard with the player firing: ms per step (mean, p99,
//          worst) and the process's CPU time, so a busy machine skews it less than wall time alone
//   pages  cold load of each page in headless Chromium: requests, bytes, time until the page says it is ready
//   node tools/perf/bench.mjs sim|pages|all [--write] [--check]
// --write stores the result as the new baseline; --check fails on a regression over 20 % (a mean, p99 or bytes;
// the worst single step is reported, not checked: it is the noisiest number).
import fs from 'node:fs';
import {Sim} from '../../convoy/sim.js';
import {LEVELS} from '../../convoy/levels/index.js';

const BASELINE = new URL('../../docs/perf-baseline.json', import.meta.url);
const TOLERANCE = 1.2;

export function simBench({seconds = 120, seeds = [3, 4]} = {}) {
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

export async function pageBench(pages = ['convoy/?seed=3', 'map/', 'map25/', 'inventory/', 'band/', 'menu/', 'workbench/', 'operator/']) {
  const {launch, open, startServer} = await import('../../tests/e2e/browser.mjs');
  const server = await startServer(8185),
    browser = await launch();
  const out = {};
  try {
    for (const url of pages) {
      const page = await open(browser, 'about:blank');
      let bytes = 0,
        requests = 0;
      page.on('response', async res => {
        try {
          bytes += (await res.body()).length;
          requests++;
        } catch {}
      });
      const t = Date.now();
      await page.goto(server.url + url);
      await page.waitForFunction(() => Object.keys(window).some(k => k.startsWith('PARP_') && window[k]?.ready), null, {timeout: 240000});
      out[url] = {requests, kb: Math.round(bytes / 1024), readyMs: Date.now() - t};
      await page.close();
    }
  } finally {
    await browser.close();
    server.stop();
  }
  return out;
}

/** Regressions of `now` against `base`: lines for every mean, p99 or size over TOLERANCE times its baseline. */
export function regressions(base, now) {
  const worse = [];
  for (const [kind, rows] of Object.entries(now))
    for (const [name, row] of Object.entries(rows))
      for (const k of ['meanMs', 'p99Ms', 'cpuMs', 'kb', 'requests']) {
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
