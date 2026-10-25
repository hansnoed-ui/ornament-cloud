// ORNAMENT LAB – Pulslinien (räumliche Operation, seit Lab 0.1.36). Übertragen aus den Plotter-Umwandlern «Pulse», «Spiral Pulse», «Sandy»
// und «Spiral» von Makelangelo (GPL-2.0, nur das Prinzip, kein Code): Eine Trägerlinie läuft über das Bild, parallele Linien, eine Spirale
// aus der Mitte oder Kreise um einen Punkt, und schwingt, wo das Bild dunkel ist. Der Ton regelt beides, den Hub (Amplitude) und die
// Dichte der Schwingung (Frequenz), wie ein Signal, das zugleich amplituden- und frequenzmoduliert ist. «Schwelle» schwingt nicht: Der Stift
// setzt nur ab, wo der Ton eine Stufe übersteigt, die von Linie zu Linie wechselt (vier Stufen), so entsteht Tonwert aus Unterbrechung.
//
// Die Phase der Schwingung ist das Integral der Frequenz entlang des Trägers. Darum hängt jede Welle an der ganzen Linie vor ihr und
// verdichtet sich, ohne zu springen. Kreise und Windungen der Spirale schliessen mit einer ganzen Zahl von Schwingungen, damit keine Naht
// entsteht. Gerechnet wird je Pixel und analytisch (Abstand zur Welle, durch die Steigung geteilt, ein Pixel weich); die Phase steht in
// einer Tabelle je Linie, die einmal entlang der Linie abgetastet wird.
import { bildfilter, gemeinsameParameter, zahl, wahl } from "./bildfilter.js";
import { lesen, taste, maler, deckung, glatt, tonParameter, laufParameter } from "./linienbild.js";

const ZWEI_PI = 2 * Math.PI;
/** Wellenformen: Wert und Ableitung nach der Phase (im Bogenmass) */
const WELLE = {
  sinus: (f) => [Math.sin(f), Math.cos(f)],
  zickzack: (f) => [(2 / Math.PI) * Math.asin(Math.sin(f)), (2 / Math.PI) * Math.sign(Math.cos(f))],
  rechteck: (f) => { const t = Math.tanh(3 * Math.sin(f)), n = Math.tanh(3); return [t / n, (3 * Math.cos(f) * (1 - t * t)) / n]; },
  schwelle: () => [0, 0],
};

export function puls(bild, p) {
  const W = bild.width, H = bild.height, L0 = Math.max(W, H), c = Math.max(2, p.abstand * L0);
  const L = lesen(bild, p, c / 2), m = maler(p), halb = Math.max(0.5, (p.strich * c) / 2), welle = WELLE[p.welle] ?? WELLE.sinus;
  const out = { width: W, height: H, data: new Uint8ClampedArray(W * H * 4) }, o = out.data;
  const frequenz = (T) => (p.dichte * (p.ruhe + (1 - p.ruhe) * T)) / c;   // Schwingungen je Pixel
  const a = (p.winkel * Math.PI) / 180, co = Math.cos(a), si = Math.sin(a), cx = W / 2, cy = H / 2;
  const mx = p.mitteX * W, my = p.mitteY * H, R = Math.ceil(Math.hypot(W, H) / 2) + 2;
  // je Linie: Ton und Phase (Schwingungen) an den Stützstellen; offen (parallele Linien) oder geschlossen mit ganzer Zahl von Schwingungen
  const linien = new Map();
  const tabelle = (schluessel, M, stelle, schritt, geschlossen) => {
    let t = linien.get(schluessel);
    if (t) return t;
    const ton = new Float32Array(M + 1), phase = new Float32Array(M + 1), q = [0, 0];
    for (let i = 0; i <= M; i++) { stelle(i, q); ton[i] = taste(L.ton, W, H, q[0], q[1]); }
    for (let i = 0; i < M; i++) phase[i + 1] = phase[i] + frequenz((ton[i] + ton[i + 1]) / 2) * schritt(i + 0.5);
    let dehnung = 1;
    if (geschlossen && phase[M] > 0) { dehnung = Math.max(1, Math.round(phase[M])) / phase[M]; for (let i = 0; i <= M; i++) phase[i] *= dehnung; }
    t = { ton, phase, M, schritt, dehnung };
    linien.set(schluessel, t);
    return t;
  };
  const lies = (t, x) => {
    const q = Math.min(t.M - 1e-6, Math.max(0, x)), i = Math.floor(q), f = q - i;
    return [t.ton[i] + (t.ton[i + 1] - t.ton[i]) * f, t.phase[i] + (t.phase[i + 1] - t.phase[i]) * f, (t.phase[i + 1] - t.phase[i]) / t.schritt(i + 0.5)];
  };
  const stufe = (j) => ((((j % 4) + 4) % 4) + 0.5) / 4;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const px = x + 0.5, py = y + 0.5;
      let t = null, stelle = 0, v = 0, j = 0, zentrum = 1;
      if (p.traeger === "linien") {
        const dx = px - cx, dy = py - cy, u = co * dx + si * dy, w = -si * dx + co * dy;
        j = Math.floor(w / c + 0.5); v = w - j * c;
        t = tabelle(j, 2 * R, (i, q) => { q[0] = cx + (i - R) * co - j * c * si; q[1] = cy + (i - R) * si + j * c * co; }, () => 1, false);
        stelle = u + R;
      } else {
        const dx = px - mx, dy = py - my, r = Math.hypot(dx, dy), th = Math.atan2(dy, dx) + Math.PI;
        zentrum = Math.min(1, r / (2 * c));   // in der Mitte sind die Windungen zu eng zum Schwingen
        if (p.traeger === "kreise") {
          j = Math.floor(r / c + 0.5);
          if (j >= 1) {
            const rho = j * c, M = Math.max(16, Math.ceil(ZWEI_PI * rho));
            v = r - rho;
            t = tabelle(j, M, (i, q) => { const f = (i / M) * ZWEI_PI - Math.PI; q[0] = mx + rho * Math.cos(f); q[1] = my + rho * Math.sin(f); }, () => (ZWEI_PI * rho) / M, true);
            stelle = (th / ZWEI_PI) * M;
          }
        } else {   // spirale: r = c · (n + θ/2π), Windung n
          j = Math.floor(r / c - th / ZWEI_PI + 0.5);
          if (j >= 0) {
            const M = Math.max(16, Math.ceil(ZWEI_PI * c * (j + 0.5))), n = j;
            v = r - c * (j + th / ZWEI_PI);
            t = tabelle(`s${j}`, M, (i, q) => { const f = (i / M) * ZWEI_PI, rho = c * (n + i / M); q[0] = mx + rho * Math.cos(f - Math.PI); q[1] = my + rho * Math.sin(f - Math.PI); },
              (i) => (ZWEI_PI * c * (n + i / M)) / M, true);
            stelle = (th / ZWEI_PI) * M;
          }
        }
      }
      let d = 0, tinte = null;
      if (t) {
        const [T, phi, dphi] = lies(t, stelle), A = p.hub * T * zentrum * Math.max(0, c / 2 - halb);
        const [w, w1] = welle(ZWEI_PI * (phi + p.phase / 360)), steigung = A * w1 * ZWEI_PI * dphi;
        d = deckung(Math.abs(v - A * w) / Math.sqrt(1 + steigung * steigung) - halb);
        if (p.welle === "schwelle") d *= glatt(stufe(j) - 0.04, stufe(j) + 0.04, T);
        if (d > 0) tinte = m.tinte(L, px, py);
      }
      m.setze(o, (y * W + x) * 4, d, tinte ?? undefined);
    }
  }
  return { bild: out, protokoll: { traeger: p.traeger, welle: p.welle, abstandPx: Math.round(c * 10) / 10, linien: linien.size } };
}

