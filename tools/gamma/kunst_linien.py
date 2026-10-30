"""Bearbeitet ein Foto aus der Praxis und rechnet daraus die Zeichnung für die Seite «Kunst» auf ornament.cloud/gamma/ vor.
Aufruf: python3 tools/gamma/kunst_linien.py foto.jpg [name] [lage] [vorschau.png]
  name: Dateiname ohne Endung (kunst), lage: wo das Quadrat im Hochformat sitzt, 0 oben bis 1 unten (0.5).
Schreibt gamma/bilder/<name>-foto.webp und gamma/bilder/<name>-linien.webp (verlustfrei), beide quadratisch.
Bearbeitung (Christian, 30. Oktober 2026: jedes Foto für diese Seite zuerst sauber bearbeiten): Display P3 nach sRGB, ohne kräftige Farben
abzuschneiden; Weissabgleich nur, wo fast farblose helle Stellen einen Stich zeigen; Farbrauschen stark, Helligkeitsrauschen leicht und vor allem in
den Schatten mindern; das Licht grossflächig ausgleichen (dunkle Ecken heben, Lichtflecken dämpfen); gelbe, mittel gesättigte Flächen etwas ruhiger,
kräftige Farben bleiben; beim Verkleinern leicht nachschärfen.
Die Linien folgen den Formen des Fotos und stehen dicht, wo es hell ist: wie weisse Kreide auf getöntem Papier.
In den Linien ist Rot die Deckung, Grün der Zeitpunkt (0–254), an dem die Linie an dieser Stelle gezeichnet wird (255: nie),
Blau 255 für Umrisse und 0 für Schraffur. So kann die Seite die Zeichnung wachsen lassen, ohne Linien zu kennen: ein Wert im Shader genügt."""
import io, sys, math, random, pathlib
from collections import deque
import numpy as np
from PIL import Image, ImageCms, ImageDraw, ImageFilter, ImageOps
from scipy import ndimage as nd

WURZEL = pathlib.Path(__file__).resolve().parents[2]
B, FOTO_B, S = 1200, 1440, 3          # Breite der Zeichnung, Breite des Fotos, Überabtastung beim Zeichnen
SCHRITT, LANG, KURZ = .8, 260, 12      # Schrittweite, längste und kürzeste Linie in Pixeln der Zeichnung
random.seed(7); np.random.seed(7)

def box(a, r): return nd.uniform_filter(a, 2 * r + 1, mode="reflect")
def gefuehrt(I, p, r, eps):
    mI, mp = box(I, r), box(p, r); cov = box(I * p, r) - mI * mp; var = box(I * I, r) - mI * mI
    A = cov / (var + eps); Bq = mp - A * mI
    return box(A, r) * I + box(Bq, r)
