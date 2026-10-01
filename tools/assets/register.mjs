// Asset register CLI.
//   node tools/assets/register.mjs check            audit register vs files (exit 1 on problems)
//   node tools/assets/register.mjs md               regenerate assets/REGISTER.md
//   node tools/assets/register.mjs add --id X --label "…" --path assets/models/… --kind weapon --license CC0 \
//        --author "…" --source https://… [--attribution] [--status real] [--fulfils pipeline-id] [--triangles N]
// A licence outside the allow-list is rejected; there is deliberately no --force.
import fs from 'node:fs';
import {loadRegister, saveRegister, audit, toMarkdown, ALLOWED_LICENSES} from './register-lib.mjs';

const [cmd, ...rest] = process.argv.slice(2);
const flags = {};
for (let i = 0; i < rest.length; i++) if (rest[i].startsWith('--')) { const k = rest[i].slice(2); flags[k] = rest[i + 1]?.startsWith('--') || rest[i + 1] === undefined ? true : rest[++i]; }
const reg = loadRegister();

if (cmd === 'check') {
  const problems = audit(reg);
  console.log(problems.length ? problems.join('\n') : `register OK: ${reg.assets.length} assets, ${reg.pipeline.length} pipeline items`);
  process.exit(problems.length ? 1 : 0);
} else if (cmd === 'md') {
  fs.writeFileSync('assets/REGISTER.md', toMarkdown(reg)); console.log('wrote assets/REGISTER.md');
} else if (cmd === 'add') {
  for (const k of ['id', 'label', 'path', 'kind', 'license', 'author', 'source']) if (!flags[k]) { console.error(`missing --${k}`); process.exit(1); }
  if (!ALLOWED_LICENSES.some(re => re.test(flags.license))) { console.error(`licence "${flags.license}" is not allowed. Allowed: CC0, CC BY 4.0/3.0, original, purchased, owner-supplied.`); process.exit(1); }
  if (!fs.existsSync(flags.path)) { console.error(`file not found: ${flags.path}`); process.exit(1); }
  reg.assets = reg.assets.filter(a => a.id !== flags.id);
  reg.assets.push({id: flags.id, label: flags.label, path: flags.path, kind: flags.kind, status: flags.status || 'real', license: flags.license, author: flags.author, source: flags.source,
    attribution_required: !!flags.attribution || /BY/i.test(flags.license), ...(flags.triangles ? {budget: {triangles: +flags.triangles}} : {}), ...(flags.notes ? {notes: flags.notes} : {})});
  if (flags.fulfils) reg.pipeline = reg.pipeline.filter(p => p.id !== flags.fulfils);
  saveRegister(reg); fs.writeFileSync('assets/REGISTER.md', toMarkdown(reg));
  console.log(`registered ${flags.id}${flags.fulfils ? `, closed pipeline item ${flags.fulfils}` : ''}`);
} else { console.error('usage: register.mjs check | md | add …'); process.exit(1); }
