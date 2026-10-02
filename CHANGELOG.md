# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/). Versions follow SemVer; `VERSION` and `index.html` change together.

## [0.3.1] · 2026-10-01

### Added (round 6)
- **Convoy Ambush** (`convoy/`, index entry 5): a top-down shooter and test bed for the enemy AI.
  - Scenario: you and two partisans ambush an eight-man army convoy that a log roadblock stops under your ridge.
  - Beliefs: soldiers act on what they believe (seen, heard, told over the radio), with error and fading confidence.
  - Callouts: they shout what they do, and the callouts share those beliefs with the squad.
  - Behaviour: dismount away from the threat, take cover, suppress where they think you are, get pinned, flank on the sergeant's order, search last-known positions and fall back after heavy losses.
  - The AI view shows each soldier's beliefs, view and state. The enemy awareness setting changes perception and comms, never health or aim.
  - The simulation is pure and seeded (`convoy/sim.js`, `convoy/ai.js`), with unit tests in `tests/convoy.test.mjs`.
- Convoy Ambush, round 2:
  - **MRAP** with a shielded DShK turret gunner. Rifles bounce off it; three RPG rockets destroy it, and any vehicle can burn.
  - **Weapons** (`convoy/weapons.js`): AK-74, PKM, SVD, RPG-7 (direct, splash, anti-vehicle), GP-25 (lobbed over cover) and the mounted DShK. You switch with 1, 2, 3; Mila carries the SVD and Dragan the PKM.
  - **Enemy roles**: squad leader, rifleman, machine gunner, marksman, radio operator (callouts twice as fast; kill him to slow the squad) and grenadier (lobs at believed positions). Each has its own silhouette.
  - Soldiers take a moment to react when the ambush opens. Failed smoke checks now close their pages, so one failure no longer starves the rest.
- Art Style Lab: **Cel shaded** style (two hard tones, bright flat colour, thick outlines).
- **Art Style Lab** (`operator/?lab`, index entry 4). It switches the operator and its rifle between art styles: Lit low-poly, Toon cel, Toon + ink, Clay study, Silhouette test, Nokia LCD, PS1 retro and Night vision. Styles are data in `shared/art-styles.js`: material swaps plus screen-space passes through the new `stage.setRender` hook. The chosen style is kept in the address (`?lab=<id>`).
- **Hands on the rifle**: `operator/grip.js` solves both arms onto the carried rifle each frame (two-bone IK, hand aligned to the grip). Weapon poses place the rifle in body space (`hold`, `muzzle`, `up`). The hero pose follows the moodboard. Also new: *Hero · both hands* and *Port arms* (replaces *Shoulder arms*). Low ready, high ready, crouch and kneel are reworked.
- `outbound/` (files for the owner, starting with the weapon sounds package) and `inbound/` (files from the owner). Neither is deployed.

### Changed (round 6)
- The Base Operator defaults to plain olive fabric; the pack camo stays selectable as *Original camo*.
- Tool-page sidebars, share cards and the style guide use Nokia greens instead of blue-grey.
- The Pages deploy no longer waits for the browser tests; they run in parallel.
- The Weapon Modder lists the modernised RPK.

### Removed
- **Credits page and licence audit** (ADR 0012): the Credits section of the design document, per-demo credit lists, the register audit tools and tests, `assets/REGISTER.md` and packet WP-Q3. Each place now says: credits and licences are in the GitHub documentation, or contact the owner. All agent instruction pages carry an express instruction not to spend tokens on credits or licences.

### Changed (round 5)
- **Chiptune cover of *The Duce Puts On His Uniform*** (`assets/audio/duce-chiptune.mp3`, `tools/audio/chiptune-duce.py`), the same length and beat grid as the recording. The Nokia index switches the player to it with an equal-power crossfade; other pages fade back to the recording; the two never restart (`Music.setVariant`, `sound.variant`). `npm run test:audio` (also in CI) checks sync and the handover.
- Nokia index blips are 50% louder.
- Game design doc: new section **Low poly and loud** (tone: native three.js low-poly look, milsim-inspired animation and sound, loud and chaotic gunfights).

### Changed (round 4)
- **Index**: opens straight on the menu (the "press any key" splash is gone); the camera follows the mouse 60% less; new **1. Weapon Workbench** (the opening scene) and the former 1 is now **2. Weapon Modder**.

### Changed (round 3)
- **Original opening scene and advanced animations restored verbatim** (`intro/`, ADR 0011): the code from vincentdenil-site, with its own operator, hands and bench timeline, wired to the current weapon customiser and the shared top bar and music player. One orange button on the scene: *Customize this weapon*. The rebuilt scene and Bench Lab are removed; the index lists "Advanced animations".

