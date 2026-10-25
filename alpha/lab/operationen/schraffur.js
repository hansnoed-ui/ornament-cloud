// ORNAMENT LAB – Schraffur in Lagen (räumliche Operation, seit Lab 0.1.36). Übertragen aus den Plotter-Umwandlern «Crosshatch» und
// «Multipass» von Makelangelo (GPL-2.0, nur das Prinzip, kein Code) und der Kreuzschraffur des Kupferstichs: Das Dunkel wird in Stufen
// geteilt, und jede Stufe bekommt eine eigene Lage paralleler Linien in einem eigenen Winkel. Die erste Lage liegt schon im Halbschatten,
// jede weitere kommt erst dazu, wo das Bild dunkler wird; im tiefen Dunkel liegen alle übereinander. Innerhalb ihrer Stufe schwillt eine
// Linie an, und ein leichtes Zittern entlang der Linie gibt die Hand. Anders als «Raster und Linien» (Linienstärke folgt dem Ton in
// höchstens zwei Richtungen) ist hier der Ton in die Zahl der Lagen übersetzt.
import { bildfilter, gemeinsameParameter, zahl, wahl } from "./bildfilter.js";
import { lesen, maler, deckung, glatt, rauschen, tonParameter, laufParameter } from "./linienbild.js";

/** die Winkel der Lagen: gekreuzt wie im Stich (0°, 90°, 45°, 135° zur Grundrichtung) oder gleichmässig als Fächer */
export function lagenWinkel(p) {
  const n = Math.round(p.lagen), k = p.folge === "faecher" ? Array.from({ length: n }, (_, i) => (180 * i) / n) : [0, 90, 45, 135].slice(0, n);
  return k.map((w) => p.winkel + w);
}

export function schraffur(bild, p) {
  const W = bild.width, H = bild.height, c = Math.max(2, p.abstand * Math.max(W, H)), cx = W / 2, cy = H / 2;
  const L = lesen(bild, p, c / 2), m = maler(p), halb = Math.max(0.5, (p.strich * c) / 2);
  const out = { width: W, height: H, data: new Uint8ClampedArray(W * H * 4) }, o = out.data;
  const lagen = lagenWinkel(p).map((w, k) => {
    const a = (w * Math.PI) / 180, n = lagen0(p, k);
    return { co: Math.cos(a), si: Math.sin(a), schwelle: n, versatz: (k * 0.37) % 1 };
  });
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x, T = L.ton[i], dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      let d = 0;
      for (let k = 0; k < lagen.length; k++) {
        const g = lagen[k], s = g.schwelle;
        if (T < s - p.weich) continue;
        const u = g.co * dx + g.si * dy;
        let w = -g.si * dx + g.co * dy + g.versatz * c;
        const j0 = Math.floor(w / c + 0.5);
        w += p.zittern * c * 0.7 * (rauschen(u / (4 * c), j0 + 17 * k, 3) - 0.5);
        const j = Math.floor(w / c + 0.5), v = w - j * c;
        const staerke = p.anschwellen ? 0.35 + 0.65 * Math.min(1, Math.max(0, (T - s) / Math.max(0.05, 1 - s)) * 1.4 + 0.2) : 1;
        const dk = deckung(Math.abs(v) - halb * staerke) * glatt(s - p.weich, s + p.weich, T);
        if (dk > d) d = dk;
      }
      m.setze(o, i * 4, d, d > 0 ? m.tinte(L, x + 0.5, y + 0.5) : undefined);
    }
  }
  return { bild: out, protokoll: { lagen: lagen.length, winkel: lagenWinkel(p), schwellen: lagen.map((g) => Math.round(g.schwelle * 1000) / 1000), abstandPx: Math.round(c * 10) / 10 } };
}
/** Schwelle der Lage k: gleichmässig über das Dunkel, durch «Schwelle» gemeinsam verschoben */
export const lagen0 = (p, k) => Math.min(0.98, Math.max(0.02, (k + 1) / (Math.round(p.lagen) + 1) + p.schwelle));

export const schraffurOperation = bildfilter({
  id: "lab.schraffur",
  name: "Schraffur in Lagen",
  version: "0.1.0",
  klasse: "raeumlich",
  herkunft: { art: "neu", quelle: "ORNAMENT LAB", referenz: "Prinzip der Plotter-Umwandler Crosshatch und Multipass in Makelangelo (Marginally Clever Robots, GPL-2.0), eigenständig umgesetzt, kein Code übernommen; Kreuzschraffur des Kupferstichs", datei: "alpha/lab/operationen/schraffur.js" },
  beschreibung: "Das Dunkel wird in Stufen geteilt, jede Stufe bekommt eine Lage paralleler Linien in eigenem Winkel: im Halbschatten eine, im tiefen Dunkel alle übereinander, leicht von Hand gezittert.",
  moduliert: "schwelle",
  titel: "Schraffur",
  parameter: [
    zahl("lagen", "Lagen", 1, 4, 4, 1),
    wahl("folge", "Winkel der Lagen", "gekreuzt", [["gekreuzt", "gekreuzt wie im Stich (0°, 90°, 45°, 135°)"], ["faecher", "Fächer (gleichmässig verteilt)"]]),
    zahl("winkel", "Grundwinkel (°)", -90, 90, 45, 1),
    zahl("abstand", "Linienabstand", 0.003, 0.05, 0.009, 0.001, "Anteil der längsten Seite"),
    zahl("strich", "Strichstärke", 0.05, 0.8, 0.24, 0.01, "Anteil des Linienabstands"),
    zahl("schwelle", "Schwelle verschieben", -0.5, 0.5, 0, 0.01, "unter 0 kommen die Lagen früher (dunkler), über 0 später"),
    zahl("weich", "Übergang der Stufen", 0, 0.3, 0.05, 0.01),
    zahl("zittern", "Zittern der Hand", 0, 1, 0.2, 0.01),
    { id: "anschwellen", name: "Linien schwellen mit dem Dunkel an", art: "schalter", standard: true },
    laufParameter(0.25, "Linienabstände je Sekunde, um die die Lagen im Film quer wandern"),
    ...tonParameter(),
    ...gemeinsameParameter(),
  ],
  ressourcen: { zeit: "ein Durchgang je Pixel, höchstens vier Lagen (1200 px: unter 1 s)", speicher: "ein Ton- und drei Farbfelder" },
  rechne: ({ bild }, p) => schraffur(bild, p),
});
