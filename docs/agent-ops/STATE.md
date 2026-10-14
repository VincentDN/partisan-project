# Agent state

Read `AGENTS.md` first. Work queue: [packets.json](packets.json).

## Latest handoff

<!-- handoff:start -->
**2026-10-14 07:30 UTC · claude · WP-W7 · done**

- Branch `claude/friendly-dijkstra-4ky9w6` at `369ed2c`; working tree clean.
- Last commits: 369ed2c Fix a column with a lead but no place yet; map-travel waits from the second order · 8caee26 Sandbags seen over, low cover in fights; campaign map fixes; WP-W7 hunters · b619640 docs: handoff for WP-W6
- What happened: W7 done with the owner's fixes: sandbags seen over (half fog, peek on fire), low cover hit chance and dust puffs, placeholder map buttons removed, orders start the clock, band sprites stand on slopes; hunter columns with sight, last-seen tracking, sight rings and hunts-per-day harness.
- Next step: Campaign: W22 auto-resolve, W10 settlement assault, W19 territory. Balance: convoy escort spots eight rebels ~13 s in; tune hunts per day (0.13 now) with tools/campaign-hunts.mjs.
<!-- handoff:end -->

## Gameplay/demo module boundary — 13 October 2026

Continued from main `db480da`, preserving Claude's W9/W13/W15 changes. The default map did not fetch the
operator rig, but its shared party builder retained a lazy fallback to it. The campaign and 3D demo now have
separate entry points (`map.js` and `demo-3d.js`); `map-runtime.js` requires injected character rendering.
The band screen imports handling audio from `shared/mech.js`; the workbench path remains a compatibility export.
Gameplay import-graph tests reject static and lazy demo imports. Browser coverage navigates the actual shell
through map, band and mission, checks requested modules/assets, and opens each standalone 3D demo separately.
The code-map generator now includes the previously omitted gameplay directories. Overall WP-QA15 map-size/heap
and reference-device performance acceptance remain open; this change does not claim those budgets are met.

## Weapon attachment fitting — 14 October 2026

All 12 variants and 446 choices audited; mount profiles, shared scale/orientation, source part ownership and
underbarrel magazine clearance corrected. See [fit audit](../engineering/weapon-attachment-fit.md) for coverage
and reproduction. WP-A10 remains open; this pass does not close its UI/finish acceptance.

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
