#!/usr/bin/env python3
"""
Procedural sprite-sheet generator for Lou (Maltese Fighter II).

Draws every frame Ken has (same frame keys => same animations / timings / boxes),
at Ken's scale, facing RIGHT, on a clean 128x112 grid (no labels, no stray pixels).

Outputs:
  public/images/Lou.png
  src/entitites/fighters/LouFrames.js   (rect / origin / hit-box for every frame key)

Run:  python3 tools/make_lou_sprites.py
"""
import math, json, os
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

S = 4                     # supersampling
CW, CH = 128, 112         # cell size
OX, OY = 64, 106          # origin (feet / pelvis x) inside a cell
COLS = 10

KEYS = ["idle-1","idle-2","idle-3","idle-4","forwards-1","forwards-2","forwards-3","forwards-4","forwards-5","forwards-6","backwards-1","backwards-2","backwards-3","backwards-4","backwards-5","backwards-6","jump-start/land","jump-up-1","jump-up-2","jump-up-3","jump-up-4","jump-up-5","jump-up-6","jump-roll-1","jump-roll-2","jump-roll-3","jump-roll-4","jump-roll-5","jump-roll-6","jump-roll-7","crouch-1","crouch-2","crouch-3","idle-turn-1","idle-turn-2","idle-turn-3","crouch-turn-1","crouch-turn-2","crouch-turn-3","light-punch-1","light-punch-2","med-punch-1","med-punch-2","med-punch-3","heavy-punch-1","light-kick-1","light-kick-2","med-kick-1","heavy-kick-1","heavy-kick-2","heavy-kick-3","heavy-kick-4","heavy-kick-5","hit-face-1","hit-face-2","hit-face-3","hit-face-4","hit-stomach-1","hit-stomach-2","hit-stomach-3","hit-stomach-4","stun-1","stun-2","stun-3","special-1","special-2","special-3","special-4","victory-1","victory-2","victory-3","victory-4","victory-5","fall-1","fall-2","fall-3","fall-4","fall-5"]

# frames that carry a hit box in Ken's table  -> (kind, ken box)
HIT_FRAMES = {
    "light-punch-2": ("hand", [11, -85, 50, 18]),
    "med-punch-3":   ("hand", [17, -85, 68, 14]),
    "heavy-punch-1": ("hand", [17, -85, 76, 14]),
    "light-kick-2":  ("foot", [-17, -98, 66, 28]),
    "med-kick-1":    ("foot", [-18, -98, 80, 28]),
    "heavy-kick-2":  ("foot", [15, -99, 40, 32]),
    "heavy-kick-3":  ("foot", [21, -97, 62, 24]),
}

# ---------------------------------------------------------------- palette
OUT   = (28, 12, 16, 255)
SKIN  = (178, 108, 64, 255)
SKIN_D= (134, 76, 44, 255)
HAIR  = (46, 28, 24, 255)
HAIR_L= (84, 56, 42, 255)
RED   = (214, 34, 38, 255)
RED_L = (244, 96, 84, 255)
RED_D = (140, 18, 26, 255)
BLACK = (36, 34, 44, 255)
BLACK_L=(66, 64, 80, 255)
WHITE = (244, 240, 232, 255)
AMBER = (206, 132, 44, 255)
BLUE  = (52, 84, 190, 255)

# ---------------------------------------------------------------- body dims
T  = 22      # torso
L1 = 17.5    # thigh
L2 = 17.5    # shin
UA = 15      # upper arm
FA = 14      # forearm
HR = 10.5    # head radius

def rad(a): return math.radians(a)
def vec(a, L):  return (math.sin(rad(a)) * L,  math.cos(rad(a)) * L)    # angle from DOWN toward +x
def vup(a, L):  return (math.sin(rad(a)) * L, -math.cos(rad(a)) * L)    # angle from UP toward +x
def add(a, b, k=1.0): return (a[0] + b[0] * k, a[1] + b[1] * k)
def lerp(a, b, t): return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)

BASE = dict(
    t=8, ha=0, dx=0, rot=0, anchor="floor",
    na=(35, 158), fa=(2, 150),                 # near / far arm: (upper, fore)
    nl=(26, -4, 90), fl=(-28, 6, 90),          # near / far leg: (thigh, shin, foot)
    eyes="open", mouth="closed", front=False, tails=18, brow=1,
)

def P(**kw):
    p = dict(BASE); p.update(kw); return p

