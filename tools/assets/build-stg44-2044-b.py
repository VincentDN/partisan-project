"""Test B, "Neuro-Bash": the StG 44 (2044) kitbashed from free donor rifles onto the same base model.

    python3 tools/assets/build-stg44-2044-b.py      ->  assets/models/weapons/stg44-2044-b.glb

Start: the attached Magnific/Tripo base (inbound/magnific/stg44-2044-base), scaled to 0.94 m in the same cm
frame as Test A. Its hull is kept for the receiver, upper, handguard and fixed stock; the blobby parts are cut
away and replaced by donor parts fitted to the base's own landmarks:
  AK-47 4K "many pieces" (inbound/sketchfab/ak-47-4k-many-pieces): muzzle device, front sight, barrel, trigger,
    pistol grip, selector lever, rear sight block, side dovetail rail, cross pins, handguard screws, rail teeth,
    and its whole adjustable stock (the bench's "adjustable" stock option).
  Low-Poly AKB-15 (inbound/sketchfab/low-poly-akb-15): the polymer waffle magazine (25 and stretched 40 round).
"""

import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import bpy  # noqa: E402  isort: skip
import bmesh  # noqa: E402
from mathutils import Matrix, Vector  # noqa: E402

from stg44_kit import BORE_Z, export, materials  # noqa: E402

ROOT = os.path.join(HERE, "..", "..")
BASE = os.path.join(ROOT, "inbound", "magnific", "stg44-2044-base", "model.glb")
AK = os.path.join(ROOT, "inbound", "sketchfab", "ak-47-4k-many-pieces", "scene.glb")
AKB = os.path.join(ROOT, "inbound", "sketchfab", "low-poly-akb-15", "scene.gltf")
OUT = os.path.join(ROOT, "assets", "models", "weapons", "stg44-2044-b.glb")
BZ = BORE_Z


# ---------- import helpers ----------
def import_meshes(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.abspath(path))
    new = [o for o in bpy.data.objects if o not in before]
    dg = bpy.context.evaluated_depsgraph_get()
    out = {}
    for o in new:
        if o.type != "MESH":
            continue
        me = bpy.data.meshes.new_from_object(o.evaluated_get(dg))      # bakes armature/skin poses
        me.transform(o.matrix_world)
        out[o.name] = me
    for o in new:
        bpy.data.objects.remove(o)
    return out


def merged(meshes, name, role):
    """One object from several meshes (already in place)."""
    bm = bmesh.new()
    for me in meshes:
        bm.from_mesh(me)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    ob["role"], ob["bevel"] = role, 0.0
    return ob


def bbox(meshes):
    pts = [v.co for me in meshes for v in me.vertices]
    return Vector([min(p[i] for p in pts) for i in range(3)]), Vector([max(p[i] for p in pts) for i in range(3)])


def fit(meshes, x=None, y=None, z=None, uniform=None):
    """Scale/translate meshes so their bbox lands on the given ranges. Axes left as None follow `uniform`
    (the scale of the named axis) and are centred on 0 (y) or kept (x, z) unless a centre is given as a float."""
    lo, hi = bbox(meshes)
    tgt = {0: x, 1: y, 2: z}
    sc = [None] * 3
    for i in range(3):
        if isinstance(tgt[i], tuple):
            sc[i] = (tgt[i][1] - tgt[i][0]) / max(hi[i] - lo[i], 1e-9)
    ref = sc["xyz".index(uniform)] if uniform else None
    for i in range(3):
        if sc[i] is None:
            sc[i] = ref if ref else 1.0
    M = Matrix.Diagonal((*sc, 1))
    off = Vector()
    for i in range(3):
        t = tgt[i]
        if isinstance(t, tuple):
            off[i] = t[0] - lo[i] * sc[i]
        elif isinstance(t, (int, float)):
            off[i] = t - (lo[i] + hi[i]) / 2 * sc[i]
        else:
            off[i] = 0.0
    M = Matrix.Translation(off) @ M
    for me in meshes:
        me.transform(M)
    return meshes


def copies(me, n):
    return [me.copy() for _ in range(n)]


