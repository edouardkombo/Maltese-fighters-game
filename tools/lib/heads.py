"""Head painters.  Every head is a 300x330 RGBA float image (straight alpha, 0..255).

  * Lou      -> the real head cut out of reference_lou.png (hair, headband, face, grin) with
                expression overpaint (closed eyes, shouting mouth, X eyes ...)
  * Ganni    -> the pastizzier: flour-dusted baker, big moustache, white paper cap
  * Karmenu  -> the vintage bus driver: aviators, orange cap, silver moustache

Design-space coordinates are 300 (w) x 330 (h); the neck attaches at about (150, 318).
Eyes at x=104/196, y~206; mouth at ~ (150, 272).
"""
import os
import numpy as np
import cv2
from .gfx import Mask, Part, Canvas, rgb, lighten, darken, mix, blur

HW, HH = 300, 345
K = 2                       # working super-sampling for the head
W2, H2 = HW * K, HH * K
HERE = os.path.dirname(os.path.abspath(__file__))
REF = os.path.join(os.path.dirname(HERE), "reference_lou.png")

EYE_L, EYE_R = (104.0, 206.0), (196.0, 204.0)
MOUTH_C = (150.0, 270.0)


def M():
    return Mask(W2, H2)


def P(pt):
    return (pt[0] * K, pt[1] * K)


def E(c, rx, ry, ang=0.0):
    return M().ellipse(P(c), rx * K, ry * K, ang)


def Cc(c, r):
    return M().circle(P(c), r * K)


def Pl(pts):
    return M().poly([P(q) for q in pts])


def Ln(a, b, w):
    return M().line(P(a), P(b), w * K)


def Cv(p0, p1, p2, w):
    return M().curve(P(p0), P(p1), P(p2), w * K)


def down(img):
    return cv2.resize(img, (HW, HH), interpolation=cv2.INTER_AREA)


# ---------------------------------------------------------------------------------------- Lou
_LOU_CACHE = {}


def lou_base():
    if "base" in _LOU_CACHE:
        return _LOU_CACHE["base"]
    im = cv2.imread(REF)
    x0, y0, x1, y1 = 280, 70, 730, 560
    crop = im[y0:y1, x0:x1].copy()
    h, w = crop.shape[:2]
    mask = np.full((h, w), cv2.GC_BGD, np.uint8)
    cv2.ellipse(mask, (225, 215), (205, 215), 0, 0, 360, cv2.GC_PR_FGD, -1)
    cv2.ellipse(mask, (225, 300), (120, 120), 0, 0, 360, cv2.GC_FGD, -1)
    cv2.ellipse(mask, (225, 100), (150, 70), 0, 0, 360, cv2.GC_FGD, -1)
    cv2.rectangle(mask, (70, 120), (380, 230), cv2.GC_FGD, -1)
    cv2.rectangle(mask, (0, 440), (w, h), cv2.GC_BGD, -1)
    bgd = np.zeros((1, 65)); fgd = np.zeros((1, 65))
    cv2.grabCut(crop, mask, None, bgd, fgd, 8, cv2.GC_INIT_WITH_MASK)
    fg = ((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD)).astype(np.uint8) * 255
    n, lab, st, _ = cv2.connectedComponentsWithStats(fg)
    fg = (lab == 1 + np.argmax(st[1:, cv2.CC_STAT_AREA])).astype(np.uint8) * 255
    # drop the jersey collar sliver under the right jaw
    cv2.fillPoly(fg, [np.array([[310, 388], [352, 360], [352, 460], [310, 460]], np.int32)], 0)
    fg = cv2.erode(fg, np.ones((3, 3), np.uint8), iterations=1)
    fg = cv2.GaussianBlur(fg, (0, 0), 1.3)
    rgba = np.dstack([crop[..., ::-1].astype(np.float32), fg.astype(np.float32)])
    # scale to the 300x330 head frame (crop 450x490 -> 300x327), centred at the top
    s = 300.0 / w
    big = cv2.resize(rgba, (int(round(w * s * K)), int(round(h * s * K))), interpolation=cv2.INTER_AREA)
    out = np.zeros((H2, W2, 4), np.float32)
    out[:big.shape[0], :big.shape[1]] = big[:H2, :W2]
    _LOU_CACHE["base"] = out
    return out


def _skin_sample():
    b = lou_base()
    # forehead / cheek skin colour from the reference (design coords ~ (150,175) and (95,245))
    pts = [(150, 180), (100, 240), (200, 240)]
    cols = [b[int(y * K), int(x * K), :3] for x, y in pts]
    return np.mean(cols, axis=0)


