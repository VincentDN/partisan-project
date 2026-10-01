# Agent state

Small on purpose. Read this first, then `AGENTS.md`. Plan and sizes: [`README.md`](README.md). Work: [`packets.json`](packets.json).

## Latest handoff

<!-- handoff:start -->
**2026-10-01 · claude · WP-F1..F7 (restructure session) · done**

- Branch `claude/friendly-dijkstra-4ky9w6`; all M0 packets are done except the owner actions `WP-F8` / `WP-F10`.
- What happened: project migrated from vincentdenil-site into this repo, firing / hand-animation / procedural operator removed, Operator Customiser v1 built on the purchased soldier, asset register + import tooling, Nokia-style index, design doc, master roadmap, Pages workflow. Real CC0 downloads (OpenGameArt, itch.io, Sketchfab) were NOT possible from the build sandbox (network policy), so attachments are still code-built placeholders.
- Next step: owner does `WP-F8` (enable Pages, merge, confirm licences) and `WP-A1` (download CC0 packs into `assets-incoming/`); then `WP-A2`.
<!-- handoff:end -->

## Active this week

| Packet | Owner | Status |
|---|---|---|
| `WP-F8` enable Pages, confirm licences | owner | ready |
| `WP-A1` download CC0 packs | owner | ready |
| `WP-C1` skeleton contract + tests | any | ready (fits 10 BU) |
| `WP-T4` Workbench unit tests | any | ready (fill-in) |

## Blockers

- Pages is not live until the branch is merged to `main` and Pages source is set to *GitHub Actions* (`WP-F8`).
- `WP-A9` G3A3 and `WP-A13` Mk14: licence must be verified on the exact asset page by the owner.
- `WP-A15` SIG Spear: owner decision (pay or placeholder).

## Decisions since the last review

- 2026-10-01: project renamed Partisan Project (PARP); deployed from an allowlist build, not the repo root (ADR 0003).
- 2026-10-01: recorded foley bank removed for provenance reasons; handling sounds are synthesised (ADR 0004).
