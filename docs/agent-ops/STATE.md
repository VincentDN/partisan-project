# Agent state

Read `AGENTS.md` first. Work queue: [packets.json](packets.json); full plan: [tactical roadmap](../tactical-roadmap.md).

## Latest handoff

<!-- handoff:start -->
**2026-10-04 07:43 UTC · codex · WP-CG1 · done**

- Branch `codex/generated-operator-equipment` at `32dbca6`; implementation and verification committed.
- Last commits: 32dbca6 acceptance results · 5571082 integrate current main · dd17986 Recon texture and pose fixes.
- What happened: Recon now uses a 2K texture atlas and the complete textured head; repaired eye/mask seams, retained texture detail during tinting, calibrated palm frames and refitted eight carry poses. 14523 tris, 1.1 MB. All eleven rifles pass sampled torso clearance and palm reach in eight poses. 48 focused tests, all 21 browser smoke checks, built Recon acceptance with axe, build/link, lint and typecheck pass. Full suite: 208/210; unrelated downloader generation and missing Windows python3 remain. Integrated origin/main at 2c2a7df into this feature branch.
- Next step: Review codex/generated-operator-equipment and docs/engineering/generated-recon.md. Main is unchanged by this fix under the latest repository-protection instruction. Local preview: http://localhost:8132/operator/?standalone#base=generated-recon&pose=ready
<!-- handoff:end -->

## Resume here

1. Fetch latest main and inspect changes before reconciling this branch. Preserve both agents’ work.
2. Recon work is complete; review the textured face, ready/hero/port poses and equipment options in the local preview.
3. Rebuild instructions and limits are in `docs/engineering/generated-recon.md`. Use Blender 4.4, then the existing optimize-pack pipeline.
4. For further changes run `npm run test:operator`, the browser smoke suite, build/check, lint and typecheck. On Windows, set `CHROMIUM` to the installed Chrome executable.
5. Keep this change on its feature branch under the owner's latest repository-protection instruction. No PR was requested.

## Known limits

- The source gloves have fixed finger geometry. Clearance sampling covers eleven default rifles in eight held poses, not every attachment or transition frame.
- Full unit suite: two unrelated downloader failures (standalone generated-file mismatch and missing `python3` on Windows PATH).
- No usage-meter values were available; no budget calibration was invented.
