# Agent state

Read `AGENTS.md` first. Work queue: [packets.json](packets.json); full plan: [tactical roadmap](../tactical-roadmap.md).

## Latest handoff

<!-- handoff:start -->
**2026-10-04 · codex · WP-CM0 · done**

- Branch `codex/generated-operator-equipment`; follows the original/current comparison at `964b7d8`.
- What happened: Wrote `docs/character-customisation-roadmap.md` for the owner's requested deep Recon-inspired customisation system. Defines a clean underbody, three carrier families, chest rigs, individual pouches/belts/bags, mounting and compatibility data, articulated hands, materials, accessible editing, versioned saves, budget allocation and release gates. Registered CM0–CM21: planning done, CM1 ready, twenty implementation packets planned. No geometry or runtime behaviour was changed by this planning task.
- Verification: all eight existing agent/plan tests pass; dependency graph, generated roadmap table and document links validate. Known baseline unit failures remain in the unrelated downloader tests.
- Next step: The next implementation task is CM1: audit the two inbound models and current conversions, make an exploded source sheet, identify fused jacket/carrier surfaces, reconcile upstream model changes and agree the skeleton/module contract. Do not mark asset modelling complete from this plan. The original/current comparison remains at http://localhost:8132/operator/compare.html.
- Upstream note: latest fetched main is `907f86d` and includes a separate Recon colour bake plus other demo changes. Those later commits are not merged here; this comparison intentionally shows this branch's verified textured conversion. Reconcile the two model pipelines deliberately before any future integration.
<!-- handoff:end -->

## Resume here

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

- The source gloves have fixed finger geometry. Clearance sampling covers eleven default rifles in eight held poses, not every attachment or transition frame.
- Full unit suite: two unrelated downloader failures (standalone generated-file mismatch and missing `python3` on Windows PATH).
- No usage-meter values were available; no budget calibration was invented.
