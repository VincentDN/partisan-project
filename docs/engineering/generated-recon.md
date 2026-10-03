# Generated Recon

The Operator Customiser roster includes **Generated Recon** (`operator/#base=generated-recon`).
The original Base, Recon, Insurgent and Enforcer entries remain available.

## Source choice

`inbound/Models/PARP_Recon_hooded_model_splitparts_v01_05.glb` is the runtime source: its 27 separate pieces allow equipment removal.
The complete `PARP_Recon_hooded_model_v01_05.glb` is one textured, unrigged mesh with 193,534 triangles; it is useful as a visual reference.
Neither source contains skin weights or animation clips. The split file has no materials, so the import assigns independent, repaintable cloth and gear colours.

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
The generated manifest records 11,253 triangles, 27 meshes and 26 bones. All equipment together fits the 15,000-triangle operator budget; carried rifles retain their separate existing budgets.

## Animation and equipment

The fitted rig uses the bone names consumed by `Rig` and `Grip`. Body and knee weights blend across joints; rigid gear follows the corresponding torso or limb bone.
`operator/poses.json` holds the `generatedRecon` profile, which corrects the hanging-arm rest pose against the original operator's A-pose.
The 11 shared poses, calm/alert/weary idles, head following, reduced motion and rifle-hand IK work on the new rig.
Pose transitions use the existing 0.6-second blend. No new external runtime dependency is required.

Equipment and colour definitions live in `operator/generated-recon.js`. The hood and covered face are a single source mesh; they cannot be independently removed. Fingers retain the generated glove shape rather than an articulated finger rig. These are body-source limitations, not equipment toggles.

`tests/generated-recon.test.mjs` checks the actual compressed model, normalized weights, all pose/idle combinations and permanent hands.
`tests/e2e/generated-recon.mjs` checks equipment visibility, independent colours, saved links, roster caching, carried rifles, palm placement, animation/reduced-motion behaviour and accessibility.

## Verification on 2026-10-03

- 47 operator/config/rig tests and 8 plan tests pass; actual skinned geometry is sampled across every pose and idle.
- The full browser smoke suite passes. Generated Recon acceptance passes against the built site, including all 11 carried rifles and an axe accessibility audit.
- Site build/link checks, ESLint and TypeScript pass. Changed JavaScript files pass Prettier.
- The full unit suite reports 176/179 passing: the existing standalone downloader is out of sync with its generator, its Python test expects a `python3` executable absent from this Windows PATH, and the existing build publishes internal documentation despite the site test's exclusion expectation. Those files and policies were not changed here.
- Repository-wide Prettier reports existing formatting drift; unrelated files were not reformatted.
