// Write the mount points found by fit-audit.mjs (build/fit-audit.json) back into workbench/models.js and
// workbench/rifles-extra.js: each audited socket gets its snapped source coordinates. Run fit-audit.mjs first.
//   node tools/workbench/apply-fit.mjs [--min-mm 2]
import fs from 'node:fs';

const minMm = Number(process.argv[process.argv.indexOf('--min-mm') + 1]) || 2;
const report = JSON.parse(fs.readFileSync('build/fit-audit.json', 'utf8'));
const FILES = ['workbench/models.js', 'workbench/rifles-extra.js'];
const round = v => {
  const a = Math.abs(v);
  if (a < 1e-6) return 0;
  return +v.toPrecision(a >= 10 ? 5 : 4);
};
let changed = 0;
for (const file of FILES) {
  let src = fs.readFileSync(file, 'utf8');
  for (const [id, rows] of Object.entries(report)) {
    const start = src.search(new RegExp(`\\n  ${id}: \\{`));
    if (start < 0) continue;
    const rest = src.slice(start + 1);
    const next = rest.search(/\n {2}[a-z0-9]+: \{|\n\};/);
    const end = start + 1 + (next < 0 ? rest.length : next);
    let block = src.slice(start, end);
    for (const r of rows) {
      if (!r.source || r.gapMm < minMm) continue;
      const re = new RegExp(`(\\['${r.slot}', '[^']*', )\\[[^\\]]*\\]`);
      if (!re.test(block)) continue;
      block = block.replace(re, `$1[${r.source.map(round).join(', ')}]`);
      changed++;
    }
    src = src.slice(0, start) + block + src.slice(end);
  }
  fs.writeFileSync(file, src);
}
console.log(`${changed} mount points moved onto their guns`);
