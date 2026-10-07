/* global axe */
// Accessibility audit with axe-core (WCAG 2.0/2.1/2.2 A and AA rules) on every page and key states.
//   npm run test:a11y         exit 1 on any serious/critical violation; moderate/minor are listed as warnings
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {launch, open, startServer, frames} from './browser.mjs';

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
if (!process.env.ROOT) {
  execFileSync('node', ['tools/build-site.mjs', '_site'], {stdio: 'ignore'});
  process.env.ROOT = '_site';
}
const server = await startServer(8196),
  browser = await launch();
const pages = [
  [
    'opening scene',
    'intro/',
    async p =>
      p.waitForFunction(() => document.querySelector('#start') && !document.querySelector('#start').disabled, null, {timeout: 90000}),
  ],
  ['index (menu)', 'menu/', async p => p.waitForFunction(() => window.PARP_INDEX?.ready && window.PARP_MENU?.ready)],
  ['workbench', 'workbench/', async p => p.waitForSelector('#build .slot', {timeout: 60000})],
  ['operator', 'operator/', async p => p.waitForFunction(() => window.PARP_OPERATOR?.ready, null, {timeout: 60000})],
  ['operator (base)', 'operator/#base=base', async p => p.waitForFunction(() => window.PARP_OPERATOR?.ready, null, {timeout: 60000})],
  ['equipment wiki', 'wiki/', async p => p.waitForFunction(() => window.PARP_WIKI?.ready, null, {timeout: 60000})],
  ['rebel band', 'band/', async p => p.waitForFunction(() => window.PARP_BAND?.ready, null, {timeout: 60000})],
  ['overworld map', 'map/', async p => p.waitForFunction(() => window.PARP_MAP?.ready, null, {timeout: 120000})],
  ['inventory', 'inventory/', async p => p.waitForFunction(() => window.PARP_INV?.ready, null, {timeout: 60000})],
  ['overworld 2.5-D', 'map25/', async p => p.waitForFunction(() => window.PARP_MAP?.ready, null, {timeout: 180000})],
  ['partisan tactical', 'convoy/', async p => p.waitForFunction(() => window.PARP_SPRITES?.ready, null, {timeout: 60000})],
  [
    'advanced animations',
    'intro/advanced.html',
    async p =>
      p.waitForFunction(() => document.querySelector('#start') && !document.querySelector('#start').disabled, null, {timeout: 90000}),
  ],
  ['viewer', 'viewer/', async p => p.waitForFunction(() => window.PARP_VIEWER?.ready, null, {timeout: 60000})],
  ['design document', 'docs/game-design-master-doc.html', async p => p.waitForSelector('#milestones .ms')],
  ['master roadmap', 'docs/master-roadmap.html', async p => p.waitForSelector('main h1')],
];
let failures = 0;
for (const [name, path, ready] of pages) {
  const page = await open(browser, server.url + (path.startsWith('#') ? path : path), {reducedMotion: 'reduce'});
  if (path === '#menu') {
    await page.goto(server.url + '#menu');
  }
  await ready(page);
  await frames(page, 3); // settled
  await page.addScriptTag({content: axeSource});
  const result = await page.evaluate(() =>
    axe.run(document, {
      preload: false,
      runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']},
      resultTypes: ['violations'],
    }),
  );
  const serious = result.violations.filter(v => ['serious', 'critical'].includes(v.impact));
  const minor = result.violations.filter(v => !['serious', 'critical'].includes(v.impact));
  console.log(`${serious.length ? 'FAIL' : 'ok  '} ${name}: ${serious.length} serious/critical, ${minor.length} other`);
  for (const v of serious) {
    failures++;
    console.log(
      `   [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} nodes)\n      e.g. ${v.nodes[0].target.join(' ')} :: ${(v.nodes[0].failureSummary || '').split('\n').slice(0, 2).join(' | ')}`,
    );
  }
  for (const v of minor) console.log(`   (${v.impact}) ${v.id}: ${v.help} (${v.nodes.length} nodes) e.g. ${v.nodes[0].target.join(' ')}`);
  await page.close();
}
await browser.close();
server.stop();
process.exit(failures || process.exitCode ? 1 : 0); // exitCode: page problems browser.close() reported
