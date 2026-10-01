// Verifies a built site: every relative link/src resolves, no root-absolute or CDN references
// (the site lives under /partisan-project/ on GitHub Pages), every page has a title + viewport.
//   node tools/check-site.mjs [dir]      exit 1 on any problem
import fs from 'node:fs';
import path from 'node:path';
const dir = path.resolve(process.argv[2] || '_site');
const problems = [];
const walk = d => fs.readdirSync(d, {withFileTypes: true}).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const files = walk(dir);
const exists = p => fs.existsSync(p) && (!fs.statSync(p).isDirectory() || fs.existsSync(path.join(p, 'index.html')));

for (const f of files.filter(f => f.endsWith('.html'))) {
  const rel = path.relative(dir, f);
  const html = fs.readFileSync(f, 'utf8');
  if (!/<title>[^<]+<\/title>/.test(html)) problems.push(`${rel}: missing <title>`);
  if (!/name="viewport"/.test(html)) problems.push(`${rel}: missing viewport meta`);
  const markup = html.replace(/<script(?![^>]*importmap)[^>]*>[\s\S]*?<\/script>/g, m => m.replace(/(?:href|src)=/g, 'data-x=')).replace(/<script(?![^>]*(?:importmap|src=))[^>]*>[\s\S]*?<\/script>/g, '');
  for (const m of markup.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const url = m[1];
    if (/^(#|mailto:|data:|javascript:)/.test(url)) continue;
    if (/^https?:/.test(url)) { if (/\.(js|css|mjs)(\?|$)/.test(url) && !/github\.com|vincentdenil\.com/.test(url)) problems.push(`${rel}: external script/style ${url}`); continue; }
    if (url.startsWith('/')) { problems.push(`${rel}: root-absolute URL ${url} (breaks under a project base path)`); continue; }
    const target = path.resolve(path.dirname(f), url.split('#')[0].split('?')[0]);
    if (url.split('#')[0] && !exists(target)) problems.push(`${rel}: broken link ${url}`);
  }
  for (const m of html.matchAll(/"imports":\s*(\{[^}]*\})/g)) for (const v of Object.values(JSON.parse(m[1]))) {
    if (/^https?:|^\//.test(v)) problems.push(`${rel}: importmap target ${v} must be relative and local`);
    else if (!fs.existsSync(path.resolve(path.dirname(f), v))) problems.push(`${rel}: importmap target missing ${v}`);
  }
}
// JS modules: static relative imports must resolve.
for (const f of files.filter(f => /\.(m?js)$/.test(f) && !f.includes(`${path.sep}vendor${path.sep}`))) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/(?:import|export)[^'"]*?from\s*['"](\.{1,2}\/[^'"]+)['"]|import\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g)) {
    const spec = m[1] || m[2];
    if (!fs.existsSync(path.resolve(path.dirname(f), spec))) problems.push(`${path.relative(dir, f)}: unresolved import ${spec}`);
  }
}
const mb = files.reduce((n, f) => n + fs.statSync(f).size, 0) / 1048576;
if (mb > 90) problems.push(`site is ${mb.toFixed(1)} MB; Pages recommends staying under 1 GB and we budget 90 MB`);
console.log(problems.length ? problems.join('\n') : `site OK: ${files.length} files, ${mb.toFixed(1)} MB`);
process.exit(problems.length ? 1 : 0);
