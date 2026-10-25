// ORNAMENT LAB – gemeinsame Teile der Linienbilder (seit Lab 0.1.36): Pulslinien, Schraffur in Lagen, Fliessfeld, Punktieren, Teilung.
// Die fünf Operationen übertragen Prinzipien der Bildumwandlung für Zeichenmaschinen (Plotter): Das Bild wird nicht gefiltert, sondern
// gelesen, und an jeder Stelle entscheidet sein Ton, wie eine Linie, ein Punkt oder eine Zelle gezogen wird. Vorbild war die Sammlung der
// Bildumwandler in Makelangelo (Marginally Clever Robots, GPL-2.0); übernommen ist kein Code, nur die Prinzipien, eigenständig und je Pixel
// analytisch gerechnet, damit dieselbe Rechnung auch als Shader auf der Grafikkarte läuft (medien/gpu.js).
//
// Gemeinsam: der Ton (wie dunkel eine Stelle ist, 0–1, gewichtet, wahlweise umgekehrt), aus einem leicht geglätteten Feld gelesen wie die
// Abtastung eines Stifts, der immer eine kleine Fläche mittelt; die Farben (Tinte auf Papier, Bildfarben auf Papier oder auf Nacht);
// ein Pixel weiche Kante; ein Würfel, der ganze Zahlen auf 0–1 abbildet.
import { NACHT, luminanz } from "../kern/bilddaten.js";
import { zahl, wahl } from "./bildfilter.js";

export const PAPIER = [244 / 255, 241 / 255, 234 / 255];   // The Fictory, zeichnen.js PAPIER #f4f1ea
export const DUNKEL = NACHT.map((v) => v / 255);
export const deckung = (abstand) => (abstand <= -0.5 ? 1 : abstand >= 0.5 ? 0 : 0.5 - abstand);
export const glatt = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a || 1e-9))); return t * t * (3 - 2 * t); };

/** ein Würfel: ganze Zahlen (auch negative) → [0, 1) */
export function wuerfel(a, b, c = 0) {
  let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul((b | 0) + 0x632be5ab, 0x165667b1) ^ Math.imul((c | 0) + 0x5bd1e995, 0x9e3779b1);
  h ^= h >>> 15; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
/** Wertrauschen in 2D: Würfel an den Gitterpunkten, weich dazwischen; Ergebnis 0–1 */
export function rauschen(x, y, s = 0) {
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = wuerfel(x0, y0, s), b = wuerfel(x0 + 1, y0, s), c = wuerfel(x0, y0 + 1, s), d = wuerfel(x0 + 1, y0 + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** laufender Kastenfilter in beide Richtungen, zweimal (fast eine Glocke), in linearer Zeit; f wird überschrieben */
export function glaetten(f, w, h, r) {
  r = Math.round(r);
  if (r < 1) return f;
  const tmp = new Float32Array(Math.max(w, h));
  const kasten = (waagrecht) => {
    const n = waagrecht ? w : h, linien = waagrecht ? h : w, s = waagrecht ? 1 : w, teil = 1 / (2 * r + 1);
    for (let l = 0; l < linien; l++) {
      const a = waagrecht ? l * w : l;
      let summe = 0;
      for (let k = -r; k <= r; k++) summe += f[a + Math.min(n - 1, Math.max(0, k)) * s];
      for (let i = 0; i < n; i++) { tmp[i] = summe * teil; summe += f[a + Math.min(n - 1, i + r + 1) * s] - f[a + Math.max(0, i - r) * s]; }
      for (let i = 0; i < n; i++) f[a + i * s] = tmp[i];
    }
  };
  for (let d = 0; d < 2; d++) { kasten(true); kasten(false); }
  return f;
}

/** das Bild als Felder (0–1) und als Tonfeld: wie dunkel jede Stelle ist, nach Gewicht und Richtung, geglättet mit Radius r (px) */
export function lesen(bild, p, r) {
  const W = bild.width, H = bild.height, n = W * H, d = bild.data;
  const rot = new Float32Array(n), gruen = new Float32Array(n), blau = new Float32Array(n), ton = new Float32Array(n);
  for (let i = 0, j = 0; i < n; i++, j += 4) {
    rot[i] = d[j] / 255; gruen[i] = d[j + 1] / 255; blau[i] = d[j + 2] / 255;
    ton[i] = luminanz(rot[i], gruen[i], blau[i]);
  }
  glaetten(ton, W, H, r);
  for (let i = 0; i < n; i++) ton[i] = Math.min(1, Math.max(0, p.umkehren ? ton[i] : 1 - ton[i])) ** p.gewicht;
  return { W, H, r: rot, g: gruen, b: blau, ton };
}
/** bilinear aus einem Feld, am Rand gehalten */
export function taste(f, W, H, x, y) {
  x = Math.min(W - 1, Math.max(0, x - 0.5)); y = Math.min(H - 1, Math.max(0, y - 0.5));
  const x0 = Math.floor(x), y0 = Math.floor(y), x1 = Math.min(W - 1, x0 + 1), y1 = Math.min(H - 1, y0 + 1), fx = x - x0, fy = y - y0;
  const a = f[y0 * W + x0], b = f[y0 * W + x1], c = f[y1 * W + x0], e = f[y1 * W + x1];
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + e) * fx * fy;
}
/** die Farbe an einer Stelle (für «Bildfarben») in aus[0..2] */
export function farbeAn(L, x, y, aus) {
  aus[0] = taste(L.r, L.W, L.H, x, y); aus[1] = taste(L.g, L.W, L.H, x, y); aus[2] = taste(L.b, L.W, L.H, x, y);
  return aus;
}

/** Grund und Tinte nach der Wahl «Farben»; bildfarbe(x, y, aus) liefert die Farbe des Bildes an der Stelle, die die Form trägt */
export function maler(p) {
  const grund = p.farbe === "nacht" ? DUNKEL : PAPIER, mitBild = p.farbe !== "tinte", t = [0, 0, 0];
  return {
    grund, mitBild,
    /** ein Pixel schreiben: Grund, darüber die Tinte mit Deckung d */
    setze(o, i, d, tinte = DUNKEL) {
      o[i] = (grund[0] + (tinte[0] - grund[0]) * d) * 255; o[i + 1] = (grund[1] + (tinte[1] - grund[1]) * d) * 255;
      o[i + 2] = (grund[2] + (tinte[2] - grund[2]) * d) * 255; o[i + 3] = 255;
    },
    tinte(L, x, y) { return mitBild ? farbeAn(L, x, y, t) : DUNKEL; },
  };
}

/** die Parameter, die alle Linienbilder vor den gemeinsamen der Bildfilter tragen */
export const tonParameter = () => [
  zahl("gewicht", "Gewicht der Tonwerte", 0.3, 3, 1, 0.05, "unter 1 kräftiger, über 1 nur das tiefe Dunkel"),
  wahl("farbe", "Farben", "tinte", [["tinte", "Tinte auf Papier"], ["papier", "Bildfarben auf Papier"], ["nacht", "Bildfarben auf Nacht"]]),
  { id: "umkehren", name: "Licht statt Dunkel zeichnen", art: "schalter", standard: false },
];
/** lebendig im Film: wie schnell sich die Zeichnung von selbst bewegt (auf der CPU, im Projekt, steht sie still) */
export const laufParameter = (standard, hilfe) => zahl("lauf", "Lauf im Film (je Sekunde)", 0, 4, standard, 0.05, hilfe);
