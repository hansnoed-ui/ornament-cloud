"""Bearbeitet ein Foto aus der Praxis und rechnet daraus die Zeichnung für die Seite «Kunst» auf ornament.cloud/gamma/ vor.
Aufruf: python3 tools/gamma/kunst_linien.py foto.jpg [name] [lage] [vorschau.png]
  name: Dateiname ohne Endung (kunst), lage: wo das Quadrat im Hochformat sitzt, 0 oben bis 1 unten (0.5).
Schreibt gamma/bilder/<name>-foto.webp und gamma/bilder/<name>-linien.webp (verlustfrei). Ein Hochformat wird quadratisch,
ein Querformat bleibt ganz (höchstens 16:9); sein Seitenverhältnis gehört dann als data-format an .kunst-bild.
Bearbeitung (Christian, 30. Oktober 2026: jedes Foto für diese Seite zuerst sauber bearbeiten): Display P3 nach sRGB, ohne kräftige Farben
abzuschneiden; Weissabgleich nur, wo fast farblose helle Stellen einen Stich zeigen; Farbrauschen stark, Helligkeitsrauschen leicht und vor allem in
den Schatten mindern; das Licht grossflächig ausgleichen (dunkle Ecken heben, Lichtflecken dämpfen); gelbe, mittel gesättigte Flächen etwas ruhiger,
kräftige Farben bleiben; zuletzt etwas wärmer; beim Verkleinern leicht nachschärfen.
Die Zeichnung besteht nur aus Geraden: Raumkanten, Rahmen und Fugen, ohne Schraffur, wie weisse Kreide auf getöntem Papier.
In den Linien ist Rot die Deckung, Grün der Zeitpunkt (0–254), an dem die Linie an dieser Stelle gezeichnet wird (255: nie),
Blau 255 für Umrisse. So kann die Seite die Zeichnung wachsen lassen, ohne Linien zu kennen: ein Wert im Shader genügt."""
import io, sys, math, random, pathlib
import numpy as np
from PIL import Image, ImageCms, ImageDraw, ImageFilter, ImageOps
from scipy import ndimage as nd

WURZEL = pathlib.Path(__file__).resolve().parents[2]
B, FOTO_B, S = 1200, 1440, 3          # Breite der Zeichnung, Breite des Fotos, Überabtastung beim Zeichnen
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
    # Wärmer (Christian, 30. Oktober 2026): Rot und etwas Grün hinauf, Blau hinunter, also golden statt rosa; die Helligkeit bleibt
    w = a * np.array([1.04, 1.015, .89], np.float32); a = w * (Y / np.maximum(w @ np.array([.299, .587, .114], np.float32), 1e-4))[..., None]
    return np.clip(a, 0, 1)

name = sys.argv[2] if len(sys.argv) > 2 else "kunst"
lage = float(sys.argv[3]) if len(sys.argv) > 3 else .5
a = bearbeiten(ImageOps.exif_transpose(Image.open(sys.argv[1])))
# Hochformat: ein Quadrat an der Stelle lage. Querformat: das ganze Bild (breiter als 16:9 wird mittig gekürzt); die Seite schneidet passend zur Bühne zu
h, w = a.shape[:2]
if w > h: q = min(w, round(h * 16 / 9)); a = a[:, (w - q) // 2:(w - q) // 2 + q]
else: q = w; y0 = round((h - q) * lage); a = a[y0:y0 + q]
h, w = a.shape[:2]; FORMAT = w / h; print("Format", round(FORMAT, 3), "(data-format)")
quelle = Image.fromarray((a * 255 + .5).astype(np.uint8))
foto = quelle.resize((FOTO_B, round(FOTO_B / FORMAT)), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=.8, percent=35, threshold=1))
foto.save(WURZEL / f"gamma/bilder/{name}-foto.webp", quality=78, method=6)
H = round(B / FORMAT)

f = np.asarray(quelle.resize((B, H), Image.LANCZOS), dtype=np.float32) / 255

yy, xx = np.mgrid[0:H, 0:B].astype(np.float32)

def gerade(p0, p1):
    # eine Gerade, fast waagrechte und senkrechte genau ausgerichtet, dicht nachgetastet (für Zeit und Strichende)
    (ax, ay), (bx, by) = p0, p1; w = math.degrees(math.atan2(by - ay, bx - ax)) % 180
    if min(w, 180 - w) < 8: ay = by = (ay + by) / 2
    elif abs(w - 90) < 8: ax = bx = (ax + bx) / 2
    n = max(1, int(math.hypot(bx - ax, by - ay) / 1.6))
    return [(ax + (bx - ax) * i / n, ay + (by - ay) * i / n) for i in range(n + 1)]

# Vollkommen geometrisch (Christian, 30. Oktober 2026): die Zeichnung besteht nur aus Geraden.
# Umrisse: lange Geraden (Raumkanten, Boden, Rahmen, Schienen) per Hough-Transformation auf einem feinen Kantenbild (nur Helligkeit)
Lf = nd.gaussian_filter(f[..., 0] * .3 + f[..., 1] * .59 + f[..., 2] * .11, 1.3); fx, fy = nd.sobel(Lf, 1), nd.sobel(Lf, 0); mf = np.hypot(fx, fy); af = np.arctan2(fy, fx)
f1 = nd.map_coordinates(mf, [yy + np.sin(af), xx + np.cos(af)], order=1, mode="nearest"); f2 = nd.map_coordinates(mf, [yy - np.sin(af), xx - np.cos(af)], order=1, mode="nearest")
umgebung = nd.gaussian_filter(mf, 22) + 1e-3   # im Verhältnis zur Umgebung: feine Fugen im ruhigen Boden zählen, die raue Wand kaum
ky, kx = np.nonzero((mf >= f1) & (mf >= f2) & (mf > .06) & (mf / umgebung > 2.4)); ka = af[ky, kx] % math.pi; kx, ky = kx + .5, ky + .5
# jede Kante stimmt nur für Geraden quer zu ihrem Gefälle (±12°): so ergibt die Pinselstruktur in den Bildern keine Zufallslinien
def passt(th): return np.abs((ka - th + math.pi / 2) % math.pi - math.pi / 2) < math.radians(12)
TH = np.deg2rad(np.arange(0, 180, .5)); ct, st = np.cos(TH), np.sin(TH); RMAX = int(math.hypot(B, H)) + 1
akk = np.zeros((len(TH), 2 * RMAX), np.int32)
for i in range(len(TH)):
    m_ = passt(TH[i]); akk[i] += np.bincount(np.round(kx[m_] * ct[i] + ky[m_] * st[i]).astype(int) + RMAX, minlength=2 * RMAX)