# ---------------------------------------------------------------- layout
def layout(p):
    rot = p["rot"]
    tt = p["t"] + rot
    u = vup(tt, 1.0)
    f = (-u[1], u[0])
    pel = (0.0, 0.0)
    sh = add(pel, u, T)
    th = tt + p["ha"]
    hu = vup(th, 1.0); hf = (-hu[1], hu[0])
    hc = add(sh, hu, HR + 3)

    def arm(a, side):
        root = add(add(sh, f, 1.5 * side), u, -2.5)
        el = add(root, vec(a[0] - rot, UA))
        wr = add(el, vec(a[1] - rot, FA))
        fist = add(wr, vec(a[1] - rot, 5.0))
        return dict(root=root, el=el, wr=wr, fist=fist)

    def leg(l, side):
        hip = add(pel, f, 1.8 * side)
        kn = add(hip, vec(l[0] - rot, L1))
        an = add(kn, vec(l[1] - rot, L2))
        heel = add(an, vec(l[2] - rot, -3.0))
        toe = add(an, vec(l[2] - rot, 9.0))
        return dict(hip=hip, kn=kn, an=an, heel=heel, toe=toe)

    return dict(u=u, f=f, pel=pel, sh=sh, hu=hu, hf=hf, hc=hc, tt=tt,
                na=arm(p["na"], 1), fa=arm(p["fa"], -1),
                nl=leg(p["nl"], 1), fl=leg(p["fl"], -1))

def all_points(g):
    pts = [(g["hc"][0] + dx, g["hc"][1] + dy) for dx, dy in ((-16, -16), (16, -16), (-16, 16), (16, 16))]
    for k in ("na", "fa"):
        for n in ("el", "wr", "fist"): pts.append(g[k][n])
        pts += [(g[k]["fist"][0] + 6, g[k]["fist"][1] + 6), (g[k]["fist"][0] - 6, g[k]["fist"][1] - 6)]
    for k in ("nl", "fl"):
        for n in ("kn", "an", "heel", "toe"): pts.append(g[k][n])
        pts += [(g[k]["toe"][0], g[k]["toe"][1] + 3.5), (g[k]["heel"][0], g[k]["heel"][1] + 3.5)]
    pts += [g["pel"], g["sh"], (g["pel"][0], g["pel"][1] + 8)]
    return pts

def place(p, g):
    """Return (shift_x, shift_y) so the pose sits in the cell correctly."""
    pts = all_points(g)
    xs = [q[0] for q in pts]; ys = [q[1] for q in pts]
    minx, maxx, miny, maxy = min(xs), max(xs), min(ys), max(ys)
    a = p["anchor"]
    if a == "floor":
        return OX + p["dx"], OY - maxy
    if a == "center":                      # airborne tumbling: body centred around mid-height
        return OX - (minx + maxx) / 2, 66 - (miny + maxy) / 2
    if a == "floorc":                      # lying on the ground: centred horizontally
        return OX - (minx + maxx) / 2, OY - maxy
    raise ValueError(a)

# ---------------------------------------------------------------- drawing prims
class Pen:
    def __init__(self, d, sx, sy): self.d, self.sx, self.sy = d, sx, sy
    def pt(self, q): return ((q[0] + self.sx) * S, (q[1] + self.sy) * S)
    def circ(self, c, r, fill, ow=0.9, outline=OUT):
        x, y = self.pt(c)
        if ow: self.d.ellipse([x - (r + ow) * S, y - (r + ow) * S, x + (r + ow) * S, y + (r + ow) * S], fill=outline)
        self.d.ellipse([x - r * S, y - r * S, x + r * S, y + r * S], fill=fill)
    def ell(self, c, rx, ry, fill, ow=0.0, outline=OUT):
        x, y = self.pt(c)
        if ow: self.d.ellipse([x - (rx + ow) * S, y - (ry + ow) * S, x + (rx + ow) * S, y + (ry + ow) * S], fill=outline)
        self.d.ellipse([x - rx * S, y - ry * S, x + rx * S, y + ry * S], fill=fill)
    def seg(self, a, b, w, fill):
        A, B = self.pt(a), self.pt(b)
        self.d.line([A, B], fill=fill, width=max(1, int(round(w * S))))
        r = w * S / 2
        for c in (A, B): self.d.ellipse([c[0] - r, c[1] - r, c[0] + r, c[1] + r], fill=fill)
    def chain(self, parts, ow=0.9):
        for a, b, w, _ in parts: self.seg(a, b, w + 2 * ow, OUT)
        for a, b, w, c in parts: self.seg(a, b, w, c)
    def poly(self, pts, fill, ow=1.0):
        P_ = [self.pt(q) for q in pts]
        self.d.polygon(P_, fill=fill)
        if ow: self.d.line(P_ + [P_[0]], fill=OUT, width=int(ow * S), joint="curve")
    def line(self, a, b, w, fill): self.seg(a, b, w, fill)

# ---------------------------------------------------------------- body parts
def unit(a, b):
    dx, dy = b[0] - a[0], b[1] - a[1]
    n = math.hypot(dx, dy) or 1.0
    return (dx / n, dy / n)

