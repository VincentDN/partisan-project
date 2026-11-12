"""Shared Blender helpers for the StG 44 (2044) generators (build-stg44-2044-a.py, build-stg44-2044-b.py).

Authoring frame: centimetres, +X to the muzzle, +Y the shooter's left, +Z up, measured off the attached base model
(the Magnific/Tripo StG scaled to 0.94 m). `export()` converts to the bench frame: metres, trigger at x = 0, bore
at height 0.05, glTF Y-up. Chamfers are tagged in the `_EDGE` vertex attribute for the bench's wear shader.
"""

import math

import bpy  # isort: skip  (bpy must load before bmesh)
import bmesh
from mathutils import Matrix, Vector
from mathutils.geometry import tessellate_polygon

V = Vector
TRIGGER_X, BORE_Z = 36.75, -4.2          # cm, in the authoring frame


class Part:
    """Accumulates closed shells in authoring space; becomes one object with one material role."""

    def __init__(self, name, role, bevel=0.08):
        self.name, self.role, self.bevel = name, role, bevel
        self.v, self.f = [], []

    def add(self, verts, faces, M=None):
        b = len(self.v)
        self.v += [tuple(M @ V(p)) if M is not None else tuple(p) for p in verts]
        self.f += [[b + i for i in f] for f in faces]
        return self

    def prism(self, pts, a, b, axis="y", M=None):
        """Extrude a 2D polygon: 'y' takes (x, z) points across y = a..b, 'x' takes (y, z), 'z' takes (x, y)."""
        def p3(p, t):
            return {"y": (p[0], t, p[1]), "x": (t, p[0], p[1]), "z": (p[0], p[1], t)}[axis]
        n = len(pts)
        # caps by ear clipping, so concave outlines (grips, guards, stocks) don't fill in
        tris = tessellate_polygon([[V((p[0], p[1], 0)) for p in pts]])
        caps = [[t[0], t[1], t[2]] for t in tris] + [[n + t[2], n + t[1], n + t[0]] for t in tris]
        return self.add([p3(p, a) for p in pts] + [p3(p, b) for p in pts],
                        caps + [[i, (i + 1) % n, n + (i + 1) % n, n + i] for i in range(n)], M)

    def box(self, lo, hi, M=None):
        return self.prism([(lo[0], lo[2]), (hi[0], lo[2]), (hi[0], hi[2]), (lo[0], hi[2])], lo[1], hi[1], "y", M)

    def cyl(self, p0, p1, r, seg=24, r2=None):
        p0, p1 = V(p0), V(p1)
        r2 = r if r2 is None else r2
        d = (p1 - p0).normalized()
        u = d.orthogonal().normalized()
        w = d.cross(u)
        ring = lambda c, rr: [tuple(c + (u * math.cos(2 * math.pi * k / seg) + w * math.sin(2 * math.pi * k / seg)) * rr) for k in range(seg)]  # noqa: E731
        return self.add(ring(p0, r) + ring(p1, r2), [list(range(seg)), list(range(2 * seg - 1, seg - 1, -1))] +
                        [[i, (i + 1) % seg, seg + (i + 1) % seg, seg + i] for i in range(seg)])

    def lathe(self, prof, axis_p, seg=28):
        """Revolve (x, r) pairs around the line through axis_p parallel to X."""
        n = len(prof)
        vs = [(x, axis_p[1] + r * math.cos(2 * math.pi * k / seg), axis_p[2] + r * math.sin(2 * math.pi * k / seg)) for x, r in prof for k in range(seg)]
        fs = [[j * seg + k, j * seg + (k + 1) % seg, (j + 1) * seg + (k + 1) % seg, (j + 1) * seg + k] for j in range(n - 1) for k in range(seg)]
        fs += [list(range(seg - 1, -1, -1)), [(n - 1) * seg + k for k in range(seg)]]
        return self.add(vs, fs)

    def obj(self):
        me = bpy.data.meshes.new(self.name)
        me.from_pydata(self.v, [], self.f)
        bm = bmesh.new()
        bm.from_mesh(me)
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(me)
        bm.free()
        ob = bpy.data.objects.new(self.name, me)
        bpy.context.scene.collection.objects.link(ob)
        ob["role"], ob["bevel"] = self.role, self.bevel
        return ob


