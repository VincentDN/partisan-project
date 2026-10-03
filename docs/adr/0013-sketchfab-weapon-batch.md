# 0013: The Sketchfab batch in the Workbench and the Operator

Status: accepted

## Context
The owner downloaded 37 of the 39 listed Sketchfab models into `inbound/sketchfab/` (the sandbox cannot reach Sketchfab, so the local downloader in `outbound/` did it). The Workbench had three rifles and code-built attachments; the Operator could carry two rifles.

## Decision
- **Importer** (`tools/assets/import-sketchfab.mjs`): optimise each download into `assets/models/<dir>/`, with source options in `tools/assets/sketchfab-sources.json`: `strip` removes loose spare magazines and rounds, `tint` paints unpainted white materials, skinned FBX exports are baked into static meshes (their vertices sit in bone space and measure wrong otherwise). Weapons keep source units and print the `scale` for `models.js`; props, vehicles and environment pieces get real size baked in. Budgets go into `assets/register.json`.
- **Rifles** (`workbench/rifles-extra.js`, same schema as `models.js`): G3A3, M16A1, Mk 14 EBR, SIG Spear, StG 44, PPSh-41, Bren, Chauchat and the real RPK 7.62×39 (replacing the kitbash). Meshes the artist did not split (G3 furniture, M16 stock and handguard, Chauchat stock and grip) are one part. Rifles without a separate mesh for a slot still get its mount point and take the library parts. All appear as buttons in the Workbench and as carried weapons in the Operator (`handguardAt` places the support hand per rifle).
- **Real attachments** (`real()` in `workbench/attachments.js`): muzzle brake and suppressor, micro dot, EOTech, ZF-4 scope, flip-up sight, vertical and angled grips, hand stop, weapon light, laser, laser-light combo, drum magazines, plus new bipod and GP-25 options come from the downloaded parts. `real()` picks nodes out of a set, turns the part to +x forward and anchors it on the slot origin.
- Other downloads (props, vehicles, environment, `rail-ak`, `g3-scope`) are registered and open in the Asset Viewer; the vehicles and environment kit are for the 2.5D game (`docs/graphics-roadmap.md`, WP-V6, V9, V10).

## Consequences
- Slot options keep their ids, so loadout codes and the stats tables stay valid; new ids (`drum71`, `bipod`, `gp25`, …) have modifier entries.
- The code-built options that were replaced were removed; the AK-74 brake, grips, sling and stock options remain code-built.
- `aks74` and `pallet` were not in the download; re-run the downloader to add them.
- Part placement is by eye from the inspector (`tools/assets/inspect-glb.mjs`); a rifle's sockets may need nudging as parts are reviewed.
