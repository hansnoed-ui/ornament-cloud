// ORNAMENT LAB – Raster und Linien (räumliche Operation, seit Lab 0.1.10). Übertragen aus der amplitudenmodulierten Rasterung des
// Drucks (Punktgrösse folgt dem Tonwert, Rasterwinkel), dem Kupferstich und der Schraffur (Linienstärke und Kreuzlage folgen dem Dunkel)
// und dem Grundprinzip der Bildarbeit in Processing und p5.js: das Bild abtasten und an jeder Stelle eine Form zeichnen. Die
// Wellenlinien folgen den gestapelten Profillinien, wie sie Joy Divisions «Unknown Pleasures» aus Pulsar-Daten bekannt gemacht hat.
//
// Eine Rasterzelle ist Unterscheidung im Wortsinn: das Bild wird in gleich grosse Felder geteilt, und jedes Feld bezeichnet nur noch
// einen Wert durch eine Form. Gerechnet wird je Pixel und analytisch (Abstand zur Form, ein Pixel weich), darum ohne Zeichenfläche.
import { alsFelder, tasteFeld, luminanz, NACHT } from "../kern/bilddaten.js";
import { bildfilter, gemeinsameParameter, zahl, wahl } from "./bildfilter.js";

const PAPIER = [244 / 255, 241 / 255, 234 / 255];   // The Fictory, zeichnen.js PAPIER #f4f1ea
const DUNKEL = NACHT.map((v) => v / 255);
const deckung = (abstand) => (abstand <= -0.5 ? 1 : abstand >= 0.5 ? 0 : 0.5 - abstand);

export function raster(bild, p) {
  const f = alsFelder(bild), W = f.w, H = f.h, cx = W / 2, cy = H / 2;
  const c = Math.max(2, p.zelle * Math.max(W, H)), a = (p.winkel * Math.PI) / 180, co = Math.cos(a), si = Math.sin(a);
  const px = [0, 0, 0], farbe = [0, 0, 0];
  const out = { width: W, height: H, data: new Uint8ClampedArray(W * H * 4) }, o = out.data;
  const grund = p.farbe === "nacht" ? DUNKEL : PAPIER;
  // gedrehtes Raster: (u, v) = Drehung von (x, y) um die Bildmitte; zurück: Bildkoordinaten einer Rasterstelle
  const abtasten = (u, v) => {
    tasteFeld(f, cx + co * u - si * v - 0.5, cy + si * u + co * v - 0.5, "spiegeln", px);
    const l = luminanz(px[0], px[1], px[2]);
    return Math.min(1, Math.max(0, p.umkehren ? l : 1 - l)) ** p.gewicht;
  };
  // Linien und Wellen tasten entlang ihrer Grundlinie ab: einmal je Linie und ganzzahliger Stelle, dann nachgeschlagen (Telefon)
  const D = Math.ceil(Math.hypot(W, H) / 2) + 2, linie = new Map();
  const entlang = (j, u) => {
    let t = linie.get(j);
    if (!t) { t = new Float32Array(2 * D + 1); const basis = (j + 0.5) * c; for (let k = 0; k <= 2 * D; k++) t[k] = abtasten(k - D, basis); linie.set(j, t); }
    const q = Math.min(2 * D - 1, Math.max(0, u + D)), k = Math.floor(q), f = q - k;
    return t[k] + (t[k + 1] - t[k]) * f;
  };
  const amp = p.amplitude * c, dicke = Math.max(1, c * 0.16), reichweite = Math.ceil(p.amplitude) + 1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy, u = co * dx + si * dy, v = -si * dx + co * dy;
      let d = 0, fu = u, fv = v;   // Deckung 0–1 und die Stelle, deren Farbe die Form trägt
      if (p.art === "mosaik") { fu = (Math.floor(u / c) + 0.5) * c; fv = (Math.floor(v / c) + 0.5) * c; d = 1; }
      else if (p.art === "punkte") {
        fu = (Math.floor(u / c) + 0.5) * c; fv = (Math.floor(v / c) + 0.5) * c;
        const r = c * 0.71 * Math.sqrt(abtasten(fu, fv));
        d = deckung(Math.hypot(u - fu, v - fv) - r);
      } else if (p.art === "linien" || p.art === "kreuz") {
        const j = Math.floor(v / c);
        fv = (j + 0.5) * c;
        const w = entlang(j, u);
        d = deckung(Math.abs(v - fv) - (w * c) / 2);
        if (p.art === "kreuz") {
          const fu2 = (Math.floor(u / c) + 0.5) * c, w2 = Math.max(0, 2 * abtasten(fu2, v) - 1);
          const d2 = deckung(Math.abs(u - fu2) - (w2 * c) / 2);
          if (d2 > d) { d = d2; fu = fu2; fv = v; }
        }
      } else {   // wellen: Linie j liegt bei (j + ½)·c und wird um das Dunkel unter ihr angehoben
        const j0 = Math.floor(v / c);
        for (let j = j0 - 1; j <= j0 + reichweite; j++) {
          const basis = (j + 0.5) * c, hoehe = basis - amp * entlang(j, u), dd = deckung(Math.abs(v - hoehe) - dicke / 2);
          if (dd > d) { d = dd; fv = basis; }
        }
      }
      let r = DUNKEL[0], g = DUNKEL[1], b = DUNKEL[2];
      if (p.farbe !== "tinte" || p.art === "mosaik") {
        tasteFeld(f, cx + co * fu - si * fv - 0.5, cy + si * fu + co * fv - 0.5, "spiegeln", farbe);
        r = farbe[0]; g = farbe[1]; b = farbe[2];
      }
      const i = (y * W + x) * 4;
      o[i] = (grund[0] + (r - grund[0]) * d) * 255; o[i + 1] = (grund[1] + (g - grund[1]) * d) * 255; o[i + 2] = (grund[2] + (b - grund[2]) * d) * 255; o[i + 3] = 255;
    }
  }
  return { bild: out, protokoll: { art: p.art, zellePx: Math.round(c * 10) / 10, winkel: p.winkel, farbe: p.farbe } };
}

