# Agent state

Read `AGENTS.md` first. Work queue: [packets.json](packets.json); full plan: [tactical roadmap](../tactical-roadmap.md).

## Latest handoff

<!-- handoff:start -->
**2026-10-04 17:46 UTC · codex · WP-CM1 · done**

- Branch `codex/generated-operator-equipment` at `855c47b`; working tree clean.
- Last commits: 855c47b feat(WP-CM1): add Recon source teardown and modular authoring contract · 7fc1334 docs(WP-CM0): plan deep Recon character customisation · 964b7d8 docs(WP-CG2): note concurrent upstream model changes
- What happened: Completed the 27-part source teardown, committed front/back/exploded sheet, measured topology and runtime skeleton audit, and versioned modular authoring contract. Built-site teardown/comparison and accessibility pass; audit/plan tests, build/check, lint, configured typecheck and formatting pass. Full suite: 212/214 with two unchanged downloader failures. Feature milestone 855c47b pushed; original and current operator assets unchanged.
- Next step: CM2: rebuild complete clean torso/clothing under the fused vest using docs/engineering/recon-modular-audit.md and tools/assets/recon-modular-contract.json. Create an opt-in recon-modular authoring output; validate stripped front/back/side coverage and clean cloth textures before carriers. CM4 is also ready. No merge to main.
<!-- handoff:end -->

## Resume here

1. CM1 is complete. Read docs/engineering/recon-modular-audit.md and tools/assets/recon-modular-contract.json; the numbered sheet is committed beside the audit.
2. Next modelling task is CM2: rebuild complete clean torso/clothing under the fused vest, repair waist/shoulder/cuff/ankle seams and remove baked equipment marks. CM4 (pure item resolver) is also ready. Do not claim the clean body or new carriers are implemented yet.
3. Use http://localhost:8132/operator/teardown.html for 27-part inspection; the original comparison and current operator are unchanged. Future geometry is an opt-in recon-modular base.
4. Upstream at 285b45b has a separate 11,253-triangle colour bake; this branch's corrected hand rest frames and protected face bake are canonical for the new authoring contract. Preserve unrelated upstream game work on integration. No merge to main is authorised by the latest protection rule.
5. Run test:teardown for the source inspector. CM2 geometry changes additionally require operator/pose checks and a front/back/side stripped-body sheet.

## Known limits

- Source gloves have fixed fingers. Existing clearance sampling covers eleven default rifles in eight held poses, not every attachment or transition frame.
- Full unit suite: 212/214 passing; two baseline downloader failures (standalone generated-file mismatch and missing python3 on Windows PATH). CM1 asset/contract tests, browser teardown/comparison, build/check, lint, configured typecheck and changed JS formatting pass.
- Built site is 244.4 MB, above the inherited 90 MB target. High-resolution source models are inspection references, never gameplay character assets.
- No usage-meter values were available; no budget calibration was invented.
