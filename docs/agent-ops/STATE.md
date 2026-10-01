# Agent state

Small on purpose. Read this first, then `AGENTS.md`. Plan and sizes: [`README.md`](README.md). Work: [`packets.json`](packets.json).

## Latest handoff

<!-- handoff:start -->
**2026-10-01 17:14 UTC · claude · WP-A6/A7/A8/T4 · done**

- Branch `claude/friendly-dijkstra-4ky9w6` at `773fb2e`; **14 uncommitted file(s)** (commit before stopping): M CHANGELOG.md,  M README.md,  M docs/CODEMAP.md,  M docs/agent-ops/packets.json,  M docs/game-design-master-doc.html,  M docs/master-roadmap.md.
- Last commits: 773fb2e feat(WP-I1,WP-I3): Workbench build on the operator and versioned P1 loadout codes · 5825db0 feat(WP-C9,WP-C10): blink, head-follow, a real head with hair and facial hair (v0.3.1) · 6740013 feat(WP-C8): ten poses including crouch, kneel and salute
- What happened: Rail footprints, four new slots (rail, trigger, charging, sling) plus back-up sight, workbench tests. 86 tests, smoke green.
- Next step: M1 now waits on the owner: WP-A1 (CC0 downloads), WP-A9 (G3A3 licence). Agents: WP-T1 split viewer.js, WP-Q1 accessibility, WP-Q4 guided tour, WP-I4 share card, WP-D4/D5 docs.
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
