# Agent state

Small on purpose. Read this first, then `AGENTS.md`. Plan and sizes: [`README.md`](README.md). Work: [`packets.json`](packets.json).

## Latest handoff

<!-- handoff:start -->
**2026-10-01 16:50 UTC · claude · WP-C1/C2/C4/C5/C6 · done**

- Branch `claude/friendly-dijkstra-4ky9w6` at `f1edae0`; **31 uncommitted file(s)** (commit before stopping): M CHANGELOG.md,  M VERSION,  M assets/REGISTER.md,  M assets/js/items.js,  M assets/register.json,  M docs/CODEMAP.md.
- Last commits: f1edae0 feat(WP-C1,WP-C4): skeleton contract and data-driven roster switcher · 34cccd4 feat(WP-F1..F7): Partisan Project (PARP) v0.3.0 foundation · caded09 Agent briefings
- What happened: Skeleton contract, roster switcher, and v1 of Recon, Insurgent, Enforcer (extension packs bound by bone name, core shirt pack, plaid/recon camo). Tests 56/56, smoke green.
- Next step: Owner: WP-F8, WP-A1, WP-D1. Agents: WP-C8 poses, WP-C9 idle polish, WP-C3/C7 patches, WP-T4 workbench tests, then WP-T1.
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