def lou_head(eyes="open", mouth="closed", brow=1):
    img = lou_base().copy()
    skin = _skin_sample()
    lid_dark = darken(skin, 0.45)
    cv = Canvas(W2, H2)
    cv.pm[..., :3] = img[..., :3] * (img[..., 3:4] / 255.0)
    cv.pm[..., 3] = img[..., 3] / 255.0
    face_clip = E((150, 235), 100, 96)          # keep overpaint on the face

    def lid(c, a=1.0):
        m = E(c, 24.5, 16.5, -4 if c[0] < 150 else 4)
        m.a *= face_clip.a
        g = blur(m.a, 2.4 * K)
        cv.over(skin * 0.96, g * a)

    def lash(c, kind):
        s = -1 if c[0] < 150 else 1
        if kind == "shut":
            cv.flat(Cv((c[0] - 24, c[1] - 1), (c[0], c[1] + 9), (c[0] + 24, c[1] - 1), 3.2), (30, 14, 12))
            cv.flat(Cv((c[0] + 20 * s * -1 + 0, c[1] + 1), (c[0] + 24 * s * -1, c[1] + 3), (c[0] + 30 * s * -1, c[1] - 1), 2.2), (30, 14, 12)) if False else None
        elif kind == "happy":
            cv.flat(Cv((c[0] - 22, c[1] + 6), (c[0], c[1] - 12), (c[0] + 22, c[1] + 6), 3.4), (30, 14, 12))
        elif kind == "x":
            cv.flat(Ln((c[0] - 14, c[1] - 12), (c[0] + 14, c[1] + 12), 4.0), (30, 14, 12))
            cv.flat(Ln((c[0] - 14, c[1] + 12), (c[0] + 14, c[1] - 12), 4.0), (30, 14, 12))

    if eyes in ("shut", "x", "happy"):
        for c in (EYE_L, EYE_R):
            lid(c)
            lash(c, eyes)
    elif eyes == "wide":
        # a touch of white above the iris: lift the lids by painting a faint highlight band
        pass

    if mouth in ("open", "shout"):
        big = mouth == "shout"
        c = (MOUTH_C[0] + 2, MOUTH_C[1] + (6 if big else 2))
        # cover the grin, then paint the open mouth
        cover = E((c[0], c[1] - 3), 40, 20 if not big else 24)
        cover.a *= face_clip.a
        cv.over(skin * 0.92, blur(cover.a, 1.0 * K))
        rx, ry = (28, 20) if big else (22, 14)
        mo = E(c, rx, ry)
        cv.flat(E(c, rx + 2.2, ry + 2.2), (40, 14, 14))
        part = Part(mo, (86, 14, 22))
        part.paint(E((c[0], c[1] + ry * 0.55), rx * 0.62, ry * 0.5), (222, 92, 104))
        part.paint(E((c[0], c[1] - ry * 0.78), rx * 0.85, ry * 0.32), (250, 246, 238))
        part.shade(K, dark=0.5, light=0.0)
        cv.part(part)
    elif mouth == "grit":
        pass

    # tone down / tilt the brows for hurt expressions
    if brow < 0 or eyes in ("shut", "x"):
        for c, s in ((EYE_L, 1), (EYE_R, -1)):
            cv.flat(Cv((c[0] - 22 * s, c[1] - 24 - 2), (c[0], c[1] - 33), (c[0] + 22 * s, c[1] - 24 + 6), 5.2), (34, 18, 14), 0.9)

    return down(_unpremul(cv))


def _unpremul(cv):
    a = cv.pm[..., 3:4]
    rgbv = np.where(a > 1e-4, cv.pm[..., :3] / np.maximum(a, 1e-4), 0)
    return np.concatenate([np.clip(rgbv, 0, 255), np.clip(a * 255, 0, 255)], axis=2).astype(np.float32)


# ---------------------------------------------------------------------------- generic painter
class HeadSpec:
    def __init__(self, **kw):
        self.__dict__.update(kw)


def spline(pts, n=10, closed=True):
    """Catmull-Rom through pts -> dense polyline."""
    P_ = np.array(pts, np.float32)
    N = len(P_)
    out = []
    rng = range(N) if closed else range(N - 1)
    for i in rng:
        p0, p1, p2, p3 = P_[(i - 1) % N], P_[i % N], P_[(i + 1) % N], P_[(i + 2) % N]
        for t in np.linspace(0, 1, n, endpoint=False):
            t2, t3 = t * t, t * t * t
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    return [tuple(q) for q in out]


def head_outline(spec):
    right = spec.outline                       # top -> chin, right half
    left = [(300 - x, y) for x, y in reversed(right[1:-1])]
    return right + left


