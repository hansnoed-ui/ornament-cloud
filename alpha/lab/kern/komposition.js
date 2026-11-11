// ORNAMENT LAB – das kompositorische Parametersystem (Masterprompt §8 und §18: «statt einer spezifischen Filmästhetik ein allgemeines
// kompositorisches Parametersystem»). Methode und Definitionen: docs/KOMPOSITION.md.
//
// Ein Bild wird in messbare Komponenten zerlegt. Jede Komponente ist ein Teil des Bildes, kein Urteil über es:
//   Leuchtdichte L = Mittel + Gefälle (x, y) + Mitte/Rand (radial) + Binnenkontrast (Rest)
//   Farbe          = L + Farbabweichung vom Grau (Sättigung)
//   Spiegelung     = symmetrischer Teil (I + I')/2 + asymmetrischer Teil (I − I')/2
//   Gewicht        = |L − Mittel|, sein Schwerpunkt ist die Lage im Bildausschnitt
// Das Profil misst diese Komponenten. Die Operation skaliert sie mit einem Faktor, wie ein Attenuverter (kern/modulation.js):
//   1 lässt die Komponente stehen, 0 hebt sie auf, −1 kehrt sie um, 2 verdoppelt sie. So heisst «verstärken, abschwächen oder ins
//   Gegenteil verkehren» für jede Eigenschaft dasselbe, und jeder Faktor ist ein Zahlparameter, den die Modulation erreicht.
// Mit einem Zielprofil (aus einem anderen eigenen Bild) wird jede Komponente stattdessen dem Ziel angeglichen.
// Keine Bewertung: kein Wert ist besser als ein anderer, es gibt keine Gesamtzahl und keine Regel wie den goldenen Schnitt.
import { alsFelder, ausFeldern, tasteFeld, luminanz, NACHT } from "./bilddaten.js";

export const PROFIL_ART = "kompositorisches-profil";
export const PROFIL_VERSION = "0.1.0";
const MESSPUNKTE = 512;   // gemessen wird auf einem Raster von höchstens 512 Punkten je Seite (Schrittweite), verändert in voller Grösse

/** die festen Schritte der Operation, in dieser Reihenfolge (die Begrenzung auf 0–1 kommt erst nach dem letzten) */
export const SCHRITTE = Object.freeze(["Ausschnitt", "Symmetrie", "Lichtgefälle", "Mitte/Rand", "Binnenkontrast", "Sättigung"]);

/** was eine Messung ist und was eine Lesart (Masterprompt §20: verifizierte Befunde und technische Hypothesen getrennt) */
export const LESARTEN = Object.freeze({
  "schwerpunkt.ausdehnung": "Hypothese: ein enges Gewicht entspricht oft einer nahen Einstellung (Kameradistanz)",
  "richtung.kantenWinkel": "Hypothese: im Standbild ist die vorherrschende Kantenrichtung ein möglicher Hinweis auf Bewegungsrichtung",
  "richtung.radial": "Hypothese: über 0,5 laufen die Kanten eher auf die Mitte zu, ein möglicher Hinweis auf Zentralperspektive",
});

const r3 = (x) => (Number.isFinite(x) ? Math.round(x * 1000) / 1000 : 0);
const grad = (rad) => ((rad * 180) / Math.PI);

/** Bild → Felder 0–1 mit Leuchtdichte (Arbeitsform aller Schritte) */
export function felder(bild) {
  const f = alsFelder(bild);
  f.L = new Float32Array(f.w * f.h);
  leuchtdichte(f);
  return f;
}
function leuchtdichte(f) { for (let i = 0; i < f.L.length; i++) f.L[i] = luminanz(f.r[i], f.g[i], f.b[i]); }

/** Messraster: Schrittweite, damit höchstens MESSPUNKTE je Seite gezählt werden; die Spiegelpartner liegen immer im vollen Bild */
function raster(f, fn) {
  const s = Math.max(1, Math.ceil(Math.max(f.w, f.h) / MESSPUNKTE));
  for (let y = Math.floor(s / 2); y < f.h; y += s) for (let x = Math.floor(s / 2); x < f.w; x += s) fn(x, y, y * f.w + x);
}
const X = (f, x) => (x + 0.5) / f.w - 0.5;   // −0,5 (links) … +0,5 (rechts)
const Y = (f, y) => (y + 0.5) / f.h - 0.5;   // −0,5 (oben) … +0,5 (unten)
const RHO = (x, y) => Math.hypot(2 * x, 2 * y) / Math.SQRT2;   // 0 in der Mitte, 1 in den Ecken

