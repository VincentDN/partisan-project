# Agent state

Read `AGENTS.md` first. Work queue: [packets.json](packets.json); full plan: [tactical roadmap](../tactical-roadmap.md).

## Latest handoff

<!-- handoff:start -->
**2026-10-05 16:22 UTC · codex · WP-CM3 · done**

- Branch `codex/generated-operator-equipment` at `3bc89c3`; working tree clean.
- Last commits: 3bc89c3 feat(WP-CM3): add removable headwear and articulated Recon hands · e158c28 docs(WP-CM2): hand off hood-free foundation refinement · 5bfc454 fix(WP-CM2): remove foundation hood and strengthen chest and neck
- What happened: Completed and pushed 3bc89c3: complete stylized head, removable mask/cap, articulated gloves and four data-driven hand shapes. The 5,568-triangle foundation preserves 26 canonical joints and adds 30 finger joints. Foundation geometry/browser checks and 24 rifle carries pass; original Recon passes 88 carries. Built smoke, build/check, lint, typecheck, formatting and plan tests pass. Full units 222/224 with two unchanged downloader failures. Review sheets committed and preview current.
- Next step: CM4: implement pure item-instance/compatibility resolver from the modular contract and roadmap; refine its acceptance first. CM5 then authors the first carrier. Preserve body rest frames, local finger rotations and CM2 collar/wrist constraints. No main merge or push.
<!-- handoff:end -->

## Resume here

1. CM3 is complete. Read docs/engineering/recon-head-hands.md and its two contact sheets. The opt-in recon-modular asset is 5,568 triangles with a complete stylized head, removable mask/cap and articulated gloves. The hood remains removed; chest/neck proportions from CM2 are retained.
2. Next packet is CM4: pure item-instance and compatibility resolver, using the modular contract and roadmap. Refine its acceptance before implementation. CM5 then authors the first carrier; do not add carrier geometry before the resolver gate.
3. Use http://localhost:8132/operator/foundation.html for headwear/hand-shape inspection or operator/#base=recon-modular for colours and rifle carries. The current Recon, original comparison and source teardown remain available. Rebuild using assets:recon-foundation with BLENDER set; generated .blend stays in ignored build/.
4. The recon-v2 extension preserves all 26 canonical bone rest frames and adds 30 finger joints. assets/models/operators/recon-modular.rig.json records the extension. Finger angles are local-space pose data; legacy profiles remain character-space. Keep the collar/wrist constraints and measured palm targets.
5. Latest fetched origin/main is 17eb192, with separate operator and game changes. Reconcile concurrent changes deliberately; no main merge/push under the latest protection rule. Work stays on codex/generated-operator-equipment.

## Known limits

- Head and eye geometry use flat materials; cloth and boots retain textures. This is a stylized base without facial expressions or lip-sync. Four hand shapes are authored in poses.json. No outer hood is reintroduced.
- Foundation clearance sampling passes three rifles in eight held poses; existing Recon passes eleven rifles/eight poses. This does not certify every attachment or transition frame.
- Full unit suite: 222/224 passing; the same two baseline downloader failures (standalone generated-file mismatch and missing python3 on Windows PATH). Foundation geometry/browser acceptance, existing Recon regression, built-site smoke, build/check, lint, configured typecheck and changed JS formatting pass.
- Built site is 245.8 MB, above the inherited 90 MB target. High-resolution source models remain inspection references.
- No usage-meter values were available; no budget calibration was invented.
