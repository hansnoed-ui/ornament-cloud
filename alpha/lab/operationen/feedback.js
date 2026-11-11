// ORNAMENT LAB – Feedback (rekursive Operation). Übertragen aus dem Prinzip der Feedback-Schleife in TouchDesigner (Feedback TOP:
// das Ergebnis des letzten Bildes wird wieder Eingang, dazwischen Transformation und Komposition), ebenso Video-Feedback in Resolume
// und analoges Kamera-Monitor-Feedback. Recherche: docs/REFERENZ-MATRIX.md; nichts aus proprietärem Code, nur das dokumentierte Prinzip.
//
// Eigenständig für ORNAMENT: die Operation ist eine Rekursion auf ihr eigenes Ergebnis mit offen gelegten Stellgrössen.
//   fb_k(x)  = abklingen · Farbdrehung( fb_{k-1}( T⁻¹ x ) )      T = Zoom, Drehung, Versatz um die Bildmitte
//   out_k    = Komposition( Eingang, fb_k, mischung )              mischen | heller | differenz
// Jede Iteration ist ein Zwischenzustand (Nacheinander); die Bildfolge ist zugleich die Animation. Modulationsrouten können
// jede Stellgrösse über die Iterationen verändern (dieselbe Route, die sonst Varianten verteilt).
import { alsFelder, ausFeldern, begrenzen, tasteFeld, farbdrehung } from "../kern/bilddaten.js";
import { moduliere } from "../kern/modulation.js";

const zahl = (id, name, min, max, standard, schritt, hilfe) => ({ id, name, art: "zahl", min, max, standard, schritt, hilfe });