/** Zerlegung der Leuchtdichte: Mittel, Gefälle gx (links → rechts), gy (oben → unten), radial cr (Mitte → Ecke) und der Rest */
export function lichtzerlegung(f) {
  let n = 0, sL = 0, sRho = 0;
  raster(f, (x, y, i) => { n++; sL += f.L[i]; sRho += RHO(X(f, x), Y(f, y)); });
  const mittel = sL / n, rhoMittel = sRho / n;
  let lx = 0, xx = 0, ly = 0, yy = 0, lr = 0, rr = 0;
  raster(f, (x, y, i) => {
    const a = X(f, x), b = Y(f, y), c = RHO(a, b) - rhoMittel, l = f.L[i] - mittel;
    lx += l * a; xx += a * a; ly += l * b; yy += b * b; lr += l * c; rr += c * c;
  });
  const gx = xx ? lx / xx : 0, gy = yy ? ly / yy : 0, cr = rr ? lr / rr : 0;
  let q = 0, qRest = 0;
  raster(f, (x, y, i) => {
    const a = X(f, x), b = Y(f, y), l = f.L[i] - mittel, rest = l - gx * a - gy * b - cr * (RHO(a, b) - rhoMittel);
    q += l * l; qRest += rest * rest;
  });
  return { mittel, gx, gy, cr, rhoMittel, gesamt: Math.sqrt(q / n), binnen: Math.sqrt(qRest / n), n };
}

/** Energie des symmetrischen und des asymmetrischen Teils der Leuchtdichte zur Achse «lr» (links–rechts) oder «ou» (oben–unten) */
export function spiegelenergie(f, achse, mittel) {
  let s = 0, a = 0;
  raster(f, (x, y, i) => {
    const j = achse === "ou" ? (f.h - 1 - y) * f.w + x : y * f.w + (f.w - 1 - x);
    const sym = (f.L[i] + f.L[j]) / 2 - mittel, asym = (f.L[i] - f.L[j]) / 2;
    s += sym * sym; a += asym * asym;
  });
  return { s, a, symmetrie: s + a > 1e-12 ? s / (s + a) : 1 };
}

/** Schwerpunkt des Gewichts |L − Grund| als Versatz von der Bildmitte, und wie weit sich das Gewicht ausdehnt. Grund ist der Median
 *  der Leuchtdichte: so wiegt eine gleichmässige Fläche nichts, ein heller Fleck auf dunklem Grund ebenso viel wie ein dunkler auf hellem. */
export function schwerpunkt(f) {
  const grund = quantil(f, 0.5);
  let sw = 0, sx = 0, sy = 0;
  raster(f, (x, y, i) => { const w = Math.abs(f.L[i] - grund); sw += w; sx += w * X(f, x); sy += w * Y(f, y); });
  if (sw < 1e-9) return { x: 0, y: 0, ausdehnung: 1 };
  const cx = sx / sw, cy = sy / sw;
  let sd = 0;
  raster(f, (x, y, i) => { const w = Math.abs(f.L[i] - grund); sd += w * ((X(f, x) - cx) ** 2 + (Y(f, y) - cy) ** 2); });
  return { x: cx, y: cy, ausdehnung: Math.sqrt(sd / sw / (1 / 6)) };   // 1: so weit verteilt wie ein gleichmässiges Gewicht
}

/** Farbabweichung vom Grau gleicher Leuchtdichte (Effektivwert) und Farbton als Kreismittel im Gegenfarbenraum */
export function farbmessung(f) {
  let n = 0, q = 0, A = 0, B = 0, betrag = 0;
  raster(f, (x, y, i) => {
    const r = f.r[i], g = f.g[i], b = f.b[i], l = luminanz(r, g, b);
    q += ((r - l) ** 2 + (g - l) ** 2 + (b - l) ** 2) / 3; n++;
    const a = r - (g + b) / 2, c = (Math.sqrt(3) / 2) * (g - b);
    A += a; B += c; betrag += Math.hypot(a, c);
  });
  return { saettigung: Math.sqrt(q / n), farbton: (grad(Math.atan2(B, A)) + 360) % 360, buendelung: betrag > 1e-9 ? Math.hypot(A, B) / betrag : 0 };
}

