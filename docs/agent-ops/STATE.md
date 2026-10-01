# Agent state

Small on purpose. Read this first, then `AGENTS.md`. Plan and sizes: [`README.md`](README.md). Work: [`packets.json`](packets.json).

## Latest handoff

<!-- handoff:start -->
**2026-10-01 19:19 UTC · agent · (no packet) · partial**

- Branch `claude/friendly-dijkstra-4ky9w6` at `eef471c`; **13 uncommitted file(s)** (commit before stopping): M CHANGELOG.md,  M assets/REGISTER.md,  M assets/register.json,  M docs/adr/0004-audio-provenance.md,  M docs/adr/README.md,  M docs/audio-direction.md.
- Last commits: eef471c Bench Lab: contact-sheet tool for reviewing hand contacts · 6116293 Bench Lab: advanced workbench animations return as an opt-in demo; rename owner to-do to vincent-todo · 885c0a3 Fix next-packet test for an exhausted roadmap
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
