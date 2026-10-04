# Agent state

Read `AGENTS.md` first. Work queue: [packets.json](packets.json); full plan: [tactical roadmap](../tactical-roadmap.md).

## Latest handoff

<!-- handoff:start -->
**2026-10-04 · codex · WP-CM0 · done**

- Branch `codex/generated-operator-equipment`; follows the original/current comparison at `964b7d8`.
- What happened: Wrote `docs/character-customisation-roadmap.md` for the owner's requested deep Recon-inspired customisation system. Defines a clean underbody, three carrier families, chest rigs, individual pouches/belts/bags, mounting and compatibility data, articulated hands, materials, accessible editing, versioned saves, budget allocation and release gates. Registered CM0–CM21: planning done, CM1 ready, twenty implementation packets planned. No geometry or runtime behaviour was changed by this planning task.
- Verification: all eight existing agent/plan tests pass; dependency graph, generated roadmap table and document links validate. Known baseline unit failures remain in the unrelated downloader tests.
- Next step: The next implementation task is CM1: audit the two inbound models and current conversions, make an exploded source sheet, identify fused jacket/carrier surfaces, reconcile upstream model changes and agree the skeleton/module contract. Do not mark asset modelling complete from this plan. The original/current comparison remains at http://localhost:8132/operator/compare.html.
- Upstream note: latest fetched main is `907f86d` and includes a separate Recon colour bake plus other demo changes. Those later commits are not merged here; this comparison intentionally shows this branch's verified textured conversion. Reconcile the two model pipelines deliberately before any future integration.
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
