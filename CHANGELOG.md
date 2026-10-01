# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/). Versions follow SemVer; `VERSION` and `index.html` change together.

## [0.3.0] · 2026-10-01 · "Foundation"

### Added
- **Partisan Project (PARP)** repository layout: `workbench/`, `operator/`, `viewer/`, `docs/`, `shared/`, `assets/`, `vendor/`, `tools/`, `tests/`.
- **Operator Customiser**: Base Operator from the purchased low-poly soldier (8,646 triangles, 83 bones), 10 equipment slots, 8 colour zones, 5 hero poses (including the character sheet's rifle-up pose), 3 idle animations, optional carried rifle prop, shareable URL looks, photo export, budget readout.
- Data-driven pose system: character-space rotations over the rest pose (`operator/poses.json`, `operator/rig.js`), `tools/pose-fit.mjs`.
- **Asset Viewer** and the **asset register** (`assets/register.json`) with licence audit and import tooling (`tools/assets/*`).
- Nokia-style 1-bit LCD **index browser** with Bayer dither.
- In-universe **design document** (`docs/game-design-master-doc.html`), **master roadmap**, **moodboard** and **art direction**.
- **Agent-ops**: work packets, budget units, handoff protocol and tooling for two $20 subscriptions.
- GitHub Pages workflow with allowlist build, link/import checker and unit + browser smoke tests.

### Changed
- Weapon Workbench moved out of the portfolio site; three.js vendored (no CDN); shared stage, sound layer and music UI.

### Removed
- Test fire, muzzle flash, recoil kick, reload, range drill, the bench scene with articulated hands, the Advanced animations experiment, the code-built procedural operator and Field mode.
- The recorded foley bank (provenance could not be shown): handling sounds are synthesised.
- The previous `partisan-project` contents (AI compendium and premise page) moved to `vincentdenil.com/docs/partisan-ai/`.