export const rasterOperation = bildfilter({
  id: "lab.raster",
  name: "Raster und Linien",
  version: "0.1.0",
  klasse: "raeumlich",
  herkunft: { art: "neu", quelle: "ORNAMENT LAB", referenz: "amplitudenmodulierte Rasterung des Drucks; Kupferstich und Schraffur; Bild abtasten und Formen zeichnen in Processing/p5.js; gestapelte Profillinien (Unknown Pleasures)", datei: "alpha/lab/operationen/raster.js" },
  beschreibung: "Übersetzt das Bild in ein gedrehtes Raster: Punkte, Linien, Kreuzschraffur oder Wellenlinien, deren Grösse dem Dunkel folgt, oder ein Mosaik. In Tinte auf Papier oder in den Farben des Bildes.",
  moduliert: "zelle",
  titel: "Raster",
  parameter: [
    wahl("art", "Form", "punkte", [["punkte", "Punkte (Druckraster)"], ["linien", "Linien"], ["kreuz", "Kreuzschraffur"], ["wellen", "Wellenlinien"], ["mosaik", "Mosaik"]]),
    zahl("zelle", "Rasterweite", 0.004, 0.08, 0.015, 0.001, "Anteil der längsten Seite"),
    zahl("winkel", "Rasterwinkel (°)", -90, 90, 45, 1),
    zahl("gewicht", "Gewicht der Tonwerte", 0.3, 3, 1, 0.05, "unter 1 kräftiger, über 1 nur das tiefe Dunkel"),
    zahl("amplitude", "Höhe der Wellen", 0, 6, 1.5, 0.1, "in Rasterweiten (nur Wellenlinien)"),
    wahl("farbe", "Farben", "tinte", [["tinte", "Tinte auf Papier"], ["papier", "Bildfarben auf Papier"], ["nacht", "Bildfarben auf Nacht"]]),
    { id: "umkehren", name: "Licht statt Dunkel zeichnen", art: "schalter", standard: false },
    ...gemeinsameParameter(),
  ],
  ressourcen: { zeit: "ein Durchgang mit ein bis wenigen Abtastungen je Pixel (1200 px: unter 0,5 s)", speicher: "ein Gleitkommabild" },
  rechne: ({ bild }, p) => raster(bild, p),
});
