// «The Fictory» – Material und Darstellung. Alles Bildmaterial stammt aus dem Eingangsbild: die Teile der Zerlegung (Kanten an den
// Farbgruppen nachgeschärft), ihre Silhouetten und ein Grundbild (der Grund des Bildes, Figuren mit der Grundfarbe geschlossen).
// Nach dem Eingangsbild steht alles auf dunklem Grund. zeichne() bildet einen Zustand in beliebiger Grösse ab; Vorschau, Video und
// Standbild in hoher Auflösung nutzen dieselbe Funktion mit demselben Zustand. In die Bilder kommt keine Schrift.
import { konturen, lab, leitfarbe } from "./analyse.js?v=3";
import { zeichneFeld } from "./feld.js?v=3";

export const NACHT = "#151412";
export const PAPIER = "#f4f1ea";
export const TINTE = "#1f1d1a";
const KLEIN = 1100;          // bis zu dieser Höhe in Pixeln zeichnet die Vorschau aus verkleinertem Material

const leinwand = (w, h) => {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
  return c;
};
const verkleinert = (c, f) => {
  if (f >= 1) return c;
  const k = leinwand(c.width * f, c.height * f);
  const x = k.getContext("2d");
  x.imageSmoothingQuality = "high";
  x.drawImage(c, 0, 0, k.width, k.height);
  return k;
};

