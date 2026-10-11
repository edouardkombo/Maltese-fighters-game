#!/usr/bin/env python3
"""
Hi-res sprite-sheet generator for the three Maltese fighters.

    python3 tools/make_fighters.py            # all fighters
    python3 tools/make_fighters.py lou        # just one (lou | ganni | karmenu)

Needs: numpy, opencv-python, Pillow.

Every fighter is drawn on the same skeleton and the same 78 poses (the classic 2D-fighter moveset), so
animation timings and hit/hurt boxes stay identical.  Sheets are rendered at RS (=3) pixels per game pixel
and the engine scales them back down (see `spriteScale` in src/entitites/fighters/MalteseFighter.js).

Lou's head is the real cut-out from tools/reference_lou.png - the body is painted around it.

Outputs
    public/images/<name>.png                     sprite sheet
    src/entitites/fighters/sheets/<name>.js      frame table (rect / origin / hit-box)
    public/images/<name>_portrait.png            select-screen portrait
"""
import json
import math
import os
import sys

import cv2
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)

from lib.gfx import Mask, Part, Canvas, rgb, lighten, darken, mix, blur, shifted  # noqa: E402
from lib import heads  # noqa: E402
from lib.heads import spline  # noqa: E402
from lib.poses import KEYS, HIT_FRAMES, poses, vec, vup, add, lerp, rad  # noqa: E402

RS = 3                      # sheet pixels per game pixel
SSF = 2                     # extra supersampling while drawing
D = RS * SSF
CW, CH = 128, 120           # cell, in game pixels
OX, OY = 64, 114            # pivot (feet / pelvis x) inside a cell
COLS = 10
W, H = CW * D, CH * D

# ------------------------------------------------------------------ body dimensions (game px)
T = 17.5        # torso
L1 = 13.6       # thigh
L2 = 13.6       # shin
UA = 11.8       # upper arm
FA = 10.8       # forearm
HS = 0.134      # head design-px -> game px
HEAD_ANCHOR = (150.0, 296.0)   # point of the head image that sits on the neck

OUT = (24, 10, 14)


# ------------------------------------------------------------------ rig
def layout(p, ch):
    rot = p["rot"]
    tt = p["t"] + rot
    u = vup(tt, 1.0)
    f = (-u[1], u[0])
    pel = (0.0, 0.0)
    sh = add(pel, u, T)
    th = tt + p["ha"]
    hu = vup(th, 1.0)
    nk = add(sh, u, 1.2)

    def arm(a, side):
        root = add(add(sh, f, 1.6 * side * ch["arm_off"]), u, -2.4)
        el = add(root, vec(a[0] - rot, UA))
        wr = add(el, vec(a[1] - rot, FA))
        fist = add(wr, vec(a[1] - rot, 4.6))
        return dict(root=root, el=el, wr=wr, fist=fist)

    def leg(l, side):
        hip = add(pel, f, 1.9 * side)
        kn = add(hip, vec(l[0] - rot, L1))
        an = add(kn, vec(l[1] - rot, L2))
        heel = add(an, vec(l[2] - rot, -3.0))
        toe = add(an, vec(l[2] - rot, 9.5))
        return dict(hip=hip, kn=kn, an=an, heel=heel, toe=toe)

    hc = add(nk, hu, 18.0)
    return dict(u=u, f=f, pel=pel, sh=sh, hu=hu, nk=nk, hc=hc, tt=tt, th=th,
                na=arm(p["na"], 1), fa=arm(p["fa"], -1), nl=leg(p["nl"], 1), fl=leg(p["fl"], -1))


def all_points(g):
    pts = [(g["hc"][0] + dx, g["hc"][1] + dy) for dx, dy in ((-24, -26), (24, -26), (24, 22), (-24, 22))]
    for k in ("na", "fa"):
        for n in ("el", "wr", "fist"):
            pts.append(g[k][n])
        pts += [(g[k]["fist"][0] + 6, g[k]["fist"][1] + 6), (g[k]["fist"][0] - 6, g[k]["fist"][1] - 6)]
    for k in ("nl", "fl"):
        for n in ("kn", "an", "heel", "toe"):
            pts.append(g[k][n])
        pts += [(g[k]["toe"][0], g[k]["toe"][1] + 4.0), (g[k]["heel"][0], g[k]["heel"][1] + 4.0)]
    pts += [g["pel"], g["sh"], (g["pel"][0], g["pel"][1] + 8)]
    return pts


def place(p, g):
    pts = all_points(g)
    xs = [q[0] for q in pts]
    ys = [q[1] for q in pts]
    minx, maxx, miny, maxy = min(xs), max(xs), min(ys), max(ys)
    a = p["anchor"]
    if a == "floor":
        return OX + p["dx"], OY - maxy
    if a == "center":
        return OX - (minx + maxx) / 2, 70 - (miny + maxy) / 2
    if a == "floorc":
        return OX - (minx + maxx) / 2, OY - maxy
    raise ValueError(a)


