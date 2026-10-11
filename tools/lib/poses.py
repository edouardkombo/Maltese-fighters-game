"""Pose table shared by every fighter (same frame keys / timings as the original Ken moveset)."""
import math

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

