// ORNAMENT LAB – Bildsignal (Kopplungsoperation, Medienwechsel Bild → Steuerdaten). Übertragen aus TouchDesigner (TOP to CHOP: Pixel
// eines Bildes werden zu Kanälen mit Zahlenwerten) und Max/Jitter (jit.matrix → Zahlen). Recherche: docs/REFERENZ-MATRIX.md.
//
// Das Ergebnis ist ein Steuersignal (Werte 0–1 entlang einer Achse). Es kann als Modulationsquelle «Steuersignal» jede Zahl jeder
// Operation steuern: ein Bild bestimmt so, wie ein anderes (oder es selbst) weiter verändert wird. Später kann dasselbe Signal
// Klangparameter steuern, oder ein Klang liefert ein Signal derselben Form (docs/AUDIO-FORMAT.md).
import { luminanz } from "../kern/bilddaten.js";

export const bildsignal = {
  id: "lab.bildsignal",
  name: "Bildsignal",
  version: "0.1.0",
  klasse: "kopplung",
  herkunft: { art: "neu", quelle: "ORNAMENT LAB", referenz: "TouchDesigner TOP to CHOP; Max/Jitter (Matrix zu Zahlen)", datei: "src/lab/operationen/bildsignal.js" },
  beschreibung: "Misst ein Merkmal entlang einer Achse und gibt es als Steuersignal aus, das andere Operationen modulieren kann.",
  eingaenge: [{ name: "bild", typ: "IMAGE" }],
  ausgaenge: [{ name: "signal", typ: "CONTROL_SIGNAL" }],
  parameter: [
    { id: "achse", name: "Achse", art: "wahl", standard: "x", optionen: [{ wert: "x", name: "waagrecht (links → rechts)" }, { wert: "y", name: "senkrecht (oben → unten)" }, { wert: "radial", name: "radial (Mitte → Rand)" }] },
    { id: "merkmal", name: "Merkmal", art: "wahl", standard: "helligkeit", optionen: [{ wert: "helligkeit", name: "Helligkeit" }, { wert: "saettigung", name: "Sättigung" }, { wert: "kante", name: "Kantenstärke" }] },
    { id: "proben", name: "Proben", art: "zahl", min: 8, max: 256, standard: 48, schritt: 1 },
    { id: "normieren", name: "auf 0–1 strecken", art: "schalter", standard: true },
  ],
  voraussetzungen: [],
  ressourcen: { zeit: "ein Durchgang über die Pixel", speicher: "gering" },
  reproduzierbar: "ja",
  varianten: "keine",

  async ausfuehren({ bild }, p) {
    const { width: w, height: h, data: d } = bild, n = Math.round(p.proben);
    const summe = new Float64Array(n), anzahl = new Float64Array(n);
    const L = (x, y) => { const j = (y * w + x) * 4; return luminanz(d[j], d[j + 1], d[j + 2]) / 255; };
    const rmax = Math.hypot(w / 2, h / 2);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const j = (y * w + x) * 4;
      let v;
      if (p.merkmal === "saettigung") { const mx = Math.max(d[j], d[j + 1], d[j + 2]), mn = Math.min(d[j], d[j + 1], d[j + 2]); v = mx ? (mx - mn) / mx : 0; }
      else if (p.merkmal === "kante") v = x > 0 && y > 0 && x < w - 1 && y < h - 1 ? Math.min(1, Math.hypot(L(x + 1, y) - L(x - 1, y), L(x, y + 1) - L(x, y - 1)) * 2) : 0;
      else v = L(x, y);
      const t = p.achse === "x" ? (x + 0.5) / w : p.achse === "y" ? (y + 0.5) / h : Math.hypot(x + 0.5 - w / 2, y + 0.5 - h / 2) / rmax;
      const k = Math.min(n - 1, Math.floor(t * n));
      summe[k] += v; anzahl[k]++;
    }
    let werte = Array.from(summe, (s, k) => (anzahl[k] ? s / anzahl[k] : 0));
    const roh = { min: Math.min(...werte), max: Math.max(...werte) };
    if (p.normieren && roh.max - roh.min > 1e-6) werte = werte.map((v) => (v - roh.min) / (roh.max - roh.min));
    werte = werte.map((v) => Math.round(v * 10000) / 10000);
    return {
      ausgaben: [{ typ: "CONTROL_SIGNAL", titel: `Signal: ${p.merkmal}, ${p.achse}`, daten: { werte, achse: p.achse, merkmal: p.merkmal, einheit: "0–1" } }],
      protokoll: { rohbereich: { min: Math.round(roh.min * 1000) / 1000, max: Math.round(roh.max * 1000) / 1000 }, proben: n },
    };
  },
};
