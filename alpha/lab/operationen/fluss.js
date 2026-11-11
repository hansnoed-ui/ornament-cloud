// ORNAMENT LAB – Fliessfeld (räumliche Operation, seit Lab 0.1.36). Übertragen aus dem Plotter-Umwandler «Flow Field» von Makelangelo
// (GPL-2.0, nur das Prinzip, kein Code: Linien folgen einem Richtungsfeld aus Rauschen) und der Faltung entlang von Feldlinien
// (Line Integral Convolution, Cabral und Leedom, SIGGRAPH 1993). Jede Stelle folgt dem Feld ein Stück vorwärts und rückwärts und mittelt
// dabei ein feines Korn; so verwischt das Korn zu Strichen, die dem Feld folgen. Wo das Bild dunkel ist, wird aus dem Strichmuster Tinte.
// Das Feld kommt aus dem Bild selbst (entlang der Kanten, also den Linien gleicher Helligkeit, oder quer dazu), aus Rauschen wie bei
// Makelangelo oder als Wirbel um die Mitte; wo das Bild keine Kante hat, übernimmt das Rauschen.
// Im Film wandert ein Wellenzug entlang der Feldlinien (der Faltungskern hat eine laufende Phase), und das Rauschen verändert sich langsam.
import { bildfilter, gemeinsameParameter, zahl, wahl } from "./bildfilter.js";
import { lesen, maler, glatt, glaetten, rauschen, wuerfel, tonParameter, laufParameter } from "./linienbild.js";

export const SCHRITTE = 10;   // Schritte je Richtung entlang der Feldlinie
/** Gewicht der Schritte: Glocke, mit laufender Welle (Phase in Umläufen) */
export const kern = (k, phase) => (0.5 + 0.5 * Math.cos((Math.PI * k) / (SCHRITTE + 1))) * (0.6 + 0.4 * Math.sin(2 * Math.PI * ((1.5 * k) / SCHRITTE - phase)));

export function fluss(bild, p, { seed = 1 } = {}) {
  const W = bild.width, H = bild.height, Lg = Math.max(W, H), n = W * H;
  const korn = Math.max(1, p.koernung * Lg), lang = p.laenge * Lg, h = lang / SCHRITTE, ns = Math.max(4, p.skala * Lg), s = seed % 65536;
  const L = lesen(bild, p, Math.max(1, korn * 0.75)), m = maler(p);
  const out = { width: W, height: H, data: new Uint8ClampedArray(n * 4) }, o = out.data;
  // das Feld: je Pixel eine Richtung (fx, fy)
  const fx = new Float32Array(n), fy = new Float32Array(n), dreh = (p.drehung * Math.PI) / 180, cd = Math.cos(dreh), sd = Math.sin(dreh);
  const rg = Math.max(2, lang / 3), weich = p.feld === "kanten" || p.feld === "quer" ? glaetten(L.ton.slice(), W, H, rg) : null;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x, a = 4 * Math.PI * rauschen((x + 0.5) / ns, (y + 0.5) / ns, s);
      let ex = Math.cos(a), ey = Math.sin(a);
      if (weich) {
        const gx = (weich[y * W + Math.min(W - 1, x + 1)] - weich[y * W + Math.max(0, x - 1)]) / 2, gy = (weich[Math.min(H - 1, y + 1) * W + x] - weich[Math.max(0, y - 1) * W + x]) / 2;
        const b = Math.hypot(gx, gy), g = Math.min(1, b * rg * 6);
        if (b > 1e-9) {
          let tx = p.feld === "kanten" ? -gy / b : gx / b, ty = p.feld === "kanten" ? gx / b : gy / b;
          if (tx * ex + ty * ey < 0) { tx = -tx; ty = -ty; }
          ex = ex * (1 - g) + tx * g; ey = ey * (1 - g) + ty * g;
        }
      } else if (p.feld === "wirbel") {
        const dx = x + 0.5 - W / 2, dy = y + 0.5 - H / 2, r = Math.hypot(dx, dy) || 1;
        ex = ex * 0.25 - (dy / r) * 0.75; ey = ey * 0.25 + (dx / r) * 0.75;
      }
      const b = Math.hypot(ex, ey) || 1;
      ex /= b; ey /= b;
      fx[i] = cd * ex - sd * ey; fy[i] = sd * ex + cd * ey;
    }
  }
  // das Korn: ein Würfel je Korn (weisses Rauschen in der Körnung), entlang der Feldlinie gemittelt wird es zum Strich
  const k0 = new Float32Array(n);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) k0[y * W + x] = wuerfel(Math.floor((x + 0.5) / korn), Math.floor((y + 0.5) / korn), s + 7);
  const gew = Array.from({ length: SCHRITTE + 1 }, (_, k) => kern(k, 0));
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      let summe = k0[i] * gew[0], gs = gew[0];
      for (const r of [1, -1]) {
        let qx = x + 0.5, qy = y + 0.5, vx = fx[i] * r, vy = fy[i] * r;
        for (let k = 1; k <= SCHRITTE; k++) {
          qx += vx * h; qy += vy * h;
          if (qx < 0 || qy < 0 || qx >= W || qy >= H) break;
          const j = Math.floor(qy) * W + Math.floor(qx);
          let ux = fx[j], uy = fy[j];
          if (ux * vx + uy * vy < 0) { ux = -ux; uy = -uy; }   // ein Linienfeld hat keine Richtung: der Linie treu bleiben
          vx = ux; vy = uy;
          summe += k0[j] * gew[k]; gs += gew[k];
        }
      }
      // das gemittelte Korn, gestreckt etwa auf 0–1; Tinte, wo es über dem Hellen liegt (so folgt der Anteil der Tinte dem Ton), ganz Helles bleibt Papier
      const st = Math.min(1, Math.max(0, 0.5 + (summe / gs - 0.5) * p.kontrast)), T = L.ton[i];
      const d = glatt(1 - T - 0.05, 1 - T + 0.05, st) * glatt(0, 0.12, T);
      m.setze(o, i * 4, d, d > 0 ? m.tinte(L, x + 0.5, y + 0.5) : undefined);
    }
  }
  return { bild: out, protokoll: { feld: p.feld, laengePx: Math.round(lang * 10) / 10, koernungPx: Math.round(korn * 10) / 10, startwert: s } };
}

