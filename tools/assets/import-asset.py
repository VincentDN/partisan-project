"""Import a downloaded model (OBJ / FBX / GLB / glTF / blend) and write a normalised GLB.

For weapons and attachments (kind=weapon|attachment):
  - joins nothing (keeps separate objects so parts stay selectable), applies transforms
  - scales so the longest dimension equals --length (metres), if given, else --scale
  - rotates so the longest axis lies along +X (the Partisan Project muzzle axis) when --auto-axis
  - origin: --origin center (default) | bottom | keep
Usage:
  python tools/assets/import-asset.py --in assets-incoming/m16.obj --out build/m16.raw.glb --length 0.99 --auto-axis
Then:   node tools/assets/optimize-glb.mjs build/m16.raw.glb assets/models/weapons/m16.glb
Then:   node tools/assets/register.mjs add --id wpn-m16 --label "M16" --path assets/models/weapons/m16.glb ... --license CC0 ...
Needs the `bpy` package (pip install bpy), Python 3.11.
"""
import argparse, sys, os, math
import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
ap = argparse.ArgumentParser()
ap.add_argument('--in', dest='src', required=True)
ap.add_argument('--out', required=True)
ap.add_argument('--length', type=float)
ap.add_argument('--scale', type=float, default=1.0)
ap.add_argument('--auto-axis', action='store_true')
ap.add_argument('--origin', choices=['center', 'bottom', 'keep'], default='center')
a = ap.parse_args(argv)

bpy.ops.wm.read_factory_settings(use_empty=True)
ext = os.path.splitext(a.src)[1].lower()
if ext == '.obj': bpy.ops.wm.obj_import(filepath=a.src)
elif ext == '.fbx': bpy.ops.import_scene.fbx(filepath=a.src)
elif ext in ('.glb', '.gltf'): bpy.ops.import_scene.gltf(filepath=a.src)
elif ext == '.blend':
    with bpy.data.libraries.load(a.src) as (src, dst): dst.objects = src.objects
    for o in dst.objects:
        if o is not None: bpy.context.scene.collection.objects.link(o)
else: sys.exit(f'unsupported format {ext}')

meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
if not meshes: sys.exit('no meshes found')
bpy.ops.object.select_all(action='DESELECT')
for o in meshes: o.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

def bounds():
    pts = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    return lo, hi

lo, hi = bounds(); size = hi - lo
if a.auto_axis:
    axis = max(range(3), key=lambda i: size[i])
    if axis == 1:   # Y -> X
        for o in meshes: o.rotation_euler.z += -math.pi / 2
    elif axis == 2: # Z -> X
        for o in meshes: o.rotation_euler.y += math.pi / 2
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
    lo, hi = bounds(); size = hi - lo
k = (a.length / max(size)) if a.length else a.scale
for o in meshes: o.scale = (o.scale[0] * k, o.scale[1] * k, o.scale[2] * k)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
lo, hi = bounds()
shift = Vector((0, 0, 0))
if a.origin == 'center': shift = -(lo + hi) / 2
elif a.origin == 'bottom': shift = Vector((-(lo.x + hi.x) / 2, -(lo.y + hi.y) / 2, -lo.z))
for o in meshes: o.location += shift
bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)
lo, hi = bounds()
print('size (m):', tuple(round(v, 4) for v in (hi - lo)), 'tris:', sum(len(o.data.polygons) for o in meshes))
bpy.ops.export_scene.gltf(filepath=a.out, export_format='GLB', use_selection=True, export_apply=True, export_yup=True)
