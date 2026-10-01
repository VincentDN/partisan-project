# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/). Versions follow SemVer; `VERSION` and `index.html` change together.

## [0.3.1] · 2026-10-01

### Added
- **Recon, Insurgent, Enforcer** (v1) in the Operator Customiser as roster bases: original extension packs (hood, houndstooth scarf, chest radio; knit beanie, shemagh) bound to the Base Operator skeleton by bone name, plus a shirt torso pack so "Uniform only" no longer shows a hollow chest.
- Generated plaid and Recon camo fabrics; `tools/assets/blender_common.py`, `build-*-pack.py`, `optimize-pack.mjs`.
- `docs/engineering/skeleton-contract.md`, skeleton-contract and per-base tests, Recon/Insurgent/Enforcer browser tests.

- **Pose library to 10**: High ready, Shoulder arms, Crouch, Kneel (legs fold via a pose `lower` offset), Salute; `tools/pose-fit.mjs` can solve a raised elbow (`lowerZ=1`).

- **Idle polish**: eyelids blink on a deterministic schedule, and the head follows the camera (clamped, smoothed, off under reduced motion or with the toggle).
- **A real head**: the purchased character only has an eye strip inside a balaclava, so "bare head" showed floating eyes. The core pack adds a skull with ears and nose, a short-crop hairstyle, moustache and beard, hair colour and new slots (hair, facial hair). Beanie sits above the eyes.

- **Shared loadouts**: the Workbench publishes its build; the Operator Customiser can carry it as "Workbench build" (finishes, wear, rail offsets, rule repair). `shared/loadout.js` adds versioned `P1.` codes (also accepting every legacy link; retired Field/operator keys are ignored) with Copy code / Load code in the Workbench.

- **Rail footprints** (`workbench/rails.js`): parts on one rail can no longer overlap; fitting a long scope slides the back-up sight forward, stepper buttons stop at neighbours, links are repaired on load.
- **New slots**: back-up sight (flip-up), top rail (removable on the AK-74M, with a rule that blocks optics without it), trigger, charging handle, sling swivel and two-point sling.
- Workbench tests (`tests/workbench.test.mjs`, `tests/rails.test.mjs`): stat coverage, rule symmetry, exhaustive rail combinations.

- **Accessibility**: axe-core audit (`npm run test:a11y`, in CI) clean on every page; 3D stages are keyboard-operable; index d-pad targets enlarged, page headings and landmarks fixed.

- **Sleeve patches** (`patches-pack.glb`): six designs (star roundel, mountain shield, MP-O tag, tricolour placeholder, medic cross, chevrons) on either sleeve; Recon wears the shield and the MP-O tag, Insurgent the star.

- **Tooling**: ESLint 9 flat config, Prettier (JS formatted across the legacy modules), `tsc --checkJs` on the typed core modules; all three run in CI before the tests.

### Fixed
- Optimiser no longer merges materials (it had fused the top and trousers camo and two strap materials); packs keep UVs for runtime textures.
- Helmet and other multi-primitive parts now toggle correctly.

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