def lin(a): return np.where(a <= .04045, a / 12.92, ((a + .055) / 1.055) ** 2.4)
def enc(a): a = np.clip(a, 0, 1); return np.where(a <= .0031308, a * 12.92, 1.055 * a ** (1 / 2.4) - .055)
def bearbeiten(bild):
    icc = bild.info.get("icc_profile")
    prof = ImageCms.getProfileDescription(ImageCms.ImageCmsProfile(io.BytesIO(icc))) if icc else ""
    if icc and "P3" not in prof: bild = ImageCms.profileToProfile(bild, ImageCms.ImageCmsProfile(io.BytesIO(icc)), ImageCms.createProfile("sRGB"), renderingIntent=0, outputMode="RGB")
    a = np.asarray(bild.convert("RGB"), np.float32) / 255
    l = lin(a)
    if "P3" in prof:
        # Display P3 nach sRGB, Farben ausserhalb weich in den Farbraum geholt statt abgeschnitten
        l = l @ np.array([[1.2249, -.2247, 0], [-.042, 1.0419, 0], [-.0197, -.0786, 1.0979]], np.float32).T
        l = np.minimum(l, 1)   # zu helle Kanäle abschneiden: so bleibt Orange kräftig, statt blass zu werden
        Yl = np.clip(l @ np.array([.2126, .7152, .0722], np.float32), 0, 1)[..., None]; c = l - Yl
        erlaubt = np.where(c < 0, Yl / np.maximum(-c, 1e-6), 1e9)
        u = 1 / np.maximum(erlaubt.min(2, keepdims=True), 1e-6); k = .9
        u2 = np.where(u > k, k + (1 - k) * np.tanh((u - k) / (1 - k)), u)
        l = Yl + c * (u2 / np.maximum(u, 1e-6)); print("P3 nach sRGB, ausserhalb:", round(float((u > 1).mean() * 100), 2), "%")
    # Weissabgleich
    Y = l @ np.array([.2126, .7152, .0722], np.float32); mx, mn = l.max(2), l.min(2)
    kand = (Y > np.percentile(Y, 97)) & ((mx - mn) / (mx + 1e-4) < .2) & (mx < .97)
    if kand.sum() > 500:
        ref = l[kand].mean(0); g = ref.mean() / ref; g = 1 + .5 * (g - 1); print("Weiss", ref.round(3), "Faktor", g.round(3)); l *= g
    a = enc(l).astype(np.float32); del l
    # Rauschen: Farbe stark, Helligkeit leicht und vor allem in den Schatten
    Y = a @ np.array([.299, .587, .114], np.float32); cb, cr = a[..., 2] - Y, a[..., 0] - Y
    cb, cr = gefuehrt(Y, cb, 3, 3e-4), gefuehrt(Y, cr, 3, 3e-4)
    Yg = gefuehrt(Y, Y, 2, 6e-4); w = .25 + .45 * (1 - np.clip(Y / .45, 0, 1)); Y = Y + w * (Yg - Y)
    R = Y + cr; Bc = Y + cb; G = (Y - .299 * R - .114 * Bc) / .587
    a = np.dstack([R, G, Bc]); del R, G, Bc, cb, cr, Yg
    # Schwarz- und Weisspunkt, Schatten heben
    Y = a @ np.array([.299, .587, .114], np.float32)
    bp, wp = min(np.percentile(Y, .05), .035), max(np.percentile(Y, 99.95), .9); print("Punkte", round(float(bp),3), round(float(wp),3))
    a = (a - bp) / (wp - bp); Y = (Y - bp) / (wp - bp)
    Yc = np.clip(Y, 0, 1)
    # Licht ausgleichen wie beim Abwedeln: grossflächig dunkle Stellen heben, sehr helle etwas dämpfen, Kanten bleiben (geführter Filter)
    klein = Yc[::8, ::8]; basis = gefuehrt(klein, klein, 24, 1e-2)
    basis = nd.zoom(basis, (Yc.shape[0] / basis.shape[0], Yc.shape[1] / basis.shape[1]), order=1)[:Yc.shape[0], :Yc.shape[1]]
    mittel = float(np.median(basis)); ausgl = np.clip((mittel / np.maximum(basis, .02)) ** .28, .82, 1.6)
    Yc = np.clip(Yc * ausgl, 0, 1); print("Ausgleich", round(float(ausgl.min()),2), round(float(ausgl.max()),2))
    Yn = Yc + .22 * Yc * (1 - Yc) ** 3
    Yn = Yn + .16 * (Yn * Yn * (3 - 2 * Yn) - Yn)   # etwas Kontrast in den Mitten zurück
    Yc = np.clip(Y, 0, 1)
    a = a * (Yn / np.maximum(Yc, 1e-3))[..., None]
    # Sättigung: die Wand (Gelb bis Orange, mittel gesättigt) etwas ruhiger, kräftige Farben bleiben
    mx, mn = a.max(2), a.min(2); s = (mx - mn) / (mx + 1e-4)
    r_, g_, b_ = a[..., 0], a[..., 1], a[..., 2]
    hue = np.degrees(np.arctan2(np.sqrt(3) * (g_ - b_), 2 * r_ - g_ - b_)) % 360
    gelb = np.clip(1 - np.abs(hue - 40) / 28, 0, 1) * np.clip(1 - (s - .45) / .3, 0, 1)
    Y = a @ np.array([.299, .587, .114], np.float32)
    a = Y[..., None] + (a - Y[..., None]) * (1 - .14 * gelb)[..., None]
    return np.clip(a, 0, 1)