export const feedback = {
  id: "lab.feedback",
  name: "Feedback",
  version: "0.1.0",
  klasse: "rekursiv",
  herkunft: { art: "neu", quelle: "ORNAMENT LAB", referenz: "TouchDesigner Feedback TOP; Video-Feedback (Resolume); Kamera-Monitor-Schleife", datei: "alpha/lab/operationen/feedback.js" },
  beschreibung: "Das Bild wird wiederholt auf sein eigenes Ergebnis angewandt: gezoomt, gedreht, verschoben, farblich gedreht und mit dem Eingang gemischt.",
  eingaenge: [{ name: "bild", typ: "IMAGE" }],
  ausgaenge: [{ name: "bild", typ: "IMAGE" }],
  parameter: [
    zahl("iterationen", "Iterationen", 1, 120, 24, 1, "wie oft das Ergebnis wieder Eingang wird"),
    zahl("zoom", "Zoom je Iteration", 0.8, 1.25, 1.04, 0.005),
    zahl("drehung", "Drehung je Iteration (°)", -20, 20, 3, 0.5),
    zahl("versatzX", "Versatz waagrecht", -0.08, 0.08, 0, 0.002),
    zahl("versatzY", "Versatz senkrecht", -0.08, 0.08, 0, 0.002),
    zahl("mischung", "Anteil des Eingangs", 0, 1, 0.15, 0.01, "0: nur Rückkopplung, 1: nur Eingang"),
    zahl("abklingen", "Abklingen", 0.8, 1, 0.97, 0.005),
    zahl("farbdrehung", "Farbdrehung je Iteration (°)", -60, 60, 6, 1),
    { id: "mischart", name: "Komposition", art: "wahl", standard: "mischen", optionen: [{ wert: "mischen", name: "mischen" }, { wert: "heller", name: "heller" }, { wert: "differenz", name: "Differenz" }] },
    { id: "rand", name: "Rand", art: "wahl", standard: "spiegeln", optionen: [{ wert: "spiegeln", name: "spiegeln" }, { wert: "wiederholen", name: "wiederholen" }, { wert: "grund", name: "dunkler Grund" }] },
    zahl("seite", "Rechengrösse (längste Seite, px)", 256, 1600, 900, 1, "begrenzt Rechenzeit und Speicher"),
  ],
  voraussetzungen: [],
  ressourcen: { zeit: "Iterationen × Pixel (900 px, 24 Iterationen: etwa 1 s)", speicher: "drei Gleitkommabilder" },
  reproduzierbar: "ja",
  varianten: "moduliert",

  async ausfuehren({ bild }, p, kontext = {}) {
    let letztes = null;
    for await (const f of this.verlauf({ bild }, p, kontext)) letztes = f;
    return { ausgaben: [{ typ: "IMAGE", titel: "Feedback", bild: letztes.bild }], protokoll: { iterationen: p.iterationen, rechengroesse: [letztes.bild.width, letztes.bild.height] } };
  },

  /** wie viele Bilder der Verlauf liefert */
  verlaufBilder: (p) => p.iterationen + 1,

  /** die Bildfolge: Iteration 0 ist der Eingang, danach jedes Zwischenergebnis */
  async *verlauf({ bild }, p, kontext = {}) {
    const quelle = alsFelder(begrenzen(bild, p.seite));
    const { w, h } = quelle, n = w * h;
    let fb = { w, h, r: quelle.r.slice(), g: quelle.g.slice(), b: quelle.b.slice() };
    let neu = { w, h, r: new Float32Array(n), g: new Float32Array(n), b: new Float32Array(n) };
    const px = [0, 0, 0], cx = w / 2, cy = h / 2;
    yield { k: 0, bild: ausFeldern(fb) };
    for (let k = 1; k <= p.iterationen; k++) {
      kontext.abbrechen?.throwIfAborted?.();
      const q = kontext.zeitRouten?.length ? moduliere(this, p, kontext.zeitRouten, k / p.iterationen) : p;
      const a = (q.drehung * Math.PI) / 180, c = Math.cos(a) / q.zoom, s = Math.sin(a) / q.zoom;
      const ox = q.versatzX * w, oy = q.versatzY * h, M = farbdrehung(q.farbdrehung), d = q.abklingen, mix = q.mischung;
      for (let y = 0; y < h; y++) {
        const dy = y + 0.5 - cy;
        for (let x = 0; x < w; x++) {
          const dx = x + 0.5 - cx, i = y * w + x;
          const sx = cx + c * dx + s * dy - ox - 0.5, sy = cy - s * dx + c * dy - oy - 0.5;
          let r = 0, g = 0, b = 0;
          if (tasteFeld(fb, sx, sy, q.rand, px)) {
            r = d * (M[0] * px[0] + M[1] * px[1] + M[2] * px[2]);
            g = d * (M[3] * px[0] + M[4] * px[1] + M[5] * px[2]);
            b = d * (M[6] * px[0] + M[7] * px[1] + M[8] * px[2]);
          } else { r = 21 / 255; g = 20 / 255; b = 18 / 255; }
          const er = quelle.r[i], eg = quelle.g[i], eb = quelle.b[i];
          if (q.mischart === "heller") { r = Math.max(r, er * mix + r * (1 - mix)); g = Math.max(g, eg * mix + g * (1 - mix)); b = Math.max(b, eb * mix + b * (1 - mix)); }
          else if (q.mischart === "differenz") { r = Math.abs(r - er * mix); g = Math.abs(g - eg * mix); b = Math.abs(b - eb * mix); }
          else { r = er * mix + r * (1 - mix); g = eg * mix + g * (1 - mix); b = eb * mix + b * (1 - mix); }
          neu.r[i] = r < 0 ? 0 : r > 1 ? 1 : r; neu.g[i] = g < 0 ? 0 : g > 1 ? 1 : g; neu.b[i] = b < 0 ? 0 : b > 1 ? 1 : b;
        }
      }
      [fb, neu] = [neu, fb];
      kontext.melden?.(`Iteration ${k} von ${p.iterationen}`, k / p.iterationen);
      yield { k, bild: ausFeldern(fb) };
    }
  },
};
