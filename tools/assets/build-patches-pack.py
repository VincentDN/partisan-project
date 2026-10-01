"""Build the patches pack: sleeve insignia as tiny textured quads skinned to the upper arms.

Six original designs (32x32 px, nearest-filtered): star roundel, mountain shield, MP-O tag, tricolour (placeholder
faction stripes), medic cross, rank chevrons. One quad per design per side (SK_Patch_<L|R>_<design>), toggled by
the Operator Customiser's patch slots. All artwork is drawn here, in code: no reference image is traced.

    python tools/assets/build-patches-pack.py --source <path>/Low_Poly_US_Soldier.blend --out build/patches-pack.raw.glb
    node tools/assets/optimize-pack.mjs build/patches-pack.raw.glb assets/models/operators/patches-pack.glb
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

N = 32
def hexrgb(h): return tuple(int(h[i:i + 2], 16) / 255 for i in (1, 3, 5))
class Canvas:
    def __init__(self, bg): self.px = [[hexrgb(bg)] * N for _ in range(N)]
    def set(self, x, y, c):
        if 0 <= x < N and 0 <= y < N: self.px[y][x] = hexrgb(c)
    def rect(self, x0, y0, x1, y1, c):
        for y in range(y0, y1):
            for x in range(x0, x1): self.set(x, y, c)
    def disc(self, cx, cy, r, c):
        for y in range(N):
            for x in range(N):
                if (x + .5 - cx) ** 2 + (y + .5 - cy) ** 2 <= r * r: self.set(x, y, c)
    def poly(self, pts, c):
        for y in range(N):
            for x in range(N):
                inside, j = False, len(pts) - 1
                for i in range(len(pts)):
                    xi, yi = pts[i]; xj, yj = pts[j]
                    if (yi > y + .5) != (yj > y + .5) and (x + .5) < (xj - xi) * (y + .5 - yi) / (yj - yi) + xi: inside = not inside
                    j = i
                if inside: self.set(x, y, c)
    def border(self, c, w=1):
        for k in range(w):
            for i in range(N): self.set(i, k, c); self.set(i, N - 1 - k, c); self.set(k, i, c); self.set(N - 1 - k, i, c)
    def image(self, name):
        img = bpy.data.images.new(name, N, N, alpha=False)
        flat = []
        for y in range(N - 1, -1, -1):                 # image rows are bottom-up
            for x in range(N): flat += [*self.px[y][x], 1]
        img.pixels = flat; img.pack(); img.file_format = 'PNG'
        return img

FONT = {'M': ['101', '111', '111', '101', '101'], 'P': ['110', '101', '110', '100', '100'], '-': ['000', '000', '111', '000', '000'], 'O': ['111', '101', '101', '101', '111']}
def text(cv, s, x, y, c, scale=2):
    for ch in s:
        for r, row in enumerate(FONT[ch]):
            for k, bit in enumerate(row):
                if bit == '1': cv.rect(x + k * scale, y + r * scale, x + (k + 1) * scale, y + (r + 1) * scale, c)
        x += 4 * scale

def star(cx, cy, r, inner):
    return [(cx + (r if i % 2 == 0 else inner) * math.sin(math.pi * i / 5), cy - (r if i % 2 == 0 else inner) * math.cos(math.pi * i / 5)) for i in range(10)]

def design_star():
    cv = Canvas('#2a2e22'); cv.disc(16, 16, 14, '#d8d3bd'); cv.disc(16, 16, 12, '#2a2e22'); cv.poly(star(16, 16.5, 9.5, 4), '#d8d3bd'); return cv
def design_shield():
    cv = Canvas('#3a4030'); cv.poly([(4, 3), (28, 3), (28, 17), (16, 29), (4, 17)], '#e8e6dc'); cv.poly([(6, 5), (26, 5), (26, 16), (16, 27), (6, 16)], '#4fa0c8')
    cv.poly([(6, 22), (13, 10), (20, 22)], '#c0392b'); cv.poly([(12, 22), (19, 12), (26, 22)], '#f2f2ee'); cv.poly([(6, 16), (26, 16), (26, 24), (16, 27), (6, 24)], '#4a8a5a'); return cv
def design_tag():
    cv = Canvas('#6a6a60'); cv.border('#2a2a26', 2); text(cv, 'MP-O', 2, 9, '#14140f', 2); return cv
def design_tricolour():
    cv = Canvas('#2a2a26'); cv.rect(3, 5, 29, 12, '#3a5a8a'); cv.rect(3, 12, 29, 20, '#e8e4d6'); cv.rect(3, 20, 29, 27, '#a8322a'); cv.border('#14140f', 1); return cv
def design_cross():
    cv = Canvas('#3a4030'); cv.disc(16, 16, 13, '#eceae0'); cv.rect(13, 7, 19, 25, '#b22a22'); cv.rect(7, 13, 25, 19, '#b22a22'); return cv
def design_chevrons():
    cv = Canvas('#3a4030')
    for k in range(3): cv.poly([(4, 24 - k * 7), (16, 14 - k * 7), (28, 24 - k * 7), (28, 18 - k * 7), (16, 8 - k * 7), (4, 18 - k * 7)], '#d6b04a')
    return cv
DESIGNS = {'star': design_star, 'shield': design_shield, 'tag': design_tag, 'tricolour': design_tricolour, 'cross': design_cross, 'chevrons': design_chevrons}

# ---- quads on the outer upper arms ---------------------------------------------------------------
arm = ctx.arm
def quad(side):
    b = arm.data.bones[f'upperarm_{side}']
    head, tail = arm.matrix_world @ b.head_local, arm.matrix_world @ b.tail_local
    d = (tail - head).normalized()
    out = Vector(((1 if side == 'l' else -1) * abs(d.z), 0, abs(d.x))).normalized()   # outward (+x left, -x right) and slightly up
    centre = head + (tail - head) * 0.52 + out * 0.082
    v = -d                                                      # up the arm toward the shoulder
    u = v.cross(out).normalized()                               # u x v = out: u is to the viewer's right when looking at the patch from outside
    s = 0.03
    return [centre - u * s - v * s, centre + u * s - v * s, centre + u * s + v * s, centre - u * s + v * s], out

objs = []
for design, fn in DESIGNS.items():
    mat = bc.material(f'M_Patch_{design}', image=fn().image(f'T_Patch_{design}'), rough=1.0)
    for side in ('l', 'r'):
        pts, out = quad(side)
        bm = bmesh.new()
        vs = [bm.verts.new(ctx.to_local @ p) for p in pts]
        f = bm.faces.new(vs)
        if (ctx.arm.matrix_world.to_3x3() @ f.normal).dot(out) < 0: f.normal_flip()   # face outward
        uv = bm.loops.layers.uv.new('UVMap')
        for l, (x, y) in zip(f.loops, ((0, 0), (1, 0), (1, 1), (0, 1))): l[uv].uv = (x, y)
        o = bc.make(ctx, f'SK_Patch_{side.upper()}_{design}', bm, mat)
        bc.skin(ctx, o, lambda p, side=side: {f'upperarm_{side}': 1})
        objs.append(o)
bc.export(ctx, a.out, objs)
print('patches pack ->', a.out, len(objs), 'quads')
