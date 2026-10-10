// «Das Bild geht weiter» – Material und Darstellung. Alles Bildmaterial stammt aus dem Eingangsbild: ausgeschnittene Teile (Kanten an den
// Farbgruppen nachgeschärft), Aussparungen und ein Grundbild (der Grund des Bildes, Figuren mit der Grundfarbe geschlossen).
// zeichne() bildet einen Zustand in beliebiger Grösse ab; Vorschau, Video und Standbild in hoher Auflösung nutzen dieselbe Funktion
// mit demselben Zustand. In die Bilder kommt keine Schrift.
import { konturen, lab } from "./analyse.js?v=1";

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
  const nächste = (r, g, b) => {
    const p = lab(r, g, b);
    let best = 0, bd = Infinity;
    for (let k = 0; k < zentren.length; k++) { const c = zentren[k], d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2; if (d < bd) { bd = d; best = k; } }
    return best;
  };
  const indikator = (id, x, y) => (x >= 0 && y >= 0 && x < aw && y < ah && A.region[y * aw + x] === id ? 1 : 0);
  const bilinear = (id, fx, fy) => {
    const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
    return indikator(id, x0, y0) * (1 - tx) * (1 - ty) + indikator(id, x0 + 1, y0) * tx * (1 - ty) + indikator(id, x0, y0 + 1) * (1 - tx) * ty + indikator(id, x0 + 1, y0 + 1) * tx * ty;
  };
  const f = Math.min(1, KLEIN / Hs);
  const teile = M.teile.map((e) => {
    const F = A.flaechen[e.region], b = F.bbox;
    const sx0 = Math.max(0, Math.floor((b.x0 - 1) * faktor)), sy0 = Math.max(0, Math.floor((b.y0 - 1) * faktor));
    const sx1 = Math.min(Ws, Math.ceil((b.x1 + 2) * faktor)), sy1 = Math.min(Hs, Math.ceil((b.y1 + 2) * faktor));
    const w = sx1 - sx0, h = sy1 - sy0;
    const bild = qx.getImageData(sx0, sy0, w, h), d = bild.data;
    const loch = new ImageData(w, h), l = loch.data;
    const papier = [0xf4, 0xf1, 0xea];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const v = bilinear(e.region, (sx0 + x + 0.5) / faktor - 0.5, (sy0 + y + 0.5) / faktor - 0.5);
      const i = (y * w + x) * 4;
      let a;
      if (v >= 0.95) a = 255;
      else if (v <= 0.04) a = 0;
      else a = nächste(d[i], d[i + 1], d[i + 2]) === e.cluster ? (v > 0.12 ? 255 : 0) : (v > 0.8 ? 255 : 0);   // Rand an der Farbgruppe nachgeschärft
      d[i + 3] = a;
      l[i] = papier[0]; l[i + 1] = papier[1]; l[i + 2] = papier[2]; l[i + 3] = a;
    }
    const gross = leinwand(w, h), lochGross = leinwand(w, h);
    gross.getContext("2d").putImageData(bild, 0, 0);
    lochGross.getContext("2d").putImageData(loch, 0, 0);
    // Kontur in Koordinaten relativ zum Schwerpunkt (normiert)
    const px0 = Math.max(0, b.x0 - 2), py0 = Math.max(0, b.y0 - 2), pw = Math.min(aw, b.x1 + 3) - px0, ph = Math.min(ah, b.y1 + 3) - py0;
    const feld = new Float32Array(pw * ph);
    for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) feld[y * pw + x] = indikator(e.region, px0 + x, py0 + y);
    const kontur = konturen(feld, pw, ph, 0.5).map((zug) => zug.map(([x, y]) => [(px0 + x + 0.5) / ah - e.hx, (py0 + y + 0.5) / ah - e.hy]));
    return { gross, klein: verkleinert(gross, f), lochGross, lochKlein: verkleinert(lochGross, f), ox: sx0 / Hs - e.hx, oy: sy0 / Hs - e.hy, w: w / Hs, h: h / Hs, kontur };
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
  // Gliederung (alle Flächengrenzen) für den Übergang aus dem Eingangsbild
  const gliederung = [];
  for (const F of A.flaechen) {
    const b = F.bbox, px0 = Math.max(0, b.x0 - 1), py0 = Math.max(0, b.y0 - 1), pw = Math.min(aw, b.x1 + 2) - px0, ph = Math.min(ah, b.y1 + 2) - py0;
    const feld = new Float32Array(pw * ph);
    for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) feld[y * pw + x] = indikator(F.id, px0 + x, py0 + y);
    for (const zug of konturen(feld, pw, ph, 0.5)) gliederung.push(zug.map(([x, y]) => [(px0 + x + 0.5) / ah, (py0 + y + 0.5) / ah]));
  }
  return { Hs, Ws, quelle, quelleKlein: verkleinert(quelle, f), grundbild, grundbildKlein: verkleinert(grundbild, f), teile, gliederung, grundFarbe, klein: f };
}

const matrix = (rot, s) => [s * Math.cos(rot), s * Math.sin(rot), -s * Math.sin(rot), s * Math.cos(rot)];
function pfad(ctx, zuege) {
  ctx.beginPath();
  for (const zug of zuege) { zug.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); }
}