def rrect(w, h, r, zc, yc=0.0, seg=6):
    """Rounded rectangle in (y, z)."""
    pts = []
    for cx, cy, a0 in ((w / 2 - r, h / 2 - r, 0), (-w / 2 + r, h / 2 - r, 90), (-w / 2 + r, -h / 2 + r, 180), (w / 2 - r, -h / 2 + r, 270)):
        for k in range(seg + 1):
            a = math.radians(a0 + 90 * k / seg)
            pts.append((yc + cx + r * math.cos(a), zc + cy + r * math.sin(a)))
    return pts


def oval(x0, x1, z0, z1, seg=8):
    """Stadium (slot) outline in (x, z)."""
    r = (z1 - z0) / 2
    zc = (z0 + z1) / 2
    pts = [(x1 - r + r * math.cos(math.radians(-90 + 180 * k / seg)), zc + r * math.sin(math.radians(-90 + 180 * k / seg))) for k in range(seg + 1)]
    pts += [(x0 + r + r * math.cos(math.radians(90 + 180 * k / seg)), zc + r * math.sin(math.radians(90 + 180 * k / seg))) for k in range(seg + 1)]
    return pts


def apply_bool(target, cutters, op="DIFFERENCE"):
    """Boolean every cutter Part (or object) into target, one exact solve each."""
    for c in cutters:
        cut = c.obj() if isinstance(c, Part) else c
        m = target.modifiers.new("b", "BOOLEAN")
        m.operation = op
        m.solver = "EXACT"
        m.object = cut
        dg = bpy.context.evaluated_depsgraph_get()
        new = bpy.data.meshes.new_from_object(target.evaluated_get(dg))
        target.modifiers.clear()
        old = target.data
        target.data = new
        bpy.data.meshes.remove(old)
        bpy.data.objects.remove(cut)
    return target


def finish(ob, mats):
    """Chamfer hard edges and tag the chamfers (_EDGE), weld, smooth with sharp creases, triangulate."""
    me = ob.data
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    layer = bm.verts.layers.float.get("_EDGE") or bm.verts.layers.float.new("_EDGE")
    w = ob.get("bevel", 0.0)
    if w > 0:
        edges = [e for e in bm.edges if len(e.link_faces) == 2 and e.calc_face_angle(0) > math.radians(30)]
        res = bmesh.ops.bevel(bm, geom=edges, offset=w, offset_type="OFFSET", segments=2, affect="EDGES", profile=0.6, clamp_overlap=True)
        faces = [f for f in res["faces"] if f.is_valid]
        split = bmesh.ops.split(bm, geom=faces)
        for f in [g for g in split["geom"] if isinstance(g, bmesh.types.BMFace)]:
            for v in f.verts:
                v[layer] = 1.0
    bmesh.ops.triangulate(bm, faces=bm.faces)
    for f in bm.faces:
        f.smooth = True
    for e in bm.edges:
        e.smooth = not (len(e.link_faces) == 2 and e.calc_face_angle(0) > math.radians(40))
    bm.to_mesh(me)
    bm.free()
    me.materials.clear()
    me.materials.append(mats[ob["role"]])
    return len(me.polygons)


def export(path, mats):
    """cm authoring frame -> bench frame (metres, trigger at x = 0, bore at y = 0.05) and write the GLB."""
    M = Matrix.Translation((0, 0, 0.05)) @ Matrix.Scale(0.01, 4) @ Matrix.Translation((-TRIGGER_X, 0, -BORE_Z))
    tris = {}
    for ob in [o for o in bpy.context.scene.objects if o.type == "MESH"]:
        ob.data.transform(M)
        tris[ob.name] = finish(ob, mats)
    for ob in bpy.context.scene.objects:
        ob.select_set(ob.type == "MESH")
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=True, export_yup=True, export_attributes=True,
                              export_animations=False, export_cameras=False, export_lights=False, export_materials="EXPORT")
    return tris


def materials():
    return {n: bpy.data.materials.new(n) for n in ("body", "furniture", "steel", "black", "red")}
