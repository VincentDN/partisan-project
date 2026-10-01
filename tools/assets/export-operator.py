"""Export the purchased Low_Poly_US_Soldier .blend to an unoptimised GLB (Base Operator).

Usage (needs the `bpy` pip package, Blender 4.2+/5.x as a module):
    python tools/assets/export-operator.py --source <path>/Low_Poly_US_Soldier.blend --out build/base-operator.raw.glb

The raw purchased source is NOT stored in this repository (licence: see assets/REGISTER.md).
Keep your copy outside the repo and pass it with --source. Step 2 is
`node tools/assets/optimize-operator.mjs` (meshopt compression, naming, manifest).
"""
import argparse, sys, bpy

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
ap = argparse.ArgumentParser()
ap.add_argument('--source', required=True)
ap.add_argument('--out', required=True)
args = ap.parse_args(argv)

bpy.ops.wm.open_mainfile(filepath=args.source)

# Keep only the skeleton and the 21 SK_* modular meshes; drop camera, light, stray materials.
keep = [o for o in bpy.data.objects if o.type == 'ARMATURE' or (o.type == 'MESH' and o.name.startswith('SK_'))]
bpy.ops.object.select_all(action='DESELECT')
for o in keep:
    o.select_set(True)
bpy.context.view_layer.objects.active = next(o for o in keep if o.type == 'ARMATURE')

bpy.ops.export_scene.gltf(
    filepath=args.out,
    export_format='GLB',
    use_selection=True,
    export_apply=False,          # keep the armature modifier, i.e. real skinning
    export_skins=True,
    export_animations=False,     # the purchased file ships no clips; PARP authors its own (operator/poses.json)
    export_yup=True,
    export_materials='EXPORT',
    export_image_format='AUTO',
    export_vertex_color='ACTIVE',
    export_active_vertex_color_when_no_material=True,
)
print('exported', len(keep), 'objects ->', args.out)
