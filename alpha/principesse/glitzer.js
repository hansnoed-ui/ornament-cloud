// «Principesse» – Glitzer im Bild finden und zum Leuchten bringen (ohne DOM).
// Glitzer zeigt sich im Foto als dichte Menge winziger Lichtpunkte: Bildpunkte, die heller sind als alles um sie herum.
// Wo solche Punkte dicht liegen (Glitzerband, Krone, Pailletten), wird jeder davon ein Funke: an seiner Stelle, in seiner Farbe
// (nur leicht aufgehellt), mit eigenem Takt. Vereinzelte helle Punkte (Leinwand, Rauschen) bleiben aussen vor.
// Seit dem 12. Oktober 2026 zurückhaltender («der Glitzereffekt ist etwas too much»): weniger Funken, kleiner, wenige Sterne,
// zwischen dem Aufblitzen fast dunkel (kein heller Schleier über ganzen Glitzerflächen).
import { unschaerfe, graustufen } from "../sketchory/strich.js?v=8";
import { zufall } from "./malen.js?v=20";

/** rgba in Filmgrösse w × h → Funken [{ x, y, farbe, groesse, phase, takt, stern }] und Anteil der Glitzerfläche */
const DICHTE = 0.012;   // Anteil Lichtpunkte in der Umgebung, ab dem es Glitzer ist

export function glitzer(rgba, w, h, { hoechstens = 1600, saat = 11 } = {}) {
  const L = graustufen(rgba, w, h);
  const umgebung = unschaerfe(L, w, h, 2, 1);
  const spitze = new Float32Array(w * h);
  const kandidaten = [];
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x, v = L[i], hub = v - umgebung[i];
    // Glitzer reflektiert und wird im Foto fast weiss; das Gewebe der Leinwand in dunkler Farbe bleibt grau (beim Hund im Fell)
    if (hub < 18 || v < 165) continue;
    if (v < L[i - 1] || v < L[i + 1] || v < L[i - w] || v < L[i + w] || v < L[i - w - 1] || v < L[i - w + 1] || v < L[i + w - 1] || v < L[i + w + 1]) continue;
    // ein Korn, kein Strich: auch zwei Punkte weiter in allen acht Richtungen deutlich dunkler (helle Pinselkanten sind Linien und fallen hier heraus)
    if (y < 2 || x < 2 || y > h - 3 || x > w - 3) continue;
    let ring = 0;
    for (const d of [-2 * w - 2, -2 * w, -2 * w + 2, -2, 2, 2 * w - 2, 2 * w, 2 * w + 2]) if (L[i + d] > ring) ring = L[i + d];
    if (v - ring < 10) continue;
    spitze[i] = 1;
    kandidaten.push(i, hub);
  }
  // Dichte der Lichtpunkte: im Glitzer liegen sie eng (mehrere Prozent der Fläche), sonst vereinzelt
  const dichte = unschaerfe(spitze, w, h, 8, 2);
  const funken = [];
  let flaeche = 0;
  for (let i = 0; i < dichte.length; i++) if (dichte[i] > DICHTE) flaeche++;
  for (let k = 0; k < kandidaten.length; k += 2) {
    const i = kandidaten[k], hub = kandidaten[k + 1];
    if (dichte[i] <= DICHTE) continue;
    const j = i * 4;
    funken.push({ i, hub, r: rgba[j], g: rgba[j + 1], b: rgba[j + 2] });
  }
  // zu viele: zufällig ausdünnen (gleichmässig über die Fläche)
  const rnd = zufall(saat);
  for (let a = funken.length - 1; a > 0; a--) { const b = Math.floor(rnd() * (a + 1)); [funken[a], funken[b]] = [funken[b], funken[a]]; }
  const auswahl = funken.slice(0, hoechstens);
  const hubs = auswahl.map((f) => f.hub).sort((a, b) => a - b);
  const sternAb = hubs[Math.floor(hubs.length * 0.992)] ?? Infinity;
  return {
    anteil: flaeche / (w * h),
    funken: auswahl.map((f) => {
      // Farbe des Lichtpunkts, wenig aufgehellt: Gold bleibt Gold, Silber bleibt Silber
      const m = (f.r + f.g + f.b) / 3, satt = (c) => Math.min(255, m + (c - m) * 1.15);
      const hell = (c) => Math.round(Math.min(255, satt(c) * 0.88 + 255 * 0.12));
      return {
        x: (f.i % w) + 0.5, y: ((f.i / w) | 0) + 0.5,
        farbe: [hell(f.r), hell(f.g), hell(f.b)],
        groesse: Math.min(1.9, 0.7 + f.hub / 80),
        phase: rnd(), takt: 0.45 + rnd() * 1.1, ruhe: 0.04,
        stern: f.hub >= sternAb,
      };
    }),
  };
}

/** Helligkeit eines Funkens zur Zeit t (0–1): meist schwach (ruhe; im Bild fast dunkel, im Signet 0,18), kurz hell aufblitzend */
export function funkeln(f, t) {
  const s = 0.5 + 0.5 * Math.sin(2 * Math.PI * (f.takt * t + f.phase)), ruhe = f.ruhe ?? 0.18;
  return ruhe + (1 - ruhe) * s ** 6;
}
