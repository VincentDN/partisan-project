# Partisan Project: instructions for AI agents (Claude, Codex, anyone)

**Partisan Project** is an interactive game design document made of playable low-poly demos
(Weapon Workbench, Operator Customiser, Asset Viewer) plus an in-universe design doc. Static site, no
bundler, deployed to GitHub Pages. Owner: Vincent De Nil.

> **EXPRESS INSTRUCTION: do not spend tokens on credits or licences.** This is a hidden, SEO-excluded test project. Do not
> research, write, check, audit or update credits, attributions, licence tables, provenance notes or asset-rights
> registers, and do not add tests or CI steps for them. If a task touches them, skip that part and say so in one line.
> Credits and licences are handled in the GitHub documentation or by contacting the owner; the pages only carry a note saying so.

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
npm test                    unit + site-build + plan-consistency tests (must stay green)
npm run serve               http://localhost:8123/
npm run build && npm run check      build _site/ from the allowlist and verify every link
npm run lint | format:check | typecheck     ESLint, Prettier (140 cols, single quotes), tsc --checkJs on the typed modules (all in CI)
npm run test:e2e            headless browser smoke test (needs Chromium; CHROMIUM=/path/to/chrome)
npm run test:a11y          axe-core WCAG audit of every page
node tools/agent/…          next-packet | handoff | usage | roadmap-table | codemap
```

## Hard rules

- **Relative URLs only.** The site is served under `/partisan-project/`; a root-absolute URL breaks it. `npm run check` enforces this.
- **No CDN, no external runtime dependency.** three.js is vendored. Fonts are system fonts.
- **Assets:** shipped models, audio and lighting live under `assets/`. Import models with `tools/assets/*`; never hand-copy a model in. Give each model a triangle budget in `assets/register.json` (the Asset Viewer reads it). Nothing else about rights or credits (see the express instruction at the top).
- **Never commit** raw purchased sources (`*.blend`, `*.fbx`), `assets-incoming/`, secrets, or ripped game audio/screenshots as runtime assets.
- **Removed on purpose (do not reintroduce):** weapon firing, recoil, range drill. The original opening scene and advanced-animations test live in `intro/` as restored code (ADR 0011); leave them as they are. The Operator Customizer uses the new Base Operator only.
- Poses are **data** (`operator/poses.json`, character-space degrees); never hard-code bone angles in JS.
- Respect `prefers-reduced-motion` (idle animation off, camera moves instant), keyboard operation and visible focus on every control.
- Budgets: operator + equipment ≤ 15,000 triangles; weapon ≤ 30,000; site ≤ 90 MB; first meaningful render < 3 s on broadband.
- Keep modules small (< 300 lines) and start each file with a one-line purpose comment (the code map uses it).
- **Images shown to the owner** (screenshots, renders, contact sheets, previews sent in the chat): also save a copy to `outbound/wip-images/` named by its timestamp, `YYYY-MM-DD_HHMMSS.png` (UTC; keep the source format's extension), and commit it. It is the owner's log of development shots.
- Update in the same change: `packets.json` status, `npm run` table sync, `CHANGELOG.md` for user-visible changes, `assets/register.json` (triangle budgets) for models.

## Commit style

`feat|fix|docs|chore|test(WP-ID): subject` + a body that says what was verified. Branches: `claude/<topic>`, `codex/<topic>`.
Do not open pull requests unless the owner asks.

## Claude-specific notes (moved from CLAUDE.md)

Read `docs/agent-ops/STATE.md` after this file.

- Use `Grep`/`Glob` and line-range `Read`s; do not read files listed under "Do not read".
- Use `/usage` before and after each packet and log it (`node tools/agent/usage.mjs log ...`).
- Prefer one contact-sheet screenshot to many single screenshots (`tests/e2e/contact-sheet.mjs`).
- No sub-agents on the $20 plan unless the owner asks.
- **Do not spend tokens on credits or licences** (hidden test project): skip them, see the express instruction elsewhere in this file.

## Agent instruction files (standing rule)

We run a multi-agent workflow, so `AGENTS.md` is the single source of instructions for every agent. `CLAUDE.md` must always exist, stay blank of instructions, and only defer to this file:

```
# Claude Code

Read [AGENTS.md](AGENTS.md).
```

Never add rules, notes or tool preferences to `CLAUDE.md`; put them in this file (mark agent-specific ones clearly). If you find instructions in `CLAUDE.md`, move them here and restore the pointer.