# ------------------------------------------------------------------ pen
class Pen:
    def __init__(self, sx, sy):
        self.sx, self.sy = sx, sy

    def pt(self, q):
        return ((q[0] + self.sx) * D, (q[1] + self.sy) * D)

    def caps(self, segs):
        m = Mask(W, H)
        for a, b, w0, w1 in segs:
            m.capsule(self.pt(a), self.pt(b), w0 * D, w1 * D)
        return m

    def poly(self, pts):
        return Mask(W, H).poly([self.pt(q) for q in pts])

    def smooth(self, pts, n=6):
        return Mask(W, H).poly([self.pt(q) for q in spline(pts, n)])

    def circ(self, c, r):
        return Mask(W, H).circle(self.pt(c), r * D)

    def ell(self, c, rx, ry, ang=0.0):
        return Mask(W, H).ellipse(self.pt(c), rx * D, ry * D, ang)

    def line(self, a, b, w):
        return Mask(W, H).line(self.pt(a), self.pt(b), w * D)

    def curve(self, p0, p1, p2, w):
        return Mask(W, H).curve(self.pt(p0), self.pt(p1), self.pt(p2), w * D)


def unit(a, b):
    dx, dy = b[0] - a[0], b[1] - a[1]
    n = math.hypot(dx, dy) or 1.0
    return (dx / n, dy / n)


def perp(v):
    return (-v[1], v[0])


def band(pen, a, b, w):
    """Flat band across a limb: from a to b, full width w (perpendicular to the a->b axis)."""
    ux, uy = unit(a, b)
    nx, ny = -uy * w / 2, ux * w / 2
    return pen.poly([(a[0] + nx, a[1] + ny), (b[0] + nx, b[1] + ny), (b[0] - nx, b[1] - ny), (a[0] - nx, a[1] - ny)])


def across(pen, c, axis, w, thick):
    """Thin band centred at c, perpendicular to axis, width w, thickness thick (along axis)."""
    ux, uy = axis
    nx, ny = -uy, ux
    a = (c[0] - ux * thick / 2, c[1] - uy * thick / 2)
    b = (c[0] + ux * thick / 2, c[1] + uy * thick / 2)
    return pen.poly([(a[0] + nx * w / 2, a[1] + ny * w / 2), (b[0] + nx * w / 2, b[1] + ny * w / 2),
                     (b[0] - nx * w / 2, b[1] - ny * w / 2), (a[0] - nx * w / 2, a[1] - ny * w / 2)])


def emit(cv, mask, color, details=None, dark=0.42, light=0.26, ow=0.5, outline=OUT):
    p = Part(mask, color, pad=int(ow * D) + 4)
    if details:
        details(p)
    p.shade(D * 0.46, dark=dark, light=light)
    cv.part(p, outline=outline, ow=ow * D)
    return p


def sub(a, b, k=1.0):
    return (a[0] - b[0] * k, a[1] - b[1] * k)


# ------------------------------------------------------------------ costumes
class Costume:
    name = "base"
    skin = (176, 104, 62)
    arm_off = 1.0
    # torso proportions: shoulder half-width, waist half-width, belly bulge
    sw, ww, belly = 8.2, 7.2, 0.0

    def torso_poly(self, g, front):
        sh, pel, u, f = g["sh"], g["pel"], g["u"], g["f"]
        sw = self.sw * (0.92 if front else 1.0)
        ww = self.ww * (0.95 if front else 1.0)
        bel = 0.0 if front else self.belly
        wf = (sw * 0.55) if not front else sw
        wb = (sw * 0.9) if not front else sw
        A = add(sh, f, wf)
        B = add(sh, f, -wb)
        C1 = add(add(sh, u, -5.5), f, wf + 0.8 + bel * 0.25)
        D1 = add(add(pel, u, 6.0), f, ww * 0.62 + bel)
        E1 = add(add(pel, u, -1.0), f, ww * 0.62 + bel * 0.5)
        F1 = add(add(pel, u, -1.0), f, -ww)
        G1 = add(add(pel, u, 6.0), f, -ww + 0.3)
        H1 = add(add(sh, u, -5.5), f, -wb - 0.5)
        return [B, add(add(sh, u, 1.4), f, 0), A, C1, D1, E1, F1, G1, H1]

    def neck(self, g):
        return add(g["sh"], g["u"], 2.4), add(g["nk"], g["hu"], 3.0)

    def arm(self, cv, pen, A, g):
        raise NotImplementedError

    def leg(self, cv, pen, L, g):
        raise NotImplementedError

    def torso(self, cv, pen, g, p):
        raise NotImplementedError

    # shared pieces -------------------------------------------------------------
    def skin_arm(self, cv, pen, A, w0=7.2, w1=6.2, hair=None):
        m = pen.caps([(A["root"], A["el"], w0, w0 - 0.4), (A["el"], A["wr"], w0 - 0.5, w1)])

        def det(pt):
            pt.paint(pen.caps([(lerp(A["root"], A["el"], .25), lerp(A["el"], A["wr"], .5), 2.0, 2.0)]), lighten(self.skin, 0.12), 0.35)
            if hair:
                hm = Mask(W, H)
                rng = np.random.RandomState(4)
                for i in range(22):
                    t = rng.uniform(0.35, 0.95)
                    c = lerp(A["el"], A["wr"], t)
                    ang = rng.uniform(-0.6, 0.6)
                    hm.line(pen.pt(c), pen.pt((c[0] + math.sin(ang) * 1.3, c[1] + math.cos(ang) * 1.6)), 0.34 * D)
                pt.paint(hm, hair, 0.8)
        emit(cv, m, self.skin, det, ow=0.5)

    def fist(self, cv, pen, A, glove=None):
        d = unit(A["wr"], A["fist"])
        if glove is None:
            fm = pen.circ(A["fist"], 4.6)

            def det(pt):
                pt.paint(pen.circ(add(A["fist"], d, 2.0), 1.7), lighten(self.skin, 0.2), 0.45)
                for k in (-1.4, 0, 1.4):
                    c = add(add(A["fist"], d, 3.1), perp(d), k)
                    pt.paint(pen.line(c, add(c, d, 1.3), 0.35), darken(self.skin, 0.5), 0.55)
            emit(cv, fm, self.skin, det, ow=0.5)
        else:
            fm = pen.circ(A["fist"], 4.5)

            def det(pt):
                pt.paint(pen.circ(add(A["fist"], d, 3.0), 2.2), self.skin, 1.0)
                pt.paint(pen.circ(add(add(A["fist"], d, -0.4), (-1.0, -1.3)), 1.9), lighten(glove, 0.16), 0.9)
                for k in (-1.5, 0, 1.5):
                    c = add(add(A["fist"], d, 2.0), perp(d), k)
                    pt.paint(pen.line(c, add(c, d, 2.0), 0.3), darken(glove, 0.55), 0.8)
            emit(cv, fm, glove, det, ow=0.5)


