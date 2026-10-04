# Agent state

Read `AGENTS.md` first. Work queue: [packets.json](packets.json); full plan: [tactical roadmap](../tactical-roadmap.md).

## Latest handoff

<!-- handoff:start -->
**2026-10-03 20:15 UTC · codex · WP-CG1 · done**

- Branch `codex/generated-operator-equipment` at `4757cea`; **2 uncommitted file(s)** (commit before stopping): M outbound/sketchfab-download.py,  M tools/assets/sketchfab-bulk-download.py.
- Last commits: 4757cea feat(WP-CG1): rig generated Recon with modular equipment and idle animation · b992e29 check site update · 21cf191 Merge branch 'main' of https://github.com/VincentDN/partisan-project
- What happened: Generated Recon imported from split inbound mesh: fitted 26-bone rig, 27 meshes, 11253 tris, 11 poses, 3 idles, 8 equipment slots and colour zones. 47 operator tests, 8 plan tests, full browser smoke, generated browser/axe audit, build/check, lint and typecheck pass. Baseline unit failures (downloader sync, Windows python3, internal-doc publishing) and existing format drift documented in docs/engineering/generated-recon.md. Only unrelated Windows executable-bit differences remain unstaged.
- Next step: Review the Generated Recon roster entry and docs/engineering/generated-recon.md on codex/generated-operator-equipment. Main is unchanged; no PR requested.

**2026-10-03 · Codex · WP-S20 done / WP-S21 verification pending**

- Branch: `codex/extraction-roadmap`, based on Claude’s `main` at `8f30cf1`. Do not overwrite Claude’s S20–S26 plans.
- Owner requested a checkpoint commit of all work and a roadmap for later; no merge or deployment requested.
- Built S20: active-rebel alias, retained per-rebel state, AI handoff, forced choice, all-down loss; seven focused tests.
- S21 interface exists: Q/button, slow-motion framing, projected choices, 1–4, cooldown, forced timeout, reduced-motion path.
- Verified earlier: 142 tests, build/check, lint/typecheck and reduced-motion browser journey passed. Checkpoint checks rerun below.
- Normal-motion test initially waited for moving buttons to become stable; pointer actions now bypass that animation wait.
  Its rerun was interrupted and has no retained result. Do not claim full S21, visual review or axe acceptance yet.
- Recovered byte-for-byte study from `vincentdenil-site` commit `042383bbaffa405f708b513154eddb04fe80bf7e`:
  `outbound/tlou2-workbench-study/` (Markdown, illustrated HTML, board, six screenshots and manifest). Not deployed.
- Roadmap/packets now define finite loot, timed extraction, save transactions, recovery economy, maps, progression and gated online work.
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

## Known limits

- This checkpoint is squad-control groundwork, not a finished extraction loop: ammo/stash/loot/persistence still need implementation.
- Squad-switch sound filtering is deferred; existing medical/permanent loss rules are planned, not implemented.
- Local browser saves cannot serve as trusted online inventory. Practice and campaign ownership must stay separate.
- No usage-meter values were available; no budget calibration was invented.
