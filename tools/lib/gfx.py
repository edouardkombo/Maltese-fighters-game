"""Tiny anti-aliased vector/shading toolkit used by the sprite generators (numpy + OpenCV).

Everything is drawn at a high resolution and down-sampled afterwards.
Layers are float32 masks in [0,1]; canvases are premultiplied RGBA float32.
"""
import math
import numpy as np
import cv2

SH = 4  # sub-pixel bits for cv2 shift


def _p(pt):
    return (int(round(pt[0] * (1 << SH))), int(round(pt[1] * (1 << SH))))


class Mask:
    """A float mask the size of the working canvas."""

    def __init__(self, w, h):
        self.w, self.h = w, h
        self.a = np.zeros((h, w), np.float32)

    # -- primitives ---------------------------------------------------------
    def circle(self, c, r, grow=0.0):
        cv2.circle(self.a, _p(c), int(round((r + grow) * (1 << SH))), 1.0, -1, cv2.LINE_AA, SH)
        return self

    def ellipse(self, c, rx, ry, ang=0.0, grow=0.0):
        cv2.ellipse(self.a, _p(c), (int(round((rx + grow) * (1 << SH))), int(round((ry + grow) * (1 << SH)))),
                    ang, 0, 360, 1.0, -1, cv2.LINE_AA, SH)
        return self

    def poly(self, pts, grow=0.0):
        arr = np.array([_p(q) for q in pts], np.int32)
        cv2.fillPoly(self.a, [arr], 1.0, cv2.LINE_AA, SH)
        if grow:
            cv2.polylines(self.a, [arr], True, 1.0, max(1, int(round(grow * 2))), cv2.LINE_AA, SH)
        return self

    def line(self, a, b, w, grow=0.0):
        t = max(1, int(round((w + 2 * grow))))
        cv2.line(self.a, _p(a), _p(b), 1.0, t, cv2.LINE_AA, SH)
        r = (w + 2 * grow) / 2.0
        self.circle(a, r)
        self.circle(b, r)
        return self

    def capsule(self, a, b, w0, w1=None, grow=0.0):
        """Tapered limb segment: radius w0/2 at a, w1/2 at b."""
        if w1 is None:
            w1 = w0
        ra, rb = w0 / 2 + grow, w1 / 2 + grow
        dx, dy = b[0] - a[0], b[1] - a[1]
        n = math.hypot(dx, dy) or 1.0
        nx, ny = -dy / n, dx / n
        self.poly([(a[0] + nx * ra, a[1] + ny * ra), (b[0] + nx * rb, b[1] + ny * rb),
                   (b[0] - nx * rb, b[1] - ny * rb), (a[0] - nx * ra, a[1] - ny * ra)])
        self.circle(a, ra)
        self.circle(b, rb)
        return self

    def polyline(self, pts, w):
        for a, b in zip(pts[:-1], pts[1:]):
            self.line(a, b, w)
        return self

    def curve(self, p0, p1, p2, w, n=14):
        pts = []
        for i in range(n + 1):
            t = i / n
            pts.append(((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0],
                        (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]))
        return self.polyline(pts, w)

    def copy(self):
        m = Mask(self.w, self.h)
        m.a = self.a.copy()
        return m


def grown(mask, px):
    k = int(max(1, round(px)))
    ker = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * k + 1, 2 * k + 1))
    return np.clip(cv2.dilate(mask, ker), 0, 1)


def blur(a, s):
    return cv2.GaussianBlur(a, (0, 0), s)


def shifted(a, vx, vy):
    """result(p) = a(p + v)"""
    M = np.float32([[1, 0, -vx], [0, 1, -vy]])
    return cv2.warpAffine(a, M, (a.shape[1], a.shape[0]), flags=cv2.INTER_LINEAR, borderValue=0)


def rgb(c):
    return np.array(c[:3], np.float32)


def lighten(c, t):
    c = rgb(c)
    return c + (255 - c) * t


def darken(c, t):
    return rgb(c) * (1 - t)


def mix(a, b, t):
    return rgb(a) * (1 - t) + rgb(b) * t