export const flussOperation = bildfilter({
  id: "lab.fluss",
  name: "Fliessfeld",
  version: "0.1.0",
  klasse: "raeumlich",
  herkunft: { art: "neu", quelle: "ORNAMENT LAB", referenz: "Prinzip des Plotter-Umwandlers Flow Field in Makelangelo (Marginally Clever Robots, GPL-2.0), eigenständig umgesetzt, kein Code übernommen; Line Integral Convolution (Cabral und Leedom 1993)", datei: "alpha/lab/operationen/fluss.js" },
  beschreibung: "Feine Striche folgen einem Feld: entlang der Kanten des Bildes, quer dazu, aus Rauschen oder als Wirbel. Wo das Bild dunkel ist, verdichten sie sich zu Tinte. Im Film fliessen sie.",
  moduliert: "laenge",
  titel: "Fliessfeld",
  parameter: [
    wahl("feld", "Feld", "kanten", [["kanten", "entlang der Kanten des Bildes"], ["quer", "quer zu den Kanten"], ["rauschen", "Rauschen"], ["wirbel", "Wirbel um die Mitte"]]),
    zahl("laenge", "Strichlänge", 0.005, 0.12, 0.035, 0.001, "Anteil der längsten Seite, je Richtung"),
    zahl("koernung", "Körnung", 0.001, 0.02, 0.0035, 0.0005, "Feinheit der Striche, Anteil der längsten Seite"),
    zahl("kontrast", "Kontrast der Striche", 1, 8, 3.5, 0.1),
    zahl("skala", "Grösse des Rauschens", 0.05, 1, 0.25, 0.01, "Anteil der längsten Seite"),
    zahl("drehung", "Drehung des Feldes (°)", -180, 180, 0, 1),
    laufParameter(0.5, "Wellen je Sekunde, die im Film entlang der Striche laufen"),
    zahl("wandel", "Wandel des Rauschens im Film", 0, 1, 0.12, 0.01, "wie schnell sich das Rauschen verschiebt (je Sekunde)"),
    ...tonParameter(),
    ...gemeinsameParameter({ seite: 900 }),
  ],
  ressourcen: { zeit: "zwanzig Schritte entlang des Feldes je Pixel (900 px: etwa 1 s)", speicher: "Ton-, Farb-, Feld- und Kornfelder" },
  rechne: ({ bild }, p, { seed }) => fluss(bild, p, { seed }),
});
