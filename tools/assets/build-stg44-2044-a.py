"""Test A, "LLM-Rebuild": the StG 44 (2044) rebuilt part by part as clean hard-surface geometry.

    python3 tools/assets/build-stg44-2044-a.py      ->  assets/models/weapons/stg44-2044-a.glb

Every outline was traced off calibrated 1 cm grid renders of the attached base model (the Magnific/Tripo StG),
so silhouette and part placement stay the base's. What a real rifle needs on top of that (ejection port with dust
cover, charging handle and slot, pin pattern, selector with markings, magazine and bolt releases, QD sockets,
Picatinny teeth, front-sight post and hood, slotted muzzle brake, gas regulator, sling hardware, buttpad) was
checked side by side against the SG 550, G3 and SIG Spear references. Units: cm (see stg44_kit.py).
"""

import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402  isort: skip
from mathutils import Matrix  # noqa: E402

from stg44_kit import Part, apply_bool, export, materials, oval, rrect  # noqa: E402

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "assets", "models", "weapons", "stg44-2044-a.glb")
BZ = -4.2  # bore height


def both(fn):
    """Call fn(side) for the shooter's left (+1) and right (-1)."""
    for s in (1, -1):
        fn(s)


def stock(objs):
    p = Part("stock_fixed", "furniture", 0.22)
    outline = [(18.25, 2.75), (11.5, 1.75), (9.75, 3.25), (1.6, 3.25), (0.9, 2.4), (1.4, -9.0), (2.6, -10.3), (17.6, -4.3), (18.25, -4.0)]
    p.prism(outline, -1.75, 1.75)
    ob = p.obj()
    cuts = []
    c = Part("c", "x")
    c.prism(oval(2.2, 8.2, 0.7, 2.3), -3, 3)                                       # sling slot, through
    cuts.append(c)
    for s in (1, -1):                                                               # thumb recess, D-shaped, both sides
        c = Part("c", "x")
        d = [(10.5, -1.8), (6.6, -1.8)] + [(6.6 + 1.9 * math.sin(math.radians(a)), -3.8 + 2.0 * math.cos(math.radians(a))) for a in range(15, 180, 15)] + [(6.6, -5.8), (10.5, -5.8)]
        c.prism(d, s * 1.2, s * 3)
        cuts.append(c)
    apply_bool(ob, cuts)
    objs.append(ob)
    pad = Part("stock_fixed_pad", "black", 0.15)                                     # rubber buttpad with grooves
    pad.prism([(1.6, 3.25), (0.9, 2.4), (1.4, -9.0), (2.6, -10.3), (2.0, -10.6), (0.2, -9.2), (-0.3, 2.6), (0.6, 3.5)], -1.8, 1.8)
    ob = pad.obj()
    cuts = []
    for k in range(9):                                                               # grooves across the rear face only
        z = 1.6 - k * 1.15
        xe = -0.3 + (2.6 - z) * 0.042
        c = Part("c", "x")
        c.box((xe - 0.6, -2.5, z - 0.13), (xe + 0.22, 2.5, z + 0.13))
        cuts.append(c)
    apply_bool(ob, cuts)
    objs.append(ob)
    hw = Part("stock_hardware", "steel", 0.03)                                       # QD socket and two screws
    both(lambda s: hw.cyl((15.6, s * 1.75, -3.2), (15.6, s * 2.05, -3.2), 0.75, 20))
    both(lambda s: hw.cyl((15.6, s * 2.05, -3.2), (15.6, s * 2.1, -3.2), 0.45, 20))
    for x, z in ((16.6, 1.5), (12.6, -2.6)):
        both(lambda s, x=x, z=z: hw.cyl((x, s * 1.74, z), (x, s * 1.86, z), 0.32, 12))
    objs.append(hw.obj())