# ---------- the base hull ----------
def base_hull():
    me = list(import_meshes(BASE).values())[0]
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bm.verts.ensure_lookup_table()
    # drop the small floating island above the rifle
    seen, drop = set(), []
    zs = [v.co.z for v in bm.verts]
    zhi, zlo = max(zs), min(zs)
    for v in bm.verts:
        if v.index in seen:
            continue
        comp, stack = [], [v]
        seen.add(v.index)
        while stack:
            a = stack.pop()
            comp.append(a)
            for e in a.link_edges:
                b = e.other_vert(a)
                if b.index not in seen:
                    seen.add(b.index)
                    stack.append(b)
        cz = sum(p.co.z for p in comp) / len(comp)
        if len(comp) < 200 and cz > zhi - 0.15 * (zhi - zlo):
            drop += comp
    bmesh.ops.delete(bm, geom=drop, context="VERTS")
    bm.to_mesh(me)
    bm.free()
    ys = [v.co.y for v in me.vertices]
    L = max(ys) - min(ys)
    # orient: stock end (taller) to -X, muzzle to +X; 94 cm long; butt at x = 0
    def zr(sel):
        q = [v.co.z for v in me.vertices if sel(v.co.y)]
        return max(q) - min(q)
    sgn = 1 if zr(lambda y: y > max(ys) - 0.15 * L) > zr(lambda y: y < min(ys) + 0.15 * L) else -1
    s = 94.0 / L
    me.transform(Matrix.Scale(s, 4) @ Matrix(((0, -sgn, 0, 0), (sgn, 0, 0, 0), (0, 0, 1, 0), (0, 0, 0, 1))))
    xs = [v.co.x for v in me.vertices]
    yy = [v.co.y for v in me.vertices]
    me.transform(Matrix.Translation((-min(xs), -(min(yy) + max(yy)) / 2, 0)))
    zs = [v.co.z for v in me.vertices]
    me.transform(Matrix.Translation((0, 0, 5.8 - max(zs))))               # top of the rear sight at z = 5.8, as traced
    return me


def inside(poly, x, z):
    c = False
    n = len(poly)
    for i in range(n):
        (x1, z1), (x2, z2) = poly[i], poly[(i + 1) % n]
        if (z1 > z) != (z2 > z) and x < (x2 - x1) * (z - z1) / (z2 - z1 + 1e-12) + x1:
            c = not c
    return c


GRIP = [(35.4, -5.7), (34.9, -7.6), (34.2, -9.0), (33.0, -12.4), (31.2, -17.6), (25.6, -15.4), (27.0, -11.0), (28.2, -7.5), (29.0, -5.7)]
GUARD_IN = [(40.0, -5.6), (39.4, -9.0), (37.6, -10.5), (35.5, -10.5), (34.5, -9.3), (34.6, -5.6)]


def split_hull(me):
    """Cut away what the donors replace, split the rest by role. Returns {name: (mesh, role)}."""
    def region(c):
        x, y, z = c
        if x > 86.6:
            return None                                              # barrel, front sight, muzzle -> donors
        if 45.2 < x < 52.6 and z > 3.75:
            return None                                              # rear sight -> donor
        if z < -5.65 and inside(GRIP, x, z):
            return None                                              # grip -> donor
        if inside(GUARD_IN, x, z):
            return None                                              # trigger -> donor
        if 42.4 < x < 55.0 and z < -8.3:
            return None                                              # magazine -> donor
        if x < 18.3:
            return "stock_fixed"
        if 56.4 < x < 86.7 and z < -1.3:
            return "handguard"
        return "hull"
    def gone(f):
        # a face goes if its centre or any corner falls in a replaced part (stops long triangles leaving shards)
        if region(f.calc_center_median()) is None:
            return True
        for v in f.verts:
            x, y, z = v.co
            if (42.4 < x < 55.0 and z < -8.7) or (z < -6.1 and inside(GRIP, x, z)) or inside(GUARD_IN, x, z) or x > 88.0:
                return True
        return False
    bm = bmesh.new()
    bm.from_mesh(me)
    groups = {}
    for f in bm.faces:
        groups.setdefault(None if gone(f) else region(f.calc_center_median()), []).append(f.index)
    out = {}
    for key, idx in groups.items():
        if key is None:
            continue
        b2 = bm.copy()
        keep = set(idx)
        b2.faces.ensure_lookup_table()
        bmesh.ops.delete(b2, geom=[f for f in b2.faces if f.index not in keep], context="FACES")
        m2 = bpy.data.meshes.new(key)
        b2.to_mesh(m2)
        b2.free()
        out[key] = m2
    bm.free()
    return out


# ---------- donors ----------
def ak_parts():
    raw = import_meshes(AK)
    T = Matrix(((0, -100, 0, 0), (100, 0, 0, 0), (0, 0, 100, -19.6 + BZ), (0, 0, 0, 1)))      # AK metres -> rifle cm
    parts = {}
    for name, me in raw.items():
        key = name.replace("_Base_Color_0", "").replace("_blinn3_0", "")
        for suffix in ("_Stock", "_Body"):
            if key.endswith(suffix):
                key = key[: -len(suffix)]
        me.transform(T)
        parts[key] = me
    return parts