name = sys.argv[2] if len(sys.argv) > 2 else "kunst"
lage = float(sys.argv[3]) if len(sys.argv) > 3 else .5
a = bearbeiten(ImageOps.exif_transpose(Image.open(sys.argv[1])))
# Quadrat: die Bühne ist am Handy quadratisch, am Computer breiter (dort zeigt sie die Mitte des Quadrats)
h, w = a.shape[:2]; q = min(h, w); y0 = round((h - q) * lage); x0 = round((w - q) / 2)
quelle = Image.fromarray((a[y0:y0 + q, x0:x0 + q] * 255 + .5).astype(np.uint8))
foto = quelle.resize((FOTO_B, FOTO_B), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=.8, percent=35, threshold=1))
foto.save(WURZEL / f"gamma/bilder/{name}-foto.webp", quality=78, method=6)
H = B

# Helligkeit, auf die mittleren 96 % gestreckt
f = np.asarray(quelle.resize((B, H), Image.LANCZOS), dtype=np.float32) / 255
L = f[..., 0] * .3 + f[..., 1] * .59 + f[..., 2] * .11
lo, hi = np.percentile(L, [2, 98]); L = np.clip((L - lo) / max(hi - lo, 1e-3), 0, 1)
Lg = nd.gaussian_filter(L, 2)

# Umrisse: Kanten nach Helligkeit und Farbe (wie Canny, mit Farbtensor, damit auch Rot neben Orange zählt), verkettet und geglättet
lab = np.dstack([L, (f[..., 0] - f[..., 1]) * .7, ((f[..., 0] + f[..., 1]) / 2 - f[..., 2]) * .7])
gk = [nd.gaussian_filter(lab[..., c], 2.2) for c in range(3)]
ex, ey = [nd.sobel(g, 1) for g in gk], [nd.sobel(g, 0) for g in gk]
Exx, Eyy, Exy = sum(a * a for a in ex), sum(b * b for b in ey), sum(a * b for a, b in zip(ex, ey))
mag = np.sqrt(np.maximum(.5 * (Exx + Eyy + np.sqrt((Exx - Eyy) ** 2 + 4 * Exy ** 2)), 0))
ang = .5 * np.arctan2(2 * Exy, Exx - Eyy)
yy, xx = np.mgrid[0:H, 0:B].astype(np.float32); cdx, cdy = np.cos(ang), np.sin(ang)
m1 = nd.map_coordinates(mag, [yy + cdy, xx + cdx], order=1, mode="nearest"); m2 = nd.map_coordinates(mag, [yy - cdy, xx - cdx], order=1, mode="nearest")
nms = (mag >= m1) & (mag >= m2)
hoch = np.percentile(mag, 95); stark, schwach = nms & (mag > hoch), nms & (mag > .45 * hoch)
lb, n = nd.label(schwach, structure=np.ones((3, 3))); behalten = np.zeros(n + 1, bool); behalten[np.unique(lb[stark])] = True; behalten[0] = False
kanten = behalten[lb]
pix = set(zip(*np.nonzero(kanten))); besucht = set()
def nachbarn(p): return [(p[0] + j, p[1] + i) for j in (-1, 0, 1) for i in (-1, 0, 1) if (j or i) and (p[0] + j, p[1] + i) in pix]
def gehen(p):
    k = [p]; besucht.add(p)
    while True:
        nx = [q for q in nachbarn(p) if q not in besucht]
        if not nx: return k
        p = min(nx, key=lambda q: abs(q[0] - p[0]) + abs(q[1] - p[1])); besucht.add(p); k.append(p)
ketten = [gehen(p) for p in sorted(pix) if len(nachbarn(p)) == 1 and p not in besucht]
ketten += [gehen(p) for p in sorted(pix) if p not in besucht]
umrisse = []
for k in ketten:
    # kurze Stücke und schwache Kanten (Körnung der Wand) weglassen, lange Risse und Formen bleiben
    a_ = np.array(k, np.float32)
    if len(k) < 40 or mag[a_[:, 0].astype(int), a_[:, 1].astype(int)].mean() < 1.1 * hoch: continue
    ys_, xs_ = nd.gaussian_filter1d(a_[:, 0], 2.5, mode="nearest") + .5, nd.gaussian_filter1d(a_[:, 1], 2.5, mode="nearest") + .5
    umrisse.append(list(zip(xs_[::2].tolist(), ys_[::2].tolist())))
print(len(umrisse), "Umrisse")

