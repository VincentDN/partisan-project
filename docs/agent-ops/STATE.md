# Agent state

Read `AGENTS.md` first. Work queue: [packets.json](packets.json).

## Latest handoff

<!-- handoff:start -->
**2026-10-13 15:21 UTC · claude · WP-W12 · done**

- Branch `claude/friendly-dijkstra-4ky9w6` at `d634e42`; working tree clean.
- Last commits: d634e42 WP-W12: pick six to nine of every fit fighter; deployment browser gate · 1580d76 Fix looting: a sling for a second rifle, forgiving drops, Ctrl-click/T quick-take · 29ad59a docs: handoff for WP-W8
- What happened: W12 done: the encounter panel picks six to nine of every fit fighter (reserves selectable, wounded shown); deployment e2e covers all seven mission types with identities, classes and kits.
- Next step: Campaign: W6 (convoy spawn/resupply), W7 (hunter columns, sight), W4 fixed-step sim, W22 auto-resolve. Balance: convoy escort spots eight rebels ~13 s in.
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
