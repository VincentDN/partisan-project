# Agent state

Read `AGENTS.md` first. Work queue: [packets.json](packets.json); full plan: [tactical roadmap](../tactical-roadmap.md).

## Latest handoff

<!-- handoff:start -->
**2026-10-06 08:39 UTC · codex · WP-CM4 · done**

- Branch `codex/generated-operator-equipment` at `89baad3`; working tree clean.
- Last commits: 89baad3 feat(WP-CM4): resolve modular equipment assemblies and compatibility · 41efb77 docs(WP-CM3): record completed head and hands handoff · 3bc89c3 feat(WP-CM3): add removable headwear and articulated Recon hands
- What happened: Completed locally in 89baad3: pure-data equipment resolver, schema validation, recoverable subtree removal, coverage and budget accounting, tests and integration contract. Eleven focused tests, configured typecheck, lint, formatting, plan tests and build/check pass. Full units 233/235 with the same two unrelated downloader failures. Automatic approval review rejected the GitHub push for lack of explicit authorization to export code/documentation to this remote. No workaround attempted; ask the owner to authorize pushing the feature branch. Main remains protected.
- Next step: After explicit push authorization, push CM4 and this handoff to origin/codex/generated-operator-equipment. Then CM5: author the lightweight carrier and measured catalogue/mount definitions against the CM3 foundation. Read docs/engineering/operator-assembly.md and WP-CM5 inputs; preserve canonical rig frames and pose fits.
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
