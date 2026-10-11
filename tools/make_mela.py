#!/usr/bin/env python3
"""Generates the 'MELA!' projectile sheet (public/images/mela.png) + src/entitites/fighters/sheets/mela.js"""
import json, math, os, sys
import numpy as np, cv2
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from lib.gfx import Mask, blur

RS, SS = 3, 2
CW, CH = 64, 48
ORX, ORY = 38, 24          # orb centre inside the cell (game px)
W, H = CW * RS * SS, CH * RS * SS
D = RS * SS
KINDS = {  # core, glow, flame
    "lou":     dict(core=(255, 255, 255), glow=(70, 170, 255), flame=(30, 90, 220), spark=(190, 235, 255)),
    "ganni":   dict(core=(255, 250, 240), glow=(255, 60, 60), flame=(214, 24, 36), spark=(255, 220, 120)),
    "karmenu": dict(core=(255, 252, 220), glow=(255, 190, 40), flame=(244, 130, 20), spark=(255, 255, 200)),
}
NAMES = ["fly-1", "fly-2", "hit-1", "hit-2", "hit-3"]

def P(x, y): return (x * D, y * D)

def cross(m, c, r, rot):
    """8-pointed Maltese cross."""
    for k in range(4):
        a = rot + k * math.pi / 2
        tip = (c[0] + math.cos(a) * r, c[1] + math.sin(a) * r)
        l = (c[0] + math.cos(a + 0.5) * r * 0.5, c[1] + math.sin(a + 0.5) * r * 0.5)
        rr = (c[0] + math.cos(a - 0.5) * r * 0.5, c[1] + math.sin(a - 0.5) * r * 0.5)
        # forked tip (two points) for the classic notch
        n1 = (c[0] + math.cos(a + 0.2) * r, c[1] + math.sin(a + 0.2) * r)
        n2 = (c[0] + math.cos(a - 0.2) * r, c[1] + math.sin(a - 0.2) * r)
        nm = (c[0] + math.cos(a) * r * 0.82, c[1] + math.sin(a) * r * 0.82)
        m.poly([P(*c), P(*l), P(*n1), P(*nm), P(*n2), P(*rr)])

def over(pm, rgb, a):
    a = a[..., None]
    pm[..., :3] = np.array(rgb, np.float32) * a + pm[..., :3] * (1 - a)
    pm[..., 3:4] = a + pm[..., 3:4] * (1 - a)

def fly(k, ph):
    pal = KINDS[k]; pm = np.zeros((H, W, 4), np.float32)
    c = (ORX, ORY)
    # glow
    g = Mask(W, H).circle(P(*c), 17 * D).a
    over(pm, pal["glow"], blur(g, 5 * D) * 0.75)
    # flame tail: wavy teardrops trailing left
    for i in range(7):
        t = i / 6
        x = c[0] - 8 - t * 26
        y = c[1] + math.sin(ph * 2.2 + t * 6) * (2 + t * 3)
        r = (9 - t * 7)
        m = Mask(W, H).ellipse(P(x, y), r * 1.5 * D, r * D)
        over(pm, pal["flame"], blur(m.a, 0.8 * D) * (0.95 - t * 0.5))
        m2 = Mask(W, H).ellipse(P(x + 1, y), r * 0.9 * D, r * 0.55 * D)
        over(pm, pal["spark"], blur(m2.a, 0.6 * D) * (0.9 - t * 0.6))
    # orb
    orb = Mask(W, H).circle(P(*c), 11.5 * D).a
    over(pm, (60, 10, 14), np.clip(cv2.dilate(orb, np.ones((5, 5), np.uint8)), 0, 1))
    over(pm, pal["flame"], orb)
    over(pm, pal["glow"], blur(Mask(W, H).circle(P(c[0] + 2, c[1] + 2), 8 * D).a, 2 * D) * 0.8)
    over(pm, (255, 255, 255), blur(Mask(W, H).ellipse(P(c[0] - 4, c[1] - 5), 4 * D, 2.4 * D, -30).a, 0.6 * D) * 0.9)
    cm = Mask(W, H); cross(cm, c, 8.6, ph * 0.9)
    over(pm, (90, 10, 20), np.clip(cv2.dilate(cm.a, np.ones((4, 4), np.uint8)), 0, 1))
    over(pm, pal["core"], cm.a)
    # sparks
    rng = np.random.RandomState(int(ph * 10) + 3)
    for _ in range(9):
        sx, sy = c[0] - rng.uniform(6, 30), c[1] + rng.uniform(-12, 12)
        over(pm, pal["spark"], Mask(W, H).circle(P(sx, sy), rng.uniform(0.5, 1.2) * D).a * 0.9)
    return pm

def hit(k, n):
    pal = KINDS[k]; pm = np.zeros((H, W, 4), np.float32)
    c = (ORX - 4, ORY)
    r = [9, 15, 19][n]; fade = [1.0, 0.8, 0.5][n]
    over(pm, pal["glow"], blur(Mask(W, H).circle(P(*c), r * D).a, 4 * D) * fade)
    ring = Mask(W, H).circle(P(*c), r * D).a - Mask(W, H).circle(P(*c), (r - 3 + n) * D).a
    over(pm, pal["flame"], np.clip(ring, 0, 1) * fade)
    over(pm, pal["core"], np.clip(ring, 0, 1) * 0.0)
    cm = Mask(W, H); cross(cm, c, 9 - n * 2.2, n * 0.6 + 0.3)
    over(pm, pal["core"], cm.a * fade)
    rng = np.random.RandomState(n + 40)
    for _ in range(14):
        a = rng.uniform(0, 6.28); d = r * rng.uniform(0.7, 1.4)
        over(pm, pal["spark"], Mask(W, H).circle(P(c[0] + math.cos(a) * d, c[1] + math.sin(a) * d), rng.uniform(0.6, 1.3) * D).a * fade)
    return pm

def down(pm):
    s = cv2.resize(pm, (CW * RS, CH * RS), interpolation=cv2.INTER_AREA)
    a = s[..., 3:4]; rgb = np.where(a > 1e-4, s[..., :3] / np.maximum(a, 1e-4), 0)
    return Image.fromarray(np.concatenate([np.clip(rgb, 0, 255), np.clip(a * 255, 0, 255)], 2).astype(np.uint8), "RGBA")

sheet = Image.new("RGBA", (len(NAMES) * CW * RS, len(KINDS) * CH * RS), (0, 0, 0, 0))
frames = {}
for r, k in enumerate(KINDS):
    for i, n in enumerate(NAMES):
        pm = fly(k, i * 1.7) if n.startswith("fly") else hit(k, int(n[-1]) - 1)
        sheet.paste(down(pm), (i * CW * RS, r * CH * RS))
        frames["%s-%s" % (k, n)] = dict(rect=[i * CW * RS, r * CH * RS, CW * RS, CH * RS], origin=[ORX * RS, ORY * RS])
sheet.save(os.path.join(ROOT, "public", "images", "mela.png"), optimize=True)
os.makedirs(os.path.join(ROOT, "src", "entitites", "fighters", "sheets"), exist_ok=True)
open(os.path.join(ROOT, "src", "entitites", "fighters", "sheets", "mela.js"), "w").write(
    "// AUTO-GENERATED by tools/make_mela.py\nexport const MelaSheet = %s;\n" % json.dumps(dict(scale=RS, box=[-14, -13, 28, 26], frames=frames), indent=1))
print("mela ok")