def receiver(objs):
    cap = Part("receiver_cap", "body", 0.3)                                          # rear end cap
    cap.prism([(20.25, 3.2), (24.1, 4.1), (24.1, -3.4), (21.0, -3.3), (20.25, -2.4)], -1.95, 1.95)
    objs.append(cap.obj())
    bt = Part("buffer_joint", "steel", 0.06)
    bt.lathe([(18.1, 1.5), (18.6, 1.65), (18.9, 1.45), (19.3, 1.65), (19.6, 1.45), (20.0, 1.65), (20.3, 1.75)], (0, 0, 0.1))
    objs.append(bt.obj())

    up = Part("receiver_upper", "body", 0.14)                                        # stamped upper tube
    up.prism(rrect(4.3, 4.7, 1.3, 1.3), 24.0, 54.75, "x")
    ob = up.obj()
    cuts = []
    c = Part("c", "x")
    c.box((44.0, -3.0, -0.75), (52.6, -1.6, -3.25 + 2.6))                            # ejection port (right)
    cuts.append(c)
    c = Part("c", "x")
    c.box((43.4, 1.8, 1.0), (53.4, 3.0, 1.8))                                       # charging-handle slot (left)
    cuts.append(c)
    apply_bool(ob, cuts)
    objs.append(ob)
    lo = Part("receiver_lower", "body", 0.12)                                        # trigger housing and forward lower
    lo.prism([(24.0, -0.6), (54.75, -0.6), (54.75, -4.4), (50.6, -4.4), (40.9, -5.5), (29.0, -5.5), (25.4, -4.4), (24.0, -3.4)], -1.9, 1.9)
    objs.append(lo.obj())
    tr = Part("trunnion", "body", 0.1)                                               # barrel nut / front trunnion ring
    tr.prism([(54.75, 3.35), (56.5, 3.35), (56.5, -5.4), (54.75, -5.4)], -2.25, 2.25)
    objs.append(tr.obj())
    mw = Part("magwell", "body", 0.12)
    mw.prism([(50.5, -4.4), (41.0, -4.4), (41.0, -8.0), (50.7, -8.0)], -1.75, 1.75)
    ob = mw.obj()
    c = Part("c", "x")
    c.prism([(49.6, -4.0), (43.6, -4.0), (43.6, -9.0), (49.8, -9.0)], -1.42, 1.42)    # magazine opening
    apply_bool(ob, [c])
    objs.append(ob)
    lip = Part("magwell_lip", "body", 0.08)                                           # flared lip, one ring
    lip.prism([(50.9, -7.6), (40.8, -7.6), (40.8, -8.4), (51.0, -8.4)], -1.95, 1.95)
    ob = lip.obj()
    c = Part("c", "x")
    c.prism([(49.75, -7.0), (43.6, -7.0), (43.6, -9.0), (49.8, -9.0)], -1.42, 1.42)
    apply_bool(ob, [c])
    objs.append(ob)


    det = Part("receiver_details", "steel", 0.03)
    # stamped stiffening ribs and the weld seam along both sides of the upper
    both(lambda s: det.box((24.6, s * 2.15 - 0.06, 2.6), (43.0, s * 2.15 + 0.06, 2.9)))
    both(lambda s: det.box((24.6, s * 2.15 - 0.06, 1.25), (42.6, s * 2.15 + 0.06, 1.5)))
    # dust cover hinged under the ejection port (right), with a spring bump
    det.box((43.8, -2.25, -3.45), (52.8, -2.1, -3.1))
    det.box((44.2, -2.32, -3.15), (52.4, -2.12, -0.95))
    det.box((47.6, -2.42, -2.4), (49.2, -2.3, -1.8))
    # bolt catch in a pressed window (left), as on the base
    det.box((42.25, 1.86, -3.5), (45.0, 1.98, -1.25))
    det.prism([(42.6, -2.0), (44.6, -2.0), (44.6, -2.75), (42.6, -2.75)], 1.98, 2.3)
    det.box((43.2, 2.3, -2.5), (44.0, 2.42, -2.25))
    # charging handle (left): shaft, knob with knurl rings
    det.cyl((44.0, 1.6, 1.4), (44.0, 3.4, 1.4), 0.32, 14)
    det.cyl((44.0, 3.4, 1.4), (44.0, 4.4, 1.4), 0.62, 18)
    for k in range(4):
        det.cyl((44.0, 3.5 + k * 0.25, 1.4), (44.0, 3.6 + k * 0.25, 1.4), 0.68, 18)
    # pins through the housing, both sides (push pins, trigger and hammer pins, bolt catch pivot)
    for x, z, r in ((40.0, -2.6, 0.38), (38.0, -2.5, 0.55), (34.3, -4.4, 0.3), (32.4, -2.4, 0.3), (22.75, -2.25, 0.6), (53.6, -2.9, 0.38)):
        both(lambda s, x=x, z=z, r=r: det.cyl((x, s * 1.85, z), (x, s * 2.05, z), r, 16))
        both(lambda s, x=x, z=z, r=r: det.cyl((x, s * 2.05, z), (x, s * 2.12, z), r * 0.55, 12))
    # rivets along the upper tube
    for x in (26.0, 30.0, 34.0, 38.0):
        both(lambda s, x=x: det.cyl((x, s * 2.15, 0.2), (x, s * 2.25, 0.2), 0.22, 10))
    # magazine release (button both sides) and bolt release paddle
    both(lambda s: det.cyl((42.6, s * 1.75, -6.3), (42.6, s * 2.15, -6.3), 0.55, 18))
    det.prism([(41.4, -4.9), (40.6, -4.9), (40.4, -6.6), (41.2, -6.8)], -0.45, 0.45)
    # selector: lever on the left with SAFE / SEMI / AUTO stops, small ambidextrous lever on the right
    det.cyl((31.2, 1.9, -3.2), (31.2, 2.35, -3.2), 0.7, 20)
    det.prism([(31.2, -2.85), (31.2, -3.55), (28.7, -2.2), (28.9, -1.7)], 2.25, 2.55)
    for k, a in enumerate((-60, -10, 40)):
        x, z = 31.2 + 1.3 * math.cos(math.radians(a + 90)), -3.2 + 1.3 * math.sin(math.radians(a + 90))
        det.cyl((x, 1.88, z), (x, 1.98, z), 0.13, 8)
    det.cyl((31.2, -1.9, -3.2), (31.2, -2.25, -3.2), 0.55, 18)
    det.prism([(31.2, -2.95), (31.2, -3.45), (29.6, -2.6), (29.7, -2.3)], -2.2, -2.45)
    objs.append(det.obj())
    mark = Part("selector_marks", "red", 0.0)                                         # red AUTO dot
    x, z = 31.2 + 1.3 * math.cos(math.radians(130)), -3.2 + 1.3 * math.sin(math.radians(130))
    mark.cyl((x, 1.99, z), (x, 2.02, z), 0.15, 10)
    objs.append(mark.obj())