# Schraffur: schräg von links unten nach rechts oben, leicht schwankend; nahe an Umrissen legt sie sich an deren Richtung an
Es = [nd.gaussian_filter(a, 4) for a in (Exx, Exy, Eyy)]
tang = .5 * np.arctan2(2 * Es[1], Es[0] - Es[2]) + math.pi / 2
phi = -.8 + .22 * nd.gaussian_filter(np.random.randn(H, B), 120) / .0024
zug = np.zeros((H, B), np.float32)
for u in umrisse:
    for x, y in u: zug[min(int(y), H - 1), min(int(x), B - 1)] = 1
nah = np.clip(nd.gaussian_filter(zug, 6) / .045, 0, 1) ** 1.5
C2, S2 = (1 - nah) * np.cos(2 * phi) + nah * np.cos(2 * tang), (1 - nah) * np.sin(2 * phi) + nah * np.sin(2 * tang)
# Dichte: hell dicht, dunkel weit, ganz dunkel leer
dichte = np.clip((Lg - .18) / .74, 0, 1) ** .9
ABST = 23 - 12.5 * dichte   # weit gestellt: eine feine, einfache Skizze, die Umrisse tragen

def wert(a, x, y):
    x = min(max(x, 0), B - 1.001); y = min(max(y, 0), H - 1.001); i, j = int(x), int(y); u, v = x - i, y - j
    return (a[j, i] * (1 - u) + a[j, i + 1] * u) * (1 - v) + (a[j + 1, i] * (1 - u) + a[j + 1, i + 1] * u) * v

def richtung(x, y, vor):
    w = .5 * math.atan2(wert(S2, x, y), wert(C2, x, y)); dx, dy = math.cos(w), math.sin(w)
    return (-dx, -dy) if vor and dx * vor[0] + dy * vor[1] < 0 else (dx, dy)

ZELLE = 3; gitter = {}
def eintragen(pk, nr):
    for px, py in pk: gitter.setdefault((int(px / ZELLE), int(py / ZELLE)), []).append((px, py, nr))
def frei(x, y, d, ausser=None):
    r = int(d / ZELLE) + 1; ci, cj = int(x / ZELLE), int(y / ZELLE)
    for j in range(cj - r, cj + r + 1):
        for i in range(ci - r, ci + r + 1):
            for (px, py, li) in gitter.get((i, j), ()):
                if li != ausser and (px - x) ** 2 + (py - y) ** 2 < d * d: return False
    return True
for u in umrisse: eintragen(u, -1)

def wachsen(x0, y0, nr, zeichen):
    pkte, vor, x, y = [], None, x0, y0
    for n in range(int(LANG / SCHRITT)):
        if not (0 <= x < B and 0 <= y < H): break
        d = wert(dichte, x, y)
        if d < .04 or not frei(x, y, .6 * wert(ABST, x, y), nr): break
        # gegen Schlaufen: nicht zu nah an die eigenen älteren Punkte
        if n > 30 and n % 4 == 0 and any((px - x) ** 2 + (py - y) ** 2 < 4 for px, py in pkte[:-25]): break
        pkte.append((x, y))
        dx, dy = richtung(x, y, vor); dx, dy = dx * zeichen, dy * zeichen
        mx, my = x + dx * SCHRITT / 2, y + dy * SCHRITT / 2
        ex_, ey_ = richtung(mx, my, (dx, dy)); vor = (ex_, ey_); x += ex_ * SCHRITT; y += ey_ * SCHRITT
        zeichen = 1
    return pkte

schraffur = []
keime = deque()
raster = [(x + random.random() * 6, y + random.random() * 6) for y in range(0, H, 6) for x in range(0, B, 6)]
random.shuffle(raster)
while keime or raster:
    x, y = keime.popleft() if keime else raster.pop()
    if not (0 <= x < B and 0 <= y < H) or wert(dichte, x, y) < .04 or not frei(x, y, wert(ABST, x, y)): continue
    nr = len(schraffur)
    rueck = wachsen(x, y, nr, -1); vor = wachsen(x, y, nr, 1)
    pk = rueck[::-1] + vor[1:]
    if len(pk) * SCHRITT < KURZ: continue
    schraffur.append(pk); eintragen(pk, nr)
    # Nachbarn: im Abstand quer zur Linie neue Keime, zuerst abgearbeitet, so entstehen Lagen paralleler Striche
    for k in range(0, len(pk) - 1, 7):
        (ax, ay), (bx, by) = pk[k], pk[k + 1]; l = math.hypot(bx - ax, by - ay) or 1; nx, ny = -(by - ay) / l, (bx - ax) / l
        d = wert(ABST, ax, ay)
        keime.appendleft((ax + nx * d, ay + ny * d)); keime.appendleft((ax - nx * d, ay - ny * d))