class LouCostume(Costume):
    name = "lou"
    skin = (176, 104, 62)
    JERSEY = (34, 30, 36)
    RED = (212, 32, 38)
    sw, ww, belly = 9.4, 8.4, 0.0

    def arm(self, cv, pen, A, g):
        self.skin_arm(cv, pen, A, 6.6, 5.8)
        # short sleeve: black with a red cuff and red top stripe
        s_end = lerp(A["root"], A["el"], 0.56)
        sm = pen.caps([(A["root"], s_end, 9.0, 8.4)])

        def sdet(pt):
            pt.paint(band(pen, lerp(A["root"], s_end, 0.72), s_end, 10.6), self.RED, 1.0)
            pt.paint(band(pen, lerp(A["root"], s_end, 0.60), lerp(A["root"], s_end, 0.67), 10.6), (20, 18, 22), 0.9)
            pt.paint(pen.line(add(A["root"], (0, -3.4)), add(s_end, (0, -3.2)), 0.8), self.RED, 0.9)
        emit(cv, sm, self.JERSEY, sdet, ow=0.5)
        # black + red wristband
        w0, w1 = lerp(A["el"], A["wr"], 0.26), lerp(A["el"], A["wr"], 0.62)
        wm = pen.caps([(w0, A["wr"], 7.6, 7.2)])

        def wdet(pt):
            pt.paint(band(pen, w1, A["wr"], 8.0), self.RED, 1.0)
            pt.paint(band(pen, lerp(w0, w1, 0.5), w1, 8.0), (28, 26, 30), 1.0)
            pt.paint(pen.line(add(w1, (0, -2.4)), add(A["wr"], (0, -2.3)), 0.7), lighten(self.RED, 0.4), 0.8)
        emit(cv, wm, (28, 26, 30), wdet, ow=0.5)
        self.fist(cv, pen, A, glove=(30, 28, 34))

    def leg(self, cv, pen, L, g):
        sock0 = lerp(L["kn"], L["an"], 0.30)
        skin = pen.caps([(L["hip"], L["kn"], 8.2, 7.6), (L["kn"], sock0, 7.4, 7.0)])
        emit(cv, skin, self.skin, lambda pt: pt.paint(pen.circ(add(L["kn"], (-1.2, -1.4)), 1.7), lighten(self.skin, 0.2), 0.5), ow=0.5)
        # hooped sock
        sm = pen.caps([(sock0, L["an"], 7.6, 6.4)])

        def sdet(pt):
            n = 6
            for i in range(n):
                a_, b_ = lerp(sock0, L["an"], i / n), lerp(sock0, L["an"], (i + 1) / n)
                pt.paint(band(pen, a_, b_, 9.0), self.RED if i % 2 == 0 else (28, 26, 32), 1.0)
        emit(cv, sm, self.RED, sdet, ow=0.5)
        # shorts leg
        em = pen.caps([(add(L["hip"], g["u"], 1.6), lerp(L["hip"], L["kn"], 0.5), 10.4, 9.6)])

        def shdet(pt):
            pt.paint(pen.line(lerp(L["hip"], L["kn"], 0.5), add(lerp(L["hip"], L["kn"], 0.5), perp(unit(L["hip"], L["kn"])), 5.0), 0.7), (70, 66, 80), 0.6)
        emit(cv, em, (30, 28, 34), shdet, dark=0.35, light=0.3, ow=0.5)
        # boot: red upper, black sole + laces, studs
        d = unit(L["heel"], L["toe"])
        bm = pen.caps([(L["heel"], L["toe"], 6.6, 5.6), (L["an"], lerp(L["heel"], L["toe"], 0.3), 6.2, 6.2)])

        def bdet(pt):
            pt.paint(pen.line(add(L["heel"], (0, 2.6)), add(L["toe"], (0, 2.4)), 1.7), (28, 26, 30), 1.0)
            pt.paint(pen.line(lerp(L["heel"], L["toe"], 0.4), add(lerp(L["heel"], L["toe"], 0.4), (0, -2.4)), 0.4), (240, 240, 240), 0.9)
            pt.paint(pen.line(lerp(L["heel"], L["toe"], 0.55), add(lerp(L["heel"], L["toe"], 0.55), (0, -2.4)), 0.4), (240, 240, 240), 0.9)
            pt.paint(pen.line(add(L["an"], (0, -0.6)), add(L["toe"], (-2.8, -1.9)), 0.8), (255, 120, 110), 0.6)
            for t in (0.2, 0.5, 0.8):
                pt.paint(pen.circ(add(lerp(L["heel"], L["toe"], t), (0, 3.4)), 0.6), (170, 170, 180), 0.9)
        emit(cv, bm, (210, 40, 40), bdet, ow=0.5)

    def torso(self, cv, pen, g, p):
        front = p["front"]
        poly = self.torso_poly(g, front)
        shorts = pen.ell(add(g["pel"], g["u"], 1.2), 9.6, 6.2)
        emit(cv, shorts, (30, 28, 34), None, dark=0.35, light=0.3, ow=0.5)
        # neck
        n0, n1 = self.neck(g)
        emit(cv, pen.caps([(n0, n1, 5.6, 5.4)]), darken(self.skin, 0.12), None, dark=0.5, light=0.0, ow=0.45)
        tm = pen.smooth(poly, 5)
        u, f, sh, pel = g["u"], g["f"], g["sh"], g["pel"]

        def det(pt):
            # red side panels like the reference kit + red pinstripes
            for k in (3.4, 5.6):
                pass
            fm = shifted(tm.a, f[0] * 1.8 * D, f[1] * 1.8 * D)
            fm2 = shifted(tm.a, f[0] * 4.0 * D, f[1] * 4.0 * D)
            pt.paint(np.clip(fm - fm2, 0, 1), self.RED, 0.95)
            bm = shifted(tm.a, -f[0] * 1.8 * D, -f[1] * 1.8 * D)
            bm2 = shifted(tm.a, -f[0] * 4.0 * D, -f[1] * 4.0 * D)
            pt.paint(np.clip(bm - bm2, 0, 1), self.RED, 0.9)
            for k in (-0.5, 0.1, 0.7):
                pt.paint(pen.line(add(add(sh, f, 6 * k), u, -8), add(add(pel, f, 5 * k - 1), u, 3), 0.55), (86, 22, 30), 0.85)
            # jersey sheen
            pt.paint(pen.line(add(add(sh, f, -1), u, -4), add(add(pel, f, -2), u, 4), 2.2), (58, 54, 64), 0.5)
            # V collar
            vtop = add(sh, u, -5.8)
            pt.paint(pen.line(add(sh, f, -3.4), vtop, 1.4), self.RED, 1.0)
            pt.paint(pen.line(add(sh, f, 4.2), vtop, 1.4), self.RED, 1.0)
            # hem trim
            pt.paint(pen.line(add(add(pel, u, 1.2), f, -6), add(add(pel, u, 1.2), f, 6), 0.9), self.RED, 0.8)
            # crest: white shield with blue/red quarters + ball, star above it
            cc = add(add(sh, u, -10.0), f, 1.6 if not front else 0.0)
            sh_m = pen.poly([add(add(cc, f, -3.4), u, 3.0), add(add(cc, f, 3.4), u, 3.0), add(add(cc, f, 3.0), u, -1.6),
                             add(cc, u, -4.6), add(add(cc, f, -3.0), u, -1.6)])
            pt.paint(sh_m, (244, 242, 236), 1.0)
            pt.paint(pen.poly([add(add(cc, f, -2.8), u, 2.6), add(cc, u, 2.6), add(cc, u, 0.0), add(add(cc, f, -2.8), u, 0.0)]), (52, 84, 188), 1.0)
            pt.paint(pen.poly([add(cc, u, 2.6), add(add(cc, f, 2.8), u, 2.6), add(add(cc, f, 2.8), u, 0.0), add(cc, u, 0.0)]), self.RED, 1.0)
            pt.paint(pen.circ(add(cc, u, -1.4), 1.9), (250, 250, 250), 1.0)
            pt.paint(pen.circ(add(cc, u, -1.4), 0.8), (36, 34, 40), 1.0)
            pt.paint(pen.circ(add(add(sh, u, -5.4), f, 0.2 if front else 1.8), 0.7), (255, 244, 200), 1.0)
            # small gold "L" badge on the other breast
            gb = add(add(sh, u, -9.6), f, -3.4 if not front else -5.2)
            pt.paint(pen.poly([add(add(gb, f, -1.7), u, 1.8), add(add(gb, f, 1.7), u, 1.8), add(gb, u, -2.2)]), (236, 178, 40), 1.0)
            pt.paint(pen.line(add(add(gb, f, -0.7), u, 1.0), add(add(gb, f, -0.7), u, -0.6), 0.45), self.RED, 1.0)
        emit(cv, tm, self.JERSEY, det, dark=0.4, light=0.22, ow=0.5)


