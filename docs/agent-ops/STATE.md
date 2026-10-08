# Agent state

Read `AGENTS.md` first. Work queue: [packets.json](packets.json).

## Latest handoff

<!-- handoff:start -->
**2026-10-08 · codex · campaign vertical-slice milestone on main**

- Merged equipment with Claude's main baseline `9539df0` in local merge `11daa61`; owner explicitly authorizes commits and push to main.
- Default overworld is now 2.5D (`map/`); old 3D style is `map/3d.html` under Dev tools. `map25/` redirects.
- Reviewed and reduced rendering/picking/route/DOM work. Reproducible terrain picking benchmark: 3.686 ms → 0.0063 ms median (400 rays); not a browser FPS claim.
- All seven missions start with eight rebels at 180 base HP. Campaign selects six to nine fit fighters and passes their exact roster. Legacy three-person saves expand once without resetting progression or wounds.
- Added friendly-settlement rest/trade, persistent convoy motion and Operation Foothold (convoy victory, three victories, Fort Orion liberated). Campaign save failures block navigation; duplicate deployments are rejected.
- Revised campaign/master roadmap against implemented code, partial strategic systems and explicit vertical-slice acceptance. See `docs/campaign-roadmap.md` and `docs/engineering/campaign-performance.md`.
- Validation: 394/397 unit assertions pass; the remaining three are sandbox `spawnSync EPERM` in CLI/asset/site harnesses. Direct site build/link check, lint, typecheck, formatting and roadmap checks pass. Sixteen combat replay fixtures intentionally updated for roster/health tuning.
- Chromium launch is blocked by sandbox socket restrictions; the elevated request was interrupted. Browser loop, accessibility, hardware FPS and CM6's final motion gate remain pending. Do not label them passed.
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
