# Engineering standards

The bar this project holds itself to. Items marked ▢ are not yet enforced automatically (tracked as packets).

## 1. Definition of done (every packet)

- Acceptance criteria met by a **command** or a checkable fact, recorded in the commit body.
- `npm test` green; `npm run build && npm run check` green; e2e smoke green when the change is visible.
- No new console errors or warnings in the browser; no unregistered asset; no root-absolute URL.
- Docs and data updated in the same change: `packets.json`, roadmap table (`roadmap-table.mjs`), `CHANGELOG.md` if user-visible, `docs/CODEMAP.md` if files moved.
- Visual changes: a contact sheet is attached to the packet or committed under `docs/review/` (owner approves art).

## 2. Architecture

- **Static, buildless, vendored.** ES modules + an import map per page; three.js r169 vendored in `vendor/three`. No bundler until a measured need exists (ADR 0001/0002 record the trigger: a module graph > ~150 files or a decoder/tooling need).
- **Data over code.** Poses, idles, equipment slots, colour zones, rifle configs, packets and assets are data files validated by tests.
- **One owner per transform.** Pose/idle write bone rotations; nothing else touches them. Weapon props follow hand positions in character space.
- **Shared stage.** New demos use `shared/stage.js`, `shared/music-ui.js`, `shared/panel-ui.css`; no copy-pasting renderer setup (tech-debt `WP-T1` retires the last copy).
- **Progressive enhancement.** The index lists real `<a>` links; demos show a `noscript` message; failures show a readable status, never a blank canvas.
- **State in the URL hash** so every look/build is a shareable link; hash decoding clamps and ignores unknown values.

## 3. Performance budgets

| Item | Budget | Enforced |
|---|---|---|
| Operator + equipment | ≤ 15,000 triangles, ≤ 60 draw calls | UI readout + `tests/operator-assets.test.mjs` |
| Weapon with attachments | ≤ 30,000 triangles | asset viewer, register budget |
| Single GLB | ≤ 1.5 MB (meshopt) | ▢ |
| Whole site | ≤ 90 MB | `check-site.mjs` |
| Frame rate | 60 fps desktop, 30 fps on a mid-range phone | ▢ `WP-Q2` |
| Adaptive resolution | pixel ratio steps down below ~35 fps | implemented (`shared/stage.js`) |
| Idle animation cost | < 0.5 ms/frame | ▢ `WP-C9` |

## 4. Accessibility (target WCAG 2.2 AA)

Keyboard operation of every control; visible focus; `aria-pressed` on toggles; live regions for status; text contrast ≥ 4.5:1;
colour is never the only carrier of a stat change (arrows and numbers accompany colour); `prefers-reduced-motion` honoured; touch targets ≥ 44 px on coarse pointers. Audit: `WP-Q1`.

## 5. Testing

| Layer | Tool | Where |
|---|---|---|
| Unit / data | `node --test` | `tests/*.test.mjs`: rig maths, poses vs skeleton, config consistency, dither, register audit, plan validity |
| Build | `build-site.mjs` + `check-site.mjs` | links, imports, import maps, size, base-path safety |
| Browser | Playwright (`playwright-core`, system Chromium) | `tests/e2e/smoke.mjs`: each page loads, no console errors, state round-trips |
| Visual | contact sheet + owner review | `tests/e2e/contact-sheet.mjs` |

A passing test never certifies art quality; a human signs off visuals.

## 6. Security and privacy

No cookies, no analytics, no third-party requests at runtime. Optional analytics must be opt-in and privacy-light (not planned). No secrets in the repo. Dependencies are dev-only (`npm audit` in CI is advisory).

## 7. Licensing and provenance

CC0 / CC BY 4.0 downloads only unless the owner records an exception. Every shipped asset is in `assets/register.json` with licence, author and source; attribution is rendered from it. Purchased assets: keep raw sources out of the repo; record the licence terms. Reference screenshots (moodboard) are documentary, credited, and never used as runtime assets.

## 8. Versioning and releases

SemVer: `VERSION` and the `<meta name="version">` in `index.html` change together. Minor = new milestone feature; patch = fixes. `CHANGELOG.md` (Keep a Changelog). Tags `vX.Y.Z` on `main`. Pages deploys from `main` only.

## 9. Branches and commits

`main` is deployable. Work on `claude/*` / `codex/*` branches; squash or fast-forward merges. Commit subject `type(WP-ID): …`. Never rewrite history on a branch another agent has pulled.
