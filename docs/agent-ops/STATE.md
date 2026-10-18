# Agent state

Read `AGENTS.md` first. Work queue: [packets.json](packets.json).

## Latest handoff

<!-- handoff:start -->
**2026-10-18 · codex · ammunition-aware auto-resolve**

- `auto-equipment.js` computes firearm-weighted strength and required compatible carried rounds. No class-only/free-ammo wins; unarmed, dry or under-supplied picks cannot resolve. Unknown primary weapons and launchers are excluded from this small-fight shortcut.
- `ammo-index.js` is a small generated calibre index (regenerate with `node tools/campaign/ammo-index.mjs`); no full inventory catalogue or demo imports on the default map. Parity against the tactical catalogue is tested.
- Preview states the exact cost; either outcome spends that many rounds on cloned kits before normal deploy/result/settle. Reports show ammunition spent. Wrong-calibre stores, unloaded weapons, failed saves, duplicate resolution and reload conserve inventory.
- Fifty W23 campaigns in ten-seed batches and 3,000 equipped-veteran resolver cases are in `outbound/campaign-balance/equipment-auto/`. Fresh auto-only policy makes no progress, so this is not a human scarcity/pacing acceptance. Roadblock position now shares its source definition with the map and harness.
- W23 testing remains Codex-owned; W22 human comparison, tactical/barter follow-up, W21 ending and W25 onboarding remain open. Previous main `fbe6fdf` provides the gentler opening, mixed weapons, Roadblock and audible results.
- Verified: 540 tests, lint, typecheck, formatting and production build/link checks; browser failed-save/retry/reload conservation; completed 50-seed checkpoint fingerprint matches source. Resolver sample spent 152,000 rounds across 3,000 equipped-veteran fights.
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

## Campaign continuation — 14 October 2026

Healthy fresh launch (including the initial map card), a nine-item campaign reserve and detailed mission recovery
reports are implemented. Reports survive debrief reload and distinguish stash rewards/cargo, trade goods and
net carried-kit additions. Existing saves retain their inventory and earned wounds.
W22 auto-resolve uses selected fighter tiers, shown odds/wounds, seeded outcomes, restricted eligibility and
normal one-time settlement. Failed storage rolls back the in-memory attempt. Its human-played balance comparison
remains open; `tools/campaign-auto.mjs` samples the same resolver. Continue W10/W19 and W18 after that tuning.
The W4–W7 world/convoy/hunter work from main is retained and the campaign roadmap reflects it.

## Campaign milestones — 15 October 2026

W10 settlement assaults are on main (`d840171`). W19 territory/columns/food are on main (`d49f0a7`),
completed by W18 village recruitment and barter. Read the updated campaign roadmap for exact rules and limits.
Counterattacks move along saved routes, draw from actual garrisons, can be intercepted or defended, and retake
undefended seats. Village stock/volunteers refresh weekly; exchanges are item-for-item with failed-save rollback.
No campaign camp trader; practice shop unchanged. Validation: 497 Node tests, settlement and counterattack browser
flows, full campaign loop, all seven mission loot/reload reports, village keyboard/rollback/recruit deployment
and scoped axe accessibility checks; lint, formatting, typecheck, build and link checks pass. Next: W21 operation endings/defeat presentation,
W23 50-campaign harness, W22 human auto-resolve comparisons and W24 reference-device acceptance. Keep owner-authorized main commits.

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
