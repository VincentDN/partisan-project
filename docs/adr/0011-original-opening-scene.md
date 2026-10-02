# 0011 · The original opening scene and advanced animations replace the rebuilt versions

**Status** accepted · 2026-10-02 · supersedes 0008

**Context.** The rebuilt opening scene and Bench Lab mixed new rigs and models with the old scene setup and conflicted. The owner asked for the original code instead of a mix, keeping the current weapon customiser (`workbench/`), the Operator Customizer and the music player.

**Decision.**
1. `intro/` holds the original workbench opener (`index.html`, `workbench.js`) and advanced-animations test (`advanced.html`, `advanced-workbench.js`, `bench-*.js`) copied from vincentdenil-site, with the old modules they need under `intro/ak15-weapon-customiser/` (models, attachments, rifle instance and finishes, loadout, stats, mech, sfx, operator, field). They are excluded from Prettier and ESLint so they stay as they were.
2. The only edits: three.js from `vendor/`; weapon models, studio HDR and the cleared foley bank point at `assets/`; the music block is replaced by the shared top bar and sound layer (same radio-and-camp mix); `Customize this weapon` and `Open full customiser` go to `../workbench/` with the build hash; the stage gets `role="img"` (accessibility audit); the page headers and the extra buttons on the scene are gone; titles read `Partisan Project | …`.
3. Removed: `bench/` (Bench Lab), the restored-operator glue, and my rebuilt scene.

**Consequences.** `intro/` runs the old code, so its quality gates are the old tests (`tests/legacy/`), the browser smoke test and the accessibility audit. The Nokia index keeps `shared/bench-scene.js` for the table close-up.