def strands(mask_a, n, rng, col_a, col_b, length=22, w=1.3, direction=None, bbox=None):
    """Hair strands: n short curved strokes clipped to mask -> (alpha, rgb layer)."""
    ys, xs = np.where(mask_a[::4, ::4] > 0.5)
    layer = np.zeros((H2, W2, 3), np.float32)
    if len(xs) == 0:
        return np.zeros((H2, W2), np.float32), layer
    mA, mB = M(), M()
    for _ in range(n):
        k = rng.randint(len(xs))
        x, y = xs[k] * 4 / K, ys[k] * 4 / K
        ang = (direction(x, y) if direction else rng.uniform(0, 6.28)) + rng.normal(0, 0.25)
        L = length * rng.uniform(0.5, 1.0)
        p0 = (x, y)
        p2 = (x + np.cos(ang) * L, y + np.sin(ang) * L)
        p1 = ((p0[0] + p2[0]) / 2 + np.cos(ang + 1.57) * L * 0.25, (p0[1] + p2[1]) / 2 + np.sin(ang + 1.57) * L * 0.25)
        tgt = mA if rng.rand() < 0.5 else mB
        tgt.curve(P(p0), P(p1), P(p2), w * rng.uniform(0.7, 1.3) * K, n=6)
    ca, cb = np.array(col_a, np.float32), np.array(col_b, np.float32)
    layer = ca * mA.a[..., None] + cb * np.clip(mB.a - mA.a, 0, 1)[..., None]
    alpha = np.maximum(mA.a, mB.a) * mask_a
    tot = np.maximum(mA.a + np.clip(mB.a - mA.a, 0, 1), 1e-4)[..., None]
    layer = layer / tot
    return alpha, layer


def _face(cv, spec):
    pts = spline(head_outline(spec), 8)
    face = Pl(pts)
    cx = 150
    # ears
    for s in (-1, 1):
        ex = cx + s * (spec.ear_x)
        ear = E((ex, spec.ear_y), 17, 27, s * -8)
        ep = Part(ear, darken(spec.skin, 0.05))
        ep.paint(E((ex - s * 2, spec.ear_y + 2), 8, 16, s * -8), darken(spec.skin, 0.3), 0.85)
        ep.paint(Cv((ex - s * 8, spec.ear_y - 14), (ex + s * 4, spec.ear_y - 8), (ex - s * 2, spec.ear_y + 14), 2.2).a, darken(spec.skin, 0.5), 0.5)
        ep.shade(K, dark=0.42, light=0.15)
        cv.part(ep, outline=darken(spec.skin, 0.78), ow=1.4 * K)
    fp = Part(face, spec.skin)
    sk, cy = spec.skin, spec.face_cy
    # sculpted light: warm cheeks, lit forehead / cheekbones, shaded temples, eye sockets, jaw, under-nose
    for s in (-1, 1):
        fp.paint(blur(E((cx + s * 62, cy + 38), 32, 22).a, 9 * K), spec.cheek, 0.6)
        fp.paint(blur(E((cx + s * 88, cy - 6), 22, 70).a, 10 * K), darken(sk, 0.42), 0.5)
        fp.paint(blur(E((cx + s * 62, cy + 8), 26, 14, s * 20).a, 6 * K), lighten(sk, 0.2), 0.5)
        fp.paint(blur(E((cx + s * 46, cy - 4), 30, 14).a, 6 * K), darken(sk, 0.3), 0.35)
    fp.paint(blur(E((cx - 8, cy - 52), 66, 26).a, 9 * K), lighten(sk, 0.26), 0.6)
    fp.paint(blur(E((cx, cy + 108), 90, 24).a, 10 * K), darken(sk, 0.45), 0.7)
    fp.paint(blur(E((cx + 6, 264), 40, 9).a, 4 * K), darken(sk, 0.4), 0.55)     # under-nose
    fp.paint(blur(E((cx, 304), 20, 6).a, 3 * K), darken(sk, 0.3), 0.5)          # chin dimple
    # smile / age lines
    for s in (-1, 1):
        fp.paint(Cv((cx + s * 36, 246), (cx + s * 52, 262), (cx + s * 44, 290), 2.2).a, darken(sk, 0.5), 0.45)
        fp.paint(Cv((cx + s * 40, 168), (cx + s * 62, 172), (cx + s * 74, 166), 1.8).a, darken(sk, 0.4), spec.wrinkle)
    fp.paint(Cv((cx - 34, 150), (cx, 144), (cx + 34, 150), 1.8).a, darken(sk, 0.4), spec.wrinkle)
    if spec.stubble > 0:
        rng = np.random.RandomState(7)
        noise = blur((rng.rand(H2, W2).astype(np.float32) > 0.82).astype(np.float32), 0.6)
        lower = E((cx, cy + 62), 100, 62).a * (1 - E((cx, cy + 10), 84, 52).a * 0.92)
        fp.paint(np.clip(noise * 2.4 * lower, 0, 1), spec.stub_col, spec.stubble)
    fp.shade(K, dark=0.4, light=0.2)
    cv.part(fp, outline=darken(sk, 0.82), ow=1.7 * K)
    # soft neck shadow on the chin edge is handled by the body; gloss on the forehead
    cv.flat(blur(E((cx - 22, cy - 62), 22, 7).a, 4 * K), (255, 255, 255), 0.18 * spec.gloss)


