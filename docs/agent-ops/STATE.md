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

1. CM4 is complete. Read docs/engineering/operator-assembly.md, operator/assembly.js and operator/assembly-schema.js. Pure-data resolution validates ownership, repeated copies, mounted footprints, fit/skeleton versions, exclusions, coverage and full geometry cost. Detachment returns a recoverable subtree draft. The current Modder interface is unchanged.
2. Next packet is CM5: model the lightweight plate carrier against the CM3 foundation. Author separate front/rear plate bags, shoulders, cummerbund and placard, then measured asset-backed definitions/mounts. Test empty/loaded poses and clean removal. Synthetic tests/fixtures/operator-assembly.mjs dimensions are examples, not production fits.
3. The opt-in foundation stays 5,568 triangles: hood-free, broader chest/neck, complete stylized head, removable mask/cap and articulated gloves. Inspect http://localhost:8132/operator/foundation.html or operator/#base=recon-modular. The original/current comparison remains available.
4. Preserve recon-v2's 26 canonical body frames plus 30 finger joints, local finger rotations, measured palm targets and CM2 collar/wrist constraints. Rebuild with assets:recon-foundation and BLENDER set; generated .blend stays ignored.
5. Keep CM5 definitions compatible with the version 1 assembly contract. CM8 will connect the renderer/editor, undo and URL/save migration; do not replace existing saves prematurely. Work remains on codex/generated-operator-equipment; no main merge/push under the protection rule.

## Known limits

- CM4 has no asset-backed equipment catalogue or visible new carrier. It validates authored data; it cannot prove animation clearance, repair missing clothing, apply material finishes or perform gameplay inventory transactions. Unknown items remain in the caller's draft for recovery.
- CM3 face/eyes are stylized flat materials without facial animation. Prior geometry/browser checks cover 24 foundation and 88 existing-Recon rifle carries, not all attachments or transition frames. CM4 changes no geometry or pose code.
- Full-suite and build results are recorded in the latest handoff. Two prior downloader failures are unrelated to CM4: standalone generated-file mismatch and missing python3 on Windows PATH.
- Built site remains above the inherited 90 MB target (approximately 245.8 MB). Inspection reference models contribute to this total.
- No usage-meter values were available; no budget calibration was invented.
