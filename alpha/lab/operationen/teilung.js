// ORNAMENT LAB – Teilung (räumliche Operation, seit Lab 0.1.36). Übertragen aus den Plotter-Umwandlern «QuadTree», «Truchet from Image»
// und «Boxxy» von Makelangelo (GPL-2.0, nur das Prinzip, kein Code): Ein Quadrat wird geviertelt, solange sein Inhalt dunkel genug ist
// (oder bewegt genug: wie verschieden seine vier Viertel sind), und mit jeder Tiefe muss er etwas dunkler sein. So wird das Bild dort fein geteilt, wo es dicht
// ist, und bleibt im Hellen grob. Jedes Blatt der Teilung wird gefüllt: mit seinem Rahmen, mit seiner mittleren Farbe (ein Mosaik, das
// der Bildinformation folgt), mit Truchet-Bögen, deren Richtung der Ton gegen eine gewürfelte Schwelle wählt, oder mit einem Quadrat, das mit dem Dunkel wächst.
// Gemessen wird exakt über Summentabellen (jede Zelle in vier Zugriffen), darum hängt die Rechenzeit nicht von der Tiefe ab.
// Im Film drehen sich die Truchet-Kacheln einzeln, und die Schwelle (Standardziel der Modulation) lässt die Teilung im Klang atmen.
import { bildfilter, gemeinsameParameter, zahl, wahl } from "./bildfilter.js";
import { lesen, maler, deckung, wuerfel, DUNKEL, PAPIER, tonParameter, laufParameter } from "./linienbild.js";

/** Summentabelle (W+1) × (H+1) eines Feldes */
function summen(f, W, H) {
  const S = new Float64Array((W + 1) * (H + 1));
  for (let y = 0; y < H; y++) {
    let zeile = 0;
    for (let x = 0; x < W; x++) { zeile += f[y * W + x]; S[(y + 1) * (W + 1) + x + 1] = S[y * (W + 1) + x + 1] + zeile; }
  }
  return S;
}

export function teilung(bild, p) {
  const W = bild.width, H = bild.height, Lg = Math.max(W, H), ox = (W - Lg) / 2, oy = (H - Lg) / 2, tiefe = Math.round(p.tiefe);
  const L = lesen(bild, p, 0), m = maler(p), halb = Math.max(0.5, (p.strich * Lg) / 2), n = Math.max(1, Math.round(p.linien));
  const ST = summen(L.ton, W, H), kontrast = p.kriterium === "kontrast";
  const SF = p.fuellung === "flaeche" ? [summen(L.r, W, H), summen(L.g, W, H), summen(L.b, W, H)] : null;
  const out = { width: W, height: H, data: new Uint8ClampedArray(W * H * 4) }, o = out.data;
  const mittel = (S, x0, y0, x1, y1) => {
    const a = Math.max(0, Math.round(x0)), b = Math.max(0, Math.round(y0)), c = Math.min(W, Math.round(x1)), d = Math.min(H, Math.round(y1));
    if (c <= a || d <= b) return null;
    return (S[d * (W + 1) + c] - S[b * (W + 1) + c] - S[d * (W + 1) + a] + S[b * (W + 1) + a]) / ((c - a) * (d - b));
  };
  const blaetter = new Map();   // Zelle → { Ton, Farbe }: einmal je Blatt gemessen
  const blatt = (px, py) => {
    for (let t = 0; t < tiefe; t++) {
      const s = Lg / 2 ** t, ix = Math.floor((px - ox) / s), iy = Math.floor((py - oy) / s), x0 = ox + ix * s, y0 = oy + iy * s;
      const T = mittel(ST, x0, y0, x0 + s, y0 + s) ?? 0;
      let mass = T;
      if (kontrast) {   // wie verschieden die vier Viertel sind: die Frage, die eine Teilung stellt
        let v = 0;
        for (const [a, b] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const q = mittel(ST, x0 + (a * s) / 2, y0 + (b * s) / 2, x0 + ((a + 1) * s) / 2, y0 + ((b + 1) * s) / 2) ?? T; v += (q - T) ** 2; }
        mass = Math.min(1, 4 * Math.sqrt(v / 4));
      }
      if (t === tiefe - 1 || s < 8 || mass <= p.schwelle + t * p.anstieg) {   // kleiner als 4 px wird nicht geteilt
        const k = `${t}:${ix}:${iy}`;
        let b = blaetter.get(k);
        if (!b) {
          b = { t, s, x0, y0, T, h: wuerfel(ix, iy, t) };
          if (SF) b.farbe = SF.map((S) => mittel(S, x0, y0, x0 + s, y0 + s) ?? 0);
          blaetter.set(k, b);
        }
        return b;
      }
    }
  };
  const fuge = p.farbe === "papier" ? PAPIER : DUNKEL;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const px = x + 0.5, py = y + 0.5, i = (y * W + x) * 4, b = blatt(px, py), lx = px - b.x0, ly = py - b.y0, s = b.s;
      const rand = Math.min(lx, s - lx, ly, s - ly);
      if (p.fuellung === "flaeche") {
        const k = deckung(rand - halb);
        for (let q = 0; q < 3; q++) o[i + q] = (b.farbe[q] + (fuge[q] - b.farbe[q]) * k) * 255;
        o[i + 3] = 255;
        continue;
      }
      let d;
      if (p.fuellung === "rahmen") d = deckung(rand - halb);
      else if (p.fuellung === "boxen") { const seite = s * 0.92 * Math.sqrt(b.T); d = deckung(Math.max(Math.abs(lx - s / 2), Math.abs(ly - s / 2)) - seite / 2); }
      else {   // truchet: Viertelbögen um zwei gegenüberliegende Ecken; der Ton wählt das Paar
        const u = lx / s, v = ly / s, quer = b.h < b.T;   // gewürfelte Schwelle: der Ton bestimmt den Anteil der Richtungen
        const ax = quer ? 1 : 0, cx = quer ? 0 : 1, r = Math.min(Math.hypot(u - ax, v), Math.hypot(u - cx, v - 1));
        const q = r * n - 0.5, abstand = (Math.abs(q - Math.round(q)) / n) * s;
        d = r <= 1 ? deckung(abstand - halb) : 0;
      }
      m.setze(o, i, d, d > 0 ? m.tinte(L, px, py) : undefined);
    }
  }
  const tiefen = new Array(tiefe).fill(0);
  for (const b of blaetter.values()) tiefen[b.t]++;
  return { bild: out, protokoll: { kriterium: p.kriterium, fuellung: p.fuellung, blaetter: blaetter.size, jeTiefe: tiefen } };
}