def _eye(cv, c, spec, kind, side):
    ew, eh = spec.eye_w, spec.eye_h
    x, y = c
    if spec.glasses:
        return
    if kind in ("open", "wide", "angry"):
        h = eh * (1.2 if kind == "wide" else (0.8 if kind == "angry" else 1.0))
        # eye-socket shadow
        cv.flat(blur(E((x, y - 4), ew + 10, h + 12).a, 5 * K), darken(spec.skin, 0.5), 0.55)
        sock = E((x, y), ew, h)
        sc = Part(sock, (250, 246, 240))
        sc.paint(blur(E((x, y - h), ew, h * 0.9).a, 3 * K), (176, 150, 150), 0.55)
        sc.paint(E((x + side * 4, y), ew * 0.62, h * 1.2), lighten(spec.iris, 0.0), 0.0)
        ir = E((x - side * 1.5, y + 1), ew * 0.56, h * 1.02)
        irp = Part(ir, spec.iris)
        irp.paint(E((x - side * 1.5, y + h * 0.36), ew * 0.46, h * 0.5), lighten(spec.iris, 0.3), 0.85)
        irp.paint(E((x - side * 1.5, y), ew * 0.27, h * 0.58), (16, 8, 6), 1.0)
        irp.shade(K, dark=0.5, light=0.0)
        cv.over(np.array([0, 0, 0], np.float32), grownmask(sock, 1.7 * K) * 0.9)
        cv.part(sc)
        cv.over(irp.col, (ir.a * sock.a)[irp.sl], irp.sl)
        cv.flat(Cc((x + 5 - side * 1.5, y - h * 0.42), 4.0), (255, 255, 255), 0.95)
        cv.flat(Cc((x - 6 - side * 1.5, y + h * 0.42), 2.0), (255, 255, 255), 0.65)
        cv.flat(Cv((x - ew - 1, y + 2), (x, y - h * 1.5), (x + ew + 1, y + 2), 4.2), (22, 12, 10))
        cv.flat(Ln((x + side * ew, y - 1), (x + side * (ew + 8), y - 7), 2.8), (22, 12, 10))
        cv.flat(Cv((x - ew + 4, y + h + 5), (x, y + h + 10), (x + ew - 4, y + h + 5), 2.0), darken(spec.skin, 0.55), 0.6)   # eye bag
        cv.flat(Cv((x - ew - 4, y - h * 1.6 - 3), (x, y - h * 2.05), (x + ew + 4, y - h * 1.6 - 3), 1.8), darken(spec.skin, 0.5), 0.5)  # crease
    elif kind == "shut":
        cv.flat(Cv((x - ew, y), (x, y + 11), (x + ew, y), 4.0), (22, 12, 10))
    elif kind == "happy":
        cv.flat(Cv((x - ew, y + 6), (x, y - 12), (x + ew, y + 6), 4.2), (22, 12, 10))
    elif kind == "x":
        cv.flat(Ln((x - 14, y - 12), (x + 14, y + 12), 4.8), (22, 12, 10))
        cv.flat(Ln((x - 14, y + 12), (x + 14, y - 12), 4.8), (22, 12, 10))


def grownmask(mask, px):
    import cv2 as _cv
    k = int(max(1, round(px)))
    return np.clip(_cv.dilate(mask.a, _cv.getStructuringElement(_cv.MORPH_ELLIPSE, (2 * k + 1, 2 * k + 1))), 0, 1)