class Part:
    """A coloured shape that can receive clipped detail strokes and volumetric shading.
    Works on the bounding box of the mask only (fast); detail masks are full-canvas arrays."""

    def __init__(self, mask, color, pad=12):
        full = mask.a if isinstance(mask, Mask) else mask
        H, W = full.shape
        ys = np.flatnonzero(full.max(1) > 0.001)
        xs = np.flatnonzero(full.max(0) > 0.001)
        if len(ys) == 0:
            ys, xs = np.array([0]), np.array([0])
        y0, y1 = max(0, ys[0] - pad), min(H, ys[-1] + 1 + pad)
        x0, x1 = max(0, xs[0] - pad), min(W, xs[-1] + 1 + pad)
        self.full = full
        self.sl = (slice(y0, y1), slice(x0, x1))
        self.m = full[self.sl]
        self.h, self.w = self.m.shape
        self.col = np.empty((self.h, self.w, 3), np.float32)
        self.col[:] = rgb(color)

    def paint(self, detail, color, alpha=1.0):
        d = (detail.a if isinstance(detail, Mask) else detail)[self.sl] * self.m * alpha
        self.col = self.col * (1 - d[..., None]) + rgb(color) * d[..., None]
        return self

    def paint_img(self, img_rgb, detail=None):
        im = img_rgb[self.sl]
        d = self.m if detail is None else (detail.a if isinstance(detail, Mask) else detail)[self.sl] * self.m
        self.col = self.col * (1 - d[..., None]) + im * d[..., None]
        return self

    def shade(self, scale, dark=0.42, light=0.28, light_dir=(-0.55, -0.85), tint=(40, 10, 30)):
        """Edge-based form shading: darker on the side facing away from the light."""
        lx, ly = light_dir
        r = max(1.0, scale * 2.6)
        b = blur(self.m, r)
        t = r * 1.15
        dk = np.clip(1.0 - shifted(b, -lx * t, -ly * t), 0, 1) * self.m
        lt = np.clip(1.0 - shifted(b, lx * t, ly * t), 0, 1) * self.m
        dk = np.clip(dk * 1.6, 0, 1)
        lt = np.clip(lt * 1.4, 0, 1) ** 1.2
        c = self.col
        c = c * (1 - dark * dk[..., None]) + np.array(tint, np.float32) * (dark * 0.25 * dk[..., None])
        c = c + (255 - c) * (light * lt[..., None])
        self.col = np.clip(c, 0, 255)
        return self


class Canvas:
    """Premultiplied RGBA float canvas."""

    def __init__(self, w, h):
        self.w, self.h = w, h
        self.pm = np.zeros((h, w, 4), np.float32)

    def over(self, color_rgb, alpha, sl=None):
        if sl is None:
            sl = (slice(0, self.h), slice(0, self.w))
        a = alpha[..., None]
        reg = self.pm[sl]
        reg[..., :3] = color_rgb * a + reg[..., :3] * (1 - a)
        reg[..., 3:4] = a + reg[..., 3:4] * (1 - a)

    def part(self, part, outline=(22, 10, 14), ow=0.0, outline_alpha=1.0):
        if ow > 0:
            o = np.clip(grown(part.m, ow), 0, 1) * outline_alpha
            self.over(np.array(outline[:3], np.float32), o, part.sl)
        self.over(part.col, part.m, part.sl)

    def flat(self, mask, color, alpha=1.0):
        m = (mask.a if isinstance(mask, Mask) else mask) * alpha
        self.over(rgb(color), m)

    def rgba_image(self, img, mask=None):
        """Composite a straight-alpha RGBA float image (h,w,4 in 0..255)."""
        a = img[..., 3] / 255.0
        if mask is not None:
            a = a * mask
        self.over(img[..., :3], a)

    def to_pil(self):
        from PIL import Image
        a = self.pm[..., 3:4]
        rgbv = np.where(a > 1e-4, self.pm[..., :3] / np.maximum(a, 1e-4), 0)
        out = np.concatenate([np.clip(rgbv, 0, 255), np.clip(a * 255, 0, 255)], axis=2).astype(np.uint8)
        return Image.fromarray(out, "RGBA")
