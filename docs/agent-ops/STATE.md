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

1. CM2 is complete. Read docs/engineering/recon-clothing-foundation.md and its four-side/pose sheet. The opt-in recon-modular asset is 7,902 triangles, with a continuous clean jacket, repaired trousers/waist/neck, fresh cloth maps and the canonical 26-bone rest frames.
2. Next modelling task is CM3: separate head/hood/mask and rebuild articulated gloves. Start from tools/assets/build-recon-foundation.py, recon_foundation_geometry.py and the modular contract. CM4 (pure item resolver) is also ready; new carriers still wait for CM5.
3. Use http://localhost:8132/operator/foundation.html for unarmed inspection or operator/#base=recon-modular for colours and rifle carries. The current Recon, original comparison and source teardown remain available. Rebuild using assets:recon-foundation with BLENDER set to Blender 4.4; generated .blend stays in ignored build/.
4. Latest fetched origin/main is 17eb192, with separate operator and game changes. This branch's corrected hand frames and protected face bake remain canonical. Reconcile concurrent changes deliberately; no main merge/push under the latest protection rule.
5. Run test:foundation for geometry and browser acceptance. Keep the foundation-only grip/pose profile, heat-weighted shoulders and wrist-rim constraints: unconstrained heat weights left a cuff gap when the pistol-grip hand rotated.

## Known limits

- Source head/hood/mask remain fused and gloves have fixed fingers until CM3. Foundation clearance sampling covers three rifles in eight held poses; the existing Recon still passes eleven rifles/eight poses. This does not certify every attachment or transition frame.
- Full unit suite: 220/222 passing; the same two baseline downloader failures (standalone generated-file mismatch and missing python3 on Windows PATH). Foundation geometry, source/built browser tests, existing Recon regression, built smoke, build/check, lint, configured typecheck, plan sync and changed JS formatting pass.
- Built site is 245.7 MB, above the inherited 90 MB target. High-resolution source models are inspection references, never gameplay character assets.
- No usage-meter values were available; no budget calibration was invented.