umrisse = []
for _ in range(140):
    i, r = np.unravel_index(int(np.argmax(akk)), akk.shape)
    if akk[i, r] < 45: break
    # Nachbarschaft löschen (auch die zweite Kante einer dünnen Linie), Winkel am Rand zyklisch
    for di in range(-6, 7): akk[(i + di) % len(TH), max(r - 7, 0):r + 8] = 0
    nah = (np.abs(kx * ct[i] + ky * st[i] - (r - RMAX)) < 1.6) & passt(TH[i])
    tt = -kx[nah] * st[i] + ky[nah] * ct[i]; tt.sort()
    if len(tt) < 2: continue
    for t_ in np.split(tt, np.nonzero(np.diff(tt) > 12)[0] + 1):
        lg_ = t_[-1] - t_[0]
        if lg_ < 40 or len(t_) / lg_ < .5: continue
        rr = r - RMAX; p0 = (rr * ct[i] - t_[0] * st[i], rr * st[i] + t_[0] * ct[i]); p1 = (rr * ct[i] - t_[-1] * st[i], rr * st[i] + t_[-1] * ct[i])
        umrisse.append(gerade(p0, p1))
print(len(umrisse), "Geraden")

# Reihenfolge: lange und mittige Geraden zuerst, dann nach aussen. Zeit 0 bis 1, jede läuft wie mit dem Stift gezogen
def ordnen(linien, von, bis, dauer):
    if not linien: return []
    lg = np.array([len(p) for p in linien], np.float32) * np.array([math.hypot(p[1][0] - p[0][0], p[1][1] - p[0][1]) for p in linien], np.float32)
    rang = np.argsort(np.argsort(-lg)) / max(len(linien) - 1, 1)
    sp = np.array([min(1, math.hypot(p[len(p) // 2][0] / B - .5, p[len(p) // 2][1] / H - .5) / .62) for p in linien], np.float32)
    k = .45 * rang + .55 * sp + .06 * np.random.rand(len(linien)); k = (k - k.min()) / (np.ptp(k) or 1)
    return [(von + (bis - von) * k[i], dauer * lg[i] / lg.max(), lg[i]) for i in range(len(linien))]
striche = [(p, *z, 255, 1.05) for p, z in zip(umrisse, ordnen(umrisse, 0, .7, .3))]
tinte = Image.new("L", (B * S, H * S), 0); zeit = Image.new("L", (B * S, H * S), 255); zufall = Image.new("L", (B * S, H * S), 0)
dt, dz, dzu = ImageDraw.Draw(tinte), ImageDraw.Draw(zeit), ImageDraw.Draw(zufall)
# die späteren zuerst: wo sich Linien kreuzen, gilt die frühere
for p, anfang, dauer, lg, hell, breite in sorted(striche, key=lambda s_: -s_[1]):
    # gleichmässige Richtung der Hand: jede Linie beginnt oben links
    if p[0][0] + .6 * p[0][1] > p[-1][0] + .6 * p[-1][1]: p = p[::-1]
    n = len(p) - 1
    for k in range(n):
        (ax, ay), (bx, by) = p[k], p[k + 1]; s_ = k / n
        w = breite * min(1, (s_ * lg / 7) ** .5, ((1 - s_) * lg / 7) ** .5) + .2
        g = round(254 * min(1, anfang + s_ * dauer))
        seg = [(ax * S, ay * S), (bx * S, by * S)]; ww = max(1, round(w * S)); r = w * S / 2
        dt.line(seg, fill=hell, width=ww); dt.ellipse((bx * S - r, by * S - r, bx * S + r, by * S + r), fill=hell)
        dz.line(seg, fill=g, width=ww + 1); dzu.line(seg, fill=255, width=ww + 1)

R = np.asarray(tinte.resize((B, H), Image.BOX))
G = np.asarray(zeit).reshape(H, S, B, S).min(axis=(1, 3))
Bl = np.where(R > 0, np.asarray(zufall).reshape(H, S, B, S).max(axis=(1, 3)), 0).astype(np.uint8)
G = np.where(R > 0, G, 255).astype(np.uint8)
out = WURZEL / f"gamma/bilder/{name}-linien.webp"
Image.fromarray(np.dstack([R, G, Bl])).save(out, lossless=True, quality=100, method=6)
print(out, out.stat().st_size, "Bytes;", (WURZEL / f"gamma/bilder/{name}-foto.webp").stat().st_size, "Bytes Foto")
if len(sys.argv) > 4:
    grund = np.array([79, 34, 50], np.float32)
    a = (R.astype(np.float32) / 255)[..., None] * .92
    Image.fromarray((grund * (1 - a) + 255 * a).astype(np.uint8)).save(sys.argv[4])
