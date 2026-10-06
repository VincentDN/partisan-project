# Recon clean clothing foundation

WP-CM2 completed and refined 5 October 2026. This document records the CM2 snapshot at `5bfc454`; the current asset adds [CM3 removable headwear and articulated hands](recon-head-hands.md). The [foundation inspector](../../operator/foundation.html) shows the body without equipment from four sides and through the pose/idle library. Select **Recon · foundation** in the [Operator Modder](../../operator/index.html#base=recon-modular) to change clothing colours and test carried rifles. This is the underlying clothing milestone; new carriers, bags and the assembly editor remain later packets.

![Clean clothing from front, back and both sides, with salute and crouch deformation](recon-foundation-sheet.png)

## Shipped result

- Rebuilt the missing front/back torso as a complete field jacket, with collar, hem, zipper placket and two welt pocket mouths. Sleeve roots are joined into the jacket rather than hidden beneath shoulder equipment.
- Broadened the upper chest and neck at the owner’s request. Removed the fused outer hood, preserved the central textured eye/face patch and rebuilt a closed crown and back as a close-fitting masked head. The mask remains until CM3 separates it.
- Repaired the source-inspired trousers, boots and right cuff; added a finished waist and neck under the temporary head. The vest, harness, shoulder tabs, knee pads, holsters and bags are absent from this asset.
- Jacket, trousers, cuff, waist and neck have fresh woven albedos and new UVs. No equipped-source projection is used for those cloth surfaces. The exposed eye/skin region, gloves and boots retain their existing atlas and face protection; the fitted head covering uses a new cloth material.
- Preserved all 26 canonical bone names, parents and local rest transforms. Smoothed shoulder heat weights blend through the continuous garment; sleeve rims follow the wrist frames to prevent gaps during grip rotation.
- Added a foundation-specific pose profile and measured grip orientation. Raised-rifle and two-handed carry positions are fitted to this garment. The existing Recon remains the default, with its original model and pose profile unchanged.

| Runtime allocation | Triangles |
|---|---:|
| Continuous jacket and sewn details | 1,324 |
| Trousers and finished waist | 1,392 |
| Boots | 512 |
| Right cuff and neck | 158 |
| Hood-free masked head and preserved face patch | 1,361 |
| Temporary fixed-finger gloves | 516 |
| **Complete foundation** | **5,263 / 8,000** |

The compressed GLB is 1,269,972 bytes. It leaves 9,737 triangles within the 15,000-triangle operator-plus-equipment ceiling; the resolver must account for the actual equipped total. The hood removal reduces the earlier foundation by 2,639 triangles. Mask separation and articulated hands remain CM3.

## Rebuilding and authoring

Run from the repository root with Blender 4.4 available as `blender`, or set `BLENDER` to its executable path:

```sh
npm run assets:recon-foundation
npm run test:foundation
```

`tools/assets/build-recon-foundation.mjs` checks the pinned canonical Recon hash, decodes meshopt for Blender, runs the authoring script and uses the existing optimisation pipeline. It rejects changed bone frames, budget overflow, or triangle loss during export. The current and complete-original assets are not rewritten.

`tools/assets/build-recon-foundation.py`, `recon_foundation_geometry.py` and `recon_foundation_head.py` are the editable authoring source. They build the torso/waist/neck, repair retained silhouettes, generate deterministic cloth textures, assign skin weights and export. The generated editable Blender scene is `build/recon-foundation.blend`; it is a reproducible local authoring intermediate and is not committed. Runtime files are `recon-modular.glb`, its manifest and `recon-modular.foundation.json` under `assets/models/operators/`.

The trouser rebuild removes disconnected remesh debris before decimation so tiny cap islands cannot collapse into invalid duplicate faces. Boot seams are welded before export. The jacket uses a 4 mm voxel union and 1,300-triangle reduction, followed by armature heat weights, twelve topology-neighbour smoothing passes, a torso-anchored collar, wrist-rim constraints and normalized four-weight skinning. The foundation report records authoring bounds in Blender coordinates (+Z up, −Y forward); the runtime retains the contract's +Y up, +Z forward frame on the unchanged skeleton. Removing the hood lowers the visible crown to 1.827 m.

## Acceptance and limits

`tests/recon-foundation.test.mjs` loads the compressed runtime asset and checks the exact skeleton contract, triangle/hash metadata, absence of equipment and hood, position-welded closed clothing/head volumes, crown/back coverage and neck width, front/back/waist coverage, normalized skin weights and bounded deformation across every pose and idle. The thin zipper and welt overlays intentionally are not closed volumes.

`tests/e2e/recon-foundation.mjs` checks decoded cloth and face textures, four inspection directions, pose/rest reset, idles and reduced motion, keyboard orbit, wireframe, mobile overflow and serious/critical accessibility violations. It tests AK-74M, G3 and AK-15K in eight held poses (24 combinations), using actual deformed jacket/hood geometry for clearance and a 25 mm palm-target tolerance. Colours and the shared URL survive reload, and switching back to the current Recon restores its equipment. Set `FOUNDATION_SHOT` to save the six-panel inspection sheet.

These checks cover sampled weapon vertices in held poses; they do not certify every attachment, every transition frame or future equipment fit. At the CM2 snapshot the face covering and fingers were fixed; CM3 has since replaced them with a complete head, removable coverings and articulated gloves. CM4 supplies the item resolver before CM5 introduces the first removable carrier.

The latest fetched `origin/main` is `17eb192`, with concurrent operator and game changes. This milestone stays isolated on `codex/generated-operator-equipment`; integration must reconcile those changes deliberately. The inherited site-size and downloader-test failures are tracked in the handoff rather than folded into this geometry packet.
