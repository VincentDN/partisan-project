// Builds the GitHub Pages artifact into _site/ from an explicit ALLOWLIST.
// Everything not listed here (docs/ai, docs/agent-ops, docs/adr, tools, tests, raw sources…) stays in
// the repository and is never published. Add a path here deliberately when something should be public.
//   node tools/build-site.mjs [outDir]
import fs from 'node:fs';
import path from 'node:path';
import {marked} from 'marked';

const out = path.resolve(process.argv[2] || '_site');
const REPO = 'https://github.com/VincentDN/partisan-project';
const version = fs.readFileSync('VERSION', 'utf8').trim();

const ALLOW = [
  'index.html',
  'shell.js',
  'intro',
  'menu',
  'assets/css',
  'assets/js',
  'assets/img',
  'assets/audio',
  'assets/backgrounds',
  'assets/lighting',
  'assets/models',
  'assets/sprites',
  'assets/textures',
  'assets/register.json',
  'shared',
  'vendor',
  'workbench',
  'operator',
  'viewer',
  'convoy',
  'band',
  'map',
  'wiki',
  'docs/game-design-master-doc.html',
  'docs/moodboard',
  'inbound',
  'outbound',
];
// Layered PSDs are not kept in the repository (the owner has them); outbound/flatten-psd.py writes a PNG beside any new one and the build ships those.
// The Codex workbench study links to repository Markdown, which is not published.
const SKIP_DIRS = [/^outbound\/tlou2-workbench-study\//];
const SKIP_FILES = [/\.psd$/i, /\.manifest\.json$/, /\.md$/, /\.test\.m?js$/, /\.DS_Store$/];

fs.rmSync(out, {recursive: true, force: true});
fs.mkdirSync(out, {recursive: true});
function copy(rel) {
  const src = path.resolve(rel);
  if (!fs.existsSync(src)) throw new Error(`allowlisted path missing: ${rel}`);
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    for (const e of fs.readdirSync(src)) copy(path.join(rel, e));
    return;
  }
  if (SKIP_FILES.some(re => re.test(rel)) || SKIP_DIRS.some(re => re.test(rel.split(path.sep).join('/')))) return;
  const dest = path.join(out, rel);
  fs.mkdirSync(path.dirname(dest), {recursive: true});
  fs.copyFileSync(src, dest);
}
ALLOW.forEach(copy);

// Machine-readable packets drive the live progress bars on the design doc.
fs.copyFileSync('docs/agent-ops/packets.json', path.join(out, 'docs/packets.json'));

// Render the master roadmap (Markdown) to HTML inside the same shell as the design doc.
const md = fs.readFileSync('docs/master-roadmap.md', 'utf8');
const html = marked
  .parse(md, {gfm: true})
  // relative links to repo documents become GitHub links; the roadmap itself and the site stay relative
  .replace(/href="(?!https?:|#|mailto:)([^"]+?)"/g, (m, href) => {
    if (/^(\.\/)?master-roadmap\.md$/.test(href)) return 'href="master-roadmap.html"';
    if (/^(\.\.\/)?(workbench|operator|viewer)\/?$/.test(href)) return `href="../${href.replace(/^\.\.\//, '')}"`;
    const clean = href.replace(/^\.\//, '');
    const base = clean.startsWith('../') ? clean.slice(3) : 'docs/' + clean;
    return `href="${REPO}/blob/main/${base}"`;
  });
const page = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex, nofollow, noarchive, nosnippet, noimageindex"><meta name="googlebot" content="noindex, nofollow"><meta name="seo_hidden" content="true"><meta name="version" content="${version}">
<title>Partisan Project | Master Roadmap</title><link rel="icon" href="../assets/img/favicon.svg" type="image/svg+xml">
<style>
:root{color-scheme:dark;--bg:#0d100c;--panel:#161b13;--line:#2c3526;--text:#e6e9dc;--dim:#98a487;--accent:#ef8f39;--olive:#c8d4a8}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:16px/1.65 system-ui,-apple-system,"Segoe UI",sans-serif}
header{position:sticky;top:var(--topbar,40px);background:#0d100cf2;border-bottom:1px solid var(--line);padding:10px 20px;display:flex;gap:18px;flex-wrap:wrap;justify-content:space-between;font:12px/1.4 ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase;z-index:5}
header a{color:var(--olive)}main{max-width:980px;margin:0 auto;padding:28px 20px 80px}
h1,h2,h3{line-height:1.2;color:#fff}h1{font-size:2rem;margin-top:.4em}h2{margin-top:2.4em;padding-top:.6em;border-top:1px solid var(--line);font-size:1.45rem}h3{margin-top:1.8em;font-size:1.1rem;color:var(--olive)}
a{color:#9fd0e6}code{font:.88em ui-monospace,monospace;background:#1d241a;padding:.1em .35em;border-radius:3px}pre{background:#10150e;padding:14px;overflow:auto;border:1px solid var(--line);border-radius:6px}pre code{background:none;padding:0}
table{border-collapse:collapse;width:100%;font-size:.88rem;display:block;overflow-x:auto}th,td{border:1px solid var(--line);padding:6px 9px;text-align:left;vertical-align:top}th{background:#1a2116;color:var(--olive);font-weight:600;white-space:nowrap}
blockquote{margin:1em 0;padding:.4em 1em;border-left:3px solid var(--accent);background:#161b13;color:var(--dim)}hr{border:0;border-top:1px solid var(--line)}img{max-width:100%}
@media(max-width:640px){main{padding:18px 16px 60px}h1{font-size:1.6rem}}
</style></head><body>
<header><span>Partisan Project master roadmap · v${version}</span><nav><a href="${REPO}">Source</a></nav></header>
<main>${html}</main>
<script type="module">import {mountTopBar} from '../shared/topbar.js';mountTopBar({title: 'Master roadmap', scene: 'viewer', sticky: true, replaceHeader: false});</script></body></html>
`;
fs.writeFileSync(path.join(out, 'docs/master-roadmap.html'), page);
fs.writeFileSync(path.join(out, '.nojekyll'), '');
fs.writeFileSync(
  path.join(out, '404.html'),
  `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex, nofollow, noarchive, nosnippet, noimageindex"><meta name="googlebot" content="noindex, nofollow"><meta name="seo_hidden" content="true"><title>Partisan Project | 404</title><body style="background:#0d100c;color:#c8d4a8;font:16px monospace;display:grid;place-items:center;height:100vh;margin:0"><p>SIGNAL LOST. <a style="color:#ef8f39" href="./">Back to the Partisan Project index</a></p></body>`,
);
const count = d => fs.readdirSync(d, {withFileTypes: true}).reduce((n, e) => n + (e.isDirectory() ? count(path.join(d, e.name)) : 1), 0);
console.log(`built ${out}: ${count(out)} files`);
