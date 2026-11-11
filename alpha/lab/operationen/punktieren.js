// ORNAMENT LAB – Punktieren (räumliche Operation, seit Lab 0.1.36). Übertragen aus den Plotter-Umwandlern «Voronoi Stippling» und «Voronoi»
// von Makelangelo (GPL-2.0, nur das Prinzip, kein Code) und der Punktiermanier des Kupferstichs: Der Ton wird zur Dichte der Punkte, nicht
// zu ihrer Grösse. Makelangelo verteilt die Punkte mit gewichteter Voronoi-Relaxation, Schritt um Schritt (Secord, «Weighted Voronoi
// Stippling», 2002); das Lab rechnet stattdessen je Pixel: In jeder Zelle eines Gitters liegt ein gewürfelter Punkt, und er bleibt nur,
// wenn ein zweiter Würfel unter dem Ton an seiner Stelle liegt. Das ist kein Gleichgewicht wie bei der Relaxation, aber es trägt dieselbe
// Idee und läuft auf der Grafikkarte in jedem Bild neu. Aus denselben Punkten werden wahlweise die Voronoi-Zellen: als Linien oder als
// Mosaik in der Farbe des Bildes am Punkt, wie ein Glasfenster, dessen Scheiben im Dunkeln klein werden.
// Im Film schimmern die Punkte um ihre Plätze.
import { bildfilter, gemeinsameParameter, zahl, wahl } from "./bildfilter.js";
import { lesen, taste, farbeAn, maler, deckung, wuerfel, DUNKEL, PAPIER, tonParameter, laufParameter } from "./linienbild.js";

/** wie viele Punkte auch im Hellen bleiben, je Art (Zellen und Mosaik brauchen Nachbarn) */
export const MINDESTDICHTE = { punkte: 0, zellen: 0.2, mosaik: 0.3 };

export function punktieren(bild, p, { seed = 1 } = {}) {
  const W = bild.width, H = bild.height, c = Math.max(3, p.abstand * Math.max(W, H)), s = seed % 65536;
  const L = lesen(bild, p, c / 2), m = maler(p), min = MINDESTDICHTE[p.art] ?? 0, halb = Math.max(0.5, (p.linie * c) / 2);
  const out = { width: W, height: H, data: new Uint8ClampedArray(W * H * 4) }, o = out.data;
  // die Punkte je Zelle, einmal gerechnet: Lage, Ton und ob er bleibt
  const nx = Math.ceil(W / c) + 2, ny = Math.ceil(H / c) + 2, pkt = new Float32Array(nx * ny * 4);
  for (let gy = -1; gy < ny - 1; gy++) for (let gx = -1; gx < nx - 1; gx++) {
    const k = ((gy + 1) * nx + gx + 1) * 4;
    const x = (gx + 0.5 + p.zittern * 0.9 * (wuerfel(gx, gy, s) - 0.5)) * c, y = (gy + 0.5 + p.zittern * 0.9 * (wuerfel(gx, gy, s + 1) - 0.5)) * c;
    const T = taste(L.ton, W, H, x, y);
    pkt[k] = x; pkt[k + 1] = y; pkt[k + 2] = T; pkt[k + 3] = wuerfel(gx, gy, s + 2) < min + (1 - min) * T ? 1 : 0;
  }
  const farbe = [0, 0, 0];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const px = x + 0.5, py = y + 0.5, gx = Math.floor(px / c), gy = Math.floor(py / c), i = (y * W + x) * 4;
      let d1 = Infinity, d2 = Infinity, k1 = -1, dpunkt = 0, kp = -1;
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
        const zx = gx + ox, zy = gy + oy;
        if (zx < -1 || zy < -1 || zx >= nx - 1 || zy >= ny - 1) continue;
        const k = ((zy + 1) * nx + zx + 1) * 4;
        if (!pkt[k + 3]) continue;
        const d = Math.hypot(px - pkt[k], py - pkt[k + 1]);
        if (d < d1) { d2 = d1; d1 = d; k1 = k; } else if (d < d2) d2 = d;
        if (p.art === "punkte") {
          const r = p.punkt * c * (1 - p.wachsen + p.wachsen * Math.sqrt(pkt[k + 2])), dd = deckung(d - r);
          if (dd > dpunkt) { dpunkt = dd; kp = k; }
        }
      }
      if (p.art === "punkte") { m.setze(o, i, dpunkt, kp >= 0 ? m.tinte(L, pkt[kp], pkt[kp + 1]) : undefined); continue; }
      if (k1 < 0) { m.setze(o, i, 0); continue; }
      const kante = deckung((d2 - d1) / 2 - halb);   // halber Abstand zur Mittelsenkrechten, genähert
      if (p.art === "zellen") {
        const kernpunkt = deckung(d1 - Math.max(0.8, halb * 1.6));
        m.setze(o, i, Math.max(kante, kernpunkt), m.mitBild ? m.tinte(L, pkt[k1], pkt[k1 + 1]) : undefined);
      } else {   // mosaik: die Zelle in der Farbe des Bildes an ihrem Punkt, die Fugen dunkel (bei «Bildfarben auf Papier» hell)
        farbeAn(L, pkt[k1], pkt[k1 + 1], farbe);
        const fuge = p.farbe === "papier" ? PAPIER : DUNKEL;
        for (let q = 0; q < 3; q++) o[i + q] = (farbe[q] + (fuge[q] - farbe[q]) * kante) * 255;
        o[i + 3] = 255;
      }
    }
  }
  let bleiben = 0;
  for (let k = 3; k < pkt.length; k += 4) bleiben += pkt[k];
  return { bild: out, protokoll: { art: p.art, zellePx: Math.round(c * 10) / 10, punkte: bleiben, startwert: s } };
}

