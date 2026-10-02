"""Shared Blender helpers for the Partisan Project extension-pack builders (build-*-pack.py).

Usage from a builder:   sys.path.insert(0, os.path.dirname(__file__)); import blender_common as bc; ctx = bc.open_skeleton(path)
Blender world: +Z up, the character faces -Y, its left is +X. Meshes are authored in WORLD metres and converted
to the armature's local space (cm, rotated) so they match the purchased meshes' transforms exactly.
"""
import math, sys
import bpy, bmesh
from mathutils import Vector, Matrix


class Ctx:
    def __init__(self, arm):
        self.arm = arm
        self.to_local = arm.matrix_world.inverted()


def open_skeleton(path):
    bpy.ops.wm.open_mainfile(filepath=path)
    arm = bpy.data.objects['Armature']
    for o in list(bpy.data.objects):             # keep only the skeleton; the purchased meshes are never re-exported
        if o is not arm: bpy.data.objects.remove(o, do_unlink=True)
    return Ctx(arm)


def srgb(h):
    c = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    lin = lambda v: v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
    return (lin(c[0]), lin(c[1]), lin(c[2]), 1)

def material(name, hexcolor=None, image=None, rough=0.92):
    old = bpy.data.materials.get(name)           # the source .blend may already own this name; reusing it would suffix ours '.001'
    if old: bpy.data.materials.remove(old)
    m = bpy.data.materials.new(name); m.use_nodes = True
    bsdf = m.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Roughness'].default_value = rough; bsdf.inputs['Metallic'].default_value = 0
    if image:
        tex = m.node_tree.nodes.new('ShaderNodeTexImage'); tex.image = image; tex.interpolation = 'Closest'
        m.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    else: bsdf.inputs['Base Color'].default_value = srgb(hexcolor)
    return m

def houndstooth(size=64, dark=(0.02, 0.02, 0.02), light=(0.78, 0.76, 0.70), name='T_Houndstooth'):
    img = bpy.data.images.new(name, size, size, alpha=False)
    px = []
    for y in range(size):
        for x in range(size):
            bx, by, lx, ly = (x // 4) % 2, (y // 4) % 2, x % 4, y % 4
            tooth = ((lx + ly) < 4) ^ ((bx + by) % 2 == 1)
            c = dark if tooth else light
            px += [c[0], c[1], c[2], 1]
    img.pixels = px; img.pack(); img.file_format = 'PNG'
    return img

def smooth(e0, e1, x):
    t = min(1, max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t)

def skin(ctx, obj, weight_fn):
    """weight_fn(world_pos) -> {bone: weight}; normalised to 1."""
    for v in obj.data.vertices:
        w = weight_fn(ctx.arm.matrix_world @ v.co)
        s = sum(w.values()) or 1
        for bone, val in w.items():
            if val <= 1e-4: continue
            g = obj.vertex_groups.get(bone) or obj.vertex_groups.new(name=bone)
            g.add([v.index], val / s, 'REPLACE')
    mod = obj.modifiers.new('Armature', 'ARMATURE'); mod.object = ctx.arm

def make(ctx, name, bm, mat):
    bm.normal_update()
    mesh = bpy.data.meshes.new(name); bm.to_mesh(mesh); bm.free()
    obj = bpy.data.objects.new(name, mesh); bpy.context.scene.collection.objects.link(obj)
    obj.parent = ctx.arm; obj.matrix_parent_inverse = Matrix.Identity(4)
    mesh.materials.append(mat)
    for p in mesh.polygons: p.use_smooth = False           # faceted, flat-shaded
    return obj

def ring_pts(cx, cy, cz, rx, ry, n=10, exp=2.6):
    pts = []
    for i in range(n):
        t = 2 * math.pi * i / n + math.pi / n               # offset so the front is a facet, not a vertex
        c, s = math.cos(t), math.sin(t)
        pts.append(Vector((cx + rx * math.copysign(abs(c) ** (2 / exp), c), cy + ry * math.copysign(abs(s) ** (2 / exp), s), cz)))
    return pts

def loft(ctx, bm, rings, close_top=True):
    verts = [[bm.verts.new(ctx.to_local @ p) for p in r] for r in rings]
    n = len(rings[0])
    for a_, b_ in zip(verts, verts[1:]):
        for i in range(n):
            bm.faces.new([a_[i], a_[(i + 1) % n], b_[(i + 1) % n], b_[i]])
    if close_top:
        bm.faces.new(list(reversed(verts[-1])))
    return verts


def cyl_uv(ctx, bm, cy, ru=0.7, rv=2.6):
    """Cylindrical UVs around the vertical axis through y=cy (world), for patterned fabrics."""
    uv = bm.loops.layers.uv.new('UVMap')
    for f in bm.faces:
        for l in f.loops:
            w = ctx.arm.matrix_world @ l.vert.co
            l[uv].uv = (math.atan2(w.y - cy, w.x) / math.pi * ru, w.z * rv)


def box(ctx, bm, cx, cy, cz, sx, sy, sz):
    vs = [bm.verts.new(ctx.to_local @ Vector((cx + dx * sx / 2, cy + dy * sy / 2, cz + dz * sz / 2))) for dx in (-1, 1) for dy in (-1, 1) for dz in (-1, 1)]
    for idx in ((0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)): bm.faces.new([vs[i] for i in idx])


def export(ctx, out, objs):
    bpy.ops.object.select_all(action='DESELECT')
    for o in (ctx.arm, *objs): o.select_set(True)
    bpy.context.view_layer.objects.active = ctx.arm
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True, export_apply=False, export_skins=True,
                              export_animations=False, export_yup=True, export_materials='EXPORT', export_image_format='AUTO')
