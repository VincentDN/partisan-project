# Agent state

Read `AGENTS.md` first. Work queue: [packets.json](packets.json); full plan: [tactical roadmap](../tactical-roadmap.md).

## Latest handoff

<!-- handoff:start -->
**2026-10-05 10:30 UTC · codex · WP-CM2 · done**

- Branch `codex/generated-operator-equipment` at `5bfc454`; working tree clean.
- Last commits: 5bfc454 fix(WP-CM2): remove foundation hood and strengthen chest and neck · 3e4d278 docs(WP-CM2): record completed foundation handoff · 51c4edb feat(WP-CM2): rebuild clean Recon clothing foundation
- What happened: Completed and pushed 5bfc454: remove the outer hood, rebuild a closed fitted masked head around the preserved eyes, broaden chest and neck, smooth underarm weights and anchor the collar to the torso. Foundation now 5,263 triangles with the unchanged skeleton. Geometry/pose tests and 24 rifle carries pass; refreshed sheet, build/check, lint, typecheck, formatting and plan sync pass. Full units 221/223 with two unchanged downloader failures. Local preview updated.
- Next step: CM3: separate the remaining face covering and rebuild articulated gloves using the foundation authoring scripts, including recon_foundation_head.py. CM4 item resolver is also ready. Keep collar/wrist constraints and original models; no main merge or push.
<!-- handoff:end -->

## Resume here

1. CM2 is complete. Read docs/engineering/recon-clothing-foundation.md and its four-side/pose sheet. The opt-in recon-modular asset is now 5,263 triangles: hood removed, fitted masked crown/back, broader chest and neck, continuous jacket, repaired clothing, fresh cloth maps and the canonical 26-bone rest frames.
2. Next modelling task is CM3: separate the remaining face covering and rebuild articulated gloves. Start from tools/assets/build-recon-foundation.py, recon_foundation_geometry.py, recon_foundation_head.py and the modular contract. CM4 (pure item resolver) is also ready; new carriers still wait for CM5.
3. Use http://localhost:8132/operator/foundation.html for unarmed inspection or operator/#base=recon-modular for colours and rifle carries. The current Recon, original comparison and source teardown remain available. Rebuild using assets:recon-foundation with BLENDER set to Blender 4.4; generated .blend stays in ignored build/.
4. Latest fetched origin/main is 17eb192, with separate operator and game changes. This branch's corrected hand frames and protected face bake remain canonical. Reconcile concurrent changes deliberately; no main merge/push under the latest protection rule.
5. Run test:foundation for geometry and browser acceptance. Keep the foundation-only grip/pose profile, smoothed shoulder weights, torso-anchored collar and wrist-rim constraints: unconstrained heat weights left a cuff gap when the pistol-grip hand rotated.

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

- The outer hood is removed from the foundation; its fitted head still includes the face covering, and gloves have fixed fingers until CM3. Foundation clearance sampling covers three rifles in eight held poses; the existing Recon still passes eleven rifles/eight poses. This does not certify every attachment or transition frame.
- Full unit suite: 221/223 passing; the same two baseline downloader failures (standalone generated-file mismatch and missing python3 on Windows PATH). Foundation geometry, source/built browser tests, existing Recon regression, built smoke, build/check, lint, configured typecheck, plan sync and changed JS formatting pass.
- Built site is 245.7 MB, above the inherited 90 MB target. High-resolution source models are inspection references, never gameplay character assets.
- No usage-meter values were available; no budget calibration was invented.
