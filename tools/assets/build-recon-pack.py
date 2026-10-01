"""Build the Recon extension pack (hood, houndstooth scarf, chest radio) on the Base Operator skeleton.

The pack is a GLB with the shared armature plus new skinned `SK_Recon_*` meshes. At runtime the Operator
Customiser re-binds them to the Base Operator's skeleton by bone name, so the purchased character is never
duplicated or modified. Geometry is generated here (original work); the silhouette follows
docs/moodboard/recon-character-sheet.jpg.

    python tools/assets/build-recon-pack.py --source <path>/Low_Poly_US_Soldier.blend --out build/recon-pack.raw.glb
    node tools/assets/optimize-pack.mjs build/recon-pack.raw.glb assets/models/operators/recon-pack.glb

Needs the `bpy` package. The .blend is only read for its armature.
"""
import argparse, math, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy, bmesh
from mathutils import Vector
import blender_common as bc

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
ap = argparse.ArgumentParser(); ap.add_argument('--source', required=True); ap.add_argument('--out', required=True)
a = ap.parse_args(argv)
ctx = bc.open_skeleton(a.source)
arm, S = ctx.arm, bc.smooth

# ---- Hood: faceted cowl with a face opening and a peak swept back ----------------------------------
bm = bmesh.new()
sections = [  # z, rx, ry, cy
    (1.400, .205, .150, .000), (1.462, .162, .128, .000), (1.528, .130, .124, -.004), (1.598, .136, .152, -.016),
    (1.676, .142, .168, -.022), (1.752, .126, .154, .000), (1.822, .090, .118, .030), (1.868, .030, .040, .070)]
bc.loft(ctx, bm, [bc.ring_pts(0, cy, z, rx, ry, 10) for z, rx, ry, cy in sections])
for f in list(bm.faces):                       # face opening: drop the front facets in the face band
    c = sum((arm.matrix_world @ v.co for v in f.verts), Vector()) / len(f.verts)
    if c.y < -0.085 and abs(c.x) < 0.095 and 1.592 < c.z < 1.748: bm.faces.remove(f)
bc.cyl_uv(ctx, bm, -0.02, 0.7, 2.6)
hood = bc.make(ctx, 'SK_Recon_Hood', bm, bc.material('M_Hood', '#5d5f4c'))
def hood_w(p):
    head = S(1.54, 1.64, p.z)
    return {'head': head, 'neck_03': (1 - head) * S(1.50, 1.58, p.z), 'neck_02': (1 - head) * (1 - S(1.50, 1.58, p.z)) * S(1.44, 1.52, p.z),
            ('clavicle_l' if p.x > 0 else 'clavicle_r'): (1 - S(1.44, 1.52, p.z)) * min(1, abs(p.x) / .2), 'spine_04': (1 - S(1.44, 1.52, p.z)) * (1 - min(1, abs(p.x) / .2))}
bc.skin(ctx, hood, hood_w)

# ---- Scarf: chunky houndstooth ring at the neck with a V drape down the chest -------------------
bm = bmesh.new()
rows = []
for i in range(10):
    t = 2 * math.pi * i / 10
    cx, cy, d = .118 * math.cos(t), -.012 + .108 * math.sin(t), Vector((math.cos(t), math.sin(t), 0))
    rows.append([Vector((cx, cy, 1.532)) + d * (.047 * math.cos(2 * math.pi * j / 6)) + Vector((0, 0, .047 * .85 * math.sin(2 * math.pi * j / 6))) for j in range(6)])
vt = [[bm.verts.new(ctx.to_local @ p) for p in row] for row in rows]
for i in range(10):
    for j in range(6): bm.faces.new([vt[i][j], vt[i][(j + 1) % 6], vt[(i + 1) % 10][(j + 1) % 6], vt[(i + 1) % 10][j]])
for side in (-1, 1):
    pts = [((.09 * side, -.150, 1.50), (.03 * side, -.182, 1.50)), ((.075 * side, -.190, 1.40), (.025 * side, -.205, 1.40)), ((.045 * side, -.206, 1.30), (.0, -.212, 1.30))]
    vv = [[bm.verts.new(ctx.to_local @ Vector(p)) for p in pair] for pair in pts]
    for r0, r1 in zip(vv, vv[1:]):
        f = bm.faces.new([r0[0], r0[1], r1[1], r1[0]])
        if side < 0: f.normal_flip()
uv = bm.loops.layers.uv.new('UVMap')
for f in bm.faces:
    for l in f.loops:
        w = arm.matrix_world @ l.vert.co
        l[uv].uv = ((math.atan2(w.y + .012, w.x) / math.pi) * 1.6, w.z * 11)
scarf = bc.make(ctx, 'SK_Recon_Scarf', bm, bc.material('M_Scarf', image=bc.houndstooth()))
bc.skin(ctx, scarf, lambda p: {'neck_01': S(1.46, 1.50, p.z) * (1 - S(1.52, 1.58, p.z)), 'neck_02': S(1.52, 1.58, p.z), 'spine_04': 1 - S(1.38, 1.52, p.z), 'spine_03': 1 if p.z < 1.38 else 0})

# ---- Chest radio (left chest strap) --------------------------------------------------------------
bm = bmesh.new()
bc.box(ctx, bm, .125, -.205, 1.355, .052, .030, .105)      # body
bc.box(ctx, bm, .125, -.222, 1.372, .036, .006, .040)      # display plate
bc.box(ctx, bm, .145, -.205, 1.455, .008, .008, .090)      # antenna
radio = bc.make(ctx, 'SK_Recon_Radio', bm, bc.material('M_Radio', '#2b2e27'))
bc.skin(ctx, radio, lambda p: {'spine_03': 1})

bc.export(ctx, a.out, (hood, scarf, radio))
print('recon pack ->', a.out)