/** Kantenrichtung aus dem Strukturtensor (0° waagrecht, 90° senkrecht, 45° von links unten nach rechts oben) und radiale Ausrichtung */
export function richtung(f) {
  let jxx = 0, jyy = 0, jxy = 0, rad = 0;
  const L = f.L, w = f.w;
  raster(f, (x, y, i) => {
    if (x < 1 || y < 1 || x >= f.w - 1 || y >= f.h - 1) return;
    const gx = (L[i + 1] - L[i - 1]) / 2, gy = -(L[i + w] - L[i - w]) / 2;   // gy nach oben positiv, wie auf dem Bildschirm gelesen
    jxx += gx * gx; jyy += gy * gy; jxy += gx * gy;
    const rx = X(f, x), ry = -Y(f, y), rq = rx * rx + ry * ry;
    if (rq > 1e-4) rad += (gx * ry - gy * rx) ** 2 / rq;   // (Kante · Radius)² × |g|², die Kante steht quer zum Gradienten
  });
  const spur = jxx + jyy;
  if (spur < 1e-12) return { kantenWinkel: 0, kohaerenz: 0, radial: 0.5 };
  const gradient = grad(0.5 * Math.atan2(2 * jxy, jxx - jyy));
  return { kantenWinkel: (((gradient + 90) % 180) + 180) % 180, kohaerenz: Math.hypot(jxx - jyy, 2 * jxy) / spur, radial: rad / spur };
}

/** Quantil der Leuchtdichte (Histogramm mit 1024 Stufen) */
function quantil(f, q) {
  const h = new Uint32Array(1024);
  let n = 0;
  raster(f, (x, y, i) => { h[Math.max(0, Math.min(1023, Math.round(f.L[i] * 1023)))]++; n++; });
  let s = 0;
  for (let k = 0; k < 1024; k++) { s += h[k]; if (s >= q * n) return k / 1023; }
  return 1;
}

/** das kompositorische Profil eines Bildes (oder schon berechneter Felder): nur Messungen, gerundet auf drei Stellen */
export function profil(bild) {
  const f = bild.L ? bild : felder(bild);
  const l = lichtzerlegung(f), sp = schwerpunkt(f), fa = farbmessung(f), ri = richtung(f);
  return {
    art: PROFIL_ART, version: PROFIL_VERSION, hinweis: "Messung, keine Bewertung",
    gemessenIn: [f.w, f.h], messpunkte: l.n,
    schwerpunkt: { x: r3(sp.x), y: r3(sp.y), abstand: r3(Math.hypot(sp.x, sp.y) / Math.SQRT1_2), ausdehnung: r3(sp.ausdehnung) },
    symmetrie: { linksRechts: r3(spiegelenergie(f, "lr", l.mittel).symmetrie), obenUnten: r3(spiegelenergie(f, "ou", l.mittel).symmetrie) },
    licht: { helligkeit: r3(l.mittel), gefaelleX: r3(l.gx), gefaelleY: r3(l.gy), gefaelleStaerke: r3(Math.hypot(l.gx, l.gy)),
      gefaelleWinkel: Math.round((grad(Math.atan2(-l.gy, l.gx)) + 360) % 360), mitte: r3(-l.cr) },
    kontrast: { gesamt: r3(l.gesamt), binnen: r3(l.binnen), tonumfang: r3(quantil(f, 0.95) - quantil(f, 0.05)) },
    farbe: { saettigung: r3(fa.saettigung), farbton: Math.round(fa.farbton), buendelung: r3(fa.buendelung) },
    richtung: { kantenWinkel: Math.round(ri.kantenWinkel), kohaerenz: r3(ri.kohaerenz), radial: r3(ri.radial) },
    lesarten: LESARTEN,
    referenz: null,   // vorgesehen für spätere Referenzmetadaten (Quelle, Rechte); das Lab nimmt keine fremden Bilder auf
  };
}

/** ist das ein Profil, das die Operation als Ziel nehmen kann? */
export function pruefeProfil(d) {
  if (d?.art !== PROFIL_ART) throw new Error("Zielprofil: kein kompositorisches Profil");
  if (String(d.version).split(".")[0] !== PROFIL_VERSION.split(".")[0]) throw new Error(`Zielprofil: Version ${d.version} wird nicht unterstützt`);
  for (const k of ["schwerpunkt", "symmetrie", "licht", "kontrast", "farbe"]) if (typeof d[k] !== "object" || d[k] === null) throw new Error(`Zielprofil: ${k} fehlt`);
  return d;
}

