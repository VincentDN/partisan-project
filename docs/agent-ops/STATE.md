# Agent state

Read `AGENTS.md` first. Work queue: [packets.json](packets.json); full plan: [tactical roadmap](../tactical-roadmap.md).

## Latest handoff

<!-- handoff:start -->
**2026-10-06 18:26 UTC · claude · WP-S10 · partial**

- Branch `claude/friendly-dijkstra-4ky9w6` at `bfe9b34`; working tree clean.
- Last commits: bfe9b34 style: format the inventory preview scene · 1b9a64e feat(WP-S9, S11): search the dead in missions; rebels fire the real rounds in their kits · 47ee0a0 feat(WP-S10): grid inventory screen: drag, turn, load rounds into magazines, swap magazines, loot a body and a cache
- What happened: Grid inventory: shared/inventory/ core (S8, S43), test page inventory/ (S10 first cut), searching bodies and wrecks in missions with hold E (convoy/field-search.js, S9 first cut), rebels fire the real rounds in their kits (convoy/kit-ammo.js, sim.ammo hooks, S11 first cut). Unit tests (kit-ammo, inventory) and tests/e2e/inventory.mjs pass.
- Next step: Carry the mission kits home: debrief writes each fighter's kit to the campaign save and the stash (S10 stash screen, S12). Then the army spends and loots ammunition (S11), level caches and convoy cargo as searchable objects, order a teammate to loot (S9).
<!-- handoff:end -->

## Resume here

1. CM4 is complete. Read docs/engineering/operator-assembly.md, operator/assembly.js and operator/assembly-schema.js. Pure-data resolution validates ownership, repeated copies, mounted footprints, fit/skeleton versions, exclusions, coverage and full geometry cost. Detachment returns a recoverable subtree draft. The current Modder interface is unchanged.
2. Next packet is CM5: model the lightweight plate carrier against the CM3 foundation. Author separate front/rear plate bags, shoulders, cummerbund and placard, then measured asset-backed definitions/mounts. Test empty/loaded poses and clean removal. Synthetic tests/fixtures/operator-assembly.mjs dimensions are examples, not production fits.
3. The opt-in foundation stays 5,568 triangles: hood-free, broader chest/neck, complete stylized head, removable mask/cap and articulated gloves. Inspect http://localhost:8132/operator/foundation.html or operator/#base=recon-modular. The original/current comparison remains available.
4. Preserve recon-v2's 26 canonical body frames plus 30 finger joints, local finger rotations, measured palm targets and CM2 collar/wrist constraints. Rebuild with assets:recon-foundation and BLENDER set; generated .blend stays ignored.
5. Keep CM5 definitions compatible with the version 1 assembly contract. CM8 will connect the renderer/editor, undo and URL/save migration; do not replace existing saves prematurely. Work remains on codex/generated-operator-equipment; no main merge/push under the protection rule.

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

- CM4 has no asset-backed equipment catalogue or visible new carrier. It validates authored data; it cannot prove animation clearance, repair missing clothing, apply material finishes or perform gameplay inventory transactions. Unknown items remain in the caller's draft for recovery.
- CM3 face/eyes are stylized flat materials without facial animation. Prior geometry/browser checks cover 24 foundation and 88 existing-Recon rifle carries, not all attachments or transition frames. CM4 changes no geometry or pose code.
- Full-suite and build results are recorded in the latest handoff. Two prior downloader failures are unrelated to CM4: standalone generated-file mismatch and missing python3 on Windows PATH.
- Built site remains above the inherited 90 MB target (approximately 245.8 MB). Inspection reference models contribute to this total.
- No usage-meter values were available; no budget calibration was invented.