/** Material aus dem Arbeitsbild (Canvas in Arbeitsauflösung) für die Teile eines Laufs */
export function baueMaterial(quelle, A, M) {
  const Hs = quelle.height, Ws = quelle.width, ah = A.hoehe, aw = A.breite, faktor = Hs / ah;
  const qx = quelle.getContext("2d", { willReadFrequently: true });
  const zentren = A.zentren.map((c) => c.lab);
  const naechste = (r, g, b) => {
    const p = lab(r, g, b);
    let best = 0, bd = Infinity;
    for (let k = 0; k < zentren.length; k++) { const c = zentren[k], d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2; if (d < bd) { bd = d; best = k; } }
    return best;
  };
  const indikator = (id, x, y) => (x >= 0 && y >= 0 && x < aw && y < ah && M.karte[y * aw + x] === id ? 1 : 0);
  const bilinear = (id, fx, fy) => {
    const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
    return indikator(id, x0, y0) * (1 - tx) * (1 - ty) + indikator(id, x0 + 1, y0) * tx * (1 - ty) + indikator(id, x0, y0 + 1) * (1 - tx) * ty + indikator(id, x0 + 1, y0 + 1) * tx * ty;
  };
  const f = Math.min(1, KLEIN / Hs);
  const nacht = [0x15, 0x14, 0x12];
  const teile = M.teile.map((e) => {
    const b = e.bbox;
    const sx0 = Math.max(0, Math.floor((b.x0 - 1) * faktor)), sy0 = Math.max(0, Math.floor((b.y0 - 1) * faktor));
    const sx1 = Math.min(Ws, Math.ceil((b.x1 + 2) * faktor)), sy1 = Math.min(Hs, Math.ceil((b.y1 + 2) * faktor));
    const w = sx1 - sx0, h = sy1 - sy0;
    const bild = qx.getImageData(sx0, sy0, w, h), d = bild.data;
    const schatten = new ImageData(w, h), l = schatten.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const v = bilinear(e.i, (sx0 + x + 0.5) / faktor - 0.5, (sy0 + y + 0.5) / faktor - 0.5);
      const i = (y * w + x) * 4;
      let a;
      if (v >= 0.95) a = 255;
      else if (v <= 0.04) a = 0;
      else a = naechste(d[i], d[i + 1], d[i + 2]) === e.cluster ? (v > 0.12 ? 255 : 0) : (v > 0.8 ? 255 : 0);   // Rand an der Farbgruppe nachgeschärft
      d[i + 3] = a;
      l[i] = nacht[0]; l[i + 1] = nacht[1]; l[i + 2] = nacht[2]; l[i + 3] = a;
    }
    const gross = leinwand(w, h), schattenGross = leinwand(w, h);
    gross.getContext("2d").putImageData(bild, 0, 0);
    schattenGross.getContext("2d").putImageData(schatten, 0, 0);
    // Kontur in Koordinaten relativ zum Schwerpunkt (normiert)
    const px0 = Math.max(0, b.x0 - 2), py0 = Math.max(0, b.y0 - 2), pw = Math.min(aw, b.x1 + 3) - px0, ph = Math.min(ah, b.y1 + 3) - py0;
    const feld = new Float32Array(pw * ph);
    for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) feld[y * pw + x] = indikator(e.i, px0 + x, py0 + y);
    const kontur = konturen(feld, pw, ph, 0.5).map((zug) => zug.map(([x, y]) => [(px0 + x + 0.5) / ah - e.hx, (py0 + y + 0.5) / ah - e.hy]));
    return { gross, klein: verkleinert(gross, f), schattenGross, schattenKlein: verkleinert(schattenGross, f), ox: sx0 / Hs - e.hx, oy: sy0 / Hs - e.hy, w: w / Hs, h: h / Hs, kontur };
  });
  // Grundbild: Grundflächen im Original, alles andere in der mittleren Grundfarbe
  const grund = new Set(A.grund);
  let gr = 0, gg = 0, gb = 0, gs = 0;
  for (const id of grund) { const F = A.flaechen[id]; gr += F.rgb[0] * F.px; gg += F.rgb[1] * F.px; gb += F.rgb[2] * F.px; gs += F.px; }
  const grundFarbe = gs ? [gr / gs, gg / gs, gb / gs].map(Math.round) : [200, 196, 188];
  const klein = leinwand(aw, ah), maske = leinwand(aw, ah);
  const kd = new ImageData(aw, ah), md = new ImageData(aw, ah);
  for (let i = 0; i < aw * ah; i++) {
    kd.data.set([...grundFarbe, 255], i * 4);
    md.data.set([255, 255, 255, grund.has(A.region[i]) ? 255 : 0], i * 4);
  }
  klein.getContext("2d").putImageData(kd, 0, 0); maske.getContext("2d").putImageData(md, 0, 0);
  const grundbild = leinwand(Ws, Hs), gx = grundbild.getContext("2d");
  gx.imageSmoothingQuality = "high";
  gx.drawImage(klein, 0, 0, Ws, Hs);
  const echt = leinwand(Ws, Hs), ex = echt.getContext("2d");
  ex.imageSmoothingQuality = "high";
  ex.drawImage(maske, 0, 0, Ws, Hs);
  ex.globalCompositeOperation = "source-in";
  ex.drawImage(quelle, 0, 0);
  gx.drawImage(echt, 0, 0);
  // Zerlegung (alle Teilgrenzen) für den Übergang aus dem Eingangsbild
  const gliederung = [];
  for (const e of M.teile) for (const zug of teile[e.i].kontur) gliederung.push(zug.map(([x, y]) => [x + e.hx, y + e.hy]));
  return { Hs, Ws, quelle, quelleKlein: verkleinert(quelle, f), grundbild, grundbildKlein: verkleinert(grundbild, f), teile, gliederung, grundFarbe, leit: leitfarbe(A), klein: f };
}

const matrix = (rot, s) => [s * Math.cos(rot), s * Math.sin(rot), -s * Math.sin(rot), s * Math.cos(rot)];
function pfad(ctx, zuege) {
  ctx.beginPath();
  for (const zug of zuege) { zug.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); }
}

/**
 * zeichnet den Zustand z in ctx (Breite W, Höhe H Pixel; Seitenverhältnis wie das Eingangsbild).
 * spurCache (optional, für die laufende Vorschau): { canvas, anzahl } – die Spuren wachsen nur an und werden darum schrittweise in eine eigene Schicht gezeichnet.
 */