def akb_mag():
    raw = import_meshes(AKB)
    mags = [me for n, me in raw.items() if n.split(".")[0] in ("Object_14", "Object_15")]      # materials mag1 / mag2
    return mags


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    mats = materials()
    for key, me in split_hull(base_hull()).items():
        ob = bpy.data.objects.new(key, me)
        bpy.context.scene.collection.objects.link(ob)
        ob["role"] = {"stock_fixed": "furniture", "handguard": "furniture"}.get(key, "body")
        ob["bevel"] = 0.0
    ak = ak_parts()

    def take(keys):
        return [ak[k].copy() for k in keys]

    merged(fit(take(["Muzzle"]), x=(88.6, 96.2), y=0.0, z=BZ, uniform="x"), "muzzle_device", "steel")
    merged(fit(take(["Ironsight_Front"]), x=(89.4, 92.0), y=0.0, z=(-6.4, 3.75)), "front_sight", "steel")
    merged(fit(take(["Main_Barrel"]), x=(54.6, 89.8), y=(-1.02, 1.02), z=(BZ - 1.02, BZ + 1.02)), "barrel", "steel")
    merged(fit(take(["Trigger_44"]), x=(35.5, 37.4), y=0.0, z=(-8.9, -5.4), uniform="z"), "trigger", "steel")
    merged(fit(take(["Main_Grip"]), x=(25.8, 35.4), y=0.0, z=(-17.4, -5.4), uniform="z"), "grip", "furniture")
    merged(fit(take(["Mode_Switch"]), x=(26.6, 32.0), y=(-2.45, -1.92), z=(-4.0, -2.3)), "selector", "steel")
    merged(fit(take(["Sight_Block", "SightBlock1", "SightBlock2", "SightBlock3", "SightBlock4"]), x=(45.4, 52.2), y=0.0, z=(3.45, 5.8)),
           "rear_sight", "steel")
    merged(fit(take(["Dovetail_Support", "Dovetail_Support_bolts"]), x=(29.0, 41.6), y=(1.92, 2.35), z=(-2.3, -0.4)), "side_rail", "steel")
    pins = []
    for x, z, r in ((40.0, -2.6, 0.4), (38.0, -2.5, 0.55), (34.3, -4.4, 0.32), (32.4, -2.4, 0.32), (22.75, -2.25, 0.6), (53.6, -2.9, 0.4)):
        pins += fit(take(["Receiver_Bolt"]), x=(x - r, x + r), y=(-2.12, 2.12), z=(z - r, z + r))
    for x, z in ((84.6, -4.6), (60.2, -4.6)):
        pins += fit(take(["Cage_Screw"]), x=(x - 0.5, x + 0.5), y=(-2.8, 2.8), z=(z - 0.45, z + 0.45))
    merged(pins, "pins_and_screws", "steel")
    teeth = []
    for k in range(31):
        x = 41.6 + k * 1.0
        teeth += fit(take(["Cage_Grooves_Top"]), x=(x, x + 0.56), y=(-1.05, 1.05), z=(3.08, 3.4))
    for k in range(7):
        x = 57.4 + k * 1.0
        flip = fit(take(["Cage_Grooves_Top"]), x=(x, x + 0.56), y=(-1.05, 1.05), z=(-5.94, -5.62))
        teeth += flip
    merged(teeth, "rail_teeth", "steel")
    stock = ["Stock_Main1", "Stock_Separator", "Stock_Lower_Part", "Stock_Divider", "Stock_Bevel_Cube"]
    hard = ["Stock_Cyl", "Stock_holder", "Stock_Hinge", "Stock_Adjuster", "Stock_Adjuster_Part", "Stock_Hole"]
    group = take(stock) + take(hard)
    lo, hi = bbox(group)
    M = Matrix.Translation((20.3 - hi.x, 0, 6.1))
    for me in group:
        me.transform(M)
    merged(group[: len(stock)], "stock_adj_body", "furniture")
    merged(group[len(stock):], "stock_adj_tube", "steel")

    for name, drop in (("mag_25", 15.0), ("mag_40", 20.0)):
        mags = [me.copy() for me in akb_mag()]
        lo, hi = bbox(mags)
        s = drop / (hi.z - lo.z)
        pts = [v.co for me in mags for v in me.vertices if v.co.z > hi.z - (hi.z - lo.z) * 0.08]
        x_rear = min(p.x for p in pts)
        # the AK-pattern mag sweeps forward hard; tilt it back 11 degrees about its top so it hangs like the base's
        M = (Matrix.Translation((43.6, 0, -4.2)) @ Matrix.Rotation(math.radians(11), 4, "Y") @ Matrix.Diagonal((s, s * 1.32, s, 1))
             @ Matrix.Translation((-x_rear, -(lo.y + hi.y) / 2, -hi.z)))
        for me in mags:
            me.transform(M)
        merged(mags, name, "furniture")

    # chamfer tags for the wear shader: kitbashed meshes are not bevelled, so mark sharp-edge vertices instead
    for ob in [o for o in bpy.context.scene.objects if o.type == "MESH"]:
        bm = bmesh.new()
        bm.from_mesh(ob.data)
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
        layer = bm.verts.layers.float.new("_EDGE")
        for e in bm.edges:
            if len(e.link_faces) == 2 and e.calc_face_angle(0) > math.radians(35):
                for v in e.verts:
                    v[layer] = 1.0
        bm.to_mesh(ob.data)
        bm.free()
    tris = export(os.path.abspath(OUT), mats)
    print("TRIANGLES", tris)
    print("fitted (25-round mag, fixed stock)", sum(v for k, v in tris.items() if not k.startswith(("mag_40", "stock_adj"))), "all", sum(tris.values()))
    print("wrote", os.path.abspath(OUT), os.path.getsize(OUT) // 1024, "KB")


main()