### Changed (round 2)
- **Top bar v2**: thinner (28 px), smaller type, dark-green base with pale-green ink and a little LCD scanline and dithered edge; the game design doc keeps the pale-green version. Left: a plain lambda with "Partisan Project" (tooltip "Return to home", goes to the opening scene). Buttons: INDEX and GAME DESIGN DOC only. The music player is a small drop-down (on/off, three tracks, volume) from one ♪ button.
- **Favicon** is now the lambda (dark green on bright green, 1px border, dithered shadow).
- **Names**: the abbreviation PARP is gone from page titles ("Partisan Project | Subpage"), the interface and every document; it survives only inside file names, storage keys and code identifiers.
- **Index scene** zoomed in on the phone; **interface sounds** (tap, select, back) synthesised in `shared/ui-sounds.js`, silent when the music is off.
- **The earlier operator is back** in the opening scene and in Bench Lab (`shared/legacy-operator/`, `bench/legacy-arms.js`), with its articulated hands; the Operator Customiser keeps the new Base Operator.

### Changed (site structure)
- **Opening scene restored** (`intro/`): the old workbench table, your saved rifle, the old radio tuning in, the FIA flag. One orange button bottom left: Customize this weapon (the index and the game design doc are in the top bar; Bench Lab is on the index). Arms are the Bench Lab IK arms; the code-built operator stays retired.
- **The music plays through the whole site**: `index.html` is now a shell that owns the sound layer and shows every page in one frame (ADR 0010). The radio and camp sound (`shared/bench-audio.js`) plays on the scene and the index, the clean track elsewhere.
- **One top bar on every page** (`shared/topbar.js`): Nokia LCD strip with INDEX and DESIGN DOC buttons and the music player (on/off, three tracks, volume). It replaces the per-page headers and music panels.
- **The Nokia index lies on the workbench table** (`menu/`): a close-up of a phone on the table with the live LCD laid over its screen by a projective transform (`shared/homography.js`). The phone body and keypad are gone from the HTML; the dithered key art is full width.
- Favicon inverted: dark green glyph on a bright green LCD card, 1px dark border and a dithered drop shadow.

### Performance
- **Idle render throttle** (`shared/stage.js`): a still scene renders at 8 fps instead of 60; any input, camera move or `stage.wake()` restores full rate; demos declare self-animation with `stage.setAnimated()`. Big battery and heat win on phones.
- **Half-size HDR environments** (512x256, `tools/assets/downscale-hdr.py`) are loaded on phones and coarse pointers: about a quarter of the bytes and GPU memory (Operator page 1.79 to 1.07 MB).
- Phones also use hard-edged PCF shadows; Data Saver skips the rifle prefetch.
- `Rig.update` skips the 83-bone pass when nothing changed (held pose, no idle, head still, springs settled); spring snaps to rest. Cached eyelid lookup; no per-frame allocations for mount-point labels.

### Added
- **Recorded handling foley restored** (ADR 0009): the 42-take bank from the earlier workbench (`assets/audio/foley/`, about 1.5 MB), owner-cleared and registered take by take. `workbench/mech.js` plays it once loaded and falls back to the synthesised sounds; Workbench, Customiser and Bench Lab all use it.
- **Bench Lab** (`bench/`, WP-X1, ADR 0008): the advanced workbench animations return as an opt-in experiment. Pick a part and two IK arms take the old one off, set it in the tray, fetch the new one and fit it, with Skip, Cancel, Quick changes, a review mode (`?review=1`) and synthesised handling sounds. No firing.

### Changed
- **WP-C3 (props)**: Recon gets a chest carabiner and a back canister ("Hip props" slot); recon pack 388 triangles. Owner sign-off still pending.
- **WP-C10**: bare-head options grow to 4 hairstyles (short crop, buzz, swept fringe, long) and 3 facial-hair styles plus both (moustache, goatee, beard), all in the Hair colour zone; core pack 984 triangles.
- **WP-D5**: `docs/ui-style-guide.md`; shared design tokens extracted to `shared/tokens.css` (imported by `panel-ui.css`).
- **WP-I4**: Operator Customiser "Save share card" (`operator/share-card.js`): operator render, look list, carried weapon and its stat bars, branding and link in one PNG.
- **WP-Q4**: guided first-run tour (`shared/tour.js`, 3 steps, Skip/Esc, remembered per demo) in the Workbench and Operator Customiser.
- Fixed: the Workbench stats panel had no mount point or styles after the migration; `#stats` and its CSS are back.
- **WP-C11**: secondary motion — a damped spring (`Spring` in `operator/rig.js`) makes the neck/scarf bone trail the torso's idle; off under reduced motion; unit-tested for stability and cost.
- **WP-T1**: `workbench/viewer.js` now uses `shared/stage.js` and `shared/music-ui.js`; stats panel, summary and PNG export moved to `stats-panel.js`, `summary.js`, `export.js` (1,109 → ~720 lines). Behaviour unchanged.

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
- **Partisan Project** repository layout: `workbench/`, `operator/`, `viewer/`, `docs/`, `shared/`, `assets/`, `vendor/`, `tools/`, `tests/`.
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