class GanniCostume(Costume):
    name = "ganni"
    skin = (216, 156, 114)
    sw, ww, belly = 10.8, 10.2, 2.6
    APRON = (200, 44, 52)
    SINGLET = (240, 238, 232)
    PANTS = (48, 62, 108)

    def flour(self, pt, density=0.012, seed=2):
        rng = np.random.RandomState(seed)
        noise = (rng.rand(pt.h, pt.w) > (1 - density)).astype(np.float32)
        noise = cv2.GaussianBlur(noise, (0, 0), D * 0.12)
        pt.col = pt.col * (1 - np.clip(noise * 5, 0, 0.8)[..., None] * pt.m[..., None]) + 255 * np.clip(noise * 5, 0, 0.8)[..., None] * pt.m[..., None]

    def arm(self, cv, pen, A, g):
        self.skin_arm(cv, pen, A, 8.0, 6.8, hair=(70, 56, 52))
        # gold watch
        wr = lerp(A["el"], A["wr"], 0.78)
        wm = pen.caps([(lerp(A["el"], A["wr"], 0.66), wr, 7.8, 7.6)])
        emit(cv, wm, (226, 178, 60), lambda pt: pt.paint(pen.circ(add(wr, (0, -1.8)), 1.7), (250, 240, 200), 1.0), ow=0.45)
        self.fist(cv, pen, A)

    def leg(self, cv, pen, L, g):
        kn = L["kn"]
        pm = pen.caps([(L["hip"], kn, 10.4, 9.2), (kn, L["an"], 8.8, 7.4)])

        def pdet(pt):
            pt.paint(pen.line(lerp(L["hip"], kn, 0.15), lerp(kn, L["an"], 0.85), 0.55), (36, 46, 84), 0.8)
            pt.paint(pen.ell(add(kn, (-1.0, 1.0)), 2.0, 2.4), lighten(self.PANTS, 0.2), 0.45)
            self.flour(pt, 0.0025, 5)
        emit(cv, pm, self.PANTS, pdet, ow=0.5)
        # cuff + sturdy work shoe
        d = unit(L["heel"], L["toe"])
        bm = pen.caps([(L["heel"], L["toe"], 7.2, 5.8), (L["an"], lerp(L["heel"], L["toe"], 0.3), 7.0, 7.0)])

        def bdet(pt):
            pt.paint(pen.line(add(L["heel"], (0, 2.9)), add(L["toe"], (0, 2.6)), 1.8), (238, 236, 230), 1.0)
            pt.paint(pen.line(add(L["an"], (-1, -0.6)), add(L["toe"], (-3.0, -1.6)), 0.55), (200, 170, 130), 0.8)
            pt.paint(pen.ell(lerp(L["heel"], L["toe"], 0.78), 1.4, 1.0), lighten((54, 40, 36), 0.35), 0.5)
        emit(cv, bm, (54, 40, 36), bdet, ow=0.5)

    def torso(self, cv, pen, g, p):
        front = p["front"]
        u, f, sh, pel = g["u"], g["f"], g["sh"], g["pel"]
        # belt line / hips in trousers
        emit(cv, pen.ell(add(pel, u, 1.0), 11.0, 6.4), self.PANTS, None, ow=0.5)
        n0, n1 = self.neck(g)
        emit(cv, pen.caps([(n0, n1, 7.0, 6.6)]), darken(self.skin, 0.14), None, dark=0.5, light=0.0, ow=0.45)
        tm = pen.smooth(self.torso_poly(g, front), 5)

        def det(pt):
            # singlet neckline
            pt.paint(pen.curve(add(sh, f, -4.0), add(add(sh, u, -7.0), f, 0), add(sh, f, 4.4), 1.2), (190, 188, 184), 0.9)
            # apron: red with white stripes, pocket, bib
            bib = pen.poly([add(add(sh, u, -5.4), f, -5.2), add(add(sh, u, -5.4), f, 5.8), add(add(pel, u, -1.5), f, 9.8), add(add(pel, u, -1.5), f, -9.6)])
            pt.paint(bib, self.APRON, 1.0)
            for k in (-0.8, -0.2, 0.4, 1.0):
                pt.paint(pen.line(add(add(sh, u, -6.5), f, 5 * k), add(add(pel, u, -1.5), f, 8.4 * k), 0.6), (250, 244, 236), 0.7)
            pt.paint(pen.poly([add(add(pel, u, 9.6), f, -3.0), add(add(pel, u, 9.6), f, 3.6), add(add(pel, u, 3.2), f, 3.6), add(add(pel, u, 3.2), f, -3.0)]), (160, 28, 36), 0.9)
            pt.paint(pen.line(add(add(pel, u, 9.6), f, -3.0), add(add(pel, u, 9.6), f, 3.6), 0.6), (250, 244, 236), 0.9)
            # waist tie
            pt.paint(pen.line(add(add(pel, u, 4.6), f, -9.6), add(add(pel, u, 4.6), f, 9.8), 1.1), (250, 244, 236), 0.9)
            # gold chain + Maltese cross
            pt.paint(pen.curve(add(sh, f, -4.4), add(add(sh, u, -9), f, 0.6), add(sh, f, 4.8), 0.55), (236, 190, 70), 0.95)
            cc = add(add(sh, u, -8.2), f, 0.5)
            for a_ in (0, 90, 180, 270):
                a_r = math.radians(a_)
                pt.paint(pen.line(cc, add(cc, (math.cos(a_r), math.sin(a_r)), 1.5), 0.9), (246, 206, 80), 1.0)
            # flour handprints
            self.flour(pt, 0.006, 9)
            pt.paint(blur(pen.ell(add(add(sh, u, -12), f, 3), 3.0, 2.2, 20).a, D * 0.5), (255, 255, 255), 0.55)
        emit(cv, tm, self.SINGLET, det, dark=0.38, light=0.22, ow=0.5)


