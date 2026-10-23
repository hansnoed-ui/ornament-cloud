// ORNAMENT LAB – Pixelsortierung (räumliche Operation, seit Lab 0.1.10). Übertragen aus dem Verfahren von Kim Asendorf
// (ASDFPixelSort, Processing, 2010): in jeder Zeile oder Spalte werden Abschnitte gesucht, deren Pixel einen Schlüssel innerhalb
// zweier Schwellen haben, und nur diese Abschnitte werden nach dem Schlüssel sortiert. Das Bild bleibt erkennbar, wo die Schwellen
// es schützen, und zerfliesst, wo sie es freigeben. Nur das Prinzip, kein Code von dort.
//
// Eigenständig für ORNAMENT: die Schwellen sind die Unterscheidung (was sortiert wird und was nicht), Schlüssel und Richtung die
// Bezeichnung. «Länge» und «Zufall» brechen lange Abschnitte nach dem Startwert, damit das Fliessen eine Struktur bekommt.
// Sortiert wird stabil: kurze Abschnitte durch Einfügen, lange durch Zählen (256 Fächer), beides in linearer Zeit je Pixel.
import { zufall } from "../../../alpha/the-fictory/analyse.js?v=23";
import { bildfilter, gemeinsameParameter, zahl, wahl } from "./bildfilter.js";

/** Schlüssel 0–255 eines Pixels */
function schluessel(art, r, g, b) {
  if (art === "farbton" || art === "saettigung") {
    const max = Math.max(r, g, b), min = Math.min(r, g, b), c = max - min;
    if (art === "saettigung") return max ? Math.round((255 * c) / max) : 0;
    if (!c) return 0;
    const h = max === r ? ((g - b) / c + 6) % 6 : max === g ? (b - r) / c + 2 : (r - g) / c + 4;
    return Math.min(255, Math.round((h / 6) * 255));
  }
  if (art === "rot") return r;
  if (art === "blau") return b;
  return Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
}

export function pixelsortierung(bild, p, seed) {
  const W = bild.width, H = bild.height, src = bild.data, rnd = zufall(seed >>> 0);
  const out = { width: W, height: H, data: new Uint8ClampedArray(src) };
  const px = new Uint32Array(out.data.buffer);   // ein Pixel als eine Zahl: sortiert wird das ganze RGBA
  const senkrecht = p.richtung === "senkrecht";
  const laenge = senkrecht ? H : W, linien = senkrecht ? W : H;
  const lo = Math.round(Math.min(p.unten, p.oben) * 255), hi = Math.round(Math.max(p.unten, p.oben) * 255);
  const key = new Uint8Array(laenge), idx = new Int32Array(laenge), tmp = new Uint32Array(laenge), tk = new Uint8Array(laenge), zaehler = new Int32Array(256);
  const maxLauf = Math.max(2, Math.round(p.laenge * laenge));
  let abschnitte = 0, sortiert = 0;

  const sortiere = (a, b) => {
    const n = b - a;
    if (n < 2) return;
    abschnitte++; sortiert += n;
    if (n < 48) {   // Einfügen, stabil
      for (let i = a + 1; i < b; i++) {
        const k = key[i], v = tmp[i];
        let j = i - 1;
        while (j >= a && (p.umkehren ? key[j] < k : key[j] > k)) { key[j + 1] = key[j]; tmp[j + 1] = tmp[j]; j--; }
        key[j + 1] = k; tmp[j + 1] = v;
      }
      return;
    }
    zaehler.fill(0);
    for (let i = a; i < b; i++) zaehler[key[i]]++;
    let s = a;
    if (p.umkehren) for (let k = 255; k >= 0; k--) { const c = zaehler[k]; zaehler[k] = s; s += c; }
    else for (let k = 0; k < 256; k++) { const c = zaehler[k]; zaehler[k] = s; s += c; }
    const v = tmp.slice(a, b), kk = tk.subarray(0, n);
    kk.set(key.subarray(a, b));
    for (let i = 0; i < n; i++) { const z = zaehler[kk[i]]++; tmp[z] = v[i]; key[z] = kk[i]; }
  };

  for (let l = 0; l < linien; l++) {
    for (let i = 0; i < laenge; i++) {
      const q = senkrecht ? i * W + l : l * W + i, o = q * 4;
      idx[i] = q; tmp[i] = px[q];
      key[i] = schluessel(p.schluessel, src[o], src[o + 1], src[o + 2]);
    }
    let a = -1, grenze = 0;
    for (let i = 0; i <= laenge; i++) {
      const drin = i < laenge && (p.auswahl === "ausserhalb" ? key[i] < lo || key[i] > hi : key[i] >= lo && key[i] <= hi);
      if (drin && a < 0) { a = i; grenze = a + Math.max(2, Math.round(maxLauf * (1 - p.zufall * rnd()))); }
      else if (a >= 0 && (!drin || i >= grenze)) {
        sortiere(a, i);
        a = drin ? i : -1;
        if (drin) grenze = a + Math.max(2, Math.round(maxLauf * (1 - p.zufall * rnd())));
      }
    }
    for (let i = 0; i < laenge; i++) px[idx[i]] = tmp[i];
  }
  return { bild: out, protokoll: { abschnitte, sortiertePixel: sortiert, anteilSortiert: Math.round((sortiert / (W * H)) * 1000) / 1000, schwellen: [lo, hi] } };
}