def band(pen, a, b, w, fill):
    """flat-ended coloured band across a limb (for sock stripes)."""
    ux, uy = unit(a, b); nx, ny = -uy * w / 2, ux * w / 2
    pen.poly([(a[0] + nx, a[1] + ny), (b[0] + nx, b[1] + ny), (b[0] - nx, b[1] - ny), (a[0] - nx, a[1] - ny)], fill, ow=0)

def draw_arm(pen, A):
    pen.chain([(A["root"], A["el"], 7.4, SKIN), (A["el"], A["wr"], 6.6, SKIN)])
    # short jersey sleeve with red cuff
    s_end = lerp(A["root"], A["el"], 0.52)
    pen.seg(A["root"], s_end, 9.4, OUT); pen.seg(A["root"], s_end, 8.2, BLACK)
    pen.seg(lerp(A["root"], A["el"], 0.40), s_end, 8.4, OUT); pen.seg(lerp(A["root"], A["el"], 0.43), s_end, 7.4, RED)
    # wristband: black cuff + red band
    w0, w1, w2 = lerp(A["el"], A["wr"], 0.30), lerp(A["el"], A["wr"], 0.58), A["wr"]
    pen.seg(w0, w2, 8.4, OUT)
    pen.seg(w0, w1, 7.4, BLACK); pen.seg(w1, w2, 7.4, RED)
    pen.seg(add(w1, (0, -2.2)), add(w2, (0, -2.2)), 1.0, RED_L)
    # fingerless black glove, skin knuckles showing
    pen.circ(A["fist"], 5.6, BLACK, ow=0.9)
    d = unit(A["wr"], A["fist"])
    pen.circ(add(A["fist"], d, 3.3), 2.1, SKIN, ow=0)
    pen.circ(add(add(A["fist"], d, -0.5), (-1.3, -1.6)), 1.7, BLACK_L, ow=0)

def draw_leg(pen, L):
    # bare knee / thigh, shorts over the top, striped sock, red cleat
    pen.chain([(lerp(L["hip"], L["kn"], 0.3), L["kn"], 8.4, SKIN), (L["kn"], lerp(L["kn"], L["an"], 0.35), 7.4, SKIN)])
    pen.chain([(L["hip"], lerp(L["hip"], L["kn"], 0.52), 11.4, BLACK)])
    s0 = lerp(L["kn"], L["an"], 0.34)
    pen.seg(s0, L["an"], 8.4, OUT)
    n = 5
    for i in range(n):
        a_ = lerp(s0, L["an"], i / n); b_ = lerp(s0, L["an"], (i + 1) / n)
        band(pen, a_, b_, 7.2, RED if i % 2 == 0 else BLACK)
    pen.circ(add(L["kn"], (-1.4, -1.6)), 1.5, SKIN, ow=0)
    # cleat
    pen.seg(L["heel"], L["toe"], 7.6, OUT)
    pen.seg(L["heel"], L["toe"], 6.4, RED)
    pen.seg(add(L["heel"], (0, 2.7)), add(L["toe"], (0, 2.7)), 1.9, BLACK)
    pen.circ(lerp(L["heel"], L["toe"], 0.55), 0.9, BLACK, ow=0)
    pen.circ(lerp(L["heel"], L["toe"], 0.75), 0.9, BLACK, ow=0)

def draw_torso(pen, g, front):
    pel, sh, u, f = g["pel"], g["sh"], g["u"], g["f"]
    w = 6.8 if front else 9.6
    pen.circ(pel, 9.0, BLACK, ow=0.9)                                      # shorts
    B = add(sh, f, -w - 0.5); A = add(sh, f, w)
    A2 = add(add(sh, u, -8), f, w + 1.2)
    D2 = add(add(pel, u, 6), f, w - 1.0)
    D = add(pel, f, w - 1.0); C = add(pel, f, -w + 0.5)
    pen.poly([B, A, A2, D2, D, C], BLACK, ow=1.0)                          # jersey
    # red pin-stripes + red V collar + trim
    for k in (-0.35, 0.05, 0.45):
        pen.line(add(add(sh, f, w * k), u, -9), add(add(pel, f, w * k), u, 4), 1.3, RED)
    vtop = add(sh, u, -6.5)
    pen.line(add(sh, f, w * 0.75), vtop, 1.8, RED)
    pen.line(add(sh, f, -w * 0.55), vtop, 1.8, RED)
    pen.line(add(A2, u, 0), D2, 1.4, RED)
    # club crest with a little ball
    ctr = add(add(sh, u, -11), f, 1.8 if not front else 0)
    pen.circ(ctr, 3.9, WHITE, ow=0.7)
    pen.circ(add(ctr, u, 1.6), 1.6, BLUE, ow=0)
    pen.circ(add(ctr, u, -0.9), 1.7, BLACK, ow=0)
    pen.circ(add(add(pel, u, 1.0), f, w - 3.2), 1.3, WHITE, ow=0.3)          # tiny logo on shorts

