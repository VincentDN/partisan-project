# Agent state

Small on purpose. Read this first, then `AGENTS.md`. Plan and sizes: [`README.md`](README.md). Work: [`packets.json`](packets.json).

## Latest handoff

<!-- handoff:start -->
**2026-10-01 18:23 UTC · agent · (no packet) · partial**

- Branch `claude/friendly-dijkstra-4ky9w6` at `66d5db8`; **8 uncommitted file(s)** (commit before stopping): M CHANGELOG.md,  M assets/models/operators/core-pack.glb,  M assets/models/operators/core-pack.manifest.json,  M docs/CODEMAP.md,  M docs/agent-ops/packets.json,  M docs/master-roadmap.md.
- Last commits: 66d5db8 WP-D5: UI style guide and shared design tokens · f3f1562 WP-I4: combined operator + weapon share card · 46e5284 WP-Q4: guided first-run tour; restore Workbench stats panel
- What happened: (write one or two sentences)
- Next step: (name the exact next action, file and command)
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