def fire_control(objs):
    g = Part("trigger_guard", "body", 0.1)
    outer = [(41.3, -5.5), (41.1, -7.2), (40.2, -9.7), (38.2, -11.5), (34.4, -11.6), (32.8, -10.0), (32.6, -6.6), (33.6, -6.0), (34.4, -9.4),
             (35.4, -10.6), (37.8, -10.6), (39.4, -9.2), (40.1, -6.9), (40.2, -5.5)]
    g.prism(outer, -0.7, 0.7)
    objs.append(g.obj())
    t = Part("trigger", "steel", 0.04)
    blade = [(37.25, -5.4), (36.5, -5.4), (36.3, -6.5), (35.95, -7.5), (35.45, -8.35), (35.75, -8.8), (36.4, -8.1), (36.85, -7.0), (37.2, -6.1)]
    t.prism(blade, -0.32, 0.32)
    objs.append(t.obj())
    gp = Part("grip", "furniture", 0.24)
    outline = [(35.0, -5.4), (34.6, -7.6), (34.0, -9.0), (33.6, -10.6), (32.6, -12.4), (32.2, -14.0), (31.0, -16.6), (30.4, -17.3), (28.3, -16.5), (26.0, -15.0),
               (26.3, -14.0), (27.4, -11.0), (28.5, -7.5), (29.4, -5.3)]
    gp.prism(outline, -1.32, 1.32)
    ob = gp.obj()
    cuts = []
    for s in (1, -1):                                                               # textured side panels, recessed
        c = Part("c", "x")
        c.prism([(32.9, -7.4), (31.6, -12.6), (29.8, -15.8), (28.4, -15.1), (28.4, -13.6), (29.6, -8.8), (30.6, -6.9)], s * 1.12, s * 2)
        cuts.append(c)
    apply_bool(ob, cuts)
    objs.append(ob)
    st = Part("grip_texture", "black", 0.0)
    for k in range(9):                                                              # stipple ribs in the recess
        z = -7.6 - k * 0.92
        x0 = 30.2 - 0.32 * k
        both(lambda s, z=z, x0=x0: st.box((x0 - 1.3, s * 1.13 - 0.05, z - 0.18), (x0 + 1.5 - 0.1 * k, s * 1.13 + 0.05, z + 0.18)))
    objs.append(st.obj())