/** neue Felder: der Punkt (mx, my) der Vorlage kommt an die Stelle (nx, ny), Zoom z um diese Stelle; Rand wie in bilddaten.js */
function verschiebe(F, mx, my, nx, ny, z, rand) {
  const { w, h } = F, n = w * h, out = { w, h, r: new Float32Array(n), g: new Float32Array(n), b: new Float32Array(n), L: new Float32Array(n) }, px = [0, 0, 0];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (tasteFeld(F, (mx + (X(F, x) - nx) / z + 0.5) * w - 0.5, (my + (Y(F, y) - ny) / z + 0.5) * h - 0.5, rand, px)) { out.r[i] = px[0]; out.g[i] = px[1]; out.b[i] = px[2]; }
    else { out.r[i] = NACHT[0] / 255; out.g[i] = NACHT[1] / 255; out.b[i] = NACHT[2] / 255; }
  }
  leuchtdichte(out);
  return out;
}

const mische = (a, b, t) => a + (b - a) * t;
const endlich = (x, sonst) => (Number.isFinite(x) ? x : sonst);
/** Faktor, der eine Grösse vom gemessenen Wert auf das Ziel bringt (nur Skalierung; aus nichts entsteht keine Struktur) */
const zielFaktor = (ist, soll, sonst) => (Math.abs(ist) > 1e-6 && Number.isFinite(soll) ? soll / ist : sonst);

/**
 * Die Komponenten eines Bildes verändern. f: { ausschnitt, naehe, rand, symmetrie, achse, licht, mitte, kontrast, saettigung },
 * ziel: Profil oder null, angleichung 0–1 (wie weit statt der Faktoren das Ziel gilt). Gibt { bild, faktoren } zurück.
 * Jeder Schritt misst seine Komponente am aktuellen Zwischenstand; begrenzt wird erst am Ende.
 */
