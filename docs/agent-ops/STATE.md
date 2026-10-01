# Agent state

Small on purpose. Read this first, then `AGENTS.md`. Plan and sizes: [`README.md`](README.md). Work: [`packets.json`](packets.json).

## Latest handoff

<!-- handoff:start -->
**2026-10-01 17:02 UTC · claude · WP-C8/C9 (+C10 started) · done**

- Branch `claude/friendly-dijkstra-4ky9w6` at `6740013`; **17 uncommitted file(s)** (commit before stopping): M CHANGELOG.md,  M assets/models/operators/core-pack.glb,  M assets/models/operators/core-pack.manifest.json,  M assets/models/operators/insurgent-pack.glb,  M assets/models/operators/insurgent-pack.manifest.json,  M docs/CODEMAP.md.
- Last commits: 6740013 feat(WP-C8): ten poses including crouch, kneel and salute · 54d9890 feat(WP-C2,WP-C5,WP-C6): Recon, Insurgent and Enforcer v1 on the shared skeleton (v0.3.1) · f1edae0 feat(WP-C1,WP-C4): skeleton contract and data-driven roster switcher
- What happened: Poses (10), blink, head-follow, a real head with hair and beard, beanie fix. Tests 61/61, smoke green.
- Next step: Owner: WP-F8, WP-A1, WP-D1. Agents: WP-C3/C7 patches (C7 needs WP-D3), WP-I1 shared loadout, WP-T4/T1/T2/T3, WP-Q1, WP-Q4.
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
