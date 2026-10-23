// ORNAMENT LAB – Glitch: Kanalversatz, Zeilen und Blöcke (räumliche Operation, seit Lab 0.1.10). Übertragen aus der Praxis des
// Databending und Datamoshing (Rosa Menkman, «The Glitch Moment(um)», 2011: der Fehler als Moment, in dem das Medium sichtbar wird)
// und aus dem RGB-Split der Videowerkzeuge (Resolume «Shift RGB», After Effects «Channel Offset»). Nichts aus deren Code.
//
// Drei Störungen in fester Reihenfolge, alle aus dem Startwert gewürfelt und darum wiederholbar:
//   Blöcke   ein Anteil der Makroblöcke zeigt Inhalt von anderer Stelle (wie ein Videostrom, dem die Bewegungsdaten verrutscht sind)
//   Zeilen   Bänder von Zeilen verrutschen waagrecht (wie ein Bild, dessen Zeilensynchronisation aussetzt)
//   Kanäle   Rot und Blau werden gegeneinander versetzt, auf Wunsch vertauscht
// Abgetastet wird ohne Glättung (nächstes Pixel): die Treppen gehören zum Verfahren.
import { zufall } from "../../../alpha/the-fictory/analyse.js?v=23";
import { bildfilter, gemeinsameParameter, zahl, wahl } from "./bildfilter.js";

const KANAELE = { normal: [0, 1, 2], tausch: [2, 1, 0], zyklisch: [1, 2, 0] };

export function glitch(bild, p, seed) {
  const W = bild.width, H = bild.height, d = bild.data, rnd = zufall(seed >>> 0), L = Math.max(W, H);
  // Blöcke: Versatz je Block
  const B = Math.max(2, Math.round(p.blockgroesse * L)), bx = Math.ceil(W / B), by = Math.ceil(H / B);
  const blockX = new Int32Array(bx * by), blockY = new Int32Array(bx * by);
  let versetzt = 0;
  for (let i = 0; i < bx * by; i++) {
    if (rnd() < p.bloecke) { blockX[i] = Math.floor(rnd() * bx) * B - (i % bx) * B; blockY[i] = Math.floor(rnd() * by) * B - Math.floor(i / bx) * B; versetzt++; }
  }
  // Zeilen: Bänder mit gewürfelter Höhe, ein Teil davon verrutscht
  const zeile = new Int32Array(H), hoehe = Math.max(1, p.streifenHoehe * H);
  let baender = 0;
  for (let y = 0; y < H;) {
    const h = Math.max(1, Math.round(hoehe * (0.25 + 1.5 * rnd())));
    const dx = rnd() < p.streifen ? Math.round((2 * rnd() - 1) * p.verschiebung * W) : 0;
    if (dx) baender++;
    for (let k = y; k < Math.min(H, y + h); k++) zeile[k] = dx;
    y += h;
  }
  // Kanäle: Rot nach vorn, Blau zurück entlang der Richtung
  const a = (p.richtung * Math.PI) / 180, kv = p.kanalversatz * W, cx = Math.round(Math.cos(a) * kv), cy = Math.round(Math.sin(a) * kv);
  const perm = KANAELE[p.kanaele] ?? KANAELE.normal;
  const out = { width: W, height: H, data: new Uint8ClampedArray(d.length) }, o = out.data, kanal = new Uint8Array(3);
  const lies = (x, y, c) => {
    const yy = y < 0 ? 0 : y >= H ? H - 1 : y;
    let xx = (x + zeile[yy]) % W;
    if (xx < 0) xx += W;
    return d[(yy * W + xx) * 4 + c];
  };
  for (let y = 0; y < H; y++) {
    const jb = Math.floor(y / B) * bx;
    for (let x = 0; x < W; x++) {
      const b = jb + Math.floor(x / B), qx = x + blockX[b], qy = y + blockY[b], i = (y * W + x) * 4;
      kanal[0] = lies(qx + cx, qy + cy, 0); kanal[1] = lies(qx, qy, 1); kanal[2] = lies(qx - cx, qy - cy, 2);
      o[i] = kanal[perm[0]]; o[i + 1] = kanal[perm[1]]; o[i + 2] = kanal[perm[2]]; o[i + 3] = 255;
    }
  }
  return { bild: out, protokoll: { bloecke: { groessePx: B, versetzt, von: bx * by }, zeilen: { verrutschteBaender: baender }, kanalversatzPx: [cx, cy], kanaele: p.kanaele } };
}

export const glitchOperation = bildfilter({
  id: "lab.glitch",
  name: "Glitch",
  version: "0.1.0",
  klasse: "raeumlich",
  herkunft: { art: "neu", quelle: "ORNAMENT LAB", referenz: "Databending und Datamoshing (Rosa Menkman, The Glitch Moment(um)); RGB-Split in Resolume (Shift RGB) und After Effects (Channel Offset)", datei: "alpha/lab/operationen/glitch.js" },
  beschreibung: "Stört das Bild wie einen beschädigten Datenstrom: Blöcke zeigen Inhalt von anderer Stelle, Zeilenbänder verrutschen, Rot und Blau trennen sich. Alles aus dem Startwert gewürfelt, darum wiederholbar; «Flackern» würfelt im Verlauf jedes Bild neu.",
  moduliert: "kanalversatz",
  titel: "Glitch",
  parameter: [
    zahl("kanalversatz", "Kanalversatz", 0, 0.1, 0.015, 0.001, "Anteil der Bildbreite, um den Rot und Blau auseinanderrücken"),
    zahl("richtung", "Richtung des Kanalversatzes (°)", -180, 180, 0, 1),
    wahl("kanaele", "Kanäle", "normal", [["normal", "an ihrem Platz"], ["tausch", "Rot und Blau vertauscht"], ["zyklisch", "zyklisch verschoben"]]),
    zahl("streifen", "verrutschte Zeilenbänder", 0, 1, 0.3, 0.01, "Anteil der Bänder, die waagrecht verrutschen"),
    zahl("streifenHoehe", "Höhe der Bänder", 0.002, 0.2, 0.03, 0.001, "Anteil der Bildhöhe, gewürfelt um diesen Wert"),
    zahl("verschiebung", "Weite des Verrutschens", 0, 0.5, 0.1, 0.005, "höchstens dieser Anteil der Bildbreite"),
    zahl("bloecke", "versetzte Blöcke", 0, 1, 0.12, 0.01, "Anteil der Blöcke, die Inhalt von anderer Stelle zeigen"),
    zahl("blockgroesse", "Blockgrösse", 0.01, 0.25, 0.05, 0.005, "Anteil der längsten Seite"),
    ...gemeinsameParameter({ flackern: true }),
  ],
  ressourcen: { zeit: "ein Durchgang über die Pixel (1200 px: unter 0,3 s)", speicher: "ein Bild" },
  rechne: ({ bild }, p, { seed }) => glitch(bild, p, seed),
});
