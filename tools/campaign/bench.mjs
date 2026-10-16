// Run fifty real-rule campaigns in resumable ten-seed batches; emit per-seed JSON plus a readable pacing report.
import {parseArgs} from 'node:util';
import {readFile, mkdir, writeFile, rename, readdir} from 'node:fs/promises';
import {resolve, relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {simulate} from './simulate.mjs';
import {aggregate, markdown, TARGETS} from './report.mjs';
const root = fileURLToPath(new URL('../../', import.meta.url));
export async function fingerprint() {
  const files = [];
  async function walk(path) {
    for (const e of await readdir(path, {withFileTypes: true})) {
      const p = resolve(path, e.name);
      if (e.isDirectory()) await walk(p);
      else if (/\.(m?js|json)$/.test(e.name)) files.push(p);
    }
  }
  for (const dir of ['tools/campaign', 'shared/campaign', 'shared/inventory', 'convoy', 'band']) await walk(resolve(root, dir));
  files.push(resolve(root, 'map/island.js'));
  const hash = createHash('sha256');
  for (const p of files.sort()) {
    hash.update(relative(root, p));
    hash.update(await readFile(p));
  }
  return hash.digest('hex');
}
const integer = (value, name, min, max) => {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < min || n > max) throw Error(`${name} must be ${min}..${max}`);
  return n;
};
export async function run(args = process.argv.slice(2)) {
  const {values: v} = parseArgs({
    args,
    options: {
      campaigns: {type: 'string', default: '50'},
      days: {type: 'string', default: '14'},
      'start-seed': {type: 'string', default: '1'},
      'chunk-size': {type: 'string', default: '10'},
      policy: {type: 'string', default: 'standard'},
      out: {type: 'string', default: 'outbound/campaign-balance/baseline'},
      resume: {type: 'boolean', default: false},
      'max-chunks': {type: 'string', default: '1000'},
    },
  });
  const options = {
    campaigns: integer(v.campaigns, 'campaigns', 1, 1000),
    days: integer(v.days, 'days', 1, 365),
    startSeed: integer(v['start-seed'], 'start-seed', 1, 1000000),
    policy: v.policy,
  };
  if (!['standard', 'early-rest'].includes(options.policy)) throw Error('policy must be standard or early-rest');
  const chunkSize = integer(v['chunk-size'], 'chunk-size', 1, 100),
    maxChunks = integer(v['max-chunks'], 'max-chunks', 1, 1000),
    out = resolve(v.out),
    code = await fingerprint();
  await mkdir(out, {recursive: true});
  let rows = [];
  const checkpoint = resolve(out, 'checkpoint.json');
  if (v.resume) {
    const previous = JSON.parse(await readFile(checkpoint, 'utf8'));
    if (previous.fingerprint !== code || JSON.stringify(previous.options) !== JSON.stringify(options))
      throw Error('Checkpoint source/options mismatch; use a new output directory.');
    rows = previous.rows;
    if (!Array.isArray(rows) || rows.length > options.campaigns || rows.some((r, i) => r.seed !== options.startSeed + i))
      throw Error('Invalid checkpoint seed sequence.');
  }
  async function publish() {
    const report = {
      schema: 1,
      options,
      fingerprint: code,
      complete: rows.length === options.campaigns,
      targets: TARGETS,
      summary: aggregate(rows),
      rows,
    };
    await writeFile(checkpoint + '.tmp', JSON.stringify(report, null, 2) + '\n');
    await rename(checkpoint + '.tmp', checkpoint);
    await writeFile(resolve(out, 'report.md'), markdown(report));
    return report;
  }
  for (let batch = 0; rows.length < options.campaigns && batch < maxChunks; batch++) {
    const end = Math.min(options.campaigns, rows.length + chunkSize),
      start = options.startSeed + rows.length;
    while (rows.length < end) {
      const {state, ...metrics} = simulate({seed: options.startSeed + rows.length, days: options.days, policy: options.policy});
      rows.push({...metrics, finalStateHash: createHash('sha256').update(JSON.stringify(state)).digest('hex')});
    }
    await publish();
    console.log(`Saved seeds ${start}–${options.startSeed + rows.length - 1} (${rows.length}/${options.campaigns})`);
  }
  const report = await publish();
  console.log(JSON.stringify(report.summary, null, 2));
  return report;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  run().catch(err => {
    console.error(err.message);
    process.exitCode = 1;
  });
