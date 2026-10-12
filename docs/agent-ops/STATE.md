# Agent state

Read `AGENTS.md` first. Work queue: [packets.json](packets.json).

## Latest handoff

<!-- handoff:start -->
**2026-10-12 11:24 UTC · claude · WP-QA21 · done**

- Branch `claude/friendly-dijkstra-4ky9w6` at `274c0da`; **1 uncommitted file(s)** (commit before stopping): M docs/quality-roadmap.md.
- Last commits: 274c0da Merge main (CM5, CM6, W12, QA15, V5) into the QA branch · 0720dfc Merge pull request #2 from VincentDN/claude/stoic-hypatia-vd8ehz · f3dd8c1 Standing rule: CLAUDE.md stays blank and defers to AGENTS.md
- What happened: Bug hunt and optimisation roadmap (docs/quality-roadmap.md, milestone QA): 13 of 22 packets done (fuzz, budgets, page-error checks, save/inventory/campaign hunts, sim soak, sim 64% faster, compact catalogue, asset diet, no fixed sleeps, golden replays, static checks, pathfinding). Main merged in (CM5, CM6, W12, QA15, V5): replays re-recorded, banter test moved to the checkpoint level.
- Next step: Future roadmap, in order: QA22 (AI retreat spots inside closed buildings), QA8 overlays focus audit, QA10 memory, QA9 Firefox/WebKit, QA14/QA15 device measurements, QA17 module splits, QA20 strict null checks. See docs/quality-roadmap.md section 7.
<!-- handoff:end -->

## Resume here

1. Run browser map travel, campaign bridge/loop, smoke and accessibility in a working browser environment; validate six/eight-person selection and safe-haven services. Keep the owner-requested main target.
2. Run CM6 pouch motion/full browser acceptance before closing CM6. Current inspected final contact sheet is committed at `outbound/wip-images/2026-10-07_214712.png`; retain the canonical body/carrier geometry.
3. Follow the campaign roadmap's revised order: strategic seeded simulation/save authority, hunters/response, economy/territory, owned customisation, operation debrief/onboarding.
4. Do not call simple persisted convoy tokens a finished W5/W6 strategic simulation, or the heat counter a working hunter director. The roadmap lists these limitations explicitly.

Earlier tactical handoff (still open):

1. Fetch latest main and inspect changes before reconciling this branch. Preserve both agents’ work.
2. Run `npm ci` if needed. Install Chromium, then run `CHROMIUM=/path/to/chrome node tests/e2e/squad-control.mjs`.
   The previously working browser was Chromium 134 / Playwright build 1161; the default v1243 download returned a corrupt archive.
   Do not change locked project dependencies merely to select a test browser.
3. Inspect the picker visually in normal/reduced motion, keyboard and touch; check clumped/distant rebels and all-down during selection.
   Relevant files: `convoy/squad-picker.js`, `convoy/squad-control.js`, `convoy/sprite-game.js`, `tests/e2e/squad-control.mjs`.
4. Run `npm run test:a11y`, relevant smoke tests, `npm test`, `npm run build`, `npm run check`, lint/typecheck.
   Mark S21 done only once its acceptance is met, update `G-squad-play.md` and regenerate the packet table.
5. Continue S28 (small module boundaries), S16 (headless metrics), S8 (item instances) and S29 (persistence transactions).
   The first extraction gate is S35. New maps follow that gate; live multiplayer remains behind owner decisions S36/S41.
6. Read `docs/character-customisation-roadmap.md` and CM1's packet. The owner asked to begin with the roadmap; the implementation has not started.
7. Use the original/current comparison for the source audit. Existing rebuild instructions are in `docs/engineering/generated-recon.md`; preserve the unchanged original source.
8. For further changes run `npm run test:comparison`, `npm run test:operator`, the browser smoke suite, build/check, lint and typecheck. On Windows, set `CHROMIUM` to the installed Chrome executable.

## Known limits

- The cloud sandbox can run direct Node checks, but default isolated test workers and Chromium need runtime permissions. GitHub Actions provides the complete regression runner.
- Prior Windows downloader failures did not reproduce in Linux: the full suite passed 244/244 before final documentation/seating updates.
- The inherited site is about 246.2 MB against the 90 MB target. No unrelated asset cleanup is included.
- Per-vertex clearance samples cover three rifles and selected motion frames, not every triangle crossing, transition or future loadout. CM9 expands coverage.
- No usage-meter calibration was invented.
