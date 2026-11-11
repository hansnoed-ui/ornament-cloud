import glob, os, sys
from PIL import Image
FMT = sys.argv[1] if len(sys.argv) > 1 else "16x9"
# Mitte des Farbrings (Rad), Mitte des Signets, Halbmesser der Maske, Verkleinerung des Rads, Vergrösserung des Signets am Anfang
M = {"16x9": dict(W=1920, H=1080, RC=(960, 480), RD=(960, 462), R=262, KR=.37, KS=.59),
     "4x5": dict(W=1080, H=1350, RC=(540, 625), RD=(537, 562), R=222, KR=.05, KS=.05)}[FMT]
W, H = M["W"], M["H"]
OUT = f"final-{FMT}"; os.makedirs(OUT, exist_ok=True)
T = {k: sorted(glob.glob(f"teil-{FMT}-{k}/*.jpg")) for k in "ABCD"}
n = 0
def raus(im):
    global n; im.save(f"{OUT}/{n:05d}.jpg", quality=94); n += 1
lade = lambda f: Image.open(f).convert("RGB")
def sanft(p): return p * p * (3 - 2 * p)
def zoom(im, s, cx, cy, tx=None, ty=None):
    # um (cx, cy) skalieren und diesen Punkt nach (tx, ty) legen, Rand schwarz
    tx = cx if tx is None else tx; ty = cy if ty is None else ty
    w, h = int(W * s), int(H * s); z = im.resize((w, h), Image.LANCZOS)
    out = Image.new("RGB", (W, H)); out.paste(z, (int(tx - cx * s), int(ty - cy * s))); return out
def blende(a, b, n_ueber, nach=None):
    for i in range(n_ueber):
        p = sanft((i + 1) / (n_ueber + 1))
        raus(Image.blend(lade(a[i]), lade(b[i]), p))
A, B, C, D = T["A"], T["B"], T["C"], T["D"]
X1, X2, X3 = 18, 12, 30
for f in A[:-X1]: raus(lade(f))
blende(A[-X1:], B[:X1], X1)
for f in B[X1:-X2]: raus(lade(f))
blende(B[-X2:], C[:X2], X2)
for f in C[X2:-X3]: raus(lade(f))
# Farbring wird Signet: Rad schrumpft auf die Grösse des Signets und blendet ab, das Signet kommt aus der Grösse des Rads
RC, RD = M["RC"], M["RD"]
from PIL import ImageDraw, ImageFilter
maske = Image.new("L", (W, H), 0); ImageDraw.Draw(maske).ellipse((RC[0] - M["R"], RC[1] - M["R"], RC[0] + M["R"], RC[1] + M["R"]), fill=255)
maske = maske.filter(ImageFilter.GaussianBlur(10))
schwarz = Image.new("RGB", (W, H))
for i in range(X3):
    p = (i + 1) / (X3 + 1)
    rad = lade(C[-X3 + i])
    # erst weicht die Farbfläche um das Rad ins Schwarz, dann schrumpft der Ring und geht ins Signet über
    m = Image.eval(maske, lambda v, a=sanft(min(1, p * 2.2)): int(255 - (255 - v) * a))
    rad = Image.composite(rad, schwarz, m)
    q = sanft(max(0, (p - .3) / .7))
    mx, my = RC[0] + (RD[0] - RC[0]) * q, RC[1] + (RD[1] - RC[1]) * q   # beide Mitten wandern gemeinsam vom Rad zum Signet
    a = zoom(rad, 1 - M["KR"] * q, *RC, mx, my)
    b = zoom(lade(D[i]), 1 + M["KS"] * (1 - q), *RD, mx, my)
    raus(Image.blend(a, b, q))
rest = D[X3:]
for i, f in enumerate(rest):
    im = lade(f); k = len(rest) - i
    if k <= 36: im = Image.blend(Image.new("RGB", (W, H)), im, sanft(k / 37))
    raus(im)
print(n, "Bilder", n / 30, "s")
