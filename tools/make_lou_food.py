#!/usr/bin/env python3
"""
Lou's Maltese 'super powers' - projectile sprites.
  light  : Pastizz  (flaky ricotta pastry)
  medium : Ricotta  (a big fresh blob)
  heavy  : Kinnie   (spinning bottle of Malta's bitter-orange soda)

Outputs: public/images/LouFood.png and src/entitites/fighters/LouFoodFrames.js
Run:     python3 tools/make_lou_food.py
"""
import math, json, os, random
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
S = 4; CW, CH = 64, 48; OX, OY = 32, 24
OUT = (40, 20, 14, 255)

def layer(): return Image.new("RGBA", (CW * S, CH * S), (0, 0, 0, 0))
def P(x, y): return ((OX + x) * S, (OY + y) * S)

def circ(d, c, r, fill, ow=0.8):
    x, y = P(*c)
    if ow: d.ellipse([x - (r + ow) * S, y - (r + ow) * S, x + (r + ow) * S, y + (r + ow) * S], fill=OUT)
    d.ellipse([x - r * S, y - r * S, x + r * S, y + r * S], fill=fill)
def ell(d, c, rx, ry, fill, ow=0.8):
    x, y = P(*c)
    if ow: d.ellipse([x - (rx + ow) * S, y - (ry + ow) * S, x + (rx + ow) * S, y + (ry + ow) * S], fill=OUT)
    d.ellipse([x - rx * S, y - ry * S, x + rx * S, y + ry * S], fill=fill)
def line(d, a, b, w, fill):
    A, B = P(*a), P(*b); d.line([A, B], fill=fill, width=max(1, int(w * S)))
    r = w * S / 2
    for c in (A, B): d.ellipse([c[0] - r, c[1] - r, c[0] + r, c[1] + r], fill=fill)
def poly(d, pts, fill, ow=1.0):
    q = [P(*p) for p in pts]; d.polygon(q, fill=fill)
    if ow: d.line(q + [q[0]], fill=OUT, width=int(ow * S), joint="curve")

