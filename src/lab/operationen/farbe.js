// ORNAMENT LAB – Farbe modulieren (räumliche Operation auf den Farbwerten). Eine parametrisierte Filteroperation, wie Farbkorrektur
// in Fusion oder die Filter von p5.js (POSTERIZE, INVERT): bewusst klein, damit sie in jede Kette passt und mit Modulation
// über Varianten oder Zeit läuft. Reihenfolge der Schritte fest und dokumentiert: Drehung → Sättigung → Kontrast → Stufen → Umkehr.
import { neuesBild, farbdrehung, luminanz } from "../kern/bilddaten.js";

const zahl = (id, name, min, max, standard, schritt, hilfe) => ({ id, name, art: "zahl", min, max, standard, schritt, hilfe });

export const farbe = {
  id: "lab.farbe",
  name: "Farbe modulieren",
  version: "0.1.0",
  klasse: "raeumlich",
  herkunft: { art: "neu", quelle: "ORNAMENT LAB", referenz: "Fusion Color Corrector; p5.js filter() (POSTERIZE, INVERT); CSS Filter Effects (hue-rotate)", datei: "src/lab/operationen/farbe.js" },
  beschreibung: "Farbdrehung, Sättigung, Kontrast, Tonwertstufen und Umkehr in fester Reihenfolge.",
  eingaenge: [{ name: "bild", typ: "IMAGE" }],
  ausgaenge: [{ name: "bild", typ: "IMAGE" }],
  parameter: [
    zahl("farbdrehung", "Farbdrehung (°)", -180, 180, 0, 1),
    zahl("saettigung", "Sättigung", 0, 2.5, 1, 0.01),
    zahl("kontrast", "Kontrast", 0.2, 2.5, 1, 0.01),
    zahl("stufen", "Tonwertstufen (0 = aus)", 0, 16, 0, 1),
    { id: "umkehren", name: "umkehren", art: "schalter", standard: false },
  ],
  voraussetzungen: [],
  ressourcen: { zeit: "ein Durchgang über die Pixel", speicher: "ein Bild" },
  reproduzierbar: "ja",
  varianten: "moduliert",

  async ausfuehren({ bild }, p) {
    const out = neuesBild(bild.width, bild.height), d = bild.data, o = out.data, M = farbdrehung(p.farbdrehung);
    const st = Math.round(p.stufen);
    for (let i = 0; i < d.length; i += 4) {
      let r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
      [r, g, b] = [M[0] * r + M[1] * g + M[2] * b, M[3] * r + M[4] * g + M[5] * b, M[6] * r + M[7] * g + M[8] * b];
      const l = luminanz(r, g, b);
      r = l + (r - l) * p.saettigung; g = l + (g - l) * p.saettigung; b = l + (b - l) * p.saettigung;
      r = 0.5 + (r - 0.5) * p.kontrast; g = 0.5 + (g - 0.5) * p.kontrast; b = 0.5 + (b - 0.5) * p.kontrast;
      if (st >= 2) { const q = (v) => Math.round(Math.min(1, Math.max(0, v)) * (st - 1)) / (st - 1); r = q(r); g = q(g); b = q(b); }
      if (p.umkehren) { r = 1 - r; g = 1 - g; b = 1 - b; }
      o[i] = r * 255; o[i + 1] = g * 255; o[i + 2] = b * 255; o[i + 3] = d[i + 3];
    }
    return { ausgaben: [{ typ: "IMAGE", titel: "Farbe", bild: out }], protokoll: { reihenfolge: ["Farbdrehung", "Sättigung", "Kontrast", "Stufen", "Umkehr"] } };
  },
};
