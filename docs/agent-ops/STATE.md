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

1. CM5 is complete: independent lightweight carrier, removable placard, four textured materials, fitted carrier pose profile and measured CM4 catalogue. Read docs/engineering/recon-carrier.md, operator/recon-carrier.json and tools/assets/build-recon-carrier.mjs. CM4 was pushed after the owner's explicit authorization.
2. Next packet is CM6: independent magazine, utility and radio pouches. Use the measured front/rear mount surfaces, implement posed pouch skin binding, occupied-cell checks and owned radio/cable geometry. The current grids are asset-rest coordinates; do not attach rigid pouches to an assumed bone frame.
3. The opt-in foundation stays 5,568 triangles: hood-free, broader chest/neck, stylized head, removable mask/cap and articulated gloves. The entire carrier pack adds 1,116 triangles (6,684 total loaded); placard visibility adds no separate geometry cost. Default remains bare. Inspect operator/foundation.html or operator/#base=recon-modular&carrier=placard.
4. Preserve recon-v2's 26 canonical body frames plus 30 finger joints, local finger rotations, measured palm targets and CM2 collar/wrist constraints. Source/body geometry is unchanged. Rebuild with assets:recon-carrier and BLENDER set; generated .blend stays ignored.
5. Keep equipment compatible with the version 1 assembly contract. CM8 will connect the full renderer/editor, undo and URL/save migration. Work remains on codex/generated-operator-equipment; no main merge/push under the protection rule.

## Known limits

- CM5 includes carrier/placard only; pouches and arbitrary mounted attachment clearance are not implemented. CM4 validates authored data, not physical fit. Unknown items stay recoverable in the caller's draft.
- CM3 face/eyes are stylized flat materials without facial animation. CM5 checks cover 24 equipped carries, 24 bare-foundation carries and 88 existing-Recon carries. Carrier/jacket vertex samples use a 5 mm garment tolerance; these do not certify all triangle crossings, attachments or transition frames.
- Full units: 237/239 pass. The two prior downloader failures remain: standalone generated-file mismatch and missing python3 on Windows PATH. Configured typecheck, lint, changed-file formatting, carrier acceptance and site build/check pass.
- Built site remains above the inherited 90 MB target (246.2 MB). Inspection reference models contribute to this total.
- The local sandbox launcher fails while enumerating volume V:. Escalated authorized local commands and browser checks work. No push approval is outstanding.
- No usage-meter values were available; no budget calibration was invented.