class KarmenuCostume(Costume):
    name = "karmenu"
    skin = (198, 142, 100)
    sw, ww, belly = 9.6, 8.8, 0.9
    SHIRT = (238, 176, 48)
    PANTS = (76, 80, 96)

    def arm(self, cv, pen, A, g):
        self.skin_arm(cv, pen, A, 7.0, 6.0, hair=(214, 214, 224))
        s_end = lerp(A["root"], A["el"], 0.5)
        sm = pen.caps([(A["root"], s_end, 9.2, 8.6)])

        def sdet(pt):
            pt.paint(band(pen, lerp(A["root"], s_end, 0.78), s_end, 10.8), darken(self.SHIRT, 0.12), 1.0)
            pt.paint(pen.line(lerp(A["root"], s_end, 0.78), add(lerp(A["root"], s_end, 0.78), perp(unit(A["root"], s_end)), 5), 0.4), (140, 90, 20), 0.7)
            # epaulette
            pt.paint(pen.ell(add(A["root"], (0, -3.2)), 3.2, 1.6), (150, 70, 20), 0.95)
        emit(cv, sm, self.SHIRT, sdet, ow=0.5)
        wr = lerp(A["el"], A["wr"], 0.8)
        emit(cv, pen.caps([(lerp(A["el"], A["wr"], 0.72), wr, 6.4, 6.3)]), (226, 178, 60), None, ow=0.4)
        self.fist(cv, pen, A)

    def leg(self, cv, pen, L, g):
        kn = L["kn"]
        pm = pen.caps([(L["hip"], kn, 9.8, 8.8), (kn, lerp(kn, L["an"], 0.85), 8.4, 7.2)])

        def pdet(pt):
            pt.paint(pen.line(lerp(L["hip"], kn, 0.1), lerp(kn, L["an"], 0.8), 0.5), (52, 56, 70), 0.9)
            pt.paint(pen.ell(add(kn, (-1.0, 1.0)), 2.0, 2.6), lighten(self.PANTS, 0.22), 0.45)
        emit(cv, pm, self.PANTS, pdet, ow=0.5)
        sk = pen.caps([(lerp(kn, L["an"], 0.8), L["an"], 7.0, 6.2)])
        emit(cv, sk, (244, 244, 244), None, ow=0.45)
        bm = pen.caps([(L["heel"], L["toe"], 6.8, 5.4), (L["an"], lerp(L["heel"], L["toe"], 0.3), 6.4, 6.4)])

        def bdet(pt):
            pt.paint(pen.line(add(L["heel"], (0, 2.7)), add(L["toe"], (0, 2.5)), 1.5), (30, 26, 30), 1.0)
            pt.paint(pen.ell(lerp(L["heel"], L["toe"], 0.74), 1.7, 1.0), (140, 98, 64), 0.7)
        emit(cv, bm, (92, 60, 40), bdet, ow=0.5)

    def torso(self, cv, pen, g, p):
        front = p["front"]
        u, f, sh, pel = g["u"], g["f"], g["sh"], g["pel"]
        emit(cv, pen.ell(add(pel, u, 1.0), 9.8, 6.2), self.PANTS, None, ow=0.5)
        n0, n1 = self.neck(g)
        emit(cv, pen.caps([(n0, n1, 6.0, 5.8)]), darken(self.skin, 0.14), None, dark=0.5, light=0.0, ow=0.45)
        tm = pen.smooth(self.torso_poly(g, front), 5)

        def det(pt):
            # collar + placket + button line
            pt.paint(pen.poly([add(add(sh, u, 1.2), f, -4.6), add(add(sh, u, -3.6), f, -1.0), add(add(sh, u, 1.2), f, 0.4)]), darken(self.SHIRT, 0.16), 1.0)
            pt.paint(pen.poly([add(add(sh, u, 1.2), f, 0.4), add(add(sh, u, -3.6), f, -1.0), add(add(sh, u, 1.2), f, 5.2)]), darken(self.SHIRT, 0.1), 1.0)
            pt.paint(pen.line(add(add(sh, u, -3.4), f, -0.9), add(add(pel, u, 4), f, -0.4), 0.45), (150, 100, 24), 0.8)
            for t in (0.25, 0.5, 0.75):
                pt.paint(pen.circ(lerp(add(add(sh, u, -3.4), f, -0.9), add(add(pel, u, 4), f, -0.4), t), 0.5), (255, 240, 200), 0.95)
            # breast pocket with pens, name badge
            pk = add(add(sh, u, -9.5), f, 3.4)
            pt.paint(pen.poly([add(add(pk, f, -2.6), u, 2.6), add(add(pk, f, 2.6), u, 2.6), add(add(pk, f, 2.6), u, -2.4), add(add(pk, f, -2.6), u, -2.4)]), darken(self.SHIRT, 0.14), 1.0)
            pt.paint(pen.line(add(pk, f, -1.2), add(add(pk, f, -1.2), u, 4.4), 0.5), (30, 60, 150), 0.95)
            pt.paint(pen.line(add(pk, f, 0.2), add(add(pk, f, 0.2), u, 4.0), 0.5), (180, 30, 36), 0.95)
            # ticket-machine strap across the chest (brown leather + brass buckle)
            s0 = add(add(sh, u, 0.2), f, -4.8)
            s1 = add(add(pel, u, 4.4), f, 5.2)
            pt.paint(pen.line(s0, s1, 2.2), (96, 58, 32), 1.0)
            pt.paint(pen.line(add(s0, f, 0.2), add(s1, f, 0.2), 0.4), (150, 100, 64), 0.7)
            mid = lerp(s0, s1, 0.45)
            pt.paint(pen.poly([add(add(mid, f, -1.5), u, 1.5), add(add(mid, f, 1.5), u, 1.5), add(add(mid, f, 1.5), u, -1.5), add(add(mid, f, -1.5), u, -1.5)]), (232, 186, 70), 1.0)
            # belt with Maltese-cross buckle
            by = add(pel, u, 3.2)
            pt.paint(pen.line(add(by, f, -8.4), add(by, f, 8.6), 2.0), (34, 28, 30), 1.0)
            bk = add(by, f, 1.6)
            pt.paint(pen.circ(bk, 1.9), (236, 188, 70), 1.0)
            for a_ in (0, 90, 180, 270):
                a_r = math.radians(a_)
                pt.paint(pen.line(bk, add(bk, (math.cos(a_r), math.sin(a_r)), 1.5), 0.7), (180, 30, 36), 1.0)
        emit(cv, tm, self.SHIRT, det, dark=0.4, light=0.22, ow=0.5)


