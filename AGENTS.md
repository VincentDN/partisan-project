# PARP: instructions for AI agents (Claude, Codex, anyone)

PARP = **Partisan Project**: an interactive game design document made of playable low-poly demos
(Weapon Workbench, Operator Customiser, Asset Viewer) plus an in-universe design doc. Static site, no
bundler, deployed to GitHub Pages. Owner: Vincent De Nil.

## Start here (cheap context)

1. `docs/agent-ops/STATE.md` — latest handoff. 2. `docs/CODEMAP.md` — one line per source file.
3. `docs/agent-ops/packets.json` — the work. Run `node tools/agent/next-packet.mjs --budget <BU>`.
Rules for sizing, windows and handoffs: `docs/agent-ops/README.md`. **Stop at ~80 % of the window.**

## Do not read (waste of tokens)

`vendor/`, `assets/` (binary; use `assets/register.json` and `*.manifest.json`), `node_modules/`, `build/`,
`_site/`, `docs/archive/`, `docs/moodboard/` images (described in `docs/art-direction.md`).

## Layout

```
index.html            Nokia-style index browser (site root)       assets/   css js img audio lighting models register.json
workbench/            Weapon Workbench (AK rifles, attachments)   shared/   stage.js, sound-layer.js, music-ui.js, camo.js
operator/             Operator Customiser (rig.js, poses.json)    vendor/   three.js r169, vendored (no CDN)
viewer/               Asset Viewer (QA vs register budgets)       tools/    assets/ (import pipeline), agent/, build-site.mjs
docs/                 master-roadmap.md, game-design-master-doc.html, moodboard/, agent-ops/, adr/, engineering/
tests/                node --test (unit) and e2e/smoke.mjs (Playwright)
```

## Commands

```
npm ci                      install dev tools (build/test only; the site itself has no runtime dependencies)
npm test                    unit + site-build + asset-register + plan-consistency tests (must stay green)
npm run serve               http://localhost:8123/
npm run build && npm run check      build _site/ from the allowlist and verify every link
npm run test:e2e            headless browser smoke test (needs Chromium; CHROMIUM=/path/to/chrome)
node tools/agent/…          next-packet | handoff | usage | roadmap-table | codemap
```

## Hard rules

- **Relative URLs only.** The site is served under `/partisan-project/`; a root-absolute URL breaks it. `npm run check` enforces this.
- **No CDN, no external runtime dependency.** three.js is vendored. Fonts are system fonts.
- **Assets:** only CC0 or CC BY 4.0 downloads (owner may record an explicit exception). Every file under `assets/models|audio|lighting` must be in `assets/register.json` (`tests/assets.test.mjs` fails otherwise). Import with `tools/assets/*`; never hand-copy a model in.
- **Never commit** raw purchased sources (`*.blend`, `*.fbx`), `assets-incoming/`, secrets, or ripped game audio/screenshots as runtime assets.
- **Removed on purpose (do not reintroduce):** weapon firing, recoil, range drill, bench hand animation, the code-built procedural operator, the Advanced animations experiment. (ADR 0005.)
- Poses are **data** (`operator/poses.json`, character-space degrees); never hard-code bone angles in JS.
- Respect `prefers-reduced-motion` (idle animation off, camera moves instant), keyboard operation and visible focus on every control.
- Budgets: operator + equipment ≤ 15,000 triangles; weapon ≤ 30,000; site ≤ 90 MB; first meaningful render < 3 s on broadband.
- Keep modules small (< 300 lines) and start each file with a one-line purpose comment (the code map uses it).
- Update in the same change: `packets.json` status, `npm run` table sync, `CHANGELOG.md` for user-visible changes, `assets/register.json` for assets.

## Commit style

`feat|fix|docs|chore|test(WP-ID): subject` + a body that says what was verified. Branches: `claude/<topic>`, `codex/<topic>`.
Do not open pull requests unless the owner asks.