def draw_head(pen, g, p):
    hc, hu, hf, sh = g["hc"], g["hu"], g["hf"], g["sh"]
    front = p["front"]
    # neck
    pen.seg(sh, add(hc, hu, -5), 6.2, OUT); pen.seg(sh, add(hc, hu, -5), 5.0, SKIN_D)
    def hp(theta, r_scale, plus_u=0.0):
        th = rad(theta)
        return add(add(hc, hu, math.cos(th) * (HR * r_scale) + plus_u), hf, math.sin(th) * (HR * r_scale))
    # a little hair behind the head
    for c in [hp(t, 1.0) for t in (-130, -105, -80)]: pen.circ(c, 4.6, HAIR, ow=0.9)
    # face + ear
    pen.circ(hc, HR, SKIN, ow=1.0)
    pen.circ(add(add(hc, hf, -HR + 3.6), hu, -1.4), 2.7, SKIN_D, ow=0.5)    # ear
    pen.circ(add(add(hc, hf, -HR + 3.6), hu, -1.4), 1.3, SKIN, ow=0)
    if not front:
        pen.circ(add(add(hc, hf, HR - 0.6), hu, -3.0), 1.9, SKIN, ow=0.7)    # nose
        pen.circ(add(add(hc, hf, HR - 1.1), hu, -2.5), 0.8, SKIN_D, ow=0)
        pen.circ(add(add(hc, hf, 4.0), hu, -6.2), 2.4, (196, 118, 72, 255), ow=0)  # cheek
    # headband (wide red, no tails)
    b0 = add(add(hc, hf, -HR - 0.3), hu, 3.6)
    b1 = add(add(hc, hf, HR + 0.2), hu, 4.4)
    pen.seg(b0, b1, 5.6, OUT); pen.seg(b0, b1, 4.4, RED)
    pen.seg(add(b0, hu, 1.2), add(b1, hu, 1.4), 1.1, RED_L)
    # eyes: big, amber
    def eye(cx, cy_u):
        c = add(add(hc, hf, cx), hu, cy_u)
        e = p["eyes"]
        if e in ("open", "wide", "angry"):
            ry = {"open": 3.1, "wide": 3.7, "angry": 2.7}[e]
            pen.ell(c, 2.7, ry, WHITE, ow=0.8)
            pen.circ(add(c, hf, 0.7 if not front else 0), 2.0, AMBER, ow=0)
            pen.circ(add(c, hf, 0.9 if not front else 0), 1.1, OUT, ow=0)
            pen.circ(add(add(c, hf, 1.5), hu, 1.0), 0.6, WHITE, ow=0)
        elif e == "shut":
            pen.line(add(c, hf, -2.5), add(c, hf, 2.5), 1.3, OUT)
        elif e == "x":
            for s_ in (1, -1):
                pen.line(add(add(c, hf, -2.1), hu, -2.1 * s_), add(add(c, hf, 2.1), hu, 2.1 * s_), 1.2, OUT)
        elif e == "happy":
            pen.line(add(add(c, hf, -2.5), hu, -1.0), add(c, hu, 1.3), 1.3, OUT)
            pen.line(add(c, hu, 1.3), add(add(c, hf, 2.5), hu, -1.0), 1.3, OUT)
        bw = p["brow"] if e != "angry" else 2
        pen.line(add(add(c, hf, -3.0), hu, 4.3 + bw * 0.6),
                 add(add(c, hf, 3.0), hu, 4.3 - bw * 0.9), 1.7, HAIR)
    if front:
        eye(-4.4, -1.4); eye(4.4, -1.4)
    else:
        eye(4.4, -1.6)
    # mouth
    mc = add(add(hc, hf, 0 if front else 4.4), hu, -7.2)
    m = p["mouth"]
    if m == "closed":     # confident smirk with a flash of teeth
        pen.line(add(mc, hf, -1.8), add(add(mc, hf, 3.4), hu, 1.1), 1.3, OUT)
        pen.line(add(add(mc, hf, 0.2), hu, -0.8), add(add(mc, hf, 2.9), hu, 0.2), 1.1, WHITE)
    elif m == "open":
        pen.ell(mc, 2.6, 2.4, OUT, ow=0); pen.ell(add(mc, hu, -0.8), 1.5, 0.9, RED_D, ow=0)
    elif m == "shout":
        pen.ell(mc, 3.0, 3.0, OUT, ow=0); pen.ell(add(mc, hu, -1.2), 1.9, 1.1, RED, ow=0)
        pen.line(add(mc, hu, 2.2), add(add(mc, hf, 1.8), hu, 2.2), 1.0, WHITE)
    elif m == "smile":
        pen.line(add(add(mc, hf, -2.6), hu, 1.0), add(mc, hu, -0.8), 1.3, OUT)
        pen.line(add(mc, hu, -0.8), add(add(mc, hf, 2.8), hu, 1.0), 1.3, OUT)
        pen.line(add(add(mc, hf, -1.6), hu, -0.2), add(add(mc, hf, 1.8), hu, -0.2), 1.0, WHITE)
    elif m == "grit":
        pen.ell(mc, 3.0, 1.7, WHITE, ow=0.7)
        pen.line(add(mc, hf, -3), add(mc, hf, 3), 0.8, OUT)
    # short curly afro on top, kept above the headband so the face stays clear
    tops = [hp(t, 0.98, 0.9) for t in (-100, -72, -44, -16, 12, 36)]
    for c in tops: pen.circ(c, 3.9, HAIR, ow=0.9)
    for c in tops[1:-1]: pen.circ(add(c, hu, 1.0), 1.1, HAIR_L, ow=0)

