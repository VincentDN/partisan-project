"""Build the Insurgent extension pack (knit beanie, shemagh face wrap) on the Base Operator skeleton.

Matches keyframe 1/2 of the moodboard: black beanie, patterned face cover wrapped over the lower face and neck.
The plaid shirt is a generated fabric pattern (shared/camo.js), not geometry. See build-recon-pack.py for the
pack mechanism.

    python tools/assets/build-insurgent-pack.py --source <path>/Low_Poly_US_Soldier.blend --out build/insurgent-pack.raw.glb
    node tools/assets/optimize-pack.mjs build/insurgent-pack.raw.glb assets/models/operators/insurgent-pack.glb
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

# ---- Beanie: a close knit cap with a folded cuff -------------------------------------------------
bm = bmesh.new()
sections = [  # z, rx, ry, cy
    (1.640, .128, .158, -.020), (1.668, .134, .166, -.020), (1.690, .126, .158, -.018),   # cuff (slightly proud)
    (1.730, .122, .150, -.010), (1.775, .112, .136, 0.000), (1.815, .090, .108, .008), (1.842, .040, .052, .012)]
bc.loft(ctx, bm, [bc.ring_pts(0, cy, z, rx, ry, 10) for z, rx, ry, cy in sections])
for f in list(bm.faces):                                    # the face opens below the cuff: trim the front of the first band
    c = sum((arm.matrix_world @ v.co for v in f.verts), Vector()) / len(f.verts)
    if c.y < -0.1 and abs(c.x) < 0.06 and c.z < 1.675: bm.faces.remove(f)
beanie = bc.make(ctx, 'SK_Ins_Beanie', bm, bc.material('M_Beanie', '#1c1d1f'))
bc.skin(ctx, beanie, lambda p: {'head': 1})

# ---- Shemagh: wrapped over mouth and nose, around the neck, a loose tail on the chest ---------------
bm = bmesh.new()
sections = [  # z, rx, ry, cy: bulges forward at the mouth, stops under the eyes
    (1.455, .150, .125, .000), (1.510, .136, .128, -.004), (1.568, .126, .150, -.020), (1.628, .122, .168, -.030), (1.664, .118, .164, -.024)]
verts = bc.loft(ctx, bm, [bc.ring_pts(0, cy, z, rx, ry, 10) for z, rx, ry, cy in sections], close_top=False)
tail = [((.07, -.150, 1.46), (.0, -.170, 1.46)), ((.07, -.186, 1.36), (.0, -.200, 1.36)), ((.05, -.196, 1.28), (.012, -.206, 1.26))]
vv = [[bm.verts.new(ctx.to_local @ Vector(p)) for p in pair] for pair in tail]
for r0, r1 in zip(vv, vv[1:]): bm.faces.new([r0[0], r0[1], r1[1], r1[0]])
bc.cyl_uv(ctx, bm, -0.012, 1.4, 12)
shemagh = bc.make(ctx, 'SK_Ins_Shemagh', bm, bc.material('M_Shemagh', image=bc.houndstooth(dark=(0.03, 0.05, 0.02), light=(0.30, 0.34, 0.20), name='T_Shemagh')))
bc.skin(ctx, shemagh, lambda p: {'head': S(1.58, 1.64, p.z), 'neck_03': (1 - S(1.58, 1.64, p.z)) * S(1.5, 1.57, p.z), 'neck_01': (1 - S(1.5, 1.57, p.z)) * S(1.44, 1.5, p.z), 'spine_04': 1 - S(1.44, 1.5, p.z)})

bc.export(ctx, a.out, (beanie, shemagh))
print('insurgent pack ->', a.out)
