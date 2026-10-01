// Asset register logic (assets/register.json): the single source of truth for what ships, under which
// licence, and what is still a placeholder. Used by register.mjs (CLI) and tests/assets.test.mjs.
import fs from 'node:fs';
import path from 'node:path';

export const ALLOWED_LICENSES = [
  /^CC0/i,
  /^CC[ -]BY[ -]4\.0/i,
  /^CC[ -]BY[ -]3\.0/i,
  /^Original/i,
  /^Purchased/i,
  /^Supplied by the project owner/i,
];
export const SHIPPED_DIRS = ['assets/models', 'assets/audio', 'assets/lighting'];
export const loadRegister = (root = '.') => JSON.parse(fs.readFileSync(path.join(root, 'assets/register.json'), 'utf8'));
export const saveRegister = (reg, root = '.') =>
  fs.writeFileSync(path.join(root, 'assets/register.json'), JSON.stringify(reg, null, 1) + '\n');

export function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, {withFileTypes: true})
    .flatMap(e => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
}

/** Problems with the register as a whole: unregistered files, missing files, unapproved licences. */
export function audit(reg, root = '.') {
  const problems = [];
  const files = SHIPPED_DIRS.flatMap(d => walk(path.join(root, d)))
    .map(f => path.relative(root, f).split(path.sep).join('/'))
    .filter(f => !f.endsWith('.manifest.json'));
  const registered = new Set(reg.assets.map(a => a.path));
  for (const f of files) if (!registered.has(f)) problems.push(`unregistered file: ${f}`);
  for (const a of reg.assets) {
    if (!fs.existsSync(path.join(root, a.path))) problems.push(`register lists a missing file: ${a.path}`);
    if (!ALLOWED_LICENSES.some(re => re.test(a.license || '')))
      problems.push(
        `${a.id}: licence "${a.license}" is not on the allow-list (CC0 / CC BY 4.0 / original / purchased / owner-supplied); record an exception explicitly`,
      );
    if (a.attribution_required && !a.author) problems.push(`${a.id}: attribution required but no author recorded`);
  }
  return problems;
}

export function toMarkdown(reg) {
  const rows = reg.assets.map(
    a =>
      `| ${a.label} | \`${a.path}\` | ${a.kind} | ${a.status} | ${a.license} | ${a.author || ''} | ${a.source?.startsWith('http') ? `[link](${a.source})` : a.source || ''} |`,
  );
  const pending = reg.pipeline.map(
    p => `| ${p.label} | ${p.status} | ${p.target || ''} | ${(p.candidates || []).join('; ')} | ${p.blocked_by || ''} |`,
  );
  return `# Asset register

Generated from \`assets/register.json\` by \`node tools/assets/register.mjs md\`. Do not edit by hand.

Policy: ${reg.policy}

## Shipped assets

| Asset | File | Kind | Status | Licence | Author | Source |
|---|---|---|---|---|---|---|
${rows.join('\n')}

## Pipeline: placeholders and pending assets

| Item | Status | Target | Candidate sources (verify licence on the exact asset) | Blocked by |
|---|---|---|---|---|
${pending.join('\n')}
`;
}