def render(p):
    g = layout(p)
    sx, sy = place(p, g)
    im = Image.new("RGBA", (CW * S, CH * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    pen = Pen(d, sx, sy)
    draw_arm(pen, g["fa"])
    draw_leg(pen, g["fl"])
    draw_torso(pen, g, p["front"])
    draw_leg(pen, g["nl"])
    draw_head(pen, g, p)
    draw_arm(pen, g["na"])
    # pixel-art downsample: box filter, then hard alpha threshold + light colour quantise
    small = im.resize((CW, CH), Image.BOX)
    px = small.load()
    for y in range(CH):
        for x in range(CW):
            r, g_, b, a = px[x, y]
            if a < 120: px[x, y] = (0, 0, 0, 0)
            else:
                # un-premultiply-ish: BOX on straight alpha already mixes with black; brighten edge a bit
                k = 255.0 / max(a, 1) if a < 255 else 1.0
                r, g_, b = [min(255, int(c * k)) for c in (r, g_, b)]
                px[x, y] = ((r // 6) * 6, (g_ // 6) * 6, (b // 6) * 6, 255)
    # metrics relative to origin (for hit boxes)
    def rel(q): return (q[0] + sx - OX, q[1] + sy - OY)
    metrics = dict(fist=rel(g["na"]["fist"]), toe=rel(g["nl"]["toe"]), ffist=rel(g["fa"]["fist"]), ftoe=rel(g["fl"]["toe"]))
    return small, metrics

# ---------------------------------------------------------------- poses
def walk_leg(phi, back=False):
    th = 26 * math.sin(phi) + 5
    swing = max(0.0, math.cos(phi)) if not back else max(0.0, -math.cos(phi))
    k = 10 + 44 * swing
    return (round(th, 1), round(th - k, 1), round(90 - 0.45 * k, 1))

def walk_pose(i, back=False):
    phi = i * math.pi / 3 + (0.3)
    if back: phi = -phi
    nl = walk_leg(phi, back); fl = walk_leg(phi + math.pi, back)
    bob = 0
    return P(t=10 if not back else 5, nl=nl, fl=fl,
             na=(35 + 4 * math.sin(phi), 158), fa=(2 - 4 * math.sin(phi), 150), brow=0)

CRH_N = (88, -4, 90); CRH_F = (-80, 16, 90)
def poses():
    D = {}
    # idle (guard, breathing)
    D["idle-1"] = P(t=8, nl=(24, -4, 90), fl=(-26, 6, 90))
    D["idle-2"] = P(t=9, nl=(27, -5, 90), fl=(-29, 7, 90), na=(36, 160), fa=(3, 152), tails=24)
    D["idle-3"] = P(t=10, nl=(30, -6, 90), fl=(-32, 8, 90), na=(38, 162), fa=(4, 154), tails=30)
    D["idle-4"] = P(t=9, nl=(27, -5, 90), fl=(-29, 7, 90), na=(36, 160), fa=(3, 152), tails=22)
    for i in range(6):
        D["forwards-%d" % (i + 1)] = walk_pose(i)
        D["backwards-%d" % (i + 1)] = walk_pose(i, back=True)
    # jumps
    D["jump-start/land"] = P(t=22, nl=(62, -30, 90), fl=(-46, 28, 90), na=(-25, 20), fa=(-35, 24), mouth="grit", brow=1)
    D["jump-up-1"] = P(t=2, nl=(8, 0, 62), fl=(-6, -2, 62), na=(150, 165), fa=(160, 170), eyes="wide", mouth="open", anchor="floor")
    D["jump-up-2"] = P(t=4, nl=(30, -34, 70), fl=(-6, -26, 70), na=(110, 150), fa=(120, 160), eyes="wide", mouth="open")
    D["jump-up-3"] = P(t=8, nl=(62, -30, 80), fl=(24, -54, 80), na=(70, 140), fa=(60, 150), eyes="wide", mouth="open")
    D["jump-up-4"] = P(t=10, nl=(84, -10, 82), fl=(54, -48, 82), na=(45, 150), fa=(30, 150), eyes="wide", mouth="open")
    D["jump-up-5"] = P(t=6, nl=(40, -20, 76), fl=(10, -30, 76), na=(95, 150), fa=(105, 160), eyes="wide", mouth="open")
    D["jump-up-6"] = P(t=2, nl=(14, 4, 70), fl=(-12, 0, 70), na=(120, 135), fa=(110, 130), eyes="open", mouth="open")
    # somersault: tuck + whole-body rotation
    tuckN = (86, -20, 70); tuckF = (60, -56, 70)
    D["jump-roll-1"] = P(t=2, nl=(8, 0, 62), fl=(-6, -2, 62), na=(150, 165), fa=(160, 170), eyes="wide", mouth="open")
    D["jump-roll-2"] = P(t=12, rot=40, nl=(55, -30, 80), fl=(30, -50, 80), na=(60, 150), fa=(50, 150), anchor="center", eyes="wide", mouth="open")
    D["jump-roll-3"] = P(t=16, rot=95, nl=tuckN, fl=tuckF, na=(60, 130), fa=(50, 130), anchor="center", eyes="shut")
    D["jump-roll-4"] = P(t=16, rot=150, nl=tuckN, fl=tuckF, na=(60, 130), fa=(50, 130), anchor="center", eyes="shut")
    D["jump-roll-5"] = P(t=16, rot=215, nl=tuckN, fl=tuckF, na=(60, 130), fa=(50, 130), anchor="center", eyes="shut")
    D["jump-roll-6"] = P(t=14, rot=290, nl=(70, -26, 80), fl=(40, -50, 80), na=(70, 140), fa=(60, 140), anchor="center", eyes="wide", mouth="open")
    D["jump-roll-7"] = P(t=4, nl=(14, 4, 66), fl=(-12, 0, 66), na=(120, 135), fa=(110, 130), eyes="open", mouth="open")
    # crouch
    D["crouch-1"] = P(t=14, nl=(52, -12, 90), fl=(-48, 12, 90), na=(40, 150), fa=(5, 150))
    D["crouch-2"] = P(t=20, nl=(72, -8, 90), fl=(-64, 14, 90), na=(42, 148), fa=(8, 148))
    D["crouch-3"] = P(t=26, nl=CRH_N, fl=CRH_F, na=(44, 150), fa=(10, 148), brow=1, ha=-8)
    # turn-around (front-facing frames)
    D["idle-turn-1"] = P(t=6, nl=(20, -2, 90), fl=(-22, 4, 90), na=(30, 160), fa=(0, 150))
    D["idle-turn-2"] = P(t=0, front=True, nl=(10, 0, 80), fl=(-10, 0, 100), na=(18, 20), fa=(-18, -20), tails=40)
    D["idle-turn-3"] = P(t=2, front=True, ha=-4, nl=(14, -2, 84), fl=(-14, 2, 96), na=(24, 150), fa=(-24, 190), tails=34)
    D["crouch-turn-1"] = D["crouch-3"].copy()
    D["crouch-turn-2"] = P(t=20, front=True, nl=(60, -10, 90), fl=(-60, 10, 90), na=(40, 160), fa=(-40, 200), anchor="floor")
    D["crouch-turn-3"] = P(t=22, front=True, ha=-4, nl=(66, -10, 90), fl=(-60, 10, 90), na=(40, 150), fa=(-30, 190))
    # punches
    D["light-punch-1"] = P(t=10, nl=(28, -4, 90), fl=(-30, 8, 90), na=(30, 170), fa=(0, 150), mouth="grit", brow=1)
    D["light-punch-2"] = P(t=16, dx=5, nl=(40, -10, 90), fl=(-36, 8, 90), na=(88, 90), fa=(0, 150), mouth="shout", eyes="angry")
    D["med-punch-1"] = P(t=4, dx=-2, nl=(22, -4, 90), fl=(-30, 8, 90), na=(-20, 160), fa=(0, 150), mouth="grit", eyes="angry")
    D["med-punch-2"] = P(t=14, dx=4, nl=(40, -12, 90), fl=(-38, 8, 90), na=(40, 120), fa=(0, 150), mouth="grit", eyes="angry")
    D["med-punch-3"] = P(t=24, dx=10, nl=(56, -14, 90), fl=(-52, 4, 80), na=(84, 88), fa=(-14, 160), mouth="shout", eyes="angry")
    D["heavy-punch-1"] = P(t=30, dx=14, nl=(62, -12, 90), fl=(-56, 2, 78), na=(96, 118), fa=(-24, 165), mouth="shout", eyes="angry", ha=4)
    # kicks
    D["light-kick-1"] = P(t=-4, dx=-1, nl=(70, -24, 70), fl=(-8, 4, 90), na=(36, 160), fa=(0, 150), mouth="grit", eyes="angry")
    D["light-kick-2"] = P(t=-10, dx=2, nl=(84, 80, 70), fl=(-6, 4, 90), na=(38, 155), fa=(-30, 140), mouth="shout", eyes="angry")
    D["med-kick-1"] = P(t=-18, dx=2, nl=(100, 96, 62), fl=(-6, 4, 90), na=(60, 140), fa=(-50, 130), mouth="shout", eyes="angry")
    D["heavy-kick-1"] = P(t=-6, nl=(60, -30, 70), fl=(-12, 4, 90), na=(36, 160), fa=(0, 150), mouth="grit", eyes="angry")
    D["heavy-kick-2"] = P(t=-14, dx=0, nl=(98, 8, 66), fl=(-8, 4, 90), na=(60, 150), fa=(-40, 140), mouth="grit", eyes="angry")
    D["heavy-kick-3"] = P(t=-26, dx=2, nl=(112, 110, 58), fl=(-4, 4, 90), na=(90, 130), fa=(-60, 120), mouth="shout", eyes="angry")
    D["heavy-kick-4"] = P(t=-12, nl=(86, -14, 64), fl=(-10, 4, 90), na=(50, 150), fa=(-20, 140), mouth="grit", eyes="angry")
    D["heavy-kick-5"] = P(t=14, nl=(46, -10, 90), fl=(-40, 8, 90), na=(36, 156), fa=(0, 150), mouth="grit")
    # hurt (face)
    D["hit-face-1"] = P(t=-6, ha=-8, nl=(18, -4, 90), fl=(-24, 6, 90), na=(20, 120), fa=(-20, 110), eyes="shut", mouth="open", brow=-1)
    D["hit-face-2"] = P(t=-14, ha=-16, nl=(14, -4, 90), fl=(-30, 8, 90), na=(-5, 90), fa=(-40, 80), eyes="shut", mouth="open", brow=-1)
    D["hit-face-3"] = P(t=-22, ha=-22, nl=(8, -4, 90), fl=(-36, 10, 90), na=(-25, 70), fa=(-55, 60), eyes="shut", mouth="open", brow=-1, tails=50)
    D["hit-face-4"] = P(t=-30, ha=-28, dx=-2, nl=(2, 0, 90), fl=(-42, 12, 90), na=(-40, 50), fa=(-70, 40), eyes="x", mouth="open", brow=-1, tails=60)
    # hurt (stomach)
    D["hit-stomach-1"] = P(t=18, ha=10, nl=(34, -12, 90), fl=(-30, 10, 90), na=(30, -150), fa=(8, -160), eyes="shut", mouth="open", brow=-1)
    D["hit-stomach-2"] = P(t=30, ha=14, nl=(44, -16, 90), fl=(-36, 12, 90), na=(24, -140), fa=(6, -150), eyes="shut", mouth="open", brow=-1)
    D["hit-stomach-3"] = P(t=40, ha=16, dx=-1, nl=(48, -18, 90), fl=(-38, 12, 90), na=(20, -135), fa=(2, -145), eyes="shut", mouth="open", brow=-1)
    D["hit-stomach-4"] = P(t=48, ha=16, dx=-2, nl=(52, -20, 90), fl=(-40, 14, 90), na=(16, -130), fa=(0, -140), eyes="x", mouth="open", brow=-1)
    # stun (dazed)
    D["stun-1"] = P(t=6, ha=12, nl=(20, -2, 90), fl=(-22, 4, 90), na=(10, 8), fa=(-8, -4), eyes="shut", mouth="open", brow=-1)
    D["stun-2"] = P(t=6, ha=-12, nl=(20, -2, 90), fl=(-22, 4, 90), na=(10, 8), fa=(-8, -4), eyes="shut", mouth="open", brow=-1)
    D["stun-3"] = P(t=14, ha=18, nl=(26, -6, 90), fl=(-28, 6, 90), na=(14, 12), fa=(-4, -6), eyes="x", mouth="open", brow=-1)
    # hadouken-style special ("soccer shot")
    D["special-1"] = P(t=16, nl=(46, -8, 90), fl=(-40, 10, 90), na=(-20, 140), fa=(-30, 120), mouth="grit", eyes="angry")
    D["special-2"] = P(t=22, dx=4, nl=(54, -10, 90), fl=(-48, 10, 90), na=(40, 100), fa=(26, 94), mouth="grit", eyes="angry")
    D["special-3"] = P(t=26, dx=8, nl=(60, -12, 90), fl=(-54, 6, 82), na=(80, 90), fa=(70, 92), mouth="shout", eyes="angry")
    D["special-4"] = P(t=26, dx=8, nl=(60, -12, 90), fl=(-54, 6, 82), na=(84, 88), fa=(74, 90), mouth="shout", eyes="angry")
    # victory
    D["victory-1"] = P(t=2, nl=(14, -2, 90), fl=(-14, 2, 90), na=(20, 30), fa=(-20, -10), eyes="open", mouth="smile")
    D["victory-2"] = P(t=0, nl=(10, 0, 90), fl=(-10, 0, 90), na=(80, 160), fa=(-20, 10), eyes="happy", mouth="smile")
    D["victory-3"] = P(t=-4, nl=(8, 0, 90), fl=(-12, 0, 90), na=(160, 172), fa=(-18, 10), eyes="happy", mouth="smile", tails=40)
    D["victory-4"] = P(t=-2, nl=(10, 0, 90), fl=(-12, 0, 90), na=(150, 176), fa=(120, 160), eyes="happy", mouth="smile", tails=30)
    D["victory-5"] = P(t=-2, nl=(10, 0, 90), fl=(-12, 0, 90), na=(150, 178), fa=(140, 170), eyes="happy", mouth="smile", tails=36)
    # knock-down
    D["fall-1"] = P(t=-30, rot=-30, nl=(10, 20, 90), fl=(-30, 10, 90), na=(-70, 30), fa=(-80, 20), eyes="x", mouth="open", anchor="center", tails=60)
    D["fall-2"] = P(t=-30, rot=-60, nl=(20, 40, 90), fl=(-20, 20, 90), na=(-60, 40), fa=(-70, 30), eyes="x", mouth="open", anchor="center", tails=60)
    D["fall-3"] = P(t=0, rot=-80, nl=(20, -20, 90), fl=(-20, 10, 90), na=(-40, 40), fa=(-50, 50), eyes="x", mouth="open", anchor="floorc", tails=40)
    D["fall-4"] = P(t=0, rot=-84, nl=(40, -20, 90), fl=(10, -20, 90), na=(-30, 60), fa=(-20, 70), eyes="x", mouth="open", anchor="floorc", tails=30)
    D["fall-5"] = P(t=0, rot=-90, nl=(14, 4, 90), fl=(-6, 4, 90), na=(-30, 30), fa=(-20, 40), eyes="x", mouth="open", anchor="floorc", tails=20)
    return D

def main():
    D = poses()
    miss = [k for k in KEYS if k not in D]
    extra = [k for k in D if k not in KEYS]
    assert not miss, miss
    rows = (len(KEYS) + COLS - 1) // COLS
    sheet = Image.new("RGBA", (COLS * CW, rows * CH), (0, 0, 0, 0))
    table = {}
    for i, key in enumerate(KEYS):
        cell, m = render(D[key])
        cx, cy = (i % COLS) * CW, (i // COLS) * CH
        sheet.paste(cell, (cx, cy))
        hit = None
        if key in HIT_FRAMES:
            kind, kb = HIT_FRAMES[key]
            tx, ty = m["fist"] if kind == "hand" else m["toe"]
            h = 16 if kind == "hand" else 20
            x1 = tx + 4
            x0 = max(6, x1 - (kb[2] if kb[2] < 60 else 56))
            if x1 - x0 < 24: x0 = x1 - 24
            hit = [int(round(x0)), int(round(ty - h / 2)), int(round(x1 - x0)), h]
        table[key] = dict(rect=[cx, cy, CW, CH], origin=[OX, OY], hit=hit)
    out_png = os.path.join(ROOT, "public", "images", "Lou.png")
    sheet.save(out_png)
    js = ["// AUTO-GENERATED by tools/make_lou_sprites.py - do not edit by hand.",
          "// rect = [x, y, w, h] in Lou.png, origin = pivot (feet) inside the cell, hit = attack box relative to the pivot.",
          "export const LouSheet = " + json.dumps(table, indent=1) + ";", ""]
    open(os.path.join(ROOT, "src", "entitites", "fighters", "LouFrames.js"), "w").write("\n".join(js))
    # contact sheet with labels for review
    prev = Image.new("RGBA", sheet.size, (110, 150, 190, 255)); prev.alpha_composite(sheet)
    d = ImageDraw.Draw(prev)
    for i, key in enumerate(KEYS):
        cx, cy = (i % COLS) * CW, (i // COLS) * CH
        d.rectangle([cx, cy, cx + CW - 1, cy + CH - 1], outline=(255, 255, 255, 60))
        d.line([(cx + OX - 4, cy + OY), (cx + OX + 4, cy + OY)], fill=(255, 255, 0, 255))
        d.text((cx + 2, cy + 2), key, fill=(255, 255, 255, 255))
    prev.save("/tmp/lou_contact.png")
    print("ok", sheet.size, len(KEYS), "frames")

if __name__ == "__main__":
    main()