COSTUMES = {"lou": LouCostume, "ganni": GanniCostume, "karmenu": KarmenuCostume}


# ------------------------------------------------------------------ frame rendering
def draw_head(cv, pen, g, p, name):
    img = heads.head(name, p["eyes"], p["mouth"], p["brow"])         # straight RGBA float, 300x345
    hs = HS * D
    th = rad(g["th"])
    c, s = math.cos(th), math.sin(th)
    R = np.array([[c, -s], [s, c]], np.float32) * hs
    anchor_px = np.array(pen.pt(g["nk"]), np.float32)
    t = anchor_px - R @ np.array(HEAD_ANCHOR, np.float32)
    M_ = np.concatenate([R, t[:, None]], axis=1).astype(np.float32)
    pm = img.copy()
    pm[..., :3] *= pm[..., 3:4] / 255.0                              # premultiply before resampling
    warped = cv2.warpAffine(pm, M_, (W, H), flags=cv2.INTER_AREA if hs < 1 else cv2.INTER_LINEAR,
                            borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))
    a = np.clip(warped[..., 3:4] / 255.0, 0, 1)
    reg = cv.pm
    reg[..., :3] = warped[..., :3] + reg[..., :3] * (1 - a)
    reg[..., 3:4] = a + reg[..., 3:4] * (1 - a)