export const pixelsortierungOperation = bildfilter({
  id: "lab.pixelsortierung",
  name: "Pixelsortierung",
  version: "0.1.0",
  klasse: "raeumlich",
  herkunft: { art: "neu", quelle: "ORNAMENT LAB", referenz: "Kim Asendorf, ASDFPixelSort (Processing, 2010): Abschnitte zwischen Schwellen sortieren", datei: "alpha/lab/operationen/pixelsortierung.js" },
  beschreibung: "Sortiert in jeder Zeile oder Spalte die Abschnitte, deren Helligkeit (oder Farbton, Sättigung) zwischen zwei Schwellen liegt. Was ausserhalb liegt, bleibt stehen. Die Schwellen sind die Unterscheidung zwischen Bild und Fliessen.",
  moduliert: "unten",
  titel: "Pixelsortierung",
  parameter: [
    wahl("richtung", "Richtung", "waagrecht", [["waagrecht", "waagrecht (Zeilen)"], ["senkrecht", "senkrecht (Spalten)"]]),
    wahl("schluessel", "sortiert nach", "helligkeit", [["helligkeit", "Helligkeit"], ["farbton", "Farbton"], ["saettigung", "Sättigung"], ["rot", "Rot"], ["blau", "Blau"]]),
    zahl("unten", "untere Schwelle", 0, 1, 0.25, 0.01),
    zahl("oben", "obere Schwelle", 0, 1, 0.8, 0.01),
    wahl("auswahl", "sortiert wird", "innerhalb", [["innerhalb", "zwischen den Schwellen"], ["ausserhalb", "ausserhalb der Schwellen"]]),
    zahl("laenge", "längster Abschnitt", 0.02, 1, 1, 0.01, "Anteil der Zeile; kürzer bricht das Fliessen in Stücke"),
    zahl("zufall", "Zufall der Abschnittslänge", 0, 1, 0, 0.01, "0: alle gleich lang, 1: zwischen 0 und dem längsten gewürfelt"),
    { id: "umkehren", name: "absteigend sortieren", art: "schalter", standard: false },
    ...gemeinsameParameter({ flackern: true }),
  ],
  ressourcen: { zeit: "ein Durchgang mit Sortieren in linearer Zeit (1200 px: unter 0,5 s)", speicher: "ein Bild und eine Zeile" },
  rechne: ({ bild }, p, { seed }) => pixelsortierung(bild, p, seed),
});