def _brow(cv, c, spec, side, kind, brow):
    x, y = c
    ang = {"angry": 18, "open": 5, "wide": -6, "shut": -9, "x": -9, "happy": -3}.get(kind, 4) + (1 - brow) * -3
    s = -side
    p_in = (x + s * 26, y - 32 + ang * 0.95)
    p_mid = (x, y - 40 - (5 if kind == "wide" else 0))
    p_out = (x - s * 26, y - 32 - ang * 0.2)
    m = M()
    pts = []
    for i in range(13):
        t = i / 12
        px_ = (1 - t) ** 2 * p_out[0] + 2 * (1 - t) * t * p_mid[0] + t * t * p_in[0]
        py_ = (1 - t) ** 2 * p_out[1] + 2 * (1 - t) * t * p_mid[1] + t * t * p_in[1]
        pts.append((px_, py_))
    for i, (a, b) in enumerate(zip(pts[:-1], pts[1:])):
        w = spec.brow_w * (0.55 + 0.6 * np.sin(np.pi * (i + 1) / 13) ** 0.7)
        m.line(P(a), P(b), w * K)
    bp = Part(m, spec.brow_col)
    bp.paint(Ln(p_out, p_mid, 1.6), lighten(spec.brow_col, 0.35), 0.5)
    cv.over(bp.col, m.a[bp.sl], bp.sl)
    rng = np.random.RandomState(int(x) + 11)
    hair = M()
    for _ in range(14):
        t = rng.uniform(0.1, 0.95)
        bx = (1 - t) ** 2 * p_out[0] + 2 * (1 - t) * t * p_mid[0] + t * t * p_in[0]
        by = (1 - t) ** 2 * p_out[1] + 2 * (1 - t) * t * p_mid[1] + t * t * p_in[1]
        hair.line(P((bx, by + 3)), P((bx + rng.uniform(-3, 3), by - rng.uniform(5, 9))), 1.0 * K)
    cv.flat(hair, spec.brow_col, 0.8)


def _nose(cv, spec):
    cx, cy = 150, 243
    s = spec.nose
    bridge = Part(Cv((cx - 3, 196), (cx - 8, 224), (cx - 6, cy + 4), 12 * s).a, spec.skin)
    sh = E((cx + 4, cy + 14), 26 * s, 18 * s)
    p = Part(sh, spec.nose_col)
    p.paint(E((cx - 5, cy + 6), 15 * s, 13 * s), lighten(spec.nose_col, 0.22), 0.75)
    p.paint(blur(E((cx - 10, cy + 3), 6, 5).a, 2 * K), (255, 255, 255), 0.3)
    p.shade(K, dark=0.45, light=0.15)
    cv.flat(blur(Ln((cx + 14 * s, 200), (cx + 22 * s, 244), 9).a, 4 * K), darken(spec.skin, 0.4), 0.35)
    cv.part(p, outline=darken(spec.skin, 0.74), ow=1.1 * K, outline_alpha=0.6)
    cv.flat(E((cx - 10 * s, cy + 24), 5.2 * s, 3.6 * s), darken(spec.skin, 0.8), 0.9)
    cv.flat(E((cx + 15 * s, cy + 24), 5.2 * s, 3.6 * s), darken(spec.skin, 0.8), 0.9)


def _mouth(cv, spec, kind):
    cx, cy = MOUTH_C
    dark = (40, 14, 14)
    if kind in ("closed", "grit", "smile"):
        sm = {"closed": 5, "grit": 0, "smile": 11}[kind]
        left, right = (cx - 30, cy - 2 - sm * 0.2), (cx + 32, cy - 6 - sm)
        if kind == "grit":
            part = Part(E((cx, cy), 29, 12), (252, 250, 244))
            part.paint(Ln((cx - 27, cy), (cx + 27, cy), 1.8), (160, 128, 118), 0.9)
            for gx in (-18, -9, 0, 9, 18):
                part.paint(Ln((cx + gx, cy - 10), (cx + gx, cy + 10), 1.0), (190, 170, 160), 0.7)
            part.shade(K, dark=0.4, light=0.0)
            cv.part(part, outline=dark, ow=2.2 * K)
        else:
            cv.flat(Cv((left[0] + 4, left[1] + 8), (cx, cy + 16 + sm * 0.3), (right[0] - 4, right[1] + 9), 7.5), spec.lip, 0.85)
            if kind == "smile":
                cv.flat(Pl([(cx - 22, cy + 1), (cx + 24, cy - 6), (cx + 20, cy + 9), (cx - 14, cy + 11)]), (252, 250, 244), 0.97)
            cv.flat(Cv(left, (cx + 2, cy + 8 + sm * 0.4), right, 4.4), dark)
            cv.flat(Ln(left, (left[0] - 4, left[1] - 5), 2.6), darken(spec.skin, 0.6), 0.7)
    else:
        big = kind == "shout"
        rx, ry = (31, 24) if big else (24, 16)
        c = (cx, cy + (7 if big else 3))
        cv.flat(E(c, rx + 2.6, ry + 2.6), (36, 12, 12))
        part = Part(E(c, rx, ry), (88, 14, 24))
        part.paint(E((c[0], c[1] + ry * 0.55), rx * 0.62, ry * 0.5), (226, 96, 108))
        part.paint(E((c[0], c[1] - ry * 0.8), rx * 0.86, ry * 0.34), (252, 248, 240))
        part.shade(K, dark=0.5, light=0.0)
        cv.part(part)