export const pulsOperation = bildfilter({
  id: "lab.puls",
  name: "Pulslinien",
  version: "0.1.0",
  klasse: "raeumlich",
  herkunft: { art: "neu", quelle: "ORNAMENT LAB", referenz: "Prinzip der Plotter-Umwandler Pulse, Spiral Pulse, Sandy und Spiral in Makelangelo (Marginally Clever Robots, GPL-2.0), eigenständig umgesetzt, kein Code übernommen", datei: "alpha/lab/operationen/puls.js" },
  beschreibung: "Eine Linie läuft über das Bild, parallel, als Spirale oder in Kreisen, und schwingt, wo es dunkel ist: je dunkler, desto höher und dichter. Wie ein Plotter, der das Bild mit einem einzigen Puls zeichnet.",
  moduliert: "hub",
  titel: "Pulslinien",
  parameter: [
    wahl("traeger", "Träger", "linien", [["linien", "parallele Linien"], ["spirale", "Spirale aus der Mitte"], ["kreise", "Kreise um einen Punkt"]]),
    wahl("welle", "Schwingung", "sinus", [["sinus", "Sinus (weich)"], ["zickzack", "Zickzack"], ["rechteck", "Rechteck (Puls)"], ["schwelle", "Schwelle: absetzen statt schwingen"]]),
    zahl("abstand", "Linienabstand", 0.004, 0.06, 0.014, 0.001, "Anteil der längsten Seite"),
    zahl("hub", "Hub", 0, 1, 0.9, 0.01, "Höhe der Schwingung im tiefen Dunkel, Anteil des halben Abstands"),
    zahl("dichte", "Dichte der Schwingung", 0.2, 8, 2.5, 0.1, "Schwingungen je Linienabstand im tiefen Dunkel"),
    zahl("ruhe", "Grundschwingung im Hellen", 0, 1, 0.15, 0.01, "Anteil der Dichte, der auch im Hellen bleibt"),
    zahl("strich", "Strichstärke", 0.05, 0.6, 0.16, 0.01, "Anteil des Linienabstands"),
    zahl("winkel", "Winkel der Linien (°)", -90, 90, 0, 1),
    zahl("mitteX", "Mitte waagrecht (Spirale, Kreise)", 0, 1, 0.5, 0.01),
    zahl("mitteY", "Mitte senkrecht (Spirale, Kreise)", 0, 1, 0.5, 0.01),
    zahl("phase", "Phase (°)", 0, 360, 0, 1, "verschiebt die Schwingung entlang der Linie"),
    laufParameter(0.6, "Schwingungen je Sekunde, die im Film entlang der Linien wandern"),
    ...tonParameter(),
    ...gemeinsameParameter(),
  ],
  ressourcen: { zeit: "ein Durchgang je Pixel, die Phase einmal je Linie abgetastet (1200 px: unter 1 s)", speicher: "ein Ton- und drei Farbfelder, je Linie eine Tabelle" },
  rechne: ({ bild }, p) => puls(bild, p),
});