export const punktierenOperation = bildfilter({
  id: "lab.punktieren",
  name: "Punktieren",
  version: "0.1.0",
  klasse: "raeumlich",
  herkunft: { art: "neu", quelle: "ORNAMENT LAB", referenz: "Prinzip der Plotter-Umwandler Voronoi Stippling und Voronoi in Makelangelo (Marginally Clever Robots, GPL-2.0), eigenständig umgesetzt, kein Code übernommen; Secord 2002; Punktiermanier", datei: "alpha/lab/operationen/punktieren.js" },
  beschreibung: "Das Dunkel wird zur Dichte gewürfelter Punkte. Aus denselben Punkten entstehen wahlweise Voronoi-Zellen als Linien oder als Mosaik in den Farben des Bildes, dessen Scheiben im Dunkeln klein werden.",
  moduliert: "punkt",
  titel: "Punktiert",
  parameter: [
    wahl("art", "Form", "punkte", [["punkte", "Punkte (Stippling)"], ["zellen", "Voronoi-Zellen (Linien)"], ["mosaik", "Mosaik (Zellen in Bildfarben)"]]),
    zahl("abstand", "Zellweite", 0.004, 0.05, 0.009, 0.001, "Anteil der längsten Seite; höchstens ein Punkt je Zelle"),
    zahl("punkt", "Punktgrösse", 0.1, 0.7, 0.36, 0.01, "Radius, Anteil der Zellweite"),
    zahl("wachsen", "Punkte wachsen mit dem Dunkel", 0, 1, 0.4, 0.01),
    zahl("linie", "Linienstärke der Zellen", 0.02, 0.4, 0.09, 0.01, "Anteil der Zellweite"),
    zahl("zittern", "Zufall der Lage", 0, 1, 1, 0.01, "0: Gitter, 1: frei in der Zelle"),
    laufParameter(0.5, "wie stark die Punkte im Film um ihre Plätze schimmern"),
    ...tonParameter(),
    ...gemeinsameParameter({ flackern: true }),
  ],
  ressourcen: { zeit: "neun Nachbarzellen je Pixel (1200 px: unter 1 s)", speicher: "ein Ton- und drei Farbfelder, ein Punkt je Zelle" },
  rechne: ({ bild }, p, { seed }) => punktieren(bild, p, { seed }),
});