def paint_head(spec, eyes="open", mouth="closed", brow=1):
    cv = Canvas(W2, H2)
    if spec.hair_back:
        spec.hair_back(cv, spec)
    _face(cv, spec)
    for c, side in ((EYE_L, -1), (EYE_R, 1)):
        _eye(cv, c, spec, eyes, side)
    _nose(cv, spec)
    if not spec.glasses:
        for c, side in ((EYE_L, -1), (EYE_R, 1)):
            _brow(cv, c, spec, side, eyes, brow)
    _mouth(cv, spec, mouth)
    if spec.post_features:
        spec.post_features(cv, spec, eyes, mouth, brow)
    return down(_unpremul(cv))


# --------------------------------------------------------------------------------- characters
def moustache(cv, spec, half_w, thick, droop, col_a, col_b, curl):
    """Full, hairy moustache built from strands, with optional handlebar curl."""
    cx, cy = 150, 258
    pts_r = [(cx, cy - 6), (cx + half_w * 0.5, cy - 10), (cx + half_w, cy - 2 + droop), (cx + half_w * 0.62, cy + thick + droop * 0.6), (cx + half_w * 0.2, cy + thick * 0.9), (cx, cy + thick * 0.55)]
    pts_l = [(300 - x, y) for x, y in pts_r]
    shape = M()
    for pts in (pts_r, pts_l):
        sp = spline(pts, 8)
        shape.poly([P(q) for q in sp])
    if curl:
        for sx in (-1, 1):
            shape.curve(P((cx + sx * half_w * 0.9, cy + droop)), P((cx + sx * (half_w + 14), cy + droop + 8)), P((cx + sx * (half_w + 14), cy - 12)), curl * K)
    base = Part(shape, col_a)
    rng = np.random.RandomState(5)

    def direction(x, y):
        return np.arctan2(8 + (y - cy) * 0.4, (x - cx) * 0.9 + (3 if x >= cx else -3))
    al, lay = strands(shape.a, 360, rng, col_b, darken(col_a, 0.4), length=20, w=1.1, direction=direction)
    base.paint_img(lay, al)
    base.paint(blur(E((cx, cy + thick * 0.85), half_w, 5).a, 3 * K), (0, 0, 0), 0.35)
    base.shade(K, dark=0.45, light=0.3)
    cv.part(base, outline=darken(col_a, 0.4), ow=1.4 * K)


def _ganni_hair_back(cv, s):
    # short black hair at the temples (under the cap)
    for sx in (-1, 1):
        t = Part(Pl([(150 + sx * 86, 128), (150 + sx * 104, 176), (150 + sx * 96, 214), (150 + sx * 82, 190), (150 + sx * 76, 140)]), (36, 32, 36))
        rng = np.random.RandomState(9 + sx)
        al, lay = strands(t.full, 120, rng, (90, 84, 92), (16, 14, 18), length=14, w=1.1, direction=lambda x, y: 1.57)
        t.paint_img(lay, al)
        t.shade(K, dark=0.4, light=0.25)
        cv.part(t, ow=1.4 * K)


def _ganni_post(cv, s, eyes, mouth, brow):
    moustache(cv, s, 78, 22, 8, (30, 26, 30), (92, 86, 96), 4.0)
    # baker's cap sitting on the forehead, with fabric folds and flour
    cap_pts = [(48, 150), (50, 100), (82, 62), (150, 46), (218, 62), (250, 100), (252, 150),
               (226, 142), (190, 136), (150, 134), (110, 136), (74, 142)]
    cap = Part(Pl(spline(cap_pts, 6)), (248, 246, 242))
    cap.paint(blur(Ln((100, 80), (170, 70), 26).a, 7 * K), (255, 255, 255), 0.95)
    cap.paint(blur(E((222, 118), 26, 14).a, 6 * K), (196, 202, 218), 0.8)
    cap.paint(blur(E((78, 120), 22, 12).a, 6 * K), (206, 210, 224), 0.7)
    for fx in (96, 130, 170, 204):
        cap.paint(Cv((fx, 70), (fx + 3, 100), (fx - 2, 132), 2.0).a, (196, 200, 214), 0.65)
    cap.shade(K, dark=0.3, light=0.1)
    cv.flat(blur(E((150, 150), 94, 10).a, 6 * K), (30, 18, 12), 0.38)          # cast shadow on forehead
    cv.part(cap, outline=(46, 40, 52), ow=1.7 * K)
    cv.flat(Cv((52, 148), (150, 140), (250, 148), 3.4), (176, 182, 200), 0.9)  # hem
    # flour dust on cheeks / nose / eyebrows
    rng = np.random.RandomState(3)
    dust = blur((rng.rand(H2, W2).astype(np.float32) > 0.985).astype(np.float32), 1.5) * E((150, 232), 92, 80).a
    cv.flat(np.clip(dust * 4, 0, 1), (255, 255, 255), 0.6)
    cv.flat(blur(E((136, 236), 14, 7).a, 3 * K), (255, 255, 255), 0.45)
    # gold tooth sparkle on the smile
    if mouth in ("closed", "smile"):
        cv.flat(Cc((150 + 24, MOUTH_C[1] - 3), 2.2), (255, 214, 84), 0.9)


