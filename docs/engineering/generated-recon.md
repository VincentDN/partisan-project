# Generated Recon

The Operator Modder defaults to **Recon** (`operator/#base=generated-recon`).
The Base, Insurgent and Enforcer entries remain available; old kitbashed Recon links still resolve.

## Source choice

Both inbound models contribute to the runtime asset. `PARP_Recon_hooded_model_splitparts_v01_05.glb` provides removable equipment and body pieces.
The complete `PARP_Recon_hooded_model_v01_05.glb` supplies its textured head and the 4K source colour atlas. Neither source contains skin weights or animation clips.

`tools/assets/generated_recon_textures.py` packs a shared 2K atlas and bakes the complete source onto the simplified modular body. The head retains its original UV mapping for resampling, avoiding projection errors around eyelids and the mask. UV seams are welded before decimation; only the new neck cut is capped. Filling every seam had produced overlapping mask polygons.
The face has a protected material outside the hood colour zone. Palette changes multiply the original texture, preserving fabric and equipment detail. The repaired collar remains a separate solid material.

The generated rifle is replaced by the existing Workbench weapon system. Segmentation fused the right glove into that rifle; the importer mirrors the complete left glove to repair it. Part 21 is a cuff, not a hand. A small fitted collar repairs the neck missing underneath the removable scarf.
Hidden segmentation cuts are welded and capped before simplification so removing pouches does not reveal an open mesh.

## Rebuild

From the repository root, using Blender 4.4 and the repository's Node dependencies:

```sh
blender --background --python tools/assets/import-generated-recon.py --
node tools/assets/optimize-pack.mjs build/generated-recon.raw.glb assets/models/operators/generated-recon.glb
npm run test:operator
```

The importer accepts optional source/output paths after `--`. The runtime model is 1.85 metres tall, faces +Z, and stands on y=0.
The generated manifest records 14,523 triangles, 26 mesh nodes and 26 bones, with an approximately 1.1 MB compressed GLB. The head's two materials become two draw meshes in Three.js (27 total). All equipment together fits the 15,000-triangle operator budget; carried rifles retain their separate existing budgets.

## Animation and equipment

The fitted rig uses the bone names consumed by `Rig` and `Grip`. Body and knee weights blend across joints; rigid gear follows the corresponding torso or limb bone.
`operator/poses.json` holds the `generatedRecon` profile, which corrects the hanging-arm rest pose against the original operator's A-pose.
The shared poses, calm/alert/weary idles, head following, reduced motion and rifle-hand IK work on the new rig.
Pose transitions use the existing 0.6-second blend. No new external runtime dependency is required.

Hand bones align their local +Z with the palm normal. The generated grip profile measures palm centres inside the source gloves instead of reusing the original operator's shorter wrist offsets. Eight carry poses have Recon-specific position and orientation data; upright rifles keep their sights clear of the torso, and long handguards remain reachable.

Equipment and colour definitions live in `operator/generated-recon.js`. The hood and covered face are a single source mesh; they cannot be independently removed. Fingers retain the generated glove shape rather than an articulated finger rig. These are body-source limitations, not equipment toggles.

`tests/generated-recon.test.mjs` checks the actual compressed model, normalized weights, all pose/idle combinations and permanent hands.
`tests/e2e/generated-recon.mjs` checks decoded textures, protected face colours, equipment visibility, saved links, roster caching, palm placement, animation/reduced-motion behaviour and accessibility. `recon-clearance.mjs` samples visible rifle geometry against the deformed torso, head, scarf and chest equipment in eight carry poses for all eleven rifles. These samples catch substantial penetration, but do not guarantee collision-free fingers, every attachment combination or every frame during transitions.

## Verification on 2026-10-04

- 48 operator/config/rig tests pass; actual skinned geometry is sampled across every pose and idle.
- All eleven rifles pass sampled clearance and palm reach in eight carry poses, with full chest equipment.
- Site build/link checks, ESLint and TypeScript pass. The build directory exclusion now normalizes Windows separators; otherwise an excluded study's broken links were copied into the artifact. Changed JavaScript files pass Prettier.
- The full unit suite reports 204/207 passing: the existing standalone downloader is out of sync with its generator, its Python test expects a `python3` executable absent from this Windows PATH, and TAC-J-39 lacks the required decision-template fields. Those unrelated files were not changed here.
- Repository-wide Prettier reports existing formatting drift; unrelated files were not reformatted.
