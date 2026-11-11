// ORNAMENT LAB – Zerlegen und neu setzen (räumliche Operation, seit Lab 0.1.10). Übertragen aus dem Cut-up (Brion Gysin und William
// S. Burroughs: der Text wird zerschnitten und neu gelegt), aus Collage und Montage und aus den Kachel-Puzzles der Bildbearbeitung
// (GIMP «Puzzle», «Mosaik»). Anders als The Fictory, die nach Bildinhalt segmentiert, zerlegt diese Operation nach einem festen
// Raster: die Teilung ist eine gesetzte Unterscheidung, nicht eine gefundene.
//
// Das Bild wird in Kacheln oder Streifen geteilt. Ein Anteil davon («beteiligt») nimmt an der Neuordnung teil, die übrigen bleiben an
// ihrem Platz. Die Ordnung ist Zufall (Startwert), Helligkeit oder Umkehrung der Reihe; einzelne Teile können kippen und verrutschen.
// Die Zuordnung Ziel ← Quelle steht im Protokoll.
import { zufall } from "../../../alpha/the-fictory/analyse.js?v=23";
import { luminanz, NACHT } from "../kern/bilddaten.js";
import { bildfilter, gemeinsameParameter, zahl, wahl } from "./bildfilter.js";

export function neusetzen(bild, p, seed) {
  const W = bild.width, H = bild.height, d = bild.data, rnd = zufall(seed >>> 0);
  const sp = p.teilung === "zeilen" ? 1 : Math.round(p.spalten), ze = p.teilung === "spalten" ? 1 : Math.round(p.zeilen), n = sp * ze;
  const tw = W / sp, th = H / ze;
  // mittlere Helligkeit je Teil (Stichproben), für die Ordnung nach Helligkeit
  const hell = new Float64Array(n);
  for (let t = 0; t < n; t++) {
    const x0 = (t % sp) * tw, y0 = Math.floor(t / sp) * th;
    let s = 0, m = 0;
    for (let yy = 0; yy < 8; yy++) for (let xx = 0; xx < 8; xx++) {
      const j = (Math.min(H - 1, Math.floor(y0 + ((yy + 0.5) * th) / 8)) * W + Math.min(W - 1, Math.floor(x0 + ((xx + 0.5) * tw) / 8))) * 4;
      s += luminanz(d[j], d[j + 1], d[j + 2]); m++;
    }
    hell[t] = s / m;
  }
  // beteiligt sind die Teile mit den kleinsten gewürfelten Rängen
  const rang = Array.from({ length: n }, () => rnd());
  const reihe = [...rang.keys()].sort((a, b) => rang[a] - rang[b]);
  const k = Math.round(p.beteiligt * n), beteiligt = reihe.slice(0, k).sort((a, b) => a - b);
  const quelle = Int32Array.from({ length: n }, (_, i) => i);
  let ordnung = beteiligt.slice();
  if (p.ordnung === "zufall") for (let i = ordnung.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [ordnung[i], ordnung[j]] = [ordnung[j], ordnung[i]]; }
  else if (p.ordnung === "hell") ordnung.sort((a, b) => hell[b] - hell[a] || a - b);
  else if (p.ordnung === "dunkel") ordnung.sort((a, b) => hell[a] - hell[b] || a - b);
  else ordnung.reverse();
  beteiligt.forEach((ziel, i) => { quelle[ziel] = ordnung[i]; });
  // je Teil: kippen und verrutschen
  const kippX = new Uint8Array(n), kippY = new Uint8Array(n), vx = new Float32Array(n), vy = new Float32Array(n);
  for (let t = 0; t < n; t++) {
    if (rnd() < p.kippen) { if (rnd() < 0.5) kippX[t] = 1; else kippY[t] = 1; }
    vx[t] = (2 * rnd() - 1) * p.versatz * tw; vy[t] = (2 * rnd() - 1) * p.versatz * th;
  }
  const fuge = p.fuge * Math.min(tw, th) * 0.5;
  const out = { width: W, height: H, data: new Uint8ClampedArray(d.length) }, o = out.data;
  for (let y = 0; y < H; y++) {
    const zj = Math.min(ze - 1, Math.floor(y / th)), ly = y + 0.5 - zj * th;
    for (let x = 0; x < W; x++) {
      const zi = Math.min(sp - 1, Math.floor(x / tw)), lx = x + 0.5 - zi * tw, t = zj * sp + zi, i = (y * W + x) * 4;
      if (lx < fuge || ly < fuge || lx > tw - fuge || ly > th - fuge) { o[i] = NACHT[0]; o[i + 1] = NACHT[1]; o[i + 2] = NACHT[2]; o[i + 3] = 255; continue; }
      const q = quelle[t], qx = (q % sp) * tw + (kippX[t] ? tw - lx : lx) + vx[t], qy = Math.floor(q / sp) * th + (kippY[t] ? th - ly : ly) + vy[t];
      const sx = ((Math.floor(qx) % W) + W) % W, sy = Math.min(H - 1, Math.max(0, Math.floor(qy))), j = (sy * W + sx) * 4;
      o[i] = d[j]; o[i + 1] = d[j + 1]; o[i + 2] = d[j + 2]; o[i + 3] = 255;
    }
  }
  return { bild: out, protokoll: { teile: [sp, ze], beteiligt: k, zuordnung: Array.from(quelle), gekippt: kippX.reduce((s, v) => s + v, 0) + kippY.reduce((s, v) => s + v, 0) } };
}