export const teilungOperation = bildfilter({
  id: "lab.teilung",
  name: "Teilung",
  version: "0.1.0",
  klasse: "raeumlich",
  herkunft: { art: "neu", quelle: "ORNAMENT LAB", referenz: "Prinzip der Plotter-Umwandler QuadTree, Truchet from Image und Boxxy in Makelangelo (Marginally Clever Robots, GPL-2.0), eigenständig umgesetzt, kein Code übernommen; Truchet-Kacheln (Sébastien Truchet 1704, Bögen nach Cyril Stanley Smith 1987)", datei: "alpha/lab/operationen/teilung.js" },
  beschreibung: "Das Bild wird wie ein Quadtree geviertelt, wo es dunkel oder bewegt ist, und bleibt im Hellen grob. Die Felder werden zu Rahmen, zu einem Mosaik aus ihren Farben, zu Truchet-Bögen oder zu wachsenden Quadraten.",
  moduliert: "schwelle",
  titel: "Teilung",
  parameter: [
    wahl("fuellung", "Füllung", "flaeche", [["flaeche", "Mosaik (mittlere Farbe je Feld)"], ["rahmen", "Rahmen"], ["truchet", "Truchet-Bögen"], ["boxen", "Quadrate, die mit dem Dunkel wachsen"]]),
    wahl("kriterium", "Teilen nach", "dunkel", [["dunkel", "Dunkel"], ["kontrast", "Kontrast (wie verschieden die Viertel sind)"]]),
    zahl("tiefe", "Tiefe", 2, 9, 6, 1, "so oft wird höchstens geviertelt"),
    zahl("schwelle", "Schwelle", 0, 1, 0.4, 0.01, "geteilt wird, was darüber liegt"),
    zahl("anstieg", "Anstieg je Tiefe", -0.1, 0.2, 0.06, 0.005, "so viel strenger wird die Schwelle mit jeder Tiefe"),
    zahl("strich", "Strichstärke", 0.0005, 0.006, 0.0016, 0.0001, "Anteil der längsten Seite"),
    zahl("linien", "Bögen je Truchet-Kachel", 1, 5, 2, 1),
    laufParameter(0.3, "wie oft sich die Truchet-Kacheln im Film drehen"),
    ...tonParameter(),
    ...gemeinsameParameter(),
  ],
  ressourcen: { zeit: "Summentabellen, dann je Pixel höchstens neun Zugriffe (1200 px: unter 0,5 s)", speicher: "bis zu vier Summentabellen in doppelter Genauigkeit" },
  rechne: ({ bild }, p) => teilung(bild, p),
});