def front_end(objs):
    hg = Part("handguard", "furniture", 0.16)
    rings = []
    for x, top, bot in ((56.5, -1.25, -5.6), (86.9, -1.75, -6.9)):
        w = 2.6
        rings.append([(x, w, top - 0.6), (x, w - 0.5, top), (x, -w + 0.5, top), (x, -w, top - 0.6), (x, -w, bot + 0.6), (x, -w + 0.6, bot), (x, w - 0.6, bot), (x, w, bot + 0.6)])
    n = len(rings[0])
    hg.add(rings[0] + rings[1], [list(range(n - 1, -1, -1)), list(range(n, 2 * n))] + [[i, (i + 1) % n, n + (i + 1) % n, n + i] for i in range(n)])
    ob = hg.obj()
    cuts = []
    c = Part("c", "x")                                                               # hollow bore for the barrel
    c.prism(rrect(4.2, 3.9, 1.0, -4.0), 56.0, 87.5, "x")
    cuts.append(c)
    for k in range(13):                                                              # raked lightening slots, through both sides
        x = 66.0 + k * 1.6
        M = Matrix.Translation((x, 0, -2.75)) @ Matrix.Rotation(math.radians(-33), 4, "Y")
        c = Part("c", "x")
        c.add([(0, 0, 0)], [])
        c.prism(oval(-1.1, 1.1, -0.32, 0.32), -3.5, 3.5, "y", M)
        cuts.append(c)
    for k in range(4):                                                               # lower M-LOK row, through both sides
        c = Part("c", "x")
        c.prism(oval(67.5 + k * 4.6, 70.9 + k * 4.6, -5.2, -4.55), -3.5, 3.5)
        cuts.append(c)
    apply_bool(ob, cuts)
    objs.append(ob)
    vb = Part("handguard_vent", "furniture", 0.06)                                   # rear vent panel with vertical ribs
    both(lambda s: [vb.box((57.4 + k * 0.85, s * 2.55 - 0.12, -4.9), (57.9 + k * 0.85, s * 2.55 + 0.12, -1.9)) for k in range(7)])
    objs.append(vb.obj())

    ug = Part("gas_housing", "body", 0.14)                                           # upper gas-tube housing
    nose = [(72.5 - 0.9 + 0.9 * math.cos(math.radians(a)), 0.75 + 2.0 * math.sin(math.radians(a))) for a in range(-90, 91, 15)]
    ug.prism([(54.75, -1.25)] + nose + [(54.75, 2.75)], -1.55, 1.55)
    ob = ug.obj()
    cuts = []
    for x0, x1 in ((60.5, 63.25), (64.0, 66.5), (67.5, 70.0)):
        c = Part("c", "x")
        c.prism(oval(x0, x1, 0.95, 1.75), -3, 3)
        cuts.append(c)
    apply_bool(ob, cuts)
    objs.append(ob)

    rl = Part("rails", "steel", 0.03)
    def picatinny(x0, x1, z, down=False, y=0.0):
        n = int((x1 - x0) / 1.0)
        s = -1 if down else 1
        rl.box((x0, y - 1.05, min(z, z + s * 0.32)), (x1, y + 1.05, max(z, z + s * 0.32)))
        for i in range(n):
            x = x0 + i * 1.0 + 0.22
            zz = z + s * 0.32
            rl.prism([(-1.05, 0), (1.05, 0), (0.78, s * 0.3), (-0.78, s * 0.3)], x, x + 0.56, "x", Matrix.Translation((0, y, zz)))
        for i in range(0, n, 4):                                                    # slot numbers as small bumps every 4th tooth
            rl.box((x0 + i * 1.0 + 0.6, y + 0.92, zz), (x0 + i * 1.0 + 0.75, y + 1.0, zz + s * 0.1))
    picatinny(41.4, 72.4, 3.3)
    picatinny(57.2, 64.2, -5.62, down=True)
    objs.append(rl.obj())

    st = Part("barrel", "steel", 0.05)
    st.lathe([(54.0, 1.05), (86.9, 1.05), (86.9, 0.95), (89.4, 0.95)], (0, 0, BZ))
    objs.append(st.obj())
    rod = Part("piston_rod", "steel", 0.03)                                           # piston / cleaning rod above the handguard
    rod.cyl((72.5, 0, 0.0), (77.0, 0, 0.0), 0.35, 14)
    rod.cyl((76.6, 0, 0.0), (77.3, 0, 0.0), 0.55, 16)
    rod.lathe([(72.4, 1.15), (73.3, 1.15), (73.3, 0.7), (73.6, 0.7)], (0, 0, 0.35))
    objs.append(rod.obj())
    fs = Part("front_sight", "steel", 0.05)                                           # band, gas block, tapered tower, hood ears, post, lug
    fs.lathe([(89.2, 1.42), (92.25, 1.42)], (0, 0, BZ))
    fs.box((89.4, -1.35, BZ + 0.9), (92.1, 1.35, -2.0))
    fs.prism([(89.6, -2.0), (91.7, -2.0), (91.2, 1.6), (90.1, 1.6)], -0.9, 0.9)
    for s_ in (1, -1):
        fs.prism([(89.8, 0.4), (91.4, 0.4), (91.25, 3.4), (90.0, 3.4)], s_ * 0.62, s_ * 0.95)
    fs.cyl((90.6, 0, 1.4), (90.6, 0, 3.1), 0.16, 10)
    fs.box((90.0, -0.55, BZ - 2.2), (92.2, 0.55, BZ - 1.2))
    objs.append(fs.obj())
    mb = Part("muzzle_brake", "steel", 0.04)                                          # brake with three ports a side, crowned front
    mb.lathe([(92.0, 1.18), (94.0, 1.18), (94.0, 1.0), (94.1, 0.5)], (0, 0, BZ))
    ob = mb.obj()
    cuts = []
    for k in range(3):
        c = Part("c", "x")
        c.box((92.35 + k * 0.58, -2, BZ - 0.55), (92.72 + k * 0.58, 2, BZ + 0.55))
        cuts.append(c)
    c = Part("c", "x")
    c.cyl((91.0, 0, BZ), (95.0, 0, BZ), 0.42, 16)                                    # bore
    cuts.append(c)
    apply_bool(ob, cuts)
    objs.append(ob)
    rs = Part("rear_sight", "steel", 0.04)                                            # base, folding front leaf, windage drum
    rs.box((45.5, -1.05, 3.6), (52.0, 1.05, 4.05))
    rs.prism([(45.6, 4.05), (46.6, 4.05), (48.9, 5.75), (48.4, 5.9)], -0.55, 0.55)
    rs.cyl((51.2, -1.0, 4.75), (51.2, -0.8, 4.75), 0.45, 16)
    rs.cyl((51.2, 0.8, 4.75), (51.2, 1.0, 4.75), 0.45, 16)
    objs.append(rs.obj())
    ap = Part("rear_sight_aperture", "steel", 0.04)                                   # aperture tower with a through hole
    ap.prism([(50.4, 4.05), (52.0, 4.05), (51.8, 5.6), (50.6, 5.6)], -0.8, 0.8)
    ob = ap.obj()
    c = Part("c", "x")
    c.cyl((49.5, 0, 5.0), (53.0, 0, 5.0), 0.22, 12)
    apply_bool(ob, [c])
    objs.append(ob)
    qd = Part("sling_hardware", "steel", 0.03)                                        # QD socket at the handguard front, swivel loop
    both(lambda s: qd.cyl((84.6, s * 2.6, -4.6), (84.6, s * 2.85, -4.6), 0.65, 18))
    objs.append(qd.obj())