export const neusetzenOperation = bildfilter({
  id: "lab.neusetzen",
  name: "Zerlegen und neu setzen",
  version: "0.1.0",
  klasse: "raeumlich",
  herkunft: { art: "neu", quelle: "ORNAMENT LAB", referenz: "Cut-up (Brion Gysin, William S. Burroughs); Collage und Montage; Kachel-Filter der Bildbearbeitung (GIMP Puzzle, Mosaik)", datei: "alpha/lab/operationen/neusetzen.js" },
  beschreibung: "Teilt das Bild in Kacheln oder Streifen und setzt einen Anteil davon neu: zufällig, nach Helligkeit oder in umgekehrter Reihe. Teile können kippen, verrutschen und Fugen bekommen. Die Zuordnung steht im Protokoll.",
  moduliert: "beteiligt",
  titel: "Neu gesetzt",
  parameter: [
    wahl("teilung", "Teilung", "kacheln", [["kacheln", "Kacheln"], ["zeilen", "waagrechte Streifen"], ["spalten", "senkrechte Streifen"]]),
    zahl("spalten", "Spalten", 1, 48, 6, 1),
    zahl("zeilen", "Zeilen", 1, 48, 6, 1),
    wahl("ordnung", "neue Ordnung", "zufall", [["zufall", "Zufall (Startwert)"], ["hell", "nach Helligkeit, hell zuerst"], ["dunkel", "nach Helligkeit, dunkel zuerst"], ["umkehren", "Reihe umgekehrt"]]),
    zahl("beteiligt", "beteiligte Teile", 0, 1, 1, 0.01, "Anteil der Teile, die neu gesetzt werden; die übrigen bleiben stehen"),
    zahl("kippen", "Teile kippen", 0, 1, 0, 0.01, "Wahrscheinlichkeit, dass ein Teil gespiegelt wird"),
    zahl("versatz", "Verrutschen", 0, 0.5, 0, 0.01, "Anteil der Teilgrösse, um den der Inhalt verrutscht"),
    zahl("fuge", "Fuge", 0, 0.3, 0, 0.01, "dunkle Fuge zwischen den Teilen"),
    ...gemeinsameParameter({ flackern: true }),
  ],
  ressourcen: { zeit: "ein Durchgang über die Pixel (1200 px: unter 0,3 s)", speicher: "ein Bild" },
  rechne: ({ bild }, p, { seed }) => neusetzen(bild, p, seed),
});
