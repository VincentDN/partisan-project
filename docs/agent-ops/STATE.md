# Agent state

Read `AGENTS.md` first. Work queue: [packets.json](packets.json).

## Latest handoff

<!-- handoff:start -->
**2026-10-07 · codex · WP-CM6 · cloud validation pending**

- Work remains on `codex/generated-operator-equipment`; no main merge/push or PR.
- Implemented the radio display topology repair, post-export checks, measured webbing seating, loaded pose/slung fitting and keyboard focus preservation. Geometry still totals 860 template triangles; six radios with the body/carrier total 8,940.
- Verified 244 units, lint and typecheck in the cloud. The 108 held/slung configurations, 19 motion samples and colour/keyboard/mobile checks passed before the final 7.5 mm seating refinement; five focused units pass with that refinement. Final built-site regressions are queued in `.github/workflows/cm6-cloud.yml` on GitHub-hosted Ubuntu because the interactive cloud sandbox blocks Chromium sockets without a separate runtime permission.
- Cloud run 37666809660 passed units, lint, types, formatting, build/check and site smoke, then the original Recon test sampled a stale ready pose after a fixed 250 ms delay. Carry tests now share the pouch suite's rendered-frame wait; clearance thresholds are unchanged. Inspect the next run, review its final contact-sheet artifact, then mark CM6 done and push completion before CM7.
<!-- handoff:end -->

## Resume here

1. Read [recon-pouches.md](../engineering/recon-pouches.md) for authored geometry, mounting, fitted profile, budgets and acceptance scope. The original cloud handoff is historical.
2. Preserve the original Recon/comparison, foundation body/finger frames and CM5 carrier geometry. The `reconPouches` profile is active only with mounted pouches; removal restores the prior profiles.
3. The six fixed slots remain CM6 scope; free assembly editing, undo and versioned save migration belong to CM8. No credits or licences work.
4. The current contact sheet is the inspected pre-seating-refinement sheet. Replace it with the successful cloud runner's final image before completion. Its artifact also includes mobile imagery and validation logs.
5. Packet status stays `ready` until cloud acceptance succeeds. Then regenerate roadmap/code map, commit and push this branch, and hand off CM7 (belt/daypack).

## Known limits

- The cloud sandbox can run direct Node checks, but default isolated test workers and Chromium need runtime permissions. GitHub Actions provides the complete regression runner.
- Prior Windows downloader failures did not reproduce in Linux: the full suite passed 244/244 before final documentation/seating updates.
- The inherited site is about 246.2 MB against the 90 MB target. No unrelated asset cleanup is included.
- Per-vertex clearance samples cover three rifles and selected motion frames, not every triangle crossing, transition or future loadout. CM9 expands coverage.
- No usage-meter calibration was invented.