def magazines(objs):
    for name, extra in (("mag_25", 0.0), ("mag_40", 6.0)):
        m = Part(name, "furniture", 0.14)
        lean = 2.4 * (1 + extra / 13.0)
        m.prism([(49.5, -7.6), (43.5, -7.6), (43.5 + lean * 0.86, -21.6 - extra), (49.5 + lean, -20.6 - extra)], -1.4, 1.4)
        ob = m.obj()
        cuts = []
        for k in range(4 + int(extra / 2)):                                         # side ribs
            z = -14.4 - k * 1.25
            f = (-z - 7.6) / (13.0 + extra)
            for s in (1, -1):
                c = Part("c", "x")
                c.prism(oval(44.8 + lean * f, 48.6 + lean * f, z - 0.28, z + 0.28), s * 1.25, s * 2)
                cuts.append(c)
        for s in (1, -1):                                                           # witness window
            c = Part("c", "x")
            c.prism([(48.6, -9.0), (47.3, -9.0), (47.6, -12.6), (48.9, -12.6)], s * 1.3, s * 2)
            cuts.append(c)
        apply_bool(ob, cuts)
        objs.append(ob)
        fp = Part(name + "_floor", "black", 0.1)
        bx0, bz = 43.5 + lean * 0.86, -21.6 - extra
        fp.prism([(bx0 - 0.4, bz + 0.1), (49.5 + lean + 0.5, bz + 1.1), (49.5 + lean + 0.6, bz + 0.2), (bx0 - 0.3, bz - 0.8)], -1.6, 1.6)
        objs.append(fp.obj())
        bd = Part(name + "_band", "red", 0.0)                                       # red tape band, as on the concept
        zb = -15.0 - extra * 0.6
        f = (-zb - 7.6) / (13.0 + extra)
        bd.prism([(43.45 + lean * f * 0.86, zb + 0.55), (49.55 + lean * f, zb + 0.55), (49.6 + lean * f, zb - 0.55), (43.5 + lean * f * 0.86, zb - 0.55)], -1.43, 1.43)
        objs.append(bd.obj())


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    mats = materials()
    objs = []
    for fn in (stock, receiver, fire_control, front_end, magazines):
        fn(objs)
    tris = export(os.path.abspath(OUT), mats)
    fitted = sum(v for k, v in tris.items() if not k.startswith("mag_40"))
    print("TRIANGLES", tris)
    print("fitted (25-round mag)", fitted, "all", sum(tris.values()))
    print("wrote", os.path.abspath(OUT), os.path.getsize(OUT) // 1024, "KB")


main()