def render(p, name):
    costume = COSTUMES[name]()
    ch = dict(arm_off=costume.arm_off)
    g = layout(p, ch)
    sx, sy = place(p, g)
    pen = Pen(sx, sy)
    cv = Canvas(W, H)
    costume.arm(cv, pen, g["fa"], g)
    costume.leg(cv, pen, g["fl"], g)
    costume.torso(cv, pen, g, p)
    costume.leg(cv, pen, g["nl"], g)
    draw_head(cv, pen, g, p, name)
    costume.arm(cv, pen, g["na"], g)
    img = cv.to_pil()
    # premultiplied-safe downscale
    arr = cv.pm.copy()
    small = cv2.resize(arr, (CW * RS, CH * RS), interpolation=cv2.INTER_AREA)
    a = small[..., 3:4]
    rgbv = np.where(a > 1e-4, small[..., :3] / np.maximum(a, 1e-4), 0)
    out = np.concatenate([np.clip(rgbv, 0, 255), np.clip(a * 255, 0, 255)], axis=2).astype(np.uint8)

    def rel(q):
        return ((q[0] + sx - OX), (q[1] + sy - OY))
    metrics = dict(fist=rel(g["na"]["fist"]), toe=rel(g["nl"]["toe"]), ffist=rel(g["fa"]["fist"]), ftoe=rel(g["fl"]["toe"]))
    return Image.fromarray(out, "RGBA"), metrics


