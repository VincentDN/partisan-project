"""Build the core pack: a shirt torso that sits under the plate carrier on every operator.

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
bc.export(ctx, a.out, (shirt,))
print('core pack ->', a.out)