def ganni_spec():
    return HeadSpec(skin=(216, 156, 114), nose_col=(222, 140, 108), cheek=(222, 104, 88), lip=(176, 84, 80),
                    outline=[(150, 112), (214, 124), (244, 172), (254, 222), (242, 276), (204, 318), (150, 332)],
                    ear_x=106, ear_y=220, face_cy=222, stubble=0.4, stub_col=(72, 62, 70), wrinkle=0.55, gloss=1.0,
                    eye_w=22, eye_h=14, iris=(88, 50, 28), nose=1.3, brow_col=(28, 24, 28), brow_w=12,
                    glasses=False, hair_back=_ganni_hair_back, post_features=_ganni_post)


def _karm_hair_back(cv, s):
    for sx in (-1, 1):
        t = Part(Pl([(150 + sx * 84, 134), (150 + sx * 104, 180), (150 + sx * 96, 222), (150 + sx * 80, 196), (150 + sx * 74, 146)]), (176, 176, 188))
        rng = np.random.RandomState(21 + sx)
        al, lay = strands(t.full, 140, rng, (236, 236, 244), (120, 120, 134), length=15, w=1.1, direction=lambda x, y: 1.57)
        t.paint_img(lay, al)
        t.shade(K, dark=0.4, light=0.2)
        cv.part(t, ow=1.4 * K)


