# Agent state

**Do not spend tokens on credits or licences** (express instruction, see AGENTS.md). Small on purpose. Read this first, then `AGENTS.md`. Plan and sizes: [`README.md`](README.md). Work: [`packets.json`](packets.json).

## Latest handoff

<!-- handoff:start -->
**2026-10-03 20:15 UTC · codex · WP-CG1 · done**

- Branch `codex/generated-operator-equipment` at `4757cea`; **2 uncommitted file(s)** (commit before stopping): M outbound/sketchfab-download.py,  M tools/assets/sketchfab-bulk-download.py.
- Last commits: 4757cea feat(WP-CG1): rig generated Recon with modular equipment and idle animation · b992e29 check site update · 21cf191 Merge branch 'main' of https://github.com/VincentDN/partisan-project
- What happened: Generated Recon imported from split inbound mesh: fitted 26-bone rig, 27 meshes, 11253 tris, 11 poses, 3 idles, 8 equipment slots and colour zones. 47 operator tests, 8 plan tests, full browser smoke, generated browser/axe audit, build/check, lint and typecheck pass. Baseline unit failures (downloader sync, Windows python3, internal-doc publishing) and existing format drift documented in docs/engineering/generated-recon.md. Only unrelated Windows executable-bit differences remain unstaged.
- Next step: Review the Generated Recon roster entry and docs/engineering/generated-recon.md on codex/generated-operator-equipment. Main is unchanged; no PR requested.
<!-- handoff:end -->

## Active this week

| Packet | Owner | Status |
|---|---|---|
| `WP-A1` download CC0 packs | owner | ready |
| `WP-C1` skeleton contract + tests | any | ready (fits 10 BU) |
| `WP-T4` Workbench unit tests | any | ready (fill-in) |

## Blockers

- Pages is not live until the branch is merged to `main` and Pages source is set to *GitHub Actions* (`WP-F8`).
- `WP-A15` SIG Spear: owner decision (pay or placeholder).

## Decisions since the last review

- 2026-10-01: project renamed Partisan Project; deployed from an allowlist build, not the repo root (ADR 0003).