def finish(im, angle=0):
    if angle: im = im.rotate(angle, resample=Image.BICUBIC, center=(OX * S, OY * S))
    small = im.resize((CW, CH), Image.BOX); px = small.load()
    for y in range(CH):
        for x in range(CW):
            r, g, b, a = px[x, y]
            if a < 110: px[x, y] = (0, 0, 0, 0)
            else:
                k = 255.0 / a if a < 255 else 1.0
                px[x, y] = tuple(min(255, int(c * k)) // 6 * 6 for c in (r, g, b)) + (255,)
    return small

# ------------------------------------------------------------- flying frames
def pastizz(step):
    im = layer(); d = ImageDraw.Draw(im)
    GOLD, GOLD_L, GOLD_D = (226, 164, 62, 255), (248, 214, 120, 255), (168, 96, 30, 255)
    body = [(-18, 1), (-9, -8), (9, -8), (18, 1), (9, 9), (-9, 9)]
    poly(d, body, GOLD, ow=1.2)
    ell(d, (0, -1), 12, 6.5, GOLD_L, ow=0)
    for k, off in enumerate((-4.5, 0, 4.5)):                       # pleats
        line(d, (-15, off * 0.55 + 1), (0, off - 1.5), 1.1, GOLD_D)
        line(d, (0, off - 1.5), (15, off * 0.55 + 1), 1.1, GOLD_D)
    ell(d, (0, -1), 6.5, 2.4, (252, 248, 232, 255), ow=0.7)       # ricotta peeking out
    line(d, (-4, -1), (4, -1), 0.8, (222, 214, 190, 255))
    if step == 1:                                                    # steam
        for sx in (-6, 2, 9):
            line(d, (sx, -11), (sx + 2, -15), 1.1, (250, 250, 250, 220)); line(d, (sx + 2, -15), (sx - 1, -19), 1.1, (250, 250, 250, 200))
    return finish(im, 14 if step == 0 else -14)

def ricotta(step):
    im = layer(); d = ImageDraw.Draw(im)
    W, W_S, W_D = (252, 250, 242, 255), (226, 222, 204, 255), (190, 184, 160, 255)
    for c, r in (((-6, 2), 8.5), ((6, 2), 8.5), ((0, -3), 9.5)): circ(d, c, r, W_S, ow=1.1)
    for c, r in (((-6, 0.5), 7.2), ((6, 0.5), 7.2), ((0, -4.5), 8.2)): circ(d, c, r, W, ow=0)
    circ(d, (-3, -8), 2.4, (255, 255, 255, 255), ow=0)
    for sx in (-8, 0, 7): circ(d, (sx, 7 + (1 if step else 0)), 1.2, W_D, ow=0)
    circ(d, (-12, 9 if step else 7), 2.2, W, ow=0.8); circ(d, (13, 8 if step else 10), 1.8, W, ow=0.8)
    return finish(im, -10 if step == 0 else 10)

def kinnie(step):
    im = layer(); d = ImageDraw.Draw(im)
    GL, GL_L, CAP = (120, 64, 20, 255), (176, 108, 44, 255), (212, 40, 40, 255)
    poly(d, [(-17, -5), (6, -6), (6, 6), (-17, 5)], GL, ow=1.2)
    circ(d, (-16.5, 0), 5.3, GL, ow=0)
    poly(d, [(6, -6), (14, -2.4), (14, 2.4), (6, 6)], GL, ow=1.2)
    poly(d, [(14, -3.2), (18, -3.2), (18, 3.2), (14, 3.2)], CAP, ow=1.0)
    poly(d, [(-9, -5.8), (2, -5.8), (2, 5.8), (-9, 5.8)], (244, 150, 34, 255), ow=1.0)   # label
    poly(d, [(-7, -2.5), (0, -2.5), (0, 2.5), (-7, 2.5)], (252, 236, 200, 255), ow=0)
    line(d, (-5, -1.5), (-5, 1.5), 1.0, CAP); line(d, (-5, 0), (-2, -1.5), 1.0, CAP); line(d, (-5, 0), (-2, 1.5), 1.0, CAP)
    line(d, (-14, -3), (4, -3.6), 1.0, GL_L)
    for bx, by, br in ((-24, -3, 2.0), (-28, 3, 1.5), (-22, 5, 1.2)):                      # foam trail
        circ(d, (bx, by + (2 if step else 0)), br, (252, 252, 252, 255), ow=0.6)
    return finish(im, 18 if step == 0 else -18)

# ------------------------------------------------------------- hit bursts
def burst(kind, i):
    im = layer(); d = ImageDraw.Draw(im); rnd = random.Random(7 + i * 13 + len(kind))
    radius = (8, 14, 19)[i]; n = (9, 10, 7)[i]; size = (3.2, 2.8, 1.8)[i]
    cols = {"pastizz": [(226, 164, 62, 255), (248, 214, 120, 255), (168, 96, 30, 255)],
            "ricotta": [(252, 250, 242, 255), (226, 222, 204, 255), (252, 250, 242, 255)],
            "kinnie":  [(244, 150, 34, 255), (252, 252, 252, 255), (120, 64, 20, 255)]}[kind]
    if i < 2:
        circ(d, (0, 0), (9, 7)[i], cols[1] if kind != "kinnie" else (252, 214, 150, 255), ow=1.0)
    for k in range(n):
        a = 2 * math.pi * k / n + rnd.random() * 0.4; r = radius * (0.7 + 0.5 * rnd.random())
        c = (math.cos(a) * r, math.sin(a) * r * 0.8)
        if kind == "pastizz": poly(d, [(c[0] - size, c[1]), (c[0], c[1] - size), (c[0] + size, c[1]), (c[0], c[1] + size)], cols[k % 3], ow=0.7)
        else: circ(d, c, size * (0.7 + 0.5 * rnd.random()), cols[k % 3], ow=0.7)
    return finish(im)

TYPES = {"pastizz": (pastizz, [-14, -10, 28, 20]), "ricotta": (ricotta, [-12, -10, 24, 20]), "kinnie": (kinnie, [-16, -7, 32, 14])}

def main():
    sheet = Image.new("RGBA", (5 * CW, len(TYPES) * CH), (0, 0, 0, 0)); table = {}
    for row, (kind, (fn, box)) in enumerate(TYPES.items()):
        frames = [("fly-1", fn(0)), ("fly-2", fn(1)), ("hit-1", burst(kind, 0)), ("hit-2", burst(kind, 1)), ("hit-3", burst(kind, 2))]
        for col, (name, img) in enumerate(frames):
            sheet.paste(img, (col * CW, row * CH))
            table[f"{kind}-{name}"] = dict(rect=[col * CW, row * CH, CW, CH], origin=[OX, OY])
        table[f"{kind}-box"] = box
    sheet.save(os.path.join(ROOT, "public", "images", "LouFood.png"))
    js = ["// AUTO-GENERATED by tools/make_lou_food.py - do not edit by hand.",
          "export const LouFoodSheet = " + json.dumps(table, indent=1) + ";", ""]
    open(os.path.join(ROOT, "src", "entitites", "fighters", "LouFoodFrames.js"), "w").write("\n".join(js))
    prev = Image.new("RGBA", sheet.size, (110, 160, 200, 255)); prev.alpha_composite(sheet)
    prev.resize((sheet.width * 3, sheet.height * 3), Image.NEAREST).save("/tmp/food_contact.png")
    print("ok", sheet.size)

if __name__ == "__main__": main()
