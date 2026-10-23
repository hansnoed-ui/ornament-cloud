// ORNAMENT LAB – Wiederholung mit Falloff (räumliche Operation). Übertragen aus dem Duplicator mit Falloff in Cavalry (Kopien in einer
// Anordnung, deren Eigenschaften ein Feld über die Lage verteilt) und den Instanzen der Geometry Nodes in Blender. Recherche: docs/REFERENZ-MATRIX.md.
//
// Das Eingangsbild wird in einem Raster wiederholt; jede Kopie bekommt Grösse und Drehung aus einem Falloff-Wert f (0–1), der aus ihrer Lage
// folgt (linear in Lesereihenfolge, radial von der Mitte oder gehaltener Zufall). So wird aus einer Wiederholung eine Verteilung:
// Nebeneinander als Abstufung derselben Operation. Jede Kopie bleibt in ihrer Zelle (Zellen sind Fenster, keine Ebenen).
import { alsFelder, begrenzen, neuesBild, tasteFeld, NACHT } from "../kern/bilddaten.js";
import { zufall } from "../../../alpha/the-fictory/analyse.js?v=23";

const zahl = (id, name, min, max, standard, schritt, hilfe) => ({ id, name, art: "zahl", min, max, standard, schritt, hilfe });
const PAPIER = [244, 241, 234];   // The Fictory, zeichnen.js PAPIER #f4f1ea

export const wiederholung = {
  id: "lab.wiederholung",
  name: "Wiederholung mit Falloff",
  version: "0.1.0",
  klasse: "raeumlich",
  herkunft: { art: "neu", quelle: "ORNAMENT LAB", referenz: "Cavalry Duplicator + Falloff; Blender Geometry Nodes (Instances)", datei: "src/lab/operationen/wiederholung.js" },
  beschreibung: "Das Bild wird im Raster wiederholt; Grösse und Drehung jeder Kopie folgen einem Falloff über die Lage.",
  eingaenge: [{ name: "bild", typ: "IMAGE" }],
  ausgaenge: [{ name: "bild", typ: "IMAGE" }],
  parameter: [
    zahl("spalten", "Spalten", 1, 12, 4, 1),
    zahl("zeilen", "Zeilen", 1, 12, 4, 1),
    zahl("groesse", "Grösse der Kopien", 0.2, 1.6, 0.9, 0.01),
    zahl("drehung", "Drehung (°)", -180, 180, 0, 1),
    zahl("falloffGroesse", "Falloff auf Grösse", -1, 1, 0.5, 0.01, "−1 … +1: wie stark f die Grösse verändert"),
    zahl("falloffDrehung", "Falloff auf Drehung", -1, 1, 0.25, 0.01, "−1 … +1: f · 180°"),
    { id: "falloff", name: "Falloff", art: "wahl", standard: "radial", optionen: [{ wert: "linear", name: "linear (Lesereihenfolge)" }, { wert: "radial", name: "radial (von der Mitte)" }, { wert: "zufall", name: "Zufall (gehalten)" }] },
    { id: "spiegeln", name: "jede zweite Kopie spiegeln", art: "schalter", standard: true },
    { id: "grund", name: "Grund", art: "wahl", standard: "nacht", optionen: [{ wert: "nacht", name: "Nacht" }, { wert: "papier", name: "Papier" }] },
    zahl("seite", "Rechengrösse (längste Seite, px)", 256, 2048, 1200, 1),
  ],
  voraussetzungen: [],
  ressourcen: { zeit: "ein Durchgang über die Pixel", speicher: "ein Bild" },
  reproduzierbar: "ja",
  varianten: "moduliert",

  async ausfuehren({ bild }, p, kontext = {}) {
    const src = alsFelder(bild);
    const ziel = begrenzen(bild, p.seite);
    const W = ziel.width, H = ziel.height, out = neuesBild(W, H, p.grund === "papier" ? PAPIER : NACHT);
    const sp = Math.round(p.spalten), ze = Math.round(p.zeilen), n = sp * ze, cw = W / sp, ch = H / ze;
    const rnd = zufall((kontext.seed ?? 1) >>> 0);
    const kopien = [];
    for (let j = 0; j < ze; j++) for (let i = 0; i < sp; i++) {
      const k = j * sp + i;
      const f = p.falloff === "linear" ? (n > 1 ? k / (n - 1) : 0.5)
        : p.falloff === "zufall" ? rnd()
          : Math.min(1, Math.hypot((i + 0.5) / sp - 0.5, (j + 0.5) / ze - 0.5) / Math.SQRT1_2);
      const s = Math.max(0.05, p.groesse * (1 + p.falloffGroesse * (2 * f - 1)));
      const rot = ((p.drehung + p.falloffDrehung * 180 * (2 * f - 1)) * Math.PI) / 180;
      const fit = Math.min(cw / src.w, ch / src.h) * s;
      kopien.push({ i, j, f: Math.round(f * 1000) / 1000, s, rot, fit, spiegel: p.spiegeln && (i + j) % 2 === 1 });
    }
    const px = [0, 0, 0];
    for (let y = 0; y < H; y++) {
      const j = Math.min(ze - 1, Math.floor(y / ch));
      for (let x = 0; x < W; x++) {
        const i = Math.min(sp - 1, Math.floor(x / cw)), K = kopien[j * sp + i];
        const lx = x + 0.5 - (i + 0.5) * cw, ly = y + 0.5 - (j + 0.5) * ch;
        const c = Math.cos(-K.rot), s = Math.sin(-K.rot);
        let ux = (c * lx - s * ly) / K.fit, uy = (s * lx + c * ly) / K.fit;
        if (K.spiegel) ux = -ux;
        if (tasteFeld(src, ux + src.w / 2 - 0.5, uy + src.h / 2 - 0.5, "grund", px)) {
          const o = (y * W + x) * 4;
          out.data[o] = px[0] * 255; out.data[o + 1] = px[1] * 255; out.data[o + 2] = px[2] * 255;
        }
      }
    }
    return {
      ausgaben: [{ typ: "IMAGE", titel: `Wiederholung ${sp} × ${ze}`, bild: out }],
      protokoll: { kopien: kopien.map(({ i, j, f, s, rot, spiegel }) => ({ spalte: i + 1, zeile: j + 1, falloff: f, groesse: Math.round(s * 1000) / 1000, drehungGrad: Math.round((rot * 180) / Math.PI), spiegel })) },
    };
  },
};