export function komponiere(bild, f, { ziel = null, angleichung = 1 } = {}) {
  let F = felder(bild);
  const a = ziel ? Math.max(0, Math.min(1, angleichung)) : 0;
  const eff = {};
  const { w, h } = F, n = w * h;

  // 1 · Ausschnitt: der Bildinhalt wird verschoben wie bei einem Schwenk, so dass der Schwerpunkt des Gewichts bei Faktor × Versatz
  // läge (0 = Mitte, −1 = gegenüber); Nähe zoomt um diese Stelle. «wiederholen» schiebt im Kreis und behält allen Inhalt; «spiegeln»
  // und «Grund» verändern das Gewicht selbst. Wo der Schwerpunkt danach wirklich liegt, misst das Profil «nachher».
  {
    const c = schwerpunkt(F);
    const nx = mische(f.ausschnitt * c.x, endlich(ziel?.schwerpunkt?.x, c.x), a), ny = mische(f.ausschnitt * c.y, endlich(ziel?.schwerpunkt?.y, c.y), a);
    eff.ausschnitt = { x: r3(nx), y: r3(ny) }; eff.naehe = f.naehe;
    if (Math.abs(nx - c.x) > 1e-6 || Math.abs(ny - c.y) > 1e-6 || f.naehe !== 1) F = verschiebe(F, c.x, c.y, nx, ny, f.naehe, f.rand ?? "wiederholen");
  }

  // 2 · Symmetrie: asymmetrischer Teil × Faktor (0 = spiegelgleich, −1 = gespiegelt)
  {
    const l = lichtzerlegung(F), e = spiegelenergie(F, f.achse, l.mittel);
    const soll = ziel ? 1 - Math.min(0.999, Math.max(0.001, endlich(ziel.symmetrie[f.achse === "ou" ? "obenUnten" : "linksRechts"], e.symmetrie))) : null;
    const k = mische(f.symmetrie, soll === null || e.a < 1e-9 ? f.symmetrie : Math.sqrt((soll * e.s) / ((1 - soll) * e.a)), a);
    eff.symmetrie = r3(k);
    if (k !== 1) {
      const kanaele = [F.r, F.g, F.b];
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const xm = f.achse === "ou" ? x : w - 1 - x, ym = f.achse === "ou" ? h - 1 - y : y, i = y * w + x, j = ym * w + xm;
        if (j <= i) continue;   // jedes Paar einmal; die Mittellinie ist ihr eigener Spiegel
        for (const c of kanaele) { const s = (c[i] + c[j]) / 2, d = (c[i] - c[j]) / 2; c[i] = s + k * d; c[j] = s - k * d; }
      }
      leuchtdichte(F);
    }
  }

  // 3 · Lichtgefälle und 4 · Mitte/Rand: die angepassten Ebenen der Leuchtdichte werden ersetzt, Farben verschieben sich mit
  {
    const l = lichtzerlegung(F);
    const gx = mische(f.licht * l.gx, endlich(ziel?.licht?.gefaelleX, l.gx), a), gy = mische(f.licht * l.gy, endlich(ziel?.licht?.gefaelleY, l.gy), a);
    const cr = mische(f.mitte * l.cr, -endlich(ziel?.licht?.mitte, -l.cr), a);
    eff.licht = { x: r3(gx), y: r3(gy) }; eff.mitte = r3(-cr);
    const dx = gx - l.gx, dy = gy - l.gy, dc = cr - l.cr;
    if (dx || dy || dc) {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const xx = X(F, x), yy = Y(F, y), d = dx * xx + dy * yy + dc * (RHO(xx, yy) - l.rhoMittel), i = y * w + x;
        F.r[i] += d; F.g[i] += d; F.b[i] += d; F.L[i] += d;
      }
    }
  }

  // 5 · Binnenkontrast: der Rest nach Mittel, Gefälle und Mitte/Rand × Faktor (−1 kehrt die Tonwerte um, das Licht bleibt)
  {
    const l = lichtzerlegung(F);
    const k = mische(f.kontrast, zielFaktor(l.binnen, ziel?.kontrast?.binnen, f.kontrast), a);
    eff.kontrast = r3(k);
    if (k !== 1) {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const xx = X(F, x), yy = Y(F, y), i = y * w + x;
        const rest = F.L[i] - l.mittel - l.gx * xx - l.gy * yy - l.cr * (RHO(xx, yy) - l.rhoMittel), d = (k - 1) * rest;
        F.r[i] += d; F.g[i] += d; F.b[i] += d; F.L[i] += d;
      }
    }
  }

  // 6 · Sättigung: Farbabweichung vom Grau × Faktor (0 = Grau, −1 = Gegenfarben)
  {
    const fa = farbmessung(F);
    const k = mische(f.saettigung, zielFaktor(fa.saettigung, ziel?.farbe?.saettigung, f.saettigung), a);
    eff.saettigung = r3(k);
    if (k !== 1) for (let i = 0; i < n; i++) { const L = F.L[i]; F.r[i] = L + k * (F.r[i] - L); F.g[i] = L + k * (F.g[i] - L); F.b[i] = L + k * (F.b[i] - L); }
  }

  for (const c of [F.r, F.g, F.b]) for (let i = 0; i < n; i++) c[i] = c[i] < 0 ? 0 : c[i] > 1 ? 1 : c[i];
  return { bild: ausFeldern(F), faktoren: eff };
}

/** die auffälligsten Veränderungen zwischen zwei Profilen, als kurze Zeile (Messung, kein Urteil) */
export function veraenderung(vorher, nachher, hoechstens = 3) {
  const zahl = (v) => (Math.round(v * 100) / 100).toLocaleString("de-CH");
  const paare = [
    ["Symmetrie l–r", vorher.symmetrie.linksRechts, nachher.symmetrie.linksRechts, 1],
    ["Symmetrie o–u", vorher.symmetrie.obenUnten, nachher.symmetrie.obenUnten, 1],
    ["Schwerpunkt", vorher.schwerpunkt.abstand, nachher.schwerpunkt.abstand, 1],
    ["Lichtgefälle", vorher.licht.gefaelleStaerke, nachher.licht.gefaelleStaerke, 0.5],
    ["Mitte/Rand", vorher.licht.mitte, nachher.licht.mitte, 0.5],
    ["Binnenkontrast", vorher.kontrast.binnen, nachher.kontrast.binnen, 0.3],
    ["Sättigung", vorher.farbe.saettigung, nachher.farbe.saettigung, 0.3],
  ].map(([name, v, w, spanne]) => ({ name, v, w, rel: Math.abs(w - v) / spanne })).filter((x) => x.rel > 0.01).sort((p, q) => q.rel - p.rel);
  return paare.length ? paare.slice(0, hoechstens).map((x) => `${x.name} ${zahl(x.v)} → ${zahl(x.w)}`).join(" · ") : "Profil unverändert";
}
