"""Build the core pack: a shirt torso that sits under the plate carrier on every operator, eyelids for blinking, and a head with hair options.

The purchased mesh has sleeves and a plate carrier but no torso fabric, so removing the carrier ("Uniform only")
showed a hollow chest. The shirt reuses the material NAME `M_Top_Fabric`; at runtime it is mapped onto the base's
own material instance, so the Uniform-top colour zone (camo, plaid, solid) paints it too.

    python tools/assets/build-core-pack.py --source <path>/Low_Poly_US_Soldier.blend --out build/core-pack.raw.glb
    node tools/assets/optimize-pack.mjs build/core-pack.raw.glb assets/models/operators/core-pack.glb
"""
import argparse, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy, bmesh
import blender_common as bc

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
ap = argparse.ArgumentParser(); ap.add_argument('--source', required=True); ap.add_argument('--out', required=True)
a = ap.parse_args(argv)
ctx = bc.open_skeleton(a.source)
S = bc.smooth

bm = bmesh.new()
sections = [  # z, rx, ry, cy: hips -> belly -> chest -> shoulders -> neck base
    (0.940, .166, .126, .000), (1.080, .172, .132, -.004), (1.220, .184, .140, -.010),
    (1.340, .204, .142, -.012), (1.430, .196, .122, -.004), (1.490, .098, .096, .006)]
bc.loft(ctx, bm, [bc.ring_pts(0, cy, z, rx, ry, 12, exp=2.2) for z, rx, ry, cy in sections], close_top=False)
bc.cyl_uv(ctx, bm, 0.0, 1.0, 3.0)
shirt = bc.make(ctx, 'SK_Core_Shirt', bm, bc.material('M_Top_Fabric', '#7a7a60'))
def w(p):
    side = 'clavicle_l' if p.x > 0 else 'clavicle_r'
    shoulder = S(1.36, 1.46, p.z) * min(1, abs(p.x) / .19)
    return {'pelvis': 1 - S(0.95, 1.10, p.z), 'spine_01': S(0.95, 1.10, p.z) * (1 - S(1.10, 1.24, p.z)), 'spine_02': S(1.10, 1.24, p.z) * (1 - S(1.24, 1.36, p.z)),
            'spine_03': S(1.24, 1.36, p.z) * (1 - shoulder) * (1 - S(1.40, 1.48, p.z)), 'spine_04': S(1.40, 1.48, p.z) * (1 - shoulder), side: shoulder}
bc.skin(ctx, shirt, w)
# Eyelids: two skin-coloured plates just in front of the eyeballs. Hidden normally; the page shows them for ~0.13 s to blink.
from mathutils import Vector
bm = bmesh.new()
for sx in (-1, 1):
    bc.box(ctx, bm, .033 * sx, -.1235, 1.673, .031, .004, .023)
lids = bc.make(ctx, 'SK_Core_Lids', bm, bc.material('M_Head', '#8e6f61'))
bc.skin(ctx, lids, lambda p: {'head': 1})

# Head: the purchased character only ships an eye strip (SK_Face) inside a balaclava, so "bare head" showed floating eyes.
# This is a faceted skull + jaw + ears in the skin material M_Head, kept just behind the eye strip so the eyes stay visible.
def head_ring(z, front, back, rx, n=12):
    return bc.ring_pts(0, (front + back) / 2, z, rx, (back - front) / 2, n, exp=2.3)
bm = bmesh.new()
profile = [  # z, front y, back y, half-width
    (1.540, -.072, .030, .040), (1.578, -.108, .060, .060), (1.612, -.122, .076, .070), (1.640, -.118, .082, .076),
    (1.662, -.099, .086, .080), (1.700, -.097, .088, .084), (1.745, -.090, .084, .082), (1.778, -.068, .066, .068), (1.797, -.030, .020, .036)]
bc.loft(ctx, bm, [head_ring(*p_) for p_ in profile])
for sx in (-1, 1): bc.box(ctx, bm, .090 * sx, .004, 1.665, .012, .030, .042)      # ears
bc.box(ctx, bm, 0, -.126, 1.632, .018, .016, .034)                                # nose
head = bc.make(ctx, 'SK_Core_Head', bm, bc.material('M_Head', '#8e6f61'))
bc.skin(ctx, head, lambda p: {'head': 1})

# Hair: a close crop that follows the skull above the brow, a cap that stops at the ears.
bm = bmesh.new()
hair_profile = [(1.722, -.100, .092, .090), (1.752, -.096, .090, .088), (1.782, -.074, .072, .074), (1.800, -.030, .024, .040), (1.806, -.004, -.002, .010)]
bc.loft(ctx, bm, [head_ring(*p_) for p_ in hair_profile])
hair_mat = bc.material('M_Hair', '#3b2a1e')
hair = bc.make(ctx, 'SK_Core_Hair', bm, hair_mat)
bc.skin(ctx, hair, lambda p: {'head': 1})

# Facial hair: a moustache bar and a jaw beard.
bm = bmesh.new()
bc.box(ctx, bm, 0, -.1255, 1.607, .052, .012, .014)
stache = bc.make(ctx, 'SK_Core_Moustache', bm, hair_mat)
bc.skin(ctx, stache, lambda p: {'head': 1})
bm = bmesh.new()
beard_profile = [(1.548, -.080, .034, .050), (1.575, -.118, .056, .066), (1.600, -.128, .074, .072), (1.622, -.118, .080, .074)]
bc.loft(ctx, bm, [head_ring(*p_) for p_ in beard_profile])
beard = bc.make(ctx, 'SK_Core_Beard', bm, hair_mat)
bc.skin(ctx, beard, lambda p: {'head': 1})

bc.export(ctx, a.out, (shirt, lids, head, hair, stache, beard))
print('core pack ->', a.out)
