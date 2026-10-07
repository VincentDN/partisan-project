// Static checks (WP-QA19): exported names no other file uses, and JavaScript files nothing imports or loads.
//   node tools/qa/unused.mjs            (a report; exits 0)
// Heuristic, not a compiler: a name counts as used when another file mentions it as a word. Review before deleting.
import fs from 'node:fs';
import path from 'node:path';

const SKIP =
  /^(node_modules|vendor|_site|build|docs\/archive|tests\/legacy|outbound|inbound|assets-incoming|intro\/ak15-weapon-customiser)(\/|$)/;
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, {withFileTypes: true})) {
    const p = path.join(dir, e.name);
    if (SKIP.test(p) || e.name.startsWith('.')) continue;
    if (e.isDirectory()) walk(p, out);
    else if (/\.(m?js|html)$/.test(e.name)) out.push(p);
  }
  return out;
}

export function report(root = '.') {
  const cwd = process.cwd();
  process.chdir(root);
  const files = walk('.').map(f => f.replace(/^\.\//, ''));
  const text = Object.fromEntries(files.map(f => [f, fs.readFileSync(f, 'utf8')]));
  process.chdir(cwd);
  const unusedExports = [];
  for (const f of files.filter(f => /\.m?js$/.test(f) && !f.startsWith('tests/'))) {
    const names = [...text[f].matchAll(/^export (?:async )?(?:function\*?|const|let|class)\s+([A-Za-z_$][\w$]*)/gm)].map(m => m[1]);
    for (const n of names) {
      const re = new RegExp(`\\b${n.replace(/\$/g, '\\$')}\\b`);
      const elsewhere = files.some(g => g !== f && re.test(text[g]));
      const inside = (text[f].match(new RegExp(re.source, 'g')) || []).length > 1; // used in its own file too
      if (!elsewhere) unusedExports.push(`${f}: ${n}${inside ? '' : '  (dead: not used in its own file either)'}`);
    }
  }
  const unreferenced = files
    .filter(f => /\.m?js$/.test(f) && !f.startsWith('tests/') && !f.startsWith('tools/') && f !== 'eslint.config.mjs')
    .filter(f => !files.some(g => g !== f && text[g].includes(path.basename(f))));
  return {unusedExports, unreferenced};
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const {unusedExports, unreferenced} = report();
  console.log(`Exports no other file mentions (${unusedExports.length}):\n  ` + unusedExports.join('\n  '));
  console.log(`\nFiles nothing imports or loads (${unreferenced.length}):\n  ` + unreferenced.join('\n  '));
}
