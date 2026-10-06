# Agent state

Read `AGENTS.md` first. Work queue: [packets.json](packets.json); full plan: [tactical roadmap](../tactical-roadmap.md).

## Latest handoff

<!-- handoff:start -->
**2026-10-06 14:57 UTC · codex · WP-CM5 · done**

- Branch `codex/generated-operator-equipment` at `ee610fa`; working tree clean.
- Last commits: ee610fa feat(WP-CM5): add fitted modular lightweight plate carrier · 2df7e96 docs(WP-CM4): hand off resolver and record pending push approval · 89baad3 feat(WP-CM4): resolve modular equipment assemblies and compatibility
- What happened: Pushed CM4 after explicit owner authorization, then completed and pushed CM5 in ee610fa: fitted textured carrier, detachable placard, measured CM4 definitions and equipped pose profile. Body plus full loaded pack is 6,684 triangles. Carrier units and 24 equipped, 24 bare-foundation and 88 legacy Recon carries pass; built-site smoke, lint, typecheck, formatting, plan checks and build/check pass. Full units 237/239 with the same two unrelated downloader failures. Main remains protected.
- Next step: CM6: read docs/engineering/recon-carrier.md, operator/recon-carrier.json and WP-CM6 inputs. Author separate magazine, utility and radio pouches, implement mount-space skin binding and occupied-cell validation, preserve owned radio/cable geometry, and validate posed clearance. Do not treat reserved mount grids as verified pouch fits.
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
