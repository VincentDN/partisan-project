# Agent state

Read `AGENTS.md` first. Work queue: [packets.json](packets.json); full plan: [tactical roadmap](../tactical-roadmap.md).

## Latest handoff

<!-- handoff:start -->
**2026-10-05 10:14 UTC · codex · WP-CM2 · done**

- Branch `codex/generated-operator-equipment` at `51c4edb`; working tree clean.
- Last commits: 51c4edb feat(WP-CM2): rebuild clean Recon clothing foundation · f1b03ae docs(WP-CM1): record teardown verification and clean-body handoff · 855c47b feat(WP-CM1): add Recon source teardown and modular authoring contract
- What happened: Completed and pushed 51c4edb: opt-in 7,902-triangle clean clothing foundation, fresh cloth maps, continuous jacket and wrist seams, unchanged canonical skeleton, separate carry fit and inspection sheet. Foundation source/built browser checks, 24 carries, 88 existing Recon carries, built smoke, build/check, lint, typecheck, formatting and plan sync pass. Full units 220/222 with two unchanged downloader failures. Preview serves the verified model on localhost:8132.
- Next step: CM3: separate head/hood/mask and rebuild articulated gloves using docs/engineering/recon-clothing-foundation.md, tools/assets/build-recon-foundation.py and recon_foundation_geometry.py. CM4 item resolver is also ready. Preserve foundation wrist constraints and original models; reconcile origin/main 17eb192 deliberately, with no main merge or push.
<!-- handoff:end -->

## Resume here

1. CM2 is complete. Read docs/engineering/recon-clothing-foundation.md and its four-side/pose sheet. The opt-in recon-modular asset is now 5,263 triangles: hood removed, fitted masked crown/back, broader chest and neck, continuous jacket, repaired clothing, fresh cloth maps and the canonical 26-bone rest frames.
2. Next modelling task is CM3: separate the remaining face covering and rebuild articulated gloves. Start from tools/assets/build-recon-foundation.py, recon_foundation_geometry.py, recon_foundation_head.py and the modular contract. CM4 (pure item resolver) is also ready; new carriers still wait for CM5.
3. Use http://localhost:8132/operator/foundation.html for unarmed inspection or operator/#base=recon-modular for colours and rifle carries. The current Recon, original comparison and source teardown remain available. Rebuild using assets:recon-foundation with BLENDER set to Blender 4.4; generated .blend stays in ignored build/.
4. Latest fetched origin/main is 17eb192, with separate operator and game changes. This branch's corrected hand frames and protected face bake remain canonical. Reconcile concurrent changes deliberately; no main merge/push under the latest protection rule.
5. Run test:foundation for geometry and browser acceptance. Keep the foundation-only grip/pose profile, smoothed shoulder weights, torso-anchored collar and wrist-rim constraints: unconstrained heat weights left a cuff gap when the pistol-grip hand rotated.

## Known limits

- The outer hood is removed from the foundation; its fitted head still includes the face covering, and gloves have fixed fingers until CM3. Foundation clearance sampling covers three rifles in eight held poses; the existing Recon still passes eleven rifles/eight poses. This does not certify every attachment or transition frame.
- Full unit suite: 221/223 passing; the same two baseline downloader failures (standalone generated-file mismatch and missing python3 on Windows PATH). Foundation geometry, source/built browser tests, existing Recon regression, built smoke, build/check, lint, configured typecheck, plan sync and changed JS formatting pass.
- Built site is 245.7 MB, above the inherited 90 MB target. High-resolution source models are inspection references, never gameplay character assets.
- No usage-meter values were available; no budget calibration was invented.
