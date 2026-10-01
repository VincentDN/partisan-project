# 0001 · Name, layout and buildless static site

**Status** accepted · 2026-10-01

**Context.** The project lived inside the portfolio site under `3d/partisan-project/ak15-workbench-intro/ak15-weapon-customiser/`, mixing a weapon tool, a procedural character, an animation experiment and four roadmaps. The end state is an interactive game design document: several demos plus a design doc.

**Decision.** The project is **Partisan Project (PARP)**. One repository, top-level modules: `workbench/`, `operator/`, `viewer/`, `docs/`, with `shared/`, `assets/`, `vendor/`, `tools/`, `tests/`. The root `index.html` is the index browser. No bundler: ES modules and an import map per page; Node is used only for tests, the site build and asset tooling.

**Consequences.** Anyone can open the site from any static host. Module paths are relative, so the same files work at `/` and `/partisan-project/`. A bundler becomes worthwhile only if the module graph or decoder tooling outgrows import maps (trigger: ~150 modules or a need for Draco/KTX2 transcoders).