print(len(schraffur), "Schraffurlinien")

# Reihenfolge: erst die Umrisse (lange und mittige zuerst), dann die Schraffur, Lage um Lage von der Mitte nach aussen.
# Zeit 0 bis 1; Umrisse laufen langsam wie mit dem Stift gezogen, Schraffurstriche schnell
def ordnen(linien, von, bis, dauer):
    if not linien: return []
    lg = np.array([len(p) for p in linien], np.float32) * np.array([math.hypot(p[1][0] - p[0][0], p[1][1] - p[0][1]) for p in linien], np.float32)
    rang = np.argsort(np.argsort(-lg)) / max(len(linien) - 1, 1)
    sp = np.array([min(1, math.hypot(p[len(p) // 2][0] / B - .5, p[len(p) // 2][1] / H - .5) / .62) for p in linien], np.float32)
    k = .45 * rang + .55 * sp + .06 * np.random.rand(len(linien)); k = (k - k.min()) / (np.ptp(k) or 1)
    return [(von + (bis - von) * k[i], dauer * lg[i] / lg.max(), lg[i]) for i in range(len(linien))]
striche = [(p, *z, 255, 1.05) for p, z in zip(umrisse, ordnen(umrisse, 0, .4, .2))] + [(p, *z, 120, 0) for p, z in zip(schraffur, ordnen(schraffur, .3, .9, .08))]
tinte = Image.new("L", (B * S, H * S), 0); zeit = Image.new("L", (B * S, H * S), 255); zufall = Image.new("L", (B * S, H * S), 0)
dt, dz, dzu = ImageDraw.Draw(tinte), ImageDraw.Draw(zeit), ImageDraw.Draw(zufall)
# die späteren zuerst: wo sich Linien kreuzen, gilt die frühere
for p, anfang, dauer, lg, hell, breite in sorted(striche, key=lambda s_: -s_[1]):
    # gleichmässige Richtung der Hand: jede Linie beginnt oben links
    if p[0][0] + .6 * p[0][1] > p[-1][0] + .6 * p[-1][1]: p = p[::-1]
    z = 255 if breite else 0; n = len(p) - 1
    for k in range(n):
        (ax, ay), (bx, by) = p[k], p[k + 1]; s_ = k / n
        d = breite or .3 + .6 * wert(dichte, ax, ay)
        w = d * min(1, (s_ * lg / 7) ** .5, ((1 - s_) * lg / 7) ** .5) + .2
        g = round(254 * min(1, anfang + s_ * dauer))
        seg = [(ax * S, ay * S), (bx * S, by * S)]; ww = max(1, round(w * S)); r = w * S / 2
        dt.line(seg, fill=hell, width=ww); dt.ellipse((bx * S - r, by * S - r, bx * S + r, by * S + r), fill=hell)
        dz.line(seg, fill=g, width=ww + 1); dzu.line(seg, fill=z, width=ww + 1)

R = np.asarray(tinte.resize((B, H), Image.BOX))
G = np.asarray(zeit).reshape(H, S, B, S).min(axis=(1, 3))
Bl = np.where(R > 0, np.asarray(zufall).reshape(H, S, B, S).max(axis=(1, 3)), 0).astype(np.uint8)
G = np.where(R > 0, G, 255).astype(np.uint8)
out = WURZEL / f"gamma/bilder/{name}-linien.webp"
Image.fromarray(np.dstack([R, G, Bl])).save(out, lossless=True, quality=100, method=6)
print(out, out.stat().st_size, "Bytes;", (WURZEL / f"gamma/bilder/{name}-foto.webp").stat().st_size, "Bytes Foto")
if len(sys.argv) > 4:
    grund = np.array([90, 66, 50], np.float32)
    a = (R.astype(np.float32) / 255)[..., None] * .92
    Image.fromarray((grund * (1 - a) + 255 * a).astype(np.uint8)).save(sys.argv[4])
