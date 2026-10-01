# Agent state

Small on purpose. Read this first, then `AGENTS.md`. Plan and sizes: [`README.md`](README.md). Work: [`packets.json`](packets.json).

## Latest handoff

<!-- handoff:start -->
**2026-10-01 17:28 UTC · claude · WP-T2/T3 · done**

- Branch `claude/friendly-dijkstra-4ky9w6` at `ff66460`; **69 uncommitted file(s)** (commit before stopping): M .github/workflows/pages.yml,  M AGENTS.md,  M CHANGELOG.md,  M assets/js/dither.js,  M assets/js/index.js,  M assets/js/items.js.
- Last commits: ff66460 feat(WP-C7): sleeve patches in six designs · c13dd2b feat(WP-Q1): axe-core accessibility audit in CI, keyboard-operable 3D stages · 59b0707 feat(WP-A6,WP-A7,WP-A8,WP-T4): rail footprints, new slots and workbench tests
- What happened: ESLint+Prettier+tsc on the core modules, formatted legacy JS; CI runs them first.
- Next step: WP-T1 split workbench/viewer.js (1100 formatted lines), WP-Q4 tour, WP-I4 share card, WP-D4/D5.
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