def build(name, only=None):
    P_ = poses()
    keys = [k for k in KEYS if (only is None or k in only)]
    rows = (len(KEYS) + COLS - 1) // COLS
    sheet = Image.new("RGBA", (COLS * CW * RS, rows * CH * RS), (0, 0, 0, 0))
    table = {}
    for i, key in enumerate(KEYS):
        cx, cy = (i % COLS) * CW, (i // COLS) * CH
        hit = None
        if only is not None and key not in only:
            table[key] = dict(rect=[cx * RS, cy * RS, CW * RS, CH * RS], origin=[OX * RS, OY * RS], hit=None)
            continue
        cell, m = render(P_[key], name)
        sheet.paste(cell, (cx * RS, cy * RS))
        if key in HIT_FRAMES:
            kind, kb = HIT_FRAMES[key]
            tx, ty = m["fist"] if kind == "hand" else m["toe"]
            h = 16 if kind == "hand" else 20
            x1 = tx + 4
            x0 = max(6, x1 - (kb[2] if kb[2] < 60 else 56))
            if x1 - x0 < 24:
                x0 = x1 - 24
            hit = [int(round(x0)), int(round(ty - h / 2)), int(round(x1 - x0)), h]
        table[key] = dict(rect=[cx * RS, cy * RS, CW * RS, CH * RS], origin=[OX * RS, OY * RS], hit=hit)
        if (i + 1) % 10 == 0:
            print("  %s %d/%d" % (name, i + 1, len(KEYS)), flush=True)
    return sheet, table


def write_outputs(name, sheet, table):
    img_dir = os.path.join(ROOT, "public", "images")
    os.makedirs(img_dir, exist_ok=True)
    sheet.save(os.path.join(img_dir, name + ".png"), optimize=True)
    js_dir = os.path.join(ROOT, "src", "entitites", "fighters", "sheets")
    os.makedirs(js_dir, exist_ok=True)
    out = ["// AUTO-GENERATED by tools/make_fighters.py - do not edit by hand.",
           "// rect/origin are in sheet pixels (RS sheet px per game px); hit is a game-pixel attack box relative to the pivot.",
           "export const %sSheet = {" % name.capitalize(),
           " scale: %d," % RS,
           " frames: " + json.dumps(table, indent=1) + ",", "};", ""]
    open(os.path.join(js_dir, name + ".js"), "w").write("\n".join(out))


def portrait(name):
    h = heads.head(name, "angry" if name != "karmenu" else "open", "closed" if name != "ganni" else "closed", 1)
    img = Image.fromarray(np.clip(h, 0, 255).astype(np.uint8), "RGBA")
    # square-ish crop around the face, 240x240
    w, hh = img.size
    box = Image.new("RGBA", (330, 330), (0, 0, 0, 0))
    box.paste(img, (15, 0), img)
    box = box.resize((240, 240), Image.LANCZOS)
    box.save(os.path.join(ROOT, "public", "images", name + "_portrait.png"), optimize=True)


def main():
    names = [a for a in sys.argv[1:] if a in COSTUMES] or list(COSTUMES)
    only = None
    for a in sys.argv[1:]:
        if a.startswith("--frames="):
            only = set(a.split("=", 1)[1].split(","))
    for name in names:
        print("building", name, flush=True)
        sheet, table = build(name, only)
        if only is None:
            write_outputs(name, sheet, table)
            portrait(name)
        else:
            sheet.save("/tmp/%s_partial.png" % name)
    print("done")


if __name__ == "__main__":
    main()
