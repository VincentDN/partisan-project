# Agent state

Read `AGENTS.md` first. Work queue: [packets.json](packets.json).

## Latest handoff

<!-- handoff:start -->
**2026-10-09 · 3D convoy restoration and faction roadmap**

- Owner requested original 3D convoy vehicles on the default 2.5D map. Shared `map/vehicles.js` now supplies truck/M-ATV/Humvee models to both styles; people stay sprites in the default map and operator rigs remain lazy.
- Focused Chromium validation passed: all three convoy columns use solid model geometry and move; HD2D/sprite people retained; no operator-rig request. Map travel browser regression also passes (routing, pause, arrival/save/reload). Lint, formatting, types and build/link checks pass.
- Graphics/campaign/master roadmaps and V5/CM20 acceptance now require distinct faction silhouettes: occupiers olive drab with helmets and covered faces where supported; default insurgents civilian clothing, hood/shemagh coverings only, never helmets. This art requirement is planned, not implemented in this change.

Previous milestone:

**2026-10-09 · codex · map optimization and correctness follow-up**

- Prior campaign/equipment integration is published and deployed on main: `4a916e7` then `043bb9c`. Local main was aligned to the exact remote commits after verifying identical trees.
- Hosted run `37818182112` passed build/unit/deployment, general browser smoke, campaign bridge, map travel, campaign loop and inventory. It failed later at generated-Recon reload's generic 30-second navigation timeout; subsequent character suites and accessibility did not run.
- Follow-up: paused settled map renders at most twice per second, with immediate camera/resize/click wake; shadow projection is cached and updated with shadows; convoy vectors reused; unchanged paused convoy transforms and party summary DOM skipped; reduced-motion decorative animation frozen.
- Fixes preserve saved speed and pre-encounter pause, display actual fit fighter count, refresh trade summaries while paused and restore convoy heading. Operator reload now waits for DOM readiness with a bounded navigation timeout, retaining model/weapon readiness assertions.
- Validation: all 45 focused campaign/picking/render-budget/replay checks pass, as do lint, types and direct site build/link checks. New render-budget tests cover idle cadence and immediate wake. Reference-device FPS and final browser/CM6 acceptance remain open.
- Roadmap and detailed vertical-slice write-up are in `docs/campaign-roadmap.md`; performance evidence and limitations are in `docs/engineering/campaign-performance.md`. Keep working on main as explicitly authorized.
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