export function zeichne(ctx, W, H, z, M, mat, spurCache = null) {
  const S = H, kleinOk = S <= mat.Hs * mat.klein * 1.05;
  const q = (gross, klein) => (kleinOk ? klein : gross);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = NACHT; ctx.fillRect(0, 0, W, H);
  const teil = (c, i, x, y, m, bild) => {
    const T = mat.teile[i];
    c.setTransform(S * m[0], S * m[1], S * m[2], S * m[3], S * x, S * y);
    c.drawImage(bild, T.ox, T.oy, T.w, T.h);
  };
  // 1 · das Eingangsbild, solange es noch nicht zerlegt ist
  if (z.grundAlpha > 0.001) { ctx.globalAlpha = z.grundAlpha; ctx.drawImage(q(mat.quelle, mat.quelleKlein), 0, 0, W, H); }
  // 1a · das wuchernde Feld (Shader) und das Raster des Spurenfelds: jede Zelle ein Punkt, heller und grösser, wo Spur liegt
  const technik = 1 - z.grundAlpha;
  if (technik > 0.001) {
    zeichneFeld(ctx, W, H, z, M, mat.leit, (z.feldAlpha ?? 0) * technik);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PAPIER;
    const zelle = S / M.gh;
    for (let gy = 0; gy < M.gh; gy++) for (let gx = 0; gx < M.gw; gx++) {
      const s = Math.min(1, z.spuren[gy * M.gw + gx] / 5);
      const d = Math.max(1, S * (0.0012 + 0.0032 * s));
      ctx.globalAlpha = technik * (0.1 + 0.6 * s);
      ctx.fillRect((gx + 0.5) * zelle - d / 2, (gy + 0.5) * zelle - d / 2, d, d);
    }
  }
  // 2 · offene Leerstellen (R6): Umriss an der verlassenen Stelle
  z.teile.forEach((t, i) => {
    if (t.loch <= 0.001) return;
    const e = M.teile[i];
    ctx.setTransform(S, 0, 0, S, S * e.hx, S * e.hy);
    ctx.globalAlpha = t.loch * 0.55; ctx.strokeStyle = PAPIER; ctx.lineWidth = Math.max(0.8, S * 0.0014) / S;
    ctx.setLineDash([0.005, 0.006]); pfad(ctx, mat.teile[i].kontur); ctx.stroke(); ctx.setLineDash([]);
  });
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // 3 · Zwischenraum als tragende Form, gefüllt mit dem Material des Grundes
  if (z.lueckeAlpha > 0.001 && z.luecke.length) {
    ctx.setTransform(S, 0, 0, S, 0, 0);
    pfad(ctx, z.luecke);
    ctx.save();
    ctx.clip("evenodd");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = z.lueckeAlpha;
    ctx.drawImage(q(mat.grundbild, mat.grundbildKlein), 0, 0, W, H);
    ctx.restore();
    ctx.globalAlpha = z.lueckeAlpha * 0.7;
    ctx.lineWidth = Math.max(1, S * 0.002) / S;
    ctx.strokeStyle = PAPIER;
    ctx.stroke();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  // 4 · Spuren: gestempelte frühere Lagen (in der Vorschau aus einer eigenen, schrittweise wachsenden Schicht)
  const spur = z.spurAlpha ?? 1;
  if (z.stempel.length && spur > 0.001) {
    if (spurCache) {
      if (!spurCache.canvas || spurCache.canvas.width !== W || spurCache.canvas.height !== H || spurCache.anzahl > z.stempel.length || spurCache.lauf !== M) {
        spurCache.canvas = leinwand(W, H); spurCache.anzahl = 0; spurCache.lauf = M;
      }
      const sc = spurCache.canvas.getContext("2d");
      sc.imageSmoothingEnabled = true;
      for (let k = spurCache.anzahl; k < z.stempel.length; k++) { const s = z.stempel[k]; sc.globalAlpha = s.a; teil(sc, s.i, s.x, s.y, s.m, q(mat.teile[s.i].gross, mat.teile[s.i].klein)); }
      sc.setTransform(1, 0, 0, 1, 0, 0);
      spurCache.anzahl = z.stempel.length;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = spur; ctx.drawImage(spurCache.canvas, 0, 0);
    } else {
      for (const s of z.stempel) { ctx.globalAlpha = s.a * spur; teil(ctx, s.i, s.x, s.y, s.m, q(mat.teile[s.i].gross, mat.teile[s.i].klein)); }
    }
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // 5 · Kopplungen
  if (z.kopplungAlpha > 0.001) {
    ctx.strokeStyle = PAPIER; ctx.lineWidth = Math.max(1, S * 0.0012); ctx.lineCap = "round";
    ctx.globalAlpha = z.kopplungAlpha * 0.55;
    ctx.beginPath();
    for (const f of z.federn) { if (!f.aktiv) continue; const a = z.teile[f.i], b = z.teile[f.j]; ctx.moveTo(S * a.x, S * a.y); ctx.lineTo(S * b.x, S * b.y); }
    ctx.stroke();
  }
  // 6 · die Teile in ihrer Lage, in der Reihenfolge ihrer Ebene; bei der Umkehrung als Silhouette mit heller Kontur
  const reihe = z.teile.map((t, i) => i).sort((a, b) => z.teile[a].z - z.teile[b].z || a - b);
  const umkehr = z.umkehr ?? 0;
  for (const i of reihe) {
    const t = z.teile[i], m = matrix(t.rot, t.s), T = mat.teile[i];
    if (t.a * (1 - umkehr) > 0.001) { ctx.globalAlpha = t.a * (1 - umkehr); teil(ctx, i, t.x, t.y, m, q(T.gross, T.klein)); }
    if (umkehr > 0.001) { ctx.globalAlpha = umkehr; teil(ctx, i, t.x, t.y, m, q(T.schattenGross, T.schattenKlein)); }
    if (t.kontur > 0.001) {
      ctx.setTransform(S * m[0], S * m[1], S * m[2], S * m[3], S * t.x, S * t.y);
      ctx.globalAlpha = t.kontur * 0.85; ctx.strokeStyle = PAPIER; ctx.lineWidth = Math.max(1, S * 0.0018) / (S * t.s); ctx.lineJoin = "round";
      pfad(ctx, T.kontur); ctx.stroke();
    }
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // 7 · der Schnitt aus Schritt 6
  if (z.schnitt && z.schritt >= 765) {
    const { x, y, w } = z.schnitt, d = 2;
    ctx.globalAlpha = 0.7; ctx.strokeStyle = PAPIER; ctx.lineWidth = Math.max(1, S * 0.0016); ctx.setLineDash([S * 0.012, S * 0.008]);
    ctx.beginPath(); ctx.moveTo(S * (x - Math.cos(w) * d), S * (y - Math.sin(w) * d)); ctx.lineTo(S * (x + Math.cos(w) * d), S * (y + Math.sin(w) * d)); ctx.stroke();
    ctx.setLineDash([]);
  }
  // 7a · Scanlines: jede so vielte Zeile abgedunkelt, im Verhältnis zur Bildhöhe (gleich in Vorschau und Export)
  if (technik > 0.001) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const abstand = Math.max(2, Math.round(S / 300)), dicke = Math.max(1, Math.round(abstand / 2.5));
    ctx.globalAlpha = 0.22 * technik; ctx.fillStyle = "#000";
    for (let y = 0; y < H; y += abstand) ctx.fillRect(0, y, W, dicke);
  }
  // 8 · die Zerlegung (nur beim Übergang aus dem Eingangsbild)
  if (z.gliederung > 0.001) {
    ctx.setTransform(S, 0, 0, S, 0, 0);
    ctx.lineWidth = Math.max(1, S * 0.0016) / S; ctx.lineJoin = "round";
    pfad(ctx, mat.gliederung);
    ctx.globalAlpha = z.gliederung * 0.9; ctx.strokeStyle = NACHT; ctx.lineWidth *= 2.2; ctx.stroke();
    ctx.globalAlpha = z.gliederung; ctx.strokeStyle = PAPIER; ctx.lineWidth /= 2.2; ctx.stroke();
  }
  ctx.restore();
}