def _karm_post(cv, s, eyes, mouth, brow):
    moustache(cv, s, 62, 18, 6, (172, 172, 184), (238, 238, 246), 0.0)
    # aviator sunglasses (gold wire frame, smoky gradient lenses)
    for c, sx in ((EYE_L, -1), (EYE_R, 1)):
        pts = [(c[0] - 42, c[1] - 24), (c[0] + 42, c[1] - 26), (c[0] + 40, c[1] + 8), (c[0] + 18, c[1] + 34), (c[0] - 20, c[1] + 30), (c[0] - 40, c[1] + 4)]
        lens = Part(Pl(spline(pts, 6)), (22, 24, 32))
        lens.paint(blur(Ln((c[0] - 28, c[1] - 14), (c[0] - 4, c[1] + 14), 10).a, 3 * K), (112, 134, 176), 0.7)
        lens.paint(blur(E((c[0] + 14, c[1] + 22), 20, 8).a, 4 * K), (90, 70, 46), 0.55)
        lens.shade(K, dark=0.35, light=0.0)
        cv.part(lens, outline=(224, 178, 64), ow=2.6 * K)
        cv.flat(Ln((c[0] - 30, c[1] - 18), (c[0] - 12, c[1] - 8), 3.2), (255, 255, 255), 0.8)
        cv.flat(Ln((c[0] + 18, c[1] + 14), (c[0] + 26, c[1] + 8), 2.0), (255, 255, 255), 0.5)
        if eyes == "x":
            cv.flat(Ln((c[0] - 16, c[1] - 10), (c[0] + 16, c[1] + 18), 5.0), (255, 255, 255))
            cv.flat(Ln((c[0] - 16, c[1] + 18), (c[0] + 16, c[1] - 10), 5.0), (255, 255, 255))
    cv.flat(Cv((EYE_L[0] + 42, EYE_L[1] - 16), (150, EYE_L[1] - 28), (EYE_R[0] - 42, EYE_R[1] - 16), 4.6), (224, 178, 64))
    for sx, ex in ((-1, EYE_L), (1, EYE_R)):
        cv.flat(Ln((ex[0] + sx * 42, ex[1] - 8), (150 + sx * 104, ex[1] - 4), 4.0), (224, 178, 64))
        ang = {"angry": 14, "wide": -8, "shut": -8, "x": -8}.get(eyes, 3)
        hm = M()
        for i in range(26):
            r = np.random.RandomState(i + (7 if sx > 0 else 0))
            bx = ex[0] - sx * 30 + sx * i * 2.4
            by = ex[1] - 42 - ang * (i / 26) * 0.9 + 6 * np.sin(i / 26 * 3.1)
            hm.line(P((bx, by + 4)), P((bx + sx * r.uniform(-2, 4), by - r.uniform(7, 12))), 1.7 * K)
        cv.flat(hm, (214, 214, 224), 0.95)
    # bus-driver cap: orange crown, black band + gold piping, glossy peak, Maltese-cross badge
    cap_pts = [(44, 150), (50, 96), (86, 54), (150, 36), (214, 54), (250, 96), (256, 150),
               (228, 140), (190, 134), (150, 132), (110, 134), (72, 140)]
    crown = Part(Pl(spline(cap_pts, 6)), (242, 134, 30))
    crown.paint(blur(Ln((96, 62), (176, 54), 20).a, 7 * K), (255, 196, 108), 0.9)
    crown.paint(blur(E((226, 112), 30, 14).a, 6 * K), (170, 78, 10), 0.65)
    crown.shade(K, dark=0.4, light=0.15)
    cv.flat(blur(E((150, 156), 100, 11).a, 6 * K), (40, 20, 10), 0.4)
    cv.part(crown, outline=(60, 28, 12), ow=1.8 * K)
    band = Part(Pl([(42, 156), (46, 128), (150, 120), (254, 128), (258, 156), (150, 146)]), (36, 30, 36))
    band.paint(Cv((50, 134), (150, 126), (250, 134), 2.4).a, (224, 178, 64), 0.95)
    band.shade(K, dark=0.3, light=0.3)
    cv.part(band, outline=(18, 14, 18), ow=1.6 * K)
    cv.flat(Cv((40, 156), (150, 150), (260, 156), 4.0), (22, 18, 22))
    # Maltese-cross badge
    cv.flat(Cc((150, 80), 18), (140, 100, 30))
    cv.flat(Cc((150, 80), 16), (252, 224, 112))
    for ang in (0, 90, 180, 270):
        a = np.radians(ang)
        tip = (150 + np.cos(a) * 13, 80 + np.sin(a) * 13)
        l = (150 + np.cos(a + 0.45) * 6.5, 80 + np.sin(a + 0.45) * 6.5)
        r = (150 + np.cos(a - 0.45) * 6.5, 80 + np.sin(a - 0.45) * 6.5)
        cv.flat(Pl([tip, l, (150, 80), r]), (176, 28, 38))
    cv.flat(Cc((142, 72), 3.0), (255, 255, 255), 0.6)


def karmenu_spec():
    return HeadSpec(skin=(198, 142, 100), nose_col=(208, 128, 98), cheek=(214, 108, 84), lip=(164, 80, 76),
                    outline=[(150, 112), (208, 124), (238, 172), (246, 224), (232, 278), (194, 320), (150, 334)],
                    ear_x=104, ear_y=222, face_cy=224, stubble=0.5, stub_col=(150, 146, 156), wrinkle=0.7, gloss=0.6,
                    eye_w=22, eye_h=13, iris=(70, 44, 26), nose=1.4, brow_col=(206, 206, 216), brow_w=10,
                    glasses=True, hair_back=_karm_hair_back, post_features=_karm_post)


def _norm(name, eyes, mouth, brow):
    """Collapse expression combos that look identical so each is only painted once."""
    if name == "lou" and eyes in ("wide", "angry"):
        eyes = "open"
    if name == "lou":
        brow = -1 if (brow < 0 and eyes not in ("shut", "x")) else 1
    else:
        brow = 1 if brow >= 1 else (0 if brow == 0 else -1)
    return eyes, mouth, brow


def head(name, eyes="open", mouth="closed", brow=1):
    import hashlib
    eyes, mouth, brow = _norm(name, eyes, mouth, brow)
    cache_dir = os.path.join(os.path.dirname(HERE), ".cache")
    os.makedirs(cache_dir, exist_ok=True)
    tag = hashlib.md5(open(__file__, "rb").read()).hexdigest()[:8]
    path = os.path.join(cache_dir, "head_%s_%s_%s_%s_%s.npy" % (tag, name, eyes, mouth, brow))
    if os.path.exists(path):
        return np.load(path)
    if name == "lou":
        img = lou_head(eyes, mouth, brow)
    else:
        spec = ganni_spec() if name == "ganni" else karmenu_spec()
        img = paint_head(spec, eyes, mouth, brow)
    np.save(path, img)
    return img
