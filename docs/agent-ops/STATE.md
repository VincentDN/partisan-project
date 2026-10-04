# Agent state

Read `AGENTS.md` first. Work queue: [packets.json](packets.json); full plan: [tactical roadmap](../tactical-roadmap.md).

## Latest handoff

<!-- handoff:start -->
**2026-10-04 · codex · WP-CG2 · done**

- Branch `codex/generated-operator-equipment`; follows verified CG1 texture/pose fixes at `972d0b6`.
- What happened: Added `operator/compare.html`, linked from the Operator Modder. Left: complete original inbound GLB, byte-for-byte with its 4K texture and 193534 triangles. Right: existing modular model in rest pose, 14523 triangles. Display-only orientation/ground alignment; synchronized cameras and lighting, full/torso/face views, wireframe and mobile layout. Source import script records a hash; source is registered as an inspection reference, explicitly exempt from the gameplay budget for this as-is comparison request.
- Verification: built-site comparison test and axe pass, including byte identity, decoded 4K texture, 1.85 m alignment, keyboard camera sync, reload and mobile overflow. Build/link, lint/typecheck pass. Full unit suite stays at 208/210 with the two pre-existing downloader failures.
- Next step: Review `operator/compare.html` and `docs/engineering/generated-recon.md`. Main remains unchanged under the latest repository-protection instruction. Local preview: http://localhost:8132/operator/compare.html
- Upstream note: latest fetched main is `907f86d` and includes a separate Recon colour bake plus other demo changes. Those later commits are not merged here; this comparison intentionally shows this branch's verified textured conversion. Reconcile the two model pipelines deliberately before any future integration.
<!-- handoff:end -->

## Resume here

1. Fetch latest main and inspect changes before reconciling this branch. Preserve both agents’ work.
2. Recon and comparison work is complete; review the unchanged source beside the current version. Use the comparison's Operator Modder link for animated poses and equipment options.
3. Rebuild instructions and limits are in `docs/engineering/generated-recon.md`. Use Blender 4.4, then the existing optimize-pack pipeline.
4. For further changes run `npm run test:comparison`, `npm run test:operator`, the browser smoke suite, build/check, lint and typecheck. On Windows, set `CHROMIUM` to the installed Chrome executable.
5. Keep this change on its feature branch under the owner's latest repository-protection instruction. No PR was requested.

## Known limits

- The source gloves have fixed finger geometry. Clearance sampling covers eleven default rifles in eight held poses, not every attachment or transition frame.
- Full unit suite: two unrelated downloader failures (standalone generated-file mismatch and missing `python3` on Windows PATH).
- No usage-meter values were available; no budget calibration was invented.