/** zeichnet den Zustand z in ctx (Breite W, Höhe H Pixel; Seitenverhältnis wie das Eingangsbild) */
export function zeichne(ctx, W, H, z, M, mat) {
  const S = H, kleinOk = S <= mat.Hs * mat.klein * 1.05;
  const q = (gross, klein) => (kleinOk ? klein : gross);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = PAPIER; ctx.fillRect(0, 0, W, H);
  // 1 · das Eingangsbild als Grund (tritt zurück, sobald Teile herausgelöst sind)
  ctx.globalAlpha = z.grundAlpha;
  ctx.drawImage(q(mat.quelle, mat.quelleKlein), 0, 0, W, H);
  const teil = (i, x, y, m, bild) => {
    const T = mat.teile[i];
    ctx.setTransform(S * m[0], S * m[1], S * m[2], S * m[3], S * x, S * y);
    ctx.drawImage(bild, T.ox, T.oy, T.w, T.h);
  };
  // 2 · Aussparungen an den verlassenen Stellen
  z.teile.forEach((t, i) => {
    if (t.loch <= 0.001) return;
    const e = M.teile[i];
    ctx.globalAlpha = t.loch;
    teil(i, e.hx, e.hy, [1, 0, 0, 1], q(mat.teile[i].lochGross, mat.teile[i].lochKlein));
    ctx.globalAlpha = t.loch * 0.45;
    ctx.lineWidth = Math.max(0.8, S * 0.0016) / S;
    ctx.strokeStyle = TINTE;
    ctx.setLineDash([0.006, 0.006]);
    pfad(ctx, mat.teile[i].kontur); ctx.stroke();
    ctx.setLineDash([]);
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
    // leicht abgedunkelt, damit der Grund als Form gegen das Papier steht
    ctx.fillStyle = TINTE; ctx.globalAlpha = z.lueckeAlpha * 0.14; ctx.fillRect(0, 0, W, H);
    ctx.restore();
    ctx.globalAlpha = z.lueckeAlpha * 0.75;
    ctx.lineWidth = Math.max(1, S * 0.0022) / S;
    ctx.strokeStyle = TINTE;
    ctx.stroke();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  // 4 · Spuren: gestempelte frühere Lagen
  const spur = z.spurAlpha ?? 1;
  for (const s of z.stempel) { ctx.globalAlpha = s.a * spur; teil(s.i, s.x, s.y, s.m, q(mat.teile[s.i].gross, mat.teile[s.i].klein)); }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // 5 · Kopplungen
  if (z.kopplungAlpha > 0.001) {
    ctx.strokeStyle = TINTE; ctx.lineWidth = Math.max(1, S * 0.0018); ctx.lineCap = "round";
    z.federn.forEach((f, k) => {
      const a = z.teile[f.i], b = z.teile[f.j];
      if (f.aktiv) {
        ctx.globalAlpha = z.kopplungAlpha * (f.art === "baum" ? 0.75 : 0.45);
        ctx.beginPath(); ctx.moveTo(S * a.x, S * a.y); ctx.lineTo(S * b.x, S * b.y); ctx.stroke();
      } else if (k === z.schnitt) {
        // die getrennte Kopplung: zwei Enden, die nicht mehr zusammenreichen
        ctx.globalAlpha = Math.max(z.kopplungAlpha, 0.35);
        const dx = b.x - a.x, dy = b.y - a.y;
        ctx.beginPath(); ctx.moveTo(S * a.x, S * a.y); ctx.lineTo(S * (a.x + dx * 0.3), S * (a.y + dy * 0.3));
        ctx.moveTo(S * b.x, S * b.y); ctx.lineTo(S * (b.x - dx * 0.3), S * (b.y - dy * 0.3)); ctx.stroke();
      }
    });
    ctx.globalAlpha = z.kopplungAlpha;
    ctx.fillStyle = TINTE;
    for (const t of z.teile) { ctx.beginPath(); ctx.arc(S * t.x, S * t.y, Math.max(1.5, S * 0.004), 0, 2 * Math.PI); ctx.fill(); }
  }
  // 6 · die Teile in ihrer Lage, in der Reihenfolge ihrer Ebene
  const reihe = z.teile.map((t, i) => i).sort((a, b) => z.teile[a].z - z.teile[b].z || a - b);
  for (const i of reihe) {
    const t = z.teile[i], m = matrix(t.rot, t.s);
    if (t.a > 0.001) { ctx.globalAlpha = t.a; teil(i, t.x, t.y, m, q(mat.teile[i].gross, mat.teile[i].klein)); }
    if (t.kontur > 0.001) {
      ctx.setTransform(S * m[0], S * m[1], S * m[2], S * m[3], S * t.x, S * t.y);
      ctx.globalAlpha = t.kontur; ctx.strokeStyle = TINTE; ctx.lineWidth = Math.max(1, S * 0.0024) / (S * t.s); ctx.lineJoin = "round";
      pfad(ctx, mat.teile[i].kontur); ctx.stroke();
    }
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // 7 · die verwendete Gliederung (nur beim Übergang aus dem Eingangsbild)
  if (z.gliederung > 0.001) {
    ctx.setTransform(S, 0, 0, S, 0, 0);
    ctx.lineWidth = Math.max(1, S * 0.0018) / S; ctx.lineJoin = "round";
    pfad(ctx, mat.gliederung);
    ctx.globalAlpha = z.gliederung * 0.85; ctx.strokeStyle = PAPIER; ctx.lineWidth *= 2.4; ctx.stroke();
    ctx.globalAlpha = z.gliederung; ctx.strokeStyle = TINTE; ctx.lineWidth /= 2.4; ctx.stroke();
  }
  ctx.restore();
}
